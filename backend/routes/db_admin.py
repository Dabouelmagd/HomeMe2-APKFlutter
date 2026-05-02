"""
Database Admin Endpoints routes
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile, Request
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid, json, logging, os, asyncio

from database import get_db
from auth_deps import get_current_user, require_admin, require_super_admin, hash_password, verify_password, create_access_token, validate_password_strength
from helpers import serialize_datetime, notify_compound_admins
from shared_models import *


router = APIRouter(prefix="/api")

async def get_all_users(current_user: dict = Depends(get_current_user)):
    db = get_db()
    # Only allow specific super admin users
    if current_user.get('username','') not in ["johndoe", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Get all users from database
    users = await db.users.find({}, {"password_hash": 0}).to_list(length=10000)
    
    # Get additional statistics for each user
    user_data = []
    for user in users:
        user_info = {
            "id": user.get("id"),
            "username": user.get("username"),
            "email": user.get("email"),
            "full_name": user.get("full_name"),
            "phone": user.get("phone"),
            "role": user.get("role"),
            "compound_id": user.get("compound_id"),
            "family_id": user.get("family_id"),
            "unit_number": user.get("unit_number"),
            "is_family_head": user.get("is_family_head", False),
            "is_active": user.get("is_active", True),
            "created_at": user.get("created_at").isoformat() if user.get("created_at") else None
        }
        
        # Get user statistics
        if user.get("role") == "resident":
            # Count messages sent
            message_count = await db.messages.count_documents({"sender_id": user.get("id")})
            user_info["message_count"] = message_count
            
            # Count service bookings
            booking_count = await db.service_bookings.count_documents({"resident_id": user.get("id")})
            user_info["booking_count"] = booking_count
            
            # Count pending payments
            pending_invoices = await db.invoices.count_documents({
                "family_id": user.get("family_id"),
                "status": "pending"
            })
            user_info["pending_payments"] = pending_invoices
        else:
            user_info["message_count"] = 0
            user_info["booking_count"] = 0
            user_info["pending_payments"] = 0
        
        user_data.append(user_info)
    
    return {"users": user_data, "total_count": len(user_data)}

@router.get("/compounds")
async def get_available_compounds(current_user: dict = Depends(get_current_user)):
    """Get all available compounds for compound selection"""
    try:
        db = get_db()
        compounds = await db.compounds.find({}, {"_id": 0}).to_list(length=10000)
        
        # Serialize datetime objects
        serialized_compounds = [serialize_datetime(compound) for compound in compounds]
        
        return {"compounds": serialized_compounds}
        
    except Exception as e:
        logging.error(f"Error getting compounds: {e}")
        raise HTTPException(status_code=500, detail="Failed to get compounds")

@router.get("/database/compounds")
async def get_all_compounds(current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user.get('username','') not in ["johndoe", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    compounds = await db.compounds.find({}).to_list(100)
    
    # Batch get counts using aggregation to avoid N+1 queries
    compound_ids = [c.get("id") for c in compounds]
    
    user_counts = {}
    admin_counts = {}
    resident_counts = {}
    family_counts = {}
    
    if compound_ids:
        # Get user counts by compound and role in batch
        user_agg = await db.users.aggregate([
            {"$match": {"compound_id": {"$in": compound_ids}}},
            {"$group": {
                "_id": {"compound_id": "$compound_id", "role": "$role"},
                "count": {"$sum": 1}
            }}
        ]).to_list(length=10000)
        
        for item in user_agg:
            cid = item["_id"]["compound_id"]
            role = item["_id"]["role"]
            count = item["count"]
            user_counts[cid] = user_counts.get(cid, 0) + count
            if role == "admin":
                admin_counts[cid] = count
            elif role == "resident":
                resident_counts[cid] = count
        
        # Get family counts by compound in batch
        family_agg = await db.families.aggregate([
            {"$match": {"compound_id": {"$in": compound_ids}}},
            {"$group": {"_id": "$compound_id", "count": {"$sum": 1}}}
        ]).to_list(length=10000)
        
        for item in family_agg:
            family_counts[item["_id"]] = item["count"]
    
    compound_data = []
    for compound in compounds:
        cid = compound.get("id")
        compound_info = {
            "id": cid,
            "name": compound.get("name"),
            "address": compound.get("address"),
            "admin_id": compound.get("admin_id"),
            "additional_admins": compound.get("additional_admins", []),
            "user_count": user_counts.get(cid, 0),
            "admin_count": admin_counts.get(cid, 0),
            "resident_count": resident_counts.get(cid, 0),
            "family_count": family_counts.get(cid, 0),
            "created_at": (lambda v: v.isoformat() if hasattr(v, 'isoformat') else (v if isinstance(v, str) else None))(compound.get("created_at"))
        }
        compound_data.append(compound_info)
    
    return {"compounds": compound_data}

@router.get("/database/statistics")
async def get_system_statistics(current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user.get('username','') not in ["johndoe", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Get comprehensive system statistics
    total_users = await db.users.count_documents({})
    total_admins = await db.users.count_documents({"role": "admin"})
    total_residents = await db.users.count_documents({"role": "resident"})
    total_compounds = await db.compounds.count_documents({})
    total_families = await db.families.count_documents({})
    total_services = await db.services.count_documents({})
    total_bookings = await db.service_bookings.count_documents({})
    total_messages = await db.messages.count_documents({})
    total_invoices = await db.invoices.count_documents({})
    total_payments = await db.payments.count_documents({})
    total_utility_bills = await db.utility_bills.count_documents({})
    total_notifications = await db.notifications.count_documents({})
    
    # Recent activity
    recent_users = await db.users.find({}, {"password_hash": 0}).sort("created_at", -1).limit(5).to_list(length=10000)
    recent_messages = await db.messages.find({}).sort("created_at", -1).limit(5).to_list(length=10000)
    recent_bookings = await db.service_bookings.find({}).sort("created_at", -1).limit(5).to_list(length=10000)
    
    # Clean recent data
    clean_recent_users = []
    for user in recent_users:
        clean_recent_users.append({
            "id": user.get("id"),
            "username": user.get("username"),
            "full_name": user.get("full_name"),
            "role": user.get("role"),
            "created_at": user.get("created_at").isoformat() if user.get("created_at") else None
        })
    
    clean_recent_messages = []
    for message in recent_messages:
        clean_recent_messages.append({
            "id": message.get("id"),
            "subject": message.get("subject"),
            "message_type": message.get("message_type"),
            "created_at": message.get("created_at").isoformat() if message.get("created_at") else None
        })
    
    clean_recent_bookings = []
    for booking in recent_bookings:
        clean_recent_bookings.append({
            "id": booking.get("id"),
            "service_id": booking.get("service_id"),
            "status": booking.get("status"),
            "created_at": booking.get("created_at").isoformat() if booking.get("created_at") else None
        })
    
    return {
        "overview": {
            "total_users": total_users,
            "total_admins": total_admins,
            "total_residents": total_residents,
            "total_compounds": total_compounds,
            "total_families": total_families,
            "total_services": total_services,
            "total_bookings": total_bookings,
            "total_messages": total_messages,
            "total_invoices": total_invoices,
            "total_payments": total_payments,
            "total_utility_bills": total_utility_bills,
            "total_notifications": total_notifications
        },
        "recent_activity": {
            "recent_users": clean_recent_users,
            "recent_messages": clean_recent_messages,
            "recent_bookings": clean_recent_bookings
        }
    }

@router.put("/database/users/{user_id}")
async def update_user(
    user_id: str,
    user_data: dict,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    # السماح لأدوار الإدارة (ليس فقط usernames ثابتة)
    allowed_roles = ["super_admin", "admin", "company_admin", "app_owner"]
    allowed_usernames = ["johndoe", "admin", "superadmin"]
    if (
        current_user.get("role") not in allowed_roles
        and current_user.get("username", "") not in allowed_usernames
    ):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Remove sensitive fields that shouldn't be updated
    allowed_fields = [
        "username", "email", "full_name", "phone", "role", 
        "compound_id", "unit_number", "is_active"
    ]
    
    update_data = {k: v for k, v in user_data.items() if k in allowed_fields}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User updated successfully"}

@router.delete("/database/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    allowed_roles = ["super_admin", "admin", "company_admin", "app_owner"]
    allowed_usernames = ["johndoe", "admin", "superadmin"]
    if (
        current_user.get("role") not in allowed_roles
        and current_user.get("username", "") not in allowed_usernames
    ):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Don't allow deleting yourself
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Delete user and related data
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete related data
    await db.users.delete_one({"id": user_id})
    await db.messages.delete_many({"sender_id": user_id})
    await db.service_bookings.delete_many({"resident_id": user_id})
    await db.notifications.delete_many({"sender_id": user_id})
    
    return {"message": "User and related data deleted successfully"}

@router.get("/database/search")
async def search_database(
    query: str,
    type: str = "users",
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    if current_user.get('username','') not in ["johndoe", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    if type == "users":
        # Search users by username, email, or full_name
        users = await db.users.find({
            "$or": [
                {"username": {"$regex": query, "$options": "i"}},
                {"email": {"$regex": query, "$options": "i"}},
                {"full_name": {"$regex": query, "$options": "i"}}
            ]
        }, {"password_hash": 0}).to_list(100)
        
        return {"results": users}
    
    elif type == "compounds":
        compounds = await db.compounds.find({
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"address": {"$regex": query, "$options": "i"}}
            ]
        }).to_list(100)
        
        return {"results": compounds}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid search type")

# Utility Bills Management Routes
# Utility extracted to routes/
# Compound Services extracted to routes/
# Dashboard extracted to routes/
