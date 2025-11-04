#!/usr/bin/env python3
"""
Script to create subscription codes for HomeMe application
Creates codes for 3, 6, 9, 12 months and lifetime subscriptions
"""

import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
import uuid

# Get MongoDB URL from environment
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/homeme_prod')

async def create_subscription_codes():
    """Create subscription codes with different durations"""
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.homeme_prod
    
    print("=" * 60)
    print("🎫 HomeMe Subscription Codes Generator")
    print("=" * 60)
    
    # Define codes to create
    codes_to_create = [
        {
            "code": "PREMIUM-3M",
            "type": "duration",
            "duration_months": 3,
            "max_uses": 100,
            "description": "3 Months Premium Subscription - اشتراك 3 أشهر بريميوم"
        },
        {
            "code": "PREMIUM-6M",
            "type": "duration",
            "duration_months": 6,
            "max_uses": 100,
            "description": "6 Months Premium Subscription - اشتراك 6 أشهر بريميوم"
        },
        {
            "code": "PREMIUM-9M",
            "type": "duration",
            "duration_months": 9,
            "max_uses": 100,
            "description": "9 Months Premium Subscription - اشتراك 9 أشهر بريميوم"
        },
        {
            "code": "PREMIUM-12M",
            "type": "duration",
            "duration_months": 12,
            "max_uses": 100,
            "description": "12 Months Premium Subscription - اشتراك سنة كاملة بريميوم"
        },
        {
            "code": "PREMIUM-LIFETIME",
            "type": "lifetime",
            "duration_months": None,
            "max_uses": 50,
            "description": "Lifetime Premium Subscription - اشتراك دائم لا ينتهي ⭐"
        }
    ]
    
    created_codes = []
    
    for code_data in codes_to_create:
        # Check if code already exists
        existing_code = await db.subscription_codes.find_one({"code": code_data["code"]})
        
        if existing_code:
            print(f"⚠️  Code '{code_data['code']}' already exists - skipping")
            created_codes.append({
                "code": code_data["code"],
                "status": "already_exists",
                "id": existing_code["id"]
            })
            continue
        
        # Create new code
        new_code = {
            "id": str(uuid.uuid4()),
            "code": code_data["code"],
            "type": code_data["type"],
            "duration_months": code_data["duration_months"],
            "discount_percentage": 0,
            "max_uses": code_data["max_uses"],
            "current_uses": 0,
            "is_active": True,
            "created_by": "System",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "description": code_data["description"]
        }
        
        # Insert into database
        await db.subscription_codes.insert_one(new_code)
        
        print(f"✅ Created: {code_data['code']}")
        print(f"   Type: {code_data['type']}")
        if code_data['duration_months']:
            print(f"   Duration: {code_data['duration_months']} months")
        else:
            print(f"   Duration: Lifetime (دائم)")
        print(f"   Max Uses: {code_data['max_uses']}")
        print(f"   Description: {code_data['description']}")
        print()
        
        created_codes.append({
            "code": code_data["code"],
            "status": "created",
            "id": new_code["id"]
        })
    
    print("=" * 60)
    print("📊 Summary:")
    print("=" * 60)
    
    # Get all codes from database
    all_codes = await db.subscription_codes.find().to_list(length=None)
    
    print(f"Total codes in database: {len(all_codes)}")
    print()
    
    print("🎫 Available Subscription Codes:")
    print("-" * 60)
    for code in all_codes:
        status = "🟢 Active" if code.get("is_active") else "🔴 Inactive"
        uses = f"{code.get('current_uses', 0)}/{code.get('max_uses', 0)}"
        
        if code.get('type') == 'lifetime':
            duration = "♾️  Lifetime (دائم)"
        else:
            duration = f"⏱️  {code.get('duration_months')} months"
        
        print(f"Code: {code['code']}")
        print(f"  {duration}")
        print(f"  Status: {status}")
        print(f"  Uses: {uses}")
        print(f"  ID: {code['id']}")
        print()
    
    print("=" * 60)
    print("✅ All subscription codes are ready!")
    print("=" * 60)
    print()
    print("📋 How customers can use these codes:")
    print("1. During registration at /register")
    print("2. Enter code in 'Subscription Code' field")
    print("3. Complete registration")
    print("4. Subscription activated automatically!")
    print()
    print("🔗 Share these codes with your customers:")
    print("-" * 60)
    for code in all_codes:
        print(f"✅ {code['code']}")
    print("-" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_subscription_codes())
