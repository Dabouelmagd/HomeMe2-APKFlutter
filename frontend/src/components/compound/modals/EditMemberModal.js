import React from 'react';
import { useTranslation } from 'react-i18next';
import { XCircleIcon } from '@heroicons/react/24/outline';
import DateInput from '../../DateInput';

/**
 * Modal for editing a family member's details.
 * Extracted from CompoundManagement.js — controlled by parent state.
 */
const EditMemberModal = ({
  open,
  member,
  form,
  setForm,
  onSubmit,
  onProfilePictureChange,
  onClose,
}) => {
  const { t } = useTranslation();
  if (!open || !member) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="edit-member-modal-title"
      role="dialog"
      aria-modal="true"
      data-testid="edit-member-modal"
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
              <h3 className="text-lg leading-6 font-medium text-gray-900 text-center" id="edit-member-modal-title">
                Edit Family Member
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600" data-testid="edit-member-close-button">
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={onSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                  <select
                    value={form.relationship}
                    onChange={(e) => setForm((prev) => ({ ...prev, relationship: e.target.value }))}
                    className="form-input w-full"
                    required
                  >
                    <option value="">Select relationship</option>
                    <option value="spouse">Spouse</option>
                    <option value="son">Son</option>
                    <option value="daughter">Daughter</option>
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                    <option value="brother">Brother</option>
                    <option value="sister">Sister</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                  <input
                    type="number"
                    value={form.age}
                    onChange={(e) => setForm((prev) => ({ ...prev, age: e.target.value }))}
                    className="form-input w-full"
                    placeholder="Age"
                    min="0"
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
                  <DateInput
                    label={t('date_of_birth')}
                    value={form.date_of_birth}
                    onChange={(e) => setForm((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ID Number</label>
                  <input
                    type="text"
                    value={form.id_number}
                    onChange={(e) => setForm((prev) => ({ ...prev, id_number: e.target.value }))}
                    className="form-input w-full"
                    placeholder="Government ID or Passport Number"
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
                  data-testid="edit-member-save-button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {t('cm_save', 'حفظ التغييرات')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  data-testid="edit-member-cancel-button"
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

export default EditMemberModal;
