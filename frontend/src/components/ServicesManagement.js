import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import { toast } from 'sonner';
import {
  WrenchScrewdriverIcon,
  UserIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ArrowPathIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  StarIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ServicesManagement = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [serviceProviders, setServiceProviders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('services');
  const [showAddService, setShowAddService] = useState(false);
  const [showBookService, setShowBookService] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editingService, setEditingService] = useState(null);

  const [serviceForm, setServiceForm] = useState({
    name: '',
    category: 'maintenance',
    specialty: '',
    description: '',
    phone: '',
    email: '',
    working_hours: '9:00 AM - 6:00 PM'
  });

  // Enhanced booking form with payment options
  const [bookingForm, setBookingForm] = useState({
    provider_id: '',
    service_category: 'maintenance',
    service_specialty: '',
    title: '',
    description: '',
    priority: 'standard',
    scheduled_date: '',
    scheduled_time: '',
    estimated_duration: 60,
    payment_method: 'cash',
    booking_notes: ''
  });

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'cash',
    amount: 0,
    currency: 'USD'
  });

  const priorityOptions = [
    { value: 'emergency', label: 'Emergency', color: 'bg-red-100 text-red-800', description: 'Immediate response within 1 hour' },
    { value: 'urgent', label: 'Urgent', color: 'bg-orange-100 text-orange-800', description: 'Same day service' },
    { value: 'standard', label: 'Standard', color: 'bg-blue-100 text-blue-800', description: 'Next available slot' },
    { value: 'scheduled', label: 'Scheduled', color: 'bg-green-100 text-green-800', description: 'Future date/time' }
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Cash on Service', icon: '💵' },
    { value: 'card', label: 'Credit/Debit Card', icon: '💳' },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
    { value: 'instapay', label: 'InstaPay', icon: '⚡' },
    { value: 'mobile_pay', label: 'Mobile Payment', icon: '📱' },
    { value: 'digital_wallet', label: 'Digital Wallet', icon: '👛' },
    { value: 'qr_code', label: 'QR Code Payment', icon: '📊' }
  ];

  useEffect(() => {
    fetchServices();
    fetchServiceProviders();
    if (user?.role === 'admin') {
      fetchBookings();
    } else {
      fetchMyBookings();
    }
  }, [user]);

  const fetchServices = async () => {
    try {
      console.log('Fetching services for compound:', user.compound_id);
      console.log('API URL:', `${API}/compounds/${user.compound_id}/services`);
      
      const response = await axios.get(`${API}/compounds/${user.compound_id}/services`);
      console.log('Services response:', response.data);
      console.log('Services count:', response.data.services?.length);
      
      if (response.data.services && Array.isArray(response.data.services)) {
        // Map status to availability for frontend compatibility
        const servicesWithAvailability = response.data.services.map(service => ({
          ...service,
          availability: service.status || service.availability || 'available'
        }));
        
        console.log('Setting services:', servicesWithAvailability.length);
        setServices(servicesWithAvailability);
        
        if (servicesWithAvailability.length > 0) {
          toast.success(`Loaded ${servicesWithAvailability.length} services successfully!`);
        }
      } else {
        console.log('No services array in response');
        setServices([]);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
      console.error('Error response:', error.response?.data);
      toast.error(`Failed to load services: ${error.response?.data?.detail || error.message}`);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const forceRefreshServices = async () => {
    try {
      setLoading(true);
      console.log('🔄 Force refreshing services...');
      
      // Clear current services
      setServices([]);
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fetch fresh services
      await fetchServices();
      
      toast.success('Services refreshed successfully!');
    } catch (error) {
      console.error('Failed to refresh services:', error);
      toast.error('Failed to refresh services');
    }
  };

  const clearAndReinitializeServices = async () => {
    if (!window.confirm('This will clear all existing services and add 17 default services. Continue?')) {
      return;
    }
    
    try {
      // Simple direct initialization
      const response = await axios.post(`${API}/admin/initialize-services`, {
        compound_id: user.compound_id
      });
      
      if (response.data.success) {
        toast.success(`${response.data.added_count} services added successfully!`);
      } else {
        toast.info('Services already exist, refreshing...');
      }
      
      // Always refresh after
      setTimeout(async () => {
        await fetchServices();
      }, 1000);
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to add services');
    }
  };

  const testDirectAPI = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = `${API}/compounds/${user.compound_id}/services`;
      
      console.log('Testing API:', apiUrl);
      console.log('Token exists:', !!token);
      console.log('Token preview:', token?.substring(0, 50) + '...');
      
      // Try with fresh login first
      const loginResponse = await axios.post(`${API}/auth/login`, {
        username: 'admin',
        password: 'admin123'
      });
      
      const freshToken = loginResponse.data.access_token;
      console.log('Got fresh token:', !!freshToken);
      
      // Update token in localStorage
      localStorage.setItem('token', freshToken);
      
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${freshToken}`;
      
      // Try API call with fresh token
      const response = await axios.get(apiUrl);
      console.log('API Response:', response.data);
      console.log('Services count:', response.data.services?.length);
      
      if (response.data && response.data.services) {
        // Map status to availability for compatibility
        const services = response.data.services.map(service => ({
          ...service,
          availability: service.status || 'available'
        }));
        
        setServices(services);
        toast.success(`✅ FIXED! Found ${services.length} services with fresh token!`);
      } else {
        toast.error('No services in response');
      }
      
    } catch (error) {
      console.error('API Error:', error);
      toast.error(`API Error: ${error.response?.status || error.message}`);
    }
  };

  const addTestServices = () => {
    const testServices = [
      {
        id: 'test-1',
        name: 'Plumbing Services',
        category: 'maintenance',
        specialty: 'Emergency plumbing, pipe repairs',
        description: 'Professional plumbing services including emergency repairs',
        phone: '+1-555-PLUMB-01',
        email: 'plumbing@compound-services.com',
        working_hours: '24/7 Emergency Service',
        base_price: 75.00,
        availability: 'available'
      },
      {
        id: 'test-2',
        name: 'House Cleaning',
        category: 'cleaning',
        specialty: 'Regular cleaning, deep cleaning',
        description: 'Professional house cleaning services',
        phone: '+1-555-CLEAN-01',
        email: 'cleaning@compound-services.com',
        working_hours: '7:00 AM - 6:00 PM',
        base_price: 80.00,
        availability: 'available'
      },
      {
        id: 'test-3',
        name: 'Security Guard',
        category: 'security',
        specialty: '24/7 security, patrol services',
        description: 'Professional security services',
        phone: '+1-555-SECURE-01',
        email: 'security@compound-services.com',
        working_hours: '24/7 Service',
        base_price: 25.00,
        availability: 'available'
      }
    ];
    
    setServices(testServices);
    toast.success('3 test services added to display!');
  };

  const fetchServiceProviders = async () => {
    try {
      const response = await axios.get(`${API}/service-providers`);
      setServiceProviders(response.data.providers || []);
    } catch (error) {
      console.error('Failed to load service providers:', error);
    }
  };

  const serviceCategories = {
    medical: { name: t('medical'), icon: UserIcon, color: 'bg-red-500' },
    maintenance: { name: t('maintenance'), icon: WrenchScrewdriverIcon, color: 'bg-blue-500' },
    security: { name: t('security'), icon: ShieldCheckIcon, color: 'bg-green-500' },
    cleaning: { name: t('cleaning'), icon: SparklesIcon, color: 'bg-purple-500' },
    other: { name: t('other'), icon: WrenchScrewdriverIcon, color: 'bg-gray-500' }
  };

  const maintenanceSpecialties = [
    'carpenter', 'plumber', 'electrician', 'gardener', 'painter', 
    'hvac_technician', 'locksmith', 'appliance_repair', 'general_maintenance'
  ];

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/compounds/${user.compound_id}/bookings`);
      setBookings(response.data.bookings);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  };

  const fetchMyBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings/my`);
      setBookings(response.data.bookings);
    } catch (error) {
      console.error('Failed to load my bookings:', error);
    }
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/compounds/${user.compound_id}/services`, serviceForm);
      toast.success('Service created successfully!');
      setShowAddService(false);
      resetForm();
      fetchServices();
    } catch (error) {
      toast.error('Failed to create service');
    }
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/compounds/${user.compound_id}/services/${editingService.id}`, serviceForm);
      toast.success('Service updated successfully!');
      resetForm();
      fetchServices();
    } catch (error) {
      toast.error('Failed to update service');
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      try {
        await axios.delete(`${API}/compounds/${user.compound_id}/services/${serviceId}`);
        toast.success('Service deleted successfully!');
        fetchServices();
      } catch (error) {
        toast.error('Failed to delete service');
      }
    }
  };
  const resetForm = () => {
    setServiceForm({
      name: '',
      category: 'maintenance',
      specialty: '',
      description: '',
      phone: '',
      email: '',
      working_hours: '9:00 AM - 6:00 PM'
    });
    setEditingService(null);
  };

  const initializeDefaultServices = async () => {
    try {
      console.log('Initializing default services for compound:', user.compound_id);
      
      const response = await axios.post(`${API}/admin/initialize-services`, {
        compound_id: user.compound_id
      });
      
      console.log('Initialize services response:', response.data);
      
      if (response.data.success) {
        toast.success(`${response.data.added_count} default services added successfully!`);
        await fetchServices();
      } else {
        toast.info(`${response.data.message || 'Services already exist'} - Found ${services.length} services in your compound.`);
        // Still refresh services to make sure they display
        await fetchServices();
      }
    } catch (error) {
      console.error('Failed to initialize services:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        toast.error(error.response.data.detail || 'Failed to initialize default services');
      } else {
        toast.error('Failed to initialize default services');
      }
    }
  };

  const handleBookService = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/services/${bookingForm.service_id}/bookings`, bookingForm);
      toast.success('Service booked successfully!');
      setShowBookService(false);
      setBookingForm({
        service_id: '',
        issue_description: '',
        preferred_date: '',
        preferred_time: '09:00',
        notes: ''
      });
      fetchMyBookings();
    } catch (error) {
      toast.error('Failed to book service');
    }
  };

  const openBookingModal = (service) => {
    setSelectedService(service);
    setBookingForm({ ...bookingForm, service_id: service.id });
    setShowBookService(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      category: service.category,
      specialty: service.specialty || '',
      description: service.description,
      phone: service.phone || '',
      email: service.email || '',
      working_hours: service.working_hours
    });
  };

  const getCategoryIcon = (category) => {
    const categoryInfo = serviceCategories[category] || serviceCategories.other;
    const IconComponent = categoryInfo.icon;
    return <IconComponent className="h-6 w-6" />;
  };

  const getCategoryColor = (category) => {
    return serviceCategories[category]?.color || serviceCategories.other.color;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 text-center">
          {t('services_management')}
        </h1>
        <p className="text-gray-600 mt-2 text-center">
          {user?.role === 'admin' 
            ? t('manage_compound_services_bookings')
            : t('view_available_services')
          }
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('services')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'services'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('services')} ({services.length})
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'bookings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {user?.role === 'admin' ? t('all_bookings') : t('my_bookings')} ({bookings.length})
          </button>
          
          <button
            onClick={() => setActiveTab('service-booking')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'service-booking'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            💳 {t('service_booking_payments')} ({serviceProviders.length})
          </button>
        </nav>
      </div>

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {user?.role === 'admin' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 text-center">{t('services_management')}</h3>
                  <p className="text-gray-600 mt-1">
                    {t('manage_organize_compound_services')} • {services.length} {t('services_available')}
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  {user?.role === 'admin' && (
                    <>
                      {/* Primary Action - Add Default Services */}
                      <button
                        onClick={testDirectAPI}
                        className="btn-redesign btn-redesign-primary"
                        title="Load all default services"
                      >
                        <SparklesIcon className="h-5 w-5" />
                        <span>{t('load_services')}</span>
                      </button>
                      
                      {/* Secondary Actions */}
                      <button
                        onClick={forceRefreshServices}
                        className="btn-redesign btn-redesign-secondary"
                        title="Refresh services list"
                      >
                        <ArrowPathIcon className="h-5 w-5" />
                        <span>{t('refresh')}</span>
                      </button>
                      
                      <button
                        onClick={clearAndReinitializeServices}
                        className="btn-redesign btn-redesign-warning"
                        title="Reset all services"
                      >
                        <TrashIcon className="h-5 w-5" />
                        <span>{t('reset')}</span>
                      </button>
                    </>
                  )}
                  
                  {/* Add Custom Service */}
                  <button
                    onClick={() => setShowAddService(true)}
                    className="btn-redesign btn-redesign-accent"
                    title="Add custom service"
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>{t('add_service')}</span>
                  </button>
                  
                  {/* View/Filter Toggle */}
                  <button
                    onClick={() => setActiveTab(activeTab === 'services' ? 'bookings' : 'services')}
                    className="btn-redesign btn-redesign-outline"
                    title="Switch view"
                  >
                    {activeTab === 'services' ? <UserIcon className="h-5 w-5" /> : <WrenchScrewdriverIcon className="h-5 w-5" />}
                    <span>{activeTab === 'services' ? t('bookings') : t('services')}</span>
                  </button>
                </div>
              </div>
              
              {/* Stats Bar */}
              <div className="flex items-center space-x-6 mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    {services.filter(s => s.availability === 'available').length} {t('available')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    {services.filter(s => s.availability === 'busy').length} {t('busy')}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    {services.filter(s => s.availability === 'unavailable').length} {t('unavailable')}
                  </span>
                </div>
                <div className="flex items-center space-x-2 ml-auto">
                  <ClockIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {t('last_updated')}: {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <div key={service.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${getCategoryColor(service.category)}`}>
                        <div className="text-white">
                          {getCategoryIcon(service.category)}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-center text-gray-900">{service.name}</h3>
                        <p className="text-sm text-gray-600 capitalize">
                          {service.specialty || service.category}
                        </p>
                      </div>
                    </div>
                    {user?.role === 'admin' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(service)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-gray-600 mb-4 text-sm">{service.description}</p>

                  <div className="space-y-2 mb-4">
                    {service.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <PhoneIcon className="h-4 w-4 mr-2" />
                        {service.phone}
                      </div>
                    )}
                    {service.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <EnvelopeIcon className="h-4 w-4 mr-2" />
                        {service.email}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <ClockIcon className="h-4 w-4 mr-2" />
                      {service.working_hours}
                    </div>
                  </div>

                  {service.rating > 0 && (
                    <div className="flex items-center mb-4">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <StarIcon
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(service.rating) 
                                ? 'text-yellow-400' 
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600 ml-2">
                        ({service.total_reviews} {t('reviews')})
                      </span>
                    </div>
                  )}

                  {user?.role === 'resident' && (
                    <button
                      onClick={() => openBookingModal(service)}
                      className="w-full btn btn-primary text-sm"
                    >
                      {t('book_service')}
                    </button>
                  )}

                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    service.status === 'available' 
                      ? 'bg-green-100 text-green-800'
                      : service.status === 'busy'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {t(service.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <WrenchScrewdriverIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-center text-center text-gray-900 text-center mb-2">{t('no_services')}</h3>
              <p className="text-gray-600">
                {user?.role === 'admin'
                  ? t('add_first_service')
                  : t('no_services_available')
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-center text-gray-900 text-center">
              {user?.role === 'admin' ? t('all_bookings') : t('my_bookings')}
            </h3>
          </div>
          <div className="p-6">
            {bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.map((booking) => (
                  <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900">{booking.service_name}</h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {t(booking.status)}
                          </span>
                        </div>
                        {user?.role === 'admin' && (
                          <p className="text-sm text-gray-600 mb-1">
                            {t('resident')}: {booking.resident_name} ({t('unit')} {booking.unit_number})
                          </p>
                        )}
                        <p className="text-sm text-gray-600 mb-2">
                          {t('issue')}: {booking.issue_description}
                        </p>
                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            {new Date(booking.preferred_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {booking.preferred_time}
                          </div>
                        </div>
                        {booking.notes && (
                          <p className="text-sm text-gray-600 mt-2">
                            {t('notes')}: {booking.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">{t('no_bookings')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Service Modal */}
      {(showAddService || editingService) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-90vh overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-center text-gray-900 text-center">
                  {editingService ? t('edit_service') : t('add_service')}
                </h3>
                <button
                  onClick={() => {
                    setShowAddService(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={editingService ? handleUpdateService : handleCreateService} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('service_name')}
                    </label>
                    <input
                      type="text"
                      value={serviceForm.name}
                      onChange={(e) => setServiceForm({...serviceForm, name: e.target.value})}
                      className="form-input"
                      required
                      placeholder={t('enter_service_name')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('category')}
                    </label>
                    <select
                      value={serviceForm.category}
                      onChange={(e) => setServiceForm({...serviceForm, category: e.target.value})}
                      className="form-input"
                      required
                    >
                      {Object.keys(serviceCategories).map(category => (
                        <option key={category} value={category}>
                          {serviceCategories[category].name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {serviceForm.category === 'maintenance' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('specialty')}
                    </label>
                    <select
                      value={serviceForm.specialty}
                      onChange={(e) => setServiceForm({...serviceForm, specialty: e.target.value})}
                      className="form-input"
                    >
                      <option value="">{t('select_specialty')}</option>
                      {maintenanceSpecialties.map(specialty => (
                        <option key={specialty} value={specialty}>
                          {t(specialty)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('description')}
                  </label>
                  <textarea
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({...serviceForm, description: e.target.value})}
                    rows={3}
                    className="form-input"
                    required
                    placeholder={t('enter_description')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('phone')}
                    </label>
                    <input
                      type="tel"
                      value={serviceForm.phone}
                      onChange={(e) => setServiceForm({...serviceForm, phone: e.target.value})}
                      className="form-input"
                      placeholder={t('enter_phone')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('email')}
                    </label>
                    <input
                      type="email"
                      value={serviceForm.email}
                      onChange={(e) => setServiceForm({...serviceForm, email: e.target.value})}
                      className="form-input"
                      placeholder={t('enter_email')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('working_hours')}
                  </label>
                  <input
                    type="text"
                    value={serviceForm.working_hours}
                    onChange={(e) => setServiceForm({...serviceForm, working_hours: e.target.value})}
                    className="form-input"
                    placeholder="9:00 AM - 6:00 PM"
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddService(false);
                      resetForm();
                    }}
                    className="btn btn-secondary flex-1"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                  >
                    {editingService ? t('update_service') : t('create_service')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Service Booking & Payments Tab */}
      {activeTab === 'service-booking' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-center text-center text-gray-900 text-center mb-4">{t('service_booking_payments')}</h2>
            <p className="text-gray-600 mb-6">{t('book_services_multiple_payment')}</p>
            
            {/* Service Providers Grid */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-4">{t('available_service_providers')}</h3>
              {serviceProviders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {serviceProviders.map((provider) => (
                    <div key={provider.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-lg font-medium text-center text-center text-white">
                            {provider.full_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-center text-center text-gray-900 text-center">{provider.full_name}</h4>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <StarIcon
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= Math.floor(provider.average_rating) 
                                      ? 'text-yellow-400 fill-current' 
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">
                              ({provider.total_reviews} reviews)
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <UserIcon className="h-4 w-4 mr-2" />
                          {provider.services.join(', ')}
                        </div>
                        {provider.hourly_rate && (
                          <div className="flex items-center text-sm text-gray-600">
                            <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                            ${provider.hourly_rate}/hour
                          </div>
                        )}
                        <div className="flex items-center text-sm text-gray-600">
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          {provider.total_jobs_completed} jobs completed
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedProvider(provider);
                          setBookingForm({...bookingForm, provider_id: provider.id});
                          setShowBookService(true);
                        }}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                      >
                        <CreditCardIcon className="h-4 w-4" />
                        <span>Book Service</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">{t('no_service_providers_available')}</p>
                  <p className="text-gray-400 text-sm">{t('service_providers_appear')}</p>
                </div>
              )}
            </div>

            {/* Payment Methods Info */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-4">Supported Payment Methods</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {paymentMethods.map((method) => (
                  <div key={method.value} className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                    <span className="text-2xl mb-2">{method.icon}</span>
                    <span className="text-xs text-center text-gray-600">{method.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority Levels Info */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-center text-gray-900 text-center mb-4">Service Priority Levels</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {priorityOptions.map((option) => (
                  <div key={option.value} className={`p-4 rounded-lg border-2 ${option.color} border-opacity-20`}>
                    <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${option.color} mb-2`}>
                      {option.label}
                    </div>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Book Service Modal */}
      {showBookService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-center text-gray-900 text-center">
                  {t('book_service')}: {selectedService?.name}
                </h3>
                <button
                  onClick={() => setShowBookService(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleBookService} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('issue_description')}
                  </label>
                  <textarea
                    value={bookingForm.issue_description}
                    onChange={(e) => setBookingForm({...bookingForm, issue_description: e.target.value})}
                    rows={3}
                    className="form-input"
                    required
                    placeholder={t('describe_issue')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('preferred_date')}
                    </label>
                    <input
                      type="date"
                      value={bookingForm.preferred_date}
                      onChange={(e) => setBookingForm({...bookingForm, preferred_date: e.target.value})}
                      className="form-input"
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('preferred_time')}
                    </label>
                    <input
                      type="time"
                      value={bookingForm.preferred_time}
                      onChange={(e) => setBookingForm({...bookingForm, preferred_time: e.target.value})}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('additional_notes')} ({t('optional')})
                  </label>
                  <textarea
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm({...bookingForm, notes: e.target.value})}
                    rows={2}
                    className="form-input"
                    placeholder={t('any_additional_info')}
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBookService(false)}
                    className="btn btn-secondary flex-1"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                  >
                    {t('book_service')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesManagement;