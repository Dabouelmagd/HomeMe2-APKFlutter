"""
Compound branding endpoints — let admins customize PDF report look.
GET /api/compounds/{id}/branding   — current settings
PUT /api/compounds/{id}/branding   — update (RBAC: admin/compound_admin of that compound, or app_owner/super_admin)
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api/compounds")


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
