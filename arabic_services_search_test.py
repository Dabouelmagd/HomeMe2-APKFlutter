#!/usr/bin/env python3
"""
Arabic Services Database Search Test
Tests for finding and updating English text patterns in services database:
1. Search for "Emergency" in all service fields
2. Search for "PM" in all service fields  
3. Search for "AM" in all service fields
4. Update found services with Arabic translations
"""

import requests
import json
from typing import Dict, List, Optional

# Configuration
BASE_URL = "https://homeme-portal-2.preview.emergentagent.com/api"

class ArabicServicesSearchTest:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.compound_id = None
        self.results = []
        self.found_services = []
        
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
        print("\n=== Admin Authentication ===")
        
        credential_sets = [
            {"username": "admin", "password": "admin123"},
            {"username": "admin@homeme.com", "password": "admin123"}
        ]
        
        for i, credentials in enumerate(credential_sets, 1):
            try:
                response = self.session.post(f"{BASE_URL}/auth/login", json=credentials)
                
                if response.status_code == 200:
                    data = response.json()
                    self.admin_token = data["access_token"]
                    admin_user = data["user"]
                    self.compound_id = admin_user.get("compound_id")
                    
                    self.log_result(f"Admin Authentication", True, 
                                  f"Admin authenticated successfully - Compound: {self.compound_id}")
                    return True
                else:
                    self.log_result(f"Admin Authentication (Set {i})", False, 
                                  f"Failed with status {response.status_code}", response.text)
                    
            except Exception as e:
                self.log_result(f"Admin Authentication (Set {i})", False, f"Exception occurred: {str(e)}")
        
        return False
    
    def get_all_services(self):
        """Get all services from the database"""
        print("\n=== Retrieving All Services ===")
        
        if not self.admin_token or not self.compound_id:
            self.log_result("Get All Services", False, "No admin token or compound ID available")
            return []
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}/services", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                services = data.get("services", [])
                self.log_result("Get All Services", True, f"Retrieved {len(services)} services from database")
                return services
            else:
                self.log_result("Get All Services", False, f"Failed with status {response.status_code}", response.text)
                return []
                
        except Exception as e:
            self.log_result("Get All Services", False, f"Exception occurred: {str(e)}")
            return []
    
    def search_english_patterns_in_services(self, services: List[Dict]):
        """Search for specific English patterns in all service fields"""
        print("\n=== Searching for English Patterns in Services ===")
        
        # Patterns to search for
        search_patterns = {
            "Emergency": "طوارئ",
            "AM": "ص", 
            "PM": "م"
        }
        
        found_patterns = {}
        services_with_english = []
        
        for service in services:
            service_id = service.get("id")
            service_name = service.get("name", "Unknown")
            
            # Fields to search in
            fields_to_search = {
                "name": service.get("name", ""),
                "description": service.get("description", ""),
                "specialty": service.get("specialty", ""),
                "working_hours": service.get("working_hours", "")
            }
            
            service_patterns_found = []
            
            # Search each pattern in each field
            for pattern, arabic_translation in search_patterns.items():
                for field_name, field_value in fields_to_search.items():
                    if field_value and pattern in field_value:
                        pattern_info = {
                            "service_id": service_id,
                            "service_name": service_name,
                            "field": field_name,
                            "field_value": field_value,
                            "pattern": pattern,
                            "arabic_translation": arabic_translation
                        }
                        service_patterns_found.append(pattern_info)
                        
                        # Add to global found patterns
                        if pattern not in found_patterns:
                            found_patterns[pattern] = []
                        found_patterns[pattern].append(pattern_info)
            
            if service_patterns_found:
                services_with_english.append({
                    "service": service,
                    "patterns": service_patterns_found
                })
        
        # Log results for each pattern
        for pattern, arabic_translation in search_patterns.items():
            if pattern in found_patterns:
                count = len(found_patterns[pattern])
                services_affected = len(set(p["service_id"] for p in found_patterns[pattern]))
                self.log_result(f"Search Pattern '{pattern}'", True, 
                              f"Found {count} instances in {services_affected} services",
                              f"Pattern: '{pattern}' → '{arabic_translation}'")
                
                # Log details for each occurrence
                for occurrence in found_patterns[pattern]:
                    print(f"    Service: {occurrence['service_name']} (ID: {occurrence['service_id']})")
                    print(f"    Field: {occurrence['field']} = '{occurrence['field_value']}'")
            else:
                self.log_result(f"Search Pattern '{pattern}'", True, 
                              f"No instances found - already fully translated",
                              f"Pattern: '{pattern}' → '{arabic_translation}'")
        
        # Store results for potential updates
        self.found_services = services_with_english
        
        # Summary
        total_patterns_found = sum(len(patterns) for patterns in found_patterns.values())
        total_services_affected = len(services_with_english)
        
        if total_patterns_found > 0:
            self.log_result("English Pattern Search Summary", False, 
                          f"Found {total_patterns_found} English text patterns in {total_services_affected} services that need Arabic translation")
        else:
            self.log_result("English Pattern Search Summary", True, 
                          "No English text patterns found - database is 100% Arabic translated!")
        
        return found_patterns
    
    def update_service_with_arabic_translation(self, service_id: str, updated_fields: Dict[str, str]):
        """Update a service with Arabic translations"""
        if not self.admin_token or not self.compound_id:
            return False
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            
            # First get the current service data
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}/services", headers=headers)
            if response.status_code != 200:
                return False
            
            data = response.json()
            services = data.get("services", [])
            
            # Find the service to update
            service_to_update = None
            for service in services:
                if service.get("id") == service_id:
                    service_to_update = service
                    break
            
            if not service_to_update:
                return False
            
            # Prepare update data with all required fields
            update_data = {
                "name": service_to_update.get("name", ""),
                "category": service_to_update.get("category", ""),
                "description": service_to_update.get("description", ""),
                "working_hours": service_to_update.get("working_hours", ""),
                "phone": service_to_update.get("phone", ""),
                "email": service_to_update.get("email", "")
            }
            
            # Apply the Arabic translations
            for field, new_value in updated_fields.items():
                if field in update_data:
                    update_data[field] = new_value
            
            # Update the service
            update_response = self.session.put(
                f"{BASE_URL}/compounds/{self.compound_id}/services/{service_id}", 
                json=update_data, 
                headers=headers
            )
            
            return update_response.status_code == 200
            
        except Exception as e:
            print(f"Error updating service {service_id}: {str(e)}")
            return False
    
    def apply_arabic_translations(self, found_patterns: Dict):
        """Apply Arabic translations to services with English text"""
        print("\n=== Applying Arabic Translations ===")
        
        if not self.found_services:
            self.log_result("Apply Arabic Translations", True, "No services need translation updates")
            return True
        
        translation_map = {
            "Emergency": "طوارئ",
            "AM": "ص",
            "PM": "م"
        }
        
        success_count = 0
        total_updates = 0
        
        for service_info in self.found_services:
            service = service_info["service"]
            patterns = service_info["patterns"]
            service_id = service.get("id")
            service_name = service.get("name", "Unknown")
            
            # Group patterns by field to update
            fields_to_update = {}
            
            for pattern_info in patterns:
                field = pattern_info["field"]
                pattern = pattern_info["pattern"]
                field_value = pattern_info["field_value"]
                arabic_translation = translation_map[pattern]
                
                # Replace the English pattern with Arabic
                if field not in fields_to_update:
                    fields_to_update[field] = field_value
                
                fields_to_update[field] = fields_to_update[field].replace(pattern, arabic_translation)
            
            # Update the service
            total_updates += 1
            if self.update_service_with_arabic_translation(service_id, fields_to_update):
                success_count += 1
                self.log_result(f"Update Service '{service_name}'", True, 
                              f"Successfully updated service with Arabic translations",
                              f"Updated fields: {list(fields_to_update.keys())}")
            else:
                self.log_result(f"Update Service '{service_name}'", False, 
                              f"Failed to update service with Arabic translations")
        
        # Summary
        if total_updates > 0:
            success_rate = (success_count / total_updates) * 100
            self.log_result("Arabic Translation Updates", success_count == total_updates, 
                          f"Updated {success_count}/{total_updates} services ({success_rate:.1f}% success rate)")
        
        return success_count == total_updates
    
    def verify_translations_applied(self):
        """Verify that Arabic translations were successfully applied"""
        print("\n=== Verifying Arabic Translations Applied ===")
        
        # Get services again and search for patterns
        services = self.get_all_services()
        if not services:
            self.log_result("Verify Translations", False, "Could not retrieve services for verification")
            return False
        
        # Search for English patterns again
        found_patterns = self.search_english_patterns_in_services(services)
        
        # Check if any English patterns still exist
        total_remaining_patterns = sum(len(patterns) for patterns in found_patterns.values())
        
        if total_remaining_patterns == 0:
            self.log_result("Verify Translations", True, 
                          "✅ SUCCESS: All English text patterns have been eliminated! 100% Arabic translation achieved.")
            return True
        else:
            self.log_result("Verify Translations", False, 
                          f"❌ REMAINING ISSUES: {total_remaining_patterns} English text patterns still found")
            return False
    
    def run_comprehensive_test(self):
        """Run the complete Arabic services search and translation test"""
        print("🔍 ARABIC SERVICES DATABASE SEARCH TEST")
        print("=" * 60)
        print("Searching for English text patterns in services database:")
        print("1. 'Emergency' → 'طوارئ'")
        print("2. 'AM' → 'ص'") 
        print("3. 'PM' → 'م'")
        print("=" * 60)
        
        # Step 1: Authenticate
        if not self.authenticate_admin():
            print("\n❌ CRITICAL ERROR: Could not authenticate as admin")
            return False
        
        # Step 2: Get all services
        services = self.get_all_services()
        if not services:
            print("\n❌ CRITICAL ERROR: Could not retrieve services from database")
            return False
        
        # Step 3: Search for English patterns
        found_patterns = self.search_english_patterns_in_services(services)
        
        # Step 4: Apply Arabic translations if patterns found
        if any(found_patterns.values()):
            print(f"\n🔧 APPLYING ARABIC TRANSLATIONS...")
            if self.apply_arabic_translations(found_patterns):
                print("✅ Arabic translations applied successfully")
            else:
                print("❌ Some translations failed to apply")
            
            # Step 5: Verify translations
            self.verify_translations_applied()
        else:
            print("\n🎉 EXCELLENT: No English text patterns found!")
            print("Database is already 100% Arabic translated.")
        
        # Print summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed_tests = sum(1 for result in self.results if "✅ PASS" in result["status"])
        total_tests = len(self.results)
        
        for result in self.results:
            print(f"{result['status']} - {result['test']}: {result['message']}")
        
        print(f"\nOVERALL RESULT: {passed_tests}/{total_tests} tests passed")
        
        # Final recommendation
        remaining_patterns = sum(len(patterns) for patterns in found_patterns.values()) if found_patterns else 0
        if remaining_patterns == 0:
            print("\n🎉 MISSION ACCOMPLISHED!")
            print("✅ All English text patterns eliminated")
            print("✅ 100% Arabic translation achieved")
            print("✅ Database is ready for production")
        else:
            print(f"\n⚠️  WORK REMAINING:")
            print(f"❌ {remaining_patterns} English text patterns still need translation")
            print("🔧 Manual intervention may be required")
        
        return remaining_patterns == 0

def main():
    """Main function to run the Arabic services search test"""
    test_suite = ArabicServicesSearchTest()
    success = test_suite.run_comprehensive_test()
    
    if success:
        print("\n🎯 RESULT: Arabic services database search completed successfully!")
        exit(0)
    else:
        print("\n⚠️  RESULT: Arabic services database search found issues that need attention!")
        exit(1)

if __name__ == "__main__":
    main()