"""
User Profile & Settings routes
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

async def update_user_profile(
    user_id: str,
    full_name: str = Form(...),
    phone: str = Form(...),
    profile_picture: UploadFile = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Update user profile information"""
    # Check if user can update this profile (self or admin)
    if current_user.id != user_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to update this profile")
    
    try:
        db = get_db()
        # Build update data
        update_data = {
            "full_name": full_name,
            "phone": phone
        }
        
        # Handle profile picture upload
        if profile_picture and profile_picture.filename:
            if not profile_picture.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                raise HTTPException(status_code=400, detail="Invalid image format")
            
            # Create uploads directory for users
            users_upload_dir = UPLOAD_DIR / "users"
            users_upload_dir.mkdir(exist_ok=True)
            
            # Generate unique filename
            file_ext = Path(profile_picture.filename).suffix
            unique_filename = f"{user_id}_{uuid.uuid4().hex[:8]}{file_ext}"
            file_path = users_upload_dir / unique_filename
            
            # Save file
            content = await profile_picture.read()
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            # Update profile picture URL
            update_data["profile_picture_url"] = f"/uploads/users/{unique_filename}"
        
        # Update user in database
        result = await db.users.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get updated user data
        updated_user = await db.users.find_one({"id": user_id}, {"password_hash": 0})
        
        return {"message": "Profile updated successfully", "user": serialize_datetime(updated_user)}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")

@router.put("/users/{user_id}/password")
async def update_user_password(
    user_id: str,
    password_update: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user password"""
    # Check if user can update this password (self only)
    if current_user.id != user_id:
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
    if current_user.id != user_id:
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
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "Privacy settings updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating privacy settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to update privacy settings")

# Duplicate User Profiles routes extracted to routes/

