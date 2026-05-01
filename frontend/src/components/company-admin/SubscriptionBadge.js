import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * SubscriptionBadge — يعرض اسم الخطة + الحالة + الأيام المتبقية لمدير الشركة.
 *
 * Behaviour:
 *   - مخفي لغير company_admin / assistant_manager / accountant
 *   - pending_payment  → برتقالي "بانتظار الدفع"
 *   - expired          → أحمر "منتهية - جدّد الآن"
 *   - active + < 7 أيام → برتقالي "ينتهي خلال X يوم"
 *   - active + ≥ 7 أيام → أخضر "نشط • X يوم"
 *   - starter دائم      → رمادي "مجاني"
 *   - انقر → يوجّه للوحة التحكم ويفتح modal الترقية
 */
const SubscriptionBadge = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  const role = user?.active_role || user?.role;
  const eligible = ['company_admin', 'assistant_manager', 'accountant'].includes(role);

  const fetchUsage = async () => {
    if (!eligible) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/company-admin/plan-usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch { setData(null); }
  };

  useEffect(() => {
    fetchUsage();
    const onRefresh = () => fetchUsage();
    window.addEventListener('planUsageRefresh', onRefresh);
    return () => window.removeEventListener('planUsageRefresh', onRefresh);
  }, [eligible]);  // eslint-disable-line

  if (!eligible || !data) return null;

  const { plan, plan_name_ar, status, days_remaining } = data;
  const daysLow = days_remaining != null && days_remaining <= 7 && days_remaining > 0;
  const daysCritical = days_remaining != null && days_remaining <= 2;

  let color, icon, text, pulse = false;
  if (plan === 'starter' && status !== 'expired') {
    color = 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
    icon = '🆓';
    text = plan_name_ar;
  } else if (status === 'expired') {
    color = 'bg-red-50 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
    icon = '⛔';
    text = 'منتهية — جدّد';
    pulse = true;
  } else if (status === 'pending_payment') {
    color = 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700';
    icon = '💳';
    text = `${plan_name_ar} • بانتظار الدفع`;
    pulse = true;
  } else if (daysCritical) {
    color = 'bg-red-50 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
    icon = '⏰';
    text = `${plan_name_ar} • ${days_remaining} يوم`;
    pulse = true;
  } else if (daysLow) {
    color = 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700';
    icon = '⏰';
    text = `${plan_name_ar} • ${days_remaining} يوم`;
  } else {
    color = 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700';
    icon = '✅';
    text = days_remaining != null ? `${plan_name_ar} • ${days_remaining} يوم` : plan_name_ar;
  }

  const handleClick = () => {
    navigate('/app/dashboard');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('openUpgradeModal'));
    }, 300);
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-semibold transition hover:shadow ${color} ${pulse ? 'animate-pulse' : ''}`}
      data-testid="subscription-badge"
      title="انقر لعرض خيارات الترقية"
    >
      <span className="text-sm">{icon}</span>
      <span className="max-w-[140px] truncate">{text}</span>
    </button>
  );
};

export default SubscriptionBadge;
