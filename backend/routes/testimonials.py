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
