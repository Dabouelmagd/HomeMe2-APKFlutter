import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';
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
  QrCodeIcon, ClockIcon, PresentationChartBarIcon
} from '@heroicons/react/24/outline';

const HomePage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isRTL = i18n.language === 'ar';
  const [openGuide, setOpenGuide] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [currency, setCurrency] = useState('egp');
  const [subCode, setSubCode] = useState('');
  const [codeStatus, setCodeStatus] = useState(null); // {type:'success'|'error', msg:'...'}
  const [codeLoading, setCodeLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/app/dashboard', { replace: true });
    }
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
      setCodeStatus({ type: 'error', msg: 'يجب تسجيل الدخول أولاً لتفعيل الكود' });
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
        setCodeStatus({ type: 'success', msg: data.message || 'تم تفعيل الاشتراك بنجاح!' });
        setSubCode('');
      } else {
        setCodeStatus({ type: 'error', msg: data.detail || 'كود غير صالح' });
      }
    } catch {
      setCodeStatus({ type: 'error', msg: 'حدث خطأ، حاول مرة أخرى' });
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
        alert(data.detail || 'حدث خطأ');
      }
    } catch {
      navigate('/register');
    }
  };

  const systems = [
    { icon: UserGroupIcon, title: 'إدارة المقيمين', desc: 'ملف شامل لكل مقيم مع العائلة والوحدة وتصدير PDF', color: 'from-blue-500 to-blue-600' },
    { icon: CurrencyDollarIcon, title: 'النظام المالي', desc: 'ميزانية عمومية، 4 طرق توزيع مصروفات، رسوم بيانية، تصدير Excel', color: 'from-emerald-500 to-green-600' },
    { icon: WrenchScrewdriverIcon, title: 'الصيانة والخدمات', desc: 'طلبات صيانة، حجز خدمات، تقييم بعد الإنجاز', color: 'from-amber-500 to-orange-600' },
    { icon: DocumentTextIcon, title: 'إدارة العقود', desc: 'عقود المزودين مع تنبيهات تلقائية قبل الانتهاء', color: 'from-indigo-500 to-purple-600' },
    { icon: StarIcon, title: 'تقييمات الرضا', desc: 'تقييم 5 نجوم مع تنبيه ذكي عند انخفاض الرضا', color: 'from-yellow-500 to-amber-600' },
    { icon: ExclamationTriangleIcon, title: 'الشكاوى والاقتراحات', desc: 'تقديم شكاوى واقتراحات مع متابعة حالتها ورد الإدارة', color: 'from-red-500 to-rose-600' },
    { icon: CalendarDaysIcon, title: 'حجز المرافق', desc: 'حجز صالات، ملاعب، مسبح، قاعات اجتماعات بتقويم ذكي', color: 'from-cyan-500 to-teal-600' },
    { icon: BellIcon, title: 'إشعارات ذكية', desc: 'تنبيهات فورية للمدراء عند كل حدث مهم في المجتمع', color: 'from-pink-500 to-rose-600' },
    { icon: ChartBarIcon, title: 'تحليلات وتقارير', desc: 'لوحة تحكم حية، مقارنة شهرية، تقرير يومي تلقائي بالبريد', color: 'from-violet-500 to-purple-600' },
    { icon: ShieldCheckIcon, title: 'أدوار وصلاحيات', desc: '6 أدوار: مالك، شركة، مدير، إداري، أمن، مقيم', color: 'from-gray-600 to-gray-800' },
    { icon: ChatBubbleLeftEllipsisIcon, title: 'مركز التواصل', desc: 'رسائل، إعلانات، أحداث، إشعارات للمجتمع', color: 'from-sky-500 to-blue-600' },
    { icon: ArrowDownTrayIcon, title: 'تصدير وطباعة', desc: 'PDF عربي احترافي، Excel بـ 5 أوراق، طباعة مباشرة', color: 'from-teal-500 to-emerald-600' },
  ];

  const accountTypes = [
    { id: 'compound_admin', icon: BuildingOfficeIcon, title: 'تسجيل مجتمع سكني', desc: 'أنا مدير مجتمع سكني وأريد إنشاء حساب لإدارة المجتمع', color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50/80 border-blue-200 hover:border-blue-400', features: ['إنشاء المجتمع', 'إضافة السكان', 'تعيين الأمن والإداريين', 'إدارة الميزانية'] },
    { id: 'company_admin', icon: BuildingOffice2Icon, title: 'تسجيل شركة إدارة', desc: 'شركة تدير أكثر من مجتمع سكني وتريد حساب واحد لإدارتها', color: 'from-purple-500 to-indigo-600', bg: 'bg-purple-50/80 border-purple-200 hover:border-purple-400', features: ['إدارة عدة مجتمعات', 'تقارير موحدة', 'إدارة العقود', 'تحليلات شاملة'] },
    { id: 'resident', icon: UserIcon, title: 'تسجيل مقيم', desc: 'أنا مقيم في مجتمع سكني وأريد الانضمام عبر رمز الاشتراك', color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50/80 border-emerald-200 hover:border-emerald-400', features: ['طلبات صيانة', 'حجز مرافق', 'دفع التزامات', 'شكاوى واقتراحات'] },
  ];

  const guideItems = [
    { id: 'overview', icon: HomeModernIcon, title: 'نظرة عامة على المنصة', content: 'منصة متكاملة لإدارة المجتمعات السكنية تضم 20+ نظام. تدعم العربية بالكامل مع واجهة RTL احترافية.' },
    { id: 'registration', icon: UserIcon, title: 'التسجيل وإنشاء الحساب', content: '3 أنواع حسابات: مدير مجتمع، شركة إدارة، مقيم. تجربة مجانية 14 يوم بدون بطاقة ائتمان.' },
    { id: 'financial', icon: CurrencyDollarIcon, title: 'النظام المالي والمحاسبي', content: 'ميزانية شاملة، 4 طرق لتوزيع المصروفات، متابعة السداد بالألوان، رسوم بيانية، تصدير Excel بـ 5 أوراق.' },
    { id: 'maintenance', icon: WrenchScrewdriverIcon, title: 'إدارة الصيانة والخدمات', content: 'تقديم طلبات مع صور وأولوية. إشعارات فورية للمدراء. تقييم 5 نجوم بعد الإنجاز.' },
    { id: 'visitors', icon: QrCodeIcon, title: 'إدارة الزوار + QR Code', content: 'طلب زيارة ← موافقة ← QR Code ← مسح عند الدخول/الخروج. سجل كامل للزوار.' },
    { id: 'contracts', icon: DocumentTextIcon, title: 'إدارة العقود والمزودين', content: 'تسجيل عقود المزودين مع تنبيهات انتهاء تلقائية (30 يوم، 7 أيام). تجديد وأرشيف كامل.' },
    { id: 'communication', icon: ChatBubbleLeftEllipsisIcon, title: 'التواصل والإعلانات', content: 'رسائل فورية WebSocket، إعلانات عامة وطوارئ، أحداث، نشرات إخبارية، مرفقات وصوتيات.' },
    { id: 'complaints', icon: ExclamationTriangleIcon, title: 'الشكاوى والاقتراحات', content: 'تقديم شكوى بتصنيف وصور. متابعة الحالة بالإشعارات. اقتراحات لتحسين المجتمع.' },
    { id: 'ratings', icon: StarIcon, title: 'تقييمات الرضا', content: 'تقييم الخدمات 1-5 نجوم. إحصائيات رضا شاملة ومتوسط تقييم لكل خدمة.' },
    { id: 'facilities', icon: CalendarDaysIcon, title: 'حجز المرافق', content: 'حجز الصالة، الملعب، المسبح. تقويم متاح، إلغاء قبل 24 ساعة.' },
    { id: 'polls', icon: ClipboardDocumentCheckIcon, title: 'استطلاعات الرأي', content: 'استطلاعات مجتمعية وتصويت على قرارات. نتائج فورية بعد الإغلاق.' },
    { id: 'reports', icon: PresentationChartBarIcon, title: 'التقارير والتحليلات', content: 'تقارير يومية تلقائية بالبريد. تصدير PDF وExcel. مقارنة أداء المجتمعات.' },
    { id: 'subscription', icon: CreditCardIcon, title: 'الاشتراكات وطرق الدفع', content: '4 خطط سكنية + 3 للشركات. Stripe، PayPal، انستاباي، فودافون كاش. أكواد وكوبونات خصم.' },
    { id: 'roles', icon: ShieldCheckIcon, title: '6 أدوار وصلاحيات', content: 'مالك التطبيق، شركة إدارة، مدير مجتمع، إداري، أمن، مقيم - كل بصلاحيات مخصصة.' },
    { id: 'smart', icon: LightBulbIcon, title: 'الأجهزة الذكية (قريباً)', content: 'تحكم ذكي بالإضاءة، التكييف، الكاميرات، الأقفال. أوامر عربية بالذكاء الاصطناعي.' },
  ];

  const fx = currency === 'egp' ? 1 : 0.02; // 1 EGP ≈ 0.02 USD
  const sym = currency === 'egp' ? 'ج.م' : '$';
  const priceOf = (egp) => {
    const val = currency === 'egp' ? egp : Math.round(egp * 0.02);
    return val.toLocaleString();
  };
  const yearlyOf = (monthly) => {
    const total = monthly * 10; // 10 months = yearly (2 months free)
    const val = currency === 'egp' ? total : Math.round(total * 0.02);
    return val.toLocaleString();
  };
  const isYearly = billingPeriod === 'yearly';

  const residentialPlans = [
    {
      name: 'مجاني',
      nameEn: 'Starter',
      residents: 'حتى 5 سكان',
      monthly: 0,
      color: 'border-gray-300',
      badge: '',
      features: ['إدارة المقيمين الأساسية', 'طلبات الصيانة', 'إشعارات محدودة', 'تقرير شهري واحد', 'بوابة المقيم'],
      excluded: ['النظام المالي', 'تصدير Excel/PDF', 'إدارة العقود', 'حجز المرافق', 'الأجهزة الذكية (قريباً)', 'دعم فني'],
      cta: 'ابدأ مجاناً',
      ctaStyle: 'bg-gray-800 text-white hover:bg-gray-700'
    },
    {
      name: 'أساسي',
      nameEn: 'Basic',
      residents: 'عدد غير محدود من السكان',
      monthly: 500,
      color: 'border-sky-400',
      badge: '',
      features: [
        'كل مميزات المجاني',
        'عدد غير محدود من السكان',
        'إدارة المقيمين الكاملة',
        'طلبات الصيانة',
        'النظام المالي الكامل',
        'توزيع المصروفات (4 طرق)',
        'تصدير Excel و PDF',
        'إدارة العقود والمزودين',
        'تقييمات الرضا',
        'حجز المرافق',
        'إشعارات البريد',
        'دعم فني بالبريد'
      ],
      excluded: [],
      cta: 'اشترك الآن',
      ctaStyle: 'bg-sky-500 text-white hover:bg-sky-600'
    },
    {
      name: 'احترافي',
      nameEn: 'Pro',
      residents: 'عدد غير محدود من السكان',
      monthly: 1200,
      color: 'border-blue-500 ring-2 ring-blue-500/20',
      badge: 'الأكثر طلباً',
      features: [
        'كل مميزات الأساسي',
        'عدد غير محدود من السكان',
        'إدارة المقيمين الكاملة',
        'طلبات الصيانة المتقدمة',
        'النظام المالي الكامل',
        'توزيع المصروفات (4 طرق)',
        'تصدير Excel و PDF',
        'إدارة العقود والمزودين',
        'تقييمات الرضا',
        'حجز المرافق',
        'الشكاوى والاقتراحات',
        'إدارة الزوار + QR Code',
        'تقارير يومية تلقائية بالبريد',
        'استطلاعات الرأي',
        'إعلانات وأحداث',
        'نشرات إخبارية',
        'تحليلات متقدمة + رسوم بيانية',
        'دعم فني أولوية'
      ],
      excluded: [],
      cta: 'اشترك الآن',
      ctaStyle: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:scale-[1.02]'
    },
    {
      name: 'متقدم',
      nameEn: 'Premium',
      residents: 'عدد غير محدود - كل شيء',
      monthly: 2200,
      color: 'border-violet-500',
      badge: '',
      features: [
        'كل مميزات الاحترافي',
        'عدد غير محدود من السكان',
        'إدارة المقيمين الكاملة',
        'طلبات الصيانة المتقدمة',
        'النظام المالي الكامل',
        'توزيع المصروفات (4 طرق)',
        'تصدير Excel و PDF',
        'إدارة العقود والمزودين',
        'تقييمات الرضا',
        'حجز المرافق',
        'الشكاوى والاقتراحات',
        'إدارة الزوار + QR Code',
        'تقارير يومية تلقائية بالبريد',
        'استطلاعات الرأي',
        'إعلانات وأحداث',
        'نشرات إخبارية',
        'تحليلات متقدمة + رسوم بيانية',
        'الأجهزة الذكية والأتمتة (قريباً)',
        'API مخصص للتكامل',
        'تقارير مخصصة',
        'دعم فني مخصص 24/7',
        'تدريب الفريق',
        'مدير حساب مخصص'
      ],
      excluded: [],
      cta: 'اشترك الآن',
      ctaStyle: 'bg-violet-600 text-white hover:bg-violet-700'
    },
  ];

  const companyPlans = [
    {
      name: 'شركة ناشئة',
      nameEn: 'Startup',
      compounds: 'حتى 3 مجتمعات',
      monthly: 3500,
      color: 'border-amber-400',
      features: [
        'إدارة حتى 3 مجتمعات سكنية',
        'لوحة تحكم موحدة',
        'عدد غير محدود من السكان',
        'كل مميزات الاحترافي لكل مجتمع',
        'النظام المالي الكامل',
        'توزيع المصروفات (4 طرق)',
        'تصدير Excel و PDF',
        'إدارة العقود والمزودين',
        'تقييمات الرضا',
        'حجز المرافق',
        'الشكاوى والاقتراحات',
        'إدارة الزوار + QR Code',
        'تقارير يومية تلقائية بالبريد',
        'استطلاعات الرأي',
        'إعلانات وأحداث',
        'نشرات إخبارية',
        'تحليلات متقدمة + رسوم بيانية',
        'تقارير موحدة لكل المجتمعات',
        'فريق إدارة واحد',
        'دعم فني بالبريد'
      ],
      cta: 'اشترك الآن',
      ctaStyle: 'bg-amber-500 text-white hover:bg-amber-600'
    },
    {
      name: 'شركة متوسطة',
      nameEn: 'Business',
      compounds: '1 - 5 مجتمعات',
      monthly: 7500,
      color: 'border-orange-500 ring-2 ring-orange-500/20',
      badge: 'الأفضل للشركات',
      features: [
        'إدارة حتى 5 مجتمعات',
        'لوحة تحكم مركزية متقدمة',
        'عدد غير محدود من السكان',
        'كل مميزات المتقدم لكل مجتمع',
        'النظام المالي الكامل',
        'توزيع المصروفات (4 طرق)',
        'تصدير Excel و PDF',
        'إدارة العقود والمزودين',
        'تقييمات الرضا',
        'حجز المرافق',
        'الشكاوى والاقتراحات',
        'إدارة الزوار + QR Code',
        'تقارير يومية تلقائية بالبريد',
        'استطلاعات الرأي',
        'إعلانات وأحداث',
        'نشرات إخبارية',
        'تحليلات متقدمة + رسوم بيانية',
        'الأجهزة الذكية والأتمتة (قريباً)',
        'API مخصص للتكامل',
        'تحليلات مقارنة بين المجتمعات',
        'إدارة فرق متعددة',
        'نظام صلاحيات متقدم',
        'تقارير أداء الشركة',
        'دعم فني أولوية + واتساب'
      ],
      cta: 'اشترك الآن',
      ctaStyle: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-xl hover:scale-[1.02]'
    },
    {
      name: 'شركة كبرى',
      nameEn: 'Enterprise',
      compounds: 'غير محدود - كل شيء',
      monthly: 20000,
      isCustom: false,
      color: 'border-red-500',
      features: [
        'عدد غير محدود من المجتمعات',
        'عدد غير محدود من السكان',
        'كل مميزات المنصة بدون استثناء',
        'النظام المالي الكامل',
        'توزيع المصروفات (4 طرق)',
        'تصدير Excel و PDF',
        'إدارة العقود والمزودين',
        'تقييمات الرضا',
        'حجز المرافق',
        'الشكاوى والاقتراحات',
        'إدارة الزوار + QR Code',
        'تقارير يومية تلقائية بالبريد',
        'استطلاعات الرأي',
        'إعلانات وأحداث',
        'نشرات إخبارية',
        'تحليلات متقدمة + رسوم بيانية',
        'الأجهزة الذكية والأتمتة (قريباً)',
        'تكامل API كامل مع أنظمتكم',
        'تحليلات مقارنة بين المجتمعات',
        'إدارة فرق متعددة',
        'نظام صلاحيات متقدم',
        'تقارير أداء الشركة',
        'استضافة خاصة (اختياري)',
        'تخصيص العلامة التجارية',
        'مدير حساب مخصص',
        'تدريب شامل للفريق',
        'SLA مضمون 99.9%',
        'دعم فني 24/7 هاتف + واتساب'
      ],
      cta: 'اشترك الآن',
      ctaStyle: 'bg-red-600 text-white hover:bg-red-700'
    },
  ];

  const companyComparisonFeatures = [
    { name: 'عدد المجتمعات', startup: 'حتى 3', business: 'حتى 5', enterprise: 'غير محدود' },
    { name: 'عدد السكان', startup: true, business: true, enterprise: true },
    { name: 'لوحة تحكم مركزية', startup: true, business: true, enterprise: true },
    { name: 'النظام المالي الكامل', startup: true, business: true, enterprise: true },
    { name: 'توزيع المصروفات (4 طرق)', startup: true, business: true, enterprise: true },
    { name: 'تصدير Excel و PDF', startup: true, business: true, enterprise: true },
    { name: 'إدارة العقود والمزودين', startup: true, business: true, enterprise: true },
    { name: 'تقييمات الرضا', startup: true, business: true, enterprise: true },
    { name: 'حجز المرافق', startup: true, business: true, enterprise: true },
    { name: 'الشكاوى والاقتراحات', startup: true, business: true, enterprise: true },
    { name: 'إدارة الزوار + QR Code', startup: true, business: true, enterprise: true },
    { name: 'تقارير يومية تلقائية بالبريد', startup: true, business: true, enterprise: true },
    { name: 'استطلاعات الرأي', startup: true, business: true, enterprise: true },
    { name: 'إعلانات وأحداث', startup: true, business: true, enterprise: true },
    { name: 'نشرات إخبارية', startup: true, business: true, enterprise: true },
    { name: 'تحليلات متقدمة + رسوم بيانية', startup: true, business: true, enterprise: true },
    { name: 'تقارير موحدة لكل المجتمعات', startup: true, business: true, enterprise: true },
    { name: 'الأجهزة الذكية والأتمتة (قريباً)', startup: false, business: true, enterprise: true },
    { name: 'API مخصص للتكامل', startup: false, business: true, enterprise: true },
    { name: 'تحليلات مقارنة بين المجتمعات', startup: false, business: true, enterprise: true },
    { name: 'إدارة فرق متعددة', startup: false, business: true, enterprise: true },
    { name: 'نظام صلاحيات متقدم', startup: false, business: true, enterprise: true },
    { name: 'تقارير أداء الشركة', startup: false, business: true, enterprise: true },
    { name: 'استضافة خاصة (اختياري)', startup: false, business: false, enterprise: true },
    { name: 'تخصيص العلامة التجارية', startup: false, business: false, enterprise: true },
    { name: 'مدير حساب مخصص', startup: false, business: false, enterprise: true },
    { name: 'تدريب شامل للفريق', startup: false, business: false, enterprise: true },
    { name: 'SLA مضمون 99.9%', startup: false, business: false, enterprise: true },
    { name: 'دعم فني 24/7 هاتف + واتساب', startup: false, business: false, enterprise: true },
  ];

  const comparisonFeatures = [
    { name: 'إدارة المقيمين', starter: true, basic: true, pro: true, premium: true },
    { name: 'طلبات الصيانة', starter: true, basic: true, pro: true, premium: true },
    { name: 'بوابة المقيم', starter: true, basic: true, pro: true, premium: true },
    { name: 'النظام المالي الكامل', starter: false, basic: true, pro: true, premium: true },
    { name: 'توزيع المصروفات (4 طرق)', starter: false, basic: true, pro: true, premium: true },
    { name: 'تصدير Excel و PDF', starter: false, basic: true, pro: true, premium: true },
    { name: 'إدارة العقود والمزودين', starter: false, basic: true, pro: true, premium: true },
    { name: 'تقييمات الرضا', starter: false, basic: true, pro: true, premium: true },
    { name: 'حجز المرافق', starter: false, basic: true, pro: true, premium: true },
    { name: 'إشعارات البريد', starter: false, basic: true, pro: true, premium: true },
    { name: 'الشكاوى والاقتراحات', starter: false, basic: false, pro: true, premium: true },
    { name: 'إدارة الزوار + QR Code', starter: false, basic: false, pro: true, premium: true },
    { name: 'تقارير يومية تلقائية بالبريد', starter: false, basic: false, pro: true, premium: true },
    { name: 'استطلاعات الرأي', starter: false, basic: false, pro: true, premium: true },
    { name: 'إعلانات وأحداث', starter: false, basic: false, pro: true, premium: true },
    { name: 'نشرات إخبارية', starter: false, basic: false, pro: true, premium: true },
    { name: 'تحليلات متقدمة + رسوم بيانية', starter: false, basic: false, pro: true, premium: true },
    { name: 'الأجهزة الذكية والأتمتة (قريباً)', starter: false, basic: false, pro: false, premium: true },
    { name: 'API مخصص للتكامل', starter: false, basic: false, pro: false, premium: true },
    { name: 'تقارير مخصصة', starter: false, basic: false, pro: false, premium: true },
    { name: 'دعم فني مخصص 24/7', starter: false, basic: false, pro: false, premium: true },
    { name: 'تدريب الفريق', starter: false, basic: false, pro: false, premium: true },
    { name: 'مدير حساب مخصص', starter: false, basic: false, pro: false, premium: true },
  ];

  const paymentMethods = [
    { icon: CreditCardIcon, name: 'بطاقات الائتمان', desc: 'Visa, Mastercard, Mada' },
    { icon: GlobeAltIcon, name: 'PayPal', desc: 'دفع آمن عالمي' },
    { icon: DevicePhoneMobileIcon, name: 'المحافظ الرقمية', desc: 'Apple Pay, STC Pay' },
    { icon: CurrencyDollarIcon, name: 'تحويل بنكي', desc: 'تحويل مباشر للحساب' },
    { icon: PhoneIcon, name: 'انستاباي', desc: 'تحويل فوري بالموبايل' },
  ];

  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-100 shadow-sm" data-testid="homepage-header">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img
              src="https://customer-assets.emergentagent.com/job_homeme-subscriptions/artifacts/6yk66f7n_WhatsApp%20Image%202022-01-17%20at%2010.23.44%20AM.637bf42d664818.47361218.jpeg"
              alt="HomeMe"
              className="h-20 w-auto rounded-2xl shadow-lg"
              data-testid="homepage-logo"
            />
            <div>
              <span className="text-3xl font-black text-gray-900 block leading-tight" style={{ fontFamily: "'Cairo', sans-serif" }}>HomeMe</span>
              <span className="text-xs text-gray-500 font-medium">إدارة المجتمعات السكنية</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all group relative"
              data-testid="super-admin-quick-login"
              title="Super Admin"
            >
              <KeyIcon className="h-5 w-5" />
            </button>
            <LanguageSwitcher />
            <Link to="/login" className="px-4 py-2 text-blue-600 border-2 border-blue-600 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-all" data-testid="header-login">
              {t('login', 'تسجيل الدخول')}
            </Link>
            <Link to="/register" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all" data-testid="header-register">
              {t('register_now', 'إنشاء حساب')}
            </Link>
          </div>
        </div>
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

      {/* Google Ad Space 1 - After Hero */}
      <div className="bg-gray-100 py-2 text-center" data-testid="ad-space-1">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden" style={{ minHeight: '90px', maxHeight: '100px' }}>
            <ins className="adsbygoogle"
              style={{ display: 'block' }}
              data-ad-client="ca-pub-5928973437129941"
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        </div>
      </div>

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

      {/* 15 Systems */}
      <section className="py-16" id="systems" data-testid="systems-section">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_15_systems')}</h2>
            <p className="text-gray-500">كل ما تحتاجه لإدارة مجتمعك السكني باحترافية</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {systems.map((sys, i) => {
              const Icon = sys.icon;
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all group">
                  <div className={`inline-flex p-2.5 rounded-lg bg-gradient-to-r ${sys.color} mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{sys.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{sys.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comprehensive Guide */}
      <section className="py-16 bg-gradient-to-b from-slate-50 to-white" id="guide" data-testid="guide-section">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
              <BookOpenIcon className="h-4 w-4" />
              دليل شامل
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_guide_title')}</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">{t('hp_guide_desc')}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {guideItems.map((item) => {
              const Icon = item.icon;
              const isOpen = openGuide === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setOpenGuide(isOpen ? null : item.id)}
                  className={`rounded-xl p-4 text-center border transition-all hover:shadow-md ${isOpen ? 'border-blue-400 bg-blue-50 shadow-md ring-1 ring-blue-200' : 'border-gray-200 bg-white hover:border-blue-200'}`}
                  data-testid={`guide-item-${item.id}`}
                >
                  <div className={`mx-auto w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${isOpen ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className={`font-bold text-xs leading-tight ${isOpen ? 'text-blue-700' : 'text-gray-800'}`}>{item.title}</h3>
                </button>
              );
            })}
          </div>
          {openGuide && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-5 animate-in fade-in">
              <div className="flex items-start gap-3">
                {(() => {
                  const selected = guideItems.find(g => g.id === openGuide);
                  if (!selected) return null;
                  const SelIcon = selected.icon;
                  return (
                    <>
                      <div className="bg-blue-600 text-white p-2.5 rounded-lg flex-shrink-0">
                        <SelIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-blue-900 mb-1">{selected.title}</h3>
                        <p className="text-gray-700 text-sm leading-relaxed">{selected.content}</p>
                      </div>
                      <button onClick={() => setOpenGuide(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                        <ChevronUpIcon className="h-5 w-5" />
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Google Ad Space 2 - Before Pricing */}
      <div className="bg-slate-900 py-2 text-center">
        <div className="max-w-5xl mx-auto px-4">
          <div className="rounded-lg overflow-hidden" style={{ minHeight: '90px', maxHeight: '100px' }}>
            <ins className="adsbygoogle"
              style={{ display: 'block' }}
              data-ad-client="ca-pub-5928973437129941"
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        </div>
      </div>

      {/* Subscription Plans - Residential */}
      <section className="py-20 bg-slate-950 text-white" id="pricing" data-testid="pricing-section">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_residential_plans')}</h2>
            <p className="text-gray-400 max-w-xl mx-auto mb-8">{t('hp_residential_plans_desc')}</p>

            {/* Toggles Row */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
              {/* Billing Period Toggle */}
              <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                <button onClick={() => setBillingPeriod('monthly')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${billingPeriod === 'monthly' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`} data-testid="toggle-monthly">{t('hp_monthly')}</button>
                <button onClick={() => setBillingPeriod('yearly')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all relative ${billingPeriod === 'yearly' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`} data-testid="toggle-yearly">
                  سنوي
                  <span className="absolute -top-2.5 -left-2 px-1.5 py-0.5 bg-green-500 text-[9px] font-bold rounded-full text-white">{t('hp_2months_free')}</span>
                </button>
              </div>
              {/* Currency Toggle */}
              <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                <button onClick={() => setCurrency('egp')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currency === 'egp' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`} data-testid="toggle-egp">ج.م EGP</button>
                <button onClick={() => setCurrency('usd')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currency === 'usd' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`} data-testid="toggle-usd">$ USD</button>
              </div>
            </div>
            {isYearly && <p className="text-xs text-green-400 mb-2">{t('hp_yearly_note')}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {residentialPlans.map((plan, i) => (
              <div key={i} className={`relative rounded-2xl border-2 bg-white/5 backdrop-blur-sm p-6 transition-all hover:-translate-y-1 hover:shadow-2xl ${plan.color}`} data-testid={`plan-${plan.nameEn.toLowerCase()}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full whitespace-nowrap">{plan.badge}</div>
                )}
                <div className="text-center mb-5">
                  <h3 className="text-lg font-bold mb-0.5">{plan.name}</h3>
                  <p className="text-[10px] text-gray-400 mb-1">{plan.nameEn}</p>
                  <p className="text-xs text-blue-300 font-medium mb-3">{plan.residents}</p>
                  {plan.monthly === 0 ? (
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-black">مجاناً</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-black">{isYearly ? yearlyOf(plan.monthly) : priceOf(plan.monthly)}</span>
                        <span className="text-xs text-gray-400">{sym} / {isYearly ? 'سنوياً' : 'شهرياً'}</span>
                      </div>
                      {isYearly && plan.monthly > 0 && (
                        <p className="text-[10px] text-gray-500 mt-1 line-through">{priceOf(plan.monthly * 12)} {sym} / سنوياً بدون خصم</p>
                      )}
                    </div>
                  )}
                </div>
                <ul className="space-y-2 mb-5 text-sm">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-200 text-xs">{f}</span>
                    </li>
                  ))}
                  {plan.excluded.map((f, j) => (
                    <li key={`x-${j}`} className="flex items-start gap-2 opacity-30">
                      <span className="h-4 w-4 flex-shrink-0 flex items-center justify-center text-[10px] mt-0.5">✕</span>
                      <span className="text-gray-400 line-through text-xs">{f}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleSubscribe(plan.nameEn.toLowerCase())} className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${plan.ctaStyle}`}>{plan.cta}</button>
              </div>
            ))}
          </div>

          {/* Feature Comparison Table */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold text-center mb-8" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_comparison_title')}</h3>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm" data-testid="comparison-table">
                <thead>
                  <tr className="bg-white/10">
                    <th className="text-right py-3 px-4 font-bold text-gray-300">{t('hp_feature')}</th>
                    <th className="text-center py-3 px-3 font-bold text-gray-400">مجاني</th>
                    <th className="text-center py-3 px-3 font-bold text-sky-400">أساسي</th>
                    <th className="text-center py-3 px-3 font-bold text-blue-400">احترافي</th>
                    <th className="text-center py-3 px-3 font-bold text-violet-400">متقدم</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feat, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                      <td className="py-2.5 px-4 text-gray-300 text-xs">{feat.name}</td>
                      {['starter', 'basic', 'pro', 'premium'].map(tier => (
                        <td key={tier} className="text-center py-2.5 px-3">
                          {feat[tier] ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-400 mx-auto" />
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Price row */}
                  <tr className="bg-white/5 border-t border-white/10">
                    <td className="py-3 px-4 font-bold text-white text-xs">السعر {isYearly ? 'السنوي' : 'الشهري'}</td>
                    <td className="text-center py-3 px-3 text-xs font-bold text-gray-300">مجاناً</td>
                    <td className="text-center py-3 px-3 text-xs font-bold text-sky-300">{isYearly ? yearlyOf(500) : priceOf(500)} {sym}</td>
                    <td className="text-center py-3 px-3 text-xs font-bold text-blue-300">{isYearly ? yearlyOf(1200) : priceOf(1200)} {sym}</td>
                    <td className="text-center py-3 px-3 text-xs font-bold text-violet-300">{isYearly ? yearlyOf(2200) : priceOf(2200)} {sym}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Subscription Codes */}
          <div className="mb-20 max-w-3xl mx-auto" data-testid="subscription-codes-section">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/10 text-green-400 rounded-full text-sm font-medium mb-3 border border-green-500/20">
                <KeyIcon className="h-4 w-4" />
                أكواد الاشتراك
              </div>
              <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_have_code')}</h3>
              <p className="text-gray-400 text-sm">{t('hp_code_desc')}</p>
            </div>
            <div className="grid grid-cols-5 gap-3 mb-6">
              {[
                { label: '3 شهور', icon: '3m', color: 'border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10' },
                { label: '6 شهور', icon: '6m', color: 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10' },
                { label: '9 شهور', icon: '9m', color: 'border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10' },
                { label: 'سنة', icon: '1Y', color: 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10' },
                { label: 'مدى الحياة', icon: '∞', color: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10' },
              ].map((d, i) => (
                <div key={i} className={`rounded-xl border text-center py-3 px-2 transition-all ${d.color}`}>
                  <p className="text-lg font-black text-white mb-0.5">{d.icon}</p>
                  <p className="text-[10px] text-gray-300">{d.label}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <input type="text" placeholder={t("hp_enter_code")} value={subCode} onChange={e => setSubCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCodeActivate()} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30" data-testid="subscription-code-input" />
              <button onClick={handleCodeActivate} disabled={codeLoading || !subCode.trim()} className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-500 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed" data-testid="activate-code-btn">
                {codeLoading ? '...' : 'تفعيل الكود'}
              </button>
            </div>
            {codeStatus && (
              <div className={`mt-3 text-sm font-medium text-center py-2 px-4 rounded-lg ${codeStatus.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`} data-testid="code-status-message">
                {codeStatus.msg}
              </div>
            )}
          </div>

          {/* Company Plans */}
          <div className="mb-16">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 text-amber-400 rounded-full text-sm font-medium mb-4 border border-amber-500/20">
                <BuildingOffice2Icon className="h-4 w-4" />
                لشركات الإدارة
              </div>
              <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_company_plans_title')}</h3>
              <p className="text-gray-400 text-sm max-w-lg mx-auto">{t('hp_company_plans_desc')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {companyPlans.map((plan, i) => (
                <div key={i} className={`relative rounded-2xl border-2 bg-white/5 backdrop-blur-sm p-7 transition-all hover:-translate-y-1 hover:shadow-2xl ${plan.color}`} data-testid={`company-plan-${plan.nameEn.toLowerCase()}`}>
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-500 text-white text-xs font-bold rounded-full whitespace-nowrap">{plan.badge}</div>
                  )}
                  <div className="text-center mb-5">
                    <h3 className="text-xl font-bold mb-0.5">{plan.name}</h3>
                    <p className="text-[10px] text-gray-400 mb-1">{plan.nameEn}</p>
                    <p className="text-xs text-amber-300 font-medium mb-3">{plan.compounds}</p>
                    {plan.isCustom ? (
                      <span className="text-2xl font-black">سعر مخصص</span>
                    ) : (
                      <div>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl font-black">{isYearly ? yearlyOf(plan.monthly) : priceOf(plan.monthly)}</span>
                          <span className="text-xs text-gray-400">{sym} / {isYearly ? 'سنوياً' : 'شهرياً'}</span>
                        </div>
                        {isYearly && (
                          <p className="text-[10px] text-gray-500 mt-1 line-through">{priceOf(plan.monthly * 12)} {sym} / سنوياً بدون خصم</p>
                        )}
                      </div>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <CheckCircleIcon className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-200 text-xs">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => handleSubscribe(`company_${plan.nameEn.toLowerCase()}`)} className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${plan.ctaStyle}`}>{plan.cta}</button>
                </div>
              ))}
            </div>
          </div>

          {/* Company Comparison Table */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold text-center mb-8" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_company_comparison')}</h3>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm" data-testid="company-comparison-table">
                <thead>
                  <tr className="bg-white/10">
                    <th className="text-right py-3 px-4 font-bold text-gray-300">{t('hp_feature')}</th>
                    <th className="text-center py-3 px-3 font-bold text-amber-400">شركة ناشئة</th>
                    <th className="text-center py-3 px-3 font-bold text-orange-400">شركة متوسطة</th>
                    <th className="text-center py-3 px-3 font-bold text-red-400">شركة كبرى</th>
                  </tr>
                </thead>
                <tbody>
                  {companyComparisonFeatures.map((feat, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                      <td className="py-2.5 px-4 text-gray-300 text-xs">{feat.name}</td>
                      {['startup', 'business', 'enterprise'].map(tier => (
                        <td key={tier} className="text-center py-2.5 px-3">
                          {typeof feat[tier] === 'string' ? (
                            <span className="text-xs font-bold text-amber-300">{feat[tier]}</span>
                          ) : feat[tier] ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-400 mx-auto" />
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Price row */}
                  <tr className="bg-white/5 border-t border-white/10">
                    <td className="py-3 px-4 font-bold text-white text-xs">السعر {isYearly ? 'السنوي' : 'الشهري'}</td>
                    <td className="text-center py-3 px-3 text-xs font-bold text-amber-300">{isYearly ? yearlyOf(3500) : priceOf(3500)} {sym}</td>
                    <td className="text-center py-3 px-3 text-xs font-bold text-orange-300">{isYearly ? yearlyOf(7500) : priceOf(7500)} {sym}</td>
                    <td className="text-center py-3 px-3 text-xs font-bold text-red-300">{isYearly ? yearlyOf(20000) : priceOf(20000)} {sym}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-300 mb-6" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_payment_methods')}</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {paymentMethods.map((method, i) => {
                const Icon = method.icon;
                return (
                  <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-3 hover:border-white/25 transition-all" data-testid={`payment-method-${i}`}>
                    <Icon className="h-5 w-5 text-blue-400" />
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{method.name}</p>
                      <p className="text-[10px] text-gray-400">{method.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-6">
              <LockClosedIcon className="h-3.5 w-3.5 inline-block -mt-0.5 ml-1" />
              {t('hp_payments_secure')}
            </p>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white" data-testid="roles-section">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_6_roles')}</h2>
            <p className="text-gray-500">{t('hp_roles_desc')}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: KeyIcon, title: 'مالك التطبيق', desc: 'تحكم كامل', color: 'bg-purple-50 text-purple-700 border-purple-200' },
              { icon: BuildingOffice2Icon, title: 'إدارة شركة', desc: 'عدة مجتمعات', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
              { icon: HomeModernIcon, title: 'مدير مجتمع', desc: 'إدارة كاملة', color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { icon: ClipboardDocumentCheckIcon, title: 'إداري', desc: 'متابعة يومية', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { icon: ShieldCheckIcon, title: 'أمن', desc: 'بوابات وزوار', color: 'bg-amber-50 text-amber-700 border-amber-200' },
              { icon: UserIcon, title: 'مقيم', desc: 'خدمات وصيانة', color: 'bg-teal-50 text-teal-700 border-teal-200' },
            ].map((role, i) => {
              const Icon = role.icon;
              return (
                <div key={i} className={`rounded-xl p-4 text-center border ${role.color} hover:shadow-md transition-all`}>
                  <Icon className="h-8 w-8 mx-auto mb-2" />
                  <h4 className="font-bold text-sm mb-0.5">{role.title}</h4>
                  <p className="text-xs opacity-70">{role.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Referral Program */}
      <section className="py-16 bg-gradient-to-br from-emerald-50 to-teal-50" data-testid="referral-section">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold mb-6">
            <UserGroupIcon className="h-4 w-4" />
            برنامج الإحالة
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
            سجّل الآن وابدأ بالدعوة
            <ArrowRightIcon className="h-4 w-4 rotate-180" />
          </Link>
        </div>
      </section>

      {/* Google Ad Space 3 - Before CTA */}
      <div className="bg-gray-50 py-2 text-center">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden" style={{ minHeight: '90px', maxHeight: '100px' }}>
            <ins className="adsbygoogle"
              style={{ display: 'block' }}
              data-ad-client="ca-pub-5928973437129941"
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white" data-testid="cta-section">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_ready_title')}</h2>
          <p className="text-blue-100 mb-8 text-lg">{t('hp_ready_desc')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="px-10 py-4 bg-white text-blue-700 rounded-2xl font-bold text-lg hover:shadow-2xl transition-all" data-testid="cta-register">
              إنشاء حساب مجاني
            </Link>
            <Link to="/login" className="px-10 py-4 border-2 border-white/40 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all" data-testid="cta-login">
              تسجيل الدخول
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
              <a href="#guide" className="hover:text-white transition-colors">دليل التشغيل</a>
              <a href="#pricing" className="hover:text-white transition-colors">الاشتراكات</a>
              <a href="#systems" className="hover:text-white transition-colors">الأنظمة</a>
              <Link to="/login" className="hover:text-white transition-colors">تسجيل الدخول</Link>
            </div>
            <p className="text-xs">&copy; {new Date().getFullYear()} HomeMe - جميع الحقوق محفوظة</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
