"""
Stripe Payment Service for HomeMe
Handles subscription payments and recurring billing
"""
import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from typing import Optional, Dict
from bson import ObjectId

load_dotenv()

# Payment packages - Fixed prices defined on backend only
PAYMENT_PACKAGES = {
    "monthly_basic": {
        "name": "Basic Monthly",
        "name_ar": "الباقة الأساسية الشهرية",
        "amount": 99.00,
        "currency": "egp",
        "duration_days": 30,
        "features": ["Basic compound access", "Maintenance requests", "Community messaging"]
    },
    "monthly_premium": {
        "name": "Premium Monthly",
        "name_ar": "الباقة المميزة الشهرية",
        "amount": 199.00,
        "currency": "egp",
        "duration_days": 30,
        "features": ["All Basic features", "Priority support", "Advanced analytics", "Guest management"]
    },
    "annual_basic": {
        "name": "Basic Annual",
        "name_ar": "الباقة الأساسية السنوية",
        "amount": 999.00,
        "currency": "egp",
        "duration_days": 365,
        "features": ["Basic compound access", "Maintenance requests", "Community messaging", "2 months free"]
    },
    "annual_premium": {
        "name": "Premium Annual",
        "name_ar": "الباقة المميزة السنوية",
        "amount": 1999.00,
        "currency": "egp",
        "duration_days": 365,
        "features": ["All Premium features", "Dedicated support", "Custom branding", "3 months free"]
    },
    "maintenance_fee": {
        "name": "Maintenance Fee",
        "name_ar": "رسوم الصيانة",
        "amount": 50.00,
        "currency": "egp",
        "duration_days": 0,
        "features": ["One-time maintenance fee payment"]
    },
    "custom": {
        "name": "Custom Payment",
        "name_ar": "دفع مخصص",
        "amount": 0,  # Will be set dynamically for bills
        "currency": "egp",
        "duration_days": 0,
        "features": ["Custom payment amount"]
    }
}


class PaymentService:
    def __init__(self, db):
        self.db = db
        self.api_key = os.environ.get("STRIPE_API_KEY")
        self.stripe_checkout = None
        
    async def initialize_stripe(self, webhook_url: str):
        """Initialize Stripe checkout with webhook URL"""
        try:
            from homeme_integrations.payments.stripe.checkout import StripeCheckout
            self.stripe_checkout = StripeCheckout(
                api_key=self.api_key,
                webhook_url=webhook_url
            )
            return True
        except Exception as e:
            print(f"Error initializing Stripe: {e}")
            return False
    
    def get_packages(self):
        """Return available payment packages"""
        return PAYMENT_PACKAGES
    
    def get_package(self, package_id: str) -> Optional[Dict]:
        """Get a specific package by ID"""
        return PAYMENT_PACKAGES.get(package_id)
    
    async def create_checkout_session(
        self,
        package_id: str,
        origin_url: str,
        user_id: str,
        user_email: str,
        custom_amount: Optional[float] = None,
        bill_id: Optional[str] = None,
        compound_id: Optional[str] = None
    ) -> Dict:
        """
        Create a Stripe checkout session
        Security: Amount is taken from backend package definition only
        """
        from homeme_integrations.payments.stripe.checkout import CheckoutSessionRequest
        
        if not self.stripe_checkout:
            raise Exception("Stripe not initialized")
        
        # Get package details
        package = self.get_package(package_id)
        if not package:
            raise ValueError(f"Invalid package: {package_id}")
        
        # Get amount from backend definition (security critical)
        if package_id == "custom" and custom_amount:
            amount = float(custom_amount)
        else:
            amount = float(package["amount"])
        
        currency = package["currency"]
        
        # Build success/cancel URLs dynamically
        success_url = f"{origin_url}/app/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{origin_url}/app/payments"
        
        # Build metadata
        metadata = {
            "user_id": str(user_id),
            "user_email": user_email,
            "package_id": package_id,
            "package_name": package["name"],
            "source": "homeme_web"
        }
        
        if bill_id:
            metadata["bill_id"] = str(bill_id)
        if compound_id:
            metadata["compound_id"] = str(compound_id)
        
        # Create checkout request
        checkout_request = CheckoutSessionRequest(
            amount=amount,
            currency=currency,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata
        )
        
        # Create Stripe session
        session = await self.stripe_checkout.create_checkout_session(checkout_request)
        
        # Create payment transaction record BEFORE redirect
        transaction = {
            "session_id": session.session_id,
            "checkout_url": session.url,
            "user_id": user_id,
            "user_email": user_email,
            "package_id": package_id,
            "package_name": package["name"],
            "amount": amount,
            "currency": currency,
            "payment_status": "pending",
            "status": "initiated",
            "metadata": metadata,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        if bill_id:
            transaction["bill_id"] = bill_id
        if compound_id:
            transaction["compound_id"] = compound_id
        
        # Insert transaction record
        result = await self.db.payment_transactions.insert_one(transaction)
        transaction["_id"] = str(result.inserted_id)
        
        return {
            "url": session.url,
            "session_id": session.session_id,
            "transaction_id": str(result.inserted_id)
        }
    
    async def get_checkout_status(self, session_id: str) -> Dict:
        """Get the status of a checkout session and update database"""
        if not self.stripe_checkout:
            raise Exception("Stripe not initialized")
        
        # Get status from Stripe
        status = await self.stripe_checkout.get_checkout_status(session_id)
        
        # Find and update transaction
        transaction = await self.db.payment_transactions.find_one({"session_id": session_id})
        
        if transaction:
            # Prevent duplicate processing
            if transaction.get("payment_status") == "paid":
                return {
                    "status": status.status,
                    "payment_status": "paid",
                    "amount_total": status.amount_total,
                    "currency": status.currency,
                    "already_processed": True
                }
            
            # Update transaction status
            update_data = {
                "status": status.status,
                "payment_status": status.payment_status,
                "amount_total": status.amount_total,
                "updated_at": datetime.now(timezone.utc)
            }
            
            await self.db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": update_data}
            )
            
            # If payment successful, process post-payment actions
            if status.payment_status == "paid":
                await self._process_successful_payment(transaction, status)
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency,
            "metadata": status.metadata
        }
    
    async def _process_successful_payment(self, transaction: Dict, status):
        """Process actions after successful payment"""
        try:
            package_id = transaction.get("package_id")
            user_id = transaction.get("user_id")
            bill_id = transaction.get("bill_id")
            
            # Update bill if this was a bill payment
            if bill_id:
                await self.db.bills.update_one(
                    {"_id": ObjectId(bill_id)},
                    {
                        "$set": {
                            "status": "paid",
                            "paid_at": datetime.now(timezone.utc),
                            "payment_session_id": transaction.get("session_id")
                        }
                    }
                )
            
            # Update subscription if this was a subscription payment
            if package_id in ["monthly_basic", "monthly_premium", "annual_basic", "annual_premium"]:
                package = self.get_package(package_id)
                if package:
                    from datetime import timedelta
                    expiry_date = datetime.now(timezone.utc) + timedelta(days=package["duration_days"])
                    
                    await self.db.users.update_one(
                        {"_id": ObjectId(user_id)},
                        {
                            "$set": {
                                "subscription_status": "active",
                                "subscription_package": package_id,
                                "subscription_expiry": expiry_date,
                                "subscription_updated_at": datetime.now(timezone.utc)
                            }
                        }
                    )
            
            # Log successful payment
            await self.db.activity_logs.insert_one({
                "type": "payment_success",
                "user_id": user_id,
                "session_id": transaction.get("session_id"),
                "amount": transaction.get("amount"),
                "package_id": package_id,
                "created_at": datetime.now(timezone.utc)
            })
            
        except Exception as e:
            print(f"Error processing successful payment: {e}")
    
    async def handle_webhook(self, body: bytes, signature: str) -> Dict:
        """Handle Stripe webhook events"""
        if not self.stripe_checkout:
            raise Exception("Stripe not initialized")
        
        try:
            webhook_response = await self.stripe_checkout.handle_webhook(body, signature)
            
            # Update transaction based on webhook event
            if webhook_response.session_id:
                await self.db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {
                        "$set": {
                            "webhook_event_type": webhook_response.event_type,
                            "webhook_event_id": webhook_response.event_id,
                            "payment_status": webhook_response.payment_status,
                            "webhook_received_at": datetime.now(timezone.utc)
                        }
                    }
                )
            
            return {
                "event_type": webhook_response.event_type,
                "event_id": webhook_response.event_id,
                "session_id": webhook_response.session_id,
                "payment_status": webhook_response.payment_status
            }
        except Exception as e:
            print(f"Webhook error: {e}")
            raise
    
    async def get_user_transactions(self, user_id: str, limit: int = 20) -> list:
        """Get payment transactions for a user"""
        cursor = self.db.payment_transactions.find(
            {"user_id": user_id},
            {"_id": 1, "session_id": 1, "package_name": 1, "amount": 1, "currency": 1, 
             "payment_status": 1, "created_at": 1}
        ).sort("created_at", -1).limit(limit)
        
        transactions = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            transactions.append(doc)
        
        return transactions
    
    async def get_compound_transactions(self, compound_id: str, limit: int = 50) -> list:
        """Get payment transactions for a compound"""
        cursor = self.db.payment_transactions.find(
            {"compound_id": compound_id},
            {"_id": 1, "session_id": 1, "user_email": 1, "package_name": 1, 
             "amount": 1, "currency": 1, "payment_status": 1, "created_at": 1}
        ).sort("created_at", -1).limit(limit)
        
        transactions = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            transactions.append(doc)
        
        return transactions
