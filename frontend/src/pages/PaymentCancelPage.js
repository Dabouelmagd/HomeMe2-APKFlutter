import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const PaymentCancelPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="min-h-96 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto">
          <div className="bg-white shadow-lg rounded-lg p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h1 className="mt-4 text-xl font-semibold text-gray-900">
                {t('Payment Cancelled')}
              </h1>
              
              <p className="mt-2 text-sm text-gray-600">
                {t('Your payment has been cancelled. No charges were made to your account.')}
              </p>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-900 mb-2">
                  {t('What happened?')}
                </h3>
                <p className="text-sm text-yellow-800">
                  {t('You chose to cancel the payment process before completion. This is completely normal and no payment was processed.')}
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => navigate('/payments')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                >
                  {t('Try Payment Again')}
                </button>
                
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                >
                  {t('Go to Dashboard')}
                </button>
              </div>

              <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600">
                  {t('Need help? Contact our support team for assistance with payments or account issues.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentCancelPage;