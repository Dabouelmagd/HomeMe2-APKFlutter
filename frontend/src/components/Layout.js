import React, { useState, useEffect } from 'react';
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
  KeyIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarDaysIcon,
  StarIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  LanguageIcon
} from '@heroicons/react/24/outline';
import LanguageSwitcher from './LanguageSwitcher';
import { TransliterationToggle } from './TransliterationToggle';
import ThemeToggle from './ThemeToggle';
import BackButton from './BackButton';
// import AdvancedSearchModal from './AdvancedSearchModal';

const Layout = ({ children, isTrialMode = false }) => {
  const { t, i18n } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  // State for collapsible menu sections - all expanded by default
  const [expandedSections, setExpandedSections] = useState({});
  // State for scroll to top button
  const [showScrollTop, setShowScrollTop] = useState(false);
  // Compound logo
  const [compoundLogo, setCompoundLogo] = useState(null);
  // const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';

  // Fetch compound logo
  useEffect(() => {
    const fetchCompoundLogo = async () => {
      if (!user?.compound_id) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/compounds/${user.compound_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.logo_url) setCompoundLogo(data.logo_url);
        }
      } catch (e) { /* silently fail */ }
    };
    fetchCompoundLogo();
  }, [user?.compound_id]);

  // Handle scroll to show/hide scroll-to-top button
  useEffect(() => {
    const mainContent = document.querySelector('.page-scroll');
    if (!mainContent) return;

    const handleScroll = () => {
      setShowScrollTop(mainContent.scrollTop > 300);
    };

    mainContent.addEventListener('scroll', handleScroll);
    return () => mainContent.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    const mainContent = document.querySelector('.page-scroll');
    if (mainContent) {
      mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Keyboard shortcuts for advanced search - DISABLED TEMPORARILY
  // useEffect(() => {
  //   const handleKeyDown = (e) => {
  //     // Ctrl/Cmd + K
  //     if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
  //       e.preventDefault();
  //       setShowAdvancedSearch(true);
  //     }
  //     // Forward slash /
  //     if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
  //       e.preventDefault();
  //       setShowAdvancedSearch(true);
  //     }
  //     // Escape to close
  //     if (e.key === 'Escape') {
  //       setShowAdvancedSearch(false);
  //     }
  //   };

  //   document.addEventListener('keydown', handleKeyDown);
  //   return () => document.removeEventListener('keydown', handleKeyDown);
  // }, []);

  // Search functionality
  const handleSearch = async (query) => {
    if (!query || query.trim().length < 2) {
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
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear previous timeout
    if (window.searchTimeout) {
      clearTimeout(window.searchTimeout);
    }
    
    // If empty, clear results immediately
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    // Debounce search
    window.searchTimeout = setTimeout(() => {
      handleSearch(query);
    }, 300);
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

  // Toggle section expand/collapse
  const toggleSection = (sectionIndex) => {
    setExpandedSections(prev => {
      const currentState = prev[sectionIndex];
      // If currentState is undefined (first click), set to false (collapse)
      // Otherwise, toggle the current state
      const newState = currentState === undefined ? false : !currentState;
      console.log(`Toggle section ${sectionIndex}: ${currentState} -> ${newState}`);
      return {
        ...prev,
        [sectionIndex]: newState
      };
    });
  };

  // Check if section is expanded (default is expanded/true)
  const isSectionExpanded = (sectionIndex) => {
    const state = expandedSections[sectionIndex];
    // Default is expanded (true) if undefined
    return state === undefined ? true : state;
  };

  const isAdminRole = ['admin','company_admin','super_admin','app_owner'].includes(user?.role);
  const isStaffRole = ['admin','company_admin','super_admin','app_owner','manager'].includes(user?.role);
  const isSecurityRole = ['admin','company_admin','super_admin','app_owner','manager','security'].includes(user?.role);

  const isAppOwner = user?.role === 'app_owner';
  const isSuperAdmin = user?.role === 'super_admin' || isAppOwner;

  // Role-based theme
  const roleTheme = {
    app_owner: { active: 'from-rose-600 to-purple-700', hover: 'hover:bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-500', sidebarBg: 'bg-gray-950', sidebarBorder: 'border-rose-900/50', sidebarText: 'text-gray-300', sidebarHeading: 'text-rose-400' },
    super_admin: { active: 'from-purple-500 to-pink-500', hover: 'hover:bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-500', sidebarBg: 'bg-gray-950', sidebarBorder: 'border-purple-900/50', sidebarText: 'text-gray-300', sidebarHeading: 'text-purple-400' },
    company_admin: { active: 'from-indigo-600 to-indigo-700', hover: 'hover:bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-500' },
    admin: { active: 'from-blue-600 to-blue-700', hover: 'hover:bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
    manager: { active: 'from-emerald-600 to-emerald-700', hover: 'hover:bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
    security: { active: 'from-amber-600 to-amber-700', hover: 'hover:bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
    resident: { active: 'from-teal-600 to-teal-700', hover: 'hover:bg-teal-50', text: 'text-teal-600', dot: 'bg-teal-500' },
  };
  const theme = roleTheme[user?.role] || roleTheme.resident;

  // App Owner gets a completely different navigation
  const ownerNavigationSections = [
    {
      title: t('owner_overview', 'نظرة عامة'),
      items: [
        { name: t('owner_dashboard', 'لوحة التحكم الرئيسية'), href: 'dashboard', icon: HomeIcon, show: true },
        { name: t('compounds_management', 'إدارة المجمعات السكنية'), href: 'compounds-management', icon: BuildingOfficeIcon, show: true },
        { name: t('owner_all_users', 'جميع المستخدمين'), href: 'users', icon: UsersIcon, show: true },
      ]
    },
    {
      title: t('owner_subscriptions', 'الاشتراكات والمدفوعات'),
      items: [
        { name: t('subscription_codes_management', 'إدارة أكواد الاشتراك'), href: 'subscription-codes', icon: KeyIcon, show: true },
        { name: t('owner_payments', 'المدفوعات والإيرادات'), href: 'payments', icon: CreditCardIcon, show: true },
        { name: t('owner_company_subs', 'اشتراكات شركات الإدارة'), href: 'finances', icon: CurrencyDollarIcon, show: true },
      ]
    },
    {
      title: t('owner_marketing', 'التسويق والإعلانات'),
      items: [
        { name: t('owner_ads', 'الإعلانات الداخلية'), href: 'super-admin', icon: SpeakerWaveIcon, show: true },
      ]
    },
    {
      title: t('owner_analytics', 'التحليلات والتقارير'),
      items: [
        { name: t('advanced_analytics', 'تحليلات متقدمة'), href: 'analytics', icon: ChartBarIcon, show: true },
        { name: t('monitoring_dashboard', 'لوحة المراقبة'), href: 'monitoring', icon: ChartPieIcon, show: true },
      ]
    },
    {
      title: t('owner_system', 'إعدادات النظام'),
      items: [
        { name: t('owner_translations', 'إدارة الترجمات'), href: 'super-admin', icon: LanguageIcon, show: true },
        { name: t('settings_nav', 'الإعدادات'), href: 'settings', icon: Cog6ToothIcon, show: true },
      ]
    },
  ];

  // Organized navigation by role
  const navigationSections = isAppOwner ? ownerNavigationSections : [
    {
      title: t('main_sections'),
      items: [
        { name: t('dashboard'), href: 'dashboard', icon: HomeIcon, show: true },
        { name: t('compound_management'), href: 'compound', icon: BuildingOfficeIcon, show: isAdminRole },
        { name: t('residents_list'), href: 'residents', icon: UserGroupIcon, show: isStaffRole },
        { name: t('user_management'), href: 'users', icon: UsersIcon, show: isAdminRole },
        { name: t('monitoring_dashboard'), href: 'monitoring', icon: ChartPieIcon, show: isStaffRole },
        { name: t('compounds_management', 'Compounds Management'), href: 'compounds-management', icon: HomeIcon, show: user?.role === 'app_owner' || user?.role === 'super_admin' || user?.role === 'company_admin' },
      ]
    },
    {
      title: t('services_maintenance'),
      items: [
        { name: t('services_management'), href: 'services', icon: WrenchScrewdriverIcon, show: true },
        { name: t('maintenance_system'), href: 'maintenance', icon: CogIcon, show: true },
        { name: t('facility_booking'), href: 'facility-booking', icon: CalendarDaysIcon, show: true },
        { name: t('guest_management'), href: 'guests', icon: UsersIcon, show: isSecurityRole },
      ]
    },
    {
      title: t('financial_services'),
      items: [
        { name: t('financial_management'), href: 'finances', icon: CurrencyDollarIcon, show: isStaffRole },
        { name: t('payment_center'), href: 'payments', icon: CreditCardIcon, show: true },
        { name: t('contracts_management', 'العقود'), href: 'contracts', icon: DocumentTextIcon, show: isStaffRole },
        { name: t('satisfaction_ratings', 'التقييمات'), href: 'satisfaction', icon: StarIcon, show: isStaffRole },
      ]
    },
    {
      title: t('communication'),
      items: [
        { name: t('message_center'), href: 'messages', icon: ChatBubbleLeftEllipsisIcon, show: true },
        { name: t('notifications_nav'), href: 'notifications', icon: BellIcon, show: true },
        { name: t('events_announcements'), href: 'events', icon: SpeakerWaveIcon, show: true },
        { name: t('complaints_suggestions', 'الشكاوى والاقتراحات'), href: 'complaints', icon: ExclamationTriangleIcon, show: true },
      ]
    },
    {
      title: t('family_management_section'),
      items: [
        { name: t('family_management'), href: 'family', icon: UsersIcon, show: true },
        { name: t('add_family_member'), href: 'add-family-member', icon: UserPlusIcon, show: true },
      ]
    },
    {
      title: t('tools_resources'),
      items: [
        { name: t('gallery.title'), href: 'gallery', icon: PhotoIcon, show: true },
        { name: t('document_management'), href: 'documents', icon: DocumentTextIcon, show: true },
        { name: t('voting_system'), href: 'voting', icon: HandRaisedIcon, show: true },
      ]
    },
    {
      title: t('admin_tools'),
      items: [
        { name: t('advanced_analytics'), href: 'analytics', icon: ChartBarIcon, show: isStaffRole },
        { name: t('subscription_codes_management'), href: 'subscription-codes', icon: KeyIcon, show: user?.role === 'app_owner' },
        { name: t('my_subscription', 'إدارة اشتراكي'), href: 'my-subscription', icon: CreditCardIcon, show: isAdminRole || user?.role === 'company_admin' },
      ]
    },
    {
      title: t('support_info'),
      items: [
        { name: t('settings_nav'), href: 'settings', icon: Cog6ToothIcon, show: true },
        { name: t('help_center'), href: 'help', icon: QuestionMarkCircleIcon, show: true },
      ]
    }
  ];

  // Improved isActive function to correctly match current route
  const isActive = (href) => {
    const currentPath = location.pathname;
    // Build the full path for comparison
    const fullHref = href.startsWith('/') ? href : `/app/${href}`;
    
    // For exact matches like /app/dashboard === /app/dashboard
    if (currentPath === fullHref) {
      return true;
    }
    
    // For nested routes like /app/dashboard/details starts with /app/dashboard/
    if (currentPath.startsWith(fullHref + '/')) {
      return true;
    }
    
    // Check if the current path ends with the href (fallback)
    // This handles cases where the path might be structured differently
    if (currentPath.endsWith('/' + href) || currentPath === '/' + href) {
      return true;
    }
    
    return false;
  };

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-900 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 w-64 shadow-lg transform transition-transform duration-300 ease-in-out flex flex-col
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}
        ${isSuperAdmin ? 'bg-gray-950 border-e border-purple-900/30' : 'bg-white dark:bg-gray-800'}
      `}>
        <div className={`flex flex-col items-center justify-center px-4 py-3 border-b flex-shrink-0 ${isSuperAdmin ? 'border-purple-900/30' : 'border-gray-200 dark:border-gray-700'}`}>
          {/* Close button for mobile */}
          <div className="w-full flex justify-between items-center mb-2 lg:hidden">
            <button onClick={() => setSidebarOpen(false)}>
              <XMarkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
            </button>
            <div className="w-6"></div>
          </div>

          {/* Compound Logo - shown if available */}
          {compoundLogo && (
            <div className="mb-1">
              <img 
                src={compoundLogo}
                alt="Compound Logo"
                className="h-16 w-16 rounded-2xl object-cover border-2 border-gray-100 dark:border-gray-600 shadow-md"
                data-testid="compound-logo-sidebar"
              />
            </div>
          )}
          {user?.compound_name && (
            <p className={`text-sm font-bold mb-0.5 text-center ${isSuperAdmin ? 'text-purple-300' : 'text-gray-800 dark:text-gray-200'}`}>{user.compound_name}</p>
          )}
          
          {/* HomeMe Brand */}
          <div className="flex items-center gap-1.5 opacity-60">
            <span className={`text-[10px] font-medium ${isSuperAdmin ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>Powered by</span>
            <span className={`text-[11px] font-bold ${isSuperAdmin ? 'text-purple-400' : 'text-blue-500'}`}>HomeMe</span>
          </div>
        </div>

        {/* Scrollable Navigation Area */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sidebar-scroll">
          <div className="space-y-2">
            {navigationSections.map((section, sectionIndex) => {
              const visibleItems = section.items.filter(item => item.show);
              if (visibleItems.length === 0) return null;
              
              const isExpanded = isSectionExpanded(sectionIndex);
              
              // Section colors based on role theme
              const sectionColor = `${theme.hover} border-gray-200 ${theme.text}`;
              
              return (
                <div key={section.title} className="transition-all duration-200">
                  {/* Section Header - Clickable */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSection(sectionIndex);
                    }}
                    className={`w-full px-3 py-1.5 rounded-lg border ${isSuperAdmin ? 'border-purple-800/40 bg-purple-900/20 text-purple-300 hover:bg-purple-900/30' : `${sectionColor} bg-white`} mb-0.5 transition-all duration-200 cursor-pointer`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-1.5 h-1.5 rounded-full ${theme.dot} ml-2 mr-2`}></div>
                        <h3 className="text-xs font-semibold uppercase tracking-wider">
                          {section.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${isSuperAdmin ? 'bg-purple-800/30 text-purple-300' : 'bg-white bg-opacity-60'}`}>
                          {visibleItems.length}
                        </span>
                        {isExpanded ? (
                          <ChevronUpIcon className="h-4 w-4 transition-transform duration-200" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4 transition-transform duration-200" />
                        )}
                      </div>
                    </div>
                  </button>
                  
                  {/* Section Items - Collapsible */}
                  {isExpanded && (
                    <div className="space-y-0.5 mt-0.5">
                      {visibleItems.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={`
                            group flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200
                            ${isActive(item.href)
                              ? `bg-gradient-to-r ${theme.active} text-white shadow-sm`
                              : isSuperAdmin
                                ? 'text-gray-300 hover:bg-purple-900/30 hover:text-purple-300'
                                : `text-gray-700 ${theme.hover} hover:text-gray-900`
                            }
                          `}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <item.icon
                            className={`${isRTL ? 'ml-2.5' : 'mr-2.5'} h-5 w-5 flex-shrink-0 transition-colors duration-200 ${
                              isActive(item.href) ? 'text-white' : isSuperAdmin ? 'text-purple-500/70' : 'text-gray-400'
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
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Fixed Bottom Section - User Info & Logout */}
        <div className={`flex-shrink-0 border-t px-3 py-4 ${isSuperAdmin ? 'border-purple-900/30 bg-gray-950' : 'border-gray-200 bg-white'}`}>
          <div className="px-3 py-2">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`h-8 w-8 rounded-full bg-gradient-to-r ${theme.active} flex items-center justify-center`}>
                  <span className="text-sm font-medium text-white">
                    {user?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
              </div>
              <div className={`${isRTL ? 'mr-3' : 'ml-3'}`}>
                <p className={`text-sm font-medium ${isSuperAdmin ? 'text-gray-200' : 'text-gray-700'}`}>
                  {user?.full_name}
                </p>
                <p className={`text-xs capitalize ${isSuperAdmin ? 'text-purple-400' : 'text-gray-500'}`}>
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
              className={`group flex items-center w-full px-3 py-2 text-sm font-medium rounded-md ${isSuperAdmin ? 'text-gray-400 hover:bg-purple-900/30 hover:text-red-400' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <ArrowRightOnRectangleIcon className={`${isRTL ? 'ml-3' : 'mr-3'} h-5 w-5 ${isSuperAdmin ? 'text-gray-500' : 'text-gray-500 group-hover:text-gray-700'}`} />
              {t('sign_out')}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen lg:ml-0 overflow-hidden">
        {/* Top bar - Fixed */}
        <div className="flex-shrink-0 sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6 text-gray-500" />
            </button>

            <div className="flex-1 min-w-0 mx-4 search-container relative">
              {/* Modern Search Bar */}
              <div className="relative w-full max-w-2xl">
                <div className="relative">
                  <MagnifyingGlassIcon className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
                  <input
                    id="global-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    placeholder={t('search_placeholder', 'Search users, services, messages...')}
                    className={`w-full ${isRTL ? 'pr-12 pl-24' : 'pl-12 pr-24'} py-3 bg-white border-2 border-gray-200 rounded-xl
                      text-gray-900 placeholder-gray-400 text-sm
                      focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none
                      transition-all duration-200 shadow-sm hover:shadow-md`}
                  />
                  <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} flex items-center gap-2`}>
                    {isSearching && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    )}
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded border border-gray-300">
                      <CommandLineIcon className="w-3 h-3" />
                      K
                    </kbd>
                  </div>
                </div>

                {/* Modern Search Results Dropdown */}
                {showSearchResults && (
                  <div className={`absolute top-full ${isRTL ? 'right-0 left-0' : 'left-0 right-0'} mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[32rem] overflow-hidden z-50 backdrop-blur-xl bg-white/95`}>
                    {searchResults.length > 0 ? (
                      <div className="overflow-y-auto max-h-[30rem] p-2">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {t('search_results', 'Search Results')} ({searchResults.length})
                        </div>
                        {searchResults.map((result, index) => (
                          <button
                            key={index}
                            onClick={() => handleSearchResultClick(result)}
                            className={`w-full px-4 py-3.5 text-${isRTL ? 'right' : 'left'} hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 
                              focus:bg-gradient-to-r focus:from-blue-50 focus:to-indigo-50 focus:outline-none 
                              rounded-xl transition-all duration-200 group mb-1`}
                          >
                            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className="flex-shrink-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                                  ${result.type === 'user' ? 'bg-purple-100 text-purple-600' : ''}
                                  ${result.type === 'residence' ? 'bg-green-100 text-green-600' : ''}
                                  ${result.type === 'service' ? 'bg-blue-100 text-blue-600' : ''}
                                  ${result.type === 'message' ? 'bg-orange-100 text-orange-600' : ''}
                                  ${result.type === 'family' ? 'bg-pink-100 text-pink-600' : ''}
                                  group-hover:scale-110 transition-transform duration-200`}>
                                  {result.type === 'user' && <UsersIcon className="h-5 w-5" />}
                                  {result.type === 'residence' && <HomeIcon className="h-5 w-5" />}
                                  {result.type === 'service' && <WrenchScrewdriverIcon className="h-5 w-5" />}
                                  {result.type === 'message' && <ChatBubbleLeftEllipsisIcon className="h-5 w-5" />}
                                  {result.type === 'family' && <UserGroupIcon className="h-5 w-5" />}
                                </div>
                              </div>
                              <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                                <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                                  {result.title}
                                </p>
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                  {result.description}
                                </p>
                              </div>
                              <div className={`flex-shrink-0 ${isRTL ? 'mr-auto' : 'ml-auto'}`}>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                                  ${result.type === 'user' ? 'bg-purple-50 text-purple-700 border border-purple-200' : ''}
                                  ${result.type === 'residence' ? 'bg-green-50 text-green-700 border border-green-200' : ''}
                                  ${result.type === 'service' ? 'bg-blue-50 text-blue-700 border border-blue-200' : ''}
                                  ${result.type === 'message' ? 'bg-orange-50 text-orange-700 border border-orange-200' : ''}
                                  ${result.type === 'family' ? 'bg-pink-50 text-pink-700 border border-pink-200' : ''}
                                  capitalize group-hover:shadow-sm transition-shadow`}>
                                  {t(result.type, result.type)}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : searchQuery && !isSearching ? (
                      <div className="px-6 py-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MagnifyingGlassIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-base font-semibold text-gray-900 mb-1">
                          {t('no_results', 'No results found')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {t('try_different_keywords', 'Try different keywords or check spelling')}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 rtl:flex-row-reverse">
              {/* User Info Card */}
              <div className="flex items-center bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm mr-2 rtl:mr-0 rtl:ml-2">
                  {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col items-start rtl:items-end">
                  <span className="text-sm font-semibold text-gray-900">{user?.full_name || user?.username}</span>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {user?.unit_number && (
                      <span className="flex items-center gap-1">
                        <HomeIcon className="h-3 w-3" />
                        {user.unit_number}
                      </span>
                    )}
                    {user?.compound_name && (
                      <>
                        {user?.unit_number && <span>•</span>}
                        <span className="flex items-center gap-1">
                          <BuildingOffice2Icon className="h-3 w-3" />
                          {user.compound_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Language Switcher */}
              <div className="flex items-center">
                <LanguageSwitcher />
              </div>

              {/* Super Admin Icon */}
              {user?.role === 'app_owner' && (
                <Link
                  to="/app/super-admin"
                  className="p-2 text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-200 relative transition-all hover:bg-purple-50 dark:hover:bg-gray-700 rounded-lg"
                  title={t('app_owner_panel', 'لوحة تحكم مالك التطبيق')}
                  data-testid="super-admin-icon"
                >
                  <ShieldCheckIcon className="h-6 w-6" />
                </Link>
              )}

              {/* Notifications Bell */}
              <Link
                to="/app/notifications"
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 relative transition-all hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title={t('notifications', 'الإشعارات')}
              >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Page content - Scrollable */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden page-scroll">
          {/* Back Button */}
          <div className="max-w-7xl mx-auto px-4 py-4">
            <BackButton />
          </div>
          
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

          {/* Scroll to Top Button */}
          <button
            onClick={scrollToTop}
            className={`scroll-to-top ${showScrollTop ? 'visible' : ''} 
              fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-50
              w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 
              text-white rounded-full shadow-lg
              hover:from-blue-600 hover:to-purple-700 
              transform hover:scale-110 transition-all duration-300
              flex items-center justify-center`}
            title={t('scroll_to_top', 'العودة للأعلى')}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </main>
      </div>
    </div>
  );
};

export default Layout;
