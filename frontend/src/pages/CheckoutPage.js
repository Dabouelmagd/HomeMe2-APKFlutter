import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CheckoutPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Get plan details from location state
  const planDetails = location.state || {};
  const { planName, price, currency, duration, planType } = planDetails;

  useEffect(() => {
    // If no plan details, redirect back to homepage
    if (!planName) {
      navigate('/');
    }
  }, [planName, navigate]);

  const handlePayment = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

      // Create payment order
      const response = await fetch(`${backendUrl}/api/payment/create-paypal-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_name: planName,
          amount: price,
          currency: currency || 'USD',
          duration: duration || 'monthly',
          plan_type: planType
        })
      });

      const data = await response.json();

      if (response.ok && data.approval_url) {
        // Redirect to PayPal
        window.location.href = data.approval_url;
      } else {
        setError(data.detail || t('payment_error', 'Payment failed. Please try again.'));
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(t('payment_error', 'Payment failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = () => {
    if (currency === 'EGP') {
      return `${price} ${t('egp', 'ج.م')}`;
    }
    return `$${price}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('checkout', 'Checkout')}
          </h1>
          <p className="text-gray-600">
            {t('complete_payment', 'Complete your payment to activate your subscription')}
          </p>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {t('order_summary', 'Order Summary')}
          </h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-600">{t('plan', 'Plan')}</span>
              <span className="font-semibold text-gray-900">{t(planName, planName)}</span>
            </div>
            
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-600">{t('duration', 'Duration')}</span>
              <span className="font-semibold text-gray-900">
                {duration === 'yearly' ? t('yearly', 'Yearly') : t('monthly', 'Monthly')}
              </span>
            </div>
            
            <div className="flex justify-between py-3 border-b">
              <span className="text-gray-600">{t('price', 'Price')}</span>
              <span className="text-2xl font-bold text-blue-600">{formatPrice()}</span>
            </div>
          </div>

          {/* Total */}
          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">{t('total', 'Total')}</span>
              <span className="text-3xl font-bold text-blue-600">{formatPrice()}</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Payment Button */}
          <button
            onClick={handlePayment}
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t('processing', 'Processing...')}
              </span>
            ) : (
              <>
                {t('pay_with_paypal', 'Pay with PayPal')} 💳
              </>
            )}
          </button>

          {/* Cancel Button */}
          <button
            onClick={() => navigate('/')}
            className="w-full mt-4 py-3 rounded-xl font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            {t('cancel', 'Cancel')}
          </button>
        </div>

        {/* Security Badge */}
        <div className="text-center text-gray-500 text-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{t('secure_payment', 'Secure Payment')}</span>
          </div>
          <p>{t('payment_secured', 'Your payment information is encrypted and secure')}</p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
