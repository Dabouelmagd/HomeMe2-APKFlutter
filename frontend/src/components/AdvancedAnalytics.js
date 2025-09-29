import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  BellIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { formatDate } from '../utils/dateUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdvancedAnalytics = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Auto-translate backend data function
  const translateBackendData = (data) => {
    if (!data) return data;
    
    // Translation mapping for common phrases
    const translationMap = {
      'increase in resident registrations': t('increase_in_resident_registrations'),
      'payment collection rate achieved': t('payment_collection_rate_achieved'),
      'user engagement maintained': t('user_engagement_maintained'), 
      'Maintenance response time increased': t('maintenance_response_time_increased'),
      'pending high-priority requests': t('pending_high_priority_requests'),
      'resident registrations': t('increase_in_resident_registrations'),
      'collection rate': t('collection_rate'),
      'user engagement': t('user_engagement_maintained'),
      'response time': t('maintenance_response_time_increased'),
      'high-priority requests': t('pending_high_priority_requests')
    };
    
    // If data is a string, try to translate it
    if (typeof data === 'string') {
      // Try exact match first
      if (t(data) !== data) {
        return t(data);
      }
      
      // Try partial matches
      let translatedData = data;
      Object.keys(translationMap).forEach(key => {
        if (data.toLowerCase().includes(key.toLowerCase())) {
          translatedData = translatedData.replace(new RegExp(key, 'gi'), translationMap[key]);
        }
      });
      return translatedData;
    }
    
    // If data is an array, translate each item
    if (Array.isArray(data)) {
      return data.map(item => translateBackendData(item));
    }
    
    return data;
  };
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('last_30_days');
  const [refreshing, setRefreshing] = useState(false);

  const dateRanges = [
    { value: 'last_7_days', label: t('last_7_days') },
    { value: 'last_30_days', label: t('last_30_days') },
    { value: 'last_90_days', label: t('last_90_days') },
    { value: 'last_6_months', label: t('last_6_months') },
    { value: 'last_year', label: t('last_year') },
    { value: 'custom', label: t('custom_range') }
  ];

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/analytics/dashboard`, {
        params: { date_range: dateRange }
      });
      
      setAnalytics(response.data || {});
    } catch (error) {
      toast.error('Failed to load analytics data');
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
    toast.success('Analytics data refreshed');
  };

  const exportData = async (format = 'csv') => {
    try {
      const response = await axios.get(`${API}/analytics/export`, {
        params: { 
          date_range: dateRange,
          format: format
        },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_${dateRange}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`Analytics exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export analytics data');
    }
  };

  const MetricCard = ({ title, value, change, icon: Icon, color, subtitle }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${color || 'text-gray-900'}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color?.replace('text-', 'bg-').replace('-600', '-500') || 'bg-blue-500'}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      {change !== undefined && (
        <div className="mt-4 flex items-center">
          {change >= 0 ? (
            <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
          ) : (
            <ArrowTrendingDownIcon className="w-4 h-4 text-red-500 mr-1" />
          )}
          <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(change)}%
          </span>
          <span className="text-sm text-gray-500 ml-1">
            {t('vs_previous_period')}
          </span>
        </div>
      )}
    </div>
  );

  const ChartContainer = ({ title, children, className = "" }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-64">
        {children}
      </div>
    </div>
  );

  const SimpleChart = ({ data, type = "bar", color = "#3B82F6" }) => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <ChartBarIcon className="w-8 h-8 mr-2" />
          <span>{t('no_data_available')}</span>
        </div>
      );
    }

    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <div className="flex items-end justify-between h-full space-x-2">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div 
              className="w-full rounded-t-md"
              style={{
                height: `${(item.value / maxValue) * 100}%`,
                backgroundColor: color,
                minHeight: '4px'
              }}
            />
            <span className="text-xs text-gray-600 mt-2 text-center">
              {item.label}
            </span>
            <span className="text-xs font-medium text-gray-900">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('advanced_analytics')}</h1>
            <p className="text-gray-600 mt-2">{t('analytics_description')}</p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {dateRanges.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {t('refresh')}
            </button>
            <button
              onClick={() => exportData('csv')}
              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
              {t('export')}
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title={t('total_residents')}
          value={analytics.residents?.total || 0}
          change={analytics.residents?.growth_rate}
          icon={UsersIcon}
          color="text-blue-600"
          subtitle={`${analytics.residents?.active || 0} ${t('active')}`}
        />
        
        <MetricCard
          title={t('maintenance_requests')}
          value={analytics.maintenance?.total || 0}
          change={analytics.maintenance?.growth_rate}
          icon={WrenchScrewdriverIcon}
          color="text-orange-600"
          subtitle={`${analytics.maintenance?.pending || 0} ${t('pending')}`}
        />
        
        <MetricCard
          title={t('revenue_collected')}
          value={`$${(analytics.revenue?.total || 0).toLocaleString()}`}
          change={analytics.revenue?.growth_rate}
          icon={CurrencyDollarIcon}
          color="text-green-600"
          subtitle={`${analytics.revenue?.collection_rate || 0}% ${t('collection_rate')}`}
        />
        
        <MetricCard
          title={t('user_engagement')}
          value={`${analytics.engagement?.rate || 0}%`}
          change={analytics.engagement?.growth_rate}
          icon={ArrowTrendingUpIcon}
          color="text-purple-600"
          subtitle={`${analytics.engagement?.active_users || 0} ${t('active_users')}`}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: t('overview'), icon: ChartBarIcon },
            { key: 'residents', label: t('residents'), icon: UsersIcon },
            { key: 'maintenance', label: t('maintenance'), icon: WrenchScrewdriverIcon },
            { key: 'financial', label: t('financial'), icon: CurrencyDollarIcon },
            { key: 'engagement', label: t('engagement'), icon: BellIcon }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <>
            {/* Overview Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title={t('resident_growth_trend')}>
                <SimpleChart 
                  data={analytics.charts?.resident_growth || []}
                  color="#3B82F6"
                />
              </ChartContainer>
              
              <ChartContainer title={t('maintenance_requests_trend')}>
                <SimpleChart 
                  data={analytics.charts?.maintenance_trend || []}
                  color="#F59E0B"
                />
              </ChartContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title={t('revenue_trend')}>
                <SimpleChart 
                  data={analytics.charts?.revenue_trend || []}
                  color="#10B981"
                />
              </ChartContainer>
              
              <ChartContainer title={t('user_activity_trend')}>
                <SimpleChart 
                  data={analytics.charts?.activity_trend || []}
                  color="#8B5CF6"
                />
              </ChartContainer>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recent_activity')}</h3>
              <div className="space-y-4">
                {(analytics.recent_activity || []).map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <UsersIcon className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-500">{activity.description}</p>
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatDate(activity.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'residents' && (
          <>
            {/* Resident Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <MetricCard
                title={t('new_residents')}
                value={analytics.residents?.new_this_period || 0}
                icon={UsersIcon}
                color="text-green-600"
              />
              <MetricCard
                title={t('occupancy_rate')}
                value={`${analytics.residents?.occupancy_rate || 0}%`}
                icon={BuildingOfficeIcon}
                color="text-blue-600"
              />
              <MetricCard
                title={t('avg_family_size')}
                value={analytics.residents?.avg_family_size || 0}
                icon={UsersIcon}
                color="text-purple-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title={t('residents_by_unit_type')}>
                <SimpleChart 
                  data={analytics.charts?.residents_by_unit_type || []}
                  color="#3B82F6"
                />
              </ChartContainer>
              
              <ChartContainer title={t('family_size_distribution')}>
                <SimpleChart 
                  data={analytics.charts?.family_size_distribution || []}
                  color="#10B981"
                />
              </ChartContainer>
            </div>
          </>
        )}

        {activeTab === 'maintenance' && (
          <>
            {/* Maintenance Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <MetricCard
                title={t('avg_response_time')}
                value={`${analytics.maintenance?.avg_response_time || 0}h`}
                icon={ClockIcon}
                color="text-orange-600"
              />
              <MetricCard
                title={t('completion_rate')}
                value={`${analytics.maintenance?.completion_rate || 0}%`}
                icon={WrenchScrewdriverIcon}
                color="text-green-600"
              />
              <MetricCard
                title={t('avg_satisfaction')}
                value={analytics.maintenance?.avg_satisfaction || 0}
                icon={ArrowTrendingUpIcon}
                color="text-blue-600"
              />
              <MetricCard
                title={t('cost_per_request')}
                value={`$${analytics.maintenance?.avg_cost || 0}`}
                icon={CurrencyDollarIcon}
                color="text-purple-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title={t('requests_by_category')}>
                <SimpleChart 
                  data={analytics.charts?.maintenance_by_category || []}
                  color="#F59E0B"
                />
              </ChartContainer>
              
              <ChartContainer title={t('requests_by_priority')}>
                <SimpleChart 
                  data={analytics.charts?.maintenance_by_priority || []}
                  color="#EF4444"
                />
              </ChartContainer>
            </div>
          </>
        )}

        {activeTab === 'financial' && (
          <>
            {/* Financial Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <MetricCard
                title={t('total_revenue')}
                value={`$${(analytics.revenue?.total || 0).toLocaleString()}`}
                icon={CurrencyDollarIcon}
                color="text-green-600"
              />
              <MetricCard
                title={t('outstanding_payments')}
                value={`$${(analytics.revenue?.outstanding || 0).toLocaleString()}`}
                icon={ClockIcon}
                color="text-red-600"
              />
              <MetricCard
                title={t('collection_rate')}
                value={`${analytics.revenue?.collection_rate || 0}%`}
                icon={ArrowTrendingUpIcon}
                color="text-blue-600"
              />
              <MetricCard
                title={t('avg_payment_time')}
                value={`${analytics.revenue?.avg_payment_time || 0} ${t('days')}`}
                icon={CalendarDaysIcon}
                color="text-purple-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title={t('monthly_revenue')}>
                <SimpleChart 
                  data={analytics.charts?.monthly_revenue || []}
                  color="#10B981"
                />
              </ChartContainer>
              
              <ChartContainer title={t('payment_methods')}>
                <SimpleChart 
                  data={analytics.charts?.payment_methods || []}
                  color="#3B82F6"
                />
              </ChartContainer>
            </div>
          </>
        )}

        {activeTab === 'engagement' && (
          <>
            {/* Engagement Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <MetricCard
                title={t('daily_active_users')}
                value={analytics.engagement?.daily_active || 0}
                icon={UsersIcon}
                color="text-blue-600"
              />
              <MetricCard
                title={t('app_sessions')}
                value={analytics.engagement?.total_sessions || 0}
                icon={EyeIcon}
                color="text-green-600"
              />
              <MetricCard
                title={t('avg_session_duration')}
                value={`${analytics.engagement?.avg_session_duration || 0}m`}
                icon={ClockIcon}
                color="text-orange-600"
              />
              <MetricCard
                title={t('feature_adoption')}
                value={`${analytics.engagement?.feature_adoption || 0}%`}
                icon={ArrowTrendingUpIcon}
                color="text-purple-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title={t('feature_usage')}>
                <SimpleChart 
                  data={analytics.charts?.feature_usage || []}
                  color="#8B5CF6"
                />
              </ChartContainer>
              
              <ChartContainer title={t('notification_engagement')}>
                <SimpleChart 
                  data={analytics.charts?.notification_engagement || []}
                  color="#06B6D4"
                />
              </ChartContainer>
            </div>
          </>
        )}
      </div>

      {/* Summary Report */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('period_summary')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">{t('key_achievements')}</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {(analytics.summary?.achievements || []).map((achievement, index) => (
                <li key={index} className="flex items-center">
                  <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-2" />
                  {translateBackendData(achievement)}
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">{t('areas_for_improvement')}</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {(analytics.summary?.improvements || []).map((improvement, index) => (
                <li key={index} className="flex items-center">
                  <ArrowTrendingDownIcon className="w-4 h-4 text-orange-500 mr-2" />
                  {translateBackendData(improvement)}
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">{t('recommendations')}</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {(analytics.summary?.recommendations || []).map((recommendation, index) => (
                <li key={index} className="flex items-center">
                  <ChartBarIcon className="w-4 h-4 text-blue-500 mr-2" />
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;