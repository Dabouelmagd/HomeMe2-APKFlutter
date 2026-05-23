import React from 'react';
import { useTranslation } from 'react-i18next';
import { PhotoIcon } from '@heroicons/react/24/outline';

const SettingsTab = ({
  editableCompound,
  setEditableCompound,
  logoFile,
  setLogoFile,
  logoPreview,
  setLogoPreview,
  onSave,
  onCancel,
  onLogoChange,
  onUploadLogo,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6" data-testid="settings-tab">
      {/* Basic Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-6">{t('basic_information')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('compound_name_label')} *</label>
            <input
              type="text"
              value={editableCompound.name}
              onChange={(e) => setEditableCompound((prev) => ({ ...prev, name: e.target.value }))}
              className="form-input w-full"
              placeholder={t('enter_compound_name')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('address_label')} *</label>
            <input
              type="text"
              value={editableCompound.address}
              onChange={(e) => setEditableCompound((prev) => ({ ...prev, address: e.target.value }))}
              className="form-input w-full"
              placeholder={t('enter_compound_address')}
              required
            />
          </div>
        </div>

        <div className="mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('description_label')}</label>
            <textarea
              value={editableCompound.description || ''}
              onChange={(e) => setEditableCompound((prev) => ({ ...prev, description: e.target.value }))}
              className="form-input w-full"
              rows="3"
              placeholder={t('enter_compound_description')}
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex justify-end space-x-4 rtl:space-x-reverse">
            <button onClick={onCancel} className="btn btn-secondary">
              {t('cancel')}
            </button>
            <button onClick={onSave} data-testid="settings-save-button" className="btn btn-primary">
              {t('save_changes')}
            </button>
          </div>
        </div>
      </div>

      {/* Logo Management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-6">{t('compound_logo')}</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('current_logo')}</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {logoPreview ? (
                <div className="space-y-4">
                  <img src={logoPreview} alt={t('compound_logo')} className="mx-auto h-32 w-32 object-contain rounded-lg border border-gray-200" />
                  <p className="text-sm text-gray-600">{t('current_compound_logo')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <PhotoIcon className="mx-auto h-16 w-16 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t('no_logo_uploaded')}</p>
                    <p className="text-sm text-gray-500">{t('upload_logo_to_brand')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('upload_new_logo')}</label>
            <div className="space-y-4">
              <input type="file" accept="image/*" onChange={onLogoChange} className="form-input w-full" />

              {logoFile && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <PhotoIcon className="h-5 w-5 text-blue-400 mr-2 rtl:ml-2 rtl:mr-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-800">{logoFile.name}</p>
                      <p className="text-xs text-blue-600">{(logoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-3 rtl:space-x-reverse">
                <button
                  onClick={onUploadLogo}
                  disabled={!logoFile}
                  className={`btn flex items-center space-x-2 rtl:space-x-reverse flex-1 ${
                    logoFile ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'
                  }`}
                >
                  <PhotoIcon className="h-4 w-4" />
                  <span>{t('upload_logo')}</span>
                </button>

                {logoFile && (
                  <button
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview(editableCompound.logo_url || null);
                    }}
                    className="btn btn-secondary"
                  >
                    {t('cancel')}
                  </button>
                )}
              </div>

              <div className="text-xs text-gray-500">
                <p>• {t('recommended_size')}</p>
                <p>• {t('supported_formats')}</p>
                <p>• {t('maximum_file_size')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
