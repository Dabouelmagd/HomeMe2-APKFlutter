import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  UsersIcon,
  PlusIcon,
  UserPlusIcon,
  HomeIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  CalendarIcon,
  XCircleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AddFamilyMemberToUnit = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [residents, setResidents] = useState([]);
  const [filteredResidents, setFilteredResidents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [memberForm, setMemberForm] = useState({
    full_name: '',
    relationship: 'son',
    age: '',
    birthday: '',
    phone: '',
    email: '',
    id_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    move_in_date: '',
    profile_picture: null,
    profile_picture_preview: null
  });

  const relationshipOptions = [
    { value: 'spouse', label: 'Spouse' },
    { value: 'son', label: 'Son' },
    { value: 'daughter', label: 'Daughter' },
    { value: 'father', label: 'Father' },
    { value: 'mother', label: 'Mother' },
    { value: 'brother', label: 'Brother' },
    { value: 'sister', label: 'Sister' },
    { value: 'grandfather', label: 'Grandfather' },
    { value: 'grandmother', label: 'Grandmother' },
    { value: 'uncle', label: 'Uncle' },
    { value: 'aunt', label: 'Aunt' },
    { value: 'cousin', label: 'Cousin' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchResidents();
  }, []);

  useEffect(() => {
    // Filter residents based on search term
    if (searchTerm.trim() === '') {
      setFilteredResidents(residents);
    } else {
      const filtered = residents.filter(resident => 
        resident.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resident.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resident.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredResidents(filtered);
    }
  }, [searchTerm, residents]);

  const fetchResidents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/compounds/${user.compound_id}/residences`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setResidents(response.data.residences || []);
      setFilteredResidents(response.data.residences || []);
    } catch (error) {
      console.error('Error fetching residents:', error);
      toast.error('Failed to load residents');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      setMemberForm(prev => ({ ...prev, profile_picture: file }));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setMemberForm(prev => ({ ...prev, profile_picture_preview: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMember = (resident) => {
    setSelectedUnit(resident);
    setShowAddMemberModal(true);
  };

  const resetForm = () => {
    setMemberForm({
      full_name: '',
      relationship: 'son',
      age: '',
      birthday: '',
      phone: '',
      email: '',
      id_number: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      move_in_date: '',
      profile_picture: null,
      profile_picture_preview: null
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUnit) return;

    if (!memberForm.full_name || !memberForm.relationship) {
      toast.error('Please fill in required fields (Name and Relationship)');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('unit_id', selectedUnit.id);
      formData.append('full_name', memberForm.full_name);
      formData.append('relationship', memberForm.relationship);
      
      if (memberForm.age) formData.append('age', memberForm.age);
      if (memberForm.birthday) formData.append('birthday', memberForm.birthday);
      if (memberForm.phone) formData.append('phone', memberForm.phone);
      if (memberForm.email) formData.append('email', memberForm.email);
      if (memberForm.id_number) formData.append('id_number', memberForm.id_number);
      if (memberForm.emergency_contact_name) formData.append('emergency_contact_name', memberForm.emergency_contact_name);
      if (memberForm.emergency_contact_phone) formData.append('emergency_contact_phone', memberForm.emergency_contact_phone);
      if (memberForm.move_in_date) formData.append('move_in_date', memberForm.move_in_date);
      if (memberForm.profile_picture) formData.append('profile_picture', memberForm.profile_picture);

      const response = await axios.post(`${API}/family-members/add-to-unit`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success(response.data.message);
      setShowAddMemberModal(false);
      resetForm();
      setSelectedUnit(null);
    } catch (error) {
      console.error('Error adding family member:', error);
      toast.error(error.response?.data?.detail || 'Failed to add family member');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8 bg-white rounded-2xl shadow-sm p-8">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full">
              <UserPlusIcon className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Family Member to Unit</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {user.role === 'admin' ? 'Add family members to any unit in your compound with ease' : 'Add family members to any unit in your compound with ease'}
            </p>
          </div>
        </div>

        {/* Enhanced Search Bar */}
        <div className="max-w-md mx-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, unit number, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-gray-900 placeholder-gray-500"
            />
          </div>
          {searchTerm && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              {filteredResidents.length} resident{filteredResidents.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
      </div>

      {/* Residents List */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        {filteredResidents.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gray-100 p-4 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <UsersIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No matching residents found' : 'No residents found'}
            </h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              {searchTerm ? 
                `Try adjusting your search term "${searchTerm}" to find residents` : 
                'There are no residents registered in your compound yet'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResidents.map((resident) => (
              <div key={resident.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all duration-200">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-start space-x-4">
                    {resident.profile_picture_url ? (
                      <img
                        src={`${BACKEND_URL}${resident.profile_picture_url}`}
                        alt={resident.full_name}
                        className="h-16 w-16 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm">
                        <UsersIcon className="h-8 w-8 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-lg truncate">{resident.full_name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                        <div className="bg-blue-100 p-1 rounded">
                          <HomeIcon className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="font-medium">Unit {resident.unit_number}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{resident.email}</span>
                    </div>
                    {resident.phone && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <PhoneIcon className="h-4 w-4 text-gray-400" />
                        <span>{resident.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleAddMember(resident)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors duration-200 font-medium shadow-sm"
                  >
                    <div className="bg-white/20 p-1 rounded-full">
                      <PlusIcon className="h-5 w-5" />
                    </div>
                    <span>Add Member</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Family Member Modal */}
      {showAddMemberModal && selectedUnit && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="add-member-modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowAddMemberModal(false)}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full max-h-screen overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <UserPlusIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl leading-6 font-semibold text-gray-900" id="add-member-modal-title">
                          Add Family Member
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Adding to Unit {selectedUnit.unit_number} - {selectedUnit.full_name}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddMemberModal(false)}
                      className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                    >
                      <XCircleIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={memberForm.full_name}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, full_name: e.target.value }))}
                          className="form-input w-full"
                          placeholder="Enter full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Relationship *
                        </label>
                        <select
                          required
                          value={memberForm.relationship}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, relationship: e.target.value }))}
                          className="form-input w-full"
                        >
                          {relationshipOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Age
                        </label>
                        <input
                          type="number"
                          value={memberForm.age}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, age: e.target.value }))}
                          className="form-input w-full"
                          placeholder="Enter age"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={memberForm.birthday}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, birthday: e.target.value }))}
                          className="form-input w-full"
                        />
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={memberForm.phone}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="form-input w-full"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={memberForm.email}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, email: e.target.value }))}
                          className="form-input w-full"
                          placeholder="member@email.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ID Number
                        </label>
                        <input
                          type="text"
                          value={memberForm.id_number}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, id_number: e.target.value }))}
                          className="form-input w-full"
                          placeholder="Enter ID number"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Move-in Date
                        </label>
                        <input
                          type="date"
                          value={memberForm.move_in_date}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, move_in_date: e.target.value }))}
                          className="form-input w-full"
                        />
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Emergency Contact Name
                        </label>
                        <input
                          type="text"
                          value={memberForm.emergency_contact_name}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                          className="form-input w-full"
                          placeholder="Emergency contact name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Emergency Contact Phone
                        </label>
                        <input
                          type="tel"
                          value={memberForm.emergency_contact_phone}
                          onChange={(e) => setMemberForm(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                          className="form-input w-full"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    {/* Profile Picture */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Profile Picture
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureChange}
                        className="form-input w-full"
                      />
                      {memberForm.profile_picture_preview && (
                        <div className="mt-2">
                          <img
                            src={memberForm.profile_picture_preview}
                            alt="Profile preview"
                            className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse sm:space-x-3 sm:space-x-reverse">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex justify-center items-center space-x-2 rounded-lg border border-transparent shadow-sm px-6 py-3 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>Add Family Member</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="mt-3 w-full inline-flex justify-center items-center space-x-2 rounded-lg border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:w-auto transition-colors"
                  >
                    <XCircleIcon className="h-5 w-5" />
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddFamilyMemberToUnit;