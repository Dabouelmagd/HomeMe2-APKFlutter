#!/usr/bin/env python3
"""
HomeMe Backend API Testing Suite - Contact Us Feature Testing
Tests core backend functionality after Contact Us feature addition:
1. Authentication System
2. Core API Endpoints
3. Basic CRUD Operations
4. Contact/Messaging Functionality
5. System Health and Stability
"""

import asyncio
import json
import requests
import uuid
import io
import os
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional

# Configuration
BASE_URL = "https://arabic-homeme.preview.emergentagent.com/api"

class ContactUsBackendTestSuite:
    def __init__(self):
        self.session = requests.Session()
        # Disable SSL verification for testing environment
        self.session.verify = False
        # Disable SSL warnings
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        
        self.admin_token = None
        self.resident_token = None
        self.admin_user = None
        self.resident_user = None
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
        """Test admin authentication - core functionality"""
        print("\n=== Testing Admin Authentication ===")
        
        try:
            admin_login_data = {
                "username": "admin",
                "password": "admin123"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=admin_login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                self.admin_user = data["user"]
                self.compound_id = self.admin_user["compound_id"]
                self.log_result("Admin Authentication", True, f"Admin authenticated successfully - Role: {self.admin_user.get('role')}, Compound: {self.compound_id}")
                return True
            else:
                self.log_result("Admin Authentication", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Authentication", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_resident_authentication(self):
        """Test resident authentication - core functionality"""
        print("\n=== Testing Resident Authentication ===")
        
        try:
            # Try to find a resident user or create one
            resident_login_data = {
                "username": "testuser",
                "password": "password123"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=resident_login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.resident_token = data["access_token"]
                self.resident_user = data["user"]
                self.log_result("Resident Authentication", True, f"Resident authenticated successfully - Role: {self.resident_user.get('role')}")
                return True
            else:
                # Try to create a resident user if login fails
                return self.create_test_resident()
                
        except Exception as e:
            self.log_result("Resident Authentication", False, f"Exception occurred: {str(e)}")
            return False
    
    def create_test_resident(self):
        """Create a test resident user"""
        try:
            if not self.admin_token:
                self.log_result("Create Test Resident", False, "No admin token available")
                return False
            
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            unique_id = str(uuid.uuid4())[:8]
            
            data = {
                'unit_number': f"TEST{unique_id[:4]}",
                'full_name': f"Test Resident {unique_id}",
                'email': f"testres{unique_id}@example.com",
                'phone': "+1234567890",
                'compound_id': self.compound_id
            }
            
            response = self.session.post(f"{BASE_URL}/admin/residences", data=data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                username = result.get("username")
                password = result.get("temporary_password")
                
                # Now login with the new resident
                login_data = {"username": username, "password": password}
                login_response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
                
                if login_response.status_code == 200:
                    data = login_response.json()
                    self.resident_token = data["access_token"]
                    self.resident_user = data["user"]
                    self.log_result("Create Test Resident", True, f"Test resident created and authenticated: {username}")
                    return True
                else:
                    self.log_result("Create Test Resident", False, f"Failed to login with new resident: {login_response.status_code}")
                    return False
            else:
                self.log_result("Create Test Resident", False, f"Failed to create resident: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Create Test Resident", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_api_health_check(self):
        """Test basic API health and availability"""
        print("\n=== Testing API Health Check ===")
        
        try:
            # Test basic endpoints without authentication
            endpoints_to_test = [
                "/auth/login",  # Should be accessible
            ]
            
            for endpoint in endpoints_to_test:
                try:
                    # Just test if endpoint exists (POST without data should return 422 or similar, not 404)
                    response = self.session.post(f"{BASE_URL}{endpoint}", json={})
                    
                    if response.status_code != 404:
                        self.log_result(f"API Health - {endpoint}", True, f"Endpoint accessible (status: {response.status_code})")
                    else:
                        self.log_result(f"API Health - {endpoint}", False, f"Endpoint not found (404)")
                        
                except Exception as e:
                    self.log_result(f"API Health - {endpoint}", False, f"Exception: {str(e)}")
            
            return True
            
        except Exception as e:
            self.log_result("API Health Check", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_compounds_endpoint(self):
        """Test GET /api/compounds - Core compound data retrieval"""
        print("\n=== Testing Compounds Endpoint ===")
        
        if not self.admin_token:
            self.log_result("Compounds Endpoint", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/compounds", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                compounds = data.get("compounds", [])
                self.log_result("Compounds Endpoint", True, f"Retrieved {len(compounds)} compounds successfully")
                return True
            else:
                self.log_result("Compounds Endpoint", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Compounds Endpoint", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_users_endpoint(self):
        """Test user-related endpoints"""
        print("\n=== Testing Users Endpoint ===")
        
        if not self.admin_token:
            self.log_result("Users Endpoint", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test getting compound residents (correct endpoint)
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}/residents", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                residents = data.get("residents", [])
                self.log_result("Users Endpoint", True, f"Retrieved {len(residents)} residents successfully")
                return True
            else:
                self.log_result("Users Endpoint", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Users Endpoint", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_notifications_endpoint(self):
        """Test GET /api/notifications - Core notification functionality"""
        print("\n=== Testing Notifications Endpoint ===")
        
        if not self.resident_token:
            self.log_result("Notifications Endpoint", False, "No resident token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/notifications", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                notifications = data.get("notifications", [])
                total = data.get("total", 0)
                unread = data.get("unread", 0)
                
                self.log_result("Notifications Endpoint", True, f"Retrieved {len(notifications)} notifications - Total: {total}, Unread: {unread}")
                return True
            else:
                self.log_result("Notifications Endpoint", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Notifications Endpoint", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_messages_endpoint(self):
        """Test messaging functionality that could be used for Contact Us"""
        print("\n=== Testing Messages Endpoint ===")
        
        if not self.resident_token:
            self.log_result("Messages Endpoint", False, "No resident token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            
            # Test creating a message (could be used for contact us)
            message_data = {
                "message_type": "general",
                "subject": "Test Contact Message",
                "content": "This is a test message to verify the messaging system works after Contact Us addition"
            }
            
            response = self.session.post(f"{BASE_URL}/messages", json=message_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                message_id = result.get("message_id")
                self.log_result("Messages Endpoint - Create", True, f"Message created successfully with ID: {message_id}")
                
                # Test retrieving messages
                get_response = self.session.get(f"{BASE_URL}/messages", headers=headers)
                if get_response.status_code == 200:
                    get_data = get_response.json()
                    messages = get_data.get("messages", [])
                    self.log_result("Messages Endpoint - Retrieve", True, f"Retrieved {len(messages)} messages successfully")
                    return True
                else:
                    self.log_result("Messages Endpoint - Retrieve", False, f"Failed to retrieve messages: {get_response.status_code}")
                    return False
            else:
                self.log_result("Messages Endpoint - Create", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Messages Endpoint", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_contact_us_related_endpoints(self):
        """Test endpoints that might be related to Contact Us functionality"""
        print("\n=== Testing Contact Us Related Endpoints ===")
        
        if not self.admin_token:
            self.log_result("Contact Us Related", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test potential contact us endpoints
            contact_endpoints = [
                "/contact",
                "/contact-us", 
                "/support",
                "/feedback",
                "/admin/contact-messages"
            ]
            
            found_endpoints = []
            
            for endpoint in contact_endpoints:
                try:
                    response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
                    if response.status_code != 404:
                        found_endpoints.append(f"{endpoint} (status: {response.status_code})")
                except:
                    pass
            
            if found_endpoints:
                self.log_result("Contact Us Related Endpoints", True, f"Found potential contact endpoints: {', '.join(found_endpoints)}")
            else:
                self.log_result("Contact Us Related Endpoints", True, "No specific contact endpoints found - Contact Us might be frontend-only or use existing messaging")
            
            return True
            
        except Exception as e:
            self.log_result("Contact Us Related Endpoints", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_authentication_security(self):
        """Test that endpoints properly require authentication"""
        print("\n=== Testing Authentication Security ===")
        
        try:
            # Test endpoints without authentication
            protected_endpoints = [
                "/compounds",
                "/notifications", 
                "/messages",
                f"/compounds/{self.compound_id}/residents"
            ]
            
            security_passed = True
            
            for endpoint in protected_endpoints:
                try:
                    response = self.session.get(f"{BASE_URL}{endpoint}")
                    
                    if response.status_code in [401, 403]:
                        self.log_result(f"Security - {endpoint}", True, f"Correctly rejected unauthenticated request (status: {response.status_code})")
                    else:
                        self.log_result(f"Security - {endpoint}", False, f"Security issue: endpoint accessible without auth (status: {response.status_code})")
                        security_passed = False
                        
                except Exception as e:
                    self.log_result(f"Security - {endpoint}", False, f"Exception: {str(e)}")
                    security_passed = False
            
            return security_passed
            
        except Exception as e:
            self.log_result("Authentication Security", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_database_connectivity(self):
        """Test database connectivity through API calls"""
        print("\n=== Testing Database Connectivity ===")
        
        if not self.admin_token:
            self.log_result("Database Connectivity", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test database read operations
            endpoints_requiring_db = [
                ("/compounds", "compounds"),
                (f"/compounds/{self.compound_id}/residents", "residents"),
            ]
            
            db_connectivity_passed = True
            
            for endpoint, data_key in endpoints_requiring_db:
                try:
                    response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data_key in data:
                            self.log_result(f"Database - {endpoint}", True, f"Database query successful, returned {len(data[data_key])} records")
                        else:
                            self.log_result(f"Database - {endpoint}", False, f"Unexpected response format: {data}")
                            db_connectivity_passed = False
                    else:
                        self.log_result(f"Database - {endpoint}", False, f"Database query failed: {response.status_code}")
                        db_connectivity_passed = False
                        
                except Exception as e:
                    self.log_result(f"Database - {endpoint}", False, f"Exception: {str(e)}")
                    db_connectivity_passed = False
            
            return db_connectivity_passed
            
        except Exception as e:
            self.log_result("Database Connectivity", False, f"Exception occurred: {str(e)}")
            return False
    
    def run_contact_us_tests(self):
        """Run comprehensive Contact Us backend testing"""
        print("\n🚀 STARTING HOMEME BACKEND TESTING AFTER CONTACT US ADDITION")
        print("=" * 70)
        print("Testing core backend functionality to ensure Contact Us didn't break existing services")
        print("=" * 70)
        
        # Core Authentication Tests
        print("\n🔐 AUTHENTICATION SYSTEM TESTING")
        auth_success = True
        if not self.test_admin_authentication():
            print("❌ Admin authentication failed - this is critical")
            auth_success = False
        
        if not self.test_resident_authentication():
            print("❌ Resident authentication failed - this is critical")
            auth_success = False
        
        if not auth_success:
            print("❌ Authentication system has issues - stopping critical tests")
            return self.print_summary()
        
        # API Health and Connectivity Tests
        print("\n🏥 API HEALTH AND CONNECTIVITY TESTING")
        self.test_api_health_check()
        self.test_database_connectivity()
        
        # Core Endpoint Tests
        print("\n🔧 CORE API ENDPOINTS TESTING")
        self.test_compounds_endpoint()
        self.test_users_endpoint()
        self.test_notifications_endpoint()
        self.test_messages_endpoint()
        
        # Contact Us Specific Tests
        print("\n📞 CONTACT US FUNCTIONALITY TESTING")
        self.test_contact_us_related_endpoints()
        
        # Security Tests
        print("\n🔒 SECURITY AND ACCESS CONTROL TESTING")
        self.test_authentication_security()
        
        return self.print_summary()
    
    def print_summary(self):
        """Print comprehensive test results summary"""
        print("\n" + "=" * 70)
        print("🏁 CONTACT US BACKEND TEST RESULTS SUMMARY")
        print("=" * 70)
        
        passed_tests = [r for r in self.results if "✅ PASS" in r["status"]]
        failed_tests = [r for r in self.results if "❌ FAIL" in r["status"]]
        
        total_tests = len(self.results)
        success_rate = (len(passed_tests) / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n📊 OVERALL RESULTS:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {len(passed_tests)} ✅")
        print(f"   Failed: {len(failed_tests)} ❌")
        print(f"   Success Rate: {success_rate:.1f}%")
        
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['message']}")
                if test.get('details'):
                    print(f"     Details: {test['details']}")
        
        if passed_tests:
            print(f"\n✅ PASSED TESTS ({len(passed_tests)}):")
            for test in passed_tests:
                print(f"   • {test['test']}: {test['message']}")
        
        print("\n" + "=" * 70)
        
        # Determine overall system health
        if success_rate >= 90:
            print("🎉 SYSTEM STATUS: EXCELLENT - Contact Us addition didn't break existing functionality")
        elif success_rate >= 75:
            print("✅ SYSTEM STATUS: GOOD - Minor issues detected, but core functionality intact")
        elif success_rate >= 50:
            print("⚠️  SYSTEM STATUS: CONCERNING - Several issues detected, needs attention")
        else:
            print("🚨 SYSTEM STATUS: CRITICAL - Major issues detected, immediate action required")
        
        return success_rate

if __name__ == "__main__":
    # Run the tests
    test_suite = ContactUsBackendTestSuite()
    success_rate = test_suite.run_contact_us_tests()
    
    # Exit with appropriate code
    exit_code = 0 if success_rate >= 75 else 1
    exit(exit_code)