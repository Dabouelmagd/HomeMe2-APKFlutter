import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const AccountTypeSelection = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [accountTypes, setAccountTypes] = useState([]);
  
  const isRtl = i18n.language === 'ar';

  useEffect(() => {
    fetchAccountTypes();
  }, []);

  const fetchAccountTypes = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/account/selection`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setAccountTypes(response.data.account_types);
      }
    } catch (error) {
      console.error('Error fetching account types:', error);
      toast.error(t('account_selection.fetch_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAccountTypeSelect = async (accountType) => {
    setSelecting(true);
    
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/account/select-type`,
        { account_type: accountType },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        toast.success(t('account_selection.selection_success'));
        
        // Navigate to appropriate registration page
        if (accountType === 'individual') {
          navigate('/individual-register');
        } else if (accountType === 'enterprise') {
          navigate('/enterprise-register');
        }
      }
    } catch (error) {
      console.error('Error selecting account type:', error);
      toast.error(error.response?.data?.detail || t('account_selection.selection_error'));
    } finally {
      setSelecting(false);
    }
  };

  const getLocalizedContent = (item, field) => {
    if (i18n.language === 'ar') {
      return item[`${field}_ar`] || item[field];
    } else if (i18n.language === 'fr') {
      return item[`${field}_fr`] || item[field];
    }
    return item[field];
  };

  const getLocalizedFeatures = (item) => {
    if (i18n.language === 'ar') {
      return item.features_ar || item.features;
    } else if (i18n.language === 'fr') {
      return item.features_fr || item.features;
    }
    return item.features;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('account_selection.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t('account_selection.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('account_selection.subtitle')}
          </p>
          <div className="mt-6 flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
          </div>
        </div>

        {/* Account Type Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {accountTypes.map((accountType, index) => (
            <div
              key={accountType.type}
              className={`relative bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-300 hover:scale-105 ${
                accountType.type === 'enterprise' ? 'border-2 border-blue-500' : ''
              }`}
            >
              {/* Popular Badge for Enterprise */}
              {accountType.type === 'enterprise' && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 text-sm font-medium rounded-bl-lg">
                  {t('account_selection.popular')}
                </div>
              )}

              <div className="p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                    accountType.type === 'individual' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    {accountType.type === 'individual' ? (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m11 0a2 2 0 01-2 2H7a2 2 0 01-2-2m2 0V9a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2z" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m11 0a2 2 0 01-2 2H7a2 2 0 01-2-2m2 0V9a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {getLocalizedContent(accountType, 'name')}
                  </h2>
                  
                  <p className="text-gray-600">
                    {getLocalizedContent(accountType, 'description')}
                  </p>
                </div>

                {/* Pricing */}
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">
                      ${accountType.pricing.base_price}
                    </span>
                    <span className="text-gray-500 ml-2">
                      {t('account_selection.per_unit_month')}
                    </span>
                  </div>
                  
                  {accountType.type === 'enterprise' && (
                    <p className="text-sm text-blue-600 mt-2">
                      {t('account_selection.additional_compounds')}: ${accountType.pricing.additional_price}
                    </p>
                  )}
                  
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-3 ${
                    accountType.type === 'individual'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {accountType.pricing.trial_period} {t('account_selection.free_trial')}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  <h3 className="font-semibold text-gray-900">
                    {t('account_selection.features_included')}
                  </h3>
                  
                  <ul className="space-y-3">
                    {getLocalizedFeatures(accountType).map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <svg className={`w-5 h-5 ${
                          accountType.type === 'individual' ? 'text-green-500' : 'text-blue-500'
                        } ${isRtl ? 'ml-3' : 'mr-3'} flex-shrink-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleAccountTypeSelect(accountType.type)}
                  disabled={selecting}
                  className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
                    accountType.type === 'individual'
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-green-200'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-200'
                  } shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5`}
                >
                  {selecting ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {t('account_selection.selecting')}
                    </span>
                  ) : (
                    <>
                      {t('account_selection.get_started')}
                      <svg className={`w-5 h-5 inline ${isRtl ? 'mr-2' : 'ml-2'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isRtl ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="mt-16 bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-8 py-6 bg-gray-50 border-b">
            <h3 className="text-2xl font-bold text-gray-900">
              {t('account_selection.comparison_title')}
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 uppercase">
                    {t('account_selection.feature')}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-500 uppercase">
                    {t('account_selection.individual')}
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-500 uppercase">
                    {t('account_selection.enterprise')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">{t('account_selection.compounds_limit')}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">1 {t('account_selection.compound')}</td>
                  <td className="px-6 py-4 text-center text-sm text-green-600 font-medium">{t('account_selection.unlimited')}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">{t('account_selection.units_limit')}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">{t('account_selection.up_to_1000')}</td>
                  <td className="px-6 py-4 text-center text-sm text-green-600 font-medium">{t('account_selection.unlimited')}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">{t('account_selection.trial_period')}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">1 {t('account_selection.month')}</td>
                  <td className="px-6 py-4 text-center text-sm text-blue-600 font-medium">3 {t('account_selection.months')}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">{t('account_selection.volume_discounts')}</td>
                  <td className="px-6 py-4 text-center">
                    <svg className="w-5 h-5 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-900">{t('account_selection.advanced_analytics')}</td>
                  <td className="px-6 py-4 text-center">
                    <svg className="w-5 h-5 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {t('account_selection.need_help')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('account_selection.help_description')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors">
                {t('account_selection.contact_sales')}
              </button>
              <button className="bg-blue-100 text-blue-700 px-6 py-3 rounded-lg hover:bg-blue-200 transition-colors">
                {t('account_selection.schedule_demo')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountTypeSelection;