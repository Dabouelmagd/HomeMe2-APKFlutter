import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import PushNotifications from './PushNotifications';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  BellIcon,
  UserIcon,
  CogIcon,
  LanguageIcon,
  ShieldCheckIcon,
  PhotoIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  TrashIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Overview Component
const OverviewSettings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg border border-blue-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <CogIcon className="h-8 w-8 text-blue-600" />
          {t('compound_overview', 'نظرة عامة على المجمع')}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">{t('total_residents', 'إجمالي السكان')}</h3>
              <UserIcon className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-4xl font-bold text-blue-600">125</p>
            <p className="text-sm text-gray-500 mt-2">{t('active_residents', 'ساكن نشط')}</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">{t('total_units', 'إجمالي الوحدات')}</h3>
              <CogIcon className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-4xl font-bold text-green-600">80</p>
            <p className="text-sm text-gray-500 mt-2">{t('residential_units', 'وحدة سكنية')}</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">{t('active_services', 'الخدمات النشطة')}</h3>
              <CheckIcon className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-4xl font-bold text-purple-600">12</p>
            <p className="text-sm text-gray-500 mt-2">{t('services_available', 'خدمة متاحة')}</p>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('compound_information', 'معلومات المجمع')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">{t('compound_name', 'اسم المجمع')}</p>
              <p className="text-base font-medium text-gray-900">{user?.compound_name || 'Green Valley Compound'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('admin_name', 'اسم المدير')}</p>
              <p className="text-base font-medium text-gray-900">{user?.full_name || 'Admin User'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('subscription_plan', 'خطة الاشتراك')}</p>
              <p className="text-base font-medium text-gray-900">{t('professional_plan', 'المحترف')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('subscription_expiry', 'تاريخ انتهاء الاشتراك')}</p>
              <p className="text-base font-medium text-gray-900">2025-12-31</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Residences List Component
const ResidencesSettings = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <UserIcon className="h-8 w-8 text-green-600" />
            {t('residences_list', 'قائمة الإقامات')}
          </h2>
          <span className="bg-green-100 text-green-800 text-sm font-semibold px-4 py-2 rounded-full">
            {t('total', 'الإجمالي')}: 1
          </span>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('unit', 'وحدة')} A-101</h3>
                <p className="text-gray-600 mt-1">{t('resident', 'ساكن')}: محمد أحمد</p>
                <p className="text-sm text-gray-500 mt-1">{t('phone', 'الهاتف')}: +966 50 123 4567</p>
              </div>
              <div className="text-right">
                <span className="inline-block bg-green-500 text-white text-xs px-3 py-1 rounded-full">
                  {t('active', 'نشط')}
                </span>
                <p className="text-sm text-gray-500 mt-2">{t('since', 'منذ')}: 2024-01-15</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Registration Links Component
const RegistrationLinksSettings = () => {
  const { t } = useTranslation();
  const [links, setLinks] = useState([]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <KeyIcon className="h-8 w-8 text-purple-600" />
            {t('registration_links', 'روابط التسجيل')}
          </h2>
          <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
            {t('create_new_link', 'إنشاء رابط جديد')}
          </button>
        </div>

        {links.length === 0 ? (
          <div className="text-center py-12">
            <KeyIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">{t('no_registration_links', 'لا توجد روابط تسجيل حالياً')}</p>
            <p className="text-gray-400 text-sm mt-2">{t('create_link_to_invite', 'قم بإنشاء رابط لدعوة المستخدمين الجدد')}</p>
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
const UserManagementSettings = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <UserIcon className="h-8 w-8 text-orange-600" />
            {t('user_management', 'إدارة المستخدمين')}
          </h2>
          <button className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
            {t('add_user', 'إضافة مستخدم')}
          </button>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-6 border border-orange-200">
          <p className="text-gray-700">{t('manage_users_description', 'يمكنك هنا إدارة جميع مستخدمي المجمع، بما في ذلك السكان والموظفين والمديرين.')}</p>
          <div className="mt-4 flex gap-4">
            <button className="bg-white border border-orange-300 text-orange-700 px-4 py-2 rounded-lg hover:bg-orange-50">
              {t('view_all_users', 'عرض جميع المستخدمين')}
            </button>
            <button className="bg-white border border-orange-300 text-orange-700 px-4 py-2 rounded-lg hover:bg-orange-50">
              {t('export_users', 'تصدير المستخدمين')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Add Admin Component  
const AddAdminSettings = () => {
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
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <ShieldCheckIcon className="h-8 w-8 text-red-600" />
          {t('add_admin', 'إضافة مدير')}
        </h2>

        <form onSubmit={handleAddAdmin} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('full_name', 'الاسم الكامل')}
              </label>
              <input
                type="text"
                value={adminData.full_name}
                onChange={(e) => setAdminData({ ...adminData, full_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('email', 'البريد الإلكتروني')}
              </label>
              <input
                type="email"
                value={adminData.email}
                onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('phone', 'رقم الهاتف')}
              </label>
              <input
                type="tel"
                value={adminData.phone}
                onChange={(e) => setAdminData({ ...adminData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('password', 'كلمة المرور')}
              </label>
              <input
                type="password"
                value={adminData.password}
                onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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

const ProfileSettings = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePreview, setProfilePreview] = useState(user?.profile_picture_url || null);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('full_name', profileData.full_name);
      formData.append('phone', profileData.phone);
      
      if (profilePicture) {
        formData.append('profile_picture', profilePicture);
      }

      const response = await axios.put(`${API}/users/${user.id}/profile`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      updateUser({ ...user, ...response.data });
      toast.success(t('profile_updated_successfully'));
    } catch (error) {
      toast.error(t('failed_to_update_profile'));
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (profileData.new_password !== profileData.confirm_password) {
      toast.error(t('passwords_do_not_match'));
      return;
    }

    try {
      await axios.put(`${API}/users/${user.id}/password`, {
        current_password: profileData.current_password,
        new_password: profileData.new_password
      });

      toast.success(t('password_updated_successfully'));
      setProfileData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
    } catch (error) {
      toast.error(error.response?.data?.detail || t('failed_to_update_password'));
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error(t('please_select_image_file'));
        return;
      }
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onload = (e) => setProfilePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-6">{t('personal_information')}</h3>
        
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          <div className="flex items-center space-x-6">
            <div className="relative">
              {profilePreview ? (
                <img src={profilePreview} alt="Profile" className="h-24 w-24 rounded-full object-cover border-4 border-gray-200" />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserIcon className="h-12 w-12 text-gray-400" />
                </div>
              )}
              <label htmlFor="profile-picture" className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
                <PhotoIcon className="h-4 w-4" />
              </label>
              <input
                id="profile-picture"
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                className="hidden"
              />
            </div>
            <div>
              <h4 className="text-lg font-medium text-center text-center text-gray-900">{user?.full_name}</h4>
              <p className="text-gray-600">@{user?.username}</p>
              <p className="text-sm text-gray-500">{t('click_camera_to_change_picture')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('full_name')}</label>
              <input
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                className="form-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('phone_number')}</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                className="form-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('email')}</label>
              <input
                type="email"
                value={profileData.email}
                className="form-input w-full bg-gray-50"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">{t('email_cannot_be_changed')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('role')}</label>
              <input
                type="text"
                value={user?.role || ''}
                className="form-input w-full bg-gray-50 capitalize"
                disabled
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary">{t('save_changes')}</button>
          </div>
        </form>
      </div>

      {/* Password Change Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-6">{t('change_password')}</h3>
        
        <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('current_password')}</label>
            <input
              type="password"
              value={profileData.current_password}
              onChange={(e) => setProfileData(prev => ({ ...prev, current_password: e.target.value }))}
              className="form-input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('new_password')}</label>
            <input
              type="password"
              value={profileData.new_password}
              onChange={(e) => setProfileData(prev => ({ ...prev, new_password: e.target.value }))}
              className="form-input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('confirm_new_password')}</label>
            <input
              type="password"
              value={profileData.confirm_password}
              onChange={(e) => setProfileData(prev => ({ ...prev, confirm_password: e.target.value }))}
              className="form-input w-full"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">{t('update_password')}</button>
        </form>
      </div>
    </div>
  );
};

const PrivacySettings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [privacySettings, setPrivacySettings] = useState({
    profile_visibility: 'compound',
    contact_visibility: 'family',
    activity_status: true,
    data_sharing: false,
    marketing_emails: true
  });

  const handlePrivacyUpdate = async () => {
    try {
      await axios.put(`${API}/users/${user.id}/privacy`, privacySettings);
      toast.success(t('privacy_settings_updated_successfully'));
    } catch (error) {
      toast.error(t('failed_to_update_privacy_settings'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-6">{t('privacy_and_visibility')}</h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">{t('profile_visibility')}</label>
            <div className="space-y-2">
              {[
                { value: 'public', label: t('public_visible_to_everyone') },
                { value: 'compound', label: t('compound_only_visible_to_compound_members') },
                { value: 'family', label: t('family_only_visible_to_family_members') },
                { value: 'private', label: t('private_only_visible_to_you') }
              ].map(option => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    name="profile_visibility"
                    value={option.value}
                    checked={privacySettings.profile_visibility === option.value}
                    onChange={(e) => setPrivacySettings(prev => ({ ...prev, profile_visibility: e.target.value }))}
                    className="mr-2"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">{t('contact_information_visibility')}</label>
            <div className="space-y-2">
              {[
                { value: 'compound', label: t('compound_members_can_see') },
                { value: 'family', label: t('family_members_only') },
                { value: 'admins', label: t('admins_only') },
                { value: 'private', label: t('keep_private') }
              ].map(option => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    name="contact_visibility"
                    value={option.value}
                    checked={privacySettings.contact_visibility === option.value}
                    onChange={(e) => setPrivacySettings(prev => ({ ...prev, contact_visibility: e.target.value }))}
                    className="mr-2"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">{t('show_activity_status')}</label>
                <p className="text-xs text-gray-500">{t('let_others_see_when_online')}</p>
              </div>
              <input
                type="checkbox"
                checked={privacySettings.activity_status}
                onChange={(e) => setPrivacySettings(prev => ({ ...prev, activity_status: e.target.checked }))}
                className="toggle"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">{t('data_sharing')}</label>
                <p className="text-xs text-gray-500">{t('share_anonymous_usage_data')}</p>
              </div>
              <input
                type="checkbox"
                checked={privacySettings.data_sharing}
                onChange={(e) => setPrivacySettings(prev => ({ ...prev, data_sharing: e.target.checked }))}
                className="toggle"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">{t('marketing_emails')}</label>
                <p className="text-xs text-gray-500">{t('receive_updates_and_announcements')}</p>
              </div>
              <input
                type="checkbox"
                checked={privacySettings.marketing_emails}
                onChange={(e) => setPrivacySettings(prev => ({ ...prev, marketing_emails: e.target.checked }))}
                className="toggle"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handlePrivacyUpdate} className="btn btn-primary">{t('save_privacy_settings')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LanguageSettings = () => {
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  // Apply RTL layout when language changes
  useEffect(() => {
    const applyLanguageLayout = (lang) => {
      if (lang === 'ar') {
        document.dir = 'rtl';
        document.documentElement.setAttribute('dir', 'rtl');
        document.body.classList.add('rtl');
        document.body.style.direction = 'rtl';
      } else {
        document.dir = 'ltr';
        document.documentElement.setAttribute('dir', 'ltr');
        document.body.classList.remove('rtl');
        document.body.style.direction = 'ltr';
      }
    };

    // Apply layout for current language
    applyLanguageLayout(i18n.language);
    
    // Update selected language state
    setSelectedLanguage(i18n.language);
  }, [i18n.language]);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
  ];

  const handleLanguageChange = async (langCode) => {
    try {
      // Set in localStorage first to ensure persistence
      localStorage.setItem('i18nextLng', langCode);
      
      // Change language in i18n
      await i18n.changeLanguage(langCode);
      
      // Apply layout changes immediately
      if (langCode === 'ar') {
        document.dir = 'rtl';
        document.documentElement.setAttribute('dir', 'rtl');
        document.body.classList.add('rtl');
        document.body.style.direction = 'rtl';
      } else {
        document.dir = 'ltr';
        document.documentElement.setAttribute('dir', 'ltr');
        document.body.classList.remove('rtl');
        document.body.style.direction = 'ltr';
      }
      
      // Update state
      setSelectedLanguage(langCode);
      
      // Show success message
      toast.success(t('language_updated_successfully'));
      
      // Small delay to ensure all changes are applied
      setTimeout(() => {
        window.location.reload();
      }, 800);
      
    } catch (error) {
      console.error('Language change error:', error);
      toast.error(t('failed_to_update_language'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-6">{t('language_preferences')}</h3>
        
        <div className="space-y-4">
          {languages.map((lang) => (
            <div
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedLanguage === lang.code
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl mr-4">{lang.flag}</span>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{lang.name}</h4>
                <p className="text-sm text-gray-500">
                  {lang.code === 'en' && t('english_default_language')}
                  {lang.code === 'ar' && t('arabic_rtl_support')}
                  {lang.code === 'fr' && t('french_language')}
                </p>
              </div>
              {selectedLanguage === lang.code && (
                <CheckIcon className="h-5 w-5 text-blue-600" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <LanguageIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">{t('language_support')}</h4>
              <p className="text-sm text-blue-700 mt-1">
                {t('language_support_description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Settings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    {
      id: 'overview',
      name: t('overview', 'نظرة عامة'),
      icon: CogIcon,
      color: 'from-blue-600 to-indigo-600',
      bgColor: 'from-blue-50 to-indigo-50',
      accent: 'bg-blue-500'
    },
    {
      id: 'residences',
      name: t('residences_list', 'قائمة الإقامات'),
      icon: UserIcon,
      badge: '1',
      color: 'from-green-600 to-emerald-600',
      bgColor: 'from-green-50 to-emerald-50',
      accent: 'bg-green-500'
    },
    {
      id: 'registration_links',
      name: t('registration_links', 'روابط التسجيل'),
      icon: KeyIcon,
      badge: '0',
      color: 'from-purple-600 to-pink-600',
      bgColor: 'from-purple-50 to-pink-50',
      accent: 'bg-purple-500'
    },
    {
      id: 'user_management',
      name: t('user_management', 'إدارة المستخدمين'),
      icon: UserIcon,
      color: 'from-orange-600 to-red-600',
      bgColor: 'from-orange-50 to-red-50',
      accent: 'bg-orange-500'
    },
    {
      id: 'add_admin',
      name: t('add_admin', 'إضافة مدير'),
      icon: ShieldCheckIcon,
      color: 'from-red-600 to-pink-600',
      bgColor: 'from-red-50 to-pink-50',
      accent: 'bg-red-500'
    },
    {
      id: 'notifications',
      name: t('settings_notifications', 'الإشعارات'),
      icon: BellIcon,
      component: PushNotifications,
      color: 'from-cyan-600 to-blue-600',
      bgColor: 'from-cyan-50 to-blue-50',
      accent: 'bg-cyan-500'
    },
    {
      id: 'profile',
      name: t('settings_profile', 'الملف الشخصي'),
      icon: UserIcon,
      component: ProfileSettings,
      color: 'from-emerald-600 to-teal-600',
      bgColor: 'from-emerald-50 to-teal-50',
      accent: 'bg-emerald-500'
    },
    {
      id: 'privacy',
      name: t('settings_privacy', 'الخصوصية'),
      icon: ShieldCheckIcon,
      component: PrivacySettings,
      color: 'from-violet-600 to-purple-600',
      bgColor: 'from-violet-50 to-purple-50',
      accent: 'bg-violet-500'
    },
    {
      id: 'language',
      name: t('settings_language', 'اللغة'),
      icon: LanguageIcon,
      component: LanguageSettings,
      color: 'from-amber-600 to-orange-600',
      bgColor: 'from-amber-50 to-orange-50',
      accent: 'bg-amber-500'
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || null;
  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Enhanced Header Section - Similar to NotificationCenter */}
      <div className="bg-white shadow-2xl">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-4 rounded-2xl shadow-xl relative">
                <CogIcon className="h-12 w-12 text-white" />
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full min-w-[1.5rem] h-6 flex items-center justify-center animate-pulse">
                  4
                </div>
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              {t('settings_title')}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {t('manage_account_settings_preferences')}
            </p>
          </div>
          
          {/* Enhanced Action Buttons - Similar to NotificationCenter */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            <button className="group px-6 py-3 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 rtl:space-x-reverse bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl hover:shadow-2xl transform hover:scale-105">
              <CheckIcon className="h-5 w-5" />
              <span>{t('save_all_changes')}</span>
            </button>
            
            <button className="group px-6 py-3 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 rtl:space-x-reverse bg-white border-2 border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50">
              <TrashIcon className="h-5 w-5" />
              <span>{t('reset_to_defaults')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Enhanced Filters Section - Similar to NotificationCenter */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-6">{t('settings_categories')}</h3>
          
          {/* Category Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tabs.map((tab, index) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              const colors = [
                'from-blue-500 to-cyan-500',
                'from-emerald-500 to-teal-500', 
                'from-purple-500 to-pink-500',
                'from-orange-500 to-red-500'
              ];
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-6 rounded-2xl text-center transition-all duration-300 transform hover:scale-105 hover:shadow-lg relative overflow-hidden ${
                    isActive
                      ? `bg-gradient-to-br ${colors[index % colors.length]} text-white shadow-2xl`
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-gray-200'
                  }`}
                >
                  {/* Background Pattern */}
                  <div className={`absolute inset-0 opacity-10 ${isActive ? 'bg-white' : 'bg-gray-300'}`}>
                    <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-current"></div>
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-current"></div>
                  </div>
                  
                  <div className="relative z-10">
                    <div className={`mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center ${
                      isActive ? 'bg-white/20' : `bg-gradient-to-br ${tab.bgColor}`
                    }`}>
                      <IconComponent className={`h-8 w-8 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div className="text-sm font-bold mb-2">{tab.name}</div>
                    <div className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                      {tab.id === 'notifications' && t('manage_notifications_desc')}
                      {tab.id === 'profile' && t('update_profile_desc')}
                      {tab.id === 'privacy' && t('control_privacy_desc')}
                      {tab.id === 'language' && t('choose_language_desc')}
                    </div>
                    
                    {isActive && (
                      <div className="absolute -top-2 -right-2 bg-white text-gray-700 w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
                        <CheckIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Enhanced Content Area - Similar to NotificationCenter */}
        <div className="space-y-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: t('active_sessions'), value: '3', icon: '🔐', color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
              { label: t('notifications_enabled'), value: '12', icon: '🔔', color: 'bg-gradient-to-r from-emerald-500 to-teal-500' },
              { label: t('privacy_level'), value: t('privacy_level_high'), icon: '🛡️', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
              { label: t('languages_available'), value: '3', icon: '🌍', color: 'bg-gradient-to-r from-orange-500 to-red-500' }
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <div className={`${stat.color} rounded-xl p-3 w-fit mb-4`}>
                  <span className="text-2xl">{stat.icon}</span>
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content - Similar to NotificationCenter Empty State */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Content Header with gradient */}
            <div className={`bg-gradient-to-r ${activeTabData?.color || 'from-indigo-600 to-purple-600'} p-8 text-center`}>
              <div className={`bg-gradient-to-br ${activeTabData?.bgColor || 'from-indigo-100 to-purple-100'} rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center`}>
                <activeTabData.icon className={`h-12 w-12 ${activeTabData?.accent ? `text-${activeTabData.accent.split('-')[1]}-600` : 'text-indigo-600'}`} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                {activeTabData?.name}
              </h2>
              <p className="text-white/90 text-lg leading-relaxed max-w-2xl mx-auto">
                {activeTab === 'notifications' && t('notification_settings_description')}
                {activeTab === 'profile' && t('profile_settings_description')}
                {activeTab === 'privacy' && t('privacy_settings_description')}
                {activeTab === 'language' && t('language_settings_description')}
              </p>
            </div>
            
            {/* Content Body */}
            <div className="p-8">
              <ActiveComponent />
            </div>
          </div>

          {/* Enhanced Features Grid - Similar to NotificationCenter bottom */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">{t('settings_features')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                <div className="text-4xl mb-4">🔒</div>
                <h4 className="font-bold text-gray-900 mb-2">{t('advanced_security')}</h4>
                <p className="text-sm text-gray-600">{t('advanced_security_desc')}</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                <div className="text-4xl mb-4">⚡</div>
                <h4 className="font-bold text-gray-900 mb-2">{t('instant_sync')}</h4>
                <p className="text-sm text-gray-600">{t('instant_sync_desc')}</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
                <div className="text-4xl mb-4">🌍</div>
                <h4 className="font-bold text-gray-900 mb-2">{t('multilingual')}</h4>
                <p className="text-sm text-gray-600">{t('multilingual_desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;