import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PushNotifications from './PushNotifications';
import {
  BellIcon,
  UserIcon,
  CogIcon,
  LanguageIcon,
  ShieldCheckIcon,
  KeyIcon,
  TrashIcon,
  CheckIcon,
  FingerPrintIcon
} from '@heroicons/react/24/outline';

// Import settings components from the settings folder
import {
  BiometricSettings,
  ProfileSettings,
  PrivacySettings,
  LanguageSettings,
  OverviewSettings,
  ResidencesSettings,
  RegistrationLinksSettings,
  UserManagementSettings,
  AddAdminSettings
} from './settings';

const Settings = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    {
      id: 'overview',
      name: t('overview', 'نظرة عامة'),
      icon: CogIcon,
      color: 'from-blue-600 to-indigo-600',
      bgColor: 'from-blue-50 to-indigo-50',
      accent: 'bg-blue-500'
    },
    {
      id: 'residences',
      name: t('residences_list', 'قائمة الإقامات'),
      icon: UserIcon,
      badge: '1',
      color: 'from-green-600 to-emerald-600',
      bgColor: 'from-green-50 to-emerald-50',
      accent: 'bg-green-500'
    },
    {
      id: 'registration_links',
      name: t('registration_links', 'روابط التسجيل'),
      icon: KeyIcon,
      badge: '0',
      color: 'from-purple-600 to-pink-600',
      bgColor: 'from-purple-50 to-pink-50',
      accent: 'bg-purple-500'
    },
    {
      id: 'user_management',
      name: t('user_management', 'إدارة المستخدمين'),
      icon: UserIcon,
      color: 'from-orange-600 to-red-600',
      bgColor: 'from-orange-50 to-red-50',
      accent: 'bg-orange-500'
    },
    {
      id: 'add_admin',
      name: t('add_admin', 'إضافة مدير'),
      icon: ShieldCheckIcon,
      color: 'from-red-600 to-pink-600',
      bgColor: 'from-red-50 to-pink-50',
      accent: 'bg-red-500'
    },
    {
      id: 'notifications',
      name: t('settings_notifications', 'الإشعارات'),
      icon: BellIcon,
      color: 'from-cyan-600 to-blue-600',
      bgColor: 'from-cyan-50 to-blue-50',
      accent: 'bg-cyan-500'
    },
    {
      id: 'profile',
      name: t('settings_profile', 'الملف الشخصي'),
      icon: UserIcon,
      color: 'from-emerald-600 to-teal-600',
      bgColor: 'from-emerald-50 to-teal-50',
      accent: 'bg-emerald-500'
    },
    {
      id: 'privacy',
      name: t('settings_privacy', 'الخصوصية'),
      icon: ShieldCheckIcon,
      color: 'from-violet-600 to-purple-600',
      bgColor: 'from-violet-50 to-purple-50',
      accent: 'bg-violet-500'
    },
    {
      id: 'biometric',
      name: t('biometric_settings', 'إعدادات البصمة'),
      icon: FingerPrintIcon,
      color: 'from-green-600 to-emerald-600',
      bgColor: 'from-green-50 to-emerald-50',
      accent: 'bg-green-500'
    },
    {
      id: 'language',
      name: t('settings_language', 'اللغة'),
      icon: LanguageIcon,
      color: 'from-amber-600 to-orange-600',
      bgColor: 'from-amber-50 to-orange-50',
      accent: 'bg-amber-500'
    }
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  // Render the appropriate component based on activeTab
  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewSettings />;
      case 'residences':
        return <ResidencesSettings />;
      case 'registration_links':
        return <RegistrationLinksSettings />;
      case 'user_management':
        return <UserManagementSettings />;
      case 'add_admin':
        return <AddAdminSettings />;
      case 'notifications':
        return <PushNotifications />;
      case 'profile':
        return <ProfileSettings />;
      case 'privacy':
        return <PrivacySettings />;
      case 'biometric':
        return <BiometricSettings />;
      case 'language':
        return <LanguageSettings />;
      default:
        return <OverviewSettings />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 shadow-2xl">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-4 rounded-2xl shadow-xl relative">
                <CogIcon className="h-12 w-12 text-white" />
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[1.5rem] h-6 flex items-center justify-center animate-pulse">
                  4
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              {t('settings_title')}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              {t('manage_account_settings_preferences')}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            <button className="group px-6 py-3 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 rtl:space-x-reverse bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl hover:shadow-2xl transform hover:scale-105">
              <CheckIcon className="h-5 w-5" />
              <span>{t('save_all_changes')}</span>
            </button>
            
            <button className="group px-6 py-3 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 rtl:space-x-reverse bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-gray-600">
              <TrashIcon className="h-5 w-5" />
              <span>{t('reset_to_defaults')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Category Cards */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">{t('settings_categories')}</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tabs.map((tab, index) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              const colors = [
                'from-blue-500 to-cyan-500',
                'from-emerald-500 to-teal-500', 
                'from-purple-500 to-pink-500',
                'from-orange-500 to-red-500'
              ];
              return (
                <button
                  key={tab.id}
                  data-testid={`settings-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-6 rounded-2xl text-center transition-all duration-300 transform hover:scale-105 hover:shadow-lg relative overflow-hidden ${
                    isActive
                      ? `bg-gradient-to-br ${colors[index % colors.length]} text-white shadow-2xl`
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border-2 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {/* Background Pattern */}
                  <div className={`absolute inset-0 opacity-10 ${isActive ? 'bg-white' : 'bg-gray-300'}`}>
                    <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-current"></div>
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-current"></div>
                  </div>
                  
                  <div className="relative z-10">
                    <div className={`mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center ${
                      isActive ? 'bg-white/20' : `bg-gradient-to-br ${tab.bgColor}`
                    }`}>
                      <IconComponent className={`h-8 w-8 ${isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                    </div>
                    <div className="text-sm font-bold mb-2">
                      {tab.name}
                      {tab.badge && (
                        <span className={`ml-2 rtl:mr-2 rtl:ml-0 inline-block ${isActive ? 'bg-white text-gray-700' : 'bg-blue-500 text-white'} text-xs px-2 py-1 rounded-full`}>
                          {tab.badge}
                        </span>
                      )}
                    </div>
                    <div className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                      {tab.id === 'overview' && t('view_compound_overview', 'عرض نظرة عامة على المجمع')}
                      {tab.id === 'residences' && t('manage_residences', 'إدارة الإقامات')}
                      {tab.id === 'registration_links' && t('create_registration_links', 'إنشاء روابط التسجيل')}
                      {tab.id === 'user_management' && t('manage_all_users', 'إدارة جميع المستخدمين')}
                      {tab.id === 'add_admin' && t('add_new_admin', 'إضافة مدير جديد')}
                      {tab.id === 'notifications' && t('manage_notifications_desc', 'إدارة الإشعارات')}
                      {tab.id === 'profile' && t('update_profile_desc', 'تحديث الملف الشخصي')}
                      {tab.id === 'privacy' && t('control_privacy_desc', 'التحكم في الخصوصية')}
                      {tab.id === 'biometric' && t('biometric_settings_desc', 'تفعيل الدخول بالبصمة')}
                      {tab.id === 'language' && t('choose_language_desc', 'اختيار اللغة')}
                    </div>
                    
                    {isActive && (
                      <div className="absolute -top-2 -right-2 bg-white text-gray-700 w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
                        <CheckIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: t('active_sessions'), value: '3', icon: '🔐', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
              { label: t('notifications_enabled'), value: '12', icon: '🔔', color: 'bg-gradient-to-r from-emerald-500 to-teal-500' },
              { label: t('privacy_level'), value: t('privacy_level_high'), icon: '🛡️', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
              { label: t('languages_available'), value: '3', icon: '🌍', color: 'bg-gradient-to-r from-orange-500 to-red-500' }
            ].map((stat, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className={`${stat.color} rounded-xl p-3 w-fit mb-4`}>
                  <span className="text-2xl">{stat.icon}</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Content Header with gradient */}
            <div className={`bg-gradient-to-r ${activeTabData?.color || 'from-indigo-600 to-purple-600'} p-8 text-center`}>
              <div className={`bg-gradient-to-br ${activeTabData?.bgColor || 'from-indigo-100 to-purple-100'} rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center`}>
                {activeTabData && <activeTabData.icon className="h-12 w-12 text-gray-600" />}
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                {activeTabData?.name}
              </h2>
              <p className="text-white/90 text-lg leading-relaxed max-w-2xl mx-auto">
                {activeTab === 'overview' && t('compound_overview_description', 'عرض معلومات شاملة عن المجمع السكني')}
                {activeTab === 'residences' && t('residences_description', 'إدارة وعرض جميع الإقامات في المجمع')}
                {activeTab === 'registration_links' && t('registration_links_description', 'إنشاء روابط تسجيل للسكان الجدد')}
                {activeTab === 'user_management' && t('user_management_description', 'إدارة جميع مستخدمي المجمع')}
                {activeTab === 'add_admin' && t('add_admin_description', 'إضافة مدير جديد إلى المجمع')}
                {activeTab === 'notifications' && t('notification_settings_description', 'إدارة إعدادات الإشعارات')}
                {activeTab === 'profile' && t('profile_settings_description', 'تحديث معلومات الملف الشخصي')}
                {activeTab === 'privacy' && t('privacy_settings_description', 'التحكم في إعدادات الخصوصية')}
                {activeTab === 'biometric' && t('biometric_settings_description', 'تفعيل الدخول بالبصمة أو بصمة الوجه')}
                {activeTab === 'language' && t('language_settings_description', 'اختيار لغة التطبيق')}
              </p>
            </div>
            
            {/* Content Body */}
            <div className="p-8">
              {renderContent()}
            </div>
          </div>

          {/* Features Grid */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">{t('settings_features')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800">
                <div className="text-4xl mb-4">🔒</div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">{t('advanced_security')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('advanced_security_desc')}</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800">
                <div className="text-4xl mb-4">⚡</div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">{t('instant_sync')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('instant_sync_desc')}</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-100 dark:border-purple-800">
                <div className="text-4xl mb-4">🌍</div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">{t('multilingual')}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('multilingual_desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
