import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  UserPlusIcon, TrashIcon, PencilSquareIcon,
  ShieldCheckIcon, UsersIcon, XMarkIcon, CheckIcon,
  BuildingOffice2Icon, KeyIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLES = {
  admin:             { label: 'مدير تنفيذي',   emoji: '👑', color: 'emerald' },
  manager:           { label: 'مدير',            emoji: '🏢', color: 'blue'    },
  assistant_manager: { label: 'مساعد مدير',      emoji: '🤝', color: 'teal'   },
  accountant:        { label: 'محاسب',           emoji: '💰', color: 'amber'  },
  security:          { label: 'أمن',             emoji: '🛡️', color: 'slate'  },
};

const COLOR = {
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  blue:    'bg-blue-50 border-blue-200 text-blue-700',
  teal:    'bg-teal-50 border-teal-200 text-teal-700',
  amber:   'bg-amber-50 border-amber-200 text-amber-700',
  slate:   'bg-slate-50 border-slate-200 text-slate-700',
};

const EMPTY_FORM = {
  full_name: '', username: '', email: '',
  password: '', phone: '', role: 'assistant_manager',
};

export default function CompanyAssistantsManager({ compoundId = null, compoundName = '' }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  const isCompoundMode = !!compoundId;
  const endpoint = isCompoundMode
    ? `${API}/company-admin/compounds/${compoundId}/team`
    : `${API}/company-admin/assistants`;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (isCompoundMode) {
        // Flatten grouped team
        const grouped = data.team || {};
        const flat = Object.values(grouped).flat();
        setMembers(flat);
      } else {
        setMembers(data.assistants || []);
      }
    } catch {
      toast.error('تعذّر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [endpoint, isCompoundMode]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleSubmit = async () => {
    if (!form.full_name || !form.username || !form.email || !form.password) {
      toast.error('الرجاء تعبئة الحقول المطلوبة');
      return;
    }
    setSaving(true);
    try {
      await axios.post(endpoint, form, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      toast.success('تمت الإضافة بنجاح ✅');
      setForm(EMPTY_FORM);
      setShowForm(false);
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('هل تريد حذف هذا العضو؟')) return;
    try {
      const delEndpoint = isCompoundMode
        ? `${API}/company-admin/compounds/${compoundId}/users/${userId}`
        : `${API}/company-admin/assistants/${userId}`;
      await axios.delete(delEndpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      toast.success('تم الحذف');
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل الحذف');
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isCompoundMode
            ? <BuildingOffice2Icon className="h-5 w-5 text-emerald-600" />
            : <UsersIcon className="h-5 w-5 text-emerald-600" />
          }
          <h3 className="font-bold text-gray-800">
            {isCompoundMode
              ? `فريق عمل: ${compoundName}`
              : 'مساعدو الشركة'
            }
          </h3>
          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
            {members.length}
          </span>
        </div>
        <button
          onClick={() => { setShowForm(true); setForm(EMPTY_FORM); }}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          <UserPlusIcon className="h-4 w-4" />
          إضافة {isCompoundMode ? 'عضو فريق' : 'مساعد'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
          <h4 className="font-bold text-emerald-800 flex items-center gap-2">
            <UserPlusIcon className="h-4 w-4" />
            {isCompoundMode ? 'إضافة عضو لفريق الكمبوند' : 'إضافة مساعد للشركة'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'full_name',  label: 'الاسم الكامل *',       type: 'text' },
              { key: 'username',   label: 'اسم المستخدم *',        type: 'text' },
              { key: 'email',      label: 'البريد الإلكتروني *',   type: 'email' },
              { key: 'password',   label: 'كلمة المرور *',          type: 'password' },
              { key: 'phone',      label: 'رقم الهاتف',             type: 'text' },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-xs font-bold text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">الدور *</label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-300 outline-none"
              >
                {Object.entries(ROLES)
                  .filter(([k]) => isCompoundMode ? true : k !== 'security')
                  .map(([k, v]) => (
                    <option key={k} value={k}>{v.emoji} {v.label}</option>
                  ))
                }
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
            >
              <CheckIcon className="h-4 w-4" />
              {saving ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Members List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <UsersIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">لا يوجد {isCompoundMode ? 'أعضاء فريق' : 'مساعدون'} حتى الآن</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {members.map(member => {
            const roleInfo = ROLES[member.role] || { label: member.role, emoji: '👤', color: 'slate' };
            return (
              <div key={member.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-lg">
                      {roleInfo.emoji}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{member.full_name}</p>
                      <p className="text-xs text-gray-500">@{member.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${COLOR[roleInfo.color] || COLOR.slate}`}>
                  {roleInfo.emoji} {roleInfo.label}
                </div>
                {member.phone && (
                  <p className="text-xs text-gray-500 mt-2">📞 {member.phone}</p>
                )}
                <p className="text-xs text-gray-400 mt-1 truncate">✉️ {member.email}</p>
                <div className={`mt-2 text-xs px-2 py-0.5 rounded-full inline-block ${member.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {member.is_active ? '● نشط' : '● موقوف'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
