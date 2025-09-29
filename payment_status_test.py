#!/usr/bin/env python3
"""
Quick test to verify payment status mapping issue
"""

import requests
import json

BASE_URL = "https://property-hub-110.preview.emergentagent.com/api"

def test_payment_status_mapping():
    """Test to verify payment status after payment processing"""
    
    # Login as admin
    admin_login = {
        "username": "admin",
        "password": "admin123"
    }
    
    session = requests.Session()
    response = session.post(f"{BASE_URL}/auth/login", json=admin_login)
    
    if response.status_code != 200:
        print("❌ Admin login failed")
        return
    
    admin_token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    # Get existing bookings to check payment status
    response = session.get(f"{BASE_URL}/service-bookings", headers=headers)
    
    if response.status_code == 200:
        bookings = response.json().get("bookings", [])
        if bookings:
            booking = bookings[0]  # Get first booking
            print(f"Booking ID: {booking.get('id')}")
            print(f"Payment Status: {booking.get('payment_status')}")
            print(f"Payment Method: {booking.get('payment_method')}")
            print(f"Payment ID: {booking.get('payment_id')}")
            print(f"Final Cost: {booking.get('final_cost')}")
            
            # Check if payment_status is "completed" instead of "paid"
            if booking.get('payment_status') == 'completed':
                print("✅ ISSUE CONFIRMED: payment_status is 'completed' instead of 'paid'")
            elif booking.get('payment_status') == 'paid':
                print("✅ Payment status is correctly set to 'paid'")
            else:
                print(f"⚠️  Payment status is: {booking.get('payment_status')}")
        else:
            print("No bookings found")
    else:
        print(f"❌ Failed to get bookings: {response.status_code}")

if __name__ == "__main__":
    test_payment_status_mapping()