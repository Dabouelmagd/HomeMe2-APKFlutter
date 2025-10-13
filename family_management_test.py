#!/usr/bin/env python3
"""
HomeMe Family Management Testing Suite
Tests the family management functionality for the HomeMe application.

TESTING REQUIREMENTS FROM REVIEW REQUEST:
1. Family Management API Endpoints:
   - Test /api/family-members endpoint for listing family members
   - Test /api/family-members endpoint for adding family members  
   - Test /api/family-members/{member_id} endpoint for updating family member info
   - Test /api/family-members/{member_id} endpoint for removing family members

2. Authentication Test:
   - Verify that family management requires proper authentication
   - Test with valid user tokens
   - Check if family operations are properly authorized

3. Database Operations:
   - Test if family member data is stored correctly in MongoDB
   - Verify data retrieval works properly
   - Check for any database connection issues

4. Specific Issues to Check:
   - Are there any 500/404 errors when accessing family endpoints?
   - Does the API return proper JSON responses?
   - Are there any missing dependencies or imports?

5. User Authentication:
   - Test with admin user (admin/admin123) if available
   - Create test user if needed
   - Verify family operations work with authenticated users
"""

import asyncio
import json
import requests
import uuid
import os
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional

# Configuration - Using the production URL from frontend/.env
BASE_URL = "https://homeme-subscriptions.preview.emergentagent.com/api"

class FamilyManagementTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.resident_token = None
        self.admin_user = None
        self.resident_user = None
        self.compound_id = None
        self.test_family_members = []
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
        """Test admin authentication for family management access"""
        print("\n=== Testing Admin Authentication for Family Management ===")
        
        # Try admin credentials
        credentials = {"username": "admin", "password": "admin123"}
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=credentials)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["access_token", "user"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Admin Authentication", False, f"Missing required fields: {missing_fields}")
                    return False
                
                self.admin_token = data["access_token"]
                self.admin_user = data["user"]
                self.compound_id = self.admin_user.get("compound_id")
                
                # Verify user object structure
                user_required_fields = ["id", "username", "role"]
                user_missing_fields = [field for field in user_required_fields if field not in self.admin_user]
                
                if user_missing_fields:
                    self.log_result("Admin Authentication", False, f"User object missing fields: {user_missing_fields}")
                    return False
                
                # Verify token format
                if not self.admin_token or len(self.admin_token) < 10:
                    self.log_result("Admin Authentication", False, "Invalid token format")
                    return False
                
                self.log_result("Admin Authentication", True, 
                              f"✅ ADMIN LOGIN SUCCESSFUL - Username: {credentials['username']}, "
                              f"Role: {self.admin_user.get('role')}, Compound: {self.compound_id}")
                return True
            else:
                self.log_result("Admin Authentication", False, 
                              f"❌ LOGIN FAILED - {response.status_code}: {response.text}")
                return False
                    
        except Exception as e:
            self.log_result("Admin Authentication", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def test_family_members_list_endpoint(self):
        """Test GET /api/family-members - List family members"""
        print("\n=== Testing Family Members List Endpoint ===")
        
        if not self.admin_token:
            self.log_result("Family Members List", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/family-members", headers=headers)
            
            print(f"Family Members List Response Status: {response.status_code}")
            if response.status_code != 200:
                print(f"Family Members List Response Text: {response.text}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Verify response structure
                    if "family_members" not in data:
                        self.log_result("Family Members List", False, 
                                      f"❌ INVALID RESPONSE STRUCTURE - Missing 'family_members' field: {data}")
                        return False
                    
                    family_members = data["family_members"]
                    
                    # Verify it's a list
                    if not isinstance(family_members, list):
                        self.log_result("Family Members List", False, 
                                      f"❌ INVALID DATA TYPE - 'family_members' should be list, got: {type(family_members)}")
                        return False
                    
                    # Store for later tests
                    self.test_family_members = family_members
                    
                    self.log_result("Family Members List", True, 
                                  f"✅ FAMILY MEMBERS LIST WORKING - Retrieved {len(family_members)} family members")
                    
                    # Verify family member structure if any exist
                    if family_members:
                        sample_member = family_members[0]
                        expected_fields = ["id", "full_name", "relationship", "compound_id", "primary_resident_id"]
                        missing_fields = [field for field in expected_fields if field not in sample_member]
                        
                        if missing_fields:
                            self.log_result("Family Member Structure", False, 
                                          f"❌ MISSING FIELDS in family member: {missing_fields}")
                            return False
                        else:
                            self.log_result("Family Member Structure", True, 
                                          f"✅ FAMILY MEMBER STRUCTURE VALID - All required fields present")
                    
                    return True
                    
                except json.JSONDecodeError as e:
                    self.log_result("Family Members List", False, 
                                  f"❌ JSON DECODE ERROR - Invalid JSON response: {str(e)}")
                    return False
                    
            elif response.status_code == 401:
                self.log_result("Family Members List", False, 
                              f"❌ AUTHENTICATION FAILED - Token not accepted")
                return False
                
            elif response.status_code == 403:
                self.log_result("Family Members List", False, 
                              f"❌ ACCESS DENIED - Admin user cannot access family members")
                return False
                
            elif response.status_code == 404:
                self.log_result("Family Members List", False, 
                              f"❌ ENDPOINT NOT FOUND - /api/family-members does not exist")
                return False
                
            elif response.status_code == 500:
                self.log_result("Family Members List", False, 
                              f"❌ SERVER ERROR - Internal server error: {response.text}")
                return False
                
            else:
                self.log_result("Family Members List", False, 
                              f"❌ UNEXPECTED STATUS {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Family Members List", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def test_add_family_member_endpoint(self):
        """Test POST /api/family-members - Add family member"""
        print("\n=== Testing Add Family Member Endpoint ===")
        
        if not self.admin_token:
            self.log_result("Add Family Member", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # First check if admin user has unit_number, if not, try the alternative endpoint
            if not self.admin_user.get("unit_number"):
                self.log_result("Admin Unit Check", False, 
                              f"❌ ADMIN USER MISSING UNIT_NUMBER - Admin: {self.admin_user.get('username')} "
                              f"has no unit_number. This is expected for admin users.")
                
                # Try the alternative endpoint that allows adding to any unit
                return self.test_add_family_member_to_unit_endpoint()
            
            # Create test family member data
            unique_id = str(uuid.uuid4())[:8]
            family_member_data = {
                "full_name": f"أحمد محمد علي {unique_id}",  # Using Arabic name as per app context
                "age": 25,
                "birthday": "1999-01-15",
                "relationship": "son",  # son, daughter, spouse, father, mother, etc.
                "phone": "+966501234567",
                "email": f"ahmed.{unique_id}@example.com",
                "id_number": f"ID{unique_id}",
                "emergency_contact_name": "فاطمة أحمد",
                "emergency_contact_phone": "+966509876543",
                "move_in_date": "2024-01-01"
            }
            
            response = self.session.post(f"{BASE_URL}/family-members", json=family_member_data, headers=headers)
            
            print(f"Add Family Member Response Status: {response.status_code}")
            if response.status_code != 200:
                print(f"Add Family Member Response Text: {response.text}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Verify response structure
                    if "message" not in data:
                        self.log_result("Add Family Member", False, 
                                      f"❌ INVALID RESPONSE - Missing 'message' field: {data}")
                        return False
                    
                    if "family_member" not in data:
                        self.log_result("Add Family Member", False, 
                                      f"❌ INVALID RESPONSE - Missing 'family_member' field: {data}")
                        return False
                    
                    created_member = data["family_member"]
                    
                    # Verify created member has ID
                    if "id" not in created_member:
                        self.log_result("Add Family Member", False, 
                                      f"❌ CREATED MEMBER MISSING ID: {created_member}")
                        return False
                    
                    # Store the created member ID for update/delete tests
                    self.test_member_id = created_member["id"]
                    
                    self.log_result("Add Family Member", True, 
                                  f"✅ FAMILY MEMBER ADDED SUCCESSFULLY - Name: {family_member_data['full_name']}, "
                                  f"ID: {self.test_member_id}")
                    
                    # Verify the data was stored correctly
                    if created_member.get("full_name") == family_member_data["full_name"]:
                        self.log_result("Family Member Data Storage", True, 
                                      f"✅ DATA STORED CORRECTLY - Name matches: {created_member.get('full_name')}")
                    else:
                        self.log_result("Family Member Data Storage", False, 
                                      f"❌ DATA MISMATCH - Expected: {family_member_data['full_name']}, "
                                      f"Got: {created_member.get('full_name')}")
                        return False
                    
                    return True
                    
                except json.JSONDecodeError as e:
                    self.log_result("Add Family Member", False, 
                                  f"❌ JSON DECODE ERROR - Invalid JSON response: {str(e)}")
                    return False
                    
            elif response.status_code == 400:
                self.log_result("Add Family Member", False, 
                              f"❌ BAD REQUEST - Invalid family member data: {response.text}")
                return False
                
            elif response.status_code == 401:
                self.log_result("Add Family Member", False, 
                              f"❌ AUTHENTICATION FAILED - Token not accepted")
                return False
                
            elif response.status_code == 403:
                self.log_result("Add Family Member", False, 
                              f"❌ ACCESS DENIED - User cannot add family members")
                return False
                
            elif response.status_code == 404:
                self.log_result("Add Family Member", False, 
                              f"❌ ENDPOINT NOT FOUND - /api/family-members POST does not exist")
                return False
                
            elif response.status_code == 500:
                self.log_result("Add Family Member", False, 
                              f"❌ SERVER ERROR - Internal server error: {response.text}")
                return False
                
            else:
                self.log_result("Add Family Member", False, 
                              f"❌ UNEXPECTED STATUS {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Add Family Member", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def test_add_family_member_to_unit_endpoint(self):
        """Test POST /api/family-members/add-to-unit - Add family member to specific unit"""
        print("\n=== Testing Add Family Member to Unit Endpoint (Alternative) ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # First, get a list of users to find a resident with a unit
            users_response = self.session.get(f"{BASE_URL}/admin/users", headers=headers)
            
            if users_response.status_code != 200:
                self.log_result("Get Users for Unit", False, 
                              f"❌ CANNOT GET USERS - Status: {users_response.status_code}")
                return False
            
            users_data = users_response.json()
            users = users_data.get("users", [])
            
            # Find a resident user with a unit_number
            target_unit_id = None
            target_unit_number = None
            
            for user in users:
                if user.get("role") == "resident" and user.get("unit_number"):
                    target_unit_id = user.get("id")
                    target_unit_number = user.get("unit_number")
                    break
            
            if not target_unit_id:
                # Create a test unit if no residents exist
                self.log_result("No Resident Units", False, 
                              f"❌ NO RESIDENT UNITS FOUND - Cannot test family member addition")
                return False
            
            # Create test family member data using form data (as the endpoint expects)
            unique_id = str(uuid.uuid4())[:8]
            
            form_data = {
                "unit_id": target_unit_id,
                "full_name": f"أحمد محمد علي {unique_id}",
                "relationship": "son",
                "age": "25",
                "birthday": "1999-01-15",
                "phone": "+966501234567",
                "email": f"ahmed.{unique_id}@example.com",
                "id_number": f"ID{unique_id}",
                "emergency_contact_name": "فاطمة أحمد",
                "emergency_contact_phone": "+966509876543",
                "move_in_date": "2024-01-01"
            }
            
            # Remove Content-Type header for form data
            form_headers = {"Authorization": f"Bearer {self.admin_token}"}
            
            response = self.session.post(f"{BASE_URL}/family-members/add-to-unit", 
                                       data=form_data, headers=form_headers)
            
            print(f"Add Family Member to Unit Response Status: {response.status_code}")
            if response.status_code != 200:
                print(f"Add Family Member to Unit Response Text: {response.text}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Verify response structure
                    if "message" not in data:
                        self.log_result("Add Family Member to Unit", False, 
                                      f"❌ INVALID RESPONSE - Missing 'message' field: {data}")
                        return False
                    
                    if "family_member" not in data:
                        self.log_result("Add Family Member to Unit", False, 
                                      f"❌ INVALID RESPONSE - Missing 'family_member' field: {data}")
                        return False
                    
                    created_member = data["family_member"]
                    
                    # Verify created member has ID
                    if "id" not in created_member:
                        self.log_result("Add Family Member to Unit", False, 
                                      f"❌ CREATED MEMBER MISSING ID: {created_member}")
                        return False
                    
                    # Store the created member ID for update/delete tests
                    self.test_member_id = created_member["id"]
                    
                    self.log_result("Add Family Member to Unit", True, 
                                  f"✅ FAMILY MEMBER ADDED TO UNIT SUCCESSFULLY - Name: {form_data['full_name']}, "
                                  f"Unit: {target_unit_number}, ID: {self.test_member_id}")
                    
                    # Verify the data was stored correctly
                    if created_member.get("full_name") == form_data["full_name"]:
                        self.log_result("Family Member Data Storage", True, 
                                      f"✅ DATA STORED CORRECTLY - Name matches: {created_member.get('full_name')}")
                    else:
                        self.log_result("Family Member Data Storage", False, 
                                      f"❌ DATA MISMATCH - Expected: {form_data['full_name']}, "
                                      f"Got: {created_member.get('full_name')}")
                        return False
                    
                    return True
                    
                except json.JSONDecodeError as e:
                    self.log_result("Add Family Member to Unit", False, 
                                  f"❌ JSON DECODE ERROR - Invalid JSON response: {str(e)}")
                    return False
                    
            elif response.status_code == 400:
                self.log_result("Add Family Member to Unit", False, 
                              f"❌ BAD REQUEST - Invalid family member data: {response.text}")
                return False
                
            elif response.status_code == 401:
                self.log_result("Add Family Member to Unit", False, 
                              f"❌ AUTHENTICATION FAILED - Token not accepted")
                return False
                
            elif response.status_code == 403:
                self.log_result("Add Family Member to Unit", False, 
                              f"❌ ACCESS DENIED - User cannot add family members")
                return False
                
            elif response.status_code == 404:
                self.log_result("Add Family Member to Unit", False, 
                              f"❌ ENDPOINT NOT FOUND - /api/family-members/add-to-unit does not exist")
                return False
                
            elif response.status_code == 500:
                self.log_result("Add Family Member to Unit", False, 
                              f"❌ SERVER ERROR - Internal server error: {response.text}")
                return False
                
            else:
                self.log_result("Add Family Member to Unit", False, 
                              f"❌ UNEXPECTED STATUS {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Add Family Member to Unit", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def test_update_family_member_endpoint(self):
        """Test PUT /api/family-members/{member_id} - Update family member"""
        print("\n=== Testing Update Family Member Endpoint ===")
        
        if not self.admin_token:
            self.log_result("Update Family Member", False, "No admin token available")
            return False
        
        if not hasattr(self, 'test_member_id'):
            self.log_result("Update Family Member", False, "No test member ID available (add test must run first)")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Create update data
            update_data = {
                "full_name": "أحمد محمد علي المحدث",  # Updated Arabic name
                "age": 26,  # Updated age
                "phone": "+966501234999",  # Updated phone
                "email": "ahmed.updated@example.com"  # Updated email
            }
            
            response = self.session.put(f"{BASE_URL}/family-members/{self.test_member_id}", 
                                      json=update_data, headers=headers)
            
            print(f"Update Family Member Response Status: {response.status_code}")
            if response.status_code != 200:
                print(f"Update Family Member Response Text: {response.text}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Verify response structure
                    if "message" not in data:
                        self.log_result("Update Family Member", False, 
                                      f"❌ INVALID RESPONSE - Missing 'message' field: {data}")
                        return False
                    
                    self.log_result("Update Family Member", True, 
                                  f"✅ FAMILY MEMBER UPDATED SUCCESSFULLY - ID: {self.test_member_id}")
                    
                    # Verify the update by fetching the member again
                    return self.verify_family_member_update(update_data)
                    
                except json.JSONDecodeError as e:
                    self.log_result("Update Family Member", False, 
                                  f"❌ JSON DECODE ERROR - Invalid JSON response: {str(e)}")
                    return False
                    
            elif response.status_code == 400:
                self.log_result("Update Family Member", False, 
                              f"❌ BAD REQUEST - Invalid update data: {response.text}")
                return False
                
            elif response.status_code == 401:
                self.log_result("Update Family Member", False, 
                              f"❌ AUTHENTICATION FAILED - Token not accepted")
                return False
                
            elif response.status_code == 403:
                self.log_result("Update Family Member", False, 
                              f"❌ ACCESS DENIED - User cannot update family members")
                return False
                
            elif response.status_code == 404:
                self.log_result("Update Family Member", False, 
                              f"❌ MEMBER NOT FOUND - Family member {self.test_member_id} not found")
                return False
                
            elif response.status_code == 500:
                self.log_result("Update Family Member", False, 
                              f"❌ SERVER ERROR - Internal server error: {response.text}")
                return False
                
            else:
                self.log_result("Update Family Member", False, 
                              f"❌ UNEXPECTED STATUS {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Update Family Member", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def verify_family_member_update(self, expected_data):
        """Verify that the family member was actually updated"""
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/family-members", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                family_members = data.get("family_members", [])
                
                # Find the updated member
                updated_member = None
                for member in family_members:
                    if member.get("id") == self.test_member_id:
                        updated_member = member
                        break
                
                if updated_member:
                    # Check if the updates were applied
                    if (updated_member.get("full_name") == expected_data["full_name"] and
                        updated_member.get("age") == expected_data["age"]):
                        self.log_result("Update Verification", True, 
                                      f"✅ UPDATE VERIFIED - Data correctly updated in database")
                        return True
                    else:
                        self.log_result("Update Verification", False, 
                                      f"❌ UPDATE NOT APPLIED - Expected: {expected_data}, "
                                      f"Got: {updated_member}")
                        return False
                else:
                    self.log_result("Update Verification", False, 
                                  f"❌ UPDATED MEMBER NOT FOUND - ID: {self.test_member_id}")
                    return False
            else:
                self.log_result("Update Verification", False, 
                              f"❌ CANNOT VERIFY UPDATE - List endpoint failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Update Verification", False, f"❌ VERIFICATION EXCEPTION: {str(e)}")
            return False

    def test_delete_family_member_endpoint(self):
        """Test DELETE /api/family-members/{member_id} - Delete family member"""
        print("\n=== Testing Delete Family Member Endpoint ===")
        
        if not self.admin_token:
            self.log_result("Delete Family Member", False, "No admin token available")
            return False
        
        if not hasattr(self, 'test_member_id'):
            self.log_result("Delete Family Member", False, "No test member ID available (add test must run first)")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            response = self.session.delete(f"{BASE_URL}/family-members/{self.test_member_id}", headers=headers)
            
            print(f"Delete Family Member Response Status: {response.status_code}")
            if response.status_code != 200:
                print(f"Delete Family Member Response Text: {response.text}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    
                    # Verify response structure
                    if "message" not in data:
                        self.log_result("Delete Family Member", False, 
                                      f"❌ INVALID RESPONSE - Missing 'message' field: {data}")
                        return False
                    
                    self.log_result("Delete Family Member", True, 
                                  f"✅ FAMILY MEMBER DELETED SUCCESSFULLY - ID: {self.test_member_id}")
                    
                    # Verify the deletion by checking if member is no longer active
                    return self.verify_family_member_deletion()
                    
                except json.JSONDecodeError as e:
                    self.log_result("Delete Family Member", False, 
                                  f"❌ JSON DECODE ERROR - Invalid JSON response: {str(e)}")
                    return False
                    
            elif response.status_code == 401:
                self.log_result("Delete Family Member", False, 
                              f"❌ AUTHENTICATION FAILED - Token not accepted")
                return False
                
            elif response.status_code == 403:
                self.log_result("Delete Family Member", False, 
                              f"❌ ACCESS DENIED - User cannot delete family members")
                return False
                
            elif response.status_code == 404:
                self.log_result("Delete Family Member", False, 
                              f"❌ MEMBER NOT FOUND - Family member {self.test_member_id} not found")
                return False
                
            elif response.status_code == 500:
                self.log_result("Delete Family Member", False, 
                              f"❌ SERVER ERROR - Internal server error: {response.text}")
                return False
                
            else:
                self.log_result("Delete Family Member", False, 
                              f"❌ UNEXPECTED STATUS {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Delete Family Member", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def verify_family_member_deletion(self):
        """Verify that the family member was actually deleted (soft delete - is_active = false)"""
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/family-members", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                family_members = data.get("family_members", [])
                
                # Check if the deleted member is no longer in the active list
                deleted_member_found = False
                for member in family_members:
                    if member.get("id") == self.test_member_id:
                        deleted_member_found = True
                        break
                
                if not deleted_member_found:
                    self.log_result("Delete Verification", True, 
                                  f"✅ DELETE VERIFIED - Member no longer in active list")
                    return True
                else:
                    self.log_result("Delete Verification", False, 
                                  f"❌ DELETE NOT APPLIED - Member still in active list")
                    return False
            else:
                self.log_result("Delete Verification", False, 
                              f"❌ CANNOT VERIFY DELETE - List endpoint failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Delete Verification", False, f"❌ VERIFICATION EXCEPTION: {str(e)}")
            return False

    def test_authentication_security(self):
        """Test authentication security for family management endpoints"""
        print("\n=== Testing Authentication Security ===")
        
        try:
            # Test with no token
            response_no_token = self.session.get(f"{BASE_URL}/family-members")
            
            # Test with invalid token
            invalid_headers = {"Authorization": "Bearer invalid_token_123", "Content-Type": "application/json"}
            response_invalid_token = self.session.get(f"{BASE_URL}/family-members", headers=invalid_headers)
            
            # Both should return 401 Unauthorized
            if response_no_token.status_code == 401 and response_invalid_token.status_code == 401:
                self.log_result("Authentication Security", True, 
                              f"✅ AUTHENTICATION SECURITY WORKING - Unauthorized access properly rejected")
                return True
            else:
                self.log_result("Authentication Security", False, 
                              f"❌ SECURITY ISSUE - No token: {response_no_token.status_code}, "
                              f"Invalid token: {response_invalid_token.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Authentication Security", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def test_database_connectivity(self):
        """Test database connectivity through family management endpoints"""
        print("\n=== Testing Database Connectivity ===")
        
        if not self.admin_token:
            self.log_result("Database Connectivity", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test database read operation
            response = self.session.get(f"{BASE_URL}/family-members", headers=headers)
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "family_members" in data:
                        self.log_result("Database Connectivity", True, 
                                      f"✅ DATABASE CONNECTION WORKING - Successfully retrieved family members data")
                        return True
                    else:
                        self.log_result("Database Connectivity", False, 
                                      f"❌ DATABASE RESPONSE ISSUE - Invalid response structure: {data}")
                        return False
                except json.JSONDecodeError:
                    self.log_result("Database Connectivity", False, 
                                  f"❌ DATABASE RESPONSE ISSUE - Invalid JSON response")
                    return False
            elif response.status_code == 500:
                self.log_result("Database Connectivity", False, 
                              f"❌ DATABASE CONNECTION ISSUE - Server error: {response.text}")
                return False
            else:
                self.log_result("Database Connectivity", False, 
                              f"❌ UNEXPECTED DATABASE RESPONSE - Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Database Connectivity", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def test_error_handling(self):
        """Test error handling for various scenarios"""
        print("\n=== Testing Error Handling ===")
        
        if not self.admin_token:
            self.log_result("Error Handling", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test 1: Invalid family member data
            invalid_data = {
                "full_name": "",  # Empty name should be invalid
                "age": -5,  # Negative age should be invalid
                "relationship": "invalid_relationship"  # Invalid relationship
            }
            
            response_invalid = self.session.post(f"{BASE_URL}/family-members", json=invalid_data, headers=headers)
            
            # Test 2: Non-existent member update
            fake_member_id = "non-existent-member-id"
            update_data = {"full_name": "Test Update"}
            
            response_not_found = self.session.put(f"{BASE_URL}/family-members/{fake_member_id}", 
                                                json=update_data, headers=headers)
            
            # Test 3: Non-existent member delete
            response_delete_not_found = self.session.delete(f"{BASE_URL}/family-members/{fake_member_id}", 
                                                          headers=headers)
            
            # Evaluate error handling
            error_handling_score = 0
            total_tests = 3
            
            # Check invalid data handling
            if response_invalid.status_code in [400, 422]:  # Bad Request or Unprocessable Entity
                error_handling_score += 1
                self.log_result("Invalid Data Handling", True, 
                              f"✅ INVALID DATA PROPERLY REJECTED - Status: {response_invalid.status_code}")
            else:
                self.log_result("Invalid Data Handling", False, 
                              f"❌ INVALID DATA NOT REJECTED - Status: {response_invalid.status_code}")
            
            # Check not found handling for update
            if response_not_found.status_code == 404:
                error_handling_score += 1
                self.log_result("Update Not Found Handling", True, 
                              f"✅ NON-EXISTENT UPDATE PROPERLY HANDLED - Status: 404")
            else:
                self.log_result("Update Not Found Handling", False, 
                              f"❌ NON-EXISTENT UPDATE NOT HANDLED - Status: {response_not_found.status_code}")
            
            # Check not found handling for delete
            if response_delete_not_found.status_code == 404:
                error_handling_score += 1
                self.log_result("Delete Not Found Handling", True, 
                              f"✅ NON-EXISTENT DELETE PROPERLY HANDLED - Status: 404")
            else:
                self.log_result("Delete Not Found Handling", False, 
                              f"❌ NON-EXISTENT DELETE NOT HANDLED - Status: {response_delete_not_found.status_code}")
            
            # Overall error handling assessment
            if error_handling_score == total_tests:
                self.log_result("Error Handling", True, 
                              f"✅ ERROR HANDLING EXCELLENT - {error_handling_score}/{total_tests} tests passed")
                return True
            elif error_handling_score >= total_tests * 0.7:  # 70% threshold
                self.log_result("Error Handling", True, 
                              f"✅ ERROR HANDLING GOOD - {error_handling_score}/{total_tests} tests passed")
                return True
            else:
                self.log_result("Error Handling", False, 
                              f"❌ ERROR HANDLING POOR - {error_handling_score}/{total_tests} tests passed")
                return False
                
        except Exception as e:
            self.log_result("Error Handling", False, f"❌ EXCEPTION: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all family management tests"""
        print("🏠 HomeMe Family Management Testing Suite")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_admin_authentication,
            self.test_authentication_security,
            self.test_database_connectivity,
            self.test_family_members_list_endpoint,
            self.test_add_family_member_endpoint,
            self.test_update_family_member_endpoint,
            self.test_delete_family_member_endpoint,
            self.test_error_handling
        ]
        
        passed_tests = 0
        total_tests = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed_tests += 1
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 60)
        print("🏠 FAMILY MANAGEMENT TESTING SUMMARY")
        print("=" * 60)
        
        success_rate = (passed_tests / total_tests) * 100
        
        for result in self.results:
            print(f"{result['status']} - {result['test']}: {result['message']}")
        
        print(f"\n📊 OVERALL RESULTS: {passed_tests}/{total_tests} tests passed ({success_rate:.1f}%)")
        
        if success_rate >= 90:
            print("🎉 EXCELLENT - Family Management is working very well!")
        elif success_rate >= 70:
            print("✅ GOOD - Family Management is mostly working with minor issues")
        elif success_rate >= 50:
            print("⚠️ FAIR - Family Management has some significant issues")
        else:
            print("❌ POOR - Family Management has major issues that need attention")
        
        return success_rate >= 70  # Return True if 70% or more tests pass

if __name__ == "__main__":
    test_suite = FamilyManagementTestSuite()
    test_suite.run_all_tests()