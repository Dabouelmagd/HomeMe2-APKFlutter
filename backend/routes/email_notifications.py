"""
Admin Email Notifications - Invoice & Subscription alerts
Sends from info@datalifeai.com
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional
import logging

from database import get_db
from auth_deps import get_current_user, require_super_admin
from email_service import EmailService

router = APIRouter(prefix="/api")
email_service = EmailService()


async def send_invoice_email(to_email: str, invoice: dict):
    """Send invoice notification email to admin"""
    plan_names = {"basic": "أساسي", "pro": "احترافي", "premium": "متقدم", "company_startup": "شركة ناشئة", "company_business": "شركة متوسطة", "company_enterprise": "شركة كبرى"}
    plan = plan_names.get(invoice.get("plan", ""), invoice.get("plan", ""))
    amount = invoice.get("total", 0)
    currency = invoice.get("currency", "EGP")
    inv_num = invoice.get("invoice_number", "N/A")

    html = f"""
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 0;">
      <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">HomeMe</h1>
        <p style="color: #dbeafe; margin: 8px 0 0;">إدارة المجتمعات السكنية</p>
      </div>
      <div style="padding: 30px; background: white;">
        <h2 style="color: #1e293b; margin: 0 0 20px;">فاتورة جديدة #{inv_num}</h2>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b;">الخطة:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #1e293b; text-align: left;">{plan}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">المبلغ:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #2563eb; text-align: left; font-size: 18px;">{amount:,.0f} {currency}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">التاريخ:</td>
              <td style="padding: 8px 0; color: #1e293b; text-align: left;">{invoice.get('date', '')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">الحالة:</td>
              <td style="padding: 8px 0; text-align: left;"><span style="background: #dcfce7; color: #16a34a; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">مدفوع</span></td>
            </tr>
          </table>
        </div>
        <p style="color: #64748b; font-size: 14px;">يمكنك تحميل الفاتورة بصيغة PDF من لوحة التحكم &gt; إدارة الاشتراك &gt; سجل المدفوعات.</p>
      </div>
      <div style="padding: 20px; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">HomeMe - منصة إدارة المجتمعات السكنية | info@datalifeai.com</p>
      </div>
    </div>
    """
    try:
        await email_service.send_email(to_email, f"فاتورة جديدة #{inv_num} - HomeMe", html)
        logging.info(f"Invoice email sent to {to_email}")
        return True
    except Exception as e:
        logging.error(f"Failed to send invoice email: {e}")
        return False


async def send_subscription_reminder(to_email: str, user_name: str, plan: str, days_left: int):
    """Send subscription expiry reminder"""
    plan_names = {"basic": "أساسي", "pro": "احترافي", "premium": "متقدم", "company_startup": "شركة ناشئة", "company_business": "شركة متوسطة", "company_enterprise": "شركة كبرى"}
    plan_name = plan_names.get(plan, plan)

    urgency_color = "#ef4444" if days_left <= 3 else "#f59e0b" if days_left <= 7 else "#2563eb"

    html = f"""
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 0;">
      <div style="background: linear-gradient(135deg, {urgency_color}, #4f46e5); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">HomeMe</h1>
        <p style="color: #dbeafe; margin: 8px 0 0;">تذكير باشتراكك</p>
      </div>
      <div style="padding: 30px; background: white;">
        <h2 style="color: #1e293b; margin: 0 0 10px;">مرحباً {user_name}</h2>
        <p style="color: #64748b; margin: 0 0 20px;">نود تذكيرك بأن اشتراكك سينتهي قريباً.</p>
        <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
          <p style="font-size: 48px; font-weight: 900; color: {urgency_color}; margin: 0;">{days_left}</p>
          <p style="color: #92400e; font-weight: bold; margin: 5px 0 0;">يوم متبقي</p>
        </div>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0; color: #64748b;">الخطة الحالية: <strong style="color: #1e293b;">{plan_name}</strong></p>
        </div>
        <p style="color: #64748b; font-size: 14px;">لتجديد اشتراكك، قم بتسجيل الدخول إلى حسابك واختر الخطة المناسبة من صفحة "إدارة الاشتراك".</p>
        <div style="text-align: center; margin-top: 20px;">
          <p style="color: #64748b; font-size: 13px;">يمكنك الدفع عبر: بطاقات الائتمان | PayPal | انستاباي | فودافون كاش</p>
        </div>
      </div>
      <div style="padding: 20px; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">HomeMe - منصة إدارة المجتمعات السكنية | info@datalifeai.com</p>
      </div>
    </div>
    """
    subject = f"تذكير: اشتراكك ينتهي خلال {days_left} يوم - HomeMe"
    if days_left <= 1:
        subject = "عاجل: اشتراكك ينتهي اليوم! - HomeMe"

    try:
        await email_service.send_email(to_email, subject, html)
        logging.info(f"Subscription reminder sent to {to_email} ({days_left} days left)")
        return True
    except Exception as e:
        logging.error(f"Failed to send reminder: {e}")
        return False


async def send_welcome_email(to_email: str, user_name: str, plan: str):
    """Send welcome email after successful subscription"""
    plan_names = {"basic": "أساسي", "pro": "احترافي", "premium": "متقدم", "company_startup": "شركة ناشئة", "company_business": "شركة متوسطة", "company_enterprise": "شركة كبرى"}
    html = f"""
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
      <div style="background: linear-gradient(135deg, #16a34a, #059669); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">HomeMe</h1>
        <p style="color: #bbf7d0; margin: 8px 0 0;">مرحباً بك!</p>
      </div>
      <div style="padding: 30px; background: white;">
        <h2 style="color: #1e293b; margin: 0 0 10px;">مبروك {user_name}!</h2>
        <p style="color: #64748b;">تم تفعيل اشتراكك في خطة <strong style="color: #16a34a;">{plan_names.get(plan, plan)}</strong> بنجاح.</p>
        <p style="color: #64748b; font-size: 14px;">يمكنك الآن الاستفادة من جميع مميزات خطتك. إذا احتجت أي مساعدة، لا تتردد في التواصل معنا.</p>
      </div>
      <div style="padding: 20px; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">HomeMe | info@datalifeai.com</p>
      </div>
    </div>
    """
    try:
        await email_service.send_email(to_email, f"مبروك! تم تفعيل اشتراكك - HomeMe", html)
        return True
    except Exception as e:
        logging.error(f"Failed to send welcome email: {e}")
        return False


@router.post("/notifications/send-invoice-email")
async def api_send_invoice_email(current_user: dict = Depends(get_current_user)):
    """Send the latest invoice via email to the current user"""
    db = get_db()
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user or not user.get("email"):
        raise HTTPException(status_code=400, detail="لا يوجد بريد إلكتروني مسجل")

    invoice = await db.invoices.find_one({"user_id": current_user["id"]}, {"_id": 0}, sort=[("created_at", -1)])
    if not invoice:
        raise HTTPException(status_code=404, detail="لا توجد فاتورة")

    sent = await send_invoice_email(user["email"], invoice)
    if sent:
        return {"message": f"تم إرسال الفاتورة إلى {user['email']}"}
    raise HTTPException(status_code=500, detail="فشل في إرسال البريد")


@router.post("/notifications/send-reminders")
async def api_send_subscription_reminders(current_user: dict = Depends(require_super_admin)):
    """Manually trigger subscription expiry reminders (Super Admin)"""
    db = get_db()
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    sent_count = 0

    users = await db.users.find({"subscription_active": True, "email": {"$exists": True, "$ne": ""}}, {"_id": 0}).to_list(1000)
    for u in users:
        end_str = u.get("subscription_end")
        if not end_str:
            continue
        try:
            end = datetime.fromisoformat(str(end_str).replace("Z", "+00:00"))
        except:
            continue
        days_left = (end - now).days
        if days_left in [1, 3, 7, 14]:
            success = await send_subscription_reminder(
                u["email"],
                u.get("full_name", u.get("username", "")),
                u.get("subscription_plan", ""),
                days_left
            )
            if success:
                sent_count += 1

    return {"message": f"تم إرسال {sent_count} تذكير", "sent": sent_count}


@router.get("/notifications/email-settings")
async def get_email_settings(current_user: dict = Depends(require_super_admin)):
    """Get email notification settings"""
    import os
    return {
        "smtp_configured": bool(os.environ.get("SMTP_HOST")),
        "from_email": os.environ.get("SMTP_FROM_EMAIL", ""),
        "from_name": os.environ.get("SMTP_FROM_NAME", "HomeMe"),
    }
