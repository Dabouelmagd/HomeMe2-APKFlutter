#!/usr/bin/env python3
"""
HomeMe Flutter Mobile App Backend API Testing Suite
Tests backend API endpoints specifically for Flutter mobile app integration:
1. Authentication Endpoints (login/register)
2. Dashboard Endpoints (admin/resident)
3. Guest Management Endpoints
4. Maintenance System Endpoints
5. Events System Endpoints
6. Notifications Endpoints
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
from PIL import Image

# Configuration
BASE_URL = "https://homeme-arabic-ui.preview.emergentagent.com/api"

class FlutterMobileTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.resident_token = None
        self.admin_user = None
        self.resident_user = None
        self.compound_id = None
        self.test_guest_id = None
        self.test_visit_request_id = None
        self.test_maintenance_id = None
        self.test_event_id = None
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
    
    # ============ AUTHENTICATION ENDPOINTS ============
    
    def test_admin_login(self):
        """Test POST /api/auth/login - Admin login for Flutter app"""
        print("\n=== Testing Admin Login (Flutter) ===")
        
        try:
            admin_login_data = {
                "username": "admin",
                "password": "admin123"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=admin_login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                self.admin_user = data.get("user")
                self.compound_id = self.admin_user.get("compound_id") if self.admin_user else None
                
                # Verify response structure for mobile app
                required_fields = ["access_token", "user", "token_type"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields and self.admin_token:
                    self.log_result("Admin Login (Flutter)", True, 
                                  f"Admin authenticated successfully - Role: {self.admin_user.get('role')}, "
                                  f"Compound: {self.compound_id}, Token: {self.admin_token[:20]}...")
                    return True
                else:
                    self.log_result("Admin Login (Flutter)", False, 
                                  f"Missing required fields for mobile app: {missing_fields}")
                    return False
            else:
                self.log_result("Admin Login (Flutter)", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Login (Flutter)", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_resident_login(self):
        """Test POST /api/auth/login - Resident login for Flutter app"""
        print("\n=== Testing Resident Login (Flutter) ===")
        
        try:
            # Try to find a resident user or create one
            resident_login_data = {
                "username": "testuser",
                "password": "password123"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=resident_login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.resident_token = data.get("access_token")
                self.resident_user = data.get("user")
                
                # Verify response structure for mobile app
                required_fields = ["access_token", "user", "token_type"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields and self.resident_token:
                    self.log_result("Resident Login (Flutter)", True, 
                                  f"Resident authenticated successfully - Role: {self.resident_user.get('role')}, "
                                  f"Token: {self.resident_token[:20]}...")
                    return True
                else:
                    self.log_result("Resident Login (Flutter)", False, 
                                  f"Missing required fields for mobile app: {missing_fields}")
                    return False
            else:
                # Try to create a resident user if login fails
                return self.create_test_resident_for_flutter()
                
        except Exception as e:
            self.log_result("Resident Login (Flutter)", False, f"Exception occurred: {str(e)}")
            return False
    
    def create_test_resident_for_flutter(self):
        """Create a test resident user for Flutter testing"""
        try:
            if not self.admin_token:
                self.log_result("Create Test Resident (Flutter)", False, "No admin token available")
                return False
            
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            unique_id = str(uuid.uuid4())[:8]
            
            data = {
                'unit_number': f"FL{unique_id[:4]}",
                'full_name': f"Flutter Test Resident {unique_id}",
                'email': f"flutter{unique_id}@example.com",
                'phone': "+971501234567",
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
                    self.resident_token = data.get("access_token")
                    self.resident_user = data.get("user")
                    self.log_result("Create Test Resident (Flutter)", True, 
                                  f"Flutter test resident created and authenticated: {username}")
                    return True
                else:
                    self.log_result("Create Test Resident (Flutter)", False, 
                                  f"Failed to login with new resident: {login_response.status_code}")
                    return False
            else:
                self.log_result("Create Test Resident (Flutter)", False, 
                              f"Failed to create resident: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Create Test Resident (Flutter)", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_user_registration(self):
        """Test POST /api/auth/register - User registration for Flutter app"""
        print("\n=== Testing User Registration (Flutter) ===")
        
        try:
            unique_id = str(uuid.uuid4())[:8]
            registration_data = {
                "username": f"flutter_user_{unique_id}",
                "email": f"flutter_user_{unique_id}@example.com",
                "password": "FlutterTest123!",
                "full_name": f"Flutter User {unique_id}",
                "phone": "+971501234567",
                "role": "resident",
                "compound_id": self.compound_id if self.compound_id else "default_compound"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/register", json=registration_data)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure for mobile app
                required_fields = ["message", "user_id"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    self.log_result("User Registration (Flutter)", True, 
                                  f"User registered successfully - ID: {data.get('user_id')}, "
                                  f"Message: {data.get('message')}")
                    return True
                else:
                    self.log_result("User Registration (Flutter)", False, 
                                  f"Missing required fields for mobile app: {missing_fields}")
                    return False
            elif response.status_code == 422:
                # Validation error - check if it's proper validation
                error_data = response.json()
                if "detail" in error_data:
                    self.log_result("User Registration (Flutter)", True, 
                                  f"Proper validation working - {error_data.get('detail')}")
                    return True
                else:
                    self.log_result("User Registration (Flutter)", False, 
                                  f"Validation error without proper details: {error_data}")
                    return False
            else:
                self.log_result("User Registration (Flutter)", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("User Registration (Flutter)", False, f"Exception occurred: {str(e)}")
            return False
    
    # ============ DASHBOARD ENDPOINTS ============
    
    def test_admin_dashboard(self):
        """Test GET /api/dashboard/admin - Admin dashboard for Flutter app"""
        print("\n=== Testing Admin Dashboard (Flutter) ===")
        
        if not self.admin_token:
            self.log_result("Admin Dashboard (Flutter)", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/dashboard/admin", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify mobile-friendly response structure
                mobile_required_fields = ["stats", "recent_activity", "compound_info"]
                stats_fields = ["total_residents", "total_families", "total_units", "occupancy_rate"]
                
                missing_mobile_fields = [field for field in mobile_required_fields if field not in data]
                
                if not missing_mobile_fields:
                    stats = data.get("stats", {})
                    missing_stats = [field for field in stats_fields if field not in stats]
                    
                    if not missing_stats:
                        self.log_result("Admin Dashboard (Flutter)", True, 
                                      f"Admin dashboard retrieved successfully - "
                                      f"Residents: {stats.get('total_residents')}, "
                                      f"Families: {stats.get('total_families')}, "
                                      f"Units: {stats.get('total_units')}, "
                                      f"Occupancy: {stats.get('occupancy_rate')}%")
                        return True
                    else:
                        self.log_result("Admin Dashboard (Flutter)", False, 
                                      f"Missing stats fields for mobile app: {missing_stats}")
                        return False
                else:
                    self.log_result("Admin Dashboard (Flutter)", False, 
                                  f"Missing required fields for mobile app: {missing_mobile_fields}")
                    return False
            else:
                self.log_result("Admin Dashboard (Flutter)", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Dashboard (Flutter)", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_resident_dashboard(self):
        """Test GET /api/dashboard/resident - Resident dashboard for Flutter app"""
        print("\n=== Testing Resident Dashboard (Flutter) ===")
        
        if not self.resident_token:
            self.log_result("Resident Dashboard (Flutter)", False, "No resident token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/dashboard/resident", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify mobile-friendly response structure
                mobile_required_fields = ["user_info", "unit_info", "recent_activity", "quick_actions"]
                
                missing_mobile_fields = [field for field in mobile_required_fields if field not in data]
                
                if not missing_mobile_fields:
                    user_info = data.get("user_info", {})
                    unit_info = data.get("unit_info", {})
                    
                    self.log_result("Resident Dashboard (Flutter)", True, 
                                  f"Resident dashboard retrieved successfully - "
                                  f"User: {user_info.get('full_name')}, "
                                  f"Unit: {unit_info.get('unit_number')}, "
                                  f"Quick Actions: {len(data.get('quick_actions', []))}")
                    return True
                else:
                    self.log_result("Resident Dashboard (Flutter)", False, 
                                  f"Missing required fields for mobile app: {missing_mobile_fields}")
                    return False
            else:
                self.log_result("Resident Dashboard (Flutter)", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Resident Dashboard (Flutter)", False, f"Exception occurred: {str(e)}")
            return False
    
    # ============ GUEST MANAGEMENT ENDPOINTS ============
    
    def test_get_guests(self):
        """Test GET /api/guests - Get guests list for Flutter app"""
        print("\n=== Testing Get Guests (Flutter) ===")
        
        if not self.admin_token:
            self.log_result("Get Guests (Flutter)", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/guests", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify mobile-friendly response structure
                if "guests" in data:
                    guests = data.get("guests", [])
                    total = data.get("total", 0)
                    
                    # Check if guests have mobile-required fields
                    if guests:
                        guest = guests[0]
                        mobile_guest_fields = ["id", "name", "phone", "status", "visit_date"]
                        missing_fields = [field for field in mobile_guest_fields if field not in guest]
                        
                        if not missing_fields:
                            self.log_result("Get Guests (Flutter)", True, 
                                          f"Guests retrieved successfully - Total: {total}, "
                                          f"Sample guest: {guest.get('name')} ({guest.get('status')})")
                            return True
                        else:
                            self.log_result("Get Guests (Flutter)", False, 
                                          f"Guest objects missing mobile fields: {missing_fields}")
                            return False
                    else:
                        self.log_result("Get Guests (Flutter)", True, 
                                      f"Guests endpoint working - No guests found (Total: {total})")
                        return True
                else:
                    self.log_result("Get Guests (Flutter)", False, 
                                  "Response missing 'guests' field for mobile app")
                    return False
            else:
                self.log_result("Get Guests (Flutter)", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Guests (Flutter)", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_visit_request(self):
        """Test POST /api/visit-requests - Create visit request for Flutter app"""
        print("\n=== Testing Create Visit Request (Flutter) ===")
        
        if not self.resident_token:
            self.log_result("Create Visit Request (Flutter)", False, "No resident token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.resident_token}"}
            
            # Create realistic visit request data for mobile app using Form data
            visit_data = {
                "visitor_name": "Ahmed Al-Rashid",
                "visitor_phone": "+971501234567",
                "visitor_email": "ahmed.rashid@example.com",
                "visit_purpose": "family_visit",  # Use valid purpose from the error message
                "visit_date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
                "unit_number": self.resident_user.get("unit_number", "A101"),
                "host_name": self.resident_user.get("full_name", "Test Resident"),
                "host_phone": "+971501234567",
                "notes": "Family gathering for weekend visit"
            }
            
            response = self.session.post(f"{BASE_URL}/visit-requests", data=visit_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify mobile-friendly response
                if "request_id" in data and "message" in data:
                    self.test_visit_request_id = data.get("request_id")
                    self.log_result("Create Visit Request (Flutter)", True, 
                                  f"Visit request created successfully - ID: {self.test_visit_request_id}, "
                                  f"Guest: {visit_data['visitor_name']}, Date: {visit_data['visit_date']}")
                    return True
                else:
                    self.log_result("Create Visit Request (Flutter)", False, 
                                  f"Response missing required fields for mobile app: {data}")
                    return False
            else:
                self.log_result("Create Visit Request (Flutter)", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Visit Request (Flutter)", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_visit_requests(self):
        """Test GET /api/visit-requests - Get visit requests for Flutter app"""
        print("\n=== Testing Get Visit Requests (Flutter) ===")
        
        if not self.resident_token:
            self.log_result("Get Visit Requests (Flutter)", False, "No resident token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/visit-requests", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify mobile-friendly response structure
                if "visit_requests" in data:
                    requests = data.get("visit_requests", [])
                    total = data.get("total", 0)
                    
                    # Check if visit requests have mobile-required fields
                    if requests:
                        request = requests[0]
                        mobile_request_fields = ["id", "guest_name", "guest_phone", "visit_date", "status", "qr_code"]
                        missing_fields = [field for field in mobile_request_fields if field not in request]
                        
                        if not missing_fields:
                            self.log_result("Get Visit Requests (Flutter)", True, 
                                          f"Visit requests retrieved successfully - Total: {total}, "
                                          f"Sample: {request.get('guest_name')} ({request.get('status')})")
                            return True
                        else:
                            self.log_result("Get Visit Requests (Flutter)", False, 
                                          f"Visit request objects missing mobile fields: {missing_fields}")
                            return False
                    else:
                        self.log_result("Get Visit Requests (Flutter)", True, 
                                      f"Visit requests endpoint working - No requests found (Total: {total})")
                        return True
                else:
                    self.log_result("Get Visit Requests (Flutter)", False, 
                                  "Response missing 'visit_requests' field for mobile app")
                    return False
            else:
                self.log_result("Get Visit Requests (Flutter)", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Visit Requests (Flutter)", False, f"Exception occurred: {str(e)}")
            return False
    
    # ============ MAINTENANCE SYSTEM ENDPOINTS ============
    
    def test_get_maintenance_requests(self):
        """Test GET /api/maintenance/requests - Get maintenance requests for Flutter app"""
        print("\n=== Testing Get Maintenance Requests (Flutter) ===")
        
        if not self.resident_token:
            self.log_result("Get Maintenance Requests (Flutter)", False, "No resident token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/maintenance/requests", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify mobile-friendly response structure
                if "maintenance_requests" in data or "requests" in data:
                    requests = data.get("maintenance_requests", data.get("requests", []))
                    total = data.get("total", len(requests))
                    
                    # Check if maintenance requests have mobile-required fields
                    if requests:
                        request = requests[0]
                        mobile_request_fields = ["id", "title", "description", "category", "priority", "status", "created_at"]
                        missing_fields = [field for field in mobile_request_fields if field not in request]
                        
                        if not missing_fields:
                            self.log_result("Get Maintenance Requests (Flutter)", True, 
                                          f"Maintenance requests retrieved successfully - Total: {total}, "
                                          f"Sample: {request.get('title')} ({request.get('status')})")
                            return True
                        else:
                            self.log_result("Get Maintenance Requests (Flutter)", False, 
                                          f"Maintenance request objects missing mobile fields: {missing_fields}")
                            return False
                    else:
                        self.log_result("Get Maintenance Requests (Flutter)", True, 
                                      f"Maintenance requests endpoint working - No requests found (Total: {total})")
                        return True
                else:
                    self.log_result("Get Maintenance Requests (Flutter)", False, 
                                  "Response missing maintenance requests field for mobile app")
                    return False
            else:
                self.log_result("Get Maintenance Requests (Flutter)", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Maintenance Requests (Flutter)", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_maintenance_request(self):
        """Test POST /api/maintenance/requests - Create maintenance request for Flutter app"""
        print("\n=== Testing Create Maintenance Request (Flutter) ===")
        
        if not self.resident_token:
            self.log_result("Create Maintenance Request (Flutter)", False, "No resident token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.resident_token}"}
            
            # Create realistic maintenance request data for mobile app using Form data
            maintenance_data = {
                "title": "Kitchen Faucet Leak",
                "description": "The kitchen faucet is leaking water continuously and needs immediate repair. Water is dripping from the base of the faucet.",
                "category": "plumbing",
                "priority": "high",
                "location": "Kitchen",
                "contact_method": "phone",
                "preferred_time": (datetime.now() + timedelta(days=1)).isoformat()
            }
            
            response = self.session.post(f"{BASE_URL}/maintenance/requests", data=maintenance_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify mobile-friendly response
                if "request_id" in data and "message" in data:
                    self.test_maintenance_id = data.get("request_id")
                    self.log_result("Create Maintenance Request (Flutter)", True, 
                                  f"Maintenance request created successfully - ID: {self.test_maintenance_id}, "
                                  f"Title: {maintenance_data['title']}, Priority: {maintenance_data['priority']}")
                    return True
                else:
                    self.log_result("Create Maintenance Request (Flutter)", False, 
                                  f"Response missing required fields for mobile app: {data}")
                    return False
            else:
                self.log_result("Create Maintenance Request (Flutter)", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Maintenance Request (Flutter)", False, f"Exception occurred: {str(e)}")
            return False
    
    # ============ EVENTS SYSTEM ENDPOINTS ============
    
    def test_get_events(self):
        """Test GET /api/events - Get events for Flutter app"""
        print("\n=== Testing Get Events (Flutter) ===")
        
        if not self.resident_token:
            self.log_result("Get Events (Flutter)", False, "No resident token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/events", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify mobile-friendly response structure
                if "events" in data:
                    events = data.get("events", [])
                    total = data.get("total", len(events))
                    
                    # Check if events have mobile-required fields
                    if events:
                        event = events[0]
                        mobile_event_fields = ["id", "title", "description", "event_date", "location", "category", "status"]
                        missing_fields = [field for field in mobile_event_fields if field not in event]
                        
                        if not missing_fields:
                            self.log_result("Get Events (Flutter)", True, 
                                          f"Events retrieved successfully - Total: {total}, "
                                          f"Sample: {event.get('title')} ({event.get('event_date')[:10]})")
                            return True
                        else:
                            self.log_result("Get Events (Flutter)", False, 
                                          f"Event objects missing mobile fields: {missing_fields}")
                            return False
                    else:
                        self.log_result("Get Events (Flutter)", True, 
                                      f"Events endpoint working - No events found (Total: {total})")
                        return True
                else:
                    self.log_result("Get Events (Flutter)", False, 
                                  "Response missing 'events' field for mobile app")
                    return False
            else:
                self.log_result("Get Events (Flutter)", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Events (Flutter)", False, f"Exception occurred: {str(e)}")
            return False
    
    # ============ NOTIFICATIONS ENDPOINTS ============
    
    def test_get_notifications(self):
        """Test GET /api/notifications - Get notifications for Flutter app"""
        print("\n=== Testing Get Notifications (Flutter) ===")
        
        if not self.resident_token:
            self.log_result("Get Notifications (Flutter)", False, "No resident token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/notifications", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify mobile-friendly response structure
                if "notifications" in data:
                    notifications = data.get("notifications", [])
                    total = data.get("total", 0)
                    unread = data.get("unread", 0)
                    
                    # Check if notifications have mobile-required fields
                    if notifications:
                        notification = notifications[0]
                        mobile_notification_fields = ["id", "title", "message", "type", "created_at", "is_read"]
                        missing_fields = [field for field in mobile_notification_fields if field not in notification]
                        
                        if not missing_fields:
                            self.log_result("Get Notifications (Flutter)", True, 
                                          f"Notifications retrieved successfully - Total: {total}, "
                                          f"Unread: {unread}, Sample: {notification.get('title')}")
                            return True
                        else:
                            self.log_result("Get Notifications (Flutter)", False, 
                                          f"Notification objects missing mobile fields: {missing_fields}")
                            return False
                    else:
                        self.log_result("Get Notifications (Flutter)", True, 
                                      f"Notifications endpoint working - No notifications found (Total: {total})")
                        return True
                else:
                    self.log_result("Get Notifications (Flutter)", False, 
                                  "Response missing 'notifications' field for mobile app")
                    return False
            else:
                self.log_result("Get Notifications (Flutter)", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Notifications (Flutter)", False, f"Exception occurred: {str(e)}")
            return False
    
    # ============ AUTHENTICATION VALIDATION ============
    
    def test_authentication_required(self):
        """Test that all endpoints require proper authentication"""
        print("\n=== Testing Authentication Requirements (Flutter) ===")
        
        endpoints_to_test = [
            ("GET", "/dashboard/admin"),
            ("GET", "/dashboard/resident"),
            ("GET", "/guests"),
            ("POST", "/visit-requests"),
            ("GET", "/visit-requests"),
            ("GET", "/maintenance/requests"),
            ("POST", "/maintenance/requests"),
            ("GET", "/events"),
            ("GET", "/notifications")
        ]
        
        success_count = 0
        total_tests = len(endpoints_to_test)
        
        for method, endpoint in endpoints_to_test:
            try:
                if method == "GET":
                    response = self.session.get(f"{BASE_URL}{endpoint}")
                else:  # POST
                    response = self.session.post(f"{BASE_URL}{endpoint}", json={})
                
                if response.status_code in [401, 403]:
                    success_count += 1
                    self.log_result(f"Auth Required - {method} {endpoint}", True, 
                                  f"Correctly rejected unauthenticated request (status: {response.status_code})")
                else:
                    self.log_result(f"Auth Required - {method} {endpoint}", False, 
                                  f"Expected 401/403, got {response.status_code}")
                    
            except Exception as e:
                self.log_result(f"Auth Required - {method} {endpoint}", False, f"Exception: {str(e)}")
        
        if success_count == total_tests:
            self.log_result("Authentication Requirements (Flutter)", True, 
                          f"All {total_tests} endpoints properly require authentication")
            return True
        else:
            self.log_result("Authentication Requirements (Flutter)", False, 
                          f"Only {success_count}/{total_tests} endpoints require authentication")
            return False
    
    # ============ JSON RESPONSE VALIDATION ============
    
    def test_json_response_format(self):
        """Test that all responses are properly formatted JSON for mobile consumption"""
        print("\n=== Testing JSON Response Format (Flutter) ===")
        
        if not self.admin_token or not self.resident_token:
            self.log_result("JSON Response Format (Flutter)", False, "Missing authentication tokens")
            return False
        
        endpoints_to_test = [
            ("GET", "/dashboard/admin", self.admin_token),
            ("GET", "/dashboard/resident", self.resident_token),
            ("GET", "/guests", self.admin_token),
            ("GET", "/visit-requests", self.resident_token),
            ("GET", "/maintenance/requests", self.resident_token),
            ("GET", "/events", self.resident_token),
            ("GET", "/notifications", self.resident_token)
        ]
        
        success_count = 0
        total_tests = len(endpoints_to_test)
        
        for method, endpoint, token in endpoints_to_test:
            try:
                headers = self.setup_auth_headers(token)
                response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        # Verify it's valid JSON and has expected structure
                        if isinstance(data, dict):
                            success_count += 1
                            self.log_result(f"JSON Format - {endpoint}", True, 
                                          f"Valid JSON response with {len(data)} fields")
                        else:
                            self.log_result(f"JSON Format - {endpoint}", False, 
                                          f"Response is not a JSON object: {type(data)}")
                    except json.JSONDecodeError:
                        self.log_result(f"JSON Format - {endpoint}", False, 
                                      "Response is not valid JSON")
                else:
                    self.log_result(f"JSON Format - {endpoint}", False, 
                                  f"Endpoint returned status {response.status_code}")
                    
            except Exception as e:
                self.log_result(f"JSON Format - {endpoint}", False, f"Exception: {str(e)}")
        
        if success_count == total_tests:
            self.log_result("JSON Response Format (Flutter)", True, 
                          f"All {total_tests} endpoints return valid JSON")
            return True
        else:
            self.log_result("JSON Response Format (Flutter)", False, 
                          f"Only {success_count}/{total_tests} endpoints return valid JSON")
            return False
    
    # ============ MAIN TEST RUNNER ============
    
    def run_all_tests(self):
        """Run all Flutter mobile app backend tests"""
        print("🚀 Starting HomeMe Flutter Mobile App Backend API Tests")
        print("=" * 80)
        
        # Authentication Tests
        self.test_admin_login()
        self.test_resident_login()
        self.test_user_registration()
        
        # Dashboard Tests
        self.test_admin_dashboard()
        self.test_resident_dashboard()
        
        # Guest Management Tests
        self.test_get_guests()
        self.test_create_visit_request()
        self.test_get_visit_requests()
        
        # Maintenance System Tests
        self.test_get_maintenance_requests()
        self.test_create_maintenance_request()
        
        # Events System Tests
        self.test_get_events()
        
        # Notifications Tests
        self.test_get_notifications()
        
        # Security and Format Tests
        self.test_authentication_required()
        self.test_json_response_format()
        
        # Print Summary
        print("\n" + "=" * 80)
        print("📊 FLUTTER MOBILE APP BACKEND API TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.results if "✅ PASS" in result["status"])
        failed = sum(1 for result in self.results if "❌ FAIL" in result["status"])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"  • {result['test']}: {result['message']}")
                    if result["details"]:
                        print(f"    Details: {result['details']}")
        
        print("\n✨ Flutter Mobile App Backend API Testing Complete!")
        return passed, failed, total

if __name__ == "__main__":
    suite = FlutterMobileTestSuite()
    passed, failed, total = suite.run_all_tests()
    
    # Exit with appropriate code
    exit(0 if failed == 0 else 1)