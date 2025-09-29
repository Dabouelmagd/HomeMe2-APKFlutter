import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';

const PublicAccountTypeSelection = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRtl = i18n.language === 'ar';

  const handleAccountTypeSelect = (accountType) => {
    if (accountType === 'individual') {
      navigate('/individual-register');
    } else if (accountType === 'enterprise') {
      navigate('/enterprise-register');
    }
  };

  const accountTypes = [
    {
      type: 'individual',
      title: {
        en: 'Individual Compound',
        ar: 'مجمع سكني فردي',
        fr: 'Complexe Individuel'
      },
      description: {
        en: 'Perfect for managing a single residential compound',
        ar: 'مثالي لإدارة مجمع سكني واحد',
        fr: 'Parfait pour gérer un seul complexe résidentiel'
      },
      price: {
        en: '$0.50 per unit/month',
        ar: '0.50$ لكل وحدة/شهر',
        fr: '0,50 $ par unité/mois'
      },
      features: {
        en: [
          'Manage single compound',
          'Up to 1000 units',
          '1-month free trial',
          'Basic analytics',
          'Community features',
          'Financial management'
        ],
        ar: [
          'إدارة مجمع واحد',
          'حتى 1000 وحدة',
          'تجربة مجانية لشهر واحد',
          'تحليلات أساسية',
          'ميزات المجتمع',
          'الإدارة المالية'
        ],
        fr: [
          'Gérer un seul complexe',
          'Jusqu\'à 1000 unités',
          'Essai gratuit d\'1 mois',
          'Analyses de base',
          'Fonctionnalités communautaires',
          'Gestion financière'
        ]
      }
    },
    {
      type: 'enterprise',
      title: {
        en: 'Enterprise Company',
        ar: 'شركة مؤسسية',
        fr: 'Entreprise'
      },
      description: {
        en: 'Ideal for companies managing multiple compounds',
        ar: 'مثالي للشركات التي تدير عدة مجمعات',
        fr: 'Idéal pour les entreprises gérant plusieurs complexes'
      },
      price: {
        en: 'From $0.35 per unit/month',
        ar: 'من 0.35$ لكل وحدة/شهر',
        fr: 'À partir de 0,35 $ par unité/mois'
      },
      popular: true,
      features: {
        en: [
          'Unlimited compounds',
          'First year completely FREE',
          'Volume discounts (10-40%)',
          'Advanced analytics',
          'Company branding',
          'Multi-compound management'
        ],
        ar: [
          'مجمعات غير محدودة',
          'السنة الأولى مجانية تماماً',
          'خصومات الكمية (10-40%)',
          'تحليلات متقدمة',
          'علامة تجارية للشركة',
          'إدارة متعددة المجمعات'
        ],
        fr: [
          'Complexes illimités',
          'Première année entièrement GRATUITE',
          'Remises de volume (10-40%)',
          'Analyses avancées',
          'Image de marque d\'entreprise',
          'Gestion multi-complexes'
        ]
      }
    }
  ];

  const getLocalizedText = (textObj) => {
    return textObj[i18n.language] || textObj.en;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Language Switcher */}
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-white">HM</span>
            </div>
          </div>
          
          <h1 className={`text-4xl font-bold text-gray-900 mb-4 ${isRtl ? 'text-right' : 'text-left'}`}>
            {t('account_selection.title')}
          </h1>
          <p className={`text-xl text-gray-600 max-w-3xl mx-auto ${isRtl ? 'text-right' : 'text-left'}`}>
            {t('account_selection.subtitle')}
          </p>

          {/* Back to Login Link */}
          <div className="mt-6">
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← {t('back_to_login')}
            </button>
          </div>
        </div>

        {/* Account Type Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {accountTypes.map((accountType) => (
            <div
              key={accountType.type}
              className={`relative bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:scale-105 cursor-pointer ${
                accountType.popular ? 'border-2 border-blue-500 ring-4 ring-blue-100' : 'border border-gray-200'
              }`}
              onClick={() => handleAccountTypeSelect(accountType.type)}
            >
              {/* Popular Badge */}
              {accountType.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 text-sm font-medium rounded-bl-lg">
                  ⭐ {t('account_selection.popular')}
                </div>
              )}

              <div className="p-8">
                {/* Header */}
                <div className={`mb-6 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                    {getLocalizedText(accountType.title)}
                  </h2>
                  <p className="text-gray-600 mb-4">
                    {getLocalizedText(accountType.description)}
                  </p>
                  <div className="text-3xl font-bold text-blue-600">
                    {getLocalizedText(accountType.price)}
                  </div>
                </div>

                {/* Features */}
                <div className={`mb-8 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-4">
                    {t('account_selection.features_included')}
                  </h3>
                  <ul className="space-y-3">
                    {getLocalizedText(accountType.features).map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <div className={`flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center ${isRtl ? 'ml-3' : 'mr-3'}`}>
                          <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <button
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
                    accountType.popular
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transform hover:scale-105'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {t('account_selection.get_started')}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="text-center mt-12">
          <p className="text-gray-600">
            {t('account_selection.need_help')}{' '}
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              {t('account_selection.contact_support')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicAccountTypeSelection;