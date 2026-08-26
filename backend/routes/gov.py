"""
Government / Municipal Dashboard Routes
حي / مركز / محافظة
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from typing import Optional
import uuid

from auth_deps import get_current_user
from database import get_db

router = APIRouter(prefix="/api/gov", tags=["gov"])

GOV_TYPE_LABELS = {
    "district": "حي / منطقة",
    "markaz":   "مركز / قضاء",
    "city":     "محافظة / مدينة",
}

@router.get("/stats")
async def gov_stats(current_user: dict = Depends(get_current_user)):
    db = get_db()
    gov_id = current_user.get("compound_id") or current_user.get("gov_id", "")

    zones = await db.gov_zones.find({"parent_gov_id": gov_id}, {"_id": 0}).to_list(500)
    all_compound_ids = []
    for z in zones:
        cids = z.get("compound_ids", [])
        all_compound_ids.extend(cids)

    total_units     = await db.units.count_documents({"compound_id": {"$in": all_compound_ids}}) if all_compound_ids else 0
    total_residents = await db.users.count_documents({"compound_id": {"$in": all_compound_ids}, "role": "resident"}) if all_compound_ids else 0
    open_complaints = await db.complaints.count_documents({"compound_id": {"$in": all_compound_ids}, "status": "open"}) if all_compound_ids else 0
    open_maintenance = await db.maintenance_requests.count_documents({"compound_id": {"$in": all_compound_ids}, "status": {"$in": ["pending","in_progress"]}}) if all_compound_ids else 0
    staff_count = await db.users.count_documents({"gov_id": gov_id, "role": {"$in": ["gov_admin","district_admin","markaz_admin"]}})

    gov = await db.gov_entities.find_one({"id": gov_id}, {"_id": 0}) or {}

    return {
        "gov_name": gov.get("name", "الجهة الحكومية"),
        "gov_type_label": GOV_TYPE_LABELS.get(gov.get("type", ""), "إدارة"),
        "governorate": gov.get("governorate", ""),
        "total_zones": len(zones),
        "districts_count": sum(1 for z in zones if z.get("type") == "district"),
        "compounds_count": len(all_compound_ids),
        "total_units": total_units,
        "total_residents": total_residents,
        "open_complaints": open_complaints,
        "open_maintenance": open_maintenance,
        "staff_count": staff_count,
        "monthly_revenue": 0,
        "yearly_revenue": 0,
        "revenue_growth": 0,
        "pending_collection": 0,
        "satisfaction": 0,
    }


@router.get("/zones")
async def get_zones(current_user: dict = Depends(get_current_user)):
    db = get_db()
    gov_id = current_user.get("compound_id") or current_user.get("gov_id", "")
    zones = await db.gov_zones.find({"parent_gov_id": gov_id}, {"_id": 0}).to_list(200)

    for z in zones:
        cids = z.get("compound_ids", [])
        if cids:
            z["compounds_count"] = len(cids)
            z["units_count"]     = await db.units.count_documents({"compound_id": {"$in": cids}})
            z["residents_count"] = await db.users.count_documents({"compound_id": {"$in": cids}, "role": "resident"})
            z["open_complaints"] = await db.complaints.count_documents({"compound_id": {"$in": cids}, "status": "open"})
            z["pending_maintenance"] = await db.maintenance_requests.count_documents({"compound_id": {"$in": cids}, "status": {"$in": ["pending","in_progress"]}})
        else:
            z["compounds_count"] = z["units_count"] = z["residents_count"] = z["open_complaints"] = z["pending_maintenance"] = 0
        z["type_label"] = GOV_TYPE_LABELS.get(z.get("type",""), "وحدة")

    return {"zones": zones}


@router.post("/zones")
async def create_zone(body: dict, current_user: dict = Depends(get_current_user)):
    db = get_db()
    gov_id = current_user.get("compound_id") or current_user.get("gov_id", "")
    zone = {
        "id": str(uuid.uuid4()),
        "parent_gov_id": gov_id,
        "name": body.get("name","").strip(),
        "type": body.get("type", "district"),
        "governorate": body.get("governorate",""),
        "address": body.get("address",""),
        "phone": body.get("phone",""),
        "manager_name": body.get("manager_name",""),
        "compound_ids": [],
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if not zone["name"]:
        raise HTTPException(400, "الاسم مطلوب")
    await db.gov_zones.insert_one(zone)
    zone.pop("_id", None)
    return {"success": True, "zone": zone}


@router.get("/alerts")
async def get_alerts(current_user: dict = Depends(get_current_user)):
    db = get_db()
    gov_id = current_user.get("compound_id") or current_user.get("gov_id", "")
    zones = await db.gov_zones.find({"parent_gov_id": gov_id}, {"compound_ids": 1}).to_list(200)
    all_cids = [c for z in zones for c in z.get("compound_ids", [])]

    alerts = []
    if all_cids:
        open_c = await db.complaints.count_documents({"compound_id": {"$in": all_cids}, "status": "open"})
        if open_c > 0:
            alerts.append({"type": "complaints", "message": f"{open_c} شكوى مفتوحة تحتاج رد"})
        pending_m = await db.maintenance_requests.count_documents({"compound_id": {"$in": all_cids}, "status": "pending"})
        if pending_m > 0:
            alerts.append({"type": "maintenance", "message": f"{pending_m} طلب صيانة معلق"})

    return {"alerts": alerts}
