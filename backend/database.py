"""
Shared database module for HomeMe backend.
All route modules import get_db() from here.
"""
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

_client = None
_db = None


def init_db():
    """Initialize database connection. Called once during app startup."""
    global _client, _db
    _client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    _db = _client[os.environ['DB_NAME']]
    return _client, _db


def get_db():
    """Get the shared database reference."""
    return _db


def get_client():
    """Get the shared MongoDB client."""
    return _client
