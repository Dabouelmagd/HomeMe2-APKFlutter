/**
 * AdBookingModal — Self-Serve Ad Booking with:
 * - Live Preview
 * - Tiered Pricing (weekly/monthly/quarterly)
 * - Real-time Availability Checker
 * - Date-range picker
 * - File upload
 */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  XMarkIcon, PhotoIcon, CalendarDaysIcon,
  CheckCircleIcon, ExclamationTriangleIcon,
  CurrencyDollarIcon, ClockIcon
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tok = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const SLOTS = [
  { key: 'hero_spotlight',   label: '🌟 Hero Spotlight',     desc: 'أعلى الصفحة الرئيسية — أعلى ظهور', tier: 'gold' },
  { key: 'top_sticky',      label: '📌 Top Sticky Banner',   desc: 'شريط ثابت أعلى كل الصفحات',        tier: 'gold' },
  { key: 'section_divider', label: '🔲 Section Divider',     desc: 'فاصل بين أقسام الصفحة الرئيسية',    tier: 'standard' },
  { key: 'native_feed',     label: '🃏 Native Feed Card',    desc: 'بطاقة ممولة في قوائم الكمبوندات',   tier: 'standard' },
  { key: 'popup_modal',     label: '💬 Entry/Exit Modal',    desc: 'نافذة منبثقة عند الدخول/الخروج',    tier: 'gold' },
  { key: 'sidebar',         label: '📋 Sidebar Banner',      desc: 'بانر جانبي داخل لوحة التحكم',       tier: 'standard' },
  { key: 'dashboard_banner',label: '📊 Dashboard Banner',    desc: 'بانر في داشبورد المقيمين',           tier: 'standard' },
];

const PERIODS = [
  { key: 'weekly',    label: 'أسبوعي',        discount: 0,    badge: null },
  { key: 'monthly',   label: 'شهري',           discount: 15,   badge: '⭐ الأشهر' },
  { key: 'quarterly', label: 'ربع سنوي',      discount: 30,   badge: '💎 الأوفر' },
];

export default function AdBookingModal({ onClose, onSuccess }) {
  const [step, setStep]           = useState(1); // 1=slot, 2=dates, 3=creative, 4=confirm
  const [slotKey, setSlotKey]     = useState('');
  const [period, setPeriod]       = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [pricing, setPricing]     = useState(null);
  const [avail, setAvail]         = useState(null);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [title, setTitle]         = useState('');
  const [description, setDesc]    = useState('');
  const [linkUrl, setLinkUrl]     = useState('');
  const [ctaText, setCtaText]     = useState('اعرف المزيد');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch pricing when slot or period changes
  useEffect(() => {
    if (!slotKey) return;
    axios.get(`${API}/ad-slots/pricing`, { ...tok(), params: { slot_key: slotKey, period } })
      .then(r => setPricing(r.data))
      .catch(() => {});
  }, [slotKey, period]);

  // Auto-set end date based on period
  useEffect(() => {
    if (!startDate || !period) return;
    const start = new Date(startDate);
    const days  = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 90;
    const end   = new Date(start);
    end.setDate(end.getDate() + days);
    setEndDate(end.toISOString().slice(0, 10));
  }, [startDate, period]);

  // Check availability
  const checkAvail = useCallback(async () => {
    if (!slotKey || !startDate || !endDate) return;
    setCheckingAvail(true);
    try {
      const r = await axios.get(`${API}/ad-slots/availability`, {
        ...tok(),
        params: { slot_key: slotKey, start_date: startDate, end_date: endDate }
      });
      setAvail(r.data);
    } catch { setAvail(null); }
    setCheckingAvail(false);
  }, [slotKey, startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) checkAvail();
  }, [startDate, endDate, checkAvail]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('الحجم الأقصى 5MB'); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!slotKey || !startDate || !endDate || !title) {
      toast.error('يرجى ملء كل الحقول المطلوبة');
      return;
    }
    if (avail && !avail.available) {
      toast.error('المساحة غير متاحة في هذه الفترة');
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        const fd = new FormData();
        fd.append('file', imageFile);
        const up = await axios.post(`${API}/upload`, fd, tok());
        imageUrl = up.data.url || '';
      }
      await axios.post(`${API}/ad-slots/request`, {
        slot_key: slotKey, period,
        start_date: startDate, end_date: endDate,
        title, description, link_url: linkUrl,
        cta_text: ctaText, image_url: imageUrl,
        price: pricing?.final_price || 0,
      }, tok());
      toast.success('✅ تم إرسال طلب الإعلان — في انتظار المراجعة');
      onSuccess?.();
      onClose?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل إرسال الطلب');
    }
    setSubmitting(false);
  };

  const selectedSlot = SLOTS.find(s => s.key === slotKey);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl shadow-2xl
          max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-white text-lg">📢 حجز مساحة إعلانية</h2>
              <p className="text-emerald-100 text-xs mt-0.5">خطوة {step} من 4</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          {/* Progress */}
          <div className="flex gap-1 mt-4">
            {[1,2,3,4].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${
                s <= step ? 'bg-white' : 'bg-white/30'
              }`} />
            ))}
          </div>
        </div>

        <div className="p-5 space-y-5">

          {/* ── STEP 1: Choose slot ─────────────────────────────── */}
          {step === 1 && (
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">اختر المساحة الإعلانية</h3>
              <div className="space-y-2">
                {SLOTS.map(slot => (
                  <div
                    key={slot.key}
                    onClick={() => setSlotKey(slot.key)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      slotKey === slot.key
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-gray-900 dark:text-white">{slot.label}</p>
                        {slot.tier === 'gold' && (
                          <span className="text-[9px] bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded-full">ذهبي</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{slot.desc}</p>
                    </div>
                    {slotKey === slot.key && (
                      <CheckCircleIcon className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Period + Dates + Availability ────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-3">اختر المدة والتواريخ</h3>

                {/* Period tabs */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {PERIODS.map(p => (
                    <button
                      key={p.key}
                      onClick={() => setPeriod(p.key)}
                      className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                        period === p.key
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                      }`}
                    >
                      {p.badge && (
                        <span className="absolute -top-2 right-1/2 translate-x-1/2
                          text-[9px] bg-emerald-500 text-white font-black
                          px-2 py-0.5 rounded-full whitespace-nowrap">
                          {p.badge}
                        </span>
                      )}
                      <p className="font-bold text-sm text-gray-900 dark:text-white mt-1">{p.label}</p>
                      {p.discount > 0 && (
                        <p className="text-[10px] text-emerald-600 font-black">خصم {p.discount}%</p>
                      )}
                    </button>
                  ))}
                </div>

                {/* Pricing card */}
                {pricing && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20
                    border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        <CurrencyDollarIcon className="h-4 w-4 inline ml-1" />
                        {pricing.period_label}
                      </span>
                      {pricing.savings > 0 && (
                        <span className="text-xs bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full">
                          وفّري {pricing.savings.toLocaleString('ar-EG')} ج.م
                        </span>
                      )}
                    </div>
                    <div className="flex items-end gap-2">
                      {pricing.savings > 0 && (
                        <p className="text-sm text-gray-400 line-through">
                          {pricing.base_price.toLocaleString('ar-EG')} ج.م
                        </p>
                      )}
                      <p className="text-2xl font-black text-emerald-600">
                        {pricing.final_price.toLocaleString('ar-EG')} <span className="text-sm font-normal text-gray-500">ج.م</span>
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {pricing.daily_rate.toLocaleString('ar-EG')} ج.م/يوم × {pricing.days} يوم
                    </p>
                  </div>
                )}

                {/* Date pickers */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      <CalendarDaysIcon className="h-3.5 w-3.5 inline ml-1" />تاريخ البدء *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      min={new Date().toISOString().slice(0,10)}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-xl
                        px-3 py-2 text-sm bg-white dark:bg-gray-800 outline-none
                        focus:border-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      تاريخ الانتهاء
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-xl
                        px-3 py-2 text-sm bg-white dark:bg-gray-800 outline-none
                        focus:border-emerald-400"
                    />
                  </div>
                </div>

                {/* Availability status */}
                {checkingAvail && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                    <ClockIcon className="h-4 w-4 animate-spin" /> جاري التحقق من التوافر...
                  </div>
                )}
                {avail && !checkingAvail && (
                  <div className={`flex items-center gap-2 p-3 rounded-xl mt-2 text-sm font-bold ${
                    avail.available
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-900/20'
                      : 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20'
                  }`}>
                    {avail.available
                      ? <><CheckCircleIcon className="h-5 w-5" /> متاحة! ({avail.slots_remaining} مساحة متبقية)</>
                      : <><ExclamationTriangleIcon className="h-5 w-5" />
                          محجوزة — أقرب موعد متاح: {avail.next_available || 'غير محدد'}</>
                    }
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: Creative ─────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 dark:text-white">تفاصيل الإعلان</h3>

              {[
                ['عنوان الإعلان *', title, setTitle, 'text', 'مثال: خصم 30% على الصيانة الشهرية'],
                ['وصف مختصر', description, setDesc, 'text', 'جملة واحدة تشرح الإعلان'],
                ['رابط الهبوط *', linkUrl, setLinkUrl, 'url', 'https://...'],
                ['نص زرار CTA', ctaText, setCtaText, 'text', 'مثال: اعرف المزيد، احجز الآن'],
              ].map(([label, val, setter, type, ph]) => (
                <div key={label}>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                  <input
                    type={type}
                    value={val}
                    onChange={e => setter(e.target.value)}
                    placeholder={ph}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl
                      px-3 py-2 text-sm bg-white dark:bg-gray-800 outline-none
                      focus:border-emerald-400"
                  />
                </div>
              ))}

              {/* Image upload */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  صورة الإعلان (PNG/JPG/WebP/GIF — حتى 5MB)
                </label>
                <label className="flex flex-col items-center justify-center h-32
                  border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl
                  cursor-pointer hover:border-emerald-400 transition-colors overflow-hidden">
                  {imagePreview
                    ? <img src={imagePreview} alt="preview" className="h-full w-full object-cover" />
                    : <>
                        <PhotoIcon className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-xs text-gray-500">اضغط لرفع الصورة</p>
                      </>
                  }
                  <input type="file" accept="image/*,.gif" onChange={handleImageChange} className="hidden" />
                </label>
              </div>

              {/* Live Preview */}
              {(title || imagePreview) && (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2">معاينة مباشرة:</p>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    {imagePreview && (
                      <img src={imagePreview} alt="ad preview" className="w-full h-32 object-cover" />
                    )}
                    <div className="p-3 bg-white dark:bg-gray-800">
                      <div className="flex items-start justify-between">
                        <div>
                          {title && <p className="font-black text-sm text-gray-900 dark:text-white">{title}</p>}
                          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
                        </div>
                        <span className="text-[9px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded flex-shrink-0 mr-2">
                          إعلان
                        </span>
                      </div>
                      {ctaText && (
                        <button className="mt-2 text-xs bg-emerald-600 text-white font-bold
                          px-3 py-1.5 rounded-lg">{ctaText}</button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Confirm ──────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 dark:text-white">تأكيد الطلب</h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
                {[
                  ['المساحة', selectedSlot?.label || slotKey],
                  ['المدة', PERIODS.find(p=>p.key===period)?.label],
                  ['تاريخ البدء', startDate],
                  ['تاريخ الانتهاء', endDate],
                  ['الإجمالي', pricing ? `${pricing.final_price.toLocaleString('ar-EG')} ج.م` : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{v}</span>
                  </div>
                ))}
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800
                rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300">
                ℹ️ سيتم مراجعة إعلانك من الإدارة خلال 24 ساعة، وستتلقى إشعاراً بالبريد الإلكتروني عند القبول.
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="px-5 py-2.5 border border-gray-200 dark:border-gray-700
                  rounded-xl text-sm font-bold text-gray-600 dark:text-gray-400
                  hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                ← السابق
              </button>
            )}
            <button
              onClick={() => {
                if (step < 4) {
                  if (step === 1 && !slotKey) { toast.error('اختر مساحة إعلانية'); return; }
                  if (step === 2 && (!startDate || !endDate)) { toast.error('اختر تواريخ الحجز'); return; }
                  if (step === 2 && avail && !avail.available) { toast.error('المساحة غير متاحة'); return; }
                  if (step === 3 && (!title || !linkUrl)) { toast.error('العنوان والرابط مطلوبان'); return; }
                  setStep(s => s + 1);
                } else {
                  handleSubmit();
                }
              }}
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600
                text-white font-black py-2.5 rounded-xl text-sm
                hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {step < 4 ? 'التالي ←' : submitting ? 'جاري الإرسال...' : '✅ إرسال الطلب للمراجعة'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
