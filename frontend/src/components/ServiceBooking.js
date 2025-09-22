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
    service_specialty: '',
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

  const loadProviders = async () => {
    try {
      const response = await axios.get(`${API}/service-providers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setProviders(response.data.providers || []);
    } catch (error) {
      console.error('Failed to load service providers:', error);
      toast.error('Failed to load service providers');
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
    } finally {
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
    let filtered = providers.filter(provider => {
      const matchesSearch = provider.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           provider.services.some(service => service.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || provider.services.includes(filterCategory);
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
      await axios.post(`${API}/service-bookings`, bookingForm);
      setShowBookingForm(false);
      resetBookingForm();
      await loadBookings();
    } catch (error) {
      console.error('Failed to book service:', error);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/service-bookings/${selectedBooking.id}/payment`, paymentForm);
      setShowPaymentModal(false);
      await loadBookings();
    } catch (error) {
      console.error('Failed to process payment:', error);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/service-bookings/${selectedBooking.id}/review`, reviewForm);
      setShowReviewModal(false);
      await loadBookings();
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const resetBookingForm = () => {
    setBookingForm({
      provider_id: '',
      service_category: 'maintenance',
      service_specialty: '',
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Booking</h1>
            <p className="mt-1 text-sm text-gray-600">
              Book services, manage payments, and leave reviews
            </p>
          </div>
          <button
            onClick={() => setShowBookingForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Book Service
          </button>
        </div>

        {/* Service Providers */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Service Providers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((provider) => (
              <div key={provider.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-lg font-medium text-white">
                      {provider.full_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{provider.full_name}</h3>
                    <div className="flex items-center space-x-2">
                      {renderStars(Math.floor(provider.average_rating))}
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
                    setShowBookingForm(true);
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Book Service
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* My Bookings */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Bookings</h2>
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
        </div>

        {/* Booking Form Modal */}
        {showBookingForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
              <h2 className="text-lg font-semibold mb-6">Book Service</h2>
              
              <form onSubmit={handleBookService} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Service Category</label>
                    <select
                      value={bookingForm.service_category}
                      onChange={(e) => {
                        setBookingForm({
                          ...bookingForm, 
                          service_category: e.target.value,
                          service_specialty: ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {serviceCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
                    <select
                      value={bookingForm.service_specialty}
                      onChange={(e) => setBookingForm({...bookingForm, service_specialty: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select specialty...</option>
                      {serviceCategories
                        .find(cat => cat.value === bookingForm.service_category)?.specialties
                        .map(spec => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service Title</label>
                  <input
                    type="text"
                    value={bookingForm.title}
                    onChange={(e) => setBookingForm({...bookingForm, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief title for your service request"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={bookingForm.description}
                    onChange={(e) => setBookingForm({...bookingForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Describe the service you need..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {priorityOptions.map(option => (
                      <label key={option.value} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="priority"
                          value={option.value}
                          checked={bookingForm.priority === option.value}
                          onChange={(e) => setBookingForm({...bookingForm, priority: e.target.value})}
                          className="text-blue-600"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Date</label>
                    <input
                      type="date"
                      value={bookingForm.scheduled_date}
                      onChange={(e) => setBookingForm({...bookingForm, scheduled_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={bookingForm.scheduled_time}
                      onChange={(e) => setBookingForm({...bookingForm, scheduled_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                    <input
                      type="number"
                      value={bookingForm.estimated_duration}
                      onChange={(e) => setBookingForm({...bookingForm, estimated_duration: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="30"
                      step="30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {paymentMethods.map(method => (
                      <label key={method.value} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="payment_method"
                          value={method.value}
                          checked={bookingForm.payment_method === method.value}
                          onChange={(e) => setBookingForm({...bookingForm, payment_method: e.target.value})}
                          className="text-blue-600"
                        />
                        <span className="text-lg">{method.icon}</span>
                        <span className="text-sm">{method.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={bookingForm.is_recurring}
                    onChange={(e) => setBookingForm({...bookingForm, is_recurring: e.target.checked})}
                    className="text-blue-600"
                  />
                  <label htmlFor="recurring" className="text-sm text-gray-700">Make this a recurring service</label>
                </div>

                {bookingForm.is_recurring && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recurrence</label>
                    <select
                      value={bookingForm.recurrence_pattern}
                      onChange={(e) => setBookingForm({...bookingForm, recurrence_pattern: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select frequency...</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                  <textarea
                    value={bookingForm.booking_notes}
                    onChange={(e) => setBookingForm({...bookingForm, booking_notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    placeholder="Any additional information or special requirements..."
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBookingForm(false);
                      resetBookingForm();
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Book Service
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-lg font-semibold mb-4">Process Payment</h2>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Service:</div>
                <div className="font-medium">{selectedBooking.title}</div>
                <div className="text-sm text-gray-600 mt-1">Amount:</div>
                <div className="text-xl font-bold text-green-600">
                  ${selectedBooking.final_cost || selectedBooking.estimated_cost || 0}
                </div>
              </div>

              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <div className="space-y-2">
                    {paymentMethods.map(method => (
                      <label key={method.value} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="payment_method"
                          value={method.value}
                          checked={paymentForm.payment_method === method.value}
                          onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                          className="text-blue-600"
                        />
                        <span className="text-lg">{method.icon}</span>
                        <span className="text-sm font-medium">{method.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Process Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">Rate Service</h2>
              
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="font-medium">{selectedBooking.title}</div>
                <div className="text-sm text-gray-600">by {selectedBooking.provider_name}</div>
              </div>

              <form onSubmit={handleReview} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating</label>
                  {renderStars(reviewForm.overall_rating, true, (rating) => 
                    setReviewForm({...reviewForm, overall_rating: rating})
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                    {renderStars(reviewForm.quality_rating, true, (rating) => 
                      setReviewForm({...reviewForm, quality_rating: rating})
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Punctuality</label>
                    {renderStars(reviewForm.punctuality_rating, true, (rating) => 
                      setReviewForm({...reviewForm, punctuality_rating: rating})
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Professionalism</label>
                    {renderStars(reviewForm.professionalism_rating, true, (rating) => 
                      setReviewForm({...reviewForm, professionalism_rating: rating})
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Value</label>
                    {renderStars(reviewForm.value_rating, true, (rating) => 
                      setReviewForm({...reviewForm, value_rating: rating})
                    )}
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={reviewForm.would_recommend}
                      onChange={(e) => setReviewForm({...reviewForm, would_recommend: e.target.checked})}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Would you recommend this worker?</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Written Review</label>
                  <textarea
                    value={reviewForm.written_review}
                    onChange={(e) => setReviewForm({...reviewForm, written_review: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Share your experience..."
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={reviewForm.is_public}
                      onChange={(e) => setReviewForm({...reviewForm, is_public: e.target.checked})}
                      className="text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Make this review public</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Submit Review
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceBooking;