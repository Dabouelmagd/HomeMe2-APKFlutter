import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import {
  ShieldCheckIcon,
  PlayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  MinusCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  ChartBarIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const RESULT_META = {
  pass: { label: 'سليم', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircleIcon, color: 'emerald' },
  warn: { label: 'تحذير', cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: ExclamationTriangleIcon, color: 'amber' },
  fail: { label: 'فشل', cls: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircleIcon, color: 'rose' },
  skipped: { label: 'تم تخطيه', cls: 'bg-gray-100 text-gray-600 border-gray-200', icon: MinusCircleIcon, color: 'gray' },
};

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'fail', label: 'فشل' },
  { key: 'warn', label: 'تحذير' },
  { key: 'pass', label: 'سليم' },
  { key: 'skipped', label: 'تم تخطيه' },
];

const StatTile = ({ label, value, gradient, testId }) => (
  <div className={`rounded-xl p-4 text-white shadow-sm ${gradient}`} data-testid={testId}>
    <div className="text-3xl font-extrabold">{value}</div>
    <div className="text-xs mt-1 opacity-90">{label}</div>
  </div>
);

const RouteRow = ({ r }) => {
  const meta = RESULT_META[r.result] || RESULT_META.skipped;
  const Icon = meta.icon;
  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2.5 px-3 hover:bg-gray-50 border-b border-gray-100 text-sm" data-testid={`route-row-${r.path.replace(/[^a-z0-9]/gi, '-')}`}>
      <div className={`col-span-2 inline-flex items-center gap-1 text-xs font-bold border px-2 py-1 rounded-md w-fit ${meta.cls}`}>
        <Icon className="w-3.5 h-3.5" />
        {meta.label}
      </div>
      <div className="col-span-1">
        <span className="inline-block bg-blue-50 text-blue-700 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-blue-200">
          {(r.methods || []).join(',')}
        </span>
      </div>
      <code className="col-span-6 text-xs text-gray-800 font-mono break-all" dir="ltr">
        {r.path}
      </code>
      <div className="col-span-1 text-xs text-gray-600 text-center">
        {r.status_code !== null && r.status_code !== undefined ? r.status_code : '—'}
      </div>
      <div className="col-span-1 text-xs text-gray-500 text-center">
        {r.ms !== null && r.ms !== undefined ? `${r.ms}ms` : '—'}
      </div>
      <div className="col-span-1 text-[10px] text-gray-500 truncate" title={r.reason || r.error || ''}>
        {r.reason || r.error || ''}
      </div>
    </div>
  );
};

const TagGroup = ({ tag, items }) => {
  const [open, setOpen] = useState(true);
  const fails = items.filter((i) => i.result === 'fail').length;
  const warns = items.filter((i) => i.result === 'warn').length;
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-3" data-testid={`tag-group-${tag}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-900 text-sm">{tag}</span>
          <span className="text-xs text-gray-500">({items.length})</span>
          {fails > 0 && <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">{fails} فشل</span>}
          {warns > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">{warns} تحذير</span>}
        </div>
        {open ? <ChevronUpIcon className="w-4 h-4 text-gray-500" /> : <ChevronDownIcon className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div>{items.map((r) => <RouteRow key={r.path + (r.methods || []).join(',')} r={r} />)}</div>}
    </div>
  );
};

const SystemHealthPage = () => {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState('fail');     // start by surfacing problems
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [history, setHistory] = useState([]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/system/route-health/history?limit=30`, auth());
      setHistory(res.data?.items || []);
    } catch {
      // silent — chart hides itself if history is empty
    }
  }, []);

  const loadLast = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/system/route-health/last`, auth());
      setSnapshot(res.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل تحميل آخر فحص');
    } finally {
      setLoading(false);
    }
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await axios.post(`${API}/system/route-health/scan`, {}, { ...auth(), timeout: 120000 });
      setSnapshot(res.data || null);
      toast.success(`اكتمل الفحص — ${res.data?.summary?.total || 0} مسار في ${res.data?.results?.length || 0}`);
      loadHistory();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل الفحص');
    } finally {
      setScanning(false);
    }
  }, [loadHistory]);

  const triggerDailyNow = useCallback(async () => {
    setScanning(true);
    try {
      const res = await axios.post(`${API}/system/route-health/trigger-daily-now`, {}, { ...auth(), timeout: 120000 });
      const d = res.data || {};
      const newFails = d.new_failures || 0;
      if (newFails > 0) {
        toast.warning(`🔔 تم اكتشاف ${newFails} فشل جديد — تم إرسال إيميل تنبيه إلى ${d.alert_owners_notified} مالك`);
      } else {
        toast.success(`✅ لا توجد failures جديدة (${d.summary?.fail || 0} فشل قائم)`);
      }
      // Reload last snapshot
      await loadLast();
      await loadHistory();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل تشغيل الفحص اليومي');
    } finally {
      setScanning(false);
    }
  }, [loadLast, loadHistory]);

  useEffect(() => { loadLast(); loadHistory(); }, [loadLast, loadHistory]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => { runScan(); }, 5 * 60 * 1000);  // every 5 min
    return () => clearInterval(id);
  }, [autoRefresh, runScan]);

  const summary = snapshot?.summary || { total: 0, pass: 0, warn: 0, fail: 0, skipped: 0 };
  const results = snapshot?.results || [];

  const filtered = useMemo(() => {
    if (filter === 'all') return results;
    return results.filter((r) => r.result === filter);
  }, [results, filter]);

  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    // history is sorted desc by ran_at — reverse to chronological for the chart
    const points = [...history].reverse().map((h) => {
      const s = h.summary || {};
      const date = new Date(h.ran_at);
      return {
        when: date.toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        full_at: h.ran_at,
        ran_by: h.ran_by || 'manual',
        pass: s.pass || 0,
        warn: s.warn || 0,
        fail: s.fail || 0,
        total: s.total || 0,
      };
    });
    return points;
  }, [history]);

  const trendStats = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    return {
      runs: chartData.length,
      fail_delta: (last.fail || 0) - (first.fail || 0),
      pass_delta: (last.pass || 0) - (first.pass || 0),
      first_at: first.full_at,
      last_at: last.full_at,
    };
  }, [chartData]);

  const grouped = useMemo(() => {
    const out = {};
    for (const r of filtered) {
      const tag = (r.tags && r.tags[0]) || 'عام';
      out[tag] = out[tag] || [];
      out[tag].push(r);
    }
    // Sort tags by failure count desc
    return Object.entries(out).sort((a, b) => {
      const fa = a[1].filter((i) => i.result === 'fail').length;
      const fb = b[1].filter((i) => i.result === 'fail').length;
      if (fa !== fb) return fb - fa;
      return a[0].localeCompare(b[0]);
    });
  }, [filtered]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen" data-testid="system-health-page">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
              <ShieldCheckIcon className="h-7 w-7 text-emerald-500" />
              فحص صحة المسارات
            </h1>
            <p className="text-sm text-gray-500 mt-1">يفحص جميع GET endpoints بأمان — يستبعد POST/PUT/DELETE تلقائياً</p>
            {snapshot?.ran_at && (
              <p className="text-xs text-gray-400 mt-1.5 inline-flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5" />
                آخر فحص: {new Date(snapshot.ran_at).toLocaleString('ar-EG')}
                {snapshot.ran_by && <span className="text-gray-400"> • بواسطة {snapshot.ran_by}</span>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-emerald-500"
                data-testid="auto-refresh-toggle"
              />
              <span>فحص دوري (كل 5 د)</span>
            </label>
            <button
              onClick={loadLast}
              disabled={loading || scanning}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium disabled:opacity-50"
              data-testid="reload-last-btn"
            >
              <ArrowPathIcon className="w-4 h-4" />
              تحميل آخر فحص
            </button>
            <button
              onClick={runScan}
              disabled={scanning}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg font-bold shadow-md disabled:opacity-50"
              data-testid="run-scan-btn"
            >
              {scanning ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PlayIcon className="w-4 h-4" />}
              <span>{scanning ? 'جاري الفحص...' : 'بدء فحص جديد'}</span>
            </button>
            <button
              onClick={triggerDailyNow}
              disabled={scanning}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-lg font-bold shadow-md disabled:opacity-50"
              data-testid="trigger-daily-btn"
              title="يفحص ويبعث تنبيه إيميل لو في فشل جديد"
            >
              <BellAlertIcon className="w-4 h-4" />
              <span>تشغيل الفحص اليومي + تنبيه</span>
            </button>
          </div>
        </div>

        {/* Daily auto-scan info */}
        <div className="mt-4 bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-lg px-4 py-3 text-sm text-rose-800 flex items-center gap-2" data-testid="auto-scan-info">
          <BellAlertIcon className="w-5 h-5 flex-shrink-0" />
          <span>
            <strong>فحص يومي تلقائي مفعّل</strong> — يتم تشغيله يومياً الساعة 6:00 ص (UTC). إذا تم اكتشاف <em>failures جديدة</em> مقارنةً بآخر فحص، سيتم إرسال إيميل تنبيه فوري للمالك تلقائياً.
          </span>
        </div>

        {/* Summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
          <StatTile label="الإجمالي" value={summary.total} gradient="bg-gradient-to-br from-slate-700 to-slate-900" testId="stat-total" />
          <StatTile label="✅ سليم" value={summary.pass} gradient="bg-gradient-to-br from-emerald-500 to-green-600" testId="stat-pass" />
          <StatTile label="⚠️ تحذير" value={summary.warn} gradient="bg-gradient-to-br from-amber-500 to-orange-600" testId="stat-warn" />
          <StatTile label="❌ فشل" value={summary.fail} gradient="bg-gradient-to-br from-rose-500 to-pink-600" testId="stat-fail" />
          <StatTile label="⏸ متخطي" value={summary.skipped} gradient="bg-gradient-to-br from-gray-500 to-slate-600" testId="stat-skipped" />
        </div>
      </div>

      {/* Trends Chart — last N scans */}
      {chartData.length >= 2 && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4" data-testid="trends-chart-card">
          <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 inline-flex items-center gap-2">
                📈 الاتجاه التاريخي ({chartData.length} فحص)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">آخر {chartData.length} فحص — مرتبة من الأقدم للأحدث</p>
            </div>
            {trendStats && (
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className={`px-2 py-1 rounded-full font-bold border ${trendStats.fail_delta > 0 ? 'bg-rose-50 text-rose-700 border-rose-200' : trendStats.fail_delta < 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                  Δ فشل: {trendStats.fail_delta > 0 ? '+' : ''}{trendStats.fail_delta}
                </span>
                <span className={`px-2 py-1 rounded-full font-bold border ${trendStats.pass_delta >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  Δ سليم: {trendStats.pass_delta > 0 ? '+' : ''}{trendStats.pass_delta}
                </span>
              </div>
            )}
          </div>
          <div className="w-full" style={{ height: 260 }} data-testid="trends-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="when" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                  labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="2 2" />
                <Line type="monotone" dataKey="pass" name="✅ سليم" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="warn" name="⚠️ تحذير" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="fail" name="❌ فشل" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-gray-500 mt-2 text-center">
            💡 لو الخط الأحمر بيتسلق، يبقى في regression بيحصل — افتحي آخر فحص لمعرفة المسارات اللي بتفشل
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-3 mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = f.key === 'all' ? results.length : (summary[f.key] || 0);
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                active
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              data-testid={`hf-filter-${f.key}`}
            >
              {f.label}
              <span className={`ml-2 inline-flex items-center justify-center text-[10px] font-bold rounded-full w-5 h-5 ${active ? 'bg-white/25' : 'bg-gray-300 text-gray-700'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <ArrowPathIcon className="w-10 h-10 text-gray-300 mx-auto mb-2 animate-spin" />
          <p className="text-sm text-gray-500">جاري التحميل...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center" data-testid="health-empty">
          <ChartBarIcon className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-base font-medium text-gray-700">لم يتم تشغيل أي فحص بعد</p>
          <p className="text-xs text-gray-500 mt-1">اضغطي زرار "بدء فحص جديد" لتشغيل أول فحص</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center" data-testid="filter-empty">
          <CheckCircleIcon className="w-14 h-14 text-emerald-400 mx-auto mb-2" />
          <p className="text-base font-bold text-emerald-700">رائع! لا توجد عناصر في هذا التصنيف ✨</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border-b border-gray-200 mb-2 px-3 py-2 grid grid-cols-12 gap-2 text-[11px] font-bold text-gray-500 uppercase">
            <div className="col-span-2">الحالة</div>
            <div className="col-span-1">طريقة</div>
            <div className="col-span-6">المسار</div>
            <div className="col-span-1 text-center">كود</div>
            <div className="col-span-1 text-center">زمن</div>
            <div className="col-span-1">سبب</div>
          </div>
          {grouped.map(([tag, items]) => <TagGroup key={tag} tag={tag} items={items} />)}
        </>
      )}
    </div>
  );
};

export default SystemHealthPage;
