"""
Subscription Analytics — Owner dashboard for revenue + churn + conversion + expiring soon.

Endpoint:
  GET /api/subscription-analytics/summary
    Returns:
      - mrr: monthly recurring revenue (sum of all active subs normalized to monthly)
      - arr: annual recurring revenue (mrr * 12)
      - active_count, paying_count, trial_count
      - churn_rate_30d: % of canceled subs / total active in last 30 days
      - trial_to_paid_30d: % of trials that converted in last 30 days
      - mrr_by_plan: dict {company_startup, company_business, company_enterprise}
      - expiring_soon: list of companies expiring in next 7 days
      - canceling_soon: list of subs with cancel_at_period_end=true
"""
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends

from database import get_db
from auth_deps import require_app_owner
from routes.stripe_subscriptions import PLAN_CATALOGUE


router = APIRouter(prefix="/api/super-admin/subscription-analytics", tags=["subscription-analytics"])


PLAN_LABELS = {
    "company_startup": "شركة ناشئة",
    "company_business": "شركة متوسطة",
    "company_enterprise": "شركة كبرى",
}


def _monthly_amount(plan: str, billing_cycle: Optional[str]) -> float:
    """Normalize a subscription's amount to monthly value (yearly / 12)."""
    cat = PLAN_CATALOGUE.get(plan)
    if not cat:
        return 0.0
    if billing_cycle == "yearly":
        return cat["yearly_amount"] / 12.0
    return cat["monthly_amount"]


@router.get("/summary")
async def get_summary(current_user: dict = Depends(require_app_owner)):
    db = get_db()
    now = datetime.now(timezone.utc)
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    seven_days_ahead = (now + timedelta(days=7)).isoformat()

    # All active subscriptions
    active_cursor = db.company_subscriptions.find({"status": "active"}, {"_id": 0})
    active_subs = await active_cursor.to_list(length=10000)

    mrr_by_plan = {k: 0.0 for k in PLAN_CATALOGUE.keys()}
    mrr_total = 0.0
    paying_count = 0
    on_auto_count = 0
    legacy_count = 0
    for s in active_subs:
        plan = s.get("plan")
        if not plan or plan == "starter":
            continue
        # If sub has stripe_subscription_id → real recurring
        if s.get("stripe_subscription_id"):
            on_auto_count += 1
        else:
            legacy_count += 1
        m = _monthly_amount(plan, s.get("billing_cycle"))
        mrr_total += m
        mrr_by_plan[plan] = mrr_by_plan.get(plan, 0) + m
        paying_count += 1

    # Trial subs
    trial_count = await db.company_subscriptions.count_documents({"status": "trial"})

    # Canceled in last 30 days
    canceled_30d = await db.company_subscriptions.count_documents({
        "$or": [
            {"status": "canceled", "canceled_at": {"$gte": thirty_days_ago}},
            {"cancel_at_period_end": True, "canceled_at": {"$gte": thirty_days_ago}},
        ],
    })
    churn_rate_30d = (
        round(canceled_30d / (paying_count + canceled_30d) * 100, 1)
        if (paying_count + canceled_30d) > 0
        else 0.0
    )

    # Trial-to-paid (in last 30 days)
    trial_converted_30d = await db.company_subscriptions.count_documents({
        "status": "active",
        "activated_at": {"$gte": thirty_days_ago},
        "had_trial": True,
    })
    trial_started_30d = await db.company_subscriptions.count_documents({
        "trial_started_at": {"$gte": thirty_days_ago},
    })
    trial_to_paid_30d = (
        round(trial_converted_30d / trial_started_30d * 100, 1)
        if trial_started_30d > 0
        else 0.0
    )

    # Expiring in next 7 days
    expiring_cursor = db.company_subscriptions.find(
        {
            "status": "active",
            "expires_at": {"$gte": now.isoformat(), "$lte": seven_days_ahead},
        },
        {"_id": 0},
    ).limit(50)
    expiring_raw = await expiring_cursor.to_list(length=50)
    expiring_soon = []
    for s in expiring_raw:
        company = await db.management_companies.find_one(
            {"id": s.get("company_id")}, {"_id": 0, "name": 1}
        ) or {}
        expiring_soon.append({
            "company_id": s.get("company_id"),
            "company_name": company.get("name") or "—",
            "plan": s.get("plan"),
            "plan_name_ar": PLAN_LABELS.get(s.get("plan"), s.get("plan", "")),
            "expires_at": s.get("expires_at"),
            "is_auto_renewing": bool(s.get("stripe_subscription_id")) and not s.get("cancel_at_period_end"),
        })

    # Canceling at period end
    canceling_cursor = db.company_subscriptions.find(
        {"status": "active", "cancel_at_period_end": True},
        {"_id": 0},
    ).limit(50)
    canceling_raw = await canceling_cursor.to_list(length=50)
    canceling_soon = []
    for s in canceling_raw:
        company = await db.management_companies.find_one(
            {"id": s.get("company_id")}, {"_id": 0, "name": 1}
        ) or {}
        canceling_soon.append({
            "company_id": s.get("company_id"),
            "company_name": company.get("name") or "—",
            "plan": s.get("plan"),
            "plan_name_ar": PLAN_LABELS.get(s.get("plan"), s.get("plan", "")),
            "expires_at": s.get("expires_at"),
        })

    return {
        "mrr": round(mrr_total, 2),
        "arr": round(mrr_total * 12, 2),
        "currency": "EGP",
        "paying_count": paying_count,
        "trial_count": trial_count,
        "on_auto_renew_count": on_auto_count,
        "legacy_count": legacy_count,
        "auto_renew_percent": round(on_auto_count / paying_count * 100, 1) if paying_count else 0,
        "churn_rate_30d": churn_rate_30d,
        "canceled_30d": canceled_30d,
        "trial_to_paid_30d": trial_to_paid_30d,
        "trial_started_30d": trial_started_30d,
        "trial_converted_30d": trial_converted_30d,
        "mrr_by_plan": [
            {
                "plan": k,
                "plan_name_ar": PLAN_LABELS.get(k, k),
                "mrr": round(v, 2),
                "share_percent": round(v / mrr_total * 100, 1) if mrr_total else 0,
            }
            for k, v in mrr_by_plan.items()
        ],
        "expiring_soon": expiring_soon,
        "canceling_soon": canceling_soon,
        "generated_at": now.isoformat(),
    }
