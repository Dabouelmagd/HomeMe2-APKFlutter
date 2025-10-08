import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { 
  KeyIcon, 
  PlusIcon, 
  TrashIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const SubscriptionCodesManagement = () => {
  const { t, i18n } = useTranslation();
  const [codes, setCodes] = useState([]);
  const [stats, setStats] = useState(null);
  const [compounds, setCompounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    duration: 'all',
    compound: 'all'
  });

  // نموذج إنشاء كود جديد
  const [newCode, setNewCode] = useState({
    duration: '1_month',
    max_uses: 1,
    compound_id: '',
    expires_in_days: '',
    custom_code: ''
  });

  // نموذج الإنشاء الجماعي
  const [bulkCreate, setBulkCreate] = useState({
    duration: '1_month',
    count: 10,
    max_uses_per_code: 1,
    compound_id: '',
    expires_in_days: ''
  });

  const durations = [
    { value: '1_month', label: t('one_month') },
    { value: '2_months', label: t('two_months') },
    { value: '3_months', label: t('three_months') },
    { value: '6_months', label: t('six_months') },
    { value: '1_year', label: t('one_year') }
  ];

  const statusOptions = [
    { value: 'all', label: t('all_statuses'), color: 'bg-gray-100 text-gray-800' },
    { value: 'active', label: t('active'), color: 'bg-green-100 text-green-800' },
    { value: 'used', label: t('used'), color: 'bg-blue-100 text-blue-800' },
    { value: 'expired', label: t('expired'), color: 'bg-red-100 text-red-800' },
    { value: 'disabled', label: t('disabled'), color: 'bg-gray-100 text-gray-800' }
  ];

  useEffect(() => {
    fetchCodes();
    fetchStats();
    fetchCompounds();
  }, [filters]);

  const fetchCodes = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.duration !== 'all') params.append('duration', filters.duration);
      if (filters.compound !== 'all') params.append('compound_id', filters.compound);
      
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/subscription-codes?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCodes(response.data);
    } catch (error) {
      console.error('Error fetching codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/subscription-codes/stats`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCompounds = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/compounds`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompounds(response.data || []);
    } catch (error) {
      console.error('Error fetching compounds:', error);
    }
  };

  const handleCreateCode = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/subscription-codes`,
        {
          ...newCode,
          expires_in_days: newCode.expires_in_days ? parseInt(newCode.expires_in_days) : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(response.data.message);
        setShowCreateModal(false);
        setNewCode({
          duration: '1_month',
          max_uses: 1,
          compound_id: '',
          expires_in_days: '',
          custom_code: ''
        });
        fetchCodes();
        fetchStats();
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error('Error creating code:', error);
      alert(t('error_creating_code'));
    }
  };

  const handleBulkCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/subscription-codes/bulk`,
        {
          ...bulkCreate,
          expires_in_days: bulkCreate.expires_in_days ? parseInt(bulkCreate.expires_in_days) : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(response.data.message);
        setShowBulkModal(false);
        setBulkCreate({
          duration: '1_month',
          count: 10,
          max_uses_per_code: 1,
          compound_id: '',
          expires_in_days: ''
        });
        fetchCodes();
        fetchStats();
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error('Error creating bulk codes:', error);
      alert(t('error_creating_codes'));
    }
  };

  const handleDeleteCode = async (codeId) => {
    if (window.confirm(t('confirm_delete_code'))) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(
          `${process.env.REACT_APP_BACKEND_URL}/api/admin/subscription-codes/${codeId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert(t('code_deleted_successfully'));
        fetchCodes();
        fetchStats();
      } catch (error) {
        console.error('Error deleting code:', error);
        alert(t('error_deleting_code'));
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert(t('code_copied'));
  };

  const getStatusBadge = (status) => {
    const statusConfig = statusOptions.find(s => s.value === status) || statusOptions[0];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
        {statusConfig.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale);
  };

  const getDurationLabel = (duration) => {
    const durationConfig = durations.find(d => d.value === duration);
    return durationConfig ? durationConfig.label : duration;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <KeyIcon className="h-8 w-8 mr-3 text-blue-600" />
            {t('subscription_codes_management')}
          </h1>
          <p className="text-gray-600 mt-2">{t('subscription_codes_description')}</p>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={() => setShowStatsModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
          >
            <ChartBarIcon className="h-5 w-5 mr-2" />
            {t('statistics')}
          </button>
          
          <button
            onClick={() => setShowBulkModal(true)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center"
          >
            <ClipboardDocumentListIcon className="h-5 w-5 mr-2" />
            {t('bulk_create')}
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            {t('create_new_code')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center">
              <KeyIcon className="h-8 w-8 text-blue-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold text-blue-900">{stats.total_codes}</p>
                <p className="text-blue-600">{t('total_codes')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold text-green-900">{stats.active_codes}</p>
                <p className="text-green-600">{t('active_codes')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-6">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-purple-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold text-purple-900">{stats.total_activations}</p>
                <p className="text-purple-600">{t('total_activations')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-6">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-orange-600" />
              <div className="mr-4">
                <p className="text-2xl font-bold text-orange-900">{stats.active_subscriptions}</p>
                <p className="text-orange-600">{t('active_subscriptions')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('status')}</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('duration')}</label>
            <select
              value={filters.duration}
              onChange={(e) => setFilters(prev => ({ ...prev, duration: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">{t('all_durations')}</option>
              {durations.map(duration => (
                <option key={duration.value} value={duration.value}>{duration.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('compound')}</label>
            <select
              value={filters.compound}
              onChange={(e) => setFilters(prev => ({ ...prev, compound: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">{t('all_compounds')}</option>
              {Array.isArray(compounds) && compounds.map(compound => (
                <option key={compound.id} value={compound.id}>{compound.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Codes Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t('codes_list')} ({codes.length})</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('code')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('duration')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('usage')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('creation_date')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {codes.map((code) => (
                <tr key={code.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono">
                        {code.code}
                      </code>
                      <button
                        onClick={() => copyToClipboard(code.code)}
                        className="mr-2 text-gray-400 hover:text-blue-600"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {getDurationLabel(code.duration)}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(code.status)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {code.current_uses}/{code.max_uses}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(code.created_at)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedCode(code)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteCode(code.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {codes.length === 0 && (
            <div className="text-center py-12">
              <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('no_codes_found')}</h3>
              <p className="mt-1 text-sm text-gray-500">{t('start_creating_codes')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Code Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{t('create_new_subscription_code')}</h2>
            
            <form onSubmit={handleCreateCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('subscription_duration')}</label>
                <select
                  value={newCode.duration}
                  onChange={(e) => setNewCode(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                >
                  {durations.map(duration => (
                    <option key={duration.value} value={duration.value}>{duration.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('max_uses_allowed')}</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={newCode.max_uses}
                  onChange={(e) => setNewCode(prev => ({ ...prev, max_uses: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('custom_code_optional')}</label>
                <input
                  type="text"
                  value={newCode.custom_code}
                  onChange={(e) => setNewCode(prev => ({ ...prev, custom_code: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder={t('leave_empty_for_auto')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('code_expiry_days')}</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={newCode.expires_in_days}
                  onChange={(e) => setNewCode(prev => ({ ...prev, expires_in_days: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder={t('leave_empty_for_permanent')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('compound_optional')}</label>
                <select
                  value={newCode.compound_id}
                  onChange={(e) => setNewCode(prev => ({ ...prev, compound_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">{t('all_compounds')}</option>
                  {Array.isArray(compounds) && compounds.map(compound => (
                    <option key={compound.id} value={compound.id}>{compound.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                  {t('create_code')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Create Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{t('create_multiple_codes')}</h2>
            
            <form onSubmit={handleBulkCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('subscription_duration')}</label>
                <select
                  value={bulkCreate.duration}
                  onChange={(e) => setBulkCreate(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                >
                  {durations.map(duration => (
                    <option key={duration.value} value={duration.value}>{duration.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('number_of_codes')}</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={bulkCreate.count}
                  onChange={(e) => setBulkCreate(prev => ({ ...prev, count: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('uses_per_code')}</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={bulkCreate.max_uses_per_code}
                  onChange={(e) => setBulkCreate(prev => ({ ...prev, max_uses_per_code: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('codes_expiry_days')}</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={bulkCreate.expires_in_days}
                  onChange={(e) => setBulkCreate(prev => ({ ...prev, expires_in_days: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder={t('leave_empty_for_permanent_codes')}
                />
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700"
                >
                  {t('create_codes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && stats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{t('detailed_statistics')}</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('general_statistics')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-sm text-gray-600">{t('total_codes')}</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_codes}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-sm text-gray-600">{t('active_codes')}</p>
                    <p className="text-2xl font-bold text-green-600">{stats.active_codes}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-sm text-gray-600">{t('used_codes')}</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.used_codes}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-sm text-gray-600">{t('expired_codes')}</p>
                    <p className="text-2xl font-bold text-red-600">{stats.expired_codes}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('codes_by_duration')}</h3>
                <div className="space-y-2">
                  {Object.entries(stats.codes_by_duration).map(([duration, count]) => (
                    <div key={duration} className="flex justify-between py-2 border-b">
                      <span>{getDurationLabel(duration)}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('subscription_statistics')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-sm text-gray-600">{t('total_activations')}</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.total_activations}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="text-sm text-gray-600">{t('active_subscriptions')}</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.active_subscriptions}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end pt-6">
              <button
                onClick={() => setShowStatsModal(false)}
                className="bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionCodesManagement;