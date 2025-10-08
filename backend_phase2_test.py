#!/usr/bin/env python3
"""
HomeMe Phase 2 Backend Testing Suite
Tests the newly implemented Phase 2 backend endpoints:
- Guest Management (Visit Requests)
- Events & Announcements
- Analytics Dashboard
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
BASE_URL = "https://homeme-subscriptions.preview.emergentagent.com/api"

class HomePhase2TestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.resident_token = None
        self.admin_user = None
        self.resident_user = None
        self.compound_id = None
        self.test_visit_request_id = None
        self.test_announcement_id = None
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
    
    def test_admin_authentication(self):
        """Test admin authentication"""
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
        """Test resident authentication"""
        print("\n=== Testing Resident Authentication ===")
        
        try:
            # Try to find a resident user
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

    # ============ GUEST MANAGEMENT TESTS ============
    
    def test_create_visit_request(self):
        """Test POST /api/visit-requests - Create visit request"""
        print("\n=== Testing Create Visit Request ===")
        
        if not self.resident_token:
            self.log_result("Create Visit Request", False, "No resident token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.resident_token}"}
            
            # Test data for visit request
            data = {
                'visitor_name': 'John Smith',
                'visitor_phone': '+1234567890',
                'visitor_email': 'john.smith@example.com',
                'visitor_id_number': 'ID123456789',
                'visit_purpose': 'family_visit',
                'visit_date': (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d %H:%M:%S'),
                'unit_number': self.resident_user.get('unit_number', 'A101'),
                'host_name': self.resident_user.get('full_name', 'Test Host'),
                'host_phone': '+1987654321',
                'special_instructions': 'Please call upon arrival',
                'vehicle_plate': 'ABC123',
                'escort_required': False,
                'pre_approved': False
            }
            
            response = self.session.post(f"{BASE_URL}/visit-requests", data=data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                self.test_visit_request_id = result.get("request_id")
                self.log_result("Create Visit Request", True, f"Visit request created successfully - ID: {self.test_visit_request_id}")
                return True
            else:
                self.log_result("Create Visit Request", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Visit Request", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_visit_requests_resident(self):
        """Test GET /api/visit-requests - Resident access"""
        print("\n=== Testing Get Visit Requests (Resident) ===")
        
        if not self.resident_token:
            self.log_result("Get Visit Requests (Resident)", False, "No resident token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/visit-requests", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                requests_list = result.get("requests", [])
                self.log_result("Get Visit Requests (Resident)", True, f"Retrieved {len(requests_list)} visit requests for resident")
                return True
            else:
                self.log_result("Get Visit Requests (Resident)", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Visit Requests (Resident)", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_visit_requests_admin(self):
        """Test GET /api/visit-requests - Admin access"""
        print("\n=== Testing Get Visit Requests (Admin) ===")
        
        if not self.admin_token:
            self.log_result("Get Visit Requests (Admin)", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/visit-requests", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                requests_list = result.get("requests", [])
                self.log_result("Get Visit Requests (Admin)", True, f"Retrieved {len(requests_list)} visit requests for admin (all compound requests)")
                return True
            else:
                self.log_result("Get Visit Requests (Admin)", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Visit Requests (Admin)", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_guests(self):
        """Test GET /api/guests - Get approved visitors"""
        print("\n=== Testing Get Guests ===")
        
        if not self.admin_token:
            self.log_result("Get Guests", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/guests", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                guests_list = result.get("guests", [])
                self.log_result("Get Guests", True, f"Retrieved {len(guests_list)} approved guests")
                return True
            else:
                self.log_result("Get Guests", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Guests", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_guest_stats(self):
        """Test GET /api/guests/stats - Get guest statistics"""
        print("\n=== Testing Get Guest Stats ===")
        
        if not self.admin_token:
            self.log_result("Get Guest Stats", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/guests/stats", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                stats = result.get("stats", {})
                expected_fields = ["total_visitors", "pending_approvals", "active_visits", "todays_visits"]
                
                missing_fields = [field for field in expected_fields if field not in stats]
                if missing_fields:
                    self.log_result("Get Guest Stats", False, f"Missing stats fields: {missing_fields}")
                    return False
                
                self.log_result("Get Guest Stats", True, f"Retrieved guest stats: {stats}")
                return True
            else:
                self.log_result("Get Guest Stats", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Guest Stats", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_visit_request_validation(self):
        """Test visit request form validation"""
        print("\n=== Testing Visit Request Validation ===")
        
        if not self.resident_token:
            self.log_result("Visit Request Validation", False, "No resident token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.resident_token}"}
            
            # Test missing required fields
            invalid_data = {
                'visitor_name': '',  # Empty required field
                'visitor_phone': '+1234567890',
                'visit_purpose': 'invalid_purpose',  # Invalid enum value
                'visit_date': 'invalid_date',  # Invalid date format
                'unit_number': self.resident_user.get('unit_number', 'A101'),
                'host_name': self.resident_user.get('full_name', 'Test Host'),
                'host_phone': '+1987654321'
            }
            
            response = self.session.post(f"{BASE_URL}/visit-requests", data=invalid_data, headers=headers)
            
            # Should fail with validation error
            if response.status_code in [400, 422]:
                self.log_result("Visit Request Validation", True, f"Validation correctly rejected invalid data with status {response.status_code}")
                return True
            else:
                self.log_result("Visit Request Validation", False, f"Expected validation error but got status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Visit Request Validation", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_visit_purposes(self):
        """Test different visit purposes"""
        print("\n=== Testing Visit Purposes ===")
        
        if not self.resident_token:
            self.log_result("Visit Purposes", False, "No resident token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.resident_token}"}
            purposes = ["family_visit", "business_meeting", "delivery", "maintenance", "healthcare", "social_event", "other"]
            successful_purposes = []
            
            for purpose in purposes:
                data = {
                    'visitor_name': f'Test Visitor {purpose}',
                    'visitor_phone': '+1234567890',
                    'visit_purpose': purpose,
                    'visit_date': (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d %H:%M:%S'),
                    'unit_number': self.resident_user.get('unit_number', 'A101'),
                    'host_name': self.resident_user.get('full_name', 'Test Host'),
                    'host_phone': '+1987654321'
                }
                
                response = self.session.post(f"{BASE_URL}/visit-requests", data=data, headers=headers)
                
                if response.status_code == 200:
                    successful_purposes.append(purpose)
            
            if len(successful_purposes) == len(purposes):
                self.log_result("Visit Purposes", True, f"All {len(purposes)} visit purposes accepted: {successful_purposes}")
                return True
            else:
                failed_purposes = [p for p in purposes if p not in successful_purposes]
                self.log_result("Visit Purposes", False, f"Failed purposes: {failed_purposes}, Successful: {successful_purposes}")
                return False
                
        except Exception as e:
            self.log_result("Visit Purposes", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_admin_pre_approval(self):
        """Test admin pre-approval functionality"""
        print("\n=== Testing Admin Pre-Approval ===")
        
        if not self.admin_token:
            self.log_result("Admin Pre-Approval", False, "No admin token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            data = {
                'visitor_name': 'Pre-Approved Visitor',
                'visitor_phone': '+1234567890',
                'visit_purpose': 'business_meeting',
                'visit_date': (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d %H:%M:%S'),
                'unit_number': 'A101',
                'host_name': 'Admin Host',
                'host_phone': '+1987654321',
                'pre_approved': True  # Admin can pre-approve
            }
            
            response = self.session.post(f"{BASE_URL}/visit-requests", data=data, headers=headers)
            
            if response.status_code == 200:
                # Verify the request was created as approved
                headers_get = self.setup_auth_headers(self.admin_token)
                get_response = self.session.get(f"{BASE_URL}/visit-requests", headers=headers_get)
                
                if get_response.status_code == 200:
                    requests_list = get_response.json().get("requests", [])
                    pre_approved_request = next((r for r in requests_list if r.get("visitor_name") == "Pre-Approved Visitor"), None)
                    
                    if pre_approved_request and pre_approved_request.get("status") == "approved":
                        self.log_result("Admin Pre-Approval", True, "Admin successfully created pre-approved visit request")
                        return True
                    else:
                        self.log_result("Admin Pre-Approval", False, "Pre-approved request not found or not approved")
                        return False
                else:
                    self.log_result("Admin Pre-Approval", False, "Failed to retrieve requests for verification")
                    return False
            else:
                self.log_result("Admin Pre-Approval", False, f"Failed to create pre-approved request with status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Admin Pre-Approval", False, f"Exception occurred: {str(e)}")
            return False

    # ============ EVENTS & ANNOUNCEMENTS TESTS ============
    
    def test_create_announcement(self):
        """Test POST /api/announcements - Create announcement"""
        print("\n=== Testing Create Announcement ===")
        
        if not self.admin_token:
            self.log_result("Create Announcement", False, "No admin token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            data = {
                'title': 'Important Community Notice',
                'content': 'This is a test announcement for the community. Please read carefully.',
                'category': 'general',
                'priority': 'high',
                'target_audience': 'all',
                'send_push': True,
                'send_email': False,
                'is_emergency': False
            }
            
            response = self.session.post(f"{BASE_URL}/announcements", data=data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                self.test_announcement_id = result.get("announcement_id")
                self.log_result("Create Announcement", True, f"Announcement created successfully - ID: {self.test_announcement_id}")
                return True
            else:
                self.log_result("Create Announcement", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Announcement", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_event(self):
        """Test POST /api/events - Create event"""
        print("\n=== Testing Create Event ===")
        
        if not self.admin_token:
            self.log_result("Create Event", False, "No admin token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            data = {
                'title': 'Community BBQ Event',
                'content': 'Join us for a fun community BBQ event in the main courtyard.',
                'category': 'social',
                'priority': 'normal',
                'event_date': (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'),
                'event_time': '18:00',
                'event_location': 'Main Courtyard',
                'max_attendees': 50,
                'target_audience': 'all',
                'send_push': True,
                'send_email': False
            }
            
            response = self.session.post(f"{BASE_URL}/events", data=data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                self.test_event_id = result.get("event_id")
                self.log_result("Create Event", True, f"Event created successfully - ID: {self.test_event_id}")
                return True
            else:
                self.log_result("Create Event", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Event", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_announcements(self):
        """Test GET /api/announcements - Get announcements"""
        print("\n=== Testing Get Announcements ===")
        
        if not self.resident_token:
            self.log_result("Get Announcements", False, "No resident token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/announcements", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                announcements = result.get("announcements", [])
                self.log_result("Get Announcements", True, f"Retrieved {len(announcements)} announcements")
                return True
            else:
                self.log_result("Get Announcements", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Announcements", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_events(self):
        """Test GET /api/events - Get events"""
        print("\n=== Testing Get Events ===")
        
        if not self.resident_token:
            self.log_result("Get Events", False, "No resident token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/events", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                events = result.get("events", [])
                self.log_result("Get Events", True, f"Retrieved {len(events)} events")
                return True
            else:
                self.log_result("Get Events", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Events", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_events_stats(self):
        """Test GET /api/events/stats - Get events and announcements statistics"""
        print("\n=== Testing Get Events Stats ===")
        
        if not self.admin_token:
            self.log_result("Get Events Stats", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/events/stats", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                stats = result.get("stats", {})
                expected_fields = ["total_announcements", "upcoming_events", "total_participants", "engagement_rate"]
                
                missing_fields = [field for field in expected_fields if field not in stats]
                if missing_fields:
                    self.log_result("Get Events Stats", False, f"Missing stats fields: {missing_fields}")
                    return False
                
                self.log_result("Get Events Stats", True, f"Retrieved events stats: {stats}")
                return True
            else:
                self.log_result("Get Events Stats", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Events Stats", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_announcement_categories(self):
        """Test different announcement categories"""
        print("\n=== Testing Announcement Categories ===")
        
        if not self.admin_token:
            self.log_result("Announcement Categories", False, "No admin token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            categories = ["general", "maintenance", "security", "community", "utilities", "events", "emergency"]
            successful_categories = []
            
            for category in categories:
                data = {
                    'title': f'Test {category.title()} Announcement',
                    'content': f'This is a test announcement for {category} category.',
                    'category': category,
                    'priority': 'normal',
                    'target_audience': 'all'
                }
                
                response = self.session.post(f"{BASE_URL}/announcements", data=data, headers=headers)
                
                if response.status_code == 200:
                    successful_categories.append(category)
            
            if len(successful_categories) == len(categories):
                self.log_result("Announcement Categories", True, f"All {len(categories)} categories accepted: {successful_categories}")
                return True
            else:
                failed_categories = [c for c in categories if c not in successful_categories]
                self.log_result("Announcement Categories", False, f"Failed categories: {failed_categories}")
                return False
                
        except Exception as e:
            self.log_result("Announcement Categories", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_announcement_priorities(self):
        """Test different announcement priority levels"""
        print("\n=== Testing Announcement Priorities ===")
        
        if not self.admin_token:
            self.log_result("Announcement Priorities", False, "No admin token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            priorities = ["low", "normal", "high", "urgent"]
            successful_priorities = []
            
            for priority in priorities:
                data = {
                    'title': f'Test {priority.title()} Priority Announcement',
                    'content': f'This is a test announcement with {priority} priority.',
                    'category': 'general',
                    'priority': priority,
                    'target_audience': 'all'
                }
                
                response = self.session.post(f"{BASE_URL}/announcements", data=data, headers=headers)
                
                if response.status_code == 200:
                    successful_priorities.append(priority)
            
            if len(successful_priorities) == len(priorities):
                self.log_result("Announcement Priorities", True, f"All {len(priorities)} priorities accepted: {successful_priorities}")
                return True
            else:
                failed_priorities = [p for p in priorities if p not in successful_priorities]
                self.log_result("Announcement Priorities", False, f"Failed priorities: {failed_priorities}")
                return False
                
        except Exception as e:
            self.log_result("Announcement Priorities", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_event_categories(self):
        """Test different event categories"""
        print("\n=== Testing Event Categories ===")
        
        if not self.admin_token:
            self.log_result("Event Categories", False, "No admin token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            categories = ["social", "sports", "cultural", "educational", "health", "business", "religious"]
            successful_categories = []
            
            for category in categories:
                data = {
                    'title': f'Test {category.title()} Event',
                    'content': f'This is a test event for {category} category.',
                    'category': category,
                    'priority': 'normal',
                    'event_date': (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d'),
                    'event_time': '18:00',
                    'event_location': 'Community Center',
                    'target_audience': 'all'
                }
                
                response = self.session.post(f"{BASE_URL}/events", data=data, headers=headers)
                
                if response.status_code == 200:
                    successful_categories.append(category)
            
            if len(successful_categories) == len(categories):
                self.log_result("Event Categories", True, f"All {len(categories)} event categories accepted: {successful_categories}")
                return True
            else:
                failed_categories = [c for c in categories if c not in successful_categories]
                self.log_result("Event Categories", False, f"Failed event categories: {failed_categories}")
                return False
                
        except Exception as e:
            self.log_result("Event Categories", False, f"Exception occurred: {str(e)}")
            return False

    # ============ ANALYTICS TESTS ============
    
    def test_analytics_dashboard(self):
        """Test GET /api/analytics/dashboard - Get analytics dashboard"""
        print("\n=== Testing Analytics Dashboard ===")
        
        if not self.admin_token:
            self.log_result("Analytics Dashboard", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/analytics/dashboard", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                
                # Check for expected sections
                expected_sections = ["residents", "maintenance", "revenue", "engagement", "charts", "recent_activity", "summary"]
                missing_sections = [section for section in expected_sections if section not in result]
                
                if missing_sections:
                    self.log_result("Analytics Dashboard", False, f"Missing analytics sections: {missing_sections}")
                    return False
                
                # Check charts data
                charts = result.get("charts", {})
                expected_charts = ["resident_growth", "maintenance_trend", "revenue_trend", "activity_trend"]
                missing_charts = [chart for chart in expected_charts if chart not in charts]
                
                if missing_charts:
                    self.log_result("Analytics Dashboard", False, f"Missing chart data: {missing_charts}")
                    return False
                
                self.log_result("Analytics Dashboard", True, f"Analytics dashboard retrieved successfully with all sections and charts")
                return True
            else:
                self.log_result("Analytics Dashboard", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Analytics Dashboard", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_analytics_date_ranges(self):
        """Test analytics dashboard with different date ranges"""
        print("\n=== Testing Analytics Date Ranges ===")
        
        if not self.admin_token:
            self.log_result("Analytics Date Ranges", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            date_ranges = ["last_7_days", "last_30_days", "last_90_days", "last_6_months", "last_year"]
            successful_ranges = []
            
            for date_range in date_ranges:
                response = self.session.get(f"{BASE_URL}/analytics/dashboard?date_range={date_range}", headers=headers)
                
                if response.status_code == 200:
                    successful_ranges.append(date_range)
            
            if len(successful_ranges) == len(date_ranges):
                self.log_result("Analytics Date Ranges", True, f"All {len(date_ranges)} date ranges working: {successful_ranges}")
                return True
            else:
                failed_ranges = [r for r in date_ranges if r not in successful_ranges]
                self.log_result("Analytics Date Ranges", False, f"Failed date ranges: {failed_ranges}")
                return False
                
        except Exception as e:
            self.log_result("Analytics Date Ranges", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_analytics_admin_only_access(self):
        """Test that analytics is admin-only"""
        print("\n=== Testing Analytics Admin-Only Access ===")
        
        if not self.resident_token:
            self.log_result("Analytics Admin-Only Access", False, "No resident token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/analytics/dashboard", headers=headers)
            
            # Should be denied for non-admin users
            if response.status_code == 403:
                self.log_result("Analytics Admin-Only Access", True, "Analytics correctly denied for non-admin user")
                return True
            else:
                self.log_result("Analytics Admin-Only Access", False, f"Expected 403 but got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Analytics Admin-Only Access", False, f"Exception occurred: {str(e)}")
            return False

    # ============ INTEGRATION & ERROR HANDLING TESTS ============
    
    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        print("\n=== Testing Unauthorized Access ===")
        
        try:
            endpoints = [
                "/visit-requests",
                "/guests",
                "/guests/stats",
                "/announcements",
                "/events",
                "/events/stats",
                "/analytics/dashboard"
            ]
            
            unauthorized_responses = []
            
            for endpoint in endpoints:
                response = self.session.get(f"{BASE_URL}{endpoint}")
                if response.status_code in [401, 403]:
                    unauthorized_responses.append(endpoint)
            
            if len(unauthorized_responses) == len(endpoints):
                self.log_result("Unauthorized Access", True, f"All {len(endpoints)} endpoints correctly reject unauthorized access")
                return True
            else:
                allowed_endpoints = [e for e in endpoints if e not in unauthorized_responses]
                self.log_result("Unauthorized Access", False, f"Endpoints allowing unauthorized access: {allowed_endpoints}")
                return False
                
        except Exception as e:
            self.log_result("Unauthorized Access", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_data_validation(self):
        """Test data validation across endpoints"""
        print("\n=== Testing Data Validation ===")
        
        if not self.admin_token:
            self.log_result("Data Validation", False, "No admin token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            validation_tests = []
            
            # Test invalid announcement data
            invalid_announcement = {
                'title': '',  # Empty title
                'content': 'x' * 10000,  # Too long content
                'category': 'invalid_category',  # Invalid category
                'priority': 'super_urgent'  # Invalid priority
            }
            
            response = self.session.post(f"{BASE_URL}/announcements", data=invalid_announcement, headers=headers)
            if response.status_code in [400, 422]:
                validation_tests.append("announcement_validation")
            
            # Test invalid event data
            invalid_event = {
                'title': '',  # Empty title
                'content': 'Test event',
                'category': 'invalid_category',  # Invalid category
                'event_date': 'invalid_date',  # Invalid date
                'event_time': '25:00'  # Invalid time
            }
            
            response = self.session.post(f"{BASE_URL}/events", data=invalid_event, headers=headers)
            if response.status_code in [400, 422]:
                validation_tests.append("event_validation")
            
            if len(validation_tests) >= 2:
                self.log_result("Data Validation", True, f"Data validation working for: {validation_tests}")
                return True
            else:
                self.log_result("Data Validation", False, f"Validation issues detected. Working: {validation_tests}")
                return False
                
        except Exception as e:
            self.log_result("Data Validation", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_compound_data_isolation(self):
        """Test that users only see data from their compound"""
        print("\n=== Testing Compound Data Isolation ===")
        
        if not self.resident_token:
            self.log_result("Compound Data Isolation", False, "No resident token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            
            # Get visit requests
            response = self.session.get(f"{BASE_URL}/visit-requests", headers=headers)
            if response.status_code == 200:
                requests_list = response.json().get("requests", [])
                # All requests should belong to the user's compound
                compound_ids = set(req.get("compound_id") for req in requests_list if req.get("compound_id"))
                
                if len(compound_ids) <= 1:  # Should be 0 or 1 (user's compound)
                    self.log_result("Compound Data Isolation", True, f"Data isolation working - only compound data visible")
                    return True
                else:
                    self.log_result("Compound Data Isolation", False, f"Data leakage detected - multiple compounds: {compound_ids}")
                    return False
            else:
                self.log_result("Compound Data Isolation", False, f"Failed to test isolation - status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Compound Data Isolation", False, f"Exception occurred: {str(e)}")
            return False

    # ============ MAIN TEST EXECUTION ============
    
    def run_all_tests(self):
        """Run all Phase 2 backend tests"""
        print("🚀 STARTING HOMEME PHASE 2 BACKEND TESTING SUITE")
        print("=" * 60)
        
        # Authentication Setup
        if not self.test_admin_authentication():
            print("❌ Admin authentication failed - some tests will be skipped")
        
        if not self.test_resident_authentication():
            print("❌ Resident authentication failed - some tests will be skipped")
        
        # Guest Management Tests
        print("\n" + "="*60)
        print("🏠 GUEST MANAGEMENT ENDPOINTS TESTING")
        print("="*60)
        
        self.test_create_visit_request()
        self.test_get_visit_requests_resident()
        self.test_get_visit_requests_admin()
        self.test_get_guests()
        self.test_get_guest_stats()
        self.test_visit_request_validation()
        self.test_visit_purposes()
        self.test_admin_pre_approval()
        
        # Events & Announcements Tests
        print("\n" + "="*60)
        print("📢 EVENTS & ANNOUNCEMENTS ENDPOINTS TESTING")
        print("="*60)
        
        self.test_create_announcement()
        self.test_create_event()
        self.test_get_announcements()
        self.test_get_events()
        self.test_get_events_stats()
        self.test_announcement_categories()
        self.test_announcement_priorities()
        self.test_event_categories()
        
        # Analytics Tests
        print("\n" + "="*60)
        print("📊 ANALYTICS ENDPOINTS TESTING")
        print("="*60)
        
        self.test_analytics_dashboard()
        self.test_analytics_date_ranges()
        self.test_analytics_admin_only_access()
        
        # Integration & Security Tests
        print("\n" + "="*60)
        print("🔒 INTEGRATION & SECURITY TESTING")
        print("="*60)
        
        self.test_unauthorized_access()
        self.test_data_validation()
        self.test_compound_data_isolation()
        
        return self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("📋 PHASE 2 BACKEND TESTING SUMMARY")
        print("="*60)
        
        total_tests = len(self.results)
        passed_tests = len([r for r in self.results if "✅ PASS" in r["status"]])
        failed_tests = total_tests - passed_tests
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS ({failed_tests}):")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        print(f"\n✅ PASSED TESTS ({passed_tests}):")
        for result in self.results:
            if "✅ PASS" in result["status"]:
                print(f"  - {result['test']}: {result['message']}")
        
        return success_rate >= 80  # Consider 80%+ success rate as overall success

if __name__ == "__main__":
    test_suite = HomePhase2TestSuite()
    
    print("🔍 RUNNING HOMEME PHASE 2 BACKEND TESTING")
    print("Testing newly implemented Phase 2 endpoints:")
    print("- Guest Management (Visit Requests)")
    print("- Events & Announcements")
    print("- Analytics Dashboard")
    
    success = test_suite.run_all_tests()
    
    if success:
        print("\n🎉 PHASE 2 BACKEND TESTING COMPLETED SUCCESSFULLY!")
    else:
        print("\n⚠️ PHASE 2 BACKEND TESTING COMPLETED WITH ISSUES")
    
    exit(0 if success else 1)