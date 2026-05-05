"""
Credentials Email Service — sends a beautifully formatted welcome email
with login credentials to newly-created users (single or bulk).

Used by:
- routes/admin_users.py (single user creation)
- routes/bulk_import_residents.py (bulk import)
"""
import os
import logging
from typing import Optional

from email_service import email_service

logger = logging.getLogger(__name__)

APP_PUBLIC_URL = os.environ.get("APP_PUBLIC_URL", "https://homemeapp.net").rstrip("/")


def _build_credentials_email_html(
    full_name: str,
    username: str,
    password: str,
    compound_name: Optional[str] = None,
    role_label: str = "ساكن",
) -> str:
    """Returns RTL Arabic HTML email body with the user's credentials."""
    compound_block = (
        f'<tr><td style="padding:8px 0;color:#666;">المجمع:</td>'
        f'<td style="padding:8px 0;font-weight:600;color:#222;">{compound_name}</td></tr>'
        if compound_name else ""
    )
    return f"""
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#d946ef 100%);padding:36px 32px;text-align:center;color:#fff;">
          <h1 style="margin:0;font-size:26px;font-weight:800;letter-spacing:.5px;">🏠 أهلاً بك في HomeMe</h1>
          <p style="margin:10px 0 0;font-size:15px;opacity:.9;">منصة إدارة المجمعات السكنية الذكية</p>
        </td></tr>

        <!-- Greeting -->
        <tr><td style="padding:32px 32px 12px;text-align:right;">
          <h2 style="margin:0 0 12px;color:#1f2937;font-size:20px;">مرحباً، {full_name} 👋</h2>
          <p style="margin:0 0 8px;color:#4b5563;font-size:15px;line-height:1.7;">
            تم إنشاء حسابك على منصة HomeMe بنجاح. هذه بياناتك للدخول:
          </p>
        </td></tr>

        <!-- Credentials Box -->
        <tr><td style="padding:0 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#f9fafb,#fff);border:2px solid #e5e7eb;border-radius:12px;padding:20px 24px;text-align:right;">
            <tr><td style="padding:6px 0;color:#666;font-size:14px;width:120px;">الاسم الكامل:</td>
                <td style="padding:6px 0;font-weight:600;color:#222;">{full_name}</td></tr>
            <tr><td style="padding:6px 0;color:#666;font-size:14px;">الدور:</td>
                <td style="padding:6px 0;font-weight:600;color:#222;">{role_label}</td></tr>
            {compound_block}
            <tr><td colspan="2" style="padding-top:14px;border-top:1px dashed #d1d5db;"></td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:14px;">اسم المستخدم:</td>
                <td style="padding:8px 0;"><code style="background:#eef2ff;color:#4338ca;padding:4px 10px;border-radius:6px;font-size:15px;font-weight:700;">{username}</code></td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:14px;">كلمة المرور المؤقتة:</td>
                <td style="padding:8px 0;"><code style="background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:6px;font-size:15px;font-weight:700;letter-spacing:.5px;">{password}</code></td></tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:28px 32px;text-align:center;">
          <a href="{APP_PUBLIC_URL}/login" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:700;font-size:15px;box-shadow:0 4px 14px rgba(99,102,241,.4);">
            🔐 تسجيل الدخول الآن
          </a>
          <p style="margin:18px 0 0;color:#6b7280;font-size:12px;">
            أو افتح هذا الرابط: <a href="{APP_PUBLIC_URL}/login" style="color:#6366f1;">{APP_PUBLIC_URL}/login</a>
          </p>
        </td></tr>

        <!-- Security Note -->
        <tr><td style="padding:0 32px 28px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border-right:4px solid #f59e0b;border-radius:8px;padding:14px 18px;text-align:right;">
            <tr><td style="color:#92400e;font-size:13px;line-height:1.6;">
              <strong>🔒 ملاحظة أمنية:</strong> ننصحك بتغيير كلمة المرور بعد أول تسجيل دخول من صفحة الإعدادات. لا تشارك بياناتك مع أي شخص.
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            هذا البريد تم إرساله تلقائياً من منصة HomeMe.<br>
            إذا لم تكن تتوقع هذا البريد، يمكنك تجاهله بأمان.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
""".strip()


async def send_credentials_email(
    to_email: str,
    full_name: str,
    username: str,
    password: str,
    compound_name: Optional[str] = None,
    role: str = "resident",
) -> bool:
    """
    Send credentials email. Returns True if accepted by SMTP.
    
    Fails silently (logs error) — never raises, so it doesn't break user creation flow.
    """
    if not to_email:
        return False
    role_labels = {
        "resident": "ساكن",
        "admin": "مدير المجمع",
        "manager": "مدير",
        "company_admin": "مدير شركة الإدارة",
        "security": "موظف أمن",
        "owner": "مالك وحدة",
    }
    role_label = role_labels.get(role, role)
    try:
        html = _build_credentials_email_html(
            full_name=full_name,
            username=username,
            password=password,
            compound_name=compound_name,
            role_label=role_label,
        )
        subject = "🏠 بيانات تسجيل الدخول - HomeMe"
        ok = await email_service.send_email(to_email, subject, html)
        if ok:
            logger.info(f"Credentials email sent to {to_email}")
        else:
            logger.warning(f"Credentials email returned False for {to_email}")
        return ok
    except Exception as e:
        logger.error(f"Failed to send credentials email to {to_email}: {e}")
        return False
