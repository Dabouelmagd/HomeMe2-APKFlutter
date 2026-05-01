import { useEffect, useRef } from 'react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const STORAGE_KEY = 'app_build_version';
const POLL_MS = 5 * 60 * 1000; // every 5 minutes

/**
 * AppVersionGuard — headless component that auto-refreshes the browser
 * when a new deployment is detected.
 *
 * How it works:
 *   1. On mount, fetch /api/version → { version }. If no version is saved
 *      yet, store it silently (first visit — nothing to compare).
 *   2. Poll /api/version every 5 minutes AND whenever the tab regains focus.
 *   3. If the fetched version differs from the stored one → we just deployed.
 *      Clear service workers + cache storage → preserve the auth token so
 *      the user doesn't lose their session → hard-reload the page.
 *
 * No UI — invisible and idempotent. Safe to mount once at the App root.
 */
const AppVersionGuard = () => {
  const reloadingRef = useRef(false);

  useEffect(() => {
    let timer;

    const hardReload = async () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;

      // Show a friendly toast so the refresh isn't a surprise.
      // Sonner is loaded asynchronously to avoid adding to the initial bundle.
      try {
        const { toast } = await import('sonner');
        toast.success('🔄 تم تحديث التطبيق — جارٍ إعادة التحميل...', {
          duration: 1800,
          position: 'top-center',
        });
      } catch { /* ignore toast failure — reload still proceeds */ }

      // Short pause so the user sees the message before the hard reload.
      await new Promise((r) => setTimeout(r, 1400));

      // Preserve auth so the user lands back inside the app
      const token = localStorage.getItem('token');
      const tabSessionKeys = Object.keys(localStorage).filter((k) => k.startsWith('session_'));
      const preserved = { token };
      tabSessionKeys.forEach((k) => { preserved[k] = localStorage.getItem(k); });

      // Clear browser caches (images, JS chunks)
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch { /* ignore */ }

      // Unregister every service worker (stale CRA service worker was a common culprit)
      try {
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
      } catch { /* ignore */ }

      // Restore preserved auth + session keys
      Object.entries(preserved).forEach(([k, v]) => { if (v != null) localStorage.setItem(k, v); });

      // Hard-reload bypassing HTTP cache (append cache-bust query so CDN also refetches)
      const url = new URL(window.location.href);
      url.searchParams.set('_v', Date.now().toString());
      window.location.replace(url.toString());
    };

    const check = async () => {
      try {
        const res = await fetch(`${API}/version`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const current = data?.version;
        if (!current) return;
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          localStorage.setItem(STORAGE_KEY, current);
          return;
        }
        if (stored !== current) {
          localStorage.setItem(STORAGE_KEY, current);
          // eslint-disable-next-line no-console
          console.info('[AppVersionGuard] New deployment detected — clearing cache and reloading.');
          hardReload();
        }
      } catch { /* network hiccup — skip this round */ }
    };

    // Initial check after a short delay so we don't race with auth boot
    const firstTimeout = setTimeout(check, 1500);
    // Periodic check
    timer = setInterval(check, POLL_MS);
    // Check on tab focus (covers the "user left laptop overnight" case)
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return null;
};

export default AppVersionGuard;
