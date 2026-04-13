import sys
sys.path.insert(0, "/app/backend")
"""
Trial Activation routes
"""
from fastapi import APIRouter, HTTPException, Depends, Form, File, UploadFile
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid, json, logging, os

from database import get_db
from auth_deps import get_current_user, require_admin, require_super_admin, hash_password, verify_password, create_access_token, validate_password_strength
from helpers import serialize_datetime
from shared_models import *

router = APIRouter(prefix="/api")


async def get_user_trial_status(user_id, compound_id):
    """Simplified trial status check"""
    db = get_db()
    trial = await db.user_trials.find_one({"user_id": user_id, "compound_id": compound_id, "is_active": True})
    if not trial:
        return {"is_trial": False, "trial_active": False, "days_remaining": 0, "usage": {}, "limits": {}}
    from datetime import datetime
    now = datetime.utcnow()
    end_date = trial.get("end_date", now)
    days_remaining = max(0, (end_date - now).days)
    return {"is_trial": True, "trial_active": days_remaining > 0, "days_remaining": days_remaining, "usage": {}, "limits": trial.get("limits", {})}

async def activate_free_trial(
    current_user: dict = Depends(get_current_user)
):
    """Activate free trial for a user/compound"""
    try:
        db = get_db()
        # Check if user already has an active trial
        existing_trial = await db.user_trials.find_one({
            "user_id": current_user["id"],
            "compound_id": current_user.get("compound_id",""),
            "is_active": True
        })
        
        if existing_trial:
            raise HTTPException(status_code=400, detail="Trial already active for this compound")
        
        # Check if user had a previous trial
        previous_trial = await db.user_trials.find_one({
            "user_id": current_user["id"],
            "compound_id": current_user.get("compound_id","")
        })
        
        if previous_trial:
            raise HTTPException(status_code=400, detail="Trial already used for this compound")
        
        # Create new trial (14 days)
        start_date = datetime.utcnow()
        end_date = start_date + timedelta(days=14)
        
        trial = UserTrial(
            user_id=current_user["id"],
            compound_id=current_user.get("compound_id",""),
            trial_plan_id="free_trial_14_days",
            start_date=start_date,
            end_date=end_date,
            usage_stats={}
        )
        
        await db.user_trials.insert_one(trial.dict())
        
        return {
            "message": "Free trial activated successfully",
            "trial": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "duration_days": 14
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error activating trial: {e}")
        raise HTTPException(status_code=500, detail="Failed to activate trial")

@router.get("/trial/status")
async def get_trial_status(current_user: dict = Depends(get_current_user)):
    """Get current trial status for user"""
    try:
        status = await get_user_trial_status(current_user["id"], current_user.get("compound_id",""))
        return status
        
    except Exception as e:
        logging.error(f"Error getting trial status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get trial status")

@router.post("/trial/check-limit/{feature}")
async def check_trial_limit(
    feature: str,
    current_user: dict = Depends(get_current_user)
):
    """Check if a specific feature is within trial limits"""
    try:
        # Get trial status
        trial_status = await get_user_trial_status(current_user["id"], current_user.get("compound_id",""))
        
        if not trial_status["is_trial"] or not trial_status["trial_active"]:
            return {"allowed": True, "message": "No trial restrictions"}
        
        usage = trial_status["usage"].get(feature, 0)
        limit = trial_status["limits"].get(feature, float('inf'))
        
        allowed = usage < limit
        
        return {
            "allowed": allowed,
            "current_usage": usage,
            "limit": limit,
            "remaining": max(0, limit - usage),
            "message": f"Usage: {usage}/{limit}" if not allowed else "Within limits"
        }
        
    except Exception as e:
        logging.error(f"Error checking trial limit: {e}")
        raise HTTPException(status_code=500, detail="Failed to check trial limit")

# ============ MAINTENANCE REQUEST ENDPOINTS ============

# Maintenance routes extracted to routes/maintenance.py

# Notification routes extracted to routes/notifications.py

# ============ WEBSOCKET ENDPOINTS ============

