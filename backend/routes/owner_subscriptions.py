"""
Company Subscriptions Management for App Owner
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import logging

from database import get_db
from auth_deps import get_current_user
from helpers import serialize_datetime

router = APIRouter(prefix="/api")


@router.get("/owner/company-subscriptions")
async def get_company_subscriptions(
    search: str = "",
    status_filter: str = "all",
    page: int = 1,
    per_page: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get all company subscriptions for app owner"""
    if current_user.get("role") not in ["app_owner", "super_admin"]:
        raise HTTPException(403, "App Owner access required")

    db = get_db()

    # Get all companies
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"company_code": {"$regex": search, "$options": "i"}},
            {"contact_email": {"$regex": search, "$options": "i"}},
        ]

    companies = await db.companies.find(query, {"_id": 0}).to_list(None)

    # Enrich with subscription and compound data
    results = []
    total_revenue = 0
    active_count = 0
    expired_count = 0

    for company in companies:
        cid = company.get("id", "")

        # Get subscription
        sub = await db.company_subscriptions.find_one(
            {"company_id": cid}, {"_id": 0}
        )

        # Get compounds
        compounds = await db.compound_companies.find(
            {"company_id": cid, "status": "active"}, {"_id": 0}
        ).to_list(None)

        # Count residents across all compounds
        compound_ids = [c.get("id", c.get("compound_id", "")) for c in compounds]
        total_residents = 0
        total_families = 0
        if compound_ids:
            total_residents = await db.users.count_documents({
                "compound_id": {"$in": compound_ids},
                "role": "resident",
                "is_active": True
            })
            total_families = await db.families.count_documents({
                "compound_id": {"$in": compound_ids}
            })

        # Determine status
        is_active = True
        if sub:
            if sub.get("status") == "cancelled":
                is_active = False
            else:
                end_date = sub.get("current_period_end")
                if end_date:
                    if isinstance(end_date, str):
                        try:
                            end_date = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                        except Exception:
                            end_date = None
                    if isinstance(end_date, datetime):
                        if end_date.tzinfo is None:
                            end_date = end_date.replace(tzinfo=timezone.utc)
                        is_active = end_date > datetime.now(timezone.utc)

        if is_active:
            active_count += 1
        else:
            expired_count += 1

        plan_price = sub.get("plan_price", 0) if sub else 0
        total_revenue += plan_price

        entry = {
            "id": cid,
            "name": company.get("name", ""),
            "company_code": company.get("company_code", ""),
            "contact_email": company.get("contact_email", ""),
            "contact_phone": company.get("contact_phone", ""),
            "created_at": company.get("created_at"),
            "plan": sub.get("plan", "starter") if sub else "starter",
            "plan_price": plan_price,
            "subscription_start": sub.get("current_period_start") if sub else None,
            "subscription_end": sub.get("current_period_end") if sub else None,
            "is_active": is_active,
            "total_compounds": len(compounds),
            "total_residents": total_residents,
            "total_families": total_families,
            "compounds": [{"id": c.get("id", c.get("compound_id", "")), "name": c.get("name", "")} for c in compounds],
        }
        results.append(serialize_datetime(entry))

    # Filter by status
    if status_filter == "active":
        results = [r for r in results if r["is_active"]]
    elif status_filter == "expired":
        results = [r for r in results if not r["is_active"]]

    total = len(results)
    start = (page - 1) * per_page
    paginated = results[start:start + per_page]

    return {
        "companies": paginated,
        "total": total,
        "page": page,
        "per_page": per_page,
        "stats": {
            "total_companies": len(companies),
            "active": active_count,
            "expired": expired_count,
            "total_monthly_revenue": total_revenue,
        }
    }


@router.put("/owner/company-subscriptions/{company_id}")
async def update_company_subscription(
    company_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update company subscription (change plan, renew, suspend)"""
    if current_user.get("role") not in ["app_owner", "super_admin"]:
        raise HTTPException(403, "App Owner access required")

    db = get_db()
    action = body.get("action")

    if action == "change_plan":
        new_plan = body.get("plan")
        if not new_plan:
            raise HTTPException(400, "Plan is required")
        await db.company_subscriptions.update_one(
            {"company_id": company_id},
            {"$set": {"plan": new_plan, "updated_at": datetime.now(timezone.utc)}}
        )
        return {"status": "ok", "message": "Plan updated"}

    elif action == "renew":
        months = body.get("months", 12)
        await db.company_subscriptions.update_one(
            {"company_id": company_id},
            {"$set": {
                "current_period_end": datetime.now(timezone.utc) + timedelta(days=30 * months),
                "status": "active",
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        return {"status": "ok", "message": f"Renewed for {months} months"}

    elif action == "suspend":
        await db.company_subscriptions.update_one(
            {"company_id": company_id},
            {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc)}}
        )
        return {"status": "ok", "message": "Subscription suspended"}

    elif action == "activate":
        await db.company_subscriptions.update_one(
            {"company_id": company_id},
            {"$set": {
                "status": "active",
                "current_period_end": datetime.now(timezone.utc) + timedelta(days=365),
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        return {"status": "ok", "message": "Subscription activated"}

    else:
        raise HTTPException(400, f"Unknown action: {action}")
