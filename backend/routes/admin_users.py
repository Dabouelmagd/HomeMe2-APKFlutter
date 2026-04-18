"""
Admin User Management routes - extracted from server.py
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid
import json
import logging
import os

from database import get_db
from auth_deps import get_current_user, require_admin, require_super_admin
from helpers import serialize_datetime
from shared_models import *


router = APIRouter(prefix="/api")

@router.post("/admin/create-admin")
async def create_admin_account(
    username: str = Form(...),
    email: str = Form(...), 
    password: str = Form(...),
    full_name: str = Form(...),
    phone: str = Form(None),
    compound_id: str = Form(...),
    role: str = Form("admin"),
    profile_picture: UploadFile = File(None),
    current_user: dict = Depends(require_admin)
):
    """Create a new admin account (Super Admin only)"""
    try:
        db = get_db()
        # Check if user already exists
        existing_user = await db.users.find_one({
            "$or": [
                {"email": email},
                {"username": username}
            ]
        })
        
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email or username already exists")
        
        # Handle profile picture upload
        profile_picture_url = None
        if profile_picture and profile_picture.filename:
            if not profile_picture.content_type.startswith('image/'):
                raise HTTPException(status_code=400, detail="Profile picture must be an image")
            
            # Create user uploads directory
            user_uploads_dir = f"{UPLOAD_DIR}/users"
            os.makedirs(user_uploads_dir, exist_ok=True)
            
            # Generate unique filename
            file_extension = profile_picture.filename.split('.')[-1].lower()
            unique_filename = f"admin_{str(uuid.uuid4())}.{file_extension}"
            file_path = os.path.join(user_uploads_dir, unique_filename)
            
            # Save file
            content = await profile_picture.read()
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            profile_picture_url = f"/uploads/users/{unique_filename}"
        
        # Hash password
        hashed_password = pwd_context.hash(password)
        
        # Create admin user
        new_admin = User(
            username=username,
            email=email,
            password_hash=hashed_password,
            full_name=full_name,
            phone=phone,
            role=role,
            compound_id=compound_id,
            profile_picture_url=profile_picture_url
        )
        
        await db.users.insert_one(new_admin.dict())
        
        return {
            "message": "Admin account created successfully",
            "user_id": new_admin.id,
            "username": username,
            "profile_picture_url": profile_picture_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating admin: {e}")
        raise HTTPException(status_code=500, detail="Failed to create admin account")

@router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(require_admin)):
    """Get all users in the compound (Admin only)"""
    try:
        db = get_db()
        # Filter users by compound_id for multi-tenant support
        users = await db.users.find({"compound_id": current_user.compound_id}).to_list(None)
        
        # Serialize datetime objects and remove sensitive data
        safe_users = []
        for user in users:
            safe_user = serialize_datetime(user)
            # Remove password hash from response
            safe_user.pop('password_hash', None)
            safe_users.append(safe_user)
        
        return {"users": safe_users}
        
    except Exception as e:
        logging.error(f"Error getting users: {e}")
        raise HTTPException(status_code=500, detail="Failed to get users")

@router.post("/admin/users")
async def create_user(user_data: UserCreate, current_user: dict = Depends(require_admin)):
    """Create a new user (Admin only)"""
    try:
        db = get_db()
        # Check if username or email already exists
        existing_user = await db.users.find_one({
            "$or": [{"username": user_data.username}, {"email": user_data.email}]
        })
        
        if existing_user:
            if existing_user["username"] == user_data.username:
                raise HTTPException(status_code=400, detail="Username already exists")
            else:
                raise HTTPException(status_code=400, detail="Email already exists")
        
        # Ensure user is created in the same compound as the admin
        user_data.compound_id = current_user.compound_id
        
        # Hash password
        password_hash = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create user document
        user_doc = {
            "id": str(uuid.uuid4()),
            "username": user_data.username,
            "email": user_data.email,
            "password_hash": password_hash,
            "role": user_data.role,
            "compound_id": current_user.compound_id,  # Enforce compound isolation
            "family_id": None,
            "full_name": user_data.full_name,
            "phone": user_data.phone,
            "unit_number": user_data.unit_number,
            "is_family_head": False,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "profile_picture_url": None
        }
        
        result = await db.users.insert_one(user_doc)
        
        if result.inserted_id:
            return {"message": "User created successfully", "user_id": user_doc["id"]}
        else:
            raise HTTPException(status_code=500, detail="Failed to create user")
            
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user")

@router.put("/admin/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status_data: dict,
    current_user: dict = Depends(require_admin)
):
    """Update user active/inactive status (Admin only)"""
    try:
        db = get_db()
        is_active = status_data.get("is_active")
        if is_active is None:
            raise HTTPException(status_code=400, detail="is_active field is required")
        
        result = await db.users.update_one(
            {"id": user_id},
            {"$set": {"is_active": is_active}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": f"User {'activated' if is_active else 'deactivated'} successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating user status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user status")

@router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_admin)
):
    """Delete a user account (Admin only)"""
    try:
        db = get_db()
        # Prevent admin from deleting themselves
        if user_id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
        # Delete user
        result = await db.users.delete_one({"id": user_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Also delete associated family if exists
        await db.families.delete_many({"head_id": user_id})
        
        return {"message": "User deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete user")

@router.get("/search")
async def global_search(
    q: str,
    current_user: dict = Depends(get_current_user)
):
    """Global search across users, residences, services, and messages"""
    try:
        db = get_db()
        if len(q.strip()) < 2:
            return {"results": []}
        
        search_term = q.strip().lower()
        results = []
        
        # Search Users (only if admin or searching own compound)
        if current_user.role == "admin":
            users = await db.users.find({
                "$or": [
                    {"full_name": {"$regex": search_term, "$options": "i"}},
                    {"email": {"$regex": search_term, "$options": "i"}},
                    {"username": {"$regex": search_term, "$options": "i"}},
                    {"unit_number": {"$regex": search_term, "$options": "i"}}
                ],
                "compound_id": current_user.compound_id
            }).to_list(10)
            
            for user in users:
                results.append({
                    "id": user["id"],
                    "type": "user",
                    "title": user["full_name"],
                    "description": f"Unit {user.get('unit_number', 'N/A')} • {user['email']}",
                    "url": "/family"
                })
        
        # Search Services
        services = await db.services.find({
            "$or": [
                {"name": {"$regex": search_term, "$options": "i"}},
                {"description": {"$regex": search_term, "$options": "i"}},
                {"category": {"$regex": search_term, "$options": "i"}}
            ],
            "compound_id": current_user.compound_id
        }).to_list(10)
        
        for service in services:
            results.append({
                "id": service["id"],
                "type": "service",
                "title": service["name"],
                "description": f"{service.get('category', 'Service')} • ${service.get('base_price', 0)}",
                "url": "/services"
            })
        
        # Search Messages (own messages only)
        messages = await db.messages.find({
            "$and": [
                {"$or": [
                    {"content": {"$regex": search_term, "$options": "i"}},
                    {"subject": {"$regex": search_term, "$options": "i"}}
                ]},
                {"$or": [
                    {"sender_id": current_user.id},
                    {"receiver_id": current_user.id}
                ]}
            ]
        }).to_list(5)
        
        for message in messages:
            results.append({
                "id": message["id"],
                "type": "message",
                "title": message.get("subject", "Message"),
                "description": message["content"][:100] + ("..." if len(message["content"]) > 100 else ""),
                "url": "/messages"
            })
        
        # Search Family Members (own family only)
        family_id = getattr(current_user, "family_id", None)
        if family_id:
            family = await db.families.find_one({"id": family_id})
            if family and "members" in family:
                for member in family["members"]:
                    if (search_term in member.get("full_name", "").lower() or 
                        search_term in member.get("relationship", "").lower()):
                        results.append({
                            "id": member["id"],
                            "type": "family",
                            "title": member["full_name"],
                            "description": f"{member.get('relationship', 'Family Member')} • Age {member.get('age', 'N/A')}",
                            "url": "/family"
                        })
        
        # Limit total results
        results = results[:20]
        
        return {"results": results}
        
    except Exception as e:
        logging.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail="Search failed")

