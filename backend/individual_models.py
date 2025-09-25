# Individual Compound Management Models
from datetime import datetime, timezone, date
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, EmailStr
import uuid

# Account Types
class AccountType(str):
    INDIVIDUAL = "individual"
    ENTERPRISE = "enterprise"
    SUPER_ADMIN = "super_admin"

class IndividualCompound(BaseModel):
    """Individual compound account - single compound management"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    logo_url: Optional[str] = None
    address: str
    
    # Owner Information
    owner_id: str  # User ID of the compound owner
    owner_email: EmailStr
    owner_phone: Optional[str] = None
    
    # Compound Details
    total_units: int = Field(..., gt=0)
    compound_type: str = Field(default="residential")  # residential, commercial, mixed
    amenities: List[str] = Field(default_factory=list)
    
    # Pricing & Subscription
    pricing_plan: str = Field(default="individual")
    price_per_unit: float = Field(default=0.5)  # $0.5 per unit
    monthly_fee: Optional[float] = None
    
    # Trial & Billing
    is_trial: bool = Field(default=True)
    trial_duration_months: int = Field(default=1)  # 1 month free trial
    trial_start_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    trial_end_date: datetime
    billing_start_date: Optional[datetime] = None
    
    # Account Status
    status: str = Field(default="active")  # active, suspended, cancelled
    account_type: str = Field(default=AccountType.INDIVIDUAL)
    can_upgrade: bool = Field(default=True)  # Can upgrade to Enterprise
    
    # Settings
    timezone: str = Field(default="UTC")
    currency: str = Field(default="USD")
    language: str = Field(default="en")
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Settings
    settings: Dict[str, Any] = Field(default_factory=dict)

class IndividualSubscription(BaseModel):
    """Subscription details for individual compound"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    
    # Subscription Details
    plan_type: str = Field(default="individual")
    billing_cycle: str = Field(default="monthly")  # monthly, annual
    
    # Pricing
    price_per_unit: float = Field(default=0.5)
    total_units: int = 0
    monthly_amount: float = 0.0
    annual_amount: float = 0.0
    
    # Discounts
    annual_discount_percent: float = Field(default=8.33)  # 1 month free (12 for 11)
    promotional_discount: float = Field(default=0.0)
    
    # Trial Information
    is_trial_active: bool = True
    trial_end_date: datetime
    
    # Billing Status
    status: str = Field(default="trial")  # trial, active, suspended, cancelled
    current_period_start: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    current_period_end: datetime
    next_billing_date: datetime
    
    # Payment Information
    last_payment_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    auto_renew: bool = Field(default=True)
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AccountTypeSelection(BaseModel):
    """User's choice between Individual and Enterprise account"""
    user_id: str
    selected_type: str  # individual, enterprise
    selection_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    redirect_url: str  # Where to redirect after selection

# Super Admin Models
class SuperAdmin(BaseModel):
    """Super admin account for HomeMe platform owners"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    
    # Permissions
    can_access_all_accounts: bool = Field(default=True)
    can_modify_all_accounts: bool = Field(default=True)
    can_manage_pricing: bool = Field(default=True)
    can_manage_users: bool = Field(default=True)
    can_view_analytics: bool = Field(default=True)
    
    # Access Logs
    last_access: Optional[datetime] = None
    access_count: int = Field(default=0)
    
    # Status
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

class AccountUpgrade(BaseModel):
    """Track upgrades from Individual to Enterprise"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    individual_compound_id: str
    enterprise_company_id: Optional[str] = None
    
    # Upgrade Details
    upgrade_type: str = Field(default="individual_to_enterprise")
    upgrade_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    requested_by: str  # User ID
    approved_by: Optional[str] = None
    
    # Status
    status: str = Field(default="pending")  # pending, approved, completed, cancelled
    
    # Migration Data
    data_migrated: bool = Field(default=False)
    migration_date: Optional[datetime] = None
    migration_notes: Optional[str] = None
    
    # Pricing Impact
    old_monthly_cost: float = 0.0
    new_monthly_cost: float = 0.0
    cost_difference: float = 0.0

# Request/Response Models
class IndividualCompoundCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    address: str
    total_units: int = Field(..., gt=0, le=1000)  # Max 1000 units for individual
    compound_type: str = Field(default="residential")
    amenities: List[str] = Field(default_factory=list)
    
    # Contact Information
    owner_email: EmailStr
    owner_phone: Optional[str] = None
    
    # Preferences
    timezone: str = Field(default="UTC")
    currency: str = Field(default="USD")
    language: str = Field(default="en")

class IndividualCompoundUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    total_units: Optional[int] = None
    compound_type: Optional[str] = None
    amenities: Optional[List[str]] = None
    owner_phone: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None
    language: Optional[str] = None

class AccountTypeChoice(BaseModel):
    account_type: str = Field(..., pattern="^(individual|enterprise)$")

class UpgradeRequest(BaseModel):
    target_type: str = Field(default="enterprise")
    reason: Optional[str] = None
    additional_compounds: int = Field(default=0, ge=0)
    estimated_units: int = Field(default=0, ge=0)

class SuperAdminAccountAccess(BaseModel):
    account_id: str
    account_type: str  # individual, enterprise
    action: str  # view, edit, suspend, activate
    reason: Optional[str] = None

class IndividualDashboardSummary(BaseModel):
    compound: IndividualCompound
    subscription: IndividualSubscription
    
    # Statistics
    total_residents: int
    total_families: int
    occupancy_rate: float
    
    # Financial Summary
    monthly_cost: float
    next_billing_date: datetime
    trial_days_remaining: int
    
    # Recent Activity
    recent_registrations: int
    recent_service_bookings: int
    pending_maintenance: int
    unread_messages: int

# Pricing Calculation Functions
def calculate_individual_pricing(
    total_units: int,
    billing_cycle: str = "monthly",
    apply_trial: bool = True
) -> Dict[str, float]:
    """Calculate pricing for individual compound"""
    
    price_per_unit = 0.5  # Base price
    monthly_amount = total_units * price_per_unit
    
    # Annual discount (1 month free)
    if billing_cycle == "annual":
        annual_amount = monthly_amount * 11  # 12 months for 11
        annual_discount = monthly_amount  # 1 month free
    else:
        annual_amount = monthly_amount * 12
        annual_discount = 0.0
    
    return {
        "price_per_unit": price_per_unit,
        "monthly_amount": monthly_amount,
        "annual_amount": annual_amount,
        "annual_discount": annual_discount,
        "annual_savings": annual_discount,
        "trial_months": 1 if apply_trial else 0,
        "total_units": total_units
    }

def calculate_upgrade_cost_difference(
    individual_compound: IndividualCompound,
    enterprise_compounds_count: int = 1
) -> Dict[str, float]:
    """Calculate cost difference when upgrading to Enterprise"""
    
    # Current individual cost
    individual_cost = calculate_individual_pricing(
        individual_compound.total_units,
        apply_trial=False
    )["monthly_amount"]
    
    # Enterprise cost (assuming same compound becomes first compound)
    from enterprise_models import calculate_enterprise_pricing, CompoundCompany
    
    # Mock enterprise compound for calculation
    enterprise_compound = CompoundCompany(
        id=individual_compound.id,
        name=individual_compound.name,
        address=individual_compound.address,
        company_id="mock",
        primary_admin_id=individual_compound.owner_id,
        total_units=individual_compound.total_units
    )
    
    enterprise_pricing = calculate_enterprise_pricing(
        [enterprise_compound] * enterprise_compounds_count,
        is_first_year=False  # No first year free after upgrade
    )
    
    return {
        "current_monthly_cost": individual_cost,
        "new_monthly_cost": enterprise_pricing["final_amount"],
        "cost_difference": enterprise_pricing["final_amount"] - individual_cost,
        "percentage_change": ((enterprise_pricing["final_amount"] - individual_cost) / individual_cost * 100) if individual_cost > 0 else 0
    }