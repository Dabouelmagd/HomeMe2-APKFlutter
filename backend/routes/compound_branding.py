"""
Compound branding endpoints — let admins customize PDF report look.
GET /api/compounds/{id}/branding   — current settings
PUT /api/compounds/{id}/branding   — update (RBAC: admin/compound_admin of that compound, or app_owner/super_admin)
POST /api/compounds/{id}/branding/logo  — upload logo file (multipart)
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
import uuid
import os

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api/compounds")

LOGO_DIR = Path("/app/uploads/branding")
LOGO_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"}
MAX_LOGO_BYTES = 2 * 1024 * 1024  # 2 MB


class BrandingPayload(BaseModel):
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    brand_label: Optional[str] = None
    tagline: Optional[str] = None
    signature_text: Optional[str] = None


def _can_edit(user: dict, compound_id: str) -> bool:
    role = user.get("role", "")
    if role in ("app_owner", "super_admin"):
        return True
    if role in ("admin", "compound_admin") and user.get("compound_id") == compound_id:
        return True
    return False


@router.get("/{compound_id}/branding")
async def get_branding(compound_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    if not _can_edit(current_user, compound_id):
        raise HTTPException(status_code=403, detail="Access denied")
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0, "name": 1, "branding": 1})
    if not compound:
        raise HTTPException(status_code=404, detail="Compound not found")
    return {"compound_id": compound_id, "name": compound.get("name"), "branding": compound.get("branding") or {}}


@router.put("/{compound_id}/branding")
async def update_branding(compound_id: str, payload: BrandingPayload, current_user: dict = Depends(get_current_user)):
    db = get_db()
    if not _can_edit(current_user, compound_id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Light validation on color hex codes
    branding = payload.model_dump(exclude_none=True)
    for k in ("primary_color", "secondary_color", "accent_color"):
        v = branding.get(k)
        if v and not (v.startswith("#") and 4 <= len(v) <= 9):
            raise HTTPException(status_code=400, detail=f"{k} must be a hex color (e.g. #4338ca)")

    result = await db.compounds.update_one(
        {"id": compound_id},
        {"$set": {f"branding.{k}": v for k, v in branding.items()}} if branding else {"$set": {}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Compound not found")

    fresh = await db.compounds.find_one({"id": compound_id}, {"_id": 0, "branding": 1})
    return {"branding": fresh.get("branding") or {}, "updated": True}


@router.post("/{compound_id}/branding/logo")
async def upload_logo(
    compound_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    if not _can_edit(current_user, compound_id):
        raise HTTPException(status_code=403, detail="Access denied")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="نوع ملف غير مدعوم. الأنواع المسموحة: PNG, JPG, WEBP, SVG")

    contents = await file.read()
    if len(contents) > MAX_LOGO_BYTES:
        raise HTTPException(status_code=413, detail="حجم الملف يتجاوز 2 ميجابايت")
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="ملف فارغ")

    ext_map = {"image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg", "image/webp": "webp", "image/svg+xml": "svg"}
    ext = ext_map.get(file.content_type, "png")
    filename = f"{compound_id}_{uuid.uuid4().hex[:8]}.{ext}"
    dest = LOGO_DIR / filename
    dest.write_bytes(contents)

    logo_url = f"/api/files/branding/{filename}"

    # Persist to compound document
    await db.compounds.update_one(
        {"id": compound_id},
        {"$set": {"branding.logo_url": logo_url}},
    )

    return {"logo_url": logo_url, "size_bytes": len(contents), "filename": filename}
