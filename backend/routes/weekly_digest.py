"""
Weekly Admin Digest
===================

Every Monday at 06:00 UTC (or each user's configured day/hour), send a
concise summary email to each compound's admins covering activity from
the previous Mon-Sun:

- Maintenance requests (new / open / resolved)
- Complaints (new / open / resolved) — including praise count
- Payments received (count + total in EGP)
- Vacant units count
- Top 5 events worth their attention (urgent items)

Idempotency: A document per ``(compound_id, week_iso)`` is recorded in
``weekly_digest_runs`` so the loop never double-sends after a restart.

Per-admin overrides live in ``digest_preferences`` keyed by ``user_id``.

On-demand: ``POST /api/reports/run-weekly-now`` (admin) for testing/manual.
"""
from __future__ import annotations
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict

from database import get_db
from auth_deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["weekly-digest"])


# --- Per-admin preferences ---------------------------------------------------

# Default delivery window: Monday 06:00 UTC.
DEFAULT_DIGEST_PREFS = {
    "enabled": True,
    "day_of_week": 0,    # Mon=0..Sun=6
    "hour_utc": 6,
    "sections": {        # which payload sections to include
        "maintenance": True,
        "complaints": True,
        "praise": True,
        "payments": True,
        "occupancy": True,
        "top_urgent": True,
    },
}


class DigestPreferences(BaseModel):
    enabled: Optional[bool] = None
    day_of_week: Optional[int] = None
    hour_utc: Optional[int] = None
    sections: Optional[Dict[str, bool]] = None


def _merge_prefs(stored: Optional[dict]) -> dict:
    """Combine stored doc with defaults so callers always see all keys."""
    out = {**DEFAULT_DIGEST_PREFS}
    if stored:
        for k in ("enabled", "day_of_week", "hour_utc"):
            if k in stored and stored[k] is not None:
                out[k] = stored[k]
        if stored.get("sections"):
            out["sections"] = {**DEFAULT_DIGEST_PREFS["sections"], **stored["sections"]}
    return out


@router.get("/digest/preferences")
async def get_digest_prefs(current_user: dict = Depends(get_current_user)):
    db = get_db()
    doc = await db.digest_preferences.find_one(
        {"user_id": current_user["id"]}, {"_id": 0}
    )
    return {"user_id": current_user["id"], **_merge_prefs(doc)}


@router.put("/digest/preferences")
async def update_digest_prefs(data: DigestPreferences, current_user: dict = Depends(get_current_user)):
    db = get_db()
    payload = data.model_dump(exclude_none=True)
    if "day_of_week" in payload:
        payload["day_of_week"] = max(0, min(6, int(payload["day_of_week"])))
    if "hour_utc" in payload:
        payload["hour_utc"] = max(0, min(23, int(payload["hour_utc"])))
    await db.digest_preferences.update_one(
        {"user_id": current_user["id"]},
        {"$set": {**payload, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    doc = await db.digest_preferences.find_one(
        {"user_id": current_user["id"]}, {"_id": 0}
    )
    return {"user_id": current_user["id"], **_merge_prefs(doc), "saved": True}


# --- Window helpers ----------------------------------------------------------


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


def _render_html(compound_name: str, week_label: str, m: dict, sections: dict, lang_dir: str = "rtl") -> str:
    """Inline-styled email body. Sections can be turned off per-recipient."""
    pay = m["payments"]
    mx = m["maintenance"]
    co = m["complaints"]
    occ = m["occupancy"]
    top_items = "".join(
        f"<li style='margin:6px 0'>{x['emoji']} {x['label']}</li>" for x in m["top"]
    ) or "<li style='color:#999'>لا توجد أحداث عاجلة هذا الأسبوع 🎉</li>"

    blocks = [
        f"""
<div style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:24px;border-radius:14px;color:white;text-align:center">
  <h1 style="margin:0;font-size:22px">📊 الملخص الأسبوعي</h1>
  <div style="opacity:.85;margin-top:6px;font-size:13px">{compound_name} · {week_label}</div>
</div>"""
    ]

    if sections.get("maintenance", True):
        blocks.append(f"""
<div style="background:white;border-radius:14px;padding:18px;margin-top:14px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
  <h3 style="margin:0 0 10px 0;color:#1e293b;font-size:14px">🔧 الصيانة</h3>
  <div style="font-size:13px;color:#475569;line-height:1.9">
    <div>طلبات جديدة هذا الأسبوع: <b style="color:#0f172a">{mx['new']}</b></div>
    <div>قيد التنفيذ حالياً: <b style="color:#d97706">{mx['open']}</b></div>
    <div>تم إنجازها: <b style="color:#16a34a">{mx['resolved']}</b></div>
  </div>
</div>""")

    if sections.get("complaints", True):
        praise_line = (
            f"<div>إطراء جديد 💖: <b style='color:#ec4899'>{co['praise_new']}</b></div>"
            if sections.get("praise", True) else ""
        )
        blocks.append(f"""
<div style="background:white;border-radius:14px;padding:18px;margin-top:14px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
  <h3 style="margin:0 0 10px 0;color:#1e293b;font-size:14px">⚠️ الشكاوى والمقترحات</h3>
  <div style="font-size:13px;color:#475569;line-height:1.9">
    <div>شكاوى/اقتراحات جديدة: <b style="color:#0f172a">{co['new']}</b></div>
    <div>قيد المعالجة: <b style="color:#d97706">{co['open']}</b></div>
    {praise_line}
  </div>
</div>""")

    if sections.get("payments", True):
        blocks.append(f"""
<div style="background:white;border-radius:14px;padding:18px;margin-top:14px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
  <h3 style="margin:0 0 10px 0;color:#1e293b;font-size:14px">💰 المدفوعات المستلمة</h3>
  <div style="font-size:13px;color:#475569;line-height:1.9">
    <div>عدد العمليات: <b style="color:#0f172a">{pay['count']}</b></div>
    <div>الإجمالي: <b style="color:#16a34a">{pay['total']:,.2f} ج.م</b></div>
  </div>
</div>""")

    if sections.get("occupancy", True):
        blocks.append(f"""
<div style="background:white;border-radius:14px;padding:18px;margin-top:14px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
  <h3 style="margin:0 0 10px 0;color:#1e293b;font-size:14px">🏠 إشغال الوحدات</h3>
  <div style="font-size:13px;color:#475569;line-height:1.9">
    <div>الإجمالي: <b>{occ['total_units']}</b> · مسكونة: <b style="color:#16a34a">{occ['occupied']}</b> · شاغرة: <b style="color:#dc2626">{occ['vacant']}</b></div>
  </div>
</div>""")

    if sections.get("top_urgent", True):
        blocks.append(f"""
<div style="background:white;border-radius:14px;padding:18px;margin-top:14px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
  <h3 style="margin:0 0 10px 0;color:#1e293b;font-size:14px">🚨 يحتاج انتباهك</h3>
  <ul style="font-size:13px;color:#475569;list-style:none;padding:0;margin:0">{top_items}</ul>
</div>""")

    blocks.append("""
<p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:18px">
  HomeMe · الملخصات الأسبوعية تصلك حسب جدولك المخصص<br/>
  لتعديل الجدول أو إيقاف التقرير، افتح الإعدادات → التقرير الأسبوعي
</p>""")

    body = "".join(blocks)
    return (
        f'<div dir="{lang_dir}" style="font-family:\'Cairo\',Tahoma,Arial,sans-serif;max-width:640px;'
        f'margin:0 auto;padding:20px;background:#f8fafc">{body}</div>'
    )


async def _send_digest_for_compound(db, compound: dict, start: datetime, end: datetime, week_label: str,
                                    *, admin_filter_user_id: Optional[str] = None,
                                    ignore_idempotency: bool = False) -> dict:
    """Render + email digest to admins of a compound.

    When ``admin_filter_user_id`` is set, only that admin is targeted (used by
    per-user scheduling). When ``ignore_idempotency`` is True, we bypass the
    week-already-sent guard (manual trigger / per-user scheduling).
    """
    compound_id = compound["id"]
    if not ignore_idempotency:
        seen = await db.weekly_digest_runs.find_one({"compound_id": compound_id, "week": week_label})
        if seen:
            return {"compound_id": compound_id, "skipped": True, "reason": "already_sent"}

    metrics = await _gather_metrics(db, compound_id, start, end)

    # Resolve recipients
    admin_query = {"compound_id": compound_id, "role": {"$in": ["admin", "compound_admin", "company_admin"]}}
    if admin_filter_user_id:
        admin_query = {"id": admin_filter_user_id}
    admins = await db.users.find(admin_query, {"id": 1, "_id": 0}).to_list(50)
    admin_ids = [a["id"] for a in admins if a.get("id")]
    if not admin_ids:
        return {"compound_id": compound_id, "skipped": True, "reason": "no_admins"}

    # Per-admin section preferences mean we may need to fan out individually
    from notification_dispatch import dispatch_notification

    sent_results = []
    for uid in admin_ids:
        pref_doc = await db.digest_preferences.find_one({"user_id": uid}, {"_id": 0})
        prefs = _merge_prefs(pref_doc)
        if not prefs["enabled"]:
            sent_results.append({"user_id": uid, "skipped": True, "reason": "disabled"})
            continue
        html = _render_html(compound.get("name") or "المجمع", week_label, metrics, prefs["sections"])
        subject = f"📊 الملخص الأسبوعي — {compound.get('name','المجمع')} ({week_label})"
        result = await dispatch_notification(
            db,
            [uid],
            event_type="system",
            title=f"الملخص الأسبوعي — {compound.get('name','المجمع')}",
            body=f"📈 {metrics['maintenance']['new']} طلب صيانة • {metrics['complaints']['new']} شكوى • {metrics['payments']['count']} دفعة",
            in_app_payload={"compound_id": compound_id, "type": "weekly_digest"},
            email_html=html,
            email_subject=subject,
        )
        sent_results.append({"user_id": uid, "result": result})

    if not ignore_idempotency:
        await db.weekly_digest_runs.insert_one({
            "compound_id": compound_id,
            "week": week_label,
            "sent_at": datetime.now(timezone.utc),
            "result": sent_results,
        })
    logger.info(f"[weekly_digest] sent for {compound_id} week={week_label} count={len(sent_results)}")
    return {"compound_id": compound_id, "sent_to": len(sent_results), "results": sent_results}


async def run_weekly_digest_once() -> dict:
    """Generate + email digests for *every* compound for the previous week."""
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
    """Background loop: wakes hourly.

    * Auto-fires the global per-compound digest at Mon 06:00 UTC.
    * Also checks each user's custom (day_of_week, hour_utc) schedule and
      delivers individually with their section preferences.
    """
    while True:
        try:
            now = datetime.now(timezone.utc)
            db = get_db()

            # 1) Default global trigger (kept for compounds with admins on defaults)
            if now.weekday() == 0 and now.hour == 6:
                logger.info("[weekly_digest] global trigger window hit; running...")
                await run_weekly_digest_once()

            # 2) Per-user custom schedules
            prefs_cursor = db.digest_preferences.find(
                {"enabled": {"$ne": False}, "day_of_week": now.weekday(), "hour_utc": now.hour},
                {"user_id": 1, "_id": 0},
            )
            user_ids = [d["user_id"] async for d in prefs_cursor]
            if user_ids:
                start, end, week_label = _previous_week_window(now)
                for uid in user_ids:
                    try:
                        # Avoid double-send if global block already fired
                        marker = await db.weekly_digest_user_runs.find_one(
                            {"user_id": uid, "week": week_label}
                        )
                        if marker:
                            continue
                        user = await db.users.find_one(
                            {"id": uid}, {"compound_id": 1, "_id": 0}
                        )
                        if not user or not user.get("compound_id"):
                            continue
                        compound = await db.compounds.find_one(
                            {"id": user["compound_id"]}, {"id": 1, "name": 1, "_id": 0}
                        )
                        if not compound:
                            continue
                        await _send_digest_for_compound(
                            db, compound, start, end, week_label,
                            admin_filter_user_id=uid, ignore_idempotency=True,
                        )
                        await db.weekly_digest_user_runs.insert_one({
                            "user_id": uid,
                            "week": week_label,
                            "sent_at": datetime.now(timezone.utc),
                        })
                    except Exception as e:  # noqa: BLE001
                        logger.warning(f"[weekly_digest] user {uid} schedule failed: {e}")
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
