import React, { useEffect, useState, useMemo } from 'react';
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
  Legend,
} from 'recharts';
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const METRICS = [
  { key: 'revenue',     label: 'الإيرادات (ج.م)', icon: BanknotesIcon,           currency: true },
  { key: 'residents',   label: 'السكان',           icon: UsersIcon,               currency: false },
  { key: 'complaints',  label: 'الشكاوى الجديدة', icon: ExclamationTriangleIcon, currency: false },
  { key: 'maintenance', label: 'طلبات الصيانة',    icon: WrenchScrewdriverIcon,   currency: false },
];

// Distinct, accessible palette — first 12 compounds get a unique color
const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
  '#14b8a6', '#f97316', '#06b6d4', '#a855f7', '#84cc16', '#eab308',
];

/**
 * CompoundsTrendChart — Feature #36
 * Multi-line trend chart: one line per compound, switchable metric over 6 months.
 */
const CompoundsTrendChart = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState('revenue');
  const [hidden, setHidden] = useState({});  // { compound_id: true } -> hide that line

  useEffect(() => {
    let alive = true;
    setLoading(true);
    axios.get(`${API}/company-admin/compounds-trend?months=6`, getToken())
      .then((r) => { if (alive) setData(r.data); })
      .catch(() => { if (alive) toast.error('فشل تحميل الاتجاهات'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const months = data?.months || [];
  const compounds = data?.compounds || [];
  const activeMeta = METRICS.find((m) => m.key === metric) || METRICS[0];

  // Build a row per month, each compound becomes a column
  const chartData = useMemo(() => {
    return months.map((m, idx) => {
      const row = { label: m.label };
      compounds.forEach((c) => {
        const p = c.points?.[idx];
        row[c.compound_id] = p ? (p[metric] || 0) : 0;
      });
      return row;
    });
  }, [months, compounds, metric]);

  const fmt = (n) => {
    if (n == null || isNaN(n)) return '0';
    const s = Number(n).toLocaleString('ar-EG', { maximumFractionDigits: 0 });
    return activeMeta.currency ? `${s} ج.م` : s;
  };

  const toggleCompound = (cid) => {
    setHidden((prev) => ({ ...prev, [cid]: !prev[cid] }));
  };

  if (loading) {
    return (
      <div className="bg-gray-900/40 rounded-2xl p-8 text-center text-gray-400 text-sm animate-pulse">
        ⏳ جارٍ تحميل الاتجاهات...
      </div>
    );
  }

  if (compounds.length === 0) {
    return (
      <div className="bg-gray-900/40 rounded-2xl p-8 text-center text-gray-400 text-sm">
        لا توجد كمبوندات لرسم اتجاهاتها بعد.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="compounds-trend-chart">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-white">
          <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-bold">اتجاهات الأشهر الستة الماضية</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {METRICS.map((m) => {
            const Icon = m.icon;
            const active = metric === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 transition ${
                  active
                    ? 'bg-emerald-600 border-transparent text-white'
                    : 'border-gray-700 text-gray-400 hover:border-emerald-500 hover:text-emerald-300'
                }`}
                data-testid={`trend-metric-${m.key}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Compound legend with click-to-toggle */}
      <div className="flex flex-wrap gap-2" data-testid="trend-legend">
        {compounds.map((c, idx) => {
          const color = PALETTE[idx % PALETTE.length];
          const isHidden = hidden[c.compound_id];
          return (
            <button
              key={c.compound_id}
              onClick={() => toggleCompound(c.compound_id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition ${
                isHidden
                  ? 'opacity-40 border-gray-700 text-gray-500'
                  : 'border-gray-700 text-gray-200 hover:border-gray-500'
              }`}
              data-testid={`trend-legend-${c.compound_id}`}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-full ml-1.5 align-middle"
                style={{ backgroundColor: color }}
              />
              {c.name}
            </button>
          );
        })}
      </div>

      <div className="h-80 rounded-2xl border border-gray-700 bg-gradient-to-br from-gray-900 to-gray-950 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#cbd5e1' }}
              axisLine={false}
              tickLine={false}
            />
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
              formatter={(v, key) => {
                const c = compounds.find((x) => x.compound_id === key);
                return [fmt(v), c?.name || key];
              }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: 11, color: '#cbd5e1' }}
              formatter={(v) => {
                const c = compounds.find((x) => x.compound_id === v);
                return c?.name || v;
              }}
            />
            {compounds.map((c, idx) => {
              if (hidden[c.compound_id]) return null;
              const color = PALETTE[idx % PALETTE.length];
              return (
                <Line
                  key={c.compound_id}
                  type="monotone"
                  dataKey={c.compound_id}
                  name={c.compound_id}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: color }}
                  activeDot={{ r: 5 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CompoundsTrendChart;
