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
  const [attention, setAttention] = useState({ total: 0, per_compound: {} });
  const ref = useRef(null);

  const activeRole = user?.active_role || user?.role;
  const eligible = ['company_admin', 'assistant_manager', 'accountant'].includes(activeRole);

  useEffect(() => {
    if (!eligible) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    let alive = true;
    const auth = { headers: { Authorization: `Bearer ${token}` } };
    const fetchCompounds = () => {
      axios
        .get(`${API}/company-admin/compounds`, auth)
        .then((res) => {
          if (!alive) return;
          const list = res.data?.compounds || [];
          setCompounds(list);
          // Auto-select when nothing is active yet so company-admin doesn't land
          // on pages that try to fetch a non-existent "default-compound".
          const current = localStorage.getItem('selectedCompoundId');
          const stillValid = current && list.some((c) => c.id === current);
          if (!stillValid && list.length > 0) {
            const pick = list[0];
            localStorage.setItem('selectedCompoundId', pick.id);
            localStorage.setItem('selectedCompoundName', pick.name || '');
            setSelectedId(pick.id);
            window.dispatchEvent(new CustomEvent('compoundSwitched', { detail: { id: pick.id, name: pick.name } }));
          }
        })
        .catch(() => { if (alive) setCompounds([]); });
    };
    const fetchAttention = () => {
      axios
        .get(`${API}/company-admin/compounds/attention-summary`, auth)
        .then((res) => { if (alive) setAttention(res.data || { total: 0, per_compound: {} }); })
        .catch(() => { if (alive) setAttention({ total: 0, per_compound: {} }); });
    };
    fetchCompounds();
    fetchAttention();
    // Poll attention summary every 90s so the badge stays fresh while the admin works
    const attIv = setInterval(fetchAttention, 90000);
    // Re-fetch when the dashboard refreshes (e.g. after Onboarding wizard creates new compounds)
    const onRefresh = () => { fetchCompounds(); fetchAttention(); };
    window.addEventListener('planUsageRefresh', onRefresh);
    window.addEventListener('compoundSwitched', onRefresh);
    return () => {
      alive = false;
      clearInterval(attIv);
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
        className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-200 hover:shadow transition text-sm font-semibold"
        data-testid="compound-switcher-btn"
        title={attention.total > 0 ? `${attention.total} عنصراً يحتاج اهتمامك` : undefined}
      >
        <span className="text-base">🏘️</span>
        <span className="max-w-[160px] truncate">
          {current ? current.name : 'اختر كمبوند'}
        </span>
        {attention.total > 0 && (
          <span
            className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white text-[10px] font-bold shadow-sm ring-2 ring-white dark:ring-gray-900 animate-pulse"
            data-testid="compound-switcher-attention-badge"
          >
            {attention.total > 99 ? '99+' : attention.total}
          </span>
        )}
        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.1l3.71-3.87a.75.75 0 111.08 1.04l-4.25 4.43a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-[100] overflow-hidden" data-testid="compound-switcher-menu">
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
          {attention.total > 0 && (
            <div className="px-3 py-2 bg-rose-50 dark:bg-rose-900/20 border-b border-rose-100 dark:border-rose-900/30 text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
              <span>⚠️</span>
              <span>يوجد <b>{attention.total}</b> عنصراً يحتاج اهتمامك عبر كمبوندات شركتك</span>
            </div>
          )}
          <div className="max-h-80 overflow-y-auto">
            {compounds.map((cpd) => {
              const isCurrent = cpd.id === selectedId;
              const att = attention.per_compound?.[cpd.id] || { total: 0, expiring_contracts: 0, open_complaints: 0, late_payments: 0 };
              return (
                <button
                  key={cpd.id}
                  onClick={() => switchTo(cpd)}
                  className={`w-full text-start px-3 py-2.5 flex items-center gap-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${
                    isCurrent ? 'bg-indigo-100 dark:bg-indigo-900/40' : ''
                  }`}
                  data-testid={`compound-switcher-item-${cpd.id}`}
                >
                  <span className="text-xl flex-shrink-0">{isCurrent ? '✅' : '🏘️'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{cpd.name}</div>
                      {att.total > 0 && (
                        <span
                          className="inline-flex items-center justify-center min-w-[18px] h-4 px-1.5 rounded-full bg-rose-500 text-white text-[9px] font-bold shrink-0"
                          data-testid={`compound-attention-${cpd.id}`}
                        >
                          {att.total > 99 ? '99+' : att.total}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {cpd.location || '—'} • 👥 {cpd.users_count || 0} مستخدم
                    </div>
                    {att.total > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {att.expiring_contracts > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-semibold dark:bg-amber-900/40 dark:text-amber-200">
                            📑 {att.expiring_contracts} عقد
                          </span>
                        )}
                        {att.open_complaints > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[9px] font-semibold dark:bg-rose-900/40 dark:text-rose-200">
                            📢 {att.open_complaints} شكوى
                          </span>
                        )}
                        {att.late_payments > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[9px] font-semibold dark:bg-orange-900/40 dark:text-orange-200">
                            💰 {att.late_payments} دفعة متأخرة
                          </span>
                        )}
                      </div>
                    )}
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
