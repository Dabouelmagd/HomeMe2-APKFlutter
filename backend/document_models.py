from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

# Document Management Models

class DocumentType(str):
    GENERAL = "general"
    FINANCIAL = "financial"
    LEGAL = "legal"
    MAINTENANCE = "maintenance"
    GOVERNANCE = "governance"
    RESIDENTS = "residents"
    CONTRACTS = "contracts"
    POLICIES = "policies"

class DocumentAccess(str):
    PUBLIC = "public"         # All compound residents
    ADMIN_ONLY = "admin_only" # Only admins
    FAMILY_ONLY = "family_only" # Only specific family
    RESIDENTS_ONLY = "residents_only" # All residents but not specific family
    COMMITTEE = "committee"   # Committee members only

class DocumentVersion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    version_number: int
    file_url: str
    file_name: str
    file_size: int
    mime_type: str
    uploaded_by: str
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    changelog: Optional[str] = None
    is_current: bool = True

class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    title: str
    description: Optional[str] = None
    category: str  # DocumentType values
    subcategory: Optional[str] = None
    tags: List[str] = []
    
    # Access Control
    access_level: str = DocumentAccess.PUBLIC
    allowed_families: List[str] = []  # Specific family IDs if family_only
    allowed_users: List[str] = []     # Specific user IDs for custom access
    
    # File Management
    current_version: int = 1
    versions: List[DocumentVersion] = []
    
    # Metadata
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Status
    is_active: bool = True
    is_pinned: bool = False
    is_archived: bool = False
    
    # Analytics
    view_count: int = 0
    download_count: int = 0
    last_accessed: Optional[datetime] = None

class DocumentFolder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    name: str
    description: Optional[str] = None
    parent_folder_id: Optional[str] = None  # For nested folders
    path: str  # Full path like "/Governance/Bylaws"
    
    # Access Control (inherited by documents unless overridden)
    default_access_level: str = DocumentAccess.PUBLIC
    
    # Metadata
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Status
    is_active: bool = True
    sort_order: int = 0

class DocumentComment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_id: str
    user_id: str
    content: str
    parent_comment_id: Optional[str] = None  # For replies
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_edited: bool = False
    is_deleted: bool = False

class DocumentAccessLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    document_id: str
    user_id: str
    access_type: str  # view, download, comment, edit
    accessed_at: datetime = Field(default_factory=datetime.utcnow)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

# Voting & Polling System Models

class VoteType(str):
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"
    YES_NO = "yes_no"
    RATING = "rating"
    RANKING = "ranking"

class VotingStatus(str):
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"
    CANCELLED = "cancelled"

class PollOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    vote_count: int = 0
    sort_order: int = 0

class Vote(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    poll_id: str
    user_id: str
    family_id: str
    unit_number: str
    selected_options: List[str] = []  # Option IDs
    rating_value: Optional[int] = None  # For rating votes (1-5 or 1-10)
    ranking_order: List[str] = []  # Option IDs in ranked order
    comment: Optional[str] = None
    voted_at: datetime = Field(default_factory=datetime.utcnow)
    is_anonymous: bool = False

class Poll(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    title: str
    description: str
    vote_type: str  # VoteType values
    
    # Options
    options: List[PollOption] = []
    allow_other_option: bool = False
    max_selections: Optional[int] = None  # For multiple choice
    min_selections: Optional[int] = 1
    
    # Voting Rules
    require_family_head_only: bool = True  # Only family heads can vote
    allow_anonymous_voting: bool = False
    allow_vote_change: bool = False
    require_comment: bool = False
    
    # Timing
    start_date: datetime
    end_date: datetime
    timezone: str = "UTC"
    
    # Eligibility
    eligible_families: List[str] = []  # Empty means all families
    eligible_users: List[str] = []     # Specific users if not family-based
    min_participation_rate: Optional[float] = None  # Minimum % for valid poll
    
    # Results
    total_votes: int = 0
    total_eligible_voters: int = 0
    participation_rate: float = 0.0
    results_visible_before_end: bool = False
    results_published: bool = False
    
    # Status
    status: str = VotingStatus.DRAFT
    
    # Metadata
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Smart Home Integration Models

class DeviceType(str):
    LIGHT = "light"
    LOCK = "lock"
    THERMOSTAT = "thermostat"
    CAMERA = "camera"
    SENSOR = "sensor"
    APPLIANCE = "appliance"
    SWITCH = "switch"
    DIMMER = "dimmer"
    GARAGE_DOOR = "garage_door"
    SPRINKLER = "sprinkler"

class DeviceStatus(str):
    ONLINE = "online"
    OFFLINE = "offline"
    ERROR = "error"
    MAINTENANCE = "maintenance"

class SmartDevice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    family_id: Optional[str] = None  # None for common area devices
    unit_number: Optional[str] = None
    location: str  # Room or area name
    
    # Device Info
    name: str
    device_type: str  # DeviceType values
    brand: str
    model: str
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    firmware_version: Optional[str] = None
    
    # Connection
    protocol: str  # mqtt, http, websocket, etc.
    endpoint: str  # Connection endpoint or topic
    auth_token: Optional[str] = None
    
    # Status
    status: str = DeviceStatus.OFFLINE
    last_seen: Optional[datetime] = None
    battery_level: Optional[int] = None
    signal_strength: Optional[int] = None
    
    # Current State
    current_state: Dict[str, Any] = {}  # Device-specific state (on/off, temperature, etc.)
    target_state: Dict[str, Any] = {}   # Desired state
    capabilities: List[str] = []        # What the device can do (on/off, dim, temperature, etc.)
    
    # Access Control
    controlled_by: List[str] = []  # User IDs who can control this device
    viewable_by: List[str] = []    # User IDs who can view this device
    
    # Metadata
    installed_by: str
    installed_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Configuration
    is_active: bool = True
    is_shared: bool = False  # Can other families see/control
    auto_discovery: bool = True
    notifications_enabled: bool = True

class DeviceAutomation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    family_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    
    # Trigger
    trigger_type: str  # time, sensor, device_state, manual, geofence
    trigger_conditions: Dict[str, Any] = {}
    
    # Actions
    device_actions: List[Dict[str, Any]] = []  # Device ID and action to perform
    notification_actions: List[Dict[str, Any]] = []
    
    # Schedule
    is_scheduled: bool = False
    schedule_expression: Optional[str] = None  # Cron-like expression
    timezone: str = "UTC"
    
    # Status
    is_active: bool = True
    is_running: bool = False
    last_executed: Optional[datetime] = None
    execution_count: int = 0
    
    # Metadata
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class DeviceLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_id: str
    compound_id: str
    
    # Event Info
    event_type: str  # state_change, command, error, connection
    old_state: Optional[Dict[str, Any]] = None
    new_state: Optional[Dict[str, Any]] = None
    command: Optional[str] = None
    
    # User Context
    triggered_by: Optional[str] = None  # User ID if manually triggered
    automation_id: Optional[str] = None  # If triggered by automation
    
    # Metadata
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    success: bool = True
    error_message: Optional[str] = None

# Request/Response Models

# Document Management
class DocumentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    tags: List[str] = []
    access_level: str = DocumentAccess.PUBLIC
    allowed_families: List[str] = []
    allowed_users: List[str] = []
    folder_id: Optional[str] = None
    is_pinned: bool = False

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    tags: Optional[List[str]] = None
    access_level: Optional[str] = None
    allowed_families: Optional[List[str]] = None
    allowed_users: Optional[List[str]] = None
    is_pinned: Optional[bool] = None
    is_archived: Optional[bool] = None

class DocumentFolderCreate(BaseModel):
    name: str
    description: Optional[str] = None
    parent_folder_id: Optional[str] = None
    default_access_level: str = DocumentAccess.PUBLIC

class DocumentCommentCreate(BaseModel):
    content: str
    parent_comment_id: Optional[str] = None

# Voting & Polling
class PollCreate(BaseModel):
    title: str
    description: str
    vote_type: str
    options: List[Dict[str, Any]]  # {text, description?, image_url?}
    allow_other_option: bool = False
    max_selections: Optional[int] = None
    min_selections: int = 1
    require_family_head_only: bool = True
    allow_anonymous_voting: bool = False
    allow_vote_change: bool = False
    require_comment: bool = False
    start_date: datetime
    end_date: datetime
    eligible_families: List[str] = []
    results_visible_before_end: bool = False

class VoteCreate(BaseModel):
    selected_options: List[str] = []
    rating_value: Optional[int] = None
    ranking_order: List[str] = []
    comment: Optional[str] = None
    is_anonymous: bool = False

# Smart Home Integration
class SmartDeviceCreate(BaseModel):
    name: str
    device_type: str
    brand: str
    model: str
    location: str
    family_id: Optional[str] = None
    unit_number: Optional[str] = None
    protocol: str = "http"
    endpoint: str
    auth_token: Optional[str] = None
    capabilities: List[str] = []
    is_shared: bool = False

class DeviceCommand(BaseModel):
    command: str
    parameters: Dict[str, Any] = {}
    
class DeviceAutomationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    family_id: Optional[str] = None
    trigger_type: str
    trigger_conditions: Dict[str, Any] = {}
    device_actions: List[Dict[str, Any]] = []
    notification_actions: List[Dict[str, Any]] = []
    is_scheduled: bool = False
    schedule_expression: Optional[str] = None