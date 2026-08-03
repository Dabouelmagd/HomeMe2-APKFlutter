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
from email_header import wrap_email

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
    body = f"""
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">مرحباً، {full_name} 👋</h2>
      <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.7;">
        تم إنشاء حسابك على منصة <strong>HomeMe</strong> بنجاح.<br>هذه بياناتك للدخول:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid #bbf7d0;">
        {compound_block}
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:14px;">الدور:</td>
          <td style="padding:8px 0;font-weight:600;color:#111827;font-size:14px;">{role_label}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:14px;">اسم المستخدم:</td>
          <td style="padding:8px 0;font-family:monospace;font-size:16px;font-weight:700;color:#059669;letter-spacing:0.5px;">{username}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:14px;">كلمة المرور:</td>
          <td style="padding:8px 0;font-family:monospace;font-size:16px;font-weight:700;color:#dc2626;letter-spacing:1px;">{password}</td>
        </tr>
      </table>
      <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">⚠️ يُرجى تغيير كلمة المرور فور تسجيل الدخول الأول.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="{APP_PUBLIC_URL}" style="background:linear-gradient(135deg,#059669,#047857);color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">
          🔑 تسجيل الدخول الآن
        </a>
      </div>
    """
    return wrap_email(body, title="أهلاً بك في HomeMe", subtitle="منصة إدارة المجمعات السكنية الذكية", compound_name=compound_name or "").strip()


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
