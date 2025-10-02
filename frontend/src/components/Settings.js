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
      name: t('settings_notifications'),
      icon: BellIcon,
      component: PushNotifications,
      color: 'from-blue-600 to-indigo-600',
      bgColor: 'from-blue-50 to-indigo-50',
      accent: 'bg-blue-500'
    },
    {
      id: 'profile',
      name: t('settings_profile'),
      icon: UserIcon,
      component: ProfileSettings,
      color: 'from-emerald-600 to-teal-600',
      bgColor: 'from-emerald-50 to-teal-50',
      accent: 'bg-emerald-500'
    },
    {
      id: 'privacy',
      name: t('settings_privacy'),
      icon: ShieldCheckIcon,
      component: PrivacySettings,
      color: 'from-purple-600 to-pink-600',
      bgColor: 'from-purple-50 to-pink-50',
      accent: 'bg-purple-500'
    },
    {
      id: 'language',
      name: t('settings_language'),
      icon: LanguageIcon,
      component: LanguageSettings,
      color: 'from-orange-600 to-red-600',
      bgColor: 'from-orange-50 to-red-50',
      accent: 'bg-orange-500'
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || (() => null);
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
              { label: t('privacy_level'), value: 'High', icon: '🛡️', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
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