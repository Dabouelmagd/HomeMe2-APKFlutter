import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  GlobeAltIcon,
  UserIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmt = (n) => Number(n || 0).toLocaleString('ar-EG');

/**
 * SecurityInsights — Feature #49
 *
 * Dashboard showing brute-force / suspicious activity from `login_attempts`.
 * Backed by GET /api/super-admin/security-insights.
 */
const SecurityInsights = () => {
  const [data, setData] = useState(null);
  const [bans, setBans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [windowHours, setWindowHours] = useState(24);

  const load = (hours) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${API}/super-admin/security-insights?hours=${hours}`, { headers }),
      axios.get(`${API}/super-admin/banned-ips`, { headers }),
    ])
      .then(([insights, bansRes]) => {
        setData(insights.data);
        setBans(bansRes.data);
      })
      .catch(() => toast.error('فشل تحميل لوحة الأمان'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(windowHours); }, [windowHours]);

  const unbanIp = async (ip) => {
    if (!window.confirm(`هل أنت متأكد من رفع الحظر عن ${ip}؟`)) return;
    try {
      await axios.delete(`${API}/super-admin/banned-ips/${encodeURIComponent(ip)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      toast.success(`تم رفع الحظر عن ${ip}`);
      load(windowHours);
    } catch (e) {
      toast.error('فشل رفع الحظر');
    }
  };

  if (loading || !data) {
    return (
      <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-400 text-sm animate-pulse">
        ⏳ جارٍ تحميل بيانات الأمان...
      </div>
    );
  }

  const { summary, top_failed_ips, top_targeted_users, hourly_distribution, recent_failures, currently_locked } = data;

  return (
    <div className="space-y-5" data-testid="security-insights">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <ShieldExclamationIcon className="h-6 w-6 text-rose-400" />
            رؤى الأمان والهجمات
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            النافذة الزمنية: آخر {windowHours} ساعة · تم التوليد:{' '}
            {new Date(data.generated_at).toLocaleString('ar-EG')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={windowHours}
            onChange={(e) => setWindowHours(parseInt(e.target.value, 10))}
            className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-1.5"
            data-testid="security-window-select"
          >
            <option value={1}>آخر ساعة</option>
            <option value={6}>آخر 6 ساعات</option>
            <option value={24}>آخر 24 ساعة</option>
            <option value={168}>آخر 7 أيام</option>
            <option value={720}>آخر 30 يوم</option>
          </select>
          <button
            onClick={() => load(windowHours)}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
            data-testid="security-refresh-btn"
          >
            <ArrowPathIcon className="h-4 w-4" />
            تحديث
          </button>
        </div>
      </div>

      {/* Summary KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="security-summary">
        <KpiCard
          icon={ExclamationTriangleIcon}
          color="from-rose-500 to-red-600"
          label="محاولات فاشلة"
          value={fmt(summary.failed)}
          sub={`${summary.failure_rate_percent}% معدل الفشل`}
          subColor="text-rose-300"
        />
        <KpiCard
          icon={LockClosedIcon}
          color="from-amber-500 to-orange-600"
          label="IPs مشبوهة"
          value={fmt(summary.suspicious_ips_count)}
          sub={`من إجمالي ${fmt(summary.unique_ips)} IP فريد`}
        />
        <KpiCard
          icon={ShieldExclamationIcon}
          color="from-purple-500 to-fuchsia-600"
          label="حسابات مقفولة الآن"
          value={fmt(currently_locked.length)}
          sub="بسبب تجاوز حد المحاولات"
          subColor={currently_locked.length > 0 ? 'text-rose-300' : 'text-emerald-300'}
        />
        <KpiCard
          icon={GlobeAltIcon}
          color="from-emerald-500 to-teal-600"
          label="إجمالي المحاولات"
          value={fmt(summary.total_attempts)}
          sub={`${fmt(summary.success)} نجاح`}
          subColor="text-emerald-300"
        />
      </div>

      {/* Currently locked alert banner */}
      {currently_locked.length > 0 && (
        <div className="rounded-2xl border-2 border-rose-500/40 bg-rose-500/10 p-4" data-testid="security-locked-banner">
          <div className="flex items-start gap-3">
            <LockClosedIcon className="h-6 w-6 text-rose-400 shrink-0" />
            <div className="flex-1">
              <div className="text-rose-200 font-black text-sm mb-1">
                🚨 تنبيه: {currently_locked.length} حساب مقفول حالياً
              </div>
              <div className="text-rose-100/70 text-xs">
                هذه الحسابات تجاوزت 5 محاولات فاشلة خلال آخر 15 دقيقة:
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {currently_locked.slice(0, 10).map((u) => (
                  <span
                    key={u.username}
                    className="px-2 py-0.5 rounded-md bg-rose-500/30 text-rose-100 text-[11px] font-bold"
                  >
                    {u.username} ({u.failed_attempts})
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-banned IPs (Feature #53) */}
      <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-950 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <LockClosedIcon className="h-5 w-5 text-rose-400" />
            🚫 IPs محظورة تلقائياً
            {bans?.active?.length > 0 && (
              <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                {bans.active.length}
              </span>
            )}
          </h3>
          <span className="text-[11px] text-gray-500">
            ≥20 محاولة/ساعة · حظر 24 ساعة
          </span>
        </div>
        <div className="overflow-x-auto" data-testid="security-banned-ips">
          {!bans || bans.active.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              ✅ لا توجد IPs محظورة حالياً
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 uppercase border-b border-gray-800">
                <tr>
                  <th className="text-start py-2">IP</th>
                  <th className="text-center py-2">المحاولات</th>
                  <th className="text-center py-2">حُظر منذ</th>
                  <th className="text-center py-2">ينتهي</th>
                  <th className="text-center py-2">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {bans.active.map((b) => (
                  <tr key={b.ip} className="hover:bg-gray-800/40">
                    <td className="py-2.5 font-mono text-rose-300 font-bold">{b.ip}</td>
                    <td className="text-center text-rose-400 font-bold">{fmt(b.failed_attempts)}</td>
                    <td className="text-center text-[11px] text-gray-400">
                      {b.banned_at ? new Date(b.banned_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'}
                    </td>
                    <td className="text-center text-[11px] text-amber-400">
                      {b.expires_at ? new Date(b.expires_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => unbanIp(b.ip)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-[11px] font-bold border border-emerald-600/30"
                        data-testid={`unban-btn-${b.ip}`}
                      >
                        رفع الحظر
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Hourly distribution chart */}
      <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-950 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-amber-400" />
            توزّع المحاولات الفاشلة (24 ساعة)
          </h3>
        </div>
        <div className="h-56" data-testid="security-hourly-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourly_distribution} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#fff' }}
                formatter={(v) => [v, 'محاولات فاشلة']}
                cursor={{ fill: 'rgba(244, 63, 94, 0.1)' }}
              />
              <Bar dataKey="failed" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top suspicious IPs */}
        <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-950 p-5">
          <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <GlobeAltIcon className="h-5 w-5 text-rose-400" />
            IPs مشبوهة (3+ محاولات فاشلة)
          </h3>
          <div className="overflow-x-auto" data-testid="security-top-ips">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 uppercase border-b border-gray-800">
                <tr>
                  <th className="text-start py-2">IP</th>
                  <th className="text-center py-2">محاولات</th>
                  <th className="text-center py-2">حسابات مستهدفة</th>
                  <th className="text-center py-2">آخر محاولة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {top_failed_ips.length === 0 && (
                  <tr><td colSpan="4" className="text-center py-6 text-gray-500">لا يوجد نشاط مشبوه</td></tr>
                )}
                {top_failed_ips.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-800/40">
                    <td className="py-2.5 font-mono text-xs text-rose-300 font-bold">{row.ip}</td>
                    <td className="text-center text-rose-400 font-bold">{fmt(row.failed_attempts)}</td>
                    <td className="text-center text-amber-400 font-bold">
                      {fmt(row.unique_usernames_attacked)}
                      <div className="text-[10px] text-gray-500 font-normal mt-0.5 truncate max-w-[140px] mx-auto">
                        {(row.usernames_sample || []).join(', ')}
                      </div>
                    </td>
                    <td className="text-center text-[11px] text-gray-400">
                      {row.last_attempt ? new Date(row.last_attempt).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top targeted users */}
        <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-950 p-5">
          <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-amber-400" />
            الحسابات الأكثر استهدافاً
          </h3>
          <div className="overflow-x-auto" data-testid="security-top-users">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 uppercase border-b border-gray-800">
                <tr>
                  <th className="text-start py-2">اسم المستخدم</th>
                  <th className="text-center py-2">محاولات</th>
                  <th className="text-center py-2">IPs</th>
                  <th className="text-center py-2">موجود؟</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {top_targeted_users.length === 0 && (
                  <tr><td colSpan="4" className="text-center py-6 text-gray-500">لا توجد حسابات مستهدفة</td></tr>
                )}
                {top_targeted_users.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-800/40">
                    <td className="py-2.5 text-xs font-bold text-white truncate max-w-[120px]">{row.username}</td>
                    <td className="text-center text-rose-400 font-bold">{fmt(row.failed_attempts)}</td>
                    <td className="text-center text-purple-400 font-bold">{fmt(row.unique_ips)}</td>
                    <td className="text-center">
                      {row.user_exists ? (
                        <span className="text-[10px] text-emerald-400 font-bold">✓ نعم</span>
                      ) : (
                        <span className="text-[10px] text-gray-500" title="حساب غير موجود — احتمال harvesting">✗ لا</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent failures forensic table */}
      <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-950 p-5">
        <h3 className="text-base font-bold text-white mb-3">📋 آخر 50 محاولة فاشلة</h3>
        <div className="overflow-x-auto max-h-96" data-testid="security-recent-failures">
          <table className="w-full text-xs">
            <thead className="text-[10px] text-gray-400 uppercase border-b border-gray-800 sticky top-0 bg-gray-950">
              <tr>
                <th className="text-start py-2">الوقت</th>
                <th className="text-start py-2">اسم المستخدم</th>
                <th className="text-start py-2">IP</th>
                <th className="text-start py-2">User Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {recent_failures.length === 0 && (
                <tr><td colSpan="4" className="text-center py-6 text-gray-500">لا توجد محاولات فاشلة في هذه النافذة</td></tr>
              )}
              {recent_failures.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-800/40">
                  <td className="py-1.5 text-gray-400 whitespace-nowrap">
                    {row.at ? new Date(row.at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit' }) : '—'}
                  </td>
                  <td className="py-1.5 font-bold text-white">{row.username}</td>
                  <td className="py-1.5 font-mono text-rose-300">{row.ip}</td>
                  <td className="py-1.5 text-gray-500 truncate max-w-[300px]" title={row.user_agent}>{row.user_agent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const KpiCard = ({ icon: Icon, color, label, value, sub, subColor }) => (
  <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-950 p-4 relative overflow-hidden">
    <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${color} opacity-20 blur-2xl`} />
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-5 w-5 text-white/80" />
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-[11px] text-gray-400 mt-0.5">{label}</div>
      {sub && <div className={`text-[10px] mt-1.5 font-bold ${subColor || 'text-gray-500'}`}>{sub}</div>}
    </div>
  </div>
);

export default SecurityInsights;
