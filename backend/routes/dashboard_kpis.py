"""
Dashboard KPIs + 6-month revenue series
=======================================

A single low-cost endpoint the admin/company dashboard hits to populate the
top-of-page KPI cards and the 6-month revenue mini chart, without each
component issuing its own roundtrip.

GET /api/dashboard/kpis?compound_id=...
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from database import get_db
from auth_deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["dashboard-kpis"])


async def _safe_count(db, coll: str, q: dict) -> int:
    try:
        return await db[coll].count_documents(q)
    except Exception:
        return 0


def _month_buckets(now: datetime, count: int = 6) -> list[tuple[str, datetime, datetime]]:
    """Return last ``count`` calendar-month buckets ending with the current
    month: ``(label, start_utc, end_utc_exclusive)``.
    """
    out: list[tuple[str, datetime, datetime]] = []
    # Start from the first day of the current month
    year, month = now.year, now.month
    for _ in range(count):
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        # End is first day of next month
        if month == 12:
            end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        out.append((start.strftime("%Y-%m"), start, end))
        # Step back one month
        if month == 1:
            year -= 1
            month = 12
        else:
            month -= 1
    out.reverse()  # oldest → newest for charting
    return out


@router.get("/dashboard/kpis")
async def get_dashboard_kpis(
    compound_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    cid = compound_id or current_user.get("compound_id")
    if not cid:
        raise HTTPException(status_code=400, detail="compound_id is required")

    # Scope check — non-superadmins can only read their own compound
    if current_user.get("role") not in ("super_admin", "app_owner") and current_user.get("compound_id") != cid:
        raise HTTPException(status_code=403, detail="Out of compound scope")

    now = datetime.now(timezone.utc)
    start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    # KPI 1 — total residents (users with resident role in this compound)
    residents = await _safe_count(db, "users", {"compound_id": cid, "role": "resident"})

    # KPI 2 — vacant units = total_units - families_count
    compound = await db.compounds.find_one({"id": cid}, {"total_units": 1, "_id": 0})
    total_units = (compound or {}).get("total_units") or 0
    families = await _safe_count(db, "families", {"compound_id": cid})
    vacant_units = max(0, total_units - families) if total_units else 0

    # KPI 3 — open maintenance requests
    open_maintenance = await _safe_count(
        db, "maintenance_requests",
        {"compound_id": cid, "status": {"$in": ["open", "in_progress", "pending"]}},
    )

    # KPI 4 — this-month revenue from invoices (paid)
    monthly_revenue = 0.0
    try:
        cursor = db.invoices.find(
            {"compound_id": cid, "status": "paid", "paid_at": {"$gte": start_of_month}},
            {"amount": 1, "_id": 0},
        )
        async for inv in cursor:
            monthly_revenue += float(inv.get("amount") or 0)
    except Exception:
        pass

    # 6-month revenue mini series
    buckets = _month_buckets(now, count=6)
    revenue_series: list[dict] = []
    for label, start, end in buckets:
        total = 0.0
        try:
            cursor = db.invoices.find(
                {"compound_id": cid, "status": "paid", "paid_at": {"$gte": start, "$lt": end}},
                {"amount": 1, "_id": 0},
            )
            async for inv in cursor:
                total += float(inv.get("amount") or 0)
        except Exception:
            pass
        revenue_series.append({"month": label, "revenue": round(total, 2)})

    return {
        "kpis": {
            "total_residents": residents,
            "vacant_units": vacant_units,
            "total_units": total_units,
            "occupied_units": families,
            "open_maintenance": open_maintenance,
            "monthly_revenue": round(monthly_revenue, 2),
            "currency": "EGP",
        },
        "revenue_series": revenue_series,
        "generated_at": now.isoformat(),
    }
