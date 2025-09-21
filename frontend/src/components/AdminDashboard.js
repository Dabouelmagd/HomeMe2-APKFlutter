import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { toast } from 'sonner';
import TrialStatus from './TrialStatus';
import {
  UsersIcon,
  HomeIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftEllipsisIcon,
  BellIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    statistics: {
      total_residents: 125,
      total_residences: 45,
      total_services: 17,
      total_messages: 89,
      pending_payments: 12,
      active_bookings: 8
    },
    recent_activities: [
      { id: 1, type: 'new_resident', message: 'John Smith joined Unit A-101', time: '2 minutes ago' },
      { id: 2, type: 'service_booked', message: 'Plumbing service booked by Jane Doe', time: '15 minutes ago' },
      { id: 3, type: 'payment', message: 'Monthly fee paid by Unit B-205', time: '1 hour ago' }
    ]
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // fetchDashboardData(); // Commented out to use mock data for now
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/admin`);
      setDashboardData(response.data);
    } catch (error) {
      // Use mock data if API fails
      console.log('Using mock data for dashboard');
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

  const handleQuickAction = (action) => {
    switch (action) {
      case 'add_resident':
        window.location.href = '/compound';
        toast.success('Navigating to Compound Management...');
        break;
      case 'manage_units':
        window.location.href = '/compound';
        toast.success('Opening residence management...');
        break;
      case 'send_notice':
        window.location.href = '/messages';
        toast.success('Opening message center...');
        break;
      case 'view_payments':
        window.location.href = '/financial';
        toast.success('Opening financial management...');
        break;
      default:
        break;
    }
  };

  const stats = [
    {
      name: 'Total Residents',
      value: dashboardData?.statistics?.total_residents || 0,
      icon: UsersIcon,
      color: 'from-blue-500 to-blue-600',
      change: '+12%',
      trend: 'up'
    },
    {
      name: 'Total Residences',
      value: dashboardData?.statistics?.total_residences || 0,
      icon: HomeIcon,
      color: 'from-emerald-500 to-emerald-600',
      change: '+3%',
      trend: 'up'
    },
    {
      name: 'Active Services',
      value: dashboardData?.statistics?.total_services || 0,
      icon: CurrencyDollarIcon,
      color: 'from-purple-500 to-purple-600',
      change: '+8%',
      trend: 'up'
    },
    {
      name: 'Messages Today',
      value: dashboardData?.statistics?.total_messages || 0,
      icon: ChatBubbleLeftEllipsisIcon,
      color: 'from-orange-500 to-orange-600',
      change: '+15%',
      trend: 'up'
    }
  ];

  const quickActions = [
    {
      id: 'add_resident',
      name: 'Add Resident',
      description: 'Create new residence account',
      icon: UsersIcon,
      color: 'text-blue-600 bg-blue-50 hover:bg-blue-100'
    },
    {
      id: 'manage_units',
      name: 'Manage Units',
      description: 'View all residence units',
      icon: HomeIcon,
      color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
    },
    {
      id: 'send_notice',
      name: 'Send Notice',
      description: 'Broadcast to all residents',
      icon: BellIcon,
      color: 'text-purple-600 bg-purple-50 hover:bg-purple-100'
    },
    {
      id: 'view_payments',
      name: 'View Payments',
      description: 'Check financial status',
      icon: CurrencyDollarIcon,
      color: 'text-orange-600 bg-orange-50 hover:bg-orange-100'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section - Redesigned */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Welcome back, {user?.full_name} 👋
              </h1>
              <p className="text-lg text-gray-600">
                Here's what's happening in your compound today
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Current Time</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trial Status - New Feature */}
        <div className="mb-8">
          <TrialStatus showFull={true} />
        </div>

        {/* Stats Grid - Redesigned */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color}`}>
                    <IconComponent className="h-7 w-7 text-white" />
                  </div>
                  <div className={`flex items-center text-sm font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span>{stat.change}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                  <p className="text-sm text-gray-600">{stat.name}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Actions - Redesigned with Working Buttons */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  className={`p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all text-left ${action.color} group`}
                >
                  <IconComponent className="h-8 w-8 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold text-gray-900 mb-2">{action.name}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Activity - Redesigned */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {dashboardData?.recent_activities?.map((activity, index) => (
              <div key={index} className="flex items-start p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-500 mt-1" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            )) || (
              <div className="text-center py-8">
                <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;