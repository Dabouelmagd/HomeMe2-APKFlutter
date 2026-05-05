/**
 * FeatureGate — UI wrapper that shows children only if feature is enabled.
 * Otherwise displays an "Upgrade Required" placeholder.
 * 
 * Usage:
 *   <FeatureGate feature="advanced_dashboard">
 *     <AdvancedAnalytics />
 *   </FeatureGate>
 *
 *   <FeatureGate feature="pdf_excel_exports" mode="badge">
 *     <button>Export PDF</button>
 *   </FeatureGate>
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

/**
 * @param {string} feature - feature key (e.g. "advanced_dashboard")
 * @param {string} mode - "block" (default, full placeholder) | "badge" (inline disabled overlay) | "hide" (render nothing if disabled)
 * @param {ReactNode} fallback - custom fallback when feature disabled (overrides default placeholder)
 */
const FeatureGate = ({ feature, mode = 'block', fallback = null, children }) => {
  const { enabled, loading, planNameAr, requiresPlanNameAr, featureLabel, showUpgradeToast } =
    useFeatureFlag(feature);
  const navigate = useNavigate();

  if (loading) {
    // While loading, show nothing to avoid flashes
    return null;
  }

  if (enabled) return <>{children}</>;

  if (mode === 'hide') return null;

  if (fallback) return <>{fallback}</>;

  if (mode === 'badge') {
    // Inline overlay: render the children but greyed-out + click triggers upgrade toast
    return (
      <div
        className="relative inline-block group cursor-not-allowed"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          showUpgradeToast();
        }}
        data-testid={`feature-gate-badge-${feature}`}
      >
        <div className="opacity-50 pointer-events-none select-none">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-amber-500/95 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md ring-2 ring-white/40">
            <LockClosedIcon className="w-3 h-3" />
            ترقية
          </div>
        </div>
      </div>
    );
  }

  // mode === "block" → full upgrade placeholder
  return (
    <div
      className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-2 border-dashed border-amber-300 rounded-2xl p-8 text-center my-4"
      data-testid={`feature-gate-block-${feature}`}
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mb-4 shadow-lg">
        <SparklesIcon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">
        ميزة "{featureLabel}" تتطلب ترقية
      </h3>
      <p className="text-sm text-gray-600 mb-1">
        خطتك الحالية: <span className="font-semibold text-amber-700">{planNameAr}</span>
      </p>
      <p className="text-sm text-gray-600 mb-5">
        تحتاج خطة <span className="font-semibold text-emerald-700">{requiresPlanNameAr}</span> أو
        أعلى لاستخدام هذه الميزة.
      </p>
      <button
        onClick={() => navigate('/app/my-subscription')}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
        data-testid={`upgrade-cta-${feature}`}
      >
        <SparklesIcon className="w-5 h-5" />
        ترقية الآن
      </button>
    </div>
  );
};

export default FeatureGate;
