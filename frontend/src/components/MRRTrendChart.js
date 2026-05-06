import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from 'recharts';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, SparklesIcon } from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MRRTrendChart = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrend = async () => {
      try {
        const res = await axios.get(`${API}/subscription-analytics/mrr-trend?months=12&forecast_months=3`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setData(res.data);
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    };
    fetchTrend();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-1/3 mb-4" />
        <div className="h-72 bg-gray-50 rounded-xl" />
      </div>
    );
  }

  if (!data || !data.history || data.history.length === 0) return null;

  // Combine history + forecast for the chart
  const merged = [
    ...data.history.map((h) => ({ month: h.month_label, actual: h.mrr, forecast: null })),
    ...data.forecast.map((f) => ({ month: f.month_label, actual: null, forecast: f.mrr })),
  ];

  const lastActual = data.history[data.history.length - 1];
  const isPositiveGrowth = data.growth_rate_3m >= 0;

  const formatMoney = (val) => {
    if (val == null) return '';
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toLocaleString();
  };

  const tooltipFormatter = (value, name) => {
    if (value == null) return ['—', name];
    const label = name === 'actual' ? 'فعلي' : 'متوقع';
    return [`${Math.round(value).toLocaleString()} ج.م`, label];
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6" data-testid="mrr-trend-chart">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-violet-600" />
            تطوّر الإيرادات (MRR Trend) — آخر 12 شهر + توقعات 3 شهور
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            الخط المتصل = بيانات فعلية · الخط المتقطع = توقع AI بناءً على معدل النمو
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
          isPositiveGrowth ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {isPositiveGrowth ? <ArrowTrendingUpIcon className="w-4 h-4" /> : <ArrowTrendingDownIcon className="w-4 h-4" />}
          {isPositiveGrowth ? '+' : ''}{data.growth_rate_3m}% MoM (آخر 3 شهور)
        </div>
      </div>

      {/* Chart */}
      <div className="h-72 -mx-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={merged} margin={{ top: 10, right: 30, left: 30, bottom: 5 }}>
            <defs>
              <linearGradient id="mrr-actual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="mrr-forecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ec4899" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ec4899" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={formatMoney} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8, color: '#fff' }}
              formatter={tooltipFormatter}
              labelStyle={{ color: '#cbd5e1' }}
            />
            {/* Reference line marking "now" */}
            {lastActual && (
              <ReferenceLine
                x={lastActual.month_label}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: 'الآن', position: 'top', fill: '#f59e0b', fontSize: 11, fontWeight: 'bold' }}
              />
            )}
            <Area
              type="monotone"
              dataKey="actual"
              name="actual"
              stroke="#7c3aed"
              strokeWidth={3}
              fill="url(#mrr-actual)"
              dot={{ r: 4, fill: '#7c3aed' }}
              activeDot={{ r: 6 }}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="forecast"
              name="forecast"
              stroke="#ec4899"
              strokeWidth={2}
              strokeDasharray="6 4"
              fill="url(#mrr-forecast)"
              dot={{ r: 4, fill: '#ec4899', stroke: '#fff', strokeWidth: 2 }}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
        <div className="bg-violet-50 rounded-lg p-3">
          <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">MRR الحالي</p>
          <p className="text-lg font-black text-violet-900 mt-1">
            {Math.round(data.current_mrr).toLocaleString()} <span className="text-xs">ج.م</span>
          </p>
        </div>
        <div className="bg-indigo-50 rounded-lg p-3">
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">ARR الحالي</p>
          <p className="text-lg font-black text-indigo-900 mt-1">
            {Math.round(data.current_arr).toLocaleString()} <span className="text-xs">ج.م</span>
          </p>
        </div>
        <div className="bg-fuchsia-50 rounded-lg p-3">
          <p className="text-[10px] font-bold text-fuchsia-600 uppercase tracking-wider">ARR متوقع (بعد 3 شهور)</p>
          <p className="text-lg font-black text-fuchsia-900 mt-1">
            {Math.round(data.forecast_arr_end).toLocaleString()} <span className="text-xs">ج.م</span>
          </p>
        </div>
        <div className={`rounded-lg p-3 ${isPositiveGrowth ? 'bg-emerald-50' : 'bg-rose-50'}`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${isPositiveGrowth ? 'text-emerald-600' : 'text-rose-600'}`}>
            معدل النمو (MoM)
          </p>
          <p className={`text-lg font-black mt-1 ${isPositiveGrowth ? 'text-emerald-900' : 'text-rose-900'}`}>
            {isPositiveGrowth ? '+' : ''}{data.growth_rate_3m}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default MRRTrendChart;
