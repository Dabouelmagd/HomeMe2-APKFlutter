import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const PaymentSuccessPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking');
  const [transactionDetails, setTransactionDetails] = useState(null);

  useEffect(() => {
    checkPaymentStatus();
  }, []);

  const getUrlParameter = (name) => {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(window.location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
  };

  const checkPaymentStatus = async () => {
    const sessionId = getUrlParameter('session_id');
    
    if (!sessionId) {
      setStatus('error');
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/payments/v1/checkout/status/${sessionId}`);
      
      if (response.ok) {
        const data = await response.json();
        setTransactionDetails(data);
        
        if (data.payment_status === 'paid') {
          setStatus('success');
        } else if (data.status === 'expired') {
          setStatus('expired');
        } else {
          setStatus('processing');
          // Continue checking for a few more seconds
          setTimeout(checkPaymentStatus, 3000);
        }
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setStatus('error');
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100); // Stripe returns amounts in cents
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'processing':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
            <svg className="animate-spin h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        );
      case 'expired':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
            <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'success':
        return t('Payment Successful!');
      case 'processing':
        return t('Processing Payment...');
      case 'expired':
        return t('Payment Session Expired');
      case 'checking':
        return t('Checking Payment Status...');
      default:
        return t('Payment Failed');
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'success':
        return t('Thank you! Your payment has been processed successfully. A confirmation email has been sent to you.');
      case 'processing':
        return t('Your payment is being processed. Please wait a moment while we confirm the transaction.');
      case 'expired':
        return t('Your payment session has expired. Please try making the payment again.');
      case 'checking':
        return t('Please wait while we verify your payment status...');
      default:
        return t('There was an issue processing your payment. Please try again or contact support.');
    }
  };

  return (
    <Layout>
      <div className="min-h-96 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto">
          <div className="bg-white shadow-lg rounded-lg p-6">
            <div className="text-center">
              {getStatusIcon()}
              
              <h1 className="mt-4 text-xl font-semibold text-gray-900">
                {getStatusTitle()}
              </h1>
              
              <p className="mt-2 text-sm text-gray-600">
                {getStatusMessage()}
              </p>

              {transactionDetails && status === 'success' && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="text-sm font-medium text-green-900 mb-2">
                    {t('Transaction Details')}
                  </h3>
                  <div className="text-left space-y-1">
                    <p className="text-sm text-green-800">
                      <strong>{t('Amount')}:</strong> {formatCurrency(transactionDetails.amount_total, transactionDetails.currency)}
                    </p>
                    <p className="text-sm text-green-800">
                      <strong>{t('Session ID')}:</strong> {transactionDetails.session_id}
                    </p>
                    <p className="text-sm text-green-800">
                      <strong>{t('Status')}:</strong> {transactionDetails.payment_status}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-3">
                {status === 'success' && (
                  <>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                    >
                      {t('Go to Dashboard')}
                    </button>
                    <button
                      onClick={() => navigate('/payments')}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                    >
                      {t('View Transactions')}
                    </button>
                  </>
                )}

                {(status === 'error' || status === 'expired') && (
                  <>
                    <button
                      onClick={() => navigate('/payments')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                    >
                      {t('Try Again')}
                    </button>
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                    >
                      {t('Go to Dashboard')}
                    </button>
                  </>
                )}

                {status === 'processing' && (
                  <p className="text-sm text-gray-500">
                    {t('This page will automatically update when the payment is confirmed.')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentSuccessPage;