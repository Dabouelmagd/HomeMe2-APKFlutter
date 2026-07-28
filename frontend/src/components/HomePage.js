import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { useNavigate, Link } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../App';
import {
  BuildingOfficeIcon, BuildingOffice2Icon, UserIcon, ShieldCheckIcon,
  WrenchScrewdriverIcon, CurrencyDollarIcon, ChartBarIcon, BellIcon,
  StarIcon, DocumentTextIcon, UserGroupIcon, CalendarDaysIcon,
  ExclamationTriangleIcon, ChatBubbleLeftEllipsisIcon, ArrowDownTrayIcon,
  ClipboardDocumentCheckIcon, KeyIcon, BookOpenIcon, CheckCircleIcon,
  ArrowRightIcon, SparklesIcon, LockClosedIcon, CreditCardIcon,
  PhoneIcon, GlobeAltIcon, DevicePhoneMobileIcon, ChevronDownIcon,
  ChevronUpIcon, CommandLineIcon, Cog6ToothIcon, FolderIcon,
  NewspaperIcon, LightBulbIcon, HomeModernIcon, FingerPrintIcon,
  QrCodeIcon, ClockIcon, PresentationChartBarIcon,
  BoltIcon, EnvelopeIcon, ArrowPathIcon,
  ArrowRightOnRectangleIcon, Squares2X2Icon, XMarkIcon,
  MapIcon, ArrowUpTrayIcon, AdjustmentsHorizontalIcon,
  GiftIcon, MoonIcon, NoSymbolIcon, ChatBubbleBottomCenterTextIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline';

import InternalAdBanner from './InternalAdBanner';
import CustomerTestimonialsCarousel from './CustomerTestimonialsCarousel';
import { FAQSection } from './homepage/FAQSection';
import { LiveDemoSection } from './homepage/LiveDemoSection';
import { RolesSection } from './homepage/RolesSection';
import { PricingSection } from './homepage/PricingSection';
import useSEO from '../hooks/useSEO';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const HomePage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const isRTL = i18n.language === 'ar';
  const [openGuide, setOpenGuide] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [currency, setCurrency] = useState(() => {
    // 💰 EGP is the primary currency for HomeMe. Users can opt into USD via the
    // toggle and we persist their preference in localStorage.
    try {
      const saved = localStorage.getItem('preferred_currency');
      if (saved === 'egp' || saved === 'usd') return saved;
    } catch { /* localStorage may be unavailable */ }
    return 'egp';
  });
  const [subCode, setSubCode] = useState('');
  const [codeStatus, setCodeStatus] = useState(null); // {type:'success'|'error', msg:'...'}
  const [codeLoading, setCodeLoading] = useState(false);

  // 🔍 Filter for the 30 Systems grid
  const [systemFilter, setSystemFilter] = useState('all');

  // 🔍 SEO — fully managed via useSEO hook (Arabic-first, OG + Twitter + JSON-LD)
  useSEO({
    title: t(
      'hp_seo_title',
      'HomeMe — نظام إدارة الكمبوندات السكنية بالذكاء الاصطناعي'
    ),
    description: t(
      'hp_seo_desc',
      'منصة سحابية متكاملة لإدارة المجمعات السكنية: محاسبة، صيانة، شكاوى، حجوزات، إدارة زوار QR، تقارير PDF، ومساعد ذكاء اصطناعي. تجربة مجانية 14 يوماً.'
    ),
    canonical: 'https://homemeapp.net/',
    keywords:
      'كمبوند, إدارة كمبوند, إدارة مجمع سكني, نظام كمبوندات, compound management, residential compound software, إدارة الصيانة, شكاوى السكان, خدمات سكنية, AI compound assistant, HomeMe',
    og: {
      title: 'HomeMe — نظام إدارة الكمبوندات السكنية بالذكاء الاصطناعي',
      description:
        'منصة عربية متكاملة لإدارة المجمعات السكنية مع 30+ نظام: محاسبة، صيانة، شكاوى، حجوزات، تقارير PDF، ومساعد AI. تجربة مجانية 14 يوماً.',
      type: 'website',
      url: 'https://homemeapp.net/',
      image: 'https://homemeapp.net/og-cover.png',
      site_name: 'HomeMe',
      locale: 'ar_EG',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'HomeMe — إدارة كمبوندات السكنية',
      description:
        'منصة عربية لإدارة المجمعات السكنية مدعومة بالذكاء الاصطناعي. تجربة مجانية 14 يوماً.',
      image: 'https://homemeapp.net/og-cover.png',
    },
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'HomeMe',
      operatingSystem: 'Web, iOS, Android',
      applicationCategory: 'BusinessApplication',
      url: 'https://homemeapp.net/',
      inLanguage: ['ar', 'en', 'fr'],
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'EGP',
        lowPrice: '0',
        highPrice: '35000',
        offerCount: '7',
      },
      featureList: [
        'إدارة المقيمين',
        'النظام المالي والمحاسبي',
        'الصيانة والخدمات',
        'الشكاوى والمقترحات',
        'حجز المرافق',
        'إدارة الزوار QR',
        'مساعد AI ذكي',
        'تقارير PDF',
      ],
    },
    jsonLdId: 'homepage-app',
  });

  // 🎯 Scroll Spy — track active section based on scroll position
  const [activeSection, setActiveSection] = useState('top');

  useEffect(() => {
    const NAV_SECTIONS = ['systems', 'ai-features', 'live-demo', 'guide', 'testimonials', 'faq', 'pricing'];
    const HEADER_OFFSET = 200; // px allowance for sticky header

    const handleScroll = () => {
      const scrollY = window.scrollY;
      // If at the very top, activate "home"
      if (scrollY < 300) {
        setActiveSection('top');
        return;
      }
      // Find the section whose top is closest above the threshold
      let current = 'top';
      for (const id of NAV_SECTIONS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top - HEADER_OFFSET <= 0) {
          current = id;
        } else {
          break;
        }
      }
      setActiveSection(current);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Persist user's currency choice across visits
  useEffect(() => {
    try { localStorage.setItem('preferred_currency', currency); } catch (e) { /* ignore */ }
  }, [currency]);

  // Guide Modal — close on ESC + lock body scroll while open
  useEffect(() => {
    if (!openGuide) return;
    const handleKey = (e) => { if (e.key === 'Escape') setOpenGuide(null); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [openGuide]);

  // 🌐 Schema.org structured data — boosts Google rich-snippets (stars + ratings).
  useEffect(() => {
    let cancelled = false;
    const SCRIPT_ID = 'homeme-jsonld-schema';
    axios.get(`${API}/testimonials/published?limit=12`).then((res) => {
      if (cancelled) return;
      const reviews = res.data?.testimonials || [];
      const reviewCount = reviews.length;
      const avg = reviewCount
        ? reviews.reduce((s, r) => s + (Number(r.stars) || 5), 0) / reviewCount
        : 0;
      const ratingValue = avg ? Math.round(avg * 10) / 10 : null;

      const ld = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'HomeMe',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, iOS, Android (PWA)',
        description: 'منصة إدارة المجتمعات السكنية المتكاملة مع AI Assistant و Stripe Auto-Renewal و+25 نظام',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://homemeapp.net',
        inLanguage: ['ar', 'en', 'fr'],
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'EGP',
          lowPrice: 0,
          highPrice: 35000,
        },
        ...(ratingValue
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: ratingValue,
                bestRating: 5,
                worstRating: 1,
                ratingCount: reviewCount,
                reviewCount: reviewCount,
              },
              review: reviews.slice(0, 5).map((r) => ({
                '@type': 'Review',
                reviewRating: {
                  '@type': 'Rating',
                  ratingValue: r.stars || 5,
                  bestRating: 5,
                  worstRating: 1,
                },
                author: { '@type': 'Person', name: r.name || 'عميل' },
                reviewBody: r.comment || '',
                ...(r.published_at ? { datePublished: r.published_at } : {}),
              })),
            }
          : {}),
      };

      let el = document.getElementById(SCRIPT_ID);
      if (!el) {
        el = document.createElement('script');
        el.id = SCRIPT_ID;
        el.type = 'application/ld+json';
        document.head.appendChild(el);
      }
      el.textContent = JSON.stringify(ld);
    }).catch(() => { /* silent — don't break page */ });

    return () => {
      cancelled = true;
      const el = document.getElementById(SCRIPT_ID);
      if (el) el.remove();
    };
  }, []);

  useEffect(() => {
    // ملاحظة: سابقاً كان هذا يعيد التوجيه التلقائي إلى /app/dashboard للمستخدمين المسجلين دخول.
    // تمت إزالته بناءً على طلب المستخدم — الموقع الآن يفتح دائماً الصفحة الرئيسية.
    // المستخدمون المسجلون يمكنهم الضغط على زر "لوحة التحكم" في الـ Navbar.
  }, [user, loading, navigate]);

  // Initialize Google AdSense ads
  useEffect(() => {
    try {
      if (window.adsbygoogle) {
        window.adsbygoogle.push({});
        window.adsbygoogle.push({});
        window.adsbygoogle.push({});
      }
    } catch (e) { /* AdSense not loaded yet */ }
  }, []);

  const handleCodeActivate = async () => {
    if (!subCode.trim()) return;
    const token = localStorage.getItem('token');
    if (!token) {
      setCodeStatus({ type: 'error', msg: t('hp_login_first', 'يجب تسجيل الدخول أولاً لتفعيل الكود') });
      return;
    }
    setCodeLoading(true);
    setCodeStatus(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/subscription-codes/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: subCode.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setCodeStatus({ type: 'success', msg: data.message || t('hp_code_activated', 'تم تفعيل الاشتراك بنجاح!') });
        setSubCode('');
      } else {
        setCodeStatus({ type: 'error', msg: data.detail || t('hp_invalid_code', 'كود غير صالح') });
      }
    } catch {
      setCodeStatus({ type: 'error', msg: t('hp_error_retry', 'حدث خطأ، حاول مرة أخرى') });
    }
    setCodeLoading(false);
  };

  const handleSubscribe = async (plan) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/register');
      return;
    }
    if (plan === 'starter') {
      navigate('/register');
      return;
    }
    try {
      const duration = isYearly ? '1_year' : '1_month';
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/payments/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ plan, duration, currency })
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        alert(data.detail || t('hp_error', 'حدث خطأ'));
      }
    } catch {
      navigate('/register');
    }
  };

  const systems = [
    { icon: UserGroupIcon, category: 'admin', title: t('sys_residents', 'إدارة المقيمين'), desc: t('sys_residents_d', 'ملف شامل لكل مقيم مع العائلة والوحدة وتصدير PDF'), color: 'from-blue-500 to-blue-600' },
    { icon: CurrencyDollarIcon, category: 'finance', title: t('sys_finance', 'النظام المالي'), desc: t('sys_finance_d', 'ميزانية عمومية، 4 طرق توزيع مصروفات، رسوم بيانية، تصدير Excel'), color: 'from-emerald-500 to-green-600' },
    { icon: WrenchScrewdriverIcon, category: 'maintenance', title: t('sys_maintenance', 'الصيانة والخدمات'), desc: t('sys_maintenance_d', 'طلبات صيانة، حجز خدمات، تقييم بعد الإنجاز'), color: 'from-amber-500 to-orange-600' },
    { icon: DocumentTextIcon, category: 'maintenance', title: t('sys_contracts', 'إدارة العقود'), desc: t('sys_contracts_d', 'عقود المزودين مع تنبيهات تلقائية قبل الانتهاء'), color: 'from-indigo-500 to-purple-600' },
    { icon: StarIcon, category: 'comms', title: t('sys_ratings', 'تقييمات الرضا'), desc: t('sys_ratings_d', 'تقييم 5 نجوم مع تنبيه ذكي عند انخفاض الرضا'), color: 'from-yellow-500 to-amber-600' },
    { icon: ExclamationTriangleIcon, category: 'comms', title: t('sys_complaints', 'الشكاوى والاقتراحات'), desc: t('sys_complaints_d', 'تقديم شكاوى واقتراحات مع متابعة حالتها ورد الإدارة'), color: 'from-red-500 to-rose-600' },
    { icon: CalendarDaysIcon, category: 'maintenance', title: t('sys_facilities', 'حجز المرافق'), desc: t('sys_facilities_d', 'حجز صالات، ملاعب، مسبح، قاعات اجتماعات بتقويم ذكي'), color: 'from-cyan-500 to-teal-600' },
    { icon: BellIcon, category: 'comms', title: t('sys_notifications', 'إشعارات ذكية'), desc: t('sys_notifications_d', 'تنبيهات فورية للمدراء عند كل حدث مهم في المجتمع'), color: 'from-pink-500 to-rose-600' },
    { icon: ChartBarIcon, category: 'finance', title: t('sys_analytics', 'تحليلات وتقارير'), desc: t('sys_analytics_d', 'لوحة تحكم حية، مقارنة شهرية، تقرير يومي تلقائي بالبريد'), color: 'from-violet-500 to-purple-600' },
    { icon: ShieldCheckIcon, category: 'security', title: t('sys_roles', 'أدوار وصلاحيات'), desc: t('sys_roles_d', '6 أدوار: مالك، شركة، مدير، إداري، أمن، مقيم'), color: 'from-gray-600 to-gray-800' },
    { icon: ChatBubbleLeftEllipsisIcon, category: 'comms', title: t('sys_comms', 'مركز التواصل'), desc: t('sys_comms_d', 'رسائل، إعلانات، أحداث، إشعارات للمجتمع'), color: 'from-sky-500 to-blue-600' },
    { icon: ArrowDownTrayIcon, category: 'finance', title: t('sys_export', 'تصدير وطباعة'), desc: t('sys_export_d', 'PDF عربي احترافي، Excel بـ 5 أوراق، طباعة مباشرة'), color: 'from-teal-500 to-emerald-600' },
    { icon: QrCodeIcon, category: 'security', title: t('sys_visitors', 'إدارة الزوار + QR'), desc: t('sys_visitors_d', 'دعوات الزوار، QR Code، مسح الأمن، سجل دخول/خروج كامل'), color: 'from-fuchsia-500 to-pink-600' },
    { icon: ClipboardDocumentCheckIcon, category: 'comms', title: t('sys_polls', 'الاستطلاعات والتصويت'), desc: t('sys_polls_d', 'تصويت ديمقراطي على القرارات، استطلاعات رأي، نتائج فورية'), color: 'from-lime-500 to-green-600' },
    { icon: PresentationChartBarIcon, category: 'finance', title: t('sys_pdf_reports', 'تقارير PDF متقدمة'), desc: t('sys_pdf_reports_d', 'Portfolio Report للشركات، تقارير شهرية تلقائية، تخصيص قالب'), color: 'from-rose-500 to-red-600' },

    // ✨ NEW AI Systems
    { icon: SparklesIcon, category: 'ai', title: '✨ ' + t('sys_ai_chat', 'مساعد HomeMe الذكي'), desc: t('sys_ai_chat_d', 'شات AI عائم بـ Gemini يجاوب فوراً ويوجّه المستخدمين لصفحات التطبيق'), color: 'from-violet-500 to-purple-600', isAI: true },
    { icon: LightBulbIcon, category: 'ai', title: '🧠 ' + t('sys_ai_advisor', 'مستشار AI استباقي'), desc: t('sys_ai_advisor_d', 'يحلل البيانات يومياً ويكتشف 6 مشاكل + يقترح إجراءات تنفيذية'), color: 'from-purple-500 to-fuchsia-600', isAI: true },
    { icon: ClockIcon, category: 'ai', title: '🤖 ' + t('sys_autopilot', 'AI Auto-Pilot'), desc: t('sys_autopilot_d', 'جدولة تنفيذ الإجراءات تلقائياً (يومي/أسبوعي) + ملخص أسبوعي بالبريد'), color: 'from-fuchsia-500 to-pink-600', isAI: true },
    { icon: EnvelopeIcon, category: 'comms', title: '📨 ' + t('sys_auto_credentials', 'إرسال بيانات الدخول تلقائياً'), desc: t('sys_auto_credentials_d', 'كل ساكن جديد (فردي أو bulk) يحصل على بريد ترحيب RTL تلقائياً'), color: 'from-indigo-500 to-violet-600', isAI: true },
    { icon: ArrowPathIcon, category: 'finance', title: '🔁 ' + t('sys_stripe_recurring', 'Stripe Auto-Renewal'), desc: t('sys_stripe_recurring_d', 'اشتراك يجدد نفسه تلقائياً + خصم 17% للسنوي + Customer Portal'), color: 'from-emerald-500 to-teal-600', isAI: true },
    { icon: PresentationChartBarIcon, category: 'finance', title: '📊 ' + t('sys_sub_analytics', 'تحليلات الاشتراكات'), desc: t('sys_sub_analytics_d', 'MRR + ARR + Churn + Trial→Paid + Migration Tool للأدمن'), color: 'from-cyan-500 to-blue-600', isAI: true },
    { icon: GlobeAltIcon, category: 'ai', title: '🌐 ' + t('sys_multilang', '3 لغات + ترجمة AI'), desc: t('sys_multilang_d', 'AR/EN/FR + Owner Editor مع زر "ترجم بـ AI" عبر Gemini'), color: 'from-blue-500 to-indigo-600', isAI: true },

    // ✨ NEW Systems (Iter 127-133)
    { icon: AdjustmentsHorizontalIcon, category: 'comms', title: '🔔 ' + t('sys_notif_prefs', 'تفضيلات الإشعارات'), desc: t('sys_notif_prefs_d', 'كل مستخدم يتحكم في قنوات تنبيهاته (Email/Push/SMS) لكل نوع حدث'), color: 'from-orange-500 to-amber-600', isNew: true },
    { icon: MapIcon, category: 'admin', title: '🗺️ ' + t('sys_compound_map', 'خريطة الكمبوند التفاعلية'), desc: t('sys_compound_map_d', 'عرض جغرافي بصري لكل المباني والوحدات مع ربط مباشر لملف الساكن'), color: 'from-green-500 to-emerald-600', isNew: true },
    { icon: ArrowUpTrayIcon, category: 'admin', title: '📋 ' + t('sys_csv_import', 'استيراد السكان CSV'), desc: t('sys_csv_import_d', 'رفع ملف Excel/CSV لإضافة مئات السكان دفعة واحدة مع التحقق الذكي من الأخطاء'), color: 'from-teal-500 to-cyan-600', isNew: true },
    { icon: EnvelopeIcon, category: 'comms', title: '📧 ' + t('sys_email_logs', 'سجل البريد الإلكتروني'), desc: t('sys_email_logs_d', 'لوحة super-admin: نجاح/فشل/Bounce + إعادة إرسال + كشف الـ bounces تلقائياً'), color: 'from-indigo-500 to-blue-600', isNew: true },
    { icon: NewspaperIcon, category: 'comms', title: '📝 ' + t('sys_content_hub', 'مدوّنة Content Hub'), desc: t('sys_content_hub_d', '10+ مقالات عربية + تعليقات + CMS مع اقتراح SEO بالـ AI'), color: 'from-rose-500 to-pink-600', isNew: true },
    { icon: CheckCircleIcon, category: 'security', title: '✅ ' + t('sys_email_verify', 'تأكيد البريد الإلكتروني'), desc: t('sys_email_verify_d', 'حماية ضد الحسابات الوهمية: لازم تفعيل الإيميل قبل أول تسجيل دخول'), color: 'from-emerald-500 to-green-600', isNew: true },
    { icon: FingerPrintIcon, category: 'security', title: '🔐 ' + t('sys_biometric', 'تسجيل دخول بالبصمة'), desc: t('sys_biometric_d', 'WebAuthn: Face ID / Touch ID للموبايل، Windows Hello للديسكتوب'), color: 'from-violet-500 to-purple-600', isNew: true },

    // 🛡️ Security Suite (Iter 142-147 — Features #47, #49, #53, #54)
    { icon: LockClosedIcon, category: 'security', title: '🔒 ' + t('sys_mandatory_2fa', 'المصادقة الثنائية الإجبارية'), desc: t('sys_mandatory_2fa_d', '2FA إلزامي للمالك و Super Admin عبر Google Authenticator + Backup Codes'), color: 'from-red-500 to-rose-700', isNew: true },
    { icon: NoSymbolIcon, category: 'security', title: '🚫 ' + t('sys_auto_ban', 'الحظر التلقائي للـIPs'), desc: t('sys_auto_ban_d', 'IP يفشل 20 مرة/ساعة → حظر تلقائي 24 ساعة + تنبيه إيميل عند الهجمات الكبيرة'), color: 'from-rose-600 to-red-700', isNew: true },
    { icon: ExclamationTriangleIcon, category: 'security', title: '🛡️ ' + t('sys_security_insights', 'لوحة الأمن الذكية'), desc: t('sys_security_insights_d', 'IPs مشبوهة + حسابات مستهدفة + توزيع الهجمات بالساعات + Forensic logs'), color: 'from-amber-600 to-red-600', isNew: true },
    { icon: ClockIcon, category: 'security', title: '⏱️ ' + t('sys_rate_limit', 'تحديد محاولات الدخول'), desc: t('sys_rate_limit_d', '5 محاولات/15 دقيقة لكل username + Session timeout 24 ساعة + تسجيل كل محاولة'), color: 'from-orange-500 to-red-500', isNew: true },

    // 📱 Mobile + Distribution (Iter 148 — Feature #55)
    { icon: DevicePhoneMobileIcon, category: 'admin', title: '📱 ' + t('sys_mobile_api', 'تطبيق موبايل Flutter Native'), desc: t('sys_mobile_api_d', 'API كامل للتطبيق الأصلي iOS+Android مع OTP من 6 أرقام + FCM Push + 2FA support'), color: 'from-indigo-600 to-purple-700', isNew: true },

    // 🎁 Growth & Engagement (Iter 142-143 — Features #36, #37, #41)
    { icon: GiftIcon, category: 'finance', title: '🎁 ' + t('sys_referral', 'برنامج الإحالة المزدوج'), desc: t('sys_referral_d', 'كل شركة جديدة تشترك بكود إحالة تحصل تلقائياً على خصم ترحيبي 15% + تتبع الإحالات'), color: 'from-pink-500 to-rose-600', isNew: true },
    { icon: ChatBubbleBottomCenterTextIcon, category: 'comms', title: '💬 ' + t('sys_whatsapp_share', 'مشاركة WhatsApp'), desc: t('sys_whatsapp_share_d', 'زر مشاركة الإحالة على WhatsApp بضغطة مع رسالة جاهزة + تتبّع التحويلات'), color: 'from-green-500 to-emerald-600', isNew: true },

    // 🪜 UX Onboarding (Iter 145 — Feature #52)
    { icon: ListBulletIcon, category: 'admin', title: '🪜 ' + t('sys_wizard_signup', 'تسجيل شركة في 3 خطوات'), desc: t('sys_wizard_signup_d', 'Multi-step wizard مع Progress bar + validation تدريجي + step picker قابل للنقر'), color: 'from-cyan-500 to-blue-600', isNew: true },

    // 📊 Reports & Analytics (Iter 142-144 — Features #36, #43, #44)
    { icon: PresentationChartBarIcon, category: 'finance', title: '📊 ' + t('sys_executive_pdf', 'تقرير تنفيذي شهري PDF'), desc: t('sys_executive_pdf_d', 'PDF تلقائي للمالك مع MRR + Churn + Top 10 كمبوندات + اتجاه 12 شهر — كل أول الشهر'), color: 'from-slate-600 to-gray-800', isNew: true },
    { icon: ChartBarIcon, category: 'finance', title: '📈 ' + t('sys_trend_chart', 'مقارنة الكمبوندات 6 أشهر'), desc: t('sys_trend_chart_d', 'Multi-line chart لإيرادات/سكان/شكاوى/صيانة لكل كمبوند مع Legend تفاعلي'), color: 'from-blue-600 to-indigo-700', isNew: true },

    // ⭐ Customer Voice (Iter 143-144 — Features #39, #46)
    { icon: StarIcon, category: 'comms', title: '⭐ ' + t('sys_resident_ratings', 'تقييمات السكان للكمبوند'), desc: t('sys_resident_ratings_d', 'الساكن المسجّل يقيّم كمبونده 1-5 نجوم + comment + AI sentiment + moderation للسوبر أدمن'), color: 'from-yellow-500 to-orange-500', isNew: true },

    // 🌙 Theme & UX (Iter 142, 149)
    { icon: MoonIcon, category: 'admin', title: '🌙 ' + t('sys_dark_mode', 'الوضع الليلي الشامل'), desc: t('sys_dark_mode_d', 'تبديل light/dark على كل الصفحات (الرئيسية/Login/Pricing/Blog/Dashboard) + يحفظ التفضيل'), color: 'from-slate-700 to-indigo-900', isNew: true },

    // Smart devices (coming soon)
    { icon: BoltIcon, category: 'admin', title: t('sys_smart', 'الأجهزة الذكية'), desc: t('sys_smart_d', 'تحكم بالإضاءة + التكييف + الكاميرات + الأقفال (قريباً)'), color: 'from-amber-500 to-yellow-600', comingSoon: true },
  ];

  // Filter categories for the 30-systems grid
  const SYSTEM_FILTERS = [
    { id: 'all',         label: t('hp_filter_all', 'الكل'),         emoji: '📚' },
    { id: 'ai',          label: t('hp_filter_ai', 'AI'),            emoji: '✨' },
    { id: 'new',         label: t('hp_filter_new', 'جديد'),         emoji: '🎉' },
    { id: 'finance',     label: t('hp_filter_finance', 'مالي'),     emoji: '💰' },
    { id: 'maintenance', label: t('hp_filter_maintenance', 'صيانة'),emoji: '🔧' },
    { id: 'security',    label: t('hp_filter_security', 'أمن'),     emoji: '🛡️' },
    { id: 'comms',       label: t('hp_filter_comms', 'تواصل'),      emoji: '💬' },
  ];
  // Apply the active filter
  const filteredSystems = systems.filter((s) => {
    if (systemFilter === 'all') return true;
    if (systemFilter === 'ai') return s.isAI === true;
    if (systemFilter === 'new') return s.isNew === true;
    return s.category === systemFilter;
  });

  const accountTypes = [
    { id: 'compound_admin', icon: BuildingOfficeIcon, title: t('hp_reg_compound'), desc: t('hp_reg_compound_desc'), color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50/80 border-blue-200 hover:border-blue-400', features: [t('feat_create_compound', 'إنشاء المجتمع'), t('feat_add_residents', 'إضافة السكان'), t('feat_assign_roles', 'تعيين الأمن والإداريين'), t('feat_manage_budget', 'إدارة الميزانية')] },
    { id: 'company_admin', icon: BuildingOffice2Icon, title: t('hp_reg_company'), desc: t('hp_reg_company_desc'), color: 'from-purple-500 to-indigo-600', bg: 'bg-purple-50/80 border-purple-200 hover:border-purple-400', features: [t('feat_multi_compound', 'إدارة عدة مجتمعات'), t('feat_unified_reports', 'تقارير موحدة'), t('feat_contract_mgmt', 'إدارة العقود'), t('feat_full_analytics', 'تحليلات شاملة')] },
    { id: 'resident', icon: UserIcon, title: t('hp_reg_resident'), desc: t('hp_reg_resident_desc'), color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50/80 border-emerald-200 hover:border-emerald-400', features: [t('feat_maint_requests', 'طلبات صيانة'), t('feat_book_facilities', 'حجز مرافق'), t('feat_pay_dues', 'دفع التزامات'), t('feat_complaints', 'شكاوى واقتراحات')] },
  ];

  const guideItems = [
    { id: 'overview', icon: HomeModernIcon, title: t('gd_overview', 'نظرة عامة على المنصة'), content: t('gd_overview_d', 'منصة سحابية متكاملة لإدارة المجتمعات السكنية تضم 25+ نظام. تدعم العربية بالكامل (RTL)، 3 لغات (AR/EN/FR)، تطبيق PWA، ومدعومة بالذكاء الاصطناعي.') },
    { id: 'registration', icon: UserIcon, title: t('gd_registration', 'التسجيل وإنشاء الحساب'), content: t('gd_registration_d', '3 أنواع حسابات: مدير مجتمع (ساكن/أدمن)، شركة إدارة (1-غير محدود مجمعات)، أو ساكن. تجربة مجانية 14 يوم بدون بطاقة ائتمان مع كل ميزات الخطة المختارة. تسجيل بـ Email أو رقم جوال.') },
    { id: 'financial', icon: CurrencyDollarIcon, title: t('gd_financial', 'النظام المالي والمحاسبي'), content: t('gd_financial_d', 'ميزانية شاملة، 4 طرق لتوزيع المصروفات (بالتساوي/بالنسبة/مخصص/لكل شقة)، متابعة السداد بالألوان (أخضر/أصفر/أحمر)، رسوم بيانية شهرية، تصدير Excel بـ 5 أوراق + PDF. دعم Stripe + PayPal + Vodafone Cash + InstaPay.') },
    { id: 'maintenance', icon: WrenchScrewdriverIcon, title: t('gd_maintenance', 'إدارة الصيانة والخدمات'), content: t('gd_maintenance_d', 'تقديم طلبات مع صور وفيديو وأولوية (عادي/مستعجل/طارئ). إشعارات فورية للمدراء والفنيين. تقييم 5 نجوم بعد الإنجاز. AI Auto-Pilot ينبّه الفنيين تلقائياً عن الطلبات المعلقة لأكثر من 7 أيام.') },
    { id: 'visitors', icon: QrCodeIcon, title: t('gd_visitors', 'إدارة الزوار + QR Code'), content: t('gd_visitors_d', 'الساكن يطلب زيارة → موافقة الأدمن → توليد QR Code فريد → الأمن يمسح عند الدخول/الخروج بالموبايل. سجل زوار يومي كامل + قائمة سوداء + تنبيهات أمنية فورية.') },
    { id: 'contracts', icon: DocumentTextIcon, title: t('gd_contracts', 'إدارة العقود والمزودين'), content: t('gd_contracts_d', 'تسجيل عقود المزودين (نظافة/أمن/صيانة/إلخ) مع تواريخ ومرفقات. تنبيهات انتهاء تلقائية (60/30/7 أيام). تجديد بضغطة واحدة + أرشيف كامل بـ PDF.') },
    { id: 'communication', icon: ChatBubbleLeftEllipsisIcon, title: t('gd_comms', 'التواصل والإعلانات'), content: t('gd_comms_d', 'رسائل فورية WebSocket بين السكان والإدارة، إعلانات عامة + طوارئ، أحداث ومناسبات، نشرات إخبارية شهرية، مرفقات صور وفيديو وصوتيات. دعم WhatsApp + SMS + Email.') },
    { id: 'complaints', icon: ExclamationTriangleIcon, title: t('gd_complaints', 'الشكاوى والاقتراحات'), content: t('gd_complaints_d', 'تقديم شكوى بتصنيف (ضوضاء/أمن/نظافة/مالي/أخرى) مع صور وأولوية. متابعة الحالة بالإشعارات (مفتوحة/قيد المعالجة/محلولة). AI Auto-Pilot يذكّر الإدارة بالشكاوى المعلقة + يقترح ردود.') },
    { id: 'ratings', icon: StarIcon, title: t('gd_ratings', 'تقييمات الرضا'), content: t('gd_ratings_d', 'تقييم الخدمات 1-5 نجوم بتعليقات. إحصائيات رضا شاملة + متوسط تقييم لكل خدمة. AI ينبّه الإدارة بالتقييمات السلبية تلقائياً + يولّد رسائل اعتذار وتحسين.') },
    { id: 'facilities', icon: CalendarDaysIcon, title: t('gd_facilities', 'حجز المرافق'), content: t('gd_facilities_d', 'حجز الصالة الرياضية، الملعب، حمام السباحة، قاعة الاحتفالات. تقويم تفاعلي يعرض الفترات المتاحة. إلغاء قبل 24 ساعة. حجوزات متكررة أسبوعياً للمنتظمين.') },
    { id: 'polls', icon: ClipboardDocumentCheckIcon, title: t('gd_polls', 'استطلاعات الرأي'), content: t('gd_polls_d', 'استطلاعات مجتمعية بأسئلة متعددة الاختيارات (يس/لا، 1-5، اختيار واحد، متعدد). تصويت على قرارات إدارية مهمة. نتائج فورية بعد الإغلاق + تصدير PDF.') },
    { id: 'reports', icon: PresentationChartBarIcon, title: t('gd_reports', 'التقارير والتحليلات'), content: t('gd_reports_d', 'تقارير يومية تلقائية بالبريد للأدمن. Portfolio PDF Report للشركات (مقارنة بين المجمعات). تصدير Excel/PDF لكل قسم. تحليلات متقدمة بـ Recharts (إيرادات، مصروفات، رضا، إلخ).') },
    { id: 'subscription', icon: CreditCardIcon, title: t('gd_subscription', 'الاشتراكات وطرق الدفع'), content: t('gd_subscription_d', '4 خطط سكنية (مجاني/أساسي/احترافي/متقدم) + 3 شركات (ناشئة/متوسطة/كبرى). Stripe Auto-Renewal (شهري/سنوي مع خصم 17%)، Customer Portal لإدارة الكارت، أكواد وكوبونات خصم، فوترة أوتوماتيكية، إيصالات PDF.') },
    { id: 'roles', icon: ShieldCheckIcon, title: t('gd_roles', '6 أدوار وصلاحيات'), content: t('gd_roles_d', 'مالك التطبيق (Owner)، شركة إدارة (Company Admin)، مدير مجتمع (Admin)، إداري (Manager)، موظف أمن (Security)، ساكن (Resident). نظام RBAC متقدم + كل دور بصلاحيات مخصصة + 2FA للأدمن.') },

    // ✨ NEW AI Features
    { id: 'ai_chat', icon: SparklesIcon, title: '✨ ' + t('gd_ai_chat', 'مساعد HomeMe الذكي'), content: t('gd_ai_chat_d', 'شات AI عائم متاح في كل صفحة، مدعوم بـ Gemini 3 Flash. يجاوب على أسئلة المستخدمين بالعربي فوراً، ويوجّههم للصفحات الصحيحة بزر "افتح الصفحة" Deep Link. حدود يومية: Pro=20، Premium=50، Enterprise=غير محدود.') },
    { id: 'ai_advisor', icon: LightBulbIcon, title: '🧠 ' + t('gd_ai_advisor', 'مستشار AI استباقي'), content: t('gd_ai_advisor_d', 'يحلل بيانات الكمبوند يومياً ويكتشف 6 أنواع مشاكل تلقائياً: فواتير متأخرة (>30 يوم)، صيانة معلقة (>7 أيام)، تقييمات سلبية (≤2 نجوم)، إيصالات بانتظار، شكاوى مفتوحة، عقود تنتهي قريباً. زر "⚡ تنفيذ بالـ AI" يولّد رسالة عربية احترافية ويرسلها بضغطة.') },
    { id: 'ai_autopilot', icon: ClockIcon, title: '🤖 ' + t('gd_autopilot', 'AI Auto-Pilot'), content: t('gd_autopilot_d', 'جدولة تنفيذ AI Actions تلقائياً (يومياً/أسبوعياً): تذكير الدفع، تنبيه الفنيين، الردود على التقييمات السلبية، الشكاوى. تختار اليوم والساعة (مع تحويل بتوقيت مصر). ملخص أسبوعي بالبريد كل اثنين 11 صباحاً + سجل تنفيذ كامل.') },
    { id: 'auto_credentials', icon: EnvelopeIcon, title: '📨 ' + t('gd_credentials', 'إرسال بيانات الدخول تلقائياً'), content: t('gd_credentials_d', 'كل ساكن جديد يُضاف (فردي أو Bulk Import من Excel) يحصل تلقائياً على بريد ترحيب جميل بالعربي/RTL يحتوي: اسم المستخدم، كلمة المرور المؤقتة، اسم المجمع، رابط مباشر للدخول. لا تدخل من الأدمن مطلوب — Failure-safe.') },
    { id: 'subscription_analytics', icon: ChartBarIcon, title: '📊 ' + t('gd_sub_analytics', 'تحليلات الاشتراكات'), content: t('gd_sub_analytics_d', 'لوحة Owner متكاملة: MRR (الإيراد الشهري المتكرر) + ARR (السنوي) + Churn Rate + Trial→Paid Conversion + MRR by Plan. قائمة الشركات تنتهي خلال 7 أيام + اللي ألغوا. أداة Migration Tool لإرسال دعوات الترقية لـ Auto-Renewal بالجملة.') },
    { id: 'stripe_recurring', icon: ArrowPathIcon, title: '🔁 ' + t('gd_stripe_auto', 'Stripe Auto-Renewal'), content: t('gd_stripe_auto_d', 'اشتراك يجدد نفسه تلقائياً (شهري أو سنوي) عبر Stripe Subscriptions. خصم 17% عند اختيار السنوي. Customer Portal لإدارة الكارت / الفواتير / الإلغاء في أي وقت. Webhook يحدث DB تلقائياً عند نجاح/فشل التجديد.') },
    { id: 'multilang', icon: GlobeAltIcon, title: '🌐 ' + t('gd_multilang', '3 لغات + ترجمة AI'), content: t('gd_multilang_d', 'الواجهة بالكامل بالعربي + الإنجليزي + الفرنسي. صفحات قانونية (من نحن/الخصوصية/الشروط/اتصل بنا) قابلة للتعديل من Owner Editor مع زر "ترجم بـ AI" ينشئ النسخ الأخرى تلقائياً عبر Gemini خلال ثوانٍ.') },

    // ✨ NEW Features (Iter 127-133)
    { id: 'notif_prefs', icon: AdjustmentsHorizontalIcon, title: '🔔 ' + t('gd_notif_prefs', 'تفضيلات الإشعارات'), content: t('gd_notif_prefs_d', 'صفحة "الإشعارات والتفضيلات" تتيح لكل مستخدم اختيار كيف يستقبل كل نوع تنبيه: بريد، Push، SMS، أو داخل التطبيق فقط. تحكم دقيق بـ 12 نوع حدث (شكوى، فاتورة، صيانة، إعلان، إلخ) — مفيش تنبيهات غير مرغوبة.') },
    { id: 'compound_map', icon: MapIcon, title: '🗺️ ' + t('gd_compound_map', 'خريطة الكمبوند'), content: t('gd_compound_map_d', 'عرض جغرافي تفاعلي لكل المباني والوحدات داخل المجمع. اضغط على أي وحدة لرؤية ملف الساكن مباشرة. مفيد للأمن (تحديد موقع البلاغ) وللإدارة (نظرة بصرية شاملة).') },
    { id: 'csv_import', icon: ArrowUpTrayIcon, title: '📋 ' + t('gd_csv_import', 'استيراد السكان CSV'), content: t('gd_csv_import_d', 'ارفع ملف Excel أو CSV فيه قائمة السكان (اسم، إيميل، رقم وحدة، تليفون). النظام يتحقق من الأخطاء، يستثني التكرارات، ويرسل لكل واحد بيانات دخوله تلقائياً. يوفّر ساعات من العمل اليدوي.') },
    { id: 'email_logs', icon: EnvelopeIcon, title: '📧 ' + t('gd_email_logs', 'سجل البريد الإلكتروني'), content: t('gd_email_logs_d', 'لوحة Super-Admin لتتبع كل إيميل صدر من النظام: نجاح / فشل / Bounce. إحصائيات 7 أيام و30 يوم + معدّل النجاح. زرّ "أعد الإرسال" + كشف الـ bounces تلقائياً عبر IMAP poll كل 15 دقيقة.') },
    { id: 'content_hub', icon: NewspaperIcon, title: '📝 ' + t('gd_content_hub', 'مدوّنة Content Hub'), content: t('gd_content_hub_d', 'بوابة محتوى عربية ضمن الموقع: 10+ مقالات أصيلة عن إدارة المجمعات + نظام تعليقات (مع موافقة الأدمن) + CMS كامل في Super-Admin لإضافة وتعديل المقالات. زرّ "اقترح SEO بالـ AI" يولّد عنوان وملخّص وكلمات مفتاحية تلقائياً.') },
    { id: 'email_verify', icon: CheckCircleIcon, title: '✅ ' + t('gd_email_verify', 'تأكيد البريد الإلكتروني'), content: t('gd_email_verify_d', 'كل مستخدم جديد لازم يفعّل إيميله من خلال رابط يصله أول مرة قبل ما يقدر يسجّل دخول. حماية من الحسابات الوهمية والـ spam، وضمان إن كل بريد دخول هو ملك صاحبه فعلاً. زرّ "إعادة إرسال رمز التحقق" موجود.') },
    { id: 'biometric', icon: FingerPrintIcon, title: '🔐 ' + t('gd_biometric', 'تسجيل دخول بالبصمة'), content: t('gd_biometric_d', 'دعم WebAuthn الكامل: استخدم بصمة الموبايل (Face ID / Touch ID) أو Windows Hello في الديسكتوب للدخول السريع بدون كلمة مرور. مفعّل من إعدادات الأمان لكل مستخدم.') },
    { id: 'account_switcher', icon: ArrowRightOnRectangleIcon, title: '🔄 ' + t('gd_account_switcher', 'تبديل الحسابات بدون Logout'), content: t('gd_account_switcher_d', 'لو عندك أكثر من حساب (مثلاً Owner + Resident في نفس المجمع)، اربطهم مرة واحدة من القائمة الجانبية ثم بدّل بينهم بضغطة واحدة بدون تسجيل خروج. تجربة سلسة لمن يدير أكثر من دور.') },

    { id: 'smart', icon: BoltIcon, title: t('gd_smart', 'الأجهزة الذكية (قريباً)'), content: t('gd_smart_d', 'تحكم ذكي بالإضاءة، التكييف، الكاميرات، الأقفال الذكية، أنظمة الأمان. أوامر عربية بالذكاء الاصطناعي. تكامل مع Google Home + Apple HomeKit + Alexa.') },
  ];

  const fx = currency === 'egp' ? 1 : 0.0204; // 1 EGP ≈ 0.0204 USD (49 ج.م = $1)
  const sym = currency === 'egp' ? (i18n.language?.startsWith('ar') ? 'ج.م' : 'EGP') : '$';
  const priceOf = (egp) => {
    const val = currency === 'egp' ? egp : Math.round(egp * 0.02);
    return val.toLocaleString();
  };
  const yearlyOf = (monthly) => {
    // 20% annual discount: 12 × monthly × 0.80 = 9.6 × monthly
    const total = Math.round(monthly * 9.6);
    const val = currency === 'egp' ? total : Math.round(total * 0.02);
    return val.toLocaleString();
  };
  // Savings if user pays yearly vs 12 separate monthly payments (20% off)
  const savingsOf = (monthly) => {
    const saved = Math.round(monthly * 2.4); // 20% of 12 months
    const val = currency === 'egp' ? saved : Math.round(saved * 0.02);
    return val.toLocaleString();
  };
  const isYearly = billingPeriod === 'yearly';

  const residentialPlans = [
    {
      name: t('plan_starter', 'مجاني'),
      nameEn: 'Starter',
      residents: t('plan_30_residents', 'حتى 30 ساكن'),
      monthly: 0,
      color: 'border-gray-300',
      badge: '',
      features: [t('f_basic_residents', 'إدارة المقيمين الأساسية'), t('f_maintenance', 'طلبات الصيانة'), t('f_limited_notif', 'إشعارات محدودة'), t('f_monthly_report', 'تقرير شهري واحد'), t('f_resident_portal', 'بوابة المقيم')],
      excluded: [],
      cta: t('hp_start_free'),
      ctaStyle: 'bg-gray-800 text-white hover:bg-gray-700'
    },
    {
      name: t('plan_basic', 'أساسي'),
      nameEn: 'Basic',
      residents: t('plan_100_residents', 'حتى 100 ساكن'),
      monthly: 1200,
      color: 'border-sky-400',
      badge: '',
      features: [
        t('f_all_starter', 'كل مميزات المجاني'),
        t('plan_100_residents', 'حتى 100 ساكن'),
        t('f_full_residents', 'إدارة المقيمين الكاملة'),
        t('f_maintenance', 'طلبات الصيانة'),
        t('f_full_finance', 'النظام المالي الكامل'),
        t('f_expense_4ways', 'توزيع المصروفات (4 طرق)'),
        t('f_export_excel_pdf', 'تصدير Excel و PDF'),
        t('f_contracts', 'إدارة العقود والمزودين'),
        t('f_satisfaction', 'تقييمات الرضا'),
        t('f_facility_booking', 'حجز المرافق'),
        t('f_email_notif', 'إشعارات البريد'),
        '✨ ' + t('cf_ai_assistant_5', 'مساعد AI ذكي (5 رسائل/يوم)'),
        t('f_email_support', 'دعم فني بالبريد')
      ],
      excluded: [],
      cta: t('hp_subscribe_now'),
      ctaStyle: 'bg-sky-500 text-white hover:bg-sky-600'
    },
    {
      name: t('plan_pro', 'احترافي'),
      nameEn: 'Pro',
      residents: t('plan_unlimited_residents'),
      monthly: 2200,
      color: 'border-blue-500 ring-2 ring-blue-500/20',
      badge: t('hp_most_popular'),
      features: [
        t('f_all_basic', 'كل مميزات الأساسي'),
        t('f_unlimited_residents'),
        t('f_full_residents'),
        t('f_adv_maintenance', 'طلبات الصيانة المتقدمة'),
        t('f_full_finance'),
        t('f_expense_4ways'),
        t('f_export_excel_pdf'),
        t('f_contracts'),
        t('f_satisfaction'),
        t('f_facility_booking'),
        t('f_complaints_suggestions', 'الشكاوى والاقتراحات'),
        t('f_visitors_qr', 'إدارة الزوار + QR Code'),
        t('f_daily_reports', 'تقارير يومية تلقائية بالبريد'),
        t('f_polls', 'استطلاعات الرأي'),
        t('f_announcements', 'إعلانات وأحداث'),
        t('f_newsletters', 'نشرات إخبارية'),
        t('f_adv_analytics', 'تحليلات متقدمة + رسوم بيانية'),
        '✨ ' + t('cf_ai_assistant_20', 'مساعد HomeMe الذكي (شات AI 20 رسالة/يوم)'),
        '🧠 ' + t('cf_ai_advisor', 'مستشار AI استباقي يكتشف المشاكل ويقترح حلول'),
        '📨 ' + t('cf_auto_credentials', 'إرسال بيانات الدخول تلقائياً للسكان الجدد'),
        t('f_priority_support', 'دعم فني أولوية')
      ],
      excluded: [],
      cta: t('hp_subscribe_now'),
      ctaStyle: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:scale-[1.02]'
    },
    {
      name: t('plan_premium', 'متقدم'),
      nameEn: 'Premium',
      residents: t('plan_unlimited_all', 'عدد غير محدود - كل شيء'),
      monthly: 4000,
      color: 'border-violet-500',
      badge: '',
      features: [
        t('f_all_pro', 'كل مميزات الاحترافي'),
        t('f_unlimited_residents'),
        t('f_full_residents'),
        t('f_adv_maintenance'),
        t('f_full_finance'),
        t('f_expense_4ways'),
        t('f_export_excel_pdf'),
        t('f_contracts'),
        t('f_satisfaction'),
        t('f_facility_booking'),
        t('f_complaints_suggestions'),
        t('f_visitors_qr'),
        t('f_daily_reports'),
        t('f_polls'),
        t('f_announcements'),
        t('f_newsletters'),
        t('f_adv_analytics'),
        t('f_smart_devices', 'الأجهزة الذكية والأتمتة (قريباً)'),
        t('f_custom_api', 'API مخصص للتكامل'),
        t('f_custom_reports', 'تقارير مخصصة'),
        '✨ ' + t('cf_ai_assistant_50', 'مساعد HomeMe الذكي (50 رسالة/يوم)'),
        '🧠 ' + t('cf_ai_advisor', 'مستشار AI استباقي يكتشف المشاكل ويقترح حلول'),
        '🤖 ' + t('cf_ai_autopilot', 'AI Auto-Pilot — جدولة الإجراءات تلقائياً + ملخص أسبوعي'),
        '📨 ' + t('cf_auto_credentials', 'إرسال بيانات الدخول تلقائياً للسكان الجدد'),
        t('f_24_7_support', 'دعم فني مخصص 24/7'),
        t('f_team_training', 'تدريب الفريق'),
        t('f_account_manager', 'مدير حساب مخصص')
      ],
      excluded: [],
      cta: t('hp_subscribe_now'),
      ctaStyle: 'bg-violet-600 text-white hover:bg-violet-700'
    },
  ];

  const companyPlans = [
    {
      name: t('cp_startup', 'شركة ناشئة'),
      nameEn: 'Startup',
      compounds: t('cp_up_to_3', 'حتى 3 مجتمعات'),
      monthly: 5500,
      color: 'border-amber-400',
      features: [
        t('cf_manage_3', 'إدارة حتى 3 مجتمعات سكنية'),
        t('cf_unified_dashboard', 'لوحة تحكم موحدة'),
        t('f_unlimited_residents'),
        t('cf_all_pro_each', 'كل مميزات الاحترافي لكل مجتمع'),
        t('f_full_finance'), t('f_expense_4ways'), t('f_export_excel_pdf'),
        t('f_contracts'), t('f_satisfaction'), t('f_facility_booking'),
        t('f_complaints_suggestions'), t('f_visitors_qr'), t('f_daily_reports'),
        t('f_polls'), t('f_announcements'), t('f_newsletters'), t('f_adv_analytics'),
        t('cf_unified_reports', 'تقارير موحدة لكل المجتمعات'),
        t('cf_single_team', 'فريق إدارة واحد'),
        '✨ ' + t('cf_ai_assistant', 'مساعد HomeMe الذكي (شات AI 20 رسالة/يوم لكل مستخدم)'),
        '🧠 ' + t('cf_ai_advisor', 'مستشار AI استباقي يكتشف المشاكل ويقترح حلول'),
        '📨 ' + t('cf_auto_credentials', 'إرسال بيانات الدخول تلقائياً للسكان الجدد'),
        '🔁 ' + t('cf_stripe_autorenew', 'تجديد تلقائي عبر Stripe (شهري/سنوي مع خصم 17%)'),
        t('f_email_support')
      ],
      cta: t('hp_subscribe_now'),
      ctaStyle: 'bg-amber-500 text-white hover:bg-amber-600'
    },
    {
      name: t('cp_business', 'شركة متوسطة'),
      nameEn: 'Business',
      compounds: t('cp_up_to_8', '1 - 8 مجتمعات'),
      monthly: 13000,
      color: 'border-orange-500 ring-2 ring-orange-500/20',
      badge: t('hp_best_for_companies'),
      features: [
        t('cf_manage_8', 'إدارة حتى 8 مجتمعات'),
        t('cf_adv_dashboard', 'لوحة تحكم مركزية متقدمة'),
        t('f_unlimited_residents'),
        t('cf_all_premium_each', 'كل مميزات المتقدم لكل مجتمع'),
        t('f_full_finance'), t('f_expense_4ways'), t('f_export_excel_pdf'),
        t('f_contracts'), t('f_satisfaction'), t('f_facility_booking'),
        t('f_complaints_suggestions'), t('f_visitors_qr'), t('f_daily_reports'),
        t('f_polls'), t('f_announcements'), t('f_newsletters'), t('f_adv_analytics'),
        t('f_smart_devices'), t('f_custom_api'),
        t('cf_compare_analytics', 'تحليلات مقارنة بين المجتمعات'),
        t('cf_multi_teams', 'إدارة فرق متعددة'),
        t('cf_adv_permissions', 'نظام صلاحيات متقدم'),
        t('cf_company_reports', 'تقارير أداء الشركة'),
        '✨ ' + t('cf_ai_assistant_50', 'مساعد HomeMe الذكي (50 رسالة/يوم)'),
        '🧠 ' + t('cf_ai_advisor', 'مستشار AI استباقي يكتشف المشاكل ويقترح حلول'),
        '🤖 ' + t('cf_ai_autopilot', 'AI Auto-Pilot — جدولة الإجراءات تلقائياً + ملخص أسبوعي'),
        '📨 ' + t('cf_auto_credentials', 'إرسال بيانات الدخول تلقائياً للسكان الجدد'),
        '📊 ' + t('cf_subscription_analytics', 'تحليلات اشتراكات مفصّلة (MRR / Churn)'),
        '🔁 ' + t('cf_stripe_autorenew', 'تجديد تلقائي عبر Stripe (شهري/سنوي مع خصم 17%)'),
        t('cf_priority_whatsapp', 'دعم فني أولوية + واتساب')
      ],
      cta: t('hp_subscribe_now'),
      ctaStyle: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-xl hover:scale-[1.02]'
    },
    {
      name: t('cp_enterprise', 'شركة كبرى'),
      nameEn: 'Enterprise',
      compounds: t('plan_unlimited_all'),
      monthly: 35000,
      isCustom: false,
      color: 'border-red-500',
      features: [
        t('cf_unlimited_compounds', 'عدد غير محدود من المجتمعات'),
        t('f_unlimited_residents'),
        t('cf_all_platform', 'كل مميزات المنصة بدون استثناء'),
        t('f_full_finance'), t('f_expense_4ways'), t('f_export_excel_pdf'),
        t('f_contracts'), t('f_satisfaction'), t('f_facility_booking'),
        t('f_complaints_suggestions'), t('f_visitors_qr'), t('f_daily_reports'),
        t('f_polls'), t('f_announcements'), t('f_newsletters'), t('f_adv_analytics'),
        t('f_smart_devices'),
        t('cf_full_api', 'تكامل API كامل مع أنظمتكم'),
        t('cf_compare_analytics'), t('cf_multi_teams'), t('cf_adv_permissions'), t('cf_company_reports'),
        '✨ ' + t('cf_ai_assistant_unlimited', 'مساعد HomeMe الذكي بدون حدود'),
        '🧠 ' + t('cf_ai_advisor', 'مستشار AI استباقي يكتشف المشاكل ويقترح حلول'),
        '🤖 ' + t('cf_ai_autopilot_full', 'AI Auto-Pilot كامل + ملخصات أسبوعية مخصّصة'),
        '📊 ' + t('cf_full_revenue_analytics', 'تحليلات إيرادات كاملة (MRR / ARR / Churn / Forecasts)'),
        '🔁 ' + t('cf_stripe_autorenew', 'تجديد تلقائي عبر Stripe (شهري/سنوي مع خصم 17%)'),
        '📨 ' + t('cf_auto_credentials', 'إرسال بيانات الدخول تلقائياً'),
        t('cf_private_hosting', 'استضافة خاصة (اختياري)'),
        t('cf_white_label', 'تخصيص العلامة التجارية'),
        t('f_account_manager'), t('cf_full_training', 'تدريب شامل للفريق'),
        t('cf_sla', 'SLA مضمون 99.9%'),
        t('cf_24_7_phone', 'دعم فني 24/7 هاتف + واتساب')
      ],
      cta: t('hp_subscribe_now'),
      ctaStyle: 'bg-red-600 text-white hover:bg-red-700'
    },
  ];

  const companyComparisonFeatures = [
    { name: t('cf_num_compounds', 'عدد المجتمعات'), startup: t('cp_up_to_3_short', 'حتى 3'), business: t('cp_up_to_8_short', 'حتى 8'), enterprise: t('cf_unlimited_short', 'غير محدود') },
    { name: t('f_unlimited_residents'), startup: true, business: true, enterprise: true },
    { name: t('cf_central_dashboard', 'لوحة تحكم مركزية'), startup: true, business: true, enterprise: true },
    { name: t('f_full_finance'), startup: true, business: true, enterprise: true },
    { name: t('f_expense_4ways'), startup: true, business: true, enterprise: true },
    { name: t('f_export_excel_pdf'), startup: true, business: true, enterprise: true },
    { name: t('f_contracts'), startup: true, business: true, enterprise: true },
    { name: t('f_satisfaction'), startup: true, business: true, enterprise: true },
    { name: t('f_facility_booking'), startup: true, business: true, enterprise: true },
    { name: t('f_complaints_suggestions'), startup: true, business: true, enterprise: true },
    { name: t('f_visitors_qr'), startup: true, business: true, enterprise: true },
    { name: t('f_daily_reports'), startup: true, business: true, enterprise: true },
    { name: t('f_polls'), startup: true, business: true, enterprise: true },
    { name: t('f_announcements'), startup: true, business: true, enterprise: true },
    { name: t('f_newsletters'), startup: true, business: true, enterprise: true },
    { name: t('f_adv_analytics'), startup: true, business: true, enterprise: true },
    { name: t('cf_unified_reports'), startup: true, business: true, enterprise: true },
    // ✨ NEW AI Features for Companies
    { name: '✨ ' + t('cmp_ai_chat', 'مساعد HomeMe الذكي (شات AI)'), startup: '20/يوم', business: '50/يوم', enterprise: 'غير محدود', highlight: true },
    { name: '🧠 ' + t('cmp_ai_advisor', 'مستشار AI استباقي'), startup: true, business: true, enterprise: true, highlight: true },
    { name: '🤖 ' + t('cmp_autopilot', 'AI Auto-Pilot (مجدول)'), startup: false, business: true, enterprise: true, highlight: true },
    { name: '📨 ' + t('cmp_auto_credentials', 'إرسال بيانات الدخول تلقائياً'), startup: true, business: true, enterprise: true, highlight: true },
    { name: '🔁 ' + t('cmp_stripe_autorenew', 'تجديد تلقائي عبر Stripe'), startup: true, business: true, enterprise: true, highlight: true },
    { name: '📊 ' + t('cmp_subscription_analytics', 'تحليلات اشتراكات (MRR/Churn)'), startup: false, business: true, enterprise: true, highlight: true },
    { name: '📬 ' + t('cmp_weekly_digest', 'ملخص AutoPilot أسبوعي بالبريد'), startup: false, business: true, enterprise: true, highlight: true },
    { name: t('f_smart_devices'), startup: false, business: true, enterprise: true },
    { name: t('f_custom_api'), startup: false, business: true, enterprise: true },
    { name: t('cf_compare_analytics'), startup: false, business: true, enterprise: true },
    { name: t('cf_multi_teams'), startup: false, business: true, enterprise: true },
    { name: t('cf_adv_permissions'), startup: false, business: true, enterprise: true },
    { name: t('cf_company_reports'), startup: false, business: true, enterprise: true },
    { name: t('cf_private_hosting'), startup: false, business: false, enterprise: true },
    { name: t('cf_white_label'), startup: false, business: false, enterprise: true },
    { name: t('f_account_manager'), startup: false, business: false, enterprise: true },
    { name: t('cf_full_training'), startup: false, business: false, enterprise: true },
    { name: t('cf_sla'), startup: false, business: false, enterprise: true },
    { name: t('cf_24_7_phone'), startup: false, business: false, enterprise: true },
  ];

  const comparisonFeatures = [
    { name: t('f_full_residents', 'إدارة المقيمين'), starter: true, basic: true, pro: true, premium: true },
    { name: t('f_maintenance', 'طلبات الصيانة'), starter: true, basic: true, pro: true, premium: true },
    { name: t('f_resident_portal', 'بوابة المقيم'), starter: true, basic: true, pro: true, premium: true },
    { name: t('f_full_finance', 'النظام المالي الكامل'), starter: false, basic: true, pro: true, premium: true },
    { name: t('f_expense_4ways', 'توزيع المصروفات (4 طرق)'), starter: false, basic: true, pro: true, premium: true },
    { name: t('f_export_excel_pdf', 'تصدير Excel و PDF'), starter: false, basic: true, pro: true, premium: true },
    { name: t('f_contracts', 'إدارة العقود والمزودين'), starter: false, basic: true, pro: true, premium: true },
    { name: t('f_satisfaction', 'تقييمات الرضا'), starter: false, basic: true, pro: true, premium: true },
    { name: t('f_facility_booking', 'حجز المرافق'), starter: false, basic: true, pro: true, premium: true },
    { name: t('f_email_notif', 'إشعارات البريد'), starter: false, basic: true, pro: true, premium: true },
    { name: t('f_complaints_suggestions', 'الشكاوى والاقتراحات'), starter: false, basic: false, pro: true, premium: true },
    { name: t('f_visitors_qr', 'إدارة الزوار + QR Code'), starter: false, basic: false, pro: true, premium: true },
    { name: t('f_daily_reports', 'تقارير يومية تلقائية بالبريد'), starter: false, basic: false, pro: true, premium: true },
    { name: t('f_polls', 'استطلاعات الرأي'), starter: false, basic: false, pro: true, premium: true },
    { name: t('f_announcements', 'إعلانات وأحداث'), starter: false, basic: false, pro: true, premium: true },
    { name: t('f_newsletters', 'نشرات إخبارية'), starter: false, basic: false, pro: true, premium: true },
    { name: t('f_adv_analytics', 'تحليلات متقدمة + رسوم بيانية'), starter: false, basic: false, pro: true, premium: true },
    // ✨ NEW AI Features
    { name: '✨ ' + t('cmp_ai_chat', 'مساعد HomeMe الذكي (شات AI)'), starter: false, basic: false, pro: '20/يوم', premium: '50/يوم', highlight: true },
    { name: '🧠 ' + t('cmp_ai_advisor', 'مستشار AI استباقي'), starter: false, basic: false, pro: true, premium: true, highlight: true },
    { name: '🤖 ' + t('cmp_autopilot', 'AI Auto-Pilot (تلقائي مجدول)'), starter: false, basic: false, pro: false, premium: true, highlight: true },
    { name: '📨 ' + t('cmp_auto_credentials', 'إرسال بيانات الدخول تلقائياً'), starter: false, basic: false, pro: true, premium: true, highlight: true },
    { name: t('f_smart_devices', 'الأجهزة الذكية والأتمتة (قريباً)'), starter: false, basic: false, pro: false, premium: true },
    { name: t('f_custom_api', 'API مخصص للتكامل'), starter: false, basic: false, pro: false, premium: true },
    { name: t('f_custom_reports', 'تقارير مخصصة'), starter: false, basic: false, pro: false, premium: true },
    { name: t('f_24_7_support', 'دعم فني مخصص 24/7'), starter: false, basic: false, pro: false, premium: true },
    { name: t('f_team_training', 'تدريب الفريق'), starter: false, basic: false, pro: false, premium: true },
    { name: t('f_account_manager', 'مدير حساب مخصص'), starter: false, basic: false, pro: false, premium: true },
  ];

  const paymentMethods = [
    { icon: CreditCardIcon, name: t('pm_cards', 'بطاقات الائتمان'), desc: 'Visa, Mastercard, Mada' },
    { icon: GlobeAltIcon, name: 'PayPal', desc: t('pm_paypal_d', 'دفع آمن عالمي') },
    { icon: DevicePhoneMobileIcon, name: t('pm_wallets', 'المحافظ الرقمية'), desc: 'Apple Pay, STC Pay' },
    { icon: CurrencyDollarIcon, name: t('pm_bank', 'تحويل بنكي'), desc: t('pm_bank_d', 'تحويل مباشر للحساب') },
    { icon: PhoneIcon, name: t('pm_instapay', 'انستاباي'), desc: t('pm_instapay_d', 'تحويل فوري بالموبايل') },
  ];

  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-sm" data-testid="homepage-header">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex justify-between items-center gap-4">
          <div className="flex items-center gap-4 flex-shrink-0">
            <img
              src="https://customer-assets.emergentagent.com/job_homeme-subscriptions/artifacts/6yk66f7n_WhatsApp%20Image%202022-01-17%20at%2010.23.44%20AM.637bf42d664818.47361218.jpeg"
              alt="HomeMe"
              className="h-20 lg:h-28 w-auto rounded-2xl shadow-lg"
              data-testid="homepage-logo"
            />
            <div>
              <span className="text-3xl lg:text-5xl font-black text-gray-900 block leading-tight tracking-tight" style={{ fontFamily: "'Cairo', sans-serif" }}>HomeMe</span>
              <span className="text-[10px] lg:text-xs text-gray-500 font-medium block">{t('hp_subtitle')}</span>
            </div>
          </div>

          {/* Center Navigation — desktop only */}
          <nav className="hidden lg:!flex items-center gap-1 flex-1 justify-center" data-testid="homepage-nav" aria-label={t('hp_main_nav', 'القائمة الرئيسية')}>
            {[
              { href: '#top', sectionId: 'top', label: t('nav_home', 'الرئيسية'), testid: 'nav-home' },
              { href: '#systems', sectionId: 'systems', label: t('nav_features', 'المميزات'), testid: 'nav-features' },
              { href: '#ai-features', sectionId: 'ai-features', label: '✨ ' + t('nav_whats_new', 'الجديد'), testid: 'nav-whats-new' },
              { href: '#pricing', sectionId: 'pricing', label: t('nav_pricing', 'الأسعار'), testid: 'nav-pricing' },
              { href: '#guide', sectionId: 'guide', label: t('nav_guide', 'الدليل'), testid: 'nav-guide' },
              { href: '#testimonials', sectionId: 'testimonials', label: t('nav_testimonials', 'آراء العملاء'), testid: 'nav-testimonials' },
              { href: '#faq', sectionId: 'faq', label: t('nav_faq', 'الأسئلة'), testid: 'nav-faq' },
            ].map((item, i) => {
              const isActive = activeSection === item.sectionId;
              return (
                <a
                  key={i}
                  href={item.href}
                  onClick={(e) => {
                    if (item.href === '#top') {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative px-3 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                    isActive
                      ? 'text-blue-700 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                  data-testid={item.testid}
                  data-active={isActive ? 'true' : 'false'}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full" aria-hidden="true" />
                  )}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => navigate('/login?owner_only=1')}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all group relative"
              data-testid="owner-quick-login"
              title={t('hp_owner_login_tooltip', 'دخول المالك / السوبر أدمن فقط')}
            >
              <KeyIcon className="h-5 w-5" />
            </button>
            <LanguageSwitcher />
            <ThemeToggle />
            {user ? (
              <>
                <Link
                  to="/app/dashboard"
                  className="hidden sm:!inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-xs sm:text-sm hover:shadow-lg transition-all whitespace-nowrap"
                  data-testid="header-dashboard"
                  title={t('hp_dashboard', 'لوحة التحكم')}
                >
                  <Squares2X2Icon className="h-4 w-4" />
                  <span>{t('hp_dashboard', 'لوحة التحكم')}</span>
                </Link>
                <button
                  onClick={() => { logout(); }}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-red-600 border-2 border-red-200 hover:bg-red-50 hover:border-red-400 rounded-xl font-semibold text-xs sm:text-sm transition-all whitespace-nowrap"
                  data-testid="header-logout"
                  title={t('logout', 'تسجيل الخروج')}
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  <span className="hidden sm:!inline">{t('logout', 'تسجيل الخروج')}</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden sm:!inline-flex px-4 py-2 text-blue-600 border-2 border-blue-600 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-all" data-testid="header-login">
                  {t('login', 'تسجيل الدخول')}
                </Link>
                <Link to="/register" className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-xs sm:text-sm hover:shadow-lg transition-all whitespace-nowrap" data-testid="header-register">
                  {t('register_now', 'إنشاء حساب')}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile/Tablet Nav — horizontal scrollable strip */}
        <nav className="lg:!hidden border-t border-gray-100 bg-gray-50/50 overflow-x-auto" data-testid="homepage-nav-mobile" aria-label={t('hp_main_nav', 'القائمة الرئيسية')}>
          <div className="flex items-center gap-0.5 px-2 py-1.5 min-w-max">
            {[
              { href: '#top', sectionId: 'top', label: t('nav_home', 'الرئيسية'), testid: 'nav-home-m' },
              { href: '#systems', sectionId: 'systems', label: t('nav_features', 'المميزات'), testid: 'nav-features-m' },
              { href: '#ai-features', sectionId: 'ai-features', label: '✨ ' + t('nav_whats_new', 'الجديد'), testid: 'nav-whats-new-m' },
              { href: '#pricing', sectionId: 'pricing', label: t('nav_pricing', 'الأسعار'), testid: 'nav-pricing-m' },
              { href: '#guide', sectionId: 'guide', label: t('nav_guide', 'الدليل'), testid: 'nav-guide-m' },
              { href: '#testimonials', sectionId: 'testimonials', label: t('nav_testimonials', 'آراء العملاء'), testid: 'nav-testimonials-m' },
              { href: '#faq', sectionId: 'faq', label: t('nav_faq', 'الأسئلة'), testid: 'nav-faq-m' },
            ].map((item, i) => {
              const isActive = activeSection === item.sectionId;
              return (
                <a
                  key={i}
                  href={item.href}
                  onClick={(e) => {
                    if (item.href === '#top') {
                      e.preventDefault();
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                    isActive
                      ? 'text-blue-700 bg-blue-100 shadow-sm'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-white'
                  }`}
                  data-testid={item.testid}
                  data-active={isActive ? 'true' : 'false'}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white py-24 lg:py-32" data-testid="hero-section">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 25% 40%, rgba(99,102,241,0.4), transparent 50%), radial-gradient(circle at 75% 70%, rgba(59,130,246,0.3), transparent 50%)' }} />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <img
              src="https://customer-assets.emergentagent.com/job_homeme-subscriptions/artifacts/6yk66f7n_WhatsApp%20Image%202022-01-17%20at%2010.23.44%20AM.637bf42d664818.47361218.jpeg"
              alt="HomeMe"
              className="h-32 w-auto rounded-3xl shadow-2xl mx-auto mb-8 ring-4 ring-white/20"
              data-testid="hero-logo"
            />
            <div className="inline-block px-5 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium text-blue-200 mb-6 border border-white/10">
              <SparklesIcon className="h-4 w-4 inline-block -mt-0.5 ml-1" />
              {t('hp_subtitle')}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 leading-tight" style={{ fontFamily: "'Cairo', sans-serif" }}>
              {t('hp_hero_title_1')}
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
                {t('hp_hero_title_2')}
              </span>
            </h1>
            <p className="text-lg text-blue-100/80 mb-10 max-w-2xl mx-auto leading-relaxed">
              {t('hp_hero_desc')}
            </p>
            <p className="text-sm text-cyan-300 font-medium mb-6 -mt-6">{t('hp_free_trial_note')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="px-8 py-4 bg-white text-blue-950 rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2" data-testid="hero-cta-register">
                {t('hp_start_trial')}
                <ArrowRightIcon className="h-5 w-5 rotate-180" />
              </Link>
              <a href="#guide" className="px-8 py-4 border-2 border-white/30 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2" data-testid="hero-cta-guide">
                <BookOpenIcon className="h-5 w-5" />
                {t('hp_guide_btn')}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Ad Space 1 - After Hero (Homepage Hero) */}
      <div className="bg-gray-100 py-3 text-center" data-testid="ad-space-1">
        <div className="max-w-7xl mx-auto px-4">
          <InternalAdBanner position="homepage_hero" maxAds={1} variant="full" className="" />
        </div>
      </div>

      {/* Resident Portal — قسم مخصص للسكان والمستخدمين الجدد */}
      <section className="relative py-14 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 overflow-hidden" data-testid="resident-portal-section">
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute top-0 end-0 text-9xl">🏠</div>
          <div className="absolute bottom-0 start-0 text-9xl">👨‍👩‍👧</div>
        </div>
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="text-center mb-8">
            <span className="inline-block px-4 py-1.5 bg-emerald-500/15 text-emerald-700 rounded-full text-xs font-bold mb-3">
              🏡 {t('hp_residents_badge', 'بوابة السكان')}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>
              {t('hp_residents_title', 'هل أنت ساكن في أحد مجتمعاتنا؟')}
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
              {t('hp_residents_subtitle', 'ادخل بوابتك الخاصة لإدارة وحدتك، دفع الفواتير، طلب الخدمات، والتواصل مع إدارة مجتمعك — كل شيء في مكان واحد')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
            {/* كارت تسجيل الدخول للسكان */}
            <div className="bg-white rounded-2xl border-2 border-emerald-200 p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all group" data-testid="resident-login-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl shadow-lg shadow-emerald-500/25">
                  🔑
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{t('hp_already_resident', 'أنا ساكن مسجل')}</h3>
                  <p className="text-xs text-gray-500">{t('hp_already_resident_desc', 'لدي حساب بالفعل')}</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-600 mb-5">
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> {t('hp_res_feat1', 'ادفع فواتير الصيانة والمرافق')}</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> {t('hp_res_feat2', 'اطلب خدمات الصيانة والنظافة')}</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> {t('hp_res_feat3', 'تواصل مع الإدارة والأمن')}</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> {t('hp_res_feat4', 'استقبل الإشعارات والإعلانات')}</li>
              </ul>
              <Link
                to="/login"
                state={{ fromResidentPortal: true }}
                className="block w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-sm text-center hover:shadow-xl hover:shadow-emerald-500/30 transition-all"
                data-testid="resident-login-btn"
              >
                {t('hp_resident_login', 'تسجيل الدخول كساكن')} ←
              </Link>
            </div>

            {/* كارت التسجيل الجديد */}
            <div className="bg-white rounded-2xl border-2 border-blue-200 p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all group" data-testid="resident-register-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl shadow-lg shadow-blue-500/25">
                  ✨
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{t('hp_new_resident', 'ساكن جديد؟')}</h3>
                  <p className="text-xs text-gray-500">{t('hp_new_resident_desc', 'أنشئ حسابك الآن')}</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-600 mb-4">
                <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> {t('hp_new_feat1', 'سجّل برقم وحدتك وكود الدعوة من الإدارة')}</li>
                <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> {t('hp_new_feat2', 'أضف أفراد أسرتك بسهولة')}</li>
                <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> {t('hp_new_feat3', 'تفعيل فوري خلال دقائق')}</li>
                <li className="flex items-center gap-2"><span className="text-blue-500">✓</span> {t('hp_new_feat4', 'مجاني بالكامل للسكان')}</li>
              </ul>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4">
                <p className="text-[10px] text-amber-700 flex items-center gap-1.5">
                  <span>💡</span>
                  {t('hp_need_invite', 'تحتاج كود دعوة من إدارة مجتمعك لتفعيل الحساب')}
                </p>
              </div>
              <Link
                to="/register"
                state={{ accountType: 'resident' }}
                className="block w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm text-center hover:shadow-xl hover:shadow-blue-500/30 transition-all"
                data-testid="resident-register-btn"
              >
                {t('hp_resident_register', 'إنشاء حساب ساكن جديد')} ←
              </Link>
            </div>
          </div>

          {/* فاصل للأدوار الإدارية */}
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-3 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-full px-5 py-2.5 shadow-sm">
              <span className="text-xs text-gray-500">
                {t('hp_admin_note', 'للمديرين ومالكي المجتمعات والشركات')}:
              </span>
              <Link to="/login" className="text-xs text-purple-600 font-bold hover:text-purple-700 flex items-center gap-1" data-testid="admin-login-link">
                🛡️ {t('hp_admin_login', 'دخول الإدارة')}
              </Link>
              <span className="text-gray-300">•</span>
              <Link to="/register" className="text-xs text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-1" data-testid="business-register-link">
                💼 {t('hp_business_register', 'تسجيل مؤسسة')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Registration Types */}
      <section className="py-16 bg-gray-50/80" id="register-types" data-testid="registration-section">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_choose_registration')}</h2>
            <p className="text-gray-500">{t('hp_choose_registration_desc')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {accountTypes.map(type => {
              const Icon = type.icon;
              return (
                <div key={type.id} onClick={() => navigate('/register')}
                  className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all hover:shadow-xl hover:-translate-y-1 ${type.bg}`}
                  data-testid={`register-type-${type.id}`}
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${type.color} mb-4`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{type.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{type.desc}</p>
                  <ul className="space-y-1.5">
                    {type.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 30 Systems */}
      <section className="py-16" id="systems" data-testid="systems-section">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }} data-testid="systems-title">{t('hp_systems_title', `${systems.length} نظام متكامل`).replace('{count}', systems.length)}</h2>
            <p className="text-gray-500">{t('hp_systems_desc', 'كل الأدوات التي تحتاجها لإدارة مجتمعك السكني باحترافية + ميزات AI متقدمة')}</p>
          </div>

          {/* 🔍 Filter Bar — narrows the systems grid to the chosen category */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8" data-testid="systems-filter-bar">
            {SYSTEM_FILTERS.map((f) => {
              const active = systemFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSystemFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    active
                      ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-transparent shadow-md scale-105'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50'
                  }`}
                  data-testid={`systems-filter-${f.id}`}
                >
                  <span className="ml-1">{f.emoji}</span> {f.label}
                  {active && (
                    <span className={`ms-1.5 px-1.5 py-0.5 rounded-full text-[9px] bg-white/25`}>
                      {filteredSystems.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="systems-grid">
            {filteredSystems.map((sys, i) => {
              const Icon = sys.icon;
              return (
                <div key={i} className={`bg-white rounded-xl border p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all group relative ${
                  sys.isAI ? 'border-violet-200 bg-gradient-to-br from-violet-50/40 to-fuchsia-50/30' :
                  sys.isNew ? 'border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-teal-50/30' :
                  'border-gray-100'
                }`}>
                  {sys.isAI && (
                    <span className="absolute -top-2 -right-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md">
                      جديد ✨
                    </span>
                  )}
                  {sys.isNew && (
                    <span className="absolute -top-2 -right-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md">
                      جديد 🎉
                    </span>
                  )}
                  {sys.comingSoon && (
                    <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md">
                      قريباً
                    </span>
                  )}
                  <div className={`inline-flex p-2.5 rounded-lg bg-gradient-to-r ${sys.color} mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h4 className={`font-bold mb-1 ${
                    sys.isAI ? 'text-violet-900' :
                    sys.isNew ? 'text-emerald-900' :
                    'text-gray-900'
                  }`}>{sys.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{sys.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ✨ What's New — AI & Auto-Pilot Features Banner */}
      <section className="py-16 bg-gradient-to-br from-violet-950 via-purple-900 to-fuchsia-900 text-white relative overflow-hidden" id="ai-features" data-testid="ai-features-section">
        {/* Decorative gradient blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-fuchsia-500/30 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur border border-white/20 rounded-full text-sm font-medium mb-4">
              ✨ {t('hp_whats_new', 'ما الجديد في 2026')}
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>
              {t('hp_ai_powered', 'مدعوم بالذكاء الاصطناعي')}
            </h2>
            <p className="text-violet-200 max-w-2xl mx-auto text-base">
              {t('hp_ai_desc', 'وفّر ساعات أسبوعياً مع AI Auto-Pilot والمستشار الذكي والتجديد التلقائي عبر Stripe')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Feature 1 — AI Assistant */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:scale-[1.02] transition-all">
              <div className="text-4xl mb-3">✨</div>
              <h3 className="text-xl font-bold mb-2">{t('hp_feat_ai_assistant', 'مساعد HomeMe الذكي')}</h3>
              <p className="text-sm text-violet-200 leading-relaxed">
                {t('hp_feat_ai_assistant_desc', 'شات AI عائم متاح في كل صفحة، يجاوب على أسئلة المستخدمين فوراً ويوجّههم للصفحات الصحيحة. مدعوم بـ Gemini 3 Flash.')}
              </p>
              <div className="mt-3 inline-block bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded font-bold">
                ⚡ Gemini 3 Flash
              </div>
            </div>

            {/* Feature 2 — AI Advisor */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:scale-[1.02] transition-all">
              <div className="text-4xl mb-3">🧠</div>
              <h3 className="text-xl font-bold mb-2">{t('hp_feat_ai_advisor', 'مستشار AI استباقي')}</h3>
              <p className="text-sm text-violet-200 leading-relaxed">
                {t('hp_feat_ai_advisor_desc', 'يحلل بيانات الكمبوند يومياً ويكتشف المشاكل قبل ما تتفاقم: فواتير متأخرة، صيانة معلقة، تقييمات سلبية. مع زر "تنفيذ بالـ AI" لإرسال جماعي.')}
              </p>
              <div className="mt-3 inline-block bg-rose-500/20 text-rose-300 text-xs px-2 py-0.5 rounded font-bold">
                🤖 Auto-Detect
              </div>
            </div>

            {/* Feature 3 — AI Auto-Pilot */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:scale-[1.02] transition-all">
              <div className="text-4xl mb-3">🤖</div>
              <h3 className="text-xl font-bold mb-2">{t('hp_feat_autopilot', 'AI Auto-Pilot')}</h3>
              <p className="text-sm text-violet-200 leading-relaxed">
                {t('hp_feat_autopilot_desc', 'جدولة تنفيذ الإجراءات تلقائياً (تذكير الدفع، الشكاوى، الصيانة) كل أسبوع/شهر. ملخص أسبوعي مفصّل بالبريد كل اثنين الصبح.')}
              </p>
              <div className="mt-3 inline-block bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded font-bold">
                ⏰ Scheduled
              </div>
            </div>

            {/* Feature 4 — Stripe Auto-Renew */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:scale-[1.02] transition-all">
              <div className="text-4xl mb-3">🔁</div>
              <h3 className="text-xl font-bold mb-2">{t('hp_feat_stripe', 'تجديد تلقائي عبر Stripe')}</h3>
              <p className="text-sm text-violet-200 leading-relaxed">
                {t('hp_feat_stripe_desc', 'اشتراكك يجدد نفسه تلقائياً (شهري/سنوي) — لا تنشغل بمواعيد التجديد. خصم 17% للسنوي + إمكانية الإلغاء في أي وقت.')}
              </p>
              <div className="mt-3 inline-block bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded font-bold">
                💰 -17% سنوي
              </div>
            </div>

            {/* Feature 5 — Subscription Analytics */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:scale-[1.02] transition-all">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-xl font-bold mb-2">{t('hp_feat_analytics', 'تحليلات اشتراكات متقدمة')}</h3>
              <p className="text-sm text-violet-200 leading-relaxed">
                {t('hp_feat_analytics_desc', 'لوحة Owner لتتبع MRR + ARR + Churn Rate + Trial→Paid Conversion. مع قائمة الشركات اللي على وشك التجديد أو الإلغاء.')}
              </p>
              <div className="mt-3 inline-block bg-indigo-500/20 text-indigo-300 text-xs px-2 py-0.5 rounded font-bold">
                💎 Enterprise
              </div>
            </div>

            {/* Feature 6 — Auto Credentials */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:scale-[1.02] transition-all">
              <div className="text-4xl mb-3">📨</div>
              <h3 className="text-xl font-bold mb-2">{t('hp_feat_credentials', 'إرسال بيانات الدخول تلقائياً')}</h3>
              <p className="text-sm text-violet-200 leading-relaxed">
                {t('hp_feat_credentials_desc', 'كل ساكن جديد (فردي أو Bulk Import) يحصل على بريد ترحيب جميل بتفاصيل دخوله — بدون أي تدخل من الأدمن.')}
              </p>
              <div className="mt-3 inline-block bg-cyan-500/20 text-cyan-300 text-xs px-2 py-0.5 rounded font-bold">
                ✉️ Auto SMTP
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <a href="#pricing" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white font-bold rounded-xl shadow-2xl hover:scale-105 transition-all text-base">
              {t('hp_explore_plans', '🚀 استكشف الخطط')}
            </a>
          </div>
        </div>
      </section>

            <LiveDemoSection />

      {/* Comprehensive Guide */}
      <section className="py-16 bg-gradient-to-b from-slate-50 to-white" id="guide" data-testid="guide-section">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
              <BookOpenIcon className="h-4 w-4" />
              {t('hp_guide_btn')}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_guide_title')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">{t('hp_guide_desc')}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {guideItems.map((item) => {
              const Icon = item.icon;
              const isOpen = openGuide === item.id;
              const isAI = ['ai_chat', 'ai_advisor', 'ai_autopilot', 'auto_credentials', 'subscription_analytics', 'stripe_recurring', 'multilang'].includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => setOpenGuide(isOpen ? null : item.id)}
                  className={`rounded-xl p-4 text-center border transition-all hover:shadow-md relative ${
                    isOpen
                      ? (isAI ? 'border-violet-400 bg-violet-50 shadow-md ring-1 ring-violet-200' : 'border-blue-400 bg-blue-50 shadow-md ring-1 ring-blue-200')
                      : (isAI ? 'border-violet-200 bg-gradient-to-br from-violet-50/40 to-fuchsia-50/40 hover:border-violet-400' : 'border-gray-200 bg-white hover:border-blue-200')
                  }`}
                  data-testid={`guide-item-${item.id}`}
                >
                  {isAI && !isOpen && (
                    <span className="absolute top-1 left-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-[8px] font-black px-1 py-0.5 rounded">جديد</span>
                  )}
                  <div className={`mx-auto w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                    isOpen ? (isAI ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white' : 'bg-blue-600 text-white') : (isAI ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-600')
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className={`font-bold text-xs leading-tight ${isOpen ? (isAI ? 'text-violet-700' : 'text-blue-700') : 'text-gray-800'}`}>{item.title}</h3>
                </button>
              );
            })}
          </div>
          {openGuide && (() => {
            const selected = guideItems.find(g => g.id === openGuide);
            if (!selected) return null;
            const SelIcon = selected.icon;
            const isAI = ['ai_chat', 'ai_advisor', 'ai_autopilot', 'auto_credentials', 'subscription_analytics', 'stripe_recurring', 'multilang'].includes(selected.id);
            return (
              <div
                className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
                onClick={() => setOpenGuide(null)}
                data-testid="guide-modal-overlay"
                role="dialog"
                aria-modal="true"
              >
                <div
                  className={`relative max-w-lg w-full rounded-2xl shadow-2xl p-6 md:p-8 ${isAI ? 'bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 border-2 border-violet-300' : 'bg-white border-2 border-blue-300'}`}
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`guide-modal-${selected.id}`}
                >
                  {/* Close Button — top corner */}
                  <button
                    onClick={() => setOpenGuide(null)}
                    className="absolute top-3 left-3 w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 flex items-center justify-center transition-all shadow-sm"
                    aria-label="إغلاق"
                    data-testid="guide-modal-close"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>

                  {/* Header */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`text-white p-3.5 rounded-2xl flex-shrink-0 shadow-lg ${isAI ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}`}>
                      <SelIcon className="h-7 w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-black text-xl md:text-2xl leading-tight ${isAI ? 'text-violet-900' : 'text-blue-900'}`} style={{ fontFamily: "'Cairo', sans-serif" }}>
                        {selected.title}
                      </h3>
                      {isAI && (
                        <span className="inline-block mt-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-[10px] font-black px-2 py-0.5 rounded">
                          ✨ ميزة جديدة
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <p className="text-gray-700 text-base leading-loose">{selected.content}</p>

                  {/* Footer Action */}
                  <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                    <button
                      onClick={() => setOpenGuide(null)}
                      className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:shadow-lg ${isAI ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'}`}
                      data-testid="guide-modal-confirm-close"
                    >
                      فهمت ✓
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Ad Space 2 - Before Pricing (Homepage Mid) */}
      <div className="bg-slate-900 py-3 text-center">
        <div className="max-w-5xl mx-auto px-4">
          <InternalAdBanner position="homepage_mid" maxAds={1} variant="full" className="" />
        </div>
      </div>

      {/* ⭐ Customer Testimonials */}
      <CustomerTestimonialsCarousel />

            <FAQSection />

            <PricingSection
        billingPeriod={billingPeriod}
        setBillingPeriod={setBillingPeriod}
        currency={currency}
        setCurrency={setCurrency}
        isYearly={isYearly}
        priceOf={priceOf}
        yearlyOf={yearlyOf}
        savingsOf={savingsOf}
        sym={sym}
        residentialPlans={residentialPlans}
        companyPlans={companyPlans}
        comparisonFeatures={comparisonFeatures}
        companyComparisonFeatures={companyComparisonFeatures}
        paymentMethods={paymentMethods}
        subCode={subCode}
        setSubCode={setSubCode}
        codeStatus={codeStatus}
        codeLoading={codeLoading}
        handleCodeActivate={handleCodeActivate}
        handleSubscribe={handleSubscribe}
      />

            <RolesSection />

      {/* Referral Program */}
      <section className="py-16 bg-gradient-to-br from-emerald-50 to-teal-50" data-testid="referral-section">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold mb-6">
            <UserGroupIcon className="h-4 w-4" />
            {t('hp_referral_program')}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_referral_title')}</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">{t('hp_referral_desc')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-8">
            <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-sm">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserGroupIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{t('hp_share_link')}</h3>
              <p className="text-xs text-gray-500">{t('hp_share_link_desc')}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-sm">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircleIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{t('hp_they_register')}</h3>
              <p className="text-xs text-gray-500">{t('hp_they_register_desc')}</p>
            </div>
            <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-sm">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <SparklesIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{t('hp_free_month')}</h3>
              <p className="text-xs text-gray-500">{t('hp_free_month_desc')}</p>
            </div>
          </div>
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all">
            {t('hp_register_invite')}
            <ArrowRightIcon className="h-4 w-4 rotate-180" />
          </Link>
        </div>
      </section>

      {/* Ad Space 3 - Before CTA (Homepage Footer) */}
      <div className="bg-gray-50 py-3 text-center">
        <div className="max-w-5xl mx-auto px-4">
          <InternalAdBanner position="homepage_footer" maxAds={1} variant="full" className="" />
        </div>
      </div>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white" data-testid="cta-section">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_ready_title')}</h2>
          <p className="text-blue-100 mb-8 text-lg">{t('hp_ready_desc')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="px-10 py-4 bg-white text-blue-700 rounded-2xl font-bold text-lg hover:shadow-2xl transition-all" data-testid="cta-register">
              {t('hp_create_free')}
            </Link>
            <Link to="/login" className="px-10 py-4 border-2 border-white/40 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all" data-testid="cta-login">
              {t('sign_in', 'تسجيل الدخول')}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-10" data-testid="footer">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <img
                src="https://customer-assets.emergentagent.com/job_homeme-subscriptions/artifacts/6yk66f7n_WhatsApp%20Image%202022-01-17%20at%2010.23.44%20AM.637bf42d664818.47361218.jpeg"
                alt="HomeMe" className="h-10 w-auto rounded-lg"
              />
              <span className="font-bold text-white">HomeMe</span>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#guide" className="hover:text-white transition-colors">{t('hp_guide_btn')}</a>
              <a href="#pricing" className="hover:text-white transition-colors">{t('hp_sub_codes')}</a>
              <a href="#systems" className="hover:text-white transition-colors" data-testid="footer-systems-link">{t('hp_systems_title_footer', `${systems.length} نظام متكامل`).replace('{count}', systems.length)}</a>
              <a href="#ai-features" className="hover:text-white transition-colors">✨ {t('hp_whats_new', 'ما الجديد')}</a>
              <a href="#testimonials" className="hover:text-white transition-colors">⭐ شهادات</a>
              <a href="#faq" className="hover:text-white transition-colors">❓ {t('hp_faq', 'الأسئلة الشائعة')}</a>
              <Link to="/login" className="hover:text-white transition-colors">{t('sign_in', 'تسجيل الدخول')}</Link>
            </div>
            <p className="text-xs">&copy; {new Date().getFullYear()} HomeMe - {t('hp_all_rights', 'جميع الحقوق محفوظة')}</p>
          </div>

          {/* Legal Links Row */}
          <div className="mt-6 pt-4 border-t border-gray-800 flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs">
            <Link to="/blog" className="hover:text-white transition-colors font-semibold" data-testid="footer-blog-link">المدوّنة</Link>
            <span className="opacity-50">·</span>
            <Link to="/faq" className="hover:text-white transition-colors font-semibold" data-testid="footer-faq-link">الأسئلة الشائعة</Link>
            <span className="opacity-50">·</span>
            <Link to="/legal/about" className="hover:text-white transition-colors" data-testid="footer-legal-about">من نحن</Link>
            <span className="opacity-50">·</span>
            <Link to="/legal/privacy" className="hover:text-white transition-colors" data-testid="footer-legal-privacy">سياسة الخصوصية</Link>
            <span className="opacity-50">·</span>
            <Link to="/legal/terms" className="hover:text-white transition-colors" data-testid="footer-legal-terms">شروط الاستخدام</Link>
            <span className="opacity-50">·</span>
            <Link to="/legal/contact" className="hover:text-white transition-colors" data-testid="footer-legal-contact">اتصل بنا</Link>
            <Link to="/advertiser-register" className="hover:text-emerald-300 transition-colors font-bold text-emerald-400" data-testid="footer-advertise-link">
              📢 أعلن في HomeMe
            </Link>
            <span className="opacity-50">·</span>
            <span className="text-gray-500">Powered by Data Life AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
