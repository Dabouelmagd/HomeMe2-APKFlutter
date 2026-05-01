"""
Subscription renewal reminder loop.

Runs daily ~07:30 UTC, scans:
  - company_subscriptions (primary — paid tiers bound to management companies)
  - individual_subscriptions / user_subscriptions / compound_subscriptions (legacy)

Emails the billing contact when their subscription is:
  - 7 days from expiry → gentle reminder
  - 3 days from expiry → urgent reminder
  - 0 days (the day of expiry / already expired within 24h) → fallback notice

Idempotency: the reminder milestone key (e.g. "co_7", "co_0") is pushed into
`renewal_reminders_sent` on the subscription so the same milestone cannot fire twice.
"""
import asyncio
import logging
import urllib.parse
from datetime import datetime, timezone, timedelta

from database import get_db

logger = logging.getLogger(__name__)

# 0 means "the day the subscription expires" (user sees plan downgraded next lookup)
COMPANY_MILESTONES = [7, 3, 0]
LEGACY_MILESTONES = [30, 7, 1]

PLAN_NAME_AR = {
    "starter": "مجاني",
    "company_startup": "شركة ناشئة",
    "company_business": "شركة متوسطة",
    "company_enterprise": "شركة كبرى",
}


def _build_company_email_html(name: str, days: int, plan_key: str, expiry: str, renew_url: str) -> str:
    if days == 0:
        color = "#dc2626"; urgency = "⛔ انتهى اشتراكك اليوم"
        cta_text = "💳 جدّد الاشتراك الآن"
        body = f"انتهى اشتراكك وتم الرجوع للخطة المجانية. استعد كل المزايا فوراً بالتجديد."
    elif days <= 3:
        color = "#ea580c"; urgency = f"🚨 عاجل: {days} يوم فقط"
        cta_text = "💳 جدّد الآن قبل انقطاع الخدمة"
        body = f"خلال {days} يوم سيعود حسابك لخطة \"مجاني\" وستفقد التقارير المتقدمة وتحليلات الذكاء الاصطناعي وتصدير PDF/Excel."
    else:
        color = "#f59e0b"; urgency = f"⏰ تذكير: {days} أيام متبقية"
        cta_text = "💳 جدّد اشتراكك"
        body = f"اشتراكك الحالي سينتهي خلال {days} أيام. جدّد الآن لتتجنب أي انقطاع في الخدمة."

    plan_name_ar = PLAN_NAME_AR.get(plan_key, plan_key)
    return f"""
    <div style='font-family:Tahoma,Arial,sans-serif;direction:rtl;max-width:600px;margin:auto;'>
      <div style='background:linear-gradient(135deg,{color},#7c3aed);color:#fff;padding:24px;border-radius:12px 12px 0 0;'>
        <h2 style='margin:0;font-size:22px;'>{urgency}</h2>
        <p style='margin:6px 0 0;opacity:0.95;font-size:13px;'>اشتراك HomeMe في خطة "{plan_name_ar}"</p>
      </div>
      <div style='background:#fff;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 12px 12px;'>
        <p style='font-size:15px;'>أهلاً <strong>{name or 'عميلنا العزيز'}</strong>،</p>
        <p style='color:#374151;line-height:1.7;'>{body}</p>
        <div style='background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px;margin:16px 0;font-size:13px;'>
          <div style='display:flex;justify-content:space-between;padding:4px 0;'><span style='color:#6b7280;'>الخطة</span><strong>{plan_name_ar}</strong></div>
          <div style='display:flex;justify-content:space-between;padding:4px 0;border-top:1px dashed #e5e7eb;'><span style='color:#6b7280;'>تاريخ الانتهاء</span><strong>{expiry[:10] if expiry else '—'}</strong></div>
        </div>
        <p style='margin:24px 0;text-align:center;'>
          <a href='{renew_url}' style='display:inline-block;background:{color};color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;box-shadow:0 4px 10px rgba(220,38,38,0.25);'>
            {cta_text}
          </a>
        </p>
        <p style='color:#9ca3af;font-size:11px;margin-top:24px;text-align:center;border-top:1px solid #f3f4f6;padding-top:14px;'>
          رسالة آلية من HomeMe • support@homemeapp.net
        </p>
      </div>
    </div>
    """


async def _check_company_subscriptions(db):
    """Company-level subscriptions — uses `expires_at` + sends to the company admin."""
    now = datetime.now(timezone.utc)
    sent = 0
    cursor = db.company_subscriptions.find(
        {
            "status": {"$in": ["active", "pending_payment"]},
            "expires_at": {"$exists": True, "$ne": None},
            "plan": {"$ne": "starter"},
        },
        {"_id": 0},
    )
    async for sub in cursor:
        company_id = sub.get("company_id")
        expires_at = sub.get("expires_at")
        plan_key = sub.get("plan") or "starter"
        if not company_id or not expires_at:
            continue
        try:
            exp_dt = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
        except Exception:
            continue

        days_left = (exp_dt - now).days
        # Fire "day 0" any time within the first 24h after expiry as well (handles missed crons)
        if days_left < -1:
            continue

        company = await db.companies.find_one(
            {"id": company_id}, {"_id": 0, "name": 1, "admin_user_id": 1, "email": 1}
        )
        if not company:
            continue
        admin = None
        if company.get("admin_user_id"):
            admin = await db.users.find_one(
                {"id": company["admin_user_id"]},
                {"_id": 0, "email": 1, "full_name": 1, "username": 1},
            )
        email = (admin or {}).get("email") or company.get("email")
        if not email:
            continue

        already = set(sub.get("renewal_reminders_sent") or [])
        for m in COMPANY_MILESTONES:
            milestone_key = f"co_{m}"
            if milestone_key in already:
                continue
            # Match the milestone exactly (±0 for >0, or day-of-expiry window for 0)
            if m > 0 and days_left != m:
                continue
            if m == 0 and days_left > 0:
                continue

            plan_param = urllib.parse.quote(plan_key)
            renew_url = f"https://homemeapp.net/app/dashboard?upgrade={plan_param}"
            name = (admin or {}).get("full_name") or (admin or {}).get("username") or company.get("name") or ""

            try:
                from email_service import EmailService
                es = EmailService()
                html = _build_company_email_html(name, m, plan_key, str(expires_at), renew_url)
                subject = (
                    f"⛔ انتهى اشتراكك — HomeMe"
                    if m == 0
                    else f"🚨 اشتراكك ينتهي خلال {m} يوم — HomeMe" if m <= 3
                    else f"⏰ تذكير: اشتراكك ينتهي خلال {m} أيام — HomeMe"
                )

                async def _send_safe(e=email, h=html, s=subject):
                    try:
                        await es.send_email(to_email=e, subject=s, html_content=h, mailbox="main")
                    except Exception as ee:
                        logger.error(f"renewal-reminder company send failed: {ee}")

                asyncio.create_task(_send_safe())
            except Exception as ee:
                logger.error(f"renewal-reminder company setup failed: {ee}")

            await db.company_subscriptions.update_one(
                {"company_id": company_id},
                {"$addToSet": {"renewal_reminders_sent": milestone_key}},
            )
            sent += 1
    return sent


async def _check_legacy_subscriptions(db, subs_collection: str, owner_lookup_field: str = "owner_id"):
    """Legacy compound/individual subscriptions (kept for backward compatibility)."""
    now = datetime.now(timezone.utc)
    sent = 0
    cursor = db[subs_collection].find(
        {
            "status": {"$in": ["active", "trial"]},
            "$or": [
                {"end_date": {"$exists": True}},
                {"trial_end_date": {"$exists": True}},
                {"next_billing_date": {"$exists": True}},
                {"subscription_end": {"$exists": True}},
            ],
        },
        {"_id": 0},
    )
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

        already = sub.get("renewal_reminders_sent") or []
        for m in LEGACY_MILESTONES:
            if days_left == m and m not in already:
                owner_id = sub.get(owner_lookup_field)
                user = None
                if owner_id:
                    user = await db.users.find_one(
                        {"id": owner_id},
                        {"_id": 0, "email": 1, "full_name": 1, "username": 1},
                    )
                email = (user or {}).get("email")
                if not email:
                    continue
                try:
                    from email_service import EmailService
                    es = EmailService()
                    html = _build_company_email_html(
                        name=(user or {}).get("full_name") or (user or {}).get("username") or "",
                        days=m,
                        plan_key=sub.get("plan") or "standard",
                        expiry=str(end),
                        renew_url="https://homemeapp.net/app/billing",
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
                            logger.error(f"renewal-reminder legacy send failed: {ee}")

                    asyncio.create_task(_send_safe())
                except Exception as ee:
                    logger.error(f"renewal-reminder legacy setup failed: {ee}")

                await db[subs_collection].update_one(
                    {"id": sub.get("id")} if sub.get("id") else {"compound_id": sub.get("compound_id")},
                    {"$addToSet": {"renewal_reminders_sent": m}},
                )
                sent += 1
    return sent


async def run_renewal_reminders_once():
    """Run one full pass. Exposed for admin manual-trigger endpoint."""
    db = get_db()
    total = await _check_company_subscriptions(db)
    for coll in ("individual_subscriptions", "user_subscriptions", "compound_subscriptions"):
        try:
            total += await _check_legacy_subscriptions(db, coll)
        except Exception as e:
            logger.error(f"renewal-reminder collection={coll} failed: {e}")
    logger.info(f"renewal-reminder pass: sent {total} emails")
    return total


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
            await run_renewal_reminders_once()
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.error(f"renewal-reminder loop error: {e}", exc_info=True)
            await asyncio.sleep(3600)
