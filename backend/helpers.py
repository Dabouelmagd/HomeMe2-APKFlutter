"""
Shared helper/utility functions for HomeMe backend.
"""
from datetime import datetime, date, timezone
import logging


def serialize_datetime(obj):
    """Convert datetime objects, date objects, and ObjectIds to JSON serializable format"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, date):
        return obj.isoformat()
    elif hasattr(obj, '__class__') and obj.__class__.__name__ == 'ObjectId':
        return str(obj)
    elif isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_datetime(item) for item in obj]
    return obj


async def notify_compound_admins(compound_id: str, title: str, content: str, action_type: str, exclude_user_id: str = None):
    """Send notification to all admins of a compound"""
    from database import get_db
    import uuid
    db = get_db()
    try:
        query = {
            "compound_id": compound_id,
            "role": {"$in": ["admin", "super_admin", "company_admin", "manager"]}
        }
        admins = await db.users.find(query).to_list(100)
        for admin in admins:
            if exclude_user_id and admin.get("id") == exclude_user_id:
                continue
            notification = {
                "id": str(uuid.uuid4()),
                "user_id": admin["id"],
                "compound_id": compound_id,
                "title": title,
                "content": content,
                "type": action_type,
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification)
    except Exception as e:
        logging.error(f"Error notifying admins: {e}")
