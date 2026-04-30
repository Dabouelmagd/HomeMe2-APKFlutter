"""
Admin User Management routes - extracted from server.py
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile, Request
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
            
            # Dual-write to MongoDB for deployment-survival
            try:
                from services.media_store import save_to_db
                await save_to_db("users", unique_filename, profile_picture.content_type or "", content)
            except Exception as _e:
                import logging as _lg
                _lg.warning(f"admin profile pic DB backup failed: {_e}")
            
            profile_picture_url = f"/api/files/users/{unique_filename}"
        
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
        users = await db.users.find({"compound_id": current_user.compound_id}).to_list(length=10000)
        
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
    request: Request,
    current_user: dict = Depends(require_admin)
):
    """Delete a user account (Admin only)"""
    try:
        db = get_db()
        # Prevent admin from deleting themselves
        if user_id == current_user["id"]:
            raise HTTPException(status_code=400, detail="Cannot delete your own account")

        # Snapshot before delete (for audit "before" field)
        victim = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})

        result = await db.users.delete_one({"id": user_id})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Also delete associated family if exists
        await db.families.delete_many({"head_id": user_id})

        try:
            from audit_logger import audit_log
            await audit_log(
                actor=current_user,
                action="user.delete",
                target_type="user",
                target_id=user_id,
                before=victim,
                request=request,
            )
        except Exception:
            pass

        return {"message": "User deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting user: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete user")

@router.get("/search")
async def global_search(
    q: str,
    current_user: dict = Depends(get_current_user)
):
    """Global search across users, residences, services, messages, invites, and tickets.

    Scope rules:
      - app_owner / super_admin → can search across all compounds
      - admin / compound_admin / company_admin → scoped to their compound/company
      - regular users → scoped to their own compound, limited types
    """
    try:
        db = get_db()
        if len(q.strip()) < 2:
            return {"results": []}

        term = q.strip().lower()
        regex = {"$regex": term, "$options": "i"}
        role = current_user.get("role")
        my_compound = current_user.get("compound_id")
        is_admin = role in ("admin", "compound_admin", "app_owner", "super_admin", "company_admin")
        is_owner = role in ("app_owner", "super_admin")
        results = []

        # ── Users ──
        if is_admin:
            user_q = {"$or": [
                {"full_name": regex},
                {"email": regex},
                {"username": regex},
                {"unit_number": regex},
                {"phone": regex},
            ]}
            if not is_owner and my_compound:
                user_q["compound_id"] = my_compound
            users = await db.users.find(user_q, {"_id": 0, "password_hash": 0}).limit(10).to_list(length=10)
            for u in users:
                results.append({
                    "id": u["id"],
                    "type": "user",
                    "title": u.get("full_name") or u.get("username") or "—",
                    "description": f"@{u.get('username','?')} • {u.get('role','?')} • وحدة {u.get('unit_number') or '—'}",
                    "icon": "👤",
                    "url": "/app/admin/users",
                })

        # ── Compounds (owner/super only) ──
        if is_owner:
            compounds = await db.compounds.find({"$or": [{"name": regex}, {"address": regex}]}, {"_id": 0}).limit(5).to_list(length=5)
            for c in compounds:
                results.append({
                    "id": c["id"],
                    "type": "compound",
                    "title": c.get("name") or "—",
                    "description": f"📍 {c.get('address') or '—'} • {c.get('total_units') or 0} وحدة",
                    "icon": "🏢",
                    "url": "/app/super-admin",
                })

        # ── Services ──
        if my_compound:
            services = await db.services.find({
                "$or": [{"name": regex}, {"description": regex}, {"category": regex}],
                "compound_id": my_compound,
            }, {"_id": 0}).limit(8).to_list(length=8)
            for s in services:
                results.append({
                    "id": s["id"],
                    "type": "service",
                    "title": s.get("name") or "—",
                    "description": f"{s.get('category') or 'خدمة'} • {s.get('base_price') or 0} ج.م",
                    "icon": "🔧",
                    "url": "/app/services",
                })

        # ── Family Invites (creator only or admins of compound) ──
        invite_q_or = [{"created_by": current_user.get("id")}]
        if is_admin and my_compound:
            invite_q_or.append({"compound_id": my_compound})
        invites = await db.family_invites.find({
            "$and": [
                {"$or": [{"invitee_name_hint": regex}, {"unit_number": regex}, {"target_user_full_name": regex}, {"note": regex}]},
                {"$or": invite_q_or},
            ]
        }, {"_id": 0}).limit(5).to_list(length=5)
        for inv in invites:
            results.append({
                "id": inv["id"],
                "type": "invite",
                "title": inv.get("invitee_name_hint") or inv.get("target_user_full_name") or f"دعوة {inv.get('relationship','')}",
                "description": f"وحدة {inv.get('unit_number','—')} • {'نشط' if inv.get('is_active') else 'ملغي'}",
                "icon": "📨",
                "url": "/app/my-invites",
            })

        # ── Support Tickets (admins) ──
        if is_admin:
            t_q = {"$or": [{"subject": regex}, {"description": regex}]}
            if not is_owner and my_compound:
                t_q["compound_id"] = my_compound
            tickets = await db.support_tickets.find(t_q, {"_id": 0}).limit(5).to_list(length=5)
            for t in tickets:
                results.append({
                    "id": t["id"],
                    "type": "ticket",
                    "title": t.get("subject") or "تذكرة دعم",
                    "description": f"حالة: {t.get('status','open')} • {(t.get('description') or '')[:80]}",
                    "icon": "🎫",
                    "url": "/app/super-admin?tab=support_tickets",
                })

        return {"results": results[:30], "query": q}

    except Exception as e:
        logging.error(f"Search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Search failed")

