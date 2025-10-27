import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  TicketIcon,
  PlusIcon,
  ClipboardDocumentIcon,
  XCircleIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const API = process.env.REACT_APP_BACKEND_URL;

const SubscriptionCodes = () => {
  const { t } = useTranslation();
  
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [formData, setFormData] = useState({
    code_type: '3_months',
    duration_months: 3,
    discount_percentage: null,
    max_uses: 1,
    expires_at: '',
    notes: ''
  });

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/subscription-codes/list?include_inactive=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCodes(response.data.codes || []);
    } catch (error) {
      console.error('Error fetching codes:', error);
      if (error.response?.status === 403) {
        toast.error(t('only_app_owner_can_manage_codes'));
      } else {
        toast.error(t('failed_to_load_codes'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/api/subscription-codes/create`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: formData
        }
      );

      if (response.data.success) {
        toast.success(t('code_created_successfully'));
        setShowCreateModal(false);
        fetchCodes();
        // Reset form
        setFormData({
          code_type: '3_months',
          duration_months: 3,
          discount_percentage: null,
          max_uses: 1,
          expires_at: '',
          notes: ''
        });
      }
    } catch (error) {
      console.error('Error creating code:', error);
      toast.error(t('failed_to_create_code'));
    }
  };

  const handleDeactivateCode = async (code) => {
    setConfirmAction({
      type: 'deactivate',
      code: code,
      title: t('confirm_deactivate'),
      message: t('deactivate_code_warning'),
      confirmText: t('deactivate'),
      confirmColor: 'orange'
    });
    setShowConfirmModal(true);
  };

  const handleDeleteCode = async (code) => {
    setConfirmAction({
      type: 'delete',
      code: code,
      title: t('confirm_delete'),
      message: t('delete_code_warning'),
      confirmText: t('delete'),
      confirmColor: 'red'
    });
    setShowConfirmModal(true);
  };

  const executeAction = async () => {
    if (!confirmAction) return;

    try {
      const token = localStorage.getItem('token');
      
      if (confirmAction.type === 'deactivate') {
        await axios.post(
          `${API}/api/subscription-codes/${confirmAction.code}/deactivate`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success(t('code_deactivated'));
      } else if (confirmAction.type === 'delete') {
        await axios.delete(
          `${API}/api/subscription-codes/${confirmAction.code}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success(t('code_deleted'));
      }
      
      fetchCodes();
    } catch (error) {
      console.error(`Error ${confirmAction.type}ing code:`, error);
      toast.error(t(`failed_to_${confirmAction.type}_code`));
    } finally {
      setShowConfirmModal(false);
      setConfirmAction(null);
    }
  };

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code);
    toast.success(t('code_copied'));
  };

  const getCodeTypeName = (type) => {
    const types = {
      trial: t('trial_30_days'),
      '3_months': t('3_months'),
      '6_months': t('6_months'),
      '9_months': t('9_months'),
      '12_months': t('12_months'),
      discount: t('discount_code')
    };
    return types[type] || type;
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('no_expiry');
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <TicketIcon className="h-8 w-8 text-blue-600 mr-3" />
            {t('subscription_codes')}
          </h1>
          <p className="text-gray-600 mt-1">{t('manage_subscription_codes_desc')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <PlusIcon className="h-5 w-5" />
          <span>{t('create_new_code')}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-sm text-gray-500">{t('total_codes')}</p>
          <p className="text-2xl font-bold text-gray-900">{codes.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-sm text-gray-500">{t('active_codes')}</p>
          <p className="text-2xl font-bold text-green-600">
            {codes.filter(c => c.is_active).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-sm text-gray-500">{t('used_codes')}</p>
          <p className="text-2xl font-bold text-blue-600">
            {codes.filter(c => c.times_used > 0).length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <p className="text-sm text-gray-500">{t('unused_codes')}</p>
          <p className="text-2xl font-bold text-purple-600">
            {codes.filter(c => c.times_used === 0 && c.is_active).length}
          </p>
        </div>
      </div>

      {/* Codes Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('code')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('duration')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('usage')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expires')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {codes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    {t('no_codes_found')}
                  </td>
                </tr>
              ) : (
                codes.map((code) => (
                  <tr key={code._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {code.code}
                        </code>
                        <button
                          onClick={() => copyToClipboard(code.code)}
                          className="text-blue-600 hover:text-blue-800"
                          title={t('copy_code')}
                        >
                          <ClipboardDocumentIcon className="h-5 w-5" />
                        </button>
                      </div>
                      {code.notes && (
                        <p className="text-xs text-gray-500 mt-1">{code.notes}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {getCodeTypeName(code.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {code.duration_months} {t('months')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {code.times_used} / {code.max_uses}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {formatDate(code.expires_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {code.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          {t('active')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          {t('inactive')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {code.is_active && (
                          <button
                            onClick={() => handleDeactivateCode(code.code)}
                            className="text-orange-600 hover:text-orange-900"
                            title={t('deactivate')}
                          >
                            <XCircleIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCode(code.code)}
                          className="text-red-600 hover:text-red-900"
                          title={t('delete')}
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('create_new_code')}
            </h2>

            <form onSubmit={handleCreateCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('code_type')}
                </label>
                <select
                  value={formData.code_type}
                  onChange={(e) => {
                    const type = e.target.value;
                    const months = type === 'trial' ? 1 : 
                                   type === '3_months' ? 3 :
                                   type === '6_months' ? 6 :
                                   type === '9_months' ? 9 :
                                   type === '12_months' ? 12 : 3;
                    setFormData({ ...formData, code_type: type, duration_months: months });
                  }}
                  className="form-input w-full"
                  required
                >
                  <option value="trial">{t('trial_30_days')}</option>
                  <option value="3_months">{t('3_months')}</option>
                  <option value="6_months">{t('6_months')}</option>
                  <option value="9_months">{t('9_months')}</option>
                  <option value="12_months">{t('12_months')}</option>
                  <option value="discount">{t('discount_code')}</option>
                </select>
              </div>

              {formData.code_type === 'discount' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('discount_percentage')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.discount_percentage || ''}
                    onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) })}
                    className="form-input w-full"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('max_uses')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_uses}
                  onChange={(e) => setFormData({ ...formData, max_uses: parseInt(e.target.value) })}
                  className="form-input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('expiry_date')} ({t('optional')})
                </label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('notes')} ({t('optional')})
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="form-input w-full"
                  rows="3"
                  placeholder={t('add_notes_about_code')}
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  {t('cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('create_code')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {confirmAction.title}
            </h2>
            <p className="text-gray-600 mb-6">
              {confirmAction.message}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
                className="btn btn-secondary"
              >
                {t('cancel')}
              </button>
              <button
                onClick={executeAction}
                className={`btn ${confirmAction.confirmColor === 'red' ? 'btn-danger' : 'btn-warning'}`}
              >
                {confirmAction.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionCodes;
