"""
Push Notification Service for HomeMe
Handles web push notifications for invoices, payment reminders, and visitor arrivals
"""
import os
import json
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pywebpush import webpush, WebPushException

logger = logging.getLogger(__name__)

# Load VAPID keys from environment
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_SUBJECT = os.getenv("VAPID_SUBJECT", "mailto:info@datalifeai.com")


class PushNotificationService:
    """Service for sending web push notifications"""
    
    @staticmethod
    def send_notification(
        subscription: Dict[str, Any],
        title: str,
        body: str,
        url: str = "/",
        tag: str = "notification",
        require_interaction: bool = False,
        data: Optional[Dict] = None
    ) -> bool:
        """
        Send a push notification to a single subscription
        
        Args:
            subscription: Push subscription object with endpoint, keys (p256dh, auth)
            title: Notification title
            body: Notification body text
            url: URL to open when notification is clicked
            tag: Notification tag for grouping
            require_interaction: Whether notification requires user interaction to dismiss
            data: Additional data to send with notification
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
            logger.error("VAPID keys not configured")
            return False
            
        try:
            payload = {
                "title": title,
                "body": body,
                "url": url,
                "tag": tag,
                "requireInteraction": require_interaction,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": data or {}
            }
            
            subscription_info = {
                "endpoint": subscription.get("endpoint"),
                "keys": {
                    "p256dh": subscription.get("keys", {}).get("p256dh") or subscription.get("p256dh"),
                    "auth": subscription.get("keys", {}).get("auth") or subscription.get("auth")
                }
            }
            
            webpush(
                subscription_info=subscription_info,
                data=json.dumps(payload),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_SUBJECT}
            )
            
            logger.info(f"Push notification sent successfully: {title}")
            return True
            
        except WebPushException as e:
            status_code = getattr(e.response, 'status_code', None) if e.response else None
            
            if status_code == 410:
                logger.warning(f"Subscription expired: {subscription.get('endpoint', 'unknown')}")
            elif status_code == 401:
                logger.error("VAPID authentication failed - check keys")
            else:
                logger.error(f"Push notification failed: {str(e)}")
            
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending push notification: {str(e)}")
            return False
    
    @staticmethod
    async def send_invoice_notification(
        db,
        user_id: str,
        invoice_id: str,
        amount: float,
        currency: str = "EGP"
    ) -> Dict[str, int]:
        """Send notification for new invoice"""
        subscriptions = await db.push_subscriptions.find({
            "user_id": user_id,
            "is_active": True
        }).to_list(length=100)
        
        results = {"total": len(subscriptions), "sent": 0, "failed": 0}
        
        for sub in subscriptions:
            success = PushNotificationService.send_notification(
                subscription=sub,
                title="فاتورة جديدة 📄",
                body=f"لديك فاتورة جديدة بقيمة {amount} {currency}",
                url=f"/app/financial",
                tag="invoice",
                require_interaction=True,
                data={"invoice_id": invoice_id, "type": "new_invoice"}
            )
            if success:
                results["sent"] += 1
            else:
                results["failed"] += 1
        
        return results
    
    @staticmethod
    async def send_payment_reminder(
        db,
        user_id: str,
        invoice_id: str,
        amount: float,
        days_overdue: int = 0,
        currency: str = "EGP"
    ) -> Dict[str, int]:
        """Send payment reminder notification"""
        subscriptions = await db.push_subscriptions.find({
            "user_id": user_id,
            "is_active": True
        }).to_list(length=100)
        
        results = {"total": len(subscriptions), "sent": 0, "failed": 0}
        
        if days_overdue == 0:
            title = "تذكير بالدفع ⏰"
            body = f"فاتورتك بقيمة {amount} {currency} مستحقة اليوم"
        else:
            title = "دفعة متأخرة ⚠️"
            body = f"فاتورتك بقيمة {amount} {currency} متأخرة {days_overdue} يوم"
        
        for sub in subscriptions:
            success = PushNotificationService.send_notification(
                subscription=sub,
                title=title,
                body=body,
                url=f"/app/financial",
                tag="payment-reminder",
                require_interaction=True,
                data={"invoice_id": invoice_id, "type": "payment_reminder", "days_overdue": days_overdue}
            )
            if success:
                results["sent"] += 1
            else:
                results["failed"] += 1
        
        return results
    
    @staticmethod
    async def send_visitor_notification(
        db,
        resident_id: str,
        visitor_name: str,
        unit_number: str,
        purpose: str = ""
    ) -> Dict[str, int]:
        """Send notification for visitor arrival"""
        subscriptions = await db.push_subscriptions.find({
            "user_id": resident_id,
            "is_active": True
        }).to_list(length=100)
        
        results = {"total": len(subscriptions), "sent": 0, "failed": 0}
        
        body = f"الزائر {visitor_name} وصل"
        if purpose:
            body += f" - {purpose}"
        
        for sub in subscriptions:
            success = PushNotificationService.send_notification(
                subscription=sub,
                title="وصول زائر 🚪",
                body=body,
                url="/app/guests",
                tag="visitor",
                require_interaction=False,
                data={"visitor_name": visitor_name, "unit_number": unit_number, "type": "visitor_arrival"}
            )
            if success:
                results["sent"] += 1
            else:
                results["failed"] += 1
        
        return results
    
    @staticmethod
    async def send_broadcast_notification(
        db,
        title: str,
        body: str,
        url: str = "/",
        target_user_ids: Optional[List[str]] = None,
        compound_id: Optional[str] = None
    ) -> Dict[str, int]:
        """Send notification to multiple users"""
        query = {"is_active": True}
        
        if target_user_ids:
            query["user_id"] = {"$in": target_user_ids}
        
        if compound_id:
            query["compound_id"] = compound_id
        
        subscriptions = await db.push_subscriptions.find(query).to_list(length=1000)
        
        results = {"total": len(subscriptions), "sent": 0, "failed": 0}
        
        for sub in subscriptions:
            success = PushNotificationService.send_notification(
                subscription=sub,
                title=title,
                body=body,
                url=url,
                tag="broadcast",
                require_interaction=False
            )
            if success:
                results["sent"] += 1
            else:
                results["failed"] += 1
        
        return results


def get_vapid_public_key() -> str:
    """Return the VAPID public key for client subscription"""
    return VAPID_PUBLIC_KEY
