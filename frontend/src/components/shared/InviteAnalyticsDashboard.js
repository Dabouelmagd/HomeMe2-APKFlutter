import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ChartBarIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const ROLE_AR = {
  resident: 'ساكن', family_head: 'رب أسرة', manager: 'مدير', security: 'أمن',
  spouse: 'زوج/زوجة', child: 'ابن/ابنة', parent: 'أب/أم',
  sibling: 'أخ/أخت', driver: 'سائق', helper: 'خادم', other: 'أخرى',
};

const PERIOD_OPTIONS = [
  { key: '7', label: '7 أيام' },
  { key: '30', label: '30 يوم' },
  { key: '90', label: '90 يوم' },
];

/** Tiny bar chart rendered as div bars (no external chart library needed). */
const TinyBarChart = ({ data, color = 'pink' }) => {
  const max = Math.max(1, ...data.map((d) => d.count));
  const colorMap = {
    pink: 'bg-pink-500',
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
  };
  return (
    <div className="flex items-end gap-1 h-32" data-testid="bar-chart">
      {data.map((d, i) => {
        const h = Math.round((d.count / max) * 100);
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center justify-end group relative"
            title={`${d.date} — ${d.count}`}
          >
            <div
              className={`w-full ${colorMap[color]} rounded-t transition-all hover:opacity-80`}
              style={{ height: `${Math.max(2, h)}%` }}
            />
            {(i % Math.max(1, Math.floor(data.length / 6)) === 0) && (
              <span className="text-[8px] text-gray-400 mt-1 truncate max-w-[36px]">{d.date.slice(5)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

const Leaderboard = ({ items, valueKey = 'count', color = 'indigo', emptyText, testid }) => {
  if (!items || items.length === 0) {
    return (
      <div data-testid={testid}>
        <p className="text-xs text-gray-400 italic py-4 text-center">{emptyText}</p>
      </div>
    );
  }
  const max = Math.max(1, ...items.map((i) => i[valueKey] || 0));
  const colorMap = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
  };
  return (
    <ul className="space-y-2" data-testid={testid}>
      {items.map((item, idx) => {
        const v = item[valueKey] || 0;
        const w = Math.round((v / max) * 100);
        const label = item.name || ROLE_AR[item.role] || item.role || '—';
        return (
          <li key={idx} className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 w-4">{idx + 1}</span>
            <span className="flex-1 text-xs text-gray-900 dark:text-gray-100 truncate">{label}</span>
            <div className="w-24 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full ${colorMap[color]} rounded-full`} style={{ width: `${w}%` }} />
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-6 text-left tabular-nums">{v}</span>
          </li>
        );
      })}
    </ul>
  );
};

/**
 * InviteAnalyticsDashboard — full analytics view for app_owner / super_admin /
 * company_admin. Shows daily acceptances bar chart + top compounds + top roles
 * + slowest roles. Mounted as a lazy section inside admin dashboards.
 */
const InviteAnalyticsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const res = await axios.get(`${API}/invite-analytics`, { ...auth(), params: { period_days: period } });
        if (alive) { setData(res.data); setErr(null); }
      } catch (e) {
        if (alive) {
          setErr(e?.response?.data?.detail || 'تعذر تحميل التحليلات');
          setData(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [period]);

  if (loading) {
    return <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" data-testid="invite-analytics-loading" />;
  }
  if (err) {
    return (
      <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 text-center text-sm text-rose-700 dark:text-rose-300">
        {err}
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-5" data-testid="invite-analytics-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white inline-flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-pink-500" />
            <span>تحليلات الدعوات</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">معدّل الانضمام، أنشط المجمعات والأدوار</p>
        </div>
        <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5" data-testid="analytics-period-chips">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                period === p.key
                  ? 'bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
              data-testid={`analytics-period-${p.key}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Daily acceptances chart */}
      <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 inline-flex items-center gap-1.5">
            <ChartBarIcon className="w-3.5 h-3.5 text-indigo-500" />
            <span>الانضمامات اليومية</span>
          </h4>
          <span className="text-xs font-bold text-gray-900 dark:text-white">إجمالي: {data.total_acceptances || 0}</span>
        </div>
        {data.daily_acceptances && data.daily_acceptances.length > 0 ? (
          <TinyBarChart data={data.daily_acceptances} color="pink" />
        ) : (
          <p className="text-xs text-gray-400 italic py-6 text-center">لا توجد انضمامات في هذه الفترة</p>
        )}
      </div>

      {/* Three leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 inline-flex items-center gap-1.5">
            <TrophyIcon className="w-3.5 h-3.5 text-amber-500" />
            <span>أنشط المجمعات</span>
          </h4>
          <Leaderboard
            items={data.top_compounds}
            valueKey="acceptances"
            color="amber"
            emptyText="لا توجد بيانات"
            testid="top-compounds-list"
          />
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 inline-flex items-center gap-1.5">
            <TrophyIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span>أكثر الأدوار شيوعاً</span>
          </h4>
          <Leaderboard
            items={data.top_roles}
            valueKey="count"
            color="emerald"
            emptyText="لا توجد بيانات"
            testid="top-roles-list"
          />
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-2 inline-flex items-center gap-1.5">
            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-rose-500" />
            <span>أبطأ الأدوار</span>
          </h4>
          <Leaderboard
            items={data.slowest_roles}
            valueKey="expired_or_unused"
            color="rose"
            emptyText="لا توجد روابط منتهية"
            testid="slowest-roles-list"
          />
        </div>
      </div>
    </div>
  );
};

export default InviteAnalyticsDashboard;
