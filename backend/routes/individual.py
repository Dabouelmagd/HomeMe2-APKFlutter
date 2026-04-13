"""
Individual & Account Selection routes
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


class AccountTypeChoice(BaseModel):
    account_type: str  # individual, compound_admin, company_admin


class AccountTypeSelection(BaseModel):
    user_id: str = ""
    account_type: str = ""
    selected_at: str = ""


class IndividualCompoundCreate(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    units_count: int = 1


class IndividualUpgradeRequest(BaseModel):
    plan: str
    payment_method: Optional[str] = None

async def get_account_type_selection():
    """Get available account types for new users"""
    try:
        account_types = [
            {
                "type": "individual",
                "name": "Individual Compound",
                "name_ar": "مجمع فردي",
                "name_fr": "Complexe Individuel",
                "description": "Manage a single compound with up to 1000 units",
                "description_ar": "إدارة مجمع واحد يصل إلى 1000 وحدة",
                "description_fr": "Gérer un seul complexe avec jusqu'à 1000 unités",
                "features": [
                    "Single compound management",
                    "Up to 1000 units",
                    "$0.50 per unit/month", 
                    "1 month free trial",
                    "Basic reporting",
                    "Can upgrade to Enterprise"
                ],
                "features_ar": [
                    "إدارة مجمع واحد",
                    "حتى 1000 وحدة",
                    "0.50$ لكل وحدة/شهر",
                    "شهر واحد تجريبي مجاني",
                    "تقارير أساسية",
                    "يمكن الترقية للشركات"
                ],
                "features_fr": [
                    "Gestion d'un seul complexe",
                    "Jusqu'à 1000 unités",
                    "0,50$ par unité/mois",
                    "1 mois d'essai gratuit",
                    "Rapports de base",
                    "Mise à niveau vers Enterprise possible"
                ],
                "pricing": {
                    "base_price": 0.50,
                    "currency": "USD",
                    "billing_cycle": ["monthly", "annual"],
                    "trial_period": "1 month",
                    "annual_discount": "1 month free"
                }
            },
            {
                "type": "enterprise",
                "name": "Enterprise Company",
                "name_ar": "شركة متعددة المجمعات", 
                "name_fr": "Entreprise Multi-Complexes",
                "description": "Manage multiple compounds with advanced features",
                "description_ar": "إدارة عدة مجمعات مع ميزات متقدمة",
                "description_fr": "Gérer plusieurs complexes avec des fonctionnalités avancées",
                "features": [
                    "Multiple compounds management",
                    "Unlimited units",
                    "Volume discounts (10-40%)",
                    "3 months free trial", 
                    "Advanced analytics",
                    "Multi-user management",
                    "Custom integrations"
                ],
                "features_ar": [
                    "إدارة عدة مجمعات",
                    "وحدات غير محدودة", 
                    "خصومات حجم (10-40%)",
                    "3 أشهر تجريبية مجانية",
                    "تحليلات متقدمة",
                    "إدارة متعددة المستخدمين",
                    "تكاملات مخصصة"
                ],
                "features_fr": [
                    "Gestion de plusieurs complexes",
                    "Unités illimitées",
                    "Remises de volume (10-40%)",
                    "3 mois d'essai gratuit",
                    "Analyses avancées", 
                    "Gestion multi-utilisateurs",
                    "Intégrations personnalisées"
                ],
                "pricing": {
                    "base_price": 0.50,
                    "additional_price": 0.40, 
                    "currency": "USD",
                    "billing_cycle": ["monthly", "annual"],
                    "trial_period": "3 months",
                    "volume_discounts": "10-40% off"
                }
            }
        ]
        
        return {
            "success": True,
            "account_types": account_types
        }
        
    except Exception as e:
        logger.error(f"Error getting account types: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/account/select-type")
async def select_account_type(
    choice: AccountTypeChoice,
    current_user: dict = Depends(get_current_user)
):
    """User selects account type"""
    try:
        db = get_db()
        # Save user's choice
        selection = AccountTypeSelection(
            user_id=current_user.id,
            selected_type=choice.account_type,
            redirect_url=f"/{choice.account_type}-register"
        )
        
        await db.account_type_selections.insert_one(selection.dict())
        
        return {
            "success": True,
            "selected_type": choice.account_type,
            "redirect_url": selection.redirect_url,
            "message": f"Account type '{choice.account_type}' selected successfully"
        }
        
    except Exception as e:
        logger.error(f"Error selecting account type: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/individual/register")
async def register_individual_compound(
    compound_data: IndividualCompoundCreate,
    current_user: dict = Depends(get_current_user)
):
    """Register individual compound account"""
    try:
        db = get_db()
        # Calculate trial end date (1 month from now)
        trial_start = datetime.now(timezone.utc)
        trial_end = trial_start + timedelta(days=30)  # 1 month trial
        
        # Create individual compound
        compound = IndividualCompound(
            **compound_data.dict(),
            owner_id=current_user.id,
            trial_end_date=trial_end,
            billing_start_date=trial_end
        )
        
        await db.individual_compounds.insert_one(compound.dict())
        
        # Calculate billing end date
        billing_end = trial_end + timedelta(days=30)  # First billing period
        
        # Create subscription
        subscription = IndividualSubscription(
            compound_id=compound.id,
            total_units=compound.total_units,
            trial_end_date=trial_end,
            current_period_end=billing_end,
            next_billing_date=trial_end
        )
        
        # Calculate pricing
        pricing = calculate_individual_pricing(
            compound.total_units,
            subscription.billing_cycle,
            apply_trial=True
        )
        
        subscription.monthly_amount = pricing["monthly_amount"]
        subscription.annual_amount = pricing["annual_amount"]
        
        await db.individual_subscriptions.insert_one(subscription.dict())
        
        # Update user role to include compound access
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": {
                "compound_id": compound.id,
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        return {
            "success": True,
            "compound": serialize_datetime(compound.dict()),
            "subscription": serialize_datetime(subscription.dict()),
            "pricing": pricing,
            "message": "Individual compound registered successfully"
        }
        
    except Exception as e:
        logger.error(f"Error registering individual compound: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/individual/dashboard")
async def get_individual_dashboard(
    current_user: dict = Depends(get_current_user)
):
    """Get individual compound dashboard"""
    try:
        db = get_db()
        # Get user's compound
        compound = await db.individual_compounds.find_one({
            "owner_id": current_user.id,
            "status": "active"
        })
        
        if not compound:
            raise HTTPException(status_code=404, detail="No individual compound found")
        
        # Get subscription
        subscription = await db.individual_subscriptions.find_one({
            "compound_id": compound["id"],
            "status": {"$in": ["trial", "active"]}
        })
        
        if not subscription:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        # Calculate statistics
        total_residents = await db.users.count_documents({
            "compound_id": compound["id"],
            "role": "resident",
            "is_active": True
        })
        
        total_families = await db.families.count_documents({
            "compound_id": compound["id"]
        })
        
        occupancy_rate = (total_families / compound["total_units"] * 100) if compound["total_units"] > 0 else 0
        
        # Calculate trial days remaining
        now = datetime.now(timezone.utc)
        trial_end = subscription.get("trial_end_date")
        if trial_end and isinstance(trial_end, str):
            trial_end = datetime.fromisoformat(trial_end.replace('Z', '+00:00'))
        
        trial_days_remaining = max(0, (trial_end - now).days) if trial_end else 0
        
        # Get recent activity counts
        recent_registrations = await db.users.count_documents({
            "compound_id": compound["id"],
            "created_at": {"$gte": now - timedelta(days=7)}
        })
        
        dashboard_summary = IndividualDashboardSummary(
            compound=IndividualCompound(**compound),
            subscription=IndividualSubscription(**subscription),
            total_residents=total_residents,
            total_families=total_families,
            occupancy_rate=round(occupancy_rate, 2),
            monthly_cost=subscription.get("monthly_amount", 0),
            next_billing_date=subscription.get("next_billing_date"),
            trial_days_remaining=trial_days_remaining,
            recent_registrations=recent_registrations,
            recent_service_bookings=0,  # TODO: Implement
            pending_maintenance=0,  # TODO: Implement
            unread_messages=0  # TODO: Implement
        )
        
        return {
            "success": True,
            "dashboard": serialize_datetime(dashboard_summary.dict()),
            "account_type": "individual"
        }
        
    except Exception as e:
        logger.error(f"Error getting individual dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/individual/upgrade")
async def request_upgrade_to_enterprise(
    upgrade_request: IndividualUpgradeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Request upgrade from individual to enterprise"""
    try:
        db = get_db()
        # Get user's compound
        compound = await db.individual_compounds.find_one({
            "owner_id": current_user.id,
            "status": "active",
            "can_upgrade": True
        })
        
        if not compound:
            raise HTTPException(status_code=404, detail="No upgradeable compound found")
        
        # Calculate cost difference
        cost_analysis = calculate_upgrade_cost_difference(
            IndividualCompound(**compound),
            1 + upgrade_request.additional_compounds
        )
        
        # Create upgrade request
        upgrade = AccountUpgrade(
            individual_compound_id=compound["id"],
            requested_by=current_user.id,
            old_monthly_cost=cost_analysis["current_monthly_cost"],
            new_monthly_cost=cost_analysis["new_monthly_cost"], 
            cost_difference=cost_analysis["cost_difference"]
        )
        
        await db.account_upgrades.insert_one(upgrade.dict())
        
        return {
            "success": True,
            "upgrade_request": serialize_datetime(upgrade.dict()),
            "cost_analysis": cost_analysis,
            "message": "Upgrade request submitted successfully"
        }
        
    except Exception as e:
        logger.error(f"Error requesting upgrade: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/individual/pricing/calculate")
async def calculate_individual_compound_pricing(
    units: int,
    billing_cycle: str = "monthly",
    current_user: dict = Depends(get_current_user)
):
    """Calculate pricing for individual compound"""
    try:
        if units <= 0 or units > 1000:
            raise HTTPException(status_code=400, detail="Units must be between 1 and 1000 for individual compounds")
        
        pricing = calculate_individual_pricing(units, billing_cycle, apply_trial=True)
        
        return {
            "success": True,
            "pricing": pricing,
            "account_type": "individual"
        }
        
    except Exception as e:
        logger.error(f"Error calculating individual pricing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# SUPER ADMIN MANAGEMENT API ENDPOINTS
# =============================================================================

