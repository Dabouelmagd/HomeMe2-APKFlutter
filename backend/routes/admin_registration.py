"""
Admin Registration Links routes - extracted from server.py
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


class RegistrationLinkRequest(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    unit_number: str
    role: str = "resident"


class CompleteRegistrationRequest(BaseModel):
    token: str
    username: str
    password: str
    phone: Optional[str] = None


@router.post("/admin/registration-links")
async def create_registration_link(
    link_request: RegistrationLinkRequest,
    current_user: dict = Depends(require_admin)
):
    """Create a registration link for a resident (Admin only)"""
    try:
        db = get_db()
        # Check if user already exists
        existing_user = await db.users.find_one({
            "email": link_request.email,
            "compound_id": current_user.compound_id
        })
        
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Generate registration token
        expires_at = datetime.now(timezone.utc) + timedelta(hours=link_request.expires_in_hours)
        registration_token = create_registration_token(
            unit_number=link_request.unit_number,
            email=link_request.email,
            compound_id=current_user.compound_id,
            expires_at=expires_at
        )
        
        # Create registration link record
        reg_link = RegistrationLink(
            compound_id=current_user.compound_id,
            admin_id=current_user.id,
            unit_number=link_request.unit_number,
            full_name=link_request.full_name,
            email=link_request.email,
            phone=link_request.phone,
            registration_token=registration_token,
            expires_at=expires_at
        )
        
        await db.registration_links.insert_one(reg_link.dict())
        
        # Generate registration URL
        registration_url = f"{BACKEND_URL}/register?token={registration_token}"
        
        return {
            "message": "Registration link created successfully",
            "registration_url": registration_url,
            "expires_at": expires_at.isoformat(),
            "registration_link": reg_link
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating registration link: {e}")
        raise HTTPException(status_code=500, detail="Failed to create registration link")

@router.get("/admin/registration-links")
async def get_registration_links(
    current_user: dict = Depends(require_admin)
):
    """Get all registration links for the compound (Admin only)"""
    try:
        db = get_db()
        links = await db.registration_links.find({
            "compound_id": current_user.compound_id
        }).sort("created_at", -1).to_list(length=None)
        
        # Serialize datetime objects
        serialized_links = [serialize_datetime(link) for link in links]
        
        return {"registration_links": serialized_links}
        
    except Exception as e:
        logging.error(f"Error getting registration links: {e}")
        raise HTTPException(status_code=500, detail="Failed to get registration links")

@router.delete("/admin/registration-links/{link_id}")
async def delete_registration_link(
    link_id: str,
    current_user: dict = Depends(require_admin)
):
    """Delete a registration link (Admin only)"""
    try:
        db = get_db()
        result = await db.registration_links.delete_one({
            "id": link_id,
            "compound_id": current_user.compound_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Registration link not found")
        
        return {"message": "Registration link deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting registration link: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete registration link")

@router.get("/register/verify/{token}")
async def verify_registration_token(token: str):
    """Verify registration token and return registration details"""
    try:
        db = get_db()
        # Decode the registration token
        try:
            db = get_db()
            token_data = json.loads(base64.b64decode(token).decode())
        except:
            raise HTTPException(status_code=400, detail="Invalid registration token")
        
        # Check if token is expired
        expires_at = datetime.fromisoformat(token_data["expires_at"])
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Registration token has expired")
        
        # Find the registration link
        reg_link = await db.registration_links.find_one({
            "registration_token": token,
            "is_used": False
        })
        
        if not reg_link:
            raise HTTPException(status_code=404, detail="Registration link not found or already used")
        
        return {
            "valid": True,
            "unit_number": reg_link["unit_number"],
            "full_name": reg_link["full_name"],
            "email": reg_link["email"],
            "compound_id": reg_link["compound_id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error verifying registration token: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify registration token")

@router.post("/register/complete")
async def complete_registration(
    token: str = Form(...),
    username: str = Form(...),
    password: str = Form(...),
    phone: str = Form(None),
    profile_picture: UploadFile = File(None)
):
    """Complete user registration using the token"""
    try:
        db = get_db()
        # Verify token first
        token_verification = await verify_registration_token(token)
        
        # Find the registration link
        reg_link = await db.registration_links.find_one({
            "registration_token": token,
            "is_used": False
        })
        
        if not reg_link:
            raise HTTPException(status_code=404, detail="Registration link not found or already used")
        
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
            unique_filename = f"profile_{str(uuid.uuid4())}.{file_extension}"
            file_path = os.path.join(user_uploads_dir, unique_filename)
            
            # Save file
            content = await profile_picture.read()
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            profile_picture_url = f"/uploads/users/{unique_filename}"
        
        # Create the user account
        hashed_password = pwd_context.hash(password)
        
        new_user = User(
            username=username,
            email=reg_link["email"],
            password_hash=hashed_password,
            full_name=reg_link["full_name"],
            phone=phone or reg_link["phone"],
            role="resident",
            compound_id=reg_link["compound_id"],
            unit_number=reg_link["unit_number"],
            profile_picture_url=profile_picture_url
        )
        
        await db.users.insert_one(new_user.dict())
        
        # Mark registration link as used
        await db.registration_links.update_one(
            {"id": reg_link["id"]},
            {
                "$set": {
                    "is_used": True,
                    "used_at": datetime.now(timezone.utc),
                    "registered_user_id": new_user.id
                }
            }
        )
        
        return {
            "message": "Registration completed successfully",
            "user_id": new_user.id,
            "profile_picture_url": profile_picture_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error completing registration: {e}")
        raise HTTPException(status_code=500, detail="Failed to complete registration")

@router.put("/users/{user_id}/compound")
async def update_user_compound(
    user_id: str,
    compound_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user's compound assignment"""
    try:
        db = get_db()
        # Verify user can update this user (either self or admin)
        if current_user.id != user_id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Not authorized to update this user")
        
        compound_id = compound_data.get("compound_id")
        if not compound_id:
            raise HTTPException(status_code=400, detail="compound_id is required")
        
        # Verify compound exists
        compound = await db.compounds.find_one({"id": compound_id})
        if not compound:
            raise HTTPException(status_code=404, detail="Compound not found")
        
        # Update user's compound
        result = await db.users.update_one(
            {"id": user_id},
            {"$set": {"compound_id": compound_id}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {"message": "User compound updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating user compound: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user compound")

@router.post("/admin/residences")
async def create_residence_directly(
    unit_number: str = Form(...),
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(None),
    compound_id: str = Form(...),
    profile_picture: UploadFile = File(None),
    current_user: dict = Depends(require_admin)
):
    """Create a new residence and user account directly (Admin only)"""
    try:
        db = get_db()
        # Check if user already exists
        existing_user = await db.users.find_one({
            "email": email,
            "compound_id": compound_id
        })
        
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists in this compound")
        
        # Check if unit number already exists
        existing_unit = await db.users.find_one({
            "unit_number": unit_number,
            "compound_id": compound_id
        })
        
        if existing_unit:
            raise HTTPException(status_code=400, detail="Unit number already exists in this compound")
        
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
            unique_filename = f"profile_{str(uuid.uuid4())}.{file_extension}"
            file_path = os.path.join(user_uploads_dir, unique_filename)
            
            # Save file
            content = await profile_picture.read()
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            profile_picture_url = f"/uploads/users/{unique_filename}"
        
        # Generate temporary password
        import secrets
        import string
        temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
        hashed_password = pwd_context.hash(temp_password)
        
        # Generate username from email
        username = email.split('@')[0] + str(secrets.randbelow(1000))
        
        # Create the user account
        new_user = User(
            username=username,
            email=email,
            password_hash=hashed_password,
            full_name=full_name,
            phone=phone,
            role="resident",
            compound_id=compound_id,
            unit_number=unit_number,
            profile_picture_url=profile_picture_url,
            is_family_head=True
        )
        
        await db.users.insert_one(new_user.dict())
        
        # Create family for the user
        new_family = Family(
            compound_id=compound_id,
            unit_number=unit_number,
            head_user_id=new_user.id,
            members=[new_user.id]  # List of user IDs
        )
        
        await db.families.insert_one(new_family.dict())
        
        # Update user with family_id
        await db.users.update_one(
            {"id": new_user.id},
            {"$set": {"family_id": new_family.id}}
        )
        
        # Notify admins about new residence
        await notify_compound_admins(
            compound_id=compound_id,
            title="وحدة سكنية جديدة",
            content=f"تم إنشاء وحدة سكنية جديدة: {unit_number} - {full_name}",
            action_type="new_residence",
            exclude_user_id=current_user.id
        )
        
        return {
            "message": "Residence created successfully",
            "user_id": new_user.id,
            "family_id": new_family.id,
            "temporary_password": temp_password,
            "username": username,
            "profile_picture_url": profile_picture_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating residence: {e}")
        raise HTTPException(status_code=500, detail="Failed to create residence")

