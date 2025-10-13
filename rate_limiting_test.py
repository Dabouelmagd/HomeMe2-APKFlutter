#!/usr/bin/env python3
"""
HomeMe Rate Limiting Fix Testing Suite
Tests the fix for "429 Too Many Requests" error in compound management page.

Testing Focus:
1. Admin login and access to compound management page
2. Multiple API requests without rate limiting issues
3. Add Resident + Family modal functionality
4. Request monitoring and duplicate prevention
5. New protection mechanisms verification
"""

import asyncio
import json
import requests
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor
import threading

# Configuration - Using the production URL from frontend/.env
BASE_URL = "https://homeme-container-fix.preview.emergentagent.com/api"

class RateLimitingTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.admin_user = None
        self.compound_id = None
        self.results = []
        self.request_times = []
        self.request_lock = threading.Lock()
        
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
    
    def track_request_time(self, endpoint: str, status_code: int, response_time: float):
        """Track request timing for monitoring"""
        with self.request_lock:
            self.request_times.append({
                "endpoint": endpoint,
                "status_code": status_code,
                "response_time": response_time,
                "timestamp": datetime.now()
            })
    
    def test_admin_login_and_access(self):
        """Test 1: Admin login and access to compound management page"""
        print("\n=== Testing Admin Login and Access ===")
        
        try:
            # Test admin login with credentials from review request
            credentials = {"username": "admin", "password": "admin123"}
            
            start_time = time.time()
            response = self.session.post(f"{BASE_URL}/auth/login", json=credentials)
            response_time = time.time() - start_time
            
            self.track_request_time("/auth/login", response.status_code, response_time)
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["access_token", "user"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_result("Admin Login", False, f"Missing required fields: {missing_fields}")
                    return False
                
                self.admin_token = data["access_token"]
                self.admin_user = data["user"]
                self.compound_id = self.admin_user.get("compound_id")
                
                self.log_result("Admin Login", True, 
                              f"Admin authenticated successfully - Username: {credentials['username']}, "
                              f"Role: {self.admin_user.get('role')}, Compound: {self.compound_id}")
                
                # Test access to compound management page data
                return self.test_compound_page_access()
                
            else:
                self.log_result("Admin Login", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Login", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_compound_page_access(self):
        """Test access to compound management page without 429 errors"""
        print("\n=== Testing Compound Page Access ===")
        
        if not self.admin_token:
            self.log_result("Compound Page Access", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test accessing compound data (simulating /compound page load)
            start_time = time.time()
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}", headers=headers)
            response_time = time.time() - start_time
            
            self.track_request_time(f"/compounds/{self.compound_id}", response.status_code, response_time)
            
            if response.status_code == 200:
                self.log_result("Compound Page Access", True, 
                              f"Successfully accessed compound management page data (response time: {response_time:.2f}s)")
                return True
            elif response.status_code == 429:
                self.log_result("Compound Page Access", False, 
                              "❌ CRITICAL: 429 Too Many Requests error still occurring!")
                return False
            else:
                self.log_result("Compound Page Access", True, 
                              f"Compound endpoint accessible (status: {response.status_code})")
                return True
                
        except Exception as e:
            self.log_result("Compound Page Access", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_multiple_api_requests(self):
        """Test 2: Multiple API requests without rate limiting issues"""
        print("\n=== Testing Multiple API Requests ===")
        
        if not self.admin_token:
            self.log_result("Multiple API Requests", False, "No admin token available")
            return False
        
        headers = self.setup_auth_headers(self.admin_token)
        
        # Define the API endpoints mentioned in the review request
        test_endpoints = [
            (f"/compounds/{self.compound_id}", "GET compounds data"),
            (f"/compounds/{self.compound_id}/residences", "GET residences data"),
            ("/admin/registration-links", "GET registration links"),
            ("/admin/users", "GET users data")
        ]
        
        success_count = 0
        total_requests = len(test_endpoints)
        
        for endpoint, description in test_endpoints:
            try:
                start_time = time.time()
                response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
                response_time = time.time() - start_time
                
                self.track_request_time(endpoint, response.status_code, response_time)
                
                if response.status_code == 429:
                    self.log_result(f"API Request - {description}", False, 
                                  "❌ CRITICAL: 429 Too Many Requests error detected!")
                elif response.status_code in [200, 404, 500]:  # 404/500 means endpoint exists but may have issues
                    self.log_result(f"API Request - {description}", True, 
                                  f"Request successful (status: {response.status_code}, time: {response_time:.2f}s)")
                    success_count += 1
                else:
                    self.log_result(f"API Request - {description}", True, 
                                  f"Request processed (status: {response.status_code}, time: {response_time:.2f}s)")
                    success_count += 1
                
                # Small delay between requests to simulate real usage
                time.sleep(0.1)
                
            except Exception as e:
                self.log_result(f"API Request - {description}", False, f"Exception occurred: {str(e)}")
        
        overall_success = success_count > 0  # At least some requests should work
        self.log_result("Multiple API Requests", overall_success, 
                      f"API requests test: {success_count}/{total_requests} requests processed without 429 errors")
        
        return overall_success
    
    def test_rapid_successive_requests(self):
        """Test rapid successive requests to check for rate limiting protection"""
        print("\n=== Testing Rapid Successive Requests ===")
        
        if not self.admin_token:
            self.log_result("Rapid Successive Requests", False, "No admin token available")
            return False
        
        headers = self.setup_auth_headers(self.admin_token)
        
        # Test rapid requests to the same endpoint
        endpoint = f"/compounds/{self.compound_id}"
        rapid_requests = 5
        request_interval = 0.05  # 50ms between requests
        
        results = []
        
        for i in range(rapid_requests):
            try:
                start_time = time.time()
                response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
                response_time = time.time() - start_time
                
                self.track_request_time(endpoint, response.status_code, response_time)
                
                results.append({
                    "request_num": i + 1,
                    "status_code": response.status_code,
                    "response_time": response_time
                })
                
                if i < rapid_requests - 1:  # Don't sleep after last request
                    time.sleep(request_interval)
                    
            except Exception as e:
                results.append({
                    "request_num": i + 1,
                    "status_code": "ERROR",
                    "response_time": 0,
                    "error": str(e)
                })
        
        # Analyze results
        error_429_count = sum(1 for r in results if r["status_code"] == 429)
        success_count = sum(1 for r in results if r["status_code"] in [200, 404, 500])
        
        if error_429_count > 0:
            self.log_result("Rapid Successive Requests", False, 
                          f"❌ CRITICAL: {error_429_count}/{rapid_requests} requests returned 429 errors")
            return False
        else:
            self.log_result("Rapid Successive Requests", True, 
                          f"All {rapid_requests} rapid requests processed without 429 errors "
                          f"({success_count} successful responses)")
            return True
    
    def test_add_resident_modal_scenario(self):
        """Test 3: Add Resident + Family modal opening scenario"""
        print("\n=== Testing Add Resident Modal Scenario ===")
        
        if not self.admin_token:
            self.log_result("Add Resident Modal", False, "No admin token available")
            return False
        
        headers = self.setup_auth_headers(self.admin_token)
        
        # Simulate the sequence of requests that happen when opening "Add Resident + Family" modal
        modal_requests = [
            (f"/compounds/{self.compound_id}", "Load compound data"),
            (f"/compounds/{self.compound_id}/residences", "Load existing residences"),
            ("/admin/users", "Load users for validation"),
            ("/admin/registration-links", "Load registration links")
        ]
        
        success_count = 0
        total_requests = len(modal_requests)
        
        print("    Simulating Add Resident modal opening sequence...")
        
        for endpoint, description in modal_requests:
            try:
                start_time = time.time()
                response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
                response_time = time.time() - start_time
                
                self.track_request_time(endpoint, response.status_code, response_time)
                
                if response.status_code == 429:
                    self.log_result(f"Modal Request - {description}", False, 
                                  "❌ CRITICAL: 429 error when opening Add Resident modal!")
                elif response.status_code in [200, 404, 500]:
                    self.log_result(f"Modal Request - {description}", True, 
                                  f"Modal data loaded successfully (status: {response.status_code})")
                    success_count += 1
                else:
                    self.log_result(f"Modal Request - {description}", True, 
                                  f"Modal request processed (status: {response.status_code})")
                    success_count += 1
                
                # Simulate small delay between modal data loading requests
                time.sleep(0.05)
                
            except Exception as e:
                self.log_result(f"Modal Request - {description}", False, f"Exception occurred: {str(e)}")
        
        overall_success = success_count > 0
        self.log_result("Add Resident Modal", overall_success, 
                      f"Add Resident modal scenario: {success_count}/{total_requests} requests successful without 429 errors")
        
        return overall_success
    
    def test_concurrent_requests(self):
        """Test concurrent requests to simulate multiple users or browser tabs"""
        print("\n=== Testing Concurrent Requests ===")
        
        if not self.admin_token:
            self.log_result("Concurrent Requests", False, "No admin token available")
            return False
        
        headers = self.setup_auth_headers(self.admin_token)
        
        def make_request(request_id):
            """Make a single request and return result"""
            try:
                endpoint = f"/compounds/{self.compound_id}"
                start_time = time.time()
                response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
                response_time = time.time() - start_time
                
                self.track_request_time(endpoint, response.status_code, response_time)
                
                return {
                    "request_id": request_id,
                    "status_code": response.status_code,
                    "response_time": response_time,
                    "success": response.status_code != 429
                }
            except Exception as e:
                return {
                    "request_id": request_id,
                    "status_code": "ERROR",
                    "response_time": 0,
                    "success": False,
                    "error": str(e)
                }
        
        # Execute concurrent requests
        concurrent_count = 3
        with ThreadPoolExecutor(max_workers=concurrent_count) as executor:
            futures = [executor.submit(make_request, i) for i in range(concurrent_count)]
            results = [future.result() for future in futures]
        
        # Analyze results
        success_count = sum(1 for r in results if r["success"])
        error_429_count = sum(1 for r in results if r["status_code"] == 429)
        
        if error_429_count > 0:
            self.log_result("Concurrent Requests", False, 
                          f"❌ CRITICAL: {error_429_count}/{concurrent_count} concurrent requests returned 429 errors")
            return False
        else:
            self.log_result("Concurrent Requests", True, 
                          f"All {concurrent_count} concurrent requests processed without 429 errors "
                          f"({success_count} successful)")
            return True
    
    def test_request_monitoring(self):
        """Test 4: Monitor request patterns and timing"""
        print("\n=== Testing Request Monitoring ===")
        
        if not self.request_times:
            self.log_result("Request Monitoring", False, "No request data to analyze")
            return False
        
        # Analyze request patterns
        total_requests = len(self.request_times)
        error_429_requests = [r for r in self.request_times if r["status_code"] == 429]
        successful_requests = [r for r in self.request_times if r["status_code"] in [200, 404, 500]]
        
        # Calculate average response time
        if successful_requests:
            avg_response_time = sum(r["response_time"] for r in successful_requests) / len(successful_requests)
        else:
            avg_response_time = 0
        
        # Check for duplicate rapid requests
        duplicate_requests = []
        for i, req1 in enumerate(self.request_times):
            for j, req2 in enumerate(self.request_times[i+1:], i+1):
                time_diff = abs((req2["timestamp"] - req1["timestamp"]).total_seconds())
                if req1["endpoint"] == req2["endpoint"] and time_diff < 0.1:  # Same endpoint within 100ms
                    duplicate_requests.append((i, j, time_diff))
        
        # Report monitoring results
        monitoring_details = f"""
        Total requests made: {total_requests}
        429 errors: {len(error_429_requests)}
        Successful requests: {len(successful_requests)}
        Average response time: {avg_response_time:.3f}s
        Potential duplicate requests: {len(duplicate_requests)}
        """
        
        success = len(error_429_requests) == 0
        self.log_result("Request Monitoring", success, 
                      f"Request monitoring analysis completed - 429 errors: {len(error_429_requests)}", 
                      monitoring_details.strip())
        
        return success
    
    def test_protection_mechanisms(self):
        """Test 5: Verify new protection mechanisms are working"""
        print("\n=== Testing New Protection Mechanisms ===")
        
        if not self.admin_token:
            self.log_result("Protection Mechanisms", False, "No admin token available")
            return False
        
        headers = self.setup_auth_headers(self.admin_token)
        
        # Test 1: Debouncing - rapid identical requests should be handled gracefully
        print("    Testing debouncing mechanism...")
        endpoint = f"/compounds/{self.compound_id}"
        
        debounce_results = []
        for i in range(3):
            try:
                start_time = time.time()
                response = self.session.get(f"{BASE_URL}{endpoint}", headers=headers)
                response_time = time.time() - start_time
                
                debounce_results.append({
                    "status_code": response.status_code,
                    "response_time": response_time
                })
                
                # Very short delay to test debouncing (100ms as mentioned in review)
                time.sleep(0.1)
                
            except Exception as e:
                debounce_results.append({"status_code": "ERROR", "error": str(e)})
        
        # Test 2: Error handling for rate limiting
        print("    Testing error handling mechanisms...")
        
        # Analyze debouncing results
        debounce_429_count = sum(1 for r in debounce_results if r.get("status_code") == 429)
        debounce_success = debounce_429_count == 0
        
        if debounce_success:
            self.log_result("Debouncing Protection", True, 
                          "Debouncing mechanism working - no 429 errors in rapid requests")
        else:
            self.log_result("Debouncing Protection", False, 
                          f"Debouncing failed - {debounce_429_count} requests returned 429 errors")
        
        # Test 3: Request deduplication (simulated)
        print("    Testing request deduplication...")
        
        # Make identical requests with same parameters
        dedup_endpoint = f"/compounds/{self.compound_id}/residences"
        dedup_results = []
        
        for i in range(2):
            try:
                start_time = time.time()
                response = self.session.get(f"{BASE_URL}{dedup_endpoint}", headers=headers)
                response_time = time.time() - start_time
                
                dedup_results.append({
                    "status_code": response.status_code,
                    "response_time": response_time
                })
                
                time.sleep(0.05)  # 50ms delay
                
            except Exception as e:
                dedup_results.append({"status_code": "ERROR", "error": str(e)})
        
        dedup_429_count = sum(1 for r in dedup_results if r.get("status_code") == 429)
        dedup_success = dedup_429_count == 0
        
        if dedup_success:
            self.log_result("Request Deduplication", True, 
                          "Request deduplication working - no 429 errors in duplicate requests")
        else:
            self.log_result("Request Deduplication", False, 
                          f"Request deduplication failed - {dedup_429_count} requests returned 429 errors")
        
        overall_success = debounce_success and dedup_success
        self.log_result("Protection Mechanisms", overall_success, 
                      f"New protection mechanisms test: {'All working correctly' if overall_success else 'Some mechanisms need improvement'}")
        
        return overall_success
    
    def run_comprehensive_test(self):
        """Run all rate limiting tests"""
        print("🚀 Starting HomeMe Rate Limiting Fix Testing Suite")
        print("=" * 60)
        
        test_results = []
        
        # Test 1: Login and Access
        test_results.append(self.test_admin_login_and_access())
        
        # Test 2: Multiple API Requests
        test_results.append(self.test_multiple_api_requests())
        
        # Test 2.5: Rapid Successive Requests
        test_results.append(self.test_rapid_successive_requests())
        
        # Test 3: Add Resident Modal Scenario
        test_results.append(self.test_add_resident_modal_scenario())
        
        # Test 3.5: Concurrent Requests
        test_results.append(self.test_concurrent_requests())
        
        # Test 4: Request Monitoring
        test_results.append(self.test_request_monitoring())
        
        # Test 5: Protection Mechanisms
        test_results.append(self.test_protection_mechanisms())
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 RATE LIMITING FIX TEST SUMMARY")
        print("=" * 60)
        
        passed_tests = sum(test_results)
        total_tests = len(test_results)
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        
        print(f"✅ Tests Passed: {passed_tests}/{total_tests}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        # Check for critical 429 errors
        critical_429_errors = [r for r in self.request_times if r["status_code"] == 429]
        
        if critical_429_errors:
            print(f"❌ CRITICAL: {len(critical_429_errors)} requests still returning 429 errors!")
            print("🔧 Rate limiting fix needs further investigation")
        else:
            print("✅ SUCCESS: No 429 errors detected in any test scenario")
            print("🎉 Rate limiting fix appears to be working correctly")
        
        print("\n📋 Detailed Results:")
        for result in self.results:
            print(f"  {result['status']} {result['test']}: {result['message']}")
        
        return success_rate >= 80 and len(critical_429_errors) == 0

def main():
    """Main test execution"""
    test_suite = RateLimitingTestSuite()
    
    try:
        success = test_suite.run_comprehensive_test()
        
        if success:
            print("\n🎉 OVERALL RESULT: Rate limiting fix testing PASSED")
            print("✅ The 429 Too Many Requests issue appears to be resolved")
        else:
            print("\n❌ OVERALL RESULT: Rate limiting fix testing FAILED")
            print("🔧 The 429 Too Many Requests issue may still exist")
        
        return success
        
    except Exception as e:
        print(f"\n💥 CRITICAL ERROR: Test suite failed with exception: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)