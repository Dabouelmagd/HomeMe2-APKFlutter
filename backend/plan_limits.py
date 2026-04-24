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

_PLAN_NAME_AR = {
    "starter":            "مجاني",
    "company_startup":    "شركة ناشئة",
    "company_business":   "شركة متوسطة",
    "company_enterprise": "شركة كبرى",
}


async def get_company_plan_limits(company_id: str) -> dict:
    """Return {plan, max_compounds, max_residents, plan_name_ar} for a company."""
    db = get_db()
    sub = await db.company_subscriptions.find_one({"company_id": company_id}, {"_id": 0, "plan": 1})
    plan_key = (sub or {}).get("plan") or "starter"
    limits = _PLAN_LIMITS.get(plan_key, _PLAN_LIMITS["starter"])
    return {
        "plan": plan_key,
        "plan_name_ar": _PLAN_NAME_AR.get(plan_key, plan_key),
        "max_compounds": limits["max_compounds"],
        "max_residents": limits["max_residents"],
    }


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
