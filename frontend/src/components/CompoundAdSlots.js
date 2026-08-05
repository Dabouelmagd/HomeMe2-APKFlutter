import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  RectangleGroupIcon, XMarkIcon, CheckCircleIcon,
  EnvelopeIcon, PhoneIcon, CalendarIcon, CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tok = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

// Slot visual card
const SlotCard = ({ slot, onBook }) => {
  const isFull = slot.is_full;

  return (
    <div
      onClick={() => !isFull && onBook(slot)}
      className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
        isFull
          ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed opacity-60'
          : 'border-dashed border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-100 cursor-pointer group'
      }`}
      style={{ minHeight: Math.min(slot.height / 2, 180) }}
    >
      {/* Slot visual area */}
      <div className={`flex flex-col items-center justify-center p-6 text-center ${isFull ? '' : 'group-hover:bg-emerald-50/50 dark:group-hover:bg-emerald-900/10'} transition-colors`}>
        {isFull ? (
          <>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{slot.name_ar}</p>
            <p className="text-xs text-emerald-600 font-bold mt-1">✅ محجوزة</p>
            <p className="text-xs text-gray-400 mt-1">{slot.dimensions}</p>
          </>
        ) : (
          <>
            {/* Dotted visual placeholder */}
            <div className="w-full mb-4 rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 flex items-center justify-center py-4"
              style={{ height: Math.min(slot.height / 3, 80) }}>
              <div className="text-center">
                <RectangleGroupIcon className="h-8 w-8 text-emerald-300 dark:text-emerald-700 mx-auto mb-1" />
                <p className="text-xs text-emerald-400 dark:text-emerald-600 font-mono">{slot.dimensions}</p>
              </div>
            </div>

            <p className="text-sm font-black text-gray-900 dark:text-white mb-1">{slot.name_ar}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{slot.description}</p>

            {/* Availability badges */}
            <div className="flex gap-2 mb-3 flex-wrap justify-center">
              <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                👁️ {slot.visibility}
              </span>
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full">
                {slot.available_count} متاح
              </span>
              <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full">
                {slot.price_monthly.toLocaleString()} ج.م/شهر
              </span>
            </div>

            {/* CTA */}
            <div className="bg-emerald-600 group-hover:bg-emerald-700 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors">
              📋 انقر للحجز
            </div>
          </>
        )}
      </div>

      {/* Badge */}
      <div className="absolute top-2 right-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          isFull ? 'bg-gray-200 text-gray-600' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {isFull ? 'ممتلئ' : 'متاح'}
        </span>
      </div>
    </div>
  );
};

// Booking modal
const BookingModal = ({ slot, compoundId, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    advertiser_name: user?.full_name || '',
    advertiser_email: user?.email || '',
    advertiser_phone: '',
    message: '',
    duration_months: 1,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const totalPrice = slot.price_monthly * form.duration_months;

  const handleSubmit = async () => {
    if (!form.advertiser_name.trim() || !form.advertiser_email.trim()) {
      toast.error('الاسم والإيميل مطلوبان');
      return;
    }
    setSaving(true);
    try {
      const res = await axios.post(`${API}/ad-slots/request`, {
        slot_key: slot.slot_key,
        compound_id: compoundId,
        ...form,
      }, tok());
      toast.success(res.data.message || '✅ تم إرسال طلب الحجز بنجاح');
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل الإرسال');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()} dir="rtl">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-black text-lg">📋 حجز مساحة إعلانية</h3>
              <p className="text-emerald-100 text-sm mt-0.5">{slot.name_ar} — {slot.dimensions}</p>
            </div>
            <button onClick={onClose} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg">
              <XMarkIcon className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        {/* Price summary */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 px-5 py-3 border-b border-emerald-100 dark:border-emerald-800">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {[1, 3, 6, 12].map(m => (
                <button key={m} onClick={() => set('duration_months', m)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                    form.duration_months === m
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                  }`}>
                  {m} {m === 1 ? 'شهر' : 'أشهر'}
                </button>
              ))}
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500">الإجمالي</p>
              <p className="text-lg font-black text-emerald-600">{totalPrice.toLocaleString()} ج.م</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-5 space-y-3">
          {[
            ['الاسم *', 'advertiser_name', 'text', 'اسمك أو اسم شركتك'],
            ['البريد الإلكتروني *', 'advertiser_email', 'email', 'email@example.com'],
            ['رقم الهاتف', 'advertiser_phone', 'tel', '01xxxxxxxxx'],
          ].map(([label, key, type, ph]) => (
            <div key={key}>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
              <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
                placeholder={ph}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">رسالة إضافية</label>
            <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={2}
              placeholder="أي تفاصيل إضافية تريد إضافتها..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none resize-none" />
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
            📧 سيصل طلبك فوراً لفريق HomeMe — سيتواصلون معك خلال 24 ساعة
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-sm disabled:opacity-60 transition-colors">
            {saving ? '⏳ جاري الإرسال...' : `📋 إرسال طلب الحجز — ${totalPrice.toLocaleString()} ج.م`}
          </button>
          <button onClick={onClose} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

// Main component
export default function CompoundAdSlots({ compoundId }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const fetchSlots = async () => {
    if (!compoundId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/ad-slots/compound/${compoundId}`, tok());
      setSlots(res.data.slots || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSlots(); }, [compoundId]);

  const available = slots.filter(s => !s.is_full).length;
  const booked = slots.filter(s => s.is_full).length;

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
    </div>
  );

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
            <RectangleGroupIcon className="h-5 w-5 text-emerald-600" />
            المساحات الإعلانية
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {available} متاحة · {booked} محجوزة
          </p>
        </div>
        <div className="flex gap-2">
          <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1 rounded-full">{available} متاح</span>
          <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2.5 py-1 rounded-full">{booked} محجوز</span>
        </div>
      </div>

      {/* Slots grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {slots.map(slot => (
          <SlotCard key={slot.slot_key} slot={slot} onBook={setSelectedSlot} />
        ))}
      </div>

      {/* Info note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-400">
        💡 اضغط على أي مساحة فارغة لطلب حجزها — سيصل طلبك لفريق HomeMe فوراً
      </div>

      {/* Booking modal */}
      {selectedSlot && (
        <BookingModal
          slot={selectedSlot}
          compoundId={compoundId}
          onClose={() => setSelectedSlot(null)}
          onSuccess={() => { setSelectedSlot(null); fetchSlots(); }}
        />
      )}
    </div>
  );
}
