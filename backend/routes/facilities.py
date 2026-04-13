"""
Facility Booking routes
"""
from fastapi import APIRouter, HTTPException, Depends
import logging

from database import get_db
from auth_deps import get_current_user
from facility_booking_service import FacilityBookingService, DEFAULT_FACILITIES

router = APIRouter(prefix="/api")


@router.get("/facilities")
async def get_facilities(compound_id: str = None, current_user: dict = Depends(get_current_user)):
    db = get_db()
    if not compound_id:
        compound_id = current_user["compound_id"]
    facility_service = FacilityBookingService(db)
    facilities = await facility_service.get_facilities(compound_id)
    return {"facilities": facilities}


@router.get("/facilities/{facility_id}")
async def get_facility(facility_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    facility_service = FacilityBookingService(db)
    facility = await facility_service.get_facility(facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    return facility


@router.post("/facilities")
async def create_facility(facility_data: dict, current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    compound_id = current_user["compound_id"]
    facility_service = FacilityBookingService(db)
    try:
        facility = await facility_service.create_facility(compound_id, facility_data)
        return {"status": "success", "facility": facility}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/facilities/{facility_id}")
async def update_facility(facility_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    facility_service = FacilityBookingService(db)
    facility = await facility_service.update_facility(facility_id, update_data)
    return {"status": "success", "facility": facility}


@router.delete("/facilities/{facility_id}")
async def delete_facility(facility_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    facility_service = FacilityBookingService(db)
    success = await facility_service.delete_facility(facility_id)
    if success:
        return {"status": "success", "message": "Facility deleted"}
    raise HTTPException(status_code=404, detail="Facility not found")


@router.get("/facilities/{facility_id}/availability")
async def get_facility_availability(facility_id: str, date: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    facility_service = FacilityBookingService(db)
    try:
        availability = await facility_service.get_availability(facility_id, date)
        return availability
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/facility-bookings")
async def create_facility_booking(booking_data: dict, current_user: dict = Depends(get_current_user)):
    db = get_db()
    facility_service = FacilityBookingService(db)
    try:
        booking = await facility_service.create_booking(
            user_id=str(current_user["id"]),
            user_name=current_user.get("full_name") or current_user.get("username", ""),
            compound_id=current_user["compound_id"],
            booking_data=booking_data
        )
        return {"status": "success", "booking": booking}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/facility-bookings")
async def get_facility_bookings(facility_id: str = None, date: str = None, status: str = None, user_only: bool = False, limit: int = 50, current_user: dict = Depends(get_current_user)):
    db = get_db()
    facility_service = FacilityBookingService(db)
    user_id = None
    if user_only or current_user.get("role") == "resident":
        user_id = str(current_user["id"])
    bookings = await facility_service.get_bookings(compound_id=current_user["compound_id"], user_id=user_id, facility_id=facility_id, date=date, status=status, limit=limit)
    return {"bookings": bookings}


@router.get("/facility-bookings/{booking_id}")
async def get_facility_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    facility_service = FacilityBookingService(db)
    booking = await facility_service.get_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    user_id = str(current_user["id"])
    if current_user.get("role") == "resident" and booking["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return booking


@router.put("/facility-bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str, admin_notes: str = None, current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    facility_service = FacilityBookingService(db)
    booking = await facility_service.update_booking_status(booking_id, status, admin_notes)
    return {"status": "success", "booking": booking}


@router.post("/facility-bookings/{booking_id}/cancel")
async def cancel_facility_booking(booking_id: str, reason: str = None, current_user: dict = Depends(get_current_user)):
    db = get_db()
    facility_service = FacilityBookingService(db)
    try:
        user_id = str(current_user["id"])
        booking = await facility_service.cancel_booking(booking_id, user_id, reason)
        return {"status": "success", "booking": booking}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/facilities/seed-defaults")
async def seed_default_facilities(current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    compound_id = current_user["compound_id"]
    facility_service = FacilityBookingService(db)
    existing = await facility_service.get_facilities(compound_id, include_inactive=True)
    if existing:
        return {"status": "warning", "message": "Facilities already exist", "count": len(existing)}
    created = []
    for facility_data in DEFAULT_FACILITIES:
        facility = await facility_service.create_facility(compound_id, facility_data)
        created.append(facility)
    return {"status": "success", "message": f"Created {len(created)} facilities", "facilities": created}
