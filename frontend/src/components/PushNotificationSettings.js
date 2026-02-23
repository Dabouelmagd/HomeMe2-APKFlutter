import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Convert base64url to Uint8Array
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

// Convert ArrayBuffer to base64url
const arrayBufferToBase64url = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permission, setPermission] = useState('default');

  // Check browser support
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
      }
    };
    
    checkSupport();
  }, []);

  // Check existing subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported) {
        setIsLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('Error checking subscription:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('المتصفح لا يدعم الإشعارات الفورية');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        setError('تم رفض إذن الإشعارات');
        setIsLoading(false);
        return false;
      }

      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
      
      if (!registration) {
        registration = await navigator.serviceWorker.register('/push-sw.js', {
          scope: '/'
        });
        await navigator.serviceWorker.ready;
      }

      // Get VAPID public key from server
      const token = localStorage.getItem('token');
      const keyResponse = await fetch(`${API_URL}/api/push/public-key`);
      const { public_key } = await keyResponse.json();

      if (!public_key) {
        throw new Error('لم يتم الحصول على مفتاح التشفير');
      }

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key)
      });

      // Send subscription to server
      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64url(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64url(subscription.getKey('auth'))
        },
        user_agent: navigator.userAgent
      };

      const response = await fetch(`${API_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subscriptionData)
      });

      if (!response.ok) {
        throw new Error('فشل تسجيل الاشتراك');
      }

      setIsSubscribed(true);
      return true;

    } catch (err) {
      console.error('Subscription error:', err);
      setError(err.message || 'حدث خطأ أثناء تفعيل الإشعارات');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Notify server
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/api/push/unsubscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }

      setIsSubscribed(false);
      return true;

    } catch (err) {
      console.error('Unsubscription error:', err);
      setError(err.message || 'حدث خطأ أثناء إلغاء الاشتراك');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/push/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Test notification error:', err);
      return { success: false, message: err.message };
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    permission,
    subscribe,
    unsubscribe,
    sendTestNotification
  };
};

// Push Notification Settings Component
const PushNotificationSettings = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    permission,
    subscribe,
    unsubscribe,
    sendTestNotification
  } = usePushNotifications();

  const [testStatus, setTestStatus] = useState(null);

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleTestNotification = async () => {
    setTestStatus('sending');
    const result = await sendTestNotification();
    setTestStatus(result.success ? 'success' : 'error');
    setTimeout(() => setTestStatus(null), 3000);
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-700 text-sm">
          {t('push_not_supported', 'المتصفح لا يدعم الإشعارات الفورية')}
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {t('push_notifications', 'الإشعارات الفورية')}
            </h3>
            <p className="text-sm text-gray-500">
              {t('push_notifications_desc', 'استلم إشعارات فورية للفواتير والتذكيرات والزوار')}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isSubscribed ? 'bg-blue-600' : 'bg-gray-200'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isSubscribed ? (isRTL ? '-translate-x-6' : 'translate-x-6') : (isRTL ? '-translate-x-1' : 'translate-x-1')
            }`}
          />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {permission === 'denied' && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-700 text-sm">
            {t('push_permission_denied', 'تم رفض إذن الإشعارات. يرجى تفعيلها من إعدادات المتصفح.')}
          </p>
        </div>
      )}

      {isSubscribed && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{t('push_active', 'الإشعارات الفورية مفعّلة')}</span>
          </div>

          <button
            onClick={handleTestNotification}
            disabled={testStatus === 'sending'}
            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
          >
            {testStatus === 'sending' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                {t('sending', 'جاري الإرسال...')}
              </span>
            ) : testStatus === 'success' ? (
              <span className="text-green-600">{t('test_sent', 'تم إرسال الإشعار التجريبي ✓')}</span>
            ) : testStatus === 'error' ? (
              <span className="text-red-600">{t('test_failed', 'فشل الإرسال ✗')}</span>
            ) : (
              t('send_test_notification', 'إرسال إشعار تجريبي')
            )}
          </button>

          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {t('notification_types', 'أنواع الإشعارات:')}
            </h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-blue-500">📄</span>
                {t('invoice_notifications', 'فواتير جديدة')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-500">⏰</span>
                {t('payment_reminders', 'تذكيرات الدفع')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">🚪</span>
                {t('visitor_notifications', 'وصول الزوار')}
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PushNotificationSettings;
