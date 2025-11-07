import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  ChartBarIcon,
  UsersIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CalendarIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  BoltIcon,
  FireIcon,
  SparklesIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline';

const API = process.env.REACT_APP_BACKEND_URL;

const MonitoringDashboard = () => {
  const { t } = useTranslation();
  
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [errors, setErrors] = useState([]);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchMonitoringData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchMonitoringData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMonitoringData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(true);

      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch all monitoring data in parallel
      const [statsRes, activitiesRes, errorsRes, chartsRes] = await Promise.all([
        axios.get(`${API}/api/monitoring/stats`, { headers }),
        axios.get(`${API}/api/monitoring/activities?limit=50`, { headers }),
        axios.get(`${API}/api/monitoring/errors?limit=30`, { headers }),
        axios.get(`${API}/api/monitoring/charts?days=7`, { headers })
      ]);

      setStats(statsRes.data);
      setActivities(activitiesRes.data.activities || []);
      setErrors(errorsRes.data.errors || []);
      setCharts(chartsRes.data);

    } catch (error) {
      console.error('Error fetching monitoring data:', error);
      if (!silent) {
        toast.error(t('failed_to_load_monitoring_data'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchMonitoringData();
    toast.success(t('data_refreshed'));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getActivityIcon = (actionType) => {
    switch (actionType) {
      case 'login':
        return '🔐';
      case 'logout':
        return '🚪';
      case 'create_user':
        return '➕';
      case 'delete_user':
        return '🗑️';
      case 'update_user':
        return '✏️';
      default:
        return '📝';
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      error: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {t(status) || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('monitoring_dashboard')}</h1>
          <p className="text-gray-600 mt-1">{t('system_monitoring_overview')}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn btn-primary flex items-center space-x-2"
        >
          <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{t('refresh')}</span>
        </button>
      </div>

      {/* System Health Status */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('system_health')}</h2>
            <p className="text-sm text-gray-600">{t('last_updated')}: {formatDate(stats?.system?.last_updated)}</p>
          </div>
          <div className="flex items-center space-x-2">
            {stats?.system?.database_status === 'connected' ? (
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            ) : (
              <XCircleIcon className="h-6 w-6 text-red-600" />
            )}
            <span className={`text-sm font-semibold ${stats?.system?.database_status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
              {t(stats?.system?.database_status)}
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-center space-x-2 text-sm text-gray-600">
          <ClockIcon className="h-4 w-4" />
          <span>{t('uptime')}: {stats?.system?.uptime}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Total Users */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-500">{t('total_users')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.users?.total || 0}</p>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-500">{t('active_users')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.users?.active || 0}</p>
            </div>
          </div>
        </div>

        {/* Admins */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-500">{t('administrators')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.users?.admins || 0}</p>
            </div>
          </div>
        </div>

        {/* Total Compounds */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <BuildingOfficeIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-500">{t('total_compounds')}</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.compounds?.total || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center space-x-2 mb-4">
            <CalendarIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t('logins_today')}</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600">{stats?.activity?.logins_today || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center space-x-2 mb-4">
            <ChartBarIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t('logins_this_week')}</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats?.activity?.logins_week || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('overview')}
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'activities'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('activity_log')} ({activities.length})
            </button>
            <button
              onClick={() => setActiveTab('errors')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'errors'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('error_log')} ({errors.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('system_overview')}</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">{t('total_residents')}</span>
                  <span className="font-bold text-gray-900">{stats?.users?.residents || 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">{t('total_units')}</span>
                  <span className="font-bold text-gray-900">{stats?.compounds?.total_units || 0}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">{t('inactive_users')}</span>
                  <span className="font-bold text-gray-900">{stats?.users?.inactive || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Activities Tab */}
          {activeTab === 'activities' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recent_activities')}</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {activities.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">{t('no_activities_found')}</p>
                ) : (
                  activities.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <span className="text-2xl">{getActivityIcon(activity.action_type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.username}
                          </p>
                          {getStatusBadge(activity.status)}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {t(activity.action_type)} - {activity.details}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(activity.timestamp)}
                          {activity.ip_address && ` • IP: ${activity.ip_address}`}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Errors Tab */}
          {activeTab === 'errors' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('recent_errors')}</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {errors.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-gray-500">{t('no_errors_found')}</p>
                  </div>
                ) : (
                  errors.map((error, index) => (
                    <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-red-900">
                              {error.error_type}
                            </p>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              error.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              error.severity === 'error' ? 'bg-orange-100 text-orange-800' :
                              error.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {t(error.severity)}
                            </span>
                          </div>
                          <p className="text-sm text-red-700 mt-1">
                            {error.error_message}
                          </p>
                          <p className="text-xs text-red-500 mt-1">
                            {t('user')}: {error.username} • {formatDate(error.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
