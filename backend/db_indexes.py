"""
Ensure MongoDB indexes exist on hot collections for PDF reports & general performance.
Idempotent — safe to run on every startup. Called from server startup.
"""
import logging
from database import get_db

logger = logging.getLogger(__name__)


async def ensure_indexes():
    # Make sure DB module is initialized (idempotent)
    from database import init_db
    db = get_db()
    if db is None:
        try:
            init_db()
            db = get_db()
        except Exception as e:
            logger.warning(f"ensure_indexes init_db failed: {e}")
            return 0
    if db is None:
        logger.warning("ensure_indexes: db still None")
        return 0

    plans = [
        # Resident charges — used by unit statement & invoices reports
        ("resident_charges", [("resident_id", 1), ("due_date", 1)]),
        ("resident_charges", [("compound_id", 1), ("created_at", 1)]),
        ("resident_charges", [("compound_id", 1), ("due_date", 1)]),
        ("resident_charges", [("status", 1)]),

        # Resident payments — used by unit statement & summary
        ("resident_payments", [("resident_id", 1), ("payment_date", 1)]),
        ("resident_payments", [("compound_id", 1), ("created_at", 1)]),
        ("resident_payments", [("compound_id", 1), ("payment_date", 1)]),

        # Expenses — summary report
        ("expenses", [("compound_id", 1), ("date", 1)]),

        # Operations — summary report
        ("maintenance_requests", [("compound_id", 1), ("created_at", 1)]),
        ("complaints", [("compound_id", 1), ("created_at", 1)]),
        ("service_bookings", [("compound_id", 1), ("created_at", 1)]),
        ("visitor_passes", [("compound_id", 1), ("created_at", 1)]),

        # Users — used everywhere
        ("users", [("compound_id", 1), ("role", 1)]),
        ("users", [("family_id", 1)]),
        # 🔑 Critical for /api/auth/login speed — eliminates collection scan
        ("users", [("username", 1)]),
        ("users", [("email", 1)]),

        # Saved searches — used in /api/search/saved
        ("saved_searches", [("user_id", 1), ("updated_at", -1)]),

        # Audit logs — admin queries
        ("audit_logs", [("timestamp", -1)]),
        ("audit_logs", [("user_id", 1), ("timestamp", -1)]),

        # Notifications — frequent reads
        ("notifications", [("recipient_ids", 1), ("created_at", -1)]),

        # Report runs (created below) — for monthly auto-scheduler
        ("report_runs", [("month", 1), ("kind", 1)]),

        # SMTP health
        ("smtp_health", [("timestamp", -1)]),
        ("smtp_health", [("success", 1), ("timestamp", -1)]),
        ("smtp_health", [("mailbox", 1), ("timestamp", -1)]),

        # SMTP alerts dedupe
        ("smtp_alerts", [("timestamp", -1)]),

        # Feature #47 — login_attempts: rate-limit query is on (username, success, created_at)
        ("login_attempts", [("username", 1), ("success", 1), ("created_at", -1)]),
        ("login_attempts", [("ip", 1), ("created_at", -1)]),
        ("login_attempts", [("success", 1), ("created_at", -1)]),

        # Feature #53 — banned_ips: login lookup is on (ip, active, expires_at)
        ("banned_ips", [("ip", 1), ("active", 1), ("expires_at", 1)]),
        ("banned_ips", [("active", 1), ("expires_at", -1)]),

        # Iter151 — Performance: indexes for top-5 slowest endpoints
        # Companies & compounds linkage lookups
        ("companies", [("id", 1)]),
        ("companies", [("admin_user_id", 1)]),
        ("compounds", [("id", 1)]),
        ("compounds", [("company_id", 1)]),
        ("compounds", [("management_company_id", 1)]),
        # user_subscriptions / company_subscriptions lookups
        ("user_subscriptions", [("user_id", 1)]),
        ("user_subscriptions", [("end_date", 1)]),
        ("company_subscriptions", [("company_id", 1)]),
        # Analytics dashboard hot paths — compound_id+created_at compound indexes already exist;
        # add status+compound for maintenance_requests pending filter
        ("maintenance_requests", [("compound_id", 1), ("status", 1)]),
        # resident_payments aggregation needs created_at index alone for global scope
        ("resident_payments", [("created_at", -1)]),
        ("resident_charges", [("compound_id", 1), ("status", 1)]),
        ("expenses", [("compound_id", 1), ("created_at", 1)]),
        # Users last_login for engagement metric
        ("users", [("last_login", -1)]),
        ("users", [("created_at", 1)]),
        # Activity logs for analytics activity_trend
        ("activity_logs", [("timestamp", -1)]),
        ("activity_logs", [("compound_id", 1), ("timestamp", -1)]),
        # Revenue collection used by analytics monthly_comparison
        ("revenue", [("compound_id", 1), ("date", 1)]),
        ("revenue", [("date", 1)]),
        # internal_ads for ads dashboard
        ("internal_ads", [("is_active", 1)]),
    ]

    created = 0
    for coll, keys in plans:
        try:
            await db[coll].create_index(keys, background=True)
            created += 1
        except Exception as e:
            logger.warning(f"index {coll} {keys} failed: {e}")
    logger.info(f"ensure_indexes: applied {created}/{len(plans)} indexes")
    return created
