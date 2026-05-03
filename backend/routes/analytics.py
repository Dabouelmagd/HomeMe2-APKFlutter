"""
Analytics Dashboard routes
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid, json, logging, os

from database import get_db
from auth_deps import get_current_user, require_admin, require_super_admin, hash_password, verify_password, create_access_token, validate_password_strength
from helpers import serialize_datetime
from shared_models import *

router = APIRouter(prefix="/api")

@router.get("/analytics/dashboard")
async def get_analytics_dashboard(
    date_range: str = "last_30_days",
    compound_id: Optional[str] = None,
    time_range: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    """Live analytics aggregated from MongoDB.
    Scope: explicit `compound_id` query param wins; otherwise auto-aggregate
    across the user's company (company_admin) or globally (app_owner/super_admin).
    `time_range` is accepted as alias for `date_range` for compatibility."""
    try:
        db = get_db()
        now = datetime.now(timezone.utc)
        # date_range -> days
        if time_range and not date_range:
            date_range = time_range
        elif time_range:
            date_range = time_range
        days_map = {"last_7_days": 7, "last_30_days": 30, "last_90_days": 90, "last_year": 365}
        days = days_map.get(date_range, 30)
        start = now - timedelta(days=days)
        prev_start = start - timedelta(days=days)
        prev_end = start
        start_iso = start.isoformat()
        prev_start_iso = prev_start.isoformat()
        prev_end_iso = prev_end.isoformat()

        role = current_user.get("role", "")
        cu_compound = current_user.get("compound_id")
        # Resolve scope identical strategy to balance-sheet
        if compound_id:
            scope = {"compound_id": compound_id}
        elif role in ("app_owner", "super_admin"):
            scope = {}
        elif role in ("company_admin", "assistant_manager", "accountant") and current_user.get("company_id") and (not cu_compound or cu_compound in ("default-compound", "")):
            company_id = current_user["company_id"]
            owned = await db.compounds.find(
                {"$or": [{"company_id": company_id}, {"management_company_id": company_id}]},
                {"_id": 0, "id": 1}
            ).to_list(500)
            cids = [c["id"] for c in owned if c.get("id")]
            scope = {"compound_id": {"$in": cids}} if cids else {"compound_id": "__never__"}
        else:
            scope = {"compound_id": cu_compound} if cu_compound else {}

        def _delta(curr: float, prev: float) -> float:
            if prev == 0:
                return 100.0 if curr > 0 else 0.0
            return round(((curr - prev) / prev) * 100, 1)

        # Residents
        res_filter = {**scope, "role": "resident"}
        total_residents = await db.users.count_documents(res_filter)
        active_residents = await db.users.count_documents({**res_filter, "is_active": True})
        new_now = await db.users.count_documents({**res_filter, "created_at": {"$gte": start_iso}})
        new_prev = await db.users.count_documents({**res_filter, "created_at": {"$gte": prev_start_iso, "$lt": prev_end_iso}})

        # Maintenance
        maint_filter = {**scope}
        total_maint = await db.maintenance_requests.count_documents({**maint_filter, "created_at": {"$gte": start_iso}})
        pending_maint = await db.maintenance_requests.count_documents({**maint_filter, "status": {"$in": ["pending", "open", "in_progress"]}})
        prev_maint = await db.maintenance_requests.count_documents({**maint_filter, "created_at": {"$gte": prev_start_iso, "$lt": prev_end_iso}})

        # Revenue (resident_payments) + collection rate (paid charges / total charges in window)
        revenue = 0.0
        async for p in db.resident_payments.find({**scope, "created_at": {"$gte": start_iso}}, {"amount": 1, "_id": 0}):
            revenue += p.get("amount", 0) or 0
        prev_revenue = 0.0
        async for p in db.resident_payments.find({**scope, "created_at": {"$gte": prev_start_iso, "$lt": prev_end_iso}}, {"amount": 1, "_id": 0}):
            prev_revenue += p.get("amount", 0) or 0

        total_charges = 0.0
        paid_charges = 0.0
        async for c in db.resident_charges.find({**scope, "created_at": {"$gte": start_iso}}, {"amount": 1, "status": 1, "_id": 0}):
            amt = c.get("amount", 0) or 0
            total_charges += amt
            if c.get("status") == "paid":
                paid_charges += amt
        collection_rate = round((paid_charges / total_charges) * 100, 1) if total_charges else 0.0

        # Expenses (current + prev) — supports both ISO date strings and naked YYYY-MM-DD
        expenses_total = 0.0
        prev_expenses_total = 0.0
        expenses_by_category: Dict[str, float] = {}
        async for e in db.expenses.find(scope, {"amount": 1, "category": 1, "date": 1, "created_at": 1, "_id": 0}):
            edate = e.get("date") or e.get("created_at") or ""
            if isinstance(edate, datetime):
                edate = edate.isoformat()
            amt = float(e.get("amount") or 0)
            if edate >= start_iso:
                expenses_total += amt
                cat = e.get("category") or "other"
                expenses_by_category[cat] = expenses_by_category.get(cat, 0) + amt
            elif edate >= prev_start_iso and edate < prev_end_iso:
                prev_expenses_total += amt

        # Engagement — active users (logged in or any activity_logs entry within window)
        active_users_window = await db.users.count_documents({**scope, "last_login": {"$gte": start_iso}}) if scope else await db.users.count_documents({"last_login": {"$gte": start_iso}})
        # Fallback to activity_logs if last_login isn't reliably tracked
        if active_users_window == 0:
            try:
                if compound_id:
                    active_users_window = len(await db.activity_logs.distinct("user_id", {"compound_id": compound_id, "timestamp": {"$gte": start_iso}}))
                else:
                    active_users_window = len(await db.activity_logs.distinct("user_id", {"timestamp": {"$gte": start_iso}}))
            except Exception:
                active_users_window = 0
        total_users_in_scope = await db.users.count_documents(scope) if scope else await db.users.count_documents({})
        engagement_rate = round((active_users_window / total_users_in_scope) * 100, 1) if total_users_in_scope else 0.0
        prev_active = await db.users.count_documents({**scope, "last_login": {"$gte": prev_start_iso, "$lt": prev_end_iso}})
        engagement_growth = _delta(active_users_window, prev_active)

        # Charts — last 4 buckets (months for residents/revenue, weeks for maintenance, last 5 weekdays for activity)
        # Resident growth: cumulative user count at end of each of last 4 months
        resident_growth = []
        # Build month boundaries for the last 4 months including current
        month_boundaries = []
        cursor_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        for _ in range(4):
            month_boundaries.append(cursor_month)
            # Step back one calendar month
            if cursor_month.month == 1:
                cursor_month = cursor_month.replace(year=cursor_month.year - 1, month=12)
            else:
                cursor_month = cursor_month.replace(month=cursor_month.month - 1)
        month_boundaries.reverse()  # oldest first
        for boundary in month_boundaries:
            label = boundary.strftime("%b")
            count = await db.users.count_documents({**res_filter, "created_at": {"$lt": boundary.isoformat()}})
            resident_growth.append({"label": label, "value": count})

        # Maintenance trend — last 4 weeks
        maintenance_trend = []
        for i in range(4, 0, -1):
            wk_start = now - timedelta(days=i * 7)
            wk_end = now - timedelta(days=(i - 1) * 7)
            cnt = await db.maintenance_requests.count_documents({**maint_filter, "created_at": {"$gte": wk_start.isoformat(), "$lt": wk_end.isoformat()}})
            maintenance_trend.append({"label": f"Week {5 - i}", "value": cnt})

        # Revenue trend — last 4 months (using actual calendar month boundaries)
        revenue_trend = []
        rev_months = []
        cursor_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        for _ in range(4):
            rev_months.append(cursor_month)
            if cursor_month.month == 1:
                cursor_month = cursor_month.replace(year=cursor_month.year - 1, month=12)
            else:
                cursor_month = cursor_month.replace(month=cursor_month.month - 1)
        rev_months.reverse()
        for i, m_start in enumerate(rev_months):
            if i + 1 < len(rev_months):
                m_end = rev_months[i + 1]
            else:
                # Next month after current
                if m_start.month == 12:
                    m_end = m_start.replace(year=m_start.year + 1, month=1)
                else:
                    m_end = m_start.replace(month=m_start.month + 1)
            label = m_start.strftime("%b")
            total = 0.0
            async for p in db.resident_payments.find({**scope, "created_at": {"$gte": m_start.isoformat(), "$lt": m_end.isoformat()}}, {"amount": 1, "_id": 0}):
                total += p.get("amount", 0) or 0
            revenue_trend.append({"label": label, "value": round(total, 2)})

        # Monthly Revenue vs Expenses — last 6 months (for the comparative bar chart)
        monthly_comparison = []
        comp_months = []
        cursor_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        for _ in range(6):
            comp_months.append(cursor_month)
            if cursor_month.month == 1:
                cursor_month = cursor_month.replace(year=cursor_month.year - 1, month=12)
            else:
                cursor_month = cursor_month.replace(month=cursor_month.month - 1)
        comp_months.reverse()
        ar_short_months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
        for i, m_start in enumerate(comp_months):
            if i + 1 < len(comp_months):
                m_end = comp_months[i + 1]
            else:
                if m_start.month == 12:
                    m_end = m_start.replace(year=m_start.year + 1, month=1)
                else:
                    m_end = m_start.replace(month=m_start.month + 1)
            m_start_iso = m_start.isoformat()
            m_end_iso = m_end.isoformat()
            # Revenue from db.revenue + resident_payments
            rev_amt = 0.0
            async for r in db.revenue.find({**scope, "date": {"$gte": m_start_iso, "$lt": m_end_iso}}, {"amount": 1, "_id": 0}):
                rev_amt += float(r.get("amount") or 0)
            async for p in db.resident_payments.find({**scope, "created_at": {"$gte": m_start_iso, "$lt": m_end_iso}}, {"amount": 1, "_id": 0}):
                rev_amt += float(p.get("amount") or 0)
            # Expenses from db.expenses
            exp_amt = 0.0
            async for e in db.expenses.find(scope, {"amount": 1, "date": 1, "created_at": 1, "_id": 0}):
                edate = e.get("date") or e.get("created_at") or ""
                if isinstance(edate, datetime):
                    edate = edate.isoformat()
                if m_start_iso <= edate < m_end_iso:
                    exp_amt += float(e.get("amount") or 0)
            ar_label = ar_short_months[m_start.month - 1]
            monthly_comparison.append({
                "label": ar_label,
                "month_index": m_start.month,
                "year": m_start.year,
                "revenue": round(rev_amt, 2),
                "expenses": round(exp_amt, 2),
                "net": round(rev_amt - exp_amt, 2),
            })

        # Activity trend — last 5 days (weekday names)
        activity_trend = []
        for i in range(4, -1, -1):
            d_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            d_end = d_start + timedelta(days=1)
            cnt = 0
            try:
                cnt = await db.activity_logs.count_documents({**scope, "timestamp": {"$gte": d_start.isoformat(), "$lt": d_end.isoformat()}})
            except Exception:
                cnt = 0
            activity_trend.append({"label": d_start.strftime("%a"), "value": cnt})

        # Recent activity (5 latest, prefer activity_logs, fallback audit_logs)
        recent_activity = []
        try:
            cursor = db.activity_logs.find(scope, {"_id": 0}).sort("timestamp", -1).limit(5)
            async for a in cursor:
                recent_activity.append({
                    "title": a.get("action", "Activity"),
                    "description": a.get("description") or a.get("details", ""),
                    "timestamp": a.get("timestamp"),
                })
        except Exception:
            pass
        if not recent_activity:
            cursor = db.audit_logs.find(scope, {"_id": 0}).sort("timestamp", -1).limit(5)
            async for a in cursor:
                recent_activity.append({
                    "title": a.get("action", "Activity"),
                    "description": f"{a.get('user_name','—')} • {a.get('target_type','')}",
                    "timestamp": a.get("timestamp"),
                })

        # Summary copy (data-driven)
        achievements = []
        if _delta(new_now, new_prev) > 0:
            achievements.append(f"{_delta(new_now, new_prev)}% increase in new resident registrations")
        if collection_rate >= 80:
            achievements.append(f"{collection_rate}% payment collection rate achieved")
        if engagement_rate >= 50:
            achievements.append(f"{engagement_rate}% user engagement maintained")
        if not achievements:
            achievements = ["Building activity baseline — first reporting period"]

        improvements = []
        if pending_maint > 0:
            improvements.append(f"{pending_maint} pending maintenance request(s)")
        if collection_rate < 80 and total_charges > 0:
            improvements.append(f"Collection rate at {collection_rate}% — needs follow-up")
        if not improvements:
            improvements = ["No critical operational gaps detected"]

        recommendations = []
        if pending_maint > 5:
            recommendations.append("Reduce maintenance backlog — consider adding service providers")
        if engagement_rate < 50:
            recommendations.append("Run engagement campaigns to activate inactive residents")
        if collection_rate < 90 and total_charges > 0:
            recommendations.append("Send payment reminders for outstanding charges")
        if not recommendations:
            recommendations = ["Operations are healthy — keep monitoring KPIs weekly"]

        analytics = {
            "scope": "compound" if compound_id else "global",
            "compound_id": compound_id,
            "date_range": date_range,
            "residents": {
                "total": total_residents,
                "active": active_residents,
                "growth_rate": _delta(new_now, new_prev),
            },
            "maintenance": {
                "total": total_maint,
                "pending": pending_maint,
                "growth_rate": _delta(total_maint, prev_maint),
            },
            "revenue": {
                "total": round(revenue, 2),
                "collection_rate": collection_rate,
                "growth_rate": _delta(revenue, prev_revenue),
            },
            "expenses": {
                "total": round(expenses_total, 2),
                "by_category": {k: round(v, 2) for k, v in expenses_by_category.items()},
                "growth_rate": _delta(expenses_total, prev_expenses_total),
                "net_balance": round(revenue - expenses_total, 2),
            },
            "engagement": {
                "rate": engagement_rate,
                "active_users": active_users_window,
                "growth_rate": engagement_growth,
            },
            "charts": {
                "resident_growth": resident_growth,
                "maintenance_trend": maintenance_trend,
                "revenue_trend": revenue_trend,
                "activity_trend": activity_trend,
                "monthly_comparison": monthly_comparison,
            },
            "recent_activity": recent_activity,
            "summary": {
                "achievements": achievements,
                "improvements": improvements,
                "recommendations": recommendations,
            },
        }
        return analytics

    except Exception as e:
        logging.exception(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch analytics: {e}")

# ============ PHASE 3: DOCUMENT MANAGEMENT ENDPOINTS ============

# documents routes extracted to routes/documents.py

# polls routes extracted to routes/polls.py

# smart_devices routes extracted to routes/smart_devices.py

# newsletters routes extracted to routes/newsletters.py

# companies routes extracted to routes/companies.py

