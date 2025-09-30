import 'dart:async';
import 'package:flutter/material.dart';

class AppLocalizations {
  final Locale locale;

  AppLocalizations(this.locale);

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  static final Map<String, Map<String, String>> _localizedValues = {
    'en': {
      'welcome_back': 'Welcome back',
      'sign_in': 'Sign In',
      'sign_out': 'Sign Out',
      'email': 'Email',
      'password': 'Password',
      'login': 'Login',
      'register': 'Register',
      'dashboard': 'Dashboard',
      'guests': 'Guests',
      'maintenance': 'Maintenance',
      'events': 'Events',
      'settings': 'Settings',
      'profile': 'Profile',
      'notifications': 'Notifications',
      'total_residents': 'Total Residents',
      'total_families': 'Total Families',
      'active_visitors': 'Active Visitors',
      'open_messages': 'Open Messages',
      'guest_management': 'Guest Management',
      'community_events': 'Community Events',
      'quick_actions': 'Quick Actions',
      'recent_activity': 'Recent Activity',
      'no_recent_activity': 'No recent activity',
      'current_time': 'Current Time',
      'home': 'Home',
      'sign_in_to_account': 'Sign in to your HomeMe account',
      'please_enter_email': 'Please enter your email',
      'please_enter_valid_email': 'Please enter a valid email',
      'please_enter_password': 'Please enter your password',
      'password_min_length': 'Password must be at least 6 characters',
    },
    'ar': {
      'welcome_back': 'مرحباً بعودتك',
      'sign_in': 'تسجيل الدخول',
      'sign_out': 'تسجيل الخروج',
      'email': 'البريد الإلكتروني',
      'password': 'كلمة المرور',
      'login': 'دخول',
      'register': 'تسجيل',
      'dashboard': 'لوحة التحكم',
      'guests': 'الضيوف',
      'maintenance': 'الصيانة',
      'events': 'الفعاليات',
      'settings': 'الإعدادات',
      'profile': 'الملف الشخصي',
      'notifications': 'الإشعارات',
      'total_residents': 'إجمالي المقيمين',
      'total_families': 'إجمالي الأسر',
      'active_visitors': 'الزوار النشطون',
      'open_messages': 'الرسائل المفتوحة',
      'guest_management': 'إدارة الضيوف',
      'community_events': 'فعاليات المجتمع',
      'quick_actions': 'إجراءات سريعة',
      'recent_activity': 'النشاط الحديث',
      'no_recent_activity': 'لا يوجد نشاط حديث',
      'current_time': 'الوقت الحالي',
      'home': 'المنزل',
    },
    'fr': {
      'welcome_back': 'Bon retour',
      'sign_in': 'Se connecter',
      'sign_out': 'Se déconnecter',
      'email': 'E-mail',
      'password': 'Mot de passe',
      'login': 'Connexion',
      'register': 'S\'inscrire',
      'dashboard': 'Tableau de bord',
      'guests': 'Invités',
      'maintenance': 'Maintenance',
      'events': 'Événements',
      'settings': 'Paramètres',
      'profile': 'Profil',
      'notifications': 'Notifications',
      'total_residents': 'Total des résidents',
      'total_families': 'Total des familles',
      'active_visitors': 'Visiteurs actifs',
      'open_messages': 'Messages ouverts',
      'guest_management': 'Gestion des invités',
      'community_events': 'Événements communautaires',
      'quick_actions': 'Actions rapides',
      'recent_activity': 'Activité récente',
      'no_recent_activity': 'Aucune activité récente',
      'current_time': 'Heure actuelle',
      'home': 'Accueil',
    },
  };

  String translate(String key) {
    return _localizedValues[locale.languageCode]?[key] ?? key;
  }

  // Common getters
  String get welcomeBack => translate('welcome_back');
  String get signIn => translate('sign_in');
  String get signOut => translate('sign_out');
  String get email => translate('email');
  String get password => translate('password');
  String get login => translate('login');
  String get register => translate('register');
  String get dashboard => translate('dashboard');
  String get guests => translate('guests');
  String get maintenance => translate('maintenance');
  String get events => translate('events');
  String get settings => translate('settings');
  String get profile => translate('profile');
  String get notifications => translate('notifications');
  String get totalResidents => translate('total_residents');
  String get totalFamilies => translate('total_families');
  String get activeVisitors => translate('active_visitors');
  String get openMessages => translate('open_messages');
  String get guestManagement => translate('guest_management');
  String get communityEvents => translate('community_events');
  String get quickActions => translate('quick_actions');
  String get recentActivity => translate('recent_activity');
  String get noRecentActivity => translate('no_recent_activity');
  String get currentTime => translate('current_time');
  String get home => translate('home');
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['en', 'ar', 'fr'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) {
    return Future.value(AppLocalizations(locale));
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}