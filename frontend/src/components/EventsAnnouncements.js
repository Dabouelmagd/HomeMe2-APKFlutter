import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  SpeakerWaveIcon,
  CalendarDaysIcon,
  UsersIcon,
  MapPinIcon,
  ClockIcon,
  PlusIcon,
  MegaphoneIcon,
  HeartIcon,
  ChatBubbleLeftEllipsisIcon,
  ShareIcon,
  BookmarkIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TagIcon,
  UserGroupIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import {
  HeartIcon as HeartSolidIcon,
  BookmarkIcon as BookmarkSolidIcon
} from '@heroicons/react/24/solid';
import { formatDate, formatRelativeTime } from '../utils/dateUtils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EventsAnnouncements = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('all');
  const [events, setEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState('announcement'); // 'announcement' or 'event'
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    category: 'all',
    dateRange: 'all',
    priority: 'all',
    search: ''
  });

  // Form state for new announcement/event
  const [itemForm, setItemForm] = useState({
    title: '',
    content: '',
    category: '',
    priority: 'normal',
    scheduled_for: '',
    expires_at: '',
    event_date: '',
    event_time: '',
    event_location: '',
    max_attendees: '',
    registration_deadline: '',
    tags: [],
    images: [],
    is_emergency: false,
    send_push: true,
    send_email: false,
    target_audience: 'all'
  });

  const announcementCategories = [
    { value: 'general', label: t('general'), icon: '📢', color: 'bg-blue-100 text-blue-800' },
    { value: 'maintenance', label: t('maintenance'), icon: '🔧', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'security', label: t('security'), icon: '🔒', color: 'bg-red-100 text-red-800' },
    { value: 'community', label: t('community'), icon: '👥', color: 'bg-green-100 text-green-800' },
    { value: 'utilities', label: t('utilities'), icon: '⚡', color: 'bg-orange-100 text-orange-800' },
    { value: 'events', label: t('events'), icon: '🎉', color: 'bg-purple-100 text-purple-800' },
    { value: 'emergency', label: t('emergency'), icon: '🚨', color: 'bg-red-100 text-red-800' }
  ];

  const eventCategories = [
    { value: 'social', label: t('social_event'), icon: '🎉', color: 'bg-pink-100 text-pink-800' },
    { value: 'sports', label: t('sports_event'), icon: '⚽', color: 'bg-green-100 text-green-800' },
    { value: 'cultural', label: t('cultural_event'), icon: '🎭', color: 'bg-purple-100 text-purple-800' },
    { value: 'educational', label: t('educational_event'), icon: '📚', color: 'bg-blue-100 text-blue-800' },
    { value: 'health', label: t('health_event'), icon: '🏥', color: 'bg-teal-100 text-teal-800' },
    { value: 'business', label: t('business_event'), icon: '💼', color: 'bg-gray-100 text-gray-800' },
    { value: 'religious', label: t('religious_event'), icon: '📿', color: 'bg-indigo-100 text-indigo-800' }
  ];

  const priorityLevels = [
    { value: 'low', label: t('low_priority'), color: 'bg-gray-100 text-gray-800' },
    { value: 'normal', label: t('normal_priority'), color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: t('high_priority'), color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: t('urgent_priority'), color: 'bg-red-100 text-red-800' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventsRes, announcementsRes, statsRes] = await Promise.all([
        axios.get(`${API}/events`),
        axios.get(`${API}/announcements`),
        axios.get(`${API}/events/stats`)
      ]);
      
      setEvents(eventsRes.data.events || []);
      setAnnouncements(announcementsRes.data.announcements || []);
      setStats(statsRes.data.stats || {});
    } catch (error) {
      toast.error('Failed to load data');
      console.error('Data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      const endpoint = createType === 'event' ? '/events' : '/announcements';
      const formData = {
        ...itemForm,
        type: createType
      };

      // Handle datetime combinations for events
      if (createType === 'event' && itemForm.event_date && itemForm.event_time) {
        formData.event_datetime = `${itemForm.event_date}T${itemForm.event_time}`;
      }

      const response = await axios.post(`${API}${endpoint}`, formData);

      toast.success(`${createType === 'event' ? 'Event' : 'Announcement'} created successfully!`);
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(`Failed to create ${createType}`);
      console.error('Create item error:', error);
    }
  };

  const resetForm = () => {
    setItemForm({
      title: '',
      content: '',
      category: '',
      priority: 'normal',
      scheduled_for: '',
      expires_at: '',
      event_date: '',
      event_time: '',
      event_location: '',
      max_attendees: '',
      registration_deadline: '',
      tags: [],
      images: [],
      is_emergency: false,
      send_push: true,
      send_email: false,
      target_audience: 'all'
    });
  };

  const handleLike = async (itemId, itemType) => {
    try {
      await axios.post(`${API}/${itemType}s/${itemId}/like`);
      fetchData();
    } catch (error) {
      toast.error('Failed to like item');
    }
  };

  const handleBookmark = async (itemId, itemType) => {
    try {
      await axios.post(`${API}/${itemType}s/${itemId}/bookmark`);
      fetchData();
    } catch (error) {
      toast.error('Failed to bookmark item');
    }
  };

  const handleRSVP = async (eventId, response) => {
    try {
      await axios.post(`${API}/events/${eventId}/rsvp`, { response });
      toast.success(`RSVP ${response} successfully!`);
      fetchData();
    } catch (error) {
      toast.error('Failed to submit RSVP');
    }
  };

  const getCategoryBadge = (category, type) => {
    const categories = type === 'event' ? eventCategories : announcementCategories;
    const categoryConfig = categories.find(c => c.value === category);
    if (!categoryConfig) return null;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryConfig.color}`}>
        <span className="mr-1">{categoryConfig.icon}</span>
        {categoryConfig.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = priorityLevels.find(p => p.value === priority);
    if (!priorityConfig) return null;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityConfig.color}`}>
        {priorityConfig.label}
      </span>
    );
  };

  const filteredItems = () => {
    const allItems = [...announcements, ...events].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );

    return allItems.filter(item => {
      if (activeTab !== 'all') {
        if (activeTab === 'announcements' && !item.type) return false; // announcements don't have type
        if (activeTab === 'events' && item.type !== 'event') return false;
      }
      
      if (filters.category !== 'all' && item.category !== filters.category) return false;
      if (filters.priority !== 'all' && item.priority !== filters.priority) return false;
      if (filters.search && !item.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      
      return true;
    });
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
            <h1 className="text-3xl font-bold text-gray-900 text-center">{t('events_announcements')}</h1>
            <p className="text-gray-600 mt-2">{t('events_announcements_description')}</p>
          </div>
          {user?.role === 'admin' && (
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <button
                onClick={() => {
                  setCreateType('announcement');
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MegaphoneIcon className="w-5 h-5 mr-2" />
                {t('new_announcement')}
              </button>
              <button
                onClick={() => {
                  setCreateType('event');
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CalendarDaysIcon className="w-5 h-5 mr-2" />
                {t('new_event')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('total_announcements')}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_announcements || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <SpeakerWaveIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('upcoming_events')}</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.upcoming_events || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <CalendarDaysIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('total_participants')}</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.total_participants || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <UsersIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('engagement_rate')}</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.engagement_rate || 0}%</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500">
              <HeartIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                placeholder={t('search_events_announcements')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('category')}
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('all_categories')}</option>
              {announcementCategories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('priority')}
            </label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">{t('all_priorities')}</option>
              {priorityLevels.map(priority => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
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
              <option value="this_week">{t('this_week')}</option>
              <option value="this_month">{t('this_month')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('all_items')}
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'announcements'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('announcements')}
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'events'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('events')}
          </button>
        </nav>
      </div>

      {/* Items List */}
      <div className="space-y-6">
        {filteredItems().length === 0 ? (
          <div className="text-center py-12">
            <SpeakerWaveIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('no_items_found')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('no_items_found_description')}</p>
          </div>
        ) : (
          filteredItems().map((item) => {
            const isEvent = item.event_date || item.event_time;
            return (
              <div key={item.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                        {getCategoryBadge(item.category, isEvent ? 'event' : 'announcement')}
                        {getPriorityBadge(item.priority)}
                        {item.is_emergency && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                            {t('emergency')}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                        <span className="flex items-center">
                          <ClockIcon className="w-4 h-4 mr-1" />
                          {formatRelativeTime(item.created_at)}
                        </span>
                        <span>{t('by')} {item.author_name}</span>
                        {isEvent && item.event_date && (
                          <span className="flex items-center">
                            <CalendarDaysIcon className="w-4 h-4 mr-1" />
                            {formatDate(item.event_date)}
                          </span>
                        )}
                        {isEvent && item.event_location && (
                          <span className="flex items-center">
                            <MapPinIcon className="w-4 h-4 mr-1" />
                            {item.event_location}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-700 mb-4 line-clamp-3">{item.content}</p>
                      
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {item.tags.map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                              <TagIcon className="w-3 h-3 mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Event Details */}
                  {isEvent && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {item.event_date && (
                          <div className="flex items-center">
                            <CalendarDaysIcon className="w-4 h-4 mr-2 text-blue-600" />
                            <span>{formatDate(item.event_date)}</span>
                          </div>
                        )}
                        {item.event_time && (
                          <div className="flex items-center">
                            <ClockIcon className="w-4 h-4 mr-2 text-blue-600" />
                            <span>{item.event_time}</span>
                          </div>
                        )}
                        {item.max_attendees && (
                          <div className="flex items-center">
                            <UserGroupIcon className="w-4 h-4 mr-2 text-blue-600" />
                            <span>{item.attendees_count || 0}/{item.max_attendees} {t('attendees')}</span>
                          </div>
                        )}
                      </div>
                      
                      {isEvent && user?.role !== 'admin' && (
                        <div className="flex space-x-2 mt-4">
                          <button
                            onClick={() => handleRSVP(item.id, 'attending')}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            {t('attending')}
                          </button>
                          <button
                            onClick={() => handleRSVP(item.id, 'maybe')}
                            className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                          >
                            {t('maybe')}
                          </button>
                          <button
                            onClick={() => handleRSVP(item.id, 'not_attending')}
                            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                          >
                            {t('not_attending')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleLike(item.id, isEvent ? 'event' : 'announcement')}
                        className="flex items-center space-x-1 text-gray-500 hover:text-red-600 transition-colors"
                      >
                        {item.is_liked ? (
                          <HeartSolidIcon className="w-5 h-5 text-red-600" />
                        ) : (
                          <HeartIcon className="w-5 h-5" />
                        )}
                        <span className="text-sm">{item.likes_count || 0}</span>
                      </button>
                      
                      <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors">
                        <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
                        <span className="text-sm">{item.comments_count || 0}</span>
                      </button>
                      
                      <button
                        onClick={() => handleBookmark(item.id, isEvent ? 'event' : 'announcement')}
                        className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors"
                      >
                        {item.is_bookmarked ? (
                          <BookmarkSolidIcon className="w-5 h-5 text-blue-600" />
                        ) : (
                          <BookmarkIcon className="w-5 h-5" />
                        )}
                      </button>
                      
                      <button className="flex items-center space-x-1 text-gray-500 hover:text-green-600 transition-colors">
                        <ShareIcon className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setShowDetailsModal(true);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        {t('view_details')}
                      </button>
                      
                      {user?.role === 'admin' && (
                        <div className="flex space-x-1">
                          <button className="p-1 text-gray-600 hover:text-blue-600 transition-colors">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-gray-600 hover:text-red-600 transition-colors">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {t(`create_${createType}`)}
              </h2>
            </div>
            
            <form onSubmit={handleCreateItem} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('title')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemForm.title}
                    onChange={(e) => setItemForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('category')} *
                  </label>
                  <select
                    required
                    value={itemForm.category}
                    onChange={(e) => setItemForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('select_category')}</option>
                    {(createType === 'event' ? eventCategories : announcementCategories).map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('priority')}
                  </label>
                  <select
                    value={itemForm.priority}
                    onChange={(e) => setItemForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {priorityLevels.map(priority => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>

                {createType === 'event' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('event_date')} *
                      </label>
                      <input
                        type="date"
                        required
                        value={itemForm.event_date}
                        onChange={(e) => setItemForm(prev => ({ ...prev, event_date: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('event_time')} *
                      </label>
                      <input
                        type="time"
                        required
                        value={itemForm.event_time}
                        onChange={(e) => setItemForm(prev => ({ ...prev, event_time: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('event_location')}
                      </label>
                      <input
                        type="text"
                        value={itemForm.event_location}
                        onChange={(e) => setItemForm(prev => ({ ...prev, event_location: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('max_attendees')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={itemForm.max_attendees}
                        onChange={(e) => setItemForm(prev => ({ ...prev, max_attendees: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('scheduled_for')}
                  </label>
                  <input
                    type="datetime-local"
                    value={itemForm.scheduled_for}
                    onChange={(e) => setItemForm(prev => ({ ...prev, scheduled_for: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('expires_at')}
                  </label>
                  <input
                    type="datetime-local"
                    value={itemForm.expires_at}
                    onChange={(e) => setItemForm(prev => ({ ...prev, expires_at: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('content')} *
                </label>
                <textarea
                  required
                  rows={6}
                  value={itemForm.content}
                  onChange={(e) => setItemForm(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('content_placeholder')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={itemForm.is_emergency}
                      onChange={(e) => setItemForm(prev => ({ ...prev, is_emergency: e.target.checked }))}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{t('emergency_notification')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={itemForm.send_push}
                      onChange={(e) => setItemForm(prev => ({ ...prev, send_push: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{t('send_push_notification')}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={itemForm.send_email}
                      onChange={(e) => setItemForm(prev => ({ ...prev, send_email: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{t('send_email_notification')}</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('target_audience')}
                  </label>
                  <select
                    value={itemForm.target_audience}
                    onChange={(e) => setItemForm(prev => ({ ...prev, target_audience: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">{t('all_residents')}</option>
                    <option value="owners">{t('owners_only')}</option>
                    <option value="tenants">{t('tenants_only')}</option>
                    <option value="specific_units">{t('specific_units')}</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsAnnouncements;