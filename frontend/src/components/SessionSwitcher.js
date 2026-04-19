import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { getActiveSessions, dedupeSessionsByUser } from '../utils/sessionManager';
import { UsersIcon, ArrowsRightLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const SessionSwitcher = () => {
  const { user, switchSession, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    // Run once on mount to purge stale duplicate sessions that accumulated before the dedupe fix
    dedupeSessionsByUser();
  }, []);

  useEffect(() => {
    if (open) {
      setSessions(getActiveSessions());
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const otherSessions = sessions.filter(s => !s.isCurrent);

  const roleLabels = {
    app_owner: t('role_owner', 'مالك التطبيق'),
    super_admin: t('role_super_admin', 'سوبر أدمن'),
    company_admin: t('role_company_admin', 'مدير شركة'),
    admin: t('role_admin', 'مدير'),
    manager: t('role_manager', 'مشرف'),
    security: t('role_security', 'أمن'),
    resident: t('role_resident', 'مقيم'),
  };

  const roleColors = {
    app_owner: 'from-rose-500 to-pink-600',
    super_admin: 'from-purple-500 to-indigo-600',
    company_admin: 'from-blue-500 to-cyan-600',
    admin: 'from-emerald-500 to-green-600',
    manager: 'from-amber-500 to-orange-600',
    security: 'from-slate-500 to-gray-600',
    resident: 'from-sky-500 to-blue-600',
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        data-testid="session-switcher-btn"
        title={t('session_switch', 'تبديل الحسابات')}
      >
        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${roleColors[user.active_role || user.role] || roleColors.resident} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
          {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
        </div>
        {otherSessions.length > 0 && (
          <span className="absolute -top-0.5 -end-0.5 w-4 h-4 bg-green-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
            {otherSessions.length}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute top-full mt-2 ${isRTL ? 'left-0' : 'right-0'} w-72 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl z-50 overflow-hidden`}
          data-testid="session-switcher-dropdown">
          {/* Current Session */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <p className="text-[10px] text-gray-400 mb-1.5">{t('session_current', 'الحساب الحالي')}</p>
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${roleColors[user.active_role || user.role] || roleColors.resident} flex items-center justify-center text-white font-bold shadow-md`}>
                {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.full_name || user.username}</p>
                <p className="text-[10px] text-gray-500">{roleLabels[user.active_role || user.role] || user.role}</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0"></span>
            </div>
          </div>

          {/* Other Sessions */}
          {otherSessions.length > 0 && (
            <div className="p-2">
              <p className="text-[10px] text-gray-400 px-1 mb-1">{t('session_other', 'حسابات أخرى نشطة')}</p>
              {otherSessions.map(s => (
                <button key={s.sessionId}
                  onClick={() => { switchSession(s.sessionId); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-start"
                  data-testid={`switch-to-${s.user?.username}`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${roleColors[s.user?.role] || roleColors.resident} flex items-center justify-center text-white text-xs font-bold`}>
                    {(s.user?.full_name || s.user?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{s.user?.full_name || s.user?.username}</p>
                    <p className="text-[10px] text-gray-400">{roleLabels[s.user?.role] || s.user?.role}</p>
                  </div>
                  <ArrowsRightLeftIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Add Account */}
          <div className="p-2 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => {
                setOpen(false);
                // Open login in new tab (will create new session automatically)
                window.open(`${window.location.origin}/login`, '_blank');
              }}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-blue-600 dark:text-blue-400"
              data-testid="add-account-btn"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="text-xs font-medium">{t('session_add', 'إضافة حساب آخر')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionSwitcher;
