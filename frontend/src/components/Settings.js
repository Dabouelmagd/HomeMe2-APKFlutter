import React, { useState } from 'react';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import PushNotifications from './PushNotifications';
import {
  BellIcon,
  UserIcon,
  CogIcon,
  LanguageIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const Settings = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('notifications');

  const tabs = [
    {
      id: 'notifications',
      name: t('settings.notifications'),
      icon: BellIcon,
      component: PushNotifications
    },
    {
      id: 'profile',
      name: t('settings.profile'),
      icon: UserIcon,
      component: () => <div className="p-4">Profile settings coming soon...</div>
    },
    {
      id: 'privacy',
      name: t('settings.privacy'),
      icon: ShieldCheckIcon,
      component: () => <div className="p-4">Privacy settings coming soon...</div>
    },
    {
      id: 'language',
      name: t('settings.language'),
      icon: LanguageIcon,
      component: () => <div className="p-4">Language settings coming soon...</div>
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || (() => null);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{t('settings.settings')}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {t('settings.manageYourPreferences')}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;