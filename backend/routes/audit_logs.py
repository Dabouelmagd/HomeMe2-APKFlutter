"""Audit Logs viewing API — restricted to owner / super_admin."""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
import logging

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


def _can_view(user: dict) -> bool:
    return user.get("role") in ("app_owner", "super_admin")


@router.get("/audit-logs")
async def list_audit_logs(
    actor_id: Optional[str] = None,
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    success: Optional[bool] = None,
    days: int = Query(default=7, ge=1, le=180),
    limit: int = Query(default=100, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    """Paginated, filterable list of audit-log entries."""
    if not _can_view(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")

    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    q: dict = {"at": {"$gte": since}}
    if actor_id:
        q["actor_id"] = actor_id
    if action:
        q["action"] = {"$regex": f"^{action}", "$options": "i"}
    if target_type:
        q["target_type"] = target_type
    if target_id:
        q["target_id"] = target_id
    if success is not None:
        q["success"] = success

    total = await db.audit_logs.count_documents(q)
    items = await db.audit_logs.find(q, {"_id": 0}).sort("at", -1).skip(skip).limit(limit).to_list(length=limit)
    return {"total": total, "items": items, "skip": skip, "limit": limit}


@router.get("/audit-logs/summary")
async def audit_summary(
    days: int = Query(default=7, ge=1, le=180),
    current_user: dict = Depends(get_current_user),
):
    """Aggregate counts by action + actor for quick dashboarding."""
    if not _can_view(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    by_action = await db.audit_logs.aggregate([
        {"$match": {"at": {"$gte": since}}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}, "fails": {"$sum": {"$cond": [{"$eq": ["$success", False]}, 1, 0]}}}},
        {"$sort": {"count": -1}},
        {"$limit": 20},
    ]).to_list(length=20)

    by_actor = await db.audit_logs.aggregate([
        {"$match": {"at": {"$gte": since}, "actor_id": {"$ne": None}}},
        {"$group": {"_id": {"id": "$actor_id", "username": "$actor_username", "role": "$actor_role"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]).to_list(length=10)

    total = await db.audit_logs.count_documents({"at": {"$gte": since}})
    fail_total = await db.audit_logs.count_documents({"at": {"$gte": since}, "success": False})
    return {
        "total": total,
        "fail_total": fail_total,
        "top_actions": [{"action": a["_id"] or "unknown", "count": a["count"], "fails": a["fails"]} for a in by_action],
        "top_actors": [{"actor_id": a["_id"]["id"], "username": a["_id"].get("username"), "role": a["_id"].get("role"), "count": a["count"]} for a in by_actor],
    }
