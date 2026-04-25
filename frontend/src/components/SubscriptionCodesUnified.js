import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
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
  ArrowPathIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const API = process.env.REACT_APP_BACKEND_URL;

const SubscriptionCodesUnified = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  // State
  const [codes, setCodes] = useState([]);
  const [stats, setStats] = useState(null);
  const [compounds, setCompounds] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedCodeForRenew, setSelectedCodeForRenew] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    duration: 'all',
    compound: 'all',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // Forms
  const [newCode, setNewCode] = useState({
    duration: '3_months',
    max_uses: 1,
    compound_id: '',
    expires_in_days: 365,
    notes: ''
  });

  const [bulkCreate, setBulkCreate] = useState({
    duration: '3_months',
    count: 10,
    max_uses_per_code: 1,
    compound_id: '',
    expires_in_days: 365
  });

  const durations = [
    { value: '1_month', label: t('one_month', 'شهر واحد'), months: 1 },
    { value: '3_months', label: t('three_months', '3 أشهر'), months: 3 },
    { value: '6_months', label: t('six_months', '6 أشهر'), months: 6 },
    { value: '9_months', label: t('nine_months', '9 أشهر'), months: 9 },
    { value: '12_months', label: t('one_year', 'سنة واحدة'), months: 12 }
  ];

  const statusOptions = [
    { value: 'all', label: t('all_statuses', 'جميع الحالات'), color: 'bg-gray-100 text-gray-800' },
    { value: 'active', label: t('active', 'نشط'), color: 'bg-green-100 text-green-800' },
    { value: 'used', label: t('used', 'مستخدم'), color: 'bg-blue-100 text-blue-800' },
    { value: 'expired', label: t('expired', 'منتهي'), color: 'bg-red-100 text-red-800' },
    { value: 'disabled', label: t('disabled', 'معطل'), color: 'bg-gray-100 text-gray-800' }
  ];

  // Effects
  useEffect(() => {
    fetchCodes();
    fetchStats();
    fetchCompounds();
  }, [filters.status, filters.duration, filters.compound]);

  // API Calls
  const fetchCodes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.duration !== 'all') params.append('duration', filters.duration);
      if (filters.compound !== 'all') params.append('compound_id', filters.compound);
      params.append('include_inactive', 'true');
      
      const response = await axios.get(`${API}/api/subscription-codes/list?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCodes(response.data.codes || []);
    } catch (error) {
      console.error('Error fetching codes:', error);
      if (error.response?.status === 403) {
        toast.error(t('only_app_owner_can_manage_codes', 'فقط مالك التطبيق يمكنه إدارة الأكواد'));
      } else {
        toast.error(t('failed_to_load_codes', 'فشل في تحميل الأكواد'));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/subscription-codes/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCompounds = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/compounds/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
        `${API}/api/subscription-codes/create`,
        {
          code_type: newCode.duration,
          duration_months: durations.find(d => d.value === newCode.duration)?.months || 3,
          max_uses: newCode.max_uses,
          expires_in_days: newCode.expires_in_days || 365,
          compound_id: newCode.compound_id || null,
          notes: newCode.notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(t('code_created_successfully', 'تم إنشاء الكود بنجاح'));
      setShowCreateModal(false);
      setNewCode({ duration: '3_months', max_uses: 1, compound_id: '', expires_in_days: 365, notes: '' });
      fetchCodes();
      fetchStats();
    } catch (error) {
      console.error('Error creating code:', error);
      toast.error(error.response?.data?.detail || t('error_creating_code', 'خطأ في إنشاء الكود'));
    }
  };

  const handleBulkCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/api/subscription-codes/bulk-create`,
        {
          duration: bulkCreate.duration,
          count: bulkCreate.count,
          max_uses_per_code: bulkCreate.max_uses_per_code,
          compound_id: bulkCreate.compound_id || null,
          expires_in_days: bulkCreate.expires_in_days || 365
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(t('codes_created_successfully', `تم إنشاء ${response.data.created_count} كود بنجاح`));
      setShowBulkModal(false);
      setBulkCreate({ duration: '3_months', count: 10, max_uses_per_code: 1, compound_id: '', expires_in_days: 365 });
      fetchCodes();
      fetchStats();
    } catch (error) {
      console.error('Error bulk creating codes:', error);
      toast.error(error.response?.data?.detail || t('error_creating_codes', 'خطأ في إنشاء الأكواد'));
    }
  };

  const handleDeleteCode = async (code) => {
    if (window.confirm(t('confirm_delete_code', 'هل أنت متأكد من حذف هذا الكود؟'))) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API}/api/subscription-codes/${code.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(t('code_deleted', 'تم حذف الكود'));
        fetchCodes();
        fetchStats();
      } catch (error) {
        console.error('Error deleting code:', error);
        toast.error(t('error_deleting_code', 'خطأ في حذف الكود'));
      }
    }
  };

  const handleToggleCode = async (code) => {
    try {
      const token = localStorage.getItem('token');
      const action = code.is_active ? 'deactivate' : 'activate';
      await axios.post(`${API}/api/subscription-codes/${code.id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(code.is_active ? t('code_deactivated', 'تم تعطيل الكود') : t('code_activated', 'تم تفعيل الكود'));
      fetchCodes();
      fetchStats();
    } catch (error) {
      console.error('Error toggling code:', error);
      toast.error(t('error_updating_code', 'خطأ في تحديث الكود'));
    }
  };

  const handleRenewCode = async () => {
    if (!selectedCodeForRenew) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/api/subscription-codes/${selectedCodeForRenew.id}/renew`,
        {
          duration: selectedCodeForRenew.code_type,
          max_uses: selectedCodeForRenew.max_uses,
          expires_in_days: 365
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(t('code_renewed_successfully', 'تم تجديد الكود بنجاح'));
      setShowRenewModal(false);
      setSelectedCodeForRenew(null);
      fetchCodes();
      fetchStats();
    } catch (error) {
      console.error('Error renewing code:', error);
      toast.error(t('error_renewing_code', 'خطأ في تجديد الكود'));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success(t('code_copied', 'تم نسخ الكود'));
  };

  // Helpers
  const getStatusBadge = (code) => {
    let status = 'active';
    if (!code.is_active) status = 'disabled';
    else if (code.times_used >= code.max_uses) status = 'used';
    else if (code.expires_at && new Date(code.expires_at) < new Date()) status = 'expired';
    
    const config = statusOptions.find(s => s.value === status) || statusOptions[0];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('no_expiry', 'بدون انتهاء');
    const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale);
  };

  const getDurationLabel = (duration) => {
    const config = durations.find(d => d.value === duration);
    return config ? config.label : duration;
  };

  // Filtered codes
  const filteredCodes = codes.filter(code => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return code.code?.toLowerCase().includes(search) || 
             code.notes?.toLowerCase().includes(search);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`p-6 max-w-7xl mx-auto ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <KeyIcon className={`h-8 w-8 text-blue-600 ${isRTL ? 'ml-3' : 'mr-3'}`} />
            {t('subscription_codes_management', 'إدارة أكواد الاشتراك')}
          </h1>
          <p className="text-gray-600 mt-2">{t('subscription_codes_description', 'إنشاء وإدارة أكواد الاشتراك للمستخدمين')}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowStatsModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center text-sm"
          >
            <ChartBarIcon className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('statistics', 'الإحصائيات')}
          </button>
          
          <button
            onClick={() => setShowBulkModal(true)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center text-sm"
          >
            <ClipboardDocumentListIcon className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('bulk_create', 'إنشاء متعدد')}
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center text-sm"
          >
            <PlusIcon className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('create_new_code', 'إنشاء كود جديد')}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <KeyIcon className="h-8 w-8 text-blue-600" />
              <div className={isRTL ? 'mr-3' : 'ml-3'}>
                <p className="text-2xl font-bold text-blue-900">{stats.total_codes || codes.length}</p>
                <p className="text-sm text-blue-600">{t('total_codes', 'إجمالي الأكواد')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className={isRTL ? 'mr-3' : 'ml-3'}>
                <p className="text-2xl font-bold text-green-900">{stats.active_codes || codes.filter(c => c.is_active).length}</p>
                <p className="text-sm text-green-600">{t('active_codes', 'الأكواد النشطة')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <UsersIcon className="h-8 w-8 text-purple-600" />
              <div className={isRTL ? 'mr-3' : 'ml-3'}>
                <p className="text-2xl font-bold text-purple-900">{stats.total_activations || codes.reduce((sum, c) => sum + c.times_used, 0)}</p>
                <p className="text-sm text-purple-600">{t('total_activations', 'إجمالي التفعيلات')}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-orange-600" />
              <div className={isRTL ? 'mr-3' : 'ml-3'}>
                <p className="text-2xl font-bold text-orange-900">{stats.active_subscriptions || 0}</p>
                <p className="text-sm text-orange-600">{t('active_subscriptions', 'الاشتراكات النشطة')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Toggle & Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('search_codes', 'البحث في الأكواد...')}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-4 py-2 rounded-lg border ${showFilters ? 'bg-blue-50 border-blue-300' : 'border-gray-300'}`}
          >
            <FunnelIcon className={`h-5 w-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('filters', 'الفلاتر')}
          </button>
        </div>
        
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('status', 'الحالة')}</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('duration', 'المدة')}</label>
              <select
                value={filters.duration}
                onChange={(e) => setFilters(prev => ({ ...prev, duration: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">{t('all_durations', 'جميع المدد')}</option>
                {durations.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('compound', 'المجمع')}</label>
              <select
                value={filters.compound}
                onChange={(e) => setFilters(prev => ({ ...prev, compound: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="all">{t('all_compounds', 'جميع المجمعات')}</option>
                {compounds.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Codes Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('code', 'الكود')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('duration', 'المدة')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('usage', 'الاستخدام')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('status', 'الحالة')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('expires_at', 'تاريخ الانتهاء')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('actions', 'الإجراءات')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    {t('no_codes_found', 'لا توجد أكواد')}
                  </td>
                </tr>
              ) : (
                filteredCodes.map(code => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <code className="bg-gray-100 px-3 py-1 rounded font-mono text-sm">{code.code}</code>
                        <button
                          onClick={() => copyToClipboard(code.code)}
                          className={`${isRTL ? 'mr-2' : 'ml-2'} text-gray-400 hover:text-blue-600`}
                          title={t('copy', 'نسخ')}
                        >
                          <DocumentDuplicateIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getDurationLabel(code.code_type || code.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.times_used} / {code.max_uses}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(code)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(code.expires_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleCode(code)}
                          className={`p-1.5 rounded ${code.is_active ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={code.is_active ? t('deactivate', 'تعطيل') : t('activate', 'تفعيل')}
                        >
                          {code.is_active ? <XCircleIcon className="h-5 w-5" /> : <CheckCircleIcon className="h-5 w-5" />}
                        </button>
                        <button
                          onClick={() => { setSelectedCodeForRenew(code); setShowRenewModal(true); }}
                          className="p-1.5 rounded text-blue-600 hover:bg-blue-50"
                          title={t('renew', 'تجديد')}
                        >
                          <ArrowPathIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCode(code)}
                          className="p-1.5 rounded text-red-600 hover:bg-red-50"
                          title={t('delete', 'حذف')}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Code Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{t('create_new_code', 'إنشاء كود جديد')}</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('duration', 'المدة')}</label>
                <select
                  value={newCode.duration}
                  onChange={(e) => setNewCode(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {durations.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('max_uses', 'الحد الأقصى للاستخدام')}</label>
                <input
                  type="number"
                  min="1"
                  value={newCode.max_uses}
                  onChange={(e) => setNewCode(prev => ({ ...prev, max_uses: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('compound', 'المجمع')} ({t('optional', 'اختياري')})</label>
                <select
                  value={newCode.compound_id}
                  onChange={(e) => setNewCode(prev => ({ ...prev, compound_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">{t('all_compounds', 'جميع المجمعات')}</option>
                  {compounds.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('expires_in_days', 'ينتهي بعد (أيام)')}</label>
                <input
                  type="number"
                  min="1"
                  value={newCode.expires_in_days}
                  onChange={(e) => setNewCode(prev => ({ ...prev, expires_in_days: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes', 'ملاحظات')}</label>
                <textarea
                  value={newCode.notes}
                  onChange={(e) => setNewCode(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows="2"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('cancel', 'إلغاء')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('create', 'إنشاء')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Create Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{t('bulk_create_codes', 'إنشاء أكواد متعددة')}</h2>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleBulkCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('number_of_codes', 'عدد الأكواد')}</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={bulkCreate.count}
                  onChange={(e) => setBulkCreate(prev => ({ ...prev, count: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('duration', 'المدة')}</label>
                <select
                  value={bulkCreate.duration}
                  onChange={(e) => setBulkCreate(prev => ({ ...prev, duration: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {durations.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('max_uses_per_code', 'الحد الأقصى لكل كود')}</label>
                <input
                  type="number"
                  min="1"
                  value={bulkCreate.max_uses_per_code}
                  onChange={(e) => setBulkCreate(prev => ({ ...prev, max_uses_per_code: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('compound', 'المجمع')} ({t('optional', 'اختياري')})</label>
                <select
                  value={bulkCreate.compound_id}
                  onChange={(e) => setBulkCreate(prev => ({ ...prev, compound_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">{t('all_compounds', 'جميع المجمعات')}</option>
                  {compounds.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('cancel', 'إلغاء')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  {t('create_codes', 'إنشاء الأكواد')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && stats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{t('detailed_statistics', 'إحصائيات مفصلة')}</h2>
              <button onClick={() => setShowStatsModal(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">{t('total_codes', 'إجمالي الأكواد')}</p>
                  <p className="text-2xl font-bold">{stats.total_codes || codes.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600">{t('active_codes', 'الأكواد النشطة')}</p>
                  <p className="text-2xl font-bold text-green-700">{stats.active_codes || codes.filter(c => c.is_active).length}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600">{t('used_codes', 'الأكواد المستخدمة')}</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.used_codes || codes.filter(c => c.times_used > 0).length}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-600">{t('expired_codes', 'الأكواد المنتهية')}</p>
                  <p className="text-2xl font-bold text-red-700">{stats.expired_codes || 0}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">{t('by_duration', 'حسب المدة')}</h3>
                <div className="space-y-2">
                  {stats.by_duration ? Object.entries(stats.by_duration).map(([duration, count]) => (
                    <div key={duration} className="flex justify-between items-center">
                      <span className="text-gray-600">{getDurationLabel(duration)}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  )) : durations.map(d => (
                    <div key={d.value} className="flex justify-between items-center">
                      <span className="text-gray-600">{d.label}</span>
                      <span className="font-medium">{codes.filter(c => c.code_type === d.value || c.duration === d.value).length}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowStatsModal(false)}
              className="w-full mt-6 py-2 px-4 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              {t('close', 'إغلاق')}
            </button>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {showRenewModal && selectedCodeForRenew && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{t('renew_code', 'تجديد الكود')}</h2>
              <button onClick={() => { setShowRenewModal(false); setSelectedCodeForRenew(null); }} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              {t('renew_code_confirm', 'سيتم إعادة تعيين استخدام الكود وتمديد صلاحيته. هل تريد المتابعة؟')}
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-600">{t('code', 'الكود')}</p>
              <code className="font-mono text-lg">{selectedCodeForRenew.code}</code>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRenewModal(false); setSelectedCodeForRenew(null); }}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('cancel', 'إلغاء')}
              </button>
              <button
                onClick={handleRenewCode}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('renew', 'تجديد')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionCodesUnified;
