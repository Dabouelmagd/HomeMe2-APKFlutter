"""
Scheduled Messages routes - extracted from server.py
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

@router.post("/chats/{chat_id}/schedule")
async def schedule_message(
    chat_id: str,
    schedule_data: ScheduledMessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Schedule a message to be sent later"""
    # Verify user is participant
    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Validate scheduled time is in the future
    if schedule_data.scheduled_for <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
    
    try:
        db = get_db()
        # Create scheduled message
        scheduled_message = ScheduledMessage(
            chat_id=chat_id,
            sender_id=current_user.id,
            content=schedule_data.content,
            message_type=schedule_data.message_type,
            scheduled_for=schedule_data.scheduled_for,
            timezone=schedule_data.timezone,
            is_recurring=schedule_data.is_recurring,
            recurrence_pattern=schedule_data.recurrence_pattern,
            recurrence_end=schedule_data.recurrence_end
        )
        
        await db.scheduled_messages.insert_one(scheduled_message.dict())
        
        return {"message": "Message scheduled successfully", "scheduled_message": scheduled_message}
        
    except Exception as e:
        logging.error(f"Error scheduling message: {e}")
        raise HTTPException(status_code=500, detail="Failed to schedule message")

@router.get("/scheduled-messages")
async def get_scheduled_messages(
    chat_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get user's scheduled messages"""
    try:
        db = get_db()
        # Build query
        query = {"sender_id": current_user.id}
        
        if chat_id:
            # Verify user has access to this chat
            chat = await db.chats.find_one({
                "id": chat_id,
                "compound_id": current_user.compound_id,
                "participants": current_user.id,
                "is_active": True
            })
            if not chat:
                raise HTTPException(status_code=404, detail="Chat not found")
            query["chat_id"] = chat_id
        else:
            # Get all user's accessible chats
            user_chats = await db.chats.find({
                "compound_id": current_user.compound_id,
                "participants": current_user.id,
                "is_active": True
            }).to_list(length=10000)
            user_chat_ids = [chat["id"] for chat in user_chats]
            query["chat_id"] = {"$in": user_chat_ids}
        
        if status:
            query["status"] = status
        
        # Get scheduled messages
        scheduled_messages = await db.scheduled_messages.find(query).sort("scheduled_for", 1).skip(skip).limit(limit).to_list(length=10000)
        
        # Get total count
        total_count = await db.scheduled_messages.count_documents(query)
        
        # Get chat details
        chat_ids = list(set(msg["chat_id"] for msg in scheduled_messages))
        chats = await db.chats.find(
            {"id": {"$in": chat_ids}},
            {"id": 1, "name": 1, "chat_type": 1}
        ).to_list(length=10000)
        chats_dict = {chat["id"]: chat for chat in chats}
        
        # Enhance messages with chat info
        for msg in scheduled_messages:
            msg["chat"] = chats_dict.get(msg["chat_id"])
        
        return {
            "scheduled_messages": serialize_datetime(scheduled_messages),
            "total_count": total_count,
            "has_more": total_count > (skip + len(scheduled_messages))
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting scheduled messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to get scheduled messages")

@router.put("/scheduled-messages/{message_id}")
async def update_scheduled_message(
    message_id: str,
    update_data: ScheduledMessageUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a scheduled message"""
    try:
        db = get_db()
        # Find scheduled message
        scheduled_message = await db.scheduled_messages.find_one({
            "id": message_id,
            "sender_id": current_user.id,
            "status": "pending"
        })
        
        if not scheduled_message:
            raise HTTPException(status_code=404, detail="Scheduled message not found or cannot be modified")
        
        # Validate scheduled time if provided
        if update_data.scheduled_for and update_data.scheduled_for <= datetime.utcnow():
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
        
        # Build update data
        update_fields = update_data.dict(exclude_unset=True)
        if update_fields:
            await db.scheduled_messages.update_one(
                {"id": message_id, "sender_id": current_user.id},
                {"$set": update_fields}
            )
        
        return {"message": "Scheduled message updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating scheduled message: {e}")
        raise HTTPException(status_code=500, detail="Failed to update scheduled message")

@router.delete("/scheduled-messages/{message_id}")
async def cancel_scheduled_message(
    message_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel a scheduled message"""
    try:
        db = get_db()
        result = await db.scheduled_messages.update_one(
            {
                "id": message_id,
                "sender_id": current_user.id,
                "status": "pending"
            },
            {"$set": {"status": "cancelled"}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Scheduled message not found or cannot be cancelled")
        
        return {"message": "Scheduled message cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error cancelling scheduled message: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel scheduled message")

@router.post("/scheduled-messages/process")
async def process_scheduled_messages_endpoint(current_user: dict = Depends(get_current_user)):
    """Manually trigger processing of scheduled messages (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can trigger message processing")
    
    try:
        processed_count = await process_scheduled_messages()
        return {"message": f"Processed {processed_count} scheduled messages"}
        
    except Exception as e:
        logging.error(f"Error processing scheduled messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to process scheduled messages")

# ============ ENHANCED MESSAGE SCHEDULING ENDPOINTS ============

class MessageScheduleRequest(BaseModel):
    message_content: str
    recipient_type: str  # "direct", "group", "compound"
    recipient_id: Optional[str] = None  # Not needed for compound-wide
    scheduled_for: datetime
    repeat_type: str = "none"  # "none", "daily", "weekly", "monthly"

@router.post("/messages/schedule")
async def schedule_message_enhanced(
    schedule_request: MessageScheduleRequest,
    current_user: dict = Depends(get_current_user)
):
    """Enhanced message scheduling with recipient type support"""
    try:
        db = get_db()
        # Validate scheduled time is in the future
        if schedule_request.scheduled_for <= datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
        
        chat_id = None
        
        if schedule_request.recipient_type == "compound":
            # Create or find compound-wide chat
            compound_chat = await db.chats.find_one({
                "compound_id": current_user.compound_id,
                "chat_type": "compound_wide",
                "is_active": True
            })
            
            if not compound_chat:
                # Create compound-wide chat
                compound_users = await db.users.find({"compound_id": current_user.compound_id}).to_list(length=10000)
                participant_ids = [user["id"] for user in compound_users]
                
                compound_chat = Chat(
                    compound_id=current_user.compound_id,
                    chat_type="compound_wide",
                    name="Compound Announcements",
                    participants=participant_ids,
                    created_by=current_user.id
                )
                await db.chats.insert_one(compound_chat.dict())
                chat_id = compound_chat.id
            else:
                chat_id = compound_chat["id"]
                
        elif schedule_request.recipient_type == "direct":
            if not schedule_request.recipient_id:
                raise HTTPException(status_code=400, detail="Recipient ID required for direct messages")
            
            # Find or create direct chat
            direct_chat = await db.chats.find_one({
                "compound_id": current_user.compound_id,
                "chat_type": "direct",
                "participants": {"$all": [current_user.id, schedule_request.recipient_id]},
                "is_active": True
            })
            
            if not direct_chat:
                # Create direct chat
                direct_chat = Chat(
                    compound_id=current_user.compound_id,
                    chat_type="direct",
                    participants=[current_user.id, schedule_request.recipient_id],
                    created_by=current_user.id
                )
                await db.chats.insert_one(direct_chat.dict())
                chat_id = direct_chat.id
            else:
                chat_id = direct_chat["id"]
                
        elif schedule_request.recipient_type == "group":
            if not schedule_request.recipient_id:
                raise HTTPException(status_code=400, detail="Group ID required for group messages")
            
            # Verify group chat exists and user is participant
            group_chat = await db.chats.find_one({
                "id": schedule_request.recipient_id,
                "compound_id": current_user.compound_id,
                "participants": current_user.id,
                "is_active": True
            })
            
            if not group_chat:
                raise HTTPException(status_code=404, detail="Group chat not found")
            
            chat_id = schedule_request.recipient_id
        else:
            raise HTTPException(status_code=400, detail="Invalid recipient type")
        
        # Create scheduled message
        scheduled_message = ScheduledMessage(
            chat_id=chat_id,
            sender_id=current_user.id,
            content=schedule_request.message_content,
            message_type="text",
            scheduled_for=schedule_request.scheduled_for,
            timezone="UTC",
            is_recurring=schedule_request.repeat_type != "none",
            recurrence_pattern=schedule_request.repeat_type if schedule_request.repeat_type != "none" else None
        )
        
        await db.scheduled_messages.insert_one(scheduled_message.dict())
        
        return {"message": "Message scheduled successfully", "scheduled_message": scheduled_message}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error scheduling enhanced message: {e}")
        raise HTTPException(status_code=500, detail="Failed to schedule message")

@router.get("/messages/scheduled")
async def get_scheduled_messages_enhanced(
    current_user: dict = Depends(get_current_user)
):
    """Get scheduled messages with enhanced recipient information"""
    try:
        db = get_db()
        # Get user's accessible chats
        user_chats = await db.chats.find({
            "compound_id": current_user.compound_id,
            "participants": current_user.id,
            "is_active": True
        }).to_list(length=10000)
        
        user_chat_ids = [chat["id"] for chat in user_chats]
        
        # Get scheduled messages for these chats
        scheduled_messages = await db.scheduled_messages.find({
            "chat_id": {"$in": user_chat_ids},
            "sender_id": current_user.id
        }).to_list(length=10000)
        
        # Enhance with recipient information
        enhanced_messages = []
        for msg in scheduled_messages:
            chat = next((c for c in user_chats if c["id"] == msg["chat_id"]), None)
            if chat:
                # Determine recipient type and info
                if chat["chat_type"] == "compound_wide":
                    recipient_type = "compound"
                    recipient_id = None
                elif chat["chat_type"] == "direct":
                    recipient_type = "direct"
                    other_participant = next(p for p in chat["participants"] if p != current_user.id)
                    recipient_id = other_participant
                else:  # group
                    recipient_type = "group"
                    recipient_id = chat["id"]
                
                enhanced_msg = {
                    **msg,
                    "recipient_type": recipient_type,
                    "recipient_id": recipient_id,
                    "message_content": msg["content"],
                    "repeat_type": msg["recurrence_pattern"] or "none"
                }
                enhanced_messages.append(enhanced_msg)
        
        return {"messages": enhanced_messages}
        
    except Exception as e:
        logging.error(f"Error getting enhanced scheduled messages: {e}")
        raise HTTPException(status_code=500, detail="Failed to get scheduled messages")

@router.put("/messages/scheduled/{message_id}")
async def update_scheduled_message_enhanced(
    message_id: str,
    update_request: MessageScheduleRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update a scheduled message with enhanced support"""
    try:
        db = get_db()
        # Find the scheduled message
        scheduled_message = await db.scheduled_messages.find_one({
            "id": message_id,
            "sender_id": current_user.id
        })
        
        if not scheduled_message:
            raise HTTPException(status_code=404, detail="Scheduled message not found")
        
        if scheduled_message["status"] != "pending":
            raise HTTPException(status_code=400, detail="Cannot update non-pending message")
        
        # Validate new scheduled time is in the future
        if update_request.scheduled_for <= datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
        
        # Update the message
        update_data = {
            "content": update_request.message_content,
            "scheduled_for": update_request.scheduled_for,
            "is_recurring": update_request.repeat_type != "none",
            "recurrence_pattern": update_request.repeat_type if update_request.repeat_type != "none" else None,
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.scheduled_messages.update_one(
            {"id": message_id},
            {"$set": update_data}
        )
        
        return {"message": "Scheduled message updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating enhanced scheduled message: {e}")
        raise HTTPException(status_code=500, detail="Failed to update scheduled message")

@router.delete("/messages/scheduled/{message_id}")
async def delete_scheduled_message_enhanced(
    message_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a scheduled message"""
    try:
        db = get_db()
        # Find and verify ownership
        scheduled_message = await db.scheduled_messages.find_one({
            "id": message_id,
            "sender_id": current_user.id
        })
        
        if not scheduled_message:
            raise HTTPException(status_code=404, detail="Scheduled message not found")
        
        if scheduled_message["status"] != "pending":
            raise HTTPException(status_code=400, detail="Cannot delete non-pending message")
        
        # Delete the message
        await db.scheduled_messages.delete_one({"id": message_id})
        
        return {"message": "Scheduled message deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting enhanced scheduled message: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete scheduled message")

# ============ ENHANCED SERVICE MANAGEMENT ENDPOINTS ============

