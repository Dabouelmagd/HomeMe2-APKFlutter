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
import StripeAutoRenewCard from './StripeAutoRenewCard';

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
    // Open upgrade modal in response to plan-gated 403 errors handled by axios interceptor
    const onOpenUpgrade = () => setShowUpgrade(true);
    window.addEventListener('openUpgradeModal', onOpenUpgrade);
    return () => {
      window.removeEventListener('planUsageRefresh', handler);
      window.removeEventListener('openUpgradeModal', onOpenUpgrade);
    };
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

      {/* Stripe Auto-Renewal — shown below the current plan card */}
      <div className="mt-4">
        <StripeAutoRenewCard />
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

  const [upgrading, setUpgrading] = useState(null);

  // Trial / Coupon / Code state
  const [trialLoading, setTrialLoading] = useState(false);
  const [trialPlanChoice, setTrialPlanChoice] = useState('company_business');
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [couponPlan, setCouponPlan] = useState('company_business');
  const [couponPreview, setCouponPreview] = useState(null); // {original_price, final_price, discount_amount, coupon_code, plan_key}
  const [couponLoading, setCouponLoading] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);

  const activateTrial = async (planKey) => {
    const chosenPlan = planKey || trialPlanChoice;
    setTrialLoading(true);
    try {
      const res = await axios.post(
        `${API}/company-admin/activate-trial`,
        { plan_key: chosenPlan },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
      );
      const { toast } = await import('sonner');
      toast.success(res.data?.message || 'تم تفعيل التجربة المجانية');
      window.dispatchEvent(new CustomEvent('planUsageRefresh'));
      onClose && onClose();
    } catch (err) {
      const { toast } = await import('sonner');
      toast.error(err?.response?.data?.detail || 'فشل تفعيل التجربة');
    } finally {
      setTrialLoading(false);
    }
  };

  const previewCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponPreview(null);
    try {
      const res = await axios.post(
        `${API}/company-admin/preview-coupon`,
        { plan_key: couponPlan, coupon_code: couponInput.trim() },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
      );
      setCouponPreview(res.data);
      const { toast } = await import('sonner');
      toast.success(`خصم ${res.data.discount_amount} ج.م — السعر النهائي: ${res.data.final_price} ج.م`);
    } catch (err) {
      const { toast } = await import('sonner');
      toast.error(err?.response?.data?.detail || 'فشل التحقق من الكوبون');
    } finally {
      setCouponLoading(false);
    }
  };

  const redeemCode = async () => {
    if (!codeInput.trim()) return;
    setCodeLoading(true);
    try {
      const res = await axios.post(
        `${API}/company-admin/redeem-subscription-code`,
        { code: codeInput.trim() },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } },
      );
      const { toast } = await import('sonner');
      toast.success(res.data?.message || 'تم تفعيل الخطة');
      window.dispatchEvent(new CustomEvent('planUsageRefresh'));
      onClose && onClose();
    } catch (err) {
      const { toast } = await import('sonner');
      toast.error(err?.response?.data?.detail || 'فشل تفعيل الكود');
    } finally {
      setCodeLoading(false);
    }
  };

  const requestUpgrade = async (targetPlan) => {
    // Starter plan is free → no payment needed; fall back to the old support flow
    if (targetPlan === 'starter') {
      window.location.href = '/app/support?tab=payment';
      return;
    }
    try {
      setUpgrading(targetPlan);
      const res = await axios.post(
        `${API}/stripe/create-checkout-session`,
        { plan_key: targetPlan, origin_url: window.location.origin },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      throw new Error('No checkout URL returned');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'فشل فتح صفحة الدفع';
      try {
        const { toast } = await import('sonner');
        toast.error(typeof msg === 'string' ? msg : 'فشل فتح صفحة الدفع');
      } catch { /* noop */ }
      setUpgrading(null);
    }
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

        {/* ─── Trial + Coupon + Subscription-Code action bar ─── */}
        <div className="mx-5 mt-4 grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="plan-extras-bar">
          {/* 14-day Trial — choose between Business or Enterprise */}
          <div
            className="group relative overflow-hidden rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/10 p-3 text-right"
            data-testid="plan-trial-card"
          >
            <div className="flex items-start gap-2">
              <span className="text-2xl">🎁</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                  تجربة مجانية ١٤ يوم
                </div>
                <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mb-2">
                  جربي أي خطة مدفوعة بدون دفع
                </div>
                <div className="flex items-center gap-1.5">
                  <select
                    value={trialPlanChoice}
                    onChange={(e) => setTrialPlanChoice(e.target.value)}
                    disabled={trialLoading}
                    className="flex-1 min-w-0 text-[11px] font-semibold rounded-lg border border-emerald-300 bg-white dark:bg-gray-900 px-2 py-1 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    data-testid="plan-trial-plan-select"
                  >
                    <option value="company_startup">الخطة الناشئة (4,000 ج.م)</option>
                    <option value="company_business">الخطة المتوسطة (9,500 ج.م)</option>
                    <option value="company_enterprise">الخطة الكبرى (25,000 ج.م)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => activateTrial()}
                    disabled={trialLoading}
                    className="shrink-0 inline-flex items-center justify-center px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-[11px] font-bold shadow-sm disabled:opacity-60 transition"
                    data-testid="plan-trial-btn"
                  >
                    {trialLoading ? '...' : 'فعّل الآن'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Coupon collapsible */}
          <button
            type="button"
            onClick={() => { setCouponOpen((v) => !v); setCodeOpen(false); }}
            className={`group relative overflow-hidden rounded-xl border-2 p-3 text-right hover:shadow-md transition ${
              couponOpen ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-orange-200 bg-orange-50/40 dark:bg-orange-900/10 hover:border-orange-400'
            }`}
            data-testid="plan-coupon-toggle"
          >
            <div className="flex items-start gap-2">
              <span className="text-2xl">🎟️</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-orange-800 dark:text-orange-200">لديكِ كوبون؟</div>
                <div className="text-[11px] text-orange-700/80 dark:text-orange-300/80">طبّقي خصمًا قبل الدفع</div>
              </div>
              <span className="text-orange-700 text-xs">{couponOpen ? '▲' : '▼'}</span>
            </div>
          </button>

          {/* Subscription Code collapsible */}
          <button
            type="button"
            onClick={() => { setCodeOpen((v) => !v); setCouponOpen(false); }}
            className={`group relative overflow-hidden rounded-xl border-2 p-3 text-right hover:shadow-md transition ${
              codeOpen ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-violet-200 bg-violet-50/40 dark:bg-violet-900/10 hover:border-violet-400'
            }`}
            data-testid="plan-code-toggle"
          >
            <div className="flex items-start gap-2">
              <span className="text-2xl">🔑</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-violet-800 dark:text-violet-200">لديكِ كود اشتراك؟</div>
                <div className="text-[11px] text-violet-700/80 dark:text-violet-300/80">فعّلي خطتك مباشرة</div>
              </div>
              <span className="text-violet-700 text-xs">{codeOpen ? '▲' : '▼'}</span>
            </div>
          </button>
        </div>

        {/* Coupon input panel */}
        {couponOpen && (
          <div className="mx-5 mt-3 rounded-xl border border-orange-200 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/10 p-3" data-testid="plan-coupon-panel">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[160px]">
                <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 block mb-1">الخطة المستهدفة</label>
                <select
                  value={couponPlan}
                  onChange={(e) => { setCouponPlan(e.target.value); setCouponPreview(null); }}
                  className="w-full px-2 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                  data-testid="plan-coupon-plan"
                >
                  <option value="company_startup">شركة ناشئة (٣,٥٠٠ ج.م)</option>
                  <option value="company_business">شركة متوسطة (٧,٥٠٠ ج.م)</option>
                  <option value="company_enterprise">شركة كبرى (٢٠,٠٠٠ ج.م)</option>
                </select>
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 block mb-1">كود الكوبون</label>
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponPreview(null); }}
                  placeholder="مثال: WELCOME20"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono uppercase focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  data-testid="plan-coupon-input"
                />
              </div>
              <button
                onClick={previewCoupon}
                disabled={couponLoading || !couponInput.trim()}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white disabled:opacity-60"
                data-testid="plan-coupon-preview-btn"
              >
                {couponLoading ? '...جارٍ' : 'تطبيق'}
              </button>
            </div>
            {couponPreview && (
              <div className="mt-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 p-3 text-sm" data-testid="plan-coupon-result">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-gray-500 line-through text-xs">{couponPreview.original_price.toLocaleString('ar-EG')} ج.م</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">{couponPreview.final_price.toLocaleString('ar-EG')} ج.م</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">(وفّرتِ {couponPreview.discount_amount.toLocaleString('ar-EG')} ج.م)</span>
                </div>
                <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">
                  💡 اضغطي زر الدفع للخطة المختارة في الأسفل لإتمام الترقية بالسعر المخفّض.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subscription Code input panel */}
        {codeOpen && (
          <div className="mx-5 mt-3 rounded-xl border border-violet-200 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-900/10 p-3" data-testid="plan-code-panel">
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 block mb-1">كود الاشتراك</label>
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="مثال: HOMEME-PRO-2026"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono uppercase tracking-wider focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  data-testid="plan-code-input"
                />
              </div>
              <button
                onClick={redeemCode}
                disabled={codeLoading || !codeInput.trim()}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white disabled:opacity-60"
                data-testid="plan-code-redeem-btn"
              >
                {codeLoading ? '...جارٍ التفعيل' : 'تفعيل الكود'}
              </button>
            </div>
            <div className="text-[11px] text-violet-700/80 dark:text-violet-300/80 mt-2">
              💡 الكود يفعّل خطتك فوراً بدون الحاجة للدفع — يُمنح عادةً عبر العروض الخاصة أو شراكات الإعلان.
            </div>
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
                  disabled={isCurrent || !isUpgrade || upgrading === p.key}
                  className={`mt-3 w-full px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                    isCurrent
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                      : isUpgrade
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md disabled:opacity-60'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  }`}
                  data-testid={`upgrade-cta-${p.key}`}
                >
                  {upgrading === p.key ? '⏳ جارٍ فتح صفحة الدفع...' :
                   isCurrent ? 'خطتك الحالية' :
                   isUpgrade ? (p.monthly_egp > 0 ? '💳 الدفع والترقية' : 'ترقية الآن') :
                   'خطة أقل'}
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
