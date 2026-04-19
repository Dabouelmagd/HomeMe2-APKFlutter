"""
Polls & Voting routes - extracted from server.py
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
from document_models import *

router = APIRouter(prefix="/api")

@router.get("/polls")
async def get_polls(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get polls with filtering"""
    try:
        db = get_db()
        query = {"compound_id": current_user.compound_id}
        
        if status:
            query["status"] = status
        
        polls = await db.polls.find(query).sort("created_at", -1).to_list(length=10000)
        
        # Check user voting eligibility and status for each poll
        enhanced_polls = []
        for poll in polls:
            # Check if user is eligible to vote
            eligible = True
            if poll.get("eligible_families") and current_user.family_id not in poll.get("eligible_families", []):
                eligible = False
            if poll.get("eligible_users") and current_user.id not in poll.get("eligible_users", []):
                eligible = False
            if poll.get("require_family_head_only", True) and not current_user.is_family_head:
                eligible = False
            
            # Check if user has already voted
            existing_vote = await db.votes.find_one({
                "poll_id": poll["id"],
                "user_id": current_user.id
            })
            
            poll_data = serialize_datetime(poll)
            poll_data["user_eligible"] = eligible
            poll_data["user_has_voted"] = existing_vote is not None
            
            enhanced_polls.append(poll_data)
        
        return {"polls": enhanced_polls}
        
    except Exception as e:
        logging.error(f"Error getting polls: {e}")
        raise HTTPException(status_code=500, detail="Failed to get polls")

@router.post("/polls")
async def create_poll(
    poll_data: PollCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new poll (admin only)"""
    try:
        db = get_db()
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Convert options to PollOption objects
        options = []
        for i, option_data in enumerate(poll_data.options):
            option = PollOption(
                text=option_data["text"],
                description=option_data.get("description"),
                image_url=option_data.get("image_url"),
                sort_order=i
            )
            options.append(option)
        
        # Calculate total eligible voters
        if poll_data.eligible_families:
            eligible_count = await db.families.count_documents({
                "compound_id": current_user.compound_id,
                "id": {"$in": poll_data.eligible_families}
            })
        else:
            # All families in compound
            eligible_count = await db.families.count_documents({
                "compound_id": current_user.compound_id
            })
        
        poll = Poll(
            **poll_data.dict(exclude={"options"}),
            compound_id=current_user.compound_id,
            options=options,
            total_eligible_voters=eligible_count,
            created_by=current_user.id,
            updated_by=current_user.id
        )
        
        poll_dict = serialize_datetime(poll.dict())
        await db.polls.insert_one(poll_dict)
        
        return {"message": "Poll created successfully", "poll_id": poll.id}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating poll: {e}")
        raise HTTPException(status_code=500, detail="Failed to create poll")

@router.post("/polls/{poll_id}/vote")
async def submit_vote(
    poll_id: str,
    vote_data: VoteCreate,
    current_user: dict = Depends(get_current_user)
):
    """Submit a vote for a poll"""
    try:
        db = get_db()
        # Get poll
        poll = await db.polls.find_one({
            "id": poll_id,
            "compound_id": current_user.compound_id,
            "status": "active"
        })
        
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found or not active")
        
        # Check if poll is still open
        if datetime.utcnow() > poll["end_date"]:
            raise HTTPException(status_code=400, detail="Poll has ended")
        
        # Check eligibility
        if poll.get("require_family_head_only", True) and not current_user.is_family_head:
            raise HTTPException(status_code=403, detail="Only family heads can vote")
        
        if poll.get("eligible_families") and current_user.family_id not in poll.get("eligible_families", []):
            raise HTTPException(status_code=403, detail="You are not eligible to vote in this poll")
        
        # Check if already voted
        existing_vote = await db.votes.find_one({
            "poll_id": poll_id,
            "user_id": current_user.id
        })
        
        if existing_vote and not poll.get("allow_vote_change", False):
            raise HTTPException(status_code=400, detail="You have already voted in this poll")
        
        # Validate vote data based on poll type
        if poll["vote_type"] == "single_choice" and len(vote_data.selected_options) != 1:
            raise HTTPException(status_code=400, detail="Single choice polls require exactly one selection")
        
        if poll["vote_type"] == "multiple_choice":
            max_selections = poll.get("max_selections", len(poll["options"]))
            if len(vote_data.selected_options) > max_selections:
                raise HTTPException(status_code=400, detail=f"Too many selections. Maximum allowed: {max_selections}")
        
        # Create or update vote
        vote = Vote(
            **vote_data.dict(),
            poll_id=poll_id,
            user_id=current_user.id,
            family_id=current_user.family_id,
            unit_number=current_user.unit_number
        )
        
        if existing_vote:
            # Update existing vote
            await db.votes.update_one(
                {"poll_id": poll_id, "user_id": current_user.id},
                {"$set": serialize_datetime(vote.dict())}
            )
        else:
            # Insert new vote
            await db.votes.insert_one(serialize_datetime(vote.dict()))
            
            # Update poll vote count
            await db.polls.update_one(
                {"id": poll_id},
                {"$inc": {"total_votes": 1}}
            )
        
        # Update option vote counts
        for option_id in vote_data.selected_options:
            await db.polls.update_one(
                {"id": poll_id, "options.id": option_id},
                {"$inc": {"options.$.vote_count": 1}}
            )
        
        return {"message": "Vote submitted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error submitting vote: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit vote")

@router.get("/polls/{poll_id}/results")
async def get_poll_results(
    poll_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get poll results"""
    try:
        db = get_db()
        poll = await db.polls.find_one({
            "id": poll_id,
            "compound_id": current_user.compound_id
        })
        
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found")
        
        # Check if results are visible
        if not poll.get("results_visible_before_end", False) and poll["status"] == "active":
            if current_user.role != "admin":
                raise HTTPException(status_code=403, detail="Results not yet available")
        
        # Get vote statistics
        votes = await db.votes.find({"poll_id": poll_id}).to_list(length=10000)
        
        # Calculate participation rate
        participation_rate = (len(votes) / poll["total_eligible_voters"]) * 100 if poll["total_eligible_voters"] > 0 else 0
        
        # Prepare results
        results = {
            "poll": serialize_datetime(poll),
            "total_votes": len(votes),
            "participation_rate": round(participation_rate, 2),
            "votes": [serialize_datetime(vote) for vote in votes] if current_user.role == "admin" else []
        }
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting poll results: {e}")
        raise HTTPException(status_code=500, detail="Failed to get poll results")

@router.get("/polls/stats")
async def get_polls_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get polls statistics"""
    try:
        db = get_db()
        # Get compound filter
        compound_filter = {"compound_id": current_user.compound_id} if current_user.compound_id else {}
        
        # Count polls by status
        active_polls = await db.polls.count_documents({**compound_filter, "status": "active"})
        completed_polls = await db.polls.count_documents({**compound_filter, "status": "ended"})
        draft_polls = await db.polls.count_documents({**compound_filter, "status": "draft"})
        cancelled_polls = await db.polls.count_documents({**compound_filter, "status": "cancelled"})
        
        # Get all votes for compound polls
        compound_polls = await db.polls.find(compound_filter).to_list(length=10000)
        poll_ids = [poll["id"] for poll in compound_polls]
        
        total_votes = await db.votes.count_documents({"poll_id": {"$in": poll_ids}}) if poll_ids else 0
        
        # Calculate participation rate
        total_eligible_voters = sum(poll.get("total_eligible_voters", 0) for poll in compound_polls)
        participation_rate = round((total_votes / total_eligible_voters * 100), 2) if total_eligible_voters > 0 else 0
        
        stats = {
            "active_polls": active_polls,
            "completed_polls": completed_polls,
            "draft_polls": draft_polls,
            "cancelled_polls": cancelled_polls,
            "total_polls": active_polls + completed_polls + draft_polls + cancelled_polls,
            "total_votes": total_votes,
            "participation_rate": participation_rate,
            "total_eligible_voters": total_eligible_voters
        }
        
        return {"stats": stats}
        
    except Exception as e:
        logging.error(f"Error getting polls stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get polls stats")

# ============ PHASE 3: SMART HOME INTEGRATION ENDPOINTS ============
