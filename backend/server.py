from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pathlib import Path
import os
import logging
import uuid
import jwt
import bcrypt
import json
import base64
from io import BytesIO
from PIL import Image

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="HomeMe API", description="Compound Management System")
api_router = APIRouter(prefix="/api")

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()