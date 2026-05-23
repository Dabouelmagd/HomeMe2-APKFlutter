import React from 'react';
import { useTranslation } from 'react-i18next';
import { XCircleIcon } from '@heroicons/react/24/outline';

/**
 * Modal for editing a residential unit (primary resident details).
 * Extracted from CompoundManagement.js — controlled by parent state.
 */
const EditUnitModal = ({
  open,
  unit,
  form,
  setForm,
  onSubmit,
  onProfilePictureChange,
  onClose,
}) => {
  const { t } = useTranslation();
  if (!open || !unit) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="edit-unit-modal-title"
      role="dialog"
      aria-modal="true"
      data-testid="edit-unit-modal"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={onClose}
        ></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 text-center" id="edit-unit-modal-title">
                Edit Unit {unit.unit_number}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600" data-testid="edit-unit-close-button">
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={onSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit Number</label>
                  <input
                    type="text"
                    value={form.unit_number}
                    onChange={(e) => setForm((prev) => ({ ...prev, unit_number: e.target.value }))}
                    className="form-input w-full"
                    placeholder="e.g., A-101, Villa-25"
                    disabled
                    title="Unit number cannot be changed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Unit number cannot be modified</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Primary Resident Name</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    className="form-input w-full"
                    placeholder="Full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="form-input w-full"
                    placeholder="email@example.com"
                    disabled
                    title="Email cannot be changed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be modified</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
                  <div className="flex items-center space-x-4">
                    {form.profile_picture_preview && (
                      <img
                        src={form.profile_picture_preview}
                        alt="Profile preview"
                        className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onProfilePictureChange}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-6">
                <button
                  type="submit"
                  data-testid="edit-unit-save-button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {t('cm_save', 'حفظ التغييرات')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  data-testid="edit-unit-cancel-button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditUnitModal;
