#!/usr/bin/env python3
"""
Arabic Localization Verification Test
Comprehensive testing to verify the Security Guard service update was successful
and test the GET /api/compounds/{compound_id}/services endpoint
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "https://homeme-i18n-1.preview.emergentagent.com/api"

class ArabicVerificationTest:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
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
    
    def authenticate(self):
        """Authenticate as admin"""
        print("\n=== Testing Admin Authentication ===")
        
        credentials = {"username": "admin", "password": "admin123"}
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=credentials)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                self.admin_user = data["user"]
                self.compound_id = self.admin_user.get("compound_id")
                
                self.log_result("Admin Authentication", True, 
                              f"Admin authenticated successfully - Compound: {self.compound_id}")
                return True
            else:
                self.log_result("Admin Authentication", False, 
                              f"Authentication failed with status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Admin Authentication", False, f"Authentication error: {e}")
            return False
    
    def test_get_services_endpoint(self):
        """Test GET /api/compounds/{compound_id}/services endpoint"""
        print("\n=== Testing GET Services Endpoint ===")
        
        if not self.admin_token or not self.compound_id:
            self.log_result("GET Services Endpoint", False, "No authentication available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            endpoint = f"{BASE_URL}/compounds/{self.compound_id}/services"
            
            response = self.session.get(endpoint, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                services = data.get("services", [])
                
                self.log_result("GET Services Endpoint", True, 
                              f"Successfully retrieved {len(services)} services from endpoint",
                              f"Endpoint: {endpoint}")
                
                # Store services for further testing
                self.services = services
                return True
            else:
                self.log_result("GET Services Endpoint", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("GET Services Endpoint", False, f"Exception occurred: {e}")
            return False
    
    def test_security_guard_arabic_update(self):
        """Test that Security Guard service has Arabic working_hours"""
        print("\n=== Testing Security Guard Arabic Update ===")
        
        if not hasattr(self, 'services'):
            self.log_result("Security Guard Arabic Update", False, "Services data not available")
            return False
        
        try:
            security_guard_service = None
            for service in self.services:
                if service.get("name") == "Security Guard":
                    security_guard_service = service
                    break
            
            if not security_guard_service:
                self.log_result("Security Guard Arabic Update", False, "Security Guard service not found")
                return False
            
            service_id = security_guard_service.get("id")
            working_hours = security_guard_service.get("working_hours")
            
            # Check if working_hours is in Arabic
            if working_hours == "خدمة متاحة 24/7":
                self.log_result("Security Guard Arabic Update", True, 
                              f"Security Guard service successfully updated to Arabic",
                              f"Service ID: {service_id}\nWorking Hours: {working_hours}")
                return True
            else:
                self.log_result("Security Guard Arabic Update", False, 
                              f"Security Guard service not properly updated",
                              f"Service ID: {service_id}\nCurrent Working Hours: {working_hours}\nExpected: خدمة متاحة 24/7")
                return False
                
        except Exception as e:
            self.log_result("Security Guard Arabic Update", False, f"Exception occurred: {e}")
            return False
    
    def test_no_english_available_text(self):
        """Test that no services contain English 'Available' text"""
        print("\n=== Testing No English 'Available' Text ===")
        
        if not hasattr(self, 'services'):
            self.log_result("No English Available Text", False, "Services data not available")
            return False
        
        try:
            services_with_available = []
            
            for service in self.services:
                working_hours = service.get("working_hours", "")
                if "Available" in working_hours:
                    services_with_available.append({
                        "name": service.get("name"),
                        "id": service.get("id"),
                        "working_hours": working_hours
                    })
            
            if not services_with_available:
                self.log_result("No English Available Text", True, 
                              "SUCCESS: No services found with English 'Available' text")
                return True
            else:
                self.log_result("No English Available Text", False, 
                              f"Found {len(services_with_available)} services with English 'Available' text",
                              f"Services: {json.dumps(services_with_available, indent=2)}")
                return False
                
        except Exception as e:
            self.log_result("No English Available Text", False, f"Exception occurred: {e}")
            return False
    
    def test_service_data_integrity(self):
        """Test that all service data is properly structured"""
        print("\n=== Testing Service Data Integrity ===")
        
        if not hasattr(self, 'services'):
            self.log_result("Service Data Integrity", False, "Services data not available")
            return False
        
        try:
            required_fields = ["id", "name", "category", "description", "working_hours"]
            services_with_issues = []
            
            for service in self.services:
                missing_fields = []
                for field in required_fields:
                    if field not in service or service[field] is None:
                        missing_fields.append(field)
                
                if missing_fields:
                    services_with_issues.append({
                        "name": service.get("name", "Unknown"),
                        "id": service.get("id", "Unknown"),
                        "missing_fields": missing_fields
                    })
            
            if not services_with_issues:
                self.log_result("Service Data Integrity", True, 
                              f"All {len(self.services)} services have proper data structure")
                return True
            else:
                self.log_result("Service Data Integrity", False, 
                              f"Found {len(services_with_issues)} services with data issues",
                              f"Issues: {json.dumps(services_with_issues, indent=2)}")
                return False
                
        except Exception as e:
            self.log_result("Service Data Integrity", False, f"Exception occurred: {e}")
            return False
    
    def test_arabic_text_encoding(self):
        """Test that Arabic text is properly encoded and displayed"""
        print("\n=== Testing Arabic Text Encoding ===")
        
        if not hasattr(self, 'services'):
            self.log_result("Arabic Text Encoding", False, "Services data not available")
            return False
        
        try:
            security_guard_service = None
            for service in self.services:
                if service.get("name") == "Security Guard":
                    security_guard_service = service
                    break
            
            if not security_guard_service:
                self.log_result("Arabic Text Encoding", False, "Security Guard service not found")
                return False
            
            working_hours = security_guard_service.get("working_hours")
            
            # Check if Arabic text contains the expected characters
            expected_arabic_chars = ["خ", "د", "م", "ة", "م", "ت", "ا", "ح", "ة"]  # Characters from "خدمة متاحة"
            arabic_chars_found = [char for char in expected_arabic_chars if char in working_hours]
            
            if len(arabic_chars_found) >= 5:  # At least 5 Arabic characters should be present
                self.log_result("Arabic Text Encoding", True, 
                              f"Arabic text properly encoded and contains expected characters",
                              f"Working Hours: {working_hours}\nArabic chars found: {arabic_chars_found}")
                return True
            else:
                self.log_result("Arabic Text Encoding", False, 
                              f"Arabic text encoding may have issues",
                              f"Working Hours: {working_hours}\nExpected Arabic chars: {expected_arabic_chars}\nFound: {arabic_chars_found}")
                return False
                
        except Exception as e:
            self.log_result("Arabic Text Encoding", False, f"Exception occurred: {e}")
            return False
    
    def test_api_response_structure(self):
        """Test that API response has proper structure"""
        print("\n=== Testing API Response Structure ===")
        
        if not self.admin_token or not self.compound_id:
            self.log_result("API Response Structure", False, "No authentication available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}/services", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check response structure
                if "services" in data and isinstance(data["services"], list):
                    services = data["services"]
                    
                    # Check if services have proper structure
                    if services and isinstance(services[0], dict):
                        sample_service = services[0]
                        expected_fields = ["id", "name", "category", "description", "working_hours"]
                        
                        has_all_fields = all(field in sample_service for field in expected_fields)
                        
                        if has_all_fields:
                            self.log_result("API Response Structure", True, 
                                          f"API response has proper structure with {len(services)} services",
                                          f"Sample service fields: {list(sample_service.keys())}")
                            return True
                        else:
                            missing_fields = [field for field in expected_fields if field not in sample_service]
                            self.log_result("API Response Structure", False, 
                                          f"Service objects missing required fields: {missing_fields}")
                            return False
                    else:
                        self.log_result("API Response Structure", False, "Services array is empty or malformed")
                        return False
                else:
                    self.log_result("API Response Structure", False, 
                                  f"Response missing 'services' field or wrong type: {list(data.keys())}")
                    return False
            else:
                self.log_result("API Response Structure", False, 
                              f"API request failed with status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("API Response Structure", False, f"Exception occurred: {e}")
            return False
    
    def run_all_tests(self):
        """Run all verification tests"""
        print("🔍 ARABIC LOCALIZATION VERIFICATION TESTS")
        print("=" * 60)
        print("Verifying Security Guard service Arabic localization")
        print("Testing GET /api/compounds/{compound_id}/services endpoint")
        print("=" * 60)
        
        tests = [
            self.authenticate,
            self.test_get_services_endpoint,
            self.test_security_guard_arabic_update,
            self.test_no_english_available_text,
            self.test_service_data_integrity,
            self.test_arabic_text_encoding,
            self.test_api_response_structure
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")
        
        print(f"\n{'='*60}")
        print(f"ARABIC LOCALIZATION VERIFICATION RESULTS")
        print(f"{'='*60}")
        print(f"Tests Passed: {passed}/{total}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("🎉 ALL VERIFICATION TESTS PASSED!")
            print("✅ Security Guard service Arabic localization verified successfully")
            print("✅ GET /api/compounds/{compound_id}/services endpoint working correctly")
            print("✅ No English 'Available' text found in any services")
        else:
            print("⚠️  Some verification tests failed - Review the results above")
        
        return passed == total

def main():
    """Main function"""
    test_suite = ArabicVerificationTest()
    success = test_suite.run_all_tests()
    
    if success:
        print("\n🎉 ARABIC LOCALIZATION VERIFICATION COMPLETED SUCCESSFULLY!")
        print("All requested changes have been implemented and verified:")
        print("1. ✅ Security Guard service working_hours updated to 'خدمة متاحة 24/7'")
        print("2. ✅ GET /api/compounds/{compound_id}/services endpoint tested and working")
        print("3. ✅ No other services found with English 'Available' text")
        print("4. ✅ Arabic text encoding verified and working correctly")
    else:
        print("\n❌ Some verification tests failed - please review the results above")
    
    return success

if __name__ == "__main__":
    main()