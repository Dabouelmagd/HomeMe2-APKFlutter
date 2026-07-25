import os
"""
Compound Invites — shareable self-registration links per compound.

Flow:
  1. Admin (owner / super_admin / company_admin of compound's parent) creates an invite:
     POST /api/compound-invites  → returns { invite, join_url }
  2. Invite recipient opens the public URL (e.g. /join/{token}) and sees compound info:
     GET /api/compound-invites/token/{token}  (public, read-only)
  3. Recipient submits registration:
     POST /api/compound-invites/token/{token}/accept  (public)
     → creates the user account with compound_id auto-set, increments used_count.
  4. Admin manages invites:
     GET  /api/compound-invites?compound_id=X
     DELETE /api/compound-invites/{id}      (revoke)

Security:
  - Only the compound's parent company_admin, or any super_admin / app_owner can create/revoke.
  - Public accept endpoint is rate-limited by max_uses + expires_at; inactive invites cannot be used.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import secrets
import bcrypt

from database import get_db
from auth_deps import get_current_user
from helpers import serialize_datetime
from email_service import email_service

router = APIRouter(prefix="/api")

VALID_INVITE_ROLES = ["resident", "family_head", "manager", "security"]


async def _require_can_manage_compound(current_user: dict, compound_id: str) -> dict:
    """Allow app_owner / super_admin / (company_admin whose company owns the compound)."""
    db = get_db()
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="المجمع غير موجود")
    role = current_user.get("role")
    if role in ("app_owner", "super_admin"):
        return compound
    if role == "company_admin":
        user_company_id = current_user.get("company_id")
        cpd_company = compound.get("company_id") or compound.get("management_company_id")
        if user_company_id and cpd_company == user_company_id:
            return compound
    if role in ("admin", "manager") and current_user.get("compound_id") == compound_id:
        return compound
    raise HTTPException(status_code=403, detail="لا تملك صلاحية إدارة هذا المجمع")


def _build_join_url(token: str) -> str:
    """Frontend will render /join/{token}. We return a relative path — frontend prepends host."""
    return f"/join/{token}"


@router.post("/compound-invites")
async def create_compound_invite(payload: dict, current_user: dict = Depends(get_current_user)):
    """إنشاء رابط دعوة لمجمع."""
    db = get_db()
    compound_id = payload.get("compound_id")
    if not compound_id:
        raise HTTPException(status_code=400, detail="compound_id مطلوب")
    compound = await _require_can_manage_compound(current_user, compound_id)

    role = payload.get("role") or "resident"
    if role not in VALID_INVITE_ROLES:
        raise HTTPException(status_code=400, detail=f"دور غير صالح. المسموح: {VALID_INVITE_ROLES}")

    try:
        validity_days = int(payload.get("validity_days") or 30)
        if validity_days < 1 or validity_days > 365:
            raise ValueError()
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="validity_days يجب أن يكون بين 1 و 365")

    max_uses = payload.get("max_uses")
    if max_uses is not None:
        try:
            max_uses = int(max_uses)
            if max_uses < 1:
                raise ValueError()
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="max_uses إما null أو رقم صحيح موجب")

    token = secrets.token_urlsafe(24)
    doc = {
        "id": str(uuid.uuid4()),
        "token": token,
        "compound_id": compound_id,
        "compound_name": compound.get("name"),
        "company_id": compound.get("company_id") or compound.get("management_company_id"),
        "role": role,
        "max_uses": max_uses,
        "used_count": 0,
        "accepted_user_ids": [],
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=validity_days)).isoformat(),
        "is_active": True,
        "note": (payload.get("note") or "").strip() or None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id"),
        "created_by_username": current_user.get("username"),
    }
    await db.compound_invites.insert_one(doc)
    doc.pop("_id", None)
    doc["join_url"] = _build_join_url(token)

    # Send email invitation if provided
    recipient_email = payload.get("recipient_email", "").strip()
    recipient_name = payload.get("recipient_name", "").strip()
    if recipient_email:
        frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
        full_join_url = f"{frontend_url}{doc['join_url']}"
        company_doc = await db.companies.find_one({"id": doc.get("company_id")}, {"_id": 0, "name": 1}) if doc.get("company_id") else None
        try:
            await email_service.send_invite_link(
                to_email=recipient_email,
                recipient_name=recipient_name,
                compound_name=doc.get("compound_name", ""),
                company_name=company_doc.get("name", "") if company_doc else "",
                join_url=full_join_url,
                role=doc.get("role", "resident"),
                validity_days=validity_days,
                note=doc.get("note"),
            )
        except Exception as _e:
            import logging as _lg
            _lg.warning(f"Invite email failed: {_e}")

    return {"success": True, "invite": serialize_datetime(doc)}


@router.get("/compound-invites")
async def list_compound_invites(compound_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """قائمة روابط الدعوة — مفلتر حسب compound_id إن وُجد."""
    db = get_db()
    if compound_id:
        await _require_can_manage_compound(current_user, compound_id)
        q = {"compound_id": compound_id}
    else:
        # For company_admin, restrict to their company's compounds only
        role = current_user.get("role")
        if role == "company_admin":
            cid = current_user.get("company_id")
            if not cid:
                return {"invites": []}
            q = {"company_id": cid}
        elif role in ("app_owner", "super_admin"):
            q = {}
        else:
            raise HTTPException(status_code=403, detail="غير مسموح")
    invites = await db.compound_invites.find(q, {"_id": 0}).sort("created_at", -1).to_list(length=500)
    now = datetime.now(timezone.utc)
    for inv in invites:
        inv["join_url"] = _build_join_url(inv["token"])
        # compute effective status
        exp = inv.get("expires_at")
        expired = False
        if exp:
            try:
                exp_dt = datetime.fromisoformat(exp.replace("Z", "+00:00"))
                if exp_dt.tzinfo is None:
                    exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                expired = exp_dt < now
            except Exception:
                pass
        used_up = inv.get("max_uses") is not None and inv.get("used_count", 0) >= inv.get("max_uses")
        inv["effective_status"] = (
            "revoked" if not inv.get("is_active") else
            "expired" if expired else
            "used_up" if used_up else
            "active"
        )
    return {"invites": serialize_datetime(invites), "total": len(invites)}


@router.delete("/compound-invites/{invite_id}")
async def revoke_compound_invite(invite_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    inv = await db.compound_invites.find_one({"id": invite_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="الرابط غير موجود")
    await _require_can_manage_compound(current_user, inv["compound_id"])
    await db.compound_invites.update_one({"id": invite_id}, {"$set": {"is_active": False, "revoked_at": datetime.now(timezone.utc).isoformat()}})
    return {"success": True}


# ==================== Public endpoints ====================

async def _validate_token(token: str):
    db = get_db()
    inv = await db.compound_invites.find_one({"token": token}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="رابط الدعوة غير صالح")
    if not inv.get("is_active"):
        raise HTTPException(status_code=410, detail="تم إلغاء هذا الرابط")
    exp = inv.get("expires_at")
    if exp:
        try:
            exp_dt = datetime.fromisoformat(exp.replace("Z", "+00:00"))
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            if exp_dt < datetime.now(timezone.utc):
                raise HTTPException(status_code=410, detail="انتهت صلاحية الرابط")
        except HTTPException:
            raise
        except Exception:
            pass
    if inv.get("max_uses") is not None and inv.get("used_count", 0) >= inv["max_uses"]:
        raise HTTPException(status_code=410, detail="تم استخدام الرابط بالحد الأقصى")
    return inv


@router.get("/compound-invites/token/{token}")
async def public_view_invite(token: str):
    """Public read-only view of the invite → compound info."""
    inv = await _validate_token(token)
    db = get_db()
    compound = await db.compounds.find_one({"id": inv["compound_id"]}, {"_id": 0, "id": 1, "name": 1, "location": 1, "description": 1})
    company = None
    if inv.get("company_id"):
        company = await db.companies.find_one({"id": inv["company_id"]}, {"_id": 0, "id": 1, "name": 1, "company_code": 1})
    return {
        "valid": True,
        "role": inv.get("role"),
        "compound": serialize_datetime(compound) if compound else None,
        "company": serialize_datetime(company) if company else None,
        "expires_at": inv.get("expires_at"),
        "remaining_uses": (inv["max_uses"] - inv.get("used_count", 0)) if inv.get("max_uses") is not None else None,
        "note": inv.get("note"),
    }


@router.post("/compound-invites/token/{token}/accept")
async def public_accept_invite(token: str, payload: dict):
    """Public self-registration via invite token."""
    db = get_db()
    inv = await _validate_token(token)

    full_name = (payload.get("full_name") or "").strip()
    username = (payload.get("username") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    phone = (payload.get("phone") or "").strip()
    unit_number = (payload.get("unit_number") or "").strip()

    if not full_name or not username or not email or not password:
        raise HTTPException(status_code=400, detail="الاسم الكامل واسم المستخدم والبريد وكلمة المرور مطلوبة")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="كلمة المرور 6 أحرف على الأقل")
    existing = await db.users.find_one({"$or": [{"username": username}, {"email": email}]})
    if existing:
        raise HTTPException(status_code=400, detail="اسم المستخدم أو البريد مستخدم بالفعل")

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    user_doc = {
        "id": str(uuid.uuid4()),
        "username": username,
        "email": email,
        "password_hash": password_hash,
        "role": inv.get("role") or "resident",
        "compound_id": inv["compound_id"],
        "company_id": inv.get("company_id"),
        "family_id": None,
        "full_name": full_name,
        "phone": phone,
        "unit_number": unit_number,
        "is_family_head": False,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "invite_link",
        "invite_id": inv["id"],
        "profile_picture_url": None,
    }
    await db.users.insert_one(user_doc)
    # Atomically increment used_count
    await db.compound_invites.update_one(
        {"id": inv["id"]},
        {"$inc": {"used_count": 1}, "$addToSet": {"accepted_user_ids": user_doc["id"]}}
    )
    user_doc.pop("_id", None)
    user_doc.pop("password_hash", None)
    return {
        "success": True,
        "user": serialize_datetime(user_doc),
        "message": "تم إنشاء حسابك. يمكنك الآن تسجيل الدخول.",
    }
