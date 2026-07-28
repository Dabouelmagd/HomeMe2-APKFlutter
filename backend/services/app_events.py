"""
App Events Notification Service
================================
مركزي لإرسال إشعارات البريد الإلكتروني عند أي حدث مهم في التطبيق.

الاستخدام:
    from services.app_events import notify_event
    await notify_event(db, "payment_failed", user_id="xxx", details={...})
"""
import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional
from email_service import email_service

logger = logging.getLogger(__name__)

FRONTEND_URL_DEFAULT = "https://homemeapp.net"


async def _get_user(db, user_id: str = None, username: str = None, email: str = None) -> Optional[dict]:
    """Fetch user by id, username, or email."""
    if not db:
        return None
    query = {}
    if user_id:
        query = {"id": user_id}
    elif username:
        query = {"username": username}
    elif email:
        query = {"email": email}
    else:
        return None
    return await db.users.find_one(query, {"_id": 0, "email": 1, "username": 1, "full_name": 1, "role": 1})


async def notify_event(
    db,
    event: str,
    user_id: str = None,
    username: str = None,
    email: str = None,
    details: dict = None,
    frontend_url: str = FRONTEND_URL_DEFAULT,
):
    """
    إرسال إشعار بريد لحدث معين.

    events:
      - rate_limited        : تجاوز محاولات تسجيل الدخول
      - failed_login        : محاولة دخول فاشلة
      - password_changed    : تغيير كلمة المرور
      - account_locked      : قفل الحساب
      - subscription_expiring : الاشتراك على وشك الانتهاء
      - subscription_expired  : انتهى الاشتراك
      - payment_confirmed   : تأكيد الدفع
      - payment_rejected    : رفض الدفع
      - smoke_test_failed   : فشل smoke test
      - maintenance_assigned: تعيين طلب صيانة
      - complaint_resolved  : حل شكوى
    """
    details = details or {}

    try:
        user = await _get_user(db, user_id=user_id, username=username, email=email)
        if not user or not user.get("email"):
            return

        to_email = user["email"]
        name = user.get("full_name") or user.get("username", "")
        reset_link = f"{frontend_url}/forgot-password"

        # ── Security events ────────────────────────────────────────────────
        if event == "rate_limited":
            await email_service.send_security_alert(
                to_email=to_email, username=name,
                event_type="rate_limited",
                event_details=f"تم رصد {details.get('attempts', 5)} محاولة دخول فاشلة على حسابك.",
                reset_link=reset_link,
                ip_address=details.get("ip", ""),
            )

        elif event == "failed_login":
            await email_service.send_security_alert(
                to_email=to_email, username=name,
                event_type="failed_login",
                event_details="تم رصد محاولة دخول فاشلة على حسابك.",
                reset_link=reset_link,
                ip_address=details.get("ip", ""),
            )

        elif event == "password_changed":
            await email_service.send_security_alert(
                to_email=to_email, username=name,
                event_type="password_changed",
                event_details="تم تغيير كلمة مرور حسابك بنجاح.",
                ip_address=details.get("ip", ""),
            )

        # ── Subscription events ────────────────────────────────────────────
        elif event == "subscription_expiring":
            days = details.get("days_left", 7)
            await email_service.send_app_event_alert(
                to_email=to_email, username=name,
                event_title=f"اشتراكك ينتهي خلال {days} أيام",
                event_body=f"""
                    اشتراكك الحالي في HomeMe سينتهي خلال <strong>{days} أيام</strong>.<br><br>
                    لتجنب انقطاع الخدمة، يرجى تجديد اشتراكك في أقرب وقت.
                """,
                action_label="تجديد الاشتراك الآن",
                action_link=f"{frontend_url}/app/subscription",
                severity="warning",
            )

        elif event == "subscription_expired":
            await email_service.send_app_event_alert(
                to_email=to_email, username=name,
                event_title="انتهى اشتراكك في HomeMe",
                event_body="""
                    للأسف انتهت صلاحية اشتراكك وتم تعليق بعض المميزات المتقدمة.<br><br>
                    يمكنك تجديد اشتراكك في أي وقت لاستعادة كامل الخدمات.
                """,
                action_label="تجديد الاشتراك",
                action_link=f"{frontend_url}/app/subscription",
                severity="error",
            )

        elif event == "payment_confirmed":
            plan = details.get("plan_name", "")
            amount = details.get("amount", "")
            await email_service.send_app_event_alert(
                to_email=to_email, username=name,
                event_title="✅ تم تأكيد دفعتك",
                event_body=f"""
                    تم استلام دفعتك وتفعيل اشتراك <strong>{plan}</strong> بنجاح.<br>
                    المبلغ المدفوع: <strong>{amount}</strong><br><br>
                    سيتم إرسال الفاتورة الضريبية في رسالة منفصلة.
                """,
                action_label="عرض لوحة التحكم",
                action_link=f"{frontend_url}/app/dashboard",
                severity="success",
            )

        elif event == "payment_rejected":
            await email_service.send_app_event_alert(
                to_email=to_email, username=name,
                event_title="⚠️ لم يتم التحقق من دفعتك",
                event_body=f"""
                    للأسف لم نتمكن من التحقق من الدفعة المرسلة.<br>
                    السبب: {details.get("reason", "بيانات الدفع غير مكتملة")}<br><br>
                    يرجى إعادة إرسال إيصال الدفع أو التواصل مع الدعم الفني.
                """,
                action_label="إعادة إرسال الإيصال",
                action_link=f"{frontend_url}/app/subscription",
                severity="error",
            )

        # ── Operations events ──────────────────────────────────────────────
        elif event == "smoke_test_failed":
            failed = details.get("failed_tests", [])
            failed_list = "<br>".join([f"• {t}" for t in failed]) if failed else "اختبارات متعددة"
            await email_service.send_app_event_alert(
                to_email=to_email, username=name,
                event_title="🚨 تنبيه: فشل في اختبارات النظام",
                event_body=f"""
                    تم رصد فشل في الاختبارات التلقائية للنظام:<br><br>
                    {failed_list}<br><br>
                    يرجى مراجعة النظام للتأكد من سلامة الخدمة.
                """,
                action_label="مراجعة لوحة التحكم",
                action_link=f"{frontend_url}/app/dashboard",
                severity="error",
            )

        elif event == "maintenance_assigned":
            await email_service.send_app_event_alert(
                to_email=to_email, username=name,
                event_title="🔧 تم تعيين طلب الصيانة",
                event_body=f"""
                    تم تعيين طلب صيانتك رقم <strong>#{details.get('request_id', '')}</strong>.<br>
                    الفني المسؤول: <strong>{details.get('technician', 'فني الصيانة')}</strong><br>
                    الموعد المتوقع: <strong>{details.get('scheduled', 'قريباً')}</strong>
                """,
                action_label="تتبع الطلب",
                action_link=f"{frontend_url}/app/maintenance",
                severity="info",
            )

        elif event == "complaint_resolved":
            await email_service.send_app_event_alert(
                to_email=to_email, username=name,
                event_title="✅ تم حل شكواك",
                event_body=f"""
                    تمت معالجة شكواك رقم <strong>#{details.get('complaint_id', '')}</strong> بنجاح.<br>
                    الرد: {details.get('resolution', 'تمت المعالجة من قِبل فريق الإدارة')}
                """,
                action_label="عرض التفاصيل",
                action_link=f"{frontend_url}/app/complaints",
                severity="success",
            )

    except Exception as e:
        logger.warning(f"notify_event({event}) failed: {e}")
