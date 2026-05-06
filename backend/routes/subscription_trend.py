"""
MRR Trend — month-by-month MRR history + 3-month forecast based on recent growth rate.

Endpoint:
  GET /api/subscription-analytics/mrr-trend?months=12
    Returns:
      - history: [{ month: "2025-06", mrr: 12500, paying: 5, new: 1, churned: 0 }, ...]
      - forecast: [{ month: "2026-06", mrr: 35000, type: "forecast" }, ...]
      - growth_rate_3m: 0.18 (18% MoM avg over last 3 months)
      - current_mrr: 31000

Strategy:
- For each month back, count active subs as of last day of that month and sum their monthly normalized amount.
- Approximate using `activated_at`, `canceled_at`, and `expires_at` fields.
- Forecast = last 3 months' MoM growth rate × current MRR, projected forward.
"""
from datetime import datetime, timezone, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query

from database import get_db
from auth_deps import require_app_owner
from routes.stripe_subscriptions import PLAN_CATALOGUE


router = APIRouter(prefix="/api/subscription-analytics", tags=["subscription-analytics-trend"])


def _month_start(d: datetime) -> datetime:
    return d.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _add_months(d: datetime, n: int) -> datetime:
    """Add n months to date d (n can be negative)."""
    month_index = d.month - 1 + n
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = min(d.day, [31, 29 if year % 4 == 0 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return d.replace(year=year, month=month, day=day)


def _monthly_amount(plan: str, billing_cycle: str) -> float:
    cat = PLAN_CATALOGUE.get(plan)
    if not cat:
        return 0.0
    if billing_cycle == "yearly":
        return cat["yearly_amount"] / 12.0
    return cat["monthly_amount"]


@router.get("/mrr-trend")
async def get_mrr_trend(
    months: int = Query(12, ge=1, le=24),
    forecast_months: int = Query(3, ge=0, le=6),
    current_user: dict = Depends(require_app_owner),
):
    db = get_db()
    now = datetime.now(timezone.utc)
    today_start = _month_start(now)

    # Fetch all subs once (with relevant fields)
    cursor = db.company_subscriptions.find(
        {},
        {
            "_id": 0,
            "company_id": 1,
            "plan": 1,
            "billing_cycle": 1,
            "status": 1,
            "activated_at": 1,
            "canceled_at": 1,
            "expires_at": 1,
            "stripe_subscription_id": 1,
        },
    )
    all_subs = await cursor.to_list(length=10000)

    history: List[dict] = []
    for i in range(months - 1, -1, -1):
        # We snapshot at end of month i back from current
        snap_month_start = _add_months(today_start, -i)
        snap_month_end = _add_months(snap_month_start, 1) - timedelta(seconds=1)

        mrr = 0.0
        paying_count = 0
        for s in all_subs:
            plan = s.get("plan")
            if not plan or plan == "starter":
                continue

            # Was this sub active during snap_month_end?
            try:
                activated_at = (
                    datetime.fromisoformat(s["activated_at"]) if s.get("activated_at") else None
                )
            except Exception:
                activated_at = None
            try:
                canceled_at = (
                    datetime.fromisoformat(s["canceled_at"]) if s.get("canceled_at") else None
                )
            except Exception:
                canceled_at = None

            # Conservative: only count if activated_at <= snap_end AND (canceled_at is None or canceled_at > snap_end)
            if activated_at and activated_at > snap_month_end:
                continue
            if canceled_at and canceled_at <= snap_month_end:
                continue
            # If no activated_at but status is active and we're at current month → count
            if not activated_at and i != 0:
                continue
            if not activated_at and s.get("status") != "active":
                continue

            mrr += _monthly_amount(plan, s.get("billing_cycle"))
            paying_count += 1

        history.append({
            "month": snap_month_start.strftime("%Y-%m"),
            "month_label": snap_month_start.strftime("%b %Y"),
            "mrr": round(mrr, 2),
            "paying_count": paying_count,
            "is_current": i == 0,
        })

    # Compute MoM growth rate over last 3 months (skip months with mrr=0)
    growth_rates = []
    for i in range(1, min(4, len(history))):
        prev = history[-i - 1]["mrr"]
        cur = history[-i]["mrr"]
        if prev > 0:
            growth_rates.append((cur - prev) / prev)
    avg_growth = sum(growth_rates) / len(growth_rates) if growth_rates else 0.0
    # Cap growth between -50% and +50% to avoid runaway forecasts
    avg_growth = max(-0.5, min(0.5, avg_growth))

    # Forecast next N months
    current_mrr = history[-1]["mrr"] if history else 0.0
    forecast = []
    proj = current_mrr
    for j in range(1, forecast_months + 1):
        proj *= (1 + avg_growth)
        f_month = _add_months(today_start, j)
        forecast.append({
            "month": f_month.strftime("%Y-%m"),
            "month_label": f_month.strftime("%b %Y"),
            "mrr": round(proj, 2),
            "is_forecast": True,
        })

    return {
        "history": history,
        "forecast": forecast,
        "current_mrr": round(current_mrr, 2),
        "growth_rate_3m": round(avg_growth * 100, 1),
        "current_arr": round(current_mrr * 12, 2),
        "forecast_arr_end": round(forecast[-1]["mrr"] * 12, 2) if forecast else round(current_mrr * 12, 2),
        "currency": "EGP",
        "generated_at": now.isoformat(),
    }
