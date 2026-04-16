import React, { useState } from 'react';
import { useAuth } from '../../App';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { UserIcon, CameraIcon, LockClosedIcon, CheckIcon } from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('full_name', profileData.full_name);
      formData.append('phone', profileData.phone);
      
      if (profilePicture) {
        formData.append('profile_picture', profilePicture);
      }

      const response = await axios.put(`${API}/users/${user.id}/profile`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      updateUser({ ...user, ...response.data });
      toast.success(t('profile_updated_successfully', 'تم تحديث الملف الشخصي'));
    } catch (error) {
      toast.error(t('failed_to_update_profile', 'فشل تحديث الملف الشخصي'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (profileData.new_password !== profileData.confirm_password) {
      toast.error(t('passwords_do_not_match', 'كلمات المرور غير متطابقة'));
      return;
    }

    setSavingPassword(true);
    try {
      await axios.put(`${API}/users/${user.id}/password`, {
        current_password: profileData.current_password,
        new_password: profileData.new_password
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

      toast.success(t('password_updated_successfully', 'تم تحديث كلمة المرور'));
      setProfileData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
    } catch (error) {
      toast.error(error.response?.data?.detail || t('failed_to_update_password', 'فشل تحديث كلمة المرور'));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error(t('please_select_image_file', 'يرجى اختيار ملف صورة'));
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
      {/* Profile Picture & Basic Info */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-blue-500" />
            {t('personal_information', 'المعلومات الشخصية')}
          </h3>
          
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center gap-6">
              <div className="relative">
                {profilePreview ? (
                  <img 
                    src={profilePreview} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-2xl object-cover border-4 border-blue-100 dark:border-blue-900" 
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center border-4 border-blue-100 dark:border-blue-900">
                    <UserIcon className="w-12 h-12 text-blue-300 dark:text-blue-700" />
                  </div>
                )}
                <label 
                  htmlFor="profile-picture" 
                  className="absolute -bottom-2 -right-2 bg-blue-500 text-white p-2.5 rounded-xl cursor-pointer hover:bg-blue-600 transition-colors shadow-lg"
                >
                  <CameraIcon className="w-4 h-4" />
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
                <h4 className="font-bold text-gray-900 dark:text-white text-lg">{user?.full_name}</h4>
                <p className="text-gray-500 dark:text-gray-400">@{user?.username}</p>
                <p className="text-xs text-blue-500 mt-1">{t('click_to_change', 'انقر لتغيير الصورة')}</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('full_name', 'الاسم الكامل')}
                </label>
                <input
                  type="text"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('phone_number', 'رقم الهاتف')}
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('email', 'البريد الإلكتروني')}
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  disabled
                  dir="ltr"
                />
                <p className="text-xs text-gray-400 mt-1">{t('email_cannot_be_changed', 'لا يمكن تغيير البريد الإلكتروني')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('role', 'الدور')}
                </label>
                <input
                  type="text"
                  value={user?.role || ''}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed capitalize"
                  disabled
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <CheckIcon className="w-5 h-5" />
              )}
              <span>{saving ? t('saving', 'جاري الحفظ...') : t('save_changes', 'حفظ التغييرات')}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Password Change */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <LockClosedIcon className="w-5 h-5 text-purple-500" />
            {t('change_password', 'تغيير كلمة المرور')}
          </h3>
          
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('current_password', 'كلمة المرور الحالية')}
              </label>
              <input
                type="password"
                value={profileData.current_password}
                onChange={(e) => setProfileData(prev => ({ ...prev, current_password: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('new_password', 'كلمة المرور الجديدة')}
                </label>
                <input
                  type="password"
                  value={profileData.new_password}
                  onChange={(e) => setProfileData(prev => ({ ...prev, new_password: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('confirm_new_password', 'تأكيد كلمة المرور')}
                </label>
                <input
                  type="password"
                  value={profileData.confirm_password}
                  onChange={(e) => setProfileData(prev => ({ ...prev, confirm_password: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={savingPassword}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-purple-500/25"
            >
              {savingPassword ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <LockClosedIcon className="w-5 h-5" />
              )}
              <span>{savingPassword ? t('updating', 'جاري التحديث...') : t('update_password', 'تحديث كلمة المرور')}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
