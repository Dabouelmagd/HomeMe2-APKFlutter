import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import axios from 'axios';
import {
  ShieldCheckIcon,
  BuildingOfficeIcon,
  HomeModernIcon,
  LockClosedIcon,
  UserIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLE_CONFIG = {
  super_admin: {
    icon: ShieldCheckIcon,
    gradient: 'from-red-600 to-rose-700',
    border: 'border-red-500',
    bg: 'bg-red-600/20',
    badge: 'bg-red-500/20 text-red-300',
  },
  admin: {
    icon: BuildingOfficeIcon,
    gradient: 'from-blue-600 to-indigo-700',
    border: 'border-blue-500',
    bg: 'bg-blue-600/20',
    badge: 'bg-blue-500/20 text-blue-300',
  },
  company_admin: {
    icon: BuildingOfficeIcon,
    gradient: 'from-purple-600 to-violet-700',
    border: 'border-purple-500',
    bg: 'bg-purple-600/20',
    badge: 'bg-purple-500/20 text-purple-300',
  },
  manager: {
    icon: BuildingOfficeIcon,
    gradient: 'from-teal-600 to-cyan-700',
    border: 'border-teal-500',
    bg: 'bg-teal-600/20',
    badge: 'bg-teal-500/20 text-teal-300',
  },
  resident: {
    icon: HomeModernIcon,
    gradient: 'from-green-600 to-emerald-700',
    border: 'border-green-500',
    bg: 'bg-green-600/20',
    badge: 'bg-green-500/20 text-green-300',
  },
  security: {
    icon: LockClosedIcon,
    gradient: 'from-amber-600 to-orange-700',
    border: 'border-amber-500',
    bg: 'bg-amber-600/20',
    badge: 'bg-amber-500/20 text-amber-300',
  },
};

const AccountSelector = () => {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rememberChoice, setRememberChoice] = useState(false);

  const roleLabels = {
    super_admin: t('as_role_super_admin', 'المدير العام'),
    admin: t('as_role_admin', 'مدير المجمع'),
    company_admin: t('as_role_company_admin', 'مدير الشركة'),
    manager: t('as_role_manager', 'مدير'),
    resident: t('as_role_resident', 'ساكن'),
    security: t('as_role_security', 'حراسة'),
  };

  const roleDescriptions = {
    super_admin: t('as_desc_super_admin', 'إدارة كاملة للنظام وجميع المجمعات'),
    admin: t('as_desc_admin', 'إدارة المجمع السكني والسكان'),
    company_admin: t('as_desc_company_admin', 'إدارة مجمعات الشركة'),
    manager: t('as_desc_manager', 'إدارة العمليات اليومية'),
    resident: t('as_desc_resident', 'خدمات السكان والعائلة'),
    security: t('as_desc_security', 'مراقبة البوابات والزوار'),
  };

  useEffect(() => {
    // Check remembered choice
    const remembered = localStorage.getItem('rememberedAccount');
    if (remembered && localStorage.getItem('rememberCompound') === 'true') {
      try {
        const acc = JSON.parse(remembered);
        selectAndNavigate(acc);
        return;
      } catch {}
    }
    buildAccounts();
  }, []);

  const buildAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const accountsList = [];

      if (user?.role === 'super_admin') {
        // Super admin: show the super admin role + any compounds they manage
        accountsList.push({
          id: 'super_admin',
          role: 'super_admin',
          compound_id: null,
          compound_name: null,
          label: roleLabels.super_admin,
          description: roleDescriptions.super_admin,
        });

        // Also show compound-specific admin access
        try {
          const res = await axios.get(`${API}/super-admin/dashboard`, { headers });
          for (const c of (res.data.compounds || [])) {
            accountsList.push({
              id: `admin_${c.id}`,
              role: 'admin',
              compound_id: c.id,
              compound_name: c.name,
              label: roleLabels.admin,
              description: c.name,
              users: c.users || 0,
            });
          }
        } catch {}
      } else if (user?.role === 'company_admin') {
        accountsList.push({
          id: 'company_admin',
          role: 'company_admin',
          compound_id: null,
          compound_name: null,
          label: roleLabels.company_admin,
          description: roleDescriptions.company_admin,
        });

        try {
          const res = await axios.get(`${API}/companies/my-compounds`, { headers });
          for (const c of (res.data || [])) {
            accountsList.push({
              id: `admin_${c.id || c.compound_id}`,
              role: 'admin',
              compound_id: c.id || c.compound_id,
              compound_name: c.name || c.compound_name,
              label: roleLabels.admin,
              description: c.name || c.compound_name,
            });
          }
        } catch {}
      } else {
        // Regular user: single role
        accountsList.push({
          id: user?.role || 'resident',
          role: user?.role || 'resident',
          compound_id: user?.compound_id || null,
          compound_name: user?.compound_name || null,
          label: roleLabels[user?.role] || roleLabels.resident,
          description: user?.compound_name || roleDescriptions[user?.role] || '',
        });
      }

      setAccounts(accountsList);

      // If only one account, auto-select it
      if (accountsList.length === 1) {
        setSelected(accountsList[0].id);
      }
    } catch {
      navigate('/app/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const selectAndNavigate = (account) => {
    const acc = typeof account === 'string' ? accounts.find(a => a.id === account) : account;
    if (!acc) return;

    localStorage.setItem('selectedCompoundId', acc.compound_id || '');
    localStorage.setItem('selectedRole', acc.role);
    localStorage.setItem('rememberedAccount', JSON.stringify(acc));

    if (rememberChoice) {
      localStorage.setItem('rememberCompound', 'true');
    }

    if (updateUser) {
      updateUser({
        ...user,
        selected_compound_id: acc.compound_id,
        selected_compound_name: acc.compound_name,
        active_role: acc.role,
      });
    }

    navigate('/app/dashboard', { replace: true });
  };

  const handleContinue = () => {
    const acc = accounts.find(a => a.id === selected);
    if (acc) selectAndNavigate(acc);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (accounts.length === 0) {
    navigate('/app/dashboard', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4"
      dir={isRTL ? 'rtl' : 'ltr'} data-testid="account-selector">

      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 mb-4">
            <UserIcon className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {t('as_welcome', 'مرحباً بعودتك')}
          </h1>
          {user?.name && (
            <p className="text-purple-300 text-lg font-semibold">{user.name}</p>
          )}
          <p className="text-gray-400 text-sm mt-1">
            {t('as_choose_account', 'اختر نوع الحساب الذي تريد الدخول إليه')}
          </p>
        </div>

        {/* Account Cards */}
        <div className={`grid gap-4 mb-6 ${accounts.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : accounts.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {accounts.map(acc => {
            const config = ROLE_CONFIG[acc.role] || ROLE_CONFIG.resident;
            const IconComponent = config.icon;
            const isSelected = selected === acc.id;

            return (
              <button
                key={acc.id}
                onClick={() => setSelected(acc.id)}
                data-testid={`account-card-${acc.id}`}
                className={`relative group p-6 rounded-2xl border-2 transition-all duration-200 ${isRTL ? 'text-right' : 'text-left'} ${
                  isSelected
                    ? `${config.bg} ${config.border} shadow-lg`
                    : 'bg-white/5 border-gray-700/50 hover:border-gray-500 hover:bg-white/10'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 end-3">
                    <CheckCircleIcon className="w-6 h-6 text-green-400" />
                  </div>
                )}

                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                  <IconComponent className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-lg font-bold text-white mb-1">
                  {acc.label}
                </h3>

                <p className="text-sm text-gray-400 mb-3">
                  {acc.description}
                </p>

                {/* Role badge */}
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.badge}`}>
                  {acc.role === 'super_admin' && t('as_badge_full_access', 'صلاحيات كاملة')}
                  {acc.role === 'admin' && (acc.users != null ? `${acc.users} ${t('as_users', 'مستخدم')}` : t('as_badge_compound_mgmt', 'إدارة المجمع'))}
                  {acc.role === 'company_admin' && t('as_badge_company', 'إدارة الشركة')}
                  {acc.role === 'manager' && t('as_badge_operations', 'العمليات')}
                  {acc.role === 'resident' && t('as_badge_services', 'الخدمات والعائلة')}
                  {acc.role === 'security' && t('as_badge_gates', 'البوابات والزوار')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Remember + Continue */}
        <div className="bg-white/5 backdrop-blur rounded-2xl border border-gray-700/50 p-5 max-w-md mx-auto">
          <label className="flex items-center gap-3 mb-4 cursor-pointer group" data-testid="remember-choice">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={e => setRememberChoice(e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
            />
            <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
              {t('as_remember', 'تذكر اختياري (الدخول مباشرة في المرة القادمة)')}
            </span>
          </label>

          <button
            onClick={handleContinue}
            disabled={!selected}
            data-testid="as-continue-btn"
            className={`w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-base transition-all ${
              selected
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {t('as_continue', 'متابعة')}
            {isRTL ? <ArrowLeftIcon className="w-5 h-5" /> : <ArrowRightIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountSelector;
