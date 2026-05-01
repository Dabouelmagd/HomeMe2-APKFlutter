import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * CompoundSwitcher — مبدّل كمبوند سريع لمدير الشركة.
 *
 * يظهر فقط إذا:
 *   • role/active_role هو company_admin (أو assistant_manager / accountant داخل شركة)
 *   • و لدى الشركة كمبوند واحد على الأقل
 *
 * يعرض اسم الكمبوند الحالي (المختار من localStorage) ويتيح القفز
 * إلى أي كمبوند آخر بنقرة واحدة عبر تحديث `selectedCompoundId` ثم تنشيط
 * حدث 'planUsageRefresh' لتحديث البيانات.
 */
const CompoundSwitcher = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [compounds, setCompounds] = useState([]);
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem('selectedCompoundId') || '');
  const ref = useRef(null);

  const activeRole = user?.active_role || user?.role;
  const eligible = ['company_admin', 'assistant_manager', 'accountant'].includes(activeRole);

  useEffect(() => {
    if (!eligible) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    let alive = true;
    const fetchCompounds = () => {
      axios
        .get(`${API}/company-admin/compounds`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => { if (alive) setCompounds(res.data?.compounds || []); })
        .catch(() => { if (alive) setCompounds([]); });
    };
    fetchCompounds();
    // Re-fetch when the dashboard refreshes (e.g. after Onboarding wizard creates new compounds)
    const onRefresh = () => fetchCompounds();
    window.addEventListener('planUsageRefresh', onRefresh);
    window.addEventListener('compoundSwitched', onRefresh);
    return () => {
      alive = false;
      window.removeEventListener('planUsageRefresh', onRefresh);
      window.removeEventListener('compoundSwitched', onRefresh);
    };
  }, [eligible]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  if (!eligible || compounds.length === 0) return null;

  const current = compounds.find((c) => c.id === selectedId) || null;

  const switchTo = (cpd) => {
    localStorage.setItem('selectedCompoundId', cpd.id);
    localStorage.setItem('selectedCompoundName', cpd.name || '');
    setSelectedId(cpd.id);
    setOpen(false);
    // Notify subscribers (CompanyPlanUsageCard, AggregatedStatsPanel) to re-fetch
    window.dispatchEvent(new CustomEvent('planUsageRefresh'));
    window.dispatchEvent(new CustomEvent('compoundSwitched', { detail: { id: cpd.id, name: cpd.name } }));
    // Force a soft reload of the current admin route so all data tied to compound_id refreshes
    if (window.location.pathname.startsWith('/app/')) {
      navigate(0);
    } else {
      navigate('/app/dashboard');
    }
  };

  const goBackToOverview = () => {
    localStorage.removeItem('selectedCompoundId');
    localStorage.removeItem('selectedCompoundName');
    setSelectedId('');
    setOpen(false);
    window.dispatchEvent(new CustomEvent('planUsageRefresh'));
    navigate('/app/dashboard');
  };

  return (
    <div className="relative" ref={ref} data-testid="compound-switcher-root">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-200 hover:shadow transition text-sm font-semibold"
        data-testid="compound-switcher-btn"
      >
        <span className="text-base">🏘️</span>
        <span className="max-w-[160px] truncate">
          {current ? current.name : 'اختر كمبوند'}
        </span>
        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.1l3.71-3.87a.75.75 0 111.08 1.04l-4.25 4.43a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden" data-testid="compound-switcher-menu">
          <div className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold flex items-center justify-between">
            <span>كمبوندات شركتك ({compounds.length})</span>
            {selectedId && (
              <button
                onClick={goBackToOverview}
                className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded"
                data-testid="compound-switcher-overview"
              >
                عرض الإجمالي
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {compounds.map((cpd) => {
              const isCurrent = cpd.id === selectedId;
              return (
                <button
                  key={cpd.id}
                  onClick={() => switchTo(cpd)}
                  className={`w-full text-start px-3 py-2.5 flex items-center gap-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition ${
                    isCurrent ? 'bg-indigo-100 dark:bg-indigo-900/40' : ''
                  }`}
                  data-testid={`compound-switcher-item-${cpd.id}`}
                >
                  <span className="text-xl flex-shrink-0">{isCurrent ? '✅' : '🏘️'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{cpd.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {cpd.location || '—'} • 👥 {cpd.users_count || 0} مستخدم
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompoundSwitcher;
