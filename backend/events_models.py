# Events and Announcements System Models
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
import uuid

class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=5000)
    category: str = Field(..., pattern="^(general|maintenance|security|community|utilities|events|emergency)$")
    priority: str = Field(default="normal", pattern="^(low|normal|high|urgent)$")
    
    # Scheduling
    scheduled_for: Optional[datetime] = None  # When to publish
    expires_at: Optional[datetime] = None     # When to hide/expire
    
    # Targeting
    target_audience: str = Field(default="all", pattern="^(all|owners|tenants|specific_units)$")
    target_units: List[str] = Field(default_factory=list)  # If specific_units
    
    # Notification settings
    send_push: bool = True
    send_email: bool = False
    send_sms: bool = False
    is_emergency: bool = False
    
    # Content
    images: List[str] = Field(default_factory=list)
    attachments: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)

class EventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=5000)
    category: str = Field(..., pattern="^(social|sports|cultural|educational|health|business|religious)$")
    priority: str = Field(default="normal", pattern="^(low|normal|high|urgent)$")
    
    # Event specific details
    event_date: datetime
    event_location: Optional[str] = Field(None, max_length=200)
    max_attendees: Optional[int] = Field(None, ge=1)
    registration_deadline: Optional[datetime] = None
    registration_required: bool = False
    
    # Pricing (if applicable)
    entry_fee: Optional[float] = Field(None, ge=0)
    currency: str = Field(default="USD")
    
    # Scheduling and visibility
    scheduled_for: Optional[datetime] = None  # When to publish
    expires_at: Optional[datetime] = None     # When to hide
    
    # Targeting
    target_audience: str = Field(default="all", pattern="^(all|owners|tenants|specific_units)$")
    target_units: List[str] = Field(default_factory=list)
    
    # Notification settings
    send_push: bool = True
    send_email: bool = False
    send_sms: bool = False
    
    # Content
    images: List[str] = Field(default_factory=list)
    attachments: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    
    # Organizer details
    organizer_contact: Optional[str] = None
    external_registration_url: Optional[str] = None

class Announcement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    category: str
    priority: str = "normal"
    
    # Author and compound
    author_id: str
    author_name: str
    compound_id: str
    
    # Status and visibility
    status: str = Field(default="draft")  # draft, published, archived, expired
    is_published: bool = False
    is_featured: bool = False
    is_emergency: bool = False
    
    # Scheduling
    published_at: Optional[datetime] = None
    scheduled_for: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    # Targeting
    target_audience: str = "all"
    target_units: List[str] = Field(default_factory=list)
    views_count: int = 0
    unique_views: List[str] = Field(default_factory=list)  # User IDs who viewed
    
    # Engagement
    likes_count: int = 0
    liked_by: List[str] = Field(default_factory=list)  # User IDs
    comments_count: int = 0
    shares_count: int = 0
    bookmarks_count: int = 0
    bookmarked_by: List[str] = Field(default_factory=list)  # User IDs
    
    # Content
    images: List[str] = Field(default_factory=list)
    attachments: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    
    # Notifications
    notifications_sent: bool = False
    push_sent: bool = False
    email_sent: bool = False
    sms_sent: bool = False
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # SEO and search
    search_keywords: List[str] = Field(default_factory=list)
    slug: Optional[str] = None

class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    category: str
    priority: str = "normal"
    
    # Event details
    event_date: datetime
    event_location: Optional[str] = None
    max_attendees: Optional[int] = None
    registration_deadline: Optional[datetime] = None
    registration_required: bool = False
    
    # Pricing
    entry_fee: Optional[float] = None
    currency: str = "USD"
    
    # Author and compound
    author_id: str
    author_name: str
    compound_id: str
    
    # Status and visibility
    status: str = Field(default="draft")  # draft, published, cancelled, completed, archived
    is_published: bool = False
    is_featured: bool = False
    is_cancelled: bool = False
    cancellation_reason: Optional[str] = None
    
    # Scheduling
    published_at: Optional[datetime] = None
    scheduled_for: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    # Targeting
    target_audience: str = "all"
    target_units: List[str] = Field(default_factory=list)
    views_count: int = 0
    unique_views: List[str] = Field(default_factory=list)
    
    # Attendance and RSVP
    attendees: List[str] = Field(default_factory=list)  # User IDs who are attending
    maybe_attending: List[str] = Field(default_factory=list)  # User IDs who might attend
    not_attending: List[str] = Field(default_factory=list)  # User IDs who won't attend
    attendees_count: int = 0
    checked_in_attendees: List[str] = Field(default_factory=list)  # Who actually showed up
    
    # Engagement
    likes_count: int = 0
    liked_by: List[str] = Field(default_factory=list)
    comments_count: int = 0
    shares_count: int = 0
    bookmarks_count: int = 0
    bookmarked_by: List[str] = Field(default_factory=list)
    
    # Content
    images: List[str] = Field(default_factory=list)
    attachments: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    
    # Organizer details
    organizer_contact: Optional[str] = None
    external_registration_url: Optional[str] = None
    
    # Notifications
    notifications_sent: bool = False
    push_sent: bool = False
    email_sent: bool = False
    sms_sent: bool = False
    
    # Reminders
    reminder_sent_24h: bool = False
    reminder_sent_1h: bool = False
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Post-event
    event_summary: Optional[str] = None
    event_photos: List[str] = Field(default_factory=list)
    feedback_collected: bool = False
    avg_rating: Optional[float] = None

class EventRSVP(BaseModel):
    event_id: str
    user_id: str
    response: str = Field(..., pattern="^(attending|maybe|not_attending)$")
    guest_count: int = Field(default=0, ge=0)
    dietary_restrictions: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_id: str  # Announcement or Event ID
    item_type: str = Field(..., pattern="^(announcement|event)$")
    author_id: str
    author_name: str
    content: str = Field(..., min_length=1, max_length=1000)
    
    # Threading
    parent_comment_id: Optional[str] = None
    replies_count: int = 0
    
    # Engagement
    likes_count: int = 0
    liked_by: List[str] = Field(default_factory=list)
    
    # Status
    is_edited: bool = False
    is_deleted: bool = False
    is_pinned: bool = False
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventsAnnouncementsStats(BaseModel):
    # Announcements
    total_announcements: int = 0
    published_announcements: int = 0
    draft_announcements: int = 0
    emergency_announcements: int = 0
    
    # Events
    total_events: int = 0
    upcoming_events: int = 0
    past_events: int = 0
    cancelled_events: int = 0
    
    # Engagement
    total_views: int = 0
    total_likes: int = 0
    total_comments: int = 0
    total_shares: int = 0
    total_participants: int = 0
    engagement_rate: float = 0.0
    
    # By category (announcements)
    general_announcements: int = 0
    maintenance_announcements: int = 0
    security_announcements: int = 0
    community_announcements: int = 0
    utility_announcements: int = 0
    event_announcements: int = 0
    
    # By category (events)
    social_events: int = 0
    sports_events: int = 0
    cultural_events: int = 0
    educational_events: int = 0
    health_events: int = 0
    business_events: int = 0
    religious_events: int = 0
    
    # Performance metrics
    avg_views_per_item: float = 0.0
    avg_engagement_per_item: float = 0.0
    most_popular_category: Optional[str] = None
    peak_engagement_time: Optional[str] = None

class BulkAction(BaseModel):
    item_ids: List[str]
    action: str = Field(..., pattern="^(publish|unpublish|archive|delete|feature|unfeature)$")
    scheduled_for: Optional[datetime] = None

class ContentFilter(BaseModel):
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    search_query: Optional[str] = None
    author_id: Optional[str] = None
    tags: Optional[List[str]] = None