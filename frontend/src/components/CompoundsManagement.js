import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../hooks/usePermissions';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading compounds...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🏘️ {t('compounds_management', 'Compounds Management')}
          </h1>
          <p className="text-gray-600">
            {t('compounds_management_desc', 'Manage all residential compounds and assign subscription codes')}
          </p>
        </div>
        {canAddCompound && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-teal-700 transition-all"
            data-testid="add-compound-btn"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('add_new_compound', 'إضافة مجمع جديد')}
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">{t('total_compounds', 'Total Compounds')}</p>
              <p className="text-3xl font-bold text-blue-800">{compounds.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">{t('active_compounds', 'Active Compounds')}</p>
              <p className="text-3xl font-bold text-green-800">
                {compounds.filter(c => c.is_active).length}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">{t('total_units', 'Total Units')}</p>
              <p className="text-3xl font-bold text-purple-800">
                {compounds.reduce((sum, c) => sum + (c.total_units || 0), 0)}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 text-sm font-medium">
                {canManageCodes ? t('available_codes', 'Available Codes') : t('total_residents', 'إجمالي السكان')}
              </p>
              <p className="text-3xl font-bold text-orange-800">
                {canManageCodes
                  ? subscriptionCodes.filter(c => c.is_active).length
                  : compounds.reduce((sum, c) => sum + (c.users_count || c.residents_count || 0), 0)}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          </div>
        </div>
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
                {canManageCodes && (
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('actions', 'Actions')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {compounds.length === 0 ? (
                <tr>
                  <td colSpan={canManageCodes ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
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
    </div>
  );
};

export default CompoundsManagement;
