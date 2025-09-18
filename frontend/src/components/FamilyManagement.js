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
    birthday: '',
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
        birthday: memberForm.birthday || null,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Family Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage family members for Unit {user.unit_number} with QR gate access
            </p>
          </div>
          <button
            onClick={() => setShowAddMember(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlusIcon className="h-5 w-5 mr-2" />
            Add Family Member
          </button>
        </div>

        {/* Family Members Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {familyMembers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg">No family members added</p>
              <p className="text-gray-400 text-sm">Add family members to manage unit access and information</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Relationship</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Move-in Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {familyMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {member.full_name.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{member.full_name}</div>
                            {member.id_number && (
                              <div className="text-sm text-gray-500">ID: {member.id_number}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {getRelationshipLabel(member.relationship)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{member.age}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {member.phone && (
                            <div className="flex items-center">
                              <PhoneIcon className="h-4 w-4 mr-1 text-gray-400" />
                              {member.phone}
                            </div>
                          )}
                          {member.email && (
                            <div className="flex items-center mt-1">
                              <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-400" />
                              {member.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDate(member.move_in_date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => generateQRCode(member)}
                            className="text-green-600 hover:text-green-900"
                            title="Generate QR Code"
                          >
                            <QrCodeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditMember(member)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Remove"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Member Modal */}
        {showAddMember && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
              <h2 className="text-lg font-semibold mb-6">
                {editingMember ? 'Edit Family Member' : 'Add Family Member'}
              </h2>
              
              <form onSubmit={editingMember ? handleUpdateMember : handleAddMember} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={memberForm.full_name}
                      onChange={(e) => setMemberForm({...memberForm, full_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                    <input
                      type="number"
                      value={memberForm.age}
                      onChange={(e) => setMemberForm({...memberForm, age: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="120"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Relationship</label>
                    <select
                      value={memberForm.relationship}
                      onChange={(e) => setMemberForm({...memberForm, relationship: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {relationshipOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={memberForm.phone}
                      onChange={(e) => setMemberForm({...memberForm, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={memberForm.email}
                      onChange={(e) => setMemberForm({...memberForm, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ID Number</label>
                    <input
                      type="text"
                      value={memberForm.id_number}
                      onChange={(e) => setMemberForm({...memberForm, id_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Government ID/Passport number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={memberForm.emergency_contact_name}
                      onChange={(e) => setMemberForm({...memberForm, emergency_contact_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact Phone</label>
                    <input
                      type="tel"
                      value={memberForm.emergency_contact_phone}
                      onChange={(e) => setMemberForm({...memberForm, emergency_contact_phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Move-in Date</label>
                    <input
                      type="date"
                      value={memberForm.move_in_date}
                      onChange={(e) => setMemberForm({...memberForm, move_in_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingMember ? 'Update Member' : 'Add Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {showQRModal && qrCodeData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold mb-4">Gate Access QR Code</h2>
                <p className="text-sm text-gray-600 mb-4">
                  QR Code for {qrCodeData.member_name}
                </p>
                
                <div className="mb-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                  <img 
                    src={qrCodeData.qr_code} 
                    alt="QR Code" 
                    className="mx-auto"
                    style={{ maxWidth: '200px', maxHeight: '200px' }}
                  />
                </div>
                
                <p className="text-xs text-gray-500 mb-4">
                  Valid until: {new Date(qrCodeData.expires_at).toLocaleString()}
                </p>
                
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-blue-800">
                    📱 Show this QR code to security at the compound gate for access
                  </p>
                </div>
                
                <button
                  onClick={() => setShowQRModal(false)}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyManagement;