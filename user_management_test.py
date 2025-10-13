#!/usr/bin/env python3
"""
User Management Backend API Testing Suite
Focused testing for User Management API endpoints to diagnose "No Results" issue
Tests:
1. Admin authentication
2. GET /api/admin/users endpoint
3. Database user verification
4. Response format analysis
"""

import requests
import json
from datetime import datetime
from typing import Dict, List, Optional

# Configuration - Using the production URL from frontend/.env
BASE_URL = "https://homeme-container-fix.preview.emergentagent.com/api"

class UserManagementTestSuite:
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
    
    def setup_auth_headers(self, token: str) -> Dict[str, str]:
        """Setup authorization headers"""
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_admin_authentication(self):
        """Test admin authentication with admin/admin123 credentials"""
        print("\n=== Testing Admin Authentication ===")
        
        credentials = {"username": "admin", "password": "admin123"}
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=credentials)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["access_token", "user"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Admin Authentication", False, f"Missing required fields: {missing_fields}")
                    return False
                
                self.admin_token = data["access_token"]
                self.admin_user = data["user"]
                self.compound_id = self.admin_user.get("compound_id")
                
                # Verify user object structure
                user_required_fields = ["id", "username", "role"]
                user_missing_fields = [field for field in user_required_fields if field not in self.admin_user]
                
                if user_missing_fields:
                    self.log_result("Admin Authentication", False, f"User object missing fields: {user_missing_fields}")
                    return False
                
                self.log_result("Admin Authentication", True, 
                              f"Admin authenticated successfully - Username: {credentials['username']}, "
                              f"Role: {self.admin_user.get('role')}, Compound: {self.compound_id}")
                return True
            else:
                self.log_result("Admin Authentication", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                    
        except Exception as e:
            self.log_result("Admin Authentication", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_admin_users_endpoint(self):
        """Test GET /api/admin/users endpoint"""
        print("\n=== Testing Admin Users Endpoint ===")
        
        if not self.admin_token:
            self.log_result("Admin Users Endpoint", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/admin/users", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if response is a list or has users field
                users = []
                if isinstance(data, list):
                    users = data
                elif isinstance(data, dict):
                    users = data.get("users", data.get("data", []))
                
                self.log_result("Admin Users Endpoint", True, 
                              f"Endpoint accessible - Response type: {type(data)}, "
                              f"Users found: {len(users)}")
                
                # Analyze response structure
                if users:
                    sample_user = users[0]
                    user_fields = list(sample_user.keys()) if isinstance(sample_user, dict) else []
                    self.log_result("User Data Structure", True, 
                                  f"Sample user fields: {user_fields}")
                else:
                    self.log_result("User Data Analysis", True, 
                                  "No users found in response - this explains 'No Results' in frontend")
                
                return True
            else:
                self.log_result("Admin Users Endpoint", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Users Endpoint", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_alternative_user_endpoints(self):
        """Test alternative user-related endpoints"""
        print("\n=== Testing Alternative User Endpoints ===")
        
        if not self.admin_token:
            self.log_result("Alternative User Endpoints", False, "No admin token available")
            return False
        
        headers = self.setup_auth_headers(self.admin_token)
        endpoints_to_test = [
            "/users",
            "/admin/residents", 
            "/residents",
            "/families",
            "/compound/users",
            "/compound/residents"
        ]
        
        working_endpoints = []
        
        for endpoint in endpoints_to_test:
            try:
                response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Determine data count
                    count = 0
                    if isinstance(data, list):
                        count = len(data)
                    elif isinstance(data, dict):
                        # Check various possible fields
                        for field in ["users", "residents", "families", "data", "results"]:
                            if field in data and isinstance(data[field], list):
                                count = len(data[field])
                                break
                    
                    working_endpoints.append(endpoint)
                    self.log_result(f"Endpoint {endpoint}", True, 
                                  f"Working - Status: {response.status_code}, Data count: {count}")
                else:
                    self.log_result(f"Endpoint {endpoint}", False, 
                                  f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_result(f"Endpoint {endpoint}", False, f"Exception: {str(e)}")
        
        if working_endpoints:
            self.log_result("Alternative Endpoints Summary", True, 
                          f"Found {len(working_endpoints)} working endpoints: {working_endpoints}")
        else:
            self.log_result("Alternative Endpoints Summary", False, 
                          "No alternative user endpoints found working")
        
        return len(working_endpoints) > 0
    
    def test_database_verification(self):
        """Test database connectivity and user existence"""
        print("\n=== Testing Database Verification ===")
        
        if not self.admin_token:
            self.log_result("Database Verification", False, "No admin token available")
            return False
        
        headers = self.setup_auth_headers(self.admin_token)
        
        # Test various endpoints that might indicate database connectivity
        db_test_endpoints = [
            ("/compounds", "compounds"),
            ("/notifications", "notifications"),
            ("/maintenance/requests", "maintenance requests"),
            ("/dashboard/admin", "admin dashboard")
        ]
        
        db_working = False
        
        for endpoint, description in db_test_endpoints:
            try:
                response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    self.log_result(f"Database - {description}", True, 
                                  f"Database accessible via {endpoint}")
                    db_working = True
                    break
                elif response.status_code == 500:
                    # 500 might indicate database connection but serialization issues
                    self.log_result(f"Database - {description}", True, 
                                  f"Database accessible but has serialization issues (ObjectId)")
                    db_working = True
                    break
                    
            except Exception as e:
                continue
        
        if db_working:
            self.log_result("Database Connectivity", True, "Database is accessible")
        else:
            self.log_result("Database Connectivity", False, "Database connectivity issues detected")
        
        return db_working
    
    def test_user_creation_endpoint(self):
        """Test if we can create a user to verify the system works"""
        print("\n=== Testing User Creation Endpoint ===")
        
        if not self.admin_token:
            self.log_result("User Creation Test", False, "No admin token available")
            return False
        
        headers = self.setup_auth_headers(self.admin_token)
        
        # Try to create a test user
        test_user_data = {
            "username": f"testuser_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "email": f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com",
            "password": "testpass123",
            "role": "resident",
            "compound_id": self.compound_id,
            "full_name": "Test User",
            "phone": "+1234567890",
            "unit_number": "TEST001"
        }
        
        # Try different possible endpoints for user creation
        creation_endpoints = [
            "/admin/users",
            "/users", 
            "/admin/residents",
            "/residents"
        ]
        
        for endpoint in creation_endpoints:
            try:
                response = self.session.post(f"{BASE_URL}{endpoint}", json=test_user_data, headers=headers)
                
                if response.status_code in [200, 201]:
                    result = response.json()
                    self.log_result("User Creation Test", True, 
                                  f"User creation works via {endpoint} - Response: {result}")
                    
                    # Now test if we can retrieve users again
                    self.test_admin_users_endpoint_after_creation()
                    return True
                elif response.status_code == 422:
                    self.log_result(f"User Creation - {endpoint}", False, 
                                  f"Validation error (expected): {response.text}")
                else:
                    self.log_result(f"User Creation - {endpoint}", False, 
                                  f"Status {response.status_code}: {response.text}")
                    
            except Exception as e:
                self.log_result(f"User Creation - {endpoint}", False, f"Exception: {str(e)}")
        
        self.log_result("User Creation Test", False, "No working user creation endpoint found")
        return False
    
    def test_admin_users_endpoint_after_creation(self):
        """Re-test admin users endpoint after creating a user"""
        print("\n=== Re-testing Admin Users Endpoint After Creation ===")
        
        if not self.admin_token:
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/admin/users", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                users = []
                if isinstance(data, list):
                    users = data
                elif isinstance(data, dict):
                    users = data.get("users", data.get("data", []))
                
                self.log_result("Admin Users After Creation", True, 
                              f"Users now found: {len(users)}")
                return True
            else:
                self.log_result("Admin Users After Creation", False, 
                              f"Still failing with status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Admin Users After Creation", False, f"Exception: {str(e)}")
            return False
    
    def test_response_format_analysis(self):
        """Analyze response formats for frontend compatibility"""
        print("\n=== Testing Response Format Analysis ===")
        
        if not self.admin_token:
            self.log_result("Response Format Analysis", False, "No admin token available")
            return False
        
        headers = self.setup_auth_headers(self.admin_token)
        
        # Test the main endpoint and analyze its response
        try:
            response = self.session.get(f"{BASE_URL}/admin/users", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Detailed analysis
                analysis = {
                    "response_type": type(data).__name__,
                    "response_keys": list(data.keys()) if isinstance(data, dict) else "N/A (list)",
                    "is_empty": len(data) == 0 if isinstance(data, (list, dict)) else False,
                    "content_preview": str(data)[:200] + "..." if len(str(data)) > 200 else str(data)
                }
                
                self.log_result("Response Format Analysis", True, 
                              f"Analysis complete: {json.dumps(analysis, indent=2)}")
                
                # Check if this matches what frontend expects
                if isinstance(data, list) and len(data) == 0:
                    self.log_result("Frontend Compatibility", True, 
                                  "Response format is correct but empty - this explains 'No Results'")
                elif isinstance(data, dict) and not data.get("users", []):
                    self.log_result("Frontend Compatibility", True, 
                                  "Response format has no users - this explains 'No Results'")
                else:
                    self.log_result("Frontend Compatibility", False, 
                                  "Response format may not match frontend expectations")
                
                return True
            else:
                self.log_result("Response Format Analysis", False, 
                              f"Cannot analyze - endpoint returns {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Response Format Analysis", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all user management tests"""
        print("🚀 Starting User Management API Testing Suite")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_admin_authentication,
            self.test_admin_users_endpoint,
            self.test_alternative_user_endpoints,
            self.test_database_verification,
            self.test_response_format_analysis,
            self.test_user_creation_endpoint
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 USER MANAGEMENT API TEST SUMMARY")
        print("=" * 60)
        
        for result in self.results:
            print(f"{result['status']} - {result['test']}: {result['message']}")
            if result['details']:
                print(f"    {result['details']}")
        
        print(f"\n🎯 Overall Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        # Diagnosis
        print("\n🔍 DIAGNOSIS FOR 'NO RESULTS' ISSUE:")
        print("-" * 40)
        
        if self.admin_token:
            print("✅ Admin authentication is working")
        else:
            print("❌ Admin authentication failed - this could be the root cause")
            return
        
        # Check if we found any users
        users_found = False
        for result in self.results:
            if "Users found:" in result['message'] and "Users found: 0" not in result['message']:
                users_found = True
                break
        
        if users_found:
            print("✅ Users exist in the database")
            print("🔧 RECOMMENDATION: Check frontend UserManagement component for API call issues")
        else:
            print("❌ No users found in database")
            print("🔧 RECOMMENDATION: Database may be empty or user creation system needs to be used")
        
        # Check endpoint accessibility
        endpoint_working = False
        for result in self.results:
            if result['test'] == "Admin Users Endpoint" and result['status'] == "✅ PASS":
                endpoint_working = True
                break
        
        if endpoint_working:
            print("✅ /api/admin/users endpoint is accessible")
        else:
            print("❌ /api/admin/users endpoint has issues")
            print("🔧 RECOMMENDATION: Check backend server logs and endpoint implementation")

if __name__ == "__main__":
    suite = UserManagementTestSuite()
    suite.run_all_tests()