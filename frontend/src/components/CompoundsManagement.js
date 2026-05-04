import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../hooks/usePermissions';
import PageHero from './shared/PageHero';
import StatCard from './shared/StatCard';

const API = process.env.REACT_APP_BACKEND_URL;

const CompoundsManagement = () => {
  const { t } = useTranslation();
  const { isCompanyAdmin, isSuperAdmin, isAppOwner } = usePermissions();
  const [compounds, setCompounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompound, setSelectedCompound] = useState(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState('');
  const [subscriptionCodes, setSubscriptionCodes] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newCompound, setNewCompound] = useState({
    name: '',
    location: '',
    address: '',
    description: '',
  });

  // Edit Compound state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', name: '', location: '', address: '', description: '' });

  // Create Compound Admin state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState({
    compound_id: '',
    compound_name: '',
    full_name: '',
    username: '',
    email: '',
    password: '',
    phone: '',
  });

  // Subscription-codes management is only meaningful for super_admin / app_owner
  const canManageCodes = isSuperAdmin || isAppOwner;
  // company_admin can also create new compounds inside its company portfolio
  const canAddCompound = isCompanyAdmin || canManageCodes;

  useEffect(() => {
    fetchCompounds();
    if (canManageCodes) fetchSubscriptionCodes();
    // eslint-disable-next-line
  }, [canManageCodes]);

  const fetchCompounds = async () => {
    try {
      setLoading(true);
      // company_admin doesn't have access to /compounds/all (super-admin only).
      // Use the company-scoped endpoint instead so they see their own compounds.
      const url = isCompanyAdmin
        ? `${API}/api/company-admin/compounds`
        : `${API}/api/compounds/all`;
      const response = await axios.get(url);
      const list = isCompanyAdmin
        ? (response.data?.compounds || [])
        : (Array.isArray(response.data) ? response.data : (response.data?.compounds || []));
      setCompounds(list);
    } catch (error) {
      console.error('Error fetching compounds:', error);
      toast.error(t('failed_load_compounds', 'فشل في تحميل المجمعات'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscriptionCodes = async () => {
    try {
      const response = await axios.get(`${API}/api/subscription-codes/list`);
      setSubscriptionCodes(response.data.codes || []);
    } catch (error) {
      console.error('Error fetching codes:', error);
    }
  };

  const handleSendCode = async () => {
    if (!selectedCompound || !selectedCode) {
      toast.error(t('select_compound_and_code', 'يرجى اختيار المجمع والرمز'));
      return;
    }

    try {
      await axios.post(`${API}/api/compounds/${selectedCompound.id}/send-code`, {
        code: selectedCode
      });
      
      toast.success(`Code ${selectedCode} sent to ${selectedCompound.name}!`);
      setShowCodeModal(false);
      setSelectedCompound(null);
      setSelectedCode('');
    } catch (error) {
      toast.error(t('failed_send_code', 'فشل في إرسال الرمز'));
    }
  };

  const openCodeModal = (compound) => {
    setSelectedCompound(compound);
    setShowCodeModal(true);
  };

  const handleAddCompound = async () => {
    const name = newCompound.name.trim();
    if (!name) {
      toast.error(t('compound_name_required', 'اسم المجمع مطلوب'));
      return;
    }
    setAdding(true);
    try {
      const url = isCompanyAdmin
        ? `${API}/api/company-admin/compounds`
        : `${API}/api/companies/compounds`;
      await axios.post(url, newCompound);
      toast.success(t('compound_added_successfully', 'تم إضافة المجمع بنجاح ✅'));
      setShowAddModal(false);
      setNewCompound({ name: '', location: '', address: '', description: '' });
      fetchCompounds();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (detail?.message || t('failed_to_add_compound', 'فشل إضافة المجمع'));
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const openEditModal = (compound) => {
    setEditForm({
      id: compound.id,
      name: compound.name || '',
      location: compound.location || '',
      address: compound.address || '',
      description: compound.description || '',
    });
    setShowEditModal(true);
  };

  const handleEditCompound = async () => {
    if (!editForm.name.trim()) {
      toast.error(t('compound_name_required', 'اسم المجمع مطلوب'));
      return;
    }
    setEditing(true);
    try {
      const url = isCompanyAdmin
        ? `${API}/api/company-admin/compounds/${editForm.id}`
        : `${API}/api/companies/compounds/${editForm.id}`;
      await axios.put(url, {
        name: editForm.name.trim(),
        location: editForm.location,
        address: editForm.address,
        description: editForm.description,
      });
      toast.success(t('compound_updated_successfully', 'تم تحديث المجمع بنجاح ✅'));
      setShowEditModal(false);
      fetchCompounds();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : t('failed_to_update_compound', 'فشل تحديث المجمع'));
    } finally {
      setEditing(false);
    }
  };

  const openCreateAdminModal = (compound) => {
    // Suggest a username derived from compound name
    const slug = (compound.name || 'compound')
      .replace(/[^a-zA-Z0-9\u0600-\u06FF]+/g, '_')
      .toLowerCase()
      .slice(0, 20);
    setAdminForm({
      compound_id: compound.id,
      compound_name: compound.name || '',
      full_name: '',
      username: `admin_${slug}`,
      email: '',
      password: '',
      phone: '',
    });
    setShowAdminModal(true);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pw = '';
    for (let i = 0; i < 10; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
    setAdminForm((f) => ({ ...f, password: pw }));
  };

  const handleCreateAdmin = async () => {
    const { compound_id, full_name, username, email, password, phone } = adminForm;
    if (!full_name.trim() || !username.trim() || !email.trim() || !password) {
      toast.error(t('all_fields_required', 'الاسم، اسم المستخدم، البريد، وكلمة المرور كلها مطلوبة'));
      return;
    }
    if (password.length < 6) {
      toast.error(t('password_min_6', 'كلمة المرور 6 أحرف على الأقل'));
      return;
    }
    setCreatingAdmin(true);
    try {
      await axios.post(`${API}/api/company-admin/compounds/${compound_id}/users`, {
        full_name: full_name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        role: 'admin',
      });
      toast.success(t('admin_created_successfully', 'تم إنشاء حساب المدير بنجاح ✅'));
      setShowAdminModal(false);
      fetchCompounds();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : t('failed_to_create_admin', 'فشل إنشاء الحساب'));
    } finally {
      setCreatingAdmin(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading compounds...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* Unified Page Hero */}
      <PageHero
        icon="🏘️"
        title={t('compounds_management', 'إدارة المجمعات السكنية')}
        subtitle={t('compounds_management_desc', 'إدارة جميع المجمعات وتعيين أكواد الاشتراك ومديري المجمعات')}
        accent="indigo"
        actions={canAddCompound && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all text-sm"
            data-testid="add-compound-btn"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('add_new_compound', 'إضافة مجمع جديد')}
          </button>
        )}
      />

      {/* Statistics Cards */}
      {/* Unified Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label={t('total_compounds', 'إجمالي المجمعات')}
          value={compounds.length}
          icon="🏘️"
          color="indigo"
          variant="light"
          testId="stat-total-compounds"
        />
        <StatCard
          label={t('active_compounds', 'المجمعات النشطة')}
          value={compounds.filter(c => c.is_active).length}
          icon="✅"
          color="emerald"
          variant="light"
          testId="stat-active-compounds"
        />
        <StatCard
          label={t('total_units', 'إجمالي الوحدات')}
          value={compounds.reduce((sum, c) => sum + (c.total_units || 0), 0)}
          icon="🏢"
          color="purple"
          variant="light"
          testId="stat-total-units"
        />
        <StatCard
          label={canManageCodes ? t('available_codes', 'أكواد متاحة') : t('total_residents', 'إجمالي السكان')}
          value={canManageCodes
            ? subscriptionCodes.filter(c => c.is_active).length
            : compounds.reduce((sum, c) => sum + (c.users_count || c.residents_count || 0), 0)}
          icon={canManageCodes ? '🎟️' : '👥'}
          color="amber"
          variant="light"
          testId="stat-available-codes"
        />
      </div>

      {/* Compounds Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('compound_name', 'Compound Name')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('location', 'Location')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('total_units', 'Total Units')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('admin', 'Admin')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('status', 'Status')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {t('subscription', 'Subscription')}
                </th>
                {(canManageCodes || canAddCompound) && (
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('actions', 'Actions')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {compounds.length === 0 ? (
                <tr>
                  <td colSpan={(canManageCodes || canAddCompound) ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p className="text-lg font-medium">{t('no_compounds_yet', 'No compounds registered yet')}</p>
                      <p className="text-sm text-gray-400 mt-1">{t('compounds_appear_when_register', 'Compounds will appear here when users register')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                compounds.map((compound) => (
                  <tr key={compound.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                          {compound.name?.charAt(0) || 'C'}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{compound.name || 'Unnamed Compound'}</div>
                          <div className="text-xs text-gray-500">ID: {compound.id?.substring(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{compound.location || compound.address || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{compound.total_units || 0}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{compound.admin_name || 'Not assigned'}</div>
                      <div className="text-xs text-gray-500">{compound.admin_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        compound.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {compound.is_active ? `✓ ${t('active', 'Active')}` : `✗ ${t('inactive', 'Inactive')}`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {compound.subscription_active ? (
                          <div>
                            <span className="text-green-600 font-medium">
                              {compound.subscription_type || 'Active'}
                            </span>
                            {compound.subscription_end && (
                              <div className="text-xs text-gray-500">
                                Until: {new Date(compound.subscription_end).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-red-600 font-medium">{t('no_subscription', 'No Subscription')}</span>
                        )}
                      </div>
                    </td>
                    {canManageCodes && (
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => openCodeModal(compound)}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          {t('send_code', 'Send Code')}
                        </button>
                      </td>
                    )}
                    {canAddCompound && !canManageCodes && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(compound)}
                            title={t('edit_compound', 'تعديل المجمع')}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                            data-testid={`edit-compound-${compound.id}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openCreateAdminModal(compound)}
                            title={t('create_compound_admin', 'إنشاء مدير المجمع')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                            data-testid={`create-admin-${compound.id}`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zm-4 7a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {t('create_admin', 'إنشاء مدير')}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Send Subscription Code
              </h3>
              <button
                onClick={() => setShowCodeModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">Sending code to:</p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-semibold text-gray-900">{selectedCompound?.name}</p>
                <p className="text-sm text-gray-600">{selectedCompound?.admin_email}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Subscription Code
              </label>
              <select
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Choose a code --</option>
                {subscriptionCodes.filter(c => c.is_active).map((code) => (
                  <option key={code.code} value={code.code}>
                    {code.code} - {code.type === 'lifetime' ? '∞ Lifetime' : `${code.duration_months} months`}
                    {' '}({code.current_uses}/{code.max_uses} used)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCodeModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendCode}
                disabled={!selectedCode}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
              >
                Send Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Compound Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !adding && setShowAddModal(false)}
          data-testid="add-compound-modal"
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl">
                  🏘️
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('add_new_compound', 'إضافة مجمع جديد')}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {t('add_compound_subtitle', 'سيتم ربط المجمع تلقائياً بشركتك')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => !adding && setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="close"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('compound_name', 'اسم المجمع')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCompound.name}
                  onChange={(e) => setNewCompound({ ...newCompound, name: e.target.value })}
                  placeholder={t('eg_madinaty', 'مثال: كمبوند مدينتي')}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  data-testid="add-compound-name-input"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('location', 'الموقع')}
                </label>
                <input
                  type="text"
                  value={newCompound.location}
                  onChange={(e) => setNewCompound({ ...newCompound, location: e.target.value })}
                  placeholder={t('eg_cairo_new_capital', 'مثال: العاصمة الإدارية')}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('full_address', 'العنوان التفصيلي')}
                </label>
                <input
                  type="text"
                  value={newCompound.address}
                  onChange={(e) => setNewCompound({ ...newCompound, address: e.target.value })}
                  placeholder={t('full_address_placeholder', 'الشارع، المنطقة، رقم البوابة...')}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('description', 'وصف مختصر')}
                </label>
                <textarea
                  value={newCompound.description}
                  onChange={(e) => setNewCompound({ ...newCompound, description: e.target.value })}
                  placeholder={t('description_placeholder', 'ملاحظات عن المجمع، عدد العمارات، المرافق...')}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={adding}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {t('cancel', 'إلغاء')}
              </button>
              <button
                onClick={handleAddCompound}
                disabled={adding || !newCompound.name.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                data-testid="add-compound-submit-btn"
              >
                {adding ? '...جارٍ الحفظ' : t('add_compound', 'إضافة المجمع')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Compound Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !editing && setShowEditModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
            data-testid="edit-compound-modal"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl">
                  ✏️
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t('edit_compound', 'تعديل المجمع')}
                </h3>
              </div>
              <button
                onClick={() => !editing && setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="close"
              >×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('compound_name', 'اسم المجمع')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                  data-testid="edit-compound-name-input"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('location', 'الموقع')}</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('full_address', 'العنوان التفصيلي')}</label>
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('description', 'وصف مختصر')}</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={editing}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg disabled:opacity-50"
              >{t('cancel', 'إلغاء')}</button>
              <button
                onClick={handleEditCompound}
                disabled={editing || !editForm.name.trim()}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-md disabled:opacity-60"
                data-testid="edit-compound-submit-btn"
              >{editing ? '...جارٍ الحفظ' : t('save_changes', 'حفظ التغييرات')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Compound Admin Modal */}
      {showAdminModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !creatingAdmin && setShowAdminModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
            data-testid="create-admin-modal"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl">
                  👤
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('create_compound_admin', 'إنشاء مدير المجمع')}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {t('admin_for_compound', 'حساب admin للمجمع')}: <span className="font-semibold text-emerald-600">{adminForm.compound_name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => !creatingAdmin && setShowAdminModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('full_name', 'الاسم الكامل')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={adminForm.full_name}
                  onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })}
                  placeholder={t('eg_ahmed_mostafa', 'مثال: أحمد مصطفى')}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-800 dark:text-white"
                  data-testid="admin-full-name-input"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('username', 'اسم المستخدم')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={adminForm.username}
                    onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('email', 'البريد الإلكتروني')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    placeholder="admin@example.com"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('phone', 'الهاتف')}</label>
                <input
                  type="text"
                  value={adminForm.phone}
                  onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                  placeholder="+20 1xxxxxxxxx"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('password', 'كلمة المرور')} <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    placeholder={t('min_6_chars', '6 أحرف على الأقل')}
                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-800 dark:text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-700 font-semibold rounded-lg text-sm whitespace-nowrap"
                    title={t('auto_generate', 'توليد تلقائي')}
                  >🎲 {t('generate', 'توليد')}</button>
                </div>
                <p className="mt-1.5 text-[11px] text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-200 rounded p-2">
                  ⚠️ {t('save_password_now', 'احفظ كلمة المرور الآن — لن تظهر مرة أخرى. ستحتاج إرسالها لمدير المجمع.')}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAdminModal(false)}
                disabled={creatingAdmin}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg disabled:opacity-50"
              >{t('cancel', 'إلغاء')}</button>
              <button
                onClick={handleCreateAdmin}
                disabled={creatingAdmin}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-lg shadow-md disabled:opacity-60"
                data-testid="create-admin-submit-btn"
              >{creatingAdmin ? '...جارٍ الإنشاء' : t('create_admin', 'إنشاء المدير')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompoundsManagement;
