import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import { 
  UserGroupIcon, 
  MagnifyingGlassIcon,
  PlusIcon,
  UserPlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import UserTimelineModal from './UserTimelineModal';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const UserManagement = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';
  
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [showSystemAccounts, setShowSystemAccounts] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null);
  const [timelineUser, setTimelineUser] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  
  // New user form data
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'resident',
    compound_id: user?.compound_id || '',
    full_name: '',
    is_active: true
  });

  useEffect(() => {
    loadUsersData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, selectedRole, showSystemAccounts, users]);

  const loadUsersData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/admin/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data && response.data.users) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error(t('failed_to_load_users'));
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // System accounts filter (hide super_admin & app_owner by default)
    const SYSTEM_ROLES = new Set(['super_admin', 'app_owner']);
    if (!showSystemAccounts) {
      filtered = filtered.filter(u => !SYSTEM_ROLES.has(u.role));
    }

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(user =>
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone?.includes(searchQuery)
      );
    }

    // Role filter
    if (selectedRole) {
      filtered = filtered.filter(user => user.role === selectedRole);
    }
    
    setFilteredUsers(filtered);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API}/api/admin/users`, newUser, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      toast.success(t('add_user_success'));
      setShowAddUser(false);
      setNewUser({
        username: '',
        email: '',
        phone: '',
        password: '',
        role: 'resident',
        compound_id: user?.compound_id || '',
        full_name: '',
        is_active: true
      });
      loadUsersData();
    } catch (error) {
      console.error('Failed to add user:', error);
      toast.error(error.response?.data?.detail || t('add_user_failed'));
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await axios.put(`${API}/api/admin/users/${userId}/status`, 
        { is_active: !currentStatus },
        {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      toast.success(currentStatus ? t('user_deactivated') : t('user_activated'));
      loadUsersData();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      toast.error(t('user_status_failed'));
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(t('confirm_delete_user'))) {
      return;
    }

    try {
      await axios.delete(`${API}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast.success(t('user_deleted'));
      loadUsersData();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error(t('user_delete_failed'));
    }
  };

  const handleViewUser = (userItem) => setViewingUser(userItem);

  const handleImpersonate = async (userItem) => {
    const SYSTEM = new Set(['app_owner', 'super_admin']);
    if (SYSTEM.has(userItem.role)) {
      toast.error('لا يمكن الدخول بحسابات المالك أو السوبر أدمن');
      return;
    }
    if (!userItem.is_active) {
      toast.error('لا يمكن الدخول بحساب معطّل');
      return;
    }
    if (!window.confirm(`🎭 هل أنتِ متأكدة من الدخول بحساب "${userItem.full_name || userItem.username}"؟\n\n` +
      `• الجلسة ستنتهي تلقائياً بعد 30 دقيقة\n` +
      `• المستخدم سيستلم إيميل إشعار تلقائي (للشفافية)\n` +
      `• كل action خلال الجلسة سيُسجّل باسمك في audit log\n\n` +
      `اضغطي موافق للمتابعة.`)) return;

    try {
      const res = await axios.post(`${API}/api/impersonate/${userItem.id}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      // Cache original token so ImpersonationBanner can restore it
      const origTok = localStorage.getItem('token');
      if (origTok) localStorage.setItem('original_token_before_impersonation', origTok);
      localStorage.setItem('token', res.data.access_token);
      toast.success(`✅ أنتِ الآن تتصفّحين كـ ${userItem.full_name || userItem.username}`);
      // Hard reload so AuthContext reflects the new user
      window.location.href = '/app/dashboard';
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل بدء جلسة الانتحال');
    }
  };

  const handleEditUser = (userItem) => {
    setEditingUser(userItem);
    setEditFormData({
      full_name: userItem.full_name || '',
      email: userItem.email || '',
      phone: userItem.phone || '',
      role: userItem.role || 'resident',
      unit_number: userItem.unit_number || '',
      is_active: userItem.is_active !== false,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      await axios.put(`${API}/api/admin/users/${editingUser.id}`, editFormData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      toast.success('تم تحديث المستخدم بنجاح');
      setEditingUser(null);
      await loadUsersData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل تحديث المستخدم');
    } finally {
      setSavingEdit(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'company_admin': return 'bg-indigo-100 text-indigo-800';
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-emerald-100 text-emerald-800';
      case 'security': return 'bg-amber-100 text-amber-800';
      case 'resident': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'super_admin': return t('super_admin', 'مالك التطبيق');
      case 'company_admin': return t('company_admin', 'إدارة شركة');
      case 'admin': return t('admin', 'مدير مجتمع');
      case 'manager': return t('manager', 'إداري');
      case 'security': return t('security_role', 'أمن');
      case 'resident': return t('resident', 'مقيم');
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('user_management')}</h1>
                <p className="text-sm text-gray-500">{t('add_manage_user_accounts')}</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowAddUser(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <UserPlusIcon className="h-5 w-5" />
              <span>{t('add_new_user')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('search_user')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">{t('all_roles')}</option>
            <option value="admin">{t('admin')}</option>
            <option value="manager">{t('manager', 'إداري')}</option>
            <option value="security">{t('security_role', 'أمن')}</option>
            <option value="resident">{t('resident')}</option>
            <option value="staff">{t('staff')}</option>
          </select>

          {/* System accounts toggle — only for Owner / Super Admin */}
          {(user?.role === 'app_owner' || user?.role === 'super_admin') && (
            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 bg-white" title="إظهار حسابات النظام (Super Admin / App Owner)">
              <input
                type="checkbox"
                checked={showSystemAccounts}
                onChange={(e) => setShowSystemAccounts(e.target.checked)}
                className="h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                data-testid="toggle-system-accounts"
              />
              <span className="text-sm text-gray-700 font-medium whitespace-nowrap">
                {showSystemAccounts ? '👁️ إظهار حسابات النظام' : '🙈 إخفاء حسابات النظام'}
              </span>
            </label>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <UserGroupIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">{t('total_users')}</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">{t('active_users')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.is_active).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100">
                <ShieldCheckIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">{t('administrators')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <MagnifyingGlassIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="mr-4">
                <p className="text-sm font-medium text-gray-500">{t('search_results')}</p>
                <p className="text-2xl font-bold text-gray-900">{filteredUsers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('user_list')}</h2>
          </div>
          
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('no_results')}</h3>
              <p className="text-gray-500">{t('no_users_found')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('user')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('contact_info')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('role')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('status')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('created_date')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('change_role', 'تغيير الدور')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((userItem) => (
                    <tr key={userItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {userItem.username?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="mr-4">
                            <div className="text-sm font-medium text-gray-900">
                              {userItem.full_name || userItem.username}
                            </div>
                            <div className="text-sm text-gray-500">
                              @{userItem.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {userItem.email && (
                            <div className="flex items-center text-sm text-gray-900">
                              <EnvelopeIcon className="h-4 w-4 text-gray-400 ml-2" />
                              {userItem.email}
                            </div>
                          )}
                          <div className="flex items-center text-sm text-gray-500">
                            <PhoneIcon className="h-4 w-4 text-gray-400 ml-2" />
                            {userItem.phone || t('no_phone')}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(userItem.role)}`}>
                          {getRoleName(userItem.role)}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {userItem.is_active ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
                          ) : (
                            <XCircleIcon className="h-5 w-5 text-red-500 ml-2" />
                          )}
                          <span className={`text-sm ${userItem.is_active ? 'text-green-800' : 'text-red-800'}`}>
                            {userItem.is_active ? t('active') : t('inactive')}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 text-gray-400 ml-2" />
                          {new Date(userItem.created_at || Date.now()).toLocaleDateString('ar')}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={userItem.role}
                          onChange={async (e) => {
                            try {
                              await axios.put(`${API}/admin/users/${userItem.id}/role?role=${e.target.value}`, {}, {
                                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                              });
                              toast.success(t('role_updated', 'تم تغيير الدور بنجاح'));
                              fetchUsers();
                            } catch (err) {
                              toast.error(err.response?.data?.detail || t('role_update_failed', 'فشل في تغيير الدور'));
                            }
                          }}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                          data-testid={`role-change-${userItem.id}`}
                        >
                          <option value="resident">{t('resident', 'مقيم')}</option>
                          <option value="manager">{t('manager', 'إداري')}</option>
                          <option value="security">{t('security', 'أمن')}</option>
                        </select>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleToggleUserStatus(userItem.id, userItem.is_active)}
                            className={`${userItem.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                            title={userItem.is_active ? t('deactivate') : t('activate')}
                          >
                            {userItem.is_active ? <XCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                          </button>
                          <button 
                            onClick={() => handleViewUser(userItem)}
                            className="text-blue-600 hover:text-blue-900"
                            title={t('view_details')}
                            data-testid={`user-view-${userItem.id}`}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleEditUser(userItem)}
                            className="text-green-600 hover:text-green-900"
                            title={t('edit')}
                            data-testid={`user-edit-${userItem.id}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {/* Impersonate — only for Owner/SuperAdmin; cannot impersonate system roles */}
                          {(user?.role === 'app_owner' || user?.role === 'super_admin') &&
                           userItem.role !== 'app_owner' && userItem.role !== 'super_admin' && userItem.id !== user?.id && (
                            <button
                              onClick={() => handleImpersonate(userItem)}
                              className="text-rose-600 hover:text-rose-900"
                              title="دخول كهذا المستخدم (Impersonate)"
                              data-testid={`user-impersonate-${userItem.id}`}
                            >
                              🎭
                            </button>
                          )}
                          {/* Activity Timeline — Owner / SuperAdmin / Admin of the same compound */}
                          {(user?.role === 'app_owner' || user?.role === 'super_admin' ||
                            (['admin','company_admin','super_admin','app_owner'].includes(user?.role) && user?.compound_id === userItem.compound_id) ||
                            (user?.role === 'company_admin' && user?.compound_id === userItem.compound_id)) && (
                            <button
                              onClick={() => setTimelineUser(userItem)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="عرض سجل النشاط (Timeline)"
                              data-testid={`user-timeline-${userItem.id}`}
                            >
                              📋
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteUser(userItem.id)}
                            className="text-red-600 hover:text-red-900"
                            title={t('delete')}
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
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('add_new_user')}</h3>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('username')}
                </label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('full_name')}
                </label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('email')}
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('phone_number')}
                </label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('password')}
                </label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('role')}
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="resident">{t('resident')}</option>
                  <option value="manager">{t('manager', 'إداري')}</option>
                  <option value="security">{t('security_role', 'أمن')}</option>
                  <option value="admin">{t('admin')}</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={newUser.is_active}
                  onChange={(e) => setNewUser({...newUser, is_active: e.target.checked})}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="mr-2 block text-sm text-gray-900">
                  {t('active_account')}
                </label>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  {t('add_user_btn')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {viewingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingUser(null)} data-testid="user-view-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                {(viewingUser.full_name || viewingUser.username || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900" data-testid="view-user-name">{viewingUser.full_name || viewingUser.username}</h3>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getRoleColor(viewingUser.role)}`}>{getRoleName(viewingUser.role)}</span>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-gray-500"/><span className="text-gray-500 w-28">{t('username', 'اسم المستخدم')}:</span><span className="font-medium text-gray-800">{viewingUser.username}</span></div>
              <div className="flex items-center gap-2"><EnvelopeIcon className="h-4 w-4 text-gray-500"/><span className="text-gray-500 w-28">{t('email', 'البريد')}:</span><span className="font-medium text-gray-800">{viewingUser.email || '—'}</span></div>
              <div className="flex items-center gap-2"><PhoneIcon className="h-4 w-4 text-gray-500"/><span className="text-gray-500 w-28">{t('phone', 'الهاتف')}:</span><span className="font-medium text-gray-800">{viewingUser.phone || '—'}</span></div>
              {viewingUser.unit_number && <div className="flex items-center gap-2"><span className="text-gray-500 w-28 pr-6">الوحدة:</span><span className="font-medium text-gray-800">{viewingUser.unit_number}</span></div>}
              {viewingUser.compound_name && <div className="flex items-center gap-2"><span className="text-gray-500 w-28 pr-6">المجمع:</span><span className="font-medium text-gray-800">{viewingUser.compound_name}</span></div>}
              <div className="flex items-center gap-2"><CalendarIcon className="h-4 w-4 text-gray-500"/><span className="text-gray-500 w-28">تاريخ الإنشاء:</span><span className="font-medium text-gray-800">{viewingUser.created_at ? new Date(viewingUser.created_at).toLocaleString('ar-EG') : '—'}</span></div>
              <div className="flex items-center gap-2"><span className="text-gray-500 w-28 pr-6">الحالة:</span>{viewingUser.is_active ? <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircleIcon className="h-4 w-4"/>نشط</span> : <span className="text-rose-600 font-bold flex items-center gap-1"><XCircleIcon className="h-4 w-4"/>معطل</span>}</div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setViewingUser(null); handleEditUser(viewingUser); }} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium" data-testid="view-modal-edit-btn">تعديل</button>
              <button onClick={() => { setTimelineUser(viewingUser); setViewingUser(null); }} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium" data-testid="view-modal-timeline-btn">📋 سجل النشاط</button>
              <button onClick={() => setViewingUser(null)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium" data-testid="view-modal-close-btn">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingUser(null)} data-testid="user-edit-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} dir={isRTL ? 'rtl' : 'ltr'}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">تعديل المستخدم: <span className="text-blue-600">{editingUser.username}</span></h3>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل</label>
                <input type="text" value={editFormData.full_name || ''} onChange={(e) => setEditFormData({...editFormData, full_name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" data-testid="edit-full-name"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                <input type="email" value={editFormData.email || ''} onChange={(e) => setEditFormData({...editFormData, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" data-testid="edit-email"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
                <input type="tel" value={editFormData.phone || ''} onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" data-testid="edit-phone"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الوحدة</label>
                <input type="text" value={editFormData.unit_number || ''} onChange={(e) => setEditFormData({...editFormData, unit_number: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" data-testid="edit-unit"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الدور</label>
                <select value={editFormData.role || 'resident'} onChange={(e) => setEditFormData({...editFormData, role: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" data-testid="edit-role">
                  <option value="resident">مقيم</option>
                  <option value="manager">إداري</option>
                  <option value="security">أمن</option>
                  <option value="admin">مدير مجتمع</option>
                  <option value="company_admin">إدارة شركة</option>
                  <option value="advertiser">معلن</option>
                </select>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="edit_is_active" checked={editFormData.is_active !== false} onChange={(e) => setEditFormData({...editFormData, is_active: e.target.checked})} className="h-4 w-4 text-blue-600 rounded" data-testid="edit-is-active"/>
                <label htmlFor="edit_is_active" className="mr-2 block text-sm text-gray-900">حساب نشط</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={savingEdit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium disabled:opacity-50" data-testid="edit-save-btn">
                  {savingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 rounded-lg font-medium" data-testid="edit-cancel-btn">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Timeline Modal */}
      {timelineUser && <UserTimelineModal user={timelineUser} onClose={() => setTimelineUser(null)} />}
    </div>
  );
};

export default UserManagement;