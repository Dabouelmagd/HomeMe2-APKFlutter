import React, { useEffect, useState, useMemo } from 'react';
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
  Legend,
} from 'recharts';
import {
  ArrowsRightLeftIcon,
  BuildingOffice2Icon,
  UsersIcon,
  WrenchScrewdriverIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const METRICS = [
  { key: 'residents',          label: 'السكان',           color: '#3b82f6', icon: UsersIcon },
  { key: 'monthly_revenue',    label: 'الإيرادات (ج.م)', color: '#10b981', icon: BanknotesIcon, currency: true },
  { key: 'pending_maintenance',label: 'صيانة معلّقة',     color: '#f59e0b', icon: WrenchScrewdriverIcon },
  { key: 'open_complaints',    label: 'شكاوى مفتوحة',     color: '#ef4444', icon: ExclamationTriangleIcon },
];

/**
 * CompoundsComparisonView — side-by-side cross-compound comparison for the
 * management company. Reads ``per_compound`` from the same backend
 * ``aggregated-stats`` endpoint, then renders:
 *   1) A toggle bar to pick the metric (residents / revenue / maint / complaints)
 *   2) A horizontal bar chart with per-compound values
 *   3) A sortable summary table beneath
 *   4) Export buttons (print → PDF via browser, CSV download)
 */
const CompoundsComparisonView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState('residents');
  const [sortBy, setSortBy] = useState('residents');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    axios.get(`${API}/company-admin/aggregated-stats`, getToken())
      .then((r) => { if (alive) setData(r.data); })
      .catch(() => { if (alive) toast.error('فشل تحميل المقارنة'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const fmt = (n, currency = false) => {
    if (n == null || isNaN(n)) return '0';
    const s = Number(n).toLocaleString('ar-EG', { maximumFractionDigits: 0 });
    return currency ? `${s} ج.م` : s;
  };

  const per = data?.per_compound || [];
  const totals = data?.totals || {};
  const activeMeta = METRICS.find((m) => m.key === activeMetric) || METRICS[0];

  // Sort the table independently from the chart's primary metric
  const sorted = useMemo(() => {
    const arr = [...per];
    arr.sort((a, b) => {
      const va = a[sortBy] || 0;
      const vb = b[sortBy] || 0;
      return sortDir === 'desc' ? vb - va : va - vb;
    });
    return arr;
  }, [per, sortBy, sortDir]);

  const chartData = useMemo(() => {
    return per
      .map((c) => ({
        name: c.name || '—',
        value: c[activeMetric] || 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [per, activeMetric]);

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const exportCSV = () => {
    const headers = ['الكمبوند', 'الموقع', ...METRICS.map((m) => m.label), 'وحدات إجمالية', 'وحدات مسكونة'];
    const rows = per.map((c) => [
      c.name || '',
      c.location || '',
      c.residents || 0,
      c.monthly_revenue || 0,
      c.pending_maintenance || 0,
      c.open_complaints || 0,
      c.total_units || 0,
      c.occupied_units || 0,
    ]);
    // Prepend a BOM so Excel opens UTF-8 Arabic correctly
    const csv = '\uFEFF' + [headers, ...rows]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dt = new Date().toISOString().slice(0, 10);
    a.download = `compound-comparison-${dt}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تحميل التقرير');
  };

  if (loading) {
    return (
      <div className="bg-gray-900/40 rounded-2xl p-8 text-center text-gray-400 text-sm animate-pulse">
        ⏳ جارٍ تحميل المقارنة...
      </div>
    );
  }

  if (per.length === 0) {
    return (
      <div className="bg-gray-900/40 rounded-2xl p-8 text-center text-gray-400 text-sm">
        لا توجد كمبوندات بعد. أضيفي أولاً كمبوندات لإدارتها.
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="compounds-comparison-view">
      {/* Header + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-white">
          <ArrowsRightLeftIcon className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-bold">مقارنة الكمبوندات ({per.length})</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg border border-gray-700 hover:border-cyan-500 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition"
            data-testid="comparison-print-btn"
          >
            <PrinterIcon className="h-4 w-4" />
            طباعة / PDF
          </button>
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center gap-1.5 transition"
            data-testid="comparison-csv-btn"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            تحميل CSV
          </button>
        </div>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="comparison-totals">
        {METRICS.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.key}
              className="rounded-xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-950 p-3"
            >
              <div className="flex items-center justify-between mb-1.5">
                <Icon className="h-4 w-4" style={{ color: m.color }} />
                <span className="text-[10px] text-gray-500 uppercase">إجمالي</span>
              </div>
              <div className="text-xl font-black text-white">{fmt(totals[m.key], m.currency)}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{m.label}</div>
            </div>
          );
        })}
      </div>

      {/* Metric switcher + chart */}
      <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-950 p-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-gray-400 ml-2">مقارنة بـ:</span>
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setActiveMetric(m.key)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                activeMetric === m.key
                  ? 'border-transparent text-white'
                  : 'border-gray-700 text-gray-400 hover:border-cyan-500 hover:text-cyan-300'
              }`}
              style={activeMetric === m.key ? { backgroundColor: m.color } : {}}
              data-testid={`comparison-metric-${m.key}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="h-72" data-testid="comparison-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 11, fill: '#cbd5e1' }}
                axisLine={false}
                tickLine={false}
                width={120}
              />
              <Tooltip
                cursor={{ fill: 'rgba(59,130,246,0.05)' }}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#fff',
                }}
                formatter={(v) => [fmt(v, activeMeta.currency), activeMeta.label]}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} fill={activeMeta.color} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sortable summary table */}
      <div className="rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-950 overflow-x-auto">
        <table className="w-full text-sm" data-testid="comparison-table">
          <thead className="bg-gray-950 text-xs text-gray-400 uppercase">
            <tr>
              <th className="px-4 py-3 text-start sticky right-0 bg-gray-950">
                <BuildingOffice2Icon className="h-4 w-4 inline ml-1" />
                الكمبوند
              </th>
              {METRICS.map((m) => (
                <th
                  key={m.key}
                  onClick={() => toggleSort(m.key)}
                  className="px-4 py-3 text-center cursor-pointer hover:text-cyan-300 transition select-none"
                  data-testid={`comparison-th-${m.key}`}
                >
                  {m.label}
                  {sortBy === m.key && (
                    <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
                  )}
                </th>
              ))}
              <th className="px-4 py-3 text-center">إشغال</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sorted.map((c) => {
              const occupancyPct = c.total_units > 0 ? Math.round((c.occupied_units / c.total_units) * 100) : 0;
              return (
                <tr key={c.id} className="hover:bg-gray-800/40 transition" data-testid={`comparison-row-${c.id}`}>
                  <td className="px-4 py-3 sticky right-0 bg-gray-950/95">
                    <div className="font-bold text-white">{c.name}</div>
                    {c.location && <div className="text-[10px] text-gray-500 mt-0.5">{c.location}</div>}
                  </td>
                  {METRICS.map((m) => (
                    <td key={m.key} className="px-4 py-3 text-center text-gray-200">
                      <span className="font-bold" style={{ color: c[m.key] > 0 ? m.color : '#475569' }}>
                        {fmt(c[m.key], m.currency)}
                      </span>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    {c.total_units > 0 ? (
                      <div className="inline-flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                            style={{ width: `${occupancyPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{occupancyPct}%</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-600">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CompoundsComparisonView;
