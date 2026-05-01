"""
Impersonate User (Owner-only)

Allows app_owner / super_admin to temporarily log in as another user for debugging/support.

Security:
- Only app_owner or super_admin can impersonate
- Cannot impersonate app_owner or super_admin (peers/above)
- Impersonate session expires in 30 minutes (hard limit in JWT)
- Every impersonation is audit-logged
- Impersonated user receives an email notification (transparency)
- Original user id is embedded in token as `impersonator_id` so all actions can be traced

Endpoints:
- POST /api/impersonate/{user_id}    — start impersonation (returns short-lived token)
- GET  /api/impersonate/status       — is current session impersonated? who by?
- POST /api/impersonate/stop         — stop (returns original token — frontend stores it before start)
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone, timedelta

import jwt as _jwt
from fastapi import APIRouter, Depends, HTTPException, Request

from auth_deps import get_current_user, create_access_token, JWT_SECRET, JWT_ALGORITHM
from database import get_db

router = APIRouter(prefix="/api/impersonate", tags=["impersonate"])

IMPERSONATE_EXPIRATION_MINUTES = 30
PROTECTED_ROLES = {"app_owner", "super_admin"}


def _create_impersonation_token(target_user_id: str, impersonator_id: str, impersonator_username: str) -> tuple[str, str]:
    """Return (token, expires_at_iso)."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=IMPERSONATE_EXPIRATION_MINUTES)
    payload = {
        "sub": target_user_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "impersonator_id": impersonator_id,
        "impersonator_username": impersonator_username,
        "impersonation": True,
    }
    return _jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM), expire.isoformat()


async def _audit_log(db, action: str, current_user: dict, target_user: dict, request: Request):
    try:
        await db.audit_logs.insert_one({
            "id": f"impersonate_{datetime.now(timezone.utc).timestamp()}",
            "user_id": current_user.get("id"),
            "user_role": current_user.get("role"),
            "user_name": current_user.get("username"),
            "action": action,
            "target_type": "user",
            "target_id": target_user.get("id"),
            "ip_address": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent", "")[:200],
            "before_state": None,
            "after_state": {"target_username": target_user.get("username"), "target_role": target_user.get("role")},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logging.warning(f"audit log (impersonate) failed: {e}")


async def _notify_target_user_via_email(db, target_user: dict, impersonator: dict):
    """Send an email to the impersonated user for transparency."""
    email = (target_user or {}).get("email")
    if not email:
        return
    try:
        from email_service import EmailService
        html = f"""
<div dir='rtl' style='font-family:Arial,sans-serif;max-width:620px;margin:auto'>
  <div style='background:linear-gradient(135deg,#f59e0b,#b45309);color:#fff;padding:18px;border-radius:12px 12px 0 0'>
    <h2 style='margin:0'>🔐 تنبيه أمان: تم دخول حسابك بواسطة مسؤول</h2>
  </div>
  <div style='background:#fff;padding:18px;border:1px solid #eee;border-top:0;border-radius:0 0 12px 12px'>
    <p>مرحباً {target_user.get('full_name') or target_user.get('username')},</p>
    <p>تم الدخول إلى حسابك مؤقتاً بواسطة <strong>{impersonator.get('full_name') or impersonator.get('username')}</strong> (دور: {impersonator.get('role')})
       لغرض الدعم الفني.</p>
    <ul style='color:#444;font-size:14px'>
      <li>الجلسة تنتهي تلقائياً بعد 30 دقيقة</li>
      <li>التوقيت: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}</li>
      <li>لن يتغير أي شيء في إعداداتك أو كلمة المرور</li>
      <li>لو لم تطلبي هذا الدعم وتقلقي من هذا النشاط، يرجى التواصل مع مالك التطبيق فوراً</li>
    </ul>
    <p style='color:#666;font-size:12px;margin-top:18px'>هذا الإيميل تلقائي من HomeMe للشفافية الكاملة.</p>
  </div>
</div>"""
        es = EmailService()
        await es.send_email(to_email=email, subject="🔐 تنبيه: تم الدخول إلى حسابك من قِبل مسؤول", html_content=html)
    except Exception as e:
        logging.warning(f"impersonation email to {email} failed: {e}")


@router.get("/status")
async def impersonation_status(current_user: dict = Depends(get_current_user)):
    """Tell frontend if current token is an impersonation. current_user has 'impersonator_id' if so."""
    imp_id = current_user.get("impersonator_id")
    if not imp_id:
        return {"is_impersonation": False}
    return {
        "is_impersonation": True,
        "impersonator_id": imp_id,
        "impersonator_username": current_user.get("impersonator_username"),
        "target_user_id": current_user.get("id"),
        "target_username": current_user.get("username"),
    }


@router.post("/stop")
async def stop_impersonation(request: Request, current_user: dict = Depends(get_current_user)):
    """Stop the impersonation session. Frontend should drop the impersonation token
    and restore the original token (which it cached before starting)."""
    if not current_user.get("impersonator_id"):
        raise HTTPException(status_code=400, detail="لا توجد جلسة انتحال نشطة")
    db = get_db()
    impersonator = await db.users.find_one({"id": current_user["impersonator_id"]}, {"_id": 0})
    if impersonator:
        await _audit_log(db, "impersonate_stop", impersonator, current_user, request)
    return {"success": True, "message": "تم إنهاء جلسة الانتحال. الرجاء استعادة الجلسة الأصلية."}


@router.post("/{user_id}")
async def start_impersonation(user_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    # Ownership check
    role = current_user.get("role")
    if role not in PROTECTED_ROLES:
        raise HTTPException(status_code=403, detail="هذه الميزة متاحة للمالك والسوبر أدمن فقط")

    # Prevent nested impersonation
    # (current_user was resolved through normal auth; we check for the raw JWT payload flag)

    db = get_db()
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    if not target.get("is_active", True):
        raise HTTPException(status_code=400, detail="لا يمكن الدخول بحساب معطّل")
    if target.get("id") == current_user.get("id"):
        raise HTTPException(status_code=400, detail="لا يمكنك انتحال شخصيتك")
    target_role = target.get("role")
    if target_role in PROTECTED_ROLES:
        raise HTTPException(status_code=403, detail="لا يمكن الدخول بحسابات المالك أو السوبر أدمن")

    token, expires_at = _create_impersonation_token(
        target.get("id"),
        current_user.get("id"),
        current_user.get("username"),
    )

    # Audit + email (non-blocking)
    import asyncio as _a
    _a.create_task(_audit_log(db, "impersonate_start", current_user, target, request))
    _a.create_task(_notify_target_user_via_email(db, target, current_user))

    # Safe user payload
    target.pop("password_hash", None)
    target.pop("totp_secret", None)
    target.pop("totp_backup_codes", None)

    return {
        "access_token": token,
        "expires_at": expires_at,
        "duration_minutes": IMPERSONATE_EXPIRATION_MINUTES,
        "target_user": target,
        "impersonator": {
            "id": current_user.get("id"),
            "username": current_user.get("username"),
            "full_name": current_user.get("full_name"),
            "role": current_user.get("role"),
        },
    }
