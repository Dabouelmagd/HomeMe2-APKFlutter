/**
 * FeatureGate — UI wrapper that shows children only if feature is enabled.
 * Otherwise grays them out with a lock badge, and opens a clear "Upgrade" modal on click.
 *
 * Modes:
 *  - "block"  → full upgrade placeholder card (replaces children)
 *  - "badge"  → render children as light-gray (disabled) + small lock badge; click opens upgrade modal
 *  - "hide"   → render nothing if disabled
 */
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockClosedIcon, SparklesIcon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

const UpgradeModal = ({ open, onClose, featureLabel, planNameAr, requiresPlanNameAr }) => {
  const navigate = useNavigate();
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      data-testid="feature-upgrade-modal"
    >
      <div
        className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition"
          aria-label="إغلاق"
          data-testid="upgrade-modal-close"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg ring-4 ring-amber-100">
            <SparklesIcon className="w-9 h-9 text-white" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-black text-gray-900 text-center mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>
          ترقية الحساب مطلوبة
        </h3>
        <p className="text-sm text-gray-600 text-center mb-5 leading-loose">
          ميزة <span className="font-bold text-amber-600">"{featureLabel}"</span> غير مفعّلة في خطتك الحالية.
        </p>

        {/* Plan info */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">خطتك الحالية</span>
            <span className="text-sm font-bold text-gray-700 bg-white px-3 py-1 rounded-lg shadow-sm">
              {planNameAr || '—'}
            </span>
          </div>
          <div className="flex items-center justify-center text-amber-500">
            <ArrowRightIcon className="w-5 h-5 rotate-90" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">الخطة المطلوبة</span>
            <span className="text-sm font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg shadow-sm">
              {requiresPlanNameAr || '—'} أو أعلى
            </span>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-2">
          <button
            onClick={() => { onClose(); navigate('/app/my-subscription'); }}
            className="w-full px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-500/30 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
            data-testid="upgrade-modal-confirm"
          >
            <SparklesIcon className="w-4 h-4" />
            ترقية الحساب الآن
          </button>
          <button
            onClick={onClose}
            className="w-full px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold text-sm transition"
            data-testid="upgrade-modal-cancel"
          >
            ربما لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
};

const FeatureGate = ({ feature, mode = 'block', fallback = null, children }) => {
  const { enabled, loading, planNameAr, requiresPlanNameAr, featureLabel } = useFeatureFlag(feature);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const openUpgrade = useCallback((e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setShowModal(true);
  }, []);

  if (loading) return null;
  if (enabled) return <>{children}</>;
  if (mode === 'hide') return null;
  if (fallback) return <>{fallback}</>;

  // BADGE MODE — light-gray disabled wrapper + lock badge + modal on click
  if (mode === 'badge') {
    return (
      <>
        <div
          role="button"
          tabIndex={0}
          onClick={openUpgrade}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openUpgrade(e); }}
          className="relative inline-block group cursor-not-allowed"
          data-testid={`feature-gate-badge-${feature}`}
          aria-label={`ميزة ${featureLabel} مقفلة — اضغط للترقية`}
          title={`ميزة ${featureLabel} تتطلب ترقية الحساب`}
        >
          {/* Light-gray wrapper — applies grayscale + low contrast text */}
          <div className="grayscale opacity-60 contrast-75 select-none pointer-events-none transition-all group-hover:opacity-70">
            {children}
          </div>
          {/* Lock badge — top corner */}
          <div className="absolute -top-1 -right-1 z-10">
            <div className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md ring-2 ring-white">
              <LockClosedIcon className="w-3 h-3" />
              ترقية
            </div>
          </div>
          {/* Hover hint */}
          <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/5 transition-colors rounded-lg pointer-events-none" />
        </div>

        <UpgradeModal
          open={showModal}
          onClose={() => setShowModal(false)}
          featureLabel={featureLabel}
          planNameAr={planNameAr}
          requiresPlanNameAr={requiresPlanNameAr}
        />
      </>
    );
  }

  // BLOCK MODE — full upgrade placeholder card
  return (
    <>
      <div
        className="bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 border-2 border-dashed border-amber-300 rounded-2xl p-8 text-center my-4"
        data-testid={`feature-gate-block-${feature}`}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mb-4 shadow-lg ring-4 ring-amber-100">
          <SparklesIcon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          ميزة "{featureLabel}" تتطلب ترقية
        </h3>
        <p className="text-sm text-gray-600 mb-1">
          خطتك الحالية: <span className="font-semibold text-amber-700">{planNameAr}</span>
        </p>
        <p className="text-sm text-gray-600 mb-5">
          تحتاج خطة <span className="font-semibold text-emerald-700">{requiresPlanNameAr}</span> أو أعلى.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={openUpgrade}
            className="inline-flex items-center gap-2 px-4 py-2 text-amber-700 bg-white hover:bg-amber-50 border border-amber-200 rounded-xl font-semibold text-sm transition"
            data-testid={`upgrade-info-${feature}`}
          >
            عرض التفاصيل
          </button>
          <button
            onClick={() => navigate('/app/my-subscription')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
            data-testid={`upgrade-cta-${feature}`}
          >
            <SparklesIcon className="w-5 h-5" />
            ترقية الآن
          </button>
        </div>
      </div>

      <UpgradeModal
        open={showModal}
        onClose={() => setShowModal(false)}
        featureLabel={featureLabel}
        planNameAr={planNameAr}
        requiresPlanNameAr={requiresPlanNameAr}
      />
    </>
  );
};

export default FeatureGate;
