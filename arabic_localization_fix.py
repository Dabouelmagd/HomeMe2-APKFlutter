#!/usr/bin/env python3
"""
Arabic Localization Fix for Security Guard Service
Properly updates the Security Guard service with all required fields
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "https://payment-methods-ui.preview.emergentagent.com/api"

class ArabicLocalizationFix:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.compound_id = None
        
    def authenticate(self):
        """Authenticate as admin"""
        credentials = {"username": "admin", "password": "admin123"}
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=credentials)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                self.admin_user = data["user"]
                self.compound_id = self.admin_user.get("compound_id")
                print(f"✅ Admin authenticated successfully - Compound: {self.compound_id}")
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            return False
    
    def get_security_guard_service(self):
        """Get the current Security Guard service details"""
        if not self.admin_token or not self.compound_id:
            print("❌ No authentication available")
            return None
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}/services", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                services = data.get("services", [])
                
                for service in services:
                    if service.get("name") == "Security Guard":
                        print(f"✅ Found Security Guard service:")
                        print(f"   ID: {service.get('id')}")
                        print(f"   Name: {service.get('name')}")
                        print(f"   Category: {service.get('category')}")
                        print(f"   Description: {service.get('description')}")
                        print(f"   Working Hours: {service.get('working_hours')}")
                        print(f"   Phone: {service.get('phone')}")
                        print(f"   Email: {service.get('email')}")
                        return service
                
                print("❌ Security Guard service not found")
                return None
            else:
                print(f"❌ Failed to get services: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ Error getting services: {e}")
            return None
    
    def update_security_guard_service(self, service):
        """Update the Security Guard service with Arabic working hours"""
        if not self.admin_token or not self.compound_id:
            print("❌ No authentication available")
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }
            
            # Prepare update data with all required fields
            update_data = {
                "name": service.get("name"),
                "category": service.get("category"),
                "description": service.get("description"),
                "working_hours": "خدمة متاحة 24/7",  # Arabic translation
                "phone": service.get("phone"),
                "email": service.get("email"),
                "specialty": service.get("specialty")
            }
            
            # Remove None values
            update_data = {k: v for k, v in update_data.items() if v is not None}
            
            service_id = service.get("id")
            endpoint = f"{BASE_URL}/compounds/{self.compound_id}/services/{service_id}"
            
            print(f"🔄 Updating Security Guard service...")
            print(f"   Endpoint: {endpoint}")
            print(f"   Old working_hours: {service.get('working_hours')}")
            print(f"   New working_hours: خدمة متاحة 24/7")
            
            response = self.session.put(endpoint, json=update_data, headers=headers)
            
            if response.status_code in [200, 204]:
                print("✅ Security Guard service updated successfully!")
                return True
            else:
                print(f"❌ Update failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error updating service: {e}")
            return False
    
    def verify_update(self):
        """Verify the update was successful"""
        if not self.admin_token or not self.compound_id:
            print("❌ No authentication available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}/services", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                services = data.get("services", [])
                
                for service in services:
                    if service.get("name") == "Security Guard":
                        working_hours = service.get("working_hours")
                        
                        if working_hours == "خدمة متاحة 24/7":
                            print("✅ VERIFICATION SUCCESSFUL!")
                            print(f"   Security Guard working_hours now shows: {working_hours}")
                            return True
                        else:
                            print("❌ VERIFICATION FAILED!")
                            print(f"   Security Guard working_hours still shows: {working_hours}")
                            return False
                
                print("❌ Security Guard service not found during verification")
                return False
            else:
                print(f"❌ Failed to verify update: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error during verification: {e}")
            return False
    
    def check_other_services_with_available(self):
        """Check for other services that might have 'Available' text"""
        if not self.admin_token or not self.compound_id:
            print("❌ No authentication available")
            return
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}/services", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                services = data.get("services", [])
                
                services_with_available = []
                for service in services:
                    working_hours = service.get("working_hours", "")
                    if "Available" in working_hours:
                        services_with_available.append({
                            "name": service.get("name"),
                            "id": service.get("id"),
                            "working_hours": working_hours
                        })
                
                if services_with_available:
                    print(f"⚠️  Found {len(services_with_available)} services still with 'Available' text:")
                    for svc in services_with_available:
                        print(f"   - {svc['name']}: {svc['working_hours']}")
                else:
                    print("✅ No services found with 'Available' text - All localized!")
                    
        except Exception as e:
            print(f"❌ Error checking other services: {e}")
    
    def run_fix(self):
        """Run the complete Arabic localization fix"""
        print("🌍 ARABIC LOCALIZATION FIX")
        print("=" * 50)
        print("Fixing Security Guard service working_hours")
        print("From: '24/7 Service Available'")
        print("To: 'خدمة متاحة 24/7'")
        print("=" * 50)
        
        # Step 1: Authenticate
        if not self.authenticate():
            return False
        
        # Step 2: Get current service details
        service = self.get_security_guard_service()
        if not service:
            return False
        
        # Step 3: Update the service
        if not self.update_security_guard_service(service):
            return False
        
        # Step 4: Verify the update
        if not self.verify_update():
            return False
        
        # Step 5: Check for other services
        print("\n🔍 Checking for other services with 'Available' text...")
        self.check_other_services_with_available()
        
        print("\n🎉 ARABIC LOCALIZATION FIX COMPLETED SUCCESSFULLY!")
        print("Security Guard service working_hours updated to Arabic: 'خدمة متاحة 24/7'")
        
        return True

def main():
    """Main function"""
    fix = ArabicLocalizationFix()
    success = fix.run_fix()
    
    if success:
        print("\n✅ Arabic localization fix completed successfully!")
    else:
        print("\n❌ Arabic localization fix failed!")
    
    return success

if __name__ == "__main__":
    main()