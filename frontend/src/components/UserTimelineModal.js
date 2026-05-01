import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const CATEGORY_LABELS = {
  payment: 'مدفوعات',
  maintenance: 'صيانة',
  complaint: 'شكاوى',
  ticket: 'دعم فني',
  visitor: 'تصاريح زوار',
  booking: 'حجوزات مرافق',
  audit: 'أمان',
};

const CATEGORY_COLORS = {
  payment: 'bg-emerald-100 text-emerald-800',
  maintenance: 'bg-amber-100 text-amber-800',
  complaint: 'bg-rose-100 text-rose-800',
  ticket: 'bg-blue-100 text-blue-800',
  visitor: 'bg-purple-100 text-purple-800',
  booking: 'bg-indigo-100 text-indigo-800',
  audit: 'bg-gray-100 text-gray-800',
};

const Sparkline = ({ values = [], width = 260, height = 44 }) => {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const stepX = width / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${i * stepX},${height - (v / max) * (height - 4) - 2}`).join(' ');
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth={2} />
      {values.map((v, i) => (
        <circle key={i} cx={i * stepX} cy={height - (v / max) * (height - 4) - 2} r={v > 0 ? 2.5 : 1} fill={v > 0 ? '#6366f1' : '#d1d5db'} />
      ))}
    </svg>
  );
};

export default function UserTimelineModal({ user, onClose }) {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(90);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/users/${user.id}/timeline?days=${days}&type=${filter}&limit=100`, auth());
      setData(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل تحميل السجل');
    } finally {
      setLoading(false);
    }
  }, [user?.id, days, filter]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const tok = localStorage.getItem('token');
    const link = document.createElement('a');
    link.href = `${API}/users/${user.id}/timeline/csv?days=${days}`;
    link.setAttribute('download', `timeline_${user.username}.csv`);
    // Fetch with auth then download
    fetch(link.href, { headers: { Authorization: `Bearer ${tok}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        link.href = url;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast.success('تم تنزيل الملف');
      });
  };

  if (!user) return null;

  const analytics = data?.analytics || {};
  const events = data?.events || [];

  return (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4" onClick={onClose} data-testid="user-timeline-modal">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()} dir="rtl">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-700 text-white p-5">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs opacity-90 mb-0.5">📋 سجل النشاط</div>
              <h3 className="text-2xl font-extrabold">{user.full_name || user.username}</h3>
              <div className="text-xs opacity-80 mt-0.5">
                {analytics.is_active_user ? <span className="bg-emerald-500/50 px-2 py-0.5 rounded-full">🟢 نشط هذا الأسبوع</span> : <span className="bg-white/20 px-2 py-0.5 rounded-full">⚪ خامل</span>}
              </div>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <select value={days} onChange={(e) => setDays(Number(e.target.value))}
                      className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-sm font-bold backdrop-blur-sm border-0" data-testid="timeline-days-filter">
                <option value={7} className="text-gray-900">آخر 7 أيام</option>
                <option value={30} className="text-gray-900">آخر 30 يوم</option>
                <option value={90} className="text-gray-900">آخر 90 يوم</option>
                <option value={365} className="text-gray-900">آخر سنة</option>
              </select>
              <button onClick={exportCsv} data-testid="timeline-csv-btn" className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-bold">📥 CSV</button>
              <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl leading-none w-8 h-8 flex items-center justify-center" data-testid="timeline-close-btn">×</button>
            </div>
          </div>
        </div>

        {/* Analytics panel */}
        <div className="p-5 border-b border-gray-200 bg-gradient-to-br from-indigo-50 to-violet-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-xs text-gray-500 mb-0.5">إجمالي الأحداث</div>
              <div className="text-2xl font-extrabold text-indigo-700" data-testid="kpi-total-events">{analytics.total_events ?? 0}</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-xs text-gray-500 mb-0.5">آخر 7 أيام</div>
              <div className="text-2xl font-extrabold text-emerald-700" data-testid="kpi-recent-7d">{analytics.recent_7d_count ?? 0}</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-xs text-gray-500 mb-0.5">إجمالي المدفوعات</div>
              <div className="text-xl font-extrabold text-amber-700" data-testid="kpi-payments-sum">{(analytics.total_payments_amount || 0).toLocaleString('ar-EG')} ج.م</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <div className="text-xs text-gray-500 mb-0.5">اتجاه 30 يوم</div>
              <Sparkline values={analytics.sparkline_30d || []} width={200} height={36} />
            </div>
          </div>

          {/* Category filter chips */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilter('all')} data-testid="filter-all"
                    className={`px-3 py-1 rounded-full text-xs font-bold transition ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>
              الكل ({analytics.total_events ?? 0})
            </button>
            {Object.entries(analytics.by_category || {}).map(([cat, count]) => (
              <button key={cat} onClick={() => setFilter(cat)} data-testid={`filter-${cat}`}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition ${filter === cat ? 'bg-indigo-600 text-white' : `${CATEGORY_COLORS[cat]} border border-transparent`}`}>
                {CATEGORY_LABELS[cat] || cat} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-12 text-gray-400">⏳ جاري التحميل...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-gray-400" data-testid="timeline-empty">
              📭 لا توجد أحداث في الفترة المحددة
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-400 to-violet-400 right-5"></div>
              <div className="space-y-3">
                {events.map((e) => (
                  <div key={e.event_id} className="relative flex gap-4 pr-12" data-testid={`timeline-event-${e.collection}`}>
                    <div className="absolute right-3 w-5 h-5 rounded-full bg-white border-4 border-indigo-500 shadow-md z-10" style={{top: '1rem'}}></div>
                    <div className="flex-1 bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{e.icon}</span>
                          <div>
                            <div className="font-bold text-gray-900">{e.title}</div>
                            <div className="text-[11px] text-gray-500 font-mono mt-0.5">{new Date(e.timestamp).toLocaleString('ar-EG')}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full font-bold ${CATEGORY_COLORS[e.category] || 'bg-gray-100 text-gray-800'}`}>{CATEGORY_LABELS[e.category] || e.category}</span>
                          {e.status && <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">{e.status}</span>}
                          {e.amount ? <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-bold">{e.amount} ج.م</span> : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
