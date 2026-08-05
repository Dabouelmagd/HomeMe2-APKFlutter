"""
Analytics Dashboard routes
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid, json, logging, os, asyncio

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
        elif role in ("company_admin", "assistant_manager", "accountant") and current_user.get("company_id"):
            # company_admin always scoped to ALL their compounds via company_id
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

        # Residents (4 counts in parallel)
        res_filter = {**scope, "role": "resident"}
        total_residents, active_residents, new_now, new_prev = await asyncio.gather(
            db.users.count_documents(res_filter),
            db.users.count_documents({**res_filter, "is_active": True}),
            db.users.count_documents({**res_filter, "created_at": {"$gte": start_iso}}),
            db.users.count_documents({**res_filter, "created_at": {"$gte": prev_start_iso, "$lt": prev_end_iso}}),
        )

        # Maintenance (3 counts in parallel)
        maint_filter = {**scope}
        total_maint, pending_maint, prev_maint = await asyncio.gather(
            db.maintenance_requests.count_documents({**maint_filter, "created_at": {"$gte": start_iso}}),
            db.maintenance_requests.count_documents({**maint_filter, "status": {"$in": ["pending", "open", "in_progress"]}}),
            db.maintenance_requests.count_documents({**maint_filter, "created_at": {"$gte": prev_start_iso, "$lt": prev_end_iso}}),
        )

        # Revenue (resident_payments) + collection rate — aggregations instead of cursor iteration
        async def _sum_payments(match_extra):
            pipeline = [
                {"$match": {**scope, **match_extra}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
            ]
            cur = await db.resident_payments.aggregate(pipeline).to_list(1)
            return float(cur[0]["total"]) if cur else 0.0

        async def _sum_charges(match_extra):
            pipeline = [
                {"$match": {**scope, **match_extra}},
                {"$group": {
                    "_id": None,
                    "total": {"$sum": "$amount"},
                    "paid": {"$sum": {"$cond": [{"$eq": ["$status", "paid"]}, "$amount", 0]}},
                }},
            ]
            cur = await db.resident_charges.aggregate(pipeline).to_list(1)
            if not cur:
                return 0.0, 0.0
            return float(cur[0].get("total") or 0), float(cur[0].get("paid") or 0)

        revenue, prev_revenue, charges_window = await asyncio.gather(
            _sum_payments({"created_at": {"$gte": start_iso}}),
            _sum_payments({"created_at": {"$gte": prev_start_iso, "$lt": prev_end_iso}}),
            _sum_charges({"created_at": {"$gte": start_iso}}),
        )
        total_charges, paid_charges = charges_window
        collection_rate = round((paid_charges / total_charges) * 100, 1) if total_charges else 0.0

        # Expenses — single fetch then bucket in memory (was: full scan twice)
        expenses_total = 0.0
        prev_expenses_total = 0.0
        expenses_by_category: Dict[str, float] = {}
        expense_docs = await db.expenses.find(scope, {"amount": 1, "category": 1, "date": 1, "created_at": 1, "_id": 0}).to_list(20000)
        for e in expense_docs:
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

        # Engagement — 3 counts in parallel
        active_users_filter = {**scope, "last_login": {"$gte": start_iso}} if scope else {"last_login": {"$gte": start_iso}}
        prev_active_filter = {**scope, "last_login": {"$gte": prev_start_iso, "$lt": prev_end_iso}}
        total_users_filter = scope if scope else {}
        active_users_window, total_users_in_scope, prev_active = await asyncio.gather(
            db.users.count_documents(active_users_filter),
            db.users.count_documents(total_users_filter),
            db.users.count_documents(prev_active_filter),
        )
        # Fallback to activity_logs if last_login isn't reliably tracked
        if active_users_window == 0:
            try:
                if compound_id:
                    active_users_window = len(await db.activity_logs.distinct("user_id", {"compound_id": compound_id, "timestamp": {"$gte": start_iso}}))
                else:
                    active_users_window = len(await db.activity_logs.distinct("user_id", {"timestamp": {"$gte": start_iso}}))
            except Exception:
                active_users_window = 0
        engagement_rate = round((active_users_window / total_users_in_scope) * 100, 1) if total_users_in_scope else 0.0
        engagement_growth = _delta(active_users_window, prev_active)

        # Charts — last 4 buckets (months for residents/revenue, weeks for maintenance, last 5 weekdays for activity)
        # Resident growth: cumulative user count at end of each of last 4 months (4 counts in parallel)
        month_boundaries = []
        cursor_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        for _ in range(4):
            month_boundaries.append(cursor_month)
            if cursor_month.month == 1:
                cursor_month = cursor_month.replace(year=cursor_month.year - 1, month=12)
            else:
                cursor_month = cursor_month.replace(month=cursor_month.month - 1)
        month_boundaries.reverse()
        growth_counts = await asyncio.gather(*[
            db.users.count_documents({**res_filter, "created_at": {"$lt": b.isoformat()}})
            for b in month_boundaries
        ])
        resident_growth = [{"label": b.strftime("%b"), "value": cnt} for b, cnt in zip(month_boundaries, growth_counts)]

        # Maintenance trend — last 4 weeks (4 counts in parallel)
        week_ranges = []
        for i in range(4, 0, -1):
            wk_start = now - timedelta(days=i * 7)
            wk_end = now - timedelta(days=(i - 1) * 7)
            week_ranges.append((wk_start, wk_end))
        week_counts = await asyncio.gather(*[
            db.maintenance_requests.count_documents({**maint_filter, "created_at": {"$gte": ws.isoformat(), "$lt": we.isoformat()}})
            for ws, we in week_ranges
        ])
        maintenance_trend = [{"label": f"Week {i+1}", "value": c} for i, c in enumerate(week_counts)]

        # Revenue trend — last 4 months (using calendar boundaries, aggregations in parallel)
        rev_months = []
        cursor_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        for _ in range(4):
            rev_months.append(cursor_month)
            if cursor_month.month == 1:
                cursor_month = cursor_month.replace(year=cursor_month.year - 1, month=12)
            else:
                cursor_month = cursor_month.replace(month=cursor_month.month - 1)
        rev_months.reverse()
        rev_ranges = []
        for i, m_start in enumerate(rev_months):
            if i + 1 < len(rev_months):
                m_end = rev_months[i + 1]
            else:
                if m_start.month == 12:
                    m_end = m_start.replace(year=m_start.year + 1, month=1)
                else:
                    m_end = m_start.replace(month=m_start.month + 1)
            rev_ranges.append((m_start, m_end))
        rev_sums = await asyncio.gather(*[
            _sum_payments({"created_at": {"$gte": ms.isoformat(), "$lt": me.isoformat()}})
            for ms, me in rev_ranges
        ])
        revenue_trend = [{"label": m.strftime("%b"), "value": round(v, 2)} for (m, _), v in zip(rev_ranges, rev_sums)]

        # Monthly Revenue vs Expenses — last 6 months (was 18 sequential queries, now 1 expense scan + 12 parallel sums)
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
        comp_ranges = []
        for i, m_start in enumerate(comp_months):
            if i + 1 < len(comp_months):
                m_end = comp_months[i + 1]
            else:
                if m_start.month == 12:
                    m_end = m_start.replace(year=m_start.year + 1, month=1)
                else:
                    m_end = m_start.replace(month=m_start.month + 1)
            comp_ranges.append((m_start, m_end))

        async def _sum_revenue_collection(match_extra):
            pipeline = [
                {"$match": {**scope, **match_extra}},
                {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
            ]
            cur = await db.revenue.aggregate(pipeline).to_list(1)
            return float(cur[0]["total"]) if cur else 0.0

        # Build all 12 sum tasks (6 months × 2 sources) and run concurrently
        rev_tasks = []
        for ms, me in comp_ranges:
            rev_tasks.append(_sum_revenue_collection({"date": {"$gte": ms.isoformat(), "$lt": me.isoformat()}}))
            rev_tasks.append(_sum_payments({"created_at": {"$gte": ms.isoformat(), "$lt": me.isoformat()}}))
        comp_rev_results = await asyncio.gather(*rev_tasks)
        # Reuse expense_docs (already loaded) to bucket per month
        monthly_comparison = []
        for i, (m_start, m_end) in enumerate(comp_ranges):
            m_start_iso = m_start.isoformat()
            m_end_iso = m_end.isoformat()
            rev_amt = comp_rev_results[i * 2] + comp_rev_results[i * 2 + 1]
            exp_amt = 0.0
            for e in expense_docs:
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

        # Action code → Arabic label translator
        ACTION_AR = {
            "add_family_member": "إضافة فرد عائلة",
            "remove_family_member": "حذف فرد عائلة",
            "create_user": "إنشاء حساب",
            "update_user": "تحديث حساب",
            "delete_user": "حذف حساب",
            "create_resident": "إضافة ساكن",
            "create_payment": "تسجيل دفعة",
            "update_payment": "تحديث دفعة",
            "create_invoice": "إنشاء فاتورة",
            "create_complaint": "تسجيل شكوى",
            "resolve_complaint": "حل شكوى",
            "maintenance_request": "طلب صيانة",
            "complete_maintenance": "إنجاز صيانة",
            "create_announcement": "إعلان جديد",
            "login": "تسجيل دخول",
            "logout": "تسجيل خروج",
            "create_compound": "إنشاء مجمع",
            "create_visit": "تسجيل زيارة",
            "checkin": "دخول زائر",
            "checkout": "خروج زائر",
            "upload_document": "رفع وثيقة",
            "create_booking": "حجز جديد",
            "cancel_booking": "إلغاء حجز",
        }
        def _tr(action: str) -> str:
            return ACTION_AR.get(action, action.replace("_", " "))

        # Activity trend — last 5 days (Arabic weekday names) — 5 counts in parallel
        WEEKDAY_AR = {0: 'الإثنين', 1: 'الثلاثاء', 2: 'الأربعاء', 3: 'الخميس', 4: 'الجمعة', 5: 'السبت', 6: 'الأحد'}
        day_ranges = []
        for i in range(4, -1, -1):
            d_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            d_end = d_start + timedelta(days=1)
            day_ranges.append((d_start, d_end))
        try:
            day_counts = await asyncio.gather(*[
                db.activity_logs.count_documents({**scope, "timestamp": {"$gte": ds.isoformat(), "$lt": de.isoformat()}})
                for ds, de in day_ranges
            ], return_exceptions=True)
            day_counts = [c if isinstance(c, int) else 0 for c in day_counts]
        except Exception:
            day_counts = [0] * len(day_ranges)
        activity_trend = [
            {"label": WEEKDAY_AR.get(ds.weekday(), ds.strftime("%a")), "value": c}
            for (ds, _), c in zip(day_ranges, day_counts)
        ]

        # Recent activity (5 latest, prefer activity_logs, fallback audit_logs)
        recent_activity = []
        try:
            cursor = db.activity_logs.find(scope, {"_id": 0}).sort("timestamp", -1).limit(5)
            async for a in cursor:
                recent_activity.append({
                    "title": _tr(a.get("action", "نشاط")),
                    "description": a.get("description") or a.get("details", ""),
                    "timestamp": a.get("timestamp"),
                })
        except Exception:
            pass
        if not recent_activity:
            cursor = db.audit_logs.find(scope, {"_id": 0}).sort("timestamp", -1).limit(5)
            async for a in cursor:
                recent_activity.append({
                    "title": _tr(a.get("action", "نشاط")),
                    "description": f"{a.get('user_name','—')} • {a.get('target_type','')}",
                    "timestamp": a.get("timestamp"),
                })

        # Summary copy (data-driven, Arabic)
        achievements = []
        if _delta(new_now, new_prev) > 0:
            achievements.append(f"زيادة {_delta(new_now, new_prev)}٪ في تسجيلات السكان الجدد")
        if collection_rate >= 80:
            achievements.append(f"تحقيق نسبة تحصيل {collection_rate}٪ للمدفوعات")
        if engagement_rate >= 50:
            achievements.append(f"الحفاظ على معدل تفاعل {engagement_rate}٪ من المستخدمين")
        if not achievements:
            achievements = ["بناء خط أساس النشاط — أول فترة تقارير"]

        improvements = []
        if pending_maint > 0:
            improvements.append(f"{pending_maint} طلب صيانة قيد الانتظار")
        if collection_rate < 80 and total_charges > 0:
            improvements.append(f"معدل التحصيل {collection_rate}٪ — يحتاج متابعة")
        if not improvements:
            improvements = ["لا توجد فجوات تشغيلية حرجة"]

        recommendations = []
        if pending_maint > 5:
            recommendations.append("قلّل تراكم طلبات الصيانة — فكّر بإضافة مزودي خدمة")
        if engagement_rate < 50:
            recommendations.append("شغّل حملات تفاعل لتنشيط السكان غير النشطين")
        if collection_rate < 90 and total_charges > 0:
            recommendations.append("أرسل تذكيرات دفع للمستحقات المتأخرة")
        if not recommendations:
            recommendations = ["العمليات صحية — استمر بمتابعة KPIs أسبوعياً"]

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


@router.get("/analytics/export")
async def export_analytics(
    date_range: str = "last_30_days",
    compound_id: Optional[str] = None,
    format: str = "csv",
    current_user: dict = Depends(require_admin),
):
    """Export the analytics dashboard data as CSV or JSON.
    Reuses the same aggregation logic as `/analytics/dashboard`."""
    from fastapi.responses import Response
    import csv
    import io

    data = await get_analytics_dashboard(
        date_range=date_range,
        compound_id=compound_id,
        time_range=None,
        current_user=current_user,
    )

    if format.lower() == "json":
        import json as _json
        return Response(
            content=_json.dumps(data, ensure_ascii=False, default=str, indent=2),
            media_type="application/json; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="analytics_{date_range}.json"'},
        )

    # CSV: flatten overview + key metrics + expenses by category + monthly comparison
    buf = io.StringIO()
    # BOM so Excel opens Arabic correctly
    buf.write("\ufeff")
    writer = csv.writer(buf)

    overview = data.get("overview", {}) if isinstance(data, dict) else {}
    charts = data.get("charts", {}) if isinstance(data, dict) else {}
    expenses = data.get("expenses", {}) if isinstance(data, dict) else {}

    writer.writerow(["القسم", "المقياس", "القيمة"])
    # Overview
    for k, v in overview.items():
        if isinstance(v, (str, int, float)):
            writer.writerow(["نظرة عامة", k, v])

    # Expenses
    writer.writerow([])
    writer.writerow(["المصروفات", "إجمالي", expenses.get("total", 0)])
    writer.writerow(["المصروفات", "معدل النمو", expenses.get("growth_rate", 0)])
    writer.writerow(["المصروفات", "صافي الرصيد", expenses.get("net_balance", 0)])
    for cat, val in (expenses.get("by_category") or {}).items():
        writer.writerow(["المصروفات حسب الفئة", cat, val])

    # Monthly comparison
    writer.writerow([])
    writer.writerow(["الشهر", "إيرادات", "مصروفات", "صافي"])
    for row in charts.get("monthly_comparison", []) or []:
        writer.writerow([
            row.get("label", ""),
            row.get("revenue", 0),
            row.get("expenses", 0),
            row.get("net", 0),
        ])

    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="analytics_{date_range}.csv"'},
    )

# ============ PHASE 3: DOCUMENT MANAGEMENT ENDPOINTS ============

# documents routes extracted to routes/documents.py

# polls routes extracted to routes/polls.py

# smart_devices routes extracted to routes/smart_devices.py

# newsletters routes extracted to routes/newsletters.py

# companies routes extracted to routes/companies.py

