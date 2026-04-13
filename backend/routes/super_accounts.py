"""
Super Admin Account Management routes
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


class SuperAdminAccountAccess(BaseModel):
    target_user_id: str
    reason: Optional[str] = None

async def get_all_platform_accounts(
    account_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Super admin: Get all platform accounts"""
    try:
        db = get_db()
        # Check if user is super admin
        super_admin = await db.super_admins.find_one({
            "user_id": current_user.id,
            "is_active": True,
            "can_access_all_accounts": True
        })
        
        if not super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        accounts = []
        
        # Get individual compounds
        if not account_type or account_type == "individual":
            individual_query = {}
            if status:
                individual_query["status"] = status
                
            individual_compounds = await db.individual_compounds.find(individual_query).to_list(None)
            
            for compound in individual_compounds:
                # Get subscription info
                subscription = await db.individual_subscriptions.find_one({
                    "compound_id": compound["id"]
                })
                
                # Get owner info
                owner = await db.users.find_one({"id": compound["owner_id"]})
                
                accounts.append({
                    "id": compound["id"],
                    "type": "individual",
                    "name": compound["name"],
                    "owner": owner.get("full_name") if owner else "Unknown",
                    "owner_email": compound.get("owner_email"),
                    "total_units": compound.get("total_units", 0),
                    "status": compound.get("status"),
                    "monthly_cost": subscription.get("monthly_amount", 0) if subscription else 0,
                    "trial_active": subscription.get("is_trial_active", False) if subscription else False,
                    "created_at": compound.get("created_at")
                })
        
        # Get enterprise companies
        if not account_type or account_type == "enterprise":
            enterprise_query = {}
            if status:
                enterprise_query["is_active"] = (status == "active")
                
            companies = await db.companies.find(enterprise_query).to_list(None)
            
            for company in companies:
                # Get compounds count
                compounds_count = await db.compound_companies.count_documents({
                    "company_id": company["id"],
                    "status": "active"
                })
                
                # Get total units
                compounds = await db.compound_companies.find({
                    "company_id": company["id"],
                    "status": "active"
                }).to_list(None)
                
                total_units = sum(c.get("total_units") or 0 for c in compounds if c)
                
                # Get subscription
                subscription = await db.company_subscriptions.find_one({
                    "company_id": company["id"],
                    "status": "active"
                })
                
                accounts.append({
                    "id": company["id"],
                    "type": "enterprise", 
                    "name": company["name"],
                    "company_code": company.get("company_code"),
                    "email": company.get("email"),
                    "compounds_count": compounds_count,
                    "total_units": total_units,
                    "status": "active" if company.get("is_active") else "inactive",
                    "monthly_cost": subscription.get("total_amount", 0) if subscription else 0,
                    "created_at": company.get("created_at")
                })
        
        # Update super admin access log
        await db.super_admins.update_one(
            {"user_id": current_user.id},
            {
                "$set": {"last_access": datetime.now(timezone.utc)},
                "$inc": {"access_count": 1}
            }
        )
        
        return {
            "success": True,
            "accounts": serialize_datetime(accounts),
            "total_count": len(accounts),
            "filters": {
                "account_type": account_type,
                "status": status
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting platform accounts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/super/access-account")
async def super_admin_access_account(
    access_request: SuperAdminAccountAccess,
    current_user: dict = Depends(get_current_user)
):
    """Super admin: Access and modify any account"""
    try:
        db = get_db()
        # Check super admin permissions
        super_admin = await db.super_admins.find_one({
            "user_id": current_user.id,
            "is_active": True
        })
        
        if not super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        # Check specific permissions
        if access_request.action in ["edit", "suspend", "activate"] and not super_admin.get("can_modify_all_accounts"):
            raise HTTPException(status_code=403, detail="Account modification permission required")
        
        # Get account details
        account = None
        if access_request.account_type == "individual":
            account = await db.individual_compounds.find_one({"id": access_request.account_id})
        elif access_request.account_type == "enterprise":
            account = await db.companies.find_one({"id": access_request.account_id})
        
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Log the access
        access_log = {
            "super_admin_id": current_user.id,
            "account_id": access_request.account_id,
            "account_type": access_request.account_type,
            "action": access_request.action,
            "reason": access_request.reason,
            "timestamp": datetime.now(timezone.utc)
        }
        
        await db.super_admin_access_logs.insert_one(access_log)
        
        return {
            "success": True,
            "account": serialize_datetime(account),
            "access_granted": True,
            "allowed_actions": ["view", "edit", "suspend", "activate"] if super_admin.get("can_modify_all_accounts") else ["view"],
            "message": f"Access granted to {access_request.account_type} account"
        }
        
    except Exception as e:
        logger.error(f"Error accessing account: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Upload endpoints
