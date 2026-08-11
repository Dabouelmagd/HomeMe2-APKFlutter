import { useEffect, useRef, useCallback } from 'react';

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_MS = 2 * 60 * 1000;       // warn 2 min before

const EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

export default function useIdleLogout(onLogout, isAuthenticated) {
  const timerRef = useRef(null);
  const warnRef = useRef(null);
  const warnedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warnRef.current) clearTimeout(warnRef.current);
    warnedRef.current = false;
  }, []);

  const resetTimer = useCallback(() => {
    clearTimers();
    if (!isAuthenticated) return;

    // Warning at 13 min
    warnRef.current = setTimeout(() => {
      if (!warnedRef.current) {
        warnedRef.current = true;
        const proceed = window.confirm(
          '⚠️ ستنتهي جلستك خلال دقيقتين بسبب الخمول.\nاضغط OK للاستمرار أو Cancel لتسجيل الخروج.'
        );
        if (!proceed) {
          clearTimers();
          onLogout();
        }
      }
    }, IDLE_TIMEOUT_MS - WARNING_MS);

    // Logout at 15 min
    timerRef.current = setTimeout(() => {
      clearTimers();
      onLogout();
    }, IDLE_TIMEOUT_MS);
  }, [isAuthenticated, onLogout, clearTimers]);

  useEffect(() => {
    if (!isAuthenticated) { clearTimers(); return; }

    resetTimer();
    EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));

    return () => {
      clearTimers();
      EVENTS.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [isAuthenticated, resetTimer, clearTimers]);
}
