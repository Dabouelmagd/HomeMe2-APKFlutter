import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserGroupIcon,
  XCircleIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  HomeIcon,
  IdentificationIcon,
  SparklesIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  DocumentDuplicateIcon,
  CameraIcon,
  UsersIcon,
  TrashIcon,
  PlusIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import DateInput from '../../DateInput';
import { formatDate } from '../../../utils/dateUtils';

/**
 * 4-step wizard for creating a residence + family head + family members in one flow.
 * Extracted from CompoundManagement.js — fully controlled by parent state.
 */
const ComprehensiveFamilyModal = ({
  open,
  step,
  setStep,
  form,
  setForm,
  newMember,
  setNewMember,
  onAddMember,
  onRemoveMember,
  onHeadProfilePictureChange,
  onMemberProfilePictureChange,
  onSubmit,
  onClose,
}) => {
  const { t } = useTranslation();
  if (!open) return null;

  const stepConfig = [
    { step: 1, label: t('unit_info'), icon: BuildingOfficeIcon },
    { step: 2, label: t('family_head'), icon: AcademicCapIcon },
    { step: 3, label: t('family_members'), icon: UserGroupIcon },
    { step: 4, label: t('review'), icon: CheckCircleIcon },
  ];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="comprehensive-family-modal-title"
      role="dialog"
      aria-modal="true"
      data-testid="comprehensive-family-modal"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full max-h-screen overflow-y-auto">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl -m-6 mb-6">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <UserGroupIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold" id="comprehensive-family-modal-title">
                    {t('add_new_resident_family')}
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">{t('complete_family_setup')}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-2 transition-colors"
                data-testid="comprehensive-family-close"
              >
                <span className="sr-only">Close</span>
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {stepConfig.map(({ step: s, label, icon: Icon }) => (
                  <div key={s} className="flex items-center">
                    <div
                      className={`relative flex items-center justify-center w-10 h-10 rounded-full ${
                        step >= s
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                          : 'bg-gray-100 border-2 border-gray-300 text-gray-400'
                      } transition-all duration-300`}
                    >
                      <Icon className="h-5 w-5" />
                      {step > s && (
                        <div className="absolute inset-0 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircleIcon className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className={`ml-3 ${step === s ? 'text-blue-600' : 'text-gray-500'}`}>
                      <div className="text-sm font-medium">{label}</div>
                      <div className="text-xs text-gray-400">{t('step')} {s}</div>
                    </div>
                    {s < 4 && (
                      <div
                        className={`ml-6 w-16 h-1 rounded-full ${
                          step > s ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gray-200'
                        } transition-all duration-300`}
                      ></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="min-h-96">
              {/* Step 1: Unit Information */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                        <BuildingOfficeIcon className="h-4 w-4 text-white" />
                      </div>
                      <h4 className="font-semibold text-blue-900">{t('step_1_unit_information')}</h4>
                    </div>
                    <p className="text-sm text-blue-700">{t('enter_basic_residence_details')}</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <div className="space-y-6">
                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                          <HomeIcon className="h-4 w-4 text-blue-500" />
                          <span>{t('unit_number')} *</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={form.unit_number}
                            onChange={(e) => setForm((prev) => ({ ...prev, unit_number: e.target.value }))}
                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-4 pr-4 py-3 text-lg"
                            placeholder={t('unit_number_example')}
                            data-testid="comp-family-unit-number"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <IdentificationIcon className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 flex items-center space-x-1">
                          <SparklesIcon className="h-3 w-3" />
                          <span>{t('enter_unit_number_identifier')}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Family Head Information */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                        <AcademicCapIcon className="h-4 w-4 text-white" />
                      </div>
                      <h4 className="font-semibold text-green-900">{t('step_2_family_head_details')}</h4>
                    </div>
                    <p className="text-sm text-green-700">{t('enter_complete_information_primary_resident')}</p>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                          <IdentificationIcon className="h-4 w-4 text-green-500" />
                          <span>Full Name *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.head_full_name}
                          onChange={(e) => setForm((prev) => ({ ...prev, head_full_name: e.target.value }))}
                          className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-4 py-3"
                          placeholder={t('enter_full_name')}
                          data-testid="comp-family-head-name"
                        />
                      </div>

                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                          <EnvelopeIcon className="h-4 w-4 text-green-500" />
                          <span>{t('email_address')} *</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={form.head_email}
                          onChange={(e) => setForm((prev) => ({ ...prev, head_email: e.target.value }))}
                          className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-4 py-3"
                          placeholder="resident@email.com"
                          data-testid="comp-family-head-email"
                        />
                      </div>

                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                          <PhoneIcon className="h-4 w-4 text-green-500" />
                          <span>{t('cm_phone', 'رقم الهاتف')}</span>
                        </label>
                        <input
                          type="tel"
                          value={form.head_phone}
                          onChange={(e) => setForm((prev) => ({ ...prev, head_phone: e.target.value }))}
                          className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-4 py-3"
                          placeholder="+966 123 456 789"
                        />
                      </div>

                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                          <CalendarIcon className="h-4 w-4 text-green-500" />
                          <span>{t('cm_dob', 'تاريخ الميلاد')}</span>
                        </label>
                        <DateInput
                          value={form.head_date_of_birth}
                          onChange={(e) => setForm((prev) => ({ ...prev, head_date_of_birth: e.target.value }))}
                          className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-4 py-3"
                        />
                      </div>

                      <div>
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                          <DocumentDuplicateIcon className="h-4 w-4 text-green-500" />
                          <span>{t('cm_id', 'رقم الهوية')}</span>
                        </label>
                        <input
                          type="text"
                          value={form.head_id_number}
                          onChange={(e) => setForm((prev) => ({ ...prev, head_id_number: e.target.value }))}
                          className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-4 py-3"
                          placeholder={t('cm_id_placeholder', 'أدخل رقم الهوية/جواز السفر')}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                          <CameraIcon className="h-4 w-4 text-green-500" />
                          <span>{t('cm_photo', 'الصورة الشخصية')}</span>
                        </label>
                        <div className="flex items-center space-x-4">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={onHeadProfilePictureChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                          />
                          {form.head_profile_picture_preview && (
                            <div className="flex-shrink-0">
                              <img
                                src={form.head_profile_picture_preview}
                                alt="Family head preview"
                                className="h-16 w-16 rounded-full object-cover border-2 border-green-200 shadow-sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Family Members */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-medium text-purple-900 mb-2">{t('step_3_family_members')}</h4>
                    <p className="text-sm text-purple-700">{t('add_all_family_members_complete_info')}</p>
                  </div>

                  {form.family_members.length > 0 && (
                    <div className="space-y-4">
                      <h5 className="font-medium text-gray-900">Added Family Members ({form.family_members.length})</h5>
                      {form.family_members.map((member) => (
                        <div key={member.id} className="bg-gray-50 rounded-lg p-4 flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            {member.profile_picture_preview ? (
                              <img
                                src={member.profile_picture_preview}
                                alt={member.full_name}
                                className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                                <UsersIcon className="h-6 w-6 text-gray-600" />
                              </div>
                            )}
                            <div>
                              <h6 className="font-medium text-gray-900">{member.full_name}</h6>
                              <p className="text-sm text-gray-600">{member.relationship}</p>
                              {member.age && <p className="text-sm text-gray-500">Age: {member.age}</p>}
                              {member.email && <p className="text-sm text-gray-500">{member.email}</p>}
                            </div>
                          </div>
                          <button
                            onClick={() => onRemoveMember(member.id)}
                            className="text-red-600 hover:text-red-800"
                            data-testid={`remove-family-member-${member.id}`}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-4">Add Family Member</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          value={newMember.full_name}
                          onChange={(e) => setNewMember((prev) => ({ ...prev, full_name: e.target.value }))}
                          className="form-input w-full"
                          placeholder={t('enter_full_name')}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
                        <select
                          value={newMember.relationship}
                          onChange={(e) => setNewMember((prev) => ({ ...prev, relationship: e.target.value }))}
                          className="form-input w-full"
                        >
                          <option value="">Select relationship</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Son">Son</option>
                          <option value="Daughter">Daughter</option>
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Brother">Brother</option>
                          <option value="Sister">Sister</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                        <input
                          type="number"
                          value={newMember.age}
                          onChange={(e) => setNewMember((prev) => ({ ...prev, age: e.target.value }))}
                          className="form-input w-full"
                          placeholder="Enter age"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone_number')}</label>
                        <input
                          type="tel"
                          value={newMember.phone}
                          onChange={(e) => setNewMember((prev) => ({ ...prev, phone: e.target.value }))}
                          className="form-input w-full"
                          placeholder="+966 123 456 789"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                          type="email"
                          value={newMember.email}
                          onChange={(e) => setNewMember((prev) => ({ ...prev, email: e.target.value }))}
                          className="form-input w-full"
                          placeholder="member@email.com (optional)"
                        />
                      </div>

                      <div>
                        <DateInput
                          label={t('date_of_birth')}
                          value={newMember.date_of_birth}
                          onChange={(e) => setNewMember((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                        <input
                          type="text"
                          value={newMember.id_number}
                          onChange={(e) => setNewMember((prev) => ({ ...prev, id_number: e.target.value }))}
                          className="form-input w-full"
                          placeholder="Enter ID number (optional)"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile_picture')}</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={onMemberProfilePictureChange}
                          className="form-input w-full"
                        />
                        {newMember.profile_picture_preview && (
                          <div className="mt-2">
                            <img
                              src={newMember.profile_picture_preview}
                              alt="Member preview"
                              className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={onAddMember}
                        className="btn btn-secondary flex items-center space-x-2"
                        data-testid="add-family-member-button"
                      >
                        <PlusIcon className="h-4 w-4" />
                        <span>Add Family Member</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> You can skip adding family members now and add them later through the Family Management section.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="font-medium text-indigo-900 mb-2">{t('step_4_review_confirm')}</h4>
                    <p className="text-sm text-indigo-700">{t('review_all_info_before_creating')}</p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3">{t('cm_unit_info', 'معلومات الوحدة')}</h5>
                    <p className="text-sm text-gray-600">
                      {t('cm_unit_number', 'رقم الوحدة')}: <span className="font-medium">{form.unit_number}</span>
                    </p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3">Family Head</h5>
                    <div className="flex items-start space-x-4">
                      {form.head_profile_picture_preview ? (
                        <img
                          src={form.head_profile_picture_preview}
                          alt="Family head"
                          className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                          <UsersIcon className="h-8 w-8 text-gray-600" />
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900">{form.head_full_name}</p>
                        <p className="text-sm text-gray-600">{form.head_email}</p>
                        {form.head_phone && <p className="text-sm text-gray-600">{form.head_phone}</p>}
                        {form.head_date_of_birth && <p className="text-sm text-gray-600">DOB: {formatDate(form.head_date_of_birth)}</p>}
                        {form.head_id_number && <p className="text-sm text-gray-600">ID: {form.head_id_number}</p>}
                      </div>
                    </div>
                  </div>

                  {form.family_members.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-3">Family Members ({form.family_members.length})</h5>
                      <div className="space-y-3">
                        {form.family_members.map((member) => (
                          <div key={member.id} className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
                            {member.profile_picture_preview ? (
                              <img
                                src={member.profile_picture_preview}
                                alt={member.full_name}
                                className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                                <UsersIcon className="h-6 w-6 text-gray-600" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{member.full_name}</p>
                              <p className="text-sm text-gray-600">{member.relationship}</p>
                              {member.age && <p className="text-xs text-gray-500">Age: {member.age}</p>}
                              {member.date_of_birth && <p className="text-xs text-gray-500">DOB: {formatDate(member.date_of_birth)}</p>}
                              {member.email && <p className="text-xs text-gray-500">{member.email}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h5 className="font-medium text-green-900 mb-2">{t('what_happens_next')}</h5>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• {t('residence_account_will_be_created', { unit_number: form.unit_number })}</li>
                      <li>• {t('family_head_gets_login_credentials')}</li>
                      <li>• {t('family_members_added_to_profile')}</li>
                      <li>• {t('profile_pictures_uploaded')}</li>
                      <li>• {t('family_can_start_using_homeme')}</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-6">
              {step === 4 ? (
                <button
                  onClick={onSubmit}
                  data-testid="comp-family-submit"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {t('create_residence_and_family')}
                </button>
              ) : (
                <button
                  onClick={() => setStep((prev) => prev + 1)}
                  disabled={
                    (step === 1 && !form.unit_number) ||
                    (step === 2 && (!form.head_full_name || !form.head_email))
                  }
                  data-testid="comp-family-next"
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
                >
                  <span>{t('next_step')}</span>
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              )}

              {step > 1 && (
                <button
                  onClick={() => setStep((prev) => prev - 1)}
                  data-testid="comp-family-previous"
                  className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-300 transition-all duration-300"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  <span>{t('previous_step')}</span>
                </button>
              )}

              <button
                onClick={onClose}
                data-testid="comp-family-cancel"
                className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-300"
              >
                <XCircleIcon className="h-4 w-4" />
                <span>{t('cancel')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveFamilyModal;
