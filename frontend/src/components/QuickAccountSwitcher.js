import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useAuth } from '../App';
import { saveCurrentSession } from '../utils/sessionManager';
import {
  UserPlusIcon,
  XMarkIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Consistent role styling with the SessionSwitcher palette.
const ROLE_STYLE = {
  app_owner:     { gradient: 'from-rose-500 to-pink-600',      label: 'Owner',   dot: '👑' },
  super_admin:   { gradient: 'from-purple-500 to-indigo-600',  label: 'Super',   dot: '⚡' },
  company_admin: { gradient: 'from-blue-500 to-cyan-600',      label: 'Company', dot: '🏢' },
  admin:         { gradient: 'from-emerald-500 to-green-600',  label: 'Admin',   dot: '🛠️' },
  compound_admin:{ gradient: 'from-emerald-500 to-teal-600',   label: 'Admin',   dot: '🛠️' },
  manager:       { gradient: 'from-amber-500 to-orange-600',   label: 'Manager', dot: '📊' },
  security:      { gradient: 'from-slate-500 to-gray-700',     label: 'Security',dot: '🛡️' },
  resident:      { gradient: 'from-sky-500 to-blue-600',       label: 'Resident',dot: '🏠' },
};
const styleFor = (role) => ROLE_STYLE[role] || ROLE_STYLE.resident;

/**
 * Compact header widget — shows one circular pill per linked account
 * (plus the current user's own pill highlighted). Click = silent switch
 * via POST /api/auth/switch-account. Long-press / trash icon = unlink.
 * Appears only when the user has 1+ linked accounts OR is a privileged role.
 */
const QuickAccountSwitcher = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLink, setShowLink] = useState(false);

  // Only owners / super_admins / admins can use the feature
  const eligibleRoles = ['app_owner', 'super_admin', 'company_admin', 'admin', 'compound_admin'];
  const canUse = user && eligibleRoles.includes(user.active_role || user.role);

  const fetchAccounts = async () => {
    if (!canUse) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/auth/linked-accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAccounts(res.data.accounts || []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); /* eslint-disable-next-line */ }, [user?.id]);

  const handleSwitch = async (accountId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API}/auth/switch-account`,
        { target_user_id: accountId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { access_token, user: newUser } = res.data;
      // Properly update the multi-session storage so App.js rehydrates with the new user
      saveCurrentSession(access_token, newUser);
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(newUser));
      // Clear any stale compound/role selection from the previous user
      localStorage.removeItem('selectedRole');
      localStorage.removeItem('selectedCompoundId');
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      toast.success(t('account_switched', `تم التبديل إلى ${newUser.full_name || newUser.username}`));
      // Full reload to rehydrate all providers / role-scoped UI
      setTimeout(() => { window.location.href = '/app/dashboard'; }, 500);
    } catch (err) {
      toast.error(err.response?.data?.detail || t('switch_failed', 'فشل التبديل'));
    }
  };

  const handleUnlink = async (accountId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/auth/unlink-account`,
        { target_user_id: accountId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t('unlinked', 'تم إلغاء الربط'));
      fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  if (!canUse) return null;

  return (
    <>
      <div
        className="flex items-center gap-1.5 px-1"
        data-testid="quick-account-switcher"
      >
        {/* Current user pill (not clickable — just a marker) */}
        {user && (
          <div
            className={`relative w-8 h-8 rounded-full bg-gradient-to-br ${styleFor(user.active_role || user.role).gradient} flex items-center justify-center text-white text-[10px] font-bold shadow-sm ring-2 ring-white dark:ring-gray-800`}
            title={`${user.full_name || user.username} · ${styleFor(user.active_role || user.role).label}`}
            data-testid="qas-current-pill"
          >
            <span>{styleFor(user.active_role || user.role).dot}</span>
            <span className="absolute -bottom-0.5 -end-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-white dark:border-gray-800"></span>
          </div>
        )}

        {/* Linked accounts — one pill each */}
        {accounts.map((acc) => {
          const st = styleFor(acc.role);
          return (
            <div key={acc.user_id} className="relative group">
              <button
                onClick={() => handleSwitch(acc.user_id)}
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${st.gradient} flex items-center justify-center text-white text-[10px] font-bold opacity-70 hover:opacity-100 hover:scale-110 transition-all shadow-sm`}
                title={`${acc.label} · ${st.label}${acc.compound_id ? '' : ''}`}
                data-testid={`qas-switch-${acc.username}`}
              >
                <span>{st.dot}</span>
              </button>
              <button
                onClick={() => handleUnlink(acc.user_id)}
                className="hidden group-hover:flex absolute -top-1 -end-1 w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-600 items-center justify-center text-white shadow"
                title={t('unlink', 'إلغاء الربط')}
                data-testid={`qas-unlink-${acc.username}`}
              >
                <XMarkIcon className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}

        {/* Add-account button */}
        <button
          onClick={() => setShowLink(true)}
          className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all"
          title={t('link_account', 'ربط حساب جديد')}
          data-testid="qas-add-btn"
        >
          <UserPlusIcon className="w-4 h-4" />
        </button>
      </div>

      {showLink && (
        <LinkAccountDialog
          onClose={() => setShowLink(false)}
          onLinked={() => { setShowLink(false); fetchAccounts(); }}
        />
      )}
    </>
  );
};

/**
 * Lightweight modal for linking a new account by username+password.
 */
const LinkAccountDialog = ({ onClose, onLinked }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!username.trim() || !password) {
      toast.error(t('enter_all_fields', 'أدخلي جميع البيانات'));
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/auth/link-account`,
        { username: username.trim(), password, label: label.trim() || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t('account_linked', 'تم ربط الحساب — اضغطي عليه للتبديل'));
      onLinked();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('link_failed', 'فشل الربط'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="qas-link-dialog"
    >
      <form
        onSubmit={submit}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <ArrowsRightLeftIcon className="w-5 h-5" />
            <h3 className="font-bold">{t('link_account_title', 'ربط حساب للتبديل السريع')}</h3>
          </div>
          <button type="button" onClick={onClose} className="hover:bg-white/20 p-1 rounded-lg" data-testid="qas-link-close">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('link_account_hint', 'أدخلي اسم المستخدم وكلمة المرور لحساب ترغبين في ربطه. سيظهر في الهيدر للتبديل السريع.')}
          </p>
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t('username', 'اسم المستخدم')}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              data-testid="qas-link-username"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t('password', 'كلمة المرور')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              data-testid="qas-link-password"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t('label_optional', 'تسمية اختيارية')}
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('label_placeholder', 'مثلاً: اختبار مقيم')}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              data-testid="qas-link-label"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold shadow disabled:opacity-50"
            data-testid="qas-link-submit"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <UserPlusIcon className="w-4 h-4" />
            )}
            <span>{loading ? t('linking', 'جاري الربط...') : t('link', 'ربط الحساب')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuickAccountSwitcher;
