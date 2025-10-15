import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const PayPalSuccessPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const capturePayment = async () => {
      const token = searchParams.get('token');
      const payerId = searchParams.get('PayerID');

      if (!token || !payerId) {
        setError(t('invalid_payment', 'Invalid payment parameters'));
        setLoading(false);
        return;
      }

      try {
        const authToken = localStorage.getItem('token');
        const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

        const response = await fetch(`${backendUrl}/api/payment/capture-paypal-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            payment_id: token,
            payer_id: payerId
          })
        });

        const data = await response.json();

        if (response.ok) {
          setSuccess(true);
        } else {
          setError(data.detail || t('payment_capture_failed', 'Failed to complete payment'));
        }
      } catch (err) {
        console.error('Payment capture error:', err);
        setError(t('payment_error', 'An error occurred while processing your payment'));
      } finally {
        setLoading(false);
      }
    };

    capturePayment();
  }, [searchParams, t]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-xl text-gray-700">{t('processing_payment', 'Processing your payment...')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('payment_failed', 'Payment Failed')}</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            {t('back_to_home', 'Back to Home')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Success Message */}
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          {t('payment_successful', 'Payment Successful!')}
        </h2>
        <p className="text-gray-600 mb-6">
          {t('subscription_activated', 'Your subscription has been activated successfully. You can now access all features.')}
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {t('go_to_dashboard', 'Go to Dashboard')}
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            {t('back_to_home', 'Back to Home')}
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">
            {t('receipt_sent', 'A receipt has been sent to your email address')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PayPalSuccessPage;
