import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
  en: {
    translation: {
      // Authentication
      'welcome_back': 'Welcome back to your compound',
      'join_community': 'Join your compound community',
      'sign_in': 'Sign In',
      'sign_up': 'Create Account',
      'username': 'Username',
      'password': 'Password',
      'confirm_password': 'Confirm Password',
      'email': 'Email',
      'full_name': 'Full Name',
      'phone': 'Phone Number',
      'role': 'Role',
      'compound_id': 'Compound ID',
      'unit_number': 'Unit Number',
      'signing_in': 'Signing in...',
      'creating_account': 'Creating account...',
      'already_have_account': 'Already have an account?',
      'dont_have_account': "Don't have an account?",
      'register_here': 'Register here',
      'sign_in_here': 'Sign in here',
      
      // Roles
      'admin': 'Admin',
      'resident': 'Resident',
      
      // Navigation
      'dashboard': 'Dashboard',
      'compound_management': 'Compound Management',
      'family_management': 'Family Management',
      'financial_management': 'Financial Management',
      'message_center': 'Message Center',
      'notifications_nav': 'Notifications',
      'sign_out': 'Sign Out',
      'services_management': 'Services Management',
      'maintenance_system': 'Maintenance System',
      'guest_management': 'Guest Management',
      'events_announcements': 'Events & Announcements',
      'advanced_analytics': 'Advanced Analytics',
      'document_management': 'Document Management',
      'voting_system': 'Voting System',
      'smart_home': 'Smart Home',
      'government_utility_gateway': 'Government & Utility Gateway',
      'community_newsletter': 'Community Newsletter',
      
      // Dashboard
      'welcome_back_name': 'Welcome back, {{name}}',
      'welcome_home_name': 'Welcome home, {{name}}',
      'dashboard_welcome_subtitle': "Here's what's happening in your compound today",
      'happening_today': "Here's what's happening in {{compound}} today.",
      'everything_manage': 'Everything you need to manage your home',
      'total_residents': 'Total Residents',
      'total_families': 'Total Families',
      'total_services': 'Total Services',
      'open_messages': 'Open Messages',
      'recent_activity': 'Recent Activity',
      'no_recent_activity': 'No recent activity',
      'quick_actions': 'Quick Actions',
      'current_time': 'Current Time',
      
      // Quick Actions
      'add_resident': 'Add Resident',
      'create_residence_account': 'Create Residence Account',
      'manage_units': 'Manage Units',
      'view_all_units': 'View All Units',
      'send_notice': 'Send Notice',
      'broadcast_residents': 'Broadcast to Residents',
      'view_payments': 'View Payments',
      'check_financial_status': 'Check Financial Status',
      
      // Trial Status
      'start_free_trial': 'Start Free Trial',
      'get_14_days_premium': 'Get 14 Days Premium',
      'start_trial': 'Start Trial',
      
      // Activities
      'activity': {
        'new_resident_joined': 'New resident joined',
        'service_booked': 'Service booked',
        'monthly_fee_paid': 'Monthly fee paid'
      },
      
      // Time
      'time': {
        'minutes_ago': 'minutes ago',
        'hour_ago': 'hour ago'
      },
      
      // Common
      'loading': 'Loading...',
      'error': 'Error',
      'success': 'Success',
      'cancel': 'Cancel',
      'save': 'Save',
      'edit': 'Edit',
      'delete': 'Delete',
      'confirm': 'Confirm',
      'yes': 'Yes',
      'no': 'No',
      'submit': 'Submit',
      'close': 'Close',
      'add': 'Add',
      'update': 'Update',
      'remove': 'Remove',
      'back': 'Back',
      'next': 'Next',
      'previous': 'Previous',
      'finish': 'Finish',
      'continue': 'Continue',
      'search': 'Search',
      'filter': 'Filter',
      'sort': 'Sort',
      'all': 'All',
      'none': 'None',
      'select': 'Select',
      'clear': 'Clear',
      'reset': 'Reset',
      'refresh': 'Refresh',
      'view': 'View',
      'details': 'Details',
      'settings': 'Settings',
      'profile': 'Profile',
      'help': 'Help',
      'about': 'About',
      'contact': 'Contact',
      'privacy': 'Privacy',
      'terms': 'Terms',
      
      // Trial Status
      'free_trial_active': 'Free Trial Active',
      'days_remaining': 'days remaining',
      'day_remaining': 'day remaining',
      'upgrade_now': 'Upgrade Now',
      'view_plans': 'View Plans',
      'usage_limits': 'Usage & Limits',
      'trial_ending_soon': 'Trial Ending Soon',
      'trial_expired': 'Trial Expired',
      'premium_account': 'Premium Account',
      'unlimited_storage': 'Unlimited storage and services',
      'premium_support': 'Priority customer support',
      'percentage_used': 'used',
      'near_limit': 'You are approaching your limit',
      'start_free_trial': 'Start Free Trial',
      'get_14_days_premium': 'Get 14 Days Premium',
      'start_trial': 'Start Trial',
      
      // Transliteration System
      'transliteration': {
        'toggle_label': 'Transliteration',
        'toggle_tooltip': 'Toggle Arabic transliteration',
        'mode_tooltip': 'Change transliteration mode',
        'arabic_to_latin': 'Arabic to Latin',
        'latin_to_arabic': 'Latin to Arabic',
        'status_ar_to_en': 'Arabic → English',
        'status_en_to_ar': 'English → Arabic',
        'status_inactive': 'Inactive'
      },
      
      // Logo Upload System (English)
      logo_upload: {
        'upload_logo': 'Upload Company Logo',
        'drag_drop': 'Drag and drop your logo here',
        'browse': 'Browse Files',
        'invalid_image_type': 'Please select a valid image file',
        'file_too_large': 'File too large. Maximum 5 MB allowed.',
        'logo_uploaded_successfully': 'Logo uploaded successfully!',
        'logo_upload_failed': 'Logo upload failed. Please try again.',
        'logo_processing_failed': 'Logo processing failed. Please try again.',
        'company_logo_placeholder': 'Company Logo'
      },
      
      // Account Selection System (English)
      account_selection: {
        'title': 'Choose Your Account Type',
        'subtitle': 'Select the plan that best fits your property management needs',
        'loading': 'Loading account options...',
        'individual': 'Individual Compound',
        'enterprise': 'Enterprise Company',
        'popular': 'Most Popular',
        'per_unit_month': '/unit/month',
        'additional_compounds': 'Additional compounds',
        'free_trial': 'Free Trial',
        'features_included': 'Features Included',
        'get_started': 'Get Started',
        'selecting': 'Selecting...',
        'need_help': 'Need help choosing?',
        'contact_support': 'Contact Support'
      },
      
      // Common (English)
      'back_to_login': 'Back to Login',
    }
  },
  ar: {
    translation: {
      // Authentication
      'welcome_back': 'مرحباً بعودتك إلى مجمعك السكني',
      'join_community': 'انضم إلى مجتمع مجمعك السكني',
      'sign_in': 'تسجيل الدخول',
      'sign_up': 'إنشاء حساب',
      'username': 'اسم المستخدم',
      'password': 'كلمة المرور',
      'confirm_password': 'تأكيد كلمة المرور',
      'email': 'البريد الإلكتروني',
      'full_name': 'الاسم الكامل',
      'phone': 'رقم الهاتف',
      'role': 'الدور',
      'compound_id': 'معرف المجمع',
      'unit_number': 'رقم الوحدة',
      'signing_in': 'جاري تسجيل الدخول...',
      'creating_account': 'جاري إنشاء الحساب...',
      'already_have_account': 'لديك حساب بالفعل؟',
      'dont_have_account': "ليس لديك حساب؟",
      'register_here': 'سجل هنا',
      'sign_in_here': 'سجل دخولك هنا',
      
      // Roles
      'admin': 'مدير',
      'resident': 'مقيم',
      
      // Navigation
      'dashboard': 'لوحة التحكم',
      'compound_management': 'إدارة المجمع',
      'family_management': 'إدارة الأسر',
      'financial_management': 'الإدارة المالية',
      'message_center': 'مركز الرسائل',
      'notifications_nav': 'الإشعارات',
      'sign_out': 'تسجيل الخروج',
      'services_management': 'إدارة الخدمات',
      'maintenance_system': 'نظام الصيانة',
      'guest_management': 'إدارة الضيوف',
      'events_announcements': 'الأحداث والإعلانات',
      'advanced_analytics': 'التحليلات المتقدمة',
      'document_management': 'إدارة الوثائق',
      'voting_system': 'نظام التصويت',
      'smart_home': 'المنزل الذكي',
      'government_utility_gateway': 'بوابة الحكومة والمرافق',
      'community_newsletter': 'النشرة الإخبارية للمجتمع',
      
      // Dashboard
      'welcome_back_name': 'مرحباً بعودتك، {{name}}',
      'welcome_home_name': 'أهلاً بعودتك، {{name}}',
      'dashboard_welcome_subtitle': "إليك ما يحدث في مجمعك اليوم",
      'happening_today': "إليك ما يحدث في {{compound}} اليوم.",
      'everything_manage': 'كل ما تحتاجه لإدارة منزلك',
      'total_residents': 'إجمالي المقيمين',
      'total_families': 'إجمالي الأسر',
      'total_services': 'إجمالي الخدمات',
      'open_messages': 'الرسائل المفتوحة',
      'recent_activity': 'النشاط الحديث',
      'no_recent_activity': 'لا يوجد نشاط حديث',
      'quick_actions': 'إجراءات سريعة',
      'current_time': 'الوقت الحالي',
      
      // Quick Actions
      'add_resident': 'إضافة مقيم',
      'create_residence_account': 'إنشاء حساب سكني',
      'manage_units': 'إدارة الوحدات',
      'view_all_units': 'عرض جميع الوحدات',
      'send_notice': 'إرسال إشعار',
      'broadcast_residents': 'بث للمقيمين',
      'view_payments': 'عرض المدفوعات',
      'check_financial_status': 'فحص الوضع المالي',
      
      // Trial Status
      'start_free_trial': 'بدء النسخة التجريبية المجانية',
      'get_14_days_premium': 'احصل على 14 يوم مميز',
      'start_trial': 'بدء التجربة',
      
      // Activities
      'activity': {
        'new_resident_joined': 'انضم مقيم جديد',
        'service_booked': 'تم حجز خدمة',
        'monthly_fee_paid': 'تم دفع الرسوم الشهرية'
      },
      
      // Time
      'time': {
        'minutes_ago': 'دقائق مضت',
        'hour_ago': 'ساعة مضت'
      },
      
      // Transliteration System
      'transliteration': {
        'toggle_label': 'الكتابة بالحروف اللاتينية',
        'toggle_tooltip': 'تبديل الكتابة العربية بالحروف اللاتينية',
        'mode_tooltip': 'تغيير وضع الكتابة بالحروف اللاتينية',
        'arabic_to_latin': 'عربي إلى لاتيني',
        'latin_to_arabic': 'لاتيني إلى عربي',
        'status_ar_to_en': 'عربي ← إنجليزي',
        'status_en_to_ar': 'إنجليزي ← عربي',
        'status_inactive': 'غير نشط'
      },
      
      // Common
      'loading': 'جاري التحميل...',
      'error': 'خطأ',
      'success': 'نجح',
      'cancel': 'إلغاء',
      'save': 'حفظ',
      'edit': 'تحرير',
      'delete': 'حذف',
      'confirm': 'تأكيد',
      'yes': 'نعم',
      'no': 'لا',
      'submit': 'إرسال',
      'close': 'إغلاق',
      'add': 'إضافة',
      'update': 'تحديث',
      'remove': 'إزالة',
      'back': 'رجوع',
      'next': 'التالي',
      'previous': 'السابق',
      'finish': 'إنهاء',
      'continue': 'متابعة',
      'search': 'بحث',
      'filter': 'تصفية',
      'sort': 'ترتيب',
      'all': 'الكل',
      'none': 'لا شيء',
      'select': 'اختيار',
      'clear': 'مسح',
      'reset': 'إعادة تعيين',
      'refresh': 'تحديث',
      'view': 'عرض',
      'details': 'التفاصيل',
      'settings': 'الإعدادات',
      'profile': 'الملف الشخصي',
      'help': 'مساعدة',
      'about': 'حول',
      'contact': 'اتصال',
      'privacy': 'الخصوصية',
      'terms': 'الشروط',
      
      // Trial Status
      'free_trial_active': 'النسخة التجريبية المجانية نشطة',
      'days_remaining': 'أيام متبقية',
      'day_remaining': 'يوم متبقي',
      'upgrade_now': 'ترقية الآن',
      'view_plans': 'عرض الخطط',
      'usage_limits': 'الاستخدام والحدود',
      'trial_ending_soon': 'النسخة التجريبية تنتهي قريباً',
      'trial_expired': 'انتهت النسخة التجريبية',
      'premium_account': 'حساب مميز',
      'unlimited_storage': 'مساحة تخزين وخدمات غير محدودة',
      'premium_support': 'دعم عملاء أولوية',
      'percentage_used': 'مستخدم',
      'near_limit': 'أنت تقترب من حدك',
      
      // Logo Upload System (Arabic)
      logo_upload: {
        'upload_logo': 'رفع شعار الشركة',
        'drag_drop': 'اسحب وأفلت شعارك هنا',
        'browse': 'تصفح الملفات',
        'invalid_image_type': 'يرجى اختيار ملف صورة صالح',
        'file_too_large': 'الملف كبير جداً. الحد الأقصى 5 ميجابايت.',
        'logo_uploaded_successfully': 'تم رفع الشعار بنجاح!',
        'logo_upload_failed': 'فشل رفع الشعار. يرجى المحاولة مرة أخرى.',
        'logo_processing_failed': 'فشل معالجة الشعار. يرجى المحاولة مرة أخرى.',
        'company_logo_placeholder': 'شعار الشركة'
      },
      
      // Account Selection System (Arabic)
      account_selection: {
        'title': 'اختر نوع حسابك',
        'subtitle': 'اختر الخطة التي تناسب احتياجاتك لإدارة العقارات',
        'loading': 'جاري تحميل خيارات الحساب...',
        'individual': 'مجمع فردي',
        'enterprise': 'شركة مؤسسية',
        'popular': 'الأكثر شعبية',
        'per_unit_month': '/وحدة/شهر',
        'additional_compounds': 'مجمعات إضافية',
        'free_trial': 'نسخة تجريبية مجانية',
        'features_included': 'الميزات المتضمنة',
        'get_started': 'ابدأ الآن',
        'selecting': 'جاري الاختيار...',
        'need_help': 'تحتاج مساعدة في الاختيار؟',
        'contact_support': 'اتصل بالدعم'
      },
      
      // Common (Arabic)
      'back_to_login': 'العودة لتسجيل الدخول',
    }
  },
  fr: {
    translation: {
      // Authentication
      'welcome_back': 'Bienvenue dans votre résidence',
      'join_community': 'Rejoignez votre communauté résidentielle',
      'sign_in': 'Se connecter',
      'sign_up': 'Créer un compte',
      'username': "Nom d'utilisateur",
      'password': 'Mot de passe',
      'confirm_password': 'Confirmer le mot de passe',
      'email': 'Adresse e-mail',
      'full_name': 'Nom complet',
      'phone': 'Numéro de téléphone',
      'role': 'Rôle',
      'compound_id': 'ID de la résidence',
      'unit_number': 'Numéro d\'unité',
      'signing_in': 'Connexion en cours...',
      'creating_account': 'Création du compte...',
      'already_have_account': 'Vous avez déjà un compte ?',
      'dont_have_account': "Vous n'avez pas de compte ?",
      'register_here': 'Inscrivez-vous ici',
      'sign_in_here': 'Connectez-vous ici',
      
      // Roles
      'admin': 'Administrateur',
      'resident': 'Résident',
      
      // Navigation
      'dashboard': 'Tableau de bord',
      'compound_management': 'Gestion de la résidence',
      'family_management': 'Gestion des familles',
      'financial_management': 'Gestion financière',
      'message_center': 'Centre de messages',
      'notifications_nav': 'Notifications',
      'sign_out': 'Se déconnecter',
      'services_management': 'Gestion des services',
      'maintenance_system': 'Système de maintenance',
      'guest_management': 'Gestion des invités',
      'events_announcements': 'Événements et annonces',
      'advanced_analytics': 'Analyses avancées',
      'document_management': 'Gestion des documents',
      'voting_system': 'Système de vote',
      'smart_home': 'Maison intelligente',
      'government_utility_gateway': 'Passerelle gouvernementale et services',
      'community_newsletter': 'Bulletin communautaire',
      
      // Dashboard
      'welcome_back_name': 'Bienvenue, {{name}}',
      'welcome_home_name': 'Bon retour, {{name}}',
      'dashboard_welcome_subtitle': "Voici ce qui se passe dans votre résidence aujourd'hui",
      'happening_today': "Voici ce qui se passe dans {{compound}} aujourd'hui.",
      'everything_manage': 'Tout ce dont vous avez besoin pour gérer votre maison',
      'total_residents': 'Total des résidents',
      'total_families': 'Total des familles',
      'total_services': 'Total des services',
      'open_messages': 'Messages ouverts',
      'recent_activity': 'Activité récente',
      'no_recent_activity': 'Aucune activité récente',
      'quick_actions': 'Actions rapides',
      'current_time': 'Heure actuelle',
      
      // Common
      'loading': 'Chargement...',
      'error': 'Erreur',
      'success': 'Succès',
      'cancel': 'Annuler',
      'save': 'Sauvegarder',
      'edit': 'Modifier',
      'delete': 'Supprimer',
      'confirm': 'Confirmer',
      'yes': 'Oui',
      'no': 'Non',
      'submit': 'Soumettre',
      'close': 'Fermer',
      'add': 'Ajouter',
      'update': 'Mettre à jour',
      'remove': 'Retirer',
      'back': 'Retour',
      'next': 'Suivant',
      'previous': 'Précédent',
      'finish': 'Terminer',
      'continue': 'Continuer',
      'search': 'Rechercher',
      'filter': 'Filtrer',
      'sort': 'Trier',
      'all': 'Tout',
      'none': 'Aucun',
      'select': 'Sélectionner',
      'clear': 'Effacer',
      'reset': 'Réinitialiser',
      'refresh': 'Actualiser',
      'view': 'Voir',
      'details': 'Détails',
      'settings': 'Paramètres',
      'profile': 'Profil',
      'help': 'Aide',
      'about': 'À propos',
      'contact': 'Contact',
      'privacy': 'Confidentialité',
      'terms': 'Conditions',
      
      // Trial Status
      'free_trial_active': 'Essai gratuit actif',
      'days_remaining': 'jours restants',
      'day_remaining': 'jour restant',
      'upgrade_now': 'Mettre à niveau maintenant',
      'view_plans': 'Voir les plans',
      'usage_limits': 'Utilisation et limites',
      'trial_ending_soon': 'L\'essai se termine bientôt',
      'trial_expired': 'Essai expiré',
      'premium_account': 'Compte premium',
      'unlimited_storage': 'Stockage et services illimités',
      'premium_support': 'Support client prioritaire',
      'percentage_used': 'utilisé',
      'near_limit': 'Vous approchez de votre limite',
      
      // Logo Upload System (French)
      logo_upload: {
        'upload_logo': 'Télécharger le logo de l\'entreprise',
        'drag_drop': 'Glissez-déposez votre logo ici',
        'browse': 'Parcourir les fichiers',
        'invalid_image_type': 'Veuillez sélectionner un fichier image valide',
        'file_too_large': 'Fichier trop volumineux. Maximum 5 MB autorisé.',
        'logo_uploaded_successfully': 'Logo téléchargé avec succès!',
        'logo_upload_failed': 'Échec du téléchargement du logo. Veuillez réessayer.',
        'logo_processing_failed': 'Échec du traitement du logo. Veuillez réessayer.'
      },
      
      // Account Selection System (French)
      account_selection: {
        'title': 'Choisissez Votre Type de Compte',
        'subtitle': 'Sélectionnez le plan qui convient le mieux à vos besoins de gestion immobilière',
        'loading': 'Chargement des options de compte...',
        'individual': 'Complexe Individuel',
        'enterprise': 'Entreprise',
        'popular': 'Choix Populaire',
        'per_unit_month': '/unité/mois',
        'additional_compounds': 'Complexes supplémentaires',
        'free_trial': 'Essai Gratuit',
        'features_included': 'Fonctionnalités Incluses',
        'get_started': 'Commencer',
        'selecting': 'Sélection...',
        'need_help': 'Besoin d\'aide pour choisir?',
        'contact_support': 'Contacter le Support'
      },
      
      // Common (French)
      'back_to_login': 'Retour à la Connexion',
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    
    interpolation: {
      escapeValue: false
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    }
  });

export default i18n;