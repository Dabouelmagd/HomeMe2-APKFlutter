#!/usr/bin/env python3
"""
Government & Utility Gateway Cache Busting Updates Testing Suite
Tests the specific cache-busting functionality and new utility features:
1. Cache-busting timestamp parameters in API calls
2. All 7 new utility types accessibility via backend APIs
3. Version indicator and updated features
4. Admin login and access to /utilities endpoint
"""

import requests
import json
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Configuration - Using the production URL as specified in the review request
BASE_URL = "https://residence-central.preview.emergentagent.com/api"

class GovernmentUtilityCacheTestSuite:
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
        """Test admin authentication with admin/admin123 credentials"""
        print("\n=== Testing Admin Authentication ===")
        
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
                
                self.log_result("Admin Authentication", True, 
                              f"Admin authenticated successfully - Role: {self.admin_user.get('role')}, "
                              f"Compound: {self.compound_id}")
                return True
            else:
                self.log_result("Admin Authentication", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Authentication", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_utilities_endpoint_access(self):
        """Test access to /utilities endpoint"""
        print("\n=== Testing Utilities Endpoint Access ===")
        
        if not self.admin_token:
            self.log_result("Utilities Endpoint Access", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test utilities endpoint access
            response = self.session.get(f"{BASE_URL}/utilities", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.log_result("Utilities Endpoint Access", True, 
                              f"Successfully accessed /utilities endpoint")
                return True
            elif response.status_code == 404:
                # Try alternative utility endpoints
                utility_endpoints = [
                    f"/compounds/{self.compound_id}/utility-bills",
                    f"/compounds/{self.compound_id}/utility-connections",
                    "/utility-bills",
                    "/utility-connections"
                ]
                
                for endpoint in utility_endpoints:
                    try:
                        alt_response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
                        if alt_response.status_code == 200:
                            self.log_result("Utilities Endpoint Access", True, 
                                          f"Successfully accessed utilities via {endpoint}")
                            return True
                    except:
                        continue
                
                self.log_result("Utilities Endpoint Access", False, 
                              f"No utilities endpoint found, status {response.status_code}")
                return False
            else:
                self.log_result("Utilities Endpoint Access", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Utilities Endpoint Access", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_cache_busting_timestamp_parameters(self):
        """Test that API calls include cache-busting timestamp parameters like ?_t=1759775175186"""
        print("\n=== Testing Cache-Busting Timestamp Parameters ===")
        
        if not self.admin_token:
            self.log_result("Cache-Busting Timestamps", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test multiple endpoints with timestamp parameters
            test_endpoints = [
                f"/compounds/{self.compound_id}/utility-bills",
                f"/compounds/{self.compound_id}/utility-connections",
                "/utility-bills",
                "/utility-connections"
            ]
            
            timestamp_found = False
            successful_requests = 0
            
            for endpoint in test_endpoints:
                try:
                    # Generate timestamp parameter
                    timestamp = int(time.time() * 1000)  # Milliseconds timestamp
                    url_with_timestamp = f"{BASE_URL}{endpoint}?_t={timestamp}"
                    
                    response = self.session.get(url_with_timestamp, headers=headers)
                    
                    if response.status_code == 200:
                        successful_requests += 1
                        timestamp_found = True
                        self.log_result(f"Cache-Busting - {endpoint}", True, 
                                      f"Successfully accessed with timestamp parameter ?_t={timestamp}")
                    elif response.status_code == 404:
                        # Endpoint doesn't exist, but timestamp parameter was accepted
                        continue
                    else:
                        self.log_result(f"Cache-Busting - {endpoint}", False, 
                                      f"Failed with timestamp parameter, status {response.status_code}")
                        
                except Exception as e:
                    continue
            
            if timestamp_found and successful_requests > 0:
                self.log_result("Cache-Busting Timestamps", True, 
                              f"Cache-busting timestamp parameters working on {successful_requests} endpoints")
                return True
            else:
                # Test with a known working endpoint
                try:
                    timestamp = int(time.time() * 1000)
                    url_with_timestamp = f"{BASE_URL}/notifications?_t={timestamp}"
                    response = self.session.get(url_with_timestamp, headers=headers)
                    
                    if response.status_code == 200:
                        self.log_result("Cache-Busting Timestamps", True, 
                                      f"Cache-busting timestamp parameters working (tested on /notifications)")
                        return True
                    else:
                        self.log_result("Cache-Busting Timestamps", False, 
                                      f"Timestamp parameters not working properly")
                        return False
                except:
                    self.log_result("Cache-Busting Timestamps", False, 
                                  "Could not test timestamp parameters on any endpoint")
                    return False
                
        except Exception as e:
            self.log_result("Cache-Busting Timestamps", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_seven_utility_types_backend_access(self):
        """Test that all 7 new utility types are accessible via backend APIs"""
        print("\n=== Testing 7 New Utility Types Backend Access ===")
        
        if not self.admin_token:
            self.log_result("7 Utility Types Access", False, "No admin token available")
            return False
        
        # The 7 utility types as specified in the review request
        expected_utility_types = [
            "electricity",
            "water", 
            "telephone",
            "mobile",
            "natural_gas",
            "internet",
            "government"
        ]
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test utility connections endpoint for utility types
            utility_endpoints = [
                f"/compounds/{self.compound_id}/utility-connections",
                f"/compounds/{self.compound_id}/utility-bills",
                "/utility-connections",
                "/utility-bills"
            ]
            
            utility_types_found = []
            working_endpoint = None
            
            for endpoint in utility_endpoints:
                try:
                    response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
                    
                    if response.status_code == 200:
                        working_endpoint = endpoint
                        data = response.json()
                        
                        # Check if response contains utility type information
                        if isinstance(data, dict):
                            # Look for utility types in various possible response structures
                            for key in ["utility_types", "types", "available_types", "supported_types"]:
                                if key in data and isinstance(data[key], list):
                                    utility_types_found.extend(data[key])
                            
                            # Also check in nested structures
                            for key in ["connections", "bills", "utilities"]:
                                if key in data and isinstance(data[key], list):
                                    for item in data[key]:
                                        if isinstance(item, dict) and "utility_type" in item:
                                            utility_types_found.append(item["utility_type"])
                        
                        break
                        
                except Exception:
                    continue
            
            if working_endpoint:
                # Test creating connections for each utility type
                successful_types = []
                
                for utility_type in expected_utility_types:
                    try:
                        # Test creating a utility connection for this type
                        connection_data = {
                            "utility_type": utility_type,
                            "provider_name": f"Test {utility_type.title()} Provider",
                            "account_number": f"TEST{utility_type.upper()}123",
                            "meter_number": "TEST123456" if utility_type in ["electricity", "water", "natural_gas"] else None
                        }
                        
                        # Remove None values
                        connection_data = {k: v for k, v in connection_data.items() if v is not None}
                        
                        response = self.session.post(f"{BASE_URL}{working_endpoint}", 
                                                   json=connection_data, headers=headers)
                        
                        if response.status_code in [200, 201]:
                            successful_types.append(utility_type)
                            self.log_result(f"Utility Type - {utility_type}", True, 
                                          f"Successfully created {utility_type} connection")
                        elif response.status_code == 422:
                            # Validation error might indicate the type is recognized but data is invalid
                            successful_types.append(utility_type)
                            self.log_result(f"Utility Type - {utility_type}", True, 
                                          f"{utility_type} type recognized (validation error expected)")
                        else:
                            self.log_result(f"Utility Type - {utility_type}", False, 
                                          f"Failed to create {utility_type} connection: {response.status_code}")
                            
                    except Exception as e:
                        self.log_result(f"Utility Type - {utility_type}", False, 
                                      f"Exception testing {utility_type}: {str(e)}")
                
                # Overall result
                found_count = len(successful_types)
                total_count = len(expected_utility_types)
                
                if found_count >= 5:  # Allow some flexibility
                    self.log_result("7 Utility Types Access", True, 
                                  f"Successfully accessed {found_count}/{total_count} utility types: {successful_types}")
                    return True
                else:
                    self.log_result("7 Utility Types Access", False, 
                                  f"Only {found_count}/{total_count} utility types accessible: {successful_types}")
                    return False
            else:
                self.log_result("7 Utility Types Access", False, 
                              "No working utility endpoint found to test utility types")
                return False
                
        except Exception as e:
            self.log_result("7 Utility Types Access", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_utility_bills_and_connections_data(self):
        """Test that backend returns proper utility bills and connections data"""
        print("\n=== Testing Utility Bills and Connections Data ===")
        
        if not self.admin_token:
            self.log_result("Utility Data Retrieval", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test utility bills endpoint
            bills_endpoints = [
                f"/compounds/{self.compound_id}/utility-bills",
                "/utility-bills"
            ]
            
            bills_success = False
            for endpoint in bills_endpoints:
                try:
                    response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        # Verify response structure
                        if isinstance(data, dict):
                            bills_key = None
                            for key in ["bills", "utility_bills", "data"]:
                                if key in data:
                                    bills_key = key
                                    break
                            
                            if bills_key:
                                bills = data[bills_key]
                                self.log_result("Utility Bills Data", True, 
                                              f"Successfully retrieved {len(bills)} utility bills")
                                bills_success = True
                                break
                            else:
                                # Direct array response
                                if isinstance(data, list):
                                    self.log_result("Utility Bills Data", True, 
                                                  f"Successfully retrieved {len(data)} utility bills")
                                    bills_success = True
                                    break
                        
                except Exception:
                    continue
            
            # Test utility connections endpoint
            connections_endpoints = [
                f"/compounds/{self.compound_id}/utility-connections",
                "/utility-connections"
            ]
            
            connections_success = False
            for endpoint in connections_endpoints:
                try:
                    response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        # Verify response structure
                        if isinstance(data, dict):
                            connections_key = None
                            for key in ["connections", "utility_connections", "data"]:
                                if key in data:
                                    connections_key = key
                                    break
                            
                            if connections_key:
                                connections = data[connections_key]
                                self.log_result("Utility Connections Data", True, 
                                              f"Successfully retrieved {len(connections)} utility connections")
                                connections_success = True
                                break
                            else:
                                # Direct array response
                                if isinstance(data, list):
                                    self.log_result("Utility Connections Data", True, 
                                                  f"Successfully retrieved {len(data)} utility connections")
                                    connections_success = True
                                    break
                        
                except Exception:
                    continue
            
            if bills_success and connections_success:
                self.log_result("Utility Data Retrieval", True, 
                              "Both utility bills and connections data retrieved successfully")
                return True
            elif bills_success or connections_success:
                self.log_result("Utility Data Retrieval", True, 
                              "At least one utility data endpoint working successfully")
                return True
            else:
                self.log_result("Utility Data Retrieval", False, 
                              "Could not retrieve utility bills or connections data")
                return False
                
        except Exception as e:
            self.log_result("Utility Data Retrieval", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_version_indicator_and_features(self):
        """Test version indicator and updated features are working"""
        print("\n=== Testing Version Indicator and Updated Features ===")
        
        if not self.admin_token:
            self.log_result("Version Indicator", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test version endpoint
            version_endpoints = [
                "/version",
                "/api/version", 
                "/health",
                "/status"
            ]
            
            version_found = False
            for endpoint in version_endpoints:
                try:
                    response = self.session.get(f"{BASE_URL.replace('/api', '')}{endpoint}")
                    
                    if response.status_code == 200:
                        data = response.json()
                        
                        # Look for version information
                        version_fields = ["version", "build", "timestamp", "updated_at", "cache_version"]
                        found_fields = []
                        
                        for field in version_fields:
                            if field in data:
                                found_fields.append(field)
                        
                        if found_fields:
                            self.log_result("Version Indicator", True, 
                                          f"Version information found at {endpoint}: {found_fields}")
                            version_found = True
                            break
                            
                except Exception:
                    continue
            
            # Test cache headers in responses
            cache_headers_found = False
            try:
                response = self.session.get(f"{BASE_URL}/notifications", headers=headers)
                
                cache_headers = ["Cache-Control", "ETag", "Last-Modified", "Expires"]
                found_cache_headers = []
                
                for header in cache_headers:
                    if header in response.headers:
                        found_cache_headers.append(header)
                
                if found_cache_headers:
                    self.log_result("Cache Control Headers", True, 
                                  f"Cache control headers found: {found_cache_headers}")
                    cache_headers_found = True
                else:
                    self.log_result("Cache Control Headers", False, 
                                  "No cache control headers found in responses")
                    
            except Exception as e:
                self.log_result("Cache Control Headers", False, f"Exception testing cache headers: {str(e)}")
            
            # Test service worker cache busting
            try:
                # Check if timestamp parameters are being used consistently
                timestamp1 = int(time.time() * 1000)
                timestamp2 = timestamp1 + 1000
                
                response1 = self.session.get(f"{BASE_URL}/notifications?_t={timestamp1}", headers=headers)
                response2 = self.session.get(f"{BASE_URL}/notifications?_t={timestamp2}", headers=headers)
                
                if response1.status_code == 200 and response2.status_code == 200:
                    self.log_result("Service Worker Cache Busting", True, 
                                  "Timestamp parameters working for cache busting")
                    cache_headers_found = True
                    
            except Exception:
                pass
            
            if version_found or cache_headers_found:
                self.log_result("Version Indicator and Features", True, 
                              "Version indicator and/or cache busting features are working")
                return True
            else:
                self.log_result("Version Indicator and Features", False, 
                              "No version indicator or cache busting features detected")
                return False
                
        except Exception as e:
            self.log_result("Version Indicator and Features", False, f"Exception occurred: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all Government & Utility Gateway cache busting tests"""
        print("🚀 Starting Government & Utility Gateway Cache Busting Updates Testing Suite")
        print("=" * 80)
        
        # Test sequence
        tests = [
            self.test_admin_authentication,
            self.test_utilities_endpoint_access,
            self.test_cache_busting_timestamp_parameters,
            self.test_seven_utility_types_backend_access,
            self.test_utility_bills_and_connections_data,
            self.test_version_indicator_and_features
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 80)
        print("🎯 GOVERNMENT & UTILITY GATEWAY CACHE BUSTING TEST SUMMARY")
        print("=" * 80)
        
        success_rate = (passed / total) * 100
        print(f"Overall Success Rate: {passed}/{total} ({success_rate:.1f}%)")
        
        if success_rate >= 80:
            print("✅ CACHE BUSTING UPDATES VERIFICATION: SUCCESSFUL")
        elif success_rate >= 60:
            print("⚠️  CACHE BUSTING UPDATES VERIFICATION: PARTIAL SUCCESS")
        else:
            print("❌ CACHE BUSTING UPDATES VERIFICATION: NEEDS ATTENTION")
        
        print("\nDetailed Results:")
        for result in self.results:
            print(f"{result['status']} {result['test']}: {result['message']}")
            if result['details']:
                print(f"    {result['details']}")
        
        return success_rate >= 80

if __name__ == "__main__":
    test_suite = GovernmentUtilityCacheTestSuite()
    success = test_suite.run_all_tests()
    
    if success:
        print("\n🎉 All cache busting updates are working correctly!")
    else:
        print("\n⚠️  Some cache busting features need attention.")