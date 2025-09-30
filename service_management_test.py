#!/usr/bin/env python3
"""
Enhanced Service Management System Test Suite
Tests all service provider, booking, payment, review, and analytics endpoints
"""

import requests
import json
import uuid
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional

# Configuration
BASE_URL = "https://translate-home.preview.emergentagent.com/api"

class ServiceManagementTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.resident_token = None
        self.admin_user = None
        self.resident_user = None
        self.compound_id = None
        self.test_provider_id = None
        self.test_booking_id = None
        self.test_payment_id = None
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
    
    def test_authentication(self):
        """Test user authentication and setup"""
        print("\n=== Testing Authentication ===")
        
        # Test admin login
        try:
            admin_login_data = {
                "username": "johndoe",
                "password": "password123"
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login", json=admin_login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                self.admin_user = data["user"]
                self.compound_id = self.admin_user["compound_id"]
                self.log_result("Admin Login", True, "Admin authenticated successfully")
            else:
                self.log_result("Admin Login", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Login", False, f"Exception occurred: {str(e)}")
            return False
        
        # Test resident login
        try:
            existing_residents = ["resident1", "alice", "bob", "testuser"]
            
            for username in existing_residents:
                resident_login_data = {
                    "username": username,
                    "password": "password123"
                }
                
                response = self.session.post(f"{BASE_URL}/auth/login", json=resident_login_data)
                
                if response.status_code == 200:
                    data = response.json()
                    self.resident_token = data["access_token"]
                    self.resident_user = data["user"]
                    self.log_result("Resident Login", True, f"Resident '{username}' authenticated successfully")
                    break
            
            if not self.resident_token:
                # Create a new resident
                unique_id = str(uuid.uuid4())[:8]
                resident_register_data = {
                    "username": f"testservice{unique_id}",
                    "email": f"testservice{unique_id}@example.com",
                    "password": "password123",
                    "role": "resident",
                    "compound_id": self.compound_id,
                    "full_name": f"Test Service Resident {unique_id}",
                    "phone": "+1234567890",
                    "unit_number": f"20{unique_id[:1]}"
                }
                
                register_response = self.session.post(f"{BASE_URL}/auth/register", json=resident_register_data)
                
                if register_response.status_code == 200:
                    login_response = self.session.post(f"{BASE_URL}/auth/login", json={
                        "username": resident_register_data["username"],
                        "password": "password123"
                    })
                    
                    if login_response.status_code == 200:
                        data = login_response.json()
                        self.resident_token = data["access_token"]
                        self.resident_user = data["user"]
                        self.log_result("Resident Login", True, "New resident created and authenticated successfully")
                    else:
                        self.log_result("Resident Login", False, f"Failed to login after registration: {login_response.status_code}")
                        return False
                else:
                    self.log_result("Resident Login", False, f"Failed to register resident: {register_response.status_code}", register_response.text)
                    return False
                    
        except Exception as e:
            self.log_result("Resident Login", False, f"Exception occurred: {str(e)}")
            return False
        
        return True
    
    def test_create_service_provider(self):
        """Test POST /api/service-providers - Create service provider"""
        print("\n=== Testing Create Service Provider ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # First try to get existing providers
            existing_response = self.session.get(f"{BASE_URL}/service-providers", headers=headers)
            if existing_response.status_code == 200:
                existing_data = existing_response.json()
                existing_providers = existing_data.get("providers", [])
                
                # If we have existing providers, use the first one
                if existing_providers:
                    self.test_provider_id = existing_providers[0]["id"]
                    self.log_result("Create Service Provider", True, f"Using existing service provider with ID: {self.test_provider_id}")
                    return True
            
            # If no existing providers, create a new one
            unique_id = str(uuid.uuid4())[:8]
            provider_data = {
                "full_name": f"John Smith {unique_id}",
                "email": f"john.smith.{unique_id}@example.com",
                "phone": "+1234567890",
                "services": ["maintenance", "cleaning"],
                "specialties": ["plumbing", "electrical", "deep cleaning"],
                "bio": "Experienced maintenance professional with 10+ years in residential services",
                "hourly_rate": 75.0
            }
            
            response = self.session.post(f"{BASE_URL}/service-providers", json=provider_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                provider = data.get("provider")
                if provider:
                    self.test_provider_id = provider["id"]
                    self.log_result("Create Service Provider", True, f"Service provider created successfully with ID: {self.test_provider_id}")
                    return True
                else:
                    self.log_result("Create Service Provider", False, "No provider data in response")
                    return False
            elif response.status_code == 400 and "already exists" in response.text:
                # Provider already exists, try to get it
                get_response = self.session.get(f"{BASE_URL}/service-providers", headers=headers)
                if get_response.status_code == 200:
                    get_data = get_response.json()
                    providers = get_data.get("providers", [])
                    if providers:
                        self.test_provider_id = providers[0]["id"]
                        self.log_result("Create Service Provider", True, f"Using existing service provider with ID: {self.test_provider_id}")
                        return True
                
                self.log_result("Create Service Provider", False, "Provider exists but couldn't retrieve it")
                return False
            else:
                self.log_result("Create Service Provider", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Service Provider", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_service_providers(self):
        """Test GET /api/service-providers with filters"""
        print("\n=== Testing Get Service Providers ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test basic get all providers
            response = self.session.get(f"{BASE_URL}/service-providers", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                providers = data.get("providers", [])
                self.log_result("Get All Service Providers", True, f"Retrieved {len(providers)} service providers")
                
                # Test filtering by service category
                filter_response = self.session.get(f"{BASE_URL}/service-providers?service_category=maintenance", headers=headers)
                
                if filter_response.status_code == 200:
                    filter_data = filter_response.json()
                    filtered_providers = filter_data.get("providers", [])
                    self.log_result("Filter by Service Category", True, f"Retrieved {len(filtered_providers)} maintenance providers")
                    
                    # Test filtering by specialty
                    specialty_response = self.session.get(f"{BASE_URL}/service-providers?specialty=plumbing", headers=headers)
                    
                    if specialty_response.status_code == 200:
                        specialty_data = specialty_response.json()
                        specialty_providers = specialty_data.get("providers", [])
                        self.log_result("Filter by Specialty", True, f"Retrieved {len(specialty_providers)} plumbing specialists")
                        
                        # Test filtering by availability
                        availability_response = self.session.get(f"{BASE_URL}/service-providers?availability=available", headers=headers)
                        
                        if availability_response.status_code == 200:
                            availability_data = availability_response.json()
                            available_providers = availability_data.get("providers", [])
                            self.log_result("Filter by Availability", True, f"Retrieved {len(available_providers)} available providers")
                            return True
                        else:
                            self.log_result("Filter by Availability", False, f"Failed with status {availability_response.status_code}")
                            return False
                    else:
                        self.log_result("Filter by Specialty", False, f"Failed with status {specialty_response.status_code}")
                        return False
                else:
                    self.log_result("Filter by Service Category", False, f"Failed with status {filter_response.status_code}")
                    return False
            else:
                self.log_result("Get All Service Providers", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Service Providers", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_service_booking(self):
        """Test POST /api/service-bookings - Create service booking"""
        print("\n=== Testing Create Service Booking ===")
        
        if not self.test_provider_id:
            self.log_result("Create Service Booking", False, "No test provider ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            
            # Test emergency priority booking
            emergency_booking_data = {
                "provider_id": self.test_provider_id,
                "service_category": "maintenance",
                "service_specialty": "plumbing",
                "title": "Emergency Pipe Burst",
                "description": "Water pipe burst in kitchen, need immediate assistance",
                "priority": "emergency",
                "payment_method": "cash",
                "booking_notes": "Please bring emergency repair kit"
            }
            
            response = self.session.post(f"{BASE_URL}/service-bookings", json=emergency_booking_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                booking = data.get("booking")
                if booking:
                    self.test_booking_id = booking["id"]
                    self.log_result("Create Emergency Booking", True, f"Emergency booking created successfully with ID: {self.test_booking_id}")
                    
                    # Test scheduled booking
                    scheduled_date = (datetime.now() + timedelta(days=4)).date()  # Use different date
                    scheduled_booking_data = {
                        "provider_id": self.test_provider_id,
                        "service_category": "cleaning",
                        "service_specialty": "deep cleaning",
                        "title": "Weekly Deep Cleaning",
                        "description": "Regular deep cleaning service for apartment",
                        "priority": "scheduled",
                        "scheduled_date": scheduled_date.isoformat(),
                        "scheduled_time": "08:00",  # Use different time
                        "scheduled_end_time": "12:00",
                        "is_recurring": True,
                        "recurrence_pattern": "weekly",
                        "payment_method": "credit_card",
                        "estimated_duration": 240,
                        "booking_notes": "Please use eco-friendly products"
                    }
                    
                    scheduled_response = self.session.post(f"{BASE_URL}/service-bookings", json=scheduled_booking_data, headers=headers)
                    
                    if scheduled_response.status_code == 200:
                        scheduled_data = scheduled_response.json()
                        scheduled_booking = scheduled_data.get("booking")
                        if scheduled_booking:
                            self.log_result("Create Scheduled Booking", True, f"Scheduled booking created successfully with ID: {scheduled_booking['id']}")
                            return True
                        else:
                            self.log_result("Create Scheduled Booking", False, "No booking data in scheduled response")
                            return False
                    else:
                        self.log_result("Create Scheduled Booking", False, f"Failed with status {scheduled_response.status_code}", scheduled_response.text)
                        return False
                else:
                    self.log_result("Create Emergency Booking", False, "No booking data in response")
                    return False
            else:
                self.log_result("Create Emergency Booking", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Service Booking", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_service_bookings(self):
        """Test GET /api/service-bookings - Get user bookings"""
        print("\n=== Testing Get Service Bookings ===")
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/service-bookings", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                bookings = data.get("bookings", [])
                self.log_result("Get Service Bookings", True, f"Retrieved {len(bookings)} service bookings")
                
                # Test filtering by status
                status_response = self.session.get(f"{BASE_URL}/service-bookings?status=pending", headers=headers)
                
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    pending_bookings = status_data.get("bookings", [])
                    self.log_result("Filter Bookings by Status", True, f"Retrieved {len(pending_bookings)} pending bookings")
                    return True
                else:
                    self.log_result("Filter Bookings by Status", False, f"Failed with status {status_response.status_code}")
                    return False
            else:
                self.log_result("Get Service Bookings", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Service Bookings", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_update_booking_status(self):
        """Test PUT /api/service-bookings/{id}/status - Update booking status"""
        print("\n=== Testing Update Booking Status ===")
        
        if not self.test_booking_id:
            self.log_result("Update Booking Status", False, "No test booking ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # Test confirming booking
            status_data = {
                "status": "confirmed",
                "notes": "Booking confirmed, technician will arrive at scheduled time"
            }
            
            response = self.session.put(f"{BASE_URL}/service-bookings/{self.test_booking_id}/status", 
                                      json=status_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("message") == "Booking status updated successfully":
                    self.log_result("Confirm Booking Status", True, "Booking status updated to confirmed")
                    
                    # Test updating to in_progress
                    progress_data = {
                        "status": "in_progress",
                        "notes": "Technician has arrived and started work"
                    }
                    
                    progress_response = self.session.put(f"{BASE_URL}/service-bookings/{self.test_booking_id}/status", 
                                                       json=progress_data, headers=headers)
                    
                    if progress_response.status_code == 200:
                        progress_result = progress_response.json()
                        if progress_result.get("message") == "Booking status updated successfully":
                            self.log_result("Update to In Progress", True, "Booking status updated to in_progress")
                            
                            # Test completing booking
                            complete_data = {
                                "status": "completed",
                                "notes": "Service completed successfully",
                                "final_cost": 150.0
                            }
                            
                            complete_response = self.session.put(f"{BASE_URL}/service-bookings/{self.test_booking_id}/status", 
                                                               json=complete_data, headers=headers)
                            
                            if complete_response.status_code == 200:
                                complete_result = complete_response.json()
                                if complete_result.get("message") == "Booking status updated successfully":
                                    self.log_result("Complete Booking", True, "Booking status updated to completed")
                                    return True
                                else:
                                    self.log_result("Complete Booking", False, f"Unexpected response: {complete_result}")
                                    return False
                            else:
                                self.log_result("Complete Booking", False, f"Failed with status {complete_response.status_code}")
                                return False
                        else:
                            self.log_result("Update to In Progress", False, f"Unexpected response: {progress_result}")
                            return False
                    else:
                        self.log_result("Update to In Progress", False, f"Failed with status {progress_response.status_code}")
                        return False
                else:
                    self.log_result("Confirm Booking Status", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_result("Confirm Booking Status", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Update Booking Status", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_booking_conflict_detection(self):
        """Test booking conflict detection for same provider/time slots"""
        print("\n=== Testing Booking Conflict Detection ===")
        
        if not self.test_provider_id:
            self.log_result("Booking Conflict Detection", False, "No test provider ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            
            # Create a booking for a specific time slot (use a different date to avoid existing conflicts)
            conflict_date = (datetime.now() + timedelta(days=5)).date()
            first_booking_data = {
                "provider_id": self.test_provider_id,
                "service_category": "maintenance",
                "service_specialty": "electrical",
                "title": "Electrical Repair",
                "description": "Fix electrical outlet",
                "priority": "standard",
                "scheduled_date": conflict_date.isoformat(),
                "scheduled_time": "09:00",  # Use different time
                "scheduled_end_time": "11:00",
                "payment_method": "cash"
            }
            
            first_response = self.session.post(f"{BASE_URL}/service-bookings", json=first_booking_data, headers=headers)
            
            if first_response.status_code == 200:
                # Try to create a conflicting booking
                conflicting_booking_data = {
                    "provider_id": self.test_provider_id,
                    "service_category": "maintenance",
                    "service_specialty": "plumbing",
                    "title": "Plumbing Repair",
                    "description": "Fix leaky faucet",
                    "priority": "standard",
                    "scheduled_date": conflict_date.isoformat(),
                    "scheduled_time": "09:00",  # Same time as first booking
                    "scheduled_end_time": "12:00",
                    "payment_method": "cash"
                }
                
                conflict_response = self.session.post(f"{BASE_URL}/service-bookings", json=conflicting_booking_data, headers=headers)
                
                if conflict_response.status_code == 400:
                    error_data = conflict_response.json()
                    if "conflict" in error_data.get("detail", "").lower() or "already booked" in error_data.get("detail", "").lower():
                        self.log_result("Booking Conflict Detection", True, "Correctly detected and rejected conflicting booking")
                        return True
                    else:
                        self.log_result("Booking Conflict Detection", False, f"Wrong error message: {error_data}")
                        return False
                else:
                    self.log_result("Booking Conflict Detection", False, f"Expected 400 for conflict, got {conflict_response.status_code}")
                    return False
            else:
                self.log_result("Booking Conflict Detection", False, f"Failed to create first booking: {first_response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Booking Conflict Detection", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_payment_processing(self):
        """Test POST /api/service-bookings/{id}/payment - Process payments"""
        print("\n=== Testing Payment Processing ===")
        
        if not self.test_booking_id:
            self.log_result("Payment Processing", False, "No test booking ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            
            # Test different payment methods
            payment_methods = [
                ("cash", "Cash on Service"),
                ("credit_card", "Credit/Debit Card"),
                ("bank_transfer", "Bank Transfer"),
                ("instapay", "InstaPay"),
                ("mobile_pay", "Mobile Payment"),
                ("digital_wallet", "Digital Wallet"),
                ("qr_code", "QR Code Payment")
            ]
            
            success_count = 0
            
            for method, description in payment_methods:
                payment_data = {
                    "payment_method": method,
                    "amount": 150.0,
                    "currency": "USD",
                    "metadata": {
                        "payment_description": f"Service payment via {description}",
                        "booking_reference": self.test_booking_id
                    }
                }
                
                response = self.session.post(f"{BASE_URL}/service-bookings/{self.test_booking_id}/payment", 
                                           json=payment_data, headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    transaction = data.get("transaction")
                    if transaction:
                        self.test_payment_id = transaction["id"]
                        self.log_result(f"Payment - {description}", True, f"Payment processed successfully with {method}")
                        success_count += 1
                        break  # Only test one successful payment to avoid multiple payments on same booking
                    else:
                        self.log_result(f"Payment - {description}", False, "No transaction data in response")
                else:
                    self.log_result(f"Payment - {description}", False, f"Failed with status {response.status_code}", response.text)
            
            return success_count > 0
                
        except Exception as e:
            self.log_result("Payment Processing", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_payment_status_tracking(self):
        """Test payment transaction status tracking"""
        print("\n=== Testing Payment Status Tracking ===")
        
        if not self.test_payment_id:
            self.log_result("Payment Status Tracking", False, "No test payment ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            
            # Get booking details to check payment status
            response = self.session.get(f"{BASE_URL}/service-bookings", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                bookings = data.get("bookings", [])
                target_booking = next((b for b in bookings if b["id"] == self.test_booking_id), None)
                
                if target_booking:
                    payment_status = target_booking.get("payment_status")
                    payment_id = target_booking.get("payment_id")
                    
                    if payment_status and payment_id:
                        self.log_result("Payment Status Tracking", True, f"Payment status tracked: {payment_status}, Payment ID: {payment_id}")
                        return True
                    else:
                        self.log_result("Payment Status Tracking", False, "Payment status or ID not found in booking")
                        return False
                else:
                    self.log_result("Payment Status Tracking", False, "Target booking not found")
                    return False
            else:
                self.log_result("Payment Status Tracking", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Payment Status Tracking", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_create_service_review(self):
        """Test POST /api/service-bookings/{id}/review - Create service review"""
        print("\n=== Testing Create Service Review ===")
        
        if not self.test_booking_id:
            self.log_result("Create Service Review", False, "No test booking ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            
            # Test multi-criteria rating system
            review_data = {
                "overall_rating": 5,
                "quality_rating": 5,
                "punctuality_rating": 4,
                "professionalism_rating": 5,
                "value_rating": 4,
                "would_recommend": True,
                "written_review": "Excellent service! The technician was professional, arrived on time, and completed the work efficiently. Highly recommend!",
                "is_public": True
            }
            
            response = self.session.post(f"{BASE_URL}/service-bookings/{self.test_booking_id}/review", 
                                       json=review_data, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                review = data.get("review")
                if review:
                    self.log_result("Create Service Review", True, f"Service review created successfully with overall rating: {review['overall_rating']}")
                    
                    # Test duplicate review prevention
                    duplicate_response = self.session.post(f"{BASE_URL}/service-bookings/{self.test_booking_id}/review", 
                                                         json=review_data, headers=headers)
                    
                    if duplicate_response.status_code == 400:
                        self.log_result("Duplicate Review Prevention", True, "Correctly prevented duplicate review submission")
                        return True
                    else:
                        self.log_result("Duplicate Review Prevention", False, f"Expected 400 for duplicate, got {duplicate_response.status_code}")
                        return False
                else:
                    self.log_result("Create Service Review", False, "No review data in response")
                    return False
            else:
                self.log_result("Create Service Review", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Create Service Review", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_get_provider_reviews(self):
        """Test GET /api/service-providers/{id}/reviews - Get provider reviews"""
        print("\n=== Testing Get Provider Reviews ===")
        
        if not self.test_provider_id:
            self.log_result("Get Provider Reviews", False, "No test provider ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/service-providers/{self.test_provider_id}/reviews", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                reviews = data.get("reviews", [])
                provider_stats = data.get("provider_stats", {})
                
                self.log_result("Get Provider Reviews", True, f"Retrieved {len(reviews)} reviews for provider")
                
                # Check if provider stats are updated
                if provider_stats:
                    avg_rating = provider_stats.get("average_rating", 0)
                    total_reviews = provider_stats.get("total_reviews", 0)
                    self.log_result("Provider Stats Update", True, f"Provider stats: {avg_rating} avg rating, {total_reviews} total reviews")
                    return True
                else:
                    self.log_result("Provider Stats Update", False, "No provider stats in response")
                    return False
            else:
                self.log_result("Get Provider Reviews", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Get Provider Reviews", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_would_recommend_functionality(self):
        """Test 'would recommend' functionality in reviews"""
        print("\n=== Testing Would Recommend Functionality ===")
        
        if not self.test_provider_id:
            self.log_result("Would Recommend Functionality", False, "No test provider ID available")
            return False
        
        try:
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/service-providers/{self.test_provider_id}/reviews", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                reviews = data.get("reviews", [])
                
                # Check if reviews contain would_recommend field
                recommend_count = sum(1 for review in reviews if review.get("would_recommend", False))
                total_reviews = len(reviews)
                
                if total_reviews > 0:
                    recommend_percentage = (recommend_count / total_reviews) * 100
                    self.log_result("Would Recommend Functionality", True, f"{recommend_count}/{total_reviews} reviews recommend provider ({recommend_percentage:.1f}%)")
                    return True
                else:
                    self.log_result("Would Recommend Functionality", True, "No reviews available to test recommendation functionality")
                    return True
            else:
                self.log_result("Would Recommend Functionality", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Would Recommend Functionality", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_service_analytics(self):
        """Test GET /api/service-analytics - Get analytics for admin dashboard"""
        print("\n=== Testing Service Analytics ===")
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/service-analytics", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                analytics = data.get("analytics", {})
                
                # Check booking statistics by status
                booking_stats = analytics.get("booking_statistics", {})
                if booking_stats:
                    self.log_result("Booking Statistics", True, f"Booking stats retrieved: {booking_stats}")
                else:
                    self.log_result("Booking Statistics", False, "No booking statistics in response")
                    return False
                
                # Check revenue statistics by payment method
                revenue_stats = analytics.get("revenue_statistics", [])
                if isinstance(revenue_stats, list):
                    self.log_result("Revenue Statistics", True, f"Revenue stats retrieved: {len(revenue_stats)} payment methods with revenue")
                else:
                    self.log_result("Revenue Statistics", False, "Revenue statistics not in expected format")
                    return False
                
                # Check top-rated providers
                top_providers = analytics.get("top_rated_providers", [])
                self.log_result("Top-Rated Providers", True, f"Retrieved {len(top_providers)} top-rated providers")
                
                return True
            else:
                self.log_result("Service Analytics", False, f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Service Analytics", False, f"Exception occurred: {str(e)}")
            return False
    
    def test_authentication_authorization(self):
        """Test authentication and authorization for all endpoints"""
        print("\n=== Testing Authentication & Authorization ===")
        
        success_count = 0
        total_tests = 0
        
        # Test unauthorized access
        try:
            total_tests += 1
            response = self.session.get(f"{BASE_URL}/service-providers")
            
            if response.status_code in [401, 403]:
                self.log_result("Unauthorized Access", True, f"Correctly rejected request without token (status: {response.status_code})")
                success_count += 1
            else:
                self.log_result("Unauthorized Access", False, f"Expected 401 or 403, got {response.status_code}")
        except Exception as e:
            self.log_result("Unauthorized Access", False, f"Exception occurred: {str(e)}")
        
        # Test admin-only endpoints (service provider creation)
        try:
            total_tests += 1
            resident_headers = self.setup_auth_headers(self.resident_token)
            provider_data = {
                "full_name": "Test Provider",
                "email": "test@example.com",
                "phone": "+1234567890",
                "services": ["maintenance"],
                "specialties": ["plumbing"]
            }
            
            response = self.session.post(f"{BASE_URL}/service-providers", json=provider_data, headers=resident_headers)
            
            if response.status_code == 403:
                self.log_result("Admin-Only Access", True, "Correctly rejected resident access to admin endpoint")
                success_count += 1
            else:
                self.log_result("Admin-Only Access", False, f"Expected 403 for resident, got {response.status_code}")
        except Exception as e:
            self.log_result("Admin-Only Access", False, f"Exception occurred: {str(e)}")
        
        # Test compound data access control
        try:
            total_tests += 1
            headers = self.setup_auth_headers(self.resident_token)
            response = self.session.get(f"{BASE_URL}/service-bookings", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                bookings = data.get("bookings", [])
                
                # Verify all bookings belong to user's compound
                compound_match = all(booking.get("compound_id") == self.resident_user["compound_id"] for booking in bookings)
                
                if compound_match:
                    self.log_result("Compound Data Access Control", True, "Users can only access their compound's data")
                    success_count += 1
                else:
                    self.log_result("Compound Data Access Control", False, "Found bookings from other compounds")
            else:
                self.log_result("Compound Data Access Control", False, f"Failed to get bookings: {response.status_code}")
        except Exception as e:
            self.log_result("Compound Data Access Control", False, f"Exception occurred: {str(e)}")
        
        return success_count == total_tests
    
    def test_error_handling(self):
        """Test error handling for various scenarios"""
        print("\n=== Testing Error Handling ===")
        
        success_count = 0
        total_tests = 0
        
        # Test invalid booking attempts (past dates)
        try:
            total_tests += 1
            headers = self.setup_auth_headers(self.resident_token)
            past_date = (datetime.now() - timedelta(days=1)).date()
            
            past_booking_data = {
                "provider_id": self.test_provider_id or "dummy-id",
                "service_category": "maintenance",
                "service_specialty": "plumbing",
                "title": "Past Date Test",
                "description": "This should fail",
                "priority": "standard",
                "scheduled_date": past_date.isoformat(),
                "scheduled_time": "10:00",
                "payment_method": "cash"
            }
            
            response = self.session.post(f"{BASE_URL}/service-bookings", json=past_booking_data, headers=headers)
            
            if response.status_code == 400:
                self.log_result("Past Date Validation", True, "Correctly rejected booking with past date")
                success_count += 1
            else:
                self.log_result("Past Date Validation", False, f"Expected 400 for past date, got {response.status_code}")
        except Exception as e:
            self.log_result("Past Date Validation", False, f"Exception occurred: {str(e)}")
        
        # Test non-existent provider booking
        try:
            total_tests += 1
            headers = self.setup_auth_headers(self.resident_token)
            
            invalid_booking_data = {
                "provider_id": "non-existent-provider-id",
                "service_category": "maintenance",
                "service_specialty": "plumbing",
                "title": "Invalid Provider Test",
                "description": "This should fail",
                "priority": "standard",
                "payment_method": "cash"
            }
            
            response = self.session.post(f"{BASE_URL}/service-bookings", json=invalid_booking_data, headers=headers)
            
            if response.status_code == 404:
                self.log_result("Non-Existent Provider", True, "Correctly rejected booking with non-existent provider")
                success_count += 1
            else:
                self.log_result("Non-Existent Provider", False, f"Expected 404 for invalid provider, got {response.status_code}")
        except Exception as e:
            self.log_result("Non-Existent Provider", False, f"Exception occurred: {str(e)}")
        
        # Test payment failures
        try:
            total_tests += 1
            headers = self.setup_auth_headers(self.resident_token)
            
            invalid_payment_data = {
                "payment_method": "invalid_method",
                "amount": -50.0,  # Negative amount
                "currency": "USD"
            }
            
            response = self.session.post(f"{BASE_URL}/service-bookings/invalid-booking-id/payment", 
                                       json=invalid_payment_data, headers=headers)
            
            if response.status_code in [400, 404]:
                self.log_result("Payment Failure Handling", True, f"Correctly handled payment failure (status: {response.status_code})")
                success_count += 1
            else:
                self.log_result("Payment Failure Handling", False, f"Expected 400 or 404 for invalid payment, got {response.status_code}")
        except Exception as e:
            self.log_result("Payment Failure Handling", False, f"Exception occurred: {str(e)}")
        
        return success_count == total_tests
    
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Enhanced Service Management System Tests")
        print("=" * 60)
        
        # Authentication
        if not self.test_authentication():
            print("❌ Authentication failed - stopping tests")
            return
        
        # Service Provider Management Tests
        self.test_create_service_provider()
        self.test_get_service_providers()
        
        # Service Booking System Tests
        self.test_create_service_booking()
        self.test_get_service_bookings()
        self.test_update_booking_status()
        self.test_booking_conflict_detection()
        
        # Payment Processing Tests
        self.test_payment_processing()
        self.test_payment_status_tracking()
        
        # Review System Tests
        self.test_create_service_review()
        self.test_get_provider_reviews()
        self.test_would_recommend_functionality()
        
        # Analytics Tests
        self.test_service_analytics()
        
        # Authentication & Authorization Tests
        self.test_authentication_authorization()
        
        # Error Handling Tests
        self.test_error_handling()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.results if "✅ PASS" in result["status"])
        failed = sum(1 for result in self.results if "❌ FAIL" in result["status"])
        total = len(self.results)
        
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if failed > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"  - {result['test']}: {result['message']}")
                    if result["details"]:
                        print(f"    Details: {result['details']}")
        
        print(f"\n{'🎉 ALL TESTS PASSED!' if failed == 0 else '⚠️  SOME TESTS FAILED'}")
        print("=" * 60)

if __name__ == "__main__":
    test_suite = ServiceManagementTestSuite()
    test_suite.run_all_tests()