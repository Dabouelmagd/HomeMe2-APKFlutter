import os
from datetime import datetime, timezone
import paypalrestsdk
from fastapi import HTTPException

# Configure PayPal SDK
paypalrestsdk.configure({
    "mode": os.environ.get("PAYPAL_MODE", "sandbox"),  # sandbox or live
    "client_id": os.environ.get("PAYPAL_CLIENT_ID"),
    "client_secret": os.environ.get("PAYPAL_SECRET", "")  # Optional for now
})

def create_paypal_payment(amount, currency, plan_name, return_url, cancel_url):
    """
    Create a PayPal payment
    """
    try:
        payment = paypalrestsdk.Payment({
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": return_url,
                "cancel_url": cancel_url
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": plan_name,
                        "sku": plan_name.lower().replace(" ", "_"),
                        "price": str(amount),
                        "currency": currency,
                        "quantity": 1
                    }]
                },
                "amount": {
                    "total": str(amount),
                    "currency": currency
                },
                "description": f"HomeMe Subscription - {plan_name}"
            }]
        })

        if payment.create():
            # Get approval URL
            for link in payment.links:
                if link.rel == "approval_url":
                    return {
                        "payment_id": payment.id,
                        "approval_url": link.href,
                        "status": "created"
                    }
        else:
            raise HTTPException(status_code=400, detail=f"Payment creation failed: {payment.error}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PayPal error: {str(e)}")


def execute_paypal_payment(payment_id, payer_id):
    """
    Execute/capture a PayPal payment after user approval
    """
    try:
        payment = paypalrestsdk.Payment.find(payment_id)
        
        if payment.execute({"payer_id": payer_id}):
            return {
                "payment_id": payment.id,
                "state": payment.state,
                "payer_email": payment.payer.payer_info.email if hasattr(payment.payer, 'payer_info') else None,
                "amount": payment.transactions[0].amount.total,
                "currency": payment.transactions[0].amount.currency,
                "create_time": payment.create_time,
                "update_time": payment.update_time
            }
        else:
            raise HTTPException(status_code=400, detail=f"Payment execution failed: {payment.error}")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PayPal execution error: {str(e)}")


def get_payment_details(payment_id):
    """
    Get payment details
    """
    try:
        payment = paypalrestsdk.Payment.find(payment_id)
        return {
            "payment_id": payment.id,
            "state": payment.state,
            "amount": payment.transactions[0].amount.total if payment.transactions else None,
            "currency": payment.transactions[0].amount.currency if payment.transactions else None,
            "create_time": payment.create_time,
            "update_time": payment.update_time
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Payment not found: {str(e)}")
