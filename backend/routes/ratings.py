"""
Ratings & Satisfaction routes
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import uuid
import logging

from database import get_db
from auth_deps import get_current_user, require_admin
from helpers import serialize_datetime, notify_compound_admins

router = APIRouter(prefix="/api")


class RatingCreate(BaseModel):
    target_type: str
    target_id: str
    rating: int
    comment: str = ""


@router.post("/ratings")
async def submit_rating(data: RatingCreate, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        if data.rating < 1 or data.rating > 5:
            raise HTTPException(status_code=400, detail="Rating must be 1-5")

        if data.target_type == "maintenance":
            target = await db.maintenance_requests.find_one({"id": data.target_id}, {"_id": 0})
            if not target:
                raise HTTPException(status_code=404, detail="Maintenance request not found")
        elif data.target_type == "service":
            target = await db.service_bookings.find_one({"id": data.target_id}, {"_id": 0})
            if not target:
                raise HTTPException(status_code=404, detail="Service booking not found")
        else:
            raise HTTPException(status_code=400, detail="Invalid target_type")

        existing = await db.ratings.find_one({
            "target_type": data.target_type,
            "target_id": data.target_id,
            "user_id": current_user["id"]
        })
        if existing:
            await db.ratings.update_one(
                {"id": existing["id"]},
                {"$set": {"rating": data.rating, "comment": data.comment, "updated_at": datetime.now(timezone.utc)}}
            )
            return {"message": "تم تحديث التقييم بنجاح", "rating_id": existing["id"]}

        rating_doc = {
            "id": str(uuid.uuid4()),
            "compound_id": current_user["compound_id"],
            "user_id": current_user["id"],
            "user_name": current_user.get("full_name", ""),
            "target_type": data.target_type,
            "target_id": data.target_id,
            "rating": data.rating,
            "comment": data.comment,
            "created_at": datetime.now(timezone.utc)
        }
        await db.ratings.insert_one(rating_doc)

        if data.rating <= 2:
            target_label = "صيانة" if data.target_type == "maintenance" else "خدمة"
            await notify_compound_admins(
                compound_id=current_user["compound_id"],
                title="تنبيه: تقييم سلبي!",
                content=f"تقييم {data.rating}/5 من {current_user.get('full_name', '')} على {target_label}: {data.comment or 'بدون تعليق'}",
                action_type="negative_rating",
                exclude_user_id=current_user["id"]
            )

        all_ratings = await db.ratings.find(
            {"compound_id": current_user["compound_id"]}, {"_id": 0, "rating": 1}
        ).to_list(500)
        if all_ratings:
            avg = sum(r["rating"] for r in all_ratings) / len(all_ratings)
            if avg < 3.0:
                await notify_compound_admins(
                    compound_id=current_user["compound_id"],
                    title="تحذير: انخفاض مستوى الرضا!",
                    content=f"متوسط التقييم العام انخفض إلى {round(avg, 1)} من 5 - يرجى مراجعة جودة الخدمات",
                    action_type="low_satisfaction",
                    exclude_user_id=None
                )

        return {"message": "تم إرسال التقييم بنجاح", "rating_id": rating_doc["id"]}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error submitting rating: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit rating")


@router.get("/ratings/target/{target_type}/{target_id}")
async def get_target_ratings(target_type: str, target_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    try:
        ratings = await db.ratings.find(
            {"target_type": target_type, "target_id": target_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(50)
        avg = sum(r["rating"] for r in ratings) / len(ratings) if ratings else 0
        return {"ratings": serialize_datetime(ratings), "average": round(avg, 1), "count": len(ratings)}
    except Exception as e:
        logging.error(f"Error fetching ratings: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch ratings")


@router.get("/ratings/stats")
async def get_rating_stats(current_user: dict = Depends(require_admin)):
    db = get_db()
    try:
        compound_id = current_user["compound_id"]
        all_ratings = await db.ratings.find({"compound_id": compound_id}, {"_id": 0}).to_list(500)

        if not all_ratings:
            return {
                "overall": {"average": 0, "total": 0, "distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}},
                "maintenance": {"average": 0, "total": 0},
                "service": {"average": 0, "total": 0},
                "monthly_trend": [],
                "recent_negative": []
            }

        total = len(all_ratings)
        avg = round(sum(r["rating"] for r in all_ratings) / total, 1)
        dist = {i: len([r for r in all_ratings if r["rating"] == i]) for i in range(1, 6)}

        maint = [r for r in all_ratings if r.get("target_type") == "maintenance"]
        serv = [r for r in all_ratings if r.get("target_type") == "service"]
        maint_avg = round(sum(r["rating"] for r in maint) / len(maint), 1) if maint else 0
        serv_avg = round(sum(r["rating"] for r in serv) / len(serv), 1) if serv else 0

        monthly = {}
        for r in all_ratings:
            ca = r.get("created_at")
            if hasattr(ca, 'strftime'):
                key = ca.strftime("%Y-%m")
            elif isinstance(ca, str):
                key = ca[:7]
            else:
                continue
            if key not in monthly:
                monthly[key] = {"sum": 0, "count": 0}
            monthly[key]["sum"] += r["rating"]
            monthly[key]["count"] += 1
        trend = [{"month": k, "average": round(v["sum"] / v["count"], 1), "count": v["count"]} for k, v in sorted(monthly.items())]

        negative = sorted([r for r in all_ratings if r["rating"] <= 2], key=lambda x: x.get("created_at", ""), reverse=True)[:10]

        return serialize_datetime({
            "overall": {"average": avg, "total": total, "distribution": dist},
            "maintenance": {"average": maint_avg, "total": len(maint)},
            "service": {"average": serv_avg, "total": len(serv)},
            "monthly_trend": trend,
            "recent_negative": negative
        })
    except Exception as e:
        logging.error(f"Error fetching rating stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch rating stats")
