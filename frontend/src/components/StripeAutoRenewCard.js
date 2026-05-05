import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  CreditCardIcon,
  SparklesIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PLAN_LABELS = {
  company_startup: 'شركة ناشئة',
  company_business: 'شركة متوسطة',
  company_enterprise: 'شركة كبرى',
};

/**
 * StripeAutoRenewCard — manages Stripe Subscription (true recurring) for a company.
 * Shows: current status, plan picker (monthly/yearly toggle with savings %), checkout button,
 * customer portal access, cancel/resume.
 */
const StripeAutoRenewCard = () => {
  const [plans, setPlans] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('company_business');
  const [billingCycle, setBillingCycle] = useState('yearly');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      const [p, s] = await Promise.all([
        axios.get(`${API}/stripe-subscriptions/plans`),
        axios.get(`${API}/stripe-subscriptions/status`, { headers }),
      ]);
      setPlans(p.data?.plans || []);
      setStatus(s.data || null);
    } catch (e) {
      // Silent — likely not a company_admin
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCheckout = async () => {
    setBusy(true);
    try {
      const res = await axios.post(
        `${API}/stripe-subscriptions/checkout`,
        {
          plan_key: selectedPlan,
          billing_cycle: billingCycle,
          origin_url: window.location.origin,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'فشل إنشاء جلسة الدفع');
      setBusy(false);
    }
  };

  const handleOpenPortal = async () => {
    setBusy(true);
    try {
      const res = await axios.post(
        `${API}/stripe-subscriptions/portal`,
        { origin_url: window.location.origin },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      if (res.data?.url) window.location.href = res.data.url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'فشل فتح بوابة العميل');
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('سيتم إلغاء التجديد التلقائي بنهاية الدورة الحالية. الخدمة تستمر حتى ذلك الحين. متابعة؟')) return;
    setBusy(true);
    try {
      await axios.post(
        `${API}/stripe-subscriptions/cancel`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('تم إلغاء التجديد التلقائي ✓');
      fetchAll();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'فشل الإلغاء');
    } finally {
      setBusy(false);
    }
  };

  const handleResume = async () => {
    setBusy(true);
    try {
      await axios.post(
        `${API}/stripe-subscriptions/resume`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('تم استئناف التجديد التلقائي ✓');
      fetchAll();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'فشل الاستئناف');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 animate-pulse" data-testid="stripe-autorenew-loading">
        <div className="h-5 bg-gray-100 rounded w-1/3 mb-3" />
        <div className="h-12 bg-gray-50 rounded mb-2" />
      </div>
    );
  }

  // ============================================================================
  // STATE: User has active auto-renewal — show management panel
  // ============================================================================
  if (status?.is_auto_renewing || status?.cancel_at_period_end) {
    return (
      <div
        className="bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-200 rounded-2xl p-5 mb-4"
        data-testid="stripe-autorenew-active"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow">
            <ArrowPathIcon className={`w-6 h-6 text-white ${!status.cancel_at_period_end ? 'animate-spin-slow' : ''}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  {status.cancel_at_period_end ? '⚠️ التجديد التلقائي معطّل' : '✅ تجديد تلقائي نشط'}
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  الخطة: <span className="font-bold text-emerald-700">{PLAN_LABELS[status.plan] || status.plan}</span>
                  {' '}· {status.billing_cycle === 'yearly' ? 'سنوي' : 'شهري'}
                </p>
                {status.expires_at && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    {status.cancel_at_period_end
                      ? `سينتهي في: ${new Date(status.expires_at).toLocaleDateString('ar-EG')}`
                      : `التجديد القادم: ${new Date(status.expires_at).toLocaleDateString('ar-EG')}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={handleOpenPortal}
                disabled={busy}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                data-testid="stripe-portal-btn"
              >
                <CreditCardIcon className="w-4 h-4" />
                إدارة الكارت / الفواتير
              </button>
              {status.cancel_at_period_end ? (
                <button
                  onClick={handleResume}
                  disabled={busy}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  data-testid="stripe-resume-btn"
                >
                  ↩️ استئناف التجديد التلقائي
                </button>
              ) : (
                <button
                  onClick={handleCancel}
                  disabled={busy}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  data-testid="stripe-cancel-btn"
                >
                  ✕ إيقاف التجديد التلقائي
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // STATE: No auto-renewal — show upgrade flow
  // ============================================================================
  const selected = plans.find((p) => p.key === selectedPlan);
  const amount = selected
    ? billingCycle === 'monthly'
      ? selected.monthly_amount
      : selected.yearly_amount
    : 0;
  const savingsPercent = selected?.yearly_savings_percent || 0;

  return (
    <div
      className="bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 border-2 border-violet-200 rounded-2xl p-5 mb-4"
      data-testid="stripe-autorenew-upgrade"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center flex-shrink-0 shadow">
          <SparklesIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">🔁 فعّل التجديد التلقائي</h3>
          <p className="text-xs text-gray-600 mt-1">
            اشتراك يجدد نفسه تلقائياً كل شهر/سنة عبر Stripe — لا يتوقف عن العمل أبداً، تقدر تلغي في أي وقت.
          </p>
        </div>
      </div>

      {/* Billing cycle toggle */}
      <div className="bg-white border border-violet-200 rounded-xl p-1 mb-3 flex gap-1">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
            billingCycle === 'monthly' ? 'bg-violet-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
          }`}
          data-testid="stripe-cycle-monthly"
        >
          شهري
        </button>
        <button
          onClick={() => setBillingCycle('yearly')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors relative ${
            billingCycle === 'yearly' ? 'bg-violet-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
          }`}
          data-testid="stripe-cycle-yearly"
        >
          سنوي
          {savingsPercent > 0 && (
            <span className="absolute -top-2 -left-2 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">
              -{savingsPercent}%
            </span>
          )}
        </button>
      </div>

      {/* Plan picker */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {plans.map((p) => {
          const active = selectedPlan === p.key;
          const planAmount = billingCycle === 'monthly' ? p.monthly_amount : p.yearly_amount;
          return (
            <button
              key={p.key}
              onClick={() => setSelectedPlan(p.key)}
              className={`text-center p-3 rounded-xl border-2 transition-all ${
                active
                  ? 'bg-violet-600 border-violet-700 text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-violet-300'
              }`}
              data-testid={`stripe-plan-${p.key}`}
            >
              <div className="text-[11px] font-bold mb-1">{p.name_ar}</div>
              <div className={`text-base font-black ${active ? 'text-white' : 'text-violet-700'}`}>
                {Math.round(planAmount).toLocaleString('en-US')}
              </div>
              <div className="text-[9px] opacity-75">ج.م/{billingCycle === 'monthly' ? 'شهر' : 'سنة'}</div>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleCheckout}
        disabled={busy}
        className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
        data-testid="stripe-subscribe-btn"
      >
        {busy ? (
          <ArrowPathIcon className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <CreditCardIcon className="w-5 h-5" />
            اشترك الآن — {Math.round(amount).toLocaleString('en-US')} ج.م {billingCycle === 'monthly' ? '/شهر' : '/سنة'}
          </>
        )}
      </button>

      <div className="flex items-center gap-1.5 mt-3 text-[10px] text-gray-500 justify-center">
        <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
        دفع آمن عبر Stripe — تقدر تلغي في أي وقت
      </div>
    </div>
  );
};

export default StripeAutoRenewCard;
