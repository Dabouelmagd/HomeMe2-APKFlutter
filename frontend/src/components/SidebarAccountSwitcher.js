import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../App';
import { saveCurrentSession } from '../utils/sessionManager';
import {
  UserPlusIcon,
  XMarkIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Visual style per role — mirrors QuickAccountSwitcher palette for consistency.
const ROLE_STYLE = {
  app_owner:     { gradient: 'from-rose-500 to-pink-600',     label: 'مالك',     dot: '👑' },
  super_admin:   { gradient: 'from-purple-500 to-indigo-600', label: 'سوبر',     dot: '⚡' },
  company_admin: { gradient: 'from-blue-500 to-cyan-600',     label: 'شركة',     dot: '🏢' },
  admin:         { gradient: 'from-emerald-500 to-green-600', label: 'مدير',     dot: '🛠️' },
  compound_admin:{ gradient: 'from-emerald-500 to-teal-600',  label: 'مدير',     dot: '🛠️' },
  manager:       { gradient: 'from-amber-500 to-orange-600',  label: 'مشرف',     dot: '📊' },
  security:      { gradient: 'from-slate-500 to-gray-700',    label: 'أمن',      dot: '🛡️' },
  resident:      { gradient: 'from-sky-500 to-blue-600',      label: 'ساكن',     dot: '🏠' },
};
const styleFor = (role) => ROLE_STYLE[role] || ROLE_STYLE.resident;

/**
 * SidebarAccountSwitcher — vertically-stacked account switcher placed in
 * the sidebar bottom section. Shows linked accounts as full-width cards so
 * users on any role (incl. residents) can switch with a single click.
 *
 * Unlike the header-bound QuickAccountSwitcher (pills) and SessionSwitcher
 * (tab-based), this component is always visible inside the sidebar and is
 * styled to match its vertical layout.
 */
const SidebarAccountSwitcher = ({ isSuperAdmin = false }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [showAddCta, setShowAddCta] = useState(false); // surface "+ add" even with 0 accounts on hover
  const fetchedOnceRef = useRef(false);

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(`${API}/auth/linked-accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAccounts(res.data?.accounts || []);
    } catch {
      setAccounts([]);
    } finally {
      fetchedOnceRef.current = true;
    }
  };

  useEffect(() => {
    if (user?.id) fetchAccounts();
    // Re-fetch only when the logged-in user changes
  }, [user?.id]); // eslint-disable-line

  const handleSwitch = async (accountId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API}/auth/switch-account`,
        { target_user_id: accountId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { access_token, user: newUser } = res.data;
      // Clean previous-user residue before swapping the JWT
      try { sessionStorage.removeItem('tab_session_id'); } catch { /* silent */ }
      localStorage.removeItem('selectedRole');
      localStorage.removeItem('selectedCompoundId');
      saveCurrentSession(access_token, newUser);
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(newUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      toast.success(t('account_switched', `تم التبديل إلى ${newUser.full_name || newUser.username}`));
      // Hard-replace prevents browser back-button leaking previous role state
      setTimeout(() => { window.location.replace('/app/dashboard'); }, 450);
    } catch (err) {
      toast.error(err.response?.data?.detail || t('switch_failed', 'فشل التبديل'));
    }
  };

  const handleUnlink = async (e, accountId) => {
    e.stopPropagation();
    if (!window.confirm(t('confirm_unlink', 'هل تريد إلغاء ربط هذا الحساب؟'))) return;
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

  if (!user) return null;
  const me = styleFor(user.active_role || user.role);
  const hasLinked = accounts.length > 0;

  // Color palette — adapt to super-admin dark sidebar
  const headerCls = isSuperAdmin
    ? 'text-gray-400 hover:text-gray-200'
    : 'text-gray-600 hover:text-gray-900';
  const cardCls = isSuperAdmin
    ? 'bg-gray-900/50 hover:bg-gray-800 border-gray-800'
    : 'bg-gray-50 hover:bg-white border-gray-200';
  const labelCls = isSuperAdmin ? 'text-gray-200' : 'text-gray-800';
  const subLabelCls = isSuperAdmin ? 'text-gray-500' : 'text-gray-500';

  // 💡 UX: when the user has no linked accounts yet, surface a compact
  // "+ ربط حساب" inline link only. This keeps the sidebar uncluttered until
  // there is something to switch to. Once a first account is linked,
  // `expanded` is auto-set to true so the user immediately sees the new card.
  if (!hasLinked && !showAddCta) {
    return (
      <>
        <button
          type="button"
          onClick={() => { setShowAddCta(true); setShowLink(true); }}
          className={`w-full flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition ${
            isSuperAdmin
              ? 'text-gray-500 hover:text-purple-300 hover:bg-purple-900/20'
              : 'text-gray-500 hover:text-blue-700 hover:bg-blue-50'
          }`}
          data-testid="sidebar-account-add-empty"
          title={t('link_first_account_hint', 'اربط حساب آخر للتبديل السريع')}
        >
          <UserPlusIcon className="w-3.5 h-3.5" />
          <span>{t('link_first_account', 'ربط حساب آخر')}</span>
        </button>
        {showLink && (
          <LinkAccountDialog
            onClose={() => { setShowLink(false); setShowAddCta(false); }}
            onLinked={() => { setShowLink(false); fetchAccounts(); setExpanded(true); }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="mb-2" data-testid="sidebar-account-switcher">
        {/* Section header — toggles list */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-semibold ${headerCls} transition`}
          data-testid="sidebar-account-switcher-toggle"
          aria-expanded={expanded}
        >
          <span className="flex items-center gap-1.5">
            <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
            <span>{t('switch_account', 'تبديل الحسابات')}</span>
            {hasLinked && (
              <span className={`px-1.5 rounded-full text-[10px] font-bold ${isSuperAdmin ? 'bg-purple-900/50 text-purple-300' : 'bg-blue-100 text-blue-700'}`}>
                {accounts.length}
              </span>
            )}
          </span>
          <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {expanded && (
          <div className="mt-1 space-y-1.5" data-testid="sidebar-account-switcher-list">
            {/* Current account marker (read-only) */}
            <div
              className={`flex items-center gap-2 px-2 py-2 rounded-lg border ${cardCls} opacity-95`}
              data-testid="sidebar-account-current"
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${me.gradient} flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0`}>
                <span>{me.dot}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold ${labelCls} truncate`}>
                  {user.full_name || user.username}
                </div>
                <div className={`text-[10px] ${subLabelCls} truncate`}>
                  {me.label} · {t('current', 'الحالي')}
                </div>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" title={t('active', 'نشط')}></span>
            </div>

            {/* Linked accounts — clickable */}
            {accounts.map((acc) => {
              const st = styleFor(acc.role);
              return (
                <div key={acc.user_id} className="relative group">
                  <button
                    type="button"
                    onClick={() => handleSwitch(acc.user_id)}
                    className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg border ${cardCls} transition text-start`}
                    data-testid={`sidebar-account-switch-${acc.username}`}
                    title={t('click_to_switch', 'انقري للتبديل')}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${st.gradient} flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0`}>
                      <span>{st.dot}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold ${labelCls} truncate`}>
                        {acc.label || acc.full_name || acc.username}
                      </div>
                      <div className={`text-[10px] ${subLabelCls} truncate`}>
                        {st.label} · @{acc.username}
                      </div>
                    </div>
                    <ArrowsRightLeftIcon className={`w-3.5 h-3.5 ${subLabelCls} flex-shrink-0`} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleUnlink(e, acc.user_id)}
                    className={`absolute top-1 ${'end-1'} hidden group-hover:flex w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 items-center justify-center text-white shadow z-10`}
                    title={t('unlink', 'إلغاء الربط')}
                    data-testid={`sidebar-account-unlink-${acc.username}`}
                  >
                    <XMarkIcon className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}

            {/* Add new linked account */}
            <button
              type="button"
              onClick={() => setShowLink(true)}
              className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border-2 border-dashed transition text-xs font-medium ${
                isSuperAdmin
                  ? 'border-gray-700 text-gray-400 hover:border-purple-500 hover:text-purple-300 hover:bg-purple-900/20'
                  : 'border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
              }`}
              data-testid="sidebar-account-add"
            >
              <UserPlusIcon className="w-3.5 h-3.5" />
              <span>{t('add_linked_account', 'ربط حساب جديد')}</span>
            </button>
          </div>
        )}
      </div>

      {showLink && (
        <LinkAccountDialog
          onClose={() => setShowLink(false)}
          onLinked={() => { setShowLink(false); fetchAccounts(); setExpanded(true); }}
        />
      )}
    </>
  );
};

/**
 * Modal — link a new account by username + password. Reused/adapted from
 * QuickAccountSwitcher for a consistent UX. Re-implemented locally so we
 * don't tightly couple to the header component (which may evolve separately).
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
      data-testid="sidebar-account-link-dialog"
    >
      <form
        onSubmit={submit}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <ArrowsRightLeftIcon className="w-5 h-5" />
            <h3 className="font-bold">{t('link_account_title', 'ربط حساب للتبديل السريع')}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hover:bg-white/20 p-1 rounded-lg"
            data-testid="sidebar-account-link-close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('link_account_hint', 'أدخلي اسم المستخدم وكلمة المرور لحساب ترغبين في ربطه. سيظهر في القائمة الجانبية للتبديل السريع.')}
          </p>
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {t('username', 'اسم المستخدم')}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              data-testid="sidebar-account-link-username"
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
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              data-testid="sidebar-account-link-password"
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
              placeholder={t('label_placeholder', 'مثلاً: حسابي كساكن')}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              data-testid="sidebar-account-link-label"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow disabled:opacity-50"
            data-testid="sidebar-account-link-submit"
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

export default SidebarAccountSwitcher;
