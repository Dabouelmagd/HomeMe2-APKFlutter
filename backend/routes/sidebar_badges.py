"""
Sidebar dynamic badges — gives the company_admin (and other admin roles)
real-time counts for the most attention-worthy items so they know where to focus.

Returns counts:
  - messages_unread: messages addressed to admin that the admin hasn't read.
  - payment_proofs_pending: receipts uploaded by residents waiting for review.
  - negative_ratings_7d: ratings ≤ 2 stars created in the last 7 days.
  - testimonials_pending: public testimonials awaiting owner moderation (app_owner / super_admin only).
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
import asyncio

from database import get_db
from auth_deps import require_admin


router = APIRouter(prefix="/api/sidebar")


async def _resolve_compound_scope(db, current_user: dict) -> dict:
    """Return a Mongo filter clause matching the compounds visible to this admin.
    company_admin → all owned compounds (DB linkage + legacy company.compound_ids).
    other admins  → user.compound_id only.
    """
    role = current_user.get("role")
    if role == "company_admin":
        company_id = current_user.get("company_id")
        if not company_id:
            return {"compound_id": "__none__"}
        compounds = await db.compounds.find({"company_id": company_id}, {"_id": 0, "id": 1}).to_list(length=500)
        company = await db.companies.find_one({"id": company_id}, {"_id": 0, "compound_ids": 1}) or {}
        legacy_ids = [x for x in (company.get("compound_ids") or []) if x not in {c["id"] for c in compounds}]
        if legacy_ids:
            extras = await db.compounds.find({"id": {"$in": legacy_ids}}, {"_id": 0, "id": 1}).to_list(length=500)
            compounds.extend(extras)
        ids = [c["id"] for c in compounds]
        active = current_user.get("compound_id")
        if active and active in ids:
            return {"compound_id": active}
        return {"compound_id": {"$in": ids}} if ids else {"compound_id": "__none__"}

    cid = current_user.get("compound_id")
    return {"compound_id": cid} if cid else {"compound_id": "__none__"}


@router.get("/badges")
async def get_sidebar_badges(current_user: dict = Depends(require_admin)):
    db = get_db()
    scope = await _resolve_compound_scope(db, current_user)
    user_id = current_user.get("id") or current_user.get("user_id")

    msg_filter = {
        **scope,
        "sender_id": {"$ne": user_id},
        "read_by": {"$nin": [user_id]},
    }
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    ratings_filter = {
        **scope,
        "rating": {"$lte": 2},
        "created_at": {"$gte": week_ago},
    }

    # Owner/Super admin also see testimonials moderation queue (global, not compound-scoped)
    is_owner = current_user.get("role") in ("app_owner", "super_admin")
    testimonials_task = (
        db.testimonials.count_documents({"status": "pending"})
        if is_owner else asyncio.sleep(0, result=0)
    )

    messages_unread, proofs_pending, negative_ratings_7d, testimonials_pending = await asyncio.gather(
        db.messages.count_documents(msg_filter),
        db.payment_proofs.count_documents({**scope, "status": "pending"}),
        db.ratings.count_documents(ratings_filter),
        testimonials_task,
    )

    return {
        "messages_unread": messages_unread,
        "payment_proofs_pending": proofs_pending,
        "negative_ratings_7d": negative_ratings_7d,
        "testimonials_pending": testimonials_pending,
        "total": messages_unread + proofs_pending + negative_ratings_7d + testimonials_pending,
    }
