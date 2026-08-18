"""
Complaints & Suggestions routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import uuid
import logging

from database import get_db
from auth_deps import get_current_user, require_admin
from helpers import serialize_datetime, notify_compound_admins

router = APIRouter(prefix="/api")


class ComplaintCreate(BaseModel):
    type: str = "complaint"   # complaint | suggestion | inquiry | praise
    category: str = "general"
    title: str
    description: str
    priority: str = "normal"
    unit_number: str = ""
    is_anonymous: bool = False


@router.post("/complaints")
async def create_complaint(data: ComplaintCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        # When the resident chooses to submit anonymously, blank out
        # personally-identifying fields. The user_id is kept on the document
        # so the resident can still see their own submission in "My
        # complaints" — but it is never exposed to admins.
        anon = bool(data.is_anonymous)
        complaint = {
            "id": str(uuid.uuid4()),
            "compound_id": current_user["compound_id"],
            "user_id": current_user["id"],
            "user_name": "" if anon else current_user.get("full_name", ""),
            "unit_number": "" if anon else (data.unit_number or current_user.get("unit_number", "")),
            "is_anonymous": anon,
            "type": data.type,
            "category": data.category,
            "title": data.title,
            "description": data.description,
            "priority": data.priority,
            "status": "open",
            "admin_response": "",
            "resolved_at": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.complaints.insert_one(complaint)

        type_label = {
            "complaint": "شكوى",
            "suggestion": "اقتراح",
            "inquiry": "استفسار",
            "praise": "إطراء",
        }.get(data.type, data.type)
        notify_from = "مجهول" if anon else current_user.get("full_name", "")
        # Fan out via the preference-aware dispatcher: respects per-admin
        # complaint-channel toggles (push/email/sms). In-app history is kept
        # regardless.
        from notification_dispatch import dispatch_notification
        admins = await db.users.find(
            {"compound_id": current_user["compound_id"], "role": {"$in": ["admin", "compound_admin", "company_admin"]}},
            {"id": 1, "_id": 0},
        ).to_list(50)
        admin_ids = [a["id"] for a in admins if a.get("id")]
        email_html_admin = (
            f"<div dir='rtl' style='font-family:Cairo,Tahoma,sans-serif;padding:12px'>"
            f"<h3>{type_label} جديدة في المجمع</h3>"
            f"<p><b>العنوان:</b> {data.title}</p>"
            f"<p><b>الوصف:</b> {data.description}</p>"
            f"<p style='color:#666;font-size:12px'>المُرسل: {notify_from}</p>"
            f"</div>"
        )
        await dispatch_notification(
            db,
            admin_ids,
            event_type="complaint",
            title=f"{type_label} جديدة",
            body=f"{type_label} من {notify_from}: {data.title}",
            in_app_payload={"compound_id": current_user["compound_id"], "type": f"new_{data.type}", "complaint_id": complaint["id"]},
            email_html=email_html_admin,
            email_subject=f"[{type_label}] {data.title}",
            sms_text=f"{type_label} جديدة: {data.title}",
        )

        return {"message": "تم إرسال الشكوى/الاقتراح بنجاح", "complaint_id": complaint["id"]}
    except Exception as e:
        logging.error(f"Error creating complaint: {e}")
        raise HTTPException(status_code=500, detail="Failed to create complaint")


@router.get("/complaints")
async def get_complaints(
    type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    try:
        # Use active compound from header if set (for admin switching between compounds)
        from fastapi import Request
        compound_id = current_user.get("compound_id") or current_user.get("active_compound_id")
        query = {"compound_id": compound_id} if compound_id else {}
        if current_user.get("role") not in ["admin", "super_admin"]:
            query["user_id"] = current_user["id"]
        if type:
            query["type"] = type
        if status:
            query["status"] = status

        complaints = await db.complaints.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)

        # Scrub PII for anonymous complaints when the requester is staff.
        # The complaint's own author may still see their submission identifiers.
        is_staff = current_user.get("role") in ["admin", "super_admin"]
        if is_staff:
            requester_id = current_user["id"]
            for c in complaints:
                if c.get("is_anonymous") and c.get("user_id") != requester_id:
                    c["user_name"] = "مجهول"
                    c["unit_number"] = ""
                    c["user_id"] = ""  # mask to prevent client-side correlation

        total = len(complaints)
        open_count = len([c for c in complaints if c.get("status") == "open"])
        in_progress = len([c for c in complaints if c.get("status") == "in_progress"])
        resolved = len([c for c in complaints if c.get("status") == "resolved"])

        return {
            "complaints": serialize_datetime(complaints),
            "summary": {"total": total, "open": open_count, "in_progress": in_progress, "resolved": resolved}
        }
    except Exception as e:
        logging.error(f"Error fetching complaints: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch complaints")


@router.put("/complaints/{complaint_id}/respond")
async def respond_to_complaint(
    complaint_id: str,
    response: str = "",
    status: str = "in_progress",
    current_user: dict = Depends(require_admin)
):
    db = get_db()
    try:
        update = {"status": status, "admin_response": response, "updated_at": datetime.now(timezone.utc)}
        if status == "resolved":
            update["resolved_at"] = datetime.now(timezone.utc)

        result = await db.complaints.update_one(
            {"id": complaint_id, "compound_id": current_user["compound_id"]},
            {"$set": update}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Complaint not found")

        complaint = await db.complaints.find_one({"id": complaint_id}, {"_id": 0})
        if complaint:
            status_label = {"in_progress": "قيد المراجعة", "resolved": "تم الحل", "closed": "مغلقة"}.get(status, status)
            notification = {
                "id": str(uuid.uuid4()),
                "compound_id": current_user["compound_id"],
                "sender_id": "system",
                "title": f"تحديث على شكواك: {status_label}",
                "content": response or f"تم تحديث حالة شكواك '{complaint.get('title', '')}' إلى {status_label}",
                "type": "complaint_update",
                "recipient_ids": [complaint["user_id"]],
                "is_read": False,
                "created_at": datetime.now(timezone.utc)
            }
            await db.notifications.insert_one(notification)

        return {"message": "تم تحديث الشكوى بنجاح"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error responding to complaint: {e}")
        raise HTTPException(status_code=500, detail="Failed to update complaint")
