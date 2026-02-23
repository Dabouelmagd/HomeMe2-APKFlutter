// HomeMe Push Notification Service Worker
// Handles incoming push messages and notification interactions

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received');
  
  let data = {
    title: 'إشعار جديد',
    body: 'لديك إشعار جديد من HomeMe',
    url: '/',
    tag: 'notification',
    requireInteraction: false
  };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: data.tag || 'notification',
    requireInteraction: data.requireInteraction || false,
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      notificationId: data.notificationId,
      notificationType: data.notificationType,
      timestamp: data.timestamp
    },
    actions: getNotificationActions(data.tag)
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  // Handle action buttons
  if (event.action === 'pay') {
    event.waitUntil(clients.openWindow('/app/financial'));
    return;
  }
  
  if (event.action === 'view') {
    event.waitUntil(clients.openWindow(url));
    return;
  }
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Default: open the URL or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: url,
            data: event.notification.data
          });
          return client.focus();
        }
      }
      // Open new window if no existing window
      return clients.openWindow(url);
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed');
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[Service Worker] Push subscription changed');
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(self.VAPID_PUBLIC_KEY)
    }).then((newSubscription) => {
      return fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: newSubscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(newSubscription.getKey('p256dh')),
            auth: arrayBufferToBase64(newSubscription.getKey('auth'))
          }
        })
      });
    }).catch((err) => {
      console.error('[Service Worker] Re-subscription failed:', err);
    })
  );
});

// Get notification actions based on type
function getNotificationActions(tag) {
  if (tag === 'invoice' || tag === 'payment-reminder') {
    return [
      { action: 'pay', title: 'ادفع الآن' },
      { action: 'dismiss', title: 'لاحقاً' }
    ];
  }
  
  if (tag === 'visitor') {
    return [
      { action: 'view', title: 'عرض' },
      { action: 'dismiss', title: 'موافق' }
    ];
  }
  
  return [
    { action: 'view', title: 'عرض' }
  ];
}

// Helper functions
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

console.log('[Service Worker] Push notification service worker loaded');
