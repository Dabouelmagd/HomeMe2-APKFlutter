import CompoundAdSlots from '../../CompoundAdSlots';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../../utils/dateUtils';
import {
  BuildingLibraryIcon,
  CameraIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

const OverviewTab = ({ compound, user, uploading, onLogoUpload, onAddAdminClick, onAddResidenceClick }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6" data-testid="overview-tab">
      {/* Compound Info Card */}
      <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-2xl shadow-lg border border-blue-100 p-6">
        <div className="flex items-start space-x-6">
          <div className="flex-shrink-0">
            <div className="relative">
              {compound?.logo_url ? (
                <img
                  src={compound.logo_url}
                  alt={t('compound_logo')}
                  className="h-24 w-24 rounded-lg object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="h-24 w-24 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-dashed border-blue-200 flex items-center justify-center">
                  <BuildingLibraryIcon className="h-8 w-8 text-blue-500" />
                </div>
              )}

              <label htmlFor="logo-upload" className="absolute inset-0 cursor-pointer">
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={onLogoUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <div className="absolute inset-0 rounded-lg bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <CameraIcon className="h-6 w-6 text-white" />
                </div>
              </label>

              {uploading && (
                <div className="absolute inset-0 rounded-lg bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">{t('click_to_upload_logo')}</p>
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-center text-gray-900 mb-2">{compound?.name || 'Compound Name'}</h2>
            <p className="text-gray-600 mb-4">{compound?.address || 'Compound Address'}</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('compound_id')}</p>
                <p className="text-lg font-semibold text-center text-gray-900 text-center">{compound?.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{t('created')}</p>
                <p className="text-lg font-semibold text-center text-gray-900 text-center">
                  {compound?.created_at ? formatDate(compound.created_at) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Management */}
      <div className="bg-gradient-to-br from-white via-purple-50 to-indigo-50 rounded-2xl shadow-lg border border-purple-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-center text-gray-900 text-center">{t('admin_management')}</h3>
            <p className="text-gray-600">{t('manage_admins')}</p>
          </div>
          <button
            onClick={onAddAdminClick}
            data-testid="overview-add-admin-button"
            className="btn btn-primary flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <ShieldCheckIcon className="h-4 w-4" />
            <span>🛡️ {t('add_new_admin')}</span>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
                <AcademicCapIcon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{user?.full_name}</p>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
            <div className="flex-shrink-0">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {t('primary_admin')}
              </span>
            </div>
          </div>

          {compound?.additional_admins?.length > 0 ? (
            compound.additional_admins.map((adminId, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center">
                    <ShieldCheckIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Admin {index + 1}</p>
                  <p className="text-sm text-gray-600">ID: {adminId}</p>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    Admin
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center mx-auto mb-4">
                <UserGroupIcon className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-gray-500">{t('no_additional_admins')}</p>
              <p className="text-sm text-gray-400">{t('help_manage')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Residence Management */}
      <div className="bg-gradient-to-br from-white via-green-50 to-emerald-50 rounded-2xl shadow-lg border border-green-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-center text-gray-900 text-center">{t('residence_management')}</h3>
            <p className="text-gray-600">{t('create_new_residence')}</p>
          </div>
          <button
            onClick={onAddResidenceClick}
            data-testid="overview-add-residence-button"
            className="btn btn-primary flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            <BuildingOfficeIcon className="h-4 w-4" />
            <span>{t('add_residence')}</span>
          </button>
        </div>

        <div className="text-center py-8">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center mx-auto mb-4">
            <BuildingOfficeIcon className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-gray-500">{t('no_residences')}</p>
          <p className="text-sm text-gray-400">{t('residences_appear')}</p>
        </div>
      </div>
      {/* Ad Slots Section */}
      <div className="mt-6">
        <CompoundAdSlots compoundId={compound?.id} />
      </div>
    </div>
  );
};

export default OverviewTab;
