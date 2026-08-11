"""
Centralized audit logging for HomeMe
Logs: who did what, when, on which compound
"""
from datetime import datetime, timezone
import uuid


async def log_action(
    db,
    action: str,
    user_id: str,
    user_name: str,
    compound_id: str = None,
    target_type: str = None,   # "payment", "resident", "compound", etc.
    target_id: str = None,
    details: dict = None,
    ip: str = None,
):
    """Insert an audit log entry."""
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": action,
        "user_id": user_id,
        "user_name": user_name,
        "compound_id": compound_id,
        "target_type": target_type,
        "target_id": target_id,
        "details": details or {},
        "ip": ip,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


# Action constants
class AuditAction:
    # Auth
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    PASSWORD_CHANGED = "password_changed"
    
    # Financial
    PAYMENT_CONFIRMED = "payment_confirmed"
    PAYMENT_REJECTED = "payment_rejected"
    INVOICE_CREATED = "invoice_created"
    EXPENSE_ADDED = "expense_added"
    REVENUE_ADDED = "revenue_added"
    
    # Residents
    RESIDENT_ADDED = "resident_added"
    RESIDENT_UPDATED = "resident_updated"
    RESIDENT_DELETED = "resident_deleted"
    
    # Compound
    COMPOUND_CREATED = "compound_created"
    COMPOUND_UPDATED = "compound_updated"
    COMPOUND_SETTINGS_CHANGED = "compound_settings_changed"
    
    # Subscriptions
    SUBSCRIPTION_UPGRADED = "subscription_upgraded"
    COUPON_APPLIED = "coupon_applied"
    
    # Workers
    WORKER_APPROVED = "worker_approved"
    WORKER_BLACKLISTED = "worker_blacklisted"
    
    # Admin
    ADMIN_ADDED = "admin_added"
    ROLE_CHANGED = "role_changed"
    DATA_EXPORTED = "data_exported"
