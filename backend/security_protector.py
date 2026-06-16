"""Security auto-protection loop — Feature #53.

Runs every 5 minutes:
  1. Sweep `login_attempts` for IPs with 20+ failures in the last hour →
     insert into `banned_ips` (TTL 24h). The login endpoint blocks any IP
     present in this collection.
  2. If the GLOBAL failure rate exceeds 50 attempts/hour, email the app-owner
     mailbox at most once per `_ALERT_COOLDOWN_MINUTES` (idempotent via the
     `security_alerts` collection).

This module is started from `server.py` startup hooks alongside the other
background loops.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta

from database import get_db
from email_service import EmailService

logger = logging.getLogger(__name__)

# Tunables
_INTERVAL_SECONDS = 5 * 60               # sweep every 5 min
_BAN_FAILURES_THRESHOLD = 20             # per-IP threshold
_BAN_WINDOW_HOURS = 1                    # window for the per-IP threshold
_BAN_DURATION_HOURS = 24                 # how long a ban lasts
_ALERT_GLOBAL_THRESHOLD = 50             # global failures/hour to trigger email
_ALERT_COOLDOWN_MINUTES = 60             # don't email more than once per hour


async def _run_once() -> dict:
    """One sweep pass. Returns a small stats dict for logging."""
    db = get_db()
    now = datetime.now(timezone.utc)
    window_start = (now - timedelta(hours=_BAN_WINDOW_HOURS)).isoformat()

    stats = {"new_bans": 0, "skipped_existing": 0, "alert_sent": False}

    # ── 1) per-IP threshold → ban ──────────────────────────────────────
    pipeline = [
        {"$match": {"created_at": {"$gte": window_start}, "success": False}},
        {"$group": {
            "_id": "$ip",
            "n": {"$sum": 1},
            "usernames": {"$addToSet": "$username"},
            "last_at": {"$max": "$created_at"},
        }},
        {"$match": {"n": {"$gte": _BAN_FAILURES_THRESHOLD}}},
    ]
    async for row in db.login_attempts.aggregate(pipeline):
        ip = row.get("_id")
        if not ip or ip == "unknown":
            continue
        existing = await db.banned_ips.find_one({"ip": ip, "active": True})
        if existing:
            stats["skipped_existing"] += 1
            continue
        await db.banned_ips.insert_one({
            "ip": ip,
            "banned_at": now.isoformat(),
            "expires_at": (now + timedelta(hours=_BAN_DURATION_HOURS)).isoformat(),
            "reason": "auto_ban_brute_force",
            "failed_attempts": row.get("n", 0),
            "targeted_usernames": (row.get("usernames") or [])[:20],
            "active": True,
        })
        stats["new_bans"] += 1
        logger.warning(
            f"[security] auto-banned IP {ip} ({row.get('n')} failures last "
            f"{_BAN_WINDOW_HOURS}h targeting "
            f"{len(row.get('usernames') or [])} usernames)"
        )

    # ── 2) global threshold → email owners ─────────────────────────────
    global_failures = await db.login_attempts.count_documents({
        "created_at": {"$gte": window_start},
        "success": False,
    })
    if global_failures >= _ALERT_GLOBAL_THRESHOLD:
        last_alert = await db.security_alerts.find_one(
            {"kind": "global_brute_force"}, sort=[("at", -1)]
        )
        send_it = True
        if last_alert:
            try:
                last_at = datetime.fromisoformat(
                    str(last_alert["at"]).replace("Z", "+00:00")
                )
                if last_at.tzinfo is None:
                    last_at = last_at.replace(tzinfo=timezone.utc)
                if (now - last_at).total_seconds() < _ALERT_COOLDOWN_MINUTES * 60:
                    send_it = False
            except Exception:
                pass

        if send_it:
            recipients = []
            async for u in db.users.find(
                {"role": {"$in": ["app_owner", "super_admin"]}, "is_active": True},
                {"email": 1},
            ):
                if u.get("email"):
                    recipients.append(u["email"])
            if recipients:
                # Compose a short forensic summary
                top_ips = []
                async for row in db.login_attempts.aggregate([
                    {"$match": {"created_at": {"$gte": window_start}, "success": False}},
                    {"$group": {"_id": "$ip", "n": {"$sum": 1}}},
                    {"$sort": {"n": -1}},
                    {"$limit": 5},
                ]):
                    top_ips.append((row["_id"] or "—", row["n"]))
                top_lines = "".join(
                    f"<li><code>{ip}</code> — {n} محاولة</li>" for ip, n in top_ips
                )
                bans_total = await db.banned_ips.count_documents({"active": True})
                html = f"""
                <div style='font-family:Arial;line-height:1.6;direction:rtl;text-align:right;color:#111'>
                  <h2 style='color:#dc2626'>🚨 تنبيه أمني: نشاط brute-force مرتفع</h2>
                  <p>تم رصد <strong>{global_failures}</strong> محاولة دخول فاشلة خلال الساعة الماضية.</p>
                  <p>أعلى IPs نشاطاً:</p>
                  <ul>{top_lines}</ul>
                  <p>عدد الـ IPs المحظورة تلقائياً حالياً: <strong>{bans_total}</strong></p>
                  <p style='color:#6b7280;font-size:12px'>
                    التحقق: لوحة <em>الأمان والهجمات</em> داخل لوحة Super Admin.
                  </p>
                </div>"""
                email_svc = EmailService()
                sent_any = False
                for to in recipients:
                    ok = await email_svc.send_email(
                        to_email=to,
                        subject="🚨 تنبيه أمني — HomeMe — نشاط برمجي مرتفع",
                        html_content=html,
                    )
                    if ok:
                        sent_any = True
                await db.security_alerts.insert_one({
                    "kind": "global_brute_force",
                    "at": now.isoformat(),
                    "failures_last_hour": global_failures,
                    "recipients_count": len(recipients),
                    "sent": sent_any,
                })
                stats["alert_sent"] = sent_any
                logger.warning(
                    f"[security] global brute-force alert: {global_failures} "
                    f"failures last hour, emailed {len(recipients)} owners"
                )
    return stats


async def security_protector_loop() -> None:
    """Background task started from server.py startup."""
    logger.info(
        "Security auto-protector started "
        f"(sweep every {_INTERVAL_SECONDS}s, ban>={_BAN_FAILURES_THRESHOLD}/h, "
        f"alert>={_ALERT_GLOBAL_THRESHOLD}/h)"
    )
    while True:
        try:
            stats = await _run_once()
            if stats["new_bans"] or stats["alert_sent"]:
                logger.info(f"[security] sweep result: {stats}")
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.exception(f"security_protector_loop iteration failed: {e}")
        await asyncio.sleep(_INTERVAL_SECONDS)


async def is_ip_banned(ip: str) -> bool:
    """Synchronous-friendly check used from /api/auth/login.

    Returns True if `ip` is currently in a non-expired ban window.
    """
    if not ip or ip == "unknown":
        return False
    db = get_db()
    now_iso = datetime.now(timezone.utc).isoformat()
    ban = await db.banned_ips.find_one({
        "ip": ip,
        "active": True,
        "expires_at": {"$gt": now_iso},
    })
    return ban is not None
