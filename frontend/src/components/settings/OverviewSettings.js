import React from 'react';
import { useAuth } from '../../App';
import { useTranslation } from 'react-i18next';
import { UserIcon, CogIcon, CheckIcon } from '@heroicons/react/24/outline';

const OverviewSettings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl shadow-lg border border-blue-200 dark:border-blue-800 p-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <CogIcon className="h-8 w-8 text-blue-600" />
          {t('compound_overview', 'نظرة عامة على المجمع')}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{t('total_residents', 'إجمالي السكان')}</h3>
              <UserIcon className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-4xl font-bold text-blue-600">125</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('active_residents', 'ساكن نشط')}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{t('total_units', 'إجمالي الوحدات')}</h3>
              <CogIcon className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-4xl font-bold text-green-600">80</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('residential_units', 'وحدة سكنية')}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{t('active_services', 'الخدمات النشطة')}</h3>
              <CheckIcon className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-4xl font-bold text-purple-600">12</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('services_available', 'خدمة متاحة')}</p>
          </div>
        </div>

        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{t('compound_information', 'معلومات المجمع')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('compound_name', 'اسم المجمع')}</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">{user?.compound_name || 'Green Valley Compound'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin_name', 'اسم المدير')}</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">{user?.full_name || 'Admin User'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('subscription_plan', 'خطة الاشتراك')}</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">{t('professional_plan', 'المحترف')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('subscription_expiry', 'تاريخ انتهاء الاشتراك')}</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">2025-12-31</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewSettings;
