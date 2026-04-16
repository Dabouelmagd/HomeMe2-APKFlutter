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
  BellAlertIcon,
  BuildingOffice2Icon,
  BanknotesIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  GiftTopIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const OwnerDashboard = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  const [data, setData] = useState(null);
  const [budget, setBudget] = useState(null);
  const [reminders, setReminders] = useState(null);
  const [adStats, setAdStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/super-admin/dashboard`, getHeaders()).then(r => r.data).catch(() => null),
      axios.get(`${API}/owner/budget`, getHeaders()).then(r => r.data).catch(() => null),
      axios.get(`${API}/owner/subscription-reminders?days_ahead=30`, getHeaders()).then(r => r.data).catch(() => null),
      axios.get(`${API}/ads/analytics`, getHeaders()).then(r => r.data).catch(() => null),
    ]).then(([d, b, r, a]) => {
      setData(d); setBudget(b); setReminders(r); setAdStats(a);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  const compounds = data?.compounds || [];
  const totalUsers = compounds.reduce((sum, c) => sum + (c.users || 0), 0);
  const s = budget?.summary || {};
  const rs = reminders?.stats || {};
  const as = adStats?.summary || {};
  const gifts = budget?.gifts || {};
  const fmt = (v) => (v || 0).toLocaleString();

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'} data-testid="owner-dashboard">
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-rose-950 to-gray-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0aDR2NGgtNHpNNDAgMzBoNHY0aC00ek0yOCAzOGg0djRoLTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-rose-300 text-xs font-medium tracking-wider mb-1">{t('od_owner_panel', 'لوحة تحكم مالك التطبيق')}</p>
            <h1 className="text-2xl font-black mb-1">
              {t('od_welcome', 'مرحباً')}، {user?.full_name || user?.name}
            </h1>
            <p className="text-gray-400 text-sm">{t('od_subtitle_new', 'إدارة شاملة للمنصة - المجمعات والاشتراكات والإيرادات')}</p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 bg-green-500/10 backdrop-blur px-3 py-1.5 rounded-lg border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs text-green-300">{t('od_system_active', 'النظام نشط')}</span>
            </div>
            <span className="text-[10px] text-gray-500">{new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Financial Row - Revenue, Expenses, Profit on ONE line */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/app/owner-budget')}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><ArrowTrendingUpIcon className="w-5 h-5 text-emerald-600" /></div>
            <span className="text-xs text-gray-500">{t('budget_total_revenue', 'إجمالي الإيرادات')}</span>
          </div>
          <p className="text-2xl font-black text-emerald-600">{fmt(s.total_revenue)} <span className="text-xs font-normal text-gray-400">{t('sm_egp', 'ج.م')}</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/app/owner-budget')}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><ArrowTrendingDownIcon className="w-5 h-5 text-red-600" /></div>
            <span className="text-xs text-gray-500">{t('budget_total_expenses', 'إجمالي المصروفات')}</span>
          </div>
          <p className="text-2xl font-black text-red-500">{fmt(s.total_expenses)} <span className="text-xs font-normal text-gray-400">{t('sm_egp', 'ج.م')}</span></p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${s.net_profit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`} onClick={() => navigate('/app/owner-budget')}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.net_profit >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}><BanknotesIcon className={`w-5 h-5 ${s.net_profit >= 0 ? 'text-blue-600' : 'text-red-600'}`} /></div>
            <span className="text-xs text-gray-500">{s.net_profit >= 0 ? t('budget_net_profit', 'صافي الربح') : t('od_net_loss', 'صافي الخسارة')}</span>
          </div>
          <p className={`text-2xl font-black ${s.net_profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(Math.abs(s.net_profit))} <span className="text-xs font-normal text-gray-400">{t('sm_egp', 'ج.م')}</span></p>
          <p className="text-[10px] text-gray-400 mt-0.5">{t('budget_profit_margin', 'هامش الربح')}: {s.profit_margin || 0}%</p>
        </div>
      </div>

      {/* Compounds & Companies Row - on ONE line */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/app/super-admin?tab=compounds')}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center"><BuildingOfficeIcon className="w-5 h-5 text-indigo-600" /></div>
            <span className="text-xs text-gray-500">{t('od_total_compounds', 'المجمعات السكنية')}</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{compounds.length} <span className="text-sm font-normal text-gray-400">{t('od_compound', 'مجمع')}</span></p>
          <p className="text-[10px] text-gray-400 mt-0.5">{totalUsers} {t('od_users', 'مستخدم')}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/app/company-subscriptions')}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center"><BuildingOffice2Icon className="w-5 h-5 text-purple-600" /></div>
            <span className="text-xs text-gray-500">{t('od_mgmt_companies', 'شركات الإدارة')}</span>
          </div>
          <p className="text-2xl font-black text-gray-900">{budget?.subscriptions?.total_company_subs || 0} <span className="text-sm font-normal text-gray-400">{t('od_company', 'شركة')}</span></p>
          <p className="text-[10px] text-gray-400 mt-0.5">{budget?.subscriptions?.active_company_subs || 0} {t('cs_active', 'نشطة')} · {budget?.subscriptions?.expired_company_subs || 0} {t('cs_expired', 'منتهية')}</p>
        </div>
      </div>

      {/* Middle Row - Subscriptions + Ads + Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Subscriptions Summary */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/app/company-subscriptions')}>
          <div className="flex items-center gap-2 mb-4">
            <BuildingOffice2Icon className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-gray-900 text-sm">{t('owner_company_subs', 'اشتراكات شركات الإدارة')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xl font-black text-green-600">{budget?.subscriptions?.active_company_subs || 0}</p>
              <p className="text-[10px] text-green-600/70">{t('cs_active', 'نشطة')}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-xl font-black text-red-500">{budget?.subscriptions?.expired_company_subs || 0}</p>
              <p className="text-[10px] text-red-500/70">{t('cs_expired', 'منتهية')}</p>
            </div>
          </div>
          <div className="mt-3 flex justify-between text-xs text-gray-500">
            <span>{t('budget_total_payments', 'المدفوعات')}: {budget?.subscriptions?.total_payments || 0}</span>
            <span>{t('budget_active_trials', 'تجريبية')}: {budget?.subscriptions?.active_trials || 0}</span>
          </div>
        </div>

        {/* Ads Performance */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/app/analytics')}>
          <div className="flex items-center gap-2 mb-4">
            <SpeakerWaveIcon className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-gray-900 text-sm">{t('budget_ads', 'الإعلانات')}</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <EyeIcon className="w-3 h-3 text-purple-500" />
                <p className="text-lg font-black text-gray-900">{fmt(as.total_views)}</p>
              </div>
              <p className="text-[10px] text-gray-400">{t('ad_views', 'مشاهدات')}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <CursorArrowRaysIcon className="w-3 h-3 text-amber-500" />
                <p className="text-lg font-black text-gray-900">{fmt(as.total_clicks)}</p>
              </div>
              <p className="text-[10px] text-gray-400">{t('ad_clicks', 'نقرات')}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-emerald-600">{fmt(as.total_revenue)}</p>
              <p className="text-[10px] text-gray-400">{t('sm_egp', 'ج.م')}</p>
            </div>
          </div>
          <div className="mt-3 flex justify-between text-xs">
            <span className="text-gray-500">{as.total_ads || 0} {t('ad_total_ads', 'إعلان')}</span>
            <span className="text-pink-500">{as.gift_ads || 0} {t('ad_gifts', 'هدايا')}</span>
          </div>
        </div>

        {/* Subscription Reminders */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/app/subscription-reminders')}>
          <div className="flex items-center gap-2 mb-4">
            <BellAlertIcon className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-gray-900 text-sm">{t('owner_reminders', 'تذكيرات الاشتراكات')}</h3>
          </div>
          <div className="space-y-2">
            {rs.expiring_soon > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 rounded-lg px-3 py-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-amber-700 font-medium">{rs.expiring_soon} {t('rem_expiring', 'ينتهي قريباً')}</span>
              </div>
            )}
            {rs.expired > 0 && (
              <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2">
                <ClockIcon className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600 font-medium">{rs.expired} {t('rem_expired', 'منتهية')}</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-600 font-medium">{rs.healthy || 0} {t('rem_healthy', 'سليمة')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Gifts & Coupons Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: t('budget_coupons', 'كوبونات'), value: `${gifts.active_coupons || 0}/${gifts.total_coupons || 0}`, icon: TicketIcon, color: 'text-pink-600 bg-pink-50', href: '/app/super-admin?tab=coupons' },
          { label: t('budget_codes', 'أكواد'), value: `${gifts.active_codes || 0}/${gifts.total_codes || 0}`, icon: KeyIcon, color: 'text-indigo-600 bg-indigo-50', href: '/app/super-admin?tab=codes' },
          { label: t('ad_gifts', 'إعلانات هدية'), value: gifts.gift_ads || 0, icon: GiftTopIcon, color: 'text-rose-600 bg-rose-50', href: '/app/super-admin?tab=ads' },
          { label: t('sa_referrals', 'الإحالات'), value: budget?.ads?.total_ads || 0, icon: UserGroupIcon, color: 'text-teal-600 bg-teal-50', href: '/app/super-admin?tab=referrals' },
          { label: t('budget_profit_margin', 'هامش الربح'), value: `${s.profit_margin || 0}%`, icon: ChartBarIcon, color: 'text-amber-600 bg-amber-50', href: '/app/owner-budget' },
        ].map((item, i) => (
          <div key={i} onClick={() => navigate(item.href)} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.color}`}>
              <item.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-black text-gray-900">{item.value}</p>
              <p className="text-[10px] text-gray-400">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Compounds List */}
      {compounds.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{t('od_compounds_overview', 'المجمعات السكنية')}</h3>
            <button onClick={() => navigate('/app/super-admin?tab=compounds')} className="text-xs text-blue-600 hover:underline">{t('od_view_all', 'عرض الكل')}</button>
          </div>
          <div className="divide-y divide-gray-50">
            {compounds.slice(0, 5).map((c, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                    <BuildingOfficeIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                    <p className="text-[10px] text-gray-400">{c.users || 0} {t('od_users', 'مستخدم')} · {c.families || 0} {t('od_families', 'أسرة')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-end">
                    <p className="text-xs font-bold text-gray-700">{c.units || 0}</p>
                    <p className="text-[10px] text-gray-400">{t('od_units', 'وحدة')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Navigation */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3 text-sm">{t('od_quick_nav', 'الوصول السريع')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { name: t('owner_budget', 'الميزانية'), href: '/app/owner-budget', icon: CurrencyDollarIcon, bg: 'bg-gradient-to-br from-emerald-500 to-teal-600' },
            { name: t('owner_company_subs', 'شركات الإدارة'), href: '/app/company-subscriptions', icon: BuildingOffice2Icon, bg: 'bg-gradient-to-br from-indigo-500 to-blue-600' },
            { name: t('sa_ads', 'الإعلانات'), href: '/app/super-admin?tab=ads', icon: SpeakerWaveIcon, bg: 'bg-gradient-to-br from-amber-500 to-orange-600' },
            { name: t('owner_translations', 'الترجمات'), href: '/app/super-admin?tab=translations', icon: LanguageIcon, bg: 'bg-gradient-to-br from-rose-500 to-pink-600' },
          ].map((link, i) => (
            <button key={i} onClick={() => navigate(link.href)} className={`${link.bg} rounded-xl p-4 text-white text-start hover:opacity-90 transition-opacity shadow-md`}>
              <link.icon className="w-6 h-6 text-white/70 mb-2" />
              <p className="text-sm font-bold">{link.name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
