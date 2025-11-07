#!/usr/bin/env python3
"""
Script to create Super Admin account
Run this once to create the super admin account
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
import uuid
from datetime import datetime, timezone

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Database connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/homeme_prod')

async def create_super_admin():
    """Create Super Admin account"""
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.homeme_prod  # Use homeme_prod database directly
    
    # Super Admin details
    email = "dalia.abouelmagd@gmail.com"
    username = "dalia"  # Changed to dalia as confirmed
    password = "Admin2024!"  # New simple password
    
    # Check if user already exists
    existing = await db.users.find_one({"email": email})
    if existing:
        print(f"✓ Super Admin account already exists!")
        print(f"Email: {email}")
        print(f"Username: {existing.get('username')}")
        print("\nIf you forgot the password, you can reset it in the database.")
        return
    
    # Hash password
    password_hash = pwd_context.hash(password)
    
    # Create super admin user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "username": username,
        "email": email,
        "password_hash": password_hash,
        "role": "admin",
        "compound_id": "super_admin",
        "full_name": "Dalia Abouelmagd",
        "phone": "",
        "is_active": True,
        "is_family_head": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "subscription_active": True,
        "subscription_type": "lifetime",
        "subscription_start": datetime.now(timezone.utc).isoformat(),
        "subscription_end": "2099-12-31T23:59:59+00:00"
    }
    
    await db.users.insert_one(user_doc)
    
    print("=" * 60)
    print("✅ SUPER ADMIN ACCOUNT CREATED SUCCESSFULLY!")
    print("=" * 60)
    print(f"\n🔐 Login Credentials:")
    print(f"   Email:    {email}")
    print(f"   Username: {username}")
    print(f"   Password: {password}")
    print("\n⚠️  IMPORTANT: Please change this password after first login!")
    print("\n📍 Login URL: https://payment-methods-ui.preview.emergentagent.com/login")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_super_admin())
