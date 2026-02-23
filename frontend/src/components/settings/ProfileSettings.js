import React, { useState } from 'react';
import { useAuth } from '../../App';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { UserIcon, PhotoIcon } from '@heroicons/react/24/outline';

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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-6">{t('personal_information')}</h3>
        
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          <div className="flex items-center space-x-6 rtl:space-x-reverse">
            <div className="relative">
              {profilePreview ? (
                <img src={profilePreview} alt="Profile" className="h-24 w-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-600" />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
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
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">{user?.full_name}</h4>
              <p className="text-gray-600 dark:text-gray-400">@{user?.username}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">{t('click_camera_to_change_picture')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('full_name')}</label>
              <input
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                className="form-input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('phone_number')}</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                className="form-input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('email')}</label>
              <input
                type="email"
                value={profileData.email}
                className="form-input w-full bg-gray-50 dark:bg-gray-600 dark:text-gray-300"
                disabled
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('email_cannot_be_changed')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('role')}</label>
              <input
                type="text"
                value={user?.role || ''}
                className="form-input w-full bg-gray-50 dark:bg-gray-600 dark:text-gray-300 capitalize"
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-6">{t('change_password')}</h3>
        
        <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('current_password')}</label>
            <input
              type="password"
              value={profileData.current_password}
              onChange={(e) => setProfileData(prev => ({ ...prev, current_password: e.target.value }))}
              className="form-input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('new_password')}</label>
            <input
              type="password"
              value={profileData.new_password}
              onChange={(e) => setProfileData(prev => ({ ...prev, new_password: e.target.value }))}
              className="form-input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('confirm_new_password')}</label>
            <input
              type="password"
              value={profileData.confirm_password}
              onChange={(e) => setProfileData(prev => ({ ...prev, confirm_password: e.target.value }))}
              className="form-input w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">{t('update_password')}</button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;
