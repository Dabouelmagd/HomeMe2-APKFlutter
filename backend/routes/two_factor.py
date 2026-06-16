"""
Two-Factor Authentication (TOTP) routes — RFC 6238 compliant.

Flow:
  1. POST /api/2fa/setup → returns secret + QR code (base64). Secret stored unverified.
  2. POST /api/2fa/verify-setup → verify 6-digit code → permanently enables 2FA + issues 8 backup codes.
  3. POST /api/2fa/disable → requires current TOTP code to disable.
  4. POST /api/2fa/verify-login → exchanges temp_token + TOTP code for full access_token.
  5. GET  /api/2fa/status → returns current 2FA status for the user.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
from io import BytesIO
from typing import Optional
import base64
import secrets
import string
import jwt
import os
import pyotp
import qrcode
import bcrypt

from database import get_db
from auth_deps import get_current_user, create_access_token, JWT_SECRET, JWT_ALGORITHM, verify_password

router = APIRouter(prefix="/api/2fa")

ISSUER = os.environ.get("TOTP_ISSUER_NAME", "HomeMe")
TEMP_TOKEN_TTL_MINUTES = 5
ELIGIBLE_ROLES = {"app_owner", "super_admin", "admin", "compound_admin", "company_admin"}


# ---------- Models ----------
class VerifySetupReq(BaseModel):
    token_code: str

class DisableReq(BaseModel):
    token_code: str
    password: str

class VerifyLoginReq(BaseModel):
    temp_token: str
    code: str


# ---------- Helpers ----------
def _gen_qr_base64(uri: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}"


def _gen_backup_codes(count: int = 8) -> list:
    return [
        "-".join([
            "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(4))
            for _ in range(2)
        ])
        for _ in range(count)
    ]


def create_temp_2fa_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "scope": "2fa_pending",
        "exp": datetime.utcnow() + timedelta(minutes=TEMP_TOKEN_TTL_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_2fa_setup_token(user_id: str) -> str:
    """Feature #54 — Mandatory 2FA enrolment token.

    Issued ONLY at login when an app_owner / super_admin authenticates
    successfully but hasn't enrolled in 2FA yet. It grants access ONLY to
    the 2FA setup endpoints (setup + verify-setup), not the rest of the app.
    """
    payload = {
        "sub": user_id,
        "scope": "2fa_setup",
        "exp": datetime.utcnow() + timedelta(minutes=10),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_temp_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Temporary token invalid or expired")
    if payload.get("scope") != "2fa_pending":
        raise HTTPException(status_code=401, detail="Invalid token scope")
    return payload


async def _user_from_setup_token(setup_token: str) -> dict:
    """Validate a `2fa_setup` scoped token and return the underlying user."""
    try:
        payload = jwt.decode(setup_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Setup token invalid or expired")
    if payload.get("scope") != "2fa_setup":
        raise HTTPException(status_code=401, detail="Invalid token scope")
    db = get_db()
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------- Endpoints ----------
@router.get("/status")
async def status(current_user: dict = Depends(get_current_user)):
    db = get_db()
    fresh = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "two_factor_enabled": 1})
    return {
        "enabled": bool(fresh and fresh.get("two_factor_enabled")),
        "eligible": current_user.get("role") in ELIGIBLE_ROLES,
    }


@router.post("/setup")
async def setup_2fa(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ELIGIBLE_ROLES:
        raise HTTPException(status_code=403, detail="2FA متاح فقط للمسؤولين")

    db = get_db()
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(
        name=current_user.get("username") or current_user.get("email") or current_user["id"],
        issuer_name=ISSUER,
    )
    qr_b64 = _gen_qr_base64(uri)

    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "two_factor_secret": secret,
            "two_factor_enabled": False,
            "two_factor_setup_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"qr_code": qr_b64, "secret": secret, "provisioning_uri": uri}


@router.post("/verify-setup")
async def verify_setup(req: VerifySetupReq, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user or not user.get("two_factor_secret"):
        raise HTTPException(status_code=400, detail="ابدأ إعداد 2FA أولاً")

    totp = pyotp.TOTP(user["two_factor_secret"])
    if not totp.verify(req.token_code, valid_window=1):
        raise HTTPException(status_code=400, detail="الرمز غير صحيح")

    plain_codes = _gen_backup_codes(8)
    hashed_codes = [bcrypt.hashpw(c.encode(), bcrypt.gensalt()).decode() for c in plain_codes]
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "two_factor_enabled": True,
            "two_factor_backup_codes": hashed_codes,
            "two_factor_backup_used": [],
            "two_factor_enabled_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"success": True, "backup_codes": plain_codes}


@router.post("/disable")
async def disable_2fa(req: DisableReq, current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user or not user.get("two_factor_enabled"):
        raise HTTPException(status_code=400, detail="2FA غير مُفعّل")

    # Re-auth: password must be valid
    if not user.get("password_hash") or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="كلمة المرور غير صحيحة")

    # And current TOTP must be valid
    totp = pyotp.TOTP(user.get("two_factor_secret", ""))
    if not totp.verify(req.token_code, valid_window=1):
        raise HTTPException(status_code=401, detail="رمز TOTP غير صحيح")

    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "two_factor_enabled": False,
            "two_factor_secret": None,
            "two_factor_backup_codes": [],
            "two_factor_backup_used": [],
        }},
    )
    return {"success": True}


@router.post("/verify-login")
async def verify_login(req: VerifyLoginReq):
    payload = decode_temp_token(req.temp_token)
    user_id = payload.get("sub")
    db = get_db()
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get("two_factor_enabled"):
        raise HTTPException(status_code=400, detail="حالة 2FA غير صحيحة")

    code = req.code.strip().upper().replace(" ", "")
    is_totp_ok = pyotp.TOTP(user["two_factor_secret"]).verify(code, valid_window=1)

    used_idx = -1
    if not is_totp_ok:
        used = set(user.get("two_factor_backup_used", []))
        for i, hashed in enumerate(user.get("two_factor_backup_codes", [])):
            if i in used:
                continue
            try:
                if bcrypt.checkpw(code.encode(), hashed.encode()):
                    used_idx = i
                    break
            except Exception:
                continue

    if not is_totp_ok and used_idx == -1:
        raise HTTPException(status_code=401, detail="الرمز غير صحيح")

    if used_idx >= 0:
        await db.users.update_one(
            {"id": user_id},
            {"$addToSet": {"two_factor_backup_used": used_idx}},
        )

    access_token = create_access_token(data={"sub": user_id})
    compound_name = None
    if user.get("compound_id"):
        compound = await db.compounds.find_one({"id": user["compound_id"]})
        if compound:
            compound_name = compound.get("name")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "backup_code_used": used_idx >= 0,
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
        },
    }



# ────────────────────────────────────────────────────────────────────────
# Feature #54 — Mandatory 2FA enrolment endpoints (setup-scoped token)
# ────────────────────────────────────────────────────────────────────────
class SetupWithTokenReq(BaseModel):
    setup_token: str


class VerifySetupWithTokenReq(BaseModel):
    setup_token: str
    token_code: str


@router.post("/setup-enroll")
async def setup_enroll(req: SetupWithTokenReq):
    """Issue a TOTP secret + QR for a user who is mid-mandatory-enrolment.

    Authenticated via the `2fa_setup` scoped JWT (not a normal session).
    """
    user = await _user_from_setup_token(req.setup_token)
    db = get_db()
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(
        name=user.get("username") or user.get("email") or user["id"],
        issuer_name=ISSUER,
    )
    qr_b64 = _gen_qr_base64(uri)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "two_factor_secret": secret,
            "two_factor_enabled": False,
            "two_factor_setup_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"qr_code": qr_b64, "secret": secret, "provisioning_uri": uri}


@router.post("/verify-enroll")
async def verify_enroll(req: VerifySetupWithTokenReq):
    """Confirm the TOTP code, mark 2FA enabled, issue final session token.

    Returns the same shape as `/api/auth/login` success so the frontend can
    transition seamlessly to the dashboard after enrolment.
    """
    user = await _user_from_setup_token(req.setup_token)
    db = get_db()
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not fresh or not fresh.get("two_factor_secret"):
        raise HTTPException(status_code=400, detail="ابدأ إعداد 2FA أولاً")
    totp = pyotp.TOTP(fresh["two_factor_secret"])
    if not totp.verify(req.token_code, valid_window=1):
        raise HTTPException(status_code=400, detail="الرمز غير صحيح")

    plain_codes = _gen_backup_codes(8)
    hashed_codes = [bcrypt.hashpw(c.encode(), bcrypt.gensalt()).decode() for c in plain_codes]
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "two_factor_enabled": True,
            "two_factor_backup_codes": hashed_codes,
            "two_factor_backup_used": [],
            "two_factor_enabled_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    # Mint final access token + return user payload
    access_token = create_access_token(data={"sub": user["id"]})
    compound_name = None
    if user.get("compound_id"):
        cmp = await db.compounds.find_one({"id": user["compound_id"]})
        if cmp:
            compound_name = cmp.get("name")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "backup_codes": plain_codes,
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
        },
    }
