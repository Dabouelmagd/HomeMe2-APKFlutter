import React from 'react';
import { useTranslation } from 'react-i18next';
import { LinkIcon } from '@heroicons/react/24/outline';

/**
 * Modal for creating a resident registration link.
 * Extracted from CompoundManagement.js.
 */
const AddRegistrationLinkModal = ({ open, form, setForm, onSubmit, onClose }) => {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      data-testid="add-registration-link-modal"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={onSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 text-center mb-4" id="modal-title">
                  Create Registration Link
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Link Expires In (Hours)</label>
                    <select
                      value={form.expires_in_hours}
                      onChange={(e) => setForm((prev) => ({ ...prev, expires_in_hours: parseInt(e.target.value) }))}
                      className="form-input w-full"
                    >
                      <option value={24}>24 hours</option>
                      <option value={48}>48 hours</option>
                      <option value={72}>72 hours (3 days)</option>
                      <option value={168}>168 hours (1 week)</option>
                      <option value={336}>336 hours (2 weeks)</option>
                    </select>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <LinkIcon className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-blue-800">Registration Process</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          The resident will receive a registration link to create their account and upload their profile picture during the registration process.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-4">
              <button
                type="submit"
                data-testid="add-registration-link-submit"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                {t('create_link')}
              </button>
              <button
                type="button"
                onClick={onClose}
                data-testid="add-registration-link-cancel"
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

export default AddRegistrationLinkModal;
