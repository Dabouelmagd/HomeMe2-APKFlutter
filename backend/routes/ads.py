"""
Internal Ads Management System - Super Admin controlled
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
import uuid
import logging
import os
import base64

from database import get_db
from auth_deps import get_current_user, require_super_admin

router = APIRouter(prefix="/api")


class AdCreate(BaseModel):
    title: str
    image_url: str = ""
    link_url: str = ""
    description: str = ""
    position: str = "sidebar"  # sidebar, banner, inline, popup
    dimensions: str = ""  # e.g. "728x90", "300x250"
    target_compounds: list = []  # empty = all compounds
    is_active: bool = True
    is_gift: bool = False
    ad_value: float = 0  # monetary value (0 if gift)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    priority: int = 0


class AdUpdate(BaseModel):
    title: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    description: Optional[str] = None
    position: Optional[str] = None
    dimensions: Optional[str] = None
    target_compounds: Optional[list] = None
    is_active: Optional[bool] = None
    is_gift: Optional[bool] = None
    ad_value: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
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
        "dimensions": data.dimensions,
        "target_compounds": data.target_compounds,
        "is_active": data.is_active,
        "is_gift": data.is_gift,
        "ad_value": data.ad_value if not data.is_gift else 0,
        "start_date": data.start_date,
        "end_date": data.end_date,
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
        "total_views": sum(a.get("views", 0) for a in ads),
        "total_revenue": sum(a.get("ad_value", 0) for a in ads if not a.get("is_gift")),
        "gift_ads": len([a for a in ads if a.get("is_gift")]),
    }
    return {"ads": ads, "stats": stats}


@router.get("/ads/by-compounds")
async def get_ads_by_compounds(compound_ids: str = "", current_user: dict = Depends(require_super_admin)):
    """Get ads that target specific compounds"""
    db = get_db()
    cids = [c.strip() for c in compound_ids.split(",") if c.strip()] if compound_ids else []
    all_ads = await db.internal_ads.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    if cids:
        filtered = [a for a in all_ads if any(c in a.get("target_compounds", []) for c in cids) or (not a.get("target_compounds") and False)]
    else:
        filtered = all_ads
    return {"ads": filtered}


# ==================== Hybrid Ad Settings ====================

@router.get("/ads/ad-settings")
async def get_ad_settings(current_user: dict = Depends(get_current_user)):
    """Get ad display settings for each position"""
    db = get_db()
    settings = await db.app_settings.find_one({"key": "ad_settings"}, {"_id": 0}) or {}
    defaults = {
        "banner": {"mode": "internal_first", "adsense_enabled": True, "internal_enabled": True},
        "sidebar": {"mode": "internal_first", "adsense_enabled": False, "internal_enabled": True},
        "dashboard": {"mode": "internal_only", "adsense_enabled": False, "internal_enabled": True},
        "inline": {"mode": "internal_first", "adsense_enabled": True, "internal_enabled": True},
    }
    positions = settings.get("positions", defaults)
    return {
        "adsense_publisher_id": settings.get("adsense_publisher_id", "ca-pub-5928973437129941"),
        "adsense_global_enabled": settings.get("adsense_global_enabled", True),
        "positions": positions,
    }


@router.put("/ads/ad-settings")
async def update_ad_settings(body: dict, current_user: dict = Depends(require_super_admin)):
    """Update ad display settings"""
    db = get_db()
    update = {"key": "ad_settings"}
    if "adsense_global_enabled" in body:
        update["adsense_global_enabled"] = body["adsense_global_enabled"]
    if "adsense_publisher_id" in body:
        update["adsense_publisher_id"] = body["adsense_publisher_id"]
    if "positions" in body:
        update["positions"] = body["positions"]
    await db.app_settings.update_one({"key": "ad_settings"}, {"$set": update}, upsert=True)
    return {"message": "تم تحديث إعدادات الإعلانات"}


@router.get("/ads/active")
async def get_active_ads(position: str = "", compound_id: str = "", current_user: dict = Depends(get_current_user)):
    """Get active ads for display inside the app"""
    db = get_db()
    query = {"is_active": True}
    if position:
        query["position"] = position

    # Check date validity
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    ads = await db.internal_ads.find(query, {"_id": 0}).sort("priority", -1).to_list(50)

    # Filter by compound targeting
    if compound_id:
        ads = [a for a in ads if not a.get("target_compounds") or compound_id in a.get("target_compounds", [])]

    # Filter by date range
    valid_ads = []
    for a in ads:
        start = a.get("start_date")
        end = a.get("end_date")
        if start and start > now:
            continue
        if end and end < now:
            continue
        valid_ads.append(a)

    # Track views
    ad_ids = [a["id"] for a in valid_ads if a.get("id")]
    if ad_ids:
        await db.internal_ads.update_many(
            {"id": {"$in": ad_ids}},
            {"$inc": {"views": 1}}
        )

    return {"ads": valid_ads}


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
    now = datetime.now(timezone.utc)
    await db.internal_ads.update_one({"id": ad_id}, {"$inc": {"clicks": 1}})
    # Log click event for analytics
    await db.ad_events.insert_one({
        "ad_id": ad_id,
        "event": "click",
        "user_id": current_user.get("id", ""),
        "compound_id": current_user.get("compound_id", ""),
        "timestamp": now.isoformat(),
    })
    return {"ok": True}


@router.get("/ads/analytics")
async def get_ad_analytics(current_user: dict = Depends(require_super_admin)):
    """Get ad performance analytics for charts"""
    db = get_db()
    ads = await db.internal_ads.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)

    # Per-ad stats
    ad_stats = []
    for a in ads:
        clicks = a.get("clicks", 0)
        views = a.get("views", 0)
        ctr = round((clicks / views * 100), 2) if views > 0 else 0
        ad_stats.append({
            "id": a.get("id", ""),
            "title": a.get("title", ""),
            "position": a.get("position", ""),
            "dimensions": a.get("dimensions", ""),
            "is_gift": a.get("is_gift", False),
            "ad_value": a.get("ad_value", 0),
            "clicks": clicks,
            "views": views,
            "ctr": ctr,
            "is_active": a.get("is_active", False),
            "created_at": a.get("created_at", ""),
        })

    # Sort by CTR descending for top performers
    top_by_ctr = sorted([a for a in ad_stats if a["views"] > 0], key=lambda x: x["ctr"], reverse=True)[:5]
    top_by_clicks = sorted(ad_stats, key=lambda x: x["clicks"], reverse=True)[:5]
    top_by_views = sorted(ad_stats, key=lambda x: x["views"], reverse=True)[:5]

    # Aggregate by position
    position_stats = {}
    for a in ad_stats:
        pos = a["position"]
        if pos not in position_stats:
            position_stats[pos] = {"clicks": 0, "views": 0, "count": 0, "revenue": 0}
        position_stats[pos]["clicks"] += a["clicks"]
        position_stats[pos]["views"] += a["views"]
        position_stats[pos]["count"] += 1
        if not a["is_gift"]:
            position_stats[pos]["revenue"] += a["ad_value"]

    position_chart = [
        {"label": pos, "clicks": s["clicks"], "views": s["views"], "count": s["count"], "revenue": s["revenue"]}
        for pos, s in position_stats.items()
    ]

    # Overall summary
    total_clicks = sum(a["clicks"] for a in ad_stats)
    total_views = sum(a["views"] for a in ad_stats)
    total_revenue = sum(a["ad_value"] for a in ad_stats if not a["is_gift"])
    gift_count = len([a for a in ad_stats if a["is_gift"]])
    avg_ctr = round((total_clicks / total_views * 100), 2) if total_views > 0 else 0

    return {
        "summary": {
            "total_ads": len(ad_stats),
            "active_ads": len([a for a in ad_stats if a["is_active"]]),
            "total_clicks": total_clicks,
            "total_views": total_views,
            "avg_ctr": avg_ctr,
            "total_revenue": total_revenue,
            "gift_ads": gift_count,
        },
        "all_ads": ad_stats,
        "top_by_ctr": top_by_ctr,
        "top_by_clicks": top_by_clicks,
        "top_by_views": top_by_views,
        "position_chart": position_chart,
    }


UPLOAD_DIR = "/app/backend/uploads/ads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/ads/upload-media")
async def upload_ad_media(file: UploadFile = File(...), current_user: dict = Depends(require_super_admin)):
    """Upload image or video for an ad"""
    allowed_image = [".jpg", ".jpeg", ".png", ".gif", ".webp"]
    allowed_video = [".mp4", ".webm", ".mov"]
    allowed = allowed_image + allowed_video

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"نوع ملف غير مدعوم. المسموح: {', '.join(allowed)}")

    content = await file.read()
    max_size = 50 * 1024 * 1024  # 50MB
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="حجم الملف كبير جداً (الحد الأقصى 50 ميجا)")

    filename = f"{uuid.uuid4().hex[:12]}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    media_type = "video" if ext in allowed_video else "image"
    media_url = f"/api/ads/media/{filename}"

    return {"url": media_url, "filename": filename, "type": media_type, "size": len(content)}


@router.get("/ads/media/{filename}")
async def serve_ad_media(filename: str):
    """Serve uploaded ad media"""
    from fastapi.responses import FileResponse
    filepath = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="ملف غير موجود")
    return FileResponse(filepath)


# ==================== Hybrid Ad Settings ====================

@router.get("/ads/ad-settings")
async def get_ad_settings(current_user: dict = Depends(get_current_user)):
    """Get ad display settings for each position"""
    db = get_db()
    settings = await db.app_settings.find_one({"key": "ad_settings"}, {"_id": 0}) or {}
    defaults = {
        "banner": {"mode": "internal_first", "adsense_enabled": True, "internal_enabled": True},
        "sidebar": {"mode": "internal_first", "adsense_enabled": False, "internal_enabled": True},
        "dashboard": {"mode": "internal_only", "adsense_enabled": False, "internal_enabled": True},
        "inline": {"mode": "internal_first", "adsense_enabled": True, "internal_enabled": True},
    }
    positions = settings.get("positions", defaults)
    return {
        "adsense_publisher_id": settings.get("adsense_publisher_id", "ca-pub-5928973437129941"),
        "adsense_global_enabled": settings.get("adsense_global_enabled", True),
        "positions": positions,
    }


@router.put("/ads/ad-settings")
async def update_ad_settings(body: dict, current_user: dict = Depends(require_super_admin)):
    """Update ad display settings"""
    db = get_db()
    update = {"key": "ad_settings"}
    if "adsense_global_enabled" in body:
        update["adsense_global_enabled"] = body["adsense_global_enabled"]
    if "adsense_publisher_id" in body:
        update["adsense_publisher_id"] = body["adsense_publisher_id"]
    if "positions" in body:
        update["positions"] = body["positions"]
    await db.app_settings.update_one({"key": "ad_settings"}, {"$set": update}, upsert=True)
    return {"message": "تم تحديث إعدادات الإعلانات"}
