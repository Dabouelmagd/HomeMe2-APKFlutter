#!/usr/bin/env python3
"""
Arabic Services Database Translation Testing Suite
Tests the Arabic translation of services database as requested in the review:

المطلوب تحديث جميع أوصاف الخدمات في قاعدة البيانات للحصول على ترجمة عربية كاملة:
- خدمات السباكة: ترجمة كاملة للعربية
- الخدمات الكهربائية: ترجمة كاملة للعربية  
- خدمات التكييف والتهوية: ترجمة كاملة للعربية
الهدف: ترجمة 100% عربية كاملة لجميع محتويات الخدمات
"""

import requests
import json
import re
from typing import Dict, List, Optional

# Configuration
BASE_URL = "https://homeme-arabic-ui.preview.emergentagent.com/api"

class ArabicServicesTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.compound_id = None
        self.results = []
        
        # English patterns that should NOT exist in Arabic services
        self.english_patterns = [
            # Common English words that should be translated
            r'\bplumbing\b', r'\bservices\b', r'\bincluding\b', r'\brepairs\b', 
            r'\binstallations\b', r'\bwater\b', r'\bheater\b', r'\bmaintenance\b',
            r'\belectricians\b', r'\belectrical\b', r'\bneeds\b', r'\binstallations\b',
            r'\brepairs\b', r'\bemergency\b', r'\bservices\b',
            r'\bHVAC\b', r'\bservices\b', r'\bincluding\b', r'\brepair\b',
            r'\bheating\b', r'\bsystem\b', r'\bmaintenance\b', r'\bair\b', 
            r'\bquality\b', r'\bsolutions\b',
            # Time formats that should be in Arabic
            r'\bAM\b', r'\bPM\b', r'\ba\.m\.\b', r'\bp\.m\.\b',
            # Common service terms
            r'\bAvailable\b', r'\bavailable\b', r'\bService\b', r'\bservice\b',
            r'\bEmergency\b', r'\bemergency\b', r'\b24/7\b.*\bService\b',
            r'\bProfessional\b', r'\bprofessional\b'
        ]
        
        # Expected Arabic translations for verification
        self.expected_arabic_translations = {
            'plumbing': 'سباكة',
            'electrical': 'كهربائية', 
            'HVAC': 'تكييف وتهوية',
            'emergency': 'طوارئ',
            'AM': 'ص',
            'PM': 'م',
            'Available': 'متاحة',
            'Service': 'خدمة',
            'Professional': 'مهنية'
        }
        
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
        """Authenticate as admin to access services"""
        print("\n=== Authenticating Admin ===")
        
        credentials = {"username": "admin", "password": "admin123"}
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=credentials)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                admin_user = data["user"]
                self.compound_id = admin_user.get("compound_id")
                
                self.log_result("Admin Authentication", True, 
                              f"Admin authenticated successfully. Compound ID: {self.compound_id}")
                return True
            else:
                self.log_result("Admin Authentication", False, 
                              f"Failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_result("Admin Authentication", False, f"Exception occurred: {str(e)}")
            return False
    
    def get_services_data(self):
        """Retrieve all services from the compound"""
        print("\n=== Retrieving Services Data ===")
        
        if not self.admin_token or not self.compound_id:
            self.log_result("Services Data Retrieval", False, "No admin token or compound ID available")
            return None
        
        try:
            headers = self.setup_auth_headers(self.admin_token)
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}/services", headers=headers)
            
            if response.status_code == 200:
                services = response.json()
                
                # Debug: Print the actual response structure
                print(f"DEBUG: Response type: {type(services)}")
                print(f"DEBUG: Response content: {services}")
                
                if isinstance(services, list) and len(services) > 0:
                    self.log_result("Services Data Retrieval", True, 
                                  f"Successfully retrieved {len(services)} services")
                    return services
                elif isinstance(services, dict) and 'services' in services:
                    # Handle case where services are wrapped in an object
                    actual_services = services['services']
                    if isinstance(actual_services, list) and len(actual_services) > 0:
                        self.log_result("Services Data Retrieval", True, 
                                      f"Successfully retrieved {len(actual_services)} services")
                        return actual_services
                
                self.log_result("Services Data Retrieval", False, 
                              f"No services found or invalid response format. Response: {services}")
                return None
            else:
                self.log_result("Services Data Retrieval", False, 
                              f"Failed with status {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_result("Services Data Retrieval", False, f"Exception occurred: {str(e)}")
            return None
    
    def check_english_patterns_in_text(self, text: str, field_name: str) -> List[str]:
        """Check for English patterns in text"""
        found_patterns = []
        
        if not text:
            return found_patterns
            
        for pattern in self.english_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                found_patterns.extend([f"{field_name}: '{match}'" for match in matches])
        
        return found_patterns
    
    def test_services_arabic_translation(self):
        """Test all services for complete Arabic translation"""
        print("\n=== Testing Services Arabic Translation ===")
        
        services = self.get_services_data()
        if not services:
            return False
        
        total_services = len(services)
        services_with_english = []
        total_english_patterns = 0
        
        # Fields to check for English text
        fields_to_check = ['name', 'description', 'specialty', 'working_hours']
        
        for service in services:
            service_english_patterns = []
            service_name = service.get('name', 'Unknown Service')
            
            for field in fields_to_check:
                field_value = service.get(field, '')
                if field_value:
                    patterns = self.check_english_patterns_in_text(field_value, field)
                    service_english_patterns.extend(patterns)
            
            if service_english_patterns:
                services_with_english.append({
                    'service_name': service_name,
                    'service_id': service.get('id'),
                    'english_patterns': service_english_patterns
                })
                total_english_patterns += len(service_english_patterns)
        
        # Log results
        if not services_with_english:
            self.log_result("Services Arabic Translation", True, 
                          f"🎉 PERFECT! All {total_services} services have complete Arabic translation. "
                          f"No English patterns found in any service fields.")
            return True
        else:
            details = f"Services with English text:\n"
            for service_info in services_with_english:
                details += f"  • {service_info['service_name']} (ID: {service_info['service_id']}):\n"
                for pattern in service_info['english_patterns']:
                    details += f"    - {pattern}\n"
            
            self.log_result("Services Arabic Translation", False, 
                          f"Found {total_english_patterns} English patterns in {len(services_with_english)}/{total_services} services. "
                          f"Arabic translation is {((total_services - len(services_with_english)) / total_services * 100):.1f}% complete.",
                          details)
            return False
    
    def test_specific_service_categories(self):
        """Test specific service categories mentioned in the review request"""
        print("\n=== Testing Specific Service Categories ===")
        
        services = self.get_services_data()
        if not services:
            return False
        
        # Categories mentioned in the review request
        target_categories = {
            'plumbing': ['سباكة', 'plumbing'],
            'electrical': ['كهربائية', 'electrical', 'كهرباء'],
            'hvac': ['تكييف', 'تهوية', 'HVAC', 'hvac']
        }
        
        found_services = {category: [] for category in target_categories.keys()}
        
        for service in services:
            service_name = service.get('name', '') or ''
            service_category = service.get('category', '') or ''
            service_specialty = service.get('specialty', '') or ''
            service_description = service.get('description', '') or ''
            
            service_name = service_name.lower()
            service_category = service_category.lower()
            service_specialty = service_specialty.lower()
            service_description = service_description.lower()
            
            # Check all text fields for category keywords
            all_text = f"{service_name} {service_category} {service_specialty} {service_description}"
            
            for category, keywords in target_categories.items():
                for keyword in keywords:
                    if keyword.lower() in all_text:
                        found_services[category].append({
                            'name': service.get('name'),
                            'id': service.get('id'),
                            'description': service.get('description'),
                            'working_hours': service.get('working_hours'),
                            'specialty': service.get('specialty')
                        })
                        break
        
        # Test each category
        category_results = []
        for category, services_list in found_services.items():
            if services_list:
                english_found = False
                category_details = f"{category.upper()} Services Found ({len(services_list)}):\n"
                
                for service in services_list:
                    category_details += f"  • {service['name']} (ID: {service['id']})\n"
                    
                    # Check for English patterns in this service
                    fields_to_check = ['description', 'working_hours', 'specialty']
                    for field in fields_to_check:
                        field_value = service.get(field, '')
                        if field_value:
                            patterns = self.check_english_patterns_in_text(field_value, field)
                            if patterns:
                                english_found = True
                                category_details += f"    ❌ English found in {field}: {field_value}\n"
                            else:
                                category_details += f"    ✅ {field}: {field_value}\n"
                
                if english_found:
                    self.log_result(f"{category.title()} Services Translation", False, 
                                  f"English text found in {category} services", category_details)
                    category_results.append(False)
                else:
                    self.log_result(f"{category.title()} Services Translation", True, 
                                  f"All {category} services have complete Arabic translation", category_details)
                    category_results.append(True)
            else:
                self.log_result(f"{category.title()} Services Translation", False, 
                              f"No {category} services found in the database")
                category_results.append(False)
        
        return all(category_results)
    
    def test_arabic_time_formats(self):
        """Test that time formats are in Arabic (ص/م instead of AM/PM)"""
        print("\n=== Testing Arabic Time Formats ===")
        
        services = self.get_services_data()
        if not services:
            return False
        
        services_with_english_time = []
        
        for service in services:
            working_hours = service.get('working_hours', '')
            if working_hours:
                # Check for English time formats
                english_time_patterns = re.findall(r'\b(AM|PM|a\.m\.|p\.m\.)\b', working_hours, re.IGNORECASE)
                if english_time_patterns:
                    services_with_english_time.append({
                        'name': service.get('name'),
                        'id': service.get('id'),
                        'working_hours': working_hours,
                        'english_patterns': english_time_patterns
                    })
        
        if not services_with_english_time:
            self.log_result("Arabic Time Formats", True, 
                          "All services use Arabic time formats (ص/م) instead of English (AM/PM)")
            return True
        else:
            details = "Services with English time formats:\n"
            for service in services_with_english_time:
                details += f"  • {service['name']}: {service['working_hours']}\n"
                details += f"    English patterns found: {service['english_patterns']}\n"
            
            self.log_result("Arabic Time Formats", False, 
                          f"Found {len(services_with_english_time)} services with English time formats", 
                          details)
            return False
    
    def run_all_tests(self):
        """Run all Arabic services translation tests"""
        print("🌐 ARABIC SERVICES DATABASE TRANSLATION TESTING SUITE")
        print("=" * 60)
        print("Testing Arabic translation completeness for all services as requested:")
        print("- خدمات السباكة (Plumbing Services)")
        print("- الخدمات الكهربائية (Electrical Services)")  
        print("- خدمات التكييف والتهوية (HVAC Services)")
        print("- All other services for 100% Arabic translation")
        print("=" * 60)
        
        # Run authentication
        if not self.authenticate_admin():
            print("\n❌ CRITICAL: Authentication failed. Cannot proceed with testing.")
            return False
        
        # Run all tests
        tests = [
            self.test_services_arabic_translation,
            self.test_specific_service_categories,
            self.test_arabic_time_formats
        ]
        
        test_results = []
        for test in tests:
            try:
                result = test()
                test_results.append(result)
            except Exception as e:
                print(f"❌ Test failed with exception: {str(e)}")
                test_results.append(False)
        
        # Print summary
        print("\n" + "=" * 60)
        print("🎯 ARABIC SERVICES TRANSLATION TEST SUMMARY")
        print("=" * 60)
        
        passed_tests = sum(test_results)
        total_tests = len(test_results)
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"Tests Passed: {passed_tests}/{total_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if success_rate == 100:
            print("🎉 EXCELLENT! All services have complete Arabic translation!")
            print("✅ Goal achieved: 100% Arabic translation for all service content")
        elif success_rate >= 80:
            print("⚠️  GOOD: Most services have Arabic translation, minor issues remain")
        else:
            print("❌ NEEDS WORK: Significant English text found in services database")
        
        print("\nDetailed Results:")
        for result in self.results:
            print(f"{result['status']} {result['test']}: {result['message']}")
        
        return success_rate == 100

if __name__ == "__main__":
    test_suite = ArabicServicesTestSuite()
    success = test_suite.run_all_tests()
    exit(0 if success else 1)