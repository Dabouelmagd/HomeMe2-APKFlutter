import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, useNotifications } from '../App';
import {
  HomeIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  UsersIcon,
  UserPlusIcon,
  SpeakerWaveIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftEllipsisIcon,
  BellIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  WrenchScrewdriverIcon,
  BoltIcon,
  CogIcon,
  PhotoIcon,
  ClockIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  MagnifyingGlassIcon,
  CommandLineIcon,
  DocumentTextIcon,
  HandRaisedIcon,
  HomeModernIcon,
  EnvelopeIcon,
  NewspaperIcon
} from '@heroicons/react/24/outline';
import LanguageSwitcher from './LanguageSwitcher';
import { TransliterationToggle } from './TransliterationToggle';

const Layout = () => {
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';

  // Search functionality
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      handleSearch(query);
    }, 300);
    
    // Clear previous timeout
    if (window.searchTimeout) {
      clearTimeout(window.searchTimeout);
    }
    window.searchTimeout = timeoutId;
  };

  const handleSearchResultClick = (result) => {
    setShowSearchResults(false);
    setSearchQuery('');
    
    // Navigate based on result type
    switch (result.type) {
      case 'user':
        navigate('/family');
        break;
      case 'residence':
        navigate('/compound');
        break;
      case 'service':
        navigate('/services');
        break;
      case 'message':
        navigate('/messages');
        break;
      default:
        break;
    }
  };

  // Keyboard shortcut for search (Cmd+K or Ctrl+K)
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
      }
      if (e.key === 'Escape') {
        setShowSearchResults(false);
        document.getElementById('global-search-input')?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close search results when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.search-container')) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    {
      name: t('dashboard'),
      href: '/dashboard',
      icon: HomeIcon,
      show: true
    },
    {
      name: t('compound_management'),
      href: '/compound',
      icon: BuildingOfficeIcon,
      show: true
    },
    {
      name: t('services_management'),
      href: '/services',
      icon: WrenchScrewdriverIcon,
      show: true
    },
    {
      name: t('maintenance_system'),
      href: '/maintenance',
      icon: CogIcon,
      show: true
    },
    {
      name: t('guest_management'),
      href: '/guests',
      icon: UsersIcon,
      show: true
    },
    {
      name: t('events_announcements'),
      href: '/events',
      icon: SpeakerWaveIcon,
      show: true
    },
    {
      name: t('advanced_analytics'),
      href: '/analytics',
      icon: ChartBarIcon,
      show: user?.role === 'admin'
    },
    {
      name: t('document_management'),
      href: '/documents',
      icon: DocumentTextIcon,
      show: true
    },
    {
      name: t('voting_system'),
      href: '/voting',
      icon: HandRaisedIcon,
      show: true
    },
    {
      name: t('smart_home'),
      href: '/smart-home',
      icon: HomeModernIcon,
      show: true
    },
    {
      name: t('government_utility_gateway'),
      href: '/utilities',
      icon: BoltIcon,
      show: true
    },
    {
      name: t('family_management'),
      href: '/family',
      icon: UsersIcon,
      show: true
    },
    {
      name: 'Add Family Member',
      href: '/add-family-member',
      icon: UserPlusIcon,
      show: true
    },
    {
      name: t('financial_management'),
      href: '/finances',
      icon: CurrencyDollarIcon,
      show: true
    },
    {
      name: t('message_center'),
      href: '/messages',
      icon: ChatBubbleLeftEllipsisIcon,
      show: true
    },
    {
      name: t('chat.chats'),
      href: '/chat',
      icon: ChatBubbleLeftEllipsisIcon,
      show: true
    },
    {
      name: t('gallery.title'),
      href: '/gallery',
      icon: PhotoIcon,
      show: true
    },
    {
      name: t('schedule.title'),
      href: '/schedule',
      icon: ClockIcon,
      show: true
    },
    {
      name: t('notifications_nav'),
      href: '/notifications',
      icon: BellIcon,
      show: true
    },
    {
      name: t('settings.settings'),
      href: '/settings',
      icon: CogIcon,
      show: true
    },
    {
      name: '💎 Pricing Plans',
      href: '/pricing',
      icon: CurrencyDollarIcon,
      show: true
    },
    {
      name: t('legal.title'),
      href: '/terms-privacy',
      icon: DocumentTextIcon,
      show: true
    },
    {
      name: t('legal.contact.title'),
      href: '/contact',
      icon: EnvelopeIcon,
      show: true
    },
    {
      name: 'Community Newsletter',
      href: '/newsletter',
      icon: NewspaperIcon,
      show: true
    },
    {
      name: t('enterprise.dashboard'),
      href: '/enterprise-register',
      icon: BuildingOffice2Icon,
      show: user?.role === 'admin' // Only show for admins
    }
  ];

  const isActive = (href) => location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <div className={`flex h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}
      `}>
        <div className="flex items-center justify-between h-20 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img 
                src="https://customer-assets.emergentagent.com/job_c6284a52-3971-4d5d-97ad-6dbfb32cfec5/artifacts/lwjnxovk_WhatsApp%20Image%202022-01-17%20at%2010.23.44%20AM.637bf42d664818.47361218.jpeg"
                alt="HomeMe Logo"
                className="h-24 w-auto"
              />
            </div>
          </div>
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.filter(item => item.show).map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                  ${isActive(item.href)
                    ? `bg-blue-50 text-blue-700 ${isRTL ? 'border-l-2 border-blue-700' : 'border-r-2 border-blue-700'}`
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon
                  className={`${isRTL ? 'ml-3' : 'mr-3'} h-5 w-5 ${
                    isActive(item.href) ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-700'
                  }`}
                />
                {item.name}
                {item.name === t('notifications') && unreadCount > 0 && (
                  <span className={`${isRTL ? 'mr-auto' : 'ml-auto'} bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center`}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="px-3 py-2">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                </div>
                <div className={`${isRTL ? 'mr-3' : 'ml-3'}`}>
                  <p className="text-sm font-medium text-gray-700">
                    {user?.full_name}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {t(user?.role)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-2 space-y-1">
              <LanguageSwitcher className="w-full justify-start" />
              <TransliterationToggle className="px-2 py-1" />
              
              <button
                onClick={handleLogout}
                className={`group flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50 hover:text-gray-900`}
              >
                <ArrowRightOnRectangleIcon className={`${isRTL ? 'ml-3' : 'mr-3'} h-5 w-5 text-gray-500 group-hover:text-gray-700`} />
                {t('sign_out')}
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:ml-0">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6 text-gray-500" />
            </button>

            <div className="flex-1 min-w-0 mx-4">
              <div className="search-container relative max-w-lg">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon 
                      className={`h-5 w-5 ${isSearching ? 'text-blue-500' : 'text-gray-400'}`} 
                    />
                  </div>
                  <input
                    id="global-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    placeholder={t('search_placeholder', 'Search users, residences, services...')}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <kbd className="inline-flex items-center px-2 py-1 border border-gray-200 rounded text-xs font-sans font-medium text-gray-400 bg-gray-50">
                      <CommandLineIcon className="h-3 w-3 mr-1" />
                      K
                    </kbd>
                  </div>
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50">
                    {isSearching ? (
                      <div className="px-4 py-6 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="text-sm text-gray-500 mt-2">Searching...</p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="py-2">
                        {searchResults.map((result, index) => (
                          <button
                            key={index}
                            onClick={() => handleSearchResultClick(result)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                          >
                            <div className="flex items-center">
                              <div className="flex-shrink-0">
                                {result.type === 'user' && <UsersIcon className="h-5 w-5 text-gray-400" />}
                                {result.type === 'residence' && <HomeIcon className="h-5 w-5 text-gray-400" />}
                                {result.type === 'service' && <WrenchScrewdriverIcon className="h-5 w-5 text-gray-400" />}
                                {result.type === 'message' && <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-gray-400" />}
                              </div>
                              <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900">{result.title}</p>
                                <p className="text-sm text-gray-500">{result.description}</p>
                              </div>
                              <div className="ml-3 flex-shrink-0">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                                  {result.type}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : searchQuery ? (
                      <div className="px-4 py-6 text-center">
                        <MagnifyingGlassIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-900">No results found</p>
                        <p className="text-sm text-gray-500">Try different keywords or check spelling</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                to="/notifications"
                className="p-2 text-gray-500 hover:text-gray-700 relative"
              >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;