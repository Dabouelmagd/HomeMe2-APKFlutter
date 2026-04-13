"""
Payments & Stripe routes
"""
from fastapi import APIRouter, Request, HTTPException, Depends, Form, File, UploadFile
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid, json, logging, os

from database import get_db
from auth_deps import get_current_user, require_admin, require_super_admin, hash_password, verify_password, create_access_token, validate_password_strength
from helpers import serialize_datetime
from shared_models import *

router = APIRouter(prefix="/api")

async def upload_company_logo(
    logo: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload and process company logo"""
    try:
        # Validate file type
        if not logo.content_type or not logo.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Invalid image type")
        
        # Validate file size (max 5MB)
        content = await logo.read()
        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")
        
        # Create uploads directory if it doesn't exist
        uploads_dir = Path("/app/backend/uploads/logos")
        uploads_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_extension = Path(logo.filename).suffix.lower()
        if file_extension not in ['.jpg', '.jpeg', '.png', '.gif']:
            raise HTTPException(status_code=400, detail="Invalid file extension")
            
        unique_filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}{file_extension}"
        file_path = uploads_dir / unique_filename
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Create public URL (assuming served via static files)
        logo_url = f"/uploads/logos/{unique_filename}"
        
        return {
            "success": True,
            "logo_url": logo_url,
            "message": "Logo uploaded successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error uploading logo: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload logo")

# Payment Transaction Models for Stripe Integration
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

# Stripe Payment Endpoints
@router.post("/payments/create-session")
async def create_payment_session(
    request: PaymentSessionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create Stripe checkout session for utility bill payment"""
    try:
        db = get_db()
        # Get Stripe API key from environment
        stripe_api_key = os.environ.get('STRIPE_API_KEY')
        if not stripe_api_key:
            raise HTTPException(status_code=500, detail="Stripe API key not configured")
        
        # Validate utility bill exists and belongs to user
        bill = await db.utility_bills.find_one({"id": request.utility_bill_id})
        if not bill:
            raise HTTPException(status_code=404, detail="Utility bill not found")
        
        # For admins, allow payment of any bill in their compound
        # For residents, only allow payment of their own bills
        if current_user.role != UserRole.ADMIN:
            if bill.get("family_id") != current_user.family_id:
                raise HTTPException(status_code=403, detail="Cannot pay this bill")
        elif bill.get("compound_id") != current_user.compound_id:
            raise HTTPException(status_code=403, detail="Bill not in your compound")
        
        # Get frontend origin from request headers (for success/cancel URLs)
        frontend_origin = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        
        # Initialize Stripe checkout
        webhook_url = f"{frontend_origin}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        # Create success and cancel URLs
        success_url = f"{frontend_origin}/utilities?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{frontend_origin}/utilities?payment=cancelled"
        
        # Create checkout session
        checkout_request = CheckoutSessionRequest(
            amount=float(request.amount),
            currency=request.currency.lower(),
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "utility_bill_id": request.utility_bill_id,
                "user_id": current_user.id,
                "payment_type": "utility_bill"
            }
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record
        payment_transaction = PaymentTransaction(
            amount=request.amount,
            currency=request.currency,
            utility_bill_id=request.utility_bill_id,
            session_id=session.session_id,
            user_id=current_user.id,
            metadata={
                "utility_bill_id": request.utility_bill_id,
                "bill_type": bill.get("utility_type", "unknown"),
                "provider": bill.get("provider_name", "unknown")
            },
            payment_status="pending"
        )
        
        await db.payment_transactions.insert_one(payment_transaction.dict())
        
        return {
            "checkout_url": session.url,
            "session_id": session.session_id,
            "payment_id": payment_transaction.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating payment session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create payment session")

@router.get("/payments/status/{session_id}")
async def get_payment_status(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get payment status from Stripe"""
    try:
        db = get_db()
        # Get Stripe API key
        stripe_api_key = os.environ.get('STRIPE_API_KEY')
        if not stripe_api_key:
            raise HTTPException(status_code=500, detail="Stripe API key not configured")
        
        # Find payment transaction
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if not transaction:
            raise HTTPException(status_code=404, detail="Payment transaction not found")
        
        # Verify user has access to this payment
        if transaction["user_id"] != current_user.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Initialize Stripe checkout
        webhook_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        # Get checkout status from Stripe
        checkout_status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Update local transaction if payment was successful and not already updated
        if checkout_status.payment_status == "paid" and transaction["payment_status"] != "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": "paid",
                    "updated_at": datetime.utcnow()
                }}
            )
            
            # Update utility bill status to paid
            if transaction.get("utility_bill_id"):
                await db.utility_bills.update_one(
                    {"id": transaction["utility_bill_id"]},
                    {"$set": {
                        "status": PaymentStatus.PAID,
                        "payment_date": datetime.utcnow(),
                        "payment_method": "stripe"
                    }}
                )
        
        return PaymentStatusResponse(
            payment_id=transaction["id"],
            status=checkout_status.status,
            payment_status=checkout_status.payment_status,
            amount=checkout_status.amount_total / 100.0,  # Convert from cents
            currency=checkout_status.currency.upper(),
            metadata=checkout_status.metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting payment status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get payment status")

@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    try:
        db = get_db()
        # Get Stripe API key
        stripe_api_key = os.environ.get('STRIPE_API_KEY')
        if not stripe_api_key:
            raise HTTPException(status_code=500, detail="Stripe API key not configured")
        
        # Get webhook body and signature
        body = await request.body()
        signature = request.headers.get("stripe-signature")
        
        # Initialize Stripe checkout
        webhook_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        # Handle webhook
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        # Process the webhook event
        if webhook_response.event_type == "checkout.session.completed":
            session_id = webhook_response.session_id
            
            # Find and update payment transaction
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction and transaction["payment_status"] != "paid":
                # Update transaction
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "payment_status": "paid",
                        "updated_at": datetime.utcnow()
                    }}
                )
                
                # Update utility bill
                if transaction.get("utility_bill_id"):
                    await db.utility_bills.update_one(
                        {"id": transaction["utility_bill_id"]},
                        {"$set": {
                            "status": PaymentStatus.PAID,
                            "payment_date": datetime.utcnow(),
                            "payment_method": "stripe"
                        }}
                    )
                
                logging.info(f"Payment completed for session {session_id}")
        
        return {"status": "success"}
        
    except Exception as e:
        logging.error(f"Error handling Stripe webhook: {e}")
        raise HTTPException(status_code=400, detail="Webhook error")

# Import payment router
try:
    from payments import router as payments_router
except ImportError:
    payments_router = None

try:
    from notifications_push import router as push_notifications_router
except ImportError:
    push_notifications_router = None

