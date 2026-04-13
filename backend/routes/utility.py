"""
Utility Connections & Bills routes
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid, json, logging, os

from database import get_db
from auth_deps import get_current_user, require_admin, require_super_admin, hash_password, verify_password, create_access_token, validate_password_strength
from helpers import serialize_datetime
from shared_models import *

router = APIRouter(prefix="/api")

async def get_utility_connections(compound_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get('compound_id','') != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get connections for current family or all if admin
    if current_user.get('role','') == UserRole.ADMIN:
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

@router.post("/compounds/{compound_id}/utility-connections")
async def create_utility_connection(
    compound_id: str,
    connection_data: UtilityConnectionCreate,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get('compound_id','') != compound_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User must be part of a family")
    
    connection = UtilityConnection(
        compound_id=compound_id,
        family_id=current_user.family_id,
        unit_number=current_user.get('unit_number','') or "N/A",
        utility_type=connection_data.utility_type,
        provider_name=connection_data.provider_name,
        account_number=connection_data.account_number,
        meter_number=connection_data.meter_number,
        connection_date=datetime.utcnow()
    )
    
    await db.utility_connections.insert_one(connection.dict())
    
    return {"message": "Utility connection created successfully", "connection_id": connection.id}

@router.get("/utility-bills/my")
async def get_my_utility_bills(current_user: dict = Depends(get_current_user)):
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

@router.get("/compounds/{compound_id}/utility-bills")
async def get_compound_utility_bills(compound_id: str, current_user: dict = Depends(require_admin)):
    if current_user.get('compound_id','') != compound_id:
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

@router.post("/compounds/{compound_id}/utility-bills")
async def create_utility_bill(
    compound_id: str,
    bill_data: UtilityBillCreate,
    current_user: dict = Depends(require_admin)
):
    if current_user.get('compound_id','') != compound_id:
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

@router.post("/utility-bills/{bill_id}/pay")
async def pay_utility_bill(
    bill_id: str,
    current_user: dict = Depends(get_current_user)
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
        compound_id=current_user.get('compound_id',''),
        sender_id=current_user["id"],
        title=f"Utility Payment: {bill['utility_type'].title()}",
        content=f"{current_user.get('full_name','')} paid {bill['utility_type']} bill - ${bill['amount']}"
    )
    
    # Get admin IDs
    admins = await db.users.find(
        {"compound_id": current_user.get('compound_id',''), "role": UserRole.ADMIN}
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

@router.get("/utility-bills/{bill_id}/receipt")
async def get_utility_bill_receipt(
    bill_id: str,
    current_user: dict = Depends(get_current_user)
):
    bill = await db.utility_bills.find_one({"id": bill_id})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    if bill["family_id"] != current_user.family_id and current_user.get('role','') != UserRole.ADMIN:
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
            "name": current_user.get('full_name',''),
            "unit_number": bill.get("unit_number")
        }
    }
    
    return receipt_data

# Services Management Routes
