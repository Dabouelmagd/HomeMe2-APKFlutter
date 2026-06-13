import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  UsersIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftEllipsisIcon,
  BellIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  HomeModernIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  HandRaisedIcon,
  PhoneIcon,
  StarIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import InternalAdBanner from './InternalAdBanner';
import PageHeader from './shared/PageHeader';
import ResidentSummaryWidget from './ResidentSummaryWidget';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const ResidentDashboard = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    axios.get(`${API}/dashboard/resident`, getHeaders())
      .then(r => setDashboardData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingCount = dashboardData?.pending_invoices?.length || 0;
  const totalPending = dashboardData?.pending_invoices?.reduce((s, i) => s + (i.amount || 0), 0) || 0;
  const familyCount = dashboardData?.family_members?.length || 1;
  const msgCount = dashboardData?.my_messages?.length || 0;
  const notifCount = dashboardData?.recent_notifications?.length || 0;

  return (
    <div className="space-y-5" dir={isRTL ? 'rtl' : 'ltr'} data-testid="resident-dashboard">
      {/* Welcome Header — Unified */}
      <PageHeader
        theme="blue"
        iconEmoji="🏡"
        badge={t('rd_welcome_label', 'مرحباً بك في منزلك')}
        title={`${t('rd_hello', 'أهلاً')}، ${user?.full_name || user?.name || t('rd_resident', 'مقيم')}`}
        subtitle={`${t('unit', 'الوحدة')} ${dashboardData?.family?.unit_number || user?.unit_number || '-'}${user?.compound_name ? ' • ' + user.compound_name : ''}`}
        actions={
          <div className="hidden sm:flex flex-col items-end gap-1">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-lg border border-white/20">
              <HomeModernIcon className="w-4 h-4 text-blue-200" />
              <span className="text-xs text-blue-100">{t('rd_my_home', 'منزلي')}</span>
            </div>
            <span className="text-[10px] text-blue-300">{new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        }
        testId="resident-page-header"
      />

      {/* Pending Payment Alert */}
      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3" data-testid="pending-alert">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800">{pendingCount} {t('rd_pending_payments', 'فواتير مستحقة')}</p>
            <p className="text-xs text-amber-600">{t('rd_total_due', 'المبلغ المستحق')}: {totalPending.toLocaleString()} {t('sm_egp', 'ج.م')}</p>
          </div>
          <button onClick={() => navigate('/app/financial')} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-500 transition-all" data-testid="pay-now-btn">
            {t('rd_pay_now', 'ادفع الآن')}
          </button>
        </div>
      )}

      {/* ✨ Resident Summary Widget (Iter 140) — 3 personal tiles at the top */}
      <ResidentSummaryWidget />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: t('rd_family', 'أفراد العائلة'), value: familyCount, icon: UsersIcon, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', href: '/app/family' },
          { label: t('rd_invoices', 'الفواتير'), value: pendingCount > 0 ? pendingCount : t('rd_no_pending', 'لا يوجد'), icon: CurrencyDollarIcon, color: pendingCount > 0 ? 'text-amber-600' : 'text-green-600', bg: pendingCount > 0 ? 'bg-amber-50' : 'bg-green-50', border: pendingCount > 0 ? 'border-amber-100' : 'border-green-100', href: '/app/financial' },
          { label: t('rd_messages', 'الرسائل'), value: msgCount, icon: ChatBubbleLeftEllipsisIcon, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', href: '/app/chat' },
          { label: t('rd_notifications', 'الإشعارات'), value: notifCount, icon: BellIcon, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', href: '/app/notifications' },
        ].map((s, i) => (
          <div key={i} onClick={() => navigate(s.href)} className={`${s.bg} rounded-xl border ${s.border} p-4 cursor-pointer hover:shadow-md transition-all`} data-testid={`stat-${i}`}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Inline Ad */}
      <InternalAdBanner position="inline" maxAds={1} variant="slim" className="" />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Family Members */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-blue-500" />
              {t('rd_family_members', 'أفراد العائلة')}
            </h3>
            <button onClick={() => navigate('/app/family')} className="text-xs text-blue-600 hover:underline">{t('rd_view_all', 'عرض الكل')}</button>
          </div>
          <div className="divide-y divide-gray-50">
            {(dashboardData?.family_members || []).length > 0 ? (
              dashboardData.family_members.slice(0, 4).map((m, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white">{(m.full_name || 'U').charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.full_name}</p>
                    <p className="text-[10px] text-gray-400">{m.email || ''}</p>
                  </div>
                  {m.is_family_head && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">{t('rd_head', 'رب الأسرة')}</span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-gray-400">{t('rd_no_family', 'لا يوجد أفراد')}</div>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <BellIcon className="w-4 h-4 text-rose-500" />
              {t('rd_recent_notifs', 'آخر الإشعارات')}
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {(dashboardData?.recent_notifications || []).length > 0 ? (
              dashboardData.recent_notifications.slice(0, 4).map((n, i) => (
                <div key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <BellIcon className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900">{n.title}</p>
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">{n.content}</p>
                    <p className="text-[9px] text-gray-300 mt-1">{new Date(n.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-gray-400">
                <CheckCircleIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
                {t('rd_no_notifs', 'لا توجد إشعارات جديدة')}
              </div>
            )}
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <CurrencyDollarIcon className="w-4 h-4 text-amber-500" />
              {t('rd_pending_invoices', 'الفواتير المستحقة')}
            </h3>
            <button onClick={() => navigate('/app/financial')} className="text-xs text-blue-600 hover:underline">{t('rd_view_all', 'عرض الكل')}</button>
          </div>
          {(dashboardData?.pending_invoices || []).length > 0 ? (
            <div className="divide-y divide-gray-50">
              {dashboardData.pending_invoices.slice(0, 4).map((inv, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <ClockIcon className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{inv.description}</p>
                    <p className="text-[10px] text-gray-400">{t('rd_due', 'مستحق')}: {new Date(inv.due_date).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</p>
                  </div>
                  <p className="text-sm font-black text-amber-600">{(inv.amount || 0).toLocaleString()} {t('sm_egp', 'ج.م')}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <CheckCircleIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">{t('rd_no_invoices', 'جميع الفواتير مدفوعة')}</p>
            </div>
          )}
        </div>

        {/* Recent Messages */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-purple-500" />
              {t('rd_my_messages', 'رسائلي')}
            </h3>
            <button onClick={() => navigate('/app/chat')} className="text-xs text-blue-600 hover:underline">{t('rd_view_all', 'عرض الكل')}</button>
          </div>
          {(dashboardData?.my_messages || []).length > 0 ? (
            <div className="divide-y divide-gray-50">
              {dashboardData.my_messages.slice(0, 3).map((msg, i) => (
                <div key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900">{msg.subject}</p>
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">{msg.content}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${msg.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {msg.status === 'open' ? t('rd_open', 'مفتوح') : t('rd_closed', 'مغلق')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-gray-400">{t('rd_no_messages', 'لا توجد رسائل')}</div>
          )}
        </div>
      </div>

      {/* Service Rating Widget */}
      <ServiceRatingWidget />

      {/* Quick Actions */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3 text-sm">{t('rd_quick_actions', 'الوصول السريع')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { name: t('rd_maintenance', 'طلب صيانة'), href: '/app/maintenance', icon: WrenchScrewdriverIcon, bg: 'bg-gradient-to-br from-orange-500 to-amber-600' },
            { name: t('rd_payments', 'المدفوعات'), href: '/app/financial', icon: CurrencyDollarIcon, bg: 'bg-gradient-to-br from-green-500 to-emerald-600' },
            { name: t('rd_family_page', 'العائلة'), href: '/app/family', icon: UsersIcon, bg: 'bg-gradient-to-br from-blue-500 to-indigo-600' },
            { name: t('rd_services', 'الخدمات'), href: '/app/services', icon: StarIcon, bg: 'bg-gradient-to-br from-purple-500 to-pink-600' },
          ].map((link, i) => (
            <button key={i} onClick={() => navigate(link.href)} className={`${link.bg} rounded-xl p-4 text-white text-start hover:opacity-90 transition-opacity shadow-md`} data-testid={`quick-action-${i}`}>
              <link.icon className="w-6 h-6 text-white/70 mb-2" />
              <p className="text-sm font-bold">{link.name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResidentDashboard;

// Service Rating Widget
const ServiceRatingWidget = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [recentItems, setRecentItems] = useState([]);
  const [ratingItem, setRatingItem] = useState(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    // Fetch recent maintenance requests and service bookings
    Promise.all([
      axios.get(`${API}/maintenance`, getHeaders()).then(r => (r.data.requests || []).slice(0, 3).map(r => ({ ...r, _type: 'maintenance' }))).catch(() => []),
      axios.get(`${API}/services/my-bookings`, getHeaders()).then(r => (r.data.bookings || []).slice(0, 3).map(b => ({ ...b, _type: 'service' }))).catch(() => []),
    ]).then(([m, s]) => setRecentItems([...m, ...s].slice(0, 4)));
  }, []);

  const submitRating = async () => {
    if (!ratingItem || selectedRating === 0) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/ratings`, {
        target_type: ratingItem._type,
        target_id: ratingItem.id,
        rating: selectedRating,
        comment,
      }, getHeaders());
      toast.success(t('rd_rating_success', 'تم إرسال التقييم بنجاح'));
      setRatingItem(null);
      setSelectedRating(0);
      setComment('');
    } catch {
      toast.error(t('rd_rating_fail', 'فشل إرسال التقييم'));
    }
    setSubmitting(false);
  };

  if (recentItems.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5" data-testid="rating-widget">
      <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-3">
        <StarIcon className="w-4 h-4 text-amber-500" />
        {t('rd_rate_services', 'قيّم الخدمات')}
      </h3>

      {!ratingItem ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-2">{t('rd_rate_desc', 'اختر خدمة أو طلب صيانة لتقييمه:')}</p>
          {recentItems.map((item, i) => (
            <button key={i} onClick={() => setRatingItem(item)}
              className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-start"
              data-testid={`rate-item-${i}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item._type === 'maintenance' ? 'bg-orange-100' : 'bg-purple-100'}`}>
                {item._type === 'maintenance'
                  ? <WrenchScrewdriverIcon className="w-4 h-4 text-orange-600" />
                  : <StarIcon className="w-4 h-4 text-purple-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{item.title || item.service_name || item.description || t('rd_service', 'خدمة')}</p>
                <p className="text-[10px] text-gray-400">{item._type === 'maintenance' ? t('rd_maintenance', 'صيانة') : t('rd_service', 'خدمة')}</p>
              </div>
              <StarIcon className="w-4 h-4 text-gray-300" />
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${ratingItem._type === 'maintenance' ? 'bg-orange-100' : 'bg-purple-100'}`}>
              {ratingItem._type === 'maintenance'
                ? <WrenchScrewdriverIcon className="w-4 h-4 text-orange-600" />
                : <StarIcon className="w-4 h-4 text-purple-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">{ratingItem.title || ratingItem.service_name || ratingItem.description}</p>
            </div>
            <button onClick={() => { setRatingItem(null); setSelectedRating(0); }} className="text-xs text-gray-400 hover:text-gray-600">{t('rd_cancel', 'إلغاء')}</button>
          </div>

          {/* Stars */}
          <div className="flex items-center justify-center gap-1" data-testid="rating-stars">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setSelectedRating(star)}
                className="p-1 transition-transform hover:scale-125"
                data-testid={`star-${star}`}
              >
                <svg className={`w-8 h-8 ${(hoverRating || selectedRating) >= star ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-gray-500">
            {selectedRating === 1 && t('rd_rating_1', 'سيء')}
            {selectedRating === 2 && t('rd_rating_2', 'مقبول')}
            {selectedRating === 3 && t('rd_rating_3', 'جيد')}
            {selectedRating === 4 && t('rd_rating_4', 'جيد جداً')}
            {selectedRating === 5 && t('rd_rating_5', 'ممتاز')}
          </p>

          <textarea value={comment} onChange={e => setComment(e.target.value)}
            placeholder={t('rd_comment_placeholder', 'أضف تعليقاً (اختياري)...')}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs resize-none h-16 focus:ring-amber-400 focus:border-amber-400"
            data-testid="rating-comment" />

          <button onClick={submitRating} disabled={submitting || selectedRating === 0}
            className="w-full py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-400 transition-all disabled:opacity-50"
            data-testid="submit-rating-btn"
          >
            {submitting ? '...' : t('rd_submit_rating', 'إرسال التقييم')}
          </button>
        </div>
      )}
    </div>
  );
};
