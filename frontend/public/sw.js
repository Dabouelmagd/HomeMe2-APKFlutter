// HomeMe PWA Service Worker
const CACHE_VERSION = Date.now(); // Force new cache on every update
const CACHE_NAME = `homeme-pwa-v${CACHE_VERSION}`;
const STATIC_CACHE = `homeme-static-v${CACHE_VERSION}`;
const DYNAMIC_CACHE = `homeme-dynamic-v${CACHE_VERSION}`;

// Cache resources for offline functionality
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
  '/chat',
  '/dashboard',
  '/notifications',
  '/settings'
];

// API endpoints to cache for offline
const API_CACHE_PATTERNS = [
  /\/api\/auth\/me/,
  /\/api\/chats$/,
  /\/api\/notifications\/preferences/
];

// Install event - cache static resources
self.addEventListener('install', event => {
  console.log('HomeMe PWA: Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => {
        console.log('HomeMe PWA: Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, {credentials: 'same-origin'})));
      })
    ]).then(() => {
      console.log('HomeMe PWA: Service Worker installed successfully');
      return self.skipWaiting();
    }).catch(error => {
      console.error('HomeMe PWA: Service Worker install failed:', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('HomeMe PWA: Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('HomeMe PWA: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('HomeMe PWA: Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - network first with cache fallback strategy
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (STATIC_ASSETS.some(asset => url.pathname === asset) || 
      url.pathname.startsWith('/static/')) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.destination === 'document') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default handling for other requests
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request);
    })
  );
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request.clone());
    
    // Cache successful responses for specific API endpoints
    if (networkResponse.ok && API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('HomeMe PWA: Network request failed, trying cache:', url.pathname);
    
    // Try cache as fallback
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for critical endpoints
    if (url.pathname === '/api/auth/me') {
      return new Response(JSON.stringify({
        error: 'offline',
        message: 'You are currently offline'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Handle static assets with network-first strategy for JS files during development
async function handleStaticRequest(request) {
  const url = new URL(request.url);
  
  // For JS files, try network first to get latest changes
  if (url.pathname.includes('.js') || url.pathname.includes('main.')) {
    try {
      console.log('HomeMe PWA: Fetching latest JS from network:', url.pathname);
      const networkResponse = await fetch(request);
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    } catch (error) {
      console.log('HomeMe PWA: Network failed for JS, trying cache:', url.pathname);
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  }
  
  // For other static assets, use cache-first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.error('HomeMe PWA: Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Return cached shell for offline navigation
    const cachedResponse = await caches.match('/');
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page as last resort
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>HomeMe - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;
            }
            .offline-icon { font-size: 64px; margin-bottom: 20px; }
            .offline-title { font-size: 24px; margin-bottom: 10px; }
            .offline-desc { font-size: 16px; opacity: 0.8; }
          </style>
        </head>
        <body>
          <div class="offline-icon">📱</div>
          <h1 class="offline-title">HomeMe is Offline</h1>
          <p class="offline-desc">Please check your internet connection and try again.</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Push notification handling
self.addEventListener('push', event => {
  console.log('HomeMe PWA: Push notification received:', event);
  
  let notificationData = {
    title: 'HomeMe',
    body: 'New notification received',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'homeme-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Dismiss',
        icon: '/icons/icon-72x72.png'
      }
    ]
  };
  
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (e) {
      console.error('HomeMe PWA: Error parsing push data:', e);
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('HomeMe PWA: Notification clicked:', event);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data || {};
  
  if (action === 'close') {
    return;
  }
  
  // Default action or 'open' action
  let urlToOpen = '/dashboard';
  
  if (data.chatId) {
    urlToOpen = `/chat?open=${data.chatId}`;
  } else if (data.url) {
    urlToOpen = data.url;
  }
  
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // Check if app is already open
      for (let client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NAVIGATE_TO',
            url: urlToOpen
          });
          return client.focus();
        }
      }
      
      // If no existing window, open new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync for offline message queue
self.addEventListener('sync', event => {
  console.log('HomeMe PWA: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncOfflineMessages());
  }
});

// Sync offline messages when connection is restored
async function syncOfflineMessages() {
  try {
    // Get offline messages from IndexedDB or cache
    // This would integrate with a more sophisticated offline storage system
    console.log('HomeMe PWA: Syncing offline messages...');
    
    // Placeholder for offline message sync logic
    // In a full implementation, this would:
    // 1. Get pending messages from local storage
    // 2. Send them to the server
    // 3. Update local storage with results
    
    return Promise.resolve();
  } catch (error) {
    console.error('HomeMe PWA: Failed to sync offline messages:', error);
    throw error;
  }
}

// Message handling from main thread
self.addEventListener('message', event => {
  console.log('HomeMe PWA: Message received:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'GET_VERSION':
        event.ports[0].postMessage({ version: CACHE_NAME });
        break;
      case 'CACHE_URLS':
        event.waitUntil(
          caches.open(DYNAMIC_CACHE).then(cache => {
            return cache.addAll(event.data.urls);
          })
        );
        break;
      case 'CLEAR_ALL_CACHES':
        console.log('HomeMe PWA: Clearing all caches on demand');
        event.waitUntil(
          caches.keys().then(cacheNames => {
            return Promise.all(
              cacheNames.map(cacheName => {
                console.log('HomeMe PWA: Deleting cache:', cacheName);
                return caches.delete(cacheName);
              })
            );
          }).then(() => {
            console.log('HomeMe PWA: All caches cleared, reloading...');
            // Force reload all clients
            return self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({ type: 'CACHE_CLEARED' });
              });
            });
          })
        );
        break;
    }
  }
});

// Error handling
self.addEventListener('error', event => {
  console.error('HomeMe PWA: Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('HomeMe PWA: Unhandled promise rejection:', event.reason);
});