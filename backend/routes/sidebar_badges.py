"""
Sidebar dynamic badges — gives the company_admin (and other admin roles)
real-time counts for the most attention-worthy items so they know where to focus.

Returns 3 counts:
  - messages_unread: messages addressed to admin that the admin hasn't read.
  - payment_proofs_pending: receipts uploaded by residents waiting for review.
  - negative_ratings_7d: ratings ≤ 2 stars created in the last 7 days.
"""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta

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
        # Honour active compound filter when set
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

    # 1. Messages unread for this admin
    msg_filter = {
        **scope,
        "sender_id": {"$ne": user_id},
        "read_by": {"$nin": [user_id]},
    }
    messages_unread = await db.messages.count_documents(msg_filter)

    # 2. Payment proofs pending review
    proofs_pending = await db.payment_proofs.count_documents({**scope, "status": "pending"})

    # 3. Negative ratings in the last 7 days (rating ≤ 2)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    ratings_filter = {
        **scope,
        "rating": {"$lte": 2},
        "created_at": {"$gte": week_ago},
    }
    negative_ratings_7d = await db.ratings.count_documents(ratings_filter)

    return {
        "messages_unread": messages_unread,
        "payment_proofs_pending": proofs_pending,
        "negative_ratings_7d": negative_ratings_7d,
        "total": messages_unread + proofs_pending + negative_ratings_7d,
    }
