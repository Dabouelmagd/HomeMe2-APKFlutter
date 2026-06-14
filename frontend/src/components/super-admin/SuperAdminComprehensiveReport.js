import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  BuildingOffice2Icon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UsersIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmt = (n) => Number(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 });
const fmtMoney = (n) => `${fmt(n)} ج.م`;

/**
 * SuperAdminComprehensiveReport — Feature #43.
 *
 * Hits GET /api/super-admin/comprehensive-report and renders:
 *   • Top KPI strip: total active companies, paid companies, lifetime revenue,
 *     churn rate (30d)
 *   • 12-month revenue area chart
 *   • Subscriptions breakdown by plan (table)
 *   • Top 10 most-active compounds (sortable table with activity score)
 */
const SuperAdminComprehensiveReport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const token = localStorage.getItem('token');
    axios
      .get(`${API}/super-admin/comprehensive-report?months=12`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => { if (alive) setData(res.data); })
      .catch(() => { if (alive) toast.error('فشل تحميل التقرير الشامل'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const exportCSV = () => {
    if (!data) return;
    const rev = data.revenue.trend_months || [];
    const headers = ['الشهر', 'الإيرادات (ج.م)'];
    const rows = rev.map((r) => [r.label, r.revenue]);
    const csv = '\uFEFF' + [headers, ...rows]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تحميل CSV');
  };

  if (loading || !data) {
    return (
      <div className="bg-gray-800 rounded-2xl p-8 text-center text-gray-400 text-sm animate-pulse">
        ⏳ جارٍ تحميل التقرير الشامل...
      </div>
    );
  }

  const { subscriptions, revenue, churn, top_compounds } = data;
  const monthOverMonth = revenue.last_month_egp > 0
    ? ((revenue.this_month_egp - revenue.last_month_egp) / revenue.last_month_egp) * 100
    : 0;

  // Sort plans for the by-plan table
  const planEntries = Object.entries(subscriptions.by_plan || {}).map(([plan, stats]) => ({
    plan,
    active: stats.active || 0,
    cancelled: stats.cancelled || 0,
    pending_payment: stats.pending_payment || 0,
  })).sort((a, b) => b.active - a.active);

  const planLabels = {
    starter: 'مجاني',
    basic: 'أساسي',
    pro: 'احترافي',
    premium: 'متقدم',
    company_startup: 'شركة ناشئة',
    company_business: 'شركة متوسطة',
    company_enterprise: 'شركة كبرى',
  };

  return (
    <div className="space-y-5" data-testid="comprehensive-report">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <ChartBarIcon className="h-6 w-6 text-purple-400" />
            تقرير تنفيذي شامل
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            تم التوليد: {new Date(data.generated_at).toLocaleString('ar-EG')}
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
          data-testid="report-csv-btn"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          تحميل CSV
        </button>
      </div>

      {/* Top KPI strip — 4 big cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="report-kpis">
        <KpiCard
          icon={BuildingOffice2Icon}
          color="from-blue-500 to-indigo-600"
          label="شركات نشطة"
          value={fmt(subscriptions.total_active_companies)}
          sub={`${fmt(subscriptions.total_paid_companies)} مدفوعة`}
        />
        <KpiCard
          icon={BanknotesIcon}
          color="from-emerald-500 to-teal-600"
          label="إيرادات هذا الشهر"
          value={fmtMoney(revenue.this_month_egp)}
          sub={
            monthOverMonth >= 0
              ? `▲ ${monthOverMonth.toFixed(1)}% عن الشهر السابق`
              : `▼ ${Math.abs(monthOverMonth).toFixed(1)}% عن الشهر السابق`
          }
          subColor={monthOverMonth >= 0 ? 'text-emerald-300' : 'text-rose-300'}
        />
        <KpiCard
          icon={ArrowTrendingUpIcon}
          color="from-amber-500 to-orange-600"
          label="إيرادات مدى الحياة"
          value={fmtMoney(revenue.lifetime_egp)}
          sub={`${fmt(subscriptions.total_active_companies)} شركة فعّالة`}
        />
        <KpiCard
          icon={ArrowTrendingDownIcon}
          color="from-rose-500 to-pink-600"
          label="معدل الـ Churn (30 يوم)"
          value={`${churn.rate_30d_percent}%`}
          sub={`${fmt(churn.cancelled_30d)} إلغاء آخر 30 يوم`}
        />
      </div>

      {/* 12-month revenue chart */}
      <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-950 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white">📈 الإيرادات الشهرية — آخر 12 شهر</h3>
          <span className="text-xs text-gray-500">{revenue.trend_months.length} شهر</span>
        </div>
        <div className="h-72" data-testid="report-revenue-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenue.trend_months} margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#cbd5e1' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => Number(v).toLocaleString('ar-EG', { notation: 'compact' })}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#fff',
                }}
                formatter={(v) => [fmtMoney(v), 'الإيرادات']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#a855f7"
                strokeWidth={2.5}
                fill="url(#rev-fill)"
                dot={{ r: 3, fill: '#a855f7' }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Subscriptions by plan */}
        <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-950 p-5">
          <h3 className="text-base font-bold text-white mb-3">🎟️ الاشتراكات حسب الخطة</h3>
          <div className="overflow-x-auto" data-testid="report-plans-table">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 uppercase border-b border-gray-800">
                <tr>
                  <th className="text-start py-2">الخطة</th>
                  <th className="text-center py-2">نشط</th>
                  <th className="text-center py-2">مُلغى</th>
                  <th className="text-center py-2">قيد الدفع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {planEntries.length === 0 && (
                  <tr><td colSpan="4" className="text-center py-6 text-gray-500">لا توجد بيانات</td></tr>
                )}
                {planEntries.map((p) => (
                  <tr key={p.plan} className="hover:bg-gray-800/40 transition">
                    <td className="py-2.5 font-bold text-white">{planLabels[p.plan] || p.plan}</td>
                    <td className="text-center text-emerald-400 font-bold">{fmt(p.active)}</td>
                    <td className="text-center text-rose-400 font-bold">{fmt(p.cancelled)}</td>
                    <td className="text-center text-amber-400 font-bold">{fmt(p.pending_payment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Churn summary */}
          <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3">
              <div className="text-rose-300 font-bold">معدل Churn 30 يوم</div>
              <div className="text-2xl font-black text-white mt-1">{churn.rate_30d_percent}%</div>
              <div className="text-rose-200/60 mt-0.5">{fmt(churn.cancelled_30d)} إلغاء</div>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
              <div className="text-amber-300 font-bold">معدل Churn 90 يوم</div>
              <div className="text-2xl font-black text-white mt-1">{churn.rate_90d_percent}%</div>
              <div className="text-amber-200/60 mt-0.5">{fmt(churn.cancelled_90d)} إلغاء</div>
            </div>
          </div>
        </div>

        {/* Top compounds */}
        <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-950 p-5">
          <h3 className="text-base font-bold text-white mb-3">🏆 أكثر 10 كمبوندات نشاطاً (آخر 30 يوم)</h3>
          <div className="overflow-x-auto" data-testid="report-top-compounds">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 uppercase border-b border-gray-800">
                <tr>
                  <th className="text-start py-2">الكمبوند</th>
                  <th className="text-center py-2"><UsersIcon className="h-3.5 w-3.5 inline" /> سكان</th>
                  <th className="text-center py-2">شكاوى</th>
                  <th className="text-center py-2">صيانة</th>
                  <th className="text-center py-2">نقاط النشاط</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {top_compounds.length === 0 && (
                  <tr><td colSpan="5" className="text-center py-6 text-gray-500">لا توجد بيانات</td></tr>
                )}
                {top_compounds.map((c, idx) => (
                  <tr key={c.compound_id} className="hover:bg-gray-800/40 transition">
                    <td className="py-2.5">
                      <div className="font-bold text-white text-xs">
                        {idx < 3 && <span className="ml-1.5">{['🥇', '🥈', '🥉'][idx]}</span>}
                        {c.compound_name}
                      </div>
                      <div className="text-[10px] text-gray-500">{c.company_name}</div>
                    </td>
                    <td className="text-center text-blue-400 font-bold">{fmt(c.residents)}</td>
                    <td className="text-center text-rose-400">{fmt(c.recent_complaints_30d)}</td>
                    <td className="text-center text-amber-400">{fmt(c.recent_maintenance_30d)}</td>
                    <td className="text-center text-purple-400 font-black">{fmt(c.activity_score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        <span className="text-[10px] text-gray-500 uppercase">KPI</span>
      </div>
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-[11px] text-gray-400 mt-0.5">{label}</div>
      {sub && <div className={`text-[10px] mt-1.5 font-bold ${subColor || 'text-gray-500'}`}>{sub}</div>}
    </div>
  </div>
);

export default SuperAdminComprehensiveReport;
