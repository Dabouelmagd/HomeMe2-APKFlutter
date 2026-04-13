"""
Notification routes (user-facing)
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import logging

from database import get_db
from auth_deps import get_current_user
from helpers import serialize_datetime

router = APIRouter(prefix="/api")


@router.get("/notifications")
async def get_notifications(limit: int = 50, offset: int = 0, unread_only: bool = False, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        query = {"$or": [{"recipient_id": current_user["id"]}, {"recipient_id": None, "compound_id": current_user["compound_id"]}]}
        if unread_only:
            query["is_read"] = False
        notifications = await db.notifications.find(query).sort("created_at", -1).skip(offset).limit(limit).to_list(None)
        return {"notifications": serialize_datetime(notifications)}
    except Exception as e:
        logging.error(f"Error fetching notifications: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch notifications")


@router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        result = await db.notifications.update_one(
            {"id": notification_id, "$or": [{"recipient_id": current_user["id"]}, {"recipient_id": None, "compound_id": current_user["compound_id"]}]},
            {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"message": "Notification marked as read"}
    except Exception as e:
        logging.error(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark notification as read")


@router.patch("/notifications/mark-all-read")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        result = await db.notifications.update_many(
            {"$or": [{"recipient_id": current_user["id"]}, {"recipient_id": None, "compound_id": current_user["compound_id"]}], "is_read": False},
            {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc)}}
        )
        return {"message": f"Marked {result.modified_count} notifications as read"}
    except Exception as e:
        logging.error(f"Error marking all notifications as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark all notifications as read")


@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        result = await db.notifications.delete_one({
            "id": notification_id, "$or": [{"recipient_id": current_user["id"]}, {"recipient_id": None, "compound_id": current_user["compound_id"]}]
        })
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"message": "Notification deleted successfully"}
    except Exception as e:
        logging.error(f"Error deleting notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete notification")
