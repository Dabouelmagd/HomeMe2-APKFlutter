"""
Security Endpoints routes - extracted from server.py
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
from shared_models import *


router = APIRouter(prefix="/api")

@router.post("/security/visitor-check")
async def security_visitor_check(
    guest_id: str = None,
    visitor_name: str = None,
    action: str = "check_in",
    security_notes: str = "",
    id_verified: bool = False,
    temperature_check: str = "",
    photo_taken: bool = False,
    checked_by: str = "",
    compound_id: str = "",
    current_user: dict = Depends(get_current_user)
):
    """تسجيل دخول/خروج الزائر بواسطة الأمن"""
    try:
        db = get_db()
        from datetime import datetime, timezone
        import uuid
        
        # إنشاء سجل أمني
        security_log = {
            "id": str(uuid.uuid4()),
            "guest_id": guest_id,
            "visitor_name": visitor_name,
            "action": action,  # check_in or check_out
            "security_notes": security_notes,
            "id_verified": id_verified,
            "temperature_check": temperature_check,
            "photo_taken": photo_taken,
            "checked_by": checked_by,
            "compound_id": compound_id or current_user.compound_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.security_logs.insert_one(security_log)
        
        # تحديث حالة الزائر
        if guest_id:
            new_status = "checked_in" if action == "check_in" else "checked_out"
            await db.guests.update_one(
                {"id": guest_id},
                {"$set": {"status": new_status}}
            )
        
        return {
            "success": True,
            "message": "Security check completed successfully",
            "log": serialize_datetime(security_log)
        }
        
    except Exception as e:
        logging.error(f"Error in security visitor check: {e}")
        raise HTTPException(status_code=500, detail="Security check failed")

@router.get("/security/visitor-logs")
async def get_security_visitor_logs(current_user: dict = Depends(get_current_user)):
    """جلب سجلات الأمن للزوار"""
    try:
        db = get_db()
        query = {}
        if current_user.compound_id and current_user.compound_id != "super_admin":
            query["compound_id"] = current_user.compound_id
        
        logs = await db.security_logs.find(query).sort("created_at", -1).limit(100).to_list(None)
        
        return {
            "success": True,
            "logs": [serialize_datetime(log) for log in logs]
        }
        
    except Exception as e:
        logging.error(f"Error fetching security logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch security logs")

@router.get("/security/messages")
async def get_security_messages(current_user: dict = Depends(get_current_user)):
    """جلب الرسائل من السكان لموظف الأمن"""
    try:
        db = get_db()
        query = {
            "recipient_type": "security",
            "compound_id": current_user.compound_id
        }
        
        messages = await db.messages.find(query).sort("created_at", -1).limit(50).to_list(None)
        
        return {
            "success": True,
            "messages": [serialize_datetime(msg) for msg in messages]
        }
        
    except Exception as e:
        logging.error(f"Error fetching security messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch messages")

@router.patch("/security/messages/{message_id}/read")
async def mark_security_message_read(message_id: str, current_user: dict = Depends(get_current_user)):
    """تحديد رسالة كمقروءة"""
    try:
        db = get_db()
        await db.messages.update_one(
            {"_id": message_id},
            {"$set": {"read": True}}
        )
        
        return {"success": True, "message": "Message marked as read"}
        
    except Exception as e:
        logging.error(f"Error marking message as read: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark message as read")

@router.get("/users/{user_id}/subscription", )
async def get_user_subscription(user_id: str, current_user: dict = Depends(get_current_user)):
    """الحصول على اشتراك المستخدم"""
    try:
        db = get_db()
        # التحقق من الصلاحيات
        if current_user.id != user_id and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="غير مسموح")
        
        # البحث عن الاشتراك النشط
        subscription = await db.user_subscriptions.find_one({
            "user_id": user_id,
            "is_active": True
        }, sort=[("created_at", -1)])
        
        if not subscription:
            return SubscriptionCodeResponse(
                success=False,
                message="لا يوجد اشتراك نشط"
            )
        
        return SubscriptionCodeResponse(
            success=True,
            message="تم العثور على الاشتراك",
            subscription=UserSubscription(**subscription)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting user subscription: {e}")
        return SubscriptionCodeResponse(
            success=False,
            message="خطأ في الحصول على الاشتراك"
        )

