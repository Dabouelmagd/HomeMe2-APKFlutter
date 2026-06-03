"""
Email Delivery Dashboard — visibility into every email the platform sends.

Backed by the existing `smtp_health` collection, enriched with `email_type`
and `related_user_id` for traceability. Lets super-admins:
- See every sent email (with status, error, duration, type, recipient).
- Filter by status / type / search by recipient.
- Resend any bounced/failed email (one-click).
- View overall stats (delivered vs failed in last 7/30 days).
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from auth_deps import get_current_user
from database import get_db
from email_service import email_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/super-admin/email-logs", tags=["super-admin"])


def _ensure_super_admin(current_user: dict):
    role = current_user.get("role")
    if role not in ("super_admin", "app_owner"):
        raise HTTPException(403, "Only super_admin can view email logs")


def _doc_to_log(doc: dict) -> dict:
    ts = doc.get("timestamp")
    if isinstance(ts, datetime):
        ts = ts.isoformat()
    return {
        "id": doc.get("id") or str(doc.get("_id", "")),
        "timestamp": ts,
        "to_email": doc.get("to_email"),
        "subject": doc.get("subject"),
        "email_type": doc.get("email_type", "generic"),
        "mailbox": doc.get("mailbox", "main"),
        "status": doc.get("status") or ("delivered" if doc.get("success") else "failed"),
        "success": bool(doc.get("success")),
        "error": doc.get("error"),
        "duration_ms": doc.get("duration_ms"),
        "has_attachment": bool(doc.get("has_attachment")),
        "related_user_id": doc.get("related_user_id"),
    }


@router.get("")
async def list_email_logs(
    status: str = "all",  # all | delivered | failed
    email_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
):
    _ensure_super_admin(current_user)
    db = get_db()

    query: dict = {}
    if status == "delivered":
        query["success"] = True
    elif status == "failed":
        query["success"] = False
    if email_type and email_type != "all":
        query["email_type"] = email_type
    if search:
        # Substring match on recipient email
        query["to_email"] = {"$regex": search.strip(), "$options": "i"}

    cursor = db.smtp_health.find(query, {"_id": 0}).sort("timestamp", -1).limit(min(int(limit or 100), 500))
    docs = await cursor.to_list(500)
    return {"logs": [_doc_to_log(d) for d in docs]}


@router.get("/stats")
async def email_logs_stats(current_user: dict = Depends(get_current_user)):
    _ensure_super_admin(current_user)
    db = get_db()
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    async def count(q):
        return await db.smtp_health.count_documents(q)

    return {
        "last_7_days": {
            "total": await count({"timestamp": {"$gte": seven_days_ago}}),
            "delivered": await count({"timestamp": {"$gte": seven_days_ago}, "success": True}),
            "failed": await count({"timestamp": {"$gte": seven_days_ago}, "success": False}),
        },
        "last_30_days": {
            "total": await count({"timestamp": {"$gte": thirty_days_ago}}),
            "delivered": await count({"timestamp": {"$gte": thirty_days_ago}, "success": True}),
            "failed": await count({"timestamp": {"$gte": thirty_days_ago}, "success": False}),
        },
        "by_type_30d": await _group_by_type(db, thirty_days_ago),
    }


async def _group_by_type(db, since: datetime):
    pipeline = [
        {"$match": {"timestamp": {"$gte": since}}},
        {"$group": {
            "_id": "$email_type",
            "total": {"$sum": 1},
            "delivered": {"$sum": {"$cond": ["$success", 1, 0]}},
            "failed": {"$sum": {"$cond": ["$success", 0, 1]}},
        }},
        {"$sort": {"total": -1}},
    ]
    out = []
    async for d in db.smtp_health.aggregate(pipeline):
        out.append({
            "type": d["_id"] or "unknown",
            "total": d["total"],
            "delivered": d["delivered"],
            "failed": d["failed"],
        })
    return out


@router.post("/{log_id}/resend")
async def resend_email(log_id: str, current_user: dict = Depends(get_current_user)):
    """Re-trigger the same type of email for the same recipient.

    For account-specific emails (verification, welcome) we look up the user
    and call the proper service method. For generic ones we cannot resend
    the exact body — instead we tell the admin to use the user's profile page.
    """
    _ensure_super_admin(current_user)
    db = get_db()

    log = await db.smtp_health.find_one({"id": log_id})
    if not log:
        raise HTTPException(404, "Log entry not found")

    to_email = log.get("to_email")
    email_type = log.get("email_type") or "generic"

    if email_type == "verification":
        # Fire fresh verification token
        from routes.email_verification import send_verification_email_for_user
        user = await db.users.find_one({"email": to_email})
        if not user:
            raise HTTPException(404, "Recipient user no longer exists")
        try:
            ok = await send_verification_email_for_user(
                user_id=user["id"],
                email=user["email"],
                full_name=user.get("full_name", ""),
            )
            return {"resent": ok, "type": "verification"}
        except Exception as e:
            logger.exception("verification resend failed")
            raise HTTPException(500, f"Failed: {str(e)[:200]}")

    if email_type == "welcome":
        user = await db.users.find_one({"email": to_email})
        if not user:
            raise HTTPException(404, "Recipient user no longer exists")
        compound_name = None
        if user.get("compound_id"):
            comp = await db.compounds.find_one({"id": user["compound_id"]})
            if comp:
                compound_name = comp.get("name")
        ok = await email_service.send_welcome_email(
            to_email=user["email"],
            full_name=user.get("full_name", ""),
            username=user.get("username", ""),
            compound_name=compound_name,
        )
        return {"resent": ok, "type": "welcome"}

    # Generic: can't reconstruct payload safely.
    raise HTTPException(
        400,
        f"تعذّر إعادة الإرسال التلقائي لرسائل من نوع '{email_type}'. أعد توليدها يدويًا من المكان الأصلي (مثلاً صفحة المستخدم).",
    )
