from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
import secrets
import string

# Database connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'homeme_db')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


class SubscriptionCodeManager:
    """Manager for subscription codes system"""
    
    @staticmethod
    def generate_code(length=12):
        """Generate a random subscription code"""
        chars = string.ascii_uppercase + string.digits
        # Avoid confusing characters like O, 0, I, 1
        chars = chars.replace('O', '').replace('0', '').replace('I', '').replace('1', '')
        code = ''.join(secrets.choice(chars) for _ in range(length))
        # Format as XXXX-XXXX-XXXX
        return f"{code[:4]}-{code[4:8]}-{code[8:12]}"
    
    @staticmethod
    async def create_code(
        code_type: str,  # trial, 3_months, 6_months, 9_months, 12_months, discount
        duration_months: int = None,
        discount_percentage: float = None,
        created_by: str = "super_admin",
        max_uses: int = 1,
        expires_at: str = None,
        notes: str = None
    ):
        """
        Create a new subscription code
        
        Args:
            code_type: Type of code (trial, 3_months, 6_months, 9_months, 12_months, discount)
            duration_months: Duration in months for subscription codes
            discount_percentage: Discount percentage for discount codes
            created_by: Username of the creator (must be super_admin)
            max_uses: Maximum number of times the code can be used (default: 1)
            expires_at: Expiration date (ISO format)
            notes: Additional notes about the code
        """
        try:
            # Generate unique code
            code = SubscriptionCodeManager.generate_code()
            
            # Check if code already exists (very unlikely but check anyway)
            existing = await db.subscription_codes.find_one({"code": code})
            while existing:
                code = SubscriptionCodeManager.generate_code()
                existing = await db.subscription_codes.find_one({"code": code})
            
            # Calculate duration in days based on type
            duration_days = 0
            if code_type == "trial":
                duration_days = 30
            elif code_type == "3_months":
                duration_days = 90
            elif code_type == "6_months":
                duration_days = 180
            elif code_type == "9_months":
                duration_days = 270
            elif code_type == "12_months":
                duration_days = 365
            elif duration_months:
                duration_days = duration_months * 30
            
            # Create code document
            code_doc = {
                "code": code,
                "type": code_type,
                "duration_days": duration_days,
                "duration_months": duration_months or (duration_days // 30),
                "discount_percentage": discount_percentage,
                "max_uses": max_uses,
                "times_used": 0,
                "used_by": [],  # List of user IDs who used this code
                "is_active": True,
                "created_by": created_by,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": expires_at,
                "notes": notes
            }
            
            result = await db.subscription_codes.insert_one(code_doc)
            code_doc['_id'] = str(result.inserted_id)
            
            return code_doc
        except Exception as e:
            print(f"Error creating code: {e}")
            return None
    
    @staticmethod
    async def verify_code(code: str, user_id: str = None):
        """
        Verify if a subscription code is valid
        
        Returns:
            dict with status and details, or None if invalid
        """
        try:
            # Find the code
            code_doc = await db.subscription_codes.find_one({"code": code.upper().strip()})
            
            if not code_doc:
                return {"valid": False, "error": "code_not_found"}
            
            # Check if active
            if not code_doc.get("is_active", True):
                return {"valid": False, "error": "code_deactivated"}
            
            # Check if expired
            if code_doc.get("expires_at"):
                expires_at = datetime.fromisoformat(code_doc["expires_at"])
                if expires_at < datetime.now(timezone.utc):
                    return {"valid": False, "error": "code_expired"}
            
            # Check max uses
            times_used = code_doc.get("times_used", 0)
            max_uses = code_doc.get("max_uses", 1)
            if times_used >= max_uses:
                return {"valid": False, "error": "code_max_uses_reached"}
            
            # Check if user already used this code
            if user_id and user_id in code_doc.get("used_by", []):
                return {"valid": False, "error": "code_already_used_by_user"}
            
            return {
                "valid": True,
                "code": code_doc["code"],
                "type": code_doc["type"],
                "duration_days": code_doc.get("duration_days", 0),
                "duration_months": code_doc.get("duration_months", 0),
                "discount_percentage": code_doc.get("discount_percentage"),
                "_id": str(code_doc["_id"])
            }
        except Exception as e:
            print(f"Error verifying code: {e}")
            return {"valid": False, "error": "verification_error"}
    
    @staticmethod
    async def apply_code(code: str, user_id: str, username: str):
        """
        Apply a subscription code to a user's account
        
        Returns:
            dict with success status and subscription details
        """
        try:
            # Verify code first
            verification = await SubscriptionCodeManager.verify_code(code, user_id)
            
            if not verification.get("valid"):
                return {
                    "success": False,
                    "error": verification.get("error", "invalid_code")
                }
            
            # Get code details
            code_doc = await db.subscription_codes.find_one({"code": code.upper().strip()})
            
            # Calculate subscription end date
            duration_days = verification.get("duration_days", 0)
            subscription_end = datetime.now(timezone.utc) + timedelta(days=duration_days)
            
            # Update user's subscription
            user_update = {
                "subscription_active": True,
                "subscription_type": verification.get("type"),
                "subscription_start": datetime.now(timezone.utc).isoformat(),
                "subscription_end": subscription_end.isoformat(),
                "subscription_code_used": code.upper().strip()
            }
            
            await db.users.update_one(
                {"id": user_id},
                {"$set": user_update}
            )
            
            # Mark code as used
            await db.subscription_codes.update_one(
                {"code": code.upper().strip()},
                {
                    "$inc": {"times_used": 1},
                    "$push": {
                        "used_by": {
                            "user_id": user_id,
                            "username": username,
                            "used_at": datetime.now(timezone.utc).isoformat()
                        }
                    }
                }
            )
            
            return {
                "success": True,
                "subscription_type": verification.get("type"),
                "duration_days": duration_days,
                "subscription_end": subscription_end.isoformat(),
                "discount_percentage": verification.get("discount_percentage")
            }
        except Exception as e:
            print(f"Error applying code: {e}")
            return {"success": False, "error": "application_error"}
    
    @staticmethod
    async def get_all_codes(include_inactive=False):
        """Get all subscription codes"""
        try:
            query = {} if include_inactive else {"is_active": True}
            codes = await db.subscription_codes.find(query).sort("created_at", -1).to_list(length=None)
            
            # Convert ObjectId to string
            for code in codes:
                if '_id' in code:
                    code['_id'] = str(code['_id'])
            
            return codes
        except Exception as e:
            print(f"Error getting codes: {e}")
            return []
    
    @staticmethod
    async def deactivate_code(code: str):
        """Deactivate a subscription code"""
        try:
            result = await db.subscription_codes.update_one(
                {"code": code.upper().strip()},
                {"$set": {"is_active": False}}
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"Error deactivating code: {e}")
            return False
    
    @staticmethod
    async def delete_code(code: str):
        """Delete a subscription code"""
        try:
            result = await db.subscription_codes.delete_one({"code": code.upper().strip()})
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting code: {e}")
            return False
