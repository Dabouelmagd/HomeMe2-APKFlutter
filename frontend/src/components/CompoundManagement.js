import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { toast } from 'sonner';
import TestUpdate from './TestUpdate';
import {
  BuildingOfficeIcon,
  PhotoIcon,
  UsersIcon,
  PlusIcon,
  HomeIcon,
  UserPlusIcon,
  LinkIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CompoundManagement = () => {
  const { user, updateUser } = useAuth();
  const [compound, setCompound] = useState(null);
  const [residences, setResidences] = useState([]);
  const [registrationLinks, setRegistrationLinks] = useState([]);
  const [availableCompounds, setAvailableCompounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddResidence, setShowAddResidence] = useState(false);
  const [showAddNewResidence, setShowAddNewResidence] = useState(false);
  const [showCompoundSelection, setShowCompoundSelection] = useState(false);
  const [compoundNotFound, setCompoundNotFound] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [editableCompound, setEditableCompound] = useState({
    name: '',
    address: '',
    description: '',
    logo_url: ''
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Form for adding new residence registration link
  const [residenceForm, setResidenceForm] = useState({
    unit_number: '',
    full_name: '',
    email: '',
    phone: '',
    expires_in_hours: 72
  });

  // Form for adding new residence directly
  const [newResidenceForm, setNewResidenceForm] = useState({
    unit_number: '',
    full_name: '',
    email: '',
    phone: '',
    profile_picture: null,
    profile_picture_preview: null
  });

  // Form for adding new admin
  const [adminForm, setAdminForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    phone: '',
    profile_picture: null,
    profile_picture_preview: null
  });

  const resetAdminForm = () => {
    setAdminForm({
      username: '',
      email: '',
      password: '',
      full_name: '',
      phone: '',
      profile_picture: null,
      profile_picture_preview: null
    });
  };

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`);
      setAllUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('username', adminForm.username);
      formData.append('email', adminForm.email);
      formData.append('password', adminForm.password);
      formData.append('full_name', adminForm.full_name);
      formData.append('phone', adminForm.phone || '');
      formData.append('compound_id', user.compound_id);
      formData.append('role', 'admin');
      
      if (adminForm.profile_picture) {
        formData.append('profile_picture', adminForm.profile_picture);
      }

      const response = await axios.post(`${API}/admin/create-admin`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Admin account created successfully!');
      setShowAddAdmin(false);
      resetAdminForm();
      await fetchAllUsers();
    } catch (error) {
      console.error('Failed to create admin:', error);
      toast.error(error.response?.data?.detail || 'Failed to create admin account');
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const response = await axios.put(`${API}/admin/users/${userId}/status`, {
        is_active: !currentStatus
      });
      
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      await fetchAllUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await axios.delete(`${API}/admin/users/${userId}`);
        toast.success('User deleted successfully');
        await fetchAllUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
        toast.error('Failed to delete user');
      }
    }
  };

  const handleSaveCompoundSettings = async () => {
    try {
      const response = await axios.put(`${API}/compounds/${user.compound_id}`, {
        name: editableCompound.name,
        address: editableCompound.address
      });
      
      setCompound(response.data);
      toast.success('Compound settings updated successfully!');
    } catch (error) {
      console.error('Failed to update compound settings:', error);
      toast.error('Failed to update compound settings');
    }
  };

  const handleCancelCompoundSettings = () => {
    setEditableCompound({
      name: compound?.name || '',
      address: compound?.address || ''
    });
  };

  useEffect(() => {
    fetchCompound();
    fetchResidences();
    if (user?.role === 'admin') {
      fetchRegistrationLinks();
      fetchAllUsers();
    }
  }, []);

  const fetchCompound = async () => {
    try {
      const response = await axios.get(`${API}/compounds/${user.compound_id}`);
      setCompound(response.data);
      setEditableCompound({
        name: response.data.name || '',
        address: response.data.address || '',
        description: response.data.description || '',
        logo_url: response.data.logo_url || ''
      });
      setLogoPreview(response.data.logo_url || null);
      setCompoundNotFound(false);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('Compound not found, loading available compounds for selection');
        setCompoundNotFound(true);
        await loadAvailableCompounds();
      } else {
        toast.error('Failed to load compound data');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableCompounds = async () => {
    try {
      const response = await axios.get(`${API}/compounds`);
      setAvailableCompounds(response.data.compounds || []);
      setShowCompoundSelection(true);
    } catch (error) {
      console.error('Failed to load available compounds:', error);
      toast.error('Failed to load available compounds');
    }
  };

  const handleCompoundSelection = async (selectedCompoundId) => {
    try {
      // Update user's compound_id
      const updateResponse = await axios.put(`${API}/users/${user.id}/compound`, {
        compound_id: selectedCompoundId
      });
      
      if (updateResponse.status === 200) {
        // Update user context
        const updatedUser = { ...user, compound_id: selectedCompoundId };
        updateUser(updatedUser);
        
        // Fetch the selected compound data
        const compoundResponse = await axios.get(`${API}/compounds/${selectedCompoundId}`);
        setCompound(compoundResponse.data);
        setShowCompoundSelection(false);
        setCompoundNotFound(false);
        
        // Reload data for the new compound
        await fetchResidences();
        if (user?.role === 'admin') {
          await fetchRegistrationLinks();
        }
        
        toast.success('Compound selected successfully!');
      }
    } catch (error) {
      console.error('Failed to update compound selection:', error);
      toast.error('Failed to update compound selection');
    }
  };

  const fetchResidences = async () => {
    try {
      const response = await axios.get(`${API}/compounds/${user.compound_id}/residences`);
      setResidences(response.data.residences);
    } catch (error) {
      console.error('Failed to load residences:', error);
    }
  };

  const fetchRegistrationLinks = async () => {
    try {
      const response = await axios.get(`${API}/admin/registration-links`);
      setRegistrationLinks(response.data.registration_links || []);
    } catch (error) {
      console.error('Failed to load registration links:', error);
    }
  };

  const handleCreateRegistrationLink = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/admin/registration-links`, residenceForm);
      toast.success('Registration link created successfully!');
      
      // Copy link to clipboard
      navigator.clipboard.writeText(response.data.registration_url);
      toast.success('Registration URL copied to clipboard!');
      
      setShowAddResidence(false);
      resetResidenceForm();
      await fetchRegistrationLinks();
    } catch (error) {
      console.error('Failed to create registration link:', error);
      toast.error(error.response?.data?.detail || 'Failed to create registration link');
    }
  };

  const handleDeleteRegistrationLink = async (linkId) => {
    if (window.confirm('Are you sure you want to delete this registration link?')) {
      try {
        await axios.delete(`${API}/admin/registration-links/${linkId}`);
        toast.success('Registration link deleted successfully');
        await fetchRegistrationLinks();
      } catch (error) {
        console.error('Failed to delete registration link:', error);
        toast.error('Failed to delete registration link');
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const resetResidenceForm = () => {
    setResidenceForm({
      unit_number: '',
      full_name: '',
      email: '',
      phone: '',
      expires_in_hours: 72
    });
  };

  const handleAdminProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      setAdminForm(prev => ({ ...prev, profile_picture: file }));
      
      // Create preview
      // eslint-disable-next-line no-undef
      const reader = new FileReader();
      reader.onload = (e) => {
        setAdminForm(prev => ({ ...prev, profile_picture_preview: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const resetNewResidenceForm = () => {
    setNewResidenceForm({
      unit_number: '',
      full_name: '',
      email: '',
      phone: '',
      profile_picture: null,
      profile_picture_preview: null
    });
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      setNewResidenceForm(prev => ({ ...prev, profile_picture: file }));
      
      // Create preview
      // eslint-disable-next-line no-undef
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewResidenceForm(prev => ({ ...prev, profile_picture_preview: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateNewResidence = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('unit_number', newResidenceForm.unit_number);
      formData.append('full_name', newResidenceForm.full_name);
      formData.append('email', newResidenceForm.email);
      formData.append('phone', newResidenceForm.phone || '');
      formData.append('compound_id', user.compound_id);
      
      if (newResidenceForm.profile_picture) {
        formData.append('profile_picture', newResidenceForm.profile_picture);
      }

      const response = await axios.post(`${API}/admin/residences`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('New residence created successfully!');
      
      if (response.data.temporary_password) {
        toast.success(`Temporary password: ${response.data.temporary_password}`, { duration: 10000 });
      }
      
      setShowAddNewResidence(false);
      resetNewResidenceForm();
      await fetchResidences();
    } catch (error) {
      console.error('Failed to create new residence:', error);
      toast.error(error.response?.data?.detail || 'Failed to create new residence');
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.put(
        `${API}/compounds/${user.compound_id}/logo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setCompound(prev => ({
        ...prev,
        logo_url: response.data.logo_url
      }));

      toast.success('Logo uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
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
      <TestUpdate />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-red-600">🔴 UPDATED - Compound Management</h1>
        <p className="text-gray-600 mt-2">
          🚀 NEW FEATURES ADDED: Residence management with profile pictures and direct account creation!
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('residences')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'residences'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Residence List ({residences.length})
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('registration-links')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'registration-links'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Registration Links ({registrationLinks.length})
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('manage-users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-1 ${
                activeTab === 'manage-users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UsersIcon className="h-4 w-4 text-current" style={{minWidth: '16px', minHeight: '16px'}} />
              <span>👥 Manage Users</span>
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('add-admin')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-1 ${
                activeTab === 'add-admin'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserPlusIcon className="h-4 w-4 text-current" style={{minWidth: '16px', minHeight: '16px'}} />
              <span>👤+ Add Admin</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Compound Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start space-x-6">
              {/* Logo Section */}
              <div className="flex-shrink-0">
                <div className="relative">
                  {compound?.logo_url ? (
                    <img
                      src={compound.logo_url}
                      alt="Compound Logo"
                      className="h-24 w-24 rounded-lg object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <PhotoIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  
                  <label htmlFor="logo-upload" className="absolute inset-0 cursor-pointer">
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <div className="absolute inset-0 rounded-lg bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <PhotoIcon className="h-6 w-6 text-white" />
                    </div>
                  </label>
                  
                  {uploading && (
                    <div className="absolute inset-0 rounded-lg bg-black bg-opacity-50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Click to upload logo
                </p>
              </div>

              {/* Compound Details */}
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {compound?.name || 'Compound Name'}
                </h2>
                <p className="text-gray-600 mb-4">
                  {compound?.address || 'Compound Address'}
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Compound ID</p>
                    <p className="text-lg font-semibold text-gray-900">{compound?.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Created</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {compound?.created_at ? new Date(compound.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Management */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Admin Management</h3>
                <p className="text-gray-600">Manage compound administrators</p>
              </div>
              <button 
                onClick={() => setShowAddAdmin(true)}
                className="btn btn-primary flex items-center space-x-2"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add Admin</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Primary Admin */}
              <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <UsersIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{user?.full_name}</p>
                  <p className="text-sm text-gray-600">{user?.email}</p>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    Primary Admin
                  </span>
                </div>
              </div>

              {/* Additional Admins */}
              {compound?.additional_admins?.length > 0 ? (
                compound.additional_admins.map((adminId, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gray-400 flex items-center justify-center">
                        <UsersIcon className="h-5 w-5 text-white" />
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
                  <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No additional admins added</p>
                  <p className="text-sm text-gray-400">Add more admins to help manage the compound</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Residence List Tab */}
      {activeTab === 'residences' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Residence List</h3>
                <p className="text-gray-600">View all residential units and their occupancy</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Total Units: <span className="font-semibold">{residences.length}</span>
                </div>
                <button
                  onClick={() => setShowAddNewResidence(true)}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>New Residence</span>
                </button>
              </div>
            </div>

            {residences.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Family Head
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Members
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Move-in Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {residences.map((residence, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <HomeIcon className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                Unit {residence.unit_number}
                              </div>
                              <div className="text-sm text-gray-500">
                                Family ID: {residence.family_id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              {residence.family_head?.profile_picture_url ? (
                                <img
                                  src={residence.family_head.profile_picture_url}
                                  alt={residence.family_head.full_name}
                                  className="h-10 w-10 rounded-full object-cover border-2 border-gray-200"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {residence.family_head?.full_name?.charAt(0) || 'R'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {residence.family_head?.full_name || 'N/A'}
                              </div>
                              <div className="text-sm text-gray-500">
                                @{residence.family_head?.username || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {residence.member_count} member{residence.member_count !== 1 ? 's' : ''}
                          </div>
                          <div className="text-sm text-gray-500">
                            {residence.family_members.map(member => member.full_name).join(', ')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {residence.family_head?.email || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {residence.family_head?.phone || 'No phone'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(residence.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Occupied
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <HomeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No residences found</h3>
                <p className="text-gray-600">
                  Residences will appear here once families register in your compound.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Registration Links Tab - Admin Only */}
      {activeTab === 'registration-links' && user?.role === 'admin' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Registration Links</h3>
                <p className="text-gray-600">Create and manage registration links for new residents</p>
              </div>
              <button
                onClick={() => setShowAddResidence(true)}
                className="btn btn-primary flex items-center space-x-2"
              >
                <UserPlusIcon className="h-4 w-4 text-current" style={{minWidth: '16px', minHeight: '16px'}} />
                <span>Create New Link</span>
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
                              {link.is_used ? 'Used' : `Expires ${new Date(link.expires_at).toLocaleDateString()}`}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center space-x-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            link.is_used 
                              ? 'bg-green-100 text-green-800'
                              : new Date(link.expires_at) < new Date()
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}>
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
                              onClick={() => copyToClipboard(`${BACKEND_URL}/register?token=${link.registration_token}`)}
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
                          onClick={() => handleDeleteRegistrationLink(link.id)}
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">No registration links created</h3>
                <p className="text-gray-600 mb-4">
                  Create registration links to onboard new residents to your compound.
                </p>
                <button
                  onClick={() => setShowAddResidence(true)}
                  className="btn btn-primary inline-flex items-center space-x-2"
                >
                  <UserPlusIcon className="h-4 w-4 text-current" style={{minWidth: '16px', minHeight: '16px'}} />
                  <span>Create First Link</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manage Users Tab - Admin Only */}
      {activeTab === 'manage-users' && user?.role === 'admin' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manage Users</h3>
                <p className="text-gray-600">View and manage all users in your compound</p>
              </div>
              <div className="text-sm text-gray-600">
                Total Users: <span className="font-semibold">{allUsers.length}</span>
              </div>
            </div>

            {allUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allUsers.map((userItem) => (
                      <tr key={userItem.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              {userItem.profile_picture_url ? (
                                <img
                                  src={userItem.profile_picture_url}
                                  alt={userItem.full_name}
                                  className="h-10 w-10 rounded-full object-cover border-2 border-gray-200"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                                  <span className="text-sm font-medium text-white">
                                    {userItem.full_name?.charAt(0) || 'U'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {userItem.full_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                @{userItem.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            userItem.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {userItem.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {userItem.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {userItem.phone || 'No phone'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            userItem.is_active 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {userItem.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleToggleUserStatus(userItem.id, userItem.is_active)}
                              className={`px-3 py-1 rounded text-xs font-medium ${
                                userItem.is_active
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {userItem.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            {userItem.id !== user.id && (
                              <button
                                onClick={() => handleDeleteUser(userItem.id)}
                                className="px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-600">
                  Users will appear here once they register in your compound.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Admin Tab - Admin Only */}
      {activeTab === 'add-admin' && user?.role === 'admin' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Add New Admin</h3>
              <p className="text-gray-600">Create a new administrator account for your compound</p>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminForm.username}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, username: e.target.value }))}
                    className="form-input w-full"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminForm.full_name}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="form-input w-full"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={adminForm.email}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, email: e.target.value }))}
                    className="form-input w-full"
                    placeholder="admin@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={adminForm.password}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                    className="form-input w-full"
                    placeholder="Enter password"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={adminForm.phone}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="form-input w-full"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Picture
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        if (!file.type.startsWith('image/')) {
                          toast.error('Please select an image file');
                          return;
                        }
                        
                        setAdminForm(prev => ({ ...prev, profile_picture: file }));
                        
                        // Create preview
                        // eslint-disable-next-line no-undef
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          setAdminForm(prev => ({ ...prev, profile_picture_preview: e.target.result }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="form-input w-full"
                  />
                  {adminForm.profile_picture_preview && (
                    <div className="mt-2">
                      <img
                        src={adminForm.profile_picture_preview}
                        alt="Profile preview"
                        className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <UserPlusIcon className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-purple-800">
                      Admin Account Creation
                    </h4>
                    <p className="text-sm text-purple-700 mt-1">
                      This will create a new administrator account with full access to compound management features. The admin will be able to log in immediately with the provided credentials.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={resetAdminForm}
                  className="btn btn-secondary"
                >
                  Reset Form
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <UserPlusIcon className="h-4 w-4 text-current" style={{minWidth: '16px', minHeight: '16px'}} />
                  <span>Create Admin Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Compound Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Compound Name *
              </label>
              <input
                type="text"
                value={editableCompound.name}
                onChange={(e) => setEditableCompound(prev => ({ ...prev, name: e.target.value }))}
                className="form-input w-full"
                placeholder="Enter compound name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <input
                type="text"
                value={editableCompound.address}
                onChange={(e) => setEditableCompound(prev => ({ ...prev, address: e.target.value }))}
                className="form-input w-full"
                placeholder="Enter compound address"
                required
              />
            </div>
          </div>

          <div className="mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={editableCompound.description || ''}
                onChange={(e) => setEditableCompound(prev => ({ ...prev, description: e.target.value }))}
                className="form-input w-full"
                rows="3"
                placeholder="Enter compound description (optional)"
              />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-end space-x-4">
              <button 
                onClick={handleCancelCompoundSettings}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveCompoundSettings}
                className="btn btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Residence Registration Link Modal */}
      {showAddResidence && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowAddResidence(false)}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateRegistrationLink} className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="modal-title">
                      Create Registration Link
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unit Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={residenceForm.unit_number}
                          onChange={(e) => setResidenceForm(prev => ({ ...prev, unit_number: e.target.value }))}
                          className="form-input w-full"
                          placeholder="e.g., A-101, B-205"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={residenceForm.full_name}
                          onChange={(e) => setResidenceForm(prev => ({ ...prev, full_name: e.target.value }))}
                          className="form-input w-full"
                          placeholder="Enter resident's full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={residenceForm.email}
                          onChange={(e) => setResidenceForm(prev => ({ ...prev, email: e.target.value }))}
                          className="form-input w-full"
                          placeholder="resident@email.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={residenceForm.phone}
                          onChange={(e) => setResidenceForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="form-input w-full"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Link Expires In (Hours)
                        </label>
                        <select
                          value={residenceForm.expires_in_hours}
                          onChange={(e) => setResidenceForm(prev => ({ ...prev, expires_in_hours: parseInt(e.target.value) }))}
                          className="form-input w-full"
                        >
                          <option value={24}>24 hours</option>
                          <option value={48}>48 hours</option>
                          <option value={72}>72 hours (3 days)</option>
                          <option value={168}>168 hours (1 week)</option>
                          <option value={336}>336 hours (2 weeks)</option>
                        </select>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <LinkIcon className="h-5 w-5 text-blue-400" />
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm font-medium text-blue-800">
                              Registration Process
                            </h4>
                            <p className="text-sm text-blue-700 mt-1">
                              The resident will receive a registration link to create their account and upload their profile picture during the registration process.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-4">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Create Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddResidence(false)}
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

      {/* Compound Selection Modal */}
      {showCompoundSelection && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="compound-selection-title" role="dialog" aria-modal="true">
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
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="compound-selection-title">
                      Select Your Compound
                    </h3>
                    
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-4">
                        {compoundNotFound 
                          ? "Your assigned compound was not found. Please select from the available compounds below:"
                          : "Please select a compound to manage:"
                        }
                      </p>
                      
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {availableCompounds.length > 0 ? (
                          availableCompounds.map((compound) => (
                            <div
                              key={compound.id}
                              onClick={() => handleCompoundSelection(compound.id)}
                              className="cursor-pointer p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                            >
                              <div className="flex items-center space-x-4">
                                <div className="flex-shrink-0">
                                  {compound.logo_url ? (
                                    <img
                                      src={compound.logo_url}
                                      alt="Compound Logo"
                                      className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                                    />
                                  ) : (
                                    <div className="h-12 w-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                      <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-lg font-medium text-gray-900">{compound.name}</h4>
                                  <p className="text-sm text-gray-600">{compound.address}</p>
                                  <div className="flex items-center mt-1 text-xs text-gray-500">
                                    <span>ID: {compound.id.slice(0, 8)}...</span>
                                    <span className="mx-2">•</span>
                                    <span>Created: {new Date(compound.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <div className="flex-shrink-0">
                                  <button className="btn btn-primary btn-sm">
                                    Select
                                  </button>
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
                    onClick={() => setShowCompoundSelection(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add New Residence Modal */}
      {showAddNewResidence && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="new-residence-modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowAddNewResidence(false)}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateNewResidence} className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="new-residence-modal-title">
                      Add New Residence
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Unit Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={newResidenceForm.unit_number}
                          onChange={(e) => setNewResidenceForm(prev => ({ ...prev, unit_number: e.target.value }))}
                          className="form-input w-full"
                          placeholder="e.g., A-101, B-205"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Resident Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={newResidenceForm.full_name}
                          onChange={(e) => setNewResidenceForm(prev => ({ ...prev, full_name: e.target.value }))}
                          className="form-input w-full"
                          placeholder="Enter resident's full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={newResidenceForm.email}
                          onChange={(e) => setNewResidenceForm(prev => ({ ...prev, email: e.target.value }))}
                          className="form-input w-full"
                          placeholder="resident@email.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={newResidenceForm.phone}
                          onChange={(e) => setNewResidenceForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="form-input w-full"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

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
                        {newResidenceForm.profile_picture_preview && (
                          <div className="mt-2">
                            <img
                              src={newResidenceForm.profile_picture_preview}
                              alt="Profile preview"
                              className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                            />
                          </div>
                        )}
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <HomeIcon className="h-5 w-5 text-green-400" />
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm font-medium text-green-800">
                              Direct Residence Creation
                            </h4>
                            <p className="text-sm text-green-700 mt-1">
                              This will create a new residence and the resident account immediately. The resident will be able to log in with their email and a temporary password will be generated.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-4">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Create Residence
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddNewResidence(false)}
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

      {/* Add Admin Modal */}
      {showAddAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="add-admin-modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowAddAdmin(false)}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreateAdmin} className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4" id="add-admin-modal-title">
                      Create New Admin Account
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Username *
                        </label>
                        <input
                          type="text"
                          required
                          value={adminForm.username}
                          onChange={(e) => setAdminForm(prev => ({ ...prev, username: e.target.value }))}
                          className="form-input w-full"
                          placeholder="Enter username"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={adminForm.full_name}
                          onChange={(e) => setAdminForm(prev => ({ ...prev, full_name: e.target.value }))}
                          className="form-input w-full"
                          placeholder="Enter full name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={adminForm.email}
                          onChange={(e) => setAdminForm(prev => ({ ...prev, email: e.target.value }))}
                          className="form-input w-full"
                          placeholder="admin@email.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Password *
                        </label>
                        <input
                          type="password"
                          required
                          value={adminForm.password}
                          onChange={(e) => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                          className="form-input w-full"
                          placeholder="Enter password"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={adminForm.phone}
                          onChange={(e) => setAdminForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="form-input w-full"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Profile Picture
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAdminProfilePictureChange}
                          className="form-input w-full"
                        />
                        {adminForm.profile_picture_preview && (
                          <div className="mt-2">
                            <img
                              src={adminForm.profile_picture_preview}
                              alt="Profile preview"
                              className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                            />
                          </div>
                        )}
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <UserPlusIcon className="h-5 w-5 text-blue-400" />
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm font-medium text-blue-800">
                              Admin Account Creation
                            </h4>
                            <p className="text-sm text-blue-700 mt-1">
                              This will create a new administrator account with full management privileges for your compound.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-4">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Create Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddAdmin(false)}
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

export default CompoundManagement;