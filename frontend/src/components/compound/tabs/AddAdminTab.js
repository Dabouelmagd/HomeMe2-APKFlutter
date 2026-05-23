import React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { UserPlusIcon } from '@heroicons/react/24/outline';

const AddAdminTab = ({ form, setForm, onSubmit, onReset }) => {
  const { t } = useTranslation();

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('please_select_image'));
      return;
    }
    setForm((prev) => ({ ...prev, profile_picture: file }));
    // eslint-disable-next-line no-undef
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((prev) => ({ ...prev, profile_picture_preview: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6" data-testid="add-admin-tab">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-center text-gray-900 text-center">🛡️ {t('add_new_admin')}</h3>
          <p className="text-gray-600">{t('create_admin_account_for_compound')}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('username')} *</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                className="form-input w-full"
                placeholder={t('enter_username')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('full_name')} *</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                className="form-input w-full"
                placeholder={t('enter_full_name')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('email_address')} *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="form-input w-full"
                placeholder="admin@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('password')} *</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                className="form-input w-full"
                placeholder={t('enter_password')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('phone_number')}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="form-input w-full"
                placeholder="+966 123 456 789"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('profile_picture')}</label>
              <input type="file" accept="image/*" onChange={handleProfilePictureChange} className="form-input w-full" />
              {form.profile_picture_preview && (
                <div className="mt-2">
                  <img
                    src={form.profile_picture_preview}
                    alt={t('profile_preview')}
                    className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <UserPlusIcon className="h-5 w-5 text-purple-400" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-purple-800">{t('admin_account_creation')}</h4>
                <p className="text-sm text-purple-700 mt-1">{t('admin_account_creation_description')}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onReset} className="btn btn-secondary">
              {t('reset_form')}
            </button>
            <button type="submit" data-testid="add-admin-tab-submit" className="btn btn-primary flex items-center space-x-2">
              <UserPlusIcon className="h-4 w-4 text-current" style={{ minWidth: '16px', minHeight: '16px' }} />
              <span>{t('create_admin_account')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAdminTab;
