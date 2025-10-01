from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict
import asyncio
import json
from datetime import datetime
import uuid

from auth import get_current_user
from db import get_database
from websocket_manager import manager

router = APIRouter(prefix="/api/push-notifications", tags=["push-notifications"])

class PushNotificationRequest(BaseModel):
    title: str
    message: str
    recipients: List[str]  # List of user IDs
    type: str = "general"  # general, maintenance, guest, event, payment
    priority: str = "medium"  # low, medium, high, urgent
    action_url: Optional[str] = None
    image_url: Optional[str] = None
    metadata: Optional[Dict] = {}

class PushNotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    type: str
    priority: str
    created_at: datetime
    sent_count: int
    delivered_count: int
    read_count: int
    status: str

class NotificationSubscription(BaseModel):
    user_id: str
    endpoint: str
    p256dh_key: str
    auth_key: str
    device_type: str  # web, android, ios
    device_name: Optional[str] = None
    is_active: bool = True

# In-memory storage for WebSocket connections
# In production, use Redis or similar
active_connections: Dict[str, List] = {}

async def send_realtime_notification(user_ids: List[str], notification_data: Dict):
    """Send real-time notifications via WebSocket"""
    for user_id in user_ids:
        if user_id in active_connections:
            for connection in active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps({
                        "type": "notification",
                        "data": notification_data
                    }))
                except:
                    # Remove broken connections
                    active_connections[user_id].remove(connection)

async def create_notification_record(db, notification_request: PushNotificationRequest, sender_id: str):
    """Create notification record in database"""
    notification_id = str(uuid.uuid4())
    
    notification = {
        "id": notification_id,
        "title": notification_request.title,
        "message": notification_request.message,
        "type": notification_request.type,
        "priority": notification_request.priority,
        "sender_id": sender_id,
        "recipients": notification_request.recipients,
        "action_url": notification_request.action_url,
        "image_url": notification_request.image_url,
        "metadata": notification_request.metadata,
        "created_at": datetime.utcnow(),
        "sent_count": 0,
        "delivered_count": 0,
        "read_count": 0,
        "status": "sending"
    }
    
    await db.push_notifications.insert_one(notification)
    
    # Create individual notification records for each recipient
    for recipient_id in notification_request.recipients:
        recipient_notification = {
            "id": str(uuid.uuid4()),
            "notification_id": notification_id,
            "user_id": recipient_id,
            "title": notification_request.title,
            "message": notification_request.message,
            "type": notification_request.type,
            "priority": notification_request.priority,
            "action_url": notification_request.action_url,
            "image_url": notification_request.image_url,
            "metadata": notification_request.metadata,
            "is_read": False,
            "is_delivered": False,
            "created_at": datetime.utcnow(),
            "read_at": None,
            "delivered_at": None
        }
        await db.user_notifications.insert_one(recipient_notification)
    
    return notification_id

@router.post("/send")
async def send_push_notification(
    notification_request: PushNotificationRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """Send push notification to specified users"""
    try:
        # Check if user has permission to send notifications
        if current_user.get("role") not in ["admin", "security"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions to send notifications")
        
        db = await get_database()
        
        # Validate recipients exist
        recipients_cursor = db.users.find(
            {"id": {"$in": notification_request.recipients}},
            {"id": 1, "full_name": 1, "email": 1}
        )
        valid_recipients = await recipients_cursor.to_list(length=None)
        valid_recipient_ids = [r["id"] for r in valid_recipients]
        
        if not valid_recipient_ids:
            raise HTTPException(status_code=400, detail="No valid recipients found")
        
        # Update request with valid recipients only
        notification_request.recipients = valid_recipient_ids
        
        # Create notification record
        notification_id = await create_notification_record(db, notification_request, current_user.get("id"))
        
        # Prepare notification data for real-time delivery
        notification_data = {
            "id": notification_id,
            "title": notification_request.title,
            "message": notification_request.message,
            "type": notification_request.type,
            "priority": notification_request.priority,
            "action_url": notification_request.action_url,
            "image_url": notification_request.image_url,
            "metadata": notification_request.metadata,
            "created_at": datetime.utcnow().isoformat(),
            "sender": {
                "id": current_user.get("id"),
                "name": current_user.get("full_name", "System")
            }
        }
        
        # Send real-time notifications
        background_tasks.add_task(send_realtime_notification, valid_recipient_ids, notification_data)
        
        # Update sent count
        await db.push_notifications.update_one(
            {"id": notification_id},
            {
                "$set": {
                    "sent_count": len(valid_recipient_ids),
                    "status": "sent"
                }
            }
        )
        
        return {
            "notification_id": notification_id,
            "recipients_count": len(valid_recipient_ids),
            "status": "sent",
            "message": "Notification sent successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")

@router.post("/broadcast")
async def broadcast_notification(
    notification_request: PushNotificationRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """Broadcast notification to all users or specific groups"""
    try:
        # Only admins can broadcast
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Only admins can broadcast notifications")
        
        db = await get_database()
        
        # Get all users if no specific recipients
        if not notification_request.recipients:
            users_cursor = db.users.find({}, {"id": 1})
            all_users = await users_cursor.to_list(length=None)
            notification_request.recipients = [user["id"] for user in all_users]
        
        # Use the regular send function
        return await send_push_notification(notification_request, background_tasks, current_user)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to broadcast notification: {str(e)}")

@router.get("/user-notifications")
async def get_user_notifications(
    limit: int = 50,
    skip: int = 0,
    unread_only: bool = False,
    current_user = Depends(get_current_user)
):
    """Get notifications for current user"""
    try:
        db = await get_database()
        user_id = current_user.get("id")
        
        # Build query filter
        query_filter = {"user_id": user_id}
        if unread_only:
            query_filter["is_read"] = False
        
        # Get notifications
        notifications_cursor = db.user_notifications.find(
            query_filter,
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        notifications = await notifications_cursor.to_list(length=None)
        
        # Get total count
        total_count = await db.user_notifications.count_documents(query_filter)
        
        # Get unread count
        unread_count = await db.user_notifications.count_documents({
            "user_id": user_id,
            "is_read": False
        })
        
        return {
            "notifications": notifications,
            "total": total_count,
            "unread_count": unread_count,
            "has_more": (skip + len(notifications)) < total_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get notifications: {str(e)}")

@router.post("/mark-read/{notification_id}")
async def mark_notification_read(
    notification_id: str,
    current_user = Depends(get_current_user)
):
    """Mark notification as read"""
    try:
        db = await get_database()
        user_id = current_user.get("id")
        
        result = await db.user_notifications.update_one(
            {
                "id": notification_id,
                "user_id": user_id,
                "is_read": False
            },
            {
                "$set": {
                    "is_read": True,
                    "read_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found or already read")
        
        # Update read count in main notification
        await db.push_notifications.update_one(
            {"id": notification_id},
            {"$inc": {"read_count": 1}}
        )
        
        return {"status": "success", "message": "Notification marked as read"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark notification as read: {str(e)}")

@router.post("/mark-all-read")
async def mark_all_notifications_read(current_user = Depends(get_current_user)):
    """Mark all notifications as read for current user"""
    try:
        db = await get_database()
        user_id = current_user.get("id")
        
        result = await db.user_notifications.update_many(
            {
                "user_id": user_id,
                "is_read": False
            },
            {
                "$set": {
                    "is_read": True,
                    "read_at": datetime.utcnow()
                }
            }
        )
        
        return {
            "status": "success",
            "message": f"Marked {result.modified_count} notifications as read"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark all notifications as read: {str(e)}")

@router.delete("/notification/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user = Depends(get_current_user)
):
    """Delete a notification for current user"""
    try:
        db = await get_database()
        user_id = current_user.get("id")
        
        result = await db.user_notifications.delete_one({
            "id": notification_id,
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"status": "success", "message": "Notification deleted"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete notification: {str(e)}")

@router.get("/admin/notifications")
async def get_all_notifications(
    limit: int = 100,
    skip: int = 0,
    current_user = Depends(get_current_user)
):
    """Get all notifications (Admin only)"""
    try:
        # Check admin permission
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        db = await get_database()
        
        # Get notifications with stats
        notifications_cursor = db.push_notifications.find(
            {},
            {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit)
        
        notifications = await notifications_cursor.to_list(length=None)
        
        # Get total count
        total_count = await db.push_notifications.count_documents({})
        
        return {
            "notifications": notifications,
            "total": total_count,
            "has_more": (skip + len(notifications)) < total_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get notifications: {str(e)}")

@router.post("/subscribe")
async def subscribe_to_notifications(
    subscription: NotificationSubscription,
    current_user = Depends(get_current_user)
):
    """Subscribe user to push notifications"""
    try:
        db = await get_database()
        
        # Update or create subscription
        subscription_data = subscription.dict()
        subscription_data["user_id"] = current_user.get("id")
        subscription_data["created_at"] = datetime.utcnow()
        subscription_data["updated_at"] = datetime.utcnow()
        
        await db.notification_subscriptions.update_one(
            {
                "user_id": current_user.get("id"),
                "endpoint": subscription.endpoint
            },
            {"$set": subscription_data},
            upsert=True
        )
        
        return {"status": "success", "message": "Subscribed to notifications"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to subscribe: {str(e)}")

@router.delete("/unsubscribe")
async def unsubscribe_from_notifications(
    endpoint: str,
    current_user = Depends(get_current_user)
):
    """Unsubscribe from push notifications"""
    try:
        db = await get_database()
        
        result = await db.notification_subscriptions.delete_one({
            "user_id": current_user.get("id"),
            "endpoint": endpoint
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        return {"status": "success", "message": "Unsubscribed from notifications"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unsubscribe: {str(e)}")

# Quick notification templates for common scenarios
@router.post("/quick/maintenance-completed")
async def notify_maintenance_completed(
    maintenance_id: str,
    current_user = Depends(get_current_user)
):
    """Quick notification for completed maintenance"""
    try:
        db = await get_database()
        
        # Get maintenance request details
        maintenance = await db.maintenance_requests.find_one({"id": maintenance_id})
        if not maintenance:
            raise HTTPException(status_code=404, detail="Maintenance request not found")
        
        # Send notification to requester
        notification_request = PushNotificationRequest(
            title="Maintenance Request Completed",
            message=f"Your maintenance request '{maintenance.get('title', 'Request')}' has been completed.",
            recipients=[maintenance["user_id"]],
            type="maintenance",
            priority="medium",
            action_url=f"/maintenance/{maintenance_id}"
        )
        
        background_tasks = BackgroundTasks()
        return await send_push_notification(notification_request, background_tasks, current_user)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send maintenance notification: {str(e)}")

@router.post("/quick/guest-arrived")
async def notify_guest_arrived(
    guest_id: str,
    current_user = Depends(get_current_user)
):
    """Quick notification for guest arrival"""
    try:
        db = await get_database()
        
        # Get guest details
        guest = await db.guests.find_one({"id": guest_id})
        if not guest:
            raise HTTPException(status_code=404, detail="Guest not found")
        
        # Send notification to host
        notification_request = PushNotificationRequest(
            title="Guest Arrival",
            message=f"{guest.get('name', 'Your guest')} has arrived and is waiting at the gate.",
            recipients=[guest["host_user_id"]],
            type="guest",
            priority="high",
            action_url=f"/guests/{guest_id}"
        )
        
        background_tasks = BackgroundTasks()
        return await send_push_notification(notification_request, background_tasks, current_user)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send guest notification: {str(e)}")

@router.post("/quick/payment-received")
async def notify_payment_received(
    transaction_id: str,
    current_user = Depends(get_current_user)
):
    """Quick notification for payment confirmation"""
    try:
        db = await get_database()
        
        # Get transaction details
        transaction = await db.payment_transactions.find_one({"id": transaction_id})
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Send notification to payer
        notification_request = PushNotificationRequest(
            title="Payment Confirmation",
            message=f"Your payment of {transaction['amount']} {transaction['currency']} has been received successfully.",
            recipients=[transaction["user_id"]],
            type="payment",
            priority="medium",
            action_url=f"/payments/transaction/{transaction_id}"
        )
        
        background_tasks = BackgroundTasks()
        return await send_push_notification(notification_request, background_tasks, current_user)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send payment notification: {str(e)}")