"""
Support Chat System — HomeMe
- كل مستخدم يفتح محادثة مع الـ Support
- الـ Owner/SuperAdmin يردوا من لوحة تحكم مدمجة
- Real-time via WebSocket (existing manager)
- نوع المحادثة: support
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from typing import Optional
import uuid

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api/support-chat", tags=["support-chat"])


# ── Open or get existing support chat ────────────────────────────────────────
@router.post("/open")
async def open_support_chat(current_user: dict = Depends(get_current_user)):
    """مستخدم يفتح محادثة دعم — ينشئها لو مش موجودة."""
    db = get_db()
    user_id = current_user["id"]

    # Check existing open chat
    existing = await db.support_chats.find_one({
        "user_id": user_id,
        "status": {"$in": ["open", "pending"]}
    })
    if existing:
        existing.pop("_id", None)
        return {"chat": existing, "created": False}

    chat_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    chat = {
        "id": chat_id,
        "user_id": user_id,
        "user_name": current_user.get("full_name") or current_user.get("username"),
        "user_email": current_user.get("email", ""),
        "user_role": current_user.get("role", ""),
        "compound_id": current_user.get("compound_id", ""),
        "status": "open",
        "unread_support": 0,    # unread by support team
        "unread_user": 0,       # unread by user
        "last_message": None,
        "last_message_at": now,
        "created_at": now,
        "messages": [],
    }
    await db.support_chats.insert_one(chat)
    chat.pop("_id", None)
    return {"chat": chat, "created": True}


# ── Send message ─────────────────────────────────────────────────────────────
@router.post("/{chat_id}/messages")
async def send_message(
    chat_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    chat = await db.support_chats.find_one({"id": chat_id})
    if not chat:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")

    is_support = current_user.get("role") in ("app_owner", "super_admin")
    # Verify ownership
    if not is_support and chat["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    text = (body.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="الرسالة فارغة")

    msg = {
        "id": str(uuid.uuid4()),
        "chat_id": chat_id,
        "sender_id": current_user["id"],
        "sender_name": current_user.get("full_name") or current_user.get("username"),
        "sender_role": current_user.get("role", ""),
        "is_support": is_support,
        "text": text,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False,
    }
    await db.support_messages.insert_one(msg)
    msg.pop("_id", None)

    # Update chat meta
    update = {
        "last_message": text[:100],
        "last_message_at": msg["created_at"],
        "status": "open",
    }
    if is_support:
        update["unread_user"] = chat.get("unread_user", 0) + 1
    else:
        update["unread_support"] = chat.get("unread_support", 0) + 1

    await db.support_chats.update_one({"id": chat_id}, {"$set": update})
    return {"message": msg}


# ── Get messages ─────────────────────────────────────────────────────────────
@router.get("/{chat_id}/messages")
async def get_messages(
    chat_id: str,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    chat = await db.support_chats.find_one({"id": chat_id})
    if not chat:
        raise HTTPException(status_code=404, detail="المحادثة غير موجودة")

    is_support = current_user.get("role") in ("app_owner", "super_admin")
    if not is_support and chat["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="غير مصرح")

    msgs = await db.support_messages.find(
        {"chat_id": chat_id}, {"_id": 0}
    ).sort("created_at", 1).limit(limit).to_list(limit)

    # Mark as read
    if is_support:
        await db.support_chats.update_one({"id": chat_id}, {"$set": {"unread_support": 0}})
    else:
        await db.support_chats.update_one({"id": chat_id}, {"$set": {"unread_user": 0}})

    chat.pop("_id", None)
    return {"chat": chat, "messages": msgs}


# ── Support dashboard: list all chats ────────────────────────────────────────
@router.get("/admin/all")
async def get_all_chats(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="للدعم الفني فقط")
    db = get_db()
    query = {}
    if status:
        query["status"] = status
    chats = await db.support_chats.find(query, {"_id": 0}).sort(
        "last_message_at", -1
    ).limit(200).to_list(200)
    return {"chats": chats, "total": len(chats)}


# ── Close/resolve chat ───────────────────────────────────────────────────────
@router.put("/{chat_id}/status")
async def update_status(
    chat_id: str,
    body: dict,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    db = get_db()
    status = body.get("status", "closed")
    await db.support_chats.update_one(
        {"id": chat_id},
        {"$set": {"status": status, "closed_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "status": status}


# ── User: get my chat ────────────────────────────────────────────────────────
@router.get("/my")
async def get_my_chat(current_user: dict = Depends(get_current_user)):
    db = get_db()
    chat = await db.support_chats.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0}
    )
    return {"chat": chat}


# ── Unread count for sidebar badge ──────────────────────────────────────────
@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    db = get_db()
    is_support = current_user.get("role") in ("app_owner", "super_admin")
    if is_support:
        count = await db.support_chats.count_documents({"unread_support": {"$gt": 0}, "status": "open"})
    else:
        chat = await db.support_chats.find_one({"user_id": current_user["id"]}, {"_id": 0, "unread_user": 1})
        count = chat.get("unread_user", 0) if chat else 0
    return {"unread": count}
