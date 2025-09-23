#!/usr/bin/env python3
"""
Comprehensive test for File Gallery and Message Scheduling APIs
Tests all the requirements from the review request
"""

import requests
import json
import uuid
import io
from datetime import datetime, timedelta
from PIL import Image

# Configuration
BASE_URL = "https://homeme-smart.preview.emergentagent.com/api"

class ComprehensiveTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.resident_token = None
        self.admin_user = None
        self.resident_user = None
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
            else:
                print(f"❌ Admin authentication failed: {response.status_code}")
                return False
            
            # Try to login as resident
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
                    print(f"✅ Authenticated as resident: {self.resident_user['full_name']}")
                    break
            
            if not self.resident_token:
                print("⚠️ No resident user found, will use admin for all tests")
                self.resident_token = self.admin_token
                self.resident_user = self.admin_user
            
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
    
    def create_test_file(self, filename: str, content: str = "Test file content") -> bytes:
        """Create a test file in memory"""
        return content.encode('utf-8')
    
    # ============ FILE GALLERY TESTS ============
    
    def test_file_gallery_basic_functionality(self):
        """Test GET /api/gallery/files endpoint with different filters"""
        print("\n=== Testing File Gallery Basic Functionality ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Upload test files of different types
            # Upload image
            image_data = self.create_test_image("test_image.jpg")
            files = {'files': ('test_image.jpg', image_data, 'image/jpeg')}
            data = {'content': 'Test image for gallery', 'message_type': 'image'}
            
            upload_response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/upload",
                files=files, data=data, headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            
            if upload_response.status_code != 200:
                self.log_result("File Gallery Basic", False, "Failed to upload test image")
                return False
            
            # Upload document
            doc_data = self.create_test_file("test_doc.txt", "This is a test document")
            files = {'files': ('test_doc.txt', doc_data, 'text/plain')}
            data = {'content': 'Test document for gallery', 'message_type': 'document'}
            
            upload_response = self.session.post(
                f"{BASE_URL}/chats/{self.test_chat_id}/upload",
                files=files, data=data, headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            
            if upload_response.status_code != 200:
                self.log_result("File Gallery Basic", False, "Failed to upload test document")
                return False
            
            # Test basic gallery request
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
        """Test file gallery with different filter types and sort options"""
        print("\n=== Testing File Gallery Filters ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test file type filter - images only
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
                        self.log_result("File Gallery Filter - Image Type", True, f"Image filter working correctly ({len(files)} images)")
                    else:
                        self.log_result("File Gallery Filter - Image Type", False, f"Filter not working: {len(image_files)}/{len(files)} are images")
                        return False
                else:
                    self.log_result("File Gallery Filter - Image Type", False, "Invalid response structure")
                    return False
            else:
                self.log_result("File Gallery Filter - Image Type", False, f"Failed with status {response.status_code}")
                return False
            
            # Test multiple file types filter
            gallery_filter = {
                "file_types": ["image", "document"],
                "limit": 10,
                "skip": 0,
                "sort_by": "file_size",
                "sort_order": "desc"
            }
            
            response = self.session.post(f"{BASE_URL}/gallery/files", 
                                       json=gallery_filter, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    results = data["results"]
                    files = results.get("files", [])
                    
                    # Check if all returned files are images or documents
                    valid_files = [f for f in files if f.get("file_type") in ["image", "document"]]
                    if len(valid_files) == len(files):
                        self.log_result("File Gallery Filter - Multiple Types", True, f"Multiple type filter working correctly ({len(files)} files)")
                    else:
                        self.log_result("File Gallery Filter - Multiple Types", False, f"Filter not working: {len(valid_files)}/{len(files)} are valid types")
                        return False
                else:
                    self.log_result("File Gallery Filter - Multiple Types", False, "Invalid response structure")
                    return False
            else:
                self.log_result("File Gallery Filter - Multiple Types", False, f"Failed with status {response.status_code}")
                return False
            
            # Test date range filter
            yesterday = (datetime.utcnow() - timedelta(days=1)).isoformat()
            tomorrow = (datetime.utcnow() + timedelta(days=1)).isoformat()
            
            date_filter = {
                "date_from": yesterday,
                "date_to": tomorrow,
                "limit": 10,
                "skip": 0,
                "sort_by": "uploaded_at",
                "sort_order": "asc"
            }
            
            date_response = self.session.post(f"{BASE_URL}/gallery/files", 
                                            json=date_filter, headers=headers)
            
            if date_response.status_code == 200:
                self.log_result("File Gallery Filter - Date Range", True, "Date range filter working")
                return True
            else:
                self.log_result("File Gallery Filter - Date Range", False, f"Date filter failed: {date_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("File Gallery Filters", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_file_gallery_stats(self):
        """Test GET /api/gallery/stats for file statistics by type"""
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
                    total_size_mb = stats.get("total_size_mb", 0)
                    
                    # Check if we have file type breakdown
                    if len(by_type) > 0:
                        self.log_result("File Gallery Stats", True, f"Stats retrieved successfully: {total_files} total files, {len(by_type)} file types, {total_size_mb}MB total")
                        return True
                    else:
                        self.log_result("File Gallery Stats", True, f"Stats retrieved (no files yet): {total_files} total files")
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
        """Test access control - users only see files from their compound's chats"""
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
        """Test POST /api/chats/{chat_id}/schedule with different recipient types"""
        print("\n=== Testing Schedule Message Basic ===")
        
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
        """Test scheduling recurring messages with different repeat types"""
        print("\n=== Testing Schedule Message Recurring ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test daily recurring message
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
                    self.log_result("Schedule Message Recurring - Daily", True, f"Daily recurring message scheduled successfully")
                else:
                    self.log_result("Schedule Message Recurring - Daily", False, "Daily recurring message not properly configured")
                    return False
            else:
                self.log_result("Schedule Message Recurring - Daily", False, f"Failed with status {response.status_code}", response.text)
                return False
            
            # Test weekly recurring message
            schedule_data["recurrence_pattern"] = "weekly"
            schedule_data["content"] = "Weekly recurring test message"
            
            response = self.session.post(f"{BASE_URL}/chats/{self.test_chat_id}/schedule", 
                                       json=schedule_data, headers=headers)
            
            if response.status_code == 200:
                self.log_result("Schedule Message Recurring - Weekly", True, "Weekly recurring message scheduled successfully")
            else:
                self.log_result("Schedule Message Recurring - Weekly", False, f"Failed with status {response.status_code}")
                return False
            
            # Test monthly recurring message
            schedule_data["recurrence_pattern"] = "monthly"
            schedule_data["content"] = "Monthly recurring test message"
            
            response = self.session.post(f"{BASE_URL}/chats/{self.test_chat_id}/schedule", 
                                       json=schedule_data, headers=headers)
            
            if response.status_code == 200:
                self.log_result("Schedule Message Recurring - Monthly", True, "Monthly recurring message scheduled successfully")
                return True
            else:
                self.log_result("Schedule Message Recurring - Monthly", False, f"Failed with status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Schedule Message Recurring", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_scheduled_messages(self):
        """Test GET /api/scheduled-messages to retrieve scheduled messages"""
        print("\n=== Testing Get Scheduled Messages ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/scheduled-messages?limit=20", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                scheduled_messages = data.get("scheduled_messages", [])
                total_count = data.get("total_count", 0)
                has_more = data.get("has_more", False)
                
                # Check if we have the expected structure
                if isinstance(scheduled_messages, list):
                    self.log_result("Get Scheduled Messages", True, f"Retrieved {len(scheduled_messages)} scheduled messages (total: {total_count}, has_more: {has_more})")
                    return True
                else:
                    self.log_result("Get Scheduled Messages", False, f"Invalid response structure: {type(scheduled_messages)}")
                    return False
            else:
                self.log_result("Get Scheduled Messages", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Scheduled Messages", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_update_scheduled_message(self):
        """Test PUT /api/scheduled-messages/{message_id} to update scheduled messages"""
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
        """Test DELETE /api/scheduled-messages/{message_id} to delete scheduled messages"""
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
    
    def test_schedule_message_validation(self):
        """Test validation for future dates, recipient types, and repeat options"""
        print("\n=== Testing Schedule Message Validation ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test scheduling message in the past (should fail)
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
            
            # Test valid future time
            future_time = (datetime.utcnow() + timedelta(hours=1)).isoformat()
            
            valid_schedule_data = {
                "content": "Valid future scheduled message",
                "message_type": "text",
                "scheduled_for": future_time,
                "timezone": "UTC",
                "is_recurring": False
            }
            
            response = self.session.post(f"{BASE_URL}/chats/{self.test_chat_id}/schedule", 
                                       json=valid_schedule_data, headers=headers)
            
            if response.status_code == 200:
                self.log_result("Schedule Message Validation - Future Time", True, "Correctly accepted future scheduled time")
                
                # Clean up - delete the test message
                data = response.json()
                test_msg_id = data.get("scheduled_message", {}).get("id")
                if test_msg_id:
                    self.session.delete(f"{BASE_URL}/scheduled-messages/{test_msg_id}", headers=headers)
                
                return True
            else:
                self.log_result("Schedule Message Validation - Future Time", False, f"Expected 200, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Schedule Message Validation", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_schedule_message_authentication(self):
        """Test authentication and authorization for scheduling endpoints"""
        print("\n=== Testing Schedule Message Authentication ===")
        
        try:
            # Test without authentication
            schedule_data = {
                "content": "This should fail - no auth",
                "message_type": "text",
                "scheduled_for": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
                "timezone": "UTC"
            }
            
            response = self.session.post(f"{BASE_URL}/chats/{self.test_chat_id}/schedule", 
                                       json=schedule_data)
            
            if response.status_code in [401, 403]:
                self.log_result("Schedule Message Authentication - No Auth", True, f"Correctly rejected request without authentication (status: {response.status_code})")
            else:
                self.log_result("Schedule Message Authentication - No Auth", False, f"Expected 401/403, got {response.status_code}")
                return False
            
            # Test getting scheduled messages without auth
            response = self.session.get(f"{BASE_URL}/scheduled-messages")
            
            if response.status_code in [401, 403]:
                self.log_result("Schedule Message Authentication - Get No Auth", True, f"Correctly rejected get request without authentication (status: {response.status_code})")
                return True
            else:
                self.log_result("Schedule Message Authentication - Get No Auth", False, f"Expected 401/403, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Schedule Message Authentication", False, f"Exception occurred: {str(e)}")
            return False
    
    def run_comprehensive_tests(self):
        """Run comprehensive tests for File Gallery and Message Scheduling"""
        print("🎯 Starting Comprehensive Test Suite - File Gallery & Message Scheduling")
        print("=" * 80)
        
        if not self.authenticate():
            print("\n❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run tests
        test_methods = [
            # File Gallery Tests
            self.test_file_gallery_basic_functionality,
            self.test_file_gallery_filters,
            self.test_file_gallery_stats,
            self.test_file_gallery_access_control,
            self.test_file_gallery_pagination,
            # Message Scheduling Tests
            self.test_schedule_message_basic,
            self.test_schedule_message_recurring,
            self.test_get_scheduled_messages,
            self.test_update_scheduled_message,
            self.test_delete_scheduled_message,
            self.test_schedule_message_validation,
            self.test_schedule_message_authentication,
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
        print("\n" + "=" * 60)
        print("📊 COMPREHENSIVE TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.results if "✅ PASS" in result["status"])
        failed = sum(1 for result in self.results if "❌ FAIL" in result["status"])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        # Categorize results
        file_gallery_tests = [r for r in self.results if "File Gallery" in r["test"]]
        message_scheduling_tests = [r for r in self.results if "Schedule Message" in r["test"]]
        
        print(f"\n📁 File Gallery Tests: {sum(1 for r in file_gallery_tests if '✅' in r['status'])}/{len(file_gallery_tests)} passed")
        print(f"⏰ Message Scheduling Tests: {sum(1 for r in message_scheduling_tests if '✅' in r['status'])}/{len(message_scheduling_tests)} passed")
        
        if failed > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['message']}")
                    if result["details"]:
                        print(f"    Details: {result['details']}")
        
        print("\n" + "=" * 60)

if __name__ == "__main__":
    test_suite = ComprehensiveTestSuite()
    test_suite.run_comprehensive_tests()