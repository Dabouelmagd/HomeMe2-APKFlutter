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
  UserGroupIcon,
  SpeakerWaveIcon,
  ChartBarIcon,
  ChartPieIcon,
  TicketIcon,
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
  NewspaperIcon,
  PhoneIcon,
  QuestionMarkCircleIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import LanguageSwitcher from './LanguageSwitcher';
import { TransliterationToggle } from './TransliterationToggle';

const Layout = ({ children, isTrialMode = false }) => {
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

  // Organized navigation with sections
  const navigationSections = [
    {
      title: t('main_sections'),
      items: [
        {
          name: t('dashboard'),
          href: 'dashboard',
          icon: HomeIcon,
          show: true
        },
        {
          name: t('compound_management'),
          href: 'compound',
          icon: BuildingOfficeIcon,
          show: user?.role === 'admin'
        },
        {
          name: t('residents_list'),
          href: 'residents',
          icon: UserGroupIcon,
          show: user?.role === 'admin'
        },
        {
          name: t('user_management'),
          href: 'users',
          icon: UsersIcon,
          show: user?.role === 'admin'
        },
        {
          name: t('monitoring_dashboard'),
          href: 'monitoring',
          icon: ChartPieIcon,
          show: user?.role === 'admin'
        },
        {
          name: 'Compounds Management',
          href: 'compounds-management',
          icon: HomeIcon,
          show: user?.role === 'admin' && user?.compound_id === 'super_admin'
        },
        {
          name: t('subscription_codes'),
          href: 'subscription-codes',
          icon: TicketIcon,
          show: user?.role === 'admin' && user?.compound_id === 'super_admin'
        }
      ]
    },
    {
      title: t('services_maintenance'),
      items: [
        {
          name: t('services_management'),
          href: 'services',
          icon: WrenchScrewdriverIcon,
          show: true
        },
        {
          name: t('maintenance_system'),
          href: 'maintenance',
          icon: CogIcon,
          show: true
        },
        {
          name: t('guest_management'),
          href: 'guests',
          icon: UsersIcon,
          show: true
        }
      ]
    },
    {
      title: t('family_management_section'),
      items: [
        {
          name: t('family_management'),
          href: 'family',
          icon: UsersIcon,
          show: true
        },
        {
          name: t('add_family_member'),
          href: 'add-family-member',
          icon: UserPlusIcon,
          show: true
        }
      ]
    },
    {
      title: t('financial_services'),
      items: [
        {
          name: t('financial_management'),
          href: 'finances',
          icon: CurrencyDollarIcon,
          show: true
        },
        {
          name: t('payment_center'),
          href: 'payments',
          icon: CreditCardIcon,
          show: true
        },
        {
          name: t('government_utility_gateway'),
          href: 'utilities',
          icon: BoltIcon,
          show: true
        },
        {
          name: t('pricing_plans'),
          href: 'pricing',
          icon: CurrencyDollarIcon,
          show: true
        }
      ]
    },
    {
      title: t('communication'),
      items: [
        {
          name: t('message_center'),
          href: 'messages',
          icon: ChatBubbleLeftEllipsisIcon,
          show: true
        },
        {
          name: t('chat.chats'),
          href: 'chat',
          icon: ChatBubbleLeftEllipsisIcon,
          show: true
        },
        {
          name: t('notifications_nav'),
          href: 'notifications',
          icon: BellIcon,
          show: true
        },
        {
          name: t('events_announcements'),
          href: 'events',
          icon: SpeakerWaveIcon,
          show: true
        }
      ]
    },
    {
      title: t('tools_resources'),
      items: [
        {
          name: t('gallery.title'),
          href: 'gallery',
          icon: PhotoIcon,
          show: true
        },
        {
          name: t('document_management'),
          href: 'documents',
          icon: DocumentTextIcon,
          show: true
        },
        {
          name: t('voting_system'),
          href: 'voting',
          icon: HandRaisedIcon,
          show: true
        },
        {
          name: t('smart_home'),
          href: 'smart-home',
          icon: HomeModernIcon,
          show: true
        },
        {
          name: t('schedule.title'),
          href: 'schedule',
          icon: ClockIcon,
          show: true
        }
      ]
    },
    {
      title: t('subscription_management'),
      items: [
        {
          name: t('activate_subscription_code'),
          href: 'activate-subscription',
          icon: KeyIcon,
          show: user?.role !== 'admin'
        }
      ]
    },
    {
      title: t('admin_tools'),
      items: [
        {
          name: t('advanced_analytics'),
          href: 'analytics',
          icon: ChartBarIcon,
          show: user?.role === 'admin'
        },
        {
          name: t('enterprise.dashboard'),
          href: 'enterprise-dashboard',
          icon: BuildingOffice2Icon,
          show: user?.role === 'admin'
        },
        {
          name: t('subscription_codes_management'),
          href: 'subscription-codes',
          icon: KeyIcon,
          show: user?.role === 'admin'
        }
      ]
    },
    {
      title: t('support_info'),
      items: [
        {
          name: t('help_center'),
          href: 'help',
          icon: QuestionMarkCircleIcon,
          show: true
        },
        {
          name: t('mobile_app'),
          href: 'mobile-app',
          icon: PhoneIcon,
          show: true
        },
        {
          name: t('settings_nav'),
          href: 'settings',
          icon: Cog6ToothIcon,
          show: true
        },
        {
          name: t('legal.title'),
          href: 'terms-privacy',
          icon: DocumentTextIcon,
          show: true
        },
        {
          name: t('legal_contact_title'),
          href: 'contact',
          icon: EnvelopeIcon,
          show: true
        },
        {
          name: t('community_newsletter'),
          href: 'newsletter',
          icon: NewspaperIcon,
          show: true
        }
      ]
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
        <div className="flex items-center justify-between h-24 px-6 border-b border-gray-200">
          {/* Close button for mobile - positioned on the left */}
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
          
          {/* Logo centered */}
          <div className="flex-1 flex justify-center">
            <div className="flex-shrink-0">
              <img 
                src="https://customer-assets.emergentagent.com/job_homeme-subscriptions/artifacts/6yk66f7n_WhatsApp%20Image%202022-01-17%20at%2010.23.44%20AM.637bf42d664818.47361218.jpeg"
                alt="HomeMe Logo"
                className="h-32 w-auto object-contain"
              />
            </div>
          </div>
          
          {/* Empty space for balance */}
          <div className="w-6 lg:hidden"></div>
        </div>

        <nav className="mt-6 px-3 pb-8 overflow-y-auto">
          <div className="space-y-6">
            {navigationSections.map((section, sectionIndex) => {
              const visibleItems = section.items.filter(item => item.show);
              if (visibleItems.length === 0) return null;
              
              // Define section colors
              const sectionColors = [
                'bg-blue-50 border-blue-200 text-blue-700',
                'bg-green-50 border-green-200 text-green-700',
                'bg-purple-50 border-purple-200 text-purple-700',
                'bg-orange-50 border-orange-200 text-orange-700',
                'bg-pink-50 border-pink-200 text-pink-700',
                'bg-indigo-50 border-indigo-200 text-indigo-700',
                'bg-red-50 border-red-200 text-red-700',
                'bg-emerald-50 border-emerald-200 text-emerald-700'
              ];
              
              return (
                <div key={section.title}>
                  <div className={`px-3 py-2 rounded-lg border ${sectionColors[sectionIndex]} mb-3`}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center">
                      <div className="w-2 h-2 rounded-full bg-current mr-2"></div>
                      {section.title}
                      <span className="ml-auto text-xs font-normal bg-white bg-opacity-50 px-2 py-1 rounded-full">
                        {visibleItems.length}
                      </span>
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {visibleItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`
                          group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:shadow-sm
                          ${isActive(item.href)
                            ? `bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-sm ${isRTL ? 'border-l-3 border-blue-500' : 'border-r-3 border-blue-500'}`
                            : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:text-gray-900'
                          }
                        `}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon
                          className={`${isRTL ? 'ml-3' : 'mr-3'} h-5 w-5 transition-colors duration-200 ${
                            isActive(item.href) ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600'
                          }`}
                        />
                        <span className="flex-1">{item.name}</span>
                        {item.name === t('notifications_nav') && unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                        {item.name === t('help_center') && (
                          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium animate-bounce">
                            {t('new')}
                          </span>
                        )}
                        {item.name === t('message_center') && (
                          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                            3
                          </span>
                        )}
                        {item.name === t('financial_management') && (
                          <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">
                            $2.5K
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
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
          {children || <Outlet />}
          
          {/* Footer */}
          <footer className="bg-gray-800 text-white py-8 mt-12">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <p className="text-center">&copy; 2025 HomeMe. {t('all_rights_reserved', 'All rights reserved.')}</p>
                <div className="flex items-center gap-6">
                  <span className="text-gray-400">|</span>
                  {/* Data Life Logo - Arabic or English based on language */}
                  <img 
                    src={i18n.language === 'ar' ? '/images/datalife-logo-ar-new.jpg' : '/images/datalife-logo.jpg'}
                    alt="Data Life Logo"
                    className="h-20 w-auto md:h-24"
                  />
                  <span className="text-gray-400">|</span>
                  {/* HomeMe Logo - Same as in header */}
                  <img 
                    src="https://customer-assets.emergentagent.com/job_homeme-subscriptions/artifacts/6yk66f7n_WhatsApp%20Image%202022-01-17%20at%2010.23.44%20AM.637bf42d664818.47361218.jpeg"
                    alt="HomeMe Logo"
                    className="h-20 w-auto md:h-24 rounded-xl"
                  />
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Layout;