import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  ChartBarIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon,
  BellAlertIcon,
  ClockIcon,
  SpeakerWaveIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  CurrencyDollarIcon,
  SignalIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const AdRealtimeDashboard = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [activeTab, setActiveTab] = useState('realtime');
  const [realtime, setRealtime] = useState(null);
  const [financial, setFinancial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef(null);
  const prevAlertsRef = useRef([]);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const [rt, fin] = await Promise.all([
        axios.get(`${API}/ads/analytics/realtime?days=30`, getHeaders()).then(r => r.data).catch(() => null),
        activeTab === 'financial'
          ? axios.get(`${API}/ads/analytics/financial`, getHeaders()).then(r => r.data).catch(() => null)
          : Promise.resolve(financial),
      ]);

      if (rt) {
        // Check for new high CTR alerts
        const newHighAlerts = (rt.alerts || []).filter(
          a => a.type === 'high_ctr' && !prevAlertsRef.current.includes(a.ad_id)
        );
        if (silent && newHighAlerts.length > 0) {
          newHighAlerts.forEach(a => {
            toast.success(`${a.ad_title}: CTR ${a.ctr}%`, {
              description: t('alert_high_ctr_desc', 'إعلان يحقق نسبة نقر عالية!'),
              duration: 6000,
            });
          });
        }
        prevAlertsRef.current = (rt.alerts || []).filter(a => a.type === 'high_ctr').map(a => a.ad_id);
        setRealtime(rt);
      }
      if (fin) setFinancial(fin);
      setLastRefresh(new Date());
    } catch { /* silent */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, financial, t]);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (activeTab === 'financial' && !financial) {
      axios.get(`${API}/ads/analytics/financial`, getHeaders())
        .then(r => setFinancial(r.data)).catch(() => {});
    }
  }, [activeTab, financial]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchData(true), 30000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchData]);

  const fmt = (v) => (v || 0).toLocaleString();
  const fmtEgp = (v) => `${fmt(v)} ${t('sm_egp', 'ج.م')}`;

  const posLabels = {
    banner: t('sa_pos_banner', 'بانر'),
    sidebar: t('sa_pos_sidebar', 'جانبي'),
    inline: t('sa_pos_inline', 'داخلي'),
    dashboard: t('sa_pos_dashboard', 'لوحة التحكم'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  const ls = realtime?.live_summary || {};
  const alerts = realtime?.alerts || [];
  const ac = realtime?.alert_counts || {};
  const fs = financial?.summary || {};

  return (
    <div className="space-y-5" dir={isRTL ? 'rtl' : 'ltr'} data-testid="ad-realtime-dashboard">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 rounded-2xl p-5 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-500/10 via-transparent to-cyan-500/10"></div>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SignalIcon className="w-5 h-5 text-rose-400" />
              <h1 className="text-xl font-black" data-testid="dashboard-title">
                {t('ad_realtime_title', 'تحليلات الإعلانات الحية')}
              </h1>
              {autoRefresh && (
                <span className="flex items-center gap-1 bg-green-500/20 px-2 py-0.5 rounded-full text-[10px] text-green-300 border border-green-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  {t('ad_live', 'مباشر')}
                </span>
              )}
            </div>
            <p className="text-gray-400 text-xs">{t('ad_realtime_subtitle', 'متابعة أداء الإعلانات لحظياً مع تنبيهات ذكية وتقارير مالية')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${autoRefresh ? 'bg-green-600/20 text-green-300 border border-green-500/30' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}
              data-testid="toggle-auto-refresh"
            >
              <ClockIcon className="w-3.5 h-3.5 inline-block me-1" />
              {autoRefresh ? t('ad_auto_on', 'تحديث تلقائي') : t('ad_auto_off', 'تحديث يدوي')}
            </button>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-all border border-white/10"
              data-testid="refresh-btn"
            >
              <ArrowPathIcon className={`w-3.5 h-3.5 inline-block me-1 ${refreshing ? 'animate-spin' : ''}`} />
              {t('refresh', 'تحديث')}
            </button>
          </div>
        </div>
        {lastRefresh && (
          <p className="relative text-[10px] text-gray-500 mt-2">
            {t('ad_last_update', 'آخر تحديث')}: {lastRefresh.toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US')}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'realtime', label: t('ad_tab_realtime', 'البيانات الحية'), icon: SignalIcon },
          { id: 'financial', label: t('ad_tab_financial', 'التقارير المالية'), icon: BanknotesIcon },
          { id: 'alerts', label: t('ad_tab_alerts', 'التنبيهات'), icon: BellAlertIcon, count: alerts.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/25' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-rose-100 text-rose-600'}`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* === REALTIME TAB === */}
      {activeTab === 'realtime' && (
        <div className="space-y-5">
          {/* Live Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: t('ad_total_ads', 'إجمالي الإعلانات'), value: ls.total_ads, icon: SpeakerWaveIcon, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
              { label: t('ad_active', 'نشطة'), value: ls.active_ads, icon: CheckCircleIcon, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
              { label: t('ad_views', 'المشاهدات'), value: fmt(ls.total_views), icon: EyeIcon, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
              { label: t('ad_clicks', 'النقرات'), value: fmt(ls.total_clicks), icon: CursorArrowRaysIcon, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
              { label: t('ad_today_clicks', 'نقرات اليوم'), value: fmt(ls.today_clicks), icon: CalendarDaysIcon, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
              { label: t('ad_avg_ctr', 'متوسط CTR'), value: `${ls.avg_ctr || 0}%`, icon: ArrowTrendingUpIcon, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100' },
            ].map((m, i) => (
              <div key={i} className={`${m.bg} rounded-xl border ${m.border} p-4 transition-all hover:shadow-md`} data-testid={`metric-${i}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${m.bg} flex items-center justify-center`}>
                    <m.icon className={`w-4 h-4 ${m.color}`} />
                  </div>
                </div>
                <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>

          {/* Alert Summary Bar */}
          {alerts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {ac.high_ctr > 0 && (
                <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5" data-testid="alert-high-ctr">
                  <CheckCircleIcon className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700">{ac.high_ctr} {t('ad_high_ctr_alert', 'إعلان بـ CTR عالي')}</span>
                </div>
              )}
              {ac.good_ctr > 0 && (
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5" data-testid="alert-good-ctr">
                  <InformationCircleIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">{ac.good_ctr} {t('ad_good_ctr_alert', 'إعلان بـ CTR جيد')}</span>
                </div>
              )}
              {ac.no_clicks > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5" data-testid="alert-no-clicks">
                  <ExclamationTriangleIcon className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700">{ac.no_clicks} {t('ad_no_clicks_alert', 'إعلان بدون نقرات')}</span>
                </div>
              )}
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Daily Performance Trend */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4 text-blue-500" />
                {t('ad_daily_performance', 'الأداء اليومي (آخر 30 يوم)')}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={realtime?.daily_series || []}>
                    <defs>
                      <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={v => v.slice(5)} reversed={isRTL} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} orientation={isRTL ? 'right' : 'left'} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" dataKey="views" name={t('ad_views', 'المشاهدات')} stroke="#8B5CF6" fill="url(#gradViews)" strokeWidth={2} />
                    <Area type="monotone" dataKey="clicks" name={t('ad_clicks', 'النقرات')} stroke="#F59E0B" fill="url(#gradClicks)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily CTR Trend */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ArrowTrendingUpIcon className="w-4 h-4 text-rose-500" />
                {t('ad_ctr_trend', 'اتجاه نسبة النقر (CTR)')}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={realtime?.daily_series || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={v => v.slice(5)} reversed={isRTL} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} orientation={isRTL ? 'right' : 'left'} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }} formatter={(v) => [`${v}%`, 'CTR']} />
                    <Line type="monotone" dataKey="ctr" name="CTR" stroke="#EF4444" strokeWidth={2.5} dot={{ fill: '#EF4444', r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Hourly Today */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-cyan-500" />
              {t('ad_hourly_today', 'النقرات بالساعة (اليوم)')}
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={realtime?.hourly_today || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="hour" tick={{ fill: '#9CA3AF', fontSize: 9 }} reversed={isRTL} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} orientation={isRTL ? 'right' : 'left'} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                  <Bar dataKey="clicks" name={t('ad_clicks', 'النقرات')} fill="#06B6D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* === FINANCIAL TAB === */}
      {activeTab === 'financial' && (
        <div className="space-y-5">
          {!financial ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600"></div>
            </div>
          ) : (
            <>
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-4 text-white shadow-lg" data-testid="total-revenue-card">
                  <CurrencyDollarIcon className="w-6 h-6 text-white/60 mb-2" />
                  <p className="text-2xl font-black">{fmtEgp(fs.total_revenue)}</p>
                  <p className="text-xs text-white/70 mt-0.5">{t('ad_total_revenue', 'إجمالي الإيرادات')}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg" data-testid="avg-value-card">
                  <BanknotesIcon className="w-6 h-6 text-white/60 mb-2" />
                  <p className="text-2xl font-black">{fmtEgp(fs.avg_ad_value)}</p>
                  <p className="text-xs text-white/70 mt-0.5">{t('ad_avg_value', 'متوسط قيمة الإعلان')}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white shadow-lg" data-testid="cpc-card">
                  <CursorArrowRaysIcon className="w-6 h-6 text-white/60 mb-2" />
                  <p className="text-2xl font-black">{fmtEgp(fs.cost_per_click)}</p>
                  <p className="text-xs text-white/70 mt-0.5">{t('ad_cpc', 'تكلفة النقرة (CPC)')}</p>
                </div>
                <div className={`rounded-xl p-4 text-white shadow-lg ${fs.growth_percent >= 0 ? 'bg-gradient-to-br from-cyan-500 to-teal-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`} data-testid="growth-card">
                  {fs.growth_percent >= 0 ? <ArrowTrendingUpIcon className="w-6 h-6 text-white/60 mb-2" /> : <ArrowTrendingDownIcon className="w-6 h-6 text-white/60 mb-2" />}
                  <p className="text-2xl font-black">{fs.growth_percent || 0}%</p>
                  <p className="text-xs text-white/70 mt-0.5">{t('ad_growth', 'النمو عن الشهر السابق')}</p>
                </div>
              </div>

              {/* Projected Revenue */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" />
                  {t('ad_projections', 'التوقعات المالية')}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-emerald-50 rounded-xl">
                    <p className="text-lg font-black text-emerald-600">{fmtEgp(fs.current_month_revenue)}</p>
                    <p className="text-[10px] text-gray-500">{t('ad_this_month', 'هذا الشهر')}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <p className="text-lg font-black text-gray-600">{fmtEgp(fs.previous_month_revenue)}</p>
                    <p className="text-[10px] text-gray-500">{t('ad_last_month', 'الشهر السابق')}</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <p className="text-lg font-black text-blue-600">{fmtEgp(fs.projected_monthly)}</p>
                    <p className="text-[10px] text-gray-500">{t('ad_projected_monthly', 'المتوقع شهرياً')}</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-xl">
                    <p className="text-lg font-black text-purple-600">{fmtEgp(fs.projected_yearly)}</p>
                    <p className="text-[10px] text-gray-500">{t('ad_projected_yearly', 'المتوقع سنوياً')}</p>
                  </div>
                </div>
              </div>

              {/* Revenue Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Monthly Revenue Trend */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CalendarDaysIcon className="w-4 h-4 text-emerald-500" />
                    {t('ad_monthly_revenue', 'الإيرادات الشهرية')}
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={financial?.monthly_chart || []}>
                        <defs>
                          <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                        <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 10 }} reversed={isRTL} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} orientation={isRTL ? 'right' : 'left'} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="revenue" name={t('ad_revenue', 'الإيرادات')} stroke="#10B981" fill="url(#gradRev)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Revenue by Position */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ChartBarIcon className="w-4 h-4 text-blue-500" />
                    {t('ad_revenue_by_position', 'الإيرادات حسب الموقع')}
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(financial?.position_revenue || []).map(p => ({
                        name: posLabels[p.position] || p.position,
                        [t('ad_revenue', 'الإيرادات')]: p.revenue,
                        [t('ad_cpc', 'CPC')]: p.cpc,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                        <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} reversed={isRTL} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} orientation={isRTL ? 'right' : 'left'} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Bar dataKey={t('ad_revenue', 'الإيرادات')} fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey={t('ad_cpc', 'CPC')} fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Revenue Breakdown Pie */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">{t('ad_revenue_breakdown', 'توزيع الإيرادات')}</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: t('ad_active_revenue', 'إيرادات نشطة'), value: financial?.breakdown?.active_revenue || 0 },
                            { name: t('ad_inactive_revenue', 'إيرادات متوقفة'), value: financial?.breakdown?.inactive_revenue || 0 },
                            { name: t('ad_gift_value', 'قيمة الهدايا'), value: financial?.breakdown?.gift_value || 0 },
                          ].filter(d => d.value > 0)}
                          cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {[0, 1, 2].map(i => <Cell key={i} fill={COLORS[i]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ROI Metrics */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">{t('ad_roi_metrics', 'مؤشرات العائد على الاستثمار')}</h3>
                  <div className="space-y-3">
                    {[
                      { label: t('ad_cpc_full', 'تكلفة النقرة (CPC)'), value: fmtEgp(fs.cost_per_click), color: 'text-amber-600', bg: 'bg-amber-50' },
                      { label: t('ad_cpv_full', 'تكلفة المشاهدة (CPV)'), value: `${fs.cost_per_view || 0} ${t('sm_egp', 'ج.م')}`, color: 'text-purple-600', bg: 'bg-purple-50' },
                      { label: t('ad_paid_count', 'إعلانات مدفوعة'), value: fs.paid_ads_count, color: 'text-blue-600', bg: 'bg-blue-50' },
                      { label: t('ad_gift_count', 'إعلانات هدية'), value: fs.gift_ads_count, color: 'text-pink-600', bg: 'bg-pink-50' },
                      { label: t('ad_avg_value', 'متوسط قيمة الإعلان'), value: fmtEgp(fs.avg_ad_value), color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    ].map((m, i) => (
                      <div key={i} className={`flex items-center justify-between ${m.bg} rounded-lg px-4 py-2.5`}>
                        <span className="text-xs text-gray-600">{m.label}</span>
                        <span className={`text-sm font-bold ${m.color}`}>{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Earners Table */}
              {(financial?.top_earners || []).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-green-50">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <BanknotesIcon className="w-4 h-4 text-emerald-500" />
                      {t('ad_top_earners', 'أعلى الإعلانات إيراداً')}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" data-testid="top-earners-table">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2.5 text-start text-gray-500 font-medium text-xs">#</th>
                          <th className="px-4 py-2.5 text-start text-gray-500 font-medium text-xs">{t('sa_title', 'العنوان')}</th>
                          <th className="px-4 py-2.5 text-center text-gray-500 font-medium text-xs">{t('sa_position', 'الموقع')}</th>
                          <th className="px-4 py-2.5 text-center text-gray-500 font-medium text-xs">{t('ad_value_col', 'القيمة')}</th>
                          <th className="px-4 py-2.5 text-center text-gray-500 font-medium text-xs">{t('ad_clicks', 'النقرات')}</th>
                          <th className="px-4 py-2.5 text-center text-gray-500 font-medium text-xs">{t('ad_views', 'المشاهدات')}</th>
                          <th className="px-4 py-2.5 text-center text-gray-500 font-medium text-xs">CPC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {financial.top_earners.map((a, i) => (
                          <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-2.5 text-xs text-gray-400 font-bold">{i + 1}</td>
                            <td className="px-4 py-2.5 font-medium text-gray-900 text-xs">{a.title}</td>
                            <td className="px-4 py-2.5 text-center text-xs text-gray-500">{posLabels[a.position] || a.position}</td>
                            <td className="px-4 py-2.5 text-center font-bold text-emerald-600 text-xs">{fmtEgp(a.ad_value)}</td>
                            <td className="px-4 py-2.5 text-center text-xs text-amber-600 font-bold">{fmt(a.clicks)}</td>
                            <td className="px-4 py-2.5 text-center text-xs text-purple-600 font-bold">{fmt(a.views)}</td>
                            <td className="px-4 py-2.5 text-center text-xs text-gray-700 font-bold">{fmtEgp(a.cpc)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* === ALERTS TAB === */}
      {activeTab === 'alerts' && (
        <div className="space-y-3" data-testid="alerts-tab">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <BellAlertIcon className="w-12 h-12 mb-3" />
              <p className="text-sm">{t('ad_no_alerts', 'لا توجد تنبيهات حالياً')}</p>
            </div>
          ) : (
            alerts.map((alert, i) => {
              const styles = {
                high_ctr: { bg: 'bg-green-50', border: 'border-green-200', icon: CheckCircleIcon, iconColor: 'text-green-600', badge: 'bg-green-100 text-green-700' },
                good_ctr: { bg: 'bg-blue-50', border: 'border-blue-200', icon: InformationCircleIcon, iconColor: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
                no_clicks: { bg: 'bg-amber-50', border: 'border-amber-200', icon: ExclamationTriangleIcon, iconColor: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
              };
              const s = styles[alert.type] || styles.good_ctr;
              const Icon = s.icon;
              return (
                <div key={i} className={`${s.bg} border ${s.border} rounded-xl p-4 flex items-center gap-3 transition-all hover:shadow-sm`} data-testid={`alert-item-${i}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
                    <Icon className={`w-5 h-5 ${s.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{alert.ad_title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{alert.message}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-xs font-bold text-gray-700">{fmt(alert.views)}</p>
                      <p className="text-[9px] text-gray-400">{t('ad_views', 'مشاهدات')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-gray-700">{fmt(alert.clicks)}</p>
                      <p className="text-[9px] text-gray-400">{t('ad_clicks', 'نقرات')}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.badge}`}>
                      CTR: {alert.ctr}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default AdRealtimeDashboard;
