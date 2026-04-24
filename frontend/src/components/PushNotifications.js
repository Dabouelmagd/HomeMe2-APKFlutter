import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PushNotifications = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [vapidPublicKey, setVapidPublicKey] = useState(null);
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [errorDetail, setErrorDetail] = useState(null);

  useEffect(() => {
    checkPushSupport();
    loadVapidKey();
    loadPreferences();
  }, []);

  // Re-check subscription status whenever support flips to true (avoids stale closure)
  useEffect(() => {
    if (!isSupported) return;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error('Error checking subscription status:', error);
      }
    })();
  }, [isSupported]);

  const loadVapidKey = async () => {
    try {
      const response = await axios.get(`${API}/push/public-key`);
      setVapidPublicKey(response.data.public_key);
    } catch (error) {
      console.error('Failed to load VAPID key:', error);
    }
  };

  const checkPushSupport = () => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      registerServiceWorker();
    }
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/push-sw.js');
      console.log('Push Service Worker registered:', registration);
      
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
          const url = event.data.url;
          if (url) {
            window.location.href = url;
          }
        }
      });
      
    } catch (error) {
      console.error('Service Worker registration failed:', error);
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

  const arrayBufferToBase64url = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const subscribeToPush = async () => {
    setErrorDetail(null);
    if (!isSupported) {
      const msg = t('push_not_supported_browser', 'متصفحك لا يدعم الإشعارات الفورية. جرّب Chrome أو Edge أو Firefox الحديث.');
      setErrorDetail(msg);
      toast.error(msg);
      return;
    }
    if (!vapidPublicKey) {
      // Try to reload it once before failing
      try {
        const res = await axios.get(`${API}/push/public-key`);
        setVapidPublicKey(res.data.public_key);
      } catch (_) { /* ignore */ }
      if (!vapidPublicKey) {
        const msg = t('push_key_missing', 'تعذّر تحميل مفتاح الإشعارات. حاول إعادة تحميل الصفحة.');
        setErrorDetail(msg);
        toast.error(msg);
        return;
      }
    }

    setLoading(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'denied') {
        const msg = t('push_permission_denied_help', 'تم حظر الإشعارات في إعدادات المتصفح. اضغط على أيقونة القفل 🔒 بجانب عنوان الموقع → الإشعارات → السماح، ثم أعد تحميل الصفحة.');
        setErrorDetail(msg);
        toast.error(msg, { duration: 7000 });
        setLoading(false);
        return;
      }

      if (permissionResult !== 'granted') {
        const msg = t('push_permission_not_granted', 'لم تتم الموافقة على الإشعارات. أعد المحاولة واضغط "السماح" في نافذة المتصفح.');
        setErrorDetail(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64url(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64url(subscription.getKey('auth'))
        },
        user_agent: navigator.userAgent
      };

      const token = localStorage.getItem('token');
      await axios.post(`${API}/push/subscribe`, subscriptionData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setIsSubscribed(true);
      toast.success(t('push_enabled_success', 'تم تفعيل الإشعارات الفورية بنجاح ✓'));

      setTimeout(() => {
        sendTestNotification();
      }, 1000);

    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      const reason = error?.name === 'NotAllowedError'
        ? t('push_blocked_browser', 'الإشعارات محظورة في المتصفح. فعّلها من إعدادات الموقع 🔒 ثم أعد المحاولة.')
        : (error?.message || t('push_subscription_failed', 'فشل تفعيل الإشعارات. حاول مرة أخرى.'));
      setErrorDetail(reason);
      toast.error(reason, { duration: 6000 });
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
        const token = localStorage.getItem('token');
        await axios.delete(`${API}/push/unsubscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      setIsSubscribed(false);
      toast.success(t('push_unsubscribed', 'تم إيقاف الإشعارات الفورية'));
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      toast.error(t('push_unsubscribe_failed', 'فشل إيقاف الإشعارات. حاول مرة أخرى.'));
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    setTestStatus('sending');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/push/test`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTestStatus(response.data.success ? 'success' : 'error');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      setTestStatus('error');
    }
    setTimeout(() => setTestStatus(null), 3000);
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
          {t('push_notifications_not_supported')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Subscription Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-center text-center text-gray-900 mb-4">
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
                data-testid="push-enable-btn"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                )}
                {loading ? t('common.loading', 'جاري...') : t('notificationCenter.enable')}
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

        {/* Inline error / permission-denied helper */}
        {(errorDetail || permission === 'denied') && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg" data-testid="push-error-panel">
            <p className="text-amber-800 text-sm leading-relaxed">
              {errorDetail || t('push_permission_denied_help', 'تم حظر الإشعارات في إعدادات المتصفح. اضغط على أيقونة القفل 🔒 بجانب عنوان الموقع → الإشعارات → السماح، ثم أعد تحميل الصفحة.')}
            </p>
            {permission === 'denied' && (
              <a
                href="https://support.google.com/chrome/answer/3220216?hl=ar"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-amber-700 underline hover:text-amber-900"
              >
                {t('push_help_link', 'كيف أُفعّل الإشعارات في المتصفح؟')}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      {isSubscribed && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-center text-center text-gray-900 mb-4">
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
                  {t('notificationCenter.compoundAnnouncements')}
                </label>
                <p className="text-sm text-gray-500">
                  {t('notificationCenter.compoundAnnouncementsDesc')}
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
                    {t('notificationCenter.quietHours')}
                  </label>
                  <p className="text-sm text-gray-500">
                    {t('notificationCenter.quietHoursDesc')}
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
                      {t('notificationCenter.from')}
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
                      {t('notificationCenter.to')}
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