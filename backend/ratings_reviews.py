from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import uuid
from statistics import mean

from auth import get_current_user
from db import get_database

router = APIRouter(prefix="/api/ratings-reviews", tags=["ratings-reviews"])

class RatingRequest(BaseModel):
    rating: int  # 1-5 stars
    review: Optional[str] = None
    category: str  # maintenance, security, facilities, management, overall
    target_id: Optional[str] = None  # ID of specific item being rated (maintenance request, etc.)
    anonymous: bool = False

class ReviewResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    rating: int
    review: Optional[str]
    category: str
    target_id: Optional[str]
    anonymous: bool
    created_at: datetime
    updated_at: datetime
    helpful_count: int
    reported_count: int

class RatingsSummary(BaseModel):
    category: str
    average_rating: float
    total_reviews: int
    rating_distribution: Dict[str, int]  # "1": count, "2": count, etc.

@router.post("/submit")
async def submit_rating(
    rating_request: RatingRequest,
    current_user = Depends(get_current_user)
):
    """Submit a rating/review"""
    try:
        # Validate rating
        if not 1 <= rating_request.rating <= 5:
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
        
        # Validate category
        valid_categories = ["maintenance", "security", "facilities", "management", "overall", "service"]
        if rating_request.category not in valid_categories:
            raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {valid_categories}")
        
        db = await get_database()
        user_id = current_user.get("id")
        
        # Check if user has already rated this item/category
        existing_rating = await db.ratings_reviews.find_one({
            "user_id": user_id,
            "category": rating_request.category,
            "target_id": rating_request.target_id
        })
        
        rating_id = str(uuid.uuid4())
        
        rating_data = {
            "id": rating_id,
            "user_id": user_id,
            "user_name": "Anonymous" if rating_request.anonymous else current_user.get("full_name", "User"),
            "rating": rating_request.rating,
            "review": rating_request.review,
            "category": rating_request.category,
            "target_id": rating_request.target_id,
            "anonymous": rating_request.anonymous,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "helpful_count": 0,
            "reported_count": 0,
            "status": "active"
        }
        
        if existing_rating:
            # Update existing rating
            await db.ratings_reviews.update_one(
                {"_id": existing_rating["_id"]},
                {"$set": {
                    "rating": rating_request.rating,
                    "review": rating_request.review,
                    "updated_at": datetime.utcnow(),
                    "anonymous": rating_request.anonymous
                }}
            )
            rating_id = existing_rating["id"]
        else:
            # Create new rating
            await db.ratings_reviews.insert_one(rating_data)
        
        return {
            "id": rating_id,
            "message": "Rating submitted successfully",
            "rating": rating_request.rating,
            "category": rating_request.category
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit rating: {str(e)}")

@router.get("/category/{category}")
async def get_category_reviews(
    category: str,
    limit: int = 20,
    skip: int = 0,
    sort_by: str = "created_at"  # created_at, rating, helpful_count
):
    """Get reviews for a specific category"""
    try:
        db = await get_database()
        
        # Validate sort option
        valid_sorts = ["created_at", "rating", "helpful_count"]
        if sort_by not in valid_sorts:
            sort_by = "created_at"
        
        # Build sort direction
        sort_direction = -1  # Descending by default
        if sort_by == "rating":
            sort_direction = -1  # Highest ratings first
        
        # Get reviews
        reviews_cursor = db.ratings_reviews.find(
            {
                "category": category,
                "status": "active"
            },
            {"_id": 0}
        ).sort(sort_by, sort_direction).skip(skip).limit(limit)
        
        reviews = await reviews_cursor.to_list(length=None)
        
        # Get total count
        total_count = await db.ratings_reviews.count_documents({
            "category": category,
            "status": "active"
        })
        
        return {
            "reviews": reviews,
            "total": total_count,
            "has_more": (skip + len(reviews)) < total_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get reviews: {str(e)}")

@router.get("/summary")
async def get_ratings_summary():
    """Get overall ratings summary for all categories"""
    try:
        db = await get_database()
        
        # Get all active ratings grouped by category
        pipeline = [
            {"$match": {"status": "active"}},
            {"$group": {
                "_id": "$category",
                "average_rating": {"$avg": "$rating"},
                "total_reviews": {"$sum": 1},
                "ratings": {"$push": "$rating"}
            }}
        ]
        
        results = await db.ratings_reviews.aggregate(pipeline).to_list(length=None)
        
        summaries = []
        for result in results:
            # Calculate rating distribution
            rating_distribution = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
            for rating in result["ratings"]:
                rating_distribution[str(rating)] += 1
            
            summaries.append({
                "category": result["_id"],
                "average_rating": round(result["average_rating"], 1),
                "total_reviews": result["total_reviews"],
                "rating_distribution": rating_distribution
            })
        
        return {"summaries": summaries}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get ratings summary: {str(e)}")

@router.get("/my-reviews")
async def get_user_reviews(
    current_user = Depends(get_current_user)
):
    """Get current user's reviews"""
    try:
        db = await get_database()
        user_id = current_user.get("id")
        
        reviews_cursor = db.ratings_reviews.find(
            {"user_id": user_id, "status": "active"},
            {"_id": 0}
        ).sort("created_at", -1)
        
        reviews = await reviews_cursor.to_list(length=None)
        
        return {"reviews": reviews}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user reviews: {str(e)}")

@router.post("/helpful/{review_id}")
async def mark_review_helpful(
    review_id: str,
    current_user = Depends(get_current_user)
):
    """Mark a review as helpful"""
    try:
        db = await get_database()
        user_id = current_user.get("id")
        
        # Check if user already marked this as helpful
        helpful_record = await db.review_helpful.find_one({
            "review_id": review_id,
            "user_id": user_id
        })
        
        if helpful_record:
            raise HTTPException(status_code=400, detail="Already marked as helpful")
        
        # Add helpful record
        await db.review_helpful.insert_one({
            "id": str(uuid.uuid4()),
            "review_id": review_id,
            "user_id": user_id,
            "created_at": datetime.utcnow()
        })
        
        # Increment helpful count
        result = await db.ratings_reviews.update_one(
            {"id": review_id},
            {"$inc": {"helpful_count": 1}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Review not found")
        
        return {"message": "Review marked as helpful"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to mark review as helpful: {str(e)}")

@router.post("/report/{review_id}")
async def report_review(
    review_id: str,
    reason: str,
    current_user = Depends(get_current_user)
):
    """Report a review for inappropriate content"""
    try:
        db = await get_database()
        user_id = current_user.get("id")
        
        # Check if user already reported this review
        report_record = await db.review_reports.find_one({
            "review_id": review_id,
            "user_id": user_id
        })
        
        if report_record:
            raise HTTPException(status_code=400, detail="Already reported this review")
        
        # Add report record
        await db.review_reports.insert_one({
            "id": str(uuid.uuid4()),
            "review_id": review_id,
            "user_id": user_id,
            "reason": reason,
            "created_at": datetime.utcnow(),
            "status": "pending"
        })
        
        # Increment report count
        result = await db.ratings_reviews.update_one(
            {"id": review_id},
            {"$inc": {"reported_count": 1}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Review not found")
        
        return {"message": "Review reported successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to report review: {str(e)}")

@router.delete("/review/{review_id}")
async def delete_review(
    review_id: str,
    current_user = Depends(get_current_user)
):
    """Delete user's own review"""
    try:
        db = await get_database()
        user_id = current_user.get("id")
        
        # Only allow user to delete their own reviews or admin to delete any
        query = {"id": review_id}
        if current_user.get("role") != "admin":
            query["user_id"] = user_id
        
        result = await db.ratings_reviews.update_one(
            query,
            {"$set": {"status": "deleted", "updated_at": datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Review not found or not authorized")
        
        return {"message": "Review deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete review: {str(e)}")

@router.get("/admin/reports")
async def get_reported_reviews(
    current_user = Depends(get_current_user)
):
    """Get reported reviews for admin review (Admin only)"""
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        db = await get_database()
        
        # Get reviews with reports
        pipeline = [
            {"$match": {"reported_count": {"$gt": 0}, "status": "active"}},
            {"$sort": {"reported_count": -1, "created_at": -1}}
        ]
        
        reported_reviews = await db.ratings_reviews.aggregate(pipeline).to_list(length=None)
        
        # Get report details for each review
        for review in reported_reviews:
            reports_cursor = db.review_reports.find(
                {"review_id": review["id"]},
                {"_id": 0}
            )
            review["reports"] = await reports_cursor.to_list(length=None)
        
        return {"reported_reviews": reported_reviews}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get reported reviews: {str(e)}")

@router.post("/admin/moderate/{review_id}")
async def moderate_review(
    review_id: str,
    action: str,  # approve, hide, delete
    current_user = Depends(get_current_user)
):
    """Moderate a reported review (Admin only)"""
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        if action not in ["approve", "hide", "delete"]:
            raise HTTPException(status_code=400, detail="Invalid action")
        
        db = await get_database()
        
        # Update review status based on action
        status_map = {
            "approve": "active",
            "hide": "hidden",
            "delete": "deleted"
        }
        
        result = await db.ratings_reviews.update_one(
            {"id": review_id},
            {
                "$set": {
                    "status": status_map[action],
                    "moderated_at": datetime.utcnow(),
                    "moderated_by": current_user.get("id")
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Review not found")
        
        # Update all reports for this review as resolved
        await db.review_reports.update_many(
            {"review_id": review_id},
            {"$set": {"status": "resolved", "resolved_at": datetime.utcnow()}}
        )
        
        return {"message": f"Review {action}d successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to moderate review: {str(e)}")

# Quick rating endpoints for specific services
@router.post("/quick/maintenance/{request_id}")
async def rate_maintenance_quick(
    request_id: str,
    rating: int,
    current_user = Depends(get_current_user)
):
    """Quick rating for maintenance service"""
    rating_request = RatingRequest(
        rating=rating,
        category="maintenance",
        target_id=request_id,
        review=None
    )
    return await submit_rating(rating_request, current_user)

@router.post("/quick/security")
async def rate_security_quick(
    rating: int,
    current_user = Depends(get_current_user)
):
    """Quick rating for security service"""
    rating_request = RatingRequest(
        rating=rating,
        category="security",
        review=None
    )
    return await submit_rating(rating_request, current_user)

@router.get("/stats/dashboard")
async def get_ratings_dashboard():
    """Get ratings dashboard for admin"""
    try:
        db = await get_database()
        
        # Get overall statistics
        total_reviews = await db.ratings_reviews.count_documents({"status": "active"})
        
        # Get average rating across all categories
        avg_pipeline = [
            {"$match": {"status": "active"}},
            {"$group": {"_id": None, "average": {"$avg": "$rating"}}}
        ]
        avg_result = await db.ratings_reviews.aggregate(avg_pipeline).to_list(length=1)
        overall_average = round(avg_result[0]["average"], 1) if avg_result else 0
        
        # Get recent reviews (last 30 days)
        from datetime import timedelta
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_reviews = await db.ratings_reviews.count_documents({
            "status": "active",
            "created_at": {"$gte": thirty_days_ago}
        })
        
        # Get pending reports
        pending_reports = await db.review_reports.count_documents({"status": "pending"})
        
        return {
            "total_reviews": total_reviews,
            "overall_average": overall_average,
            "recent_reviews": recent_reviews,
            "pending_reports": pending_reports
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get ratings dashboard: {str(e)}")