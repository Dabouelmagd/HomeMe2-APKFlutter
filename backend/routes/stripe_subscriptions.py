"""
Stripe Subscriptions — Auto-renewing monthly/yearly billing.

Difference from `stripe_payments.py` (one-time):
- Uses Stripe Subscription objects (not Checkout Sessions).
- Customer object created per company (cached in `company_subscriptions.stripe_customer_id`).
- Recurring Price objects created on-the-fly per (plan, billing_cycle) pair if missing.
- Webhook at /api/webhook/stripe-subscriptions receives `invoice.payment_succeeded`
  + `customer.subscription.deleted` etc. and keeps DB in sync.

Flow:
  1. POST /api/stripe-subscriptions/checkout {plan_key, billing_cycle, origin_url}
     → backend creates/reuses Customer + Price + Subscription in mode='subscription'.
     → returns Checkout URL (Stripe-hosted, recurring price).
  2. User completes payment + Stripe stores the card.
  3. From now on, Stripe auto-charges every cycle and webhooks fire.
  4. POST /api/stripe-subscriptions/portal {origin_url}
     → returns Stripe Customer Portal URL (manage card, cancel, view invoices).
  5. POST /api/stripe-subscriptions/cancel
     → cancels at period end (keeps service active until paid period ends).
"""
import os
import logging
from datetime import datetime, timezone
from typing import Optional, Literal

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from database import get_db
from auth_deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stripe-subscriptions", tags=["stripe-subscriptions"])

stripe.api_key = os.environ.get("STRIPE_API_KEY")

# ---------------------------------------------------------------------------
# Server-side plan catalogue. Yearly = 10x monthly (effectively 2 months free = ~17% discount).
# ---------------------------------------------------------------------------
PLAN_CATALOGUE = {
    "company_startup": {
        "name_ar": "شركة ناشئة",
        "monthly_amount": 5500.00,
        "yearly_amount": 52800.00,  # 10 × monthly = ~17% off vs paying 12 monthly
    },
    "company_business": {
        "name_ar": "شركة متوسطة",
        "monthly_amount": 13000.00,
        "yearly_amount": 124800.00,
    },
    "company_enterprise": {
        "name_ar": "شركة كبرى",
        "monthly_amount": 35000.00,
        "yearly_amount": 336000.00,
    },
}

CURRENCY = "egp"
INTERVAL_MAP = {"monthly": "month", "yearly": "year"}


# ============================================================================
# Helpers
# ============================================================================
async def _get_or_create_customer(db, company_id: str, company_name: str, contact_email: Optional[str]) -> str:
    """Returns Stripe customer id, creating + caching one if needed."""
    sub = await db.company_subscriptions.find_one(
        {"company_id": company_id}, {"_id": 0, "stripe_customer_id": 1}
    )
    if sub and sub.get("stripe_customer_id"):
        return sub["stripe_customer_id"]

    customer = stripe.Customer.create(
        name=company_name,
        email=contact_email or None,
        metadata={"company_id": company_id, "source": "homeme_app"},
    )
    await db.company_subscriptions.update_one(
        {"company_id": company_id},
        {"$set": {"stripe_customer_id": customer.id}},
        upsert=True,
    )
    logger.info(f"[stripe-sub] created customer {customer.id} for company {company_id}")
    return customer.id


async def _get_or_create_price(db, plan_key: str, billing_cycle: str) -> str:
    """Returns Stripe Price id for (plan, cycle). Creates Product+Price if missing, caches in DB."""
    cache_key = f"{plan_key}_{billing_cycle}"
    cached = await db.stripe_price_cache.find_one({"_id": cache_key})
    if cached and cached.get("price_id"):
        return cached["price_id"]

    plan = PLAN_CATALOGUE[plan_key]
    amount_field = "monthly_amount" if billing_cycle == "monthly" else "yearly_amount"
    amount_minor = int(plan[amount_field] * 100)  # cents/piasters
    interval = INTERVAL_MAP[billing_cycle]
    label_ar = f"{plan['name_ar']} ({'شهري' if billing_cycle == 'monthly' else 'سنوي'})"

    # Create or find Product
    product_cache = await db.stripe_price_cache.find_one({"_id": f"product_{plan_key}"})
    if product_cache and product_cache.get("product_id"):
        product_id = product_cache["product_id"]
    else:
        product = stripe.Product.create(
            name=f"HomeMe — {plan['name_ar']}",
            description=label_ar,
            metadata={"plan_key": plan_key},
        )
        product_id = product.id
        await db.stripe_price_cache.update_one(
            {"_id": f"product_{plan_key}"},
            {"$set": {"product_id": product_id}},
            upsert=True,
        )

    # Create Recurring Price
    price = stripe.Price.create(
        product=product_id,
        unit_amount=amount_minor,
        currency=CURRENCY,
        recurring={"interval": interval},
        nickname=label_ar,
        metadata={"plan_key": plan_key, "billing_cycle": billing_cycle},
    )
    await db.stripe_price_cache.update_one(
        {"_id": cache_key},
        {"$set": {
            "price_id": price.id,
            "plan_key": plan_key,
            "billing_cycle": billing_cycle,
            "amount": plan[amount_field],
        }},
        upsert=True,
    )
    logger.info(f"[stripe-sub] created price {price.id} for {cache_key}")
    return price.id


# ============================================================================
# Models
# ============================================================================
class CheckoutRequest(BaseModel):
    plan_key: Literal["company_startup", "company_business", "company_enterprise"]
    billing_cycle: Literal["monthly", "yearly"] = "monthly"
    origin_url: str = Field(..., min_length=1)


class PortalRequest(BaseModel):
    origin_url: str = Field(..., min_length=1)


# ============================================================================
# Endpoints
# ============================================================================
@router.get("/plans")
async def get_plans():
    """Public — list available subscription tiers + monthly/yearly prices."""
    return {
        "plans": [
            {
                "key": k,
                "name_ar": v["name_ar"],
                "monthly_amount": v["monthly_amount"],
                "yearly_amount": v["yearly_amount"],
                "yearly_savings_percent": round((1 - v["yearly_amount"] / (v["monthly_amount"] * 12)) * 100),
                "currency": CURRENCY,
            }
            for k, v in PLAN_CATALOGUE.items()
        ]
    }


@router.post("/checkout")
async def create_subscription_checkout(
    body: CheckoutRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a Stripe Checkout Session in mode='subscription' (recurring)."""
    if current_user.get("role") not in ("company_admin", "super_admin", "app_owner"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="STRIPE_API_KEY not configured")

    db = get_db()
    company_id = current_user.get("company_id") or current_user.get("management_company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="لا يوجد شركة مرتبطة بالحساب")
    company = await db.management_companies.find_one(
        {"id": company_id}, {"_id": 0, "name": 1, "contact_email": 1}
    ) or {}

    customer_id = await _get_or_create_customer(
        db,
        company_id,
        company.get("name") or "HomeMe Company",
        company.get("contact_email") or current_user.get("email"),
    )
    price_id = await _get_or_create_price(db, body.plan_key, body.billing_cycle)

    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/app/payment-success?session_id={{CHECKOUT_SESSION_ID}}&recurring=1"
    cancel_url = f"{origin}/app/my-subscription"

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "company_id": company_id,
            "plan_key": body.plan_key,
            "billing_cycle": body.billing_cycle,
            "kind": "subscription_recurring",
        },
        subscription_data={
            "metadata": {
                "company_id": company_id,
                "plan_key": body.plan_key,
                "billing_cycle": body.billing_cycle,
            }
        },
    )

    # Record pending transaction
    await db.payment_transactions.insert_one({
        "session_id": session.id,
        "kind": "subscription_recurring",
        "company_id": company_id,
        "plan_key": body.plan_key,
        "billing_cycle": body.billing_cycle,
        "stripe_customer_id": customer_id,
        "amount": (
            PLAN_CATALOGUE[body.plan_key]["monthly_amount"]
            if body.billing_cycle == "monthly"
            else PLAN_CATALOGUE[body.plan_key]["yearly_amount"]
        ),
        "currency": CURRENCY,
        "status": "pending",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "metadata": {
            "company_id": company_id,
            "plan_key": body.plan_key,
            "billing_cycle": body.billing_cycle,
        },
    })

    return {"url": session.url, "session_id": session.id}


@router.post("/portal")
async def create_portal_session(
    body: PortalRequest,
    current_user: dict = Depends(get_current_user),
):
    """Returns a Stripe Customer Portal URL — user can manage card, view invoices, cancel."""
    if current_user.get("role") not in ("company_admin", "super_admin", "app_owner"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    company_id = current_user.get("company_id") or current_user.get("management_company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="لا يوجد شركة مرتبطة")
    sub = await db.company_subscriptions.find_one(
        {"company_id": company_id}, {"_id": 0, "stripe_customer_id": 1}
    ) or {}
    customer_id = sub.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="لا يوجد اشتراك Stripe نشط — قم بالاشتراك أولاً")

    portal = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{body.origin_url.rstrip('/')}/app/my-subscription",
    )
    return {"url": portal.url}


@router.get("/status")
async def get_subscription_status(current_user: dict = Depends(get_current_user)):
    """Returns the current subscription state for the user's company."""
    if current_user.get("role") not in ("company_admin", "super_admin", "app_owner"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    company_id = current_user.get("company_id") or current_user.get("management_company_id")
    if not company_id:
        return {"has_subscription": False}

    sub = await db.company_subscriptions.find_one({"company_id": company_id}, {"_id": 0}) or {}
    is_recurring = bool(sub.get("stripe_subscription_id"))
    return {
        "has_subscription": bool(sub.get("status") == "active"),
        "plan": sub.get("plan"),
        "status": sub.get("status"),
        "expires_at": sub.get("expires_at"),
        "is_auto_renewing": is_recurring and not sub.get("cancel_at_period_end"),
        "cancel_at_period_end": sub.get("cancel_at_period_end", False),
        "current_period_end": sub.get("current_period_end"),
        "billing_cycle": sub.get("billing_cycle"),
        "stripe_subscription_id": sub.get("stripe_subscription_id"),
    }


@router.post("/cancel")
async def cancel_subscription(current_user: dict = Depends(get_current_user)):
    """Cancel at period end (service stays active until paid period expires)."""
    if current_user.get("role") not in ("company_admin", "super_admin", "app_owner"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    company_id = current_user.get("company_id") or current_user.get("management_company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="لا يوجد شركة")

    sub = await db.company_subscriptions.find_one(
        {"company_id": company_id}, {"_id": 0, "stripe_subscription_id": 1}
    ) or {}
    sub_id = sub.get("stripe_subscription_id")
    if not sub_id:
        raise HTTPException(status_code=400, detail="لا يوجد اشتراك تلقائي للإلغاء")

    stripe.Subscription.modify(sub_id, cancel_at_period_end=True)
    await db.company_subscriptions.update_one(
        {"company_id": company_id},
        {"$set": {"cancel_at_period_end": True, "canceled_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True, "message": "سيتم إلغاء التجديد التلقائي بنهاية الدورة الحالية. الخدمة مستمرة حتى ذلك الحين."}


@router.post("/resume")
async def resume_subscription(current_user: dict = Depends(get_current_user)):
    """Re-enable auto-renew before period end."""
    if current_user.get("role") not in ("company_admin", "super_admin", "app_owner"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    company_id = current_user.get("company_id") or current_user.get("management_company_id")
    sub = await db.company_subscriptions.find_one(
        {"company_id": company_id}, {"_id": 0, "stripe_subscription_id": 1}
    ) or {}
    sub_id = sub.get("stripe_subscription_id")
    if not sub_id:
        raise HTTPException(status_code=400, detail="لا يوجد اشتراك للاستئناف")

    stripe.Subscription.modify(sub_id, cancel_at_period_end=False)
    await db.company_subscriptions.update_one(
        {"company_id": company_id},
        {"$set": {"cancel_at_period_end": False}, "$unset": {"canceled_at": ""}},
    )
    return {"ok": True, "message": "تم استئناف التجديد التلقائي ✓"}


# ============================================================================
# Webhook handler — keep DB in sync with Stripe events
# ============================================================================
@router.post("/webhook")
async def stripe_subscription_webhook(request: Request):
    """Webhook for subscription events. Fall back to direct event parsing if no signature secret."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.environ.get("STRIPE_SUBSCRIPTION_WEBHOOK_SECRET")

    try:
        if webhook_secret and sig_header:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        else:
            import json
            event = json.loads(payload.decode())
    except Exception as e:
        logger.error(f"[stripe-sub-webhook] parse failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook payload")

    event_type = event.get("type") if isinstance(event, dict) else event["type"]
    obj = event.get("data", {}).get("object", {}) if isinstance(event, dict) else event["data"]["object"]

    db = get_db()
    try:
        if event_type == "checkout.session.completed":
            await _handle_subscription_checkout_completed(db, obj)
        elif event_type == "invoice.payment_succeeded":
            await _handle_invoice_paid(db, obj)
        elif event_type == "invoice.payment_failed":
            await _handle_invoice_failed(db, obj)
        elif event_type in ("customer.subscription.deleted", "customer.subscription.canceled"):
            await _handle_subscription_canceled(db, obj)
        elif event_type == "customer.subscription.updated":
            await _handle_subscription_updated(db, obj)
        else:
            logger.info(f"[stripe-sub-webhook] ignored event type {event_type}")
    except Exception as e:
        logger.exception(f"[stripe-sub-webhook] handler failed for {event_type}: {e}")

    return {"received": True}


async def _handle_subscription_checkout_completed(db, session: dict):
    """Initial checkout for a subscription completed → store stripe_subscription_id."""
    if session.get("mode") != "subscription":
        return
    sub_id = session.get("subscription")
    metadata = session.get("metadata") or {}
    company_id = metadata.get("company_id")
    plan_key = metadata.get("plan_key")
    billing_cycle = metadata.get("billing_cycle", "monthly")
    if not (sub_id and company_id and plan_key):
        return

    sub_obj = stripe.Subscription.retrieve(sub_id)
    period_end = datetime.fromtimestamp(sub_obj["current_period_end"], tz=timezone.utc).isoformat()

    await db.company_subscriptions.update_one(
        {"company_id": company_id},
        {"$set": {
            "plan": plan_key,
            "status": "active",
            "billing_cycle": billing_cycle,
            "stripe_subscription_id": sub_id,
            "stripe_customer_id": session.get("customer"),
            "current_period_end": period_end,
            "expires_at": period_end,
            "cancel_at_period_end": False,
            "activated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    await db.payment_transactions.update_one(
        {"session_id": session.get("id")},
        {"$set": {"payment_status": "paid", "status": "completed", "stripe_subscription_id": sub_id}},
    )
    logger.info(f"[stripe-sub] activated recurring company={company_id} plan={plan_key} cycle={billing_cycle}")


async def _handle_invoice_paid(db, invoice: dict):
    """Recurring renewal succeeded — bump expires_at."""
    sub_id = invoice.get("subscription")
    if not sub_id:
        return
    sub_obj = stripe.Subscription.retrieve(sub_id)
    company_id = (sub_obj.metadata or {}).get("company_id")
    if not company_id:
        return
    period_end = datetime.fromtimestamp(sub_obj["current_period_end"], tz=timezone.utc).isoformat()
    await db.company_subscriptions.update_one(
        {"company_id": company_id},
        {"$set": {
            "status": "active",
            "current_period_end": period_end,
            "expires_at": period_end,
            "last_paid_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    # Log invoice for finance audit
    await db.stripe_invoice_log.insert_one({
        "company_id": company_id,
        "invoice_id": invoice.get("id"),
        "amount_paid": (invoice.get("amount_paid") or 0) / 100.0,
        "currency": invoice.get("currency"),
        "period_end": period_end,
        "received_at": datetime.now(timezone.utc).isoformat(),
    })
    logger.info(f"[stripe-sub] renewal succeeded company={company_id} new_expires={period_end}")


async def _handle_invoice_failed(db, invoice: dict):
    """Recurring renewal failed (card declined, etc.) — mark subscription as past_due."""
    sub_id = invoice.get("subscription")
    if not sub_id:
        return
    sub_obj = stripe.Subscription.retrieve(sub_id)
    company_id = (sub_obj.metadata or {}).get("company_id")
    if not company_id:
        return
    await db.company_subscriptions.update_one(
        {"company_id": company_id},
        {"$set": {
            "status": "past_due",
            "last_failed_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    logger.warning(f"[stripe-sub] payment FAILED company={company_id} sub={sub_id}")


async def _handle_subscription_canceled(db, sub_obj: dict):
    """Subscription fully canceled — mark inactive."""
    company_id = (sub_obj.get("metadata") or {}).get("company_id")
    if not company_id:
        return
    await db.company_subscriptions.update_one(
        {"company_id": company_id},
        {"$set": {
            "status": "canceled",
            "canceled_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    logger.info(f"[stripe-sub] subscription canceled company={company_id}")


async def _handle_subscription_updated(db, sub_obj: dict):
    """Customer modified subscription (e.g. cancel_at_period_end toggle from portal)."""
    company_id = (sub_obj.get("metadata") or {}).get("company_id")
    if not company_id:
        return
    period_end = None
    if sub_obj.get("current_period_end"):
        period_end = datetime.fromtimestamp(sub_obj["current_period_end"], tz=timezone.utc).isoformat()
    update = {
        "cancel_at_period_end": bool(sub_obj.get("cancel_at_period_end")),
        "status": sub_obj.get("status") or "active",
    }
    if period_end:
        update["current_period_end"] = period_end
        update["expires_at"] = period_end
    await db.company_subscriptions.update_one(
        {"company_id": company_id},
        {"$set": update},
    )
