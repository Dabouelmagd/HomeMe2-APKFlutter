#!/usr/bin/env python3
"""
URGENT: Production Database Admin User Creation Test
Tests the production database issue where user cannot login because Atlas MongoDB is different from development.

PROBLEM IDENTIFIED:
- Website shows "Invalid credentials" error when using admin/admin123
- API call returns 401 status code  
- Production database (Atlas) is likely empty or has different users than development

REQUIRED ACTIONS:
1. Check Production Database Status - verify connection and check if admin user exists
2. Create Admin User for Production - create admin user with username: admin, password: admin123
3. Verify Login Works - test login API call with new admin user
4. Database Environment Check - confirm we're connecting to correct production MongoDB

TARGET: Fix production login issue so user can access: https://homeme-subscriptions.emergent.host/login
"""

import asyncio
import json
import requests
import uuid
import bcrypt
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

# Configuration - Using the production URL from frontend/.env
BASE_URL = "https://payment-methods-ui.preview.emergentagent.com/api"
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'homeme_prod')

class ProductionDatabaseTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.admin_user = None
        self.compound_id = None
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
    
    async def connect_to_database(self):
        """Connect to production MongoDB database"""
        print("\n=== Connecting to Production Database ===")
        
        try:
            print(f"Attempting to connect to: {MONGO_URL}")
            print(f"Database name: {DB_NAME}")
            
            self.db_client = AsyncIOMotorClient(MONGO_URL)
            self.db = self.db_client[DB_NAME]
            
            # Test connection by pinging the database
            await self.db_client.admin.command('ping')
            
            self.log_result("Database Connection", True, 
                          f"✅ SUCCESSFULLY CONNECTED to MongoDB at {MONGO_URL}")
            return True
            
        except Exception as e:
            self.log_result("Database Connection", False, 
                          f"❌ FAILED TO CONNECT to MongoDB: {str(e)}")
            return False
    
    async def check_database_status(self):
        """Check production database status and existing users"""
        print("\n=== Checking Production Database Status ===")
        
        if self.db is None:
            self.log_result("Database Status Check", False, "No database connection available")
            return False
        
        try:
            # Check if users collection exists and count users
            users_count = await self.db.users.count_documents({})
            
            self.log_result("Database Users Count", True, 
                          f"✅ FOUND {users_count} users in production database")
            
            # Check for admin users specifically
            admin_users = await self.db.users.find({"role": "admin"}).to_list(None)
            admin_count = len(admin_users)
            
            self.log_result("Admin Users Check", True, 
                          f"✅ FOUND {admin_count} admin users in production database")
            
            # Check for specific admin user with username 'admin'
            admin_user = await self.db.users.find_one({"username": "admin"})
            
            if admin_user:
                self.log_result("Admin User Exists", True, 
                              f"✅ ADMIN USER EXISTS - Username: admin, Role: {admin_user.get('role')}, "
                              f"Compound ID: {admin_user.get('compound_id')}")
                return True
            else:
                self.log_result("Admin User Missing", False, 
                              f"❌ ADMIN USER NOT FOUND - Username 'admin' does not exist in production database")
                
                # List existing users for debugging
                if admin_users:
                    usernames = [u.get('username') for u in admin_users]
                    self.log_result("Existing Admin Users", True, 
                                  f"ℹ️ EXISTING ADMIN USERNAMES: {usernames}")
                
                return False
                
        except Exception as e:
            self.log_result("Database Status Check", False, f"❌ EXCEPTION: {str(e)}")
            return False
    
    async def create_admin_user(self):
        """Create admin user for production database"""
        print("\n=== Creating Admin User for Production ===")
        
        if self.db is None:
            self.log_result("Create Admin User", False, "No database connection available")
            return False
        
        try:
            # Check if admin user already exists
            existing_admin = await self.db.users.find_one({"username": "admin"})
            if existing_admin:
                self.log_result("Admin User Creation", True, 
                              f"✅ ADMIN USER ALREADY EXISTS - No need to create")
                return True
            
            # Check if compound exists, create if not
            compound = await self.db.compounds.find_one({})
            if not compound:
                # Create default compound
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
                await self.db.compounds.insert_one(compound_data)
                self.log_result("Compound Creation", True, 
                              f"✅ DEFAULT COMPOUND CREATED - ID: {compound_id}")
            else:
                compound_id = compound.get("id")
                self.log_result("Compound Found", True, 
                              f"✅ EXISTING COMPOUND FOUND - ID: {compound_id}")
            
            # Hash password for admin123
            password_hash = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Create admin user
            admin_user_id = str(uuid.uuid4())
            admin_user_data = {
                "id": admin_user_id,
                "username": "admin",
                "email": "admin@homeme.com",
                "password_hash": password_hash,
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
            
            # Insert admin user
            await self.db.users.insert_one(admin_user_data)
            
            # Update compound with admin_id
            await self.db.compounds.update_one(
                {"id": compound_id},
                {"$set": {"admin_id": admin_user_id}}
            )
            
            self.log_result("Admin User Creation", True, 
                          f"✅ ADMIN USER CREATED SUCCESSFULLY - Username: admin, Password: admin123, "
                          f"ID: {admin_user_id}, Compound: {compound_id}")
            
            self.compound_id = compound_id
            return True
            
        except Exception as e:
            self.log_result("Admin User Creation", False, f"❌ EXCEPTION: {str(e)}")
            return False
    
    def test_admin_login(self):
        """Test admin login with created credentials"""
        print("\n=== Testing Admin Login with Production Database ===")
        
        try:
            credentials = {"username": "admin", "password": "admin123"}
            
            print(f"Attempting login with credentials: {credentials['username']}/admin123")
            response = self.session.post(f"{BASE_URL}/auth/login", json=credentials)
            
            print(f"Login Response Status: {response.status_code}")
            if response.status_code != 200:
                print(f"Login Response Text: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["access_token", "user"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Admin Login", False, f"Missing required fields: {missing_fields}")
                    return False
                
                self.admin_token = data["access_token"]
                self.admin_user = data["user"]
                self.compound_id = self.admin_user.get("compound_id")
                
                # Verify user object structure
                user_required_fields = ["id", "username", "role"]
                user_missing_fields = [field for field in user_required_fields if field not in self.admin_user]
                
                if user_missing_fields:
                    self.log_result("Admin Login", False, f"User object missing fields: {user_missing_fields}")
                    return False
                
                # Verify token format
                if not self.admin_token or len(self.admin_token) < 10:
                    self.log_result("Admin Login", False, "Invalid token format")
                    return False
                
                self.log_result("Admin Login", True, 
                              f"✅ LOGIN SUCCESSFUL - Username: {credentials['username']}, "
                              f"Role: {self.admin_user.get('role')}, Compound: {self.compound_id}, "
                              f"Token: {self.admin_token[:20]}...")
                return True
                
            elif response.status_code == 401:
                self.log_result("Admin Login", False, 
                              f"❌ INVALID CREDENTIALS - {response.status_code}: {response.text}")
                return False
                
            elif response.status_code == 422:
                self.log_result("Admin Login", False, 
                              f"❌ VALIDATION ERROR - {response.status_code}: {response.text}")
                return False
                
            else:
                self.log_result("Admin Login", False, 
                              f"❌ UNEXPECTED ERROR - {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Admin Login", False, f"❌ EXCEPTION: {str(e)}")
            return False
    
    def test_admin_dashboard_access(self):
        """Test admin dashboard access after login"""
        print("\n=== Testing Admin Dashboard Access ===")
        
        if not self.admin_token:
            self.log_result("Admin Dashboard Access", False, "No admin token available")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }
            
            response = self.session.get(f"{BASE_URL}/dashboard/admin", headers=headers)
            
            print(f"Admin Dashboard Response Status: {response.status_code}")
            if response.status_code != 200:
                print(f"Admin Dashboard Response Text: {response.text}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    self.log_result("Admin Dashboard Access", True, 
                                  f"✅ ADMIN DASHBOARD ACCESSIBLE - Admin can access dashboard with {len(data.keys())} data sections")
                    return True
                except json.JSONDecodeError as e:
                    self.log_result("Admin Dashboard Access", False, 
                                  f"❌ JSON DECODE ERROR: {str(e)}")
                    return False
                    
            elif response.status_code == 403:
                self.log_result("Admin Dashboard Access", False, 
                              f"❌ ACCESS DENIED - Admin user cannot access admin dashboard")
                return False
                
            elif response.status_code == 404:
                self.log_result("Admin Dashboard Access", False, 
                              f"❌ ENDPOINT NOT FOUND - /api/dashboard/admin does not exist")
                return False
                
            elif response.status_code == 500:
                self.log_result("Admin Dashboard Access", False, 
                              f"❌ SERVER ERROR - Dashboard endpoint has issues: {response.text}")
                return False
                
            else:
                self.log_result("Admin Dashboard Access", False, 
                              f"❌ UNEXPECTED STATUS {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Admin Dashboard Access", False, f"❌ EXCEPTION: {str(e)}")
            return False
    
    def test_environment_verification(self):
        """Verify we're connecting to the correct production environment"""
        print("\n=== Verifying Production Environment ===")
        
        try:
            # Check environment variables
            mongo_url = os.environ.get('MONGO_URL')
            db_name = os.environ.get('DB_NAME')
            
            self.log_result("Environment Variables", True, 
                          f"✅ MONGO_URL: {mongo_url}, DB_NAME: {db_name}")
            
            # Check if we're using the correct backend URL
            if "homeme-subscriptions.preview.emergentagent.com" in BASE_URL:
                self.log_result("Backend URL", True, 
                              f"✅ USING PRODUCTION URL: {BASE_URL}")
            else:
                self.log_result("Backend URL", False, 
                              f"❌ NOT USING PRODUCTION URL: {BASE_URL}")
                return False
            
            # Test basic health check
            try:
                response = self.session.get(f"{BASE_URL}/")
                if response.status_code in [200, 404]:  # 404 is OK, means server is responding
                    self.log_result("Production Server", True, 
                                  f"✅ PRODUCTION SERVER RESPONDING - Status: {response.status_code}")
                else:
                    self.log_result("Production Server", False, 
                                  f"❌ PRODUCTION SERVER ISSUE - Status: {response.status_code}")
                    return False
            except Exception as e:
                self.log_result("Production Server", False, f"❌ SERVER CONNECTION ERROR: {str(e)}")
                return False
            
            return True
            
        except Exception as e:
            self.log_result("Environment Verification", False, f"❌ EXCEPTION: {str(e)}")
            return False
    
    async def close_database_connection(self):
        """Close database connection"""
        if self.db_client:
            self.db_client.close()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("PRODUCTION DATABASE TEST SUMMARY")
        print("="*80)
        
        passed = len([r for r in self.results if "✅" in r["status"]])
        failed = len([r for r in self.results if "❌" in r["status"]])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%" if total > 0 else "0%")
        
        print("\nDetailed Results:")
        for result in self.results:
            print(f"{result['status']} - {result['test']}: {result['message']}")
            if result['details']:
                print(f"    Details: {result['details']}")
        
        print("\n" + "="*80)
        
        if failed == 0:
            print("🎉 ALL TESTS PASSED - Production database issue resolved!")
            print("✅ User should now be able to login with admin/admin123")
            print("✅ Admin dashboard should be accessible")
        else:
            print("⚠️ SOME TESTS FAILED - Production database issue may not be fully resolved")
            if any("Admin User Creation" in r["test"] and "✅" in r["status"] for r in self.results):
                print("✅ Admin user was created - try logging in again")
            if any("Admin Login" in r["test"] and "❌" in r["status"] for r in self.results):
                print("❌ Login still failing - may need further investigation")

async def main():
    """Main test execution"""
    print("URGENT: Production Database Admin User Creation Test")
    print("="*60)
    print("Testing production database issue where user cannot login")
    print("Target: https://homeme-subscriptions.emergent.host/login")
    print("="*60)
    
    test_suite = ProductionDatabaseTestSuite()
    
    try:
        # Step 1: Verify production environment
        test_suite.test_environment_verification()
        
        # Step 2: Connect to production database
        await test_suite.connect_to_database()
        
        # Step 3: Check database status and existing users
        await test_suite.check_database_status()
        
        # Step 4: Create admin user if needed
        await test_suite.create_admin_user()
        
        # Step 5: Test admin login
        test_suite.test_admin_login()
        
        # Step 6: Test admin dashboard access
        test_suite.test_admin_dashboard_access()
        
    finally:
        # Close database connection
        await test_suite.close_database_connection()
        
        # Print summary
        test_suite.print_summary()

if __name__ == "__main__":
    asyncio.run(main())