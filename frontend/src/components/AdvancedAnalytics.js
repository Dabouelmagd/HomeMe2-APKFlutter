import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageHero from './shared/PageHero';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
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
  ArrowPathIcon,
  SpeakerWaveIcon,
  CursorArrowRaysIcon,
} from '@heroicons/react/24/outline';
import { formatDate } from '../utils/dateUtils';
import CompoundSwitcher from './CompoundSwitcher';

// Chart Colors
const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdvancedAnalytics = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const activeRole = user?.active_role || user?.role;
  const isSuperAdminOnly = activeRole === 'super_admin';
  
  // Auto-translate backend data function
  const translateBackendData = (data) => {
    if (!data) return data;
    
    if (typeof data === 'string') {
      // Try exact match first (for full sentences)
      const exactTranslation = t(data);
      if (exactTranslation !== data) {
        return exactTranslation;
      }
      
      // If no exact match, return original data
      // This prevents the duplication issue
      return data;
    }
    
    // If data is an array, translate each item
    if (Array.isArray(data)) {
      return data.map(item => translateBackendData(item));
    }
    
    return data;
  };
  const [analytics, setAnalytics] = useState({});
  const [adAnalytics, setAdAnalytics] = useState(null);
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
    if (activeTab === 'ads') fetchAdAnalytics();
  }, [dateRange, activeTab]);

  const fetchAdAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/ads/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdAnalytics(res.data);
    } catch { /* silent */ }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/analytics/dashboard`, {
        params: { date_range: dateRange }
      });
      
      setAnalytics(response.data || {});
    } catch (error) {
      toast.error(t('failed_load_analytics', 'فشل في تحميل بيانات التحليلات'));
      console.error('Analytics fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
    toast.success(t('analytics_refreshed', 'تم تحديث بيانات التحليلات'));
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
      toast.error(t('failed_export_analytics', 'فشل في تصدير البيانات'));
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
      <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-4">{title}</h3>
      <div className="h-64">
        {children}
      </div>
    </div>
  );

  const SimpleChart = ({ data, type = "bar", color = "#3B82F6" }) => {
    const { i18n } = useTranslation();
    const isRTL = i18n.language === 'ar';
    
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <ChartBarIcon className="w-8 h-8 mr-2 rtl:ml-2 rtl:mr-0" />
          <span>{t('no_data_available')}</span>
        </div>
      );
    }

    // Convert data format for Recharts
    const chartData = data.map(d => ({
      name: d.label,
      value: d.value
    }));

    if (type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'area') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} reversed={isRTL} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} orientation={isRTL ? 'right' : 'left'} />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '12px', 
                border: '1px solid #E5E7EB',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }} 
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              fillOpacity={1} 
              fill={`url(#gradient-${color.replace('#', '')})`} 
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'line') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} reversed={isRTL} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} orientation={isRTL ? 'right' : 'left'} />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '12px', 
                border: '1px solid #E5E7EB'
              }} 
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={color} 
              strokeWidth={3}
              dot={{ fill: color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    // Default: Bar chart
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} reversed={isRTL} />
          <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} orientation={isRTL ? 'right' : 'left'} />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: '1px solid #E5E7EB'
            }} 
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
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
      <PageHero
        icon="📊"
        title={t('advanced_analytics')}
        subtitle={t('analytics_description')}
        accent="indigo"
        actions={(
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-white/15 backdrop-blur-sm ring-1 ring-white/20 text-white rounded-xl px-3 py-2 text-xs [&>option]:text-gray-900"
            >
              {dateRanges.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 ring-1 ring-white/20 text-white backdrop-blur-sm transition-all disabled:opacity-50"
              title={t('refresh')}
            >
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => exportData('csv')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-indigo-700 hover:shadow-md text-xs font-semibold transition-all"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              {t('export')}
            </button>
          </div>
        )}
      />

      {/* Key Metrics */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${isSuperAdminOnly ? '3' : '4'} gap-6 mb-8`}>
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
        
        {!isSuperAdminOnly && (
        <MetricCard
          title={t('revenue_collected')}
          value={`${(analytics.revenue?.total || 0).toLocaleString()} ج.م`}
          change={analytics.revenue?.growth_rate}
          icon={CurrencyDollarIcon}
          color="text-green-600"
          subtitle={`${analytics.revenue?.collection_rate || 0}% ${t('collection_rate')}`}
        />
        )}
        
        <MetricCard
          title={t('user_engagement')}
          value={`${analytics.engagement?.rate || 0}%`}
          change={analytics.engagement?.growth_rate}
          icon={ArrowTrendingUpIcon}
          color="text-purple-600"
          subtitle={`${analytics.engagement?.active_users || 0} ${t('active_users')}`}
        />
      </div>

      {/* Compound switcher */}
      <CompoundSwitcher onChange={() => fetchAnalytics()} className="mb-4" />

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: t('overview'), icon: ChartBarIcon },
            { key: 'residents', label: t('residents'), icon: UsersIcon },
            { key: 'maintenance', label: t('maintenance'), icon: WrenchScrewdriverIcon },
            ...(isSuperAdminOnly ? [] : [{ key: 'financial', label: t('financial'), icon: CurrencyDollarIcon }]),
            { key: 'engagement', label: t('engagement'), icon: BellIcon },
            { key: 'ads', label: t('ad_analytics_tab', 'تقارير الإعلانات'), icon: SpeakerWaveIcon }
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
                  type="area"
                  color="#3B82F6"
                />
              </ChartContainer>
              
              <ChartContainer title={t('maintenance_requests_trend')}>
                <SimpleChart 
                  data={analytics.charts?.maintenance_trend || []}
                  type="bar"
                  color="#F59E0B"
                />
              </ChartContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {!isSuperAdminOnly && (
              <ChartContainer title={t('revenue_trend')}>
                <SimpleChart 
                  data={analytics.charts?.revenue_trend || []}
                  type="area"
                  color="#10B981"
                />
              </ChartContainer>
              )}
              
              <ChartContainer title={t('user_activity_trend')}>
                <SimpleChart 
                  data={analytics.charts?.activity_trend || []}
                  type="line"
                  color="#8B5CF6"
                />
              </ChartContainer>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-4">{t('recent_activity')}</h3>
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
                  type="pie"
                  color="#3B82F6"
                />
              </ChartContainer>
              
              <ChartContainer title={t('family_size_distribution')}>
                <SimpleChart 
                  data={analytics.charts?.family_size_distribution || []}
                  type="bar"
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
                  type="pie"
                  color="#F59E0B"
                />
              </ChartContainer>
              
              <ChartContainer title={t('requests_by_priority')}>
                <SimpleChart 
                  data={analytics.charts?.maintenance_by_priority || []}
                  type="bar"
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
                value={`${(analytics.revenue?.total || 0).toLocaleString()} ج.م`}
                icon={CurrencyDollarIcon}
                color="text-green-600"
              />
              <MetricCard
                title={'إجمالي المصروفات'}
                value={`${(analytics.expenses?.total || 0).toLocaleString()} ج.م`}
                icon={ArrowTrendingUpIcon}
                color="text-red-600"
                change={analytics.expenses?.growth_rate}
              />
              <MetricCard
                title={'صافي الرصيد'}
                value={`${(analytics.expenses?.net_balance ?? ((analytics.revenue?.total || 0) - (analytics.expenses?.total || 0))).toLocaleString()} ج.م`}
                icon={CurrencyDollarIcon}
                color={(analytics.expenses?.net_balance ?? 0) >= 0 ? 'text-blue-600' : 'text-red-600'}
              />
              <MetricCard
                title={t('collection_rate')}
                value={`${analytics.revenue?.collection_rate || 0}%`}
                icon={ArrowTrendingUpIcon}
                color="text-amber-600"
              />
            </div>

            {/* Expenses by category breakdown */}
            {analytics.expenses?.by_category && Object.keys(analytics.expenses.by_category).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">المصروفات حسب التصنيف</h3>
                <div className="space-y-2">
                  {Object.entries(analytics.expenses.by_category)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, amt]) => {
                      const total = analytics.expenses.total || 1;
                      const pct = (amt / total) * 100;
                      const labels = {
                        maintenance: 'صيانة', utilities: 'مرافق', security: 'حراسة',
                        cleaning: 'نظافة', salaries: 'رواتب', other: 'أخرى'
                      };
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-semibold text-gray-700">{labels[cat] || cat}</span>
                            <span className="text-gray-600">{Number(amt).toLocaleString()} ج.م ({pct.toFixed(1)}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-l from-rose-500 to-red-600 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* 6-month Revenue vs Expenses comparison */}
            {analytics.charts?.monthly_comparison?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6" data-testid="monthly-comparison-chart">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                  <h3 className="text-lg font-bold text-gray-900">📊 مقارنة شهرية: الإيرادات vs المصروفات</h3>
                  <span className="text-xs text-gray-500">آخر 6 أشهر</span>
                </div>
                <p className="text-sm text-gray-500 mb-4">حدّد الأشهر التي زادت فيها المصروفات وخطّط الميزانية بشكل أفضل.</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.charts.monthly_comparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v} />
                    <Tooltip
                      formatter={(value, name) => [`${Number(value).toLocaleString()} ج.م`, name]}
                      labelStyle={{ fontWeight: 'bold' }}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 13 }} />
                    <Bar dataKey="revenue" name="الإيرادات" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expenses" name="المصروفات" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                  {(() => {
                    const arr = analytics.charts.monthly_comparison;
                    const totalRev = arr.reduce((s, m) => s + (m.revenue || 0), 0);
                    const totalExp = arr.reduce((s, m) => s + (m.expenses || 0), 0);
                    const net = totalRev - totalExp;
                    return [
                      { label: 'إجمالي الإيرادات (6 أشهر)', value: totalRev, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'إجمالي المصروفات (6 أشهر)', value: totalExp, color: 'text-red-600', bg: 'bg-red-50' },
                      { label: 'صافي الرصيد', value: net, color: net >= 0 ? 'text-blue-600' : 'text-red-600', bg: net >= 0 ? 'bg-blue-50' : 'bg-red-50' },
                    ].map((m, i) => (
                      <div key={i} className={`${m.bg} rounded-xl p-3`}>
                        <p className="text-xs text-gray-600 mb-1">{m.label}</p>
                        <p className={`font-black text-lg ${m.color}`}>{m.value.toLocaleString()} ج.م</p>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title={t('monthly_revenue')}>
                <SimpleChart 
                  data={analytics.charts?.revenue_trend || analytics.charts?.monthly_revenue || []}
                  type="area"
                  color="#10B981"
                />
              </ChartContainer>
              
              <ChartContainer title={t('payment_methods')}>
                <SimpleChart 
                  data={analytics.charts?.payment_methods || []}
                  type="pie"
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
                  type="bar"
                  color="#8B5CF6"
                />
              </ChartContainer>
              
              <ChartContainer title={t('notification_engagement')}>
                <SimpleChart 
                  data={analytics.charts?.notification_engagement || []}
                  type="line"
                  color="#06B6D4"
                />
              </ChartContainer>
            </div>
          </>
        )}
      </div>

      {/* Summary Report */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-4">{t('period_summary')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 text-center mb-2">{t('key_achievements')}</h4>
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
            <h4 className="font-medium text-gray-900 text-center mb-2">{t('areas_for_improvement')}</h4>
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
            <h4 className="font-medium text-gray-900 text-center mb-2">{t('recommendations')}</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              {(analytics.summary?.recommendations || []).map((recommendation, index) => (
                <li key={index} className="flex items-center">
                  <ChartBarIcon className="w-4 h-4 text-blue-500 mr-2" />
                  {translateBackendData(recommendation)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Ads Analytics Tab */}
      {activeTab === 'ads' && (
        <AdsAnalyticsTab data={adAnalytics} t={t} hideRevenue={isSuperAdminOnly} />
      )}
    </div>
  );
};

// Ads Analytics Sub-component
const AdsAnalyticsTab = ({ data, t, hideRevenue = false }) => {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const s = data.summary || {};
  const posLabels = {
    banner: t('sa_pos_banner', 'بانر'),
    sidebar: t('sa_pos_sidebar', 'جانبي'),
    inline: t('sa_pos_inline', 'داخلي'),
    dashboard: t('sa_pos_dashboard', 'لوحة التحكم'),
  };

  return (
    <div className="space-y-6" data-testid="ads-analytics-tab">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          { label: t('ad_total_ads', 'إجمالي الإعلانات'), value: s.total_ads, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: t('ad_active', 'نشطة'), value: s.active_ads, color: 'text-green-600', bg: 'bg-green-50' },
          { label: t('ad_views', 'المشاهدات'), value: (s.total_views || 0).toLocaleString(), color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: t('ad_clicks', 'النقرات'), value: (s.total_clicks || 0).toLocaleString(), color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: t('ad_avg_ctr', 'متوسط CTR'), value: `${s.avg_ctr || 0}%`, color: 'text-rose-600', bg: 'bg-rose-50' },
          ...(!hideRevenue ? [{ label: t('ad_revenue', 'الإيرادات'), value: `${(s.total_revenue || 0).toLocaleString()} ${t('sm_egp','ج.م')}`, color: 'text-emerald-600', bg: 'bg-emerald-50' }] : []),
          { label: t('ad_gifts', 'هدايا'), value: s.gift_ads, color: 'text-pink-600', bg: 'bg-pink-50' },
        ].map((c, i) => (
          <div key={i} className={`${c.bg} rounded-xl p-4 text-center`}>
            <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
            <p className="text-[10px] text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance by Position - Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">{t('ad_perf_by_position', 'الأداء حسب الموقع')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(data.position_chart || []).map(p => ({
                name: posLabels[p.label] || p.label,
                [t('ad_views','المشاهدات')]: p.views,
                [t('ad_clicks','النقرات')]: p.clicks,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} reversed={isRTL} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} orientation={isRTL ? 'right' : 'left'} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                <Legend />
                <Bar dataKey={t('ad_views','المشاهدات')} fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                <Bar dataKey={t('ad_clicks','النقرات')} fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ads by Position - Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">{t('ad_distribution', 'توزيع الإعلانات')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={(data.position_chart || []).map(p => ({
                    name: posLabels[p.label] || p.label,
                    value: p.count,
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {(data.position_chart || []).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Performers Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top by CTR */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-rose-50">
            <h4 className="font-bold text-gray-900 flex items-center gap-2">
              <CursorArrowRaysIcon className="w-4 h-4 text-rose-500" />
              {t('ad_top_ctr', 'أعلى نسبة نقر (CTR)')}
            </h4>
          </div>
          <div className="divide-y divide-gray-50">
            {(data.top_by_ctr || []).length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-400">{t('no_data_available', 'لا توجد بيانات')}</p>
            ) : (
              (data.top_by_ctr || []).map((a, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <span className="text-sm text-gray-800 truncate">{a.title}</span>
                  </div>
                  <span className="text-sm font-bold text-rose-600 whitespace-nowrap">{a.ctr}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top by Clicks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-amber-50">
            <h4 className="font-bold text-gray-900 flex items-center gap-2">
              <CursorArrowRaysIcon className="w-4 h-4 text-amber-500" />
              {t('ad_top_clicks', 'أكثر نقراً')}
            </h4>
          </div>
          <div className="divide-y divide-gray-50">
            {(data.top_by_clicks || []).length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-400">{t('no_data_available', 'لا توجد بيانات')}</p>
            ) : (
              (data.top_by_clicks || []).map((a, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <span className="text-sm text-gray-800 truncate">{a.title}</span>
                  </div>
                  <span className="text-sm font-bold text-amber-600 whitespace-nowrap">{a.clicks}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top by Views */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-purple-50">
            <h4 className="font-bold text-gray-900 flex items-center gap-2">
              <EyeIcon className="w-4 h-4 text-purple-500" />
              {t('ad_top_views', 'أكثر مشاهدة')}
            </h4>
          </div>
          <div className="divide-y divide-gray-50">
            {(data.top_by_views || []).length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-400">{t('no_data_available', 'لا توجد بيانات')}</p>
            ) : (
              (data.top_by_views || []).map((a, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <span className="text-sm text-gray-800 truncate">{a.title}</span>
                  </div>
                  <span className="text-sm font-bold text-purple-600 whitespace-nowrap">{(a.views || 0).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Full Ads Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{t('ad_all_performance', 'أداء جميع الإعلانات')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-gray-500 font-medium">{t('sa_title', 'العنوان')}</th>
                <th className="px-4 py-3 text-center text-gray-500 font-medium">{t('sa_position', 'الموقع')}</th>
                <th className="px-4 py-3 text-center text-gray-500 font-medium">{t('ad_views', 'المشاهدات')}</th>
                <th className="px-4 py-3 text-center text-gray-500 font-medium">{t('ad_clicks', 'النقرات')}</th>
                <th className="px-4 py-3 text-center text-gray-500 font-medium">CTR</th>
                {!hideRevenue && <th className="px-4 py-3 text-center text-gray-500 font-medium">{t('ad_value_col', 'القيمة')}</th>}
                <th className="px-4 py-3 text-center text-gray-500 font-medium">{t('sa_status', 'الحالة')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data.all_ads || []).map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.title}</td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">{posLabels[a.position] || a.position}</td>
                  <td className="px-4 py-3 text-center font-bold text-purple-600">{(a.views || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center font-bold text-amber-600">{(a.clicks || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${a.ctr > 5 ? 'bg-green-100 text-green-700' : a.ctr > 1 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                      {a.ctr}%
                    </span>
                  </td>
                  {!hideRevenue && (
                  <td className="px-4 py-3 text-center text-xs">
                    {a.is_gift ? (
                      <span className="px-2 py-0.5 bg-pink-100 text-pink-600 rounded-full font-medium">{t('ad_gift', 'هدية')}</span>
                    ) : (
                      <span className="text-emerald-600 font-bold">{(a.ad_value || 0).toLocaleString()} {t('sm_egp','ج.م')}</span>
                    )}
                  </td>
                  )}
                  <td className="px-4 py-3 text-center">
                    <span className={`w-2 h-2 rounded-full inline-block ${a.is_active ? 'bg-green-500' : 'bg-red-400'}`}></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;