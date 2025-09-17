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
      'notifications': 'Notifications',
      'sign_out': 'Sign Out',
      
      // Dashboard
      'welcome_back_name': 'Welcome back, {{name}}',
      'welcome_home_name': 'Welcome home, {{name}}',
      'happening_today': "Here's what's happening in {{compound}} today.",
      'everything_manage': 'Everything you need to manage your home',
      'total_residents': 'Total Residents',
      'total_families': 'Total Families',
      'pending_payments': 'Pending Payments',
      'open_messages': 'Open Messages',
      'family_members': 'Family Members',
      'recent_messages': 'Recent Messages',
      'recent_payments': 'Recent Payments',
      'recent_notifications': 'Recent Notifications',
      'my_messages': 'My Messages',
      'quick_actions': 'Quick Actions',
      
      // Compound Management
      'manage_compound': 'Manage your compound settings and branding',
      'overview': 'Overview',
      'residence_list': 'Residence List',
      'settings': 'Settings',
      'compound_info': 'Compound Information',
      'admin_management': 'Admin Management',
      'manage_admins': 'Manage compound administrators',
      'add_admin': 'Add Admin',
      'primary_admin': 'Primary Admin',
      'no_additional_admins': 'No additional admins added',
      'help_manage': 'Add more admins to help manage the compound',
      'click_upload_logo': 'Click to upload logo',
      'compound_name': 'Compound Name',
      'address': 'Address',
      'save_changes': 'Save Changes',
      'cancel': 'Cancel',
      
      // Residence List
      'view_occupancy': 'View all residential units and their occupancy',
      'total_units': 'Total Units',
      'unit_number': 'Unit Number',
      'family_head': 'Family Head',
      'members': 'Members',
      'contact': 'Contact',
      'move_in_date': 'Move-in Date',
      'status': 'Status',
      'occupied': 'Occupied',
      'no_residences': 'No residences found',
      'residences_appear': 'Residences will appear here once families register in your compound.',
      
      // Common
      'loading': 'Loading...',
      'language': 'Language'
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
      'compound_id': 'رقم المجمع',
      'unit_number': 'رقم الوحدة',
      'signing_in': 'جاري تسجيل الدخول...',
      'creating_account': 'جاري إنشاء الحساب...',
      'already_have_account': 'هل لديك حساب بالفعل؟',
      'dont_have_account': 'ليس لديك حساب؟',
      'register_here': 'سجل هنا',
      'sign_in_here': 'سجل دخولك هنا',
      
      // Roles
      'admin': 'مدير',
      'resident': 'مقيم',
      
      // Navigation
      'dashboard': 'لوحة التحكم',
      'compound_management': 'إدارة المجمع',
      'family_management': 'إدارة الأسرة',
      'financial_management': 'الإدارة المالية',
      'message_center': 'مركز الرسائل',
      'notifications': 'الإشعارات',
      'sign_out': 'تسجيل الخروج',
      
      // Dashboard
      'welcome_back_name': 'مرحباً بعودتك، {{name}}',
      'welcome_home_name': 'أهلاً وسهلاً، {{name}}',
      'happening_today': 'إليك ما يحدث في {{compound}} اليوم.',
      'everything_manage': 'كل ما تحتاجه لإدارة منزلك',
      'total_residents': 'إجمالي المقيمين',
      'total_families': 'إجمالي الأسر',
      'pending_payments': 'المدفوعات المعلقة',
      'open_messages': 'الرسائل المفتوحة',
      'family_members': 'أفراد الأسرة',
      'recent_messages': 'الرسائل الأخيرة',
      'recent_payments': 'المدفوعات الأخيرة',
      'recent_notifications': 'الإشعارات الأخيرة',
      'my_messages': 'رسائلي',
      'quick_actions': 'إجراءات سريعة',
      
      // Compound Management
      'manage_compound': 'إدارة إعدادات وهوية مجمعك السكني',
      'overview': 'نظرة عامة',
      'residence_list': 'قائمة الوحدات السكنية',
      'settings': 'الإعدادات',
      'compound_info': 'معلومات المجمع',
      'admin_management': 'إدارة المديرين',
      'manage_admins': 'إدارة مديري المجمع',
      'add_admin': 'إضافة مدير',
      'primary_admin': 'المدير الرئيسي',
      'no_additional_admins': 'لم يتم إضافة مديرين إضافيين',
      'help_manage': 'أضف المزيد من المديرين للمساعدة في إدارة المجمع',
      'click_upload_logo': 'انقر لرفع الشعار',
      'compound_name': 'اسم المجمع',
      'address': 'العنوان',
      'save_changes': 'حفظ التغييرات',
      'cancel': 'إلغاء',
      
      // Residence List
      'view_occupancy': 'عرض جميع الوحدات السكنية وحالة إشغالها',
      'total_units': 'إجمالي الوحدات',
      'unit_number': 'رقم الوحدة',
      'family_head': 'رب الأسرة',
      'members': 'الأعضاء',
      'contact': 'الاتصال',
      'move_in_date': 'تاريخ الانتقال',
      'status': 'الحالة',
      'occupied': 'مشغولة',
      'no_residences': 'لا توجد وحدات سكنية',
      'residences_appear': 'ستظهر الوحدات السكنية هنا بمجرد تسجيل الأسر في مجمعك.',
      
      // Common
      'loading': 'جاري التحميل...',
      'language': 'اللغة'
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
      'family_management': 'Gestion familiale',
      'financial_management': 'Gestion financière',
      'message_center': 'Centre de messages',
      'notifications': 'Notifications',
      'sign_out': 'Se déconnecter',
      
      // Dashboard
      'welcome_back_name': 'Bon retour, {{name}}',
      'welcome_home_name': 'Bienvenue chez vous, {{name}}',
      'happening_today': 'Voici ce qui se passe dans {{compound}} aujourd\'hui.',
      'everything_manage': 'Tout ce dont vous avez besoin pour gérer votre domicile',
      'total_residents': 'Total des résidents',
      'total_families': 'Total des familles',
      'pending_payments': 'Paiements en attente',
      'open_messages': 'Messages ouverts',
      'family_members': 'Membres de la famille',
      'recent_messages': 'Messages récents',
      'recent_payments': 'Paiements récents',
      'recent_notifications': 'Notifications récentes',
      'my_messages': 'Mes messages',
      'quick_actions': 'Actions rapides',
      
      // Compound Management
      'manage_compound': 'Gérez les paramètres et l\'image de marque de votre résidence',
      'overview': 'Aperçu',
      'residence_list': 'Liste des résidences',
      'settings': 'Paramètres',
      'compound_info': 'Informations de la résidence',
      'admin_management': 'Gestion des administrateurs',
      'manage_admins': 'Gérer les administrateurs de la résidence',
      'add_admin': 'Ajouter un administrateur',
      'primary_admin': 'Administrateur principal',
      'no_additional_admins': 'Aucun administrateur supplémentaire ajouté',
      'help_manage': 'Ajoutez plus d\'administrateurs pour aider à gérer la résidence',
      'click_upload_logo': 'Cliquez pour télécharger le logo',
      'compound_name': 'Nom de la résidence',
      'address': 'Adresse',
      'save_changes': 'Enregistrer les modifications',
      'cancel': 'Annuler',
      
      // Residence List
      'view_occupancy': 'Voir toutes les unités résidentielles et leur occupation',
      'total_units': 'Total des unités',
      'unit_number': 'Numéro d\'unité',
      'family_head': 'Chef de famille',
      'members': 'Membres',
      'contact': 'Contact',
      'move_in_date': 'Date d\'emménagement',
      'status': 'Statut',
      'occupied': 'Occupé',
      'no_residences': 'Aucune résidence trouvée',
      'residences_appear': 'Les résidences apparaîtront ici une fois que les familles s\'inscriront dans votre complexe.',
      
      // Family Management
      'manage_household': 'Gérez les membres de votre famille et votre foyer',
      'add_member': 'Ajouter un membre',
      'add_family_member': 'Ajouter un membre de la famille',
      'member_count': '{{count}} membre',
      'member_count_plural': '{{count}} membres',
      'family_head': 'Chef de famille',
      'member': 'Membre',
      'no_family_members': 'Aucun membre de famille trouvé',
      'only_family_head': 'Seul le chef de famille peut ajouter des membres',
      
      // Financial Management
      'view_manage_payments': 'Voir et gérer vos paiements et factures',
      'pending': 'En attente',
      'paid': 'Payé',
      'overdue': 'En retard',
      'total_due': 'Total dû',
      'pending_payment_alert': 'Vous avez {{count}} paiement en attente',
      'pending_payment_alert_plural': 'Vous avez {{count}} paiements en attente',
      'total_amount_due': 'Montant total dû: {{amount}}€',
      'all_invoices': 'Toutes les factures',
      'description': 'Description',
      'amount': 'Montant',
      'due_date': 'Date d\'échéance',
      'actions': 'Actions',
      'pay_now': 'Payer maintenant',
      'processing': 'Traitement...',
      'no_invoices': 'Aucune facture trouvée',
      'no_invoices_moment': "Vous n'avez aucune facture pour le moment.",
      'payment_info': 'Informations de paiement',
      'mock_payment': 'Système de paiement fictif',
      'mock_payment_desc': 'Ceci est un système de paiement de démonstration. Tous les paiements sont simulés et aucun argent réel n\'est traité.',
      'payment_history': 'Historique des paiements',
      'payment_history_desc': 'Tous vos enregistrements de paiement sont stockés en sécurité et peuvent être consultés à tout moment depuis ce tableau de bord.',
      'all_payments_updated': 'Tous les paiements sont à jour !',
      
      // Message Center
      'communicate_with': 'Communiquer avec {{role}}',
      'management': 'la gestion',
      'residents': 'les résidents',
      'new_message': 'Nouveau message',
      'message_type': 'Type de message',
      'general_message': 'Message général',
      'maintenance_request': 'Demande de maintenance',
      'complaint': 'Plainte',
      'subject': 'Sujet',
      'message': 'Message',
      'send_message': 'Envoyer un message',
      'no_messages_yet': 'Aucun message pour le moment',
      'start_conversation': 'Commencer une conversation avec {{role}}',
      'send_first_message': 'Envoyez votre premier message',
      'enter_subject': 'Entrez le sujet du message',
      'enter_message': 'Entrez votre message ici...',
      'open': 'Ouvert',
      'resolved': 'Résolu',
      'in_progress': 'En cours',
      
      // Notifications
      'stay_updated': 'Restez informé des annonces et messages de la résidence',
      'send_notification': 'Envoyer une notification',
      'clear_all': 'Tout effacer',
      'recent_updates': 'Mises à jour récentes',
      'title': 'Titre',
      'recipients': 'Destinataires',
      'all_residents': 'Tous les résidents (Diffusion)',
      'specific_recipients': 'Destinataires spécifiques',
      'broadcast_desc': 'La diffusion envoie à tous les résidents de la résidence',
      'no_notifications': 'Aucune notification pour le moment',
      'compound_updates': 'Vous verrez les mises à jour et annonces de la résidence ici',
      'enter_title': 'Entrez le titre de la notification',
      'enter_notification': 'Entrez le message de notification...',
      'mark_read': 'Marquer comme lu',
      'read': 'Lu',
      'broadcast': 'Diffusion',
      'direct': 'Direct',
      
      // Common
      'loading': 'Chargement...',
      'error': 'Erreur',
      'success': 'Succès',
      'submit': 'Soumettre',
      'close': 'Fermer',
      'edit': 'Modifier',
      'delete': 'Supprimer',
      'view': 'Voir',
      'add': 'Ajouter',
      'remove': 'Supprimer',
      'update': 'Mettre à jour',
      'create': 'Créer',
      'search': 'Rechercher',
      'filter': 'Filtrer',
      'sort': 'Trier',
      'export': 'Exporter',
      'import': 'Importer',
      'print': 'Imprimer',
      'download': 'Télécharger',
      'upload': 'Télécharger',
      'next': 'Suivant',
      'previous': 'Précédent',
      'back': 'Retour',
      'continue': 'Continuer',
      'finish': 'Terminer',
      'home': 'Accueil',
      'profile': 'Profil',
      'help': 'Aide',
      'about': 'À propos',
      'contact': 'Contact',
      'privacy': 'Confidentialité',
      'terms': 'Conditions',
      'language': 'Langue',
      'theme': 'Thème'
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