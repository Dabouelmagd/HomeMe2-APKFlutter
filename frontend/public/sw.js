// Service Worker for Push Notifications
const CACHE_NAME = 'homeme-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', event => {
  console.log('Push event received:', event);
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      console.error('Error parsing push data:', e);
      notificationData = {
        title: 'HomeMe',
        body: event.data.text() || 'New message received',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png'
      };
    }
  }

  const options = {
    title: notificationData.title || 'HomeMe',
    body: notificationData.body || 'New message received',
    icon: notificationData.icon || '/icons/icon-192x192.png',
    badge: notificationData.badge || '/icons/badge-72x72.png',
    image: notificationData.image,
    data: {
      chatId: notificationData.chatId,
      messageId: notificationData.messageId,
      senderId: notificationData.senderId,
      url: notificationData.url || '/chat'
    },
    actions: [
      {
        action: 'reply',
        title: 'Reply',
        icon: '/icons/reply.png'
      },
      {
        action: 'view',
        title: 'View Chat',
        icon: '/icons/view.png'
      }
    ],
    tag: notificationData.chatId || 'default',
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  if (action === 'reply') {
    // Handle reply action (could open a quick reply interface)
    event.waitUntil(
      clients.openWindow(`/chat?reply=${data.chatId}`)
    );
  } else if (action === 'view' || !action) {
    // Default action - open the chat
    const urlToOpen = data.url || '/chat';
    
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      }).then(clientList => {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes('/chat') && 'focus' in client) {
            // Focus existing chat window
            return client.focus().then(() => {
              // Send message to client to navigate to specific chat
              client.postMessage({
                type: 'NAVIGATE_TO_CHAT',
                chatId: data.chatId
              });
            });
          }
        }
        
        // If no existing window, open new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Background sync for failed message sends
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync-messages') {
    event.waitUntil(
      // Handle background sync for messages that failed to send
      console.log('Background sync triggered for messages')
    );
  }
});

// Message event - communication with main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});