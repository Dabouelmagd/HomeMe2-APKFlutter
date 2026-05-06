import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { formatDate as formatDateUtil } from '../utils/dateUtils';
import { CreditCardIcon } from '@heroicons/react/24/outline';
import PageHeader from '../components/shared/PageHeader';

const PaymentPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { user } = useAuth();
  const [packages, setPackages] = useState({});
  const [selectedPackage, setSelectedPackage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [showTransactions, setShowTransactions] = useState(false);
  // Default scope tab — company-managers / owners default to "company",
  // everyone else defaults to "residential". User can flip the tab freely.
  const [scope, setScope] = useState('residential');
  const [scopeInitialized, setScopeInitialized] = useState(false);

  // Set default scope once auth user finishes loading
  useEffect(() => {
    if (scopeInitialized) return;
    const r = user?.role;
    if (!r) return; // wait for user to be defined
    const next = (r === 'company_admin' || r === 'app_owner' || r === 'super_admin') ? 'company' : 'residential';
    setScope(next);
    setScopeInitialized(true);
  }, [user?.role, scopeInitialized]);

  // Billing cycle — 'monthly' or 'yearly'. Yearly = 10× monthly price (i.e.
  // 2 months free) and maps to backend duration "1_year".
  const [billingCycle, setBillingCycle] = useState('monthly');
  const YEARLY_MULTIPLIER = 10;
  const cycleSuffix = billingCycle === 'yearly' ? 'سنوياً' : 'شهرياً';
  const cycleMultiplier = billingCycle === 'yearly' ? YEARLY_MULTIPLIER : 1;

  useEffect(() => {
    loadPaymentPackages();
    loadUserTransactions();
    checkReturnFromStripe();
  }, []);

  const loadPaymentPackages = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/payments/plans`);
      if (response.ok) {
        const data = await response.json();
        // Flatten residential + company plans into a single map keyed by plan id.
        // The backend returns prices in EGP & USD — we display EGP since the
        // app is Egypt-primary; Stripe checkout itself runs in USD.
        const flat = {};
        for (const tier of (data.residential || [])) {
          flat[tier.id] = {
            name: tier.name,
            amount: tier.monthly_egp,
            amount_usd: tier.monthly_usd,
            currency: 'EGP',
            description: tier.residents,
            features: tier.features || [],
            popular: !!tier.popular,
            scope: 'residential',
          };
        }
        for (const tier of (data.company || [])) {
          flat[tier.id] = {
            name: tier.name,
            amount: tier.monthly_egp,
            amount_usd: tier.monthly_usd,
            currency: 'EGP',
            description: tier.compounds,
            features: tier.features || [],
            popular: !!tier.popular,
            scope: 'company',
          };
        }
        // Skip the free starter plan — no point in showing 0-EGP "purchase"
        delete flat.starter;
        setPackages(flat);
        // Note: we no longer pre-select the first key globally — selection is
        // driven by the active scope tab in a separate useEffect below.
      } else {
        setError('فشل تحميل خطط الاشتراك');
      }
    } catch (error) {
      console.error('Error loading payment packages:', error);
      setError('فشل تحميل خطط الاشتراك');
    }
  };

  // Plans visible in the currently active tab. Memoized so the JSX stays
  // stable across re-renders.
  const visiblePackages = useMemo(() => {
    return Object.entries(packages)
      .filter(([, pkg]) => pkg.scope === scope)
      .reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});
  }, [packages, scope]);

  // Whenever scope or packages change, auto-pick a sensible default in the
  // new tab: prefer the "popular" plan if marked, otherwise the first plan.
  // Skip if the previously-selected plan is still visible.
  useEffect(() => {
    const ids = Object.keys(visiblePackages);
    if (ids.length === 0) {
      setSelectedPackage('');
      return;
    }
    if (!ids.includes(selectedPackage)) {
      const popularId = ids.find((id) => visiblePackages[id].popular);
      setSelectedPackage(popularId || ids[0]);
    }
  }, [visiblePackages, selectedPackage]);

  const loadUserTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/stripe/my-transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Endpoint returns { transactions: [...] } OR a list directly — handle both.
        setTransactions(Array.isArray(data) ? data : (data.transactions || []));
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const getUrlParameter = (name) => {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(window.location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
  };

  const updateStatus = (message, type) => {
    setError(type === 'error' ? message : '');
    if (type === 'success') {
      // Show success message or redirect
      alert(message);
    }
  };

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    const pollInterval = 2000; // 2 seconds

    if (attempts >= maxAttempts) {
      updateStatus('Payment status check timed out. Please check your email for confirmation.', 'error');
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/payments/v1/checkout/status/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to check payment status');
      }

      const data = await response.json();
      
      if (data.payment_status === 'paid') {
        updateStatus('Payment successful! Thank you for your purchase.', 'success');
        // Refresh transactions
        loadUserTransactions();
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      } else if (data.status === 'expired') {
        updateStatus('Payment session expired. Please try again.', 'error');
        return;
      }

      // If payment is still pending, continue polling
      setError('Payment is being processed...');
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
    } catch (error) {
      console.error('Error checking payment status:', error);
      updateStatus('Error checking payment status. Please try again.', 'error');
    }
  };

  const checkReturnFromStripe = () => {
    const sessionId = getUrlParameter('session_id');
    if (sessionId) {
      setError('Checking payment status...');
      pollPaymentStatus(sessionId);
    }
  };

  const initiatePayment = async () => {
    if (!selectedPackage) {
      setError('Please select a payment package');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to make payments');
        setLoading(false);
        return;
      }

      const requestBody = {
        plan: selectedPackage,
        duration: billingCycle === 'yearly' ? '1_year' : '1_month',
        currency: 'egp',
      };

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/payments/subscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create checkout session');
      }

      const data = await response.json();

      // Backend returns `checkout_url` (current API) — fall back to `url`
      // for any older mock or proxy.
      const redirectUrl = data.checkout_url || data.url;
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      setError(error.message);
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'EGP') => {
    if (currency === 'EGP') {
      return `${Number(amount).toLocaleString('ar-EG')} ج.م`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'initiated':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div className={`min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'} data-testid="payment-center">
        <div className="max-w-7xl mx-auto space-y-6">
          <PageHeader
            theme="emerald"
            icon={CreditCardIcon}
            badge={t('payment_center_badge', 'الدفع والمعاملات')}
            title={t('payment_center', 'مركز المدفوعات')}
            subtitle={t('manage_payments_description', 'إدارة مدفوعاتك وعرض سجل المعاملات')}
            testId="payment-page-header"
          />

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Section */}
          <div className="bg-white/95 rounded-2xl shadow-xl border border-white/10 p-6">
            <h2 className="text-xl font-semibold mb-4">{t('make_payment', 'إجراء دفع')}</h2>
            
            <div className="space-y-4">
              {/* Scope tabs — residential vs company-management */}
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1" role="tablist" data-testid="payment-scope-tabs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={scope === 'residential'}
                  onClick={() => setScope('residential')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${
                    scope === 'residential' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  data-testid="scope-tab-residential"
                >
                  <span>🏠</span>
                  <span>سكني</span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    ({Object.values(packages).filter(p => p.scope === 'residential').length})
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={scope === 'company'}
                  onClick={() => setScope('company')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${
                    scope === 'company' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  data-testid="scope-tab-company"
                >
                  <span>🏢</span>
                  <span>شركات إدارة</span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    ({Object.values(packages).filter(p => p.scope === 'company').length})
                  </span>
                </button>
              </div>

              {/* Billing cycle toggle — monthly / yearly (yearly = 2 months free) */}
              <div className="flex items-center justify-center" data-testid="billing-cycle-toggle">
                <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                      billingCycle === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                    }`}
                    data-testid="billing-monthly"
                  >
                    شهرياً
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('yearly')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                      billingCycle === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                    }`}
                    data-testid="billing-yearly"
                  >
                    <span>سنوياً</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-white whitespace-nowrap">
                      🎁 وفّري شهرين
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('select_payment_type', 'اختر الخطة المناسبة')}
                </label>
                {Object.keys(visiblePackages).length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm border border-dashed border-gray-300 rounded-xl">
                    لا توجد خطط في هذا التبويب
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="plan-comparison-grid">
                    {Object.entries(visiblePackages).map(([key, pkg]) => {
                      const isSelected = selectedPackage === key;
                      const accentRing = scope === 'company' ? 'ring-violet-500' : 'ring-blue-500';
                      const accentBg = scope === 'company' ? 'bg-violet-50' : 'bg-blue-50';
                      const accentText = scope === 'company' ? 'text-violet-700' : 'text-blue-700';
                      const accentCheck = scope === 'company' ? 'text-violet-600' : 'text-blue-600';
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => setSelectedPackage(key)}
                          className={`relative text-right p-4 rounded-xl border-2 transition-all hover:shadow-md flex flex-col gap-2 ${
                            isSelected
                              ? `border-transparent ring-2 ${accentRing} ${accentBg} shadow-md`
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                          data-testid={`plan-card-${key}`}
                          aria-pressed={isSelected}
                        >
                          {pkg.popular && (
                            <span className={`absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
                              scope === 'company' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                            }`}>
                              ⭐ الأكثر شيوعًا
                            </span>
                          )}
                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="font-bold text-base text-gray-900">{pkg.name}</h3>
                            {isSelected && <span className={`text-xs font-bold ${accentText}`}>✓ مختار</span>}
                          </div>
                          {pkg.description && (
                            <p className="text-[11px] text-gray-500">{pkg.description}</p>
                          )}
                          <div className="flex items-baseline gap-1">
                            <span className={`text-2xl font-extrabold ${accentText}`}>
                              {Number(pkg.amount * cycleMultiplier).toLocaleString('ar-EG')}
                            </span>
                            <span className="text-xs text-gray-500">ج.م / {cycleSuffix}</span>
                          </div>
                          {billingCycle === 'yearly' && pkg.amount > 0 && (
                            <div className="text-[10px] text-emerald-700 font-bold -mt-1">
                              ≈ {Number(pkg.amount).toLocaleString('ar-EG')} ج.م/شهر · وفّرتِ {Number(pkg.amount * 2).toLocaleString('ar-EG')} ج.م
                            </div>
                          )}
                          {(pkg.features || []).length > 0 && (
                            <ul className="space-y-1 mt-1 text-[11px] text-gray-700" data-testid={`plan-features-${key}`}>
                              {pkg.features.map((f, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className={`shrink-0 mt-0.5 ${accentCheck}`}>✓</span>
                                  <span>{f}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={initiatePayment}
                disabled={loading || !selectedPackage}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition duration-200"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('processing', 'جاري المعالجة...')}
                  </div>
                ) : (
                  t('proceed_to_payment', 'المتابعة للدفع')
                )}
              </button>

              <p className="text-sm text-gray-500 text-center">
                {t('secure_payments_stripe', 'مدفوعات آمنة مدعومة بـ Stripe')}
              </p>
            </div>
          </div>

          {/* Transactions Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{t('transaction_history', 'سجل المعاملات')}</h2>
              <button
                onClick={() => setShowTransactions(!showTransactions)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {showTransactions ? t('hide', 'إخفاء') : t('show_all', 'إظهار الكل')}
              </button>
            </div>

            {showTransactions && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    {t('no_transactions_found', 'لا توجد معاملات')}
                  </p>
                ) : (
                  transactions.slice(0, showTransactions ? transactions.length : 5).map((transaction) => (
                    <div key={transaction.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {transaction.description}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {formatDateUtil(transaction.created_at)}
                          </p>
                        </div>
                        <div className={`text-${isRTL ? 'left' : 'right'}`}>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </p>
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(transaction.payment_status)}`}>
                            {t(`status_${transaction.payment_status}`, transaction.payment_status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Payment Security Notice */}
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className={`flex items-start ${isRTL ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
            <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                {t('secure_payment_processing', 'معالجة دفع آمنة')}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {t('payment_security_notice', 'جميع المدفوعات تتم بشكل آمن عبر Stripe. معلومات الدفع الخاصة بك مشفرة ولا يتم تخزينها على خوادمنا.')}
              </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default PaymentPage;