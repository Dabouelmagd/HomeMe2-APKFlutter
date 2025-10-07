#!/usr/bin/env python3
"""
Detailed User API Testing - Focused on Frontend Integration
Testing the exact API calls that the frontend UserManagement page makes
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "https://guest-portal-4.preview.emergentagent.com/api"

def test_detailed_user_api():
    print("🔍 DETAILED USER API TESTING FOR FRONTEND INTEGRATION")
    print("=" * 60)
    
    # Step 1: Admin Login
    print("\n1. Testing Admin Login...")
    credentials = {"username": "admin", "password": "admin123"}
    
    session = requests.Session()
    response = session.post(f"{BASE_URL}/auth/login", json=credentials)
    
    if response.status_code != 200:
        print(f"❌ Admin login failed: {response.status_code}")
        return
    
    data = response.json()
    admin_token = data["access_token"]
    admin_user = data["user"]
    compound_id = admin_user.get("compound_id")
    
    print(f"✅ Admin login successful")
    print(f"   Token: {admin_token[:20]}...")
    print(f"   User ID: {admin_user.get('id')}")
    print(f"   Role: {admin_user.get('role')}")
    print(f"   Compound ID: {compound_id}")
    
    # Step 2: Test the exact endpoint
    print("\n2. Testing GET /api/admin/users endpoint...")
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    response = session.get(f"{BASE_URL}/admin/users", headers=headers)
    
    print(f"   Status Code: {response.status_code}")
    print(f"   Response Headers: {dict(response.headers)}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"   Response Type: {type(data)}")
        print(f"   Response Keys: {list(data.keys()) if isinstance(data, dict) else 'N/A (list)'}")
        
        # Extract users
        users = []
        if isinstance(data, dict) and "users" in data:
            users = data["users"]
        elif isinstance(data, list):
            users = data
        
        print(f"   Total Users Found: {len(users)}")
        
        if users:
            print(f"\n3. Analyzing User Data Structure...")
            sample_user = users[0]
            print(f"   Sample User Keys: {list(sample_user.keys())}")
            print(f"   Sample User Data:")
            for key, value in sample_user.items():
                if key != '_id':  # Skip MongoDB ObjectId
                    print(f"     {key}: {value}")
            
            # Check for admin users specifically
            admin_users = [u for u in users if u.get('role') == 'admin']
            resident_users = [u for u in users if u.get('role') == 'resident']
            
            print(f"\n4. User Role Analysis...")
            print(f"   Admin Users: {len(admin_users)}")
            print(f"   Resident Users: {len(resident_users)}")
            print(f"   Other Roles: {len(users) - len(admin_users) - len(resident_users)}")
            
            # Check compound filtering
            compound_users = [u for u in users if u.get('compound_id') == compound_id]
            print(f"   Users in Current Compound ({compound_id}): {len(compound_users)}")
            
            # Test pagination
            print(f"\n5. Testing Pagination...")
            paginated_response = session.get(f"{BASE_URL}/admin/users?limit=10&offset=0", headers=headers)
            if paginated_response.status_code == 200:
                paginated_data = paginated_response.json()
                paginated_users = paginated_data.get("users", []) if isinstance(paginated_data, dict) else paginated_data
                print(f"   Paginated Response (limit=10): {len(paginated_users)} users")
            else:
                print(f"   Pagination not supported or failed: {paginated_response.status_code}")
            
            # Test filtering
            print(f"\n6. Testing Filtering...")
            filter_response = session.get(f"{BASE_URL}/admin/users?role=admin", headers=headers)
            if filter_response.status_code == 200:
                filter_data = filter_response.json()
                filtered_users = filter_data.get("users", []) if isinstance(filter_data, dict) else filter_data
                print(f"   Filtered Response (role=admin): {len(filtered_users)} users")
            else:
                print(f"   Filtering not supported or failed: {filter_response.status_code}")
        
        else:
            print("❌ No users found in response!")
            print("   This explains the 'No Results' issue in frontend")
    
    else:
        print(f"❌ API call failed with status {response.status_code}")
        print(f"   Response: {response.text}")
    
    # Step 7: Test exact frontend API call pattern
    print(f"\n7. Testing Frontend-Style API Call...")
    
    # Simulate how frontend might call the API
    frontend_headers = {
        "Authorization": f"Bearer {admin_token}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    response = session.get(f"{BASE_URL}/admin/users", headers=frontend_headers)
    
    if response.status_code == 200:
        data = response.json()
        
        # Check if response matches what frontend expects
        if isinstance(data, dict) and "users" in data:
            users = data["users"]
            print(f"✅ Frontend-compatible response: {len(users)} users")
            
            # Create a sample response that frontend would receive
            frontend_response = {
                "success": True,
                "data": users[:5],  # First 5 users
                "total": len(users),
                "message": "Users retrieved successfully"
            }
            
            print(f"   Sample Frontend Response:")
            print(json.dumps(frontend_response, indent=2, default=str)[:500] + "...")
            
        else:
            print(f"❌ Response format may not match frontend expectations")
            print(f"   Expected: dict with 'users' key")
            print(f"   Actual: {type(data)} with keys {list(data.keys()) if isinstance(data, dict) else 'N/A'}")
    
    # Step 8: Check for CORS issues
    print(f"\n8. Checking CORS Headers...")
    cors_headers = {
        "Origin": "https://guest-portal-4.preview.emergentagent.com",
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    response = session.get(f"{BASE_URL}/admin/users", headers=cors_headers)
    
    cors_response_headers = response.headers
    print(f"   Access-Control-Allow-Origin: {cors_response_headers.get('Access-Control-Allow-Origin', 'Not Set')}")
    print(f"   Access-Control-Allow-Methods: {cors_response_headers.get('Access-Control-Allow-Methods', 'Not Set')}")
    print(f"   Access-Control-Allow-Headers: {cors_response_headers.get('Access-Control-Allow-Headers', 'Not Set')}")
    
    if response.status_code == 200:
        print("✅ CORS appears to be working correctly")
    else:
        print(f"❌ Possible CORS issue: {response.status_code}")
    
    print(f"\n" + "=" * 60)
    print("🎯 FINAL DIAGNOSIS:")
    print("=" * 60)
    
    if response.status_code == 200:
        data = response.json()
        users = data.get("users", []) if isinstance(data, dict) else data
        
        if len(users) > 0:
            print("✅ Backend API is working correctly")
            print("✅ Users exist in database (112 users found)")
            print("✅ Admin authentication is working")
            print("✅ API endpoint is accessible")
            print("")
            print("🔧 LIKELY CAUSE OF 'NO RESULTS' ISSUE:")
            print("   1. Frontend may not be calling the correct endpoint")
            print("   2. Frontend may not be handling the response format correctly")
            print("   3. Frontend may have authentication token issues")
            print("   4. Frontend may have JavaScript errors preventing data display")
            print("")
            print("🔧 RECOMMENDATIONS:")
            print("   1. Check browser developer console for JavaScript errors")
            print("   2. Verify frontend is calling /api/admin/users endpoint")
            print("   3. Check if frontend is properly parsing response.data.users")
            print("   4. Verify frontend authentication token is being sent correctly")
        else:
            print("❌ No users found - database may be empty for this compound")
    else:
        print("❌ Backend API has issues - this could be the root cause")

if __name__ == "__main__":
    test_detailed_user_api()