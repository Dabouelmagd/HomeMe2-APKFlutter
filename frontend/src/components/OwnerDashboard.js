import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  KeyIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  TicketIcon,
  SpeakerWaveIcon,
  UserGroupIcon,
  LanguageIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const OwnerDashboard = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/super-admin/dashboard`, getHeaders());
      setData(res.data);
    } catch (err) {
      console.error('Owner dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  const compounds = data?.compounds || [];
  const totalUsers = compounds.reduce((sum, c) => sum + (c.users || 0), 0);
  const totalFamilies = compounds.reduce((sum, c) => sum + (c.families || 0), 0);

  const statCards = [
    {
      name: t('od_total_compounds', 'المجمعات السكنية'),
      value: compounds.length,
      icon: BuildingOfficeIcon,
      gradient: 'from-blue-600 to-indigo-700',
      change: null,
    },
    {
      name: t('od_total_users', 'إجمالي المستخدمين'),
      value: totalUsers,
      icon: UsersIcon,
      gradient: 'from-emerald-600 to-teal-700',
      change: null,
    },
    {
      name: t('od_total_families', 'إجمالي الأسر'),
      value: totalFamilies,
      icon: UserGroupIcon,
      gradient: 'from-purple-600 to-violet-700',
      change: null,
    },
    {
      name: t('od_revenue', 'الإيرادات الشهرية'),
      value: `${(data?.monthly_revenue || 0).toLocaleString()}`,
      suffix: t('sm_egp', 'ج.م'),
      icon: CurrencyDollarIcon,
      gradient: 'from-amber-500 to-orange-600',
      change: null,
    },
  ];

  const quickLinks = [
    { name: t('sa_compounds', 'المجمعات'), href: '/app/super-admin?tab=compounds', icon: BuildingOfficeIcon, color: 'bg-blue-600 hover:bg-blue-500' },
    { name: t('sa_users', 'المستخدمين'), href: '/app/super-admin?tab=users', icon: UsersIcon, color: 'bg-emerald-600 hover:bg-emerald-500' },
    { name: t('sa_subscription_codes', 'أكواد الاشتراك'), href: '/app/super-admin?tab=codes', icon: KeyIcon, color: 'bg-purple-600 hover:bg-purple-500' },
    { name: t('sa_discount_coupons', 'كوبونات الخصم'), href: '/app/super-admin?tab=coupons', icon: TicketIcon, color: 'bg-pink-600 hover:bg-pink-500' },
    { name: t('sa_ads', 'الإعلانات'), href: '/app/super-admin?tab=ads', icon: SpeakerWaveIcon, color: 'bg-amber-600 hover:bg-amber-500' },
    { name: t('sa_referrals', 'الإحالات'), href: '/app/super-admin?tab=referrals', icon: UserGroupIcon, color: 'bg-teal-600 hover:bg-teal-500' },
    { name: t('sa_analytics', 'التحليلات'), href: '/app/super-admin?tab=analytics', icon: ChartBarIcon, color: 'bg-indigo-600 hover:bg-indigo-500' },
    { name: t('owner_translations', 'إدارة الترجمات'), href: '/app/super-admin?tab=translations', icon: LanguageIcon, color: 'bg-rose-600 hover:bg-rose-500' },
  ];

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'} data-testid="owner-dashboard">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              {t('od_welcome', 'مرحباً')}، {user?.full_name || user?.name}
            </h1>
            <p className="text-white/70 text-sm">
              {t('od_subtitle', 'لوحة تحكم مالك التطبيق - إدارة شاملة لجميع المجمعات والمشتركين')}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-sm text-white/80">{t('od_system_active', 'النظام نشط')}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-5 text-white shadow-lg`}>
            <div className="flex items-center justify-between mb-3">
              <stat.icon className="w-8 h-8 text-white/70" />
              {stat.change !== null && (
                <span className={`flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${stat.change >= 0 ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}>
                  {stat.change >= 0 ? <ArrowTrendingUpIcon className="w-3 h-3 me-1" /> : <ArrowTrendingDownIcon className="w-3 h-3 me-1" />}
                  {Math.abs(stat.change)}%
                </span>
              )}
            </div>
            <p className="text-3xl font-black">{stat.value} {stat.suffix && <span className="text-base font-normal text-white/60">{stat.suffix}</span>}</p>
            <p className="text-sm text-white/70 mt-1">{stat.name}</p>
          </div>
        ))}
      </div>

      {/* Compounds List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{t('od_compounds_overview', 'المجمعات السكنية')}</h2>
          <button onClick={() => navigate('/app/super-admin?tab=compounds')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            {t('od_view_all', 'عرض الكل')}
          </button>
        </div>
        {compounds.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <BuildingOfficeIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>{t('od_no_compounds', 'لا توجد مجمعات سكنية بعد')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {compounds.map((compound, idx) => (
              <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <BuildingOfficeIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{compound.name}</h3>
                    <p className="text-xs text-gray-500">
                      {t('od_created', 'تاريخ الإنشاء')}: {new Date(compound.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-gray-900">{compound.users || 0}</p>
                    <p className="text-xs text-gray-500">{t('as_users', 'مستخدم')}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-900">{compound.families || 0}</p>
                    <p className="text-xs text-gray-500">{t('as_families', 'أسرة')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links Grid */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('od_quick_access', 'وصول سريع')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map((link, idx) => (
            <button
              key={idx}
              onClick={() => navigate(link.href)}
              className={`${link.color} text-white rounded-xl p-4 flex flex-col items-center gap-2 transition-all shadow-sm hover:shadow-md`}
              data-testid={`quick-link-${idx}`}
            >
              <link.icon className="w-7 h-7" />
              <span className="text-sm font-medium text-center">{link.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
