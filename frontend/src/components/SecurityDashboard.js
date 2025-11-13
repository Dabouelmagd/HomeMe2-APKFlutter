import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  ShieldCheckIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  IdentificationIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { formatRelativeTime } from '../utils/dateUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SecurityDashboard = () => {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [activeTab, setActiveTab] = useState('visitors');
  const [securityLogs, setSecurityLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayVisitors: 0,
    checkedIn: 0,
    checkedOut: 0,
    unreadMessages: 0
  });

  useEffect(() => {
    fetchSecurityData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [logsRes, messagesRes] = await Promise.all([
        axios.get(`${API}/security/visitor-logs`, { headers }),
        axios.get(`${API}/security/messages`, { headers }).catch(() => ({ data: { messages: [] } }))
      ]);
      
      const logs = logsRes.data.logs || [];
      setSecurityLogs(logs);
      setMessages(messagesRes.data.messages || []);
      
      // Calculate stats
      const today = new Date().toDateString();
      const todayLogs = logs.filter(log => new Date(log.timestamp || log.created_at).toDateString() === today);
      
      setStats({
        todayVisitors: todayLogs.length,
        checkedIn: logs.filter(log => log.action === 'check_in').length,
        checkedOut: logs.filter(log => log.action === 'check_out').length,
        unreadMessages: (messagesRes.data.messages || []).filter(m => !m.read).length
      });
      
    } catch (error) {
      console.error('Error fetching security data:', error);
      toast.error(t('failed_to_load_data'));
    } finally {
      setLoading(false);
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${API}/security/messages/${messageId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchSecurityData();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-xl">
                <ShieldCheckIcon className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {t('security_dashboard')}
                </h1>
                <p className="text-gray-600 mt-1">
                  {t('welcome')}, <span className="font-semibold">{user?.username || user?.email}</span>
                </p>
                <p className="text-sm text-gray-500">{user?.compound_name || t('compound')}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-lg"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">{t('today_visitors')}</p>
                <p className="text-4xl font-bold mt-2">{stats.todayVisitors}</p>
              </div>
              <UsersIcon className="h-12 w-12 text-green-100" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">{t('checked_in')}</p>
                <p className="text-4xl font-bold mt-2">{stats.checkedIn}</p>
              </div>
              <CheckCircleIcon className="h-12 w-12 text-blue-100" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">{t('checked_out')}</p>
                <p className="text-4xl font-bold mt-2">{stats.checkedOut}</p>
              </div>
              <XCircleIcon className="h-12 w-12 text-orange-100" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">{t('new_messages')}</p>
                <p className="text-4xl font-bold mt-2">{stats.unreadMessages}</p>
              </div>
              <BellIcon className="h-12 w-12 text-purple-100" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 mb-8">
          <nav className="flex gap-2" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('visitors')}
              className={`flex-1 py-4 px-6 rounded-xl font-semibold text-sm transition-all transform ${
                activeTab === 'visitors'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                <IdentificationIcon className="w-5 h-5" />
                <span>{t('visitor_log')}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  activeTab === 'visitors' ? 'bg-white bg-opacity-20' : 'bg-blue-100 text-blue-600'
                }`}>
                  {securityLogs.length}
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 py-4 px-6 rounded-xl font-semibold text-sm transition-all transform ${
                activeTab === 'messages'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                <span>{t('resident_messages')}</span>
                {stats.unreadMessages > 0 && (
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                    {stats.unreadMessages}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Visitor Logs Tab */}
          {activeTab === 'visitors' && (
            <>
              {securityLogs.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
                  <IdentificationIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('no_visitor_logs')}</h3>
                  <p className="text-gray-600">{t('visitor_logs_will_appear_here')}</p>
                </div>
              ) : (
                securityLogs.map((log) => (
                  <div key={log.id || log._id} className="bg-white rounded-2xl border-2 border-gray-100 shadow-lg hover:shadow-xl transition-all">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 rtl:space-x-reverse mb-4">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                              log.action === 'check_in' ? 'bg-green-100' : 'bg-orange-100'
                            }`}>
                              {log.action === 'check_in' ? (
                                <CheckCircleIcon className="w-7 h-7 text-green-600" />
                              ) : (
                                <XCircleIcon className="w-7 h-7 text-orange-600" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">{log.visitor_name}</h3>
                              <p className="text-sm text-gray-500">
                                {log.action === 'check_in' ? t('checked_in') : t('checked_out')}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              log.action === 'check_in' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {formatRelativeTime(log.timestamp || log.created_at)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">{t('checked_by')}</p>
                              <p className="text-sm font-semibold text-gray-900">{log.checked_by}</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">{t('id_verified')}</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {log.id_verified ? '✓ ' + t('yes') : '✗ ' + t('no')}
                              </p>
                            </div>
                            {log.temperature_check && (
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">{t('temperature')}</p>
                                <p className="text-sm font-semibold text-gray-900">{log.temperature_check}°C</p>
                              </div>
                            )}
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">{t('photo')}</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {log.photo_taken ? '✓ ' + t('yes') : '✗ ' + t('no')}
                              </p>
                            </div>
                          </div>
                          
                          {log.security_notes && (
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                              <p className="text-xs text-yellow-700 font-semibold mb-1">{t('security_notes')}:</p>
                              <p className="text-sm text-yellow-800">{log.security_notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <>
              {messages.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
                  <ChatBubbleLeftRightIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('no_messages')}</h3>
                  <p className="text-gray-600">{t('messages_from_residents_will_appear_here')}</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div 
                    key={message.id || message._id} 
                    className={`bg-white rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all cursor-pointer ${
                      message.read ? 'border-gray-100' : 'border-purple-200 bg-purple-50'
                    }`}
                    onClick={() => !message.read && markMessageAsRead(message.id || message._id)}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                            <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{message.sender_name}</h3>
                            <p className="text-sm text-gray-500">{t('unit')} {message.unit_number}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          {!message.read && (
                            <span className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                              {t('new')}
                            </span>
                          )}
                          <span className="text-sm text-gray-500">
                            {formatRelativeTime(message.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      {message.subject && (
                        <h4 className="text-md font-semibold text-gray-800 mb-2">{message.subject}</h4>
                      )}
                      
                      <p className="text-gray-700 leading-relaxed">{message.content || message.message}</p>
                      
                      {message.category && (
                        <div className="mt-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {message.category}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;
