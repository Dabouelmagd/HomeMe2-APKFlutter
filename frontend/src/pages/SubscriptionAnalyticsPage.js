import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  CurrencyDollarIcon,
  UsersIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  XCircleIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import PageHero from '../components/shared/PageHero';
import MRRTrendChart from '../components/MRRTrendChart';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SeverityRow = ({ icon, label, value, accent = 'indigo', hint = null }) => (
  <div className={`bg-white border border-${accent}-100 rounded-xl p-4 flex items-center gap-3`}>
    <div className={`w-10 h-10 rounded-lg bg-${accent}-50 text-${accent}-600 flex items-center justify-center text-lg`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-black text-gray-900">{value}</p>
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  </div>
);

const SubscriptionAnalyticsPage = () => {
  const [summary, setSummary] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [migStats, setMigStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [inviting, setInviting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    try {
      const [s, c, m] = await Promise.all([
        axios.get(`${API}/super-admin/subscription-analytics/summary`, { headers }),
        axios.get(`${API}/subscription-migration/candidates?limit=100`, { headers }),
        axios.get(`${API}/subscription-migration/stats`, { headers }),
      ]);
      setSummary(s.data);
      setCandidates(c.data || []);
      setMigStats(m.data);
    } catch (e) {
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.company_id)));
    }
  };

  const handleSendInvites = async () => {
    if (selectedIds.size === 0) {
      toast.error('اختر شركة واحدة على الأقل');
      return;
    }
    if (!window.confirm(`سيتم إرسال دعوة الترقية لـ ${selectedIds.size} شركة. متابعة؟`)) return;
    setInviting(true);
    try {
      const res = await axios.post(
        `${API}/subscription-migration/invite`,
        { company_ids: Array.from(selectedIds) },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success(`✅ تم إرسال ${res.data.sent} دعوة` + (res.data.skipped > 0 ? ` · ${res.data.skipped} بدون بريد` : ''));
      setSelectedIds(new Set());
      fetchAll();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'فشل الإرسال');
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <PageHero icon="📊" title="تحليلات الاشتراكات" subtitle="..." accent="indigo" />
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400">...جاري التحميل</div>
      </div>
    );
  }

  if (!summary) return null;

  const fmt = (n) =>
    typeof n === 'number'
      ? n.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : n;

  return (
    <div className="p-6 max-w-7xl mx-auto" data-testid="subscription-analytics-page">
      <PageHero
        icon="📊"
        title="تحليلات الاشتراكات والإيرادات"
        subtitle="MRR · Churn · Trial Conversion · أدوات الترقية للتجديد التلقائي"
        accent="indigo"
      />

      {/* TOP TILES — MRR / ARR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg" data-testid="mrr-tile">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold opacity-90">إيراد شهري متكرر (MRR)</span>
            <CurrencyDollarIcon className="w-5 h-5" />
          </div>
          <p className="text-3xl font-black">{fmt(summary.mrr)}</p>
          <p className="text-[11px] opacity-90 mt-1">جنيه مصري</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold opacity-90">إيراد سنوي متوقع (ARR)</span>
            <ArrowTrendingUpIcon className="w-5 h-5" />
          </div>
          <p className="text-3xl font-black">{fmt(summary.arr)}</p>
          <p className="text-[11px] opacity-90 mt-1">جنيه مصري · MRR × 12</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold opacity-90">شركات على Auto-Renew</span>
            <CheckBadgeIcon className="w-5 h-5" />
          </div>
          <p className="text-3xl font-black">
            {summary.on_auto_renew_count}
            <span className="text-base opacity-75">/{summary.paying_count}</span>
          </p>
          <p className="text-[11px] opacity-90 mt-1">{summary.auto_renew_percent}% من المشتركين</p>
        </div>
      </div>

      {/* MRR Trend Chart */}
      <MRRTrendChart />

      {/* SECONDARY METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SeverityRow icon="📉" label="Churn Rate (30d)" value={`${summary.churn_rate_30d}%`} accent="rose" hint={`${summary.canceled_30d} ألغوا`} />
        <SeverityRow icon="🎯" label="Trial → Paid (30d)" value={`${summary.trial_to_paid_30d}%`} accent="emerald" hint={`${summary.trial_converted_30d}/${summary.trial_started_30d}`} />
        <SeverityRow icon="🆓" label="تجارب نشطة" value={summary.trial_count} accent="amber" />
        <SeverityRow icon="📦" label="Legacy (يدوي)" value={summary.legacy_count} accent="gray" hint="لم يفعّلوا Auto-Renew" />
      </div>

      {/* MRR BY PLAN */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">📊 MRR حسب الخطة</h3>
        <div className="space-y-3">
          {summary.mrr_by_plan.map((row) => (
            <div key={row.plan} className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-700 w-32 flex-shrink-0">{row.plan_name_ar}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden relative">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all"
                  style={{ width: `${row.share_percent}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white drop-shadow">
                  {fmt(row.mrr)} ج.م ({row.share_percent}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EXPIRING & CANCELING ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Expiring Soon */}
        <div className="bg-white border border-amber-200 rounded-2xl p-5">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-amber-600" />
            تنتهي خلال 7 أيام ({summary.expiring_soon.length})
          </h3>
          {summary.expiring_soon.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">لا يوجد اشتراكات تنتهي قريباً</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {summary.expiring_soon.map((c) => (
                <div key={c.company_id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{c.company_name}</p>
                    <p className="text-[11px] text-gray-500">{c.plan_name_ar} · ينتهي {c.expires_at?.slice(0, 10)}</p>
                  </div>
                  {c.is_auto_renewing ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">🔁 تلقائي</span>
                  ) : (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">⚠️ يدوي</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Canceling soon */}
        <div className="bg-white border border-rose-200 rounded-2xl p-5">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <XCircleIcon className="w-5 h-5 text-rose-600" />
            ملغية بنهاية الدورة ({summary.canceling_soon.length})
          </h3>
          {summary.canceling_soon.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">🎉 لا يوجد إلغاءات قادمة</p>
          ) : (
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {summary.canceling_soon.map((c) => (
                <div key={c.company_id} className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{c.company_name}</p>
                    <p className="text-[11px] text-gray-500">{c.plan_name_ar} · ينتهي {c.expires_at?.slice(0, 10)}</p>
                  </div>
                  <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">ملغي</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MIGRATION TOOL */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-2 border-indigo-200 rounded-2xl p-5 mb-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              🔁 أداة الترقية للتجديد التلقائي
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              {migStats?.legacy_one_time || 0} شركة لا تزال على الفوترة اليدوية. أرسل دعوة بريد للترقية لأي عدد منهم.
            </p>
            {migStats && (
              <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
                <span>📊 إجمالي: {migStats.total_active}</span>
                <span>·</span>
                <span className="text-emerald-700">🔁 تلقائي: {migStats.on_auto_renew}</span>
                <span>·</span>
                <span className="text-amber-700">📦 يدوي: {migStats.legacy_one_time}</span>
                <span>·</span>
                <span>دُعي قبلاً: {migStats.invited_at_least_once}</span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <button
              onClick={selectAll}
              className="text-[11px] text-indigo-700 hover:text-indigo-900 font-semibold"
              data-testid="migration-select-all"
            >
              {selectedIds.size === candidates.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </button>
            <button
              onClick={handleSendInvites}
              disabled={inviting || selectedIds.size === 0}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow disabled:opacity-50 inline-flex items-center gap-1.5"
              data-testid="migration-send-invites"
            >
              {inviting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <EnvelopeIcon className="w-4 h-4" />}
              إرسال دعوة لـ {selectedIds.size}
            </button>
          </div>
        </div>

        {candidates.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-sm text-gray-400">
            🎉 كل الشركات النشطة على التجديد التلقائي
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[10px] font-bold text-gray-600 uppercase sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-right w-8"></th>
                  <th className="px-3 py-2 text-right">الشركة</th>
                  <th className="px-3 py-2 text-right">الخطة</th>
                  <th className="px-3 py-2 text-right">ينتهي</th>
                  <th className="px-3 py-2 text-right">آخر دعوة</th>
                  <th className="px-3 py-2 text-center">دعوات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {candidates.map((c) => (
                  <tr
                    key={c.company_id}
                    className={`${selectedIds.has(c.company_id) ? 'bg-indigo-50' : 'hover:bg-gray-50'} cursor-pointer`}
                    onClick={() => toggleSelect(c.company_id)}
                    data-testid={`migration-row-${c.company_id}`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.company_id)}
                        onChange={() => toggleSelect(c.company_id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded text-indigo-600"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-sm font-semibold text-gray-900">{c.company_name}</div>
                      <div className="text-[10px] text-gray-500">{c.contact_email || '— لا يوجد بريد'}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700">{c.plan_name_ar}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{c.expires_at?.slice(0, 10) || '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {c.last_invited_at ? c.last_invited_at.slice(0, 10) : 'لم يُدع'}
                    </td>
                    <td className="px-3 py-2 text-xs text-center">
                      {c.invite_count > 0 ? (
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">
                          {c.invite_count}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionAnalyticsPage;
