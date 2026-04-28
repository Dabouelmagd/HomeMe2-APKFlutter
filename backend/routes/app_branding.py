"""
HomeMe App-Level Branding (Global)

This is the GLOBAL branding for the HomeMe application itself — used by:
- Owner / Super Admin header & sidebar (when no compound is selected)
- Login / Register / public pages
- Global PDF reports (cross-compound)
- System emails

Stored in MongoDB collection `app_settings` under doc id="homeme_branding".
Logo uploads go to /app/uploads/homeme/ and are served via /api/files/homeme/{filename}.

Endpoints:
- GET  /api/app-branding              — public (no auth) — used by Login page, etc.
- PUT  /api/app-branding              — owner-only — update name/colors/tagline
- POST /api/app-branding/logo         — owner-only — upload logo file
"""
from __future__ import annotations

import os
import re
import secrets
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from auth_deps import get_current_user
from database import get_db

router = APIRouter(prefix="/api/app-branding", tags=["app-branding"])

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/app/uploads"))
HOMEME_DIR = UPLOAD_DIR / "homeme"
HOMEME_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT = {
    "doc_id": "homeme_branding",
    "logo_url": None,
    "app_name_ar": "هوم مي",
    "app_name_en": "HomeMe",
    "tagline_ar": "إدارة المجتمعات السكنية بسهولة",
    "tagline_en": "Smart compound management",
    "primary_color": "#e11d48",       # rose-600
    "secondary_color": "#7c3aed",     # violet-600
    "accent_color": "#f59e0b",        # amber-500
}

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"}
EXT_BY_TYPE = {
    "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg",
    "image/webp": "webp", "image/svg+xml": "svg",
}
MAX_BYTES = 2 * 1024 * 1024  # 2 MB
HEX_RX = re.compile(r"^#(?:[0-9a-fA-F]{3,8})$")


def _require_owner(current_user: dict):
    role = (current_user or {}).get("role")
    if role not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="هذه الصفحة متاحة للمالك فقط")
    return current_user


async def _get_or_create(db) -> dict:
    doc = await db.app_settings.find_one({"doc_id": "homeme_branding"}, {"_id": 0})
    if doc:
        return {**DEFAULT, **doc}
    seed = {**DEFAULT, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.app_settings.insert_one(dict(seed))
    seed.pop("_id", None)
    return seed


@router.get("")
async def get_branding():
    """Public endpoint — used by Login/Register and any public page."""
    db = get_db()
    return await _get_or_create(db)


@router.put("")
async def update_branding(payload: dict, current_user: dict = Depends(get_current_user)):
    _require_owner(current_user)
    db = get_db()
    allowed = {"app_name_ar", "app_name_en", "tagline_ar", "tagline_en",
               "primary_color", "secondary_color", "accent_color", "logo_url"}
    update = {}
    for k, v in (payload or {}).items():
        if k not in allowed:
            continue
        if k.endswith("_color") and v and not HEX_RX.match(str(v)):
            raise HTTPException(status_code=400, detail=f"لون غير صالح: {k}")
        update[k] = v
    if not update:
        raise HTTPException(status_code=400, detail="لا توجد حقول للتحديث")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    update["updated_by"] = current_user.get("id")
    await db.app_settings.update_one(
        {"doc_id": "homeme_branding"},
        {"$set": update, "$setOnInsert": {"doc_id": "homeme_branding"}},
        upsert=True,
    )
    return await _get_or_create(db)


@router.post("/logo")
async def upload_logo(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    _require_owner(current_user)
    ct = (file.content_type or "").lower()
    if ct not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="نوع الصورة غير مدعوم. PNG / JPG / WEBP / SVG فقط")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="حجم الملف يتجاوز 2 ميجا")
    ext = EXT_BY_TYPE[ct]
    fname = f"homeme_{secrets.token_hex(8)}.{ext}"
    path = HOMEME_DIR / fname
    path.write_bytes(data)
    url = f"/api/files/homeme/{fname}"

    db = get_db()
    await db.app_settings.update_one(
        {"doc_id": "homeme_branding"},
        {"$set": {"logo_url": url,
                  "updated_at": datetime.now(timezone.utc).isoformat(),
                  "updated_by": current_user.get("id")},
         "$setOnInsert": {"doc_id": "homeme_branding"}},
        upsert=True,
    )
    return {"success": True, "logo_url": url}
