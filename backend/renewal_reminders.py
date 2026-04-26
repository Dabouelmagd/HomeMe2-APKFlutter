"""
Subscription renewal reminder loop.

Runs daily ~07:00 UTC, scans every active subscription, and emails
the compound owner / company billing contact when:
  - 30 days before expiry
  - 7 days before expiry
  - 1 day before expiry

A `renewal_reminders_sent` array on the subscription doc prevents
duplicate sends (idempotent: each milestone fires at most once).
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta

from database import get_db

logger = logging.getLogger(__name__)

MILESTONES = [30, 7, 1]


def _build_email_html(name: str, days: int, plan: str, expiry: str) -> str:
    color = "#dc2626" if days <= 1 else "#f59e0b" if days <= 7 else "#3b82f6"
    return f"""
    <div style='font-family:Tahoma,Arial,sans-serif;direction:rtl;max-width:600px;margin:auto;'>
      <div style='background:linear-gradient(135deg,{color},#7c3aed);color:#fff;padding:20px;border-radius:12px 12px 0 0;'>
        <h2 style='margin:0;'>⏰ تذكير بتجديد الاشتراك</h2>
        <p style='margin:6px 0 0;opacity:0.95;font-size:14px;'>اشتراكك في HomeMe ينتهي خلال {days} يوم</p>
      </div>
      <div style='background:#fff;padding:20px;border:1px solid #eee;border-radius:0 0 12px 12px;'>
        <p>أهلاً <strong>{name or 'عزيزتي'}</strong>،</p>
        <p>نوّد تذكيرك بأن اشتراك مجمعك في HomeMe سينتهي خلال <strong>{days} يوم</strong> ({expiry[:10] if expiry else '—'}).</p>
        <p>لتجنب توقف الخدمات، يُرجى تجديد الاشتراك من لوحة الإدارة:</p>
        <ul style='font-size:13px;color:#374151;'>
          <li>الخطة الحالية: <strong>{plan or 'standard'}</strong></li>
          <li>تاريخ الانتهاء: <strong>{expiry[:10] if expiry else '—'}</strong></li>
        </ul>
        <p style='margin-top:20px;text-align:center;'>
          <a href='https://homemeapp.net/app/billing' style='display:inline-block;background:{color};color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:bold;'>
            تجديد الاشتراك الآن
          </a>
        </p>
        <p style='color:#6b7280;font-size:11px;margin-top:20px;text-align:center;'>
          مرسلة تلقائياً • للاستفسارات تواصلي معنا عبر support@homemeapp.net
        </p>
      </div>
    </div>
    """


async def _check_and_remind(db, subs_collection: str, owner_lookup_field: str = "owner_id"):
    """Check a subscription collection and send reminders for each milestone."""
    now = datetime.now(timezone.utc)
    sent = 0

    cursor = db[subs_collection].find({
        "status": {"$in": ["active", "trial"]},
        "$or": [
            {"end_date": {"$exists": True}},
            {"trial_end_date": {"$exists": True}},
            {"next_billing_date": {"$exists": True}},
            {"subscription_end": {"$exists": True}},
        ],
    }, {"_id": 0})
    async for sub in cursor:
        end = sub.get("end_date") or sub.get("trial_end_date") or sub.get("next_billing_date") or sub.get("subscription_end")
        if not end:
            continue
        try:
            end_dt = datetime.fromisoformat(str(end).replace("Z", "+00:00")) if isinstance(end, str) else end
            if end_dt.tzinfo is None:
                end_dt = end_dt.replace(tzinfo=timezone.utc)
        except Exception:
            continue
        days_left = (end_dt - now).days
        if days_left < 0:
            continue

        already_sent = sub.get("renewal_reminders_sent") or []
        for m in MILESTONES:
            if days_left == m and m not in already_sent:
                # Resolve recipient email
                owner_id = sub.get(owner_lookup_field)
                user = None
                if owner_id:
                    user = await db.users.find_one({"id": owner_id}, {"_id": 0, "email": 1, "full_name": 1, "username": 1})
                email = (user or {}).get("email")
                if not email:
                    continue

                try:
                    from email_service import EmailService
                    es = EmailService()
                    html = _build_email_html(
                        name=(user or {}).get("full_name") or (user or {}).get("username") or "",
                        days=m,
                        plan=sub.get("plan") or sub.get("plan_name") or sub.get("subscription_plan") or "standard",
                        expiry=str(end),
                    )

                    async def _send_safe(eml=email, html=html, m=m):
                        try:
                            await es.send_email(
                                to_email=eml,
                                subject=f"⏰ اشتراكك ينتهي خلال {m} يوم — HomeMe",
                                html_content=html,
                                mailbox="main",
                            )
                        except Exception as ee:
                            logger.error(f"renewal-reminder send failed: {ee}")

                    asyncio.create_task(_send_safe())
                except Exception as ee:
                    logger.error(f"renewal-reminder setup failed: {ee}")

                # Mark as sent (idempotent)
                await db[subs_collection].update_one(
                    {"id": sub.get("id")} if sub.get("id") else {"compound_id": sub.get("compound_id")},
                    {"$addToSet": {"renewal_reminders_sent": m}},
                )
                sent += 1
    return sent


async def renewal_reminder_loop():
    """Daily loop at ~07:30 UTC."""
    await asyncio.sleep(120)  # let app boot
    while True:
        try:
            now = datetime.now(timezone.utc)
            target = now.replace(hour=7, minute=30, second=0, microsecond=0)
            if target <= now:
                target += timedelta(days=1)
            await asyncio.sleep(max(60, (target - now).total_seconds()))

            db = get_db()
            total = 0
            for coll in ("individual_subscriptions", "company_subscriptions", "user_subscriptions", "compound_subscriptions"):
                try:
                    total += await _check_and_remind(db, coll)
                except Exception as e:
                    logger.error(f"renewal-reminder collection={coll} failed: {e}")
            logger.info(f"renewal-reminder: sent {total} emails")
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"renewal-reminder loop error: {e}", exc_info=True)
            await asyncio.sleep(3600)
