import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';
import PushNotifications from './PushNotifications';
import NotificationPreferencesPage from './NotificationPreferencesPage';
import WeeklyDigestSettings from './WeeklyDigestSettings';
import {
  Cog6ToothIcon,
  UserIcon,
  BellIcon,
  LanguageIcon,
  ShieldCheckIcon,
  KeyIcon,
  FingerPrintIcon,
  UserGroupIcon,
  UserPlusIcon,
  HomeModernIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import PageHeader from './shared/PageHeader';

// Import settings components
import {
  BiometricSettings,
  ProfileSettings,
  PrivacySettings,
  LanguageSettings,
  OverviewSettings,
  ResidencesSettings,
  RegistrationLinksSettings,
  UserManagementSettings,
  AddAdminSettings
} from './settings';


// ── Settings sub-components ────────────────────────────────────
const OverviewSettings = () => {
  const { user } = useAuth();
  const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
  const [stats, setStats] = React.useState(null);
  React.useEffect(() => {
    fetch(`${API}/compounds/${user?.compound_id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()).then(d => setStats(d)).catch(() => {});
  }, []);
  return (
    <div className="p-6 space-y-4" dir="rtl">
      <h3 className="font-black text-gray-900 dark:text-white">نظرة عامة على الكمبوند</h3>
      {stats ? (
        <div className="grid grid-cols-2 gap-3">
          {[
            ['اسم الكمبوند', stats.name],
            ['العنوان', stats.address || '—'],
            ['عدد المباني', stats.buildings_count || 0],
            ['عدد الوحدات', stats.units_count || 0],
          ].map(([l,v]) => (
            <div key={l} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 p-3">
              <p className="text-xs text-gray-500">{l}</p>
              <p className="font-bold text-gray-900 dark:text-white mt-1">{v}</p>
            </div>
          ))}
        </div>
      ) : <p className="text-gray-400 text-sm">جاري التحميل...</p>}
    </div>
  );
};

const ResidencesSettings = () => {
  const navigate = useNavigate();
  React.useEffect(() => { navigate('/app/residents'); }, []);
  return null;
};

const RegistrationLinksSettings = () => {
  const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
  const { user } = useAuth();
  const [links, setLinks] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    fetch(`${API}/compound-invites?compound_id=${user?.compound_id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()).then(d => setLinks(d.invites || [])).catch(() => {});
  }, []);
  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/compound-invites`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ compound_id: user?.compound_id, role: 'resident', expires_days: 30 })
      });
      const data = await res.json();
      setLinks(p => [data, ...p]);
    } catch {}
    setLoading(false);
  };
  return (
    <div className="p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-gray-900 dark:text-white">روابط التسجيل</h3>
        <button onClick={generate} disabled={loading}
          className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-60">
          + إنشاء رابط جديد
        </button>
      </div>
      <div className="space-y-2">
        {links.length === 0 && <p className="text-gray-400 text-sm text-center py-4">لا توجد روابط بعد</p>}
        {links.map((l,i) => (
          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-2">
            <code className="text-xs text-emerald-700 break-all">{`https://homemeapp.net/register?invite=${l.code || l.id || i}`}</code>
            <button onClick={() => { navigator.clipboard.writeText(`https://homemeapp.net/register?invite=${l.code || l.id || i}`); }}
              className="text-xs text-blue-600 hover:underline flex-shrink-0">نسخ</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const UserManagementSettings = () => {
  const navigate = useNavigate();
  React.useEffect(() => { navigate('/app/user-management'); }, []);
  return null;
};

const AddAdminSettings = () => {
  const navigate = useNavigate();
  React.useEffect(() => { navigate('/app/staff'); }, []);
  return null;
};

const ProfileSettings = () => {
  const navigate = useNavigate();
  React.useEffect(() => { navigate('/app/profile'); }, []);
  return null;
};

const PrivacySettings = () => (
  <div className="p-6" dir="rtl">
    <h3 className="font-black text-gray-900 dark:text-white mb-4">الخصوصية</h3>
    <div className="space-y-3">
      {[
        ['مشاركة الموقع', 'يمكنك التحكم في من يرى موقعك داخل الكمبوند'],
        ['رؤية ملفك الشخصي', 'السكان والإدارة يمكنهم رؤية اسمك ووحدتك'],
        ['سجل النشاط', 'يتم حفظ نشاطك لمدة 90 يوماً'],
      ].map(([t,d]) => (
        <div key={t} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 p-4 flex items-center justify-between">
          <div><p className="font-bold text-sm text-gray-900 dark:text-white">{t}</p>
               <p className="text-xs text-gray-500 mt-0.5">{d}</p></div>
        </div>
      ))}
    </div>
  </div>
);

const BiometricSettings = () => (
  <div className="p-6 text-center" dir="rtl">
    <div className="text-5xl mb-4">🔐</div>
    <h3 className="font-black text-gray-900 dark:text-white mb-2">إعدادات البصمة</h3>
    <p className="text-gray-500 text-sm mb-4">تسجيل الدخول بالبصمة أو التعرف على الوجه متاح عبر التطبيق المحمول فقط</p>
    <a href="https://homemeapp.net" target="_blank" rel="noreferrer"
      className="inline-block bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm">
      تحميل التطبيق
    </a>
  </div>
);

const LanguageSettings = () => {
  const { i18n } = useTranslation();
  const langs = [
    { code: 'ar', label: 'العربية', flag: '🇸🇦', dir: 'rtl' },
    { code: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' },
    { code: 'fr', label: 'Français', flag: '🇫🇷', dir: 'ltr' },
  ];
  const current = i18n.language?.split('-')[0] || 'ar';
  const change = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    document.dir = code === 'ar' ? 'rtl' : 'ltr';
  };
  return (
    <div className="p-6 space-y-3" dir="rtl">
      <h3 className="font-black text-gray-900 dark:text-white">اختيار اللغة</h3>
      {langs.map(l => (
        <button key={l.code} onClick={() => change(l.code)}
          className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
            current === l.code ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
          }`}>
          <span className="text-2xl">{l.flag}</span>
          <span className="font-bold text-gray-900 dark:text-white">{l.label}</span>
          {current === l.code && <span className="mr-auto text-emerald-600 text-sm font-bold">✓ محددة</span>}
        </button>
      ))}
    </div>
  );
};

const Settings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  // Persist active tab in URL so page refresh keeps user on the same screen
  const activeTab = searchParams.get('tab') || null;

  // Roles that are not tenant-level admins — they must NOT see compound-specific
  // admin settings (Overview / Residences / Registration Links). They can still
  // manage users & add admins from their own dashboards.
  const isHighLevelAdmin = user?.role === 'app_owner' || user?.role === 'super_admin';

  const setActiveTab = (tab) => {
    if (tab) {
      setSearchParams({ tab }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  // Navigate directly to the dashboard on the back button instead of browser history,
  // to avoid jumping to the previously-visited sidebar page
  const goBackHome = () => {
    navigate('/app/dashboard');
  };

  const settingsCategories = [
    {
      id: 'account',
      title: t('account_settings', 'إعدادات الحساب'),
      items: [
        {
          id: 'profile',
          name: t('settings_profile', 'الملف الشخصي'),
          description: t('profile_desc', 'تعديل معلوماتك الشخصية وصورتك'),
          icon: UserIcon,
          color: 'bg-blue-500',
          lightColor: 'bg-blue-50 dark:bg-blue-900/20',
          textColor: 'text-blue-600 dark:text-blue-400'
        },
        {
          id: 'privacy',
          name: t('settings_privacy', 'الخصوصية'),
          description: t('privacy_desc', 'التحكم في من يرى معلوماتك'),
          icon: ShieldCheckIcon,
          color: 'bg-purple-500',
          lightColor: 'bg-purple-50 dark:bg-purple-900/20',
          textColor: 'text-purple-600 dark:text-purple-400'
        },
        {
          id: 'biometric',
          name: t('biometric_settings', 'إعدادات البصمة'),
          description: t('biometric_desc', 'تسجيل الدخول بالبصمة أو الوجه'),
          icon: FingerPrintIcon,
          color: 'bg-emerald-500',
          lightColor: 'bg-emerald-50 dark:bg-emerald-900/20',
          textColor: 'text-emerald-600 dark:text-emerald-400'
        }
      ]
    },
    {
      id: 'preferences',
      title: t('preferences', 'التفضيلات'),
      items: [
        {
          id: 'notifications',
          name: t('settings_notifications', 'الإشعارات'),
          description: t('notifications_desc', 'تفعيل إشعارات المتصفح Push'),
          icon: BellIcon,
          color: 'bg-amber-500',
          lightColor: 'bg-amber-50 dark:bg-amber-900/20',
          textColor: 'text-amber-600 dark:text-amber-400'
        },
        {
          id: 'notif_channels',
          name: t('notif_channels', 'قنوات الإشعارات'),
          description: t('notif_channels_desc', 'اختر Push/Email/SMS لكل نوع حدث'),
          icon: BellIcon,
          color: 'bg-purple-500',
          lightColor: 'bg-purple-50 dark:bg-purple-900/20',
          textColor: 'text-purple-600 dark:text-purple-400'
        },
        {
          id: 'weekly_digest',
          name: t('weekly_digest', 'التقرير الأسبوعي'),
          description: t('weekly_digest_desc', 'يوم/ساعة الإرسال + اختيار الأقسام'),
          icon: BellIcon,
          color: 'bg-emerald-500',
          lightColor: 'bg-emerald-50 dark:bg-emerald-900/20',
          textColor: 'text-emerald-600 dark:text-emerald-400'
        },
        {
          id: 'language',
          name: t('settings_language', 'اللغة'),
          description: t('language_desc', 'اختيار لغة التطبيق'),
          icon: LanguageIcon,
          color: 'bg-cyan-500',
          lightColor: 'bg-cyan-50 dark:bg-cyan-900/20',
          textColor: 'text-cyan-600 dark:text-cyan-400'
        }
      ]
    },
    {
      id: 'admin',
      title: t('admin_settings', 'إعدادات المدير'),
      items: [
        // Overview / Residences / Registration Links are compound-level — hide for App Owner & Super Admin
        ...(isHighLevelAdmin ? [] : [
          {
            id: 'overview',
            name: t('overview', 'نظرة عامة'),
            description: t('overview_desc', 'إحصائيات ومعلومات المجمع'),
            icon: Cog6ToothIcon,
            color: 'bg-indigo-500',
            lightColor: 'bg-indigo-50 dark:bg-indigo-900/20',
            textColor: 'text-indigo-600 dark:text-indigo-400'
          },
          {
            id: 'residences',
            name: t('residences_list', 'قائمة الإقامات'),
            description: t('residences_desc', 'عرض وإدارة الوحدات السكنية'),
            icon: HomeModernIcon,
            color: 'bg-teal-500',
            lightColor: 'bg-teal-50 dark:bg-teal-900/20',
            textColor: 'text-teal-600 dark:text-teal-400',
            badge: '1'
          }
        ]),
        {
          id: 'user_management',
          name: t('user_management', 'إدارة المستخدمين'),
          description: t('user_management_desc', 'إدارة جميع المستخدمين'),
          icon: UserGroupIcon,
          color: 'bg-orange-500',
          lightColor: 'bg-orange-50 dark:bg-orange-900/20',
          textColor: 'text-orange-600 dark:text-orange-400'
        },
        {
          id: 'add_admin',
          name: t('add_admin', 'إضافة مدير'),
          description: t('add_admin_desc', 'إضافة مدير جديد للمجمع'),
          icon: UserPlusIcon,
          color: 'bg-rose-500',
          lightColor: 'bg-rose-50 dark:bg-rose-900/20',
          textColor: 'text-rose-600 dark:text-rose-400'
        },
        // Registration Links — available to all admin roles (App Owner / Super Admin / Company Admin / Compound Admin)
        {
          id: 'registration_links',
          name: t('registration_links', 'روابط التسجيل'),
          description: t('registration_links_desc', 'إنشاء روابط دعوة للسكان'),
          icon: KeyIcon,
          color: 'bg-pink-500',
          lightColor: 'bg-pink-50 dark:bg-pink-900/20',
          textColor: 'text-pink-600 dark:text-pink-400',
          badge: '0'
        },
        ...(!isHighLevelAdmin ? [{
          id: 'reset_compound',
          name: '♻️ إعادة تعيين الكمبوند',
          description: 'حذف بيانات الكمبوند مع الحفاظ على الإعدادات',
          icon: ArrowPathIcon,
          color: 'bg-red-600',
          lightColor: 'bg-red-50 dark:bg-red-900/20',
          textColor: 'text-red-600 dark:text-red-400',
          danger: true
        }] : [])
      ]
    }
  ];

  // Get active item data
  const getActiveItemData = () => {
    for (const category of settingsCategories) {
      const item = category.items.find(i => i.id === activeTab);
      if (item) return item;
    }
    return null;
  };

  const activeItemData = getActiveItemData();

  // Render content based on active tab
  const renderContent = () => {
    // Block strictly-compound-level tabs for App Owner & Super Admin (e.g. residences/overview).
    // Note: registration_links IS available to wide-scope admins — they pick the target compound in the create modal.
    if (isHighLevelAdmin && ['overview', 'residences'].includes(activeTab)) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-300">
            {t('setting_unavailable_for_role', 'هذا الإعداد غير متاح لدورك الحالي.')}
          </p>
        </div>
      );
    }
    switch (activeTab) {
      case 'overview':
        return <OverviewSettings />;
      case 'residences':
        return <ResidencesSettings />;
      case 'registration_links':
        return <RegistrationLinksSettings />;
      case 'user_management':
        return <UserManagementSettings />;
      case 'reset_compound':
        return <ResetCompoundPanel compoundId={user?.compound_id} />;
      case 'add_admin':
        return <AddAdminSettings />;
      case 'notifications':
        return <PushNotifications />;
      case 'notif_channels':
        return <NotificationPreferencesPage />;
      case 'weekly_digest':
        return <WeeklyDigestSettings />;
      case 'profile':
        return <ProfileSettings />;
      case 'privacy':
        return <PrivacySettings />;
      case 'biometric':
        return <BiometricSettings />;
      case 'language':
        return <LanguageSettings />;
      default:
        return null;
    }
  };

  // Main settings list view
  if (!activeTab) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-rose-950 to-gray-900 p-6" dir="rtl" data-testid="settings-page">
        <div className="max-w-5xl mx-auto space-y-6">
          <PageHeader
            theme="rose"
            icon={Cog6ToothIcon}
            badge={t('settings_badge', 'إعدادات الحساب والنظام')}
            title={t('settings_title', 'الإعدادات')}
            subtitle={t('settings_subtitle', 'إدارة حسابك وتفضيلاتك')}
            actions={
              <button
                onClick={goBackHome}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-colors text-sm font-semibold"
                data-testid="settings-back-btn"
              >
                <ArrowLeftIcon className="w-4 h-4 rtl:rotate-180" />
                {t('back', 'رجوع')}
              </button>
            }
            testId="settings-page-header"
          />

          {/* Settings List */}
          <div className="space-y-8">
            {settingsCategories.map((category) => (
              <div key={category.id} className="space-y-3">
                {/* Category Title — Owner theme */}
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1 h-5 bg-gradient-to-b from-rose-500 to-pink-600 rounded-full"></div>
                  <h2 className="text-sm font-bold text-gray-100 tracking-wide">
                    {category.title}
                  </h2>
              </div>
              
              {/* Category Items — Grid of cards matching Owner dashboard style */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {category.items.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.id}
                      data-testid={`settings-item-${item.id}`}
                      onClick={() => setActiveTab(item.id)}
                      className="group relative bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-rose-300/40 p-4 shadow-sm hover:shadow-lg transition-all duration-200 text-start"
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className={`${item.lightColor} p-3 rounded-xl transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3 flex-shrink-0`}>
                          <IconComponent className={`w-6 h-6 ${item.textColor}`} />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-white">
                              {item.name}
                            </h3>
                            {item.badge && (
                              <span className={`${item.color} text-white text-[10px] px-2 py-0.5 rounded-full font-bold`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-300 mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        </div>

                        {/* Arrow with rose tint on hover */}
                        <ChevronRightIcon className="w-5 h-5 text-gray-500 rtl:rotate-180 transition-all duration-200 group-hover:text-rose-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* App Info — Owner style */}
          <div className="text-center py-8 border-t border-white/10 mt-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500/20 to-pink-500/20 rounded-full text-rose-300 text-sm font-semibold">
              <SparklesIcon className="w-4 h-4" />
              <span>HomeMe v2.0 · Powered by DataLife AI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  }

  // Detail view for selected setting
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-rose-950 to-gray-900 p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          theme="rose"
          icon={activeItemData?.icon || Cog6ToothIcon}
          title={activeItemData?.name || t('settings_title', 'الإعدادات')}
          subtitle={activeItemData?.description || ''}
          actions={
            <button
              onClick={() => setActiveTab(null)}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
              data-testid="settings-detail-back"
            >
              <ArrowLeftIcon className="w-5 h-5 text-white rtl:rotate-180" />
            </button>
          }
          testId="settings-detail-header"
        />

        {/* Content */}
        <div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};


const ResetCompoundPanel = ({ compoundId }) => {
  const [confirmText, setConfirmText] = React.useState('');
  const [selected, setSelected] = React.useState(['residents','payments','maintenance','visitors']);
  const [loading, setLoading] = React.useState(false);
  const options = [
    {id:'residents',label:'السكان والمقيمين'},
    {id:'payments',label:'المدفوعات والفواتير'},
    {id:'maintenance',label:'طلبات الصيانة'},
    {id:'visitors',label:'الزوار والتصاريح'},
    {id:'complaints',label:'الشكاوى والاقتراحات'},
  ];
  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
  const submit = async () => {
    if (confirmText !== 'اعادة تعيين') return toast.error('اكتب كلمة التأكيد بالضبط');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/compounds/${compoundId}/reset`,
        {confirm_text: confirmText, what: selected},
        {headers:{Authorization:`Bearer ${token}`}}
      );
      toast.success('✅ تمت إعادة تعيين الكمبوند');
      setConfirmText('');
    } catch(e) { toast.error(e.response?.data?.detail || 'فشلت العملية'); }
    finally { setLoading(false); }
  };
  return (
    <div className="max-w-lg mx-auto p-6 space-y-4" dir="rtl">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <h3 className="font-black text-red-700 flex items-center gap-2 mb-2">
          ⚠️ تحذير: إعادة تعيين الكمبوند
        </h3>
        <p className="text-red-600 text-sm">هذا الإجراء لا يمكن التراجع عنه. سيتم حذف البيانات المحددة نهائياً.</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 p-4">
        <p className="font-bold text-sm mb-3">اختر البيانات المراد حذفها:</p>
        <div className="space-y-2">
          {options.map(o => (
            <label key={o.id} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={selected.includes(o.id)} onChange={()=>toggle(o.id)}
                className="w-4 h-4 text-red-600" />
              <span className="text-sm">{o.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold mb-1">اكتب "اعادة تعيين" للتأكيد:</label>
        <input value={confirmText} onChange={e=>setConfirmText(e.target.value)}
          placeholder="اعادة تعيين" dir="rtl"
          className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-300" />
      </div>
      <button onClick={submit} disabled={loading || confirmText !== 'اعادة تعيين'}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl text-sm disabled:opacity-50 transition-colors">
        {loading ? 'جاري الحذف...' : '♻️ تأكيد إعادة التعيين'}
      </button>
    </div>
  );
};

export default Settings;
