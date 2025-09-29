import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ClockIcon,
  BookmarkIcon,
  XMarkIcon,
  CalendarIcon,
  UserIcon,
  ChatBubbleLeftEllipsisIcon,
  DocumentIcon,
  PhotoIcon,
  VideoCameraIcon,
  SpeakerWaveIcon,
  MicrophoneIcon,
  TrashIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MessageSearch = ({ isOpen, onClose, onSelectMessage }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showSaveSearch, setShowSaveSearch] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  
  // Advanced search filters
  const [filters, setFilters] = useState({
    search_type: 'text',
    message_types: [],
    file_types: [],
    date_from: '',
    date_to: '',
    sender_ids: []
  });
  
  const [page, setPage] = useState(0);
  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadSearchHistory();
      loadSavedSearches();
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  const loadSearchHistory = async () => {
    try {
      const response = await axios.get(`${API}/search/history?limit=10`);
      setSearchHistory(response.data.history || []);
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  const loadSavedSearches = async () => {
    try {
      const response = await axios.get(`${API}/search/saved`);
      setSavedSearches(response.data.saved_searches || []);
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  };

  const getSuggestions = useCallback(async (searchQuery) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await axios.get(`${API}/search/suggestions?query=${encodeURIComponent(searchQuery)}&limit=8`);
      setSuggestions(response.data.suggestions || []);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      setSuggestions([]);
    }
  }, []);

  const performSearch = async (searchQuery = query, resetPage = true) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setTotalResults(0);
      setHasMore(false);
      return;
    }

    const currentPage = resetPage ? 0 : page;
    setIsSearching(true);
    setShowSuggestions(false);

    try {
      const searchRequest = {
        query: searchQuery,
        search_type: filters.search_type,
        message_types: filters.message_types.length > 0 ? filters.message_types : undefined,
        file_types: filters.file_types.length > 0 ? filters.file_types : undefined,
        date_from: filters.date_from ? new Date(filters.date_from).toISOString() : undefined,
        date_to: filters.date_to ? new Date(filters.date_to).toISOString() : undefined,
        sender_ids: filters.sender_ids.length > 0 ? filters.sender_ids : undefined,
        limit: 20,
        skip: currentPage * 20,
        sort_by: 'created_at',
        sort_order: 'desc'
      };

      const response = await axios.post(`${API}/search/messages`, searchRequest);
      const results = response.data.results;

      if (resetPage) {
        setSearchResults(results.messages || []);
        setPage(0);
      } else {
        setSearchResults(prev => [...prev, ...(results.messages || [])]);
      }

      setTotalResults(results.total_count || 0);
      setHasMore(results.has_more || false);

      if (resetPage) {
        setPage(1);
      } else {
        setPage(prev => prev + 1);
      }

    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      setTotalResults(0);
      setHasMore(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    
    // Debounce suggestions
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      getSuggestions(value);
      setShowSuggestions(value.length >= 2);
    }, 300);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    performSearch();
  };

  const selectSuggestion = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion);
  };

  const selectHistoryItem = (historyItem) => {
    setQuery(historyItem.query);
    setFilters({
      search_type: historyItem.search_type,
      message_types: historyItem.filters.message_types || [],
      file_types: historyItem.filters.file_types || [],
      date_from: historyItem.filters.date_from || '',
      date_to: historyItem.filters.date_to || '',
      sender_ids: historyItem.filters.sender_ids || []
    });
    performSearch(historyItem.query);
  };

  const selectSavedSearch = (savedSearch) => {
    setQuery(savedSearch.query);
    if (savedSearch.filters) {
      setFilters({
        search_type: savedSearch.search_type,
        message_types: savedSearch.filters.message_types || [],
        file_types: savedSearch.filters.file_types || [],
        date_from: savedSearch.filters.date_from || '',
        date_to: savedSearch.filters.date_to || '',
        sender_ids: savedSearch.filters.sender_ids || []
      });
    }
    performSearch(savedSearch.query);
  };

  const saveSearch = async () => {
    if (!saveSearchName.trim() || !query.trim()) return;

    try {
      await axios.post(`${API}/search/saved`, {
        name: saveSearchName,
        query: query,
        search_type: filters.search_type,
        filters: filters
      });

      setSaveSearchName('');
      setShowSaveSearch(false);
      loadSavedSearches();
    } catch (error) {
      console.error('Failed to save search:', error);
      alert(error.response?.data?.detail || 'Failed to save search');
    }
  };

  const deleteSavedSearch = async (searchId) => {
    try {
      await axios.delete(`${API}/search/saved/${searchId}`);
      loadSavedSearches();
    } catch (error) {
      console.error('Failed to delete saved search:', error);
    }
  };

  const clearHistory = async () => {
    try {
      await axios.delete(`${API}/search/history`);
      setSearchHistory([]);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  };

  const loadMore = () => {
    if (hasMore && !isSearching) {
      performSearch(query, false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return t('chat.yesterday');
    } else {
      return date.toLocaleDateString();
    }
  };

  const getMessageTypeIcon = (messageType) => {
    switch (messageType) {
      case 'image': return <PhotoIcon className="h-4 w-4" />;
      case 'video': return <VideoCameraIcon className="h-4 w-4" />;
      case 'audio': return <SpeakerWaveIcon className="h-4 w-4" />;
      case 'voice': return <MicrophoneIcon className="h-4 w-4" />;
      case 'file': return <DocumentIcon className="h-4 w-4" />;
      default: return <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />;
    }
  };

  const highlightText = (text, searchTerm) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 text-center flex items-center">
            <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
            {t('search.searchMessages')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-6 py-4 border-b border-gray-200">
          <form onSubmit={handleSearch} className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder={t('search.searchPlaceholder')}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`text-gray-400 hover:text-gray-600 ${showAdvanced ? 'text-blue-600' : ''}`}
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
              </button>
              {query && (
                <button
                  type="button"
                  onClick={() => setShowSaveSearch(true)}
                  className="text-gray-400 hover:text-blue-600"
                >
                  <BookmarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Search Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => selectSuggestion(suggestion)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <span className="text-gray-600">{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Advanced Search Filters */}
          {showAdvanced && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Message Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('search.messageTypes')}
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'text', label: t('search.text'), icon: ChatBubbleLeftEllipsisIcon },
                      { value: 'image', label: t('search.images'), icon: PhotoIcon },
                      { value: 'video', label: t('search.videos'), icon: VideoCameraIcon },
                      { value: 'voice', label: t('search.voiceMessages'), icon: MicrophoneIcon },
                      { value: 'file', label: t('search.files'), icon: DocumentIcon }
                    ].map(type => {
                      const Icon = type.icon;
                      return (
                        <label key={type.value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.message_types.includes(type.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters(prev => ({
                                  ...prev,
                                  message_types: [...prev.message_types, type.value]
                                }));
                              } else {
                                setFilters(prev => ({
                                  ...prev,
                                  message_types: prev.message_types.filter(t => t !== type.value)
                                }));
                              }
                            }}
                            className="mr-2"
                          />
                          <Icon className="h-4 w-4 mr-1" />
                          <span className="text-sm">{type.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('search.dateRange')}
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={filters.date_from}
                      onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder={t('search.from')}
                    />
                    <input
                      type="date"
                      value={filters.date_to}
                      onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder={t('search.to')}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - History & Saved Searches */}
          <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
            {/* Search History */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700 flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {t('search.recentSearches')}
                </h3>
                {searchHistory.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {searchHistory.slice(0, 5).map((item, index) => (
                  <button
                    key={index}
                    onClick={() => selectHistoryItem(item)}
                    className="w-full text-left px-2 py-1 text-xs text-gray-600 hover:bg-white rounded truncate"
                  >
                    {item.query}
                  </button>
                ))}
                {searchHistory.length === 0 && (
                  <p className="text-xs text-gray-400">{t('search.noRecentSearches')}</p>
                )}
              </div>
            </div>

            {/* Saved Searches */}
            <div className="p-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <BookmarkSolidIcon className="h-4 w-4 mr-1" />
                {t('search.savedSearches')}
              </h3>
              <div className="space-y-1">
                {savedSearches.map((saved, index) => (
                  <div key={index} className="flex items-center justify-between group">
                    <button
                      onClick={() => selectSavedSearch(saved)}
                      className="flex-1 text-left px-2 py-1 text-xs text-gray-600 hover:bg-white rounded truncate"
                    >
                      {saved.name}
                    </button>
                    <button
                      onClick={() => deleteSavedSearch(saved.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {savedSearches.length === 0 && (
                  <p className="text-xs text-gray-400">{t('search.noSavedSearches')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto">
            {!query && !isSearching && (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MagnifyingGlassIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg mb-2">{t('search.searchMessagesDescription')}</p>
                  <p className="text-sm">{t('search.searchInstructions')}</p>
                </div>
              </div>
            )}

            {isSearching && page === 0 && (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {t('search.resultsFound', { count: totalResults, query })}
                  </p>
                </div>

                <div className="space-y-3">
                  {searchResults.map((message, index) => (
                    <div
                      key={index}
                      onClick={() => onSelectMessage && onSelectMessage(message)}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getMessageTypeIcon(message.message_type)}
                          <span className="font-medium text-gray-900">
                            {message.sender?.full_name || 'Unknown'}
                          </span>
                          <span className="text-xs text-gray-500">
                            in {message.chat?.name || `${message.chat?.chat_type} chat`}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(message.created_at)}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-700">
                        {message.message_type === 'voice' ? (
                          <div className="flex items-center space-x-2 text-blue-600">
                            <MicrophoneIcon className="h-4 w-4" />
                            <span>Voice message ({Math.round(message.voice_duration || 0)}s)</span>
                          </div>
                        ) : message.content ? (
                          highlightText(message.content, query)
                        ) : (
                          <span className="italic text-gray-500">
                            {message.attachments?.length > 0 ? 
                              `${message.attachments.length} attachment(s)` : 
                              'No content'
                            }
                          </span>
                        )}
                      </div>

                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
                          <DocumentIcon className="h-3 w-3" />
                          <span>{message.attachments.length} attachment(s)</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={loadMore}
                      disabled={isSearching}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSearching ? t('common.loading') : t('search.loadMore')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {query && !isSearching && searchResults.length === 0 && (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MagnifyingGlassIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg mb-2">{t('search.noResults')}</p>
                  <p className="text-sm">{t('search.tryDifferentKeywords')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Search Modal */}
        {showSaveSearch && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-medium mb-4">{t('search.saveSearch')}</h3>
              <input
                type="text"
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                placeholder={t('search.searchName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSaveSearch(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={saveSearch}
                  disabled={!saveSearchName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageSearch;