import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  PlusIcon, StarIcon, PhoneIcon, EyeIcon, TrashIcon,
  XMarkIcon, CheckCircleIcon, XCircleIcon, NoSymbolIcon,
  WrenchScrewdriverIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api/workers`;
const tok = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const SPECIALTIES = [
  'سباكة','كهرباء','نجارة','دهانات','تكييف',
  'حدادة','بلاط وسيراميك','جبس','أعمال ألمنيوم',
  'صيانة عامة','نظافة','بستنة','أخرى'
];

const STATUS_STYLE = {
  active:      { label: 'نشط',         cls: 'bg-emerald-100 text-emerald-700' },
  pending:     { label: 'قيد المراجعة', cls: 'bg-amber-100 text-amber-700' },
  rejected:    { label: 'مرفوض',       cls: 'bg-red-100 text-red-600' },
  blacklisted: { label: '🚫 قائمة سوداء', cls: 'bg-gray-900 text-red-400' },
};

const Stars = ({ rating, size = 4 }) => (
  <div className="flex gap-0.5">
    {[1,2,3,4,5].map(i => i <= Math.round(rating)
      ? <StarSolid key={i} className={`h-${size} w-${size} text-amber-400`} />
      : <StarIcon key={i} className={`h-${size} w-${size} text-gray-300`} />
    )}
  </div>
);

const emptyForm = {
  name:'', specialty:'سباكة', phone:'', description:'',
  rating:5, review:'', compound_id:'',
};

export default function WorkersPage() {
  const { user } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [pending, setPending] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('workers'); // workers / pending / blacklist
  const [filterSpec, setFilterSpec] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewWorker, setViewWorker] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, review: '' });
  const [showBlacklistModal, setShowBlacklistModal] = useState(null);
  const [blacklistReason, setBlacklistReason] = useState('');

  const isAdmin = ['app_owner','super_admin','admin','company_admin','manager'].includes(user?.role);
  const isOwner = ['app_owner','super_admin','company_admin'].includes(user?.role);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterSpec ? `?specialty=${filterSpec}` : '';
      const [wr, sr] = await Promise.all([
        axios.get(`${API}${params}`, tok()),
        axios.get(`${API}/stats/summary`, tok()),
      ]);
      setWorkers(wr.data.workers || []);
      setStats(sr.data);
      if (isAdmin) {
        const [pr, br] = await Promise.all([
          axios.get(`${API}/pending`, tok()),
          axios.get(`${API}?status=blacklisted&blacklisted=true`, tok()),
        ]);
        setPending(pr.data.workers || []);
        setBlacklist(br.data.workers || []);
      }
    } catch { toast.error('فشل تحميل البيانات'); }
    finally { setLoading(false); }
  }, [filterSpec, isAdmin]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('الاسم مطلوب'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      if (!form.compound_id) fd.set('compound_id', user?.compound_id || '');
      if (photo) fd.append('photo', photo);
      const res = await axios.post(API, fd, {
        headers: { ...tok().headers, 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.status === 'pending'
        ? '✅ تم الإرسال — بانتظار موافقة الأدمن'
        : '✅ تم إضافة العامل');
      setShowForm(false); setForm(emptyForm); setPhoto(null);
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id, action, reason = '') => {
    try {
      await axios.put(`${API}/${id}/approve`, { action, reason }, tok());
      toast.success(action === 'approve' ? '✅ تم القبول' : '❌ تم الرفض');
      fetchAll();
    } catch { toast.error('فشل التحديث'); }
  };

  const handleBlacklist = async (id, action) => {
    try {
      await axios.put(`${API}/${id}/blacklist`, { action, reason: blacklistReason }, tok());
      toast.success(action === 'blacklist' ? '🚫 تم إضافته للقائمة السوداء' : '✅ تم رفع الحجب');
      setShowBlacklistModal(null); setBlacklistReason('');
      fetchAll();
    } catch { toast.error('فشل التحديث'); }
  };

  const handleReview = async (workerId) => {
    try {
      await axios.post(`${API}/${workerId}/reviews`, reviewForm, tok());
      toast.success('✅ تم إضافة تقييمك');
      setViewWorker(null); setReviewForm({ rating: 5, review: '' });
      fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || 'فشل الإضافة'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('تأكيد حذف؟')) return;
    try { await axios.delete(`${API}/${id}`, tok()); toast.success('✅ تم الحذف'); fetchAll(); }
    catch { toast.error('فشل الحذف'); }
  };

  const displayed = tab === 'workers' ? workers
    : tab === 'pending' ? pending
    : blacklist;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <WrenchScrewdriverIcon className="h-6 w-6 text-emerald-600" />
            دليل العمال والصنايعية
          </h1>
          <p className="text-xs text-gray-500">تقييمات موثّقة من سكان الكمبوند</p>
        </div>
        <button onClick={() => { setShowForm(true); setForm(emptyForm); }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-sm shadow">
          <PlusIcon className="h-4 w-4" /> إضافة عامل
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { l:'نشط', v:stats.active, c:'text-emerald-600' },
            { l:'قيد المراجعة', v:stats.pending, c:'text-amber-600' },
            { l:'🚫 قائمة سوداء', v:stats.blacklisted, c:'text-red-600' },
            { l:'الإجمالي', v:stats.total, c:'text-gray-700 dark:text-gray-300' },
          ].map(({l,v,c}) => (
            <div key={l} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center">
              <p className={`text-2xl font-black ${c}`}>{v}</p>
              <p className="text-xs text-gray-500 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          ['workers', `الدليل (${workers.length})`],
          ...(isAdmin ? [['pending', `قيد المراجعة (${pending.length})`]] : []),
          ...(isAdmin ? [['blacklist', `🚫 القائمة السوداء (${blacklist.length})`]] : []),
        ].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`pb-2 px-3 text-sm font-bold border-b-2 transition-colors ${
              tab === k ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {/* Filter */}
      {tab === 'workers' && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterSpec('')}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${!filterSpec ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
            الكل
          </button>
          {SPECIALTIES.map(s => (
            <button key={s} onClick={() => setFilterSpec(s === filterSpec ? '' : s)}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${filterSpec === s ? 'bg-emerald-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Workers Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" /></div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <WrenchScrewdriverIcon className="h-14 w-14 mx-auto mb-3 opacity-30" />
          <p className="font-bold">لا يوجد عمال</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map(w => (
            <div key={w.id} className={`bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden hover:shadow-lg transition-shadow ${
              w.blacklisted ? 'border-red-300 dark:border-red-800' : 'border-gray-200 dark:border-gray-700'
            }`}>
              {/* Card header */}
              <div className={`h-2 ${w.blacklisted ? 'bg-gray-900' : 'bg-gradient-to-r from-emerald-500 to-teal-600'}`} />
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                    w.blacklisted ? 'bg-gray-100 dark:bg-gray-700' : 'bg-emerald-50 dark:bg-emerald-900/20'
                  }`}>
                    {w.photo_url
                      ? <img src={`${process.env.REACT_APP_BACKEND_URL}${w.photo_url}`} alt="" className="w-full h-full object-cover rounded-xl" />
                      : '👷'
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-gray-900 dark:text-white text-sm">{w.name}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[w.status]?.cls || STATUS_STYLE.active.cls}`}>
                        {STATUS_STYLE[w.status]?.label}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-600 font-bold mt-0.5">{w.specialty}</p>
                    {w.avg_rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Stars rating={w.avg_rating} size={3} />
                        <span className="text-xs text-gray-500">{w.avg_rating} ({w.total_reviews} تقييم)</span>
                      </div>
                    )}
                  </div>
                </div>

                {w.blacklist_reason && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-2 mb-3">
                    <p className="text-xs text-red-600 font-bold">🚫 سبب الحجب: {w.blacklist_reason}</p>
                  </div>
                )}

                {w.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{w.description}</p>}

                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setViewWorker(w)}
                    className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 px-2 py-1.5 rounded-lg">
                    <EyeIcon className="h-3.5 w-3.5" /> عرض
                  </button>
                  {w.phone && (
                    <a href={`tel:${w.phone}`}
                      className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1.5 rounded-lg">
                      <PhoneIcon className="h-3.5 w-3.5" /> اتصال
                    </a>
                  )}
                  {isAdmin && !w.blacklisted && (
                    <button onClick={() => { setShowBlacklistModal(w); setBlacklistReason(''); }}
                      className="flex items-center gap-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1.5 rounded-lg">
                      <NoSymbolIcon className="h-3.5 w-3.5" /> حجب
                    </button>
                  )}
                  {isAdmin && w.blacklisted && (
                    <button onClick={() => handleBlacklist(w.id, 'remove')}
                      className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1.5 rounded-lg">
                      <CheckCircleIcon className="h-3.5 w-3.5" /> رفع الحجب
                    </button>
                  )}
                  {/* Pending actions */}
                  {tab === 'pending' && isAdmin && (
                    <>
                      <button onClick={() => handleApprove(w.id, 'approve')}
                        className="flex items-center gap-1 text-xs bg-emerald-600 text-white hover:bg-emerald-700 px-2 py-1.5 rounded-lg">
                        <CheckCircleIcon className="h-3.5 w-3.5" /> موافقة
                      </button>
                      <button onClick={() => { const r = prompt('سبب الرفض:'); if (r !== null) handleApprove(w.id, 'reject', r); }}
                        className="flex items-center gap-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1.5 rounded-lg">
                        <XCircleIcon className="h-3.5 w-3.5" /> رفض
                      </button>
                    </>
                  )}
                  {(isAdmin || w.added_by === user?.id) && (
                    <button onClick={() => handleDelete(w.id)}
                      className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1.5 rounded-lg">
                      <TrashIcon className="h-3.5 w-3.5 inline" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD FORM */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h3 className="font-black text-gray-900 dark:text-white">👷 إضافة عامل/صنايعي</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3" dir="rtl">
              {[['الاسم *', 'name', 'text', 'اسم العامل أو الصنايعي'],
                ['رقم الهاتف', 'phone', 'tel', '01xxxxxxxxx']].map(([label, key, type, ph]) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                  <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={ph}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">التخصص *</label>
                <select value={form.specialty} onChange={e => set('specialty', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none">
                  {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">وصف التجربة</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                  placeholder="اكتب تجربتك معه..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none resize-none" />
              </div>
              {/* Rating */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">تقييمك</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(i => (
                    <button key={i} type="button" onClick={() => set('rating', i)}
                      className="text-2xl transition-transform hover:scale-125">
                      {i <= form.rating ? '⭐' : '☆'}
                    </button>
                  ))}
                  <span className="text-sm text-gray-500 mr-2 mt-1">{form.rating}/5</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">ملاحظتك</label>
                <textarea value={form.review} onChange={e => set('review', e.target.value)} rows={2}
                  placeholder="ملحوظة مفيدة لباقي السكان..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">صورة (اختياري)</label>
                <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])}
                  className="w-full text-sm text-gray-500 file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:text-emerald-700 file:font-bold file:text-xs" />
              </div>
              {!isAdmin && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                  ⏳ سيتم مراجعة الإضافة من قِبل إدارة الكمبوند قبل النشر
                </div>
              )}
            </div>
            <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
                {saving ? '...' : '👷 إضافة العامل'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 text-sm">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewWorker && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3" onClick={() => setViewWorker(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[88vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 space-y-4" dir="rtl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-black text-gray-900 dark:text-white text-lg">{viewWorker.name}</h2>
                  <p className="text-sm text-emerald-600 font-bold">{viewWorker.specialty}</p>
                </div>
                <button onClick={() => setViewWorker(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              {viewWorker.avg_rating && (
                <div className="flex items-center gap-2">
                  <Stars rating={viewWorker.avg_rating} size={5} />
                  <span className="font-black text-amber-500">{viewWorker.avg_rating}</span>
                  <span className="text-sm text-gray-500">({viewWorker.total_reviews} تقييم)</span>
                </div>
              )}
              {viewWorker.description && <p className="text-sm text-gray-600 dark:text-gray-300">{viewWorker.description}</p>}
              {viewWorker.phone && (
                <a href={`tel:${viewWorker.phone}`}
                  className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm">
                  <PhoneIcon className="h-4 w-4" /> {viewWorker.phone}
                </a>
              )}
              {/* Reviews */}
              {viewWorker.reviews?.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-sm">التقييمات ({viewWorker.reviews.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {viewWorker.reviews.map(r => (
                      <div key={r.id} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{r.user_name}</span>
                          <Stars rating={r.rating} size={3} />
                        </div>
                        {r.review && <p className="text-xs text-gray-600 dark:text-gray-400">{r.review}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Add review */}
              {viewWorker.status === 'active' && !viewWorker.blacklisted && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-sm">أضف تقييمك</h4>
                  <div className="flex gap-1 mb-2">
                    {[1,2,3,4,5].map(i => (
                      <button key={i} type="button" onClick={() => setReviewForm(p => ({ ...p, rating: i }))}
                        className="text-xl">{i <= reviewForm.rating ? '⭐' : '☆'}</button>
                    ))}
                  </div>
                  <textarea value={reviewForm.review} onChange={e => setReviewForm(p => ({ ...p, review: e.target.value }))}
                    rows={2} placeholder="ملاحظتك..."
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none resize-none mb-2" />
                  <button onClick={() => handleReview(viewWorker.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-sm">
                    ⭐ إرسال التقييم
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BLACKLIST MODAL */}
      {showBlacklistModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowBlacklistModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={e => e.stopPropagation()} dir="rtl">
            <h3 className="font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <NoSymbolIcon className="h-5 w-5 text-red-600" />
              إضافة للقائمة السوداء
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              سيُمنع <strong>{showBlacklistModal.name}</strong> من الظهور في الكمبوند وشركة الإدارة.
            </p>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">سبب الحجب *</label>
            <textarea value={blacklistReason} onChange={e => setBlacklistReason(e.target.value)} rows={3}
              placeholder="مثال: سرقة، عمل رديء، تحرش..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none resize-none mb-4" />
            <div className="flex gap-2">
              <button onClick={() => handleBlacklist(showBlacklistModal.id, 'blacklist')} disabled={!blacklistReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
                🚫 إضافة للقائمة السوداء
              </button>
              <button onClick={() => setShowBlacklistModal(null)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
