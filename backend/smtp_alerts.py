"""
Background loop: every hour, check SMTP failure rate over last `WINDOW_HOURS`
and email all app_owners if it exceeds threshold and we haven't alerted recently.

Config (env vars, optional):
  SMTP_ALERT_THRESHOLD       default 0.30
  SMTP_ALERT_WINDOW_HOURS    default 6
  SMTP_ALERT_MIN_TOTAL       default 5
  SMTP_ALERT_COOLDOWN_HOURS  default 12
"""
import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta

from database import get_db
from email_service import EmailService

logger = logging.getLogger(__name__)


def _cfg():
    return {
        "threshold": float(os.environ.get("SMTP_ALERT_THRESHOLD", "0.30")),
        "window_hours": int(os.environ.get("SMTP_ALERT_WINDOW_HOURS", "6")),
        "min_total": int(os.environ.get("SMTP_ALERT_MIN_TOTAL", "5")),
        "cooldown_hours": int(os.environ.get("SMTP_ALERT_COOLDOWN_HOURS", "12")),
    }


async def _maybe_alert():
    """Check current SMTP health and dispatch alert email if threshold breached."""
    db = get_db()
    if db is None:
        return
    cfg = _cfg()
    since = (datetime.now(timezone.utc) - timedelta(hours=cfg["window_hours"])).isoformat()

    total = await db.smtp_health.count_documents({"timestamp": {"$gte": since}})
    if total < cfg["min_total"]:
        return  # not enough data
    success = await db.smtp_health.count_documents({"timestamp": {"$gte": since}, "success": True})
    failed = total - success
    fail_rate = (failed / total) if total else 0.0
    if fail_rate <= cfg["threshold"]:
        return

    # Cooldown check
    cooldown_since = (datetime.now(timezone.utc) - timedelta(hours=cfg["cooldown_hours"])).isoformat()
    last_alert = await db.smtp_alerts.find_one({"timestamp": {"$gte": cooldown_since}})
    if last_alert:
        return  # recently alerted

    # Build recipient list
    recipients = []
    async for u in db.users.find({"role": {"$in": ["app_owner", "super_admin"]}, "is_active": True, "email": {"$exists": True, "$nin": [None, ""]}}, {"email": 1, "full_name": 1, "_id": 0}):
        recipients.append(u)

    if not recipients:
        return

    # Sample failure messages
    sample_errors = []
    async for f in db.smtp_health.find({"timestamp": {"$gte": since}, "success": False}, {"_id": 0, "to_email": 1, "error": 1, "timestamp": 1, "mailbox": 1}).sort("timestamp", -1).limit(5):
        sample_errors.append(f)

    pct = round(fail_rate * 100, 1)
    threshold_pct = round(cfg["threshold"] * 100, 1)

    rows_html = "".join([
        f"<tr><td style='padding:6px;border-bottom:1px solid #eee'>{e.get('timestamp','')[:19].replace('T',' ')}</td>"
        f"<td style='padding:6px;border-bottom:1px solid #eee'>{e.get('mailbox','')}</td>"
        f"<td style='padding:6px;border-bottom:1px solid #eee'>{e.get('to_email','')}</td>"
        f"<td style='padding:6px;border-bottom:1px solid #eee;color:#b91c1c'>{(e.get('error') or '—')[:120]}</td></tr>"
        for e in sample_errors
    ])
    html = f"""
    <html><body style="font-family:'Segoe UI',Tahoma,sans-serif;background:#fef2f2;padding:24px;">
      <div style="max-width:640px;margin:auto;background:white;border-radius:14px;padding:28px;border:2px solid #ef4444;" dir="rtl">
        <h2 style="color:#b91c1c;margin:0 0 8px;">🚨 تنبيه: ارتفاع فشل إرسال SMTP</h2>
        <p style="color:#374151;line-height:1.7;">
          نسبة فشل البريد <strong>{pct}%</strong> خلال آخر <strong>{cfg['window_hours']}</strong> ساعة
          (تجاوزت العتبة <strong>{threshold_pct}%</strong>).
        </p>
        <p style="color:#374151;">
          إجمالي المحاولات: <strong>{total}</strong> &nbsp; • &nbsp;
          نجح: <strong>{success}</strong> &nbsp; • &nbsp;
          فشل: <strong style='color:#b91c1c'>{failed}</strong>
        </p>
        <h3 style="color:#374151;margin-top:18px;">عينة من الإخفاقات الأخيرة:</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead><tr style="background:#fef2f2;">
            <th style="text-align:right;padding:6px;">الوقت</th>
            <th style="text-align:right;padding:6px;">الصندوق</th>
            <th style="text-align:right;padding:6px;">المستلم</th>
            <th style="text-align:right;padding:6px;">السبب</th>
          </tr></thead>
          <tbody>{rows_html or '<tr><td colspan=4 style=padding:6px>—</td></tr>'}</tbody>
        </table>
        <p style="color:#6b7280;font-size:12px;margin-top:18px;">
          راجع لوحة <a href="/app/smtp-health" style="color:#4338ca;">صحة SMTP</a> للتحقيق التفصيلي.
        </p>
        <p style="color:#9ca3af;font-size:11px;margin-top:12px;">
          © HomeMe 2026 — تنبيه تلقائي. التنبيه التالي بعد {cfg['cooldown_hours']} ساعة على الأقل.
        </p>
      </div>
    </body></html>
    """

    svc = EmailService()
    sent_to = []
    for r in recipients:
        ok = await svc.send_email(
            to_email=r["email"],
            subject=f"🚨 HomeMe — تنبيه: فشل SMTP {pct}% آخر {cfg['window_hours']}س",
            html_content=html,
        )
        if ok:
            sent_to.append(r["email"])

    await db.smtp_alerts.insert_one({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "fail_rate": fail_rate,
        "total": total,
        "failed": failed,
        "threshold": cfg["threshold"],
        "window_hours": cfg["window_hours"],
        "recipients": [r["email"] for r in recipients],
        "delivered_to": sent_to,
    })
    logger.warning(f"SMTP alert dispatched: fail_rate={pct}% to {len(sent_to)} owner(s)")


async def smtp_alert_loop():
    """Hourly background check."""
    while True:
        try:
            await asyncio.sleep(3600)  # 1 hour
            await _maybe_alert()
        except Exception as e:
            logger.exception(f"smtp_alert_loop error: {e}")
            await asyncio.sleep(300)
