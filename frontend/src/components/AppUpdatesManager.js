import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  PlusIcon, TrashIcon, PencilSquareIcon, ArrowUpCircleIcon,
  SparklesIcon, WrenchScrewdriverIcon, ShieldCheckIcon, BoltIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tok = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const TYPES = [
  { value: 'feature',     label: '✨ ميزة جديدة', icon: SparklesIcon,          color: 'text-violet-600 bg-violet-50' },
  { value: 'fix',         label: '🔧 إصلاح خطأ',  icon: WrenchScrewdriverIcon, color: 'text-amber-600 bg-amber-50'   },
  { value: 'security',    label: '🔒 تحديث أمني', icon: ShieldCheckIcon,       color: 'text-red-600 bg-red-50'       },
  { value: 'improvement', label: '⚡ تحسين',       icon: BoltIcon,              color: 'text-blue-600 bg-blue-50'     },
];

const EMPTY = { title: '', description: '', version: '', type: 'feature' };

export default function AppUpdatesManager() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const load = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/app-updates/admin/list`, tok());
      setUpdates(res.data.updates || []);
    } catch { toast.error('فشل التحميل'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) return toast.error('العنوان مطلوب');
    setSaving(true);
    try {
      if (editId) {
        await axios.put(`${API}/app-updates/admin/${editId}`, form, tok());
        toast.success('تم التعديل');
        setEditId(null);
      } else {
        const res = await axios.post(`${API}/app-updates/admin/create`, form, tok());
        toast.success(`✅ تم النشر — تم إرسال إشعار لـ ${res.data.notified} مستخدم`);
      }
      setForm(EMPTY);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل الحفظ');
    } finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('تأكيد الحذف؟')) return;
    await axios.delete(`${API}/app-updates/admin/${id}`, tok());
    toast.success('تم الحذف');
    load();
  };

  const startEdit = (u) => {
    setEditId(u.id);
    setForm({ title: u.title, description: u.description || '', version: u.version || '', type: u.type || 'feature' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <ArrowUpCircleIcon className="h-5 w-5 text-emerald-600" />
          {editId ? 'تعديل تحديث' : 'نشر تحديث جديد'}
        </h3>

        <div className="space-y-3">
          {/* Type selector */}
          <div className="flex gap-2 flex-wrap">
            {TYPES.map(t => (
              <button key={t.value} type="button"
                onClick={() => set('type', t.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                  form.type === t.value
                    ? 'border-emerald-500 ' + t.color
                    : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">العنوان *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="عنوان التحديث..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">رقم الإصدار</label>
              <input value={form.version} onChange={e => set('version', e.target.value)}
                placeholder="2.4.0"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">التفاصيل</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="وصف مفصّل للتحديث..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none resize-none" />
          </div>

          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2.5 rounded-xl text-sm disabled:opacity-60 transition-colors">
              <PlusIcon className="h-4 w-4" />
              {saving ? 'جاري النشر...' : editId ? 'حفظ التعديل' : '📢 نشر وإرسال إشعار للجميع'}
            </button>
            {editId && (
              <button onClick={() => { setEditId(null); setForm(EMPTY); }}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                إلغاء
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Updates list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">
            التحديثات المنشورة ({updates.length})
          </h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">جاري التحميل...</div>
        ) : updates.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">لا توجد تحديثات بعد</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {updates.map(u => {
              const t = TYPES.find(x => x.value === u.type) || TYPES[0];
              const Icon = t.icon;
              return (
                <div key={u.id} className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${t.color.split(' ')[1]}`}>
                    <Icon className={`h-4 w-4 ${t.color.split(' ')[0]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${t.color}`}>{t.label}</span>
                      {u.version && <span className="text-[10px] text-gray-400 font-mono">v{u.version}</span>}
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">{u.title}</p>
                    {u.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{u.description}</p>}
                    <p className="text-[10px] text-gray-400 mt-0.5">{new Date(u.created_at).toLocaleDateString('ar-EG')}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => del(u.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
