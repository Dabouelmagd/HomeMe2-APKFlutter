import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  CheckCircleIcon,
  CloudArrowUpIcon,
  DevicePhoneMobileIcon,
  QrCodeIcon,
  BanknotesIcon,
  XMarkIcon,
  ReceiptPercentIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const METHODS = [
  { id: 'vodafone_cash', label: 'فودافون كاش',  icon: DevicePhoneMobileIcon, accent: 'from-red-500 to-red-600',     number: '00201012625529' },
  { id: 'instapay',      label: 'إنستاباي',      icon: QrCodeIcon,           accent: 'from-emerald-500 to-teal-600', number: '00201006008552' },
  { id: 'bank_transfer', label: 'تحويل بنكي',    icon: BanknotesIcon,        accent: 'from-blue-500 to-blue-700',   number: '144080699002 — بنك الإسكندرية' },
  { id: 'paypal',        label: 'PayPal',         icon: ReceiptPercentIcon,   accent: 'from-indigo-500 to-blue-600', number: 'dalia_abouelmagd@hotmail.com' },
];

const PLANS = [
  { key: 'starter',  label: 'مجاني'    },
  { key: 'basic',    label: 'أساسي'    },
  { key: 'pro',      label: 'احترافي'  },
  { key: 'premium',  label: 'متقدم'    },
];

/**
 * PaymentConfirmationForm
 *   Logged-in admins submit proof of a Vodafone Cash / InstaPay / Bank
 *   transfer so HomeMe support can verify and activate the subscription.
 *
 * POST /api/support/payment-confirmation  (multipart/form-data)
 */
const PaymentConfirmationForm = ({ defaultMethod = 'vodafone_cash', onSubmitted }) => {
  const [form, setForm] = useState({
    method: defaultMethod,
    plan: '',
    amount: '',
    transaction_ref: '',
    transfer_date: '',
    sender_name: '',
    sender_phone: '',
    notes: '',
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTicket, setSentTicket] = useState(null);

  const handleFile = (f) => {
    if (!f) { setFile(null); setPreview(null); return; }
    if (f.size > 8 * 1024 * 1024) {
      toast.error('الملف كبير جداً (الحد الأقصى 8MB)');
      return;
    }
    setFile(f);
    if (f.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = (ev) => setPreview(ev.target.result);
      r.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!form.method || !form.transaction_ref.trim()) {
      toast.error('يرجى اختيار طريقة الدفع وإدخال رقم العملية');
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('يجب تسجيل الدخول لإرسال إيصال الدفع');
        setSubmitting(false);
        return;
      }
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      if (file) fd.append('proof', file);
      const res = await axios.post(`${API}/support/payment-confirmation`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.ok) {
        toast.success(`✅ تم إرسال إيصال الدفع — رقم التذكرة #${res.data.ticket_id.slice(0, 8)}`);
        setSentTicket(res.data.ticket_id);
        setForm({ ...form, transaction_ref: '', amount: '', notes: '' });
        setFile(null); setPreview(null);
        onSubmitted && onSubmitted(res.data);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || 'فشل الإرسال';
      toast.error(typeof msg === 'string' ? msg : 'فشل الإرسال');
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTicket) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 p-6 text-center">
        <CheckCircleIcon className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
        <h3 className="font-bold text-emerald-900 dark:text-emerald-100 mb-1">✨ تم استلام إيصالك بنجاح</h3>
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          رقم التذكرة: <span className="font-mono font-bold">#{sentTicket.slice(0, 8)}</span>
        </p>
        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-2">
          سيتواصل معكم فريق هوم مي بعد مراجعة الإيصال خلال ساعة 🚀
        </p>
        <button
          type="button"
          onClick={() => setSentTicket(null)}
          className="mt-4 text-xs font-semibold text-emerald-600 hover:underline"
          data-testid="pc-submit-another"
        >
          إرسال إيصال آخر
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" data-testid="payment-confirmation-form">
      {/* Method selector */}
      <div>
        <label className="text-xs font-bold text-gray-700 dark:text-gray-200">طريقة الدفع</label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {METHODS.map((m) => {
            const Icon = m.icon;
            const active = form.method === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setForm({ ...form, method: m.id })}
                className={`relative rounded-xl border-2 p-3 transition-all text-center ${
                  active
                    ? `border-transparent bg-gradient-to-br ${m.accent} text-white shadow-lg`
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-rose-300'
                }`}
                data-testid={`pc-method-${m.id}`}
              >
                <Icon className={`w-6 h-6 mx-auto ${active ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                <span className={`block text-xs font-bold mt-1 ${active ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment Info Box */}
      {form.method && (() => {
        const m = METHODS.find(x => x.id === form.method);
        return m ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1">📋 بيانات الدفع</p>
            <p className="text-sm font-mono font-bold text-emerald-900 dark:text-emerald-100 select-all">{m.number}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">اضغط للنسخ ثم حوّل المبلغ وارفع الإيصال أدناه</p>
          </div>
        ) : null;
      })()}

      {/* VAT Note */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
        <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
          💡 الأسعار شاملة ضريبة القيمة المضافة 14% — سيُرسل إليك فاتورة ضريبية على بريدك الإلكتروني بعد تأكيد الدفع
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          🌍 للعملاء خارج مصر: الدفع بالدولار الأمريكي فقط
        </p>
      </div>

      {/* Plan + Amount */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-700 dark:text-gray-200">الخطة</label>
          <select
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            data-testid="pc-plan"
          >
            <option value="">— اختياري —</option>
            {PLANS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-700 dark:text-gray-200">المبلغ</label>
          <input
            type="text"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="مثال: 2200 ج.م"
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            data-testid="pc-amount"
          />
        </div>
      </div>

      {/* Transaction ref (required) */}
      <div>
        <label className="text-xs font-bold text-gray-700 dark:text-gray-200">
          رقم العملية / Reference <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          value={form.transaction_ref}
          onChange={(e) => setForm({ ...form, transaction_ref: e.target.value })}
          placeholder="الرقم الموجود في رسالة التأكيد"
          className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          data-testid="pc-ref"
        />
      </div>

      {/* Date + Sender */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-700 dark:text-gray-200">تاريخ التحويل</label>
          <input
            type="date"
            value={form.transfer_date}
            onChange={(e) => setForm({ ...form, transfer_date: e.target.value })}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            data-testid="pc-date"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-700 dark:text-gray-200">اسم المرسل</label>
          <input
            type="text"
            value={form.sender_name}
            onChange={(e) => setForm({ ...form, sender_name: e.target.value })}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            data-testid="pc-sender-name"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-700 dark:text-gray-200">هاتف المرسل</label>
          <input
            type="tel"
            value={form.sender_phone}
            onChange={(e) => setForm({ ...form, sender_phone: e.target.value })}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            data-testid="pc-sender-phone"
          />
        </div>
      </div>

      {/* File upload */}
      <div>
        <label className="text-xs font-bold text-gray-700 dark:text-gray-200">📎 إيصال الدفع (صورة / PDF)</label>
        {!file ? (
          <label
            htmlFor="pc-proof-input"
            className="mt-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-6 cursor-pointer hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition"
            data-testid="pc-upload-label"
          >
            <CloudArrowUpIcon className="w-8 h-8 text-gray-400" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">اضغطي لاختيار الملف</span>
            <span className="text-[10px] text-gray-400">PNG / JPG / PDF — حتى 8MB</span>
          </label>
        ) : (
          <div className="mt-1 relative rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3">
            <button
              type="button"
              onClick={() => { setFile(null); setPreview(null); }}
              className="absolute -top-2 -end-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white shadow flex items-center justify-center"
              data-testid="pc-remove-file"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
            {preview ? (
              <img src={preview} alt="proof" className="max-h-40 mx-auto rounded" />
            ) : (
              <div className="flex items-center gap-2">
                <ReceiptPercentIcon className="w-6 h-6 text-gray-500" />
                <span className="text-xs text-gray-600 dark:text-gray-300">{file.name}</span>
              </div>
            )}
          </div>
        )}
        <input
          id="pc-proof-input"
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
          data-testid="pc-upload-input"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-bold text-gray-700 dark:text-gray-200">ملاحظات إضافية</label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          data-testid="pc-notes"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all shadow-md shadow-rose-500/30 disabled:opacity-60"
        data-testid="pc-submit"
      >
        {submitting ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <CheckCircleIcon className="w-5 h-5" />
        )}
        <span>{submitting ? 'جاري الإرسال...' : 'إرسال إيصال الدفع'}</span>
      </button>
    </form>
  );
};

export default PaymentConfirmationForm;
