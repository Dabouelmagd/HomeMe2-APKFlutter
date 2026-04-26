"""
Company & Enterprise Management routes - extracted from server.py
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import uuid
import json
import logging
import os

from database import get_db
from auth_deps import get_current_user, require_admin
from helpers import serialize_datetime
from enterprise_models import *

router = APIRouter(prefix="/api")

@router.post("/companies/register")
async def register_company(
    company_data: CompanyCreate,
    current_user: dict = Depends(get_current_user)
):
    """Register a new enterprise company"""
    try:
        db = get_db()
        # Check if company code is unique
        existing_company = await db.companies.find_one({"company_code": company_data.company_code})
        if existing_company:
            raise HTTPException(status_code=400, detail="Company code already exists")
        
        # Create new company
        company = Company(
            **company_data.dict(),
            created_by=current_user["id"]
        )
        
        await db.companies.insert_one(company.dict())
        
        # Create company user association (make creator the enterprise admin)
        company_user = CompanyUser(
            company_id=company.id,
            user_id=current_user["id"],
            role=CompanyRole.ENTERPRISE_ADMIN,
            invited_by=current_user["id"],
            joined_at=datetime.now(timezone.utc),
            invitation_accepted=True
        )
        
        await db.company_users.insert_one(company_user.dict())
        
        # Create default subscription
        subscription = CompanySubscription(
            company_id=company.id,
            current_period_end=datetime.now(timezone.utc) + timedelta(days=365),
            next_billing_date=datetime.now(timezone.utc) + timedelta(days=365)
        )
        
        await db.company_subscriptions.insert_one(subscription.dict())
        
        return {
            "success": True,
            "company": serialize_datetime(company.dict()),
            "message": "Company registered successfully"
        }
        
    except Exception as e:
        logging.error(f"Error registering company: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/companies/dashboard")
async def get_company_dashboard(
    current_user: dict = Depends(get_current_user)
):
    """Get enterprise company dashboard summary"""
    try:
        db = get_db()
        # Get user's company
        company_user = await db.company_users.find_one({
            "user_id": current_user["id"],
            "is_active": True
        })
        
        if not company_user:
            raise HTTPException(status_code=404, detail="No company association found")
        
        # Get company details
        company = await db.companies.find_one({"id": company_user["company_id"]})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Get subscription
        subscription = await db.company_subscriptions.find_one({
            "company_id": company["id"],
            "status": "active"
        })
        
        # Get compounds
        compounds = await db.compound_companies.find({
            "company_id": company["id"],
            "status": "active"
        }).to_list(length=10000)
        
        # Calculate statistics
        total_compounds = len(compounds)
        total_units = sum(c.get("total_units") or 0 for c in compounds if c)
        
        # Get resident statistics
        compound_ids = [c["id"] for c in compounds]
        total_residents = await db.users.count_documents({
            "compound_id": {"$in": compound_ids},
            "role": "resident",
            "is_active": True
        })
        
        total_families = await db.families.count_documents({
            "compound_id": {"$in": compound_ids}
        })
        
        # Calculate occupancy rate
        occupied_units = await db.families.count_documents({
            "compound_id": {"$in": compound_ids}
        })
        occupancy_rate = (occupied_units / total_units * 100) if total_units > 0 else 0
        
        # Calculate pricing
        pricing = calculate_enterprise_pricing(
            [CompoundCompany(**c) for c in compounds],
            is_first_year=True  # Check actual first year status
        )
        
        return {
            "success": True,
            "dashboard": serialize_datetime({
                "company": company,
                "subscription": subscription,
                "compounds": compounds,
                "statistics": {
                    "total_compounds": total_compounds,
                    "total_units": total_units,
                    "total_residents": total_residents,
                    "total_families": total_families,
                    "occupancy_rate": round(occupancy_rate, 2)
                },
                "pricing": pricing,
                "recent_activity": {
                    "recent_registrations": 0,  # TODO: Implement
                    "recent_service_bookings": 0,  # TODO: Implement
                    "pending_maintenance": 0,  # TODO: Implement
                    "unread_messages": 0  # TODO: Implement
                }
            })
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting company dashboard: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/companies/compounds")
async def create_compound(
    compound_data: CompoundCompanyCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new compound for the company"""
    try:
        db = get_db()
        # Get user's company
        company_user = await db.company_users.find_one({
            "user_id": current_user["id"],
            "is_active": True
        })
        
        if not company_user:
            raise HTTPException(status_code=403, detail="No company access")
        
        # Check permissions
        if company_user["role"] not in [CompanyRole.ENTERPRISE_ADMIN, CompanyRole.COMPANY_MANAGER]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Create compound
        compound = CompoundCompany(
            **compound_data.dict(),
            company_id=company_user["company_id"],
            primary_admin_id=current_user["id"]
        )
        
        await db.compound_companies.insert_one(compound.dict())
        
        return {
            "success": True,
            "compound": serialize_datetime(compound.dict()),
            "message": "Compound created successfully"
        }
        
    except Exception as e:
        logging.error(f"Error creating compound: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/companies/compounds")
async def list_company_compounds(
    current_user: dict = Depends(get_current_user)
):
    """List all compounds for the company"""
    try:
        db = get_db()
        # Get user's company
        company_user = await db.company_users.find_one({
            "user_id": current_user["id"],
            "is_active": True
        })
        
        if not company_user:
            raise HTTPException(status_code=404, detail="No company association found")
        
        # Get accessible compounds
        query = {"company_id": company_user["company_id"]}
        
        # If user is not enterprise admin, filter by their access
        if company_user["role"] != CompanyRole.ENTERPRISE_ADMIN:
            if company_user.get("compound_access"):
                query["id"] = {"$in": company_user["compound_access"]}
            else:
                # No specific access defined, they can see compounds they manage
                query["$or"] = [
                    {"primary_admin_id": current_user["id"]},
                    {"additional_admins": current_user["id"]},
                    {"managers": current_user["id"]}
                ]
        
        compounds = await db.compound_companies.find(query).to_list(length=10000)
        
        # Get statistics for each compound
        for compound in compounds:
            # Get resident count
            resident_count = await db.users.count_documents({
                "compound_id": compound["id"],
                "role": "resident",
                "is_active": True
            })
            
            # Get family count
            family_count = await db.families.count_documents({
                "compound_id": compound["id"]
            })
            
            compound["statistics"] = {
                "residents": resident_count,
                "families": family_count,
                "occupancy_rate": (family_count / compound.get("total_units", 1) * 100) if compound.get("total_units", 0) > 0 else 0
            }
        
        return {
            "success": True,
            "compounds": serialize_datetime(compounds)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error listing compounds: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/companies/invite")
async def invite_user_to_company(
    invite_data: CompanyInviteRequest,
    current_user: dict = Depends(get_current_user)
):
    """Invite a user to join the company"""
    try:
        db = get_db()
        # Get user's company
        company_user = await db.company_users.find_one({
            "user_id": current_user["id"],
            "is_active": True
        })
        
        if not company_user:
            raise HTTPException(status_code=403, detail="No company access")
        
        # Check permissions
        if company_user["role"] not in [CompanyRole.ENTERPRISE_ADMIN, CompanyRole.COMPANY_MANAGER]:
            raise HTTPException(status_code=403, detail="Insufficient permissions to invite users")
        
        # Check if user already exists
        existing_user = await db.users.find_one({"email": invite_data.email})
        
        # Create invitation
        invitation = CompanyInvitation(
            company_id=company_user["company_id"],
            **invite_data.dict(),
            invited_by=current_user["id"],
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        
        await db.company_invitations.insert_one(invitation.dict())
        
        # TODO: Send email invitation
        
        return {
            "success": True,
            "invitation": serialize_datetime(invitation.dict()),
            "message": "Invitation sent successfully"
        }
        
    except Exception as e:
        logging.error(f"Error inviting user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/companies/pricing/calculate")
async def calculate_company_pricing(
    current_user: dict = Depends(get_current_user)
):
    """Calculate current pricing for the company"""
    try:
        db = get_db()
        # Get user's company
        company_user = await db.company_users.find_one({
            "user_id": current_user["id"],
            "is_active": True
        })
        
        if not company_user:
            raise HTTPException(status_code=404, detail="No company association found")
        
        # Get compounds
        compounds = await db.compound_companies.find({
            "company_id": company_user["company_id"],
            "status": "active"
        }).to_list(length=10000)
        
        # Calculate pricing
        pricing = calculate_enterprise_pricing(
            [CompoundCompany(**c) for c in compounds],
            is_first_year=True  # TODO: Check actual subscription status
        )
        
        return {
            "success": True,
            "pricing": pricing,
            "compounds": serialize_datetime(compounds)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error calculating pricing: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/companies/compounds/{compound_id}")
async def update_compound(
    compound_id: str,
    compound_data: CompoundCompanyUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update compound information"""
    try:
        db = get_db()
        # Get user's company and check access
        company_user = await db.company_users.find_one({
            "user_id": current_user["id"],
            "is_active": True
        })
        
        if not company_user:
            raise HTTPException(status_code=403, detail="No company access")
        
        # Get compound and verify ownership
        compound = await db.compound_companies.find_one({
            "id": compound_id,
            "company_id": company_user["company_id"]
        })
        
        if not compound:
            raise HTTPException(status_code=404, detail="Compound not found")
        
        # Check permissions
        can_edit = (
            company_user["role"] == CompanyRole.ENTERPRISE_ADMIN or
            compound["primary_admin_id"] == current_user["id"] or
            current_user["id"] in compound.get("additional_admins", []) or
            current_user["id"] in compound.get("managers", [])
        )
        
        if not can_edit:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Update compound
        update_data = {k: v for k, v in compound_data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await db.compound_companies.update_one(
            {"id": compound_id},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "message": "Compound updated successfully"
        }
        
    except Exception as e:
        logging.error(f"Error updating compound: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/companies/{company_id}/analytics")
async def get_company_analytics(
    company_id: str,
    period: str = "monthly",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get company analytics and reports"""
    try:
        db = get_db()
        # Verify user has access to this company
        company_user = await db.company_users.find_one({
            "user_id": current_user["id"],
            "company_id": company_id,
            "is_active": True
        })
        
        if not company_user:
            raise HTTPException(status_code=403, detail="No access to this company")
        
        # Set default date range if not provided
        if not end_date:
            end_date = date.today()
        if not start_date:
            if period == "monthly":
                start_date = end_date - timedelta(days=30)
            elif period == "weekly":
                start_date = end_date - timedelta(days=7)
            else:
                start_date = end_date - timedelta(days=365)
        
        # Get compounds for this company
        compounds = await db.compound_companies.find({
            "company_id": company_id,
            "status": "active"
        }).to_list(length=10000)
        
        compound_ids = [c["id"] for c in compounds]
        
        # Calculate analytics
        analytics = {
            "company_id": company_id,
            "period": period,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "compounds": {
                "total": len(compounds),
                "active": len([c for c in compounds if c.get("status") == "active"]),
                "total_units": sum(c.get("total_units") or 0 for c in compounds if c)
            },
            "residents": {
                "total": await db.users.count_documents({
                    "compound_id": {"$in": compound_ids},
                    "role": "resident",
                    "is_active": True
                }),
                "families": await db.families.count_documents({
                    "compound_id": {"$in": compound_ids}
                })
            },
            "financial": calculate_enterprise_pricing(
                [CompoundCompany(**c) for c in compounds]
            ),
            "activity": {
                "messages": await db.messages.count_documents({
                    "compound_id": {"$in": compound_ids},
                    "created_at": {
                        "$gte": datetime.combine(start_date, datetime.min.time()),
                        "$lte": datetime.combine(end_date, datetime.max.time())
                    }
                }),
                "maintenance_requests": await db.maintenance_requests.count_documents({
                    "compound_id": {"$in": compound_ids},
                    "created_at": {
                        "$gte": datetime.combine(start_date, datetime.min.time()),
                        "$lte": datetime.combine(end_date, datetime.max.time())
                    }
                })
            }
        }
        
        return {
            "success": True,
            "analytics": serialize_datetime(analytics)
        }
        
    except Exception as e:
        logging.error(f"Error getting company analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# ACCOUNT TYPE SELECTION & INDIVIDUAL COMPOUND MANAGEMENT API ENDPOINTS  
# =============================================================================
