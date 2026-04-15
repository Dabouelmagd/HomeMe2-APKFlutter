"""
Subscription Reminders - تذكيرات الاشتراكات
Shows upcoming expiry dates and sends reminder emails
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging
import uuid

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api")


@router.get("/owner/subscription-reminders")
async def get_subscription_reminders(
    days_ahead: int = 30,
    current_user: dict = Depends(get_current_user)
):
    """Get upcoming subscription expirations and renewal info"""
    if current_user.get("role") not in ["app_owner", "super_admin"]:
        raise HTTPException(403, "App Owner access required")

    db = get_db()
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=days_ahead)

    # Get all company subscriptions
    subs = await db.company_subscriptions.find({}, {"_id": 0}).to_list(None)
    companies = {c["id"]: c for c in await db.companies.find({}, {"_id": 0}).to_list(None)}

    reminders = []
    expiring_soon = 0
    expired = 0
    healthy = 0

    for sub in subs:
        company = companies.get(sub.get("company_id"), {})
        end_raw = sub.get("current_period_end")

        # Parse end date
        end_date = None
        if isinstance(end_raw, datetime):
            end_date = end_raw if end_raw.tzinfo else end_raw.replace(tzinfo=timezone.utc)
        elif isinstance(end_raw, str):
            try:
                end_date = datetime.fromisoformat(end_raw.replace("Z", "+00:00"))
            except Exception:
                pass

        if not end_date:
            continue

        days_left = (end_date - now).days
        if days_left < 0:
            status = "expired"
            urgency = "critical"
            expired += 1
        elif days_left <= 7:
            status = "expiring"
            urgency = "critical"
            expiring_soon += 1
        elif days_left <= 30:
            status = "expiring"
            urgency = "warning"
            expiring_soon += 1
        else:
            status = "active"
            urgency = "healthy"
            healthy += 1

        reminders.append({
            "id": sub.get("id", ""),
            "company_id": sub.get("company_id", ""),
            "company_name": company.get("name", "غير معروف"),
            "company_email": company.get("contact_email", ""),
            "company_phone": company.get("contact_phone", ""),
            "plan": sub.get("plan", "starter"),
            "plan_price": sub.get("plan_price", 0),
            "end_date": end_date.isoformat(),
            "days_left": days_left,
            "status": status,
            "urgency": urgency,
            "last_reminder_sent": sub.get("last_reminder_sent"),
        })

    # Sort by days_left ascending (most urgent first)
    reminders.sort(key=lambda r: r["days_left"])

    # Get reminder history
    reminder_logs = await db.reminder_logs.find(
        {}, {"_id": 0}
    ).sort("sent_at", -1).to_list(20)

    return {
        "reminders": reminders,
        "stats": {
            "total": len(reminders),
            "expiring_soon": expiring_soon,
            "expired": expired,
            "healthy": healthy,
        },
        "recent_logs": reminder_logs,
    }


@router.post("/owner/subscription-reminders/send")
async def send_reminder(
    body: dict,
    current_user: dict = Depends(get_current_user)
):
    """Send a reminder email to a company about subscription expiry"""
    if current_user.get("role") not in ["app_owner", "super_admin"]:
        raise HTTPException(403, "App Owner access required")

    db = get_db()
    company_id = body.get("company_id")
    if not company_id:
        raise HTTPException(400, "company_id is required")

    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(404, "Company not found")

    sub = await db.company_subscriptions.find_one({"company_id": company_id}, {"_id": 0})

    email = company.get("contact_email")
    if not email:
        raise HTTPException(400, "الشركة ليس لديها بريد إلكتروني")

    # Log the reminder
    log = {
        "id": str(uuid.uuid4()),
        "company_id": company_id,
        "company_name": company.get("name", ""),
        "email": email,
        "type": body.get("type", "expiry_reminder"),
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "sent_by": current_user.get("id"),
        "status": "sent",
    }
    await db.reminder_logs.insert_one(log)
    log.pop("_id", None)

    # Update last_reminder_sent on subscription
    if sub:
        await db.company_subscriptions.update_one(
            {"company_id": company_id},
            {"$set": {"last_reminder_sent": datetime.now(timezone.utc).isoformat()}}
        )

    # Try to send email (if SMTP configured)
    try:
        import os
        smtp_host = os.environ.get("SMTP_HOST")
        if smtp_host:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            smtp_port = int(os.environ.get("SMTP_PORT", 587))
            smtp_user = os.environ.get("SMTP_USER", "")
            smtp_pass = os.environ.get("SMTP_PASS", "")

            msg = MIMEMultipart()
            msg["From"] = smtp_user
            msg["To"] = email
            msg["Subject"] = f"تذكير بتجديد اشتراك - {company.get('name', '')}"

            body_text = f"""
            مرحباً {company.get('name', '')},

            نود تذكيركم بأن اشتراككم في منصة HomeMe سينتهي قريباً.
            يرجى تجديد الاشتراك لضمان استمرار الخدمة.

            مع تحيات فريق HomeMe
            """
            msg.attach(MIMEText(body_text, "plain", "utf-8"))

            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)

            return {"status": "sent", "message": f"تم إرسال التذكير إلى {email}", "log": log}
        else:
            return {"status": "logged", "message": f"تم تسجيل التذكير (SMTP غير مهيأ) - {email}", "log": log}
    except Exception as e:
        logging.error(f"Email send error: {e}")
        return {"status": "logged", "message": f"تم تسجيل التذكير (خطأ في الإرسال) - {email}", "log": log}
