"""
Newsletters routes - extracted from server.py
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
import uuid
import json
import logging
import os

from database import get_db
from auth_deps import get_current_user, require_admin
from helpers import serialize_datetime
from newsletter_models import *

router = APIRouter(prefix="/api")

@router.get("/newsletters", response_model=NewsletterResponse)
async def get_newsletters(
    page: int = 1,
    page_size: int = 10,
    category: Optional[NewsletterCategory] = None,
    status: Optional[NewsletterStatus] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get newsletters for the current user's compound"""
    try:
        db = get_db()
        skip = (page - 1) * page_size
        query = {"compound_id": current_user.compound_id}
        
        # Filter by category if specified
        if category:
            query["category"] = category.value
        
        # Filter by status - residents only see published newsletters
        if current_user.role == "resident":
            query["status"] = NewsletterStatus.PUBLISHED.value
        elif status:
            query["status"] = status.value
        
        # Get newsletters with pagination
        newsletters = await db.newsletters.find(query).sort("created_date", -1).skip(skip).limit(page_size).to_list(None)
        total_count = await db.newsletters.count_documents(query)
        total_pages = (total_count + page_size - 1) // page_size
        
        # Convert ObjectIds and serialize dates
        newsletters = serialize_datetime(newsletters)
        
        return NewsletterResponse(
            newsletters=[Newsletter(**newsletter) for newsletter in newsletters],
            total_count=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    
    except Exception as e:
        logging.error(f"Error getting newsletters: {e}")
        raise HTTPException(status_code=500, detail="Failed to get newsletters")

@router.post("/newsletters", response_model=Newsletter)
async def create_newsletter(
    newsletter_data: NewsletterCreate,
    current_user: dict = Depends(require_admin)
):
    """Create a new newsletter (Admin only)"""
    try:
        db = get_db()
        newsletter = Newsletter(
            **newsletter_data.dict(),
            author_id=current_user.id,
            author_name=current_user.full_name,
            compound_id=current_user.compound_id
        )
        
        # Insert into database
        await db.newsletters.insert_one(serialize_datetime(newsletter.dict()))
        
        return newsletter
    
    except Exception as e:
        logging.error(f"Error creating newsletter: {e}")
        raise HTTPException(status_code=500, detail="Failed to create newsletter")

@router.get("/newsletters/stats", response_model=NewsletterStats)
async def get_newsletter_stats(
    current_user: dict = Depends(require_admin)
):
    """Get newsletter statistics (Admin only)"""
    try:
        db = get_db()
        compound_id = current_user.compound_id
        
        # Get basic counts
        total_newsletters = await db.newsletters.count_documents({"compound_id": compound_id})
        published_count = await db.newsletters.count_documents({
            "compound_id": compound_id,
            "status": NewsletterStatus.PUBLISHED.value
        })
        draft_count = await db.newsletters.count_documents({
            "compound_id": compound_id,
            "status": NewsletterStatus.DRAFT.value
        })
        
        # Get total views
        pipeline = [
            {"$match": {"compound_id": compound_id}},
            {"$group": {"_id": None, "total_views": {"$sum": "$views_count"}}}
        ]
        views_result = await db.newsletters.aggregate(pipeline).to_list(None)
        total_views = views_result[0]["total_views"] if views_result else 0
        
        # Get recent newsletters
        recent_newsletters = await db.newsletters.find({
            "compound_id": compound_id
        }).sort("created_date", -1).limit(5).to_list(None)
        
        # Get popular categories
        category_pipeline = [
            {"$match": {"compound_id": compound_id}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        category_result = await db.newsletters.aggregate(category_pipeline).to_list(None)
        popular_categories = {item["_id"]: item["count"] for item in category_result}
        
        return NewsletterStats(
            total_newsletters=total_newsletters,
            published_count=published_count,
            draft_count=draft_count,
            total_views=total_views,
            recent_newsletters=[Newsletter(**serialize_datetime(n)) for n in recent_newsletters],
            popular_categories=popular_categories
        )
    
    except Exception as e:
        logging.error(f"Error getting newsletter stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get newsletter statistics")

@router.get("/newsletters/{newsletter_id}", response_model=Newsletter)
async def get_newsletter(
    newsletter_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific newsletter by ID"""
    try:
        db = get_db()
        newsletter = await db.newsletters.find_one({
            "id": newsletter_id,
            "compound_id": current_user.compound_id
        })
        
        if not newsletter:
            raise HTTPException(status_code=404, detail="Newsletter not found")
        
        # Check access permissions
        if (current_user.role == "resident" and 
            newsletter.get("status") != NewsletterStatus.PUBLISHED.value):
            raise HTTPException(status_code=404, detail="Newsletter not found")
        
        # Increment view count
        await db.newsletters.update_one(
            {"id": newsletter_id},
            {"$inc": {"views_count": 1}}
        )
        
        return Newsletter(**serialize_datetime(newsletter))
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting newsletter: {e}")
        raise HTTPException(status_code=500, detail="Failed to get newsletter")

@router.put("/newsletters/{newsletter_id}", response_model=Newsletter)
async def update_newsletter(
    newsletter_id: str,
    newsletter_update: NewsletterUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update a newsletter (Admin only)"""
    try:
        db = get_db()
        # Find existing newsletter
        existing_newsletter = await db.newsletters.find_one({
            "id": newsletter_id,
            "compound_id": current_user.compound_id
        })
        
        if not existing_newsletter:
            raise HTTPException(status_code=404, detail="Newsletter not found")
        
        # Prepare update data
        update_data = {k: v for k, v in newsletter_update.dict().items() if v is not None}
        update_data["updated_date"] = datetime.now(timezone.utc)
        
        # If publishing, set published_date
        if (newsletter_update.status == NewsletterStatus.PUBLISHED and 
            existing_newsletter.get("status") != NewsletterStatus.PUBLISHED.value):
            update_data["published_date"] = datetime.now(timezone.utc)
        
        # Update in database
        await db.newsletters.update_one(
            {"id": newsletter_id},
            {"$set": serialize_datetime(update_data)}
        )
        
        # Get updated newsletter
        updated_newsletter = await db.newsletters.find_one({"id": newsletter_id})
        return Newsletter(**serialize_datetime(updated_newsletter))
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating newsletter: {e}")
        raise HTTPException(status_code=500, detail="Failed to update newsletter")

@router.delete("/newsletters/{newsletter_id}")
async def delete_newsletter(
    newsletter_id: str,
    current_user: dict = Depends(require_admin)
):
    """Delete a newsletter (Admin only)"""
    try:
        db = get_db()
        # Check if newsletter exists and belongs to user's compound
        newsletter = await db.newsletters.find_one({
            "id": newsletter_id,
            "compound_id": current_user.compound_id
        })
        
        if not newsletter:
            raise HTTPException(status_code=404, detail="Newsletter not found")
        
        # Delete newsletter
        result = await db.newsletters.delete_one({"id": newsletter_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Newsletter not found")
        
        return {"message": "Newsletter deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting newsletter: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete newsletter")

# Include router after all endpoints are defined
# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =============================================================================
# ENTERPRISE COMPANY MANAGEMENT API ENDPOINTS
# =============================================================================
