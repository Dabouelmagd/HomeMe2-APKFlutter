import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const CATEGORY_LABELS = {
  core: 'الأساس', auth: 'المصادقة', owner: 'المالك',
  data: 'البيانات', ads: 'الإعلانات', media: 'الوسائط',
  ops: 'التشغيل', security: 'الأمان',
};

export default function SmokeTestCard() {
  const [last, setLast] = useState(null);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState([]);

  const load = useCallback(async () => {
    try {
      const [lastRes, histRes] = await Promise.all([
        axios.get(`${API}/system/smoke-test/last`, auth()),
        axios.get(`${API}/system/smoke-test/history?limit=10`, auth()),
      ]);
      setLast(lastRes.data);
      setHistory(histRes.data?.runs || []);
    } catch (e) {
      // silent — endpoint may not be reachable
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await axios.post(`${API}/system/smoke-test/run`, {}, auth());
      setLast(res.data);
      const ok = res.data?.deploy_safe;
      if (ok) toast.success(`✅ كل ${res.data.total} اختبار نجح — جاهز للنشر`);
      else toast.error(`❌ ${res.data.failed}/${res.data.total} اختبار فشل — لا تنشر التطبيق!`);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل تشغيل smoke test');
    } finally { setRunning(false); }
  };

  const deploySafe = last?.deploy_safe;
  const isStale = (() => {
    if (!last?.started_at) return true;
    const ageMs = Date.now() - new Date(last.started_at).getTime();
    return ageMs > 6 * 60 * 60 * 1000;
  })();

  // Banner state: green / red / amber
  const banner = (() => {
    if (!last || last?.message) {
      return { tone: 'amber', title: 'لم يتم تشغيل smoke test بعد', sub: 'اضغطي "تشغيل الآن" لفحص جاهزية النشر' };
    }
    if (deploySafe && !isStale) {
      return { tone: 'emerald', title: '✅ جاهز للنشر — كل الاختبارات الحرجة ناجحة', sub: `${last.passed}/${last.total} اختبار · آخر تشغيل ${new Date(last.started_at).toLocaleString('ar-EG')}` };
    }
    if (!deploySafe) {
      return { tone: 'rose', title: '🚫 لا تنشر — اختبارات حرجة فاشلة!', sub: `${last.failed}/${last.total} اختبار فشل · يجب الإصلاح أولاً` };
    }
    return { tone: 'amber', title: '⚠️ نتيجة قديمة (>6 ساعات) — أعيدي التشغيل', sub: `آخر تشغيل ${new Date(last.started_at).toLocaleString('ar-EG')}` };
  })();

  const banners = {
    emerald: 'from-emerald-500 to-teal-600',
    rose: 'from-rose-600 to-pink-700',
    amber: 'from-amber-500 to-orange-600',
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden mb-6" data-testid="smoke-test-card">
      <div className={`p-5 text-white bg-gradient-to-br ${banners[banner.tone]}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs font-bold opacity-90 mb-1">🧪 PRE-DEPLOY SMOKE TEST</div>
            <div className="text-xl font-extrabold leading-tight" data-testid="smoke-banner-title">{banner.title}</div>
            <div className="text-sm opacity-90 mt-1" data-testid="smoke-banner-sub">{banner.sub}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={runNow} disabled={running} data-testid="smoke-run-now"
                    className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-bold text-sm disabled:opacity-50">
              {running ? '⏳ جاري الفحص...' : '🚀 تشغيل الآن'}
            </button>
            <button onClick={() => setExpanded(e => !e)}
                    className="px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-sm">
              {expanded ? '▲' : '▼'}
            </button>
          </div>
        </div>
        {last?.results && (
          <div className="mt-4 flex gap-2 flex-wrap text-xs">
            <span className="px-2 py-1 rounded-full bg-white/20">إجمالي: {last.total}</span>
            <span className="px-2 py-1 rounded-full bg-emerald-500/40" data-testid="smoke-passed-count">نجح: {last.passed}</span>
            <span className="px-2 py-1 rounded-full bg-rose-600/60" data-testid="smoke-failed-count">فشل: {last.failed}</span>
            <span className="px-2 py-1 rounded-full bg-white/20">⏱ {last.duration_ms}ms</span>
          </div>
        )}
      </div>

      {expanded && (
        <div className="p-5 space-y-4">
          {last?.results?.length > 0 ? (
            <div>
              <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-2">نتائج الاختبارات</h4>
              <div className="space-y-1.5">
                {last.results.map(r => (
                  <div key={r.name} className={`flex items-center gap-3 p-2 rounded-lg ${r.passed ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-rose-50 dark:bg-rose-950/30'}`} data-testid={`smoke-row-${r.name}`}>
                    <span className="text-lg">{r.passed ? '✅' : '❌'}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold">
                      {CATEGORY_LABELS[r.category] || r.category}
                    </span>
                    <span className="font-mono text-sm flex-1 text-gray-800 dark:text-gray-100">{r.name}</span>
                    {r.status_code && <span className={`text-xs font-bold ${r.status_code < 300 ? 'text-emerald-700' : r.status_code < 500 ? 'text-amber-700' : 'text-rose-700'}`}>{r.status_code}</span>}
                    <span className="text-xs text-gray-500 w-16 text-left">{r.ms || 0}ms</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {history.length > 0 && (
            <div>
              <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-2">آخر {history.length} تشغيل</h4>
              <div className="space-y-1">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs p-2 rounded bg-gray-50 dark:bg-gray-900">
                    <span>{h.deploy_safe ? '🟢' : '🔴'}</span>
                    <span className="text-gray-600 dark:text-gray-400 flex-1">{new Date(h.started_at).toLocaleString('ar-EG')}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">✅ {h.passed}</span>
                    <span className="text-rose-600 dark:text-rose-400">❌ {h.failed}</span>
                    <span className="text-gray-500">{h.source}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
            💡 الـ Synthetic Monitor يشتغل تلقائياً كل 30 دقيقة ويرسل إيميل للمالكين عند ظهور فشل جديد. CLI: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">python -m services.smoke_test_runner</code>
          </div>
        </div>
      )}
    </div>
  );
}
