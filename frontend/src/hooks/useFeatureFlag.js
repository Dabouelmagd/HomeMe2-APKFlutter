/**
 * useFeatureFlag — React hook that returns whether a feature is enabled for the current user's plan.
 * 
 * Usage:
 *   const { enabled, requiresPlan, currentPlan, planNameAr, requiresPlanNameAr, loading, showUpgradeToast } = useFeatureFlag('advanced_dashboard');
 *   
 *   <button onClick={() => {
 *     if (!enabled) return showUpgradeToast();
 *     ...
 *   }}>
 * 
 * Data is fetched once on first hook call and cached globally (no redundant requests).
 * Backend endpoint: GET /api/feature-flags/me
 */
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Module-level cache (singleton across all components)
let _cache = null;
let _cachePromise = null;
const _subscribers = new Set();

const _notifySubscribers = () => {
  _subscribers.forEach((cb) => cb(_cache));
};

const _fetch = async () => {
  if (_cache) return _cache;
  if (_cachePromise) return _cachePromise;
  _cachePromise = axios
    .get(`${API}/feature-flags/me`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
    .then((res) => {
      _cache = res.data;
      _notifySubscribers();
      return _cache;
    })
    .catch(() => {
      // Fail-safe: assume starter (most restrictive)
      _cache = {
        plan: 'starter',
        plan_name_ar: 'مجاني',
        features: {},
        feature_min_plan: {},
        feature_labels_ar: {},
        plan_name_ar_by_key: {},
        is_unlimited_role: false,
      };
      _notifySubscribers();
      return _cache;
    })
    .finally(() => {
      _cachePromise = null;
    });
  return _cachePromise;
};

/** Invalidate cache after plan upgrade so all subscribers refresh. */
export const invalidateFeatureFlags = () => {
  _cache = null;
  _cachePromise = null;
  _fetch();
};

export const useFeatureFlag = (featureKey) => {
  const [data, setData] = useState(_cache);
  const [loading, setLoading] = useState(_cache === null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const sub = (next) => {
      if (mounted) {
        setData(next);
        setLoading(false);
      }
    };
    _subscribers.add(sub);
    _fetch().then((d) => mounted && setData(d) && setLoading(false));
    if (_cache) setLoading(false);
    return () => {
      mounted = false;
      _subscribers.delete(sub);
    };
  }, []);

  const enabled = !!data?.features?.[featureKey];
  const requiresPlan = data?.feature_min_plan?.[featureKey] || null;
  const currentPlan = data?.plan || 'starter';
  const planNameAr = data?.plan_name_ar || 'مجاني';
  const requiresPlanNameAr = requiresPlan
    ? data?.plan_name_ar_by_key?.[requiresPlan] || requiresPlan
    : null;
  const featureLabel = data?.feature_labels_ar?.[featureKey] || featureKey;

  const showUpgradeToast = useCallback(() => {
    if (enabled) return;
    toast.error(
      `⛔ ميزة "${featureLabel}" غير متاحة في خطة "${planNameAr}". تحتاج خطة "${requiresPlanNameAr}" أو أعلى.`,
      {
        duration: 6000,
        action: {
          label: 'ترقية الآن',
          onClick: () => navigate('/app/my-subscription'),
        },
      }
    );
  }, [enabled, featureLabel, planNameAr, requiresPlanNameAr, navigate]);

  return {
    enabled,
    loading,
    requiresPlan,
    requiresPlanNameAr,
    currentPlan,
    planNameAr,
    featureLabel,
    isUnlimitedRole: !!data?.is_unlimited_role,
    showUpgradeToast,
  };
};

export default useFeatureFlag;
