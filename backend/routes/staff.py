"""
Staff Management
================

Granular sub-admin accounts. Each staff user gets a base role
(``staff_finance`` / ``staff_maintenance`` / ``staff_security`` / ``staff_general``)
plus an ``allowed_modules`` whitelist that the frontend uses to gate UI and
the API can consult to restrict access.

This module is **additive**:
- it does NOT replace the existing ``/api/admin/create-admin`` endpoint
- new accounts created here behave like ``admin`` (so they pass existing
  ``require_admin`` checks) but their ``staff_role`` + ``allowed_modules``
  are persisted on the user document and exposed in ``/auth/me``.

Allowed modules (current registry):
- ``finance``        — invoices, payments, balance sheet, contracts
- ``maintenance``    — maintenance requests, services
- ``residents``      — residents list, family management
- ``announcements``  — communication, events
- ``complaints``     — complaints inbox
- ``visitors``       — visitor passes, security gate
"""
from __future__ import annotations
import logging
import uuid
import bcrypt
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from database import get_db
from auth_deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["staff"])

ALLOWED_MODULES = [
    "finance",
    "maintenance",
    "residents",
    "announcements",
    "complaints",
    "visitors",
    "analytics",
]

STAFF_ROLE_PRESETS = {
    "staff_finance":     ["finance", "analytics"],
    "staff_maintenance": ["maintenance", "complaints"],
    "staff_security":    ["visitors"],
    "staff_general":     ["residents", "announcements", "complaints"],
}


def _is_admin(u: dict) -> bool:
    return (u.get("role") or "") in ("admin", "compound_admin", "company_admin", "super_admin", "app_owner")


class StaffCreate(BaseModel):
    full_name: str = Field(min_length=2)
    username: str = Field(min_length=3, max_length=32)
    email: str
    phone: Optional[str] = None
    password: str = Field(min_length=8)
    staff_role: str = Field(default="staff_general", description="One of STAFF_ROLE_PRESETS keys")
    allowed_modules: Optional[List[str]] = None  # if None → uses preset for staff_role

    @field_validator("email")
    @classmethod
    def _basic_email_check(cls, v: str) -> str:
        # Avoid pydantic's email-validator which rejects valid sandbox TLDs
        # (.test/.invalid/.example). We just need shape correctness here.
        v = (v or "").strip().lower()
        if "@" not in v or v.startswith("@") or v.endswith("@") or " " in v:
            raise ValueError("Invalid email shape")
        return v


class StaffUpdate(BaseModel):
    staff_role: Optional[str] = None
    allowed_modules: Optional[List[str]] = None
    active: Optional[bool] = None


def _resolve_modules(staff_role: str, custom: Optional[List[str]]) -> List[str]:
    """Custom whitelist trumps preset; both are filtered through ALLOWED_MODULES."""
    requested = custom if custom is not None else STAFF_ROLE_PRESETS.get(staff_role, [])
    return [m for m in requested if m in ALLOWED_MODULES] or STAFF_ROLE_PRESETS["staff_general"]


@router.get("/staff/modules")
async def list_modules(current_user: dict = Depends(get_current_user)):
    """Expose the module registry + role presets to the UI."""
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin only")
    return {
        "modules": ALLOWED_MODULES,
        "role_presets": STAFF_ROLE_PRESETS,
    }


@router.get("/staff")
async def list_staff(current_user: dict = Depends(get_current_user)):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    compound_id = current_user.get("compound_id")
    cursor = db.users.find(
        {"compound_id": compound_id, "staff_role": {"$exists": True}},
        {"_id": 0, "password_hash": 0, "password": 0},
    )
    docs = await cursor.to_list(500)
    return {"staff": docs, "count": len(docs)}


@router.post("/staff")
async def create_staff(data: StaffCreate, current_user: dict = Depends(get_current_user)):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin only")
    if data.staff_role not in STAFF_ROLE_PRESETS:
        raise HTTPException(status_code=400, detail=f"Unknown staff_role. Allowed: {list(STAFF_ROLE_PRESETS)}")

    db = get_db()
    compound_id = current_user.get("compound_id")
    if not compound_id:
        raise HTTPException(status_code=400, detail="Admin has no compound_id")

    # Uniqueness on username + email
    existing = await db.users.find_one(
        {"$or": [{"username": data.username}, {"email": data.email}]},
        {"id": 1, "_id": 0},
    )
    if existing:
        raise HTTPException(status_code=409, detail="username/email already in use")

    pw_hash = bcrypt.hashpw(data.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    modules = _resolve_modules(data.staff_role, data.allowed_modules)

    user_doc = {
        "id": str(uuid.uuid4()),
        "full_name": data.full_name,
        "username": data.username,
        "email": data.email,
        "phone": data.phone or "",
        "password_hash": pw_hash,
        "role": "admin",                # passes existing require_admin
        "staff_role": data.staff_role,  # discriminator for UI gating
        "allowed_modules": modules,
        "compound_id": compound_id,
        "active": True,
        "email_verified": True,         # admin creates -> trusted
        "created_by": current_user.get("id"),
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user_doc)

    # ``insert_one`` mutates the dict and tacks on a Mongo ``_id`` ObjectId
    # which isn't JSON-serializable. Strip both ``_id`` and ``password_hash``
    # before returning.
    out = {k: v for k, v in user_doc.items() if k not in ("password_hash", "_id")}
    logger.info(f"[staff] created {data.username} role={data.staff_role} modules={modules}")
    return {"saved": True, "staff": out}


@router.put("/staff/{user_id}")
async def update_staff(user_id: str, data: StaffUpdate, current_user: dict = Depends(get_current_user)):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    existing = await db.users.find_one({"id": user_id}, {"_id": 0, "compound_id": 1, "staff_role": 1})
    if not existing:
        raise HTTPException(status_code=404, detail="Staff not found")
    if existing.get("compound_id") != current_user.get("compound_id"):
        raise HTTPException(status_code=403, detail="Out of compound scope")

    patch: dict = {}
    if data.staff_role:
        if data.staff_role not in STAFF_ROLE_PRESETS:
            raise HTTPException(status_code=400, detail="Unknown staff_role")
        patch["staff_role"] = data.staff_role
    if data.allowed_modules is not None or data.staff_role:
        new_role = data.staff_role or existing.get("staff_role") or "staff_general"
        patch["allowed_modules"] = _resolve_modules(new_role, data.allowed_modules)
    if data.active is not None:
        patch["active"] = bool(data.active)
    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update")
    patch["updated_at"] = datetime.now(timezone.utc)
    await db.users.update_one({"id": user_id}, {"$set": patch})
    return {"saved": True, "patch": {k: v for k, v in patch.items() if k != "updated_at"}}


@router.delete("/staff/{user_id}")
async def delete_staff(user_id: str, current_user: dict = Depends(get_current_user)):
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    existing = await db.users.find_one({"id": user_id}, {"compound_id": 1, "staff_role": 1, "_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Staff not found")
    if existing.get("compound_id") != current_user.get("compound_id"):
        raise HTTPException(status_code=403, detail="Out of compound scope")
    if not existing.get("staff_role"):
        raise HTTPException(status_code=400, detail="Not a staff record; refusing to delete")
    await db.users.delete_one({"id": user_id})
    return {"deleted": True, "user_id": user_id}
