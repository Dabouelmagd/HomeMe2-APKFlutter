import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import OwnerPageHeader from '../components/shared/OwnerPageHeader';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  BuildingOfficeIcon,
  InformationCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  StarIcon
} from '@heroicons/react/24/outline';

const API = process.env.REACT_APP_BACKEND_URL;

// Facility type icons mapping
const facilityIcons = {
  swimming_pool: '🏊',
  gym: '🏋️',
  tennis_court: '🎾',
  football_field: '⚽',
  basketball_court: '🏀',
  party_hall: '🎉',
  meeting_room: '📋',
  bbq_area: '🍖',
  kids_playground: '🎠',
  parking: '🚗',
  other: '🏢'
};

const FacilityBooking = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const dateLocale = isRTL ? ar : enUS;
  
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availability, setAvailability] = useState(null);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [bookingPurpose, setBookingPurpose] = useState('');
  const [numGuests, setNumGuests] = useState(1);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  
  // Admin state
  const [allBookings, setAllBookings] = useState([]);
  const [showAddFacility, setShowAddFacility] = useState(false);
  const [editFacility, setEditFacility] = useState(null);
  const [facilityForm, setFacilityForm] = useState({
    name: '', name_ar: '', description: '', description_ar: '',
    facility_type: 'swimming_pool', capacity: 20, hourly_rate: 0,
    operating_hours: { start: '08:00', end: '22:00' },
    min_booking_hours: 1, max_booking_hours: 4, requires_approval: false,
    rules: [], rules_ar: []
  });
  
  const token = localStorage.getItem('token');
  const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };
  
  // Get user from localStorage
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = storedUser.role === 'admin' || storedUser.role === 'super_admin';

  useEffect(() => {
    fetchFacilities();
    fetchMyBookings();
    if (isAdmin) fetchAllBookings();
  }, []);

  useEffect(() => {
    if (selectedFacility && selectedDate) {
      fetchAvailability();
    }
  }, [selectedFacility, selectedDate]);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/facilities`, axiosConfig);
      setFacilities(response.data.facilities || []);
    } catch (error) {
      console.error('Error fetching facilities:', error);
      toast.error(t('failed_load_facilities'));
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    try {
      const response = await axios.get(`${API}/api/facility-bookings?user_only=true`, axiosConfig);
      setMyBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const fetchAllBookings = async () => {
    if (!isAdmin) return;
    try {
      const response = await axios.get(`${API}/api/facility-bookings`, axiosConfig);
      setAllBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Error fetching all bookings:', error);
    }
  };

  const handleAddFacility = async (e) => {
    e.preventDefault();
    try {
      if (editFacility) {
        await axios.put(`${API}/api/facilities/${editFacility._id}`, facilityForm, axiosConfig);
        toast.success(t('facility_updated', 'تم تحديث المرفق بنجاح'));
      } else {
        await axios.post(`${API}/api/facilities`, facilityForm, axiosConfig);
        toast.success(t('facility_created', 'تم إضافة المرفق بنجاح'));
      }
      setShowAddFacility(false);
      setEditFacility(null);
      fetchFacilities();
    } catch (err) {
      toast.error(t('facility_save_failed', 'فشل في حفظ المرفق'));
    }
  };

  const handleDeleteFacility = async (id) => {
    if (!window.confirm(t('confirm_delete_facility', 'هل تريد حذف هذا المرفق؟'))) return;
    try {
      await axios.delete(`${API}/api/facilities/${id}`, axiosConfig);
      toast.success(t('facility_deleted', 'تم حذف المرفق'));
      fetchFacilities();
    } catch (err) {
      toast.error(t('delete_failed', 'فشل في الحذف'));
    }
  };

  const handleUpdateBookingStatus = async (bookingId, status) => {
    try {
      await axios.put(`${API}/api/facility-bookings/${bookingId}/status`, { status }, axiosConfig);
      toast.success(t('booking_updated', 'تم تحديث حالة الحجز'));
      fetchAllBookings();
      fetchMyBookings();
    } catch (err) {
      toast.error(t('update_failed', 'فشل في التحديث'));
    }
  };

  const fetchAvailability = async () => {
    if (!selectedFacility) return;
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await axios.get(
        `${API}/api/facilities/${selectedFacility._id}/availability?date=${dateStr}`,
        axiosConfig
      );
      setAvailability(response.data);
      setSelectedSlots([]);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error(t('failed_load_availability'));
    }
  };

  const handleSlotClick = (slot) => {
    if (!slot.available) return;
    
    const slotIndex = selectedSlots.findIndex(s => s.start === slot.start);
    
    if (slotIndex > -1) {
      // Remove slot
      setSelectedSlots(selectedSlots.filter(s => s.start !== slot.start));
    } else {
      // Add slot (check consecutive)
      const newSlots = [...selectedSlots, slot].sort((a, b) => a.start.localeCompare(b.start));
      
      // Validate max booking hours
      if (newSlots.length > selectedFacility.max_booking_hours) {
        toast.error(t('max_booking_hours_exceeded', { hours: selectedFacility.max_booking_hours }));
        return;
      }
      
      // Check if slots are consecutive
      let isConsecutive = true;
      for (let i = 1; i < newSlots.length; i++) {
        const prevEnd = newSlots[i - 1].end;
        const currStart = newSlots[i].start;
        if (prevEnd !== currStart) {
          isConsecutive = false;
          break;
        }
      }
      
      if (!isConsecutive && newSlots.length > 1) {
        toast.error(t('slots_must_be_consecutive'));
        return;
      }
      
      setSelectedSlots(newSlots);
    }
  };

  const handleBooking = async () => {
    if (selectedSlots.length === 0) {
      toast.error(t('select_time_slots'));
      return;
    }
    
    if (selectedSlots.length < selectedFacility.min_booking_hours) {
      toast.error(t('min_booking_hours_required', { hours: selectedFacility.min_booking_hours }));
      return;
    }
    
    try {
      setBookingLoading(true);
      
      const bookingData = {
        facility_id: selectedFacility._id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: selectedSlots[0].start,
        end_time: selectedSlots[selectedSlots.length - 1].end,
        purpose: bookingPurpose,
        num_guests: numGuests
      };
      
      const response = await axios.post(`${API}/api/facility-bookings`, bookingData, axiosConfig);
      
      toast.success(t('booking_created_successfully'));
      
      // Reset form
      setSelectedSlots([]);
      setBookingPurpose('');
      setNumGuests(1);
      
      // Refresh data
      fetchAvailability();
      fetchMyBookings();
      
      // Show confirmation if requires approval
      if (selectedFacility.requires_approval) {
        toast.info(t('booking_pending_approval'));
      }
      
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error.response?.data?.detail || t('booking_failed'));
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm(t('confirm_cancel_booking'))) return;
    
    try {
      await axios.post(`${API}/api/facility-bookings/${bookingId}/cancel`, {}, axiosConfig);
      toast.success(t('booking_cancelled'));
      fetchMyBookings();
    } catch (error) {
      toast.error(error.response?.data?.detail || t('cancel_failed'));
    }
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  };

  const calculateTotalPrice = () => {
    if (!selectedFacility || selectedSlots.length === 0) return 0;
    return selectedSlots.length * selectedFacility.hourly_rate;
  };

  const getStatusBadge = (status) => {
    const styles = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      confirmed: t('confirmed'),
      pending: t('pending'),
      cancelled: t('cancelled'),
      completed: t('completed')
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir={isRTL ? 'rtl' : 'ltr'}>
      <OwnerPageHeader
        iconEmoji="🏟️"
        badge={t('facility_booking_badge', 'حجز المرافق المشتركة')}
        title={t('facility_booking')}
        subtitle={t('facility_booking_description')}
      />
      <div className="max-w-7xl mx-auto p-6">

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('browse')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'browse'
                  ? 'text-rose-600 border-b-2 border-rose-600 bg-rose-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CalendarIcon className="h-5 w-5 inline-block mr-2 rtl:ml-2 rtl:mr-0" />
              {t('browse_facilities')}
            </button>
            <button
              onClick={() => setActiveTab('my-bookings')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'my-bookings'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CheckCircleIcon className="h-5 w-5 inline-block mr-2 rtl:ml-2 rtl:mr-0" />
              {t('my_bookings')} ({myBookings.length})
            </button>
            {isAdmin && (
              <button
                onClick={() => { setActiveTab('admin'); fetchAllBookings(); }}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'admin'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                data-testid="admin-tab"
              >
                <BuildingOfficeIcon className="h-5 w-5 inline-block mr-2 rtl:ml-2 rtl:mr-0" />
                {t('manage_facilities', 'إدارة المرافق')}
              </button>
            )}
          </div>
        </div>

        {activeTab === 'browse' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Facilities List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('available_facilities')}</h2>
                
                <div className="space-y-3">
                  {facilities.map((facility) => (
                    <div
                      key={facility._id}
                      onClick={() => setSelectedFacility(facility)}
                      className={`p-4 rounded-lg cursor-pointer transition-all ${
                        selectedFacility?._id === facility._id
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50 border border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{facilityIcons[facility.facility_type] || '🏢'}</span>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {isRTL ? facility.name_ar : facility.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {t('capacity')}: {facility.capacity} {t('guests')}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-semibold text-green-600">
                              {facility.hourly_rate > 0 
                                ? `${facility.hourly_rate} ${t('egp_per_hour')}`
                                : t('free')}
                            </span>
                            {facility.requires_approval && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                {t('requires_approval')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Calendar & Booking */}
            <div className="lg:col-span-2">
              {selectedFacility ? (
                <div className="space-y-6">
                  {/* Facility Details */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start gap-4">
                      <span className="text-4xl">{facilityIcons[selectedFacility.facility_type] || '🏢'}</span>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900">
                          {isRTL ? selectedFacility.name_ar : selectedFacility.name}
                        </h2>
                        <p className="text-gray-600 mt-1">
                          {isRTL ? selectedFacility.description_ar : selectedFacility.description}
                        </p>
                        
                        <div className="flex flex-wrap gap-4 mt-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <UserGroupIcon className="h-4 w-4" />
                            {selectedFacility.capacity} {t('max_capacity')}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <ClockIcon className="h-4 w-4" />
                            {selectedFacility.operating_hours?.start} - {selectedFacility.operating_hours?.end}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CurrencyDollarIcon className="h-4 w-4" />
                            {selectedFacility.hourly_rate > 0 
                              ? `${selectedFacility.hourly_rate} ${t('egp_per_hour')}`
                              : t('free')}
                          </div>
                        </div>

                        {/* Rules */}
                        {selectedFacility.rules && selectedFacility.rules.length > 0 && (
                          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                            <h4 className="text-sm font-medium text-yellow-800 mb-2 flex items-center gap-2">
                              <InformationCircleIcon className="h-4 w-4" />
                              {t('rules')}
                            </h4>
                            <ul className="text-sm text-yellow-700 list-disc list-inside">
                              {(isRTL ? selectedFacility.rules_ar : selectedFacility.rules).map((rule, i) => (
                                <li key={i}>{rule}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Date Selection */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('select_date')}</h3>
                    
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                      <span className="font-medium text-gray-900">
                        {format(currentWeekStart, 'MMMM yyyy', { locale: dateLocale })}
                      </span>
                      <button
                        onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2">
                      {getWeekDays().map((day) => (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDate(day)}
                          disabled={day < new Date(new Date().setHours(0, 0, 0, 0))}
                          className={`p-3 rounded-lg text-center transition-all ${
                            isSameDay(day, selectedDate)
                              ? 'bg-blue-600 text-white'
                              : day < new Date(new Date().setHours(0, 0, 0, 0))
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-50 hover:bg-blue-50 text-gray-700'
                          }`}
                        >
                          <div className="text-xs">{format(day, 'EEE', { locale: dateLocale })}</div>
                          <div className="text-lg font-semibold">{format(day, 'd')}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time Slots */}
                  {availability && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('available_time_slots')} - {format(selectedDate, 'EEEE, d MMMM', { locale: dateLocale })}
                      </h3>
                      
                      {availability.is_blocked ? (
                        <div className="text-center py-8 text-gray-500">
                          <XCircleIcon className="h-12 w-12 mx-auto mb-2 text-red-400" />
                          {t('date_not_available')}
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                            {availability.time_slots?.map((slot) => (
                              <button
                                key={slot.start}
                                onClick={() => handleSlotClick(slot)}
                                disabled={!slot.available}
                                className={`p-3 rounded-lg text-sm font-medium transition-all ${
                                  selectedSlots.some(s => s.start === slot.start)
                                    ? 'bg-blue-600 text-white'
                                    : slot.available
                                      ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                      : 'bg-red-50 text-red-400 cursor-not-allowed border border-red-200'
                                }`}
                              >
                                {slot.start}
                              </button>
                            ))}
                          </div>

                          <div className="flex gap-4 mt-4 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div>
                              {t('available')}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-red-50 border border-red-200"></div>
                              {t('booked')}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-blue-600"></div>
                              {t('selected')}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Booking Form */}
                  {selectedSlots.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('booking_details')}</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('time_selected')}
                          </label>
                          <div className="p-3 bg-blue-50 rounded-lg text-blue-700 font-medium">
                            {selectedSlots[0].start} - {selectedSlots[selectedSlots.length - 1].end}
                            <span className="text-sm text-blue-500 mx-2">({selectedSlots.length} {t('hours')})</span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('number_of_guests')}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={selectedFacility.capacity}
                            value={numGuests}
                            onChange={(e) => setNumGuests(parseInt(e.target.value) || 1)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('purpose_optional')}
                          </label>
                          <input
                            type="text"
                            value={bookingPurpose}
                            onChange={(e) => setBookingPurpose(e.target.value)}
                            placeholder={t('enter_purpose')}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Total Price */}
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                        <span className="text-lg font-medium text-gray-700">{t('total_price')}</span>
                        <span className="text-2xl font-bold text-green-600">
                          {calculateTotalPrice() > 0 
                            ? `${calculateTotalPrice()} ${t('egp')}`
                            : t('free')}
                        </span>
                      </div>

                      <button
                        onClick={handleBooking}
                        disabled={bookingLoading}
                        className="w-full mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {bookingLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            {t('processing')}
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="h-5 w-5" />
                            {t('confirm_booking')}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <BuildingOfficeIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">{t('select_facility')}</h3>
                  <p className="text-gray-500 mt-1">{t('select_facility_hint')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Bookings Tab */}
        {activeTab === 'my-bookings' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {myBookings.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">{t('no_bookings')}</h3>
                <p className="text-gray-500 mt-1">{t('no_bookings_hint')}</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('browse_facilities')}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">{t('facility')}</th>
                      <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">{t('date')}</th>
                      <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">{t('time')}</th>
                      <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">{t('status')}</th>
                      <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">{t('price')}</th>
                      <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {myBookings.map((booking) => (
                      <tr key={booking._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span>{facilityIcons[booking.facility_type] || '🏢'}</span>
                            <span className="font-medium text-gray-900">
                              {isRTL ? booking.facility_name_ar : booking.facility_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{booking.date}</td>
                        <td className="px-6 py-4 text-gray-700">
                          {booking.start_time} - {booking.end_time}
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(booking.status)}</td>
                        <td className="px-6 py-4 text-gray-700">
                          {booking.total_price > 0 ? `${booking.total_price} ${t('egp')}` : t('free')}
                        </td>
                        <td className="px-6 py-4">
                          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                            <button
                              onClick={() => handleCancelBooking(booking._id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              {t('cancel')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-6">
            {/* Admin Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">{t('manage_facilities', 'إدارة المرافق')}</h2>
              <button
                onClick={() => {
                  setEditFacility(null);
                  setFacilityForm({ name: '', name_ar: '', description: '', description_ar: '', facility_type: 'swimming_pool', capacity: 20, hourly_rate: 0, operating_hours: { start: '08:00', end: '22:00' }, min_booking_hours: 1, max_booking_hours: 4, requires_approval: false, rules: [], rules_ar: [] });
                  setShowAddFacility(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                data-testid="add-facility-btn"
              >
                + {t('add_facility', 'إضافة مرفق')}
              </button>
            </div>

            {/* Facilities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {facilities.map(f => (
                <div key={f._id} className="bg-white rounded-xl border border-gray-200 p-5" data-testid={`admin-facility-${f._id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{facilityIcons[f.facility_type] || '🏢'}</span>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditFacility(f); setFacilityForm({ name: f.name, name_ar: f.name_ar || '', description: f.description || '', description_ar: f.description_ar || '', facility_type: f.facility_type, capacity: f.capacity, hourly_rate: f.hourly_rate, operating_hours: f.operating_hours || { start: '08:00', end: '22:00' }, min_booking_hours: f.min_booking_hours || 1, max_booking_hours: f.max_booking_hours || 4, requires_approval: f.requires_approval || false, rules: f.rules || [], rules_ar: f.rules_ar || [] }); setShowAddFacility(true); }}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                      <button onClick={() => handleDeleteFacility(f._id)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900">{isRTL ? f.name_ar || f.name : f.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{t('capacity')}: {f.capacity} | {f.hourly_rate > 0 ? `${f.hourly_rate} ${t('egp_per_hour')}` : t('free')}</p>
                  <p className="text-xs text-gray-400 mt-1">{f.operating_hours?.start} - {f.operating_hours?.end}</p>
                  {f.requires_approval && <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">{t('requires_approval')}</span>}
                </div>
              ))}
            </div>

            {/* All Bookings */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b">
                <h3 className="text-lg font-bold text-gray-900">{t('all_bookings', 'جميع الحجوزات')} ({allBookings.length})</h3>
              </div>
              {allBookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">{t('facility', 'المرفق')}</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">{t('resident', 'المقيم')}</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">{t('date', 'التاريخ')}</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">{t('time', 'الوقت')}</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">{t('status', 'الحالة')}</th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">{t('actions', 'إجراءات')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allBookings.map(b => (
                        <tr key={b._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{facilityIcons[b.facility_type] || '🏢'} {isRTL ? b.facility_name_ar || b.facility_name : b.facility_name}</td>
                          <td className="px-4 py-3 text-gray-700">{b.user_name || '-'}</td>
                          <td className="px-4 py-3 text-gray-700">{b.date}</td>
                          <td className="px-4 py-3 text-gray-700">{b.start_time} - {b.end_time}</td>
                          <td className="px-4 py-3">{getStatusBadge(b.status)}</td>
                          <td className="px-4 py-3">
                            {b.status === 'pending' && (
                              <div className="flex gap-1">
                                <button onClick={() => handleUpdateBookingStatus(b._id, 'confirmed')} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200">{t('approve', 'موافقة')}</button>
                                <button onClick={() => handleUpdateBookingStatus(b._id, 'cancelled')} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200">{t('reject', 'رفض')}</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">{t('no_bookings', 'لا توجد حجوزات')}</div>
              )}
            </div>
          </div>
        )}

        {/* Add/Edit Facility Modal */}
        {showAddFacility && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddFacility(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="facility-modal">
              <h3 className="text-lg font-bold mb-4">{editFacility ? t('edit_facility', 'تعديل المرفق') : t('add_facility', 'إضافة مرفق جديد')}</h3>
              <form onSubmit={handleAddFacility} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium mb-1">{t('name_en', 'الاسم (إنجليزي)')}</label><input type="text" value={facilityForm.name} onChange={e => setFacilityForm(p => ({...p, name: e.target.value}))} className="w-full border rounded-lg p-2.5" required /></div>
                  <div><label className="block text-sm font-medium mb-1">{t('name_ar', 'الاسم (عربي)')}</label><input type="text" value={facilityForm.name_ar} onChange={e => setFacilityForm(p => ({...p, name_ar: e.target.value}))} className="w-full border rounded-lg p-2.5" /></div>
                </div>
                <div><label className="block text-sm font-medium mb-1">{t('facility_type', 'نوع المرفق')}</label>
                  <select value={facilityForm.facility_type} onChange={e => setFacilityForm(p => ({...p, facility_type: e.target.value}))} className="w-full border rounded-lg p-2.5">
                    {Object.entries(facilityIcons).map(([k, v]) => <option key={k} value={k}>{v} {k.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium mb-1">{t('capacity', 'السعة')}</label><input type="number" value={facilityForm.capacity} onChange={e => setFacilityForm(p => ({...p, capacity: +e.target.value}))} className="w-full border rounded-lg p-2.5" /></div>
                  <div><label className="block text-sm font-medium mb-1">{t('hourly_rate', 'السعر/ساعة')}</label><input type="number" value={facilityForm.hourly_rate} onChange={e => setFacilityForm(p => ({...p, hourly_rate: +e.target.value}))} className="w-full border rounded-lg p-2.5" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-sm font-medium mb-1">{t('opens', 'يفتح')}</label><input type="time" value={facilityForm.operating_hours.start} onChange={e => setFacilityForm(p => ({...p, operating_hours: {...p.operating_hours, start: e.target.value}}))} className="w-full border rounded-lg p-2.5" /></div>
                  <div><label className="block text-sm font-medium mb-1">{t('closes', 'يغلق')}</label><input type="time" value={facilityForm.operating_hours.end} onChange={e => setFacilityForm(p => ({...p, operating_hours: {...p.operating_hours, end: e.target.value}}))} className="w-full border rounded-lg p-2.5" /></div>
                </div>
                <label className="flex items-center gap-2"><input type="checkbox" checked={facilityForm.requires_approval} onChange={e => setFacilityForm(p => ({...p, requires_approval: e.target.checked}))} /><span className="text-sm">{t('requires_approval', 'يتطلب موافقة المدير')}</span></label>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium">{t('save', 'حفظ')}</button>
                  <button type="button" onClick={() => setShowAddFacility(false)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium">{t('cancel', 'إلغاء')}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacilityBooking;
