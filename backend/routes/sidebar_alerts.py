"""
Sidebar Alerts — fast summary counts for sidebar badges.
Used by Layout.js to show numeric/color badges next to nav items.
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api")


@router.get("/sidebar-alerts/companies")
async def companies_sidebar_alerts(current_user: dict = Depends(get_current_user)):
    """
    Returns alert counts for the Owner's "إدارة الشركات والمجمعات" sidebar link.
    - active_companies: count of non-disabled companies
    - expiring_contracts: contracts ending within 7 days (active ones)
    - empty_companies: companies with zero compounds
    - urgent: total "red flags" (expiring + empty) → displayed as red badge
    """
    role = current_user.get("role")
    if role not in ("app_owner", "super_admin"):
        # Non-privileged roles get a zeroed response (safe)
        return {"active_companies": 0, "expiring_contracts": 0, "empty_companies": 0, "urgent": 0}

    db = get_db()
    now = datetime.now(timezone.utc)
    week_from_now = now + timedelta(days=7)

    # Companies count
    active_companies = await db.companies.count_documents({})

    # Empty companies (no compounds linked)
    empty_companies = await db.companies.count_documents({
        "$or": [
            {"compound_ids": {"$size": 0}},
            {"compound_ids": {"$exists": False}},
        ]
    })

    # Expiring contracts within 7 days (status=active)
    contracts = await db.management_contracts.find(
        {"status": {"$ne": "cancelled"}},
        {"_id": 0, "end_date": 1, "status": 1}
    ).to_list(length=1000)
    expiring = 0
    for c in contracts:
        end = c.get("end_date")
        if not end:
            continue
        try:
            end_dt = datetime.fromisoformat(end.replace("Z", "+00:00")) if isinstance(end, str) else end
            if end_dt.tzinfo is None:
                end_dt = end_dt.replace(tzinfo=timezone.utc)
            if now <= end_dt <= week_from_now:
                expiring += 1
        except Exception:
            continue

    urgent = expiring + empty_companies
    return {
        "active_companies": active_companies,
        "expiring_contracts": expiring,
        "empty_companies": empty_companies,
        "urgent": urgent,
    }
