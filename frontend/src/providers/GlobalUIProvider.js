import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Toaster } from '../components/ui/sonner';
import { Toaster as HotToaster } from 'react-hot-toast';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
import { PlanUpgradeDialog } from '../components/CompanyPlanUsageCard';

/**
 * GlobalUIProvider
 * --------------------------------------------------------------
 * Single mount point for app-wide UI concerns:
 *   1. Axios 403 interceptor → catches `plan_limit_*` errors and
 *      dispatches a `openUpgradeDialog` CustomEvent.
 *   2. Sonner + react-hot-toast toasters.
 *   3. PWA Install Prompt.
 *   4. Plan-Limit Upgrade dialog listener (opens automatically when
 *      any API call returns 403 with `code: plan_limit_*`).
 * --------------------------------------------------------------
 */
export const GlobalUIProvider = ({ children }) => {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState(null);
  const [currentPlan, setCurrentPlan] = useState('starter');
  const interceptorIdRef = useRef(null);

  // ── 1. Axios 403 plan-limit interceptor ────────────────────────
  useEffect(() => {
    interceptorIdRef.current = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error?.response?.status;
        const detail = error?.response?.data?.detail;
        if (status === 403 && detail && typeof detail === 'object' && typeof detail.code === 'string' && detail.code.startsWith('plan_limit_')) {
          // Toast the message and trigger the upgrade dialog.
          if (detail.message) toast.error(detail.message, { duration: 5000 });
          window.dispatchEvent(
            new CustomEvent('openUpgradeDialog', {
              detail: {
                reason: detail.message,
                currentPlan: detail.current_plan || 'starter',
              },
            })
          );
          // Normalize detail to a string so downstream `toast.error(err.response.data.detail)`
          // calls in page components don't try to render an object as a React child.
          try { error.response.data.detail = detail.message || 'Plan limit reached'; } catch (_e) { /* noop */ }
        }
        return Promise.reject(error);
      }
    );
    return () => {
      if (interceptorIdRef.current !== null) {
        axios.interceptors.response.eject(interceptorIdRef.current);
      }
    };
  }, []);

  // ── 2. Listen for openUpgradeDialog events ─────────────────────
  useEffect(() => {
    const handler = (e) => {
      const { reason, currentPlan: planFromEvent } = e.detail || {};
      setUpgradeReason(reason || null);
      setCurrentPlan(planFromEvent || 'starter');
      setUpgradeOpen(true);
    };
    window.addEventListener('openUpgradeDialog', handler);
    return () => window.removeEventListener('openUpgradeDialog', handler);
  }, []);

  return (
    <>
      {children}
      <Toaster />
      <HotToaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            direction: 'rtl',
            fontFamily: 'inherit',
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 600,
          },
        }}
      />
      <PWAInstallPrompt />
      {upgradeOpen && (
        <PlanUpgradeDialog
          currentPlan={currentPlan}
          reason={upgradeReason}
          onClose={() => setUpgradeOpen(false)}
        />
      )}
    </>
  );
};

export default GlobalUIProvider;
