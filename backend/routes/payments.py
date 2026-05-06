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
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

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
            
        unique_filename = f"{current_user['id']}_{uuid.uuid4().hex[:8]}{file_extension}"
        file_path = uploads_dir / unique_filename
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Create public URL (assuming served via static files)
        logo_url = f"/api/files/logos/{unique_filename}"
        
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
        if current_user.get('role','') != 'admin':
            if bill.get("family_id") != current_user.get('family_id',''):
                raise HTTPException(status_code=403, detail="Cannot pay this bill")
        elif bill.get("compound_id") != current_user.get('compound_id',''):
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
                "user_id": current_user['id'],
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
            user_id=current_user['id'],
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
        if transaction["user_id"] != current_user['id'] and current_user.get('role','') != 'admin':
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


# NOTE: /webhook/stripe was historically defined here too. It has been merged into
# routes/stripe_payments.py — the unified handler now activates company subscriptions,
# utility bills, and legacy user subscriptions in a single place.

# ==================== SUBSCRIPTION PAYMENT ENDPOINTS ====================

class SubscriptionPaymentRequest(BaseModel):
    plan: str  # starter, basic, pro, premium, company_startup, company_business, company_enterprise
    duration: str = "1_month"  # 1_month, 3_months, 6_months, 9_months, 1_year, lifetime
    currency: str = "egp"


PLAN_PRICES_EGP = {
    "starter": 0,
    "basic": 800,
    "pro": 1500,
    "premium": 2800,
    "company_startup": 4000,
    "company_business": 9500,
    "company_enterprise": 25000,
}

DURATION_MULTIPLIERS = {
    "1_month": 1,
    "3_months": 3,
    "6_months": 6,
    "9_months": 9,
    "1_year": 10,  # 10 months (2 free)
    "lifetime": 120,  # 10 years equivalent
}


@router.post("/payments/subscribe")
async def create_subscription_payment(
    data: SubscriptionPaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create Stripe checkout for subscription payment"""
    try:
        db = get_db()
        stripe_api_key = os.environ.get('STRIPE_API_KEY')
        if not stripe_api_key:
            raise HTTPException(status_code=500, detail="Stripe not configured")

        monthly_price = PLAN_PRICES_EGP.get(data.plan, 0)
        if monthly_price == 0 and data.plan == "starter":
            raise HTTPException(status_code=400, detail="الخطة المجانية لا تحتاج دفع")

        multiplier = DURATION_MULTIPLIERS.get(data.duration, 1)
        total_egp = monthly_price * multiplier

        if data.currency == "usd":
            total = round(total_egp * 0.02, 2)
            currency = "usd"
        else:
            total = total_egp
            currency = "egp"

        plan_names = {
            "basic": "أساسي", "pro": "احترافي", "premium": "متقدم",
            "company_startup": "شركة ناشئة", "company_business": "شركة متوسطة", "company_enterprise": "شركة كبرى"
        }
        duration_names = {
            "1_month": "شهر", "3_months": "3 شهور", "6_months": "6 شهور",
            "9_months": "9 شهور", "1_year": "سنة", "lifetime": "مدى الحياة"
        }

        frontend_url = os.environ.get('REACT_APP_BACKEND_URL', os.environ.get('FRONTEND_URL', 'http://localhost:3000'))
        webhook_url = f"{frontend_url}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)

        success_url = f"{frontend_url}/app/dashboard?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{frontend_url}/app/dashboard?payment=cancelled"

        checkout_request = CheckoutSessionRequest(
            amount=float(total),
            currency=currency,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "payment_type": "subscription",
                "plan": data.plan,
                "duration": data.duration,
                "user_id": current_user['id']
            }
        )

        session = await stripe_checkout.create_checkout_session(checkout_request)

        # Save transaction
        transaction = {
            "id": str(uuid.uuid4()),
            "user_id": current_user['id'],
            "session_id": session.session_id,
            "payment_type": "subscription",
            "amount": total,
            "currency": currency,
            "plan": data.plan,
            "duration": data.duration,
            "payment_status": "pending",
            "metadata": {"plan": data.plan, "duration": data.duration},
            "created_at": datetime.now(timezone.utc)
        }
        await db.payment_transactions.insert_one(transaction)

        return {
            "checkout_url": session.url,
            "session_id": session.session_id,
            "amount": total,
            "currency": currency,
            "plan": plan_names.get(data.plan, data.plan),
            "duration": duration_names.get(data.duration, data.duration)
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating subscription payment: {e}")
        raise HTTPException(status_code=500, detail="فشل في إنشاء جلسة الدفع")


@router.get("/payments/subscription-status/{session_id}")
async def get_subscription_payment_status(session_id: str, current_user: dict = Depends(get_current_user)):
    """Check subscription payment status"""
    try:
        db = get_db()
        transaction = await db.payment_transactions.find_one(
            {"session_id": session_id, "payment_type": "subscription"},
            {"_id": 0}
        )
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        return {
            "status": transaction.get("payment_status", "pending"),
            "plan": transaction.get("plan"),
            "duration": transaction.get("duration"),
            "amount": transaction.get("amount"),
            "currency": transaction.get("currency")
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error checking subscription status: {e}")
        raise HTTPException(status_code=500, detail="Failed to check status")


@router.get("/payments/plans")
async def get_subscription_plans():
    """Get available subscription plans with prices + feature checklists.
    Feature lists are user-facing — keep them concise and benefit-oriented
    (5–7 bullets max). Used by the Plan Comparison cards on /app/payments."""
    return {
        "residential": [
            {
                "id": "starter", "name": "مجاني", "name_en": "Starter",
                "monthly_egp": 0, "monthly_usd": 0, "residents": "حتى 30 ساكن",
                "features": [
                    "حتى 30 ساكن",
                    "إدارة وحدات أساسية",
                    "تنبيهات بريد إلكتروني",
                ],
            },
            {
                "id": "basic", "name": "أساسي", "name_en": "Basic",
                "monthly_egp": 800, "monthly_usd": 16, "residents": "حتى 100 ساكن",
                "features": [
                    "حتى 100 ساكن",
                    "بوابة دفع إلكتروني",
                    "إشعارات Push للموبايل",
                    "تقارير شهرية بسيطة",
                ],
            },
            {
                "id": "pro", "name": "احترافي", "name_en": "Pro",
                "monthly_egp": 1500, "monthly_usd": 30, "residents": "غير محدود",
                "popular": True,
                "features": [
                    "كل ميزات أساسي",
                    "إدارة الزوار + QR لبوابة الكمباوند",
                    "حجز المرافق (نادي/قاعة/ملعب)",
                    "صيانة بتقرير صور + تقييم الفنيين",
                    "تقارير مالية تفصيلية",
                ],
            },
            {
                "id": "premium", "name": "متقدم", "name_en": "Premium",
                "monthly_egp": 2800, "monthly_usd": 56, "residents": "غير محدود",
                "features": [
                    "كل ميزات احترافي",
                    "تكامل بوابات دفع متعددة",
                    "إعلانات داخلية مدعومة",
                    "نسخ احتياطية يومية + Disaster Recovery",
                    "أولوية الدعم الفني (24 ساعة)",
                ],
            },
        ],
        "company": [
            {
                "id": "company_startup", "name": "شركة ناشئة", "name_en": "Startup",
                "monthly_egp": 4000, "monthly_usd": 80, "compounds": "حتى 3",
                "features": [
                    "حتى 3 كمباوندات",
                    "Dashboard موحّد لكل كمباوندك",
                    "نظام CRM مبسّط للسكان",
                    "إحصائيات أداء أسبوعية",
                    "نسخة تجريبية 14 يوم مجاناً",
                ],
            },
            {
                "id": "company_business", "name": "شركة متوسطة", "name_en": "Business",
                "monthly_egp": 9500, "monthly_usd": 190, "compounds": "1-8",
                "popular": True,
                "features": [
                    "حتى 8 كمباوندات",
                    "كل ميزات الشركة الناشئة",
                    "نظام إحالة شركات (5% خصم لكل إحالة)",
                    "تقارير KPI تفصيلية لكل كمباوند",
                    "إدارة مالية موحّدة + Disaster Recovery",
                    "إعلانات مدعومة + Advertiser Portal",
                ],
            },
            {
                "id": "company_enterprise", "name": "شركة كبرى", "name_en": "Enterprise",
                "monthly_egp": 25000, "monthly_usd": 500, "compounds": "غير محدود",
                "features": [
                    "كمباوندات غير محدودة",
                    "كل ميزات الشركة المتوسطة",
                    "API مخصّص + White-label",
                    "Account Manager خاص",
                    "تدريب الفريق + إعداد افتتاحي",
                    "SLA 99.9% + دعم على مدار الساعة",
                ],
            },
        ],
        "durations": [
            {"id": "1_month", "name": "شهر", "multiplier": 1},
            {"id": "3_months", "name": "3 شهور", "multiplier": 3},
            {"id": "6_months", "name": "6 شهور", "multiplier": 6},
            {"id": "9_months", "name": "9 شهور", "multiplier": 9},
            {"id": "1_year", "name": "سنة (شهرين مجاناً)", "multiplier": 10},
            {"id": "lifetime", "name": "مدى الحياة", "multiplier": 120},
        ]
    }