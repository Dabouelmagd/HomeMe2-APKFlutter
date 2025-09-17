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
                if result.get("action") == "added":
                    # Test removing the same reaction
                    remove_response = self.session.post(
                        f"{BASE_URL}/chats/{self.test_chat_id}/messages/{self.test_message_id}/react",
                        json=reaction_data,
                        headers=headers
                    )
                    
                    if remove_response.status_code == 200:
                        remove_result = remove_response.json()
                        if remove_result.get("action") == "removed":
                            self.log_result("Message Reactions", True, "Reaction added and removed successfully")
                            return True
                        else:
                            self.log_result("Message Reactions", False, f"Expected 'removed' action, got {remove_result.get('action')}")
                            return False
                    else:
                        self.log_result("Message Reactions", False, f"Failed to remove reaction: {remove_response.status_code}")
                        return False
                else:
                    self.log_result("Message Reactions", False, f"Expected 'added' action, got {result.get('action')}")
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
    
    def run_all_tests(self):
        """Run all chat system tests"""
        print("🚀 Starting Chat Backend Test Suite")
        print("=" * 50)
        
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