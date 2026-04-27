import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/**
 * AdvertiserPortal — لوحة تحكم المعلن الذاتية
 *   - قائمة إعلاناتي
 *   - إنشاء إعلان جديد + دفع
 *   - إحصاءات مشاهدات/نقرات
 */
const AdvertiserPortal = () => {
  const [ads, setAds] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    axios.get(`${API}/advertiser/ads`, getToken())
      .then(res => { if (alive) { setAds(res.data.ads || []); setSummary(res.data.summary || {}); } })
      .catch(err => { if (alive) toast.error(err.response?.data?.detail || 'فشل التحميل'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [refreshKey]);

  const createAd = async (form) => {
    try {
      await axios.post(`${API}/advertiser/ads`, form, getToken());
      toast.success('تم إنشاء الإعلان. تابع إلى الدفع.');
      setCreateOpen(false);
      setRefreshKey(k => k + 1);
    } catch (err) { toast.error(err.response?.data?.detail || 'فشل الإنشاء'); }
  };

  const pay = async (ad) => {
    try {
      const res = await axios.post(`${API}/advertiser/ads/${ad.id}/pay`, {}, getToken());
      if (res.data.mock) {
        toast.success(res.data.message || 'تم الدفع (وضع التطوير)');
        setRefreshKey(k => k + 1);
      } else {
        toast.info(`PaymentIntent: ${res.data.payment_intent_id}. استخدم Stripe للدفع الفعلي.`);
      }
    } catch (err) { toast.error(err.response?.data?.detail || 'فشل الدفع'); }
  };

  const remove = async (ad) => {
    if (!window.confirm(`حذف الإعلان "${ad.title}"؟`)) return;
    try {
      await axios.delete(`${API}/advertiser/ads/${ad.id}`, getToken());
      toast.success('تم الحذف');
      setRefreshKey(k => k + 1);
    } catch (err) { toast.error(err.response?.data?.detail || 'فشل الحذف'); }
  };

  const statusLabel = {
    draft: 'مسودة', awaiting_payment: 'ينتظر الدفع', pending_approval: 'قيد المراجعة',
    approved: '✅ نشط', rejected: '⛔ مرفوض', paused: 'متوقف', expired: 'منتهي',
  };
  const statusColor = {
    approved: 'emerald', pending_approval: 'amber', rejected: 'red',
    awaiting_payment: 'blue', draft: 'gray', paused: 'gray', expired: 'gray',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6" dir="rtl" data-testid="advertiser-portal">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">📢 لوحة المعلن</h1>
            <p className="text-sm text-gray-400 mt-1">أنشئ إعلاناتك، ادفع، وتابع أداءها</p>
          </div>
          <button onClick={() => navigate('/app/dashboard')} className="text-gray-400 hover:text-white text-sm" data-testid="ad-back-btn">← رجوع</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon="📊" label="الإجمالي" value={summary.total || 0} color="blue" />
          <StatCard icon="✅" label="نشطة" value={summary.active || 0} color="emerald" />
          <StatCard icon="⏳" label="قيد المراجعة" value={summary.pending || 0} color="amber" />
          <StatCard icon="👁" label="مشاهدات" value={summary.total_impressions || 0} color="purple" />
          <StatCard icon="🖱" label="نقرات" value={summary.total_clicks || 0} color="pink" />
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">إعلاناتي</h2>
          <button onClick={() => setCreateOpen(true)} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold shadow-lg" data-testid="ad-create-btn">
            ➕ إعلان جديد
          </button>
        </div>

        {loading ? <div className="text-center text-gray-400 py-12">جاري التحميل...</div>
          : ads.length === 0 ? (
          <div className="text-center text-gray-400 py-16 bg-gray-800/30 rounded-2xl border-2 border-dashed border-gray-700">
            <div className="text-5xl mb-3">🎯</div>
            <div className="text-lg">لم تنشئ أي إعلان بعد</div>
            <button onClick={() => setCreateOpen(true)} className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold">ابدأ أول إعلان</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ads.map(ad => {
              const color = statusColor[ad.status] || 'gray';
              const ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions * 100).toFixed(1) : '0.0';
              return (
                <div key={ad.id} className={`bg-gray-800/80 rounded-xl border border-${color}-700/30 p-4 space-y-3`} data-testid={`ad-card-${ad.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate">{ad.title}</h3>
                      {ad.body && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{ad.body}</p>}
                    </div>
                    <span className={`text-[10px] bg-${color}-900/40 text-${color}-300 border border-${color}-700/40 px-2 py-0.5 rounded-full whitespace-nowrap`}>{statusLabel[ad.status] || ad.status}</span>
                  </div>
                  {ad.image_url && <img src={ad.image_url.startsWith('http') ? ad.image_url : `${BACKEND_URL}${ad.image_url}`} alt="" className="w-full h-32 rounded-lg object-cover" />}

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-900/60 rounded-lg p-2">
                      <div className="text-[10px] text-gray-500">مشاهدات</div>
                      <div className="text-lg font-bold text-white">{ad.impressions || 0}</div>
                    </div>
                    <div className="bg-gray-900/60 rounded-lg p-2">
                      <div className="text-[10px] text-gray-500">نقرات</div>
                      <div className="text-lg font-bold text-white">{ad.clicks || 0}</div>
                    </div>
                    <div className="bg-gray-900/60 rounded-lg p-2">
                      <div className="text-[10px] text-gray-500">CTR</div>
                      <div className="text-lg font-bold text-emerald-300">{ctr}%</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-700 pt-2">
                    <span>{ad.duration_days} يوم</span>
                    <span className="text-amber-300 font-bold">{ad.amount_due} {ad.currency}</span>
                  </div>

                  {ad.rejection_reason && (
                    <div className="text-[11px] text-red-300 bg-red-900/20 px-2 py-1 rounded">⛔ {ad.rejection_reason}</div>
                  )}

                  <div className="flex gap-2">
                    {ad.payment_status !== 'paid' && ad.status === 'awaiting_payment' && (
                      <button onClick={() => pay(ad)} className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg font-semibold" data-testid={`ad-pay-${ad.id}`}>💳 ادفع الآن</button>
                    )}
                    {ad.status !== 'approved' && ad.payment_status !== 'paid' && (
                      <button onClick={() => remove(ad)} className="px-3 py-1.5 bg-red-600/30 hover:bg-red-600/50 text-red-200 text-xs rounded-lg">🗑</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {createOpen && <CreateAdModal onClose={() => setCreateOpen(false)} onSave={createAd} />}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <div className={`bg-gradient-to-br from-${color}-600/25 to-${color}-800/10 border border-${color}-600/40 rounded-xl p-4 text-center`}>
    <div className="text-2xl mb-1">{icon}</div>
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-xs text-gray-400">{label}</div>
  </div>
);

const CreateAdModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ title: '', body: '', image_url: '', link_url: '', duration_days: 7 });
  const [uploadingImage, setUploadingImage] = useState(false);
  const pricePerDay = 50;
  const totalPrice = pricePerDay * form.duration_days;
  const submit = () => {
    if (!form.title.trim()) { toast.error('العنوان مطلوب'); return; }
    onSave(form);
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-4 border border-purple-500/30 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="ad-create-modal">
        <h3 className="text-lg font-bold text-white">➕ إنشاء إعلان جديد</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">عنوان الإعلان *</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="ad-title" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">نص الإعلان</label>
            <textarea rows="3" value={form.body} onChange={e => setForm({...form, body: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="ad-body" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">صورة الإعلان</label>
            <div className="space-y-2">
              <input
                type="url"
                value={form.image_url}
                onChange={e => setForm({...form, image_url: e.target.value})}
                placeholder="https://... أو ارفع ملفاً أدناه"
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                data-testid="ad-image"
              />
              <label className="flex items-center justify-center gap-2 cursor-pointer bg-purple-900/30 hover:bg-purple-900/50 border-2 border-dashed border-purple-500/50 rounded-lg px-4 py-3 text-sm text-purple-200 transition" data-testid="ad-upload-label">
                <span>📤 {uploadingImage ? 'جارِ الرفع...' : 'رفع صورة من الجهاز (PNG/JPG/WEBP/GIF ≤ 5MB)'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    if (f.size > 5*1024*1024) { toast.error('الحجم يتجاوز 5MB'); return; }
                    setUploadingImage(true);
                    try {
                      const fd = new FormData(); fd.append('file', f);
                      const r = await axios.post(`${API}/advertiser/upload-image`, fd, {
                        ...getToken(), headers: { ...getToken().headers, 'Content-Type': 'multipart/form-data' },
                      });
                      setForm({...form, image_url: r.data.url});
                      toast.success('تم رفع الصورة');
                    } catch (err) {
                      toast.error(err.response?.data?.detail || 'فشل الرفع');
                    } finally {
                      setUploadingImage(false);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                  data-testid="ad-upload-input"
                />
              </label>
              {form.image_url && (
                <img
                  src={form.image_url.startsWith('http') ? form.image_url : `${BACKEND_URL}${form.image_url}`}
                  alt="preview"
                  className="w-full h-32 rounded-lg object-cover border border-gray-600"
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">رابط الوجهة (URL)</label>
            <input type="url" value={form.link_url} onChange={e => setForm({...form, link_url: e.target.value})} placeholder="https://..." className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">مدة العرض (أيام)</label>
            <input type="number" min="1" max="365" value={form.duration_days} onChange={e => setForm({...form, duration_days: parseInt(e.target.value) || 7})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="ad-duration" />
          </div>
          <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-lg p-3 border border-purple-600/30">
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-300">التكلفة الإجمالية</div>
              <div className="text-2xl font-bold text-amber-300">{totalPrice} EGP</div>
            </div>
            <div className="text-[10px] text-gray-400 mt-1">{pricePerDay} EGP × {form.duration_days} يوم</div>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={submit} className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold" data-testid="ad-create-save">💾 إنشاء (ثم الدفع)</button>
          <button onClick={onClose} className="px-4 py-2.5 bg-gray-700 text-gray-200 rounded-lg text-sm">إلغاء</button>
        </div>
      </div>
    </div>
  );
};

export default AdvertiserPortal;
