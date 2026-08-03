import React from 'react';
import { useTranslation } from 'react-i18next';

export const LiveDemoSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white" id="live-demo" data-testid="live-demo-section">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold mb-4">
            🎬 {t('hp_live_demo_badge', 'عرض حي تفاعلي')}
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>
            {t('hp_live_demo_title', 'شوف الميزات الجديدة في العمل')}
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            {t('hp_live_demo_desc', 'استكشف الميزات قبل الاشتراك — تصاميم محاكاة لأهم ٣ ميزات AI')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Demo 1 — AI Chat Mock */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all" data-testid="demo-ai-chat">
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">✨</div>
                <div>
                  <p className="text-sm font-bold">مساعد HomeMe</p>
                  <p className="text-[10px] opacity-80">Claude AI · يجاوب فوراً</p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-2 bg-gray-50 min-h-[260px]">
              <div className="flex justify-end">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl rounded-br-sm px-3 py-2 text-xs max-w-[85%] shadow">
                  إزاي أحجز نادي رياضي؟
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2 text-xs max-w-[90%] shadow-sm">
                  <p className="text-gray-800 leading-relaxed">يمكنك حجز النادي من صفحة "حجز المرافق". اختر التاريخ والوقت ثم اضغط تأكيد ✨</p>
                  <button className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-violet-50 text-violet-700 border border-violet-200">
                    → افتح الصفحة
                  </button>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 mb-1">شات AI ذكي + Deep Links</h4>
              <p className="text-[11px] text-gray-500">يجاوب فوراً + ينقلك للصفحة المطلوبة بضغطة</p>
            </div>
          </div>

          {/* Demo 2 — AI Insights Mock */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all" data-testid="demo-ai-insights">
            <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-600 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">🧠</div>
                <div>
                  <p className="text-sm font-bold">مستشار AI استباقي</p>
                  <p className="text-[10px] opacity-80">يكتشف المشاكل تلقائياً</p>
                </div>
              </div>
            </div>
            <div className="p-3 space-y-2 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 min-h-[260px]">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-base animate-pulse">💰</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-gray-900">5 فواتير متأخرة</p>
                      <span className="bg-rose-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">عاجل</span>
                    </div>
                    <p className="text-[10px] text-gray-600 leading-snug mt-0.5">سكان لم يدفعوا منذ 30+ يوم</p>
                    <button className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 px-2 py-1 rounded">
                      ⚡ تنفيذ بالـ AI
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-base">🔧</div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-900">3 طلبات صيانة معلقة</p>
                    <p className="text-[10px] text-gray-600 leading-snug mt-0.5">لم يتم البت فيها منذ أسبوع+</p>
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-base">⭐</div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-900">2 تقييم سلبي اليوم</p>
                    <p className="text-[10px] text-gray-600 leading-snug mt-0.5">راجع الملاحظات لتحسين الخدمة</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 mb-1">يكتشف + ينفذ بضغطة</h4>
              <p className="text-[11px] text-gray-500">AI يحلل البيانات يومياً ويقترح إجراءات فورية</p>
            </div>
          </div>

          {/* Demo 3 — Subscription Analytics Mock */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all" data-testid="demo-analytics">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">📊</div>
                <div>
                  <p className="text-sm font-bold">تحليلات الاشتراكات</p>
                  <p className="text-[10px] opacity-80">MRR · ARR · Churn</p>
                </div>
              </div>
            </div>
            <div className="p-3 space-y-2 bg-gradient-to-br from-emerald-50 via-white to-teal-50 min-h-[260px]">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-3 text-white">
                <p className="text-[10px] font-bold opacity-90">إيراد شهري متكرر</p>
                <p className="text-2xl font-black mt-1">31,000 <span className="text-xs opacity-75">ج.م</span></p>
                <p className="text-[10px] opacity-80 mt-0.5">↗ +18% عن الشهر الماضي</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <p className="text-[10px] font-bold text-gray-700 mb-2">MRR حسب الخطة</p>
                <div className="space-y-1">
                  {[
                    { name: 'كبرى', pct: 65, val: '20K' },
                    { name: 'متوسطة', pct: 25, val: '7.5K' },
                    { name: 'ناشئة', pct: 10, val: '3.5K' },
                  ].map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[9px] w-10 text-gray-600">{b.name}</span>
                      <div className="flex-1 bg-gray-100 rounded h-3 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all" style={{width:`${b.pct}%`}} />
                      </div>
                      <span className="text-[9px] font-bold text-gray-700 w-8 text-left">{b.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-xl p-2.5 border border-gray-200 text-center">
                  <p className="text-[9px] font-bold text-gray-500">Churn</p>
                  <p className="text-base font-black text-rose-600">2.3%</p>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-gray-200 text-center">
                  <p className="text-[9px] font-bold text-gray-500">Trial → Paid</p>
                  <p className="text-base font-black text-emerald-600">42%</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 mb-1">صحة الإيراد بنظرة سريعة</h4>
              <p className="text-[11px] text-gray-500">MRR / ARR / Churn / Trial Conversion في dashboard واحد</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          * عرض محاكاة — البيانات الحقيقية تظهر بعد تسجيل الدخول
        </p>
      </div>
    </section>
  );
};

export default LiveDemoSection;
