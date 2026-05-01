import { useEffect, useRef, useState } from 'react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const STORAGE_KEY = 'app_build_version';
const SNOOZE_KEY = 'app_update_snooze_until'; // epoch ms
const POLL_MS = 5 * 60 * 1000; // every 5 minutes
const SNOOZE_MS = 30 * 60 * 1000; // 30 minutes

/**
 * AppVersionGuard — detects new deployments and shows a friendly banner
 * instead of forcing a reload. The user controls when to update.
 *
 * How it works:
 *   1. Polls /api/version every 5 minutes (also on focus/visibility change).
 *   2. On first visit, silently records the current version.
 *   3. When the version changes:
 *        - if the user previously snoozed, stay quiet until snooze expires
 *        - otherwise show a top banner with "تحديث الآن" + "لاحقًا"
 *   4. "تحديث الآن" → clears caches + service workers (preserves auth) and
 *       hard-reloads with a cache-bust query.
 *      "لاحقًا" → snoozes the banner for 30 minutes.
 */
const AppVersionGuard = () => {
  const [newVersion, setNewVersion] = useState(null); // string when banner should show
  const [reloading, setReloading] = useState(false);
  const reloadingRef = useRef(false);

  useEffect(() => {
    let timer;

    const isSnoozed = () => {
      const v = parseInt(localStorage.getItem(SNOOZE_KEY) || '0', 10);
      return v && v > Date.now();
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
        if (stored !== current && !isSnoozed()) {
          // Don't update STORAGE_KEY yet — only after the user confirms,
          // so the banner re-appears on next poll if they navigate away.
          setNewVersion(current);
        }
      } catch { /* network hiccup */ }
    };

    const firstTimeout = setTimeout(check, 1500);
    timer = setInterval(check, POLL_MS);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const hardReload = async () => {
    if (reloadingRef.current) return;
    reloadingRef.current = true;
    setReloading(true);

    // Persist the new version so we don't loop into the banner after reload.
    if (newVersion) localStorage.setItem(STORAGE_KEY, newVersion);
    localStorage.removeItem(SNOOZE_KEY);

    // Preserve auth + per-tab session keys.
    const token = localStorage.getItem('token');
    const tabSessionKeys = Object.keys(localStorage).filter((k) => k.startsWith('session_'));
    const preserved = { token };
    tabSessionKeys.forEach((k) => { preserved[k] = localStorage.getItem(k); });

    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch { /* ignore */ }

    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch { /* ignore */ }

    Object.entries(preserved).forEach(([k, v]) => { if (v != null) localStorage.setItem(k, v); });

    const url = new URL(window.location.href);
    url.searchParams.set('_v', Date.now().toString());
    window.location.replace(url.toString());
  };

  const snooze = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    setNewVersion(null);
  };

  if (!newVersion) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="app-update-banner"
      dir="rtl"
      className="fixed top-0 inset-x-0 z-[9999] pointer-events-none"
    >
      <div className="pointer-events-auto mx-auto max-w-3xl m-3">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border border-violet-300/30 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white backdrop-blur-md">
          <div className="text-2xl shrink-0" aria-hidden>📦</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm md:text-base truncate">
              إصدار جديد متاح من التطبيق
            </div>
            <div className="text-[11px] md:text-xs text-violet-100/90 truncate">
              تم نشر تحديث جديد. اضغطي تحديث الآن للحصول على آخر التغييرات.
            </div>
          </div>
          <button
            type="button"
            onClick={hardReload}
            disabled={reloading}
            className="shrink-0 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-bold rounded-xl bg-white text-violet-700 hover:bg-violet-50 transition disabled:opacity-60"
            data-testid="app-update-reload-btn"
          >
            {reloading ? '...جارٍ التحديث' : '🔄 تحديث الآن'}
          </button>
          <button
            type="button"
            onClick={snooze}
            disabled={reloading}
            className="shrink-0 px-2 md:px-3 py-1.5 md:py-2 text-[11px] md:text-xs font-medium rounded-xl bg-white/10 hover:bg-white/20 transition border border-white/20"
            data-testid="app-update-snooze-btn"
            aria-label="تذكيري لاحقًا"
          >
            لاحقًا
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppVersionGuard;
