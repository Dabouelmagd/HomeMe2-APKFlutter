"""
User Profile & Settings routes
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from pathlib import Path
import uuid, json, logging, os, shutil

from database import get_db
from auth_deps import get_current_user, require_admin, require_super_admin, hash_password, verify_password, create_access_token, validate_password_strength
from helpers import serialize_datetime

router = APIRouter(prefix="/api")

UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.put("/users/{user_id}/profile")
async def update_user_profile(
    user_id: str,
    full_name: str = Form(...),
    phone: str = Form(""),
    email: Optional[str] = Form(None),
    remove_avatar: Optional[str] = Form(None),
    profile_picture: UploadFile = File(None),
    current_user: dict = Depends(get_current_user),
):
    """Update user profile information (name, phone, optionally email, profile picture)."""
    # Self-edit, admin/super_admin/app_owner allowed to edit others
    acting_role = current_user.get("role")
    is_self = current_user.get("id") == user_id
    is_admin = acting_role in ("admin", "super_admin", "app_owner", "company_admin")
    if not is_self and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to update this profile")

    db = get_db()

    update_data = {
        "full_name": full_name.strip(),
        "phone": (phone or "").strip(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    # Email — optional, validate uniqueness
    if email is not None and email.strip():
        email_clean = email.strip().lower()
        existing = await db.users.find_one({"email": email_clean, "id": {"$ne": user_id}}, {"_id": 0, "id": 1})
        if existing:
            raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل")
        update_data["email"] = email_clean

    # Handle profile picture removal
    if remove_avatar and str(remove_avatar).lower() in ("true", "1", "yes"):
        update_data["profile_picture_url"] = ""

    # Handle profile picture upload
    if profile_picture and profile_picture.filename:
        fn_lower = profile_picture.filename.lower()
        if not fn_lower.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
            raise HTTPException(status_code=400, detail="Invalid image format")

        users_upload_dir = UPLOAD_DIR / "users"
        users_upload_dir.mkdir(exist_ok=True, parents=True)

        file_ext = Path(profile_picture.filename).suffix.lower() or ".png"
        unique_filename = f"{user_id}_{uuid.uuid4().hex[:8]}{file_ext}"
        file_path = users_upload_dir / unique_filename

        content = await profile_picture.read()
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="الصورة كبيرة جداً (الحد الأقصى 10MB)")
        with open(file_path, 'wb') as f:
            f.write(content)

        # Dual-write to MongoDB for deployment-survival
        try:
            from services.media_store import save_to_db
            await save_to_db("users", unique_filename, profile_picture.content_type or "", content)
        except Exception as _e:
            import logging as _lg
            _lg.warning(f"user profile pic DB backup failed: {_e}")

        update_data["profile_picture_url"] = f"/api/files/users/{unique_filename}"

    result = await db.users.update_one({"id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return {"message": "Profile updated successfully", "user": serialize_datetime(updated_user)}

@router.put("/users/{user_id}/password")
async def update_user_password(
    user_id: str,
    password_update: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user password"""
    # Check if user can update this password (self only)
    if current_user.get("id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this password")
    
    try:
        db = get_db()
        current_password = password_update.get("current_password")
        new_password = password_update.get("new_password")
        
        if not current_password or not new_password:
            raise HTTPException(status_code=400, detail="Current password and new password are required")
        
        # Verify current password
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if not verify_password(current_password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Hash new password
        new_password_hash = hash_password(new_password)
        
        # Update password
        result = await db.users.update_one(
            {"id": user_id},
            {"$set": {"password_hash": new_password_hash}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "Password updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating password: {e}")
        raise HTTPException(status_code=500, detail="Failed to update password")

@router.put("/users/{user_id}/privacy")
async def update_user_privacy_settings(
    user_id: str,
    privacy_settings: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user privacy settings"""
    # Check if user can update privacy settings (self only)
    if current_user.get("id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update privacy settings")
    
    try:
        db = get_db()
        # Define allowed privacy settings
        allowed_settings = {
            "profile_visibility": ["public", "compound", "family", "private"],
            "contact_visibility": ["compound", "family", "admins", "private"],
            "activity_status": [True, False],
            "data_sharing": [True, False],
            "marketing_emails": [True, False]
        }
        
        # Validate and filter settings
        update_data = {}
        for key, value in privacy_settings.items():
            if key in allowed_settings:
                if key in ["activity_status", "data_sharing", "marketing_emails"]:
                    update_data[f"privacy_settings.{key}"] = bool(value)
                elif value in allowed_settings[key]:
                    update_data[f"privacy_settings.{key}"] = value
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid privacy settings provided")
        
        # Update user privacy settings
        result = await db.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "Privacy settings updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating privacy settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to update privacy settings")

# Duplicate User Profiles routes extracted to routes/

