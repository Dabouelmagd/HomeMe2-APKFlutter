import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// VAPID public key - in production, this would be from environment variables
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HI0DLLf3glowH-W2jEJN6kVBvBfLZMFkOBdMD7WJIrZMlGfJQH6g8JqK-4';

const PushNotifications = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkPushSupport();
    checkSubscriptionStatus();
    loadPreferences();
  }, []);

  const checkPushSupport = () => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    
    if (supported) {
      registerServiceWorker();
    }
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NAVIGATE_TO_CHAT') {
          // Handle navigation from notification click
          const chatId = event.data.chatId;
          window.location.href = `/chat?open=${chatId}`;
        }
      });
      
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  };

  const checkSubscriptionStatus = async () => {
    if (!isSupported) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      const response = await axios.get(`${API}/notifications/preferences`);
      setPreferences(response.data.preferences || {});
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if (!isSupported) {
      alert('Push notifications are not supported in this browser');
      return;
    }

    setLoading(true);
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        alert('Push notifications permission was denied');
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Send subscription to backend
      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey('auth'))))
        }
      };

      await axios.post(`${API}/push/subscribe`, subscriptionData);
      
      setIsSubscribed(true);
      
      // Test notification
      setTimeout(() => {
        sendTestNotification();
      }, 1000);
      
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      alert('Failed to subscribe to push notifications');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!isSupported) return;

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await axios.delete(`${API}/push/unsubscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`);
      }
      
      setIsSubscribed(false);
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      alert('Failed to unsubscribe from push notifications');
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      await axios.post(`${API}/push/test`);
    } catch (error) {
      console.error('Failed to send test notification:', error);
    }
  };

  const updatePreferences = async (key, value) => {
    try {
      const updatedPreferences = { ...preferences, [key]: value };
      
      await axios.put(`${API}/notifications/preferences`, {
        [key]: value
      });
      
      setPreferences(updatedPreferences);
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          Push notifications are not supported in this browser.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Subscription Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {t('notificationCenter.pushNotifications')}
        </h3>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              {isSubscribed 
                ? t('notificationCenter.subscribed') 
                : t('notificationCenter.notSubscribed')
              }
            </p>
          </div>
          
          <div className="flex space-x-3">
            {!isSubscribed ? (
              <button
                onClick={subscribeToPush}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? t('common.loading') : t('notificationCenter.enable')}
              </button>
            ) : (
              <>
                <button
                  onClick={sendTestNotification}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {t('notificationCenter.testNotification')}
                </button>
                <button
                  onClick={unsubscribeFromPush}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? t('common.loading') : t('notificationCenter.disable')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      {isSubscribed && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t('notificationCenter.preferences')}
          </h3>
          
          <div className="space-y-4">
            {/* Message Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">
                  {t('notificationCenter.messageNotifications')}
                </label>
                <p className="text-sm text-gray-500">
                  {t('notificationCenter.messageNotificationsDesc')}
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.message_notifications !== false}
                onChange={(e) => updatePreferences('message_notifications', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            {/* Direct Chat Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">
                  {t('notificationCenter.directChats')}
                </label>
                <p className="text-sm text-gray-500">
                  {t('notificationCenter.directChatsDesc')}
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.direct_notifications !== false}
                onChange={(e) => updatePreferences('direct_notifications', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            {/* Group Chat Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">
                  {t('notificationCenter.groupChats')}
                </label>
                <p className="text-sm text-gray-500">
                  {t('notificationCenter.groupChatsDesc')}
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.group_notifications !== false}
                onChange={(e) => updatePreferences('group_notifications', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            {/* Compound Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">
                  {t('notifications.compoundAnnouncements')}
                </label>
                <p className="text-sm text-gray-500">
                  {t('notifications.compoundAnnouncementsDesc')}
                </p>
              </div>
              <input
                type="checkbox"
                checked={preferences.compound_notifications !== false}
                onChange={(e) => updatePreferences('compound_notifications', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>

            {/* Quiet Hours */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="text-sm font-medium text-gray-900">
                    {t('notifications.quietHours')}
                  </label>
                  <p className="text-sm text-gray-500">
                    {t('notifications.quietHoursDesc')}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.quiet_hours_enabled === true}
                  onChange={(e) => updatePreferences('quiet_hours_enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              {preferences.quiet_hours_enabled && (
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700">
                      {t('notifications.from')}
                    </label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_start || '22:00'}
                      onChange={(e) => updatePreferences('quiet_hours_start', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700">
                      {t('notifications.to')}
                    </label>
                    <input
                      type="time"
                      value={preferences.quiet_hours_end || '08:00'}
                      onChange={(e) => updatePreferences('quiet_hours_end', e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PushNotifications;