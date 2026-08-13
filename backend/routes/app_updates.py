"""
App Updates System
- Owner publishes updates → all users get notified
- Users see update icon in top bar with badge
- Updates stored in DB with version, title, description
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
import uuid
from typing import Optional

from auth_deps import get_current_user, require_super_admin
from database import get_db

router = APIRouter(prefix="/api/app-updates", tags=["app-updates"])


@router.get("/latest")
async def get_latest_updates(
    current_user: dict = Depends(get_current_user)
):
    """Get latest app updates — shown in top bar."""
    db = get_db()
    updates = await db.app_updates.find(
        {"published": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    
    # Check which user has seen
    user_id = current_user["id"]
    seen_doc = await db.app_update_views.find_one({"user_id": user_id})
    seen_ids = set(seen_doc.get("seen_ids", []) if seen_doc else [])
    
    unseen_count = sum(1 for u in updates if u["id"] not in seen_ids)
    
    return {
        "updates": updates,
        "unseen_count": unseen_count,
        "seen_ids": list(seen_ids),
    }


@router.post("/mark-seen/{update_id}")
async def mark_update_seen(
    update_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark an update as seen by the user."""
    db = get_db()
    user_id = current_user["id"]
    await db.app_update_views.update_one(
        {"user_id": user_id},
        {"$addToSet": {"seen_ids": update_id},
         "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"success": True}


@router.post("/mark-all-seen")
async def mark_all_seen(current_user: dict = Depends(get_current_user)):
    """Mark all updates as seen."""
    db = get_db()
    user_id = current_user["id"]
    updates = await db.app_updates.find(
        {"published": True}, {"_id": 0, "id": 1}
    ).to_list(100)
    all_ids = [u["id"] for u in updates]
    
    await db.app_update_views.update_one(
        {"user_id": user_id},
        {"$set": {"seen_ids": all_ids,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"success": True}


@router.get("/admin/list")
async def list_updates(current_user: dict = Depends(require_super_admin)):
    """Owner: list all updates."""
    db = get_db()
    updates = await db.app_updates.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return {"updates": updates}


@router.post("/admin/create")
async def create_update(
    body: dict,
    current_user: dict = Depends(require_super_admin)
):
    """Owner: publish a new update + send in-app notification."""
    db = get_db()
    
    title = body.get("title", "").strip()
    description = body.get("description", "").strip()
    version = body.get("version", "").strip()
    update_type = body.get("type", "feature")  # feature, fix, security, improvement
    
    if not title:
        raise HTTPException(400, "العنوان مطلوب")
    
    now = datetime.now(timezone.utc).isoformat()
    update_id = str(uuid.uuid4())
    
    doc = {
        "id": update_id,
        "title": title,
        "description": description,
        "version": version,
        "type": update_type,
        "published": True,
        "created_by": current_user["id"],
        "created_by_name": current_user.get("full_name") or current_user.get("username"),
        "created_at": now,
    }
    
    await db.app_updates.insert_one(doc)
    
    # Send in-app notification to ALL users
    users = await db.users.find(
        {"is_active": True, "role": {"$in": ["admin","company_admin","manager","resident","security"]}},
        {"_id": 0, "id": 1}
    ).to_list(10000)
    
    type_emoji = {"feature": "✨", "fix": "🔧", "security": "🔒", "improvement": "⚡"}.get(update_type, "📢")
    
    notifs = [{
        "id": str(uuid.uuid4()),
        "user_id": u["id"],
        "type": "app_update",
        "update_id": update_id,
        "title": f"{type_emoji} تحديث جديد",
        "body": title,
        "read": False,
        "created_at": now,
    } for u in users]
    
    if notifs:
        await db.notifications.insert_many(notifs)
    
    doc.pop("_id", None)
    return {"success": True, "update": doc, "notified": len(notifs)}


@router.put("/admin/{update_id}")
async def edit_update(
    update_id: str,
    body: dict,
    current_user: dict = Depends(require_super_admin)
):
    """Owner: edit an update."""
    db = get_db()
    await db.app_updates.update_one(
        {"id": update_id},
        {"$set": {
            "title": body.get("title", ""),
            "description": body.get("description", ""),
            "version": body.get("version", ""),
            "type": body.get("type", "feature"),
            "published": body.get("published", True),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    return {"success": True}


@router.delete("/admin/{update_id}")
async def delete_update(
    update_id: str,
    current_user: dict = Depends(require_super_admin)
):
    """Owner: delete an update."""
    db = get_db()
    await db.app_updates.delete_one({"id": update_id})
    return {"success": True}
