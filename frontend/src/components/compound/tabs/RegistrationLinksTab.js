import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../utils/dateUtils';
import {
  UserPlusIcon,
  HomeIcon,
  EnvelopeIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const RegistrationLinksTab = ({ registrationLinks, onAddClick, onCopy, onDelete }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6" data-testid="registration-links-tab">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-center text-gray-900 text-center">{t('registration_links')}</h3>
            <p className="text-gray-600">{t('create_manage_registration_links')}</p>
          </div>
          <button
            onClick={onAddClick}
            data-testid="reg-link-add-button"
            className="btn btn-primary flex items-center space-x-2"
          >
            <UserPlusIcon className="h-4 w-4 text-current" style={{ minWidth: '16px', minHeight: '16px' }} />
            <span>{t('create_new_link')}</span>
          </button>
        </div>

        {registrationLinks.length > 0 ? (
          <div className="space-y-4">
            {registrationLinks.map((link) => (
              <div key={link.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <HomeIcon className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">Unit {link.unit_number}</h4>
                        <p className="text-sm text-gray-600">{link.full_name}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      <div className="flex items-center space-x-2">
                        <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{link.email}</span>
                      </div>
                      {link.phone && (
                        <div className="flex items-center space-x-2">
                          <PhoneIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{link.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {link.is_used ? 'Used' : `Expires ${formatDate(link.expires_at)}`}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center space-x-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          link.is_used
                            ? 'bg-green-100 text-green-800'
                            : new Date(link.expires_at) < new Date()
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {link.is_used ? (
                          <>
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Used
                          </>
                        ) : new Date(link.expires_at) < new Date() ? (
                          <>
                            <XCircleIcon className="h-3 w-3 mr-1" />
                            Expired
                          </>
                        ) : (
                          <>
                            <ClockIcon className="h-3 w-3 mr-1" />
                            Active
                          </>
                        )}
                      </span>

                      {!link.is_used && new Date(link.expires_at) >= new Date() && (
                        <button
                          onClick={() => onCopy(`${BACKEND_URL}/register?token=${link.registration_token}`)}
                          className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                          <span>Copy Link</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-4">
                    <button
                      onClick={() => onDelete(link.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete registration link"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <LinkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-center text-center text-gray-900 mb-2">{t('no_registration_links_created')}</h3>
            <p className="text-gray-600 mb-4">{t('create_registration_links_description')}</p>
            <button
              onClick={onAddClick}
              data-testid="reg-link-add-first-button"
              className="btn btn-primary inline-flex items-center space-x-2"
            >
              <UserPlusIcon className="h-4 w-4 text-current" style={{ minWidth: '16px', minHeight: '16px' }} />
              <span>{t('create_first_link')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationLinksTab;
