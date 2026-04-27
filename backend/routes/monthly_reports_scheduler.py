"""
Monthly PDF reports auto-scheduler.

- Runs once a day at 02:00 UTC.
- On the 1st day of each month, generates and emails:
  * For every compound: "Compound Summary" PDF → admin + app_owner (mailbox=main)
  * For every active resident: "Unit Statement" PDF → resident's email (mailbox=main)
- Idempotent via `report_runs` collection: each (kind, target_id, month) processed at most once.
- Provides on-demand trigger endpoint POST /api/reports/run-monthly-now (admin only).
"""
import asyncio
import logging
import calendar
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel

from database import get_db
from auth_deps import get_current_user
from email_service import EmailService
from services.pdf_report_service import (
    render_unit_statement,
    render_summary_report,
)
from services.branding import get_compound_branding
from routes.email_templates import get_template_or_default, render_template

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reports")


def _previous_month_label(now: datetime) -> str:
    first_of_this = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_of_prev = first_of_this - timedelta(seconds=1)
    return f"{last_of_prev.year}-{last_of_prev.month:02d}"


def _month_bounds(label: str):
    y, m = [int(x) for x in label.split("-")]
    last_day = calendar.monthrange(y, m)[1]
    start = datetime(y, m, 1, tzinfo=timezone.utc)
    end = datetime(y, m, last_day, 23, 59, 59, tzinfo=timezone.utc)
    return start, end


async def _already_sent(db, kind: str, target_id: str, month: str) -> bool:
    return await db.report_runs.find_one({"kind": kind, "target_id": target_id, "month": month}) is not None


async def _mark_sent(db, kind: str, target_id: str, month: str, ok: bool, info: str = ""):
    await db.report_runs.insert_one({
        "kind": kind,
        "target_id": target_id,
        "month": month,
        "ok": ok,
        "info": info[:500],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def _build_unit_statement(db, user: dict, label: str, compound_name: str, branding: dict | None = None) -> bytes:
    start, end = _month_bounds(label)
    charges = []
    async for c in db.resident_charges.find({
        "resident_id": user["id"],
        "$or": [
            {"due_date": {"$gte": start.strftime("%Y-%m-01"), "$lte": end.strftime("%Y-%m-%d")}},
            {"created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}},
        ],
    }):
        charges.append({
            "description": c.get("description"),
            "charge_type": c.get("charge_type"),
            "due_date": c.get("due_date"),
            "amount": c.get("amount", 0),
            "status": c.get("status", "pending"),
        })
    payments = []
    async for p in db.resident_payments.find({
        "resident_id": user["id"],
        "$or": [
            {"payment_date": {"$gte": start.strftime("%Y-%m-01"), "$lte": end.strftime("%Y-%m-%d")}},
            {"created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}},
        ],
    }):
        payments.append({
            "reference": p.get("reference") or (p.get("id", "")[:8]),
            "payment_method": p.get("payment_method"),
            "payment_date": p.get("payment_date"),
            "amount": p.get("amount", 0),
        })
    return render_unit_statement(
        compound_name=compound_name,
        resident_name=user.get("full_name") or user.get("username", "—"),
        unit_number=user.get("unit_number") or "—",
        period=label,
        charges=charges,
        payments=payments,
        currency="EGP",
        branding=branding,
    )


async def _build_summary(db, compound: dict, label: str) -> bytes:
    start, end = _month_bounds(label)
    start_iso, end_iso = start.isoformat(), end.isoformat()
    cid = compound["id"]

    residents = await db.users.find({"compound_id": cid, "role": "resident"}, {"_id": 0, "unit_number": 1}).to_list(length=20000)
    units = {r.get("unit_number") for r in residents if r.get("unit_number")}
    total_units = compound.get("total_units") or len(units)
    occupied = len(units)
    vacant = max(total_units - occupied, 0)
    occupancy = {
        "total_units": total_units,
        "occupied_units": occupied,
        "vacant_units": vacant,
        "occupancy_rate": (occupied / total_units * 100) if total_units else 0,
    }

    revenue_total = 0.0
    async for p in db.resident_payments.find({
        "compound_id": cid,
        "$or": [
            {"payment_date": {"$gte": start.strftime("%Y-%m-01"), "$lte": end.strftime("%Y-%m-%d")}},
            {"created_at": {"$gte": start_iso, "$lte": end_iso}},
        ],
    }):
        revenue_total += p.get("amount", 0) or 0

    expenses_total = 0.0
    async for e in db.expenses.find({
        "compound_id": cid,
        "date": {"$gte": start_iso, "$lte": end_iso},
    }):
        expenses_total += e.get("amount", 0) or 0

    outstanding = 0.0
    async for c in db.resident_charges.find({
        "compound_id": cid,
        "status": {"$in": ["pending", "overdue"]},
    }):
        outstanding += c.get("amount", 0) or 0

    finance = {
        "total_revenue": revenue_total,
        "total_expenses": expenses_total,
        "net_profit": revenue_total - expenses_total,
        "outstanding": outstanding,
    }
    operations = {
        "maintenance_requests": await db.maintenance_requests.count_documents({"compound_id": cid, "created_at": {"$gte": start_iso, "$lte": end_iso}}),
        "complaints": await db.complaints.count_documents({"compound_id": cid, "created_at": {"$gte": start_iso, "$lte": end_iso}}),
        "facility_bookings": await db.service_bookings.count_documents({"compound_id": cid, "created_at": {"$gte": start, "$lte": end}}),
        "visitor_passes": await db.visitor_passes.count_documents({"compound_id": cid}),
    }
    return render_summary_report(
        compound_name=compound.get("name", "—"),
        period=label,
        occupancy=occupancy,
        finance=finance,
        operations=operations,
        currency="EGP",
        branding=get_compound_branding(compound),
    )


def _email_html(title: str, body: str) -> str:
    return f"""
    <html><body style="font-family:'Segoe UI',Tahoma,sans-serif;background:#f3f4f6;padding:24px;">
      <div style="max-width:560px;margin:auto;background:white;border-radius:14px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.06);" dir="rtl">
        <h2 style="color:#4338ca;margin:0 0 12px;">HomeMe — {title}</h2>
        <div style="color:#374151;line-height:1.7;">{body}</div>
        <p style="color:#9ca3af;font-size:12px;margin-top:18px;">© HomeMe 2026 — تم إرسال هذا التقرير تلقائياً. التقرير مرفق بصيغة PDF.</p>
      </div>
    </body></html>
    """


async def run_monthly_reports(month_label: str = None) -> dict:
    """Generate and email the monthly statements + compound summaries.
    If month_label is None, uses the previous calendar month."""
    db = get_db()
    if month_label is None:
        month_label = _previous_month_label(datetime.now(timezone.utc))

    email_svc = EmailService()
    stats = {"month": month_label, "summaries_sent": 0, "statements_sent": 0, "skipped": 0, "failed": 0}

    # 1) Compound summaries → admins + app_owners
    async for compound in db.compounds.find({}):
        cid = compound.get("id")
        if not cid:
            continue
        if await _already_sent(db, "summary", cid, month_label):
            stats["skipped"] += 1
            continue
        try:
            pdf_bytes = await _build_summary(db, compound, month_label)
            recipients = set()
            async for u in db.users.find({"compound_id": cid, "role": {"$in": ["admin", "compound_admin"]}, "is_active": True}, {"email": 1}):
                if u.get("email"):
                    recipients.add(u["email"])
            async for u in db.users.find({"role": {"$in": ["app_owner", "super_admin"]}, "is_active": True}, {"email": 1}):
                if u.get("email"):
                    recipients.add(u["email"])
            if not recipients:
                await _mark_sent(db, "summary", cid, month_label, False, "no recipients")
                continue
            html = _email_html("التقرير الشهري للمجمع", f"يسعدنا إرسال <strong>التقرير الشامل لشهر {month_label}</strong> الخاص بمجمع <strong>{compound.get('name','—')}</strong>.")
            tpl = await get_template_or_default("monthly_summary")
            rendered = render_template(tpl, {"compound_name": compound.get("name","—"), "period": month_label})
            html = _email_html("التقرير الشهري للمجمع", rendered["html"])
            for to in recipients:
                ok = await email_svc.send_email(
                    to_email=to,
                    subject=rendered["subject"],
                    html_content=html,
                    attachments=[{"filename": f"summary-{cid[:8]}-{month_label}.pdf", "content": pdf_bytes, "mime_type": "application/pdf"}],
                )
                if ok:
                    stats["summaries_sent"] += 1
                else:
                    stats["failed"] += 1
            await _mark_sent(db, "summary", cid, month_label, True, f"recipients={len(recipients)}")
        except Exception as e:
            logger.exception(f"summary failed for compound {cid}: {e}")
            stats["failed"] += 1
            await _mark_sent(db, "summary", cid, month_label, False, str(e))

    # 2) Unit statements → each resident
    async for user in db.users.find({"role": "resident", "is_active": True, "email": {"$exists": True, "$nin": [None, ""]}}):
        uid = user.get("id")
        if not uid:
            continue
        if await _already_sent(db, "statement", uid, month_label):
            stats["skipped"] += 1
            continue
        try:
            compound = await db.compounds.find_one({"id": user.get("compound_id")}, {"_id": 0}) if user.get("compound_id") else None
            compound_name = compound.get("name") if compound else "—"
            branding = get_compound_branding(compound)
            pdf_bytes = await _build_unit_statement(db, user, month_label, compound_name, branding)
            tpl = await get_template_or_default("monthly_statement")
            rendered = render_template(tpl, {
                "resident_name": user.get("full_name") or user.get("username", "—"),
                "unit_number": user.get("unit_number") or "—",
                "period": month_label,
                "compound_name": compound_name,
            })
            html = _email_html("كشف حساب وحدتك", rendered["html"])
            ok = await email_svc.send_email(
                to_email=user["email"],
                subject=rendered["subject"],
                html_content=html,
                attachments=[{"filename": f"statement-{user.get('unit_number','unit')}-{month_label}.pdf", "content": pdf_bytes, "mime_type": "application/pdf"}],
            )
            if ok:
                stats["statements_sent"] += 1
            else:
                stats["failed"] += 1
            await _mark_sent(db, "statement", uid, month_label, ok, "")
        except Exception as e:
            logger.exception(f"statement failed for user {uid}: {e}")
            stats["failed"] += 1
            await _mark_sent(db, "statement", uid, month_label, False, str(e))

    logger.info(f"monthly reports run complete: {stats}")
    return stats


async def monthly_reports_loop():
    """Background loop — sleeps until 02:00 UTC, then runs only on the 1st of the month."""
    while True:
        try:
            now = datetime.now(timezone.utc)
            target = now.replace(hour=2, minute=0, second=0, microsecond=0)
            if target <= now:
                target += timedelta(days=1)
            await asyncio.sleep((target - now).total_seconds())
            today = datetime.now(timezone.utc)
            if today.day == 1:
                logger.info("Monthly reports scheduler: triggering run")
                try:
                    await run_monthly_reports()
                except Exception as e:
                    logger.exception(f"monthly_reports_loop run failed: {e}")
        except Exception as e:
            logger.exception(f"monthly_reports_loop error: {e}")
            await asyncio.sleep(3600)


# --- On-demand trigger ---
class RunMonthlyReq(BaseModel):
    month: str | None = None  # YYYY-MM; defaults to previous month


@router.post("/run-monthly-now")
async def run_monthly_now(
    payload: RunMonthlyReq,
    background: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ("app_owner", "super_admin", "admin", "compound_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    month = payload.month
    if month:
        try:
            datetime.strptime(month, "%Y-%m")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")
    background.add_task(_run_and_log, month)
    return {"queued": True, "month": month or "previous-month"}


async def _run_and_log(month: str | None):
    try:
        stats = await run_monthly_reports(month)
        logger.info(f"on-demand monthly run: {stats}")
    except Exception as e:
        logger.exception(f"on-demand monthly run failed: {e}")


@router.get("/scheduler/status")
async def scheduler_status(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("app_owner", "super_admin", "admin", "compound_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    db = get_db()
    runs = await db.report_runs.find({}, {"_id": 0}).sort("created_at", -1).limit(40).to_list(length=40)

    # Aggregate analytics
    total = await db.report_runs.count_documents({})
    success = await db.report_runs.count_documents({"ok": True})
    failed = total - success
    by_kind = {}
    for kind in ("summary", "statement"):
        t = await db.report_runs.count_documents({"kind": kind})
        s = await db.report_runs.count_documents({"kind": kind, "ok": True})
        by_kind[kind] = {"total": t, "success": s, "failed": t - s, "rate": round((s / t) if t else 1.0, 4)}

    # Last 6 months trend
    months_pipeline = [
        {"$group": {"_id": "$month", "total": {"$sum": 1}, "success": {"$sum": {"$cond": ["$ok", 1, 0]}}}},
        {"$sort": {"_id": -1}},
        {"$limit": 6},
    ]
    monthly = []
    async for m in db.report_runs.aggregate(months_pipeline):
        monthly.append({"month": m["_id"], "total": m["total"], "success": m["success"], "failed": m["total"] - m["success"]})
    monthly.reverse()

    return {
        "total_runs": total,
        "success_runs": success,
        "failed_runs": failed,
        "success_rate": round((success / total) if total else 1.0, 4),
        "last_run_at": runs[0]["created_at"] if runs else None,
        "by_kind": by_kind,
        "monthly_trend": monthly,
        "recent": runs,
    }
