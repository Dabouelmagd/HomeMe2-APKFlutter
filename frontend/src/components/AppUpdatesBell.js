import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  ArrowUpCircleIcon, XMarkIcon, SparklesIcon,
  WrenchScrewdriverIcon, ShieldCheckIcon, BoltIcon, MegaphoneIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tok = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const TYPE_CONFIG = {
  feature:     { icon: SparklesIcon,          color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', label: 'ميزة جديدة', dot: 'bg-violet-500' },
  fix:         { icon: WrenchScrewdriverIcon, color: 'text-amber-600',  bg: 'bg-amber-50  dark:bg-amber-900/20',  label: 'إصلاح',       dot: 'bg-amber-500'  },
  security:    { icon: ShieldCheckIcon,       color: 'text-red-600',    bg: 'bg-red-50    dark:bg-red-900/20',    label: 'أمان',        dot: 'bg-red-500'    },
  improvement: { icon: BoltIcon,              color: 'text-blue-600',   bg: 'bg-blue-50   dark:bg-blue-900/20',   label: 'تحسين',       dot: 'bg-blue-500'   },
};

function timeAgo(iso) {
  const d = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (d < 60) return 'الآن';
  if (d < 3600) return `${Math.floor(d/60)} دقيقة`;
  if (d < 86400) return `${Math.floor(d/3600)} ساعة`;
  return `${Math.floor(d/86400)} يوم`;
}

export default function AppUpdatesBell() {
  const [updates, setUpdates] = useState([]);
  const [unseen, setUnseen]   = useState(0);
  const [open, setOpen]       = useState(false);
  const ref = useRef(null);

  const fetch = async () => {
    try {
      const res = await axios.get(`${API}/app-updates/latest`, tok());
      setUpdates(res.data.updates || []);
      setUnseen(res.data.unseen_count || 0);
    } catch {}
  };

  useEffect(() => {
    fetch();
    const iv = setInterval(fetch, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  // Close on outside click
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const markAllSeen = async () => {
    try {
      await axios.post(`${API}/app-updates/mark-all-seen`, {}, tok());
      setUnseen(0);
    } catch {}
  };

  const markSeen = async (id) => {
    try {
      await axios.post(`${API}/app-updates/mark-seen/${id}`, {}, tok());
      setUnseen(p => Math.max(0, p - 1));
    } catch {}
  };

  const handleOpen = () => {
    setOpen(p => !p);
    if (!open && unseen > 0) markAllSeen();
  };

  if (updates.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="تحديثات التطبيق"
      >
        <ArrowUpCircleIcon className="h-6 w-6" />
        {unseen > 0 && (
          <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unseen > 9 ? '9+' : unseen}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden" dir="rtl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
            <div>
              <h3 className="font-black text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                <ArrowUpCircleIcon className="h-4 w-4 text-emerald-600" />
                تحديثات التطبيق
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{updates.length} تحديث</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
              <XMarkIcon className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          {/* Updates list */}
          <div className="max-h-80 overflow-y-auto">
            {updates.map(u => {
              const cfg = TYPE_CONFIG[u.type] || TYPE_CONFIG.feature;
              const Icon = cfg.icon;
              return (
                <div key={u.id} className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex gap-3 items-start">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {u.version && (
                          <span className="text-[10px] text-gray-400 font-mono">v{u.version}</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{u.title}</p>
                      {u.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-2">{u.description}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(u.created_at)} مضت</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 text-center">
            <p className="text-xs text-gray-400">آخر تحديث: {updates[0] ? timeAgo(updates[0].created_at) + ' مضت' : '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
