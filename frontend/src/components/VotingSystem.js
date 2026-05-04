import React, { useState, useEffect } from 'react';
import axios from 'axios';
import OwnerPageHeader from './shared/OwnerPageHeader';
import PageHero from './shared/PageHero';
import { useAuth } from '../App';
import { usePermissions } from '../hooks/usePermissions';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  HandRaisedIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UsersIcon,
  ChartBarIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  DocumentTextIcon,
  BanknotesIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { 
  HandRaisedIcon as HandRaisedSolidIcon,
  CheckCircleIcon as CheckCircleSolidIcon,
  XCircleIcon as XCircleSolidIcon 
} from '@heroicons/react/24/solid';
import { formatDate, formatRelativeTime } from '../utils/dateUtils';
import useTabState from '../hooks/useTabState';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VotingSystem = () => {
  const { user } = useAuth();
  const { isAdmin: isAdminRole } = usePermissions();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useTabState('active');
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    search: ''
  });

  // Form state for new poll
  const [pollForm, setPollForm] = useState({
    title: '',
    description: '',
    category: '',
    type: 'single_choice',
    options: ['', ''],
    voting_end_date: '',
    is_anonymous: false,
    require_justification: false,
    min_participation: 0,
    eligible_voters: 'all',
    attachments: []
  });

  const pollCategories = [
    { value: 'general', label: t('general'), icon: DocumentTextIcon, color: 'bg-blue-100 text-blue-800' },
    { value: 'budget', label: t('budget'), icon: BanknotesIcon, color: 'bg-green-100 text-green-800' },
    { value: 'maintenance', label: t('maintenance'), icon: WrenchScrewdriverIcon, color: 'bg-orange-100 text-orange-800' },
    { value: 'policy', label: t('policy'), icon: BuildingOfficeIcon, color: 'bg-purple-100 text-purple-800' },
    { value: 'community', label: t('community'), icon: UsersIcon, color: 'bg-pink-100 text-pink-800' },
    { value: 'emergency', label: t('emergency'), icon: ExclamationTriangleIcon, color: 'bg-red-100 text-red-800' }
  ];

  const pollTypes = [
    { value: 'single_choice', label: t('single_choice') },
    { value: 'multiple_choice', label: t('multiple_choice') },
    { value: 'yes_no', label: t('yes_no') },
    { value: 'rating', label: t('rating_scale') },
    { value: 'ranking', label: t('ranking') }
  ];

  const pollStatuses = [
    { value: 'draft', label: t('draft'), color: 'bg-gray-100 text-gray-800', icon: DocumentTextIcon },
    { value: 'active', label: t('active'), color: 'bg-green-100 text-green-800', icon: HandRaisedIcon },
    { value: 'ended', label: t('ended'), color: 'bg-blue-100 text-blue-800', icon: CheckCircleIcon },
    { value: 'cancelled', label: t('cancelled'), color: 'bg-red-100 text-red-800', icon: XCircleIcon }
  ];

  useEffect(() => {
    fetchVotingData();
  }, []);

  const fetchVotingData = async () => {
    try {
      setLoading(true);
      const [pollsRes, statsRes] = await Promise.all([
        axios.get(`${API}/polls`),
        axios.get(`${API}/polls/stats`)
      ]);
      
      setPolls(pollsRes.data.polls || []);
      setStats(statsRes.data.stats || {});
    } catch (error) {
      toast.error('Failed to load voting data');
      console.error('Voting fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    try {
      // Build options matching backend PollOption schema (List[Dict] with text)
      const cleanedOptions = pollForm.options
        .map(o => (o || '').trim())
        .filter(o => o !== '');

      const optionsPayload = pollForm.type === 'yes_no'
        ? [{ text: t('yes', 'نعم') }, { text: t('no', 'لا') }]
        : cleanedOptions.map(text => ({ text }));

      // Map frontend "type" to backend "vote_type"
      const vote_type = pollForm.type;

      // Backend expects start_date and end_date
      const now = new Date();
      const start_date = now.toISOString();
      const end_date = pollForm.voting_end_date
        ? new Date(pollForm.voting_end_date).toISOString()
        : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const payload = {
        title: pollForm.title,
        description: pollForm.description,
        vote_type,
        options: optionsPayload,
        require_family_head_only: pollForm.eligible_voters === 'family_heads',
        allow_anonymous_voting: !!pollForm.is_anonymous,
        require_comment: !!pollForm.require_justification,
        start_date,
        end_date,
        eligible_families: [],
        min_participation_rate: pollForm.min_participation
          ? Number(pollForm.min_participation) / 100
          : null,
      };

      await axios.post(`${API}/polls`, payload);

      toast.success(t('poll_created_successfully', 'تم إنشاء التصويت بنجاح'));
      setShowCreateModal(false);
      resetPollForm();
      fetchVotingData();
    } catch (error) {
      const msg = error?.response?.data?.detail || t('failed_to_create_poll', 'فشل إنشاء التصويت');
      toast.error(typeof msg === 'string' ? msg : t('failed_to_create_poll', 'فشل إنشاء التصويت'));
      console.error('Create poll error:', error);
    }
  };

  const resetPollForm = () => {
    setPollForm({
      title: '',
      description: '',
      category: '',
      type: 'single_choice',
      options: ['', ''],
      voting_end_date: '',
      is_anonymous: false,
      require_justification: false,
      min_participation: 0,
      eligible_voters: 'all',
      attachments: []
    });
  };

  const handleVote = async (pollId, selectedOptions, justification = '') => {
    try {
      await axios.post(`${API}/polls/${pollId}/vote`, {
        selected_options: selectedOptions,
        justification: justification
      });

      toast.success('Vote submitted successfully!');
      fetchVotingData();
    } catch (error) {
      toast.error('Failed to submit vote');
      console.error('Vote error:', error);
    }
  };

  const handlePollAction = async (pollId, action) => {
    try {
      await axios.patch(`${API}/polls/${pollId}/${action}`);
      
      const actionMessages = {
        publish: 'Poll published successfully!',
        end: 'Poll ended successfully!',
        cancel: 'Poll cancelled successfully!'
      };

      toast.success(actionMessages[action] || 'Action completed successfully!');
      fetchVotingData();
    } catch (error) {
      toast.error(`Failed to ${action} poll`);
      console.error(`Poll ${action} error:`, error);
    }
  };

  const addOption = () => {
    setPollForm(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const removeOption = (index) => {
    if (pollForm.options.length > 2) {
      setPollForm(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const updateOption = (index, value) => {
    setPollForm(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const getCategoryBadge = (category) => {
    const categoryConfig = pollCategories.find(c => c.value === category);
    if (!categoryConfig) return null;
    
    const Icon = categoryConfig.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryConfig.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {categoryConfig.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = pollStatuses.find(s => s.value === status);
    if (!statusConfig) return null;
    
    const Icon = statusConfig.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </span>
    );
  };

  const getEndDate = (poll) => poll.end_date || poll.voting_end_date;

  const getVotesCount = (poll) => poll.total_votes ?? poll.votes_count ?? 0;
  const getEligibleCount = (poll) =>
    poll.total_eligible_voters ?? poll.eligible_voters_count ?? 0;

  const getParticipationRate = (poll) => {
    const eligible = getEligibleCount(poll);
    if (!eligible) return 0;
    return Math.round((getVotesCount(poll) / eligible) * 100);
  };

  const hasUserVoted = (poll) => {
    if (poll.user_has_voted) return true;
    return poll.user_votes && poll.user_votes.some(vote => vote.user_id === user?.id);
  };

  const isPollClosed = (poll) =>
    ['ended', 'closed', 'cancelled'].includes(poll.status);

  const canUserVote = (poll) => {
    return poll.status === 'active' && !hasUserVoted(poll) && new Date(getEndDate(poll)) > new Date();
  };

  const filteredPolls = polls.filter(poll => {
    if (activeTab === 'active' && poll.status !== 'active') return false;
    if (activeTab === 'ended' && !isPollClosed(poll)) return false;
    if (activeTab === 'draft' && poll.status !== 'draft') return false;

    if (filters.status !== 'all' && poll.status !== filters.status) return false;
    if (filters.search && !poll.title?.toLowerCase().includes(filters.search.toLowerCase())) return false;

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
    <div>
      <div className="p-6 max-w-7xl mx-auto">
      <PageHero
        icon="🗳️"
        title={t('voting_system')}
        subtitle={t('voting_system_description')}
        accent="purple"
        actions={isAdminRole && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-purple-700 rounded-xl font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all text-sm"
            data-testid="create-poll-btn"
          >
            <PlusIcon className="w-4 h-4" />
            {t('create_poll', 'إنشاء تصويت جديد')}
          </button>
        )}
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('active_polls')}</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.active_polls || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500">
              <HandRaisedIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('total_votes')}</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.total_votes || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-500">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('participation_rate')}</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.participation_rate || 0}%</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-500">
              <UsersIcon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('completed_polls')}</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.completed_polls || 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-500">
              <TrophyIcon className="h-6 w-6 text-white" />
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
                placeholder={t('search_polls')}
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
              {pollCategories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
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
              {pollStatuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('active_polls')}
          </button>
          <button
            onClick={() => setActiveTab('ended')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'ended'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('completed_polls')}
          </button>
          {isAdminRole && (
            <button
              onClick={() => setActiveTab('draft')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'draft'
                  ? 'border-gray-500 text-gray-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('draft_polls')}
            </button>
          )}
        </nav>
      </div>

      {/* Polls List */}
      <div className="space-y-6">
        {filteredPolls.length === 0 ? (
          <div className="text-center py-12">
            <HandRaisedIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 text-center">{t('no_polls_found')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('no_polls_found_description')}</p>
            {isAdminRole && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                data-testid="create-poll-empty-btn"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                {t('create_poll', 'إنشاء تصويت جديد')}
              </button>
            )}
          </div>
        ) : (
          filteredPolls.map((poll) => (
            <div key={poll.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-center text-center text-gray-900 text-center">{poll.title}</h3>
                      {getStatusBadge(poll.status)}
                    </div>
                    
                    <p className="text-gray-700 mb-3">{poll.description}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center">
                        <CalendarDaysIcon className="w-4 h-4 mr-1" />
                        {t('ends', 'ينتهي')}: {formatDate(getEndDate(poll))}
                      </span>
                      <span className="flex items-center">
                        <UsersIcon className="w-4 h-4 mr-1" />
                        {getVotesCount(poll)} {t('votes', 'صوت')}
                      </span>
                      <span className="flex items-center">
                        <ChartBarIcon className="w-4 h-4 mr-1" />
                        {getParticipationRate(poll)}% {t('participation', 'مشاركة')}
                      </span>
                      {hasUserVoted(poll) && (
                        <span className="flex items-center text-green-600">
                          <CheckCircleSolidIcon className="w-4 h-4 mr-1" />
                          {t('voted', 'تم التصويت')}
                        </span>
                      )}
                    </div>

                    {/* Quick Vote for Simple Polls */}
                    {canUserVote(poll) && poll.vote_type === 'yes_no' && (
                      <div className="flex space-x-3 mb-4">
                        <button
                          onClick={() => {
                            const yesOpt = poll.options?.find(o => o.text === t('yes', 'نعم') || o.text?.toLowerCase() === 'yes');
                            handleVote(poll.id, [yesOpt?.id || (poll.options?.[0]?.id)]);
                          }}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircleIcon className="w-4 h-4 mr-2" />
                          {t('yes')}
                        </button>
                        <button
                          onClick={() => {
                            const noOpt = poll.options?.find(o => o.text === t('no', 'لا') || o.text?.toLowerCase() === 'no');
                            handleVote(poll.id, [noOpt?.id || (poll.options?.[1]?.id)]);
                          }}
                          className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          <XCircleIcon className="w-4 h-4 mr-2" />
                          {t('no')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                {poll.min_participation_rate > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>{t('minimum_participation')}: {Math.round((poll.min_participation_rate || 0) * 100)}%</span>
                      <span>{getParticipationRate(poll)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          getParticipationRate(poll) >= (poll.min_participation_rate || 0) * 100
                            ? 'bg-green-500'
                            : 'bg-orange-500'
                        }`}
                        style={{ width: `${Math.min(getParticipationRate(poll), 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        setSelectedPoll(poll);
                        setShowDetailsModal(true);
                      }}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      <EyeIcon className="w-4 h-4" />
                      <span>{t('view_details')}</span>
                    </button>
                    
                    {canUserVote(poll) && poll.vote_type !== 'yes_no' && (
                      <button
                        onClick={() => {
                          setSelectedPoll(poll);
                          setShowDetailsModal(true);
                        }}
                        className="flex items-center space-x-1 text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        <HandRaisedSolidIcon className="w-4 h-4" />
                        <span>{t('vote_now')}</span>
                      </button>
                    )}
                  </div>

                  {isAdminRole && (
                    <div className="flex items-center space-x-2">
                      {poll.status === 'draft' && (
                        <button
                          onClick={() => handlePollAction(poll.id, 'publish')}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          {t('publish')}
                        </button>
                      )}
                      {poll.status === 'active' && (
                        <button
                          onClick={() => handlePollAction(poll.id, 'end')}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          {t('end_poll')}
                        </button>
                      )}
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
          ))
        )}
      </div>

      {/* Create Poll Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-center text-center text-gray-900 text-center">{t('create_new_poll')}</h2>
            </div>
            
            <form onSubmit={handleCreatePoll} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('poll_title')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={pollForm.title}
                    onChange={(e) => setPollForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('poll_title_placeholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('category')} *
                  </label>
                  <select
                    required
                    value={pollForm.category}
                    onChange={(e) => setPollForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('select_category')}</option>
                    {pollCategories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('poll_type')} *
                  </label>
                  <select
                    required
                    value={pollForm.type}
                    onChange={(e) => setPollForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {pollTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('voting_end_date')} *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={pollForm.voting_end_date}
                    onChange={(e) => setPollForm(prev => ({ ...prev, voting_end_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('min_participation')} (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={pollForm.min_participation}
                    onChange={(e) => setPollForm(prev => ({ ...prev, min_participation: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('description')} *
                </label>
                <textarea
                  required
                  rows={4}
                  value={pollForm.description}
                  onChange={(e) => setPollForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('poll_description_placeholder')}
                />
              </div>

              {pollForm.type !== 'yes_no' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('poll_options')} *
                  </label>
                  <div className="space-y-2">
                    {pollForm.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={`${t('option')} ${index + 1}`}
                          required
                        />
                        {pollForm.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="p-2 text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addOption}
                      className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <PlusIcon className="w-4 h-4 mr-1" />
                      {t('add_option')}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={pollForm.is_anonymous}
                    onChange={(e) => setPollForm(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{t('anonymous_voting')}</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={pollForm.require_justification}
                    onChange={(e) => setPollForm(prev => ({ ...prev, require_justification: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{t('require_justification')}</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetPollForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('create_poll')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Poll Details Modal */}
      {showDetailsModal && selectedPoll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-center text-center text-gray-900 text-center">{selectedPoll.title}</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    {getStatusBadge(selectedPoll.status)}
                  </div>
                  <p className="text-gray-700">{selectedPoll.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-gray-900 text-center">{getVotesCount(selectedPoll)}</p>
                    <p className="text-sm text-gray-600">{t('total_votes')}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-purple-600">{getParticipationRate(selectedPoll)}%</p>
                    <p className="text-sm text-gray-600">{t('participation_rate')}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-blue-600">{getEligibleCount(selectedPoll)}</p>
                    <p className="text-sm text-gray-600">{t('eligible_voters')}</p>
                  </div>
                </div>

                {/* Voting Options and Results */}
                <div>
                  <h3 className="text-lg font-medium text-center text-center text-gray-900 mb-4">
                    {isPollClosed(selectedPoll) ? t('results') : t('voting_options')}
                  </h3>
                  <div className="space-y-3">
                    {selectedPoll.options?.map((option, index) => {
                      const optionId = option.id || option.text;
                      const voteCount = option.vote_count ?? selectedPoll.results?.[optionId] ?? 0;
                      const total = getVotesCount(selectedPoll);
                      const percentage = total > 0
                        ? Math.round((voteCount / total) * 100)
                        : 0;

                      return (
                        <div key={optionId || index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">{option.text || option}</span>
                            <span className="text-sm text-gray-600">
                              {voteCount} {t('votes')} ({percentage}%)
                            </span>
                          </div>
                          {isPollClosed(selectedPoll) && (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {canUserVote(selectedPoll) && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-3">{t('cast_your_vote')}</h4>
                    <p className="text-sm text-blue-700 mb-4">{t('voting_instructions')}</p>
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          // Implement voting logic here
                          toast.info('Voting interface to be implemented');
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        {t('submit_vote')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default VotingSystem;