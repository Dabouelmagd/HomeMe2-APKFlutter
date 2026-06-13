import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  HomeIcon,
  WrenchScrewdriverIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  UserPlusIcon,
  MegaphoneIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Dashboard KPI Widget — top-of-page summary for compound admins.
 *
 * Single endpoint (`/api/dashboard/kpis`) feeds both the 4 KPI cards and the
 * 6-month revenue chart so we don't multiply roundtrips. Quick-action chips
 * navigate to the most-used flows without forcing a sidebar tap.
 */
const DashboardKPIWidget = ({ compoundId }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const url = compoundId
          ? `${API}/dashboard/kpis?compound_id=${encodeURIComponent(compoundId)}`
          : `${API}/dashboard/kpis`;
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!cancelled) setData(res.data);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [compoundId]);

  const kpis = data?.kpis || {};
  const series = data?.revenue_series || [];
  const fmt = (n) => Number(n || 0).toLocaleString('ar-EG');

  const cards = [
    {
      key: 'residents',
      label: t('kpi_total_residents', 'إجمالي السكان'),
      value: fmt(kpis.total_residents),
      icon: UsersIcon,
      gradient: 'from-blue-500 to-indigo-600',
      tint: 'bg-blue-50',
      iconColor: 'text-blue-700',
      onClick: () => navigate('/app/residents'),
    },
    {
      key: 'vacant',
      label: t('kpi_vacant_units', 'الوحدات الشاغرة'),
      value: kpis.total_units
        ? `${fmt(kpis.vacant_units)} / ${fmt(kpis.total_units)}`
        : fmt(kpis.vacant_units),
      icon: HomeIcon,
      gradient: 'from-amber-500 to-orange-600',
      tint: 'bg-amber-50',
      iconColor: 'text-amber-700',
      onClick: () => navigate('/app/compound-map'),
    },
    {
      key: 'maintenance',
      label: t('kpi_open_maintenance', 'صيانة مفتوحة'),
      value: fmt(kpis.open_maintenance),
      icon: WrenchScrewdriverIcon,
      gradient: 'from-rose-500 to-pink-600',
      tint: 'bg-rose-50',
      iconColor: 'text-rose-700',
      onClick: () => navigate('/app/maintenance'),
    },
    {
      key: 'revenue',
      label: t('kpi_monthly_revenue', 'إيرادات هذا الشهر'),
      value: `${fmt(kpis.monthly_revenue)} ${kpis.currency || 'EGP'}`,
      icon: BanknotesIcon,
      gradient: 'from-emerald-500 to-teal-600',
      tint: 'bg-emerald-50',
      iconColor: 'text-emerald-700',
      onClick: () => navigate('/app/finance'),
    },
  ];

  const quickActions = [
    { id: 'add-resident',     label: t('qa_add_resident', '+ إضافة ساكن'),    icon: UserPlusIcon,                  to: '/app/residents' },
    { id: 'new-announcement', label: t('qa_new_announce', 'إرسال إعلان'),     icon: MegaphoneIcon,                 to: '/app/announcements' },
    { id: 'new-maintenance',  label: t('qa_new_maintenance', 'طلب صيانة'),    icon: WrenchScrewdriverIcon,         to: '/app/maintenance' },
    { id: 'compound-map',     label: t('qa_open_map', '🗺️ خريطة المجمع'),   icon: HomeIcon,                       to: '/app/compound-map' },
    { id: 'reports',          label: t('qa_weekly_digest', 'التقرير الأسبوعي'), icon: ClipboardDocumentCheckIcon,  to: '/app/settings?tab=weekly_digest' },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 mb-6" data-testid="dashboard-kpi-widget">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="kpi-cards-grid">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              onClick={c.onClick}
              className={`text-start ${c.tint} rounded-2xl p-4 border border-gray-200 hover:shadow-md hover:-translate-y-0.5 transition-all group`}
              data-testid={`kpi-card-${c.key}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${c.gradient} text-white shadow-sm group-hover:scale-110 transition-transform`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`text-[10px] font-bold ${c.iconColor}`}>↗</span>
              </div>
              <div className="text-2xl font-black text-gray-900 truncate" title={String(c.value)}>
                {c.value}
              </div>
              <div className="text-[11px] text-gray-600 mt-0.5">{c.label}</div>
            </button>
          );
        })}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm" data-testid="kpi-revenue-chart">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold text-gray-900 text-sm">
              {t('revenue_last_6m', 'الإيرادات — آخر 6 أشهر')}
            </h3>
          </div>
          <div className="text-[10px] text-gray-400">{t('currency_egp', 'الجنيه المصري')}</div>
        </div>
        <div className="h-52" data-testid="kpi-chart-canvas">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={series}
              margin={{ top: 6, right: 14, left: isRTL ? 14 : 14, bottom: 0 }}
            >
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                reversed={isRTL}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                orientation={isRTL ? 'right' : 'left'}
              />
              <Tooltip
                formatter={(v) => [`${Number(v).toLocaleString('ar-EG')} ج.م`, t('revenue', 'الإيرادات')]}
                contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#revGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <h3 className="font-bold text-gray-900 text-sm mb-3">
          {t('quick_actions', 'إجراءات سريعة')}
        </h3>
        <div className="flex flex-wrap gap-2" data-testid="kpi-quick-actions">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                onClick={() => navigate(a.to)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-50 to-fuchsia-50 hover:from-violet-100 hover:to-fuchsia-100 border border-violet-200 text-violet-800 text-xs font-bold transition"
                data-testid={`kpi-action-${a.id}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardKPIWidget;
