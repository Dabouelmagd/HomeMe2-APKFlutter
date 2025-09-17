import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth, useNotifications } from '../App';
import { toast } from 'sonner';
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NotificationCenter = () => {
  const { user } = useAuth();
  const { notifications: realtimeNotifications, clearAll } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewNotification, setShowNewNotification] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    content: '',
    recipient_ids: []
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications/my`);
      setNotifications(response.data);
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API}/notifications`, notificationForm);
      toast.success('Notification sent successfully!');
      setShowNewNotification(false);
      setNotificationForm({
        title: '',
        content: '',
        recipient_ids: []
      });
      fetchNotifications();
    } catch (error) {
      toast.error('Failed to send notification');
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API}/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, is_read: { ...notif.is_read, [user.id]: true } }
            : notif
        )
      );
    } catch (error) {
      toast.error('Failed to mark notification as read');
    }
  };

  const handleInputChange = (e) => {
    setNotificationForm({
      ...notificationForm,
      [e.target.name]: e.target.value
    });
  };

  const isRead = (notification) => {
    return notification.is_read && notification.is_read[user?.id];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notification Center</h1>
            <p className="text-gray-600 mt-2">
              Stay updated with compound announcements and messages
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowNewNotification(true)}
                className="btn btn-primary flex items-center space-x-2"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Send Notification</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <TrashIcon className="h-4 w-4" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Notifications */}
      {realtimeNotifications.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Updates</h2>
          <div className="space-y-3">
            {realtimeNotifications.slice(0, 3).map((notification, index) => (
              <div
                key={index}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3"
              >
                <BellIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900">{notification.title}</h4>
                  <p className="text-sm text-blue-700 mt-1">{notification.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-xl shadow-sm border p-6 transition-all ${
                isRead(notification)
                  ? 'border-gray-200 opacity-75'
                  : 'border-blue-200 ring-1 ring-blue-100'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className={`p-2 rounded-lg ${
                    isRead(notification) ? 'bg-gray-100' : 'bg-blue-100'
                  }`}>
                    <BellIcon className={`h-6 w-6 ${
                      isRead(notification) ? 'text-gray-500' : 'text-blue-600'
                    }`} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`text-lg font-semibold ${
                        isRead(notification) ? 'text-gray-600' : 'text-gray-900'
                      }`}>
                        {notification.title}
                      </h3>
                      <p className={`mt-2 ${
                        isRead(notification) ? 'text-gray-500' : 'text-gray-700'
                      }`}>
                        {notification.content}
                      </p>
                    </div>
                    {!isRead(notification) && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="ml-4 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <span>
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                    <div className="flex items-center space-x-2">
                      {isRead(notification) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <CheckIcon className="h-3 w-3 mr-1" />
                          Read
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {notification.recipient_ids.length === 0 ? 'Broadcast' : 'Direct'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
            <p className="text-gray-600">
              You'll see compound updates and announcements here
            </p>
          </div>
        )}
      </div>

      {/* Send Notification Modal */}
      {showNewNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-90vh overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Send Notification</h3>
                <button
                  onClick={() => setShowNewNotification(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSendNotification} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={notificationForm.title}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                    placeholder="Enter notification title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    name="content"
                    value={notificationForm.content}
                    onChange={handleInputChange}
                    rows={4}
                    className="form-input"
                    required
                    placeholder="Enter notification message..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipients
                  </label>
                  <select
                    name="recipient_type"
                    className="form-input"
                    onChange={(e) => {
                      if (e.target.value === 'all') {
                        setNotificationForm(prev => ({ ...prev, recipient_ids: [] }));
                      }
                    }}
                  >
                    <option value="all">All Residents (Broadcast)</option>
                    <option value="specific">Specific Recipients</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Broadcast sends to all compound residents
                  </p>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewNotification(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1 flex items-center justify-center space-x-2"
                  >
                    <BellIcon className="h-4 w-4" />
                    <span>Send Notification</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;