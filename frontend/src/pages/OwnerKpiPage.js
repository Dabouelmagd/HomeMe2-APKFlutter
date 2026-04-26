import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarSquareIcon,
  FireIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const Tile = ({ label, value, sub, icon: Icon, gradient, testId }) => (
  <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-md ${gradient}`} data-testid={testId}>
    <div className="absolute -left-3 -bottom-3 opacity-10"><Icon className="w-24 h-24" /></div>
    <div className="text-3xl font-extrabold relative">{value}</div>
    <div className="text-xs mt-1 opacity-90 relative">{label}</div>
    {sub && <div className="text-[11px] mt-2 opacity-75 relative">{sub}</div>}
  </div>
);

const OwnerKpiPage = () => {
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/owner-kpis`, auth());
      setKpi(res.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل تحميل المؤشرات');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !kpi) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="bg-white rounded-2xl p-8 text-center">
          <ArrowPathIcon className="w-10 h-10 text-gray-300 mx-auto mb-2 animate-spin" />
          <p className="text-sm text-gray-500">جاري تحميل المؤشرات...</p>
        </div>
      </div>
    );
  }

  const { compounds, users, engagement, revenue, churn, top_compounds, daily_signups } = kpi;
  const churnUp = (churn?.rate_pct || 0) > 5;

  return (
    <div className="p-6 bg-gray-50 min-h-screen" data-testid="owner-kpi-page">
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
              <ChartBarSquareIcon className="h-7 w-7 text-emerald-500" />
              لوحة تحليلات المالك
            </h1>
            <p className="text-sm text-gray-500 mt-1">مؤشرات الأداء الأساسية عبر التطبيق كله — تتحدّث في الوقت الفعلي</p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium" data-testid="kpi-reload">
            <ArrowPathIcon className="w-4 h-4" />
            تحديث
          </button>
        </div>

        {/* Top tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <Tile label="إجمالي المجمعات" value={compounds.total} sub={`+${compounds.new_30d} في آخر 30 يوم`} icon={BuildingOffice2Icon} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" testId="kpi-compounds" />
          <Tile label="إجمالي المستخدمين" value={users.total} sub={`+${users.new_30d} مستخدم جديد`} icon={UsersIcon} gradient="bg-gradient-to-br from-purple-500 to-pink-600" testId="kpi-users" />
          <Tile label="MRR (شهرياً)" value={`${revenue.mrr.toLocaleString('en-US')} ج.م`} sub={`ARR ≈ ${revenue.arr_estimate.toLocaleString('en-US')}`} icon={CurrencyDollarIcon} gradient="bg-gradient-to-br from-emerald-500 to-green-600" testId="kpi-mrr" />
          <Tile label="معدل التراجع (Churn)" value={`${churn.rate_pct}%`} sub={`${churn.cancelled_30d} إلغاء في 30 يوم`} icon={churnUp ? ArrowTrendingUpIcon : ArrowTrendingDownIcon} gradient={churnUp ? 'bg-gradient-to-br from-rose-500 to-pink-600' : 'bg-gradient-to-br from-amber-500 to-orange-600'} testId="kpi-churn" />
        </div>
      </div>

      {/* Engagement card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-2xl shadow-sm p-5 col-span-1" data-testid="kpi-engagement">
          <h3 className="text-sm font-bold text-gray-700 inline-flex items-center gap-2"><FireIcon className="w-5 h-5 text-orange-500" />التفاعل</h3>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">DAU (آخر 24 ساعة)</span>
              <span className="text-2xl font-extrabold text-blue-600">{engagement.dau}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">MAU (آخر 30 يوم)</span>
              <span className="text-2xl font-extrabold text-purple-600">{engagement.mau}</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="text-xs text-gray-500">معدل الاستمرار (DAU/MAU)</span>
              <span className="text-xl font-bold text-emerald-600">{engagement.stickiness}%</span>
            </div>
          </div>
        </div>

        {/* Daily signups chart */}
        <div className="bg-white rounded-2xl shadow-sm p-5 col-span-2" data-testid="kpi-signups-chart">
          <h3 className="text-sm font-bold text-gray-700">📈 المستخدمين الجدد (آخر 30 يوم)</h3>
          {daily_signups && daily_signups.length > 0 ? (
            <div style={{ height: 200 }} className="mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily_signups}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-6 text-center py-8">لا يوجد بيانات تسجيل في آخر 30 يوم</p>
          )}
        </div>
      </div>

      {/* Top compounds */}
      <div className="bg-white rounded-2xl shadow-sm p-5" data-testid="kpi-top-compounds">
        <h3 className="text-sm font-bold text-gray-700 mb-3">🏆 أكبر 5 مجمعات حسب عدد السكان</h3>
        {top_compounds && top_compounds.length > 0 ? (
          <div className="space-y-2">
            {top_compounds.map((c, idx) => (
              <div key={c.compound_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white font-extrabold flex items-center justify-center">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-gray-900 truncate">{c.name || '—'}</div>
                  <div className="text-[11px] text-gray-500 truncate">{c.address || '—'}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-blue-600">{c.residents}</div>
                  <div className="text-[10px] text-gray-500">ساكن</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-4">لا يوجد بيانات</p>
        )}
      </div>
    </div>
  );
};

export default OwnerKpiPage;
