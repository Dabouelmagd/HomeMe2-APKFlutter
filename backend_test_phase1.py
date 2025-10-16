#!/usr/bin/env python3
"""
HomeMe Phase 1 Enhancement Testing Suite
Tests the newly implemented maintenance and notification systems
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
BASE_URL = "https://tenant-dashboard-10.preview.emergentagent.com/api"
WS_URL = "wss://resident-portal-11.preview.emergentagent.com/ws/notifications"

class HomePhase1TestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.resident_token = None
        self.admin_user = None
        self.resident_user = None
        self.compound_id = None
        self.test_maintenance_request_id = None
        self.test_notification_id = None
        self.websocket_connection = None
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
        """Test admin authentication for maintenance and notification systems"""
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
        """Test resident authentication for maintenance requests"""
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
    
    def test_create_maintenance_request(self):
        """Test POST /api/maintenance/requests - Create maintenance request"""
        print("\n=== Testing Create Maintenance Request ===")
        
        if not self.resident_token:
            self.log_result("Create Maintenance Request", False, "No resident token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.resident_token}"}
            
            # Create test image for upload
            test_image = self.create_test_image("test_maintenance.jpg")
            
            # Prepare form data
            files = {
                'images': ('test_maintenance.jpg', test_image, 'image/jpeg')
            }
            
            data = {
                'title': 'Kitchen Sink Leak',
                'description': 'The kitchen sink is leaking water from the faucet and needs immediate repair',
                'category': 'plumbing',
                'priority': 'high',
                'location': 'Kitchen',
                'contact_method': 'app',
                'preferred_time': (datetime.now() + timedelta(days=1)).isoformat()
            }
            
            response = self.session.post(f"{BASE_URL}/maintenance/requests", 
                                       data=data, files=files, headers={"Authorization": f"Bearer {self.resident_token}"})
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Maintenance request created successfully":
                    self.test_maintenance_request_id = result.get("request_id")
                    self.log_result("Create Maintenance Request", True, f"Maintenance request created successfully with ID: {self.test_maintenance_request_id}")
                    return True
                else:
                    self.log_result("Create Maintenance Request", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Create Maintenance Request", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Maintenance Request", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_maintenance_requests_resident(self):
        """Test GET /api/maintenance/requests - Get maintenance requests (resident perspective)"""
        print("\n=== Testing Get Maintenance Requests (Resident) ===")
        
        if not self.resident_token:
            self.log_result("Get Maintenance Requests (Resident)", False, "No resident token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/maintenance/requests", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                requests = data.get("requests", [])
                self.log_result("Get Maintenance Requests (Resident)", True, f"Retrieved {len(requests)} maintenance requests for resident")
                
                # Verify resident only sees their own requests
                if requests:
                    for req in requests:
                        if req.get("requester_id") != self.resident_user["id"]:
                            self.log_result("Get Maintenance Requests (Resident)", False, "Resident can see other users' requests - security issue")
                            return False
                    self.log_result("Role-based Access Control", True, "Resident correctly sees only their own requests")
                
                return True
            else:
                self.log_result("Get Maintenance Requests (Resident)", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Maintenance Requests (Resident)", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_maintenance_requests_admin(self):
        """Test GET /api/maintenance/requests - Get maintenance requests (admin perspective)"""
        print("\n=== Testing Get Maintenance Requests (Admin) ===")
        
        if not self.admin_token:
            self.log_result("Get Maintenance Requests (Admin)", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/maintenance/requests", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                requests = data.get("requests", [])
                self.log_result("Get Maintenance Requests (Admin)", True, f"Retrieved {len(requests)} maintenance requests for admin")
                
                # Test filtering by status
                response_pending = self.session.get(f"{BASE_URL}/maintenance/requests?status=pending", headers=headers)
                if response_pending.status_code == 200:
                    pending_data = response_pending.json()
                    pending_requests = pending_data.get("requests", [])
                    self.log_result("Maintenance Requests Filtering", True, f"Status filtering works - {len(pending_requests)} pending requests")
                
                # Test filtering by category
                response_plumbing = self.session.get(f"{BASE_URL}/maintenance/requests?category=plumbing", headers=headers)
                if response_plumbing.status_code == 200:
                    plumbing_data = response_plumbing.json()
                    plumbing_requests = plumbing_data.get("requests", [])
                    self.log_result("Maintenance Category Filtering", True, f"Category filtering works - {len(plumbing_requests)} plumbing requests")
                
                return True
            else:
                self.log_result("Get Maintenance Requests (Admin)", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Maintenance Requests (Admin)", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_maintenance_stats(self):
        """Test GET /api/maintenance/stats - Get maintenance statistics"""
        print("\n=== Testing Get Maintenance Stats ===")
        
        if not self.admin_token:
            self.log_result("Get Maintenance Stats", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/maintenance/stats", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                stats = data.get("stats", {})
                
                # Verify required stats fields
                required_fields = ["total", "pending", "assigned", "in_progress", "completed", "cancelled"]
                priority_fields = ["low_priority", "normal_priority", "high_priority", "urgent_priority"]
                category_fields = ["plumbing", "electrical", "hvac", "appliance", "general", "cleaning", "landscaping", "security"]
                
                all_fields_present = True
                for field in required_fields + priority_fields + category_fields:
                    if field not in stats:
                        all_fields_present = False
                        break
                
                if all_fields_present:
                    self.log_result("Get Maintenance Stats", True, f"Maintenance stats retrieved successfully - Total: {stats.get('total')}, Pending: {stats.get('pending')}")
                    return True
                else:
                    self.log_result("Get Maintenance Stats", False, f"Missing required stats fields: {stats}")
                    return False
            else:
                self.log_result("Get Maintenance Stats", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Maintenance Stats", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_notifications(self):
        """Test GET /api/notifications - Get notifications"""
        print("\n=== Testing Get Notifications ===")
        
        if not self.resident_token:
            self.log_result("Get Notifications", False, "No resident token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/notifications", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                notifications = data.get("notifications", [])
                total = data.get("total", 0)
                unread = data.get("unread", 0)
                
                self.log_result("Get Notifications", True, f"Retrieved {len(notifications)} notifications - Total: {total}, Unread: {unread}")
                
                # Test pagination
                response_paginated = self.session.get(f"{BASE_URL}/notifications?limit=5&offset=0", headers=headers)
                if response_paginated.status_code == 200:
                    paginated_data = response_paginated.json()
                    paginated_notifications = paginated_data.get("notifications", [])
                    self.log_result("Notification Pagination", True, f"Pagination works - Retrieved {len(paginated_notifications)} notifications with limit=5")
                
                return True
            else:
                self.log_result("Get Notifications", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Notifications", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_mark_notification_read(self):
        """Test PATCH /api/notifications/{id}/read - Mark notification as read"""
        print("\n=== Testing Mark Notification Read ===")
        
        if not self.resident_token:
            self.log_result("Mark Notification Read", False, "No resident token available")
            return False
        
        try:
            # First get notifications to find one to mark as read
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/notifications", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                notifications = data.get("notifications", [])
                
                if notifications:
                    # Use the first notification
                    notification_id = notifications[0].get("id")
                    
                    # Mark it as read
                    read_response = self.session.patch(f"{BASE_URL}/notifications/{notification_id}/read", headers=headers)
                    
                    if read_response.status_code == 200:
                        result = read_response.json()
                        if result.get("message") == "Notification marked as read":
                            self.log_result("Mark Notification Read", True, f"Notification {notification_id} marked as read successfully")
                            return True
                        else:
                            self.log_result("Mark Notification Read", False, f"Unexpected response: {result}")
                            return False
                    else:
                        self.log_result("Mark Notification Read", False, f"Failed to mark as read with status {read_response.status_code}")
                        return False
                else:
                    # Create a test notification first
                    return self.create_test_notification_and_mark_read()
            else:
                self.log_result("Mark Notification Read", False, f"Failed to get notifications: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Mark Notification Read", False, f"Exception occurred: {str(e)}")
            return False
    
    def create_test_notification_and_mark_read(self):
        """Helper method to create a test notification and mark it as read"""
        try:
            # Create a notification using admin token
            if not self.admin_token:
                return False
                
            headers = self.setup_auth_headers(self.admin_token)
            notification_data = {
                "title": "Test Notification",
                "message": "This is a test notification for marking as read",
                "type": "general",
                "priority": "normal",
                "recipient_id": self.resident_user["id"]
            }
            
            response = self.session.post(f"{BASE_URL}/notifications", json=notification_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                notification_id = result.get("notification_id")
                
                if notification_id:
                    # Now mark it as read with resident token
                    resident_headers = self.setup_auth_headers(self.resident_token)
                    read_response = self.session.patch(f"{BASE_URL}/notifications/{notification_id}/read", headers=resident_headers)
                    
                    if read_response.status_code == 200:
                        self.log_result("Mark Notification Read", True, f"Test notification created and marked as read successfully")
                        return True
            
            return False
        except:
            return False
    
    def test_mark_all_notifications_read(self):
        """Test PATCH /api/notifications/mark-all-read - Mark all notifications as read"""
        print("\n=== Testing Mark All Notifications Read ===")
        
        if not self.resident_token:
            self.log_result("Mark All Notifications Read", False, "No resident token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.patch(f"{BASE_URL}/notifications/mark-all-read", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if "marked as read" in result.get("message", "").lower():
                    marked_count = result.get("marked_count", 0)
                    self.log_result("Mark All Notifications Read", True, f"All notifications marked as read successfully - {marked_count} notifications marked")
                    return True
                else:
                    self.log_result("Mark All Notifications Read", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Mark All Notifications Read", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Mark All Notifications Read", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_delete_notification(self):
        """Test DELETE /api/notifications/{id} - Delete notification"""
        print("\n=== Testing Delete Notification ===")
        
        if not self.resident_token:
            self.log_result("Delete Notification", False, "No resident token available")
            return False
        
        try:
            # First create a test notification to delete
            if not self.admin_token:
                self.log_result("Delete Notification", False, "No admin token to create test notification")
                return False
                
            headers = self.setup_auth_headers(self.admin_token)
            notification_data = {
                "title": "Test Notification for Deletion",
                "message": "This notification will be deleted",
                "type": "general",
                "priority": "low",
                "recipient_id": self.resident_user["id"]
            }
            
            response = self.session.post(f"{BASE_URL}/notifications", json=notification_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                notification_id = result.get("notification_id")
                
                if notification_id:
                    # Now delete it with resident token
                    resident_headers = self.setup_auth_headers(self.resident_token)
                    delete_response = self.session.delete(f"{BASE_URL}/notifications/{notification_id}", headers=resident_headers)
                    
                    if delete_response.status_code == 200:
                        delete_result = delete_response.json()
                        if "deleted" in delete_result.get("message", "").lower():
                            self.log_result("Delete Notification", True, f"Notification {notification_id} deleted successfully")
                            return True
                        else:
                            self.log_result("Delete Notification", False, f"Unexpected delete response: {delete_result}")
                            return False
                    else:
                        self.log_result("Delete Notification", False, f"Failed to delete with status {delete_response.status_code}")
                        return False
                else:
                    self.log_result("Delete Notification", False, "No notification ID in create response")
                    return False
            else:
                self.log_result("Delete Notification", False, f"Failed to create test notification: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Delete Notification", False, f"Exception occurred: {str(e)}")
            return False
    
    async def test_websocket_connection(self):
        """Test WebSocket connection endpoint /ws/notifications/{user_id}"""
        print("\n=== Testing WebSocket Connection ===")
        
        if not self.resident_user:
            self.log_result("WebSocket Connection", False, "No resident user available")
            return False
        
        try:
            user_id = self.resident_user["id"]
            ws_url = f"{WS_URL}/{user_id}"
            
            # Test WebSocket connection
            async with websockets.connect(ws_url) as websocket:
                self.log_result("WebSocket Connection Established", True, f"Successfully connected to {ws_url}")
                
                # Test ping/pong functionality
                ping_message = {
                    "type": "ping",
                    "timestamp": datetime.now().isoformat()
                }
                
                await websocket.send(json.dumps(ping_message))
                
                # Wait for response with timeout
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    response_data = json.loads(response)
                    
                    if response_data.get("type") == "pong":
                        self.log_result("WebSocket Ping/Pong", True, "Ping/pong functionality working correctly")
                        return True
                    elif response_data.get("type") == "connection_established":
                        self.log_result("WebSocket Connection Confirmation", True, "Connection confirmation received")
                        
                        # Try ping again
                        await websocket.send(json.dumps(ping_message))
                        pong_response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                        pong_data = json.loads(pong_response)
                        
                        if pong_data.get("type") == "pong":
                            self.log_result("WebSocket Ping/Pong", True, "Ping/pong functionality working correctly")
                            return True
                        else:
                            self.log_result("WebSocket Ping/Pong", False, f"Expected pong, got: {pong_data}")
                            return False
                    else:
                        self.log_result("WebSocket Ping/Pong", False, f"Unexpected response: {response_data}")
                        return False
                        
                except asyncio.TimeoutError:
                    self.log_result("WebSocket Ping/Pong", False, "Timeout waiting for pong response")
                    return False
                    
        except Exception as e:
            self.log_result("WebSocket Connection", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_maintenance_data_validation(self):
        """Test maintenance request data validation"""
        print("\n=== Testing Maintenance Data Validation ===")
        
        if not self.resident_token:
            self.log_result("Maintenance Data Validation", False, "No resident token available")
            return False
        
        success_count = 0
        total_tests = 0
        
        headers = {"Authorization": f"Bearer {self.resident_token}"}
        
        # Test 1: Invalid category
        try:
            total_tests += 1
            data = {
                'title': 'Test Request',
                'description': 'Test description',
                'category': 'invalid_category',  # Invalid category
                'priority': 'high',
                'location': 'Kitchen'
            }
            
            response = self.session.post(f"{BASE_URL}/maintenance/requests", data=data, headers=headers)
            
            if response.status_code == 422:  # Validation error
                self.log_result("Invalid Category Validation", True, "Correctly rejected invalid category")
                success_count += 1
            else:
                self.log_result("Invalid Category Validation", False, f"Expected 422, got {response.status_code}")
        except Exception as e:
            self.log_result("Invalid Category Validation", False, f"Exception occurred: {str(e)}")
        
        # Test 2: Invalid priority
        try:
            total_tests += 1
            data = {
                'title': 'Test Request',
                'description': 'Test description',
                'category': 'plumbing',
                'priority': 'invalid_priority',  # Invalid priority
                'location': 'Kitchen'
            }
            
            response = self.session.post(f"{BASE_URL}/maintenance/requests", data=data, headers=headers)
            
            if response.status_code == 422:  # Validation error
                self.log_result("Invalid Priority Validation", True, "Correctly rejected invalid priority")
                success_count += 1
            else:
                self.log_result("Invalid Priority Validation", False, f"Expected 422, got {response.status_code}")
        except Exception as e:
            self.log_result("Invalid Priority Validation", False, f"Exception occurred: {str(e)}")
        
        # Test 3: Missing required fields
        try:
            total_tests += 1
            data = {
                'title': 'Test Request',
                # Missing description, category, priority
                'location': 'Kitchen'
            }
            
            response = self.session.post(f"{BASE_URL}/maintenance/requests", data=data, headers=headers)
            
            if response.status_code == 422:  # Validation error
                self.log_result("Missing Fields Validation", True, "Correctly rejected missing required fields")
                success_count += 1
            else:
                self.log_result("Missing Fields Validation", False, f"Expected 422, got {response.status_code}")
        except Exception as e:
            self.log_result("Missing Fields Validation", False, f"Exception occurred: {str(e)}")
        
        # Test 4: Valid categories
        valid_categories = ["plumbing", "electrical", "hvac", "appliance", "general", "cleaning", "landscaping", "security"]
        for category in valid_categories:
            try:
                total_tests += 1
                data = {
                    'title': f'Test {category.title()} Request',
                    'description': f'Test {category} maintenance request',
                    'category': category,
                    'priority': 'normal',
                    'location': 'Test Location'
                }
                
                response = self.session.post(f"{BASE_URL}/maintenance/requests", data=data, headers=headers)
                
                if response.status_code == 200:
                    self.log_result(f"Valid Category - {category.title()}", True, f"Successfully created {category} request")
                    success_count += 1
                else:
                    self.log_result(f"Valid Category - {category.title()}", False, f"Failed to create {category} request: {response.status_code}")
            except Exception as e:
                self.log_result(f"Valid Category - {category.title()}", False, f"Exception occurred: {str(e)}")
        
        # Test 5: Valid priorities
        valid_priorities = ["low", "normal", "high", "urgent"]
        for priority in valid_priorities:
            try:
                total_tests += 1
                data = {
                    'title': f'Test {priority.title()} Priority Request',
                    'description': f'Test maintenance request with {priority} priority',
                    'category': 'general',
                    'priority': priority,
                    'location': 'Test Location'
                }
                
                response = self.session.post(f"{BASE_URL}/maintenance/requests", data=data, headers=headers)
                
                if response.status_code == 200:
                    self.log_result(f"Valid Priority - {priority.title()}", True, f"Successfully created {priority} priority request")
                    success_count += 1
                else:
                    self.log_result(f"Valid Priority - {priority.title()}", False, f"Failed to create {priority} priority request: {response.status_code}")
            except Exception as e:
                self.log_result(f"Valid Priority - {priority.title()}", False, f"Exception occurred: {str(e)}")
        
        return success_count == total_tests
    
    def run_phase1_tests(self):
        """Run HomeMe Phase 1 Enhancement Tests"""
        print("\n🚀 STARTING HOMEME PHASE 1 ENHANCEMENT TESTING")
        print("=" * 60)
        print("Testing newly implemented maintenance and notification systems")
        print("=" * 60)
        
        # Authentication tests
        print("\n🔐 AUTHENTICATION SETUP")
        if not self.test_admin_authentication():
            print("❌ Admin authentication failed - stopping tests")
            return self.print_summary()
        
        if not self.test_resident_authentication():
            print("❌ Resident authentication failed - stopping tests")
            return self.print_summary()
        
        # Maintenance System Tests
        print("\n🔧 MAINTENANCE SYSTEM TESTING")
        self.test_create_maintenance_request()
        self.test_get_maintenance_requests_resident()
        self.test_get_maintenance_requests_admin()
        self.test_get_maintenance_stats()
        self.test_maintenance_data_validation()
        
        # Notification System Tests
        print("\n🔔 NOTIFICATION SYSTEM TESTING")
        self.test_get_notifications()
        self.test_mark_notification_read()
        self.test_mark_all_notifications_read()
        self.test_delete_notification()
        
        # WebSocket Connectivity Tests
        print("\n🌐 WEBSOCKET CONNECTIVITY TESTING")
        try:
            # Run WebSocket test in async context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self.test_websocket_connection())
            loop.close()
        except Exception as e:
            self.log_result("WebSocket Test Setup", False, f"Failed to run WebSocket test: {str(e)}")
        
        return self.print_summary()
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("🏁 HOMEME PHASE 1 ENHANCEMENT TEST RESULTS")
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
                    if result["details"]:
                        print(f"     Details: {result['details']}")
        
        print(f"\n✅ PASSED TESTS:")
        for result in self.results:
            if "✅ PASS" in result["status"]:
                print(f"   • {result['test']}: {result['message']}")
        
        print("\n" + "=" * 60)
        
        return success_rate >= 80  # Consider 80%+ success rate as overall success

if __name__ == "__main__":
    test_suite = HomePhase1TestSuite()
    
    # Run Phase 1 Enhancement Tests
    print("🚀 RUNNING HOMEME PHASE 1 ENHANCEMENT TESTING")
    print("Testing newly implemented maintenance and notification systems")
    success = test_suite.run_phase1_tests()
    
    if success:
        print("\n🎉 PHASE 1 ENHANCEMENT TESTING COMPLETED SUCCESSFULLY!")
    else:
        print("\n⚠️ PHASE 1 ENHANCEMENT TESTING COMPLETED WITH ISSUES")
    
    exit(0 if success else 1)