import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../App';
import {
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  UserIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  BellIcon,
  StarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftEllipsisIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

const HomePage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isRTL = i18n.language === 'ar';

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
    {
      id: 'compound_admin',
      icon: BuildingOfficeIcon,
      title: 'تسجيل مجتمع سكني',
      desc: 'أنا مدير مجتمع سكني وأريد إنشاء حساب لإدارة المجتمع وإضافة السكان والأمن والإداريين',
      color: 'from-blue-500 to-indigo-600',
      bg: 'bg-blue-50 border-blue-200 hover:border-blue-400',
      features: ['إنشاء المجتمع', 'إضافة السكان', 'تعيين الأمن والإداريين', 'إدارة الميزانية']
    },
    {
      id: 'company_admin',
      icon: BuildingOffice2Icon,
      title: 'تسجيل شركة إدارة',
      desc: 'شركة تدير أكثر من مجتمع سكني وتريد حساب واحد لإدارتها جميعاً',
      color: 'from-purple-500 to-indigo-600',
      bg: 'bg-purple-50 border-purple-200 hover:border-purple-400',
      features: ['إدارة عدة مجتمعات', 'تقارير موحدة', 'إدارة العقود', 'تحليلات شاملة']
    },
    {
      id: 'resident',
      icon: UserIcon,
      title: 'تسجيل مقيم',
      desc: 'أنا مقيم في مجتمع سكني وأريد الانضمام عبر رمز الاشتراك من المدير',
      color: 'from-emerald-500 to-green-600',
      bg: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
      features: ['طلبات صيانة', 'حجز مرافق', 'دفع التزامات', 'شكاوى واقتراحات']
    }
  ];

  const roles = [
    { icon: '👑', title: 'مالك التطبيق', desc: 'تحكم كامل في النظام وكل المجتمعات', color: 'bg-purple-100 text-purple-800' },
    { icon: '🏢', title: 'إدارة شركة', desc: 'إدارة عدة مجتمعات في حساب واحد', color: 'bg-indigo-100 text-indigo-800' },
    { icon: '🏠', title: 'مدير مجتمع', desc: 'إدارة كاملة للمجتمع السكني', color: 'bg-blue-100 text-blue-800' },
    { icon: '📋', title: 'إداري', desc: 'متابعة السكان والشكاوى والصيانة', color: 'bg-emerald-100 text-emerald-800' },
    { icon: '🛡️', title: 'أمن', desc: 'متابعة الدخول والخروج والزوار', color: 'bg-amber-100 text-amber-800' },
    { icon: '👤', title: 'مقيم', desc: 'طلبات الخدمات والصيانة والمدفوعات', color: 'bg-teal-100 text-teal-800' },
  ];

  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img
              src="https://customer-assets.emergentagent.com/job_homeme-subscriptions/artifacts/6yk66f7n_WhatsApp%20Image%202022-01-17%20at%2010.23.44%20AM.637bf42d664818.47361218.jpeg"
              alt="HomeMe"
              className="h-12 w-auto rounded-xl"
            />
            <span className="text-2xl font-bold text-gray-900">HomeMe</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/login" className="px-5 py-2 text-blue-600 border-2 border-blue-600 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-all" data-testid="header-login">
              {t('login', 'تسجيل الدخول')}
            </Link>
            <Link to="/register" className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all" data-testid="header-register">
              {t('register_now', 'إنشاء حساب')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white py-20 lg:py-28">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(99,102,241,0.3), transparent 50%), radial-gradient(circle at 70% 80%, rgba(59,130,246,0.2), transparent 50%)' }}></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur rounded-full text-sm font-medium text-blue-200 mb-6">
              {t('platform_tagline', 'منصة إدارة المجتمعات السكنية المتكاملة')}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {t('hero_title', 'أدر مجتمعك السكني')}
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                {t('hero_title_2', 'بذكاء واحترافية')}
              </span>
            </h1>
            <p className="text-lg text-blue-100/80 mb-10 max-w-2xl mx-auto leading-relaxed">
              {t('hero_desc', '15 نظام متكامل لإدارة المقيمين والمالية والصيانة والعقود والمرافق والشكاوى - كل ما تحتاجه في منصة واحدة')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="px-8 py-4 bg-white text-blue-950 rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all">
                {t('start_now', 'ابدأ الآن مجاناً')}
              </Link>
              <Link to="/login" className="px-8 py-4 border-2 border-white/30 text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-all">
                {t('login', 'تسجيل الدخول')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Registration Types */}
      <section className="py-16 bg-gray-50" id="register-types">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('choose_registration', 'اختر نوع التسجيل')}</h2>
            <p className="text-gray-600">{t('registration_desc', 'حدد نوع حسابك للبدء في استخدام المنصة')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {accountTypes.map(type => {
              const Icon = type.icon;
              return (
                <div key={type.id}
                  onClick={() => navigate('/register')}
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
                        <ClipboardDocumentCheckIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
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

      {/* Systems Grid */}
      <section className="py-16" id="systems">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('our_systems', '15 نظام متكامل')}</h2>
            <p className="text-gray-600">{t('systems_desc', 'كل ما تحتاجه لإدارة مجتمعك السكني باحترافية')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {systems.map((sys, i) => {
              const Icon = sys.icon;
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all group">
                  <div className={`inline-flex p-2.5 rounded-lg bg-gradient-to-r ${sys.color} mb-3`}>
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

      {/* Roles */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">{t('user_roles', '6 أدوار مختلفة')}</h2>
            <p className="text-gray-400">{t('roles_desc', 'كل دور بصلاحيات مخصصة حسب المسؤولية')}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {roles.map((role, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 text-center border border-white/10 hover:border-white/30 transition-all">
                <span className="text-3xl block mb-2">{role.icon}</span>
                <h4 className="font-bold text-sm mb-1">{role.title}</h4>
                <p className="text-xs text-gray-400">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">{t('ready_to_start', 'جاهز لإدارة مجتمعك السكني؟')}</h2>
          <p className="text-blue-100 mb-8 text-lg">{t('cta_desc', 'انضم الآن وابدأ في استخدام منصة HomeMe مجاناً')}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="px-10 py-4 bg-white text-blue-700 rounded-xl font-bold text-lg hover:shadow-2xl transition-all">
              {t('create_account_free', 'إنشاء حساب مجاني')}
            </Link>
            <Link to="/login" className="px-10 py-4 border-2 border-white/40 text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-all">
              {t('login', 'تسجيل الدخول')}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm">HomeMe &copy; {new Date().getFullYear()} - {t('all_rights_reserved', 'جميع الحقوق محفوظة')}</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
