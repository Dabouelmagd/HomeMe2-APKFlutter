import React from 'react';
import { useTranslation } from 'react-i18next';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../../../utils/dateUtils';

/**
 * Modal for selecting a compound when user has no compound assigned
 * or the assigned compound was not found.
 * Extracted from CompoundManagement.js.
 */
const CompoundSelectionModal = ({ open, availableCompounds, compoundNotFound, onSelect, onClose }) => {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="compound-selection-title"
      role="dialog"
      aria-modal="true"
      data-testid="compound-selection-modal"
    >
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 text-center mb-4" id="compound-selection-title">
                  Select Your Compound
                </h3>

                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-4">
                    {compoundNotFound
                      ? 'Your assigned compound was not found. Please select from the available compounds below:'
                      : 'Please select a compound to manage:'}
                  </p>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {availableCompounds.length > 0 ? (
                      availableCompounds.map((compound) => (
                        <div
                          key={compound.id}
                          onClick={() => onSelect(compound.id)}
                          data-testid={`compound-option-${compound.id}`}
                          className="cursor-pointer p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              {compound.logo_url ? (
                                <img
                                  src={compound.logo_url}
                                  alt={t('compound_logo')}
                                  className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                  <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-lg font-medium text-center text-center text-gray-900">{compound.name}</h4>
                              <p className="text-sm text-gray-600">{compound.address}</p>
                              <div className="flex items-center mt-1 text-xs text-gray-500">
                                <span>ID: {compound.id.slice(0, 8)}...</span>
                                <span className="mx-2">•</span>
                                <span>Created: {formatDate(compound.created_at)}</span>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <button className="btn btn-primary btn-sm">Select</button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No compounds available</p>
                        <p className="text-sm text-gray-400">Contact your administrator to set up compounds</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!compoundNotFound && (
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={onClose}
                data-testid="compound-selection-cancel"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
              >
                {t('cancel')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompoundSelectionModal;
