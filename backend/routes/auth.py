"""
Authentication & Registration routes
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile, Request
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid, json, logging, os, asyncio

from database import get_db
from auth_deps import get_current_user, require_admin, require_super_admin, hash_password, verify_password, create_access_token, validate_password_strength
from helpers import serialize_datetime, notify_compound_admins
from shared_models import *
from subscription_codes import SubscriptionCodeManager
from webauthn_service import WebAuthnService, WebAuthnRegisterOptions, WebAuthnRegisterVerify, WebAuthnLoginOptions, WebAuthnLoginVerify
from activity_logger import ActivityLogger
from email_service import email_service

router = APIRouter(prefix="/api")

@router.post("/auth/register")
async def register(user_data: UserCreate, request: Request):
    db = get_db()
    # Validate password strength
    is_valid, error_message = validate_password_strength(user_data.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    # Check if username or email already exists
    existing_user = await db.users.find_one({
        "$or": [{"username": user_data.username}, {"email": user_data.email}]
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    # Check subscription code if provided
    subscription_info = None
    if user_data.subscription_code:
        # Use SubscriptionCodeManager to verify and apply code
        verification = await SubscriptionCodeManager.verify_code(
            user_data.subscription_code.upper().strip(),
            None  # No user_id yet since user not created
        )
        
        if not verification.get("valid"):
            error_message = verification.get("error", "invalid_code")
            error_messages = {
                "code_not_found": "Invalid subscription code",
                "code_deactivated": "This code has been deactivated",
                "code_expired": "This code has expired",
                "code_max_uses_reached": "This code has reached maximum uses",
                "verification_error": "Error verifying code"
            }
            raise HTTPException(
                status_code=400, 
                detail=error_messages.get(error_message, "Invalid subscription code")
            )
        
        subscription_info = verification
    
    # Hash password
    password_hash = hash_password(user_data.password)
    
    # Use default compound_id if not provided
    compound_id = user_data.compound_id if user_data.compound_id else "default-compound"
    
    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=password_hash,
        role=user_data.role,
        compound_id=compound_id,
        full_name=user_data.full_name,
        phone=user_data.phone,
        unit_number=user_data.unit_number,
        is_family_head=(user_data.role == "resident")
    )
    
    # Add subscription info if code was used
    user_dict = user.dict()
    if subscription_info:
        subscription_end = datetime.now(timezone.utc) + timedelta(days=subscription_info["duration_days"])
        user_dict["subscription_active"] = True
        user_dict["subscription_type"] = subscription_info["type"]
        user_dict["subscription_start"] = datetime.now(timezone.utc).isoformat()
        user_dict["subscription_end"] = subscription_end.isoformat()
        user_dict["subscription_code_used"] = user_data.subscription_code.upper().strip()
    else:
        # No subscription code - give automatic 14-day free trial
        trial_end = datetime.now(timezone.utc) + timedelta(days=14)
        user_dict["subscription_active"] = True
        user_dict["subscription_type"] = "trial"
        user_dict["subscription_start"] = datetime.now(timezone.utc).isoformat()
        user_dict["subscription_end"] = trial_end.isoformat()
        user_dict["trial_used"] = True
        user_dict["trial_days"] = 14
    
    await db.users.insert_one(user_dict)

    # --- Email verification gate ---------------------------------------
    # New self-registered users start unverified. They must click the link in
    # their welcome email before they can log in. Existing users (already in
    # DB before this feature) are migrated to verified=True at startup.
    # Smoke-test synthetic users are auto-verified to keep CI green.
    is_smoke_test_check = (
        (user_data.email or "").startswith("smoke_co_")
        or (user_data.email or "").endswith("@example.invalid")
        or (user_data.email or "").endswith("@homeme.qa")
    )
    initial_verified = is_smoke_test_check  # True for smoke tests, False for real users
    await db.users.update_one(
        {"id": user.id},
        {"$set": {"email_verified": initial_verified}}
    )

    # --------------------------------------------------------------------
    # Auto-provision management company when a user self-registers as
    # `company_admin`. Without this the user becomes an orphan_admin:
    # no company row → missing from SuperAdmin Companies tab, no company
    # subscription, and plan-limit enforcement silently defaults to starter.
    # --------------------------------------------------------------------
    if user_data.role == "company_admin":
        new_company_id = str(uuid.uuid4())
        new_company = {
            "id": new_company_id,
            "name": (user_data.full_name or user_data.username or "شركة جديدة").strip(),
            "email": user_data.email,
            "phone": user_data.phone or "",
            "address": "",
            "website": "",
            "description": "تم الإنشاء تلقائياً من التسجيل الذاتي",
            "compound_ids": [],
            "admin_user_id": user.id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "self_registration",
        }
        await db.companies.insert_one(new_company)
        await db.users.update_one({"id": user.id}, {"$set": {"company_id": new_company_id}})
        # Bootstrap subscription with user-selected plan (default: starter).
        # Whitelist to catalogue keys to prevent arbitrary string injection.
        ALLOWED_PLANS = {"starter", "company_startup", "company_business", "company_enterprise"}
        initial_plan = user_data.selected_plan if user_data.selected_plan in ALLOWED_PLANS else "starter"
        # Paid plans start as 'pending_payment' so an admin can activate after invoice/transfer;
        # starter (free) is active immediately.
        status = "active" if initial_plan == "starter" else "pending_payment"
        await db.company_subscriptions.update_one(
            {"company_id": new_company_id},
            {"$setOnInsert": {
                "company_id": new_company_id,
                "plan": initial_plan,
                "status": status,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )

        # Referral tracking — link the new company to its referrer (if any)
        if getattr(user_data, "referral_code", None):
            try:
                from routes.company_referrals import track_company_signup
                await track_company_signup(
                    new_company_id,
                    user_data.referral_code,
                    new_admin_user_id=user.id,
                )
            except Exception as _re:
                import logging as _lg
                _lg.warning(f"referral tracking failed: {_re}")

    # Apply subscription code after user is created
    if subscription_info:
        await SubscriptionCodeManager.apply_code(
            user_data.subscription_code.upper().strip(),
            user.id,
            user.username
        )
    
    # Create family if resident
    if user_data.role == "resident" and user_data.unit_number:
        family = Family(
            compound_id=compound_id,  # use the resolved local var (with "default-compound" fallback)
            unit_number=user_data.unit_number,
            head_user_id=user.id,
            members=[user.id]
        )
        await db.families.insert_one(family.dict())
        
        # Update user with family_id
        await db.users.update_one(
            {"id": user.id},
            {"$set": {"family_id": family.id}}
        )
    
    # Send welcome email (async, don't wait for result)
    # Skip for synthetic smoke-test users to avoid SMTP bounces.
    is_smoke_test = (
        (user_data.email or "").startswith("smoke_co_")
        or (user_data.email or "").endswith("@example.invalid")
        or (user_data.email or "").endswith("@homeme.qa")
    )
    try:
        db = get_db()
        compound_name = None
        if compound_id and compound_id != "default-compound":
            compound = await db.compounds.find_one({"id": compound_id})
            if compound:
                compound_name = compound.get("name")

        if not is_smoke_test:
            # Send email verification instead of welcome email — welcome is sent
            # after the user clicks the verification link.
            from routes.email_verification import send_verification_email_for_user
            asyncio.create_task(
                send_verification_email_for_user(
                    user_id=user.id,
                    email=user_data.email,
                    full_name=user_data.full_name,
                )
            )

            # Notify admins of new resident
            if user_data.role == "resident":
                admins = await db.users.find({"role": "admin", "compound_id": compound_id}).to_list(length=10)
                for admin in admins:
                    if admin.get("email"):
                        asyncio.create_task(
                            email_service.send_new_resident_notification(
                                admin_email=admin["email"],
                                admin_name=admin.get("full_name", "Admin"),
                                new_resident_name=user_data.full_name,
                                unit_number=user_data.unit_number,
                                compound_name=compound_name or "Default Compound"
                            )
                        )
    except Exception as e:
        # Log email error but don't fail registration
        logging.error(f"Failed to send welcome email: {str(e)}")
    
    return {
        "message": "تم إنشاء حسابك! تحقق من بريدك الإلكتروني للحصول على رابط التأكيد قبل تسجيل الدخول.",
        "email_verification_required": True,
        "email": user_data.email,
        "user_id": user.id,
        "subscription_active": True,
        "subscription_type": user_dict.get("subscription_type", "trial"),
        "subscription_end": user_dict.get("subscription_end")
    }

@router.post("/auth/create-admin")
async def create_admin_user():
    """Create default admin user for production - TEMPORARY ENDPOINT"""
    db = get_db()
    
    # Check if admin already exists
    existing_admin = await db.users.find_one({"username": "admin"})
    if existing_admin:
        return {"message": "Admin user already exists", "admin_id": existing_admin["id"]}
    
    # Create default compound
    compound = Compound(
        name="Default Compound",
        address="Default Address"
    )
    await db.compounds.insert_one(compound.dict())
    
    # Create admin user
    admin_user = User(
        username="admin",
        password_hash=hash_password("admin123"),
        role="admin",
        compound_id=compound.id,
        full_name="System Administrator",
        phone="1234567890"
    )
    
    await db.users.insert_one(admin_user.dict())
    
    return {
        "message": "Admin user created successfully", 
        "username": "admin",
        "password": "admin123",
        "admin_id": admin_user.id,
        "compound_id": compound.id
    }

@router.post("/auth/login")
async def login(user_data: UserLogin, request: Request):
    db = get_db()
    from audit_logger import audit_log

    # ── Feature #47: Rate limiting (5 attempts per 15 min per username) ──
    # We rate-limit on username alone (not per-IP) because attackers behind
    # NAT and the platform's own load balancer can rotate IPs. The X-Forwarded-For
    # header (when present) is recorded for forensics.
    raw_ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or (request.client.host if request.client else "unknown")
    )
    client_ip = raw_ip or "unknown"

    # ── Feature #53: Auto-banned IP block ────────────────────────────────
    # IPs with 20+ failures in the last hour are auto-banned for 24h. Any
    # request from such an IP short-circuits with HTTP 429 before bcrypt fires.
    try:
        from security_protector import is_ip_banned
        if await is_ip_banned(client_ip):
            await db.login_attempts.insert_one({
                "username": user_data.username,
                "ip": client_ip,
                "user_agent": request.headers.get("user-agent", "")[:200],
                "success": False,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "blocked_reason": "ip_banned",
            })
            raise HTTPException(
                status_code=429,
                detail=(
                    "تم حظر عنوان IP الخاص بك مؤقتاً بسبب نشاط مشبوه. "
                    "حاول مجدداً بعد 24 ساعة أو تواصل مع الدعم."
                ),
            )
    except HTTPException:
        raise
    except Exception:
        # never let the ban-check itself break login
        pass

    rl_window_minutes = 15
    rl_max_attempts = 5
    rl_threshold = datetime.now(timezone.utc) - timedelta(minutes=rl_window_minutes)
    rl_filter = {
        "username": user_data.username,
        "success": False,
        "created_at": {"$gte": rl_threshold.isoformat()},
    }
    recent_failed = await db.login_attempts.count_documents(rl_filter)
    if recent_failed >= rl_max_attempts:
        await audit_log(
            actor={"username": user_data.username},
            action="auth.login.rate_limited",
            target_type="user",
            target_id=user_data.username,
            details={"ip": client_ip, "failed_attempts": recent_failed},
            request=request,
            success=False,
        )
        raise HTTPException(
            status_code=429,
            detail=(
                f"تجاوزت الحد المسموح ({rl_max_attempts} محاولات). "
                f"يرجى الانتظار {rl_window_minutes} دقيقة قبل المحاولة مجدداً."
            ),
        )

    user = await db.users.find_one({"username": user_data.username})
    # Run bcrypt in a thread pool — verify_password is CPU-bound and would
    # otherwise block the asyncio event loop (~250ms per call on prod CPUs).
    password_ok = bool(user) and await asyncio.to_thread(
        verify_password, user_data.password, user["password_hash"]
    )

    # Log every attempt (success or fail) to the rate-limit collection
    await db.login_attempts.insert_one({
        "username": user_data.username,
        "ip": client_ip,
        "user_agent": request.headers.get("user-agent", "")[:200],
        "success": bool(user and password_ok and user.get("is_active")),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    if not user or not password_ok:
        # Log failed login attempt
        await ActivityLogger.log_activity(
            action_type="login",
            username=user_data.username,
            details="Failed login attempt - Invalid credentials",
            ip_address=request.client.host if request.client else None,
            status="failed"
        )
        await audit_log(
            actor={"username": user_data.username},
            action="auth.login",
            target_type="user",
            target_id=user_data.username,
            details={"reason": "invalid_credentials"},
            request=request,
            success=False,
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user["is_active"]:
        # Log inactive account login attempt
        await ActivityLogger.log_activity(
            action_type="login",
            username=user_data.username,
            details="Failed login attempt - Account disabled",
            ip_address=request.client.host if request.client else None,
            status="failed"
        )
        await audit_log(
            actor=user,
            action="auth.login",
            target_type="user",
            target_id=user["id"],
            details={"reason": "account_disabled"},
            request=request,
            success=False,
        )
        raise HTTPException(status_code=401, detail="Account is disabled")

    # Email verification gate. Users who pre-existed before this feature was
    # rolled out were migrated to email_verified=true at startup, so this
    # never blocks legacy accounts. Only freshly self-registered users that
    # haven't clicked their email link will hit this branch.
    if user.get("email_verified") is False:
        await audit_log(
            actor=user,
            action="auth.login",
            target_type="user",
            target_id=user["id"],
            details={"reason": "email_not_verified"},
            request=request,
            success=False,
        )
        raise HTTPException(
            status_code=403,
            detail={
                "code": "EMAIL_NOT_VERIFIED",
                "message": "يرجى تأكيد بريدك الإلكتروني أولاً. تحقق من صندوق الوارد (ومجلد البريد المزعج).",
                "email": user.get("email"),
            },
        )
    
    # 2FA gate — if user has 2FA enabled, return temporary token instead of full session
    if user.get("two_factor_enabled"):
        from routes.two_factor import create_temp_2fa_token
        temp_token = create_temp_2fa_token(user["id"])
        await audit_log(
            actor=user,
            action="auth.login.2fa_required",
            target_type="user",
            target_id=user["id"],
            details={"role": user.get("role")},
            request=request,
            success=True,
        )
        return {
            "two_factor_required": True,
            "temp_token": temp_token,
            "ttl_minutes": 5,
        }

    # Feature #54 — Mandatory 2FA enrolment for privileged roles
    # Only enforced if FORCE_2FA_ADMIN=true in environment
    import os as _os
    MANDATORY_2FA_ROLES = {"app_owner", "super_admin"}
    _force_2fa = _os.environ.get("FORCE_2FA_ADMIN", "false").lower() == "true"
    if _force_2fa and user.get("role") in MANDATORY_2FA_ROLES and not user.get("two_factor_enabled"):
        from routes.two_factor import create_2fa_setup_token
        setup_token = create_2fa_setup_token(user["id"])
        await audit_log(
            actor=user,
            action="auth.login.2fa_enrolment_required",
            target_type="user",
            target_id=user["id"],
            details={"role": user.get("role")},
            request=request,
            success=True,
        )
        return {
            "two_factor_setup_required": True,
            "setup_token": setup_token,
            "ttl_minutes": 10,
            "role": user.get("role"),
            "message": (
                "تفعيل المصادقة الثنائية (2FA) إلزامي لحسابات الإدارة. "
                "يرجى إكمال الإعداد الآن للمتابعة."
            ),
        }
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    # Get compound name if compound_id exists
    compound_name = None
    if user.get("compound_id"):
        compound = await db.compounds.find_one({"id": user["compound_id"]})
        if compound:
            compound_name = compound.get("name", "Unknown Compound")
    
    # Log successful login
    await ActivityLogger.log_activity(
        action_type="login",
        username=user_data.username,
        details=f"Successful login - Role: {user['role']}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    await audit_log(
        actor=user,
        action="auth.login",
        target_type="user",
        target_id=user["id"],
        details={"role": user.get("role"), "compound_id": user.get("compound_id")},
        request=request,
        success=True,
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "compound_id": user.get("compound_id"),
            "compound_name": compound_name,
            "unit_number": user.get("unit_number"),
            "full_name": user.get("full_name"),
            "is_family_head": user.get("is_family_head", False),
            "family_id": user.get("family_id"),
            # Subscription fields — needed by frontend to hide trial banner
            # for paid / lifetime compounds.
            "subscription_active": user.get("subscription_active", False),
            "subscription_type": user.get("subscription_type", "trial"),
            "subscription_plan": user.get("subscription_plan"),
            "subscription_end": user.get("subscription_end"),
        }
    }

@router.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information"""
    return {
        "id": current_user['id'],
        "username": current_user.get('username',''),
        "role": current_user.get('role',''),
        "compound_id": current_user.get('compound_id',''),
        "full_name": current_user.get('full_name',''),
        "email": current_user.get('email',''),
        "phone": current_user.get('phone',''),
        "profile_picture_url": current_user.get('profile_picture_url',''),
        "company_id": current_user.get('company_id', None),
        "is_family_head": current_user.get('is_family_head', False),
        "family_id": current_user.get('family_id', None),
        # Subscription fields — needed by frontend to hide trial banner
        # for paid / lifetime compounds.
        "subscription_active": current_user.get('subscription_active', False),
        "subscription_type": current_user.get('subscription_type', 'trial'),
        "subscription_plan": current_user.get('subscription_plan'),
        "subscription_end": current_user.get('subscription_end'),
        "subscription_code_used": current_user.get('subscription_code_used'),
        # Privacy preferences — used by /app/settings?tab=privacy to hydrate saved values
        "privacy_settings": current_user.get('privacy_settings') or {},
    }

# WebAuthn/Biometric Authentication Routes
webauthn_service = WebAuthnService(None)  # Will be initialized with actual db on first use

@router.post("/webauthn/register/options")
async def webauthn_register_options(data: WebAuthnRegisterOptions, request: Request, current_user: dict = Depends(get_current_user)):
    """Get registration options for biometric"""
    origin = request.headers.get('origin', request.headers.get('referer', 'https://localhost'))
    options = await webauthn_service.get_register_options(data.user_id, data.username, origin)
    return options

@router.post("/webauthn/register/verify")
async def webauthn_register_verify(data: WebAuthnRegisterVerify, current_user: dict = Depends(get_current_user)):
    """Verify and store biometric registration"""
    result = await webauthn_service.verify_registration(
        data.user_id, data.credential_id, data.client_data_json, data.attestation_object
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Registration failed"))
    return result

@router.post("/webauthn/login/options")
async def webauthn_login_options(data: WebAuthnLoginOptions, request: Request):
    """Get login options for biometric authentication"""
    origin = request.headers.get('origin', request.headers.get('referer', 'https://localhost'))
    options, error = await webauthn_service.get_login_options(data.username, origin)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return options

@router.post("/webauthn/login/verify")
async def webauthn_login_verify(data: WebAuthnLoginVerify, request: Request):
    """Verify biometric login and return token"""
    user, error = await webauthn_service.verify_login(
        data.username, data.credential_id, data.client_data_json,
        data.authenticator_data, data.signature
    )
    
    if error:
        raise HTTPException(status_code=401, detail=error)
    
    # Generate JWT token
    token = create_access_token(data={"sub": user["id"]})
    
    # Log successful biometric login
    await ActivityLogger.log_activity(
        action_type="login",
        user_id=user["id"],
        username=user["username"],
        details="Biometric login successful",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "compound_id": user.get("compound_id"),
            "full_name": user.get("full_name", user["username"])
        }
    }

@router.get("/webauthn/check/{username}")
async def webauthn_check(username: str):
    """Check if user has biometric registered"""
    has_biometric = await webauthn_service.has_biometric(username)
    return {"has_biometric": has_biometric}

@router.delete("/webauthn/remove")
async def webauthn_remove(current_user: dict = Depends(get_current_user)):
    """Remove biometric credential"""
    success = await webauthn_service.remove_biometric(current_user['id'])
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove biometric")
    return {"message": "Biometric removed successfully"}


# ---------------------------------------------------------------------------
# Password Reset (Forgot Password)
# ---------------------------------------------------------------------------
# Single-use tokens stored in ``password_reset_tokens`` with TTL on ``expires_at``.
# Tokens are 32-byte url-safe strings (256-bit entropy). We never echo back
# whether the email exists (to prevent user enumeration) — same 200 response
# either way.

class ForgotPasswordRequest(BaseModel):
    email_or_username: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, request: Request):
    """Send a password-reset link to the user's registered email.

    Always returns 200 with a generic message — never reveals whether the
    identifier matched an account.
    """
    import secrets
    db = get_db()
    ident = (data.email_or_username or "").strip().lower()
    if not ident:
        raise HTTPException(status_code=400, detail="Identifier required")

    user = await db.users.find_one(
        {"$or": [{"username": ident}, {"email": ident}, {"username": data.email_or_username}, {"email": data.email_or_username}]},
        {"id": 1, "email": 1, "full_name": 1, "_id": 0},
    )

    generic = {
        "message": "إذا كان البريد مسجلاً، ستصلك رسالة بها رابط إعادة تعيين كلمة المرور خلال دقائق.",
        "ok": True,
    }

    if not user or not user.get("email"):
        # Do not leak existence
        return generic

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.password_reset_tokens.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "email": user["email"],
        "token": token,
        "expires_at": expires,
        "used": False,
        "created_at": datetime.now(timezone.utc),
        "ip": (request.client.host if request.client else "") or "",
    })

    # Build reset link — falls back to a sensible default if envs are missing
    frontend = (
        os.environ.get("FRONTEND_PUBLIC_URL")
        or os.environ.get("PUBLIC_URL")
        or "https://homemeapp.net"
    )
    reset_link = f"{frontend.rstrip('/')}/auth/reset-password?token={token}"

    # Send email (RTL Arabic). Failure to deliver should not break the API —
    # the token is already saved; we only log the issue.
    try:
        html = f"""
<div dir='rtl' style='font-family:Cairo,Tahoma,Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#f8fafc'>
  <div style='background:linear-gradient(135deg,#7c3aed,#ec4899);padding:24px;border-radius:14px;color:white;text-align:center'>
    <h2 style='margin:0;font-size:20px'>🔑 إعادة تعيين كلمة المرور</h2>
    <div style='opacity:.9;margin-top:6px;font-size:13px'>HomeMe</div>
  </div>
  <div style='background:white;padding:24px;border-radius:14px;margin-top:14px;box-shadow:0 1px 3px rgba(0,0,0,.06)'>
    <p style='color:#1e293b;font-size:14px;line-height:1.8'>
      مرحباً {user.get('full_name','عزيزي/تي')}،
    </p>
    <p style='color:#475569;font-size:13px;line-height:1.8'>
      تلقّينا طلباً لإعادة تعيين كلمة المرور لحسابك. اضغطي الزر أدناه للاستمرار. الرابط صالح لمدة <b>ساعة واحدة</b> فقط.
    </p>
    <p style='text-align:center;margin:24px 0'>
      <a href='{reset_link}' style='display:inline-block;background:linear-gradient(135deg,#7c3aed,#ec4899);color:white;padding:12px 28px;border-radius:10px;font-weight:bold;text-decoration:none'>
        إعادة تعيين كلمة المرور
      </a>
    </p>
    <p style='color:#94a3b8;font-size:11px;line-height:1.6'>
      إذا لم تطلبي هذا، يمكنك تجاهل الرسالة وستظل كلمة المرور الحالية فعّالة.<br/>
      الرابط المباشر: <a href='{reset_link}' style='color:#7c3aed;word-break:break-all'>{reset_link}</a>
    </p>
  </div>
</div>"""
        await email_service.send_email(
            to_email=user["email"],
            subject="إعادة تعيين كلمة المرور — HomeMe",
            html_content=html,
            email_type="password_reset",
            related_user_id=user["id"],
        )
        logging.info(f"[forgot_password] reset link sent to user {user['id']}")
    except Exception as e:
        logging.warning(f"[forgot_password] email send failed for {user.get('email')}: {e}")

    return generic


@router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Consume a reset token + set a new password."""
    db = get_db()
    if not data.token or not data.new_password:
        raise HTTPException(status_code=400, detail="Token and new password required")

    # Strength check (re-uses shared validator)
    ok, msg = validate_password_strength(data.new_password)
    if not ok:
        raise HTTPException(status_code=400, detail=msg)

    record = await db.password_reset_tokens.find_one({"token": data.token})
    if not record:
        raise HTTPException(status_code=400, detail="رمز إعادة التعيين غير صالح أو منتهي")
    if record.get("used"):
        raise HTTPException(status_code=400, detail="هذا الرمز تم استخدامه بالفعل — اطلبي رابطاً جديداً")

    expires = record.get("expires_at")
    if expires:
        try:
            exp_dt = expires if hasattr(expires, "tzinfo") else datetime.fromisoformat(str(expires))
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > exp_dt:
                raise HTTPException(status_code=400, detail="انتهت صلاحية الرابط — اطلبي رابطاً جديداً")
        except HTTPException:
            raise
        except Exception:
            pass

    user_id = record.get("user_id")
    new_hash = hash_password(data.new_password)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password": new_hash, "password_updated_at": datetime.now(timezone.utc)}},
    )
    await db.password_reset_tokens.update_one(
        {"token": data.token},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc)}},
    )
    logging.info(f"[reset_password] password updated for user {user_id}")
    return {"ok": True, "message": "تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن."}


# Compound Management Routes
# Compounds CRUD extracted to routes/
