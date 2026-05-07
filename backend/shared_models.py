"""
Shared Pydantic models for HomeMe backend routes
"""
import uuid
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


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

class ServiceStatus(str):
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"

class MessageType(str):
    MAINTENANCE_REQUEST = "maintenance_request"
    COMPLAINT = "complaint"
    GENERAL = "general"

class ChatType(str):
    DIRECT = "direct"
    GROUP = "group"
    COMPOUND_WIDE = "compound_wide"

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


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str
    compound_id: Optional[str] = None  # admin endpoints resolve from X-Active-Compound-Id header
    full_name: str
    phone: Optional[str] = None
    unit_number: Optional[str] = None
    subscription_code: Optional[str] = None
    selected_plan: Optional[str] = None  # company_admin only: starter|company_startup|company_business|company_enterprise
    referral_code: Optional[str] = None  # company_admin only: CO-XXXXXX from referrer's share link


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
    # `family_member_id` is redundant — it's already in the URL path. Optional for backward-compat.
    family_member_id: Optional[str] = None
    expires_in_hours: int = 24  # Default 24 hours validity


class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amount: float
    currency: str = "EGP"
    utility_bill_id: Optional[str] = None  # For utility bill payments
    session_id: str  # Stripe session ID
    payment_id: Optional[str] = None
    user_id: Optional[str] = None
    metadata: Dict[str, Any] = {}
    payment_status: str = "pending"  # pending, paid, failed, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PaymentSessionCreate(BaseModel):
    utility_bill_id: str
    amount: float
    currency: str = "EGP"


class PaymentStatusResponse(BaseModel):
    payment_id: str
    status: str
    payment_status: str
    amount: float
    currency: str
    metadata: Dict[str, Any]


