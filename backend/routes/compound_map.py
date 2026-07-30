"""
Compound Map API
================
- GET  /api/compounds/{id}/map-config     — إحداثيات الكمبوند + حدوده
- PUT  /api/compounds/{id}/map-config     — حفظ الإحداثيات + الحدود
- GET  /api/compounds/{id}/map/units      — مواقع الوحدات
- PUT  /api/compounds/{id}/map/units/{unit_id} — تحديث موقع وحدة
- GET  /api/compounds/{id}/map/staff      — مواقع الموظفين
- PUT  /api/map/my-location               — الموظف يحدّث موقعه
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from database import get_db
from auth_deps import get_current_user, require_admin
from helpers import serialize_datetime

router = APIRouter(prefix="/api")


def _can_admin(user: dict) -> bool:
    return user.get("role") in (
        "app_owner", "super_admin", "company_admin",
        "admin", "manager", "assistant_manager"
    )


# ── Map Config (compound boundary + center) ───────────────────────────────────

@router.get("/compounds/{compound_id}/map-config")
async def get_map_config(
    compound_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="الكمبوند غير موجود")

    # Use saved center or default to Cairo center
    center = compound.get("map_center")
    if not center:
        center = {"lat": 30.0444, "lng": 31.2357}  # Cairo default

    return {
        "compound_id": compound_id,
        "name": compound.get("name", ""),
        "center": center,
        "zoom": compound.get("map_zoom") or 16,
        "boundary": compound.get("map_boundary") or [],
        "address": compound.get("address", ""),
        "city": compound.get("city", ""),
        "has_location": bool(compound.get("map_center")),
    }


@router.put("/compounds/{compound_id}/map-config")
async def save_map_config(
    compound_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    if not _can_admin(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="الكمبوند غير موجود")

    update = {}
    if "center" in payload:
        update["map_center"] = payload["center"]
    if "zoom" in payload:
        update["map_zoom"] = payload["zoom"]
    if "boundary" in payload:
        update["map_boundary"] = payload["boundary"]

    if update:
        await db.compounds.update_one({"id": compound_id}, {"$set": update})

    return {"success": True, "message": "تم حفظ إعدادات الخريطة"}


# ── Unit Locations ────────────────────────────────────────────────────────────

@router.get("/compounds/{compound_id}/map/units")
async def get_unit_locations(
    compound_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    units = await db.residences.find(
        {"compound_id": compound_id},
        {"_id": 0, "id": 1, "unit_number": 1, "building": 1, "floor": 1,
         "status": 1, "map_location": 1, "resident_name": 1}
    ).to_list(length=1000)

    # Enrich with resident info
    enriched = []
    for u in units:
        residents = await db.users.find(
            {"compound_id": compound_id, "unit_number": u.get("unit_number"),
             "role": {"$in": ["resident", "family_head"]}},
            {"_id": 0, "full_name": 1, "phone": 1, "photo": 1}
        ).limit(3).to_list(3)
        u["residents"] = residents
        enriched.append(serialize_datetime(u))

    return {"units": enriched, "total": len(enriched)}


@router.put("/compounds/{compound_id}/map/units/{unit_id}")
async def update_unit_location(
    compound_id: str,
    unit_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    if not _can_admin(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()

    location = payload.get("location")  # {lat, lng}
    if not location or "lat" not in location or "lng" not in location:
        raise HTTPException(status_code=400, detail="الموقع مطلوب: {lat, lng}")

    result = await db.residences.update_one(
        {"id": unit_id, "compound_id": compound_id},
        {"$set": {"map_location": location, "location_updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        # Try by unit_number
        result = await db.residences.update_one(
            {"unit_number": unit_id, "compound_id": compound_id},
            {"$set": {"map_location": location, "location_updated_at": datetime.now(timezone.utc).isoformat()}}
        )

    return {"success": True, "location": location}


# ── Staff / Security Locations ────────────────────────────────────────────────

@router.get("/compounds/{compound_id}/map/staff")
async def get_staff_locations(
    compound_id: str,
    current_user: dict = Depends(get_current_user),
):
    if not _can_admin(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()

    staff = await db.users.find(
        {
            "compound_id": compound_id,
            "role": {"$in": ["admin", "manager", "assistant_manager",
                             "accountant", "security"]},
            "is_active": True,
        },
        {"_id": 0, "id": 1, "full_name": 1, "username": 1, "role": 1,
         "photo": 1, "current_location": 1, "location_updated_at": 1, "phone": 1}
    ).to_list(length=200)

    ROLE_AR = {
        "admin": "مدير", "manager": "مشرف", "assistant_manager": "مساعد مدير",
        "accountant": "محاسب", "security": "أمن",
    }
    ROLE_ICON = {
        "admin": "🛠️", "manager": "📊", "assistant_manager": "🤝",
        "accountant": "💰", "security": "🛡️",
    }

    enriched = []
    for s in staff:
        s["role_ar"] = ROLE_AR.get(s.get("role", ""), s.get("role", ""))
        s["role_icon"] = ROLE_ICON.get(s.get("role", ""), "👤")
        enriched.append(serialize_datetime(s))

    return {"staff": enriched, "total": len(enriched)}


@router.put("/map/my-location")
async def update_my_location(
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    """الموظف/الأمن يحدّث موقعه الحالي."""
    location = payload.get("location")
    if not location:
        raise HTTPException(status_code=400, detail="الموقع مطلوب")

    db = get_db()
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "current_location": location,
            "location_updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    return {"success": True}


# ── Resident: save own unit location ─────────────────────────────────────────

@router.put("/map/my-unit-location")
async def resident_save_unit_location(
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    """الساكن يحدد موقع وحدته على الخريطة."""
    location = payload.get("location")
    if not location:
        raise HTTPException(status_code=400, detail="الموقع مطلوب")

    db = get_db()
    compound_id = current_user.get("compound_id")
    unit_number = current_user.get("unit_number") or payload.get("unit_number")

    if not compound_id or not unit_number:
        raise HTTPException(status_code=400, detail="لم يتم تحديد الكمبوند أو الوحدة")

    await db.residences.update_one(
        {"compound_id": compound_id, "unit_number": unit_number},
        {"$set": {
            "map_location": location,
            "location_updated_at": datetime.now(timezone.utc).isoformat(),
            "location_set_by": current_user["id"],
        }},
        upsert=False
    )
    return {"success": True, "location": location}


# ── Vehicle Tracking ──────────────────────────────────────────────────────────

@router.get("/compounds/{compound_id}/map/vehicles")
async def get_vehicles(
    compound_id: str,
    current_user: dict = Depends(get_current_user),
):
    """قائمة المركبات المسجّلة في الكمبوند مع آخر موقع لكل مركبة."""
    db = get_db()
    vehicles = await db.compound_vehicles.find(
        {"compound_id": compound_id},
        {"_id": 0}
    ).to_list(length=200)
    return {"vehicles": [serialize_datetime(v) for v in vehicles], "total": len(vehicles)}


@router.post("/compounds/{compound_id}/map/vehicles")
async def add_vehicle(
    compound_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    """إضافة مركبة جديدة (أدمن فقط)."""
    if not _can_admin(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()

    vtype = payload.get("type", "car")  # car | motorcycle | truck | bike
    if vtype not in ("car", "motorcycle", "truck", "bike", "golf_cart"):
        raise HTTPException(status_code=400, detail="نوع المركبة غير صالح")

    vehicle = {
        "id": str(uuid.uuid4()),
        "compound_id": compound_id,
        "name": payload.get("name", "").strip() or f"مركبة {vtype}",
        "type": vtype,
        "plate": payload.get("plate", "").strip(),
        "color": payload.get("color", "#3b82f6"),
        "assigned_to": payload.get("assigned_to"),  # user_id
        "assigned_name": payload.get("assigned_name", ""),
        "is_active": True,
        "current_location": None,
        "location_updated_at": None,
        "track_history": [],  # last 100 points
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id"),
    }
    await db.compound_vehicles.insert_one(vehicle)
    vehicle.pop("_id", None)
    return {"success": True, "vehicle": serialize_datetime(vehicle)}


@router.put("/compounds/{compound_id}/map/vehicles/{vehicle_id}")
async def update_vehicle(
    compound_id: str,
    vehicle_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    """تعديل بيانات مركبة."""
    if not _can_admin(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    fields = {}
    for f in ("name", "type", "plate", "color", "assigned_to", "assigned_name", "is_active"):
        if f in payload:
            fields[f] = payload[f]
    if fields:
        await db.compound_vehicles.update_one({"id": vehicle_id, "compound_id": compound_id}, {"$set": fields})
    return {"success": True}


@router.delete("/compounds/{compound_id}/map/vehicles/{vehicle_id}")
async def delete_vehicle(
    compound_id: str,
    vehicle_id: str,
    current_user: dict = Depends(get_current_user),
):
    """حذف مركبة."""
    if not _can_admin(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    await db.compound_vehicles.delete_one({"id": vehicle_id, "compound_id": compound_id})
    return {"success": True}


@router.put("/map/vehicle-location/{vehicle_id}")
async def update_vehicle_location(
    vehicle_id: str,
    payload: dict,
    current_user: dict = Depends(get_current_user),
):
    """
    السائق/الأمن يحدّث موقع المركبة.
    يحتفظ بآخر 200 نقطة في track_history للرسم على الخريطة.
    """
    location = payload.get("location")
    if not location or "lat" not in location or "lng" not in location:
        raise HTTPException(status_code=400, detail="الموقع مطلوب: {lat, lng}")

    db = get_db()
    vehicle = await db.compound_vehicles.find_one({"id": vehicle_id}, {"_id": 0, "track_history": 1})
    if not vehicle:
        raise HTTPException(status_code=404, detail="المركبة غير موجودة")

    now = datetime.now(timezone.utc).isoformat()
    point = {"lat": location["lat"], "lng": location["lng"], "ts": now}

    # Keep last 200 track points
    history = vehicle.get("track_history", [])
    history.append(point)
    if len(history) > 200:
        history = history[-200:]

    await db.compound_vehicles.update_one(
        {"id": vehicle_id},
        {"$set": {
            "current_location": location,
            "location_updated_at": now,
            "track_history": history,
        }}
    )
    return {"success": True, "point": point}


@router.delete("/map/vehicle-location/{vehicle_id}/history")
async def clear_vehicle_history(
    vehicle_id: str,
    current_user: dict = Depends(get_current_user),
):
    """مسح مسار المركبة."""
    if not _can_admin(current_user):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    await db.compound_vehicles.update_one(
        {"id": vehicle_id},
        {"$set": {"track_history": [], "current_location": None}}
    )
    return {"success": True}
