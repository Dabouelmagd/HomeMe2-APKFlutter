"""
Unit Listings — نظام إعلانات الوحدات الكامل
- السكان ينشرون → الأدمن يوافق → يظهر للجميع
- عمولة للكمبوند مخفية عن المعلن
- صور + مستندات + موقع + تفاصيل كاملة
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from datetime import datetime, timezone
from typing import Optional, List
import uuid, os, aiofiles, json

from database import get_db
from auth_deps import get_current_user, require_admin

router = APIRouter(prefix="/api", tags=["unit-listings"])

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/app/uploads")

LISTING_TYPES = {
    "rent":      {"ar": "إيجار",   "color": "blue"},
    "sale":      {"ar": "بيع",     "color": "green"},
    "finishing": {"ar": "تشطيب",  "color": "purple"},
    "exchange":  {"ar": "مبادلة", "color": "amber"},
    "other":     {"ar": "أخرى",   "color": "gray"},
}


async def _save_files(files: List[UploadFile], sub: str) -> List[str]:
    urls = []
    if not files:
        return urls
    os.makedirs(f"{UPLOAD_DIR}/{sub}", exist_ok=True)
    for f in files[:8]:
        if f and f.filename:
            ext = f.filename.rsplit(".", 1)[-1].lower()
            fname = f"{sub[:4]}_{uuid.uuid4().hex[:10]}.{ext}"
            fpath = f"{UPLOAD_DIR}/{sub}/{fname}"
            content = await f.read()
            async with aiofiles.open(fpath, "wb") as fp:
                await fp.write(content)
            urls.append(f"/api/files/{sub}/{fname}")
    return urls


# ── Create listing (resident or admin) ─────────────────────────────────────
@router.post("/unit-listings")
async def create_listing(
    # Basic info
    title: str = Form(...),
    listing_type: str = Form("rent"),       # rent / sale / finishing / exchange / other
    description: str = Form(""),
    unit_number: str = Form(""),
    compound_id: str = Form(""),
    floor: int = Form(0),
    area: float = Form(0),

    # Furnishing & finishing
    furnished: str = Form("unfurnished"),   # furnished / semi / unfurnished
    has_ac: bool = Form(False),
    has_kitchen: bool = Form(False),
    has_appliances: bool = Form(False),
    finishing_level: str = Form(""),        # super_lux / lux / standard / unfinished

    # Pricing
    price: float = Form(0),
    price_period: str = Form("إجمالي"),    # شهري / سنوي / إجمالي / يومي
    price_negotiable: bool = Form(False),
    offer_price: float = Form(0),          # رقم أوفر / سعر مقترح يُضاف
    fully_paid: bool = Form(True),         # مسدد بالكامل؟
    has_installments: bool = Form(False),   # عليها أقساط؟
    remaining_installments: float = Form(0),# المبلغ المتبقي من الأقساط

    # Rooms
    rooms: int = Form(0),
    bathrooms: int = Form(0),
    reception: int = Form(0),

    # Contact
    contact_name: str = Form(""),
    contact_phone: str = Form(""),
    contact_whatsapp: str = Form(""),

    # Location
    lat: float = Form(0),
    lng: float = Form(0),
    location_notes: str = Form(""),

    # Features (comma-separated)
    amenities: str = Form(""),

    # Commission (hidden from public, set by resident before submit)
    commission_percent: float = Form(0),    # % نسبة العمولة للكمبوند

    # Files
    images: List[UploadFile] = File([]),
    documents: List[UploadFile] = File([]),  # أوراق الوحدة

    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    role = current_user.get("role", "")

    effective_compound = compound_id or current_user.get("compound_id", "")
    if not effective_compound or effective_compound == "default-compound":
        raise HTTPException(status_code=400, detail="compound_id مطلوب")

    # Save files
    image_urls = await _save_files(images, "listings")
    doc_urls = await _save_files(documents, "listing_docs")

    amenities_list = [a.strip() for a in amenities.split(",") if a.strip()] if amenities else []

    # Status: admin/owner auto-approved, residents need approval
    auto_approve = role in ("app_owner", "super_admin", "admin", "company_admin", "manager")
    status = "active" if auto_approve else "pending"

    listing = {
        "id": str(uuid.uuid4()),
        "compound_id": effective_compound,
        "created_by": current_user["id"],
        "creator_name": current_user.get("full_name") or current_user.get("username"),
        "creator_role": role,
        "creator_phone": current_user.get("phone", ""),

        # Basic
        "title": title,
        "listing_type": listing_type,
        "description": description,
        "unit_number": unit_number,
        "floor": floor,
        "area": area,

        # Furnishing & finishing
        "furnished": furnished,             # furnished / semi / unfurnished
        "has_ac": has_ac,
        "has_kitchen": has_kitchen,
        "has_appliances": has_appliances,
        "finishing_level": finishing_level, # super_lux / lux / standard / unfinished

        # Pricing
        "price": price,
        "price_period": price_period,
        "price_negotiable": price_negotiable,
        "offer_price": offer_price,
        "fully_paid": fully_paid,
        "has_installments": has_installments,
        "remaining_installments": remaining_installments,

        # Rooms
        "rooms": rooms,
        "bathrooms": bathrooms,
        "reception": reception,

        # Contact
        "contact_name": contact_name or current_user.get("full_name", ""),
        "contact_phone": contact_phone or current_user.get("phone", ""),
        "contact_whatsapp": contact_whatsapp,

        # Location
        "lat": lat,
        "lng": lng,
        "location_notes": location_notes,

        # Features
        "amenities": amenities_list,

        # Commission (HIDDEN from public — admin only)
        "commission_percent": commission_percent,
        "commission_amount": round(price * commission_percent / 100, 2) if price and commission_percent else 0,

        # Files
        "images": image_urls,
        "documents": doc_urls,

        # Status
        "status": status,                   # pending / active / rented / sold / rejected
        "views": 0,
        "approved_by": current_user["id"] if auto_approve else None,
        "approved_at": now if auto_approve else None,
        "rejection_reason": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.unit_listings.insert_one(listing)
    listing.pop("_id", None)

    # Notify compound admin of pending listing
    if not auto_approve:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "compound_id": effective_compound,
            "target_role": "admin",
            "type": "listing_approval",
            "title": "طلب نشر إعلان وحدة",
            "body": f"{listing['creator_name']} طلب نشر إعلان: {title}",
            "listing_id": listing["id"],
            "read": False,
            "created_at": now,
        })

    return {"success": True, "listing": listing, "status": status}


# ── Admin: approve / reject ────────────────────────────────────────────────
@router.put("/unit-listings/{listing_id}/approve")
async def approve_listing(
    listing_id: str,
    body: dict,
    current_user: dict = Depends(require_admin),
):
    db = get_db()
    action = body.get("action", "approve")   # approve / reject
    reason = body.get("reason", "")

    if action == "approve":
        await db.unit_listings.update_one(
            {"id": listing_id},
            {"$set": {
                "status": "active",
                "approved_by": current_user["id"],
                "approved_at": datetime.now(timezone.utc).isoformat(),
                "rejection_reason": None,
            }}
        )
        return {"success": True, "status": "active"}
    else:
        await db.unit_listings.update_one(
            {"id": listing_id},
            {"$set": {
                "status": "rejected",
                "rejection_reason": reason,
                "approved_by": current_user["id"],
            }}
        )
        return {"success": True, "status": "rejected"}


# ── Get listings ────────────────────────────────────────────────────────────
@router.get("/unit-listings")
async def get_listings(
    compound_id: Optional[str] = None,
    listing_type: Optional[str] = None,
    status: Optional[str] = None,
    furnished: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    rooms: Optional[int] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    role = current_user.get("role", "")
    is_admin = role in ("app_owner", "super_admin", "admin", "company_admin", "manager")

    query = {}

    # Status filter
    if status:
        query["status"] = status
    elif not is_admin:
        query["status"] = "active"  # residents only see active
    else:
        query["status"] = {"$in": ["active", "pending", "rejected", "rented", "sold"]}

    # Compound scope
    if compound_id:
        query["compound_id"] = compound_id
    elif role in ("app_owner", "super_admin"):
        pass
    elif role == "company_admin" and current_user.get("company_id"):
        compounds = await db.compounds.find(
            {"$or": [
                {"company_id": current_user["company_id"]},
                {"management_company_id": current_user["company_id"]},
            ]}, {"_id": 0, "id": 1}
        ).to_list(200)
        query["compound_id"] = {"$in": [c["id"] for c in compounds]}
    else:
        query["compound_id"] = current_user.get("compound_id", "")

    if listing_type:
        query["listing_type"] = listing_type
    if furnished:
        query["furnished"] = furnished
    if min_price:
        query["price"] = {"$gte": min_price}
    if max_price:
        query.setdefault("price", {})["$lte"] = max_price
    if rooms:
        query["rooms"] = rooms

    listings = await db.unit_listings.find(query, {"_id": 0}).sort(
        "created_at", -1
    ).limit(limit).to_list(limit)

    # Hide commission from non-admins
    if not is_admin:
        for l in listings:
            l.pop("commission_percent", None)
            l.pop("commission_amount", None)
            l.pop("documents", None)  # documents for admin/owner only

    return {"listings": listings, "total": len(listings)}


# ── Get pending (admin) ─────────────────────────────────────────────────────
@router.get("/unit-listings/pending")
async def get_pending(current_user: dict = Depends(require_admin)):
    db = get_db()
    role = current_user.get("role", "")
    query = {"status": "pending"}
    if role not in ("app_owner", "super_admin"):
        query["compound_id"] = current_user.get("compound_id", "")
    items = await db.unit_listings.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"listings": items, "total": len(items)}


# ── Get single ──────────────────────────────────────────────────────────────
@router.get("/unit-listings/{listing_id}")
async def get_listing(listing_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    l = await db.unit_listings.find_one({"id": listing_id}, {"_id": 0})
    if not l:
        raise HTTPException(status_code=404, detail="الإعلان غير موجود")
    await db.unit_listings.update_one({"id": listing_id}, {"$inc": {"views": 1}})
    role = current_user.get("role", "")
    is_admin = role in ("app_owner", "super_admin", "admin", "company_admin", "manager")
    is_owner = l["created_by"] == current_user["id"]
    if not is_admin and not is_owner:
        l.pop("commission_percent", None)
        l.pop("commission_amount", None)
        l.pop("documents", None)
    return l


# ── Update listing ──────────────────────────────────────────────────────────
@router.put("/unit-listings/{listing_id}")
async def update_listing(
    listing_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    l = await db.unit_listings.find_one({"id": listing_id})
    if not l:
        raise HTTPException(status_code=404, detail="غير موجود")
    role = current_user.get("role", "")
    is_admin = role in ("app_owner", "super_admin", "admin", "company_admin", "manager")
    if l["created_by"] != current_user["id"] and not is_admin:
        raise HTTPException(status_code=403, detail="غير مصرح")

    allowed = {
        "title", "description", "listing_type", "price", "price_period",
        "price_negotiable", "offer_price", "fully_paid", "has_installments",
        "remaining_installments", "area", "rooms", "bathrooms", "reception",
        "floor", "unit_number", "furnished", "has_ac", "has_kitchen",
        "has_appliances", "finishing_level", "contact_phone", "contact_name",
        "contact_whatsapp", "amenities", "location_notes", "lat", "lng",
        "status", "commission_percent",
    }
    update = {k: v for k, v in body.items() if k in allowed}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Recalculate commission amount
    price = update.get("price", l.get("price", 0))
    pct = update.get("commission_percent", l.get("commission_percent", 0))
    if price and pct:
        update["commission_amount"] = round(float(price) * float(pct) / 100, 2)

    # If resident edits — back to pending
    if not is_admin and l.get("status") == "active":
        update["status"] = "pending"

    await db.unit_listings.update_one({"id": listing_id}, {"$set": update})
    return {"success": True}


# ── Delete ──────────────────────────────────────────────────────────────────
@router.delete("/unit-listings/{listing_id}")
async def delete_listing(listing_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    l = await db.unit_listings.find_one({"id": listing_id})
    if not l:
        raise HTTPException(status_code=404, detail="غير موجود")
    role = current_user.get("role", "")
    if l["created_by"] != current_user["id"] and role not in ("app_owner", "super_admin", "admin", "company_admin"):
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

    by_type = {}
    for t in LISTING_TYPES:
        by_type[t] = await db.unit_listings.count_documents({**scope, "listing_type": t, "status": "active"})

    # Commission earned (admin only)
    pipeline = [
        {"$match": {**scope, "status": {"$in": ["rented", "sold"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$commission_amount"}}},
    ]
    comm_result = await db.unit_listings.aggregate(pipeline).to_list(1)
    total_commission = comm_result[0]["total"] if comm_result else 0

    return {
        "total": await db.unit_listings.count_documents(scope),
        "active": await db.unit_listings.count_documents({**scope, "status": "active"}),
        "pending": await db.unit_listings.count_documents({**scope, "status": "pending"}),
        "rented": await db.unit_listings.count_documents({**scope, "status": "rented"}),
        "sold": await db.unit_listings.count_documents({**scope, "status": "sold"}),
        "total_commission_earned": total_commission,
        "by_type": by_type,
        "types": LISTING_TYPES,
    }
