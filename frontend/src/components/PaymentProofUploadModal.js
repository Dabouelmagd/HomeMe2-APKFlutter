import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { XMarkIcon, CloudArrowUpIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tokenHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const METHODS = [
  { key: 'vodafone_cash', label: 'فودافون كاش' },
  { key: 'orange_cash', label: 'أورانج كاش' },
  { key: 'etisalat_cash', label: 'اتصالات كاش' },
  { key: 'we_pay', label: 'WE Pay' },
  { key: 'instapay', label: 'إنستاباي' },
  { key: 'bank_transfer', label: 'تحويل بنكي' },
  { key: 'cash', label: 'نقداً' },
  { key: 'fawry', label: 'فوري' },
  { key: 'valu', label: 'ڤاليو' },
  { key: 'meeza', label: 'ميزة' },
  { key: 'other', label: 'أخرى' }
];

/**
 * Modal for residents to upload proof of out-of-app payment.
 * Props:
 *   - chargeId, chargeTitle, chargeAmount: optional (links proof to a unit_charge)
 *   - onClose, onSubmitted (callback)
 */
const PaymentProofUploadModal = ({ chargeId, chargeTitle, chargeAmount, onClose, onSubmitted }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [amount, setAmount] = useState(chargeAmount || '');
  const [methodType, setMethodType] = useState('vodafone_cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      toast.error('الحجم يجب أن يكون أقل من 8 ميجا');
      return;
    }
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('يرجى اختيار صورة الإيصال'); return; }
    if (!amount || parseFloat(amount) <= 0) { toast.error('أدخل المبلغ'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('proof', file);
      fd.append('amount', String(amount));
      fd.append('method_type', methodType);
      if (chargeId) fd.append('charge_id', chargeId);
      if (reference) fd.append('transaction_reference', reference);
      if (notes) fd.append('notes', notes);
      const res = await axios.post(`${API}/payment-proofs`, fd, {
        ...tokenHeader(),
        headers: { ...tokenHeader().headers, 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data?.message || 'تم رفع الإيصال بنجاح');
      onSubmitted?.(res.data);
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل رفع الإيصال');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        data-testid="payment-proof-modal"
      >
        <div className="bg-gradient-to-l from-emerald-600 to-teal-600 text-white p-5 sticky top-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CloudArrowUpIcon className="w-6 h-6" /> رفع إيصال الدفع
              </h3>
              <p className="text-white/80 text-sm mt-1">
                ارفع صورة الإيصال، الإدارة ستراجعها وتعتمد السداد.
              </p>
              {chargeTitle && (
                <div className="mt-3 bg-white/15 rounded-lg p-2.5 text-sm">
                  <p className="font-semibold">{chargeTitle}</p>
                  {chargeAmount > 0 && (
                    <p className="text-white/90 text-xs mt-1">
                      المطلوب: <span className="font-black">{Number(chargeAmount).toLocaleString()} ج.م</span>
                    </p>
                  )}
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* File picker */}
          <label className="block">
            <span className="text-sm font-semibold text-gray-700 mb-2 block">صورة الإيصال *</span>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-emerald-500 transition-colors cursor-pointer text-center">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFile}
                className="hidden"
                id="proof-file-input"
                data-testid="proof-file-input"
              />
              <label htmlFor="proof-file-input" className="cursor-pointer">
                {preview ? (
                  <img src={preview} alt="إيصال" className="max-h-48 mx-auto rounded" />
                ) : file ? (
                  <div className="text-sm text-gray-600">
                    <CheckCircleIcon className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
                    {file.name}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    <CloudArrowUpIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    اضغط لرفع صورة الإيصال (PNG, JPG, PDF — حتى 8 ميجا)
                  </div>
                )}
              </label>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">المبلغ المسدد *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0"
                required
                data-testid="proof-amount-input"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">طريقة الدفع *</label>
              <select
                value={methodType}
                onChange={(e) => setMethodType(e.target.value)}
                data-testid="proof-method-select"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {METHODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">رقم العملية / المرجع (اختياري)</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="مثل: TXN-2026-12345"
              data-testid="proof-reference-input"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1 block">ملاحظات (اختياري)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="2"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="أي تفاصيل إضافية"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold">
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              data-testid="submit-proof-btn"
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? 'جارٍ الرفع…' : (
                <>
                  <CloudArrowUpIcon className="w-5 h-5" />
                  رفع الإيصال
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentProofUploadModal;
