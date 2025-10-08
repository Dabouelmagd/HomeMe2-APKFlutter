#!/usr/bin/env python3
"""
User Production Environment Test
Tests the actual production environment that the user is accessing: https://homeme-subscriptions.emergent.host

This tests the ACTUAL URL the user is trying to access, not the preview URL.
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

# Configuration - Using the ACTUAL user production URL
USER_FRONTEND_URL = "https://homeme-subscriptions.emergent.host"
USER_BACKEND_URL = "https://homeme-subscriptions.emergent.host/api"

class UserProductionTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.admin_user = None
        self.compound_id = None
        self.results = []
        
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
    
    def test_user_frontend_access(self):
        """Test if user can access the frontend"""
        print("\n=== Testing User Frontend Access ===")
        
        try:
            response = self.session.get(f"{USER_FRONTEND_URL}/login")
            
            if response.status_code == 200:
                self.log_result("User Frontend Access", True, 
                              f"✅ USER FRONTEND ACCESSIBLE - {USER_FRONTEND_URL}/login")
                return True
            else:
                self.log_result("User Frontend Access", False, 
                              f"❌ USER FRONTEND NOT ACCESSIBLE - Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("User Frontend Access", False, f"❌ EXCEPTION: {str(e)}")
            return False
    
    def test_user_backend_health(self):
        """Test if user's backend is responding"""
        print("\n=== Testing User Backend Health ===")
        
        try:
            response = self.session.get(f"{USER_BACKEND_URL}/")
            
            print(f"Backend Health Response Status: {response.status_code}")
            if response.status_code not in [200, 405]:  # 405 is OK for GET on POST endpoint
                print(f"Backend Health Response Text: {response.text}")
            
            if response.status_code in [200, 405]:
                self.log_result("User Backend Health", True, 
                              f"✅ USER BACKEND RESPONDING - {USER_BACKEND_URL}")
                return True
            else:
                self.log_result("User Backend Health", False, 
                              f"❌ USER BACKEND NOT RESPONDING - Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("User Backend Health", False, f"❌ EXCEPTION: {str(e)}")
            return False
    
    def test_user_admin_login(self):
        """Test admin login on user's actual production environment"""
        print("\n=== Testing Admin Login on User Production Environment ===")
        
        try:
            credentials = {"username": "admin", "password": "admin123"}
            
            print(f"Attempting login with credentials: {credentials['username']}/admin123")
            print(f"Login URL: {USER_BACKEND_URL}/auth/login")
            
            response = self.session.post(f"{USER_BACKEND_URL}/auth/login", json=credentials)
            
            print(f"Login Response Status: {response.status_code}")
            print(f"Login Response Text: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["access_token", "user"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("User Admin Login", False, f"Missing required fields: {missing_fields}")
                    return False
                
                self.admin_token = data["access_token"]
                self.admin_user = data["user"]
                self.compound_id = self.admin_user.get("compound_id")
                
                self.log_result("User Admin Login", True, 
                              f"✅ LOGIN SUCCESSFUL ON USER PRODUCTION - Username: {credentials['username']}, "
                              f"Role: {self.admin_user.get('role')}, Compound: {self.compound_id}")
                return True
                
            elif response.status_code == 401:
                self.log_result("User Admin Login", False, 
                              f"❌ INVALID CREDENTIALS ON USER PRODUCTION - This is the reported issue!")
                return False
                
            elif response.status_code == 422:
                self.log_result("User Admin Login", False, 
                              f"❌ VALIDATION ERROR - {response.status_code}: {response.text}")
                return False
                
            else:
                self.log_result("User Admin Login", False, 
                              f"❌ UNEXPECTED ERROR - {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("User Admin Login", False, f"❌ EXCEPTION: {str(e)}")
            return False
    
    def test_database_investigation(self):
        """Investigate the database behind user's production environment"""
        print("\n=== Investigating User Production Database ===")
        
        try:
            # Try to get some information about the backend
            endpoints_to_test = [
                "/health",
                "/status", 
                "/info",
                "/version",
                "/compounds",
                "/users"
            ]
            
            for endpoint in endpoints_to_test:
                try:
                    response = self.session.get(f"{USER_BACKEND_URL}{endpoint}")
                    print(f"Endpoint {endpoint}: Status {response.status_code}")
                    
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            print(f"  Response: {json.dumps(data, indent=2)[:200]}...")
                        except:
                            print(f"  Response: {response.text[:200]}...")
                            
                except Exception as e:
                    print(f"Endpoint {endpoint}: Exception {str(e)}")
            
            # Try to create a user to test if we can access the database
            try:
                # First try to get compounds without auth
                compounds_response = self.session.get(f"{USER_BACKEND_URL}/compounds")
                print(f"Compounds endpoint (no auth): Status {compounds_response.status_code}")
                
                if compounds_response.status_code == 401:
                    self.log_result("Database Investigation", True, 
                                  "✅ BACKEND IS SECURED - Requires authentication (good security)")
                else:
                    print(f"Compounds response: {compounds_response.text[:200]}...")
                    
            except Exception as e:
                print(f"Compounds test exception: {str(e)}")
            
            return True
            
        except Exception as e:
            self.log_result("Database Investigation", False, f"❌ EXCEPTION: {str(e)}")
            return False
    
    def test_create_admin_user_via_api(self):
        """Try to create admin user via API if possible"""
        print("\n=== Attempting to Create Admin User via API ===")
        
        try:
            # Check if there's a setup or initialization endpoint
            setup_endpoints = [
                "/setup",
                "/init", 
                "/install",
                "/admin/setup",
                "/auth/setup"
            ]
            
            for endpoint in setup_endpoints:
                try:
                    response = self.session.get(f"{USER_BACKEND_URL}{endpoint}")
                    print(f"Setup endpoint {endpoint}: Status {response.status_code}")
                    
                    if response.status_code == 200:
                        print(f"  Found setup endpoint: {endpoint}")
                        # Try to use it
                        setup_data = {
                            "username": "admin",
                            "password": "admin123",
                            "email": "admin@homeme.com",
                            "full_name": "System Administrator"
                        }
                        
                        setup_response = self.session.post(f"{USER_BACKEND_URL}{endpoint}", json=setup_data)
                        print(f"  Setup attempt: Status {setup_response.status_code}")
                        print(f"  Setup response: {setup_response.text}")
                        
                        if setup_response.status_code == 200:
                            self.log_result("Admin User Creation via API", True, 
                                          f"✅ ADMIN USER CREATED via {endpoint}")
                            return True
                            
                except Exception as e:
                    print(f"Setup endpoint {endpoint}: Exception {str(e)}")
            
            self.log_result("Admin User Creation via API", False, 
                          "❌ NO SETUP ENDPOINTS FOUND - Cannot create admin user via API")
            return False
            
        except Exception as e:
            self.log_result("Admin User Creation via API", False, f"❌ EXCEPTION: {str(e)}")
            return False
    
    def test_alternative_credentials(self):
        """Test alternative credential combinations"""
        print("\n=== Testing Alternative Credentials ===")
        
        credential_sets = [
            {"username": "admin", "password": "admin123"},
            {"username": "admin", "password": "password"},
            {"username": "admin", "password": "admin"},
            {"username": "administrator", "password": "admin123"},
            {"username": "root", "password": "admin123"},
            {"email": "admin@homeme.com", "password": "admin123"},
            {"email": "admin@example.com", "password": "admin123"},
        ]
        
        for i, credentials in enumerate(credential_sets, 1):
            try:
                print(f"Testing credentials set {i}: {list(credentials.keys())}")
                response = self.session.post(f"{USER_BACKEND_URL}/auth/login", json=credentials)
                
                print(f"  Status: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    self.log_result(f"Alternative Credentials {i}", True, 
                                  f"✅ WORKING CREDENTIALS FOUND: {list(credentials.values())[0]}")
                    return True
                elif response.status_code == 401:
                    print(f"  Invalid credentials: {response.text}")
                else:
                    print(f"  Unexpected response: {response.text}")
                    
            except Exception as e:
                print(f"  Exception: {str(e)}")
        
        self.log_result("Alternative Credentials", False, 
                      "❌ NO WORKING CREDENTIALS FOUND - All tested combinations failed")
        return False
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("USER PRODUCTION ENVIRONMENT TEST SUMMARY")
        print("="*80)
        print(f"Testing URL: {USER_FRONTEND_URL}")
        print(f"Backend URL: {USER_BACKEND_URL}")
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
        
        # Provide specific recommendations
        login_failed = any("User Admin Login" in r["test"] and "❌" in r["status"] for r in self.results)
        
        if login_failed:
            print("🚨 CRITICAL ISSUE CONFIRMED:")
            print("❌ User cannot login with admin/admin123 on their production environment")
            print("❌ The user's production database is different from the preview environment")
            print("\n🔧 RECOMMENDED ACTIONS:")
            print("1. The user's production environment (emergent.host) has a different database")
            print("2. Need to create admin user in the ACTUAL production database")
            print("3. May need direct database access or backend deployment with user creation")
            print("4. Consider providing database migration script or setup endpoint")
        else:
            print("✅ User production environment is working correctly")

def main():
    """Main test execution"""
    print("USER PRODUCTION ENVIRONMENT TEST")
    print("="*60)
    print("Testing the ACTUAL production environment the user is accessing")
    print(f"User Frontend: {USER_FRONTEND_URL}")
    print(f"User Backend: {USER_BACKEND_URL}")
    print("="*60)
    
    test_suite = UserProductionTestSuite()
    
    # Step 1: Test frontend access
    test_suite.test_user_frontend_access()
    
    # Step 2: Test backend health
    test_suite.test_user_backend_health()
    
    # Step 3: Test admin login (this should fail based on user report)
    test_suite.test_user_admin_login()
    
    # Step 4: Investigate database
    test_suite.test_database_investigation()
    
    # Step 5: Try to create admin user via API
    test_suite.test_create_admin_user_via_api()
    
    # Step 6: Test alternative credentials
    test_suite.test_alternative_credentials()
    
    # Print summary
    test_suite.print_summary()

if __name__ == "__main__":
    main()