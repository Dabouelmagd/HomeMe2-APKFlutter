#!/usr/bin/env python3
"""
Debug Invoice System Test
Detailed investigation of invoice creation and retrieval issues
"""

import requests
import json
import uuid
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://homeme-subscriptions.preview.emergentagent.com/api"

def debug_invoice_system():
    """Debug the invoice system step by step"""
    session = requests.Session()
    
    print("🔍 DEBUGGING INVOICE SYSTEM")
    print("=" * 50)
    
    # Step 1: Admin Authentication
    print("\n1. Admin Authentication...")
    admin_login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    response = session.post(f"{BASE_URL}/auth/login", json=admin_login_data)
    if response.status_code != 200:
        print(f"❌ Admin login failed: {response.status_code}")
        return
    
    data = response.json()
    admin_token = data["access_token"]
    admin_user = data["user"]
    compound_id = admin_user["compound_id"]
    
    print(f"✅ Admin authenticated: {admin_user['username']}")
    print(f"   Compound ID: {compound_id}")
    print(f"   Family ID: {admin_user.get('family_id', 'None')}")
    print(f"   Is Family Head: {admin_user.get('is_family_head', False)}")
    
    headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    # Step 2: Check initial invoices
    print("\n2. Checking initial invoices...")
    response = session.get(f"{BASE_URL}/invoices/my", headers=headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        invoices = response.json()
        print(f"   Initial invoices: {len(invoices) if isinstance(invoices, list) else 'Not a list'}")
        if invoices:
            print(f"   Sample invoice: {invoices[0] if isinstance(invoices, list) else invoices}")
    else:
        print(f"   Error: {response.text}")
    
    # Step 3: Check families
    print("\n3. Checking families...")
    response = session.get(f"{BASE_URL}/families/my", headers=headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        families = response.json()
        print(f"   Families data: {families}")
    else:
        print(f"   Error: {response.text}")
    
    # Step 4: Check residences
    print("\n4. Checking residences...")
    response = session.get(f"{BASE_URL}/compounds/{compound_id}/residences", headers=headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        residences_data = response.json()
        residences = residences_data.get("residences", [])
        print(f"   Total residences: {len(residences)}")
        if residences:
            sample_residence = residences[0]
            print(f"   Sample residence unit: {sample_residence.get('unit_number')}")
            print(f"   Sample residence family_id: {sample_residence.get('family_id', 'None')}")
    else:
        print(f"   Error: {response.text}")
    
    # Step 5: Create a test residence if needed
    print("\n5. Creating test residence for invoice testing...")
    unique_id = str(uuid.uuid4())[:8]
    residence_data = {
        'unit_number': f"DBG{unique_id[:4]}",
        'full_name': f"Debug Test User {unique_id}",
        'email': f"debug{unique_id}@example.com",
        'phone': "+1234567890",
        'compound_id': compound_id
    }
    
    response = session.post(f"{BASE_URL}/admin/residences", data=residence_data, 
                          headers={"Authorization": f"Bearer {admin_token}"})
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   Created residence: {result}")
        test_unit_number = residence_data['unit_number']
    else:
        print(f"   Error: {response.text}")
        # Use existing residence
        if residences:
            test_unit_number = residences[0].get('unit_number')
            print(f"   Using existing unit: {test_unit_number}")
        else:
            print("   No residences available for testing")
            return
    
    # Step 6: Create maintenance fee (which should create invoice)
    print("\n6. Creating maintenance fee...")
    fee_data = {
        "unit_number": test_unit_number,
        "amount": 200.00,
        "due_date": (datetime.now() + timedelta(days=30)).isoformat(),
        "description": "Debug test maintenance fee"
    }
    
    response = session.post(f"{BASE_URL}/maintenance-fees", json=fee_data, headers=headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"   Maintenance fee created: {result}")
    else:
        print(f"   Error: {response.text}")
    
    # Step 7: Check invoices again
    print("\n7. Checking invoices after maintenance fee creation...")
    response = session.get(f"{BASE_URL}/invoices/my", headers=headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        invoices = response.json()
        print(f"   Invoices after creation: {len(invoices) if isinstance(invoices, list) else 'Not a list'}")
        if invoices:
            print(f"   Invoice details: {json.dumps(invoices, indent=2, default=str)}")
        else:
            print("   Still no invoices found!")
    else:
        print(f"   Error: {response.text}")
    
    # Step 8: Check families again to see if family was created
    print("\n8. Checking families after residence creation...")
    response = session.get(f"{BASE_URL}/families/my", headers=headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        families = response.json()
        print(f"   Families after residence creation: {families}")
    else:
        print(f"   Error: {response.text}")
    
    # Step 9: Try to create invoice directly (if there's an endpoint)
    print("\n9. Investigation complete")
    print("   Summary:")
    print(f"   - Admin user family_id: {admin_user.get('family_id', 'None')}")
    print(f"   - Maintenance fee creation: {'Success' if response.status_code == 200 else 'Failed'}")
    print(f"   - Invoice retrieval: {'Success' if len(invoices) > 0 else 'No invoices found'}")

if __name__ == "__main__":
    debug_invoice_system()