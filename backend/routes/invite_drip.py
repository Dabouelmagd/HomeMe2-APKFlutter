"""
Invite Drip Campaigns — automated email reminders for unused invitation links.

Logic:
  - Every day at 09:00 UTC, scan compound_invites + family_invites.
  - For each invite that is:
        is_active = True
        used_count = 0
        not yet expired
        created_at >= 3 days ago
        (now - last_reminder_sent_at) >= 3 days  (or never reminded)
        max_reminders not exceeded (default cap = 3)
    → send a reminder email to the invite creator with:
        the original invite URL
        an embedded QR code (data: URI)
        a short Arabic "still pending" prompt
    → bump last_reminder_sent_at + reminder_count

  - The drip is OPT-OUT per invite via `drip_enabled = False`.
  - High-level admins can also trigger a manual run via
        POST /api/invite-drip/run    (app_owner / super_admin only)

The endpoint and scheduler share the same _process_drip implementation so the
behavior is identical and idempotent.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional
import io
import base64
import logging

import qrcode

from database import get_db
from auth_deps import get_current_user
from email_service import EmailService

router = APIRouter(prefix="/api")

DRIP_REMINDER_AFTER_DAYS = 3      # send after invite is N days old
DRIP_REMINDER_INTERVAL_DAYS = 3   # don't re-send within N days
DRIP_MAX_REMINDERS = 3            # never send more than N reminders per invite

logger = logging.getLogger(__name__)


def _build_join_url(rel_path: str, base_url: str) -> str:
    if rel_path.startswith("http"):
        return rel_path
    return f"{base_url.rstrip('/')}{rel_path}"


def _qr_data_uri(url: str) -> str:
    """Generate a tiny PNG QR code as a data URI for inline email embedding."""
    img = qrcode.make(url, box_size=6, border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def _is_expired(inv: dict, now: datetime) -> bool:
    exp = inv.get("expires_at")
    if not exp:
        return False
    try:
        d = datetime.fromisoformat(exp.replace("Z", "+00:00"))
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d < now
    except Exception:
        return False


def _is_due_for_reminder(inv: dict, now: datetime) -> bool:
    if not inv.get("is_active"):
        return False
    if inv.get("drip_enabled") is False:  # explicit opt-out
        return False
    if inv.get("used_count", 0) > 0:
        return False
    if _is_expired(inv, now):
        return False
    if (inv.get("reminder_count") or 0) >= DRIP_MAX_REMINDERS:
        return False

    created = inv.get("created_at")
    if not created:
        return False
    try:
        c_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        if c_dt.tzinfo is None:
            c_dt = c_dt.replace(tzinfo=timezone.utc)
        if (now - c_dt) < timedelta(days=DRIP_REMINDER_AFTER_DAYS):
            return False
    except Exception:
        return False

    last = inv.get("last_reminder_sent_at")
    if last:
        try:
            l_dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
            if l_dt.tzinfo is None:
                l_dt = l_dt.replace(tzinfo=timezone.utc)
            if (now - l_dt) < timedelta(days=DRIP_REMINDER_INTERVAL_DAYS):
                return False
        except Exception:
            pass
    return True


def _build_email_html(inviter_name: str, kind_label: str, url: str, qr_data_uri: str,
                      reminder_no: int, age_days: int, note: Optional[str]) -> str:
    note_block = (
        f'<p style="margin:8px 0 0;color:#6b7280;font-size:13px;font-style:italic">📝 {note}</p>'
        if note else ""
    )
    return f"""
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,Arial;
             background:#f9fafb;margin:0;padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="max-width:560px;margin:auto;background:#fff;border-radius:16px;
                overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.05)">
    <tr><td style="background:linear-gradient(135deg,#ec4899,#f43f5e);
                   padding:24px;text-align:center;color:#fff">
      <div style="font-size:11px;letter-spacing:2px;opacity:.9">HOMEME · تذكير دعوة</div>
      <h1 style="margin:8px 0 0;font-size:22px">⏰ رابط الدعوة لم يُستخدم بعد</h1>
    </td></tr>
    <tr><td style="padding:24px;color:#111827">
      <p style="margin:0 0 12px;font-size:15px">مرحباً <strong>{inviter_name or 'عزيزي المستخدم'}</strong>،</p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.7">
        مر <strong>{age_days} أيام</strong> على إنشائك رابط دعوة من نوع <strong>{kind_label}</strong>،
        ولم ينضم أحد من خلاله بعد. ربما تحتاج لإعادة إرساله.
      </p>
      {note_block}
      <div style="margin:20px 0;padding:16px;background:#f9fafb;border-radius:12px;
                   border:1px dashed #e5e7eb;text-align:center">
        <img src="{qr_data_uri}" alt="QR" width="180" height="180"
             style="display:block;margin:0 auto 12px" />
        <a href="{url}" style="word-break:break-all;color:#ec4899;font-size:12px;
           font-family:monospace;text-decoration:none">{url}</a>
      </div>
      <div style="text-align:center;margin:20px 0">
        <a href="{url}" style="display:inline-block;background:#ec4899;color:#fff;
           padding:12px 28px;border-radius:10px;font-weight:bold;text-decoration:none;font-size:14px">
          📤 إعادة مشاركة الرابط
        </a>
      </div>
      <p style="font-size:12px;color:#9ca3af;margin:24px 0 0;text-align:center">
        هذا التذكير رقم {reminder_no} من {DRIP_MAX_REMINDERS}.
        لإيقاف التذكيرات لهذا الرابط، يمكنك إلغاؤه من لوحة التحكم.
      </p>
    </td></tr>
    <tr><td style="background:#f3f4f6;padding:16px;text-align:center;
                   font-size:11px;color:#6b7280">
      © HomeMe · إدارة المجمعات السكنية
    </td></tr>
  </table>
</body>
</html>
"""


async def _process_drip(base_url: str = "https://homemeapp.net") -> dict:
    """Core drip routine. Returns {sent, skipped, errors}."""
    db = get_db()
    email_service = EmailService()
    now = datetime.now(timezone.utc)

    sent = 0
    errors = 0
    scanned = 0

    # Both collections are processed identically
    for coll_name, kind_label in (
        ("compound_invites", "دعوة مجمع"),
        ("family_invites", "دعوة عائلية"),
    ):
        cursor = db[coll_name].find(
            {"is_active": True, "used_count": 0},
            {"_id": 0},
        )
        async for inv in cursor:
            scanned += 1
            if not _is_due_for_reminder(inv, now):
                continue

            # Lookup inviter for email + name
            uid = inv.get("created_by")
            if not uid:
                continue
            inviter = await db.users.find_one({"id": uid}, {"_id": 0, "email": 1, "full_name": 1, "username": 1})
            if not inviter or not inviter.get("email"):
                continue

            try:
                join_path = inv.get("join_url")
                if not join_path:
                    # compound_invites stores token; family_invites also stores it
                    if coll_name == "compound_invites":
                        join_path = f"/join/{inv.get('token')}"
                    else:
                        join_path = f"/join-family/{inv.get('token')}"
                full_url = _build_join_url(join_path, base_url)
                qr = _qr_data_uri(full_url)

                created_at = inv.get("created_at")
                age_days = 0
                if created_at:
                    try:
                        c_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                        if c_dt.tzinfo is None:
                            c_dt = c_dt.replace(tzinfo=timezone.utc)
                        age_days = (now - c_dt).days
                    except Exception:
                        pass

                next_reminder_no = (inv.get("reminder_count") or 0) + 1
                html = _build_email_html(
                    inviter_name=inviter.get("full_name") or inviter.get("username") or "",
                    kind_label=kind_label,
                    url=full_url,
                    qr_data_uri=qr,
                    reminder_no=next_reminder_no,
                    age_days=age_days,
                    note=inv.get("note"),
                )
                ok = await email_service.send_email(
                    to_email=inviter["email"],
                    subject=f"⏰ تذكير: رابط الدعوة لم يُستخدم بعد ({age_days} أيام)",
                    html_content=html,
                    mailbox="main",
                )
                if ok:
                    await db[coll_name].update_one(
                        {"id": inv["id"]},
                        {
                            "$set": {"last_reminder_sent_at": now.isoformat()},
                            "$inc": {"reminder_count": 1},
                        },
                    )
                    sent += 1
                else:
                    errors += 1
            except Exception as e:
                logger.error(f"drip email failed for invite {inv.get('id')}: {e}")
                errors += 1

    return {"scanned": scanned, "sent": sent, "errors": errors, "ran_at": now.isoformat()}


# ----- Public endpoints (admin manual trigger) -------------------------------

@router.post("/invite-drip/run")
async def run_invite_drip(current_user: dict = Depends(get_current_user)):
    """Trigger a drip pass manually. Restricted to high-level admins."""
    if current_user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    result = await _process_drip()
    return {"success": True, **result}


@router.patch("/invites/{invite_id}/drip")
async def toggle_drip(invite_id: str, payload: dict, current_user: dict = Depends(get_current_user)):
    """Enable/disable drip per-invite. Body: {enabled: bool, kind: 'compound'|'family'}"""
    db = get_db()
    enabled = bool(payload.get("enabled", True))
    kind = payload.get("kind", "compound")
    coll = "compound_invites" if kind == "compound" else "family_invites"

    inv = await db[coll].find_one({"id": invite_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="الرابط غير موجود")
    if inv.get("created_by") != current_user.get("id") and current_user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية تعديل هذا الرابط")

    await db[coll].update_one(
        {"id": invite_id},
        {"$set": {"drip_enabled": enabled}},
    )
    return {"success": True, "drip_enabled": enabled}
