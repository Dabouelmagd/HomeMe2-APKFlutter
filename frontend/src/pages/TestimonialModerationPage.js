import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { StarIcon } from '@heroicons/react/24/solid';
import PageHeader from '../components/shared/PageHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const STATUS_TABS = [
  { key: 'pending', label: 'قيد المراجعة', color: 'amber', icon: '⏳' },
  { key: 'published', label: 'منشور', color: 'emerald', icon: '✅' },
  { key: 'rejected', label: 'مرفوض', color: 'rose', icon: '❌' },
];

const TestimonialModerationPage = () => {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, published: 0, rejected: 0 });
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/owner/testimonials?status=${activeTab}&limit=200`, getToken())
      .then(res => {
        setItems(res.data.testimonials || []);
        setCounts(res.data.counts || { pending: 0, published: 0, rejected: 0 });
      })
      .catch(err => toast.error(err.response?.data?.detail || 'فشل التحميل'))
      .finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(() => { reload(); }, [reload, refreshKey]);

  const moderate = async (id, status) => {
    let note = null;
    if (status === 'rejected') {
      note = window.prompt('سبب الرفض (اختياري)؟');
      if (note === null) return; // canceled
    }
    try {
      await axios.put(`${API}/owner/testimonials/${id}`, { status, admin_note: note || null }, getToken());
      toast.success(status === 'published' ? '✅ تم النشر' : '❌ تم الرفض');
      setRefreshKey(k => k + 1);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل العملية');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('حذف هذا التقييم نهائياً؟')) return;
    try {
      await axios.delete(`${API}/owner/testimonials/${id}`, getToken());
      toast.success('تم الحذف');
      setRefreshKey(k => k + 1);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل الحذف');
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-rose-950 to-gray-900 min-h-screen p-6" dir="rtl" data-testid="testimonial-moderation-page">
      <div className="max-w-6xl mx-auto space-y-6">
        <PageHeader
          theme="rose"
          iconEmoji="⭐"
          badge="Owner — مراجعة التقييمات"
          title="مراجعة شهادات العملاء"
          subtitle="راجع التقييمات الواردة قبل نشرها على الصفحة الرئيسية"
          meta={<>
            <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">⏳ قيد: {counts.pending}</span>
            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">✅ منشور: {counts.published}</span>
            <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded">❌ مرفوض: {counts.rejected}</span>
          </>}
          testId="testimonial-mod-header"
        />

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1.5 w-fit">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? `bg-${tab.color}-600 text-white shadow-lg`
                  : 'text-gray-400 hover:text-white'
              }`}
              data-testid={`tab-${tab.key}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-white/25' : 'bg-white/10'
              }`}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center text-gray-400 py-10">جاري التحميل...</div>
        ) : items.length === 0 ? (
          <div className="text-center bg-white/5 border border-white/10 rounded-2xl py-14 text-gray-400">
            <div className="text-5xl mb-3 opacity-50">📭</div>
            <p className="text-sm">لا توجد تقييمات في هذه القائمة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map(t => (
              <div key={t.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/25 transition-all" data-testid={`testimonial-card-${t.id}`}>
                {/* Stars + Date */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon key={i} className={`w-4 h-4 ${i < (t.stars || 0) ? 'text-amber-400' : 'text-gray-700'}`} />
                    ))}
                    <span className="text-xs text-gray-400 mr-2">{t.stars}/5</span>
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {t.created_at && new Date(t.created_at).toLocaleString('ar-EG')}
                  </span>
                </div>

                {/* Comment */}
                <p className="text-sm text-gray-200 leading-loose mb-4 line-clamp-5">{t.comment}</p>

                {/* Author info */}
                <div className="bg-white/5 rounded-lg p-3 mb-3 text-xs space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">👤</span>
                    <span className="font-bold text-white">{t.name}</span>
                  </div>
                  {t.role && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500">💼</span>
                      <span className="text-gray-300">{t.role}</span>
                    </div>
                  )}
                  {t.company_name && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500">🏢</span>
                      <span className="text-gray-300">{t.company_name}</span>
                    </div>
                  )}
                  {t.email && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500">📧</span>
                      <a href={`mailto:${t.email}`} className="text-blue-400 hover:underline">{t.email}</a>
                    </div>
                  )}
                </div>

                {t.admin_note && (
                  <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 mb-3">
                    📝 ملاحظة الإدارة: {t.admin_note}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {activeTab !== 'published' && (
                    <button onClick={() => moderate(t.id, 'published')} className="flex-1 px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-600/40 text-emerald-200 rounded-lg text-xs font-bold transition" data-testid={`approve-${t.id}`}>
                      ✅ نشر
                    </button>
                  )}
                  {activeTab !== 'rejected' && (
                    <button onClick={() => moderate(t.id, 'rejected')} className="flex-1 px-3 py-2 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-600/40 text-rose-200 rounded-lg text-xs font-bold transition" data-testid={`reject-${t.id}`}>
                      ❌ رفض
                    </button>
                  )}
                  <button onClick={() => remove(t.id)} className="px-3 py-2 bg-red-600/30 hover:bg-red-600/50 border border-red-600/40 text-red-200 rounded-lg text-xs font-bold transition" title="حذف نهائي" data-testid={`delete-${t.id}`}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestimonialModerationPage;
