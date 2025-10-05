#!/usr/bin/env python3
"""
Payment Processing Debug Test Suite
Focused testing for payment processing functionality that's failing
"""

import requests
import json
import uuid
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional

# Configuration
BASE_URL = "https://compound-manager.preview.emergentagent.com/api"

class PaymentDebugTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.resident_token = None
        self.admin_user = None
        self.resident_user = None
        self.compound_id = None
        self.test_provider_id = None
        self.test_booking_id = None
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
    
    def authenticate_admin(self):
        """Authenticate as admin"""
        print("\n=== Authenticating Admin ===")
        
        try:
            admin_login_data = {
                "username": "admin",
                "password": "admin123"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=admin_login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                self.admin_user = data["user"]
                self.compound_id = self.admin_user["compound_id"]
                self.log_result("Admin Authentication", True, "Admin authenticated successfully")
                return True
            else:
                self.log_result("Admin Authentication", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Authentication", False, f"Exception occurred: {str(e)}")
            return False
    
    def authenticate_resident(self):
        """Authenticate as resident or create one"""
        print("\n=== Authenticating Resident ===")
        
        try:
            # Try existing resident first
            resident_login_data = {
                "username": "testuser",
                "password": "password123"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=resident_login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.resident_token = data["access_token"]
                self.resident_user = data["user"]
                self.log_result("Resident Authentication", True, "Resident authenticated successfully")
                return True
            else:
                # Create new resident
                return self.create_test_resident()
                
        except Exception as e:
            self.log_result("Resident Authentication", False, f"Exception occurred: {str(e)}")
            return False
    
    def create_test_resident(self):
        """Create a test resident user"""
        try:
            if not self.admin_token:
                self.log_result("Create Test Resident", False, "No admin token available")
                return False
            
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            unique_id = str(uuid.uuid4())[:8]
            
            data = {
                'unit_number': f"PAY{unique_id[:4]}",
                'full_name': f"Payment Test User {unique_id}",
                'email': f"paytest{unique_id}@example.com",
                'phone': "+1234567890",
                'compound_id': self.compound_id
            }
            
            response = self.session.post(f"{BASE_URL}/admin/residences", data=data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                username = result.get("username")
                password = result.get("temporary_password")
                
                # Login with new resident
                login_data = {"username": username, "password": password}
                login_response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
                
                if login_response.status_code == 200:
                    data = login_response.json()
                    self.resident_token = data["access_token"]
                    self.resident_user = data["user"]
                    self.log_result("Create Test Resident", True, f"Test resident created and authenticated: {username}")
                    return True
                else:
                    self.log_result("Create Test Resident", False, f"Failed to login with new resident: {login_response.status_code}")
                    return False
            else:
                self.log_result("Create Test Resident", False, f"Failed to create resident: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Create Test Resident", False, f"Exception occurred: {str(e)}")
            return False
    
    def setup_service_provider(self):
        """Create or get a service provider for testing"""
        print("\n=== Setting Up Service Provider ===")
        
        if not self.admin_token:
            self.log_result("Setup Service Provider", False, "No admin token available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # First try to get existing providers
            response = self.session.get(f"{BASE_URL}/service-providers", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                providers = data.get("providers", [])
                if providers:
                    self.test_provider_id = providers[0]["id"]
                    self.log_result("Setup Service Provider", True, f"Using existing provider: {self.test_provider_id}")
                    return True
            
            # Create new provider if none exist
            unique_id = str(uuid.uuid4())[:8]
            provider_data = {
                "full_name": f"Payment Test Provider {unique_id}",
                "email": f"provider{unique_id}@example.com",
                "phone": "+1234567890",
                "services": ["maintenance", "cleaning"],
                "specialties": ["plumber", "electrician"],
                "bio": "Test provider for payment debugging",
                "hourly_rate": 50.0
            }
            
            response = self.session.post(f"{BASE_URL}/service-providers", 
                                       json=provider_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                provider_id = result.get("provider_id") or (result.get("provider", {}).get("id"))
                if provider_id:
                    self.test_provider_id = provider_id
                    self.log_result("Setup Service Provider", True, f"Created new provider: {self.test_provider_id}")
                    return True
                else:
                    self.log_result("Setup Service Provider", False, f"No provider ID in response: {result}")
                    return False
            else:
                self.log_result("Setup Service Provider", False, f"Failed to create provider: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Setup Service Provider", False, f"Exception occurred: {str(e)}")
            return False
    
    def create_test_booking(self):
        """Create a service booking for payment testing"""
        print("\n=== Creating Test Service Booking ===")
        
        if not self.resident_token or not self.test_provider_id:
            self.log_result("Create Test Booking", False, "No resident token or provider ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            
            booking_data = {
                "provider_id": self.test_provider_id,
                "service_category": "maintenance",
                "service_specialty": "plumber",
                "title": "Payment Test - Kitchen Sink Repair",
                "description": "Test booking for payment processing debugging",
                "priority": "standard",
                "scheduled_date": (datetime.now() + timedelta(days=1)).date().isoformat(),
                "scheduled_time": "10:00",
                "scheduled_end_time": "12:00",
                "payment_method": "cash",
                "booking_notes": "Test booking for payment debugging"
            }
            
            response = self.session.post(f"{BASE_URL}/service-bookings", 
                                       json=booking_data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                booking_id = result.get("booking_id") or (result.get("booking", {}).get("id"))
                if booking_id:
                    self.test_booking_id = booking_id
                    self.log_result("Create Test Booking", True, f"Service booking created: {self.test_booking_id}")
                    
                    # Debug: Print the booking data to check fields
                    print(f"    Booking Response: {json.dumps(result, indent=2)}")
                    return True
                else:
                    self.log_result("Create Test Booking", False, f"No booking ID in response: {result}")
                    return False
            else:
                self.log_result("Create Test Booking", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Test Booking", False, f"Exception occurred: {str(e)}")
            return False
    
    def debug_booking_data(self):
        """Debug booking data to check for missing fields"""
        print("\n=== Debugging Booking Data ===")
        
        if not self.resident_token or not self.test_booking_id:
            self.log_result("Debug Booking Data", False, "No resident token or booking ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            
            # Get the booking details
            response = self.session.get(f"{BASE_URL}/service-bookings", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                bookings = data.get("bookings", [])
                
                # Find our test booking
                test_booking = None
                for booking in bookings:
                    if booking.get("id") == self.test_booking_id:
                        test_booking = booking
                        break
                
                if test_booking:
                    print(f"    Found booking: {json.dumps(test_booking, indent=2)}")
                    
                    # Check for required fields
                    required_fields = ["service_id", "provider_id", "resident_id", "compound_id"]
                    missing_fields = []
                    present_fields = []
                    
                    for field in required_fields:
                        if field in test_booking:
                            present_fields.append(field)
                        else:
                            missing_fields.append(field)
                    
                    if missing_fields:
                        self.log_result("Debug Booking Data", False, 
                                      f"Missing required fields: {missing_fields}. Present fields: {present_fields}",
                                      f"Full booking data: {json.dumps(test_booking, indent=2)}")
                    else:
                        self.log_result("Debug Booking Data", True, 
                                      f"All required fields present: {present_fields}")
                    
                    return len(missing_fields) == 0
                else:
                    self.log_result("Debug Booking Data", False, f"Test booking {self.test_booking_id} not found in bookings list")
                    return False
            else:
                self.log_result("Debug Booking Data", False, f"Failed to get bookings: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Debug Booking Data", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_payment_processing_card(self):
        """Test payment processing with card method"""
        print("\n=== Testing Payment Processing - Card ===")
        
        if not self.resident_token or not self.test_booking_id:
            self.log_result("Payment Processing - Card", False, "No resident token or booking ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            
            payment_request = {
                "payment_method": "card",
                "amount": 150.00,
                "currency": "USD",
                "metadata": {
                    "booking_id": self.test_booking_id,
                    "test_payment": True
                }
            }
            
            response = self.session.post(f"{BASE_URL}/service-bookings/{self.test_booking_id}/payment", 
                                       json=payment_request, headers=headers)
            
            print(f"    Payment Response Status: {response.status_code}")
            print(f"    Payment Response Body: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Payment processed successfully":
                    transaction = result.get("transaction", {})
                    transaction_id = transaction.get("id")
                    if transaction_id:
                        self.log_result("Payment Processing - Card", True, 
                                      f"Payment processed successfully. Transaction ID: {transaction_id}")
                        return True
                    else:
                        self.log_result("Payment Processing - Card", False, 
                                      "No transaction ID in response", 
                                      f"Response: {json.dumps(result, indent=2)}")
                        return False
                else:
                    self.log_result("Payment Processing - Card", False, 
                                  f"Unexpected response message: {result.get('message')}", 
                                  f"Full response: {json.dumps(result, indent=2)}")
                    return False
            else:
                self.log_result("Payment Processing - Card", False, 
                              f"Failed with status {response.status_code}", 
                              response.text)
                return False
                
        except Exception as e:
            self.log_result("Payment Processing - Card", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_payment_processing_mobile_pay(self):
        """Test payment processing with mobile_pay method"""
        print("\n=== Testing Payment Processing - Mobile Pay ===")
        
        if not self.resident_token or not self.test_booking_id:
            self.log_result("Payment Processing - Mobile Pay", False, "No resident token or booking ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            
            payment_request = {
                "payment_method": "mobile_pay",
                "amount": 100.00,
                "currency": "USD",
                "metadata": {
                    "booking_id": self.test_booking_id,
                    "test_payment": True
                }
            }
            
            response = self.session.post(f"{BASE_URL}/service-bookings/{self.test_booking_id}/payment", 
                                       json=payment_request, headers=headers)
            
            print(f"    Payment Response Status: {response.status_code}")
            print(f"    Payment Response Body: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Payment processed successfully":
                    transaction = result.get("transaction", {})
                    transaction_id = transaction.get("id")
                    if transaction_id:
                        self.log_result("Payment Processing - Mobile Pay", True, 
                                      f"Payment processed successfully. Transaction ID: {transaction_id}")
                        return True
                    else:
                        self.log_result("Payment Processing - Mobile Pay", False, 
                                      "No transaction ID in response", 
                                      f"Response: {json.dumps(result, indent=2)}")
                        return False
                else:
                    self.log_result("Payment Processing - Mobile Pay", False, 
                                  f"Unexpected response message: {result.get('message')}", 
                                  f"Full response: {json.dumps(result, indent=2)}")
                    return False
            else:
                self.log_result("Payment Processing - Mobile Pay", False, 
                              f"Failed with status {response.status_code}", 
                              response.text)
                return False
                
        except Exception as e:
            self.log_result("Payment Processing - Mobile Pay", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_payment_processing_qr_code(self):
        """Test payment processing with qr_code method"""
        print("\n=== Testing Payment Processing - QR Code ===")
        
        if not self.resident_token or not self.test_booking_id:
            self.log_result("Payment Processing - QR Code", False, "No resident token or booking ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            
            payment_request = {
                "payment_method": "qr_code",
                "amount": 75.00,
                "currency": "USD",
                "metadata": {
                    "booking_id": self.test_booking_id,
                    "test_payment": True
                }
            }
            
            response = self.session.post(f"{BASE_URL}/service-bookings/{self.test_booking_id}/payment", 
                                       json=payment_request, headers=headers)
            
            print(f"    Payment Response Status: {response.status_code}")
            print(f"    Payment Response Body: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get("message") == "Payment processed successfully":
                    transaction = result.get("transaction", {})
                    transaction_id = transaction.get("id")
                    if transaction_id:
                        self.log_result("Payment Processing - QR Code", True, 
                                      f"Payment processed successfully. Transaction ID: {transaction_id}")
                        return True
                    else:
                        self.log_result("Payment Processing - QR Code", False, 
                                      "No transaction ID in response", 
                                      f"Response: {json.dumps(result, indent=2)}")
                        return False
                else:
                    self.log_result("Payment Processing - QR Code", False, 
                                  f"Unexpected response message: {result.get('message')}", 
                                  f"Full response: {json.dumps(result, indent=2)}")
                    return False
            else:
                self.log_result("Payment Processing - QR Code", False, 
                              f"Failed with status {response.status_code}", 
                              response.text)
                return False
                
        except Exception as e:
            self.log_result("Payment Processing - QR Code", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_all_payment_methods(self):
        """Test all 7 payment methods"""
        print("\n=== Testing All Payment Methods ===")
        
        if not self.resident_token or not self.test_booking_id:
            self.log_result("All Payment Methods", False, "No resident token or booking ID available")
            return False
        
        payment_methods = [
            {"method": "cash", "amount": 50.00},
            {"method": "card", "amount": 60.00},
            {"method": "bank_transfer", "amount": 70.00},
            {"method": "instapay", "amount": 80.00},
            {"method": "mobile_pay", "amount": 90.00},
            {"method": "digital_wallet", "amount": 100.00},
            {"method": "qr_code", "amount": 110.00}
        ]
        
        success_count = 0
        failed_methods = []
        
        for payment_data in payment_methods:
            try:
                headers = self.setup_auth_headers(self.resident_token)
                
                payment_request = {
                    "payment_method": payment_data["method"],
                    "amount": payment_data["amount"],
                    "currency": "USD",
                    "metadata": {
                        "booking_id": self.test_booking_id,
                        "test_payment": True
                    }
                }
                
                response = self.session.post(f"{BASE_URL}/service-bookings/{self.test_booking_id}/payment", 
                                           json=payment_request, headers=headers)
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("message") == "Payment processed successfully":
                        transaction = result.get("transaction", {})
                        if transaction.get("id"):
                            success_count += 1
                            print(f"    ✅ {payment_data['method']}: SUCCESS")
                        else:
                            failed_methods.append(f"{payment_data['method']} (no transaction ID)")
                            print(f"    ❌ {payment_data['method']}: No transaction ID")
                    else:
                        failed_methods.append(f"{payment_data['method']} (unexpected response)")
                        print(f"    ❌ {payment_data['method']}: {result.get('message', 'Unknown error')}")
                else:
                    failed_methods.append(f"{payment_data['method']} (HTTP {response.status_code})")
                    print(f"    ❌ {payment_data['method']}: HTTP {response.status_code}")
                    
            except Exception as e:
                failed_methods.append(f"{payment_data['method']} (exception: {str(e)})")
                print(f"    ❌ {payment_data['method']}: Exception - {str(e)}")
        
        if success_count > 0:
            self.log_result("All Payment Methods", True, 
                          f"Successfully processed {success_count}/{len(payment_methods)} payment methods",
                          f"Failed methods: {failed_methods}" if failed_methods else "All methods successful")
            return True
        else:
            self.log_result("All Payment Methods", False, 
                          "No payment methods worked successfully",
                          f"All failed methods: {failed_methods}")
            return False
    
    def verify_transaction_creation(self):
        """Verify that payment transactions are properly created and stored"""
        print("\n=== Verifying Transaction Creation ===")
        
        # This would require a backend endpoint to retrieve transactions
        # For now, we'll check if the booking payment status was updated
        if not self.resident_token or not self.test_booking_id:
            self.log_result("Verify Transaction Creation", False, "No resident token or booking ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            
            # Get the booking details to check payment status
            response = self.session.get(f"{BASE_URL}/service-bookings", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                bookings = data.get("bookings", [])
                
                # Find our test booking
                test_booking = None
                for booking in bookings:
                    if booking.get("id") == self.test_booking_id:
                        test_booking = booking
                        break
                
                if test_booking:
                    payment_status = test_booking.get("payment_status")
                    payment_id = test_booking.get("payment_id")
                    
                    if payment_status == "paid" and payment_id:
                        self.log_result("Verify Transaction Creation", True, 
                                      f"Booking payment status updated to 'paid' with payment_id: {payment_id}")
                        return True
                    elif payment_status == "paid":
                        self.log_result("Verify Transaction Creation", True, 
                                      "Booking payment status updated to 'paid' (no payment_id field)")
                        return True
                    else:
                        self.log_result("Verify Transaction Creation", False, 
                                      f"Booking payment status not updated. Current status: {payment_status}")
                        return False
                else:
                    self.log_result("Verify Transaction Creation", False, 
                                  f"Test booking {self.test_booking_id} not found")
                    return False
            else:
                self.log_result("Verify Transaction Creation", False, 
                              f"Failed to get bookings: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Verify Transaction Creation", False, f"Exception occurred: {str(e)}")
            return False
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("PAYMENT PROCESSING DEBUG TEST SUMMARY")
        print("="*80)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for result in self.results if "✅ PASS" in result["status"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['message']}")
                    if result["details"]:
                        print(f"    Details: {result['details']}")
        
        print("\n✅ PASSED TESTS:")
        for result in self.results:
            if "✅ PASS" in result["status"]:
                print(f"  - {result['test']}: {result['message']}")
        
        return passed_tests, failed_tests
    
    def run_payment_debug_tests(self):
        """Run the complete payment debugging test suite"""
        print("🔍 STARTING PAYMENT PROCESSING DEBUG TESTS")
        print("="*60)
        
        # Step 1: Authentication
        if not self.authenticate_admin():
            print("❌ Admin authentication failed - stopping tests")
            return self.print_summary()
        
        if not self.authenticate_resident():
            print("❌ Resident authentication failed - stopping tests")
            return self.print_summary()
        
        # Step 2: Setup
        if not self.setup_service_provider():
            print("❌ Service provider setup failed - stopping tests")
            return self.print_summary()
        
        # Step 3: Create test booking
        if not self.create_test_booking():
            print("❌ Test booking creation failed - stopping tests")
            return self.print_summary()
        
        # Step 4: Debug booking data
        self.debug_booking_data()
        
        # Step 5: Test specific payment methods
        self.test_payment_processing_card()
        self.test_payment_processing_mobile_pay()
        self.test_payment_processing_qr_code()
        
        # Step 6: Test all payment methods
        self.test_all_payment_methods()
        
        # Step 7: Verify transaction creation
        self.verify_transaction_creation()
        
        return self.print_summary()

if __name__ == "__main__":
    test_suite = PaymentDebugTestSuite()
    passed, failed = test_suite.run_payment_debug_tests()
    
    if failed > 0:
        exit(1)
    else:
        exit(0)