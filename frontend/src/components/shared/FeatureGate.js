import React, { useState } from 'react';
import { LockClosedIcon, ArrowUpCircleIcon } from '@heroicons/react/24/outline';

/**
 * FeatureGate — wraps a feature that's locked on the current plan.
 * Shows a lock icon overlay and upgrade prompt on hover/click.
 *
 * Usage:
 *   <FeatureGate feature="ai_assistant" requiredPlan="احترافي" currentPlan={user.plan}>
 *     <AIAssistantButton />
 *   </FeatureGate>
 */
const PLAN_ORDER = ['starter', 'basic', 'pro', 'premium', 'company_startup', 'company_business', 'company_enterprise'];

const PLAN_LABELS = {
  starter: 'مجاني',
  basic: 'أساسي',
  pro: 'احترافي',
  premium: 'متقدم',
  company_startup: 'شركة ناشئة',
  company_business: 'شركة متوسطة',
  company_enterprise: 'شركة كبرى',
};

const PLAN_PRICES = {
  starter: 0,
  basic: 1200,
  pro: 2200,
  premium: 4000,
  company_startup: 5500,
  company_business: 13000,
  company_enterprise: 35000,
};

export default function FeatureGate({ children, feature, requiredPlan, currentPlan, onUpgrade }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const currentIdx = PLAN_ORDER.indexOf(currentPlan || 'starter');
  const requiredIdx = PLAN_ORDER.indexOf(requiredPlan || 'basic');
  const isLocked = currentIdx < requiredIdx;

  if (!isLocked) return <>{children}</>;

  const requiredLabel = PLAN_LABELS[requiredPlan] || requiredPlan;
  const requiredPrice = PLAN_PRICES[requiredPlan];

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTooltip(true); }}
    >
      {/* Blurred/disabled children */}
      <div className="select-none pointer-events-none opacity-50 blur-[1px]">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center cursor-pointer">
        <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg border border-gray-200 dark:border-gray-600">
          <LockClosedIcon className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{requiredLabel}</span>
        </div>
      </div>

      {/* Upgrade tooltip */}
      {showTooltip && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4"
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
        >
          <div className="flex items-center gap-2 mb-3">
            <LockClosedIcon className="h-5 w-5 text-amber-500" />
            <p className="font-bold text-gray-900 dark:text-white text-sm">ميزة مقفلة</p>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
            هذه الميزة متاحة في خطة <strong className="text-emerald-600">{requiredLabel}</strong> فأعلى
            {requiredPrice > 0 && (
              <span className="block mt-1 text-emerald-600 font-bold">
                بدءاً من {requiredPrice.toLocaleString()} ج.م / شهر
              </span>
            )}
          </p>
          <button
            onClick={() => {
              setShowTooltip(false);
              onUpgrade?.();
              window.location.href = '/#pricing';
            }}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors"
          >
            <ArrowUpCircleIcon className="h-4 w-4" />
            ترقية الخطة الآن
          </button>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white dark:border-t-gray-800" />
        </div>
      )}
    </div>
  );
}

/**
 * LockedFeatureRow — for use in feature lists/sidebars
 * Shows a row with lock icon and upgrade hint
 */
export function LockedFeatureRow({ label, requiredPlan, onClick }) {
  const requiredLabel = PLAN_LABELS[requiredPlan] || requiredPlan;
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg opacity-60 cursor-pointer hover:opacity-80 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all group"
      onClick={onClick}
      dir="rtl"
    >
      <LockClosedIcon className="h-4 w-4 text-amber-400 flex-shrink-0" />
      <span className="text-sm text-gray-500 dark:text-gray-400 flex-1">{label}</span>
      <span className="text-xs text-amber-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {requiredLabel} ↑
      </span>
    </div>
  );
}

/**
 * PlanBadge — shows current plan with upgrade button if on free tier
 */
export function PlanBadge({ currentPlan, onUpgrade }) {
  const label = PLAN_LABELS[currentPlan] || currentPlan || 'مجاني';
  const isFree = !currentPlan || currentPlan === 'starter';

  return (
    <div className="flex items-center gap-2" dir="rtl">
      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
        isFree
          ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      }`}>
        {label}
      </span>
      {isFree && (
        <button
          onClick={onUpgrade}
          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-bold transition-colors"
        >
          <ArrowUpCircleIcon className="h-3.5 w-3.5" />
          ترقية
        </button>
      )}
    </div>
  );
}
