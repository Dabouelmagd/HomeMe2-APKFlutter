from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Database connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'homeme_db')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

class ActivityLogger:
    """Activity logging system for monitoring user actions"""
    
    @staticmethod
    async def log_activity(
        action_type: str,
        username: str,
        details: str = "",
        ip_address: str = None,
        status: str = "success"
    ):
        """
        Log user activity to database
        
        Args:
            action_type: Type of action (login, logout, create_user, delete_user, etc.)
            username: Username performing the action
            details: Additional details about the action
            ip_address: IP address of the user (optional)
            status: Status of the action (success, failed, error)
        """
        try:
            activity_log = {
                "action_type": action_type,
                "username": username,
                "details": details,
                "ip_address": ip_address,
                "status": status,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            await db.activity_logs.insert_one(activity_log)
            return True
        except Exception as e:
            print(f"Failed to log activity: {e}")
            return False
    
    @staticmethod
    async def get_recent_activities(limit: int = 50):
        """Get recent activities from database"""
        try:
            activities = await db.activity_logs.find().sort("timestamp", -1).limit(limit).to_list(length=limit)
            
            # Convert ObjectId to string for JSON serialization
            for activity in activities:
                if '_id' in activity:
                    activity['_id'] = str(activity['_id'])
            
            return activities
        except Exception as e:
            print(f"Failed to get activities: {e}")
            return []
    
    @staticmethod
    async def get_activities_by_date(days: int = 7):
        """Get activities grouped by date for the last N days"""
        try:
            from datetime import timedelta
            
            # Calculate date range
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=days)
            
            # Query activities
            activities = await db.activity_logs.find({
                "timestamp": {"$gte": start_date.isoformat()}
            }).to_list(length=None)
            
            # Group by date
            activities_by_date = {}
            for activity in activities:
                date_str = activity['timestamp'][:10]  # Get YYYY-MM-DD
                if date_str not in activities_by_date:
                    activities_by_date[date_str] = 0
                activities_by_date[date_str] += 1
            
            return activities_by_date
        except Exception as e:
            print(f"Failed to get activities by date: {e}")
            return {}
    
    @staticmethod
    async def clear_old_logs(days: int = 30):
        """Clear activity logs older than N days"""
        try:
            from datetime import timedelta
            
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            result = await db.activity_logs.delete_many({
                "timestamp": {"$lt": cutoff_date.isoformat()}
            })
            
            return result.deleted_count
        except Exception as e:
            print(f"Failed to clear old logs: {e}")
            return 0


class ErrorLogger:
    """Error logging system for monitoring system errors"""
    
    @staticmethod
    async def log_error(
        error_type: str,
        error_message: str,
        username: str = "system",
        stack_trace: str = None,
        severity: str = "error"
    ):
        """
        Log system error to database
        
        Args:
            error_type: Type of error (database_error, api_error, auth_error, etc.)
            error_message: Error message
            username: Username affected by the error
            stack_trace: Full stack trace (optional)
            severity: Severity level (info, warning, error, critical)
        """
        try:
            error_log = {
                "error_type": error_type,
                "error_message": error_message,
                "username": username,
                "stack_trace": stack_trace,
                "severity": severity,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "resolved": False
            }
            
            await db.error_logs.insert_one(error_log)
            return True
        except Exception as e:
            print(f"Failed to log error: {e}")
            return False
    
    @staticmethod
    async def get_recent_errors(limit: int = 30):
        """Get recent errors from database"""
        try:
            errors = await db.error_logs.find().sort("timestamp", -1).limit(limit).to_list(length=limit)
            
            # Convert ObjectId to string
            for error in errors:
                if '_id' in error:
                    error['_id'] = str(error['_id'])
            
            return errors
        except Exception as e:
            print(f"Failed to get errors: {e}")
            return []
    
    @staticmethod
    async def get_errors_by_date(days: int = 7):
        """Get errors grouped by date for the last N days"""
        try:
            from datetime import timedelta
            
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=days)
            
            errors = await db.error_logs.find({
                "timestamp": {"$gte": start_date.isoformat()}
            }).to_list(length=None)
            
            # Group by date
            errors_by_date = {}
            for error in errors:
                date_str = error['timestamp'][:10]
                if date_str not in errors_by_date:
                    errors_by_date[date_str] = 0
                errors_by_date[date_str] += 1
            
            return errors_by_date
        except Exception as e:
            print(f"Failed to get errors by date: {e}")
            return {}
    
    @staticmethod
    async def mark_error_resolved(error_id: str):
        """Mark an error as resolved"""
        try:
            from bson import ObjectId
            result = await db.error_logs.update_one(
                {"_id": ObjectId(error_id)},
                {"$set": {"resolved": True, "resolved_at": datetime.now(timezone.utc).isoformat()}}
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"Failed to mark error as resolved: {e}")
            return False
