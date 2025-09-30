import React, { useState } from 'react';
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

const ProfileSettings = () => {
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
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (profileData.new_password !== profileData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      await axios.put(`${API}/users/${user.id}/password`, {
        current_password: profileData.current_password,
        new_password: profileData.new_password
      });

      toast.success('Password updated successfully!');
      setProfileData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update password');
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
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
        <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-6">Personal Information</h3>
        
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
              <p className="text-sm text-gray-500">Click the camera icon to change your picture</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                className="form-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                className="form-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={profileData.email}
                className="form-input w-full bg-gray-50"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <input
                type="text"
                value={user?.role || ''}
                className="form-input w-full bg-gray-50 capitalize"
                disabled
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>

      {/* Password Change Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-6">Change Password</h3>
        
        <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
            <input
              type="password"
              value={profileData.current_password}
              onChange={(e) => setProfileData(prev => ({ ...prev, current_password: e.target.value }))}
              className="form-input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <input
              type="password"
              value={profileData.new_password}
              onChange={(e) => setProfileData(prev => ({ ...prev, new_password: e.target.value }))}
              className="form-input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={profileData.confirm_password}
              onChange={(e) => setProfileData(prev => ({ ...prev, confirm_password: e.target.value }))}
              className="form-input w-full"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">Update Password</button>
        </form>
      </div>
    </div>
  );
};

const PrivacySettings = () => {
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
      toast.success('Privacy settings updated successfully!');
    } catch (error) {
      toast.error('Failed to update privacy settings');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-6">Privacy & Visibility</h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Profile Visibility</label>
            <div className="space-y-2">
              {[
                { value: 'public', label: 'Public - Visible to everyone' },
                { value: 'compound', label: 'Compound Only - Visible to compound members' },
                { value: 'family', label: 'Family Only - Visible to family members' },
                { value: 'private', label: 'Private - Only visible to you' }
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
            <label className="block text-sm font-medium text-gray-700 mb-3">Contact Information Visibility</label>
            <div className="space-y-2">
              {[
                { value: 'compound', label: 'Compound members can see' },
                { value: 'family', label: 'Family members only' },
                { value: 'admins', label: 'Admins only' },
                { value: 'private', label: 'Keep private' }
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
                <label className="text-sm font-medium text-gray-700">Show Activity Status</label>
                <p className="text-xs text-gray-500">Let others see when you're online</p>
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
                <label className="text-sm font-medium text-gray-700">Data Sharing</label>
                <p className="text-xs text-gray-500">Share anonymous usage data to improve HomeMe</p>
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
                <label className="text-sm font-medium text-gray-700">Marketing Emails</label>
                <p className="text-xs text-gray-500">Receive updates and feature announcements</p>
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
            <button onClick={handlePrivacyUpdate} className="btn btn-primary">Save Privacy Settings</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LanguageSettings = () => {
  const { i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
  ];

  const handleLanguageChange = async (langCode) => {
    try {
      await i18n.changeLanguage(langCode);
      setSelectedLanguage(langCode);
      toast.success('Language updated successfully!');
    } catch (error) {
      toast.error('Failed to update language');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-6">Language Preferences</h3>
        
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
                  {lang.code === 'en' && 'English - Default language'}
                  {lang.code === 'ar' && 'العربية - Right to left support'}
                  {lang.code === 'fr' && 'Français - Langue française'}
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
              <h4 className="text-sm font-medium text-blue-800">Language Support</h4>
              <p className="text-sm text-blue-700 mt-1">
                HomeMe supports multiple languages with full RTL (Right-to-Left) support for Arabic.
                Language changes apply immediately to the entire interface.
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
  const [activeTab, setActiveTab] = useState('notifications');

  const tabs = [
    {
      id: 'notifications',
      name: t('settings.notifications'),
      icon: BellIcon,
      component: PushNotifications
    },
    {
      id: 'profile',
      name: t('settings.profile'),
      icon: UserIcon,
      component: ProfileSettings
    },
    {
      id: 'privacy',
      name: t('settings.privacy'),
      icon: ShieldCheckIcon,
      component: PrivacySettings
    },
    {
      id: 'language',
      name: t('settings.language'),
      icon: LanguageIcon,
      component: LanguageSettings
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || (() => null);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center">{t('settings_title')}</h1>
          <p className="text-gray-600 mt-2 text-center">{t('manage_account_settings_preferences')}</p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
          <aside className="py-6 px-2 sm:px-6 lg:py-0 lg:px-0 lg:col-span-3">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group rounded-md px-3 py-2 flex items-center text-sm font-medium w-full text-left ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-900 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent
                      className={`flex-shrink-0 -ml-1 mr-3 h-6 w-6 ${
                        activeTab === tab.id
                          ? 'text-blue-500'
                          : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    <span className="truncate">{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="space-y-6 sm:px-6 lg:px-0 lg:col-span-9">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;