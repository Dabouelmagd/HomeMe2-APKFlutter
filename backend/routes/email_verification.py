"""
Email verification flow — extends existing custom JWT auth without changing core logic.

Tokens are one-time use, 24h TTL, stored as DB rows (not signed JWTs) so they can
be revoked / used exactly once. TTL index auto-purges expired rows.

Endpoints:
- GET  /api/auth/verify-email/{token}          (public; activates account)
- POST /api/auth/resend-verification           (public; rate-limited)
"""
import logging
import os
import secrets
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr

from database import get_db
from email_service import email_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

# Verification token lifetime — 24h.
TOKEN_TTL_HOURS = 24

# Resend cooldown — 60s per email address.
RESEND_COOLDOWN_SECONDS = 60

APP_URL = os.environ.get("REACT_APP_BACKEND_URL", os.environ.get("APP_URL", "https://homemeapp.net")).rstrip("/")


# ---------------------------- Helpers ---------------------------- #

async def create_verification_token(user_id: str, email: str) -> str:
    """Generate, store, and return a one-time verification token."""
    db = get_db()
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS)
    await db.email_verification_tokens.insert_one({
        "token": token,
        "user_id": user_id,
        "email": (email or "").lower(),
        "created_at": datetime.now(timezone.utc),
        "expires_at": expires_at,
        "used": False,
    })
    return token


async def send_verification_email_for_user(user_id: str, email: str, full_name: str) -> bool:
    """Generate token + send email. Returns True on send success."""
    token = await create_verification_token(user_id, email)
    verification_url = f"{APP_URL}/verify-email?token={token}"
    return await email_service.send_verification_email(
        to_email=email,
        full_name=full_name or "صديقنا الكريم",
        verification_url=verification_url,
    )


# ---------------------------- Pydantic Models ---------------------------- #

class ResendVerificationRequest(BaseModel):
    email: EmailStr


# ---------------------------- Endpoints ---------------------------- #

@router.get("/auth/verify-email/{token}")
async def verify_email(token: str):
    """Idempotent: if user is already verified, still returns success."""
    db = get_db()
    record = await db.email_verification_tokens.find_one({"token": token})
    if not record:
        raise HTTPException(404, "رابط التحقق غير صحيح أو مستخدم من قبل")

    # Expired? MongoDB returns naive datetimes — compare with a naive UTC
    # `now` to avoid TypeError on offset comparison.
    expires_at = record["expires_at"]
    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    expires_naive = expires_at.replace(tzinfo=None) if expires_at.tzinfo else expires_at
    if expires_naive < now_naive:
        raise HTTPException(410, "انتهت صلاحية رابط التحقق. اطلب رابطاً جديداً.")

    # Locate user (by id or fallback by email)
    user = await db.users.find_one({"id": record["user_id"]})
    if not user:
        user = await db.users.find_one({"email": record["email"]})
    if not user:
        raise HTTPException(404, "الحساب المرتبط بالرابط غير موجود")

    # If already verified — idempotent success.
    if user.get("email_verified") is True:
        await db.email_verification_tokens.delete_one({"token": token})
        return {
            "verified": True,
            "already_verified": True,
            "message": "تم تأكيد بريدك مسبقاً. يمكنك تسجيل الدخول الآن.",
            "username": user.get("username"),
        }

    # Mark user verified.
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"email_verified": True, "email_verified_at": datetime.now(timezone.utc)}},
    )
    await db.email_verification_tokens.delete_one({"token": token})

    # Fire-and-forget welcome email after verification.
    try:
        compound_name = None
        if user.get("compound_id"):
            comp = await db.compounds.find_one({"id": user["compound_id"]})
            if comp:
                compound_name = comp.get("name")
        import asyncio
        asyncio.create_task(
            email_service.send_welcome_email(
                to_email=user["email"],
                full_name=user.get("full_name", ""),
                username=user.get("username", ""),
                compound_name=compound_name,
            )
        )
    except Exception as e:
        logger.warning(f"welcome email after verification failed: {e}")

    return {
        "verified": True,
        "already_verified": False,
        "message": "تم تأكيد بريدك بنجاح! يمكنك الآن تسجيل الدخول.",
        "username": user.get("username"),
    }


@router.post("/auth/resend-verification")
async def resend_verification(payload: ResendVerificationRequest, request: Request):
    """Rate-limited resend. Doesn't reveal whether the email exists (no enumeration)."""
    db = get_db()
    email = payload.email.lower().strip()

    user = await db.users.find_one({"email": email})
    # Always return the same generic message — never leak account existence.
    generic_response = {
        "sent": True,
        "message": "إذا كان البريد مسجلاً في النظام وغير مُؤكد، فستصلك رسالة تحقق خلال دقيقة.",
    }

    if not user:
        return generic_response

    # Already verified — silently succeed (don't reveal verification state either).
    if user.get("email_verified") is True:
        return generic_response

    # Rate limit by latest token created for this email.
    cooldown_cutoff = datetime.now(timezone.utc) - timedelta(seconds=RESEND_COOLDOWN_SECONDS)
    # MongoDB stores naive UTC — convert for the query.
    cooldown_cutoff_naive = cooldown_cutoff.replace(tzinfo=None)
    recent = await db.email_verification_tokens.find_one(
        {"email": email, "created_at": {"$gt": cooldown_cutoff_naive}}
    )
    if recent:
        # Respond identically — don't leak rate-limit details.
        return generic_response

    # Send new verification email.
    try:
        await send_verification_email_for_user(
            user_id=user["id"],
            email=user["email"],
            full_name=user.get("full_name", ""),
        )
    except Exception as e:
        logger.error(f"resend verification email failed: {e}")

    return generic_response
