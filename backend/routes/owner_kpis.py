"""
Owner KPIs — high-level business metrics for app_owner / super_admin.

Returns:
  - total_compounds, active_compounds, new_compounds_30d
  - total_users, active_users, new_users_30d
  - dau (last 24h), mau (last 30d) by activity_logs / last_login
  - mrr (sum of active subscription monthly amounts)
  - churn_30d (cancelled subs / active subs at start of window)
  - top_compounds by user count
  - daily_signups (last 30 days array)
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import logging

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


def _can_view(user: dict) -> bool:
    return user.get("role") in ("app_owner", "super_admin")


@router.get("/owner-kpis")
async def owner_kpis(current_user: dict = Depends(get_current_user)):
    if not _can_view(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    now = datetime.now(timezone.utc)
    iso24 = (now - timedelta(hours=24)).isoformat()
    iso30 = (now - timedelta(days=30)).isoformat()
    iso60 = (now - timedelta(days=60)).isoformat()

    # ── Compounds ──
    total_compounds = await db.compounds.count_documents({})
    active_compounds = await db.compounds.count_documents({"is_active": {"$ne": False}})
    new_compounds_30d = await db.compounds.count_documents({"created_at": {"$gte": iso30}})

    # ── Users ──
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"is_active": True})
    new_users_30d = await db.users.count_documents({"created_at": {"$gte": iso30}})

    # ── DAU / MAU (last_login or audit_logs auth.login success) ──
    dau = 0
    mau = 0
    try:
        dau_set = await db.audit_logs.distinct("actor_id", {"action": "auth.login", "success": True, "at": {"$gte": iso24}})
        mau_set = await db.audit_logs.distinct("actor_id", {"action": "auth.login", "success": True, "at": {"$gte": iso30}})
        dau = len([u for u in dau_set if u])
        mau = len([u for u in mau_set if u])
    except Exception:
        pass
    if dau == 0:
        dau = await db.users.count_documents({"last_login": {"$gte": iso24}})
    if mau == 0:
        mau = await db.users.count_documents({"last_login": {"$gte": iso30}})

    # ── MRR (sum of active subs amount) ──
    mrr = 0.0
    for coll in ("user_subscriptions", "compound_subscriptions", "company_subscriptions", "individual_subscriptions"):
        try:
            agg = await db[coll].aggregate([
                {"$match": {"$or": [{"status": "active"}, {"is_active": True}]}},
                {"$group": {"_id": None, "sum": {"$sum": {"$ifNull": ["$amount", "$monthly_amount"]}}}},
            ]).to_list(length=1)
            if agg:
                mrr += float(agg[0].get("sum") or 0)
        except Exception:
            pass

    # ── Churn last 30d (cancelled subs / active subs at start of window) ──
    cancelled_30d = 0
    active_at_window_start = 1  # avoid div-zero
    for coll in ("user_subscriptions", "compound_subscriptions", "company_subscriptions"):
        try:
            cancelled_30d += await db[coll].count_documents({"status": "cancelled", "cancelled_at": {"$gte": iso30}})
            active_at_window_start += await db[coll].count_documents({"$or": [{"status": "active"}, {"is_active": True}], "created_at": {"$lte": iso30}})
        except Exception:
            pass
    churn_30d = round((cancelled_30d / max(1, active_at_window_start)) * 100, 2)

    # ── All compounds with live stats ──
    top_compounds = []
    try:
        all_compounds = await db.compounds.find({}, {"_id": 0}).to_list(length=100)
        for c in all_compounds:
            cid = c.get("id")
            residents = await db.users.count_documents({"compound_id": cid, "role": {"$in": ["resident", "family_head", "family_member"]}})
            staff = await db.users.count_documents({"compound_id": cid, "role": {"$in": ["admin", "manager", "security", "accountant"]}})
            total_users = await db.users.count_documents({"compound_id": cid})
            top_compounds.append({
                "compound_id": cid,
                "name": c.get("name", ""),
                "address": c.get("address", ""),
                "city": c.get("city", ""),
                "residents": residents,
                "staff": staff,
                "total_users": total_users,
                "is_active": c.get("is_active", True),
                "logo": c.get("logo", ""),
                "created_at": c.get("created_at", ""),
            })
        # Sort by total users desc
        top_compounds.sort(key=lambda x: x["total_users"], reverse=True)
    except Exception as e:
        logger.warning(f"top_compounds error: {e}")

    # ── Daily signups last 30d ──
    daily_signups = []
    try:
        agg = await db.users.aggregate([
            {"$match": {"created_at": {"$gte": iso30}}},
            {"$project": {"day": {"$substr": ["$created_at", 0, 10]}}},
            {"$group": {"_id": "$day", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}},
        ]).to_list(length=40)
        daily_signups = [{"day": r["_id"], "count": r["count"]} for r in agg]
    except Exception:
        pass

    return {
        "compounds": {"total": total_compounds, "active": active_compounds, "new_30d": new_compounds_30d},
        "users": {"total": total_users, "active": active_users, "new_30d": new_users_30d},
        "engagement": {"dau": dau, "mau": mau, "stickiness": round((dau / max(1, mau)) * 100, 1) if mau else 0},
        "revenue": {"mrr": round(mrr, 2), "arr_estimate": round(mrr * 12, 2)},
        "churn": {"cancelled_30d": cancelled_30d, "active_at_window_start": active_at_window_start, "rate_pct": churn_30d},
        "top_compounds": top_compounds,
        "daily_signups": daily_signups,
        "ran_at": now.isoformat(),
    }
