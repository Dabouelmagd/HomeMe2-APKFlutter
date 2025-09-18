from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
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
import numpy as np
from io import BytesIO
from PIL import Image
from datetime import timezone
import httpx
from passlib.context import CryptContext

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
client = None
db = None

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Backend URL Configuration
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:8000')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app
app = FastAPI(title="HomeMe API", description="Compound Management System")
api_router = APIRouter(prefix="/api")

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

# WebSocket connections manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(message)
            except:
                self.disconnect(user_id)
    
    async def broadcast_to_compound(self, message: str, compound_id: str):
        # Get all users in compound and send message
        users = await db.users.find({"compound_id": compound_id}).to_list(None)
        for user in users:
            await self.send_personal_message(message, str(user["_id"]))
    
    async def send_chat_message(self, chat_message: dict, participants: List[str]):
        """Send chat message to all participants"""
        message = json.dumps(serialize_datetime(chat_message))
        for participant_id in participants:
            await self.send_personal_message(message, participant_id)
    
    async def notify_chat_update(self, chat_id: str, update_type: str, data: dict, participants: List[str]):
        """Send chat updates (new participants, chat settings, etc.)"""
        notification = {
            "type": "chat_update",
            "chat_id": chat_id,
            "update_type": update_type,
            "data": serialize_datetime(data)
        }
        message = json.dumps(notification)
        for participant_id in participants:
            await self.send_personal_message(message, participant_id)

manager = ConnectionManager()

# Pydantic Models
class UserRole(str):
    ADMIN = "admin"
    RESIDENT = "resident"

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
    compound_id: str
    full_name: str
    phone: Optional[str] = None
    unit_number: Optional[str] = None

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
    relationship: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    id_number: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    move_in_date: Optional[date] = None
    move_out_date: Optional[date] = None
    is_active: Optional[bool] = None

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
            sound_info = np.frombuffer(frames, dtype=np.int16)
            
            # Normalize to 0-1 range
            if len(sound_info) > 0:
                sound_info = np.abs(sound_info)
                max_val = np.max(sound_info) if np.max(sound_info) > 0 else 1
                sound_info = sound_info / max_val
                
                # Downsample to desired number of samples
                chunk_size = len(sound_info) // samples
                if chunk_size > 0:
                    waveform = []
                    for i in range(0, len(sound_info), chunk_size)[:samples]:
                        chunk = sound_info[i:i + chunk_size]
                        waveform.append(float(np.mean(chunk)))
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

async def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

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
async def register(user_data: UserCreate):
    # Check if username or email already exists
    existing_user = await db.users.find_one({
        "$or": [{"username": user_data.username}, {"email": user_data.email}]
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    
    # Hash password
    password_hash = hash_password(user_data.password)
    
    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=password_hash,
        role=user_data.role,
        compound_id=user_data.compound_id,
        full_name=user_data.full_name,
        phone=user_data.phone,
        unit_number=user_data.unit_number,
        is_family_head=(user_data.role == UserRole.RESIDENT)
    )
    
    await db.users.insert_one(user.dict())
    
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
    
    return {"message": "User registered successfully", "user_id": user.id}

@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"username": user_data.username})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user["is_active"]:
        raise HTTPException(status_code=401, detail="Account is disabled")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "compound_id": user["compound_id"],
            "full_name": user["full_name"]
        }
    }

# Compound Management Routes
@api_router.post("/compounds")
async def create_compound(compound_data: CompoundCreate, current_user: User = Depends(require_admin)):
    compound = Compound(
        name=compound_data.name,
        address=compound_data.address,
        admin_id=current_user.id
    )
    
    await db.compounds.insert_one(compound.dict())
    return {"message": "Compound created successfully", "compound_id": compound.id}

@api_router.get("/compounds/{compound_id}")
async def get_compound(compound_id: str, current_user: User = Depends(get_current_user)):
    if current_user.compound_id != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    compound = await db.compounds.find_one({"id": compound_id})
    if not compound:
        raise HTTPException(status_code=404, detail="Compound not found")
    
    return compound

@api_router.put("/compounds/{compound_id}/logo")
async def upload_compound_logo(
    compound_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin)
):
    if current_user.compound_id != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    file_content = await file.read()
    logo_base64 = process_image(file_content)
    logo_url = f"data:image/jpeg;base64,{logo_base64}"
    
    await db.compounds.update_one(
        {"id": compound_id},
        {"$set": {"logo_url": logo_url}}
    )
    
    return {"message": "Logo uploaded successfully", "logo_url": logo_url}

# Admin Management Routes
@api_router.post("/compounds/{compound_id}/admins/{user_id}")
async def add_admin(
    compound_id: str,
    user_id: str,
    current_user: User = Depends(require_admin)
):
    if current_user.compound_id != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if user exists and is in the same compound
    user = await db.users.find_one({"id": user_id, "compound_id": compound_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found in compound")
    
    # Update user role to admin
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": UserRole.ADMIN}}
    )
    
    # Add to compound's additional admins
    await db.compounds.update_one(
        {"id": compound_id},
        {"$addToSet": {"additional_admins": user_id}}
    )
    
    return {"message": "Admin added successfully"}

# Family Management Routes
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
    
    return {"family": family, "members": members}

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
    if not current_user.family_id:
        return []
    
    invoices = await db.invoices.find({"family_id": current_user.family_id}).to_list(None)
    return invoices

@api_router.post("/payments")
async def create_payment(
    payment_data: PaymentCreate,
    current_user: User = Depends(get_current_user)
):
    # Get invoice
    invoice = await db.invoices.find_one({"id": payment_data.invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if invoice["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Create mock payment
    payment = Payment(
        invoice_id=payment_data.invoice_id,
        family_id=current_user.family_id,
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
        # Admins see all messages in their compound
        messages = await db.messages.find({"compound_id": current_user.compound_id}).to_list(None)
    else:
        # Residents see only their messages
        messages = await db.messages.find({"sender_id": current_user.id}).to_list(None)
    
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
    }).to_list(None)
    
    return notifications

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

@api_router.get("/database/compounds")
async def get_all_compounds(current_user: User = Depends(get_current_user)):
    if current_user.username not in ["johndoe", "admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Super admin access required")
    
    compounds = await db.compounds.find({}).to_list(None)
    
    compound_data = []
    for compound in compounds:
        # Count users in compound
        user_count = await db.users.count_documents({"compound_id": compound.get("id")})
        admin_count = await db.users.count_documents({
            "compound_id": compound.get("id"),
            "role": "admin"
        })
        resident_count = await db.users.count_documents({
            "compound_id": compound.get("id"),
            "role": "resident"
        })
        family_count = await db.families.count_documents({"compound_id": compound.get("id")})
        
        compound_info = {
            "id": compound.get("id"),
            "name": compound.get("name"),
            "address": compound.get("address"),
            "admin_id": compound.get("admin_id"),
            "additional_admins": compound.get("additional_admins", []),
            "user_count": user_count,
            "admin_count": admin_count,
            "resident_count": resident_count,
            "family_count": family_count,
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
        }, {"password_hash": 0}).to_list(None)
        
        return {"results": users}
    
    elif type == "compounds":
        compounds = await db.compounds.find({
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"address": {"$regex": query, "$options": "i"}}
            ]
        }).to_list(None)
        
        return {"results": compounds}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid search type")

# Utility Bills Management Routes
@api_router.get("/compounds/{compound_id}/utility-connections")
async def get_utility_connections(compound_id: str, current_user: User = Depends(get_current_user)):
    if current_user.compound_id != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get connections for current family or all if admin
    if current_user.role == UserRole.ADMIN:
        connections = await db.utility_connections.find({"compound_id": compound_id}).to_list(None)
    else:
        connections = await db.utility_connections.find({
            "compound_id": compound_id,
            "family_id": current_user.family_id
        }).to_list(None)
    
    # Clean connections data
    clean_connections = []
    for conn in connections:
        clean_conn = {
            "id": conn.get("id"),
            "utility_type": conn.get("utility_type"),
            "provider_name": conn.get("provider_name"),
            "account_number": conn.get("account_number"),
            "meter_number": conn.get("meter_number"),
            "unit_number": conn.get("unit_number"),
            "is_active": conn.get("is_active", True),
            "connection_date": conn.get("connection_date").isoformat() if conn.get("connection_date") else None
        }
        clean_connections.append(clean_conn)
    
    return {"connections": clean_connections}

@api_router.post("/compounds/{compound_id}/utility-connections")
async def create_utility_connection(
    compound_id: str,
    connection_data: UtilityConnectionCreate,
    current_user: User = Depends(get_current_user)
):
    if current_user.compound_id != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User must be part of a family")
    
    connection = UtilityConnection(
        compound_id=compound_id,
        family_id=current_user.family_id,
        unit_number=current_user.unit_number or "N/A",
        utility_type=connection_data.utility_type,
        provider_name=connection_data.provider_name,
        account_number=connection_data.account_number,
        meter_number=connection_data.meter_number,
        connection_date=datetime.utcnow()
    )
    
    await db.utility_connections.insert_one(connection.dict())
    
    return {"message": "Utility connection created successfully", "connection_id": connection.id}

@api_router.get("/utility-bills/my")
async def get_my_utility_bills(current_user: User = Depends(get_current_user)):
    if not current_user.family_id:
        return {"bills": []}
    
    bills = await db.utility_bills.find({"family_id": current_user.family_id}).to_list(None)
    
    # Clean bills data
    clean_bills = []
    for bill in bills:
        clean_bill = {
            "id": bill.get("id"),
            "utility_type": bill.get("utility_type"),
            "provider_name": bill.get("provider_name"),
            "account_number": bill.get("account_number"),
            "billing_period": bill.get("billing_period"),
            "issue_date": bill.get("issue_date").isoformat() if bill.get("issue_date") else None,
            "due_date": bill.get("due_date").isoformat() if bill.get("due_date") else None,
            "amount": bill.get("amount"),
            "previous_reading": bill.get("previous_reading"),
            "current_reading": bill.get("current_reading"),
            "consumption": bill.get("consumption"),
            "status": bill.get("status"),
            "government_reference": bill.get("government_reference")
        }
        clean_bills.append(clean_bill)
    
    return {"bills": clean_bills}

@api_router.get("/compounds/{compound_id}/utility-bills")
async def get_compound_utility_bills(compound_id: str, current_user: User = Depends(require_admin)):
    if current_user.compound_id != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    bills = await db.utility_bills.find({"compound_id": compound_id}).to_list(None)
    
    # Get family details for each bill
    clean_bills = []
    for bill in bills:
        family = await db.families.find_one({"id": bill["family_id"]})
        resident = await db.users.find_one({"family_id": bill["family_id"], "is_family_head": True})
        
        clean_bill = {
            "id": bill.get("id"),
            "utility_type": bill.get("utility_type"),
            "provider_name": bill.get("provider_name"),
            "unit_number": bill.get("unit_number"),
            "resident_name": resident.get("full_name") if resident else "Unknown",
            "account_number": bill.get("account_number"),
            "billing_period": bill.get("billing_period"),
            "amount": bill.get("amount"),
            "due_date": bill.get("due_date").isoformat() if bill.get("due_date") else None,
            "status": bill.get("status"),
            "government_reference": bill.get("government_reference")
        }
        clean_bills.append(clean_bill)
    
    return {"bills": clean_bills}

@api_router.post("/compounds/{compound_id}/utility-bills")
async def create_utility_bill(
    compound_id: str,
    bill_data: UtilityBillCreate,
    current_user: User = Depends(require_admin)
):
    if current_user.compound_id != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Calculate consumption if readings are provided
    consumption = None
    if bill_data.current_reading and bill_data.previous_reading:
        consumption = bill_data.current_reading - bill_data.previous_reading
    
    bill = UtilityBill(
        compound_id=compound_id,
        family_id=bill_data.family_id,
        unit_number=bill_data.unit_number,
        utility_type=bill_data.utility_type,
        provider_name=bill_data.provider_name,
        account_number=bill_data.account_number,
        billing_period=bill_data.billing_period,
        issue_date=bill_data.issue_date,
        due_date=bill_data.due_date,
        amount=bill_data.amount,
        previous_reading=bill_data.previous_reading,
        current_reading=bill_data.current_reading,
        consumption=consumption,
        government_reference=bill_data.government_reference
    )
    
    await db.utility_bills.insert_one(bill.dict())
    
    return {"message": "Utility bill created successfully", "bill_id": bill.id}

@api_router.post("/utility-bills/{bill_id}/pay")
async def pay_utility_bill(
    bill_id: str,
    current_user: User = Depends(get_current_user)
):
    # Get the bill
    bill = await db.utility_bills.find_one({"id": bill_id})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    if bill["family_id"] != current_user.family_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if bill["status"] != PaymentStatus.PENDING:
        raise HTTPException(status_code=400, detail="Bill is already paid")
    
    # Create utility payment record
    government_tx_id = f"GOV_{uuid.uuid4().hex[:12].upper()}"
    homeMe_tx_id = f"HM_{uuid.uuid4().hex[:8].upper()}"
    
    payment = UtilityPayment(
        bill_id=bill_id,
        family_id=current_user.family_id,
        amount=bill["amount"],
        government_transaction_id=government_tx_id,
        homeMe_transaction_id=homeMe_tx_id
    )
    
    await db.utility_payments.insert_one(payment.dict())
    
    # Update bill status
    await db.utility_bills.update_one(
        {"id": bill_id},
        {"$set": {
            "status": PaymentStatus.PAID,
            "payment_method": "homeMe_gateway",
            "payment_date": datetime.utcnow()
        }}
    )
    
    # Create notification for admin
    notification = Notification(
        compound_id=current_user.compound_id,
        sender_id=current_user.id,
        title=f"Utility Payment: {bill['utility_type'].title()}",
        content=f"{current_user.full_name} paid {bill['utility_type']} bill - ${bill['amount']}"
    )
    
    # Get admin IDs
    admins = await db.users.find(
        {"compound_id": current_user.compound_id, "role": UserRole.ADMIN}
    ).to_list(None)
    admin_ids = [admin["id"] for admin in admins]
    notification.recipient_ids = admin_ids
    
    await db.notifications.insert_one(notification.dict())
    
    return {
        "message": "Utility bill paid successfully",
        "government_transaction_id": government_tx_id,
        "homeMe_transaction_id": homeMe_tx_id,
        "payment_id": payment.id
    }

@api_router.get("/utility-bills/{bill_id}/receipt")
async def get_utility_bill_receipt(
    bill_id: str,
    current_user: User = Depends(get_current_user)
):
    bill = await db.utility_bills.find_one({"id": bill_id})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    if bill["family_id"] != current_user.family_id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    
    payment = await db.utility_payments.find_one({"bill_id": bill_id})
    
    receipt_data = {
        "bill": {
            "id": bill.get("id"),
            "utility_type": bill.get("utility_type"),
            "provider_name": bill.get("provider_name"),
            "account_number": bill.get("account_number"),
            "billing_period": bill.get("billing_period"),
            "amount": bill.get("amount"),
            "government_reference": bill.get("government_reference"),
            "unit_number": bill.get("unit_number")
        },
        "payment": {
            "government_transaction_id": payment.get("government_transaction_id") if payment else None,
            "homeMe_transaction_id": payment.get("homeMe_transaction_id") if payment else None,
            "payment_date": payment.get("payment_date").isoformat() if payment and payment.get("payment_date") else None,
            "status": bill.get("status")
        },
        "resident": {
            "name": current_user.full_name,
            "unit_number": bill.get("unit_number")
        }
    }
    
    return receipt_data

# Services Management Routes
@api_router.get("/compounds/{compound_id}/services")
async def get_compound_services(compound_id: str, current_user: User = Depends(get_current_user)):
    if current_user.compound_id != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    services = await db.services.find({"compound_id": compound_id}).to_list(None)
    
    # Clean services data for JSON serialization
    clean_services = []
    for service in services:
        clean_service = {
            "id": service.get("id"),
            "name": service.get("name"),
            "category": service.get("category"),
            "specialty": service.get("specialty"),
            "description": service.get("description"),
            "phone": service.get("phone"),
            "email": service.get("email"),
            "working_hours": service.get("working_hours"),
            "status": service.get("status", "available"),
            "rating": service.get("rating", 0.0),
            "total_reviews": service.get("total_reviews", 0),
            "created_at": service.get("created_at").isoformat() if service.get("created_at") else None
        }
        clean_services.append(clean_service)
    
    return {"services": clean_services}

@api_router.post("/compounds/{compound_id}/services")
async def create_service(
    compound_id: str,
    service_data: ServiceCreate,
    current_user: User = Depends(require_admin)
):
    if current_user.compound_id != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    service = Service(
        compound_id=compound_id,
        name=service_data.name,
        category=service_data.category,
        specialty=service_data.specialty,
        description=service_data.description,
        phone=service_data.phone,
        email=service_data.email,
        working_hours=service_data.working_hours,
        created_by=current_user.id
    )
    
    await db.services.insert_one(service.dict())
    
    return {"message": "Service created successfully", "service_id": service.id}

@api_router.put("/compounds/{compound_id}/services/{service_id}")
async def update_service(
    compound_id: str,
    service_id: str,
    service_data: ServiceCreate,
    current_user: User = Depends(require_admin)
):
    if current_user.compound_id != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await db.services.update_one(
        {"id": service_id, "compound_id": compound_id},
        {"$set": {
            "name": service_data.name,
            "category": service_data.category,
            "specialty": service_data.specialty,
            "description": service_data.description,
            "phone": service_data.phone,
            "email": service_data.email,
            "working_hours": service_data.working_hours
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return {"message": "Service updated successfully"}

@api_router.delete("/compounds/{compound_id}/services/{service_id}")
async def delete_service(
    compound_id: str,
    service_id: str,
    current_user: User = Depends(require_admin)
):
    if current_user.compound_id != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await db.services.delete_one({"id": service_id, "compound_id": compound_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return {"message": "Service deleted successfully"}

# Service Booking Routes
@api_router.post("/services/{service_id}/bookings")
async def create_booking(
    service_id: str,
    booking_data: ServiceBookingCreate,
    current_user: User = Depends(get_current_user)
):
    # Verify service exists and is in the same compound
    service = await db.services.find_one({"id": service_id, "compound_id": current_user.compound_id})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    booking = ServiceBooking(
        service_id=service_id,
        resident_id=current_user.id,
        compound_id=current_user.compound_id,
        unit_number=current_user.unit_number or "N/A",
        issue_description=booking_data.issue_description,
        preferred_date=booking_data.preferred_date,
        preferred_time=booking_data.preferred_time,
        notes=booking_data.notes
    )
    
    await db.service_bookings.insert_one(booking.dict())
    
    # Create notification for admins
    notification = Notification(
        compound_id=current_user.compound_id,
        sender_id=current_user.id,
        title=f"New Service Booking: {service['name']}",
        content=f"{current_user.full_name} booked {service['name']} for {booking_data.preferred_date.strftime('%Y-%m-%d')}"
    )
    
    # Get admin IDs
    admins = await db.users.find(
        {"compound_id": current_user.compound_id, "role": UserRole.ADMIN}
    ).to_list(None)
    admin_ids = [admin["id"] for admin in admins]
    notification.recipient_ids = admin_ids
    
    await db.notifications.insert_one(notification.dict())
    
    return {"message": "Booking created successfully", "booking_id": booking.id}

@api_router.get("/bookings/my")
async def get_my_bookings(current_user: User = Depends(get_current_user)):
    bookings = await db.service_bookings.find({"resident_id": current_user.id}).to_list(None)
    
    # Get service details for each booking
    booking_list = []
    for booking in bookings:
        service = await db.services.find_one({"id": booking["service_id"]})
        booking_data = {
            "id": booking.get("id"),
            "service_name": service.get("name") if service else "Unknown Service",
            "service_category": service.get("category") if service else "unknown",
            "issue_description": booking.get("issue_description"),
            "preferred_date": booking.get("preferred_date").isoformat() if booking.get("preferred_date") else None,
            "preferred_time": booking.get("preferred_time"),
            "status": booking.get("status"),
            "notes": booking.get("notes"),
            "created_at": booking.get("created_at").isoformat() if booking.get("created_at") else None
        }
        booking_list.append(booking_data)
    
    return {"bookings": booking_list}

@api_router.get("/compounds/{compound_id}/bookings")
async def get_compound_bookings(compound_id: str, current_user: User = Depends(require_admin)):
    if current_user.compound_id != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    bookings = await db.service_bookings.find({"compound_id": compound_id}).to_list(None)
    
    # Get detailed information for each booking
    booking_list = []
    for booking in bookings:
        service = await db.services.find_one({"id": booking["service_id"]})
        resident = await db.users.find_one({"id": booking["resident_id"]})
        
        booking_data = {
            "id": booking.get("id"),
            "service_name": service.get("name") if service else "Unknown Service",
            "service_category": service.get("category") if service else "unknown",
            "resident_name": resident.get("full_name") if resident else "Unknown Resident",
            "unit_number": booking.get("unit_number"),
            "issue_description": booking.get("issue_description"),
            "preferred_date": booking.get("preferred_date").isoformat() if booking.get("preferred_date") else None,
            "preferred_time": booking.get("preferred_time"),
            "status": booking.get("status"),
            "notes": booking.get("notes"),
            "created_at": booking.get("created_at").isoformat() if booking.get("created_at") else None
        }
        booking_list.append(booking_data)
    
    return {"bookings": booking_list}

@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    status: str,
    current_user: User = Depends(require_admin)
):
    valid_statuses = ["pending", "confirmed", "in_progress", "completed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.service_bookings.update_one(
        {"id": booking_id, "compound_id": current_user.compound_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"message": "Booking status updated successfully"}

# Dashboard Routes
@api_router.get("/dashboard/admin")
async def get_admin_dashboard(current_user: User = Depends(require_admin)):
    # Get compound info
    compound = await db.compounds.find_one({"id": current_user.compound_id})
    
    # Get statistics
    total_residents = await db.users.count_documents({
        "compound_id": current_user.compound_id,
        "role": UserRole.RESIDENT
    })
    
    total_families = await db.families.count_documents({
        "compound_id": current_user.compound_id
    })
    
    pending_payments = await db.invoices.count_documents({
        "compound_id": current_user.compound_id,
        "status": PaymentStatus.PENDING
    })
    
    open_messages = await db.messages.count_documents({
        "compound_id": current_user.compound_id,
        "status": "open"
    })
    
    # Recent activity
    recent_messages = await db.messages.find({
        "compound_id": current_user.compound_id
    }).sort("created_at", -1).limit(5).to_list(None)
    
    recent_payments = await db.payments.aggregate([
        {"$lookup": {
            "from": "invoices",
            "localField": "invoice_id",
            "foreignField": "id",
            "as": "invoice"
        }},
        {"$match": {"invoice.compound_id": current_user.compound_id}},
        {"$sort": {"paid_at": -1}},
        {"$limit": 5}
    ]).to_list(None)
    
    return {
        "compound": compound,
        "statistics": {
            "total_residents": total_residents,
            "total_families": total_families,
            "pending_payments": pending_payments,
            "open_messages": open_messages
        },
        "recent_messages": recent_messages,
        "recent_payments": recent_payments
    }

@api_router.get("/dashboard/resident")
async def get_resident_dashboard(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.RESIDENT:
        raise HTTPException(status_code=403, detail="Resident access required")
    
    # Get family info
    family = None
    family_members = []
    if current_user.family_id:
        family = await db.families.find_one({"id": current_user.family_id})
        if family:
            family_members = await db.users.find(
                {"id": {"$in": family["members"]}},
                {"password_hash": 0}
            ).to_list(None)
    
    # Get pending invoices
    pending_invoices = await db.invoices.find({
        "family_id": current_user.family_id,
        "status": PaymentStatus.PENDING
    }).to_list(None)
    
    # Get recent notifications
    recent_notifications = await db.notifications.find({
        "compound_id": current_user.compound_id,
        "$or": [
            {"recipient_ids": {"$size": 0}},
            {"recipient_ids": current_user.id}
        ]
    }).sort("created_at", -1).limit(5).to_list(None)
    
    # Get my messages
    my_messages = await db.messages.find({
        "sender_id": current_user.id
    }).sort("created_at", -1).limit(5).to_list(None)
    
    return {
        "family": family,
        "family_members": family_members,
        "pending_invoices": pending_invoices,
        "recent_notifications": recent_notifications,
        "my_messages": my_messages
    }

# ============ CHAT ENDPOINTS ============

@api_router.get("/chats")
async def get_user_chats(current_user: User = Depends(get_current_user)):
    """Get all chats for the current user"""
    chats = await db.chats.find({
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    }).sort("last_message_at", -1).to_list(None)
    
    # Get participant details for each chat
    for chat in chats:
        # Get participant info
        participants = await db.users.find(
            {"id": {"$in": chat["participants"]}},
            {"password_hash": 0}
        ).to_list(None)
        chat["participant_details"] = participants
        
        # Get unread count for current user
        unread_count = await db.chat_messages.count_documents({
            "chat_id": chat["id"],
            f"read_by.{current_user.id}": {"$exists": False}
        })
        chat["unread_count"] = unread_count
        
        # Get last message
        last_message = await db.chat_messages.find_one(
            {"chat_id": chat["id"], "is_deleted": False},
            sort=[("created_at", -1)]
        )
        chat["last_message"] = last_message
    
    return {"chats": serialize_datetime(chats)}

@api_router.post("/chats")
async def create_chat(
    chat_data: ChatCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new chat"""
    # Validate participants are in the same compound
    if chat_data.participant_ids:
        participants = await db.users.find({
            "id": {"$in": chat_data.participant_ids},
            "compound_id": current_user.compound_id
        }).to_list(None)
        
        if len(participants) != len(chat_data.participant_ids):
            raise HTTPException(status_code=400, detail="Some participants not found in compound")
    
    # Add current user to participants if not already included
    participants = set(chat_data.participant_ids)
    participants.add(current_user.id)
    
    # For direct chats, ensure only 2 participants
    if chat_data.chat_type == ChatType.DIRECT and len(participants) != 2:
        raise HTTPException(status_code=400, detail="Direct chats must have exactly 2 participants")
    
    # Check if direct chat already exists
    if chat_data.chat_type == ChatType.DIRECT:
        existing_chat = await db.chats.find_one({
            "compound_id": current_user.compound_id,
            "chat_type": ChatType.DIRECT,
            "participants": {"$all": list(participants), "$size": 2},
            "is_active": True
        })
        if existing_chat:
            return {"chat": Chat(**existing_chat)}
    
    # Create chat
    chat = Chat(
        compound_id=current_user.compound_id,
        chat_type=chat_data.chat_type,
        name=chat_data.name,
        description=chat_data.description,
        participants=list(participants),
        admin_ids=[current_user.id] if chat_data.chat_type != ChatType.DIRECT else [],
        created_by=current_user.id
    )
    
    # Insert chat
    await db.chats.insert_one(chat.dict())
    
    # Create participant records
    for participant_id in participants:
        participant = ChatParticipant(
            chat_id=chat.id,
            user_id=participant_id,
            is_admin=participant_id in chat.admin_ids
        )
        await db.chat_participants.insert_one(participant.dict())
    
    # Notify participants
    await manager.notify_chat_update(
        chat.id,
        "chat_created",
        {"chat": chat.dict()},
        list(participants)
    )
    
    return {"chat": chat}

@api_router.get("/chats/{chat_id}")
async def get_chat_details(
    chat_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get chat details and participants"""
    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Get participant details
    participants = await db.users.find(
        {"id": {"$in": chat["participants"]}},
        {"password_hash": 0}
    ).to_list(None)
    
    chat["participant_details"] = participants
    
    return {"chat": serialize_datetime(chat)}

@api_router.get("/chats/{chat_id}/messages")
async def get_chat_messages(
    chat_id: str,
    page: int = 1,
    limit: int = 50,
    current_user: User = Depends(get_current_user)
):
    """Get messages for a chat with pagination"""
    # Verify user is participant
    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Get messages with pagination
    skip = (page - 1) * limit
    messages = await db.chat_messages.find({
        "chat_id": chat_id,
        "is_deleted": False
    }).sort("created_at", -1).skip(skip).limit(limit).to_list(None)
    
    # Reverse to show oldest first
    messages.reverse()
    
    # Get sender details for each message
    sender_ids = list(set(msg["sender_id"] for msg in messages))
    senders = await db.users.find(
        {"id": {"$in": sender_ids}},
        {"id": 1, "full_name": 1, "username": 1}
    ).to_list(None)
    senders_dict = {sender["id"]: sender for sender in senders}
    
    for message in messages:
        message["sender"] = senders_dict.get(message["sender_id"])
    
    return {"messages": serialize_datetime(messages)}

@api_router.post("/chats/{chat_id}/messages")
async def send_message(
    chat_id: str,
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user)
):
    """Send a message to a chat"""
    # Verify user is participant
    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Create message
    message = ChatMessage(
        chat_id=chat_id,
        sender_id=current_user.id,
        content=message_data.content,
        message_type=message_data.message_type,
        reply_to=message_data.reply_to,
        read_by={current_user.id: datetime.utcnow()}
    )
    
    # Insert message
    await db.chat_messages.insert_one(message.dict())
    
    # Update chat's last message time
    await db.chats.update_one(
        {"id": chat_id},
        {"$set": {"last_message_at": message.created_at, "updated_at": datetime.utcnow()}}
    )
    
    # Get sender info
    sender_info = {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "username": current_user.username
    }
    
    # Prepare message for WebSocket
    ws_message = message.dict()
    ws_message["sender"] = sender_info
    
    # Send to all participants via WebSocket
    await manager.send_chat_message(
        {
            "type": "new_message",
            "chat_id": chat_id,
            "message": ws_message
        },
        chat["participants"]
    )
    
    # Send push notifications to participants
    await notify_chat_participants(
        chat_id,
        current_user.id,
        message_data.content,
        message_data.message_type
    )
    
    return {"message": message}

@api_router.post("/chats/{chat_id}/upload")
async def upload_file_to_chat(
    chat_id: str,
    files: List[UploadFile] = File(...),
    message_content: str = "",
    current_user: User = Depends(get_current_user)
):
    """Upload files to a chat and create a message with attachments"""
    # Verify user is participant
    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Process each file
    attachments = []
    for file in files:
        file_type = get_file_type(file.filename)
        attachment = await save_uploaded_file(file, file_type)
        attachments.append(attachment)
    
    # Determine message type based on attachments
    if len(attachments) == 1:
        message_type = attachments[0]["file_type"]
    else:
        message_type = "mixed"
    
    # Create message with attachments
    message = ChatMessage(
        chat_id=chat_id,
        sender_id=current_user.id,
        content=message_content or f"Shared {len(attachments)} file{'s' if len(attachments) > 1 else ''}",
        message_type=message_type,
        attachments=attachments,
        read_by={current_user.id: datetime.utcnow()}
    )
    
    # Insert message
    await db.chat_messages.insert_one(message.dict())
    
    # Update chat's last message time
    await db.chats.update_one(
        {"id": chat_id},
        {"$set": {"last_message_at": message.created_at, "updated_at": datetime.utcnow()}}
    )
    
    # Get sender info
    sender_info = {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "username": current_user.username
    }
    
    # Prepare message for WebSocket
    ws_message = message.dict()
    ws_message["sender"] = sender_info
    
    # Send to all participants via WebSocket
    await manager.send_chat_message(
        {
            "type": "new_message",
            "chat_id": chat_id,
            "message": ws_message
        },
        chat["participants"]
    )
    
    # Send push notifications to participants
    await notify_chat_participants(
        chat_id,
        current_user.id,
        message_content or f"Shared {len(attachments)} file{'s' if len(attachments) > 1 else ''}",
        message_type
    )
    
    return {"message": message}

@api_router.post("/chats/{chat_id}/voice")
async def send_voice_message(
    chat_id: str,
    voice_file: UploadFile = File(...),
    duration: float = 0.0,
    current_user: User = Depends(get_current_user)
):
    """Send a voice message to a chat"""
    # Verify user is participant
    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Validate file type
    if not voice_file.filename or not any(voice_file.filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS["voice"]):
        raise HTTPException(status_code=400, detail="Invalid voice file format")
    
    # Process voice file
    try:
        attachment = await save_uploaded_file(voice_file, "voice")
        
        # Create voice message
        message = ChatMessage(
            chat_id=chat_id,
            sender_id=current_user.id,
            content="🎵 Voice message",
            message_type="voice",
            attachments=[attachment],
            voice_duration=attachment.get("duration", duration),
            voice_waveform=attachment.get("waveform", []),
            read_by={current_user.id: datetime.utcnow()}
        )
        
        # Insert message
        await db.chat_messages.insert_one(message.dict())
        
        # Update chat's last message time
        await db.chats.update_one(
            {"id": chat_id},
            {"$set": {"last_message_at": message.created_at, "updated_at": datetime.utcnow()}}
        )
        
        # Get sender info
        sender_info = {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "username": current_user.username
        }
        
        # Prepare message for WebSocket
        ws_message = message.dict()
        ws_message["sender"] = sender_info
        
        # Send to all participants via WebSocket
        await manager.send_chat_message(
            {
                "type": "new_message",
                "chat_id": chat_id,
                "message": ws_message
            },
            chat["participants"]
        )
        
        # Send push notifications to participants
        await notify_chat_participants(
            chat_id,
            current_user.id,
            "🎵 Voice message",
            "voice"
        )
        
        return {"message": message}
        
    except Exception as e:
        logging.error(f"Error processing voice message: {e}")
        raise HTTPException(status_code=500, detail="Failed to process voice message")

@api_router.post("/chats/{chat_id}/messages/{message_id}/react")
async def add_message_reaction(
    chat_id: str,
    message_id: str,
    reaction_data: MessageReactionRequest,
    current_user: User = Depends(get_current_user)
):
    """Add or remove a reaction to a message"""
    # Verify user is participant
    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Find the message
    message = await db.chat_messages.find_one({
        "id": message_id,
        "chat_id": chat_id,
        "is_deleted": False
    })
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Get current reactions
    reactions = message.get("reactions", {})
    emoji = reaction_data.emoji
    
    # Toggle reaction
    if emoji not in reactions:
        reactions[emoji] = []
    
    if current_user.id in reactions[emoji]:
        # Remove reaction
        reactions[emoji].remove(current_user.id)
        if not reactions[emoji]:  # Remove empty reaction list
            del reactions[emoji]
    else:
        # Add reaction
        reactions[emoji].append(current_user.id)
    
    # Update message
    await db.chat_messages.update_one(
        {"id": message_id},
        {"$set": {"reactions": reactions}}
    )
    
    # Notify participants
    await manager.send_chat_message(
        {
            "type": "message_reaction",
            "chat_id": chat_id,
            "message_id": message_id,
            "emoji": emoji,
            "user_id": current_user.id,
            "reactions": reactions
        },
        chat["participants"]
    )
    
    return {"message": "Reaction updated successfully", "reactions": reactions}

@api_router.put("/chats/{chat_id}/messages/{message_id}")
async def edit_message(
    chat_id: str,
    message_id: str,
    message_data: ChatMessageUpdate,
    current_user: User = Depends(get_current_user)
):
    """Edit a message (only by sender)"""
    # Verify user is participant and message sender
    message = await db.chat_messages.find_one({
        "id": message_id,
        "chat_id": chat_id,
        "sender_id": current_user.id,
        "is_deleted": False
    })
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found or you're not the sender")
    
    # Update message
    await db.chat_messages.update_one(
        {"id": message_id},
        {"$set": {
            "content": message_data.content,
            "is_edited": True,
            "edited_at": datetime.utcnow()
        }}
    )
    
    # Get chat participants for notification
    chat = await db.chats.find_one({"id": chat_id})
    
    # Notify participants
    await manager.send_chat_message(
        {
            "type": "message_edited",
            "chat_id": chat_id,
            "message_id": message_id,
            "content": message_data.content
        },
        chat["participants"]
    )
    
    return {"message": "Message updated successfully"}

@api_router.delete("/chats/{chat_id}/messages/{message_id}")
async def delete_message(
    chat_id: str,
    message_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a message (only by sender)"""
    # Verify user is participant and message sender
    message = await db.chat_messages.find_one({
        "id": message_id,
        "chat_id": chat_id,
        "sender_id": current_user.id,
        "is_deleted": False
    })
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found or you're not the sender")
    
    # Soft delete message
    await db.chat_messages.update_one(
        {"id": message_id},
        {"$set": {
            "is_deleted": True,
            "deleted_at": datetime.utcnow()
        }}
    )
    
    # Get chat participants for notification
    chat = await db.chats.find_one({"id": chat_id})
    
    # Notify participants
    await manager.send_chat_message(
        {
            "type": "message_deleted",
            "chat_id": chat_id,
            "message_id": message_id
        },
        chat["participants"]
    )
    
    return {"message": "Message deleted successfully"}

@api_router.put("/chats/{chat_id}/read")
async def mark_messages_as_read(
    chat_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark all messages in a chat as read"""
    # Verify user is participant
    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Mark all unread messages as read
    await db.chat_messages.update_many(
        {
            "chat_id": chat_id,
            f"read_by.{current_user.id}": {"$exists": False}
        },
        {"$set": {f"read_by.{current_user.id}": datetime.utcnow()}}
    )
    
    return {"message": "Messages marked as read"}

@api_router.post("/chats/{chat_id}/participants")
async def add_participants(
    chat_id: str,
    participants_data: AddParticipantsRequest,
    current_user: User = Depends(get_current_user)
):
    """Add participants to a group chat (admin only)"""
    # Verify user is chat admin
    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "admin_ids": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found or you're not an admin")
    
    if chat["chat_type"] == ChatType.DIRECT:
        raise HTTPException(status_code=400, detail="Cannot add participants to direct chats")
    
    # Validate new participants are in the same compound
    new_participants = await db.users.find({
        "id": {"$in": participants_data.participant_ids},
        "compound_id": current_user.compound_id
    }).to_list(None)
    
    if len(new_participants) != len(participants_data.participant_ids):
        raise HTTPException(status_code=400, detail="Some participants not found in compound")
    
    # Add to chat participants
    current_participants = set(chat["participants"])
    new_participant_ids = [p["id"] for p in new_participants if p["id"] not in current_participants]
    
    if not new_participant_ids:
        return {"message": "All users are already participants"}
    
    # Update chat
    await db.chats.update_one(
        {"id": chat_id},
        {
            "$addToSet": {"participants": {"$each": new_participant_ids}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    # Create participant records
    for participant_id in new_participant_ids:
        participant = ChatParticipant(
            chat_id=chat_id,
            user_id=participant_id
        )
        await db.chat_participants.insert_one(participant.dict())
    
    # Notify all participants
    all_participants = list(current_participants) + new_participant_ids
    await manager.notify_chat_update(
        chat_id,
        "participants_added",
        {"new_participants": new_participants},
        all_participants
    )
    
    return {"message": f"Added {len(new_participant_ids)} participants to chat"}

# ============ PUSH NOTIFICATION ENDPOINTS ============

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

@api_router.post("/search/messages")
async def search_messages_endpoint(
    search_request: SearchRequest,
    current_user: User = Depends(get_current_user)
):
    """Search messages with advanced filters"""
    try:
        # Perform search
        results = await search_messages(
            current_user.id,
            current_user.compound_id,
            search_request
        )
        
        # Save search to history if query is not empty
        if search_request.query.strip():
            search_history = SearchHistory(
                user_id=current_user.id,
                query=search_request.query,
                search_type=search_request.search_type,
                filters=search_request.dict(exclude={"query", "search_type", "limit", "skip"}),
                results_count=results.get("total_count", 0)
            )
            
            await db.search_history.insert_one(search_history.dict())
        
        return {
            "success": True,
            "results": results
        }
        
    except Exception as e:
        logging.error(f"Error in search endpoint: {e}")
        raise HTTPException(status_code=500, detail="Search failed")

@api_router.get("/search/suggestions")
async def get_search_suggestions_endpoint(
    query: str,
    limit: int = 10,
    current_user: User = Depends(get_current_user)
):
    """Get search suggestions"""
    if len(query.strip()) < 2:
        return {"suggestions": []}
    
    suggestions = await get_search_suggestions(
        current_user.id,
        current_user.compound_id,
        query,
        limit
    )
    
    return {"suggestions": suggestions}

@api_router.get("/search/history")
async def get_search_history(
    limit: int = 20,
    current_user: User = Depends(get_current_user)
):
    """Get user's search history"""
    try:
        history = await db.search_history.find({
            "user_id": current_user.id
        }).sort("created_at", -1).limit(limit).to_list(None)
        
        return {"history": serialize_datetime(history)}
        
    except Exception as e:
        logging.error(f"Error getting search history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get search history")

@api_router.delete("/search/history")
async def clear_search_history(current_user: User = Depends(get_current_user)):
    """Clear user's search history"""
    try:
        result = await db.search_history.delete_many({"user_id": current_user.id})
        return {"message": f"Cleared {result.deleted_count} search history items"}
        
    except Exception as e:
        logging.error(f"Error clearing search history: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear search history")

@api_router.delete("/search/history/{history_id}")
async def delete_search_history_item(
    history_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete specific search history item"""
    try:
        result = await db.search_history.delete_one({
            "id": history_id,
            "user_id": current_user.id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Search history item not found")
        
        return {"message": "Search history item deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting search history item: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete search history item")

@api_router.get("/search/saved")
async def get_saved_searches(current_user: User = Depends(get_current_user)):
    """Get user's saved searches"""
    try:
        saved_searches = await db.saved_searches.find({
            "user_id": current_user.id
        }).sort("updated_at", -1).to_list(None)
        
        return {"saved_searches": serialize_datetime(saved_searches)}
        
    except Exception as e:
        logging.error(f"Error getting saved searches: {e}")
        raise HTTPException(status_code=500, detail="Failed to get saved searches")

@api_router.post("/search/saved")
async def save_search(
    save_request: SavedSearchRequest,
    current_user: User = Depends(get_current_user)
):
    """Save a search for later use"""
    try:
        # Check if name already exists
        existing = await db.saved_searches.find_one({
            "user_id": current_user.id,
            "name": save_request.name
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="A search with this name already exists")
        
        saved_search = SavedSearch(
            user_id=current_user.id,
            name=save_request.name,
            query=save_request.query,
            search_type=save_request.search_type,
            filters=save_request.filters
        )
        
        await db.saved_searches.insert_one(saved_search.dict())
        return {"message": "Search saved successfully", "saved_search": serialize_datetime(saved_search.dict())}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error saving search: {e}")
        raise HTTPException(status_code=500, detail="Failed to save search")

@api_router.put("/search/saved/{search_id}")
async def update_saved_search(
    search_id: str,
    save_request: SavedSearchRequest,
    current_user: User = Depends(get_current_user)
):
    """Update a saved search"""
    try:
        # Check if search exists and belongs to user
        existing = await db.saved_searches.find_one({
            "id": search_id,
            "user_id": current_user.id
        })
        
        if not existing:
            raise HTTPException(status_code=404, detail="Saved search not found")
        
        # Check if new name conflicts with other searches
        name_conflict = await db.saved_searches.find_one({
            "user_id": current_user.id,
            "name": save_request.name,
            "id": {"$ne": search_id}
        })
        
        if name_conflict:
            raise HTTPException(status_code=400, detail="A search with this name already exists")
        
        # Update search
        update_data = {
            "name": save_request.name,
            "query": save_request.query,
            "search_type": save_request.search_type,
            "filters": save_request.filters,
            "updated_at": datetime.utcnow()
        }
        
        await db.saved_searches.update_one(
            {"id": search_id, "user_id": current_user.id},
            {"$set": update_data}
        )
        
        return {"message": "Saved search updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating saved search: {e}")
        raise HTTPException(status_code=500, detail="Failed to update saved search")

@api_router.delete("/search/saved/{search_id}")
async def delete_saved_search(
    search_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a saved search"""
    try:
        result = await db.saved_searches.delete_one({
            "id": search_id,
            "user_id": current_user.id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Saved search not found")
        
        return {"message": "Saved search deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting saved search: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete saved search")

# ============ FILE GALLERY ENDPOINTS ============

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

@api_router.post("/chats/{chat_id}/schedule")
async def schedule_message(
    chat_id: str,
    schedule_data: ScheduledMessageCreate,
    current_user: User = Depends(get_current_user)
):
    """Schedule a message to be sent later"""
    # Verify user is participant
    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Validate scheduled time is in the future
    if schedule_data.scheduled_for <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
    
    try:
        # Create scheduled message
        scheduled_message = ScheduledMessage(
            chat_id=chat_id,
            sender_id=current_user.id,
            content=schedule_data.content,
            message_type=schedule_data.message_type,
            scheduled_for=schedule_data.scheduled_for,
            timezone=schedule_data.timezone,
            is_recurring=schedule_data.is_recurring,
            recurrence_pattern=schedule_data.recurrence_pattern,
            recurrence_end=schedule_data.recurrence_end
        )
        
        await db.scheduled_messages.insert_one(scheduled_message.dict())
        
        return {"message": "Message scheduled successfully", "scheduled_message": scheduled_message}
        
    except Exception as e:
        logging.error(f"Error scheduling message: {e}")
        raise HTTPException(status_code=500, detail="Failed to schedule message")

@api_router.get("/scheduled-messages")
async def get_scheduled_messages(
    chat_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: User = Depends(get_current_user)
):
    """Get user's scheduled messages"""
    try:
        # Build query
        query = {"sender_id": current_user.id}
        
        if chat_id:
            # Verify user has access to this chat
            chat = await db.chats.find_one({
                "id": chat_id,
                "compound_id": current_user.compound_id,
                "participants": current_user.id,
                "is_active": True
            })
            if not chat:
                raise HTTPException(status_code=404, detail="Chat not found")
            query["chat_id"] = chat_id
        else:
            # Get all user's accessible chats
            user_chats = await db.chats.find({
                "compound_id": current_user.compound_id,
                "participants": current_user.id,
                "is_active": True
            }).to_list(None)
            user_chat_ids = [chat["id"] for chat in user_chats]
            query["chat_id"] = {"$in": user_chat_ids}
        
        if status:
            query["status"] = status
        
        # Get scheduled messages
        scheduled_messages = await db.scheduled_messages.find(query).sort("scheduled_for", 1).skip(skip).limit(limit).to_list(None)
        
        # Get total count
        total_count = await db.scheduled_messages.count_documents(query)
        
        # Get chat details
        chat_ids = list(set(msg["chat_id"] for msg in scheduled_messages))
        chats = await db.chats.find(
            {"id": {"$in": chat_ids}},
            {"id": 1, "name": 1, "chat_type": 1}
        ).to_list(None)
        chats_dict = {chat["id"]: chat for chat in chats}
        
        # Enhance messages with chat info
        for msg in scheduled_messages:
            msg["chat"] = chats_dict.get(msg["chat_id"])
        
        return {
            "scheduled_messages": serialize_datetime(scheduled_messages),
            "total_count": total_count,
            "has_more": total_count > (skip + len(scheduled_messages))
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting scheduled messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to get scheduled messages")

@api_router.put("/scheduled-messages/{message_id}")
async def update_scheduled_message(
    message_id: str,
    update_data: ScheduledMessageUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a scheduled message"""
    try:
        # Find scheduled message
        scheduled_message = await db.scheduled_messages.find_one({
            "id": message_id,
            "sender_id": current_user.id,
            "status": "pending"
        })
        
        if not scheduled_message:
            raise HTTPException(status_code=404, detail="Scheduled message not found or cannot be modified")
        
        # Validate scheduled time if provided
        if update_data.scheduled_for and update_data.scheduled_for <= datetime.utcnow():
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
        
        # Build update data
        update_fields = update_data.dict(exclude_unset=True)
        if update_fields:
            await db.scheduled_messages.update_one(
                {"id": message_id, "sender_id": current_user.id},
                {"$set": update_fields}
            )
        
        return {"message": "Scheduled message updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating scheduled message: {e}")
        raise HTTPException(status_code=500, detail="Failed to update scheduled message")

@api_router.delete("/scheduled-messages/{message_id}")
async def cancel_scheduled_message(
    message_id: str,
    current_user: User = Depends(get_current_user)
):
    """Cancel a scheduled message"""
    try:
        result = await db.scheduled_messages.update_one(
            {
                "id": message_id,
                "sender_id": current_user.id,
                "status": "pending"
            },
            {"$set": {"status": "cancelled"}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Scheduled message not found or cannot be cancelled")
        
        return {"message": "Scheduled message cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error cancelling scheduled message: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel scheduled message")

@api_router.post("/scheduled-messages/process")
async def process_scheduled_messages_endpoint(current_user: User = Depends(get_current_user)):
    """Manually trigger processing of scheduled messages (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can trigger message processing")
    
    try:
        processed_count = await process_scheduled_messages()
        return {"message": f"Processed {processed_count} scheduled messages"}
        
    except Exception as e:
        logging.error(f"Error processing scheduled messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to process scheduled messages")

# ============ ENHANCED MESSAGE SCHEDULING ENDPOINTS ============

class MessageScheduleRequest(BaseModel):
    message_content: str
    recipient_type: str  # "direct", "group", "compound"
    recipient_id: Optional[str] = None  # Not needed for compound-wide
    scheduled_for: datetime
    repeat_type: str = "none"  # "none", "daily", "weekly", "monthly"

@api_router.post("/messages/schedule")
async def schedule_message_enhanced(
    schedule_request: MessageScheduleRequest,
    current_user: User = Depends(get_current_user)
):
    """Enhanced message scheduling with recipient type support"""
    try:
        # Validate scheduled time is in the future
        if schedule_request.scheduled_for <= datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
        
        chat_id = None
        
        if schedule_request.recipient_type == "compound":
            # Create or find compound-wide chat
            compound_chat = await db.chats.find_one({
                "compound_id": current_user.compound_id,
                "chat_type": "compound_wide",
                "is_active": True
            })
            
            if not compound_chat:
                # Create compound-wide chat
                compound_users = await db.users.find({"compound_id": current_user.compound_id}).to_list(length=None)
                participant_ids = [user["id"] for user in compound_users]
                
                compound_chat = Chat(
                    compound_id=current_user.compound_id,
                    chat_type="compound_wide",
                    name="Compound Announcements",
                    participants=participant_ids,
                    created_by=current_user.id
                )
                await db.chats.insert_one(compound_chat.dict())
                chat_id = compound_chat.id
            else:
                chat_id = compound_chat["id"]
                
        elif schedule_request.recipient_type == "direct":
            if not schedule_request.recipient_id:
                raise HTTPException(status_code=400, detail="Recipient ID required for direct messages")
            
            # Find or create direct chat
            direct_chat = await db.chats.find_one({
                "compound_id": current_user.compound_id,
                "chat_type": "direct",
                "participants": {"$all": [current_user.id, schedule_request.recipient_id]},
                "is_active": True
            })
            
            if not direct_chat:
                # Create direct chat
                direct_chat = Chat(
                    compound_id=current_user.compound_id,
                    chat_type="direct",
                    participants=[current_user.id, schedule_request.recipient_id],
                    created_by=current_user.id
                )
                await db.chats.insert_one(direct_chat.dict())
                chat_id = direct_chat.id
            else:
                chat_id = direct_chat["id"]
                
        elif schedule_request.recipient_type == "group":
            if not schedule_request.recipient_id:
                raise HTTPException(status_code=400, detail="Group ID required for group messages")
            
            # Verify group chat exists and user is participant
            group_chat = await db.chats.find_one({
                "id": schedule_request.recipient_id,
                "compound_id": current_user.compound_id,
                "participants": current_user.id,
                "is_active": True
            })
            
            if not group_chat:
                raise HTTPException(status_code=404, detail="Group chat not found")
            
            chat_id = schedule_request.recipient_id
        else:
            raise HTTPException(status_code=400, detail="Invalid recipient type")
        
        # Create scheduled message
        scheduled_message = ScheduledMessage(
            chat_id=chat_id,
            sender_id=current_user.id,
            content=schedule_request.message_content,
            message_type="text",
            scheduled_for=schedule_request.scheduled_for,
            timezone="UTC",
            is_recurring=schedule_request.repeat_type != "none",
            recurrence_pattern=schedule_request.repeat_type if schedule_request.repeat_type != "none" else None
        )
        
        await db.scheduled_messages.insert_one(scheduled_message.dict())
        
        return {"message": "Message scheduled successfully", "scheduled_message": scheduled_message}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error scheduling enhanced message: {e}")
        raise HTTPException(status_code=500, detail="Failed to schedule message")

@api_router.get("/messages/scheduled")
async def get_scheduled_messages_enhanced(
    current_user: User = Depends(get_current_user)
):
    """Get scheduled messages with enhanced recipient information"""
    try:
        # Get user's accessible chats
        user_chats = await db.chats.find({
            "compound_id": current_user.compound_id,
            "participants": current_user.id,
            "is_active": True
        }).to_list(length=None)
        
        user_chat_ids = [chat["id"] for chat in user_chats]
        
        # Get scheduled messages for these chats
        scheduled_messages = await db.scheduled_messages.find({
            "chat_id": {"$in": user_chat_ids},
            "sender_id": current_user.id
        }).to_list(length=None)
        
        # Enhance with recipient information
        enhanced_messages = []
        for msg in scheduled_messages:
            chat = next((c for c in user_chats if c["id"] == msg["chat_id"]), None)
            if chat:
                # Determine recipient type and info
                if chat["chat_type"] == "compound_wide":
                    recipient_type = "compound"
                    recipient_id = None
                elif chat["chat_type"] == "direct":
                    recipient_type = "direct"
                    other_participant = next(p for p in chat["participants"] if p != current_user.id)
                    recipient_id = other_participant
                else:  # group
                    recipient_type = "group"
                    recipient_id = chat["id"]
                
                enhanced_msg = {
                    **msg,
                    "recipient_type": recipient_type,
                    "recipient_id": recipient_id,
                    "message_content": msg["content"],
                    "repeat_type": msg["recurrence_pattern"] or "none"
                }
                enhanced_messages.append(enhanced_msg)
        
        return {"messages": enhanced_messages}
        
    except Exception as e:
        logging.error(f"Error getting enhanced scheduled messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to get scheduled messages")

@api_router.put("/messages/scheduled/{message_id}")
async def update_scheduled_message_enhanced(
    message_id: str,
    update_request: MessageScheduleRequest,
    current_user: User = Depends(get_current_user)
):
    """Update a scheduled message with enhanced support"""
    try:
        # Find the scheduled message
        scheduled_message = await db.scheduled_messages.find_one({
            "id": message_id,
            "sender_id": current_user.id
        })
        
        if not scheduled_message:
            raise HTTPException(status_code=404, detail="Scheduled message not found")
        
        if scheduled_message["status"] != "pending":
            raise HTTPException(status_code=400, detail="Cannot update non-pending message")
        
        # Validate new scheduled time is in the future
        if update_request.scheduled_for <= datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
        
        # Update the message
        update_data = {
            "content": update_request.message_content,
            "scheduled_for": update_request.scheduled_for,
            "is_recurring": update_request.repeat_type != "none",
            "recurrence_pattern": update_request.repeat_type if update_request.repeat_type != "none" else None,
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.scheduled_messages.update_one(
            {"id": message_id},
            {"$set": update_data}
        )
        
        return {"message": "Scheduled message updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating enhanced scheduled message: {e}")
        raise HTTPException(status_code=500, detail="Failed to update scheduled message")

@api_router.delete("/messages/scheduled/{message_id}")
async def delete_scheduled_message_enhanced(
    message_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a scheduled message"""
    try:
        # Find and verify ownership
        scheduled_message = await db.scheduled_messages.find_one({
            "id": message_id,
            "sender_id": current_user.id
        })
        
        if not scheduled_message:
            raise HTTPException(status_code=404, detail="Scheduled message not found")
        
        if scheduled_message["status"] != "pending":
            raise HTTPException(status_code=400, detail="Cannot delete non-pending message")
        
        # Delete the message
        await db.scheduled_messages.delete_one({"id": message_id})
        
        return {"message": "Scheduled message deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting enhanced scheduled message: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete scheduled message")

# ============ ENHANCED SERVICE MANAGEMENT ENDPOINTS ============

@api_router.post("/service-providers")
async def create_service_provider(
    provider_data: ServiceProviderCreate,
    current_user: User = Depends(require_admin)
):
    """Create a new service provider (Admin only)"""
    try:
        # Check if provider already exists
        existing_provider = await db.service_providers.find_one({
            "email": provider_data.email,
            "compound_id": current_user.compound_id
        })
        
        if existing_provider:
            raise HTTPException(status_code=400, detail="Service provider already exists")
        
        provider = ServiceProvider(
            **provider_data.dict(),
            compound_id=current_user.compound_id
        )
        
        await db.service_providers.insert_one(serialize_datetime(provider.dict()))
        return {"message": "Service provider created successfully", "provider": serialize_datetime(provider.dict())}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating service provider: {e}")
        raise HTTPException(status_code=500, detail="Failed to create service provider")

@api_router.get("/service-providers")
async def get_service_providers(
    service_category: Optional[str] = None,
    specialty: Optional[str] = None,
    available_date: Optional[date] = None,
    current_user: User = Depends(get_current_user)
):
    """Get available service providers"""
    try:
        query = {
            "compound_id": current_user.compound_id,
            "is_active": True
        }
        
        if service_category:
            query["services"] = {"$in": [service_category]}
        
        if specialty:
            query["specialties"] = {"$in": [specialty]}
        
        providers = await db.service_providers.find(query).to_list(length=None)
        
        # Enhance with availability if date specified
        if available_date:
            day_name = available_date.strftime("%A").lower()
            available_providers = []
            for provider in providers:
                if day_name in provider.get("availability", {}):
                    available_providers.append(provider)
            providers = available_providers
        
        # Serialize ObjectIds and datetime objects
        serialized_providers = [serialize_datetime(provider) for provider in providers]
        
        return {"providers": serialized_providers}
        
    except Exception as e:
        logging.error(f"Error getting service providers: {e}")
        raise HTTPException(status_code=500, detail="Failed to get service providers")

@api_router.post("/service-bookings")
async def create_service_booking(
    booking_data: ServiceBookingCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new service booking"""
    try:
        # Verify provider exists and is available
        provider = await db.service_providers.find_one({
            "id": booking_data.provider_id,
            "compound_id": current_user.compound_id,
            "is_active": True
        })
        
        if not provider:
            raise HTTPException(status_code=404, detail="Service provider not found")
        
        # Check for scheduling conflicts if date/time specified
        if booking_data.scheduled_date and booking_data.scheduled_time:
            # Validate that scheduled date is not in the past
            if booking_data.scheduled_date < date.today():
                raise HTTPException(status_code=400, detail="Cannot schedule booking for past date")
            
            existing_booking = await db.service_bookings.find_one({
                "provider_id": booking_data.provider_id,
                "scheduled_date": booking_data.scheduled_date.isoformat(),
                "scheduled_time": booking_data.scheduled_time,
                "status": {"$in": ["pending", "confirmed", "in_progress"]}
            })
            
            if existing_booking:
                raise HTTPException(status_code=400, detail="Time slot already booked - scheduling conflict detected")
        
        # Calculate estimated cost based on provider's hourly rate
        estimated_cost = None
        if provider.get("hourly_rate") and booking_data.estimated_duration:
            estimated_cost = (provider["hourly_rate"] * booking_data.estimated_duration) / 60
        
        booking = ServiceBooking(
            **booking_data.dict(),
            resident_id=current_user.id,
            compound_id=current_user.compound_id,
            estimated_cost=estimated_cost
        )
        
        # Serialize the booking data before inserting
        booking_dict = serialize_datetime(booking.dict())
        await db.service_bookings.insert_one(booking_dict)
        
        # Send notification to provider (WebSocket or email)
        await manager.send_personal_message(
            json.dumps({
                "type": "new_booking",
                "booking_id": booking.id,
                "message": f"New {booking.priority} booking request from {current_user.full_name}"
            }),
            booking_data.provider_id
        )
        
        return {"message": "Service booking created successfully", "booking": serialize_datetime(booking.dict())}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating service booking: {e}")
        raise HTTPException(status_code=500, detail="Failed to create service booking")

@api_router.get("/service-bookings")
async def get_service_bookings(
    status: Optional[str] = None,
    provider_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get service bookings for current user"""
    try:
        query = {
            "compound_id": current_user.compound_id
        }
        
        if current_user.role == "resident":
            query["resident_id"] = current_user.id
        elif provider_id:
            query["provider_id"] = provider_id
        
        if status:
            query["status"] = status
        
        bookings = await db.service_bookings.find(query).sort("created_at", -1).to_list(length=None)
        
        # Enhance with provider and resident details
        enhanced_bookings = []
        for booking in bookings:
            provider = await db.service_providers.find_one({"id": booking["provider_id"]})
            resident = await db.users.find_one({"id": booking["resident_id"]})
            
            enhanced_booking = {
                **serialize_datetime(booking),
                "provider_name": provider["full_name"] if provider else "Unknown",
                "provider_phone": provider["phone"] if provider else None,
                "resident_name": resident["full_name"] if resident else "Unknown"
            }
            enhanced_bookings.append(enhanced_booking)
        
        return {"bookings": enhanced_bookings}
        
    except Exception as e:
        logging.error(f"Error getting service bookings: {e}")
        raise HTTPException(status_code=500, detail="Failed to get service bookings")

@api_router.put("/service-bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    status_update: BookingStatusUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update booking status"""
    try:
        booking = await db.service_bookings.find_one({
            "id": booking_id,
            "compound_id": current_user.compound_id
        })
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        # Check permissions
        if current_user.role == "resident" and booking["resident_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        update_data = {
            "status": status_update.status,
            "updated_at": datetime.now(timezone.utc)
        }
        
        if status_update.notes:
            update_data["completion_notes"] = status_update.notes
        
        if status_update.final_cost:
            update_data["final_cost"] = status_update.final_cost
        
        if status_update.status == "completed":
            update_data["completed_at"] = datetime.now(timezone.utc)
        
        await db.service_bookings.update_one(
            {"id": booking_id},
            {"$set": serialize_datetime(update_data)}
        )
        
        # Update provider stats if completed
        if status_update.status == "completed":
            await db.service_providers.update_one(
                {"id": booking["provider_id"]},
                {"$inc": {"total_jobs_completed": 1}}
            )
        
        return {"message": "Booking status updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating booking status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update booking status")

@api_router.post("/service-bookings/{booking_id}/review")
async def create_service_review(
    booking_id: str,
    review_data: ServiceReviewCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a review for completed service"""
    try:
        booking = await db.service_bookings.find_one({
            "id": booking_id,
            "resident_id": current_user.id,
            "compound_id": current_user.compound_id,
            "status": "completed"
        })
        
        if not booking:
            raise HTTPException(status_code=404, detail="Completed booking not found")
        
        # Check if review already exists
        existing_review = await db.service_reviews.find_one({
            "booking_id": booking_id,
            "resident_id": current_user.id
        })
        
        if existing_review:
            raise HTTPException(status_code=400, detail="Review already exists for this booking")
        
        review = ServiceReview(
            **review_data.dict(),
            booking_id=booking_id,
            resident_id=current_user.id,
            provider_id=booking["provider_id"],
            compound_id=current_user.compound_id
        )
        
        await db.service_reviews.insert_one(serialize_datetime(review.dict()))
        
        # Update provider's average rating
        provider_reviews = await db.service_reviews.find({"provider_id": booking["provider_id"]}).to_list(length=None)
        total_reviews = len(provider_reviews)
        avg_rating = sum(r["overall_rating"] for r in provider_reviews) / total_reviews
        
        await db.service_providers.update_one(
            {"id": booking["provider_id"]},
            {
                "$set": {
                    "average_rating": round(avg_rating, 2),
                    "total_reviews": total_reviews
                }
            }
        )
        
        return {"message": "Review submitted successfully", "review": serialize_datetime(review.dict())}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating service review: {e}")
        raise HTTPException(status_code=500, detail="Failed to create service review")

@api_router.get("/service-providers/{provider_id}/reviews")
async def get_provider_reviews(
    provider_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get reviews for a service provider"""
    try:
        # Get provider details
        provider = await db.service_providers.find_one({
            "id": provider_id,
            "compound_id": current_user.compound_id
        })
        
        if not provider:
            raise HTTPException(status_code=404, detail="Service provider not found")
        
        reviews = await db.service_reviews.find({
            "provider_id": provider_id,
            "compound_id": current_user.compound_id,
            "is_public": True
        }).sort("created_at", -1).to_list(length=None)
        
        # Enhance with resident names
        enhanced_reviews = []
        for review in reviews:
            resident = await db.users.find_one({"id": review["resident_id"]})
            enhanced_review = {
                **serialize_datetime(review),
                "resident_name": resident["full_name"] if resident else "Anonymous"
            }
            enhanced_reviews.append(enhanced_review)
        
        # Get provider stats
        provider_stats = {
            "average_rating": provider.get("average_rating", 0.0),
            "total_reviews": provider.get("total_reviews", 0),
            "total_jobs_completed": provider.get("total_jobs_completed", 0),
            "would_recommend_count": sum(1 for r in reviews if r.get("would_recommend", False))
        }
        
        return {
            "reviews": enhanced_reviews,
            "provider_stats": provider_stats
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting provider reviews: {e}")
        raise HTTPException(status_code=500, detail="Failed to get provider reviews")

@api_router.post("/service-bookings/{booking_id}/payment")
async def process_payment(
    booking_id: str,
    payment_request: PaymentRequest,
    current_user: User = Depends(get_current_user)
):
    """Process payment for service booking"""
    try:
        booking = await db.service_bookings.find_one({
            "id": booking_id,
            "resident_id": current_user.id,
            "compound_id": current_user.compound_id
        })
        
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        # Create payment transaction
        transaction = PaymentTransaction(
            booking_id=booking_id,
            resident_id=current_user.id,
            provider_id=booking["provider_id"],
            compound_id=current_user.compound_id,
            amount=payment_request.amount,
            payment_method=payment_request.payment_method,
            currency=payment_request.currency,
            metadata=payment_request.metadata
        )
        
        # Simulate payment processing based on method
        if payment_request.payment_method == "cash":
            transaction.status = "pending"  # Will be marked complete when service is done
        elif payment_request.payment_method in ["card", "instapay", "mobile_pay", "digital_wallet"]:
            # Here you would integrate with actual payment processors
            # For now, simulate success
            transaction.status = "completed"
            transaction.transaction_id = f"txn_{uuid.uuid4().hex[:10]}"
        elif payment_request.payment_method == "bank_transfer":
            transaction.status = "processing"  # Manual verification needed
        
        await db.payment_transactions.insert_one(serialize_datetime(transaction.dict()))
        
        # Update booking payment status
        await db.service_bookings.update_one(
            {"id": booking_id},
            {
                "$set": serialize_datetime({
                    "payment_method": payment_request.payment_method,
                    "payment_status": transaction.status,
                    "payment_id": transaction.id,
                    "final_cost": payment_request.amount,
                    "updated_at": datetime.now(timezone.utc)
                })
            }
        )
        
        return {
            "message": "Payment processed successfully",
            "transaction": serialize_datetime(transaction.dict()),
            "status": transaction.status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error processing payment: {e}")
        raise HTTPException(status_code=500, detail="Failed to process payment")

@api_router.get("/service-analytics")
async def get_service_analytics(
    current_user: User = Depends(require_admin)
):
    """Get service analytics for admin dashboard"""
    try:
        # Total bookings by status
        booking_stats = await db.service_bookings.aggregate([
            {"$match": {"compound_id": current_user.compound_id}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]).to_list(length=None)
        
        # Revenue by payment method
        revenue_stats = await db.payment_transactions.aggregate([
            {
                "$match": {
                    "compound_id": current_user.compound_id,
                    "status": "completed"
                }
            },
            {
                "$group": {
                    "_id": "$payment_method",
                    "total_amount": {"$sum": "$amount"},
                    "count": {"$sum": 1}
                }
            }
        ]).to_list(length=None)
        
        # Top rated providers
        top_providers = await db.service_providers.find({
            "compound_id": current_user.compound_id,
            "is_active": True
        }).sort("average_rating", -1).limit(5).to_list(length=None)
        
        return {
            "analytics": {
                "booking_statistics": {stat["_id"]: stat["count"] for stat in booking_stats},
                "revenue_statistics": serialize_datetime(revenue_stats),
                "top_rated_providers": serialize_datetime(top_providers)
            }
        }
        
    except Exception as e:
        logging.error(f"Error getting service analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get service analytics")

# ============ FAMILY MANAGEMENT ENDPOINTS ============

@api_router.post("/family-members")
async def create_family_member(
    member_data: FamilyMemberCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new family member for the current user's unit"""
    try:
        # Create family member
        family_member = FamilyMember(
            **member_data.dict(),
            unit_id=current_user.id,  # Using user ID as unit ID for now
            compound_id=current_user.compound_id,
            primary_resident_id=current_user.id,
            unit_number=current_user.unit_number
        )
        
        await db.family_members.insert_one(family_member.dict())
        
        return {"message": "Family member added successfully", "family_member": family_member}
        
    except Exception as e:
        logging.error(f"Error creating family member: {e}")
        raise HTTPException(status_code=500, detail="Failed to create family member")

@api_router.get("/family-members")
async def get_family_members(
    current_user: User = Depends(get_current_user)
):
    """Get all family members for the current user's unit"""
    try:
        if current_user.role == "admin":
            # Admin can see all family members in the compound
            family_members = await db.family_members.find({
                "compound_id": current_user.compound_id,
                "is_active": True
            }).to_list(length=None)
        else:
            # Residents can only see their own family members
            family_members = await db.family_members.find({
                "primary_resident_id": current_user.id,
                "is_active": True
            }).to_list(length=None)
        
        # Serialize datetime objects
        serialized_members = [serialize_datetime(member) for member in family_members]
        
        return {"family_members": serialized_members}
        
    except Exception as e:
        logging.error(f"Error getting family members: {e}")
        raise HTTPException(status_code=500, detail="Failed to get family members")

@api_router.put("/family-members/{member_id}")
async def update_family_member(
    member_id: str,
    update_data: FamilyMemberUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update a family member"""
    try:
        # Find the family member
        family_member = await db.family_members.find_one({
            "id": member_id,
            "primary_resident_id": current_user.id
        })
        
        if not family_member:
            raise HTTPException(status_code=404, detail="Family member not found")
        
        # Update the family member
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict["updated_at"] = datetime.now(timezone.utc)
        
        await db.family_members.update_one(
            {"id": member_id},
            {"$set": update_dict}
        )
        
        return {"message": "Family member updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating family member: {e}")
        raise HTTPException(status_code=500, detail="Failed to update family member")

@api_router.delete("/family-members/{member_id}")
async def delete_family_member(
    member_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete (deactivate) a family member"""
    try:
        # Find the family member
        family_member = await db.family_members.find_one({
            "id": member_id,
            "primary_resident_id": current_user.id
        })
        
        if not family_member:
            raise HTTPException(status_code=404, detail="Family member not found")
        
        # Soft delete by setting is_active to False
        await db.family_members.update_one(
            {"id": member_id},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
        )
        
        return {"message": "Family member removed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting family member: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete family member")

@api_router.post("/family-members/{member_id}/qr-code")
async def generate_member_qr_code(
    member_id: str,
    qr_request: QRCodeRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate QR code for family member gate access"""
    try:
        # Find the family member
        family_member = await db.family_members.find_one({
            "id": member_id,
            "primary_resident_id": current_user.id,
            "is_active": True
        })
        
        if not family_member:
            raise HTTPException(status_code=404, detail="Family member not found")
        
        # Set expiration time
        expires_at = datetime.now(timezone.utc) + timedelta(hours=qr_request.expires_in_hours)
        
        # Create access token
        access_token = create_gate_access_token(
            family_member_id=member_id,
            unit_id=family_member["unit_id"],
            compound_id=current_user.compound_id,
            expires_at=expires_at
        )
        
        # Generate QR code with the access token
        qr_code_data = generate_qr_code(access_token)
        
        if not qr_code_data:
            raise HTTPException(status_code=500, detail="Failed to generate QR code")
        
        # Update family member with QR code
        await db.family_members.update_one(
            {"id": member_id},
            {
                "$set": {
                    "qr_code": qr_code_data,
                    "qr_code_expires": expires_at,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return {
            "message": "QR code generated successfully",
            "qr_code": qr_code_data,
            "expires_at": expires_at.isoformat(),
            "access_token": access_token
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error generating QR code: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate QR code")

@api_router.post("/gate-access/verify")
async def verify_gate_access(
    access_token: str,
    gate_location: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Verify gate access token (for security guards)"""
    try:
        # Decode the access token
        import json
        try:
            token_data = json.loads(base64.b64decode(access_token).decode())
        except:
            raise HTTPException(status_code=400, detail="Invalid access token")
        
        # Check if token is expired
        expires_at = datetime.fromisoformat(token_data["expires_at"])
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Access token has expired")
        
        # Verify family member exists and is active
        family_member = await db.family_members.find_one({
            "id": token_data["family_member_id"],
            "compound_id": token_data["compound_id"],
            "is_active": True
        })
        
        if not family_member:
            raise HTTPException(status_code=404, detail="Family member not found or inactive")
        
        # Log the gate access
        gate_access = GateAccess(
            family_member_id=token_data["family_member_id"],
            unit_id=token_data["unit_id"],
            compound_id=token_data["compound_id"],
            gate_location=gate_location,
            security_guard_id=current_user.id if current_user.role == "admin" else None,
            access_granted=True
        )
        
        await db.gate_access.insert_one(gate_access.dict())
        
        return {
            "access_granted": True,
            "family_member_name": family_member["full_name"],
            "unit_number": family_member["unit_number"],
            "relationship": family_member["relationship"],
            "message": "Access granted"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error verifying gate access: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify gate access")

@api_router.get("/gate-access/history")
async def get_gate_access_history(
    current_user: User = Depends(get_current_user),
    limit: int = 100
):
    """Get gate access history"""
    try:
        if current_user.role == "admin":
            # Admin can see all gate access in the compound
            access_history = await db.gate_access.find({
                "compound_id": current_user.compound_id
            }).sort("access_time", -1).limit(limit).to_list(length=None)
        else:
            # Residents can only see their family's access history
            family_member_ids = await db.family_members.find({
                "primary_resident_id": current_user.id
            }).distinct("id")
            
            access_history = await db.gate_access.find({
                "family_member_id": {"$in": family_member_ids}
            }).sort("access_time", -1).limit(limit).to_list(length=None)
        
        # Enhance with family member details
        enhanced_history = []
        for access in access_history:
            family_member = await db.family_members.find_one({"id": access["family_member_id"]})
            enhanced_access = {
                **serialize_datetime(access),
                "family_member_name": family_member["full_name"] if family_member else "Unknown",
                "relationship": family_member["relationship"] if family_member else "Unknown"
            }
            enhanced_history.append(enhanced_access)
        
        return {"access_history": enhanced_history}
        
    except Exception as e:
        logging.error(f"Error getting gate access history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get gate access history")

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

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db_client():
    """Initialize database connection and indexes"""
    global client, db
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Create text indexes for search functionality
    await create_text_index()
    
    logging.info("Database connection and indexes initialized")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()