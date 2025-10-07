#!/usr/bin/env python3
"""
Invoice System Test with Resident User
Test invoice functionality using a resident user who has a family_id
"""

import requests
import json
import uuid
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://guest-portal-4.preview.emergentagent.com/api"

def test_invoice_with_resident():
    """Test invoice system with resident user"""
    session = requests.Session()
    
    print("💰 TESTING INVOICE SYSTEM WITH RESIDENT USER")
    print("=" * 60)
    
    # Step 1: Admin Authentication (to create maintenance fee)
    print("\n1. Admin Authentication...")
    admin_login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    response = session.post(f"{BASE_URL}/auth/login", json=admin_login_data)
    if response.status_code != 200:
        print(f"❌ Admin login failed: {response.status_code}")
        return False
    
    data = response.json()
    admin_token = data["access_token"]
    admin_user = data["user"]
    compound_id = admin_user["compound_id"]
    
    print(f"✅ Admin authenticated: {admin_user['username']}")
    
    # Step 2: Create a test residence
    print("\n2. Creating test residence...")
    unique_id = str(uuid.uuid4())[:8]
    residence_data = {
        'unit_number': f"INV{unique_id[:4]}",
        'full_name': f"Invoice Test User {unique_id}",
        'email': f"invtest{unique_id}@example.com",
        'phone': "+1234567890",
        'compound_id': compound_id
    }
    
    response = session.post(f"{BASE_URL}/admin/residences", data=residence_data, 
                          headers={"Authorization": f"Bearer {admin_token}"})
    
    if response.status_code != 200:
        print(f"❌ Failed to create residence: {response.status_code}")
        return False
    
    result = response.json()
    username = result.get("username")
    password = result.get("temporary_password")
    family_id = result.get("family_id")
    unit_number = residence_data['unit_number']
    
    print(f"✅ Residence created: {username}")
    print(f"   Unit: {unit_number}")
    print(f"   Family ID: {family_id}")
    
    # Step 3: Login as resident
    print("\n3. Resident Authentication...")
    resident_login_data = {
        "username": username,
        "password": password
    }
    
    response = session.post(f"{BASE_URL}/auth/login", json=resident_login_data)
    if response.status_code != 200:
        print(f"❌ Resident login failed: {response.status_code}")
        return False
    
    data = response.json()
    resident_token = data["access_token"]
    resident_user = data["user"]
    
    print(f"✅ Resident authenticated: {resident_user['username']}")
    print(f"   Family ID: {resident_user.get('family_id')}")
    print(f"   Is Family Head: {resident_user.get('is_family_head', False)}")
    
    resident_headers = {"Authorization": f"Bearer {resident_token}", "Content-Type": "application/json"}
    admin_headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    # Step 4: Check initial invoices (resident)
    print("\n4. Checking initial invoices (resident)...")
    response = session.get(f"{BASE_URL}/invoices/my", headers=resident_headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        invoices = response.json()
        print(f"   Initial invoices: {len(invoices) if isinstance(invoices, list) else 'Not a list'}")
    else:
        print(f"   Error: {response.text}")
    
    # Step 5: Create maintenance fee (admin creates for resident's unit)
    print("\n5. Creating maintenance fee for resident's unit...")
    fee_data = {
        "unit_number": unit_number,
        "amount": 250.00,
        "due_date": (datetime.now() + timedelta(days=30)).isoformat(),
        "description": "Monthly maintenance fee for invoice testing"
    }
    
    response = session.post(f"{BASE_URL}/maintenance-fees", json=fee_data, headers=admin_headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        fee_id = result.get("fee_id")
        print(f"✅ Maintenance fee created: {fee_id}")
    else:
        print(f"❌ Error: {response.text}")
        return False
    
    # Step 6: Check invoices after creation (resident)
    print("\n6. Checking invoices after maintenance fee creation (resident)...")
    response = session.get(f"{BASE_URL}/invoices/my", headers=resident_headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        invoices = response.json()
        print(f"   Invoices after creation: {len(invoices) if isinstance(invoices, list) else 'Not a list'}")
        if invoices:
            invoice = invoices[0]
            print(f"✅ Invoice found!")
            print(f"   Invoice ID: {invoice.get('id')}")
            print(f"   Amount: ${invoice.get('amount')}")
            print(f"   Status: {invoice.get('status')}")
            print(f"   Unit: {invoice.get('unit_number')}")
            print(f"   Due Date: {invoice.get('due_date')}")
            
            # Step 7: Test payment processing
            print("\n7. Testing payment processing...")
            payment_data = {
                "invoice_id": invoice["id"],
                "payment_method": "mock"
            }
            
            response = session.post(f"{BASE_URL}/payments", json=payment_data, headers=resident_headers)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Payment processed successfully!")
                print(f"   Payment ID: {result.get('payment_id')}")
                print(f"   Transaction ID: {result.get('transaction_id')}")
                
                # Step 8: Check invoice status after payment
                print("\n8. Checking invoice status after payment...")
                response = session.get(f"{BASE_URL}/invoices/my", headers=resident_headers)
                if response.status_code == 200:
                    updated_invoices = response.json()
                    if updated_invoices:
                        updated_invoice = updated_invoices[0]
                        print(f"   Updated status: {updated_invoice.get('status')}")
                        if updated_invoice.get('status') == 'paid':
                            print("✅ Invoice status correctly updated to 'paid'")
                            return True
                        else:
                            print("❌ Invoice status not updated to 'paid'")
                            return False
                    else:
                        print("❌ No invoices found after payment")
                        return False
                else:
                    print(f"❌ Failed to get updated invoices: {response.status_code}")
                    return False
            else:
                print(f"❌ Payment failed: {response.status_code} - {response.text}")
                return False
        else:
            print("❌ No invoices found after maintenance fee creation")
            return False
    else:
        print(f"❌ Error getting invoices: {response.text}")
        return False

if __name__ == "__main__":
    success = test_invoice_with_resident()
    if success:
        print("\n🎉 INVOICE SYSTEM TESTING COMPLETED SUCCESSFULLY!")
    else:
        print("\n⚠️ INVOICE SYSTEM TESTING COMPLETED WITH ISSUES")