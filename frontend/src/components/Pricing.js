import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import useSEO from '../hooks/useSEO';
import CustomerTestimonialsCarousel from './CustomerTestimonialsCarousel';
import {
  CheckIcon, 
  XMarkIcon,
  SparklesIcon,
  TrophyIcon,
  BuildingOfficeIcon,
  GiftIcon,
  UserGroupIcon,
  ClockIcon,
  TagIcon,
  UserIcon,
  PlusIcon,
  ArrowLeftIcon,
  TicketIcon
} from '@heroicons/react/24/outline';

const API = process.env.REACT_APP_BACKEND_URL;

const Pricing = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // 🔍 SEO — pricing page targets high-intent users searching for plans/cost
  useSEO({
    title: 'الخطط والأسعار — HomeMe | إدارة كمبوند بسعر يناسبك',
    description:
      'خطط HomeMe لإدارة المجمعات السكنية: مجاني (0 ج.م)، أساسي (1,200 ج.م)، احترافي (2,200 ج.م)، متقدم (4,000 ج.م)، وخطط شركات الإدارة. خصم 20% على الدفع السنوي. تجربة مجانية 14 يوماً.',
    canonical: 'https://homemeapp.net/pricing',
    keywords:
      'أسعار إدارة كمبوند, تكلفة نظام كمبوند, خطط كمبوند, اشتراك كمبوند, pricing compound, HomeMe pricing, خصم سنوي',
    og: {
      title: 'الخطط والأسعار — HomeMe',
      description: 'اختر خطة إدارة المجمع السكني المناسبة لك بدءاً من 0 ج.م — مع خصم 20% على الدفع السنوي.',
      type: 'website',
      url: 'https://homemeapp.net/pricing',
      image: 'https://homemeapp.net/og-cover.png',
      locale: 'ar_EG',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'الخطط والأسعار — HomeMe',
      description: 'خطط مرنة من مجاني لـ Enterprise. خصم 20% سنوي.',
      image: 'https://homemeapp.net/og-cover.png',
    },
  });
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [currency, setCurrency] = useState('USD');
  const [showDiscountCode, setShowDiscountCode] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  
  // Subscription Code states
  const [showSubscriptionCode, setShowSubscriptionCode] = useState(false);
  const [subscriptionCode, setSubscriptionCode] = useState('');
  const [verifiedCode, setVerifiedCode] = useState(null);
  const [verifyingCode, setVerifyingCode] = useState(false);

  // Format price based on currency
  const formatPrice = (usdPrice) => {
    if (currency === 'EGP') {
      const egpPrice = usdPrice * 50; // Approximate conversion to Egyptian Pound
      return `${egpPrice.toFixed(0)} ج.م`;
    }
    return `$${usdPrice}`;
  };

  // Get discounted price (10% off for yearly)
  const getDiscountedPrice = (price) => {
    return billingPeriod === 'yearly' ? Math.round(price * 0.9) : price;
  };

  // Get yearly total
  const getYearlyTotal = (monthlyPrice) => {
    const discountedMonthly = getDiscountedPrice(monthlyPrice);
    return discountedMonthly * 12;
  };

  // Get original yearly total (before discount)
  const getOriginalYearlyTotal = (monthlyPrice) => {
    return monthlyPrice * 12;
  };

  // Get savings amount
  const getSavings = (monthlyPrice) => {
    return getOriginalYearlyTotal(monthlyPrice) - getYearlyTotal(monthlyPrice);
  };

  const plans = [
    {
      id: 'community',
      name: t('community_plan'),
      subtitle: t('perfect_small_communities'),
      price: { monthly: 0, yearly: 0 },
      originalPrice: null,
      icon: UserGroupIcon,
      gradient: 'from-gray-400 to-gray-600',
      popular: false,
      features: {
        residents: t('residents_5'),
        services: t('services_2_max'),
        chat: t('basic_chat_messaging'),
        family: t('family_management_photos'),
        storage: t('storage_500mb'),
        mobile: t('mobile_app_access'),
        support: t('community_support'),
        supportChat: 'شات دعم فني مباشر',
        unitListings: 'إعلانات الوحدات داخل الكمبوند',
        branding: false,
        analytics: false,
        api: false,
        multiCompound: false,
        whiteLabel: false,
        customDev: false
      },
      limitations: [
        'Limited to 5 residents',
        'Only 2 services allowed',
        'Basic support only'
      ]
    },
    {
      id: 'essential',
      name: t('essential_plan'),
      subtitle: t('great_growing_communities'),
      price: { monthly: 12, yearly: 120 },
      originalPrice: { monthly: 12, yearly: 144 },
      icon: SparklesIcon,
      gradient: 'from-blue-500 to-cyan-600',
      popular: true,
      features: {
        residents: t('residents_100'),
        services: t('unlimited_services'),
        chat: t('advanced_chat_messaging'),
        family: t('family_management_photos'),
        storage: t('storage_5gb'),
        mobile: t('mobile_app_access'),
        support: t('priority_support'),
        supportChat: 'شات دعم + صندوق تحكم للأدمن',
        unitListings: 'إعلانات الوحدات مع موافقة الأدمن',
        aiAssistant: '✨ مساعد AI — 20 رسالة/يوم',
        branding: t('custom_branding'),
        analytics: t('advanced_reporting'),
        api: false,
        multiCompound: false,
        whiteLabel: false,
        customDev: false
      },
      limitations: []
    },
    {
      id: 'professional',
      name: t('professional_plan'),
      subtitle: t('multiple_communities'),
      price: { monthly: 40, yearly: 400 },
      originalPrice: { monthly: 40, yearly: 480 },
      icon: TrophyIcon,
      gradient: 'from-purple-500 to-indigo-600',
      popular: false,
      features: {
        residents: t('residents_500'),
        services: t('unlimited_services'),
        chat: t('advanced_chat_messaging'),
        family: t('family_management_photos'),
        storage: t('storage_50gb'),
        mobile: t('mobile_app_access'),
        support: t('priority_support'),
        branding: t('custom_branding'),
        analytics: t('advanced_analytics'),
        api: t('api_access'),
        multiCompound: t('multi_compound_management'),
        whiteLabel: t('white_label_options'),
        customDev: false
      },
      limitations: []
    },
    {
      id: 'enterprise',
      name: t('enterprise_plan'),
      subtitle: t('large_organizations'),
      price: { monthly: 70, yearly: 700 },
      originalPrice: { monthly: 70, yearly: 840 },
      icon: BuildingOfficeIcon,
      gradient: 'from-emerald-500 to-teal-600',
      popular: false,
      features: {
        residents: t('unlimited_residents'),
        services: t('unlimited_services'),
        chat: t('advanced_chat_messaging'),
        family: t('family_management_photos'),
        storage: t('unlimited_storage'),
        mobile: t('mobile_app_access'),
        support: t('dedicated_support'),
        branding: t('custom_branding'),
        analytics: t('advanced_analytics'),
        api: t('full_api_access'),
        multiCompound: t('multiple_compounds'),
        whiteLabel: t('white_label_options'),
        customDev: t('custom_development')
      },
      limitations: []
    },
    {
      id: 'multi_compound',
      name: t('multi_compound_plan'),
      subtitle: t('for_multiple_locations'),
      price: { monthly: 0.25, yearly: 2.7 },
      originalPrice: { monthly: 0.25, yearly: 3 },
      icon: BuildingOfficeIcon,
      gradient: 'from-indigo-500 to-purple-600',
      popular: false,
      features: {
        residents: t('unlimited_residents'),
        services: t('unlimited_services'),
        chat: t('advanced_chat_messaging'),
        family: t('family_management_photos'),
        storage: t('unlimited_storage'),
        mobile: t('mobile_app_access'),
        support: t('dedicated_support'),
        branding: t('custom_branding'),
        analytics: t('advanced_analytics'),
        api: t('full_api_access'),
        multiCompound: t('unlimited_compounds'),
        whiteLabel: t('white_label_options'),
        customDev: t('custom_development')
      },
      limitations: [],
      perPerson: true
    }
  ];

  const discountOffers = [
    {
      code: 'WELCOME40',
      title: '🎉 Seasonal Welcome',
      description: '40% off first 3 months',
      discount: 40,
      type: 'seasonal'
    },
    {
      code: 'BULK20',
      title: '👥 Bulk Discount',
      description: '20% off for 3+ compounds',
      discount: 20,
      type: 'bulk'
    },
    {
      code: 'STUDENT50',
      title: '🎓 Student/Nonprofit',
      description: '50% permanent discount',
      discount: 50,
      type: 'permanent'
    },
    {
      code: 'ANNUAL',
      title: '🔄 Annual Savings',
      description: '2 months free on yearly plans',
      discount: 17,
      type: 'annual'
    }
  ];

  const applyDiscountCode = () => {
    const discount = discountOffers.find(d => d.code === discountCode.toUpperCase());
    if (discount) {
      setAppliedDiscount(discount);
      toast.success(`${discount.title} applied! ${discount.description}`);
    } else {
      toast.error('Invalid discount code');
    }
  };
  
  // Verify subscription code
  const verifySubscriptionCode = async () => {
    if (!subscriptionCode.trim()) {
      toast.error(t('please_enter_subscription_code'));
      return;
    }
    
    setVerifyingCode(true);
    try {
      const response = await axios.get(`${API}/api/subscription-codes/check/${subscriptionCode.trim().toUpperCase()}`);
      
      if (response.data.valid) {
        setVerifiedCode(response.data);
        toast.success(t('subscription_code_valid'));
      } else {
        toast.error(t(response.data.error || 'invalid_subscription_code'));
        setVerifiedCode(null);
      }
    } catch (error) {
      console.error('Error verifying subscription code:', error);
      toast.error(t('failed_to_verify_code'));
      setVerifiedCode(null);
    } finally {
      setVerifyingCode(false);
    }
  };

  const calculatePrice = (plan) => {
    const basePrice = plan.price[billingPeriod];
    if (appliedDiscount && plan.id !== 'community') {
      return Math.round(basePrice * (1 - appliedDiscount.discount / 100));
    }
    return basePrice;
  };

  const handleSelectPlan = async (planId) => {
    if (planId === 'community') {
      toast.success('Community plan activated! Enjoy your free access.');
      return;
    }
    
    // Navigate to payment or subscription management
    toast.info('Redirecting to secure payment...');
    // Implementation for payment integration would go here
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2 rtl:rotate-180" />
              <span>{t('back_to_menu')}</span>
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-12">
          {/* HomeMe Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="/homeme-logo.png" 
              alt="HomeMe Logo" 
              className="h-24 w-auto"
            />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">
            {t('choose_your_account_type')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto text-center">
            {t('select_plan_best_fits')}
          </p>
          
          {/* Currency and Billing Toggle */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
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
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('monthly', 'شهرياً')}
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  billingPeriod === 'yearly'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('yearly')}
                <span className="ml-1 bg-green-100 text-green-600 px-2 py-0.5 rounded-full text-xs">
                  {t('save_10')}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Discount Section */}
        <div className="mb-8 text-center">
          <button
            onClick={() => setShowDiscountCode(!showDiscountCode)}
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            <GiftIcon className="h-5 w-5" />
            <span>{t('have_discount_code')}</span>
          </button>
          
          {showDiscountCode && (
            <div className="mt-4 max-w-md mx-auto">
              <div className="flex rounded-lg shadow-sm">
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  placeholder={t('enter_discount_code')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={applyDiscountCode}
                  className="px-6 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 font-medium"
                >
                  {t('apply')}
                </button>
              </div>
              
              {/* Discount Offers */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                {discountOffers.map((offer, index) => (
                  <button
                    key={index}
                    onClick={() => setDiscountCode(offer.code)}
                    className="p-2 bg-gray-50 hover:bg-gray-100 rounded border text-left"
                  >
                    <div className="font-medium text-gray-900">{offer.title}</div>
                    <div className="text-gray-600 text-xs">{offer.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {appliedDiscount && (
            <div className="mt-4 inline-flex items-center space-x-2 bg-green-50 text-green-800 px-4 py-2 rounded-lg">
              <CheckIcon className="h-5 w-5" />
              <span>{appliedDiscount.title} - {appliedDiscount.description}</span>
            </div>
          )}
        </div>

        {/* Subscription Code Section */}
        <div className="mb-8 text-center">
          <button
            onClick={() => setShowSubscriptionCode(!showSubscriptionCode)}
            className="inline-flex items-center space-x-2 text-purple-600 hover:text-purple-800 font-medium"
          >
            <TicketIcon className="h-5 w-5" />
            <span>{t('have_subscription_code')}</span>
          </button>
          
          {showSubscriptionCode && (
            <div className="mt-4 max-w-md mx-auto">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-purple-800">
                  {t('subscription_code_pricing_hint')}
                </p>
              </div>
              
              <div className="flex rounded-lg shadow-sm">
                <input
                  type="text"
                  value={subscriptionCode}
                  onChange={(e) => setSubscriptionCode(e.target.value.toUpperCase())}
                  placeholder={t('enter_subscription_code_placeholder')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 uppercase"
                  maxLength={14}
                />
                <button
                  onClick={verifySubscriptionCode}
                  disabled={verifyingCode}
                  className="px-6 py-2 bg-purple-600 text-white rounded-r-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifyingCode ? t('verifying') : t('verify')}
                </button>
              </div>
            </div>
          )}
          
          {verifiedCode && (
            <div className="mt-4 inline-flex flex-col items-center space-y-2 bg-purple-50 text-purple-800 px-6 py-3 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-2">
                <CheckIcon className="h-5 w-5" />
                <span className="font-semibold">{t('valid_subscription_code')}</span>
              </div>
              <div className="text-sm">
                {t('duration')}: {verifiedCode.duration_months} {t('months')}
              </div>
              <div className="text-xs text-purple-600">
                {t('code_will_be_applied_at_registration')}
              </div>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const IconComponent = plan.icon;
            const currentPrice = calculatePrice(plan);
            const originalPrice = plan.price[billingPeriod];
            
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
                  plan.popular ? 'border-blue-500 scale-105' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      {t('most_popular')}
                    </div>
                  </div>
                )}
                
                <div className="p-8">
                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${plan.gradient} flex items-center justify-center`}>
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 text-center">{plan.name}</h3>
                    <p className="text-gray-600 mt-1">{plan.subtitle}</p>
                  </div>
                  
                  {/* Pricing */}
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center mb-2">
                      <span className="text-4xl font-bold text-gray-900">
                        {formatPrice(currentPrice)}
                      </span>
                      {plan.id !== 'community' && !plan.perPerson && (
                        <span className="text-gray-600 ml-2">
                          /{billingPeriod === 'monthly' ? t('month', 'شهر') : t('year', 'سنة')}
                        </span>
                      )}
                      {plan.perPerson && (
                        <span className="text-gray-600 ml-2">
                          /{t('person_month', 'شخص/شهر')}
                        </span>
                      )}
                    </div>
                    
                    {/* Yearly Pricing Details */}
                    {billingPeriod === 'yearly' && plan.id !== 'community' && !plan.perPerson && (
                      <div className="mt-3 text-sm space-y-1">
                        {/* Original Price (Before Discount) */}
                        <div className="text-gray-500 line-through">
                          {t('before_discount')}: {formatPrice(getOriginalYearlyTotal(plan.price.monthly))}
                        </div>
                        {/* Price After Discount */}
                        <div className="text-blue-600 font-semibold">
                          {t('after_discount')}: {formatPrice(getYearlyTotal(plan.price.monthly))} {t('per_year')}
                        </div>
                        {/* Savings Amount */}
                        <div className="text-green-600 font-semibold">
                          {t('you_save')}: {formatPrice(getSavings(plan.price.monthly))} {t('annually')}
                        </div>
                      </div>
                    )}
                    
                    {appliedDiscount && currentPrice !== originalPrice && plan.id !== 'community' && (
                      <div className="text-sm text-gray-500 line-through mt-1">
                        {t('was_price', { price: `${formatPrice(originalPrice)}` })}
                      </div>
                    )}
                  </div>
                  
                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-700">{plan.features.residents}</span>
                    </div>
                    <div className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-700">{plan.features.services}</span>
                    </div>
                    <div className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-700">{plan.features.chat}</span>
                    </div>
                    <div className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-700">{plan.features.family}</span>
                    </div>
                    <div className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-700">{plan.features.storage}</span>
                    </div>
                    <div className="flex items-center">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-700">{plan.features.support}</span>
                    </div>
                    
                    {plan.features.branding && (
                      <div className="flex items-center">
                        <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                        <span className="text-gray-700">{plan.features.branding}</span>
                      </div>
                    )}
                    
                    {plan.features.analytics && (
                      <div className="flex items-center">
                        <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                        <span className="text-gray-700">{plan.features.analytics}</span>
                      </div>
                    )}
                    
                    {plan.features.api && (
                      <div className="flex items-center">
                        <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                        <span className="text-gray-700">{plan.features.api}</span>
                      </div>
                    )}
                    
                    {plan.features.multiCompound && (
                      <div className="flex items-center">
                        <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                        <span className="text-gray-700">{plan.features.multiCompound}</span>
                      </div>
                    )}
                    
                    {plan.features.customDev && (
                      <div className="flex items-center">
                        <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                        <span className="text-gray-700">{plan.features.customDev}</span>
                      </div>
                    )}
                    {plan.features.supportChat && (
                      <div className="flex items-center bg-emerald-50 rounded-lg px-2 py-1">
                        <CheckIcon className="h-5 w-5 text-emerald-600 mr-3 flex-shrink-0" />
                        <span className="text-gray-700 font-medium">💬 {plan.features.supportChat}</span>
                      </div>
                    )}
                    {plan.features.unitListings && (
                      <div className="flex items-center bg-blue-50 rounded-lg px-2 py-1">
                        <CheckIcon className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
                        <span className="text-gray-700 font-medium">🏠 {plan.features.unitListings}</span>
                      </div>
                    )}
                    {plan.features.aiAssistant && (
                      <div className="flex items-center bg-purple-50 rounded-lg px-2 py-1">
                        <CheckIcon className="h-5 w-5 text-purple-600 mr-3 flex-shrink-0" />
                        <span className="text-gray-700 font-medium">{plan.features.aiAssistant}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                      plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                        : plan.id === 'community'
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    {plan.id === 'community' ? t('start_free') : t('choose_plan', { plan: plan.name })}
                  </button>
                  
                  {plan.id === 'community' && (
                    <p className="text-center text-sm text-gray-500 mt-2">
                      {t('no_credit_card_required')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Free User Sharing Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <UserGroupIcon className="h-16 w-16 mx-auto mb-4 text-blue-200" />
            <h2 className="text-3xl font-bold mb-4 text-center">{t('bring_community_together')}</h2>
            <p className="text-xl text-blue-100 mb-6">
              {t('paid_user_invite_20_free')}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white/10 rounded-lg p-4">
                <GiftIcon className="h-8 w-8 mx-auto mb-2 text-blue-200" />
                <h3 className="font-semibold text-center mb-2">{t('free_invitations')}</h3>
                <p className="text-sm text-blue-100">{t('invite_up_to_20_residents')}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <CheckIcon className="h-8 w-8 mx-auto mb-2 text-blue-200" />
                <h3 className="font-semibold text-center mb-2">{t('full_access')}</h3>
                <p className="text-sm text-blue-100">{t('free_users_get_all_features')}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <UserGroupIcon className="h-8 w-8 mx-auto mb-2 text-blue-200" />
                <h3 className="font-semibold text-center mb-2">{t('no_limits')}</h3>
                <p className="text-sm text-blue-100">{t('build_community_no_barriers')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Services Comparison Table */}
        <div className="mt-16 bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            {t('services_comparison', 'مقارنة الخدمات حسب الخطة')}
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 w-1/4">{t('service', 'الخدمة')}</th>
                  <th className="text-center py-4 px-2 font-semibold text-green-600">{t('community_plan', 'المجتمع')}</th>
                  <th className="text-center py-4 px-2 font-semibold text-blue-600">{t('essential_plan', 'الأساسية')}</th>
                  <th className="text-center py-4 px-2 font-semibold text-purple-600">{t('professional_plan', 'المحترف')}</th>
                  <th className="text-center py-4 px-2 font-semibold text-orange-600">{t('enterprise_plan', 'المؤسسة')}</th>
                  <th className="text-center py-4 px-2 font-semibold text-indigo-600">{t('multi_compound_plan', 'المجمعات المتعددة')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700 font-medium">{t('service_family_management', 'إدارة العائلات')}</td>
                  <td className="text-center py-3 px-2">
                    <span className="text-xs text-yellow-600 font-semibold">{t('limited', 'محدودة')}</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700 font-medium">{t('service_guest_management', 'إدارة الضيوف')}</td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700 font-medium">{t('service_booking', 'حجز الخدمات')}</td>
                  <td className="text-center py-3 px-2">
                    <span className="text-xs text-yellow-600 font-semibold">{t('bookings_2', '2 حجز')}</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700 font-medium">{t('service_utility_bills', 'فواتير المرافق')}</td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700 font-medium">{t('service_document_management', 'إدارة المستندات')}</td>
                  <td className="text-center py-3 px-2">
                    <span className="text-xs text-blue-600 font-semibold">500MB</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-xs text-blue-600 font-semibold">5GB</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-xs text-blue-600 font-semibold">50GB</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">∞</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">∞</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700 font-medium">{t('service_messaging', 'الرسائل والإشعارات')}</td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700 font-medium">{t('service_analytics', 'التقارير والتحليلات')}</td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-700 font-medium">{t('service_maintenance', 'إدارة الصيانة')}</td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-red-500 text-2xl">✗</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="text-green-500 text-2xl">✓</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">{t('frequently_asked_questions')}</h2>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div>
              <h3 className="font-semibold text-center text-gray-900 text-center mb-2">{t('can_upgrade_downgrade_anytime')}</h3>
              <p className="text-gray-600">{t('upgrade_downgrade_answer')}</p>
            </div>
            <div>
              <h3 className="font-semibold text-center text-gray-900 text-center mb-2">{t('is_there_setup_fee')}</h3>
              <p className="text-gray-600">{t('setup_fee_answer')}</p>
            </div>
            <div>
              <h3 className="font-semibold text-center text-gray-900 text-center mb-2">{t('how_free_invitations_work')}</h3>
              <p className="text-gray-600">{t('free_invitations_answer')}</p>
            </div>
          </div>
        </div>

        {/* Payment Methods Section */}
        <div className="mt-16 mb-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('what_payment_methods_accept')}</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">{t('payment_methods_subtitle')}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {/* Cash */}
            <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-green-300 cursor-pointer">
              <div className="payment-icon w-16 h-16 bg-gradient-to-br from-green-50 to-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💵</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-center mb-2">{t('cash_payment')}</h3>
              <p className="text-sm text-gray-500 text-center">{t('cash_payment_desc')}</p>
            </div>

            {/* Credit/Debit Card */}
            <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-blue-300 cursor-pointer">
              <div className="payment-icon w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💳</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-center mb-2">{t('card_payment')}</h3>
              <p className="text-sm text-gray-500 text-center">{t('card_payment_desc')}</p>
            </div>

            {/* Bank Transfer */}
            <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-purple-300 cursor-pointer">
              <div className="payment-icon w-16 h-16 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🏦</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-center mb-2">{t('bank_transfer')}</h3>
              <p className="text-sm text-gray-500 text-center">{t('bank_transfer_desc')}</p>
            </div>

            {/* InstaPay */}
            <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-yellow-300 cursor-pointer">
              <div className="payment-icon w-16 h-16 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚡</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-center mb-2">{t('instapay')}</h3>
              <p className="text-sm text-gray-500 text-center">{t('instapay_desc')}</p>
            </div>

            {/* Mobile Payment */}
            <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-pink-300 cursor-pointer">
              <div className="payment-icon w-16 h-16 bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📱</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-center mb-2">{t('mobile_payment')}</h3>
              <p className="text-sm text-gray-500 text-center">{t('mobile_payment_desc')}</p>
            </div>

            {/* Digital Wallet */}
            <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-indigo-300 cursor-pointer">
              <div className="payment-icon w-16 h-16 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👛</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-center mb-2">{t('digital_wallet')}</h3>
              <p className="text-sm text-gray-500 text-center">{t('digital_wallet_desc')}</p>
            </div>

            {/* QR Code */}
            <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border-2 border-gray-100 hover:border-teal-300 cursor-pointer">
              <div className="payment-icon w-16 h-16 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-center mb-2">{t('qr_payment')}</h3>
              <p className="text-sm text-gray-500 text-center">{t('qr_payment_desc')}</p>
            </div>

            {/* PayPal */}
            <div className="payment-card bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1">
              <div className="payment-icon w-16 h-16 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🌐</span>
              </div>
              <h3 className="font-semibold text-gray-900 text-center mb-2">{t('paypal')}</h3>
              <p className="text-sm text-gray-500 text-center">{t('paypal_desc')}</p>
            </div>
          </div>

          {/* Security Badge */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center space-x-2 bg-green-50 text-green-700 px-6 py-3 rounded-full border border-green-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="font-medium">{t('secure_payment_guarantee')}</span>
            </div>
          </div>

          {/* 📊 Side-by-Side Comparison Table */}
          <div className="mt-16 max-w-6xl mx-auto" data-testid="pricing-comparison-section">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>
                {t('plan_comparison_title', 'مقارنة تفصيلية بين الخطط')}
              </h2>
              <p className="text-gray-500 text-sm">
                {t('plan_comparison_subtitle', 'كل شيء تحتاجين معرفته قبل الاختيار')}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm" data-testid="pricing-comparison-table">
                <thead className="bg-gradient-to-r from-purple-50 to-fuchsia-50">
                  <tr>
                    <th className="px-4 py-3 text-start font-bold text-gray-700 sticky right-0 bg-gradient-to-r from-purple-50 to-fuchsia-50">
                      {t('feature', 'الميزة')}
                    </th>
                    <th className="px-4 py-3 text-center font-bold text-gray-700">{t('free_plan', 'مجاني')}</th>
                    <th className="px-4 py-3 text-center font-bold text-blue-700">{t('basic_plan', 'أساسي')}</th>
                    <th className="px-4 py-3 text-center font-bold text-purple-700 bg-purple-100/50">{t('pro_plan', 'احترافي')} <span className="block text-[10px] font-normal text-purple-600">⭐ الأكثر شيوعاً</span></th>
                    <th className="px-4 py-3 text-center font-bold text-fuchsia-700">{t('premium_plan', 'متقدم')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    { f: 'عدد الوحدات',            v: ['20', '100', '500', '∞'] },
                    { f: 'إدارة السكان والعائلات',  v: ['✓', '✓', '✓', '✓'] },
                    { f: 'الفواتير والمدفوعات',     v: ['✓', '✓', '✓', '✓'] },
                    { f: 'طلبات الصيانة',          v: ['10/شهر', '50/شهر', '∞', '∞'] },
                    { f: 'الإعلانات والتواصل',     v: ['—', '✓', '✓', '✓'] },
                    { f: 'الزوار + QR Code',       v: ['—', '✓', '✓', '✓'] },
                    { f: 'تقارير PDF',             v: ['—', 'أساسية', 'متقدمة', 'مخصصة'] },
                    { f: 'استيراد سكان CSV',        v: ['—', '✓', '✓', '✓'] },
                    { f: 'مدفوعات أونلاين (Stripe)', v: ['—', '—', '✓', '✓'] },
                    { f: 'مساعد AI + Auto-Pilot',  v: ['—', '—', '✓', '✓'] },
                    { f: 'خريطة الكمبوند التفاعلية', v: ['—', '—', '✓', '✓'] },
                    { f: 'تقرير أسبوعي تلقائي',     v: ['—', '—', '✓', '✓'] },
                    { f: 'فريق المساعدين',          v: ['—', '—', '3', '∞'] },
                    { f: 'الإعلانات التجارية (دخل)', v: ['—', '—', '—', '✓'] },
                    { f: 'الدعم الفني',             v: ['بريد', 'بريد', 'بريد + شات', 'مخصص 24/7'] },
                    { f: '💬 شات الدعم المباشر',     v: ['—', '✓', '✓', '✓'], highlight: true },
                    { f: '🏠 إعلانات الوحدات (بيع/إيجار)', v: ['—', '✓', '✓', '✓'], highlight: true },
                    { f: '✨ مساعد AI (Claude)',      v: ['—', '10/يوم', '20/يوم', 'غير محدود'], highlight: true },
                    { f: '👷 دليل العمال والصنايعية', v: ['—', '✓', '✓', '✓'], highlight: true },
                    { f: '🧾 تأكيد إيصالات الدفع',   v: ['✓', '✓', '✓', '✓'], highlight: true },
                    { f: '🚫 القائمة السوداء للعمالة', v: ['—', '✓', '✓', '✓'], highlight: true },
                    { f: 'API للتكامل الخارجي',     v: ['—', '—', '—', '✓'] },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-purple-50/30 transition">
                      <td className="px-4 py-3 font-medium text-gray-700 sticky right-0 bg-white">{row.f}</td>
                      {row.v.map((cell, j) => (
                        <td key={j} className={`px-4 py-3 text-center ${cell === '✓' ? 'text-emerald-600 font-bold' : cell === '—' ? 'text-gray-300' : 'text-gray-700 font-medium'} ${j === 2 ? 'bg-purple-50/30' : ''}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Free trial CTA */}
            <div className="mt-10 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 p-8 text-center text-white shadow-xl" data-testid="free-trial-cta">
              <div className="text-4xl mb-2">🎁</div>
              <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>
                {t('free_trial_title', 'جرّبي مجاناً 14 يوم — بدون بطاقة ائتمان')}
              </h3>
              <p className="text-emerald-50 mb-5 max-w-xl mx-auto">
                {t('free_trial_desc', 'فعّلي خطة "احترافي" مجاناً لمدة 14 يوم. كل الميزات متاحة بالكامل. ألغي في أي وقت بدون أي رسوم.')}
              </p>
              <button
                onClick={() => navigate('/auth/register')}
                className="inline-flex items-center gap-2 bg-white text-emerald-700 px-8 py-3 rounded-xl font-black text-lg hover:scale-105 transition-transform shadow-lg"
                data-testid="free-trial-btn"
              >
                {t('start_free_trial', 'ابدئي التجربة المجانية الآن')} ←
              </button>
              <p className="text-[11px] text-emerald-100 mt-3 opacity-80">
                {t('no_card_required', '✓ لا تحتاجين بطاقة ائتمان · ✓ إلغاء فوري · ✓ حماية كاملة لبياناتك')}
              </p>
            </div>

            {/* 💰 Ads Revenue Sharing Explainer — surfaces the income stream
                feature that's gated behind the Premium plan. Helps justify
                the upgrade for compounds that want monetization. */}
            <div className="mt-12 rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-2 border-amber-200 p-8" data-testid="ads-revenue-explainer">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-black mb-3">
                  💰 {t('ads_revenue_badge', 'ميزة Premium حصرية')}
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>
                  {t('ads_revenue_title', 'الإعلانات التجارية: حوّل مجمعك إلى مصدر دخل إضافي')}
                </h3>
                <p className="text-sm text-gray-600 max-w-2xl mx-auto">
                  {t('ads_revenue_subtitle', 'الشركات المحلية ترفع إعلاناتها، أنتِ توافقين، السكان يشاهدون، وأنتِ تكسبين 70% من كل إعلان. صفقة سهلة بدون جهد.')}
                </p>
              </div>

              {/* Step-by-step flow */}
              <div className="grid md:grid-cols-4 gap-4 mb-8" data-testid="ads-revenue-flow">
                {[
                  { num: '1', icon: '🏪', title: 'الشركات ترفع إعلانها', desc: 'مطاعم، عقارات، مدارس — أي شركة محلية ترفع تصميم الإعلان + المدة + الميزانية' },
                  { num: '2', icon: '✅', title: 'أنتِ توافقين أو ترفضين', desc: 'مراجعة كل إعلان قبل النشر — تحكّم كامل في المحتوى الظاهر لسكانك' },
                  { num: '3', icon: '📱', title: 'السكان يشاهدون', desc: 'الإعلان يظهر في أماكن غير مزعجة داخل التطبيق (Banner / Card) فقط للجمهور المستهدف' },
                  { num: '4', icon: '💵', title: 'أنتِ تكسبين 70%', desc: 'HomeMe تأخذ 30% فقط — الباقي يُحوَّل لحسابك البنكي شهرياً' },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-amber-200 p-4 relative shadow-sm">
                    <div className="absolute -top-3 -right-3 rtl:right-auto rtl:-left-3 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow-md">
                      {s.num}
                    </div>
                    <div className="text-3xl mb-2">{s.icon}</div>
                    <div className="font-bold text-gray-900 text-sm mb-1">{s.title}</div>
                    <div className="text-xs text-gray-500 leading-relaxed">{s.desc}</div>
                  </div>
                ))}
              </div>

              {/* Income projection */}
              <div className="bg-white rounded-2xl border-2 border-amber-300 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">📊</span>
                  <h4 className="font-bold text-gray-900">{t('ads_projection_title', 'مثال واقعي للدخل المتوقع')}</h4>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  {t('ads_projection_hint', 'الأرقام أدناه تقديرية بناءً على متوسط مجمع 200 وحدة')}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
                    <div className="text-[10px] text-gray-500 mb-1">{t('ads_per_month', 'إعلانات/شهر')}</div>
                    <div className="text-2xl font-black text-amber-700">3-5</div>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
                    <div className="text-[10px] text-gray-500 mb-1">{t('ads_per_ad', 'متوسط/إعلان')}</div>
                    <div className="text-2xl font-black text-amber-700">2,500 ج.م</div>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border-2 border-emerald-300 p-3 text-center">
                    <div className="text-[10px] text-emerald-700 mb-1 font-bold">{t('ads_your_share', 'حصتك (70%)')}</div>
                    <div className="text-2xl font-black text-emerald-700">5,250 — 8,750 ج.م</div>
                  </div>
                </div>
                <p className="text-[11px] text-center text-gray-500 mt-3">
                  {t('ads_projection_note', '* الأرقام بدون احتساب مدخول التطبيق الأساسي — هذا دخل إضافي صافٍ')}
                </p>
              </div>

              {/* CTA */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    const el = document.querySelector('[data-testid="pricing-section"]') ||
                               document.querySelector('[data-testid="pricing-comparison-section"]');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl font-black hover:scale-105 transition-transform shadow-lg"
                  data-testid="ads-upgrade-btn"
                >
                  {t('ads_upgrade_cta', '⚡ ترقية لـ Premium وابدئي الكسب')}
                </button>
                <a
                  href="/advertiser-register"
                  className="inline-flex items-center gap-2 text-amber-700 px-4 py-2 rounded-xl font-bold border-2 border-amber-300 hover:bg-amber-100 transition"
                  data-testid="ads-learn-more-link"
                >
                  {t('ads_for_advertisers', 'هل أنت شركة تريد الإعلان؟ ←')}
                </a>
              </div>
            </div>

            {/* Customer testimonials — live, moderated reviews from real users (Feature #39) */}
            <div className="mt-12" data-testid="pricing-testimonials">
              <CustomerTestimonialsCarousel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;