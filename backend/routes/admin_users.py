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
async def create_user(request: Request, user_data: UserCreate, current_user: dict = Depends(require_admin)):
    """Create a new user (Admin only). Resolves target compound from:
    1. Explicit user_data.compound_id (validated)
    2. X-Active-Compound-Id header (for company_admin)
    3. current_user.compound_id (fallback for single-compound admin)
    """
    import bcrypt as _bcrypt
    try:
        db = get_db()
        # Check if username or email already exists
        existing_user = await db.users.find_one({
            "$or": [{"username": user_data.username}, {"email": user_data.email}]
        })

        if existing_user:
            if existing_user.get("username") == user_data.username:
                raise HTTPException(status_code=400, detail="Username already exists")
            else:
                raise HTTPException(status_code=400, detail="Email already exists")

        # Resolve target compound
        active_compound = (
            request.headers.get("X-Active-Compound-Id")
            or request.headers.get("x-active-compound-id")
        )
        target_compound = (
            getattr(user_data, "compound_id", None)
            or active_compound
            or current_user.get("compound_id")
        )
        if not target_compound or target_compound == "default-compound":
            raise HTTPException(status_code=400, detail="يرجى اختيار كمبوند أولاً (X-Active-Compound-Id)")

        # Tenant guard for company_admin
        role = current_user.get("role")
        if role in ("company_admin", "assistant_manager", "accountant"):
            cmpd = await db.compounds.find_one({"id": target_compound}, {"_id": 0, "company_id": 1, "management_company_id": 1})
            cu_company = current_user.get("company_id")
            if not cmpd or cu_company not in (cmpd.get("company_id"), cmpd.get("management_company_id")):
                raise HTTPException(status_code=403, detail="غير مصرح بإنشاء مستخدم خارج شركتك")
        elif role == "admin":
            if current_user.get("compound_id") != target_compound:
                raise HTTPException(status_code=403, detail="غير مصرح بإنشاء مستخدم خارج كمبوندك")

        # Hash password
        password_hash = _bcrypt.hashpw(user_data.password.encode('utf-8'), _bcrypt.gensalt()).decode('utf-8')

        user_doc = {
            "id": str(uuid.uuid4()),
            "username": user_data.username,
            "email": user_data.email,
            "password_hash": password_hash,
            "role": user_data.role,
            "compound_id": target_compound,
            "family_id": None,
            "full_name": user_data.full_name,
            "phone": user_data.phone,
            "unit_number": user_data.unit_number,
            "is_family_head": False,
            "is_active": True,
            # Admin-created accounts are pre-verified — admin has already vetted them.
            # End-user self-registration goes through `/api/auth/register` which sets this to False
            # and triggers the email verification flow.
            "email_verified": True,
            "email_verified_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc),
            "profile_picture_url": None
        }

        result = await db.users.insert_one(user_doc)

        if result.inserted_id:
            # Audit the user creation (admin/super_admin/company_admin actions)
            try:
                from audit_logger import audit_log
                await audit_log(
                    actor=current_user, action="user.create", target_type="user",
                    target_id=user_doc["id"],
                    details={"username": user_data.username, "email": user_data.email,
                             "role": user_data.role, "compound_id": target_compound},
                    request=request,
                )
            except Exception:
                pass
            # Send credentials email (fire-and-forget; failures don't block creation)
            if user_data.email:
                try:
                    from services.credentials_email import send_credentials_email
                    compound = await db.compounds.find_one(
                        {"id": target_compound}, {"_id": 0, "name": 1}
                    )
                    await send_credentials_email(
                        to_email=user_data.email,
                        full_name=user_data.full_name,
                        username=user_data.username,
                        password=user_data.password,
                        compound_name=(compound or {}).get("name"),
                        role=user_data.role,
                    )
                except Exception as e:
                    logging.warning(f"Credentials email skipped for new user {user_data.username}: {e}")
            return {"message": "تم إنشاء الساكن بنجاح", "user_id": user_doc["id"]}
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
    request: Request = None,
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

        try:
            from audit_logger import audit_log
            await audit_log(
                actor=current_user,
                action="user.activate" if is_active else "user.deactivate",
                target_type="user", target_id=user_id,
                details={"is_active": is_active}, request=request,
            )
        except Exception:
            pass

        return {"message": f"User {'activated' if is_active else 'deactivated'} successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating user status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user status")


@router.get("/admin/users/{user_id}")
async def get_user_details(user_id: str, current_user: dict = Depends(require_admin)):
    """Get full user details (Admin only)"""
    db = get_db()
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    # Enrich with compound name if applicable
    if user.get("compound_id"):
        c = await db.compounds.find_one({"id": user["compound_id"]}, {"_id": 0, "name": 1})
        if c:
            user["compound_name"] = c.get("name")
    return user


@router.put("/admin/users/{user_id}")
async def update_user(
    user_id: str,
    payload: dict,
    request: Request = None,
    current_user: dict = Depends(require_admin)
):
    """Update editable user fields (Admin only).
    Allowed: full_name, email, phone, role, compound_id, is_active, unit_number.
    Username is immutable. Password updates go through /users/{id}/password.
    """
    db = get_db()
    existing = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")

    allowed = {"full_name", "email", "phone", "role", "compound_id", "is_active", "unit_number"}
    update_data = {}
    for k, v in (payload or {}).items():
        if k in allowed:
            update_data[k] = v

    # Prevent demoting the last app_owner
    if "role" in update_data and existing.get("role") == "app_owner" and update_data["role"] != "app_owner":
        count = await db.users.count_documents({"role": "app_owner", "is_active": True})
        if count <= 1:
            raise HTTPException(status_code=400, detail="لا يمكن تخفيض آخر مالك تطبيق نشط")

    # Guard against email uniqueness conflicts
    if "email" in update_data and update_data["email"] and update_data["email"] != existing.get("email"):
        conflict = await db.users.find_one({"email": update_data["email"], "id": {"$ne": user_id}}, {"_id": 0, "id": 1})
        if conflict:
            raise HTTPException(status_code=400, detail="هذا البريد الإلكتروني مستخدم مسبقاً")

    if not update_data:
        raise HTTPException(status_code=400, detail="لا توجد حقول صالحة للتحديث")

    before_snapshot = {k: existing.get(k) for k in update_data.keys()}
    await db.users.update_one({"id": user_id}, {"$set": update_data})

    try:
        from audit_logger import audit_log
        # Use a specific action for role changes (security-sensitive)
        action = "user.role_change" if "role" in update_data and existing.get("role") != update_data.get("role") else "user.update"
        await audit_log(
            actor=current_user, action=action, target_type="user", target_id=user_id,
            before=before_snapshot, after=update_data,
            details={"fields": list(update_data.keys()), "username": existing.get("username")},
            request=request,
        )
    except Exception:
        pass

    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return {"message": "تم تحديث المستخدم بنجاح", "user": updated}


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

