import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';
import ResidentDashboard from './ResidentDashboard';
import Layout from './Layout';

// مكون Dashboard التجريبي
const TrialDashboard = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('welcome_home', 'Welcome home,')}
          </h1>
          <p className="text-gray-600">
            {t('trial_demo_description', 'This is a demo of the HomeMe dashboard. Sign up to access your real compound data.')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-700">{t('family_members', 'Family Members')}</h3>
                <p className="text-3xl font-bold text-blue-600">4</p>
                <p className="text-sm text-gray-500">{t('total_in_family', 'Total in your family')}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👨‍👩‍👧‍👦</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-700">{t('pending_payments', 'Pending Payments')}</h3>
                <p className="text-3xl font-bold text-yellow-600">2</p>
                <p className="text-sm text-gray-500">$150 {t('total', 'total')}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-700">{t('messages', 'Messages')}</h3>
                <p className="text-3xl font-bold text-green-600">5</p>
                <p className="text-sm text-gray-500">{t('this_month', 'This month')}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💬</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-700">{t('notifications', 'Notifications')}</h3>
                <p className="text-3xl font-bold text-purple-600">3</p>
                <p className="text-sm text-gray-500">{t('recent_updates', 'Recent updates')}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔔</span>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h3 className="text-xl font-semibold mb-4">{t('family_management', 'Family Management')}</h3>
            <div className="space-y-3">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm">👨</span>
                </div>
                <div>
                  <p className="font-medium">John Smith</p>
                  <p className="text-sm text-gray-500">{t('family_head', 'Family Head')}</p>
                </div>
              </div>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm">👩</span>
                </div>
                <div>
                  <p className="font-medium">Sarah Smith</p>
                  <p className="text-sm text-gray-500">{t('spouse', 'Spouse')}</p>
                </div>
              </div>
            </div>
            <button className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              {t('manage_family', 'Manage Family')}
            </button>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <h3 className="text-xl font-semibold mb-4">{t('recent_activities', 'Recent Activities')}</h3>
            <div className="space-y-3">
              <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-1">
                  <span className="text-xs">✓</span>
                </div>
                <div>
                  <p className="font-medium">{t('maintenance_completed', 'Maintenance Completed')}</p>
                  <p className="text-sm text-gray-500">{t('ac_repair_completed', 'AC repair in living room completed')}</p>
                  <p className="text-xs text-gray-400">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-1">
                  <span className="text-xs">📄</span>
                </div>
                <div>
                  <p className="font-medium">{t('new_invoice', 'New Invoice')}</p>
                  <p className="text-sm text-gray-500">{t('electricity_bill_generated', 'Monthly electricity bill generated')}</p>
                  <p className="text-xs text-gray-400">1 day ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">{t('ready_to_get_started', 'Ready to get started?')}</h3>
          <p className="mb-6 opacity-90">
            {t('trial_cta_description', 'This is just a preview. Sign up to access all features and manage your real compound data.')}
          </p>
          <button 
            onClick={() => window.location.href = '/register'}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            {t('sign_up_now', 'Sign Up Now')}
          </button>
        </div>
      </div>
    </div>
  );
};

const HomePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isTrial, setIsTrial] = useState(false);
  const [currency, setCurrency] = useState('USD'); // USD or EGP
  const [isYearly, setIsYearly] = useState(false);

  const startTrial = () => {
    setIsTrial(true);
  };

  const handleSubscribe = () => {
    navigate('/register');
  };

  const formatPrice = (usdPrice) => {
    if (currency === 'EGP') {
      const egpPrice = usdPrice * 50; // تحويل تقريبي للجنيه المصري
      return `${egpPrice} ج.م`;
    }
    return `$${usdPrice}`;
  };

  const getDiscountedPrice = (price) => {
    return isYearly ? Math.round(price * 0.9) : price; // خصم 10% للسنة
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
          <TrialDashboard />
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

        {/* Free Trial Section - Separate from pricing */}
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-8 text-center">
          <h3 className="text-2xl font-bold text-green-800 mb-2">{t('try_free_demo', 'Try Free Demo')}</h3>
          <p className="text-green-700 mb-4">
            {t('demo_description', 'Experience all features with our interactive demo - no signup required!')}
          </p>
          <button
            onClick={startTrial}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            {t('start_demo_now', 'Start Demo Now')} ✨
          </button>
        </div>

        {/* Pricing Plans */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold mb-4">{t('choose_your_plan', 'Choose Your Plan')}</h3>
            <p className="text-gray-600 mb-6">
              {t('pricing_intro', 'Choose a subscription plan that fits your compound size.')}
            </p>

            {/* Currency and Billing Toggle */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
              {/* Currency Selector */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    currency === 'USD' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🇺🇸 USD
                </button>
                <button
                  onClick={() => setCurrency('EGP')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    currency === 'EGP' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🇪🇬 EGP
                </button>
              </div>

              {/* Billing Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setIsYearly(false)}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    !isYearly 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('monthly', 'Monthly')}
                </button>
                <button
                  onClick={() => setIsYearly(true)}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    isYearly 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {t('yearly', 'Yearly')} 
                  <span className="ml-1 bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs">
                    {t('save_10', '10% OFF')}
                  </span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 max-w-full overflow-x-auto">
            {/* Free Plan */}
            <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
              <h4 className="font-semibold text-lg mb-2">{t('free_plan', 'Free Plan')}</h4>
              <p className="text-3xl font-bold text-green-600 mb-2">{t('free', 'Free')}</p>
              <p className="text-sm text-gray-600 mb-4">{t('forever', 'Forever')}</p>
              <ul className="text-xs text-gray-600 mb-4 space-y-1">
                <li>• {t('up_to_5_units', 'Up to 5 units')}</li>
                <li>• {t('basic_features', 'Basic features')}</li>
              </ul>
              <button
                onClick={handleSubscribe}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
              >
                {t('get_started', 'Get Started')}
              </button>
            </div>

            {/* Basic Plan */}
            <div className="border-2 border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-lg mb-2">{t('basic_plan', 'Basic Plan')}</h4>
              <p className="text-3xl font-bold text-blue-600 mb-2">
                {formatPrice(getDiscountedPrice(20))}
                {isYearly && <span className="text-sm line-through text-gray-400 ml-1">{formatPrice(20)}</span>}
              </p>
              <p className="text-sm text-gray-600 mb-4">{t('per_month', 'per month')}</p>
              <ul className="text-xs text-gray-600 mb-4 space-y-1">
                <li>• {t('up_to_50_units', 'Up to 50 units')}</li>
                <li>• {t('standard_features', 'Standard features')}</li>
              </ul>
              <button
                onClick={handleSubscribe}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                {t('choose_plan', 'Choose Plan')}
              </button>
            </div>

            {/* Silver Plan */}
            <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold text-lg mb-2">{t('silver_plan', 'Silver Plan')}</h4>
              <p className="text-3xl font-bold text-gray-600 mb-2">
                {formatPrice(getDiscountedPrice(45))}
                {isYearly && <span className="text-sm line-through text-gray-400 ml-1">{formatPrice(45)}</span>}
              </p>
              <p className="text-sm text-gray-600 mb-4">{t('per_month', 'per month')}</p>
              <ul className="text-xs text-gray-600 mb-4 space-y-1">
                <li>• {t('51_to_100_units', '51-100 units')}</li>
                <li>• {t('enhanced_features', 'Enhanced features')}</li>
              </ul>
              <button
                onClick={handleSubscribe}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
              >
                {t('choose_plan', 'Choose Plan')}
              </button>
            </div>

            {/* Gold Plan */}
            <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
              <h4 className="font-semibold text-lg mb-2">{t('gold_plan', 'Gold Plan')}</h4>
              <p className="text-3xl font-bold text-yellow-600 mb-2">
                {formatPrice(getDiscountedPrice(90))}
                {isYearly && <span className="text-sm line-through text-gray-400 ml-1">{formatPrice(90)}</span>}
              </p>
              <p className="text-sm text-gray-600 mb-4">{t('per_month', 'per month')}</p>
              <ul className="text-xs text-gray-600 mb-4 space-y-1">
                <li>• {t('101_to_200_units', '101-200 units')}</li>
                <li>• {t('advanced_features', 'Advanced features')}</li>
              </ul>
              <button
                onClick={handleSubscribe}
                className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700 transition-colors"
              >
                {t('choose_plan', 'Choose Plan')}
              </button>
            </div>

            {/* Platinum Plan */}
            <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50">
              <h4 className="font-semibold text-lg mb-2">{t('platinum_plan', 'Platinum Plan')}</h4>
              <p className="text-3xl font-bold text-purple-600 mb-2">
                {formatPrice(getDiscountedPrice(199))}
                {isYearly && <span className="text-sm line-through text-gray-400 ml-1">{formatPrice(199)}</span>}
              </p>
              <p className="text-sm text-gray-600 mb-4">{t('per_month', 'per month')}</p>
              <ul className="text-xs text-gray-600 mb-4 space-y-1">
                <li>• {t('201_to_500_units', '201-500 units')}</li>
                <li>• {t('premium_features', 'Premium features')}</li>
              </ul>
              <button
                onClick={handleSubscribe}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
              >
                {t('choose_plan', 'Choose Plan')}
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
              <h4 className="font-semibold text-lg mb-2">{t('enterprise_plan', 'Enterprise')}</h4>
              <p className="text-3xl font-bold text-orange-600 mb-2">
                {formatPrice(getDiscountedPrice(299))}
                {isYearly && <span className="text-sm line-through text-gray-400 ml-1">{formatPrice(299)}</span>}
              </p>
              <p className="text-sm text-gray-600 mb-4">{t('per_month', 'per month')}</p>
              <ul className="text-xs text-gray-600 mb-4 space-y-1">
                <li>• {t('501_plus_units', '501+ units')}</li>
                <li>• {t('enterprise_features', 'Enterprise features')}</li>
              </ul>
              <button
                onClick={handleSubscribe}
                className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors"
              >
                {t('choose_plan', 'Choose Plan')}
              </button>
            </div>

            {/* Community Plan - Most Popular */}
            <div className="border-2 border-indigo-300 rounded-lg p-4 bg-gradient-to-b from-indigo-50 to-blue-50 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                  {t('most_popular', 'Most Popular')}
                </span>
              </div>
              <h4 className="font-semibold text-lg mb-2">{t('community_plan', 'Community')}</h4>
              <p className="text-2xl font-bold text-indigo-600 mb-2">
                {formatPrice(getDiscountedPrice(0.25))} {t('per_person', 'per person')}
                {isYearly && <span className="text-sm line-through text-gray-400 ml-1">{formatPrice(0.25)}</span>}
              </p>
              <p className="text-sm text-gray-600 mb-4">{t('per_month', 'per month')}</p>
              <ul className="text-xs text-gray-600 mb-4 space-y-1">
                <li>• {t('unlimited_units', 'Unlimited units')}</li>
                <li>• {t('multiple_compounds', 'Multiple compounds')}</li>
                <li>• {t('community_management', 'Community management')}</li>
                <li>• {t('priority_support', 'Priority support')}</li>
              </ul>
              <button
                onClick={handleSubscribe}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
              >
                {t('choose_plan', 'Choose Plan')}
              </button>
            </div>
          </div>

          {isYearly && (
            <div className="mt-6 text-center">
              <p className="text-sm text-green-600 font-medium">
                ✨ {t('yearly_discount_note', 'Save 10% on your first year with yearly billing!')}
              </p>
            </div>
          )}
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