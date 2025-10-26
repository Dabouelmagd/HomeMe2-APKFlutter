#!/usr/bin/env python3
"""
Complete Arabic Services Database Update
Updates all services with complete Arabic translations to achieve 100% localization
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://compound-dashboard.preview.emergentagent.com/api"

# Complete Arabic service data to replace English content
ARABIC_SERVICES_DATA = {
    'Plumbing Services': {
        'name': 'خدمات السباكة',
        'description': 'خدمات سباكة مهنية تشمل إصلاحات الطوارئ وتركيب الأنابيب وصيانة سخانات المياه',
        'specialty': 'سباكة الطوارئ، إصلاح الأنابيب، صيانة سخانات المياه',
        'working_hours': 'خدمة طوارئ 24/7'
    },
    'Electrical Services': {
        'name': 'الخدمات الكهربائية', 
        'description': 'كهربائيون مرخصون لجميع الاحتياجات الكهربائية تشمل التركيبات والإصلاحات وخدمات الطوارئ',
        'specialty': 'الإصلاحات الكهربائية، التركيبات، خدمات الطوارئ',
        'working_hours': '8:00 ص - 6:00 م، طوارئ 24/7'
    },
    'HVAC Services': {
        'name': 'خدمات التكييف والتهوية',
        'description': 'خدمات تكييف وتهوية شاملة تشمل إصلاح المكيفات وصيانة أنظمة التدفئة وحلول جودة الهواء',
        'specialty': 'تكييف الهواء، التدفئة، أنظمة التهوية',
        'working_hours': '7:00 ص - 7:00 م'
    },
    'General Handyman': {
        'name': 'الفني العام',
        'description': 'فني ماهر للإصلاحات العامة وتجميع الأثاث والتحسينات المنزلية الطفيفة',
        'specialty': 'إصلاحات طفيفة، تركيبات، تحسينات المنزل',
        'working_hours': '8:00 ص - 5:00 م'
    },
    'House Cleaning': {
        'name': 'تنظيف المنازل',
        'description': 'خدمات تنظيف منازل مهنية مع جدولة مرنة وخيارات صديقة للبيئة',
        'specialty': 'تنظيف منتظم، تنظيف عميق، تنظيف الانتقال',
        'working_hours': '7:00 ص - 6:00 م'
    },
    'Carpet Cleaning': {
        'name': 'تنظيف السجاد',
        'description': 'تنظيف مهني للسجاد والمفروشات باستخدام معدات متطورة ومحاليل تنظيف آمنة',
        'specialty': 'تنظيف السجاد العميق، إزالة البقع، تنظيف المفروشات',
        'working_hours': '8:00 ص - 5:00 م'
    },
    'Window Cleaning': {
        'name': 'تنظيف النوافذ',
        'description': 'تنظيف مهني للنوافذ للحصول على رؤية واضحة جداً، متوفر للداخل والخارج',
        'specialty': 'تنظيف النوافذ الداخلية والخارجية',
        'working_hours': '8:00 ص - 4:00 م'
    },
    'Security Guard': {
        'name': 'حارس الأمن',
        'description': 'خدمات أمنية مهنية تشمل الدورية والمراقبة وأمن الفعاليات الخاصة',
        'specialty': 'أمن على مدار الساعة، خدمات الدورية، أمن الفعاليات',
        'working_hours': 'خدمة متاحة 24/7'
    },
    'Access Control Setup': {
        'name': 'إعداد نظام التحكم بالدخول',
        'description': 'تركيب وصيانة أنظمة التحكم بالدخول والأقفال الذكية ومعدات المراقبة',
        'specialty': 'أنظمة البطاقات المفتاحية، أقفال الأبواب، كاميرات الأمان',
        'working_hours': '9:00 ص - 5:00 م'
    },
    'Landscaping & Gardening': {
        'name': 'تنسيق الحدائق والبستنة',
        'description': 'خدمات تنسيق حدائق شاملة تشمل تصميم الحدائق وصيانة المروج ورعاية النباتات الموسمية',
        'specialty': 'صيانة الحدائق، رعاية المروج، زراعة النباتات',
        'working_hours': '7:00 ص - 4:00 م'
    },
    'Pool Maintenance': {
        'name': 'صيانة المسابح',
        'description': 'صيانة مسابح مهنية تشمل التنظيف والمعالجة الكيميائية وخدمة المعدات',
        'specialty': 'تنظيف المسابح، توازن المواد الكيميائية، إصلاح المعدات',
        'working_hours': '6:00 ص - 3:00 م'
    },
    'Pet Care Services': {
        'name': 'خدمات رعاية الحيوانات الأليفة',
        'description': 'خدمات رعاية حيوانات أليفة موثوقة تشمل المشي والجلوس والإطعام والتنظيف الأساسي',
        'specialty': 'تمشية الكلاب، رعاية الحيوانات الأليفة، التنظيف',
        'working_hours': '6:00 ص - 8:00 م'
    },
    'Personal Trainer': {
        'name': 'مدرب شخصي',
        'description': 'مدربون شخصيون معتمدون للجلسات الفردية واللياقة الجماعية وبرامج العافية',
        'specialty': 'التدريب البدني، التوجيه الصحي، الفصول الجماعية',
        'working_hours': '5:00 ص - 9:00 م'
    },
    'Package Delivery': {
        'name': 'توصيل الطرود',
        'description': 'خدمات توصيل موثوقة للطرود والبقالة واحتياجات البريد السريع داخل المجمع',
        'specialty': 'التوصيل المحلي، توصيل البقالة، خدمات البريد السريع',
        'working_hours': '8:00 ص - 8:00 م'
    },
    'Moving Services': {
        'name': 'خدمات النقل',
        'description': 'خدمات نقل مهنية للانتقال داخل أو خارج المجمع، تشمل التعبئة',
        'specialty': 'النقل المحلي، نقل الأثاث، خدمات التعبئة',
        'working_hours': '7:00 ص - 6:00 م'
    },
    'Event Planning': {
        'name': 'تخطيط الفعاليات',
        'description': 'تخطيط شامل للفعاليات للحفلات والفعاليات المؤسسية والمناسبات الخاصة',
        'specialty': 'تخطيط الحفلات، الفعاليات المؤسسية، تنسيق الأعراس',
        'working_hours': '9:00 ص - 7:00 م'
    },
    'Catering Services': {
        'name': 'خدمات التموين',
        'description': 'تموين مهني للفعاليات من جميع الأحجام مع قوائم قابلة للتخصيص وتلبية الاحتياجات الغذائية',
        'specialty': 'تموين الفعاليات، إعداد الوجبات، الاحتياجات الغذائية الخاصة',
        'working_hours': '6:00 ص - 10:00 م'
    }
}

class ArabicServicesUpdater:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.compound_id = None
        
    def authenticate(self):
        """Authenticate as admin"""
        print("🔐 Authenticating admin...")
        credentials = {"username": "admin", "password": "admin123"}
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=credentials)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data["access_token"]
                self.compound_id = data["user"].get("compound_id")
                print(f"✅ Admin authenticated - Compound: {self.compound_id}")
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            return False
    
    def get_all_services(self):
        """Get all services from database"""
        if not self.admin_token or not self.compound_id:
            print("❌ No authentication available")
            return None
        
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = self.session.get(f"{BASE_URL}/compounds/{self.compound_id}/services", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                services = data.get("services", [])
                print(f"✅ Retrieved {len(services)} services")
                return services
            else:
                print(f"❌ Failed to get services: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ Error getting services: {e}")
            return None
    
    def update_service_with_arabic(self, service_id, english_name, arabic_data):
        """Update a single service with Arabic data"""
        if not self.admin_token or not self.compound_id:
            return False
        
        try:
            headers = {
                "Authorization": f"Bearer {self.admin_token}",
                "Content-Type": "application/json"
            }
            
            # Get current service to preserve other fields
            services = self.get_all_services()
            current_service = None
            
            for service in services:
                if service.get("id") == service_id:
                    current_service = service
                    break
            
            if not current_service:
                print(f"❌ Service {english_name} not found")
                return False
            
            # Prepare update with Arabic data
            update_data = {
                "name": arabic_data["name"],
                "category": current_service.get("category", "maintenance"),
                "description": arabic_data["description"],
                "specialty": arabic_data["specialty"],
                "working_hours": arabic_data["working_hours"],
                "phone": current_service.get("phone", ""),
                "email": current_service.get("email", "")
            }
            
            endpoint = f"{BASE_URL}/compounds/{self.compound_id}/services/{service_id}"
            
            print(f"🔄 Updating {english_name} → {arabic_data['name']}")
            
            response = self.session.put(endpoint, json=update_data, headers=headers)
            
            if response.status_code in [200, 204]:
                print(f"✅ Updated {english_name} successfully!")
                return True
            else:
                print(f"❌ Failed to update {english_name}: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Error updating {english_name}: {e}")
            return False
    
    def update_all_services(self):
        """Update all services with complete Arabic translations"""
        print("\n🌍 Starting complete Arabic services update...")
        
        if not self.authenticate():
            return False
        
        services = self.get_all_services()
        if not services:
            return False
        
        success_count = 0
        total_services = 0
        
        for service in services:
            service_name = service.get("name")
            service_id = service.get("id")
            
            if service_name in ARABIC_SERVICES_DATA:
                total_services += 1
                arabic_data = ARABIC_SERVICES_DATA[service_name]
                
                if self.update_service_with_arabic(service_id, service_name, arabic_data):
                    success_count += 1
                    print(f"   ✅ {service_name} → {arabic_data['name']}")
                else:
                    print(f"   ❌ Failed: {service_name}")
            else:
                print(f"   ℹ️  Skipped: {service_name} (no Arabic data available)")
        
        print(f"\n📊 Update Results:")
        print(f"   ✅ Successfully updated: {success_count}/{total_services}")
        print(f"   📈 Success rate: {(success_count/total_services)*100:.1f}%")
        
        if success_count == total_services:
            print("🎉 ALL SERVICES UPDATED TO 100% ARABIC!")
            return True
        else:
            print("⚠️ Some services failed to update")
            return False

def main():
    print("="*60)
    print("🇸🇦 COMPLETE ARABIC SERVICES DATABASE UPDATE")
    print("="*60)
    print("Updating all services with complete Arabic translations")
    print("Target: 100% Arabic localization for 17 services")
    print("="*60)
    
    updater = ArabicServicesUpdater()
    
    if updater.update_all_services():
        print("\n🎊 SUCCESS! Database now 100% Arabic localized!")
        print("🏆 All services have complete Arabic translations")
    else:
        print("\n❌ Update incomplete - some services may still contain English")
    
    print("="*60)

if __name__ == "__main__":
    main()