import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
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
  QrCodeIcon, ClockIcon, PresentationChartBarIcon,
  BoltIcon, EnvelopeIcon, ArrowPathIcon
} from '@heroicons/react/24/outline';

import InternalAdBanner from './InternalAdBanner';

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
    { icon: UserGroupIcon, title: t('sys_residents', 'إدارة المقيمين'), desc: t('sys_residents_d', 'ملف شامل لكل مقيم مع العائلة والوحدة وتصدير PDF'), color: 'from-blue-500 to-blue-600' },
    { icon: CurrencyDollarIcon, title: t('sys_finance', 'النظام المالي'), desc: t('sys_finance_d', 'ميزانية عمومية، 4 طرق توزيع مصروفات، رسوم بيانية، تصدير Excel'), color: 'from-emerald-500 to-green-600' },
    { icon: WrenchScrewdriverIcon, title: t('sys_maintenance', 'الصيانة والخدمات'), desc: t('sys_maintenance_d', 'طلبات صيانة، حجز خدمات، تقييم بعد الإنجاز'), color: 'from-amber-500 to-orange-600' },
    { icon: DocumentTextIcon, title: t('sys_contracts', 'إدارة العقود'), desc: t('sys_contracts_d', 'عقود المزودين مع تنبيهات تلقائية قبل الانتهاء'), color: 'from-indigo-500 to-purple-600' },
    { icon: StarIcon, title: t('sys_ratings', 'تقييمات الرضا'), desc: t('sys_ratings_d', 'تقييم 5 نجوم مع تنبيه ذكي عند انخفاض الرضا'), color: 'from-yellow-500 to-amber-600' },
    { icon: ExclamationTriangleIcon, title: t('sys_complaints', 'الشكاوى والاقتراحات'), desc: t('sys_complaints_d', 'تقديم شكاوى واقتراحات مع متابعة حالتها ورد الإدارة'), color: 'from-red-500 to-rose-600' },
    { icon: CalendarDaysIcon, title: t('sys_facilities', 'حجز المرافق'), desc: t('sys_facilities_d', 'حجز صالات، ملاعب، مسبح، قاعات اجتماعات بتقويم ذكي'), color: 'from-cyan-500 to-teal-600' },
    { icon: BellIcon, title: t('sys_notifications', 'إشعارات ذكية'), desc: t('sys_notifications_d', 'تنبيهات فورية للمدراء عند كل حدث مهم في المجتمع'), color: 'from-pink-500 to-rose-600' },
    { icon: ChartBarIcon, title: t('sys_analytics', 'تحليلات وتقارير'), desc: t('sys_analytics_d', 'لوحة تحكم حية، مقارنة شهرية، تقرير يومي تلقائي بالبريد'), color: 'from-violet-500 to-purple-600' },
    { icon: ShieldCheckIcon, title: t('sys_roles', 'أدوار وصلاحيات'), desc: t('sys_roles_d', '6 أدوار: مالك، شركة، مدير، إداري، أمن، مقيم'), color: 'from-gray-600 to-gray-800' },
    { icon: ChatBubbleLeftEllipsisIcon, title: t('sys_comms', 'مركز التواصل'), desc: t('sys_comms_d', 'رسائل، إعلانات، أحداث، إشعارات للمجتمع'), color: 'from-sky-500 to-blue-600' },
    { icon: ArrowDownTrayIcon, title: t('sys_export', 'تصدير وطباعة'), desc: t('sys_export_d', 'PDF عربي احترافي، Excel بـ 5 أوراق، طباعة مباشرة'), color: 'from-teal-500 to-emerald-600' },
    { icon: QrCodeIcon, title: t('sys_visitors', 'إدارة الزوار + QR'), desc: t('sys_visitors_d', 'دعوات الزوار، QR Code، مسح الأمن، سجل دخول/خروج كامل'), color: 'from-fuchsia-500 to-pink-600' },
    { icon: ClipboardDocumentCheckIcon, title: t('sys_polls', 'الاستطلاعات والتصويت'), desc: t('sys_polls_d', 'تصويت ديمقراطي على القرارات، استطلاعات رأي، نتائج فورية'), color: 'from-lime-500 to-green-600' },
    { icon: PresentationChartBarIcon, title: t('sys_pdf_reports', 'تقارير PDF متقدمة'), desc: t('sys_pdf_reports_d', 'Portfolio Report للشركات، تقارير شهرية تلقائية، تخصيص قالب'), color: 'from-rose-500 to-red-600' },

    // ✨ NEW AI Systems
    { icon: SparklesIcon, title: '✨ ' + t('sys_ai_chat', 'مساعد HomeMe الذكي'), desc: t('sys_ai_chat_d', 'شات AI عائم بـ Gemini يجاوب فوراً ويوجّه المستخدمين لصفحات التطبيق'), color: 'from-violet-500 to-purple-600', isAI: true },
    { icon: LightBulbIcon, title: '🧠 ' + t('sys_ai_advisor', 'مستشار AI استباقي'), desc: t('sys_ai_advisor_d', 'يحلل البيانات يومياً ويكتشف 6 مشاكل + يقترح إجراءات تنفيذية'), color: 'from-purple-500 to-fuchsia-600', isAI: true },
    { icon: ClockIcon, title: '🤖 ' + t('sys_autopilot', 'AI Auto-Pilot'), desc: t('sys_autopilot_d', 'جدولة تنفيذ الإجراءات تلقائياً (يومي/أسبوعي) + ملخص أسبوعي بالبريد'), color: 'from-fuchsia-500 to-pink-600', isAI: true },
    { icon: EnvelopeIcon, title: '📨 ' + t('sys_auto_credentials', 'إرسال بيانات الدخول تلقائياً'), desc: t('sys_auto_credentials_d', 'كل ساكن جديد (فردي أو bulk) يحصل على بريد ترحيب RTL تلقائياً'), color: 'from-indigo-500 to-violet-600', isAI: true },
    { icon: ArrowPathIcon, title: '🔁 ' + t('sys_stripe_recurring', 'Stripe Auto-Renewal'), desc: t('sys_stripe_recurring_d', 'اشتراك يجدد نفسه تلقائياً + خصم 17% للسنوي + Customer Portal'), color: 'from-emerald-500 to-teal-600', isAI: true },
    { icon: PresentationChartBarIcon, title: '📊 ' + t('sys_sub_analytics', 'تحليلات الاشتراكات'), desc: t('sys_sub_analytics_d', 'MRR + ARR + Churn + Trial→Paid + Migration Tool للأدمن'), color: 'from-cyan-500 to-blue-600', isAI: true },
    { icon: GlobeAltIcon, title: '🌐 ' + t('sys_multilang', '3 لغات + ترجمة AI'), desc: t('sys_multilang_d', 'AR/EN/FR + Owner Editor مع زر "ترجم بـ AI" عبر Gemini'), color: 'from-blue-500 to-indigo-600', isAI: true },

    // Smart devices (coming soon)
    { icon: BoltIcon, title: t('sys_smart', 'الأجهزة الذكية'), desc: t('sys_smart_d', 'تحكم بالإضاءة + التكييف + الكاميرات + الأقفال (قريباً)'), color: 'from-amber-500 to-yellow-600', comingSoon: true },
  ];

  const accountTypes = [
    { id: 'compound_admin', icon: BuildingOfficeIcon, title: t('hp_reg_compound'), desc: t('hp_reg_compound_desc'), color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50/80 border-blue-200 hover:border-blue-400', features: [t('feat_create_compound', 'إنشاء المجتمع'), t('feat_add_residents', 'إضافة السكان'), t('feat_assign_roles', 'تعيين الأمن والإداريين'), t('feat_manage_budget', 'إدارة الميزانية')] },
    { id: 'company_admin', icon: BuildingOffice2Icon, title: t('hp_reg_company'), desc: t('hp_reg_company_desc'), color: 'from-purple-500 to-indigo-600', bg: 'bg-purple-50/80 border-purple-200 hover:border-purple-400', features: [t('feat_multi_compound', 'إدارة عدة مجتمعات'), t('feat_unified_reports', 'تقارير موحدة'), t('feat_contract_mgmt', 'إدارة العقود'), t('feat_full_analytics', 'تحليلات شاملة')] },
    { id: 'resident', icon: UserIcon, title: t('hp_reg_resident'), desc: t('hp_reg_resident_desc'), color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50/80 border-emerald-200 hover:border-emerald-400', features: [t('feat_maint_requests', 'طلبات صيانة'), t('feat_book_facilities', 'حجز مرافق'), t('feat_pay_dues', 'دفع التزامات'), t('feat_complaints', 'شكاوى واقتراحات')] },
  ];

  const guideItems = [
    { id: 'overview', icon: HomeModernIcon, title: t('gd_overview', 'نظرة عامة على المنصة'), content: t('gd_overview_d', 'منصة سحابية متكاملة لإدارة المجتمعات السكنية تضم 25+ نظام. تدعم العربية بالكامل (RTL)، 3 لغات (AR/EN/FR)، تطبيق PWA، ومدعومة بالذكاء الاصطناعي. تخدم +100 مجمع و+30 شركة إدارة.') },
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
    { id: 'smart', icon: BoltIcon, title: t('gd_smart', 'الأجهزة الذكية (قريباً)'), content: t('gd_smart_d', 'تحكم ذكي بالإضاءة، التكييف، الكاميرات، الأقفال الذكية، أنظمة الأمان. أوامر عربية بالذكاء الاصطناعي. تكامل مع Google Home + Apple HomeKit + Alexa.') },
  ];

  const fx = currency === 'egp' ? 1 : 0.02; // 1 EGP ≈ 0.02 USD
  const sym = currency === 'egp' ? (i18n.language?.startsWith('ar') ? 'ج.م' : 'EGP') : '$';
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
      monthly: 800,
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
      monthly: 1500,
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
      monthly: 2800,
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
      monthly: 4000,
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
      monthly: 9500,
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
      monthly: 25000,
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
              <span className="text-xs text-gray-500 font-medium">{t('hp_subtitle')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login?owner_only=1')}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all group relative"
              data-testid="owner-quick-login"
              title={t('hp_owner_login_tooltip', 'دخول المالك / السوبر أدمن فقط')}
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

      {/* 22 Systems */}
      <section className="py-16" id="systems" data-testid="systems-section">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_22_systems', '22 نظام متكامل')}</h2>
            <p className="text-gray-500">{t('hp_systems_desc', 'كل الأدوات التي تحتاجها لإدارة مجتمعك السكني باحترافية + ميزات AI متقدمة')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {systems.map((sys, i) => {
              const Icon = sys.icon;
              return (
                <div key={i} className={`bg-white rounded-xl border p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all group relative ${
                  sys.isAI ? 'border-violet-200 bg-gradient-to-br from-violet-50/40 to-fuchsia-50/30' : 'border-gray-100'
                }`}>
                  {sys.isAI && (
                    <span className="absolute -top-2 -right-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md">
                      جديد ✨
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
                  <h4 className={`font-bold mb-1 ${sys.isAI ? 'text-violet-900' : 'text-gray-900'}`}>{sys.title}</h4>
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

      {/* 🎬 Live Demo Section — interactive previews */}
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
                    <p className="text-[10px] opacity-80">Gemini AI · يجاوب فوراً</p>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-2 bg-gray-50 min-h-[260px]">
                {/* User msg */}
                <div className="flex justify-end">
                  <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl rounded-br-sm px-3 py-2 text-xs max-w-[85%] shadow">
                    إزاي أحجز نادي رياضي؟
                  </div>
                </div>
                {/* AI msg */}
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2 text-xs max-w-[90%] shadow-sm">
                    <p className="text-gray-800 leading-relaxed">يمكنك حجز النادي من صفحة "حجز المرافق". اختر التاريخ والوقت ثم اضغط تأكيد ✨</p>
                    <button className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-violet-50 text-violet-700 border border-violet-200">
                      → افتح الصفحة
                    </button>
                  </div>
                </div>
                {/* Typing indicator */}
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
                {/* Insight 1 */}
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
                {/* Insight 2 */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-base">🔧</div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-900">3 طلبات صيانة معلقة</p>
                      <p className="text-[10px] text-gray-600 leading-snug mt-0.5">لم يتم البت فيها منذ أسبوع+</p>
                    </div>
                  </div>
                </div>
                {/* Insight 3 */}
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
                {/* Stat tile */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-3 text-white">
                  <p className="text-[10px] font-bold opacity-90">إيراد شهري متكرر</p>
                  <p className="text-2xl font-black mt-1">31,000 <span className="text-xs opacity-75">ج.م</span></p>
                  <p className="text-[10px] opacity-80 mt-0.5">↗ +18% عن الشهر الماضي</p>
                </div>
                {/* Mini bars */}
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
                {/* Churn / Trial */}
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
              <div className={`mt-4 border rounded-xl p-5 animate-in fade-in ${isAI ? 'bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 border-violet-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-start gap-3">
                  <div className={`text-white p-2.5 rounded-lg flex-shrink-0 ${isAI ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600' : 'bg-blue-600'}`}>
                    <SelIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold mb-1 ${isAI ? 'text-violet-900' : 'text-blue-900'}`}>{selected.title}</h3>
                    <p className="text-gray-700 text-sm leading-relaxed">{selected.content}</p>
                  </div>
                  <button onClick={() => setOpenGuide(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                    <ChevronUpIcon className="h-5 w-5" />
                  </button>
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

      {/* ❓ FAQ Section */}
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
            {[
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
                a: 'هتلاقي زرار عائم بنفسجي ✨ في الزاوية في كل صفحة. اضغطي عليه واسألي أي سؤال بالعربي عن استخدام التطبيق (إزاي أرفع إيصال؟ إزاي أحجز نادي؟). المساعد يجاوب فوراً + يديك زر "افتح الصفحة" ينقلك للمكان المطلوب. مدعوم بـ Gemini AI.',
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
            ].map((faq, i) => (
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
                  {t('hp_yearly')}
                  <span className="absolute -top-2.5 -left-2 px-1.5 py-0.5 bg-green-500 text-[9px] font-bold rounded-full text-white">{t('hp_2months_free')}</span>
                </button>
              </div>
              {/* Currency Toggle */}
              <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                <button onClick={() => setCurrency('egp')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currency === 'egp' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`} data-testid="toggle-egp">{t('hp_egp', 'ج.م EGP')}</button>
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
                      <span className="text-3xl font-black">{t('hp_free')}</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-black">{isYearly ? yearlyOf(plan.monthly) : priceOf(plan.monthly)}</span>
                        <span className="text-xs text-gray-400">{sym} / {isYearly ? t('hp_per_year') : t('hp_per_month')}</span>
                      </div>
                      {isYearly && plan.monthly > 0 && (
                        <p className="text-[10px] text-gray-500 mt-1 line-through">{priceOf(plan.monthly * 12)} {sym} / {t('hp_yearly_no_disc', 'سنوياً بدون خصم')}</p>
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
                    <th className="text-center py-3 px-3 font-bold text-gray-400">{t('plan_starter')}</th>
                    <th className="text-center py-3 px-3 font-bold text-sky-400">{t('plan_basic')}</th>
                    <th className="text-center py-3 px-3 font-bold text-blue-400">{t('plan_pro')}</th>
                    <th className="text-center py-3 px-3 font-bold text-violet-400">{t('plan_premium')}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feat, i) => (
                    <tr key={i} className={`${i % 2 === 0 ? 'bg-white/[0.02]' : ''} ${feat.highlight ? 'bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10' : ''}`}>
                      <td className={`py-2.5 px-4 text-xs ${feat.highlight ? 'text-violet-200 font-semibold' : 'text-gray-300'}`}>{feat.name}</td>
                      {['starter', 'basic', 'pro', 'premium'].map(tier => {
                        const val = feat[tier];
                        return (
                          <td key={tier} className="text-center py-2.5 px-3">
                            {val === true ? (
                              <CheckCircleIcon className="h-4 w-4 text-green-400 mx-auto" />
                            ) : typeof val === 'string' ? (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{val}</span>
                            ) : (
                              <span className="text-gray-600 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Price row */}
                  <tr className="bg-white/5 border-t border-white/10">
                    <td className="py-3 px-4 font-bold text-white text-xs">{t('hp_price_label')} {isYearly ? t('hp_yearly_price') : t('hp_monthly_price')}</td>
                    <td className="text-center py-3 px-3 text-xs font-bold text-gray-300">{t('hp_free')}</td>
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
                {t('hp_sub_codes')}
              </div>
              <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_have_code')}</h3>
              <p className="text-gray-400 text-sm">{t('hp_code_desc')}</p>
            </div>
            <div className="grid grid-cols-5 gap-3 mb-6">
              {[
                { label: t('dur_3m', '3 شهور'), icon: '3m', color: 'border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10' },
                { label: t('dur_6m', '6 شهور'), icon: '6m', color: 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10' },
                { label: t('dur_9m', '9 شهور'), icon: '9m', color: 'border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10' },
                { label: t('dur_1y', 'سنة'), icon: '1Y', color: 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10' },
                { label: t('dur_lifetime', 'مدى الحياة'), icon: '∞', color: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10' },
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
                {codeLoading ? '...' : t('hp_activate_code')}
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
                {t('hp_for_companies')}
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
                      <span className="text-2xl font-black">{t('hp_custom_price', 'سعر مخصص')}</span>
                    ) : (
                      <div>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl font-black">{isYearly ? yearlyOf(plan.monthly) : priceOf(plan.monthly)}</span>
                          <span className="text-xs text-gray-400">{sym} / {isYearly ? t('hp_per_year') : t('hp_per_month')}</span>
                        </div>
                        {isYearly && (
                          <p className="text-[10px] text-gray-500 mt-1 line-through">{priceOf(plan.monthly * 12)} {sym} / {t('hp_yearly_no_disc', 'سنوياً بدون خصم')}</p>
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
                    <th className="text-center py-3 px-3 font-bold text-amber-400">{t('cp_startup')}</th>
                    <th className="text-center py-3 px-3 font-bold text-orange-400">{t('cp_business')}</th>
                    <th className="text-center py-3 px-3 font-bold text-red-400">{t('cp_enterprise')}</th>
                  </tr>
                </thead>
                <tbody>
                  {companyComparisonFeatures.map((feat, i) => (
                    <tr key={i} className={`${i % 2 === 0 ? 'bg-white/[0.02]' : ''} ${feat.highlight ? 'bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10' : ''}`}>
                      <td className={`py-2.5 px-4 text-xs ${feat.highlight ? 'text-violet-200 font-semibold' : 'text-gray-300'}`}>{feat.name}</td>
                      {['startup', 'business', 'enterprise'].map(tier => (
                        <td key={tier} className="text-center py-2.5 px-3">
                          {typeof feat[tier] === 'string' ? (
                            <span className={`text-[10px] font-bold ${feat.highlight ? 'text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded' : 'text-amber-300'}`}>{feat[tier]}</span>
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
                    <td className="py-3 px-4 font-bold text-white text-xs">{t('hp_price_label')} {isYearly ? t('hp_yearly_price') : t('hp_monthly_price')}</td>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: KeyIcon,
                title: t('role_super_admin', 'مالك التطبيق'),
                desc: t('role_super_desc_full', 'تحكم كامل بكل المنصة على مستوى الـ Owner.'),
                color: 'from-purple-500 to-indigo-600',
                bg: 'bg-purple-50 border-purple-200',
                text: 'text-purple-700',
                permissions: [
                  '✅ إدارة الشركات والمجمعات (CRUD كامل)',
                  '✅ تحليلات الإيرادات (MRR / ARR / Churn)',
                  '✅ إدارة الاشتراكات والكوبونات',
                  '✅ محرّر الصفحات القانونية + الترجمة',
                  '✅ سجل التدقيق والصحة العامة',
                  '✅ إدارة الترجمات والقوالب',
                ],
              },
              {
                icon: BuildingOffice2Icon,
                title: t('role_company_admin', 'إدارة شركة عقارية'),
                desc: t('role_company_desc_full', 'إدارة عدة مجتمعات سكنية تابعة لشركتها.'),
                color: 'from-indigo-500 to-blue-600',
                bg: 'bg-indigo-50 border-indigo-200',
                text: 'text-indigo-700',
                permissions: [
                  '✅ إدارة كل المجمعات التابعة للشركة',
                  '✅ تقارير Portfolio PDF موحّدة',
                  '✅ إنشاء مدراء مجمعات جدد',
                  '✅ تفعيل التجديد التلقائي عبر Stripe',
                  '✅ AI Auto-Pilot لكل المجمعات',
                  '🔒 لا يصل لميزات Owner-only',
                ],
              },
              {
                icon: HomeModernIcon,
                title: t('role_admin', 'مدير مجمع'),
                desc: t('role_admin_desc_full', 'مسؤول كامل عن مجمع واحد محدد.'),
                color: 'from-blue-500 to-cyan-600',
                bg: 'bg-blue-50 border-blue-200',
                text: 'text-blue-700',
                permissions: [
                  '✅ إدارة السكان والوحدات والعقود',
                  '✅ النظام المالي (فواتير، إيصالات، مصروفات)',
                  '✅ الصيانة + حجز المرافق + الزوار',
                  '✅ مستشار AI + AI Auto-Pilot للمجمع',
                  '✅ الإعلانات والاستطلاعات والشكاوى',
                  '🔒 لا يصل للمجمعات الأخرى',
                ],
              },
              {
                icon: ClipboardDocumentCheckIcon,
                title: t('role_manager', 'إداري / Manager'),
                desc: t('role_manager_desc_full', 'متابعة يومية مع صلاحيات محدودة.'),
                color: 'from-emerald-500 to-teal-600',
                bg: 'bg-emerald-50 border-emerald-200',
                text: 'text-emerald-700',
                permissions: [
                  '✅ متابعة طلبات الصيانة والشكاوى',
                  '✅ مراجعة إيصالات الدفع',
                  '✅ إدارة الزوار والحجوزات',
                  '✅ استقبال إشعارات AI Auto-Pilot',
                  '🔒 لا يقدر يعدّل الفواتير المالية',
                  '🔒 لا يقدر يحذف سكان',
                ],
              },
              {
                icon: ShieldCheckIcon,
                title: t('role_security', 'موظف أمن'),
                desc: t('role_security_desc_full', 'تحكم في البوابات والزوار.'),
                color: 'from-amber-500 to-orange-600',
                bg: 'bg-amber-50 border-amber-200',
                text: 'text-amber-700',
                permissions: [
                  '✅ مسح QR Code للزوار',
                  '✅ تسجيل دخول/خروج المركبات',
                  '✅ إدارة قائمة الزوار اليومية',
                  '✅ تنبيهات أمنية فورية',
                  '🔒 لا يصل للنظام المالي',
                  '🔒 لا يصل لبيانات شخصية حساسة',
                ],
              },
              {
                icon: UserIcon,
                title: t('role_resident', 'ساكن / Resident'),
                desc: t('role_resident_desc_full', 'استخدام خدمات المجمع وتسديد المستحقات.'),
                color: 'from-teal-500 to-cyan-600',
                bg: 'bg-teal-50 border-teal-200',
                text: 'text-teal-700',
                permissions: [
                  '✅ عرض الفواتير ورفع إيصالات الدفع',
                  '✅ طلب صيانة + حجز المرافق',
                  '✅ دعوة زوار + توليد QR لهم',
                  '✅ شات AI لأسئلة الاستخدام',
                  '✅ المشاركة في الاستطلاعات',
                  '🔒 يصل لبياناته الشخصية فقط',
                ],
              },
            ].map((role, i) => {
              const Icon = role.icon;
              return (
                <div key={i} className={`rounded-2xl p-5 border-2 ${role.bg} hover:shadow-xl transition-all group`} data-testid={`role-card-${i}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className={`font-bold text-base ${role.text}`}>{role.title}</h4>
                      <p className="text-[11px] text-gray-500 leading-tight">{role.desc}</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5 mt-3">
                    {role.permissions.map((perm, idx) => (
                      <li key={idx} className="text-[11px] text-gray-700 leading-relaxed flex items-start gap-1">
                        <span>{perm}</span>
                      </li>
                    ))}
                  </ul>
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
              <a href="#systems" className="hover:text-white transition-colors">{t('hp_22_systems', '22 نظام متكامل')}</a>
              <a href="#ai-features" className="hover:text-white transition-colors">✨ {t('hp_whats_new', 'ما الجديد')}</a>
              <a href="#faq" className="hover:text-white transition-colors">❓ {t('hp_faq', 'الأسئلة الشائعة')}</a>
              <Link to="/login" className="hover:text-white transition-colors">{t('sign_in', 'تسجيل الدخول')}</Link>
            </div>
            <p className="text-xs">&copy; {new Date().getFullYear()} HomeMe - {t('hp_all_rights', 'جميع الحقوق محفوظة')}</p>
          </div>

          {/* Legal Links Row */}
          <div className="mt-6 pt-4 border-t border-gray-800 flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs">
            <Link to="/legal/about" className="hover:text-white transition-colors" data-testid="footer-legal-about">من نحن</Link>
            <span className="opacity-50">·</span>
            <Link to="/legal/privacy" className="hover:text-white transition-colors" data-testid="footer-legal-privacy">سياسة الخصوصية</Link>
            <span className="opacity-50">·</span>
            <Link to="/legal/terms" className="hover:text-white transition-colors" data-testid="footer-legal-terms">شروط الاستخدام</Link>
            <span className="opacity-50">·</span>
            <Link to="/legal/contact" className="hover:text-white transition-colors" data-testid="footer-legal-contact">اتصل بنا</Link>
            <span className="opacity-50">·</span>
            <span className="text-gray-500">Powered by Data Life AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
