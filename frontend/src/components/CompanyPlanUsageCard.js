import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ArrowTrendingUpIcon,
  BuildingOffice2Icon,
  UsersIcon,
  SparklesIcon,
  CheckCircleIcon,
  XMarkIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * CompanyPlanUsageCard — shown on Company-Admin dashboard.
 *   Displays current plan, usage vs limits, and a "ترقية الخطة" button
 *   that opens a comparison dialog of all 4 tiers with Contact-Support CTA.
 *
 * Can also be mounted standalone (e.g. via PlanLimitUpgradeModal below)
 * to render the upgrade comparison after a 403 plan_limit_* error.
 */
export const CompanyPlanUsageCard = () => {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/company-admin/plan-usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsage(res.data);
    } catch {
      setUsage(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    const handler = () => fetchUsage();
    window.addEventListener('planUsageRefresh', handler);
    return () => window.removeEventListener('planUsageRefresh', handler);
  }, []);

  if (loading) return <div className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />;
  if (!usage) return null;

  const compoundPct = usage.max_compounds === -1 ? 0 : Math.min(100, (usage.current_compounds / usage.max_compounds) * 100);
  const residentPct = usage.max_residents === -1 ? 0 : Math.min(100, (usage.current_residents / usage.max_residents) * 100);
  const atLimit = !usage.can_add_compound || !usage.can_add_resident;

  return (
    <>
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10 p-5 space-y-4" data-testid="company-plan-usage-card">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-900 dark:text-amber-100">
              خطة الشركة الحالية: <span className="text-amber-700 dark:text-amber-300">{usage.plan_name_ar}</span>
            </h3>
          </div>
          <button
            onClick={() => setShowUpgrade(true)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-md inline-flex items-center gap-2 ${
              atLimit
                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white'
            }`}
            data-testid="upgrade-plan-btn"
          >
            <ArrowTrendingUpIcon className="w-4 h-4" />
            {atLimit ? 'ترقية الخطة فوراً' : 'ترقية الخطة'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UsageTile
            icon={BuildingOffice2Icon}
            label="المجتمعات السكنية"
            current={usage.current_compounds}
            max={usage.max_compounds}
            pct={compoundPct}
            atLimit={!usage.can_add_compound}
            testid="usage-compounds"
          />
          <UsageTile
            icon={UsersIcon}
            label="السكان"
            current={usage.current_residents}
            max={usage.max_residents}
            pct={residentPct}
            atLimit={!usage.can_add_resident}
            testid="usage-residents"
          />
        </div>
      </div>

      {showUpgrade && (
        <PlanUpgradeDialog currentPlan={usage.plan} onClose={() => setShowUpgrade(false)} />
      )}
    </>
  );
};

const UsageTile = ({ icon: Icon, label, current, max, pct, atLimit, testid }) => (
  <div className={`rounded-xl p-3 border-2 ${atLimit ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-800' : 'bg-white dark:bg-gray-900 border-transparent'}`} data-testid={testid}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${atLimit ? 'text-rose-600' : 'text-amber-600'}`} />
        <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{label}</span>
      </div>
      {atLimit && <LockClosedIcon className="w-4 h-4 text-rose-500" />}
    </div>
    <div className="mt-2 flex items-baseline gap-1">
      <span className={`text-xl font-bold ${atLimit ? 'text-rose-700 dark:text-rose-300' : 'text-gray-900 dark:text-white'}`}>{current}</span>
      <span className="text-xs text-gray-500"> / {max === -1 ? '∞' : max}</span>
    </div>
    {max !== -1 && (
      <div className="mt-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${atLimit ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    )}
  </div>
);

/**
 * PlanUpgradeDialog — 4-tier comparison + CTA to contact support for upgrade.
 */
export const PlanUpgradeDialog = ({ currentPlan = 'starter', reason = null, onClose }) => {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API}/owner/company-plans`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPlans(res.data.plans || []);
      } catch { setPlans([]); }
    };
    fetch();
  }, []);

  const requestUpgrade = (targetPlan) => {
    // Deep-link to support-payment form with plan pre-filled
    window.location.href = `/app/support?tab=payment&plan=${targetPlan}`;
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="plan-upgrade-dialog">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-5 py-4 flex items-center justify-between text-white sticky top-0">
          <div className="flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5" />
            <h3 className="font-bold">مقارنة خطط شركات الإدارة</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-lg" data-testid="plan-upgrade-close">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {reason && (
          <div className="mx-5 mt-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-300 dark:border-rose-800 p-3 text-sm text-rose-800 dark:text-rose-200">
            ⚠️ {reason}
          </div>
        )}

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => {
            const isCurrent = p.key === currentPlan;
            const isUpgrade = plans.findIndex((x) => x.key === p.key) > plans.findIndex((x) => x.key === currentPlan);
            return (
              <div
                key={p.key}
                className={`relative rounded-2xl border-2 p-4 flex flex-col ${
                  isCurrent
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10'
                    : p.popular
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10 ring-2 ring-orange-300/30'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
                data-testid={`upgrade-plan-${p.key}`}
              >
                {p.popular && (
                  <span className="absolute -top-2 start-4 px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                    الأكثر شعبية
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-2 end-4 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    خطتك الحالية
                  </span>
                )}
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">{p.name_ar}</h4>
                <div className="mt-1 mb-3">
                  <span className="text-2xl font-bold text-rose-600">
                    {p.monthly_egp.toLocaleString('ar-EG')}
                  </span>
                  <span className="text-xs text-gray-500"> ج.م / شهرياً</span>
                </div>
                <div className="text-[11px] space-y-1 text-gray-500 dark:text-gray-400 mb-3">
                  <div>🏘️ {p.max_compounds === -1 ? 'مجمعات غير محدودة' : `حتى ${p.max_compounds} مجمع`}</div>
                  <div>👥 {p.max_residents === -1 ? 'سكان غير محدود' : `حتى ${p.max_residents.toLocaleString('ar-EG')} ساكن`}</div>
                </div>
                <ul className="space-y-1 text-xs flex-1">
                  {p.features_ar.slice(0, 6).map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">{f}</span>
                    </li>
                  ))}
                  {p.features_ar.length > 6 && (
                    <li className="text-[10px] text-gray-400 italic">+ {p.features_ar.length - 6} مزايا أخرى</li>
                  )}
                </ul>
                <button
                  onClick={() => !isCurrent && requestUpgrade(p.key)}
                  disabled={isCurrent || !isUpgrade}
                  className={`mt-3 w-full px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                    isCurrent
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                      : isUpgrade
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  }`}
                  data-testid={`upgrade-cta-${p.key}`}
                >
                  {isCurrent ? 'خطتك الحالية' : isUpgrade ? 'ترقية الآن' : 'خطة أقل'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CompanyPlanUsageCard;
