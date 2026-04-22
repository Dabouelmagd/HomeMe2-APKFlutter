import React from 'react';
import { useAuth } from '../../App';
import { useTranslation } from 'react-i18next';
import { 
  UserGroupIcon, 
  HomeModernIcon, 
  WrenchScrewdriverIcon,
  CalendarDaysIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const OverviewSettings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const stats = [
    { 
      label: t('total_residents', 'إجمالي السكان'), 
      value: '125', 
      icon: UserGroupIcon,
      color: 'bg-rose-500',
      lightColor: 'bg-rose-50 dark:bg-rose-900/20',
      textColor: 'text-rose-600'
    },
    { 
      label: t('total_units', 'إجمالي الوحدات'), 
      value: '80', 
      icon: HomeModernIcon,
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      textColor: 'text-emerald-600'
    },
    { 
      label: t('active_services', 'الخدمات النشطة'), 
      value: '12', 
      icon: WrenchScrewdriverIcon,
      color: 'bg-pink-500',
      lightColor: 'bg-pink-50 dark:bg-pink-900/20',
      textColor: 'text-pink-600'
    },
    { 
      label: t('this_month', 'هذا الشهر'), 
      value: '45', 
      icon: CalendarDaysIcon,
      color: 'bg-amber-500',
      lightColor: 'bg-amber-50 dark:bg-amber-900/20',
      textColor: 'text-amber-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div 
              key={index}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5"
            >
              <div className={`${stat.lightColor} w-12 h-12 rounded-xl flex items-center justify-center mb-3`}>
                <IconComponent className={`w-6 h-6 ${stat.textColor}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Compound Info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-lg hover:border-rose-200 dark:hover:border-rose-800 transition-all">
        <div className="p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5 text-indigo-500" />
            {t('compound_info', 'معلومات المجمع')}
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">{t('compound_name', 'اسم المجمع')}</span>
              <span className="font-medium text-gray-900 dark:text-white">{user?.compound_name || 'Green Valley'}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">{t('admin_name', 'اسم المدير')}</span>
              <span className="font-medium text-gray-900 dark:text-white">{user?.full_name}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">{t('subscription_plan', 'خطة الاشتراك')}</span>
              <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-medium">
                {t('professional', 'المحترف')}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-500 dark:text-gray-400">{t('valid_until', 'صالح حتى')}</span>
              <span className="font-medium text-gray-900 dark:text-white">31 ديسمبر 2025</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5">
        <h4 className="font-bold text-indigo-800 dark:text-indigo-300 mb-3">
          {t('quick_tip', 'نصيحة سريعة')}
        </h4>
        <p className="text-sm text-indigo-700 dark:text-indigo-400">
          {t('overview_tip', 'يمكنك عرض تقارير مفصلة عن المجمع من لوحة التحكم الرئيسية.')}
        </p>
      </div>
    </div>
  );
};

export default OverviewSettings;
