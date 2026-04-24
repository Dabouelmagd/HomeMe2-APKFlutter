"""
Linked Accounts — enables an owner / super admin to link their own test
accounts (admin / resident / security / …) and switch between them silently
from the header without re-entering credentials every time.

Model:
  users.linked_test_accounts = [
    { user_id, username, role, compound_id, label, added_at }
  ]

Security:
  • Links are stored server-side on the owner's user document.
  • Adding a link REQUIRES the target account's password — this proves the
    owner legitimately owns that account.
  • Switching only issues a new JWT for an account that the current user
    already linked. No token spoofing possible.
  • Feature available to any role (owner / super_admin / admin), but each
    user only sees their own links.
"""
import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional, List

from database import get_db
from auth_deps import get_current_user, create_access_token

router = APIRouter(prefix="/api/auth")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class LinkAccountBody(BaseModel):
    username: str
    password: str
    label: Optional[str] = None  # optional custom label e.g. "اختبار مقيم"


class SwitchAccountBody(BaseModel):
    target_user_id: str


class UnlinkAccountBody(BaseModel):
    target_user_id: str


def _verify_password(plain: str, stored: str) -> bool:
    """Accept both bcrypt hashes and legacy plain-text (for backward compat)."""
    if not stored:
        return False
    try:
        if stored.startswith("$2a$") or stored.startswith("$2b$") or stored.startswith("$2y$"):
            return bcrypt.checkpw(plain.encode("utf-8"), stored.encode("utf-8"))
    except Exception:
        return False
    return plain == stored


def _safe_user(u: dict) -> dict:
    """Strip secrets and return the public-shape of a linked account entry."""
    return {
        "user_id": u.get("id"),
        "username": u.get("username"),
        "full_name": u.get("full_name"),
        "role": u.get("role"),
        "compound_id": u.get("compound_id", ""),
        "email": u.get("email", ""),
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/linked-accounts")
async def list_linked_accounts(current_user: dict = Depends(get_current_user)):
    """Return the current user's linked test accounts (freshly enriched)."""
    db = get_db()
    linked = current_user.get("linked_test_accounts") or []
    result: List[dict] = []
    for entry in linked:
        uid = entry.get("user_id")
        if not uid:
            continue
        u = await db.users.find_one({"id": uid}, {"_id": 0})
        if not u:
            continue
        result.append({
            **_safe_user(u),
            "label": entry.get("label") or u.get("full_name") or u.get("username"),
            "added_at": entry.get("added_at"),
        })
    return {"accounts": result}


@router.post("/link-account")
async def link_account(
    body: LinkAccountBody,
    current_user: dict = Depends(get_current_user),
):
    """Link another account (by username+password) to the current user so it
    can be switched to from the header in one click."""
    db = get_db()
    target = await db.users.find_one({"username": body.username}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="الحساب غير موجود")
    # Cannot link yourself
    if target.get("id") == current_user.get("id"):
        raise HTTPException(status_code=400, detail="لا يمكن ربط حسابك الحالي بنفسه")
    # Verify password — support both bcrypt-hashed and legacy plain-text
    stored = target.get("password_hash") or target.get("password", "")
    if not _verify_password(body.password, stored):
        raise HTTPException(status_code=401, detail="كلمة المرور غير صحيحة")

    # De-dupe
    existing = current_user.get("linked_test_accounts") or []
    if any(e.get("user_id") == target["id"] for e in existing):
        raise HTTPException(status_code=400, detail="الحساب مربوط بالفعل")

    entry = {
        "user_id": target["id"],
        "username": target["username"],
        "role": target.get("role"),
        "compound_id": target.get("compound_id", ""),
        "label": body.label or target.get("full_name") or target["username"],
        "added_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$push": {"linked_test_accounts": entry}},
    )
    return {"ok": True, "account": {**_safe_user(target), "label": entry["label"]}}


@router.post("/unlink-account")
async def unlink_account(
    body: UnlinkAccountBody,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$pull": {"linked_test_accounts": {"user_id": body.target_user_id}}},
    )
    return {"ok": True}


@router.post("/switch-account")
async def switch_account(
    body: SwitchAccountBody,
    current_user: dict = Depends(get_current_user),
):
    """Issue a JWT for a linked account — silent re-auth from the header."""
    db = get_db()
    linked = current_user.get("linked_test_accounts") or []
    if not any(e.get("user_id") == body.target_user_id for e in linked):
        raise HTTPException(status_code=403, detail="هذا الحساب غير مربوط بحسابك")

    target = await db.users.find_one({"id": body.target_user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="الحساب غير موجود")

    access_token = create_access_token(data={"sub": target["id"]})

    # Fetch the compound name if any
    compound_name = ""
    if target.get("compound_id"):
        c = await db.compounds.find_one({"id": target["compound_id"]}, {"_id": 0, "name": 1})
        if c:
            compound_name = c.get("name", "")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": target["id"],
            "username": target["username"],
            "role": target["role"],
            "compound_id": target.get("compound_id", ""),
            "compound_name": compound_name,
            "unit_number": target.get("unit_number"),
            "full_name": target["full_name"],
            "is_family_head": target.get("is_family_head", False),
            "family_id": target.get("family_id"),
            "subscription_active": target.get("subscription_active", False),
            "subscription_type": target.get("subscription_type", "trial"),
            "subscription_plan": target.get("subscription_plan"),
            "subscription_end": target.get("subscription_end"),
        },
    }
