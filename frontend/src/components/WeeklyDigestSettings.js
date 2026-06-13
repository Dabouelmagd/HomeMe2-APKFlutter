import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DAYS_AR = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
const SECTION_LABELS = {
  maintenance: { emoji: '🔧', label: 'الصيانة', desc: 'طلبات الصيانة الجديدة والمنجزة' },
  complaints:  { emoji: '⚠️', label: 'الشكاوى والاقتراحات', desc: 'إحصائيات الشكاوى' },
  praise:      { emoji: '💖', label: 'الإطراء', desc: 'عدد رسائل الإطراء (داخل قسم الشكاوى)' },
  payments:    { emoji: '💰', label: 'المدفوعات', desc: 'عدد العمليات وإجمالي المبالغ' },
  occupancy:   { emoji: '🏠', label: 'الإشغال', desc: 'الوحدات المسكونة/الشاغرة' },
  top_urgent:  { emoji: '🚨', label: 'الأحداث العاجلة', desc: 'أهم 3 شكاوى عاجلة تحتاج انتباه' },
};

const WeeklyDigestSettings = () => {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchPrefs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/digest/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPrefs(res.data);
    } catch {
      toast.error(t('digest_load_failed', 'فشل تحميل التفضيلات'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrefs(); }, []);

  const update = (patch) => {
    setPrefs((p) => ({ ...p, ...patch }));
    setDirty(true);
  };

  const toggleSection = (key) => {
    setPrefs((p) => ({ ...p, sections: { ...p.sections, [key]: !p.sections[key] } }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/digest/preferences`,
        {
          enabled: prefs.enabled,
          day_of_week: prefs.day_of_week,
          hour_utc: prefs.hour_utc,
          sections: prefs.sections,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t('digest_saved', 'تم حفظ تفضيلات التقرير'));
      setDirty(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || t('save_failed', 'فشل الحفظ'));
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API}/reports/run-weekly-now`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const sentTo = res.data.processed?.reduce((acc, p) => acc + (p.sent_to || 0), 0) || 0;
      toast.success(t('digest_test_sent', `تم إرسال تقرير اختبار (${sentTo} مستلم)`));
    } catch (err) {
      toast.error(err.response?.data?.detail || t('digest_test_failed', 'فشل إرسال التقرير'));
    } finally {
      setTesting(false);
    }
  };

  if (loading || !prefs) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-gray-200 rounded-xl" />
        <div className="h-32 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="weekly-digest-settings">
      {/* Enable toggle */}
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-gray-900">
            {t('digest_enabled', 'تفعيل التقرير الأسبوعي')}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {prefs.enabled
              ? t('digest_on_hint', 'سيصلك بريد يومياً حسب الجدول أدناه')
              : t('digest_off_hint', 'لن تستقبل التقرير الأسبوعي')}
          </div>
        </div>
        <button
          role="switch"
          aria-checked={prefs.enabled}
          onClick={() => update({ enabled: !prefs.enabled })}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${prefs.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`}
          data-testid="digest-enabled-toggle"
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${prefs.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {/* Schedule */}
      <div className={`rounded-2xl border-2 border-gray-200 bg-white p-4 transition ${!prefs.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2 mb-3">
          <CalendarDaysIcon className="h-5 w-5 text-purple-600" />
          <span className="text-sm font-bold text-gray-900">{t('digest_schedule', 'جدول الإرسال')}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600">{t('day_of_week', 'يوم الأسبوع')}</label>
            <select
              value={prefs.day_of_week}
              onChange={(e) => update({ day_of_week: parseInt(e.target.value, 10) })}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-purple-400"
              data-testid="digest-day-select"
            >
              {DAYS_AR.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              {t('hour_utc', 'الساعة (UTC)')}
            </label>
            <select
              value={prefs.hour_utc}
              onChange={(e) => update({ hour_utc: parseInt(e.target.value, 10) })}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-purple-400"
              data-testid="digest-hour-select"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00 UTC ({(h + 2) % 24}:00 {t('cairo_time', 'القاهرة')})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className={`rounded-2xl border-2 border-gray-200 bg-white p-4 transition ${!prefs.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="text-sm font-bold text-gray-900 mb-1">
          {t('digest_content', 'محتوى التقرير')}
        </div>
        <div className="text-xs text-gray-500 mb-3">
          {t('digest_content_hint', 'اختر الأقسام التي تظهر في تقريرك')}
        </div>
        <div className="space-y-2">
          {Object.entries(SECTION_LABELS).map(([key, meta]) => {
            const on = !!prefs.sections?.[key];
            return (
              <label
                key={key}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${on ? 'border-emerald-300 bg-emerald-50/40' : 'border-gray-200 bg-gray-50/40 hover:border-gray-300'}`}
                data-testid={`digest-section-${key}`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleSection(key)}
                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xl">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-gray-800">{meta.label}</div>
                  <div className="text-[11px] text-gray-500">{meta.desc}</div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Action bar */}
      <div className="sticky bottom-2 flex items-center justify-between bg-white rounded-xl border-2 border-purple-200 shadow-lg p-3">
        <button
          onClick={sendTest}
          disabled={testing || !prefs.enabled}
          className="px-3 py-2 rounded-lg border border-purple-300 text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 text-xs font-bold"
          data-testid="digest-test-btn"
        >
          <PaperAirplaneIcon className="h-4 w-4" />
          {testing ? t('sending', 'يُرسل...') : t('send_test_now', 'إرسال تقرير اختبار الآن')}
        </button>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          data-testid="digest-save-btn"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <CheckCircleIcon className="h-4 w-4" />
          )}
          {saving ? t('saving', 'جاري الحفظ...') : t('save_changes', 'حفظ التغييرات')}
        </button>
      </div>
    </div>
  );
};

export default WeeklyDigestSettings;
