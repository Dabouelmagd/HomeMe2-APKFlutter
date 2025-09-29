import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import axios from 'axios';
import { toast } from 'sonner';

const EnterpriseDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [currentView, setCurrentView] = useState('overview');
  const [selectedCompound, setSelectedCompound] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/companies/dashboard`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setDashboardData(response.data.dashboard);
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      toast.error(t('enterprise.dashboard_load_failed'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const renderOverview = () => {
    if (!dashboardData) return null;

    const { company, statistics, pricing, compounds } = dashboardData;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {company.logo_url && (
                <img 
                  src={company.logo_url} 
                  alt={company.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 text-center">
                  {company.name}
                </h1>
                <p className="text-gray-600">{company.company_code}</p>
                <p className="text-sm text-gray-500">{company.description}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">{t('enterprise.total_compounds')}</div>
              <div className="text-2xl font-bold text-blue-600">
                {statistics.total_compounds}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m11 0a2 2 0 01-2 2H7a2 2 0 01-2-2m2 0V9a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{t('enterprise.total_units')}</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statistics.total_units.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{t('enterprise.total_residents')}</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statistics.total_residents.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4l2 2 4-4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{t('enterprise.total_families')}</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statistics.total_families.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{t('enterprise.occupancy_rate')}</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statistics.occupancy_rate}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-4">
            {t('enterprise.pricing_summary')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">{t('enterprise.base_amount')}</p>
              <p className="text-xl font-semibold">
                {formatCurrency(pricing.base_amount)}
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">{t('enterprise.additional_amount')}</p>
              <p className="text-xl font-semibold">
                {formatCurrency(pricing.additional_amount)}
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">{t('enterprise.volume_discount')}</p>
              <p className="text-xl font-semibold text-green-600">
                -{formatCurrency(pricing.volume_discount)}
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-600">{t('enterprise.final_amount')}</p>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(pricing.final_amount)}
              </p>
              {pricing.first_year_discount > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  {t('enterprise.first_year_free_active')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Compounds Grid */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 text-center">
              {t('enterprise.compounds')}
            </h2>
            <button
              onClick={() => setCurrentView('add-compound')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              {t('enterprise.add_compound')}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {compounds.map((compound) => (
              <div key={compound.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {compound.logo_url && (
                      <img 
                        src={compound.logo_url} 
                        alt={compound.name}
                        className="w-12 h-12 rounded-lg object-cover mb-3"
                      />
                    )}
                    <h3 className="font-semibold text-gray-900">{compound.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{compound.address}</p>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">{t('enterprise.units')}:</span>
                        <span className="font-medium ml-1">{compound.total_units || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('enterprise.families')}:</span>
                        <span className="font-medium ml-1">{compound.statistics?.families || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-2">
                    <button
                      onClick={() => {
                        setSelectedCompound(compound);
                        setCurrentView('compound-detail');
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {compounds.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m11 0a2 2 0 01-2 2H7a2 2 0 01-2-2m2 0V9a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2z" />
                </svg>
                <p>{t('enterprise.no_compounds')}</p>
                <button
                  onClick={() => setCurrentView('add-compound')}
                  className="text-blue-600 hover:text-blue-800 font-medium mt-2"
                >
                  {t('enterprise.add_first_compound')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('enterprise.loading_dashboard')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900 text-center">
                {t('enterprise.dashboard')}
              </h1>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setCurrentView('overview')}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentView === 'overview'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('enterprise.overview')}
                </button>
                
                <button
                  onClick={() => setCurrentView('compounds')}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentView === 'compounds'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('enterprise.compounds')}
                </button>
                
                <button
                  onClick={() => setCurrentView('analytics')}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentView === 'analytics'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('enterprise.analytics')}
                </button>
                
                <button
                  onClick={() => setCurrentView('settings')}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentView === 'settings'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t('enterprise.settings')}
                </button>
              </div>
            </div>
            
            {/* Company Selector */}
            {dashboardData?.compounds && dashboardData.compounds.length > 1 && (
              <div className="flex items-center space-x-4">
                <select
                  value={selectedCompound?.id || ''}
                  onChange={(e) => {
                    const compound = dashboardData.compounds.find(c => c.id === e.target.value);
                    setSelectedCompound(compound);
                  }}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="">{t('enterprise.all_compounds')}</option>
                  {dashboardData.compounds.map((compound) => (
                    <option key={compound.id} value={compound.id}>
                      {compound.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {currentView === 'overview' && renderOverview()}
        {currentView === 'compounds' && (
          <div className="text-center py-8">
            <p className="text-gray-500">{t('enterprise.compounds_view_coming_soon')}</p>
          </div>
        )}
        {currentView === 'analytics' && (
          <div className="text-center py-8">
            <p className="text-gray-500">{t('enterprise.analytics_view_coming_soon')}</p>
          </div>
        )}
        {currentView === 'settings' && (
          <div className="text-center py-8">
            <p className="text-gray-500">{t('enterprise.settings_view_coming_soon')}</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default EnterpriseDashboard;