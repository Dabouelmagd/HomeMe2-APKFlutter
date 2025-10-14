#!/usr/bin/env python3
"""
HomeMe Authentication Backend Test Suite
Comprehensive testing of authentication system and user management.

TESTS COVERED:
1. Admin Login with admin/admin123
2. Test User Login with test/test123  
3. Database User Verification
4. Token Validation
5. Protected Endpoints Access
6. User Creation and Management
7. Authentication Error Handling
"""

import asyncio
import json
import requests
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Configuration - Using the production URL from frontend/.env
BASE_URL = "https://residence-central.preview.emergentagent.com/api"

class AuthBackendTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_token = None
        self.admin_user = None
        self.test_user = None
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

    def test_admin_login(self):
        """Test admin login with admin/admin123"""
        print("\n=== Testing Admin Login (admin/admin123) ===")
        
        try:
            login_data = {
                "username": "admin",
                "password": "admin123"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
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
                
                # Verify user object structure
                user_required_fields = ["id", "username", "role", "compound_id"]
                user_missing_fields = [field for field in user_required_fields if field not in self.admin_user]
                
                if user_missing_fields:
                    self.log_result("Admin Login", False, f"User object missing fields: {user_missing_fields}")
                    return False
                
                # Verify admin role
                if self.admin_user.get("role") != "admin":
                    self.log_result("Admin Login", False, f"Expected admin role, got: {self.admin_user.get('role')}")
                    return False
                
                self.log_result("Admin Login", True, 
                              f"✅ ADMIN LOGIN SUCCESSFUL - Username: {self.admin_user.get('username')}, "
                              f"Role: {self.admin_user.get('role')}, ID: {self.admin_user.get('id')}")
                return True
                
            elif response.status_code == 401:
                self.log_result("Admin Login", False, 
                              f"❌ INVALID CREDENTIALS - {response.status_code}: {response.text}")
                return False
            else:
                self.log_result("Admin Login", False, 
                              f"❌ LOGIN FAILED - Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Admin Login", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def test_test_user_login(self):
        """Test test user login with test/test123"""
        print("\n=== Testing Test User Login (test/test123) ===")
        
        try:
            login_data = {
                "username": "test",
                "password": "test123"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["access_token", "user"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Test User Login", False, f"Missing required fields: {missing_fields}")
                    return False
                
                self.test_token = data["access_token"]
                self.test_user = data["user"]
                
                # Verify user object structure
                user_required_fields = ["id", "username", "role", "compound_id"]
                user_missing_fields = [field for field in user_required_fields if field not in self.test_user]
                
                if user_missing_fields:
                    self.log_result("Test User Login", False, f"User object missing fields: {user_missing_fields}")
                    return False
                
                # Verify resident role
                if self.test_user.get("role") != "resident":
                    self.log_result("Test User Login", False, f"Expected resident role, got: {self.test_user.get('role')}")
                    return False
                
                self.log_result("Test User Login", True, 
                              f"✅ TEST USER LOGIN SUCCESSFUL - Username: {self.test_user.get('username')}, "
                              f"Role: {self.test_user.get('role')}, ID: {self.test_user.get('id')}")
                return True
                
            elif response.status_code == 401:
                self.log_result("Test User Login", False, 
                              f"❌ INVALID CREDENTIALS - {response.status_code}: {response.text}")
                return False
            else:
                self.log_result("Test User Login", False, 
                              f"❌ LOGIN FAILED - Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Test User Login", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def test_invalid_credentials(self):
        """Test login with invalid credentials"""
        print("\n=== Testing Invalid Credentials ===")
        
        try:
            invalid_credentials = [
                {"username": "admin", "password": "wrongpassword"},
                {"username": "wronguser", "password": "admin123"},
                {"username": "test", "password": "wrongpassword"},
                {"username": "", "password": "admin123"},
                {"username": "admin", "password": ""}
            ]
            
            success_count = 0
            
            for i, creds in enumerate(invalid_credentials, 1):
                response = self.session.post(f"{BASE_URL}/auth/login", json=creds)
                
                if response.status_code == 401:
                    success_count += 1
                    print(f"    ✅ Invalid credentials {i} correctly rejected")
                else:
                    print(f"    ❌ Invalid credentials {i} not properly rejected (status: {response.status_code})")
            
            if success_count == len(invalid_credentials):
                self.log_result("Invalid Credentials", True, 
                              f"✅ ALL INVALID CREDENTIALS PROPERLY REJECTED - {success_count}/{len(invalid_credentials)}")
                return True
            else:
                self.log_result("Invalid Credentials", False, 
                              f"❌ SOME INVALID CREDENTIALS NOT REJECTED - {success_count}/{len(invalid_credentials)}")
                return False
                
        except Exception as e:
            self.log_result("Invalid Credentials", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def test_token_validation(self):
        """Test token validation with /auth/me endpoint"""
        print("\n=== Testing Token Validation ===")
        
        if not self.admin_token:
            self.log_result("Token Validation", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/auth/me", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                if "user" in data:
                    user_from_token = data["user"]
                    
                    # Verify user data matches login user
                    if user_from_token.get("id") == self.admin_user.get("id"):
                        self.log_result("Token Validation", True, 
                                      f"✅ TOKEN VALID - User ID matches: {user_from_token.get('id')}")
                        
                        # Test invalid token
                        invalid_headers = {"Authorization": "Bearer invalid_token_123", "Content-Type": "application/json"}
                        invalid_response = self.session.get(f"{BASE_URL}/auth/me", headers=invalid_headers)
                        
                        if invalid_response.status_code == 401:
                            self.log_result("Invalid Token Rejection", True, 
                                          "✅ INVALID TOKEN CORRECTLY REJECTED")
                            return True
                        else:
                            self.log_result("Invalid Token Rejection", False, 
                                          f"❌ INVALID TOKEN NOT REJECTED - Status {invalid_response.status_code}")
                            return False
                    else:
                        self.log_result("Token Validation", False, 
                                      f"❌ USER MISMATCH - Expected: {self.admin_user.get('id')}, Got: {user_from_token.get('id')}")
                        return False
                else:
                    self.log_result("Token Validation", False, 
                                  f"❌ INVALID RESPONSE STRUCTURE - Missing 'user' field: {data}")
                    return False
                    
            elif response.status_code == 404:
                self.log_result("Token Validation", False, 
                              "❌ /auth/me ENDPOINT NOT FOUND")
                return False
            else:
                self.log_result("Token Validation", False, 
                              f"❌ TOKEN VALIDATION FAILED - Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Token Validation", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def test_admin_dashboard_access(self):
        """Test admin dashboard access"""
        print("\n=== Testing Admin Dashboard Access ===")
        
        if not self.admin_token:
            self.log_result("Admin Dashboard Access", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/dashboard/admin", headers=headers)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    self.log_result("Admin Dashboard Access", True, 
                                  f"✅ ADMIN DASHBOARD ACCESSIBLE - Keys: {list(data.keys())}")
                    return True
                except json.JSONDecodeError as e:
                    self.log_result("Admin Dashboard Access", False, 
                                  f"❌ JSON DECODE ERROR - Response not valid JSON: {str(e)}")
                    return False
            else:
                self.log_result("Admin Dashboard Access", False, 
                              f"❌ DASHBOARD ACCESS FAILED - Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Admin Dashboard Access", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def test_user_management_access(self):
        """Test user management access"""
        print("\n=== Testing User Management Access ===")
        
        if not self.admin_token:
            self.log_result("User Management Access", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/admin/users", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                users = data.get("users", [])
                
                self.log_result("User Management Access", True, 
                              f"✅ USER MANAGEMENT ACCESSIBLE - Found {len(users)} users")
                
                # Verify we can see both admin and test users
                admin_found = any(u.get("username") == "admin" for u in users)
                test_found = any(u.get("username") == "test" for u in users)
                
                if admin_found and test_found:
                    self.log_result("User List Verification", True, 
                                  "✅ BOTH ADMIN AND TEST USERS FOUND IN USER LIST")
                    return True
                else:
                    self.log_result("User List Verification", False, 
                                  f"❌ USERS MISSING - Admin: {admin_found}, Test: {test_found}")
                    return False
                    
            else:
                self.log_result("User Management Access", False, 
                              f"❌ USER MANAGEMENT ACCESS FAILED - Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("User Management Access", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def test_resident_access_control(self):
        """Test that resident users cannot access admin endpoints"""
        print("\n=== Testing Resident Access Control ===")
        
        if not self.test_token:
            self.log_result("Resident Access Control", False, "No test user token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.test_token)
            
            # Test admin dashboard access (should be denied)
            admin_dashboard_response = self.session.get(f"{BASE_URL}/dashboard/admin", headers=headers)
            
            # Test user management access (should be denied)
            user_mgmt_response = self.session.get(f"{BASE_URL}/admin/users", headers=headers)
            
            admin_denied = admin_dashboard_response.status_code == 403
            user_mgmt_denied = user_mgmt_response.status_code == 403
            
            if admin_denied and user_mgmt_denied:
                self.log_result("Resident Access Control", True, 
                              "✅ RESIDENT PROPERLY DENIED ACCESS TO ADMIN ENDPOINTS")
                return True
            else:
                self.log_result("Resident Access Control", False, 
                              f"❌ ACCESS CONTROL FAILED - Admin Dashboard: {admin_dashboard_response.status_code}, "
                              f"User Management: {user_mgmt_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Resident Access Control", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def test_resident_dashboard_access(self):
        """Test resident dashboard access"""
        print("\n=== Testing Resident Dashboard Access ===")
        
        if not self.test_token:
            self.log_result("Resident Dashboard Access", False, "No test user token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.test_token)
            response = self.session.get(f"{BASE_URL}/dashboard/resident", headers=headers)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    self.log_result("Resident Dashboard Access", True, 
                                  f"✅ RESIDENT DASHBOARD ACCESSIBLE - Keys: {list(data.keys())}")
                    return True
                except json.JSONDecodeError as e:
                    self.log_result("Resident Dashboard Access", False, 
                                  f"❌ JSON DECODE ERROR - Response not valid JSON: {str(e)}")
                    return False
            else:
                self.log_result("Resident Dashboard Access", False, 
                              f"❌ RESIDENT DASHBOARD ACCESS FAILED - Status {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Resident Dashboard Access", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def test_general_dashboard_routing(self):
        """Test general dashboard endpoint with role-based routing"""
        print("\n=== Testing General Dashboard Routing ===")
        
        if not self.admin_token or not self.test_token:
            self.log_result("General Dashboard Routing", False, "Missing tokens for testing")
            return False
        
        try:
            # Test admin user gets admin dashboard
            admin_headers = self.setup_auth_headers(self.admin_token)
            admin_response = self.session.get(f"{BASE_URL}/dashboard", headers=admin_headers)
            
            # Test resident user gets resident dashboard
            resident_headers = self.setup_auth_headers(self.test_token)
            resident_response = self.session.get(f"{BASE_URL}/dashboard", headers=resident_headers)
            
            admin_success = admin_response.status_code == 200
            resident_success = resident_response.status_code == 200
            
            if admin_success and resident_success:
                self.log_result("General Dashboard Routing", True, 
                              "✅ ROLE-BASED DASHBOARD ROUTING WORKING")
                return True
            else:
                self.log_result("General Dashboard Routing", False, 
                              f"❌ ROUTING FAILED - Admin: {admin_response.status_code}, "
                              f"Resident: {resident_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("General Dashboard Routing", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def print_summary(self):
        """Print comprehensive summary"""
        print("\n" + "="*80)
        print("AUTHENTICATION BACKEND TEST SUMMARY")
        print("="*80)
        
        passed_tests = [r for r in self.results if "✅ PASS" in r["status"]]
        failed_tests = [r for r in self.results if "❌ FAIL" in r["status"]]
        
        print(f"\n📊 OVERALL RESULTS:")
        print(f"   ✅ Passed: {len(passed_tests)}")
        print(f"   ❌ Failed: {len(failed_tests)}")
        print(f"   📈 Success Rate: {len(passed_tests)/(len(passed_tests)+len(failed_tests))*100:.1f}%")
        
        print(f"\n🔑 VERIFIED WORKING CREDENTIALS:")
        if self.admin_token:
            print(f"   👤 Admin User: username=admin, password=admin123 ✅")
        if self.test_token:
            print(f"   👤 Test User: username=test, password=test123 ✅")
        
        print(f"\n🌐 AUTHENTICATION ENDPOINTS:")
        print(f"   🔗 Login: {BASE_URL}/auth/login")
        print(f"   🔗 Current User: {BASE_URL}/auth/me")
        print(f"   🔗 Admin Dashboard: {BASE_URL}/dashboard/admin")
        print(f"   🔗 Resident Dashboard: {BASE_URL}/dashboard/resident")
        
        if failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['message']}")
        
        print(f"\n✅ SUCCESSFUL TESTS:")
        for test in passed_tests:
            print(f"   • {test['test']}: {test['message']}")

    def run_all_tests(self):
        """Run all authentication tests"""
        print("🔐 STARTING AUTHENTICATION BACKEND TESTS")
        print("="*80)
        
        # Core authentication tests
        self.test_admin_login()
        self.test_test_user_login()
        self.test_invalid_credentials()
        self.test_token_validation()
        
        # Access control tests
        self.test_admin_dashboard_access()
        self.test_user_management_access()
        self.test_resident_access_control()
        self.test_resident_dashboard_access()
        self.test_general_dashboard_routing()
        
        # Print summary
        self.print_summary()
        
        # Return success status
        passed_count = len([r for r in self.results if "✅ PASS" in r["status"]])
        total_count = len(self.results)
        
        return passed_count == total_count

def main():
    """Main function to run all tests"""
    suite = AuthBackendTestSuite()
    success = suite.run_all_tests()
    
    if success:
        print("\n🎉 ALL AUTHENTICATION TESTS PASSED!")
        print("The authentication system is working correctly.")
        print("User can login with admin/admin123 or test/test123")
    else:
        print("\n💥 SOME AUTHENTICATION TESTS FAILED!")
        print("Please check the error messages above for details.")
    
    return success

if __name__ == "__main__":
    main()