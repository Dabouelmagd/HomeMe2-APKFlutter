"""
Authentication & Registration routes
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
from subscription_codes import SubscriptionCodeManager
from webauthn_service import WebAuthnService, WebAuthnRegisterOptions, WebAuthnRegisterVerify, WebAuthnLoginOptions, WebAuthnLoginVerify
from activity_logger import ActivityLogger

router = APIRouter(prefix="/api")

@router.post("/auth/register")
async def register(user_data: UserCreate, request: Request):
    db = get_db()
    # Validate password strength
    is_valid, error_message = validate_password_strength(user_data.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    # Check if username or email already exists
    existing_user = await db.users.find_one({
        "$or": [{"username": user_data.username}, {"email": user_data.email}]
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    # Check subscription code if provided
    subscription_info = None
    if user_data.subscription_code:
        # Use SubscriptionCodeManager to verify and apply code
        verification = await SubscriptionCodeManager.verify_code(
            user_data.subscription_code.upper().strip(),
            None  # No user_id yet since user not created
        )
        
        if not verification.get("valid"):
            error_message = verification.get("error", "invalid_code")
            error_messages = {
                "code_not_found": "Invalid subscription code",
                "code_deactivated": "This code has been deactivated",
                "code_expired": "This code has expired",
                "code_max_uses_reached": "This code has reached maximum uses",
                "verification_error": "Error verifying code"
            }
            raise HTTPException(
                status_code=400, 
                detail=error_messages.get(error_message, "Invalid subscription code")
            )
        
        subscription_info = verification
    
    # Hash password
    password_hash = hash_password(user_data.password)
    
    # Use default compound_id if not provided
    compound_id = user_data.compound_id if user_data.compound_id else "default-compound"
    
    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=password_hash,
        role=user_data.role,
        compound_id=compound_id,
        full_name=user_data.full_name,
        phone=user_data.phone,
        unit_number=user_data.unit_number,
        is_family_head=(user_data.role == "resident")
    )
    
    # Add subscription info if code was used
    user_dict = user.dict()
    if subscription_info:
        subscription_end = datetime.now(timezone.utc) + timedelta(days=subscription_info["duration_days"])
        user_dict["subscription_active"] = True
        user_dict["subscription_type"] = subscription_info["type"]
        user_dict["subscription_start"] = datetime.now(timezone.utc).isoformat()
        user_dict["subscription_end"] = subscription_end.isoformat()
        user_dict["subscription_code_used"] = user_data.subscription_code.upper().strip()
    else:
        # No subscription code - give automatic 14-day free trial
        trial_end = datetime.now(timezone.utc) + timedelta(days=14)
        user_dict["subscription_active"] = True
        user_dict["subscription_type"] = "trial"
        user_dict["subscription_start"] = datetime.now(timezone.utc).isoformat()
        user_dict["subscription_end"] = trial_end.isoformat()
        user_dict["trial_used"] = True
        user_dict["trial_days"] = 14
    
    await db.users.insert_one(user_dict)
    
    # Apply subscription code after user is created
    if subscription_info:
        await SubscriptionCodeManager.apply_code(
            user_data.subscription_code.upper().strip(),
            user.id,
            user.username
        )
    
    # Create family if resident
    if user_data.role == "resident" and user_data.unit_number:
        family = Family(
            compound_id=user_data.compound_id,
            unit_number=user_data.unit_number,
            head_user_id=user.id,
            members=[user.id]
        )
        await db.families.insert_one(family.dict())
        
        # Update user with family_id
        await db.users.update_one(
            {"id": user.id},
            {"$set": {"family_id": family.id}}
        )
    
    # Send welcome email (async, don't wait for result)
    try:
        db = get_db()
        compound_name = None
        if compound_id and compound_id != "default-compound":
            compound = await db.compounds.find_one({"id": compound_id})
            if compound:
                compound_name = compound.get("name")
        
        asyncio.create_task(
            email_service.send_welcome_email(
                to_email=user_data.email,
                full_name=user_data.full_name,
                username=user_data.username,
                compound_name=compound_name
            )
        )
        
        # Notify admins of new resident
        if user_data.role == "resident":
            admins = await db.users.find({"role": "admin", "compound_id": compound_id}).to_list(length=10)
            for admin in admins:
                if admin.get("email"):
                    asyncio.create_task(
                        email_service.send_new_resident_notification(
                            admin_email=admin["email"],
                            admin_name=admin.get("full_name", "Admin"),
                            new_resident_name=user_data.full_name,
                            unit_number=user_data.unit_number,
                            compound_name=compound_name or "Default Compound"
                        )
                    )
    except Exception as e:
        # Log email error but don't fail registration
        logging.error(f"Failed to send welcome email: {str(e)}")
    
    return {
        "message": "User registered successfully",
        "user_id": user.id,
        "subscription_active": True,
        "subscription_type": user_dict.get("subscription_type", "trial"),
        "subscription_end": user_dict.get("subscription_end")
    }

@router.post("/auth/create-admin")
async def create_admin_user():
    """Create default admin user for production - TEMPORARY ENDPOINT"""
    db = get_db()
    
    # Check if admin already exists
    existing_admin = await db.users.find_one({"username": "admin"})
    if existing_admin:
        return {"message": "Admin user already exists", "admin_id": existing_admin["id"]}
    
    # Create default compound
    compound = Compound(
        name="Default Compound",
        address="Default Address"
    )
    await db.compounds.insert_one(compound.dict())
    
    # Create admin user
    admin_user = User(
        username="admin",
        password_hash=hash_password("admin123"),
        role="admin",
        compound_id=compound.id,
        full_name="System Administrator",
        phone="1234567890"
    )
    
    await db.users.insert_one(admin_user.dict())
    
    return {
        "message": "Admin user created successfully", 
        "username": "admin",
        "password": "admin123",
        "admin_id": admin_user.id,
        "compound_id": compound.id
    }

@router.post("/auth/login")
async def login(user_data: UserLogin, request: Request):
    db = get_db()
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        # Log failed login attempt
        await ActivityLogger.log_activity(
            action_type="login",
            username=user_data.username,
            details="Failed login attempt - Invalid credentials",
            ip_address=request.client.host if request.client else None,
            status="failed"
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user["is_active"]:
        # Log inactive account login attempt
        await ActivityLogger.log_activity(
            action_type="login",
            username=user_data.username,
            details="Failed login attempt - Account disabled",
            ip_address=request.client.host if request.client else None,
            status="failed"
        )
        raise HTTPException(status_code=401, detail="Account is disabled")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    # Get compound name if compound_id exists
    compound_name = None
    if user.get("compound_id"):
        compound = await db.compounds.find_one({"id": user["compound_id"]})
        if compound:
            compound_name = compound.get("name", "Unknown Compound")
    
    # Log successful login
    await ActivityLogger.log_activity(
        action_type="login",
        username=user_data.username,
        details=f"Successful login - Role: {user['role']}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "compound_id": user["compound_id"],
            "compound_name": compound_name,
            "unit_number": user.get("unit_number"),
            "full_name": user["full_name"],
            "is_family_head": user.get("is_family_head", False),
            "family_id": user.get("family_id")
        }
    }

@router.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information"""
    return {
        "id": current_user['id'],
        "username": current_user.get('username',''),
        "role": current_user.get('role',''),
        "compound_id": current_user.get('compound_id',''),
        "full_name": current_user.get('full_name',''),
        "email": current_user.get('email',''),
        "phone": current_user.get('phone',''),
        "profile_picture_url": current_user.get('profile_picture_url',''),
        "company_id": current_user.get('company_id', None),
        "is_family_head": current_user.get('is_family_head', False),
        "family_id": current_user.get('family_id', None)
    }

# WebAuthn/Biometric Authentication Routes
webauthn_service = WebAuthnService(None)  # Will be initialized with actual db on first use

@router.post("/webauthn/register/options")
async def webauthn_register_options(data: WebAuthnRegisterOptions, request: Request, current_user: dict = Depends(get_current_user)):
    """Get registration options for biometric"""
    origin = request.headers.get('origin', request.headers.get('referer', 'https://localhost'))
    options = await webauthn_service.get_register_options(data.user_id, data.username, origin)
    return options

@router.post("/webauthn/register/verify")
async def webauthn_register_verify(data: WebAuthnRegisterVerify, current_user: dict = Depends(get_current_user)):
    """Verify and store biometric registration"""
    result = await webauthn_service.verify_registration(
        data.user_id, data.credential_id, data.client_data_json, data.attestation_object
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Registration failed"))
    return result

@router.post("/webauthn/login/options")
async def webauthn_login_options(data: WebAuthnLoginOptions, request: Request):
    """Get login options for biometric authentication"""
    origin = request.headers.get('origin', request.headers.get('referer', 'https://localhost'))
    options, error = await webauthn_service.get_login_options(data.username, origin)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return options

@router.post("/webauthn/login/verify")
async def webauthn_login_verify(data: WebAuthnLoginVerify, request: Request):
    """Verify biometric login and return token"""
    user, error = await webauthn_service.verify_login(
        data.username, data.credential_id, data.client_data_json,
        data.authenticator_data, data.signature
    )
    
    if error:
        raise HTTPException(status_code=401, detail=error)
    
    # Generate JWT token
    token = create_access_token(data={"sub": user["id"]})
    
    # Log successful biometric login
    await ActivityLogger.log_activity(
        action_type="login",
        user_id=user["id"],
        username=user["username"],
        details="Biometric login successful",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "compound_id": user.get("compound_id"),
            "full_name": user.get("full_name", user["username"])
        }
    }

@router.get("/webauthn/check/{username}")
async def webauthn_check(username: str):
    """Check if user has biometric registered"""
    has_biometric = await webauthn_service.has_biometric(username)
    return {"has_biometric": has_biometric}

@router.delete("/webauthn/remove")
async def webauthn_remove(current_user: dict = Depends(get_current_user)):
    """Remove biometric credential"""
    success = await webauthn_service.remove_biometric(current_user['id'])
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove biometric")
    return {"message": "Biometric removed successfully"}

# Compound Management Routes
# Compounds CRUD extracted to routes/
