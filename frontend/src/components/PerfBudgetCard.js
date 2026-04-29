import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

// Tiny inline sparkline (svg)
const Sparkline = ({ values = [], width = 96, height = 24, threshold }) => {
  if (!values || values.length < 2) return <span className="text-gray-400 text-xs">—</span>;
  const min = Math.min(...values);
  const max = Math.max(...values, threshold || 0);
  const range = Math.max(max - min, 1);
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => `${i * stepX},${height - ((v - min) / range) * (height - 2) - 1}`).join(' ');
  const last = values[values.length - 1];
  const lastBreach = threshold && last > threshold;
  const stroke = lastBreach ? '#dc2626' : '#10b981';
  return (
    <svg width={width} height={height} className="inline-block">
      {threshold && threshold >= min && threshold <= max && (
        <line x1={0} x2={width} y1={height - ((threshold - min) / range) * (height - 2) - 1} y2={height - ((threshold - min) / range) * (height - 2) - 1}
              stroke="#fbbf24" strokeWidth={1} strokeDasharray="2,2" />
      )}
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} />
      <circle cx={(values.length - 1) * stepX} cy={height - ((last - min) / range) * (height - 2) - 1} r={2} fill={stroke} />
    </svg>
  );
};

export default function PerfBudgetCard() {
  const [overview, setOverview] = useState({ endpoints: [], count: 0 });
  const [regressions, setRegressions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [ov, rg] = await Promise.all([
        axios.get(`${API}/system/perf-budget/overview?limit=20`, auth()),
        axios.get(`${API}/system/perf-budget/regressions`, auth()),
      ]);
      setOverview(ov.data);
      setRegressions(rg.data?.regressions || []);
    } catch (e) { /* silent */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const recompute = async () => {
    setBusy(true);
    try {
      const res = await axios.post(`${API}/system/perf-budget/recompute`, {}, auth());
      const bl = res.data?.baselines || {};
      toast.success(`✅ تم إعادة حساب ${bl.updated || 0} baseline (تم تخطّي ${bl.skipped_insufficient || 0} لقلة العينات)`);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل الإعادة');
    } finally { setBusy(false); }
  };

  if (!overview.count && !regressions.length) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 mb-6" data-testid="perf-budget-card">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-xs font-bold text-amber-600 mb-1">⏱️ PERFORMANCE BUDGET TRACKER</div>
            <div className="text-base font-bold text-gray-800 dark:text-gray-100">في انتظار جمع عينات كافية للـ baselines</div>
            <div className="text-sm text-gray-500 mt-0.5">يحتاج 8+ عينات لكل endpoint قبل بدء الرصد. شغّلي smoke test عدة مرات أو انتظري الـ Synthetic Monitor.</div>
          </div>
          <button onClick={recompute} disabled={busy}
                  data-testid="perf-recompute-btn"
                  className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm disabled:opacity-50">
            {busy ? '⏳' : '🧮 إعادة حساب'}
          </button>
        </div>
      </div>
    );
  }

  const hasRegressions = regressions.length > 0;
  const tone = hasRegressions ? 'from-amber-500 to-orange-600' : 'from-indigo-500 to-violet-600';

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden mb-6" data-testid="perf-budget-card">
      <div className={`p-4 text-white bg-gradient-to-br ${tone}`}>
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <div className="text-xs font-bold opacity-90 mb-1">⏱️ PERFORMANCE BUDGET TRACKER</div>
            <div className="text-lg font-extrabold leading-tight" data-testid="perf-banner-title">
              {hasRegressions
                ? `⚠️ ${regressions.length} endpoint أبطأ من الميزانية`
                : `✅ كل الـ ${overview.count} endpoints ضمن الميزانية`}
            </div>
            <div className="text-xs opacity-90 mt-0.5">
              {hasRegressions
                ? 'تم اكتشاف بطء غير معتاد. راجعي الجدول أدناه.'
                : 'الأداء مستقر مقارنة بالقياسات السابقة.'}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={recompute} disabled={busy}
                    data-testid="perf-recompute-btn"
                    className="px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold text-xs disabled:opacity-50">
              {busy ? '⏳' : '🧮 إعادة حساب'}
            </button>
            <button onClick={() => setExpanded(e => !e)}
                    className="px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-xs">
              {expanded ? '▲' : '▼'}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-3">
          {hasRegressions && (
            <div className="rounded-lg border-2 border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-3">
              <div className="text-sm font-bold text-rose-800 dark:text-rose-300 mb-2">🚨 Endpoints متراجعة الأداء</div>
              <div className="space-y-1.5">
                {regressions.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs" data-testid={`perf-regression-${r.endpoint}`}>
                    <code className="bg-white dark:bg-gray-800 px-2 py-0.5 rounded font-mono text-gray-800 dark:text-gray-100">{r.endpoint}</code>
                    <span className="text-rose-700 dark:text-rose-400 font-bold">{r.current_ms}ms</span>
                    <span className="text-gray-500">↑ من {r.p50}ms (ميزانية {r.threshold_ms}ms)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="perf-table">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="p-2 text-right">Endpoint</th>
                  <th className="p-2 text-right">p50</th>
                  <th className="p-2 text-right">p95</th>
                  <th className="p-2 text-right">ميزانية</th>
                  <th className="p-2 text-right">حالي</th>
                  <th className="p-2 text-right">اتجاه</th>
                  <th className="p-2 text-right">عينات</th>
                </tr>
              </thead>
              <tbody>
                {overview.endpoints.map(e => (
                  <tr key={e.endpoint} className={`border-t border-gray-100 dark:border-gray-800 ${e.regressed ? 'bg-rose-50 dark:bg-rose-950/30' : ''}`}>
                    <td className="p-2 font-mono text-gray-800 dark:text-gray-100">{e.endpoint}</td>
                    <td className="p-2 text-gray-600 dark:text-gray-400">{e.p50}ms</td>
                    <td className="p-2 text-gray-600 dark:text-gray-400">{e.p95}ms</td>
                    <td className="p-2 text-amber-700 dark:text-amber-400 font-semibold">{e.threshold_ms}ms</td>
                    <td className={`p-2 font-bold ${e.regressed ? 'text-rose-700' : 'text-emerald-700'}`}>{e.latest_ms ? `${e.latest_ms}ms` : '—'}</td>
                    <td className="p-2"><Sparkline values={e.sparkline} threshold={e.threshold_ms} /></td>
                    <td className="p-2 text-gray-500">{e.sample_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-[11px] text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2">
            💡 الميزانية = max(p50 × 2, p95 + 100ms, 500ms). يُعد regression لو 3 قياسات متتالية تجاوزت الميزانية.
          </div>
        </div>
      )}
    </div>
  );
}
