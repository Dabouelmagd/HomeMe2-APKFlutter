/* HomeMe PWA Service Worker — minimal & safe.
   Critical rule: NEVER intercept non-GET requests. The legacy SW used
   `event.respondWith(fetch(event.request))` for every request, which
   leaves POST/PUT/DELETE bodies hanging in some browsers (caused the
   silent login hang). Only GETs are passed through here, and even then
   we don't cache — we let the browser handle them normally.
*/
const CACHE_VERSION = 'v5.0.0-safe';

self.addEventListener('install', (event) => {
  // Activate immediately so old SWs don't keep controlling pages.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Drop any old caches from previous SW versions.
    try {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch (e) { /* non-fatal */ }
    await self.clients.claim();
  })());
});

// IMPORTANT: do NOT call event.respondWith() at all for non-GET requests.
// For GETs, also skip — let the browser network stack handle them. This
// keeps the SW present (so push notifications & install prompt work) but
// avoids any chance of breaking auth/POST flows.
self.addEventListener('fetch', () => { /* passthrough */ });

// Web Push handler (kept so push notifications continue to work).
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'HomeMe', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'HomeMe';
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    data: data.data || {},
    tag: data.tag || 'homeme-notification',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/app/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const c of clientsArr) {
        if ('focus' in c) { c.navigate(url); return c.focus(); }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
