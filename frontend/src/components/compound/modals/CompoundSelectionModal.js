import React from 'react';
import { useTranslation } from 'react-i18next';
import { BuildingOfficeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatDate } from '../../../utils/dateUtils';

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
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-right overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full" dir="rtl">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <BuildingOfficeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white" id="compound-selection-title">
                {t('select_compound', 'اختر الكمبوند')}
              </h3>
            </div>
            {/* Close button always visible */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {compoundNotFound
                ? t('compound_not_found_msg', 'الكمبوند المخصص لحسابك غير موجود. يرجى الاختيار من القائمة أدناه:')
                : t('select_compound_msg', 'يرجى اختيار الكمبوند الذي تريد إدارته:')}
            </p>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availableCompounds && availableCompounds.length > 0 ? (
                availableCompounds.map((compound) => (
                  <div
                    key={compound.id}
                    onClick={() => onSelect(compound.id)}
                    data-testid={`compound-option-${compound.id}`}
                    className="cursor-pointer p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {compound.logo_url ? (
                          <img
                            src={compound.logo_url}
                            alt={t('compound_logo')}
                            className="h-12 w-12 rounded-xl object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                            <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-gray-900 dark:text-white">{compound.name}</h4>
                        {compound.address && <p className="text-sm text-gray-500 dark:text-gray-400">{compound.address}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t('created_at', 'تاريخ الإنشاء')}: {formatDate(compound.created_at)}
                        </p>
                      </div>
                      <span className="flex-shrink-0 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold">
                        {t('select', 'اختر')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <BuildingOfficeIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    {t('no_compounds_available', 'لا توجد كمبوندات متاحة')}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    {t('contact_admin_compounds', 'تواصل مع المدير لإضافة كمبوند')}
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-4 px-5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('close', 'إغلاق')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex justify-start">
            <button
              type="button"
              onClick={onClose}
              data-testid="compound-selection-cancel"
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              {t('cancel', 'إلغاء')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompoundSelectionModal;
