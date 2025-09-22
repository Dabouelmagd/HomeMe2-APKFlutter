import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { formatDate } from '../utils/dateUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MaintenanceSystem = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [stats, setStats] = useState({});

  // Form state for new request
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    priority: 'normal',
    category: 'plumbing',
    location: '',
    contact_method: 'phone',
    preferred_time: '',
    images: []
  });

  const priorities = [
    { value: 'low', label: t('low_priority'), color: 'bg-gray-100 text-gray-800' },
    { value: 'normal', label: t('normal_priority'), color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: t('high_priority'), color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: t('urgent_priority'), color: 'bg-red-100 text-red-800' }
  ];

  const categories = [
    { value: 'plumbing', label: t('plumbing'), icon: '🔧' },
    { value: 'electrical', label: t('electrical'), icon: '⚡' },
    { value: 'hvac', label: t('hvac'), icon: '❄️' },
    { value: 'appliance', label: t('appliance'), icon: '🏠' },
    { value: 'general', label: t('general_maintenance'), icon: '🔨' },
    { value: 'cleaning', label: t('cleaning'), icon: '🧹' },
    { value: 'landscaping', label: t('landscaping'), icon: '🌿' },
    { value: 'security', label: t('security'), icon: '🔒' }
  ];

  const statuses = [
    { value: 'pending', label: t('pending'), color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
    { value: 'assigned', label: t('assigned'), color: 'bg-blue-100 text-blue-800', icon: UserIcon },
    { value: 'in_progress', label: t('in_progress'), color: 'bg-purple-100 text-purple-800', icon: WrenchScrewdriverIcon },
    { value: 'completed', label: t('completed'), color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
    { value: 'cancelled', label: t('cancelled'), color: 'bg-gray-100 text-gray-800', icon: ExclamationTriangleIcon }
  ];

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  const fetchMaintenanceData = async () => {
    try {
      setLoading(true);
      const [requestsRes, statsRes] = await Promise.all([
        axios.get(`${API}/maintenance/requests`),
        axios.get(`${API}/maintenance/stats`)
      ]);
      
      setRequests(requestsRes.data.requests || []);
      setStats(statsRes.data.stats || {});
    } catch (error) {
      toast.error('Failed to load maintenance data');
      console.error('Maintenance fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(newRequest).forEach(key => {
        if (key === 'images') {
          newRequest.images.forEach(image => formData.append('images', image));
        } else {
          formData.append(key, newRequest[key]);
        }
      });

      const response = await axios.post(`${API}/maintenance/requests`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Maintenance request created successfully!');
      setShowCreateModal(false);
      setNewRequest({
        title: '',
        description: '',
        priority: 'normal',
        category: 'plumbing',
        location: '',
        contact_method: 'phone',
        preferred_time: '',
        images: []
      });
      fetchMaintenanceData();
    } catch (error) {
      toast.error('Failed to create maintenance request');
      console.error('Create request error:', error);
    }
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      await axios.patch(`${API}/maintenance/requests/${requestId}/status`, {
        status: newStatus
      });
      toast.success('Request status updated successfully!');
      fetchMaintenanceData();
    } catch (error) {
      toast.error('Failed to update request status');
      console.error('Status update error:', error);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setNewRequest(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }));
  };

  const removeImage = (index) => {
    setNewRequest(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const getStatusBadge = (status) => {
    const statusConfig = statuses.find(s => s.value === status);
    if (!statusConfig) return null;
    
    const Icon = statusConfig.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = priorities.find(p => p.value === priority);
    if (!priorityConfig) return null;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityConfig.color}`}>
        {priorityConfig.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('maintenance_system')}</h1>
            <p className="text-gray-600 mt-2">{t('maintenance_system_description')}</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            {t('create_request')}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('total_requests')}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <ClipboardDocumentListIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('pending_requests')}</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('in_progress')}</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.in_progress || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <WrenchScrewdriverIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('completed')}</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.completed || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('all_requests')}
          </button>
          <button
            onClick={() => setActiveTab('my-requests')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'my-requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('my_requests')}
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('manage')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manage'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('manage_requests')}
            </button>
          )}
        </nav>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('no_requests')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('no_requests_description')}</p>
          </div>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{request.title}</h3>
                      {getStatusBadge(request.status)}
                      {getPriorityBadge(request.priority)}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <span className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-1" />
                        {formatDate(request.created_at)}
                      </span>
                      <span className="flex items-center">
                        <UserIcon className="w-4 h-4 mr-1" />
                        {request.requester_name}
                      </span>
                      <span>
                        {categories.find(c => c.value === request.category)?.icon} {categories.find(c => c.value === request.category)?.label}
                      </span>
                    </div>
                    
                    <p className="text-gray-700 mb-3">{request.description}</p>
                    
                    {request.location && (
                      <p className="text-sm text-gray-500 mb-2">
                        <strong>{t('location')}:</strong> {request.location}
                      </p>
                    )}

                    {request.assigned_to && (
                      <p className="text-sm text-gray-500 mb-2">
                        <strong>{t('assigned_to')}:</strong> {request.assigned_to_name}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0 ml-4">
                    {user?.role === 'admin' && (
                      <div className="flex space-x-2">
                        <select
                          value={request.status}
                          onChange={(e) => handleStatusUpdate(request.id, e.target.value)}
                          className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          {statuses.map(status => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {t('view_details')}
                    </button>
                  </div>
                </div>
                
                {request.images && request.images.length > 0 && (
                  <div className="mt-4 flex space-x-2">
                    {request.images.slice(0, 3).map((image, index) => (
                      <img
                        key={index}
                        src={`${BACKEND_URL}${image}`}
                        alt={`Request image ${index + 1}`}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                      />
                    ))}
                    {request.images.length > 3 && (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-sm text-gray-500">
                        +{request.images.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{t('create_maintenance_request')}</h2>
            </div>
            
            <form onSubmit={handleCreateRequest} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('request_title')} *
                </label>
                <input
                  type="text"
                  required
                  value={newRequest.title}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('brief_description_of_issue')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('category')} *
                  </label>
                  <select
                    required
                    value={newRequest.category}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.icon} {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('priority')} *
                  </label>
                  <select
                    required
                    value={newRequest.priority}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {priorities.map(priority => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('description')} *
                </label>
                <textarea
                  required
                  rows={4}
                  value={newRequest.description}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('detailed_description_of_problem')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('location')}
                </label>
                <input
                  type="text"
                  value={newRequest.location}
                  onChange={(e) => setNewRequest(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('specific_location_unit_room')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('contact_method')}
                  </label>
                  <select
                    value={newRequest.contact_method}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, contact_method: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="phone">{t('phone')}</option>
                    <option value="email">{t('email')}</option>
                    <option value="app">{t('app_notification')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('preferred_time')}
                  </label>
                  <input
                    type="datetime-local"
                    value={newRequest.preferred_time}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, preferred_time: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('images')}
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-800"
                  >
                    <PhotoIcon className="w-6 h-6" />
                    <span>{t('click_to_upload_images')}</span>
                  </label>
                  
                  {newRequest.images.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {newRequest.images.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Upload ${index + 1}`}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('create_request')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceSystem;