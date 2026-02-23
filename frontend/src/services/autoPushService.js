/**
 * Auto Push Notifications Service
 * Automatically subscribes users to push notifications on login
 */

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

/**
 * Check if browser supports push notifications
 */
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
};

/**
 * Check if user is already subscribed
 */
export const isUserSubscribed = async () => {
  if (!isPushSupported()) return false;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
};

/**
 * Register the push service worker
 */
export const registerPushServiceWorker = async () => {
  if (!isPushSupported()) return null;
  
  try {
    let registration = await navigator.serviceWorker.getRegistration('/push-sw.js');
    
    if (!registration) {
      registration = await navigator.serviceWorker.register('/push-sw.js', {
        scope: '/'
      });
      console.log('[AutoPush] Service Worker registered');
    }
    
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error('[AutoPush] Service Worker registration failed:', error);
    return null;
  }
};

/**
 * Get VAPID public key from server
 */
const getVapidPublicKey = async () => {
  try {
    const response = await fetch(`${API_URL}/api/push/public-key`);
    const data = await response.json();
    return data.public_key;
  } catch (error) {
    console.error('[AutoPush] Failed to get VAPID key:', error);
    return null;
  }
};

/**
 * Subscribe to push notifications
 */
const subscribeToPush = async (registration, vapidPublicKey, token) => {
  try {
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

    const response = await fetch(`${API_URL}/api/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(subscriptionData)
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription to server');
    }

    console.log('[AutoPush] Successfully subscribed to push notifications');
    return true;
  } catch (error) {
    console.error('[AutoPush] Subscription failed:', error);
    return false;
  }
};

/**
 * Auto-subscribe user to push notifications
 * Called after successful login
 */
export const autoSubscribeToPush = async () => {
  // Check browser support
  if (!isPushSupported()) {
    console.log('[AutoPush] Push notifications not supported');
    return false;
  }

  // Get token
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('[AutoPush] No auth token found');
    return false;
  }

  try {
    // Check if already subscribed
    const alreadySubscribed = await isUserSubscribed();
    if (alreadySubscribed) {
      console.log('[AutoPush] User already subscribed');
      // Still sync with server in case subscription changed
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const subscriptionData = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64url(subscription.getKey('p256dh')),
            auth: arrayBufferToBase64url(subscription.getKey('auth'))
          },
          user_agent: navigator.userAgent
        };

        await fetch(`${API_URL}/api/push/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(subscriptionData)
        });
      }
      return true;
    }

    // Register service worker
    const registration = await registerPushServiceWorker();
    if (!registration) {
      console.log('[AutoPush] Service worker registration failed');
      return false;
    }

    // Get VAPID key
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      console.log('[AutoPush] Failed to get VAPID key');
      return false;
    }

    // Request permission (browser will show prompt)
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.log('[AutoPush] Permission denied by user');
      return false;
    }

    // Subscribe
    const success = await subscribeToPush(registration, vapidPublicKey, token);
    return success;

  } catch (error) {
    console.error('[AutoPush] Auto-subscribe error:', error);
    return false;
  }
};

/**
 * Initialize push notifications on app load (if user is logged in)
 */
export const initializePushNotifications = async () => {
  const token = localStorage.getItem('token');
  if (!token) return;

  // Small delay to not block initial render
  setTimeout(async () => {
    await autoSubscribeToPush();
  }, 2000);
};

export default {
  isPushSupported,
  isUserSubscribed,
  registerPushServiceWorker,
  autoSubscribeToPush,
  initializePushNotifications
};
