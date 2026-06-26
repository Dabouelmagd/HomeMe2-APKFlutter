"""Audit Logs viewing API — restricted to owner / super_admin."""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone, timedelta
import asyncio
import logging

from database import get_db
from auth_deps import get_current_user
from services.geoip_service import geoip_batch_lookup

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
    country: Optional[str] = None,
    days: int = Query(default=7, ge=1, le=180),
    limit: int = Query(default=100, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
    enrich_geo: bool = Query(default=True, description="Enrich entries with GeoIP country/city"),
    current_user: dict = Depends(get_current_user),
):
    """Paginated, filterable list of audit-log entries with optional GeoIP enrichment."""
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
    if country:
        q["geo.country_code"] = country.upper()

    total = await db.audit_logs.count_documents(q)
    items = await db.audit_logs.find(q, {"_id": 0}).sort("at", -1).skip(skip).limit(limit).to_list(length=limit)

    # Enrich with GeoIP — backfills `geo` field for entries that don't have it yet.
    if enrich_geo and items:
        ips_needing_geo = [it.get("ip") for it in items if it.get("ip") and not it.get("geo")]
        if ips_needing_geo:
            geo_map = await geoip_batch_lookup(ips_needing_geo)
            for it in items:
                if not it.get("geo") and it.get("ip"):
                    g = geo_map.get(it["ip"])
                    if g:
                        it["geo"] = {
                            "country_code": g.get("country_code"),
                            "country_name": g.get("country_name"),
                            "city": g.get("city"),
                            "source": g.get("source"),
                        }

    return {"total": total, "items": items, "skip": skip, "limit": limit}


@router.get("/audit-logs/summary")
async def audit_summary(
    days: int = Query(default=7, ge=1, le=180),
    current_user: dict = Depends(get_current_user),
):
    """Aggregate counts by action + actor + country for quick dashboarding."""
    if not _can_view(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    # All aggregations run in parallel for speed
    by_action_task = db.audit_logs.aggregate([
        {"$match": {"at": {"$gte": since}}},
        {"$group": {"_id": "$action", "count": {"$sum": 1}, "fails": {"$sum": {"$cond": [{"$eq": ["$success", False]}, 1, 0]}}}},
        {"$sort": {"count": -1}},
        {"$limit": 20},
    ]).to_list(length=20)

    by_actor_task = db.audit_logs.aggregate([
        {"$match": {"at": {"$gte": since}, "actor_id": {"$ne": None}}},
        {"$group": {"_id": {"id": "$actor_id", "username": "$actor_username", "role": "$actor_role"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]).to_list(length=10)

    by_country_task = db.audit_logs.aggregate([
        {"$match": {"at": {"$gte": since}, "geo.country_code": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": {"code": "$geo.country_code", "name": "$geo.country_name"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]).to_list(length=10)

    total_task = db.audit_logs.count_documents({"at": {"$gte": since}})
    fail_total_task = db.audit_logs.count_documents({"at": {"$gte": since}, "success": False})

    by_action, by_actor, by_country, total, fail_total = await asyncio.gather(
        by_action_task, by_actor_task, by_country_task, total_task, fail_total_task
    )

    return {
        "total": total,
        "fail_total": fail_total,
        "top_actions": [{"action": a["_id"] or "unknown", "count": a["count"], "fails": a["fails"]} for a in by_action],
        "top_actors": [{"actor_id": a["_id"]["id"], "username": a["_id"].get("username"), "role": a["_id"].get("role"), "count": a["count"]} for a in by_actor],
        "top_countries": [{"country_code": a["_id"].get("code"), "country_name": a["_id"].get("name"), "count": a["count"]} for a in by_country],
    }


@router.post("/audit-logs/backfill-geo")
async def backfill_geoip(
    days: int = Query(default=7, ge=1, le=180),
    limit: int = Query(default=500, ge=1, le=5000),
    current_user: dict = Depends(get_current_user),
):
    """One-shot backfill: enrich existing audit log entries that are missing geo data.
    Useful right after enabling GeoIP, or after refreshing the MaxMind database."""
    if not _can_view(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    cursor = db.audit_logs.find(
        {"at": {"$gte": since}, "ip": {"$exists": True, "$ne": None}, "geo": {"$exists": False}},
        {"_id": 0, "id": 1, "ip": 1},
    ).limit(limit)
    rows = await cursor.to_list(length=limit)
    if not rows:
        return {"processed": 0, "enriched": 0}

    unique_ips = list({r["ip"] for r in rows if r.get("ip")})
    geo_map = await geoip_batch_lookup(unique_ips)

    enriched = 0
    for r in rows:
        ip = r.get("ip")
        if not ip:
            continue
        g = geo_map.get(ip)
        if g:
            await db.audit_logs.update_one(
                {"id": r["id"]},
                {"$set": {"geo": {
                    "country_code": g.get("country_code"),
                    "country_name": g.get("country_name"),
                    "city": g.get("city"),
                    "source": g.get("source"),
                }}}
            )
            enriched += 1
    return {"processed": len(rows), "enriched": enriched, "unique_ips": len(unique_ips)}
