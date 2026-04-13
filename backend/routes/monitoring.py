"""
Monitoring & System Health routes
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import logging

from auth_deps import get_current_user
from monitoring import MonitoringService
from activity_logger import ActivityLogger, ErrorLogger

router = APIRouter()


@router.get("/api/monitoring/stats")
async def get_monitoring_stats(current_user: dict = Depends(get_current_user)):
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Access denied. Admin only.")
        await ActivityLogger.log_activity(action_type="view_monitoring", username=current_user.get("username", ""), details="Accessed monitoring dashboard")
        stats = await MonitoringService.get_system_stats()
        return stats
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting monitoring stats: {e}")
        await ErrorLogger.log_error(error_type="monitoring_error", error_message=str(e), username=current_user.get("username", ""))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/monitoring/activities")
async def get_recent_activities(limit: int = 50, current_user: dict = Depends(get_current_user)):
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Access denied. Admin only.")
        activities = await ActivityLogger.get_recent_activities(limit=limit)
        return {"activities": activities}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting activities: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/monitoring/errors")
async def get_recent_errors(limit: int = 30, current_user: dict = Depends(get_current_user)):
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Access denied. Admin only.")
        errors = await ErrorLogger.get_recent_errors(limit=limit)
        return {"errors": errors}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting error logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/monitoring/charts")
async def get_monitoring_charts(days: int = 7, current_user: dict = Depends(get_current_user)):
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Access denied. Admin only.")
        login_stats = await MonitoringService.get_login_stats(days=days)
        error_stats = await MonitoringService.get_error_stats(days=days)
        user_growth = await MonitoringService.get_user_growth(days=days)
        return {"login_stats": login_stats, "error_stats": error_stats, "user_growth": user_growth}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error getting chart data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/health")
async def health_check():
    try:
        health = await MonitoringService.health_check()
        return health
    except Exception as e:
        return {"status": "unhealthy", "error": str(e), "timestamp": datetime.now(timezone.utc).isoformat()}


@router.post("/api/monitoring/errors/{error_id}/resolve")
async def mark_error_resolved(error_id: str, current_user: dict = Depends(get_current_user)):
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Access denied. Admin only.")
        success = await ErrorLogger.mark_error_resolved(error_id)
        if success:
            await ActivityLogger.log_activity(action_type="resolve_error", username=current_user.get("username", ""), details=f"Marked error {error_id} as resolved")
            return {"success": True, "message": "Error marked as resolved"}
        else:
            raise HTTPException(status_code=404, detail="Error not found")
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error marking error as resolved: {e}")
        raise HTTPException(status_code=500, detail=str(e))
