import React from 'react';
import { useTranslation } from 'react-i18next';
import { HomeIcon } from '@heroicons/react/24/outline';

/**
 * Modal for creating a new residence directly (skip registration link).
 * Extracted from CompoundManagement.js.
 */
const AddNewResidenceModal = ({ open, form, setForm, onSubmit, onProfilePictureChange, onClose }) => {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="new-residence-modal-title"
      role="dialog"
      aria-modal="true"
      data-testid="add-new-residence-modal"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={onSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 text-center mb-4" id="new-residence-modal-title">
                  {t('cm_add_residence', 'إضافة إقامة جديدة')}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unit Number *</label>
                    <input
                      type="text"
                      required
                      value={form.unit_number}
                      onChange={(e) => setForm((prev) => ({ ...prev, unit_number: e.target.value }))}
                      className="form-input w-full"
                      placeholder="e.g., A-101, B-205"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Resident Full Name *</label>
                    <input
                      type="text"
                      required
                      value={form.full_name}
                      onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                      className="form-input w-full"
                      placeholder="Enter resident's full name"
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
                      placeholder="resident@email.com"
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
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onProfilePictureChange}
                      className="form-input w-full"
                    />
                    {form.profile_picture_preview && (
                      <div className="mt-2">
                        <img
                          src={form.profile_picture_preview}
                          alt="Profile preview"
                          className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                        />
                      </div>
                    )}
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <HomeIcon className="h-5 w-5 text-green-400" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-green-800">{t('create_direct_residence')}</h4>
                        <p className="text-sm text-green-700 mt-1">{t('direct_residence_description')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-4">
              <button
                type="submit"
                data-testid="add-new-residence-submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                {t('create_residence')}
              </button>
              <button
                type="button"
                onClick={onClose}
                data-testid="add-new-residence-cancel"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddNewResidenceModal;
