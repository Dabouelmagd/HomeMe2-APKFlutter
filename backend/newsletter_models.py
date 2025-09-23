"""
Newsletter Models for HomeMe Application
Handles community newsletter management and distribution
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

class NewsletterStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

class NewsletterCategory(str, Enum):
    GENERAL = "general"
    EVENTS = "events" 
    MAINTENANCE = "maintenance"
    COMMUNITY = "community"
    ANNOUNCEMENTS = "announcements"
    SAFETY = "safety"

class NewsletterBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="Newsletter title")
    content: str = Field(..., min_length=1, description="Newsletter content (supports HTML)")
    category: NewsletterCategory = Field(default=NewsletterCategory.GENERAL, description="Newsletter category")
    summary: Optional[str] = Field(None, max_length=500, description="Brief newsletter summary")
    featured_image: Optional[str] = Field(None, description="URL to featured image")

class NewsletterCreate(NewsletterBase):
    pass

class NewsletterUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    category: Optional[NewsletterCategory] = None
    summary: Optional[str] = Field(None, max_length=500)
    featured_image: Optional[str] = None
    status: Optional[NewsletterStatus] = None

class Newsletter(NewsletterBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    author_id: str = Field(..., description="User ID of the newsletter author")
    author_name: str = Field(..., description="Name of the newsletter author")
    compound_id: str = Field(..., description="ID of the compound this newsletter belongs to")
    status: NewsletterStatus = Field(default=NewsletterStatus.DRAFT)
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    published_date: Optional[datetime] = Field(None, description="Date when newsletter was published")
    updated_date: Optional[datetime] = Field(None, description="Date when newsletter was last updated")
    views_count: int = Field(default=0, description="Number of times newsletter has been viewed")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
        use_enum_values = True

class NewsletterResponse(BaseModel):
    newsletters: List[Newsletter]
    total_count: int
    page: int
    page_size: int
    total_pages: int

class NewsletterStats(BaseModel):
    total_newsletters: int
    published_count: int
    draft_count: int
    total_views: int
    recent_newsletters: List[Newsletter]
    popular_categories: dict