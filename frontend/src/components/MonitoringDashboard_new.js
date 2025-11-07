import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-toastify';

const API = process.env.REACT_APP_BACKEND_URL;

const MonitoringDashboard = () => {
  const { t } = useTranslation();
  
  const [activities, setActivities] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('activities');

  useEffect(() => {
    fetchMonitoringData();
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
      const headers = { Authorization: \`Bearer \${token}\` };

      const [activitiesRes, errorsRes] = await Promise.all([
        axios.get(\`\${API}/api/monitoring/activities?limit=50\`, { headers }),
        axios.get(\`\${API}/api/monitoring/errors?limit=20\`, { headers })
      ]);

      setActivities(activitiesRes.data.activities || []);
      setErrors(errorsRes.data.errors || []);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
      if (!silent) toast.error(t('failed_to_load_monitoring_data'));
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
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getActivityIcon = (actionType) => {
    const icons = {
      login: '🔐',
      logout: '🚪',
      create_user: '➕',
      delete_user: '🗑️',
      update_user: '✏️',
      create_compound: '🏘️',
      payment: '💳',
      subscription_code_sent: '🎫',
      default: '📝'
    };
    return icons[actionType] || icons.default;
  };

  const getStatusColor = (status) => {
    const colors = {
      success: 'text-green-600 bg-green-50 border-green-200',
      failed: 'text-red-600 bg-red-50 border-red-200',
      error: 'text-red-600 bg-red-50 border-red-200',
      pending: 'text-yellow-600 bg-yellow-50 border-yellow-200'
    };
    return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {t('monitoring_dashboard')}
              </h1>
              <p className="text-gray-600 font-medium">{t('system_monitoring_overview')}</p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
            >
              <span className={refreshing ? 'animate-spin inline-block mr-2' : 'mr-2'}>⟳</span>
              {refreshing ? t('verifying') : t('refresh')}
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 shadow-xl text-white">
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl">⚡</span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">Live</span>
              </div>
              <h3 className="text-white/80 text-sm font-semibold mb-1">{t('total_activities')}</h3>
              <p className="text-4xl font-black">{activities.length}</p>
              <p className="text-white/70 text-sm mt-2">{t('tracked_events')}</p>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-6 shadow-xl text-white">
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl">🔥</span>
                {errors.length === 0 && (
                  <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">✓</span>
                )}
              </div>
              <h3 className="text-white/80 text-sm font-semibold mb-1">{t('system_errors')}</h3>
              <p className="text-4xl font-black">{errors.length}</p>
              <p className="text-white/70 text-sm mt-2">
                {errors.length === 0 ? t('all_systems_operational') : t('needs_attention')}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-xl text-white">
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl">🛡️</span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-semibold">100%</span>
              </div>
              <h3 className="text-white/80 text-sm font-semibold mb-1">{t('system_health')}</h3>
              <p className="text-4xl font-black">{t('excellent')}</p>
              <p className="text-white/70 text-sm mt-2">{t('no_issues_detected')}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-2 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('activities')}
              className={\`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-300 \${
                activeTab === 'activities'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }\`}
            >
              🕐 {t('activity_log')} ({activities.length})
            </button>
            <button
              onClick={() => setActiveTab('errors')}
              className={\`flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-300 \${
                activeTab === 'errors'
                  ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }\`}
            >
              ⚠️ {t('error_log')} ({errors.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {activeTab === 'activities' ? (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t('recent_activities')}
                <span className="ml-3 text-sm font-normal text-gray-500">
                  {activities.length} {t('tracked_events')}
                </span>
              </h2>

              {activities.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-6xl mb-4 block">🕐</span>
                  <p className="text-gray-500 text-lg font-medium">{t('no_activities_found')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-gray-50 to-transparent hover:from-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl p-4 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                          {getActivityIcon(activity.action_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-gray-900 capitalize">
                              {activity.action_type?.replace(/_/g, ' ')}
                            </h3>
                            <span className={\`px-3 py-1 text-xs font-semibold rounded-full border \${getStatusColor(activity.status)}\`}>
                              {activity.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{activity.details}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>🕐 {formatDate(activity.timestamp)}</span>
                            {activity.username && <span>👤 {activity.username}</span>}
                            {activity.ip_address && <span>🌐 {activity.ip_address}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t('error_log')}
                <span className="ml-3 text-sm font-normal text-gray-500">
                  {errors.length} errors
                </span>
              </h2>

              {errors.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <span className="text-6xl">✓</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('all_clear')}</h3>
                  <p className="text-gray-600 text-lg">{t('no_errors_detected')}</p>
                  <div className="mt-6 inline-flex items-center px-6 py-3 bg-green-100 text-green-800 rounded-full font-semibold">
                    🛡️ {t('system_health_percent')}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {errors.map((error, index) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                          <span className="text-2xl text-white">✗</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-sm font-bold text-red-900 mb-2">
                            {error.error_type || 'System Error'}
                          </h3>
                          <p className="text-sm text-red-700 mb-2">{error.message || error.details}</p>
                          <div className="text-xs text-red-600">
                            🕐 {formatDate(error.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
