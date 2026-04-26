"""
Visitor QR Pass — residents create one-time/limited-use passes for guests,
security scans them at the gate.

Lifecycle:
  - resident: POST /api/visitor-passes  → creates pass + signed token
  - shareable URL: /visitor/{token}      → public verification page (read-only)
  - security:  POST /api/visitor-passes/{token}/redeem  → marks as used
  - resident:  GET  /api/visitor-passes/my              → list own
  - admin/sec: GET  /api/visitor-passes/compound        → list compound's
  - revoke:    DELETE /api/visitor-passes/{id}          → soft-delete

Auto-expiry: any active pass past its `valid_until` becomes "expired" on read.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional
import secrets
import uuid
import logging

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _effective_status(p: dict) -> str:
    """Compute the runtime status of a pass."""
    if not p.get("is_active", True):
        return "revoked"
    if p.get("used_at") and (p.get("max_uses") or 1) <= (p.get("used_count") or 1):
        return "used"
    try:
        until = p.get("valid_until")
        if until:
            until_dt = datetime.fromisoformat(until.replace("Z", "+00:00")) if isinstance(until, str) else until
            if until_dt.tzinfo is None:
                until_dt = until_dt.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > until_dt:
                return "expired"
    except Exception:
        pass
    return "active"


def _can_view_compound_passes(user: dict, pass_compound_id: str) -> bool:
    role = user.get("role")
    if role in ("app_owner", "super_admin"):
        return True
    if role in ("admin", "compound_admin", "security") and user.get("compound_id") == pass_compound_id:
        return True
    if role == "company_admin" and user.get("company_id"):
        return True  # company_admins manage their compounds — refined by compound_id later if needed
    return False


@router.post("/visitor-passes")
async def create_pass(payload: dict, current_user: dict = Depends(get_current_user)):
    """Resident creates a visitor pass for a guest."""
    db = get_db()
    visitor_name = (payload.get("visitor_name") or "").strip()
    if not visitor_name:
        raise HTTPException(status_code=400, detail="اسم الزائر مطلوب")
    if len(visitor_name) > 100:
        raise HTTPException(status_code=400, detail="اسم الزائر طويل جداً")

    valid_hours = int(payload.get("valid_hours") or 24)
    if valid_hours < 1 or valid_hours > 168:  # max 7 days
        raise HTTPException(status_code=400, detail="مدة الصلاحية بين 1 و 168 ساعة")

    max_uses = int(payload.get("max_uses") or 1)
    if max_uses < 1 or max_uses > 10:
        raise HTTPException(status_code=400, detail="عدد مرات الاستخدام بين 1 و 10")

    compound_id = current_user.get("compound_id")
    if not compound_id:
        raise HTTPException(status_code=400, detail="ليس لديك مجمع مرتبط بحسابك")

    now = datetime.now(timezone.utc)
    valid_from = payload.get("valid_from") or now.isoformat()
    valid_until = (now + timedelta(hours=valid_hours)).isoformat()

    doc = {
        "id": str(uuid.uuid4()),
        "token": secrets.token_urlsafe(20),
        "compound_id": compound_id,
        "resident_id": current_user["id"],
        "resident_full_name": current_user.get("full_name") or current_user.get("username"),
        "unit_number": current_user.get("unit_number"),
        "visitor_name": visitor_name,
        "visitor_phone": (payload.get("visitor_phone") or "").strip() or None,
        "purpose": (payload.get("purpose") or "").strip() or None,
        "vehicle_plate": (payload.get("vehicle_plate") or "").strip() or None,
        "expected_at": payload.get("expected_at") or None,
        "valid_from": valid_from,
        "valid_until": valid_until,
        "max_uses": max_uses,
        "used_count": 0,
        "used_at": None,
        "used_by_security_id": None,
        "is_active": True,
        "notes": (payload.get("notes") or "").strip() or None,
        "created_at": _now(),
        "activity_log": [{"event": "created", "at": _now(), "by_user_id": current_user["id"], "by_full_name": current_user.get("full_name")}],
    }
    await db.visitor_passes.insert_one(doc)
    doc.pop("_id", None)
    doc["public_url"] = f"/visitor/{doc['token']}"
    doc["effective_status"] = _effective_status(doc)
    try:
        from audit_logger import audit_log
        await audit_log(actor=current_user, action="visitor_pass.create", target_type="visitor_pass", target_id=doc["id"], details={"visitor_name": visitor_name, "valid_hours": valid_hours, "max_uses": max_uses})
    except Exception:
        pass
    return {"success": True, "pass": doc}


@router.get("/visitor-passes/my")
async def list_my_passes(current_user: dict = Depends(get_current_user)):
    db = get_db()
    items = await db.visitor_passes.find({"resident_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(length=100)
    for p in items:
        p["effective_status"] = _effective_status(p)
        p["public_url"] = f"/visitor/{p['token']}"
    return {"passes": items, "total": len(items)}


@router.get("/visitor-passes/compound")
async def list_compound_passes(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Admin / security view — all passes in their compound."""
    db = get_db()
    role = current_user.get("role")
    compound_id = current_user.get("compound_id")
    if role not in ("admin", "compound_admin", "security", "company_admin", "app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    q: dict = {}
    if compound_id and role not in ("app_owner", "super_admin"):
        q["compound_id"] = compound_id

    items = await db.visitor_passes.find(q, {"_id": 0}).sort("created_at", -1).limit(500).to_list(length=500)
    for p in items:
        p["effective_status"] = _effective_status(p)
        p["public_url"] = f"/visitor/{p['token']}"
    if status and status != "all":
        items = [p for p in items if p["effective_status"] == status]
    return {"passes": items, "total": len(items)}


@router.get("/visitor-passes/public/{token}")
async def public_pass(token: str):
    """Public read-only view of a pass — for the printed/shared QR.
    No auth required, but returns minimal info."""
    db = get_db()
    p = await db.visitor_passes.find_one({"token": token}, {"_id": 0, "notes": 0, "activity_log": 0})
    if not p:
        raise HTTPException(status_code=404, detail="الرابط غير صالح")
    eff = _effective_status(p)
    return {
        "visitor_name": p.get("visitor_name"),
        "visitor_phone": p.get("visitor_phone"),
        "purpose": p.get("purpose"),
        "vehicle_plate": p.get("vehicle_plate"),
        "resident_full_name": p.get("resident_full_name"),
        "unit_number": p.get("unit_number"),
        "valid_from": p.get("valid_from"),
        "valid_until": p.get("valid_until"),
        "max_uses": p.get("max_uses"),
        "used_count": p.get("used_count"),
        "effective_status": eff,
        "compound_id": p.get("compound_id"),
    }


@router.post("/visitor-passes/{token}/redeem")
async def redeem_pass(token: str, current_user: dict = Depends(get_current_user)):
    """Security scans the QR and redeems the pass at the gate."""
    db = get_db()
    role = current_user.get("role")
    if role not in ("admin", "compound_admin", "security", "app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="فقط الأمن أو الإدارة يقدروا يفعّلوا الرابط")

    p = await db.visitor_passes.find_one({"token": token}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="الرابط غير موجود")

    # Compound scoping
    if role not in ("app_owner", "super_admin") and current_user.get("compound_id") != p.get("compound_id"):
        raise HTTPException(status_code=403, detail="الرابط من مجمع آخر")

    eff = _effective_status(p)
    if eff != "active":
        return {
            "success": False,
            "status": eff,
            "message": {"used": "تم استخدامه من قبل", "expired": "انتهت صلاحيته", "revoked": "تم إلغاءه"}.get(eff, "غير صالح"),
            "pass": p,
        }

    # Check valid_from
    try:
        vf = p.get("valid_from")
        if vf:
            vf_dt = datetime.fromisoformat(vf.replace("Z", "+00:00")) if isinstance(vf, str) else vf
            if vf_dt.tzinfo is None:
                vf_dt = vf_dt.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) < vf_dt:
                return {"success": False, "status": "not_yet_valid", "message": "لم يحن وقت التفعيل بعد", "pass": p}
    except Exception:
        pass

    new_used_count = (p.get("used_count") or 0) + 1
    update = {
        "$inc": {"used_count": 1},
        "$set": {"used_at": _now(), "used_by_security_id": current_user["id"], "used_by_security_name": current_user.get("full_name") or current_user.get("username")},
        "$push": {"activity_log": {"event": "redeemed", "at": _now(), "by_user_id": current_user["id"], "by_full_name": current_user.get("full_name")}},
    }
    await db.visitor_passes.update_one({"id": p["id"]}, update)

    p["used_count"] = new_used_count
    p["used_at"] = _now()
    p["effective_status"] = "used" if new_used_count >= (p.get("max_uses") or 1) else "active"
    try:
        from audit_logger import audit_log
        await audit_log(actor=current_user, action="visitor_pass.redeem", target_type="visitor_pass", target_id=p["id"], details={"visitor_name": p.get("visitor_name"), "used_count": new_used_count})
    except Exception:
        pass
    return {"success": True, "status": p["effective_status"], "message": f"تم تسجيل الدخول للزائر {p.get('visitor_name')}", "pass": p}


@router.delete("/visitor-passes/{pass_id}")
async def revoke_pass(pass_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    p = await db.visitor_passes.find_one({"id": pass_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="غير موجود")
    role = current_user.get("role")
    is_owner = p.get("resident_id") == current_user["id"]
    is_admin_of_compound = role in ("admin", "compound_admin", "app_owner", "super_admin") and (
        role in ("app_owner", "super_admin") or current_user.get("compound_id") == p.get("compound_id")
    )
    if not (is_owner or is_admin_of_compound):
        raise HTTPException(status_code=403, detail="غير مصرح بإلغاء الرابط")

    await db.visitor_passes.update_one(
        {"id": pass_id},
        {
            "$set": {"is_active": False, "revoked_at": _now()},
            "$push": {"activity_log": {"event": "revoked", "at": _now(), "by_user_id": current_user["id"], "by_full_name": current_user.get("full_name")}},
        },
    )
    try:
        from audit_logger import audit_log
        await audit_log(actor=current_user, action="visitor_pass.revoke", target_type="visitor_pass", target_id=pass_id)
    except Exception:
        pass
    return {"success": True}
