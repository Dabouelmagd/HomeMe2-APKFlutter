"""Onboarding state — tracks completion of first-time setup wizard."""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone

from database import get_db
from auth_deps import get_current_user

router = APIRouter(prefix="/api")


@router.get("/onboarding/state")
async def get_state(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one(
        {"id": current_user["id"]},
        {"_id": 0, "onboarding_completed": 1, "onboarding_step": 1, "onboarding_dismissed_at": 1, "created_at": 1},
    )
    completed = bool((user or {}).get("onboarding_completed"))
    step = int((user or {}).get("onboarding_step") or 0)
    dismissed = (user or {}).get("onboarding_dismissed_at")
    role = current_user.get("role")
    # Only show wizard for compound-managing roles
    eligible = role in ("admin", "compound_admin", "company_admin")
    return {
        "eligible": eligible,
        "completed": completed,
        "step": step,
        "dismissed_at": dismissed,
        "should_show": eligible and not completed and not dismissed,
        "role": role,
    }


@router.post("/onboarding/advance")
async def advance(payload: dict, current_user: dict = Depends(get_current_user)):
    db = get_db()
    step = int(payload.get("step") or 0)
    completed = bool(payload.get("completed"))
    update = {"onboarding_step": step}
    if completed:
        update["onboarding_completed"] = True
        update["onboarding_completed_at"] = datetime.now(timezone.utc).isoformat()
    await db.users.update_one({"id": current_user["id"]}, {"$set": update})
    return {"success": True, "step": step, "completed": completed}


@router.post("/onboarding/dismiss")
async def dismiss(current_user: dict = Depends(get_current_user)):
    db = get_db()
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"onboarding_dismissed_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"success": True}
