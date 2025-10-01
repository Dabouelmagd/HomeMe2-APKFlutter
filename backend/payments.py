from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict
import os
from datetime import datetime
import uuid
import asyncio
from dotenv import load_dotenv

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, 
    CheckoutSessionResponse, 
    CheckoutStatusResponse, 
    CheckoutSessionRequest
)
from db import get_database
from auth import get_current_user

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/api/payments", tags=["payments"])

# Payment packages configuration
PAYMENT_PACKAGES = {
    "monthly_fee": {"amount": 250.0, "currency": "USD", "name": "Monthly Fee"},
    "maintenance_basic": {"amount": 50.0, "currency": "USD", "name": "Basic Maintenance"},
    "maintenance_premium": {"amount": 150.0, "currency": "USD", "name": "Premium Maintenance"},
    "guest_parking": {"amount": 25.0, "currency": "USD", "name": "Guest Parking Fee"},
    "facility_booking": {"amount": 100.0, "currency": "USD", "name": "Facility Booking"},
    "late_fee": {"amount": 75.0, "currency": "USD", "name": "Late Payment Fee"},
}

class PaymentRequest(BaseModel):
    package_id: str
    origin_url: str
    metadata: Optional[Dict[str, str]] = {}

class CustomAmountRequest(BaseModel):
    description: str
    currency: str = "USD"
    origin_url: str
    metadata: Optional[Dict[str, str]] = {}

class PaymentTransaction(BaseModel):
    id: str
    user_id: Optional[str]
    session_id: str
    package_id: Optional[str]
    amount: float
    currency: str
    description: str
    payment_status: str  # initiated, pending, paid, failed, expired
    stripe_status: str
    metadata: Dict[str, str]
    created_at: datetime
    updated_at: datetime

def get_stripe_checkout():
    """Initialize Stripe checkout"""
    api_key = os.getenv("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe API key not configured")
    
    # Webhook URL will be set dynamically based on request
    return StripeCheckout(api_key=api_key, webhook_url="")

async def create_payment_transaction(
    db, 
    session_id: str, 
    user_id: str, 
    package_id: str, 
    amount: float, 
    currency: str, 
    description: str,
    metadata: Dict[str, str]
) -> str:
    """Create payment transaction record"""
    transaction_id = str(uuid.uuid4())
    
    transaction = {
        "id": transaction_id,
        "user_id": user_id,
        "session_id": session_id,
        "package_id": package_id,
        "amount": amount,
        "currency": currency,
        "description": description,
        "payment_status": "initiated",
        "stripe_status": "open",
        "metadata": metadata,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.payment_transactions.insert_one(transaction)
    return transaction_id

@router.post("/v1/checkout/session")
async def create_checkout_session(
    payment_request: PaymentRequest,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Create Stripe checkout session for predefined packages"""
    try:
        # Validate package
        if payment_request.package_id not in PAYMENT_PACKAGES:
            raise HTTPException(status_code=400, detail="Invalid package ID")
        
        package = PAYMENT_PACKAGES[payment_request.package_id]
        
        # Get host URL from request
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/payments/v1/webhook/stripe"
        
        # Initialize Stripe
        stripe_checkout = StripeCheckout(
            api_key=os.getenv("STRIPE_API_KEY"),
            webhook_url=webhook_url
        )
        
        # Create success and cancel URLs
        origin_url = payment_request.origin_url.rstrip('/')
        success_url = f"{origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin_url}/payment/cancel"
        
        # Prepare metadata
        metadata = {
            "user_id": current_user.get("id", ""),
            "package_id": payment_request.package_id,
            "description": package["name"],
            **payment_request.metadata
        }
        
        # Create checkout session
        checkout_request = CheckoutSessionRequest(
            amount=package["amount"],
            currency=package["currency"],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata
        )
        
        session_response: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create transaction record
        db = await get_database()
        transaction_id = await create_payment_transaction(
            db=db,
            session_id=session_response.session_id,
            user_id=current_user.get("id", ""),
            package_id=payment_request.package_id,
            amount=package["amount"],
            currency=package["currency"],
            description=package["name"],
            metadata=metadata
        )
        
        return {
            "url": session_response.url,
            "session_id": session_response.session_id,
            "transaction_id": transaction_id,
            "amount": package["amount"],
            "currency": package["currency"],
            "description": package["name"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")

@router.post("/v1/checkout/custom")
async def create_custom_checkout_session(
    custom_request: CustomAmountRequest,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Create Stripe checkout session for admin-defined custom amounts (Admin only)"""
    try:
        # Check if user is admin
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can create custom payments")
        
        # Get host URL from request
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/payments/v1/webhook/stripe"
        
        # Initialize Stripe
        stripe_checkout = StripeCheckout(
            api_key=os.getenv("STRIPE_API_KEY"),
            webhook_url=webhook_url
        )
        
        # Create success and cancel URLs
        origin_url = custom_request.origin_url.rstrip('/')
        success_url = f"{origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin_url}/payment/cancel"
        
        # For custom payments, we need to get the amount from admin input
        # This should be validated on the backend
        if "amount" not in custom_request.metadata:
            raise HTTPException(status_code=400, detail="Amount required for custom payments")
        
        try:
            amount = float(custom_request.metadata["amount"])
            if amount <= 0:
                raise ValueError("Amount must be positive")
        except (ValueError, KeyError):
            raise HTTPException(status_code=400, detail="Invalid amount specified")
        
        # Prepare metadata
        metadata = {
            "user_id": current_user.get("id", ""),
            "package_id": "custom",
            "description": custom_request.description,
            **custom_request.metadata
        }
        
        # Create checkout session
        checkout_request = CheckoutSessionRequest(
            amount=amount,
            currency=custom_request.currency,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata
        )
        
        session_response: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create transaction record
        db = await get_database()
        transaction_id = await create_payment_transaction(
            db=db,
            session_id=session_response.session_id,
            user_id=current_user.get("id", ""),
            package_id="custom",
            amount=amount,
            currency=custom_request.currency,
            description=custom_request.description,
            metadata=metadata
        )
        
        return {
            "url": session_response.url,
            "session_id": session_response.session_id,
            "transaction_id": transaction_id,
            "amount": amount,
            "currency": custom_request.currency,
            "description": custom_request.description
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create custom checkout session: {str(e)}")

@router.get("/v1/checkout/status/{session_id}")
async def get_checkout_status(session_id: str):
    """Get checkout session status and update transaction"""
    try:
        # Initialize Stripe
        stripe_checkout = get_stripe_checkout()
        
        # Get status from Stripe
        checkout_status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction in database
        db = await get_database()
        
        # Find transaction by session_id
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Update transaction status only if it changed and not already processed
        update_data = {
            "stripe_status": checkout_status.status,
            "updated_at": datetime.utcnow()
        }
        
        # Update payment status based on Stripe status
        if checkout_status.payment_status == "paid" and transaction["payment_status"] != "paid":
            update_data["payment_status"] = "paid"
            # Here you can add logic to process the successful payment
            # e.g., update user account, send confirmation email, etc.
        elif checkout_status.status == "expired":
            update_data["payment_status"] = "expired"
        elif checkout_status.payment_status == "unpaid":
            update_data["payment_status"] = "pending"
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": update_data}
        )
        
        # Return updated status
        return {
            "session_id": session_id,
            "status": checkout_status.status,
            "payment_status": checkout_status.payment_status,
            "amount_total": checkout_status.amount_total,
            "currency": checkout_status.currency,
            "metadata": checkout_status.metadata,
            "transaction_status": update_data.get("payment_status", transaction["payment_status"])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get checkout status: {str(e)}")

@router.post("/v1/webhook/stripe")
async def handle_stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        # Get request body and signature
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        if not signature:
            raise HTTPException(status_code=400, detail="Missing Stripe signature")
        
        # Initialize Stripe
        stripe_checkout = get_stripe_checkout()
        
        # Handle webhook
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Update transaction based on webhook event
        db = await get_database()
        
        if webhook_response.session_id:
            update_data = {
                "stripe_status": webhook_response.event_type,
                "updated_at": datetime.utcnow()
            }
            
            if webhook_response.payment_status == "paid":
                update_data["payment_status"] = "paid"
                # Process successful payment here
            
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": update_data}
            )
        
        return {"status": "success", "event_id": webhook_response.event_id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook processing failed: {str(e)}")

@router.get("/v1/packages")
async def get_payment_packages():
    """Get available payment packages"""
    return {
        "packages": PAYMENT_PACKAGES
    }

@router.get("/v1/transactions")
async def get_user_transactions(current_user = Depends(get_current_user)):
    """Get user's payment transactions"""
    try:
        db = await get_database()
        
        # Get user transactions
        transactions_cursor = db.payment_transactions.find(
            {"user_id": current_user.get("id")},
            {"_id": 0}  # Exclude MongoDB _id
        ).sort("created_at", -1)
        
        transactions = await transactions_cursor.to_list(length=100)
        
        return {
            "transactions": transactions,
            "total": len(transactions)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get transactions: {str(e)}")

@router.get("/v1/admin/transactions")
async def get_all_transactions(current_user = Depends(get_current_user)):
    """Get all payment transactions (Admin only)"""
    try:
        # Check if user is admin
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        db = await get_database()
        
        # Get all transactions
        transactions_cursor = db.payment_transactions.find(
            {},
            {"_id": 0}  # Exclude MongoDB _id
        ).sort("created_at", -1)
        
        transactions = await transactions_cursor.to_list(length=1000)
        
        # Calculate summary statistics
        total_amount = sum(t["amount"] for t in transactions if t["payment_status"] == "paid")
        paid_count = len([t for t in transactions if t["payment_status"] == "paid"])
        pending_count = len([t for t in transactions if t["payment_status"] in ["initiated", "pending"]])
        
        return {
            "transactions": transactions,
            "summary": {
                "total_transactions": len(transactions),
                "paid_transactions": paid_count,
                "pending_transactions": pending_count,
                "total_revenue": total_amount
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get transactions: {str(e)}")