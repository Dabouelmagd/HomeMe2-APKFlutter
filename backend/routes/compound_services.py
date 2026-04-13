"""
Compound Services & Bookings routes
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid, json, logging, os

from database import get_db
from auth_deps import get_current_user, require_admin, require_super_admin, hash_password, verify_password, create_access_token, validate_password_strength
from helpers import serialize_datetime
from shared_models import *

router = APIRouter(prefix="/api")

async def get_compound_services(compound_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get('compound_id','') != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    services = await db.services.find({"compound_id": compound_id}).to_list(None)
    
    # Clean services data for JSON serialization
    clean_services = []
    for service in services:
        clean_service = {
            "id": service.get("id"),
            "name": service.get("name"),
            "category": service.get("category"),
            "specialty": service.get("specialty"),
            "description": service.get("description"),
            "phone": service.get("phone"),
            "email": service.get("email"),
            "working_hours": service.get("working_hours"),
            "status": service.get("status", "available"),
            "rating": service.get("rating", 0.0),
            "total_reviews": service.get("total_reviews", 0),
            "created_at": service.get("created_at").isoformat() if service.get("created_at") else None
        }
        clean_services.append(clean_service)
    
    return {"services": clean_services}

@router.post("/compounds/{compound_id}/services")
async def create_service(
    compound_id: str,
    service_data: ServiceCreate,
    current_user: dict = Depends(require_admin)
):
    db = get_db()
    if current_user.get('compound_id','') != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    service = Service(
        compound_id=compound_id,
        name=service_data.name,
        category=service_data.category,
        specialty=service_data.specialty,
        description=service_data.description,
        phone=service_data.phone,
        email=service_data.email,
        working_hours=service_data.working_hours,
        created_by=current_user["id"]
    )
    
    await db.services.insert_one(service.dict())
    
    return {"message": "Service created successfully", "service_id": service.id}

@router.put("/compounds/{compound_id}/services/{service_id}")
async def update_service(
    compound_id: str,
    service_id: str,
    service_data: ServiceCreate,
    current_user: dict = Depends(require_admin)
):
    if current_user.get('compound_id','') != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await db.services.update_one(
        {"id": service_id, "compound_id": compound_id},
        {"$set": {
            "name": service_data.name,
            "category": service_data.category,
            "specialty": service_data.specialty,
            "description": service_data.description,
            "phone": service_data.phone,
            "email": service_data.email,
            "working_hours": service_data.working_hours
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return {"message": "Service updated successfully"}

@router.delete("/compounds/{compound_id}/services/{service_id}")
async def delete_service(
    compound_id: str,
    service_id: str,
    current_user: dict = Depends(require_admin)
):
    if current_user.get('compound_id','') != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await db.services.delete_one({"id": service_id, "compound_id": compound_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return {"message": "Service deleted successfully"}

# Service Booking Routes
@router.post("/services/{service_id}/bookings")
async def create_booking(
    service_id: str,
    booking_data: ServiceBookingCreate,
    current_user: dict = Depends(get_current_user)
):
    # Verify service exists and is in the same compound
    service = await db.services.find_one({"id": service_id, "compound_id": current_user.get('compound_id','')})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    booking = ServiceBooking(
        service_id=service_id,
        resident_id=current_user["id"],
        compound_id=current_user.get('compound_id',''),
        unit_number=current_user.get('unit_number','') or "N/A",
        issue_description=booking_data.issue_description,
        preferred_date=booking_data.preferred_date,
        preferred_time=booking_data.preferred_time,
        notes=booking_data.notes
    )
    
    await db.service_bookings.insert_one(booking.dict())
    
    # Create notification for admins
    notification = Notification(
        compound_id=current_user.get('compound_id',''),
        sender_id=current_user["id"],
        title=f"New Service Booking: {service['name']}",
        content=f"{current_user.get('full_name','')} booked {service['name']} for {booking_data.preferred_date.strftime('%Y-%m-%d')}"
    )
    
    # Get admin IDs
    admins = await db.users.find(
        {"compound_id": current_user.get('compound_id',''), "role": UserRole.ADMIN}
    ).to_list(None)
    admin_ids = [admin["id"] for admin in admins]
    notification.recipient_ids = admin_ids
    
    await db.notifications.insert_one(notification.dict())
    
    return {"message": "Booking created successfully", "booking_id": booking.id}

@router.get("/bookings/my")
async def get_my_bookings(current_user: dict = Depends(get_current_user)):
    db = get_db()
    bookings = await db.service_bookings.find({"resident_id": current_user["id"]}).to_list(None)
    
    # Get service details for each booking
    booking_list = []
    for booking in bookings:
        service = await db.services.find_one({"id": booking["service_id"]})
        booking_data = {
            "id": booking.get("id"),
            "service_name": service.get("name") if service else "Unknown Service",
            "service_category": service.get("category") if service else "unknown",
            "issue_description": booking.get("issue_description"),
            "preferred_date": booking.get("preferred_date").isoformat() if booking.get("preferred_date") else None,
            "preferred_time": booking.get("preferred_time"),
            "status": booking.get("status"),
            "notes": booking.get("notes"),
            "created_at": booking.get("created_at").isoformat() if booking.get("created_at") else None
        }
        booking_list.append(booking_data)
    
    return {"bookings": booking_list}

@router.get("/compounds/{compound_id}/bookings")
async def get_compound_bookings(compound_id: str, current_user: dict = Depends(require_admin)):
    if current_user.get('compound_id','') != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    bookings = await db.service_bookings.find({"compound_id": compound_id}).to_list(None)
    
    # Get detailed information for each booking
    booking_list = []
    for booking in bookings:
        # Use provider_id instead of service_id for enhanced booking model
        provider = None
        service_name = "Unknown Service"
        service_category = booking.get("service_category", "unknown")
        
        if booking.get("provider_id"):
            provider = await db.service_providers.find_one({"id": booking["provider_id"]})
            if provider:
                service_name = f"{booking.get('service_category', 'Service')} - {provider.get('full_name', 'Provider')}"
        elif booking.get("service_category"):
            service_name = booking.get("title", booking.get("service_category", "Service").title())
        
        resident = await db.users.find_one({"id": booking["resident_id"]})
        
        booking_data = {
            "id": booking.get("id"),
            "service_name": service_name,
            "service_category": service_category,
            "resident_name": resident.get("full_name") if resident else "Unknown Resident",
            "unit_number": booking.get("unit_number"),
            "issue_description": booking.get("issue_description"),
            "preferred_date": booking.get("preferred_date").isoformat() if booking.get("preferred_date") and hasattr(booking.get("preferred_date"), 'isoformat') else booking.get("preferred_date"),
            "preferred_time": booking.get("preferred_time"),
            "status": booking.get("status"),
            "notes": booking.get("notes"),
            "created_at": booking.get("created_at").isoformat() if booking.get("created_at") and hasattr(booking.get("created_at"), 'isoformat') else booking.get("created_at")
        }
        booking_list.append(booking_data)
    
    return {"bookings": booking_list}

@router.put("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    status: str,
    current_user: dict = Depends(require_admin)
):
    valid_statuses = ["pending", "confirmed", "in_progress", "completed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.service_bookings.update_one(
        {"id": booking_id, "compound_id": current_user.get('compound_id','')},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"message": "Booking status updated successfully"}

# Dashboard Routes
