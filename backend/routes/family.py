"""
Family Members & Gate Access routes - extracted from server.py
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

@router.post("/family-members")
async def create_family_member(
    member_data: FamilyMemberCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new family member for the current user's unit"""
    try:
        db = get_db()
        # Create family member
        family_member = FamilyMember(
            **member_data.dict(),
            unit_id=current_user.id,  # Using user ID as unit ID for now
            compound_id=current_user.compound_id,
            primary_resident_id=current_user.id,
            unit_number=current_user.unit_number
        )
        
        await db.family_members.insert_one(family_member.dict())
        
        return {"message": "Family member added successfully", "family_member": family_member}
        
    except Exception as e:
        logging.error(f"Error creating family member: {e}")
        raise HTTPException(status_code=500, detail="Failed to create family member")

@router.post("/family-members/add-to-unit")
async def add_family_member_to_unit(
    unit_id: str = Form(...),
    full_name: str = Form(...),
    relationship: str = Form(...),
    age: str = Form(None),
    birthday: str = Form(None),
    phone: str = Form(None),
    email: str = Form(None),
    id_number: str = Form(None),
    emergency_contact_name: str = Form(None),
    emergency_contact_phone: str = Form(None),
    move_in_date: str = Form(None),
    profile_picture: UploadFile = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Allow both residents and admins to add family members to any unit in their compound"""
    try:
        db = get_db()
        # Get the target unit/resident
        target_resident = await db.users.find_one({"id": unit_id, "compound_id": current_user.compound_id})
        if not target_resident:
            raise HTTPException(status_code=404, detail="Target resident not found in your compound")
        
        # Authorization check:
        # 1. Admins can add family members to any unit in their compound
        # 2. Residents can add family members to any unit in their compound
        # 3. Both must be in the same compound
        if current_user.compound_id != target_resident["compound_id"]:
            raise HTTPException(status_code=403, detail="Cannot add family members to residents outside your compound")
        
        profile_picture_url = None
        if profile_picture:
            try:
                # Upload profile picture
                os.makedirs(UPLOAD_DIR, exist_ok=True)
                file_extension = profile_picture.filename.split('.')[-1] if '.' in profile_picture.filename else 'jpg'
                filename = f"family_member_{uuid.uuid4()}.{file_extension}"
                file_path = os.path.join(UPLOAD_DIR, filename)
                
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(profile_picture.file, buffer)
                
                profile_picture_url = f"/api/files/{filename}"
            except Exception as e:
                logging.error(f"Error uploading profile picture: {e}")
                # Continue without profile picture if upload fails
        
        # Create family member with proper data conversion
        family_member_data = {
            "id": str(uuid.uuid4()),
            "full_name": full_name,
            "relationship": relationship,
            "age": int(age) if age else None,
            "birthday": birthday if birthday else None,
            "phone": phone if phone else None,
            "email": email if email else None,
            "id_number": id_number if id_number else None,
            "emergency_contact_name": emergency_contact_name if emergency_contact_name else None,
            "emergency_contact_phone": emergency_contact_phone if emergency_contact_phone else None,
            "move_in_date": move_in_date if move_in_date else None,
            "profile_picture_url": profile_picture_url,
            "unit_id": unit_id,
            "compound_id": current_user.compound_id,
            "primary_resident_id": unit_id,
            "unit_number": target_resident["unit_number"],
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "added_by": current_user.id,  # Track who added the family member
            "added_by_role": current_user.role  # Track the role of who added them
        }
        
        await db.family_members.insert_one(family_member_data)
        
        # Log the action
        await db.activity_logs.insert_one({
            "id": str(uuid.uuid4()),
            "compound_id": current_user.compound_id,
            "user_id": current_user.id,
            "action": "add_family_member",
            "target_user_id": unit_id,
            "details": f"{current_user.full_name} ({current_user.role}) added family member {full_name} to unit {target_resident['unit_number']}",
            "timestamp": datetime.now(timezone.utc)
        })
        
        # Notify admins about new family member
        await notify_compound_admins(
            compound_id=current_user.compound_id,
            title="فرد عائلة جديد",
            content=f"تمت إضافة {full_name} إلى وحدة {target_resident['unit_number']} بواسطة {current_user.full_name}",
            action_type="new_family_member",
            exclude_user_id=current_user.id
        )
        
        return {
            "message": f"Family member {full_name} added successfully to unit {target_resident['unit_number']}",
            "family_member": serialize_datetime(family_member_data),
            "added_by": current_user.full_name,
            "added_by_role": current_user.role
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error adding family member to unit: {e}")
        raise HTTPException(status_code=500, detail="Failed to add family member to unit")

@router.get("/family-members")
async def get_family_members(
    current_user: dict = Depends(get_current_user)
):
    """Get all family members for the current user's unit"""
    try:
        db = get_db()
        if current_user.role == "admin":
            # Admin can see all family members in the compound
            family_members = await db.family_members.find({
                "compound_id": current_user.compound_id,
                "is_active": True
            }).to_list(length=1000)
        else:
            # Residents can only see their own family members
            family_members = await db.family_members.find({
                "primary_resident_id": current_user.id,
                "is_active": True
            }).to_list(length=1000)
        
        # Serialize datetime objects
        serialized_members = [serialize_datetime(member) for member in family_members]
        
        return {"family_members": serialized_members}
        
    except Exception as e:
        logging.error(f"Error getting family members: {e}")
        raise HTTPException(status_code=500, detail="Failed to get family members")

@router.put("/family-members/{member_id}")
async def update_family_member(
    member_id: str,
    update_data: FamilyMemberUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a family member"""
    try:
        db = get_db()
        # Find the family member
        family_member = await db.family_members.find_one({
            "id": member_id,
            "primary_resident_id": current_user.id
        })
        
        if not family_member:
            raise HTTPException(status_code=404, detail="Family member not found")
        
        # Update the family member
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict["updated_at"] = datetime.now(timezone.utc)
        
        await db.family_members.update_one(
            {"id": member_id},
            {"$set": update_dict}
        )
        
        return {"message": "Family member updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating family member: {e}")
        raise HTTPException(status_code=500, detail="Failed to update family member")

@router.put("/family-members/{member_id}/profile")
async def update_family_member_with_profile(
    member_id: str,
    full_name: str = Form(...),
    relationship: str = Form(...),
    age: int = Form(None),
    email: str = Form(None),
    phone: str = Form(None),
    date_of_birth: str = Form(None),
    id_number: str = Form(None),
    profile_picture: UploadFile = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Update a family member with profile picture support"""
    try:
        db = get_db()
        # Find the family member
        family_member = await db.family_members.find_one({
            "id": member_id,
            "primary_resident_id": current_user.id
        })
        
        if not family_member:
            raise HTTPException(status_code=404, detail="Family member not found")
        
        # Build update data
        update_dict = {
            "full_name": full_name,
            "relationship": relationship,
            "updated_at": datetime.now(timezone.utc)
        }
        
        if age is not None:
            update_dict["age"] = age
        if email:
            update_dict["email"] = email
        if phone:
            update_dict["phone"] = phone
        if id_number:
            update_dict["id_number"] = id_number
        if date_of_birth:
            try:
                # Convert string date to date object
                parsed_date = datetime.strptime(date_of_birth, '%Y-%m-%d').date()
                update_dict["birthday"] = parsed_date
            except ValueError:
                pass  # Skip invalid date format
        
        # Handle profile picture upload
        if profile_picture and profile_picture.filename:
            if not profile_picture.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                raise HTTPException(status_code=400, detail="Invalid image format")
            
            # Create uploads directory for family members
            family_upload_dir = UPLOAD_DIR / "family_members"
            family_upload_dir.mkdir(exist_ok=True)
            
            # Generate unique filename
            file_ext = Path(profile_picture.filename).suffix
            unique_filename = f"{member_id}_{uuid.uuid4().hex[:8]}{file_ext}"
            file_path = family_upload_dir / unique_filename
            
            # Save file
            content = await profile_picture.read()
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(content)
            
            # Update profile image path
            update_dict["profile_image"] = f"/api/files/family_members/{unique_filename}"
        
        # Update the family member
        await db.family_members.update_one(
            {"id": member_id},
            {"$set": update_dict}
        )
        
        return {"message": "Family member updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating family member profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to update family member profile")

@router.delete("/family-members/{member_id}")
async def delete_family_member(
    member_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete (deactivate) a family member"""
    try:
        db = get_db()
        # Find the family member
        family_member = await db.family_members.find_one({
            "id": member_id,
            "primary_resident_id": current_user.id
        })
        
        if not family_member:
            raise HTTPException(status_code=404, detail="Family member not found")
        
        # Soft delete by setting is_active to False
        await db.family_members.update_one(
            {"id": member_id},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
        )
        
        return {"message": "Family member removed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting family member: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete family member")

@router.post("/family-members/{member_id}/qr-code")
async def generate_member_qr_code(
    member_id: str,
    qr_request: QRCodeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate QR code for family member gate access"""
    try:
        db = get_db()
        # Find the family member
        family_member = await db.family_members.find_one({
            "id": member_id,
            "primary_resident_id": current_user.id,
            "is_active": True
        })
        
        if not family_member:
            raise HTTPException(status_code=404, detail="Family member not found")
        
        # Set expiration time
        expires_at = datetime.now(timezone.utc) + timedelta(hours=qr_request.expires_in_hours)
        
        # Create access token
        access_token = create_gate_access_token(
            family_member_id=member_id,
            unit_id=family_member["unit_id"],
            compound_id=current_user.compound_id,
            expires_at=expires_at
        )
        
        # Generate QR code with the access token
        qr_code_data = generate_qr_code(access_token)
        
        if not qr_code_data:
            raise HTTPException(status_code=500, detail="Failed to generate QR code")
        
        # Update family member with QR code
        await db.family_members.update_one(
            {"id": member_id},
            {
                "$set": {
                    "qr_code": qr_code_data,
                    "qr_code_expires": expires_at,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return {
            "message": "QR code generated successfully",
            "qr_code": qr_code_data,
            "expires_at": expires_at.isoformat(),
            "access_token": access_token
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating QR code: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate QR code")

@router.post("/gate-access/verify")
async def verify_gate_access(
    access_token: str,
    gate_location: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Verify gate access token (for security guards)"""
    try:
        db = get_db()
        # Decode the access token
        import json
        try:
            db = get_db()
            token_data = json.loads(base64.b64decode(access_token).decode())
        except:
            raise HTTPException(status_code=400, detail="Invalid access token")
        
        # Check if token is expired
        expires_at = datetime.fromisoformat(token_data["expires_at"])
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Access token has expired")
        
        # Verify family member exists and is active
        family_member = await db.family_members.find_one({
            "id": token_data["family_member_id"],
            "compound_id": token_data["compound_id"],
            "is_active": True
        })
        
        if not family_member:
            raise HTTPException(status_code=404, detail="Family member not found or inactive")
        
        # Log the gate access
        gate_access = GateAccess(
            family_member_id=token_data["family_member_id"],
            unit_id=token_data["unit_id"],
            compound_id=token_data["compound_id"],
            gate_location=gate_location,
            security_guard_id=current_user.id if current_user.role == "admin" else None,
            access_granted=True
        )
        
        await db.gate_access.insert_one(gate_access.dict())
        
        return {
            "access_granted": True,
            "family_member_name": family_member["full_name"],
            "unit_number": family_member["unit_number"],
            "relationship": family_member["relationship"],
            "message": "Access granted"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error verifying gate access: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify gate access")

@router.get("/gate-access/history")
async def get_gate_access_history(
    current_user: dict = Depends(get_current_user),
    limit: int = 100
):
    """Get gate access history"""
    try:
        db = get_db()
        if current_user.role == "admin":
            # Admin can see all gate access in the compound
            access_history = await db.gate_access.find({
                "compound_id": current_user.compound_id
            }).sort("access_time", -1).limit(limit).to_list(length=10000)
        else:
            # Residents can only see their family's access history
            family_member_ids = await db.family_members.find({
                "primary_resident_id": current_user.id
            }).distinct("id")
            
            access_history = await db.gate_access.find({
                "family_member_id": {"$in": family_member_ids}
            }).sort("access_time", -1).limit(limit).to_list(length=10000)
        
        # Enhance with family member details
        enhanced_history = []
        for access in access_history:
            family_member = await db.family_members.find_one({"id": access["family_member_id"]})
            enhanced_access = {
                **serialize_datetime(access),
                "family_member_name": family_member["full_name"] if family_member else "Unknown",
                "relationship": family_member["relationship"] if family_member else "Unknown"
            }
            enhanced_history.append(enhanced_access)
        
        return {"access_history": enhanced_history}
        
    except Exception as e:
        logging.error(f"Error getting gate access history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get gate access history")

# ============ RESIDENT REGISTRATION LINKS ============

class RegistrationLinkRequest(BaseModel):
    unit_number: str
    full_name: str
    email: str
    phone: Optional[str] = None
    expires_in_hours: int = 72  # Default 72 hours validity

class RegistrationLink(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    admin_id: str
    unit_number: str
    full_name: str
    email: str
    phone: Optional[str] = None
    registration_token: str
    is_used: bool = False
    expires_at: datetime
    used_at: Optional[datetime] = None
    registered_user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

