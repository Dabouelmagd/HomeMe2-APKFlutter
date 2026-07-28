import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../App';
import { saveCurrentSession } from '../utils/sessionManager';
import {
  ChevronDownIcon, UserPlusIcon, ArrowsRightLeftIcon,
  XMarkIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLE_CONFIG = {
  app_owner:      { label: 'مالك التطبيق', emoji: '👑', bg: 'bg-rose-100',    text: 'text-rose-700',    border: 'border-rose-200'    },
  super_admin:    { label: 'سوبر أدمن',    emoji: '⚡', bg: 'bg-purple-100',  text: 'text-purple-700',  border: 'border-purple-200'  },
  company_admin:  { label: 'مدير شركة',    emoji: '🏢', bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200'    },
  admin:          { label: 'مدير كمبوند',  emoji: '🛠️', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  manager:        { label: 'مشرف',         emoji: '📊', bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-200'   },
  assistant_manager: { label: 'مساعد مدير', emoji: '🤝', bg: 'bg-teal-100',  text: 'text-teal-700',    border: 'border-teal-200'    },
  accountant:     { label: 'محاسب',        emoji: '💰', bg: 'bg-yellow-100',  text: 'text-yellow-700',  border: 'border-yellow-200'  },
  security:       { label: 'أمن',          emoji: '🛡️', bg: 'bg-slate-100',   text: 'text-slate-700',   border: 'border-slate-200'   },
  resident:       { label: 'ساكن',         emoji: '🏠', bg: 'bg-sky-100',     text: 'text-sky-700',     border: 'border-sky-200'     },
  family_head:    { label: 'رب أسرة',      emoji: '👨‍👩‍👧', bg: 'bg-cyan-100', text: 'text-cyan-700',    border: 'border-cyan-200'    },
};

const roleFor = (role) => ROLE_CONFIG[role] || ROLE_CONFIG.resident;

function Avatar({ account, size = 'md' }) {
  const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-12 h-12 text-lg' : 'w-10 h-10 text-base';
  const cfg = roleFor(account?.role);

  const photoSrc = account?.photo
    ? (account.photo.startsWith('http') ? account.photo : `${BACKEND}${account.photo}`)
    : account?.compound_logo
    ? (account.compound_logo.startsWith('http') ? account.compound_logo : `${BACKEND}${account.compound_logo}`)
    : null;

  if (photoSrc) {
    return (
      <img src={photoSrc} alt={account?.label}
        className={`${sizeClass} rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0`}
        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0 font-bold ${cfg.text}`}>
      {cfg.emoji}
    </div>
  );
}

export default function AccountSwitcherDropdown() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(null);
  const [showLink, setShowLink] = useState(false);
  const [linkForm, setLinkForm] = useState({ username: '', password: '', label: '' });
  const [linking, setLinking] = useState(false);
  const ref = useRef(null);

  const fetchAccounts = async () => {
    try {
      const { data } = await axios.get(`${API}/auth/linked-accounts`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setAccounts(data.accounts || []);
    } catch { setAccounts([]); }
  };

  useEffect(() => { if (user?.id) fetchAccounts(); }, [user?.id]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSwitch = async (accountId) => {
    if (switching) return;
    setSwitching(accountId);
    try {
      const { data } = await axios.post(
        `${API}/auth/switch-account`,
        { target_user_id: accountId },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      sessionStorage.removeItem('tab_session_id');
      localStorage.removeItem('selectedRole');
      localStorage.removeItem('selectedCompoundId');
      saveCurrentSession(data.access_token, data.user);
      toast.success(`تم التبديل إلى ${data.user?.full_name || data.user?.username}`);
      setOpen(false);
      setTimeout(() => window.location.href = '/app/dashboard', 300);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل التبديل');
    } finally {
      setSwitching(null);
    }
  };

  const handleUnlink = async (e, userId) => {
    e.stopPropagation();
    try {
      await axios.post(`${API}/auth/unlink-account`, { target_user_id: userId }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setAccounts(p => p.filter(a => a.user_id !== userId));
      toast.success('تم إلغاء ربط الحساب');
    } catch { toast.error('فشل إلغاء الربط'); }
  };

  const handleLink = async () => {
    if (!linkForm.username || !linkForm.password) { toast.error('أدخل اسم المستخدم وكلمة المرور'); return; }
    setLinking(true);
    try {
      await axios.post(`${API}/auth/link-account`, linkForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      toast.success('✅ تم ربط الحساب بنجاح');
      setLinkForm({ username: '', password: '', label: '' });
      setShowLink(false);
      fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل ربط الحساب');
    } finally {
      setLinking(false);
    }
  };

  const cfg = roleFor(user?.role);

  return (
    <div className="relative" ref={ref} dir="rtl">
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
      >
        {/* Current user avatar */}
        <div className={`w-7 h-7 rounded-full ${cfg.bg} border ${cfg.border} flex items-center justify-center text-sm flex-shrink-0`}>
          {cfg.emoji}
        </div>
        <div className="text-right hidden sm:block max-w-[120px]">
          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{user?.full_name || user?.username}</p>
          <p className="text-[10px] text-gray-500">{cfg.label}</p>
        </div>
        {accounts.length > 0 && (
          <span className="bg-emerald-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0">
            {accounts.length}
          </span>
        )}
        <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">

          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">حساباتك المرتبطة</p>
          </div>

          {/* Current Account */}
          <div className="px-4 py-3 flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800">
            <div className={`w-10 h-10 rounded-full ${cfg.bg} border-2 ${cfg.border} flex items-center justify-center text-lg flex-shrink-0`}>
              {cfg.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.full_name || user?.username}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
                  {cfg.label}
                </span>
                {user?.compound_name && (
                  <span className="text-[10px] text-gray-500 truncate">{user.compound_name}</span>
                )}
              </div>
            </div>
            <CheckCircleIcon className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          </div>

          {/* Linked Accounts List */}
          <div className="max-h-64 overflow-y-auto">
            {accounts.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <ArrowsRightLeftIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">لا توجد حسابات مرتبطة بعد</p>
              </div>
            ) : (
              accounts.map(acc => {
                const acfg = roleFor(acc.role);
                const isCurrentlySwitching = switching === acc.user_id;
                return (
                  <button
                    key={acc.user_id}
                    onClick={() => handleSwitch(acc.user_id)}
                    disabled={!!switching}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 disabled:opacity-60"
                  >
                    {/* Avatar — photo or compound logo or emoji */}
                    <div className="relative flex-shrink-0">
                      <Avatar account={acc} size="md" />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full ${acfg.bg} border-2 border-white dark:border-gray-800 flex items-center justify-center text-[10px]`}>
                        {acfg.emoji}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {acc.label || acc.full_name || acc.username}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${acfg.bg} ${acfg.text} border ${acfg.border}`}>
                          {acfg.label}
                        </span>
                        {acc.compound_name && (
                          <span className="text-[10px] text-gray-400 truncate max-w-[100px]">{acc.compound_name}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isCurrentlySwitching ? (
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <button
                          onClick={(e) => handleUnlink(e, acc.user_id)}
                          className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-colors"
                          title="إلغاء الربط"
                        >
                          <XMarkIcon className="w-3 h-3 text-gray-400 hover:text-red-500" />
                        </button>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Add Account */}
          {!showLink ? (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setShowLink(true)}
                className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
              >
                <UserPlusIcon className="w-4 h-4" />
                ربط حساب آخر
              </button>
            </div>
          ) : (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">ربط حساب جديد</p>
              <input
                value={linkForm.username}
                onChange={e => setLinkForm(p => ({...p, username: e.target.value}))}
                placeholder="اسم المستخدم"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-300 outline-none"
              />
              <input
                type="password"
                value={linkForm.password}
                onChange={e => setLinkForm(p => ({...p, password: e.target.value}))}
                placeholder="كلمة المرور"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-300 outline-none"
              />
              <input
                value={linkForm.label}
                onChange={e => setLinkForm(p => ({...p, label: e.target.value}))}
                placeholder="اسم مخصص (اختياري)"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-300 outline-none"
              />
              <div className="flex gap-2">
                <button onClick={handleLink} disabled={linking}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition-colors">
                  {linking ? 'جارٍ الربط...' : 'ربط'}
                </button>
                <button onClick={() => { setShowLink(false); setLinkForm({username:'',password:'',label:''}); }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs transition-colors">
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
