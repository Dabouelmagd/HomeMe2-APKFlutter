#!/usr/bin/env python3
"""
Arabic Localization Testing Suite for Security Guard Service
Tests the update of Security Guard service working_hours from English to Arabic
and verifies other services for similar English text patterns.
"""

import requests
import json
from datetime import datetime
from typing import Dict, List, Optional

# Configuration - Using the production URL
BASE_URL = "https://homeme-portal-2.preview.emergentagent.com/api"

class ArabicLocalizationTestSuite:
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
    
    def setup_auth_headers(self, token: str) -> Dict[str, str]:
        """Setup authorization headers"""
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_admin_authentication(self):
        """Test admin authentication"""
        print("\n=== Testing Admin Authentication ===")
        
        # Try both credential sets
        credential_sets = [
            {"username": "admin", "password": "admin123"},
            {"username": "admin@homeme.com", "password": "admin123"}
        ]
        
        for i, credentials in enumerate(credential_sets, 1):
            try:
                response = self.session.post(f"{BASE_URL}/auth/login", json=credentials)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if "access_token" in data and "user" in data:
                        self.admin_token = data["access_token"]
                        self.admin_user = data["user"]
                        self.compound_id = self.admin_user.get("compound_id")
                        
                        self.log_result(f"Admin Authentication", True, 
                                      f"Admin authenticated successfully - Username: {credentials['username']}, "
                                      f"Role: {self.admin_user.get('role')}, Compound: {self.compound_id}")
                        return True
                    else:
                        self.log_result(f"Admin Authentication", False, f"Missing required fields in response")
                        continue
                else:
                    self.log_result(f"Admin Authentication", False, 
                                  f"Failed with status {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_result(f"Admin Authentication", False, f"Exception occurred: {str(e)}")
        
        return False
    
    def test_get_services_before_update(self):
        """Test GET /api/compounds/{compound_id}/services - Get services before update"""
        print("\n=== Testing Get Services Before Update ===")
        
        if not self.admin_token or not self.compound_id:
            self.log_result("Get Services Before Update", False, "No admin token or compound ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}/services", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                services = data.get("services", [])
                
                # Look for Security Guard service
                security_guard_service = None
                services_with_available = []
                
                for service in services:
                    if service.get("name") == "Security Guard":
                        security_guard_service = service
                    
                    # Check for "Available" text in working_hours
                    working_hours = service.get("working_hours", "")
                    if "Available" in working_hours:
                        services_with_available.append({
                            "id": service.get("id"),
                            "name": service.get("name"),
                            "working_hours": working_hours
                        })
                
                if security_guard_service:
                    service_id = security_guard_service.get("id")
                    working_hours = security_guard_service.get("working_hours")
                    
                    self.log_result("Security Guard Service Found", True, 
                                  f"Found Security Guard service - ID: {service_id}, "
                                  f"Working Hours: '{working_hours}'")
                    
                    # Store for update
                    self.security_guard_id = service_id
                    self.original_working_hours = working_hours
                else:
                    self.log_result("Security Guard Service Found", False, "Security Guard service not found")
                
                if services_with_available:
                    self.log_result("Services with 'Available' Text", True, 
                                  f"Found {len(services_with_available)} services with 'Available' text",
                                  f"Services: {json.dumps(services_with_available, indent=2)}")
                    self.services_with_available = services_with_available
                else:
                    self.log_result("Services with 'Available' Text", True, "No services found with 'Available' text")
                    self.services_with_available = []
                
                return True
            else:
                self.log_result("Get Services Before Update", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Services Before Update", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_update_security_guard_service(self):
        """Test updating Security Guard service working_hours to Arabic"""
        print("\n=== Testing Update Security Guard Service ===")
        
        if not hasattr(self, 'security_guard_id'):
            self.log_result("Update Security Guard Service", False, "Security Guard service ID not available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Update data - change working_hours to Arabic
            update_data = {
                "working_hours": "خدمة متاحة 24/7"
            }
            
            # Try different possible endpoints for updating services
            possible_endpoints = [
                f"/services/{self.security_guard_id}",
                f"/compounds/{self.compound_id}/services/{self.security_guard_id}",
                f"/admin/services/{self.security_guard_id}"
            ]
            
            success = False
            for endpoint in possible_endpoints:
                try:
                    response = self.session.put(f"{BASE_URL}{endpoint}", json=update_data, headers=headers)
                    
                    if response.status_code in [200, 204]:
                        self.log_result("Update Security Guard Service", True, 
                                      f"Security Guard service updated successfully via {endpoint}")
                        success = True
                        break
                    elif response.status_code == 404:
                        continue  # Try next endpoint
                    else:
                        self.log_result("Update Security Guard Service", False, 
                                      f"Failed via {endpoint} with status {response.status_code}", response.text)
                        
                except Exception as e:
                    continue  # Try next endpoint
            
            if not success:
                # Try PATCH method as well
                for endpoint in possible_endpoints:
                    try:
                        response = self.session.patch(f"{BASE_URL}{endpoint}", json=update_data, headers=headers)
                        
                        if response.status_code in [200, 204]:
                            self.log_result("Update Security Guard Service", True, 
                                          f"Security Guard service updated successfully via PATCH {endpoint}")
                            success = True
                            break
                        elif response.status_code == 404:
                            continue  # Try next endpoint
                            
                    except Exception as e:
                        continue  # Try next endpoint
            
            if not success:
                self.log_result("Update Security Guard Service", False, 
                              "Could not find working endpoint for service update")
                return False
            
            return True
                
        except Exception as e:
            self.log_result("Update Security Guard Service", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_verify_security_guard_update(self):
        """Test GET /api/compounds/{compound_id}/services - Verify Security Guard update"""
        print("\n=== Testing Verify Security Guard Update ===")
        
        if not self.admin_token or not self.compound_id:
            self.log_result("Verify Security Guard Update", False, "No admin token or compound ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}/services", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                services = data.get("services", [])
                
                # Look for Security Guard service
                security_guard_service = None
                for service in services:
                    if service.get("name") == "Security Guard":
                        security_guard_service = service
                        break
                
                if security_guard_service:
                    working_hours = security_guard_service.get("working_hours")
                    
                    if working_hours == "خدمة متاحة 24/7":
                        self.log_result("Verify Security Guard Update", True, 
                                      f"Security Guard service successfully updated to Arabic: '{working_hours}'")
                        return True
                    else:
                        self.log_result("Verify Security Guard Update", False, 
                                      f"Security Guard service not updated correctly. Current working_hours: '{working_hours}'")
                        return False
                else:
                    self.log_result("Verify Security Guard Update", False, "Security Guard service not found after update")
                    return False
            else:
                self.log_result("Verify Security Guard Update", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Verify Security Guard Update", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_search_other_available_services(self):
        """Test searching for other services with 'Available' text"""
        print("\n=== Testing Search Other Available Services ===")
        
        if not hasattr(self, 'services_with_available'):
            self.log_result("Search Other Available Services", False, "Services data not available")
            return False
        
        try:
            if not self.services_with_available:
                self.log_result("Search Other Available Services", True, "No other services found with 'Available' text")
                return True
            
            # Filter out Security Guard service (already handled)
            other_services = [s for s in self.services_with_available if s.get("name") != "Security Guard"]
            
            if other_services:
                self.log_result("Search Other Available Services", True, 
                              f"Found {len(other_services)} other services with 'Available' text",
                              f"Services needing translation: {json.dumps(other_services, indent=2)}")
                
                # Store for potential updates
                self.other_services_needing_update = other_services
                return True
            else:
                self.log_result("Search Other Available Services", True, 
                              "No other services found with 'Available' text (only Security Guard had it)")
                return True
                
        except Exception as e:
            self.log_result("Search Other Available Services", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_update_other_services_if_needed(self):
        """Test updating other services with 'Available' text if any exist"""
        print("\n=== Testing Update Other Services If Needed ===")
        
        if not hasattr(self, 'other_services_needing_update'):
            self.log_result("Update Other Services", True, "No other services need updating")
            return True
        
        if not self.other_services_needing_update:
            self.log_result("Update Other Services", True, "No other services need updating")
            return True
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            updated_services = []
            failed_services = []
            
            for service in self.other_services_needing_update:
                service_id = service.get("id")
                service_name = service.get("name")
                current_hours = service.get("working_hours")
                
                # Convert English "Available" text to Arabic
                arabic_hours = current_hours.replace("Available", "متاح").replace("24/7 Service Available", "خدمة متاحة 24/7")
                
                update_data = {
                    "working_hours": arabic_hours
                }
                
                # Try different possible endpoints
                possible_endpoints = [
                    f"/services/{service_id}",
                    f"/compounds/{self.compound_id}/services/{service_id}",
                    f"/admin/services/{service_id}"
                ]
                
                service_updated = False
                for endpoint in possible_endpoints:
                    try:
                        response = self.session.put(f"{BASE_URL}{endpoint}", json=update_data, headers=headers)
                        
                        if response.status_code in [200, 204]:
                            updated_services.append({
                                "name": service_name,
                                "id": service_id,
                                "old_hours": current_hours,
                                "new_hours": arabic_hours
                            })
                            service_updated = True
                            break
                        elif response.status_code == 404:
                            continue  # Try next endpoint
                            
                    except Exception as e:
                        continue  # Try next endpoint
                
                if not service_updated:
                    # Try PATCH method
                    for endpoint in possible_endpoints:
                        try:
                            response = self.session.patch(f"{BASE_URL}{endpoint}", json=update_data, headers=headers)
                            
                            if response.status_code in [200, 204]:
                                updated_services.append({
                                    "name": service_name,
                                    "id": service_id,
                                    "old_hours": current_hours,
                                    "new_hours": arabic_hours
                                })
                                service_updated = True
                                break
                                
                        except Exception as e:
                            continue  # Try next endpoint
                
                if not service_updated:
                    failed_services.append({
                        "name": service_name,
                        "id": service_id,
                        "hours": current_hours
                    })
            
            if updated_services:
                self.log_result("Update Other Services", True, 
                              f"Successfully updated {len(updated_services)} services",
                              f"Updated services: {json.dumps(updated_services, indent=2)}")
            
            if failed_services:
                self.log_result("Update Other Services - Failed", False, 
                              f"Failed to update {len(failed_services)} services",
                              f"Failed services: {json.dumps(failed_services, indent=2)}")
            
            if not updated_services and not failed_services:
                self.log_result("Update Other Services", True, "No services needed updating")
            
            return len(failed_services) == 0
                
        except Exception as e:
            self.log_result("Update Other Services", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_final_verification(self):
        """Test final verification of all services"""
        print("\n=== Testing Final Verification ===")
        
        if not self.admin_token or not self.compound_id:
            self.log_result("Final Verification", False, "No admin token or compound ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}/services", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                services = data.get("services", [])
                
                # Check for any remaining "Available" text
                services_with_available = []
                security_guard_verified = False
                
                for service in services:
                    working_hours = service.get("working_hours", "")
                    
                    if service.get("name") == "Security Guard":
                        if working_hours == "خدمة متاحة 24/7":
                            security_guard_verified = True
                        else:
                            self.log_result("Security Guard Final Check", False, 
                                          f"Security Guard still has incorrect working_hours: '{working_hours}'")
                    
                    if "Available" in working_hours:
                        services_with_available.append({
                            "name": service.get("name"),
                            "id": service.get("id"),
                            "working_hours": working_hours
                        })
                
                if security_guard_verified:
                    self.log_result("Security Guard Final Check", True, 
                                  "Security Guard service correctly shows Arabic working hours")
                
                if not services_with_available:
                    self.log_result("Final Verification", True, 
                                  "SUCCESS: No services found with English 'Available' text - All localized to Arabic")
                    return True
                else:
                    self.log_result("Final Verification", False, 
                                  f"Still found {len(services_with_available)} services with English 'Available' text",
                                  f"Remaining services: {json.dumps(services_with_available, indent=2)}")
                    return False
            else:
                self.log_result("Final Verification", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Final Verification", False, f"Exception occurred: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all Arabic localization tests"""
        print("🌍 ARABIC LOCALIZATION TESTING SUITE")
        print("=" * 50)
        print("Testing Security Guard service Arabic localization")
        print("Updating working_hours from '24/7 Service Available' to 'خدمة متاحة 24/7'")
        print("=" * 50)
        
        tests = [
            self.test_admin_authentication,
            self.test_get_services_before_update,
            self.test_update_security_guard_service,
            self.test_verify_security_guard_update,
            self.test_search_other_available_services,
            self.test_update_other_services_if_needed,
            self.test_final_verification
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")
        
        print(f"\n{'='*50}")
        print(f"ARABIC LOCALIZATION TEST RESULTS")
        print(f"{'='*50}")
        print(f"Tests Passed: {passed}/{total}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED - Arabic localization completed successfully!")
        else:
            print("⚠️  Some tests failed - Review the results above")
        
        return passed == total

def main():
    """Main function to run the Arabic localization tests"""
    test_suite = ArabicLocalizationTestSuite()
    success = test_suite.run_all_tests()
    
    if success:
        print("\n✅ Arabic localization testing completed successfully!")
        print("Security Guard service working_hours updated to Arabic: 'خدمة متاحة 24/7'")
    else:
        print("\n❌ Arabic localization testing completed with issues!")
        print("Please review the test results above for details.")
    
    return success

if __name__ == "__main__":
    main()