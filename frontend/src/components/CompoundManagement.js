import React, { useState, useEffect } from 'react';
import { usePermissions } from '../hooks/usePermissions';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { formatDate } from '../utils/dateUtils';
import PageHeader from './shared/PageHeader';
import LanguageSwitcher from './LanguageSwitcher';
import EditUnitModal from './compound/modals/EditUnitModal';
import EditMemberModal from './compound/modals/EditMemberModal';
import DeleteConfirmModal from './compound/modals/DeleteConfirmModal';
import AddAdminModal from './compound/modals/AddAdminModal';
import AddRegistrationLinkModal from './compound/modals/AddRegistrationLinkModal';
import AddNewResidenceModal from './compound/modals/AddNewResidenceModal';
import CompoundSelectionModal from './compound/modals/CompoundSelectionModal';
import ComprehensiveFamilyModal from './compound/modals/ComprehensiveFamilyModal';
import {
  HomeIcon,
  LinkIcon,
  UsersIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CogIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

// Lazy-loaded tab components with hover/focus preloading — reduce initial bundle size
// and start fetching a tab's chunk the moment the user shows intent (mouseenter / focus).
// `preload()` triggers the dynamic import; bundler de-duplicates so calling it many times is safe.
const lazyWithPreload = (importFn) => {
  const Component = React.lazy(importFn);
  Component.preload = importFn;
  return Component;
};

const OverviewTab = lazyWithPreload(() => import('./compound/tabs/OverviewTab'));
const ResidencesTab = lazyWithPreload(() => import('./compound/tabs/ResidencesTab'));
const RegistrationLinksTab = lazyWithPreload(() => import('./compound/tabs/RegistrationLinksTab'));
const ManageUsersTab = lazyWithPreload(() => import('./compound/tabs/ManageUsersTab'));
const AddAdminTab = lazyWithPreload(() => import('./compound/tabs/AddAdminTab'));
const SettingsTab = lazyWithPreload(() => import('./compound/tabs/SettingsTab'));

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CompoundManagement = () => {
  const { user, updateUser } = useAuth();
  const { isAdmin } = usePermissions();
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

  // Add throttling to prevent too many requests
  const fetchAllUsers = React.useCallback(async () => {
    // Prevent concurrent calls
    if (fetchAllUsers._isLoading) return;
    fetchAllUsers._isLoading = true;
    
    try {
      const response = await axios.get(`${API}/admin/users`);
      setAllUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      if (error.response?.status !== 429) {
        toast.error(t('failed_load_users', 'فشل في تحميل المستخدمين'));
      }
    } finally {
      fetchAllUsers._isLoading = false;
    }
  }, []);

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

      toast.success(t('admin_created_successfully', 'Admin account created successfully!'));
      setShowAddAdmin(false);
      resetAdminForm();
      await fetchAllUsers();
    } catch (error) {
      console.error('Failed to create admin:', error);
      toast.error(error.response?.data?.detail || t('failed_create_admin', 'Failed to create admin account'));
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
      toast.error(t('failed_update_status', 'فشل في تحديث حالة المستخدم'));
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await axios.delete(`${API}/admin/users/${userId}`);
        toast.success(t('user_deleted', 'تم حذف المستخدم بنجاح'));
        await fetchAllUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
        toast.error(t('user_delete_failed', 'فشل في حذف المستخدم'));
      }
    }
  };

  const handleSaveCompoundSettings = async () => {
    // Validate inputs
    const errors = [];
    
    // Check compound name
    if (!editableCompound.name || editableCompound.name.trim().length === 0) {
      errors.push(t('compound_name_required'));
    } else if (editableCompound.name.trim().length < 2) {
      errors.push(t('compound_name_too_short'));
    } else if (editableCompound.name.trim().length > 100) {
      errors.push(t('compound_name_too_long'));
    }
    
    // Check address
    if (!editableCompound.address || editableCompound.address.trim().length === 0) {
      errors.push(t('address_required'));
    } else if (editableCompound.address.trim().length < 5) {
      errors.push(t('address_too_short'));
    } else if (editableCompound.address.trim().length > 200) {
      errors.push(t('address_too_long'));
    }
    
    // Check description length (optional field)
    if (editableCompound.description && editableCompound.description.length > 500) {
      errors.push(t('description_too_long'));
    }
    
    // If there are errors, show them and return
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }
    
    try {
      const response = await axios.put(`${API}/compounds/${user.compound_id}`, {
        name: editableCompound.name.trim(),
        address: editableCompound.address.trim(),
        description: editableCompound.description?.trim() || ''
      });
      
      setCompound(response.data);
      toast.success(t('compound_settings_updated'));
    } catch (error) {
      console.error('Failed to update compound settings:', error);
      toast.error(t('failed_update_compound_settings'));
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
        toast.error(t('please_select_image', 'Please select an image file'));
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
      toast.error(t('please_select_logo', 'Please select a logo file first'));
      return;
    }

    try {
      const formData = new FormData();
      formData.append('logo', logoFile);

      const response = await axios.put(`${API}/compounds/${editableCompound?.id || user.compound_id}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setEditableCompound(prev => ({ ...prev, logo_url: response.data.logo_url }));
      setCompound(prev => ({ ...prev, logo_url: response.data.logo_url }));
      toast.success(t('logo_uploaded_successfully', 'Logo uploaded successfully!'));
      setLogoFile(null);
    } catch (error) {
      console.error('Failed to upload logo:', error);
      toast.error(t('failed_upload_logo', 'فشل في رفع الشعار'));
    }
  };

  useEffect(() => {
    // Debounce and prevent multiple calls
    let isMounted = true;
    
    const loadData = async () => {
      if (!user?.compound_id || !isMounted) return;
      
      try {
        await fetchCompound();
        await fetchResidences();
        if (isAdmin && isMounted) {
          await fetchRegistrationLinks();
          await fetchAllUsers();
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    // Add delay to prevent rapid requests
    const timeoutId = setTimeout(() => {
      loadData();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [user?.compound_id, user?.role]);

  const fetchCompound = React.useCallback(async () => {
    // Prevent concurrent calls
    if (fetchCompound._isLoading) return;
    fetchCompound._isLoading = true;
    
    try {
      if (!user?.compound_id) return;
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
      } else if (error.response?.status === 429) {
        console.log('Rate limited - compound data will retry later');
      } else {
        toast.error(t('failed_load_compound', 'فشل في تحميل بيانات المجمع'));
      }
    } finally {
      fetchCompound._isLoading = false;
      setLoading(false);
    }
  }, [user?.compound_id]);

  const loadAvailableCompounds = async () => {
    try {
      const response = await axios.get(`${API}/compounds`);
      setAvailableCompounds(response.data.compounds || []);
      setShowCompoundSelection(true);
    } catch (error) {
      console.error('Failed to load available compounds:', error);
      toast.error(t('failed_load_compounds', 'فشل في تحميل المجمعات المتاحة'));
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
        if (isAdmin) {
          await fetchRegistrationLinks();
        }
        
        toast.success(t('compound_selected', 'تم اختيار المجمع بنجاح!'));
      }
    } catch (error) {
      console.error('Failed to update compound selection:', error);
      toast.error(t('failed_select_compound', 'فشل في تحديث اختيار المجمع'));
    }
  };

  const fetchResidences = React.useCallback(async () => {
    // Prevent concurrent calls
    if (fetchResidences._isLoading) return;
    fetchResidences._isLoading = true;
    
    try {
      if (!user?.compound_id) return;
      const response = await axios.get(`${API}/compounds/${user.compound_id}/residences`);
      setResidences(response.data.residences);
    } catch (error) {
      console.error('Failed to load residences:', error);
      if (error.response?.status === 429) {
        console.log('Rate limited - will retry later');
      }
    } finally {
      fetchResidences._isLoading = false;
    }
  }, [user?.compound_id]);

  const fetchRegistrationLinks = React.useCallback(async () => {
    // Prevent concurrent calls
    if (fetchRegistrationLinks._isLoading) return;
    fetchRegistrationLinks._isLoading = true;
    
    try {
      const response = await axios.get(`${API}/admin/registration-links`);
      setRegistrationLinks(response.data.registration_links || []);
    } catch (error) {
      console.error('Failed to load registration links:', error);
      if (error.response?.status === 429) {
        console.log('Rate limited - registration links will retry later');
      }
    } finally {
      fetchRegistrationLinks._isLoading = false;
    }
  }, []);

  const handleCreateRegistrationLink = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/admin/registration-links`, residenceForm);
      toast.success(t('link_created', 'تم إنشاء رابط التسجيل بنجاح!'));
      
      // Copy link to clipboard
      navigator.clipboard.writeText(response.data.registration_url);
      toast.success(t('url_copied', 'تم نسخ رابط التسجيل!'));
      
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
        toast.success(t('link_deleted', 'تم حذف رابط التسجيل بنجاح'));
        await fetchRegistrationLinks();
      } catch (error) {
        console.error('Failed to delete registration link:', error);
        toast.error(t('failed_delete_link', 'فشل في حذف رابط التسجيل'));
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(t('copied_clipboard', 'تم النسخ!'));
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
        toast.error(t('please_select_image', 'Please select an image file'));
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
        toast.error(t('please_select_image', 'Please select an image file'));
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
        toast.error(t('please_select_image', 'Please select an image file'));
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
        toast.error(t('please_select_image', 'Please select an image file'));
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
        toast.error(t('please_select_image', 'Please select an image file'));
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

      toast.success(t('unit_updated', 'تم تحديث الوحدة بنجاح!'));
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

      toast.success(t('member_updated', 'تم تحديث فرد العائلة بنجاح!'));
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
      toast.error(t('fill_required_fields', 'يرجى ملء الحقول المطلوبة (الاسم والعلاقة)'));
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

      toast.success(t('residence_created', 'تم إنشاء الوحدة ورب العائلة بنجاح!'));
      
      if (residenceResponse.data.temporary_password) {
        toast.success('✅ تم إنشاء حساب رب الأسرة — تم إرسال بيانات الدخول على البريد الإلكتروني', { duration: 5000 });
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
        toast.error(t('please_select_image', 'Please select an image file'));
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

      toast.success(t('new_residence_created', 'تم إنشاء وحدة سكنية جديدة بنجاح!'));
      
      if (response.data.temporary_password) {
        toast.success('✅ تم إنشاء الحساب — تم إرسال بيانات الدخول على البريد الإلكتروني', { duration: 5000 });
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
      toast.error(t('please_select_image', 'Please select an image file'));
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

      toast.success(t('logo_uploaded_successfully', 'Logo uploaded successfully!'));
    } catch (error) {
      toast.error(t('failed_upload_logo', 'فشل في رفع الشعار'));
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 p-6" dir="rtl" data-testid="compound-management">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          theme="blue"
          icon={HomeIcon}
          badge={t('compound_mgmt_badge', 'إدارة المجمع')}
          title={t('compound_management_title', 'إدارة المجمع')}
          subtitle={t('compound_management_subtitle', 'كل أدوات إدارة الوحدات والسكان في مكان واحد')}
          actions={<LanguageSwitcher />}
          testId="compound-mgmt-header"
        />

      {/* Enhanced Tab Navigation with Icons */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-2">
        <nav className="flex flex-wrap gap-2" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            onMouseEnter={() => OverviewTab.preload()}
            onFocus={() => OverviewTab.preload()}
            data-testid="tab-overview"
            className={`flex items-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <HomeIcon className="h-5 w-5" />
            {t('overview')}
          </button>
          
          <button
            onClick={() => setActiveTab('residences')}
            onMouseEnter={() => ResidencesTab.preload()}
            onFocus={() => ResidencesTab.preload()}
            data-testid="tab-residences"
            className={`flex items-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
              activeTab === 'residences'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <UserGroupIcon className="h-5 w-5" />
            {t('residence_list')}
            <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'residences' ? 'bg-white/20' : 'bg-gray-200 text-gray-700'
            }`}>
              {residences.length}
            </span>
          </button>
          
          {isAdmin && (
            <button
              onClick={() => setActiveTab('registration-links')}
              onMouseEnter={() => RegistrationLinksTab.preload()}
              onFocus={() => RegistrationLinksTab.preload()}
              data-testid="tab-registration-links"
              className={`flex items-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === 'registration-links'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LinkIcon className="h-5 w-5" />
              {t('registration_links')}
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'registration-links' ? 'bg-white/20' : 'bg-gray-200 text-gray-700'
              }`}>
                {registrationLinks.length}
              </span>
            </button>
          )}
          
          {isAdmin && (
            <button
              id="manage-users-tab-v2"
              onClick={() => setActiveTab('manage-users')}
              onMouseEnter={() => ManageUsersTab.preload()}
              onFocus={() => ManageUsersTab.preload()}
              data-testid="tab-manage-users"
              className={`flex items-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === 'manage-users'
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <UsersIcon className="h-5 w-5" />
              {t('manage_users')}
            </button>
          )}
          
          {isAdmin && (
            <button
              id="add-admin-tab-v2"
              onClick={() => setActiveTab('add-admin')}
              onMouseEnter={() => AddAdminTab.preload()}
              onFocus={() => AddAdminTab.preload()}
              data-testid="tab-add-admin"
              className={`flex items-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === 'add-admin'
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ShieldCheckIcon className="h-5 w-5" />
              {t('add_admin')}
            </button>
          )}
          
          <button
            onClick={() => setActiveTab('settings')}
            onMouseEnter={() => SettingsTab.preload()}
            onFocus={() => SettingsTab.preload()}
            data-testid="tab-settings"
            className={`flex items-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-gray-600 to-slate-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CogIcon className="h-5 w-5" />
            {t('settings')}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <React.Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }>
        {activeTab === 'overview' && (
          <OverviewTab
            compound={compound}
            user={user}
            uploading={uploading}
            onLogoUpload={handleLogoUpload}
            onAddAdminClick={() => setShowAddAdmin(true)}
            onAddResidenceClick={() => setShowComprehensiveFamilyModal(true)}
          />
        )}

        {activeTab === 'residences' && (
          <ResidencesTab
            residences={residences}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            getSortedResidences={getSortedResidences}
            expandedUnits={expandedUnits}
            unitFamilyMembers={unitFamilyMembers}
            onAddResidenceClick={() => setShowComprehensiveFamilyModal(true)}
            onEditUnit={handleEditUnit}
            onDeleteClick={handleDeleteClick}
            onToggleUnitExpansion={toggleUnitExpansion}
            onEditMember={handleEditMember}
          />
        )}

        {activeTab === 'registration-links' && isAdmin && (
          <RegistrationLinksTab
            registrationLinks={registrationLinks}
            onAddClick={() => setShowAddResidence(true)}
            onCopy={copyToClipboard}
            onDelete={handleDeleteRegistrationLink}
          />
        )}

        {activeTab === 'manage-users' && isAdmin && (
          <ManageUsersTab
            allUsers={allUsers}
            currentUserId={user?.id}
            onToggleStatus={handleToggleUserStatus}
            onDelete={handleDeleteUser}
          />
        )}

        {activeTab === 'add-admin' && isAdmin && (
          <AddAdminTab
            form={adminForm}
            setForm={setAdminForm}
            onSubmit={handleCreateAdmin}
            onReset={resetAdminForm}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            editableCompound={editableCompound}
            setEditableCompound={setEditableCompound}
            logoFile={logoFile}
            setLogoFile={setLogoFile}
            logoPreview={logoPreview}
            setLogoPreview={setLogoPreview}
            onSave={handleSaveCompoundSettings}
            onCancel={handleCancelCompoundSettings}
            onLogoChange={handleLogoChange}
            onUploadLogo={handleUploadLogo}
          />
        )}
      </React.Suspense>

      {/* Add Residence Registration Link Modal */}
      <AddRegistrationLinkModal
        open={showAddResidence}
        form={residenceForm}
        setForm={setResidenceForm}
        onSubmit={handleCreateRegistrationLink}
        onClose={() => setShowAddResidence(false)}
      />

      {/* Compound Selection Modal */}
      <CompoundSelectionModal
        open={showCompoundSelection}
        availableCompounds={availableCompounds}
        compoundNotFound={compoundNotFound}
        onSelect={handleCompoundSelection}
        onClose={() => setShowCompoundSelection(false)}
      />

      {/* Add New Residence Modal */}
      <AddNewResidenceModal
        open={showAddNewResidence}
        form={newResidenceForm}
        setForm={setNewResidenceForm}
        onSubmit={handleCreateNewResidence}
        onProfilePictureChange={handleProfilePictureChange}
        onClose={() => setShowAddNewResidence(false)}
      />

      {/* Add Admin Modal */}
      <AddAdminModal
        open={showAddAdmin}
        form={adminForm}
        setForm={setAdminForm}
        onSubmit={handleCreateAdmin}
        onProfilePictureChange={handleAdminProfilePictureChange}
        onClose={() => setShowAddAdmin(false)}
      />

      {/* Comprehensive Family Creation Modal */}
      <ComprehensiveFamilyModal
        open={showComprehensiveFamilyModal}
        step={familyCreationStep}
        setStep={setFamilyCreationStep}
        form={comprehensiveFamilyForm}
        setForm={setComprehensiveFamilyForm}
        newMember={newFamilyMember}
        setNewMember={setNewFamilyMember}
        onAddMember={addFamilyMember}
        onRemoveMember={removeFamilyMember}
        onHeadProfilePictureChange={handleFamilyHeadProfilePictureChange}
        onMemberProfilePictureChange={handleFamilyMemberProfilePictureChange}
        onSubmit={handleCreateComprehensiveFamily}
        onClose={() => setShowComprehensiveFamilyModal(false)}
      />

      {/* Edit Unit Modal */}
      <EditUnitModal
        open={showEditUnit}
        unit={editingUnit}
        form={editUnitForm}
        setForm={setEditUnitForm}
        onSubmit={handleUpdateUnit}
        onProfilePictureChange={handleEditUnitProfilePictureChange}
        onClose={() => setShowEditUnit(false)}
      />

      {/* Edit Family Member Modal */}
      <EditMemberModal
        open={showEditMember}
        member={editingMember}
        form={editMemberForm}
        setForm={setEditMemberForm}
        onSubmit={handleUpdateMember}
        onProfilePictureChange={handleEditMemberProfilePictureChange}
        onClose={() => setShowEditMember(false)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={showDeleteConfirm}
        target={deleteTarget}
        onConfirm={handleConfirmDelete}
        onClose={() => setShowDeleteConfirm(false)}
      />
      </div>
    </div>
  );
};

export default CompoundManagement;
