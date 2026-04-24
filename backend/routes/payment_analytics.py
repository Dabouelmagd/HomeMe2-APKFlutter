"""
Payment Analytics — scoped stats for Owner / SuperAdmin / CompanyAdmin / CompoundAdmin.

Endpoints:
  GET /api/payment-analytics?days=30&scope=auto
      scope: auto | global | company | compound
      Returns: totals, method breakdown, per-day series, activation rate.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from datetime import datetime, timezone, timedelta
from typing import Optional

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api")


def _resolve_scope(current_user: dict, requested: str) -> dict:
    """Return a Mongo filter dict for support_tickets based on caller's role."""
    role = current_user.get("role") or ""
    if role in ("app_owner", "super_admin") and requested in ("auto", "global"):
        return {}
    if role == "company_admin":
        # Need to compute the company's compound_ids
        return {"__company_id__": current_user.get("company_id") or ""}
    if role in ("admin", "compound_admin") or requested == "compound":
        cid = current_user.get("compound_id") or ""
        if not cid:
            raise HTTPException(status_code=400, detail="لا يوجد مجمع مرتبط بالحساب")
        return {"compound_id": cid}
    # default: owner view if no other scope fits
    return {}


def _parse_amount(raw) -> float:
    """Extract numeric value from free-form amount string like '2200 ج.م'."""
    if not raw:
        return 0.0
    try:
        s = str(raw)
        digits = "".join(ch for ch in s if ch.isdigit() or ch == ".")
        return float(digits) if digits else 0.0
    except Exception:
        return 0.0


@router.get("/payment-analytics")
async def payment_analytics(
    days: int = Query(30, ge=1, le=365),
    scope: str = Query("auto"),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    # Resolve filter
    scope_filter = _resolve_scope(current_user, scope)

    # Expand company_admin filter → compound_ids of that company
    if "__company_id__" in scope_filter:
        company_id = scope_filter.pop("__company_id__")
        if company_id:
            compound_ids = await db.compounds.find(
                {"company_id": company_id}, {"_id": 0, "id": 1}
            ).to_list(length=1000)
            ids = [c["id"] for c in compound_ids]
            scope_filter = {"compound_id": {"$in": ids}} if ids else {"compound_id": {"$in": ["__none__"]}}
        else:
            scope_filter = {"compound_id": {"$in": ["__none__"]}}

    since = datetime.now(timezone.utc) - timedelta(days=days)
    base_filter = {
        **scope_filter,
        "category": "payment_confirmation",
        "created_at": {"$gte": since.isoformat()},
    }

    tickets = await db.support_tickets.find(base_filter, {"_id": 0}).to_list(length=5000)

    # Totals
    total = len(tickets)
    activated = sum(1 for t in tickets if t.get("activation_done"))
    total_amount = sum(_parse_amount(t.get("payment_amount") or t.get("activation_amount")) for t in tickets)
    activated_amount = sum(_parse_amount(t.get("payment_amount") or t.get("activation_amount")) for t in tickets if t.get("activation_done"))
    pending = total - activated

    # Method breakdown
    methods = {}
    for t in tickets:
        m = t.get("payment_method") or "unknown"
        entry = methods.setdefault(m, {"count": 0, "amount": 0.0, "activated": 0})
        entry["count"] += 1
        entry["amount"] += _parse_amount(t.get("payment_amount"))
        if t.get("activation_done"):
            entry["activated"] += 1
    method_list = [
        {"method": k, **v}
        for k, v in sorted(methods.items(), key=lambda x: x[1]["count"], reverse=True)
    ]

    # Per-day series (count + amount)
    per_day = {}
    for t in tickets:
        created = t.get("created_at") or ""
        day_key = str(created)[:10]
        if not day_key:
            continue
        e = per_day.setdefault(day_key, {"count": 0, "amount": 0.0, "activated": 0})
        e["count"] += 1
        e["amount"] += _parse_amount(t.get("payment_amount"))
        if t.get("activation_done"):
            e["activated"] += 1
    series = [
        {"day": d, **v} for d, v in sorted(per_day.items())
    ]

    # Activation rate
    activation_rate = round((activated / total) * 100, 1) if total > 0 else 0.0

    # Top method
    top_method = method_list[0]["method"] if method_list else None

    return {
        "scope": scope,
        "days": days,
        "since": since.isoformat(),
        "totals": {
            "tickets": total,
            "activated": activated,
            "pending": pending,
            "activation_rate": activation_rate,
            "total_amount": total_amount,
            "activated_amount": activated_amount,
        },
        "methods": method_list,
        "series": series,
        "top_method": top_method,
    }
