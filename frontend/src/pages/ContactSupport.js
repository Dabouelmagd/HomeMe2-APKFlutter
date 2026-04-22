import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * نموذج "تواصل مع الدعم الفني" — متاح لكل المستخدمين (حتى الزوار).
 * الرسائل تتبعت تلقائياً لـ homeme_residence@datalifeai.com
 */
const ContactSupport = ({ compact = false, onSubmitted = null }) => {
  const { t } = useTranslation();
  // Prefix to avoid collision with existing translations (e.g., cs_title exists for company-subs)
  const tr = (key, fallback) => {
    const full = `support_${key}`;
    const val = t(full);
    // If i18n returns the raw key unchanged → use our fallback
    return (!val || val === full) ? fallback : val;
  };
  const savedUser = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } })();

  const [form, setForm] = useState({
    name: savedUser?.full_name || savedUser?.username || '',
    email: savedUser?.email || '',
    phone: savedUser?.phone || '',
    category: 'general',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [lastTicket, setLastTicket] = useState(null);

  const categories = [
    { value: 'general', label: tr('cat_general', 'استفسار عام') },
    { value: 'bug', label: tr('cat_bug', 'بلاغ خطأ تقني') },
    { value: 'feature_request', label: tr('cat_feature', 'اقتراح ميزة') },
    { value: 'complaint', label: tr('cat_complaint', 'شكوى') },
    { value: 'security', label: tr('cat_security', 'مخاوف أمنية') },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || form.message.trim().length < 10) {
      toast.error(tr('fill_all', 'يرجى تعبئة جميع الحقول المطلوبة (الرسالة يجب أن تكون 10 أحرف على الأقل)'));
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(`${API}/support/contact`, form, { headers });
      if (res.data?.ok) {
        toast.success(tr('sent_ok', `✅ تم إرسال طلبك بنجاح. رقم التذكرة: #${res.data.ticket_id.slice(0, 8)}`));
        setLastTicket(res.data.ticket_id);
        setForm({ ...form, subject: '', message: '' });
        if (onSubmitted) onSubmitted(res.data);
      } else {
        toast.error(tr('send_failed', 'فشل الإرسال، يرجى المحاولة مرة أخرى'));
      }
    } catch (err) {
      const msg = err?.response?.data?.detail?.[0]?.msg || err?.response?.data?.detail || 'خطأ في الشبكة';
      toast.error(`${tr('error', 'خطأ')}: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${compact ? 'max-w-2xl' : 'max-w-3xl'} mx-auto p-6`} data-testid="contact-support-page">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 p-6 text-white">
          <h1 className="text-2xl font-bold mb-1">🎧 {tr('title', 'تواصل مع الدعم الفني')}</h1>
          <p className="text-sm opacity-90">{tr('subtitle', 'نحن هنا لمساعدتك — أرسل رسالتك وسنرد خلال 24-48 ساعة')}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4" dir="rtl">
          {lastTicket && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-3 text-sm" data-testid="last-ticket-banner">
              <b className="text-emerald-700 dark:text-emerald-300">✅ {tr('last_success', 'آخر تذكرة تم إرسالها:')}</b>{' '}
              <span className="font-mono text-emerald-600 dark:text-emerald-400">#{lastTicket.slice(0, 8)}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tr('name', 'الاسم')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                data-testid="cs-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tr('email', 'البريد الإلكتروني')} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                data-testid="cs-email"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tr('phone', 'رقم الهاتف (اختياري)')}
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                data-testid="cs-phone"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tr('category', 'نوع الطلب')} <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                data-testid="cs-category"
              >
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {tr('subject', 'الموضوع')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              maxLength={200}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              data-testid="cs-subject"
              placeholder={tr('subject_ph', 'مثال: مشكلة في تسجيل الدخول')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {tr('message', 'الرسالة')} <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 me-2">({form.message.length}/4000)</span>
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={6}
              maxLength={4000}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              data-testid="cs-message"
              placeholder={tr('message_ph', 'اكتب رسالتك بالتفصيل هنا...')}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              📧 {tr('will_send_to', 'سيتم التواصل معك على:')} <b className="text-gray-700 dark:text-gray-300" dir="ltr">{form.email || '—'}</b>
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              data-testid="cs-submit"
            >
              {submitting ? tr('sending', '⏳ جارٍ الإرسال...') : `📨 ${tr('send', 'إرسال')}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactSupport;