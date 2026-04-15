import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BuildingOfficeIcon,
  TicketIcon,
  KeyIcon,
  SpeakerWaveIcon,
  GiftTopIcon,
  ChartBarIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const OwnerBudget = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/owner/budget`, { ...getHeaders(), params: { period } });
      setData(res.data);
    } catch {
      toast.error(t('budget_load_failed', 'فشل تحميل الميزانية'));
    } finally {
      setLoading(false);
    }
  }, [period, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fmt = (v) => (v || 0).toLocaleString();

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  const s = data?.summary || {};
  const rb = data?.revenue_breakdown || {};
  const eb = data?.expense_breakdown || {};
  const subs = data?.subscriptions || {};
  const gifts = data?.gifts || {};
  const ads = data?.ads || {};

  const expenseCategories = {
    maintenance: t('exp_maintenance', 'صيانة'),
    utilities: t('exp_utilities', 'مرافق'),
    security: t('exp_security', 'حراسة'),
    cleaning: t('exp_cleaning', 'نظافة'),
    salaries: t('exp_salaries', 'رواتب'),
    other: t('exp_other', 'أخرى'),
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'} data-testid="owner-budget">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('budget_title', 'الميزانية العامة')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('budget_subtitle', 'نظرة شاملة على الإيرادات والمصروفات والاشتراكات')}</p>
        </div>
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-white">
          {[
            { id: 'month', label: t('budget_month', 'شهر') },
            { id: 'quarter', label: t('budget_quarter', 'ربع سنة') },
            { id: 'year', label: t('budget_year', 'سنة') },
            { id: 'all', label: t('budget_all', 'الكل') },
          ].map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${period === p.id ? 'bg-rose-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              data-testid={`period-${p.id}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <ArrowTrendingUpIcon className="w-7 h-7 text-white/60" />
          </div>
          <p className="text-3xl font-black">{fmt(s.total_revenue)} <span className="text-sm font-normal text-white/60">{t('sm_egp', 'ج.م')}</span></p>
          <p className="text-sm text-white/70 mt-1">{t('budget_total_revenue', 'إجمالي الإيرادات')}</p>
        </div>
        <div className="bg-gradient-to-br from-red-600 to-rose-700 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <ArrowTrendingDownIcon className="w-7 h-7 text-white/60" />
          </div>
          <p className="text-3xl font-black">{fmt(s.total_expenses)} <span className="text-sm font-normal text-white/60">{t('sm_egp', 'ج.م')}</span></p>
          <p className="text-sm text-white/70 mt-1">{t('budget_total_expenses', 'إجمالي المصروفات')}</p>
        </div>
        <div className={`bg-gradient-to-br ${s.net_profit >= 0 ? 'from-blue-600 to-indigo-700' : 'from-orange-600 to-red-700'} rounded-xl p-5 text-white shadow-lg`}>
          <div className="flex items-center justify-between mb-2">
            <BanknotesIcon className="w-7 h-7 text-white/60" />
          </div>
          <p className="text-3xl font-black">{fmt(s.net_profit)} <span className="text-sm font-normal text-white/60">{t('sm_egp', 'ج.م')}</span></p>
          <p className="text-sm text-white/70 mt-1">{t('budget_net_profit', 'صافي الربح')}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-violet-700 rounded-xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <ChartBarIcon className="w-7 h-7 text-white/60" />
          </div>
          <p className="text-3xl font-black">{s.profit_margin}%</p>
          <p className="text-sm text-white/70 mt-1">{t('budget_profit_margin', 'هامش الربح')}</p>
        </div>
      </div>

      {/* Revenue & Expenses Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-600" />
              {t('budget_revenue_details', 'تفاصيل الإيرادات')}
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { label: t('budget_regular_subs', 'اشتراكات عادية'), value: rb.regular_subscriptions, icon: CurrencyDollarIcon, color: 'text-blue-600 bg-blue-50' },
              { label: t('budget_company_subs', 'اشتراكات شركات الإدارة'), value: rb.company_subscriptions, icon: BuildingOfficeIcon, color: 'text-indigo-600 bg-indigo-50' },
              { label: t('budget_ad_revenue', 'إيرادات الإعلانات'), value: rb.ad_revenue, icon: SpeakerWaveIcon, color: 'text-amber-600 bg-amber-50' },
              { label: t('budget_other_revenue', 'إيرادات أخرى'), value: rb.other_revenue, icon: CurrencyDollarIcon, color: 'text-teal-600 bg-teal-50' },
            ].map((item, idx) => (
              <div key={idx} className="px-6 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.color}`}>
                    <item.icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-sm text-gray-700">{item.label}</span>
                </div>
                <span className="font-bold text-gray-900">{fmt(item.value)} <span className="text-xs text-gray-400">{t('sm_egp', 'ج.م')}</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ArrowTrendingDownIcon className="w-5 h-5 text-red-600" />
              {t('budget_expense_details', 'تفاصيل المصروفات')}
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {Object.entries(eb).map(([cat, val], idx) => {
              const total = s.total_expenses || 1;
              const pct = Math.round((val / total) * 100);
              return (
                <div key={idx} className="px-6 py-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-700">{expenseCategories[cat] || cat}</span>
                    <span className="font-bold text-gray-900">{fmt(val)} <span className="text-xs text-gray-400">{t('sm_egp', 'ج.م')}</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-red-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subscriptions & Gifts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscriptions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BuildingOfficeIcon className="w-5 h-5 text-indigo-600" />
            {t('budget_subscriptions', 'الاشتراكات')}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('budget_active_company', 'شركات نشطة')}</span>
              <span className="font-bold text-green-600">{subs.active_company_subs}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('budget_expired_company', 'شركات منتهية')}</span>
              <span className="font-bold text-red-600">{subs.expired_company_subs}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('budget_total_payments', 'إجمالي المدفوعات')}</span>
              <span className="font-bold text-gray-900">{subs.total_payments}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('budget_active_trials', 'فترات تجريبية')}</span>
              <span className="font-bold text-amber-600">{subs.active_trials}</span>
            </div>
          </div>
        </div>

        {/* Gifts (Coupons & Codes) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <GiftTopIcon className="w-5 h-5 text-pink-600" />
            {t('budget_gifts', 'الهدايا (بدون قيمة مالية)')}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('budget_coupons', 'كوبونات خصم')}</span>
              <span className="font-bold text-gray-900">{gifts.active_coupons} / {gifts.total_coupons}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('budget_coupons_used', 'كوبونات مستخدمة')}</span>
              <span className="font-bold text-purple-600">{gifts.used_coupons}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('budget_codes', 'أكواد اشتراك')}</span>
              <span className="font-bold text-gray-900">{gifts.active_codes} / {gifts.total_codes}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('budget_codes_used', 'أكواد مستخدمة')}</span>
              <span className="font-bold text-purple-600">{gifts.used_codes}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('budget_gift_ads', 'إعلانات هدية')}</span>
              <span className="font-bold text-pink-600">{gifts.gift_ads}</span>
            </div>
          </div>
        </div>

        {/* Ads */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <SpeakerWaveIcon className="w-5 h-5 text-amber-600" />
            {t('budget_ads', 'الإعلانات')}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('budget_total_ads', 'إجمالي الإعلانات')}</span>
              <span className="font-bold text-gray-900">{ads.total_ads}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('budget_active_ads', 'إعلانات نشطة')}</span>
              <span className="font-bold text-green-600">{ads.active_ads}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('budget_ad_revenue_total', 'إيرادات الإعلانات')}</span>
              <span className="font-bold text-amber-600">{fmt(ads.total_ad_revenue)} {t('sm_egp', 'ج.م')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('budget_gift_ads_count', 'إعلانات مجانية')}</span>
              <span className="font-bold text-pink-600">{ads.gift_ads}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerBudget;
