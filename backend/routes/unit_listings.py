"""
Unit Listings — وحدات للإيجار / البيع / التشطيب / إلخ
نظام إعلانات الوحدات داخل الكمبوند
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from datetime import datetime, timezone
from typing import Optional, List
import uuid, os, aiofiles

from database import get_db
from auth_deps import get_current_user, require_admin

router = APIRouter(prefix="/api", tags=["unit-listings"])

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/uploads")

LISTING_TYPES = {
    "rent":      {"ar": "إيجار",    "color": "blue"},
    "sale":      {"ar": "بيع",      "color": "green"},
    "finishing": {"ar": "تشطيب",   "color": "purple"},
    "exchange":  {"ar": "مبادلة",  "color": "amber"},
    "other":     {"ar": "أخرى",    "color": "gray"},
}


# ── Create listing ─────────────────────────────────────────────────────────
@router.post("/unit-listings")
async def create_listing(
    title: str = Form(...),
    description: str = Form(""),
    listing_type: str = Form("rent"),
    price: float = Form(0),
    price_period: str = Form("شهري"),   # شهري / سنوي / إجمالي
    area: float = Form(0),
    rooms: int = Form(0),
    bathrooms: int = Form(0),
    floor: int = Form(0),
    unit_number: str = Form(""),
    contact_phone: str = Form(""),
    contact_name: str = Form(""),
    compound_id: str = Form(""),
    amenities: str = Form("[]"),   # JSON string list
    images: List[UploadFile] = File([]),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()

    # Resolve compound
    effective_compound = compound_id or current_user.get("compound_id", "")
    if not effective_compound or effective_compound == "default-compound":
        raise HTTPException(status_code=400, detail="compound_id مطلوب")

    # Save images
    image_urls = []
    if images:
        os.makedirs(f"{UPLOAD_DIR}/listings", exist_ok=True)
        for img in images[:6]:   # max 6 images
            if img and img.filename:
                ext = img.filename.rsplit(".", 1)[-1].lower()
                fname = f"listing_{uuid.uuid4().hex[:8]}.{ext}"
                fpath = f"{UPLOAD_DIR}/listings/{fname}"
                content = await img.read()
                async with aiofiles.open(fpath, "wb") as f:
                    await f.write(content)
                image_urls.append(f"/api/files/listings/{fname}")

    import json
    try:
        amenities_list = json.loads(amenities) if amenities else []
    except Exception:
        amenities_list = []

    listing = {
        "id": str(uuid.uuid4()),
        "compound_id": effective_compound,
        "created_by": current_user["id"],
        "creator_name": current_user.get("full_name") or current_user.get("username"),
        "creator_role": current_user.get("role", ""),
        "title": title,
        "description": description,
        "listing_type": listing_type,      # rent / sale / finishing / exchange / other
        "price": price,
        "price_period": price_period,
        "area": area,
        "rooms": rooms,
        "bathrooms": bathrooms,
        "floor": floor,
        "unit_number": unit_number,
        "contact_phone": contact_phone or current_user.get("phone", ""),
        "contact_name": contact_name or current_user.get("full_name", ""),
        "amenities": amenities_list,
        "images": image_urls,
        "status": "active",               # active / rented / sold / expired
        "views": 0,
        "created_at": now,
        "updated_at": now,
    }
    await db.unit_listings.insert_one(listing)
    listing.pop("_id", None)
    return {"success": True, "listing": listing}


# ── Get listings for a compound ────────────────────────────────────────────
@router.get("/unit-listings")
async def get_listings(
    compound_id: Optional[str] = None,
    listing_type: Optional[str] = None,
    status: Optional[str] = "active",
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    role = current_user.get("role", "")

    query = {}
    if status:
        query["status"] = status

    if compound_id:
        query["compound_id"] = compound_id
    elif role in ("app_owner", "super_admin"):
        pass  # sees all
    elif role == "company_admin" and current_user.get("company_id"):
        # Get all compounds under this company
        compounds = await db.compounds.find(
            {"$or": [
                {"company_id": current_user["company_id"]},
                {"management_company_id": current_user["company_id"]},
            ]}, {"_id": 0, "id": 1}
        ).to_list(200)
        cids = [c["id"] for c in compounds]
        query["compound_id"] = {"$in": cids}
    else:
        query["compound_id"] = current_user.get("compound_id", "")

    if listing_type:
        query["listing_type"] = listing_type

    listings = await db.unit_listings.find(query, {"_id": 0}).sort(
        "created_at", -1
    ).limit(limit).to_list(limit)

    return {"listings": listings, "total": len(listings)}


# ── Get single listing ─────────────────────────────────────────────────────
@router.get("/unit-listings/{listing_id}")
async def get_listing(listing_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    listing = await db.unit_listings.find_one({"id": listing_id}, {"_id": 0})
    if not listing:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    # Increment views
    await db.unit_listings.update_one({"id": listing_id}, {"$inc": {"views": 1}})
    return listing


# ── Update listing ─────────────────────────────────────────────────────────
@router.put("/unit-listings/{listing_id}")
async def update_listing(
    listing_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    listing = await db.unit_listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="غير موجود")
    # Only creator or admin can update
    role = current_user.get("role", "")
    if listing["created_by"] != current_user["id"] and role not in ("admin", "super_admin", "app_owner", "company_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")

    allowed = {"title", "description", "listing_type", "price", "price_period",
               "area", "rooms", "bathrooms", "floor", "unit_number",
               "contact_phone", "contact_name", "amenities", "status"}
    update = {k: v for k, v in body.items() if k in allowed}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.unit_listings.update_one({"id": listing_id}, {"$set": update})
    return {"success": True}


# ── Delete listing ─────────────────────────────────────────────────────────
@router.delete("/unit-listings/{listing_id}")
async def delete_listing(listing_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    listing = await db.unit_listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="غير موجود")
    role = current_user.get("role", "")
    if listing["created_by"] != current_user["id"] and role not in ("admin", "super_admin", "app_owner", "company_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    await db.unit_listings.delete_one({"id": listing_id})
    return {"success": True}


# ── Stats for dashboards ────────────────────────────────────────────────────
@router.get("/unit-listings/stats/summary")
async def get_stats(
    compound_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    role = current_user.get("role", "")

    # Build scope
    if role in ("app_owner", "super_admin"):
        scope = {}
    elif role == "company_admin" and current_user.get("company_id"):
        compounds = await db.compounds.find(
            {"$or": [
                {"company_id": current_user["company_id"]},
                {"management_company_id": current_user["company_id"]},
            ]}, {"_id": 0, "id": 1}
        ).to_list(200)
        scope = {"compound_id": {"$in": [c["id"] for c in compounds]}}
    else:
        scope = {"compound_id": compound_id or current_user.get("compound_id", "")}

    total = await db.unit_listings.count_documents(scope)
    by_type = {}
    for t in LISTING_TYPES:
        by_type[t] = await db.unit_listings.count_documents({**scope, "listing_type": t, "status": "active"})

    active = await db.unit_listings.count_documents({**scope, "status": "active"})
    rented = await db.unit_listings.count_documents({**scope, "status": "rented"})
    sold = await db.unit_listings.count_documents({**scope, "status": "sold"})

    return {
        "total": total,
        "active": active,
        "rented": rented,
        "sold": sold,
        "by_type": by_type,
        "types": LISTING_TYPES,
    }
