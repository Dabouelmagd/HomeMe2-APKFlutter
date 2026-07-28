import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { XMarkIcon, CheckIcon, UserIcon } from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const token = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function EditResidentModal({ resident, onClose, onUpdated }) {
  const [form, setForm] = useState({
    full_name:   resident.full_name || '',
    email:       resident.email || '',
    phone:       resident.phone || '',
    unit_number: resident.unit_number || '',
    national_id: resident.national_id || '',
    role:        resident.role || 'resident',
    is_active:   resident.is_active !== false,
    notes:       resident.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('الاسم مطلوب'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (newPassword.trim()) {
        if (newPassword.length < 6) { toast.error('كلمة المرور 6 أحرف على الأقل'); setSaving(false); return; }
        payload.password = newPassword;
      }
      await axios.put(`${API}/admin/users/${resident.id}`, payload, token());
      toast.success('✅ تم تحديث البيانات');
      onUpdated?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل التحديث');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">تعديل بيانات الساكن</h2>
              <p className="text-xs text-gray-500">@{resident.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Name + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الاسم الكامل *</label>
              <input value={form.full_name} onChange={e => setForm(p => ({...p, full_name: e.target.value}))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-300 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">رقم الوحدة</label>
              <input value={form.unit_number} onChange={e => setForm(p => ({...p, unit_number: e.target.value}))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-300 outline-none" />
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-300 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الهاتف</label>
              <input type="tel" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-300 outline-none" />
            </div>
          </div>

          {/* National ID + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الرقم القومي</label>
              <input value={form.national_id} onChange={e => setForm(p => ({...p, national_id: e.target.value}))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-300 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الدور</label>
              <select value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-300 outline-none">
                <option value="resident">ساكن</option>
                <option value="family_head">رب أسرة</option>
                <option value="security">أمن</option>
                <option value="admin">مدير</option>
                <option value="accountant">محاسب</option>
              </select>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              كلمة مرور جديدة <span className="text-gray-400 font-normal">(اتركها فارغة لعدم التغيير)</span>
            </label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-300 outline-none" />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-300 outline-none" />
          </div>

          {/* Active status */}
          <div className="flex items-center gap-3">
            <input type="checkbox" id="is_active" checked={form.is_active}
              onChange={e => setForm(p => ({...p, is_active: e.target.checked}))}
              className="w-4 h-4 accent-emerald-600" />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300 font-medium">الحساب نشط</label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors">
            <CheckIcon className="h-4 w-4" />
            {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
