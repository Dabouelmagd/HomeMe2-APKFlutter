"""
Chat & Messaging routes - extracted from server.py
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid
import json
import logging
import os
import aiofiles

from database import get_db
from auth_deps import get_current_user, require_admin
from helpers import serialize_datetime
from shared_models import *


class ChatCreate(BaseModel):
    chat_type: str
    name: Optional[str] = None
    description: Optional[str] = None
    participant_ids: List[str] = []

class ChatMessageCreate(BaseModel):
    content: str
    message_type: str = "text"
    reply_to: Optional[str] = None

class ChatMessageUpdate(BaseModel):
    content: str

class ChatUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class AddParticipantsRequest(BaseModel):
    participant_ids: List[str]

class MessageReactionRequest(BaseModel):
    emoji: str


router = APIRouter(prefix="/api")

@router.get("/chats")
async def get_user_chats(current_user: dict = Depends(get_current_user)):
    """Get all chats for the current user"""
    db = get_db()

    chats = await db.chats.find({
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    }).sort("last_message_at", -1).limit(100).to_list(length=10000)
    
    # Get participant details for each chat
    for chat in chats:
        # Get participant info
        participants = await db.users.find(
            {"id": {"$in": chat["participants"]}},
            {"password_hash": 0}
        ).to_list(length=10000)
        chat["participant_details"] = participants
        
        # Get unread count for current user
        unread_count = await db.chat_messages.count_documents({
            "chat_id": chat["id"],
            f"read_by.{current_user.id}": {"$exists": False}
        })
        chat["unread_count"] = unread_count
        
        # Get last message
        last_message = await db.chat_messages.find_one(
            {"chat_id": chat["id"], "is_deleted": False},
            sort=[("created_at", -1)]
        )
        chat["last_message"] = last_message
    
    return {"chats": serialize_datetime(chats)}

@router.post("/chats")
async def create_chat(
    chat_data: ChatCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new chat"""
    db = get_db()

    # Validate participants are in the same compound
    if chat_data.participant_ids:
        participants = await db.users.find({
            "id": {"$in": chat_data.participant_ids},
            "compound_id": current_user.compound_id
        }).to_list(length=10000)
        
        if len(participants) != len(chat_data.participant_ids):
            raise HTTPException(status_code=400, detail="Some participants not found in compound")
    
    # Add current user to participants if not already included
    participants = set(chat_data.participant_ids)
    participants.add(current_user.id)
    
    # For direct chats, ensure only 2 participants
    if chat_data.chat_type == ChatType.DIRECT and len(participants) != 2:
        raise HTTPException(status_code=400, detail="Direct chats must have exactly 2 participants")
    
    # Check if direct chat already exists
    if chat_data.chat_type == ChatType.DIRECT:
        existing_chat = await db.chats.find_one({
            "compound_id": current_user.compound_id,
            "chat_type": ChatType.DIRECT,
            "participants": {"$all": list(participants), "$size": 2},
            "is_active": True
        })
        if existing_chat:
            return {"chat": Chat(**existing_chat)}
    
    # Create chat
    chat = Chat(
        compound_id=current_user.compound_id,
        chat_type=chat_data.chat_type,
        name=chat_data.name,
        description=chat_data.description,
        participants=list(participants),
        admin_ids=[current_user.id] if chat_data.chat_type != ChatType.DIRECT else [],
        created_by=current_user.id
    )
    
    # Insert chat
    await db.chats.insert_one(chat.dict())
    
    # Create participant records
    for participant_id in participants:
        participant = ChatParticipant(
            chat_id=chat.id,
            user_id=participant_id,
            is_admin=participant_id in chat.admin_ids
        )
        await db.chat_participants.insert_one(participant.dict())
    
    # Notify participants
    await manager.notify_chat_update(
        chat.id,
        "chat_created",
        {"chat": chat.dict()},
        list(participants)
    )
    
    return {"chat": chat}

@router.get("/chats/{chat_id}")
async def get_chat_details(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get chat details and participants"""
    db = get_db()

    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Get participant details
    participants = await db.users.find(
        {"id": {"$in": chat["participants"]}},
        {"password_hash": 0}
    ).to_list(length=10000)
    
    chat["participant_details"] = participants
    
    return {"chat": serialize_datetime(chat)}

@router.get("/chats/{chat_id}/messages")
async def get_chat_messages(
    chat_id: str,
    page: int = 1,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get messages for a chat with pagination"""
    db = get_db()

    # Verify user is participant
    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Get messages with pagination
    skip = (page - 1) * limit
    messages = await db.chat_messages.find({
        "chat_id": chat_id,
        "is_deleted": False
    }).sort("created_at", -1).skip(skip).limit(limit).to_list(length=10000)
    
    # Reverse to show oldest first
    messages.reverse()
    
    # Get sender details for each message
    sender_ids = list(set(msg["sender_id"] for msg in messages))
    senders = await db.users.find(
        {"id": {"$in": sender_ids}},
        {"id": 1, "full_name": 1, "username": 1}
    ).to_list(length=10000)
    senders_dict = {sender["id"]: sender for sender in senders}
    
    for message in messages:
        message["sender"] = senders_dict.get(message["sender_id"])
    
    return {"messages": serialize_datetime(messages)}

@router.post("/chats/{chat_id}/messages")
async def send_message(
    chat_id: str,
    message_data: ChatMessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Send a message to a chat"""
    db = get_db()

    # Verify user is participant
    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Create message
    message = ChatMessage(
        chat_id=chat_id,
        sender_id=current_user.id,
        content=message_data.content,
        message_type=message_data.message_type,
        reply_to=message_data.reply_to,
        read_by={current_user.id: datetime.utcnow()}
    )
    
    # Insert message
    await db.chat_messages.insert_one(message.dict())
    
    # Update chat's last message time
    await db.chats.update_one(
        {"id": chat_id},
        {"$set": {"last_message_at": message.created_at, "updated_at": datetime.utcnow()}}
    )
    
    # Get sender info
    sender_info = {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "username": current_user.username
    }
    
    # Prepare message for WebSocket
    ws_message = message.dict()
    ws_message["sender"] = sender_info
    
    # Send to all participants via WebSocket
    await manager.send_chat_message(
        {
            "type": "new_message",
            "chat_id": chat_id,
            "message": ws_message
        },
        chat["participants"]
    )
    
    # Send push notifications to participants
    await notify_chat_participants(
        chat_id,
        current_user.id,
        message_data.content,
        message_data.message_type
    )
    
    return {"message": message}

@router.post("/chats/{chat_id}/upload")
async def upload_file_to_chat(
    chat_id: str,
    files: List[UploadFile] = File(...),
    message_content: str = "",
    current_user: dict = Depends(get_current_user)
):
    """Upload files to a chat and create a message with attachments"""
    db = get_db()

    # Verify user is participant
    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Process each file
    attachments = []
    for file in files:
        file_type = get_file_type(file.filename)
        attachment = await save_uploaded_file(file, file_type)
        attachments.append(attachment)
    
    # Determine message type based on attachments
    if len(attachments) == 1:
        message_type = attachments[0]["file_type"]
    else:
        message_type = "mixed"
    
    # Create message with attachments
    message = ChatMessage(
        chat_id=chat_id,
        sender_id=current_user.id,
        content=message_content or f"Shared {len(attachments)} file{'s' if len(attachments) > 1 else ''}",
        message_type=message_type,
        attachments=attachments,
        read_by={current_user.id: datetime.utcnow()}
    )
    
    # Insert message
    await db.chat_messages.insert_one(message.dict())
    
    # Update chat's last message time
    await db.chats.update_one(
        {"id": chat_id},
        {"$set": {"last_message_at": message.created_at, "updated_at": datetime.utcnow()}}
    )
    
    # Get sender info
    sender_info = {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "username": current_user.username
    }
    
    # Prepare message for WebSocket
    ws_message = message.dict()
    ws_message["sender"] = sender_info
    
    # Send to all participants via WebSocket
    await manager.send_chat_message(
        {
            "type": "new_message",
            "chat_id": chat_id,
            "message": ws_message
        },
        chat["participants"]
    )
    
    # Send push notifications to participants
    await notify_chat_participants(
        chat_id,
        current_user.id,
        message_content or f"Shared {len(attachments)} file{'s' if len(attachments) > 1 else ''}",
        message_type
    )
    
    return {"message": message}

@router.post("/chats/{chat_id}/voice")
async def send_voice_message(
    chat_id: str,
    voice_file: UploadFile = File(...),
    duration: float = 0.0,
    current_user: dict = Depends(get_current_user)
):
    """Send a voice message to a chat"""
    db = get_db()

    # Verify user is participant
    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Validate file type
    if not voice_file.filename or not any(voice_file.filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS["voice"]):
        raise HTTPException(status_code=400, detail="Invalid voice file format")
    
    # Process voice file
    try:
        attachment = await save_uploaded_file(voice_file, "voice")
        
        # Create voice message
        message = ChatMessage(
            chat_id=chat_id,
            sender_id=current_user.id,
            content="🎵 Voice message",
            message_type="voice",
            attachments=[attachment],
            voice_duration=attachment.get("duration", duration),
            voice_waveform=attachment.get("waveform", []),
            read_by={current_user.id: datetime.utcnow()}
        )
        
        # Insert message
        await db.chat_messages.insert_one(message.dict())
        
        # Update chat's last message time
        await db.chats.update_one(
            {"id": chat_id},
            {"$set": {"last_message_at": message.created_at, "updated_at": datetime.utcnow()}}
        )
        
        # Get sender info
        sender_info = {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "username": current_user.username
        }
        
        # Prepare message for WebSocket
        ws_message = message.dict()
        ws_message["sender"] = sender_info
        
        # Send to all participants via WebSocket
        await manager.send_chat_message(
            {
                "type": "new_message",
                "chat_id": chat_id,
                "message": ws_message
            },
            chat["participants"]
        )
        
        # Send push notifications to participants
        await notify_chat_participants(
            chat_id,
            current_user.id,
            "🎵 Voice message",
            "voice"
        )
        
        return {"message": message}
        
    except Exception as e:
        logging.error(f"Error processing voice message: {e}")
        raise HTTPException(status_code=500, detail="Failed to process voice message")

@router.post("/chats/{chat_id}/messages/{message_id}/react")
async def add_message_reaction(
    chat_id: str,
    message_id: str,
    reaction_data: MessageReactionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Add or remove a reaction to a message"""
    db = get_db()

    # Verify user is participant
    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Find the message
    message = await db.chat_messages.find_one({
        "id": message_id,
        "chat_id": chat_id,
        "is_deleted": False
    })
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Get current reactions
    reactions = message.get("reactions", {})
    emoji = reaction_data.emoji
    
    # Toggle reaction
    if emoji not in reactions:
        reactions[emoji] = []
    
    if current_user.id in reactions[emoji]:
        # Remove reaction
        reactions[emoji].remove(current_user.id)
        if not reactions[emoji]:  # Remove empty reaction list
            del reactions[emoji]
    else:
        # Add reaction
        reactions[emoji].append(current_user.id)
    
    # Update message
    await db.chat_messages.update_one(
        {"id": message_id},
        {"$set": {"reactions": reactions}}
    )
    
    # Notify participants
    await manager.send_chat_message(
        {
            "type": "message_reaction",
            "chat_id": chat_id,
            "message_id": message_id,
            "emoji": emoji,
            "user_id": current_user.id,
            "reactions": reactions
        },
        chat["participants"]
    )
    
    return {"message": "Reaction updated successfully", "reactions": reactions}

@router.put("/chats/{chat_id}/messages/{message_id}")
async def edit_message(
    chat_id: str,
    message_id: str,
    message_data: ChatMessageUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Edit a message (only by sender)"""
    db = get_db()

    # Verify user is participant and message sender
    message = await db.chat_messages.find_one({
        "id": message_id,
        "chat_id": chat_id,
        "sender_id": current_user.id,
        "is_deleted": False
    })
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found or you're not the sender")
    
    # Update message
    await db.chat_messages.update_one(
        {"id": message_id},
        {"$set": {
            "content": message_data.content,
            "is_edited": True,
            "edited_at": datetime.utcnow()
        }}
    )
    
    # Get chat participants for notification
    chat = await db.chats.find_one({"id": chat_id})
    
    # Notify participants
    await manager.send_chat_message(
        {
            "type": "message_edited",
            "chat_id": chat_id,
            "message_id": message_id,
            "content": message_data.content
        },
        chat["participants"]
    )
    
    return {"message": "Message updated successfully"}

@router.delete("/chats/{chat_id}/messages/{message_id}")
async def delete_message(
    chat_id: str,
    message_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a message (only by sender)"""
    db = get_db()

    # Verify user is participant and message sender
    message = await db.chat_messages.find_one({
        "id": message_id,
        "chat_id": chat_id,
        "sender_id": current_user.id,
        "is_deleted": False
    })
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found or you're not the sender")
    
    # Soft delete message
    await db.chat_messages.update_one(
        {"id": message_id},
        {"$set": {
            "is_deleted": True,
            "deleted_at": datetime.utcnow()
        }}
    )
    
    # Get chat participants for notification
    chat = await db.chats.find_one({"id": chat_id})
    
    # Notify participants
    await manager.send_chat_message(
        {
            "type": "message_deleted",
            "chat_id": chat_id,
            "message_id": message_id
        },
        chat["participants"]
    )
    
    return {"message": "Message deleted successfully"}

@router.put("/chats/{chat_id}/read")
async def mark_messages_as_read(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark all messages in a chat as read"""
    db = get_db()

    # Verify user is participant
    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "participants": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Mark all unread messages as read
    await db.chat_messages.update_many(
        {
            "chat_id": chat_id,
            f"read_by.{current_user.id}": {"$exists": False}
        },
        {"$set": {f"read_by.{current_user.id}": datetime.utcnow()}}
    )
    
    return {"message": "Messages marked as read"}

@router.post("/chats/{chat_id}/participants")
async def add_participants(
    chat_id: str,
    participants_data: AddParticipantsRequest,
    current_user: dict = Depends(get_current_user)
):
    """Add participants to a group chat (admin only)"""
    db = get_db()

    # Verify user is chat admin
    chat = await db.chats.find_one({
        "id": chat_id,
        "compound_id": current_user.compound_id,
        "admin_ids": current_user.id,
        "is_active": True
    })
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found or you're not an admin")
    
    if chat["chat_type"] == ChatType.DIRECT:
        raise HTTPException(status_code=400, detail="Cannot add participants to direct chats")
    
    # Validate new participants are in the same compound
    new_participants = await db.users.find({
        "id": {"$in": participants_data.participant_ids},
        "compound_id": current_user.compound_id
    }).to_list(length=10000)
    
    if len(new_participants) != len(participants_data.participant_ids):
        raise HTTPException(status_code=400, detail="Some participants not found in compound")
    
    # Add to chat participants
    current_participants = set(chat["participants"])
    new_participant_ids = [p["id"] for p in new_participants if p["id"] not in current_participants]
    
    if not new_participant_ids:
        return {"message": "All users are already participants"}
    
    # Update chat
    await db.chats.update_one(
        {"id": chat_id},
        {
            "$addToSet": {"participants": {"$each": new_participant_ids}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    # Create participant records
    for participant_id in new_participant_ids:
        participant = ChatParticipant(
            chat_id=chat_id,
            user_id=participant_id
        )
        await db.chat_participants.insert_one(participant.dict())
    
    # Notify all participants
    all_participants = list(current_participants) + new_participant_ids
    await manager.notify_chat_update(
        chat_id,
        "participants_added",
        {"new_participants": new_participants},
        all_participants
    )
    
    return {"message": f"Added {len(new_participant_ids)} participants to chat"}

# ============ PUSH NOTIFICATION ENDPOINTS ============

