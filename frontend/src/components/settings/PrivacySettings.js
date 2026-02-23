import React, { useState } from 'react';
import { useAuth } from '../../App';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-6">{t('privacy_and_visibility')}</h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('profile_visibility')}</label>
            <div className="space-y-2">
              {[
                { value: 'public', label: t('public_visible_to_everyone') },
                { value: 'compound', label: t('compound_only_visible_to_compound_members') },
                { value: 'family', label: t('family_only_visible_to_family_members') },
                { value: 'private', label: t('private_only_visible_to_you') }
              ].map(option => (
                <label key={option.value} className="flex items-center text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="profile_visibility"
                    value={option.value}
                    checked={privacySettings.profile_visibility === option.value}
                    onChange={(e) => setPrivacySettings(prev => ({ ...prev, profile_visibility: e.target.value }))}
                    className="mr-2 rtl:ml-2 rtl:mr-0"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('contact_information_visibility')}</label>
            <div className="space-y-2">
              {[
                { value: 'compound', label: t('compound_members_can_see') },
                { value: 'family', label: t('family_members_only') },
                { value: 'admins', label: t('admins_only') },
                { value: 'private', label: t('keep_private') }
              ].map(option => (
                <label key={option.value} className="flex items-center text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="contact_visibility"
                    value={option.value}
                    checked={privacySettings.contact_visibility === option.value}
                    onChange={(e) => setPrivacySettings(prev => ({ ...prev, contact_visibility: e.target.value }))}
                    className="mr-2 rtl:ml-2 rtl:mr-0"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('show_activity_status')}</label>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('let_others_see_when_online')}</p>
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('data_sharing')}</label>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('share_anonymous_usage_data')}</p>
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('marketing_emails')}</label>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('receive_updates_and_announcements')}</p>
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

export default PrivacySettings;
