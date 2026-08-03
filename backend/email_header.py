"""
Shared email header/footer with official HomeMe logo.
Import this in all email builders.
"""

HOMEME_LOGO_URL = "https://homemeapp.net/homeme-logo.png"


def email_header(
    title: str = "HomeMe",
    subtitle: str = "منصة إدارة المجمعات السكنية",
    bg_color: str = "#064e3b",
    bg_gradient: str = "linear-gradient(135deg,#064e3b 0%,#065f46 60%,#047857 100%)",
) -> str:
    """Returns the standard HomeMe email header HTML with official logo."""
    return f"""
    <div style="background:{bg_gradient};padding:28px 32px 24px;text-align:center;border-radius:16px 16px 0 0;">
      <img
        src="{HOMEME_LOGO_URL}"
        alt="HomeMe"
        width="120"
        style="display:block;margin:0 auto 14px;background:#ffffff;border-radius:12px;padding:7px;box-shadow:0 2px 8px rgba(0,0,0,0.15);"
        onerror="this.style.display='none'"
      />
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#ffffff;font-family:Tahoma,Arial,sans-serif;">{title}</h1>
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.85);font-family:Tahoma,Arial,sans-serif;">{subtitle}</p>
    </div>"""


def email_footer(compound_name: str = "") -> str:
    """Returns the standard HomeMe email footer HTML."""
    compound_line = f"<p style='margin:4px 0;font-size:12px;color:#64748b;'>مجمع: {compound_name}</p>" if compound_name else ""
    return f"""
    <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;border-radius:0 0 16px 16px;margin-top:0;">
      <img src="{HOMEME_LOGO_URL}" alt="HomeMe" width="60" style="display:block;margin:0 auto 8px;opacity:0.6;" onerror="this.style.display='none'" />
      {compound_line}
      <p style="margin:4px 0;font-size:12px;color:#64748b;font-family:Tahoma,Arial,sans-serif;">
        هذا البريد تم إرساله تلقائياً من منصة <strong>HomeMe</strong>
      </p>
      <p style="margin:4px 0;font-size:11px;color:#94a3b8;font-family:Tahoma,Arial,sans-serif;">
        <a href="https://homemeapp.net" style="color:#059669;text-decoration:none;">homemeapp.net</a>
        &nbsp;|&nbsp; Data Life AI &nbsp;|&nbsp; © 2026
      </p>
    </div>"""


def wrap_email(
    body_html: str,
    title: str = "HomeMe",
    subtitle: str = "منصة إدارة المجمعات السكنية",
    bg_gradient: str = "linear-gradient(135deg,#064e3b 0%,#065f46 60%,#047857 100%)",
    compound_name: str = "",
) -> str:
    """Wraps body HTML with standard HomeMe header, layout, and footer."""
    return f"""<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Tahoma,Arial,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
        <tr><td>{email_header(title, subtitle, bg_gradient=bg_gradient)}</td></tr>
        <tr><td style="padding:28px 32px;direction:rtl;text-align:right;">{body_html}</td></tr>
        <tr><td>{email_footer(compound_name)}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
