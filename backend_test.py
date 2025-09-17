#!/usr/bin/env python3
"""
Backend Chat System Test Suite
Tests all chat-related API endpoints and functionality
"""

import asyncio
import json
import requests
import websockets
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

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
            # First try existing resident
            resident_login_data = {
                "username": "resident1",
                "password": "password123"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=resident_login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.resident_token = data["access_token"]
                self.resident_user = data["user"]
                self.log_result("Resident Login", True, "Resident authenticated successfully")
            else:
                # Try to create a resident user
                resident_register_data = {
                    "username": "testchatresident",
                    "email": "testchatresident@example.com",
                    "password": "password123",
                    "role": "resident",
                    "compound_id": self.compound_id,
                    "full_name": "Test Chat Resident",
                    "phone": "+1234567890",
                    "unit_number": "101"
                }
                
                register_response = self.session.post(f"{BASE_URL}/auth/register", json=resident_register_data)
                
                if register_response.status_code == 200:
                    # Now login with new resident
                    login_response = self.session.post(f"{BASE_URL}/auth/login", json={
                        "username": "testchatresident",
                        "password": "password123"
                    })
                    
                    if login_response.status_code == 200:
                        data = login_response.json()
                        self.resident_token = data["access_token"]
                        self.resident_user = data["user"]
                        self.log_result("Resident Login", True, "Resident created and authenticated successfully")
                    else:
                        self.log_result("Resident Login", False, f"Failed to login after registration: {login_response.status_code}")
                        return False
                else:
                    self.log_result("Resident Login", False, f"Failed to register resident: {register_response.status_code}")
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
            
            if response.status_code == 401:
                self.log_result("Unauthorized Access", True, "Correctly rejected request without token")
            else:
                self.log_result("Unauthorized Access", False, f"Expected 401, got {response.status_code}")
                return False
            
            # Test with invalid token
            invalid_headers = {"Authorization": "Bearer invalid_token"}
            response = self.session.get(f"{BASE_URL}/chats", headers=invalid_headers)
            
            if response.status_code == 401:
                self.log_result("Invalid Token Access", True, "Correctly rejected request with invalid token")
                return True
            else:
                self.log_result("Invalid Token Access", False, f"Expected 401, got {response.status_code}")
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
        
        try:
            # Test WebSocket connection
            uri = f"{WS_URL}/{self.admin_user['id']}"
            
            async with websockets.connect(uri) as websocket:
                # Send a test message
                test_message = "Hello WebSocket!"
                await websocket.send(test_message)
                
                # Wait for response
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                
                if f"Echo: {test_message}" in response:
                    self.log_result("WebSocket Connection", True, "WebSocket connection and echo working correctly")
                    return True
                else:
                    self.log_result("WebSocket Connection", False, f"Unexpected response: {response}")
                    return False
                    
        except asyncio.TimeoutError:
            self.log_result("WebSocket Connection", False, "WebSocket connection timeout")
            return False
        except Exception as e:
            self.log_result("WebSocket Connection", False, f"Exception occurred: {str(e)}")
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