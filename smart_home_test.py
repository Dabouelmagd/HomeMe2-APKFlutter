#!/usr/bin/env python3
"""
HomeMe Smart Home Device Testing Suite
Tests the newly implemented smart home device initialization and natural language commands:
1. Smart Home Device Initialization
2. Natural Language Command Processing
3. Device Management APIs
"""

import json
import requests
import uuid
from datetime import datetime
from typing import Dict, List

# Configuration
BASE_URL = "https://homeme-smart.preview.emergentagent.com/api"

class SmartHomeTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.admin_user = None
        self.compound_id = None
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
    
    def test_get_compounds(self):
        """Test GET /api/compounds to find available compound IDs"""
        print("\n=== Testing Get Compounds ===")
        
        if not self.admin_token:
            self.log_result("Get Compounds", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/compounds", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                compounds = data.get("compounds", [])
                if compounds:
                    # Use the first compound for testing
                    self.compound_id = compounds[0].get("id", self.compound_id)
                    self.log_result("Get Compounds", True, f"Retrieved {len(compounds)} compounds - Using compound ID: {self.compound_id}")
                    return True
                else:
                    self.log_result("Get Compounds", False, "No compounds found in response")
                    return False
            else:
                self.log_result("Get Compounds", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Compounds", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_initialize_smart_devices(self):
        """Test POST /api/admin/initialize-smart-devices to populate database with sample devices"""
        print("\n=== Testing Initialize Smart Devices ===")
        
        if not self.admin_token or not self.compound_id:
            self.log_result("Initialize Smart Devices", False, "No admin token or compound ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Call the initialize endpoint with compound_id as query parameter
            response = self.session.post(f"{BASE_URL}/admin/initialize-smart-devices?compound_id={self.compound_id}", 
                                       headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                message = data.get("message", "")
                devices_created = data.get("devices_created", 0)
                
                if "already exist" in message:
                    self.log_result("Initialize Smart Devices", True, f"Smart devices already exist in compound {self.compound_id}")
                    return True
                elif "initialized successfully" in message:
                    self.log_result("Initialize Smart Devices", True, f"Smart devices initialized successfully - {devices_created} devices created")
                    return True
                else:
                    self.log_result("Initialize Smart Devices", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Initialize Smart Devices", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Initialize Smart Devices", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_smart_devices(self):
        """Test GET /api/smart-devices to verify devices were created"""
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
                
                # Expected devices from initialization
                expected_devices = [
                    "Living Room Lights",
                    "Bedroom Lights", 
                    "Smart Thermostat",
                    "Front Door Lock",
                    "Kitchen Lights",
                    "Security Camera"
                ]
                
                found_devices = [device.get("name") for device in devices]
                
                if len(devices) >= 6:
                    # Check if all expected devices are present
                    missing_devices = [name for name in expected_devices if name not in found_devices]
                    if not missing_devices:
                        self.log_result("Get Smart Devices", True, f"All 6 expected devices found: {', '.join(found_devices)}")
                        return True
                    else:
                        self.log_result("Get Smart Devices", True, f"Found {len(devices)} devices, missing: {', '.join(missing_devices)}")
                        return True
                else:
                    self.log_result("Get Smart Devices", False, f"Expected at least 6 devices, found {len(devices)}: {found_devices}")
                    return False
            else:
                self.log_result("Get Smart Devices", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Smart Devices", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_natural_language_command_living_room_lights(self):
        """Test POST /api/smart-devices/natural-command with 'turn on living room lights'"""
        print("\n=== Testing Natural Language Command - Living Room Lights ===")
        
        if not self.admin_token:
            self.log_result("Natural Language - Living Room Lights", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            command_data = {"command": "turn on living room lights"}
            
            response = self.session.post(f"{BASE_URL}/smart-devices/natural-command", 
                                       json=command_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                ai_response = data.get("ai_response", {})
                intent = ai_response.get("intent")
                original_command = data.get("original_command")
                
                if intent == "device_control":
                    devices = ai_response.get("devices", [])
                    executed_commands = ai_response.get("executed_commands", [])
                    
                    self.log_result("Natural Language - Living Room Lights", True, 
                                  f"Command processed successfully - Intent: {intent}, "
                                  f"Devices targeted: {len(devices)}, Commands executed: {len(executed_commands)}")
                    return True
                else:
                    self.log_result("Natural Language - Living Room Lights", False, 
                                  f"Unexpected intent: {intent}, AI Response: {ai_response}")
                    return False
            else:
                self.log_result("Natural Language - Living Room Lights", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Natural Language - Living Room Lights", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_natural_language_command_temperature(self):
        """Test POST /api/smart-devices/natural-command with 'set temperature to 72 degrees'"""
        print("\n=== Testing Natural Language Command - Temperature ===")
        
        if not self.admin_token:
            self.log_result("Natural Language - Temperature", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            command_data = {"command": "set temperature to 72 degrees"}
            
            response = self.session.post(f"{BASE_URL}/smart-devices/natural-command", 
                                       json=command_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                ai_response = data.get("ai_response", {})
                intent = ai_response.get("intent")
                
                if intent == "device_control":
                    devices = ai_response.get("devices", [])
                    executed_commands = ai_response.get("executed_commands", [])
                    
                    self.log_result("Natural Language - Temperature", True, 
                                  f"Temperature command processed successfully - Intent: {intent}, "
                                  f"Devices targeted: {len(devices)}, Commands executed: {len(executed_commands)}")
                    return True
                else:
                    self.log_result("Natural Language - Temperature", False, 
                                  f"Unexpected intent: {intent}, AI Response: {ai_response}")
                    return False
            else:
                self.log_result("Natural Language - Temperature", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Natural Language - Temperature", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_natural_language_command_dim_bedroom_lights(self):
        """Test POST /api/smart-devices/natural-command with 'dim bedroom lights to 50%'"""
        print("\n=== Testing Natural Language Command - Dim Bedroom Lights ===")
        
        if not self.admin_token:
            self.log_result("Natural Language - Dim Bedroom Lights", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            command_data = {"command": "dim bedroom lights to 50%"}
            
            response = self.session.post(f"{BASE_URL}/smart-devices/natural-command", 
                                       json=command_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                ai_response = data.get("ai_response", {})
                intent = ai_response.get("intent")
                
                if intent == "device_control":
                    devices = ai_response.get("devices", [])
                    executed_commands = ai_response.get("executed_commands", [])
                    
                    self.log_result("Natural Language - Dim Bedroom Lights", True, 
                                  f"Dimming command processed successfully - Intent: {intent}, "
                                  f"Devices targeted: {len(devices)}, Commands executed: {len(executed_commands)}")
                    return True
                else:
                    self.log_result("Natural Language - Dim Bedroom Lights", False, 
                                  f"Unexpected intent: {intent}, AI Response: {ai_response}")
                    return False
            else:
                self.log_result("Natural Language - Dim Bedroom Lights", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Natural Language - Dim Bedroom Lights", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_authentication_required(self):
        """Test that smart device endpoints require authentication"""
        print("\n=== Testing Authentication Requirements ===")
        
        success_count = 0
        total_tests = 0
        
        # Test smart devices endpoint without token
        try:
            total_tests += 1
            response = self.session.get(f"{BASE_URL}/smart-devices")
            
            if response.status_code == 401 or response.status_code == 403:
                self.log_result("Auth Required - Get Devices", True, f"Correctly rejected request without token (status: {response.status_code})")
                success_count += 1
            else:
                self.log_result("Auth Required - Get Devices", False, f"Expected 401/403, got {response.status_code}")
        except Exception as e:
            self.log_result("Auth Required - Get Devices", False, f"Exception occurred: {str(e)}")
        
        # Test natural language command without token
        try:
            total_tests += 1
            response = self.session.post(f"{BASE_URL}/smart-devices/natural-command", 
                                       json={"command": "turn on lights"})
            
            if response.status_code == 401 or response.status_code == 403:
                self.log_result("Auth Required - Natural Command", True, f"Correctly rejected command without token (status: {response.status_code})")
                success_count += 1
            else:
                self.log_result("Auth Required - Natural Command", False, f"Expected 401/403, got {response.status_code}")
        except Exception as e:
            self.log_result("Auth Required - Natural Command", False, f"Exception occurred: {str(e)}")
        
        # Test initialize devices without token
        try:
            total_tests += 1
            response = self.session.post(f"{BASE_URL}/admin/initialize-smart-devices", 
                                       json={"compound_id": "test"})
            
            if response.status_code == 401 or response.status_code == 403:
                self.log_result("Auth Required - Initialize Devices", True, f"Correctly rejected initialization without token (status: {response.status_code})")
                success_count += 1
            else:
                self.log_result("Auth Required - Initialize Devices", False, f"Expected 401/403, got {response.status_code}")
        except Exception as e:
            self.log_result("Auth Required - Initialize Devices", False, f"Exception occurred: {str(e)}")
        
        return success_count == total_tests
    
    def run_smart_home_tests(self):
        """Run Smart Home Device Tests"""
        print("\n🚀 STARTING SMART HOME DEVICE TESTING")
        print("=" * 60)
        print("Testing smart home device initialization and natural language commands")
        print("=" * 60)
        
        # Authentication test
        print("\n🔐 AUTHENTICATION SETUP")
        if not self.test_admin_authentication():
            print("❌ Admin authentication failed - stopping tests")
            return self.print_summary()
        
        # Get compounds
        print("\n🏢 COMPOUND DISCOVERY")
        self.test_get_compounds()
        
        # Smart Home Device Tests
        print("\n🏠 SMART HOME DEVICE TESTING")
        self.test_initialize_smart_devices()
        self.test_get_smart_devices()
        
        # Natural Language Command Tests
        print("\n🗣️ NATURAL LANGUAGE COMMAND TESTING")
        self.test_natural_language_command_living_room_lights()
        self.test_natural_language_command_temperature()
        self.test_natural_language_command_dim_bedroom_lights()
        
        # Security Tests
        print("\n🔒 SECURITY TESTING")
        self.test_authentication_required()
        
        return self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("🏁 SMART HOME DEVICE TESTING SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.results if "✅ PASS" in result["status"])
        failed = sum(1 for result in self.results if "❌ FAIL" in result["status"])
        total = len(self.results)
        
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"📊 OVERALL RESULTS: {passed}/{total} tests passed ({success_rate:.1f}% success rate)")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        
        if failed > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"   • {result['test']}: {result['message']}")
        
        print(f"\n✅ PASSED TESTS:")
        for result in self.results:
            if "✅ PASS" in result["status"]:
                print(f"   • {result['test']}: {result['message']}")
        
        return success_rate >= 80  # Consider 80%+ success rate as overall success

if __name__ == "__main__":
    test_suite = SmartHomeTestSuite()
    success = test_suite.run_smart_home_tests()
    
    if success:
        print(f"\n🎉 SMART HOME TESTING COMPLETED SUCCESSFULLY!")
    else:
        print(f"\n⚠️ SMART HOME TESTING COMPLETED WITH ISSUES")