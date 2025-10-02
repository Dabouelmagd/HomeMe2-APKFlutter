import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth, useNotifications } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { formatRelativeTime } from '../utils/dateUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NotificationCenter = () => {
  const { user } = useAuth();
  const { notifications, markAsRead, deleteNotification, fetchNotifications } = useNotifications();
  const { t } = useTranslation();
  
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all'); // all, maintenance, payment, system, community
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const notificationTypes = [
    { value: 'all', label: t('all_notifications'), icon: BellIcon },
    { value: 'maintenance', label: t('maintenance'), icon: ExclamationTriangleIcon },
    { value: 'payment', label: t('payment'), icon: CheckCircleIcon },
    { value: 'system', label: t('system'), icon: InformationCircleIcon },
    { value: 'community', label: t('community'), icon: CheckIcon }
  ];

  const getNotificationIcon = (type, priority) => {
    const iconClass = `w-8 h-8 ${priority === 'high' ? 'text-red-500' : priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'}`;
    
    switch (type) {
      case 'maintenance':
        return <ExclamationTriangleIcon className={iconClass} />;
      case 'payment':
        return <CheckCircleIcon className={iconClass} />;
      case 'system':
        return <InformationCircleIcon className={iconClass} />;
      case 'community':
        return <CheckIcon className={iconClass} />;
      default:
        return <BellIcon className={iconClass} />;
    }
  };

  const getNotificationBgColor = (type, isRead) => {
    const baseClasses = isRead ? 'bg-gray-50' : 'bg-white';
    const borderColor = isRead ? 'border-gray-200' : 'border-blue-200';
    return `${baseClasses} ${borderColor}`;
  };

  const filteredNotifications = notifications.filter(notification => {
    // Apply filters
    if (filter === 'unread' && notification.is_read) return false;
    if (filter === 'read' && !notification.is_read) return false;
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        notification.title.toLowerCase().includes(query) ||
        notification.message.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      toast.success(t('notification_marked_as_read'));
    } catch (error) {
      toast.error(t('failed_to_update_notification'));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setLoading(true);
      await axios.patch(`${API}/notifications/mark-all-read`);
      await fetchNotifications();
      toast.success(t('all_notifications_marked_as_read'));
    } catch (error) {
      toast.error(t('failed_to_update_notifications'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotification(notificationId);
      toast.success(t('notification_deleted'));
    } catch (error) {
      toast.error(t('failed_to_delete_notification'));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedNotifications.length === 0) return;
    
    try {
      setLoading(true);
      
      if (action === 'mark_read') {
        await Promise.all(
          selectedNotifications.map(id => markAsRead(id))
        );
        toast.success(t('selected_notifications_marked_as_read'));
      } else if (action === 'delete') {
        await Promise.all(
          selectedNotifications.map(id => deleteNotification(id))
        );
        toast.success(t('selected_notifications_deleted'));
      }
      
      setSelectedNotifications([]);
    } catch (error) {
      toast.error(t('bulk_action_failed'));
    } finally {
      setLoading(false);
    }
  };

  const toggleNotificationSelection = (notificationId) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const selectAllNotifications = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Enhanced Header Section */}
      <div className="bg-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-4 rounded-2xl shadow-xl relative">
                <BellIcon className="h-12 w-12 text-white" />
                {unreadCount > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[1.5rem] h-6 flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              {t('notifications')}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {t('manage_your_notifications')}
            </p>
          </div>
          
          {/* Enhanced Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`group px-6 py-3 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 rtl:space-x-reverse ${
                showFilters 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl' 
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
              }`}
            >
              <FunnelIcon className="h-5 w-5" />
              <span>{t('filters')}</span>
            </button>
            
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="group bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-3 rtl:space-x-reverse disabled:opacity-50"
              >
                <CheckIcon className="h-5 w-5" />
                <span>{t('mark_all_read')} ({unreadCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Enhanced Filters Section */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6">{t('notification_filters')}</h3>
            
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <MagnifyingGlassIcon className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('search_notifications')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 rtl:pr-12 rtl:pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {notificationTypes.map((type, index) => {
                const colors = [
                  'from-blue-500 to-cyan-500',
                  'from-orange-500 to-red-500',
                  'from-green-500 to-emerald-500',
                  'from-purple-500 to-pink-500',
                  'from-indigo-500 to-purple-500'
                ];
                return (
                  <button
                    key={type.value}
                    onClick={() => setTypeFilter(type.value)}
                    className={`p-4 rounded-2xl text-center transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                      typeFilter === type.value
                        ? `bg-gradient-to-br ${colors[index % colors.length]} text-white shadow-xl`
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                    }`}
                  >
                    <type.icon className="h-6 w-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">{type.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Status Filter */}
            <div className="mt-6">
              <div className="flex flex-wrap gap-2">
                {['all', 'unread', 'read'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      filter === status
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {t(`filter_${status}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      {/* Bulk Actions */}
      {selectedNotifications.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedNotifications.length} {t('notifications_selected')}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkAction('mark_read')}
                disabled={loading}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {t('mark_as_read')}
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                disabled={loading}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select All */}
      {filteredNotifications.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={selectAllNotifications}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {selectedNotifications.length === filteredNotifications.length
              ? t('deselect_all')
              : t('select_all')
            }
          </button>
          <span className="text-sm text-gray-500">
            {filteredNotifications.length} {t('notifications')}
          </span>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {loading && filteredNotifications.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 text-center">
              {searchQuery || filter !== 'all' || typeFilter !== 'all'
                ? t('no_matching_notifications')
                : t('no_notifications')
              }
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || filter !== 'all' || typeFilter !== 'all'
                ? t('try_adjusting_filters')
                : t('notifications_will_appear_here')
              }
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`border rounded-lg transition-all duration-200 hover:shadow-md ${getNotificationBgColor(notification.type, notification.is_read)}`}
            >
              <div className="p-4">
                <div className="flex items-start space-x-4">
                  {/* Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedNotifications.includes(notification.id)}
                    onChange={() => toggleNotificationSelection(notification.id)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />

                  {/* Notification Icon */}
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type, notification.priority)}
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className={`text-sm font-medium ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <p className={`mt-1 text-sm ${notification.is_read ? 'text-gray-500' : 'text-gray-700'}`}>
                          {notification.message}
                        </p>
                        <p className="mt-2 text-xs text-gray-400">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title={t('mark_as_read')}
                          >
                            <CheckIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteNotification(notification.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title={t('delete')}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Action Button (if notification has action) */}
                    {notification.action_url && (
                      <div className="mt-3">
                        <button
                          onClick={() => window.location.href = notification.action_url}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                        >
                          {notification.action_text || t('view_details')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More (if pagination is needed) */}
      {filteredNotifications.length > 0 && filteredNotifications.length % 20 === 0 && (
        <div className="text-center mt-8">
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? t('loading') : t('load_more')}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;