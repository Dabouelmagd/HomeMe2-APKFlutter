"""
Testimonials Routes — نظام تقييمات حقيقي للمنصة.

Flow:
  1. أي ساكن/شركة/عميل يقدر يرسل تقييمه عبر POST /api/testimonials/submit
     (لا يحتاج تسجيل دخول — public form للسماح بأوسع تجاوب)
  2. التقييم يدخل قائمة الانتظار بـ status="pending"
  3. المالك (app_owner) يراجعها في لوحة التحكم ويقرر موافقة/رفض عبر
     PUT /api/owner/testimonials/{id} — يتم تغيير status + published_at
  4. الـ HomePage بتجيب فقط status="published" مع حد أقصى + ترتيب

Collections: testimonials
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timezone
import uuid

from database import get_db
from auth_deps import get_current_user
from helpers import serialize_datetime

router = APIRouter(prefix="/api")


class TestimonialSubmit(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    role: Optional[str] = Field(None, max_length=80)  # "ساكن", "مدير شركة", "مستثمر", ...
    stars: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=10, max_length=1000)
    email: Optional[str] = Field(None, max_length=120)
    company_name: Optional[str] = Field(None, max_length=120)


class TestimonialDecision(BaseModel):
    status: Literal["published", "rejected"]
    admin_note: Optional[str] = Field(None, max_length=400)


@router.post("/testimonials/submit")
async def submit_testimonial(payload: TestimonialSubmit):
    """Public endpoint — anyone can submit a review. Always saved as pending."""
    db = get_db()
    now = datetime.now(timezone.utc)
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name.strip(),
        "role": (payload.role or "").strip() or None,
        "stars": payload.stars,
        "comment": payload.comment.strip(),
        "email": (payload.email or "").strip() or None,
        "company_name": (payload.company_name or "").strip() or None,
        "status": "pending",
        "created_at": now.isoformat(),
        "published_at": None,
        "admin_note": None,
    }
    await db.testimonials.insert_one(doc)
    doc.pop("_id", None)
    return {
        "message": "شكراً لتقييمك! سيُراجع من قبل الإدارة قبل النشر",
        "testimonial_id": doc["id"],
    }


class AuthenticatedTestimonialSubmit(BaseModel):
    stars: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=10, max_length=1000)


@router.post("/testimonials/submit-authenticated")
async def submit_testimonial_authenticated(
    payload: AuthenticatedTestimonialSubmit,
    current_user: dict = Depends(get_current_user),
):
    """Resident/Compound-admin testimonial submission about their compound.

    Auto-fills `name`, `role`, and `compound_name` from the logged-in user
    profile, so social-proof on /pricing has reliable identity attribution.
    Goes through the same pending → published moderation flow.
    """
    db = get_db()
    now = datetime.now(timezone.utc)
    # Pull compound name if user belongs to one (used as "company_name" in card)
    compound_name = None
    if current_user.get("compound_id"):
        c = await db.compounds.find_one(
            {"id": current_user["compound_id"]}, {"_id": 0, "name": 1}
        )
        compound_name = (c or {}).get("name")
    role_label_map = {
        "resident": "ساكن",
        "admin": "مدير مجتمع",
        "manager": "مدير مجتمع",
        "assistant_manager": "مدير مساعد",
        "company_admin": "مدير شركة إدارة",
        "security": "أمن",
        "accountant": "محاسب",
    }
    role_label = role_label_map.get(current_user.get("role"), "عميل HomeMe")

    # Prevent spam: one pending/published per user at a time
    existing = await db.testimonials.find_one(
        {"submitted_by": current_user["id"], "status": {"$in": ["pending", "published"]}},
        {"_id": 0, "id": 1, "status": 1},
    )
    if existing:
        msg = (
            "لديك تقييم منشور بالفعل" if existing["status"] == "published"
            else "تقييمك السابق قيد المراجعة من الإدارة"
        )
        raise HTTPException(status_code=400, detail=msg)

    doc = {
        "id": str(uuid.uuid4()),
        "name": (current_user.get("full_name") or current_user.get("username") or "").strip(),
        "role": role_label,
        "stars": payload.stars,
        "comment": payload.comment.strip(),
        "email": current_user.get("email"),
        "company_name": compound_name,
        "compound_id": current_user.get("compound_id"),
        "submitted_by": current_user["id"],
        "status": "pending",
        "created_at": now.isoformat(),
        "published_at": None,
        "admin_note": None,
    }
    await db.testimonials.insert_one(doc)
    doc.pop("_id", None)
    return {
        "message": "شكراً لتقييمك! سيُراجع قبل النشر",
        "testimonial_id": doc["id"],
    }


@router.get("/testimonials/my")
async def get_my_testimonial(current_user: dict = Depends(get_current_user)):
    """Return the current user's most recent submitted testimonial (if any)."""
    db = get_db()
    doc = await db.testimonials.find_one(
        {"submitted_by": current_user["id"]},
        {"_id": 0},
        sort=[("created_at", -1)],
    )
    if not doc:
        return {"testimonial": None}
    return {"testimonial": serialize_datetime(doc)}




@router.get("/testimonials/published")
async def list_published_testimonials(limit: int = 12):
    """Public endpoint — used by the HomePage carousel."""
    db = get_db()
    cursor = db.testimonials.find(
        {"status": "published"},
        {"_id": 0, "email": 0, "admin_note": 0},
    ).sort([("published_at", -1), ("created_at", -1)]).limit(min(max(limit, 1), 50))
    items = []
    async for doc in cursor:
        items.append(serialize_datetime(doc))
    return {"testimonials": items, "count": len(items)}


def _require_owner_or_super(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    if role not in ("app_owner", "super_admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    return current_user


@router.get("/owner/testimonials")
async def admin_list_testimonials(
    status: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(_require_owner_or_super),
):
    """Owner/Super-admin: list testimonials by status (pending/published/rejected)."""
    db = get_db()
    q = {}
    if status in ("pending", "published", "rejected"):
        q["status"] = status
    cursor = db.testimonials.find(q, {"_id": 0}).sort("created_at", -1).limit(min(max(limit, 1), 500))
    items = []
    async for doc in cursor:
        items.append(serialize_datetime(doc))
    # Counts per status
    counts = {
        "pending": await db.testimonials.count_documents({"status": "pending"}),
        "published": await db.testimonials.count_documents({"status": "published"}),
        "rejected": await db.testimonials.count_documents({"status": "rejected"}),
    }
    return {"testimonials": items, "counts": counts}


@router.put("/owner/testimonials/{testimonial_id}")
async def admin_moderate_testimonial(
    testimonial_id: str,
    payload: TestimonialDecision,
    current_user: dict = Depends(_require_owner_or_super),
):
    """Approve (publish) or reject a pending testimonial."""
    db = get_db()
    t = await db.testimonials.find_one({"id": testimonial_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="التقييم غير موجود")

    now = datetime.now(timezone.utc)
    update = {
        "status": payload.status,
        "admin_note": payload.admin_note,
        "moderated_at": now.isoformat(),
        "moderated_by": current_user.get("username") or current_user.get("id"),
    }
    if payload.status == "published":
        update["published_at"] = now.isoformat()

    await db.testimonials.update_one({"id": testimonial_id}, {"$set": update})
    return {"message": "تم تحديث التقييم", "status": payload.status}


@router.delete("/owner/testimonials/{testimonial_id}")
async def admin_delete_testimonial(
    testimonial_id: str,
    current_user: dict = Depends(_require_owner_or_super),
):
    db = get_db()
    res = await db.testimonials.delete_one({"id": testimonial_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="التقييم غير موجود")
    return {"message": "تم الحذف"}

@router.get("/owner/testimonials/analytics")
async def testimonials_analytics(
    current_user: dict = Depends(_require_owner_or_super),
):
    """تحليلات التقييمات — إجمالي + متوسط التقييم + توزيع النجوم."""
    db = get_db()
    total      = await db.testimonials.count_documents({})
    published  = await db.testimonials.count_documents({"status": "published"})
    pending    = await db.testimonials.count_documents({"status": "pending"})
    rejected   = await db.testimonials.count_documents({"status": "rejected"})

    # Average rating
    pipeline = [
        {"$match": {"status": "published", "rating": {"$exists": True}}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]
    result = await db.testimonials.aggregate(pipeline).to_list(1)
    avg_rating = round(result[0]["avg"], 1) if result else 0

    # Rating distribution
    dist_pipeline = [
        {"$match": {"status": "published"}},
        {"$group": {"_id": "$rating", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    dist = await db.testimonials.aggregate(dist_pipeline).to_list(10)
    rating_distribution = {str(int(d["_id"])): d["count"] for d in dist if d.get("_id")}

    return {
        "total": total,
        "published": published,
        "pending": pending,
        "rejected": rejected,
        "avg_rating": avg_rating,
        "rating_distribution": rating_distribution,
    }
