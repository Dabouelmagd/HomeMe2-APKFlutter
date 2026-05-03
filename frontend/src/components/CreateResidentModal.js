import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tokenHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/**
 * Modal for company admin / compound admin to create a new primary resident
 * (with their unit and login credentials).
 *
 * Props:
 *  - onClose, onCreated (refresh callback)
 */
const CreateResidentModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    unit_number: '',
    role: 'resident',
  });
  const [submitting, setSubmitting] = useState(false);
  const [activeCompoundName, setActiveCompoundName] = useState('');

  useEffect(() => {
    setActiveCompoundName(localStorage.getItem('active_compound_name') || '');
  }, []);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.username || !form.password || !form.unit_number) {
      toast.error('الاسم واسم المستخدم وكلمة المرور والوحدة حقول مطلوبة');
      return;
    }
    if (form.password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/admin/users`, form, tokenHeader());
      toast.success(res.data?.message || 'تم إنشاء الساكن بنجاح');
      onCreated?.(res.data);
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل إنشاء الساكن');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        data-testid="create-resident-modal"
      >
        <div className="bg-gradient-to-l from-emerald-600 to-teal-600 text-white p-5 sticky top-0 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <UserPlusIcon className="w-6 h-6" /> إضافة ساكن رئيسي جديد
            </h3>
            <p className="text-white/80 text-sm mt-1">
              {activeCompoundName ? `سيُضاف إلى: ${activeCompoundName}` : 'سيُضاف إلى الكمبوند النشط'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg" aria-label="إغلاق">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-3">
          <Field label="الاسم الكامل *" value={form.full_name} onChange={update('full_name')} testId="resident-fullname" placeholder="مثلاً: أحمد محمد علي" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="رقم الوحدة *" value={form.unit_number} onChange={update('unit_number')} testId="resident-unit" placeholder="A-12" />
            <Field label="رقم الهاتف" value={form.phone} onChange={update('phone')} testId="resident-phone" placeholder="01XXXXXXXXX" />
          </div>
          <Field label="اسم المستخدم *" value={form.username} onChange={update('username')} testId="resident-username" placeholder="ahmed_ali" />
          <Field label="البريد الإلكتروني" type="email" value={form.email} onChange={update('email')} testId="resident-email" placeholder="ahmed@example.com" />
          <Field label="كلمة المرور *" type="password" value={form.password} onChange={update('password')} testId="resident-password" placeholder="6 أحرف على الأقل" />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">الدور</label>
            <select value={form.role} onChange={update('role')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" data-testid="resident-role">
              <option value="resident">ساكن</option>
              <option value="security">أمن</option>
              <option value="staff">موظف خدمات</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold">
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              data-testid="submit-create-resident"
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? 'جارٍ الحفظ…' : (
                <>
                  <UserPlusIcon className="w-5 h-5" />
                  إضافة الساكن
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, type = 'text', placeholder, testId }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      data-testid={testId}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
    />
  </div>
);

export default CreateResidentModal;
