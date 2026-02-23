import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import PushNotifications from './PushNotifications';
import {
  Cog6ToothIcon,
  UserIcon,
  BellIcon,
  LanguageIcon,
  ShieldCheckIcon,
  KeyIcon,
  FingerPrintIcon,
  UserGroupIcon,
  UserPlusIcon,
  HomeModernIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

// Import settings components
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(null);

  const settingsCategories = [
    {
      id: 'account',
      title: t('account_settings', 'إعدادات الحساب'),
      items: [
        {
          id: 'profile',
          name: t('settings_profile', 'الملف الشخصي'),
          description: t('profile_desc', 'تعديل معلوماتك الشخصية وصورتك'),
          icon: UserIcon,
          color: 'bg-blue-500',
          lightColor: 'bg-blue-50 dark:bg-blue-900/20',
          textColor: 'text-blue-600 dark:text-blue-400'
        },
        {
          id: 'privacy',
          name: t('settings_privacy', 'الخصوصية'),
          description: t('privacy_desc', 'التحكم في من يرى معلوماتك'),
          icon: ShieldCheckIcon,
          color: 'bg-purple-500',
          lightColor: 'bg-purple-50 dark:bg-purple-900/20',
          textColor: 'text-purple-600 dark:text-purple-400'
        },
        {
          id: 'biometric',
          name: t('biometric_settings', 'إعدادات البصمة'),
          description: t('biometric_desc', 'تسجيل الدخول بالبصمة أو الوجه'),
          icon: FingerPrintIcon,
          color: 'bg-emerald-500',
          lightColor: 'bg-emerald-50 dark:bg-emerald-900/20',
          textColor: 'text-emerald-600 dark:text-emerald-400'
        }
      ]
    },
    {
      id: 'preferences',
      title: t('preferences', 'التفضيلات'),
      items: [
        {
          id: 'notifications',
          name: t('settings_notifications', 'الإشعارات'),
          description: t('notifications_desc', 'إدارة إشعارات التطبيق'),
          icon: BellIcon,
          color: 'bg-amber-500',
          lightColor: 'bg-amber-50 dark:bg-amber-900/20',
          textColor: 'text-amber-600 dark:text-amber-400'
        },
        {
          id: 'language',
          name: t('settings_language', 'اللغة'),
          description: t('language_desc', 'اختيار لغة التطبيق'),
          icon: LanguageIcon,
          color: 'bg-cyan-500',
          lightColor: 'bg-cyan-50 dark:bg-cyan-900/20',
          textColor: 'text-cyan-600 dark:text-cyan-400'
        }
      ]
    },
    {
      id: 'admin',
      title: t('admin_settings', 'إعدادات المدير'),
      items: [
        {
          id: 'overview',
          name: t('overview', 'نظرة عامة'),
          description: t('overview_desc', 'إحصائيات ومعلومات المجمع'),
          icon: Cog6ToothIcon,
          color: 'bg-indigo-500',
          lightColor: 'bg-indigo-50 dark:bg-indigo-900/20',
          textColor: 'text-indigo-600 dark:text-indigo-400'
        },
        {
          id: 'residences',
          name: t('residences_list', 'قائمة الإقامات'),
          description: t('residences_desc', 'عرض وإدارة الوحدات السكنية'),
          icon: HomeModernIcon,
          color: 'bg-teal-500',
          lightColor: 'bg-teal-50 dark:bg-teal-900/20',
          textColor: 'text-teal-600 dark:text-teal-400',
          badge: '1'
        },
        {
          id: 'user_management',
          name: t('user_management', 'إدارة المستخدمين'),
          description: t('user_management_desc', 'إدارة جميع المستخدمين'),
          icon: UserGroupIcon,
          color: 'bg-orange-500',
          lightColor: 'bg-orange-50 dark:bg-orange-900/20',
          textColor: 'text-orange-600 dark:text-orange-400'
        },
        {
          id: 'add_admin',
          name: t('add_admin', 'إضافة مدير'),
          description: t('add_admin_desc', 'إضافة مدير جديد للمجمع'),
          icon: UserPlusIcon,
          color: 'bg-rose-500',
          lightColor: 'bg-rose-50 dark:bg-rose-900/20',
          textColor: 'text-rose-600 dark:text-rose-400'
        },
        {
          id: 'registration_links',
          name: t('registration_links', 'روابط التسجيل'),
          description: t('registration_links_desc', 'إنشاء روابط دعوة للسكان'),
          icon: KeyIcon,
          color: 'bg-pink-500',
          lightColor: 'bg-pink-50 dark:bg-pink-900/20',
          textColor: 'text-pink-600 dark:text-pink-400',
          badge: '0'
        }
      ]
    }
  ];

  // Get active item data
  const getActiveItemData = () => {
    for (const category of settingsCategories) {
      const item = category.items.find(i => i.id === activeTab);
      if (item) return item;
    }
    return null;
  };

  const activeItemData = getActiveItemData();

  // Render content based on active tab
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
        return null;
    }
  };

  // Main settings list view
  if (!activeTab) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-400 rtl:rotate-180" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('settings_title', 'الإعدادات')}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t('settings_subtitle', 'إدارة حسابك وتفضيلاتك')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings List */}
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
          {settingsCategories.map((category) => (
            <div key={category.id} className="space-y-3">
              {/* Category Title */}
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                {category.title}
              </h2>
              
              {/* Category Items */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                {category.items.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.id}
                      data-testid={`settings-item-${item.id}`}
                      onClick={() => setActiveTab(item.id)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 group"
                    >
                      {/* Icon */}
                      <div className={`${item.lightColor} p-3 rounded-xl transition-transform duration-200 group-hover:scale-110`}>
                        <IconComponent className={`w-6 h-6 ${item.textColor}`} />
                      </div>
                      
                      {/* Text */}
                      <div className="flex-1 text-start">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {item.name}
                          </h3>
                          {item.badge && (
                            <span className={`${item.color} text-white text-xs px-2 py-0.5 rounded-full`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                      
                      {/* Arrow */}
                      <ChevronRightIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 rtl:rotate-180 transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* App Info */}
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
              <SparklesIcon className="w-4 h-4" />
              <span>HomeMe v2.0</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Detail view for selected setting
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with back button */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab(null)}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-400 rtl:rotate-180" />
            </button>
            
            {activeItemData && (
              <div className="flex items-center gap-3">
                <div className={`${activeItemData.lightColor} p-2.5 rounded-xl`}>
                  <activeItemData.icon className={`w-5 h-5 ${activeItemData.textColor}`} />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                    {activeItemData.name}
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activeItemData.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default Settings;
