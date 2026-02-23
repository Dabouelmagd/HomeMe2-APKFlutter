import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { UserIcon, KeyIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Residences List Component
export const ResidencesSettings = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <UserIcon className="h-8 w-8 text-green-600" />
            {t('residences_list', 'قائمة الإقامات')}
          </h2>
          <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm font-semibold px-4 py-2 rounded-full">
            {t('total', 'الإجمالي')}: 1
          </span>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('unit', 'وحدة')} A-101</h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{t('resident', 'ساكن')}: محمد أحمد</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{t('phone', 'الهاتف')}: +966 50 123 4567</p>
              </div>
              <div className="text-right rtl:text-left">
                <span className="inline-block bg-green-500 text-white text-xs px-3 py-1 rounded-full">
                  {t('active', 'نشط')}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('since', 'منذ')}: 2024-01-15</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Registration Links Component
export const RegistrationLinksSettings = () => {
  const { t } = useTranslation();
  const [links, setLinks] = useState([]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <KeyIcon className="h-8 w-8 text-purple-600" />
            {t('registration_links', 'روابط التسجيل')}
          </h2>
          <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
            {t('create_new_link', 'إنشاء رابط جديد')}
          </button>
        </div>

        {links.length === 0 ? (
          <div className="text-center py-12">
            <KeyIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">{t('no_registration_links', 'لا توجد روابط تسجيل حالياً')}</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">{t('create_link_to_invite', 'قم بإنشاء رابط لدعوة المستخدمين الجدد')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Links will be mapped here */}
          </div>
        )}
      </div>
    </div>
  );
};

// User Management Component
export const UserManagementSettings = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <UserIcon className="h-8 w-8 text-orange-600" />
            {t('user_management', 'إدارة المستخدمين')}
          </h2>
          <button className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
            {t('add_user', 'إضافة مستخدم')}
          </button>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-6 border border-orange-200 dark:border-orange-800">
          <p className="text-gray-700 dark:text-gray-300">{t('manage_users_description', 'يمكنك هنا إدارة جميع مستخدمي المجمع، بما في ذلك السكان والموظفين والمديرين.')}</p>
          <div className="mt-4 flex gap-4 flex-wrap">
            <button className="bg-white dark:bg-gray-700 border border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-400 px-4 py-2 rounded-lg hover:bg-orange-50 dark:hover:bg-gray-600">
              {t('view_all_users', 'عرض جميع المستخدمين')}
            </button>
            <button className="bg-white dark:bg-gray-700 border border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-400 px-4 py-2 rounded-lg hover:bg-orange-50 dark:hover:bg-gray-600">
              {t('export_users', 'تصدير المستخدمين')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add Admin Component  
export const AddAdminSettings = () => {
  const { t } = useTranslation();
  const [adminData, setAdminData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: ''
  });

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/users/admin`, adminData);
      toast.success(t('admin_added_successfully', 'تمت إضافة المدير بنجاح'));
      setAdminData({ full_name: '', email: '', phone: '', password: '' });
    } catch (error) {
      toast.error(t('failed_to_add_admin', 'فشل في إضافة المدير'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <ShieldCheckIcon className="h-8 w-8 text-red-600" />
          {t('add_admin', 'إضافة مدير')}
        </h2>

        <form onSubmit={handleAddAdmin} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('full_name', 'الاسم الكامل')}
              </label>
              <input
                type="text"
                value={adminData.full_name}
                onChange={(e) => setAdminData({ ...adminData, full_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-4 rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            {t('add_admin', 'إضافة مدير')}
          </button>
        </form>
      </div>
    </div>
  );
};
