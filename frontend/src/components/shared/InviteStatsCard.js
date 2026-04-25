import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  TicketIcon,
  CheckBadgeIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const StatTile = ({ label, value, icon: Icon, tone = 'gray', testid }) => {
  const tones = {
    gray: 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800',
    rose: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`} data-testid={testid}>
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider opacity-80">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <div className="mt-1 text-xl font-extrabold">{value}</div>
    </div>
  );
};

/**
 * InviteStatsCard — compact dashboard showing aggregated invite counts
 * across compound + family invitations (RBAC-scoped on the backend).
 */
const InviteStatsCard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await axios.get(`${API}/invite-stats`, auth());
        if (alive) setStats(res.data);
      } catch (e) {
        if (alive) setErr(e?.response?.data?.detail || 'تعذر تحميل الإحصائيات');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    // Refresh on any invite mutation
    const refresh = async () => {
      try {
        const res = await axios.get(`${API}/invite-stats`, auth());
        if (alive) setStats(res.data);
      } catch { /* ignore */ }
    };
    window.addEventListener('inviteStatsRefresh', refresh);
    return () => { alive = false; window.removeEventListener('inviteStatsRefresh', refresh); };
  }, []);

  if (loading) return <div className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" data-testid="invite-stats-loading" />;
  if (err) return null;
  if (!stats) return null;

  const cmp = stats.compound || {};
  const fam = stats.family || {};
  const totalInvites = (cmp.total || 0) + (fam.total || 0);
  const totalActive = (cmp.active || 0) + (fam.active || 0);
  const totalAcceptances = (cmp.total_acceptances || 0) + (fam.total_acceptances || 0);
  const conversionPct = stats.conversion_rate ? Math.round(stats.conversion_rate * 100) : 0;

  // Hide the card entirely if there are no invites yet (avoids empty zero-state noise)
  if (totalInvites === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4" data-testid="invite-stats-card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white inline-flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4 text-pink-500" />
            <span>إحصائيات الدعوات</span>
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">نظرة سريعة على روابط الدعوة في نطاقك</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{stats.scope}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <StatTile label="إجمالي الروابط" value={totalInvites} icon={TicketIcon} tone="indigo" testid="stat-total" />
        <StatTile label="نشطة" value={totalActive} icon={CheckBadgeIcon} tone="emerald" testid="stat-active" />
        <StatTile label="انضمّوا" value={totalAcceptances} icon={UsersIcon} tone="amber" testid="stat-accepted" />
        <StatTile label="نسبة التحويل" value={`${conversionPct}%`} icon={ChartBarIcon} tone="rose" testid="stat-conversion" />
      </div>

      {/* Per-collection breakdown — collapsed by default; exposes detail when there are entries in both buckets */}
      {(cmp.total > 0 && fam.total > 0) && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2 flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">دعوات المجمعات</span>
            <span className="font-bold text-gray-900 dark:text-white">{cmp.active}/{cmp.total} نشط</span>
          </div>
          <div className="rounded-lg border border-gray-100 dark:border-gray-800 px-3 py-2 flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">دعوات الأسرة</span>
            <span className="font-bold text-gray-900 dark:text-white">{fam.active}/{fam.total} نشط</span>
          </div>
        </div>
      )}

      {/* Tiny status row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500 dark:text-gray-400">
        {(cmp.expired + fam.expired) > 0 && <span className="inline-flex items-center gap-1"><ClockIcon className="w-3 h-3" /> منتهية: {cmp.expired + fam.expired}</span>}
        {(cmp.used_up + fam.used_up) > 0 && <span className="inline-flex items-center gap-1">مستوفاة: {cmp.used_up + fam.used_up}</span>}
        {(cmp.revoked + fam.revoked) > 0 && <span className="inline-flex items-center gap-1"><XCircleIcon className="w-3 h-3" /> ملغاة: {cmp.revoked + fam.revoked}</span>}
      </div>
    </div>
  );
};

export default InviteStatsCard;
