#!/usr/bin/env python3
"""
HomeMe Guest Management System Testing Suite
Tests the complete QR visitor workflow:
1. Visit Request Management
2. Guest Approval/Rejection
3. QR Code Generation and Scanning
4. Guest Check-in/Check-out
5. Guest Statistics and Management
"""

import asyncio
import json
import requests
import uuid
import io
import os
import base64
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional

# Configuration
BASE_URL = "https://community-ui-fixes.preview.emergentagent.com/api"

class GuestManagementTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.resident_token = None
        self.admin_user = None
        self.resident_user = None
        self.compound_id = None
        self.test_visit_request_id = None
        self.test_guest_id = None
        self.test_qr_data = None
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
        """Test admin authentication for guest management"""
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
        """Test resident authentication for visit requests"""
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
                'unit_number': f"GUEST{unique_id[:4]}",
                'full_name': f"Guest Test Resident {unique_id}",
                'email': f"guestres{unique_id}@example.com",
                'phone': "+1234567890",
                'compound_id': self.compound_id
            }
            
            response = self.session.post(f"{BASE_URL}/admin/residences", data=data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                username = result.get("username")
                password = result.get("temporary_password")
                
                # Store the unit number for later use
                self.test_unit_number = data['unit_number']
                
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
    
    def test_create_visit_request(self):
        """Test POST /api/visit-requests - Create visit request"""
        print("\n=== Testing Create Visit Request ===")
        
        if not self.resident_token:
            self.log_result("Create Visit Request", False, "No resident token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.resident_token}"}
            
            # Prepare form data for visit request
            visit_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
            
            data = {
                'visitor_name': 'John Smith',
                'visitor_phone': '+1234567890',
                'visitor_email': 'john.smith@example.com',
                'visitor_id_number': 'ID123456789',
                'visit_purpose': 'family_visit',
                'visit_date': visit_date,
                'unit_number': self.test_unit_number,
                'host_name': self.resident_user.get('full_name', 'Test Host'),
                'host_phone': '+1234567890',
                'special_instructions': 'Please call upon arrival',
                'vehicle_plate': 'ABC123',
                'escort_required': False,
                'pre_approved': False
            }
            
            response = self.session.post(f"{BASE_URL}/visit-requests", data=data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Visit request created successfully":
                    self.test_visit_request_id = result.get("request_id")
                    self.log_result("Create Visit Request", True, f"Visit request created successfully with ID: {self.test_visit_request_id}")
                    return True
                else:
                    self.log_result("Create Visit Request", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Create Visit Request", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Visit Request", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_visit_requests(self):
        """Test GET /api/visit-requests - Get visit requests"""
        print("\n=== Testing Get Visit Requests ===")
        
        if not self.admin_token:
            self.log_result("Get Visit Requests", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/visit-requests", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                requests = data.get("requests", [])
                self.log_result("Get Visit Requests", True, f"Retrieved {len(requests)} visit requests")
                
                # Verify our test request is in the list
                if self.test_visit_request_id:
                    found_request = any(req.get("id") == self.test_visit_request_id for req in requests)
                    if found_request:
                        self.log_result("Visit Request Visibility", True, "Test visit request found in admin view")
                    else:
                        self.log_result("Visit Request Visibility", False, "Test visit request not found in admin view")
                
                return True
            else:
                self.log_result("Get Visit Requests", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Visit Requests", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_approve_visit_request(self):
        """Test PATCH /api/visit-requests/{id}/approve - Approve visit request"""
        print("\n=== Testing Approve Visit Request ===")
        
        if not self.admin_token or not self.test_visit_request_id:
            self.log_result("Approve Visit Request", False, "No admin token or visit request ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.patch(f"{BASE_URL}/visit-requests/{self.test_visit_request_id}/approve", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Visit request approved successfully":
                    qr_data = result.get("qr_data")
                    if qr_data:
                        self.test_qr_data = json.dumps(qr_data)
                        self.test_guest_id = self.test_visit_request_id  # Guest ID is same as request ID
                        self.log_result("Approve Visit Request", True, f"Visit request approved successfully with QR data generated")
                        return True
                    else:
                        self.log_result("Approve Visit Request", False, "No QR data in approval response")
                        return False
                else:
                    self.log_result("Approve Visit Request", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Approve Visit Request", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Approve Visit Request", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_reject_visit_request(self):
        """Test PATCH /api/visit-requests/{id}/reject - Reject visit request"""
        print("\n=== Testing Reject Visit Request ===")
        
        # First create another visit request to reject
        if not self.resident_token:
            self.log_result("Reject Visit Request", False, "No resident token available")
            return False
        
        try:
            # Create a new visit request to reject
            headers = {"Authorization": f"Bearer {self.resident_token}"}
            visit_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d %H:%M:%S")
            
            data = {
                'visitor_name': 'Jane Doe',
                'visitor_phone': '+1987654321',
                'visit_purpose': 'business_meeting',
                'visit_date': visit_date,
                'unit_number': self.test_unit_number,
                'host_name': self.resident_user.get('full_name', 'Test Host'),
                'host_phone': '+1234567890'
            }
            
            response = self.session.post(f"{BASE_URL}/visit-requests", data=data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                reject_request_id = result.get("request_id")
                
                if reject_request_id:
                    # Now reject this request as admin
                    admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
                    reject_data = {'reason': 'Security concerns'}
                    
                    reject_response = self.session.patch(
                        f"{BASE_URL}/visit-requests/{reject_request_id}/reject", 
                        data=reject_data, 
                        headers=admin_headers
                    )
                    
                    if reject_response.status_code == 200:
                        reject_result = reject_response.json()
                        if reject_result.get("message") == "Visit request rejected successfully":
                            self.log_result("Reject Visit Request", True, f"Visit request rejected successfully")
                            return True
                        else:
                            self.log_result("Reject Visit Request", False, f"Unexpected rejection response: {reject_result}")
                            return False
                    else:
                        self.log_result("Reject Visit Request", False, f"Failed to reject with status {reject_response.status_code}")
                        return False
                else:
                    self.log_result("Reject Visit Request", False, "No request ID from creation")
                    return False
            else:
                self.log_result("Reject Visit Request", False, f"Failed to create request for rejection: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Reject Visit Request", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_guests(self):
        """Test GET /api/guests - Get approved guests"""
        print("\n=== Testing Get Approved Guests ===")
        
        if not self.admin_token:
            self.log_result("Get Approved Guests", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/guests", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                guests = data.get("guests", [])
                self.log_result("Get Approved Guests", True, f"Retrieved {len(guests)} approved guests")
                
                # Verify our approved guest is in the list
                if self.test_guest_id:
                    found_guest = any(guest.get("id") == self.test_guest_id for guest in guests)
                    if found_guest:
                        self.log_result("Approved Guest Visibility", True, "Test approved guest found in guests list")
                    else:
                        self.log_result("Approved Guest Visibility", False, "Test approved guest not found in guests list")
                
                return True
            else:
                self.log_result("Get Approved Guests", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Approved Guests", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_guest_stats(self):
        """Test GET /api/guests/stats - Get guest statistics"""
        print("\n=== Testing Get Guest Statistics ===")
        
        if not self.admin_token:
            self.log_result("Get Guest Statistics", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/guests/stats", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                stats = data.get("stats", {})
                
                # Verify required stats fields
                required_fields = ["total_visitors", "pending_approvals", "active_visits", "todays_visits"]
                
                all_fields_present = all(field in stats for field in required_fields)
                
                if all_fields_present:
                    self.log_result("Get Guest Statistics", True, 
                                  f"Guest stats retrieved successfully - Total: {stats.get('total_visitors')}, "
                                  f"Pending: {stats.get('pending_approvals')}, Active: {stats.get('active_visits')}")
                    return True
                else:
                    missing_fields = [field for field in required_fields if field not in stats]
                    self.log_result("Get Guest Statistics", False, f"Missing required stats fields: {missing_fields}")
                    return False
            else:
                self.log_result("Get Guest Statistics", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Guest Statistics", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_generate_qr_code(self):
        """Test GET /api/guests/{id}/qr-code - Generate QR code for guest"""
        print("\n=== Testing Generate QR Code ===")
        
        if not self.admin_token or not self.test_guest_id:
            self.log_result("Generate QR Code", False, "No admin token or guest ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/guests/{self.test_guest_id}/qr-code", headers=headers)
            
            if response.status_code == 200:
                # Check if response contains QR code image data
                content_type = response.headers.get('content-type', '')
                
                if 'image' in content_type:
                    self.log_result("Generate QR Code", True, f"QR code image generated successfully (Content-Type: {content_type})")
                    return True
                else:
                    # Check if it's JSON response with QR data
                    try:
                        data = response.json()
                        if 'qr_code' in str(data) or 'data:image' in str(data):
                            self.log_result("Generate QR Code", True, "QR code data generated successfully")
                            return True
                        else:
                            self.log_result("Generate QR Code", False, f"Unexpected response format: {data}")
                            return False
                    except:
                        self.log_result("Generate QR Code", False, f"Invalid response format - Content-Type: {content_type}")
                        return False
            else:
                self.log_result("Generate QR Code", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Generate QR Code", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_checkin_guest(self):
        """Test PATCH /api/guests/{id}/checkin - Check in guest"""
        print("\n=== Testing Guest Check-in ===")
        
        if not self.admin_token or not self.test_guest_id:
            self.log_result("Guest Check-in", False, "No admin token or guest ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.patch(f"{BASE_URL}/guests/{self.test_guest_id}/checkin", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Guest checked in successfully":
                    self.log_result("Guest Check-in", True, "Guest checked in successfully")
                    return True
                else:
                    self.log_result("Guest Check-in", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Guest Check-in", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Guest Check-in", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_checkout_guest(self):
        """Test PATCH /api/guests/{id}/checkout - Check out guest"""
        print("\n=== Testing Guest Check-out ===")
        
        if not self.admin_token or not self.test_guest_id:
            self.log_result("Guest Check-out", False, "No admin token or guest ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.patch(f"{BASE_URL}/guests/{self.test_guest_id}/checkout", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Guest checked out successfully":
                    self.log_result("Guest Check-out", True, "Guest checked out successfully")
                    return True
                else:
                    self.log_result("Guest Check-out", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Guest Check-out", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Guest Check-out", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_qr_scan_checkin(self):
        """Test POST /api/guests/scan-qr - QR scan for check-in"""
        print("\n=== Testing QR Scan Check-in ===")
        
        # First, we need to create a new approved guest for QR scanning
        if not self.test_qr_data or not self.admin_token:
            self.log_result("QR Scan Check-in", False, "No QR data or admin token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Create another visit request and approve it for QR scanning
            resident_headers = {"Authorization": f"Bearer {self.resident_token}"}
            visit_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d %H:%M:%S")
            
            data = {
                'visitor_name': 'QR Test Visitor',
                'visitor_phone': '+1555666777',
                'visit_purpose': 'delivery',
                'visit_date': visit_date,
                'unit_number': self.test_unit_number,
                'host_name': self.resident_user.get('full_name', 'Test Host'),
                'host_phone': '+1234567890'
            }
            
            # Create visit request
            create_response = self.session.post(f"{BASE_URL}/visit-requests", data=data, headers=resident_headers)
            
            if create_response.status_code == 200:
                create_result = create_response.json()
                qr_request_id = create_result.get("request_id")
                
                if qr_request_id:
                    # Approve the request
                    approve_response = self.session.patch(f"{BASE_URL}/visit-requests/{qr_request_id}/approve", headers=headers)
                    
                    if approve_response.status_code == 200:
                        approve_result = approve_response.json()
                        qr_data = approve_result.get("qr_data")
                        
                        if qr_data:
                            # Now test QR scan for check-in
                            scan_data = {
                                'qr_data': json.dumps(qr_data),
                                'action': 'checkin'
                            }
                            
                            scan_response = self.session.post(f"{BASE_URL}/guests/scan-qr", data=scan_data, headers=headers)
                            
                            if scan_response.status_code == 200:
                                scan_result = scan_response.json()
                                if "checked in successfully" in scan_result.get("message", "").lower():
                                    guest_info = scan_result.get("guest", {})
                                    self.log_result("QR Scan Check-in", True, 
                                                  f"QR scan check-in successful for {guest_info.get('visitor_name', 'visitor')}")
                                    
                                    # Store this guest ID for checkout test
                                    self.qr_test_guest_id = qr_request_id
                                    return True
                                else:
                                    self.log_result("QR Scan Check-in", False, f"Unexpected scan response: {scan_result}")
                                    return False
                            else:
                                self.log_result("QR Scan Check-in", False, f"QR scan failed with status {scan_response.status_code}")
                                return False
                        else:
                            self.log_result("QR Scan Check-in", False, "No QR data in approval response")
                            return False
                    else:
                        self.log_result("QR Scan Check-in", False, f"Failed to approve request: {approve_response.status_code}")
                        return False
                else:
                    self.log_result("QR Scan Check-in", False, "No request ID from creation")
                    return False
            else:
                self.log_result("QR Scan Check-in", False, f"Failed to create request: {create_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("QR Scan Check-in", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_qr_scan_checkout(self):
        """Test POST /api/guests/scan-qr - QR scan for check-out"""
        print("\n=== Testing QR Scan Check-out ===")
        
        if not hasattr(self, 'qr_test_guest_id') or not self.admin_token:
            self.log_result("QR Scan Check-out", False, "No QR test guest ID or admin token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Create QR data for checkout (using the same guest that was checked in)
            qr_data = {
                "guest_id": self.qr_test_guest_id,
                "visitor_name": "QR Test Visitor",
                "action": "checkout"
            }
            
            scan_data = {
                'qr_data': json.dumps(qr_data),
                'action': 'checkout'
            }
            
            response = self.session.post(f"{BASE_URL}/guests/scan-qr", data=scan_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if "checked out successfully" in result.get("message", "").lower():
                    guest_info = result.get("guest", {})
                    self.log_result("QR Scan Check-out", True, 
                                  f"QR scan check-out successful for {guest_info.get('visitor_name', 'visitor')}")
                    return True
                else:
                    self.log_result("QR Scan Check-out", False, f"Unexpected scan response: {result}")
                    return False
            else:
                self.log_result("QR Scan Check-out", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("QR Scan Check-out", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_authentication_and_authorization(self):
        """Test authentication and authorization for guest endpoints"""
        print("\n=== Testing Authentication & Authorization ===")
        
        success_count = 0
        total_tests = 0
        
        # Test endpoints without authentication
        endpoints_to_test = [
            ("GET", "/visit-requests"),
            ("POST", "/visit-requests"),
            ("GET", "/guests"),
            ("GET", "/guests/stats"),
            ("POST", "/guests/scan-qr")
        ]
        
        for method, endpoint in endpoints_to_test:
            try:
                total_tests += 1
                if method == "GET":
                    response = self.session.get(f"{BASE_URL}{endpoint}")
                elif method == "POST":
                    response = self.session.post(f"{BASE_URL}{endpoint}")
                
                if response.status_code in [401, 403]:
                    self.log_result(f"Auth Required - {method} {endpoint}", True, 
                                  f"Correctly rejected unauthenticated request (status: {response.status_code})")
                    success_count += 1
                else:
                    self.log_result(f"Auth Required - {method} {endpoint}", False, 
                                  f"Expected 401/403, got {response.status_code}")
            except Exception as e:
                self.log_result(f"Auth Required - {method} {endpoint}", False, f"Exception occurred: {str(e)}")
        
        return success_count == total_tests
    
    def test_data_validation(self):
        """Test data validation for visit requests"""
        print("\n=== Testing Data Validation ===")
        
        if not self.resident_token:
            self.log_result("Data Validation", False, "No resident token available")
            return False
        
        success_count = 0
        total_tests = 0
        
        headers = {"Authorization": f"Bearer {self.resident_token}"}
        
        # Test 1: Invalid visit purpose
        try:
            total_tests += 1
            data = {
                'visitor_name': 'Test Visitor',
                'visitor_phone': '+1234567890',
                'visit_purpose': 'invalid_purpose',  # Invalid purpose
                'visit_date': (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S"),
                'unit_number': self.test_unit_number,
                'host_name': 'Test Host',
                'host_phone': '+1234567890'
            }
            
            response = self.session.post(f"{BASE_URL}/visit-requests", data=data, headers=headers)
            
            if response.status_code == 422:  # Validation error
                self.log_result("Invalid Purpose Validation", True, "Correctly rejected invalid visit purpose")
                success_count += 1
            else:
                self.log_result("Invalid Purpose Validation", False, f"Expected 422, got {response.status_code}")
        except Exception as e:
            self.log_result("Invalid Purpose Validation", False, f"Exception occurred: {str(e)}")
        
        # Test 2: Missing required fields
        try:
            total_tests += 1
            data = {
                'visitor_name': 'Test Visitor',
                # Missing required fields
                'visit_purpose': 'family_visit'
            }
            
            response = self.session.post(f"{BASE_URL}/visit-requests", data=data, headers=headers)
            
            if response.status_code == 422:  # Validation error
                self.log_result("Missing Fields Validation", True, "Correctly rejected missing required fields")
                success_count += 1
            else:
                self.log_result("Missing Fields Validation", False, f"Expected 422, got {response.status_code}")
        except Exception as e:
            self.log_result("Missing Fields Validation", False, f"Exception occurred: {str(e)}")
        
        # Test 3: Valid visit purposes
        valid_purposes = ["family_visit", "business_meeting", "delivery", "maintenance", "healthcare", "social_event", "other"]
        for purpose in valid_purposes:
            try:
                total_tests += 1
                data = {
                    'visitor_name': f'Test {purpose.title()} Visitor',
                    'visitor_phone': '+1234567890',
                    'visit_purpose': purpose,
                    'visit_date': (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S"),
                    'unit_number': self.test_unit_number,
                    'host_name': 'Test Host',
                    'host_phone': '+1234567890'
                }
                
                response = self.session.post(f"{BASE_URL}/visit-requests", data=data, headers=headers)
                
                if response.status_code == 200:
                    self.log_result(f"Valid Purpose - {purpose.title()}", True, f"Successfully created {purpose} visit request")
                    success_count += 1
                else:
                    self.log_result(f"Valid Purpose - {purpose.title()}", False, f"Failed to create {purpose} request: {response.status_code}")
            except Exception as e:
                self.log_result(f"Valid Purpose - {purpose.title()}", False, f"Exception occurred: {str(e)}")
        
        return success_count == total_tests
    
    def run_guest_management_tests(self):
        """Run complete Guest Management System tests"""
        print("\n🚀 STARTING GUEST MANAGEMENT SYSTEM TESTING")
        print("=" * 60)
        print("Testing complete QR visitor workflow implementation")
        print("=" * 60)
        
        # Authentication tests
        print("\n🔐 AUTHENTICATION SETUP")
        if not self.test_admin_authentication():
            print("❌ Admin authentication failed - stopping tests")
            return self.print_summary()
        
        if not self.test_resident_authentication():
            print("❌ Resident authentication failed - stopping tests")
            return self.print_summary()
        
        # Core Guest Management Tests
        print("\n👥 VISIT REQUEST MANAGEMENT")
        self.test_create_visit_request()
        self.test_get_visit_requests()
        
        print("\n✅ APPROVAL/REJECTION WORKFLOW")
        self.test_approve_visit_request()
        self.test_reject_visit_request()
        
        print("\n🏠 GUEST MANAGEMENT")
        self.test_get_guests()
        self.test_get_guest_stats()
        
        print("\n📱 QR CODE FUNCTIONALITY")
        self.test_generate_qr_code()
        
        print("\n🚪 CHECK-IN/CHECK-OUT WORKFLOW")
        self.test_checkin_guest()
        self.test_checkout_guest()
        
        print("\n📲 QR SCANNING WORKFLOW")
        self.test_qr_scan_checkin()
        self.test_qr_scan_checkout()
        
        print("\n🔒 SECURITY & VALIDATION")
        self.test_authentication_and_authorization()
        self.test_data_validation()
        
        return self.print_summary()
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("🏁 GUEST MANAGEMENT SYSTEM TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.results if "✅ PASS" in result["status"])
        failed = sum(1 for result in self.results if "❌ FAIL" in result["status"])
        total = len(self.results)
        
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"\n📊 OVERALL RESULTS:")
        print(f"   Total Tests: {total}")
        print(f"   Passed: {passed}")
        print(f"   Failed: {failed}")
        print(f"   Success Rate: {success_rate:.1f}%")
        
        if failed > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"   • {result['test']}: {result['message']}")
                    if result.get('details'):
                        print(f"     Details: {result['details']}")
        
        print(f"\n✅ SUCCESSFUL TESTS:")
        for result in self.results:
            if "✅ PASS" in result["status"]:
                print(f"   • {result['test']}: {result['message']}")
        
        print("\n" + "=" * 60)
        return success_rate >= 80  # Consider 80%+ success rate as overall success

def main():
    """Main test runner"""
    test_suite = GuestManagementTestSuite()
    success = test_suite.run_guest_management_tests()
    
    if success:
        print("\n🎉 Guest Management System testing completed successfully!")
        exit(0)
    else:
        print("\n⚠️  Guest Management System testing completed with issues.")
        exit(1)

if __name__ == "__main__":
    main()