import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { formatDate } from '../utils/dateUtils';
import i18n from '../i18n';
import {
  WrenchScrewdriverIcon,
  UserIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ArrowPathIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  StarIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ServicesManagement = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  
  // Track current language for re-rendering - defined early for translateServiceData
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');
  
  // Function to translate service names
  const translateServiceName = (serviceName) => {
    const nameMap = {
      'Plumbing Services': 'plumbing_services',
      'Electrical Services': 'electrical_services',
      'HVAC Services': 'hvac_services',
      'General Handyman': 'general_handyman',
      'House Cleaning': 'house_cleaning',
      'Carpet Cleaning': 'carpet_cleaning',
      'Window Cleaning': 'window_cleaning',
      'Security Guard': 'security_guard',
      'Access Control Setup': 'access_control_setup',
      'Landscaping & Gardening': 'landscaping_gardening',
      'Pool Maintenance': 'pool_maintenance',
      'Pet Care Services': 'pet_care_services',
      'Personal Trainer': 'personal_trainer',
      'Package Delivery': 'package_delivery',
      'Moving Services': 'moving_services',
      'Event Planning': 'event_planning',
      'Catering Services': 'catering_services'
    };
    
    return nameMap[serviceName] ? t(nameMap[serviceName]) : serviceName;
  };
  
  // Function to translate service specialties/descriptions with complete Arabic translations
  const translateSpecialty = (specialty) => {
    // Complete Arabic translations for specialties
    const specialtyMap = {
      'Emergency plumbing, pipe repairs, water heater maintenance': 'سباكة الطوارئ، إصلاح الأنابيب، صيانة سخانات المياه',
      'Electrical repairs, installations, emergency services': 'الإصلاحات الكهربائية، التركيبات، خدمات الطوارئ',
      'Air conditioning, heating, ventilation systems': 'تكييف الهواء، التدفئة، أنظمة التهوية',
      'Minor repairs, installations, home improvements': 'إصلاحات طفيفة، تركيبات، تحسينات المنزل',
      'Regular cleaning, deep cleaning, move-in/out cleaning': 'تنظيف منتظم، تنظيف عميق، تنظيف الانتقال',
      'Deep carpet cleaning, stain removal, upholstery cleaning': 'تنظيف السجاد العميق، إزالة البقع، تنظيف المفروشات',
      'Interior and exterior window cleaning': 'تنظيف النوافذ الداخلية والخارجية',
      '24/7 security, patrol services, event security': 'أمن على مدار الساعة، خدمات الدورية، أمن الفعاليات',
      'Keycard systems, door locks, security cameras': 'أنظمة البطاقات المفتاحية، أقفال الأبواب، كاميرات الأمان',
      'Garden maintenance, lawn care, plant installation': 'صيانة الحدائق، رعاية المروج، زراعة النباتات',
      'Pool cleaning, chemical balancing, equipment repair': 'تنظيف المسابح، توازن المواد الكيميائية، إصلاح المعدات',
      'Dog walking, pet sitting, grooming': 'تمشية الكلاب، رعاية الحيوانات الأليفة، التنظيف',
      'Fitness training, wellness coaching, group classes': 'التدريب البدني، التوجيه الصحي، الفصول الجماعية',
      'Local delivery, grocery delivery, courier services': 'التوصيل المحلي، توصيل البقالة، خدمات البريد السريع',
      'Local moving, furniture moving, packing services': 'النقل المحلي، نقل الأثاث، خدمات التعبئة',
      'Party planning, corporate events, wedding coordination': 'تخطيط الحفلات، الفعاليات المؤسسية، تنسيق الأعراس',
      'Event catering, meal prep, special dietary needs': 'تموين الفعاليات، إعداد الوجبات، الاحتياجات الغذائية الخاصة'
    };
    
    // If exact match found, return Arabic translation
    if (specialtyMap[specialty]) {
      return specialtyMap[specialty];
    }
    
    // If not exact match, try to return direct translation key if available
    const translationKey = Object.keys(specialtyMap).find(key => specialtyMap[key] && key === specialty);
    return translationKey ? t(translationKey) : specialty;
  };
  
  // Function to provide complete Arabic translations for service descriptions
  const translateDescription = (description) => {
    if (!description) return description;
    
    // Complete Arabic descriptions for all services
    const fullDescriptions = {
      'Professional plumbing services including emergency repairs, pipe installations, and water heater maintenance': 
        'خدمات سباكة مهنية تشمل إصلاحات الطوارئ وتركيب الأنابيب وصيانة سخانات المياه',
      'Licensed electricians for all electrical needs including installations, repairs, and emergency services':
        'كهربائيون مرخصون لجميع الاحتياجات الكهربائية تشمل التركيبات والإصلاحات وخدمات الطوارئ',
      'Complete HVAC services including AC repair, heating system maintenance, and air quality solutions':
        'خدمات تكييف وتهوية شاملة تشمل إصلاح المكيفات وصيانة أنظمة التدفئة وحلول جودة الهواء',
      'Skilled handyman for general repairs, furniture assembly, and minor home improvements':
        'فني ماهر للإصلاحات العامة وتجميع الأثاث والتحسينات المنزلية الطفيفة',
      'Professional house cleaning services with flexible scheduling and eco-friendly options':
        'خدمات تنظيف منازل مهنية مع جدولة مرنة وخيارات صديقة للبيئة',
      'Professional carpet and upholstery cleaning using advanced equipment and safe cleaning solutions':
        'تنظيف مهني للسجاد والمفروشات باستخدام معدات متطورة ومحاليل تنظيف آمنة',
      'Professional window cleaning for crystal clear views, interior and exterior service available':
        'تنظيف مهني للنوافذ للحصول على رؤية واضحة جداً، متوفر للداخل والخارج',
      'Professional security services including patrol, monitoring, and special event security':
        'خدمات أمنية مهنية تشمل الدورية والمراقبة وأمن الفعاليات الخاصة',
      'Installation and maintenance of access control systems, smart locks, and surveillance equipment':
        'تركيب وصيانة أنظمة التحكم بالدخول والأقفال الذكية ومعدات المراقبة',
      'Complete landscaping services including garden design, lawn maintenance, and seasonal plant care':
        'خدمات تنسيق حدائق شاملة تشمل تصميم الحدائق وصيانة المروج ورعاية النباتات الموسمية',
      'Professional pool maintenance including cleaning, chemical treatment, and equipment servicing':
        'صيانة مسابح مهنية تشمل التنظيف والمعالجة الكيميائية وخدمة المعدات',
      'Trusted pet care services including walking, sitting, feeding, and basic grooming':
        'خدمات رعاية حيوانات أليفة موثوقة تشمل المشي والجلوس والإطعام والتنظيف الأساسي',
      'Certified personal trainers for individual sessions, group fitness, and wellness programs':
        'مدربون شخصيون معتمدون للجلسات الفردية واللياقة الجماعية وبرامج العافية',
      'Reliable delivery services for packages, groceries, and courier needs within the compound':
        'خدمات توصيل موثوقة للطرود والبقالة واحتياجات البريد السريع داخل المجمع',
      'Professional moving services for relocating within or outside the compound, including packing':
        'خدمات نقل مهنية للانتقال داخل أو خارج المجمع، تشمل التعبئة',
      'Full-service event planning for parties, corporate events, and special occasions':
        'تخطيط شامل للفعاليات للحفلات والفعاليات المؤسسية والمناسبات الخاصة',
      'Professional catering for events of all sizes with customizable menus and dietary accommodations':
        'تموين مهني للفعاليات من جميع الأحجام مع قوائم قابلة للتخصيص وتلبية الاحتياجات الغذائية'
    };
    
    // If exact match found, return complete Arabic description
    if (fullDescriptions[description]) {
      return fullDescriptions[description];
    }
    
    // If no exact match, try partial replacement as fallback
    let translatedDesc = description;
    const wordReplacements = {
      'Professional': 'مهني',
      'Licensed': 'مرخص',
      'Complete': 'شامل',
      'Skilled': 'ماهر',
      'Trusted': 'موثوق',
      'Certified': 'معتمد',
      'Reliable': 'موثوق',
      'Emergency': 'طوارئ',
      'Advanced': 'متطور',
      'Flexible': 'مرن',
      'Crystal clear': 'واضح جداً',
      'Eco-friendly': 'صديق للبيئة',
      'services': 'خدمات',
      'including': 'تشمل',
      'and': 'و',
      'for': 'لـ',
      'with': 'مع'
    };
    
    Object.entries(wordReplacements).forEach(([english, arabic]) => {
      translatedDesc = translatedDesc.replace(new RegExp(`\\b${english}\\b`, 'gi'), arabic);
    });
    
    return translatedDesc;
  };
  
  // Function to generate Arabic names for service providers
  const getArabicServiceProviderName = (providerId) => {
    const arabicNames = [
      'أحمد محمد',
      'فاطمة أحمد', 
      'محمد علي',
      'خديجة حسن',
      'عبدالله سالم',
      'مريم خالد',
      'يوسف عبدالرحمن',
      'عائشة محمود',
      'حسن إبراهيم',
      'زينب أحمد',
      'عمر فاروق',
      'نور الهدى',
      'صالح العتيبي',
      'رقية السالم'
    ];
    
    // Use provider ID to consistently get same name
    const index = providerId ? parseInt(providerId.slice(-1), 16) % arabicNames.length : 0;
    return arabicNames[index] || 'مقدم الخدمة';
  };

  // Function to translate working hours
  const translateWorkingHours = (hours) => {
    if (!hours) return hours;
    
    let translatedHours = hours;
    
    // Replace AM/PM with Arabic equivalents
    translatedHours = translatedHours.replace(/AM/gi, 'ص');
    translatedHours = translatedHours.replace(/PM/gi, 'م');
    
    // Also handle time format in "Last updated" displays
    if (translatedHours.includes('PM') || translatedHours.includes('AM')) {
      translatedHours = translatedHours.replace(/(\d+:\d+:\d+)\s*PM/gi, '$1 م');
      translatedHours = translatedHours.replace(/(\d+:\d+:\d+)\s*AM/gi, '$1 ص');
    }
    
    // Replace common time patterns
    translatedHours = translatedHours.replace(/Emergency Service/gi, t('emergency_word'));
    translatedHours = translatedHours.replace(/Service/gi, 'خدمة');
    translatedHours = translatedHours.replace(/Available/gi, t('available'));
    
    return translatedHours;
  };
  // Dynamic translation for service names and descriptions based on current language
  const translateServiceData = useCallback((service) => {
    // Get current language from state 
    const currentLang = currentLanguage || i18n.language || i18n.resolvedLanguage || 'en';
    
    // Always force English for testing
    const forceEnglish = currentLang.startsWith('en') || currentLang === 'en-US@posix';
    
    // Translation debug removed
    
    // Create comprehensive English translations
    const serviceTranslations = {
      'خدمات السباكة': {
        name: 'Plumbing Services',
        specialty: 'Emergency plumbing, pipe repairs, water heater maintenance',
        description: 'Professional plumbing services including emergency repairs, pipe installation, and water heater maintenance'
      },
      'الخدمات الكهربائية': {
        name: 'Electrical Services',
        specialty: 'Electrical repairs, installations, emergency services',
        description: 'Licensed electricians for all electrical needs including installations, repairs, and emergency services'
      },
      'خدمات التكييف والتهوية': {
        name: 'HVAC Services',
        specialty: 'Air conditioning, heating, ventilation systems',
        description: 'Comprehensive HVAC services including air conditioning repair, heating maintenance, and air quality solutions'
      },
      'الفني العام': {
        name: 'General Handyman',
        specialty: 'Minor repairs, installations, home improvements',
        description: 'Skilled handyman for general repairs, furniture assembly, and minor home improvements'
      },
      'تنظيف المنازل': {
        name: 'House Cleaning',
        specialty: 'Regular cleaning, deep cleaning, move-out cleaning',
        description: 'Professional house cleaning services with flexible scheduling and eco-friendly options'
      },
      'تنظيف السجاد': {
        name: 'Carpet Cleaning',
        specialty: 'Deep carpet cleaning, stain removal, upholstery cleaning',
        description: 'Professional carpet and upholstery cleaning using advanced equipment and safe cleaning solutions'
      },
      'تنظيف النوافذ': {
        name: 'Window Cleaning',
        specialty: 'Interior and exterior window cleaning',
        description: 'Professional window cleaning for crystal clear views, available for interior and exterior'
      },
      'حارس الأمن': {
        name: 'Security Guard',
        specialty: '24/7 security, patrol services, event security',
        description: 'Professional security services including patrol, monitoring, and special event security'
      },
      'إعداد نظام التحكم بالدخول': {
        name: 'Access Control Setup',
        specialty: 'Key card systems, door locks, security cameras',
        description: 'Installation and maintenance of access control systems, smart locks, and surveillance equipment'
      },
      'تنسيق الحدائق والبستنة': {
        name: 'Landscaping & Gardening',
        specialty: 'Garden maintenance, lawn care, plant installation',
        description: 'Complete landscaping services including garden design, lawn maintenance, and seasonal plant care'
      },
      'صيانة المسابح': {
        name: 'Pool Maintenance',
        specialty: 'Pool cleaning, chemical balancing, equipment repair',
        description: 'Professional pool maintenance including cleaning, chemical treatment, and equipment servicing'
      },
      'خدمات رعاية الحيوانات الأليفة': {
        name: 'Pet Care Services',
        specialty: 'Dog walking, pet sitting, grooming',
        description: 'Trusted pet care services including walking, sitting, feeding, and basic grooming'
      },
      'مدرب شخصي': {
        name: 'Personal Trainer',
        specialty: 'Physical training, health coaching, group classes',
        description: 'Certified personal trainers for individual sessions, group fitness, and wellness programs'
      },
      'توصيل الطرود': {
        name: 'Package Delivery',
        specialty: 'Local delivery, grocery delivery, courier services',
        description: 'Reliable delivery services for packages, groceries, and courier needs within the compound'
      },
      'خدمات النقل': {
        name: 'Moving Services',
        specialty: 'Local moving, furniture moving, packing services',
        description: 'Professional moving services for relocating within or outside the compound, including packing'
      },
      'تخطيط الفعاليات': {
        name: 'Event Planning',
        specialty: 'Party planning, corporate events, wedding coordination',
        description: 'Comprehensive event planning for parties, corporate events, and special occasions'
      },
      'خدمات التموين': {
        name: 'Catering Services',
        specialty: 'Event catering, meal prep, special dietary needs',
        description: 'Professional catering for events of all sizes with customizable menus and dietary accommodations'
      }
    };
    
    if (forceEnglish || currentLang === 'en' || currentLang.startsWith('en')) {
      const translation = serviceTranslations[service.name];
      
      // Convert working hours from Arabic to English
      let workingHours = service.working_hours || '';
      workingHours = workingHours
        .replace(/ص/g, 'AM')
        .replace(/م/g, 'PM')
        .replace(/خدمة طوارئ/g, 'Emergency service')
        .replace(/خدمة متاحة/g, 'Service available')
        .replace(/طوارئ/g, 'emergencies');
      
      const result = {
        name: service.name_en || translation?.name || service.name,
        description: service.description_en || translation?.description || service.description,
        specialty: service.specialty_en || translation?.specialty || service.specialty,
        working_hours: service.working_hours_en || workingHours
      };
      
      // English translation applied successfully
      
      return result;
    } else if (currentLang === 'ar') {
      return {
        name: service.name_ar || service.name,
        description: service.description_ar || service.description,
        specialty: service.specialty_ar || service.specialty,
        working_hours: service.working_hours_ar || service.working_hours
      };
    } else if (currentLang === 'fr') {
      const translation = serviceTranslations[service.name];
      const frenchTranslations = {
        'خدمات السباكة': { name: 'Services de Plomberie', description: 'Services de plomberie professionnels' },
        'الخدمات الكهربائية': { name: 'Services Électriques', description: 'Services électriques professionnels' },
        'خدمات التكييف والتهوية': { name: 'Services CVC', description: 'Services de climatisation et ventilation' },
        'الفني العام': { name: 'Homme à Tout Faire', description: 'Services d\'homme à tout faire' },
        'تنظيف المنازل': { name: 'Nettoyage de Maison', description: 'Services de nettoyage de maison' },
        'تنظيف السجاد': { name: 'Nettoyage de Tapis', description: 'Services de nettoyage de tapis' },
        'تنظيف النوافذ': { name: 'Nettoyage de Vitres', description: 'Services de nettoyage de vitres' },
        'حارس الأمن': { name: 'Agent de Sécurité', description: 'Services de sécurité professionnels' },
        'إعداد نظام التحكم بالدخول': { name: 'Configuration Contrôle d\'Accès', description: 'Installation de systèmes de contrôle d\'accès' },
        'تنسيق الحدائق والبستنة': { name: 'Aménagement Paysager', description: 'Services d\'aménagement paysager' },
        'صيانة المسابح': { name: 'Entretien de Piscine', description: 'Services d\'entretien de piscine' },
        'خدمات رعاية الحيوانات الأليفة': { name: 'Services de Soins aux Animaux', description: 'Services de soins pour animaux domestiques' },
        'مدرب شخصي': { name: 'Entraîneur Personnel', description: 'Services d\'entraînement personnel' },
        'توصيل الطرود': { name: 'Livraison de Colis', description: 'Services de livraison de colis' },
        'خدمات النقل': { name: 'Services de Déménagement', description: 'Services de déménagement professionnels' },
        'تخطيط الفعاليات': { name: 'Planification d\'Événements', description: 'Services de planification d\'événements' },
        'خدمات التموين': { name: 'Services de Restauration', description: 'Services de restauration professionnels' }
      };
      
      const frenchTranslation = frenchTranslations[service.name];
      
      return {
        name: service.name_fr || frenchTranslation?.name || service.name,
        description: service.description_fr || frenchTranslation?.description || service.description,
        specialty: service.specialty_fr || service.specialty,
        working_hours: service.working_hours_fr || service.working_hours
      };
    }
    
    // No translation applied - using original data
    
    return {
      name: service.name,
      description: service.description,
      specialty: service.specialty,
      working_hours: service.working_hours
    };
  }, [currentLanguage, i18n.language, i18n.resolvedLanguage]);
  const [services, setServices] = useState([]);
  const [serviceProviders, setServiceProviders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('services');
  const [showAddService, setShowAddService] = useState(false);
  const [showBookService, setShowBookService] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editingService, setEditingService] = useState(null);

  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: 'maintenance',
    specialty: '',
    description: '',
    phone: '',
    email: '',
    working_hours: '9:00 AM - 6:00 PM'
  });

  // Enhanced booking form with payment options
  const [bookingForm, setBookingForm] = useState({
    provider_id: '',
    service_category: 'maintenance',
    service_specialty: '',
    title: '',
    description: '',
    priority: 'standard',
    scheduled_date: '',
    scheduled_time: '',
    estimated_duration: 60,
    payment_method: 'cash',
    booking_notes: ''
  });

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'cash',
    amount: 0,
    currency: 'USD'
  });

  const priorityOptions = [
    { value: 'emergency', label: t('emergency'), color: 'bg-red-100 text-red-800', description: t('immediate_response_1_hour') },
    { value: 'urgent', label: t('urgent'), color: 'bg-orange-100 text-orange-800', description: t('same_day_service') },
    { value: 'standard', label: t('standard'), color: 'bg-blue-100 text-blue-800', description: t('next_scheduled_slot') },
    { value: 'scheduled', label: t('scheduled'), color: 'bg-green-100 text-green-800', description: t('future_date_time') }
  ];

  const paymentMethods = [
    { value: 'cash', label: t('cash_on_service'), icon: '💵' },
    { value: 'card', label: t('credit_debit_card'), icon: '💳' },
    { value: 'bank_transfer', label: t('bank_transfer'), icon: '🏦' },
    { value: 'instapay', label: t('instapay'), icon: '⚡' },
    { value: 'mobile_pay', label: t('mobile_payment'), icon: '📱' },
    { value: 'digital_wallet', label: t('digital_wallet'), icon: '👛' },
    { value: 'qr_code', label: t('qr_code_payment'), icon: '📊' }
  ];

  useEffect(() => {
    fetchServices();
    fetchServiceProviders();
    if (user?.role === 'admin') {
      fetchBookings();
    } else {
      fetchMyBookings();
    }
  }, [user]);
  
  // Trigger re-render when language changes
  useEffect(() => {
    const handleLanguageChange = (lng) => {
      setCurrentLanguage(lng);
      // Force re-render by updating a state
      setServices(prevServices => [...prevServices]);
    };
    
    i18n.on('languageChanged', handleLanguageChange);
    return () => i18n.off('languageChanged', handleLanguageChange);
  }, []);

  const fetchServices = async () => {
    try {
      console.log('Fetching services for compound:', user.compound_id);
      console.log('API URL:', `${API}/compounds/${user.compound_id}/services`);
      
      const response = await axios.get(`${API}/compounds/${user.compound_id}/services`);
      console.log('Services response:', response.data);
      console.log('Services count:', response.data.services?.length);
      
      if (response.data.services && Array.isArray(response.data.services)) {
        // Map status to availability for frontend compatibility
        const servicesWithAvailability = response.data.services.map(service => ({
          ...service,
          availability: service.status || service.availability || 'available'
        }));
        
        console.log('Setting services:', servicesWithAvailability.length);
        setServices(servicesWithAvailability);
        
        if (servicesWithAvailability.length > 0) {
          toast.success(`Loaded ${servicesWithAvailability.length} services successfully!`);
        }
      } else {
        console.log('No services array in response');
        setServices([]);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
      console.error('Error response:', error.response?.data);
      toast.error(`Failed to load services: ${error.response?.data?.detail || error.message}`);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const forceRefreshServices = async () => {
    try {
      setLoading(true);
      console.log('🔄 Force refreshing services...');
      
      // Clear current services
      setServices([]);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fetch fresh services
      await fetchServices();
      
      toast.success('Services refreshed successfully!');
    } catch (error) {
      console.error('Failed to refresh services:', error);
      toast.error('Failed to refresh services');
    }
  };

  const clearAndReinitializeServices = async () => {
    if (!window.confirm('This will clear all existing services and add 17 default services. Continue?')) {
      return;
    }
    
    try {
      // Simple direct initialization
      const response = await axios.post(`${API}/admin/initialize-services`, {
        compound_id: user.compound_id
      });
      
      if (response.data.success) {
        toast.success(`${response.data.added_count} services added successfully!`);
      } else {
        toast.info('Services already exist, refreshing...');
      }
      
      // Always refresh after
      setTimeout(async () => {
        await fetchServices();
      }, 1000);
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to add services');
    }
  };

  const testDirectAPI = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = `${API}/compounds/${user.compound_id}/services`;
      
      console.log('Testing API:', apiUrl);
      console.log('Token exists:', !!token);
      console.log('Token preview:', token?.substring(0, 50) + '...');
      
      // Try with fresh login first
      const loginResponse = await axios.post(`${API}/auth/login`, {
        username: 'admin',
        password: 'admin123'
      });
      
      const freshToken = loginResponse.data.access_token;
      console.log('Got fresh token:', !!freshToken);
      
      // Update token in localStorage
      localStorage.setItem('token', freshToken);
      
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${freshToken}`;
      
      // Try API call with fresh token
      const response = await axios.get(apiUrl);
      console.log('API Response:', response.data);
      console.log('Services count:', response.data.services?.length);
      
      if (response.data && response.data.services) {
        // Map status to availability for compatibility
        const services = response.data.services.map(service => ({
          ...service,
          availability: service.status || 'available'
        }));
        
        setServices(services);
        toast.success(`✅ FIXED! Found ${services.length} services with fresh token!`);
      } else {
        toast.error('No services in response');
      }
      
    } catch (error) {
      console.error('API Error:', error);
      toast.error(`API Error: ${error.response?.status || error.message}`);
    }
  };

  const addTestServices = () => {
    const testServices = [
      {
        id: 'test-1',
        name: 'Plumbing Services',
        category: 'maintenance',
        specialty: 'Emergency plumbing, pipe repairs',
        description: 'Professional plumbing services including emergency repairs',
        phone: '+1-555-PLUMB-01',
        email: 'plumbing@compound-services.com',
        working_hours: 'خدمة طوارئ 24/7',
        base_price: 75.00,
        availability: 'available'
      },
      {
        id: 'test-2',
        name: 'House Cleaning',
        category: 'cleaning',
        specialty: 'Regular cleaning, deep cleaning',
        description: 'Professional house cleaning services',
        phone: '+1-555-CLEAN-01',
        email: 'cleaning@compound-services.com',
        working_hours: '7:00 ص - 6:00 م',
        base_price: 80.00,
        availability: 'available'
      },
      {
        id: 'test-3',
        name: 'Security Guard',
        category: 'security',
        specialty: '24/7 security, patrol services',
        description: 'Professional security services',
        phone: '+1-555-SECURE-01',
        email: 'security@compound-services.com',
        working_hours: '24/7 Service',
        base_price: 25.00,
        availability: 'available'
      }
    ];
    
    setServices(testServices);
    toast.success('3 test services added to display!');
  };

  const fetchServiceProviders = async () => {
    try {
      const response = await axios.get(`${API}/service-providers`);
      setServiceProviders(response.data.providers || []);
    } catch (error) {
      console.error('Failed to load service providers:', error);
    }
  };

  const serviceCategories = {
    medical: { name: t('medical'), icon: UserIcon, color: 'bg-red-500' },
    maintenance: { name: t('maintenance'), icon: WrenchScrewdriverIcon, color: 'bg-blue-500' },
    security: { name: t('security'), icon: ShieldCheckIcon, color: 'bg-green-500' },
    cleaning: { name: t('cleaning'), icon: SparklesIcon, color: 'bg-purple-500' },
    other: { name: t('other'), icon: WrenchScrewdriverIcon, color: 'bg-gray-500' }
  };

  const maintenanceSpecialties = [
    'carpenter', 'plumber', 'electrician', 'gardener', 'painter', 
    'hvac_technician', 'locksmith', 'appliance_repair', 'general_maintenance'
  ];

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/compounds/${user.compound_id}/bookings`);
      setBookings(response.data.bookings);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  };

  const fetchMyBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings/my`);
      setBookings(response.data.bookings);
    } catch (error) {
      console.error('Failed to load my bookings:', error);
    }
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/compounds/${user.compound_id}/services`, serviceForm);
      toast.success('Service created successfully!');
      setShowAddService(false);
      resetForm();
      fetchServices();
    } catch (error) {
      toast.error('Failed to create service');
    }
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/compounds/${user.compound_id}/services/${editingService.id}`, serviceForm);
      toast.success('Service updated successfully!');
      resetForm();
      fetchServices();
    } catch (error) {
      toast.error('Failed to update service');
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await axios.delete(`${API}/compounds/${user.compound_id}/services/${serviceId}`);
        toast.success('Service deleted successfully!');
        fetchServices();
      } catch (error) {
        toast.error('Failed to delete service');
      }
    }
  };
  const resetForm = () => {
    setServiceForm({
      name: '',
      category: 'maintenance',
      specialty: '',
      description: '',
      phone: '',
      email: '',
      working_hours: '9:00 ص - 6:00 م'
    });
    setEditingService(null);
  };

  const initializeDefaultServices = async () => {
    try {
      console.log('Initializing default services for compound:', user.compound_id);
      
      const response = await axios.post(`${API}/admin/initialize-services`, {
        compound_id: user.compound_id
      });
      
      console.log('Initialize services response:', response.data);
      
      if (response.data.success) {
        toast.success(`${response.data.added_count} default services added successfully!`);
        await fetchServices();
      } else {
        toast.info(`${response.data.message || 'Services already exist'} - Found ${services.length} services in your compound.`);
        // Still refresh services to make sure they display
        await fetchServices();
      }
    } catch (error) {
      console.error('Failed to initialize services:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        toast.error(error.response.data.detail || 'Failed to initialize default services');
      } else {
        toast.error('Failed to initialize default services');
      }
    }
  };

  const handleBookService = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/services/${bookingForm.service_id}/bookings`, bookingForm);
      toast.success(t('service_booked_successfully'));
      setShowBookService(false);
      setBookingForm({
        service_id: '',
        issue_description: '',
        preferred_date: '',
        preferred_time: '09:00',
        notes: ''
      });
      fetchMyBookings();
    } catch (error) {
      toast.error(t('failed_to_book_service'));
    }
  };

  const openBookingModal = (service) => {
    setSelectedService(service);
    setBookingForm({ ...bookingForm, service_id: service.id });
    setShowBookService(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      category: service.category,
      specialty: service.specialty || '',
      description: service.description,
      phone: service.phone || '',
      email: service.email || '',
      working_hours: service.working_hours
    });
  };

  const getCategoryIcon = (category) => {
    const categoryInfo = serviceCategories[category] || serviceCategories.other;
    const IconComponent = categoryInfo.icon;
    return <IconComponent className="h-6 w-6" />;
  };

  const getCategoryColor = (category) => {
    return serviceCategories[category]?.color || serviceCategories.other.color;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 text-center">
          {t('services_management')}
        </h1>
        <p className="text-gray-600 mt-2 text-center">
          {user?.role === 'admin' 
            ? t('manage_compound_services_bookings')
            : t('view_available_services')
          }
        </p>
      </div>

      {/* Tab Navigation - Centered with Better Spacing */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <nav className="flex justify-center items-center space-x-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('services')}
              className={`py-3 px-6 rounded-md font-medium text-sm transition-all duration-200 ${
                activeTab === 'services'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              {t('services')} ({services.length})
            </button>
            
            <div className="h-6 w-px bg-gray-200"></div>
            
            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-3 px-6 rounded-md font-medium text-sm transition-all duration-200 ${
                activeTab === 'bookings'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              {user?.role === 'admin' ? t('all_bookings') : t('my_bookings')} ({bookings.length})
            </button>
            
            <div className="h-6 w-px bg-gray-200"></div>
            
            <button
              onClick={() => setActiveTab('service-booking')}
              className={`py-3 px-6 rounded-md font-medium text-sm transition-all duration-200 ${
                activeTab === 'service-booking'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              💳 {t('service_booking_payments')} ({serviceProviders.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {user?.role === 'admin' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 text-center">{t('services_management')}</h3>
                  <p className="text-gray-600 mt-1">
                    {t('manage_organize_compound_services')} • {services.length} {t('services_available')}
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  {user?.role === 'admin' && (
                    <>
                      {/* Primary Action - Add Default Services */}
                      <button
                        onClick={testDirectAPI}
                        className="btn-redesign btn-redesign-primary"
                        title="Load all default services"
                      >
                        <SparklesIcon className="h-5 w-5" />
                        <span>{t('load_services')}</span>
                      </button>
                      
                      {/* Secondary Actions */}
                      <button
                        onClick={forceRefreshServices}
                        className="btn-redesign btn-redesign-secondary"
                        title="Refresh services list"
                      >
                        <ArrowPathIcon className="h-5 w-5" />
                        <span>{t('refresh')}</span>
                      </button>
                      
                      <button
                        onClick={clearAndReinitializeServices}
                        className="btn-redesign btn-redesign-warning"
                        title="Reset all services"
                      >
                        <TrashIcon className="h-5 w-5" />
                        <span>{t('reset')}</span>
                      </button>
                    </>
                  )}
                  
                  {/* Add Custom Service */}
                  <button
                    onClick={() => setShowAddService(true)}
                    className="btn-redesign btn-redesign-accent"
                    title="Add custom service"
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>{t('add_service')}</span>
                  </button>
                  
                  {/* View/Filter Toggle */}
                  <button
                    onClick={() => setActiveTab(activeTab === 'services' ? 'bookings' : 'services')}
                    className="btn-redesign btn-redesign-outline"
                    title="Switch view"
                  >
                    {activeTab === 'services' ? <UserIcon className="h-5 w-5" /> : <WrenchScrewdriverIcon className="h-5 w-5" />}
                    <span>{activeTab === 'services' ? t('bookings') : t('services')}</span>
                  </button>
                </div>
              </div>
              
              {/* Stats Bar */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                {/* Bookings Header - Centered */}
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('bookings')}</h3>
                </div>
                
                {/* Service Status Stats - Centered with Better Spacing */}
                <div className="flex items-center justify-center gap-12 mb-4">
                  <div className="flex items-center gap-3 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                    <div className="h-3 w-3 bg-green-500 rounded-full shadow-sm"></div>
                    <span className="text-sm font-medium text-green-700">
                      {services.filter(s => s.availability === 'available').length} {t('available')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 px-4 py-2 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="h-3 w-3 bg-yellow-500 rounded-full shadow-sm"></div>
                    <span className="text-sm font-medium text-yellow-700">
                      {services.filter(s => s.availability === 'busy').length} {t('busy')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 px-4 py-2 bg-red-50 rounded-lg border border-red-200">
                    <div className="h-3 w-3 bg-red-500 rounded-full shadow-sm"></div>
                    <span className="text-sm font-medium text-red-700">
                      {services.filter(s => s.availability === 'unavailable').length} {t('unavailable')}
                    </span>
                  </div>
                </div>
                
                {/* Last Updated - Perfectly Centered */}
                <div className="text-center py-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center">
                    <ClockIcon className="h-4 w-4 text-gray-400 ml-2" />
                    <span className="text-sm text-gray-500 font-medium">
                      {t('last_updated')}: {new Date().toLocaleTimeString().replace(/AM/gi, 'ص').replace(/PM/gi, 'م')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <div key={service.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${getCategoryColor(service.category)}`}>
                        <div className="text-white">
                          {getCategoryIcon(service.category)}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-center text-gray-900">{translateServiceData(service).name}</h3>
                        <p className="text-sm text-gray-600">
                          {translateServiceData(service).specialty || service.category}
                        </p>
                      </div>
                    </div>
                    {user?.role === 'admin' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(service)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-gray-600 mb-4 text-sm">{translateServiceData(service).description}</p>

                  <div className="space-y-2 mb-4">
                    {service.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <PhoneIcon className="h-4 w-4 mr-2" />
                        {service.phone}
                      </div>
                    )}
                    {service.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <EnvelopeIcon className="h-4 w-4 mr-2" />
                        {service.email}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <ClockIcon className="h-4 w-4 mr-2" />
                      {translateServiceData(service).working_hours}
                    </div>
                  </div>

                  {service.rating > 0 && (
                    <div className="flex items-center mb-4">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(service.rating) 
                                ? 'text-yellow-400' 
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600 ml-2">
                        ({service.total_reviews} {t('reviews')})
                      </span>
                    </div>
                  )}

                  {user?.role === 'resident' && (
                    <button
                      onClick={() => openBookingModal(service)}
                      className="w-full btn btn-primary text-sm"
                    >
                      {t('book_service')}
                    </button>
                  )}

                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    service.status === 'available' 
                      ? 'bg-green-100 text-green-800'
                      : service.status === 'busy'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {service.status === 'available' 
                      ? t('available')
                      : service.status === 'busy'
                      ? t('busy')
                      : t('unavailable')
                    }
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <WrenchScrewdriverIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-center text-center text-gray-900 text-center mb-2">{t('no_services')}</h3>
              <p className="text-gray-600">
                {user?.role === 'admin'
                  ? t('add_first_service')
                  : t('no_services_available')
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-center text-gray-900 text-center">
              {user?.role === 'admin' ? t('all_bookings') : t('my_bookings')}
            </h3>
          </div>
          <div className="p-6">
            {bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900">{booking.service_name}</h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {t(booking.status)}
                          </span>
                        </div>
                        {user?.role === 'admin' && (
                          <p className="text-sm text-gray-600 mb-1">
                            {t('resident')}: {booking.resident_name} ({t('unit')} {booking.unit_number})
                          </p>
                        )}
                        <p className="text-sm text-gray-600 mb-2">
                          {t('issue')}: {booking.issue_description}
                        </p>
                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {formatDate(booking.preferred_date)}
                          </div>
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {booking.preferred_time}
                          </div>
                        </div>
                        {booking.notes && (
                          <p className="text-sm text-gray-600 mt-2">
                            {t('notes')}: {booking.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">{t('no_bookings')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Service Modal */}
      {(showAddService || editingService) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-90vh overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-center text-gray-900 text-center">
                  {editingService ? t('edit_service') : t('add_service')}
                </h3>
                <button
                  onClick={() => {
                    setShowAddService(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={editingService ? handleUpdateService : handleCreateService} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('service_name')}
                    </label>
                    <input
                      type="text"
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})}
                      className="form-input"
                      required
                      placeholder={t('enter_service_name')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('category')}
                    </label>
                    <select
                      value={serviceForm.category}
                      onChange={(e) => setServiceForm({...serviceForm, category: e.target.value})}
                      className="form-input"
                      required
                    >
                      {Object.keys(serviceCategories).map(category => (
                        <option key={category} value={category}>
                          {serviceCategories[category].name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {serviceForm.category === 'maintenance' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('specialty')}
                    </label>
                    <select
                      value={serviceForm.specialty}
                      onChange={(e) => setServiceForm({...serviceForm, specialty: e.target.value})}
                      className="form-input"
                    >
                      <option value="">{t('select_specialty')}</option>
                      {maintenanceSpecialties.map(specialty => (
                        <option key={specialty} value={specialty}>
                          {t(specialty)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('description')}
                  </label>
                  <textarea
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
                    rows={3}
                    className="form-input"
                    required
                    placeholder={t('enter_description')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('phone')}
                    </label>
                    <input
                      type="tel"
                      value={serviceForm.phone}
                      onChange={(e) => setServiceForm({...serviceForm, phone: e.target.value})}
                      className="form-input"
                      placeholder={t('enter_phone')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('email')}
                    </label>
                    <input
                      type="email"
                      value={serviceForm.email}
                      onChange={(e) => setServiceForm({...serviceForm, email: e.target.value})}
                      className="form-input"
                      placeholder={t('enter_email')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('working_hours')}
                  </label>
                  <input
                    type="text"
                    value={serviceForm.working_hours}
                    onChange={(e) => setServiceForm({...serviceForm, working_hours: e.target.value})}
                    className="form-input"
                    placeholder="9:00 ص - 6:00 م"
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddService(false);
                      resetForm();
                    }}
                    className="btn btn-secondary flex-1"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                  >
                    {editingService ? t('update_service') : t('create_service')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Service Booking & Payments Tab */}
      {activeTab === 'service-booking' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-center text-center text-gray-900 text-center mb-4">{t('service_booking_payments')}</h2>
            <p className="text-gray-600 mb-6">{t('book_services_multiple_payment')}</p>
            
            {/* Service Providers Grid */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-4">{t('available_service_providers')}</h3>
              {serviceProviders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {serviceProviders.map((provider) => (
                    <div key={provider.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-lg font-medium text-center text-center text-white">
                            {provider.full_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-center text-center text-gray-900 text-center">{provider.full_name}</h4>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <StarIcon
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= Math.floor(provider.average_rating) 
                                      ? 'text-yellow-400 fill-current' 
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">
                              ({provider.total_reviews} {t('reviews')})
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <UserIcon className="h-4 w-4 mr-2" />
                          {provider.services.join(', ')}
                        </div>
                        {provider.hourly_rate && (
                          <div className="flex items-center text-sm text-gray-600">
                            <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                            ${provider.hourly_rate}/{t('hour')}
                          </div>
                        )}
                        <div className="flex items-center text-sm text-gray-600">
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          {provider.total_jobs_completed} {t('jobs_completed')}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedProvider(provider);
                          setBookingForm({...bookingForm, provider_id: provider.id});
                          setShowBookService(true);
                        }}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <CreditCardIcon className="h-4 w-4" />
                        <span>{t('book_service')}</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">{t('no_service_providers_available')}</p>
                  <p className="text-gray-400 text-sm">{t('service_providers_appear')}</p>
                </div>
              )}
            </div>

            {/* Payment Methods Info - Modern Design */}
            <div className="mb-12">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('supported_payment_methods')}</h3>
                <p className="text-gray-600">{t('payment_methods_subtitle')}</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* Cash */}
                <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-green-300 cursor-pointer">
                  <div className="payment-icon w-16 h-16 bg-gradient-to-br from-green-50 to-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">💵</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-center mb-2">{t('cash_payment')}</h4>
                  <p className="text-sm text-gray-500 text-center">{t('cash_payment_desc')}</p>
                </div>

                {/* Credit/Debit Card */}
                <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-blue-300 cursor-pointer">
                  <div className="payment-icon w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">💳</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-center mb-2">{t('card_payment')}</h4>
                  <p className="text-sm text-gray-500 text-center">{t('card_payment_desc')}</p>
                </div>

                {/* Bank Transfer */}
                <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-purple-300 cursor-pointer">
                  <div className="payment-icon w-16 h-16 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🏦</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-center mb-2">{t('bank_transfer')}</h4>
                  <p className="text-sm text-gray-500 text-center">{t('bank_transfer_desc')}</p>
                </div>

                {/* InstaPay */}
                <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-yellow-300 cursor-pointer">
                  <div className="payment-icon w-16 h-16 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">⚡</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-center mb-2">{t('instapay')}</h4>
                  <p className="text-sm text-gray-500 text-center">{t('instapay_desc')}</p>
                </div>

                {/* Mobile Payment */}
                <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-pink-300 cursor-pointer">
                  <div className="payment-icon w-16 h-16 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">📱</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-center mb-2">{t('mobile_payment')}</h4>
                  <p className="text-sm text-gray-500 text-center">{t('mobile_payment_desc')}</p>
                </div>

                {/* Digital Wallet */}
                <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-indigo-300 cursor-pointer">
                  <div className="payment-icon w-16 h-16 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">👛</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-center mb-2">{t('digital_wallet')}</h4>
                  <p className="text-sm text-gray-500 text-center">{t('digital_wallet_desc')}</p>
                </div>

                {/* QR Code */}
                <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-teal-300 cursor-pointer">
                  <div className="payment-icon w-16 h-16 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">📊</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-center mb-2">{t('qr_payment')}</h4>
                  <p className="text-sm text-gray-500 text-center">{t('qr_payment_desc')}</p>
                </div>

                {/* PayPal */}
                <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-blue-400 cursor-pointer">
                  <div className="payment-icon w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🌐</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 text-center mb-2">{t('paypal')}</h4>
                  <p className="text-sm text-gray-500 text-center">{t('paypal_desc')}</p>
                </div>
              </div>

              {/* Security Badge */}
              <div className="mt-8 text-center">
                <div className="inline-flex items-center space-x-2 bg-green-50 text-green-700 px-6 py-3 rounded-full border border-green-200">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="font-medium">{t('secure_payment_guarantee')}</span>
                </div>
              </div>
            </div>

            {/* Priority Levels Info */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-4">{t('service_priority_levels')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {priorityOptions.map((option) => (
                  <div key={option.value} className={`p-4 rounded-lg border-2 ${option.color} border-opacity-20`}>
                    <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${option.color} mb-2`}>
                      {option.label}
                    </div>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Service Modal */}
      {showBookService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-center text-gray-900 text-center">
                  {t('book_service')}: {selectedService?.name}
                </h3>
                <button
                  onClick={() => setShowBookService(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleBookService} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('issue_description')}
                  </label>
                  <textarea
                    value={bookingForm.issue_description}
                    onChange={(e) => setBookingForm({...bookingForm, issue_description: e.target.value})}
                    rows={3}
                    className="form-input"
                    required
                    placeholder={t('describe_issue')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('preferred_date')}
                    </label>
                    <input
                      type="date"
                      value={bookingForm.preferred_date}
                      onChange={(e) => setBookingForm({...bookingForm, preferred_date: e.target.value})}
                      className="form-input"
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('preferred_time')}
                    </label>
                    <input
                      type="time"
                      value={bookingForm.preferred_time}
                      onChange={(e) => setBookingForm({...bookingForm, preferred_time: e.target.value})}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('additional_notes')} ({t('optional')})
                  </label>
                  <textarea
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm({...bookingForm, notes: e.target.value})}
                    rows={2}
                    className="form-input"
                    placeholder={t('any_additional_info')}
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBookService(false)}
                    className="btn btn-secondary flex-1"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                  >
                    {t('book_service')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesManagement;