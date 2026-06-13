import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useSEO from '../hooks/useSEO';
import {
  SparklesIcon,
  HeartIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  UsersIcon,
  GlobeAltIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';

/**
 * Public "About Us" landing — separate from /legal/about (which is the
 * raw legal/policy text). This page is marketing-oriented: mission, values,
 * team. Multilingual via i18n with Arabic defaults; the page itself is laid
 * out the same for AR/EN/FR — only copy is translated.
 */
const AboutUs = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  useSEO({
    title: t('about_seo_title', 'من نحن — HomeMe | قصة المنصة'),
    description: t(
      'about_seo_desc',
      'تعرّفي على HomeMe — منصة عربية متكاملة لإدارة المجمعات السكنية. رسالتنا، قيمنا، والفريق الذي يبنيها.'
    ),
    canonical: 'https://homemeapp.net/about',
    keywords: 'عن HomeMe, من نحن HomeMe, قصة HomeMe, فريق HomeMe, about HomeMe',
    og: {
      title: t('about_seo_title', 'من نحن — HomeMe'),
      description: t('about_seo_desc'),
      type: 'website',
      url: 'https://homemeapp.net/about',
      locale: isRTL ? 'ar_EG' : (i18n.language === 'fr' ? 'fr_FR' : 'en_US'),
    },
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'HomeMe',
      url: 'https://homemeapp.net/about',
      mainEntity: {
        '@type': 'Organization',
        name: 'HomeMe',
        url: 'https://homemeapp.net',
        foundingDate: '2024',
        description: t('about_seo_desc'),
      },
    },
    jsonLdId: 'about-page',
  });

  const values = [
    {
      icon: HeartIcon,
      title: t('value_users_first_t', 'الساكن أولاً'),
      body: t('value_users_first_b', 'كل قرار تصميم نختبره من زاوية الساكن: أبسط مسار، أقل ضغطات، وأوضح رسالة بالعربية.'),
      color: 'from-rose-500 to-pink-600',
    },
    {
      icon: ShieldCheckIcon,
      title: t('value_privacy_t', 'الخصوصية بالتصميم'),
      body: t('value_privacy_b', 'بياناتك ملكك. تشفير في الراحة وفي الانتقال، نسخ احتياطية يومية، ومنطقة عربية للسيرفرات.'),
      color: 'from-emerald-500 to-teal-600',
    },
    {
      icon: SparklesIcon,
      title: t('value_ai_t', 'ذكاء اصطناعي مفيد، لا مزعج'),
      body: t('value_ai_b', 'الـ AI يساعدك يوصل لمكان معين أسرع — لا يحاول يستبدلك. كل اقتراح قابل للمراجعة قبل التنفيذ.'),
      color: 'from-violet-500 to-fuchsia-600',
    },
    {
      icon: GlobeAltIcon,
      title: t('value_arabic_t', 'عربي بالأصل'),
      body: t('value_arabic_b', 'بُنيت كل صفحة من اليمين لليسار قبل أي ترجمة. الإنجليزية والفرنسية إضافة — لا قاعدة.'),
      color: 'from-blue-500 to-indigo-600',
    },
  ];

  const team = [
    {
      name: t('team_dalia_n', 'داليا أبو المجد'),
      role: t('team_dalia_r', 'المؤسِّسة والمالكة'),
      bio: t('team_dalia_b', 'مهندسة معمارية تحوّلت لرائدة أعمال تكنولوجية. شغوفة بتبسيط حياة سكان المجمعات.'),
      initials: 'د.م',
      color: 'from-rose-500 to-pink-600',
    },
    {
      name: t('team_eng_n', 'فريق الهندسة'),
      role: t('team_eng_r', 'تطوير المنصة'),
      bio: t('team_eng_b', 'مهندسو React / FastAPI / MongoDB من شمال أفريقيا والشرق الأوسط — يبنون HomeMe يومياً.'),
      initials: '⚙️',
      color: 'from-violet-500 to-purple-600',
    },
    {
      name: t('team_support_n', 'فريق نجاح العملاء'),
      role: t('team_support_r', 'الدعم والتدريب'),
      bio: t('team_support_b', 'يساعدون كل كمبوند جديد على الانطلاق خلال أسبوع — تدريب مباشر، شات، وقاعدة معرفة عربية.'),
      initials: '💬',
      color: 'from-emerald-500 to-teal-600',
    },
  ];

  const stats = [
    { n: '15+', l: t('stat_compounds', 'مجمع سكني نشط') },
    { n: '8K+',  l: t('stat_residents', 'ساكن مسجَّل')   },
    { n: '99.9%',l: t('stat_uptime', 'وقت تشغيل المنصة') },
    { n: '24/7', l: t('stat_support', 'دعم فني')         },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" data-testid="about-page">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-white py-20 px-4">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 70% 80%, white 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }} />
        <div className="relative max-w-4xl mx-auto text-center">
          <Link to="/" className="inline-block mb-6 text-white/80 hover:text-white text-sm">
            ← {t('back_to_home', 'العودة للصفحة الرئيسية')}
          </Link>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6" style={{ fontFamily: "'Cairo', sans-serif" }}>
            {t('about_h1', 'نُبسّط إدارة المجمعات السكنية — بالعربية')}
          </h1>
          <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
            {t('about_subtitle', 'HomeMe منصة عربية كاملة لإدارة المجمعات السكنية — صُمّمت من الصفر للسوق العربي، مع ذكاء اصطناعي يفهم لهجاتنا، وخدمة عملاء تتكلم لغتك.')}
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold mb-4">
              <RocketLaunchIcon className="h-4 w-4" />
              {t('mission_badge', 'رسالتنا')}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Cairo', sans-serif" }}>
              {t('mission_title', 'كل مجمع عربي يستحق منصة بمستوى عالمي')}
            </h2>
            <p className="text-gray-600 leading-relaxed mb-3">
              {t('mission_p1', 'بدأت HomeMe من ملاحظة بسيطة: أن أغلب أنظمة إدارة المجمعات إما مكلفة جداً، أو إنجليزية بحتة، أو غير مهتمة بتفاصيل السوق العربي.')}
            </p>
            <p className="text-gray-600 leading-relaxed">
              {t('mission_p2', 'نحن نبني منصة واحدة شاملة — تجمع المالية، الصيانة، الشكاوى، الزوار، والتواصل — بسعر يبدأ من 0 ج.م، ومدعومة بـ AI يحلل بياناتك بالعربية ويقترح حلولاً.')}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border-2 border-violet-100 p-5 text-center shadow-sm">
                <div className="text-3xl font-black text-violet-700">{s.n}</div>
                <div className="text-xs text-gray-500 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-4 bg-gradient-to-br from-violet-50/40 to-fuchsia-50/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold mb-3">
              <LightBulbIcon className="h-4 w-4" />
              {t('values_badge', 'القيم')}
            </div>
            <h2 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "'Cairo', sans-serif" }}>
              {t('values_title', 'ما الذي يوجّه كل قرار نتخذه؟')}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5" data-testid="about-values-grid">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${v.color} text-white mb-4`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{v.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{v.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold mb-3">
            <UsersIcon className="h-4 w-4" />
            {t('team_badge', 'الفريق')}
          </div>
          <h2 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "'Cairo', sans-serif" }}>
            {t('team_title', 'الأشخاص الذين يبنون HomeMe كل يوم')}
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5" data-testid="about-team-grid">
          {team.map((m, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center hover:shadow-lg transition">
              <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${m.color} flex items-center justify-center text-white text-xl font-black mb-4 shadow`}>
                {m.initials}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{m.name}</h3>
              <div className="text-xs text-violet-600 font-bold mt-1">{m.role}</div>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">{m.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto rounded-3xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-10 text-center text-white shadow-2xl">
          <h2 className="text-2xl sm:text-3xl font-black mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>
            {t('about_cta_title', 'جاهز تنضم لنا؟')}
          </h2>
          <p className="text-white/90 mb-6 max-w-xl mx-auto">
            {t('about_cta_desc', 'ابدئي تجربة مجانية لمدة 14 يوم — بدون بطاقة ائتمان، بدون التزام، إلغاء فوري.')}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/auth/register"
              className="px-6 py-3 rounded-xl bg-white text-violet-700 font-black hover:scale-105 transition-transform shadow-lg"
              data-testid="about-cta-trial"
            >
              {t('about_cta_btn', 'ابدئي مجاناً ←')}
            </Link>
            <Link
              to="/legal/contact"
              className="px-6 py-3 rounded-xl border-2 border-white/40 text-white font-bold hover:bg-white/10 transition"
              data-testid="about-cta-contact"
            >
              {t('about_cta_contact', 'تكلّمي معنا')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
