"""
Compound Subscription — API for reading and changing a compound's subscription.

Endpoints:
  GET  /api/compounds/{compound_id}/subscription
      Returns the current subscription state of a compound along with the
      catalogue of available plans (single source of truth shared with the
      public landing page).

  POST /api/compounds/{compound_id}/subscription/apply-code
      Apply a subscription code to the compound. Propagates to admins and
      updates the compound record. Only compound admins + company_admin +
      super_admin + app_owner can apply.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from typing import Optional

from database import get_db
from auth_deps import get_current_user
from subscription_codes import SubscriptionCodeManager

router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Plan catalogue — MUST stay in sync with /app/frontend/src/config/plans.js
# (pricing source of truth). Changes here surface in the /pricing landing
# page + the in-compound "Change Plan" dialog.
# ---------------------------------------------------------------------------
RESIDENTIAL_PLANS = [
    {"key": "starter",  "name_ar": "مجاني",   "name_en": "Starter",  "monthly_egp": 0,    "residents": "up_to_30"},
    {"key": "basic",    "name_ar": "أساسي",   "name_en": "Basic",    "monthly_egp": 1200,  "residents": "up_to_100"},
    {"key": "pro",      "name_ar": "احترافي", "name_en": "Pro",      "monthly_egp": 2200, "residents": "unlimited"},
    {"key": "premium",  "name_ar": "متقدم",   "name_en": "Premium",  "monthly_egp": 4000, "residents": "unlimited"},
]

COMPANY_PLANS = [
    {"key": "startup",     "name_ar": "شركة ناشئة",    "name_en": "Startup",     "monthly_egp": 5500,  "compounds": "up_to_3"},
    {"key": "business",    "name_ar": "شركة متوسطة",   "name_en": "Business",    "monthly_egp": 13000,  "compounds": "up_to_8"},
    {"key": "enterprise",  "name_ar": "شركة كبرى",     "name_en": "Enterprise",  "monthly_egp": 35000, "compounds": "unlimited"},
]


def _can_manage_compound(user: dict, compound_id: str) -> bool:
    """Owner/super_admin can manage any compound; admin/compound_admin
    can manage only their own compound; company_admin can manage their
    company's compounds (loosely allowed here, company check elsewhere)."""
    role = user.get("role")
    if role in ("app_owner", "super_admin", "company_admin"):
        return True
    if role in ("admin", "compound_admin") and user.get("compound_id") == compound_id:
        return True
    return False


def _format_subscription(compound: dict) -> dict:
    """Return a flat object describing the compound subscription state."""
    now = datetime.now(timezone.utc)
    end_raw = compound.get("subscription_end")
    days_remaining = None
    if end_raw:
        try:
            end_dt = datetime.fromisoformat(str(end_raw).replace("Z", "+00:00"))
            if end_dt.tzinfo is None:
                end_dt = end_dt.replace(tzinfo=timezone.utc)
            days_remaining = max(0, (end_dt - now).days)
        except Exception:
            days_remaining = None
    return {
        "subscription_active": compound.get("subscription_active", False),
        "subscription_type": compound.get("subscription_type") or "trial",
        "subscription_plan": compound.get("subscription_plan"),
        "subscription_start": compound.get("subscription_start"),
        "subscription_end": end_raw,
        "subscription_code_used": compound.get("subscription_code_used"),
        "days_remaining": days_remaining,
    }


@router.get("/compounds/{compound_id}/subscription")
async def get_compound_subscription(
    compound_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Return the compound's current subscription and the plan catalogue."""
    if not _can_manage_compound(current_user, compound_id):
        raise HTTPException(status_code=403, detail="غير مصرح بعرض اشتراك هذا المجمع")

    db = get_db()
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="المجمع غير موجود")

    return {
        "compound_id": compound_id,
        "compound_name": compound.get("name"),
        "subscription": _format_subscription(compound),
        "plans": {
            "residential": RESIDENTIAL_PLANS,
            "company": COMPANY_PLANS,
        },
    }


class ApplyCodeBody(BaseModel):
    code: str


@router.post("/compounds/{compound_id}/subscription/apply-code")
async def apply_code_to_compound(
    compound_id: str,
    body: ApplyCodeBody,
    current_user: dict = Depends(get_current_user),
):
    """Apply a subscription code to this compound — propagates automatically
    to all admins of the compound via SubscriptionCodeManager.apply_code."""
    if not _can_manage_compound(current_user, compound_id):
        raise HTTPException(status_code=403, detail="غير مصرح بتغيير اشتراك هذا المجمع")

    db = get_db()
    # Find one admin of the compound to use as the "owning user" for the code
    target = await db.users.find_one(
        {"compound_id": compound_id, "role": {"$in": ["admin", "compound_admin"]}},
        {"_id": 0, "id": 1, "username": 1},
    )
    if not target:
        raise HTTPException(status_code=404, detail="لا يوجد مدير لهذا المجمع لتطبيق الكود عليه")

    result = await SubscriptionCodeManager.apply_code(
        body.code.upper().strip(),
        target["id"],
        target.get("username", ""),
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "failed_to_apply_code"))

    # Fetch the updated compound to return fresh state
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    return {
        "ok": True,
        "message": "تم تفعيل الاشتراك بنجاح",
        "subscription": _format_subscription(compound or {}),
        "details": {
            "subscription_type": result.get("subscription_type"),
            "duration_days": result.get("duration_days"),
            "subscription_end": result.get("subscription_end"),
        },
    }


# ---------------------------------------------------------------------------
# Manual activation — used by the owner / super-admin after verifying a
# Vodafone Cash / InstaPay / bank-transfer payment confirmation ticket.
# ---------------------------------------------------------------------------
DURATION_DAYS = {
    "1_month": 30,
    "3_months": 90,
    "6_months": 180,
    "9_months": 270,
    "1_year": 365,
    "yearly": 365,
    "lifetime": 36500,
}


class ManualActivateBody(BaseModel):
    duration: str                              # one of DURATION_DAYS keys
    plan: Optional[str] = None                 # starter | basic | pro | premium | …
    transaction_ref: Optional[str] = None      # saved into subscription_code_used for traceability
    ticket_id: Optional[str] = None            # link the support ticket so it auto-closes


@router.post("/compounds/{compound_id}/subscription/manual-activate")
async def manual_activate_subscription(
    compound_id: str,
    body: ManualActivateBody,
    current_user: dict = Depends(get_current_user),
):
    """Owner / super_admin only: activate a paid subscription on a compound
    without requiring a subscription code. Used after verifying a payment
    proof attached to a support ticket."""
    if current_user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="مصرح فقط للمالك / السوبر أدمن")

    if body.duration not in DURATION_DAYS:
        raise HTTPException(status_code=400, detail=f"المدة يجب أن تكون: {', '.join(DURATION_DAYS.keys())}")

    db = get_db()
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="المجمع غير موجود")

    now = datetime.now(timezone.utc)
    days = DURATION_DAYS[body.duration]
    end = now + timedelta(days=days)
    code_ref = (body.transaction_ref or "MANUAL").strip().upper()

    sub_update = {
        "subscription_active": True,
        "subscription_type": body.duration,
        "subscription_plan": body.plan,
        "subscription_start": now.isoformat(),
        "subscription_end": end.isoformat(),
        "subscription_code_used": code_ref,
        "subscription_updated_at": now.isoformat(),
    }
    # Persist on compound + every admin of the compound (same as code path)
    await db.compounds.update_one({"id": compound_id}, {"$set": sub_update})
    await db.users.update_many(
        {"compound_id": compound_id, "role": {"$in": ["admin", "compound_admin"]}},
        {"$set": {k: v for k, v in sub_update.items() if k != "subscription_updated_at"}},
    )

    # Auto-close the support ticket if provided
    if body.ticket_id:
        await db.support_tickets.update_one(
            {"id": body.ticket_id},
            {"$set": {
                "status": "resolved",
                "activation_done": True,
                "activation_by": current_user.get("id"),
                "activation_ref": code_ref,
                "activation_duration": body.duration,
                "activation_plan": body.plan,
                "activation_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }},
        )

    return {
        "ok": True,
        "message": "تم تفعيل الاشتراك على المجمع",
        "subscription": _format_subscription({**compound, **sub_update}),
    }
