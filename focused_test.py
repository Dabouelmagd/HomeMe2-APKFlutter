#!/usr/bin/env python3
"""
Focused test for File Gallery and Message Scheduling APIs
"""

import requests
import json
import uuid
import io
from datetime import datetime, timedelta
from PIL import Image

# Configuration
BASE_URL = "https://homeme-portal-1.preview.emergentagent.com/api"

class FocusedTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.admin_user = None
        self.test_chat_id = None
        self.scheduled_message_id = None
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
    
    def setup_auth_headers(self, token: str):
        """Setup authorization headers"""
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def authenticate(self):
        """Authenticate and setup test environment"""
        try:
            # Login as admin
            admin_login_data = {
                "username": "johndoe",
                "password": "password123"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=admin_login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                self.admin_user = data["user"]
                print(f"✅ Authenticated as admin: {self.admin_user['full_name']}")
                
                # Get existing chats
                headers = self.setup_auth_headers(self.admin_token)
                chats_response = self.session.get(f"{BASE_URL}/chats", headers=headers)
                
                if chats_response.status_code == 200:
                    chats = chats_response.json().get("chats", [])
                    if chats:
                        self.test_chat_id = chats[0]["id"]
                        print(f"✅ Using existing chat: {self.test_chat_id}")
                    else:
                        print("❌ No existing chats found")
                        return False
                else:
                    print(f"❌ Failed to get chats: {chats_response.status_code}")
                    return False
                
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False
    
    def create_test_image(self, filename: str = "test_image.jpg", size: tuple = (100, 100)) -> bytes:
        """Create a test image file in memory"""
        img = Image.new('RGB', size, color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes.getvalue()
    
    def test_file_gallery_with_data(self):
        """Test file gallery after uploading some test files"""
        print("\n=== Testing File Gallery with Test Data ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Upload a test file first
            image_data = self.create_test_image("gallery_test.jpg")
            files = {'files': ('gallery_test.jpg', image_data, 'image/jpeg')}
            data = {'content': 'Test file for gallery', 'message_type': 'image'}
            
            upload_response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/upload",
                files=files, data=data, headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            
            if upload_response.status_code == 200:
                print("✅ Test file uploaded successfully")
                
                # Now test gallery
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
                        self.log_result("File Gallery with Data", True, f"Retrieved {len(files)} files from gallery")
                        return True
                    else:
                        self.log_result("File Gallery with Data", False, f"Invalid response structure: {data}")
                        return False
                else:
                    self.log_result("File Gallery with Data", False, f"Failed with status {response.status_code}", response.text)
                    return False
            else:
                self.log_result("File Gallery with Data", False, f"Failed to upload test file: {upload_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("File Gallery with Data", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_file_gallery_stats(self):
        """Test file gallery statistics"""
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
    
    def test_schedule_message(self):
        """Test message scheduling"""
        print("\n=== Testing Message Scheduling ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Schedule a message for 1 hour from now
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
                    self.log_result("Schedule Message", True, f"Message scheduled successfully with ID: {self.scheduled_message_id}")
                    return True
                else:
                    self.log_result("Schedule Message", False, "No scheduled message data in response")
                    return False
            else:
                self.log_result("Schedule Message", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Schedule Message", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_scheduled_messages(self):
        """Test retrieving scheduled messages"""
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
        """Test updating scheduled message"""
        print("\n=== Testing Update Scheduled Message ===")
        
        if not self.scheduled_message_id:
            self.log_result("Update Scheduled Message", False, "No scheduled message ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Update the scheduled message
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
        """Test deleting scheduled message"""
        print("\n=== Testing Delete Scheduled Message ===")
        
        if not self.scheduled_message_id:
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
    
    def run_focused_tests(self):
        """Run focused tests for File Gallery and Message Scheduling"""
        print("🎯 Starting Focused Test Suite - File Gallery & Message Scheduling")
        print("=" * 70)
        
        if not self.authenticate():
            print("\n❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run tests
        test_methods = [
            self.test_file_gallery_with_data,
            self.test_file_gallery_stats,
            self.test_schedule_message,
            self.test_get_scheduled_messages,
            self.test_update_scheduled_message,
            self.test_delete_scheduled_message,
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                self.log_result(test_method.__name__, False, f"Unexpected error: {str(e)}")
        
        # Print summary
        self.print_summary()
        
        return True
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 50)
        print("📊 FOCUSED TEST RESULTS SUMMARY")
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
    test_suite = FocusedTestSuite()
    test_suite.run_focused_tests()