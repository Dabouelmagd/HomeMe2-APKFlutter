#!/usr/bin/env python3
"""
Script to add English translations to services in MongoDB.
This ensures that English interface shows English service names and descriptions.
"""
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')

# English translations for Arabic service names and descriptions
english_translations = {
    'خدمات السباكة': {
        'name_en': 'Plumbing Services',
        'specialty_en': 'Emergency plumbing, pipe repairs, water heater maintenance',
        'description_en': 'Professional plumbing services including emergency repairs, pipe installation, and water heater maintenance',
        'working_hours_en': '24/7 emergency service'
    },
    'الخدمات الكهربائية': {
        'name_en': 'Electrical Services', 
        'specialty_en': 'Electrical repairs, installations, emergency services',
        'description_en': 'Licensed electricians for all electrical needs including installations, repairs, and emergency services',
        'working_hours_en': '8:00 AM - 6:00 PM, 24/7 emergencies'
    },
    'خدمات التكييف والتهوية': {
        'name_en': 'HVAC Services',
        'specialty_en': 'Air conditioning, heating, ventilation systems',
        'description_en': 'Comprehensive HVAC services including air conditioning repair, heating maintenance, and air quality solutions',
        'working_hours_en': '7:00 AM - 7:00 PM'
    },
    'الفني العام': {
        'name_en': 'General Handyman',
        'specialty_en': 'Minor repairs, installations, home improvements',
        'description_en': 'Skilled handyman for general repairs, furniture assembly, and minor home improvements',
        'working_hours_en': '8:00 AM - 5:00 PM'
    },
    'تنظيف المنازل': {
        'name_en': 'House Cleaning',
        'specialty_en': 'Regular cleaning, deep cleaning, move-out cleaning',
        'description_en': 'Professional house cleaning services with flexible scheduling and eco-friendly options',
        'working_hours_en': '7:00 AM - 6:00 PM'
    },
    'تنظيف السجاد': {
        'name_en': 'Carpet Cleaning',
        'specialty_en': 'Deep carpet cleaning, stain removal, upholstery cleaning',
        'description_en': 'Professional carpet and upholstery cleaning using advanced equipment and safe cleaning solutions',
        'working_hours_en': '8:00 AM - 5:00 PM'
    },
    'تنظيف النوافذ': {
        'name_en': 'Window Cleaning',
        'specialty_en': 'Interior and exterior window cleaning',
        'description_en': 'Professional window cleaning for crystal clear views, available for interior and exterior',
        'working_hours_en': '8:00 AM - 4:00 PM'
    },
    'حارس الأمن': {
        'name_en': 'Security Guard',
        'specialty_en': '24/7 security, patrol services, event security',
        'description_en': 'Professional security services including patrol, monitoring, and special event security',
        'working_hours_en': '24/7 service available'
    },
    'إعداد نظام التحكم بالدخول': {
        'name_en': 'Access Control Setup',
        'specialty_en': 'Key card systems, door locks, security cameras',
        'description_en': 'Installation and maintenance of access control systems, smart locks, and monitoring equipment',
        'working_hours_en': '9:00 AM - 5:00 PM'
    },
    'تنسيق الحدائق والبستنة': {
        'name_en': 'Landscaping & Gardening',
        'specialty_en': 'Garden maintenance, lawn care, plant installation',
        'description_en': 'Complete landscaping services including garden design, lawn maintenance, and seasonal plant care',
        'working_hours_en': '7:00 AM - 4:00 PM'
    },
    'صيانة المسابح': {
        'name_en': 'Pool Maintenance',
        'specialty_en': 'Pool cleaning, chemical balancing, equipment repair',
        'description_en': 'Professional pool maintenance including cleaning, chemical treatment, and equipment servicing',
        'working_hours_en': '6:00 AM - 3:00 PM'
    },
    'خدمات رعاية الحيوانات الأليفة': {
        'name_en': 'Pet Care Services',
        'specialty_en': 'Dog walking, pet sitting, grooming',
        'description_en': 'Reliable pet care services including walking, sitting, feeding, and basic grooming',
        'working_hours_en': '6:00 AM - 8:00 PM'
    },
    'مدرب شخصي': {
        'name_en': 'Personal Trainer',
        'specialty_en': 'Physical training, health coaching, group classes',
        'description_en': 'Certified personal trainers for individual sessions, group fitness, and wellness programs',
        'working_hours_en': '5:00 AM - 9:00 PM'
    },
    'توصيل الطرود': {
        'name_en': 'Package Delivery',
        'specialty_en': 'Local delivery, grocery delivery, courier services',
        'description_en': 'Reliable delivery services for packages, groceries, and courier needs within the compound',
        'working_hours_en': '8:00 AM - 8:00 PM'
    },
    'خدمات النقل': {
        'name_en': 'Moving Services',
        'specialty_en': 'Local moving, furniture moving, packing services',
        'description_en': 'Professional moving services for relocating within or outside the compound, including packing',
        'working_hours_en': '7:00 AM - 6:00 PM'
    },
    'تخطيط الفعاليات': {
        'name_en': 'Event Planning',
        'specialty_en': 'Party planning, corporate events, wedding coordination',
        'description_en': 'Comprehensive event planning for parties, corporate events, and special occasions',
        'working_hours_en': '9:00 AM - 7:00 PM'
    },
    'خدمات التموين': {
        'name_en': 'Catering Services',
        'specialty_en': 'Event catering, meal prep, special dietary needs',
        'description_en': 'Professional catering for events of all sizes with customizable menus and dietary accommodations',
        'working_hours_en': '6:00 AM - 10:00 PM'
    }
}

async def add_english_translations():
    """Add English translations to services in the database."""
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client.homeme
    services_collection = db.services
    
    try:
        # Get all services
        services = await services_collection.find().to_list(length=None)
        print(f"Found {len(services)} services to update")
        
        updated_count = 0
        
        for service in services:
            service_name = service.get('name', '')
            
            # Check if we have translations for this service
            if service_name in english_translations:
                translations = english_translations[service_name]
                
                # Update the service with English translations
                update_data = {}
                for key, value in translations.items():
                    update_data[key] = value
                
                # Also add French translations (basic ones)
                if 'name_en' in translations:
                    # Basic French translations
                    french_names = {
                        'Plumbing Services': 'Services de Plomberie',
                        'Electrical Services': 'Services Électriques',
                        'HVAC Services': 'Services de Climatisation',
                        'General Handyman': 'Homme à Tout Faire',
                        'House Cleaning': 'Nettoyage de Maison',
                        'Carpet Cleaning': 'Nettoyage de Tapis',
                        'Window Cleaning': 'Nettoyage de Vitres',
                        'Security Guard': 'Agent de Sécurité',
                        'Access Control Setup': 'Configuration Contrôle d\'Accès',
                        'Landscaping & Gardening': 'Aménagement Paysager',
                        'Pool Maintenance': 'Entretien de Piscine',
                        'Pet Care Services': 'Services de Soins aux Animaux',
                        'Personal Trainer': 'Entraîneur Personnel',
                        'Package Delivery': 'Livraison de Colis',
                        'Moving Services': 'Services de Déménagement',
                        'Event Planning': 'Planification d\'Événements',
                        'Catering Services': 'Services de Restauration'
                    }
                    
                    if translations['name_en'] in french_names:
                        update_data['name_fr'] = french_names[translations['name_en']]
                        update_data['description_fr'] = f"Services professionnels - {french_names[translations['name_en']]}"
                        update_data['specialty_fr'] = translations.get('specialty_en', '').replace('Emergency', 'Urgence').replace('Professional', 'Professionnel')
                        update_data['working_hours_fr'] = translations.get('working_hours_en', '').replace('AM', '').replace('PM', '').replace('service', 'service')
                
                # Update the service
                await services_collection.update_one(
                    {'_id': service['_id']},
                    {'$set': update_data}
                )
                
                print(f"Updated service: {service_name} -> {translations['name_en']}")
                updated_count += 1
            else:
                print(f"No translation found for: {service_name}")
        
        print(f"\n✅ Successfully updated {updated_count} services with English translations!")
        
    except Exception as e:
        print(f"❌ Error updating services: {str(e)}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(add_english_translations())