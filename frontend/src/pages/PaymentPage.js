import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { formatDate as formatDateUtil } from '../utils/dateUtils';

const PaymentPage = () => {
  const { t } = useTranslation();
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
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/payments/v1/packages`);
      if (response.ok) {
        const data = await response.json();
        setPackages(data.packages);
        // Set first package as default
        const firstPackage = Object.keys(data.packages)[0];
        if (firstPackage) {
          setSelectedPackage(firstPackage);
        }
      }
    } catch (error) {
      console.error('Error loading payment packages:', error);
      setError('Failed to load payment packages');
    }
  };

  const loadUserTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/payments/v1/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
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

      // Get current URL for success and cancel URLs
      const currentUrl = window.location.origin + window.location.pathname;
      
      const requestBody = {
        package_id: selectedPackage,
        origin_url: window.location.origin,
        metadata: {
          source: 'web_payment_page',
          package_name: packages[selectedPackage]?.name || selectedPackage
        }
      };

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/payments/v1/checkout/session`, {
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
      
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
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

  const formatCurrency = (amount, currency = 'USD') => {
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
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('payment_center')}
          </h1>
          <p className="text-gray-600">
            {t('manage_payments_description')}
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
            <h2 className="text-xl font-semibold mb-4">{t('Make Payment')}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('Select Payment Type')}
                </label>
                <select
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('Choose a payment option')}</option>
                  {Object.entries(packages).map(([key, pkg]) => (
                    <option key={key} value={key}>
                      {pkg.name} - {formatCurrency(pkg.amount, pkg.currency)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedPackage && packages[selectedPackage] && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">
                    {packages[selectedPackage].name}
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
                    {t('Processing...')}
                  </div>
                ) : (
                  t('Proceed to Payment')
                )}
              </button>

              <p className="text-sm text-gray-500 text-center">
                {t('Secure payments powered by Stripe')}
              </p>
            </div>
          </div>

          {/* Transactions Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{t('Transaction History')}</h2>
              <button
                onClick={() => setShowTransactions(!showTransactions)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {showTransactions ? t('Hide') : t('Show All')}
              </button>
            </div>

            {showTransactions && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {transactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    {t('No transactions found')}
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
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </p>
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(transaction.payment_status)}`}>
                            {transaction.payment_status}
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
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                {t('Secure Payment Processing')}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {t('All payments are processed securely through Stripe. Your payment information is encrypted and never stored on our servers.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentPage;