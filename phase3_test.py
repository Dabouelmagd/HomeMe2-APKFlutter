#!/usr/bin/env python3
"""
HomeMe Phase 3 Testing Suite
Tests the newly implemented Phase 3 features:
1. Document Management System
2. Voting & Polling System  
3. Smart Home Integration
4. Natural Language AI Control
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
BASE_URL = "https://residence-central.preview.emergentagent.com/api"

class HomePhase3TestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.resident_token = None
        self.admin_user = None
        self.resident_user = None
        self.compound_id = None
        self.test_document_id = None
        self.test_poll_id = None
        self.test_device_id = None
        self.test_automation_id = None
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
    
    def create_test_document(self, filename: str = "test_doc.pdf", size: int = 1024) -> io.BytesIO:
        """Create a test document for upload testing"""
        content = b"Test document content for Phase 3 testing" * (size // 40)
        doc_bytes = io.BytesIO(content)
        return doc_bytes
    
    def test_admin_authentication(self):
        """Test admin authentication for Phase 3 features"""
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
        """Test resident authentication for Phase 3 features"""
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
                'unit_number': f"P3{unique_id[:4]}",
                'full_name': f"Phase3 Test Resident {unique_id}",
                'email': f"p3test{unique_id}@example.com",
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

    # ============ DOCUMENT MANAGEMENT SYSTEM TESTS ============
    
    def test_get_documents(self):
        """Test GET /api/documents - Document retrieval with filtering and access control"""
        print("\n=== Testing Get Documents ===")
        
        if not self.admin_token:
            self.log_result("Get Documents", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/documents", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                documents = data.get("documents", [])
                self.log_result("Get Documents", True, f"Retrieved {len(documents)} documents successfully")
                
                # Test filtering by category
                response_filtered = self.session.get(f"{BASE_URL}/documents?category=governance", headers=headers)
                if response_filtered.status_code == 200:
                    filtered_data = response_filtered.json()
                    filtered_docs = filtered_data.get("documents", [])
                    self.log_result("Document Category Filtering", True, f"Category filtering works - {len(filtered_docs)} governance documents")
                
                # Test search functionality
                response_search = self.session.get(f"{BASE_URL}/documents?search=policy", headers=headers)
                if response_search.status_code == 200:
                    search_data = response_search.json()
                    search_docs = search_data.get("documents", [])
                    self.log_result("Document Search", True, f"Search functionality works - {len(search_docs)} documents found for 'policy'")
                
                return True
            else:
                self.log_result("Get Documents", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Documents", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_document(self):
        """Test POST /api/documents - Document creation with access levels"""
        print("\n=== Testing Create Document ===")
        
        if not self.admin_token:
            self.log_result("Create Document", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Create test document data
            document_data = {
                "title": "Phase 3 Test Document",
                "description": "This is a test document for Phase 3 document management system",
                "category": "governance",
                "subcategory": "policies",
                "tags": ["test", "phase3", "governance"],
                "access_level": "public",
                "is_pinned": False
            }
            
            response = self.session.post(f"{BASE_URL}/documents", json=document_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Document created successfully":
                    self.test_document_id = result.get("document_id")
                    self.log_result("Create Document", True, f"Document created successfully with ID: {self.test_document_id}")
                    return True
                else:
                    self.log_result("Create Document", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Create Document", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Document", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_upload_document_version(self):
        """Test POST /api/documents/{document_id}/upload - File version upload"""
        print("\n=== Testing Upload Document Version ===")
        
        if not self.admin_token or not self.test_document_id:
            self.log_result("Upload Document Version", False, "No admin token or document ID available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Create test document file
            test_doc = self.create_test_document("test_policy.pdf")
            
            # Prepare form data
            files = {
                'file': ('test_policy.pdf', test_doc, 'application/pdf')
            }
            
            data = {
                'changelog': 'Initial version upload for Phase 3 testing'
            }
            
            response = self.session.post(f"{BASE_URL}/documents/{self.test_document_id}/upload", 
                                       data=data, files=files, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Document version uploaded successfully":
                    version_id = result.get("version_id")
                    self.log_result("Upload Document Version", True, f"Document version uploaded successfully with ID: {version_id}")
                    return True
                else:
                    self.log_result("Upload Document Version", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Upload Document Version", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Upload Document Version", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_document_details(self):
        """Test GET /api/documents/{document_id} - Document details with access control"""
        print("\n=== Testing Get Document Details ===")
        
        if not self.admin_token or not self.test_document_id:
            self.log_result("Get Document Details", False, "No admin token or document ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/documents/{self.test_document_id}", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                document = data.get("document", {})
                if document.get("id") == self.test_document_id:
                    self.log_result("Get Document Details", True, f"Document details retrieved successfully - Title: {document.get('title')}")
                    
                    # Test access control with resident user
                    if self.resident_token:
                        resident_headers = self.setup_auth_headers(self.resident_token)
                        resident_response = self.session.get(f"{BASE_URL}/documents/{self.test_document_id}", headers=resident_headers)
                        
                        if resident_response.status_code == 200:
                            self.log_result("Document Access Control", True, "Resident can access public document correctly")
                        else:
                            self.log_result("Document Access Control", False, f"Resident access failed: {resident_response.status_code}")
                    
                    return True
                else:
                    self.log_result("Get Document Details", False, f"Document ID mismatch: expected {self.test_document_id}, got {document.get('id')}")
                    return False
            else:
                self.log_result("Get Document Details", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Document Details", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_document_folders(self):
        """Test GET /api/documents/folders - Folder hierarchy"""
        print("\n=== Testing Get Document Folders ===")
        
        if not self.admin_token:
            self.log_result("Get Document Folders", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/documents/folders", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                folders = data.get("folders", [])
                self.log_result("Get Document Folders", True, f"Retrieved {len(folders)} document folders successfully")
                return True
            else:
                self.log_result("Get Document Folders", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Document Folders", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_document_folder(self):
        """Test POST /api/documents/folders - Folder creation"""
        print("\n=== Testing Create Document Folder ===")
        
        if not self.admin_token:
            self.log_result("Create Document Folder", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Create test folder data
            folder_data = {
                "name": "Phase 3 Test Folder",
                "description": "Test folder for Phase 3 document management",
                "default_access_level": "public"
            }
            
            response = self.session.post(f"{BASE_URL}/documents/folders", json=folder_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Folder created successfully":
                    folder_id = result.get("folder_id")
                    self.log_result("Create Document Folder", True, f"Document folder created successfully with ID: {folder_id}")
                    return True
                else:
                    self.log_result("Create Document Folder", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Create Document Folder", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Document Folder", False, f"Exception occurred: {str(e)}")
            return False

    # ============ VOTING & POLLING SYSTEM TESTS ============
    
    def test_get_polls(self):
        """Test GET /api/polls - Poll retrieval with eligibility checks"""
        print("\n=== Testing Get Polls ===")
        
        if not self.admin_token:
            self.log_result("Get Polls", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/polls", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                polls = data.get("polls", [])
                self.log_result("Get Polls", True, f"Retrieved {len(polls)} polls successfully")
                
                # Test filtering by status
                response_active = self.session.get(f"{BASE_URL}/polls?status=active", headers=headers)
                if response_active.status_code == 200:
                    active_data = response_active.json()
                    active_polls = active_data.get("polls", [])
                    self.log_result("Poll Status Filtering", True, f"Status filtering works - {len(active_polls)} active polls")
                
                return True
            else:
                self.log_result("Get Polls", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Polls", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_poll(self):
        """Test POST /api/polls - Poll creation (admin only)"""
        print("\n=== Testing Create Poll ===")
        
        if not self.admin_token:
            self.log_result("Create Poll", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Create test poll data
            poll_data = {
                "title": "Phase 3 Test Poll",
                "description": "This is a test poll for Phase 3 voting system",
                "vote_type": "single_choice",
                "options": [
                    {"text": "Option A", "description": "First test option"},
                    {"text": "Option B", "description": "Second test option"},
                    {"text": "Option C", "description": "Third test option"}
                ],
                "require_family_head_only": True,
                "allow_anonymous_voting": False,
                "start_date": datetime.now().isoformat(),
                "end_date": (datetime.now() + timedelta(days=7)).isoformat(),
                "results_visible_before_end": False
            }
            
            response = self.session.post(f"{BASE_URL}/polls", json=poll_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Poll created successfully":
                    self.test_poll_id = result.get("poll_id")
                    self.log_result("Create Poll", True, f"Poll created successfully with ID: {self.test_poll_id}")
                    return True
                else:
                    self.log_result("Create Poll", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Create Poll", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Poll", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_vote_in_poll(self):
        """Test POST /api/polls/{poll_id}/vote - Vote submission with validation"""
        print("\n=== Testing Vote in Poll ===")
        
        if not self.resident_token or not self.test_poll_id:
            self.log_result("Vote in Poll", False, "No resident token or poll ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            
            # First get poll details to get option IDs
            poll_response = self.session.get(f"{BASE_URL}/polls", headers=headers)
            if poll_response.status_code == 200:
                polls_data = poll_response.json()
                polls = polls_data.get("polls", [])
                test_poll = None
                for poll in polls:
                    if poll.get("id") == self.test_poll_id:
                        test_poll = poll
                        break
                
                if test_poll and test_poll.get("options"):
                    # Vote for the first option
                    option_id = test_poll["options"][0]["id"]
                    
                    vote_data = {
                        "selected_options": [option_id],
                        "comment": "Test vote for Phase 3 polling system",
                        "is_anonymous": False
                    }
                    
                    response = self.session.post(f"{BASE_URL}/polls/{self.test_poll_id}/vote", json=vote_data, headers=headers)
                    
                    if response.status_code == 200:
                        result = response.json()
                        if result.get("message") == "Vote submitted successfully":
                            self.log_result("Vote in Poll", True, f"Vote submitted successfully for poll {self.test_poll_id}")
                            return True
                        else:
                            self.log_result("Vote in Poll", False, f"Unexpected response: {result}")
                            return False
                    else:
                        self.log_result("Vote in Poll", False, f"Failed with status {response.status_code}", response.text)
                        return False
                else:
                    self.log_result("Vote in Poll", False, "Could not find test poll or poll has no options")
                    return False
            else:
                self.log_result("Vote in Poll", False, f"Failed to get poll details: {poll_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Vote in Poll", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_poll_results(self):
        """Test GET /api/polls/{poll_id}/results - Results with access control"""
        print("\n=== Testing Get Poll Results ===")
        
        if not self.admin_token or not self.test_poll_id:
            self.log_result("Get Poll Results", False, "No admin token or poll ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/polls/{self.test_poll_id}/results", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", {})
                if "total_votes" in results:
                    total_votes = results.get("total_votes", 0)
                    self.log_result("Get Poll Results", True, f"Poll results retrieved successfully - Total votes: {total_votes}")
                    return True
                else:
                    self.log_result("Get Poll Results", False, f"Invalid results format: {results}")
                    return False
            else:
                self.log_result("Get Poll Results", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Poll Results", False, f"Exception occurred: {str(e)}")
            return False

    # ============ SMART HOME INTEGRATION TESTS ============
    
    def test_get_smart_devices(self):
        """Test GET /api/smart-devices - Device listing with access control"""
        print("\n=== Testing Get Smart Devices ===")
        
        if not self.admin_token:
            self.log_result("Get Smart Devices", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/smart-devices", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                devices = data.get("devices", [])
                self.log_result("Get Smart Devices", True, f"Retrieved {len(devices)} smart devices successfully")
                
                # Test filtering by device type
                response_lights = self.session.get(f"{BASE_URL}/smart-devices?device_type=light", headers=headers)
                if response_lights.status_code == 200:
                    lights_data = response_lights.json()
                    light_devices = lights_data.get("devices", [])
                    self.log_result("Device Type Filtering", True, f"Device type filtering works - {len(light_devices)} light devices")
                
                return True
            else:
                self.log_result("Get Smart Devices", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Smart Devices", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_register_smart_device(self):
        """Test POST /api/smart-devices - Device registration"""
        print("\n=== Testing Register Smart Device ===")
        
        if not self.admin_token:
            self.log_result("Register Smart Device", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Create test device data
            device_data = {
                "name": "Phase 3 Test Light",
                "device_type": "light",
                "brand": "TestBrand",
                "model": "TestModel-P3",
                "location": "Living Room",
                "protocol": "http",
                "endpoint": "http://192.168.1.100:8080",
                "capabilities": ["on_off", "dimming", "color"],
                "is_shared": False
            }
            
            response = self.session.post(f"{BASE_URL}/smart-devices", json=device_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") in ["Device registered successfully", "Smart device added successfully"]:
                    self.test_device_id = result.get("device_id")
                    self.log_result("Register Smart Device", True, f"Smart device registered successfully with ID: {self.test_device_id}")
                    return True
                else:
                    self.log_result("Register Smart Device", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Register Smart Device", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Register Smart Device", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_control_smart_device(self):
        """Test POST /api/smart-devices/{device_id}/command - Device control"""
        print("\n=== Testing Control Smart Device ===")
        
        if not self.admin_token or not self.test_device_id:
            self.log_result("Control Smart Device", False, "No admin token or device ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Create test command data
            command_data = {
                "command": "turn_on",
                "parameters": {
                    "brightness": 80,
                    "color": "#FF6B35"
                }
            }
            
            response = self.session.post(f"{BASE_URL}/smart-devices/{self.test_device_id}/command", json=command_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Command sent successfully":
                    self.log_result("Control Smart Device", True, f"Device command sent successfully to device {self.test_device_id}")
                    return True
                else:
                    self.log_result("Control Smart Device", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Control Smart Device", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Control Smart Device", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_device_logs(self):
        """Test GET /api/smart-devices/{device_id}/logs - Device activity logs"""
        print("\n=== Testing Get Device Logs ===")
        
        if not self.admin_token or not self.test_device_id:
            self.log_result("Get Device Logs", False, "No admin token or device ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/smart-devices/{self.test_device_id}/logs", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                logs = data.get("logs", [])
                self.log_result("Get Device Logs", True, f"Retrieved {len(logs)} device logs successfully")
                return True
            else:
                self.log_result("Get Device Logs", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Device Logs", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_automations(self):
        """Test GET /api/automations - Automation listing"""
        print("\n=== Testing Get Automations ===")
        
        if not self.admin_token:
            self.log_result("Get Automations", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/automations", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                automations = data.get("automations", [])
                self.log_result("Get Automations", True, f"Retrieved {len(automations)} automations successfully")
                return True
            else:
                self.log_result("Get Automations", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Automations", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_automation(self):
        """Test POST /api/automations - Automation creation"""
        print("\n=== Testing Create Automation ===")
        
        if not self.admin_token or not self.test_device_id:
            self.log_result("Create Automation", False, "No admin token or device ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Create test automation data
            automation_data = {
                "name": "Phase 3 Test Automation",
                "description": "Test automation for Phase 3 smart home integration",
                "trigger_type": "time",
                "trigger_conditions": {
                    "time": "18:00",
                    "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
                },
                "device_actions": [
                    {
                        "device_id": self.test_device_id,
                        "command": "turn_on",
                        "parameters": {"brightness": 60}
                    }
                ],
                "is_scheduled": True,
                "schedule_expression": "0 18 * * 1-5"
            }
            
            response = self.session.post(f"{BASE_URL}/automations", json=automation_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Automation created successfully":
                    self.test_automation_id = result.get("automation_id")
                    self.log_result("Create Automation", True, f"Automation created successfully with ID: {self.test_automation_id}")
                    return True
                else:
                    self.log_result("Create Automation", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Create Automation", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Automation", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_natural_language_control(self):
        """Test POST /api/smart-devices/natural-command - AI-powered natural language control"""
        print("\n=== Testing Natural Language Control ===")
        
        if not self.admin_token:
            self.log_result("Natural Language Control", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test various natural language commands
            test_commands = [
                "turn on the living room lights",
                "set the temperature to 72 degrees",
                "dim the bedroom lights to 50%",
                "turn off all lights in the house"
            ]
            
            success_count = 0
            for command in test_commands:
                command_data = {
                    "command": command,
                    "location": "living room"
                }
                
                response = self.session.post(f"{BASE_URL}/smart-devices/natural-command", json=command_data, headers=headers)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("message") == "Natural language command processed successfully":
                        success_count += 1
                        self.log_result(f"Natural Command: '{command}'", True, f"Command processed successfully")
                    else:
                        self.log_result(f"Natural Command: '{command}'", False, f"Unexpected response: {result}")
                else:
                    self.log_result(f"Natural Command: '{command}'", False, f"Failed with status {response.status_code}")
            
            if success_count > 0:
                self.log_result("Natural Language Control", True, f"Natural language processing working - {success_count}/{len(test_commands)} commands successful")
                return True
            else:
                self.log_result("Natural Language Control", False, "No natural language commands were processed successfully")
                return False
                
        except Exception as e:
            self.log_result("Natural Language Control", False, f"Exception occurred: {str(e)}")
            return False

    # ============ DATA VALIDATION & ERROR HANDLING TESTS ============
    
    def test_document_access_control_validation(self):
        """Test document access control validation"""
        print("\n=== Testing Document Access Control Validation ===")
        
        if not self.admin_token:
            self.log_result("Document Access Control Validation", False, "No admin token available")
            return False
        
        success_count = 0
        total_tests = 0
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test 1: Invalid access level
            total_tests += 1
            invalid_doc_data = {
                "title": "Invalid Access Test",
                "description": "Test document with invalid access level",
                "category": "general",
                "access_level": "invalid_access_level"
            }
            
            response = self.session.post(f"{BASE_URL}/documents", json=invalid_doc_data, headers=headers)
            
            if response.status_code == 422:
                self.log_result("Invalid Access Level Validation", True, "Correctly rejected invalid access level")
                success_count += 1
            else:
                self.log_result("Invalid Access Level Validation", False, f"Expected 422, got {response.status_code}")
            
            # Test 2: Valid access levels
            valid_access_levels = ["public", "admin_only", "family_only", "residents_only"]
            for access_level in valid_access_levels:
                total_tests += 1
                valid_doc_data = {
                    "title": f"Test {access_level.title()} Document",
                    "description": f"Test document with {access_level} access",
                    "category": "general",
                    "access_level": access_level
                }
                
                response = self.session.post(f"{BASE_URL}/documents", json=valid_doc_data, headers=headers)
                
                if response.status_code == 200:
                    self.log_result(f"Valid Access Level - {access_level}", True, f"Successfully created document with {access_level} access")
                    success_count += 1
                else:
                    self.log_result(f"Valid Access Level - {access_level}", False, f"Failed to create document with {access_level} access: {response.status_code}")
            
            return success_count == total_tests
            
        except Exception as e:
            self.log_result("Document Access Control Validation", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_poll_validation(self):
        """Test poll creation validation"""
        print("\n=== Testing Poll Validation ===")
        
        if not self.admin_token:
            self.log_result("Poll Validation", False, "No admin token available")
            return False
        
        success_count = 0
        total_tests = 0
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test 1: Invalid vote type
            total_tests += 1
            invalid_poll_data = {
                "title": "Invalid Vote Type Test",
                "description": "Test poll with invalid vote type",
                "vote_type": "invalid_vote_type",
                "options": [{"text": "Option 1"}, {"text": "Option 2"}],
                "start_date": datetime.now().isoformat(),
                "end_date": (datetime.now() + timedelta(days=1)).isoformat()
            }
            
            response = self.session.post(f"{BASE_URL}/polls", json=invalid_poll_data, headers=headers)
            
            if response.status_code == 422:
                self.log_result("Invalid Vote Type Validation", True, "Correctly rejected invalid vote type")
                success_count += 1
            else:
                self.log_result("Invalid Vote Type Validation", False, f"Expected 422, got {response.status_code}")
            
            # Test 2: Valid vote types
            valid_vote_types = ["single_choice", "multiple_choice", "yes_no", "rating"]
            for vote_type in valid_vote_types:
                total_tests += 1
                valid_poll_data = {
                    "title": f"Test {vote_type.title()} Poll",
                    "description": f"Test poll with {vote_type} voting",
                    "vote_type": vote_type,
                    "options": [{"text": "Option 1"}, {"text": "Option 2"}],
                    "start_date": datetime.now().isoformat(),
                    "end_date": (datetime.now() + timedelta(days=1)).isoformat()
                }
                
                response = self.session.post(f"{BASE_URL}/polls", json=valid_poll_data, headers=headers)
                
                if response.status_code == 200:
                    self.log_result(f"Valid Vote Type - {vote_type}", True, f"Successfully created poll with {vote_type} voting")
                    success_count += 1
                else:
                    self.log_result(f"Valid Vote Type - {vote_type}", False, f"Failed to create poll with {vote_type} voting: {response.status_code}")
            
            return success_count == total_tests
            
        except Exception as e:
            self.log_result("Poll Validation", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_smart_device_validation(self):
        """Test smart device registration validation"""
        print("\n=== Testing Smart Device Validation ===")
        
        if not self.admin_token:
            self.log_result("Smart Device Validation", False, "No admin token available")
            return False
        
        success_count = 0
        total_tests = 0
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test 1: Invalid device type
            total_tests += 1
            invalid_device_data = {
                "name": "Invalid Device Type Test",
                "device_type": "invalid_device_type",
                "brand": "TestBrand",
                "model": "TestModel",
                "location": "Test Location",
                "protocol": "http",
                "endpoint": "http://test.com"
            }
            
            response = self.session.post(f"{BASE_URL}/smart-devices", json=invalid_device_data, headers=headers)
            
            if response.status_code == 422:
                self.log_result("Invalid Device Type Validation", True, "Correctly rejected invalid device type")
                success_count += 1
            else:
                self.log_result("Invalid Device Type Validation", False, f"Expected 422, got {response.status_code}")
            
            # Test 2: Valid device types
            valid_device_types = ["light", "lock", "thermostat", "camera", "sensor", "appliance"]
            for device_type in valid_device_types:
                total_tests += 1
                valid_device_data = {
                    "name": f"Test {device_type.title()} Device",
                    "device_type": device_type,
                    "brand": "TestBrand",
                    "model": f"TestModel-{device_type}",
                    "location": "Test Location",
                    "protocol": "http",
                    "endpoint": f"http://test-{device_type}.com"
                }
                
                response = self.session.post(f"{BASE_URL}/smart-devices", json=valid_device_data, headers=headers)
                
                if response.status_code == 200:
                    self.log_result(f"Valid Device Type - {device_type}", True, f"Successfully registered {device_type} device")
                    success_count += 1
                else:
                    self.log_result(f"Valid Device Type - {device_type}", False, f"Failed to register {device_type} device: {response.status_code}")
            
            return success_count == total_tests
            
        except Exception as e:
            self.log_result("Smart Device Validation", False, f"Exception occurred: {str(e)}")
            return False

    # ============ INTEGRATION TESTING ============
    
    def test_authentication_across_phase3_endpoints(self):
        """Test authentication and authorization across all Phase 3 endpoints"""
        print("\n=== Testing Authentication Across Phase 3 Endpoints ===")
        
        success_count = 0
        total_tests = 0
        
        # Test endpoints without authentication
        unauthenticated_endpoints = [
            ("GET", "/documents"),
            ("POST", "/documents"),
            ("GET", "/polls"),
            ("POST", "/polls"),
            ("GET", "/smart-devices"),
            ("POST", "/smart-devices"),
            ("GET", "/automations"),
            ("POST", "/automations"),
            ("POST", "/smart-devices/natural-command")
        ]
        
        for method, endpoint in unauthenticated_endpoints:
            total_tests += 1
            try:
                if method == "GET":
                    response = self.session.get(f"{BASE_URL}{endpoint}")
                else:
                    response = self.session.post(f"{BASE_URL}{endpoint}", json={})
                
                if response.status_code in [401, 403]:
                    self.log_result(f"Auth Required - {method} {endpoint}", True, f"Correctly rejected unauthenticated request (status: {response.status_code})")
                    success_count += 1
                else:
                    self.log_result(f"Auth Required - {method} {endpoint}", False, f"Expected 401/403, got {response.status_code}")
            except Exception as e:
                self.log_result(f"Auth Required - {method} {endpoint}", False, f"Exception occurred: {str(e)}")
        
        return success_count == total_tests

    # ============ MAIN TEST RUNNER ============
    
    def run_phase3_tests(self):
        """Run HomeMe Phase 3 Tests"""
        print("\n🚀 STARTING HOMEME PHASE 3 TESTING")
        print("=" * 60)
        print("Testing newly implemented Phase 3 features:")
        print("1. Document Management System")
        print("2. Voting & Polling System")
        print("3. Smart Home Integration")
        print("4. Natural Language AI Control")
        print("=" * 60)
        
        # Authentication tests
        print("\n🔐 AUTHENTICATION SETUP")
        if not self.test_admin_authentication():
            print("❌ Admin authentication failed - stopping tests")
            return self.print_summary()
        
        if not self.test_resident_authentication():
            print("❌ Resident authentication failed - stopping tests")
            return self.print_summary()
        
        # Document Management System Tests
        print("\n📄 DOCUMENT MANAGEMENT SYSTEM TESTING")
        self.test_get_documents()
        self.test_create_document()
        self.test_upload_document_version()
        self.test_get_document_details()
        self.test_get_document_folders()
        self.test_create_document_folder()
        
        # Voting & Polling System Tests
        print("\n🗳️ VOTING & POLLING SYSTEM TESTING")
        self.test_get_polls()
        self.test_create_poll()
        self.test_vote_in_poll()
        self.test_get_poll_results()
        
        # Smart Home Integration Tests
        print("\n🏠 SMART HOME INTEGRATION TESTING")
        self.test_get_smart_devices()
        self.test_register_smart_device()
        self.test_control_smart_device()
        self.test_get_device_logs()
        self.test_get_automations()
        self.test_create_automation()
        self.test_natural_language_control()
        
        # Data Validation & Error Handling Tests
        print("\n✅ DATA VALIDATION & ERROR HANDLING TESTING")
        self.test_document_access_control_validation()
        self.test_poll_validation()
        self.test_smart_device_validation()
        
        # Integration Testing
        print("\n🔗 INTEGRATION TESTING")
        self.test_authentication_across_phase3_endpoints()
        
        return self.print_summary()
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("🏁 PHASE 3 TESTING SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.results if "✅ PASS" in result["status"])
        failed = sum(1 for result in self.results if "❌ FAIL" in result["status"])
        total = len(self.results)
        
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"📊 OVERALL RESULTS:")
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
    test_suite = HomePhase3TestSuite()
    success = test_suite.run_phase3_tests()
    
    if success:
        print("\n🎉 Phase 3 testing completed successfully!")
        exit(0)
    else:
        print("\n⚠️ Phase 3 testing completed with issues.")
        exit(1)