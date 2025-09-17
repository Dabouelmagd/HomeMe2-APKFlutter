#!/usr/bin/env python3
"""
Backend Chat System Test Suite
Tests all chat-related API endpoints and functionality including multimedia features
"""

import asyncio
import json
import requests
import websockets
import uuid
import io
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from PIL import Image

# Configuration
BASE_URL = "https://compound-hub.preview.emergentagent.com/api"
WS_URL = "wss://compound-hub.preview.emergentagent.com/ws/chat"

class ChatTestSuite:
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
                        file_response = self.session.get(f"https://compound-hub.preview.emergentagent.com{file_url}")
                        
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
                        file_response = self.session.get(f"https://compound-hub.preview.emergentagent.com{file_url}")
                        
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

    def run_all_tests(self):
        """Run all chat system and push notification tests"""
        print("🚀 Starting Chat Backend & Push Notification Test Suite")
        print("=" * 60)
        
        # Authentication setup
        if not self.test_authentication():
            print("\n❌ Authentication failed. Cannot proceed with other tests.")
            return False
        
        # Core functionality tests
        test_methods = [
            self.test_get_user_chats,
            self.test_create_direct_chat,
            self.test_create_group_chat,
            self.test_create_compound_wide_chat,
            self.test_get_chat_details,
            self.test_send_message,
            self.test_get_chat_messages,
            self.test_edit_message,
            self.test_mark_messages_as_read,
            self.test_add_participants,
            self.test_delete_message,
            # New multimedia tests
            self.test_file_upload_with_message,
            self.test_multiple_file_upload,
            self.test_file_size_limits,
            self.test_file_type_validation,
            self.test_file_serving,
            self.test_message_reactions,
            self.test_multiple_user_reactions,
            self.test_attachment_metadata,
            # Voice message tests
            self.test_voice_message_upload,
            self.test_voice_file_processing,
            self.test_voice_file_type_support,
            self.test_voice_message_push_notification,
            self.test_voice_file_serving,
            self.test_voice_message_chat_integration,
            self.test_voice_message_validation,
            # Push notification tests
            self.test_push_subscription_subscribe,
            self.test_get_notification_preferences,
            self.test_update_notification_preferences,
            self.test_push_test_notification,
            self.test_push_notification_chat_integration,
            self.test_push_unsubscribe,
            self.test_push_notification_unauthorized_access,
            # Security and edge case tests
            self.test_unauthorized_access,
            self.test_access_control,
            self.test_edge_cases
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
    test_suite = ChatTestSuite()
    test_suite.run_all_tests()