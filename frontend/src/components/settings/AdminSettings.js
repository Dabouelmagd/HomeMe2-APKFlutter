import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  HomeModernIcon, 
  KeyIcon, 
  UserGroupIcon, 
  UserPlusIcon,
  PlusIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Residences List Component
export const ResidencesSettings = () => {
  const { t } = useTranslation();

  const residences = [
    { unit: 'A-101', resident: 'محمد أحمد', phone: '+966 50 123 4567', status: 'active', since: '2024-01-15' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">{t('all_residences', 'جميع الإقامات')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('manage_units', 'إدارة الوحدات السكنية')}</p>
        </div>
        <span className="px-4 py-2 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded-full text-sm font-bold">
          {residences.length} {t('units', 'وحدة')}
        </span>
      </div>

      {/* Residences List */}
      <div className="space-y-3">
        {residences.map((residence, index) => (
          <div 
            key={index}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-teal-50 dark:bg-teal-900/20 rounded-xl flex items-center justify-center">
                  <HomeModernIcon className="w-6 h-6 text-teal-500" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{residence.unit}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{residence.resident}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{residence.phone}</p>
                </div>
              </div>
              <div className="text-end">
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold">
                  {t('active', 'نشط')}
                </span>
                <p className="text-xs text-gray-400 mt-2">{t('since', 'منذ')}: {residence.since}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {residences.length === 0 && (
        <div className="text-center py-12">
          <HomeModernIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t('no_residences', 'لا توجد إقامات')}</p>
        </div>
      )}
    </div>
  );
};

// Registration Links Component — proxy to the full-featured panel.
// All real logic lives in /components/settings/RegistrationLinksPanel.js
import RegistrationLinksPanel from './RegistrationLinksPanel';
export const RegistrationLinksSettings = () => <RegistrationLinksPanel />;

// User Management Component
export const UserManagementSettings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const users = res.data?.users || res.data || [];
      if (!Array.isArray(users) || users.length === 0) {
        toast.error(t('no_users_to_export', 'لا يوجد مستخدمون للتصدير'));
        return;
      }
      // Build CSV with BOM for Arabic Excel compatibility
      const headers = ['id', 'username', 'full_name', 'email', 'phone', 'role', 'compound_id', 'unit_number', 'is_active', 'created_at'];
      const escape = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      };
      const rows = [headers.join(',')];
      users.forEach((u) => rows.push(headers.map((h) => escape(u[h])).join(',')));
      const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('exported_users', `تم تصدير ${users.length} مستخدم`));
    } catch (err) {
      toast.error(err?.response?.data?.detail || t('export_failed', 'فشل تصدير المستخدمين'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => navigate('/app/users')}
          data-testid="settings-view-all-users-btn"
          className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
            <UserGroupIcon className="w-6 h-6 text-orange-500" />
          </div>
          <span className="font-medium text-gray-900 dark:text-white text-sm">{t('view_all', 'عرض الكل')}</span>
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          data-testid="settings-export-users-btn"
          className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
            {exporting ? (
              <svg className="animate-spin h-6 w-6 text-orange-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            ) : (
              <ClipboardDocumentIcon className="w-6 h-6 text-orange-500" />
            )}
          </div>
          <span className="font-medium text-gray-900 dark:text-white text-sm">
            {exporting ? t('exporting', 'جاري التصدير...') : t('export', 'تصدير')}
          </span>
        </button>
      </div>

      {/* Info */}
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-5">
        <p className="text-orange-800 dark:text-orange-300 font-medium mb-2">{t('user_management_info', 'إدارة المستخدمين')}</p>
        <p className="text-sm text-orange-700 dark:text-orange-400">
          {t('user_management_desc', 'يمكنك هنا عرض وإدارة جميع مستخدمي المجمع بما في ذلك السكان والموظفين.')}
        </p>
      </div>
    </div>
  );
};

// Add Admin Component  
export const AddAdminSettings = () => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [adminData, setAdminData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: ''
  });

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${API}/users/admin`, adminData);
      toast.success(t('admin_added', 'تمت إضافة المدير'));
      setAdminData({ full_name: '', email: '', phone: '', password: '' });
    } catch (error) {
      toast.error(t('failed_to_add_admin', 'فشل في إضافة المدير'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAddAdmin} className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <UserPlusIcon className="w-5 h-5 text-rose-500" />
            {t('new_admin_info', 'معلومات المدير الجديد')}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('full_name', 'الاسم الكامل')}
            </label>
            <input
              type="text"
              value={adminData.full_name}
              onChange={(e) => setAdminData({ ...adminData, full_name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('email', 'البريد الإلكتروني')}
            </label>
            <input
              type="email"
              value={adminData.email}
              onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              dir="ltr"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('phone', 'رقم الهاتف')}
            </label>
            <input
              type="tel"
              value={adminData.phone}
              onChange={(e) => setAdminData({ ...adminData, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              dir="ltr"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('password', 'كلمة المرور')}
            </label>
            <input
              type="password"
              value={adminData.password}
              onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-rose-500/25"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <CheckIcon className="w-5 h-5" />
          )}
          <span>{saving ? t('adding', 'جاري الإضافة...') : t('add_admin', 'إضافة المدير')}</span>
        </button>
      </form>
    </div>
  );
};
