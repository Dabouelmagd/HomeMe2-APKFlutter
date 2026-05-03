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
import SmokeTestCard from '../components/SmokeTestCard';
import PerfBudgetCard from '../components/PerfBudgetCard';

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

  // Smart probe — manual re-test of a single path across 3 role contexts
  const [probeOpen, setProbeOpen] = useState(false);
  const [probePath, setProbePath] = useState('');
  const [probeLoading, setProbeLoading] = useState(false);
  const [probeData, setProbeData] = useState(null); // { verdict, contexts: [...] }

  const openSmartProbe = async (path) => {
    setProbeOpen(true);
    setProbePath(path);
    setProbeData(null);
    setProbeLoading(true);
    try {
      const res = await axios.post(
        `${API}/system/route-health/probe`,
        { path },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
      );
      setProbeData(res.data);
    } catch (err) {
      setProbeData({ verdict: '❌ فشل تنفيذ الفحص: ' + (err?.response?.data?.detail || err.message), contexts: [] });
    } finally {
      setProbeLoading(false);
    }
  };

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

  const slowEndpoints = useMemo(() => {
    return [...results]
      .filter((r) => r.ms !== null && r.ms !== undefined && r.result !== 'skipped')
      .sort((a, b) => (b.ms || 0) - (a.ms || 0))
      .slice(0, 10);
  }, [results]);

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
      <SmokeTestCard />
      <PerfBudgetCard />
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
                  <br/>
                  <strong className="text-purple-700">🧠 وضع الفحص الذكي:</strong> كل endpoint يتم اختباره بدور المستخدم الحالي، وفي حال عدم نجاحه يُعاد المحاولة بأدوار (app_owner / super_admin / company_admin) ويُحفظ أفضل نتيجة.
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

      {/* Slowest Endpoints (top 10) */}
      {slowEndpoints.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4" data-testid="slow-endpoints-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 inline-flex items-center gap-2">
                🐌 أبطأ 10 مسارات
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">مرتبة من الأبطأ — استخدميها لتحسين الأداء</p>
            </div>
          </div>
          <div className="overflow-hidden border border-gray-100 rounded-xl">
            {slowEndpoints.map((r, idx) => {
              const ms = r.ms || 0;
              const tone = ms > 2000 ? 'bg-rose-500' : ms > 1000 ? 'bg-amber-500' : ms > 500 ? 'bg-yellow-500' : 'bg-emerald-500';
              const widthPct = Math.min(100, Math.round((ms / Math.max(slowEndpoints[0].ms || 1, 1)) * 100));
              return (
                <div key={r.path + idx} className="px-3 py-2.5 border-b last:border-b-0 border-gray-100 hover:bg-gray-50" data-testid={`slow-endpoint-${idx}`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-gray-500 w-5">#{idx + 1}</span>
                      <code className="text-xs text-gray-800 font-mono truncate" dir="ltr" title={r.path}>{r.path}</code>
                      <span className="inline-block bg-blue-50 text-blue-700 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-blue-200">{(r.methods || []).join(',')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${ms > 2000 ? 'text-rose-700' : ms > 1000 ? 'text-amber-700' : ms > 500 ? 'text-yellow-700' : 'text-emerald-700'}`}>{ms}ms</span>
                      <span className="text-[10px] text-gray-500">{r.status_code}</span>
                    </div>
                  </div>
                  <div className="mt-1.5 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full ${tone} transition-all`} style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-500 mt-3 text-center">
            🟢 &lt;500ms سريع &nbsp;•&nbsp; 🟡 500-1000ms مقبول &nbsp;•&nbsp; 🟠 1-2s بطيء &nbsp;•&nbsp; 🔴 &gt;2s محتاج تحسين
          </p>
        </div>
      )}

      {/* Warnings breakdown by reason code — shown when there are warns */}
      {(() => {
        const warns = results.filter((r) => r.result === 'warn');
        if (warns.length === 0) return null;

        const REASON_META = {
          auth_required: { emoji: '🔐', label: 'يحتاج مصادقة', bg: 'bg-sky-50/40', border: 'border-sky-200', badge: 'bg-sky-200 text-sky-900', desc: 'الـ endpoint يتطلّب تسجيل دخول ولم يمرّر Token صحيح في الفحص.' },
          forbidden_for_tester_role: { emoji: '🛡️', label: 'محجوب للدور الحالي (RBAC)', bg: 'bg-indigo-50/40', border: 'border-indigo-200', badge: 'bg-indigo-200 text-indigo-900', desc: 'الـ RBAC يعمل بشكل صحيح — هذا الـ endpoint للـ app_owner فقط مثلاً وتم الفحص بحساب super_admin فحجبه كما ينبغي.' },
          not_found_for_context: { emoji: '🔍', label: 'لا يوجد resource للـ context', bg: 'bg-amber-50/40', border: 'border-amber-200', badge: 'bg-amber-200 text-amber-900', desc: 'الـ endpoint موجود لكن الـ ID المُمرَّر لا يطابق أي سجل (مثلاً لا يوجد compound مرتبط بالمستخدم الذي يجري الفحص).' },
          validation_error: { emoji: '📋', label: 'خطأ validation', bg: 'bg-orange-50/40', border: 'border-orange-200', badge: 'bg-orange-200 text-orange-900', desc: 'ردّ 422 — عادةً يعني أن الـ payload فاضي أو لا يطابق الـ schema. غالباً endpoints تحتاج query params غير موجودة.' },
          method_not_allowed: { emoji: '🚫', label: 'Method غير مسموح', bg: 'bg-gray-50/40', border: 'border-gray-200', badge: 'bg-gray-200 text-gray-900', desc: '405 — الـ endpoint لا يقبل GET. قد يكون POST/PUT فقط.' },
          client_error: { emoji: '⚠️', label: 'خطأ 4xx عام', bg: 'bg-yellow-50/40', border: 'border-yellow-200', badge: 'bg-yellow-200 text-yellow-900', desc: 'ردّ 4xx غير مصنّف بشكل أدق. افتحي الـ endpoint يدوياً لترى السبب الفعلي.' },
          unknown: { emoji: '❔', label: 'سبب غير مصنّف', bg: 'bg-gray-50/40', border: 'border-gray-200', badge: 'bg-gray-200 text-gray-900', desc: 'غير معروف — يُرجى إعادة تشغيل الفحص.' },
        };

        const groups = {};
        warns.forEach((w) => {
          const r = w.reason || 'unknown';
          (groups[r] = groups[r] || []).push(w);
        });
        const sorted = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);

        return (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4" data-testid="warnings-breakdown-card">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 inline-flex items-center gap-2">
                  🗺️ خريطة التحذيرات ({warns.length})
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">تصنيف ذكي للـ warns يوضّح السبب الجذري لكل مجموعة — معظمها ليست أخطاء فعلية.</p>
              </div>
            </div>
            <div className="space-y-3">
              {sorted.map(([reason, items]) => {
                const meta = REASON_META[reason] || REASON_META.unknown;
                return (
                  <details key={reason} className={`group border rounded-xl ${meta.border} ${meta.bg} overflow-hidden`} data-testid={`warn-group-${reason}`}>
                    <summary className="cursor-pointer px-4 py-3 flex items-center gap-3 hover:bg-white/50 transition select-none">
                      <span className="text-xl shrink-0">{meta.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-gray-900 flex items-center gap-2 flex-wrap">
                          <span>{meta.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.badge}`}>
                            {items.length} endpoint
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{meta.desc}</div>
                      </div>
                      <span className="text-xs text-gray-400 group-open:rotate-180 transition">▾</span>
                    </summary>
                    <div className="px-4 pb-3 pt-1 space-y-1">
                      {items.map((it, i) => (
                        <div key={it.path + i} className="flex items-center gap-2 text-xs py-1.5 px-2 bg-white/60 rounded border border-gray-100" data-testid={`warn-row-${reason}-${i}`}>
                          <code className="font-mono text-gray-800 flex-1 min-w-0 truncate" dir="ltr" title={it.path}>{it.path}</code>
                          <span className="shrink-0 px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-bold">{it.status_code}</span>
                          {typeof it.ms === 'number' && <span className="shrink-0 text-gray-500">{it.ms}ms</span>}
                          <button
                            type="button"
                            onClick={() => openSmartProbe(it.path)}
                            className="shrink-0 px-2 py-1 rounded bg-violet-100 hover:bg-violet-200 text-violet-800 font-bold text-[10px] border border-violet-300"
                            data-testid={`probe-btn-${i}`}
                            title="فحص يدوي بـ 3 أدوار مختلفة"
                          >
                            🔧 فحص
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-500 mt-4 text-center">
              💡 معظم الـ warns صحية وطبيعية (RBAC يحجب ما يجب حجبه). ركّزي فقط على <b>client_error</b> لو ظهر لأنه يعني أن endpoint يحتاج فحصاً يدوياً.
            </p>
          </div>
        );
      })()}

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

      {/* Smart probe modal */}
      {probeOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setProbeOpen(false)}
          data-testid="smart-probe-modal"
          dir="rtl"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold">🔧 فحص يدوي ذكي</h3>
                <code className="text-xs text-violet-100 font-mono break-all" dir="ltr">{probePath}</code>
              </div>
              <button onClick={() => setProbeOpen(false)} className="text-white/80 hover:text-white" data-testid="smart-probe-close">✕</button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {probeLoading ? (
                <div className="py-12 text-center text-sm text-gray-600">جارٍ الفحص في 3 أدوار… ⏳</div>
              ) : probeData ? (
                <>
                  <div className="rounded-xl p-3 mb-4 bg-violet-50 border border-violet-200 text-sm font-semibold text-violet-900" data-testid="smart-probe-verdict">
                    <span className="text-xs text-violet-600 block mb-0.5">الحكم النهائي:</span>
                    {probeData.verdict}
                  </div>
                  <div className="space-y-3">
                    {(probeData.contexts || []).map((c, i) => {
                      const ok = c.status_code && c.status_code >= 200 && c.status_code < 300;
                      const cardCls = c.skipped_reason
                        ? 'bg-gray-50 border-gray-200'
                        : ok
                          ? 'bg-emerald-50 border-emerald-300'
                          : c.status_code === 403 ? 'bg-indigo-50 border-indigo-200'
                          : c.status_code === 401 ? 'bg-sky-50 border-sky-200'
                          : c.status_code === 404 ? 'bg-amber-50 border-amber-200'
                          : (c.status_code && c.status_code >= 500) ? 'bg-rose-50 border-rose-300'
                          : 'bg-yellow-50 border-yellow-200';
                      return (
                        <div key={c.role + i} className={`rounded-xl border p-3 ${cardCls}`} data-testid={`probe-ctx-${c.role}`}>
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-base">{ok ? '✅' : c.skipped_reason ? '⏸' : '⚠️'}</span>
                            <span className="font-bold text-sm text-gray-900">{c.role}</span>
                            {c.status_code != null && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ok ? 'bg-emerald-200 text-emerald-900' : c.status_code >= 500 ? 'bg-rose-200 text-rose-900' : 'bg-gray-200 text-gray-800'}`}>
                                HTTP {c.status_code}
                              </span>
                            )}
                            {typeof c.ms === 'number' && <span className="text-[11px] text-gray-600">{c.ms}ms</span>}
                            {c.reason && <span className="text-[10px] text-gray-600 font-mono">{c.reason}</span>}
                          </div>
                          {c.tested_path && (
                            <div className="text-[10px] text-gray-500 font-mono mb-1" dir="ltr">→ {c.tested_path}</div>
                          )}
                          {c.skipped_reason ? (
                            <div className="text-xs text-gray-600 italic">{c.skipped_reason}</div>
                          ) : c.body_snippet ? (
                            <pre className="text-[11px] text-gray-700 bg-white/70 rounded p-2 overflow-x-auto max-h-28" dir="ltr">{c.body_snippet}</pre>
                          ) : c.error ? (
                            <div className="text-xs text-rose-700">خطأ: {c.error}</div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </div>
            <div className="px-5 py-3 border-t bg-gray-50 flex justify-end">
              <button onClick={() => setProbeOpen(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-bold" data-testid="smart-probe-done">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemHealthPage;
