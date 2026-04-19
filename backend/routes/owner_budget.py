"""
Owner General Budget - الميزانية العامة لمالك التطبيق
Aggregates: regular subscriptions, company subscriptions, ad revenue, expenses
Coupons & Codes are tracked as gifts (no monetary value)
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api")


@router.get("/owner/budget")
async def get_owner_budget(
    period: str = "month",  # month, quarter, year, all
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive budget overview for the app owner"""
    if current_user.get("role") not in ["app_owner", "super_admin"]:
        raise HTTPException(403, "App Owner access required")

    db = get_db()
    now = datetime.now(timezone.utc)

    # Period filter
    if period == "month":
        start = now - timedelta(days=30)
    elif period == "quarter":
        start = now - timedelta(days=90)
    elif period == "year":
        start = now - timedelta(days=365)
    else:
        start = None

    # --- REVENUE ---

    # 1. Regular subscription revenue (payment_transactions)
    pay_query = {"payment_status": {"$in": ["completed", "paid"]}}
    all_payments = await db.payment_transactions.find(pay_query, {"_id": 0}).to_list(length=10000)
    regular_sub_revenue = sum(p.get("amount", 0) for p in all_payments)

    # 2. Company subscription revenue
    company_subs = await db.company_subscriptions.find({}, {"_id": 0}).to_list(length=10000)
    company_sub_revenue = sum(s.get("plan_price", 0) for s in company_subs if s.get("status") == "active")

    # 3. Ad revenue (ads with ad_value > 0 and is_gift != True)
    ads = await db.internal_ads.find({}, {"_id": 0}).to_list(length=10000)
    ad_revenue = sum(a.get("ad_value", 0) for a in ads if not a.get("is_gift", False) and a.get("ad_value", 0) > 0)
    gift_ads_count = len([a for a in ads if a.get("is_gift", False)])

    # 4. Other revenue from revenue collection
    rev_query = {"status": "completed"}
    revenues = await db.revenue.find(rev_query, {"_id": 0}).to_list(length=10000)
    other_revenue = sum(r.get("amount", 0) for r in revenues)

    total_revenue = regular_sub_revenue + company_sub_revenue + ad_revenue + other_revenue

    # --- EXPENSES ---
    exp_query = {"status": "completed"}
    expenses = await db.expenses.find(exp_query, {"_id": 0}).to_list(length=10000)
    total_expenses = sum(e.get("amount", 0) for e in expenses)

    # Expense breakdown by category
    expense_by_category = {}
    for e in expenses:
        cat = e.get("category", "other")
        expense_by_category[cat] = expense_by_category.get(cat, 0) + e.get("amount", 0)

    # --- GIFTS (Coupons & Codes - no monetary value) ---
    coupons = await db.coupons.find({}, {"_id": 0}).to_list(length=10000)
    codes = await db.subscription_codes.find({}, {"_id": 0}).to_list(length=10000)

    active_coupons = len([c for c in coupons if c.get("is_active")])
    used_coupons = sum(c.get("times_used", 0) for c in coupons)
    active_codes = len([c for c in codes if c.get("is_active")])
    used_codes = sum(c.get("current_uses", 0) for c in codes)

    # --- SUBSCRIPTIONS SUMMARY ---
    active_company_subs = len([s for s in company_subs if s.get("status") == "active"])
    expired_company_subs = len([s for s in company_subs if s.get("status") != "active"])

    # Count user trials
    trials = await db.user_trials.count_documents({})

    net_profit = total_revenue - total_expenses

    return {
        "summary": {
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "net_profit": net_profit,
            "profit_margin": round((net_profit / total_revenue * 100), 1) if total_revenue > 0 else 0,
        },
        "revenue_breakdown": {
            "regular_subscriptions": regular_sub_revenue,
            "company_subscriptions": company_sub_revenue,
            "ad_revenue": ad_revenue,
            "other_revenue": other_revenue,
        },
        "expense_breakdown": expense_by_category,
        "subscriptions": {
            "active_company_subs": active_company_subs,
            "expired_company_subs": expired_company_subs,
            "total_company_subs": len(company_subs),
            "total_payments": len(all_payments),
            "active_trials": trials,
        },
        "gifts": {
            "total_coupons": len(coupons),
            "active_coupons": active_coupons,
            "used_coupons": used_coupons,
            "total_codes": len(codes),
            "active_codes": active_codes,
            "used_codes": used_codes,
            "gift_ads": gift_ads_count,
        },
        "ads": {
            "total_ads": len(ads),
            "active_ads": len([a for a in ads if a.get("is_active")]),
            "total_ad_revenue": ad_revenue,
            "gift_ads": gift_ads_count,
        },
        "period": period,
    }
