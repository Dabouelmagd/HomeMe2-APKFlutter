# Enterprise Multi-Compound Management Models
from datetime import datetime, timezone, date
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, EmailStr
import uuid

# Enterprise Company Models
class CompanyRole(str):
    ENTERPRISE_ADMIN = "enterprise_admin"
    COMPANY_MANAGER = "company_manager" 
    COMPOUND_MANAGER = "compound_manager"

class Company(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    logo_url: Optional[str] = None
    
    # Contact Information
    email: EmailStr
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    
    # Company Settings
    company_code: str = Field(..., min_length=3, max_length=20)  # Unique company identifier
    timezone: str = Field(default="UTC")
    currency: str = Field(default="USD")
    language: str = Field(default="en")
    
    # Subscription & Billing
    subscription_plan: str = Field(default="enterprise")
    billing_email: Optional[EmailStr] = None
    tax_id: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # User ID of the company creator
    is_active: bool = True
    
    # Settings
    settings: Dict[str, Any] = Field(default_factory=dict)

class CompanyUser(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    user_id: str
    role: str = Field(default=CompanyRole.COMPOUND_MANAGER)
    
    # Permissions
    permissions: List[str] = Field(default_factory=list)
    compound_access: List[str] = Field(default_factory=list)  # Compound IDs user can manage
    
    # Status
    is_active: bool = True
    invited_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    joined_at: Optional[datetime] = None
    invited_by: str
    
    # Invitation
    invitation_token: Optional[str] = None
    invitation_expires_at: Optional[datetime] = None
    invitation_accepted: bool = False

class CompoundCompany(BaseModel):
    """Extended Compound model for Enterprise companies"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    logo_url: Optional[str] = None
    address: str
    
    # Company Association
    company_id: str
    
    # Management
    primary_admin_id: str  # Main admin for this compound
    additional_admins: List[str] = Field(default_factory=list)
    managers: List[str] = Field(default_factory=list)  # Company managers with access
    
    # Compound Details
    total_units: Optional[int] = None
    compound_type: str = Field(default="residential")  # residential, commercial, mixed
    amenities: List[str] = Field(default_factory=list)
    
    # Billing & Pricing
    pricing_model: str = Field(default="per_unit")  # per_unit, flat_rate, custom
    price_per_unit: float = Field(default=0.5)  # $0.5 per unit
    monthly_fee: Optional[float] = None
    setup_fee: Optional[float] = None
    
    # Status
    status: str = Field(default="active")  # active, inactive, suspended
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    activated_at: Optional[datetime] = None
    
    # Trial Information
    is_trial: bool = Field(default=True)
    trial_end_date: Optional[datetime] = None
    first_year_free: bool = Field(default=True)  # First year free promotion
    
    # Settings
    settings: Dict[str, Any] = Field(default_factory=dict)

class CompanySubscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    
    # Subscription Details
    plan_type: str = Field(default="enterprise")  # enterprise, enterprise_plus
    billing_cycle: str = Field(default="annual")  # monthly, annual
    
    # Pricing
    base_price: float = Field(default=0.0)
    price_per_unit: float = Field(default=0.5)  # Base unit price
    additional_compound_price: float = Field(default=0.4)  # Additional compound unit price
    
    # Discounts
    volume_discount_percent: float = Field(default=0.0)  # Percentage discount based on volume
    first_year_discount_percent: float = Field(default=100.0)  # 100% = First year free
    custom_discount_percent: float = Field(default=0.0)
    
    # Billing Information
    total_compounds: int = 0
    total_units: int = 0
    monthly_amount: float = 0.0
    annual_amount: float = 0.0
    
    # Status
    status: str = Field(default="active")  # active, suspended, cancelled
    current_period_start: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    current_period_end: datetime
    
    # Payment
    next_billing_date: datetime
    last_payment_date: Optional[datetime] = None
    payment_method: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompanyInvitation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    compound_id: Optional[str] = None  # If inviting for specific compound
    
    # Invitation Details
    email: EmailStr
    role: str = Field(default=CompanyRole.COMPOUND_MANAGER)
    permissions: List[str] = Field(default_factory=list)
    
    # Invitation Data
    invitation_token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invited_by: str  # User ID
    invited_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    
    # Status
    status: str = Field(default="pending")  # pending, accepted, expired, cancelled
    accepted_at: Optional[datetime] = None
    accepted_by_user_id: Optional[str] = None
    
    # Message
    custom_message: Optional[str] = None

class CompanyBilling(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    subscription_id: str
    
    # Billing Period
    billing_period_start: date
    billing_period_end: date
    
    # Calculations
    compounds_count: int
    total_units: int
    base_amount: float
    additional_compound_amount: float
    subtotal: float
    
    # Discounts Applied
    volume_discount: float = 0.0
    first_year_discount: float = 0.0
    custom_discount: float = 0.0
    total_discount: float = 0.0
    
    # Final Amount
    total_amount: float
    tax_amount: float = 0.0
    final_amount: float
    
    # Payment
    status: str = Field(default="pending")  # pending, paid, overdue, cancelled
    due_date: date
    paid_date: Optional[date] = None
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Invoice
    invoice_number: str = Field(default_factory=lambda: f"INV-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}")
    invoice_url: Optional[str] = None

class CompanyAnalytics(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    
    # Period
    period_type: str  # daily, weekly, monthly, quarterly, yearly
    period_date: date
    
    # Compound Statistics
    total_compounds: int = 0
    active_compounds: int = 0
    total_units: int = 0
    occupied_units: int = 0
    occupancy_rate: float = 0.0
    
    # User Statistics
    total_residents: int = 0
    active_users: int = 0
    total_families: int = 0
    new_registrations: int = 0
    
    # Financial Statistics
    total_revenue: float = 0.0
    monthly_recurring_revenue: float = 0.0
    average_revenue_per_unit: float = 0.0
    
    # Service Statistics
    total_services: int = 0
    service_bookings: int = 0
    completed_services: int = 0
    service_revenue: float = 0.0
    
    # Engagement Statistics
    total_messages: int = 0
    active_chats: int = 0
    notification_sends: int = 0
    app_sessions: int = 0
    
    # Maintenance Statistics
    maintenance_requests: int = 0
    completed_requests: int = 0
    average_resolution_time_hours: float = 0.0
    
    # Created timestamp
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request/Response Models

class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    company_code: str = Field(..., min_length=3, max_length=20)
    timezone: str = Field(default="UTC")
    currency: str = Field(default="USD")
    language: str = Field(default="en")

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    timezone: Optional[str] = None
    currency: Optional[str] = None
    language: Optional[str] = None

class CompoundCompanyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    address: str
    total_units: Optional[int] = None
    compound_type: str = Field(default="residential")
    amenities: List[str] = Field(default_factory=list)
    pricing_model: str = Field(default="per_unit")
    price_per_unit: float = Field(default=0.5)

class CompoundCompanyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    total_units: Optional[int] = None
    compound_type: Optional[str] = None
    amenities: Optional[List[str]] = None
    pricing_model: Optional[str] = None
    price_per_unit: Optional[float] = None

class CompanyInviteRequest(BaseModel):
    email: EmailStr
    role: str = Field(default=CompanyRole.COMPOUND_MANAGER)
    compound_id: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)
    custom_message: Optional[str] = None

class CompanyInviteAccept(BaseModel):
    invitation_token: str
    user_data: Dict[str, Any]  # User registration data if new user

class CompanyDashboardSummary(BaseModel):
    company: Company
    subscription: CompanySubscription
    compounds: List[CompoundCompany]
    
    # Summary Statistics
    total_compounds: int
    total_units: int
    total_residents: int
    total_families: int
    occupancy_rate: float
    
    # Financial Summary
    monthly_revenue: float
    annual_revenue: float
    outstanding_amount: float
    
    # Recent Activity
    recent_registrations: int
    recent_service_bookings: int
    pending_maintenance: int
    unread_messages: int

class CompanyReportRequest(BaseModel):
    report_type: str  # financial, occupancy, services, maintenance, user_activity
    period_type: str = Field(default="monthly")  # daily, weekly, monthly, quarterly, yearly
    start_date: date
    end_date: date
    compound_ids: Optional[List[str]] = None  # If None, include all compounds
    format: str = Field(default="json")  # json, csv, pdf

# Volume Discount Tiers
VOLUME_DISCOUNT_TIERS = [
    {"min_compounds": 1, "max_compounds": 2, "discount_percent": 0.0},
    {"min_compounds": 3, "max_compounds": 4, "discount_percent": 10.0},
    {"min_compounds": 5, "max_compounds": 9, "discount_percent": 20.0},
    {"min_compounds": 10, "max_compounds": 19, "discount_percent": 30.0},
    {"min_compounds": 20, "max_compounds": float('inf'), "discount_percent": 40.0}
]

def calculate_volume_discount(compound_count: int) -> float:
    """Calculate volume discount based on number of compounds"""
    for tier in VOLUME_DISCOUNT_TIERS:
        if tier["min_compounds"] <= compound_count <= tier["max_compounds"]:
            return tier["discount_percent"]
    return 0.0

def calculate_enterprise_pricing(
    compounds: List[CompoundCompany], 
    is_first_year: bool = False
) -> Dict[str, float]:
    """Calculate total pricing for enterprise company"""
    if not compounds:
        return {
            "base_amount": 0.0,
            "additional_amount": 0.0,
            "subtotal": 0.0,
            "volume_discount": 0.0,
            "first_year_discount": 0.0,
            "total_discount": 0.0,
            "final_amount": 0.0
        }
    
    # Calculate base pricing
    total_units = sum(c.total_units or 0 for c in compounds)
    compound_count = len(compounds)
    
    # First compound at base rate ($0.5/unit), additional at $0.4/unit
    if compound_count == 0:
        base_amount = 0.0
        additional_amount = 0.0
    elif compound_count == 1:
        base_amount = (compounds[0].total_units or 0) * 0.5
        additional_amount = 0.0
    else:
        # First compound
        base_amount = (compounds[0].total_units or 0) * 0.5
        # Additional compounds
        additional_units = sum((c.total_units or 0) for c in compounds[1:])
        additional_amount = additional_units * 0.4
    
    subtotal = base_amount + additional_amount
    
    # Volume discount
    volume_discount_percent = calculate_volume_discount(compound_count)
    volume_discount = subtotal * (volume_discount_percent / 100)
    
    # First year discount (100% off first year)
    first_year_discount = subtotal if is_first_year else 0.0
    
    total_discount = volume_discount + first_year_discount
    final_amount = max(0.0, subtotal - total_discount)
    
    return {
        "base_amount": base_amount,
        "additional_amount": additional_amount,
        "subtotal": subtotal,
        "volume_discount": volume_discount,
        "first_year_discount": first_year_discount,
        "total_discount": total_discount,
        "final_amount": final_amount,
        "volume_discount_percent": volume_discount_percent,
        "compound_count": compound_count,
        "total_units": total_units
    }