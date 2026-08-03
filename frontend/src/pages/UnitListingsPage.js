import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  PlusIcon, HomeIcon, PhoneIcon, EyeIcon, PencilIcon, TrashIcon,
  MagnifyingGlassIcon, XMarkIcon, BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../App';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tok = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const TYPES = {
  rent:      { ar: 'إيجار',   color: 'bg-blue-100 text-blue-700',   icon: '🏠' },
  sale:      { ar: 'بيع',     color: 'bg-green-100 text-green-700',  icon: '🏡' },
  finishing: { ar: 'تشطيب',  color: 'bg-purple-100 text-purple-700', icon: '🔨' },
  exchange:  { ar: 'مبادلة', color: 'bg-amber-100 text-amber-700',   icon: '🔄' },
  other:     { ar: 'أخرى',   color: 'bg-gray-100 text-gray-700',     icon: '📋' },
};
const STATUS = {
  active:  { ar: 'متاح',     color: 'bg-emerald-100 text-emerald-700' },
  rented:  { ar: 'مؤجّر',   color: 'bg-blue-100 text-blue-700' },
  sold:    { ar: 'مباع',     color: 'bg-gray-100 text-gray-500' },
  expired: { ar: 'منتهي',   color: 'bg-red-100 text-red-500' },
};

const emptyForm = {
  title: '', description: '', listing_type: 'rent', price: '', price_period: 'شهري',
  area: '', rooms: '', bathrooms: '', floor: '', unit_number: '',
  contact_phone: '', contact_name: '', amenities: '', compound_id: '',
};

export default function UnitListingsPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewListing, setViewListing] = useState(null);

  const isAdmin = ['app_owner', 'super_admin', 'admin', 'company_admin', 'manager'].includes(user?.role);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.append('listing_type', filterType);
      if (filterStatus) params.append('status', filterStatus);
      const [lr, sr] = await Promise.all([
        axios.get(`${API}/unit-listings?${params}`, tok()),
        axios.get(`${API}/unit-listings/stats/summary`, tok()),
      ]);
      setListings(lr.data.listings || []);
      setStats(sr.data);
    } catch { toast.error('فشل تحميل الإعلانات'); }
    finally { setLoading(false); }
  }, [filterType, filterStatus]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('العنوان مطلوب'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      if (!form.compound_id) fd.set('compound_id', user?.compound_id || '');
      images.forEach(img => fd.append('images', img));

      if (editId) {
        await axios.put(`${API}/unit-listings/${editId}`, form, tok());
      } else {
        await axios.post(`${API}/unit-listings`, fd, {
          headers: { ...tok().headers, 'Content-Type': 'multipart/form-data' }
        });
      }
      toast.success(editId ? '✅ تم التحديث' : '✅ تم نشر الإعلان');
      setShowForm(false); setForm(emptyForm); setImages([]); setEditId(null);
      fetch();
    } catch (e) { toast.error(e.response?.data?.detail || 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('تأكيد حذف الإعلان؟')) return;
    try {
      await axios.delete(`${API}/unit-listings/${id}`, tok());
      toast.success('✅ تم الحذف');
      fetch();
    } catch { toast.error('فشل الحذف'); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await axios.put(`${API}/unit-listings/${id}`, { status }, tok());
      toast.success('✅ تم التحديث');
      fetch();
    } catch { toast.error('فشل التحديث'); }
  };

  const filtered = listings.filter(l =>
    !search || l.title?.includes(search) || l.description?.includes(search) || l.unit_number?.includes(search)
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <BuildingOffice2Icon className="h-7 w-7 text-emerald-600" />
            وحدات للإيجار والبيع
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">إعلانات الوحدات داخل الكمبوند</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors shadow-md">
          <PlusIcon className="h-5 w-5" /> إضافة إعلان
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="col-span-2 sm:col-span-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4 text-center">
            <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{stats.active}</p>
            <p className="text-xs text-gray-500 mt-1">متاح</p>
          </div>
          {Object.entries(TYPES).map(([key, { ar, icon }]) => (
            <div key={key} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center cursor-pointer hover:border-emerald-400 transition-colors"
              onClick={() => setFilterType(filterType === key ? '' : key)}>
              <p className="text-2xl font-black text-gray-800 dark:text-white">{stats.by_type?.[key] || 0}</p>
              <p className="text-xs text-gray-500 mt-1">{icon} {ar}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث في الإعلانات..."
            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 pr-10 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none">
          <option value="">كل الأنواع</option>
          {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.ar}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none">
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.ar}</option>)}
          <option value="">الكل</option>
        </select>
      </div>

      {/* Listings grid */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <HomeIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-bold">لا توجد إعلانات</p>
          <p className="text-sm">اضغط "إضافة إعلان" لنشر أول وحدة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(l => (
            <div key={l.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
              {/* Image */}
              <div className="h-40 bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 relative">
                {l.images?.[0] ? (
                  <img src={`${process.env.REACT_APP_BACKEND_URL}${l.images[0]}`} alt={l.title}
                    className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-5xl">
                    {TYPES[l.listing_type]?.icon || '🏠'}
                  </div>
                )}
                <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-lg ${TYPES[l.listing_type]?.color}`}>
                  {TYPES[l.listing_type]?.ar}
                </span>
                <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-lg ${STATUS[l.status]?.color}`}>
                  {STATUS[l.status]?.ar}
                </span>
                {l.images?.length > 1 && (
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-lg">
                    +{l.images.length - 1} صور
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-black text-gray-900 dark:text-white text-sm mb-1 line-clamp-1">{l.title}</h3>
                {l.price > 0 && (
                  <p className="text-lg font-black text-emerald-600 mb-2">
                    {l.price.toLocaleString('ar-EG')} ج.م
                    <span className="text-xs font-normal text-gray-400 mr-1">/ {l.price_period}</span>
                  </p>
                )}
                <div className="flex gap-3 text-xs text-gray-500 mb-3 flex-wrap">
                  {l.area > 0 && <span>📐 {l.area} م²</span>}
                  {l.rooms > 0 && <span>🛏️ {l.rooms} غرف</span>}
                  {l.bathrooms > 0 && <span>🚿 {l.bathrooms} حمام</span>}
                  {l.floor > 0 && <span>🏢 دور {l.floor}</span>}
                </div>
                {l.description && (
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{l.description}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setViewListing(l)}
                    className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors">
                    <EyeIcon className="h-3.5 w-3.5" /> عرض
                  </button>
                  {l.contact_phone && (
                    <a href={`tel:${l.contact_phone}`}
                      className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors">
                      <PhoneIcon className="h-3.5 w-3.5" /> تواصل
                    </a>
                  )}
                  {(isAdmin || l.created_by === user?.id) && (
                    <>
                      <button onClick={() => { setEditId(l.id); setForm({...emptyForm, ...l, amenities: (l.amenities||[]).join(',')}); setShowForm(true); }}
                        className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors">
                        <PencilIcon className="h-3.5 w-3.5" /> تعديل
                      </button>
                      <button onClick={() => handleDelete(l.id)}
                        className="flex items-center gap-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors">
                        <TrashIcon className="h-3.5 w-3.5" /> حذف
                      </button>
                    </>
                  )}
                </div>
                {isAdmin && l.status === 'active' && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleStatusChange(l.id, 'rented')}
                      className="flex-1 text-xs bg-blue-600 text-white py-1 rounded-lg hover:bg-blue-700 transition-colors">تم الإيجار</button>
                    <button onClick={() => handleStatusChange(l.id, 'sold')}
                      className="flex-1 text-xs bg-gray-600 text-white py-1 rounded-lg hover:bg-gray-700 transition-colors">تم البيع</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="font-black text-gray-900 dark:text-white">{editId ? 'تعديل الإعلان' : 'إضافة إعلان جديد'}</h3>
              <button onClick={() => { setShowForm(false); setEditId(null); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4" dir="rtl">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">عنوان الإعلان *</label>
                  <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
                    placeholder="مثال: شقة 3 غرف للإيجار" className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">نوع الإعلان</label>
                  <select value={form.listing_type} onChange={e => setForm(p => ({...p, listing_type: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none">
                    {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.ar}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">رقم الوحدة</label>
                  <input value={form.unit_number} onChange={e => setForm(p => ({...p, unit_number: e.target.value}))}
                    placeholder="A-101" className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">السعر (ج.م)</label>
                  <input type="number" value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))}
                    placeholder="0" className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">فترة السعر</label>
                  <select value={form.price_period} onChange={e => setForm(p => ({...p, price_period: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none">
                    {['شهري','سنوي','إجمالي','يومي'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">المساحة (م²)</label>
                  <input type="number" value={form.area} onChange={e => setForm(p => ({...p, area: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الغرف</label>
                  <input type="number" value={form.rooms} onChange={e => setForm(p => ({...p, rooms: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الحمامات</label>
                  <input type="number" value={form.bathrooms} onChange={e => setForm(p => ({...p, bathrooms: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الدور</label>
                  <input type="number" value={form.floor} onChange={e => setForm(p => ({...p, floor: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">اسم المتصل</label>
                  <input value={form.contact_name} onChange={e => setForm(p => ({...p, contact_name: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">رقم التواصل</label>
                  <input value={form.contact_phone} onChange={e => setForm(p => ({...p, contact_phone: e.target.value}))}
                    placeholder="01xxxxxxxxx" className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">المميزات (مفصولة بفاصلة)</label>
                  <input value={form.amenities} onChange={e => setForm(p => ({...p, amenities: e.target.value}))}
                    placeholder="مطبخ, حديقة, جراج, مصعد, أمن" className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الوصف</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
                    rows={3} placeholder="تفاصيل إضافية..." className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none resize-none" />
                </div>
                {!editId && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">صور الوحدة (حتى 6)</label>
                    <input type="file" multiple accept="image/*" onChange={e => setImages(Array.from(e.target.files).slice(0,6))}
                      className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:font-bold file:bg-emerald-100 file:text-emerald-700" />
                    {images.length > 0 && <p className="text-xs text-emerald-600 mt-1">✅ {images.length} صورة محددة</p>}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60">
                {saving ? '...' : editId ? '✅ حفظ التعديلات' : '📢 نشر الإعلان'}
              </button>
              <button onClick={() => { setShowForm(false); setEditId(null); }}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View listing modal */}
      {viewListing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewListing(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="h-52 bg-gradient-to-br from-emerald-50 to-teal-100 relative">
              {viewListing.images?.[0] ? (
                <img src={`${process.env.REACT_APP_BACKEND_URL}${viewListing.images[0]}`} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="flex items-center justify-center h-full text-6xl">{TYPES[viewListing.listing_type]?.icon}</div>
              )}
              <button onClick={() => setViewListing(null)} className="absolute top-3 left-3 bg-black/40 text-white rounded-full p-1.5">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3" dir="rtl">
              <div className="flex items-start justify-between">
                <h2 className="font-black text-gray-900 dark:text-white text-lg">{viewListing.title}</h2>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${TYPES[viewListing.listing_type]?.color}`}>
                  {TYPES[viewListing.listing_type]?.ar}
                </span>
              </div>
              {viewListing.price > 0 && (
                <p className="text-2xl font-black text-emerald-600">
                  {viewListing.price.toLocaleString('ar-EG')} ج.م
                  <span className="text-sm font-normal text-gray-400 mr-1">/ {viewListing.price_period}</span>
                </p>
              )}
              <div className="grid grid-cols-4 gap-2 text-center">
                {viewListing.area > 0 && <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-2"><p className="font-bold text-sm">{viewListing.area}</p><p className="text-xs text-gray-500">م²</p></div>}
                {viewListing.rooms > 0 && <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-2"><p className="font-bold text-sm">{viewListing.rooms}</p><p className="text-xs text-gray-500">غرف</p></div>}
                {viewListing.bathrooms > 0 && <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-2"><p className="font-bold text-sm">{viewListing.bathrooms}</p><p className="text-xs text-gray-500">حمام</p></div>}
                {viewListing.floor > 0 && <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-2"><p className="font-bold text-sm">{viewListing.floor}</p><p className="text-xs text-gray-500">دور</p></div>}
              </div>
              {viewListing.amenities?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {viewListing.amenities.map((a, i) => <span key={i} className="bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-lg">✓ {a}</span>)}
                </div>
              )}
              {viewListing.description && <p className="text-sm text-gray-600 dark:text-gray-300">{viewListing.description}</p>}
              <div className="flex gap-2 text-xs text-gray-500">
                <span>👤 {viewListing.contact_name}</span>
                {viewListing.unit_number && <span>🚪 وحدة {viewListing.unit_number}</span>}
                <span>👁️ {viewListing.views} مشاهدة</span>
              </div>
              {viewListing.contact_phone && (
                <a href={`tel:${viewListing.contact_phone}`}
                  className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors">
                  <PhoneIcon className="h-5 w-5" /> {viewListing.contact_phone}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
