import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import useSEO from '../hooks/useSEO';
import CustomerTestimonialsCarousel from './CustomerTestimonialsCarousel';
import {
  CheckIcon, 
  XMarkIcon,
  SparklesIcon,
  TrophyIcon,
  BuildingOfficeIcon,
  GiftIcon,
  UserGroupIcon,
  ClockIcon,
  TagIcon,
  UserIcon,
  PlusIcon,
  ArrowLeftIcon,
  TicketIcon
} from '@heroicons/react/24/outline';

const API = process.env.REACT_APP_BACKEND_URL;

const Pricing = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // 🔍 SEO — pricing page targets high-intent users searching for plans/cost
  useSEO({
    title: 'الخطط والأسعار — HomeMe | إدارة كمبوند بسعر يناسبك',
    description:
      'خطط HomeMe لإدارة المجمعات السكنية: مجاني (0 ج.م)، أساسي (1,200 ج.م)، احترافي (2,200 ج.م)، متقدم (4,000 ج.م)، وخطط شركات الإدارة. خصم 20% على الدفع السنوي. تجربة مجانية 14 يوماً.',
    canonical: 'https://homemeapp.net/pricing',
    keywords:
      'أسعار إدارة كمبوند, تكلفة نظام كمبوند, خطط كمبوند, اشتراك كمبوند, pricing compound, HomeMe pricing, خصم سنوي',
    og: {
      title: 'الخطط والأسعار — HomeMe',
      description: 'اختر خطة إدارة المجمع السكني المناسبة لك بدءاً من 0 ج.م — مع خصم 20% على الدفع السنوي.',
      type: 'website',
      url: 'https://homemeapp.net/pricing',
      image: 'https://homemeapp.net/og-cover.png',
      locale: 'ar_EG',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'الخطط والأسعار — HomeMe',
      description: 'خطط مرنة من مجاني لـ Enterprise. خصم 20% سنوي.',
      image: 'https://homemeapp.net/og-cover.png',
    },
  });
  const [segment, setSegment] = useState('compound'); // 'compound' | 'gov'
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [currency, setCurrency] = useState(() => {
    // Default to EGP for Arabic/Egyptian users, USD for others
    try {
      const saved = localStorage.getItem('pricing_currency');
      if (saved) return saved;
      const lang = navigator.language || '';
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (lang.startsWith('ar') || tz.includes('Cairo') || tz.includes('Africa')) return 'EGP';
    } catch(e) {}
    return 'USD';
  });
  const [showDiscountCode, setShowDiscountCode] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  
  // Subscription Code states
  const [showSubscriptionCode, setShowSubscriptionCode] = useState(false);
  const [subscriptionCode, setSubscriptionCode] = useState('');
  const [verifiedCode, setVerifiedCode] = useState(null);
  const [verifyingCode, setVerifyingCode] = useState(false);

  // Save currency preference
  React.useEffect(() => {
    try { localStorage.setItem('pricing_currency', currency); } catch(e) {}
  }, [currency]);

  // EGP prices (authoritative) — USD = EGP / 50
  const EGP_PRICES = {
    community:      { monthly: 0,     yearly: 0 },
    essential:      { monthly: 1200,  yearly: 12960 },   // save 2,880
    professional:   { monthly: 2200,  yearly: 23760 },   // save 5,280
    enterprise:     { monthly: 4000,  yearly: 43200 },   // save 9,600
    multi_compound: { monthly: 5500,  yearly: 59400 },   // save 13,200
  };
  const EGP_TO_USD = 30; // 1 USD = 50 EGP

  const getEGP = (planId, period) => EGP_PRICES[planId]?.[period] ?? 0;
  const getUSD = (planId, period) => Math.round(getEGP(planId, period) / EGP_TO_USD);

  const formatPrice = (planId, period) => {
    if (currency === 'EGP') {
      const p = getEGP(planId, period);
      if (p === 0) return 'مجاناً';
      return `${p.toLocaleString('ar-EG')} ج.م`;
    } else {
      const p = getUSD(planId, period);
      if (p === 0) return 'Free';
      return `$${p}`;
    }
  };

  // Legacy formatPrice for backward compat (takes EGP value directly)
  const formatPriceVal = (egpVal) => {
    if (currency === 'EGP') {
      if (egpVal === 0) return 'مجاناً';
      return `${egpVal.toLocaleString('ar-EG')} ج.م`;
    } else {
      const usd = Math.round(egpVal / EGP_TO_USD);
      if (usd === 0) return 'Free';
      return `$${usd}`;
    }
  };

  // Get discounted price (10% off for yearly)
  const getDiscountedPrice = (price) => {
    return billingPeriod === 'yearly' ? Math.round(price * 0.9) : price;
  };

  // Get yearly total
  const getYearlyTotal = (monthlyPrice) => {
    const discountedMonthly = getDiscountedPrice(monthlyPrice);
    return discountedMonthly * 12;
  };

  // Get original yearly total (before discount)
  const getOriginalYearlyTotal = (monthlyPrice) => {
    return monthlyPrice * 12;
  };

  // Get savings amount
  const getSavings = (monthlyPrice) => {
    return getOriginalYearlyTotal(monthlyPrice) - getYearlyTotal(monthlyPrice);
  };

  const plans = [
    // ─── 1. FREE ────────────────────────────────────────────
    {
      id: 'community',
      name: 'مجاني',
      nameEn: 'Starter',
      subtitle: 'للتجربة والمجتمعات الصغيرة',
      price: { monthly: 0, yearly: 0 },
      originalPrice: null,
      icon: UserGroupIcon,
      gradient: 'from-gray-500 to-gray-700',
      color: 'gray',
      popular: false,
      badge: null,
      features: [
        { cat: '👥 السكان', items: [
          { text: 'حتى 30 ساكن', ok: true },
          { text: 'ملف السكان الأساسي', ok: true },
          { text: 'إرسال بيانات الدخول', ok: true },
          { text: 'استيراد CSV', ok: false },
          { text: 'إدارة العائلة والصور', ok: false },
        ]},
        { cat: '💰 المالية', items: [
          { text: 'تقرير شهري واحد', ok: true },
          { text: 'الفواتير الأساسية', ok: true },
          { text: 'النظام المالي الكامل', ok: false },
          { text: 'تصدير Excel/PDF', ok: false },
          { text: 'نظام الأقساط', ok: false },
        ]},
        { cat: '🔧 الخدمات', items: [
          { text: 'طلبات الصيانة', ok: true },
          { text: 'إشعارات محدودة', ok: true },
          { text: 'حجز المرافق', ok: false },
          { text: 'دليل العمال', ok: false },
        ]},
        { cat: '🛡️ الأمن', items: [
          { text: 'بوابة الساكن', ok: true },
          { text: 'دعوة الزوار + QR', ok: false },
          { text: 'تتبع الأشخاص', ok: false },
        ]},
        { cat: '✨ الذكاء الاصطناعي', items: [
          { text: 'مساعد AI', ok: false },
          { text: 'مستشار AI استباقي', ok: false },
        ]},
        { cat: '📢 التسويق', items: [
          { text: 'إعلانات الوحدات', ok: false },
          { text: 'مساحات إعلانية', ok: false },
        ]},
        { cat: '💬 الدعم', items: [
          { text: 'دعم بالبريد الإلكتروني', ok: true },
          { text: 'شات دعم مباشر', ok: false },
        ]},
      ],
    },

    // ─── 2. BASIC ────────────────────────────────────────────
    {
      id: 'essential',
      name: 'أساسي',
      nameEn: 'Basic',
      subtitle: 'رائع للمجتمعات النامية',
      price: { monthly: 1200, yearly: 12960 },
      originalPrice: { monthly: 1200, yearly: 14400 },
      icon: SparklesIcon,
      gradient: 'from-sky-500 to-blue-600',
      color: 'blue',
      popular: false,
      badge: null,
      savingsYearly: 2880,
      features: [
        { cat: '👥 السكان', items: [
          { text: 'حتى 100 ساكن', ok: true },
          { text: 'ملف السكان الكامل', ok: true },
          { text: 'إرسال بيانات الدخول تلقائياً', ok: true },
          { text: 'استيراد CSV بالجملة', ok: true },
          { text: 'إدارة العائلة والصور', ok: true },
        ]},
        { cat: '💰 المالية', items: [
          { text: 'النظام المالي الكامل', ok: true },
          { text: 'توزيع المصروفات (4 طرق)', ok: true },
          { text: 'تصدير Excel و PDF', ok: true },
          { text: 'إدارة العقود والمزودين', ok: true },
          { text: 'تأكيد إيصالات الدفع', ok: true },
          { text: 'نظام الأقساط', ok: false },
          { text: 'تقارير PDF متقدمة', ok: false },
        ]},
        { cat: '🔧 الخدمات', items: [
          { text: 'طلبات الصيانة الكاملة', ok: true },
          { text: 'تقييمات الرضا والخدمات', ok: true },
          { text: 'حجز المرافق', ok: true },
          { text: 'دليل العمال والصنايعية', ok: false },
        ]},
        { cat: '🛡️ الأمن', items: [
          { text: 'بوابة الساكن الكاملة', ok: true },
          { text: 'دعوة الزوار + QR Code', ok: false },
          { text: 'تتبع الأشخاص والسيارات', ok: false },
        ]},
        { cat: '✨ الذكاء الاصطناعي', items: [
          { text: '✨ مساعد AI — 5 رسائل/يوم', ok: true },
          { text: '🧠 مستشار AI استباقي', ok: false },
          { text: '🤖 AI Auto-Pilot', ok: false },
        ]},
        { cat: '📢 التسويق', items: [
          { text: 'إشعارات البريد الإلكتروني', ok: true },
          { text: 'إعلانات الوحدات (بيع/إيجار)', ok: false },
          { text: 'مساحات إعلانية في الكمبوند', ok: false },
        ]},
        { cat: '💬 الدعم', items: [
          { text: 'دعم فني بالبريد', ok: true },
          { text: 'شات دعم مباشر', ok: false },
        ]},
      ],
    },

    // ─── 3. PRO ──────────────────────────────────────────────
    {
      id: 'professional',
      name: 'احترافي',
      nameEn: 'Pro',
      subtitle: 'الأكثر طلباً للمجمعات النامية',
      price: { monthly: 2200, yearly: 23760 },
      originalPrice: { monthly: 2200, yearly: 26400 },
      icon: TrophyIcon,
      gradient: 'from-blue-600 to-indigo-700',
      color: 'indigo',
      popular: true,
      badge: '⭐ الأكثر طلباً',
      savingsYearly: 5280,
      features: [
        { cat: '👥 السكان', items: [
          { text: 'عدد غير محدود من السكان', ok: true },
          { text: 'ملف السكان الكامل', ok: true },
          { text: 'إرسال بيانات الدخول تلقائياً', ok: true },
          { text: 'استيراد CSV بالجملة', ok: true },
          { text: 'إدارة العائلة والصور', ok: true },
          { text: 'إدارة المساعدين والمساكن', ok: true },
        ]},
        { cat: '💰 المالية', items: [
          { text: 'النظام المالي الكامل', ok: true },
          { text: 'توزيع المصروفات (4 طرق)', ok: true },
          { text: 'تصدير Excel و PDF', ok: true },
          { text: 'نظام الأقساط المتقدم', ok: true },
          { text: 'تأكيد إيصالات الدفع', ok: true },
          { text: 'تقارير PDF تنفيذية', ok: true },
          { text: 'إدارة العقود والمزودين', ok: true },
        ]},
        { cat: '🔧 الخدمات', items: [
          { text: 'طلبات الصيانة المتقدمة', ok: true },
          { text: 'دليل العمال والصنايعية', ok: true },
          { text: 'حجز المرافق والخدمات', ok: true },
          { text: 'تقييمات الرضا المتقدمة', ok: true },
          { text: 'الشكاوى والاقتراحات', ok: true },
        ]},
        { cat: '🛡️ الأمن', items: [
          { text: 'إدارة الزوار + QR Code', ok: true },
          { text: 'تتبع الأشخاص والسيارات', ok: true },
          { text: 'البلاغات الأمنية', ok: true },
          { text: 'تتبع مركبات الأمن', ok: true },
        ]},
        { cat: '📢 التواصل والتسويق', items: [
          { text: 'إعلانات وفعاليات وأحداث', ok: true },
          { text: 'استطلاعات الرأي', ok: true },
          { text: 'إعلانات الوحدات (بيع/إيجار)', ok: true },
          { text: 'مساحات إعلانية في الكمبوند', ok: true },
          { text: 'تقارير يومية بالبريد', ok: true },
          { text: 'برنامج الإحالة', ok: true },
        ]},
        { cat: '✨ الذكاء الاصطناعي', items: [
          { text: '✨ مساعد AI — 20 رسالة/يوم', ok: true },
          { text: '🧠 مستشار AI استباقي', ok: true },
          { text: '🤖 AI Auto-Pilot', ok: false },
          { text: 'تحليلات متقدمة + رسوم بيانية', ok: true },
        ]},
        { cat: '💬 الدعم', items: [
          { text: 'شات دعم مباشر', ok: true },
          { text: 'صندوق رسائل الأدمن', ok: true },
          { text: 'دعم فني أولوية', ok: true },
        ]},
      ],
    },

    // ─── 4. PREMIUM ──────────────────────────────────────────
    {
      id: 'enterprise',
      name: 'متقدم',
      nameEn: 'Premium',
      subtitle: 'كل شيء بلا حدود',
      price: { monthly: 4000, yearly: 43200 },
      originalPrice: { monthly: 4000, yearly: 48000 },
      icon: BuildingOfficeIcon,
      gradient: 'from-violet-600 to-purple-700',
      color: 'purple',
      popular: false,
      badge: '💎 الأفضل',
      savingsYearly: 9600,
      features: [
        { cat: '👥 السكان', items: [
          { text: 'عدد غير محدود من السكان', ok: true },
          { text: 'كل مميزات الاحترافي', ok: true },
          { text: 'تقارير السكان المخصصة', ok: true },
        ]},
        { cat: '💰 المالية', items: [
          { text: 'كل المميزات المالية', ok: true },
          { text: 'API تكامل مع أنظمة محاسبية', ok: true },
          { text: 'تقارير مخصصة متقدمة', ok: true },
          { text: 'تحليلات MRR + ARR', ok: true },
        ]},
        { cat: '🔧 الخدمات', items: [
          { text: 'كل مميزات الخدمات', ok: true },
          { text: 'الأجهزة الذكية والأتمتة', ok: true, badge: 'قريباً' },
        ]},
        { cat: '🛡️ الأمن', items: [
          { text: 'كل مميزات الأمن', ok: true },
          { text: 'لوحة الأمان المتقدمة', ok: true },
          { text: 'Forensic logs كاملة', ok: true },
        ]},
        { cat: '📢 التسويق', items: [
          { text: 'كل مميزات التسويق', ok: true },
          { text: 'API إعلانات مخصص', ok: true },
          { text: 'White Label (علامتك التجارية)', ok: true },
        ]},
        { cat: '✨ الذكاء الاصطناعي', items: [
          { text: '✨ مساعد AI — 50 رسالة/يوم', ok: true },
          { text: '🧠 مستشار AI استباقي', ok: true },
          { text: '🤖 AI Auto-Pilot كامل', ok: true },
          { text: 'تقارير AI أسبوعية تلقائية', ok: true },
        ]},
        { cat: '💬 الدعم', items: [
          { text: 'دعم مخصص 24/7', ok: true },
          { text: 'مدير حساب مخصص', ok: true },
          { text: 'تدريب الفريق', ok: true },
          { text: 'SLA مضمون', ok: true },
        ]},
      ],
    },

    // ─── 5. COMPANY STARTUP ──────────────────────────────────
    {
      id: 'multi_compound',
      name: 'شركة ناشئة',
      nameEn: 'Startup',
      subtitle: 'لشركات تدير حتى 3 مجتمعات',
      price: { monthly: 5500, yearly: 59400 },
      originalPrice: { monthly: 5500, yearly: 66000 },
      icon: BuildingOfficeIcon,
      gradient: 'from-amber-500 to-orange-600',
      color: 'amber',
      popular: false,
      badge: '🏢 للشركات',
      savingsYearly: 13200,
      isCompany: true,
      features: [
        { cat: '🏢 إدارة الشركة', items: [
          { text: 'إدارة حتى 3 مجتمعات سكنية', ok: true },
          { text: 'لوحة تحكم موحدة', ok: true },
          { text: 'عدد غير محدود من السكان', ok: true },
          { text: 'كل مميزات الاحترافي لكل مجتمع', ok: true },
          { text: 'مقارنة أداء المجتمعات', ok: false },
          { text: 'إدارة فرق متعددة', ok: false },
        ]},
        { cat: '💰 المالية', items: [
          { text: 'النظام المالي الكامل', ok: true },
          { text: 'تقارير موحدة لكل المجتمعات', ok: true },
          { text: 'تصدير Excel و PDF', ok: true },
          { text: 'تحليلات MRR / Churn', ok: false },
        ]},
        { cat: '✨ الذكاء الاصطناعي', items: [
          { text: '✨ مساعد AI — 20 رسالة/يوم/مستخدم', ok: true },
          { text: '🧠 مستشار AI استباقي', ok: true },
          { text: '🤖 AI Auto-Pilot', ok: false },
        ]},
        { cat: '💬 الدعم', items: [
          { text: 'شات دعم مباشر', ok: true },
          { text: 'دعم فني بالبريد والواتساب', ok: true },
          { text: 'مدير حساب مخصص', ok: false },
        ]},
      ],
    },
  ];

    // ─── 6. COMPANY MID ──────────────────────────────────────
    {
      id: 'company_mid',
      name: 'شركة متوسطة',
      nameEn: 'Business',
      subtitle: 'لشركات تدير 1-8 مجتمعات',
      price: { monthly: 13000, yearly: 140400 },
      originalPrice: { monthly: 13000, yearly: 156000 },
      icon: BuildingOfficeIcon,
      gradient: 'from-indigo-600 to-blue-700',
      color: 'indigo',
      popular: false,
      badge: '🏢 الأفضل للشركات',
      savingsYearly: 31200,
      isCompany: true,
      features: [
        { cat: '🏢 إدارة الشركة', items: [
          { text: 'إدارة 1-8 مجتمعات سكنية', ok: true },
          { text: 'لوحة تحكم موحدة متقدمة', ok: true },
          { text: 'مقارنة أداء المجتمعات', ok: true },
          { text: 'إدارة فرق متعددة', ok: true },
          { text: 'عدد غير محدود من السكان', ok: true },
        ]},
        { cat: '💰 المالية', items: [
          { text: 'تقارير موحدة لكل المجتمعات', ok: true },
          { text: 'تحليلات MRR / Churn', ok: true },
          { text: 'تصدير Excel و PDF', ok: true },
          { text: 'API تكامل محاسبي', ok: true },
        ]},
        { cat: '✨ الذكاء الاصطناعي', items: [
          { text: '✨ مساعد AI — 50 رسالة/يوم', ok: true },
          { text: '🧠 مستشار AI استباقي', ok: true },
          { text: '🤖 AI Auto-Pilot', ok: true },
        ]},
        { cat: '💬 الدعم', items: [
          { text: 'مدير حساب مخصص', ok: true },
          { text: 'دعم فني أولوية 24/7', ok: true },
        ]},
      ],
    },

    // ─── 7. COMPANY LARGE ─────────────────────────────────────
    {
      id: 'company_large',
      name: 'شركة كبرى',
      nameEn: 'Enterprise',
      subtitle: 'غير محدود — للمجموعات الكبرى',
      price: { monthly: 35000, yearly: 378000 },
      originalPrice: { monthly: 35000, yearly: 420000 },
      icon: BuildingOfficeIcon,
      gradient: 'from-rose-600 to-pink-700',
      color: 'rose',
      popular: false,
      badge: '🏛️ Enterprise',
      savingsYearly: 84000,
      isCompany: true,
      features: [
        { cat: '🏢 إدارة الشركة', items: [
          { text: 'عدد غير محدود من المجتمعات', ok: true },
          { text: 'White Label — علامتك التجارية', ok: true },
          { text: 'API مخصص للتكامل', ok: true },
          { text: 'SLA مضمون', ok: true },
        ]},
        { cat: '✨ الذكاء الاصطناعي', items: [
          { text: 'AI غير محدود لكل المستخدمين', ok: true },
          { text: '🤖 AI Auto-Pilot كامل', ok: true },
          { text: 'تقارير AI أسبوعية تلقائية', ok: true },
        ]},
        { cat: '💬 الدعم', items: [
          { text: 'مدير حساب مخصص 24/7', ok: true },
          { text: 'تدريب الفريق', ok: true },
          { text: 'Dedicated server option', ok: true },
        ]},
      ],
    },
  ];

  // ── Government / Municipal Plans (منفصلة) ─────────────────────
  const govPlans = [
    {
      id: 'gov_district',
      name: 'حي / منطقة',
      nameEn: 'District',
      subtitle: 'لإدارة الأحياء والمناطق السكنية',
      price: { monthly: 8000, yearly: 86400 },
      gradient: 'from-teal-600 to-cyan-700',
      color: 'teal',
      popular: false,
      badge: '🏘️ حي',
      savingsYearly: 9600,
      features: [
        { cat: '🏘️ نطاق التغطية', items: [
          { text: 'إدارة حي واحد كامل', ok: true },
          { text: 'حتى 50 كمبوند / عمارة', ok: true },
          { text: 'عدد غير محدود من الوحدات', ok: true },
          { text: 'خريطة الحي التفاعلية', ok: true },
        ]},
        { cat: '💰 المالية', items: [
          { text: 'تقارير مالية موحدة للحي', ok: true },
          { text: 'تحصيل الرسوم والخدمات', ok: true },
          { text: 'ربط مع الجهات الحكومية', ok: false },
        ]},
        { cat: '🔧 الخدمات', items: [
          { text: 'طلبات الصيانة المجمعة', ok: true },
          { text: 'إدارة شكاوى السكان', ok: true },
          { text: 'جدول الخدمات البلدية', ok: true },
        ]},
        { cat: '✨ الذكاء الاصطناعي', items: [
          { text: 'تقارير AI شهرية للحي', ok: true },
          { text: 'مساعد AI — 30 رسالة/يوم', ok: true },
        ]},
        { cat: '💬 الدعم', items: [
          { text: 'دعم فني مخصص', ok: true },
          { text: 'تدريب الفريق البلدي', ok: true },
        ]},
      ],
    },
    {
      id: 'gov_markaz',
      name: 'مركز / قضاء',
      nameEn: 'Municipality',
      subtitle: 'لمراكز المدن والأقضية',
      price: { monthly: 18000, yearly: 194400 },
      gradient: 'from-blue-700 to-indigo-800',
      color: 'blue',
      popular: true,
      badge: '🏛️ الأكثر طلباً',
      savingsYearly: 21600,
      features: [
        { cat: '🏛️ نطاق التغطية', items: [
          { text: 'إدارة مركز / قضاء كامل', ok: true },
          { text: 'عدد غير محدود من الأحياء', ok: true },
          { text: 'عدد غير محدود من الوحدات', ok: true },
          { text: 'خريطة تفاعلية متقدمة', ok: true },
        ]},
        { cat: '💰 المالية', items: [
          { text: 'تقارير مالية شاملة', ok: true },
          { text: 'ربط مع الجهات الحكومية', ok: true },
          { text: 'تحليلات الإيرادات البلدية', ok: true },
          { text: 'API تكامل حكومي', ok: true },
        ]},
        { cat: '🔧 الخدمات', items: [
          { text: 'إدارة الخدمات البلدية كاملة', ok: true },
          { text: 'شكاوى ومقترحات المواطنين', ok: true },
          { text: 'جداول جمع القمامة والصيانة', ok: true },
        ]},
        { cat: '✨ الذكاء الاصطناعي', items: [
          { text: 'تقارير AI أسبوعية', ok: true },
          { text: 'مساعد AI — 100 رسالة/يوم', ok: true },
          { text: 'تحليل رضا المواطنين AI', ok: true },
        ]},
        { cat: '💬 الدعم', items: [
          { text: 'مدير حساب حكومي مخصص', ok: true },
          { text: 'تدريب وتأهيل الموظفين', ok: true },
          { text: 'SLA حكومي مضمون', ok: true },
        ]},
      ],
    },
    {
      id: 'gov_city',
      name: 'محافظة / مدينة',
      nameEn: 'Governorate',
      subtitle: 'للمحافظات والمدن الكبرى',
      price: { monthly: 45000, yearly: 486000 },
      gradient: 'from-emerald-700 to-teal-800',
      color: 'emerald',
      popular: false,
      badge: '🏙️ Enterprise حكومي',
      savingsYearly: 54000,
      features: [
        { cat: '🏙️ نطاق التغطية', items: [
          { text: 'إدارة محافظة / مدينة كاملة', ok: true },
          { text: 'عدد غير محدود من المراكز', ok: true },
          { text: 'عدد غير محدود من الأحياء', ok: true },
          { text: 'GIS متقدم + خريطة ذكية', ok: true },
        ]},
        { cat: '💰 المالية والتكامل', items: [
          { text: 'تكامل مالي حكومي كامل', ok: true },
          { text: 'API لأنظمة الحكومة الإلكترونية', ok: true },
          { text: 'لوحة مؤشرات المحافظة', ok: true },
          { text: 'تقارير مقدمة لمجلس المدينة', ok: true },
        ]},
        { cat: '✨ الذكاء الاصطناعي', items: [
          { text: 'AI غير محدود لكل الأقسام', ok: true },
          { text: 'تحليلات بيانات السكان', ok: true },
          { text: 'خطط تنمية ذكية بالـ AI', ok: true },
        ]},
        { cat: '🔒 الأمان والامتثال', items: [
          { text: 'Dedicated server مخصص', ok: true },
          { text: 'تشفير حكومي متقدم', ok: true },
          { text: 'Audit logs كاملة', ok: true },
          { text: 'SLA 99.9% مضمون', ok: true },
        ]},
        { cat: '💬 الدعم', items: [
          { text: 'فريق دعم حكومي 24/7', ok: true },
          { text: 'تدريب شامل للموظفين', ok: true },
          { text: 'زيارات ميدانية للتدريب', ok: true },
        ]},
      ],
    },
  ];

  const discountOffers = [

    {
      code: 'WELCOME40',
      title: '🎉 Seasonal Welcome',
      description: '40% off first 3 months',
      discount: 40,
      type: 'seasonal'
    },
    {
      code: 'BULK20',
      title: '👥 Bulk Discount',
      description: '20% off for 3+ compounds',
      discount: 20,
      type: 'bulk'
    },
    {
      code: 'STUDENT50',
      title: '🎓 Student/Nonprofit',
      description: '50% permanent discount',
      discount: 50,
      type: 'permanent'
    },
    {
      code: 'ANNUAL',
      title: '🔄 Annual Savings',
      description: '2 months free on yearly plans',
      discount: 17,
      type: 'annual'
    }
  ];

  const applyDiscountCode = () => {
    const discount = discountOffers.find(d => d.code === discountCode.toUpperCase());
    if (discount) {
      setAppliedDiscount(discount);
      toast.success(`${discount.title} applied! ${discount.description}`);
    } else {
      toast.error('Invalid discount code');
    }
  };
  
  // Verify subscription code
  const verifySubscriptionCode = async () => {
    if (!subscriptionCode.trim()) {
      toast.error(t('please_enter_subscription_code'));
      return;
    }
    
    setVerifyingCode(true);
    try {
      const response = await axios.get(`${API}/api/subscription-codes/check/${subscriptionCode.trim().toUpperCase()}`);
      
      if (response.data.valid) {
        setVerifiedCode(response.data);
        toast.success(t('subscription_code_valid'));
      } else {
        toast.error(t(response.data.error || 'invalid_subscription_code'));
        setVerifiedCode(null);
      }
    } catch (error) {
      console.error('Error verifying subscription code:', error);
      toast.error(t('failed_to_verify_code'));
      setVerifiedCode(null);
    } finally {
      setVerifyingCode(false);
    }
  };

  const calculatePrice = (plan) => {
    const basePrice = plan.price[billingPeriod];
    if (appliedDiscount && plan.id !== 'community') {
      return Math.round(basePrice * (1 - appliedDiscount.discount / 100));
    }
    return basePrice;
  };

  const handleSelectPlan = async (planId) => {
    if (planId === 'community') {
      toast.success('Community plan activated! Enjoy your free access.');
      return;
    }
    
    // Navigate to payment or subscription management
    toast.info('Redirecting to secure payment...');
    // Implementation for payment integration would go here
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2 rtl:rotate-180" />
              <span>{t('back_to_menu')}</span>
            </button>
          </div>

          {/* Segment Switcher */}
          <div className="flex justify-center mb-10">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-1.5 shadow-lg border border-gray-200 dark:border-gray-700 flex gap-1">
              <button
                onClick={() => setSegment('compound')}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition-all ${
                  segment === 'compound'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-lg">🏠</span>
                <div className="text-start">
                  <p className="font-black leading-tight">كمبوندات وعمارات</p>
                  <p className={`text-[10px] font-normal leading-tight ${segment === 'compound' ? 'text-white/80' : 'text-gray-400'}`}>للمجمعات السكنية الخاصة</p>
                </div>
              </button>
              <button
                onClick={() => setSegment('gov')}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black transition-all ${
                  segment === 'gov'
                    ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-lg">🏛️</span>
                <div className="text-start">
                  <p className="font-black leading-tight">محافظات ومحليات</p>
                  <p className={`text-[10px] font-normal leading-tight ${segment === 'gov' ? 'text-white/80' : 'text-gray-400'}`}>للجهات الحكومية والبلديات</p>
                </div>
              </button>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-12">
          {/* HomeMe Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="/homeme-logo.png" 
              alt="HomeMe Logo" 
              className="h-24 w-auto"
            />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            {segment === 'gov' ? '🏛️ خطط المحافظات والمحليات' : t('choose_your_account_type')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto text-center">
            {segment === 'gov'
              ? 'حلول متكاملة للجهات الحكومية والبلديات — من الحي حتى المحافظة'
              : t('select_plan_best_fits')}
          </p>
          
          {/* Currency and Billing Toggle */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Currency Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => { setCurrency('USD'); }}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  currency === 'USD' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🇺🇸 USD ($)
              </button>
              <button
                onClick={() => { setCurrency('EGP'); }}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  currency === 'EGP' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🇪🇬 جنيه مصري
              </button>
            </div>

            {/* Billing Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('monthly', 'شهرياً')}
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  billingPeriod === 'yearly'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('yearly')}
                <span className="ml-1 bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs">
                  {t('save_10')}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Discount Section */}
        <div className="mb-8 text-center">
          <button
            onClick={() => setShowDiscountCode(!showDiscountCode)}
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            <GiftIcon className="h-5 w-5" />
            <span>{t('have_discount_code')}</span>
          </button>
          
          {showDiscountCode && (
            <div className="mt-4 max-w-md mx-auto">
              <div className="flex rounded-lg shadow-sm">
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  placeholder={t('enter_discount_code')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={applyDiscountCode}
                  className="px-6 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 font-medium"
                >
                  {t('apply')}
                </button>
              </div>
              
              {/* Discount Offers */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {discountOffers.map((offer, index) => (
                  <button
                    key={index}
                    onClick={() => setDiscountCode(offer.code)}
                    className="p-2 bg-gray-50 hover:bg-gray-100 rounded border text-left"
                  >
                    <div className="font-medium text-gray-900">{offer.title}</div>
                    <div className="text-gray-600 text-xs">{offer.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {appliedDiscount && (
            <div className="mt-4 inline-flex items-center space-x-2 bg-green-50 text-green-800 px-4 py-2 rounded-lg">
              <CheckIcon className="h-5 w-5" />
              <span>{appliedDiscount.title} - {appliedDiscount.description}</span>
            </div>
          )}
        </div>

        {/* Subscription Code Section */}
        <div className="mb-8 text-center">
          <button
            onClick={() => setShowSubscriptionCode(!showSubscriptionCode)}
            className="inline-flex items-center space-x-2 text-purple-600 hover:text-purple-800 font-medium"
          >
            <TicketIcon className="h-5 w-5" />
            <span>{t('have_subscription_code')}</span>
          </button>
          
          {showSubscriptionCode && (
            <div className="mt-4 max-w-md mx-auto">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-purple-800">
                  {t('subscription_code_pricing_hint')}
                </p>
              </div>
              
              <div className="flex rounded-lg shadow-sm">
                <input
                  type="text"
                  value={subscriptionCode}
                  onChange={(e) => setSubscriptionCode(e.target.value.toUpperCase())}
                  placeholder={t('enter_subscription_code_placeholder')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 uppercase"
                  maxLength={14}
                />
                <button
                  onClick={verifySubscriptionCode}
                  disabled={verifyingCode}
                  className="px-6 py-2 bg-purple-600 text-white rounded-r-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifyingCode ? t('verifying') : t('verify')}
                </button>
              </div>
            </div>
          )}
          
          {verifiedCode && (
            <div className="mt-4 inline-flex flex-col items-center space-y-2 bg-purple-50 text-purple-800 px-6 py-3 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-2">
                <CheckIcon className="h-5 w-5" />
                <span className="font-semibold">{t('valid_subscription_code')}</span>
              </div>
              <div className="text-sm">
                {t('duration')}: {verifiedCode.duration_months} {t('months')}
              </div>
              <div className="text-xs text-purple-600">
                {t('code_will_be_applied_at_registration')}
              </div>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const IconComponent = plan.icon;
            const currentPrice = calculatePrice(plan);
            const originalPrice = plan.price[billingPeriod];
            
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
                  plan.popular ? 'border-blue-500 scale-105' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      {t('most_popular')}
                    </div>
                  </div>
                )}
                
                <div className="p-8">
                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${plan.gradient} flex items-center justify-center`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 text-center">{plan.name}</h3>
                    <p className="text-gray-600 mt-1">{plan.subtitle}</p>
                  </div>
                  
                  {/* Pricing */}
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center mb-2">
                      <span className="text-4xl font-bold text-gray-900">
                        {formatPriceVal(currentPrice)}
                      </span>
                      {plan.id !== 'community' && !plan.perPerson && (
                        <span className="text-gray-600 ml-2">
                          /{billingPeriod === 'monthly' ? t('month', 'شهر') : t('year', 'سنة')}
                        </span>
                      )}
                      {plan.perPerson && (
                        <span className="text-gray-600 ml-2">
                          /{t('person_month', 'شخص/شهر')}
                        </span>
                      )}
                    </div>
                    
                    {/* Yearly Pricing Details */}
                    {billingPeriod === 'yearly' && plan.id !== 'community' && !plan.perPerson && (
                      <div className="mt-3 text-sm space-y-1">
                        {/* Original Price (Before Discount) */}
                        <div className="text-gray-500 line-through">
                          {t('before_discount')}: {formatPriceVal(getOriginalYearlyTotal(plan.price.monthly))}
                        </div>
                        {/* Price After Discount */}
                        <div className="text-blue-600 font-semibold">
                          {t('after_discount')}: {formatPriceVal(getYearlyTotal(plan.price.monthly))} {t('per_year')}
                        </div>
                        {/* Savings Amount */}
                        <div className="text-green-600 font-semibold">
                          {t('you_save')}: {formatPriceVal(getSavings(plan.price.monthly))} {t('annually')}
                        </div>
                      </div>
                    )}
                    
                    {appliedDiscount && currentPrice !== originalPrice && plan.id !== 'community' && (
                      <div className="text-sm text-gray-500 line-through mt-1">
                        {t('was_price', { price: `${formatPriceVal(originalPrice)}` })}
                      </div>
                    )}
                  </div>
                  
                  {/* Features — grouped by category */}
                  <div className="space-y-4 mb-8">
                    {Array.isArray(plan.features) && plan.features.map((section, si) => (
                      <div key={si}>
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          {section.cat}
                        </p>
                        <ul className="space-y-1">
                          {section.items.map((item, ii) => (
                            <li key={ii} className="flex items-center gap-2">
                              <span className={`text-sm flex-shrink-0 ${item.ok ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`}>
                                {item.ok ? '✓' : '✗'}
                              </span>
                              <span className={`text-xs leading-relaxed ${item.ok ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500 line-through'}`}>
                                {item.text}
                              </span>
                              {item.badge && <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">{item.badge}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    
                  </div>
                  
                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                      plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                        : plan.id === 'community'
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    {plan.id === 'community' ? t('start_free') : t('choose_plan', { plan: plan.name })}
                  </button>
                  
                  {plan.id === 'community' && (
                    <p className="text-center text-sm text-gray-500 mt-2">
                      {t('no_credit_card_required')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Free User Sharing Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <UserGroupIcon className="h-16 w-16 mx-auto mb-4 text-blue-200" />
            <h2 className="text-3xl font-bold mb-4 text-center">{t('bring_community_together')}</h2>
            <p className="text-xl text-blue-100 mb-6">
              {t('paid_user_invite_20_free')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white/10 rounded-lg p-4">
                <GiftIcon className="h-8 w-8 mx-auto mb-2 text-blue-200" />
                <h3 className="font-semibold text-center mb-2">{t('free_invitations')}</h3>
                <p className="text-sm text-blue-100">{t('invite_up_to_20_residents')}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <CheckIcon className="h-8 w-8 mx-auto mb-2 text-blue-200" />
                <h3 className="font-semibold text-center mb-2">{t('full_access')}</h3>
                <p className="text-sm text-blue-100">{t('free_users_get_all_features')}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <UserGroupIcon className="h-8 w-8 mx-auto mb-2 text-blue-200" />
                <h3 className="font-semibold text-center mb-2">{t('no_limits')}</h3>
                <p className="text-sm text-blue-100">{t('build_community_no_barriers')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Services Comparison Table */}
        <div className="mt-16 bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            {t('services_comparison', 'مقارنة الخدمات حسب الخطة')}
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 w-1/4">{t('service', 'الخدمة')}</th>
                  <th className="text-center py-4 px-2 font-semibold text-green-600">{t('community_plan', 'المجتمع')}</th>
                  <th className="text-center py-4 px-2 font-semibold text-blue-600">{t('essential_plan', 'الأساسية')}</th>
                  <th className="text-center py-4 px-2 font-semibold text-purple-600">{t('professional_plan', 'المحترف')}</th>
                  <th className="text-center py-4 px-2 font-semibold text-orange-600">{t('enterprise_plan', 'المؤسسة')}</th>
                  <th className="text-center py-4 px-2 font-semibold text-indigo-600">{t('multi_compound_plan', 'المجمعات المتعددة')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700 font-medium">{t('service_family_management', 'إدارة العائلات')}</td>
                  <td className="text-center py-3 px-2">
                    <span className="text-xs text-yellow-600 font-semibold">{t('limited', 'محدودة')}</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700 font-medium">{t('service_guest_management', 'إدارة الضيوف')}</td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700 font-medium">{t('service_booking', 'حجز الخدمات')}</td>
                  <td className="text-center py-3 px-2">
                    <span className="text-xs text-yellow-600 font-semibold">{t('bookings_2', '2 حجز')}</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700 font-medium">{t('service_utility_bills', 'فواتير المرافق')}</td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700 font-medium">{t('service_document_management', 'إدارة المستندات')}</td>
                  <td className="text-center py-3 px-2">
                    <span className="text-xs text-blue-600 font-semibold">500MB</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-xs text-blue-600 font-semibold">5GB</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-xs text-blue-600 font-semibold">50GB</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">∞</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">∞</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700 font-medium">{t('service_messaging', 'الرسائل والإشعارات')}</td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700 font-medium">{t('service_analytics', 'التقارير والتحليلات')}</td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700 font-medium">{t('service_maintenance', 'إدارة الصيانة')}</td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">{t('frequently_asked_questions')}</h2>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div>
              <h3 className="font-semibold text-center text-gray-900 text-center mb-2">{t('can_upgrade_downgrade_anytime')}</h3>
              <p className="text-gray-600">{t('upgrade_downgrade_answer')}</p>
            </div>
            <div>
              <h3 className="font-semibold text-center text-gray-900 text-center mb-2">{t('is_there_setup_fee')}</h3>
              <p className="text-gray-600">{t('setup_fee_answer')}</p>
            </div>
            <div>
              <h3 className="font-semibold text-center text-gray-900 text-center mb-2">{t('how_free_invitations_work')}</h3>
              <p className="text-gray-600">{t('free_invitations_answer')}</p>
            </div>
          </div>
        </div>

        {/* Payment Methods Section */}
        <div className="mt-16 mb-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('what_payment_methods_accept')}</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">{t('payment_methods_subtitle')}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {/* Cash */}
            <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-green-300 cursor-pointer">
              <div className="payment-icon w-16 h-16 bg-gradient-to-br from-green-50 to-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💵</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-center mb-2">{t('cash_payment')}</h3>
              <p className="text-sm text-gray-500 text-center">{t('cash_payment_desc')}</p>
            </div>

            {/* Credit/Debit Card */}
            <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-blue-300 cursor-pointer">
              <div className="payment-icon w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💳</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-center mb-2">{t('card_payment')}</h3>
              <p className="text-sm text-gray-500 text-center">{t('card_payment_desc')}</p>
            </div>

            {/* Bank Transfer */}
            <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-purple-300 cursor-pointer">
              <div className="payment-icon w-16 h-16 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🏦</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-center mb-2">{t('bank_transfer')}</h3>
              <p className="text-sm text-gray-500 text-center">{t('bank_transfer_desc')}</p>
            </div>

            {/* InstaPay */}
            <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-yellow-300 cursor-pointer">
              <div className="payment-icon w-16 h-16 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-center mb-2">{t('instapay')}</h3>
              <p className="text-sm text-gray-500 text-center">{t('instapay_desc')}</p>
            </div>

            {/* Mobile Payment */}
            <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-pink-300 cursor-pointer">
              <div className="payment-icon w-16 h-16 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📱</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-center mb-2">{t('mobile_payment')}</h3>
              <p className="text-sm text-gray-500 text-center">{t('mobile_payment_desc')}</p>
            </div>

            {/* Digital Wallet */}
            <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-indigo-300 cursor-pointer">
              <div className="payment-icon w-16 h-16 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👛</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-center mb-2">{t('digital_wallet')}</h3>
              <p className="text-sm text-gray-500 text-center">{t('digital_wallet_desc')}</p>
            </div>

            {/* QR Code */}
            <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-teal-300 cursor-pointer">
              <div className="payment-icon w-16 h-16 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-center mb-2">{t('qr_payment')}</h3>
              <p className="text-sm text-gray-500 text-center">{t('qr_payment_desc')}</p>
            </div>

            {/* PayPal */}
            <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1">
              <div className="payment-icon w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🌐</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-center mb-2">{t('paypal')}</h3>
              <p className="text-sm text-gray-500 text-center">{t('paypal_desc')}</p>
            </div>
          </div>

          {/* Security Badge */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center space-x-2 bg-green-50 text-green-700 px-6 py-3 rounded-full border border-green-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="font-medium">{t('secure_payment_guarantee')}</span>
            </div>
          </div>

          {/* 📊 Side-by-Side Comparison Table */}
          <div className="mt-16 max-w-6xl mx-auto" data-testid="pricing-comparison-section">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>
                {t('plan_comparison_title', 'مقارنة تفصيلية بين الخطط')}
              </h2>
              <p className="text-gray-500 text-sm">
                {t('plan_comparison_subtitle', 'كل شيء تحتاجين معرفته قبل الاختيار')}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm" data-testid="pricing-comparison-table">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                    <th className="px-3 py-3 text-start font-bold text-gray-700 dark:text-gray-300 sticky right-0 bg-gray-50 dark:bg-gray-800 min-w-[140px]">الميزة</th>
                    <th className="px-2 py-3 text-center font-bold text-gray-500 text-xs min-w-[80px]">مجاني</th>
                    <th className="px-2 py-3 text-center font-bold text-sky-700 text-xs min-w-[80px]">أساسي<br/><span className="text-[10px] font-normal">1,200 ج.م</span></th>
                    <th className="px-2 py-3 text-center font-bold text-indigo-700 text-xs bg-indigo-50/50 dark:bg-indigo-900/20 min-w-[80px]">احترافي ⭐<br/><span className="text-[10px] font-normal">2,200 ج.م</span></th>
                    <th className="px-2 py-3 text-center font-bold text-violet-700 text-xs min-w-[80px]">متقدم 💎<br/><span className="text-[10px] font-normal">4,000 ج.م</span></th>
                    <th className="px-2 py-3 text-center font-bold text-amber-700 text-xs min-w-[80px]">ناشئة 🌱<br/><span className="text-[10px] font-normal">5,500 ج.م</span></th>
                    <th className="px-2 py-3 text-center font-bold text-blue-800 text-xs min-w-[80px]">متوسطة 🏢<br/><span className="text-[10px] font-normal">13,000 ج.م</span></th>
                    <th className="px-2 py-3 text-center font-bold text-rose-700 text-xs min-w-[80px]">كبرى 🏛️<br/><span className="text-[10px] font-normal">35,000 ج.م</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    // [ مجاني, أساسي, احترافي, متقدم, ناشئة, متوسطة, كبرى ]
                    { f: 'عدد الوحدات السكنية',    v: ['30', '100', '∞', '∞', '∞', '∞', '∞'] },
                    { f: 'عدد المجتمعات',           v: ['1', '1', '1', '1', '3', '8', '∞'] },
                    { f: 'إدارة السكان والعائلات',  v: ['✓', '✓', '✓', '✓', '✓', '✓', '✓'] },
                    { f: 'الفواتير والمدفوعات',     v: ['✓', '✓', '✓', '✓', '✓', '✓', '✓'] },
                    // [ مجاني, أساسي, احترافي, متقدم, ناشئة, متوسطة, كبرى ]
                    { f: '🔧 طلبات الصيانة',          v: ['محدودة', '50/شهر', '∞', '∞', '∞', '∞', '∞'] },
                    { f: '📢 الإعلانات والتواصل',     v: ['—', '✓', '✓', '✓', '✓', '✓', '✓'] },
                    { f: '🛡️ الزوار + QR Code',       v: ['—', '—', '✓', '✓', '✓', '✓', '✓'] },
                    { f: '📄 تقارير PDF',             v: ['—', 'أساسية', 'متقدمة', 'مخصصة', 'موحدة', 'موحدة', 'مخصصة'] },
                    { f: '📥 استيراد سكان CSV',        v: ['—', '✓', '✓', '✓', '✓', '✓', '✓'] },
                    { f: '💳 مدفوعات أونلاين',        v: ['—', '—', '✓', '✓', '✓', '✓', '✓'] },
                    { f: '📍 نظام تتبع الأشخاص',      v: ['—', '—', '✓', '✓', '✓', '✓', '✓'] },
                    { f: '🤖 مساعد AI + Auto-Pilot',  v: ['—', '5/يوم', '20/يوم', '50/يوم', '20/يوم', '50/يوم', '∞'] },
                    { f: '🗺️ خريطة الكمبوند التفاعلية', v: ['—', '—', '✓', '✓', '✓', '✓', '✓'] },
                    { f: '📊 تقرير أسبوعي تلقائي',    v: ['—', '—', '✓', '✓', '✓', '✓', '✓'] },
                    { f: '👥 فريق المساعدين',         v: ['—', '2', '5', '∞', '∞', '∞', '∞'] },
                    { f: '📢 الإعلانات التجارية',      v: ['—', '—', '✓', '✓', '✓', '✓', '✓'] },
                    { f: '🔗 API للتكامل الخارجي',    v: ['—', '—', '—', '✓', '—', '✓', '✓'] },
                    { f: '🏷️ White Label',             v: ['—', '—', '—', '—', '—', '—', '✓'] },
                    { f: '📈 تحليلات MRR/Churn',      v: ['—', '—', '—', '✓', '—', '✓', '✓'] },
                    { f: '🏢 لوحة تحكم موحدة للشركة', v: ['—', '—', '—', '—', '✓', '✓', '✓'] },
                    { f: '💬 الدعم الفني',             v: ['بريد', 'بريد', 'شات', '24/7', 'شات', 'مخصص', 'مخصص 24/7'] },
                    { f: '🏠 إعلانات الوحدات',         v: ['—', '—', '✓', '✓', '✓', '✓', '✓'], highlight: true },
                    { f: '👷 دليل العمال',             v: ['—', '✓', '✓', '✓', '✓', '✓', '✓'], highlight: true },
                    { f: '🧾 تأكيد إيصالات الدفع',    v: ['✓', '✓', '✓', '✓', '✓', '✓', '✓'], highlight: true },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-purple-50/30 transition">
                      <td className="px-4 py-3 font-medium text-gray-700 sticky right-0 bg-white">{row.f}</td>
                      {row.v.map((cell, j) => (
                        <td key={j} className={`px-4 py-3 text-center ${cell === '✓' ? 'text-emerald-600 font-bold' : cell === '—' ? 'text-gray-300' : 'text-gray-700 font-medium'} ${j === 2 ? 'bg-purple-50/30' : ''}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Free trial CTA */}
            <div className="mt-10 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 p-8 text-center text-white shadow-xl" data-testid="free-trial-cta">
              <div className="text-4xl mb-2">🎁</div>
              <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>
                {t('free_trial_title', 'جرّبي مجاناً 14 يوم — بدون بطاقة ائتمان')}
              </h3>
              <p className="text-emerald-50 mb-5 max-w-xl mx-auto">
                {t('free_trial_desc', 'فعّلي خطة "احترافي" مجاناً لمدة 14 يوم. كل الميزات متاحة بالكامل. ألغي في أي وقت بدون أي رسوم.')}
              </p>
              <button
                onClick={() => navigate('/auth/register')}
                className="inline-flex items-center gap-2 bg-white text-emerald-700 px-8 py-3 rounded-xl font-black text-lg hover:scale-105 transition-transform shadow-lg"
                data-testid="free-trial-btn"
              >
                {t('start_free_trial', 'ابدئي التجربة المجانية الآن')} ←
              </button>
              <p className="text-[11px] text-emerald-100 mt-3 opacity-80">
                {t('no_card_required', '✓ لا تحتاجين بطاقة ائتمان · ✓ إلغاء فوري · ✓ حماية كاملة لبياناتك')}
              </p>
            </div>

            {/* 💰 Ads Revenue Sharing Explainer — surfaces the income stream
                feature that's gated behind the Premium plan. Helps justify
                the upgrade for compounds that want monetization. */}
            <div className="mt-12 rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-200 p-8" data-testid="ads-revenue-explainer">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black mb-3">
                  💰 {t('ads_revenue_badge', 'ميزة Premium حصرية')}
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>
                  {t('ads_revenue_title', 'الإعلانات التجارية: حوّل مجمعك إلى مصدر دخل إضافي')}
                </h3>
                <p className="text-sm text-gray-600 max-w-2xl mx-auto">
                  {t('ads_revenue_subtitle', 'الشركات المحلية ترفع إعلاناتها، أنتِ توافقين، السكان يشاهدون، وأنتِ تكسبين 70% من كل إعلان. صفقة سهلة بدون جهد.')}
                </p>
              </div>

              {/* Step-by-step flow */}
              <div className="grid md:grid-cols-4 gap-4 mb-8" data-testid="ads-revenue-flow">
                {[
                  { num: '1', icon: '🏪', title: 'الشركات ترفع إعلانها', desc: 'مطاعم، عقارات، مدارس — أي شركة محلية ترفع تصميم الإعلان + المدة + الميزانية' },
                  { num: '2', icon: '✅', title: 'أنتِ توافقين أو ترفضين', desc: 'مراجعة كل إعلان قبل النشر — تحكّم كامل في المحتوى الظاهر لسكانك' },
                  { num: '3', icon: '📱', title: 'السكان يشاهدون', desc: 'الإعلان يظهر في أماكن غير مزعجة داخل التطبيق (Banner / Card) فقط للجمهور المستهدف' },
                  { num: '4', icon: '💵', title: 'أنتِ تكسبين 70%', desc: 'HomeMe تأخذ 30% فقط — الباقي يُحوَّل لحسابك البنكي شهرياً' },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-amber-200 p-4 relative shadow-sm">
                    <div className="absolute -top-3 -right-3 rtl:right-auto rtl:-left-3 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow-md">
                      {s.num}
                    </div>
                    <div className="text-3xl mb-2">{s.icon}</div>
                    <div className="font-bold text-gray-900 text-sm mb-1">{s.title}</div>
                    <div className="text-xs text-gray-500 leading-relaxed">{s.desc}</div>
                  </div>
                ))}
              </div>

              {/* Income projection */}
              <div className="bg-white rounded-2xl border-2 border-amber-300 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">📊</span>
                  <h4 className="font-bold text-gray-900">{t('ads_projection_title', 'مثال واقعي للدخل المتوقع')}</h4>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  {t('ads_projection_hint', 'الأرقام أدناه تقديرية بناءً على متوسط مجمع 200 وحدة')}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
                    <div className="text-[10px] text-gray-500 mb-1">{t('ads_per_month', 'إعلانات/شهر')}</div>
                    <div className="text-2xl font-black text-amber-700">3-5</div>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
                    <div className="text-[10px] text-gray-500 mb-1">{t('ads_per_ad', 'متوسط/إعلان')}</div>
                    <div className="text-2xl font-black text-amber-700">2,500 ج.م</div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border-2 border-emerald-300 p-3 text-center">
                    <div className="text-[10px] text-emerald-700 mb-1 font-bold">{t('ads_your_share', 'حصتك (70%)')}</div>
                    <div className="text-2xl font-black text-emerald-700">5,250 — 8,750 ج.م</div>
                  </div>
                </div>
                <p className="text-[11px] text-center text-gray-500 mt-3">
                  {t('ads_projection_note', '* الأرقام بدون احتساب مدخول التطبيق الأساسي — هذا دخل إضافي صافٍ')}
                </p>
              </div>

              {/* CTA */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    const el = document.querySelector('[data-testid="pricing-section"]') ||
                               document.querySelector('[data-testid="pricing-comparison-section"]');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl font-black hover:scale-105 transition-transform shadow-lg"
                  data-testid="ads-upgrade-btn"
                >
                  {t('ads_upgrade_cta', '⚡ ترقية لـ Premium وابدئي الكسب')}
                </button>
                <a
                  href="/advertiser-register"
                  className="inline-flex items-center gap-2 text-amber-700 px-4 py-2 rounded-xl font-bold border-2 border-amber-300 hover:bg-amber-100 transition"
                  data-testid="ads-learn-more-link"
                >
                  {t('ads_for_advertisers', 'هل أنت شركة تريد الإعلان؟ ←')}
                </a>
              </div>
            </div>

            {/* Customer testimonials — live, moderated reviews from real users (Feature #39) */}
            <div className="mt-12" data-testid="pricing-testimonials">
              <CustomerTestimonialsCarousel />
            </div>
          </div>
        </div>
      </div>

      {/* Guide CTA */}
      <div className="text-center py-8 border-t border-gray-200 dark:border-gray-700 mt-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">تريد معرفة كيفية استخدام كل الميزات؟</p>
        <a href="/guide" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-sm underline underline-offset-2">
          📖 افتح دليل التشغيل الكامل ←
        </a>
      </div>
    </div>
  );
};

export default Pricing;