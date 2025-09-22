import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserIcon,
  StarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PhotoIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  HeartIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  BanknotesIcon,
  QrCodeIcon,
  DevicePhoneMobileIcon,
  BuildingLibraryIcon,
  BoltIcon,
  WalletIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
  ChatBubbleLeftEllipsisIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ServiceBooking = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [providers, setProviders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showProviderDetails, setShowProviderDetails] = useState(false);
  const [showBookingDetails, setShowBookingDetails] = useState(false); 
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [activeTab, setActiveTab] = useState('providers'); // 'providers', 'bookings', 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('rating'); // 'rating', 'price', 'availability'
  const [favoriteProviders, setFavoriteProviders] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const [bookingForm, setBookingForm] = useState({
    provider_id: '',
    service_category: 'maintenance',
    service_specialty: 'general',
    title: '',
    description: '',
    priority: 'standard',
    scheduled_date: '',
    scheduled_time: '',
    scheduled_end_time: '',
    is_recurring: false,
    recurrence_pattern: '',
    estimated_duration: 60,
    payment_method: 'cash',
    booking_notes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'cash',
    amount: 0,
    currency: 'USD'
  });

  const [reviewForm, setReviewForm] = useState({
    overall_rating: 5,
    quality_rating: 5,
    punctuality_rating: 5,
    professionalism_rating: 5,
    value_rating: 5,
    would_recommend: true,
    written_review: '',
    is_public: true
  });

  const priorityOptions = [
    { value: 'emergency', label: 'Emergency', color: 'bg-red-100 text-red-800', description: 'Immediate response within 1 hour' },
    { value: 'urgent', label: 'Urgent', color: 'bg-orange-100 text-orange-800', description: 'Same day service' },
    { value: 'standard', label: 'Standard', color: 'bg-blue-100 text-blue-800', description: 'Next available slot' },
    { value: 'scheduled', label: 'Scheduled', color: 'bg-green-100 text-green-800', description: 'Future date/time' }
  ];

  const paymentMethods = [
    { value: 'cash', label: 'Cash on Service', icon: BanknotesIcon, color: 'bg-green-50 border-green-200', description: 'Pay when service is completed' },
    { value: 'card', label: 'Credit/Debit Card', icon: CreditCardIcon, color: 'bg-blue-50 border-blue-200', description: 'Secure online payment' },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: BuildingLibraryIcon, color: 'bg-purple-50 border-purple-200', description: 'Direct bank transfer' },
    { value: 'instapay', label: 'InstaPay', icon: BoltIcon, color: 'bg-yellow-50 border-yellow-200', description: 'Instant payment processing' },
    { value: 'mobile_pay', label: 'Mobile Payment', icon: DevicePhoneMobileIcon, color: 'bg-pink-50 border-pink-200', description: 'Pay using mobile wallet' },
    { value: 'digital_wallet', label: 'Digital Wallet', icon: WalletIcon, color: 'bg-indigo-50 border-indigo-200', description: 'Apple Pay, Google Pay, etc.' },
    { value: 'qr_code', label: 'QR Code Payment', icon: QrCodeIcon, color: 'bg-gray-50 border-gray-200', description: 'Scan and pay instantly' }
  ];

  const serviceCategories = [
    { value: 'maintenance', label: 'Maintenance', specialties: ['Plumber', 'Electrician', 'Carpenter', 'HVAC', 'General'] },
    { value: 'cleaning', label: 'Cleaning', specialties: ['Deep Cleaning', 'Regular Cleaning', 'Carpet Cleaning', 'Window Cleaning'] },
    { value: 'security', label: 'Security', specialties: ['Guard Service', 'CCTV Installation', 'Access Control'] },
    { value: 'gardening', label: 'Gardening', specialties: ['Landscaping', 'Tree Trimming', 'Lawn Care', 'Plant Care'] },
    { value: 'other', label: 'Other', specialties: ['Custom Service'] }
  ];

  useEffect(() => {
    loadProviders();
    loadBookings();
  }, []);

  // Mock providers for demonstration when API fails
  const mockProviders = [
    {
      id: 'mock-1',
      full_name: 'John Smith',
      services: ['Plumbing', 'General Maintenance'],
      average_rating: 4.8,
      total_reviews: 127,
      hourly_rate: 45,
      total_jobs_completed: 89,
      is_available: true,
      location: 'Building A'
    },
    {
      id: 'mock-2', 
      full_name: 'Maria Garcia',
      services: ['Cleaning', 'Deep Cleaning'],
      average_rating: 4.9,
      total_reviews: 203,  
      hourly_rate: 35,
      total_jobs_completed: 156,
      is_available: true,
      location: 'Building B'
    },
    {
      id: 'mock-3',
      full_name: 'Ahmed Hassan',
      services: ['Electrical', 'HVAC'],
      average_rating: 4.7,
      total_reviews: 95,
      hourly_rate: 55,
      total_jobs_completed: 73,
      is_available: false,
      location: 'Building C'
    }
  ];

  // Use real providers if available, otherwise use mock data
  const displayProviders = providers.length > 0 ? providers : mockProviders;

  const loadProviders = async () => {
    try {
      const response = await axios.get(`${API}/service-providers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setProviders(response.data.providers || []);
    } catch (error) {
      console.error('Failed to load service providers:', error);
      toast.error('Failed to load service providers');
      // Set empty providers array to allow component to render
      setProviders([]);
    }
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/service-bookings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      toast.error('Failed to load bookings');
      // Set empty bookings array to allow component to render
      setBookings([]);
    } finally {
      // Always set loading to false, regardless of success or failure
      setLoading(false);
    }
  };

  const toggleFavorite = (providerId) => {
    const newFavorites = new Set(favoriteProviders);
    if (newFavorites.has(providerId)) {
      newFavorites.delete(providerId);
      toast.success('Removed from favorites');
    } else {
      newFavorites.add(providerId);
      toast.success('Added to favorites');
    }
    setFavoriteProviders(newFavorites);
  };

  const getFilteredProviders = () => {
    let filtered = displayProviders.filter(provider => {
      const matchesSearch = provider.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           provider.services.some(service => service.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || provider.services.some(service => 
        service.toLowerCase().includes(filterCategory.toLowerCase()));
      return matchesSearch && matchesCategory;
    });

    // Sort providers
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.average_rating || 0) - (a.average_rating || 0);
        case 'price':
          return (a.hourly_rate || Infinity) - (b.hourly_rate || Infinity);
        case 'availability':
          return (b.is_available === true ? 1 : 0) - (a.is_available === true ? 1 : 0);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleBookService = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/service-bookings`, bookingForm, {
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        }
      });
      
      toast.success('Service booked successfully!');
      setShowBookingForm(false);
      resetBookingForm();
      await loadBookings();
    } catch (error) {
      console.error('Failed to book service:', error);
      toast.error(error.response?.data?.detail || 'Failed to book service');
    }
  };

  const resetBookingForm = () => {
    setBookingForm({
      provider_id: '',
      service_category: 'maintenance',
      service_specialty: 'general',
      title: '',
      description: '',
      priority: 'standard',
      scheduled_date: '',
      scheduled_time: '',
      scheduled_end_time: '',
      is_recurring: false,
      recurrence_pattern: '',
      estimated_duration: 60,
      payment_method: 'cash',
      booking_notes: ''
    });
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    // Validate payment form
    if (!paymentForm.amount || paymentForm.amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    if (!paymentForm.payment_method) {
      toast.error('Please select a payment method');
      return;
    }
    
    try {
      const response = await axios.post(`${API}/service-bookings/${selectedBooking.id}/payment`, paymentForm, {
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        }
      });
      
      toast.success(`Payment of $${paymentForm.amount} processed successfully using ${paymentForm.payment_method}!`);
      setShowPaymentModal(false);
      
      // Reset payment form
      setPaymentForm({
        payment_method: 'cash',
        amount: 0,
        currency: 'USD'
      });
      
      await loadBookings();
    } catch (error) {
      console.error('Failed to process payment:', error);
      toast.error(error.response?.data?.detail || 'Failed to process payment');
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/service-bookings/${selectedBooking.id}/review`, reviewForm, {
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        }
      });
      
      toast.success('Review submitted successfully!');
      setShowReviewModal(false);
      await loadBookings();
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      await axios.put(`${API}/service-bookings/${bookingId}/status`, 
        { status: 'cancelled' },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      
      toast.success('Booking cancelled successfully');
      await loadBookings();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const handleRescheduleBooking = async (bookingId) => {
    // Open booking form with existing data for rescheduling
    const booking = bookings.find(b => b.id === bookingId);
    if (booking) {
      setBookingForm({
        ...bookingForm,
        provider_id: booking.provider_id,
        service_category: booking.service_category,
        scheduled_date: '',
        scheduled_time: '',
        title: booking.title,
        description: booking.description
      });
      setSelectedBooking(booking);
      setShowBookingForm(true);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'confirmed': return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'in_progress': return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'completed': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'cancelled': return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default: return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority) => {
    const option = priorityOptions.find(opt => opt.value === priority);
    return option ? (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${option.color}`}>
        {option.label}
      </span>
    ) : null;
  };

  const formatDateTime = (date, time) => {
    if (!date) return 'Not scheduled';
    const dateStr = new Date(date).toLocaleDateString();
    return time ? `${dateStr} at ${time}` : dateStr;
  };

  const renderStars = (rating, interactive = false, onChange = null) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className={`h-5 w-5 ${
              star <= rating 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={interactive ? () => onChange(star) : undefined}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Service Booking & Payments</h1>
              <p className="text-lg text-gray-600">
                Book services, manage payments, and leave reviews with ease
              </p>
            </div>
            <div className="flex items-center space-x-4 mt-4 lg:mt-0">
              <button
                onClick={() => setShowBookingForm(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Book New Service
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-3 bg-white text-gray-700 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
                Filters
              </button>
            </div>
          </div>

          {/* Enhanced Tab Navigation */}
          <div className="border-b border-gray-200 bg-white rounded-t-xl">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'providers', label: 'Service Providers', icon: UserIcon },
                { key: 'bookings', label: 'My Bookings', icon: CalendarIcon },
                { key: 'history', label: 'History', icon: ClockIcon }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search providers or services..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input pl-10 w-full"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="form-input w-full"
                >
                  <option value="all">All Categories</option>
                  {serviceCategories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="form-input w-full"
                >
                  <option value="rating">Highest Rating</option>
                  <option value="price">Lowest Price</option>
                  <option value="availability">Most Available</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Content based on active tab */}
        {activeTab === 'providers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getFilteredProviders().map((provider) => (
              <div key={provider.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                {/* Provider Header */}
                <div className="relative p-6 bg-gradient-to-r from-blue-500 to-indigo-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
                        <span className="text-2xl font-bold text-white">
                          {provider.full_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{provider.full_name}</h3>
                        <div className="flex items-center space-x-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <StarIconSolid
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(provider.average_rating || 0)
                                  ? 'text-yellow-300'
                                  : 'text-white/30'
                              }`}
                            />
                          ))}
                          <span className="text-white/90 text-sm ml-2">
                            ({provider.total_reviews || 0})
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFavorite(provider.id)}
                      className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                    >
                      <HeartIcon 
                        className={`h-5 w-5 ${
                          favoriteProviders.has(provider.id) 
                            ? 'text-red-300 fill-current' 
                            : 'text-white/70'
                        }`} 
                      />
                    </button>
                  </div>
                </div>

                {/* Provider Details */}
                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                      <SparklesIcon className="h-4 w-4 mr-3 text-blue-500" />
                      <span className="font-medium">Services:</span>
                      <span className="ml-2">{provider.services?.join(', ') || 'Various services'}</span>
                    </div>
                    
                    {provider.hourly_rate && (
                      <div className="flex items-center text-sm text-gray-600">
                        <CurrencyDollarIcon className="h-4 w-4 mr-3 text-green-500" />
                        <span className="font-medium">Rate:</span>
                        <span className="ml-2 text-green-600 font-semibold">${provider.hourly_rate}/hour</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckCircleIcon className="h-4 w-4 mr-3 text-emerald-500" />
                      <span className="font-medium">Completed:</span>
                      <span className="ml-2">{provider.total_jobs_completed || 0} jobs</span>
                    </div>

                    {provider.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPinIcon className="h-4 w-4 mr-3 text-red-500" />
                        <span className="font-medium">Location:</span>
                        <span className="ml-2">{provider.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setSelectedProvider(provider);
                        setShowProviderDetails(true);
                      }}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                    >
                      <EyeIcon className="h-4 w-4" />
                      <span>View Details</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProvider(provider);
                        setBookingForm({...bookingForm, provider_id: provider.id});
                        setShowBookingForm(true);
                      }}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md"
                    >
                      <CalendarIcon className="h-4 w-4" />
                      <span>Book Now</span>
                    </button>
                  </div>
                </div>

                {/* Availability Badge */}
                {provider.is_available && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      Available Now
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="space-y-6">
            {bookings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                <p className="text-gray-600 mb-6">Start by booking your first service!</p>
                <button
                  onClick={() => setShowBookingForm(true)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Book Service
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {bookings.map((booking) => (
                  <div key={booking.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* Booking Header */}
                    <div className="p-6 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{booking.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{booking.provider_name}</p>
                        </div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                          {booking.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                        </span>
                      </div>
                    </div>

                    {/* Booking Details */}
                    <div className="p-6">
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center text-sm text-gray-600">
                          <CalendarIcon className="h-4 w-4 mr-3 text-blue-500" />
                          <span>{new Date(booking.scheduled_date).toLocaleDateString()}</span>
                          {booking.scheduled_time && (
                            <>
                              <ClockIcon className="h-4 w-4 ml-4 mr-2 text-green-500" />
                              <span>{booking.scheduled_time}</span>
                            </>
                          )}
                        </div>
                        
                        {booking.estimated_cost && (
                          <div className="flex items-center text-sm text-gray-600">
                            <CurrencyDollarIcon className="h-4 w-4 mr-3 text-green-500" />
                            <span>Estimated Cost: <strong className="text-green-600">${booking.estimated_cost}</strong></span>
                          </div>
                        )}

                        <div className="flex items-center text-sm text-gray-600">
                          <SparklesIcon className="h-4 w-4 mr-3 text-purple-500" />
                          <span className="capitalize">{booking.priority} Priority</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowBookingDetails(true);
                          }}
                          className="flex items-center px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          View Details
                        </button>

                        {booking.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleRescheduleBooking(booking.id)}
                              className="flex items-center px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm"
                            >
                              <PencilIcon className="h-4 w-4 mr-2" />
                              Reschedule
                            </button>
                            <button
                              onClick={() => handleCancelBooking(booking.id)}
                              className="flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                            >
                              <XCircleIcon className="h-4 w-4 mr-2" />
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                setSelectedBooking(booking);
                                setPaymentForm({...paymentForm, amount: booking.estimated_cost || 100});
                                setShowPaymentModal(true);
                              }}
                              className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                            >
                              <CreditCardIcon className="h-4 w-4 mr-2" />
                              Pay Now
                            </button>
                          </>
                        )}

                        {booking.status === 'completed' && !booking.payment_status && (
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setPaymentForm({...paymentForm, amount: booking.estimated_cost || 100});
                              setShowPaymentModal(true);
                            }}
                            className="flex items-center px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                          >
                            <CreditCardIcon className="h-4 w-4 mr-2" />
                            Pay Now
                          </button>
                        )}

                        {booking.status === 'completed' && booking.payment_status === 'paid' && !booking.review_submitted && (
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowReviewModal(true);
                            }}
                            className="flex items-center px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                          >
                            <StarIcon className="h-4 w-4 mr-2" />
                            Leave Review
                          </button>
                        )}

                        <button
                          onClick={() => {
                            // Contact provider functionality
                            toast.info('Contact functionality coming soon!');
                          }}
                          className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        >
                          <ChatBubbleLeftEllipsisIcon className="h-4 w-4 mr-2" />
                          Contact
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking History</h3>
            <div className="space-y-4">
              {bookings.filter(booking => booking.status === 'completed' || booking.status === 'cancelled').map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{booking.title}</h4>
                    <p className="text-sm text-gray-600">{booking.provider_name} • {new Date(booking.scheduled_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {booking.status?.replace('_', ' ').toUpperCase()}
                    </span>
                    {booking.status === 'completed' && (
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowReviewModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {booking.review_submitted ? 'View Review' : 'Leave Review'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          {bookings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg">No bookings yet</p>
              <p className="text-gray-400 text-sm">Book your first service to get started</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{booking.title}</div>
                            <div className="text-sm text-gray-500">{booking.service_specialty}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {booking.provider_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDateTime(booking.scheduled_date, booking.scheduled_time)}
                        </td>
                        <td className="px-6 py-4">
                          {getPriorityBadge(booking.priority)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {getStatusIcon(booking.status)}
                            <span className="ml-2 text-sm text-gray-900 capitalize">
                              {booking.status.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="text-gray-900">{booking.payment_method}</div>
                            <div className={`text-xs ${
                              booking.payment_status === 'paid' ? 'text-green-600' : 
                              booking.payment_status === 'failed' ? 'text-red-600' : 
                              'text-yellow-600'
                            }`}>
                              {booking.payment_status}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {booking.payment_status === 'pending' && booking.status !== 'cancelled' && (
                              <button
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setPaymentForm({
                                    ...paymentForm,
                                    amount: booking.final_cost || booking.estimated_cost || 0
                                  });
                                  setShowPaymentModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-900 text-sm"
                              >
                                Pay
                              </button>
                            )}
                            {booking.status === 'completed' && (
                              <button
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setShowReviewModal(true);
                                }}
                                className="text-green-600 hover:text-green-900 text-sm"
                              >
                                Review
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}



        {/* All Modals */}
        <>
        {showBookingForm && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="booking-modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowBookingForm(false)}></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full max-h-screen overflow-y-auto">
                <form onSubmit={handleBookService}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Book Service</h3>
                        {selectedProvider && (
                          <p className="text-sm text-gray-600 mt-1">with {selectedProvider.full_name}</p>
                        )}
                      </div>
                      <button type="button" onClick={() => setShowBookingForm(false)} className="text-gray-400 hover:text-gray-600">
                        <XCircleIcon className="h-6 w-6" />
                      </button>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Service Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Service Category</label>
                          <select
                            value={bookingForm.service_category}
                            onChange={(e) => setBookingForm({...bookingForm, service_category: e.target.value})}
                            className="form-input w-full"
                            required
                          >
                            {serviceCategories.map(category => (
                              <option key={category.value} value={category.value}>{category.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Service Specialty *</label>
                          <select
                            value={bookingForm.service_specialty}
                            onChange={(e) => setBookingForm({...bookingForm, service_specialty: e.target.value})}
                            className="form-input w-full"
                            required
                          >
                            <option value="">Select specialty</option>
                            <option value="general">General Service</option>
                            <option value="plumber">Plumber</option>
                            <option value="electrician">Electrician</option>
                            <option value="hvac">HVAC Technician</option>
                            <option value="cleaner">Professional Cleaner</option>
                            <option value="handyman">Handyman</option>
                            <option value="gardener">Gardener</option>
                            <option value="security">Security</option>
                            <option value="painter">Painter</option>
                            <option value="carpenter">Carpenter</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Priority Level</label>
                          <select
                            value={bookingForm.priority}
                            onChange={(e) => setBookingForm({...bookingForm, priority: e.target.value})}
                            className="form-input w-full"
                            required
                          >
                            {priorityOptions.map(priority => (
                              <option key={priority.value} value={priority.value}>
                                {priority.label} - {priority.description}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Duration</label>
                          <select
                            value={bookingForm.estimated_duration}
                            onChange={(e) => setBookingForm({...bookingForm, estimated_duration: parseInt(e.target.value)})}
                            className="form-input w-full"
                          >
                            <option value={30}>30 minutes</option>
                            <option value={60}>1 hour</option>
                            <option value={90}>1.5 hours</option>
                            <option value={120}>2 hours</option>
                            <option value={180}>3 hours</option>
                            <option value={240}>4 hours</option>
                            <option value={480}>Full day (8 hours)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Service Title</label>
                        <input 
                          type="text" 
                          required 
                          value={bookingForm.title} 
                          onChange={(e) => setBookingForm({...bookingForm, title: e.target.value})} 
                          className="form-input w-full"
                          placeholder="e.g., Fix leaky faucet, Deep cleaning, Garden maintenance"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea 
                          rows={3} 
                          required 
                          value={bookingForm.description} 
                          onChange={(e) => setBookingForm({...bookingForm, description: e.target.value})} 
                          className="form-input w-full"
                          placeholder="Describe the service needed in detail..."
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Date</label>
                          <input 
                            type="date" 
                            required 
                            value={bookingForm.scheduled_date} 
                            onChange={(e) => setBookingForm({...bookingForm, scheduled_date: e.target.value})} 
                            className="form-input w-full"
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Time</label>
                          <input 
                            type="time" 
                            value={bookingForm.scheduled_time} 
                            onChange={(e) => setBookingForm({...bookingForm, scheduled_time: e.target.value})} 
                            className="form-input w-full"
                          />
                        </div>
                      </div>

                      {/* Fixed Payment Method Selection - Always Visible */}
                      <div className="border-t pt-6 mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-4">Preferred Payment Method *</label>
                        <div className="space-y-3">
                          {/* Cash Payment */}
                          <label className={`cursor-pointer flex items-center p-4 rounded-lg border-2 transition-all duration-200 ${
                            bookingForm.payment_method === 'cash'
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                          }`}>
                            <input
                              type="radio"
                              name="payment_method"
                              value="cash"
                              checked={bookingForm.payment_method === 'cash'}
                              onChange={(e) => setBookingForm({...bookingForm, payment_method: e.target.value})}
                              className="sr-only"
                            />
                            <BanknotesIcon className={`h-6 w-6 flex-shrink-0 mr-3 ${
                              bookingForm.payment_method === 'cash' ? 'text-blue-600' : 'text-gray-500'
                            }`} />
                            <div className="flex-1">
                              <div className={`font-medium ${
                                bookingForm.payment_method === 'cash' ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                Cash on Service
                              </div>
                              <div className={`text-sm mt-1 ${
                                bookingForm.payment_method === 'cash' ? 'text-blue-700' : 'text-gray-600'
                              }`}>
                                Pay when service is completed
                              </div>
                            </div>
                            {bookingForm.payment_method === 'cash' && (
                              <CheckCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 ml-2" />
                            )}
                          </label>

                          {/* Credit Card Payment */}
                          <label className={`cursor-pointer flex items-center p-4 rounded-lg border-2 transition-all duration-200 ${
                            bookingForm.payment_method === 'card'
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                          }`}>
                            <input
                              type="radio"
                              name="payment_method"
                              value="card"
                              checked={bookingForm.payment_method === 'card'}
                              onChange={(e) => setBookingForm({...bookingForm, payment_method: e.target.value})}
                              className="sr-only"
                            />
                            <CreditCardIcon className={`h-6 w-6 flex-shrink-0 mr-3 ${
                              bookingForm.payment_method === 'card' ? 'text-blue-600' : 'text-gray-500'
                            }`} />
                            <div className="flex-1">
                              <div className={`font-medium ${
                                bookingForm.payment_method === 'card' ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                Credit/Debit Card
                              </div>
                              <div className={`text-sm mt-1 ${
                                bookingForm.payment_method === 'card' ? 'text-blue-700' : 'text-gray-600'
                              }`}>
                                Secure online payment
                              </div>
                            </div>
                            {bookingForm.payment_method === 'card' && (
                              <CheckCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 ml-2" />
                            )}
                          </label>

                          {/* Bank Transfer Payment */}
                          <label className={`cursor-pointer flex items-center p-4 rounded-lg border-2 transition-all duration-200 ${
                            bookingForm.payment_method === 'bank_transfer'
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                          }`}>
                            <input
                              type="radio"
                              name="payment_method"
                              value="bank_transfer"
                              checked={bookingForm.payment_method === 'bank_transfer'}
                              onChange={(e) => setBookingForm({...bookingForm, payment_method: e.target.value})}
                              className="sr-only"
                            />
                            <BuildingLibraryIcon className={`h-6 w-6 flex-shrink-0 mr-3 ${
                              bookingForm.payment_method === 'bank_transfer' ? 'text-blue-600' : 'text-gray-500'
                            }`} />
                            <div className="flex-1">
                              <div className={`font-medium ${
                                bookingForm.payment_method === 'bank_transfer' ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                Bank Transfer
                              </div>
                              <div className={`text-sm mt-1 ${
                                bookingForm.payment_method === 'bank_transfer' ? 'text-blue-700' : 'text-gray-600'
                              }`}>
                                Direct bank transfer
                              </div>
                            </div>
                            {bookingForm.payment_method === 'bank_transfer' && (
                              <CheckCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 ml-2" />
                            )}
                          </label>

                          {/* Mobile Payment */}
                          <label className={`cursor-pointer flex items-center p-4 rounded-lg border-2 transition-all duration-200 ${
                            bookingForm.payment_method === 'mobile_pay'
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                          }`}>
                            <input
                              type="radio"
                              name="payment_method"
                              value="mobile_pay"
                              checked={bookingForm.payment_method === 'mobile_pay'}
                              onChange={(e) => setBookingForm({...bookingForm, payment_method: e.target.value})}
                              className="sr-only"
                            />
                            <DevicePhoneMobileIcon className={`h-6 w-6 flex-shrink-0 mr-3 ${
                              bookingForm.payment_method === 'mobile_pay' ? 'text-blue-600' : 'text-gray-500'
                            }`} />
                            <div className="flex-1">
                              <div className={`font-medium ${
                                bookingForm.payment_method === 'mobile_pay' ? 'text-blue-900' : 'text-gray-900'
                              }`}>
                                Mobile Payment
                              </div>
                              <div className={`text-sm mt-1 ${
                                bookingForm.payment_method === 'mobile_pay' ? 'text-blue-700' : 'text-gray-600'
                              }`}>
                                Pay using mobile wallet
                              </div>
                            </div>
                            {bookingForm.payment_method === 'mobile_pay' && (
                              <CheckCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 ml-2" />
                            )}
                          </label>
                        </div>
                      </div>

                      {/* Additional Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes (Optional)</label>
                        <textarea 
                          rows={2} 
                          value={bookingForm.booking_notes} 
                          onChange={(e) => setBookingForm({...bookingForm, booking_notes: e.target.value})} 
                          className="form-input w-full"
                          placeholder="Any specific requirements or instructions..."
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button 
                      type="submit" 
                      className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-base font-medium text-white hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-all duration-200"
                    >
                      <CalendarIcon className="h-5 w-5 mr-2" />
                      Book Service
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowBookingForm(false)} 
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showPaymentModal && selectedBooking && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowPaymentModal(false)}></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <form onSubmit={handlePayment}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-medium text-gray-900">Process Payment</h3>
                      <button type="button" onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                        <XCircleIcon className="h-6 w-6" />
                      </button>
                    </div>

                    {/* Booking Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6 border border-blue-200">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                        Booking Summary
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Service:</span>
                            <span className="font-medium text-gray-900">{selectedBooking.title}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Provider:</span>
                            <span className="font-medium text-gray-900">{selectedBooking.provider_name}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Date:</span>
                            <span className="font-medium">{new Date(selectedBooking.scheduled_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="font-semibold text-gray-900">Total Amount:</span>
                            <span className="font-bold text-green-600 text-lg">${paymentForm.amount}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Amount Input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount</label>
                        <div className="relative">
                          <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0"
                            required
                            value={paymentForm.amount} 
                            onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value) || 0})} 
                            className="form-input pl-10 w-full text-lg"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Enhanced Payment Methods */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-4">Select Payment Method</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {paymentMethods.map(method => {
                            const IconComponent = method.icon;
                            return (
                              <label key={method.value} className="relative flex cursor-pointer">
                                <input
                                  type="radio"
                                  name="payment_method"
                                  value={method.value}
                                  checked={paymentForm.payment_method === method.value}
                                  onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                                  className="sr-only"
                                />
                                <div className={`flex-1 p-4 rounded-lg border-2 transition-all duration-200 ${
                                  paymentForm.payment_method === method.value
                                    ? 'border-blue-500 bg-blue-50 shadow-md'
                                    : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
                                } ${method.color}`}>
                                  <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0">
                                      <IconComponent className={`h-6 w-6 ${
                                        paymentForm.payment_method === method.value 
                                          ? 'text-blue-600' 
                                          : 'text-gray-500'
                                      }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className={`font-medium ${
                                        paymentForm.payment_method === method.value 
                                          ? 'text-blue-900' 
                                          : 'text-gray-900'
                                      }`}>
                                        {method.label}
                                      </div>
                                      <div className={`text-xs mt-1 ${
                                        paymentForm.payment_method === method.value 
                                          ? 'text-blue-700' 
                                          : 'text-gray-600'
                                      }`}>
                                        {method.description}
                                      </div>
                                    </div>
                                    {paymentForm.payment_method === method.value && (
                                      <CheckCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                    )}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Payment Method Specific Information */}
                      {paymentForm.payment_method === 'card' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h5 className="font-medium text-blue-900 mb-2">Credit/Debit Card Payment</h5>
                          <p className="text-sm text-blue-800">You will be redirected to our secure payment gateway to complete your card payment.</p>
                        </div>
                      )}

                      {paymentForm.payment_method === 'bank_transfer' && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <h5 className="font-medium text-purple-900 mb-2">Bank Transfer Details</h5>
                          <p className="text-sm text-purple-800">Transfer instructions will be provided after confirming this payment method.</p>
                        </div>
                      )}

                      {paymentForm.payment_method === 'qr_code' && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h5 className="font-medium text-gray-900 mb-2">QR Code Payment</h5>
                          <p className="text-sm text-gray-700">A QR code will be generated for you to scan with your mobile payment app.</p>
                        </div>
                      )}

                      {paymentForm.payment_method === 'cash' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h5 className="font-medium text-green-900 mb-2">Cash Payment</h5>
                          <p className="text-sm text-green-800">Payment will be collected when the service is completed. Please have the exact amount ready.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button 
                      type="submit" 
                      className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-base font-medium text-white hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm transition-all duration-200"
                    >
                      <CreditCardIcon className="h-5 w-5 mr-2" />
                      Process Payment (${paymentForm.amount})
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowPaymentModal(false)} 
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showReviewModal && selectedBooking && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowReviewModal(false)}></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleReview}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Leave a Review</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating</label>
                        <div className="flex space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} type="button" onClick={() => setReviewForm({...reviewForm, overall_rating: star})}>
                              <StarIconSolid className={`h-6 w-6 ${star <= reviewForm.overall_rating ? 'text-yellow-400' : 'text-gray-300'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Written Review</label>
                        <textarea rows={4} value={reviewForm.written_review} onChange={(e) => setReviewForm({...reviewForm, written_review: e.target.value})} className="form-input w-full" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm">Submit Review</button>
                    <button type="button" onClick={() => setShowReviewModal(false)} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        </>
      </div>
    </div>
  );
};

export default ServiceBooking;