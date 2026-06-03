import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  EnvelopeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_OPTIONS = [
  { id: 'all', label: 'الكل', color: 'bg-gray-700' },
  { id: 'delivered', label: '✓ تم التسليم', color: 'bg-green-700' },
  { id: 'failed', label: '✗ فشل/Bounced', color: 'bg-red-700' },
];

const TYPE_LABELS = {
  verification: 'تأكيد بريد',
  welcome: 'ترحيب',
  credentials: 'بيانات دخول',
  password_reset: 'إعادة تعيين',
  security_alert: 'تنبيه أمني',
  notification: 'إشعار',
  generic: 'عام',
  unknown: 'غير معروف',
};

const EmailLogsTab = ({ token }) => {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [resendingId, setResendingId] = useState(null);
  const [scanningBounces, setScanningBounces] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const scanBouncesNow = async () => {
    setScanningBounces(true);
    try {
      const res = await axios.post(`${API}/super-admin/email-logs/check-bounces`, {}, { headers });
      const r = res.data;
      toast.success(
        `تم الفحص: ${r.matched_outbound} رسالة مُحدّثة كـ bounced من ${r.bounce_messages_seen} إشعار وصل (${r.scanned} رسالة إجمالاً)`
      );
      fetchAll();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.errors?.join('، ') || 'فشل الفحص';
      toast.error(`فحص الـ bounces فشل: ${msg}`);
    } finally {
      setScanningBounces(false);
    }
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        axios.get(`${API}/super-admin/email-logs/stats`, { headers }),
        axios.get(`${API}/super-admin/email-logs`, {
          headers,
          params: {
            status: statusFilter,
            email_type: typeFilter,
            search: search.trim() || undefined,
            limit: 200,
          },
        }),
      ]);
      setStats(statsRes.data);
      setLogs(logsRes.data.logs || []);
    } catch (err) {
      toast.error('تعذّر تحميل سجلات البريد');
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, typeFilter, search]);

  useEffect(() => {
    fetchAll();
    // intentional: refetch only when filters change, not on every fetchAll callback re-creation
  }, [statusFilter, typeFilter, fetchAll]);

  const handleResend = async (logId) => {
    if (!window.confirm('متأكد تريد إعادة إرسال هذه الرسالة؟')) return;
    setResendingId(logId);
    try {
      const res = await axios.post(`${API}/super-admin/email-logs/${logId}/resend`, {}, { headers });
      if (res.data.resent) {
        toast.success(`تم إعادة الإرسال (${res.data.type})`);
        fetchAll();
      } else {
        toast.warning('تم استدعاء الإرسال لكن SMTP رجّع false. راجع الـ logs.');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل إعادة الإرسال');
    } finally {
      setResendingId(null);
    }
  };

  const StatusBadge = ({ status }) => {
    if (status === 'delivered') {
      return (
        <span className="inline-flex items-center gap-1 bg-green-900 text-green-200 px-2 py-0.5 rounded-full text-xs font-medium">
          <CheckCircleIcon className="w-3 h-3" /> تم التسليم
        </span>
      );
    }
    if (status === 'bounced') {
      return (
        <span className="inline-flex items-center gap-1 bg-orange-900 text-orange-200 px-2 py-0.5 rounded-full text-xs font-medium">
          <XCircleIcon className="w-3 h-3" /> Bounced
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-red-900 text-red-200 px-2 py-0.5 rounded-full text-xs font-medium">
        <XCircleIcon className="w-3 h-3" /> فشل
      </span>
    );
  };

  return (
    <div className="space-y-6" data-testid="email-logs-tab">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <EnvelopeIcon className="w-6 h-6 text-indigo-400" />
            سجل البريد المُرسل
          </h3>
          <p className="text-gray-400 text-sm mt-1">جميع الرسائل المُرسلة من المنصة مع حالة التسليم والتفاصيل</p>
        </div>
        <button
          onClick={fetchAll}
          data-testid="email-logs-refresh"
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
        >
          <ArrowPathIcon className="w-4 h-4" />
          تحديث
        </button>
        <button
          onClick={scanBouncesNow}
          disabled={scanningBounces}
          data-testid="scan-bounces-button"
          className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow"
          title="افحص بريد الإرجاع الآن (IMAP)"
        >
          <EnvelopeIcon className="w-4 h-4" />
          {scanningBounces ? 'جاري الفحص…' : '🔍 فحص الـ Bounces الآن'}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="email-logs-stats">
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-xl p-4 border border-indigo-700">
            <div className="text-xs text-indigo-300 mb-1">آخر 7 أيام</div>
            <div className="text-3xl font-black text-white">{stats.last_7_days.total}</div>
            <div className="text-xs mt-1 flex gap-3">
              <span className="text-green-300">✓ {stats.last_7_days.delivered}</span>
              <span className="text-red-300">✗ {stats.last_7_days.failed}</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-xl p-4 border border-purple-700">
            <div className="text-xs text-purple-300 mb-1">آخر 30 يوم</div>
            <div className="text-3xl font-black text-white">{stats.last_30_days.total}</div>
            <div className="text-xs mt-1 flex gap-3">
              <span className="text-green-300">✓ {stats.last_30_days.delivered}</span>
              <span className="text-red-300">✗ {stats.last_30_days.failed}</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-xl p-4 border border-emerald-700">
            <div className="text-xs text-emerald-300 mb-1">معدل النجاح (30 يوم)</div>
            <div className="text-3xl font-black text-white">
              {stats.last_30_days.total
                ? `${Math.round((stats.last_30_days.delivered / stats.last_30_days.total) * 100)}%`
                : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              data-testid={`status-filter-${s.id}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                statusFilter === s.id ? `${s.color} text-white` : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {s.label}
            </button>
          ))}
          <div className="border-r border-gray-600 h-6 mx-1"></div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            data-testid="type-filter-select"
            className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-1.5 text-xs"
          >
            <option value="all">كل الأنواع</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); fetchAll(); }}
          className="flex gap-2"
        >
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث ببريد المستلم…"
              data-testid="email-search-input"
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg pr-10 pl-3 py-2 text-sm focus:border-indigo-500 outline-none"
            />
          </div>
          <button type="submit" data-testid="email-search-button" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm">
            بحث
          </button>
        </form>
      </div>

      {/* Logs Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">جاري التحميل…</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <EnvelopeIcon className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            لا توجد رسائل تطابق الفلتر الحالي.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900/50 text-xs text-gray-400 uppercase">
                <tr>
                  <th className="text-right px-4 py-3">الوقت</th>
                  <th className="text-right px-4 py-3">المستلم</th>
                  <th className="text-right px-4 py-3">النوع</th>
                  <th className="text-right px-4 py-3">الموضوع</th>
                  <th className="text-right px-4 py-3">الحالة</th>
                  <th className="text-right px-4 py-3">المدة</th>
                  <th className="text-right px-4 py-3">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {logs.map((log) => (
                  <tr key={log.id || `${log.to_email}-${log.timestamp}`} className="hover:bg-gray-700/50" data-testid={`email-log-row-${log.id || 'noid'}`}>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {new Date(log.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-white font-mono text-xs break-all max-w-[200px]">{log.to_email}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{TYPE_LABELS[log.email_type] || log.email_type}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs truncate max-w-[260px]" title={log.subject}>{log.subject}</td>
                    <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{log.duration_ms != null ? `${log.duration_ms}ms` : '—'}</td>
                    <td className="px-4 py-3">
                      {log.id && (log.status === 'failed' || log.email_type === 'verification' || log.email_type === 'welcome') ? (
                        <button
                          onClick={() => handleResend(log.id)}
                          disabled={resendingId === log.id}
                          data-testid={`resend-email-${log.id}`}
                          className="flex items-center gap-1 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white px-2.5 py-1 rounded text-xs"
                          title="إعادة الإرسال"
                        >
                          <PaperAirplaneIcon className="w-3 h-3" />
                          {resendingId === log.id ? 'جاري…' : 'أعد إرسال'}
                        </button>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Failure Details (last 5 failed/bounced) */}
      {logs.some((l) => !l.success && (l.error || l.status === 'bounced')) && (
        <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-4">
          <h4 className="font-bold text-red-300 mb-2 flex items-center gap-2 text-sm">
            <XCircleIcon className="w-4 h-4" /> أحدث الأخطاء و الـ Bounces (للتشخيص)
          </h4>
          <div className="space-y-2 text-xs">
            {logs.filter((l) => !l.success).slice(0, 5).map((l, i) => (
              <div key={i} className="bg-gray-900/60 rounded p-2">
                <div className="text-gray-400 mb-1">
                  {l.to_email} · {new Date(l.timestamp).toLocaleString('ar-EG')}
                  {l.status === 'bounced' && (
                    <span className="ml-2 bg-orange-900 text-orange-200 px-1.5 py-0.5 rounded text-[10px]">BOUNCED</span>
                  )}
                </div>
                <div className="text-red-300 font-mono text-[11px] break-all">{l.bounce_reason || l.error || '(no detail)'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailLogsTab;
