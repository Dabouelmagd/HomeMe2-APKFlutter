#!/usr/bin/env python3
"""
URGENT: Create Admin User for Production Database
This script creates an admin user directly in the production database.

USAGE:
1. Run this script on the production server where the database is accessible
2. It will create admin user with username: admin, password: admin123
3. User will then be able to login to https://homeme-subscriptions.emergent.host/login

IMPORTANT: This script should be run with the correct MONGO_URL for the production environment.
"""

import asyncio
import uuid
import bcrypt
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys

# Production database configuration
# These should match the production environment
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'homeme_prod')

# Admin user credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"
ADMIN_EMAIL = "admin@homeme.com"
ADMIN_FULL_NAME = "System Administrator"

async def create_production_admin():
    """Create admin user in production database"""
    print("URGENT: Creating Admin User for Production Database")
    print("="*60)
    print(f"Database URL: {MONGO_URL}")
    print(f"Database Name: {DB_NAME}")
    print(f"Admin Username: {ADMIN_USERNAME}")
    print(f"Admin Password: {ADMIN_PASSWORD}")
    print("="*60)
    
    client = None
    try:
        # Connect to database
        print("Connecting to production database...")
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Test connection
        await client.admin.command('ping')
        print("✅ Successfully connected to production database")
        
        # Check if admin user already exists
        existing_admin = await db.users.find_one({"username": ADMIN_USERNAME})
        if existing_admin:
            print(f"✅ Admin user '{ADMIN_USERNAME}' already exists")
            print(f"   User ID: {existing_admin.get('id')}")
            print(f"   Role: {existing_admin.get('role')}")
            print(f"   Compound ID: {existing_admin.get('compound_id')}")
            
            # Verify password hash
            stored_hash = existing_admin.get('password_hash', '')
            if bcrypt.checkpw(ADMIN_PASSWORD.encode('utf-8'), stored_hash.encode('utf-8')):
                print(f"✅ Password verification successful - admin/{ADMIN_PASSWORD} should work")
                return True
            else:
                print(f"❌ Password verification failed - updating password...")
                # Update password
                new_password_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                await db.users.update_one(
                    {"username": ADMIN_USERNAME},
                    {"$set": {"password_hash": new_password_hash}}
                )
                print(f"✅ Password updated successfully")
                return True
        
        # Check if compound exists, create if not
        compound = await db.compounds.find_one({})
        if not compound:
            print("Creating default compound...")
            compound_id = str(uuid.uuid4())
            compound_data = {
                "id": compound_id,
                "name": "HomeMe Compound",
                "address": "Default Address",
                "admin_id": "",  # Will be updated after user creation
                "additional_admins": [],
                "created_at": datetime.utcnow(),
                "settings": {}
            }
            await db.compounds.insert_one(compound_data)
            print(f"✅ Default compound created - ID: {compound_id}")
        else:
            compound_id = compound.get("id")
            print(f"✅ Using existing compound - ID: {compound_id}")
        
        # Create admin user
        print(f"Creating admin user '{ADMIN_USERNAME}'...")
        
        # Hash password
        password_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create admin user
        admin_user_id = str(uuid.uuid4())
        admin_user_data = {
            "id": admin_user_id,
            "username": ADMIN_USERNAME,
            "email": ADMIN_EMAIL,
            "password_hash": password_hash,
            "role": "admin",
            "compound_id": compound_id,
            "family_id": None,
            "full_name": ADMIN_FULL_NAME,
            "phone": "+1234567890",
            "unit_number": None,
            "is_family_head": False,
            "profile_picture_url": None,
            "created_at": datetime.utcnow(),
            "is_active": True
        }
        
        # Insert admin user
        await db.users.insert_one(admin_user_data)
        print(f"✅ Admin user created successfully")
        print(f"   User ID: {admin_user_id}")
        print(f"   Username: {ADMIN_USERNAME}")
        print(f"   Password: {ADMIN_PASSWORD}")
        print(f"   Email: {ADMIN_EMAIL}")
        print(f"   Role: admin")
        print(f"   Compound ID: {compound_id}")
        
        # Update compound with admin_id
        await db.compounds.update_one(
            {"id": compound_id},
            {"$set": {"admin_id": admin_user_id}}
        )
        print(f"✅ Compound updated with admin user")
        
        # Verify creation by trying to find the user
        verification = await db.users.find_one({"username": ADMIN_USERNAME})
        if verification:
            print(f"✅ Verification successful - admin user exists in database")
            
            # Test password hash
            if bcrypt.checkpw(ADMIN_PASSWORD.encode('utf-8'), verification['password_hash'].encode('utf-8')):
                print(f"✅ Password hash verification successful")
            else:
                print(f"❌ Password hash verification failed")
                return False
        else:
            print(f"❌ Verification failed - admin user not found after creation")
            return False
        
        print("\n" + "="*60)
        print("🎉 ADMIN USER CREATION COMPLETED SUCCESSFULLY!")
        print("="*60)
        print("The user can now login with:")
        print(f"   URL: https://homeme-subscriptions.emergent.host/login")
        print(f"   Username: {ADMIN_USERNAME}")
        print(f"   Password: {ADMIN_PASSWORD}")
        print("="*60)
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False
        
    finally:
        if client:
            client.close()

async def verify_admin_creation():
    """Verify admin user was created correctly"""
    print("\n=== Verifying Admin User Creation ===")
    
    client = None
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Find admin user
        admin_user = await db.users.find_one({"username": ADMIN_USERNAME})
        if not admin_user:
            print("❌ Admin user not found")
            return False
        
        print(f"✅ Admin user found:")
        print(f"   ID: {admin_user.get('id')}")
        print(f"   Username: {admin_user.get('username')}")
        print(f"   Email: {admin_user.get('email')}")
        print(f"   Role: {admin_user.get('role')}")
        print(f"   Full Name: {admin_user.get('full_name')}")
        print(f"   Compound ID: {admin_user.get('compound_id')}")
        print(f"   Active: {admin_user.get('is_active')}")
        print(f"   Created: {admin_user.get('created_at')}")
        
        # Verify password
        password_hash = admin_user.get('password_hash')
        if bcrypt.checkpw(ADMIN_PASSWORD.encode('utf-8'), password_hash.encode('utf-8')):
            print(f"✅ Password verification successful")
        else:
            print(f"❌ Password verification failed")
            return False
        
        # Count total users
        total_users = await db.users.count_documents({})
        admin_users = await db.users.count_documents({"role": "admin"})
        print(f"✅ Database stats: {total_users} total users, {admin_users} admin users")
        
        return True
        
    except Exception as e:
        print(f"❌ Verification error: {str(e)}")
        return False
        
    finally:
        if client:
            client.close()

def main():
    """Main execution"""
    print("Starting admin user creation process...")
    
    # Check if we have the required environment variables
    if not MONGO_URL:
        print("❌ ERROR: MONGO_URL environment variable not set")
        print("Please set MONGO_URL to the production MongoDB connection string")
        sys.exit(1)
    
    # Run the creation process
    success = asyncio.run(create_production_admin())
    
    if success:
        # Verify the creation
        verification_success = asyncio.run(verify_admin_creation())
        
        if verification_success:
            print("\n🎉 SUCCESS: Admin user created and verified!")
            print("The user should now be able to login to the production website.")
        else:
            print("\n⚠️ WARNING: Admin user created but verification failed")
            print("Please check the database manually.")
    else:
        print("\n❌ FAILED: Could not create admin user")
        print("Please check the database connection and try again.")

if __name__ == "__main__":
    main()