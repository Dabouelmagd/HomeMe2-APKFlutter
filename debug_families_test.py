#!/usr/bin/env python3
"""
Debug the families endpoint response format
"""

import requests
import json

BASE_URL = "https://compound-manager.preview.emergentagent.com/api"

def debug_families_endpoint():
    # Login as admin
    credentials = {"username": "admin", "password": "admin123"}
    session = requests.Session()
    
    response = session.post(f"{BASE_URL}/auth/login", json=credentials)
    if response.status_code != 200:
        print("Failed to login")
        return
    
    data = response.json()
    admin_token = data["access_token"]
    
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Test families endpoint
    print("Testing /families/my endpoint:")
    families_response = session.get(f"{BASE_URL}/families/my", headers=headers)
    print(f"Status: {families_response.status_code}")
    
    if families_response.status_code == 200:
        families_data = families_response.json()
        print(f"Response type: {type(families_data)}")
        print(f"Response content: {json.dumps(families_data, indent=2)}")
    else:
        print(f"Error: {families_response.text}")
    
    # Test invoices endpoint for comparison
    print("\nTesting /invoices/my endpoint:")
    invoices_response = session.get(f"{BASE_URL}/invoices/my", headers=headers)
    print(f"Status: {invoices_response.status_code}")
    
    if invoices_response.status_code == 200:
        invoices_data = invoices_response.json()
        print(f"Response type: {type(invoices_data)}")
        print(f"Number of invoices: {len(invoices_data) if isinstance(invoices_data, list) else 'N/A'}")
        if isinstance(invoices_data, list) and invoices_data:
            print(f"Sample invoice keys: {list(invoices_data[0].keys())}")
    else:
        print(f"Error: {invoices_response.text}")

if __name__ == "__main__":
    debug_families_endpoint()