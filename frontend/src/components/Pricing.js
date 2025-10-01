import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Layout from './Layout';
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
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const Pricing = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [showDiscountCode, setShowDiscountCode] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);

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
        residents: '100 residents',
        services: 'Unlimited services',
        chat: 'Advanced chat & messaging',
        family: 'Family management with photos',
        storage: '5GB file storage',
        mobile: 'Mobile app access',
        support: 'Priority support',
        branding: 'Custom branding',
        analytics: 'Advanced reporting',
        api: false,
        multiCompound: false,
        whiteLabel: false,
        customDev: false
      },
      limitations: []
    },
    {
      id: 'professional',
      name: 'Professional',
      subtitle: 'For multiple communities',
      price: { monthly: 40, yearly: 400 },
      originalPrice: { monthly: 40, yearly: 480 },
      icon: TrophyIcon,
      gradient: 'from-purple-500 to-indigo-600',
      popular: false,
      features: {
        residents: '500 residents',
        services: 'Unlimited services',
        chat: 'Advanced chat & messaging',
        family: 'Family management with photos',
        storage: '50GB file storage',
        mobile: 'Mobile app access',
        support: 'Priority support',
        branding: 'Custom branding',
        analytics: 'Advanced analytics',
        api: 'API access',
        multiCompound: 'Multi-compound management',
        whiteLabel: 'White-label options',
        customDev: false
      },
      limitations: []
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      subtitle: 'For large organizations',
      price: { monthly: 70, yearly: 700 },
      originalPrice: { monthly: 70, yearly: 840 },
      icon: BuildingOfficeIcon,
      gradient: 'from-emerald-500 to-teal-600',
      popular: false,
      features: {
        residents: 'Unlimited residents',
        services: 'Unlimited services',
        chat: 'Advanced chat & messaging',
        family: 'Family management with photos',
        storage: 'Unlimited storage',
        mobile: 'Mobile app access',
        support: 'Dedicated support',
        branding: 'Custom branding',
        analytics: 'Advanced analytics',
        api: 'Full API access',
        multiCompound: 'Multiple compounds',
        whiteLabel: 'White-label options',
        customDev: 'Custom development'
      },
      limitations: []
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
    <Layout>
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
          
          {/* Billing Toggle */}
          <div className="mt-8 flex justify-center">
            <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('monthly')}
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all relative ${
                  billingPeriod === 'yearly'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t('yearly')}
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  {t('save_17_percent')}
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
                      Most Popular
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
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-gray-900">
                        ${currentPrice}
                      </span>
                      {plan.id !== 'community' && (
                        <span className="text-gray-600 ml-1">
                          /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      )}
                    </div>
                    
                    {appliedDiscount && currentPrice !== originalPrice && plan.id !== 'community' && (
                      <div className="text-sm text-gray-500 line-through mt-1">
                        Was ${originalPrice}/{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                      </div>
                    )}
                    
                    {billingPeriod === 'yearly' && plan.id !== 'community' && (
                      <div className="text-sm text-green-600 mt-1">
                        Save ${plan.originalPrice.yearly - plan.price.yearly} annually
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
                        <span className="text-gray-700">Custom branding</span>
                      </div>
                    )}
                    
                    {plan.features.analytics && (
                      <div className="flex items-center">
                        <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                        <span className="text-gray-700">Advanced analytics</span>
                      </div>
                    )}
                    
                    {plan.features.api && (
                      <div className="flex items-center">
                        <CheckIcon className="h-5 w-5 text-green-500 mr-3" />
                        <span className="text-gray-700">API access</span>
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
                        <span className="text-gray-700">Custom development</span>
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
                    {plan.id === 'community' ? 'Start Free' : `Choose ${plan.name}`}
                  </button>
                  
                  {plan.id === 'community' && (
                    <p className="text-center text-sm text-gray-500 mt-2">
                      No credit card required
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
            <h2 className="text-3xl font-bold mb-4 text-center">Bring Your Community Together</h2>
            <p className="text-xl text-blue-100 mb-6">
              Any paid user can invite up to 20 free users who get full access to your compound's features
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-white/10 rounded-lg p-4">
                <GiftIcon className="h-8 w-8 mx-auto mb-2 text-blue-200" />
                <h3 className="font-semibold text-center mb-2">Free Invitations</h3>
                <p className="text-sm text-blue-100">Invite up to 20 residents for free</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <CheckIcon className="h-8 w-8 mx-auto mb-2 text-blue-200" />
                <h3 className="font-semibold text-center mb-2">Full Access</h3>
                <p className="text-sm text-blue-100">Free users get all features of your plan</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <UserGroupIcon className="h-8 w-8 mx-auto mb-2 text-blue-200" />
                <h3 className="font-semibold text-center mb-2">No Limits</h3>
                <p className="text-sm text-blue-100">Build your community without barriers</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently Asked Questions</h2>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div>
              <h3 className="font-semibold text-center text-gray-900 text-center mb-2">Can I upgrade or downgrade anytime?</h3>
              <p className="text-gray-600">Yes, you can change your plan at any time. Changes take effect immediately.</p>
            </div>
            <div>
              <h3 className="font-semibold text-center text-gray-900 text-center mb-2">Is there a setup fee?</h3>
              <p className="text-gray-600">No setup fees. Pay only for what you use, when you use it.</p>
            </div>
            <div>
              <h3 className="font-semibold text-center text-gray-900 text-center mb-2">How do free invitations work?</h3>
              <p className="text-gray-600">Paid users can invite up to 20 residents who get full access to all features.</p>
            </div>
            <div>
              <h3 className="font-semibold text-center text-gray-900 text-center mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600">We accept all major credit cards, PayPal, and bank transfers.</p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </Layout>
  );
};

export default Pricing;