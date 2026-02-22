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
    {
      id: 'login',
      title: 'تسجيل الدخول',
      icon: KeyIcon,
      color: 'from-amber-500 to-orange-600',
      description: 'كيفية الدخول إلى حسابك في HomeMe',
      steps: [
        {
          title: 'الخطوة 1: افتح صفحة تسجيل الدخول',
          content: 'انتقل إلى الرابط homemeapp.net/login من متصفحك.',
          tip: 'يمكنك حفظ الرابط في المفضلة للوصول السريع'
        },
        {
          title: 'الخطوة 2: أدخل بيانات الدخول',
          content: 'أدخل اسم المستخدم وكلمة المرور الخاصة بك في الحقول المخصصة.',
          tip: 'تأكد من صحة كلمة المرور (الحروف الكبيرة والصغيرة مهمة)'
        },
        {
          title: 'الخطوة 3: اختر اللغة',
          content: 'يمكنك اختيار اللغة المفضلة (العربية/English/Français) من القائمة المنسدلة.',
          tip: 'ستُحفظ اللغة تلقائياً لزياراتك القادمة'
        },
        {
          title: 'الخطوة 4: اضغط "تسجيل الدخول"',
          content: 'بعد إدخال البيانات، اضغط على زر تسجيل الدخول للدخول إلى لوحة التحكم.',
          tip: 'إذا نسيت كلمة المرور، تواصل مع إدارة المجمع'
        }
      ]
    },
    {
      id: 'dashboard',
      title: 'لوحة التحكم',
      icon: HomeIcon,
      color: 'from-blue-500 to-indigo-600',
      description: 'الشاشة الرئيسية لعرض ملخص نشاطك',
      steps: [
        {
          title: 'نظرة عامة على الإحصائيات',
          content: 'تعرض لوحة التحكم إحصائيات سريعة: عدد أفراد العائلة، المدفوعات المعلقة، الرسائل الجديدة، والإشعارات.',
          tip: 'البطاقات الملونة تتحدث تلقائياً لعرض أحدث البيانات'
        },
        {
          title: 'الإجراءات السريعة',
          content: 'من لوحة التحكم يمكنك الوصول السريع لـ: إضافة ضيف، طلب صيانة، دفع فاتورة، إرسال رسالة.',
          tip: 'اضغط على أي بطاقة للانتقال مباشرة إلى تلك الخدمة'
        },
        {
          title: 'آخر النشاطات',
          content: 'يعرض القسم السفلي آخر الأحداث: زيارات الضيوف، طلبات الصيانة، والمدفوعات الأخيرة.',
          tip: 'اضغط على "عرض الكل" لرؤية السجل الكامل'
        }
      ]
    },
    {
      id: 'compound',
      title: 'إدارة المجمع',
      icon: BuildingOfficeIcon,
      color: 'from-green-500 to-emerald-600',
      description: 'للمشرفين: إدارة بيانات المجمع السكني',
      adminOnly: true,
      steps: [
        {
          title: 'عرض معلومات المجمع',
          content: 'يعرض اسم المجمع، العنوان، عدد الوحدات، وعدد السكان الحاليين.',
          tip: 'يمكنك تعديل هذه المعلومات بالضغط على زر "تعديل"'
        },
        {
          title: 'إضافة وحدات سكنية',
          content: 'اضغط على "إضافة وحدة" وأدخل: رقم الوحدة، المبنى، الطابق، نوع الوحدة (شقة/فيلا).',
          tip: 'يمكنك استيراد قائمة الوحدات من ملف Excel'
        },
        {
          title: 'إدارة المباني',
          content: 'أضف مباني جديدة، حدد عدد الطوابق، وخصص الوحدات لكل مبنى.',
          tip: 'نظم المباني بأسماء واضحة (مبنى أ، مبنى ب) للسهولة'
        },
        {
          title: 'رفع شعار المجمع',
          content: 'اضغط على "رفع الشعار" واختر صورة بصيغة PNG أو JPG (حد أقصى 5 ميجابايت).',
          tip: 'استخدم صورة بخلفية شفافة للحصول على مظهر احترافي'
        }
      ]
    },
    {
      id: 'residents',
      title: 'قائمة السكان',
      icon: UsersIcon,
      color: 'from-purple-500 to-violet-600',
      description: 'للمشرفين: عرض وإدارة بيانات جميع السكان',
      adminOnly: true,
      steps: [
        {
          title: 'عرض قائمة السكان',
          content: 'تعرض جدول بجميع السكان يشمل: الاسم، الوحدة، رقم الهاتف، البريد الإلكتروني، تاريخ التسجيل.',
          tip: 'استخدم البحث للعثور على ساكن محدد بسرعة'
        },
        {
          title: 'تصفية وترتيب البيانات',
          content: 'فلتر السكان حسب: المبنى، حالة الاشتراك، تاريخ التسجيل. رتب تصاعدياً أو تنازلياً.',
          tip: 'اضغط على عنوان العمود للترتيب السريع'
        },
        {
          title: 'عرض تفاصيل الساكن',
          content: 'اضغط على اسم الساكن لعرض: بيانات كاملة، أفراد العائلة، سجل المدفوعات، طلبات الصيانة.',
          tip: 'يمكنك التواصل مباشرة من صفحة التفاصيل'
        },
        {
          title: 'تعديل أو حذف ساكن',
          content: 'من قائمة الإجراءات: تعديل البيانات، إعادة تعيين كلمة المرور، تعليق الحساب، أو حذفه.',
          tip: 'حذف الساكن سيزيل جميع بياناته نهائياً - استخدم "تعليق" بدلاً منه'
        }
      ]
    },
    {
      id: 'users',
      title: 'إدارة المستخدمين',
      icon: UserPlusIcon,
      color: 'from-teal-500 to-cyan-600',
      description: 'للمشرفين: إنشاء وإدارة حسابات المستخدمين',
      adminOnly: true,
      steps: [
        {
          title: 'إنشاء مستخدم جديد',
          content: 'اضغط "إضافة مستخدم" وأدخل: الاسم، البريد، رقم الهاتف، الوحدة، ونوع الحساب (ساكن/مشرف/أمن).',
          tip: 'أرسل بيانات الدخول للمستخدم عبر البريد الإلكتروني تلقائياً'
        },
        {
          title: 'تعيين الصلاحيات',
          content: 'حدد صلاحيات كل مستخدم: ساكن (صلاحيات محدودة)، مشرف (صلاحيات كاملة)، أمن (صلاحيات الزوار فقط).',
          tip: 'المشرف يمكنه الوصول لجميع البيانات والإعدادات'
        },
        {
          title: 'إدارة أكواد الاشتراك',
          content: 'أنشئ أكواد اشتراك للسكان الجدد بفترات مختلفة (3/6/9/12 شهر).',
          tip: 'شارك الكود مع الساكن الجديد للتسجيل الذاتي'
        }
      ]
    },
    {
      id: 'services',
      title: 'إدارة الخدمات',
      icon: WrenchScrewdriverIcon,
      color: 'from-orange-500 to-red-600',
      description: 'طلب ومتابعة خدمات الصيانة والخدمات العامة',
      steps: [
        {
          title: 'طلب خدمة جديدة',
          content: 'اضغط "طلب خدمة"، اختر نوع الخدمة (صيانة/تنظيف/نقل/أخرى)، صف المشكلة بالتفصيل.',
          tip: 'أرفق صوراً للمشكلة لتسريع المعالجة'
        },
        {
          title: 'تحديد الأولوية',
          content: 'حدد مستوى الأولوية: طارئ (خلال ساعات)، عاجل (خلال يوم)، عادي (خلال أسبوع).',
          tip: 'الحالات الطارئة مثل: تسرب مياه، انقطاع كهرباء، مشاكل أمنية'
        },
        {
          title: 'متابعة الطلب',
          content: 'تابع حالة الطلب: قيد المراجعة، معتمد، قيد التنفيذ، مكتمل.',
          tip: 'ستصلك إشعارات عند كل تحديث لحالة الطلب'
        },
        {
          title: 'تقييم الخدمة',
          content: 'بعد اكتمال الخدمة، قيّم جودة العمل (1-5 نجوم) واكتب ملاحظاتك.',
          tip: 'تقييمك يساعد في تحسين جودة الخدمات'
        }
      ]
    },
    {
      id: 'maintenance',
      title: 'نظام الصيانة',
      icon: Cog6ToothIcon,
      color: 'from-gray-600 to-gray-800',
      description: 'جدولة ومتابعة أعمال الصيانة',
      steps: [
        {
          title: 'تقديم طلب صيانة',
          content: 'حدد موقع المشكلة (داخل الوحدة/مناطق مشتركة)، نوع الصيانة (كهرباء/سباكة/تكييف/أخرى).',
          tip: 'كن دقيقاً في وصف المشكلة لتسريع الإصلاح'
        },
        {
          title: 'جدولة موعد',
          content: 'اختر الوقت المناسب لزيارة فريق الصيانة من المواعيد المتاحة.',
          tip: 'تأكد من وجود شخص بالغ في الوحدة وقت الموعد'
        },
        {
          title: 'استلام تقرير العمل',
          content: 'بعد الانتهاء، ستستلم تقريراً بالعمل المنجز والقطع المستبدلة إن وجدت.',
          tip: 'احتفظ بالتقارير كمرجع للصيانة المستقبلية'
        }
      ]
    },
    {
      id: 'guests',
      title: 'إدارة الضيوف',
      icon: UserGroupIcon,
      color: 'from-pink-500 to-rose-600',
      description: 'تسجيل وإدارة زيارات الضيوف',
      steps: [
        {
          title: 'إضافة ضيف جديد',
          content: 'أدخل: اسم الضيف، رقم الهوية (اختياري)، رقم الهاتف، سبب الزيارة، تاريخ ووقت الزيارة المتوقع.',
          tip: 'يمكنك إضافة عدة ضيوف دفعة واحدة'
        },
        {
          title: 'إنشاء رمز QR',
          content: 'بعد إضافة الضيف، يُنشأ رمز QR فريد يمكنك مشاركته مع الضيف.',
          tip: 'شارك الرمز عبر واتساب أو البريد الإلكتروني'
        },
        {
          title: 'متابعة وصول الضيوف',
          content: 'عند وصول الضيف، يمسح الأمن الرمز ويسجل دخوله، وتصلك إشعار فوري.',
          tip: 'يمكنك إلغاء الزيارة قبل وصول الضيف'
        },
        {
          title: 'سجل الزيارات',
          content: 'اطلع على تاريخ جميع الزيارات: التاريخ، الوقت، مدة الزيارة، ملاحظات الأمن.',
          tip: 'استخدم الفلتر لعرض زيارات فترة معينة'
        }
      ]
    },
    {
      id: 'family',
      title: 'إدارة العائلة',
      icon: UsersIcon,
      color: 'from-indigo-500 to-blue-600',
      description: 'إضافة وإدارة أفراد عائلتك',
      steps: [
        {
          title: 'إضافة فرد جديد',
          content: 'اضغط "إضافة فرد"، أدخل: الاسم، صلة القرابة، تاريخ الميلاد، رقم الهاتف.',
          tip: 'يمكن لأفراد العائلة البالغين الحصول على حساب خاص'
        },
        {
          title: 'تعيين صلاحيات',
          content: 'حدد من يمكنه: استقبال الضيوف، طلب الخدمات، استلام الإشعارات.',
          tip: 'رب الأسرة لديه جميع الصلاحيات تلقائياً'
        },
        {
          title: 'إدارة بطاقات الدخول',
          content: 'خصص بطاقات دخول لكل فرد للبوابات والمرافق المشتركة.',
          tip: 'في حالة فقدان البطاقة، أبلغ الإدارة فوراً'
        }
      ]
    },
    {
      id: 'finances',
      title: 'الإدارة المالية',
      icon: CurrencyDollarIcon,
      color: 'from-green-600 to-emerald-700',
      description: 'عرض ودفع الفواتير والمستحقات',
      steps: [
        {
          title: 'عرض الفواتير',
          content: 'اطلع على جميع الفواتير: رسوم الصيانة، خدمات إضافية، مخالفات (إن وجدت).',
          tip: 'الفواتير المتأخرة تظهر باللون الأحمر'
        },
        {
          title: 'دفع فاتورة',
          content: 'اختر الفاتورة، اضغط "دفع"، اختر طريقة الدفع (بطاقة/تحويل)، أكد الدفع.',
          tip: 'احتفظ بإيصال الدفع كمرجع'
        },
        {
          title: 'عرض السجل المالي',
          content: 'اطلع على تاريخ جميع المدفوعات: التاريخ، المبلغ، طريقة الدفع، رقم المرجع.',
          tip: 'يمكنك تحميل كشف حساب بصيغة PDF'
        },
        {
          title: 'إعداد التذكيرات',
          content: 'فعّل التذكير التلقائي قبل موعد استحقاق الفاتورة بيوم أو أسبوع.',
          tip: 'تجنب رسوم التأخير بتفعيل التذكيرات'
        }
      ]
    },
    {
      id: 'messages',
      title: 'مركز الرسائل',
      icon: ChatBubbleLeftRightIcon,
      color: 'from-blue-600 to-cyan-600',
      description: 'التواصل مع الإدارة والجيران',
      steps: [
        {
          title: 'إرسال رسالة للإدارة',
          content: 'اضغط "رسالة جديدة"، اختر "إدارة المجمع"، اكتب رسالتك، أرفق ملفات إن لزم.',
          tip: 'الرسائل العاجلة تُعالج خلال 24 ساعة'
        },
        {
          title: 'التواصل مع الجيران',
          content: 'أرسل رسائل للجيران في نفس المبنى أو المجمع (إذا كانت الميزة مفعلة).',
          tip: 'حافظ على آداب التواصل واحترم خصوصية الآخرين'
        },
        {
          title: 'الإعلانات العامة',
          content: 'تابع إعلانات الإدارة: صيانة مجدولة، فعاليات، تحديثات مهمة.',
          tip: 'الإعلانات المهمة تُرسل كإشعارات أيضاً'
        }
      ]
    },
    {
      id: 'notifications',
      title: 'الإشعارات',
      icon: BellIcon,
      color: 'from-yellow-500 to-amber-600',
      description: 'إدارة إشعاراتك وتنبيهاتك',
      steps: [
        {
          title: 'عرض الإشعارات',
          content: 'اضغط على أيقونة الجرس لعرض جميع الإشعارات: جديدة ومقروءة.',
          tip: 'الإشعارات غير المقروءة تظهر بخلفية ملونة'
        },
        {
          title: 'إعدادات الإشعارات',
          content: 'تحكم في أنواع الإشعارات: فواتير، ضيوف، صيانة، إعلانات.',
          tip: 'يمكنك تفعيل الإشعارات عبر البريد الإلكتروني أيضاً'
        },
        {
          title: 'تفعيل الإشعارات الفورية',
          content: 'اسمح للموقع بإرسال إشعارات للحصول على تنبيهات فورية.',
          tip: 'مهم لتنبيهات الضيوف والحالات الطارئة'
        }
      ]
    },
    {
      id: 'settings',
      title: 'الإعدادات',
      icon: Cog6ToothIcon,
      color: 'from-gray-500 to-slate-600',
      description: 'تخصيص إعدادات حسابك',
      steps: [
        {
          title: 'تعديل الملف الشخصي',
          content: 'حدّث: الاسم، الصورة الشخصية، رقم الهاتف، البريد الإلكتروني.',
          tip: 'استخدم صورة واضحة للتعرف السهل'
        },
        {
          title: 'تغيير كلمة المرور',
          content: 'أدخل كلمة المرور الحالية، ثم الجديدة مرتين للتأكيد.',
          tip: 'استخدم كلمة مرور قوية (8 أحرف على الأقل، أرقام ورموز)'
        },
        {
          title: 'إعدادات اللغة',
          content: 'اختر لغة الواجهة: العربية، English، Français.',
          tip: 'يتغير اتجاه الصفحة تلقائياً حسب اللغة'
        },
        {
          title: 'إعدادات الخصوصية',
          content: 'تحكم في: من يرى معلوماتك، مشاركة الموقع، تتبع النشاط.',
          tip: 'راجع إعدادات الخصوصية بانتظام'
        }
      ]
    }
  ];

  const selectedGuide = guides.find(g => g.id === activeSection);

  return (
    <div className={`bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 rounded-2xl p-6 mb-8 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          📖 دليل الاستخدام الشامل
        </h2>
        <p className="text-blue-100">
          دليل تفصيلي خطوة بخطوة لجميع ميزات النظام
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {guides.map(guide => (
          <button
            key={guide.id}
            onClick={() => setActiveSection(guide.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeSection === guide.id
                ? 'bg-white text-purple-700 shadow-lg'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <guide.icon className="w-4 h-4" />
            <span>{guide.title}</span>
            {guide.adminOnly && (
              <ShieldCheckIcon className="w-3 h-3 text-yellow-400" title="للمشرفين فقط" />
            )}
          </button>
        ))}
      </div>

      {/* Selected Guide Content */}
      {selectedGuide && (
        <div className="bg-white rounded-xl p-6 shadow-xl">
          {/* Guide Header */}
          <div className={`bg-gradient-to-r ${selectedGuide.color} rounded-lg p-4 mb-6`}>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-lg">
                <selectedGuide.icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedGuide.title}</h3>
                <p className="text-white/80 text-sm">{selectedGuide.description}</p>
                {selectedGuide.adminOnly && (
                  <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded mt-2">
                    <ShieldCheckIcon className="w-3 h-3" />
                    للمشرفين فقط
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {selectedGuide.steps.map((step, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleStep(selectedGuide.id, index)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full bg-gradient-to-r ${selectedGuide.color} text-white flex items-center justify-center text-sm font-bold`}>
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900">{step.title}</span>
                  </div>
                  {expandedSteps[`${selectedGuide.id}-${index}`] ? (
                    <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                
                {expandedSteps[`${selectedGuide.id}-${index}`] && (
                  <div className="p-4 bg-white border-t border-gray-200">
                    <p className="text-gray-700 mb-4">{step.content}</p>
                    {step.tip && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <LightBulbIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium text-amber-800">نصيحة: </span>
                          <span className="text-amber-700">{step.tip}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Tips Summary */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5" />
              ملخص سريع
            </h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li className="flex items-center gap-2">
                <ArrowRightIcon className="w-3 h-3" />
                هذا القسم يحتوي على {selectedGuide.steps.length} خطوات
              </li>
              <li className="flex items-center gap-2">
                <ArrowRightIcon className="w-3 h-3" />
                اضغط على كل خطوة لعرض التفاصيل والنصائح
              </li>
              <li className="flex items-center gap-2">
                <ArrowRightIcon className="w-3 h-3" />
                للمساعدة الإضافية، تواصل مع إدارة المجمع
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Flowchart Section */}
      <div className="mt-8 bg-white/10 backdrop-blur rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 text-center">
          🗺️ مسار التعلم البسيط
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {[
            { icon: KeyIcon, label: 'ادخل', color: 'bg-amber-500' },
            { icon: ChartBarIcon, label: 'شاهد', color: 'bg-blue-500' },
            { icon: BuildingOfficeIcon, label: 'أدر', color: 'bg-green-500' },
            { icon: ChatBubbleLeftRightIcon, label: 'تواصل', color: 'bg-purple-500' }
          ].map((item, index) => (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center">
                <div className={`${item.color} p-3 rounded-full`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-sm mt-2">{item.label}</span>
              </div>
              {index < 3 && (
                <ArrowRightIcon className="w-6 h-6 text-white/60" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WrittenGuide;
