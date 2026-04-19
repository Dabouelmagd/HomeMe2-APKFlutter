"""
Maintenance Request routes
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from datetime import datetime, timezone
from typing import Optional, List
from pathlib import Path
import uuid
import os
import logging
import aiofiles

from database import get_db
from auth_deps import get_current_user, require_admin
from helpers import serialize_datetime, notify_compound_admins

router = APIRouter(prefix="/api")

UPLOAD_DIR = Path("/app/uploads")


@router.post("/maintenance/requests")
async def create_maintenance_request(
    title: str = Form(...), description: str = Form(...), category: str = Form(...),
    priority: str = Form(...), location: str = Form(None), contact_method: str = Form("app"),
    preferred_time: str = Form(None), images: List[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    try:
        image_urls = []
        if images:
            maintenance_uploads_dir = f"{UPLOAD_DIR}/maintenance"
            os.makedirs(maintenance_uploads_dir, exist_ok=True)
            for image in images:
                if not image.content_type.startswith('image/'):
                    continue
                file_extension = image.filename.split('.')[-1].lower()
                unique_filename = f"maintenance_{str(uuid.uuid4())}.{file_extension}"
                file_path = os.path.join(maintenance_uploads_dir, unique_filename)
                content = await image.read()
                async with aiofiles.open(file_path, 'wb') as f:
                    await f.write(content)
                image_urls.append(f"/uploads/maintenance/{unique_filename}")

        maintenance_request = {
            "id": str(uuid.uuid4()), "title": title, "description": description,
            "category": category, "priority": priority, "status": "pending",
            "location": location, "contact_method": contact_method, "preferred_time": preferred_time,
            "requester_id": current_user["id"], "requester_name": current_user.get("full_name", ""),
            "compound_id": current_user["compound_id"],
            "unit_number": current_user.get("unit_number", ""),
            "family_id": current_user.get("family_id"),
            "images": image_urls, "notes": [],
            "created_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)
        }
        await db.maintenance_requests.insert_one(maintenance_request)

        priority_labels = {"urgent": "عاجل", "high": "مرتفع", "normal": "عادي", "low": "منخفض"}
        await notify_compound_admins(
            compound_id=current_user["compound_id"], title="طلب صيانة جديد",
            content=f"طلب صيانة من {current_user.get('full_name', '')}: {title} (أولوية: {priority_labels.get(priority, priority)})",
            action_type="new_maintenance", exclude_user_id=None
        )
        return {"message": "Maintenance request created successfully", "request_id": maintenance_request["id"]}
    except Exception as e:
        logging.error(f"Error creating maintenance request: {e}")
        raise HTTPException(status_code=500, detail="Failed to create maintenance request")


@router.get("/maintenance/requests")
async def get_maintenance_requests(status: Optional[str] = None, category: Optional[str] = None, priority: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        query = {"compound_id": current_user["compound_id"]}
        if current_user.get("role") != "admin":
            query["requester_id"] = current_user["id"]
        if status:
            query["status"] = status
        if category:
            query["category"] = category
        if priority:
            query["priority"] = priority
        requests = await db.maintenance_requests.find(query).sort("created_at", -1).to_list(length=10000)
        return {"requests": serialize_datetime(requests)}
    except Exception as e:
        logging.error(f"Error fetching maintenance requests: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch maintenance requests")


@router.get("/maintenance/stats")
async def get_maintenance_stats(current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        query = {"compound_id": current_user["compound_id"]}
        if current_user.get("role") != "admin":
            query["requester_id"] = current_user["id"]
        all_requests = await db.maintenance_requests.find(query).to_list(length=10000)
        stats = {"total": len(all_requests), "pending": 0, "assigned": 0, "in_progress": 0, "completed": 0, "cancelled": 0,
                 "low_priority": 0, "normal_priority": 0, "high_priority": 0, "urgent_priority": 0,
                 "plumbing": 0, "electrical": 0, "hvac": 0, "appliance": 0, "general": 0, "cleaning": 0, "landscaping": 0, "security": 0}
        for request in all_requests:
            s = request.get("status", "pending")
            if s in stats:
                stats[s] += 1
            p = request.get("priority", "normal")
            pk = f"{p}_priority"
            if pk in stats:
                stats[pk] += 1
            c = request.get("category", "general")
            if c in stats:
                stats[c] += 1
        return {"stats": stats}
    except Exception as e:
        logging.error(f"Error fetching maintenance stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch maintenance stats")


@router.patch("/maintenance/requests/{request_id}/status")
async def update_maintenance_status(request_id: str, status: str = Form(...), notes: str = Form(None), current_user: dict = Depends(require_admin)):
    db = get_db()
    try:
        valid_statuses = ["pending", "assigned", "in_progress", "completed", "cancelled"]
        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        request_doc = await db.maintenance_requests.find_one({"id": request_id})
        if not request_doc:
            raise HTTPException(status_code=404, detail="Maintenance request not found")
        update_data = {"status": status, "updated_at": datetime.now(timezone.utc)}
        if status == "completed":
            update_data["completed_at"] = datetime.now(timezone.utc)
        if notes:
            note = {"author_id": current_user["id"], "author_name": current_user.get("full_name", ""), "note": notes, "timestamp": datetime.now(timezone.utc), "is_internal": False}
            await db.maintenance_requests.update_one({"id": request_id}, {"$set": update_data, "$push": {"notes": note}})
        else:
            await db.maintenance_requests.update_one({"id": request_id}, {"$set": update_data})
        return {"message": "Maintenance request status updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating maintenance status: {e}")
        raise HTTPException(status_code=500, detail="Failed to update maintenance status")
