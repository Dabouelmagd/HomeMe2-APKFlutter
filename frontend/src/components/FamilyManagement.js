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
  PencilIcon,
  TrashIcon,
  QrCodeIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  CalendarIcon,
  XCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FamilyManagement = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [qrCodeData, setQrCodeData] = useState(null);

  const [memberForm, setMemberForm] = useState({
    full_name: '',
    age: '',
    relationship: 'son',
    phone: '',
    email: '',
    id_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    move_in_date: ''
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
    fetchFamilyMembers();
  }, []);

  const fetchFamilyMembers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/family-members`);
      setFamilyMembers(response.data.family_members || []);
    } catch (error) {
      console.error('Failed to load family members:', error);
      toast.error('Failed to load family members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      const memberData = {
        ...memberForm,
        age: parseInt(memberForm.age),
        move_in_date: memberForm.move_in_date || null
      };

      await axios.post(`${API}/family-members`, memberData);
      toast.success('Family member added successfully');
      setShowAddMember(false);
      resetForm();
      await fetchFamilyMembers();
    } catch (error) {
      console.error('Failed to add family member:', error);
      toast.error('Failed to add family member');
    }
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    try {
      const memberData = {
        ...memberForm,
        age: parseInt(memberForm.age),
        move_in_date: memberForm.move_in_date || null
      };

      await axios.put(`${API}/family-members/${editingMember.id}`, memberData);
      toast.success('Family member updated successfully');
      setEditingMember(null);
      resetForm();
      await fetchFamilyMembers();
    } catch (error) {
      console.error('Failed to update family member:', error);
      toast.error('Failed to update family member');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (window.confirm('Are you sure you want to remove this family member?')) {
      try {
        await axios.delete(`${API}/family-members/${memberId}`);
        toast.success('Family member removed successfully');
        await fetchFamilyMembers();
      } catch (error) {
        console.error('Failed to remove family member:', error);
        toast.error('Failed to remove family member');
      }
    }
  };

  const generateQRCode = async (member) => {
    try {
      const response = await axios.post(`${API}/family-members/${member.id}/qr-code`, {
        expires_in_hours: 24
      });
      
      setQrCodeData({
        qr_code: response.data.qr_code,
        expires_at: response.data.expires_at,
        member_name: member.full_name
      });
      setShowQRModal(true);
      toast.success('QR code generated successfully');
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      toast.error('Failed to generate QR code');
    }
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setMemberForm({
      full_name: member.full_name,
      age: member.age.toString(),
      relationship: member.relationship,
      phone: member.phone || '',
      email: member.email || '',
      id_number: member.id_number || '',
      emergency_contact_name: member.emergency_contact_name || '',
      emergency_contact_phone: member.emergency_contact_phone || '',
      move_in_date: member.move_in_date || ''
    });
    setShowAddMember(true);
  };

  const resetForm = () => {
    setMemberForm({
      full_name: '',
      age: '',
      relationship: 'son',
      phone: '',
      email: '',
      id_number: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      move_in_date: ''
    });
    setEditingMember(null);
    setShowAddMember(false);
  };

  const getRelationshipLabel = (relationship) => {
    const option = relationshipOptions.find(opt => opt.value === relationship);
    return option ? option.label : relationship;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

    try {
      await axios.post(`${API}/families/${familyData.family.id}/members`, memberForm);
      toast.success('Family member added successfully!');
      setShowAddMember(false);
      setMemberForm({
        username: '',
        email: '',
        password: '',
        full_name: '',
        phone: ''
      });
      fetchFamilyData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add family member');
    }
  };

  const handleInputChange = (e) => {
    setMemberForm({
      ...memberForm,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Family Management</h1>
        <p className="text-gray-600 mt-2">
          Manage your family members and household
        </p>
      </div>

      {/* Family Info Card */}
      {familyData?.family ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <HomeIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Unit {familyData.family.unit_number}
              </h2>
              <p className="text-gray-600">
                Family ID: {familyData.family.id}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500">Total Members</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {familyData.members?.length || 0}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500">Unit Number</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {familyData.family.unit_number}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500">Created</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {new Date(familyData.family.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="text-center py-8">
            <HomeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Family Found</h3>
            <p className="text-gray-600">
              You don't seem to be associated with a family unit yet.
            </p>
          </div>
        </div>
      )}

      {/* Family Members */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Family Members</h3>
            <p className="text-gray-600">Manage your household members</p>
          </div>
          {user?.is_family_head && (
            <button
              onClick={() => setShowAddMember(true)}
              className="btn btn-primary flex items-center space-x-2"
            >
              <UserPlusIcon className="h-4 w-4" />
              <span>Add Member</span>
            </button>
          )}
        </div>

        {familyData?.members?.length > 0 ? (
          <div className="space-y-4">
            {familyData.members.map((member, index) => (
              <div
                key={index}
                className={`flex items-center space-x-4 p-4 rounded-lg border ${
                  member.is_family_head
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex-shrink-0">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                    member.is_family_head
                      ? 'bg-blue-600'
                      : 'bg-gray-400'
                  }`}>
                    <span className="text-lg font-medium text-white">
                      {member.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900">{member.full_name}</p>
                    {member.is_family_head && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Family Head
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{member.email}</p>
                  {member.phone && (
                    <p className="text-sm text-gray-600">{member.phone}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <p className="text-sm text-gray-500">
                    @{member.username}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No family members found</p>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-90vh overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Add Family Member</h3>
                <button
                  onClick={() => setShowAddMember(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={memberForm.full_name}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={memberForm.username}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                    placeholder="Choose username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={memberForm.email}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                    placeholder="Enter email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={memberForm.password}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                    placeholder="Enter password"
                    minLength="6"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={memberForm.phone}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddMember(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                  >
                    Add Member
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

export default FamilyManagement;