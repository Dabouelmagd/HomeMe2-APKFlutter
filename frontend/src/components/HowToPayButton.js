import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  CreditCardIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  BuildingLibraryIcon,
  DevicePhoneMobileIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tokenHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const TYPE_ICONS = {
  vodafone_cash: DevicePhoneMobileIcon, orange_cash: DevicePhoneMobileIcon,
  etisalat_cash: DevicePhoneMobileIcon, we_pay: DevicePhoneMobileIcon,
  fawry: DevicePhoneMobileIcon, valu: DevicePhoneMobileIcon,
  meeza: CreditCardIcon, instapay: CreditCardIcon,
  bank_transfer: BuildingLibraryIcon, cash: BanknotesIcon, other: CreditCardIcon
};

const TYPE_COLORS = {
  vodafone_cash: 'from-red-500 to-rose-600', orange_cash: 'from-orange-500 to-amber-600',
  etisalat_cash: 'from-emerald-500 to-teal-600', we_pay: 'from-fuchsia-500 to-purple-600',
  instapay: 'from-violet-500 to-indigo-600', bank_transfer: 'from-blue-500 to-cyan-600',
  cash: 'from-green-500 to-emerald-600', fawry: 'from-yellow-500 to-orange-500',
  valu: 'from-rose-500 to-pink-600', meeza: 'from-slate-500 to-gray-700',
  other: 'from-slate-400 to-slate-600'
};

/**
 * "How do I pay?" inline trigger button + modal showing the compound's
 * approved payment methods. Reusable across financial pages so residents
 * can quickly copy account numbers without leaving the page.
 *
 * Props:
 *  - amount: optional float to display (e.g., charge.amount)
 *  - chargeTitle: optional string (e.g., "صيانة شهر مايو - وحدة 12")
 *  - className: optional extra classes for trigger button
 *  - variant: 'button' (default) | 'inline-link' | 'icon-only'
 */
const HowToPayButton = ({ amount, chargeTitle, className = '', variant = 'button' }) => {
  const [open, setOpen] = useState(false);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    axios.get(`${API}/compound-payment-methods?only_active=true`, tokenHeader())
      .then(res => setMethods(res.data.methods || []))
      .catch(() => setMethods([]))
      .finally(() => setLoading(false));
  }, [open]);

  const copy = async (txt, label) => {
    try { await navigator.clipboard.writeText(txt); toast.success(label || 'تم النسخ'); }
    catch { toast.error('فشل النسخ'); }
  };

  const triggerClass =
    variant === 'inline-link'
      ? `text-indigo-600 hover:text-indigo-800 underline text-sm font-semibold ${className}`
      : variant === 'icon-only'
      ? `p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 ${className}`
      : `inline-flex items-center gap-2 bg-gradient-to-l from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-sm font-semibold rounded-xl px-4 py-2.5 shadow-sm transition ${className}`;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid="how-to-pay-btn"
        className={triggerClass}
        title="كيف أدفع؟"
      >
        <CreditCardIcon className={variant === 'icon-only' ? 'w-5 h-5' : 'w-4 h-4'} />
        {variant !== 'icon-only' && <span>كيف أدفع؟</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          data-testid="how-to-pay-modal"
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="bg-gradient-to-l from-violet-600 to-indigo-600 text-white p-5 sticky top-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <CreditCardIcon className="w-6 h-6" />
                    طرق الدفع المعتمدة
                  </h3>
                  <p className="text-white/80 text-sm mt-1">
                    اختر القناة المناسبة لك وأرسل المبلغ ثم أرفق إيصال السداد للإدارة.
                  </p>
                  {(amount || chargeTitle) && (
                    <div className="mt-3 bg-white/15 rounded-lg p-3 text-sm">
                      {chargeTitle && <p className="font-semibold">{chargeTitle}</p>}
                      {amount > 0 && (
                        <p className="text-white/90 mt-1">
                          المبلغ المطلوب:{' '}
                          <span className="font-black text-lg">{Number(amount).toLocaleString()} ج.م</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-lg"
                  aria-label="إغلاق"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {loading && (
                <p className="text-center text-gray-500 py-8">جارٍ التحميل…</p>
              )}
              {!loading && methods.length === 0 && (
                <div className="text-center py-10">
                  <CreditCardIcon className="w-14 h-14 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-700 font-semibold mb-1">لا توجد طرق دفع مفعّلة بعد</p>
                  <p className="text-sm text-gray-500">
                    تواصل مع إدارة الكمبوند لمعرفة طريقة السداد.
                  </p>
                </div>
              )}
              {!loading && methods.map((m) => {
                const Icon = TYPE_ICONS[m.method_type] || CreditCardIcon;
                const grad = TYPE_COLORS[m.method_type] || TYPE_COLORS.other;
                return (
                  <div
                    key={m.id}
                    className="border border-gray-200 rounded-xl overflow-hidden"
                    data-testid={`how-to-pay-method-${m.id}`}
                  >
                    <div className={`bg-gradient-to-l ${grad} text-white p-3 flex items-center gap-3`}>
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold leading-tight">{m.display_name || m.type_label_ar}</p>
                        <p className="text-white/80 text-xs">{m.type_label_ar}</p>
                      </div>
                    </div>
                    <div className="p-4 space-y-2 text-sm">
                      {m.account_number && (
                        <FieldRow
                          label="الرقم/الحساب"
                          value={m.account_number}
                          mono
                          onCopy={() => copy(m.account_number, 'تم نسخ الرقم')}
                        />
                      )}
                      {m.account_holder && <FieldRow label="اسم المستفيد" value={m.account_holder} />}
                      {m.bank_name && <FieldRow label="البنك" value={m.bank_name} />}
                      {m.iban && (
                        <FieldRow
                          label="IBAN"
                          value={m.iban}
                          mono
                          onCopy={() => copy(m.iban, 'تم نسخ الـ IBAN')}
                        />
                      )}
                      {m.swift_code && <FieldRow label="SWIFT" value={m.swift_code} mono />}
                      {m.instructions && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-amber-900 text-xs whitespace-pre-line mt-2">
                          📋 {m.instructions}
                        </div>
                      )}
                      {m.fee_note && (
                        <p className="text-xs text-gray-500 mt-1">💡 {m.fee_note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-100 p-4 bg-gray-50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="px-5 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold text-sm"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const FieldRow = ({ label, value, onCopy, mono }) => (
  <div className="flex items-center justify-between gap-2 border-b border-gray-50 last:border-0 pb-1.5">
    <span className="text-xs text-gray-500">{label}</span>
    <div className="flex items-center gap-1.5">
      <span className={`text-sm font-semibold text-gray-800 ${mono ? 'font-mono tracking-wider' : ''}`}>
        {value}
      </span>
      {onCopy && (
        <button
          onClick={onCopy}
          className="p-1 hover:bg-indigo-50 rounded text-indigo-600"
          title="نسخ"
          data-testid="copy-btn"
        >
          <ClipboardDocumentIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  </div>
);

export default HowToPayButton;
