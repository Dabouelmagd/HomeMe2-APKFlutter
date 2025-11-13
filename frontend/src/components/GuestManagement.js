import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  UsersIcon,
  UserPlusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  IdentificationIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  QrCodeIcon,
  PrinterIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { formatDate, formatRelativeTime } from '../utils/dateUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GuestManagement = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('guests');
  const [guests, setGuests] = useState([]);
  const [visitRequests, setVisitRequests] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSecurityCheckModal, setShowSecurityCheckModal] = useState(false);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    search: ''
  });
  const [securityCheckForm, setSecurityCheckForm] = useState({
    action: 'check_in', // check_in or check_out
    security_notes: '',
    id_verified: false,
    temperature_check: '',
    photo_taken: false
  });

  // Form state for new guest/visit request
  const [guestForm, setGuestForm] = useState({
    visitor_name: '',
    visitor_phone: '',
    visitor_email: '',
    visitor_id_number: '',
    visit_purpose: '',
    visit_date: '',
    visit_time: '',
    duration_hours: 2,
    unit_number: '',
    host_name: '',
    host_phone: '',
    special_instructions: '',
    vehicle_plate: '',
    escort_required: false,
    pre_approved: false
  });

  const visitPurposes = [
    { value: 'family_visit', label: t('family_visit'), icon: '👨‍👩‍👧‍👦' },
    { value: 'business_meeting', label: t('business_meeting'), icon: '💼' },
    { value: 'delivery', label: t('delivery'), icon: '📦' },
    { value: 'maintenance', label: t('maintenance_visit'), icon: '🔧' },
    { value: 'healthcare', label: t('healthcare_visit'), icon: '🏥' },
    { value: 'social_event', label: t('social_event'), icon: '🎉' },
    { value: 'other', label: t('other'), icon: '📝' }
  ];

  const guestStatuses = [
    { value: 'pending', label: t('pending'), color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
    { value: 'approved', label: t('approved'), color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
    { value: 'rejected', label: t('rejected'), color: 'bg-red-100 text-red-800', icon: XCircleIcon },
    { value: 'checked_in', label: t('checked_in'), color: 'bg-blue-100 text-blue-800', icon: IdentificationIcon },
    { value: 'checked_out', label: t('checked_out'), color: 'bg-gray-100 text-gray-800', icon: UsersIcon },
    { value: 'expired', label: t('expired'), color: 'bg-orange-100 text-orange-800', icon: ExclamationTriangleIcon }
  ];

  useEffect(() => {
    fetchGuestData();
  }, []);

  const fetchGuestData = async () => {
    try {
      setLoading(true);
      const [guestsRes, requestsRes, statsRes, securityLogsRes] = await Promise.all([
        axios.get(`${API}/guests`),
        axios.get(`${API}/visit-requests`),
        axios.get(`${API}/guests/stats`),
        axios.get(`${API}/security/visitor-logs`).catch(() => ({ data: { logs: [] } }))
      ]);
      
      setGuests(guestsRes.data.guests || []);
      setVisitRequests(requestsRes.data.requests || []);
      setSecurityLogs(securityLogsRes.data.logs || []);
      setStats(statsRes.data.stats || {});
    } catch (error) {
      toast.error('Failed to load guest data');
      console.error('Guest fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGuest = async (e) => {
    e.preventDefault();
    try {
      const formData = {
        ...guestForm,
        visit_date: guestForm.visit_date + 'T' + guestForm.visit_time
      };

      const response = await axios.post(`${API}/visit-requests`, formData);

      toast.success(t('visit_request_created_successfully'));
      setShowAddModal(false);
      setGuestForm({
        visitor_name: '',
        visitor_phone: '',
        visitor_email: '',
        visitor_id_number: '',
        visit_purpose: '',
        visit_date: '',
        visit_time: '',
        duration_hours: 2,
        unit_number: '',
        host_name: '',
        host_phone: '',
        special_instructions: '',
        vehicle_plate: '',
        escort_required: false,
        pre_approved: false
      });
      fetchGuestData();
    } catch (error) {
      toast.error(t('failed_to_create_visit_request'));
      console.error('Create guest error:', error);
    }
  };

  const handleApproveRequest = async (requestId) => {
    try {
      await axios.patch(`${API}/visit-requests/${requestId}/approve`);
      toast.success('Visit request approved successfully!');
      fetchGuestData();
    } catch (error) {
      toast.error('Failed to approve visit request');
      console.error('Approve request error:', error);
    }
  };

  const handleRejectRequest = async (requestId, reason = '') => {
    try {
      const formData = new FormData();
      if (reason) {
        formData.append('reason', reason);
      }
      await axios.patch(`${API}/visit-requests/${requestId}/reject`, formData);
      toast.success('Visit request rejected');
      fetchGuestData();
    } catch (error) {
      toast.error('Failed to reject visit request');
      console.error('Reject request error:', error);
    }
  };

  const handleSecurityCheck = async () => {
    if (!selectedGuest) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/security/visitor-check`,
        {
          guest_id: selectedGuest.id || selectedGuest._id,
          visitor_name: selectedGuest.visitor_name,
          action: securityCheckForm.action,
          security_notes: securityCheckForm.security_notes,
          id_verified: securityCheckForm.id_verified,
          temperature_check: securityCheckForm.temperature_check,
          photo_taken: securityCheckForm.photo_taken,
          checked_by: user.username || user.email,
          compound_id: user.compound_id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(
        securityCheckForm.action === 'check_in' 
          ? t('visitor_checked_in_successfully', 'Visitor checked in successfully!')
          : t('visitor_checked_out_successfully', 'Visitor checked out successfully!')
      );
      
      setShowSecurityCheckModal(false);
      setSelectedGuest(null);
      setSecurityCheckForm({
        action: 'check_in',
        security_notes: '',
        id_verified: false,
        temperature_check: '',
        photo_taken: false
      });
      fetchGuestData();
    } catch (error) {
      toast.error(t('security_check_failed', 'Security check failed. Please try again.'));
      console.error('Security check error:', error);
    }
  };

  const handleCheckIn = async (guestId) => {
    try {
      await axios.patch(`${API}/guests/${guestId}/checkin`);
      toast.success('Guest checked in successfully!');
      fetchGuestData();
    } catch (error) {
      toast.error('Failed to check in guest');
      console.error('Check in error:', error);
    }
  };

  const handleCheckOut = async (guestId) => {
    try {
      await axios.patch(`${API}/guests/${guestId}/checkout`);
      toast.success('Guest checked out successfully!');
      fetchGuestData();
    } catch (error) {
      toast.error('Failed to check out guest');
      console.error('Check out error:', error);
    }
  };

  const generateQRCode = async (guest) => {
    try {
      const response = await axios.get(`${API}/guests/${guest.id}/qr-code`);
      
      // Create a modal to display the QR code
      const qrModal = document.createElement('div');
      qrModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
      qrModal.innerHTML = `
        <div class="bg-white rounded-lg max-w-md w-full p-6">
          <div class="text-center">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">${t('visitor_qr_code')}</h3>
            <div class="mb-4">
              <img src="${response.data.qr_code}" alt="QR Code" class="mx-auto" style="max-width: 200px;">
            </div>
            <div class="text-sm text-gray-600 mb-4">
              <p><strong>${t('visitor_name')}:</strong> ${response.data.guest_info.visitor_name}</p>
              <p><strong>${t('unit_number')}:</strong> ${response.data.guest_info.unit_number}</p>
              <p><strong>${t('visit_date')}:</strong> ${formatDate(response.data.guest_info.visit_date)}</p>
            </div>
            <div class="flex justify-center space-x-3">
              <button onclick="navigator.clipboard.writeText('${JSON.stringify(response.data.qr_data)}'); this.innerText='${t('copied')}!';" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                ${t('copy_data')}
              </button>
              <button onclick="window.print();" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                ${t('print')}
              </button>
              <button onclick="document.body.removeChild(this.closest('.fixed'))" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                ${t('close')}
              </button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(qrModal);
      
      toast.success('QR Code generated successfully!');
    } catch (error) {
      toast.error('Failed to generate QR code');
      console.error('QR generation error:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = guestStatuses.find(s => s.value === status);
    if (!statusConfig) return null;
    
    const Icon = statusConfig.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </span>
    );
  };

  const filteredGuests = guests.filter(guest => {
    if (filters.status !== 'all' && guest.status !== filters.status) return false;
    if (filters.search && !guest.visitor_name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const filteredRequests = visitRequests.filter(request => {
    if (filters.status !== 'all' && request.status !== filters.status) return false;
    if (filters.search && !request.visitor_name.toLowerCase().includes(filters.search.toLowerCase())) return false;
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 text-center">{t('guest_management')}</h1>
            <p className="text-gray-600 mt-2">{t('guest_management_description')}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlusIcon className="w-5 h-5 mr-2" />
            {t('add_visitor')}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('total_visitors')}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_visitors || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <UsersIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('pending_approvals')}</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending_approvals || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('active_visits')}</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.active_visits || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('todays_visits')}</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.todays_visits || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <CalendarDaysIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('search')}
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('search_visitors')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('status')}
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('all_statuses')}</option>
              {guestStatuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('date_range')}
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('all_dates')}</option>
              <option value="today">{t('today')}</option>
              <option value="tomorrow">{t('tomorrow')}</option>
              <option value="this_week">{t('this_week')}</option>
              <option value="next_week">{t('next_week')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex bg-gray-100 rounded-xl p-1" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('guests')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all transform ${
              activeTab === 'guests'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <UsersIcon className="w-4 h-4" />
              <span>{t('active_visitors')}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                activeTab === 'guests' ? 'bg-white bg-opacity-20 text-white' : 'bg-blue-100 text-blue-600'
              }`}>
                {filteredGuests.length}
              </span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all transform ${
              activeTab === 'requests'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <ClockIcon className="w-4 h-4" />
              <span>{t('visit_requests')}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                activeTab === 'requests' ? 'bg-white bg-opacity-20 text-white' : 'bg-green-100 text-green-600'
              }`}>
                {visitRequests.length}
              </span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all transform ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <CalendarDaysIcon className="w-4 h-4" />
              <span>{t('visit_history')}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                activeTab === 'history' ? 'bg-white bg-opacity-20 text-white' : 'bg-purple-100 text-purple-600'
              }`}>
                {stats.total_visits || 0}
              </span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all transform ${
              activeTab === 'security'
                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg scale-105'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <IdentificationIcon className="w-4 h-4" />
              <span>{t('security_log')}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                activeTab === 'security' ? 'bg-white bg-opacity-20 text-white' : 'bg-red-100 text-red-600'
              }`}>
                {securityLogs.length}
              </span>
            </div>
          </button>
        </nav>
      </div>

      {/* Guests/Requests List */}
      <div className="space-y-4">
        {activeTab === 'guests' && (
          <>
            {filteredGuests.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl">
                <div className="bg-white rounded-full w-24 h-24 mx-auto flex items-center justify-center shadow-lg mb-6">
                  <UsersIcon className="h-12 w-12 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('no_active_visitors')}</h3>
                <p className="text-gray-600 max-w-md mx-auto">{t('no_active_visitors_description')}</p>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="mt-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  <UserPlusIcon className="h-5 w-5 inline mr-2" />
                  {t('add_new_visitor')}
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredGuests.map((guest) => (
                  <div key={guest.id} className="bg-white rounded-xl border-2 border-gray-100 shadow-lg hover:shadow-xl transition-all hover:border-blue-200 transform hover:-translate-y-1">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                              <IdentificationIcon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">{guest.visitor_name}</h3>
                              {getStatusBadge(guest.status)}
                            </div>
                          </div>
                        
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border-l-4 border-green-400">
                              <div className="flex items-center">
                                <div className="bg-green-100 p-2 rounded-lg mr-3">
                                  <PhoneIcon className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-xs text-green-600 font-medium">{t('phone')}</p>
                                  <p className="text-sm font-semibold text-green-800">{guest.visitor_phone}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-3 rounded-lg border-l-4 border-blue-400">
                              <div className="flex items-center">
                                <div className="bg-blue-100 p-2 rounded-lg mr-3">
                                  <BuildingOfficeIcon className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-xs text-blue-600 font-medium">{t('unit')}</p>
                                  <p className="text-sm font-semibold text-blue-800">{guest.unit_number}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-3 rounded-lg border-l-4 border-purple-400">
                              <div className="flex items-center">
                                <div className="bg-purple-100 p-2 rounded-lg mr-3">
                                  <CalendarDaysIcon className="w-4 h-4 text-purple-600" />
                                </div>
                                <div>
                                  <p className="text-xs text-purple-600 font-medium">{t('visit_date')}</p>
                                  <p className="text-sm font-semibold text-purple-800">{formatDate(guest.visit_date)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{t('purpose')}: {visitPurposes.find(p => p.value === guest.visit_purpose)?.label}</span>
                            <span>{t('host')}: {guest.host_name}</span>
                            {guest.vehicle_plate && <span>{t('vehicle')}: {guest.vehicle_plate}</span>}
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-3 ml-6">
                          {guest.status === 'approved' && (
                            <button
                              onClick={() => handleCheckIn(guest.id)}
                              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-emerald-600 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center"
                            >
                              <CheckCircleIcon className="w-4 h-4 mr-2" />
                              {t('check_in')}
                            </button>
                          )}
                          {guest.status === 'checked_in' && (
                            <button
                              onClick={() => handleCheckOut(guest.id)}
                              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-cyan-600 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center"
                            >
                              <XCircleIcon className="w-4 h-4 mr-2" />
                              {t('check_out')}
                            </button>
                          )}
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => generateQRCode(guest)}
                              className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg"
                              title={t('generate_qr_code')}
                            >
                              <QrCodeIcon className="w-4 h-4" />
                            </button>
                            
                            <button
                              className="p-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 shadow-lg"
                              title={t('print_visitor_badge')}
                            >
                              <PrinterIcon className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedGuest(guest);
                              setShowDetailsModal(true);
                            }}
                            className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'requests' && (
          <>
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t('no_pending_requests')}</h3>
                <p className="mt-1 text-sm text-gray-500">{t('no_pending_requests_description')}</p>
              </div>
            ) : (
              filteredRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-center text-gray-900 text-center">{request.visitor_name}</h3>
                          {getStatusBadge(request.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center">
                            <PhoneIcon className="w-4 h-4 mr-2" />
                            {request.visitor_phone}
                          </div>
                          <div className="flex items-center">
                            <BuildingOfficeIcon className="w-4 h-4 mr-2" />
                            {t('unit')} {request.unit_number}
                          </div>
                          <div className="flex items-center">
                            <CalendarDaysIcon className="w-4 h-4 mr-2" />
                            {formatDate(request.visit_date)}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{request.visit_purpose}</p>
                        {request.special_instructions && (
                          <p className="text-sm text-gray-500 italic">{request.special_instructions}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {request.status === 'pending' && user?.role === 'admin' && (
                          <>
                            <button
                              onClick={() => handleApproveRequest(request.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              {t('approve')}
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              {t('reject')}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
        
        {/* Security Log Tab */}
        {activeTab === 'security' && (
          <>
            {securityLogs.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-red-50 to-orange-100 rounded-xl">
                <div className="bg-white rounded-full w-24 h-24 mx-auto flex items-center justify-center shadow-lg mb-6">
                  <IdentificationIcon className="h-12 w-12 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('no_security_logs')}</h3>
                <p className="text-gray-600">{t('security_logs_appear_here')}</p>
              </div>
            ) : (
              securityLogs.map((log) => (
                <div key={log.id || log._id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all">
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            log.action === 'check_in' ? 'bg-green-100' : 'bg-orange-100'
                          }`}>
                            {log.action === 'check_in' ? (
                              <CheckCircleIcon className="w-6 h-6 text-green-600" />
                            ) : (
                              <XCircleIcon className="w-6 h-6 text-orange-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{log.visitor_name}</h3>
                            <p className="text-sm text-gray-500">{log.action === 'check_in' ? t('checked_in') : t('checked_out')}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">{t('checked_by')}</p>
                            <p className="text-sm font-semibold text-gray-900">{log.checked_by}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">{t('time')}</p>
                            <p className="text-sm font-semibold text-gray-900">{formatRelativeTime(log.timestamp || log.created_at)}</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">{t('id_verified')}</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {log.id_verified ? '✓ ' + t('yes') : '✗ ' + t('no')}
                            </p>
                          </div>
                          {log.temperature_check && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">{t('temperature')}</p>
                              <p className="text-sm font-semibold text-gray-900">{log.temperature_check}°C</p>
                            </div>
                          )}
                        </div>
                        
                        {log.security_notes && (
                          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                            <p className="text-xs text-yellow-700 font-semibold mb-1">{t('security_notes')}:</p>
                            <p className="text-sm text-yellow-800">{log.security_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Add Visitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-center text-center text-gray-900 text-center">{t('add_visitor_request')}</h2>
            </div>
            
            <form onSubmit={handleCreateGuest} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('visitor_name')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestForm.visitor_name}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, visitor_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('visitor_phone')} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={guestForm.visitor_phone}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, visitor_phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('visitor_email')}
                  </label>
                  <input
                    type="email"
                    value={guestForm.visitor_email}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, visitor_email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('id_number')}
                  </label>
                  <input
                    type="text"
                    value={guestForm.visitor_id_number}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, visitor_id_number: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('visit_purpose')} *
                  </label>
                  <select
                    required
                    value={guestForm.visit_purpose}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, visit_purpose: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('select_purpose')}</option>
                    {visitPurposes.map(purpose => (
                      <option key={purpose.value} value={purpose.value}>
                        {purpose.icon} {purpose.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('unit_number')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestForm.unit_number}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, unit_number: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('visit_date')} *
                  </label>
                  <input
                    type="date"
                    required
                    value={guestForm.visit_date}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, visit_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('visit_time')} *
                  </label>
                  <input
                    type="time"
                    required
                    value={guestForm.visit_time}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, visit_time: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('host_name')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestForm.host_name}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, host_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('host_phone')} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={guestForm.host_phone}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, host_phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('vehicle_plate')}
                  </label>
                  <input
                    type="text"
                    value={guestForm.vehicle_plate}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, vehicle_plate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('duration_hours')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={guestForm.duration_hours}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, duration_hours: parseInt(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('special_instructions')}
                </label>
                <textarea
                  rows={3}
                  value={guestForm.special_instructions}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, special_instructions: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('special_instructions_placeholder')}
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={guestForm.escort_required}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, escort_required: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{t('escort_required')}</span>
                </label>

                {user?.role === 'admin' && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={guestForm.pre_approved}
                      onChange={(e) => setGuestForm(prev => ({ ...prev, pre_approved: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{t('pre_approve')}</span>
                  </label>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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

      {/* Guest Details Modal */}
      {showDetailsModal && selectedGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-center text-center text-gray-900 text-center">{t('visitor_details')}</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-center text-center text-gray-900 mb-4">{t('visitor_information')}</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-600">{t('name')}</dt>
                      <dd className="text-sm text-gray-900">{selectedGuest.visitor_name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">{t('phone')}</dt>
                      <dd className="text-sm text-gray-900">{selectedGuest.visitor_phone}</dd>
                    </div>
                    {selectedGuest.visitor_email && (
                      <div>
                        <dt className="text-sm font-medium text-gray-600">{t('email')}</dt>
                        <dd className="text-sm text-gray-900">{selectedGuest.visitor_email}</dd>
                      </div>
                    )}
                    {selectedGuest.visitor_id_number && (
                      <div>
                        <dt className="text-sm font-medium text-gray-600">{t('id_number')}</dt>
                        <dd className="text-sm text-gray-900">{selectedGuest.visitor_id_number}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-center text-center text-gray-900 mb-4">{t('visit_details')}</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-600">{t('status')}</dt>
                      <dd className="text-sm text-gray-900">{getStatusBadge(selectedGuest.status)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">{t('visit_date')}</dt>
                      <dd className="text-sm text-gray-900">{formatDate(selectedGuest.visit_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">{t('unit_number')}</dt>
                      <dd className="text-sm text-gray-900">{selectedGuest.unit_number}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">{t('host')}</dt>
                      <dd className="text-sm text-gray-900">{selectedGuest.host_name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600">{t('purpose')}</dt>
                      <dd className="text-sm text-gray-900">
                        {visitPurposes.find(p => p.value === selectedGuest.visit_purpose)?.label}
                      </dd>
                    </div>
                    {selectedGuest.vehicle_plate && (
                      <div>
                        <dt className="text-sm font-medium text-gray-600">{t('vehicle')}</dt>
                        <dd className="text-sm text-gray-900">{selectedGuest.vehicle_plate}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              {selectedGuest.special_instructions && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-center text-center text-gray-900 mb-2">{t('special_instructions')}</h3>
                  <p className="text-sm text-gray-700">{selectedGuest.special_instructions}</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => generateQRCode(selectedGuest)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <QrCodeIcon className="w-4 h-4 mr-2" />
                  {t('generate_qr_code')}
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestManagement;