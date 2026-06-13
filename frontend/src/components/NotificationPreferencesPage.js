import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  BellAlertIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import PageHeader from './shared/PageHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Localized labels for each canonical event type. Backend is the source of
// truth for the event list — we ship a default mapping here and gracefully
// fall back to the raw key for any unknown event added later.
const EVENT_LABELS_AR = {
  payment: { label: 'مدفوعات وفواتير', emoji: '💰', desc: 'فواتير، إيصالات، تنبيهات استحقاق' },
  maintenance: { label: 'الصيانة والخدمات', emoji: '🔧', desc: 'طلبات صيانة، حجوزات، تحديثات حالة' },
  announcement: { label: 'إعلانات المجمع', emoji: '📢', desc: 'إعلانات عامة من الإدارة' },
  visitor: { label: 'الزوار والـ QR', emoji: '🚪', desc: 'دعوة زائر، دخول/خروج' },
  complaint: { label: 'الشكاوى والمقترحات', emoji: '⚠️', desc: 'تحديث حالة الشكوى، رد الإدارة' },
  contract: { label: 'العقود', emoji: '📄', desc: 'انتهاء صلاحية، تجديد' },
  poll: { label: 'الاستطلاعات والتصويت', emoji: '🗳️', desc: 'استطلاعات جديدة، نتائج' },
  system: { label: 'النظام والأمان', emoji: '🔐', desc: 'تسجيل دخول جديد، تغيير كلمة مرور' },
};

const CHANNEL_META = {
  push: { label: 'إشعار فوري', icon: BellAlertIcon, color: 'text-purple-600 bg-purple-100' },
  email: { label: 'بريد إلكتروني', icon: EnvelopeIcon, color: 'text-blue-600 bg-blue-100' },
  sms: { label: 'رسالة نصية SMS', icon: DevicePhoneMobileIcon, color: 'text-emerald-600 bg-emerald-100' },
};

const NotificationPreferencesPage = () => {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [channels, setChannels] = useState(['push', 'email', 'sms']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const fetchPrefs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/notification-preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPrefs(res.data.preferences || {});
      setEventTypes(res.data.event_types || Object.keys(EVENT_LABELS_AR));
      setChannels(res.data.channels || ['push', 'email', 'sms']);
    } catch (err) {
      toast.error(t('load_failed', 'فشل تحميل التفضيلات'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrefs();
  }, []);

  const toggle = (event, channel) => {
    setPrefs((p) => ({
      ...p,
      [event]: { ...(p[event] || {}), [channel]: !(p[event]?.[channel]) },
    }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/notification-preferences`,
        { preferences: prefs },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t('prefs_saved', 'تم حفظ التفضيلات'));
      setDirty(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || t('save_failed', 'فشل الحفظ'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-200 rounded-xl" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto" data-testid="notification-preferences-page">
      <PageHeader
        theme="purple"
        icon={BellAlertIcon}
        badge={t('notif_prefs_badge', 'التفضيلات')}
        title={t('notif_prefs_title', 'تفضيلات الإشعارات')}
        subtitle={t('notif_prefs_subtitle', 'اختر بدقة كيف تستقبل كل نوع تنبيه. التغييرات تُحفظ يدوياً.')}
        testId="notif-prefs-page-header"
      />

      {/* Channel legend */}
      <div className="grid grid-cols-3 gap-3 mt-6 mb-4">
        {channels.map((ch) => {
          const meta = CHANNEL_META[ch] || { label: ch, icon: ChatBubbleLeftRightIcon, color: 'text-gray-600 bg-gray-100' };
          const Icon = meta.icon;
          return (
            <div
              key={ch}
              className={`rounded-xl border border-gray-200 bg-white px-3 py-3 flex items-center gap-2 ${meta.color}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-bold">{meta.label}</span>
            </div>
          );
        })}
      </div>

      {/* Event matrix */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="grid grid-cols-12 gap-0 px-4 py-3 border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase">
          <div className="col-span-6 sm:col-span-7">{t('event_type', 'نوع الحدث')}</div>
          {channels.map((ch) => (
            <div key={ch} className="col-span-2 sm:col-span-1 sm:col-start-auto text-center text-[10px] sm:text-xs">
              {CHANNEL_META[ch]?.label?.split(' ')[0] || ch}
            </div>
          ))}
        </div>

        {eventTypes.map((event) => {
          const meta = EVENT_LABELS_AR[event] || { label: event, emoji: '🔔', desc: '' };
          return (
            <div
              key={event}
              className="grid grid-cols-12 gap-0 px-4 py-3.5 border-b border-gray-100 hover:bg-purple-50/30 transition items-center"
              data-testid={`notif-row-${event}`}
            >
              <div className="col-span-6 sm:col-span-7 flex items-start gap-3">
                <div className="text-2xl">{meta.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800 text-sm">{meta.label}</div>
                  {meta.desc && (
                    <div className="text-[11px] text-gray-500 mt-0.5">{meta.desc}</div>
                  )}
                </div>
              </div>
              {channels.map((ch) => {
                const on = !!prefs?.[event]?.[ch];
                return (
                  <div key={ch} className="col-span-2 sm:col-span-1 flex justify-center">
                    <button
                      role="switch"
                      aria-checked={on}
                      onClick={() => toggle(event, ch)}
                      data-testid={`notif-toggle-${event}-${ch}`}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        on ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          on ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Save bar */}
      <div className="sticky bottom-4 mt-6 flex items-center justify-between bg-white rounded-xl border-2 border-purple-200 shadow-lg p-3">
        <div className="text-xs text-gray-500">
          {dirty
            ? t('notif_prefs_unsaved', '⚠️ تغييرات غير محفوظة')
            : t('notif_prefs_saved', '✅ كل شيء محفوظ')}
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          data-testid="notif-prefs-save-btn"
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

export default NotificationPreferencesPage;
