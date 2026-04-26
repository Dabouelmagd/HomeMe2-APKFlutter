import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ClipboardDocumentListIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserCircleIcon,
  GlobeAltIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const ACTION_META = {
  'auth.login': { icon: '🔐', label: 'تسجيل دخول', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'invite.create': { icon: '📨', label: 'إنشاء دعوة', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'invite.revoke': { icon: '🚫', label: 'إلغاء دعوة', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  'user.delete': { icon: '🗑️', label: 'حذف مستخدم', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  'user.update': { icon: '✏️', label: 'تعديل مستخدم', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'role.change': { icon: '👑', label: 'تغيير صلاحية', color: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const formatDateTime = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
};

const StatTile = ({ label, value, gradient, testId }) => (
  <div className={`rounded-xl p-4 text-white shadow-sm ${gradient}`} data-testid={testId}>
    <div className="text-3xl font-extrabold">{value}</div>
    <div className="text-xs mt-1 opacity-90">{label}</div>
  </div>
);

const AuditRow = ({ entry }) => {
  const [open, setOpen] = useState(false);
  const meta = ACTION_META[entry.action] || { icon: '📝', label: entry.action, color: 'bg-gray-100 text-gray-700 border-gray-200' };
  const hasDetails = entry.details && Object.keys(entry.details).length > 0;
  const hasBefore = entry.before && Object.keys(entry.before).length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 mb-2 hover:shadow-sm transition-shadow" data-testid={`audit-row-${entry.id}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold border px-2 py-1 rounded-md ${meta.color}`}>
            <span>{meta.icon}</span>
            <span>{meta.label}</span>
          </span>
          {entry.success === false && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
              <XCircleIcon className="w-3 h-3" /> فشل
            </span>
          )}
          {entry.success === true && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
              <CheckCircleIcon className="w-3 h-3" /> نجح
            </span>
          )}
        </div>
        <div className="text-[11px] text-gray-500 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1"><UserCircleIcon className="w-3.5 h-3.5" />{entry.actor_full_name || entry.actor_username || '—'}{entry.actor_role ? ` (${entry.actor_role})` : ''}</span>
          {entry.ip && <span className="inline-flex items-center gap-1 font-mono"><GlobeAltIcon className="w-3.5 h-3.5" />{entry.ip}</span>}
          <span>{formatDateTime(entry.at)}</span>
        </div>
      </div>
      {(hasDetails || hasBefore) && (
        <div className="mt-2">
          <button onClick={() => setOpen((v) => !v)} className="text-[11px] text-gray-500 hover:text-gray-800 inline-flex items-center gap-1" data-testid={`audit-details-toggle-${entry.id}`}>
            {open ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
            <span>{open ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}</span>
          </button>
          {open && (
            <div className="mt-2 space-y-1 text-[11px] bg-gray-50 border border-gray-100 rounded-lg p-2">
              {entry.target_id && <div className="font-mono text-gray-600">🎯 target: <code>{entry.target_type}/{entry.target_id}</code></div>}
              {hasDetails && <div><span className="font-bold text-gray-700">تفاصيل:</span> <code className="text-[10px]">{JSON.stringify(entry.details)}</code></div>}
              {hasBefore && <div><span className="font-bold text-rose-700">قبل:</span> <code className="text-[10px]">{JSON.stringify(entry.before).slice(0, 300)}</code></div>}
              {entry.ua && <div className="text-gray-400 truncate" title={entry.ua}>UA: {entry.ua.slice(0, 80)}...</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AuditLogPage = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [actionFilter, setActionFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState('all'); // all | success | failed

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ days: String(days), limit: '100' });
      if (actionFilter) params.set('action', actionFilter);
      if (successFilter !== 'all') params.set('success', successFilter === 'success' ? 'true' : 'false');
      const [logs, sum] = await Promise.all([
        axios.get(`${API}/audit-logs?${params}`, auth()),
        axios.get(`${API}/audit-logs/summary?days=${days}`, auth()),
      ]);
      setItems(logs.data?.items || []);
      setTotal(logs.data?.total || 0);
      setSummary(sum.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل تحميل السجل');
    } finally {
      setLoading(false);
    }
  }, [days, actionFilter, successFilter]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    if (!items.length) { toast.error('لا توجد بيانات للتصدير'); return; }
    const header = ['at', 'action', 'actor_username', 'actor_role', 'target_type', 'target_id', 'success', 'ip'];
    const rows = items.map((i) => header.map((h) => `"${(i[h] ?? '').toString().replace(/"/g, '""')}"`).join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    toast.success('تم تصدير CSV');
  };

  const distinctActions = useMemo(() => {
    const s = new Set();
    items.forEach((i) => i.action && s.add(i.action));
    if (summary?.top_actions) summary.top_actions.forEach((a) => s.add(a.action));
    return Array.from(s).sort();
  }, [items, summary]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen" data-testid="audit-log-page">
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
              <ClipboardDocumentListIcon className="h-7 w-7 text-indigo-500" />
              سجل التدقيق (Audit Log)
            </h1>
            <p className="text-sm text-gray-500 mt-1">يسجل كل العمليات الحساسة (تسجيل دخول، دعوات، حذف، تغيير صلاحيات...) مع IP والفاعل والوقت</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="px-3 py-2 text-sm border border-gray-300 rounded-lg" data-testid="days-filter">
              <option value={1}>آخر 24 ساعة</option>
              <option value={7}>آخر 7 أيام</option>
              <option value={30}>آخر 30 يوم</option>
              <option value={90}>آخر 90 يوم</option>
              <option value={180}>آخر 6 أشهر</option>
            </select>
            <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium disabled:opacity-50" data-testid="audit-reload">
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium" data-testid="audit-export">
              <ArrowDownTrayIcon className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <StatTile label="إجمالي الأحداث" value={summary.total} gradient="bg-gradient-to-br from-indigo-600 to-purple-700" testId="stat-audit-total" />
            <StatTile label="❌ فشل" value={summary.fail_total} gradient="bg-gradient-to-br from-rose-500 to-pink-600" testId="stat-audit-fails" />
            <StatTile label="✅ نجح" value={summary.total - summary.fail_total} gradient="bg-gradient-to-br from-emerald-500 to-green-600" testId="stat-audit-success" />
            <StatTile label="مستخدمين فاعلين" value={(summary.top_actors || []).length} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" testId="stat-audit-actors" />
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2" data-testid="audit-filters">
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-300 rounded-lg" data-testid="action-filter">
          <option value="">كل العمليات</option>
          {distinctActions.map((a) => <option key={a} value={a}>{(ACTION_META[a]?.icon || '📝') + ' ' + (ACTION_META[a]?.label || a)}</option>)}
        </select>
        {[
          { k: 'all', t: 'الكل' },
          { k: 'success', t: '✅ نجح' },
          { k: 'failed', t: '❌ فشل' },
        ].map((s) => (
          <button key={s.k} onClick={() => setSuccessFilter(s.k)} className={`px-3 py-2 rounded-full text-sm font-medium ${successFilter === s.k ? 'bg-indigo-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} data-testid={`success-filter-${s.k}`}>{s.t}</button>
        ))}
        <span className="text-xs text-gray-500 mr-auto">الإجمالي: <strong>{total}</strong> حدث</span>
      </div>

      {/* Top actors / actions */}
      {summary && summary.top_actors?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-bold text-gray-500 mb-2">⚡ أكثر العمليات</div>
            <div className="space-y-1">
              {summary.top_actions.slice(0, 5).map((a) => (
                <div key={a.action} className="flex items-center justify-between text-xs">
                  <span>{ACTION_META[a.action]?.icon || '📝'} {ACTION_META[a.action]?.label || a.action}</span>
                  <span className="font-bold">{a.count}{a.fails > 0 && <span className="text-rose-600 mr-1">({a.fails} فشل)</span>}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-bold text-gray-500 mb-2">👤 أكثر المستخدمين نشاطاً</div>
            <div className="space-y-1">
              {summary.top_actors.slice(0, 5).map((a) => (
                <div key={a.actor_id} className="flex items-center justify-between text-xs">
                  <span>{a.username}{a.role && <span className="text-gray-400 mr-1">({a.role})</span>}</span>
                  <span className="font-bold">{a.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center" data-testid="audit-empty">
          <ChartBarIcon className="w-14 h-14 text-gray-300 mx-auto mb-2" />
          <p className="text-base font-medium text-gray-700">لا توجد أحداث في هذا الفلتر</p>
        </div>
      ) : (
        <div data-testid="audit-list">{items.map((e) => <AuditRow key={e.id} entry={e} />)}</div>
      )}
    </div>
  );
};

export default AuditLogPage;
