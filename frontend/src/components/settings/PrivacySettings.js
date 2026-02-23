import React, { useState } from 'react';
import { useAuth } from '../../App';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ShieldCheckIcon, EyeIcon, BellIcon, CheckIcon } from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PrivacySettings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    profile_visibility: 'compound',
    contact_visibility: 'family',
    activity_status: true,
    data_sharing: false,
    marketing_emails: true
  });

  const handlePrivacyUpdate = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/users/${user.id}/privacy`, privacySettings);
      toast.success(t('privacy_settings_updated_successfully', 'تم تحديث إعدادات الخصوصية'));
    } catch (error) {
      toast.error(t('failed_to_update_privacy_settings', 'فشل تحديث إعدادات الخصوصية'));
    } finally {
      setSaving(false);
    }
  };

  const visibilityOptions = [
    { value: 'public', label: t('public', 'عام'), desc: t('visible_to_everyone', 'مرئي للجميع') },
    { value: 'compound', label: t('compound', 'المجمع'), desc: t('compound_members_only', 'أعضاء المجمع فقط') },
    { value: 'family', label: t('family', 'العائلة'), desc: t('family_members_only', 'أفراد العائلة فقط') },
    { value: 'private', label: t('private', 'خاص'), desc: t('only_you', 'أنت فقط') }
  ];

  return (
    <div className="space-y-6">
      {/* Profile Visibility */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <EyeIcon className="w-5 h-5 text-purple-500" />
            {t('profile_visibility', 'ظهور الملف الشخصي')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('profile_visibility_desc', 'من يمكنه رؤية ملفك الشخصي')}
          </p>
          
          <div className="space-y-2">
            {visibilityOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${
                  privacySettings.profile_visibility === option.value
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-500'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="profile_visibility"
                    value={option.value}
                    checked={privacySettings.profile_visibility === option.value}
                    onChange={(e) => setPrivacySettings(prev => ({ ...prev, profile_visibility: e.target.value }))}
                    className="hidden"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    privacySettings.profile_visibility === option.value
                      ? 'border-purple-500 bg-purple-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {privacySettings.profile_visibility === option.value && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{option.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{option.desc}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 space-y-1">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-purple-500" />
            {t('privacy_controls', 'التحكم في الخصوصية')}
          </h3>
          
          {/* Activity Status */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('show_activity_status', 'إظهار حالة النشاط')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('let_others_see_when_online', 'السماح للآخرين برؤية حالة اتصالك')}</p>
            </div>
            <button
              onClick={() => setPrivacySettings(prev => ({ ...prev, activity_status: !prev.activity_status }))}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                privacySettings.activity_status ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                privacySettings.activity_status ? 'translate-x-7' : 'translate-x-1'
              }`}></div>
            </button>
          </div>

          {/* Data Sharing */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('data_sharing', 'مشاركة البيانات')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('share_anonymous_usage_data', 'مشاركة بيانات الاستخدام المجهولة')}</p>
            </div>
            <button
              onClick={() => setPrivacySettings(prev => ({ ...prev, data_sharing: !prev.data_sharing }))}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                privacySettings.data_sharing ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                privacySettings.data_sharing ? 'translate-x-7' : 'translate-x-1'
              }`}></div>
            </button>
          </div>

          {/* Marketing Emails */}
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('marketing_emails', 'رسائل التسويق')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('receive_updates_and_announcements', 'استلام التحديثات والإعلانات')}</p>
            </div>
            <button
              onClick={() => setPrivacySettings(prev => ({ ...prev, marketing_emails: !prev.marketing_emails }))}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                privacySettings.marketing_emails ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                privacySettings.marketing_emails ? 'translate-x-7' : 'translate-x-1'
              }`}></div>
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button 
        onClick={handlePrivacyUpdate}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-purple-500/25"
      >
        {saving ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <CheckIcon className="w-5 h-5" />
        )}
        <span>{saving ? t('saving', 'جاري الحفظ...') : t('save_privacy_settings', 'حفظ إعدادات الخصوصية')}</span>
      </button>
    </div>
  );
};

export default PrivacySettings;
