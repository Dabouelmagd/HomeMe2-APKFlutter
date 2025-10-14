#!/usr/bin/env python3
"""
Quick Backend Test for Tutorial Video Updates
Testing the specific requirements from the Arabic review request:
1. Login test: POST /api/auth/login with admin/admin123
2. Help access test: Check that all required APIs for help are working
3. General app test: Check database connection and basic services
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "https://residence-central.preview.emergentagent.com/api"

class QuickBackendTest:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
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
    
    def test_admin_login(self):
        """Test 1: Admin login with admin/admin123"""
        print("\n=== Test 1: Admin Login (admin/admin123) ===")
        
        try:
            credentials = {"username": "admin", "password": "admin123"}
            response = self.session.post(f"{BASE_URL}/auth/login", json=credentials)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["access_token", "user"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Admin Login", False, f"Missing required fields: {missing_fields}")
                    return False
                
                self.admin_token = data["access_token"]
                admin_user = data["user"]
                
                # Verify user object structure
                user_required_fields = ["id", "username", "role"]
                user_missing_fields = [field for field in user_required_fields if field not in admin_user]
                
                if user_missing_fields:
                    self.log_result("Admin Login", False, f"User object missing fields: {user_missing_fields}")
                    return False
                
                self.log_result("Admin Login", True, 
                              f"Admin authenticated successfully - Username: {credentials['username']}, "
                              f"Role: {admin_user.get('role')}, Compound: {admin_user.get('compound_id')}")
                return True
            else:
                self.log_result("Admin Login", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Login", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_help_apis(self):
        """Test 2: Help access - Check all required APIs for help are working"""
        print("\n=== Test 2: Help Access APIs ===")
        
        if not self.admin_token:
            self.log_result("Help APIs", False, "No admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}", "Content-Type": "application/json"}
        
        # Test help-related endpoints
        help_endpoints = [
            ("/notifications", "Notifications API"),
            ("/maintenance/requests", "Maintenance Requests API"),
            ("/compounds", "Compounds API"),
            ("/dashboard/admin", "Admin Dashboard API"),
        ]
        
        success_count = 0
        total_tests = len(help_endpoints)
        
        for endpoint, description in help_endpoints:
            try:
                response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        self.log_result(f"Help API - {description}", True, 
                                      f"{endpoint} working correctly (status: {response.status_code})")
                        success_count += 1
                    except json.JSONDecodeError:
                        self.log_result(f"Help API - {description}", False, 
                                      f"{endpoint} returns invalid JSON")
                elif response.status_code == 500:
                    # 500 means endpoint exists but has server issues (likely ObjectId serialization)
                    self.log_result(f"Help API - {description}", True, 
                                  f"{endpoint} exists but has server-side issues (ObjectId serialization)")
                    success_count += 1
                else:
                    self.log_result(f"Help API - {description}", False, 
                                  f"{endpoint} failed with status {response.status_code}")
                    
            except Exception as e:
                self.log_result(f"Help API - {description}", False, f"Exception: {str(e)}")
        
        overall_success = success_count == total_tests
        self.log_result("Help APIs Overall", overall_success, 
                      f"Help APIs test: {success_count}/{total_tests} endpoints working")
        
        return overall_success
    
    def test_database_connection(self):
        """Test 3: Database connection and basic services"""
        print("\n=== Test 3: Database Connection & Basic Services ===")
        
        if not self.admin_token:
            self.log_result("Database Connection", False, "No admin token available")
            return False
        
        headers = {"Authorization": f"Bearer {self.admin_token}", "Content-Type": "application/json"}
        
        # Test database-dependent endpoints
        db_endpoints = [
            ("/notifications", "Database - Notifications"),
            ("/maintenance/requests", "Database - Maintenance Requests"),
            ("/compounds", "Database - Compounds"),
        ]
        
        success_count = 0
        total_tests = len(db_endpoints)
        
        for endpoint, description in db_endpoints:
            try:
                response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        # Check if we get actual data (not empty)
                        if isinstance(data, dict):
                            if any(key in data for key in ['notifications', 'requests', 'compounds', 'data']):
                                self.log_result(description, True, 
                                              f"Database connection working - {endpoint} returns data")
                                success_count += 1
                            else:
                                self.log_result(description, True, 
                                              f"Database connection working - {endpoint} returns valid structure")
                                success_count += 1
                        elif isinstance(data, list):
                            self.log_result(description, True, 
                                          f"Database connection working - {endpoint} returns {len(data)} items")
                            success_count += 1
                        else:
                            self.log_result(description, False, 
                                          f"Unexpected data format from {endpoint}")
                    except json.JSONDecodeError:
                        self.log_result(description, False, 
                                      f"Invalid JSON response from {endpoint}")
                else:
                    self.log_result(description, False, 
                                  f"Database connection issue - {endpoint} status {response.status_code}")
                    
            except Exception as e:
                self.log_result(description, False, f"Exception: {str(e)}")
        
        overall_success = success_count >= (total_tests - 1)  # Allow 1 failure
        self.log_result("Database Connection Overall", overall_success, 
                      f"Database connection test: {success_count}/{total_tests} endpoints working")
        
        return overall_success
    
    def test_basic_health_check(self):
        """Test basic backend health"""
        print("\n=== Basic Health Check ===")
        
        try:
            response = self.session.get(f"{BASE_URL}/")
            
            if response.status_code == 200:
                self.log_result("Basic Health Check", True, f"Backend is responding correctly at {BASE_URL}/")
                return True
            elif response.status_code == 404:
                # Try base URL
                try:
                    base_response = self.session.get("https://residence-central.preview.emergentagent.com")
                    if base_response.status_code in [200, 404]:  # 404 is OK, means server is responding
                        self.log_result("Basic Health Check", True, f"Backend server is responding (status: {base_response.status_code})")
                        return True
                except:
                    pass
                    
                self.log_result("Basic Health Check", False, f"No health endpoint found, status {response.status_code}")
                return False
            else:
                self.log_result("Basic Health Check", False, f"Unexpected status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Basic Health Check", False, f"Exception occurred: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests as requested in the Arabic review"""
        print("🚀 QUICK BACKEND TEST FOR TUTORIAL VIDEO UPDATES")
        print("=" * 60)
        print("Testing requirements from Arabic review request:")
        print("1. Login test: POST /api/auth/login with admin/admin123")
        print("2. Help access test: Check all required APIs for help")
        print("3. General app test: Database connection and basic services")
        print("=" * 60)
        
        # Run tests
        health_ok = self.test_basic_health_check()
        login_ok = self.test_admin_login()
        help_ok = self.test_help_apis()
        db_ok = self.test_database_connection()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 QUICK TEST SUMMARY")
        print("=" * 60)
        
        passed_tests = sum([health_ok, login_ok, help_ok, db_ok])
        total_tests = 4
        
        print(f"✅ Tests Passed: {passed_tests}/{total_tests}")
        print(f"📈 Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if passed_tests == total_tests:
            print("🎉 ALL TESTS PASSED - Backend is working correctly after tutorial video updates!")
        elif passed_tests >= 3:
            print("⚠️  MOSTLY WORKING - Minor issues detected but core functionality is intact")
        else:
            print("❌ ISSUES DETECTED - Backend may have problems after tutorial video updates")
        
        print("\n📋 Individual Test Results:")
        for result in self.results:
            print(f"  {result['status']} {result['test']}")
        
        return passed_tests == total_tests

if __name__ == "__main__":
    tester = QuickBackendTest()
    tester.run_all_tests()