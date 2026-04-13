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

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    SUPER_ADMIN = "super_admin"  # App owner - sees everything
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
    file_url = f"/uploads/{unique_filename}"
    
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
                thumbnail_url = f"/uploads/{thumbnail_filename}"
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
        }).to_list(None)
        
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
        }).to_list(None)
        
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
        
        messages = await cursor.to_list(None)
        
        # Get total count for pagination
        total_count = await db.chat_messages.count_documents(query)
        
        # Get sender details
        sender_ids = list(set(msg["sender_id"] for msg in messages))
        senders = await db.users.find(
            {"id": {"$in": sender_ids}},
            {"id": 1, "full_name": 1, "username": 1}
        ).to_list(None)
        senders_dict = {sender["id"]: sender for sender in senders}
        
        # Get chat details
        chat_ids = list(set(msg["chat_id"] for msg in messages))
        chats = await db.chats.find(
            {"id": {"$in": chat_ids}},
            {"id": 1, "name": 1, "chat_type": 1, "participants": 1}
        ).to_list(None)
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
        }).to_list(None)
        
        user_chat_ids = [chat["id"] for chat in user_chats]
        
        # Get recent searches
        recent_searches = await db.search_history.find({
            "user_id": user_id,
            "query": {"$regex": query, "$options": "i"}
        }).sort("created_at", -1).limit(5).to_list(None)
        
        suggestions.extend([search["query"] for search in recent_searches])
        
        # Get common words from recent messages
        if len(query) >= 2:
            recent_messages = await db.chat_messages.find({
                "chat_id": {"$in": user_chat_ids},
                "content": {"$regex": query, "$options": "i"},
                "is_deleted": False
            }).sort("created_at", -1).limit(20).to_list(None)
            
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
        }).to_list(None)
        
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
        
        messages = await cursor.to_list(None)
        
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
        ).to_list(None)
        senders_dict = {sender["id"]: sender for sender in senders}
        
        # Get chat details
        chat_ids = list(set(msg["chat_id"] for msg in messages))
        chats = await db.chats.find(
            {"id": {"$in": chat_ids}},
            {"id": 1, "name": 1, "chat_type": 1}
        ).to_list(None)
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
        
        stats = await db.chat_messages.aggregate(pipeline).to_list(None)
        
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
        }).to_list(None)
        
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
    chats = await db.chats.find({"compound_id": compound_id}).limit(500).to_list(None)
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
        }).to_list(None)
        
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
@limiter.limit("3/minute")  # Rate limit: 3 registration attempts per minute
async def register(user_data: UserCreate, request: Request):
    # Validate password strength
    is_valid, error_message = validate_password_strength(user_data.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_message)
    
    # Check if username or email already exists
    existing_user = await db.users.find_one({
        "$or": [{"username": user_data.username}, {"email": user_data.email}]
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    # Check subscription code if provided
    subscription_info = None
    if user_data.subscription_code:
        # Use SubscriptionCodeManager to verify and apply code
        verification = await SubscriptionCodeManager.verify_code(
            user_data.subscription_code.upper().strip(),
            None  # No user_id yet since user not created
        )
        
        if not verification.get("valid"):
            error_message = verification.get("error", "invalid_code")
            error_messages = {
                "code_not_found": "Invalid subscription code",
                "code_deactivated": "This code has been deactivated",
                "code_expired": "This code has expired",
                "code_max_uses_reached": "This code has reached maximum uses",
                "verification_error": "Error verifying code"
            }
            raise HTTPException(
                status_code=400, 
                detail=error_messages.get(error_message, "Invalid subscription code")
            )
        
        subscription_info = verification
    
    # Hash password
    password_hash = hash_password(user_data.password)
    
    # Use default compound_id if not provided
    compound_id = user_data.compound_id if user_data.compound_id else "default-compound"
    
    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=password_hash,
        role=user_data.role,
        compound_id=compound_id,
        full_name=user_data.full_name,
        phone=user_data.phone,
        unit_number=user_data.unit_number,
        is_family_head=(user_data.role == UserRole.RESIDENT)
    )
    
    # Add subscription info if code was used
    user_dict = user.dict()
    if subscription_info:
        subscription_end = datetime.now(timezone.utc) + timedelta(days=subscription_info["duration_days"])
        user_dict["subscription_active"] = True
        user_dict["subscription_type"] = subscription_info["type"]
        user_dict["subscription_start"] = datetime.now(timezone.utc).isoformat()
        user_dict["subscription_end"] = subscription_end.isoformat()
        user_dict["subscription_code_used"] = user_data.subscription_code.upper().strip()
    else:
        # No subscription code - give automatic 30-day free trial
        trial_end = datetime.now(timezone.utc) + timedelta(days=30)
        user_dict["subscription_active"] = True
        user_dict["subscription_type"] = "trial"
        user_dict["subscription_start"] = datetime.now(timezone.utc).isoformat()
        user_dict["subscription_end"] = trial_end.isoformat()
        user_dict["trial_used"] = True
    
    await db.users.insert_one(user_dict)
    
    # Apply subscription code after user is created
    if subscription_info:
        await SubscriptionCodeManager.apply_code(
            user_data.subscription_code.upper().strip(),
            user.id,
            user.username
        )
    
    # Create family if resident
    if user_data.role == UserRole.RESIDENT and user_data.unit_number:
        family = Family(
            compound_id=user_data.compound_id,
            unit_number=user_data.unit_number,
            head_user_id=user.id,
            members=[user.id]
        )
        await db.families.insert_one(family.dict())
        
        # Update user with family_id
        await db.users.update_one(
            {"id": user.id},
            {"$set": {"family_id": family.id}}
        )
    
    # Send welcome email (async, don't wait for result)
    try:
        compound_name = None
        if compound_id and compound_id != "default-compound":
            compound = await db.compounds.find_one({"id": compound_id})
            if compound:
                compound_name = compound.get("name")
        
        asyncio.create_task(
            email_service.send_welcome_email(
                to_email=user_data.email,
                full_name=user_data.full_name,
                username=user_data.username,
                compound_name=compound_name
            )
        )
        
        # Notify admins of new resident
        if user_data.role == UserRole.RESIDENT:
            admins = await db.users.find({"role": "admin", "compound_id": compound_id}).to_list(length=10)
            for admin in admins:
                if admin.get("email"):
                    asyncio.create_task(
                        email_service.send_new_resident_notification(
                            admin_email=admin["email"],
                            admin_name=admin.get("full_name", "Admin"),
                            new_resident_name=user_data.full_name,
                            unit_number=user_data.unit_number,
                            compound_name=compound_name or "Default Compound"
                        )
                    )
    except Exception as e:
        # Log email error but don't fail registration
        logging.error(f"Failed to send welcome email: {str(e)}")
    
    return {
        "message": "User registered successfully",
        "user_id": user.id,
        "subscription_active": True,
        "subscription_type": user_dict.get("subscription_type", "trial"),
        "subscription_end": user_dict.get("subscription_end")
    }

@api_router.post("/auth/create-admin")
async def create_admin_user():
    """Create default admin user for production - TEMPORARY ENDPOINT"""
    
    # Check if admin already exists
    existing_admin = await db.users.find_one({"username": "admin"})
    if existing_admin:
        return {"message": "Admin user already exists", "admin_id": existing_admin["id"]}
    
    # Create default compound
    compound = Compound(
        name="Default Compound",
        address="Default Address"
    )
    await db.compounds.insert_one(compound.dict())
    
    # Create admin user
    admin_user = User(
        username="admin",
        password_hash=hash_password("admin123"),
        role=UserRole.ADMIN,
        compound_id=compound.id,
        full_name="System Administrator",
        phone="1234567890"
    )
    
    await db.users.insert_one(admin_user.dict())
    
    return {
        "message": "Admin user created successfully", 
        "username": "admin",
        "password": "admin123",
        "admin_id": admin_user.id,
        "compound_id": compound.id
    }

@api_router.post("/auth/login")
@limiter.limit("5/minute")  # Rate limit: 5 login attempts per minute
async def login(user_data: UserLogin, request: Request):
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        # Log failed login attempt
        await ActivityLogger.log_activity(
            action_type="login",
            username=user_data.username,
            details="Failed login attempt - Invalid credentials",
            ip_address=request.client.host if request.client else None,
            status="failed"
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user["is_active"]:
        # Log inactive account login attempt
        await ActivityLogger.log_activity(
            action_type="login",
            username=user_data.username,
            details="Failed login attempt - Account disabled",
            ip_address=request.client.host if request.client else None,
            status="failed"
        )
        raise HTTPException(status_code=401, detail="Account is disabled")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    # Get compound name if compound_id exists
    compound_name = None
    if user.get("compound_id"):
        compound = await db.compounds.find_one({"id": user["compound_id"]})
        if compound:
            compound_name = compound.get("name", "Unknown Compound")
    
    # Log successful login
    await ActivityLogger.log_activity(
        action_type="login",
        username=user_data.username,
        details=f"Successful login - Role: {user['role']}",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "compound_id": user["compound_id"],
            "compound_name": compound_name,
            "unit_number": user.get("unit_number"),
            "full_name": user["full_name"],
            "is_family_head": user.get("is_family_head", False),
            "family_id": user.get("family_id")
        }
    }

@api_router.get("/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current authenticated user information"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "compound_id": current_user.compound_id,
        "full_name": current_user.full_name,
        "is_family_head": getattr(current_user, 'is_family_head', False),
        "family_id": getattr(current_user, 'family_id', None)
    }

# WebAuthn/Biometric Authentication Routes
webauthn_service = WebAuthnService(db)

@api_router.post("/webauthn/register/options")
async def webauthn_register_options(data: WebAuthnRegisterOptions, request: Request, current_user: User = Depends(get_current_user)):
    """Get registration options for biometric"""
    origin = request.headers.get('origin', request.headers.get('referer', 'https://localhost'))
    options = await webauthn_service.get_register_options(data.user_id, data.username, origin)
    return options

@api_router.post("/webauthn/register/verify")
async def webauthn_register_verify(data: WebAuthnRegisterVerify, current_user: User = Depends(get_current_user)):
    """Verify and store biometric registration"""
    result = await webauthn_service.verify_registration(
        data.user_id, data.credential_id, data.client_data_json, data.attestation_object
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Registration failed"))
    return result

@api_router.post("/webauthn/login/options")
async def webauthn_login_options(data: WebAuthnLoginOptions, request: Request):
    """Get login options for biometric authentication"""
    origin = request.headers.get('origin', request.headers.get('referer', 'https://localhost'))
    options, error = await webauthn_service.get_login_options(data.username, origin)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return options

@api_router.post("/webauthn/login/verify")
async def webauthn_login_verify(data: WebAuthnLoginVerify, request: Request):
    """Verify biometric login and return token"""
    user, error = await webauthn_service.verify_login(
        data.username, data.credential_id, data.client_data_json,
        data.authenticator_data, data.signature
    )
    
    if error:
        raise HTTPException(status_code=401, detail=error)
    
    # Generate JWT token
    token = create_access_token(data={"sub": user["id"]})
    
    # Log successful biometric login
    await ActivityLogger.log_activity(
        action_type="login",
        user_id=user["id"],
        username=user["username"],
        details="Biometric login successful",
        ip_address=request.client.host if request.client else None,
        status="success"
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "compound_id": user.get("compound_id"),
            "full_name": user.get("full_name", user["username"])
        }
    }

@api_router.get("/webauthn/check/{username}")
async def webauthn_check(username: str):
    """Check if user has biometric registered"""
    has_biometric = await webauthn_service.has_biometric(username)
    return {"has_biometric": has_biometric}

@api_router.delete("/webauthn/remove")
async def webauthn_remove(current_user: User = Depends(get_current_user)):
    """Remove biometric credential"""
    success = await webauthn_service.remove_biometric(current_user.id)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to remove biometric")
    return {"message": "Biometric removed successfully"}

# Compound Management Routes
# Compounds CRUD extracted to routes/
@api_router.post("/families/{family_id}/members")
async def add_family_member(
    family_id: str,
    member_data: FamilyMemberAdd,
    current_user: User = Depends(get_current_user)
):
    # Check if user is family head
    family = await db.families.find_one({"id": family_id})
    if not family or family["head_user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Only family head can add members")
    
    # Create family member
    password_hash = hash_password(member_data.password)
    member = User(
        username=member_data.username,
        email=member_data.email,
        password_hash=password_hash,
        role=UserRole.RESIDENT,
        compound_id=current_user.compound_id,
        family_id=family_id,
        full_name=member_data.full_name,
        phone=member_data.phone,
        unit_number=family["unit_number"],
        is_family_head=False
    )
    
    await db.users.insert_one(member.dict())
    
    # Add to family members
    await db.families.update_one(
        {"id": family_id},
        {"$addToSet": {"members": member.id}}
    )
    
    return {"message": "Family member added successfully", "member_id": member.id}

@api_router.get("/families/my")
async def get_my_family(current_user: User = Depends(get_current_user)):
    if not current_user.family_id:
        return {"family": None, "members": []}
    
    family = await db.families.find_one({"id": current_user.family_id})
    if not family:
        return {"family": None, "members": []}
    
    # Get family members
    members = await db.users.find(
        {"id": {"$in": family["members"]}},
        {"password_hash": 0}  # Exclude password
    ).to_list(None)
    
    return {"family": serialize_datetime(family), "members": serialize_datetime(members)}

# Financial Management Routes
@api_router.post("/maintenance-fees")
async def create_maintenance_fee(
    fee_data: MaintenanceFeeCreate,
    current_user: User = Depends(require_admin)
):
    fee = MaintenanceFee(
        compound_id=current_user.compound_id,
        unit_number=fee_data.unit_number,
        amount=fee_data.amount,
        due_date=fee_data.due_date,
        description=fee_data.description,
        created_by=current_user.id
    )
    
    await db.maintenance_fees.insert_one(fee.dict())
    
    # Create invoice for the family
    family = await db.families.find_one({
        "compound_id": current_user.compound_id,
        "unit_number": fee_data.unit_number
    })
    
    if family:
        invoice = Invoice(
            compound_id=current_user.compound_id,
            family_id=family["id"],
            unit_number=fee_data.unit_number,
            amount=fee_data.amount,
            description=fee_data.description,
            due_date=fee_data.due_date,
            created_by=current_user.id
        )
        await db.invoices.insert_one(invoice.dict())
    
    return {"message": "Maintenance fee created successfully", "fee_id": fee.id}

@api_router.get("/invoices/my")
async def get_my_invoices(current_user: User = Depends(get_current_user)):
    # Admin users can see all invoices in their compound
    if current_user.role == "admin":
        invoices = await db.invoices.find({"compound_id": current_user.compound_id}).to_list(None)
        return serialize_datetime(invoices)
    
    # Regular users see only invoices for units they own
    # Find all families where user is head or member
    families = await db.families.find({
        "$or": [
            {"head_user_id": current_user.id},
            {"members": current_user.id}
        ],
        "compound_id": current_user.compound_id
    }).to_list(None)
    
    if not families:
        return []
    
    # Get family IDs for the user's units
    family_ids = [family["id"] for family in families]
    
    # Get invoices for all the user's units
    invoices = await db.invoices.find({
        "family_id": {"$in": family_ids},
        "compound_id": current_user.compound_id
    }).to_list(None)
    
    return serialize_datetime(invoices)

@api_router.post("/payments")
async def create_payment(
    payment_data: PaymentCreate,
    current_user: User = Depends(get_current_user)
):
    # Get invoice
    invoice = await db.invoices.find_one({"id": payment_data.invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Admin users can pay invoices for any family in their compound
    if current_user.role == "admin":
        if invoice["compound_id"] != current_user.compound_id:
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        # Regular users can only pay their own family's invoices
        if invoice["family_id"] != current_user.family_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Create mock payment
    # Use the invoice's family_id to properly associate the payment
    payment_family_id = invoice["family_id"] if current_user.role == "admin" else current_user.family_id
    payment = Payment(
        invoice_id=payment_data.invoice_id,
        family_id=payment_family_id,
        amount=invoice["amount"],
        payment_method=payment_data.payment_method,
        transaction_id=f"mock_{uuid.uuid4().hex[:8]}"
    )
    
    await db.payments.insert_one(payment.dict())
    
    # Update invoice status
    await db.invoices.update_one(
        {"id": payment_data.invoice_id},
        {"$set": {"status": PaymentStatus.PAID}}
    )
    
    return {"message": "Payment processed successfully", "payment_id": payment.id, "transaction_id": payment.transaction_id}

# Communication Routes
@api_router.post("/messages")
async def create_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    message = Message(
        compound_id=current_user.compound_id,
        sender_id=current_user.id,
        message_type=message_data.message_type,
        subject=message_data.subject,
        content=message_data.content
    )
    
    await db.messages.insert_one(message.dict())
    
    # Notify admins about new message
    notification = Notification(
        compound_id=current_user.compound_id,
        sender_id=current_user.id,
        title=f"New {message_data.message_type.replace('_', ' ').title()}",
        content=f"{current_user.full_name}: {message_data.subject}"
    )
    
    # Get admin IDs
    admins = await db.users.find(
        {"compound_id": current_user.compound_id, "role": UserRole.ADMIN}
    ).to_list(None)
    admin_ids = [admin["id"] for admin in admins]
    notification.recipient_ids = admin_ids
    
    await db.notifications.insert_one(notification.dict())
    
    # Send real-time notification
    notification_message = json.dumps({
        "type": "new_message",
        "title": notification.title,
        "content": notification.content,
        "message_id": message.id
    })
    
    for admin_id in admin_ids:
        await manager.send_personal_message(notification_message, admin_id)
    
    return {"message": "Message sent successfully", "message_id": message.id}

@api_router.get("/messages")
async def get_messages(current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.ADMIN:
        messages = await db.messages.find({"compound_id": current_user.compound_id}).sort("created_at", -1).limit(200).to_list(None)
    else:
        messages = await db.messages.find({"sender_id": current_user.id}).sort("created_at", -1).limit(200).to_list(None)
    
    return messages

# Notification Routes
@api_router.post("/notifications")
async def create_notification(
    notification_data: NotificationCreate,
    current_user: User = Depends(require_admin)
):
    notification = Notification(
        compound_id=current_user.compound_id,
        sender_id=current_user.id,
        title=notification_data.title,
        content=notification_data.content,
        recipient_ids=notification_data.recipient_ids or []
    )
    
    await db.notifications.insert_one(notification.dict())
    
    # Send real-time notifications
    notification_message = json.dumps({
        "type": "notification",
        "title": notification.title,
        "content": notification.content,
        "id": notification.id
    })
    
    if notification.recipient_ids:
        # Send to specific recipients
        for user_id in notification.recipient_ids:
            await manager.send_personal_message(notification_message, user_id)
    else:
        # Broadcast to all compound residents
        await manager.broadcast_to_compound(notification_message, current_user.compound_id)
    
    return {"message": "Notification sent successfully", "notification_id": notification.id}

@api_router.get("/notifications/my")
async def get_my_notifications(current_user: User = Depends(get_current_user)):
    # Get notifications for current user
    notifications = await db.notifications.find({
        "compound_id": current_user.compound_id,
        "$or": [
            {"recipient_ids": {"$size": 0}},  # Broadcast notifications
            {"recipient_ids": current_user.id}  # Direct notifications
        ]
    }, {"_id": 0}).sort("created_at", -1).limit(100).to_list(None)
    
    return serialize_datetime(notifications)

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user)
):
    await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {f"is_read.{current_user.id}": True}}
    )
    
    return {"message": "Notification marked as read"}

# Residence Management Routes
@api_router.get("/compounds/{compound_id}/residences")
async def get_compound_residences(compound_id: str, current_user: User = Depends(require_admin)):
    if current_user.compound_id != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all families in the compound
    families = await db.families.find({"compound_id": compound_id}).to_list(None)
    
    # Get all residents
    residents = await db.users.find({
        "compound_id": compound_id,
        "role": UserRole.RESIDENT
    }, {"password_hash": 0}).to_list(None)
    
    # Create residence list with occupancy information
    residences = []
    occupied_units = set()
    
    for family in families:
        # Get family members - convert ObjectId to string safely
        family_member_ids = family.get("members", [])
        family_members = []
        
        for resident in residents:
            if resident.get("id") in family_member_ids:
                # Clean up resident data for JSON serialization
                clean_resident = {
                    "id": resident.get("id"),
                    "username": resident.get("username"),
                    "email": resident.get("email"),
                    "full_name": resident.get("full_name"),
                    "phone": resident.get("phone"),
                    "is_family_head": resident.get("is_family_head", False)
                }
                family_members.append(clean_resident)
        
        # Find family head
        family_head = next((m for m in family_members if m.get("is_family_head", False)), 
                          family_members[0] if family_members else None)
        
        residence = {
            "unit_number": family.get("unit_number"),
            "family_id": family.get("id"),
            "occupancy_status": "occupied",
            "family_head": family_head,
            "family_members": family_members,
            "member_count": len(family_members),
            "created_at": family.get("created_at").isoformat() if family.get("created_at") else None
        }
        residences.append(residence)
        occupied_units.add(family.get("unit_number"))
    
    # Get compound info to potentially show total units (if available)
    compound = await db.compounds.find_one({"id": compound_id})
    compound_data = None
    if compound:
        compound_data = {
            "id": compound.get("id"),
            "name": compound.get("name"),
            "address": compound.get("address"),
            "created_at": compound.get("created_at").isoformat() if compound.get("created_at") else None
        }
    
    return {
        "residences": residences,
        "total_units": len(residences),
        "occupied_units": len(occupied_units),
        "compound": compound_data
    }

@api_router.get("/compounds/{compound_id}/residents")
async def get_compound_residents(compound_id: str, current_user: User = Depends(require_admin)):
    if current_user.compound_id != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all residents in the compound
    residents = await db.users.find({
        "compound_id": compound_id,
        "role": UserRole.RESIDENT
    }, {"password_hash": 0}).to_list(None)
    
    return {
        "residents": residents,
        "total_count": len(residents)
    }

# Database Management Routes (Super Admin Only)
@api_router.get("/database/users")
async def get_all_users(current_user: User = Depends(get_current_user)):
    # Only allow specific super admin users
    if current_user.username not in ["johndoe", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Get all users from database
    users = await db.users.find({}, {"password_hash": 0}).to_list(None)
    
    # Get additional statistics for each user
    user_data = []
    for user in users:
        user_info = {
            "id": user.get("id"),
            "username": user.get("username"),
            "email": user.get("email"),
            "full_name": user.get("full_name"),
            "phone": user.get("phone"),
            "role": user.get("role"),
            "compound_id": user.get("compound_id"),
            "family_id": user.get("family_id"),
            "unit_number": user.get("unit_number"),
            "is_family_head": user.get("is_family_head", False),
            "is_active": user.get("is_active", True),
            "created_at": user.get("created_at").isoformat() if user.get("created_at") else None
        }
        
        # Get user statistics
        if user.get("role") == "resident":
            # Count messages sent
            message_count = await db.messages.count_documents({"sender_id": user.get("id")})
            user_info["message_count"] = message_count
            
            # Count service bookings
            booking_count = await db.service_bookings.count_documents({"resident_id": user.get("id")})
            user_info["booking_count"] = booking_count
            
            # Count pending payments
            pending_invoices = await db.invoices.count_documents({
                "family_id": user.get("family_id"),
                "status": "pending"
            })
            user_info["pending_payments"] = pending_invoices
        else:
            user_info["message_count"] = 0
            user_info["booking_count"] = 0
            user_info["pending_payments"] = 0
        
        user_data.append(user_info)
    
    return {"users": user_data, "total_count": len(user_data)}

@api_router.get("/compounds")
async def get_available_compounds(current_user: User = Depends(get_current_user)):
    """Get all available compounds for compound selection"""
    try:
        compounds = await db.compounds.find({}).to_list(None)
        
        # Serialize datetime objects
        serialized_compounds = [serialize_datetime(compound) for compound in compounds]
        
        return {"compounds": serialized_compounds}
        
    except Exception as e:
        logging.error(f"Error getting compounds: {e}")
        raise HTTPException(status_code=500, detail="Failed to get compounds")

@api_router.get("/database/compounds")
async def get_all_compounds(current_user: User = Depends(get_current_user)):
    if current_user.username not in ["johndoe", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    compounds = await db.compounds.find({}).to_list(100)
    
    # Batch get counts using aggregation to avoid N+1 queries
    compound_ids = [c.get("id") for c in compounds]
    
    user_counts = {}
    admin_counts = {}
    resident_counts = {}
    family_counts = {}
    
    if compound_ids:
        # Get user counts by compound and role in batch
        user_agg = await db.users.aggregate([
            {"$match": {"compound_id": {"$in": compound_ids}}},
            {"$group": {
                "_id": {"compound_id": "$compound_id", "role": "$role"},
                "count": {"$sum": 1}
            }}
        ]).to_list(None)
        
        for item in user_agg:
            cid = item["_id"]["compound_id"]
            role = item["_id"]["role"]
            count = item["count"]
            user_counts[cid] = user_counts.get(cid, 0) + count
            if role == "admin":
                admin_counts[cid] = count
            elif role == "resident":
                resident_counts[cid] = count
        
        # Get family counts by compound in batch
        family_agg = await db.families.aggregate([
            {"$match": {"compound_id": {"$in": compound_ids}}},
            {"$group": {"_id": "$compound_id", "count": {"$sum": 1}}}
        ]).to_list(None)
        
        for item in family_agg:
            family_counts[item["_id"]] = item["count"]
    
    compound_data = []
    for compound in compounds:
        cid = compound.get("id")
        compound_info = {
            "id": cid,
            "name": compound.get("name"),
            "address": compound.get("address"),
            "admin_id": compound.get("admin_id"),
            "additional_admins": compound.get("additional_admins", []),
            "user_count": user_counts.get(cid, 0),
            "admin_count": admin_counts.get(cid, 0),
            "resident_count": resident_counts.get(cid, 0),
            "family_count": family_counts.get(cid, 0),
            "created_at": compound.get("created_at").isoformat() if compound.get("created_at") else None
        }
        compound_data.append(compound_info)
    
    return {"compounds": compound_data}

@api_router.get("/database/statistics")
async def get_system_statistics(current_user: User = Depends(get_current_user)):
    if current_user.username not in ["johndoe", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Get comprehensive system statistics
    total_users = await db.users.count_documents({})
    total_admins = await db.users.count_documents({"role": "admin"})
    total_residents = await db.users.count_documents({"role": "resident"})
    total_compounds = await db.compounds.count_documents({})
    total_families = await db.families.count_documents({})
    total_services = await db.services.count_documents({})
    total_bookings = await db.service_bookings.count_documents({})
    total_messages = await db.messages.count_documents({})
    total_invoices = await db.invoices.count_documents({})
    total_payments = await db.payments.count_documents({})
    total_utility_bills = await db.utility_bills.count_documents({})
    total_notifications = await db.notifications.count_documents({})
    
    # Recent activity
    recent_users = await db.users.find({}, {"password_hash": 0}).sort("created_at", -1).limit(5).to_list(None)
    recent_messages = await db.messages.find({}).sort("created_at", -1).limit(5).to_list(None)
    recent_bookings = await db.service_bookings.find({}).sort("created_at", -1).limit(5).to_list(None)
    
    # Clean recent data
    clean_recent_users = []
    for user in recent_users:
        clean_recent_users.append({
            "id": user.get("id"),
            "username": user.get("username"),
            "full_name": user.get("full_name"),
            "role": user.get("role"),
            "created_at": user.get("created_at").isoformat() if user.get("created_at") else None
        })
    
    clean_recent_messages = []
    for message in recent_messages:
        clean_recent_messages.append({
            "id": message.get("id"),
            "subject": message.get("subject"),
            "message_type": message.get("message_type"),
            "created_at": message.get("created_at").isoformat() if message.get("created_at") else None
        })
    
    clean_recent_bookings = []
    for booking in recent_bookings:
        clean_recent_bookings.append({
            "id": booking.get("id"),
            "service_id": booking.get("service_id"),
            "status": booking.get("status"),
            "created_at": booking.get("created_at").isoformat() if booking.get("created_at") else None
        })
    
    return {
        "overview": {
            "total_users": total_users,
            "total_admins": total_admins,
            "total_residents": total_residents,
            "total_compounds": total_compounds,
            "total_families": total_families,
            "total_services": total_services,
            "total_bookings": total_bookings,
            "total_messages": total_messages,
            "total_invoices": total_invoices,
            "total_payments": total_payments,
            "total_utility_bills": total_utility_bills,
            "total_notifications": total_notifications
        },
        "recent_activity": {
            "recent_users": clean_recent_users,
            "recent_messages": clean_recent_messages,
            "recent_bookings": clean_recent_bookings
        }
    }

@api_router.put("/database/users/{user_id}")
async def update_user(
    user_id: str,
    user_data: dict,
    current_user: User = Depends(get_current_user)
):
    if current_user.username not in ["johndoe", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Remove sensitive fields that shouldn't be updated
    allowed_fields = [
        "username", "email", "full_name", "phone", "role", 
        "compound_id", "unit_number", "is_active"
    ]
    
    update_data = {k: v for k, v in user_data.items() if k in allowed_fields}
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User updated successfully"}

@api_router.delete("/database/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.username not in ["johndoe", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    # Don't allow deleting yourself
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Delete user and related data
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete related data
    await db.users.delete_one({"id": user_id})
    await db.messages.delete_many({"sender_id": user_id})
    await db.service_bookings.delete_many({"resident_id": user_id})
    await db.notifications.delete_many({"sender_id": user_id})
    
    return {"message": "User and related data deleted successfully"}

@api_router.get("/database/search")
async def search_database(
    query: str,
    type: str = "users",
    current_user: User = Depends(get_current_user)
):
    if current_user.username not in ["johndoe", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    if type == "users":
        # Search users by username, email, or full_name
        users = await db.users.find({
            "$or": [
                {"username": {"$regex": query, "$options": "i"}},
                {"email": {"$regex": query, "$options": "i"}},
                {"full_name": {"$regex": query, "$options": "i"}}
            ]
        }, {"password_hash": 0}).to_list(100)
        
        return {"results": users}
    
    elif type == "compounds":
        compounds = await db.compounds.find({
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"address": {"$regex": query, "$options": "i"}}
            ]
        }).to_list(100)
        
        return {"results": compounds}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid search type")

# Utility Bills Management Routes
# Utility extracted to routes/
# Compound Services extracted to routes/
# Dashboard extracted to routes/
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

@api_router.post("/gallery/files")
async def get_gallery_files(
    gallery_filter: FileGalleryFilter,
    current_user: User = Depends(get_current_user)
):
    """Get files for gallery view with filters"""
    try:
        results = await get_file_gallery(
            current_user.id,
            current_user.compound_id,
            gallery_filter
        )
        
        return {
            "success": True,
            "results": results
        }
        
    except Exception as e:
        logging.error(f"Error in gallery files endpoint: {e}")
        raise HTTPException(status_code=500, detail="Failed to get gallery files")

@api_router.get("/gallery/stats")
async def get_gallery_stats(current_user: User = Depends(get_current_user)):
    """Get file gallery statistics"""
    try:
        # Get user's accessible chats
        user_chats = await db.chats.find({
            "compound_id": current_user.compound_id,
            "participants": current_user.id,
            "is_active": True
        }).to_list(None)
        
        user_chat_ids = [chat["id"] for chat in user_chats]
        stats = await get_file_stats(user_chat_ids)
        
        return {"stats": stats}
        
    except Exception as e:
        logging.error(f"Error getting gallery stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get gallery statistics")

# ============ MESSAGE SCHEDULING ENDPOINTS ============

# Scheduled Messages routes extracted to routes/

# Service Providers routes extracted to routes/

# Family/Gate routes extracted to routes/

# Admin Registration routes extracted to routes/

# Admin Users routes extracted to routes/

@api_router.post("/admin/initialize-services")
async def initialize_default_services(
    request_data: dict,
    current_user: User = Depends(require_admin)
):
    """Initialize default services for a compound (Admin only)"""
    try:
        compound_id = request_data.get("compound_id")
        if not compound_id:
            raise HTTPException(status_code=400, detail="compound_id is required")
        
        # Check if services already exist
        existing_services = await db.services.find({"compound_id": compound_id}).to_list(None)
        if existing_services:
            return {"success": False, "message": "Services already exist", "added_count": 0}
        
        # Default services for residential compounds
        default_services = [
            # Maintenance Services
            {
                "id": str(uuid.uuid4()),
                "name": "Plumbing Services",
                "category": "maintenance",
                "specialty": "Emergency plumbing, pipe repairs, water heater maintenance",
                "description": "Professional plumbing services including emergency repairs, pipe installations, and water heater maintenance",
                "phone": "+1-555-PLUMB-01",
                "email": "plumbing@compound-services.com",
                "working_hours": "24/7 Emergency Service",
                "compound_id": compound_id,
                "base_price": 75.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Electrical Services",
                "category": "maintenance",
                "specialty": "Electrical repairs, installations, emergency services",
                "description": "Licensed electricians for all electrical needs including installations, repairs, and emergency services",
                "phone": "+1-555-ELECT-01",
                "email": "electrical@compound-services.com",
                "working_hours": "8:00 AM - 6:00 PM, Emergency 24/7",
                "compound_id": compound_id,
                "base_price": 85.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "HVAC Services",
                "category": "maintenance",
                "specialty": "Air conditioning, heating, ventilation systems",
                "description": "Complete HVAC services including AC repair, heating system maintenance, and air quality solutions",
                "phone": "+1-555-HVAC-01",
                "email": "hvac@compound-services.com",
                "working_hours": "7:00 AM - 7:00 PM",
                "compound_id": compound_id,
                "base_price": 95.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "General Handyman",
                "category": "maintenance",
                "specialty": "Minor repairs, installations, home improvements",
                "description": "Skilled handyman for general repairs, furniture assembly, and minor home improvements",
                "phone": "+1-555-HANDY-01",
                "email": "handyman@compound-services.com",
                "working_hours": "8:00 AM - 5:00 PM",
                "compound_id": compound_id,
                "base_price": 45.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            
            # Cleaning Services
            {
                "id": str(uuid.uuid4()),
                "name": "House Cleaning",
                "category": "cleaning",
                "specialty": "Regular cleaning, deep cleaning, move-in/out cleaning",
                "description": "Professional house cleaning services with flexible scheduling and eco-friendly options",
                "phone": "+1-555-CLEAN-01",
                "email": "cleaning@compound-services.com",
                "working_hours": "7:00 AM - 6:00 PM",
                "compound_id": compound_id,
                "base_price": 80.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Carpet Cleaning",
                "category": "cleaning",
                "specialty": "Deep carpet cleaning, stain removal, upholstery cleaning",
                "description": "Professional carpet and upholstery cleaning using advanced equipment and safe cleaning solutions",
                "phone": "+1-555-CARPET-01",
                "email": "carpet@compound-services.com",
                "working_hours": "8:00 AM - 5:00 PM",
                "compound_id": compound_id,
                "base_price": 120.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Window Cleaning",
                "category": "cleaning",
                "specialty": "Interior and exterior window cleaning",
                "description": "Professional window cleaning for crystal clear views, interior and exterior service available",
                "phone": "+1-555-WINDOW-01",
                "email": "windows@compound-services.com",
                "working_hours": "8:00 AM - 4:00 PM",
                "compound_id": compound_id,
                "base_price": 60.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            
            # Security Services
            {
                "id": str(uuid.uuid4()),
                "name": "Security Guard",
                "category": "security",
                "specialty": "24/7 security, patrol services, event security",
                "description": "Professional security services including patrol, monitoring, and special event security",
                "phone": "+1-555-SECURE-01",
                "email": "security@compound-services.com",
                "working_hours": "24/7 Service Available",
                "compound_id": compound_id,
                "base_price": 25.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Access Control Setup",
                "category": "security",
                "specialty": "Keycard systems, door locks, security cameras",
                "description": "Installation and maintenance of access control systems, smart locks, and surveillance equipment",
                "phone": "+1-555-ACCESS-01",
                "email": "access@compound-services.com",
                "working_hours": "9:00 AM - 5:00 PM",
                "compound_id": compound_id,
                "base_price": 150.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            
            # Landscaping Services
            {
                "id": str(uuid.uuid4()),
                "name": "Landscaping & Gardening",
                "category": "landscaping",
                "specialty": "Garden maintenance, lawn care, plant installation",
                "description": "Complete landscaping services including garden design, lawn maintenance, and seasonal plant care",
                "phone": "+1-555-GARDEN-01",
                "email": "landscaping@compound-services.com",
                "working_hours": "7:00 AM - 4:00 PM",
                "compound_id": compound_id,
                "base_price": 65.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Pool Maintenance",
                "category": "landscaping",
                "specialty": "Pool cleaning, chemical balancing, equipment repair",
                "description": "Professional pool maintenance including cleaning, chemical treatment, and equipment servicing",
                "phone": "+1-555-POOL-01",
                "email": "pool@compound-services.com",
                "working_hours": "6:00 AM - 3:00 PM",
                "compound_id": compound_id,
                "base_price": 90.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            
            # Personal Services
            {
                "id": str(uuid.uuid4()),
                "name": "Pet Care Services",
                "category": "personal",
                "specialty": "Dog walking, pet sitting, grooming",
                "description": "Trusted pet care services including walking, sitting, feeding, and basic grooming",
                "phone": "+1-555-PETS-01",
                "email": "petcare@compound-services.com",
                "working_hours": "6:00 AM - 8:00 PM",
                "compound_id": compound_id,
                "base_price": 30.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Personal Trainer",
                "category": "personal",
                "specialty": "Fitness training, wellness coaching, group classes",
                "description": "Certified personal trainers for individual sessions, group fitness, and wellness programs",
                "phone": "+1-555-FITNESS-01",
                "email": "fitness@compound-services.com",
                "working_hours": "5:00 AM - 9:00 PM",
                "compound_id": compound_id,
                "base_price": 70.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            
            # Delivery & Moving Services
            {
                "id": str(uuid.uuid4()),
                "name": "Package Delivery",
                "category": "delivery",
                "specialty": "Local delivery, grocery delivery, courier services",
                "description": "Reliable delivery services for packages, groceries, and courier needs within the compound",
                "phone": "+1-555-DELIVER-01",
                "email": "delivery@compound-services.com",
                "working_hours": "8:00 AM - 8:00 PM",
                "compound_id": compound_id,
                "base_price": 15.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Moving Services",
                "category": "delivery",
                "specialty": "Local moving, furniture moving, packing services",
                "description": "Professional moving services for relocating within or outside the compound, including packing",
                "phone": "+1-555-MOVERS-01",
                "email": "moving@compound-services.com",
                "working_hours": "7:00 AM - 6:00 PM",
                "compound_id": compound_id,
                "base_price": 120.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            
            # Event Services
            {
                "id": str(uuid.uuid4()),
                "name": "Event Planning",
                "category": "events",
                "specialty": "Party planning, corporate events, wedding coordination",
                "description": "Full-service event planning for parties, corporate events, and special occasions",
                "phone": "+1-555-EVENTS-01",
                "email": "events@compound-services.com",
                "working_hours": "9:00 AM - 7:00 PM",
                "compound_id": compound_id,
                "base_price": 200.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Catering Services",
                "category": "events",
                "specialty": "Event catering, meal prep, special dietary needs",
                "description": "Professional catering for events of all sizes with customizable menus and dietary accommodations",
                "phone": "+1-555-CATER-01",
                "email": "catering@compound-services.com",
                "working_hours": "6:00 AM - 10:00 PM",
                "compound_id": compound_id,
                "base_price": 35.00,
                "availability": "available",
                "created_at": datetime.now(timezone.utc)
            }
        ]
        
        # Insert all default services
        await db.services.insert_many(default_services)
        
        return {
            "success": True,
            "message": "Default services initialized successfully",
            "added_count": len(default_services)
        }
        
    except Exception as e:
        logging.error(f"Error initializing default services: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize default services")

@api_router.delete("/admin/services/clear")
async def clear_all_services(
    request_data: dict,
    current_user: User = Depends(require_admin)
):
    """Clear all services for a compound (Admin only)"""
    try:
        compound_id = request_data.get("compound_id")
        if not compound_id:
            raise HTTPException(status_code=400, detail="compound_id is required")
        
        # Delete all services for the compound
        result = await db.services.delete_many({"compound_id": compound_id})
        
        return {
            "success": True,
            "message": f"Cleared {result.deleted_count} services",
            "deleted_count": result.deleted_count
        }
        
    except Exception as e:
        logging.error(f"Error clearing services: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear services")

def create_registration_token(unit_number: str, email: str, compound_id: str, expires_at: datetime) -> str:
    """Create a secure token for resident registration"""
    token_data = {
        "unit_number": unit_number,
        "email": email,
        "compound_id": compound_id,
        "expires_at": expires_at.isoformat(),
        "issued_at": datetime.now(timezone.utc).isoformat()
    }
    # In production, this should be signed/encrypted
    import json
    return base64.b64encode(json.dumps(token_data).encode()).decode()

# WebSocket endpoint for real-time chat
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

# Health check
@api_router.get("/")
async def root():
    return {"message": "HomeMe API is running", "status": "healthy"}

# Router will be included after all endpoints are defined

# CORS middleware - Restricted origins for security
ALLOWED_ORIGINS = os.environ.get('CORS_ORIGINS', 'https://profile-nav-debug.preview.emergentagent.com,https://homemeapp.net,http://localhost:3000').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
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
from routes.complaints import router as complaints_router
from routes.superadmin import router as superadmin_router
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

app.include_router(monitoring_router)
app.include_router(finance_router)
app.include_router(ratings_router2)
app.include_router(contracts_router)
app.include_router(complaints_router)
app.include_router(superadmin_router)
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
# ==================== END ROUTE IMPORTS ====================

# Include the main API router (for routes still in server.py)
app.include_router(api_router)


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

    _daily_report_task = asyncio.create_task(daily_report_scheduler())
    logging.info("Daily report scheduler started (7:00 AM daily)")

# Push/Email/Reminders routes extracted to routes/


@app.on_event("startup")
async def startup_db_client():
    """Initialize database connection and indexes"""
    global client, db, webauthn_service
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Also initialize the shared database module for extracted routes
    import database as db_module
    db_module._client = client
    db_module._db = db
    
    # Reinitialize WebAuthn service with the actual db connection
    webauthn_service.db = db
    
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
    
    logging.info("Database connection and indexes initialized")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()