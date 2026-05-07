"""
Search routes - extracted from server.py
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid
import json
import logging
import os

from database import get_db
from auth_deps import get_current_user, require_admin, require_super_admin
from helpers import serialize_datetime
from shared_models import *


router = APIRouter(prefix="/api")

@router.post("/search/messages")
async def search_messages_endpoint(
    search_request: SearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """Search messages with advanced filters"""
    try:
        db = get_db()
        # Perform search
        results = await search_messages(
            current_user.id,
            current_user.compound_id,
            search_request
        )
        
        # Save search to history if query is not empty
        if search_request.query.strip():
            search_history = SearchHistory(
                user_id=current_user.id,
                query=search_request.query,
                search_type=search_request.search_type,
                filters=search_request.dict(exclude={"query", "search_type", "limit", "skip"}),
                results_count=results.get("total_count", 0)
            )
            
            await db.search_history.insert_one(search_history.dict())
        
        return {
            "success": True,
            "results": results
        }
        
    except Exception as e:
        logging.error(f"Error in search endpoint: {e}")
        raise HTTPException(status_code=500, detail="Search failed")

@router.get("/search/suggestions")
async def get_search_suggestions_endpoint(
    query: str,
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get search suggestions"""
    if len(query.strip()) < 2:
        return {"suggestions": []}
    
    suggestions = await get_search_suggestions(
        current_user.id,
        current_user.compound_id,
        query,
        limit
    )
    
    return {"suggestions": suggestions}

@router.get("/search/history")
async def get_search_history(
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get user's search history"""
    try:
        db = get_db()
        history = await db.search_history.find({
            "user_id": current_user.id
        }).sort("created_at", -1).limit(limit).to_list(length=10000)
        
        return {"history": serialize_datetime(history)}
        
    except Exception as e:
        logging.error(f"Error getting search history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get search history")

@router.delete("/search/history")
async def clear_search_history(current_user: dict = Depends(get_current_user)):
    """Clear user's search history"""
    try:
        db = get_db()
        result = await db.search_history.delete_many({"user_id": current_user.id})
        return {"message": f"Cleared {result.deleted_count} search history items"}
        
    except Exception as e:
        logging.error(f"Error clearing search history: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear search history")

@router.delete("/search/history/{history_id}")
async def delete_search_history_item(
    history_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete specific search history item"""
    try:
        db = get_db()
        result = await db.search_history.delete_one({
            "id": history_id,
            "user_id": current_user.id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Search history item not found")
        
        return {"message": "Search history item deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting search history item: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete search history item")

@router.get("/search/saved")
async def get_saved_searches(current_user: dict = Depends(get_current_user)):
    """Get user's saved searches"""
    try:
        db = get_db()
        # current_user is a dict — handle both dict-style and attribute-style for safety
        uid = current_user.get("id") if isinstance(current_user, dict) else getattr(current_user, "id", None)
        saved_searches = await db.saved_searches.find({
            "user_id": uid
        }, {"_id": 0}).sort("updated_at", -1).to_list(length=200)

        return {"saved_searches": serialize_datetime(saved_searches)}

    except Exception as e:
        logging.error(f"Error getting saved searches: {e}")
        raise HTTPException(status_code=500, detail="Failed to get saved searches")

@router.post("/search/saved")
async def save_search(
    save_request: SavedSearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """Save a search for later use"""
    try:
        db = get_db()
        # Check if name already exists
        existing = await db.saved_searches.find_one({
            "user_id": current_user.id,
            "name": save_request.name
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="A search with this name already exists")
        
        saved_search = SavedSearch(
            user_id=current_user.id,
            name=save_request.name,
            query=save_request.query,
            search_type=save_request.search_type,
            filters=save_request.filters
        )
        
        await db.saved_searches.insert_one(saved_search.dict())
        return {"message": "Search saved successfully", "saved_search": serialize_datetime(saved_search.dict())}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error saving search: {e}")
        raise HTTPException(status_code=500, detail="Failed to save search")

@router.put("/search/saved/{search_id}")
async def update_saved_search(
    search_id: str,
    save_request: SavedSearchRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update a saved search"""
    try:
        db = get_db()
        uid = current_user.get("id") if isinstance(current_user, dict) else getattr(current_user, "id", None)
        # Check if search exists and belongs to user
        existing = await db.saved_searches.find_one({
            "id": search_id,
            "user_id": uid
        })
        
        if not existing:
            raise HTTPException(status_code=404, detail="Saved search not found")
        
        # Check if new name conflicts with other searches
        name_conflict = await db.saved_searches.find_one({
            "user_id": uid,
            "name": save_request.name,
            "id": {"$ne": search_id}
        })
        
        if name_conflict:
            raise HTTPException(status_code=400, detail="A search with this name already exists")
        
        # Update search
        update_data = {
            "name": save_request.name,
            "query": save_request.query,
            "search_type": save_request.search_type,
            "filters": save_request.filters,
            "updated_at": datetime.utcnow()
        }
        
        await db.saved_searches.update_one(
            {"id": search_id, "user_id": uid},
            {"$set": update_data}
        )
        
        return {"message": "Saved search updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating saved search: {e}")
        raise HTTPException(status_code=500, detail="Failed to update saved search")

@router.delete("/search/saved/{search_id}")
async def delete_saved_search(
    search_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a saved search"""
    try:
        db = get_db()
        uid = current_user.get("id") if isinstance(current_user, dict) else getattr(current_user, "id", None)
        result = await db.saved_searches.delete_one({
            "id": search_id,
            "user_id": uid
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Saved search not found")
        
        return {"message": "Saved search deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting saved search: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete saved search")

# ============ FILE GALLERY ENDPOINTS ============

