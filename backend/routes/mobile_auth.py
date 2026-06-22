"""
Mobile Auth API — Feature #55
=============================

Flutter-friendly authentication endpoints. The web app keeps using
`/api/auth/register` + magic-link verification. Mobile uses 6-digit OTP
which is a much better UX inside a native app (no browser handoff).

Endpoints:
  POST /api/mobile/auth/register      → create user, return access_token + send OTP
  POST /api/mobile/auth/verify-otp    → mark email verified
  POST /api/mobile/auth/resend-otp    → re-issue OTP (rate-limited)
  POST /api/mobile/auth/login         → login + optional FCM device token

Differences from the web `/auth/register`:
  * Returns `access_token` immediately (auto-login, no email gate blocking app)
    but tracks `email_verified=False` until OTP is confirmed.
  * Accepts optional `device_token` (FCM) + `device_info` for push registration.
  * Email verification = 6-digit numeric OTP delivered by email, validated
    directly in the app. No browser redirect, no magic link.
  * Response shape is flat and explicitly typed for easy Dart class generation.
"""
import logging
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Literal

from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, EmailStr, Field

from auth_deps import (
    create_access_token,
    hash_password,
    verify_password,
    get_current_user,
)
from database import get_db
from email_service import EmailService
from shared_models import User

router = APIRouter(prefix="/api/mobile/auth", tags=["mobile-auth"])
logger = logging.getLogger(__name__)

# OTP settings
OTP_LENGTH = 6
OTP_TTL_MINUTES = 15
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_VERIFY_ATTEMPTS = 5


# ──────────────────────────── Pydantic models ────────────────────────────
class DeviceInfo(BaseModel):
    """Optional device context — purely for analytics + push targeting."""
    platform: Optional[Literal["ios", "android", "web"]] = None
    model: Optional[str] = Field(None, max_length=80)
    os_version: Optional[str] = Field(None, max_length=40)
    app_version: Optional[str] = Field(None, max_length=20)


class MobileRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=40,
                          pattern=r"^[a-zA-Z0-9_.\-]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=120)
    phone: Optional[str] = Field(None, max_length=20)

    role: Literal["resident", "compound_admin", "company_admin"]

    # Role-specific
    compound_id: Optional[str] = Field(None, max_length=80,
                                       description="REQUIRED for `resident`")
    unit_number: Optional[str] = Field(None, max_length=20,
                                       description="REQUIRED for `resident`")
    company_name: Optional[str] = Field(None, max_length=160,
                                        description="REQUIRED for `company_admin`")

    # Optional FCM + device
    device_token: Optional[str] = Field(None, max_length=300)
    device_info: Optional[DeviceInfo] = None

    # Optional referrals
    referral_code: Optional[str] = Field(None, max_length=40)


class MobileVerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=OTP_LENGTH, max_length=OTP_LENGTH)


class MobileResendOtpRequest(BaseModel):
    email: EmailStr


class MobileLoginRequest(BaseModel):
    username: str
    password: str
    device_token: Optional[str] = Field(None, max_length=300)
    device_info: Optional[DeviceInfo] = None


# ──────────────────────────── Helpers ────────────────────────────
def _strong_password(p: str) -> bool:
    """Same policy enforced as web — keeps mobile users on parity."""
    if len(p) < 8:
        return False
    if not re.search(r"[A-Z]", p):
        return False
    if not re.search(r"[a-z]", p):
        return False
    if not re.search(r"\d", p):
        return False
    return True


def _gen_otp() -> str:
    """Cryptographically-strong 6-digit OTP (zero-padded)."""
    return f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"


def _otp_email_html(otp: str, name: str) -> str:
    return f"""
    <div style='font-family:Arial;direction:rtl;text-align:right;color:#111;
                max-width:520px;margin:0 auto;line-height:1.7'>
      <h2 style='color:#4338ca'>أهلاً {name or 'بك'} 👋</h2>
      <p>كود التفعيل الخاص بك لتطبيق <strong>HomeMe</strong>:</p>
      <div style='font-size:34px;letter-spacing:14px;font-weight:900;
                  background:#f3f4f6;color:#111;padding:18px;
                  border-radius:12px;text-align:center'>
        {otp}
      </div>
      <p style='color:#6b7280;font-size:13px;margin-top:14px'>
        الكود صالح لمدة <strong>{OTP_TTL_MINUTES} دقيقة</strong>.
        إذا لم تطلب هذا الكود، تجاهل الإيميل.
      </p>
    </div>
    """


async def _issue_otp(db, user_id: str, email: str, full_name: str) -> bool:
    """Generate + persist + email an OTP. Returns True if mail dispatched."""
    code = _gen_otp()
    expires = datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES)
    # Invalidate any pending OTPs for this user first
    await db.email_otps.update_many(
        {"user_id": user_id, "used_at": None},
        {"$set": {"used_at": datetime.now(timezone.utc),
                  "invalidated_reason": "superseded"}},
    )
    await db.email_otps.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "email": email.lower(),
        "code": code,
        "expires_at": expires.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "attempts": 0,
        "used_at": None,
    })
    try:
        svc = EmailService()
        ok = await svc.send_email(
            to_email=email,
            subject="🔐 كود تفعيل حسابك في HomeMe",
            html_content=_otp_email_html(code, full_name),
        )
        return bool(ok)
    except Exception as e:
        logger.warning(f"[mobile-otp] email send failed for {email}: {e}")
        return False


async def _register_device_token(db, user_id: str, token: str,
                                  device_info: Optional[DeviceInfo]) -> None:
    """Idempotent FCM device registration."""
    if not token:
        return
    di = device_info.dict() if device_info else {}
    await db.device_tokens.update_one(
        {"user_id": user_id, "token": token},
        {"$set": {
            "user_id": user_id,
            "token": token,
            "platform": di.get("platform"),
            "model": di.get("model"),
            "os_version": di.get("os_version"),
            "app_version": di.get("app_version"),
            "active": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
         "$setOnInsert": {
            "id": str(uuid.uuid4()),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )


def _user_payload(user: dict) -> dict:
    """Compact, Flutter-friendly user shape."""
    return {
        "id": user["id"],
        "username": user.get("username"),
        "email": user.get("email"),
        "full_name": user.get("full_name"),
        "phone": user.get("phone"),
        "role": user.get("role"),
        "compound_id": user.get("compound_id"),
        "company_id": user.get("company_id"),
        "unit_number": user.get("unit_number"),
        "email_verified": bool(user.get("email_verified", False)),
        "two_factor_enabled": bool(user.get("two_factor_enabled", False)),
    }


# ──────────────────────────── Endpoints ────────────────────────────
@router.post("/register", status_code=201)
async def mobile_register(payload: MobileRegisterRequest, request: Request):
    """Create a new mobile-app user across all 3 roles.

    Returns:
        {
          access_token, token_type, user, otp_required, otp_ttl_minutes
        }

    The `access_token` is issued immediately so the Flutter app can call
    profile/dashboard APIs (RBAC enforces what each role can see). The
    `email_verified` flag stays False until OTP is confirmed; you can use it
    to render a banner / blocking screen in the app if desired.
    """
    db = get_db()

    if not _strong_password(payload.password):
        raise HTTPException(
            status_code=400,
            detail="كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على "
                   "حرف كبير وحرف صغير ورقم.",
        )

    # ── Role-specific validation ──
    role = payload.role
    if role == "resident":
        if not payload.compound_id:
            raise HTTPException(400, "compound_id مطلوب لحساب الساكن")
        if not payload.unit_number:
            raise HTTPException(400, "unit_number مطلوب لحساب الساكن")
        compound = await db.compounds.find_one(
            {"id": payload.compound_id}, {"_id": 0, "id": 1, "name": 1}
        )
        if not compound:
            raise HTTPException(404, "الكمبوند المحدد غير موجود")

    if role == "compound_admin" and not payload.compound_id:
        # Allow compound_admin to register without a compound (will be assigned later)
        # but log so the SuperAdmin can review.
        logger.info(
            f"[mobile] compound_admin registering without compound_id "
            f"(username={payload.username})"
        )

    if role == "company_admin" and not payload.company_name:
        raise HTTPException(400, "company_name مطلوب لحساب مدير شركة")

    # ── Uniqueness checks ──
    if await db.users.find_one(
        {"$or": [{"username": payload.username},
                 {"email": payload.email.lower()}]},
        {"_id": 1, "username": 1, "email": 1},
    ):
        raise HTTPException(
            status_code=409,
            detail="اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل",
        )

    # ── Create user ──
    pwd_hash = hash_password(payload.password)
    new_user_id = str(uuid.uuid4())
    user = User(
        id=new_user_id,
        username=payload.username,
        email=payload.email.lower(),
        password_hash=pwd_hash,
        role=role,
        compound_id=payload.compound_id or "default-compound",
        full_name=payload.full_name,
        phone=payload.phone or "",
        unit_number=payload.unit_number,
        is_family_head=(role == "resident"),
    )
    user_dict = user.dict()
    # 14-day trial for everyone
    trial_end = datetime.now(timezone.utc) + timedelta(days=14)
    user_dict.update({
        "subscription_active": True,
        "subscription_type": "trial",
        "subscription_start": datetime.now(timezone.utc).isoformat(),
        "subscription_end": trial_end.isoformat(),
        "trial_used": True,
        "trial_days": 14,
        "email_verified": False,
        "registration_source": "mobile",
    })
    await db.users.insert_one(user_dict)

    # ── company_admin: auto-provision company + subscription ──
    company_id = None
    if role == "company_admin":
        company_id = str(uuid.uuid4())
        await db.companies.insert_one({
            "id": company_id,
            "name": payload.company_name.strip(),
            "email": payload.email.lower(),
            "phone": payload.phone or "",
            "address": "",
            "website": "",
            "description": "تم الإنشاء تلقائياً من تطبيق الموبايل",
            "compound_ids": [],
            "admin_user_id": new_user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "mobile_registration",
        })
        await db.users.update_one(
            {"id": new_user_id}, {"$set": {"company_id": company_id}}
        )
        await db.company_subscriptions.update_one(
            {"company_id": company_id},
            {"$setOnInsert": {
                "company_id": company_id,
                "plan": "starter",
                "status": "active",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )

        # Referral tracking (same as web)
        if payload.referral_code:
            try:
                from routes.company_referrals import track_company_signup
                await track_company_signup(
                    company_id, payload.referral_code,
                    new_admin_user_id=new_user_id,
                )
            except Exception as e:
                logger.warning(f"[mobile] referral tracking failed: {e}")

    # ── FCM device registration (optional) ──
    await _register_device_token(
        db, new_user_id,
        payload.device_token or "",
        payload.device_info,
    )

    # ── Send OTP for verification (best-effort) ──
    otp_sent = await _issue_otp(db, new_user_id, payload.email,
                                payload.full_name)

    # ── Mint access token + audit ──
    access_token = create_access_token({"sub": new_user_id})
    try:
        from audit_logger import audit_log
        await audit_log(
            actor={"id": new_user_id, "username": payload.username, "role": role},
            action="mobile.auth.register",
            target_type="user",
            target_id=new_user_id,
            details={"role": role, "company_id": company_id,
                     "otp_sent": otp_sent},
            request=request,
            success=True,
        )
    except Exception:
        pass

    fresh = await db.users.find_one({"id": new_user_id}, {"_id": 0})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": _user_payload(fresh),
        "company_id": company_id,
        "otp_required": True,
        "otp_sent": otp_sent,
        "otp_ttl_minutes": OTP_TTL_MINUTES,
        "message": (
            "تم إنشاء الحساب. أرسلنا رمز التفعيل إلى بريدك الإلكتروني."
            if otp_sent else
            "تم إنشاء الحساب. تعذّر إرسال الإيميل — استخدم زر إعادة الإرسال."
        ),
    }


@router.post("/verify-otp")
async def mobile_verify_otp(payload: MobileVerifyOtpRequest):
    """Verify the 6-digit OTP and mark email as verified."""
    db = get_db()
    email = payload.email.lower()
    code = payload.otp.strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(404, "البريد الإلكتروني غير مسجل")

    otp_doc = await db.email_otps.find_one(
        {"email": email, "used_at": None},
        sort=[("created_at", -1)],
    )
    if not otp_doc:
        raise HTTPException(400, "لا يوجد كود تفعيل نشط — اطلب إرسال كود جديد")

    # TTL check
    try:
        exp = datetime.fromisoformat(otp_doc["expires_at"])
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > exp:
            raise HTTPException(410, "انتهت صلاحية الكود — اطلب كوداً جديداً")
    except (KeyError, ValueError):
        raise HTTPException(400, "كود غير صالح")

    # Max attempts
    if otp_doc.get("attempts", 0) >= OTP_MAX_VERIFY_ATTEMPTS:
        await db.email_otps.update_one(
            {"id": otp_doc["id"]},
            {"$set": {"used_at": datetime.now(timezone.utc),
                      "invalidated_reason": "too_many_attempts"}},
        )
        raise HTTPException(429, "تجاوزت عدد المحاولات. اطلب كوداً جديداً")

    # Constant-time-ish compare
    if otp_doc.get("code") != code:
        await db.email_otps.update_one(
            {"id": otp_doc["id"]},
            {"$inc": {"attempts": 1}},
        )
        remaining = max(0, OTP_MAX_VERIFY_ATTEMPTS - otp_doc.get("attempts", 0) - 1)
        raise HTTPException(
            400,
            f"كود خاطئ. باقي {remaining} محاولات",
        )

    # ✅ Success
    await db.email_otps.update_one(
        {"id": otp_doc["id"]},
        {"$set": {"used_at": datetime.now(timezone.utc).isoformat()}},
    )
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"email_verified": True,
                  "email_verified_at": datetime.now(timezone.utc).isoformat()}},
    )
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {
        "verified": True,
        "user": _user_payload(fresh),
        "message": "✅ تم تفعيل بريدك الإلكتروني بنجاح",
    }


@router.post("/resend-otp")
async def mobile_resend_otp(payload: MobileResendOtpRequest):
    """Re-issue an OTP. Cooldown enforced to prevent abuse."""
    db = get_db()
    email = payload.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        # Don't leak: return generic success even when unknown
        return {"sent": False, "message": "إذا كان البريد مسجلاً، أرسلنا كوداً جديداً"}
    if user.get("email_verified"):
        return {"sent": False, "message": "البريد مفعَّل بالفعل"}

    # Cooldown check
    last = await db.email_otps.find_one(
        {"email": email}, sort=[("created_at", -1)],
    )
    if last:
        try:
            ca = datetime.fromisoformat(last["created_at"])
            if ca.tzinfo is None:
                ca = ca.replace(tzinfo=timezone.utc)
            delta = (datetime.now(timezone.utc) - ca).total_seconds()
            if delta < OTP_RESEND_COOLDOWN_SECONDS:
                wait = int(OTP_RESEND_COOLDOWN_SECONDS - delta)
                raise HTTPException(
                    429,
                    f"يرجى الانتظار {wait} ثانية قبل طلب كود جديد",
                )
        except HTTPException:
            raise
        except Exception:
            pass

    sent = await _issue_otp(db, user["id"], email,
                            user.get("full_name") or user.get("username") or "")
    return {
        "sent": sent,
        "otp_ttl_minutes": OTP_TTL_MINUTES,
        "message": (
            "أرسلنا كوداً جديداً إلى بريدك الإلكتروني"
            if sent else
            "تعذّر إرسال الإيميل — حاول لاحقاً"
        ),
    }


@router.post("/login")
async def mobile_login(payload: MobileLoginRequest, request: Request):
    """Mobile login — supports FCM device registration in one call.

    Returns the same shape as `/register` so the Flutter app can use ONE
    response handler for both flows.
    """
    db = get_db()
    user = await db.users.find_one({"username": payload.username},
                                   {"_id": 0})
    if not user or not verify_password(payload.password,
                                        user.get("password_hash") or ""):
        raise HTTPException(401, "بيانات الدخول غير صحيحة")
    if not user.get("is_active", True):
        raise HTTPException(403, "تم تعطيل الحساب")

    # Mandatory 2FA — same enforcement as web (Feature #54)
    if user.get("role") in {"app_owner", "super_admin"} and not user.get("two_factor_enabled"):
        from routes.two_factor import create_2fa_setup_token
        return {
            "two_factor_setup_required": True,
            "setup_token": create_2fa_setup_token(user["id"]),
            "ttl_minutes": 10,
            "role": user.get("role"),
            "message": "تفعيل المصادقة الثنائية إلزامي لهذا الحساب",
        }
    if user.get("two_factor_enabled"):
        from routes.two_factor import create_temp_2fa_token
        return {
            "two_factor_required": True,
            "temp_token": create_temp_2fa_token(user["id"]),
            "ttl_minutes": 5,
        }

    # Register FCM token (if provided)
    await _register_device_token(
        db, user["id"], payload.device_token or "", payload.device_info,
    )

    access_token = create_access_token({"sub": user["id"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": _user_payload(user),
    }


@router.get("/me")
async def mobile_me(current_user: dict = Depends(get_current_user)):
    """Convenience: returns the same compact user shape as /register + /login."""
    return {"user": _user_payload(current_user)}
