"""
AutoPilot Weekly Digest — emails admins a recap of all AutoPilot runs in the past 7 days.

Fires every Monday at 08:00 UTC (=11:00 Cairo time).
For each compound that has at least one AutoPilot config enabled, builds a digest of
runs in the past week, then emails it to all admins/managers of that compound.

Structure:
- Single async background loop, similar to ai_autopilot.autopilot_loop
- Tracks last_sent timestamp in `autopilot_digest_meta` collection (one doc per compound)
  to prevent duplicate sends if loop wakes up twice in same week
"""
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import List

from database import get_db
from email_service import email_service

logger = logging.getLogger(__name__)

INSIGHT_LABELS = {
    "late_invoices": ("💰", "تذكيرات الدفع المتأخر"),
    "old_maintenance": ("🔧", "تنبيهات الصيانة"),
    "negative_ratings": ("⭐", "رسائل اعتذار للتقييمات السلبية"),
    "open_complaints": ("📢", "تنبيهات الشكاوى المفتوحة"),
}

DIGEST_HOUR_UTC = 8  # Mondays 08:00 UTC
DIGEST_DOW = 0  # Monday


def _build_digest_html(
    compound_name: str,
    week_start: datetime,
    week_end: datetime,
    rows: List[dict],
    totals: dict,
) -> str:
    """RTL Arabic digest email body."""
    rows_html = ""
    if rows:
        for r in rows:
            icon, label = INSIGHT_LABELS.get(r["insight_id"], ("📨", r["insight_id"]))
            try:
                when = datetime.fromisoformat(r["triggered_at"]).strftime("%Y-%m-%d %H:%M")
            except Exception:
                when = r.get("triggered_at", "")
            sent = r.get("sent", 0)
            failed = r.get("failed", 0)
            rec = r.get("recipient_count", 0)
            status_color = "#10b981" if r.get("status") == "success" else "#9ca3af"
            rows_html += f"""
            <tr>
              <td style="padding:10px 14px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">{when}</td>
              <td style="padding:10px 14px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">{icon} {label}</td>
              <td style="padding:10px 14px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;text-align:center;">{rec}</td>
              <td style="padding:10px 14px;font-size:13px;color:{status_color};font-weight:700;border-bottom:1px solid #f3f4f6;text-align:center;">✓ {sent}{f' / -{failed}' if failed else ''}</td>
            </tr>"""
    else:
        rows_html = """
        <tr><td colspan="4" style="padding:30px;text-align:center;color:#9ca3af;font-size:14px;">
          لا توجد عمليات تلقائية هذا الأسبوع.
        </td></tr>"""

    totals_block = ""
    for iid, (icon, label) in INSIGHT_LABELS.items():
        sent = totals.get(iid, 0)
        if sent > 0:
            totals_block += f"""
            <td style="padding:14px;text-align:center;background:#fff;border-radius:10px;width:33%;">
              <div style="font-size:20px;">{icon}</div>
              <div style="font-size:24px;font-weight:800;color:#6366f1;margin:4px 0;">{sent}</div>
              <div style="font-size:11px;color:#6b7280;">{label}</div>
            </td>
            <td style="width:8px;"></td>"""

    if not totals_block:
        totals_block = """
        <td colspan="3" style="padding:24px;text-align:center;color:#9ca3af;font-size:13px;background:#fff;border-radius:10px;">
          لا توجد إحصائيات للأسبوع
        </td>"""

    range_str = f"{week_start.strftime('%Y-%m-%d')} → {week_end.strftime('%Y-%m-%d')}"
    return f"""<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="650" cellpadding="0" cellspacing="0" style="max-width:650px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#d946ef 100%);padding:28px;text-align:center;color:#fff;">
          <h1 style="margin:0;font-size:22px;font-weight:800;">🤖 ملخص AutoPilot الأسبوعي</h1>
          <p style="margin:8px 0 0;font-size:13px;opacity:.92;">{compound_name} · {range_str}</p>
        </td></tr>

        <!-- Summary Stats -->
        <tr><td style="padding:24px 28px 8px;">
          <p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.7;">
            مرحباً 👋 ها هو ملخص الإجراءات التلقائية اللي قام بها AutoPilot نيابة عنك خلال الأسبوع الماضي:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:8px;">
            <tr>{totals_block}</tr>
          </table>
        </td></tr>

        <!-- Detailed Table -->
        <tr><td style="padding:8px 28px 24px;">
          <h2 style="margin:18px 0 10px;color:#1f2937;font-size:14px;font-weight:700;">📋 تفاصيل العمليات ({len(rows)})</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead style="background:#f9fafb;">
              <tr>
                <th style="padding:10px 14px;font-size:11px;color:#6b7280;text-align:right;font-weight:700;">الوقت</th>
                <th style="padding:10px 14px;font-size:11px;color:#6b7280;text-align:right;font-weight:700;">النوع</th>
                <th style="padding:10px 14px;font-size:11px;color:#6b7280;text-align:center;font-weight:700;">المستلمين</th>
                <th style="padding:10px 14px;font-size:11px;color:#6b7280;text-align:center;font-weight:700;">تم الإرسال</th>
              </tr>
            </thead>
            <tbody>{rows_html}</tbody>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 28px 28px;text-align:center;">
          <p style="margin:0 0 10px;color:#6b7280;font-size:12px;">يمكنك إيقاف أو تعديل AutoPilot في أي وقت من الإعدادات</p>
          <a href="https://homemeapp.net/app/ai-autopilot" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:11px 28px;border-radius:10px;font-weight:700;font-size:13px;">
            🤖 إدارة AutoPilot
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:16px 28px;text-align:center;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:11px;">
          هذا البريد يُرسل تلقائياً كل يوم اثنين. للإلغاء، عطّل AutoPilot من الإعدادات.<br>
          HomeMe — منصة إدارة المجمعات السكنية الذكية
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


async def _send_compound_digest(db, compound_id: str):
    now = datetime.now(timezone.utc)
    week_end = now
    week_start = now - timedelta(days=7)

    # Compound info
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0, "name": 1})
    if not compound:
        return
    compound_name = compound.get("name", "المجمع")

    # Collect runs in last 7 days
    runs = await db.ai_autopilot_runs.find(
        {
            "compound_id": compound_id,
            "triggered_at": {"$gte": week_start.isoformat()},
        },
        {"_id": 0},
    ).sort("triggered_at", -1).to_list(length=200)

    # Totals by insight_id (sum of "sent")
    totals = {}
    for r in runs:
        iid = r.get("insight_id")
        if iid:
            totals[iid] = totals.get(iid, 0) + (r.get("sent") or 0)

    # Recipients = admins & managers of this compound with email
    admins = await db.users.find(
        {"compound_id": compound_id, "role": {"$in": ["admin", "manager"]}, "is_active": True},
        {"_id": 0, "email": 1, "full_name": 1},
    ).to_list(length=50)
    targets = [a["email"] for a in admins if a.get("email")]
    if not targets:
        logger.info(f"[digest] compound {compound_id} has no admin email — skipping")
        return

    html = _build_digest_html(compound_name, week_start, week_end, runs, totals)
    subject = f"🤖 ملخص AutoPilot الأسبوعي — {compound_name}"

    sent = 0
    for to in targets:
        try:
            ok = await email_service.send_email(to, subject, html)
            if ok:
                sent += 1
        except Exception as e:
            logger.error(f"[digest] send to {to} failed: {e}")

    # Persist last_sent
    await db.autopilot_digest_meta.update_one(
        {"_id": compound_id},
        {"$set": {
            "compound_id": compound_id,
            "last_sent_at": now.isoformat(),
            "last_sent_count": sent,
            "last_runs": len(runs),
        }},
        upsert=True,
    )
    logger.info(f"[digest] compound={compound_id} runs={len(runs)} sent_to={sent}")


async def autopilot_digest_loop(check_interval_seconds: int = 1800):
    """
    Wakes every 30 min. On Monday 08:00 UTC (±30 min window), sends digest to every
    compound that has at least one enabled config and hasn't received the digest this week.
    """
    while True:
        try:
            now = datetime.now(timezone.utc)
            if now.weekday() == DIGEST_DOW and now.hour == DIGEST_HOUR_UTC:
                db = get_db()
                # Find every compound with at least one enabled config
                cursor = db.ai_autopilot_configs.find({"enabled": True}, {"_id": 0, "compound_id": 1})
                seen = set()
                async for cfg in cursor:
                    cid = cfg.get("compound_id")
                    if not cid or cid in seen:
                        continue
                    seen.add(cid)
                    # Throttle: skip if already sent this week
                    meta = await db.autopilot_digest_meta.find_one({"_id": cid})
                    if meta and meta.get("last_sent_at"):
                        try:
                            last = datetime.fromisoformat(meta["last_sent_at"])
                            week_start = now - timedelta(days=now.weekday())
                            if last >= week_start.replace(hour=0, minute=0, second=0, microsecond=0):
                                continue
                        except Exception:
                            pass
                    try:
                        await _send_compound_digest(db, cid)
                    except Exception as e:
                        logger.exception(f"[digest] compound {cid} failed: {e}")
        except Exception as e:
            logger.exception(f"[digest] loop iteration failed: {e}")
        await asyncio.sleep(check_interval_seconds)


# Manual trigger (used by routes/ai_autopilot.py /digest/preview endpoint)
async def send_digest_now(compound_id: str):
    db = get_db()
    await _send_compound_digest(db, compound_id)
