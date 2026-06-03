from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, WebSocket, WebSocketDisconnect, Form, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any
import qrcode
import io
import base64
from datetime import datetime, timedelta, date
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import uuid
import jwt
import bcrypt
import json
import base64
import mimetypes
import aiofiles
import asyncio
import wave
import struct
import re
# import numpy as np  # Removed to reduce deployment size
from io import BytesIO
from PIL import Image
from datetime import timezone
import httpx
import shutil
from passlib.context import CryptContext
from dotenv import load_dotenv
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Rate limiter for API security
limiter = Limiter(key_func=get_remote_address)

# Import our new models and utilities
from maintenance_models import *
from notification_models import *
from document_models import *
from newsletter_models import *
from enterprise_models import *
from individual_models import *
from websocket_manager import manager
from webauthn_service import WebAuthnService, WebAuthnRegisterOptions, WebAuthnRegisterVerify, WebAuthnLoginOptions, WebAuthnLoginVerify

# Import emergent integrations for LLM
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Import Stripe integration from emergentintegrations
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

# Import subscription models and code generator
from subscription_models import *
from code_generator import HomeCodeGenerator

# Import monitoring and activity logging
from monitoring import MonitoringService
from activity_logger import ActivityLogger, ErrorLogger

# Import subscription codes manager
from subscription_codes import SubscriptionCodeManager

# Import email service
from email_service import email_service

# Import push notification service
from push_notification_service import PushNotificationService, get_vapid_public_key

# Import reminder service
from reminder_service import PaymentReminderService, run_reminder_scheduler

# Import PDF report service
from pdf_report_service import PDFReportService

# Import facility booking service
from facility_booking_service import FacilityBookingService, DEFAULT_FACILITIES

# Import financial models
from financial_models import (
    ExpenseCreate, Expense, RevenueCreate, Revenue,
    ResidentCharge, ResidentPayment, ResidentAccountSummary,
    MonthlyReport, FinancialSummary,
    ExpenseCategory, RevenueSource, PaymentMethod, TransactionStatus
)

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
client = None
db = None

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24  # 24 hours (reduced from 7 days for better security)

# Backend URL Configuration
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:8000')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app
app = FastAPI(title="HomeMe API", description="Compound Management System")
api_router = APIRouter(prefix="/api")

# NOTE: CORS middleware is registered LATER in the file (around line 2325)
# with a strict ALLOWED_ORIGINS list. The previous middleware here used
# `allow_origins=*` together with `allow_credentials=True`, which violates the
# CORS spec — browsers silently drop responses that combine both, causing
# axios POST requests (e.g. /api/auth/login) to hang in production while
# direct fetch() and curl still appear to work. The duplicate middleware was
# removed to fix the login-button-stuck-on-loading bug. See IMPORTANT note in
# /app/memory/PRD.md (Iter 78).

# Add rate limiter to app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Password strength validation function
def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character
    """
    if len(password) < 8:
        return False, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
    if not re.search(r'[A-Z]', password):
        return False, "كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل"
    if not re.search(r'[a-z]', password):
        return False, "كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل"
    if not re.search(r'\d', password):
        return False, "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*)"
    return True, ""

# Create uploads directory
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# File size limits (in bytes)
MAX_FILE_SIZES = {
    "image": 10 * 1024 * 1024,  # 10MB
    "video": 50 * 1024 * 1024,  # 50MB
    "audio": 25 * 1024 * 1024,  # 25MB
    "document": 20 * 1024 * 1024,  # 20MB
}

# Allowed file extensions
ALLOWED_EXTENSIONS = {
    "image": {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"},
    "video": {".mp4", ".mov", ".avi", ".mkv", ".webm", ".flv"},
    "audio": {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac", ".webm"},
    "voice": {".wav", ".webm", ".mp3", ".m4a", ".ogg"},
    "document": {".pdf", ".doc", ".docx", ".txt", ".rtf", ".xls", ".xlsx", ".ppt", ".pptx"}
}

# Mount static files for serving uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Security
security = HTTPBearer()

# WebSocket connections manager is imported from websocket_manager

# Pydantic Models
class UserRole(str):
    APP_OWNER = "app_owner"  # App owner - controls everything, all subscribers
    SUPER_ADMIN = "super_admin"  # Top compound admin - manages compound(s)
    COMPANY_ADMIN = "company_admin"  # Company with multiple compounds
    ADMIN = "admin"  # Compound admin
    MANAGER = "manager"  # Staff/Manager - follows up residents, complaints, maintenance
    SECURITY = "security"  # Gate access, visitors, delivery
    RESIDENT = "resident"  # Regular resident

class PaymentStatus(str):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"

class UtilityType(str):
    WATER = "water"
    ELECTRICITY = "electricity"
    TELEPHONE = "telephone"
    GAS = "gas"
    INTERNET = "internet"

class UtilityBill(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    family_id: str
    unit_number: str
    utility_type: str  # water, electricity, telephone, gas, internet
    provider_name: str
    account_number: str
    billing_period: str  # "2024-01", "Q1-2024", etc.
    issue_date: datetime
    due_date: datetime
    amount: float
    previous_reading: Optional[float] = None
    current_reading: Optional[float] = None
    consumption: Optional[float] = None
    unit_price: Optional[float] = None
    status: str = PaymentStatus.PENDING
    government_reference: str
    payment_method: Optional[str] = None
    payment_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UtilityConnection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    family_id: str
    unit_number: str
    utility_type: str
    provider_name: str
    account_number: str
    meter_number: Optional[str] = None
    connection_date: datetime
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UtilityPayment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    bill_id: str
    family_id: str
    amount: float
    payment_method: str = "mock"
    government_transaction_id: str
    homeMe_transaction_id: str
    payment_date: datetime = Field(default_factory=datetime.utcnow)
    status: str = PaymentStatus.PAID

# Request/Response Models for Utilities
class UtilityConnectionCreate(BaseModel):
    utility_type: str
    provider_name: str
    account_number: str
    meter_number: Optional[str] = None

class UtilityBillCreate(BaseModel):
    family_id: str
    unit_number: str
    utility_type: str
    provider_name: str
    account_number: str
    billing_period: str
    issue_date: datetime
    due_date: datetime
    amount: float
    previous_reading: Optional[float] = None
    current_reading: Optional[float] = None
    government_reference: str

class ServiceCategory(str):
    MEDICAL = "medical"
    MAINTENANCE = "maintenance"
    SECURITY = "security"
    CLEANING = "cleaning"
    OTHER = "other"

class ServiceStatus(str):
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"

class Service(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    name: str
    category: str  # medical, maintenance, security, cleaning, other
    specialty: Optional[str] = None  # carpenter, plumber, electrician, etc.
    description: str
    phone: Optional[str] = None
    email: Optional[str] = None
    working_hours: str = "9:00 AM - 6:00 PM"
    status: str = ServiceStatus.AVAILABLE
    rating: float = 0.0
    total_reviews: int = 0
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ServiceBooking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    service_id: str
    resident_id: str
    compound_id: str
    unit_number: str
    issue_description: str
    preferred_date: datetime
    preferred_time: str
    status: str = "pending"  # pending, confirmed, in_progress, completed, cancelled
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ServiceReview(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    service_id: str
    booking_id: str
    resident_id: str
    rating: int  # 1-5 stars
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Request/Response Models for Services
class ServiceCreate(BaseModel):
    name: str
    category: str
    specialty: Optional[str] = None
    description: str
    phone: Optional[str] = None
    email: Optional[str] = None
    working_hours: str = "9:00 AM - 6:00 PM"

class ServiceBookingCreate(BaseModel):
    service_id: str
    issue_description: str
    preferred_date: datetime
    preferred_time: str
    notes: Optional[str] = None

class ServiceReviewCreate(BaseModel):
    booking_id: str
    service_id: str
    rating: int
    comment: Optional[str] = None

class MessageType(str):
    MAINTENANCE_REQUEST = "maintenance_request"
    COMPLAINT = "complaint"
    GENERAL = "general"

# Database Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    password_hash: str
    role: str  # admin or resident
    compound_id: str
    family_id: Optional[str] = None
    full_name: str
    phone: Optional[str] = None
    unit_number: Optional[str] = None
    is_family_head: bool = False
    profile_picture_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class Compound(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    logo_url: Optional[str] = None
    address: str
    admin_id: str  # Primary admin
    additional_admins: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    settings: Dict[str, Any] = {}

class Family(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    unit_number: str
    head_user_id: str
    members: List[str] = []  # List of user IDs
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MaintenanceFee(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    unit_number: str
    amount: float
    due_date: datetime
    description: str
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Invoice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    family_id: str
    unit_number: str
    amount: float
    description: str
    due_date: datetime
    status: str = PaymentStatus.PENDING
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Payment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_id: str
    family_id: str
    amount: float
    payment_method: str = "mock"
    transaction_id: str
    status: str = PaymentStatus.PAID
    paid_at: datetime = Field(default_factory=datetime.utcnow)

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    sender_id: str
    message_type: str
    subject: str
    content: str
    attachments: List[str] = []  # List of file URLs
    status: str = "open"  # open, in_progress, resolved
    created_at: datetime = Field(default_factory=datetime.utcnow)
    responses: List[Dict[str, Any]] = []

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    sender_id: str
    recipient_ids: List[str] = []  # Empty means all compound residents
    title: str
    content: str
    is_read: Dict[str, bool] = {}  # user_id: read_status
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Chat Models
class ChatType(str):
    DIRECT = "direct"
    GROUP = "group"
    COMPOUND_WIDE = "compound_wide"

class Chat(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    chat_type: str  # direct, group, compound_wide
    name: Optional[str] = None  # For group chats
    description: Optional[str] = None
    participants: List[str] = []  # List of user IDs
    admin_ids: List[str] = []  # Chat admins (for group chats)
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    last_message_at: Optional[datetime] = None

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chat_id: str
    sender_id: str
    content: str
    message_type: str = "text"  # text, image, video, audio, voice, file
    attachments: List[Dict[str, Any]] = []  # List of attachment metadata
    voice_duration: Optional[float] = None  # Duration in seconds for voice messages
    voice_waveform: Optional[List[float]] = None  # Waveform data for voice messages
    reply_to: Optional[str] = None  # Message ID if replying
    reactions: Dict[str, List[str]] = {}  # emoji -> list of user IDs
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    read_by: Dict[str, datetime] = {}  # user_id: read_timestamp
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatParticipant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chat_id: str
    user_id: str
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    last_read_at: Optional[datetime] = None
    is_admin: bool = False
    is_active: bool = True

class PushSubscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    endpoint: str
    p256dh: str  # Public key
    auth: str    # Auth secret
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class NotificationPreferences(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    push_enabled: bool = True
    message_notifications: bool = True
    group_notifications: bool = True
    direct_notifications: bool = True
    compound_notifications: bool = True
    quiet_hours_enabled: bool = False
    quiet_hours_start: str = "22:00"  # 24-hour format
    quiet_hours_end: str = "08:00"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Request/Response Models
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str
    compound_id: Optional[str] = ""
    full_name: str
    phone: Optional[str] = None
    unit_number: Optional[str] = None
    subscription_code: Optional[str] = None

# Subscription Code Models
class SubscriptionCode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    duration_months: int  # 3, 6, 12, or -1 for lifetime
    is_active: bool = True
    used_by: Optional[str] = None  # user_id who used the code
    used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None  # admin who created it
    description: Optional[str] = None

class SubscriptionCodeCreate(BaseModel):
    code: str
    duration_months: int  # 3, 6, 12, or -1 for lifetime
    description: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class CompoundCreate(BaseModel):
    name: str
    address: str

class FamilyMemberAdd(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None

class MaintenanceFeeCreate(BaseModel):
    unit_number: str
    amount: float
    due_date: datetime
    description: str

class InvoiceCreate(BaseModel):
    family_id: str
    unit_number: str
    amount: float
    description: str
    due_date: datetime

class MessageCreate(BaseModel):
    message_type: str
    subject: str
    content: str

class NotificationCreate(BaseModel):
    title: str
    content: str
    recipient_ids: Optional[List[str]] = None

class PaymentCreate(BaseModel):
    invoice_id: str
    payment_method: str = "mock"

# Chat Request/Response Models
class ChatCreate(BaseModel):
    chat_type: str  # direct, group, compound_wide
    name: Optional[str] = None
    description: Optional[str] = None
    participant_ids: List[str] = []

class ChatMessageCreate(BaseModel):
    content: str
    message_type: str = "text"
    reply_to: Optional[str] = None

class ChatMessageUpdate(BaseModel):
    content: str

class ChatUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class AddParticipantsRequest(BaseModel):
    participant_ids: List[str]

class MessageReactionRequest(BaseModel):
    emoji: str  # The emoji/reaction to add or remove

class PushSubscriptionRequest(BaseModel):
    endpoint: str
    keys: Dict[str, str]  # Contains p256dh and auth keys

class NotificationPreferencesUpdate(BaseModel):
    push_enabled: Optional[bool] = None
    message_notifications: Optional[bool] = None
    group_notifications: Optional[bool] = None
    direct_notifications: Optional[bool] = None
    compound_notifications: Optional[bool] = None
    quiet_hours_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None

# Search Models
class SearchHistory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    query: str
    search_type: str = "text"  # text, advanced, file, user
    filters: Dict[str, Any] = {}
    results_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SavedSearch(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    query: str
    search_type: str = "text"
    filters: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SearchRequest(BaseModel):
    query: str
    search_type: str = "text"  # text, advanced, file, user
    chat_ids: Optional[List[str]] = None
    sender_ids: Optional[List[str]] = None
    message_types: Optional[List[str]] = None  # text, image, video, audio, voice, file
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    file_types: Optional[List[str]] = None  # image, video, audio, document
    limit: int = 50
    skip: int = 0
    sort_by: str = "created_at"  # created_at, relevance
    sort_order: str = "desc"  # asc, desc

class SavedSearchRequest(BaseModel):
    name: str
    query: str
    search_type: str = "text"
    filters: Dict[str, Any] = {}

# File Gallery Models
class FileGalleryFilter(BaseModel):
    file_types: Optional[List[str]] = None  # image, video, audio, document, voice
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    chat_ids: Optional[List[str]] = None
    sender_ids: Optional[List[str]] = None
    sort_by: str = "uploaded_at"  # uploaded_at, file_size, filename
    sort_order: str = "desc"  # asc, desc
    limit: int = 50
    skip: int = 0

# Message Scheduling Models
class ScheduledMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chat_id: str
    sender_id: str
    content: str
    message_type: str = "text"
    attachments: List[Dict[str, Any]] = []
    scheduled_for: datetime
    timezone: str = "UTC"
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None  # daily, weekly, monthly
    recurrence_end: Optional[datetime] = None
    status: str = "pending"  # pending, sent, cancelled, failed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None

class ScheduledMessageCreate(BaseModel):
    content: str
    message_type: str = "text"
    scheduled_for: datetime
    timezone: str = "UTC"
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    recurrence_end: Optional[datetime] = None

class ScheduledMessageUpdate(BaseModel):
    content: Optional[str] = None
    scheduled_for: Optional[datetime] = None
    timezone: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_pattern: Optional[str] = None
    recurrence_end: Optional[datetime] = None

class FileAttachment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_filename: str
    file_type: str  # image, video, audio, document
    file_size: int
    mime_type: str
    file_url: str
    thumbnail_url: Optional[str] = None
    duration: Optional[float] = None  # For audio/video files
    width: Optional[int] = None  # For images/videos
    height: Optional[int] = None  # For images/videos
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

# Enhanced Service Management Models
class ServiceProvider(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    full_name: str
    email: str
    phone: str
    services: List[str]  # List of service categories they provide
    specialties: List[str]  # Specific specialties within categories
    compound_id: str
    profile_image: Optional[str] = None
    bio: Optional[str] = None
    hourly_rate: Optional[float] = None
    availability: Dict[str, List[str]] = {}  # Day -> List of time slots
    is_active: bool = True
    is_verified: bool = False
    average_rating: float = 0.0
    total_reviews: int = 0
    total_jobs_completed: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ServiceBooking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    resident_id: str
    provider_id: str
    compound_id: str
    service_category: str
    service_specialty: str
    title: str
    description: str
    priority: str = "standard"  # emergency, urgent, standard, scheduled
    scheduled_date: Optional[date] = None
    scheduled_time: Optional[str] = None
    scheduled_end_time: Optional[str] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None  # weekly, monthly
    recurrence_end: Optional[date] = None
    estimated_duration: Optional[int] = None  # in minutes
    estimated_cost: Optional[float] = None
    final_cost: Optional[float] = None
    payment_method: str = "pending"  # card, bank_transfer, instapay, cash, mobile_pay, digital_wallet, qr_code
    payment_status: str = "pending"  # pending, paid, failed, refunded
    payment_id: Optional[str] = None
    status: str = "pending"  # pending, confirmed, in_progress, completed, cancelled
    booking_notes: Optional[str] = None
    completion_notes: Optional[str] = None
    before_photos: List[str] = []
    after_photos: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class ServiceReview(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    resident_id: str
    provider_id: str
    compound_id: str
    overall_rating: int  # 1-5 stars
    quality_rating: int  # 1-5 stars
    punctuality_rating: int  # 1-5 stars
    professionalism_rating: int  # 1-5 stars
    value_rating: int  # 1-5 stars
    would_recommend: bool
    written_review: Optional[str] = None
    review_photos: List[str] = []
    is_public: bool = True
    is_moderated: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    resident_id: str
    provider_id: str
    compound_id: str
    amount: float
    currency: str = "USD"
    payment_method: str
    payment_provider: Optional[str] = None  # stripe, paypal, instapay, etc.
    transaction_id: Optional[str] = None
    status: str = "pending"  # pending, processing, completed, failed, refunded
    failure_reason: Optional[str] = None
    metadata: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Request/Response Models
class ServiceProviderCreate(BaseModel):
    full_name: str
    email: str
    phone: str
    services: List[str]
    specialties: List[str]
    bio: Optional[str] = None
    hourly_rate: Optional[float] = None

class ServiceBookingCreate(BaseModel):
    provider_id: str
    service_category: str
    service_specialty: str
    title: str
    description: str
    priority: str = "standard"
    scheduled_date: Optional[date] = None
    scheduled_time: Optional[str] = None
    scheduled_end_time: Optional[str] = None
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None
    recurrence_end: Optional[date] = None
    estimated_duration: Optional[int] = None
    payment_method: str = "cash"
    booking_notes: Optional[str] = None

class ServiceReviewCreate(BaseModel):
    overall_rating: int
    quality_rating: int
    punctuality_rating: int
    professionalism_rating: int
    value_rating: int
    would_recommend: bool
    written_review: Optional[str] = None
    is_public: bool = True

class BookingStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    final_cost: Optional[float] = None

class PaymentRequest(BaseModel):
    payment_method: str
    amount: float
    currency: str = "USD"
    metadata: Dict[str, Any] = {}

# Family Management Models
class FamilyMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    unit_id: str
    compound_id: str
    primary_resident_id: str  # The account holder who manages this family member
    full_name: str
    age: int
    birthday: Optional[date] = None
    relationship: str  # father, mother, son, daughter, brother, sister, spouse, etc.
    phone: Optional[str] = None
    email: Optional[str] = None
    id_number: Optional[str] = None  # Government ID/Passport number
    unit_number: str
    profile_image: Optional[str] = None
    is_active: bool = True
    qr_code: Optional[str] = None  # QR code for gate access
    qr_code_expires: Optional[datetime] = None  # Optional expiry for QR codes
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    move_in_date: Optional[date] = None
    move_out_date: Optional[date] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class GateAccess(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    family_member_id: str
    unit_id: str
    compound_id: str
    access_type: str = "entry"  # entry, exit
    gate_location: Optional[str] = None
    access_granted: bool = True
    access_time: datetime = Field(default_factory=datetime.utcnow)
    security_guard_id: Optional[str] = None
    notes: Optional[str] = None

# Request/Response Models for Family Management
class FamilyMemberCreate(BaseModel):
    full_name: str
    age: int
    birthday: Optional[date] = None
    relationship: str
    phone: Optional[str] = None
    email: Optional[str] = None
    id_number: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    move_in_date: Optional[date] = None

class FamilyMemberUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    birthday: Optional[date] = None
    relationship: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    id_number: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    move_in_date: Optional[date] = None
    move_out_date: Optional[date] = None
    is_active: Optional[bool] = None

# Free Trial System Models
class TrialPlan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    duration_days: int
    max_users: int
    max_families: int
    max_services: int
    max_storage_mb: int
    features: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserTrial(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    compound_id: str
    trial_plan_id: str
    start_date: datetime = Field(default_factory=datetime.utcnow)
    end_date: datetime
    is_active: bool = True
    is_expired: bool = False
    usage_stats: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TrialUsage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_trial_id: str
    feature: str  # users, families, services, storage, messages, etc.
    current_usage: int
    limit: int
    last_updated: datetime = Field(default_factory=datetime.utcnow)

# Request/Response Models for Free Trial
class TrialActivationRequest(BaseModel):
    trial_plan_id: str

class TrialStatusResponse(BaseModel):
    is_trial: bool
    trial_active: bool
    days_remaining: int
    trial_plan: Optional[Dict[str, Any]] = None
    usage: Dict[str, Any] = {}
    limits: Dict[str, Any] = {}

class QRCodeRequest(BaseModel):
    family_member_id: str
    expires_in_hours: int = 24  # Default 24 hours validity

def serialize_datetime(obj):
    """Convert datetime objects, date objects, and ObjectIds to JSON serializable format"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, date):
        return obj.isoformat()
    elif hasattr(obj, '__class__') and obj.__class__.__name__ == 'ObjectId':
        return str(obj)
    elif isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_datetime(item) for item in obj]
    return obj

def get_file_type(filename: str) -> str:
    """Determine file type based on extension"""
    ext = Path(filename).suffix.lower()
    for file_type, extensions in ALLOWED_EXTENSIONS.items():
        if ext in extensions:
            return file_type
    return "document"

def is_allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    ext = Path(filename).suffix.lower()
    for extensions in ALLOWED_EXTENSIONS.values():
        if ext in extensions:
            return True
    return False

def generate_unique_filename(original_filename: str) -> str:
    """Generate unique filename while preserving extension"""
    name, ext = Path(original_filename).stem, Path(original_filename).suffix
    unique_name = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
    return unique_name

def generate_qr_code(data: str) -> str:
    """Generate QR code and return as base64 encoded string"""
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        # Create QR code image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"
    except Exception as e:
        logging.error(f"Error generating QR code: {e}")
        return None

def create_gate_access_token(family_member_id: str, unit_id: str, compound_id: str, expires_at: datetime) -> str:
    """Create a secure token for gate access"""
    token_data = {
        "family_member_id": family_member_id,
        "unit_id": unit_id,
        "compound_id": compound_id,
        "expires_at": expires_at.isoformat(),
        "issued_at": datetime.now(timezone.utc).isoformat()
    }
    # In production, this should be signed/encrypted
    import json
    return base64.b64encode(json.dumps(token_data).encode()).decode()

def generate_waveform_data(audio_file_path: str, samples: int = 100) -> List[float]:
    """Generate waveform data from audio file"""
    try:
        # Try to read as WAV file first
        with wave.open(audio_file_path, 'rb') as wav_file:
            frames = wav_file.readframes(-1)
            # Simple waveform generation without numpy (for deployment optimization)
            sound_data = struct.unpack(f'{len(frames)//2}h', frames)
            
            # Normalize to 0-1 range
            if len(sound_data) > 0:
                abs_data = [abs(x) for x in sound_data]
                max_val = max(abs_data) if abs_data else 1
                normalized_data = [x / max_val for x in abs_data]
                
                # Downsample to desired number of samples
                chunk_size = len(normalized_data) // samples
                if chunk_size > 0:
                    waveform = []
                    for i in range(0, len(normalized_data), chunk_size)[:samples]:
                        chunk = normalized_data[i:i + chunk_size]
                        waveform.append(sum(chunk) / len(chunk))
                    return waveform
            
        return [0.0] * samples
        
    except Exception as e:
        logging.warning(f"Could not generate waveform for {audio_file_path}: {e}")
        # Return a simple placeholder waveform
        return [0.1, 0.3, 0.5, 0.7, 0.5, 0.3, 0.1] * (samples // 7)

def get_audio_duration(audio_file_path: str) -> float:
    """Get duration of audio file in seconds"""
    try:
        with wave.open(audio_file_path, 'rb') as wav_file:
            frames = wav_file.getnframes()
            sample_rate = wav_file.getframerate()
            duration = frames / float(sample_rate)
            return duration
    except Exception as e:
        logging.warning(f"Could not get duration for {audio_file_path}: {e}")
        return 0.0

async def process_voice_message(file_path: Path, original_filename: str) -> Dict[str, Any]:
    """Process voice message and extract metadata"""
    try:
        # Get duration
        duration = get_audio_duration(str(file_path))
        
        # Generate waveform data
        waveform = generate_waveform_data(str(file_path))
        
        return {
            "duration": duration,
            "waveform": waveform,
            "is_voice_message": True
        }
    except Exception as e:
        logging.error(f"Error processing voice message {original_filename}: {e}")
        return {
            "duration": 0.0,
            "waveform": [0.1] * 50,
            "is_voice_message": True
        }

async def save_uploaded_file(file: UploadFile, file_type: str) -> Dict[str, Any]:
    """Save uploaded file and return metadata"""
    if not is_allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    # Check file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZES.get(file_type, MAX_FILE_SIZES["document"]):
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size for {file_type} is {MAX_FILE_SIZES.get(file_type, MAX_FILE_SIZES['document']) // (1024*1024)}MB")
    
    # Generate unique filename
    unique_filename = generate_unique_filename(file.filename)
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Get file info
    mime_type = mimetypes.guess_type(file.filename)[0] or "application/octet-stream"
    file_url = f"/api/files/{unique_filename}"
    
    # Create thumbnail for images
    thumbnail_url = None
    width, height = None, None
    duration = None
    waveform = None
    
    if file_type == "image":
        try:
            with Image.open(file_path) as img:
                width, height = img.size
                # Create thumbnail
                img.thumbnail((200, 200), Image.Resampling.LANCZOS)
                thumbnail_filename = f"thumb_{unique_filename}"
                thumbnail_path = UPLOAD_DIR / thumbnail_filename
                img.save(thumbnail_path, optimize=True, quality=85)
                thumbnail_url = f"/api/files/{thumbnail_filename}"
        except Exception as e:
            logging.warning(f"Could not create thumbnail for {file.filename}: {e}")
    
    elif file_type == "voice":
        # Process voice message
        try:
            voice_metadata = await process_voice_message(file_path, file.filename)
            duration = voice_metadata.get("duration", 0.0)
            waveform = voice_metadata.get("waveform", [])
        except Exception as e:
            logging.warning(f"Could not process voice message {file.filename}: {e}")
            duration = 0.0
            waveform = [0.1] * 50
    
    return {
        "id": str(uuid.uuid4()),
        "filename": unique_filename,
        "original_filename": file.filename,
        "file_type": file_type,
        "file_size": len(content),
        "mime_type": mime_type,
        "file_url": file_url,
        "thumbnail_url": thumbnail_url,
        "width": width,
        "height": height,
        "duration": duration,
        "waveform": waveform,
        "uploaded_at": datetime.utcnow()
    }

def is_quiet_hours(preferences: Dict[str, Any]) -> bool:
    """Check if current time is within user's quiet hours"""
    if not preferences.get("quiet_hours_enabled", False):
        return False
    
    now = datetime.now().time()
    start_time = datetime.strptime(preferences.get("quiet_hours_start", "22:00"), "%H:%M").time()
    end_time = datetime.strptime(preferences.get("quiet_hours_end", "08:00"), "%H:%M").time()
    
    if start_time <= end_time:
        # Same day range (e.g., 09:00 to 17:00)
        return start_time <= now <= end_time
    else:
        # Crosses midnight (e.g., 22:00 to 08:00)
        return now >= start_time or now <= end_time


async def notify_compound_admins(compound_id: str, title: str, content: str, action_type: str, exclude_user_id: str = None):
    """Send in-app notification to all admins in a compound for important actions"""
    try:
        admin_query = {"compound_id": compound_id, "role": "admin"}
        if exclude_user_id:
            admin_query["id"] = {"$ne": exclude_user_id}
        admins = await db.users.find(admin_query, {"id": 1}).to_list(50)
        admin_ids = [a["id"] for a in admins]
        if not admin_ids:
            return
        notification_doc = {
            "id": str(uuid.uuid4()),
            "compound_id": compound_id,
            "sender_id": "system",
            "title": title,
            "content": content,
            "type": action_type,
            "recipient_ids": admin_ids,
            "is_read": False,
            "created_at": datetime.now(timezone.utc)
        }
        await db.notifications.insert_one(notification_doc)
        # Broadcast via websocket
        ws_message = json.dumps({
            "type": "notification",
            "title": title,
            "content": content,
            "action_type": action_type,
            "id": notification_doc["id"]
        })
        for admin_id in admin_ids:
            await manager.send_personal_message(ws_message, admin_id)
    except Exception as e:
        logging.error(f"Error notifying admins: {e}")


async def send_push_notification(user_id: str, title: str, body: str, data: Dict[str, Any] = None):
    """Send push notification to a user"""
    try:
        # Get user's push subscriptions
        subscriptions = await db.push_subscriptions.find({
            "user_id": user_id,
            "is_active": True
        }).to_list(100)
        
        if not subscriptions:
            return
        
        # Get user's notification preferences
        preferences = await db.notification_preferences.find_one({"user_id": user_id})
        if not preferences or not preferences.get("push_enabled", True):
            return
        
        # Check quiet hours
        if is_quiet_hours(preferences or {}):
            return
        
        # Prepare notification payload
        payload = {
            "title": title,
            "body": body,
            "icon": "/icons/icon-192x192.png",
            "badge": "/icons/badge-72x72.png",
            "data": data or {}
        }
        
        # Send to all user's subscriptions
        for subscription in subscriptions:
            try:
                # In a real implementation, you would use a library like py-vapid
                # For now, we'll log the notification
                logging.info(f"Sending push notification to user {user_id}: {title}")
                
                # Here you would normally send the actual push notification
                # using the Web Push Protocol with VAPID keys
                
            except Exception as e:
                logging.error(f"Failed to send push notification to subscription {subscription['id']}: {e}")
                # Mark subscription as inactive if it fails
                await db.push_subscriptions.update_one(
                    {"id": subscription["id"]},
                    {"$set": {"is_active": False}}
                )
    
    except Exception as e:
        logging.error(f"Error sending push notification to user {user_id}: {e}")

async def notify_chat_participants(chat_id: str, sender_id: str, message_content: str, message_type: str = "text"):
    """Send push notifications to chat participants (except sender)"""
    try:
        # Get chat details
        chat = await db.chats.find_one({"id": chat_id})
        if not chat:
            return
        
        # Get sender info
        sender = await db.users.find_one({"id": sender_id})
        sender_name = sender.get("full_name", "Someone") if sender else "Someone"
        
        # Determine notification title based on chat type
        if chat["chat_type"] == "direct":
            title = f"Message from {sender_name}"
        elif chat["chat_type"] == "group":
            title = f"{sender_name} in {chat.get('name', 'Group Chat')}"
        else:  # compound_wide
            title = f"{sender_name} in Compound Chat"
        
        # Prepare notification body
        if message_type == "text":
            body = message_content[:100] + "..." if len(message_content) > 100 else message_content
        elif message_type == "image":
            body = "📷 Sent a photo"
        elif message_type == "video":
            body = "🎥 Sent a video"
        elif message_type == "audio":
            body = "🎵 Sent an audio message"
        else:
            body = "📎 Sent a file"
        
        # Send notifications to all participants except sender
        participants = [p for p in chat["participants"] if p != sender_id]
        
        for participant_id in participants:
            # Check user's notification preferences for chat type
            preferences = await db.notification_preferences.find_one({"user_id": participant_id})
            
            should_notify = True
            if preferences:
                if chat["chat_type"] == "direct" and not preferences.get("direct_notifications", True):
                    should_notify = False
                elif chat["chat_type"] == "group" and not preferences.get("group_notifications", True):
                    should_notify = False
                elif chat["chat_type"] == "compound_wide" and not preferences.get("compound_notifications", True):
                    should_notify = False
            
            if should_notify:
                await send_push_notification(
                    participant_id,
                    title,
                    body,
                    {
                        "chatId": chat_id,
                        "senderId": sender_id,
                        "messageType": message_type,
                        "url": f"/chat?open={chat_id}"
                    }
                )
    
    except Exception as e:
        logging.error(f"Error sending chat notifications: {e}")

async def create_text_index():
    """Create text index for chat messages search"""
    try:
        # Create text index on content field for full-text search
        await db.chat_messages.create_index([
            ("content", "text"),
            ("sender_id", 1),
            ("chat_id", 1),
            ("created_at", -1)
        ])
        
        # Create compound indexes for better search performance
        await db.chat_messages.create_index([
            ("compound_id", 1),
            ("created_at", -1)
        ])
        
        await db.chat_messages.create_index([
            ("message_type", 1),
            ("created_at", -1)
        ])
        
        logging.info("Text indexes created successfully")
    except Exception as e:
        logging.warning(f"Could not create text indexes: {e}")

async def search_messages(
    user_id: str,
    compound_id: str,
    search_request: SearchRequest
) -> Dict[str, Any]:
    """Search messages with various filters"""
    try:
        # Add chat filter - only chats user is participant of
        user_chats = await db.chats.find({
            "compound_id": compound_id,
            "participants": user_id,
            "is_active": True
        }).to_list(500)
        
        user_chat_ids = [chat["id"] for chat in user_chats]
        
        if search_request.chat_ids:
            # Filter to only chats user is in and requested chats
            filtered_chat_ids = list(set(user_chat_ids) & set(search_request.chat_ids))
        else:
            filtered_chat_ids = user_chat_ids
        
        # Build MongoDB query - messages don't have compound_id, so we filter by chat_id
        query = {
            "chat_id": {"$in": filtered_chat_ids},
            "is_deleted": False
        }
        
        # Text search
        if search_request.query.strip():
            if search_request.search_type == "text":
                # Full-text search
                query["$text"] = {"$search": search_request.query}
            else:
                # Regex search for partial matches
                query["content"] = {
                    "$regex": search_request.query,
                    "$options": "i"
                }
        
        # Sender filter
        if search_request.sender_ids:
            query["sender_id"] = {"$in": search_request.sender_ids}
        
        # Message type filter
        if search_request.message_types:
            query["message_type"] = {"$in": search_request.message_types}
        
        # Date range filter
        if search_request.date_from or search_request.date_to:
            date_query = {}
            if search_request.date_from:
                date_query["$gte"] = search_request.date_from
            if search_request.date_to:
                date_query["$lte"] = search_request.date_to
            query["created_at"] = date_query
        
        # File type filter (for attachments)
        if search_request.file_types:
            query["attachments.file_type"] = {"$in": search_request.file_types}
        
        # Build sort criteria
        sort_criteria = []
        if search_request.sort_by == "relevance" and "$text" in query:
            sort_criteria.append(("score", {"$meta": "textScore"}))
        
        if search_request.sort_order == "desc":
            sort_criteria.append((search_request.sort_by, -1))
        else:
            sort_criteria.append((search_request.sort_by, 1))
        
        # Execute search
        cursor = db.chat_messages.find(query)
        
        if sort_criteria:
            cursor = cursor.sort(sort_criteria)
        
        cursor = cursor.skip(search_request.skip).limit(search_request.limit)
        
        messages = await cursor.to_list(length=10000)
        
        # Get total count for pagination
        total_count = await db.chat_messages.count_documents(query)
        
        # Get sender details
        sender_ids = list(set(msg["sender_id"] for msg in messages))
        senders = await db.users.find(
            {"id": {"$in": sender_ids}},
            {"id": 1, "full_name": 1, "username": 1}
        ).to_list(length=10000)
        senders_dict = {sender["id"]: sender for sender in senders}
        
        # Get chat details
        chat_ids = list(set(msg["chat_id"] for msg in messages))
        chats = await db.chats.find(
            {"id": {"$in": chat_ids}},
            {"id": 1, "name": 1, "chat_type": 1, "participants": 1}
        ).to_list(length=10000)
        chats_dict = {chat["id"]: chat for chat in chats}
        
        # Enhance messages with sender and chat info
        for message in messages:
            message["sender"] = senders_dict.get(message["sender_id"])
            message["chat"] = chats_dict.get(message["chat_id"])
        
        # Serialize all data to handle ObjectIds and datetime objects
        result = {
            "messages": serialize_datetime(messages),
            "total_count": total_count,
            "has_more": total_count > (search_request.skip + len(messages)),
            "query": search_request.query,
            "filters_applied": {
                "chat_ids": search_request.chat_ids,
                "sender_ids": search_request.sender_ids,
                "message_types": search_request.message_types,
                "date_from": serialize_datetime(search_request.date_from),
                "date_to": serialize_datetime(search_request.date_to),
                "file_types": search_request.file_types
            }
        }
        
        return result
        
    except Exception as e:
        logging.error(f"Error searching messages: {e}")
        return {
            "messages": [],
            "total_count": 0,
            "has_more": False,
            "error": str(e)
        }

async def get_search_suggestions(
    user_id: str,
    compound_id: str,
    query: str,
    limit: int = 10
) -> List[str]:
    """Get search suggestions based on query"""
    try:
        suggestions = []
        
        # Get user's chats
        user_chats = await db.chats.find({
            "compound_id": compound_id,
            "participants": user_id,
            "is_active": True
        }).to_list(length=10000)
        
        user_chat_ids = [chat["id"] for chat in user_chats]
        
        # Get recent searches
        recent_searches = await db.search_history.find({
            "user_id": user_id,
            "query": {"$regex": query, "$options": "i"}
        }).sort("created_at", -1).limit(5).to_list(length=10000)
        
        suggestions.extend([search["query"] for search in recent_searches])
        
        # Get common words from recent messages
        if len(query) >= 2:
            recent_messages = await db.chat_messages.find({
                "chat_id": {"$in": user_chat_ids},
                "content": {"$regex": query, "$options": "i"},
                "is_deleted": False
            }).sort("created_at", -1).limit(20).to_list(length=10000)
            
            # Extract words that contain the query
            for message in recent_messages:
                words = message["content"].split()
                for word in words:
                    if query.lower() in word.lower() and len(word) > len(query):
                        if word not in suggestions:
                            suggestions.append(word)
        
        return suggestions[:limit]
        
    except Exception as e:
        logging.error(f"Error getting search suggestions: {e}")
        return []

async def get_file_gallery(
    user_id: str,
    compound_id: str,
    gallery_filter: FileGalleryFilter
) -> Dict[str, Any]:
    """Get files from chat messages for gallery view"""
    try:
        # Get user's accessible chats
        user_chats = await db.chats.find({
            "compound_id": compound_id,
            "participants": user_id,
            "is_active": True
        }).to_list(length=10000)
        
        user_chat_ids = [chat["id"] for chat in user_chats]
        
        # Build query for messages with attachments
        query = {
            "chat_id": {"$in": user_chat_ids if not gallery_filter.chat_ids else list(set(user_chat_ids) & set(gallery_filter.chat_ids))},
            "attachments": {"$exists": True, "$not": {"$size": 0}},
            "is_deleted": False
        }
        
        # File type filter
        if gallery_filter.file_types:
            query["$or"] = []
            for file_type in gallery_filter.file_types:
                query["$or"].append({"attachments.file_type": file_type})
                if file_type == "media":  # Special category for images and videos
                    query["$or"].extend([
                        {"attachments.file_type": "image"},
                        {"attachments.file_type": "video"}
                    ])
        
        # Date range filter
        if gallery_filter.date_from or gallery_filter.date_to:
            date_query = {}
            if gallery_filter.date_from:
                date_query["$gte"] = gallery_filter.date_from
            if gallery_filter.date_to:
                date_query["$lte"] = gallery_filter.date_to
            query["created_at"] = date_query
        
        # Sender filter
        if gallery_filter.sender_ids:
            query["sender_id"] = {"$in": gallery_filter.sender_ids}
        
        # Build sort criteria
        sort_order = -1 if gallery_filter.sort_order == "desc" else 1
        sort_criteria = [(gallery_filter.sort_by, sort_order)]
        
        # Execute query
        cursor = db.chat_messages.find(query).sort(sort_criteria)
        cursor = cursor.skip(gallery_filter.skip).limit(gallery_filter.limit)
        
        messages = await cursor.to_list(length=10000)
        
        # Extract files with metadata
        files = []
        for message in messages:
            for attachment in message.get("attachments", []):
                file_info = {
                    **attachment,
                    "message_id": message["id"],
                    "chat_id": message["chat_id"],
                    "sender_id": message["sender_id"],
                    "message_content": message.get("content", ""),
                    "message_created_at": message["created_at"]
                }
                files.append(file_info)
        
        # Get total count
        total_count = await db.chat_messages.count_documents(query)
        
        # Get sender details
        sender_ids = list(set(msg["sender_id"] for msg in messages))
        senders = await db.users.find(
            {"id": {"$in": sender_ids}},
            {"id": 1, "full_name": 1, "username": 1}
        ).to_list(length=10000)
        senders_dict = {sender["id"]: sender for sender in senders}
        
        # Get chat details
        chat_ids = list(set(msg["chat_id"] for msg in messages))
        chats = await db.chats.find(
            {"id": {"$in": chat_ids}},
            {"id": 1, "name": 1, "chat_type": 1}
        ).to_list(length=10000)
        chats_dict = {chat["id"]: chat for chat in chats}
        
        # Enhance files with sender and chat info
        for file_info in files:
            file_info["sender"] = senders_dict.get(file_info["sender_id"])
            file_info["chat"] = chats_dict.get(file_info["chat_id"])
        
        return {
            "files": serialize_datetime(files),
            "total_count": total_count,
            "has_more": total_count > (gallery_filter.skip + len(files)),
            "stats": serialize_datetime(await get_file_stats(user_chat_ids))
        }
        
    except Exception as e:
        logging.error(f"Error getting file gallery: {e}")
        return {
            "files": [],
            "total_count": 0,
            "has_more": False,
            "error": str(e)
        }

async def get_file_stats(chat_ids: List[str]) -> Dict[str, Any]:
    """Get file statistics for gallery"""
    try:
        # Aggregate file statistics
        pipeline = [
            {
                "$match": {
                    "chat_id": {"$in": chat_ids},
                    "attachments": {"$exists": True, "$not": {"$size": 0}},
                    "is_deleted": False
                }
            },
            {"$unwind": "$attachments"},
            {
                "$group": {
                    "_id": "$attachments.file_type",
                    "count": {"$sum": 1},
                    "total_size": {"$sum": "$attachments.file_size"}
                }
            }
        ]
        
        stats = await db.chat_messages.aggregate(pipeline).to_list(length=10000)
        
        # Format statistics
        file_stats = {}
        total_files = 0
        total_size = 0
        
        for stat in stats:
            file_type = stat["_id"]
            count = stat["count"]
            size = stat["total_size"]
            
            file_stats[file_type] = {
                "count": count,
                "size": size,
                "size_mb": round(size / (1024 * 1024), 2)
            }
            
            total_files += count
            total_size += size
        
        return {
            "by_type": file_stats,
            "total_files": total_files,
            "total_size": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2)
        }
        
    except Exception as e:
        logging.error(f"Error getting file stats: {e}")
        return {"by_type": {}, "total_files": 0, "total_size": 0}

async def process_scheduled_messages():
    """Process scheduled messages that are due to be sent"""
    try:
        now = datetime.utcnow()
        
        # Find pending messages that are due
        due_messages = await db.scheduled_messages.find({
            "status": "pending",
            "scheduled_for": {"$lte": now}
        }).to_list(length=10000)
        
        for scheduled_msg in due_messages:
            try:
                # Create and send the message
                message = ChatMessage(
                    chat_id=scheduled_msg["chat_id"],
                    sender_id=scheduled_msg["sender_id"],
                    content=scheduled_msg["content"],
                    message_type=scheduled_msg["message_type"],
                    attachments=scheduled_msg.get("attachments", []),
                    read_by={scheduled_msg["sender_id"]: datetime.utcnow()}
                )
                
                # Insert message
                await db.chat_messages.insert_one(message.dict())
                
                # Update chat's last message time
                await db.chats.update_one(
                    {"id": scheduled_msg["chat_id"]},
                    {"$set": {"last_message_at": message.created_at, "updated_at": datetime.utcnow()}}
                )
                
                # Get chat participants for notifications
                chat = await db.chats.find_one({"id": scheduled_msg["chat_id"]})
                if chat:
                    # Send WebSocket notification
                    sender = await db.users.find_one({"id": scheduled_msg["sender_id"]})
                    sender_info = {
                        "id": sender["id"],
                        "full_name": sender["full_name"],
                        "username": sender["username"]
                    } if sender else {}
                    
                    ws_message = message.dict()
                    ws_message["sender"] = sender_info
                    
                    await manager.send_chat_message(
                        {
                            "type": "new_message",
                            "chat_id": scheduled_msg["chat_id"],
                            "message": ws_message
                        },
                        chat["participants"]
                    )
                    
                    # Send push notifications
                    await notify_chat_participants(
                        scheduled_msg["chat_id"],
                        scheduled_msg["sender_id"],
                        scheduled_msg["content"],
                        scheduled_msg["message_type"]
                    )
                
                # Update scheduled message status
                update_data = {
                    "status": "sent",
                    "sent_at": datetime.utcnow()
                }
                
                # Handle recurring messages
                if scheduled_msg.get("is_recurring") and scheduled_msg.get("recurrence_pattern"):
                    next_scheduled = calculate_next_occurrence(
                        scheduled_msg["scheduled_for"],
                        scheduled_msg["recurrence_pattern"]
                    )
                    
                    if next_scheduled and (not scheduled_msg.get("recurrence_end") or next_scheduled <= scheduled_msg["recurrence_end"]):
                        # Create next occurrence
                        next_msg = ScheduledMessage(
                            chat_id=scheduled_msg["chat_id"],
                            sender_id=scheduled_msg["sender_id"],
                            content=scheduled_msg["content"],
                            message_type=scheduled_msg["message_type"],
                            attachments=scheduled_msg.get("attachments", []),
                            scheduled_for=next_scheduled,
                            timezone=scheduled_msg.get("timezone", "UTC"),
                            is_recurring=True,
                            recurrence_pattern=scheduled_msg["recurrence_pattern"],
                            recurrence_end=scheduled_msg.get("recurrence_end")
                        )
                        
                        await db.scheduled_messages.insert_one(next_msg.dict())
                
                await db.scheduled_messages.update_one(
                    {"id": scheduled_msg["id"]},
                    {"$set": update_data}
                )
                
                logging.info(f"Sent scheduled message {scheduled_msg['id']}")
                
            except Exception as e:
                # Mark message as failed
                await db.scheduled_messages.update_one(
                    {"id": scheduled_msg["id"]},
                    {"$set": {
                        "status": "failed",
                        "error_message": str(e)
                    }}
                )
                logging.error(f"Failed to send scheduled message {scheduled_msg['id']}: {e}")
        
        return len(due_messages)
        
    except Exception as e:
        logging.error(f"Error processing scheduled messages: {e}")
        return 0

def calculate_next_occurrence(current_date: datetime, pattern: str) -> Optional[datetime]:
    """Calculate next occurrence for recurring messages"""
    try:
        if pattern == "daily":
            return current_date + timedelta(days=1)
        elif pattern == "weekly":
            return current_date + timedelta(weeks=1)
        elif pattern == "monthly":
            # Add one month
            if current_date.month == 12:
                return current_date.replace(year=current_date.year + 1, month=1)
            else:
                return current_date.replace(month=current_date.month + 1)
        else:
            return None
    except Exception:
        return None

# Utility Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Get current user but allow None if no credentials provided"""
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            return None
        
        return User(**user)
    except jwt.PyJWTError:
        return None

async def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def require_super_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return current_user

async def require_staff_or_admin(current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Staff or Admin access required")
    return current_user

async def require_security_or_admin(current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECURITY, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Security or Admin access required")
    return current_user

def is_trial_feature_allowed(user_trial: Dict[str, Any], feature: str, current_usage: int) -> bool:
    """Check if a trial feature is within limits"""
    if not user_trial or not user_trial.get("is_active"):
        return True  # No trial restrictions for paid users
    
    # Check if trial is expired
    if datetime.utcnow() > user_trial.get("end_date", datetime.utcnow()):
        return False
    
    limits = {
        "users": 10,
        "families": 5,
        "services": 3,
        "storage_mb": 100,
        "messages": 50
    }
    
    limit = limits.get(feature, float('inf'))
    return current_usage < limit

async def get_user_trial_status(user_id: str, compound_id: str) -> Dict[str, Any]:
    """Get comprehensive trial status for a user"""
    try:
        # Find active trial
        trial = await db.user_trials.find_one({
            "user_id": user_id,
            "compound_id": compound_id,
            "is_active": True
        })
        
        if not trial:
            return {
                "is_trial": False,
                "trial_active": False,
                "days_remaining": 0,
                "usage": {},
                "limits": {}
            }
        
        # Check if expired
        now = datetime.utcnow()
        end_date = trial["end_date"]
        days_remaining = max(0, (end_date - now).days)
        
        if days_remaining <= 0:
            # Mark trial as expired
            await db.user_trials.update_one(
                {"id": trial["id"]},
                {"$set": {"is_expired": True, "is_active": False, "updated_at": now}}
            )
            return {
                "is_trial": True,
                "trial_active": False,
                "days_remaining": 0,
                "usage": {},
                "limits": {}
            }
        
        # Get current usage stats
        usage_stats = {
            "users": await db.users.count_documents({"compound_id": compound_id}),
            "families": await db.families.count_documents({"compound_id": compound_id}),
            "services": await db.services.count_documents({"compound_id": compound_id}),
            "messages": await db.chat_messages.count_documents({
                "chat_id": {"$in": await get_compound_chat_ids(compound_id)}
            }),
        }
        
        # Calculate storage usage
        storage_usage = await calculate_storage_usage(compound_id)
        usage_stats["storage_mb"] = round(storage_usage / (1024 * 1024), 2)
        
        # Define limits
        limits = {
            "users": 10,
            "families": 5,
            "services": 3,
            "storage_mb": 100,
            "messages": 50
        }
        
        return {
            "is_trial": True,
            "trial_active": True,
            "days_remaining": days_remaining,
            "trial_plan": {
                "name": "Free Trial",
                "duration_days": (trial["end_date"] - trial["start_date"]).days
            },
            "usage": usage_stats,
            "limits": limits
        }
        
    except Exception as e:
        logging.error(f"Error getting trial status: {e}")
        return {
            "is_trial": False,
            "trial_active": False,
            "days_remaining": 0,
            "usage": {},
            "limits": {}
        }

async def get_compound_chat_ids(compound_id: str) -> List[str]:
    """Get all chat IDs for a compound"""
    chats = await db.chats.find({"compound_id": compound_id}).limit(500).to_list(length=10000)
    return [chat["id"] for chat in chats]

async def calculate_storage_usage(compound_id: str) -> int:
    """Calculate total storage usage for a compound in bytes"""
    try:
        # Get all chats for compound
        chat_ids = await get_compound_chat_ids(compound_id)
        
        # Get all messages with attachments
        messages = await db.chat_messages.find({
            "chat_id": {"$in": chat_ids},
            "attachments": {"$exists": True, "$not": {"$size": 0}}
        }).to_list(length=10000)
        
        total_size = 0
        for message in messages:
            for attachment in message.get("attachments", []):
                total_size += attachment.get("file_size", 0)
        
        return total_size
        
    except Exception as e:
        logging.error(f"Error calculating storage usage: {e}")
        return 0

def process_image(file_content: bytes) -> str:
    """Process and encode image to base64"""
    try:
        image = Image.open(BytesIO(file_content))
        
        # Resize if too large
        max_size = (800, 600)
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Convert to RGB if necessary
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
        
        # Save to bytes
        img_byte_arr = BytesIO()
        image.save(img_byte_arr, format='JPEG', quality=85)
        img_byte_arr = img_byte_arr.getvalue()
        
        # Encode to base64
        return base64.b64encode(img_byte_arr).decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image processing failed: {str(e)}")

# WebSocket endpoint
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages if needed
    except WebSocketDisconnect:
        manager.disconnect(user_id)

# Authentication Routes
@api_router.post("/auth/register")
# Auth routes extracted to routes/
# Families/Msgs routes extracted to routes/
@api_router.get("/database/users")
# DB Admin routes extracted to routes/
@api_router.post("/push/subscribe")
async def subscribe_to_push_notifications(
    subscription_data: PushSubscriptionRequest,
    current_user: User = Depends(get_current_user)
):
    """Subscribe user to push notifications"""
    try:
        # Check if subscription already exists
        existing = await db.push_subscriptions.find_one({
            "user_id": current_user.id,
            "endpoint": subscription_data.endpoint
        })
        
        if existing:
            # Update existing subscription
            await db.push_subscriptions.update_one(
                {"id": existing["id"]},
                {
                    "$set": {
                        "p256dh": subscription_data.keys.get("p256dh"),
                        "auth": subscription_data.keys.get("auth"),
                        "is_active": True
                    }
                }
            )
            return {"message": "Push subscription updated successfully"}
        else:
            # Create new subscription
            subscription = PushSubscription(
                user_id=current_user.id,
                endpoint=subscription_data.endpoint,
                p256dh=subscription_data.keys.get("p256dh", ""),
                auth=subscription_data.keys.get("auth", "")
            )
            
            await db.push_subscriptions.insert_one(subscription.dict())
            return {"message": "Push subscription created successfully"}
    
    except Exception as e:
        logging.error(f"Error subscribing to push notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to subscribe to push notifications")

@api_router.delete("/push/unsubscribe")
async def unsubscribe_from_push_notifications(
    endpoint: str,
    current_user: User = Depends(get_current_user)
):
    """Unsubscribe from push notifications"""
    try:
        result = await db.push_subscriptions.update_many(
            {
                "user_id": current_user.id,
                "endpoint": endpoint
            },
            {"$set": {"is_active": False}}
        )
        
        if result.modified_count > 0:
            return {"message": "Unsubscribed successfully"}
        else:
            raise HTTPException(status_code=404, detail="Push subscription not found")
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error unsubscribing from push notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to unsubscribe from push notifications")

@api_router.get("/notifications/preferences")
async def get_notification_preferences(current_user: User = Depends(get_current_user)):
    """Get user's notification preferences"""
    preferences = await db.notification_preferences.find_one({"user_id": current_user.id})
    
    if not preferences:
        # Create default preferences
        default_preferences = NotificationPreferences(user_id=current_user.id)
        await db.notification_preferences.insert_one(default_preferences.dict())
        return {"preferences": serialize_datetime(default_preferences.dict())}
    
    return {"preferences": serialize_datetime(preferences)}

@api_router.put("/notifications/preferences")
async def update_notification_preferences(
    preferences_update: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update user's notification preferences"""
    try:
        # Get existing preferences or create default
        existing = await db.notification_preferences.find_one({"user_id": current_user.id})
        
        if not existing:
            # Create new preferences
            new_preferences = NotificationPreferences(user_id=current_user.id)
            preferences_dict = new_preferences.dict()
        else:
            preferences_dict = existing.copy()
        
        # Update with provided values
        update_data = preferences_update.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        preferences_dict.update(update_data)
        
        # Upsert preferences
        await db.notification_preferences.update_one(
            {"user_id": current_user.id},
            {"$set": preferences_dict},
            upsert=True
        )
        
        return {"message": "Notification preferences updated successfully", "preferences": serialize_datetime(preferences_dict)}
    
    except Exception as e:
        logging.error(f"Error updating notification preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to update notification preferences")

@api_router.post("/push/test")
async def test_push_notification(current_user: User = Depends(get_current_user)):
    """Send a test push notification"""
    await send_push_notification(
        current_user.id,
        "Test Notification",
        "This is a test notification from HomeMe!",
        {"type": "test", "url": "/dashboard"}
    )
    
    return {"message": "Test notification sent"}

# ============ MESSAGE SEARCH ENDPOINTS ============

# Search routes extracted to routes/

# Gallery/Init routes extracted to routes/
@app.websocket("/ws/chat/{user_id}")
async def websocket_chat_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time chat"""
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            # Echo back for testing
            await manager.send_personal_message(f"Echo: {data}", user_id)
    except WebSocketDisconnect:
        manager.disconnect(user_id)

@api_router.get("/files/users/{filename}")
async def serve_user_file(filename: str):
    """Serve user profile pictures."""
    file_path = UPLOAD_DIR / "users" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    mime_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
    return FileResponse(path=str(file_path), media_type=mime_type, filename=filename)


@api_router.get("/files/payment_proofs/{filename}")
async def serve_payment_proof(filename: str):
    """Serve payment confirmation proof files (owner / super_admin only)."""
    file_path = UPLOAD_DIR / "payment_proofs" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    mime_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
    return FileResponse(path=str(file_path), media_type=mime_type, filename=filename)


@api_router.get("/files/{subdir}/{filename}")
async def serve_subdir_file(subdir: str, filename: str):
    """Serve files from /app/uploads/{subdir}/{filename} (e.g. branding, family_members, services).
    Multi-layer self-healing:
      1. Serve from disk if exists
      2. If missing on disk, try to restore from latest backup snapshot
      3. If not in any backup, try to restore from MongoDB persistent store (survives deployments!)
      4. Else 404
    """
    # Whitelist subdirs to prevent directory traversal
    allowed_subdirs = {"branding", "family_members", "logos", "ads", "services", "documents", "gallery", "maintenance", "users", "payment_proofs", "homeme"}
    if subdir not in allowed_subdirs:
        raise HTTPException(status_code=404, detail="Invalid subdirectory")
    file_path = UPLOAD_DIR / subdir / filename
    if not file_path.exists() or not file_path.is_file():
        # Self-heal layer 1: try latest backup snapshot
        try:
            from services.media_backup import restore_file
            if restore_file(subdir, filename):
                file_path = UPLOAD_DIR / subdir / filename
        except Exception as _e:
            logging.warning(f"self-heal (backup) failed for {subdir}/{filename}: {_e}")
        # Self-heal layer 2: try MongoDB persistent store
        if not file_path.exists() or not file_path.is_file():
            try:
                from services.media_store import restore_to_disk_from_db
                if await restore_to_disk_from_db(subdir, filename):
                    file_path = UPLOAD_DIR / subdir / filename
            except Exception as _e:
                logging.warning(f"self-heal (DB) failed for {subdir}/{filename}: {_e}")
        if not file_path.exists() or not file_path.is_file():
            raise HTTPException(status_code=404, detail="File not found")
    mime_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
    return FileResponse(path=str(file_path), media_type=mime_type, filename=filename)


@api_router.get("/files/{filename}")
async def serve_file(filename: str):
    """Serve uploaded files"""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Get mime type
    mime_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
    
    return FileResponse(
        path=str(file_path),
        media_type=mime_type,
        filename=filename
    )

@api_router.get("/downloads/flutter-assets")
async def download_flutter_assets():
    """Public download endpoint for the packaged Flutter assets zip."""
    zip_path = Path("/app/homeme_flutter_assets.zip")
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="Flutter assets zip not found")
    return FileResponse(
        path=str(zip_path),
        media_type="application/zip",
        filename="homeme_flutter_assets.zip"
    )

# Health check
@api_router.get("/")
async def root():
    return {"message": "HomeMe API is running", "status": "healthy"}

# Router will be included after all endpoints are defined

# CORS middleware - Restricted origins for security
# IMPORTANT: `allow_credentials` is intentionally False because the upstream
# Cloudflare/Kubernetes ingress overrides `Access-Control-Allow-Origin` to
# `*` for some POST responses. The combination `Allow-Origin: *` +
# `Allow-Credentials: true` violates the CORS spec and causes browsers to
# silently drop the response (login XHR onload never fires). The frontend
# does not rely on cookies for auth — it sends the JWT in the Authorization
# header — so disabling credentials here is safe and necessary.
ALLOWED_ORIGINS = os.environ.get('CORS_ORIGINS', 'https://profile-nav-debug.preview.emergentagent.com,https://homemeapp.net,http://localhost:3000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

# ============ USER SETTINGS ENDPOINTS ============

# User Profile extracted to routes/
# Trial extracted to routes/
@app.websocket("/ws/notifications/{user_id}")
async def websocket_notifications_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time notifications"""
    try:
        # Verify user
        user = await db.users.find_one({"id": user_id})
        if not user:
            await websocket.close(code=1008, reason="User not found")
            return
        
        connection_id = str(uuid.uuid4())
        await manager.connect(websocket, connection_id, user_id, user["compound_id"])
        
        try:
            while True:
                # Keep connection alive and handle incoming messages
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                if message.get("type") == "ping":
                    await manager.send_to_connection(connection_id, {
                        "type": "pong",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                
        except WebSocketDisconnect:
            manager.disconnect(connection_id)
        except Exception as e:
            logging.error(f"WebSocket error: {e}")
            manager.disconnect(connection_id)
            
    except Exception as e:
        logging.error(f"WebSocket connection error: {e}")
        await websocket.close(code=1011, reason="Internal server error")

# Guest routes extracted to routes/guests.py

# ============ EVENTS & ANNOUNCEMENTS ENDPOINTS ============

# announcements routes extracted to routes/announcements.py

# Analytics extracted to routes/
# Individual/Account extracted to routes/
# Super Accounts extracted to routes/
# Payments/Stripe extracted to routes/
try:
    from ratings_reviews import router as ratings_router
except ImportError:
    ratings_router = None

# Subscription codes APIs extracted to routes/subscriptions.py

# Security routes extracted to routes/

# ==================== ROUTE MODULE IMPORTS ====================
from routes.monitoring import router as monitoring_router
from routes.finance import router as finance_router
from routes.ratings import router as ratings_router2
from routes.contracts import router as contracts_router
from routes.compound_payment_methods import router as compound_payment_methods_router
from routes.payment_proofs import router as payment_proofs_router
from routes.bulk_import_residents import router as bulk_import_residents_router
from routes.sidebar_badges import router as sidebar_badges_router
from routes.complaints import router as complaints_router
from routes.superadmin import router as superadmin_router
from routes.superadmin_gifts import router as superadmin_gifts_router
from routes.superadmin_companies import router as superadmin_companies_router
from routes.superadmin_campaigns import router as superadmin_campaigns_router
from routes.support import router as support_router
from routes.exports import router as exports_router
from routes.facilities import router as facilities_router
from routes.maintenance import router as maintenance_router
from routes.notifications import router as notifications_router
from routes.guests import router as guests_router
from routes.announcements import router as announcements_router
from routes.documents import router as documents_router
from routes.polls import router as polls_router
from routes.smart_devices import router as smart_devices_router
from routes.newsletters import router as newsletters_router
from routes.companies import router as companies_router
from routes.subscriptions import router as subscriptions_router
from routes.chat import router as chat_router
from routes.search import router as search_router
from routes.scheduled_msgs import router as scheduled_msgs_router
from routes.services import router as services_router
from routes.family import router as family_router
from routes.admin_registration import router as admin_reg_router
from routes.admin_users import router as admin_users_router
from routes.security import router as security_router
from routes.push_email import router as push_email_router
from routes.compounds import router as compounds_router2
from routes.utility import router as utility_router
from routes.compound_services import router as compound_services_router
from routes.dashboard import router as dashboard_router
from routes.user_profile import router as user_profile_router
from routes.trial import router as trial_router
from routes.analytics import router as analytics_router
from routes.individual import router as individual_router
from routes.super_accounts import router as super_accounts_router
from routes.payments import router as payments_router
from routes.auth import router as auth_router
from routes.families_msgs import router as families_msgs_router
from routes.db_admin import router as db_admin_router
from routes.gallery_init import router as gallery_init_router
from routes.paypal import router as paypal_router
from routes.coupons import router as coupons_router
from routes.ads import router as ads_router
from routes.referrals import router as referrals_router
from routes.invoices import router as invoices_router
from routes.email_notifications import router as email_notif_router
from routes.management_contracts import router as mgmt_contracts_router
from routes.advertiser import router as advertiser_router
from routes.compound_admin import router as compound_admin_router
from routes.company_admin import router as company_admin_router
from routes.compound_invites import router as compound_invites_router
from routes.family_invites import router as family_invites_router
from routes.invite_stats import router as invite_stats_router
from routes.invite_drip import router as invite_drip_router
from routes.sidebar_alerts import router as sidebar_alerts_router
from routes.compound_subscription import router as compound_subscription_router
from routes.linked_accounts import router as linked_accounts_router
from routes.payment_analytics import router as payment_analytics_router
from routes.alerts import router as alerts_router
from routes.blog import router as blog_router
from routes.email_verification import router as email_verification_router

app.include_router(monitoring_router)
app.include_router(blog_router)
app.include_router(email_verification_router)
app.include_router(finance_router)
app.include_router(ratings_router2)
app.include_router(contracts_router)
app.include_router(compound_payment_methods_router)
app.include_router(payment_proofs_router)
app.include_router(bulk_import_residents_router)
app.include_router(sidebar_badges_router)
app.include_router(complaints_router)
app.include_router(superadmin_router)
app.include_router(superadmin_gifts_router)
app.include_router(superadmin_companies_router)
app.include_router(superadmin_campaigns_router)
app.include_router(support_router)
app.include_router(mgmt_contracts_router)
app.include_router(advertiser_router)
app.include_router(compound_admin_router)
app.include_router(company_admin_router)
app.include_router(compound_invites_router)
app.include_router(family_invites_router)
app.include_router(invite_stats_router)
app.include_router(invite_drip_router)
from routes.system_health import router as system_health_router
app.include_router(system_health_router)
from routes.audit_logs import router as audit_logs_router
app.include_router(audit_logs_router)
from routes.onboarding import router as onboarding_router
app.include_router(onboarding_router)
from routes.owner_kpis import router as owner_kpis_router
app.include_router(owner_kpis_router)
from routes.visitor_passes import router as visitor_passes_router
from routes.pdf_reports import router as pdf_reports_router
from routes.two_factor import router as two_factor_router
from routes.monthly_reports_scheduler import router as monthly_reports_router
from routes.smtp_health import router as smtp_health_router
from routes.compound_branding import router as compound_branding_router
from routes.email_templates import router as email_templates_router
app.include_router(visitor_passes_router)
app.include_router(pdf_reports_router)
app.include_router(two_factor_router)
app.include_router(monthly_reports_router)
app.include_router(smtp_health_router)
app.include_router(compound_branding_router)
app.include_router(email_templates_router)
from routes.media_health import router as media_health_router
app.include_router(media_health_router)
from routes.user_crm import router as user_crm_router
app.include_router(user_crm_router)
from routes.company_referrals import router as company_referrals_router
app.include_router(company_referrals_router)
from routes.app_branding import router as app_branding_router
app.include_router(app_branding_router)
from routes.smoke_test import router as smoke_test_router
app.include_router(smoke_test_router)
from routes.perf_budget import router as perf_budget_router
app.include_router(perf_budget_router)
from routes.impersonate import router as impersonate_router
app.include_router(impersonate_router)

from routes.disaster_recovery import router as disaster_recovery_router
app.include_router(disaster_recovery_router)

from routes.stripe_payments import router as stripe_payments_router
app.include_router(stripe_payments_router)

from routes.app_version import router as app_version_router
app.include_router(app_version_router)
from routes.user_timeline import router as user_timeline_router
app.include_router(user_timeline_router)
app.include_router(sidebar_alerts_router)
app.include_router(compound_subscription_router)
app.include_router(linked_accounts_router)
app.include_router(payment_analytics_router)
app.include_router(alerts_router)
app.include_router(exports_router)
app.include_router(facilities_router)
app.include_router(maintenance_router)
app.include_router(notifications_router)
app.include_router(guests_router)
app.include_router(announcements_router)
app.include_router(documents_router)
app.include_router(polls_router)
app.include_router(smart_devices_router)
app.include_router(newsletters_router)
app.include_router(companies_router)
app.include_router(subscriptions_router)
app.include_router(chat_router)
app.include_router(search_router)
app.include_router(scheduled_msgs_router)
app.include_router(services_router)
app.include_router(family_router)
app.include_router(admin_reg_router)
app.include_router(admin_users_router)
app.include_router(security_router)
app.include_router(push_email_router)
app.include_router(compounds_router2)
app.include_router(utility_router)
app.include_router(compound_services_router)
app.include_router(dashboard_router)
app.include_router(user_profile_router)
app.include_router(trial_router)
app.include_router(analytics_router)
app.include_router(individual_router)
app.include_router(super_accounts_router)
app.include_router(payments_router)
app.include_router(auth_router)
app.include_router(families_msgs_router)
app.include_router(db_admin_router)
app.include_router(gallery_init_router)
app.include_router(paypal_router)
app.include_router(coupons_router)
app.include_router(ads_router)
app.include_router(referrals_router)
app.include_router(invoices_router)
app.include_router(email_notif_router)
from routes.translations import router as translations_router
app.include_router(translations_router, prefix="/api", tags=["translations"])
from routes.owner_subscriptions import router as owner_subs_router
app.include_router(owner_subs_router, tags=["owner"])
from routes.owner_budget import router as owner_budget_router
app.include_router(owner_budget_router, tags=["owner"])
from routes.owner_reminders import router as owner_reminders_router
app.include_router(owner_reminders_router, tags=["owner"])
from routes.ai_assistant import router as ai_assistant_router
app.include_router(ai_assistant_router)
from routes.feature_flags import router as feature_flags_router
app.include_router(feature_flags_router)
from routes.ai_insights import router as ai_insights_router
app.include_router(ai_insights_router)
from routes.ai_actions import router as ai_actions_router
app.include_router(ai_actions_router)
from routes.ai_autopilot import router as ai_autopilot_router
app.include_router(ai_autopilot_router)
from routes.stripe_subscriptions import router as stripe_subs_router
app.include_router(stripe_subs_router)
from routes.subscription_migration import router as sub_migration_router
app.include_router(sub_migration_router)
from routes.subscription_analytics import router as sub_analytics_router
app.include_router(sub_analytics_router)
from routes.subscription_trend import router as sub_trend_router
app.include_router(sub_trend_router)
from routes.legal_pages import router as legal_pages_router
from routes.testimonials import router as testimonials_router
app.include_router(legal_pages_router)
app.include_router(testimonials_router)
# ==================== END ROUTE IMPORTS ====================

# Include the main API router (for routes still in server.py)
app.include_router(api_router)


@app.on_event("startup")
async def start_renewal_reminders():
    """Background loop sending subscription renewal reminders (07:30 UTC daily)."""
    import asyncio as _asyncio
    from renewal_reminders import renewal_reminder_loop
    _asyncio.create_task(renewal_reminder_loop())
    logging.info("Renewal reminder loop scheduled (07:30 UTC)")


@app.on_event("startup")
async def ensure_db_indexes():
    """Ensure performance indexes exist (idempotent)."""
    try:
        from db_indexes import ensure_indexes
        n = await ensure_indexes()
        logging.info(f"DB indexes ensured ({n} applied)")
    except Exception as e:
        logging.warning(f"ensure_indexes failed: {e}")


@app.on_event("startup")
async def setup_email_verification():
    """One-shot migration + TTL index for email verification.

    - Backfills every existing user with email_verified=True so the new login
      gate doesn't lock anyone out who registered before this feature shipped.
    - Creates a TTL index on email_verification_tokens.expires_at so expired
      tokens auto-purge.
    """
    try:
        from database import get_db
        db_local = get_db()
        # Mark every existing user that doesn't yet have the field as verified.
        # New self-registrations explicitly set the field, so this only catches
        # legacy accounts.
        result = await db_local.users.update_many(
            {"email_verified": {"$exists": False}},
            {"$set": {"email_verified": True}},
        )
        if result.modified_count:
            logging.info(f"Email verification migration: {result.modified_count} legacy users marked verified")

        # TTL index: Mongo will drop documents once expires_at < now.
        await db_local.email_verification_tokens.create_index(
            "expires_at",
            expireAfterSeconds=0,
            name="email_verif_ttl",
        )
        # Uniqueness on token (defense in depth — secrets.token_urlsafe collisions are astronomical).
        await db_local.email_verification_tokens.create_index("token", unique=True, name="email_verif_token_uniq")
        # Lookup helper for resend cooldown queries.
        await db_local.email_verification_tokens.create_index(
            [("email", 1), ("created_at", -1)],
            name="email_verif_email_created",
        )
        logging.info("Email verification indexes ensured")
    except Exception as e:
        logging.warning(f"setup_email_verification failed: {e}")


@app.on_event("startup")
async def backfill_contract_expenses():
    """One-time idempotent sync: ensure every contract has a linked expense entry."""
    import asyncio as _asyncio

    async def _runner():
        await _asyncio.sleep(8)  # let DB connection settle
        try:
            from database import get_db
            from routes.contracts import _sync_contract_expense
            db = get_db()
            contracts = await db.contracts.find({}, {"_id": 0}).to_list(2000)
            synced = 0
            for c in contracts:
                if not c.get("id"):
                    continue
                exists = await db.expenses.find_one({"contract_id": c["id"]}, {"_id": 1})
                if not exists:
                    await _sync_contract_expense(db, c)
                    synced += 1
            if synced:
                logging.info(f"Contract→expense backfill on boot: synced {synced} contracts")
        except Exception as e:
            logging.warning(f"contract backfill on boot failed: {e}")

        # Also auto-sync the changelog from file
        try:
            from database import get_db as _gdb
            from routes.app_version import sync_changelog_from_file
            n = await sync_changelog_from_file(_gdb())
            logging.info(f"Changelog auto-sync from file: {n} entries refreshed")
        except Exception as e:
            logging.warning(f"changelog auto-sync failed: {e}")

    _asyncio.create_task(_runner())


@app.on_event("startup")
async def start_monthly_reports_scheduler():
    """Background loop that emails monthly PDF reports (runs at 02:00 UTC, only on day 1)."""
    import asyncio as _asyncio
    from routes.monthly_reports_scheduler import monthly_reports_loop
    _asyncio.create_task(monthly_reports_loop())
    logging.info("Monthly PDF reports scheduler started (02:00 UTC, day 1 of each month)")


@app.on_event("startup")
async def start_smtp_alerts_loop():
    """Hourly SMTP failure-rate alerting loop."""
    import asyncio as _asyncio
    from smtp_alerts import smtp_alert_loop
    _asyncio.create_task(smtp_alert_loop())
    logging.info("SMTP alert loop started (hourly check)")


@app.on_event("startup")
async def start_autopilot_loop():
    """AI Auto-Pilot scheduler — wakes every 15 min to check enabled configs."""
    import asyncio as _asyncio
    from routes.ai_autopilot import autopilot_loop
    _asyncio.create_task(autopilot_loop())
    logging.info("AI Auto-Pilot scheduler started (15-min interval)")


@app.on_event("startup")
async def start_autopilot_digest_loop():
    """Weekly AutoPilot digest — Monday 08:00 UTC."""
    import asyncio as _asyncio
    from services.autopilot_digest import autopilot_digest_loop
    _asyncio.create_task(autopilot_digest_loop())
    logging.info("AI AutoPilot Weekly Digest scheduler started (Mondays 08:00 UTC)")


@app.on_event("startup")
async def start_daily_health_scan():
    """Start the daily route-health auto-scan background task (~06:00 UTC)."""
    import asyncio as _asyncio
    from routes.system_health import daily_health_scan_loop
    _asyncio.create_task(daily_health_scan_loop(app))
    logging.info("Daily route-health scan loop scheduled (06:00 UTC)")


@app.on_event("startup")
async def start_media_backup_loop():
    """Daily media-backup snapshot of /app/uploads/* into /app/backups/media/YYYY-MM-DD/ (03:00 UTC)."""
    import asyncio as _asyncio
    from services.media_backup import media_backup_loop, take_snapshot
    # Take one snapshot on startup so we always have at least one recovery point
    try:
        res = take_snapshot()
        logging.info(f"Initial media snapshot: {res}")
    except Exception as e:
        logging.warning(f"Initial media snapshot failed: {e}")
    _asyncio.create_task(media_backup_loop())
    logging.info("Media backup loop scheduled (03:00 UTC daily)")


@app.on_event("startup")
async def start_smoke_test_monitor():
    """Synthetic monitor: run smoke tests every 30 min; alert owners on new failures."""
    import asyncio as _asyncio
    from routes.smoke_test import smoke_test_monitor_loop
    _asyncio.create_task(smoke_test_monitor_loop())
    logging.info("Smoke-test synthetic monitor started (30 min interval)")


@app.on_event("startup")
async def start_daily_report_scheduler():
    """Start the daily report background task"""
    global _daily_report_task
    import asyncio

    async def daily_report_scheduler():
        """Run daily report at 7:00 AM every day"""
        while True:
            now = datetime.now()
            next_run = now.replace(hour=7, minute=0, second=0, microsecond=0)
            if now >= next_run:
                next_run += timedelta(days=1)
            wait_seconds = (next_run - now).total_seconds()
            logging.info(f"Next daily report scheduled at {next_run} (in {wait_seconds/3600:.1f} hours)")
            await asyncio.sleep(wait_seconds)
            count = await send_daily_reports_for_all_compounds()
            logging.info(f"Daily report cron completed: {count} emails sent")
            try:
                from routes.contracts import check_expiring_contracts
                await check_expiring_contracts()
                logging.info("Contract expiry check completed")
            except Exception as e:
                logging.error(f"Contract check error: {e}")
            try:
                from routes.push_email import check_expiring_subscriptions
                await check_expiring_subscriptions()
                logging.info("Subscription expiry check completed")
            except Exception as e:
                logging.error(f"Subscription check error: {e}")
            try:
                from routes.superadmin import run_auto_renewal_if_due
                res = await run_auto_renewal_if_due()
                logging.info(f"Auto renewal check completed: {res}")
            except Exception as e:
                logging.error(f"Auto renewal error: {e}")
            try:
                from routes.invite_drip import _process_drip
                d = await _process_drip()
                logging.info(f"Invite drip pass: scanned={d.get('scanned')} sent={d.get('sent')} errors={d.get('errors')}")
            except Exception as e:
                logging.error(f"Invite drip error: {e}")

    _daily_report_task = asyncio.create_task(daily_report_scheduler())
    logging.info("Daily report scheduler started (7:00 AM daily)")

    # Weekly Ad Report Scheduler (Sundays at 8:00 AM)
    async def weekly_ad_report_scheduler():
        while True:
            now = datetime.now()
            # Find next Sunday at 8:00 AM
            days_until_sunday = (6 - now.weekday()) % 7
            if days_until_sunday == 0 and now.hour >= 8:
                days_until_sunday = 7
            next_sunday = (now + timedelta(days=days_until_sunday)).replace(hour=8, minute=0, second=0, microsecond=0)
            wait_seconds = (next_sunday - now).total_seconds()
            logging.info(f"Next weekly ad report scheduled at {next_sunday} (in {wait_seconds/3600:.1f} hours)")
            await asyncio.sleep(wait_seconds)
            try:
                from routes.ads import send_weekly_report_auto
                result = await send_weekly_report_auto()
                logging.info(f"Weekly ad report sent: {result}")
            except Exception as e:
                logging.error(f"Weekly ad report error: {e}")

    asyncio.create_task(weekly_ad_report_scheduler())
    logging.info("Weekly ad report scheduler started (Sundays 8:00 AM)")

    # CTR Alert Checker (every 6 hours)
    async def ctr_alert_checker():
        await asyncio.sleep(60)  # Wait 1 min after startup
        while True:
            try:
                from routes.ads import check_ctr_alerts_and_notify
                count = await check_ctr_alerts_and_notify()
                if count > 0:
                    logging.info(f"CTR alert check: {count} high CTR ads found and notified")
            except Exception as e:
                logging.error(f"CTR alert check error: {e}")
            await asyncio.sleep(6 * 3600)  # 6 hours

    asyncio.create_task(ctr_alert_checker())
    logging.info("CTR alert checker started (every 6 hours)")

# Push/Email/Reminders routes extracted to routes/


@app.on_event("startup")
async def startup_db_client():
    """Initialize database connection and indexes"""
    global client, db
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Also initialize the shared database module for extracted routes
    import database as db_module
    db_module._client = client
    db_module._db = db
    
    # Reinitialize WebAuthn service with the actual db connection
    try:
        from routes.auth import webauthn_service
        webauthn_service.db = db
    except Exception:
        pass
    
    # Create text indexes for search functionality
    await create_text_index()
    
    # Seed super admin if not exists
    existing_super = await db.users.find_one({"role": "super_admin"})
    if not existing_super:
        super_admin = {
            "id": str(uuid.uuid4()),
            "username": "superadmin",
            "email": "superadmin@homeme.app",
            "password_hash": hash_password("SuperAdmin2024!"),
            "role": "super_admin",
            "full_name": "Super Admin",
            "compound_id": "",
            "phone": "",
            "unit_number": "",
            "is_active": True,
            "is_family_head": False,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(super_admin)
        logging.info("Super Admin account created (superadmin / SuperAdmin2024!)")

    # Seed app owner if not exists
    existing_owner = await db.users.find_one({"role": "app_owner"})
    if not existing_owner:
        app_owner = {
            "id": str(uuid.uuid4()),
            "username": "Owner_homeme",
            "email": "dalia@datalifeai.com",
            "password_hash": hash_password("Dalia1234@"),
            "role": "app_owner",
            "full_name": "Dalia Abou El Magd",
            "compound_id": "",
            "phone": "",
            "unit_number": "",
            "is_active": True,
            "is_family_head": False,
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(app_owner)
        logging.info("App Owner account created (Owner_homeme / Dalia1234@)")
    
    logging.info("Database connection and indexes initialized")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ==================== SPA CATCH-ALL ====================
# Serve React frontend build for production deployment
# This must be the LAST route to not interfere with API routes
import os as _os
_frontend_build = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))), "frontend", "build")

if _os.path.exists(_frontend_build) and _os.path.exists(_os.path.join(_frontend_build, "static")):
    from fastapi.responses import FileResponse as _FileResponse

    # Serve static assets from build
    app.mount("/static", StaticFiles(directory=_os.path.join(_frontend_build, "static")), name="frontend_static")

    # Serve other build files (manifest, icons, etc.)
    @app.get("/manifest.json")
    @app.get("/favicon.ico")
    @app.get("/logo192.png")
    @app.get("/logo512.png")
    @app.get("/robots.txt")
    @app.get("/ads.txt")
    async def serve_build_file(request: Request):
        file_path = _os.path.join(_frontend_build, request.url.path.lstrip("/"))
        if _os.path.exists(file_path):
            return _FileResponse(file_path)
        raise HTTPException(404)

    # SPA catch-all: serve index.html for any non-API route
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't catch API routes or upload routes
        if full_path.startswith("api/") or full_path.startswith("uploads/"):
            raise HTTPException(404)
        index_path = _os.path.join(_frontend_build, "index.html")
        if _os.path.exists(index_path):
            return _FileResponse(index_path, media_type="text/html")
        raise HTTPException(404, "Frontend build not found")
