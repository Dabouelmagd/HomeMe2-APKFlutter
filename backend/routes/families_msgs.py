"""
Families, Fees, Invoices, Messages, Compounds Residences routes
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from pydantic import BaseModel
import uuid, logging

from database import get_db
from auth_deps import get_current_user, require_admin
from helpers import serialize_datetime, notify_compound_admins
from shared_models import *

router = APIRouter(prefix="/api")

@router.post("/families/{family_id}/members")
async def add_family_member(
    family_id: str,
    member_data: FamilyMemberAdd,
    current_user: dict = Depends(get_current_user)
):
    # Check if user is family head
    family = await db.families.find_one({"id": family_id})
    if not family or family["head_user_id"] != current_user['id']:
        raise HTTPException(status_code=403, detail="Only family head can add members")
    
    # Create family member
    password_hash = hash_password(member_data.password)
    member = User(
        username=member_data.username,
        email=member_data.email,
        password_hash=password_hash,
        role="resident",
        compound_id=current_user.get('compound_id',''),
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

@router.get("/families/my")
async def get_my_family(current_user: dict = Depends(get_current_user)):
    if not current_user.get('family_id',''):
        return {"family": None, "members": []}
    
    family = await db.families.find_one({"id": current_user.get('family_id','')})
    if not family:
        return {"family": None, "members": []}
    
    # Get family members
    members = await db.users.find(
        {"id": {"$in": family["members"]}},
        {"password_hash": 0}  # Exclude password
    ).to_list(None)
    
    return {"family": serialize_datetime(family), "members": serialize_datetime(members)}

# Financial Management Routes
@router.post("/maintenance-fees")
async def create_maintenance_fee(
    fee_data: MaintenanceFeeCreate,
    current_user: dict = Depends(require_admin)
):
    fee = MaintenanceFee(
        compound_id=current_user.get('compound_id',''),
        unit_number=fee_data.unit_number,
        amount=fee_data.amount,
        due_date=fee_data.due_date,
        description=fee_data.description,
        created_by=current_user['id']
    )
    
    await db.maintenance_fees.insert_one(fee.dict())
    
    # Create invoice for the family
    family = await db.families.find_one({
        "compound_id": current_user.get('compound_id',''),
        "unit_number": fee_data.unit_number
    })
    
    if family:
        invoice = Invoice(
            compound_id=current_user.get('compound_id',''),
            family_id=family["id"],
            unit_number=fee_data.unit_number,
            amount=fee_data.amount,
            description=fee_data.description,
            due_date=fee_data.due_date,
            created_by=current_user['id']
        )
        await db.invoices.insert_one(invoice.dict())
    
    return {"message": "Maintenance fee created successfully", "fee_id": fee.id}

@router.get("/invoices/my")
async def get_my_invoices(current_user: dict = Depends(get_current_user)):
    # Admin users can see all invoices in their compound
    db = get_db()
    if current_user.get('role','') == "admin":
        invoices = await db.invoices.find({"compound_id": current_user.get('compound_id','')}).to_list(None)
        return serialize_datetime(invoices)
    
    # Regular users see only invoices for units they own
    # Find all families where user is head or member
    families = await db.families.find({
        "$or": [
            {"head_user_id": current_user['id']},
            {"members": current_user['id']}
        ],
        "compound_id": current_user.get('compound_id','')
    }).to_list(None)
    
    if not families:
        return []
    
    # Get family IDs for the user's units
    family_ids = [family["id"] for family in families]
    
    # Get invoices for all the user's units
    invoices = await db.invoices.find({
        "family_id": {"$in": family_ids},
        "compound_id": current_user.get('compound_id','')
    }).to_list(None)
    
    return serialize_datetime(invoices)

@router.post("/payments")
async def create_payment(
    payment_data: PaymentCreate,
    current_user: dict = Depends(get_current_user)
):
    # Get invoice
    invoice = await db.invoices.find_one({"id": payment_data.invoice_id})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Admin users can pay invoices for any family in their compound
    if current_user.get('role','') == "admin":
        if invoice["compound_id"] != current_user.get('compound_id',''):
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        # Regular users can only pay their own family's invoices
        if invoice["family_id"] != current_user.get('family_id',''):
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Create mock payment
    # Use the invoice's family_id to properly associate the payment
    payment_family_id = invoice["family_id"] if current_user.get('role','') == "admin" else current_user.get('family_id','')
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
@router.post("/messages")
async def create_message(
    message_data: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    message = Message(
        compound_id=current_user.get('compound_id',''),
        sender_id=current_user['id'],
        message_type=message_data.message_type,
        subject=message_data.subject,
        content=message_data.content
    )
    
    await db.messages.insert_one(message.dict())
    
    # Notify admins about new message
    notification = Notification(
        compound_id=current_user.get('compound_id',''),
        sender_id=current_user['id'],
        title=f"New {message_data.message_type.replace('_', ' ').title()}",
        content=f"{current_user.get('full_name','')}: {message_data.subject}"
    )
    
    # Get admin IDs
    admins = await db.users.find(
        {"compound_id": current_user.get('compound_id',''), "role": "admin"}
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

@router.get("/messages")
async def get_messages(current_user: dict = Depends(get_current_user)):
    if current_user.get('role','') == "admin":
        messages = await db.messages.find({"compound_id": current_user.get('compound_id','')}).sort("created_at", -1).limit(200).to_list(None)
    else:
        messages = await db.messages.find({"sender_id": current_user['id']}).sort("created_at", -1).limit(200).to_list(None)
    
    return messages

# Notification Routes
@router.post("/notifications")
async def create_notification(
    notification_data: NotificationCreate,
    current_user: dict = Depends(require_admin)
):
    notification = Notification(
        compound_id=current_user.get('compound_id',''),
        sender_id=current_user['id'],
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
        await manager.broadcast_to_compound(notification_message, current_user.get('compound_id',''))
    
    return {"message": "Notification sent successfully", "notification_id": notification.id}

@router.get("/notifications/my")
async def get_my_notifications(current_user: dict = Depends(get_current_user)):
    # Get notifications for current user
    db = get_db()
    notifications = await db.notifications.find({
        "compound_id": current_user.get('compound_id',''),
        "$or": [
            {"recipient_ids": {"$size": 0}},  # Broadcast notifications
            {"recipient_ids": current_user['id']}  # Direct notifications
        ]
    }, {"_id": 0}).sort("created_at", -1).limit(100).to_list(None)
    
    return serialize_datetime(notifications)

@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {f"is_read.{current_user['id']}": True}}
    )
    
    return {"message": "Notification marked as read"}

# Residence Management Routes
@router.get("/compounds/{compound_id}/residences")
async def get_compound_residences(compound_id: str, current_user: dict = Depends(require_admin)):
    if current_user.get('compound_id','') != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all families in the compound
    families = await db.families.find({"compound_id": compound_id}).to_list(None)
    
    # Get all residents
    residents = await db.users.find({
        "compound_id": compound_id,
        "role": "resident"
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

@router.get("/compounds/{compound_id}/residents")
async def get_compound_residents(compound_id: str, current_user: dict = Depends(require_admin)):
    if current_user.get('compound_id','') != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get all residents in the compound
    residents = await db.users.find({
        "compound_id": compound_id,
        "role": "resident"
    }, {"password_hash": 0}).to_list(None)
    
    return {
        "residents": residents,
        "total_count": len(residents)
    }

# Database Management Routes (Super Admin Only)
