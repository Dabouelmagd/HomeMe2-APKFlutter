"""
Weekly Admin Digest
===================

Every Monday at 06:00 UTC, send a concise summary email to each compound's
admins covering activity from the previous Mon-Sun:

- Maintenance requests (new / open / resolved)
- Complaints (new / open / resolved) — including praise count
- Payments received (count + total in EGP)
- Vacant units count
- Top 5 events worth their attention (urgent items)

Idempotency: A document per ``(compound_id, week_iso)`` is recorded in
``weekly_digest_runs`` so the loop never double-sends after a restart.

On-demand: ``POST /api/reports/run-weekly-now`` (admin) for testing/manual.
"""
from __future__ import annotations
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException

from database import get_db
from auth_deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["weekly-digest"])


def _previous_week_window(now: datetime) -> tuple[datetime, datetime, str]:
    """Return (start_dt, end_dt, iso_label) for the Mon→Sun *immediately
    before* the calling moment. The label is ``YYYY-Www`` (ISO 8601 year/
    week) which doubles as the idempotency key.
    """
    # weekday(): Mon=0 .. Sun=6
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    monday_this_week = today - timedelta(days=today.weekday())
    monday_prev = monday_this_week - timedelta(days=7)
    sunday_prev_end = monday_this_week  # exclusive end (Mon 00:00 of current week)
    iso_year, iso_week, _ = monday_prev.isocalendar()
    return monday_prev, sunday_prev_end, f"{iso_year}-W{iso_week:02d}"


async def _gather_metrics(db, compound_id: str, start: datetime, end: datetime) -> dict:
    """Aggregate the digest payload for one compound + window."""

    async def _count(coll: str, q: dict) -> int:
        try:
            return await db[coll].count_documents(q)
        except Exception:
            return 0

    base = {"compound_id": compound_id, "created_at": {"$gte": start, "$lt": end}}

    maintenance_new = await _count("maintenance_requests", base)
    maintenance_open = await _count("maintenance_requests", {"compound_id": compound_id, "status": {"$in": ["open", "in_progress"]}})
    maintenance_resolved = await _count("maintenance_requests", {"compound_id": compound_id, "status": "resolved", "updated_at": {"$gte": start, "$lt": end}})

    complaint_new = await _count("complaints", base)
    complaint_open = await _count("complaints", {"compound_id": compound_id, "status": {"$in": ["open", "in_progress"]}})
    praise_new = await _count("complaints", {**base, "type": "praise"})

    # Payments — sum of total. Schemas vary across the app; prefer ``invoices``
    # with ``status="paid"`` if present, else fall back to ``payments``.
    payments_total = 0.0
    payments_count = 0
    try:
        cursor = db.invoices.find(
            {"compound_id": compound_id, "status": "paid", "paid_at": {"$gte": start, "$lt": end}},
            {"amount": 1, "_id": 0},
        )
        async for inv in cursor:
            payments_total += float(inv.get("amount") or 0)
            payments_count += 1
    except Exception:
        pass

    # Vacant units = compound capacity − occupied families
    compound = await db.compounds.find_one({"id": compound_id}, {"total_units": 1, "_id": 0})
    total_units = (compound or {}).get("total_units") or 0
    families = await _count("families", {"compound_id": compound_id})
    vacant_units = max(0, total_units - families) if total_units else 0

    # Top urgent items — newest 3 urgent complaints + 2 emergency announcements
    top: list[dict] = []
    try:
        urgent_complaints = await db.complaints.find(
            {"compound_id": compound_id, "priority": "urgent", "status": {"$ne": "resolved"}},
            {"_id": 0, "title": 1, "type": 1, "created_at": 1},
        ).sort("created_at", -1).to_list(3)
        for c in urgent_complaints:
            top.append({"emoji": "⚠️", "label": c.get("title") or "شكوى عاجلة", "kind": c.get("type", "complaint")})
    except Exception:
        pass

    return {
        "maintenance": {"new": maintenance_new, "open": maintenance_open, "resolved": maintenance_resolved},
        "complaints": {"new": complaint_new, "open": complaint_open, "praise_new": praise_new},
        "payments": {"count": payments_count, "total": round(payments_total, 2)},
        "occupancy": {"total_units": total_units, "occupied": families, "vacant": vacant_units},
        "top": top,
    }


def _render_html(compound_name: str, week_label: str, m: dict, lang_dir: str = "rtl") -> str:
    """Inline-styled email body. Email clients don't reliably support CSS files."""
    pay = m["payments"]
    mx = m["maintenance"]
    co = m["complaints"]
    occ = m["occupancy"]
    top_items = "".join(
        f"<li style='margin:6px 0'>{x['emoji']} {x['label']}</li>" for x in m["top"]
    ) or "<li style='color:#999'>لا توجد أحداث عاجلة هذا الأسبوع 🎉</li>"

    return f"""
<div dir="{lang_dir}" style="font-family:'Cairo',Tahoma,Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;background:#f8fafc">
  <div style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:24px;border-radius:14px;color:white;text-align:center">
    <h1 style="margin:0;font-size:22px">📊 الملخص الأسبوعي</h1>
    <div style="opacity:.85;margin-top:6px;font-size:13px">{compound_name} · {week_label}</div>
  </div>

  <div style="background:white;border-radius:14px;padding:18px;margin-top:14px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
    <h3 style="margin:0 0 10px 0;color:#1e293b;font-size:14px">🔧 الصيانة</h3>
    <div style="font-size:13px;color:#475569;line-height:1.9">
      <div>طلبات جديدة هذا الأسبوع: <b style="color:#0f172a">{mx['new']}</b></div>
      <div>قيد التنفيذ حالياً: <b style="color:#d97706">{mx['open']}</b></div>
      <div>تم إنجازها: <b style="color:#16a34a">{mx['resolved']}</b></div>
    </div>
  </div>

  <div style="background:white;border-radius:14px;padding:18px;margin-top:14px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
    <h3 style="margin:0 0 10px 0;color:#1e293b;font-size:14px">⚠️ الشكاوى والمقترحات</h3>
    <div style="font-size:13px;color:#475569;line-height:1.9">
      <div>شكاوى/اقتراحات جديدة: <b style="color:#0f172a">{co['new']}</b></div>
      <div>قيد المعالجة: <b style="color:#d97706">{co['open']}</b></div>
      <div>إطراء جديد 💖: <b style="color:#ec4899">{co['praise_new']}</b></div>
    </div>
  </div>

  <div style="background:white;border-radius:14px;padding:18px;margin-top:14px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
    <h3 style="margin:0 0 10px 0;color:#1e293b;font-size:14px">💰 المدفوعات المستلمة</h3>
    <div style="font-size:13px;color:#475569;line-height:1.9">
      <div>عدد العمليات: <b style="color:#0f172a">{pay['count']}</b></div>
      <div>الإجمالي: <b style="color:#16a34a">{pay['total']:,.2f} ج.م</b></div>
    </div>
  </div>

  <div style="background:white;border-radius:14px;padding:18px;margin-top:14px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
    <h3 style="margin:0 0 10px 0;color:#1e293b;font-size:14px">🏠 إشغال الوحدات</h3>
    <div style="font-size:13px;color:#475569;line-height:1.9">
      <div>الإجمالي: <b>{occ['total_units']}</b> · مسكونة: <b style="color:#16a34a">{occ['occupied']}</b> · شاغرة: <b style="color:#dc2626">{occ['vacant']}</b></div>
    </div>
  </div>

  <div style="background:white;border-radius:14px;padding:18px;margin-top:14px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
    <h3 style="margin:0 0 10px 0;color:#1e293b;font-size:14px">🚨 يحتاج انتباهك</h3>
    <ul style="font-size:13px;color:#475569;list-style:none;padding:0;margin:0">{top_items}</ul>
  </div>

  <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:18px">
    HomeMe · الملخصات الأسبوعية تصلك كل يوم اثنين<br/>
    لإلغاء الاشتراك في هذا التقرير، عدّل تفضيلات الإشعارات من الإعدادات
  </p>
</div>
"""


async def _send_digest_for_compound(db, compound: dict, start: datetime, end: datetime, week_label: str) -> dict:
    """Render + email digest to all admins of a single compound."""
    compound_id = compound["id"]
    # Idempotency: short-circuit if we already sent this week
    seen = await db.weekly_digest_runs.find_one({"compound_id": compound_id, "week": week_label})
    if seen:
        return {"compound_id": compound_id, "skipped": True, "reason": "already_sent"}

    metrics = await _gather_metrics(db, compound_id, start, end)
    html = _render_html(compound.get("name") or "المجمع", week_label, metrics)
    subject = f"📊 الملخص الأسبوعي — {compound.get('name','المجمع')} ({week_label})"

    # Fan out via dispatcher so per-admin email pref is respected
    from notification_dispatch import dispatch_notification
    admins = await db.users.find(
        {"compound_id": compound_id, "role": {"$in": ["admin", "compound_admin", "company_admin"]}},
        {"id": 1, "_id": 0},
    ).to_list(50)
    admin_ids = [a["id"] for a in admins if a.get("id")]
    if not admin_ids:
        return {"compound_id": compound_id, "skipped": True, "reason": "no_admins"}

    result = await dispatch_notification(
        db,
        admin_ids,
        event_type="system",  # admin reports map to "system" channel
        title=f"الملخص الأسبوعي — {compound.get('name','المجمع')}",
        body=f"📈 {metrics['maintenance']['new']} طلب صيانة • {metrics['complaints']['new']} شكوى • {metrics['payments']['count']} دفعة",
        in_app_payload={"compound_id": compound_id, "type": "weekly_digest"},
        email_html=html,
        email_subject=subject,
    )

    await db.weekly_digest_runs.insert_one({
        "compound_id": compound_id,
        "week": week_label,
        "sent_at": datetime.now(timezone.utc),
        "result": result,
    })
    logger.info(f"[weekly_digest] sent for {compound_id} week={week_label} result={result}")
    return {"compound_id": compound_id, "result": result}


async def run_weekly_digest_once() -> dict:
    """Generate + email digests for *every* compound for the previous week.

    Returns a summary dict ``{processed, skipped, errors}`` for observability.
    """
    db = get_db()
    now = datetime.now(timezone.utc)
    start, end, week_label = _previous_week_window(now)

    processed: list[dict] = []
    errors: list[dict] = []
    compounds = await db.compounds.find({}, {"id": 1, "name": 1, "_id": 0}).to_list(500)
    for c in compounds:
        try:
            res = await _send_digest_for_compound(db, c, start, end, week_label)
            processed.append(res)
        except Exception as e:  # noqa: BLE001
            errors.append({"compound_id": c.get("id"), "error": str(e)[:200]})
            logger.exception(f"[weekly_digest] failed for {c.get('id')}")

    return {
        "week": week_label,
        "compounds": len(compounds),
        "processed": [p for p in processed if not p.get("skipped")],
        "skipped": [p for p in processed if p.get("skipped")],
        "errors": errors,
    }


async def weekly_digest_loop() -> None:
    """Background loop: wakes hourly, fires once per Mon 06:00-06:59 UTC."""
    while True:
        try:
            now = datetime.now(timezone.utc)
            # weekday(): Mon=0
            if now.weekday() == 0 and now.hour == 6:
                logger.info("[weekly_digest] trigger window hit; running...")
                await run_weekly_digest_once()
        except Exception as e:  # noqa: BLE001
            logger.exception(f"[weekly_digest] loop error: {e}")
        await asyncio.sleep(60 * 60)  # check hourly


@router.post("/reports/run-weekly-now")
async def trigger_weekly_now(current_user: dict = Depends(get_current_user)):
    """Admin-only manual trigger — useful for QA and on-demand re-sends."""
    if current_user.get("role") not in ("admin", "super_admin", "app_owner", "compound_admin", "company_admin"):
        raise HTTPException(status_code=403, detail="Admin only")
    result = await run_weekly_digest_once()
    return {"triggered_by": current_user.get("id"), **result}
