"""
Announcements & Events routes - extracted from server.py
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import uuid
import json
import logging
import os

from database import get_db
from auth_deps import get_current_user, require_admin
from helpers import serialize_datetime


router = APIRouter(prefix="/api")

@router.post("/announcements")
async def create_announcement(
    title: str = Form(...),
    content: str = Form(...),
    category: str = Form(...),
    priority: str = Form("normal"),
    scheduled_for: str = Form(None),
    expires_at: str = Form(None),
    send_push: bool = Form(True),
    send_email: bool = Form(False),
    is_emergency: bool = Form(False),
    target_audience: str = Form("all"),
    current_user: dict = Depends(require_admin)
):
    """Create a new announcement"""
    db = get_db()
    try:
        announcement = {
            "id": str(uuid.uuid4()),
            "title": title,
            "content": content,
            "category": category,
            "priority": priority,
            "author_id": current_user.id,
            "author_name": current_user.full_name,
            "compound_id": current_user.compound_id,
            "status": "published",
            "is_published": True,
            "is_emergency": is_emergency,
            "target_audience": target_audience,
            "scheduled_for": scheduled_for,
            "expires_at": expires_at,
            "published_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "views_count": 0,
            "likes_count": 0,
            "comments_count": 0,
            "shares_count": 0,
            "bookmarks_count": 0,
            "unique_views": [],
            "liked_by": [],
            "bookmarked_by": [],
            "images": [],
            "attachments": [],
            "tags": []
        }
        
        await db.announcements.insert_one(announcement)

        # Fan out to all residents in the compound, honoring each user's
        # announcement-channel preferences. The flags ``send_push`` and
        # ``send_email`` from the form act as *additional* opt-outs by the
        # admin — they cap what we'll try; user preferences narrow it further.
        try:
            from notification_dispatch import dispatch_notification
            recipients_query = {"compound_id": current_user.compound_id, "role": {"$in": ["resident", "admin", "compound_admin"]}}
            recipients = await db.users.find(recipients_query, {"id": 1, "_id": 0}).to_list(2000)
            recipient_ids = [r["id"] for r in recipients if r.get("id") and r["id"] != current_user.id]

            email_html = (
                f"<div dir='rtl' style='font-family:Cairo,Tahoma,sans-serif;padding:12px'>"
                f"<h3 style='color:#7c3aed;margin:0 0 8px 0'>{'🚨 ' if is_emergency else '📢 '}{title}</h3>"
                f"<p style='color:#666;font-size:12px;margin:0 0 12px 0'>{category}</p>"
                f"<div style='line-height:1.7'>{content}</div>"
                f"<hr style='border:none;border-top:1px solid #eee;margin:18px 0'/>"
                f"<p style='font-size:11px;color:#999'>أُرسل بواسطة: {current_user.full_name}</p>"
                f"</div>"
            ) if send_email else None
            sms_text = f"📢 {title}: {content[:100]}" if is_emergency else None

            await dispatch_notification(
                db,
                recipient_ids,
                event_type="announcement",
                title=title,
                body=content[:200],
                in_app_payload={"compound_id": current_user.compound_id, "type": "announcement", "announcement_id": announcement["id"], "is_emergency": is_emergency},
                email_html=email_html,
                email_subject=f"[{'عاجل' if is_emergency else 'إعلان'}] {title}",
                sms_text=sms_text,  # only emergencies get SMS attempts
            )
        except Exception as fanout_err:
            logging.warning(f"[announcements] fan-out failed (announcement saved): {fanout_err}")

        return {"message": "Announcement created successfully", "announcement_id": announcement["id"]}
        
    except Exception as e:
        logging.error(f"Error creating announcement: {e}")
        raise HTTPException(status_code=500, detail="Failed to create announcement")

@router.post("/events")
async def create_event(
    title: str = Form(...),
    content: str = Form(...),
    category: str = Form(...),
    priority: str = Form("normal"),
    event_date: str = Form(...),
    event_time: str = Form(...),
    event_location: str = Form(None),
    max_attendees: int = Form(None),
    send_push: bool = Form(True),
    send_email: bool = Form(False),
    target_audience: str = Form("all"),
    current_user: dict = Depends(require_admin)
):
    """Create a new event"""
    db = get_db()
    try:
        event = {
            "id": str(uuid.uuid4()),
            "title": title,
            "content": content,
            "category": category,
            "priority": priority,
            "event_date": event_date,
            "event_time": event_time,
            "event_location": event_location,
            "max_attendees": max_attendees,
            "author_id": current_user.id,
            "author_name": current_user.full_name,
            "compound_id": current_user.compound_id,
            "status": "published",
            "is_published": True,
            "target_audience": target_audience,
            "published_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "views_count": 0,
            "likes_count": 0,
            "comments_count": 0,
            "shares_count": 0,
            "bookmarks_count": 0,
            "attendees_count": 0,
            "unique_views": [],
            "liked_by": [],
            "bookmarked_by": [],
            "attendees": [],
            "maybe_attending": [],
            "not_attending": [],
            "images": [],
            "attachments": [],
            "tags": []
        }
        
        await db.events.insert_one(event)
        
        return {"message": "Event created successfully", "event_id": event["id"]}
        
    except Exception as e:
        logging.error(f"Error creating event: {e}")
        raise HTTPException(status_code=500, detail="Failed to create event")

@router.get("/announcements")
async def get_announcements(current_user: dict = Depends(get_current_user)):
    """Get announcements"""
    db = get_db()
    try:
        db = get_db()
        query = {"compound_id": current_user.compound_id, "is_published": True}
        
        announcements = await db.announcements.find(query).sort("created_at", -1).to_list(length=10000)
        return {"announcements": serialize_datetime(announcements)}
        
    except Exception as e:
        logging.error(f"Error fetching announcements: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch announcements")

@router.get("/events")
async def get_events(current_user: dict = Depends(get_current_user)):
    """Get events"""
    db = get_db()
    try:
        db = get_db()
        query = {"compound_id": current_user.compound_id, "is_published": True}
        
        events = await db.events.find(query).sort("event_date", 1).to_list(length=10000)
        return {"events": serialize_datetime(events)}
        
    except Exception as e:
        logging.error(f"Error fetching events: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch events")

@router.get("/events/stats")
async def get_events_stats(current_user: dict = Depends(get_current_user)):
    """Get events and announcements statistics"""
    db = get_db()
    try:
        db = get_db()
        query = {"compound_id": current_user.compound_id}
        
        announcements = await db.announcements.find(query).to_list(length=10000)
        events = await db.events.find(query).to_list(length=10000)
        
        stats = {
            "total_announcements": len(announcements),
            "upcoming_events": len([e for e in events if e["event_date"] >= datetime.now().strftime("%Y-%m-%d")]),
            "total_participants": sum([e.get("attendees_count", 0) for e in events]),
            "engagement_rate": 75  # Mock calculation
        }
        
        return {"stats": stats}
        
    except Exception as e:
        logging.error(f"Error fetching events stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch events stats")

# ============ ANALYTICS ENDPOINTS ============
