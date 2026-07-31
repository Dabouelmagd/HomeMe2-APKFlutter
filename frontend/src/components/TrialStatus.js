import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  TrophyIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChartBarIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TrialStatus = ({ showFull = false, onUpgradeClick = null }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [trialData, setTrialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [subCode, setSubCode] = useState('');
  const [applyingCode, setApplyingCode] = useState(false);

  // الأدوار التي لا يظهر لها البار إطلاقاً (هم مديرو الابلكيشن)
  const APP_ADMIN_ROLES = ['super_admin', 'app_owner'];
  const activeRole = user?.active_role || user?.role;
  const isAppAdmin = APP_ADMIN_ROLES.includes(activeRole);
  // إذا كان الحساب مشترك فعلياً (أي subscription_type غير trial والاشتراك نشط)
  // نغطي جميع الأنواع: paid, lifetime, 1_month, 3_months, 6_months, 9_months, 1_year, yearly, monthly, …
  const subType = user?.subscription_type;
  const hasPaidSubscription = (
    (subType && subType !== 'trial' && user?.subscription_active !== false) ||
    user?.subscription_status === 'active_paid'
  );

  useEffect(() => {
    if (isAppAdmin || hasPaidSubscription) {
      setLoading(false);
      return;
    }
    fetchTrialStatus();
  }, [isAppAdmin, hasPaidSubscription]);

  // ساعة تنازلية تحدّث كل ثانية أثناء التجربة النشطة
  useEffect(() => {
    if (!trialData?.trial_active || !trialData?.end_date) return;
    const tick = () => {
      const end = new Date(trialData.end_date);
      const now = new Date();
      const diff = end - now;
      if (diff <= 0) { setCountdown({ expired: true }); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown({ days, hours, minutes, seconds, expired: false });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [trialData?.trial_active, trialData?.end_date]);

  // إخفاء كامل للأدوار الإدارية أو المشتركين المدفوعين
  if (isAppAdmin || hasPaidSubscription) return null;

  const applySubscriptionCode = async () => {
    if (!subCode.trim()) return;
    setApplyingCode(true);
    try {
      const res = await axios.post(`${API}/subscription/apply-code`,
        { code: subCode.trim().toUpperCase() },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      toast.success('✅ تم تفعيل الاشتراك بنجاح!');
      setShowCodeInput(false);
      setSubCode('');
      window.location.reload();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'كود غير صحيح');
    } finally { setApplyingCode(false); }
  };

  const fetchTrialStatus = async () => {
    try {
      const response = await axios.get(`${API}/trial/status`);
      setTrialData(response.data);
    } catch (error) {
      console.error('Failed to fetch trial status:', error);
    } finally {
      setLoading(false);
    }
  };

  const activateTrial = async () => {
    try {
      const response = await axios.post(`${API}/trial/activate`);
      toast.success('🎉 Free trial activated! Enjoy 14 days of full access!');
      fetchTrialStatus(); // Refresh status
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to activate trial');
    }
  };

  const upgradeToPaid = () => {
    navigate('/app/pricing');
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${showFull ? 'space-y-4' : ''}`}>
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        {showFull && (
          <>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </>
        )}
      </div>
    );
  }

  if (!trialData || !trialData.is_trial) {
    if (hasPaidSubscription) {
      // User has paid subscription (paid / lifetime / monthly / yearly …)
      return showFull ? (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-full bg-green-100">
              <TrophyIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-center text-green-900">{t('premium_account')}</h3>
              <p className="text-sm text-green-700">{t('unlimited_access_features')}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-3 text-white">
          <div className="flex items-center space-x-2">
            <TrophyIcon className="h-5 w-5" />
            <span className="text-sm font-medium">{t('premium_account')}</span>
          </div>
        </div>
      );
    }

    // No trial - show start trial option
    return (
      <div className={`bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white ${showFull ? 'p-6' : 'p-4'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SparklesIcon className={showFull ? "h-6 w-6" : "h-5 w-5"} />
            <div>
              <h3 className={`font-semibold ${showFull ? 'text-lg' : 'text-sm'}`}>
                {t('start_free_trial')}
              </h3>
              <p className={`text-blue-100 ${showFull ? 'text-sm' : 'text-xs'}`}>
                {t('get_14_days_premium')}
              </p>
            </div>
          </div>
          <button
            onClick={activateTrial}
            className={`bg-white font-medium hover:bg-gray-50 transition-colors ${
              showFull 
                ? 'text-blue-600 px-4 py-2 rounded-lg' 
                : 'text-blue-600 px-3 py-1 rounded text-xs'
            }`}
          >
            {t('start_trial')}
          </button>
        </div>
      </div>
    );
  }

  const daysRemaining = trialData.days_remaining;
  const isExpired = !trialData.trial_active;
  const isAlmostExpired = daysRemaining <= 3 && daysRemaining > 0;
  
  const usagePercentages = {};
  Object.keys(trialData.usage || {}).forEach(key => {
    const usage = trialData.usage[key];
    const limit = trialData.limits[key];
    usagePercentages[key] = limit > 0 ? Math.round((usage / limit) * 100) : 0;
  });

  if (isExpired) {
    return (
      <div className={`bg-gradient-to-r from-red-500 to-red-600 rounded-lg text-white ${showFull ? 'p-6' : 'p-4'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <XMarkIcon className={showFull ? "h-6 w-6" : "h-5 w-5"} />
            <div>
              <h3 className={`font-semibold ${showFull ? 'text-lg' : 'text-sm'}`}>
                {t('trial_expired')}
              </h3>
              <p className={`text-red-100 ${showFull ? 'text-sm' : 'text-xs'}`}>
                {t('upgrade_now_trial')}
              </p>
            </div>
          </div>
          <button
            onClick={onUpgradeClick || upgradeToPaid}
            className={`bg-white text-red-600 font-medium hover:bg-gray-50 transition-colors ${
              showFull 
                ? 'px-4 py-2 rounded-lg' 
                : 'px-3 py-1 rounded text-xs'
            }`}
          >
            {t('upgrade_now')}
          </button>
        </div>
      </div>
    );
  }

  if (!showFull) {
    // Compact version
    return (
      <div className={`rounded-lg p-3 text-white ${
        isAlmostExpired
          ? 'bg-gradient-to-r from-orange-500 to-red-500'
          : 'bg-gradient-to-r from-blue-500 to-purple-600'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isAlmostExpired ? (
              <ExclamationTriangleIcon className="h-5 w-5" />
            ) : (
              <ClockIcon className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">
              {daysRemaining} {daysRemaining === 1 ? t('days_left') : t('days_left_plural')}
            </span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={onUpgradeClick || upgradeToPaid}
              className="bg-white font-medium hover:bg-gray-50 transition-colors px-3 py-1 rounded text-xs text-blue-600"
            >
              {t('upgrade_now')}
            </button>
            <button
              onClick={() => setShowCodeInput(v => !v)}
              className="bg-white/20 hover:bg-white/30 text-white font-bold px-2 py-1 rounded text-xs transition-colors"
              title="كود اشتراك"
            >🎟️</button>
          </div>
        </div>
      </div>
    );
  }

  // Full version for dashboard/dedicated page
  const themeColor = isAlmostExpired
    ? { bg: 'bg-gradient-to-r from-orange-50 to-amber-50', border: 'border-orange-300', icon: 'bg-orange-100', iconText: 'text-orange-600', title: 'text-orange-900', text: 'text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700' }
    : { bg: 'bg-gradient-to-r from-emerald-50 to-teal-50', border: 'border-emerald-300', icon: 'bg-emerald-100', iconText: 'text-emerald-600', title: 'text-emerald-900', text: 'text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700' };

  return (
    <div className="space-y-6">
      {/* Trial Status Header */}
      <div className={`border-2 rounded-xl p-5 ${themeColor.bg} ${themeColor.border}`} data-testid="trial-status-bar">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-full ${themeColor.icon}`}>
              {isAlmostExpired ? (
                <ExclamationTriangleIcon className={`h-6 w-6 ${themeColor.iconText}`} />
              ) : (
                <ClockIcon className={`h-6 w-6 ${themeColor.iconText}`} />
              )}
            </div>
            <div>
              <h3 className={`text-base font-bold ${themeColor.title}`}>
                {isAlmostExpired ? t('trial_ending_soon', 'التجربة تنتهي قريباً!') : t('free_trial_active', '✨ النسخة التجريبية نشطة')}
              </h3>
              {/* ساعة تنازلية */}
              {countdown && !countdown.expired ? (
                <div className="flex items-center gap-1.5 mt-1.5" data-testid="trial-countdown">
                  {[
                    { label: t('days', 'يوم'), val: countdown.days },
                    { label: t('hours', 'ساعة'), val: countdown.hours },
                    { label: t('minutes', 'دقيقة'), val: countdown.minutes },
                    { label: t('seconds', 'ثانية'), val: countdown.seconds },
                  ].map((u, i) => (
                    <div key={i} className={`flex items-center gap-1 ${themeColor.text}`}>
                      <span className={`font-mono font-black text-lg ${themeColor.title}`}>{String(u.val).padStart(2, '0')}</span>
                      <span className="text-[10px] opacity-70">{u.label}</span>
                      {i < 3 && <span className="opacity-30 mx-0.5">:</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${themeColor.text}`}>
                  {daysRemaining} {daysRemaining === 1 ? t('days_left', 'يوم متبقي') : t('days_left_plural', 'أيام متبقية')}
                  {isAlmostExpired && ' - ' + t('upgrade_soon_avoid_interruption', 'جددي الاشتراك لتجنب انقطاع الخدمة')}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={onUpgradeClick || upgradeToPaid}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg text-white transition-colors shadow-lg ${themeColor.btn}`}
              data-testid="trial-upgrade-btn"
            >
              <ArrowUpIcon className="h-4 w-4" />
              {isAlmostExpired ? t('subscribe_now', 'اشتركي الآن') : t('ترقية للمدفوع')}
            </button>
            <button
              onClick={() => navigate('/app/pricing')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              {t('view_plans', 'عرض الباقات')}
            </button>
            {/* Subscription code button */}
            <button
              onClick={() => setShowCodeInput(v => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-emerald-400 text-sm font-bold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
              title="لديك كود اشتراك؟"
            >
              🎟️ كود اشتراك
            </button>
          </div>
          {/* Code input inline */}
          {showCodeInput && (
            <div className="w-full mt-3 flex gap-2 items-center bg-white border-2 border-emerald-300 rounded-xl p-3">
              <span className="text-sm text-gray-500 flex-shrink-0">🎟️</span>
              <input
                value={subCode}
                onChange={e => setSubCode(e.target.value.toUpperCase())}
                placeholder="أدخل كود الاشتراك..."
                className="flex-1 outline-none text-sm font-mono tracking-widest text-gray-800 bg-transparent"
                onKeyDown={e => e.key === 'Enter' && applySubscriptionCode()}
                autoFocus
                dir="ltr"
              />
              <button
                onClick={applySubscriptionCode}
                disabled={applyingCode || !subCode.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {applyingCode ? '...' : 'تفعيل'}
              </button>
              <button onClick={() => { setShowCodeInput(false); setSubCode(''); }}
                className="text-gray-400 hover:text-gray-600 text-lg px-1">✕</button>
            </div>
          )}
        </div>
      </div>

      {/* Usage Statistics */}
      {trialData.usage && Object.keys(trialData.usage).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-6">
            <ChartBarIcon className="h-5 w-5 text-gray-600" />
            <h4 className="text-lg font-medium text-center text-center text-gray-900">{t('usage_limits')}</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(trialData.usage).map(([key, usage]) => {
              const limit = trialData.limits[key];
              const percentage = limit > 0 ? Math.round((usage / limit) * 100) : 0;
              const isNearLimit = percentage >= 80;
              const isAtLimit = percentage >= 100;
              
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600 capitalize">
                      {key === 'users' ? t('users') : 
                       key === 'families' ? t('families') : 
                       key === 'services' ? t('services') : 
                       key === 'messages' ? t('messages') : 
                       key === 'storage' ? t('storage_mb') : 
                       key === 'storage_mb' ? t('storage_mb') :
                       key.replace('_', ' ')}
                    </span>
                    <span className={`text-sm font-medium ${
                      isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-900'
                    }`}>
                      {usage}/{limit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${
                      isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'
                    }`}>
                      {percentage}{t('percentage_used')}
                    </span>
                    {isNearLimit && (
                      <span className="text-yellow-600 font-medium">
                        {isAtLimit ? t('limit_reached') : t('near_limit')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upgrade Benefits */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
        <h4 className="text-lg font-medium text-center text-center text-gray-900 mb-4">
          {t('upgrade_unlimited_access')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-700">{t('unlimited_users_families')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-700">{t('unlimited_services')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-700">{t('unlimited_storage')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-sm text-gray-700">{t('premium_support')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrialStatus;