import React, { useState, useEffect } from 'react';
import PageHero from './shared/PageHero';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import {
  StarIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentCheckIcon,
  UserIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const Stars = ({ rating, size = 'h-5 w-5' }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(s => (
      s <= rating
        ? <StarSolid key={s} className={`${size} text-amber-400`} />
        : <StarIcon key={s} className={`${size} text-gray-300`} />
    ))}
  </div>
);

const SatisfactionDashboard = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/ratings/stats`, getHeaders())
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;
  }

  const s = stats || {};
  const overall = s.overall || {};
  const maint = s.maintenance || {};
  const serv = s.service || {};
  const dist = overall.distribution || {};
  const totalDist = overall.total || 1;

  const distData = [5, 4, 3, 2, 1].map(star => ({
    name: `${star} ${t('sat_star', 'نجوم')}`,
    stars: star,
    value: dist[star] || dist[String(star)] || 0,
    pct: Math.round(((dist[star] || dist[String(star)] || 0) / totalDist) * 100)
  }));

  const COLORS = ['#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444'];

  const getLevel = (avg) => {
    if (avg >= 4.5) return { label: t('sat_excellent', 'ممتاز'), color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', emoji: '🌟' };
    if (avg >= 3.5) return { label: t('sat_good', 'جيد'), color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', emoji: '👍' };
    if (avg >= 2.5) return { label: t('sat_avg', 'متوسط'), color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', emoji: '⚠️' };
    return { label: t('sat_poor', 'يحتاج تحسين'), color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', emoji: '🔴' };
  };

  const level = getLevel(overall.average || 0);

  return (
    <div className="space-y-5" dir={isRTL ? 'rtl' : 'ltr'} data-testid="satisfaction-dashboard">
      <PageHero
        icon="⭐"
        title={t('sat_title', 'لوحة رضا العملاء')}
        subtitle={t('sat_subtitle', 'متابعة مستوى رضا السكان عن الخدمات والصيانة')}
        accent="amber"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="rating-summary">
        {/* Overall */}
        <div className={`${level.bg} rounded-xl border ${level.border} p-5 text-center`}>
          <p className={`text-4xl font-black ${level.color}`}>{overall.average || 0}</p>
          <Stars rating={Math.round(overall.average || 0)} size="h-5 w-5" />
          <p className={`text-xs font-bold mt-1 ${level.color}`}>{level.label}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{overall.total || 0} {t('sat_total', 'تقييم')}</p>
        </div>

        {/* Maintenance */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 text-center shadow-sm">
          <WrenchScrewdriverIcon className="w-6 h-6 text-orange-500 mx-auto mb-1" />
          <p className="text-3xl font-black text-gray-900">{maint.average || 0}</p>
          <Stars rating={Math.round(maint.average || 0)} size="h-4 w-4" />
          <p className="text-xs text-gray-600 mt-1">{t('sat_maintenance', 'الصيانة')}</p>
          <p className="text-[10px] text-gray-400">{maint.total || 0} {t('sat_rating', 'تقييم')}</p>
        </div>

        {/* Service */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 text-center shadow-sm">
          <ClipboardDocumentCheckIcon className="w-6 h-6 text-blue-500 mx-auto mb-1" />
          <p className="text-3xl font-black text-gray-900">{serv.average || 0}</p>
          <Stars rating={Math.round(serv.average || 0)} size="h-4 w-4" />
          <p className="text-xs text-gray-600 mt-1">{t('sat_services', 'الخدمات')}</p>
          <p className="text-[10px] text-gray-400">{serv.total || 0} {t('sat_rating', 'تقييم')}</p>
        </div>

        {/* Distribution */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs font-bold text-gray-700 mb-2 text-center">{t('sat_distribution', 'التوزيع')}</p>
          {distData.map((d, i) => (
            <div key={d.stars} className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold w-3 text-gray-500">{d.stars}</span>
              <StarSolid className="h-3 w-3 text-amber-400" />
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full transition-all" style={{ width: `${d.pct}%`, backgroundColor: COLORS[i] }}></div>
              </div>
              <span className="text-[9px] text-gray-400 w-7 text-end">{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Trend */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5" data-testid="monthly-trend">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-4 h-4 text-amber-500" />
            {t('sat_trend', 'اتجاه الرضا الشهري')}
          </h3>
          {(s.monthly_trend || []).length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(s.monthly_trend || []).map(m => ({ ...m, name: m.month?.slice(5) || '' }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 10 }} reversed={isRTL} />
                  <YAxis domain={[0, 5]} tick={{ fill: '#9CA3AF', fontSize: 10 }} orientation={isRTL ? 'right' : 'left'} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="average" stroke="#F59E0B" strokeWidth={3} dot={{ fill: '#F59E0B', r: 4 }} name={t('sat_avg_rating', 'متوسط التقييم')} />
                  <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 3 }} name={t('sat_count', 'عدد التقييمات')} yAxisId="right" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <StarIcon className="w-10 h-10 mb-2" />
              <p className="text-sm">{t('sat_no_trend', 'لا توجد بيانات كافية')}</p>
            </div>
          )}
        </div>

        {/* Pie Distribution */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5" data-testid="rating-distribution">
          <h3 className="text-sm font-bold text-gray-900 mb-4">{t('sat_pie_title', 'توزيع التقييمات')}</h3>
          {(overall.total || 0) > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distData.filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={85} innerRadius={45} dataKey="value" paddingAngle={2}
                    label={({ stars, pct }) => `${stars} (${pct}%)`}>
                    {distData.filter(d => d.value > 0).map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <StarIcon className="w-10 h-10 mb-2" />
              <p className="text-sm">{t('sat_no_ratings', 'لا توجد تقييمات بعد')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">{t('sat_compare', 'مقارنة: الصيانة vs الخدمات')}</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { name: t('sat_maintenance', 'الصيانة'), [t('sat_avg_rating', 'المتوسط')]: maint.average || 0, [t('sat_count', 'العدد')]: maint.total || 0 },
              { name: t('sat_services', 'الخدمات'), [t('sat_avg_rating', 'المتوسط')]: serv.average || 0, [t('sat_count', 'العدد')]: serv.total || 0 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} reversed={isRTL} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} orientation={isRTL ? 'right' : 'left'} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey={t('sat_avg_rating', 'المتوسط')} fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey={t('sat_count', 'العدد')} fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Negative Reviews */}
      {(s.recent_negative || []).length > 0 && (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden" data-testid="negative-reviews">
          <div className="px-5 py-3 border-b border-red-100 bg-red-50">
            <h3 className="text-sm font-bold text-red-700 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4" />
              {t('sat_negative', 'تقييمات تحتاج متابعة')}
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {s.recent_negative.map((r, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-gray-900">{r.user_name}</span>
                    <Stars rating={r.rating} size="h-3 w-3" />
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${r.target_type === 'maintenance' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                      {r.target_type === 'maintenance' ? t('sat_maintenance', 'صيانة') : t('sat_services', 'خدمة')}
                    </span>
                  </div>
                  {r.comment && <p className="text-[10px] text-gray-600 mt-0.5">{r.comment}</p>}
                  <p className="text-[9px] text-gray-400 mt-0.5">{r.created_at ? new Date(r.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US') : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(overall.total || 0) === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center" data-testid="empty-state">
          <StarIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">{t('sat_no_data_title', 'لا توجد تقييمات بعد')}</h3>
          <p className="text-sm text-gray-400">{t('sat_no_data_desc', 'ستظهر هنا إحصائيات التقييمات بمجرد أن يبدأ السكان بتقييم الخدمات والصيانة')}</p>
        </div>
      )}
    </div>
  );
};

export default SatisfactionDashboard;
