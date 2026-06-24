import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  ShieldCheckIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import useSEO from '../hooks/useSEO';

// Feature #50 — Dedicated FAQ page (15 Q&As + sections + search + SEO).
const SECTIONS = [
  { key: 'general',  label: 'عام',       Icon: QuestionMarkCircleIcon, color: 'from-indigo-500 to-violet-600' },
  { key: 'pricing',  label: 'الأسعار',   Icon: CurrencyDollarIcon,     color: 'from-emerald-500 to-teal-600'  },
  { key: 'tech',     label: 'تقني',      Icon: WrenchScrewdriverIcon,  color: 'from-amber-500 to-orange-600'  },
  { key: 'security', label: 'الأمان',    Icon: ShieldCheckIcon,        color: 'from-rose-500 to-pink-600'     },
  { key: 'account',  label: 'الحساب',    Icon: CogIcon,                color: 'from-blue-500 to-cyan-600'     },
];

const FAQS = [
  // ── عام (general) ─────────────────────────────────────────────────────
  {
    section: 'general',
    q: 'ما هو HomeMe؟',
    a: 'HomeMe هي منصة عربية لإدارة المجمعات السكنية والكمبوندات بالكامل من مكان واحد. تشمل: إدارة المدفوعات، تتبع الصيانة، الشكاوى، الأمن، الإعلانات، تقارير AI ذكية، وأكثر من 42 نظام متكامل لتشغيل مجمعك بكفاءة.',
  },
  {
    section: 'general',
    q: 'لمن يصلح هذا النظام؟',
    a: 'يصلح لـ: مديري الكمبوندات والمجتمعات السكنية، شركات إدارة العقارات (للإشراف على عدة كمبوندات)، ملاك الوحدات، رؤساء الجمعيات، وفرق الصيانة والأمن.',
  },
  {
    section: 'general',
    q: 'هل أحتاج تثبيت تطبيق؟',
    a: 'لا! HomeMe يعمل بالكامل من المتصفح (Chrome, Safari, Edge, Firefox) ومن خلال PWA (Progressive Web App) تقدر تثبّتها على شاشة الموبايل كأي تطبيق عادي. لا حاجة لتحميل من Play Store أو App Store.',
  },
  // ── الأسعار (pricing) ─────────────────────────────────────────────────
  {
    section: 'pricing',
    q: 'هل يوجد فترة تجريبية مجانية؟',
    a: 'نعم! تجربة مجانية 14 يوم لكل الخطط المدفوعة بدون الحاجة لبطاقة ائتمان. تقدر تختبر كل الميزات بحرية، وتلغي في أي وقت بدون أي رسوم.',
  },
  {
    section: 'pricing',
    q: 'ما الفرق بين الخطط؟',
    a: 'الخطة المجانية: 50 وحدة. الأساسي (299 ج.م/شهر): 200 وحدة. الاحترافي (999 ج.م/شهر): 500 وحدة + AI Assistant + تقارير متقدمة. المتقدم (1999 ج.م/شهر): وحدات غير محدودة + كل الميزات. خطط الشركات تبدأ من 4999 ج.م لإدارة عدة كمبوندات.',
  },
  {
    section: 'pricing',
    q: 'كيف أرقّي خطتي؟',
    a: 'من "إعدادات ← خطتي" اختار الخطة الأعلى. الفرق pro-rata (محسوب نسبياً) للأيام المتبقية في دورتك الحالية. الميزات الجديدة تتفعّل فوراً. الترقية لا تُلغي اشتراكك الحالي.',
  },
  {
    section: 'pricing',
    q: 'ماذا لو ألغيت اشتراكي؟',
    a: 'تستفيد من الخدمة لآخر يوم في الدورة المدفوعة. بعدها الحساب يدخل وضع "محدود" (تشوف بياناتك بدون تعديل). البيانات تُحفظ 90 يوم — تقدر ترجع تشترك وتسترجع كل شيء.',
  },
  // ── تقني (tech) ───────────────────────────────────────────────────────
  {
    section: 'tech',
    q: 'كيف يعمل المساعد الذكي (AI Assistant)؟',
    a: 'هتلاقي زرار عائم بنفسجي ✨ في الزاوية في كل صفحة. اضغطي عليه واسألي أي سؤال بالعربي عن استخدام التطبيق. المساعد يجاوب فوراً + يديك زر "افتح الصفحة" ينقلك للمكان المطلوب. مدعوم بـ Gemini 3 AI.',
  },
  {
    section: 'tech',
    q: 'هل أقدر أستورد بيانات من Excel؟',
    a: 'نعم! ندعم استيراد قوائم السكان، الوحدات، المدفوعات، والمستأجرين من Excel و CSV بـ"نقرة واحدة". الـwizard يساعدك في mapping الأعمدة بشكل ذكي.',
  },
  {
    section: 'tech',
    q: 'ماذا عن النسخ الاحتياطي للبيانات؟',
    a: 'نسخ احتياطي تلقائي يومي لكل بياناتك على خوادم متعددة جغرافياً. تقدر تطلب تصدير بياناتك كاملة (CSV/JSON) في أي وقت من "الإعدادات ← البيانات".',
  },
  // ── الأمان (security) ─────────────────────────────────────────────────
  {
    section: 'security',
    q: 'هل بياناتي آمنة؟',
    a: 'بالتأكيد. نستخدم: تشفير SSL/TLS لكل اتصال، تشفير قواعد البيانات at-rest، Rate-limiting ضد هجمات brute force (5 محاولات/15 دقيقة)، تسجيل كامل لكل محاولات الدخول، Session timeout بعد 24 ساعة، WebAuthn لتسجيل دخول بدون كلمة سر، و2FA اختياري.',
  },
  {
    section: 'security',
    q: 'من يستطيع الوصول لبياناتي؟',
    a: 'بياناتك خاصة بمجمعك فقط — مفصولة بـ multi-tenant architecture. حتى داخل HomeMe لا يصل أحد لبياناتك بدون موافقتك الصريحة. الأدوار والصلاحيات granular (مفصّلة) لكل موظف.',
  },
  {
    section: 'security',
    q: 'هل تمتثلون لمعايير حماية البيانات؟',
    a: 'نعم. نلتزم بمبادئ GDPR و قانون حماية البيانات المصري رقم 151 لسنة 2020. تقدر تطلب تصدير بياناتك أو حذفها نهائياً في أي وقت.',
  },
  // ── الحساب (account) ──────────────────────────────────────────────────
  {
    section: 'account',
    q: 'كيف أنشئ حساب جديد لكمبوندي؟',
    a: 'من زر "ابدأ الآن" في الصفحة الرئيسية. الـwizard ياخدك خطوة بخطوة: 1) بيانات الكمبوند، 2) بيانات المسؤول، 3) اختيار الخطة + الدفع. مدة كاملة: 3 دقائق.',
  },
  {
    section: 'account',
    q: 'هل أقدر أدير عدة كمبوندات بحساب واحد؟',
    a: 'نعم — مع خطط الشركات (Company plans). شركات إدارة العقارات تقدر تشرف على ما يصل لـ 50+ كمبوند من dashboard واحد، مع تقارير مقارنة بين الكمبوندات، تتبع KPIs، ومعدلات الإيرادات.',
  },
];

const FAQPage = () => {
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState('all');
  const [openItem, setOpenItem] = useState(null);

  useSEO({
    title: 'الأسئلة الشائعة — HomeMe',
    description:
      'إجابات مفصّلة على 15 سؤال شائع عن HomeMe — منصة إدارة المجمعات السكنية: الأسعار، الأمان، الميزات، AI Assistant، وأكثر.',
    keywords: 'الأسئلة الشائعة, FAQ, HomeMe, إدارة كمباوند, أسعار, أمان, مساعد ذكي',
    canonicalPath: '/faq',
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.filter((f) => {
      const matchesSection = activeSection === 'all' || f.section === activeSection;
      const matchesQuery = !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
      return matchesSection && matchesQuery;
    });
  }, [query, activeSection]);

  // JSON-LD structured data for SEO (FAQPage schema)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-violet-50" data-testid="faq-page" dir="rtl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 text-white pt-20 pb-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 px-4 py-1.5 rounded-full text-xs font-bold mb-4">
            <QuestionMarkCircleIcon className="h-4 w-4" />
            مركز المعرفة
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4">الأسئلة الشائعة</h1>
          <p className="text-violet-100 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-8">
            كل ما تحتاج معرفته عن HomeMe في مكان واحد — مقسّمة لتسهيل البحث.
          </p>

          {/* Search */}
          <div className="relative max-w-2xl mx-auto" data-testid="faq-search-wrapper">
            <MagnifyingGlassIcon className="absolute top-1/2 -translate-y-1/2 right-4 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في الأسئلة..."
              className="w-full bg-white/95 text-gray-900 placeholder-gray-400 border-0 rounded-2xl py-3.5 pr-12 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-300 shadow-xl"
              data-testid="faq-search-input"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-400 hover:text-gray-600 text-lg"
                data-testid="faq-search-clear"
                aria-label="مسح البحث"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="max-w-5xl mx-auto px-4 -mt-6">
        <div className="flex flex-wrap gap-2 justify-center mb-8" data-testid="faq-sections">
          <button
            onClick={() => setActiveSection('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold border transition ${
              activeSection === 'all'
                ? 'bg-violet-700 border-violet-700 text-white shadow-lg'
                : 'bg-white/90 border-gray-200 text-gray-700 hover:border-violet-400 hover:text-violet-700'
            }`}
            data-testid="faq-section-all"
          >
            الكل ({FAQS.length})
          </button>
          {SECTIONS.map((s) => {
            const count = FAQS.filter((f) => f.section === s.key).length;
            const active = activeSection === s.key;
            const Icon = s.Icon;
            return (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition flex items-center gap-1.5 ${
                  active
                    ? 'bg-violet-700 border-violet-700 text-white shadow-lg'
                    : 'bg-white/90 border-gray-200 text-gray-700 hover:border-violet-400 hover:text-violet-700'
                }`}
                data-testid={`faq-section-${s.key}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Results list */}
        <div className="max-w-3xl mx-auto pb-20" data-testid="faq-list">
          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm" data-testid="faq-no-results">
              <QuestionMarkCircleIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">
                لم نعثر على نتائج لـ <strong className="text-gray-800">"{query}"</strong>
              </p>
              <p className="text-gray-400 text-xs mt-2">
                جرّب كلمات مختلفة، أو{' '}
                <Link to="/contact" className="text-violet-600 font-bold hover:underline">
                  تواصل معنا
                </Link>
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((f, i) => {
                const open = openItem === i;
                const sectionMeta = SECTIONS.find((s) => s.key === f.section) || SECTIONS[0];
                const Icon = sectionMeta.Icon;
                return (
                  <li
                    key={i}
                    className={`rounded-2xl border bg-white shadow-sm transition-all ${
                      open
                        ? 'border-violet-400 shadow-lg'
                        : 'border-gray-200 hover:border-violet-200'
                    }`}
                    data-testid={`faq-item-${i}`}
                  >
                    <button
                      onClick={() => setOpenItem(open ? null : i)}
                      className="w-full p-5 flex items-center justify-between gap-3 text-right"
                      aria-expanded={open}
                      data-testid={`faq-toggle-${i}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${sectionMeta.color} text-white shrink-0`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-bold text-gray-900 leading-relaxed">
                          {f.q}
                        </span>
                      </div>
                      <ChevronDownIcon
                        className={`h-5 w-5 text-gray-400 transition-transform shrink-0 ${
                          open ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {open && (
                      <div
                        className="px-5 pb-5 text-sm text-gray-600 leading-loose border-t border-gray-100 pt-4"
                        data-testid={`faq-answer-${i}`}
                      >
                        {f.a}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* CTA */}
          <div className="mt-10 text-center bg-gradient-to-r from-indigo-600 to-violet-700 text-white rounded-2xl p-8 shadow-xl">
            <h3 className="text-xl font-black mb-2">لم تجد إجابتك؟</h3>
            <p className="text-violet-100 text-sm mb-5">
              فريقنا متاح للرد على أي استفسار خلال 24 ساعة.
            </p>
            <Link
              to="/contact"
              className="inline-block bg-white text-violet-700 font-bold px-6 py-3 rounded-xl hover:scale-[1.03] transition-transform"
              data-testid="faq-contact-cta"
            >
              تواصل معنا
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQPage;
