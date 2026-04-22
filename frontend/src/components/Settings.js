import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  // Persist active tab in URL so page refresh keeps user on the same screen
  const activeTab = searchParams.get('tab') || null;

  const setActiveTab = (tab) => {
    if (tab) {
      setSearchParams({ tab }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  // Navigate directly to the dashboard on the back button instead of browser history,
  // to avoid jumping to the previously-visited sidebar page
  const goBackHome = () => {
    navigate('/app/dashboard');
  };

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
        {/* Header — Owner theme (dark gradient with rose accents) */}
        <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-rose-950 to-gray-900 text-white shadow-xl">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(244,63,94,0.4), transparent 50%), radial-gradient(circle at 80% 50%, rgba(168,85,247,0.3), transparent 50%)' }}></div>
          <div className="relative max-w-5xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
                  <Cog6ToothIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-rose-300 text-xs font-medium tracking-wider mb-1">{t('settings_badge', 'إعدادات الحساب والنظام')}</p>
                  <h1 className="text-3xl font-bold">{t('settings_title', 'الإعدادات')}</h1>
                  <p className="text-sm text-gray-300 mt-1">{t('settings_subtitle', 'إدارة حسابك وتفضيلاتك')}</p>
                </div>
              </div>
              <button 
                onClick={goBackHome}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-colors text-sm font-semibold backdrop-blur-sm"
                data-testid="settings-back-btn"
              >
                <ArrowLeftIcon className="w-4 h-4 rtl:rotate-180" />
                {t('back', 'رجوع')}
              </button>
            </div>
          </div>
        </div>

        {/* Settings List */}
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
          {settingsCategories.map((category) => (
            <div key={category.id} className="space-y-3">
              {/* Category Title — Owner theme */}
              <div className="flex items-center gap-2 px-1">
                <div className="w-1 h-5 bg-gradient-to-b from-rose-500 to-pink-600 rounded-full"></div>
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 tracking-wide">
                  {category.title}
                </h2>
              </div>
              
              {/* Category Items — Grid of cards matching Owner dashboard style */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {category.items.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.id}
                      data-testid={`settings-item-${item.id}`}
                      onClick={() => setActiveTab(item.id)}
                      className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm hover:shadow-lg hover:border-rose-200 dark:hover:border-rose-800 transition-all duration-200 text-start"
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className={`${item.lightColor} p-3 rounded-xl transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3 flex-shrink-0`}>
                          <IconComponent className={`w-6 h-6 ${item.textColor}`} />
                        </div>
                        
                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-gray-900 dark:text-white">
                              {item.name}
                            </h3>
                            {item.badge && (
                              <span className={`${item.color} text-white text-[10px] px-2 py-0.5 rounded-full font-bold`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                        
                        {/* Arrow with rose tint on hover */}
                        <ChevronRightIcon className="w-5 h-5 text-gray-300 dark:text-gray-600 rtl:rotate-180 transition-all duration-200 group-hover:text-rose-500 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* App Info — Owner style */}
          <div className="text-center py-8 border-t border-gray-200 dark:border-gray-700 mt-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-full text-rose-600 dark:text-rose-400 text-sm font-semibold">
              <SparklesIcon className="w-4 h-4" />
              <span>HomeMe v2.0 · Powered by DataLife AI</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Detail view for selected setting
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header — Owner theme */}
      <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-rose-950 to-gray-900 text-white shadow-xl sticky top-0 z-10">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(244,63,94,0.4), transparent 50%)' }}></div>
        <div className="relative max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab(null)}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-colors backdrop-blur-sm"
              data-testid="settings-detail-back"
            >
              <ArrowLeftIcon className="w-5 h-5 text-white rtl:rotate-180" />
            </button>
            
            {activeItemData && (
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-2.5 rounded-xl shadow-lg">
                  <activeItemData.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {activeItemData.name}
                  </h1>
                  <p className="text-xs text-rose-200">
                    {activeItemData.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default Settings;
