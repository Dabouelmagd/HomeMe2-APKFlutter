from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import time

# Database connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'homeme_db')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# System start time for uptime calculation
SYSTEM_START_TIME = time.time()


class MonitoringService:
    """Service for monitoring system health and statistics"""
    
    @staticmethod
    async def get_system_stats():
        """Get comprehensive system statistics"""
        try:
            # User statistics
            total_users = await db.users.count_documents({})
            active_users = await db.users.count_documents({"is_active": True})
            admin_users = await db.users.count_documents({"role": "admin"})
            resident_users = await db.users.count_documents({"role": "resident"})
            
            # Compound statistics
            total_compounds = await db.compounds.count_documents({})
            total_units = await db.residences.count_documents({})
            
            # Recent logins (last 24 hours)
            yesterday = datetime.now(timezone.utc) - timedelta(days=1)
            logins_today = await db.activity_logs.count_documents({
                "action_type": "login",
                "status": "success",
                "timestamp": {"$gte": yesterday.isoformat()}
            })
            
            # Recent logins (last 7 days)
            last_week = datetime.now(timezone.utc) - timedelta(days=7)
            logins_week = await db.activity_logs.count_documents({
                "action_type": "login",
                "status": "success",
                "timestamp": {"$gte": last_week.isoformat()}
            })
            
            # Database connection status
            try:
                await db.command('ping')
                db_status = "connected"
            except:
                db_status = "disconnected"
            
            # System uptime
            uptime_seconds = time.time() - SYSTEM_START_TIME
            uptime_hours = uptime_seconds / 3600
            uptime_days = uptime_hours / 24
            
            # Format uptime
            if uptime_days >= 1:
                uptime_str = f"{int(uptime_days)} days"
            elif uptime_hours >= 1:
                uptime_str = f"{int(uptime_hours)} hours"
            else:
                uptime_str = f"{int(uptime_seconds / 60)} minutes"
            
            return {
                "users": {
                    "total": total_users,
                    "active": active_users,
                    "admins": admin_users,
                    "residents": resident_users,
                    "inactive": total_users - active_users
                },
                "compounds": {
                    "total": total_compounds,
                    "total_units": total_units
                },
                "activity": {
                    "logins_today": logins_today,
                    "logins_week": logins_week
                },
                "system": {
                    "database_status": db_status,
                    "uptime": uptime_str,
                    "uptime_seconds": int(uptime_seconds),
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }
            }
        except Exception as e:
            print(f"Error getting system stats: {e}")
            return {
                "error": str(e),
                "users": {"total": 0, "active": 0, "admins": 0, "residents": 0},
                "compounds": {"total": 0, "total_units": 0},
                "activity": {"logins_today": 0, "logins_week": 0},
                "system": {
                    "database_status": "error",
                    "uptime": "unknown",
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }
            }
    
    @staticmethod
    async def get_user_growth(days: int = 7):
        """Get user registration growth over the last N days"""
        try:
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=days)
            
            # Get users created in the date range
            users = await db.users.find({
                "created_at": {"$gte": start_date.isoformat()}
            }).to_list(length=None)
            
            # Group by date
            growth_by_date = {}
            for user in users:
                if 'created_at' in user:
                    date_str = user['created_at'][:10]
                    if date_str not in growth_by_date:
                        growth_by_date[date_str] = 0
                    growth_by_date[date_str] += 1
            
            return growth_by_date
        except Exception as e:
            print(f"Error getting user growth: {e}")
            return {}
    
    @staticmethod
    async def get_login_stats(days: int = 7):
        """Get login statistics for the last N days"""
        try:
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=days)
            
            # Get successful logins
            logins = await db.activity_logs.find({
                "action_type": "login",
                "status": "success",
                "timestamp": {"$gte": start_date.isoformat()}
            }).to_list(length=None)
            
            # Group by date
            logins_by_date = {}
            for login in logins:
                date_str = login['timestamp'][:10]
                if date_str not in logins_by_date:
                    logins_by_date[date_str] = 0
                logins_by_date[date_str] += 1
            
            return logins_by_date
        except Exception as e:
            print(f"Error getting login stats: {e}")
            return {}
    
    @staticmethod
    async def get_error_stats(days: int = 7):
        """Get error statistics for the last N days"""
        try:
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=days)
            
            errors = await db.error_logs.find({
                "timestamp": {"$gte": start_date.isoformat()}
            }).to_list(length=None)
            
            # Group by date and severity
            errors_by_date = {}
            errors_by_severity = {"info": 0, "warning": 0, "error": 0, "critical": 0}
            
            for error in errors:
                # By date
                date_str = error['timestamp'][:10]
                if date_str not in errors_by_date:
                    errors_by_date[date_str] = 0
                errors_by_date[date_str] += 1
                
                # By severity
                severity = error.get('severity', 'error')
                if severity in errors_by_severity:
                    errors_by_severity[severity] += 1
            
            return {
                "by_date": errors_by_date,
                "by_severity": errors_by_severity,
                "total": len(errors)
            }
        except Exception as e:
            print(f"Error getting error stats: {e}")
            return {"by_date": {}, "by_severity": {}, "total": 0}
    
    @staticmethod
    async def health_check():
        """Perform system health check"""
        try:
            # Check database connection
            await db.command('ping')
            db_healthy = True
        except:
            db_healthy = False
        
        # Check collections exist
        collections = await db.list_collection_names()
        required_collections = ['users', 'compounds', 'residences', 'activity_logs', 'error_logs']
        collections_healthy = all(col in collections for col in required_collections)
        
        overall_status = "healthy" if (db_healthy and collections_healthy) else "unhealthy"
        
        return {
            "status": overall_status,
            "database": "connected" if db_healthy else "disconnected",
            "collections": "ok" if collections_healthy else "missing",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
