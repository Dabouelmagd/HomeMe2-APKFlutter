"""
Family Invites — shareable self-registration links a family head sends to
their relatives. Accepting the invite creates a real user account that
inherits the inviter's compound_id, unit_number and family_id.

Flow:
  1. Family head (or compound resident) creates an invite:
     POST /api/family-invites  → { invite, join_url }
  2. Recipient opens the public URL (frontend renders /join-family/{token}):
     GET /api/family-invites/token/{token}     (public, read-only)
  3. Recipient submits self-registration:
     POST /api/family-invites/token/{token}/accept   (public)
     → creates a user with role=resident, family_id=inviter.family_id (or
       newly assigned), compound_id, unit_number copied from inviter.
  4. Inviter manages their own invites:
     GET    /api/family-invites
     DELETE /api/family-invites/{id}     (revoke)

Security:
  - Only authenticated residents can create invites for their own family.
  - Public accept endpoint is rate-limited by max_uses + expires_at.
  - Inactive (revoked) invites cannot be used.
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

router = APIRouter(prefix="/api")


def _activity_entry(event: str, by_user: dict | None, **extra) -> dict:
    """Build a single activity-log entry with consistent shape."""
    out = {
        "event": event,                # created | reminder_sent | accepted | revoked
        "at": datetime.now(timezone.utc).isoformat(),
    }
    if by_user:
        out["by_user_id"] = by_user.get("id")
        out["by_full_name"] = by_user.get("full_name") or by_user.get("username")
        out["by_role"] = by_user.get("role")
    out.update({k: v for k, v in extra.items() if v is not None})
    return out


VALID_FAMILY_RELATIONSHIPS = [
    "spouse",   # زوج/زوجة
    "child",    # ابن/ابنة
    "parent",   # أب/أم
    "sibling",  # أخ/أخت
    "driver",   # سائق
    "helper",   # خادم/مساعد
    "other",
]


def _build_join_url(token: str) -> str:
    """Frontend mounts the public page at /join-family/{token}."""
    return f"/join-family/{token}"


async def _ensure_family_id(current_user: dict) -> str:
    """Return inviter's family_id. If they don't have one yet, allocate it
    (and mark them as is_family_head=True since they initiated the family)."""
    db = get_db()
    fid = current_user.get("family_id")
    if fid:
        return fid
    fid = str(uuid.uuid4())
    await db.users.update_one(
        {"id": current_user.get("id")},
        {"$set": {"family_id": fid, "is_family_head": True}},
    )
    return fid


@router.post("/family-invites")
async def create_family_invite(payload: dict, current_user: dict = Depends(get_current_user)):
    """إنشاء رابط دعوة لأحد أفراد الأسرة.

    Optional ``target_user_id`` (admin/family-head usage):
      When provided, the invite is scoped to that target's family/unit/compound
      instead of the caller's own. Allowed for: admin/compound_admin of the
      target's compound, app_owner, super_admin, or company_admin of the
      parent company. Useful from the "Add Family Member to Unit" page so an
      admin can invite a relative directly into a specific unit.
    """
    db = get_db()

    target_user_id = (payload.get("target_user_id") or "").strip() or None
    inviter_for_invite = current_user
    if target_user_id:
        target = await db.users.find_one({"id": target_user_id}, {"_id": 0, "password_hash": 0})
        if not target:
            raise HTTPException(status_code=404, detail="الساكن الهدف غير موجود")
        role = current_user.get("role")
        same_compound = current_user.get("compound_id") == target.get("compound_id")
        is_company_admin = (
            role == "company_admin"
            and current_user.get("company_id")
            and current_user.get("company_id") == target.get("company_id")
        )
        if not (
            role in ("app_owner", "super_admin")
            or is_company_admin
            or (role in ("admin", "compound_admin") and same_compound)
        ):
            raise HTTPException(status_code=403, detail="غير مصرح بإرسال دعوة لهذه الوحدة")
        inviter_for_invite = target

    # The inviter (or target) must belong to a compound
    compound_id = inviter_for_invite.get("compound_id")
    if not compound_id:
        raise HTTPException(status_code=400, detail="ليس لديك مجمع مرتبط بحسابك")

    relationship = payload.get("relationship") or "other"
    if relationship not in VALID_FAMILY_RELATIONSHIPS:
        raise HTTPException(status_code=400, detail=f"علاقة غير صالحة. المسموح: {VALID_FAMILY_RELATIONSHIPS}")

    try:
        v = payload.get("validity_days")
        validity_days = 14 if v is None else int(v)
        if validity_days < 1 or validity_days > 90:
            raise ValueError()
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="validity_days يجب أن يكون بين 1 و 90")

    max_uses = payload.get("max_uses")
    if max_uses is not None:
        try:
            max_uses = int(max_uses)
            if max_uses < 1:
                raise ValueError()
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="max_uses إما null أو رقم صحيح موجب")
    else:
        # Default: a family invite is single-use unless caller overrides.
        max_uses = 1

    family_id = await _ensure_family_id(inviter_for_invite)
    token = secrets.token_urlsafe(24)
    doc = {
        "id": str(uuid.uuid4()),
        "token": token,
        "family_id": family_id,
        "compound_id": compound_id,
        "company_id": inviter_for_invite.get("company_id"),
        "unit_number": inviter_for_invite.get("unit_number"),
        "relationship": relationship,
        "max_uses": max_uses,
        "used_count": 0,
        "accepted_user_ids": [],
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=validity_days)).isoformat(),
        "is_active": True,
        "note": (payload.get("note") or "").strip() or None,
        "invitee_name_hint": (payload.get("invitee_name") or payload.get("invitee_name_hint") or "").strip() or None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id"),
        "created_by_username": current_user.get("username"),
        "created_by_full_name": current_user.get("full_name"),
        "target_user_id": target_user_id,
        "target_user_full_name": inviter_for_invite.get("full_name") if target_user_id else None,
        "activity_log": [
            _activity_entry(
                "created",
                current_user,
                relationship=relationship,
                unit_number=inviter_for_invite.get("unit_number"),
                target_user_id=target_user_id,
                target_user_full_name=inviter_for_invite.get("full_name") if target_user_id else None,
            )
        ],
    }
    await db.family_invites.insert_one(doc)
    doc.pop("_id", None)
    doc["join_url"] = _build_join_url(token)
    return {"success": True, "invite": serialize_datetime(doc)}


@router.get("/family-invites")
async def list_family_invites(current_user: dict = Depends(get_current_user)):
    """قائمة دعوات الأسرة التي أنشأها المستخدم الحالي."""
    db = get_db()
    q = {"created_by": current_user.get("id")}
    invites = await db.family_invites.find(q, {"_id": 0}).sort("created_at", -1).to_list(length=200)
    now = datetime.now(timezone.utc)
    for inv in invites:
        inv["join_url"] = _build_join_url(inv["token"])
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


@router.get("/family-invites/{invite_id}/activity")
async def get_family_invite_activity(invite_id: str, current_user: dict = Depends(get_current_user)):
    """Return the chronological activity timeline for a family invite.

    Synthesizes events from the stored activity_log + falls back to legacy
    fields (created_at, revoked_at, reminder_count, accepted_user_ids) so
    invites created before this feature still show a meaningful timeline.
    """
    db = get_db()
    inv = await db.family_invites.find_one({"id": invite_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="الرابط غير موجود")

    role = current_user.get("role")
    is_creator = inv.get("created_by") == current_user.get("id")
    is_owner_or_super = role in ("app_owner", "super_admin")
    is_compound_admin = role in ("admin", "compound_admin") and current_user.get("compound_id") == inv.get("compound_id")
    is_company_admin = (
        role == "company_admin"
        and current_user.get("company_id")
        and current_user.get("company_id") == inv.get("company_id")
    )
    if not (is_creator or is_owner_or_super or is_compound_admin or is_company_admin):
        raise HTTPException(status_code=403, detail="غير مصرح")

    log = list(inv.get("activity_log") or [])

    # Backfill: synthesize events from legacy fields when activity_log is empty.
    if not log:
        if inv.get("created_at"):
            log.append({
                "event": "created",
                "at": inv["created_at"],
                "by_full_name": inv.get("created_by_full_name"),
                "by_user_id": inv.get("created_by"),
                "relationship": inv.get("relationship"),
                "unit_number": inv.get("unit_number"),
                "target_user_full_name": inv.get("target_user_full_name"),
                "synthesized": True,
            })
        if (inv.get("reminder_count") or 0) > 0 and inv.get("last_reminder_sent_at"):
            log.append({
                "event": "reminder_sent",
                "at": inv["last_reminder_sent_at"],
                "reminder_no": inv["reminder_count"],
                "synthesized": True,
            })
        for uid in (inv.get("accepted_user_ids") or []):
            u = await db.users.find_one({"id": uid}, {"_id": 0, "full_name": 1, "username": 1, "created_at": 1})
            if u:
                log.append({
                    "event": "accepted",
                    "at": u.get("created_at") or inv.get("created_at"),
                    "user_id": uid,
                    "full_name": u.get("full_name"),
                    "username": u.get("username"),
                    "synthesized": True,
                })
        if not inv.get("is_active") and inv.get("revoked_at"):
            log.append({
                "event": "revoked",
                "at": inv["revoked_at"],
                "synthesized": True,
            })

    # Sort ascending by `at`
    log.sort(key=lambda e: e.get("at") or "")

    return {"invite_id": invite_id, "events": log, "total": len(log)}



@router.delete("/family-invites/{invite_id}")
async def revoke_family_invite(invite_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    inv = await db.family_invites.find_one({"id": invite_id}, {"_id": 0})
    if not inv:
        raise HTTPException(status_code=404, detail="الرابط غير موجود")
    if inv.get("created_by") != current_user.get("id") and current_user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="لا يمكنك إلغاء رابط لم تنشئه")
    await db.family_invites.update_one(
        {"id": invite_id},
        {
            "$set": {"is_active": False, "revoked_at": datetime.now(timezone.utc).isoformat()},
            "$push": {"activity_log": _activity_entry("revoked", current_user)},
        },
    )
    return {"success": True}


# ==================== Public endpoints ====================

async def _validate_token(token: str):
    db = get_db()
    inv = await db.family_invites.find_one({"token": token}, {"_id": 0})
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


@router.get("/family-invites/token/{token}")
async def public_view_family_invite(token: str):
    """Public read-only view of the family invite — shows compound + unit + relationship."""
    inv = await _validate_token(token)
    db = get_db()
    compound = await db.compounds.find_one(
        {"id": inv["compound_id"]},
        {"_id": 0, "id": 1, "name": 1, "location": 1},
    )
    inviter = await db.users.find_one(
        {"id": inv.get("created_by")},
        {"_id": 0, "full_name": 1, "username": 1},
    )
    return {
        "valid": True,
        "relationship": inv.get("relationship"),
        "unit_number": inv.get("unit_number"),
        "compound": serialize_datetime(compound) if compound else None,
        "inviter": serialize_datetime(inviter) if inviter else None,
        "expires_at": inv.get("expires_at"),
        "remaining_uses": (inv["max_uses"] - inv.get("used_count", 0)) if inv.get("max_uses") is not None else None,
        "note": inv.get("note"),
        "invitee_name_hint": inv.get("invitee_name_hint"),
    }


@router.post("/family-invites/token/{token}/accept")
async def public_accept_family_invite(token: str, payload: dict):
    """Public self-registration via family invite token."""
    db = get_db()
    inv = await _validate_token(token)

    full_name = (payload.get("full_name") or "").strip()
    username = (payload.get("username") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    phone = (payload.get("phone") or "").strip()

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
        "role": "resident",
        "compound_id": inv["compound_id"],
        "company_id": inv.get("company_id"),
        "family_id": inv["family_id"],
        "unit_number": inv.get("unit_number"),
        "full_name": full_name,
        "phone": phone,
        "relationship_to_head": inv.get("relationship"),
        "is_family_head": False,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "family_invite_link",
        "invite_id": inv["id"],
        "profile_picture_url": None,
    }
    await db.users.insert_one(user_doc)
    accept_entry = _activity_entry(
        "accepted",
        None,
        user_id=user_doc["id"],
        full_name=full_name,
        username=username,
    )
    await db.family_invites.update_one(
        {"id": inv["id"]},
        {
            "$inc": {"used_count": 1},
            "$addToSet": {"accepted_user_ids": user_doc["id"]},
            "$push": {"activity_log": accept_entry},
        },
    )
    user_doc.pop("_id", None)
    user_doc.pop("password_hash", None)
    return {
        "success": True,
        "user": serialize_datetime(user_doc),
        "message": "تم إنشاء حسابك. يمكنك الآن تسجيل الدخول.",
    }
