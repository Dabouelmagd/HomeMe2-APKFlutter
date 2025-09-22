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
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <UserPlusIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add Family Member to Unit</h1>
            <p className="text-gray-600">
              {user.role === 'admin' ? 'Add family members to any unit in your compound' : 'Add family members to any unit in your compound'}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, unit number, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input w-full pl-10"
          />
        </div>
      </div>

      {/* Residents List */}
      <div className="space-y-4">
        {filteredResidents.length === 0 ? (
          <div className="text-center py-8">
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchTerm ? 'No residents found matching your search' : 'No residents found'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResidents.map((resident) => (
              <div key={resident.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {resident.profile_picture_url ? (
                      <img
                        src={`${BACKEND_URL}${resident.profile_picture_url}`}
                        alt={resident.full_name}
                        className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                        <UsersIcon className="h-6 w-6 text-gray-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">{resident.full_name}</h3>
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <HomeIcon className="h-4 w-4" />
                        <span>Unit {resident.unit_number}</span>
                      </div>
                      <p className="text-sm text-gray-500">{resident.email}</p>
                      {resident.phone && (
                        <div className="text-sm text-gray-500 flex items-center space-x-1">
                          <PhoneIcon className="h-4 w-4" />
                          <span>{resident.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddMember(resident)}
                    className="btn btn-primary btn-sm flex items-center space-x-1"
                  >
                    <PlusIcon className="h-4 w-4" />
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
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="add-member-modal-title">
                        Add Family Member
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Adding to Unit {selectedUnit.unit_number} - {selectedUnit.full_name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddMemberModal(false)}
                      className="text-gray-400 hover:text-gray-600"
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

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Adding...' : 'Add Family Member'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
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