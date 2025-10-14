import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';
import ResidentDashboard from './ResidentDashboard';
import Layout from './Layout';

// مكون Dashboard التجريبي
const TrialDashboard = ({ exitTrial }) => {
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => window.location.href = '/register'}
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              {t('sign_up_now', 'Sign Up Now')}
            </button>
            <button 
              onClick={exitTrial}
              className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors flex items-center justify-center gap-3"
            >
              {t('back_to_homepage', 'Back to Homepage')}
              <span className="text-2xl font-bold">↩</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const HomePage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isTrial, setIsTrial] = useState(false);
  const [currency, setCurrency] = useState('USD'); // USD or EGP
  const [isYearly, setIsYearly] = useState(false);

  const startTrial = () => {
    setIsTrial(true);
  };

  const exitTrial = () => {
    setIsTrial(false);
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
              <button
                onClick={exitTrial}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-md"
              >
                <span className="text-lg font-bold">⬅</span>
                {t('back_to_homepage', 'Back to Homepage')}
              </button>
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
          <TrialDashboard exitTrial={exitTrial} />
        </div>
      </div>
    );
  }

  // الصفحة الرئيسية
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-xl">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6 rtl:space-x-reverse rtl:space-x-6">
              <img
                src="https://customer-assets.emergentagent.com/job_homeme-subscriptions/artifacts/6yk66f7n_WhatsApp%20Image%202022-01-17%20at%2010.23.44%20AM.637bf42d664818.47361218.jpeg"
                alt="HomeMe"
                className="h-32 w-auto shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300"
              />
              <h1 className={`text-5xl font-bold ${
                i18n.language === 'ar' 
                  ? 'luxury-arabic-brand text-right' 
                  : 'luxury-english-brand'
              }`}>
                {t('homeme_brand', 'HomeMe')}
              </h1>
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

        {/* Our Services Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-gray-900 mb-3">{t('our_services', 'Our Services')}</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {t('services_intro', 'Everything you need to manage your residential compound efficiently')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Family Management */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('service_family_management', 'Family Management')}</h4>
              <p className="text-sm text-gray-600">{t('service_family_management_desc', 'Manage family members, relationships, and profiles')}</p>
            </div>

            {/* Guest Management */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('service_guest_management', 'Guest Management')}</h4>
              <p className="text-sm text-gray-600">{t('service_guest_management_desc', 'Control visitor access and track guest requests')}</p>
            </div>

            {/* Service Booking */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('service_booking', 'Service Booking')}</h4>
              <p className="text-sm text-gray-600">{t('service_booking_desc', 'Book maintenance and community services easily')}</p>
            </div>

            {/* Utility Bills */}
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('service_utility_bills', 'Utility Bills')}</h4>
              <p className="text-sm text-gray-600">{t('service_utility_bills_desc', 'Manage and pay all utility bills in one place')}</p>
            </div>

            {/* Document Management */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('service_document_management', 'Document Management')}</h4>
              <p className="text-sm text-gray-600">{t('service_document_management_desc', 'Store and organize all compound documents')}</p>
            </div>

            {/* Messaging */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('service_messaging', 'Messages & Notifications')}</h4>
              <p className="text-sm text-gray-600">{t('service_messaging_desc', 'Real-time communication with residents and management')}</p>
            </div>

            {/* Analytics */}
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('service_analytics', 'Reports & Analytics')}</h4>
              <p className="text-sm text-gray-600">{t('service_analytics_desc', 'Detailed insights and performance reports')}</p>
            </div>

            {/* Maintenance */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('service_maintenance', 'Maintenance Management')}</h4>
              <p className="text-sm text-gray-600">{t('service_maintenance_desc', 'Track and manage all maintenance requests')}</p>
            </div>
          </div>
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
          
          <div className="max-w-7xl mx-auto px-4">
            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              
              {/* Community Plan - Free */}
              <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('community_plan', 'Community')}</h3>
                  <p className="text-sm text-gray-500 mb-4">{t('for_small_compounds', 'للمجمعات الصغيرة')}</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-green-600">{t('free', '$0')}</span>
                    <span className="text-gray-500">/{t('month', 'mo')}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('up_to_5_residents', 'حتى 5 مقيمين')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('service_family_management', 'إدارة العائلات')} (محدودة)</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('service_booking', 'حجز الخدمات')} (2 حجز/شخص)</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('storage_500mb', 'مساحة 500 ميجا')}</span>
                  </li>
                </ul>
                <button
                  onClick={handleSubscribe}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {t('get_started', 'ابدأ مجاناً')}
                </button>
              </div>

              {/* Basic Plan */}
              <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('basic_plan', 'الأساسية')}</h3>
                  <p className="text-sm text-gray-500 mb-4">{t('for_growing_compounds', 'للمجمعات النامية')}</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-blue-600">{formatPrice(getDiscountedPrice(12))}</span>
                    <span className="text-gray-500">/{t('month', 'mo')}</span>
                  </div>
                  {isYearly && (
                    <p className="text-sm text-green-600">{t('save_10', 'وفر 10%')}</p>
                  )}
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('up_to_100_residents', 'حتى 100 مقيم')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('service_family_management', 'إدارة العائلات')} + {t('service_guest_management', 'إدارة الضيوف')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('service_booking', 'حجز الخدمات')} + {t('service_document_management', 'إدارة المستندات')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('storage_5gb', 'مساحة تخزين 5 جيجابايت')}</span>
                  </li>
                </ul>
                <button
                  onClick={handleSubscribe}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {t('choose_plan', 'اختر الخطة')}
                </button>
              </div>

              {/* Professional Plan */}
              <div className="relative bg-white rounded-xl shadow-lg p-8 flex flex-col border-2 border-purple-400">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-semibold z-10">
                  {t('most_popular', 'الأكثر شيوعاً')}
                </div>
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('professional_plan', 'المحترف')}</h3>
                  <p className="text-sm text-gray-500 mb-4">{t('for_medium_compounds', 'للمجمعات المتوسطة')}</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-purple-600">{formatPrice(getDiscountedPrice(40))}</span>
                    <span className="text-gray-500">/{t('month', 'mo')}</span>
                  </div>
                  {isYearly && (
                    <p className="text-sm text-green-600">{t('save_10', 'وفر 10%')}</p>
                  )}
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-purple-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('up_to_500_residents', 'حتى 500 مقيم')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-purple-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('service_utility_bills', 'فواتير المرافق')} + {t('service_messaging', 'الرسائل والإشعارات')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-purple-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('service_maintenance', 'إدارة الصيانة')} + {t('service_analytics', 'التقارير والتحليلات')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-purple-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('storage_50gb', 'مساحة تخزين 50 جيجابايت')}</span>
                  </li>
                </ul>
                <button
                  onClick={handleSubscribe}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {t('choose_plan', 'اختر الخطة')}
                </button>
              </div>

              {/* Enterprise Plan */}
              <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('enterprise_plan', 'المؤسسة')}</h3>
                  <p className="text-sm text-gray-500 mb-4">{t('for_large_compounds', 'للمؤسسات الكبيرة')}</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-orange-600">{formatPrice(getDiscountedPrice(70))}</span>
                    <span className="text-gray-500">/{t('month', 'mo')}</span>
                  </div>
                  {isYearly && (
                    <p className="text-sm text-green-600">{t('save_10', 'وفر 10%')}</p>
                  )}
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-orange-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('unlimited_residents', 'مقيمين غير محدودين')}</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-orange-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('unlimited_storage', 'مساحة تخزين غير محدودة')} + جميع الخدمات</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-orange-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('dedicated_support', 'دعم مخصص')} 24/7</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-orange-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('full_api_access', 'وصول كامل لواجهة برمجة التطبيقات')}</span>
                  </li>
                </ul>
                <button
                  onClick={handleSubscribe}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {t('choose_plan', 'اختر الخطة')}
                </button>
              </div>

              {/* Multi-Compound Plan */}
              <div className="relative bg-white rounded-xl shadow-lg p-8 flex flex-col border-2 border-indigo-500">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-semibold z-10">
                  {t('unlimited', 'غير محدود')}
                </div>
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('multi_compound_plan', 'مجتمعات سكنية')}</h3>
                  <p className="text-sm text-gray-500 mb-4">{t('for_multiple_locations', 'لأكثر من مجمع في مواقع متعددة')}</p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-indigo-600">{formatPrice(getDiscountedPrice(0.25))}</span>
                    <span className="text-gray-500 text-sm">/{t('person_month', 'شخص/شهر')}</span>
                  </div>
                  {isYearly && (
                    <p className="text-sm text-green-600">{t('save_10', 'وفر 10%')}</p>
                  )}
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-indigo-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('unlimited_compounds', 'مجمعات غير محدودة')} في مواقع مختلفة</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-indigo-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('pay_per_person', 'ادفع لكل شخص فقط')} - تسعير مرن</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-indigo-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">{t('centralized_management', 'إدارة مركزية')} لجميع المجمعات</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-indigo-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-600 text-sm">جميع الخدمات + {t('service_analytics', 'تقارير متقدمة')}</span>
                  </li>
                </ul>
                <button
                  onClick={handleSubscribe}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  {t('choose_plan', 'اختر الخطة')}
                </button>
              </div>

            </div>
          </div>

          {isYearly && (
            <div className="mt-6 text-center">
              <p className="text-sm text-green-600 font-medium">
                ✨ {t('yearly_discount_note', 'Save 10% on your first year with yearly billing!')}
              </p>
            </div>
          )}

          {/* Services Comparison Table */}
          <div className="mt-16 bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
              {t('services_comparison', 'مقارنة الخدمات حسب الخطة')}
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-right py-4 px-4 font-semibold text-gray-900">{t('service', 'الخدمة')}</th>
                    <th className="text-center py-4 px-2 font-semibold text-green-600">Community</th>
                    <th className="text-center py-4 px-2 font-semibold text-blue-600">Basic</th>
                    <th className="text-center py-4 px-2 font-semibold text-purple-600">Professional</th>
                    <th className="text-center py-4 px-2 font-semibold text-orange-600">Enterprise</th>
                    <th className="text-center py-4 px-2 font-semibold text-indigo-600">{t('multi_compound', 'مجتمعات')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{t('service_family_management', 'إدارة العائلات')}</td>
                    <td className="text-center py-3 px-2">
                      <span className="text-yellow-500">⚠️ محدودة</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{t('service_guest_management', 'إدارة الضيوف')}</td>
                    <td className="text-center py-3 px-2">
                      <span className="text-red-500 text-xl">✗</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{t('service_booking', 'حجز الخدمات')}</td>
                    <td className="text-center py-3 px-2">
                      <span className="text-yellow-500">2 حجز</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{t('service_utility_bills', 'فواتير المرافق')}</td>
                    <td className="text-center py-3 px-2">
                      <span className="text-red-500 text-xl">✗</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-red-500 text-xl">✗</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{t('service_document_management', 'إدارة المستندات')}</td>
                    <td className="text-center py-3 px-2">
                      <span className="text-yellow-500">500MB</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-yellow-500">5GB</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-yellow-500">50GB</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">∞</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">∞</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{t('service_messaging', 'الرسائل والإشعارات')}</td>
                    <td className="text-center py-3 px-2">
                      <span className="text-red-500 text-xl">✗</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-red-500 text-xl">✗</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{t('service_analytics', 'التقارير والتحليلات')}</td>
                    <td className="text-center py-3 px-2">
                      <span className="text-red-500 text-xl">✗</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-red-500 text-xl">✗</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓ متقدمة</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{t('service_maintenance', 'إدارة الصيانة')}</td>
                    <td className="text-center py-3 px-2">
                      <span className="text-red-500 text-xl">✗</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-red-500 text-xl">✗</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-green-500 text-xl">✓</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 bg-indigo-50">
                    <td className="py-3 px-4 text-gray-900 font-semibold">{t('multiple_compounds_support', 'دعم المجمعات المتعددة')}</td>
                    <td className="text-center py-3 px-2">
                      <span className="text-red-500 text-xl">✗</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-red-500 text-xl">✗</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-red-500 text-xl">✗</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-red-500 text-xl">✗</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-indigo-600 text-xl font-bold">✓ غير محدود</span>
                    </td>
                  </tr>
                </tbody>
              </table>
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