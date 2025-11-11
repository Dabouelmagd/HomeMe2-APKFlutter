import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  UsersIcon,
  HomeIcon,
  WrenchScrewdriverIcon,
  CreditCardIcon,
  UserGroupIcon,
  MegaphoneIcon,
  ClockIcon,
  FireIcon,
  ArrowRightIcon,
  FunnelIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const AdvancedSearchModal = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  const searchInputRef = useRef(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Categories with gradient colors
  const categories = [
    { id: 'all', name: t('all', 'الكل'), icon: MagnifyingGlassIcon, gradient: 'from-purple-500 to-pink-500', color: 'purple' },
    { id: 'users', name: t('users', 'المستخدمين'), icon: UsersIcon, gradient: 'from-blue-500 to-cyan-500', color: 'blue' },
    { id: 'units', name: t('units', 'الوحدات'), icon: HomeIcon, gradient: 'from-green-500 to-emerald-500', color: 'green' },
    { id: 'services', name: t('services', 'الخدمات'), icon: WrenchScrewdriverIcon, gradient: 'from-orange-500 to-red-500', color: 'orange' },
    { id: 'payments', name: t('payments', 'المدفوعات'), icon: CreditCardIcon, gradient: 'from-yellow-500 to-amber-500', color: 'yellow' },
    { id: 'visitors', name: t('visitors', 'الزوار'), icon: UserGroupIcon, gradient: 'from-indigo-500 to-purple-500', color: 'indigo' },
    { id: 'announcements', name: t('announcements', 'الإعلانات'), icon: MegaphoneIcon, gradient: 'from-pink-500 to-rose-500', color: 'pink' }
  ];

  // Quick shortcuts
  const quickShortcuts = [
    { name: t('dashboard', 'لوحة التحكم'), path: '/app/dashboard', icon: '🏠' },
    { name: t('user_management', 'إدارة المستخدمين'), path: '/app/users', icon: '👥' },
    { name: t('services', 'الخدمات'), path: '/app/services', icon: '🔧' },
    { name: t('financial_management', 'الإدارة المالية'), path: '/app/finances', icon: '💰' }
  ];

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    
    // Load search history from localStorage
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setSearchHistory(history.slice(0, 5));
  }, [isOpen]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedCategory]);

  const performSearch = async () => {
    setIsSearching(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API}/api/advanced-search`,
        {
          params: {
            q: searchQuery,
            category: selectedCategory
          },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setSearchResults(response.data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = (result) => {
    // Add to search history
    const newHistory = [
      { query: searchQuery, category: selectedCategory, timestamp: new Date().toISOString() },
      ...searchHistory.filter(h => h.query !== searchQuery)
    ].slice(0, 5);
    
    setSearchHistory(newHistory);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    
    // Navigate to result
    if (result.path) {
      navigate(result.path);
      onClose();
    }
  };

  const handleHistoryClick = (historyItem) => {
    setSearchQuery(historyItem.query);
    setSelectedCategory(historyItem.category);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <MagnifyingGlassIcon className="w-7 h-7" />
              {t('advanced_search', 'البحث المتقدم')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-all"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_everything', 'ابحث عن أي شيء...')}
              className="w-full pl-12 rtl:pl-4 rtl:pr-12 pr-4 py-3 rounded-xl border-2 border-white/30 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:border-white focus:bg-white/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 rtl:right-auto rtl:left-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-all"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all transform hover:scale-105 ${
                    isSelected
                      ? `bg-gradient-to-r ${category.gradient} text-white shadow-lg`
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[50vh] p-6">
          {/* Loading */}
          {isSearching && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          )}

          {/* Search Results */}
          {!isSearching && searchQuery && searchResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">
                {t('search_results', 'نتائج البحث')} ({searchResults.length})
              </h3>
              {searchResults.map((result, index) => {
                const category = categories.find(c => c.id === result.category);
                const Icon = category?.icon || MagnifyingGlassIcon;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category?.gradient} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left rtl:text-right">
                      <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {result.title}
                      </p>
                      <p className="text-sm text-gray-500">{result.description}</p>
                      {result.metadata && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full bg-${category?.color}-100 text-${category?.color}-700`}>
                            {category?.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <ArrowRightIcon className={`w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-all group-hover:translate-x-1 ${isRTL ? 'rotate-180' : ''}`} />
                  </button>
                );
              })}
            </div>
          )}

          {/* No Results */}
          {!isSearching && searchQuery && searchResults.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MagnifyingGlassIcon className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-2">
                {t('no_results_found', 'لا توجد نتائج')}
              </p>
              <p className="text-gray-500">
                {t('try_different_keywords', 'جرب كلمات بحث مختلفة')}
              </p>
            </div>
          )}

          {/* Default View - No Search Query */}
          {!searchQuery && (
            <div className="space-y-6">
              {/* Quick Shortcuts */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-3 flex items-center gap-2">
                  <FireIcon className="w-4 h-4 text-orange-500" />
                  {t('quick_access', 'وصول سريع')}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {quickShortcuts.map((shortcut, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        navigate(shortcut.path);
                        onClose();
                      }}
                      className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-purple-50 border border-gray-200 hover:border-blue-300 transition-all group"
                    >
                      <span className="text-2xl">{shortcut.icon}</span>
                      <span className="font-medium text-gray-700 group-hover:text-blue-600 text-sm">
                        {shortcut.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search History */}
              {searchHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-500 flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-blue-500" />
                      {t('recent_searches', 'عمليات البحث الأخيرة')}
                    </h3>
                    <button
                      onClick={clearHistory}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      {t('clear_all', 'مسح الكل')}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {searchHistory.map((item, index) => {
                      const category = categories.find(c => c.id === item.category);
                      
                      return (
                        <button
                          key={index}
                          onClick={() => handleHistoryClick(item)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group"
                        >
                          <ClockIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                          <div className="flex-1 text-left rtl:text-right">
                            <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                              {item.query}
                            </p>
                            {category && (
                              <p className="text-xs text-gray-500">{category.name}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Keyboard Shortcuts Hint */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <CommandLineIcon className="w-4 h-4 text-blue-500" />
                  <span>
                    {t('keyboard_shortcuts', 'اختصارات لوحة المفاتيح')}: 
                    <kbd className="mx-1 px-2 py-1 bg-white rounded border border-gray-300 text-xs font-mono">Ctrl/Cmd + K</kbd>
                    {t('or', 'أو')}
                    <kbd className="mx-1 px-2 py-1 bg-white rounded border border-gray-300 text-xs font-mono">/</kbd>
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchModal;
