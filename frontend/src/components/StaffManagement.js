import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  UserPlusIcon,
  UsersIcon,
  TrashIcon,
  CheckCircleIcon,
  XMarkIcon,
  ShieldCheckIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import PageHeader from './shared/PageHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// UI labels for each preset — kept in sync with backend STAFF_ROLE_PRESETS keys
const ROLE_LABELS = {
  staff_finance:     { label: 'مساعد مالي',       desc: 'فواتير + مدفوعات + ميزانية', emoji: '💰', tone: 'emerald' },
  staff_maintenance: { label: 'مساعد صيانة',       desc: 'طلبات صيانة + شكاوى',         emoji: '🔧', tone: 'amber' },
  staff_security:    { label: 'مساعد أمن',         desc: 'الزوار + بوابة الأمن',         emoji: '🛡️', tone: 'slate' },
  staff_general:     { label: 'مساعد عام',         desc: 'السكان + الإعلانات + الشكاوى', emoji: '👥', tone: 'blue' },
};

const TONE_STYLES = {
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  amber:   'bg-amber-50 border-amber-200 text-amber-800',
  slate:   'bg-slate-50 border-slate-200 text-slate-800',
  blue:    'bg-blue-50 border-blue-200 text-blue-800',
};

const MODULE_LABELS = {
  finance: '💰 المالية',
  maintenance: '🔧 الصيانة',
  residents: '👥 السكان',
  announcements: '📢 الإعلانات',
  complaints: '⚠️ الشكاوى',
  visitors: '🚪 الزوار',
  analytics: '📊 التحليلات',
};

const StaffManagement = () => {
  const { t } = useTranslation();
  const [staff, setStaff] = useState([]);
  const [registry, setRegistry] = useState({ modules: [], role_presets: {} });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [staffRes, modulesRes] = await Promise.all([
        axios.get(`${API}/staff`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/staff/modules`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setStaff(staffRes.data?.staff || []);
      setRegistry({
        modules: modulesRes.data?.modules || [],
        role_presets: modulesRes.data?.role_presets || {},
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || t('staff_load_failed', 'فشل تحميل المساعدين'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirm_delete_staff', 'هل أنتِ متأكدة من حذف هذا المساعد؟'))) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/staff/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(t('staff_deleted', 'تم الحذف'));
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto" data-testid="staff-management-page">
      <PageHeader
        theme="purple"
        icon={UsersIcon}
        badge={t('staff_badge', 'فريق العمل')}
        title={t('staff_title', 'إدارة المساعدين')}
        subtitle={t('staff_subtitle', 'أضيفي مساعدين بصلاحيات محدودة — كل مساعد يدخل بحساب منفصل ويرى الأقسام المسموح بها فقط.')}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            data-testid="open-create-staff-btn"
            className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm shadow"
          >
            <UserPlusIcon className="h-5 w-5" />
            {t('add_staff', 'إضافة مساعد')}
          </button>
        }
      />

      {/* Staff list */}
      <div className="mt-6">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
          </div>
        ) : staff.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <UsersIcon className="h-12 w-12 mx-auto text-gray-300" />
            <p className="text-gray-500 mt-3 text-sm">{t('no_staff_yet', 'لم تضيفي أي مساعدين بعد.')}</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold"
            >
              {t('add_first_staff', '+ إضافة أول مساعد')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {staff.map((s) => {
              const meta = ROLE_LABELS[s.staff_role] || ROLE_LABELS.staff_general;
              const tone = TONE_STYLES[meta.tone];
              return (
                <div
                  key={s.id}
                  className={`rounded-xl border-2 p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition ${tone}`}
                  data-testid={`staff-row-${s.username}`}
                >
                  <div className="text-3xl">{meta.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 truncate">{s.full_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">@{s.username} · {s.email}</div>
                    <div className="text-xs mt-1.5 flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 rounded-full bg-white/60 font-bold">{meta.label}</span>
                      {(s.allowed_modules || []).map((m) => (
                        <span key={m} className="px-2 py-0.5 rounded-full bg-white/40 text-[10px]">
                          {MODULE_LABELS[m] || m}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleEdit(s)}
                    className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
                    title={t('edit', 'تعديل')}
                  >
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                    title={t('delete', 'حذف')}
                    data-testid={`staff-delete-${s.username}`}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateStaffDialog
          registry={registry}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchAll(); }}
        />
      )}
    </div>
  );
};

const CreateStaffDialog = ({ registry, onClose, onCreated }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    staff_role: 'staff_general',
  });
  const [customModules, setCustomModules] = useState(null); // null = use preset
  const [loading, setLoading] = useState(false);

  const preset = registry.role_presets?.[form.staff_role] || [];
  const effective = customModules ?? preset;

  const toggleModule = (m) => {
    const next = effective.includes(m)
      ? effective.filter((x) => x !== m)
      : [...effective, m];
    setCustomModules(next);
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (form.password.length < 8) {
      toast.error(t('staff_password_short', 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'));
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/staff`,
        {
          ...form,
          allowed_modules: customModules,  // null → backend uses preset
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t('staff_created', 'تم إنشاء حساب المساعد'));
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('staff_create_failed', 'فشل إنشاء الحساب'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="create-staff-dialog"
    >
      <form
        onSubmit={submit}
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-4 flex items-center justify-between text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5" />
            <h3 className="font-bold">{t('create_staff_title', 'إضافة مساعد جديد')}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          {/* Role preset */}
          <div>
            <label className="text-xs font-semibold text-gray-600">{t('staff_role', 'نوع المساعد')}</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {Object.entries(ROLE_LABELS).map(([key, meta]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => { setForm({ ...form, staff_role: key }); setCustomModules(null); }}
                  className={`p-3 rounded-xl border-2 text-start transition ${form.staff_role === key ? `${TONE_STYLES[meta.tone]} border-current ring-2 ring-current/20` : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
                  data-testid={`role-preset-${key}`}
                >
                  <div className="text-xl">{meta.emoji}</div>
                  <div className="text-sm font-bold mt-1">{meta.label}</div>
                  <div className="text-[11px] opacity-70 mt-0.5">{meta.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Module customization */}
          <div className="bg-purple-50 rounded-xl border border-purple-200 p-3">
            <div className="text-xs font-bold text-purple-900 mb-2">
              {t('staff_modules_label', 'الصلاحيات (يمكنك التعديل)')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(registry.modules || []).map((m) => {
                const on = effective.includes(m);
                return (
                  <button
                    type="button"
                    key={m}
                    onClick={() => toggleModule(m)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${on ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'}`}
                    data-testid={`module-toggle-${m}`}
                  >
                    {MODULE_LABELS[m] || m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Identity fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600">{t('full_name', 'الاسم الكامل')}</label>
              <input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                data-testid="staff-full-name"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">{t('username', 'اسم المستخدم')}</label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                required
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono"
                data-testid="staff-username"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600">{t('email', 'البريد')}</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                data-testid="staff-email"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600">{t('phone', 'الهاتف (اختياري)')}</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                data-testid="staff-phone"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600">{t('password_min8', 'كلمة المرور (8 أحرف على الأقل)')}</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
              data-testid="staff-password"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 p-4 flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-bold hover:bg-gray-50"
          >
            {t('cancel', 'إلغاء')}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
            data-testid="staff-submit-btn"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircleIcon className="h-4 w-4" />
            )}
            {loading ? t('creating', 'يُنشأ...') : t('create', 'إنشاء')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StaffManagement;
