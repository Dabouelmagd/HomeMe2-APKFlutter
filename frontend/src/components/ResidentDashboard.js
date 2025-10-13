import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftEllipsisIcon,
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ResidentDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/resident`);
      setDashboardData(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingInvoicesCount = dashboardData?.pending_invoices?.length || 0;
  const totalPendingAmount = dashboardData?.pending_invoices?.reduce(
    (sum, invoice) => sum + invoice.amount, 0
  ) || 0;

  const stats = [
    {
      name: t('dashboard.family_members', 'Family Members'),
      value: dashboardData?.family_members?.length || 1,
      icon: UsersIcon,
      color: 'bg-blue-500',
      description: t('dashboard.total_in_family', 'Total in your family')
    },
    {
      name: t('dashboard.pending_payments', 'Pending Payments'),
      value: pendingInvoicesCount,
      icon: CurrencyDollarIcon,
      color: 'bg-yellow-500',
      description: `$${totalPendingAmount.toFixed(2)} ${t('dashboard.total', 'total')}`
    },
    {
      name: t('dashboard.messages_sent', 'Messages Sent'),
      value: dashboardData?.my_messages?.length || 0,
      icon: ChatBubbleLeftEllipsisIcon,
      color: 'bg-purple-500',
      description: t('dashboard.this_month', 'This month')
    },
    {
      name: t('notifications'),
      value: dashboardData?.recent_notifications?.length || 0,
      icon: BellIcon,
      color: 'bg-green-500',
      description: t('recent_updates')
    }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 text-center">
          {t('welcome_home_name', { name: user?.full_name })}
        </h1>
        <p className="text-gray-600 mt-2">
          {t('unit')} {dashboardData?.family?.unit_number || user?.unit_number || 'N/A'} • 
          {t('everything_manage')}
        </p>
      </div>

      {/* Alert for pending payments */}
      {pendingInvoicesCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                You have {pendingInvoicesCount} pending payment{pendingInvoicesCount > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Total amount due: ${totalPendingAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.description}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Family Members */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-center text-gray-900 text-center">Family Members</h3>
              <UsersIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div className="p-6">
            {dashboardData?.family_members?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.family_members.map((member, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {member.full_name?.charAt(0) || 'U'}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {member.full_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {member.email}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {member.is_family_head ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Head
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Member
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No family members found</p>
            )}
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-center text-gray-900 text-center">Pending Payments</h3>
              <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div className="p-6">
            {dashboardData?.pending_invoices?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.pending_invoices.map((invoice, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                    <div className="flex-shrink-0">
                      <ClockIcon className="h-8 w-8 text-yellow-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {invoice.description}
                      </p>
                      <p className="text-sm text-gray-600">
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ${invoice.amount}
                      </p>
                      <button className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors">
                        Pay Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">All payments are up to date!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-center text-gray-900 text-center">{t('recent_notifications')}</h3>
              <BellIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div className="p-6">
            {dashboardData?.recent_notifications?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recent_notifications.slice(0, 3).map((notification, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <BellIcon className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {notification.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">{t('no_recent_notifications')}</p>
            )}
          </div>
        </div>

        {/* My Messages */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-center text-gray-900 text-center">My Messages</h3>
              <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <div className="p-6">
            {dashboardData?.my_messages?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.my_messages.slice(0, 3).map((message, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <ChatBubbleLeftEllipsisIcon className="h-4 w-4 text-purple-600" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {message.subject}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {message.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(message.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        message.status === 'open' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {message.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No messages sent</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-4 text-center">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Send Message</p>
                <p className="text-sm text-gray-600">Contact management</p>
              </div>
            </div>
          </button>

          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Pay Bills</p>
                <p className="text-sm text-gray-600">Make payments</p>
              </div>
            </div>
          </button>

          <button 
            onClick={() => navigate('/app/family')}
            className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UsersIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Family</p>
                <p className="text-sm text-gray-600">Manage family members</p>
              </div>
            </div>
          </button>

          <button className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow text-left">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <BellIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{t('notifications')}</p>
                <p className="text-sm text-gray-600">View all updates</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResidentDashboard;