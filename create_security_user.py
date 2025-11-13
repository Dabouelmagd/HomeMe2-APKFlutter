#!/usr/bin/env python3
"""
Script to create a Security user for a compound
Usage: python create_security_user.py
"""

import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import uuid
import os
from datetime import datetime, timezone

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.compound_management

async def create_security_user():
    """Create a security user for a compound"""
    
    print("\n" + "="*60)
    print("🔐 CREATE SECURITY USER")
    print("="*60 + "\n")
    
    # Get compound list
    compounds = await db.compounds.find({}).to_list(None)
    
    if not compounds:
        print("❌ No compounds found! Please create a compound first.")
        return
    
    print("Available Compounds:")
    for idx, compound in enumerate(compounds, 1):
        print(f"{idx}. {compound.get('name', compound.get('compound_name', 'Unknown'))} (ID: {compound.get('id', compound.get('_id'))})")
    
    # Get compound selection
    while True:
        try:
            selection = int(input(f"\nSelect compound (1-{len(compounds)}): "))
            if 1 <= selection <= len(compounds):
                selected_compound = compounds[selection - 1]
                break
            print(f"Please enter a number between 1 and {len(compounds)}")
        except ValueError:
            print("Please enter a valid number")
    
    compound_id = selected_compound.get('id', selected_compound.get('_id'))
    compound_name = selected_compound.get('name', selected_compound.get('compound_name', 'Unknown'))
    
    print(f"\nSelected: {compound_name}")
    
    # Get security user details
    username = input("\nEnter security username (e.g., security_garden): ").strip()
    if not username:
        print("❌ Username cannot be empty")
        return
    
    # Check if username exists
    existing = await db.users.find_one({"username": username})
    if existing:
        print(f"❌ Username '{username}' already exists!")
        return
    
    email = input("Enter security email (e.g., security@garden.com): ").strip()
    if not email:
        email = f"{username}@security.local"
    
    password = input("Enter password (min 6 characters): ").strip()
    if len(password) < 6:
        print("❌ Password must be at least 6 characters")
        return
    
    full_name = input("Enter full name (e.g., Security Guard): ").strip()
    if not full_name:
        full_name = "Security Guard"
    
    # Hash password
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Create security user
    security_user = {
        "id": str(uuid.uuid4()),
        "username": username,
        "email": email,
        "password_hash": password_hash,
        "full_name": full_name,
        "role": "security",
        "compound_id": compound_id,
        "compound_name": compound_name,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Insert user
    await db.users.insert_one(security_user)
    
    print("\n" + "="*60)
    print("✅ SECURITY USER CREATED SUCCESSFULLY!")
    print("="*60)
    print(f"\n📋 Details:")
    print(f"   Username: {username}")
    print(f"   Email: {email}")
    print(f"   Password: {password}")
    print(f"   Role: security")
    print(f"   Compound: {compound_name}")
    print(f"\n🔗 Login URL: https://your-app-url.com/login")
    print(f"\n📱 This security user can:")
    print(f"   ✓ View visitor logs (check-in/out)")
    print(f"   ✓ Receive messages from residents")
    print(f"   ✓ Limited to compound: {compound_name}")
    print("\n" + "="*60 + "\n")

if __name__ == "__main__":
    asyncio.run(create_security_user())
