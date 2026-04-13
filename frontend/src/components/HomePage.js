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

  useEffect(() => {
    if (!loading && user) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

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
    { id: 'overview', icon: HomeModernIcon, title: 'نظرة عامة على المنصة', content: 'HomeMe هي منصة متكاملة لإدارة المجتمعات السكنية تضم 15+ نظام. تدعم إدارة المقيمين، النظام المالي، الصيانة، العقود، المرافق، الشكاوى، والتقارير. المنصة تدعم اللغة العربية بالكامل مع واجهة RTL احترافية.' },
    { id: 'registration', icon: UserIcon, title: 'التسجيل وإنشاء الحساب', content: 'يتوفر 3 أنواع حسابات: مدير مجتمع سكني (ينشئ المجتمع ويدير كل شيء)، شركة إدارة (تدير عدة مجتمعات)، مقيم (ينضم عبر رمز دعوة). بعد التسجيل، يحصل المدير على لوحة تحكم كاملة لإعداد المجتمع.' },
    { id: 'financial', icon: CurrencyDollarIcon, title: 'النظام المالي والمحاسبي', content: 'يشمل: ميزانية عمومية شاملة، 4 طرق لتوزيع المصروفات (بالتساوي، حسب المساحة، نسبة مئوية، مبلغ مخصص)، متابعة سداد الوحدات بالألوان (أخضر=سدد، أحمر=لم يسدد)، رسوم بيانية تفاعلية Recharts، تصدير Excel بـ 5 أوراق عمل.' },
    { id: 'maintenance', icon: WrenchScrewdriverIcon, title: 'إدارة الصيانة والخدمات', content: 'يمكن للمقيم تقديم طلب صيانة مع صور وتحديد الأولوية والموقع. المدير يتابع الطلبات ويغير حالتها (معلق، قيد التنفيذ، مكتمل). يتم إشعار المدراء فوراً عند أي طلب جديد. بعد الإنجاز يمكن تقييم الخدمة بـ 5 نجوم.' },
    { id: 'visitors', icon: QrCodeIcon, title: 'إدارة الزوار والبوابات', content: 'نظام متكامل لطلبات الزيارة مع QR Code ذكي. يقدم المقيم طلب زيارة ← يوافق المدير ← يُنشأ QR Code ← يمسحه الأمن عند الدخول والخروج. يتضمن سجل كامل لحركة الزوار والإحصائيات اليومية.' },
    { id: 'contracts', icon: DocumentTextIcon, title: 'إدارة العقود والمزودين', content: 'تسجيل عقود المزودين (صيانة، نظافة، أمن، مرافق) مع تتبع تاريخ الانتهاء. تنبيهات تلقائية قبل 30 يوم، 7 أيام، ويوم الانتهاء. يمكن تجديد أو إنهاء العقود مع أرشيف كامل.' },
    { id: 'communication', icon: ChatBubbleLeftEllipsisIcon, title: 'التواصل والإعلانات', content: 'نظام رسائل متكامل مع WebSocket للتواصل الفوري. إعلانات عامة وطوارئ، أحداث مجتمعية، استطلاعات رأي، نشرات إخبارية. دعم المرفقات والصور والرسائل الصوتية.' },
    { id: 'reports', icon: PresentationChartBarIcon, title: 'التقارير والتحليلات', content: 'لوحة تحكم حية بإحصائيات فورية. تقرير يومي تلقائي يرسل بالبريد الساعة 7 صباحاً. تقارير PDF عربية احترافية. تصدير Excel شامل. مقارنة شهرية للأداء مع تنبيه عند انخفاض < 70%.' },
    { id: 'roles', icon: ShieldCheckIcon, title: 'الأدوار والصلاحيات', content: '6 أدوار: مالك التطبيق (Super Admin) - تحكم كامل | شركة إدارة - عدة مجتمعات | مدير مجتمع - إدارة كاملة | إداري - متابعة يومية | أمن - البوابات والزوار | مقيم - خدمات وصيانة. كل دور بصلاحيات وقائمة جانبية مخصصة.' },
    { id: 'smart', icon: LightBulbIcon, title: 'الأجهزة الذكية والأتمتة', content: 'تحكم بالأجهزة الذكية في المجتمع (إضاءة، تكييف، كاميرات، أقفال). أوامر طبيعية بالعربية مدعومة بالذكاء الاصطناعي. قواعد أتمتة (مثل: أطفئ الإضاءة الساعة 11 مساءً).' },
  ];

  const plans = [
    {
      name: 'مجاني',
      nameEn: 'Free',
      price: '0',
      period: 'شهرياً',
      color: 'border-gray-200',
      badge: '',
      features: ['حتى 20 وحدة سكنية', 'إدارة المقيمين الأساسية', 'طلبات الصيانة', 'إشعارات محدودة', 'تقرير شهري واحد'],
      excluded: ['النظام المالي المتقدم', 'تصدير Excel/PDF', 'إدارة العقود', 'الأجهزة الذكية', 'دعم فني مخصص'],
      cta: 'ابدأ مجاناً',
      ctaStyle: 'bg-gray-900 text-white hover:bg-gray-800'
    },
    {
      name: 'احترافي',
      nameEn: 'Pro',
      price: '199',
      period: 'شهرياً',
      color: 'border-blue-500 ring-2 ring-blue-100',
      badge: 'الأكثر طلباً',
      features: ['حتى 100 وحدة سكنية', 'كل مميزات المجاني', 'النظام المالي الكامل', 'تصدير Excel و PDF', 'إدارة العقود والمزودين', 'تقييمات الرضا والشكاوى', 'حجز المرافق', 'تقارير يومية بالبريد', 'دعم فني بالبريد'],
      excluded: ['الأجهزة الذكية', 'API مخصص'],
      cta: 'اشترك الآن',
      ctaStyle: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl'
    },
    {
      name: 'المؤسسي',
      nameEn: 'Enterprise',
      price: '499',
      period: 'شهرياً',
      color: 'border-purple-500',
      badge: '',
      features: ['عدد غير محدود من الوحدات', 'كل مميزات الاحترافي', 'إدارة عدة مجتمعات', 'الأجهزة الذكية والأتمتة', 'تحليلات متقدمة', 'API مخصص للتكامل', 'دعم فني مخصص 24/7', 'تدريب الفريق', 'تقارير مخصصة'],
      excluded: [],
      cta: 'تواصل معنا',
      ctaStyle: 'bg-purple-600 text-white hover:bg-purple-700'
    },
  ];

  const paymentMethods = [
    { icon: CreditCardIcon, name: 'بطاقات الائتمان', desc: 'Visa, Mastercard, Mada' },
    { icon: GlobeAltIcon, name: 'PayPal', desc: 'دفع آمن عبر PayPal' },
    { icon: DevicePhoneMobileIcon, name: 'Apple Pay', desc: 'دفع سريع بلمسة' },
    { icon: CurrencyDollarIcon, name: 'تحويل بنكي', desc: 'تحويل مباشر للحساب' },
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
              منصة إدارة المجتمعات السكنية المتكاملة
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 leading-tight" style={{ fontFamily: "'Cairo', sans-serif" }}>
              أدر مجتمعك السكني
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
                بذكاء واحترافية
              </span>
            </h1>
            <p className="text-lg text-blue-100/80 mb-10 max-w-2xl mx-auto leading-relaxed">
              15+ نظام متكامل لإدارة المقيمين والمالية والصيانة والعقود والمرافق والشكاوى - كل ما تحتاجه في منصة واحدة
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="px-8 py-4 bg-white text-blue-950 rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2" data-testid="hero-cta-register">
                ابدأ الآن مجاناً
                <ArrowRightIcon className="h-5 w-5 rotate-180" />
              </Link>
              <a href="#guide" className="px-8 py-4 border-2 border-white/30 text-white rounded-2xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center gap-2" data-testid="hero-cta-guide">
                <BookOpenIcon className="h-5 w-5" />
                دليل التشغيل
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Registration Types */}
      <section className="py-16 bg-gray-50/80" id="register-types" data-testid="registration-section">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>اختر نوع التسجيل</h2>
            <p className="text-gray-500">حدد نوع حسابك للبدء في استخدام المنصة</p>
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
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>15+ نظام متكامل</h2>
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
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white" id="guide" data-testid="guide-section">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-4">
              <BookOpenIcon className="h-4 w-4" />
              دليل شامل
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>دليل التشغيل الشامل</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">تعرّف على كل مكونات المنصة بالتفصيل وكيفية الاستفادة القصوى من كل نظام</p>
          </div>
          <div className="space-y-3">
            {guideItems.map((item, idx) => {
              const Icon = item.icon;
              const isOpen = openGuide === item.id;
              return (
                <div key={item.id} className={`rounded-2xl border transition-all ${isOpen ? 'border-blue-200 bg-blue-50/30 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <button
                    onClick={() => setOpenGuide(isOpen ? null : item.id)}
                    className="w-full flex items-center gap-4 p-5 text-right"
                    data-testid={`guide-item-${item.id}`}
                  >
                    <div className={`flex-shrink-0 p-2.5 rounded-xl ${isOpen ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'} transition-colors`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 text-right">
                      <span className="text-xs text-gray-400 font-medium">{idx + 1} / {guideItems.length}</span>
                      <h3 className="font-bold text-gray-900">{item.title}</h3>
                    </div>
                    {isOpen ? <ChevronUpIcon className="h-5 w-5 text-blue-500 flex-shrink-0" /> : <ChevronDownIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-0">
                      <div className="bg-white rounded-xl p-5 border border-blue-100">
                        <p className="text-gray-700 leading-relaxed text-sm">{item.content}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Subscription Plans */}
      <section className="py-20 bg-slate-950 text-white" id="pricing" data-testid="pricing-section">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>خطط الاشتراك</h2>
            <p className="text-gray-400 max-w-xl mx-auto">اختر الخطة المناسبة لحجم مجتمعك واحتياجاتك. يمكنك الترقية في أي وقت.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {plans.map((plan, i) => (
              <div key={i} className={`relative rounded-2xl border-2 bg-white/5 backdrop-blur-sm p-7 transition-all hover:-translate-y-1 hover:shadow-2xl ${plan.color}`} data-testid={`plan-${plan.nameEn.toLowerCase()}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                    {plan.badge}
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-xs text-gray-400 mb-4">{plan.nameEn}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black">{plan.price}</span>
                    <span className="text-sm text-gray-400">ر.س / {plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-green-400 flex-shrink-0" />
                      <span className="text-gray-200">{f}</span>
                    </li>
                  ))}
                  {plan.excluded.map((f, j) => (
                    <li key={`ex-${j}`} className="flex items-center gap-2 text-sm opacity-40">
                      <span className="h-4 w-4 flex-shrink-0 flex items-center justify-center text-xs">✕</span>
                      <span className="text-gray-400 line-through">{f}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')} className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${plan.ctaStyle}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Payment Methods */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-300 mb-6">طرق الدفع المتاحة</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {paymentMethods.map((method, i) => {
                const Icon = method.icon;
                return (
                  <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-3 hover:border-white/20 transition-all" data-testid={`payment-method-${i}`}>
                    <Icon className="h-5 w-5 text-blue-400" />
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">{method.name}</p>
                      <p className="text-xs text-gray-400">{method.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-6">
              <LockClosedIcon className="h-3.5 w-3.5 inline-block -mt-0.5 ml-1" />
              جميع المدفوعات مشفرة ومؤمنة عبر Stripe و PayPal
            </p>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white" data-testid="roles-section">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>6 أدوار مختلفة</h2>
            <p className="text-gray-500">كل دور بصلاحيات مخصصة حسب المسؤولية</p>
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

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white" data-testid="cta-section">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Cairo', sans-serif" }}>جاهز لإدارة مجتمعك السكني؟</h2>
          <p className="text-blue-100 mb-8 text-lg">انضم الآن وابدأ في استخدام منصة HomeMe - تجربة مجانية بدون بطاقة ائتمان</p>
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
