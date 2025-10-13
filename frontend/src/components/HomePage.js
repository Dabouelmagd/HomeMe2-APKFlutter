import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';
import ResidentDashboard from './ResidentDashboard';
import Layout from './Layout';

const HomePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isTrial, setIsTrial] = useState(false);

  const startTrial = () => {
    setIsTrial(true);
  };

  const handleSubscribe = () => {
    navigate('/register');
  };

  if (isTrial) {
    // إظهار النسخة التجريبية للتطبيق
    return (
      <div className="trial-app">
        {/* شريط التجربة في الأعلى */}
        <div className="bg-yellow-100 border-b-2 border-yellow-300 p-3 text-center">
          <div className="flex justify-between items-center max-w-6xl mx-auto">
            <div className="flex items-center space-x-4">
              <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                {t('trial_mode', 'Trial Mode')}
              </span>
              <span className="text-yellow-800">
                {t('trial_description', 'You are using HomeMe in trial mode. Subscribe to unlock all features.')}
              </span>
            </div>
            <button
              onClick={handleSubscribe}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {t('subscribe_now', 'Subscribe Now')}
            </button>
          </div>
        </div>

        {/* التطبيق الكامل - Trial Mode */}
        <div className="trial-dashboard">
          <ResidentDashboard isTrialMode={true} />
        </div>
      </div>
    );
  }

  // الصفحة الرئيسية
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <img
                src="https://customer-assets.emergentagent.com/job_homeme-subscriptions/artifacts/6yk66f7n_WhatsApp%20Image%202022-01-17%20at%2010.23.44%20AM.637bf42d664818.47361218.jpeg"
                alt="HomeMe"
                className="h-12 w-auto"
              />
              <h1 className="text-2xl font-bold text-gray-900">HomeMe</h1>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            {t('welcome_to_homeme', 'Welcome to HomeMe')}
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            {t('homeme_description', 'The complete solution for residential compound management. Manage residents, services, utilities, and more with our advanced platform.')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={startTrial}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg"
            >
              {t('try_free_demo', 'Try Free Demo')} ✨
            </button>
            <button
              onClick={handleSubscribe}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors shadow-lg"
            >
              {t('get_started', 'Get Started')}
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🏠</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">{t('resident_management', 'Resident Management')}</h3>
            <p className="text-gray-600">
              {t('resident_management_desc', 'Complete system for managing residents, families, and units in your compound.')}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🛠️</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">{t('service_booking', 'Service Booking')}</h3>
            <p className="text-gray-600">
              {t('service_booking_desc', 'Easy booking and management of maintenance and utility services.')}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="text-xl font-semibold mb-3">{t('financial_management', 'Financial Management')}</h3>
            <p className="text-gray-600">
              {t('financial_management_desc', 'Complete billing, payments, and financial tracking for your compound.')}
            </p>
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h3 className="text-2xl font-bold mb-4">{t('choose_your_plan', 'Choose Your Plan')}</h3>
          <p className="text-gray-600 mb-6">
            {t('pricing_intro', 'Start with our free trial or choose a subscription plan that fits your compound size.')}
          </p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border-2 border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-lg mb-2">{t('free_trial', 'Free Trial')}</h4>
              <p className="text-3xl font-bold text-green-600 mb-2">0$</p>
              <p className="text-sm text-gray-600 mb-4">{t('trial_duration', '30 Days')}</p>
              <button
                onClick={startTrial}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
              >
                {t('start_trial', 'Start Trial')}
              </button>
            </div>

            <div className="border-2 border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-lg mb-2">{t('basic_plan', 'Basic Plan')}</h4>
              <p className="text-3xl font-bold text-blue-600 mb-2">$29</p>
              <p className="text-sm text-gray-600 mb-4">{t('per_month', 'per month')}</p>
              <button
                onClick={handleSubscribe}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                {t('choose_plan', 'Choose Plan')}
              </button>
            </div>

            <div className="border-2 border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-lg mb-2">{t('pro_plan', 'Pro Plan')}</h4>
              <p className="text-3xl font-bold text-purple-600 mb-2">$59</p>
              <p className="text-sm text-gray-600 mb-4">{t('per_month', 'per month')}</p>
              <button
                onClick={handleSubscribe}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
              >
                {t('choose_plan', 'Choose Plan')}
              </button>
            </div>

            <div className="border-2 border-gold-200 rounded-lg p-4 bg-gradient-to-b from-yellow-50 to-orange-50">
              <h4 className="font-semibold text-lg mb-2">{t('enterprise_plan', 'Enterprise')}</h4>
              <p className="text-3xl font-bold text-orange-600 mb-2">$99</p>
              <p className="text-sm text-gray-600 mb-4">{t('per_month', 'per month')}</p>
              <button
                onClick={handleSubscribe}
                className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors"
              >
                {t('choose_plan', 'Choose Plan')}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p>&copy; 2025 HomeMe. {t('all_rights_reserved', 'All rights reserved.')}</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;