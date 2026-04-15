import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const SubscriptionReminders = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [daysAhead, setDaysAhead] = useState(90);
  const [sending, setSending] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/owner/subscription-reminders`, {
        ...getHeaders(), params: { days_ahead: daysAhead }
      });
      setData(res.data);
    } catch {
      toast.error(t('rem_load_failed', 'فشل تحميل التذكيرات'));
    } finally {
      setLoading(false);
    }
  }, [daysAhead, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sendReminder = async (companyId, companyName) => {
    try {
      setSending(companyId);
      const res = await axios.post(`${API}/owner/subscription-reminders/send`, {
        company_id: companyId,
        type: 'expiry_reminder',
      }, getHeaders());
      toast.success(res.data.message || t('rem_sent', 'تم إرسال التذكير'));
      fetchData();
    } catch {
      toast.error(t('rem_send_failed', 'فشل إرسال التذكير'));
    } finally {
      setSending(null);
    }
  };

  const planLabels = {
    starter: t('sp_free', 'مجاني'),
    basic: t('sp_basic', 'أساسي'),
    pro: t('sp_pro', 'احترافي'),
    premium: t('sp_premium', 'متقدم'),
    company_startup: t('sp_co_startup', 'شركة ناشئة'),
    company_business: t('sp_co_business', 'شركة متوسطة'),
    company_enterprise: t('sp_co_enterprise', 'شركة كبرى'),
  };

  const urgencyStyles = {
    critical: { bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', icon: XCircleIcon, iconColor: 'text-red-500' },
    warning: { bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', icon: ExclamationTriangleIcon, iconColor: 'text-amber-500' },
    healthy: { bg: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', icon: CheckCircleIcon, iconColor: 'text-green-500' },
  };

  const stats = data?.stats || {};

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'} data-testid="subscription-reminders">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('rem_title', 'تذكيرات الاشتراكات')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('rem_subtitle', 'متابعة مواعيد انتهاء الاشتراكات وإرسال تذكيرات')}</p>
        </div>
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-white">
          {[
            { id: 30, label: t('rem_30d', '30 يوم') },
            { id: 60, label: t('rem_60d', '60 يوم') },
            { id: 90, label: t('rem_90d', '90 يوم') },
            { id: 365, label: t('rem_year', 'سنة') },
          ].map(d => (
            <button key={d.id} onClick={() => setDaysAhead(d.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${daysAhead === d.id ? 'bg-rose-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
              data-testid={`days-${d.id}`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">{t('rem_total', 'إجمالي الاشتراكات')}</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm text-gray-500">{t('rem_expiring', 'ينتهي قريباً')}</span>
          </div>
          <p className="text-3xl font-bold text-amber-600">{stats.expiring_soon || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <XCircleIcon className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm text-gray-500">{t('rem_expired', 'منتهية')}</span>
          </div>
          <p className="text-3xl font-bold text-red-600">{stats.expired || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">{t('rem_healthy', 'سليمة')}</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.healthy || 0}</p>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        {(data?.reminders || []).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <BellAlertIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg">{t('rem_none', 'لا توجد تذكيرات حالياً')}</p>
          </div>
        ) : (
          (data?.reminders || []).map((r) => {
            const style = urgencyStyles[r.urgency] || urgencyStyles.healthy;
            const StatusIcon = style.icon;
            return (
              <div key={r.id} className={`rounded-xl border p-5 ${style.bg} transition-all`} data-testid={`reminder-${r.id}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    <StatusIcon className={`w-8 h-8 mt-0.5 ${style.iconColor} flex-shrink-0`} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900">{r.company_name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>
                          {r.status === 'expired' ? t('rem_status_expired', 'منتهي') :
                           r.urgency === 'critical' ? t('rem_status_critical', 'حرج') :
                           r.urgency === 'warning' ? t('rem_status_warning', 'تحذير') :
                           t('rem_status_ok', 'سليم')}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {planLabels[r.plan] || r.plan}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 flex-wrap">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {t('rem_ends', 'ينتهي')}: {new Date(r.end_date).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                        </span>
                        <span className={`font-bold ${r.days_left < 0 ? 'text-red-600' : r.days_left <= 7 ? 'text-red-500' : r.days_left <= 30 ? 'text-amber-600' : 'text-green-600'}`}>
                          {r.days_left < 0
                            ? t('rem_expired_ago', `منتهي منذ ${Math.abs(r.days_left)} يوم`).replace('${days}', Math.abs(r.days_left))
                            : t('rem_days_left', `${r.days_left} يوم متبقي`).replace('${days}', r.days_left)
                          }
                        </span>
                        {r.company_email && (
                          <span className="flex items-center gap-1 text-gray-400">
                            <EnvelopeIcon className="w-3.5 h-3.5" />
                            {r.company_email}
                          </span>
                        )}
                      </div>
                      {r.last_reminder_sent && (
                        <p className="text-xs text-gray-400 mt-1">
                          {t('rem_last_sent', 'آخر تذكير')}: {new Date(r.last_reminder_sent).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => sendReminder(r.company_id, r.company_name)}
                    disabled={sending === r.company_id}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0 shadow-sm"
                    data-testid={`send-reminder-${r.company_id}`}
                  >
                    {sending === r.company_id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-600"></div>
                    ) : (
                      <EnvelopeIcon className="w-4 h-4 text-rose-600" />
                    )}
                    {t('rem_send', 'إرسال تذكير')}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Recent Reminder Logs */}
      {(data?.recent_logs || []).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">{t('rem_log_title', 'سجل التذكيرات المرسلة')}</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(data?.recent_logs || []).map((log, idx) => (
              <div key={idx} className="px-6 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{log.company_name}</span>
                  <span className="text-gray-400">{log.email}</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(log.sent_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionReminders;
