# Maintenance Request System Models
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import uuid

class MaintenanceRequestCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    category: str = Field(..., pattern="^(plumbing|electrical|hvac|appliance|general|cleaning|landscaping|security)$")
    priority: str = Field(..., pattern="^(low|normal|high|urgent)$")
    location: Optional[str] = Field(None, max_length=500)
    contact_method: str = Field(default="app", pattern="^(phone|email|app)$")
    preferred_time: Optional[datetime] = None

class MaintenanceRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    category: str
    priority: str
    status: str = Field(default="pending")  # pending, assigned, in_progress, completed, cancelled
    location: Optional[str] = None
    contact_method: str = "app"
    preferred_time: Optional[datetime] = None
    
    # Request details
    requester_id: str
    requester_name: str
    compound_id: str
    unit_number: Optional[str] = None
    family_id: Optional[str] = None
    
    # Assignment details
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_at: Optional[datetime] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    
    # Additional data
    images: List[str] = Field(default_factory=list)
    notes: List[Dict[str, Any]] = Field(default_factory=list)
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    
    # Rating and feedback
    rating: Optional[int] = Field(None, ge=1, le=5)
    feedback: Optional[str] = None

class MaintenanceStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(pending|assigned|in_progress|completed|cancelled)$")
    notes: Optional[str] = None
    estimated_cost: Optional[float] = None

class MaintenanceAssignment(BaseModel):
    assigned_to: str
    notes: Optional[str] = None
    estimated_completion: Optional[datetime] = None

class MaintenanceNote(BaseModel):
    author_id: str
    author_name: str
    note: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_internal: bool = False  # Internal notes not visible to requester

class MaintenanceStats(BaseModel):
    total: int = 0
    pending: int = 0
    assigned: int = 0
    in_progress: int = 0
    completed: int = 0
    cancelled: int = 0
    
    # By priority
    low_priority: int = 0
    normal_priority: int = 0
    high_priority: int = 0
    urgent_priority: int = 0
    
    # By category
    plumbing: int = 0
    electrical: int = 0
    hvac: int = 0
    appliance: int = 0
    general: int = 0
    cleaning: int = 0
    landscaping: int = 0
    security: int = 0
    
    # Performance metrics
    avg_completion_time: Optional[float] = None  # in hours
    avg_rating: Optional[float] = None
    completion_rate: float = 0.0

class MaintenanceRequestResponse(BaseModel):
    request: MaintenanceRequest
    can_edit: bool = False
    can_assign: bool = False
    can_update_status: bool = False