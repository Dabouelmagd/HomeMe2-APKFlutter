"""
Stripe Payments for Company Subscription Plans.

Flow:
  1. Frontend calls POST /api/stripe/create-checkout-session with {plan_key, origin_url}.
  2. Backend picks price from the server-side PLAN_PRICES table (anti-price-manipulation).
  3. Creates a Stripe Checkout Session + records a `payment_transactions` row with status=pending.
  4. Returns `{url, session_id}` → frontend redirects to Stripe.
  5. After payment, Stripe redirects to `/app/payment-success?session_id={CHECKOUT_SESSION_ID}`.
  6. Frontend polls GET /api/stripe/checkout-status/{session_id} until payment_status=paid.
  7. Webhook at /api/webhook/stripe also fires asynchronously → both paths flip
     company_subscriptions.status from pending_payment → active (idempotent via session_id).
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
import os
import uuid
import logging

from homeme_integrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionResponse,
    CheckoutStatusResponse,
    CheckoutSessionRequest,
)

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api", tags=["stripe"])

# ---------------------------------------------------------------------------
# Server-side plan → price mapping. NEVER accept prices from the frontend.
# Amounts in EGP (float). starter=0 is not payable; other plans billed monthly.
# ---------------------------------------------------------------------------
PLAN_PRICES = {
    "company_startup":    {"amount": 3500.00,  "currency": "egp", "name_ar": "شركة ناشئة"},
    "company_business":   {"amount": 7500.00,  "currency": "egp", "name_ar": "شركة متوسطة"},
    "company_enterprise": {"amount": 20000.00, "currency": "egp", "name_ar": "شركة كبرى"},
}


def _get_stripe_checkout(request: Request) -> StripeCheckout:
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="STRIPE_API_KEY not configured")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    return StripeCheckout(api_key=api_key, webhook_url=webhook_url)


async def _activate_subscription(db, session_id: str, metadata: dict):
    """Flip `company_subscriptions.status` → active. Idempotent via payment_transactions."""
    txn = await db.payment_transactions.find_one({"session_id": session_id})
    if not txn:
        logging.warning(f"[stripe] activate called for unknown session {session_id}")
        return
    if txn.get("payment_status") == "paid":
        return  # already processed

    company_id = metadata.get("company_id") or txn.get("metadata", {}).get("company_id")
    plan_key = metadata.get("plan_key") or txn.get("metadata", {}).get("plan_key")
    if not company_id or not plan_key:
        logging.error(f"[stripe] missing company_id/plan_key in session {session_id}")
        return

    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    # 30-day subscription period (manual monthly cycle — until we move to real Stripe Subscriptions)
    expires_at = (now + timedelta(days=30)).isoformat()
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"payment_status": "paid", "status": "completed", "paid_at": now_iso}},
    )
    await db.company_subscriptions.update_one(
        {"company_id": company_id},
        {"$set": {
            "plan": plan_key,
            "status": "active",
            "activated_at": now_iso,
            "expires_at": expires_at,
            "last_payment_session_id": session_id,
        }},
        upsert=True,
    )
    logging.info(f"[stripe] subscription activated company={company_id} plan={plan_key} expires_at={expires_at}")

    # Referral reward — if this company was referred, award their referrer a free month (idempotent)
    try:
        from routes.company_referrals import award_referrer_credit
        awarded = await award_referrer_credit(company_id)
        if awarded:
            logging.info(f"[stripe] referral reward awarded to referrer of company={company_id}")
    except Exception as _re:
        logging.warning(f"[stripe] referral reward failed for company={company_id}: {_re}")


# ---------------------------------------------------------------------------
# 1. Create Checkout Session
# ---------------------------------------------------------------------------
class CreateCheckoutRequest(BaseModel):
    plan_key: str
    origin_url: str  # window.location.origin from frontend — used to build success/cancel URLs


@router.post("/stripe/create-checkout-session")
async def create_checkout_session(
    payload: CreateCheckoutRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """User (company_admin) initiates checkout for a paid plan."""
    if payload.plan_key not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="خطة غير صالحة")

    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="يجب أن تكون مدير شركة لإتمام الدفع")

    price = PLAN_PRICES[payload.plan_key]
    origin = payload.origin_url.rstrip("/")
    success_url = f"{origin}/app/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/app/payment-cancel"

    db = get_db()
    metadata = {
        "company_id": company_id,
        "plan_key": payload.plan_key,
        "user_id": current_user.get("id"),
        "username": current_user.get("username") or "",
    }

    stripe_checkout = _get_stripe_checkout(request)
    try:
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(
            CheckoutSessionRequest(
                amount=price["amount"],
                currency=price["currency"],
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata,
            )
        )
    except Exception as e:
        logging.error(f"[stripe] create_checkout_session failed: {e}")
        raise HTTPException(status_code=502, detail=f"فشل إنشاء جلسة الدفع: {e}")

    # Record transaction BEFORE redirect — must never be missed even if user closes tab
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "amount": price["amount"],
        "currency": price["currency"],
        "plan_key": payload.plan_key,
        "plan_name_ar": price["name_ar"],
        "user_id": current_user.get("id"),
        "company_id": company_id,
        "metadata": metadata,
        "status": "initiated",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"url": session.url, "session_id": session.session_id}


# ---------------------------------------------------------------------------
# 2. Poll Checkout Status (frontend)
# ---------------------------------------------------------------------------
@router.get("/stripe/checkout-status/{session_id}")
async def get_checkout_status(
    session_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="جلسة الدفع غير موجودة")
    if txn.get("user_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="هذه الجلسة ليست لك")

    stripe_checkout = _get_stripe_checkout(request)
    try:
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
    except Exception as e:
        logging.error(f"[stripe] get_checkout_status failed: {e}")
        raise HTTPException(status_code=502, detail=f"فشل فحص حالة الدفع: {e}")

    # If Stripe reports paid but we haven't activated yet → activate now (idempotent)
    if status.payment_status == "paid" and txn.get("payment_status") != "paid":
        await _activate_subscription(db, session_id, status.metadata or {})

    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency,
        "plan_key": txn.get("plan_key"),
        "plan_name_ar": txn.get("plan_name_ar"),
    }


async def _activate_utility_bill_or_user_subscription(db, session_id: str):
    """Handle non-company-subscription Stripe transactions (utility bills + legacy user subs).
    Mirrors logic that used to live in routes/payments.py but is now centralized so a single
    webhook handler covers all transaction types. Idempotent: skips if already paid.
    """
    txn = await db.payment_transactions.find_one({"session_id": session_id})
    if not txn:
        return
    if txn.get("payment_status") == "paid":
        return

    payment_type = txn.get("payment_type") or txn.get("metadata", {}).get("payment_type")
    now = datetime.now(timezone.utc)

    # 1. Mark transaction paid
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"payment_status": "paid", "status": "completed", "paid_at": now.isoformat()}},
    )

    # 2. Utility bill
    if txn.get("utility_bill_id"):
        await db.utility_bills.update_one(
            {"id": txn["utility_bill_id"]},
            {"$set": {"status": "paid", "payment_date": now.isoformat(), "payment_method": "stripe"}}
        )
        logging.info(f"[stripe] utility bill activated for session {session_id}")

    # 3. Legacy user-level subscription (routes/payments.py:/payments/subscribe)
    if payment_type == "subscription":
        user_id = txn.get("user_id")
        plan = txn.get("metadata", {}).get("plan", "basic")
        duration = txn.get("metadata", {}).get("duration", "1_month")
        duration_days = {"1_month": 30, "3_months": 90, "6_months": 180,
                         "9_months": 270, "1_year": 365, "lifetime": 36500}.get(duration, 30)
        sub_end = now + timedelta(days=duration_days)
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "subscription_active": True,
                "subscription_type": duration,
                "subscription_plan": plan,
                "subscription_start": now.isoformat(),
                "subscription_end": sub_end.isoformat(),
                "subscription_payment_method": "stripe",
                "subscription_session_id": session_id,
            }}
        )
        logging.info(f"[stripe] user subscription activated user={user_id} plan={plan}/{duration}")


# ---------------------------------------------------------------------------
# 3. Webhook — Stripe server-to-server confirmation
# ---------------------------------------------------------------------------
@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    stripe_checkout = _get_stripe_checkout(request)
    try:
        event = await stripe_checkout.handle_webhook(body, signature)
    except Exception as e:
        logging.error(f"[stripe] webhook verification failed: {e}")
        raise HTTPException(status_code=400, detail="webhook invalid")

    # homeme_integrations surfaces a unified response — activate on checkout.session.completed
    db = get_db()
    if getattr(event, "event_type", "") in ("checkout.session.completed", "payment_intent.succeeded"):
        if getattr(event, "payment_status", "") == "paid":
            session_id = event.session_id
            metadata = event.metadata or {}

            # Route to correct activator based on transaction type
            txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            if txn:
                txn_type = txn.get("payment_type") or metadata.get("payment_type")
                if txn_type == "company_subscription" or metadata.get("company_id"):
                    await _activate_subscription(db, session_id, metadata)
                else:
                    await _activate_utility_bill_or_user_subscription(db, session_id)
            else:
                # Fallback: try company subscription (most likely path)
                await _activate_subscription(db, session_id, metadata)

    return {"received": True}


# ---------------------------------------------------------------------------
# 4. Transactions history (for the paying user)
# ---------------------------------------------------------------------------
@router.get("/stripe/my-transactions")
async def my_transactions(current_user: dict = Depends(get_current_user)):
    db = get_db()
    txns = await db.payment_transactions.find(
        {"user_id": current_user.get("id")},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"transactions": txns, "total": len(txns)}
