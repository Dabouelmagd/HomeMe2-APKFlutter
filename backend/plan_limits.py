"""
Plan Limits Enforcement — checks company plans before allowing
mutations that would exceed their tier (max_compounds / max_residents).

Used by company-admin routes to enforce subscription tiers.
"""
from fastapi import HTTPException
from database import get_db


# Mirrors COMPANY_PLANS_CATALOGUE in routes/owner_subscriptions.py.
# Keeping a copy here avoids a circular import at module-load time.
_PLAN_LIMITS = {
    "starter":            {"max_compounds": 1,  "max_residents": 50},
    "company_startup":    {"max_compounds": 3,  "max_residents": 500},
    "company_business":   {"max_compounds": 5,  "max_residents": 2000},
    "company_enterprise": {"max_compounds": -1, "max_residents": -1},
}

# Machine-readable feature flags per plan. Mirrors `feature_flags` in
# COMPANY_PLANS_CATALOGUE. Used by `has_feature` and feature-gated routes.
_PLAN_FEATURES = {
    "starter": {
        "billing_payments": False, "ads_campaigns": False, "pdf_excel_exports": False,
        "ai_financial_insights": False, "advanced_dashboard": False, "custom_api": False,
        "whitelabel": False, "priority_support": False,
    },
    "company_startup": {
        "billing_payments": True, "ads_campaigns": True, "pdf_excel_exports": False,
        "ai_financial_insights": False, "advanced_dashboard": False, "custom_api": False,
        "whitelabel": False, "priority_support": False,
    },
    "company_business": {
        "billing_payments": True, "ads_campaigns": True, "pdf_excel_exports": True,
        "ai_financial_insights": True, "advanced_dashboard": True, "custom_api": True,
        "whitelabel": False, "priority_support": True,
    },
    "company_enterprise": {
        "billing_payments": True, "ads_campaigns": True, "pdf_excel_exports": True,
        "ai_financial_insights": True, "advanced_dashboard": True, "custom_api": True,
        "whitelabel": True, "priority_support": True,
    },
}

_PLAN_NAME_AR = {
    "starter":            "مجاني",
    "company_startup":    "شركة ناشئة",
    "company_business":   "شركة متوسطة",
    "company_enterprise": "شركة كبرى",
}


async def get_company_plan_limits(company_id: str) -> dict:
    """Return {plan, max_compounds, max_residents, plan_name_ar} for a company.
    
    If the subscription has expired (expires_at < now), the company is auto-downgraded
    to the starter plan until they renew. Status is flipped to 'expired' in the DB
    so the frontend badge surfaces it.
    """
    from datetime import datetime, timezone
    db = get_db()
    sub = await db.company_subscriptions.find_one({"company_id": company_id}, {"_id": 0})
    plan_key = (sub or {}).get("plan") or "starter"

    # Auto-expiry: paid plans whose expires_at is in the past fall back to starter
    if sub and plan_key != "starter" and sub.get("expires_at") and sub.get("status") != "expired":
        try:
            exp = datetime.fromisoformat(sub["expires_at"].replace("Z", "+00:00"))
            if exp < datetime.now(timezone.utc):
                await db.company_subscriptions.update_one(
                    {"company_id": company_id},
                    {"$set": {"status": "expired", "expired_at": datetime.now(timezone.utc).isoformat()}},
                )
                plan_key = "starter"
        except Exception:
            pass

    limits = _PLAN_LIMITS.get(plan_key, _PLAN_LIMITS["starter"])
    return {
        "plan": plan_key,
        "plan_name_ar": _PLAN_NAME_AR.get(plan_key, plan_key),
        "max_compounds": limits["max_compounds"],
        "max_residents": limits["max_residents"],
        "feature_flags": _PLAN_FEATURES.get(plan_key, _PLAN_FEATURES["starter"]),
    }


async def has_feature(company_id: str, feature_key: str) -> bool:
    """True if the company's current plan has `feature_key` enabled."""
    plan = await get_company_plan_limits(company_id)
    return bool(plan.get("feature_flags", {}).get(feature_key, False))


async def assert_feature_enabled(company_id: str, feature_key: str, feature_name_ar: str = None) -> dict:
    """Raise 403 plan_limit_feature if the company's plan does NOT include the feature.
    Returns the plan info on success."""
    plan = await get_company_plan_limits(company_id)
    if plan.get("feature_flags", {}).get(feature_key, False):
        return plan
    raise HTTPException(
        status_code=403,
        detail={
            "code": "plan_limit_feature",
            "feature": feature_key,
            "message": (
                f"⛔ ميزة \"{feature_name_ar or feature_key}\" غير متاحة في خطة \"{plan['plan_name_ar']}\". "
                f"يرجى ترقية الخطة لتفعيلها."
            ),
            "current_plan": plan["plan"],
            "current_plan_name_ar": plan["plan_name_ar"],
        },
    )


async def gate_company_feature(current_user: dict, feature_key: str, feature_name_ar: str = None):
    """Convenience wrapper for routes: gate ONLY if the user belongs to a management company.
    
    - If user has company_id → enforce the feature flag (raises 403 if disabled).
    - If user has no company_id → no-op (admins of standalone compounds keep all features).
    """
    if not current_user:
        return None
    company_id = current_user.get("company_id")
    if not company_id:
        return None
    return await assert_feature_enabled(company_id, feature_key, feature_name_ar)


async def assert_can_add_compound(company_id: str) -> dict:
    """Raise 403 with structured error if adding a compound would exceed the limit.
    Returns the plan info on success."""
    db = get_db()
    plan = await get_company_plan_limits(company_id)
    if plan["max_compounds"] == -1:
        return plan  # unlimited
    current = await db.compounds.count_documents({
        "$or": [
            {"company_id": company_id},
            {"management_company_id": company_id},
        ]
    })
    if current >= plan["max_compounds"]:
        # Use a structured detail dict that the frontend can parse.
        raise HTTPException(
            status_code=403,
            detail={
                "code": "plan_limit_compounds",
                "message": (
                    f"⛔ خطة \"{plan['plan_name_ar']}\" تسمح بـ {plan['max_compounds']} مجمع فقط. "
                    f"لديك حالياً {current} مجمع. يرجى ترقية الخطة للمتابعة."
                ),
                "current_plan": plan["plan"],
                "current_plan_name_ar": plan["plan_name_ar"],
                "current_count": current,
                "max_allowed": plan["max_compounds"],
            },
        )
    return plan


async def assert_can_add_resident(company_id: str) -> dict:
    """Raise 403 if adding a resident would exceed the limit."""
    db = get_db()
    plan = await get_company_plan_limits(company_id)
    if plan["max_residents"] == -1:
        return plan
    # Count residents (role=resident) across all compounds of the company
    compound_ids = await db.compounds.find(
        {"$or": [{"company_id": company_id}, {"management_company_id": company_id}]},
        {"_id": 0, "id": 1},
    ).to_list(length=2000)
    cids = [c["id"] for c in compound_ids]
    if not cids:
        return plan
    current = await db.users.count_documents({
        "role": "resident",
        "compound_id": {"$in": cids},
    })
    if current >= plan["max_residents"]:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "plan_limit_residents",
                "message": (
                    f"⛔ خطة \"{plan['plan_name_ar']}\" تسمح بـ {plan['max_residents']} ساكن فقط. "
                    f"لديكِ حالياً {current} ساكن. يرجى ترقية الخطة للمتابعة."
                ),
                "current_plan": plan["plan"],
                "current_plan_name_ar": plan["plan_name_ar"],
                "current_count": current,
                "max_allowed": plan["max_residents"],
            },
        )
    return plan
