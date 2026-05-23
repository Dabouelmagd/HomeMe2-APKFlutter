import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatDate } from '../../../utils/dateUtils';
import {
  PlusIcon,
  HomeIcon,
  PencilIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  UserPlusIcon,
  UsersIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const ResidencesTab = ({
  residences,
  sortOrder,
  setSortOrder,
  getSortedResidences,
  expandedUnits,
  unitFamilyMembers,
  onAddResidenceClick,
  onEditUnit,
  onDeleteClick,
  onToggleUnitExpansion,
  onEditMember,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6" data-testid="residences-tab">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-center text-gray-900 text-center">{t('residences_list')}</h3>
            <p className="text-gray-600">{t('view_all_residences_occupancy')}</p>
          </div>
          <div className="text-right">
            <button
              onClick={onAddResidenceClick}
              data-testid="residences-add-button"
              className="btn btn-primary flex items-center space-x-2 mb-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>{t('add_resident_family')}</span>
            </button>
            <p className="text-xs text-gray-500 max-w-xs">{t('create_new_resident')}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              {t('total_units')}: <span className="font-semibold text-center">{residences.length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">{t('sort_by')}:</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="form-input text-sm"
                data-testid="residences-sort-select"
              >
                <option value="newest">{t('newest_first')}</option>
                <option value="oldest">{t('oldest_first')}</option>
                <option value="unit_number">{t('unit_number')}</option>
                <option value="name_asc">{t('name_asc')}</option>
                <option value="name_desc">{t('name_desc')}</option>
                <option value="family_size">{t('family_size')}</option>
              </select>
            </div>
          </div>
          <div className="text-xs text-gray-500">{t('use_add_resident_tip')}</div>
        </div>

        {residences.length > 0 ? (
          <div className="space-y-4">
            {getSortedResidences().map((residence) => (
              <div key={residence.id || residence.family_head?.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {residence.family_head?.profile_picture_url ? (
                          <img
                            src={`${BACKEND_URL}${residence.family_head.profile_picture_url}`}
                            alt={residence.family_head.full_name}
                            className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                            <HomeIcon className="h-8 w-8 text-gray-600" />
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-center text-gray-900 text-center">
                            {t('unit')} {residence.unit_number}
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {t('active')}
                          </span>
                        </div>
                        <p className="text-gray-600 font-medium">{residence.family_head?.full_name}</p>
                        <p className="text-sm text-gray-500">{residence.family_head?.email}</p>
                        {residence.family_head?.phone && (
                          <p className="text-sm text-gray-500">{residence.family_head?.phone}</p>
                        )}
                        {residence.family_head?.created_at && (
                          <p className="text-xs text-gray-400">
                            {t('joined')}: {formatDate(residence.family_head.created_at)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button onClick={() => onEditUnit(residence)} className="btn btn-secondary btn-sm flex items-center space-x-1">
                        <PencilIcon className="h-4 w-4" />
                        <span>{t('edit')}</span>
                      </button>
                      <button onClick={() => onDeleteClick('unit', residence)} className="btn btn-danger btn-sm flex items-center space-x-1">
                        <TrashIcon className="h-4 w-4" />
                        <span>{t('delete')}</span>
                      </button>
                      <button
                        onClick={() => onToggleUnitExpansion(residence.family_head?.id || residence.id)}
                        className="btn btn-outline btn-sm flex items-center space-x-1"
                      >
                        {expandedUnits.has(residence.family_head?.id || residence.id) ? (
                          <>
                            <ChevronUpIcon className="h-4 w-4" />
                            <span>{t('hide_family')}</span>
                          </>
                        ) : (
                          <>
                            <ChevronDownIcon className="h-4 w-4" />
                            <span>{t('view_family')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {expandedUnits.has(residence.family_head?.id || residence.id) && (
                  <div className="p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-900">{t('family_members', 'Family Members')}</h4>
                      <Link to="/add-family-member" className="btn btn-primary btn-sm flex items-center space-x-1">
                        <UserPlusIcon className="h-4 w-4" />
                        <span>{t('add_member')}</span>
                      </Link>
                    </div>

                    {unitFamilyMembers[residence.family_head?.id || residence.id]?.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {unitFamilyMembers[residence.family_head?.id || residence.id].map((member) => (
                          <div key={member.id} className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start space-x-3">
                                {member.profile_picture_url ? (
                                  <img
                                    src={`${BACKEND_URL}${member.profile_picture_url}`}
                                    alt={member.full_name}
                                    className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                                    <UsersIcon className="h-6 w-6 text-gray-600" />
                                  </div>
                                )}
                                <div>
                                  <h5 className="font-medium text-gray-900">{member.full_name}</h5>
                                  <p className="text-sm text-gray-600 capitalize">{member.relationship}</p>
                                  {member.age && <p className="text-xs text-gray-500">Age: {member.age}</p>}
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                <button onClick={() => onEditMember(member)} className="text-blue-600 hover:text-blue-800 p-1" title="Edit member">
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button onClick={() => onDeleteClick('member', member)} className="text-red-600 hover:text-red-800 p-1" title="Delete member">
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1">
                              {member.email && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <EnvelopeIcon className="h-4 w-4" />
                                  <span>{member.email}</span>
                                </div>
                              )}
                              {member.phone && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <PhoneIcon className="h-4 w-4" />
                                  <span>{member.phone}</span>
                                </div>
                              )}
                              {member.birthday && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <CalendarIcon className="h-4 w-4" />
                                  <span>{formatDate(member.birthday)}</span>
                                </div>
                              )}
                              {member.id_number && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <IdentificationIcon className="h-4 w-4" />
                                  <span>{member.id_number}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <UsersIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">{t('no_family_members_added')}</p>
                        <Link to="/add-family-member" className="text-blue-600 hover:text-blue-800 text-sm">
                          Add the first family member
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <HomeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-center text-center text-gray-900 mb-2">{t('no_residences')}</h3>
            <p className="text-gray-600">{t('residences_appear_after_registration')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResidencesTab;
