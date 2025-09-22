# Guest Management System Models
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr
import uuid

class VisitRequestCreate(BaseModel):
    visitor_name: str = Field(..., min_length=1, max_length=100)
    visitor_phone: str = Field(..., min_length=1, max_length=20)
    visitor_email: Optional[EmailStr] = None
    visitor_id_number: Optional[str] = Field(None, max_length=50)
    visit_purpose: str = Field(..., pattern="^(family_visit|business_meeting|delivery|maintenance|healthcare|social_event|other)$")
    visit_date: datetime
    duration_hours: int = Field(default=2, ge=1, le=24)
    unit_number: str = Field(..., min_length=1, max_length=20)
    host_name: str = Field(..., min_length=1, max_length=100)
    host_phone: str = Field(..., min_length=1, max_length=20)
    special_instructions: Optional[str] = Field(None, max_length=500)
    vehicle_plate: Optional[str] = Field(None, max_length=20)
    escort_required: bool = False
    pre_approved: bool = False

class VisitRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    visitor_name: str
    visitor_phone: str
    visitor_email: Optional[str] = None
    visitor_id_number: Optional[str] = None
    
    # Visit details
    visit_purpose: str
    visit_date: datetime
    duration_hours: int = 2
    unit_number: str
    host_name: str
    host_phone: str
    special_instructions: Optional[str] = None
    vehicle_plate: Optional[str] = None
    escort_required: bool = False
    
    # Status and approval
    status: str = Field(default="pending")  # pending, approved, rejected, expired
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejected_by: Optional[str] = None
    rejected_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    # Request metadata
    requested_by: str  # User ID who created the request
    compound_id: str
    family_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # QR Code and security
    qr_code_data: Optional[str] = None
    security_notes: Optional[str] = None

class Guest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    # From approved visit request
    visit_request_id: str
    visitor_name: str
    visitor_phone: str
    visitor_email: Optional[str] = None
    visitor_id_number: Optional[str] = None
    
    # Visit details
    visit_purpose: str
    visit_date: datetime
    duration_hours: int
    unit_number: str
    host_name: str
    host_phone: str
    vehicle_plate: Optional[str] = None
    escort_required: bool = False
    
    # Check-in/out tracking
    status: str = Field(default="approved")  # approved, checked_in, checked_out, expired
    checked_in_at: Optional[datetime] = None
    checked_out_at: Optional[datetime] = None
    checked_in_by: Optional[str] = None  # Security personnel
    checked_out_by: Optional[str] = None  # Security personnel
    
    # Location and access
    current_location: Optional[str] = None  # If tracked
    access_points: List[str] = Field(default_factory=list)  # Areas they can access
    escort_assigned: Optional[str] = None  # Escort person if required
    
    # Security and identification
    photo_url: Optional[str] = None  # Photo taken at check-in
    id_verification_status: str = Field(default="pending")  # pending, verified, failed
    visitor_badge_number: Optional[str] = None
    
    # Metadata
    compound_id: str
    family_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Notes and logs
    security_notes: Optional[str] = None
    visit_logs: List[Dict[str, Any]] = Field(default_factory=list)  # Activity log

class GuestCheckIn(BaseModel):
    guest_id: str
    photo: Optional[str] = None  # Base64 encoded photo
    id_verification: bool = False
    security_notes: Optional[str] = None
    escort_assigned: Optional[str] = None

class GuestCheckOut(BaseModel):
    guest_id: str
    security_notes: Optional[str] = None
    incidents: Optional[str] = None

class VisitRequestApproval(BaseModel):
    request_id: str
    approved: bool
    notes: Optional[str] = None
    access_restrictions: Optional[List[str]] = None
    escort_required: Optional[bool] = None

class GuestStats(BaseModel):
    total_visitors: int = 0
    pending_approvals: int = 0
    active_visits: int = 0
    todays_visits: int = 0
    
    # By purpose
    family_visits: int = 0
    business_meetings: int = 0
    deliveries: int = 0
    maintenance_visits: int = 0
    healthcare_visits: int = 0
    social_events: int = 0
    other_visits: int = 0
    
    # Performance metrics
    avg_approval_time: Optional[float] = None  # in hours
    avg_visit_duration: Optional[float] = None  # in hours
    approval_rate: float = 0.0
    
    # Security metrics
    security_incidents: int = 0
    id_verification_rate: float = 0.0
    escort_usage_rate: float = 0.0

class VisitLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    guest_id: str
    action: str  # check_in, check_out, location_update, access_granted, access_denied
    location: Optional[str] = None
    details: Optional[str] = None
    performed_by: Optional[str] = None  # User ID of person who performed action
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Dict[str, Any] = Field(default_factory=dict)

class GuestFilter(BaseModel):
    status: Optional[str] = None
    visit_purpose: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    unit_number: Optional[str] = None
    search_query: Optional[str] = None