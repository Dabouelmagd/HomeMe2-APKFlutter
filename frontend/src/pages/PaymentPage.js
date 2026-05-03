import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate as formatDateUtil } from '../utils/dateUtils';

const PaymentPage = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [packages, setPackages] = useState({});
  const [selectedPackage, setSelectedPackage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [showTransactions, setShowTransactions] = useState(false);

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
            name: `${tier.name} — سكني`,
            amount: tier.monthly_egp,
            amount_usd: tier.monthly_usd,
            currency: 'EGP',
            description: tier.residents,
            scope: 'residential',
          };
        }
        for (const tier of (data.company || [])) {
          flat[tier.id] = {
            name: `${tier.name} — شركات إدارة`,
            amount: tier.monthly_egp,
            amount_usd: tier.monthly_usd,
            currency: 'EGP',
            description: tier.compounds,
            scope: 'company',
          };
        }
        // Skip the free starter plan — no point in showing 0-EGP "purchase"
        delete flat.starter;
        setPackages(flat);
        const firstPaid = Object.keys(flat)[0];
        if (firstPaid) setSelectedPackage(firstPaid);
      } else {
        setError('فشل تحميل خطط الاشتراك');
      }
    } catch (error) {
      console.error('Error loading payment packages:', error);
      setError('فشل تحميل خطط الاشتراك');
    }
  };

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
        duration: '1_month',
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
      <div className={`max-w-4xl mx-auto p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('payment_center', 'مركز المدفوعات')}
          </h1>
          <p className="text-gray-600">
            {t('manage_payments_description', 'إدارة مدفوعاتك وعرض سجل المعاملات')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">{t('make_payment', 'إجراء دفع')}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('select_payment_type', 'اختر نوع الدفع')}
                </label>
                <select
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('choose_payment_option', 'اختر خيار الدفع')}</option>
                  {Object.entries(packages).map(([key, pkg]) => (
                    <option key={key} value={key}>
                      {t(`payment_${key}`, pkg.name)} - {formatCurrency(pkg.amount, pkg.currency)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPackage && packages[selectedPackage] && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">
                    {t(`payment_${selectedPackage}`, packages[selectedPackage].name)}
                  </h3>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(packages[selectedPackage].amount, packages[selectedPackage].currency)}
                  </p>
                </div>
              )}

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
    </>
  );
};

export default PaymentPage;