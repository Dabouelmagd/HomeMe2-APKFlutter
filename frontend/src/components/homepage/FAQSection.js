import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const FAQS = [
  {
    q: 'هل يوجد فترة تجريبية مجانية؟',
    a: 'نعم! تجربة مجانية 14 يوم لكل الخطط بدون الحاجة لبطاقة ائتمان. تقدر تختبر كل الميزات بحرية، وتلغي في أي وقت بدون أي رسوم.',
  },
  {
    q: 'كيف يعمل التجديد التلقائي عبر Stripe؟',
    a: 'بعد ما تشترك، Stripe يحفظ بيانات كارتك بأمان (مش بنحفظها عندنا). كل دورة جديدة (شهر/سنة)، Stripe يخصم تلقائياً ويرسل لك إيصال. تقدر تلغي التجديد التلقائي في أي وقت من إعدادات الحساب — والخدمة تستمر حتى نهاية الفترة المدفوعة.',
  },
  {
    q: 'ماذا لو ألغيت اشتراكي؟',
    a: 'بتفضل تستفيد من الخدمة لآخر يوم في الدورة المدفوعة، وبعدها الحساب يدخل وضع "محدود" (تقدر تشوف بياناتك بس مش تعدّل). البيانات بتفضل محفوظة 90 يوم، تقدر ترجع تشترك تاني وتسترجع كل شيء.',
  },
  {
    q: 'هل تدعمون WhatsApp والـ SMS؟',
    a: 'نعم! إشعارات WhatsApp و SMS متاحة لكل الخطط المدفوعة. الخطة الـ Enterprise تشمل WhatsApp Business API كامل + قوالب رسائل مخصصة + معدلات إرسال أعلى.',
  },
  {
    q: 'كيف أرقّي خطتي؟',
    a: 'تروح لـ "إعدادات → خطتي" واختار الخطة الأعلى. الفرق بين الخطتين بيتحسب pro-rata (نسبي) للأيام المتبقية في دورتك الحالية. الميزات الجديدة تتفعّل فوراً.',
  },
  {
    q: 'كيف يعمل المساعد الذكي (AI Assistant)؟',
    a: 'هتلاقي زرار عائم بنفسجي ✨ في الزاوية في كل صفحة. اضغطي عليه واسألي أي سؤال بالعربي عن استخدام التطبيق (إزاي أرفع إيصال؟ إزاي أحجز نادي؟). المساعد يجاوب فوراً + يديك زر "افتح الصفحة" ينقلك للمكان المطلوب. مدعوم بـ Claude AI.',
  },
  {
    q: 'ما هو AI Auto-Pilot وكيف يفيدني؟',
    a: 'نظام جدولة ذكي يعمل نيابة عنك: مثلاً كل أحد 9 الصبح، يبعت تذكير دفع تلقائي للسكان المتأخرين 30+ يوم. تختاري الإجراء + اليوم + الساعة، والباقي على AI. توفر ساعات أسبوعياً + ملخص أسبوعي بالبريد بكل الإجراءات اللي تمت.',
  },
  {
    q: 'هل بياناتي آمنة؟',
    a: 'بياناتك مشفرة TLS 1.3 أثناء النقل + bcrypt للباسوردات. نسخ احتياطي يومي مستقل. لا نبيع بياناتك أبداً ولا نشاركها مع طرف ثالث (إلا Stripe لمعالجة الدفع وGemini للذكاء الاصطناعي تحت اتفاقيات سرية صارمة). راجعي "سياسة الخصوصية" للتفاصيل.',
  },
  {
    q: 'كم عدد المستخدمين والمجمعات في كل خطة؟',
    a: 'الخطة المجانية: حتى 30 ساكن. الأساسي: حتى 100. الاحترافي والمتقدم: غير محدود. للشركات: ناشئة (3 مجمعات)، متوسطة (8 مجمعات)، كبرى (غير محدود). كل ذلك بدون قيود على عدد الأدمن.',
  },
  {
    q: 'هل المنصة تدعم اللغة الإنجليزية والفرنسية؟',
    a: 'نعم! المنصة بالكامل تدعم 3 لغات (عربي/إنجليزي/فرنسي) مع RTL/LTR تلقائي. كل مستخدم يختار لغته من الإعدادات. الصفحات القانونية كذلك مترجمة بالـ AI.',
  },
  {
    q: 'كيف أبدأ بسرعة؟',
    a: 'اشترك مجاناً في 60 ثانية: 1) اختاري الخطة المناسبة 2) املئي بيانات المجمع 3) ابدئي بإضافة السكان (يدوياً أو Bulk Import من Excel). كل ساكن جديد يحصل على بريد ترحيب تلقائياً ببيانات الدخول.',
  },
  {
    q: 'هل في تكلفة إضافية لاستخدام AI؟',
    a: 'لأ! ميزات AI (المساعد، المستشار، Auto-Pilot، الترجمة) كلها مشمولة في خطتك بدون أي تكلفة إضافية، مع حدود استخدام يومية حسب الخطة (Pro: 20/يوم، Premium: 50/يوم، Enterprise: غير محدود).',
  },
];

export const FAQSection = () => {
  const { t } = useTranslation();

  return (
    <section className="py-16 bg-white" id="faq" data-testid="faq-section">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-bold mb-3">
            ❓ {t('hp_faq_badge', 'الأسئلة الشائعة')}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>
            {t('hp_faq_title', 'إجابات سريعة لأكثر الأسئلة شيوعاً')}
          </h2>
          <p className="text-gray-500">{t('hp_faq_desc', 'لو سؤالك مش هنا، تقدر تتواصل معانا في "اتصل بنا"')}</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <details
              key={i}
              className="group bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 hover:border-violet-300 transition-colors"
              data-testid={`faq-item-${i}`}
            >
              <summary className="cursor-pointer p-4 list-none flex items-start justify-between gap-3">
                <span className="text-sm font-bold text-gray-900 leading-relaxed">{faq.q}</span>
                <ChevronDownIcon className="w-5 h-5 text-violet-600 flex-shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-4 text-sm text-gray-700 leading-loose border-t border-gray-200 pt-3">
                {faq.a}
              </div>
            </details>
          ))}
        </div>

        {/* Help CTA */}
        <div className="mt-8 bg-gradient-to-r from-violet-50 to-fuchsia-50 border border-violet-200 rounded-xl p-5 text-center">
          <p className="text-sm font-bold text-gray-900 mb-1">{t('hp_faq_more', 'سؤالك مش هنا؟')}</p>
          <p className="text-xs text-gray-600 mb-3">{t('hp_faq_more_desc', 'فريق الدعم متاح 24/7 للإجابة على أسئلتك')}</p>
          <Link to="/legal/contact" className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-lg transition-colors">
            📞 اتصل بنا
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
