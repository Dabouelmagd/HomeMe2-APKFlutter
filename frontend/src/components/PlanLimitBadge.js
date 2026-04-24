import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { BellAlertIcon, ArrowTrendingUpIcon, BuildingOffice2Icon, UsersIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * PlanLimitBadge — proactive header pill for company_admin showing
 * remaining compound/resident slots. Click opens the upgrade dialog
 * via the global `openUpgradeDialog` CustomEvent (handled by
 * GlobalUIProvider). Listens for `planUsageRefresh` to re-fetch.
 */
const PlanLimitBadge = () => {
  const { user } = useAuth();
  const role = user?.active_role || user?.role;
  const [usage, setUsage] = useState(null);

  const fetchUsage = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/company-admin/plan-usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsage(res.data);
    } catch {
      setUsage(null);
    }
  }, []);

  useEffect(() => {
    if (role !== 'company_admin') return;
    fetchUsage();
    const handler = () => fetchUsage();
    window.addEventListener('planUsageRefresh', handler);
    // light-weight refresh every 60s to catch out-of-tab changes
    const intv = setInterval(fetchUsage, 60000);
    return () => {
      window.removeEventListener('planUsageRefresh', handler);
      clearInterval(intv);
    };
  }, [role, fetchUsage]);

  if (role !== 'company_admin' || !usage) return null;

  const remCompounds = usage.max_compounds === -1 ? Infinity : Math.max(0, usage.max_compounds - usage.current_compounds);
  const remResidents = usage.max_residents === -1 ? Infinity : Math.max(0, usage.max_residents - usage.current_residents);
  const atLimit = !usage.can_add_compound || !usage.can_add_resident;
  const lowCompounds = usage.max_compounds !== -1 && remCompounds <= 1;
  const lowResidents = usage.max_residents !== -1 && remResidents <= Math.max(5, Math.floor(usage.max_residents * 0.1));
  const warn = lowCompounds || lowResidents;

  const tone = atLimit
    ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-200 border-rose-300 dark:border-rose-700 animate-pulse'
    : warn
      ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
      : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800';

  const Icon = atLimit ? BellAlertIcon : ArrowTrendingUpIcon;

  const compoundsLabel = usage.max_compounds === -1
    ? '∞ مجمع'
    : atLimit && !usage.can_add_compound
      ? 'وصلت للحد'
      : `${remCompounds}/${usage.max_compounds} مجمع`;
  const residentsLabel = usage.max_residents === -1
    ? '∞ ساكن'
    : atLimit && !usage.can_add_resident
      ? 'وصلت للحد'
      : `${remResidents}/${usage.max_residents} ساكن`;

  const onClick = () => {
    window.dispatchEvent(new CustomEvent('openUpgradeDialog', {
      detail: {
        reason: atLimit ? 'وصلت إلى الحد الأقصى لخطتك. يرجى الترقية للمتابعة.' : null,
        currentPlan: usage.plan || 'starter',
      },
    }));
  };

  const title = atLimit
    ? `خطة "${usage.plan_name_ar}" — وصلت للحد. اضغط للترقية الفورية.`
    : warn
      ? `خطة "${usage.plan_name_ar}" — اقتربت من الحد. اضغط لمراجعة خطط الترقية.`
      : `خطة "${usage.plan_name_ar}" — متبقي ${compoundsLabel} و ${residentsLabel}.`;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-bold transition-all hover:shadow-md ${tone}`}
      data-testid="plan-limit-badge"
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="inline-flex items-center gap-1">
        <BuildingOffice2Icon className="h-3 w-3 opacity-70" />
        {compoundsLabel}
      </span>
      <span className="opacity-40">•</span>
      <span className="inline-flex items-center gap-1">
        <UsersIcon className="h-3 w-3 opacity-70" />
        {residentsLabel}
      </span>
    </button>
  );
};

export default PlanLimitBadge;
