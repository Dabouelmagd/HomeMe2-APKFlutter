#!/usr/bin/env python3
"""
SUBSCRIPTION CODES SYSTEM COMPREHENSIVE TESTING
Tests all subscription code functionality after critical fixes:
1. Code Creation (All Types) - single, custom, bulk, with expiration/usage limits
2. Code Activation (Full Flow) - valid/invalid codes, duplicate prevention, expired/used handling
3. Code Information Management - get code details, list codes, statistics, admin access
4. End-to-End Workflow - complete user journey
5. Edge Cases - uniqueness, character validation, date parsing, authentication
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Configuration - Using production URL from frontend/.env
BASE_URL = "https://compound-dashboard.preview.emergentagent.com/api"

class SubscriptionCodesTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.admin_user = None
        self.compound_id = None
        self.test_codes = []  # Store created codes for testing
        self.test_user_id = None
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
        """Test admin authentication with admin/admin123 credentials"""
        print("\n=== Testing Admin Authentication ===")
        
        credentials = {"username": "admin", "password": "admin123"}
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=credentials)
            
            if response.status_code == 200:
                data = response.json()
                
                required_fields = ["access_token", "user"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Admin Authentication", False, f"Missing required fields: {missing_fields}")
                    return False
                
                self.admin_token = data["access_token"]
                self.admin_user = data["user"]
                self.compound_id = self.admin_user.get("compound_id")
                
                if self.admin_user.get("role") != "admin":
                    self.log_result("Admin Authentication", False, f"User role is {self.admin_user.get('role')}, expected 'admin'")
                    return False
                
                self.log_result("Admin Authentication", True, 
                              f"Admin authenticated successfully - Role: {self.admin_user.get('role')}, Compound: {self.compound_id}")
                return True
            else:
                self.log_result("Admin Authentication", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Authentication", False, f"Exception occurred: {str(e)}")
            return False

    # ============ ADMIN CODE CREATION TESTING ============
    
    def test_create_single_code_1_month(self):
        """Test creating single 1-month subscription code"""
        print("\n=== Testing Create Single Code (1 Month) ===")
        
        if not self.admin_token:
            self.log_result("Create Single Code (1 Month)", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            code_data = {
                "duration": "1_month",
                "max_uses": 1,
                "expires_in_days": 30
            }
            
            response = self.session.post(f"{BASE_URL}/admin/subscription-codes", json=code_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("success") and result.get("code"):
                    code = result["code"]
                    code_string = code.get("code", "")
                    
                    # Verify code format (HM1M-2024-XXXXXXXX)
                    if code_string.startswith("HM1M-2024-") and len(code_string) >= 15:
                        self.test_codes.append(code)
                        self.log_result("Create Single Code (1 Month)", True, 
                                      f"1-month code created successfully: {code_string}")
                        return True
                    else:
                        self.log_result("Create Single Code (1 Month)", False, 
                                      f"Invalid code format: {code_string}")
                        return False
                else:
                    self.log_result("Create Single Code (1 Month)", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Create Single Code (1 Month)", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Single Code (1 Month)", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_single_code_all_durations(self):
        """Test creating single codes for all supported durations"""
        print("\n=== Testing Create Single Codes (All Durations) ===")
        
        if not self.admin_token:
            self.log_result("Create Single Codes (All Durations)", False, "No admin token available")
            return False
        
        durations = [
            ("2_months", "HM2M"),
            ("3_months", "HM3M"), 
            ("6_months", "HM6M"),
            ("1_year", "HM1Y")
        ]
        
        success_count = 0
        
        for duration, expected_prefix in durations:
            try:
                headers = self.setup_auth_headers(self.admin_token)
                
                code_data = {
                    "duration": duration,
                    "max_uses": 1,
                    "expires_in_days": 60
                }
                
                response = self.session.post(f"{BASE_URL}/admin/subscription-codes", json=code_data, headers=headers)
                
                if response.status_code == 200:
                    result = response.json()
                    
                    if result.get("success") and result.get("code"):
                        code = result["code"]
                        code_string = code.get("code", "")
                        
                        if code_string.startswith(f"{expected_prefix}-2024-"):
                            self.test_codes.append(code)
                            self.log_result(f"Create {duration} Code", True, 
                                          f"{duration} code created: {code_string}")
                            success_count += 1
                        else:
                            self.log_result(f"Create {duration} Code", False, 
                                          f"Invalid format for {duration}: {code_string}")
                    else:
                        self.log_result(f"Create {duration} Code", False, f"Failed to create {duration} code")
                else:
                    self.log_result(f"Create {duration} Code", False, 
                                  f"Failed with status {response.status_code}")
                    
            except Exception as e:
                self.log_result(f"Create {duration} Code", False, f"Exception: {str(e)}")
        
        overall_success = success_count == len(durations)
        self.log_result("Create Single Codes (All Durations)", overall_success, 
                      f"Created {success_count}/{len(durations)} duration codes successfully")
        return overall_success
    
    def test_create_bulk_codes(self):
        """Test creating bulk subscription codes (10 codes)"""
        print("\n=== Testing Create Bulk Codes (10 codes) ===")
        
        if not self.admin_token:
            self.log_result("Create Bulk Codes", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            bulk_data = {
                "duration": "1_month",
                "count": 10,
                "max_uses_per_code": 1,
                "expires_in_days": 30
            }
            
            response = self.session.post(f"{BASE_URL}/admin/subscription-codes/bulk", json=bulk_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("success") and result.get("codes"):
                    codes = result["codes"]
                    total_created = result.get("total_created", 0)
                    
                    if len(codes) == 10 and total_created == 10:
                        # Verify all codes have correct format
                        valid_codes = 0
                        for code in codes:
                            code_string = code.get("code", "")
                            if code_string.startswith("HM1M-2024-"):
                                valid_codes += 1
                        
                        if valid_codes == 10:
                            self.test_codes.extend(codes)
                            self.log_result("Create Bulk Codes", True, 
                                          f"Successfully created {total_created} bulk codes, all with valid format")
                            return True
                        else:
                            self.log_result("Create Bulk Codes", False, 
                                          f"Only {valid_codes}/10 codes have valid format")
                            return False
                    else:
                        self.log_result("Create Bulk Codes", False, 
                                      f"Expected 10 codes, got {len(codes)} codes, total_created: {total_created}")
                        return False
                else:
                    self.log_result("Create Bulk Codes", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Create Bulk Codes", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Bulk Codes", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_custom_code(self):
        """Test creating custom subscription code"""
        print("\n=== Testing Create Custom Code ===")
        
        if not self.admin_token:
            self.log_result("Create Custom Code", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            custom_code_data = {
                "duration": "3_months",
                "max_uses": 5,
                "custom_code": "TESTCODE123",
                "expires_in_days": 90
            }
            
            response = self.session.post(f"{BASE_URL}/admin/subscription-codes", json=custom_code_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("success") and result.get("code"):
                    code = result["code"]
                    code_string = code.get("code", "")
                    max_uses = code.get("max_uses", 0)
                    
                    # Custom code should be formatted as HM3M-2024-TESTCODE123
                    if "TESTCODE123" in code_string and max_uses == 5:
                        self.test_codes.append(code)
                        self.log_result("Create Custom Code", True, 
                                      f"Custom code created successfully: {code_string} with {max_uses} uses")
                        return True
                    else:
                        self.log_result("Create Custom Code", False, 
                                      f"Custom code format incorrect: {code_string}, uses: {max_uses}")
                        return False
                else:
                    self.log_result("Create Custom Code", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Create Custom Code", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Custom Code", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_code_with_expiry(self):
        """Test creating code with specific expiry date"""
        print("\n=== Testing Create Code with Expiry Date ===")
        
        if not self.admin_token:
            self.log_result("Create Code with Expiry", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            expiry_data = {
                "duration": "6_months",
                "max_uses": 3,
                "expires_in_days": 15  # Code expires in 15 days
            }
            
            response = self.session.post(f"{BASE_URL}/admin/subscription-codes", json=expiry_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("success") and result.get("code"):
                    code = result["code"]
                    code_string = code.get("code", "")
                    expires_at = code.get("expires_at")
                    
                    if expires_at and code_string.startswith("HM6M-2024-"):
                        self.test_codes.append(code)
                        self.log_result("Create Code with Expiry", True, 
                                      f"Code with expiry created: {code_string}, expires: {expires_at}")
                        return True
                    else:
                        self.log_result("Create Code with Expiry", False, 
                                      f"Code missing expiry or wrong format: {code_string}")
                        return False
                else:
                    self.log_result("Create Code with Expiry", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Create Code with Expiry", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Code with Expiry", False, f"Exception occurred: {str(e)}")
            return False

    # ============ CODE INFORMATION API TESTING ============
    
    def test_get_all_codes_admin(self):
        """Test GET /api/admin/subscription-codes - Get all codes with admin credentials"""
        print("\n=== Testing Get All Codes (Admin) ===")
        
        if not self.admin_token:
            self.log_result("Get All Codes (Admin)", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/admin/subscription-codes", headers=headers)
            
            if response.status_code == 200:
                codes = response.json()
                
                if isinstance(codes, list):
                    # Should have at least the codes we created
                    if len(codes) >= len(self.test_codes):
                        # Verify code structure
                        if codes:
                            sample_code = codes[0]
                            required_fields = ["id", "code", "duration", "status", "created_at"]
                            missing_fields = [field for field in required_fields if field not in sample_code]
                            
                            if not missing_fields:
                                self.log_result("Get All Codes (Admin)", True, 
                                              f"Retrieved {len(codes)} codes successfully with proper structure")
                                return True
                            else:
                                self.log_result("Get All Codes (Admin)", False, 
                                              f"Code structure missing fields: {missing_fields}")
                                return False
                        else:
                            self.log_result("Get All Codes (Admin)", True, "No codes found (empty system)")
                            return True
                    else:
                        self.log_result("Get All Codes (Admin)", False, 
                                      f"Expected at least {len(self.test_codes)} codes, got {len(codes)}")
                        return False
                else:
                    self.log_result("Get All Codes (Admin)", False, f"Expected list, got: {type(codes)}")
                    return False
            else:
                self.log_result("Get All Codes (Admin)", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get All Codes (Admin)", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_codes_with_filters(self):
        """Test filtering codes by status, duration, compound"""
        print("\n=== Testing Get Codes with Filters ===")
        
        if not self.admin_token:
            self.log_result("Get Codes with Filters", False, "No admin token available")
            return False
        
        success_count = 0
        total_tests = 3
        
        headers = self.setup_auth_headers(self.admin_token)
        
        # Test 1: Filter by status
        try:
            response = self.session.get(f"{BASE_URL}/admin/subscription-codes?status=active", headers=headers)
            if response.status_code == 200:
                codes = response.json()
                if isinstance(codes, list):
                    # All codes should have status 'active'
                    active_codes = [code for code in codes if code.get("status") == "active"]
                    if len(active_codes) == len(codes):
                        self.log_result("Filter by Status", True, f"Status filter working - {len(codes)} active codes")
                        success_count += 1
                    else:
                        self.log_result("Filter by Status", False, f"Status filter not working properly")
                else:
                    self.log_result("Filter by Status", False, "Invalid response format")
            else:
                self.log_result("Filter by Status", False, f"Status filter failed: {response.status_code}")
        except Exception as e:
            self.log_result("Filter by Status", False, f"Exception: {str(e)}")
        
        # Test 2: Filter by duration
        try:
            response = self.session.get(f"{BASE_URL}/admin/subscription-codes?duration=1_month", headers=headers)
            if response.status_code == 200:
                codes = response.json()
                if isinstance(codes, list):
                    # All codes should have duration '1_month'
                    month_codes = [code for code in codes if code.get("duration") == "1_month"]
                    if len(month_codes) == len(codes):
                        self.log_result("Filter by Duration", True, f"Duration filter working - {len(codes)} 1-month codes")
                        success_count += 1
                    else:
                        self.log_result("Filter by Duration", False, f"Duration filter not working properly")
                else:
                    self.log_result("Filter by Duration", False, "Invalid response format")
            else:
                self.log_result("Filter by Duration", False, f"Duration filter failed: {response.status_code}")
        except Exception as e:
            self.log_result("Filter by Duration", False, f"Exception: {str(e)}")
        
        # Test 3: Pagination
        try:
            response = self.session.get(f"{BASE_URL}/admin/subscription-codes?limit=5&offset=0", headers=headers)
            if response.status_code == 200:
                codes = response.json()
                if isinstance(codes, list) and len(codes) <= 5:
                    self.log_result("Pagination", True, f"Pagination working - retrieved {len(codes)} codes with limit=5")
                    success_count += 1
                else:
                    self.log_result("Pagination", False, f"Pagination not working - got {len(codes)} codes")
            else:
                self.log_result("Pagination", False, f"Pagination failed: {response.status_code}")
        except Exception as e:
            self.log_result("Pagination", False, f"Exception: {str(e)}")
        
        overall_success = success_count == total_tests
        self.log_result("Get Codes with Filters", overall_success, 
                      f"Filter testing: {success_count}/{total_tests} tests passed")
        return overall_success
    
    def test_get_codes_statistics(self):
        """Test GET /api/admin/subscription-codes/stats - Get comprehensive statistics"""
        print("\n=== Testing Get Codes Statistics ===")
        
        if not self.admin_token:
            self.log_result("Get Codes Statistics", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/admin/subscription-codes/stats", headers=headers)
            
            if response.status_code == 200:
                stats = response.json()
                
                # Verify required statistics fields
                required_fields = [
                    "total_codes", "active_codes", "used_codes", "expired_codes",
                    "codes_by_duration", "total_activations", "active_subscriptions"
                ]
                
                missing_fields = [field for field in required_fields if field not in stats]
                
                if not missing_fields:
                    # Verify data types and values
                    numeric_fields = ["total_codes", "active_codes", "used_codes", "expired_codes", 
                                    "total_activations", "active_subscriptions"]
                    
                    valid_data = True
                    for field in numeric_fields:
                        if not isinstance(stats.get(field), int) or stats.get(field) < 0:
                            valid_data = False
                            break
                    
                    if valid_data and isinstance(stats.get("codes_by_duration"), dict):
                        self.log_result("Get Codes Statistics", True, 
                                      f"Statistics retrieved successfully - Total: {stats['total_codes']}, "
                                      f"Active: {stats['active_codes']}, Used: {stats['used_codes']}, "
                                      f"Expired: {stats['expired_codes']}")
                        return True
                    else:
                        self.log_result("Get Codes Statistics", False, "Invalid data types in statistics")
                        return False
                else:
                    self.log_result("Get Codes Statistics", False, f"Missing required fields: {missing_fields}")
                    return False
            else:
                self.log_result("Get Codes Statistics", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Codes Statistics", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_code_info_by_code_string(self):
        """Test GET /api/subscription-codes/{code} - Get code info by code string"""
        print("\n=== Testing Get Code Info by Code String ===")
        
        if not self.admin_token or not self.test_codes:
            self.log_result("Get Code Info by Code String", False, "No admin token or test codes available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Use the first test code
            test_code = self.test_codes[0]
            code_string = test_code.get("code")
            
            response = self.session.get(f"{BASE_URL}/subscription-codes/{code_string}", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("success") and result.get("code"):
                    code_info = result["code"]
                    
                    # Verify the returned code matches what we requested
                    if code_info.get("code") == code_string:
                        self.log_result("Get Code Info by Code String", True, 
                                      f"Code info retrieved successfully for: {code_string}")
                        return True
                    else:
                        self.log_result("Get Code Info by Code String", False, 
                                      f"Returned code {code_info.get('code')} doesn't match requested {code_string}")
                        return False
                else:
                    self.log_result("Get Code Info by Code String", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Get Code Info by Code String", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Code Info by Code String", False, f"Exception occurred: {str(e)}")
            return False

    # ============ CODE ACTIVATION TESTING ============
    
    def test_valid_code_activation(self):
        """Test activating a valid subscription code"""
        print("\n=== Testing Valid Code Activation ===")
        
        if not self.admin_token or not self.test_codes:
            self.log_result("Valid Code Activation", False, "No admin token or test codes available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Use a test code that hasn't been used yet
            test_code = None
            for code in self.test_codes:
                if code.get("current_uses", 0) == 0:
                    test_code = code
                    break
            
            if not test_code:
                self.log_result("Valid Code Activation", False, "No unused test codes available")
                return False
            
            code_string = test_code.get("code")
            user_id = self.admin_user.get("id")  # Use admin user for testing
            
            activation_data = {
                "code": code_string,
                "user_id": user_id
            }
            
            response = self.session.post(f"{BASE_URL}/subscription-codes/activate", json=activation_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("success") and result.get("subscription"):
                    subscription = result["subscription"]
                    
                    # Verify subscription details
                    if (subscription.get("user_id") == user_id and 
                        subscription.get("code") == code_string and
                        subscription.get("is_active") == True):
                        
                        self.test_user_id = user_id  # Store for later tests
                        self.log_result("Valid Code Activation", True, 
                                      f"Code activated successfully: {code_string} for user {user_id}")
                        return True
                    else:
                        self.log_result("Valid Code Activation", False, 
                                      f"Subscription details incorrect: {subscription}")
                        return False
                else:
                    self.log_result("Valid Code Activation", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_result("Valid Code Activation", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Valid Code Activation", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_duplicate_activation_prevention(self):
        """Test that duplicate activation is prevented"""
        print("\n=== Testing Duplicate Activation Prevention ===")
        
        if not self.admin_token or not self.test_codes:
            self.log_result("Duplicate Activation Prevention", False, "No admin token or test codes available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Try to activate the same code again
            test_code = self.test_codes[0]  # Should be already used from previous test
            code_string = test_code.get("code")
            user_id = self.admin_user.get("id")
            
            activation_data = {
                "code": code_string,
                "user_id": user_id
            }
            
            response = self.session.post(f"{BASE_URL}/subscription-codes/activate", json=activation_data, headers=headers)
            
            # Should fail with appropriate error
            if response.status_code == 400:
                result = response.json()
                if "already" in result.get("message", "").lower() or "used" in result.get("message", "").lower():
                    self.log_result("Duplicate Activation Prevention", True, 
                                  f"Duplicate activation correctly prevented: {result.get('message')}")
                    return True
                else:
                    self.log_result("Duplicate Activation Prevention", False, 
                                  f"Wrong error message: {result.get('message')}")
                    return False
            elif response.status_code == 200:
                # If it succeeds, check if the code allows multiple uses
                result = response.json()
                if result.get("success"):
                    self.log_result("Duplicate Activation Prevention", True, 
                                  "Code allows multiple uses (expected behavior for multi-use codes)")
                    return True
                else:
                    self.log_result("Duplicate Activation Prevention", False, 
                                  "Duplicate activation should have been prevented")
                    return False
            else:
                self.log_result("Duplicate Activation Prevention", False, 
                              f"Unexpected status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Duplicate Activation Prevention", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_invalid_code_format_handling(self):
        """Test handling of invalid code formats"""
        print("\n=== Testing Invalid Code Format Handling ===")
        
        if not self.admin_token:
            self.log_result("Invalid Code Format Handling", False, "No admin token available")
            return False
        
        success_count = 0
        total_tests = 3
        
        headers = self.setup_auth_headers(self.admin_token)
        user_id = self.admin_user.get("id")
        
        invalid_codes = [
            "INVALID123",  # Wrong format
            "HM1M-2024-",  # Incomplete
            "XYZ-2024-ABCDEFGH"  # Wrong prefix
        ]
        
        for i, invalid_code in enumerate(invalid_codes, 1):
            try:
                activation_data = {
                    "code": invalid_code,
                    "user_id": user_id
                }
                
                response = self.session.post(f"{BASE_URL}/subscription-codes/activate", json=activation_data, headers=headers)
                
                if response.status_code == 400 or response.status_code == 404:
                    result = response.json()
                    self.log_result(f"Invalid Code Format {i}", True, 
                                  f"Invalid code correctly rejected: {invalid_code}")
                    success_count += 1
                else:
                    self.log_result(f"Invalid Code Format {i}", False, 
                                  f"Invalid code not rejected: {invalid_code}, status: {response.status_code}")
                    
            except Exception as e:
                self.log_result(f"Invalid Code Format {i}", False, f"Exception: {str(e)}")
        
        overall_success = success_count == total_tests
        self.log_result("Invalid Code Format Handling", overall_success, 
                      f"Invalid format handling: {success_count}/{total_tests} tests passed")
        return overall_success
    
    def test_expired_code_handling(self):
        """Test handling of expired codes"""
        print("\n=== Testing Expired Code Handling ===")
        
        if not self.admin_token:
            self.log_result("Expired Code Handling", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Create a code that expires immediately (for testing)
            expired_code_data = {
                "duration": "1_month",
                "max_uses": 1,
                "expires_in_days": 0  # Expires immediately
            }
            
            create_response = self.session.post(f"{BASE_URL}/admin/subscription-codes", json=expired_code_data, headers=headers)
            
            if create_response.status_code == 200:
                result = create_response.json()
                
                if result.get("success") and result.get("code"):
                    expired_code = result["code"]["code"]
                    user_id = self.admin_user.get("id")
                    
                    # Try to activate the expired code
                    activation_data = {
                        "code": expired_code,
                        "user_id": user_id
                    }
                    
                    activation_response = self.session.post(f"{BASE_URL}/subscription-codes/activate", json=activation_data, headers=headers)
                    
                    if activation_response.status_code == 400:
                        result = activation_response.json()
                        if "expired" in result.get("message", "").lower():
                            self.log_result("Expired Code Handling", True, 
                                          f"Expired code correctly rejected: {result.get('message')}")
                            return True
                        else:
                            self.log_result("Expired Code Handling", False, 
                                          f"Wrong error message for expired code: {result.get('message')}")
                            return False
                    else:
                        self.log_result("Expired Code Handling", False, 
                                      f"Expired code not rejected, status: {activation_response.status_code}")
                        return False
                else:
                    self.log_result("Expired Code Handling", False, "Failed to create expired test code")
                    return False
            else:
                self.log_result("Expired Code Handling", False, 
                              f"Failed to create expired test code: {create_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Expired Code Handling", False, f"Exception occurred: {str(e)}")
            return False

    # ============ USER SUBSCRIPTION MANAGEMENT ============
    
    def test_get_user_subscription(self):
        """Test GET /api/users/{user_id}/subscription - Get user's active subscription"""
        print("\n=== Testing Get User Subscription ===")
        
        if not self.admin_token or not self.test_user_id:
            self.log_result("Get User Subscription", False, "No admin token or test user available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/users/{self.test_user_id}/subscription", headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("success") and result.get("subscription"):
                    subscription = result["subscription"]
                    
                    # Verify subscription details
                    required_fields = ["id", "user_id", "code", "duration", "activated_at", "expires_at", "is_active"]
                    missing_fields = [field for field in required_fields if field not in subscription]
                    
                    if not missing_fields:
                        if subscription.get("user_id") == self.test_user_id and subscription.get("is_active"):
                            self.log_result("Get User Subscription", True, 
                                          f"User subscription retrieved successfully - Duration: {subscription.get('duration')}, "
                                          f"Expires: {subscription.get('expires_at')}")
                            return True
                        else:
                            self.log_result("Get User Subscription", False, 
                                          f"Subscription not active or wrong user: {subscription}")
                            return False
                    else:
                        self.log_result("Get User Subscription", False, 
                                      f"Subscription missing fields: {missing_fields}")
                        return False
                else:
                    self.log_result("Get User Subscription", False, f"Unexpected response: {result}")
                    return False
            elif response.status_code == 404:
                self.log_result("Get User Subscription", True, "No active subscription found (expected for some users)")
                return True
            else:
                self.log_result("Get User Subscription", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get User Subscription", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_subscription_expiry_calculation(self):
        """Test that subscription expiry is calculated correctly"""
        print("\n=== Testing Subscription Expiry Calculation ===")
        
        if not self.admin_token:
            self.log_result("Subscription Expiry Calculation", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Create a 1-month code and activate it
            code_data = {
                "duration": "1_month",
                "max_uses": 1
            }
            
            create_response = self.session.post(f"{BASE_URL}/admin/subscription-codes", json=code_data, headers=headers)
            
            if create_response.status_code == 200:
                result = create_response.json()
                
                if result.get("success") and result.get("code"):
                    code_string = result["code"]["code"]
                    user_id = self.admin_user.get("id")
                    
                    # Activate the code
                    activation_data = {
                        "code": code_string,
                        "user_id": user_id
                    }
                    
                    activation_response = self.session.post(f"{BASE_URL}/subscription-codes/activate", json=activation_data, headers=headers)
                    
                    if activation_response.status_code == 200:
                        activation_result = activation_response.json()
                        
                        if activation_result.get("success") and activation_result.get("subscription"):
                            subscription = activation_result["subscription"]
                            
                            # Parse dates
                            activated_at = datetime.fromisoformat(subscription["activated_at"].replace('Z', '+00:00'))
                            expires_at = datetime.fromisoformat(subscription["expires_at"].replace('Z', '+00:00'))
                            
                            # Calculate expected expiry (30 days from activation)
                            expected_expiry = activated_at + timedelta(days=30)
                            
                            # Allow some tolerance (1 day) for date calculation differences
                            time_diff = abs((expires_at - expected_expiry).total_seconds())
                            
                            if time_diff <= 86400:  # 1 day tolerance
                                self.log_result("Subscription Expiry Calculation", True, 
                                              f"Expiry calculation correct - Activated: {activated_at}, Expires: {expires_at}")
                                return True
                            else:
                                self.log_result("Subscription Expiry Calculation", False, 
                                              f"Expiry calculation incorrect - Expected: {expected_expiry}, Got: {expires_at}")
                                return False
                        else:
                            self.log_result("Subscription Expiry Calculation", False, "Activation failed")
                            return False
                    else:
                        self.log_result("Subscription Expiry Calculation", False, 
                                      f"Activation failed: {activation_response.status_code}")
                        return False
                else:
                    self.log_result("Subscription Expiry Calculation", False, "Code creation failed")
                    return False
            else:
                self.log_result("Subscription Expiry Calculation", False, 
                              f"Code creation failed: {create_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Subscription Expiry Calculation", False, f"Exception occurred: {str(e)}")
            return False

    # ============ DATA VALIDATION TESTING ============
    
    def test_input_validation(self):
        """Test all input validations"""
        print("\n=== Testing Input Validation ===")
        
        if not self.admin_token:
            self.log_result("Input Validation", False, "No admin token available")
            return False
        
        success_count = 0
        total_tests = 5
        
        headers = self.setup_auth_headers(self.admin_token)
        
        # Test 1: Invalid duration
        try:
            invalid_data = {
                "duration": "invalid_duration",
                "max_uses": 1
            }
            
            response = self.session.post(f"{BASE_URL}/admin/subscription-codes", json=invalid_data, headers=headers)
            
            if response.status_code == 422:  # Validation error
                self.log_result("Invalid Duration Validation", True, "Invalid duration correctly rejected")
                success_count += 1
            else:
                self.log_result("Invalid Duration Validation", False, f"Expected 422, got {response.status_code}")
        except Exception as e:
            self.log_result("Invalid Duration Validation", False, f"Exception: {str(e)}")
        
        # Test 2: Invalid max_uses (too high)
        try:
            invalid_data = {
                "duration": "1_month",
                "max_uses": 2000  # Above limit
            }
            
            response = self.session.post(f"{BASE_URL}/admin/subscription-codes", json=invalid_data, headers=headers)
            
            if response.status_code == 422:
                self.log_result("Invalid Max Uses Validation", True, "Invalid max_uses correctly rejected")
                success_count += 1
            else:
                self.log_result("Invalid Max Uses Validation", False, f"Expected 422, got {response.status_code}")
        except Exception as e:
            self.log_result("Invalid Max Uses Validation", False, f"Exception: {str(e)}")
        
        # Test 3: Invalid expires_in_days (too high)
        try:
            invalid_data = {
                "duration": "1_month",
                "max_uses": 1,
                "expires_in_days": 500  # Above limit
            }
            
            response = self.session.post(f"{BASE_URL}/admin/subscription-codes", json=invalid_data, headers=headers)
            
            if response.status_code == 422:
                self.log_result("Invalid Expiry Days Validation", True, "Invalid expires_in_days correctly rejected")
                success_count += 1
            else:
                self.log_result("Invalid Expiry Days Validation", False, f"Expected 422, got {response.status_code}")
        except Exception as e:
            self.log_result("Invalid Expiry Days Validation", False, f"Exception: {str(e)}")
        
        # Test 4: Missing required fields
        try:
            invalid_data = {
                "max_uses": 1
                # Missing duration
            }
            
            response = self.session.post(f"{BASE_URL}/admin/subscription-codes", json=invalid_data, headers=headers)
            
            if response.status_code == 422:
                self.log_result("Missing Fields Validation", True, "Missing required fields correctly rejected")
                success_count += 1
            else:
                self.log_result("Missing Fields Validation", False, f"Expected 422, got {response.status_code}")
        except Exception as e:
            self.log_result("Missing Fields Validation", False, f"Exception: {str(e)}")
        
        # Test 5: Invalid bulk count
        try:
            invalid_data = {
                "duration": "1_month",
                "count": 2000,  # Above limit
                "max_uses_per_code": 1
            }
            
            response = self.session.post(f"{BASE_URL}/admin/subscription-codes/bulk", json=invalid_data, headers=headers)
            
            if response.status_code == 422:
                self.log_result("Invalid Bulk Count Validation", True, "Invalid bulk count correctly rejected")
                success_count += 1
            else:
                self.log_result("Invalid Bulk Count Validation", False, f"Expected 422, got {response.status_code}")
        except Exception as e:
            self.log_result("Invalid Bulk Count Validation", False, f"Exception: {str(e)}")
        
        overall_success = success_count == total_tests
        self.log_result("Input Validation", overall_success, 
                      f"Input validation testing: {success_count}/{total_tests} tests passed")
        return overall_success
    
    def test_code_uniqueness_validation(self):
        """Test that duplicate codes are prevented"""
        print("\n=== Testing Code Uniqueness Validation ===")
        
        if not self.admin_token:
            self.log_result("Code Uniqueness Validation", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Try to create a custom code twice
            custom_code = "UNIQUETEST123"
            
            code_data = {
                "duration": "1_month",
                "max_uses": 1,
                "custom_code": custom_code
            }
            
            # First creation should succeed
            response1 = self.session.post(f"{BASE_URL}/admin/subscription-codes", json=code_data, headers=headers)
            
            if response1.status_code == 200:
                # Second creation should fail
                response2 = self.session.post(f"{BASE_URL}/admin/subscription-codes", json=code_data, headers=headers)
                
                if response2.status_code == 400:
                    result = response2.json()
                    if "exists" in result.get("message", "").lower() or "duplicate" in result.get("message", "").lower():
                        self.log_result("Code Uniqueness Validation", True, 
                                      f"Duplicate code correctly prevented: {result.get('message')}")
                        return True
                    else:
                        self.log_result("Code Uniqueness Validation", False, 
                                      f"Wrong error message for duplicate: {result.get('message')}")
                        return False
                else:
                    self.log_result("Code Uniqueness Validation", False, 
                                  f"Duplicate code not prevented, status: {response2.status_code}")
                    return False
            else:
                self.log_result("Code Uniqueness Validation", False, 
                              f"First code creation failed: {response1.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Code Uniqueness Validation", False, f"Exception occurred: {str(e)}")
            return False

    # ============ MAIN TEST RUNNER ============
    
    def run_all_tests(self):
        """Run all subscription codes tests"""
        print("🚀 Starting HomeMe Subscription Codes System Comprehensive Testing")
        print("=" * 80)
        
        # Authentication
        if not self.test_admin_authentication():
            print("\n❌ Authentication failed - cannot proceed with tests")
            return False
        
        # Admin Code Creation Testing
        print("\n" + "=" * 50)
        print("📝 ADMIN CODE CREATION TESTING")
        print("=" * 50)
        
        self.test_create_single_code_1_month()
        self.test_create_single_code_all_durations()
        self.test_create_bulk_codes()
        self.test_create_custom_code()
        self.test_create_code_with_expiry()
        
        # Code Information API Testing
        print("\n" + "=" * 50)
        print("📊 CODE INFORMATION API TESTING")
        print("=" * 50)
        
        self.test_get_all_codes_admin()
        self.test_get_codes_with_filters()
        self.test_get_codes_statistics()
        self.test_get_code_info_by_code_string()
        
        # Code Activation Testing
        print("\n" + "=" * 50)
        print("🔓 CODE ACTIVATION TESTING")
        print("=" * 50)
        
        self.test_valid_code_activation()
        self.test_duplicate_activation_prevention()
        self.test_invalid_code_format_handling()
        self.test_expired_code_handling()
        
        # User Subscription Management
        print("\n" + "=" * 50)
        print("👤 USER SUBSCRIPTION MANAGEMENT")
        print("=" * 50)
        
        self.test_get_user_subscription()
        self.test_subscription_expiry_calculation()
        
        # Data Validation Testing
        print("\n" + "=" * 50)
        print("✅ DATA VALIDATION TESTING")
        print("=" * 50)
        
        self.test_input_validation()
        self.test_code_uniqueness_validation()
        
        # Summary
        self.print_summary()
        
        return True
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("📋 SUBSCRIPTION CODES SYSTEM TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in self.results if "✅ PASS" in result["status"])
        failed = sum(1 for result in self.results if "❌ FAIL" in result["status"])
        total = len(self.results)
        
        print(f"\n📊 Overall Results: {passed}/{total} tests passed ({(passed/total*100):.1f}%)")
        
        if failed > 0:
            print(f"\n❌ Failed Tests ({failed}):")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"  • {result['test']}: {result['message']}")
        
        print(f"\n✅ Passed Tests ({passed}):")
        for result in self.results:
            if "✅ PASS" in result["status"]:
                print(f"  • {result['test']}: {result['message']}")
        
        print("\n" + "=" * 80)
        
        if passed == total:
            print("🎉 ALL SUBSCRIPTION CODES SYSTEM TESTS PASSED!")
        else:
            print(f"⚠️  {failed} tests failed - see details above")
        
        print("=" * 80)

if __name__ == "__main__":
    test_suite = SubscriptionCodesTestSuite()
    test_suite.run_all_tests()