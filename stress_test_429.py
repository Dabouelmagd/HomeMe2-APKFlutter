#!/usr/bin/env python3
"""
HomeMe Stress Test for 429 Rate Limiting
Additional stress testing to ensure the rate limiting fix is robust
"""

import requests
import time
import threading
from concurrent.futures import ThreadPoolExecutor
import json

BASE_URL = "https://residence-central.preview.emergentagent.com/api"

def test_stress_scenario():
    """Stress test with high volume requests"""
    print("🔥 Running Stress Test for 429 Rate Limiting Fix")
    print("=" * 50)
    
    # Login first
    credentials = {"username": "admin", "password": "admin123"}
    login_response = requests.post(f"{BASE_URL}/auth/login", json=credentials)
    
    if login_response.status_code != 200:
        print("❌ Failed to login for stress test")
        return False
    
    token = login_response.json()["access_token"]
    compound_id = login_response.json()["user"]["compound_id"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # Stress Test 1: Burst requests (simulating user clicking rapidly)
    print("\n🚀 Test 1: Burst Requests (10 requests in 1 second)")
    burst_results = []
    
    def make_burst_request(i):
        try:
            response = requests.get(f"{BASE_URL}/compounds/{compound_id}", headers=headers)
            return {"id": i, "status": response.status_code, "time": time.time()}
        except Exception as e:
            return {"id": i, "status": "ERROR", "error": str(e), "time": time.time()}
    
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(make_burst_request, i) for i in range(10)]
        burst_results = [future.result() for future in futures]
    end_time = time.time()
    
    burst_429_count = sum(1 for r in burst_results if r["status"] == 429)
    burst_success_count = sum(1 for r in burst_results if r["status"] == 200)
    
    print(f"   ⏱️  Total time: {end_time - start_time:.2f}s")
    print(f"   ✅ Successful requests: {burst_success_count}/10")
    print(f"   ❌ 429 errors: {burst_429_count}/10")
    
    # Stress Test 2: Sustained load (30 requests over 10 seconds)
    print("\n⚡ Test 2: Sustained Load (30 requests over 10 seconds)")
    sustained_results = []
    sustained_429_count = 0
    
    for i in range(30):
        try:
            response = requests.get(f"{BASE_URL}/compounds/{compound_id}/residences", headers=headers)
            sustained_results.append({"id": i, "status": response.status_code})
            if response.status_code == 429:
                sustained_429_count += 1
            time.sleep(0.33)  # ~3 requests per second
        except Exception as e:
            sustained_results.append({"id": i, "status": "ERROR", "error": str(e)})
    
    sustained_success_count = sum(1 for r in sustained_results if r["status"] == 200)
    
    print(f"   ✅ Successful requests: {sustained_success_count}/30")
    print(f"   ❌ 429 errors: {sustained_429_count}/30")
    
    # Stress Test 3: Mixed endpoint requests (simulating real user behavior)
    print("\n🎯 Test 3: Mixed Endpoint Requests (Real User Simulation)")
    mixed_endpoints = [
        f"/compounds/{compound_id}",
        f"/compounds/{compound_id}/residences", 
        "/admin/users",
        "/admin/registration-links",
        "/notifications"
    ]
    
    mixed_results = []
    mixed_429_count = 0
    
    for i in range(15):  # 3 cycles through all endpoints
        endpoint = mixed_endpoints[i % len(mixed_endpoints)]
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            mixed_results.append({"endpoint": endpoint, "status": response.status_code})
            if response.status_code == 429:
                mixed_429_count += 1
            time.sleep(0.2)  # 200ms between requests
        except Exception as e:
            mixed_results.append({"endpoint": endpoint, "status": "ERROR", "error": str(e)})
    
    mixed_success_count = sum(1 for r in mixed_results if r["status"] == 200)
    
    print(f"   ✅ Successful requests: {mixed_success_count}/15")
    print(f"   ❌ 429 errors: {mixed_429_count}/15")
    
    # Overall Results
    total_429_errors = burst_429_count + sustained_429_count + mixed_429_count
    total_requests = 10 + 30 + 15
    
    print("\n" + "=" * 50)
    print("📊 STRESS TEST SUMMARY")
    print("=" * 50)
    print(f"🔢 Total requests made: {total_requests}")
    print(f"❌ Total 429 errors: {total_429_errors}")
    print(f"📈 Error rate: {(total_429_errors/total_requests)*100:.1f}%")
    
    if total_429_errors == 0:
        print("🎉 EXCELLENT: No 429 errors detected in stress testing!")
        print("✅ Rate limiting fix is robust and handles high load correctly")
        return True
    elif total_429_errors <= 2:  # Allow for very minimal errors under extreme stress
        print("⚠️  GOOD: Minimal 429 errors under extreme stress (acceptable)")
        print("✅ Rate limiting fix is working well")
        return True
    else:
        print("❌ CONCERN: Multiple 429 errors detected under stress")
        print("🔧 Rate limiting fix may need further optimization")
        return False

if __name__ == "__main__":
    success = test_stress_scenario()
    exit(0 if success else 1)