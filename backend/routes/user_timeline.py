"""
User Activity Timeline + Analytics

GET /api/users/{user_id}/timeline?days=90&type=all&limit=100
  Aggregates activity across: payments, maintenance, complaints, visitor_passes,
  support_tickets, audit_logs (logins/profile changes).
  Returns unified list sorted by date desc + per-type stats + monthly sparkline.

GET /api/users/{user_id}/timeline/csv?days=90
  Export CSV of the timeline.

Auth: app_owner, super_admin, or compound-scoped admin of target user's compound.
"""
from __future__ import annotations

import csv
import io
import logging
from datetime import datetime, timezone, timedelta
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from auth_deps import get_current_user
from database import get_db

router = APIRouter(prefix="/api/users", tags=["user-timeline"])

# Event types mapping: (collection, user_field, title_field, link_field, icon, category, status_field)
EVENT_SOURCES = [
    ("resident_payments",   "resident_id",   "amount",       "id", "💰", "payment",     "status"),
    ("payment_transactions","user_id",       "amount",       "id", "💳", "payment",     "status"),
    ("maintenance_requests","requester_id",  "title",        "id", "🔧", "maintenance", "status"),
    ("complaints",          "user_id",       "title",        "id", "📝", "complaint",   "status"),
    ("support_tickets",     "created_by",    "subject",      "id", "🎫", "ticket",      "status"),
    ("visitor_passes",      "resident_id",   "visitor_name", "id", "🚪", "visitor",     "status"),
    ("service_bookings",    "user_id",       "facility_name","id", "📅", "booking",     "status"),
    ("audit_logs",          "user_id",       "action",       "id", "🔐", "audit",       None),
]


async def _require_access(current_user: dict, target_user: dict):
    role = current_user.get("role")
    if role in ("app_owner", "super_admin"):
        return True
    # Compound admin of target's compound
    if role == "admin" and current_user.get("compound_id") == target_user.get("compound_id"):
        return True
    # Company admin — allowed if target is in a compound managed by their company
    if role == "company_admin":
        company_id = current_user.get("company_id")
        target_cpd = target_user.get("compound_id")
        if company_id and target_cpd:
            db = get_db()
            cpd = await db.compounds.find_one(
                {"id": target_cpd},
                {"_id": 0, "management_company_id": 1, "company_id": 1}
            )
            if cpd and (cpd.get("management_company_id") == company_id
                        or cpd.get("company_id") == company_id):
                return True
            # Fallback — legacy compound_ids list on company
            co = await db.companies.find_one(
                {"id": company_id}, {"_id": 0, "compound_ids": 1}
            )
            if co and target_cpd in (co.get("compound_ids") or []):
                return True
    # Users can see their own timeline
    if current_user.get("id") == target_user.get("id"):
        return True
    raise HTTPException(status_code=403, detail="لا تملكين صلاحية الاطلاع على هذا المستخدم")


def _as_dt(v):
    if not v:
        return None
    if isinstance(v, datetime):
        return v.replace(tzinfo=timezone.utc) if v.tzinfo is None else v
    try:
        s = str(v).replace("Z", "+00:00")
        return datetime.fromisoformat(s)
    except Exception:
        return None


async def _collect(user_id: str, since: datetime) -> list[dict]:
    db = get_db()
    events: list[dict] = []
    for coll, user_field, title_field, link_field, icon, category, status_field in EVENT_SOURCES:
        try:
            query = {user_field: user_id}
            proj = {"_id": 0, "id": 1, "created_at": 1, "payment_date": 1, "compound_id": 1,
                    title_field: 1, "amount": 1, "action": 1, "target_type": 1}
            if status_field:
                proj[status_field] = 1
            async for doc in db[coll].find(query, proj).sort("created_at", -1).limit(200):
                ts = _as_dt(doc.get("created_at")) or _as_dt(doc.get("payment_date"))
                if not ts:
                    continue
                if ts < since:
                    continue
                title = doc.get(title_field) or doc.get("action") or "—"
                # Humanize amount-based titles
                if title_field == "amount" and doc.get("amount"):
                    title = f"مبلغ {doc['amount']} ج.م"
                events.append({
                    "event_id": f"{coll}:{doc.get('id')}",
                    "category": category,
                    "icon": icon,
                    "title": str(title)[:200],
                    "status": doc.get(status_field) if status_field else None,
                    "amount": doc.get("amount"),
                    "timestamp": ts.isoformat(),
                    "collection": coll,
                    "id": doc.get("id"),
                })
        except Exception as e:
            logging.warning(f"timeline collect {coll} failed: {e}")
    events.sort(key=lambda x: x["timestamp"], reverse=True)
    return events


def _analytics(events: list[dict]) -> dict:
    by_category: dict[str, int] = defaultdict(int)
    by_status: dict[str, int] = defaultdict(int)
    for e in events:
        by_category[e["category"]] += 1
        if e.get("status"):
            by_status[str(e["status"])] += 1

    # 30-day sparkline (count per day, last 30 days)
    now = datetime.now(timezone.utc)
    buckets = {(now - timedelta(days=i)).strftime("%Y-%m-%d"): 0 for i in range(30)}
    for e in events:
        dt = _as_dt(e["timestamp"])
        if not dt:
            continue
        key = dt.strftime("%Y-%m-%d")
        if key in buckets:
            buckets[key] += 1
    spark = [buckets[k] for k in sorted(buckets.keys())]

    # Average response time for maintenance + complaints (simplistic: compared to next status change in audit_logs)
    total_value = sum((e.get("amount") or 0) for e in events if e.get("amount"))

    # Activity score: last 7-day events
    last_7d = now - timedelta(days=7)
    recent = sum(1 for e in events if (_as_dt(e["timestamp"]) or now) >= last_7d)

    return {
        "total_events": len(events),
        "by_category": dict(by_category),
        "by_status": dict(by_status),
        "total_payments_amount": total_value,
        "sparkline_30d": spark,
        "recent_7d_count": recent,
        "is_active_user": recent > 0,
    }


@router.get("/{user_id}/timeline")
async def user_timeline(
    user_id: str,
    days: int = Query(90, ge=1, le=365),
    type: str = Query("all"),
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    await _require_access(current_user, target)

    since = datetime.now(timezone.utc) - timedelta(days=days)
    events = await _collect(user_id, since)
    if type and type != "all":
        events = [e for e in events if e["category"] == type]
    analytics = _analytics(events)
    # Trim to limit
    events = events[:limit]
    return {
        "user": {
            "id": target.get("id"),
            "username": target.get("username"),
            "full_name": target.get("full_name"),
            "role": target.get("role"),
            "compound_id": target.get("compound_id"),
        },
        "days": days,
        "filter": type,
        "events": events,
        "analytics": analytics,
    }


@router.get("/{user_id}/timeline/csv")
async def user_timeline_csv(
    user_id: str,
    days: int = Query(90, ge=1, le=365),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    await _require_access(current_user, target)

    since = datetime.now(timezone.utc) - timedelta(days=days)
    events = await _collect(user_id, since)

    output = io.StringIO()
    output.write("\ufeff")  # BOM for Excel Arabic
    writer = csv.writer(output)
    writer.writerow(["Timestamp", "Category", "Title", "Status", "Amount", "Collection", "Event ID"])
    for e in events:
        writer.writerow([
            e["timestamp"], e["category"], e["title"],
            e.get("status") or "", e.get("amount") or "",
            e["collection"], e.get("id") or "",
        ])
    output.seek(0)
    filename = f"timeline_{target.get('username') or user_id}_{days}d.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
