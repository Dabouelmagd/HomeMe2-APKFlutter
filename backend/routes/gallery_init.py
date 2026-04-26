"""
Gallery & Admin Init Services routes
"""
from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from datetime import datetime, timezone
from typing import Optional, List
import uuid, logging, os, aiofiles
from pathlib import Path

from database import get_db
from auth_deps import get_current_user, require_admin
from helpers import serialize_datetime
from shared_models import *

UPLOAD_DIR = Path("/app/uploads")

router = APIRouter(prefix="/api")

@router.post("/gallery/files")
async def get_gallery_files(
    gallery_filter: FileGalleryFilter,
    current_user: dict = Depends(get_current_user)
):
    """Get files for gallery view with filters"""
    try:
        db = get_db()
        results = await get_file_gallery(
            current_user['id'],
            current_user.get('compound_id',''),
            gallery_filter
        )
        
        return {
            "success": True,
            "results": results
        }
        
    except Exception as e:
        logging.error(f"Error in gallery files endpoint: {e}")
        raise HTTPException(status_code=500, detail="Failed to get gallery files")

@router.get("/gallery/stats")
async def get_gallery_stats(current_user: dict = Depends(get_current_user)):
    """Get file gallery statistics"""
    try:
        db = get_db()
        compound_id = current_user.get("compound_id")
        if not compound_id:
            return {"stats": {"by_type": {}, "total_files": 0, "total_size": 0, "total_size_mb": 0.0}}
        # Get user's accessible chats
        user_chats = await db.chats.find({
            "compound_id": compound_id,
            "participants": current_user["id"],
            "is_active": True
        }).to_list(length=10000)

        chat_ids = [chat["id"] for chat in user_chats]
        if not chat_ids:
            return {"stats": {"by_type": {}, "total_files": 0, "total_size": 0, "total_size_mb": 0.0}}

        pipeline = [
            {"$match": {"chat_id": {"$in": chat_ids}, "attachments": {"$exists": True, "$not": {"$size": 0}}, "is_deleted": False}},
            {"$unwind": "$attachments"},
            {"$group": {"_id": "$attachments.file_type", "count": {"$sum": 1}, "total_size": {"$sum": "$attachments.file_size"}}},
        ]
        agg = await db.chat_messages.aggregate(pipeline).to_list(length=10000)
        by_type = {}
        total_files = 0
        total_size = 0
        for s in agg:
            ft = s.get("_id") or "unknown"
            cnt = s.get("count") or 0
            sz = s.get("total_size") or 0
            by_type[ft] = {"count": cnt, "size": sz, "size_mb": round(sz / (1024 * 1024), 2)}
            total_files += cnt
            total_size += sz
        return {"stats": {"by_type": by_type, "total_files": total_files, "total_size": total_size, "total_size_mb": round(total_size / (1024 * 1024), 2)}}

    except Exception as e:
        logging.error(f"Error getting gallery stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get gallery statistics")

# ============ MESSAGE SCHEDULING ENDPOINTS ============

# Scheduled Messages routes extracted to routes/

# Service Providers routes extracted to routes/

# Family/Gate routes extracted to routes/

# Admin Registration routes extracted to routes/

# Admin Users routes extracted to routes/

@router.post("/admin/initialize-services")
async def initialize_default_services(
    request_data: dict,
    current_user: dict = Depends(require_admin)
):
    """Initialize default services for a compound (Admin only)"""
    try:
        db = get_db()
        compound_id = request_data.get("compound_id")
        if not compound_id:
            raise HTTPException(status_code=400, detail="compound_id is required")
        
        # Check if services already exist
        existing_services = await db.services.find({"compound_id": compound_id}).to_list(length=10000)
        if existing_services:
            return {"success": False, "message": "Services already exist", "added_count": 0}
        
        # Default services for residential compounds
        default_services = [
            # Maintenance Services
            {
                "id": str(uuid.uuid4()),
                "name": "Plumbing Services",
                "category": "maintenance",
                "specialty": "Emergency plumbing, pipe repairs, water heater maintenance",
                "description": "Professional plumbing services including emergency repairs, pipe installations, and water heater maintenance",
                "phone": "+1-555-PLUMB-01",
                "email": "plumbing@compound-services.com",
                "working_hours": "24/7 Emergency Service",
                "compound_id": compound_id,
                "base_price": 75.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Electrical Services",
                "category": "maintenance",
                "specialty": "Electrical repairs, installations, emergency services",
                "description": "Licensed electricians for all electrical needs including installations, repairs, and emergency services",
                "phone": "+1-555-ELECT-01",
                "email": "electrical@compound-services.com",
                "working_hours": "8:00 AM - 6:00 PM, Emergency 24/7",
                "compound_id": compound_id,
                "base_price": 85.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "HVAC Services",
                "category": "maintenance",
                "specialty": "Air conditioning, heating, ventilation systems",
                "description": "Complete HVAC services including AC repair, heating system maintenance, and air quality solutions",
                "phone": "+1-555-HVAC-01",
                "email": "hvac@compound-services.com",
                "working_hours": "7:00 AM - 7:00 PM",
                "compound_id": compound_id,
                "base_price": 95.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "General Handyman",
                "category": "maintenance",
                "specialty": "Minor repairs, installations, home improvements",
                "description": "Skilled handyman for general repairs, furniture assembly, and minor home improvements",
                "phone": "+1-555-HANDY-01",
                "email": "handyman@compound-services.com",
                "working_hours": "8:00 AM - 5:00 PM",
                "compound_id": compound_id,
                "base_price": 45.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            
            # Cleaning Services
            {
                "id": str(uuid.uuid4()),
                "name": "House Cleaning",
                "category": "cleaning",
                "specialty": "Regular cleaning, deep cleaning, move-in/out cleaning",
                "description": "Professional house cleaning services with flexible scheduling and eco-friendly options",
                "phone": "+1-555-CLEAN-01",
                "email": "cleaning@compound-services.com",
                "working_hours": "7:00 AM - 6:00 PM",
                "compound_id": compound_id,
                "base_price": 80.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Carpet Cleaning",
                "category": "cleaning",
                "specialty": "Deep carpet cleaning, stain removal, upholstery cleaning",
                "description": "Professional carpet and upholstery cleaning using advanced equipment and safe cleaning solutions",
                "phone": "+1-555-CARPET-01",
                "email": "carpet@compound-services.com",
                "working_hours": "8:00 AM - 5:00 PM",
                "compound_id": compound_id,
                "base_price": 120.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Window Cleaning",
                "category": "cleaning",
                "specialty": "Interior and exterior window cleaning",
                "description": "Professional window cleaning for crystal clear views, interior and exterior service available",
                "phone": "+1-555-WINDOW-01",
                "email": "windows@compound-services.com",
                "working_hours": "8:00 AM - 4:00 PM",
                "compound_id": compound_id,
                "base_price": 60.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            
            # Security Services
            {
                "id": str(uuid.uuid4()),
                "name": "Security Guard",
                "category": "security",
                "specialty": "24/7 security, patrol services, event security",
                "description": "Professional security services including patrol, monitoring, and special event security",
                "phone": "+1-555-SECURE-01",
                "email": "security@compound-services.com",
                "working_hours": "24/7 Service Available",
                "compound_id": compound_id,
                "base_price": 25.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Access Control Setup",
                "category": "security",
                "specialty": "Keycard systems, door locks, security cameras",
                "description": "Installation and maintenance of access control systems, smart locks, and surveillance equipment",
                "phone": "+1-555-ACCESS-01",
                "email": "access@compound-services.com",
                "working_hours": "9:00 AM - 5:00 PM",
                "compound_id": compound_id,
                "base_price": 150.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            
            # Landscaping Services
            {
                "id": str(uuid.uuid4()),
                "name": "Landscaping & Gardening",
                "category": "landscaping",
                "specialty": "Garden maintenance, lawn care, plant installation",
                "description": "Complete landscaping services including garden design, lawn maintenance, and seasonal plant care",
                "phone": "+1-555-GARDEN-01",
                "email": "landscaping@compound-services.com",
                "working_hours": "7:00 AM - 4:00 PM",
                "compound_id": compound_id,
                "base_price": 65.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Pool Maintenance",
                "category": "landscaping",
                "specialty": "Pool cleaning, chemical balancing, equipment repair",
                "description": "Professional pool maintenance including cleaning, chemical treatment, and equipment servicing",
                "phone": "+1-555-POOL-01",
                "email": "pool@compound-services.com",
                "working_hours": "6:00 AM - 3:00 PM",
                "compound_id": compound_id,
                "base_price": 90.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            
            # Personal Services
            {
                "id": str(uuid.uuid4()),
                "name": "Pet Care Services",
                "category": "personal",
                "specialty": "Dog walking, pet sitting, grooming",
                "description": "Trusted pet care services including walking, sitting, feeding, and basic grooming",
                "phone": "+1-555-PETS-01",
                "email": "petcare@compound-services.com",
                "working_hours": "6:00 AM - 8:00 PM",
                "compound_id": compound_id,
                "base_price": 30.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Personal Trainer",
                "category": "personal",
                "specialty": "Fitness training, wellness coaching, group classes",
                "description": "Certified personal trainers for individual sessions, group fitness, and wellness programs",
                "phone": "+1-555-FITNESS-01",
                "email": "fitness@compound-services.com",
                "working_hours": "5:00 AM - 9:00 PM",
                "compound_id": compound_id,
                "base_price": 70.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            
            # Delivery & Moving Services
            {
                "id": str(uuid.uuid4()),
                "name": "Package Delivery",
                "category": "delivery",
                "specialty": "Local delivery, grocery delivery, courier services",
                "description": "Reliable delivery services for packages, groceries, and courier needs within the compound",
                "phone": "+1-555-DELIVER-01",
                "email": "delivery@compound-services.com",
                "working_hours": "8:00 AM - 8:00 PM",
                "compound_id": compound_id,
                "base_price": 15.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Moving Services",
                "category": "delivery",
                "specialty": "Local moving, furniture moving, packing services",
                "description": "Professional moving services for relocating within or outside the compound, including packing",
                "phone": "+1-555-MOVERS-01",
                "email": "moving@compound-services.com",
                "working_hours": "7:00 AM - 6:00 PM",
                "compound_id": compound_id,
                "base_price": 120.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            
            # Event Services
            {
                "id": str(uuid.uuid4()),
                "name": "Event Planning",
                "category": "events",
                "specialty": "Party planning, corporate events, wedding coordination",
                "description": "Full-service event planning for parties, corporate events, and special occasions",
                "phone": "+1-555-EVENTS-01",
                "email": "events@compound-services.com",
                "working_hours": "9:00 AM - 7:00 PM",
                "compound_id": compound_id,
                "base_price": 200.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Catering Services",
                "category": "events",
                "specialty": "Event catering, meal prep, special dietary needs",
                "description": "Professional catering for events of all sizes with customizable menus and dietary accommodations",
                "phone": "+1-555-CATER-01",
                "email": "catering@compound-services.com",
                "working_hours": "6:00 AM - 10:00 PM",
                "compound_id": compound_id,
                "base_price": 35.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            }
        ]
        
        # Insert all default services
        await db.services.insert_many(default_services)
        
        return {
            "success": True,
            "message": "Default services initialized successfully",
            "added_count": len(default_services)
        }
        
    except Exception as e:
        logging.error(f"Error initializing default services: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize default services")

@router.delete("/admin/services/clear")
async def clear_all_services(
    request_data: dict,
    current_user: dict = Depends(require_admin)
):
    """Clear all services for a compound (Admin only)"""
    try:
        db = get_db()
        compound_id = request_data.get("compound_id")
        if not compound_id:
            raise HTTPException(status_code=400, detail="compound_id is required")
        
        # Delete all services for the compound
        result = await db.services.delete_many({"compound_id": compound_id})
        
        return {
            "success": True,
            "message": f"Cleared {result.deleted_count} services",
            "deleted_count": result.deleted_count
        }
        
    except Exception as e:
        logging.error(f"Error clearing services: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear services")

def create_registration_token(unit_number: str, email: str, compound_id: str, expires_at: datetime) -> str:
    """Create a secure token for resident registration"""
    token_data = {
        "unit_number": unit_number,
        "email": email,
        "compound_id": compound_id,
        "expires_at": expires_at.isoformat(),
        "issued_at": datetime.now(timezone.utc).isoformat()
    }
    # In production, this should be signed/encrypted
    import json
    return base64.b64encode(json.dumps(token_data).encode()).decode()

# WebSocket endpoint for real-time chat
