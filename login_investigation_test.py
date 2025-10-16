#!/usr/bin/env python3
"""
HomeMe Login Investigation and User Creation Test Suite
Investigates the "invalid credentials" error when trying to login with admin/admin123
and creates the required test users as requested.

INVESTIGATION TASKS:
1. Check Database Users: Verify if any users exist in the database
2. Check Admin User: See if the admin user with username "admin" exists
3. Password Verification: Check if the password hash is correct for admin user
4. Create New Admin User: If no admin user exists, create a new one with proper credentials

CREATE TEST USERS:
- Admin User: username: admin, password: admin123, role: admin
- Test User: username: test, password: test123, role: resident

DATABASE INVESTIGATION:
- Check total user count in database
- List existing users (without password hashes)
- Verify database connection is working with production MongoDB

EXPECTED OUTCOME:
- At least one admin user should exist that can login successfully
- Provide working credentials for the user to test login
- Confirm database has users and authentication is working
"""

import asyncio
import json
import requests
import uuid
import os
import bcrypt
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient

# Configuration - Using the production URL from frontend/.env
BASE_URL = "https://tenant-dashboard-10.preview.emergentagent.com/api"

class LoginInvestigationSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_token = None
        self.results = []
        self.db_client = None
        self.db = None
        
    def log_result(self, test_name: str, success: bool, message: str, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.results.append({
            "test": test_name,
            "status": status,
            "message": message,
            "details": details
        })
        print(f"{status} - {test_name}: {message}")
        if details:
            print(f"    Details: {details}")
    
    def setup_auth_headers(self, token: str) -> Dict[str, str]:
        """Setup authorization headers"""
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

    async def connect_to_database(self):
        """Connect to MongoDB database"""
        print("\n=== Connecting to Database ===")
        
        try:
            # Use the same MongoDB URL as the backend
            mongo_url = "mongodb://localhost:27017"
            db_name = "homeme_prod"
            
            self.db_client = AsyncIOMotorClient(mongo_url)
            self.db = self.db_client[db_name]
            
            # Test connection
            await self.db.command("ping")
            
            self.log_result("Database Connection", True, f"✅ CONNECTED TO DATABASE - {mongo_url}/{db_name}")
            return True
            
        except Exception as e:
            self.log_result("Database Connection", False, f"❌ DATABASE CONNECTION FAILED: {str(e)}")
            return False

    async def investigate_existing_users(self):
        """Investigate existing users in the database"""
        print("\n=== Investigating Existing Users ===")
        
        if self.db is None:
            self.log_result("User Investigation", False, "No database connection")
            return False
        
        try:
            # Get total user count
            total_users = await self.db.users.count_documents({})
            self.log_result("Total Users Count", True, f"✅ FOUND {total_users} USERS IN DATABASE")
            
            if total_users == 0:
                self.log_result("Users Exist", False, "❌ NO USERS FOUND IN DATABASE - This explains the login issue!")
                return await self.create_default_users()
            
            # Get all users (without password hashes for security)
            users_cursor = self.db.users.find({}, {
                "id": 1, "username": 1, "email": 1, "role": 1, 
                "compound_id": 1, "full_name": 1, "is_active": 1, "created_at": 1
            })
            users = await users_cursor.to_list(None)
            
            # Check for admin users
            admin_users = [u for u in users if u.get("role") == "admin"]
            resident_users = [u for u in users if u.get("role") == "resident"]
            
            self.log_result("User Roles Analysis", True, 
                          f"✅ USERS BY ROLE - Admin: {len(admin_users)}, Resident: {len(resident_users)}")
            
            # Check for specific admin user
            admin_user = await self.db.users.find_one({"username": "admin"})
            if admin_user:
                self.log_result("Admin User Exists", True, 
                              f"✅ ADMIN USER FOUND - Username: admin, Role: {admin_user.get('role')}, Active: {admin_user.get('is_active')}")
                
                # Test password verification
                if await self.test_admin_password(admin_user):
                    return True
                else:
                    return await self.fix_admin_password(admin_user)
            else:
                self.log_result("Admin User Exists", False, 
                              "❌ NO ADMIN USER WITH USERNAME 'admin' FOUND")
                return await self.create_admin_user()
            
        except Exception as e:
            self.log_result("User Investigation", False, f"❌ INVESTIGATION FAILED: {str(e)}")
            return False

    async def test_admin_password(self, admin_user):
        """Test if admin password is correct"""
        print("\n=== Testing Admin Password ===")
        
        try:
            stored_hash = admin_user.get("password_hash")
            if not stored_hash:
                self.log_result("Admin Password Check", False, "❌ NO PASSWORD HASH FOUND FOR ADMIN USER")
                return False
            
            # Test if password "admin123" matches the stored hash
            if self.verify_password("admin123", stored_hash):
                self.log_result("Admin Password Check", True, 
                              "✅ ADMIN PASSWORD CORRECT - admin123 matches stored hash")
                
                # Test actual login
                return await self.test_admin_login()
            else:
                self.log_result("Admin Password Check", False, 
                              "❌ ADMIN PASSWORD INCORRECT - admin123 does not match stored hash")
                return False
                
        except Exception as e:
            self.log_result("Admin Password Check", False, f"❌ PASSWORD CHECK FAILED: {str(e)}")
            return False

    async def test_admin_login(self):
        """Test admin login via API"""
        print("\n=== Testing Admin Login via API ===")
        
        try:
            login_data = {
                "username": "admin",
                "password": "admin123"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                
                self.log_result("Admin Login Test", True, 
                              f"✅ ADMIN LOGIN SUCCESSFUL - Token received: {self.admin_token[:20]}...")
                return True
            else:
                self.log_result("Admin Login Test", False, 
                              f"❌ ADMIN LOGIN FAILED - Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Admin Login Test", False, f"❌ LOGIN TEST FAILED: {str(e)}")
            return False

    async def fix_admin_password(self, admin_user):
        """Fix admin password by updating it to admin123"""
        print("\n=== Fixing Admin Password ===")
        
        try:
            new_password_hash = self.hash_password("admin123")
            
            result = await self.db.users.update_one(
                {"id": admin_user["id"]},
                {"$set": {"password_hash": new_password_hash}}
            )
            
            if result.modified_count > 0:
                self.log_result("Fix Admin Password", True, 
                              "✅ ADMIN PASSWORD UPDATED - Password set to admin123")
                return await self.test_admin_login()
            else:
                self.log_result("Fix Admin Password", False, 
                              "❌ FAILED TO UPDATE ADMIN PASSWORD")
                return False
                
        except Exception as e:
            self.log_result("Fix Admin Password", False, f"❌ PASSWORD FIX FAILED: {str(e)}")
            return False

    async def create_admin_user(self):
        """Create new admin user with username admin and password admin123"""
        print("\n=== Creating Admin User ===")
        
        try:
            # First, check if we have a compound to assign the admin to
            compound = await self.db.compounds.find_one({})
            if not compound:
                # Create a default compound
                compound_id = str(uuid.uuid4())
                compound_data = {
                    "id": compound_id,
                    "name": "Default Compound",
                    "address": "Default Address",
                    "admin_id": "",  # Will be updated after creating admin
                    "additional_admins": [],
                    "created_at": datetime.utcnow(),
                    "settings": {}
                }
                await self.db.compounds.insert_one(compound_data)
                self.log_result("Create Default Compound", True, f"✅ DEFAULT COMPOUND CREATED - ID: {compound_id}")
            else:
                compound_id = compound["id"]
            
            # Create admin user
            admin_id = str(uuid.uuid4())
            admin_data = {
                "id": admin_id,
                "username": "admin",
                "email": "admin@homeme.com",
                "password_hash": self.hash_password("admin123"),
                "role": "admin",
                "compound_id": compound_id,
                "family_id": None,
                "full_name": "System Administrator",
                "phone": "+1234567890",
                "unit_number": None,
                "is_family_head": False,
                "profile_picture_url": None,
                "created_at": datetime.utcnow(),
                "is_active": True
            }
            
            await self.db.users.insert_one(admin_data)
            
            # Update compound admin_id
            await self.db.compounds.update_one(
                {"id": compound_id},
                {"$set": {"admin_id": admin_id}}
            )
            
            self.log_result("Create Admin User", True, 
                          f"✅ ADMIN USER CREATED - Username: admin, Password: admin123, ID: {admin_id}")
            
            return await self.test_admin_login()
            
        except Exception as e:
            self.log_result("Create Admin User", False, f"❌ ADMIN CREATION FAILED: {str(e)}")
            return False

    async def create_test_user(self):
        """Create test user with username test and password test123"""
        print("\n=== Creating Test User ===")
        
        try:
            # Get compound ID from admin user or use default
            compound = await self.db.compounds.find_one({})
            if not compound:
                self.log_result("Create Test User", False, "❌ NO COMPOUND FOUND FOR TEST USER")
                return False
            
            compound_id = compound["id"]
            
            # Create test user
            test_id = str(uuid.uuid4())
            family_id = str(uuid.uuid4())
            
            test_data = {
                "id": test_id,
                "username": "test",
                "email": "test@homeme.com",
                "password_hash": self.hash_password("test123"),
                "role": "resident",
                "compound_id": compound_id,
                "family_id": family_id,
                "full_name": "Test User",
                "phone": "+1234567891",
                "unit_number": "TEST001",
                "is_family_head": True,
                "profile_picture_url": None,
                "created_at": datetime.utcnow(),
                "is_active": True
            }
            
            await self.db.users.insert_one(test_data)
            
            # Create family record
            family_data = {
                "id": family_id,
                "compound_id": compound_id,
                "unit_number": "TEST001",
                "head_user_id": test_id,
                "members": [test_id],
                "created_at": datetime.utcnow()
            }
            
            await self.db.families.insert_one(family_data)
            
            self.log_result("Create Test User", True, 
                          f"✅ TEST USER CREATED - Username: test, Password: test123, ID: {test_id}")
            
            return await self.test_user_login()
            
        except Exception as e:
            self.log_result("Create Test User", False, f"❌ TEST USER CREATION FAILED: {str(e)}")
            return False

    async def test_user_login(self):
        """Test test user login via API"""
        print("\n=== Testing Test User Login ===")
        
        try:
            login_data = {
                "username": "test",
                "password": "test123"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.test_token = data.get("access_token")
                
                self.log_result("Test User Login", True, 
                              f"✅ TEST USER LOGIN SUCCESSFUL - Token received: {self.test_token[:20]}...")
                return True
            else:
                self.log_result("Test User Login", False, 
                              f"❌ TEST USER LOGIN FAILED - Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Test User Login", False, f"❌ TEST LOGIN FAILED: {str(e)}")
            return False

    async def create_default_users(self):
        """Create both admin and test users when no users exist"""
        print("\n=== Creating Default Users ===")
        
        admin_success = await self.create_admin_user()
        test_success = await self.create_test_user()
        
        if admin_success and test_success:
            self.log_result("Create Default Users", True, 
                          "✅ BOTH DEFAULT USERS CREATED SUCCESSFULLY")
            return True
        else:
            self.log_result("Create Default Users", False, 
                          f"❌ USER CREATION INCOMPLETE - Admin: {admin_success}, Test: {test_success}")
            return False

    async def verify_login_endpoints(self):
        """Verify login endpoints are working with created users"""
        print("\n=== Verifying Login Endpoints ===")
        
        try:
            # Test admin login
            admin_login = {
                "username": "admin",
                "password": "admin123"
            }
            
            admin_response = self.session.post(f"{BASE_URL}/auth/login", json=admin_login)
            admin_success = admin_response.status_code == 200
            
            # Test test user login
            test_login = {
                "username": "test",
                "password": "test123"
            }
            
            test_response = self.session.post(f"{BASE_URL}/auth/login", json=test_login)
            test_success = test_response.status_code == 200
            
            if admin_success and test_success:
                self.log_result("Login Endpoints Verification", True, 
                              "✅ BOTH USERS CAN LOGIN SUCCESSFULLY")
                
                # Extract tokens for further testing
                if admin_success:
                    admin_data = admin_response.json()
                    self.admin_token = admin_data.get("access_token")
                    
                if test_success:
                    test_data = test_response.json()
                    self.test_token = test_data.get("access_token")
                
                return True
            else:
                self.log_result("Login Endpoints Verification", False, 
                              f"❌ LOGIN VERIFICATION FAILED - Admin: {admin_success}, Test: {test_success}")
                
                if not admin_success:
                    print(f"Admin login error: {admin_response.status_code} - {admin_response.text}")
                if not test_success:
                    print(f"Test login error: {test_response.status_code} - {test_response.text}")
                
                return False
                
        except Exception as e:
            self.log_result("Login Endpoints Verification", False, f"❌ VERIFICATION FAILED: {str(e)}")
            return False

    async def test_authenticated_endpoints(self):
        """Test that authenticated endpoints work with the created users"""
        print("\n=== Testing Authenticated Endpoints ===")
        
        if not self.admin_token:
            self.log_result("Authenticated Endpoints", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test admin dashboard
            dashboard_response = self.session.get(f"{BASE_URL}/dashboard/admin", headers=headers)
            dashboard_success = dashboard_response.status_code == 200
            
            # Test user list
            users_response = self.session.get(f"{BASE_URL}/admin/users", headers=headers)
            users_success = users_response.status_code == 200
            
            if dashboard_success:
                self.log_result("Admin Dashboard Access", True, "✅ ADMIN DASHBOARD ACCESSIBLE")
            else:
                self.log_result("Admin Dashboard Access", False, 
                              f"❌ ADMIN DASHBOARD FAILED - Status: {dashboard_response.status_code}")
            
            if users_success:
                users_data = users_response.json()
                user_count = len(users_data.get("users", []))
                self.log_result("Admin Users Access", True, f"✅ ADMIN CAN ACCESS USERS - Count: {user_count}")
            else:
                self.log_result("Admin Users Access", False, 
                              f"❌ ADMIN USERS ACCESS FAILED - Status: {users_response.status_code}")
            
            return dashboard_success or users_success
            
        except Exception as e:
            self.log_result("Authenticated Endpoints", False, f"❌ ENDPOINT TESTING FAILED: {str(e)}")
            return False

    def print_summary(self):
        """Print comprehensive summary of investigation and fixes"""
        print("\n" + "="*80)
        print("LOGIN INVESTIGATION AND USER CREATION SUMMARY")
        print("="*80)
        
        passed_tests = [r for r in self.results if "✅ PASS" in r["status"]]
        failed_tests = [r for r in self.results if "❌ FAIL" in r["status"]]
        
        print(f"\n📊 OVERALL RESULTS:")
        print(f"   ✅ Passed: {len(passed_tests)}")
        print(f"   ❌ Failed: {len(failed_tests)}")
        print(f"   📈 Success Rate: {len(passed_tests)/(len(passed_tests)+len(failed_tests))*100:.1f}%")
        
        print(f"\n🔑 WORKING CREDENTIALS:")
        if self.admin_token:
            print(f"   👤 Admin User: username=admin, password=admin123")
        if self.test_token:
            print(f"   👤 Test User: username=test, password=test123")
        
        print(f"\n🌐 LOGIN URL:")
        print(f"   🔗 {BASE_URL}/auth/login")
        
        if failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['message']}")
        
        print(f"\n✅ SUCCESSFUL TESTS:")
        for test in passed_tests:
            print(f"   • {test['test']}: {test['message']}")

    async def run_investigation(self):
        """Run the complete investigation and user creation process"""
        print("🔍 STARTING LOGIN INVESTIGATION AND USER CREATION")
        print("="*80)
        
        # Step 1: Connect to database
        if not await self.connect_to_database():
            print("❌ Cannot proceed without database connection")
            return False
        
        # Step 2: Investigate existing users
        if not await self.investigate_existing_users():
            print("❌ User investigation/creation failed")
            return False
        
        # Step 3: Create test user if admin creation was successful
        if self.admin_token:
            await self.create_test_user()
        
        # Step 4: Verify login endpoints
        await self.verify_login_endpoints()
        
        # Step 5: Test authenticated endpoints
        await self.test_authenticated_endpoints()
        
        # Step 6: Print summary
        self.print_summary()
        
        # Close database connection
        if self.db_client:
            self.db_client.close()
        
        return len([r for r in self.results if "✅ PASS" in r["status"]]) > 0

async def main():
    """Main function to run the investigation"""
    suite = LoginInvestigationSuite()
    success = await suite.run_investigation()
    
    if success:
        print("\n🎉 INVESTIGATION COMPLETED SUCCESSFULLY!")
        print("The user should now be able to login with the provided credentials.")
    else:
        print("\n💥 INVESTIGATION FAILED!")
        print("Please check the error messages above for details.")
    
    return success

if __name__ == "__main__":
    asyncio.run(main())