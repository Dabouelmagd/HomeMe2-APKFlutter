import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  BellAlertIcon, ArrowPathIcon, FunnelIcon,
  MagnifyingGlassIcon, ChevronUpDownIcon,
  ExclamationTriangleIcon, CheckCircleIcon,
  ClockIcon, XMarkIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tok = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const SEV = {
  critical: { label: 'حرج',    bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-300',    border: 'border-red-200 dark:border-red-700',    dot: 'bg-red-500',    badge: 'bg-red-500', order: 0 },
  high:     { label: 'مرتفع',  bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-700', dot: 'bg-orange-500', badge: 'bg-orange-500', order: 1 },
  medium:   { label: 'متوسط',  bg: 'bg-amber-100 dark:bg-amber-900/30',  text: 'text-amber-700 dark:text-amber-300',  border: 'border-amber-200 dark:border-amber-700',  dot: 'bg-amber-400',  badge: 'bg-amber-400', order: 2 },
  low:      { label: 'منخفض',  bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-300',   border: 'border-blue-200 dark:border-blue-700',   dot: 'bg-blue-400',  badge: 'bg-blue-400', order: 3 },
};

const TYPE_LABELS = {
  contract_expiring: '📋 عقود',
  empty_company:     '🏢 شركات',
  pending_ad:        '📢 إعلانات',
  sub_expiring:      '🔑 اشتراكات',
  invite_alert:      '🔗 دعوات',
};

export default function AlertsDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters & sort
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState('severity'); // severity | date_asc | date_desc | alpha

  useEffect(() => {
    let alive = true;
    setLoading(true);
    axios.get(`${API}/alerts/dashboard`, tok())
      .then(r => { if (alive) setData(r.data); })
      .catch(e => { if (alive) toast.error(e.response?.data?.detail || 'فشل تحميل التنبيهات'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [refreshKey]);

  const alerts = data?.alerts || [];
  const summary = data?.summary || { total: 0, critical: 0, high: 0, medium: 0, low: 0 };

  const filtered = useMemo(() => {
    let list = [...alerts];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.title?.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
      );
    }

    // Severity filter
    if (sevFilter !== 'all') list = list.filter(a => a.severity === sevFilter);

    // Type filter
    if (typeFilter !== 'all') list = list.filter(a => a.type === typeFilter);

    // Sort
    list.sort((a, b) => {
      if (sort === 'severity') {
        return (SEV[a.severity]?.order ?? 9) - (SEV[b.severity]?.order ?? 9);
      }
      if (sort === 'alpha') {
        return (a.title || '').localeCompare(b.title || '', 'ar');
      }
      if (sort === 'date_desc') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sort === 'date_asc') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      return 0;
    });

    return list;
  }, [alerts, search, sevFilter, typeFilter, sort]);

  const types = [...new Set(alerts.map(a => a.type))];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 sm:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <BellAlertIcon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">لوحة التنبيهات</h1>
              {summary.total > 0 && (
                <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {summary.total}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mr-11">كل الأمور العاجلة في مكان واحد</p>
          </div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'critical', label: 'حرج',   color: 'red',    icon: '🔴' },
            { key: 'high',     label: 'مرتفع',  color: 'orange', icon: '🟠' },
            { key: 'medium',   label: 'متوسط',  color: 'amber',  icon: '🟡' },
            { key: 'low',      label: 'منخفض',  color: 'blue',   icon: '🔵' },
          ].map(({ key, label, color, icon }) => (
            <button
              key={key}
              onClick={() => setSevFilter(sevFilter === key ? 'all' : key)}
              className={`p-3 rounded-xl border transition-all text-right ${
                sevFilter === key
                  ? `bg-${color}-100 dark:bg-${color}-900/30 border-${color}-300 dark:border-${color}-700`
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="text-xl mb-1">{icon}</div>
              <div className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400`}>
                {summary[key] || 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
            </button>
          ))}
        </div>

        {/* ── Filters & Sort ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">

          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث في التنبيهات..."
              className="w-full pr-9 pl-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-300 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2">
                <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Type filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <FunnelIcon className="h-4 w-4 text-gray-400" />
              <button
                onClick={() => setTypeFilter('all')}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${typeFilter === 'all' ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                الكل
              </button>
              {types.map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(typeFilter === t ? 'all' : t)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${typeFilter === t ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                >
                  {TYPE_LABELS[t] || t}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5 mr-auto">
              <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-300"
              >
                <option value="severity">ترتيب: الأهمية</option>
                <option value="date_desc">ترتيب: الأحدث أولاً</option>
                <option value="date_asc">ترتيب: الأقدم أولاً</option>
                <option value="alpha">ترتيب: أبجدي</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Alerts List ───────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <CheckCircleIcon className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
            <p className="font-bold text-gray-700 dark:text-gray-200 text-lg">
              {alerts.length === 0 ? '✨ لا توجد تنبيهات' : 'لا توجد نتائج'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {alerts.length === 0 ? 'كل شيء تحت السيطرة' : 'جرب تغيير الفلتر أو البحث'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Count */}
            <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
              عرض {filtered.length} من {alerts.length} تنبيه
            </p>

            {filtered.map(alert => {
              const sev = SEV[alert.severity] || SEV.low;
              return (
                <div
                  key={alert.id}
                  className={`bg-white dark:bg-gray-800 rounded-2xl border ${sev.border} p-4 hover:shadow-md dark:hover:shadow-gray-900 transition-shadow`}
                >
                  <div className="flex items-start gap-3">
                    {/* Severity dot */}
                    <div className={`w-10 h-10 rounded-xl ${sev.bg} flex items-center justify-center flex-shrink-0`}>
                      <div className={`w-3 h-3 rounded-full ${sev.dot}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title + Badge */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{alert.title}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${sev.badge}`}>
                          {sev.label}
                        </span>
                        {alert.type && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {TYPE_LABELS[alert.type] || alert.type}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{alert.description}</p>

                      {/* Meta */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {alert.created_at && (
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <ClockIcon className="h-3 w-3" />
                            {new Date(alert.created_at).toLocaleDateString('ar-EG', {
                              year: 'numeric', month: 'short', day: 'numeric'
                            })}
                          </div>
                        )}
                        {alert.meta?.days_left !== undefined && (
                          <span className={`text-xs font-medium ${alert.meta.days_left < 0 ? 'text-red-500' : alert.meta.days_left <= 7 ? 'text-orange-500' : 'text-amber-500'}`}>
                            {alert.meta.days_left < 0
                              ? `منذ ${Math.abs(alert.meta.days_left)} يوم`
                              : `بعد ${alert.meta.days_left} يوم`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    {alert.action && (
                      <button
                        onClick={() => navigate(alert.action.href)}
                        className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg border ${sev.border} ${sev.text} ${sev.bg} hover:opacity-80 transition-opacity whitespace-nowrap`}
                      >
                        {alert.action.label} ←
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
