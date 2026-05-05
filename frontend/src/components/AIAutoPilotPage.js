import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import PageHero from './shared/PageHero';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const INSIGHT_LABELS = {
  late_invoices: { icon: '💰', title: 'تذكير دفع للسكان المتأخرين', desc: 'يرسل تلقائياً تذكير ودي للسكان الذين عليهم فواتير متأخرة عن 30 يوم.' },
  old_maintenance: { icon: '🔧', title: 'تنبيه الفنيين بطلبات الصيانة', desc: 'ينبّه الفنيين والـ admins بطلبات الصيانة المعلقة منذ أكثر من أسبوع.' },
  negative_ratings: { icon: '⭐', title: 'رسالة اعتذار للتقييمات السلبية', desc: 'يرسل رسالة اعتذار وتحسين للسكان الذين أعطوا تقييماً ≤ 2 خلال آخر 7 أيام.' },
};

const DAYS = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];

const STATUS_BADGES = {
  success: { label: 'تم بنجاح', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  no_recipients: { label: 'لا يوجد مستلمين', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  all_failed: { label: 'فشل الكل', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
  error: { label: 'خطأ', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
};

const AIAutoPilotPage = () => {
  const [compoundId, setCompoundId] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [running, setRunning] = useState(null);

  useEffect(() => {
    // Fetch active compound from sidebar-alerts (most reliable)
    const fetchCompound = async () => {
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        // Prefer user.compound_id; otherwise fetch first compound owned/managed
        let cid = u?.compound_id || u?.selected_compound_id || localStorage.getItem('selectedCompoundId');
        if (!cid) {
          const res = await axios.get(`${API}/super-admin/dashboard`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          });
          cid = res.data?.compounds?.[0]?.id || null;
        }
        setCompoundId(cid);
      } catch {
        setCompoundId(null);
      }
    };
    fetchCompound();
  }, []);

  const fetchAll = async () => {
    if (!compoundId) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [c, r] = await Promise.all([
        axios.get(`${API}/ai-autopilot/configs?compound_id=${compoundId}`, { headers }),
        axios.get(`${API}/ai-autopilot/runs?compound_id=${compoundId}&limit=20`, { headers }),
      ]);
      setConfigs(c.data || []);
      setRuns(r.data || []);
    } catch (e) {
      toast.error('فشل تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [compoundId]);

  const updateConfig = async (cfg, patch) => {
    setSaving(cfg.insight_id);
    try {
      const next = { ...cfg, ...patch };
      await axios.put(
        `${API}/ai-autopilot/configs/${cfg.insight_id}?compound_id=${compoundId}`,
        {
          enabled: next.enabled,
          frequency: next.frequency,
          day_of_week: next.day_of_week,
          hour_utc: next.hour_utc,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setConfigs((prev) => prev.map((c) => (c.insight_id === cfg.insight_id ? next : c)));
      toast.success('تم الحفظ ✓');
    } catch {
      toast.error('فشل الحفظ');
    } finally {
      setSaving(null);
    }
  };

  const handleRunNow = async (insightId) => {
    if (!window.confirm('سيتم تنفيذ الإجراء الآن وإرسال البريد للمستلمين. متابعة؟')) return;
    setRunning(insightId);
    try {
      const res = await axios.post(
        `${API}/ai-autopilot/run-now/${insightId}?compound_id=${compoundId}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      const sent = res.data?.sent || 0;
      const status = res.data?.status;
      if (status === 'no_recipients') {
        toast.info('لا يوجد مستلمين مؤهلين حالياً');
      } else if (sent > 0) {
        toast.success(`✅ تم إرسال ${sent} رسالة`);
      } else {
        toast.error('فشل الإرسال');
      }
      fetchAll();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'فشل التنفيذ');
    } finally {
      setRunning(null);
    }
  };

  if (!compoundId) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <PageHero
          icon="🤖"
          title="AI Auto-Pilot"
          subtitle="تنفيذ تلقائي مجدول لإجراءات الـ AI"
          accent="violet"
        />
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="text-sm text-amber-800">يرجى اختيار مجمع نشط أولاً من القائمة العلوية.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto" data-testid="ai-autopilot-page">
      <PageHero
        icon="🤖"
        title="AI Auto-Pilot"
        subtitle="تنفيذ تلقائي مجدول لإجراءات الـ AI — وفّر وقتك ولا تفوّت إجراء"
        accent="violet"
      />

      {/* Configs */}
      <div className="space-y-3 mb-8">
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm">...جاري التحميل</div>
        ) : (
          configs.map((cfg) => {
            const meta = INSIGHT_LABELS[cfg.insight_id] || {};
            const isActive = cfg.enabled;
            return (
              <div
                key={cfg.insight_id}
                className={`bg-white border rounded-2xl p-5 transition-all ${isActive ? 'border-violet-300 shadow-md' : 'border-gray-200'}`}
                data-testid={`autopilot-card-${cfg.insight_id}`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon + Title */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isActive ? 'bg-gradient-to-br from-violet-100 to-fuchsia-100' : 'bg-gray-50'}`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{meta.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{meta.desc}</p>
                      </div>
                      {/* Toggle */}
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={cfg.enabled}
                          onChange={() => updateConfig(cfg, { enabled: !cfg.enabled })}
                          disabled={saving === cfg.insight_id}
                          data-testid={`autopilot-toggle-${cfg.insight_id}`}
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] rtl:after:right-auto rtl:after:left-[2px] rtl:peer-checked:after:-translate-x-full after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                      </label>
                    </div>

                    {/* Schedule controls (only visible when enabled) */}
                    {isActive && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-violet-50 p-3 rounded-xl border border-violet-200">
                        <div>
                          <label className="block text-[10px] font-bold text-violet-900 mb-1">⏱️ التكرار</label>
                          <select
                            value={cfg.frequency}
                            onChange={(e) => updateConfig(cfg, { frequency: e.target.value })}
                            className="w-full text-xs px-2 py-1.5 border border-violet-200 rounded-md bg-white"
                            data-testid={`autopilot-freq-${cfg.insight_id}`}
                          >
                            <option value="daily">يومي</option>
                            <option value="weekly">أسبوعي</option>
                          </select>
                        </div>
                        {cfg.frequency === 'weekly' && (
                          <div>
                            <label className="block text-[10px] font-bold text-violet-900 mb-1">📅 يوم الأسبوع</label>
                            <select
                              value={cfg.day_of_week}
                              onChange={(e) => updateConfig(cfg, { day_of_week: parseInt(e.target.value) })}
                              className="w-full text-xs px-2 py-1.5 border border-violet-200 rounded-md bg-white"
                              data-testid={`autopilot-dow-${cfg.insight_id}`}
                            >
                              {DAYS.map((d, i) => (
                                <option key={i} value={i}>{d}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="block text-[10px] font-bold text-violet-900 mb-1">🕘 الساعة (UTC)</label>
                          <select
                            value={cfg.hour_utc}
                            onChange={(e) => updateConfig(cfg, { hour_utc: parseInt(e.target.value) })}
                            className="w-full text-xs px-2 py-1.5 border border-violet-200 rounded-md bg-white"
                            data-testid={`autopilot-hour-${cfg.insight_id}`}
                          >
                            {Array.from({ length: 24 }).map((_, h) => (
                              <option key={h} value={h}>
                                {String(h).padStart(2, '0')}:00
                                {' '} ({String((h + 3) % 24).padStart(2, '0')}:00 بتوقيت مصر)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Last run + Run-now */}
                    <div className="mt-3 flex items-center gap-3 flex-wrap">
                      {cfg.last_run_at ? (
                        <span className="text-[11px] text-gray-500 flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5" />
                          آخر تنفيذ: {new Date(cfg.last_run_at).toLocaleString('ar-EG')}
                          {cfg.last_status && (
                            <span className={`mx-1 px-1.5 py-0.5 text-[9px] rounded border ${STATUS_BADGES[cfg.last_status]?.cls || 'bg-gray-100'}`}>
                              {STATUS_BADGES[cfg.last_status]?.label || cfg.last_status}
                              {cfg.last_sent ? ` (${cfg.last_sent})` : ''}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">لم يُنفذ بعد</span>
                      )}
                      <button
                        onClick={() => handleRunNow(cfg.insight_id)}
                        disabled={running === cfg.insight_id}
                        className="text-[11px] font-bold text-violet-700 hover:text-violet-900 hover:bg-violet-50 px-2 py-1 rounded inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                        data-testid={`autopilot-run-now-${cfg.insight_id}`}
                      >
                        {running === cfg.insight_id ? (
                          <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <PlayIcon className="w-3.5 h-3.5" />
                        )}
                        تنفيذ الآن
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Runs History */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="w-5 h-5 text-violet-600" />
            <h2 className="text-base font-bold text-gray-900">سجل التنفيذ ({runs.length})</h2>
          </div>
          <button
            onClick={fetchAll}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            data-testid="autopilot-refresh-runs"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
        {runs.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400">لا يوجد عمليات تنفيذ بعد</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-right">الوقت</th>
                  <th className="px-3 py-2 text-right">النوع</th>
                  <th className="px-3 py-2 text-right">المصدر</th>
                  <th className="px-3 py-2 text-right">المستلمين</th>
                  <th className="px-3 py-2 text-right">تم الإرسال</th>
                  <th className="px-3 py-2 text-right">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.map((run) => {
                  const meta = INSIGHT_LABELS[run.insight_id] || {};
                  const status = STATUS_BADGES[run.status] || { label: run.status, cls: 'bg-gray-100' };
                  return (
                    <tr key={run.id} className="hover:bg-violet-50/30">
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {new Date(run.triggered_at).toLocaleString('ar-EG')}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span className="inline-flex items-center gap-1">
                          {meta.icon} <span className="text-gray-700">{meta.title}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-gray-500">
                        {run.triggered_by?.startsWith('manual') ? '👤 يدوي' : '🤖 تلقائي'}
                      </td>
                      <td className="px-3 py-2 text-xs text-center">{run.recipient_count}</td>
                      <td className="px-3 py-2 text-xs text-center">
                        <span className="text-emerald-700 font-semibold">{run.sent}</span>
                        {run.failed > 0 && <span className="text-rose-600"> / -{run.failed}</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded border ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAutoPilotPage;
