"""
Push Notifications & Email routes - extracted from server.py
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid
import json
import logging
import os

from database import get_db
from auth_deps import get_current_user, require_admin, require_super_admin
from helpers import serialize_datetime
from push_notification_service import PushNotificationService, get_vapid_public_key
from shared_models import *


router = APIRouter(prefix="/api")

@router.post("/email/trigger-daily-reports")
async def trigger_daily_reports(current_user: dict = Depends(require_admin)):
    """Manually trigger daily reports for all compounds (admin only)"""
    count = await send_daily_reports_for_all_compounds()
    return {
        "message": f"تم إرسال {count} تقرير يومي لجميع المجمعات",
        "emails_sent": count
    }

# ==================== END AUTOMATED DAILY REPORT ====================




# ==================== PUSH NOTIFICATIONS ENDPOINTS ====================

class PushSubscriptionRequest(BaseModel):
    endpoint: str
    keys: Dict[str, str]
    user_agent: Optional[str] = None

@router.get("/push/public-key")
async def get_push_public_key():
    """Get VAPID public key for push subscription"""
    return {"public_key": get_vapid_public_key()}

@router.post("/push/subscribe")
async def subscribe_to_push(
    subscription_data: PushSubscriptionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Subscribe to push notifications"""
    try:
        db = get_db()
        # Check if subscription already exists
        existing = await db.push_subscriptions.find_one({
            "endpoint": subscription_data.endpoint
        })
        
        if existing:
            # Update existing subscription
            await db.push_subscriptions.update_one(
                {"endpoint": subscription_data.endpoint},
                {
                    "$set": {
                        "is_active": True,
                        "updated_at": datetime.now(timezone.utc),
                        "user_id": str(current_user.id),
                        "keys": subscription_data.keys,
                        "user_agent": subscription_data.user_agent
                    }
                }
            )
            return {"status": "updated", "message": "تم تحديث الاشتراك"}
        
        # Create new subscription
        subscription_doc = {
            "user_id": str(current_user.id),
            "username": current_user.username,
            "endpoint": subscription_data.endpoint,
            "keys": subscription_data.keys,
            "p256dh": subscription_data.keys.get("p256dh"),
            "auth": subscription_data.keys.get("auth"),
            "user_agent": subscription_data.user_agent,
            "compound_id": current_user.compound_id,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        result = await db.push_subscriptions.insert_one(subscription_doc)
        
        logging.info(f"New push subscription for user {current_user.username}")
        return {"status": "created", "message": "تم تفعيل الإشعارات الفورية"}
        
    except Exception as e:
        logging.error(f"Push subscription error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/push/unsubscribe")
async def unsubscribe_from_push(
    endpoint: str,
    current_user: dict = Depends(get_current_user)
):
    """Unsubscribe from push notifications"""
    try:
        db = get_db()
        result = await db.push_subscriptions.update_one(
            {"endpoint": endpoint, "user_id": str(current_user.id)},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
        )
        
        if result.modified_count > 0:
            return {"status": "removed", "message": "تم إلغاء الاشتراك"}
        
        return {"status": "not_found", "message": "لم يتم العثور على الاشتراك"}
        
    except Exception as e:
        logging.error(f"Push unsubscription error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/push/status")
async def get_push_status(current_user: dict = Depends(get_current_user)):
    """Get user's push notification subscription status"""
    try:
        db = get_db()
        subscription = await db.push_subscriptions.find_one({
            "user_id": str(current_user.id),
            "is_active": True
        })
        
        return {
            "is_subscribed": subscription is not None,
            "subscription_count": await db.push_subscriptions.count_documents({
                "user_id": str(current_user.id),
                "is_active": True
            })
        }
    except Exception as e:
        logging.error(f"Push status error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/push/test")
async def test_push_notification(current_user: dict = Depends(get_current_user)):
    """Send a test push notification to the current user"""
    try:
        db = get_db()
        subscriptions = await db.push_subscriptions.find({
            "user_id": str(current_user.id),
            "is_active": True
        }).to_list(length=10)
        
        if not subscriptions:
            return {"success": False, "message": "لا يوجد اشتراك نشط للإشعارات"}
        
        results = {"sent": 0, "failed": 0}
        
        for sub in subscriptions:
            success = PushNotificationService.send_notification(
                subscription=sub,
                title="إشعار تجريبي 🔔",
                body="هذا إشعار تجريبي من HomeMe",
                url="/app/dashboard",
                tag="test"
            )
            if success:
                results["sent"] += 1
            else:
                results["failed"] += 1
        
        return {
            "success": results["sent"] > 0,
            "message": f"تم إرسال {results['sent']} إشعار",
            "results": results
        }
        
    except Exception as e:
        logging.error(f"Test push error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/push/send-invoice-notification")
async def send_invoice_push_notification(
    user_id: str,
    invoice_id: str,
    amount: float,
    currency: str = "EGP",
    current_user: dict = Depends(get_current_user)
):
    """Send push notification for new invoice (Admin only)"""
    try:
        if current_user.role not in ["admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="غير مصرح")
        
        results = await PushNotificationService.send_invoice_notification(
            db=db,
            user_id=user_id,
            invoice_id=invoice_id,
            amount=amount,
            currency=currency
        )
        
        return {"success": True, "results": results}
        
    except Exception as e:
        logging.error(f"Invoice notification error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/push/send-payment-reminder")
async def send_payment_reminder_notification(
    user_id: str,
    invoice_id: str,
    amount: float,
    days_overdue: int = 0,
    currency: str = "EGP",
    current_user: dict = Depends(get_current_user)
):
    """Send payment reminder notification (Admin only)"""
    try:
        if current_user.role not in ["admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="غير مصرح")
        
        results = await PushNotificationService.send_payment_reminder(
            db=db,
            user_id=user_id,
            invoice_id=invoice_id,
            amount=amount,
            days_overdue=days_overdue,
            currency=currency
        )
        
        return {"success": True, "results": results}
        
    except Exception as e:
        logging.error(f"Payment reminder error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/push/send-visitor-notification")
async def send_visitor_push_notification(
    resident_id: str,
    visitor_name: str,
    unit_number: str,
    purpose: str = "",
    current_user: dict = Depends(get_current_user)
):
    """Send visitor arrival notification"""
    try:
        results = await PushNotificationService.send_visitor_notification(
            db=db,
            resident_id=resident_id,
            visitor_name=visitor_name,
            unit_number=unit_number,
            purpose=purpose
        )
        
        return {"success": True, "results": results}
        
    except Exception as e:
        logging.error(f"Visitor notification error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/push/broadcast")
async def broadcast_push_notification(
    title: str,
    body: str,
    url: str = "/",
    target_user_ids: Optional[List[str]] = None,
    current_user: dict = Depends(get_current_user)
):
    """Broadcast notification to multiple users (Admin only)"""
    try:
        if current_user.role not in ["admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="غير مصرح")
        
        results = await PushNotificationService.send_broadcast_notification(
            db=db,
            title=title,
            body=body,
            url=url,
            target_user_ids=target_user_ids,
            compound_id=current_user.compound_id
        )
        
        return {"success": True, "results": results}
        
    except Exception as e:
        logging.error(f"Broadcast notification error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== END PUSH NOTIFICATIONS ====================

# ==================== PAYMENT REMINDERS ====================

@router.get("/reminders/settings/{compound_id}")
async def get_reminder_settings(compound_id: str, current_user: dict = Depends(get_current_user)):
    """Get reminder settings for a compound"""
    reminder_service = PaymentReminderService(db)
    return await reminder_service.get_reminder_settings(compound_id)

@router.put("/reminders/settings/{compound_id}")
async def update_reminder_settings(
    compound_id: str, 
    settings: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update reminder settings for a compound (Admin only)"""
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    reminder_service = PaymentReminderService(db)
    return await reminder_service.update_reminder_settings(compound_id, settings)

@router.post("/reminders/send/{bill_id}")
async def send_manual_reminder(
    bill_id: str,
    custom_message: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Send a manual reminder for a specific bill (Admin only)"""
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    reminder_service = PaymentReminderService(db)
    try:
        db = get_db()
        result = await reminder_service.send_custom_reminder(bill_id, custom_message)
        return {"status": "success", **result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reminders/run-check")
async def run_reminder_check(current_user: dict = Depends(get_current_user)):
    """Manually trigger reminder check (Admin only)"""
    db = get_db()
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    reminder_service = PaymentReminderService(db)
    results = await reminder_service.check_and_send_reminders()
    return {"status": "success", "reminders_sent": results}

@router.get("/reminders/logs")
async def get_reminder_logs(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get reminder logs (Admin only)"""
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    cursor = db.reminder_logs.find().sort("sent_at", -1).limit(limit)
    logs = []
    async for log in cursor:
        log["_id"] = str(log["_id"])
        logs.append(log)
    
    return {"logs": logs}

# ==================== END PAYMENT REMINDERS ====================

# ==================== PDF REPORTS ====================




# ==================== EXTRACTED ROUTE MODULES ====================
# These routes have been extracted into /app/backend/routes/ for maintainability

# ==================== END EXTRACTED ROUTES ====================

# Include the API router after ALL endpoints are defined
