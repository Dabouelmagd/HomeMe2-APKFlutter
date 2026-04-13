"""
Internal Ads Management System - Super Admin controlled
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
import uuid
import logging

from database import get_db
from auth_deps import get_current_user, require_super_admin

router = APIRouter(prefix="/api")


class AdCreate(BaseModel):
    title: str
    image_url: str = ""
    link_url: str = ""
    description: str = ""
    position: str = "sidebar"  # sidebar, banner, inline, popup
    target_compounds: list = []  # empty = all compounds
    is_active: bool = True
    priority: int = 0


class AdUpdate(BaseModel):
    title: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    description: Optional[str] = None
    position: Optional[str] = None
    target_compounds: Optional[list] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None


@router.post("/ads")
async def create_ad(data: AdCreate, current_user: dict = Depends(require_super_admin)):
    db = get_db()
    ad = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "image_url": data.image_url,
        "link_url": data.link_url,
        "description": data.description,
        "position": data.position,
        "target_compounds": data.target_compounds,
        "is_active": data.is_active,
        "priority": data.priority,
        "clicks": 0,
        "views": 0,
        "created_by": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.internal_ads.insert_one(ad)
    ad.pop("_id", None)
    return {"message": "تم إنشاء الإعلان بنجاح", "ad": ad}


@router.get("/ads")
async def get_all_ads(current_user: dict = Depends(require_super_admin)):
    db = get_db()
    ads = await db.internal_ads.find({}, {"_id": 0}).sort("priority", -1).to_list(200)
    stats = {
        "total": len(ads),
        "active": len([a for a in ads if a.get("is_active")]),
        "total_clicks": sum(a.get("clicks", 0) for a in ads),
        "total_views": sum(a.get("views", 0) for a in ads)
    }
    return {"ads": ads, "stats": stats}


@router.get("/ads/active")
async def get_active_ads(position: str = "", compound_id: str = "", current_user: dict = Depends(get_current_user)):
    """Get active ads for display inside the app"""
    db = get_db()
    query = {"is_active": True}
    if position:
        query["position"] = position
    ads = await db.internal_ads.find(query, {"_id": 0}).sort("priority", -1).to_list(50)
    # Filter by compound
    if compound_id:
        ads = [a for a in ads if not a.get("target_compounds") or compound_id in a.get("target_compounds", [])]
    return {"ads": ads}


@router.put("/ads/{ad_id}")
async def update_ad(ad_id: str, data: AdUpdate, current_user: dict = Depends(require_super_admin)):
    db = get_db()
    update = {k: v for k, v in data.dict().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.internal_ads.update_one({"id": ad_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="إعلان غير موجود")
    return {"message": "تم تحديث الإعلان"}


@router.put("/ads/{ad_id}/toggle")
async def toggle_ad(ad_id: str, current_user: dict = Depends(require_super_admin)):
    db = get_db()
    ad = await db.internal_ads.find_one({"id": ad_id})
    if not ad:
        raise HTTPException(status_code=404, detail="إعلان غير موجود")
    new_status = not ad.get("is_active", True)
    await db.internal_ads.update_one({"id": ad_id}, {"$set": {"is_active": new_status}})
    return {"message": f"تم {'تفعيل' if new_status else 'تعطيل'} الإعلان", "is_active": new_status}


@router.delete("/ads/{ad_id}")
async def delete_ad(ad_id: str, current_user: dict = Depends(require_super_admin)):
    db = get_db()
    result = await db.internal_ads.delete_one({"id": ad_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="إعلان غير موجود")
    return {"message": "تم حذف الإعلان"}


@router.post("/ads/{ad_id}/click")
async def track_ad_click(ad_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    await db.internal_ads.update_one({"id": ad_id}, {"$inc": {"clicks": 1}})
    return {"ok": True}
