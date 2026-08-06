import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpenIcon, ChevronDownIcon, ChevronRightIcon,
  UserGroupIcon, BuildingOfficeIcon, HomeModernIcon,
  WrenchScrewdriverIcon, CurrencyDollarIcon, ShieldCheckIcon,
  SparklesIcon, BellIcon, QrCodeIcon, StarIcon,
  DocumentTextIcon, ArrowDownTrayIcon, PhoneIcon,
  ChatBubbleLeftEllipsisIcon, BanknotesIcon, NoSymbolIcon,
  MagnifyingGlassIcon, CheckCircleIcon, ArrowTopRightOnSquareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// ── Data ────────────────────────────────────────────────────────────
const CHAPTERS = [
  {
    id: 'start', icon: HomeModernIcon, color: 'from-emerald-500 to-teal-600',
    badge: 'أساسي',
    title: 'البداية السريعة',
    desc: 'أنشئ حسابك وأعدّ كمبوندك في 30 دقيقة',
    sections: [
      { title: 'إنشاء الحساب', steps: [
        { s: 'افتح homemeapp.net واضغط "ابدأ مجاناً"' },
        { s: 'اختر نوع حسابك: كمبوند / شركة إدارة / ساكن' },
        { s: 'أدخل الاسم، الإيميل، كلمة المرور، اسم الكمبوند' },
        { s: 'فعّل الإيميل من رسالة التفعيل (مطلوب)', warn: true },
      ]},
      { title: 'إعداد الكمبوند', steps: [
        { s: 'ارفع شعار الكمبوند — يظهر في الفواتير والرسائل', tip: 'أهم خطوة للهوية البصرية' },
        { s: 'أضف العنوان، الهاتف، عدد المباني والوحدات' },
        { s: 'الإعدادات → السكان والوحدات → أضف وحداتك (A1, B2…)' },
        { s: 'حدد طرق الدفع المقبولة: فودافون كاش، إنستاباي، بنك…' },
      ]},
      { title: 'إضافة السكان', steps: [
        { s: 'يدوياً: + إضافة ساكن → بيانات + وحدة + دور', tip: 'للأعداد الصغيرة' },
        { s: 'بالجملة: مركز الاستيراد → قالب Excel → رفع الملف', tip: 'للأعداد الكبيرة' },
        { s: 'يُرسل بريد ترحيب تلقائياً لكل ساكن ببياناته', tip: 'مدعوم بلوجو HomeMe الرسمي' },
      ]},
    ],
  },
  {
    id: 'finance', icon: CurrencyDollarIcon, color: 'from-blue-500 to-indigo-600',
    badge: 'مهم',
    title: 'المالية والفواتير',
    desc: 'فواتير، أقساط، تأكيد مدفوعات، تقارير',
    sections: [
      { title: 'إنشاء فاتورة شهرية', steps: [
        { s: 'المالية → إنشاء فاتورة → حدد النوع' },
        { s: 'طريقة التوزيع: بالتساوي / بالمساحة / بالوحدة / مخصص' },
        { s: 'حدد تاريخ الاستحقاق' },
        { s: '"إرسال للجميع" → بريد لكل ساكن تلقائياً' },
      ]},
      { title: '🧾 تأكيد إيصالات الدفع', badge: 'جديد', steps: [
        { s: 'الساكن يرفع صورة الإيصال من التطبيق', tip: 'يظهر في قائمة بانتظار المراجعة' },
        { s: 'يصلك إشعار: "ساكن رفع إيصال دفع"' },
        { s: 'المدفوعات → إيصالات بانتظار → افتح الإيصال وراجعه' },
        { s: 'تحقق: المبلغ، طريقة الدفع، التاريخ، رقم المرجع' },
        { s: '"✅ تم الدفع" → يُحدَّث الالتزام + يُضاف للإيرادات', tip: 'كل شيء يحدث تلقائياً' },
        { s: 'يصل للساكن إشعار "تم اعتماد إيصالك ✅"', tip: 'لو مرفوض: اضغط رفض واكتب السبب' },
      ]},
      { title: 'نظام الأقساط', steps: [
        { s: 'المالية → الأقساط والمديونيات → خطة قسط جديدة' },
        { s: 'أدخل المبلغ الإجمالي، عدد الأقساط، الفائدة (اختياري)' },
        { s: 'اربط بوحدة أو ساكن → ينشأ الجدول تلقائياً' },
        { s: 'التذكيرات تُرسل تلقائياً 3 أيام قبل الاستحقاق' },
      ]},
    ],
  },
  {
    id: 'workers', icon: WrenchScrewdriverIcon, color: 'from-amber-500 to-orange-600',
    badge: 'جديد',
    title: 'دليل العمال والصنايعية',
    desc: 'تقييمات موثّقة من السكان + قائمة سوداء',
    sections: [
      { title: 'إضافة عامل (الساكن)', steps: [
        { s: 'القائمة → الصيانة → دليل العمال → + إضافة عامل' },
        { s: 'أدخل الاسم، التخصص (13 خيار)، رقم الهاتف' },
        { s: 'اكتب تجربتك معه ومدى رضاك' },
        { s: 'اختر من 1 إلى 5 نجوم للتقييم' },
        { s: 'أضف ملاحظة مفيدة لباقي السكان' },
        { s: 'يذهب للمراجعة ← ينشر بعد موافقة الأدمن', warn: true },
      ]},
      { title: 'الموافقة والإدارة (الأدمن)', steps: [
        { s: 'يصلك إشعار عند إضافة ساكن عاملاً' },
        { s: 'دليل العمال → تبويب "قيد المراجعة"' },
        { s: '"موافقة" → ينشر فوراً | "رفض" → اكتب السبب' },
        { s: 'يمكنك إضافة تقييمك أيضاً على أي عامل' },
      ]},
      { title: '🚫 القائمة السوداء', badge: 'مهم', steps: [
        { s: 'افتح ملف العامل → اضغط "🚫 حجب"' },
        { s: 'اكتب سبب الحجب (إلزامي وموثّق)', warn: true },
        { s: 'يُخفى من الدليل فوراً ويظهر في "القائمة السوداء"' },
        { s: 'يسري على الكمبوند + شركة الإدارة + الأونر', tip: 'حماية شاملة لكل المستأجرين' },
        { s: 'رفع الحجب: القائمة السوداء → "رفع الحجب"' },
      ]},
    ],
  },
  {
    id: 'residents', icon: UserGroupIcon, color: 'from-purple-500 to-fuchsia-600',
    badge: 'للساكن',
    title: 'دليل الساكن',
    desc: 'كل ما يحتاجه الساكن يومياً',
    sections: [
      { title: 'الفواتير والدفع', steps: [
        { s: 'المدفوعات → الفواتير الحالية' },
        { s: '🟢 مدفوع | 🟡 مستحق | 🔴 متأخر' },
        { s: 'ارفع إيصال: الفاتورة → "رفع إيصال" → صوّر أو ارفع PDF' },
        { s: 'أو ادفع أونلاين: "ادفع الآن" → Visa / Stripe' },
        { s: 'يصلك إشعار بالتأكيد أو سبب الرفض' },
      ]},
      { title: 'طلب صيانة', steps: [
        { s: 'الصيانة → + طلب جديد' },
        { s: 'اختر النوع: سباكة / كهرباء / تكييف / مصعد…' },
        { s: 'اكتب وصفاً واضحاً وأرفق صوراً' },
        { s: 'تصلك إشعارات عند تحديث حالة الطلب' },
        { s: 'بعد الإنجاز: قيّم الخدمة من 1 إلى 5 نجوم' },
      ]},
      { title: 'دعوة الزوار', steps: [
        { s: 'دعواتي → + دعوة زائر' },
        { s: 'أدخل الاسم، التاريخ، المدة' },
        { s: 'أرسل QR Code للزائر عبر واتساب' },
        { s: 'الأمن يمسح القر عند البوابة ويفتح', tip: 'صالح فقط في اليوم المحدد' },
      ]},
      { title: 'نشر إعلان وحدة', badge: 'جديد', steps: [
        { s: 'وحدات للإيجار → + إضافة إعلان' },
        { s: 'حدد: إيجار / بيع / تشطيب / مبادلة' },
        { s: 'أدخل السعر، حالة الأثاث، التشطيب' },
        { s: 'ارفع حتى 8 صور + أوراق الوحدة' },
        { s: 'ينتظر موافقة الأدمن ثم يُنشر' },
      ]},
    ],
  },
  {
    id: 'security', icon: ShieldCheckIcon, color: 'from-red-500 to-rose-600',
    badge: 'للأمن',
    title: 'دليل موظف الأمن',
    desc: 'مسح QR، تتبع المركبات، البلاغات',
    sections: [
      { title: 'مسح QR الزوار', steps: [
        { s: 'الصفحة الرئيسية → "مسح QR الزوار"' },
        { s: 'وجّه كاميرا الهاتف للـ QR' },
        { s: 'تظهر: اسم الزائر، الوحدة، المدة، صورة المضيف' },
        { s: '"سماح" أو "رفض" — يُسجَّل الوقت تلقائياً' },
      ]},
      { title: 'تتبع المركبات', steps: [
        { s: 'خريطة الكمبوند → مواقع مركبات الأمن مباشرة' },
        { s: 'حدّث موقعك أثناء الدورية من هاتفك' },
      ]},
      { title: 'بلاغ أمني', steps: [
        { s: 'البلاغات الأمنية → + بلاغ جديد' },
        { s: 'النوع: شجار / سرقة / حريق / مشبوه / أخرى' },
        { s: 'الموقع والوصف وصورة إن أمكن' },
        { s: 'يصل للإدارة فوراً كإشعار عاجل', warn: true },
      ]},
    ],
  },
  {
    id: 'ai', icon: SparklesIcon, color: 'from-violet-500 to-purple-700',
    badge: 'AI',
    title: 'الذكاء الاصطناعي',
    desc: 'مساعد Claude AI + مستشار استباقي + Auto-Pilot',
    sections: [
      { title: '✨ مساعد HomeMe (Claude AI)', steps: [
        { s: 'الزرار البنفسجي ✨ في أسفل يمين أي صفحة' },
        { s: 'اسأل بالعربي: "إزاي أحجز نادي؟" / "فين الفواتير؟"' },
        { s: 'يجاوب فوراً ويعطيك زر "افتح الصفحة"', tip: 'Deep Link ينقلك مباشرة' },
        { s: 'حد 20 رسالة / يوم — يتجدد منتصف الليل' },
      ]},
      { title: '🧠 المستشار AI الاستباقي', steps: [
        { s: 'يحلل بيانات الكمبوند يومياً تلقائياً' },
        { s: 'يكتشف: فواتير متأخرة، صيانة معلقة، تقييمات سلبية' },
        { s: 'زر "⚡ تنفيذ بالـ AI" → يرسل رسائل جماعية احترافية' },
      ]},
      { title: '🤖 AI Auto-Pilot', steps: [
        { s: 'جدول تذكيرات تلقائية: أسبوعي / شهري' },
        { s: 'الإعدادات → Auto-Pilot → فعّل الإجراءات المطلوبة' },
        { s: 'ملخص أسبوعي مفصّل بالبريد كل اثنين الصبح' },
      ]},
    ],
  },
  {
    id: 'company', icon: BuildingOfficeIcon, color: 'from-teal-500 to-emerald-700',
    badge: 'للشركة',
    title: 'دليل شركة الإدارة',
    desc: 'إدارة عدة كمبوندات من لوحة موحدة',
    sections: [
      { title: 'إعداد الشركة', steps: [
        { s: 'homemeapp.net → "ابدأ مجاناً" → "شركة إدارة"' },
        { s: 'wizard في 3 خطوات: بيانات الشركة / الاشتراك / أول كمبوند' },
        { s: 'الداشبورد → "+ إضافة مجمع" لكل كمبوند جديد' },
        { s: 'لكل كمبوند: عيّن مديراً بحساب خاص وصلاحيات' },
      ]},
      { title: 'اللوحة الموحدة', steps: [
        { s: 'كل الكمبوندات في شاشة واحدة مع إحصائياتهم' },
        { s: 'دليل العمال والقائمة السوداء موحدة لكل الكمبوندات' },
        { s: 'مقارنة الأداء: إيرادات / سكان / شكاوى / صيانة' },
        { s: 'تقرير PDF تنفيذي تلقائي كل أول شهر' },
      ]},
      { title: 'إدارة كمبوند كامل', steps: [
        { s: 'اختر الكمبوند من قائمتك' },
        { s: '"إدارة الكمبوند الكاملة" الزرار الأخضر' },
        { s: 'نفس صلاحيات مدير الكمبوند: سكان، مالية، عمال، إعلانات' },
        { s: 'اضغط "رجوع" للعودة للداشبورد الموحد' },
      ]},
    ],
  },
  {
    id: 'pricing', icon: CurrencyDollarIcon, color: 'from-emerald-500 to-teal-600',
    badge: 'الأسعار',
    title: 'خطط الاشتراك والأسعار',
    desc: 'خطط المجمعات السكنية + شركات الإدارة بالجنيه المصري',
    sections: [
      { title: 'خطط المجمعات السكنية', steps: [
        { s: '🆓 مجاني (Starter) — 0 ج.م — حتى 30 ساكن', tip: 'إدارة أساسية، صيانة، تقرير شهري، بوابة المقيم' },
        { s: '📘 أساسي (Basic) — 1,200 ج.م/شهر — حتى 100 ساكن', tip: 'وفر 2,880 ج.م مع التجديد السنوي' },
        { s: '⭐ احترافي (Pro) — 2,200 ج.م/شهر — عدد غير محدود', tip: 'الأكثر طلباً — وفر 5,280 ج.م سنوياً' },
        { s: '💎 متقدم (Premium) — 4,000 ج.م/شهر — كل شيء غير محدود', tip: 'وفر 9,600 ج.م مع التجديد السنوي' },
      ]},
      { title: 'خطط شركات الإدارة', steps: [
        { s: '🌱 شركة ناشئة (Startup) — 5,500 ج.م/شهر — حتى 3 مجتمعات', tip: 'وفر 13,200 ج.م مع التجديد السنوي' },
        { s: '🏢 شركة متوسطة (Business) — 13,000 ج.م/شهر — 1-8 مجتمعات', tip: 'الأفضل للشركات — وفر 31,200 ج.م سنوياً' },
        { s: '🏛️ شركة كبرى (Enterprise) — 35,000 ج.م/شهر — غير محدود', tip: 'وفر 84,000 ج.م مع التجديد السنوي' },
      ]},
      { title: 'ما يشمله كل خطة', steps: [
        { s: 'مجاني: إدارة مقيمين أساسية، طلبات صيانة، إشعارات محدودة، تقرير شهري' },
        { s: 'أساسي: + النظام المالي الكامل، تصدير Excel/PDF، مساعد AI (5 رسائل/يوم)' },
        { s: 'احترافي: + إدارة الزوار QR، تحليلات متقدمة، مساعد AI (20 رسالة/يوم)، مستشار AI استباقي' },
        { s: 'متقدم: + API مخصص، AI Auto-Pilot، مساعد AI (50 رسالة/يوم)، دعم 24/7', tip: 'كل شيء بلا حدود' },
        { s: 'جميع الخطط: تجربة مجانية 14 يوم بدون بطاقة ائتمان', tip: 'خصم 17% عند التجديد السنوي' },
      ]},
    ],
  },
  {
    id: 'support', icon: ChatBubbleLeftEllipsisIcon, color: 'from-pink-500 to-rose-600',
    badge: 'مساعدة',
    title: 'الدعم الفني والتواصل',
    desc: 'شات مباشر، البريد، الأسئلة الشائعة',
    sections: [
      { title: '💬 شات الدعم المباشر', badge: 'جديد', steps: [
        { s: 'الزرار الأخضر 💬 في أسفل يمين أي صفحة' },
        { s: 'اكتب رسالتك ← يرد عليك فريق الدعم' },
        { s: 'badge أحمر يظهر عند وصول رد جديد' },
        { s: 'كل محادثاتك السابقة محفوظة' },
      ]},
      { title: 'قنوات التواصل الأخرى', steps: [
        { s: '📧 البريد: info@datalifeai.com' },
        { s: '🌐 الموقع: homemeapp.net' },
        { s: '📚 قاعدة المعرفة: homemeapp.net/help' },
      ]},
    ],
  },
];

const PAYMENTS = [
  { name: 'Stripe (Visa/Master/Meeza)', icon: '💳', note: 'أونلاين — تلقائي', color: 'bg-blue-50 border-blue-200' },
  { name: 'Vodafone Cash', icon: '📱', note: '00201012625529', color: 'bg-red-50 border-red-200' },
  { name: 'InstaPay', icon: '⚡', note: '00201006008552', color: 'bg-emerald-50 border-emerald-200' },
  { name: 'تحويل بنكي', icon: '🏦', note: 'بنك الإسكندرية 144080699002', color: 'bg-indigo-50 border-indigo-200' },
  { name: 'PayPal', icon: '🌐', note: 'dalia_abouelmagd@hotmail.com', color: 'bg-sky-50 border-sky-200' },
  { name: 'نقدي', icon: '💵', note: 'مع المحاسب مباشرة', color: 'bg-green-50 border-green-200' },
];

// ── Component ───────────────────────────────────────────────────────
export default function UserGuidePage() {
  const { t } = useTranslation();
  const [activeChapter, setActiveChapter] = useState('start');
  const [openSections, setOpenSections] = useState({ 0: true });
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Search
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const q = search.toLowerCase();
    const results = [];
    CHAPTERS.forEach(ch => {
      ch.sections.forEach(sec => {
        const matched = sec.steps.filter(st => st.s.toLowerCase().includes(q));
        if (sec.title.toLowerCase().includes(q) || matched.length) {
          results.push({ chapter: ch.title, section: sec.title, chapterId: ch.id,
            steps: matched.length ? matched : sec.steps.slice(0, 2) });
        }
      });
    });
    setSearchResults(results.slice(0, 5));
  }, [search]);

  const chapter = CHAPTERS.find(c => c.id === activeChapter);
  const Icon = chapter?.icon || BookOpenIcon;

  const toggle = (i) => setOpenSections(p => ({ ...p, [i]: !p[i] }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950" dir="rtl">

      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <img src="/homeme-logo.png" alt="HomeMe" className="h-8 w-auto" onError={e => e.target.style.display='none'} />
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <div className="flex items-center gap-1.5">
              <BookOpenIcon className="h-4 w-4 text-emerald-600" />
              <span className="font-black text-gray-900 dark:text-white text-sm">دليل التشغيل</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full">v2.2</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://homemeapp.net/guide.pdf" download
              className="hidden sm:flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors">
              <ArrowDownTrayIcon className="h-3.5 w-3.5" /> تحميل PDF
            </a>
            <Link to="/register"
              className="text-xs bg-gray-900 dark:bg-white hover:opacity-90 text-white dark:text-gray-900 font-bold px-3 py-1.5 rounded-lg transition-colors">
              ابدأ مجاناً ←
            </Link>
          </div>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-800 to-emerald-900 py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white/20"
              style={{ width: `${(i+2)*120}px`, height: `${(i+2)*120}px`, top:'50%', left:'50%', transform:'translate(-50%,-50%)' }} />
          ))}
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <img src="/homeme-logo.png" alt="HomeMe" className="h-20 w-auto mx-auto mb-6 bg-white rounded-2xl p-3 shadow-xl" onError={e => e.target.style.display='none'} />
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 px-4 py-1.5 rounded-full text-sm text-white/80 mb-4">
            📖 دليل التشغيل الكامل — الإصدار 2.2 — أغسطس 2026
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight" style={{fontFamily:"'Cairo',sans-serif"}}>
            كل ما تحتاجه لإدارة<br/><span className="text-emerald-300">مجمعك السكني</span>
          </h1>
          <p className="text-emerald-100/80 text-base md:text-lg mb-8 max-w-2xl mx-auto">
            دليل شامل لـ 50 نظام متكامل — خطوة بخطوة لكل الأدوار
          </p>

          {/* Search */}
          <div className="max-w-lg mx-auto relative">
            <MagnifyingGlassIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ابحث في الدليل… (مثال: كيف أرفع إيصال)"
              className="w-full bg-white rounded-2xl pr-11 pl-4 py-3 text-sm text-gray-900 outline-none shadow-xl placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2">
                <XMarkIcon className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="absolute top-full right-0 left-0 max-w-lg mx-auto bg-white rounded-2xl shadow-2xl mt-2 overflow-hidden z-50 text-right border border-gray-100">
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => { setActiveChapter(r.chapterId); setSearch(''); window.scrollTo({top:300,behavior:'smooth'}); }}
                  className="w-full text-right px-4 py-3 hover:bg-emerald-50 border-b border-gray-100 last:border-0 transition-colors">
                  <p className="text-xs text-emerald-600 font-bold">{r.chapter} › {r.section}</p>
                  <p className="text-sm text-gray-700 mt-0.5">{r.steps[0]?.s}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="max-w-3xl mx-auto mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[['50','نظام متكامل'],['6','أدوار'],['3','لغات'],['14 يوم','تجربة مجانية']].map(([n,l]) => (
            <div key={l} className="bg-white/10 backdrop-blur rounded-xl p-3 text-center border border-white/10">
              <p className="text-2xl font-black text-emerald-300">{n}</p>
              <p className="text-xs text-white/70 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-6">

        {/* Sidebar nav - RIGHT side in RTL */}
        <aside className="lg:w-64 flex-shrink-0 order-2 lg:order-1">
          <div className="sticky top-20 space-y-1">
            <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">الفصول</p>
            {CHAPTERS.map(ch => {
              const ChIcon = ch.icon;
              const active = activeChapter === ch.id;
              return (
                <button key={ch.id} onClick={() => { setActiveChapter(ch.id); setOpenSections({ 0: true }); window.scrollTo({ top: 300, behavior: 'smooth' }); }}
                  className={`w-full text-right flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                    active ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <ChIcon className={`h-4 w-4 ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`} />
                  </div>
                  <span className="flex-1 font-bold leading-tight">{ch.title}</span>
                  {ch.badge && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      active ? 'bg-white/20 text-white' :
                      ch.badge === 'جديد' ? 'bg-blue-100 text-blue-700' :
                      ch.badge === 'AI' ? 'bg-violet-100 text-violet-700' :
                      ch.badge === 'مهم' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{ch.badge}</span>
                  )}
                </button>
              );
            })}

            {/* Quick links */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4 space-y-1">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 px-1">روابط سريعة</p>
              {[
                ['/','🏠 الصفحة الرئيسية'],
                ['/pricing','💰 الأسعار'],
                ['/faq','❓ الأسئلة الشائعة'],
                ['/blog','📝 المدونة'],
                ['/register','🚀 ابدأ مجاناً'],
              ].map(([to, label]) => (
                <Link key={to} to={to} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 order-1 lg:order-2">

          {/* Chapter header */}
          <div className={`bg-gradient-to-r ${chapter?.color} rounded-2xl p-6 mb-6 text-white`}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Icon className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black" style={{fontFamily:"'Cairo',sans-serif"}}>{chapter?.title}</h2>
                <p className="text-white/80 text-sm mt-0.5">{chapter?.desc}</p>
              </div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-3">
            {chapter?.sections.map((sec, si) => (
              <div key={si} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <button onClick={() => toggle(si)}
                  className="w-full text-right flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${chapter?.color} flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>
                      {si + 1}
                    </div>
                    <span className="font-bold text-gray-900 dark:text-white text-sm">{sec.title}</span>
                    {sec.badge && (
                      <span className="text-[9px] bg-blue-100 text-blue-700 font-black px-1.5 py-0.5 rounded-full">{sec.badge}</span>
                    )}
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform ${openSections[si] ? 'rotate-180' : ''} bg-gray-100 dark:bg-gray-700`}>
                    <ChevronDownIcon className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                </button>

                {openSections[si] && (
                  <div className="px-4 pb-4 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-4">
                    {sec.steps.map((step, idx) => (
                      <div key={idx} className={`flex gap-3 items-start p-3 rounded-xl ${
                        step.warn ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200' :
                        step.tip ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                        'bg-gray-50 dark:bg-gray-800'
                      }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black mt-0.5 ${
                          step.warn ? 'bg-amber-500 text-white' : `bg-gradient-to-br ${chapter?.color} text-white`
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm leading-relaxed ${step.warn ? 'text-amber-800 dark:text-amber-200 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                            {step.s}
                          </p>
                          {step.tip && (
                            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1">
                              💡 {step.tip}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Payment methods card */}
          {activeChapter === 'finance' && (
            <div className="mt-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h3 className="font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BanknotesIcon className="h-5 w-5 text-emerald-600" /> طرق الدفع المتاحة
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PAYMENTS.map(p => (
                  <div key={p.name} className={`flex items-center gap-3 p-3 rounded-xl border ${p.color}`}>
                    <span className="text-2xl">{p.icon}</span>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workers specialties */}
          {activeChapter === 'workers' && (
            <div className="mt-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h3 className="font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <WrenchScrewdriverIcon className="h-5 w-5 text-amber-600" /> التخصصات الـ 13 المتاحة
              </h3>
              <div className="flex flex-wrap gap-2">
                {['سباكة','كهرباء','نجارة','دهانات','تكييف','حدادة','بلاط وسيراميك','جبس','أعمال ألمنيوم','صيانة عامة','نظافة','بستنة','أخرى'].map(s => (
                  <span key={s} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 text-amber-800 dark:text-amber-300 text-xs font-bold px-3 py-1.5 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Chapter nav */}
          <div className="mt-6 flex gap-3">
            {CHAPTERS.indexOf(chapter) > 0 && (
              <button onClick={() => { const idx = CHAPTERS.indexOf(chapter); setActiveChapter(CHAPTERS[idx-1].id); setOpenSections({0:true}); window.scrollTo({top:300,behavior:'smooth'}); }}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 rounded-xl py-3 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                ← السابق
              </button>
            )}
            {CHAPTERS.indexOf(chapter) < CHAPTERS.length - 1 && (
              <button onClick={() => { const idx = CHAPTERS.indexOf(chapter); setActiveChapter(CHAPTERS[idx+1].id); setOpenSections({0:true}); window.scrollTo({top:300,behavior:'smooth'}); }}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-sm font-bold transition-colors">
                التالي →
              </button>
            )}
          </div>
        </main>
      </div>

      {/* ── CTA Footer ── */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 py-12 px-4 mt-8">
        <div className="max-w-2xl mx-auto text-center">
          <img src="/homeme-logo.png" alt="HomeMe" className="h-14 w-auto mx-auto mb-4 bg-white/10 rounded-xl p-2" onError={e=>e.target.style.display='none'} />
          <h3 className="text-2xl font-black text-white mb-2" style={{fontFamily:"'Cairo',sans-serif"}}>جاهز تبدأ؟</h3>
          <p className="text-emerald-200/80 mb-6 text-sm">تجربة مجانية 14 يوم — بدون بطاقة ائتمان</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" className="bg-white text-emerald-900 font-black px-8 py-3 rounded-2xl hover:bg-emerald-50 transition-colors">
              🚀 ابدأ مجاناً
            </Link>
            <button onClick={() => setActiveChapter("pricing")} className="border-2 border-white/30 text-white font-bold px-8 py-3 rounded-2xl hover:bg-white/10 transition-colors">
              💰 خطط الأسعار
            </button>
            <a href="https://wa.me/201012625529" target="_blank" rel="noreferrer"
              className="border-2 border-green-400/50 text-green-300 font-bold px-8 py-3 rounded-2xl hover:bg-green-900/30 transition-colors">
              💬 تواصل واتساب
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
