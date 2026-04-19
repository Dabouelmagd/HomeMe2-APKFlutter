"""
Dashboard routes
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

async def get_dashboard(current_user: dict = Depends(get_current_user)):
    """Redirect to appropriate dashboard based on user role"""
    if current_user.get('role','') == "admin":
        return await get_admin_dashboard(current_user)
    else:
        return await get_resident_dashboard(current_user)

@router.get("/dashboard/admin")
async def get_admin_dashboard(current_user: dict = Depends(require_admin)):
    # Get compound info
    db = get_db()
    compound = await db.compounds.find_one({"id": current_user.get('compound_id','')})
    
    # Get statistics
    total_residents = await db.users.count_documents({
        "compound_id": current_user.get('compound_id',''),
        "role": "resident"
    })
    
    total_families = await db.families.count_documents({
        "compound_id": current_user.get('compound_id','')
    })
    
    pending_payments = await db.invoices.count_documents({
        "compound_id": current_user.get('compound_id',''),
        "status": PaymentStatus.PENDING
    })
    
    open_messages = await db.messages.count_documents({
        "compound_id": current_user.get('compound_id',''),
        "status": "open"
    })
    
    # Recent activity
    recent_messages = await db.messages.find({
        "compound_id": current_user.get('compound_id','')
    }).sort("created_at", -1).limit(5).to_list(5)
    
    recent_payments = await db.payments.aggregate([
        {"$lookup": {
            "from": "invoices",
            "localField": "invoice_id",
            "foreignField": "id",
            "as": "invoice"
        }},
        {"$match": {"invoice.compound_id": current_user.get('compound_id','')}},
        {"$sort": {"paid_at": -1}},
        {"$limit": 5}
    ]).to_list(5)
    
    # Additional stats for enhanced dashboard
    total_services = await db.service_providers.count_documents({
        "compound_id": current_user.get('compound_id',''),
        "is_active": True
    })
    
    open_maintenance = await db.maintenance_requests.count_documents({
        "compound_id": current_user.get('compound_id',''),
        "status": {"$in": ["pending", "in_progress"]}
    })
    
    active_bookings = await db.service_bookings.count_documents({
        "compound_id": current_user.get('compound_id',''),
        "status": {"$in": ["pending", "confirmed", "in_progress"]}
    })
    
    total_family_members = await db.family_members.count_documents({
        "compound_id": current_user.get('compound_id','')
    })
    
    # Recent notifications
    recent_notifications = await db.notifications.find({
        "compound_id": current_user.get('compound_id','')
    }, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    # Recent activity log
    recent_activities = await db.activity_logs.find({
        "compound_id": current_user.get('compound_id','')
    }, {"_id": 0}).sort("timestamp", -1).limit(10).to_list(10)
    
    # Serialize compound data to avoid ObjectId issues
    compound_data = None
    if compound:
        compound_data = {
            "id": compound.get("id"),
            "name": compound.get("name"),
            "address": compound.get("address"),
            "created_at": compound.get("created_at").isoformat() if compound.get("created_at") and hasattr(compound.get("created_at"), 'isoformat') else compound.get("created_at")
        }
    
    # Serialize recent messages to avoid ObjectId issues
    serialized_messages = []
    for msg in recent_messages:
        serialized_messages.append({
            "id": msg.get("id"),
            "sender_name": msg.get("sender_name"),
            "message": msg.get("message"),
            "status": msg.get("status"),
            "created_at": msg.get("created_at").isoformat() if msg.get("created_at") and hasattr(msg.get("created_at"), 'isoformat') else msg.get("created_at")
        })
    
    # Serialize recent payments to avoid ObjectId issues
    serialized_payments = []
    for payment in recent_payments:
        serialized_payments.append({
            "id": payment.get("id"),
            "amount": payment.get("amount"),
            "paid_at": payment.get("paid_at").isoformat() if payment.get("paid_at") and hasattr(payment.get("paid_at"), 'isoformat') else payment.get("paid_at"),
            "invoice": payment.get("invoice", [{}])[0].get("description") if payment.get("invoice") else None
        })
    
    return {
        "compound": compound_data,
        "statistics": {
            "total_residents": total_residents,
            "total_families": total_families,
            "pending_payments": pending_payments,
            "open_messages": open_messages,
            "total_services": total_services,
            "open_maintenance": open_maintenance,
            "active_bookings": active_bookings,
            "total_family_members": total_family_members
        },
        "recent_messages": serialized_messages,
        "recent_payments": serialized_payments,
        "recent_notifications": serialize_datetime(recent_notifications),
        "recent_activities": serialize_datetime(recent_activities)
    }

@router.get("/dashboard/resident")
async def get_resident_dashboard(current_user: dict = Depends(get_current_user)):
    if current_user.get('role','') != "resident":
        raise HTTPException(status_code=403, detail="Resident access required")
    
    try:
        db = get_db()
        # Get family info
        family = None
        family_members = []
        if current_user.family_id:
            family = await db.families.find_one({"id": current_user.family_id})
            if family:
                family_members = await db.users.find(
                    {"id": {"$in": family.get("members", [])}},
                    {"password_hash": 0}
                ).to_list(length=10000)
                # Serialize family members
                family_members = [serialize_datetime(member) for member in family_members]
        
        # Get pending invoices (using string instead of enum)
        pending_invoices = []
        if current_user.family_id:
            pending_invoices = await db.invoices.find({
                "family_id": current_user.family_id,
                "status": "pending"
            }).to_list(length=10000)
            pending_invoices = [serialize_datetime(inv) for inv in pending_invoices]
        
        # Get recent notifications
        recent_notifications = await db.notifications.find({
            "compound_id": current_user.get('compound_id',''),
            "$or": [
                {"recipient_ids": {"$size": 0}},
                {"recipient_ids": current_user["id"]}
            ]
        }).sort("created_at", -1).limit(5).to_list(length=10000)
        recent_notifications = [serialize_datetime(notif) for notif in recent_notifications]
        
        # Get my messages
        my_messages = await db.messages.find({
            "sender_id": current_user["id"]
        }).sort("created_at", -1).limit(5).to_list(length=10000)
        my_messages = [serialize_datetime(msg) for msg in my_messages]
        
        return {
            "family": serialize_datetime(family) if family else None,
            "family_members": family_members,
            "pending_invoices": pending_invoices,
            "recent_notifications": recent_notifications,
            "my_messages": my_messages
        }
    except Exception as e:
        logging.error(f"Error in resident dashboard: {str(e)}")
        # Return safe defaults if there's an error
        return {
            "family": None,
            "family_members": [],
            "pending_invoices": [],
            "recent_notifications": [],
            "my_messages": []
        }

# ============ CHAT ENDPOINTS ============

# Chat/Messaging routes extracted to routes/

