import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  LightBulbIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  CalendarIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserPlusIcon,
  KeyIcon,
  PhotoIcon,
  MapPinIcon,
  CreditCardIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const WrittenGuide = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [activeSection, setActiveSection] = useState('dashboard');
  const [expandedSteps, setExpandedSteps] = useState({});

  const toggleStep = (sectionId, stepIndex) => {
    setExpandedSteps(prev => ({
      ...prev,
      [`${sectionId}-${stepIndex}`]: !prev[`${sectionId}-${stepIndex}`]
    }));
  };

  const guides = [
    { id: 'login', title: t('wg_login_title', 'تسجيل الدخول'), icon: KeyIcon, color: 'from-amber-500 to-orange-600', description: t('wg_login_desc', 'كيفية الدخول إلى حسابك في HomeMe'), steps: [
      { title: t('wg_login_s1_title', 'الخطوة 1: افتح صفحة تسجيل الدخول'), content: t('wg_login_s1_content', 'انتقل إلى الرابط homemeapp.net/login من متصفحك.'), tip: t('wg_login_s1_tip', 'يمكنك حفظ الرابط في المفضلة للوصول السريع') },
      { title: t('wg_login_s2_title', 'الخطوة 2: أدخل بيانات الدخول'), content: t('wg_login_s2_content', 'أدخل اسم المستخدم وكلمة المرور الخاصة بك في الحقول المخصصة.'), tip: t('wg_login_s2_tip', 'تأكد من صحة كلمة المرور (الحروف الكبيرة والصغيرة مهمة)') },
      { title: t('wg_login_s3_title', 'الخطوة 3: اختر اللغة'), content: t('wg_login_s3_content', 'يمكنك اختيار اللغة المفضلة (العربية/English/Français) من القائمة المنسدلة.'), tip: t('wg_login_s3_tip', 'ستُحفظ اللغة تلقائياً لزياراتك القادمة') },
      { title: t('wg_login_s4_title', 'الخطوة 4: اضغط "تسجيل الدخول"'), content: t('wg_login_s4_content', 'بعد إدخال البيانات، اضغط على زر تسجيل الدخول للدخول إلى لوحة التحكم.'), tip: t('wg_login_s4_tip', 'إذا نسيت كلمة المرور، تواصل مع إدارة المجمع') }
    ]},
    { id: 'dashboard', title: t('wg_dashboard_title', 'لوحة التحكم'), icon: HomeIcon, color: 'from-blue-500 to-indigo-600', description: t('wg_dashboard_desc', 'الشاشة الرئيسية لعرض ملخص نشاطك'), steps: [
      { title: t('wg_dashboard_s1_title', 'نظرة عامة على الإحصائيات'), content: t('wg_dashboard_s1_content', 'تعرض لوحة التحكم إحصائيات سريعة: عدد أفراد العائلة، المدفوعات المعلقة، الرسائل الجديدة، والإشعارات.'), tip: t('wg_dashboard_s1_tip', 'البطاقات الملونة تتحدث تلقائياً لعرض أحدث البيانات') },
      { title: t('wg_dashboard_s2_title', 'الإجراءات السريعة'), content: t('wg_dashboard_s2_content', 'من لوحة التحكم يمكنك الوصول السريع لـ: إضافة ضيف، طلب صيانة، دفع فاتورة، إرسال رسالة.'), tip: t('wg_dashboard_s2_tip', 'اضغط على أي بطاقة للانتقال مباشرة إلى تلك الخدمة') },
      { title: t('wg_dashboard_s3_title', 'آخر النشاطات'), content: t('wg_dashboard_s3_content', 'يعرض القسم السفلي آخر الأحداث: زيارات الضيوف، طلبات الصيانة، والمدفوعات الأخيرة.'), tip: t('wg_dashboard_s3_tip', 'اضغط على "عرض الكل" لرؤية السجل الكامل') }
    ]},
    { id: 'compound', title: t('wg_compound_title', 'إدارة المجمع'), icon: BuildingOfficeIcon, color: 'from-green-500 to-emerald-600', description: t('wg_compound_desc', 'للمشرفين: إدارة بيانات المجمع السكني'), adminOnly: true, steps: [
      { title: t('wg_compound_s1_title', 'عرض معلومات المجمع'), content: t('wg_compound_s1_content', 'يعرض اسم المجمع، العنوان، عدد الوحدات، وعدد السكان الحاليين.'), tip: t('wg_compound_s1_tip', 'يمكنك تعديل هذه المعلومات بالضغط على زر "تعديل"') },
      { title: t('wg_compound_s2_title', 'إضافة وحدات سكنية'), content: t('wg_compound_s2_content', 'اضغط على "إضافة وحدة" وأدخل: رقم الوحدة، المبنى، الطابق، نوع الوحدة (شقة/فيلا).'), tip: t('wg_compound_s2_tip', 'يمكنك استيراد قائمة الوحدات من ملف Excel') },
      { title: t('wg_compound_s3_title', 'إدارة المباني'), content: t('wg_compound_s3_content', 'أضف مباني جديدة، حدد عدد الطوابق، وخصص الوحدات لكل مبنى.'), tip: t('wg_compound_s3_tip', 'نظم المباني بأسماء واضحة (مبنى أ، مبنى ب) للسهولة') }
    ]},
    { id: 'services', title: t('wg_services_title', 'إدارة الخدمات'), icon: WrenchScrewdriverIcon, color: 'from-orange-500 to-red-600', description: t('wg_services_desc', 'طلب ومتابعة خدمات الصيانة والخدمات العامة'), steps: [
      { title: t('wg_services_s1_title', 'طلب خدمة جديدة'), content: t('wg_services_s1_content', 'اضغط "طلب خدمة"، اختر نوع الخدمة (صيانة/تنظيف/نقل/أخرى)، صف المشكلة بالتفصيل.'), tip: t('wg_services_s1_tip', 'أرفق صوراً للمشكلة لتسريع المعالجة') },
      { title: t('wg_services_s2_title', 'تحديد الأولوية'), content: t('wg_services_s2_content', 'حدد مستوى الأولوية: طارئ (خلال ساعات)، عاجل (خلال يوم)، عادي (خلال أسبوع).'), tip: t('wg_services_s2_tip', 'الحالات الطارئة مثل: تسرب مياه، انقطاع كهرباء، مشاكل أمنية') },
      { title: t('wg_services_s3_title', 'متابعة الطلب'), content: t('wg_services_s3_content', 'تابع حالة الطلب: قيد المراجعة، معتمد، قيد التنفيذ، مكتمل.'), tip: t('wg_services_s3_tip', 'ستصلك إشعارات عند كل تحديث لحالة الطلب') }
    ]},
    { id: 'guests', title: t('wg_guests_title', 'إدارة الضيوف'), icon: UserGroupIcon, color: 'from-pink-500 to-rose-600', description: t('wg_guests_desc', 'تسجيل وإدارة زيارات الضيوف'), steps: [
      { title: t('wg_guests_s1_title', 'إضافة ضيف جديد'), content: t('wg_guests_s1_content', 'أدخل: اسم الضيف، رقم الهوية (اختياري)، رقم الهاتف، سبب الزيارة، تاريخ ووقت الزيارة المتوقع.'), tip: t('wg_guests_s1_tip', 'يمكنك إضافة عدة ضيوف دفعة واحدة') },
      { title: t('wg_guests_s2_title', 'إنشاء رمز QR'), content: t('wg_guests_s2_content', 'بعد إضافة الضيف، يُنشأ رمز QR فريد يمكنك مشاركته مع الضيف.'), tip: t('wg_guests_s2_tip', 'شارك الرمز عبر واتساب أو البريد الإلكتروني') }
    ]},
    { id: 'finances', title: t('wg_finances_title', 'الإدارة المالية'), icon: CurrencyDollarIcon, color: 'from-green-600 to-emerald-700', description: t('wg_finances_desc', 'عرض ودفع الفواتير والمستحقات'), steps: [
      { title: t('wg_finances_s1_title', 'عرض الفواتير'), content: t('wg_finances_s1_content', 'اطلع على جميع الفواتير: رسوم الصيانة، خدمات إضافية، مخالفات (إن وجدت).'), tip: t('wg_finances_s1_tip', 'الفواتير المتأخرة تظهر باللون الأحمر') },
      { title: t('wg_finances_s2_title', 'دفع فاتورة'), content: t('wg_finances_s2_content', 'اختر الفاتورة، اضغط "دفع"، اختر طريقة الدفع (بطاقة/تحويل)، أكد الدفع.'), tip: t('wg_finances_s2_tip', 'احتفظ بإيصال الدفع كمرجع') }
    ]},
    { id: 'notifications', title: t('wg_notifications_title', 'الإشعارات'), icon: BellIcon, color: 'from-yellow-500 to-amber-600', description: t('wg_notifications_desc', 'إدارة إشعاراتك وتنبيهاتك'), steps: [
      { title: t('wg_notifications_s1_title', 'عرض الإشعارات'), content: t('wg_notifications_s1_content', 'اضغط على أيقونة الجرس لعرض جميع الإشعارات: جديدة ومقروءة.'), tip: t('wg_notifications_s1_tip', 'الإشعارات غير المقروءة تظهر بخلفية ملونة') },
      { title: t('wg_notifications_s2_title', 'إعدادات الإشعارات'), content: t('wg_notifications_s2_content', 'تحكم في أنواع الإشعارات: فواتير، ضيوف، صيانة، إعلانات.'), tip: t('wg_notifications_s2_tip', 'يمكنك تفعيل الإشعارات عبر البريد الإلكتروني أيضاً') }
    ]},
    { id: 'settings', title: t('wg_settings_title', 'الإعدادات'), icon: Cog6ToothIcon, color: 'from-gray-500 to-slate-600', description: t('wg_settings_desc', 'تخصيص إعدادات حسابك'), steps: [
      { title: t('wg_settings_s1_title', 'تعديل الملف الشخصي'), content: t('wg_settings_s1_content', 'حدّث: الاسم، الصورة الشخصية، رقم الهاتف، البريد الإلكتروني.'), tip: t('wg_settings_s1_tip', 'استخدم صورة واضحة للتعرف السهل') },
      { title: t('wg_settings_s2_title', 'تغيير كلمة المرور'), content: t('wg_settings_s2_content', 'أدخل كلمة المرور الحالية، ثم الجديدة مرتين للتأكيد.'), tip: t('wg_settings_s2_tip', 'استخدم كلمة مرور قوية (8 أحرف على الأقل، أرقام ورموز)') }
    ]},
    { id: 'subscription', title: t('wg_subscription_title', 'الاشتراكات والدفع'), icon: CreditCardIcon, color: 'from-emerald-500 to-green-600', description: t('wg_subscription_desc', 'إدارة اشتراكك وطرق الدفع'), steps: [
      { title: t('wg_subscription_s1_title', 'اختيار الخطة المناسبة'), content: t('wg_subscription_s1_content', 'اختر من بين 4 خطط للمجتمعات السكنية أو 3 خطط للشركات.'), tip: t('wg_subscription_s1_tip', 'ابدأ بخطة مجانية واترقِ حسب احتياجاتك. جميع الخطط تشمل 14 يوم تجربة مجانية') },
      { title: t('wg_subscription_s2_title', 'طرق الدفع'), content: t('wg_subscription_s2_content', 'ادفع عبر: بطاقات الائتمان (Stripe)، PayPal، تحويل بنكي، انستاباي، أو محفظة فودافون كاش.'), tip: t('wg_subscription_s2_tip', 'الاشتراك السنوي يوفر شهرين مجاناً (تدفع 10 شهور فقط)') }
    ]}
  ];

  const selectedGuide = guides.find(g => g.id === activeSection);

  return (
    <div className={`bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 rounded-2xl p-6 mb-8 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">{t('wg_main_title', 'دليل الاستخدام الشامل')}</h2>
        <p className="text-blue-100">{t('wg_main_subtitle', 'دليل تفصيلي خطوة بخطوة لجميع ميزات النظام')}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {guides.map(guide => (
          <button key={guide.id} onClick={() => setActiveSection(guide.id)} data-testid={`guide-tab-${guide.id}`}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeSection === guide.id ? 'bg-white text-purple-700 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}`}>
            <guide.icon className="w-4 h-4" />
            <span>{guide.title}</span>
            {guide.adminOnly && <ShieldCheckIcon className="w-3 h-3 text-yellow-400" title={t('wg_admin_only', 'للمشرفين فقط')} />}
          </button>
        ))}
      </div>

      {selectedGuide && (
        <div className="bg-white rounded-xl p-6 shadow-xl">
          <div className={`bg-gradient-to-r ${selectedGuide.color} rounded-lg p-4 mb-6`}>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-lg"><selectedGuide.icon className="w-8 h-8 text-white" /></div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedGuide.title}</h3>
                <p className="text-white/80 text-sm">{selectedGuide.description}</p>
                {selectedGuide.adminOnly && (
                  <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded mt-2">
                    <ShieldCheckIcon className="w-3 h-3" />{t('wg_admin_only', 'للمشرفين فقط')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {selectedGuide.steps.map((step, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => toggleStep(selectedGuide.id, index)} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full bg-gradient-to-r ${selectedGuide.color} text-white flex items-center justify-center text-sm font-bold`}>{index + 1}</span>
                    <span className="font-medium text-gray-900">{step.title}</span>
                  </div>
                  {expandedSteps[`${selectedGuide.id}-${index}`] ? <ChevronDownIcon className="w-5 h-5 text-gray-500" /> : <ChevronRightIcon className="w-5 h-5 text-gray-500" />}
                </button>
                {expandedSteps[`${selectedGuide.id}-${index}`] && (
                  <div className="p-4 bg-white border-t border-gray-200">
                    <p className="text-gray-700 mb-4">{step.content}</p>
                    {step.tip && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <LightBulbIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div><span className="font-medium text-amber-800">{t('wg_tip', 'نصيحة')}: </span><span className="text-amber-700">{step.tip}</span></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5" />{t('wg_quick_summary', 'ملخص سريع')}
            </h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li className="flex items-center gap-2"><ArrowRightIcon className="w-3 h-3" />{t('wg_click_step_details', 'اضغط على كل خطوة لعرض التفاصيل والنصائح')}</li>
              <li className="flex items-center gap-2"><ArrowRightIcon className="w-3 h-3" />{t('wg_extra_help', 'للمساعدة الإضافية، تواصل مع إدارة المجمع')}</li>
            </ul>
          </div>
        </div>
      )}

      <div className="mt-8 bg-white/10 backdrop-blur rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 text-center">{t('wg_learning_path', 'مسار التعلم البسيط')}</h3>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { icon: KeyIcon, label: t('wg_flow_login', 'ادخل'), color: 'bg-amber-500' },
            { icon: ChartBarIcon, label: t('wg_flow_view', 'شاهد'), color: 'bg-blue-500' },
            { icon: BuildingOfficeIcon, label: t('wg_flow_manage', 'أدر'), color: 'bg-green-500' },
            { icon: ChatBubbleLeftRightIcon, label: t('wg_flow_communicate', 'تواصل'), color: 'bg-purple-500' }
          ].map((item, index) => (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center">
                <div className={`${item.color} p-3 rounded-full`}><item.icon className="w-6 h-6 text-white" /></div>
                <span className="text-white text-sm mt-2">{item.label}</span>
              </div>
              {index < 3 && <ArrowRightIcon className="w-6 h-6 text-white/60" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    {/* Link to full guide page */}
      <div className="mt-6 text-center">
        <a href="/guide" className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold px-6 py-3 rounded-2xl text-sm transition-all border border-white/30">
          📖 عرض دليل التشغيل الكامل في صفحة منفصلة →
        </a>
      </div>
    </div>
  );
};

export default WrittenGuide;
