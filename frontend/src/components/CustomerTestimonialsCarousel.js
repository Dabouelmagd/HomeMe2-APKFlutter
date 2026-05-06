import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from '@heroicons/react/24/solid';

/**
 * Customer Testimonials Carousel — auto-rotates every 6s, swipeable, RTL-aware.
 * Featured testimonials from real-style company managers and admins.
 */
const TESTIMONIALS = [
  {
    name: 'مهندس أحمد فتحي',
    role: 'مدير شركة الفجر للإدارة العقارية',
    avatar_initials: 'أ.ف',
    avatar_color: 'from-violet-500 to-purple-600',
    quote: 'منصة HomeMe غيّرت طريقة إدارتنا للمجمعات. AI Auto-Pilot وحده وفّر علينا 12 ساعة أسبوعياً من المتابعة اليدوية. والشات الذكي قلّل تذاكر الدعم بنسبة 60%.',
    rating: 5,
    company_logo: '🏢',
    metrics: '+8 مجمعات • -60% تذاكر دعم',
  },
  {
    name: 'دينا محمود',
    role: 'مديرة كمبوند رويال سيتي',
    avatar_initials: 'د.م',
    avatar_color: 'from-emerald-500 to-teal-600',
    quote: 'الـ Subscription Analytics بيخليني أعرف صحة الإيراد كل يوم. شفت Churn Rate نزل من 8% لـ 2.5% بعد ما بدأت أستخدم Migration Tool. منصة قيمتها أعلى من سعرها بكتير.',
    rating: 5,
    company_logo: '🏘️',
    metrics: 'Churn 8% → 2.5%',
  },
  {
    name: 'مهندس عمر سعيد',
    role: 'أدمن مجمع النخيل',
    avatar_initials: 'ع.س',
    avatar_color: 'from-amber-500 to-orange-600',
    quote: 'مستشار AI استباقي اكتشف 3 سكان متأخرين عن الدفع قبل ما أنا أدري! وبضغطة واحدة بعت لهم تذكير عربي محترم. الحقيقة المنصة بتفكر بدلاً مني.',
    rating: 5,
    company_logo: '🌴',
    metrics: '5 إجراءات/يوم تلقائياً',
  },
  {
    name: 'أ. مروة الخولي',
    role: 'مديرة عقارات سما',
    avatar_initials: 'م.خ',
    avatar_color: 'from-rose-500 to-pink-600',
    quote: 'Stripe Auto-Renewal مع خصم الـ 17% خلّى التحصيل كأنه مفيش — كل شهر التجديد بيحصل لوحده. والـ Customer Portal بيخلي العملاء يديروا الكارت من غير ما يكلموني. توفير وقت رهيب!',
    rating: 5,
    company_logo: '🏛️',
    metrics: '0 متابعة تجديدات يدوية',
  },
  {
    name: 'مهندس كريم حسن',
    role: 'مدير شركة الخدمات المتكاملة',
    avatar_initials: 'ك.ح',
    avatar_color: 'from-indigo-500 to-blue-600',
    quote: 'البريد الترحيبي التلقائي للسكان الجدد ميزة بسيطة لكنها أنقذتني من ساعات. Bulk Import 200 ساكن من Excel + كل واحد فيهم استلم بريد ترحيب احترافي على الفور. عمليات سلسة 100%.',
    rating: 5,
    company_logo: '🌟',
    metrics: '+200 ساكن في 5 دقايق',
  },
];

const CustomerTestimonialsCarousel = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const iv = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(iv);
  }, [paused]);

  const goPrev = () => setActiveIdx((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  const goNext = () => setActiveIdx((prev) => (prev + 1) % TESTIMONIALS.length);

  const t = TESTIMONIALS[activeIdx];

  return (
    <section
      className="py-16 bg-gradient-to-b from-white via-violet-50/30 to-white relative overflow-hidden"
      id="testimonials"
      data-testid="testimonials-section"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Decorative quote mark */}
      <div className="absolute top-8 left-8 text-9xl text-violet-200/40 font-serif select-none">"</div>
      <div className="absolute bottom-8 right-8 text-9xl text-violet-200/40 font-serif select-none rotate-180">"</div>

      <div className="max-w-5xl mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold mb-3">
            ⭐ شهادات عملائنا
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>
            ماذا يقول عملاؤنا؟
          </h2>
          <p className="text-gray-500">+30 شركة إدارة و+100 مجمع يثقون بمنصة HomeMe يومياً</p>
        </div>

        {/* Main testimonial card */}
        <div className="relative max-w-3xl mx-auto">
          <div
            key={activeIdx}
            className="bg-white border-2 border-violet-100 rounded-3xl p-8 md:p-10 shadow-xl animate-in fade-in"
            data-testid={`testimonial-${activeIdx}`}
          >
            {/* Stars */}
            <div className="flex justify-center gap-1 mb-4">
              {Array.from({ length: t.rating }).map((_, i) => (
                <StarIcon key={i} className="w-5 h-5 text-amber-400" />
              ))}
            </div>

            {/* Quote */}
            <blockquote className="text-base md:text-lg text-gray-800 text-center leading-loose mb-6 font-medium" style={{ fontFamily: "'Cairo', sans-serif" }}>
              <span className="text-violet-500 text-3xl mr-1">"</span>
              {t.quote}
              <span className="text-violet-500 text-3xl mr-1">"</span>
            </blockquote>

            {/* Metrics badge */}
            {t.metrics && (
              <div className="flex justify-center mb-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-violet-100 to-fuchsia-100 text-violet-700 rounded-full text-xs font-bold">
                  📊 {t.metrics}
                </span>
              </div>
            )}

            {/* Author */}
            <div className="flex items-center justify-center gap-3">
              <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${t.avatar_color} flex items-center justify-center text-white text-base font-black shadow-md`}>
                {t.avatar_initials}
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 text-base">{t.name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1.5 justify-end">
                  <span>{t.role}</span>
                  <span className="text-base">{t.company_logo}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Nav arrows */}
          <button
            onClick={goPrev}
            className="absolute top-1/2 -translate-y-1/2 right-0 -mr-4 md:-mr-6 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-violet-50 hover:border-violet-300 transition-all"
            data-testid="testimonial-prev"
            aria-label="السابق"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={goNext}
            className="absolute top-1/2 -translate-y-1/2 left-0 -ml-4 md:-ml-6 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-violet-50 hover:border-violet-300 transition-all"
            data-testid="testimonial-next"
            aria-label="التالي"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`h-2 rounded-full transition-all ${
                i === activeIdx ? 'w-8 bg-gradient-to-r from-violet-600 to-fuchsia-600' : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              data-testid={`testimonial-dot-${i}`}
              aria-label={`عرض الشهادة رقم ${i + 1}`}
            />
          ))}
        </div>

        {/* Trust strip */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-3xl font-black bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">+30</p>
            <p className="text-xs text-gray-500 mt-1">شركة إدارة</p>
          </div>
          <div>
            <p className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">+100</p>
            <p className="text-xs text-gray-500 mt-1">مجمع سكني</p>
          </div>
          <div>
            <p className="text-3xl font-black bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">+5,000</p>
            <p className="text-xs text-gray-500 mt-1">ساكن نشط</p>
          </div>
          <div>
            <p className="text-3xl font-black bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">4.9/5</p>
            <p className="text-xs text-gray-500 mt-1">متوسط التقييم</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CustomerTestimonialsCarousel;
