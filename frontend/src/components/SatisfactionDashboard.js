import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import {
  StarIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftIcon,
  ArrowTrendingUpIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RatingStars = ({ rating, size = 'h-5 w-5' }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(star => (
      star <= rating
        ? <StarSolid key={star} className={`${size} text-amber-400`} />
        : <StarIcon key={star} className={`${size} text-gray-300`} />
    ))}
  </div>
);

const SatisfactionDashboard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/ratings/stats`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching rating stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;
  }

  const s = stats || {};
  const dist = s.rating_distribution || {};
  const totalDist = Object.values(dist).reduce((a, b) => a + b, 0) || 1;

  const distData = [5, 4, 3, 2, 1].map(star => ({
    name: `${star}`,
    value: dist[star] || 0,
    pct: Math.round(((dist[star] || 0) / totalDist) * 100)
  }));

  const COLORS = ['#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444'];

  const satisfactionLevel = (avg) => {
    if (avg >= 4.5) return { label: t('excellent', 'ممتاز'), color: 'text-green-600', bg: 'bg-green-50' };
    if (avg >= 3.5) return { label: t('good', 'جيد'), color: 'text-blue-600', bg: 'bg-blue-50' };
    if (avg >= 2.5) return { label: t('average', 'متوسط'), color: 'text-amber-600', bg: 'bg-amber-50' };
    return { label: t('needs_improvement', 'يحتاج تحسين'), color: 'text-red-600', bg: 'bg-red-50' };
  };

  const level = satisfactionLevel(s.overall_average || 0);

  return (
    <div className="min-h-screen bg-gray-50" data-testid="satisfaction-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('satisfaction_ratings', 'تقييمات رضا السكان')}</h1>
          <p className="text-sm text-gray-500">{t('satisfaction_desc', 'متابعة مستوى رضا السكان عن الخدمات والصيانة')}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" data-testid="rating-summary">
          {/* Overall Average */}
          <div className={`rounded-2xl border-2 p-6 text-center ${level.bg}`}>
            <p className="text-5xl font-bold mb-2">{s.overall_average || 0}</p>
            <RatingStars rating={Math.round(s.overall_average || 0)} size="h-6 w-6" />
            <p className={`text-sm font-bold mt-2 ${level.color}`}>{level.label}</p>
            <p className="text-xs text-gray-500 mt-1">{s.total_ratings || 0} {t('total_ratings', 'تقييم')}</p>
          </div>

          {/* Maintenance Rating */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <WrenchScrewdriverIcon className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">{s.maintenance_avg || 0}</p>
            <RatingStars rating={Math.round(s.maintenance_avg || 0)} size="h-4 w-4" />
            <p className="text-sm text-gray-600 mt-1">{t('maintenance', 'الصيانة')}</p>
            <p className="text-xs text-gray-400">{s.maintenance_count || 0} {t('rating', 'تقييم')}</p>
          </div>

          {/* Service Rating */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <ClipboardDocumentCheckIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-gray-900">{s.service_avg || 0}</p>
            <RatingStars rating={Math.round(s.service_avg || 0)} size="h-4 w-4" />
            <p className="text-sm text-gray-600 mt-1">{t('services', 'الخدمات')}</p>
            <p className="text-xs text-gray-400">{s.service_count || 0} {t('rating', 'تقييم')}</p>
          </div>

          {/* Rating Distribution Mini */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <p className="text-sm font-semibold text-gray-700 mb-3 text-center">{t('distribution', 'التوزيع')}</p>
            {distData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-medium w-4 text-gray-500">{d.name}</span>
                <StarSolid className="h-3 w-3 text-amber-400" />
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: `${d.pct}%`, backgroundColor: COLORS[i] }}></div>
                </div>
                <span className="text-xs text-gray-500 w-8">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Monthly Trend */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6" data-testid="monthly-trend">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('satisfaction_trend', 'تطور الرضا شهرياً')}</h3>
            {(s.monthly_trend || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={(s.monthly_trend || []).map(m => ({
                  ...m, name: m.month?.slice(5) || ''
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="average" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 5 }} name={t('average_rating', 'متوسط التقييم')} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-12">{t('no_trend_data', 'لا توجد بيانات كافية لعرض الاتجاه')}</p>
            )}
          </div>

          {/* Rating Distribution Pie */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6" data-testid="rating-distribution">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('rating_distribution', 'توزيع التقييمات')}</h3>
            {s.total_ratings > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={distData.filter(d => d.value > 0)}
                    cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                    dataKey="value"
                    label={({ name, pct }) => `${name} (${pct}%)`}
                  >
                    {distData.filter(d => d.value > 0).map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 text-center py-12">{t('no_ratings_yet', 'لا توجد تقييمات بعد')}</p>
            )}
          </div>
        </div>

        {/* Recent Ratings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6" data-testid="recent-ratings">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('recent_ratings', 'أحدث التقييمات')}</h3>
          {(s.recent_ratings || []).length > 0 ? (
            <div className="space-y-3">
              {(s.recent_ratings || []).map((r, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{r.user_name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.target_type === 'maintenance' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {r.target_type === 'maintenance' ? t('maintenance', 'صيانة') : t('service', 'خدمة')}
                      </span>
                    </div>
                    <RatingStars rating={r.rating} size="h-4 w-4" />
                    {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
                    <p className="text-xs text-gray-400 mt-1">{r.created_at ? new Date(r.created_at).toLocaleDateString('ar-EG') : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">{t('no_ratings_yet', 'لا توجد تقييمات بعد')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SatisfactionDashboard;
