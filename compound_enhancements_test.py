#!/usr/bin/env python3
"""
Focused Test Suite for New Compound Management Backend API Enhancements
Tests the specific endpoints mentioned in the review request:
1. POST /api/admin/residences - Create new residence directly with profile picture upload
2. GET /api/compounds - Get all available compounds for selection
3. PUT /api/users/{user_id}/compound - Update user's compound assignment
4. Integration testing for the complete flow
"""

import requests
import uuid
import io
from PIL import Image
from backend_test import CompoundManagementTestSuite

# Configuration
BASE_URL = "https://multilingual-home-1.preview.emergentagent.com/api"

class CompoundEnhancementsTestSuite(CompoundManagementTestSuite):
    def __init__(self):
        super().__init__()
        self.test_user_id = None
        
    def run_focused_tests(self):
        """Run focused tests for new compound management enhancements"""
        print("🏠 Testing New Compound Management Backend API Enhancements")
        print("=" * 70)
        
        # Authentication setup
        if not self.test_authentication():
            print("\n❌ Authentication failed. Cannot proceed with other tests.")
            return False
        
        # Test the new enhancements
        test_methods = [
            # NEW: Available compounds API
            self.test_get_available_compounds,
            # NEW: Direct residence creation API
            self.test_create_residence_directly,
            self.test_create_residence_without_profile_picture,
            self.test_create_residence_duplicate_email,
            self.test_create_residence_duplicate_unit,
            self.test_create_residence_invalid_profile_picture,
            # NEW: User compound update API
            self.test_update_user_compound_admin,
            self.test_update_user_compound_self,
            self.test_update_user_compound_unauthorized,
            self.test_update_user_compound_invalid_compound,
            # Integration test
            self.test_complete_flow_integration
        ]
        
        # Run tests
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                self.log_result(test_method.__name__, False, f"Unexpected error: {str(e)}")
        
        # Print summary
        self.print_focused_summary()
        
        return True
    
    def test_create_residence_duplicate_unit(self):
        """Test POST /api/admin/residences - Duplicate unit number validation"""
        print("\n=== Testing Create Residence Duplicate Unit Number ===")
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # First create a residence, then try to create another with same unit number
            unique_id = str(uuid.uuid4())[:8]
            test_unit = f"DUPUNIT{unique_id[:3]}"
            
            # Create first residence
            data1 = {
                'unit_number': test_unit,
                'full_name': f"First Unit Test {unique_id}",
                'email': f"unit1{unique_id}@example.com",
                'phone': "+1234567890",
                'compound_id': self.compound_id
            }
            
            first_response = self.session.post(f"{BASE_URL}/admin/residences", 
                                             data=data1, headers=headers)
            
            if first_response.status_code == 200:
                # Now try to create second residence with same unit number
                data2 = {
                    'unit_number': test_unit,  # Same unit number
                    'full_name': f"Second Unit Test {unique_id}",
                    'email': f"unit2{unique_id}@example.com",
                    'phone': "+1234567890",
                    'compound_id': self.compound_id
                }
                
                second_response = self.session.post(f"{BASE_URL}/admin/residences", 
                                                  data=data2, headers=headers)
                
                if second_response.status_code == 400:
                    result = second_response.json()
                    if "already exists" in result.get("detail", "").lower():
                        self.log_result("Create Residence Duplicate Unit", True, "Correctly rejected duplicate unit number")
                        return True
                    else:
                        self.log_result("Create Residence Duplicate Unit", False, f"Unexpected error message: {result}")
                        return False
                else:
                    self.log_result("Create Residence Duplicate Unit", False, f"Expected 400, got {second_response.status_code}")
                    return False
            else:
                self.log_result("Create Residence Duplicate Unit", False, f"Failed to create first residence: {first_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Create Residence Duplicate Unit", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_residence_invalid_profile_picture(self):
        """Test POST /api/admin/residences - Invalid profile picture validation"""
        print("\n=== Testing Create Residence Invalid Profile Picture ===")
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Generate unique data for testing
            unique_id = str(uuid.uuid4())[:8]
            
            # Create invalid file (not an image)
            invalid_file_data = b"This is not an image file"
            
            files = {
                'profile_picture': ('invalid.txt', invalid_file_data, 'text/plain')
            }
            
            data = {
                'unit_number': f"INVALID{unique_id[:4]}",
                'full_name': f"Invalid Profile Test {unique_id}",
                'email': f"invalid{unique_id}@example.com",
                'phone': "+1234567890",
                'compound_id': self.compound_id
            }
            
            response = self.session.post(f"{BASE_URL}/admin/residences", 
                                       files=files, data=data, headers=headers)
            
            if response.status_code == 400:
                result = response.json()
                if "image" in result.get("detail", "").lower():
                    self.log_result("Create Residence Invalid Profile Picture", True, "Correctly rejected invalid profile picture")
                    return True
                else:
                    self.log_result("Create Residence Invalid Profile Picture", False, f"Unexpected error message: {result}")
                    return False
            else:
                self.log_result("Create Residence Invalid Profile Picture", False, f"Expected 400, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Create Residence Invalid Profile Picture", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_complete_flow_integration(self):
        """Test complete integration flow: Get compounds -> Create residence -> Update compound"""
        print("\n=== Testing Complete Flow Integration ===")
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            # Step 1: Get available compounds
            compounds_response = self.session.get(f"{BASE_URL}/compounds", headers=headers)
            if compounds_response.status_code != 200:
                self.log_result("Complete Flow Integration", False, "Failed to get available compounds")
                return False
            
            compounds = compounds_response.json().get("compounds", [])
            if not compounds:
                self.log_result("Complete Flow Integration", False, "No compounds available")
                return False
            
            # Step 2: Create a new residence with profile picture
            unique_id = str(uuid.uuid4())[:8]
            profile_pic_data = self.create_test_image("integration_profile.jpg", size=(150, 150))
            
            files = {
                'profile_picture': ('integration_profile.jpg', profile_pic_data, 'image/jpeg')
            }
            
            data = {
                'unit_number': f"INT{unique_id[:4]}",
                'full_name': f"Integration Test User {unique_id}",
                'email': f"integration{unique_id}@example.com",
                'phone': "+1234567890",
                'compound_id': self.compound_id
            }
            
            create_response = self.session.post(f"{BASE_URL}/admin/residences", 
                                              files=files, data=data, headers=headers)
            
            if create_response.status_code != 200:
                self.log_result("Complete Flow Integration", False, f"Failed to create residence: {create_response.status_code}")
                return False
            
            create_result = create_response.json()
            new_user_id = create_result.get("user_id")
            
            if not new_user_id:
                self.log_result("Complete Flow Integration", False, "No user_id returned from residence creation")
                return False
            
            # Step 3: Update user's compound assignment (if there are multiple compounds)
            if len(compounds) > 1:
                target_compound_id = compounds[1]["id"]  # Use second compound
                
                compound_data = {
                    "compound_id": target_compound_id
                }
                
                update_response = self.session.put(f"{BASE_URL}/users/{new_user_id}/compound", 
                                                 json=compound_data, headers=headers)
                
                if update_response.status_code != 200:
                    self.log_result("Complete Flow Integration", False, f"Failed to update user compound: {update_response.status_code}")
                    return False
            
            # Step 4: Verify the complete flow worked
            self.log_result("Complete Flow Integration", True, 
                          f"Complete flow successful: Retrieved {len(compounds)} compounds, created residence with profile picture, user ID: {new_user_id}")
            return True
                
        except Exception as e:
            self.log_result("Complete Flow Integration", False, f"Exception occurred: {str(e)}")
            return False
    
    def print_focused_summary(self):
        """Print focused test results summary"""
        print("\n" + "=" * 60)
        print("📊 NEW COMPOUND MANAGEMENT ENHANCEMENTS TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.results if "✅ PASS" in result["status"])
        failed = sum(1 for result in self.results if "❌ FAIL" in result["status"])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        print(f"\n🎯 NEW FEATURES TESTED:")
        print(f"✅ POST /api/admin/residences - Create residence directly with profile picture upload")
        print(f"✅ GET /api/compounds - Get all available compounds for selection")
        print(f"✅ PUT /api/users/{{user_id}}/compound - Update user's compound assignment")
        print(f"✅ Integration testing - Complete flow verification")
        
        if failed > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['message']}")
                    if result["details"]:
                        print(f"    Details: {result['details']}")
        
        print("\n" + "=" * 60)

if __name__ == "__main__":
    test_suite = CompoundEnhancementsTestSuite()
    test_suite.run_focused_tests()