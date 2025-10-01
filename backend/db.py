"""
Database connection module for HomeMe backend
"""
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

# Global database connection
client = None
db = None

async def get_database():
    """Get database connection"""
    global client, db
    if client is None:
        client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
        db = client[os.environ.get('DB_NAME', 'test_database')]
    return db

def get_database_sync():
    """Get database connection synchronously"""
    global client, db
    if client is None:
        client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
        db = client[os.environ.get('DB_NAME', 'test_database')]
    return db