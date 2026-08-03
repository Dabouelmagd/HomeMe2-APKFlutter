"""
Compounds CRUD routes
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

async def create_compound(compound_data: CompoundCreate, current_user: dict = Depends(require_admin)):
    compound = Compound(
        name=compound_data.name,
        address=compound_data.address,
        admin_id=current_user["id"]
    )
    
    await db.compounds.insert_one(compound.dict())
    return {"message": "Compound created successfully", "compound_id": compound.id}

@router.get("/compounds/{compound_id}")
async def get_compound(compound_id: str, current_user: dict = Depends(get_current_user)):
    try:
        db = get_db()
        role = current_user.get('role', '')
        allowed_roles = ('app_owner', 'super_admin', 'company_admin')
        if role not in allowed_roles and current_user.get('compound_id','') != compound_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        compound = await db.compounds.find_one({"id": compound_id})
        if not compound:
            raise HTTPException(status_code=404, detail="Compound not found")
        
        return serialize_datetime(compound)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting compound: {e}")
        raise HTTPException(status_code=500, detail="Failed to get compound")

@router.put("/compounds/{compound_id}")
async def update_compound(
    compound_id: str,
    compound_data: dict,
    current_user: dict = Depends(require_admin)
):
    """Update compound information (Admin only)"""
    try:
        db = get_db()
        # Update compound data
        update_data = {
            "name": compound_data.get("name"),
            "address": compound_data.get("address"),
            "description": compound_data.get("description")
        }
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid update data provided")
        
        result = await db.compounds.update_one(
            {"id": compound_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Compound not found")
        
        # Get updated compound
        updated_compound = await db.compounds.find_one({"id": compound_id})
        if not updated_compound:
            raise HTTPException(status_code=404, detail="Compound not found after update")
        
        return serialize_datetime(updated_compound)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating compound: {e}")
        raise HTTPException(status_code=500, detail="Failed to update compound")

@router.put("/compounds/{compound_id}/logo")
async def upload_compound_logo(
    compound_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin)
):
    role = current_user.get('role', '')
    # Owner, super_admin, company_admin can upload logo for any compound
    # Regular admin can only upload for their own compound
    if role not in ('app_owner', 'super_admin', 'company_admin'):
        if current_user.get('compound_id','') != compound_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    file_content = await file.read()
    logo_base64 = process_image(file_content)
    logo_url = f"data:image/jpeg;base64,{logo_base64}"
    
    await db.compounds.update_one(
        {"id": compound_id},
        {"$set": {"logo_url": logo_url}}
    )
    
    return {"message": "Logo uploaded successfully", "logo_url": logo_url}

# Admin Management Routes
@router.post("/compounds/{compound_id}/admins/{user_id}")
async def add_admin(
    compound_id: str,
    user_id: str,
    current_user: dict = Depends(require_admin)
):
    role = current_user.get('role', '')
    # Allow owner/super_admin/company_admin to access any compound
    if role not in ('app_owner', 'super_admin', 'company_admin'):
        if current_user.get('compound_id','') != compound_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if user exists and is in the same compound
    user = await db.users.find_one({"id": user_id, "compound_id": compound_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found in compound")
    
    # Update user role to admin
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": UserRole.ADMIN}}
    )
    
    # Add to compound's additional admins
    await db.compounds.update_one(
        {"id": compound_id},
        {"$addToSet": {"additional_admins": user_id}}
    )
    
    return {"message": "Admin added successfully"}

# Family Management Routes
