#!/usr/bin/env python3
"""
Backend Services Management Test Suite
Tests the Services Management backend APIs and initialize services functionality
"""

import asyncio
import json
import requests
import websockets
import uuid
import io
import os
import base64
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional
from PIL import Image

# Configuration
BASE_URL = "https://homeme-platform.preview.emergentagent.com/api"
WS_URL = "wss://compound-hub.preview.emergentagent.com/ws/chat"

class ServicesManagementTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.resident_token = None
        self.admin_user = None
        self.resident_user = None
        self.compound_id = None
        self.test_service_id = None
        self.test_provider_id = None
        self.test_booking_id = None
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
    
    def create_test_image(self, filename: str, size: tuple = (100, 100)) -> io.BytesIO:
        """Create a test image for upload testing"""
        img = Image.new('RGB', size, color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes
    
    def test_admin_authentication(self):
        """Test admin authentication for services management"""
        print("\n=== Testing Admin Authentication ===")
        
        try:
            admin_login_data = {
                "username": "johndoe",
                "password": "password123"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=admin_login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                self.admin_user = data["user"]
                self.compound_id = self.admin_user["compound_id"]
                self.log_result("Admin Authentication", True, "Admin authenticated successfully")
                return True
            else:
                self.log_result("Admin Authentication", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Authentication", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_resident_authentication(self):
        """Test resident authentication for services booking"""
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
                self.log_result("Resident Authentication", True, "Resident authenticated successfully")
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
    
    def test_get_compound_services(self):
        """Test GET /api/compounds/{compound_id}/services - Get all services"""
        print("\n=== Testing Get Compound Services ===")
        
        if not self.admin_token or not self.compound_id:
            self.log_result("Get Compound Services", False, "No admin token or compound ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}/services", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                services = data.get("services", [])
                self.log_result("Get Compound Services", True, f"Retrieved {len(services)} services successfully")
                return True
            else:
                self.log_result("Get Compound Services", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Compound Services", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_service(self):
        """Test POST /api/compounds/{compound_id}/services - Create new service"""
        print("\n=== Testing Create Service ===")
        
        if not self.admin_token or not self.compound_id:
            self.log_result("Create Service", False, "No admin token or compound ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            service_data = {
                "name": "Test Plumbing Service",
                "category": "maintenance",
                "specialty": "plumber",
                "description": "Professional plumbing services for all your needs",
                "phone": "+1234567890",
                "email": "plumber@example.com",
                "working_hours": "8:00 AM - 6:00 PM"
            }
            
            response = self.session.post(f"{BASE_URL}/compounds/{self.compound_id}/services", 
                                       json=service_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Service created successfully" and result.get("service_id"):
                    self.test_service_id = result.get("service_id")
                    self.log_result("Create Service", True, f"Service created successfully with ID: {self.test_service_id}")
                    return True
                else:
                    self.log_result("Create Service", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Create Service", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Service", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_update_service(self):
        """Test PUT /api/compounds/{compound_id}/services/{service_id} - Update service"""
        print("\n=== Testing Update Service ===")
        
        if not self.test_service_id:
            self.log_result("Update Service", False, "No test service ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Include all required fields for update
            update_data = {
                "name": "Updated Test Plumbing Service",
                "category": "maintenance",
                "specialty": "plumber",
                "description": "Updated professional plumbing services",
                "working_hours": "9:00 AM - 5:00 PM"
            }
            
            response = self.session.put(f"{BASE_URL}/compounds/{self.compound_id}/services/{self.test_service_id}", 
                                      json=update_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Service updated successfully":
                    self.log_result("Update Service", True, "Service updated successfully")
                    return True
                else:
                    self.log_result("Update Service", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Update Service", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Update Service", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_delete_service(self):
        """Test DELETE /api/compounds/{compound_id}/services/{service_id} - Delete service"""
        print("\n=== Testing Delete Service ===")
        
        if not self.test_service_id:
            self.log_result("Delete Service", False, "No test service ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            response = self.session.delete(f"{BASE_URL}/compounds/{self.compound_id}/services/{self.test_service_id}", 
                                         headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Service deleted successfully":
                    self.log_result("Delete Service", True, "Service deleted successfully")
                    return True
                else:
                    self.log_result("Delete Service", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Delete Service", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Delete Service", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_initialize_default_services(self):
        """Test POST /api/admin/initialize-services - Initialize default services"""
        print("\n=== Testing Initialize Default Services ===")
        
        if not self.admin_token or not self.compound_id:
            self.log_result("Initialize Default Services", False, "No admin token or compound ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            init_data = {
                "compound_id": self.compound_id
            }
            
            response = self.session.post(f"{BASE_URL}/admin/initialize-services", 
                                       json=init_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Default services initialized successfully":
                    added_count = result.get("added_count", 0)
                    self.log_result("Initialize Default Services", True, f"Default services initialized successfully. Added {added_count} services")
                    return True
                elif result.get("success") == False and "already exist" in result.get("message", ""):
                    # Services already exist - this is expected behavior
                    self.log_result("Initialize Default Services", True, "Default services already exist (expected behavior)")
                    return True
                else:
                    self.log_result("Initialize Default Services", False, f"Unexpected response: {result}")
                    return False
            elif response.status_code == 400:
                # Check if it's already initialized
                result = response.json()
                if "already initialized" in result.get("detail", "").lower():
                    self.log_result("Initialize Default Services", True, "Default services already initialized (expected behavior)")
                    return True
                else:
                    self.log_result("Initialize Default Services", False, f"Bad request: {result}")
                    return False
            else:
                self.log_result("Initialize Default Services", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Initialize Default Services", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_service_providers(self):
        """Test GET /api/service-providers - Get service providers"""
        print("\n=== Testing Get Service Providers ===")
        
        if not self.admin_token:
            self.log_result("Get Service Providers", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/service-providers", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                providers = data.get("providers", [])
                self.log_result("Get Service Providers", True, f"Retrieved {len(providers)} service providers successfully")
                return True
            else:
                self.log_result("Get Service Providers", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Service Providers", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_service_provider(self):
        """Test POST /api/service-providers - Create service provider (Admin only)"""
        print("\n=== Testing Create Service Provider ===")
        
        if not self.admin_token:
            self.log_result("Create Service Provider", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Generate unique email to avoid duplicates
            unique_id = str(uuid.uuid4())[:8]
            provider_data = {
                "full_name": f"John Smith {unique_id}",
                "email": f"johnsmith{unique_id}@example.com",
                "phone": "+1234567890",
                "services": ["maintenance", "cleaning"],
                "specialties": ["plumber", "electrician"],
                "bio": "Experienced maintenance professional",
                "hourly_rate": 50.0
            }
            
            response = self.session.post(f"{BASE_URL}/service-providers", 
                                       json=provider_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Service provider created successfully":
                    # Check for provider_id or provider.id
                    provider_id = result.get("provider_id") or (result.get("provider", {}).get("id"))
                    if provider_id:
                        self.test_provider_id = provider_id
                        self.log_result("Create Service Provider", True, f"Service provider created successfully with ID: {self.test_provider_id}")
                        return True
                    else:
                        self.log_result("Create Service Provider", False, f"No provider ID in response: {result}")
                        return False
                else:
                    self.log_result("Create Service Provider", False, f"Unexpected response: {result}")
                    return False
            elif response.status_code == 400 and "already exists" in response.text:
                # Provider already exists, try to get existing providers and use one
                self.log_result("Create Service Provider", True, "Service provider already exists (expected behavior)")
                return self.get_existing_provider_id()
            else:
                self.log_result("Create Service Provider", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Service Provider", False, f"Exception occurred: {str(e)}")
            return False
    
    def get_existing_provider_id(self):
        """Get an existing provider ID for testing"""
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/service-providers", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                providers = data.get("providers", [])
                if providers:
                    self.test_provider_id = providers[0]["id"]
                    return True
            return False
        except:
            return False
    
    def test_create_service_booking(self):
        """Test POST /api/service-bookings - Create booking"""
        print("\n=== Testing Create Service Booking ===")
        
        if not self.resident_token or not self.test_provider_id:
            self.log_result("Create Service Booking", False, "No resident token or provider ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            
            booking_data = {
                "provider_id": self.test_provider_id,
                "service_category": "maintenance",
                "service_specialty": "plumber",
                "title": "Fix Kitchen Sink",
                "description": "Kitchen sink is leaking and needs repair",
                "priority": "standard",
                "scheduled_date": (datetime.now() + timedelta(days=1)).date().isoformat(),
                "scheduled_time": "10:00",
                "scheduled_end_time": "12:00",
                "payment_method": "cash",
                "booking_notes": "Please call before arriving"
            }
            
            response = self.session.post(f"{BASE_URL}/service-bookings", 
                                       json=booking_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Service booking created successfully" and result.get("booking_id"):
                    self.test_booking_id = result.get("booking_id")
                    self.log_result("Create Service Booking", True, f"Service booking created successfully with ID: {self.test_booking_id}")
                    return True
                else:
                    self.log_result("Create Service Booking", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Create Service Booking", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Service Booking", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_service_bookings(self):
        """Test GET /api/service-bookings - Get bookings"""
        print("\n=== Testing Get Service Bookings ===")
        
        if not self.resident_token:
            self.log_result("Get Service Bookings", False, "No resident token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/service-bookings", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                bookings = data.get("bookings", [])
                self.log_result("Get Service Bookings", True, f"Retrieved {len(bookings)} service bookings successfully")
                return True
            else:
                self.log_result("Get Service Bookings", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Service Bookings", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_authentication_issues(self):
        """Test authentication issues - 401 Unauthorized errors"""
        print("\n=== Testing Authentication Issues ===")
        
        success_count = 0
        total_tests = 0
        
        # Test 1: Access services without token
        try:
            total_tests += 1
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}/services")
            
            if response.status_code == 401 or response.status_code == 403:
                self.log_result("Auth Test - No Token", True, f"Correctly rejected request without token (status: {response.status_code})")
                success_count += 1
            else:
                self.log_result("Auth Test - No Token", False, f"Expected 401/403, got {response.status_code}")
        except Exception as e:
            self.log_result("Auth Test - No Token", False, f"Exception occurred: {str(e)}")
        
        # Test 2: Access admin endpoint with invalid token
        try:
            total_tests += 1
            invalid_headers = {"Authorization": "Bearer invalid_token_12345"}
            response = self.session.post(f"{BASE_URL}/admin/initialize-services", 
                                       json={"compound_id": self.compound_id}, 
                                       headers=invalid_headers)
            
            if response.status_code == 401:
                self.log_result("Auth Test - Invalid Token", True, "Correctly rejected request with invalid token")
                success_count += 1
            else:
                self.log_result("Auth Test - Invalid Token", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_result("Auth Test - Invalid Token", False, f"Exception occurred: {str(e)}")
        
        # Test 3: Access admin endpoint with resident token
        if self.resident_token:
            try:
                total_tests += 1
                resident_headers = self.setup_auth_headers(self.resident_token)
                response = self.session.post(f"{BASE_URL}/admin/initialize-services", 
                                           json={"compound_id": self.compound_id}, 
                                           headers=resident_headers)
                
                if response.status_code == 403:
                    self.log_result("Auth Test - Resident Access Admin", True, "Correctly denied resident access to admin endpoint")
                    success_count += 1
                else:
                    self.log_result("Auth Test - Resident Access Admin", False, f"Expected 403, got {response.status_code}")
            except Exception as e:
                self.log_result("Auth Test - Resident Access Admin", False, f"Exception occurred: {str(e)}")
        
        return success_count == total_tests
    
    def run_all_tests(self):
        """Run all services management tests"""
        print("🔧 STARTING SERVICES MANAGEMENT BACKEND TESTING")
        print("=" * 60)
        
        # Authentication tests
        if not self.test_admin_authentication():
            print("❌ Admin authentication failed - stopping tests")
            return self.print_summary()
        
        if not self.test_resident_authentication():
            print("⚠️ Resident authentication failed - some tests may be skipped")
        
        # Services API tests
        self.test_get_compound_services()
        self.test_create_service()
        self.test_update_service()
        self.test_delete_service()
        
        # Initialize services test
        self.test_initialize_default_services()
        
        # Service providers tests
        self.test_create_service_provider()
        self.test_get_service_providers()
        
        # Service booking tests
        self.test_create_service_booking()
        self.test_get_service_bookings()
        
        # Authentication issues test
        self.test_authentication_issues()
        
        return self.print_summary()
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("🔧 SERVICES MANAGEMENT BACKEND TEST RESULTS")
        print("=" * 60)
        
        passed = sum(1 for result in self.results if "✅ PASS" in result["status"])
        failed = sum(1 for result in self.results if "❌ FAIL" in result["status"])
        total = len(self.results)
        
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"📊 OVERALL RESULTS: {passed}/{total} tests passed ({success_rate:.1f}% success rate)")
        print()
        
        # Print failed tests first
        failed_tests = [r for r in self.results if "❌ FAIL" in r["status"]]
        if failed_tests:
            print("❌ FAILED TESTS:")
            for result in failed_tests:
                print(f"   • {result['test']}: {result['message']}")
                if result['details']:
                    print(f"     Details: {result['details']}")
            print()
        
        # Print passed tests
        passed_tests = [r for r in self.results if "✅ PASS" in r["status"]]
        if passed_tests:
            print("✅ PASSED TESTS:")
            for result in passed_tests:
                print(f"   • {result['test']}: {result['message']}")
            print()
        
        return success_rate >= 80  # Consider 80%+ as success

if __name__ == "__main__":
    test_suite = ServicesManagementTestSuite()
    success = test_suite.run_all_tests()
    
    if success:
        print("\n🎉 SERVICES MANAGEMENT TESTING COMPLETED SUCCESSFULLY!")
    else:
        print("\n⚠️ SERVICES MANAGEMENT TESTING COMPLETED WITH ISSUES")
    
    exit(0 if success else 1)