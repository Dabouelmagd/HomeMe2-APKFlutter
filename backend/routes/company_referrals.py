"""
Company-to-Company Referral System (viral loop for HomeMe).

Flow:
  1. Company A admin gets unique code `CO-XXXXXX` at /api/company-admin/referral/my-link
  2. Shares link: https://homemeapp.net/register?ref=CO-XXXXXX
  3. Company B admin registers → `referred_by_company_id` stored on the new company doc
  4. Company B upgrades to a paid plan (plan != starter) → referrer A gets ONE credit:
       - `pending_credit_months += 1` on company A's `company_referrals` doc
       - A notification + email to A's admin
  5. Next time A pays/renews, the credit auto-applies:
       - Stripe checkout creates a 100%-off coupon (1 free month) OR
       - server extends A's subscription `expires_at` by 30 days per credit on activation
  6. A sees their dashboard card: total referrals, pending credits, applied credits, history

Collections:
  - `companies.referred_by_company_id`  (set on registration if ?ref=… valid)
  - `company_referrals`                (one doc per company with `code`, stats, credit ledger)

Endpoints:
  GET  /api/company-admin/referral/my-link      → {code, link, stats, pending_credits, applied_credits}
  GET  /api/company-admin/referral/history       → paginated list of referred companies + their status
  GET  /api/public/referral/lookup/{code}        → used by register page to validate a ref before signup
  POST /api/public/referral/track-signup         → internal helper (called by auth.py on company_admin register)
  POST /api/company-admin/referral/apply-credit  → apply 1 pending_credit to current subscription (extends 30 days)
  GET  /api/super-admin/referral/dashboard       → global stats: total referrals, active codes, top referrers

NOTE: Referrer-side reward = 1 month free per successful referral (configurable).
"""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from auth_deps import get_current_user, require_super_admin
from database import get_db
from helpers import serialize_datetime

router = APIRouter(prefix="/api", tags=["company-referrals"])

# Configuration
REWARD_DAYS_PER_REFERRAL = 30  # 1 month free per successful referral
CODE_PREFIX = "CO-"
CODE_LEN = 6  # 6 alphanumeric chars after prefix


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _gen_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no confusing chars
    return CODE_PREFIX + ''.join(secrets.choice(alphabet) for _ in range(CODE_LEN))


async def _ensure_referral_doc(db, company_id: str) -> dict:
    """Create or fetch the company_referrals doc. Code is globally unique."""
    doc = await db.company_referrals.find_one({"company_id": company_id}, {"_id": 0})
    if doc:
        return doc
    for _ in range(10):
        code = _gen_code()
        exists = await db.company_referrals.find_one({"code": code}, {"_id": 0, "code": 1})
        if not exists:
            break
    doc = {
        "id": str(uuid.uuid4()),
        "company_id": company_id,
        "code": code,
        "pending_credit_days": 0,      # cumulative days earned but not yet applied
        "applied_credit_days": 0,      # total days already credited to subscription
        "successful_referrals": 0,     # companies that went paid
        "total_signups": 0,            # companies that registered (may still be free)
        "referred_company_ids": [],
        "credit_history": [],          # [{event, days, at, by_company_id?}]
        "created_at": _now(),
    }
    await db.company_referrals.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def _require_company_admin(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role not in ("company_admin", "app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="متاح لمديري الشركات فقط")
    return current_user


async def _resolve_company_id(user: dict, override: Optional[str]) -> str:
    if user.get("role") == "company_admin":
        cid = user.get("company_id")
        if not cid:
            raise HTTPException(status_code=400, detail="حسابك غير مرتبط بشركة")
        return cid
    if not override:
        raise HTTPException(status_code=400, detail="company_id مطلوب")
    return override


# =============================================================================
# Company-Admin endpoints
# =============================================================================
@router.get("/company-admin/referral/my-link")
async def get_my_referral_link(
    current_user: dict = Depends(_require_company_admin),
    company_id: Optional[str] = None,
):
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    company = await db.companies.find_one({"id": cid}, {"_id": 0, "name": 1})
    doc = await _ensure_referral_doc(db, cid)

    # Build shareable link — prefer explicit APP_URL > the production domain > stale fallback
    import os as _os
    app_url = (_os.environ.get("APP_URL")
               or "https://homemeapp.net").rstrip("/")
    link = f"{app_url}/register?ref={doc['code']}"

    return {
        "company_name": (company or {}).get("name"),
        "code": doc["code"],
        "link": link,
        "total_signups": doc.get("total_signups", 0),
        "successful_referrals": doc.get("successful_referrals", 0),
        "pending_credit_days": doc.get("pending_credit_days", 0),
        "applied_credit_days": doc.get("applied_credit_days", 0),
        "reward_days_per_referral": REWARD_DAYS_PER_REFERRAL,
        "share_message": (
            f"انضم لـ HomeMe — منصة إدارة المجمعات السكنية الرائدة! "
            f"استخدم رابطي للحصول على تجربة سلسة: {link}"
        ),
    }


@router.get("/company-admin/referral/history")
async def get_referral_history(
    current_user: dict = Depends(_require_company_admin),
    company_id: Optional[str] = None,
):
    """List companies that signed up via my code + their current subscription status."""
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    doc = await _ensure_referral_doc(db, cid)

    referred_ids = doc.get("referred_company_ids") or []
    if not referred_ids:
        return {"referrals": [], "credit_history": []}

    companies = await db.companies.find(
        {"id": {"$in": referred_ids}},
        {"_id": 0, "id": 1, "name": 1, "created_at": 1, "admin_user_id": 1}
    ).to_list(200)
    cmap = {c["id"]: c for c in companies}

    # Pull subscriptions for each
    subs = await db.company_subscriptions.find(
        {"company_id": {"$in": referred_ids}},
        {"_id": 0, "company_id": 1, "plan": 1, "status": 1, "expires_at": 1, "activated_at": 1}
    ).to_list(500)
    smap = {s["company_id"]: s for s in subs}

    referrals = []
    for rid in referred_ids:
        c = cmap.get(rid) or {}
        s = smap.get(rid) or {}
        plan = s.get("plan") or "starter"
        went_paid = plan != "starter" and s.get("status") in ("active", "cancelled")
        referrals.append({
            "company_id": rid,
            "company_name": c.get("name") or "—",
            "joined_at": c.get("created_at"),
            "plan": plan,
            "status": s.get("status") or "pending_signup",
            "activated_at": s.get("activated_at"),
            "reward_earned": went_paid,
        })
    referrals.sort(key=lambda x: x.get("joined_at") or "", reverse=True)

    return {
        "referrals": serialize_datetime(referrals),
        "credit_history": doc.get("credit_history", [])[-50:],
    }


@router.post("/company-admin/referral/apply-credit")
async def apply_pending_credit(
    current_user: dict = Depends(_require_company_admin),
    company_id: Optional[str] = None,
):
    """Apply ONE referral credit (30 days) to the company's active subscription.

    Extends `expires_at` by 30 days and decrements pending_credit_days by 30.
    If no active subscription exists, a starter one is upgraded to pending — the
    endpoint still records the credit so Stripe checkout later can consume it.
    """
    db = get_db()
    cid = await _resolve_company_id(current_user, company_id)
    doc = await _ensure_referral_doc(db, cid)

    pending = int(doc.get("pending_credit_days") or 0)
    if pending < REWARD_DAYS_PER_REFERRAL:
        raise HTTPException(
            status_code=400,
            detail=f"لا يوجد رصيد كافٍ. الرصيد الحالي: {pending} يوم. تحتاج {REWARD_DAYS_PER_REFERRAL} يوم للتطبيق.",
        )

    sub = await db.company_subscriptions.find_one({"company_id": cid}, {"_id": 0})
    now = datetime.now(timezone.utc)
    days = REWARD_DAYS_PER_REFERRAL

    new_expiry_iso: Optional[str] = None
    if sub and sub.get("plan") and sub.get("plan") != "starter":
        # Extend existing paid subscription
        try:
            exp_raw = sub.get("expires_at")
            base = (datetime.fromisoformat(str(exp_raw).replace("Z", "+00:00"))
                    if exp_raw else now)
            if base.tzinfo is None:
                base = base.replace(tzinfo=timezone.utc)
            if base < now:
                base = now
        except Exception:
            base = now
        new_expiry = base + timedelta(days=days)
        new_expiry_iso = new_expiry.isoformat()
        await db.company_subscriptions.update_one(
            {"company_id": cid},
            {"$set": {"expires_at": new_expiry_iso, "status": "active"},
             # reset any previously-sent renewal reminders for upcoming cycle
             "$unset": {"renewal_reminders_sent": ""}},
        )

    await db.company_referrals.update_one(
        {"company_id": cid},
        {
            "$inc": {"pending_credit_days": -days, "applied_credit_days": days},
            "$push": {"credit_history": {
                "event": "credit_applied",
                "days": days,
                "at": _now(),
                "new_expires_at": new_expiry_iso,
            }},
        },
    )
    # Notify the user
    try:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "type": "referral_credit_applied",
            "title": "🎁 تم تطبيق خصم الإحالة!",
            "message": f"تم إضافة {days} يوم مجاناً إلى اشتراكك.",
            "read": False,
            "created_at": _now(),
        })
    except Exception:
        pass
    return {
        "success": True,
        "applied_days": days,
        "remaining_pending_days": pending - days,
        "new_expires_at": new_expiry_iso,
    }


# =============================================================================
# Public endpoints (used by register page + auth.py)
# =============================================================================
@router.get("/public/referral/lookup/{code}")
async def public_lookup(code: str):
    """Validate a referral code before signup.
    Handles both company referrals (CO-XXXXX) and individual referrals (HOMEME-XXXXX).
    """
    db = get_db()
    code = (code or "").strip().upper()

    # ── Company referral code (CO-XXXXX) ──────────────────────────────────────
    if code.startswith(CODE_PREFIX):
        ref = await db.company_referrals.find_one({"code": code}, {"_id": 0, "company_id": 1})
        if not ref:
            return {"valid": False}
        company = await db.companies.find_one(
            {"id": ref["company_id"]}, {"_id": 0, "name": 1}
        )
        return {
            "valid": True,
            "code": code,
            "type": "company",
            "referrer_company_name": (company or {}).get("name") or "شركة HomeMe",
        }

    # ── Individual referral code (HOMEME-XXXXX or custom prefix) ──────────────
    ref = await db.referrals.find_one({"code": code}, {"_id": 0, "user_id": 1})
    if not ref:
        return {"valid": False}
    user = await db.users.find_one(
        {"id": ref["user_id"]}, {"_id": 0, "full_name": 1, "username": 1}
    )
    referrer_name = (user or {}).get("full_name") or (user or {}).get("username") or "HomeMe"
    return {
        "valid": True,
        "code": code,
        "type": "individual",
        "referrer_company_name": referrer_name,
    }


async def track_company_signup(
    new_company_id: str,
    ref_code: str,
    new_admin_user_id: Optional[str] = None,
) -> bool:
    """Called from auth.py after a new company_admin registers with a ref code.

    - Records `referred_by_company_id` on the new company doc.
    - Increments `total_signups` on the referrer.
    - 🎁 Issues a one-time 15% welcome coupon to the *referee* (the company who
      just signed up). This is the **referee** half of the double-sided
      referral program. The referrer half is handled later by
      `award_referrer_credit` once the new company upgrades to a paid plan.

    Returns True on successful link, False otherwise.
    """
    db = get_db()
    code = (ref_code or "").strip().upper()
    if not code.startswith(CODE_PREFIX):
        return False
    ref = await db.company_referrals.find_one({"code": code}, {"_id": 0})
    if not ref:
        try:
            import logging as _lg
            _lg.info(f"[referral] track_company_signup: code not found = {code}")
        except Exception:
            pass
        return False
    referrer_id = ref.get("company_id")
    if not referrer_id or referrer_id == new_company_id:
        return False
    # Don't double-credit if the new company was already linked
    existing = await db.companies.find_one(
        {"id": new_company_id}, {"_id": 0, "referred_by_company_id": 1}
    )
    if existing and existing.get("referred_by_company_id"):
        return False
    await db.companies.update_one(
        {"id": new_company_id},
        {"$set": {"referred_by_company_id": referrer_id, "referred_by_code": code}},
    )
    await db.company_referrals.update_one(
        {"code": code},
        {
            "$inc": {"total_signups": 1},
            "$addToSet": {"referred_company_ids": new_company_id},
            "$push": {"credit_history": {
                "event": "signup",
                "at": _now(),
                "by_company_id": new_company_id,
            }},
        },
    )

    # 🎁 Referee welcome coupon — 15% off first paid subscription (one-time use).
    # Falls back to the company admin lookup if `new_admin_user_id` wasn't passed.
    try:
        if not new_admin_user_id:
            c = await db.companies.find_one(
                {"id": new_company_id}, {"_id": 0, "admin_user_id": 1}
            )
            new_admin_user_id = (c or {}).get("admin_user_id")
        if new_admin_user_id:
            welcome_code = f"WELCOME-{code[-4:]}-{new_admin_user_id[:6].upper()}"
            existing_coupon = await db.coupons.find_one({"code": welcome_code})
            if not existing_coupon:
                await db.coupons.insert_one({
                    "id": str(uuid.uuid4()),
                    "code": welcome_code,
                    "discount_type": "percentage",
                    "discount_value": 15,
                    "applicable_plans": [],   # all paid plans
                    "max_uses": 1,
                    "times_used": 0,
                    "is_active": True,
                    "expires_at": None,
                    "notes": f"كوبون ترحيب 15% للشركة الجديدة عبر إحالة {code}",
                    "created_by": "system_referral",
                    "created_at": _now(),
                    "referral_reward": True,
                    "reward_for_user": new_admin_user_id,
                    "reward_for_company": new_company_id,
                })
                await db.notifications.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": new_admin_user_id,
                    "type": "referral_welcome",
                    "title": "🎁 مرحباً بك في HomeMe!",
                    "message": (
                        f"احصل على خصم 15% على أول اشتراك. الكود: {welcome_code}"
                    ),
                    "read": False,
                    "created_at": _now(),
                })
                import logging as _lg
                _lg.info(
                    f"[referral] referee welcome coupon {welcome_code} issued to "
                    f"user={new_admin_user_id} company={new_company_id}"
                )
    except Exception as _e:
        import logging as _lg
        _lg.warning(f"[referral] failed to issue referee welcome coupon: {_e}")
    return True


async def award_referrer_credit(paid_company_id: str) -> bool:
    """Called from stripe_payments._activate_subscription when a referred company
    pays for the first time. Awards 1 month (30 days) of pending credit to the
    referrer — idempotent: only awards once per paid company.
    """
    db = get_db()
    c = await db.companies.find_one(
        {"id": paid_company_id},
        {"_id": 0, "referred_by_company_id": 1, "referral_reward_given": 1, "name": 1},
    )
    if not c or not c.get("referred_by_company_id") or c.get("referral_reward_given"):
        return False
    referrer_id = c["referred_by_company_id"]

    # Credit the referrer
    await db.company_referrals.update_one(
        {"company_id": referrer_id},
        {
            "$inc": {"pending_credit_days": REWARD_DAYS_PER_REFERRAL,
                     "successful_referrals": 1},
            "$push": {"credit_history": {
                "event": "credit_earned",
                "days": REWARD_DAYS_PER_REFERRAL,
                "at": _now(),
                "by_company_id": paid_company_id,
                "by_company_name": c.get("name"),
            }},
        },
    )
    # Mark paid_company so we don't re-award on subscription renewal
    await db.companies.update_one(
        {"id": paid_company_id},
        {"$set": {"referral_reward_given": True, "referral_reward_given_at": _now()}},
    )

    # Notify the referrer's admin user
    try:
        referrer_company = await db.companies.find_one(
            {"id": referrer_id}, {"_id": 0, "admin_user_id": 1, "name": 1}
        )
        admin_id = (referrer_company or {}).get("admin_user_id")
        if admin_id:
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": admin_id,
                "type": "referral_reward_earned",
                "title": f"🎉 ربحت {REWARD_DAYS_PER_REFERRAL} يوم مجاناً!",
                "message": f"شركة {c.get('name') or 'جديدة'} اشتركت عبر رابطك. تم إضافة شهر مجاني إلى رصيد الخصومات.",
                "read": False,
                "created_at": _now(),
            })
    except Exception:
        pass
    return True


# =============================================================================
# Super-admin dashboard
# =============================================================================
@router.get("/super-admin/referral/dashboard")
async def super_admin_dashboard(current_user: dict = Depends(require_super_admin)):
    db = get_db()
    all_refs = await db.company_referrals.find({}, {"_id": 0}).to_list(500)
    total_codes = len(all_refs)
    total_signups = sum(int(r.get("total_signups") or 0) for r in all_refs)
    total_successful = sum(int(r.get("successful_referrals") or 0) for r in all_refs)
    total_pending_days = sum(int(r.get("pending_credit_days") or 0) for r in all_refs)
    total_applied_days = sum(int(r.get("applied_credit_days") or 0) for r in all_refs)

    top = sorted(all_refs, key=lambda x: int(x.get("successful_referrals") or 0), reverse=True)[:10]
    cids = [r.get("company_id") for r in top if r.get("company_id")]
    cmap = {}
    if cids:
        async for c in db.companies.find({"id": {"$in": cids}}, {"_id": 0, "id": 1, "name": 1}):
            cmap[c["id"]] = c.get("name")
    top_list = [{
        "company_id": r.get("company_id"),
        "company_name": cmap.get(r.get("company_id")) or "—",
        "code": r.get("code"),
        "successful_referrals": r.get("successful_referrals", 0),
        "total_signups": r.get("total_signups", 0),
        "pending_credit_days": r.get("pending_credit_days", 0),
        "applied_credit_days": r.get("applied_credit_days", 0),
    } for r in top]

    conversion_rate = round((total_successful / total_signups * 100), 1) if total_signups else 0
    return {
        "totals": {
            "active_codes": total_codes,
            "total_signups_via_referral": total_signups,
            "successful_referrals": total_successful,
            "conversion_rate_percent": conversion_rate,
            "pending_credit_days": total_pending_days,
            "applied_credit_days": total_applied_days,
        },
        "top_referrers": top_list,
    }
