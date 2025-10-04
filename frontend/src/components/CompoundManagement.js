import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import DateInput from './DateInput';
import { formatDate, formatRelativeTime } from '../utils/dateUtils';
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
  DocumentDuplicateIcon,
  PencilIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CalendarIcon,
  IdentificationIcon,
  ExclamationTriangleIcon,
  // New modern icons for redesign
  CameraIcon,
  BuildingLibraryIcon,
  UserGroupIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  CogIcon,
  SparklesIcon,
  GlobeAltIcon,
  ChevronRightIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CompoundManagement = () => {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation();
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
  const [expandedUnits, setExpandedUnits] = useState(new Set());
  const [unitFamilyMembers, setUnitFamilyMembers] = useState({});
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'unit_number'
  const [showEditUnit, setShowEditUnit] = useState(false);
  const [showEditMember, setShowEditMember] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // {type: 'unit'|'member', id: string, name: string}
  
  // Edit forms state
  const [editUnitForm, setEditUnitForm] = useState({
    unit_number: '',
    full_name: '',
    email: '',
    phone: '',
    profile_picture: null,
    profile_picture_preview: null
  });
  
  const [editMemberForm, setEditMemberForm] = useState({
    full_name: '',
    relationship: '',
    age: '',
    email: '',
    phone: '',
    date_of_birth: '',
    id_number: '',
    profile_picture: null,
    profile_picture_preview: null
  });
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

  // Comprehensive Family Creation State
  const [showComprehensiveFamilyModal, setShowComprehensiveFamilyModal] = useState(false);
  const [familyCreationStep, setFamilyCreationStep] = useState(1); // 1: Basic Info, 2: Family Head, 3: Family Members, 4: Review
  const [comprehensiveFamilyForm, setComprehensiveFamilyForm] = useState({
    // Basic residence info
    unit_number: '',
    
    // Family head info
    head_full_name: '',
    head_email: '',
    head_phone: '',
    head_date_of_birth: '',
    head_id_number: '',
    head_profile_picture: null,
    head_profile_picture_preview: null,
    
    // Family members
    family_members: []
  });

  const [newFamilyMember, setNewFamilyMember] = useState({
    full_name: '',
    relationship: '',
    age: '',
    phone: '',
    email: '',
    id_number: '',
    date_of_birth: '',
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
      address: compound?.address || '',
      description: compound?.description || '',
      logo_url: compound?.logo_url || ''
    });
    setLogoFile(null);
    setLogoPreview(compound?.logo_url || null);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      setLogoFile(file);
      
      // Create preview
      // eslint-disable-next-line no-undef
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) {
      toast.error('Please select a logo file first');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('logo', logoFile);

      const response = await axios.put(`${API}/compounds/${user.compound_id}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setEditableCompound(prev => ({ ...prev, logo_url: response.data.logo_url }));
      setCompound(prev => ({ ...prev, logo_url: response.data.logo_url }));
      toast.success('Logo uploaded successfully!');
      setLogoFile(null);
    } catch (error) {
      console.error('Failed to upload logo:', error);
      toast.error('Failed to upload logo');
    }
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

  const fetchFamilyMembersForUnit = async (unitId) => {
    try {
      const response = await axios.get(`${API}/family-members`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Filter family members for this specific unit
      const allMembers = response.data.family_members || response.data || [];
      const unitMembers = allMembers.filter(member => 
        member.primary_resident_id === unitId || member.unit_id === unitId
      );
      
      setUnitFamilyMembers(prev => ({
        ...prev,
        [unitId]: unitMembers
      }));
      
      return unitMembers;
    } catch (error) {
      console.error('Error fetching family members for unit:', error);
      return [];
    }
  };

  const toggleUnitExpansion = async (unitId) => {
    const newExpanded = new Set(expandedUnits);
    
    if (expandedUnits.has(unitId)) {
      newExpanded.delete(unitId);
    } else {
      newExpanded.add(unitId);
      // Fetch family members if not already loaded
      if (!unitFamilyMembers[unitId]) {
        await fetchFamilyMembersForUnit(unitId);
      }
    }
    
    setExpandedUnits(newExpanded);
  };

  const getSortedResidences = () => {
    if (!residences || residences.length === 0) return [];
    
    const sorted = [...residences].sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          // Sort by created date, newest first
          return new Date(b.created_at || b.family_head?.created_at || '1970-01-01') - 
                 new Date(a.created_at || a.family_head?.created_at || '1970-01-01');
        case 'oldest':
          // Sort by created date, oldest first
          return new Date(a.created_at || a.family_head?.created_at || '1970-01-01') - 
                 new Date(b.created_at || b.family_head?.created_at || '1970-01-01');
        case 'unit_number':
          // Sort by unit number alphabetically
          return (a.unit_number || '').localeCompare(b.unit_number || '');
        case 'name_asc':
          // Sort by family head name A-Z
          return (a.family_head?.full_name || '').localeCompare(b.family_head?.full_name || '');
        case 'name_desc':
          // Sort by family head name Z-A
          return (b.family_head?.full_name || '').localeCompare(a.family_head?.full_name || '');
        case 'family_size':
          // Sort by family size (family head + members)
          const aSize = 1 + (unitFamilyMembers[a.family_head?.id || a.id]?.length || 0);
          const bSize = 1 + (unitFamilyMembers[b.family_head?.id || b.id]?.length || 0);
          return bSize - aSize; // Larger families first
        default:
          return 0;
      }
    });
    
    return sorted;
  };

  const handleEditUnit = (unit) => {
    setEditingUnit(unit);
    setEditUnitForm({
      unit_number: unit.unit_number || '',
      full_name: unit.family_head?.full_name || '',
      email: unit.family_head?.email || '',
      phone: unit.family_head?.phone || '',
      profile_picture: null,
      profile_picture_preview: unit.family_head?.profile_picture_url ? `${BACKEND_URL}${unit.family_head.profile_picture_url}` : null
    });
    setShowEditUnit(true);
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setEditMemberForm({
      full_name: member.full_name || '',
      relationship: member.relationship || '',
      age: member.age || '',
      email: member.email || '',
      phone: member.phone || '',
      date_of_birth: member.birthday || member.date_of_birth || '',
      id_number: member.id_number || '',
      profile_picture: null,
      profile_picture_preview: member.profile_picture_url ? `${BACKEND_URL}${member.profile_picture_url}` : null
    });
    setShowEditMember(true);
  };

  const handleDeleteClick = (type, item) => {
    setDeleteTarget({
      type,
      id: type === 'unit' ? item.family_head?.id || item.id : item.id,
      name: type === 'unit' ? `Unit ${item.unit_number}` : item.full_name,
      unitNumber: type === 'unit' ? item.unit_number : undefined
    });
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    
    try {
      let endpoint = '';
      let successMessage = '';
      
      if (deleteTarget.type === 'unit') {
        // Delete the family head user (which represents the unit)
        endpoint = `/admin/residences/${deleteTarget.id}`;
        successMessage = `Unit ${deleteTarget.unitNumber} deleted successfully`;
      } else {
        // Delete family member
        endpoint = `/family-members/${deleteTarget.id}`;
        successMessage = `Family member ${deleteTarget.name} deleted successfully`;
      }
      
      await axios.delete(`${API}${endpoint}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      toast.success(successMessage);
      
      // Refresh data
      if (deleteTarget.type === 'unit') {
        await fetchResidences();
      } else {
        // Refresh family members for the affected unit
        const affectedUnitId = Object.keys(unitFamilyMembers).find(unitId =>
          unitFamilyMembers[unitId].some(member => member.id === deleteTarget.id)
        );
        if (affectedUnitId) {
          await fetchFamilyMembersForUnit(affectedUnitId);
        }
      }
      
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error(error.response?.data?.detail || `Failed to delete ${deleteTarget.type}`);
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

  const resetComprehensiveFamilyForm = () => {
    setComprehensiveFamilyForm({
      unit_number: '',
      head_full_name: '',
      head_email: '',
      head_phone: '',
      head_date_of_birth: '',
      head_id_number: '',
      head_profile_picture: null,
      head_profile_picture_preview: null,
      family_members: []
    });
    setNewFamilyMember({
      full_name: '',
      relationship: '',
      age: '',
      phone: '',
      email: '',
      id_number: '',
      date_of_birth: '',
      profile_picture: null,
      profile_picture_preview: null
    });
    setFamilyCreationStep(1);
  };

  const handleFamilyHeadProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      setComprehensiveFamilyForm(prev => ({ ...prev, head_profile_picture: file }));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setComprehensiveFamilyForm(prev => ({ ...prev, head_profile_picture_preview: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFamilyMemberProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      setNewFamilyMember(prev => ({ ...prev, profile_picture: file }));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewFamilyMember(prev => ({ ...prev, profile_picture_preview: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditUnitProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      setEditUnitForm(prev => ({ ...prev, profile_picture: file }));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditUnitForm(prev => ({ ...prev, profile_picture_preview: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditMemberProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      setEditMemberForm(prev => ({ ...prev, profile_picture: file }));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditMemberForm(prev => ({ ...prev, profile_picture_preview: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateUnit = async (e) => {
    e.preventDefault();
    if (!editingUnit) return;

    try {
      const formData = new FormData();
      formData.append('full_name', editUnitForm.full_name);
      formData.append('phone', editUnitForm.phone || '');
      
      if (editUnitForm.profile_picture) {
        formData.append('profile_picture', editUnitForm.profile_picture);
      }

      // Update user profile
      await axios.put(`${API}/users/${editingUnit.family_head.id}/profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });

      // Note: Unit number and email updates would need additional backend endpoints
      // For now, we'll focus on the fields that can be updated

      toast.success('Unit updated successfully!');
      setShowEditUnit(false);
      setEditingUnit(null);
      await fetchResidences();
    } catch (error) {
      console.error('Failed to update unit:', error);
      toast.error(error.response?.data?.detail || 'Failed to update unit');
    }
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      const formData = new FormData();
      formData.append('full_name', editMemberForm.full_name);
      formData.append('relationship', editMemberForm.relationship);
      if (editMemberForm.age) formData.append('age', editMemberForm.age);
      if (editMemberForm.email) formData.append('email', editMemberForm.email);
      if (editMemberForm.phone) formData.append('phone', editMemberForm.phone);
      if (editMemberForm.date_of_birth) formData.append('date_of_birth', editMemberForm.date_of_birth);
      if (editMemberForm.id_number) formData.append('id_number', editMemberForm.id_number);
      
      if (editMemberForm.profile_picture) {
        formData.append('profile_picture', editMemberForm.profile_picture);
      }

      await axios.put(`${API}/family-members/${editingMember.id}/profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });

      toast.success('Family member updated successfully!');
      setShowEditMember(false);
      setEditingMember(null);
      
      // Refresh family members for the affected unit
      const affectedUnitId = Object.keys(unitFamilyMembers).find(unitId =>
        unitFamilyMembers[unitId].some(member => member.id === editingMember.id)
      );
      if (affectedUnitId) {
        await fetchFamilyMembersForUnit(affectedUnitId);
      }
    } catch (error) {
      console.error('Failed to update family member:', error);
      toast.error(error.response?.data?.detail || 'Failed to update family member');
    }
  };

  const addFamilyMember = () => {
    if (!newFamilyMember.full_name || !newFamilyMember.relationship) {
      toast.error('Please fill in required fields (Name and Relationship)');
      return;
    }

    setComprehensiveFamilyForm(prev => ({
      ...prev,
      family_members: [...prev.family_members, { ...newFamilyMember, id: Date.now() }]
    }));

    setNewFamilyMember({
      full_name: '',
      relationship: '',
      age: '',
      phone: '',
      email: '',
      id_number: '',
      date_of_birth: '',
      profile_picture: null,
      profile_picture_preview: null
    });
  };

  const removeFamilyMember = (memberId) => {
    setComprehensiveFamilyForm(prev => ({
      ...prev,
      family_members: prev.family_members.filter(member => member.id !== memberId)
    }));
  };

  const handleCreateComprehensiveFamily = async () => {
    try {
      // First create the residence and family head
      const formData = new FormData();
      formData.append('unit_number', comprehensiveFamilyForm.unit_number);
      formData.append('full_name', comprehensiveFamilyForm.head_full_name);
      formData.append('email', comprehensiveFamilyForm.head_email);
      formData.append('phone', comprehensiveFamilyForm.head_phone || '');
      formData.append('compound_id', user.compound_id);
      formData.append('date_of_birth', comprehensiveFamilyForm.head_date_of_birth);
      formData.append('id_number', comprehensiveFamilyForm.head_id_number || '');
      
      if (comprehensiveFamilyForm.head_profile_picture) {
        formData.append('profile_picture', comprehensiveFamilyForm.head_profile_picture);
      }

      const residenceResponse = await axios.post(`${API}/admin/residences`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Residence and family head created successfully!');
      
      if (residenceResponse.data.temporary_password) {
        toast.success(`Family Head Login - Username: ${residenceResponse.data.username}, Password: ${residenceResponse.data.temporary_password}`, { duration: 15000 });
      }

      // Now add family members if any
      if (comprehensiveFamilyForm.family_members.length > 0) {
        const familyHeadId = residenceResponse.data.user_id;
        
        for (const member of comprehensiveFamilyForm.family_members) {
          const memberFormData = new FormData();
          memberFormData.append('full_name', member.full_name);
          memberFormData.append('relationship', member.relationship);
          memberFormData.append('age', member.age || '');
          memberFormData.append('phone', member.phone || '');
          memberFormData.append('email', member.email || '');
          memberFormData.append('id_number', member.id_number || '');
          memberFormData.append('date_of_birth', member.date_of_birth || '');
          
          if (member.profile_picture) {
            memberFormData.append('profile_picture', member.profile_picture);
          }

          await axios.post(`${API}/family-members`, memberFormData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
          });
        }
        
        toast.success(`Added ${comprehensiveFamilyForm.family_members.length} family members successfully!`);
      }

      setShowComprehensiveFamilyModal(false);
      resetComprehensiveFamilyForm();
      await fetchResidences();
    } catch (error) {
      console.error('Failed to create comprehensive family:', error);
      toast.error(error.response?.data?.detail || 'Failed to create residence and family');
    }
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
        <h1 className="text-3xl font-bold text-red-600 text-center">🔴 {t('updated_compound_management')}</h1>
        <p className="text-gray-600 mt-2">
          🚀 {t('new_features_added')}
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
            {t('overview')}
          </button>
          <button
            onClick={() => setActiveTab('residences')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'residences'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('residence_list')} ({residences.length})
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
              {t('registration_links')} ({registrationLinks.length})
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              id="manage-users-tab-v2"
              onClick={() => setActiveTab('manage-users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manage-users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👤 {t('manage_users')}
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              id="add-admin-tab-v2"
              onClick={() => setActiveTab('add-admin')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'add-admin'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🛡️ {t('add_admin')}
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
            {t('settings')}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Compound Info Card */}
          <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-2xl shadow-lg border border-blue-100 p-6">
            <div className="flex items-start space-x-6">
              {/* Logo Section */}
              <div className="flex-shrink-0">
                <div className="relative">
                  {compound?.logo_url ? (
                    <img
                      src={compound.logo_url}
                      alt="شعار المجمع"
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
                      onChange={handleLogoUpload}
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
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {t('click_to_upload_logo')}
                </p>
              </div>

              {/* Compound Details */}
              <div className="flex-1">
                <h2 className="text-2xl font-semibold text-center text-gray-900 mb-2">
                  {compound?.name || 'Compound Name'}
                </h2>
                <p className="text-gray-600 mb-4">
                  {compound?.address || 'Compound Address'}
                </p>
                
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
                onClick={() => setShowAddAdmin(true)}
                className="btn btn-primary flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                <ShieldCheckIcon className="h-4 w-4" />
                <span>🛡️ {t('add_new_admin')}</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Primary Admin */}
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

              {/* Additional Admins */}
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
                onClick={() => setShowComprehensiveFamilyModal(true)}
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
        </div>
      )}

      {/* Residence List Tab */}
      {activeTab === 'residences' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-center text-gray-900 text-center">قائمة المساكن</h3>
                <p className="text-gray-600">عرض جميع الوحدات السكنية ومعدل الإشغال</p>
              </div>
              <div className="text-right">
                <button
                  onClick={() => setShowComprehensiveFamilyModal(true)}
                  className="btn btn-primary flex items-center space-x-2 mb-2"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Add Resident + Family</span>
                </button>
                <p className="text-xs text-gray-500 max-w-xs">
                  Create new resident account with complete family management setup
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  Total Units: <span className="font-semibold text-center">{residences.length}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Sort by:</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="form-input text-sm"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="unit_number">Unit Number</option>
                    <option value="name_asc">Name A-Z</option>
                    <option value="name_desc">Name Z-A</option>
                    <option value="family_size">Family Size</option>
                  </select>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Use "Add Resident + Family" to set up complete family profiles with photos
              </div>
            </div>

            {residences.length > 0 ? (
              <div className="space-y-4">
                {getSortedResidences().map((residence) => (
                  <div key={residence.id || residence.family_head?.id} className="bg-white border border-gray-200 rounded-lg shadow-sm">
                    {/* Unit Header */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* Unit Head Photo */}
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
                          
                          {/* Unit Info */}
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-lg font-semibold text-center text-gray-900 text-center">
                                Unit {residence.unit_number}
                              </h3>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            </div>
                            <p className="text-gray-600 font-medium">{residence.family_head?.full_name}</p>
                            <p className="text-sm text-gray-500">{residence.family_head?.email}</p>
                            {residence.family_head?.phone && (
                              <p className="text-sm text-gray-500">{residence.family_head?.phone}</p>
                            )}
                            {residence.family_head?.created_at && (
                              <p className="text-xs text-gray-400">
                                Joined: {formatDate(residence.family_head.created_at)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditUnit(residence)}
                            className="btn btn-secondary btn-sm flex items-center space-x-1"
                          >
                            <PencilIcon className="h-4 w-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteClick('unit', residence)}
                            className="btn btn-danger btn-sm flex items-center space-x-1"
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span>Delete</span>
                          </button>
                          <button
                            onClick={() => toggleUnitExpansion(residence.family_head?.id || residence.id)}
                            className="btn btn-outline btn-sm flex items-center space-x-1"
                          >
                            {expandedUnits.has(residence.family_head?.id || residence.id) ? (
                              <>
                                <ChevronUpIcon className="h-4 w-4" />
                                <span>Hide Family</span>
                              </>
                            ) : (
                              <>
                                <ChevronDownIcon className="h-4 w-4" />
                                <span>View Family</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Family Members */}
                    {expandedUnits.has(residence.family_head?.id || residence.id) && (
                      <div className="p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-medium text-gray-900">Family Members</h4>
                          <Link
                            to="/add-family-member"
                            className="btn btn-primary btn-sm flex items-center space-x-1"
                          >
                            <UserPlusIcon className="h-4 w-4" />
                            <span>Add Member</span>
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
                                    <button
                                      onClick={() => handleEditMember(member)}
                                      className="text-blue-600 hover:text-blue-800 p-1"
                                      title="Edit member"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClick('member', member)}
                                      className="text-red-600 hover:text-red-800 p-1"
                                      title="Delete member"
                                    >
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
                            <p className="text-gray-500 text-sm">لم يتم إضافة أفراد الأسرة بعد</p>
                            <Link
                              to="/add-family-member"
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
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
                <h3 className="text-lg font-medium text-center text-center text-gray-900 mb-2">لا توجد مساكن</h3>
                <p className="text-gray-600">
                  ستظهر المساكن هنا بمجرد تسجيل العائلات في مجمعك.
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
                <h3 className="text-lg font-semibold text-center text-gray-900 text-center">روابط التسجيل</h3>
                <p className="text-gray-600">إنشاء وإدارة روابط التسجيل للمقيمين الجدد</p>
              </div>
              <button
                onClick={() => setShowAddResidence(true)}
                className="btn btn-primary flex items-center space-x-2"
              >
                <UserPlusIcon className="h-4 w-4 text-current" style={{minWidth: '16px', minHeight: '16px'}} />
                <span>إنشاء رابط جديد</span>
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
                <h3 className="text-lg font-medium text-center text-center text-gray-900 mb-2">لم يتم إنشاء روابط تسجيل</h3>
                <p className="text-gray-600 mb-4">
                  إنشاء روابط تسجيل لإدخال مقيمين جدد إلى مجمعك.
                </p>
                <button
                  onClick={() => setShowAddResidence(true)}
                  className="btn btn-primary inline-flex items-center space-x-2"
                >
                  <UserPlusIcon className="h-4 w-4 text-current" style={{minWidth: '16px', minHeight: '16px'}} />
                  <span>إنشاء أول رابط</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manage Users Tab - Admin Only */}
      {activeTab === 'manage-users' && user?.role === 'admin' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-white via-purple-50 to-indigo-50 rounded-2xl shadow-lg border border-purple-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-center text-gray-900 text-center">👤 إدارة المستخدمين</h3>
                <p className="text-gray-600">عرض وإدارة جميع المستخدمين في مجمعك</p>
              </div>
              <div className="text-sm text-gray-600">
                Total Users: <span className="font-semibold text-center">{allUsers.length}</span>
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
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-100 to-indigo-200 flex items-center justify-center mx-auto mb-4">
                  <UserGroupIcon className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium text-center text-center text-gray-900 mb-2">No users found</h3>
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
              <h3 className="text-lg font-semibold text-center text-gray-900 text-center">🛡️ {t('add_new_admin')}</h3>
              <p className="text-gray-600">{t('create_admin_account_for_compound')}</p>
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
                    الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminForm.full_name}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="form-input w-full"
                    placeholder={t('enter_full_name')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('email_address')} *
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
                    {t('phone_number')}
                  </label>
                  <input
                    type="tel"
                    value={adminForm.phone}
                    onChange={(e) => setAdminForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="form-input w-full"
                    placeholder="+966 123 456 789"
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
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-6">المعلومات الأساسية</h3>
            
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
                  {t('cancel')}
                </button>
                <button 
                  onClick={handleSaveCompoundSettings}
                  className="btn btn-primary"
                >
                  حفظ التغييرات
                </button>
              </div>
            </div>
          </div>

          {/* Logo Management */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-6">{t('compound_logo')}</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Logo Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Logo
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {logoPreview ? (
                    <div className="space-y-4">
                      <img
                        src={logoPreview}
                        alt="شعار المجمع"
                        className="mx-auto h-32 w-32 object-contain rounded-lg border border-gray-200"
                      />
                      <p className="text-sm text-gray-600">شعار المجمع الحالي</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <PhotoIcon className="mx-auto h-16 w-16 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">No logo uploaded</p>
                        <p className="text-sm text-gray-500">Upload a logo to brand your compound</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload New Logo
                </label>
                <div className="space-y-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="form-input w-full"
                  />
                  
                  {logoFile && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <PhotoIcon className="h-5 w-5 text-blue-400 mr-2" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-800">
                            {logoFile.name}
                          </p>
                          <p className="text-xs text-blue-600">
                            {(logoFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      onClick={handleUploadLogo}
                      disabled={!logoFile}
                      className={`btn flex items-center space-x-2 flex-1 ${
                        logoFile 
                          ? 'btn-primary' 
                          : 'btn-secondary opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <PhotoIcon className="h-4 w-4" />
                      <span>{t('upload_logo')}</span>
                    </button>
                    
                    {logoFile && (
                      <button
                        onClick={() => {
                          setLogoFile(null);
                          setLogoPreview(editableCompound.logo_url || null);
                        }}
                        className="btn btn-secondary"
                      >
                        {t('cancel')}
                      </button>
                    )}
                  </div>

                  <div className="text-xs text-gray-500">
                    <p>• Recommended size: 200x200px or larger</p>
                    <p>• Supported formats: JPG, PNG, GIF</p>
                    <p>• Maximum file size: 5MB</p>
                  </div>
                </div>
              </div>
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
                    <h3 className="text-lg leading-6 font-medium text-gray-900 text-center mb-4" id="modal-title">
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
                          {t('email_address')} *
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
                          {t('phone_number')}
                        </label>
                        <input
                          type="tel"
                          value={residenceForm.phone}
                          onChange={(e) => setResidenceForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="form-input w-full"
                          placeholder="+966 123 456 789"
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
                    إنشاء رابط
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddResidence(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {t('cancel')}
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
                    <h3 className="text-lg leading-6 font-medium text-gray-900 text-center mb-4" id="compound-selection-title">
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
                                      alt="شعار المجمع"
                                      className="h-12 w-12 rounded-lg object-cover border border-gray-200"
                                    />
                                  ) : (
                                    <div className="h-12 w-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                                      <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-lg font-medium text-center text-center text-gray-900">{compound.name}</h4>
                                  <p className="text-sm text-gray-600">{compound.address}</p>
                                  <div className="flex items-center mt-1 text-xs text-gray-500">
                                    <span>ID: {compound.id.slice(0, 8)}...</span>
                                    <span className="mx-2">•</span>
                                    <span>Created: {formatDate(compound.created_at)}</span>
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
                    {t('cancel')}
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
                    <h3 className="text-lg leading-6 font-medium text-gray-900 text-center mb-4" id="new-residence-modal-title">
                      إضافة إقامة جديدة
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
                          {t('email_address')} *
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
                          {t('phone_number')}
                        </label>
                        <input
                          type="tel"
                          value={newResidenceForm.phone}
                          onChange={(e) => setNewResidenceForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="form-input w-full"
                          placeholder="+966 123 456 789"
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
                              إنشاء إقامة مباشر
                            </h4>
                            <p className="text-sm text-green-700 mt-1">
                              سيتم إنشاء إقامة جديدة وحساب المقيم فوراً. سيتمكن المقيم من تسجيل الدخول بإيميله وسيتم إنتاج كلمة مرور مؤقتة.
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
                    إنشاء إقامة
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddNewResidence(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {t('cancel')}
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
                    <h3 className="text-lg leading-6 font-medium text-gray-900 text-center mb-4" id="add-admin-modal-title">
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
                          placeholder={t('enter_full_name')}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('email_address')} *
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
                          {t('phone_number')}
                        </label>
                        <input
                          type="tel"
                          value={adminForm.phone}
                          onChange={(e) => setAdminForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="form-input w-full"
                          placeholder="+966 123 456 789"
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
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Family Creation Modal */}
      {showComprehensiveFamilyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="comprehensive-family-modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowComprehensiveFamilyModal(false)}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full max-h-screen overflow-y-auto">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                {/* Enhanced Modern Header */}
                <div className="flex items-center justify-between mb-8 p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl -m-6 mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                      <UserGroupIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold" id="comprehensive-family-modal-title">
                        {t('add_new_resident_family')}
                      </h3>
                      <p className="text-blue-100 text-sm mt-1">
                        {t('complete_family_setup')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowComprehensiveFamilyModal(false)}
                    className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-2 transition-colors"
                  >
                    <span className="sr-only">Close</span>
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Enhanced Modern Progress Steps */}
                <div className="mb-8">
                  <div className="flex items-center justify-between">
                    {[
                      { step: 1, label: 'معلومات الوحدة', icon: BuildingOfficeIcon },
                      { step: 2, label: 'رب الأسرة', icon: AcademicCapIcon },
                      { step: 3, label: 'أفراد الأسرة', icon: UserGroupIcon },
                      { step: 4, label: 'مراجعة', icon: CheckCircleIcon }
                    ].map(({ step, label, icon: Icon }) => (
                      <div key={step} className="flex items-center">
                        <div className={`relative flex items-center justify-center w-10 h-10 rounded-full ${
                          familyCreationStep >= step 
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg' 
                            : 'bg-gray-100 border-2 border-gray-300 text-gray-400'
                        } transition-all duration-300`}>
                          <Icon className="h-5 w-5" />
                          {familyCreationStep > step && (
                            <div className="absolute inset-0 bg-green-500 rounded-full flex items-center justify-center">
                              <CheckCircleIcon className="h-5 w-5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className={`ml-3 ${familyCreationStep === step ? 'text-blue-600' : 'text-gray-500'}`}>
                          <div className="text-sm font-medium">{label}</div>
                          <div className="text-xs text-gray-400">الخطوة {step}</div>
                        </div>
                        {step < 4 && (
                          <div className={`ml-6 w-16 h-1 rounded-full ${
                            familyCreationStep > step ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gray-200'
                          } transition-all duration-300`}></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Step Content */}
                <div className="min-h-96">
                  {/* Enhanced Step 1: Unit Information */}
                  {familyCreationStep === 1 && (
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
                              <span>رقم الوحدة *</span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                required
                                value={comprehensiveFamilyForm.unit_number}
                                onChange={(e) => setComprehensiveFamilyForm(prev => ({ ...prev, unit_number: e.target.value }))}
                                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-4 pr-4 py-3 text-lg"
                                placeholder="مثال: أ-101، فيلا-205"
                              />
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <IdentificationIcon className="h-5 w-5 text-gray-400" />
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 flex items-center space-x-1">
                              <SparklesIcon className="h-3 w-3" />
                              <span>أدخل معرف رقم الوحدة الفريد</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Enhanced Step 2: Family Head Information */}
                  {familyCreationStep === 2 && (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-2xl p-6">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                            <AcademicCapIcon className="h-4 w-4 text-white" />
                          </div>
                          <h4 className="font-semibold text-green-900">الخطوة 2: تفاصيل رب الأسرة</h4>
                        </div>
                        <p className="text-sm text-green-700">أدخل المعلومات الكاملة للمقيم الأساسي</p>
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
                              value={comprehensiveFamilyForm.head_full_name}
                              onChange={(e) => setComprehensiveFamilyForm(prev => ({ ...prev, head_full_name: e.target.value }))}
                              className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-4 py-3"
                              placeholder={t('enter_full_name')}
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
                              value={comprehensiveFamilyForm.head_email}
                              onChange={(e) => setComprehensiveFamilyForm(prev => ({ ...prev, head_email: e.target.value }))}
                              className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-4 py-3"
                              placeholder="resident@email.com"
                            />
                          </div>

                          <div>
                            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                              <PhoneIcon className="h-4 w-4 text-green-500" />
                              <span>رقم الهاتف</span>
                            </label>
                            <input
                              type="tel"
                              value={comprehensiveFamilyForm.head_phone}
                              onChange={(e) => setComprehensiveFamilyForm(prev => ({ ...prev, head_phone: e.target.value }))}
                              className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-4 py-3"
                              placeholder="+966 123 456 789"
                            />
                          </div>

                          <div>
                            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                              <CalendarIcon className="h-4 w-4 text-green-500" />
                              <span>تاريخ الميلاد</span>
                            </label>
                            <DateInput
                              value={comprehensiveFamilyForm.head_date_of_birth}
                              onChange={(e) => setComprehensiveFamilyForm(prev => ({ ...prev, head_date_of_birth: e.target.value }))}
                              className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-4 py-3"
                            />
                          </div>

                          <div>
                            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                              <DocumentDuplicateIcon className="h-4 w-4 text-green-500" />
                              <span>رقم الهوية</span>
                            </label>
                            <input
                              type="text"
                              value={comprehensiveFamilyForm.head_id_number}
                              onChange={(e) => setComprehensiveFamilyForm(prev => ({ ...prev, head_id_number: e.target.value }))}
                              className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-4 py-3"
                              placeholder="أدخل رقم الهوية/جواز السفر"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-3">
                              <CameraIcon className="h-4 w-4 text-green-500" />
                              <span>الصورة الشخصية</span>
                            </label>
                            <div className="flex items-center space-x-4">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFamilyHeadProfilePictureChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                              />
                              {comprehensiveFamilyForm.head_profile_picture_preview && (
                                <div className="flex-shrink-0">
                                  <img
                                    src={comprehensiveFamilyForm.head_profile_picture_preview}
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
                  {familyCreationStep === 3 && (
                    <div className="space-y-6">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h4 className="font-medium text-purple-900 mb-2">الخطوة 3: أفراد الأسرة</h4>
                        <p className="text-sm text-purple-700">أضف جميع أفراد الأسرة مع معلوماتهم الكاملة</p>
                      </div>

                      {/* Existing Family Members */}
                      {comprehensiveFamilyForm.family_members.length > 0 && (
                        <div className="space-y-4">
                          <h5 className="font-medium text-gray-900">Added Family Members ({comprehensiveFamilyForm.family_members.length})</h5>
                          {comprehensiveFamilyForm.family_members.map((member) => (
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
                                onClick={() => removeFamilyMember(member.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add New Family Member Form */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-4">Add Family Member</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Full Name *
                            </label>
                            <input
                              type="text"
                              value={newFamilyMember.full_name}
                              onChange={(e) => setNewFamilyMember(prev => ({ ...prev, full_name: e.target.value }))}
                              className="form-input w-full"
                              placeholder={t('enter_full_name')}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Relationship *
                            </label>
                            <select
                              value={newFamilyMember.relationship}
                              onChange={(e) => setNewFamilyMember(prev => ({ ...prev, relationship: e.target.value }))}
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Age
                            </label>
                            <input
                              type="number"
                              value={newFamilyMember.age}
                              onChange={(e) => setNewFamilyMember(prev => ({ ...prev, age: e.target.value }))}
                              className="form-input w-full"
                              placeholder="Enter age"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {t('phone_number')}
                            </label>
                            <input
                              type="tel"
                              value={newFamilyMember.phone}
                              onChange={(e) => setNewFamilyMember(prev => ({ ...prev, phone: e.target.value }))}
                              className="form-input w-full"
                              placeholder="+966 123 456 789"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Email Address
                            </label>
                            <input
                              type="email"
                              value={newFamilyMember.email}
                              onChange={(e) => setNewFamilyMember(prev => ({ ...prev, email: e.target.value }))}
                              className="form-input w-full"
                              placeholder="member@email.com (optional)"
                            />
                          </div>

                          <div>
                            <DateInput
                              label={t('date_of_birth')}
                              value={newFamilyMember.date_of_birth}
                              onChange={(e) => setNewFamilyMember(prev => ({ ...prev, date_of_birth: e.target.value }))}
                              className="w-full"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              ID Number
                            </label>
                            <input
                              type="text"
                              value={newFamilyMember.id_number}
                              onChange={(e) => setNewFamilyMember(prev => ({ ...prev, id_number: e.target.value }))}
                              className="form-input w-full"
                              placeholder="Enter ID number (optional)"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Profile Picture
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFamilyMemberProfilePictureChange}
                              className="form-input w-full"
                            />
                            {newFamilyMember.profile_picture_preview && (
                              <div className="mt-2">
                                <img
                                  src={newFamilyMember.profile_picture_preview}
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
                            onClick={addFamilyMember}
                            className="btn btn-secondary flex items-center space-x-2"
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
                  {familyCreationStep === 4 && (
                    <div className="space-y-6">
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <h4 className="font-medium text-indigo-900 mb-2">الخطوة 4: مراجعة وتأكيد</h4>
                        <p className="text-sm text-indigo-700">راجع جميع المعلومات قبل إنشاء السكن والعائلة</p>
                      </div>

                      {/* Unit Info */}
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3">معلومات الوحدة</h5>
                        <p className="text-sm text-gray-600">رقم الوحدة: <span className="font-medium">{comprehensiveFamilyForm.unit_number}</span></p>
                      </div>

                      {/* Family Head Info */}
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-3">Family Head</h5>
                        <div className="flex items-start space-x-4">
                          {comprehensiveFamilyForm.head_profile_picture_preview ? (
                            <img
                              src={comprehensiveFamilyForm.head_profile_picture_preview}
                              alt="Family head"
                              className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                              <UsersIcon className="h-8 w-8 text-gray-600" />
                            </div>
                          )}
                          <div className="space-y-1">
                            <p className="font-medium text-gray-900">{comprehensiveFamilyForm.head_full_name}</p>
                            <p className="text-sm text-gray-600">{comprehensiveFamilyForm.head_email}</p>
                            {comprehensiveFamilyForm.head_phone && <p className="text-sm text-gray-600">{comprehensiveFamilyForm.head_phone}</p>}
                            {comprehensiveFamilyForm.head_date_of_birth && <p className="text-sm text-gray-600">DOB: {formatDate(comprehensiveFamilyForm.head_date_of_birth)}</p>}
                            {comprehensiveFamilyForm.head_id_number && <p className="text-sm text-gray-600">ID: {comprehensiveFamilyForm.head_id_number}</p>}
                          </div>
                        </div>
                      </div>

                      {/* Family Members */}
                      {comprehensiveFamilyForm.family_members.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h5 className="font-medium text-gray-900 mb-3">Family Members ({comprehensiveFamilyForm.family_members.length})</h5>
                          <div className="space-y-3">
                            {comprehensiveFamilyForm.family_members.map((member, index) => (
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
                        <h5 className="font-medium text-green-900 mb-2">ماذا سيحدث بعد ذلك؟</h5>
                        <ul className="text-sm text-green-800 space-y-1">
                          <li>• سيتم إنشاء حساب السكن للوحدة {comprehensiveFamilyForm.unit_number}</li>
                          <li>• سيحصل رب الأسرة على بيانات تسجيل الدخول (اسم المستخدم وكلمة مرور مؤقتة)</li>
                          <li>• سيتم إضافة أفراد الأسرة إلى ملف العائلة</li>
                          <li>• سيتم تحميل جميع الصور الشخصية وإتاحتها</li>
                          <li>• يمكن للعائلة البدء في استخدام نظام HomeMe فوراً</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-6">
                  {familyCreationStep === 4 ? (
                    <button
                      onClick={handleCreateComprehensiveFamily}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      إنشاء السكن والعائلة
                    </button>
                  ) : (
                    <button
                      onClick={() => setFamilyCreationStep(prev => prev + 1)}
                      disabled={
                        (familyCreationStep === 1 && !comprehensiveFamilyForm.unit_number) ||
                        (familyCreationStep === 2 && (!comprehensiveFamilyForm.head_full_name || !comprehensiveFamilyForm.head_email))
                      }
                      className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg"
                    >
                      <span>الخطوة التالية</span>
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  )}
                  
                  {familyCreationStep > 1 && (
                    <button
                      onClick={() => setFamilyCreationStep(prev => prev - 1)}
                      className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-gray-300 transition-all duration-300"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                      <span>الخطوة السابقة</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => setShowComprehensiveFamilyModal(false)}
                    className="flex items-center space-x-2 border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all duration-300"
                  >
                    <XCircleIcon className="h-4 w-4" />
                    <span>إلغاء</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Unit Modal */}
      {showEditUnit && editingUnit && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="edit-unit-modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowEditUnit(false)}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 text-center" id="edit-unit-modal-title">
                    Edit Unit {editingUnit.unit_number}
                  </h3>
                  <button
                    onClick={() => setShowEditUnit(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleUpdateUnit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit Number
                      </label>
                      <input
                        type="text"
                        value={editUnitForm.unit_number}
                        onChange={(e) => setEditUnitForm(prev => ({ ...prev, unit_number: e.target.value }))}
                        className="form-input w-full"
                        placeholder="e.g., A-101, Villa-25"
                        disabled
                        title="Unit number cannot be changed"
                      />
                      <p className="text-xs text-gray-500 mt-1">Unit number cannot be modified</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Resident Name
                      </label>
                      <input
                        type="text"
                        value={editUnitForm.full_name}
                        onChange={(e) => setEditUnitForm(prev => ({ ...prev, full_name: e.target.value }))}
                        className="form-input w-full"
                        placeholder="Full name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={editUnitForm.email}
                        onChange={(e) => setEditUnitForm(prev => ({ ...prev, email: e.target.value }))}
                        className="form-input w-full"
                        placeholder="email@example.com"
                        disabled
                        title="Email cannot be changed"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be modified</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('phone_number')}
                      </label>
                      <input
                        type="tel"
                        value={editUnitForm.phone}
                        onChange={(e) => setEditUnitForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="form-input w-full"
                        placeholder="+966 123 456 789"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Profile Picture
                      </label>
                      <div className="flex items-center space-x-4">
                        {editUnitForm.profile_picture_preview && (
                          <img
                            src={editUnitForm.profile_picture_preview}
                            alt="Profile preview"
                            className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                          />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditUnitProfilePictureChange}
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-6">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      حفظ التغييرات
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditUnit(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Family Member Modal */}
      {showEditMember && editingMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="edit-member-modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowEditMember(false)}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 text-center" id="edit-member-modal-title">
                    Edit Family Member
                  </h3>
                  <button
                    onClick={() => setShowEditMember(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleUpdateMember}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editMemberForm.full_name}
                        onChange={(e) => setEditMemberForm(prev => ({ ...prev, full_name: e.target.value }))}
                        className="form-input w-full"
                        placeholder="Full name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Relationship
                      </label>
                      <select
                        value={editMemberForm.relationship}
                        onChange={(e) => setEditMemberForm(prev => ({ ...prev, relationship: e.target.value }))}
                        className="form-input w-full"
                        required
                      >
                        <option value="">Select relationship</option>
                        <option value="spouse">Spouse</option>
                        <option value="son">Son</option>
                        <option value="daughter">Daughter</option>
                        <option value="father">Father</option>
                        <option value="mother">Mother</option>
                        <option value="brother">Brother</option>
                        <option value="sister">Sister</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Age
                      </label>
                      <input
                        type="number"
                        value={editMemberForm.age}
                        onChange={(e) => setEditMemberForm(prev => ({ ...prev, age: e.target.value }))}
                        className="form-input w-full"
                        placeholder="Age"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={editMemberForm.email}
                        onChange={(e) => setEditMemberForm(prev => ({ ...prev, email: e.target.value }))}
                        className="form-input w-full"
                        placeholder="email@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('phone_number')}
                      </label>
                      <input
                        type="tel"
                        value={editMemberForm.phone}
                        onChange={(e) => setEditMemberForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="form-input w-full"
                        placeholder="+966 123 456 789"
                      />
                    </div>

                    <div>
                      <DateInput
                        label={t('date_of_birth')}
                        value={editMemberForm.date_of_birth}
                        onChange={(e) => setEditMemberForm(prev => ({ ...prev, date_of_birth: e.target.value }))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ID Number
                      </label>
                      <input
                        type="text"
                        value={editMemberForm.id_number}
                        onChange={(e) => setEditMemberForm(prev => ({ ...prev, id_number: e.target.value }))}
                        className="form-input w-full"
                        placeholder="Government ID or Passport Number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Profile Picture
                      </label>
                      <div className="flex items-center space-x-4">
                        {editMemberForm.profile_picture_preview && (
                          <img
                            src={editMemberForm.profile_picture_preview}
                            alt="Profile preview"
                            className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                          />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleEditMemberProfilePictureChange}
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse mt-6">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      حفظ التغييرات
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditMember(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="delete-modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowDeleteConfirm(false)}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 text-center" id="delete-modal-title">
                      Delete {deleteTarget.type === 'unit' ? 'Unit' : 'Family Member'}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete {deleteTarget.name}? This action cannot be undone.
                        {deleteTarget.type === 'unit' && ' All family members in this unit will also be removed.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompoundManagement;