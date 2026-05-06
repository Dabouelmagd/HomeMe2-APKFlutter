import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyIcon, BuildingOffice2Icon, HomeModernIcon,
  ClipboardDocumentCheckIcon, ShieldCheckIcon, UserIcon
} from '@heroicons/react/24/outline';

export const RolesSection = () => {
  const { t } = useTranslation();

  const roles = [
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
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white" data-testid="roles-section">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_6_roles')}</h2>
          <p className="text-gray-500">{t('hp_roles_desc')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((role, i) => {
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
  );
};

export default RolesSection;
