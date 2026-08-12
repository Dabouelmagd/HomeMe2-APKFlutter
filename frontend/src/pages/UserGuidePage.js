import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpenIcon, ChevronDownIcon, HomeModernIcon,
  WrenchScrewdriverIcon, CurrencyDollarIcon, ShieldCheckIcon,
  SparklesIcon, BuildingOfficeIcon, ChatBubbleLeftEllipsisIcon,
  UserGroupIcon, BanknotesIcon, MagnifyingGlassIcon, XMarkIcon,
  NoSymbolIcon, PhoneIcon,
} from '@heroicons/react/24/outline';

/* ── Chapter data ────────────────────────────────────────────── */
const CHAPTERS = [
  {
    id: 'start', icon: HomeModernIcon, color: 'from-emerald-500 to-teal-600', badge: 'أساسي',
    title: 'البداية السريعة', desc: 'أنشئ حسابك وأعدّ كمبوندك في 30 دقيقة',
    sections: [
      { title: 'إنشاء الحساب', steps: [
        { s: 'افتح homemeapp.net واضغط "ابدأ مجاناً"' },
        { s: 'اختر نوع حسابك: كمبوند / شركة إدارة / ساكن' },
        { s: 'أدخل الاسم، الإيميل، كلمة المرور، اسم الكمبوند' },
        { s: 'فعّل الإيميل من رسالة التفعيل', warn: true },
      ]},
      { title: 'إعداد الكمبوند', steps: [
        { s: 'ارفع شعار الكمبوند — يظهر في الفواتير والرسائل', tip: 'أهم خطوة للهوية البصرية' },
        { s: 'أضف العنوان، الهاتف، عدد المباني والوحدات' },
        { s: 'الإعدادات → السكان والوحدات → أضف وحداتك' },
        { s: 'حدد طرق الدفع المقبولة: فودافون كاش، إنستاباي، بنك…' },
      ]},
      { title: 'إضافة السكان', steps: [
        { s: 'يدوياً: + إضافة ساكن → بيانات + وحدة + دور', tip: 'للأعداد الصغيرة' },
        { s: 'بالجملة: مركز الاستيراد → قالب Excel → رفع الملف', tip: 'للأعداد الكبيرة' },
        { s: 'يُرسل بريد ترحيب تلقائياً لكل ساكن ببياناته' },
      ]},
    ],
  },
  {
    id: 'finance', icon: CurrencyDollarIcon, color: 'from-blue-500 to-indigo-600', badge: 'مهم',
    title: 'المالية والفواتير', desc: 'فواتير، أقساط، تأكيد مدفوعات، تقارير',
    sections: [
      { title: 'إنشاء فاتورة شهرية', steps: [
        { s: 'المالية → إنشاء فاتورة → حدد النوع' },
        { s: 'طريقة التوزيع: بالتساوي / بالمساحة / بالوحدة / مخصص' },
        { s: '"إرسال للجميع" → بريد لكل ساكن تلقائياً' },
      ]},
      { title: '🧾 تأكيد إيصالات الدفع', badge: 'جديد', steps: [
        { s: 'الساكن يرفع صورة الإيصال', tip: 'يظهر في قائمة بانتظار المراجعة' },
        { s: 'يصلك إشعار: "ساكن رفع إيصال دفع"' },
        { s: 'المدفوعات → إيصالات بانتظار → افتح الإيصال وراجعه' },
        { s: '"✅ تم الدفع" → يُحدَّث الالتزام + يُضاف للإيرادات', tip: 'كل شيء يحدث تلقائياً' },
        { s: 'يصل للساكن إشعار "تم اعتماد إيصالك ✅"' },
      ]},
      { title: 'نظام الأقساط', steps: [
        { s: 'المالية → الأقساط → خطة قسط جديدة' },
        { s: 'أدخل المبلغ الإجمالي، عدد الأقساط، الفائدة (اختياري)' },
        { s: 'التذكيرات تُرسل تلقائياً 3 أيام قبل الاستحقاق' },
      ]},
    ],
  },
  {
    id: 'workers', icon: WrenchScrewdriverIcon, color: 'from-amber-500 to-orange-600', badge: 'جديد',
    title: 'دليل العمال والصنايعية', desc: 'تقييمات موثّقة + قائمة سوداء',
    sections: [
      { title: 'إضافة عامل (الساكن)', steps: [
        { s: 'القائمة → الصيانة → دليل العمال → + إضافة عامل' },
        { s: 'أدخل الاسم، التخصص (13 خيار)، رقم الهاتف' },
        { s: 'اختر من 1 إلى 5 نجوم + اكتب ملاحظة' },
        { s: 'يذهب للمراجعة ← ينشر بعد موافقة الأدمن', warn: true },
      ]},
      { title: 'الموافقة والإدارة (الأدمن)', steps: [
        { s: 'يصلك إشعار عند إضافة ساكن عاملاً' },
        { s: 'دليل العمال → تبويب "قيد المراجعة"' },
        { s: '"موافقة" → ينشر فوراً | "رفض" → اكتب السبب' },
      ]},
      { title: '🚫 القائمة السوداء', badge: 'مهم', steps: [
        { s: 'افتح ملف العامل → اضغط "🚫 حجب"' },
        { s: 'اكتب سبب الحجب (إلزامي وموثّق)', warn: true },
        { s: 'يُخفى من الدليل ويسري على الكمبوند + الشركة + الأونر' },
        { s: 'رفع الحجب: القائمة السوداء → "رفع الحجب"' },
      ]},
    ],
  },
  {
    id: 'residents', icon: UserGroupIcon, color: 'from-purple-500 to-fuchsia-600', badge: 'للساكن',
    title: 'دليل الساكن', desc: 'كل ما يحتاجه الساكن يومياً',
    sections: [
      { title: 'الفواتير والدفع', steps: [
        { s: 'المدفوعات → الفواتير الحالية: 🟢 مدفوع | 🟡 مستحق | 🔴 متأخر' },
        { s: 'ارفع إيصال: الفاتورة → "رفع إيصال" → صوّر أو ارفع PDF' },
        { s: 'أو ادفع أونلاين: "ادفع الآن" → Visa / Stripe' },
        { s: 'يصلك إشعار بالتأكيد أو سبب الرفض' },
      ]},
      { title: 'طلب صيانة', steps: [
        { s: 'الصيانة → + طلب جديد → النوع + الوصف + الصور' },
        { s: 'تصلك إشعارات عند تحديث حالة الطلب' },
        { s: 'بعد الإنجاز: قيّم الخدمة من 1 إلى 5 نجوم' },
      ]},
      { title: 'دعوة الزوار', steps: [
        { s: 'دعواتي → + دعوة زائر → الاسم والتاريخ والمدة' },
        { s: 'أرسل QR Code للزائر عبر واتساب' },
        { s: 'الأمن يمسح QR عند البوابة', tip: 'صالح فقط في اليوم المحدد' },
      ]},
    ],
  },
  {
    id: 'security', icon: ShieldCheckIcon, color: 'from-red-500 to-rose-600', badge: 'للأمن',
    title: 'دليل موظف الأمن', desc: 'مسح QR، تتبع المركبات، البلاغات',
    sections: [
      { title: 'مسح QR الزوار', steps: [
        { s: 'القائمة → مسح QR → وجّه الكاميرا للـ QR' },
        { s: 'تظهر: اسم الزائر، الوحدة، المدة' },
        { s: '"سماح" أو "رفض" — يُسجَّل الوقت تلقائياً' },
      ]},
      { title: 'بلاغ أمني', steps: [
        { s: 'البلاغات → + بلاغ → النوع + الموقع + الوصف' },
        { s: 'يصل للإدارة فوراً كإشعار عاجل', warn: true },
      ]},
    ],
  },
  {
    id: 'ai', icon: SparklesIcon, color: 'from-violet-500 to-purple-700', badge: 'AI',
    title: 'الذكاء الاصطناعي', desc: 'مساعد Claude AI + مستشار استباقي',
    sections: [
      { title: '✨ مساعد HomeMe', steps: [
        { s: 'الزرار البنفسجي ✨ في أسفل يمين أي صفحة' },
        { s: 'اسأل بالعربي: "إزاي أحجز نادي؟" / "فين الفواتير؟"' },
        { s: 'يجاوب فوراً ويعطيك زر "افتح الصفحة"', tip: 'ينقلك مباشرة' },
        { s: 'حد 20 رسالة / يوم — يتجدد منتصف الليل' },
      ]},
      { title: '🧠 المستشار AI الاستباقي', steps: [
        { s: 'يحلل بيانات الكمبوند يومياً تلقائياً' },
        { s: 'يكتشف: فواتير متأخرة، صيانة معلقة، تقييمات سلبية' },
        { s: 'زر "⚡ تنفيذ بالـ AI" → يرسل رسائل جماعية احترافية' },
      ]},
    ],
  },
  {
    id: 'company', icon: BuildingOfficeIcon, color: 'from-teal-500 to-emerald-700', badge: 'للشركة',
    title: 'دليل شركة الإدارة', desc: 'إدارة عدة كمبوندات من لوحة موحدة',
    sections: [
      { title: 'اللوحة الموحدة', steps: [
        { s: 'كل الكمبوندات في شاشة واحدة مع إحصائياتهم' },
        { s: 'دليل العمال والقائمة السوداء موحدة' },
        { s: 'مقارنة الأداء بين الكمبوندات — 6 أشهر' },
        { s: 'تقرير PDF تنفيذي تلقائي كل أول شهر' },
      ]},
      { title: 'إدارة كمبوند كامل', steps: [
        { s: 'اختر الكمبوند من قائمتك' },
        { s: '"إدارة الكمبوند الكاملة" الزرار الأخضر' },
        { s: 'اضغط "رجوع" للعودة للداشبورد الموحد' },
      ]},
    ],
  },
  {
    id: 'pricing', icon: BanknotesIcon, color: 'from-emerald-500 to-teal-600', badge: 'الأسعار',
    title: 'خطط الاشتراك والأسعار', desc: 'خطط المجمعات + شركات الإدارة بالجنيه',
    sections: [
      { title: 'خطط المجمعات السكنية', steps: [
        { s: '🆓 مجاني — 0 ج.م — حتى 30 ساكن' },
        { s: '📘 أساسي — 1,200 ج.م/شهر (~$40) — حتى 100 ساكن', tip: 'وفر 2,880 ج.م سنوياً' },
        { s: '⭐ احترافي — 2,200 ج.م/شهر (~$73) — غير محدود', tip: 'الأكثر طلباً — وفر 5,280 ج.م' },
        { s: '💎 متقدم — 4,000 ج.م/شهر (~$133) — كل شيء', tip: 'وفر 9,600 ج.م سنوياً' },
      ]},
      { title: 'خطط شركات الإدارة', steps: [
        { s: '🌱 شركة ناشئة — 5,500 ج.م/شهر — حتى 3 مجتمعات', tip: 'وفر 13,200 ج.م سنوياً' },
        { s: '🏢 شركة متوسطة — 13,000 ج.م/شهر — 1-8 مجتمعات', tip: 'الأفضل للشركات — وفر 31,200' },
        { s: '🏛️ شركة كبرى — 35,000 ج.م/شهر — غير محدود', tip: 'وفر 84,000 ج.م سنوياً' },
        { s: 'خصم 17% للتجديد السنوي على جميع الخطط', tip: 'تجربة مجانية 14 يوم بدون بطاقة' },
      ]},
    ],
  },
  {
    id: 'support', icon: ChatBubbleLeftEllipsisIcon, color: 'from-pink-500 to-rose-600', badge: 'مساعدة',
    title: 'الدعم الفني والتواصل', desc: 'شات مباشر، البريد، الأسئلة الشائعة',
    sections: [
      { title: '💬 شات الدعم المباشر', badge: 'جديد', steps: [
        { s: 'الزرار الأخضر 💬 في أسفل يمين أي صفحة' },
        { s: 'اكتب رسالتك ← يرد عليك فريق الدعم' },
        { s: 'badge أحمر يظهر عند وصول رد جديد' },
      ]},
      { title: 'قنوات التواصل', steps: [
        { s: '📧 البريد: info@datalifeai.com' },
        { s: '🌐 الموقع: homemeapp.net' },
        { s: '📚 دليل التشغيل: homemeapp.net/guide' },
      ]},
    ],
  },
];

const QUICK_LINKS = [
  { to: '/', label: '🏠 الصفحة الرئيسية', external: false },
  { to: '/pricing', label: '💰 الأسعار', external: false },
  { to: '/faq', label: '❓ الأسئلة الشائعة', external: false },
  { to: '/blog', label: '📝 المدونة', external: false },
  { to: '/register', label: '🚀 ابدأ مجاناً', external: false },
];

/* ── Main Component ──────────────────────────────────────────── */
export default function UserGuidePage() {
  const navigate = useNavigate();
  const [activeChapter, setActiveChapter] = useState('start');
  const [openSections, setOpenSections] = useState({ 0: true });
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* Search */
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const q = search.toLowerCase();
    const results = [];
    CHAPTERS.forEach(ch => {
      ch.sections.forEach(sec => {
        const matched = sec.steps.filter(st => st.s.toLowerCase().includes(q));
        if (sec.title.toLowerCase().includes(q) || ch.title.toLowerCase().includes(q) || matched.length) {
          results.push({ chapter: ch.title, section: sec.title, chapterId: ch.id, steps: matched.length ? matched : sec.steps.slice(0, 2) });
        }
      });
    });
    setSearchResults(results.slice(0, 5));
  }, [search]);

  const chapter = CHAPTERS.find(c => c.id === activeChapter);
  const ChapterIcon = chapter?.icon || BookOpenIcon;
  const toggle = i => setOpenSections(p => ({ ...p, [i]: !p[i] }));
  const goChapter = id => { setActiveChapter(id); setOpenSections({ 0: true }); setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const chapterIdx = CHAPTERS.findIndex(c => c.id === activeChapter);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950" dir="rtl">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Logo */}
          <button onClick={() => navigate('/')} className="flex items-center gap-2 flex-shrink-0">
            <img src="/homeme-logo.png" alt="HomeMe" className="h-8 w-auto rounded-lg" onError={e => e.target.style.display='none'} />
            <span className="font-black text-gray-900 dark:text-white text-sm hidden sm:block">HomeMe</span>
          </button>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-300">
              <BookOpenIcon className="h-4 w-4 text-emerald-600" /> دليل التشغيل
              <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded-full">v2.3</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              ☰
            </button>
            <Link to="/register" className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors">
              ابدأ مجاناً ←
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-800 to-emerald-900 py-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <img src="/homeme-logo.png" alt="HomeMe" className="h-16 w-auto mx-auto mb-4 bg-white rounded-2xl p-2 shadow-xl" onError={e => e.target.style.display='none'} />
          <h1 className="text-2xl md:text-4xl font-black text-white mb-3">دليل التشغيل الكامل</h1>
          <p className="text-emerald-100/80 text-sm mb-6">50 نظام متكامل — خطوة بخطوة لكل الأدوار</p>

          {/* Search */}
          <div className="relative max-w-lg mx-auto">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ابحث في الدليل…"
              className="w-full bg-white rounded-xl pr-10 pl-4 py-2.5 text-sm text-gray-900 outline-none shadow-lg placeholder-gray-400" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute left-3 top-1/2 -translate-y-1/2">
                <XMarkIcon className="h-4 w-4 text-gray-400" />
              </button>
            )}
            {searchResults.length > 0 && (
              <div className="absolute top-full right-0 left-0 bg-white rounded-xl shadow-2xl mt-1 overflow-hidden z-50 border border-gray-100 text-right">
                {searchResults.map((r, i) => (
                  <button key={i} onClick={() => { goChapter(r.chapterId); setSearch(''); }}
                    className="w-full text-right px-4 py-2.5 hover:bg-emerald-50 border-b border-gray-100 last:border-0 transition-colors">
                    <p className="text-xs text-emerald-600 font-bold">{r.chapter} › {r.section}</p>
                    <p className="text-sm text-gray-700 mt-0.5 truncate">{r.steps[0]?.s}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6 items-start">

          {/* ── Sidebar ── */}
          <aside className={`
            ${mobileMenuOpen ? 'fixed inset-0 z-40 bg-white dark:bg-gray-900 overflow-y-auto p-4' : 'hidden'}
            sm:block sm:static sm:w-56 sm:flex-shrink-0 sm:bg-transparent sm:p-0 sm:z-auto
          `}>
            {/* Mobile close */}
            {mobileMenuOpen && (
              <div className="flex justify-between items-center mb-4 sm:hidden">
                <span className="font-black text-gray-900">الفصول</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg bg-gray-100">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="sticky top-20 space-y-1">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 px-1">الفصول</p>

              {CHAPTERS.map(ch => {
                const Icon = ch.icon;
                const active = activeChapter === ch.id;
                return (
                  <button key={ch.id} type="button"
                    onClick={() => goChapter(ch.id)}
                    className={`w-full text-right flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-sm font-bold ${
                      active
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}>
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${active ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      <Icon className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                    <span className="flex-1 leading-tight text-xs">{ch.title}</span>
                    {ch.badge && (
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        active ? 'bg-white/20 text-white' :
                        ch.badge === 'جديد' ? 'bg-blue-100 text-blue-700' :
                        ch.badge === 'AI' ? 'bg-violet-100 text-violet-700' :
                        ch.badge === 'مهم' ? 'bg-amber-100 text-amber-700' :
                        ch.badge === 'الأسعار' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{ch.badge}</span>
                    )}
                  </button>
                );
              })}

              {/* Quick Links */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 mt-3 space-y-0.5">
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2 px-1">روابط سريعة</p>
                {QUICK_LINKS.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* ── Content ── */}
          <main className="flex-1 min-w-0">

            {/* Chapter header */}
            <div className={`bg-gradient-to-r ${chapter?.color} rounded-2xl p-5 mb-5 text-white`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <ChapterIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-black">{chapter?.title}</h2>
                  <p className="text-white/80 text-sm mt-0.5">{chapter?.desc}</p>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-3">
              {chapter?.sections.map((sec, si) => (
                <div key={si} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                  <button type="button" onClick={() => toggle(si)}
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
                    <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${openSections[si] ? 'rotate-180' : ''}`} />
                  </button>

                  {openSections[si] && (
                    <div className="px-4 pb-4 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                      {sec.steps.map((step, idx) => (
                        <div key={idx} className={`flex gap-3 items-start p-3 rounded-xl ${
                          step.warn ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200' :
                          step.tip ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                          'bg-gray-50 dark:bg-gray-800'
                        }`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black ${
                            step.warn ? 'bg-amber-500 text-white' : `bg-gradient-to-br ${chapter?.color} text-white`
                          }`}>{idx + 1}</div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-relaxed ${step.warn ? 'text-amber-800 dark:text-amber-200 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>{step.s}</p>
                            {step.tip && <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-1">💡 {step.tip}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex gap-3 mt-5">
              {chapterIdx > 0 && (
                <button type="button" onClick={() => goChapter(CHAPTERS[chapterIdx - 1].id)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  ← السابق
                </button>
              )}
              {chapterIdx < CHAPTERS.length - 1 && (
                <button type="button" onClick={() => goChapter(CHAPTERS[chapterIdx + 1].id)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2.5 text-sm font-bold transition-colors">
                  التالي →
                </button>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ── CTA Footer ── */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 py-10 px-4 mt-8 text-center">
        <img src="/homeme-logo.png" alt="HomeMe" className="h-12 w-auto mx-auto mb-3 bg-white/10 rounded-xl p-2" onError={e => e.target.style.display='none'} />
        <h3 className="text-xl font-black text-white mb-1">جاهز تبدأ؟</h3>
        <p className="text-emerald-200/80 mb-5 text-sm">تجربة مجانية 14 يوم — بدون بطاقة ائتمان</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/register" className="bg-white text-emerald-900 font-black px-8 py-3 rounded-2xl hover:bg-emerald-50 transition-colors">
            🚀 ابدأ مجاناً
          </Link>
          <Link to="/pricing" className="border-2 border-white/30 text-white font-bold px-8 py-3 rounded-2xl hover:bg-white/10 transition-colors">
            💰 شوف الأسعار
          </Link>
          <a href="https://wa.me/201012625529" target="_blank" rel="noreferrer"
            className="border-2 border-green-400/50 text-green-300 font-bold px-8 py-3 rounded-2xl hover:bg-green-900/30 transition-colors">
            💬 واتساب
          </a>
        </div>
      </div>
    </div>
  );
}
