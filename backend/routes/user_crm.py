"""
User CRM — Tags & Private Admin Notes

Scope:
  - Tags: short labels attached to a user doc (VIP, recurring_complaints, late_payer, etc.)
  - Notes: free-text admin-only notes (separate collection `user_notes` with author trail)

Who can use:
  - app_owner / super_admin (unrestricted)
  - compound_admin / admin → only for users in their compound
  - company_admin → only for users in compounds they manage

Endpoints:
  GET    /api/users/{user_id}/crm              → {tags:[], notes:[...]}
  POST   /api/users/{user_id}/tags             body: {tag}   → adds one tag (idempotent)
  DELETE /api/users/{user_id}/tags/{tag}        → removes tag
  POST   /api/users/{user_id}/notes            body: {text, color?}  → creates note
  PUT    /api/users/{user_id}/notes/{note_id}  body: {text, color?}  → updates note
  DELETE /api/users/{user_id}/notes/{note_id}  → deletes note
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Body

from auth_deps import get_current_user
from database import get_db

router = APIRouter(prefix="/api/users", tags=["user-crm"])

ALLOWED_COLORS = {"gray", "red", "amber", "emerald", "blue", "purple", "pink", "indigo"}
MAX_TAG_LEN = 32
MAX_NOTE_LEN = 2000
MAX_TAGS_PER_USER = 20


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _authorize(db, actor: dict, target_user_id: str) -> dict:
    """Verify actor can manage CRM data of target user. Returns target user doc."""
    target = await db.users.find_one({"id": target_user_id}, {"_id": 0, "password_hash": 0})
    if not target:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    role = actor.get("role")
    if role in ("app_owner", "super_admin"):
        return target

    if role in ("admin", "compound_admin"):
        if actor.get("compound_id") and actor["compound_id"] == target.get("compound_id"):
            return target
        raise HTTPException(status_code=403, detail="المستخدم ليس من مجمعك")

    if role == "company_admin":
        company_id = actor.get("company_id")
        if not company_id:
            raise HTTPException(status_code=403, detail="حسابك غير مرتبط بشركة")
        # Allow if target is in a compound managed by this company
        compounds = await db.compounds.find(
            {"management_company_id": company_id}, {"_id": 0, "id": 1}
        ).to_list(500)
        ids = {c.get("id") for c in compounds}
        if target.get("compound_id") in ids:
            return target
        raise HTTPException(status_code=403, detail="المستخدم ليس تحت إدارة شركتك")

    raise HTTPException(status_code=403, detail="ليس لديك صلاحية على بيانات CRM")


@router.get("/{user_id}/crm")
async def get_user_crm(user_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    target = await _authorize(db, current_user, user_id)
    notes_cursor = db.user_notes.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1)
    notes = await notes_cursor.to_list(length=200)
    return {
        "user_id": user_id,
        "full_name": target.get("full_name") or target.get("username"),
        "tags": target.get("crm_tags") or [],
        "tag_colors": target.get("crm_tag_colors") or {},
        "notes": notes,
    }


@router.post("/{user_id}/tags")
async def add_tag(user_id: str, payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    db = get_db()
    await _authorize(db, current_user, user_id)
    tag = (payload.get("tag") or "").strip().lower()
    if not tag:
        raise HTTPException(status_code=400, detail="التاغ مطلوب")
    if len(tag) > MAX_TAG_LEN:
        raise HTTPException(status_code=400, detail=f"التاغ طويل (أقصى {MAX_TAG_LEN} حرف)")
    # Optional client-defined color stored as a parallel map on the user doc
    color = (payload.get("color") or "indigo").lower()
    if color not in ALLOWED_COLORS:
        color = "indigo"

    user = await db.users.find_one({"id": user_id}, {"_id": 0, "crm_tags": 1, "crm_tag_colors": 1})
    tags = (user or {}).get("crm_tags") or []
    colors = (user or {}).get("crm_tag_colors") or {}
    if tag in tags:
        # Idempotent: update color if a new one was supplied
        if colors.get(tag) != color:
            colors[tag] = color
            await db.users.update_one(
                {"id": user_id},
                {"$set": {"crm_tag_colors": colors, "crm_updated_at": _now()}},
            )
        return {"success": True, "tags": tags, "colors": colors}
    if len(tags) >= MAX_TAGS_PER_USER:
        raise HTTPException(status_code=400, detail=f"أقصى عدد للتاغات: {MAX_TAGS_PER_USER}")

    colors[tag] = color
    await db.users.update_one(
        {"id": user_id},
        {
            "$addToSet": {"crm_tags": tag},
            "$set": {"crm_tag_colors": colors, "crm_updated_at": _now()},
        },
    )
    # Re-read for strict consistency
    refreshed = await db.users.find_one({"id": user_id}, {"_id": 0, "crm_tags": 1, "crm_tag_colors": 1})
    try:
        from audit_logger import audit_log
        await audit_log(actor=current_user, action="user_crm.tag_add", target_type="user",
                        target_id=user_id, details={"tag": tag, "color": color})
    except Exception:
        pass
    return {
        "success": True,
        "tags": (refreshed or {}).get("crm_tags") or (tags + [tag]),
        "colors": (refreshed or {}).get("crm_tag_colors") or colors,
    }


@router.delete("/{user_id}/tags/{tag}")
async def remove_tag(user_id: str, tag: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    await _authorize(db, current_user, user_id)
    tag = tag.strip().lower()
    if not tag:
        raise HTTPException(status_code=400, detail="التاغ مطلوب")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "crm_tag_colors": 1})
    colors = (user or {}).get("crm_tag_colors") or {}
    colors.pop(tag, None)
    await db.users.update_one(
        {"id": user_id},
        {
            "$pull": {"crm_tags": tag},
            "$set": {"crm_tag_colors": colors, "crm_updated_at": _now()},
        },
    )
    try:
        from audit_logger import audit_log
        await audit_log(actor=current_user, action="user_crm.tag_remove", target_type="user",
                        target_id=user_id, details={"tag": tag})
    except Exception:
        pass
    return {"success": True}


@router.post("/{user_id}/notes")
async def add_note(user_id: str, payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    db = get_db()
    await _authorize(db, current_user, user_id)
    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="نص الملاحظة مطلوب")
    if len(text) > MAX_NOTE_LEN:
        raise HTTPException(status_code=400, detail=f"النص طويل جداً (أقصى {MAX_NOTE_LEN} حرف)")
    color = (payload.get("color") or "amber").lower()
    if color not in ALLOWED_COLORS:
        color = "amber"

    note = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "text": text,
        "color": color,
        "created_at": _now(),
        "created_by": current_user["id"],
        "created_by_name": current_user.get("full_name") or current_user.get("username"),
        "updated_at": None,
        "updated_by": None,
    }
    await db.user_notes.insert_one(note)
    note.pop("_id", None)
    try:
        from audit_logger import audit_log
        await audit_log(actor=current_user, action="user_crm.note_add", target_type="user",
                        target_id=user_id, details={"note_id": note["id"], "len": len(text)})
    except Exception:
        pass
    return {"success": True, "note": note}


@router.put("/{user_id}/notes/{note_id}")
async def update_note(user_id: str, note_id: str, payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    db = get_db()
    await _authorize(db, current_user, user_id)
    note = await db.user_notes.find_one({"id": note_id, "user_id": user_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="الملاحظة غير موجودة")
    # Only author OR super_admin/app_owner can edit
    if (note.get("created_by") != current_user["id"]
            and current_user.get("role") not in ("app_owner", "super_admin")):
        raise HTTPException(status_code=403, detail="لا يمكنك تعديل ملاحظة شخص آخر")
    update: dict = {"updated_at": _now(), "updated_by": current_user["id"],
                    "updated_by_name": current_user.get("full_name") or current_user.get("username")}
    if "text" in payload:
        text = (payload.get("text") or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="النص لا يمكن أن يكون فارغاً")
        if len(text) > MAX_NOTE_LEN:
            raise HTTPException(status_code=400, detail=f"النص طويل (أقصى {MAX_NOTE_LEN})")
        update["text"] = text
    if "color" in payload:
        c = (payload.get("color") or "").lower()
        if c and c in ALLOWED_COLORS:
            update["color"] = c
    await db.user_notes.update_one({"id": note_id}, {"$set": update})
    refreshed = await db.user_notes.find_one({"id": note_id}, {"_id": 0})
    return {"success": True, "note": refreshed}


@router.delete("/{user_id}/notes/{note_id}")
async def delete_note(user_id: str, note_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    await _authorize(db, current_user, user_id)
    note = await db.user_notes.find_one({"id": note_id, "user_id": user_id}, {"_id": 0, "created_by": 1})
    if not note:
        raise HTTPException(status_code=404, detail="الملاحظة غير موجودة")
    if (note.get("created_by") != current_user["id"]
            and current_user.get("role") not in ("app_owner", "super_admin")):
        raise HTTPException(status_code=403, detail="لا يمكنك حذف ملاحظة شخص آخر")
    await db.user_notes.delete_one({"id": note_id})
    try:
        from audit_logger import audit_log
        await audit_log(actor=current_user, action="user_crm.note_delete", target_type="user",
                        target_id=user_id, details={"note_id": note_id})
    except Exception:
        pass
    return {"success": True}


# Suggestion endpoint — returns tags that already exist in the DB (autocomplete)
@router.get("/crm/tag-suggestions")
async def tag_suggestions(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role not in ("app_owner", "super_admin", "admin", "compound_admin", "company_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    # Tenant scoping: app_owner/super_admin see ALL; compound admins see their compound;
    # company_admin sees all compounds managed by their company.
    match: dict = {"crm_tags": {"$exists": True, "$ne": []}}
    if role in ("admin", "compound_admin"):
        if not current_user.get("compound_id"):
            return {"suggestions": []}
        match["compound_id"] = current_user.get("compound_id")
    elif role == "company_admin":
        company_id = current_user.get("company_id")
        if not company_id:
            return {"suggestions": []}
        compounds = await db.compounds.find(
            {"management_company_id": company_id}, {"_id": 0, "id": 1}
        ).to_list(500)
        ids = [c.get("id") for c in compounds if c.get("id")]
        if not ids:
            return {"suggestions": []}
        match["compound_id"] = {"$in": ids}

    pipeline = [
        {"$match": match},
        {"$unwind": {"path": "$crm_tags", "preserveNullAndEmptyArrays": False}},
        {"$group": {"_id": "$crm_tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 30},
    ]
    try:
        cursor = db.users.aggregate(pipeline)
        items = []
        async for d in cursor:
            items.append({"tag": d["_id"], "count": d["count"]})
        return {"suggestions": items}
    except Exception:
        return {"suggestions": []}
