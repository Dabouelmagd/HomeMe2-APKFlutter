"""
Admin Email Notifications - Invoice & Subscription alerts
Sends from info@datalifeai.com
Supports: Arabic (ar), English (en), French (fr)
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

# Email translations
EMAIL_T = {
    'ar': {
        'subtitle': 'إدارة المجتمعات السكنية',
        'new_invoice': 'فاتورة جديدة',
        'plan_label': 'الخطة:',
        'amount_label': 'المبلغ:',
        'date_label': 'التاريخ:',
        'status_label': 'الحالة:',
        'paid': 'مدفوع',
        'download_note': 'يمكنك تحميل الفاتورة بصيغة PDF من لوحة التحكم > إدارة الاشتراك > سجل المدفوعات.',
        'footer': 'HomeMe - منصة إدارة المجتمعات السكنية',
        'reminder_title': 'تذكير باشتراكك',
        'hello': 'مرحباً',
        'reminder_msg': 'نود تذكيرك بأن اشتراكك سينتهي قريباً.',
        'days_left': 'يوم متبقي',
        'current_plan': 'الخطة الحالية:',
        'renew_note': 'لتجديد اشتراكك، قم بتسجيل الدخول إلى حسابك واختر الخطة المناسبة.',
        'pay_methods': 'يمكنك الدفع عبر: بطاقات الائتمان | PayPal | انستاباي | فودافون كاش',
        'urgent_subject': 'عاجل: اشتراكك ينتهي اليوم!',
        'reminder_subject': 'تذكير: اشتراكك ينتهي خلال {days} يوم',
        'invoice_subject': 'فاتورة جديدة #{num}',
        'welcome_title': 'مبروك',
        'welcome_msg': 'تم تفعيل اشتراكك في خطة',
        'welcome_note': 'يمكنك الآن الاستفادة من جميع مميزات خطتك.',
        'welcome_subject': 'مبروك! تم تفعيل اشتراكك',
    },
    'en': {
        'subtitle': 'Compound Management Platform',
        'new_invoice': 'New Invoice',
        'plan_label': 'Plan:',
        'amount_label': 'Amount:',
        'date_label': 'Date:',
        'status_label': 'Status:',
        'paid': 'Paid',
        'download_note': 'You can download the PDF invoice from Dashboard > Subscription Management > Payment History.',
        'footer': 'HomeMe - Compound Management Platform',
        'reminder_title': 'Subscription Reminder',
        'hello': 'Hello',
        'reminder_msg': 'We would like to remind you that your subscription is expiring soon.',
        'days_left': 'days left',
        'current_plan': 'Current Plan:',
        'renew_note': 'To renew your subscription, login to your account and choose the right plan.',
        'pay_methods': 'Pay via: Credit Cards | PayPal | InstaPay | Vodafone Cash',
        'urgent_subject': 'Urgent: Your subscription expires today!',
        'reminder_subject': 'Reminder: Your subscription expires in {days} days',
        'invoice_subject': 'New Invoice #{num}',
        'welcome_title': 'Congratulations',
        'welcome_msg': 'Your subscription has been activated on plan',
        'welcome_note': 'You can now enjoy all the features of your plan.',
        'welcome_subject': 'Congratulations! Subscription activated',
    },
    'fr': {
        'subtitle': 'Plateforme de gestion résidentielle',
        'new_invoice': 'Nouvelle facture',
        'plan_label': 'Plan:',
        'amount_label': 'Montant:',
        'date_label': 'Date:',
        'status_label': 'Statut:',
        'paid': 'Payé',
        'download_note': 'Vous pouvez télécharger la facture PDF depuis le Tableau de bord > Gestion abonnement > Historique.',
        'footer': 'HomeMe - Plateforme de gestion résidentielle',
        'reminder_title': 'Rappel d\'abonnement',
        'hello': 'Bonjour',
        'reminder_msg': 'Nous vous rappelons que votre abonnement expire bientôt.',
        'days_left': 'jours restants',
        'current_plan': 'Plan actuel:',
        'renew_note': 'Pour renouveler, connectez-vous et choisissez le plan approprié.',
        'pay_methods': 'Paiement: Cartes de crédit | PayPal | InstaPay | Vodafone Cash',
        'urgent_subject': 'Urgent: Votre abonnement expire aujourd\'hui!',
        'reminder_subject': 'Rappel: Votre abonnement expire dans {days} jours',
        'invoice_subject': 'Nouvelle facture #{num}',
        'welcome_title': 'Félicitations',
        'welcome_msg': 'Votre abonnement a été activé sur le plan',
        'welcome_note': 'Vous pouvez maintenant profiter de toutes les fonctionnalités.',
        'welcome_subject': 'Félicitations! Abonnement activé',
    }
}

PLAN_NAMES = {
    'ar': {"basic": "أساسي", "pro": "احترافي", "premium": "متقدم", "company_startup": "شركة ناشئة", "company_business": "شركة متوسطة", "company_enterprise": "شركة كبرى"},
    'en': {"basic": "Basic", "pro": "Professional", "premium": "Premium", "company_startup": "Startup", "company_business": "Business", "company_enterprise": "Enterprise"},
    'fr': {"basic": "Basique", "pro": "Professionnel", "premium": "Premium", "company_startup": "Startup", "company_business": "Business", "company_enterprise": "Entreprise"},
}


def get_lang(user: dict) -> str:
    return user.get("language", user.get("lang", "ar"))[:2]


def et(lang: str, key: str, **kwargs) -> str:
    val = EMAIL_T.get(lang, EMAIL_T['en']).get(key, EMAIL_T['en'].get(key, key))
    for k, v in kwargs.items():
        val = val.replace(f'{{{k}}}', str(v))
    return val


async def send_invoice_email(to_email: str, invoice: dict, lang: str = "ar"):
    """Send invoice notification email"""
    t = lambda k, **kw: et(lang, k, **kw)
    plan = PLAN_NAMES.get(lang, PLAN_NAMES['en']).get(invoice.get("plan", ""), invoice.get("plan", ""))
    amount = invoice.get("total", 0)
    currency = invoice.get("currency", "EGP")
    inv_num = invoice.get("invoice_number", "N/A")
    is_rtl = lang == 'ar'

    html = f"""
    <div dir="{'rtl' if is_rtl else 'ltr'}" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
      <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">HomeMe</h1>
        <p style="color: #dbeafe; margin: 8px 0 0;">{t('subtitle')}</p>
      </div>
      <div style="padding: 30px; background: white;">
        <h2 style="color: #1e293b; margin: 0 0 20px;">{t('new_invoice')} #{inv_num}</h2>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748b;">{t('plan_label')}</td><td style="padding: 8px 0; font-weight: bold; color: #1e293b;">{plan}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">{t('amount_label')}</td><td style="padding: 8px 0; font-weight: bold; color: #2563eb; font-size: 18px;">{amount:,.0f} {currency}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">{t('date_label')}</td><td style="padding: 8px 0; color: #1e293b;">{invoice.get('date', '')}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748b;">{t('status_label')}</td><td style="padding: 8px 0;"><span style="background: #dcfce7; color: #16a34a; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">{t('paid')}</span></td></tr>
          </table>
        </div>
        <p style="color: #64748b; font-size: 14px;">{t('download_note')}</p>
      </div>
      <div style="padding: 20px; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">{t('footer')} | info@datalifeai.com</p>
      </div>
    </div>"""
    try:
        await email_service.send_email(to_email, f"{t('invoice_subject', num=inv_num)} - HomeMe", html)
        logging.info(f"Invoice email sent to {to_email} ({lang})")
        return True
    except Exception as e:
        logging.error(f"Failed to send invoice email: {e}")
        return False


async def send_subscription_reminder(to_email: str, user_name: str, plan: str, days_left: int, lang: str = "ar"):
    """Send subscription expiry reminder"""
    t = lambda k, **kw: et(lang, k, **kw)
    plan_name = PLAN_NAMES.get(lang, PLAN_NAMES['en']).get(plan, plan)
    urgency_color = "#ef4444" if days_left <= 3 else "#f59e0b" if days_left <= 7 else "#2563eb"
    is_rtl = lang == 'ar'

    html = f"""
    <div dir="{'rtl' if is_rtl else 'ltr'}" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
      <div style="background: linear-gradient(135deg, {urgency_color}, #4f46e5); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">HomeMe</h1>
        <p style="color: #dbeafe; margin: 8px 0 0;">{t('reminder_title')}</p>
      </div>
      <div style="padding: 30px; background: white;">
        <h2 style="color: #1e293b; margin: 0 0 10px;">{t('hello')} {user_name}</h2>
        <p style="color: #64748b; margin: 0 0 20px;">{t('reminder_msg')}</p>
        <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
          <p style="font-size: 48px; font-weight: 900; color: {urgency_color}; margin: 0;">{days_left}</p>
          <p style="color: #92400e; font-weight: bold; margin: 5px 0 0;">{t('days_left')}</p>
        </div>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0; color: #64748b;">{t('current_plan')} <strong style="color: #1e293b;">{plan_name}</strong></p>
        </div>
        <p style="color: #64748b; font-size: 14px;">{t('renew_note')}</p>
        <p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 20px;">{t('pay_methods')}</p>
      </div>
      <div style="padding: 20px; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">{t('footer')} | info@datalifeai.com</p>
      </div>
    </div>"""
    subject = t('urgent_subject') if days_left <= 1 else t('reminder_subject', days=days_left)
    try:
        await email_service.send_email(to_email, f"{subject} - HomeMe", html)
        logging.info(f"Subscription reminder sent to {to_email} ({days_left} days, {lang})")
        return True
    except Exception as e:
        logging.error(f"Failed to send reminder: {e}")
        return False


async def send_welcome_email(to_email: str, user_name: str, plan: str, lang: str = "ar"):
    """Send welcome email after successful subscription"""
    t = lambda k, **kw: et(lang, k, **kw)
    plan_name = PLAN_NAMES.get(lang, PLAN_NAMES['en']).get(plan, plan)
    is_rtl = lang == 'ar'
    html = f"""
    <div dir="{'rtl' if is_rtl else 'ltr'}" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
      <div style="background: linear-gradient(135deg, #16a34a, #059669); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">HomeMe</h1>
        <p style="color: #bbf7d0; margin: 8px 0 0;">{t('hello')}!</p>
      </div>
      <div style="padding: 30px; background: white;">
        <h2 style="color: #1e293b; margin: 0 0 10px;">{t('welcome_title')} {user_name}!</h2>
        <p style="color: #64748b;">{t('welcome_msg')} <strong style="color: #16a34a;">{plan_name}</strong>.</p>
        <p style="color: #64748b; font-size: 14px;">{t('welcome_note')}</p>
      </div>
      <div style="padding: 20px; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">{t('footer')} | info@datalifeai.com</p>
      </div>
    </div>"""
    try:
        await email_service.send_email(to_email, f"{t('welcome_subject')} - HomeMe", html)
        return True
    except Exception as e:
        logging.error(f"Failed to send welcome email: {e}")
        return False


@router.post("/notifications/send-invoice-email")
async def api_send_invoice_email(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user or not user.get("email"):
        raise HTTPException(status_code=400, detail="لا يوجد بريد إلكتروني مسجل")
    invoice = await db.invoices.find_one({"user_id": current_user["id"]}, {"_id": 0}, sort=[("created_at", -1)])
    if not invoice:
        raise HTTPException(status_code=404, detail="لا توجد فاتورة")
    lang = get_lang(user)
    sent = await send_invoice_email(user["email"], invoice, lang)
    if sent:
        return {"message": f"تم إرسال الفاتورة إلى {user['email']}"}
    raise HTTPException(status_code=500, detail="فشل في إرسال البريد")


@router.post("/notifications/send-reminders")
async def api_send_subscription_reminders(current_user: dict = Depends(require_super_admin)):
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
            lang = get_lang(u)
            success = await send_subscription_reminder(u["email"], u.get("full_name", u.get("username", "")), u.get("subscription_plan", ""), days_left, lang)
            if success:
                sent_count += 1
    return {"message": f"تم إرسال {sent_count} تذكير", "sent": sent_count}


@router.get("/notifications/email-settings")
async def get_email_settings(current_user: dict = Depends(require_super_admin)):
    import os
    return {
        "smtp_configured": bool(os.environ.get("SMTP_HOST")),
        "from_email": os.environ.get("SMTP_FROM_EMAIL", ""),
        "from_name": os.environ.get("SMTP_FROM_NAME", "HomeMe"),
        "languages": ["ar", "en", "fr"]
    }


@router.post("/notifications/send-custom-email")
async def send_custom_email(body: dict, current_user: dict = Depends(require_super_admin)):
    """Send a custom email to specific user or all users with email"""
    db = get_db()
    to_email = body.get("to_email", "")
    subject = body.get("subject", "")
    message = body.get("message", "")
    send_to_all = body.get("send_to_all", False)

    if not subject or not message:
        raise HTTPException(400, "الموضوع والرسالة مطلوبين")

    if not to_email and not send_to_all:
        raise HTTPException(400, "البريد الإلكتروني مطلوب أو اختر إرسال للكل")

    html = f"""<div dir="rtl" style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
      <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">HomeMe</h1>
        <p style="color: #dbeafe; margin: 8px 0 0;">إدارة المجتمعات السكنية</p>
      </div>
      <div style="padding: 30px; background: white;">
        <h2 style="color: #1e293b; margin: 0 0 15px;">{subject}</h2>
        <div style="color: #475569; font-size: 15px; line-height: 1.8; white-space: pre-wrap;">{message}</div>
      </div>
      <div style="padding: 20px; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">HomeMe | info@datalifeai.com</p>
      </div>
    </div>"""

    sent_count = 0
    failed = []

    if send_to_all:
        users = await db.users.find({"email": {"$exists": True, "$ne": ""}}, {"_id": 0, "email": 1}).to_list(5000)
        emails = list(set(u["email"] for u in users if u.get("email")))
        for email in emails:
            try:
                await email_service.send_email(email, f"{subject} - HomeMe", html)
                sent_count += 1
            except Exception as e:
                failed.append(email)
                logging.error(f"Failed to send to {email}: {e}")
    else:
        try:
            await email_service.send_email(to_email, f"{subject} - HomeMe", html)
            sent_count = 1
        except Exception as e:
            raise HTTPException(500, f"فشل إرسال البريد: {str(e)}")

    return {
        "message": f"تم إرسال {sent_count} بريد إلكتروني" + (f" | فشل: {len(failed)}" if failed else ""),
        "sent": sent_count,
        "failed": len(failed)
    }


@router.post("/notifications/test-email")
async def test_email_connection(current_user: dict = Depends(require_super_admin)):
    """Test SMTP connection by sending to the configured email"""
    import os
    from_email = os.environ.get("SMTP_FROM_EMAIL", "")

    html = """<div dir="rtl" style="font-family: Arial; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #2563eb, #4f46e5); padding: 30px; text-align: center;">
        <h1 style="color: white;">HomeMe</h1>
      </div>
      <div style="padding: 30px; background: white; text-align: center;">
        <h2 style="color: #16a34a;">البريد الإلكتروني يعمل بنجاح!</h2>
        <p style="color: #64748b;">هذا بريد اختباري من منصة HomeMe</p>
      </div>
    </div>"""

    try:
        await email_service.send_email(from_email, "HomeMe - اختبار البريد الإلكتروني", html)
        return {"status": "ok", "message": f"تم إرسال بريد اختباري إلى {from_email}"}
    except Exception as e:
        raise HTTPException(500, f"فشل الاتصال: {str(e)}")
