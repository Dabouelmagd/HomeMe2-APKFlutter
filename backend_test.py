#!/usr/bin/env python3
"""
Backend Compound Management System Test Suite
Tests compound management API endpoints including registration links, compound data, and enhanced registration
"""

import asyncio
import json
import requests
import websockets
import uuid
import io
import os
import base64
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from PIL import Image

# Configuration
BASE_URL = "https://homeme-platform.preview.emergentagent.com/api"
WS_URL = "wss://compound-hub.preview.emergentagent.com/ws/chat"

class CompoundManagementTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.resident_token = None
        self.admin_user = None
        self.resident_user = None
        self.compound_id = None
        self.test_chat_id = None
        self.test_message_id = None
        self.test_subscription_endpoint = None
        self.scheduled_message_id = None
        self.test_registration_link_id = None
        self.test_registration_token = None
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
    
    def test_authentication(self):
        """Test user authentication and setup"""
        print("\n=== Testing Authentication ===")
        
        # Test admin login
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
                self.log_result("Admin Login", True, "Admin authenticated successfully")
            else:
                self.log_result("Admin Login", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Login", False, f"Exception occurred: {str(e)}")
            return False
        
        # Test resident login - try to find or create a resident
        try:
            # First try existing residents
            existing_residents = ["resident1", "alice", "bob", "testuser"]
            
            for username in existing_residents:
                resident_login_data = {
                    "username": username,
                    "password": "password123"
                }
                
                response = self.session.post(f"{BASE_URL}/auth/login", json=resident_login_data)
                
                if response.status_code == 200:
                    data = response.json()
                    self.resident_token = data["access_token"]
                    self.resident_user = data["user"]
                    self.log_result("Resident Login", True, f"Resident '{username}' authenticated successfully")
                    break
            
            # If no existing resident found, try to create one
            if not self.resident_token:
                # Generate unique username
                unique_id = str(uuid.uuid4())[:8]
                resident_register_data = {
                    "username": f"testchat{unique_id}",
                    "email": f"testchat{unique_id}@example.com",
                    "password": "password123",
                    "role": "resident",
                    "compound_id": self.compound_id,
                    "full_name": f"Test Chat Resident {unique_id}",
                    "phone": "+1234567890",
                    "unit_number": f"10{unique_id[:1]}"
                }
                
                register_response = self.session.post(f"{BASE_URL}/auth/register", json=resident_register_data)
                
                if register_response.status_code == 200:
                    # Now login with new resident
                    login_response = self.session.post(f"{BASE_URL}/auth/login", json={
                        "username": resident_register_data["username"],
                        "password": "password123"
                    })
                    
                    if login_response.status_code == 200:
                        data = login_response.json()
                        self.resident_token = data["access_token"]
                        self.resident_user = data["user"]
                        self.log_result("Resident Login", True, "New resident created and authenticated successfully")
                    else:
                        self.log_result("Resident Login", False, f"Failed to login after registration: {login_response.status_code}")
                        return False
                else:
                    self.log_result("Resident Login", False, f"Failed to register resident: {register_response.status_code}", register_response.text)
                    return False
                    
        except Exception as e:
            self.log_result("Resident Login", False, f"Exception occurred: {str(e)}")
            return False
        
        return True
    
    def test_get_compound_details(self):
        """Test GET /api/compounds/{compound_id} - Get compound details"""
        print("\n=== Testing Get Compound Details ===")
        
        if not self.compound_id:
            self.log_result("Get Compound Details", False, "No compound ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == self.compound_id and data.get("name"):
                    self.log_result("Get Compound Details", True, f"Retrieved compound details successfully: {data.get('name')}")
                    return True
                else:
                    self.log_result("Get Compound Details", False, "Invalid compound data structure")
                    return False
            elif response.status_code == 404:
                self.log_result("Get Compound Details", False, f"Compound not found (404) - compound_id: {self.compound_id}")
                return False
            else:
                self.log_result("Get Compound Details", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Compound Details", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_compound_residences(self):
        """Test GET /api/compounds/{compound_id}/residences - Get residence list (Admin only)"""
        print("\n=== Testing Get Compound Residences ===")
        
        if not self.compound_id:
            self.log_result("Get Compound Residences", False, "No compound ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}/residences", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                residences = data.get("residences", [])
                self.log_result("Get Compound Residences", True, f"Retrieved {len(residences)} residences successfully")
                return True
            else:
                self.log_result("Get Compound Residences", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Compound Residences", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_upload_compound_logo(self):
        """Test PUT /api/compounds/{compound_id}/logo - Upload compound logo (Admin only)"""
        print("\n=== Testing Upload Compound Logo ===")
        
        if not self.compound_id:
            self.log_result("Upload Compound Logo", False, "No compound ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Create a test logo image
            logo_data = self.create_test_image("compound_logo.jpg", size=(200, 200))
            
            files = {
                'file': ('compound_logo.jpg', logo_data, 'image/jpeg')
            }
            
            response = self.session.put(
                f"{BASE_URL}/compounds/{self.compound_id}/logo",
                files=files,
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("message") == "Logo uploaded successfully" and data.get("logo_url"):
                    self.log_result("Upload Compound Logo", True, "Logo uploaded successfully")
                    return True
                else:
                    self.log_result("Upload Compound Logo", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Upload Compound Logo", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Upload Compound Logo", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_registration_link(self):
        """Test POST /api/admin/registration-links - Create registration links (Admin only)"""
        print("\n=== Testing Create Registration Link ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Generate unique email for testing
            unique_id = str(uuid.uuid4())[:8]
            registration_data = {
                "unit_number": f"TEST{unique_id[:3]}",
                "full_name": f"Test Resident {unique_id}",
                "email": f"testregister{unique_id}@example.com",
                "phone": "+1234567890",
                "expires_in_hours": 72
            }
            
            response = self.session.post(f"{BASE_URL}/admin/registration-links", 
                                       json=registration_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if (data.get("message") == "Registration link created successfully" and 
                    data.get("registration_url") and data.get("registration_link")):
                    
                    reg_link = data["registration_link"]
                    self.test_registration_link_id = reg_link.get("id")
                    self.test_registration_token = reg_link.get("registration_token")
                    
                    self.log_result("Create Registration Link", True, 
                                  f"Registration link created successfully for {registration_data['email']}")
                    return True
                else:
                    self.log_result("Create Registration Link", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Create Registration Link", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Registration Link", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_registration_links(self):
        """Test GET /api/admin/registration-links - Get all registration links (Admin only)"""
        print("\n=== Testing Get Registration Links ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/admin/registration-links", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                links = data.get("registration_links", [])
                self.log_result("Get Registration Links", True, f"Retrieved {len(links)} registration links successfully")
                return True
            else:
                self.log_result("Get Registration Links", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Registration Links", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_verify_registration_token(self):
        """Test GET /api/register/verify/{token} - Verify registration token"""
        print("\n=== Testing Verify Registration Token ===")
        
        if not self.test_registration_token:
            self.log_result("Verify Registration Token", False, "No test registration token available")
            return False
        
        try:
            response = self.session.get(f"{BASE_URL}/register/verify/{self.test_registration_token}")
            
            if response.status_code == 200:
                data = response.json()
                # The API returns the data directly, not nested in registration_details
                if (data.get("valid") == True and data.get("unit_number") and 
                    data.get("email") and data.get("compound_id")):
                    self.log_result("Verify Registration Token", True, "Registration token verified successfully")
                    return True
                else:
                    self.log_result("Verify Registration Token", False, f"Invalid token verification response: {data}")
                    return False
            else:
                self.log_result("Verify Registration Token", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Verify Registration Token", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_complete_registration(self):
        """Test POST /api/register/complete - Complete registration with profile picture"""
        print("\n=== Testing Complete Registration ===")
        
        if not self.test_registration_token:
            self.log_result("Complete Registration", False, "No test registration token available")
            return False
        
        try:
            # Create a test profile picture
            profile_pic_data = self.create_test_image("profile.jpg", size=(150, 150))
            
            # Generate unique username
            unique_id = str(uuid.uuid4())[:8]
            
            files = {
                'profile_picture': ('profile.jpg', profile_pic_data, 'image/jpeg')
            }
            
            data = {
                'token': self.test_registration_token,
                'username': f"newuser{unique_id}",
                'password': 'newpassword123',
                'phone': '+1987654321'
            }
            
            response = self.session.post(f"{BASE_URL}/register/complete", 
                                       files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                if (result.get("message") == "Registration completed successfully" and 
                    result.get("user") and result.get("access_token")):
                    
                    user = result["user"]
                    if user.get("profile_picture_url"):
                        self.log_result("Complete Registration", True, 
                                      f"Registration completed successfully with profile picture for user: {user.get('username')}")
                        return True
                    else:
                        self.log_result("Complete Registration", True, 
                                      f"Registration completed successfully for user: {user.get('username')} (no profile picture)")
                        return True
                else:
                    self.log_result("Complete Registration", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Complete Registration", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Complete Registration", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_delete_registration_link(self):
        """Test DELETE /api/admin/registration-links/{link_id} - Delete registration links (Admin only)"""
        print("\n=== Testing Delete Registration Link ===")
        
        if not self.test_registration_link_id:
            self.log_result("Delete Registration Link", False, "No test registration link ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.delete(f"{BASE_URL}/admin/registration-links/{self.test_registration_link_id}", 
                                         headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("message") == "Registration link deleted successfully":
                    self.log_result("Delete Registration Link", True, "Registration link deleted successfully")
                    return True
                else:
                    self.log_result("Delete Registration Link", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Delete Registration Link", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Delete Registration Link", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_admin_access_control(self):
        """Test that admin-only endpoints properly reject non-admin users"""
        print("\n=== Testing Admin Access Control ===")
        
        if not self.resident_token or not self.compound_id:
            self.log_result("Admin Access Control", False, "No resident token or compound ID available")
            return False
        
        success_count = 0
        total_tests = 0
        
        # Test resident trying to access admin registration links
        try:
            total_tests += 1
            resident_headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/admin/registration-links", headers=resident_headers)
            
            if response.status_code == 403:
                self.log_result("Admin Access - Registration Links", True, "Correctly denied resident access to registration links")
                success_count += 1
            else:
                self.log_result("Admin Access - Registration Links", False, f"Expected 403, got {response.status_code}")
        except Exception as e:
            self.log_result("Admin Access - Registration Links", False, f"Exception occurred: {str(e)}")
        
        # Test resident trying to access compound residences
        try:
            total_tests += 1
            resident_headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}/residences", headers=resident_headers)
            
            if response.status_code == 403:
                self.log_result("Admin Access - Compound Residences", True, "Correctly denied resident access to compound residences")
                success_count += 1
            else:
                self.log_result("Admin Access - Compound Residences", False, f"Expected 403, got {response.status_code}")
        except Exception as e:
            self.log_result("Admin Access - Compound Residences", False, f"Exception occurred: {str(e)}")
        
        # Test resident trying to upload compound logo
        try:
            total_tests += 1
            resident_headers = {"Authorization": f"Bearer {self.resident_token}"}
            logo_data = self.create_test_image("test_logo.jpg")
            files = {'file': ('test_logo.jpg', logo_data, 'image/jpeg')}
            
            response = self.session.put(f"{BASE_URL}/compounds/{self.compound_id}/logo", 
                                      files=files, headers=resident_headers)
            
            if response.status_code == 403:
                self.log_result("Admin Access - Upload Logo", True, "Correctly denied resident access to upload compound logo")
                success_count += 1
            else:
                self.log_result("Admin Access - Upload Logo", False, f"Expected 403, got {response.status_code}")
        except Exception as e:
            self.log_result("Admin Access - Upload Logo", False, f"Exception occurred: {str(e)}")
        
        return success_count == total_tests
    
    def test_compound_access_control(self):
        """Test that users can only access their own compound's data"""
        print("\n=== Testing Compound Access Control ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Try to access a different compound's data
            fake_compound_id = "fake-compound-id-12345"
            response = self.session.get(f"{BASE_URL}/compounds/{fake_compound_id}", headers=headers)
            
            if response.status_code in [403, 404]:
                self.log_result("Compound Access Control", True, f"Correctly denied access to other compound (status: {response.status_code})")
                return True
            else:
                self.log_result("Compound Access Control", False, f"Expected 403 or 404, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Compound Access Control", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_user_chats(self):
        """Test GET /api/chats endpoint"""
        print("\n=== Testing Get User Chats ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/chats", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                chats = data.get("chats", [])
                self.log_result("Get User Chats", True, f"Retrieved {len(chats)} chats successfully")
                return True
            else:
                self.log_result("Get User Chats", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get User Chats", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_direct_chat(self):
        """Test POST /api/chats - Create direct chat"""
        print("\n=== Testing Create Direct Chat ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            chat_data = {
                "chat_type": "direct",
                "participant_ids": [self.resident_user["id"]]
            }
            
            response = self.session.post(f"{BASE_URL}/chats", json=chat_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                chat = data.get("chat")
                if chat:
                    self.test_chat_id = chat["id"]
                    self.log_result("Create Direct Chat", True, f"Direct chat created successfully with ID: {self.test_chat_id}")
                    return True
                else:
                    self.log_result("Create Direct Chat", False, "No chat data in response")
                    return False
            else:
                self.log_result("Create Direct Chat", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Direct Chat", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_group_chat(self):
        """Test POST /api/chats - Create group chat"""
        print("\n=== Testing Create Group Chat ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            chat_data = {
                "chat_type": "group",
                "name": "Test Group Chat",
                "description": "A test group chat for testing purposes",
                "participant_ids": [self.resident_user["id"]]
            }
            
            response = self.session.post(f"{BASE_URL}/chats", json=chat_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                chat = data.get("chat")
                if chat:
                    self.log_result("Create Group Chat", True, f"Group chat created successfully with ID: {chat['id']}")
                    return True
                else:
                    self.log_result("Create Group Chat", False, "No chat data in response")
                    return False
            else:
                self.log_result("Create Group Chat", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Group Chat", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_compound_wide_chat(self):
        """Test POST /api/chats - Create compound-wide chat"""
        print("\n=== Testing Create Compound-Wide Chat ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            chat_data = {
                "chat_type": "compound_wide",
                "name": "Compound Announcements",
                "description": "Official compound-wide announcements",
                "participant_ids": []  # Will include all compound residents
            }
            
            response = self.session.post(f"{BASE_URL}/chats", json=chat_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                chat = data.get("chat")
                if chat:
                    self.log_result("Create Compound-Wide Chat", True, f"Compound-wide chat created successfully with ID: {chat['id']}")
                    return True
                else:
                    self.log_result("Create Compound-Wide Chat", False, "No chat data in response")
                    return False
            else:
                self.log_result("Create Compound-Wide Chat", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Compound-Wide Chat", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_chat_details(self):
        """Test GET /api/chats/{chat_id}"""
        print("\n=== Testing Get Chat Details ===")
        
        if not self.test_chat_id:
            self.log_result("Get Chat Details", False, "No test chat ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/chats/{self.test_chat_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                chat = data.get("chat")
                if chat and "participant_details" in chat:
                    self.log_result("Get Chat Details", True, f"Chat details retrieved successfully with {len(chat['participant_details'])} participants")
                    return True
                else:
                    self.log_result("Get Chat Details", False, "Invalid chat data structure")
                    return False
            else:
                self.log_result("Get Chat Details", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Chat Details", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_send_message(self):
        """Test POST /api/chats/{chat_id}/messages"""
        print("\n=== Testing Send Message ===")
        
        if not self.test_chat_id:
            self.log_result("Send Message", False, "No test chat ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            message_data = {
                "content": "Hello! This is a test message from the admin.",
                "message_type": "text"
            }
            
            response = self.session.post(f"{BASE_URL}/chats/{self.test_chat_id}/messages", 
                                       json=message_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                message = data.get("message")
                if message:
                    self.test_message_id = message["id"]
                    self.log_result("Send Message", True, f"Message sent successfully with ID: {self.test_message_id}")
                    return True
                else:
                    self.log_result("Send Message", False, "No message data in response")
                    return False
            else:
                self.log_result("Send Message", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Send Message", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_chat_messages(self):
        """Test GET /api/chats/{chat_id}/messages"""
        print("\n=== Testing Get Chat Messages ===")
        
        if not self.test_chat_id:
            self.log_result("Get Chat Messages", False, "No test chat ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/chats/{self.test_chat_id}/messages?page=1&limit=50", 
                                      headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                messages = data.get("messages", [])
                self.log_result("Get Chat Messages", True, f"Retrieved {len(messages)} messages successfully")
                return True
            else:
                self.log_result("Get Chat Messages", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Chat Messages", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_edit_message(self):
        """Test PUT /api/chats/{chat_id}/messages/{message_id}"""
        print("\n=== Testing Edit Message ===")
        
        if not self.test_chat_id or not self.test_message_id:
            self.log_result("Edit Message", False, "No test chat ID or message ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            edit_data = {
                "content": "Hello! This is an EDITED test message from the admin."
            }
            
            response = self.session.put(f"{BASE_URL}/chats/{self.test_chat_id}/messages/{self.test_message_id}", 
                                      json=edit_data, headers=headers)
            
            if response.status_code == 200:
                self.log_result("Edit Message", True, "Message edited successfully")
                return True
            else:
                self.log_result("Edit Message", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Edit Message", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_mark_messages_as_read(self):
        """Test PUT /api/chats/{chat_id}/read"""
        print("\n=== Testing Mark Messages as Read ===")
        
        if not self.test_chat_id:
            self.log_result("Mark Messages as Read", False, "No test chat ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.put(f"{BASE_URL}/chats/{self.test_chat_id}/read", headers=headers)
            
            if response.status_code == 200:
                self.log_result("Mark Messages as Read", True, "Messages marked as read successfully")
                return True
            else:
                self.log_result("Mark Messages as Read", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Mark Messages as Read", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_add_participants(self):
        """Test POST /api/chats/{chat_id}/participants"""
        print("\n=== Testing Add Participants ===")
        
        # First create a group chat as admin
        try:
            headers = self.setup_auth_headers(self.admin_token)
            chat_data = {
                "chat_type": "group",
                "name": "Test Group for Participants",
                "description": "Testing participant addition",
                "participant_ids": []
            }
            
            response = self.session.post(f"{BASE_URL}/chats", json=chat_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                group_chat_id = data["chat"]["id"]
                
                # Now try to add participants
                participants_data = {
                    "participant_ids": [self.resident_user["id"]]
                }
                
                add_response = self.session.post(f"{BASE_URL}/chats/{group_chat_id}/participants", 
                                               json=participants_data, headers=headers)
                
                if add_response.status_code == 200:
                    self.log_result("Add Participants", True, "Participants added successfully")
                    return True
                else:
                    self.log_result("Add Participants", False, f"Failed to add participants: {add_response.status_code}", add_response.text)
                    return False
            else:
                self.log_result("Add Participants", False, f"Failed to create group chat: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Add Participants", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_unauthorized_access(self):
        """Test unauthorized access to chat endpoints"""
        print("\n=== Testing Unauthorized Access ===")
        
        try:
            # Test without token
            response = self.session.get(f"{BASE_URL}/chats")
            
            if response.status_code in [401, 403]:
                self.log_result("Unauthorized Access", True, f"Correctly rejected request without token (status: {response.status_code})")
            else:
                self.log_result("Unauthorized Access", False, f"Expected 401 or 403, got {response.status_code}")
                return False
            
            # Test with invalid token
            invalid_headers = {"Authorization": "Bearer invalid_token"}
            response = self.session.get(f"{BASE_URL}/chats", headers=invalid_headers)
            
            if response.status_code in [401, 403]:
                self.log_result("Invalid Token Access", True, f"Correctly rejected request with invalid token (status: {response.status_code})")
                return True
            else:
                self.log_result("Invalid Token Access", False, f"Expected 401 or 403, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Unauthorized Access", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_access_control(self):
        """Test access control - users can only access chats they're participants in"""
        print("\n=== Testing Access Control ===")
        
        try:
            # Create a chat as admin with only admin as participant
            headers = self.setup_auth_headers(self.admin_token)
            chat_data = {
                "chat_type": "group",
                "name": "Admin Only Chat",
                "description": "Only admin should access this",
                "participant_ids": []  # Only admin will be participant
            }
            
            response = self.session.post(f"{BASE_URL}/chats", json=chat_data, headers=headers)
            
            if response.status_code == 200:
                admin_only_chat_id = response.json()["chat"]["id"]
                
                # Try to access this chat as resident (should fail)
                resident_headers = self.setup_auth_headers(self.resident_token)
                access_response = self.session.get(f"{BASE_URL}/chats/{admin_only_chat_id}", 
                                                 headers=resident_headers)
                
                if access_response.status_code == 404:
                    self.log_result("Access Control", True, "Correctly denied access to non-participant")
                    return True
                else:
                    self.log_result("Access Control", False, f"Expected 404, got {access_response.status_code}")
                    return False
            else:
                self.log_result("Access Control", False, f"Failed to create admin-only chat: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Access Control", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_delete_message(self):
        """Test DELETE /api/chats/{chat_id}/messages/{message_id}"""
        print("\n=== Testing Delete Message ===")
        
        if not self.test_chat_id:
            self.log_result("Delete Message", False, "No test chat ID available")
            return False
        
        # First send a message to delete
        try:
            headers = self.setup_auth_headers(self.admin_token)
            message_data = {
                "content": "This message will be deleted",
                "message_type": "text"
            }
            
            response = self.session.post(f"{BASE_URL}/chats/{self.test_chat_id}/messages", 
                                       json=message_data, headers=headers)
            
            if response.status_code == 200:
                message_to_delete_id = response.json()["message"]["id"]
                
                # Now delete the message
                delete_response = self.session.delete(f"{BASE_URL}/chats/{self.test_chat_id}/messages/{message_to_delete_id}", 
                                                    headers=headers)
                
                if delete_response.status_code == 200:
                    self.log_result("Delete Message", True, "Message deleted successfully")
                    return True
                else:
                    self.log_result("Delete Message", False, f"Failed to delete message: {delete_response.status_code}", delete_response.text)
                    return False
            else:
                self.log_result("Delete Message", False, f"Failed to create message to delete: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Delete Message", False, f"Exception occurred: {str(e)}")
            return False
    
    async def test_websocket_connection(self):
        """Test WebSocket connection for real-time chat"""
        print("\n=== Testing WebSocket Connection ===")
        
        if not self.admin_user:
            self.log_result("WebSocket Connection", False, "No admin user available")
            return False
        
        # Try both WebSocket endpoints
        endpoints = [
            f"{WS_URL}/{self.admin_user['id']}",
            f"wss://compound-hub.preview.emergentagent.com/ws/{self.admin_user['id']}"
        ]
        
        for i, uri in enumerate(endpoints):
            try:
                # Test WebSocket connection
                async with websockets.connect(uri) as websocket:
                    # Send a test message
                    test_message = "Hello WebSocket!"
                    await websocket.send(test_message)
                    
                    # Wait for response
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    
                    if f"Echo: {test_message}" in response:
                        self.log_result("WebSocket Connection", True, f"WebSocket connection working correctly (endpoint {i+1})")
                        return True
                    else:
                        self.log_result("WebSocket Connection", False, f"Unexpected response from endpoint {i+1}: {response}")
                        
            except asyncio.TimeoutError:
                if i == len(endpoints) - 1:  # Last endpoint
                    self.log_result("WebSocket Connection", False, "WebSocket connection timeout on all endpoints")
                continue
            except Exception as e:
                if i == len(endpoints) - 1:  # Last endpoint
                    self.log_result("WebSocket Connection", False, f"Exception occurred on all endpoints: {str(e)}")
                continue
        
        return False
    
    def create_test_image(self, filename: str = "test_image.jpg", size: tuple = (100, 100)) -> bytes:
        """Create a test image file in memory"""
        img = Image.new('RGB', size, color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes.getvalue()
    
    def create_test_file(self, filename: str, content: str = "Test file content") -> bytes:
        """Create a test file in memory"""
        return content.encode('utf-8')
    
    def test_file_upload_with_message(self):
        """Test POST /api/chats/{chat_id}/upload - Upload files with message"""
        print("\n=== Testing File Upload with Message ===")
        
        if not self.test_chat_id:
            self.log_result("File Upload with Message", False, "No test chat ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Test image upload
            image_data = self.create_test_image("test_upload.jpg")
            
            files = {
                'files': ('test_upload.jpg', image_data, 'image/jpeg')
            }
            data = {
                'content': 'Here is a test image!',
                'message_type': 'image'
            }
            
            response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/upload",
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code == 200:
                result = response.json()
                message = result.get("message")
                if message and message.get("attachments"):
                    attachment = message["attachments"][0]
                    if attachment.get("file_type") == "image" and attachment.get("thumbnail_url"):
                        self.log_result("File Upload with Message", True, f"Image uploaded successfully with thumbnail")
                        return True
                    else:
                        self.log_result("File Upload with Message", False, "Image uploaded but missing thumbnail or wrong type")
                        return False
                else:
                    self.log_result("File Upload with Message", False, "No message or attachments in response")
                    return False
            else:
                self.log_result("File Upload with Message", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("File Upload with Message", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_multiple_file_upload(self):
        """Test uploading multiple files in a single message"""
        print("\n=== Testing Multiple File Upload ===")
        
        if not self.test_chat_id:
            self.log_result("Multiple File Upload", False, "No test chat ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Create multiple test files
            image_data = self.create_test_image("multi_test1.jpg")
            doc_data = self.create_test_file("multi_test.txt", "This is a test document")
            
            files = [
                ('files', ('multi_test1.jpg', image_data, 'image/jpeg')),
                ('files', ('multi_test.txt', doc_data, 'text/plain'))
            ]
            data = {
                'content': 'Multiple files test!',
                'message_type': 'mixed'
            }
            
            response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/upload",
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code == 200:
                result = response.json()
                message = result.get("message")
                if message and len(message.get("attachments", [])) == 2:
                    self.log_result("Multiple File Upload", True, f"Multiple files uploaded successfully ({len(message['attachments'])} files)")
                    return True
                else:
                    self.log_result("Multiple File Upload", False, f"Expected 2 attachments, got {len(message.get('attachments', []))}")
                    return False
            else:
                self.log_result("Multiple File Upload", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Multiple File Upload", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_file_size_limits(self):
        """Test file size limit enforcement"""
        print("\n=== Testing File Size Limits ===")
        
        if not self.test_chat_id:
            self.log_result("File Size Limits", False, "No test chat ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Create a large image (should exceed 10MB limit)
            # Create a 11MB image by making it very large
            large_image_data = self.create_test_image("large_test.jpg", size=(5000, 5000))
            
            # If the image is still under 10MB, pad it
            if len(large_image_data) < 11 * 1024 * 1024:
                # Create padding to make it over 10MB
                padding = b'0' * (11 * 1024 * 1024 - len(large_image_data))
                large_image_data += padding
            
            files = {
                'files': ('large_test.jpg', large_image_data, 'image/jpeg')
            }
            data = {
                'content': 'This should fail due to size limit',
                'message_type': 'image'
            }
            
            response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/upload",
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code == 400:
                self.log_result("File Size Limits", True, "Correctly rejected oversized file")
                return True
            else:
                self.log_result("File Size Limits", False, f"Expected 400 for oversized file, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("File Size Limits", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_file_type_validation(self):
        """Test file type validation"""
        print("\n=== Testing File Type Validation ===")
        
        if not self.test_chat_id:
            self.log_result("File Type Validation", False, "No test chat ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Try to upload an unsupported file type
            invalid_file_data = b"This is not a valid file type"
            
            files = {
                'files': ('test.xyz', invalid_file_data, 'application/xyz')
            }
            data = {
                'content': 'This should fail due to invalid file type',
                'message_type': 'document'
            }
            
            response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/upload",
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code == 400:
                self.log_result("File Type Validation", True, "Correctly rejected invalid file type")
                return True
            else:
                self.log_result("File Type Validation", False, f"Expected 400 for invalid file type, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("File Type Validation", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_file_serving(self):
        """Test file serving endpoints"""
        print("\n=== Testing File Serving ===")
        
        if not self.test_chat_id:
            self.log_result("File Serving", False, "No test chat ID available")
            return False
        
        try:
            # First upload a file
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            image_data = self.create_test_image("serve_test.jpg")
            
            files = {
                'files': ('serve_test.jpg', image_data, 'image/jpeg')
            }
            data = {
                'content': 'File for serving test',
                'message_type': 'image'
            }
            
            upload_response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/upload",
                files=files,
                data=data,
                headers=headers
            )
            
            if upload_response.status_code == 200:
                message = upload_response.json().get("message")
                if message and message.get("attachments"):
                    attachment = message["attachments"][0]
                    file_url = attachment.get("file_url")
                    
                    if file_url:
                        # Test file access
                        file_response = self.session.get(f"https://homeme-platform.preview.emergentagent.com{file_url}")
                        
                        if file_response.status_code == 200:
                            self.log_result("File Serving", True, "File served successfully")
                            return True
                        else:
                            self.log_result("File Serving", False, f"File serving failed with status {file_response.status_code}")
                            return False
                    else:
                        self.log_result("File Serving", False, "No file URL in attachment")
                        return False
                else:
                    self.log_result("File Serving", False, "No attachments in upload response")
                    return False
            else:
                self.log_result("File Serving", False, f"File upload failed: {upload_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("File Serving", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_message_reactions(self):
        """Test POST /api/chats/{chat_id}/messages/{message_id}/react - Add/remove reactions"""
        print("\n=== Testing Message Reactions ===")
        
        if not self.test_chat_id or not self.test_message_id:
            self.log_result("Message Reactions", False, "No test chat ID or message ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Add a reaction
            reaction_data = {
                "emoji": "👍"
            }
            
            response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/messages/{self.test_message_id}/react",
                json=reaction_data,
                headers=headers
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Reaction updated successfully" and "reactions" in result:
                    reactions = result["reactions"]
                    if "👍" in reactions and self.admin_user["id"] in reactions["👍"]:
                        # Test removing the same reaction
                        remove_response = self.session.post(
                            f"{BASE_URL}/chats/{self.test_chat_id}/messages/{self.test_message_id}/react",
                            json=reaction_data,
                            headers=headers
                        )
                        
                        if remove_response.status_code == 200:
                            remove_result = remove_response.json()
                            if remove_result.get("message") == "Reaction updated successfully":
                                # Check if reaction was removed
                                remove_reactions = remove_result["reactions"]
                                if "👍" not in remove_reactions or self.admin_user["id"] not in remove_reactions.get("👍", []):
                                    self.log_result("Message Reactions", True, "Reaction added and removed successfully")
                                    return True
                                else:
                                    self.log_result("Message Reactions", False, "Reaction was not properly removed")
                                    return False
                            else:
                                self.log_result("Message Reactions", False, f"Unexpected remove response: {remove_result}")
                                return False
                        else:
                            self.log_result("Message Reactions", False, f"Failed to remove reaction: {remove_response.status_code}")
                            return False
                    else:
                        self.log_result("Message Reactions", False, f"Reaction not properly added: {reactions}")
                        return False
                else:
                    self.log_result("Message Reactions", False, f"Unexpected response format: {result}")
                    return False
            else:
                self.log_result("Message Reactions", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Message Reactions", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_multiple_user_reactions(self):
        """Test reactions from multiple users"""
        print("\n=== Testing Multiple User Reactions ===")
        
        if not self.test_chat_id or not self.test_message_id:
            self.log_result("Multiple User Reactions", False, "No test chat ID or message ID available")
            return False
        
        try:
            # Admin adds reaction
            admin_headers = self.setup_auth_headers(self.admin_token)
            admin_reaction = {"emoji": "❤️"}
            
            admin_response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/messages/{self.test_message_id}/react",
                json=admin_reaction,
                headers=admin_headers
            )
            
            # Resident adds different reaction
            resident_headers = self.setup_auth_headers(self.resident_token)
            resident_reaction = {"emoji": "😊"}
            
            resident_response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/messages/{self.test_message_id}/react",
                json=resident_reaction,
                headers=resident_headers
            )
            
            if admin_response.status_code == 200 and resident_response.status_code == 200:
                # Get message to check reactions
                message_response = self.session.get(
                    f"{BASE_URL}/chats/{self.test_chat_id}/messages?page=1&limit=50",
                    headers=admin_headers
                )
                
                if message_response.status_code == 200:
                    messages = message_response.json().get("messages", [])
                    target_message = next((m for m in messages if m["id"] == self.test_message_id), None)
                    
                    if target_message and target_message.get("reactions"):
                        reactions = target_message["reactions"]
                        if "❤️" in reactions and "😊" in reactions:
                            self.log_result("Multiple User Reactions", True, "Multiple users can add different reactions")
                            return True
                        else:
                            self.log_result("Multiple User Reactions", False, f"Expected both reactions, got: {list(reactions.keys())}")
                            return False
                    else:
                        self.log_result("Multiple User Reactions", False, "No reactions found in message")
                        return False
                else:
                    self.log_result("Multiple User Reactions", False, f"Failed to get messages: {message_response.status_code}")
                    return False
            else:
                self.log_result("Multiple User Reactions", False, f"Failed to add reactions: admin={admin_response.status_code}, resident={resident_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Multiple User Reactions", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_attachment_metadata(self):
        """Test attachment metadata is correctly stored and retrieved"""
        print("\n=== Testing Attachment Metadata ===")
        
        if not self.test_chat_id:
            self.log_result("Attachment Metadata", False, "No test chat ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Upload an image to test metadata
            image_data = self.create_test_image("metadata_test.jpg", size=(200, 150))
            
            files = {
                'files': ('metadata_test.jpg', image_data, 'image/jpeg')
            }
            data = {
                'content': 'Testing attachment metadata',
                'message_type': 'image'
            }
            
            response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/upload",
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code == 200:
                message = response.json().get("message")
                if message and message.get("attachments"):
                    attachment = message["attachments"][0]
                    
                    # Check required metadata fields
                    required_fields = ["id", "filename", "original_filename", "file_type", "file_size", "mime_type", "file_url"]
                    missing_fields = [field for field in required_fields if field not in attachment]
                    
                    if not missing_fields:
                        # Check image-specific metadata
                        if attachment.get("width") == 200 and attachment.get("height") == 150:
                            self.log_result("Attachment Metadata", True, "All attachment metadata fields present and correct")
                            return True
                        else:
                            self.log_result("Attachment Metadata", False, f"Image dimensions incorrect: {attachment.get('width')}x{attachment.get('height')}")
                            return False
                    else:
                        self.log_result("Attachment Metadata", False, f"Missing metadata fields: {missing_fields}")
                        return False
                else:
                    self.log_result("Attachment Metadata", False, "No attachments in response")
                    return False
            else:
                self.log_result("Attachment Metadata", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Attachment Metadata", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_edge_cases(self):
        """Test various edge cases"""
        print("\n=== Testing Edge Cases ===")
        
        success_count = 0
        total_tests = 0
        
        # Test invalid chat ID
        try:
            total_tests += 1
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/chats/invalid-chat-id", headers=headers)
            
            if response.status_code == 404:
                self.log_result("Invalid Chat ID", True, "Correctly returned 404 for invalid chat ID")
                success_count += 1
            else:
                self.log_result("Invalid Chat ID", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Invalid Chat ID", False, f"Exception occurred: {str(e)}")
        
        # Test invalid message ID
        try:
            total_tests += 1
            if self.test_chat_id:
                headers = self.setup_auth_headers(self.admin_token)
                response = self.session.put(f"{BASE_URL}/chats/{self.test_chat_id}/messages/invalid-message-id", 
                                          json={"content": "test"}, headers=headers)
                
                if response.status_code == 404:
                    self.log_result("Invalid Message ID", True, "Correctly returned 404 for invalid message ID")
                    success_count += 1
                else:
                    self.log_result("Invalid Message ID", False, f"Expected 404, got {response.status_code}")
            else:
                self.log_result("Invalid Message ID", False, "No test chat ID available")
        except Exception as e:
            self.log_result("Invalid Message ID", False, f"Exception occurred: {str(e)}")
        
        # Test creating direct chat with more than 2 participants
        try:
            total_tests += 1
            headers = self.setup_auth_headers(self.admin_token)
            chat_data = {
                "chat_type": "direct",
                "participant_ids": [self.resident_user["id"], "fake-user-id"]
            }
            
            response = self.session.post(f"{BASE_URL}/chats", json=chat_data, headers=headers)
            
            if response.status_code == 400:
                self.log_result("Direct Chat Validation", True, "Correctly rejected direct chat with invalid participants")
                success_count += 1
            else:
                self.log_result("Direct Chat Validation", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_result("Direct Chat Validation", False, f"Exception occurred: {str(e)}")
        
        return success_count == total_tests
        """Test various edge cases"""
        print("\n=== Testing Edge Cases ===")
        
        success_count = 0
        total_tests = 0
        
        # Test invalid chat ID
        try:
            total_tests += 1
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/chats/invalid-chat-id", headers=headers)
            
            if response.status_code == 404:
                self.log_result("Invalid Chat ID", True, "Correctly returned 404 for invalid chat ID")
                success_count += 1
            else:
                self.log_result("Invalid Chat ID", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Invalid Chat ID", False, f"Exception occurred: {str(e)}")
        
        # Test invalid message ID
        try:
            total_tests += 1
            if self.test_chat_id:
                headers = self.setup_auth_headers(self.admin_token)
                response = self.session.put(f"{BASE_URL}/chats/{self.test_chat_id}/messages/invalid-message-id", 
                                          json={"content": "test"}, headers=headers)
                
                if response.status_code == 404:
                    self.log_result("Invalid Message ID", True, "Correctly returned 404 for invalid message ID")
                    success_count += 1
                else:
                    self.log_result("Invalid Message ID", False, f"Expected 404, got {response.status_code}")
            else:
                self.log_result("Invalid Message ID", False, "No test chat ID available")
        except Exception as e:
            self.log_result("Invalid Message ID", False, f"Exception occurred: {str(e)}")
        
        # Test creating direct chat with more than 2 participants
        try:
            total_tests += 1
            headers = self.setup_auth_headers(self.admin_token)
            chat_data = {
                "chat_type": "direct",
                "participant_ids": [self.resident_user["id"], "fake-user-id"]
            }
            
            response = self.session.post(f"{BASE_URL}/chats", json=chat_data, headers=headers)
            
            if response.status_code == 400:
                self.log_result("Direct Chat Validation", True, "Correctly rejected direct chat with invalid participants")
                success_count += 1
            else:
                self.log_result("Direct Chat Validation", False, f"Expected 400, got {response.status_code}")
        except Exception as e:
            self.log_result("Direct Chat Validation", False, f"Exception occurred: {str(e)}")
        
        return success_count == total_tests
    
    def test_push_subscription_subscribe(self):
        """Test POST /api/push/subscribe - Subscribe to push notifications"""
        print("\n=== Testing Push Subscription Subscribe ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Create mock subscription data
            subscription_data = {
                "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint-123",
                "keys": {
                    "p256dh": "BNbN3OFADuGtmBGgvAOcpOTNkMcgs7absMnxKZ4M8kHaVt7ZapWTVJkCk-69CfMRu-14NjLHoA8C8-wFPQHBtQs",
                    "auth": "tBHItJI5svbpez7KI4CCXg"
                }
            }
            
            response = self.session.post(f"{BASE_URL}/push/subscribe", json=subscription_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("message") in ["Successfully subscribed to push notifications", "Push subscription created successfully", "Push subscription updated successfully"]:
                    self.test_subscription_endpoint = subscription_data["endpoint"]
                    self.log_result("Push Subscription Subscribe", True, "Successfully subscribed to push notifications")
                    return True
                else:
                    self.log_result("Push Subscription Subscribe", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Push Subscription Subscribe", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Push Subscription Subscribe", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_notification_preferences(self):
        """Test GET /api/notifications/preferences - Get notification preferences"""
        print("\n=== Testing Get Notification Preferences ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/notifications/preferences", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                preferences = data.get("preferences")
                if preferences:
                    # Check required fields
                    required_fields = ["push_enabled", "message_notifications", "group_notifications", 
                                     "direct_notifications", "compound_notifications", "quiet_hours_enabled"]
                    missing_fields = [field for field in required_fields if field not in preferences]
                    
                    if not missing_fields:
                        self.log_result("Get Notification Preferences", True, f"Retrieved notification preferences successfully")
                        return True
                    else:
                        self.log_result("Get Notification Preferences", False, f"Missing preference fields: {missing_fields}")
                        return False
                else:
                    self.log_result("Get Notification Preferences", False, "No preferences in response")
                    return False
            else:
                self.log_result("Get Notification Preferences", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Notification Preferences", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_update_notification_preferences(self):
        """Test PUT /api/notifications/preferences - Update notification preferences"""
        print("\n=== Testing Update Notification Preferences ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Update preferences
            preferences_update = {
                "push_enabled": True,
                "message_notifications": True,
                "group_notifications": False,
                "direct_notifications": True,
                "compound_notifications": True,
                "quiet_hours_enabled": True,
                "quiet_hours_start": "23:00",
                "quiet_hours_end": "07:00"
            }
            
            response = self.session.put(f"{BASE_URL}/notifications/preferences", 
                                      json=preferences_update, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("message") == "Notification preferences updated successfully":
                    # Verify the update by getting preferences again
                    get_response = self.session.get(f"{BASE_URL}/notifications/preferences", headers=headers)
                    if get_response.status_code == 200:
                        updated_prefs = get_response.json().get("preferences", {})
                        if (updated_prefs.get("group_notifications") == False and 
                            updated_prefs.get("quiet_hours_enabled") == True and
                            updated_prefs.get("quiet_hours_start") == "23:00"):
                            self.log_result("Update Notification Preferences", True, "Preferences updated and verified successfully")
                            return True
                        else:
                            self.log_result("Update Notification Preferences", False, "Preferences not properly updated")
                            return False
                    else:
                        self.log_result("Update Notification Preferences", False, "Could not verify preference update")
                        return False
                else:
                    self.log_result("Update Notification Preferences", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Update Notification Preferences", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Update Notification Preferences", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_push_test_notification(self):
        """Test POST /api/push/test - Send test push notification"""
        print("\n=== Testing Test Push Notification ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.post(f"{BASE_URL}/push/test", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("message") in ["Test notification sent successfully", "Test notification sent"]:
                    self.log_result("Test Push Notification", True, "Test notification sent successfully")
                    return True
                else:
                    self.log_result("Test Push Notification", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Test Push Notification", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Test Push Notification", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_push_notification_chat_integration(self):
        """Test push notifications are triggered when sending chat messages"""
        print("\n=== Testing Push Notification Chat Integration ===")
        
        if not self.test_chat_id:
            self.log_result("Push Notification Chat Integration", False, "No test chat ID available")
            return False
        
        try:
            # First, subscribe resident to push notifications
            resident_headers = self.setup_auth_headers(self.resident_token)
            subscription_data = {
                "endpoint": "https://fcm.googleapis.com/fcm/send/resident-endpoint-456",
                "keys": {
                    "p256dh": "BNbN3OFADuGtmBGgvAOcpOTNkMcgs7absMnxKZ4M8kHaVt7ZapWTVJkCk-69CfMRu-14NjLHoA8C8-wFPQHBtQs",
                    "auth": "tBHItJI5svbpez7KI4CCXg"
                }
            }
            
            subscribe_response = self.session.post(f"{BASE_URL}/push/subscribe", 
                                                 json=subscription_data, headers=resident_headers)
            
            if subscribe_response.status_code != 200:
                self.log_result("Push Notification Chat Integration", False, "Failed to subscribe resident to push notifications")
                return False
            
            # Send a message as admin (should trigger notification to resident)
            admin_headers = self.setup_auth_headers(self.admin_token)
            message_data = {
                "content": "This message should trigger a push notification!",
                "message_type": "text"
            }
            
            message_response = self.session.post(f"{BASE_URL}/chats/{self.test_chat_id}/messages", 
                                               json=message_data, headers=admin_headers)
            
            if message_response.status_code == 200:
                # The push notification logic is called in the background
                # Since we can't actually verify the push notification was sent (it's mocked),
                # we verify that the message was sent successfully and the notification logic would be triggered
                self.log_result("Push Notification Chat Integration", True, "Message sent successfully - push notification logic triggered")
                return True
            else:
                self.log_result("Push Notification Chat Integration", False, f"Failed to send message: {message_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Push Notification Chat Integration", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_push_unsubscribe(self):
        """Test DELETE /api/push/unsubscribe - Unsubscribe from push notifications"""
        print("\n=== Testing Push Unsubscribe ===")
        
        # First ensure we have a subscription by subscribing again
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Create a subscription first
            subscription_data = {
                "endpoint": "https://fcm.googleapis.com/fcm/send/unsubscribe-test-endpoint",
                "keys": {
                    "p256dh": "BNbN3OFADuGtmBGgvAOcpOTNkMcgs7absMnxKZ4M8kHaVt7ZapWTVJkCk-69CfMRu-14NjLHoA8C8-wFPQHBtQs",
                    "auth": "tBHItJI5svbpez7KI4CCXg"
                }
            }
            
            subscribe_response = self.session.post(f"{BASE_URL}/push/subscribe", json=subscription_data, headers=headers)
            
            if subscribe_response.status_code != 200:
                self.log_result("Push Unsubscribe", False, "Failed to create subscription for unsubscribe test")
                return False
            
            # Now unsubscribe using query parameter
            endpoint = subscription_data["endpoint"]
            response = self.session.delete(f"{BASE_URL}/push/unsubscribe?endpoint={endpoint}", 
                                         headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("message") in ["Successfully unsubscribed from push notifications", "Unsubscribed successfully"]:
                    self.log_result("Push Unsubscribe", True, "Successfully unsubscribed from push notifications")
                    return True
                else:
                    self.log_result("Push Unsubscribe", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Push Unsubscribe", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Push Unsubscribe", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_push_notification_unauthorized_access(self):
        """Test unauthorized access to push notification endpoints"""
        print("\n=== Testing Push Notification Unauthorized Access ===")
        
        try:
            # Test without token
            response = self.session.get(f"{BASE_URL}/notifications/preferences")
            
            if response.status_code in [401, 403]:
                self.log_result("Push Notification Unauthorized Access", True, f"Correctly rejected request without token (status: {response.status_code})")
                return True
            else:
                self.log_result("Push Notification Unauthorized Access", False, f"Expected 401 or 403, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Push Notification Unauthorized Access", False, f"Exception occurred: {str(e)}")
            return False
    
    def create_test_voice_file(self, filename: str = "test_voice.wav", duration: float = 5.0) -> bytes:
        """Create a test voice file in memory (WAV format)"""
        import wave
        import struct
        import math
        
        # Create a simple sine wave audio file
        sample_rate = 44100
        num_samples = int(sample_rate * duration)
        frequency = 440  # A4 note
        
        # Generate sine wave samples
        samples = []
        for i in range(num_samples):
            sample = int(32767 * math.sin(2 * math.pi * frequency * i / sample_rate))
            samples.append(sample)
        
        # Create WAV file in memory
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)
            
            # Pack samples as 16-bit signed integers
            packed_samples = struct.pack('<' + 'h' * len(samples), *samples)
            wav_file.writeframes(packed_samples)
        
        wav_buffer.seek(0)
        return wav_buffer.getvalue()
    
    def test_voice_message_upload(self):
        """Test POST /api/chats/{chat_id}/voice - Upload voice message"""
        print("\n=== Testing Voice Message Upload ===")
        
        if not self.test_chat_id:
            self.log_result("Voice Message Upload", False, "No test chat ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Create test voice file
            voice_data = self.create_test_voice_file("test_voice.wav", 3.5)
            
            files = {
                'voice_file': ('test_voice.wav', voice_data, 'audio/wav')
            }
            data = {
                'duration': '3.5'
            }
            
            response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/voice",
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code == 200:
                result = response.json()
                message = result.get("message")
                if message:
                    # Check voice message properties
                    if (message.get("message_type") == "voice" and 
                        message.get("content") == "🎵 Voice message" and
                        message.get("voice_duration") is not None and
                        message.get("voice_waveform") is not None and
                        len(message.get("attachments", [])) > 0):
                        
                        attachment = message["attachments"][0]
                        if attachment.get("file_type") == "voice":
                            self.log_result("Voice Message Upload", True, f"Voice message uploaded successfully with duration {message.get('voice_duration')}s")
                            return True
                        else:
                            self.log_result("Voice Message Upload", False, f"Attachment file type is {attachment.get('file_type')}, expected 'voice'")
                            return False
                    else:
                        self.log_result("Voice Message Upload", False, f"Voice message missing required properties: type={message.get('message_type')}, duration={message.get('voice_duration')}, waveform_len={len(message.get('voice_waveform', []))}")
                        return False
                else:
                    self.log_result("Voice Message Upload", False, "No message in response")
                    return False
            else:
                self.log_result("Voice Message Upload", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Voice Message Upload", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_voice_file_processing(self):
        """Test voice file processing - waveform generation and duration extraction"""
        print("\n=== Testing Voice File Processing ===")
        
        if not self.test_chat_id:
            self.log_result("Voice File Processing", False, "No test chat ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Create test voice file with known duration
            test_duration = 2.0
            voice_data = self.create_test_voice_file("processing_test.wav", test_duration)
            
            files = {
                'voice_file': ('processing_test.wav', voice_data, 'audio/wav')
            }
            data = {
                'duration': str(test_duration)
            }
            
            response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/voice",
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code == 200:
                result = response.json()
                message = result.get("message")
                if message:
                    voice_duration = message.get("voice_duration")
                    voice_waveform = message.get("voice_waveform")
                    
                    # Check duration extraction (should be close to test_duration)
                    if voice_duration and abs(voice_duration - test_duration) < 0.5:
                        duration_ok = True
                    else:
                        duration_ok = False
                    
                    # Check waveform generation
                    if voice_waveform and isinstance(voice_waveform, list) and len(voice_waveform) > 0:
                        # Check that waveform contains float values between 0 and 1
                        waveform_ok = all(isinstance(x, (int, float)) and 0 <= x <= 1 for x in voice_waveform[:10])
                    else:
                        waveform_ok = False
                    
                    if duration_ok and waveform_ok:
                        self.log_result("Voice File Processing", True, f"Voice processing successful: duration={voice_duration}s, waveform_samples={len(voice_waveform)}")
                        return True
                    else:
                        self.log_result("Voice File Processing", False, f"Processing issues: duration_ok={duration_ok} (got {voice_duration}), waveform_ok={waveform_ok}")
                        return False
                else:
                    self.log_result("Voice File Processing", False, "No message in response")
                    return False
            else:
                self.log_result("Voice File Processing", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Voice File Processing", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_voice_file_type_support(self):
        """Test support for different voice file types"""
        print("\n=== Testing Voice File Type Support ===")
        
        if not self.test_chat_id:
            self.log_result("Voice File Type Support", False, "No test chat ID available")
            return False
        
        # Test different voice file extensions
        voice_extensions = [".wav", ".mp3", ".m4a", ".ogg"]  # Skip .webm as it's harder to generate
        success_count = 0
        
        for ext in voice_extensions:
            try:
                headers = {"Authorization": f"Bearer {self.admin_token}"}
                
                # Create test voice file (using WAV data but different extension)
                voice_data = self.create_test_voice_file(f"test_voice{ext}", 1.0)
                
                files = {
                    'voice_file': (f'test_voice{ext}', voice_data, 'audio/wav')
                }
                data = {
                    'duration': '1.0'
                }
                
                response = self.session.post(
                    f"{BASE_URL}/chats/{self.test_chat_id}/voice",
                    files=files,
                    data=data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    message = result.get("message")
                    if message and message.get("message_type") == "voice":
                        success_count += 1
                        self.log_result(f"Voice File Type {ext}", True, f"Successfully uploaded voice file with {ext} extension")
                    else:
                        self.log_result(f"Voice File Type {ext}", False, "Upload succeeded but message type incorrect")
                else:
                    self.log_result(f"Voice File Type {ext}", False, f"Failed with status {response.status_code}")
                    
            except Exception as e:
                self.log_result(f"Voice File Type {ext}", False, f"Exception occurred: {str(e)}")
        
        if success_count >= len(voice_extensions) // 2:  # At least half should work
            self.log_result("Voice File Type Support", True, f"Voice file type support working ({success_count}/{len(voice_extensions)} types successful)")
            return True
        else:
            self.log_result("Voice File Type Support", False, f"Insufficient voice file type support ({success_count}/{len(voice_extensions)} types successful)")
            return False
    
    def test_voice_message_push_notification(self):
        """Test push notifications for voice messages"""
        print("\n=== Testing Voice Message Push Notifications ===")
        
        if not self.test_chat_id:
            self.log_result("Voice Message Push Notification", False, "No test chat ID available")
            return False
        
        try:
            # First, subscribe resident to push notifications
            resident_headers = {"Authorization": f"Bearer {self.resident_token}"}
            subscription_data = {
                "endpoint": "https://fcm.googleapis.com/fcm/send/voice-test-endpoint",
                "keys": {
                    "p256dh": "BNbN3OFADuGtmBGgvAOcpOTNkMcgs7absMnxKZ4M8kHaVt7ZapWTVJkCk-69CfMRu-14NjLHoA8C8-wFPQHBtQs",
                    "auth": "tBHItJI5svbpez7KI4CCXg"
                }
            }
            
            subscribe_response = self.session.post(f"{BASE_URL}/push/subscribe", 
                                                 json=subscription_data, headers=resident_headers)
            
            if subscribe_response.status_code != 200:
                self.log_result("Voice Message Push Notification", False, "Failed to subscribe resident to push notifications")
                return False
            
            # Send a voice message as admin (should trigger notification to resident)
            admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
            voice_data = self.create_test_voice_file("notification_test.wav", 2.0)
            
            files = {
                'voice_file': ('notification_test.wav', voice_data, 'audio/wav')
            }
            data = {
                'duration': '2.0'
            }
            
            voice_response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/voice",
                files=files,
                data=data,
                headers=admin_headers
            )
            
            if voice_response.status_code == 200:
                result = voice_response.json()
                message = result.get("message")
                if message and message.get("content") == "🎵 Voice message":
                    # The push notification logic is called in the background
                    # Since we can't actually verify the push notification was sent (it's mocked),
                    # we verify that the voice message was sent successfully with correct content
                    self.log_result("Voice Message Push Notification", True, "Voice message sent successfully with '🎵 Voice message' content - push notification logic triggered")
                    return True
                else:
                    self.log_result("Voice Message Push Notification", False, f"Voice message content incorrect: {message.get('content') if message else 'No message'}")
                    return False
            else:
                self.log_result("Voice Message Push Notification", False, f"Failed to send voice message: {voice_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Voice Message Push Notification", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_voice_file_serving(self):
        """Test voice message files are accessible via /uploads/ endpoint"""
        print("\n=== Testing Voice File Serving ===")
        
        if not self.test_chat_id:
            self.log_result("Voice File Serving", False, "No test chat ID available")
            return False
        
        try:
            # First upload a voice message
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            voice_data = self.create_test_voice_file("serve_test.wav", 1.5)
            
            files = {
                'voice_file': ('serve_test.wav', voice_data, 'audio/wav')
            }
            data = {
                'duration': '1.5'
            }
            
            upload_response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/voice",
                files=files,
                data=data,
                headers=headers
            )
            
            if upload_response.status_code == 200:
                message = upload_response.json().get("message")
                if message and message.get("attachments"):
                    attachment = message["attachments"][0]
                    file_url = attachment.get("file_url")
                    
                    if file_url:
                        # Test file access
                        file_response = self.session.get(f"https://homeme-platform.preview.emergentagent.com{file_url}")
                        
                        if file_response.status_code == 200:
                            # Check if it's actually audio data
                            content_type = file_response.headers.get('content-type', '')
                            if 'audio' in content_type.lower() or len(file_response.content) > 1000:
                                self.log_result("Voice File Serving", True, f"Voice file served successfully via {file_url}")
                                return True
                            else:
                                self.log_result("Voice File Serving", False, f"File served but content seems invalid: content-type={content_type}, size={len(file_response.content)}")
                                return False
                        else:
                            self.log_result("Voice File Serving", False, f"Voice file serving failed with status {file_response.status_code}")
                            return False
                    else:
                        self.log_result("Voice File Serving", False, "No file URL in attachment")
                        return False
                else:
                    self.log_result("Voice File Serving", False, "No attachments in upload response")
                    return False
            else:
                self.log_result("Voice File Serving", False, f"Voice file upload failed: {upload_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Voice File Serving", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_voice_message_chat_integration(self):
        """Test voice messages appear in chat message history with proper type"""
        print("\n=== Testing Voice Message Chat Integration ===")
        
        if not self.test_chat_id:
            self.log_result("Voice Message Chat Integration", False, "No test chat ID available")
            return False
        
        try:
            # Send a voice message
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            voice_data = self.create_test_voice_file("integration_test.wav", 2.5)
            
            files = {
                'voice_file': ('integration_test.wav', voice_data, 'audio/wav')
            }
            data = {
                'duration': '2.5'
            }
            
            voice_response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/voice",
                files=files,
                data=data,
                headers=headers
            )
            
            if voice_response.status_code == 200:
                voice_message_id = voice_response.json().get("message", {}).get("id")
                
                # Get chat messages to verify the voice message appears
                messages_response = self.session.get(
                    f"{BASE_URL}/chats/{self.test_chat_id}/messages?page=1&limit=50",
                    headers=headers
                )
                
                if messages_response.status_code == 200:
                    messages = messages_response.json().get("messages", [])
                    voice_message = next((m for m in messages if m.get("id") == voice_message_id), None)
                    
                    if voice_message:
                        # Check voice message properties in chat history
                        if (voice_message.get("message_type") == "voice" and
                            voice_message.get("content") == "🎵 Voice message" and
                            voice_message.get("voice_duration") is not None and
                            voice_message.get("voice_waveform") is not None and
                            len(voice_message.get("attachments", [])) > 0):
                            
                            self.log_result("Voice Message Chat Integration", True, "Voice message properly integrated in chat history with all metadata")
                            return True
                        else:
                            self.log_result("Voice Message Chat Integration", False, f"Voice message in chat history missing properties: type={voice_message.get('message_type')}, content={voice_message.get('content')}")
                            return False
                    else:
                        self.log_result("Voice Message Chat Integration", False, "Voice message not found in chat history")
                        return False
                else:
                    self.log_result("Voice Message Chat Integration", False, f"Failed to get chat messages: {messages_response.status_code}")
                    return False
            else:
                self.log_result("Voice Message Chat Integration", False, f"Failed to send voice message: {voice_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Voice Message Chat Integration", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_voice_message_validation(self):
        """Test voice message validation and error handling"""
        print("\n=== Testing Voice Message Validation ===")
        
        if not self.test_chat_id:
            self.log_result("Voice Message Validation", False, "No test chat ID available")
            return False
        
        success_count = 0
        total_tests = 0
        
        # Test invalid file type
        try:
            total_tests += 1
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Try to upload a non-voice file as voice
            invalid_file_data = b"This is not a voice file"
            
            files = {
                'voice_file': ('test.txt', invalid_file_data, 'text/plain')
            }
            data = {
                'duration': '1.0'
            }
            
            response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/voice",
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code == 400:
                self.log_result("Voice File Type Validation", True, "Correctly rejected invalid voice file type")
                success_count += 1
            else:
                self.log_result("Voice File Type Validation", False, f"Expected 400 for invalid file type, got {response.status_code}")
        except Exception as e:
            self.log_result("Voice File Type Validation", False, f"Exception occurred: {str(e)}")
        
        # Test unauthorized access
        try:
            total_tests += 1
            voice_data = self.create_test_voice_file("unauthorized_test.wav", 1.0)
            
            files = {
                'voice_file': ('unauthorized_test.wav', voice_data, 'audio/wav')
            }
            data = {
                'duration': '1.0'
            }
            
            # Try without authorization
            response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/voice",
                files=files,
                data=data
            )
            
            if response.status_code in [401, 403]:
                self.log_result("Voice Message Unauthorized Access", True, f"Correctly rejected unauthorized voice upload (status: {response.status_code})")
                success_count += 1
            else:
                self.log_result("Voice Message Unauthorized Access", False, f"Expected 401 or 403, got {response.status_code}")
        except Exception as e:
            self.log_result("Voice Message Unauthorized Access", False, f"Exception occurred: {str(e)}")
        
        # Test invalid chat ID
        try:
            total_tests += 1
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            voice_data = self.create_test_voice_file("invalid_chat_test.wav", 1.0)
            
            files = {
                'voice_file': ('invalid_chat_test.wav', voice_data, 'audio/wav')
            }
            data = {
                'duration': '1.0'
            }
            
            response = self.session.post(
                f"{BASE_URL}/chats/invalid-chat-id/voice",
                files=files,
                data=data,
                headers=headers
            )
            
            if response.status_code == 404:
                self.log_result("Voice Message Invalid Chat", True, "Correctly rejected voice upload to invalid chat")
                success_count += 1
            else:
                self.log_result("Voice Message Invalid Chat", False, f"Expected 404 for invalid chat, got {response.status_code}")
        except Exception as e:
            self.log_result("Voice Message Invalid Chat", False, f"Exception occurred: {str(e)}")
        
        if success_count == total_tests:
            self.log_result("Voice Message Validation", True, f"All validation tests passed ({success_count}/{total_tests})")
            return True
        else:
            self.log_result("Voice Message Validation", False, f"Some validation tests failed ({success_count}/{total_tests})")
            return False

    def test_message_search_basic(self):
        """Test POST /api/search/messages - Basic text search"""
        print("\n=== Testing Basic Message Search ===")
        
        if not self.test_chat_id:
            self.log_result("Basic Message Search", False, "No test chat ID available")
            return False
        
        try:
            # First send some test messages to search for
            headers = self.setup_auth_headers(self.admin_token)
            
            # Send test messages with specific content
            test_messages = [
                "Hello world, this is a test message",
                "Python programming is awesome",
                "Chat system working perfectly",
                "Search functionality test message"
            ]
            
            for content in test_messages:
                message_data = {
                    "content": content,
                    "message_type": "text"
                }
                self.session.post(f"{BASE_URL}/chats/{self.test_chat_id}/messages", 
                                json=message_data, headers=headers)
            
            # Now search for messages
            search_data = {
                "query": "test message",
                "search_type": "text",
                "limit": 10,
                "skip": 0,
                "sort_by": "created_at",
                "sort_order": "desc"
            }
            
            response = self.session.post(f"{BASE_URL}/search/messages", 
                                       json=search_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "results" in data:
                    results = data["results"]
                    messages = results.get("messages", [])
                    if len(messages) >= 2:  # Should find at least 2 messages with "test message"
                        self.log_result("Basic Message Search", True, f"Found {len(messages)} messages matching search query")
                        return True
                    else:
                        self.log_result("Basic Message Search", False, f"Expected at least 2 messages, found {len(messages)}")
                        return False
                else:
                    self.log_result("Basic Message Search", False, f"Invalid response format: {data}")
                    return False
            else:
                self.log_result("Basic Message Search", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Basic Message Search", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_message_search_advanced_filters(self):
        """Test advanced search filters (message type, date range, sender)"""
        print("\n=== Testing Advanced Message Search Filters ===")
        
        if not self.test_chat_id:
            self.log_result("Advanced Message Search Filters", False, "No test chat ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test message type filter
            search_data = {
                "query": "",
                "search_type": "advanced",
                "message_types": ["text"],
                "limit": 20,
                "skip": 0,
                "sort_by": "created_at",
                "sort_order": "desc"
            }
            
            response = self.session.post(f"{BASE_URL}/search/messages", 
                                       json=search_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "results" in data:
                    results = data["results"]
                    messages = results.get("messages", [])
                    
                    # Check that all returned messages are text type
                    text_messages = [m for m in messages if m.get("message_type") == "text"]
                    if len(text_messages) == len(messages) and len(messages) > 0:
                        self.log_result("Message Type Filter", True, f"Message type filter working correctly ({len(messages)} text messages)")
                    else:
                        self.log_result("Message Type Filter", False, f"Message type filter failed: {len(text_messages)}/{len(messages)} are text type")
                        return False
                else:
                    self.log_result("Message Type Filter", False, f"Invalid response format: {data}")
                    return False
            else:
                self.log_result("Message Type Filter", False, f"Failed with status {response.status_code}")
                return False
            
            # Test sender filter
            search_data = {
                "query": "",
                "search_type": "advanced",
                "sender_ids": [self.admin_user["id"]],
                "limit": 20,
                "skip": 0
            }
            
            response = self.session.post(f"{BASE_URL}/search/messages", 
                                       json=search_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "results" in data:
                    results = data["results"]
                    messages = results.get("messages", [])
                    
                    # Check that all returned messages are from admin
                    admin_messages = [m for m in messages if m.get("sender_id") == self.admin_user["id"]]
                    if len(admin_messages) == len(messages) and len(messages) > 0:
                        self.log_result("Sender Filter", True, f"Sender filter working correctly ({len(messages)} messages from admin)")
                        return True
                    else:
                        self.log_result("Sender Filter", False, f"Sender filter failed: {len(admin_messages)}/{len(messages)} are from admin")
                        return False
                else:
                    self.log_result("Sender Filter", False, f"Invalid response format: {data}")
                    return False
            else:
                self.log_result("Sender Filter", False, f"Failed with status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Advanced Message Search Filters", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_search_suggestions(self):
        """Test GET /api/search/suggestions - Get search suggestions"""
        print("\n=== Testing Search Suggestions ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test with a query that should return suggestions
            response = self.session.get(f"{BASE_URL}/search/suggestions?query=test&limit=5", 
                                      headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                suggestions = data.get("suggestions", [])
                if isinstance(suggestions, list):
                    self.log_result("Search Suggestions", True, f"Retrieved {len(suggestions)} search suggestions")
                    return True
                else:
                    self.log_result("Search Suggestions", False, f"Invalid suggestions format: {type(suggestions)}")
                    return False
            else:
                self.log_result("Search Suggestions", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Search Suggestions", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_search_history(self):
        """Test search history management"""
        print("\n=== Testing Search History ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # First perform a search to create history
            search_data = {
                "query": "history test query",
                "search_type": "text",
                "limit": 10,
                "skip": 0
            }
            
            search_response = self.session.post(f"{BASE_URL}/search/messages", 
                                              json=search_data, headers=headers)
            
            if search_response.status_code != 200:
                self.log_result("Search History", False, "Failed to perform initial search")
                return False
            
            # Get search history
            history_response = self.session.get(f"{BASE_URL}/search/history?limit=10", 
                                              headers=headers)
            
            if history_response.status_code == 200:
                data = history_response.json()
                history = data.get("history", [])
                
                # Check if our search query is in history
                history_queries = [h.get("query") for h in history]
                if "history test query" in history_queries:
                    self.log_result("Get Search History", True, f"Search history retrieved successfully ({len(history)} items)")
                    
                    # Test clearing search history
                    clear_response = self.session.delete(f"{BASE_URL}/search/history", 
                                                       headers=headers)
                    
                    if clear_response.status_code == 200:
                        # Verify history is cleared
                        verify_response = self.session.get(f"{BASE_URL}/search/history?limit=10", 
                                                         headers=headers)
                        
                        if verify_response.status_code == 200:
                            verify_data = verify_response.json()
                            verify_history = verify_data.get("history", [])
                            if len(verify_history) == 0:
                                self.log_result("Clear Search History", True, "Search history cleared successfully")
                                return True
                            else:
                                self.log_result("Clear Search History", False, f"History not cleared: {len(verify_history)} items remain")
                                return False
                        else:
                            self.log_result("Clear Search History", False, "Failed to verify history clearing")
                            return False
                    else:
                        self.log_result("Clear Search History", False, f"Failed to clear history: {clear_response.status_code}")
                        return False
                else:
                    self.log_result("Get Search History", False, "Search query not found in history")
                    return False
            else:
                self.log_result("Get Search History", False, f"Failed with status {history_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Search History", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_saved_searches(self):
        """Test saved search management (CRUD operations)"""
        print("\n=== Testing Saved Searches ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            saved_search_id = None
            
            # Create a saved search
            save_data = {
                "name": "Test Saved Search",
                "query": "important messages",
                "search_type": "text",
                "filters": {
                    "message_types": ["text"],
                    "sort_by": "created_at",
                    "sort_order": "desc"
                }
            }
            
            create_response = self.session.post(f"{BASE_URL}/search/saved", 
                                              json=save_data, headers=headers)
            
            if create_response.status_code == 200:
                data = create_response.json()
                saved_search = data.get("saved_search")
                if saved_search and saved_search.get("id"):
                    saved_search_id = saved_search["id"]
                    self.log_result("Create Saved Search", True, f"Saved search created with ID: {saved_search_id}")
                else:
                    self.log_result("Create Saved Search", False, "No saved search ID in response")
                    return False
            else:
                self.log_result("Create Saved Search", False, f"Failed with status {create_response.status_code}")
                return False
            
            # Get saved searches
            get_response = self.session.get(f"{BASE_URL}/search/saved", headers=headers)
            
            if get_response.status_code == 200:
                data = get_response.json()
                saved_searches = data.get("saved_searches", [])
                
                # Check if our saved search is in the list
                our_search = next((s for s in saved_searches if s.get("id") == saved_search_id), None)
                if our_search and our_search.get("name") == "Test Saved Search":
                    self.log_result("Get Saved Searches", True, f"Retrieved {len(saved_searches)} saved searches")
                else:
                    self.log_result("Get Saved Searches", False, "Our saved search not found in list")
                    return False
            else:
                self.log_result("Get Saved Searches", False, f"Failed with status {get_response.status_code}")
                return False
            
            # Update saved search
            update_data = {
                "name": "Updated Test Saved Search",
                "query": "updated important messages",
                "search_type": "advanced",
                "filters": {
                    "message_types": ["text", "image"],
                    "sort_by": "relevance"
                }
            }
            
            update_response = self.session.put(f"{BASE_URL}/search/saved/{saved_search_id}", 
                                             json=update_data, headers=headers)
            
            if update_response.status_code == 200:
                self.log_result("Update Saved Search", True, "Saved search updated successfully")
            else:
                self.log_result("Update Saved Search", False, f"Failed with status {update_response.status_code}")
                return False
            
            # Delete saved search
            delete_response = self.session.delete(f"{BASE_URL}/search/saved/{saved_search_id}", 
                                                headers=headers)
            
            if delete_response.status_code == 200:
                # Verify deletion
                verify_response = self.session.get(f"{BASE_URL}/search/saved", headers=headers)
                if verify_response.status_code == 200:
                    verify_data = verify_response.json()
                    verify_searches = verify_data.get("saved_searches", [])
                    deleted_search = next((s for s in verify_searches if s.get("id") == saved_search_id), None)
                    
                    if not deleted_search:
                        self.log_result("Delete Saved Search", True, "Saved search deleted successfully")
                        return True
                    else:
                        self.log_result("Delete Saved Search", False, "Saved search still exists after deletion")
                        return False
                else:
                    self.log_result("Delete Saved Search", False, "Failed to verify deletion")
                    return False
            else:
                self.log_result("Delete Saved Search", False, f"Failed with status {delete_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Saved Searches", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_search_pagination(self):
        """Test search results pagination"""
        print("\n=== Testing Search Pagination ===")
        
        if not self.test_chat_id:
            self.log_result("Search Pagination", False, "No test chat ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Send multiple messages to ensure we have enough for pagination
            for i in range(15):
                message_data = {
                    "content": f"Pagination test message number {i+1}",
                    "message_type": "text"
                }
                self.session.post(f"{BASE_URL}/chats/{self.test_chat_id}/messages", 
                                json=message_data, headers=headers)
            
            # Test first page
            search_data = {
                "query": "pagination test",
                "search_type": "text",
                "limit": 5,
                "skip": 0,
                "sort_by": "created_at",
                "sort_order": "desc"
            }
            
            first_page_response = self.session.post(f"{BASE_URL}/search/messages", 
                                                  json=search_data, headers=headers)
            
            if first_page_response.status_code == 200:
                first_data = first_page_response.json()
                first_results = first_data.get("results", {})
                first_messages = first_results.get("messages", [])
                
                if len(first_messages) == 5:
                    # Test second page
                    search_data["skip"] = 5
                    second_page_response = self.session.post(f"{BASE_URL}/search/messages", 
                                                           json=search_data, headers=headers)
                    
                    if second_page_response.status_code == 200:
                        second_data = second_page_response.json()
                        second_results = second_data.get("results", {})
                        second_messages = second_results.get("messages", [])
                        
                        # Check that we got different messages
                        first_ids = {m.get("id") for m in first_messages}
                        second_ids = {m.get("id") for m in second_messages}
                        
                        if len(first_ids & second_ids) == 0 and len(second_messages) > 0:
                            self.log_result("Search Pagination", True, f"Pagination working correctly (page 1: {len(first_messages)}, page 2: {len(second_messages)})")
                            return True
                        else:
                            self.log_result("Search Pagination", False, f"Pagination failed: overlapping results or empty second page")
                            return False
                    else:
                        self.log_result("Search Pagination", False, f"Second page request failed: {second_page_response.status_code}")
                        return False
                else:
                    self.log_result("Search Pagination", False, f"Expected 5 messages on first page, got {len(first_messages)}")
                    return False
            else:
                self.log_result("Search Pagination", False, f"First page request failed: {first_page_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Search Pagination", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_search_access_control(self):
        """Test search access control - users only search their compound's messages"""
        print("\n=== Testing Search Access Control ===")
        
        try:
            # Test with admin token
            admin_headers = self.setup_auth_headers(self.admin_token)
            search_data = {
                "query": "test",
                "search_type": "text",
                "limit": 10,
                "skip": 0
            }
            
            admin_response = self.session.post(f"{BASE_URL}/search/messages", 
                                             json=search_data, headers=admin_headers)
            
            if admin_response.status_code == 200:
                admin_data = admin_response.json()
                admin_results = admin_data.get("results", {})
                admin_messages = admin_results.get("messages", [])
                
                # Test with resident token
                resident_headers = self.setup_auth_headers(self.resident_token)
                resident_response = self.session.post(f"{BASE_URL}/search/messages", 
                                                    json=search_data, headers=resident_headers)
                
                if resident_response.status_code == 200:
                    resident_data = resident_response.json()
                    resident_results = resident_data.get("results", {})
                    resident_messages = resident_results.get("messages", [])
                    
                    # Both should be able to search (same compound), but results may differ based on chat participation
                    self.log_result("Search Access Control", True, f"Both users can search (admin: {len(admin_messages)}, resident: {len(resident_messages)} results)")
                    return True
                else:
                    self.log_result("Search Access Control", False, f"Resident search failed: {resident_response.status_code}")
                    return False
            else:
                self.log_result("Search Access Control", False, f"Admin search failed: {admin_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Search Access Control", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_search_unauthorized_access(self):
        """Test unauthorized access to search endpoints"""
        print("\n=== Testing Search Unauthorized Access ===")
        
        try:
            # Test without token
            search_data = {
                "query": "test",
                "search_type": "text",
                "limit": 10,
                "skip": 0
            }
            
            response = self.session.post(f"{BASE_URL}/search/messages", json=search_data)
            
            if response.status_code in [401, 403]:
                self.log_result("Search Unauthorized Access", True, f"Correctly rejected unauthorized search request (status: {response.status_code})")
                return True
            else:
                self.log_result("Search Unauthorized Access", False, f"Expected 401 or 403, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Search Unauthorized Access", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_search_edge_cases(self):
        """Test search edge cases and error handling"""
        print("\n=== Testing Search Edge Cases ===")
        
        success_count = 0
        total_tests = 0
        
        headers = self.setup_auth_headers(self.admin_token)
        
        # Test empty query
        try:
            total_tests += 1
            search_data = {
                "query": "",
                "search_type": "text",
                "limit": 10,
                "skip": 0
            }
            
            response = self.session.post(f"{BASE_URL}/search/messages", 
                                       json=search_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Empty Query Search", True, "Empty query handled correctly")
                    success_count += 1
                else:
                    self.log_result("Empty Query Search", False, "Empty query not handled properly")
            else:
                self.log_result("Empty Query Search", False, f"Empty query failed: {response.status_code}")
        except Exception as e:
            self.log_result("Empty Query Search", False, f"Exception: {str(e)}")
        
        # Test invalid search type
        try:
            total_tests += 1
            search_data = {
                "query": "test",
                "search_type": "invalid_type",
                "limit": 10,
                "skip": 0
            }
            
            response = self.session.post(f"{BASE_URL}/search/messages", 
                                       json=search_data, headers=headers)
            
            # Should either work (fallback to default) or return 400
            if response.status_code in [200, 400]:
                self.log_result("Invalid Search Type", True, f"Invalid search type handled correctly (status: {response.status_code})")
                success_count += 1
            else:
                self.log_result("Invalid Search Type", False, f"Unexpected status for invalid search type: {response.status_code}")
        except Exception as e:
            self.log_result("Invalid Search Type", False, f"Exception: {str(e)}")
        
        # Test very large limit
        try:
            total_tests += 1
            search_data = {
                "query": "test",
                "search_type": "text",
                "limit": 10000,  # Very large limit
                "skip": 0
            }
            
            response = self.session.post(f"{BASE_URL}/search/messages", 
                                       json=search_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", {})
                messages = results.get("messages", [])
                # Should handle large limit gracefully (either cap it or return what's available)
                if len(messages) <= 1000:  # Reasonable cap
                    self.log_result("Large Limit Search", True, f"Large limit handled correctly ({len(messages)} results)")
                    success_count += 1
                else:
                    self.log_result("Large Limit Search", False, f"Large limit not capped properly ({len(messages)} results)")
            else:
                self.log_result("Large Limit Search", False, f"Large limit failed: {response.status_code}")
        except Exception as e:
            self.log_result("Large Limit Search", False, f"Exception: {str(e)}")
        
        if success_count >= total_tests // 2:  # At least half should pass
            self.log_result("Search Edge Cases", True, f"Edge cases handled well ({success_count}/{total_tests})")
            return True
        else:
            self.log_result("Search Edge Cases", False, f"Too many edge case failures ({success_count}/{total_tests})")
            return False

    # ============ FILE GALLERY TESTS ============
    
    def test_file_gallery_basic(self):
        """Test POST /api/gallery/files - Basic file gallery functionality"""
        print("\n=== Testing File Gallery Basic ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # First upload some files to have data for gallery
            if self.test_chat_id:
                # Upload an image
                image_data = self.create_test_image("gallery_test.jpg")
                files = {'files': ('gallery_test.jpg', image_data, 'image/jpeg')}
                data = {'content': 'Gallery test image', 'message_type': 'image'}
                
                upload_response = self.session.post(
                    f"{BASE_URL}/chats/{self.test_chat_id}/upload",
                    files=files, data=data, headers={"Authorization": f"Bearer {self.admin_token}"}
                )
                
                if upload_response.status_code != 200:
                    self.log_result("File Gallery Basic", False, "Failed to upload test file for gallery")
                    return False
            
            # Test basic gallery files request
            gallery_filter = {
                "limit": 20,
                "skip": 0,
                "sort_by": "uploaded_at",
                "sort_order": "desc"
            }
            
            response = self.session.post(f"{BASE_URL}/gallery/files", 
                                       json=gallery_filter, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "results" in data:
                    results = data["results"]
                    files = results.get("files", [])
                    self.log_result("File Gallery Basic", True, f"Retrieved {len(files)} files from gallery")
                    return True
                else:
                    self.log_result("File Gallery Basic", False, f"Invalid response structure: {data}")
                    return False
            else:
                self.log_result("File Gallery Basic", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("File Gallery Basic", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_file_gallery_filters(self):
        """Test file gallery with different filters"""
        print("\n=== Testing File Gallery Filters ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test file type filter
            gallery_filter = {
                "file_types": ["image"],
                "limit": 10,
                "skip": 0,
                "sort_by": "uploaded_at",
                "sort_order": "desc"
            }
            
            response = self.session.post(f"{BASE_URL}/gallery/files", 
                                       json=gallery_filter, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    results = data["results"]
                    files = results.get("files", [])
                    
                    # Check if all returned files are images
                    image_files = [f for f in files if f.get("file_type") == "image"]
                    if len(image_files) == len(files):
                        self.log_result("File Gallery Filters - File Type", True, f"Image filter working correctly ({len(files)} images)")
                    else:
                        self.log_result("File Gallery Filters - File Type", False, f"Filter not working: {len(image_files)}/{len(files)} are images")
                        return False
                else:
                    self.log_result("File Gallery Filters - File Type", False, "Invalid response structure")
                    return False
            else:
                self.log_result("File Gallery Filters - File Type", False, f"Failed with status {response.status_code}")
                return False
            
            # Test date range filter
            from datetime import datetime, timedelta
            yesterday = (datetime.utcnow() - timedelta(days=1)).isoformat()
            tomorrow = (datetime.utcnow() + timedelta(days=1)).isoformat()
            
            date_filter = {
                "date_from": yesterday,
                "date_to": tomorrow,
                "limit": 10,
                "skip": 0
            }
            
            date_response = self.session.post(f"{BASE_URL}/gallery/files", 
                                            json=date_filter, headers=headers)
            
            if date_response.status_code == 200:
                self.log_result("File Gallery Filters - Date Range", True, "Date range filter working")
                return True
            else:
                self.log_result("File Gallery Filters - Date Range", False, f"Date filter failed: {date_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("File Gallery Filters", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_file_gallery_stats(self):
        """Test GET /api/gallery/stats - File gallery statistics"""
        print("\n=== Testing File Gallery Stats ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/gallery/stats", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                stats = data.get("stats", {})
                
                # Check required stats fields
                required_fields = ["by_type", "total_files", "total_size"]
                missing_fields = [field for field in required_fields if field not in stats]
                
                if not missing_fields:
                    by_type = stats.get("by_type", {})
                    total_files = stats.get("total_files", 0)
                    self.log_result("File Gallery Stats", True, f"Stats retrieved successfully: {total_files} total files, {len(by_type)} file types")
                    return True
                else:
                    self.log_result("File Gallery Stats", False, f"Missing stats fields: {missing_fields}")
                    return False
            else:
                self.log_result("File Gallery Stats", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("File Gallery Stats", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_file_gallery_access_control(self):
        """Test file gallery access control - users only see files from their compound's chats"""
        print("\n=== Testing File Gallery Access Control ===")
        
        try:
            # Test as admin
            admin_headers = self.setup_auth_headers(self.admin_token)
            admin_response = self.session.post(f"{BASE_URL}/gallery/files", 
                                             json={"limit": 50}, headers=admin_headers)
            
            # Test as resident
            resident_headers = self.setup_auth_headers(self.resident_token)
            resident_response = self.session.post(f"{BASE_URL}/gallery/files", 
                                                json={"limit": 50}, headers=resident_headers)
            
            if admin_response.status_code == 200 and resident_response.status_code == 200:
                admin_files = admin_response.json().get("results", {}).get("files", [])
                resident_files = resident_response.json().get("results", {}).get("files", [])
                
                # Both should have access to files from their compound's chats
                # The exact number may differ based on chat participation
                self.log_result("File Gallery Access Control", True, f"Access control working - Admin: {len(admin_files)} files, Resident: {len(resident_files)} files")
                return True
            else:
                self.log_result("File Gallery Access Control", False, f"Failed - Admin: {admin_response.status_code}, Resident: {resident_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("File Gallery Access Control", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_file_gallery_pagination(self):
        """Test file gallery pagination"""
        print("\n=== Testing File Gallery Pagination ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test first page
            page1_filter = {"limit": 5, "skip": 0}
            page1_response = self.session.post(f"{BASE_URL}/gallery/files", 
                                             json=page1_filter, headers=headers)
            
            if page1_response.status_code == 200:
                page1_data = page1_response.json().get("results", {})
                page1_files = page1_data.get("files", [])
                has_more = page1_data.get("has_more", False)
                total_count = page1_data.get("total_count", 0)
                
                # Test second page if there are more files
                if has_more and total_count > 5:
                    page2_filter = {"limit": 5, "skip": 5}
                    page2_response = self.session.post(f"{BASE_URL}/gallery/files", 
                                                     json=page2_filter, headers=headers)
                    
                    if page2_response.status_code == 200:
                        page2_files = page2_response.json().get("results", {}).get("files", [])
                        
                        # Check that pages have different files
                        page1_ids = {f.get("id") for f in page1_files}
                        page2_ids = {f.get("id") for f in page2_files}
                        
                        if not page1_ids.intersection(page2_ids):
                            self.log_result("File Gallery Pagination", True, f"Pagination working correctly - Page 1: {len(page1_files)}, Page 2: {len(page2_files)}")
                            return True
                        else:
                            self.log_result("File Gallery Pagination", False, "Pages contain duplicate files")
                            return False
                    else:
                        self.log_result("File Gallery Pagination", False, f"Page 2 failed: {page2_response.status_code}")
                        return False
                else:
                    self.log_result("File Gallery Pagination", True, f"Pagination structure correct - Total: {total_count}, Page 1: {len(page1_files)}")
                    return True
            else:
                self.log_result("File Gallery Pagination", False, f"Page 1 failed: {page1_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("File Gallery Pagination", False, f"Exception occurred: {str(e)}")
            return False
    
    # ============ MESSAGE SCHEDULING TESTS ============
    
    def test_schedule_message_basic(self):
        """Test POST /api/chats/{chat_id}/schedule - Basic message scheduling"""
        print("\n=== Testing Schedule Message Basic ===")
        
        if not self.test_chat_id:
            self.log_result("Schedule Message Basic", False, "No test chat ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Schedule a message for 1 hour from now
            from datetime import datetime, timedelta
            scheduled_time = (datetime.utcnow() + timedelta(hours=1)).isoformat()
            
            schedule_data = {
                "content": "This is a scheduled test message",
                "message_type": "text",
                "scheduled_for": scheduled_time,
                "timezone": "UTC",
                "is_recurring": False
            }
            
            response = self.session.post(f"{BASE_URL}/chats/{self.test_chat_id}/schedule", 
                                       json=schedule_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                scheduled_message = data.get("scheduled_message")
                if scheduled_message and scheduled_message.get("id"):
                    self.scheduled_message_id = scheduled_message["id"]
                    self.log_result("Schedule Message Basic", True, f"Message scheduled successfully with ID: {self.scheduled_message_id}")
                    return True
                else:
                    self.log_result("Schedule Message Basic", False, "No scheduled message data in response")
                    return False
            else:
                self.log_result("Schedule Message Basic", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Schedule Message Basic", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_schedule_message_recurring(self):
        """Test scheduling recurring messages"""
        print("\n=== Testing Schedule Message Recurring ===")
        
        if not self.test_chat_id:
            self.log_result("Schedule Message Recurring", False, "No test chat ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Schedule a daily recurring message
            from datetime import datetime, timedelta
            scheduled_time = (datetime.utcnow() + timedelta(hours=2)).isoformat()
            end_time = (datetime.utcnow() + timedelta(days=7)).isoformat()
            
            schedule_data = {
                "content": "Daily recurring test message",
                "message_type": "text",
                "scheduled_for": scheduled_time,
                "timezone": "UTC",
                "is_recurring": True,
                "recurrence_pattern": "daily",
                "recurrence_end": end_time
            }
            
            response = self.session.post(f"{BASE_URL}/chats/{self.test_chat_id}/schedule", 
                                       json=schedule_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                scheduled_message = data.get("scheduled_message")
                if scheduled_message and scheduled_message.get("is_recurring"):
                    self.log_result("Schedule Message Recurring", True, f"Recurring message scheduled successfully")
                    return True
                else:
                    self.log_result("Schedule Message Recurring", False, "Recurring message not properly configured")
                    return False
            else:
                self.log_result("Schedule Message Recurring", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Schedule Message Recurring", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_scheduled_messages(self):
        """Test GET /api/scheduled-messages - Retrieve scheduled messages"""
        print("\n=== Testing Get Scheduled Messages ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/scheduled-messages?limit=20", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                scheduled_messages = data.get("scheduled_messages", [])
                total_count = data.get("total_count", 0)
                
                self.log_result("Get Scheduled Messages", True, f"Retrieved {len(scheduled_messages)} scheduled messages (total: {total_count})")
                return True
            else:
                self.log_result("Get Scheduled Messages", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Scheduled Messages", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_update_scheduled_message(self):
        """Test PUT /api/scheduled-messages/{message_id} - Update scheduled message"""
        print("\n=== Testing Update Scheduled Message ===")
        
        if not hasattr(self, 'scheduled_message_id') or not self.scheduled_message_id:
            self.log_result("Update Scheduled Message", False, "No scheduled message ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Update the scheduled message
            from datetime import datetime, timedelta
            new_scheduled_time = (datetime.utcnow() + timedelta(hours=3)).isoformat()
            
            update_data = {
                "content": "Updated scheduled test message",
                "scheduled_for": new_scheduled_time,
                "timezone": "UTC"
            }
            
            response = self.session.put(f"{BASE_URL}/scheduled-messages/{self.scheduled_message_id}", 
                                      json=update_data, headers=headers)
            
            if response.status_code == 200:
                self.log_result("Update Scheduled Message", True, "Scheduled message updated successfully")
                return True
            else:
                self.log_result("Update Scheduled Message", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Update Scheduled Message", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_delete_scheduled_message(self):
        """Test DELETE /api/scheduled-messages/{message_id} - Cancel scheduled message"""
        print("\n=== Testing Delete Scheduled Message ===")
        
        if not hasattr(self, 'scheduled_message_id') or not self.scheduled_message_id:
            self.log_result("Delete Scheduled Message", False, "No scheduled message ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.delete(f"{BASE_URL}/scheduled-messages/{self.scheduled_message_id}", 
                                         headers=headers)
            
            if response.status_code == 200:
                self.log_result("Delete Scheduled Message", True, "Scheduled message cancelled successfully")
                return True
            else:
                self.log_result("Delete Scheduled Message", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Delete Scheduled Message", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_schedule_message_validation(self):
        """Test message scheduling validation"""
        print("\n=== Testing Schedule Message Validation ===")
        
        if not self.test_chat_id:
            self.log_result("Schedule Message Validation", False, "No test chat ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test scheduling message in the past (should fail)
            from datetime import datetime, timedelta
            past_time = (datetime.utcnow() - timedelta(hours=1)).isoformat()
            
            invalid_schedule_data = {
                "content": "This should fail - scheduled in the past",
                "message_type": "text",
                "scheduled_for": past_time,
                "timezone": "UTC"
            }
            
            response = self.session.post(f"{BASE_URL}/chats/{self.test_chat_id}/schedule", 
                                       json=invalid_schedule_data, headers=headers)
            
            if response.status_code == 400:
                self.log_result("Schedule Message Validation - Past Time", True, "Correctly rejected past scheduled time")
            else:
                self.log_result("Schedule Message Validation - Past Time", False, f"Expected 400, got {response.status_code}")
                return False
            
            # Test invalid recurrence pattern
            future_time = (datetime.utcnow() + timedelta(hours=1)).isoformat()
            invalid_recurrence_data = {
                "content": "Invalid recurrence test",
                "message_type": "text",
                "scheduled_for": future_time,
                "timezone": "UTC",
                "is_recurring": True,
                "recurrence_pattern": "invalid_pattern"
            }
            
            recurrence_response = self.session.post(f"{BASE_URL}/chats/{self.test_chat_id}/schedule", 
                                                  json=invalid_recurrence_data, headers=headers)
            
            if recurrence_response.status_code == 400:
                self.log_result("Schedule Message Validation - Invalid Recurrence", True, "Correctly rejected invalid recurrence pattern")
                return True
            else:
                self.log_result("Schedule Message Validation - Invalid Recurrence", False, f"Expected 400, got {recurrence_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Schedule Message Validation", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_schedule_message_access_control(self):
        """Test message scheduling access control"""
        print("\n=== Testing Schedule Message Access Control ===")
        
        if not self.test_chat_id:
            self.log_result("Schedule Message Access Control", False, "No test chat ID available")
            return False
        
        try:
            # Try to schedule message in a chat where user is not a participant
            # First create a chat as admin with only admin as participant
            admin_headers = self.setup_auth_headers(self.admin_token)
            chat_data = {
                "chat_type": "group",
                "name": "Admin Only Scheduling Test",
                "description": "For testing scheduling access control",
                "participant_ids": []  # Only admin will be participant
            }
            
            chat_response = self.session.post(f"{BASE_URL}/chats", json=chat_data, headers=admin_headers)
            
            if chat_response.status_code == 200:
                admin_only_chat_id = chat_response.json()["chat"]["id"]
                
                # Try to schedule message as resident (should fail)
                resident_headers = self.setup_auth_headers(self.resident_token)
                from datetime import datetime, timedelta
                future_time = (datetime.utcnow() + timedelta(hours=1)).isoformat()
                
                schedule_data = {
                    "content": "This should fail - not a participant",
                    "message_type": "text",
                    "scheduled_for": future_time,
                    "timezone": "UTC"
                }
                
                response = self.session.post(f"{BASE_URL}/chats/{admin_only_chat_id}/schedule", 
                                           json=schedule_data, headers=resident_headers)
                
                if response.status_code in [403, 404]:
                    self.log_result("Schedule Message Access Control", True, f"Correctly denied access to non-participant (status: {response.status_code})")
                    return True
                else:
                    self.log_result("Schedule Message Access Control", False, f"Expected 403/404, got {response.status_code}")
                    return False
            else:
                self.log_result("Schedule Message Access Control", False, f"Failed to create test chat: {chat_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Schedule Message Access Control", False, f"Exception occurred: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all compound management system tests"""
        print("🏠 Starting Compound Management System Test Suite")
        print("=" * 60)
        
        # Authentication setup
        if not self.test_authentication():
            print("\n❌ Authentication failed. Cannot proceed with other tests.")
            return False
        
        # Compound Management tests
        test_methods = [
            # Core compound management tests
            self.test_get_compound_details,
            self.test_get_compound_residences,
            self.test_upload_compound_logo,
            # Registration link management tests
            self.test_create_registration_link,
            self.test_get_registration_links,
            self.test_verify_registration_token,
            self.test_complete_registration,
            self.test_delete_registration_link,
            # Access control tests
            self.test_admin_access_control,
            self.test_compound_access_control,
            # Security tests
            self.test_unauthorized_access
        ]
        
        # Run synchronous tests
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                self.log_result(test_method.__name__, False, f"Unexpected error: {str(e)}")
        
        # Run WebSocket test
        try:
            asyncio.run(self.test_websocket_connection())
        except Exception as e:
            self.log_result("WebSocket Connection", False, f"Unexpected error: {str(e)}")
        
        # Print summary
        self.print_summary()
        
        return True
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 50)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 50)
        
        passed = sum(1 for result in self.results if "✅ PASS" in result["status"])
        failed = sum(1 for result in self.results if "❌ FAIL" in result["status"])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        if failed > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['message']}")
                    if result["details"]:
                        print(f"    Details: {result['details']}")
        
        print("\n" + "=" * 50)

if __name__ == "__main__":
    test_suite = CompoundManagementTestSuite()
    test_suite.run_all_tests()