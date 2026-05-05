import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BuildingOffice2Icon,
  BuildingOfficeIcon,
  UsersIcon,
  LifebuoyIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CursorArrowRaysIcon,
  ChartBarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * SuperAdminQuickStats
 * 8-tile pulse widget for owner/super_admin dashboard.
 * Aggregates: companies-alerts, support-tickets, super-admin dashboard stats, owner-kpis (engagement).
 * Each tile is clickable, navigating to the relevant deep-link.
 */
const SuperAdminQuickStats = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState({
    companies: null,
    tickets: null,
    overview: null,
    kpis: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [c, t1, ov, k] = await Promise.allSettled([
        axios.get(`${API}/sidebar-alerts/companies`, { headers }),
        axios.get(`${API}/sidebar-alerts/support-tickets`, { headers }),
        axios.get(`${API}/super-admin/dashboard`, { headers }),
        axios.get(`${API}/owner-kpis`, { headers }),
      ]);
      setData({
        companies: c.status === 'fulfilled' ? c.value.data : null,
        tickets: t1.status === 'fulfilled' ? t1.value.data : null,
        overview: ov.status === 'fulfilled' ? ov.value.data : null,
        kpis: k.status === 'fulfilled' ? k.value.data : null,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 60000); // refresh every 60s
    return () => clearInterval(iv);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const c = data.companies || {};
  const tk = data.tickets || {};
  const ov = data.overview?.stats || {};
  const k = data.kpis || {};

  const tiles = [
    {
      id: 'active-companies',
      label: t('qs_active_companies', 'شركات نشطة'),
      value: c.active_companies ?? 0,
      icon: BuildingOffice2Icon,
      color: 'from-indigo-500 to-blue-600',
      ring: 'ring-indigo-200',
      iconBg: 'bg-indigo-50 text-indigo-600',
      onClick: () => navigate('/app/super-admin?tab=companies'),
      pulse: false,
    },
    {
      id: 'compounds',
      label: t('qs_total_compounds', 'مجمعات سكنية'),
      value: ov.total_compounds ?? k?.compounds?.total ?? 0,
      icon: BuildingOfficeIcon,
      color: 'from-emerald-500 to-teal-600',
      ring: 'ring-emerald-200',
      iconBg: 'bg-emerald-50 text-emerald-600',
      onClick: () => navigate('/app/super-admin?tab=compounds'),
      pulse: false,
    },
    {
      id: 'users',
      label: t('qs_total_users', 'إجمالي المستخدمين'),
      value: ov.total_users ?? k?.users?.total ?? 0,
      icon: UsersIcon,
      color: 'from-purple-500 to-fuchsia-600',
      ring: 'ring-purple-200',
      iconBg: 'bg-purple-50 text-purple-600',
      onClick: () => navigate('/app/super-admin?tab=users'),
      pulse: false,
    },
    {
      id: 'support-tickets',
      label: t('qs_support_open', 'تذاكر دعم مفتوحة'),
      value: tk.open ?? 0,
      sub: tk.in_progress ? `+${tk.in_progress} ${t('qs_in_progress', 'قيد المعالجة')}` : null,
      icon: LifebuoyIcon,
      color: 'from-rose-500 to-pink-600',
      ring: 'ring-rose-200',
      iconBg: 'bg-rose-50 text-rose-600',
      onClick: () => navigate('/app/super-admin?tab=support_tickets'),
      pulse: (tk.open ?? 0) > 0,
    },
    {
      id: 'urgent-alerts',
      label: t('qs_urgent_alerts', 'تنبيهات عاجلة'),
      value: c.urgent ?? 0,
      icon: ExclamationTriangleIcon,
      color: 'from-amber-500 to-orange-600',
      ring: 'ring-amber-200',
      iconBg: 'bg-amber-50 text-amber-600',
      onClick: () => navigate('/app/alerts'),
      pulse: (c.urgent ?? 0) > 0,
    },
    {
      id: 'expiring',
      label: t('qs_expiring_contracts', 'عقود تنتهي خلال 7 أيام'),
      value: c.expiring_contracts ?? 0,
      icon: ClockIcon,
      color: 'from-red-500 to-rose-600',
      ring: 'ring-red-200',
      iconBg: 'bg-red-50 text-red-600',
      onClick: () => navigate('/app/subscription-reminders'),
      pulse: (c.expiring_contracts ?? 0) > 0,
    },
    {
      id: 'empty-companies',
      label: t('qs_empty_companies', 'شركات بدون مجمعات'),
      value: c.empty_companies ?? 0,
      icon: BuildingOffice2Icon,
      color: 'from-slate-500 to-gray-600',
      ring: 'ring-slate-200',
      iconBg: 'bg-slate-50 text-slate-600',
      onClick: () => navigate('/app/super-admin?tab=companies'),
      pulse: false,
    },
    {
      id: 'engagement',
      label: t('qs_engagement', 'التفاعل (DAU/MAU)'),
      value: `${k?.engagement?.dau ?? 0}/${k?.engagement?.mau ?? 0}`,
      sub: k?.engagement?.stickiness != null ? `${k.engagement.stickiness}%` : null,
      icon: CursorArrowRaysIcon,
      color: 'from-cyan-500 to-blue-600',
      ring: 'ring-cyan-200',
      iconBg: 'bg-cyan-50 text-cyan-600',
      onClick: () => navigate('/app/owner-kpis'),
      pulse: false,
    },
  ];

  if (loading) {
    return (
      <div
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6"
        data-testid="super-admin-quick-stats-loading"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-sm border border-gray-200 p-5 mb-6"
      data-testid="super-admin-quick-stats"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-indigo-600" />
          <h3 className="text-base font-bold text-gray-900">
            {t('qs_title', 'نبض التطبيق — لمحة سريعة')}
          </h3>
          <span className="text-xs text-gray-400">
            {t('qs_realtime', '· يتحدّث كل دقيقة')}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          title={t('qs_refresh', 'تحديث الآن')}
          data-testid="quick-stats-refresh"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.id}
              onClick={tile.onClick}
              className={`group relative overflow-hidden text-right rtl:text-right p-4 rounded-xl border bg-white hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 ring-1 ${tile.ring} hover:ring-2`}
              data-testid={`quick-stat-${tile.id}`}
            >
              {/* Gradient accent stripe (top) */}
              <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${tile.color}`} />

              <div className="flex items-start justify-between gap-2 mt-1">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate">
                    {tile.label}
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-2xl font-bold text-gray-900 group-hover:scale-105 transition-transform origin-right">
                      {tile.value}
                    </p>
                  </div>
                  {tile.sub && (
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">{tile.sub}</p>
                  )}
                </div>
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg ${tile.iconBg} flex items-center justify-center ${tile.pulse ? 'animate-pulse' : ''}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SuperAdminQuickStats;
