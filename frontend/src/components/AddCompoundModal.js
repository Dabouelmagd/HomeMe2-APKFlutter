import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { XMarkIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tok = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function AddCompoundModal({ open, onClose, onSuccess, companyId = null }) {
  const [form, setForm] = useState({
    name: '', address: '', city: '', phone: '', email: '', description: ''
  });
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('اسم الكمبوند مطلوب'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/compounds`, {
        ...form,
        company_id: companyId || undefined,
      }, tok());
      toast.success(`✅ تم إنشاء كمبوند "${form.name}" بنجاح`);
      onSuccess?.(res.data.compound);
      onClose();
      setForm({ name: '', address: '', city: '', phone: '', email: '', description: '' });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل إنشاء الكمبوند');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <BuildingOfficeIcon className="h-5 w-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">إضافة كمبوند جديد</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">اسم الكمبوند *</label>
              <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
                placeholder="مثال: الرحاب ريزيدنس"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">العنوان</label>
              <input value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))}
                placeholder="الشارع والمنطقة"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">المدينة</label>
              <input value={form.city} onChange={e => setForm(p => ({...p, city: e.target.value}))}
                placeholder="القاهرة"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">رقم الهاتف</label>
              <input value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))}
                placeholder="01xxxxxxxxx"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني</label>
              <input value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
                placeholder="info@compound.com"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-300" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">وصف الكمبوند</label>
              <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
                rows={2} placeholder="وصف مختصر..."
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-300 resize-none" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60">
            {loading ? '...' : '✅ إنشاء الكمبوند'}
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
