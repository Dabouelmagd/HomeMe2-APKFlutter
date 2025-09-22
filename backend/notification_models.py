# Real-time Notification System Models
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import uuid

class NotificationCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=1000)
    type: str = Field(..., pattern="^(maintenance|payment|system|community|general)$")
    priority: str = Field(default="normal", pattern="^(low|normal|high|urgent)$")
    recipient_id: Optional[str] = None  # If None, it's a broadcast
    action_url: Optional[str] = None
    action_text: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    message: str
    type: str
    priority: str = "normal"
    
    # Recipients
    recipient_id: Optional[str] = None  # Specific user, None for broadcast
    compound_id: str
    family_id: Optional[str] = None
    
    # Actions
    action_url: Optional[str] = None
    action_text: Optional[str] = None
    
    # Status
    is_read: bool = False
    is_sent: bool = False
    read_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str
    data: Dict[str, Any] = Field(default_factory=dict)
    
    # Delivery tracking
    delivery_status: str = Field(default="pending")  # pending, delivered, failed
    delivery_attempts: int = 0
    last_delivery_attempt: Optional[datetime] = None

class NotificationPreferences(BaseModel):
    user_id: str
    
    # Notification types
    maintenance_notifications: bool = True
    payment_notifications: bool = True
    system_notifications: bool = True
    community_notifications: bool = True
    
    # Delivery methods
    push_notifications: bool = True
    email_notifications: bool = True
    sms_notifications: bool = False
    
    # Quiet hours
    quiet_hours_enabled: bool = False
    quiet_start_time: str = "22:00"  # 24h format
    quiet_end_time: str = "08:00"
    
    # Priority filters
    only_high_priority: bool = False
    emergency_override: bool = True  # Emergency notifications ignore quiet hours
    
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationStats(BaseModel):
    total_notifications: int = 0
    unread_notifications: int = 0
    read_notifications: int = 0
    
    # By type
    maintenance_count: int = 0
    payment_count: int = 0
    system_count: int = 0
    community_count: int = 0
    
    # By priority
    low_priority_count: int = 0
    normal_priority_count: int = 0
    high_priority_count: int = 0
    urgent_priority_count: int = 0
    
    # Delivery stats
    delivered_count: int = 0
    failed_count: int = 0
    pending_count: int = 0

class PushSubscription(BaseModel):
    user_id: str
    endpoint: str
    p256dh_key: str
    auth_key: str
    user_agent: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class BulkNotificationCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=1000)
    type: str = Field(..., pattern="^(maintenance|payment|system|community|general)$")
    priority: str = Field(default="normal", pattern="^(low|normal|high|urgent)$")
    
    # Targeting
    target_type: str = Field(..., pattern="^(all|compound|family|unit|role|specific)$")
    target_ids: List[str] = Field(default_factory=list)  # IDs based on target_type
    
    # Scheduling
    send_immediately: bool = True
    scheduled_for: Optional[datetime] = None
    
    # Actions
    action_url: Optional[str] = None
    action_text: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)

class NotificationTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    title_template: str
    message_template: str
    type: str
    priority: str = "normal"
    
    # Template variables
    variables: List[str] = Field(default_factory=list)
    sample_data: Dict[str, Any] = Field(default_factory=dict)
    
    # Usage tracking
    usage_count: int = 0
    last_used: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str
    is_active: bool = True

# WebSocket message types
class WebSocketMessage(BaseModel):
    type: str
    data: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationWebSocketMessage(WebSocketMessage):
    type: str = "new_notification"
    notification: Notification