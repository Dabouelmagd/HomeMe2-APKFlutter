import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import TrialStatus from './TrialStatus';
import { TransliteratedText } from './TransliterationToggle';
import {
  UsersIcon,
  HomeIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftEllipsisIcon,
  BellIcon,
  CheckCircleIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentCheckIcon,
  ArrowPathIcon,
  UserPlusIcon,
  CreditCardIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/admin`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = dashboardData?.statistics || {};

  const handleQuickAction = (action) => {
    switch (action) {
      case 'add_resident':
        navigate('/app/add-family-member');
        break;
      case 'manage_users':
        navigate('/app/users');
        break;
      case 'send_notice':
        navigate('/app/messages');
        break;
      case 'view_payments':
        navigate('/app/finances');
        break;
      case 'maintenance':
        navigate('/app/maintenance');
        break;
      case 'services':
        navigate('/app/services');
        break;
      default:
        break;
    }
  };

  const statCards = [
    {
      name: t('total_residents', 'إجمالي المقيمين'),
      value: stats.total_residents || 0,
      icon: UsersIcon,
      color: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
    },
    {
      name: t('total_families', 'إجمالي الأسر'),
      value: stats.total_families || 0,
      icon: HomeIcon,
      color: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      name: t('total_services', 'إجمالي الخدمات'),
      value: stats.total_services || 0,
      icon: CurrencyDollarIcon,
      color: 'from-purple-500 to-purple-600',
      bg: 'bg-purple-50',
    },
    {
      name: t('open_messages', 'الرسائل المفتوحة'),
      value: stats.open_messages || 0,
      icon: ChatBubbleLeftEllipsisIcon,
      color: 'from-orange-500 to-orange-600',
      bg: 'bg-orange-50',
    }
  ];

  const liveIndicators = [
    {
      name: t('open_maintenance', 'صيانة مفتوحة'),
      value: stats.open_maintenance || 0,
      icon: WrenchScrewdriverIcon,
      color: stats.open_maintenance > 0 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-green-600 bg-green-50 border-green-200',
    },
    {
      name: t('active_bookings', 'حجوزات نشطة'),
      value: stats.active_bookings || 0,
      icon: ClipboardDocumentCheckIcon,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    },
    {
      name: t('pending_payments', 'مدفوعات معلقة'),
      value: stats.pending_payments || 0,
      icon: CreditCardIcon,
      color: stats.pending_payments > 0 ? 'text-red-600 bg-red-50 border-red-200' : 'text-green-600 bg-green-50 border-green-200',
    },
    {
      name: t('family_members_count', 'أفراد العائلات'),
      value: stats.total_family_members || 0,
      icon: UserGroupIcon,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    }
  ];

  const quickActions = [
    {
      id: 'add_resident',
      name: t('add_resident', 'إضافة مقيم'),
      icon: UserPlusIcon,
      color: 'text-blue-600 bg-blue-50 hover:bg-blue-100'
    },
    {
      id: 'maintenance',
      name: t('maintenance_system', 'نظام الصيانة'),
      icon: WrenchScrewdriverIcon,
      color: 'text-amber-600 bg-amber-50 hover:bg-amber-100'
    },
    {
      id: 'manage_users',
      name: t('user_management', 'إدارة المستخدمين'),
      icon: UserGroupIcon,
      color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
    },
    {
      id: 'send_notice',
      name: t('send_notice', 'إرسال إشعار'),
      icon: BellIcon,
      color: 'text-purple-600 bg-purple-50 hover:bg-purple-100'
    },
    {
      id: 'services',
      name: t('services_management', 'إدارة الخدمات'),
      icon: CurrencyDollarIcon,
      color: 'text-orange-600 bg-orange-50 hover:bg-orange-100'
    },
    {
      id: 'view_payments',
      name: t('view_payments', 'المدفوعات'),
      icon: CreditCardIcon,
      color: 'text-teal-600 bg-teal-50 hover:bg-teal-100'
    }
  ];

  const getActivityIcon = (action) => {
    if (action?.includes('family_member') || action?.includes('resident')) return UserPlusIcon;
    if (action?.includes('maintenance')) return WrenchScrewdriverIcon;
    if (action?.includes('payment') || action?.includes('invoice')) return CreditCardIcon;
    if (action?.includes('booking')) return ClipboardDocumentCheckIcon;
    return CheckCircleIcon;
  };

  const getActivityColor = (action) => {
    if (action?.includes('family_member') || action?.includes('resident')) return 'text-blue-500 bg-blue-100';
    if (action?.includes('maintenance')) return 'text-amber-500 bg-amber-100';
    if (action?.includes('payment') || action?.includes('invoice')) return 'text-green-500 bg-green-100';
    return 'text-gray-500 bg-gray-100';
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return t('just_now', 'الآن');
    if (diffMins < 60) return t('minutes_ago', `منذ ${diffMins} دقيقة`);
    if (diffHours < 24) return t('hours_ago', `منذ ${diffHours} ساعة`);
    return t('days_ago', `منذ ${diffDays} يوم`);
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                <TransliteratedText>
                  {t('welcome_back_name', { name: user?.full_name })}
                </TransliteratedText> 👋
              </h1>
              <p className="text-lg text-gray-600">
                <TransliteratedText>
                  {t('dashboard_welcome_subtitle', 'إليك ما يحدث في مجمعك اليوم')}
                </TransliteratedText>
              </p>
              <p className="text-sm text-gray-500 mt-2">{t('current_time', 'الوقت الحالي')}</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date().toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
              data-testid="refresh-dashboard"
            >
              <ArrowPathIcon className={`h-6 w-6 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Trial Status */}
        <div className="mb-8">
          <TrialStatus showFull={true} />
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" data-testid="stats-grid">
          {statCards.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow" data-testid={`stat-card-${index}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color}`}>
                    <IconComponent className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-center text-gray-900">{stat.value}</h3>
                  <p className="text-sm text-gray-600 text-center mt-1">{stat.name}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Indicators Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-testid="live-indicators">
          {liveIndicators.map((indicator, index) => {
            const IconComponent = indicator.icon;
            return (
              <div key={index} className={`rounded-xl border-2 p-4 flex items-center gap-3 ${indicator.color}`}>
                <IconComponent className="h-6 w-6 flex-shrink-0" />
                <div>
                  <p className="text-2xl font-bold">{indicator.value}</p>
                  <p className="text-xs font-medium">{indicator.name}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">{t('quick_actions', 'الإجراءات السريعة')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  className={`p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all text-center ${action.color} group`}
                  data-testid={`quick-action-${action.id}`}
                >
                  <IconComponent className="h-7 w-7 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-semibold text-gray-800">{action.name}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Two Column Layout: Recent Activities + Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activities */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6" data-testid="recent-activities">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('recent_activity', 'النشاط الأخير')}</h2>
            <div className="space-y-3">
              {dashboardData?.recent_activities?.length > 0 ? (
                dashboardData.recent_activities.slice(0, 6).map((activity, index) => {
                  const IconComponent = getActivityIcon(activity.action);
                  const colorClass = getActivityColor(activity.action);
                  return (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${colorClass}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{activity.details || activity.action}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatTimeAgo(activity.timestamp)}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <CheckCircleIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">{t('no_recent_activity', 'لا يوجد نشاط حديث')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Notifications */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6" data-testid="recent-notifications">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('notifications', 'الإشعارات')}</h2>
            <div className="space-y-3">
              {dashboardData?.recent_notifications?.length > 0 ? (
                dashboardData.recent_notifications.slice(0, 6).map((notif, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-500 flex-shrink-0">
                      <BellIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{notif.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5 truncate">{notif.content}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatTimeAgo(notif.created_at)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <BellIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">{t('no_notifications', 'لا توجد إشعارات')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
