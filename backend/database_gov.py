"""
GovMe Database Connection — govme.homemeapp.net
Completely separate from HomeMe (homeme DB).
Uses govme-mongo container on port 27019.
"""
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging

GOVME_MONGO_URI = os.getenv(
    "GOVME_MONGODB_URL",
    "mongodb://govme-mongo:27017/govme"
)

_govme_client: AsyncIOMotorClient | None = None

def get_govme_db():
    """Return the govme database instance (lazy init)."""
    global _govme_client
    if _govme_client is None:
        _govme_client = AsyncIOMotorClient(
            GOVME_MONGO_URI,
            serverSelectionTimeoutMS=5000,
        )
        logging.info("[GovMe] Connected to govme MongoDB")
    return _govme_client.govme


async def init_govme_indexes():
    """Create indexes for GovMe collections on startup."""
    db = get_govme_db()
    try:
        # gov_zones
        await db.gov_zones.create_index("id", unique=True)
        await db.gov_zones.create_index("parent_gov_id")
        await db.gov_zones.create_index("type")

        # gov_users (staff + citizens)
        await db.gov_users.create_index("id", unique=True)
        await db.gov_users.create_index("username", unique=True)
        await db.gov_users.create_index("email")
        await db.gov_users.create_index("zone_id")
        await db.gov_users.create_index("role")

        # gov_staff
        await db.gov_staff.create_index("id", unique=True)
        await db.gov_staff.create_index("zone_id")

        # gov_invites
        await db.gov_invites.create_index("code", unique=True)
        await db.gov_invites.create_index("zone_id")
        await db.gov_invites.create_index("expires_at")

        # gov_complaints
        await db.gov_complaints.create_index("zone_id")
        await db.gov_complaints.create_index("status")
        await db.gov_complaints.create_index("created_at")

        # gov_payments
        await db.gov_payments.create_index("zone_id")
        await db.gov_payments.create_index("status")

        # click_throttle (TTL — auto-delete after 1 hour)
        await db.click_throttle.create_index("ts", expireAfterSeconds=3600)

        logging.info("[GovMe] ✅ All indexes created")
    except Exception as e:
        logging.warning(f"[GovMe] Index creation warning: {e}")
