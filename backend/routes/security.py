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
        
        logs = await db.security_logs.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(None)
        
        return {
            "success": True,
            "logs": [serialize_datetime(log) for log in logs]
        }
        
    except Exception as e:
        logging.error(f"Error fetching security logs: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch security logs")


@router.get("/security/analytics")
async def get_security_analytics(
    days: int = 7,
    current_user: dict = Depends(get_current_user)
):
    """تحليلات الأمن: اتجاهات الزوار آخر N أيام + ساعات الذروة + نسبة دخول/خروج"""
    try:
        db = get_db()
        days = max(1, min(days, 30))
        now = datetime.now(timezone.utc)
        start = now - timedelta(days=days)

        query = {"created_at": {"$gte": start.isoformat()}}
        if current_user.compound_id and current_user.compound_id != "super_admin":
            query["compound_id"] = current_user.compound_id

        logs = await db.security_logs.find(query, {"_id": 0}).to_list(None)

        # اتجاه يومي
        daily = {}
        hourly = [0] * 24
        check_in_count = 0
        check_out_count = 0
        id_verified_count = 0
        for log in logs:
            ts = log.get("created_at") or log.get("timestamp")
            if not ts:
                continue
            try:
                d = datetime.fromisoformat(ts.replace("Z", "+00:00")) if isinstance(ts, str) else ts
            except Exception:
                continue
            day_key = d.strftime("%Y-%m-%d")
            daily[day_key] = daily.get(day_key, {"check_in": 0, "check_out": 0, "total": 0})
            action = log.get("action", "check_in")
            daily[day_key][action] = daily[day_key].get(action, 0) + 1
            daily[day_key]["total"] += 1
            hourly[d.hour] += 1
            if action == "check_in":
                check_in_count += 1
            elif action == "check_out":
                check_out_count += 1
            if log.get("id_verified"):
                id_verified_count += 1

        # قائمة أيام متسلسلة (حتى لو فارغة)
        trend = []
        for i in range(days - 1, -1, -1):
            d = (now - timedelta(days=i)).strftime("%Y-%m-%d")
            trend.append({
                "date": d,
                "total": daily.get(d, {}).get("total", 0),
                "check_in": daily.get(d, {}).get("check_in", 0),
                "check_out": daily.get(d, {}).get("check_out", 0),
            })

        # ساعات الذروة (أعلى 3)
        peak_hours = sorted(
            [{"hour": h, "count": c} for h, c in enumerate(hourly)],
            key=lambda x: x["count"],
            reverse=True
        )[:3]

        total = len(logs)
        return {
            "success": True,
            "range_days": days,
            "total_visits": total,
            "check_in_count": check_in_count,
            "check_out_count": check_out_count,
            "id_verified_count": id_verified_count,
            "id_verified_ratio": round((id_verified_count / total) * 100, 1) if total else 0,
            "trend": trend,
            "hourly": hourly,
            "peak_hours": peak_hours,
        }
    except Exception as e:
        logging.error(f"Error fetching security analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch security analytics")


# ==================== SECURITY INCIDENTS ====================

class IncidentCreate(BaseModel):
    title: str
    description: str
    severity: str = "low"  # low | medium | high | critical
    location: Optional[str] = ""
    visitor_name: Optional[str] = None
    unit_number: Optional[str] = None


@router.post("/security/incidents")
async def create_security_incident(
    payload: IncidentCreate,
    current_user: dict = Depends(get_current_user)
):
    """إنشاء بلاغ حادث أمني"""
    try:
        db = get_db()
        if payload.severity not in ["low", "medium", "high", "critical"]:
            raise HTTPException(status_code=400, detail="Invalid severity")
        incident = {
            "id": str(uuid.uuid4()),
            "compound_id": current_user.compound_id or "",
            "title": payload.title.strip(),
            "description": payload.description.strip(),
            "severity": payload.severity,
            "location": payload.location or "",
            "visitor_name": payload.visitor_name,
            "unit_number": payload.unit_number,
            "reported_by": current_user.id,
            "reported_by_name": getattr(current_user, "full_name", None) or getattr(current_user, "username", ""),
            "status": "open",  # open | in_progress | resolved
            "resolved_at": None,
            "resolved_by": None,
            "resolution_notes": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.security_incidents.insert_one(incident)
        incident.pop("_id", None)
        return {"success": True, "incident": serialize_datetime(incident)}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating incident: {e}")
        raise HTTPException(status_code=500, detail="Failed to create incident")


@router.get("/security/incidents")
async def list_security_incidents(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """قائمة الحوادث الأمنية"""
    try:
        db = get_db()
        query = {}
        if current_user.compound_id and current_user.compound_id != "super_admin":
            query["compound_id"] = current_user.compound_id
        if status:
            query["status"] = status
        if severity:
            query["severity"] = severity
        incidents = await db.security_incidents.find(query, {"_id": 0}).sort("created_at", -1).limit(200).to_list(None)
        open_count = sum(1 for i in incidents if i.get("status") != "resolved")
        critical_open = sum(1 for i in incidents if i.get("status") != "resolved" and i.get("severity") == "critical")
        return {
            "success": True,
            "incidents": [serialize_datetime(i) for i in incidents],
            "open_count": open_count,
            "critical_open": critical_open,
            "total": len(incidents),
        }
    except Exception as e:
        logging.error(f"Error listing incidents: {e}")
        raise HTTPException(status_code=500, detail="Failed to list incidents")


@router.patch("/security/incidents/{incident_id}")
async def update_security_incident(
    incident_id: str,
    status: Optional[str] = None,
    resolution_notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """تحديث حالة الحادث (in_progress / resolved)"""
    try:
        db = get_db()
        updates = {}
        if status:
            if status not in ["open", "in_progress", "resolved"]:
                raise HTTPException(status_code=400, detail="Invalid status")
            updates["status"] = status
            if status == "resolved":
                updates["resolved_at"] = datetime.now(timezone.utc).isoformat()
                updates["resolved_by"] = current_user.id
        if resolution_notes is not None:
            updates["resolution_notes"] = resolution_notes
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        result = await db.security_incidents.update_one({"id": incident_id}, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Incident not found")
        return {"success": True, "message": "Incident updated"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating incident: {e}")
        raise HTTPException(status_code=500, detail="Failed to update incident")


@router.delete("/security/incidents/{incident_id}")
async def delete_security_incident(
    incident_id: str,
    current_user: dict = Depends(require_admin)
):
    """حذف الحادث (للمدير فقط)"""
    try:
        db = get_db()
        result = await db.security_incidents.delete_one({"id": incident_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Incident not found")
        return {"success": True, "message": "Incident deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting incident: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete incident")

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

