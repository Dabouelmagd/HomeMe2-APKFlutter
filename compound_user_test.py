#!/usr/bin/env python3
"""
Compound-Specific User Testing
Testing if the issue is related to compound-specific user filtering
"""

import requests
import json

BASE_URL = "https://payment-methods-ui.preview.emergentagent.com/api"

def test_compound_users():
    print("🔍 COMPOUND-SPECIFIC USER TESTING")
    print("=" * 50)
    
    # Login
    credentials = {"username": "admin", "password": "admin123"}
    session = requests.Session()
    response = session.post(f"{BASE_URL}/auth/login", json=credentials)
    
    if response.status_code != 200:
        print(f"❌ Login failed: {response.status_code}")
        return
    
    data = response.json()
    admin_token = data["access_token"]
    admin_user = data["user"]
    current_compound_id = admin_user.get("compound_id")
    
    print(f"✅ Logged in as admin")
    print(f"   Current Compound ID: {current_compound_id}")
    
    headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    # Get all users
    response = session.get(f"{BASE_URL}/admin/users", headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Failed to get users: {response.status_code}")
        return
    
    data = response.json()
    all_users = data.get("users", [])
    
    print(f"\n📊 USER ANALYSIS:")
    print(f"   Total Users in Database: {len(all_users)}")
    
    # Analyze by compound
    compound_counts = {}
    for user in all_users:
        compound_id = user.get("compound_id", "unknown")
        compound_counts[compound_id] = compound_counts.get(compound_id, 0) + 1
    
    print(f"\n📈 USERS BY COMPOUND:")
    for compound_id, count in compound_counts.items():
        status = "👑 CURRENT" if compound_id == current_compound_id else ""
        print(f"   {compound_id}: {count} users {status}")
    
    # Check current compound users
    current_compound_users = [u for u in all_users if u.get("compound_id") == current_compound_id]
    print(f"\n🏢 CURRENT COMPOUND USERS ({current_compound_id}):")
    print(f"   Count: {len(current_compound_users)}")
    
    if current_compound_users:
        print(f"   Sample Users:")
        for i, user in enumerate(current_compound_users[:3]):
            print(f"     {i+1}. {user.get('full_name', 'N/A')} ({user.get('username')}) - {user.get('role')}")
    else:
        print("   ❌ NO USERS FOUND IN CURRENT COMPOUND!")
        print("   This explains why frontend shows 'No Results'")
    
    # Check if backend filters by compound automatically
    print(f"\n🔍 TESTING COMPOUND FILTERING:")
    
    # The backend might be filtering users by compound automatically
    # Let's check if all returned users belong to the current compound
    non_compound_users = [u for u in all_users if u.get("compound_id") != current_compound_id]
    
    if non_compound_users:
        print(f"   ⚠️  Backend returns users from other compounds ({len(non_compound_users)} users)")
        print(f"   This suggests frontend should filter by compound_id")
    else:
        print(f"   ✅ Backend only returns users from current compound")
    
    # Test if there's a compound-specific endpoint
    compound_endpoints = [
        f"/admin/users?compound_id={current_compound_id}",
        f"/compounds/{current_compound_id}/users",
        f"/admin/compounds/{current_compound_id}/users"
    ]
    
    print(f"\n🧪 TESTING COMPOUND-SPECIFIC ENDPOINTS:")
    for endpoint in compound_endpoints:
        try:
            response = session.get(f"{BASE_URL}{endpoint}", headers=headers)
            if response.status_code == 200:
                data = response.json()
                users = data.get("users", data if isinstance(data, list) else [])
                print(f"   ✅ {endpoint}: {len(users)} users")
            else:
                print(f"   ❌ {endpoint}: Status {response.status_code}")
        except Exception as e:
            print(f"   ❌ {endpoint}: Exception {e}")
    
    print(f"\n" + "=" * 50)
    print("🎯 COMPOUND FILTERING DIAGNOSIS:")
    print("=" * 50)
    
    if len(current_compound_users) == 0:
        print("❌ ROOT CAUSE IDENTIFIED:")
        print("   No users exist for the current compound!")
        print("   Current compound ID:", current_compound_id)
        print("   All users belong to other compounds")
        print("")
        print("🔧 SOLUTIONS:")
        print("   1. Create users for the current compound")
        print("   2. Update existing users to use current compound ID")
        print("   3. Check if admin should see all compounds or just current one")
    else:
        print("✅ Users exist for current compound")
        print("   The issue might be in frontend filtering logic")
        print("")
        print("🔧 CHECK:")
        print("   1. Frontend should filter users by compound_id")
        print("   2. Frontend should use current user's compound_id for filtering")

if __name__ == "__main__":
    test_compound_users()