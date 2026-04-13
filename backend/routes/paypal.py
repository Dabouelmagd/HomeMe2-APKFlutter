"""
PayPal Payment routes
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone, timedelta
from typing import Optional
from pydantic import BaseModel
import uuid
import logging
import os

from paypalcheckoutsdk.core import PayPalHttpClient, SandboxEnvironment, LiveEnvironment
from paypalcheckoutsdk.orders import OrdersCreateRequest, OrdersCaptureRequest

from database import get_db
from auth_deps import get_current_user
from helpers import serialize_datetime

router = APIRouter(prefix="/api")

PLAN_PRICES_EGP = {
    "basic": 500, "pro": 1200, "premium": 2200,
    "company_startup": 3500, "company_business": 7500, "company_enterprise": 20000,
}
DURATION_MULTIPLIERS = {
    "1_month": 1, "3_months": 3, "6_months": 6,
    "9_months": 9, "1_year": 10, "lifetime": 120,
}


def get_paypal_client():
    client_id = os.environ.get('PAYPAL_CLIENT_ID')
    secret = os.environ.get('PAYPAL_SECRET')
    if not client_id or not secret:
        return None
    mode = os.environ.get('PAYPAL_MODE', 'sandbox')
    if mode == 'live':
        env = LiveEnvironment(client_id=client_id, client_secret=secret)
    else:
        env = SandboxEnvironment(client_id=client_id, client_secret=secret)
    return PayPalHttpClient(env)


class PayPalSubscribeRequest(BaseModel):
    plan: str
    duration: str = "1_month"
    currency: str = "usd"


@router.post("/payments/paypal/create-order")
async def create_paypal_order(data: PayPalSubscribeRequest, current_user: dict = Depends(get_current_user)):
    """Create PayPal order for subscription payment"""
    try:
        client = get_paypal_client()
        if not client:
            raise HTTPException(status_code=500, detail="PayPal not configured")

        monthly_price = PLAN_PRICES_EGP.get(data.plan, 0)
        if monthly_price == 0:
            raise HTTPException(status_code=400, detail="Invalid plan")

        multiplier = DURATION_MULTIPLIERS.get(data.duration, 1)
        total_egp = monthly_price * multiplier

        if data.currency == "usd":
            total = round(total_egp * 0.02, 2)
            currency_code = "USD"
        else:
            total = float(total_egp)
            currency_code = "USD"  # PayPal requires USD for most regions

        plan_names = {
            "basic": "Basic", "pro": "Pro", "premium": "Premium",
            "company_startup": "Company Startup", "company_business": "Company Business",
            "company_enterprise": "Company Enterprise"
        }
        duration_names = {
            "1_month": "1 Month", "3_months": "3 Months", "6_months": "6 Months",
            "9_months": "9 Months", "1_year": "1 Year", "lifetime": "Lifetime"
        }

        request = OrdersCreateRequest()
        request.prefer('return=representation')
        request.request_body({
            "intent": "CAPTURE",
            "purchase_units": [{
                "reference_id": f"sub_{current_user['id']}_{data.plan}",
                "description": f"HomeMe {plan_names.get(data.plan, data.plan)} - {duration_names.get(data.duration, data.duration)}",
                "amount": {
                    "currency_code": currency_code,
                    "value": f"{total:.2f}"
                },
                "custom_id": f"{current_user['id']}|{data.plan}|{data.duration}"
            }],
            "application_context": {
                "brand_name": "HomeMe",
                "landing_page": "BILLING",
                "user_action": "PAY_NOW",
                "return_url": f"{os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000')}/app/dashboard?payment=success&method=paypal",
                "cancel_url": f"{os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000')}/app/dashboard?payment=cancelled"
            }
        })

        response = client.execute(request)
        order = response.result

        # Save transaction
        db = get_db()
        transaction = {
            "id": str(uuid.uuid4()),
            "user_id": current_user['id'],
            "paypal_order_id": order.id,
            "payment_type": "subscription",
            "payment_method": "paypal",
            "amount": total,
            "currency": currency_code,
            "plan": data.plan,
            "duration": data.duration,
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc)
        }
        await db.payment_transactions.insert_one(transaction)

        # Find approval URL
        approve_url = next((link.href for link in order.links if link.rel == "approve"), None)

        return {
            "order_id": order.id,
            "approve_url": approve_url,
            "amount": total,
            "currency": currency_code,
            "status": order.status
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"PayPal create order error: {e}")
        raise HTTPException(status_code=500, detail="فشل في إنشاء طلب PayPal")


@router.post("/payments/paypal/capture/{order_id}")
async def capture_paypal_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Capture (confirm) PayPal payment after user approval"""
    try:
        client = get_paypal_client()
        if not client:
            raise HTTPException(status_code=500, detail="PayPal not configured")

        request = OrdersCaptureRequest(order_id)
        response = client.execute(request)
        order = response.result

        db = get_db()

        if order.status == "COMPLETED":
            # Find transaction
            transaction = await db.payment_transactions.find_one({"paypal_order_id": order_id})
            if transaction:
                plan = transaction.get("plan", "basic")
                duration = transaction.get("duration", "1_month")
                duration_days = {"1_month": 30, "3_months": 90, "6_months": 180, "9_months": 270, "1_year": 365, "lifetime": 36500}.get(duration, 30)

                sub_end = datetime.now(timezone.utc) + timedelta(days=duration_days)
                await db.users.update_one(
                    {"id": current_user['id']},
                    {"$set": {
                        "subscription_active": True,
                        "subscription_type": duration,
                        "subscription_plan": plan,
                        "subscription_start": datetime.now(timezone.utc).isoformat(),
                        "subscription_end": sub_end.isoformat(),
                        "subscription_payment_method": "paypal",
                        "subscription_paypal_order": order_id
                    }}
                )

                await db.payment_transactions.update_one(
                    {"paypal_order_id": order_id},
                    {"$set": {"payment_status": "paid", "paid_at": datetime.now(timezone.utc)}}
                )

            return {"status": "success", "message": "تم تفعيل الاشتراك بنجاح!", "order_status": order.status}
        else:
            return {"status": "pending", "message": "الدفع لم يكتمل بعد", "order_status": order.status}

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"PayPal capture error: {e}")
        raise HTTPException(status_code=500, detail="فشل في تأكيد الدفع")


@router.get("/payments/methods")
async def get_payment_methods():
    """Get available payment methods with details"""
    return {
        "methods": [
            {"id": "stripe", "name": "بطاقة ائتمان", "name_en": "Credit Card", "desc": "Visa, Mastercard, Mada", "enabled": bool(os.environ.get('STRIPE_API_KEY')), "type": "online"},
            {"id": "paypal", "name": "PayPal", "name_en": "PayPal", "desc": "دفع آمن عبر PayPal", "enabled": bool(os.environ.get('PAYPAL_CLIENT_ID')), "type": "online"},
            {"id": "instapay", "name": "انستاباي", "name_en": "InstaPay", "desc": f"تحويل فوري إلى: {os.environ.get('INSTAPAY_NUMBER', '')}", "number": os.environ.get('INSTAPAY_NUMBER', ''), "enabled": bool(os.environ.get('INSTAPAY_NUMBER')), "type": "manual"},
            {"id": "vodafone_cash", "name": "محفظة فودافون كاش", "name_en": "Vodafone Cash", "desc": f"تحويل إلى: {os.environ.get('VODAFONE_WALLET', '')}", "number": os.environ.get('VODAFONE_WALLET', ''), "enabled": bool(os.environ.get('VODAFONE_WALLET')), "type": "manual"},
            {"id": "bank_transfer", "name": "تحويل بنكي", "name_en": "Bank Transfer", "desc": "قريباً - جاري التجهيز", "enabled": False, "type": "manual"},
        ]
    }
