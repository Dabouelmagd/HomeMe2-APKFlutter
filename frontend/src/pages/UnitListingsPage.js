import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  PlusIcon, HomeIcon, PhoneIcon, EyeIcon, PencilIcon, TrashIcon,
  MagnifyingGlassIcon, XMarkIcon, BuildingOffice2Icon, MapPinIcon,
  DocumentTextIcon, CheckCircleIcon, XCircleIcon, ClockIcon,
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
const FURNISHED = {
  furnished:   { ar: 'مفروشة كاملاً', icon: '🛋️' },
  semi:        { ar: 'نصف مفروشة',    icon: '🪑' },
  unfurnished: { ar: 'غير مفروشة',    icon: '🏗️' },
};
const FINISHING = {
  super_lux:  { ar: 'سوبر لوكس',  color: 'text-yellow-600' },
  lux:        { ar: 'لوكس',       color: 'text-blue-600' },
  standard:   { ar: 'عادي',       color: 'text-gray-600' },
  unfinished: { ar: 'على الخرسانة', color: 'text-red-500' },
};
const STATUS_COLORS = {
  active:   'bg-emerald-100 text-emerald-700',
  pending:  'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
  rented:   'bg-blue-100 text-blue-700',
  sold:     'bg-gray-100 text-gray-500',
};
const STATUS_LABELS = {
  active: 'متاح', pending: 'قيد المراجعة', rejected: 'مرفوض', rented: 'مؤجّر', sold: 'مباع'
};

const emptyForm = {
  title: '', listing_type: 'rent', description: '', unit_number: '', floor: '',
  area: '', rooms: '', bathrooms: '', reception: '',
  furnished: 'unfurnished', has_ac: false, has_kitchen: false, has_appliances: false,
  finishing_level: 'standard',
  price: '', price_period: 'إجمالي', price_negotiable: false,
  offer_price: '', fully_paid: true, has_installments: false, remaining_installments: '',
  contact_name: '', contact_phone: '', contact_whatsapp: '',
  lat: '', lng: '', location_notes: '',
  amenities: '', commission_percent: '',
  compound_id: '',
};

export default function UnitListingsPage() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [pending, setPending] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);
  const [docs, setDocs] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterFurnished, setFilterFurnished] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewListing, setViewListing] = useState(null);
  const [activeTab, setActiveTab] = useState('listings'); // listings / pending / my

  const isAdmin = ['app_owner', 'super_admin', 'admin', 'company_admin', 'manager'].includes(user?.role);
  const isOwnerOrSuper = ['app_owner', 'super_admin'].includes(user?.role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.append('listing_type', filterType);
      if (filterStatus) params.append('status', filterStatus);
      if (filterFurnished) params.append('furnished', filterFurnished);
      const [lr, sr] = await Promise.all([
        axios.get(`${API}/unit-listings?${params}`, tok()),
        axios.get(`${API}/unit-listings/stats/summary`, tok()),
      ]);
      setListings(lr.data.listings || []);
      setStats(sr.data);
      if (isAdmin) {
        const pr = await axios.get(`${API}/unit-listings/pending`, tok());
        setPending(pr.data.listings || []);
      }
    } catch { toast.error('فشل تحميل البيانات'); }
    finally { setLoading(false); }
  }, [filterType, filterStatus, filterFurnished, isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('العنوان مطلوب'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, v);
      });
      if (!form.compound_id) fd.set('compound_id', user?.compound_id || '');
      images.forEach(f => fd.append('images', f));
      docs.forEach(f => fd.append('documents', f));

      if (editId) {
        await axios.put(`${API}/unit-listings/${editId}`,
          Object.fromEntries(Object.entries(form).filter(([,v]) => v !== '')),
          tok()
        );
        toast.success('✅ تم التحديث');
      } else {
        const res = await axios.post(`${API}/unit-listings`, fd, {
          headers: { ...tok().headers, 'Content-Type': 'multipart/form-data' }
        });
        if (res.data.status === 'pending') {
          toast.success('✅ تم إرسال الإعلان — بانتظار موافقة الأدمن');
        } else {
          toast.success('✅ تم نشر الإعلان');
        }
      }
      setShowForm(false); setForm(emptyForm); setImages([]); setDocs([]); setEditId(null);
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'فشل الحفظ'); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id, action, reason = '') => {
    try {
      await axios.put(`${API}/unit-listings/${id}/approve`, { action, reason }, tok());
      toast.success(action === 'approve' ? '✅ تم الموافقة' : '❌ تم الرفض');
      fetchData();
    } catch { toast.error('فشل التحديث'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('تأكيد حذف الإعلان؟')) return;
    try { await axios.delete(`${API}/unit-listings/${id}`, tok()); toast.success('✅ تم الحذف'); fetchData(); }
    catch { toast.error('فشل الحذف'); }
  };

  const handleStatusChange = async (id, status) => {
    try { await axios.put(`${API}/unit-listings/${id}`, { status }, tok()); fetchData(); }
    catch { toast.error('فشل التحديث'); }
  };

  const myListings = listings.filter(l => l.created_by === user?.id);
  const filtered = (activeTab === 'my' ? myListings : listings).filter(l =>
    !search || l.title?.includes(search) || l.unit_number?.includes(search)
  );

  const F = ({ label, children }) => (
    <div>
      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  );
  const inp = (k, props = {}) => (
    <input value={form[k]} onChange={e => set(k, e.target.value)}
      className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-300" {...props} />
  );
  const sel = (k, options) => (
    <select value={form[k]} onChange={e => set(k, e.target.value)}
      className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
  const chk = (k, label) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)}
        className="w-4 h-4 rounded text-emerald-600" />
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <BuildingOffice2Icon className="h-6 w-6 text-emerald-600" />
            وحدات للإيجار والبيع
          </h1>
          <p className="text-xs text-gray-500">أعلن عن وحدتك داخل الكمبوند</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyForm); }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl transition-colors shadow text-sm">
          <PlusIcon className="h-4 w-4" /> إضافة إعلان
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { l: 'متاح', v: stats.active, c: 'text-emerald-600' },
            { l: 'قيد المراجعة', v: stats.pending, c: 'text-amber-600' },
            { l: 'مؤجّر', v: stats.rented, c: 'text-blue-600' },
            { l: 'مباع', v: stats.sold, c: 'text-gray-500' },
            ...Object.entries(stats.by_type || {}).slice(0,2).map(([k,v]) => ({ l: TYPES[k]?.ar, v, c: 'text-gray-700' })),
          ].map(({ l, v, c }) => (
            <div key={l} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center">
              <p className={`text-2xl font-black ${c}`}>{v}</p>
              <p className="text-xs text-gray-500 mt-0.5">{l}</p>
            </div>
          ))}
          {isAdmin && stats.total_commission_earned > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
              <p className="text-lg font-black text-emerald-700">{stats.total_commission_earned?.toLocaleString('ar-EG')}</p>
              <p className="text-xs text-gray-500">عمولة محصّلة</p>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[['listings','كل الإعلانات'], ...(isAdmin ? [['pending',`قيد المراجعة (${pending.length})`]] : []), ['my','إعلاناتي']].map(([k,l]) => (
          <button key={k} onClick={() => setActiveTab(k)}
            className={`pb-2 px-3 text-sm font-bold border-b-2 transition-colors ${activeTab===k ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Pending approvals (admin) */}
      {activeTab === 'pending' && isAdmin && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="text-center text-gray-400 py-10"><CheckCircleIcon className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>لا توجد إعلانات بانتظار الموافقة</p></div>
          ) : pending.map(l => (
            <div key={l.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-amber-200 dark:border-amber-700 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-gray-900 dark:text-white">{l.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${TYPES[l.listing_type]?.color}`}>{TYPES[l.listing_type]?.ar}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">👤 {l.creator_name} • 🚪 {l.unit_number || 'غير محدد'} • 💰 {l.price?.toLocaleString('ar-EG')} ج.م</p>
                  {l.commission_percent > 0 && (
                    <p className="text-xs text-emerald-600 font-bold mt-1">💼 عمولة: {l.commission_percent}% = {l.commission_amount?.toLocaleString('ar-EG')} ج.م</p>
                  )}
                  {l.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{l.description}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleApprove(l.id, 'approve')}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                    <CheckCircleIcon className="h-3.5 w-3.5" /> موافقة
                  </button>
                  <button onClick={() => { const r = prompt('سبب الرفض:'); if (r !== null) handleApprove(l.id, 'reject', r); }}
                    className="flex items-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                    <XCircleIcon className="h-3.5 w-3.5" /> رفض
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Listings grid */}
      {activeTab !== 'pending' && (
        <>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-36">
              <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 pr-9 text-sm bg-white dark:bg-gray-800 outline-none" />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 outline-none">
              <option value="">كل الأنواع</option>
              {Object.entries(TYPES).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.ar}</option>)}
            </select>
            <select value={filterFurnished} onChange={e => setFilterFurnished(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 outline-none">
              <option value="">كل الحالات</option>
              {Object.entries(FURNISHED).map(([k,v]) => <option key={k} value={k}>{v.ar}</option>)}
            </select>
            {isAdmin && (
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 outline-none">
                {Object.entries(STATUS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                <option value="">الكل</option>
              </select>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"/></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <HomeIcon className="h-14 w-14 mx-auto mb-3 opacity-30" />
              <p className="font-bold">لا توجد إعلانات</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(l => (
                <div key={l.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Image */}
                  <div className="h-40 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-700 dark:to-gray-600 relative">
                    {l.images?.[0] ? (
                      <img src={`${process.env.REACT_APP_BACKEND_URL}${l.images[0]}`} alt="" className="w-full h-full object-cover"/>
                    ) : (
                      <div className="flex items-center justify-center h-full text-5xl">{TYPES[l.listing_type]?.icon}</div>
                    )}
                    <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-lg ${TYPES[l.listing_type]?.color}`}>{TYPES[l.listing_type]?.ar}</span>
                    <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded-lg ${STATUS_COLORS[l.status]}`}>{STATUS_LABELS[l.status]}</span>
                    {l.status === 'pending' && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><ClockIcon className="h-8 w-8 text-white"/></div>}
                  </div>

                  <div className="p-4 space-y-2">
                    <h3 className="font-black text-sm text-gray-900 dark:text-white line-clamp-1">{l.title}</h3>
                    {l.price > 0 && (
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-emerald-600">{l.price?.toLocaleString('ar-EG')}</span>
                        <span className="text-xs text-gray-400">ج.م/{l.price_period}</span>
                        {l.price_negotiable && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-lg font-bold">قابل للتفاوض</span>}
                      </div>
                    )}

                    {/* Key info pills */}
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      {l.furnished && <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-lg">{FURNISHED[l.furnished]?.icon} {FURNISHED[l.furnished]?.ar}</span>}
                      {l.area > 0 && <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-lg">📐 {l.area}م²</span>}
                      {l.rooms > 0 && <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-lg">🛏️ {l.rooms}</span>}
                      {l.finishing_level && FINISHING[l.finishing_level] && (
                        <span className={`px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-700 ${FINISHING[l.finishing_level]?.color}`}>✨ {FINISHING[l.finishing_level]?.ar}</span>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1 text-xs">
                      {l.has_ac && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">❄️ تكييف</span>}
                      {l.has_kitchen && <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">🍳 مطبخ</span>}
                      {l.has_appliances && <span className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">🧺 أجهزة</span>}
                      {l.fully_paid && <span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">✅ مسدد</span>}
                      {l.has_installments && <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded">💳 أقساط</span>}
                      {l.offer_price > 0 && <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">⬆️ أوفر +{l.offer_price?.toLocaleString()}</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5 pt-1 flex-wrap">
                      <button onClick={() => setViewListing(l)}
                        className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 px-2 py-1.5 rounded-lg">
                        <EyeIcon className="h-3.5 w-3.5"/> عرض
                      </button>
                      {l.contact_phone && (
                        <a href={`tel:${l.contact_phone}`}
                          className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-1.5 rounded-lg">
                          <PhoneIcon className="h-3.5 w-3.5"/> تواصل
                        </a>
                      )}
                      {(isAdmin || l.created_by === user?.id) && (
                        <>
                          <button onClick={() => { setEditId(l.id); setForm({...emptyForm,...l,amenities:(l.amenities||[]).join(',')}); setShowForm(true); }}
                            className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1.5 rounded-lg">
                            <PencilIcon className="h-3.5 w-3.5 inline" />
                          </button>
                          <button onClick={() => handleDelete(l.id)}
                            className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1.5 rounded-lg">
                            <TrashIcon className="h-3.5 w-3.5 inline" />
                          </button>
                        </>
                      )}
                    </div>
                    {isAdmin && l.status === 'active' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleStatusChange(l.id,'rented')} className="flex-1 text-xs bg-blue-600 text-white py-1 rounded-lg">تم الإيجار</button>
                        <button onClick={() => handleStatusChange(l.id,'sold')} className="flex-1 text-xs bg-gray-600 text-white py-1 rounded-lg">تم البيع</button>
                      </div>
                    )}
                    {l.rejection_reason && (
                      <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">❌ سبب الرفض: {l.rejection_reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ADD / EDIT FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h3 className="font-black text-gray-900 dark:text-white">{editId ? 'تعديل الإعلان' : '📢 إعلان وحدة جديد'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <XMarkIcon className="h-5 w-5"/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4" dir="rtl">

              {/* ── Section 1: Basic ── */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 space-y-3">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wide">📋 المعلومات الأساسية</p>
                <div className="grid grid-cols-2 gap-3">
                  <F label="عنوان الإعلان *"><div className="col-span-2">{inp('title', {placeholder: 'مثال: شقة 3 غرف للإيجار في دور 5'})}</div></F>
                  <F label="نوع الإعلان">{sel('listing_type', Object.entries(TYPES).map(([k,v])=>[k,`${v.icon} ${v.ar}`]))}</F>
                  <F label="رقم الوحدة">{inp('unit_number', {placeholder: 'A-101'})}</F>
                  <F label="الدور">{inp('floor', {type:'number', placeholder:'0'})}</F>
                  <F label="المساحة (م²)">{inp('area', {type:'number'})}</F>
                </div>
                <F label="الوصف التفصيلي">
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                    placeholder="اكتب وصفاً تفصيلياً للوحدة..."
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none resize-none"/>
                </F>
              </div>

              {/* ── Section 2: Finishing & Furnishing ── */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 space-y-3">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wide">🏗️ التشطيب والأثاث</p>
                <div className="grid grid-cols-2 gap-3">
                  <F label="حالة الفرش">{sel('furnished', Object.entries(FURNISHED).map(([k,v])=>[k,`${v.icon} ${v.ar}`]))}</F>
                  <F label="مستوى التشطيب">{sel('finishing_level', Object.entries(FINISHING).map(([k,v])=>[k,v.ar]).concat([['','غير محدد']]))}</F>
                </div>
                <div className="flex gap-4 flex-wrap">
                  {chk('has_ac', '❄️ تكييفات')}
                  {chk('has_kitchen', '🍳 مطبخ مجهّز')}
                  {chk('has_appliances', '🧺 أجهزة كهربائية')}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <F label="الغرف">{inp('rooms', {type:'number'})}</F>
                  <F label="الحمامات">{inp('bathrooms', {type:'number'})}</F>
                  <F label="الصالة">{inp('reception', {type:'number'})}</F>
                </div>
              </div>

              {/* ── Section 3: Pricing ── */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 space-y-3">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wide">💰 التسعير والدفع</p>
                <div className="grid grid-cols-2 gap-3">
                  <F label="السعر المطلوب (ج.م)">{inp('price', {type:'number'})}</F>
                  <F label="فترة السعر">{sel('price_period', [['إجمالي','إجمالي'],['شهري','شهري'],['سنوي','سنوي'],['يومي','يومي']])}</F>
                  <F label="رقم الأوفر (إضافي)">{inp('offer_price', {type:'number', placeholder:'0'})}</F>
                </div>
                <div className="flex gap-4 flex-wrap">
                  {chk('price_negotiable', '🤝 السعر قابل للتفاوض')}
                  {chk('fully_paid', '✅ مسدد الثمن بالكامل')}
                  {chk('has_installments', '💳 عليها أقساط')}
                </div>
                {form.has_installments && (
                  <F label="المبلغ المتبقي من الأقساط (ج.م)">{inp('remaining_installments', {type:'number'})}</F>
                )}
                {/* Commission — only show if user is not admin, or always show */}
                <div className="border border-dashed border-emerald-300 rounded-xl p-3 bg-emerald-50 dark:bg-emerald-900/10">
                  <p className="text-xs font-bold text-emerald-700 mb-1">💼 نسبة العمولة للكمبوند (لا تظهر في الإعلان)</p>
                  <div className="flex items-center gap-2">
                    {inp('commission_percent', {type:'number', placeholder:'0', className:'w-24 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 outline-none'})}
                    <span className="text-sm text-gray-500">%</span>
                    {form.price && form.commission_percent && (
                      <span className="text-xs text-emerald-600 font-bold">= {Math.round(form.price * form.commission_percent / 100).toLocaleString('ar-EG')} ج.م</span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Section 4: Amenities ── */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wide">⭐ المميزات</p>
                <F label="المميزات (مفصولة بفاصلة)">
                  {inp('amenities', {placeholder:'مثال: حديقة, جراج, أمن 24 ساعة, نادي, حمام سباحة'})}
                </F>
              </div>

              {/* ── Section 5: Contact ── */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 space-y-3">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wide">📞 بيانات التواصل</p>
                <div className="grid grid-cols-2 gap-3">
                  <F label="اسم المتصل">{inp('contact_name')}</F>
                  <F label="رقم الهاتف">{inp('contact_phone', {placeholder:'01xxxxxxxxx'})}</F>
                  <F label="واتساب">{inp('contact_whatsapp', {placeholder:'01xxxxxxxxx'})}</F>
                </div>
              </div>

              {/* ── Section 6: Location ── */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 space-y-3">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wide">📍 الموقع</p>
                <div className="grid grid-cols-2 gap-3">
                  <F label="خط العرض (Lat)">{inp('lat', {type:'number', step:'any'})}</F>
                  <F label="خط الطول (Lng)">{inp('lng', {type:'number', step:'any'})}</F>
                </div>
                <F label="ملاحظات الموقع">{inp('location_notes', {placeholder:'مثال: أمام الحديقة الرئيسية'})}</F>
              </div>

              {/* ── Section 7: Files ── */}
              {!editId && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 space-y-3">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wide">📎 الصور والمستندات</p>
                  <F label="صور الوحدة (حتى 8)">
                    <input type="file" multiple accept="image/*" onChange={e => setImages(Array.from(e.target.files).slice(0,8))}
                      className="w-full text-sm text-gray-500 file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:text-emerald-700 file:font-bold file:text-xs"/>
                    {images.length > 0 && <p className="text-xs text-emerald-600 mt-1">✅ {images.length} صورة</p>}
                  </F>
                  <F label="أوراق الوحدة (عقود، طوابق، إلخ)">
                    <input type="file" multiple accept=".pdf,.jpg,.png,.doc,.docx" onChange={e => setDocs(Array.from(e.target.files).slice(0,5))}
                      className="w-full text-sm text-gray-500 file:ml-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-700 file:font-bold file:text-xs"/>
                    {docs.length > 0 && <p className="text-xs text-blue-600 mt-1">✅ {docs.length} ملف</p>}
                  </F>
                </div>
              )}

              {!isAdmin && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                  ⏳ سيتم مراجعة إعلانك من قِبل إدارة الكمبوند قبل النشر
                </div>
              )}
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60 text-sm">
                {saving ? '...' : editId ? '✅ حفظ التعديلات' : '📢 إرسال للمراجعة'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewListing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-3" onClick={() => setViewListing(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Images */}
            <div className="h-52 bg-gradient-to-br from-emerald-50 to-teal-50 relative">
              {viewListing.images?.[0]
                ? <img src={`${process.env.REACT_APP_BACKEND_URL}${viewListing.images[0]}`} className="w-full h-full object-cover" alt=""/>
                : <div className="flex items-center justify-center h-full text-6xl">{TYPES[viewListing.listing_type]?.icon}</div>
              }
              <button onClick={() => setViewListing(null)} className="absolute top-3 left-3 bg-black/40 text-white rounded-full p-1.5">
                <XMarkIcon className="h-4 w-4"/>
              </button>
              <div className="absolute bottom-3 right-3 flex gap-2">
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${TYPES[viewListing.listing_type]?.color}`}>{TYPES[viewListing.listing_type]?.ar}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${STATUS_COLORS[viewListing.status]}`}>{STATUS_LABELS[viewListing.status]}</span>
              </div>
            </div>

            <div className="p-5 space-y-4" dir="rtl">
              <h2 className="font-black text-gray-900 dark:text-white text-lg">{viewListing.title}</h2>

              {viewListing.price > 0 && (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-600">{viewListing.price?.toLocaleString('ar-EG')} ج.م</span>
                  <span className="text-sm text-gray-400">/{viewListing.price_period}</span>
                  {viewListing.price_negotiable && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg font-bold">قابل للتفاوض</span>}
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                {viewListing.area > 0 && <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-2"><p className="font-black text-sm">{viewListing.area}</p><p className="text-xs text-gray-500">م²</p></div>}
                {viewListing.rooms > 0 && <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-2"><p className="font-black text-sm">{viewListing.rooms}</p><p className="text-xs text-gray-500">غرف</p></div>}
                {viewListing.bathrooms > 0 && <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-2"><p className="font-black text-sm">{viewListing.bathrooms}</p><p className="text-xs text-gray-500">حمام</p></div>}
                {viewListing.floor > 0 && <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-2"><p className="font-black text-sm">{viewListing.floor}</p><p className="text-xs text-gray-500">دور</p></div>}
              </div>

              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                {viewListing.furnished && <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-lg">{FURNISHED[viewListing.furnished]?.icon} {FURNISHED[viewListing.furnished]?.ar}</span>}
                {viewListing.finishing_level && FINISHING[viewListing.finishing_level] && (
                  <span className={`bg-gray-100 text-xs px-2 py-1 rounded-lg ${FINISHING[viewListing.finishing_level]?.color}`}>✨ {FINISHING[viewListing.finishing_level]?.ar}</span>
                )}
                {viewListing.has_ac && <span className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-lg">❄️ تكييف</span>}
                {viewListing.has_kitchen && <span className="bg-orange-50 text-orange-600 text-xs px-2 py-1 rounded-lg">🍳 مطبخ</span>}
                {viewListing.has_appliances && <span className="bg-purple-50 text-purple-600 text-xs px-2 py-1 rounded-lg">🧺 أجهزة</span>}
                {viewListing.fully_paid && <span className="bg-emerald-50 text-emerald-600 text-xs px-2 py-1 rounded-lg">✅ مسدد بالكامل</span>}
                {viewListing.has_installments && <span className="bg-red-50 text-red-600 text-xs px-2 py-1 rounded-lg">💳 أقساط متبقية: {viewListing.remaining_installments?.toLocaleString('ar-EG')} ج.م</span>}
                {viewListing.offer_price > 0 && <span className="bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-lg font-bold">⬆️ رقم أوفر: +{viewListing.offer_price?.toLocaleString('ar-EG')} ج.م</span>}
              </div>

              {viewListing.amenities?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {viewListing.amenities.map((a,i) => <span key={i} className="bg-emerald-50 text-emerald-700 text-xs px-2 py-1 rounded-lg">✓ {a}</span>)}
                </div>
              )}

              {viewListing.description && <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{viewListing.description}</p>}

              {/* Location */}
              {(viewListing.lat > 0 || viewListing.location_notes) && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPinIcon className="h-4 w-4 text-red-500 flex-shrink-0"/>
                  <span>{viewListing.location_notes}</span>
                  {viewListing.lat > 0 && (
                    <a href={`https://maps.google.com/?q=${viewListing.lat},${viewListing.lng}`} target="_blank" rel="noreferrer"
                      className="text-xs text-blue-600 underline">فتح الخريطة</a>
                  )}
                </div>
              )}

              {/* Documents (admin only) */}
              {isAdmin && viewListing.documents?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><DocumentTextIcon className="h-4 w-4"/> أوراق الوحدة</p>
                  <div className="flex flex-wrap gap-2">
                    {viewListing.documents.map((d,i) => (
                      <a key={i} href={`${process.env.REACT_APP_BACKEND_URL}${d}`} target="_blank" rel="noreferrer"
                        className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100">
                        📄 مستند {i+1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin commission (hidden) */}
              {isAdmin && viewListing.commission_percent > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs">
                  <p className="font-bold text-emerald-700">💼 العمولة: {viewListing.commission_percent}% = {viewListing.commission_amount?.toLocaleString('ar-EG')} ج.م</p>
                </div>
              )}

              <div className="text-xs text-gray-400">👁️ {viewListing.views} مشاهدة • 👤 {viewListing.creator_name}</div>

              {/* Contact buttons */}
              <div className="flex gap-3">
                {viewListing.contact_phone && (
                  <a href={`tel:${viewListing.contact_phone}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                    <PhoneIcon className="h-4 w-4"/> اتصل
                  </a>
                )}
                {viewListing.contact_whatsapp && (
                  <a href={`https://wa.me/${viewListing.contact_whatsapp?.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                    💬 واتساب
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
