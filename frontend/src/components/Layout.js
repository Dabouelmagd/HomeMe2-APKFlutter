import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth, useNotifications } from '../App';
import { toast } from 'sonner';
import ImpersonationBanner from './ImpersonationBanner';
import CompoundSwitcher from './company-admin/CompoundSwitcher';
import SubscriptionBadge from './company-admin/SubscriptionBadge';
import {
  HomeIcon,
  BuildingOfficeIcon,
  MapIcon,
  GiftIcon,
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
  SparklesIcon,
  HomeModernIcon,
  EnvelopeIcon,
  SwatchIcon,
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
  LanguageIcon,
  SignalIcon,
  LifebuoyIcon,
  LinkIcon,
  ClipboardDocumentListIcon,
  QrCodeIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';
import LanguageSwitcher from './LanguageSwitcher';
import SessionSwitcher from './SessionSwitcher';
import QuickAccountSwitcher from './QuickAccountSwitcher';
import SidebarAccountSwitcher from './SidebarAccountSwitcher';
import PlanLimitBadge from './PlanLimitBadge';
import { TransliterationToggle } from './TransliterationToggle';
import ThemeToggle from './ThemeToggle';
import BackButton from './BackButton';
import InternalAdBanner from './InternalAdBanner';
import AIAssistantBubble from './AIAssistantBubble';
import MobileBottomNav from './MobileBottomNav';
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
  // Sidebar quick-search to filter nav items
  const [navSearch, setNavSearch] = useState('');
  // State for scroll to top button
  const [showScrollTop, setShowScrollTop] = useState(false);
  // Compound logo
  const [compoundLogo, setCompoundLogo] = useState(null);
  const [appBranding, setAppBranding] = useState(null);
  const [companiesAlerts, setCompaniesAlerts] = useState({ urgent: 0, expiring_contracts: 0, empty_companies: 0, active_companies: 0 });
  const [supportTicketsAlerts, setSupportTicketsAlerts] = useState({ open: 0, in_progress: 0, total_active: 0 });
  const [sidebarBadges, setSidebarBadges] = useState({ messages_unread: 0, payment_proofs_pending: 0, negative_ratings_7d: 0 });
  // Mute support-tickets ping (persisted)
  const [supportSoundMuted, setSupportSoundMuted] = useState(() => {
    try { return localStorage.getItem('support_sound_muted') === '1'; } catch { return false; }
  });
  // Track previous "open" count so we can ping only when it increases
  const prevOpenRef = useRef(null);
  // Sidebar scroll position persistence (so navigating between pages doesn't reset scroll to top)
  const sidebarNavRef = useRef(null);
  const SIDEBAR_SCROLL_KEY = 'homeme_sidebar_scroll';
  // Lazy-init AudioContext only when needed (browsers require a user gesture — will still work on subsequent tick after initial click)
  const audioCtxRef = useRef(null);

  const toggleSupportMute = () => {
    setSupportSoundMuted((prev) => {
      const next = !prev;
      try { localStorage.setItem('support_sound_muted', next ? '1' : '0'); } catch { /* silent */ }
      return next;
    });
  };

  // Short two-tone ping via Web Audio API (no external asset)
  const playSupportPing = () => {
    if (supportSoundMuted) return;
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch { /* silent */ } }
      const now = ctx.currentTime;
      // Tone 1
      const o1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      o1.type = 'sine';
      o1.frequency.setValueAtTime(880, now);
      g1.gain.setValueAtTime(0.0001, now);
      g1.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      o1.connect(g1).connect(ctx.destination);
      o1.start(now); o1.stop(now + 0.26);
      // Tone 2 (slightly higher, delayed)
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(1175, now + 0.18);
      g2.gain.setValueAtTime(0.0001, now + 0.18);
      g2.gain.exponentialRampToValueAtTime(0.16, now + 0.2);
      g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
      o2.connect(g2).connect(ctx.destination);
      o2.start(now + 0.18); o2.stop(now + 0.5);
    } catch { /* silent */ }
  };
  // const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';

  // Low-content / pre-onboarding routes where we suppress sidebar/banner ads
  // to comply with AdSense "Google-served ads on screens without publisher-content" policy.
  const LOW_CONTENT_ROUTES = [
    '/select-account',
    '/onboarding',
    '/wizard',
    '/register',
    '/verify-email',
  ];
  const isLowContentRoute = LOW_CONTENT_ROUTES.some((r) =>
    location.pathname === r || location.pathname.startsWith(r + '/')
  );

  // Restore sidebar scroll position after navigation (so clicking a sub-item doesn't jump to top)
  useEffect(() => {
    const nav = sidebarNavRef.current;
    if (!nav) return;
    let saved = 0;
    try { saved = parseInt(sessionStorage.getItem(SIDEBAR_SCROLL_KEY) || '0', 10) || 0; } catch { /* ignore */ }
    // Use rAF to wait until the nav children are rendered
    const id = requestAnimationFrame(() => {
      if (saved > 0) nav.scrollTop = saved;
      // If active link is out of view, scroll it into view (smoothly)
      const active = nav.querySelector('a[data-active="true"]');
      if (active) {
        const navRect = nav.getBoundingClientRect();
        const linkRect = active.getBoundingClientRect();
        const outOfView = linkRect.top < navRect.top + 16 || linkRect.bottom > navRect.bottom - 16;
        if (outOfView) {
          active.scrollIntoView({ block: 'nearest', behavior: 'auto' });
        }
      }
    });
    return () => cancelAnimationFrame(id);
  }, [location.pathname]);

  // Persist scroll position as user scrolls the sidebar (debounced via rAF)
  useEffect(() => {
    const nav = sidebarNavRef.current;
    if (!nav) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        try { sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(nav.scrollTop)); } catch { /* ignore */ }
      });
    };
    nav.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      nav.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

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

  // Fetch HomeMe global branding (used as fallback logo for owner/super_admin & on header)
  useEffect(() => {
    const fetchAppBranding = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/app-branding`);
        if (res.ok) {
          const data = await res.json();
          setAppBranding(data || null);
        }
      } catch (e) { /* silent */ }
    };
    fetchAppBranding();
  }, []);

  // Fetch sidebar alert badges (for owner/super_admin only)
  useEffect(() => {
    const role = user?.role;
    if (role !== 'app_owner' && role !== 'super_admin') return;
    // Opportunistically ask for browser Notification permission (silent if denied/unsupported)
    if ('Notification' in window && Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch { /* silent */ }
    }
    const api = process.env.REACT_APP_BACKEND_URL;
    const token = localStorage.getItem('token');
    if (!api || !token) return;
    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${api}/api/sidebar-alerts/companies`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCompaniesAlerts(data);
        }
      } catch { /* silent */ }
    };
    const fetchSupportCounts = async () => {
      try {
        const res = await fetch(`${api}/api/sidebar-alerts/support-tickets`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSupportTicketsAlerts(data);
          // Ping only when the "open" count increases (new ticket arrived).
          // First fetch seeds the baseline without alerting.
          const prev = prevOpenRef.current;
          const curr = data.open || 0;
          if (prev !== null && curr > prev) {
            const delta = curr - prev;
            playSupportPing();
            // Toast with quick-link
            toast.custom((to) => (
              <div
                onClick={() => { toast.dismiss(to.id); navigate('/app/super-admin?tab=support_tickets'); }}
                className="cursor-pointer bg-gradient-to-r from-rose-600 to-pink-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 border border-rose-400"
                data-testid="support-ticket-toast"
              >
                <LifebuoyIcon className="w-6 h-6 animate-pulse" />
                <div className="text-sm leading-tight">
                  <div className="font-bold">
                    {delta > 1
                      ? t('new_support_tickets_n', `وصلت ${delta} تذاكر دعم جديدة`).replace('{{n}}', delta)
                      : t('new_support_ticket', 'وصلت تذكرة دعم جديدة')}
                  </div>
                  <div className="text-xs opacity-90">{t('click_to_view', 'اضغطي للعرض')}</div>
                </div>
              </div>
            ), { duration: 6000 });
            // Browser notification (if permitted & page not focused)
            if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
              try {
                new Notification(t('new_support_ticket', 'وصلت تذكرة دعم جديدة'), {
                  body: t('support_ticket_body', 'اضغطي على التنبيه لفتح لوحة تذاكر الدعم'),
                  tag: 'support-ticket',
                });
              } catch { /* silent */ }
            }
          }
          prevOpenRef.current = curr;
        }
      } catch { /* silent */ }
    };
    fetchAlerts();
    fetchSupportCounts();
    const interval = setInterval(() => {
      fetchAlerts();
      fetchSupportCounts();
    }, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, [user?.role]);

  // Sidebar dynamic badges — runs for ALL admin roles (app_owner / super_admin / company_admin / admin)
  useEffect(() => {
    const role = user?.role;
    const adminRoles = ['app_owner', 'super_admin', 'company_admin', 'admin', 'manager'];
    if (!adminRoles.includes(role)) return;
    const api = process.env.REACT_APP_BACKEND_URL;
    const token = localStorage.getItem('token');
    if (!api || !token) return;
    const fetchSidebarBadges = async () => {
      try {
        const res = await fetch(`${api}/api/sidebar/badges`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSidebarBadges(data);
        }
      } catch { /* silent */ }
    };
    fetchSidebarBadges();
    const iv = setInterval(fetchSidebarBadges, 60000);
    return () => clearInterval(iv);
  }, [user?.role]);

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

    // Prefer url returned by API; fallback to type-based mapping
    if (result.url) {
      navigate(result.url);
      return;
    }
    switch (result.type) {
      case 'user':
        navigate('/app/admin/users');
        break;
      case 'compound':
        navigate('/app/super-admin');
        break;
      case 'residence':
        navigate('/app/compound');
        break;
      case 'service':
        navigate('/app/services');
        break;
      case 'message':
        navigate('/app/messages');
        break;
      case 'invite':
        navigate('/app/my-invites');
        break;
      case 'ticket':
        navigate('/app/super-admin?tab=support_tickets');
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

  const activeRole = user?.active_role || user?.role;
  const isAdminRole = ['admin','company_admin','super_admin','app_owner'].includes(activeRole);
  const isStaffRole = ['admin','company_admin','super_admin','app_owner','manager'].includes(activeRole);
  const isSecurityRole = ['admin','company_admin','super_admin','app_owner','manager','security'].includes(activeRole);

  const isAppOwner = activeRole === 'app_owner';
  const isSuperAdmin = activeRole === 'super_admin' || isAppOwner;

  // Role-based theme
  const roleTheme = {
    app_owner: { active: 'from-rose-600 to-purple-700', hover: 'hover:bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-500', sidebarBg: 'bg-gray-950', sidebarBorder: 'border-rose-900/50', sidebarText: 'text-gray-300', sidebarHeading: 'text-rose-400' },
    super_admin: { active: 'from-cyan-500 to-blue-600', hover: 'hover:bg-cyan-500/10', text: 'text-cyan-400', dot: 'bg-cyan-500', sidebarBg: 'bg-slate-900', sidebarBorder: 'border-cyan-800/40', sidebarText: 'text-slate-300', sidebarHeading: 'text-cyan-400' },
    company_admin: { active: 'from-indigo-600 to-indigo-700', hover: 'hover:bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-500' },
    admin: { active: 'from-blue-600 to-blue-700', hover: 'hover:bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
    manager: { active: 'from-emerald-600 to-emerald-700', hover: 'hover:bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
    security: { active: 'from-amber-600 to-amber-700', hover: 'hover:bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
    resident: { active: 'from-teal-600 to-teal-700', hover: 'hover:bg-teal-50', text: 'text-teal-600', dot: 'bg-teal-500' },
  };
  const theme = roleTheme[activeRole] || roleTheme.resident;

  // App Owner gets a completely different navigation
  const ownerNavigationSections = [
    {
      title: t('owner_app_control', 'تحكم عام للأبلكيشن'),
      items: [
        { name: t('owner_dashboard', 'لوحة التحكم الرئيسية'), href: 'dashboard', icon: HomeIcon, show: true },
        { name: t('alerts_center', 'لوحة التنبيهات'), href: 'alerts', icon: BellIcon, show: true },
        { name: t('sa_compounds', 'المجمعات السكنية'), href: 'super-admin?tab=compounds', icon: BuildingOfficeIcon, show: true },
        { name: t('sa_users', 'المستخدمين'), href: 'super-admin?tab=users', icon: UsersIcon, show: true },
        { name: t('owner_budget', 'الميزانية العامة'), href: 'owner-budget', icon: CurrencyDollarIcon, show: true },
        { name: t('sa_ads', 'إدارة الإعلانات'), href: 'super-admin?tab=ads', icon: SpeakerWaveIcon, show: true },
        { name: t('sa_referrals', 'الإحالات'), href: 'super-admin?tab=referrals', icon: UserGroupIcon, show: true },
        { name: t('advanced_analytics', 'تحليلات متقدمة'), href: 'analytics', icon: ChartPieIcon, show: true },
        { name: t('ad_realtime_analytics', 'تحليلات الإعلانات'), href: 'ad-analytics', icon: SignalIcon, show: true },
        { name: t('satisfaction_ratings', 'رضا العملاء'), href: 'satisfaction', icon: StarIcon, show: true },
        { name: t('owner_translations', 'إدارة الترجمات'), href: 'super-admin?tab=translations', icon: LanguageIcon, show: true },
        { name: t('sa_support_tickets_nav', 'تذاكر الدعم الفني'), href: 'super-admin?tab=support_tickets', icon: LifebuoyIcon, show: true },
        { name: 'فحص صحة المسارات', href: 'system-health', icon: ShieldCheckIcon, show: true },
        { name: 'سجل التدقيق', href: 'audit-log', icon: ClipboardDocumentListIcon, show: true },
        { name: 'لوحة المؤشرات', href: 'owner-kpis', icon: ChartBarIcon, show: true },
        { name: 'تقارير PDF', href: 'reports', icon: DocumentTextIcon, show: true },
        { name: 'المصادقة الثنائية', href: 'two-factor', icon: ShieldCheckIcon, show: true },
        { name: 'صحة SMTP', href: 'smtp-health', icon: EnvelopeIcon, show: true },
        { name: 'صحة الوسائط والنسخ الاحتياطي', href: 'media-health', icon: ShieldCheckIcon, show: true },
        { name: 'تخصيص قالب التقارير', href: 'branding', icon: SwatchIcon, show: true },
        { name: 'لوجو وألوان هوم مي', href: 'app-branding', icon: SwatchIcon, show: activeRole === 'app_owner' },
        { name: 'سجل التحديثات (Changelog)', href: 'changelog', icon: DocumentTextIcon, show: activeRole === 'app_owner' },
        { name: 'قوالب البريد', href: 'email-templates', icon: EnvelopeIcon, show: true },
        { name: t('settings_nav', 'الإعدادات'), href: 'settings', icon: Cog6ToothIcon, show: true },
      ]
    },
    {
      title: t('owner_company_control', 'تحكم في حسابات شركات الإدارة'),
      items: [
        { name: t('owner_companies_management', 'إدارة الشركات والمجمعات'), href: 'super-admin?tab=companies', icon: BuildingOffice2Icon, show: true },
        { name: t('owner_company_subs', 'اشتراكات شركات الإدارة'), href: 'company-subscriptions', icon: BuildingOffice2Icon, show: true },
        { name: '📊 تحليلات الإيرادات (MRR/Churn)', href: 'subscription-analytics', icon: ChartPieIcon, show: true },
        { name: '✏️ محرّر الصفحات القانونية', href: 'legal-editor', icon: DocumentTextIcon, show: true },
        { name: '⭐ مراجعة شهادات العملاء', href: 'testimonials-moderation', icon: StarIcon, show: true },
        { name: t('owner_reminders', 'تذكيرات الاشتراكات'), href: 'subscription-reminders', icon: BellIcon, show: true },
      ]
    },
    {
      title: t('owner_compound_control', 'تحكم في اشتراكات الكمبوند'),
      items: [
        { name: t('sa_subscription_codes', 'أكواد الاشتراك'), href: 'super-admin?tab=codes', icon: KeyIcon, show: true },
        { name: t('sa_discount_coupons', 'كوبونات الخصم'), href: 'super-admin?tab=coupons', icon: TicketIcon, show: true },
        { name: t('sa_user_subs', 'اشتراكات المستخدمين'), href: 'super-admin?tab=user_subs', icon: UsersIcon, show: true },
        { name: t('sa_analytics', 'تحليلات الاشتراكات'), href: 'super-admin?tab=analytics', icon: ChartBarIcon, show: true },
      ]
    },
  ];

  // Super Admin = Operations Manager (mirrors Owner sidebar minus owner-only items: budget, app-branding, changelog)
  const superAdminNavigationSections = [
    {
      title: t('sa_operations', 'العمليات والإدارة'),
      items: [
        { name: t('owner_dashboard', 'لوحة التحكم الرئيسية'), href: 'dashboard', icon: HomeIcon, show: true },
        { name: t('alerts_center', 'لوحة التنبيهات'), href: 'alerts', icon: BellIcon, show: true },
        { name: t('sa_compounds', 'المجمعات السكنية'), href: 'super-admin?tab=compounds', icon: BuildingOfficeIcon, show: true },
        { name: t('sa_users', 'إدارة المستخدمين'), href: 'super-admin?tab=users', icon: UsersIcon, show: true },
        { name: t('sa_ads', 'إدارة الإعلانات'), href: 'super-admin?tab=ads', icon: SpeakerWaveIcon, show: true },
        { name: t('sa_referrals', 'الإحالات'), href: 'super-admin?tab=referrals', icon: UserGroupIcon, show: true },
        { name: t('advanced_analytics', 'تحليلات متقدمة'), href: 'analytics', icon: ChartPieIcon, show: true },
        { name: t('ad_realtime_analytics', 'تحليلات الإعلانات'), href: 'ad-analytics', icon: SignalIcon, show: true },
        { name: t('satisfaction_ratings', 'رضا العملاء'), href: 'satisfaction', icon: StarIcon, show: true },
        { name: t('owner_translations', 'إدارة الترجمات'), href: 'super-admin?tab=translations', icon: LanguageIcon, show: true },
        { name: t('sa_support_tickets_nav', 'تذاكر الدعم الفني'), href: 'super-admin?tab=support_tickets', icon: LifebuoyIcon, show: true },
        { name: 'فحص صحة المسارات', href: 'system-health', icon: ShieldCheckIcon, show: true },
        { name: 'سجل التدقيق', href: 'audit-log', icon: ClipboardDocumentListIcon, show: true },
        { name: 'لوحة المؤشرات', href: 'owner-kpis', icon: ChartBarIcon, show: true },
        { name: 'تقارير PDF', href: 'reports', icon: DocumentTextIcon, show: true },
        { name: 'المصادقة الثنائية', href: 'two-factor', icon: ShieldCheckIcon, show: true },
        { name: 'صحة SMTP', href: 'smtp-health', icon: EnvelopeIcon, show: true },
        { name: 'صحة الوسائط والنسخ الاحتياطي', href: 'media-health', icon: ShieldCheckIcon, show: true },
        { name: 'تخصيص قالب التقارير', href: 'branding', icon: SwatchIcon, show: true },
        { name: 'قوالب البريد', href: 'email-templates', icon: EnvelopeIcon, show: true },
        { name: t('settings_nav', 'الإعدادات'), href: 'settings', icon: Cog6ToothIcon, show: true },
      ]
    },
    {
      title: t('owner_company_control', 'تحكم في حسابات شركات الإدارة'),
      items: [
        { name: t('owner_companies_management', 'إدارة الشركات والمجمعات'), href: 'super-admin?tab=companies', icon: BuildingOffice2Icon, show: true },
        { name: t('owner_company_subs', 'اشتراكات شركات الإدارة'), href: 'company-subscriptions', icon: BuildingOffice2Icon, show: true },
        { name: '📊 تحليلات الإيرادات (MRR/Churn)', href: 'subscription-analytics', icon: ChartPieIcon, show: true },
        { name: '✏️ محرّر الصفحات القانونية', href: 'legal-editor', icon: DocumentTextIcon, show: true },
        { name: '⭐ مراجعة شهادات العملاء', href: 'testimonials-moderation', icon: StarIcon, show: true },
        { name: t('owner_reminders', 'تذكيرات الاشتراكات'), href: 'subscription-reminders', icon: BellIcon, show: true },
      ]
    },
    {
      title: t('owner_compound_control', 'تحكم في اشتراكات الكمبوند'),
      items: [
        { name: t('sa_subscription_codes', 'أكواد الاشتراك'), href: 'super-admin?tab=codes', icon: KeyIcon, show: true },
        { name: t('sa_discount_coupons', 'كوبونات الخصم'), href: 'super-admin?tab=coupons', icon: TicketIcon, show: true },
        { name: t('sa_user_subs', 'اشتراكات المستخدمين'), href: 'super-admin?tab=user_subs', icon: UsersIcon, show: true },
        { name: t('sa_analytics', 'تحليلات الاشتراكات'), href: 'super-admin?tab=analytics', icon: ChartBarIcon, show: true },
      ]
    },
  ];

  // Organized navigation by role
  const navigationSections = isAppOwner ? ownerNavigationSections : (activeRole === 'super_admin' ? superAdminNavigationSections : [
    // Top-priority section for company_admin (their main job)
    ...(activeRole === 'company_admin' || activeRole === 'app_owner' || activeRole === 'super_admin' ? [{
      title: t('management_company', 'شركة الإدارة'),
      items: [
        { name: t('compounds_management', 'كمبوندات الشركة'), href: 'compounds-management', icon: BuildingOfficeIcon, show: true },
        { name: t('my_subscription', 'إدارة اشتراكي'), href: 'my-subscription', icon: CreditCardIcon, show: true },
        { name: t('advanced_analytics', 'تحليلات متقدمة'), href: 'analytics', icon: ChartBarIcon, show: true },
      ]
    }] : []),
    {
      title: t('main_management', 'الإدارة الرئيسية'),
      items: [
        { name: t('dashboard'), href: 'dashboard', icon: HomeIcon, show: true },
        { name: t('compound_management'), href: 'compound', icon: BuildingOfficeIcon, show: isAdminRole && activeRole !== 'company_admin' },
        { name: t('residents_list'), href: 'residents', icon: UserGroupIcon, show: isStaffRole },
        { name: t('compound_map', 'خريطة الكمبوند'), href: 'compound-map', icon: MapIcon, show: isStaffRole, badge: 'جديد' },
        { name: t('user_management'), href: 'users', icon: UsersIcon, show: isAdminRole },
        { name: t('staff_management', 'إدارة المساعدين'), href: 'staff', icon: ShieldCheckIcon, show: isAdminRole, badge: 'جديد' },
        { name: t('monitoring_dashboard'), href: 'monitoring', icon: ChartPieIcon, show: isStaffRole },
      ]
    },
    {
      title: t('financial_services'),
      items: [
        { name: t('financial_management'), href: 'finances', icon: CurrencyDollarIcon, show: isStaffRole },
        { name: t('payment_center'), href: 'payments', icon: CreditCardIcon, show: true },
        { name: 'طرق الدفع المعتمدة', href: 'compound-payment-methods', icon: CreditCardIcon, show: isStaffRole },
        { name: t('contracts_management', 'العقود'), href: 'contracts', icon: DocumentTextIcon, show: isStaffRole },
      ]
    },
    {
      title: t('services_maintenance'),
      items: [
        { name: t('services_management'), href: 'services', icon: WrenchScrewdriverIcon, show: true },
        { name: t('maintenance_system'), href: 'maintenance', icon: CogIcon, show: true },
        { name: t('facility_booking'), href: 'facility-booking', icon: CalendarDaysIcon, show: true },
        { name: t('satisfaction_ratings', 'التقييمات'), href: 'satisfaction', icon: StarIcon, show: isStaffRole },
      ]
    },
    {
      title: t('communication'),
      items: [
        { name: t('message_center'), href: 'messages', icon: ChatBubbleLeftEllipsisIcon, show: true },
        { name: t('notifications_nav'), href: 'notifications', icon: BellIcon, show: true },
        { name: t('events_announcements'), href: 'events', icon: SpeakerWaveIcon, show: true },
      ]
    },
    {
      title: t('family_management_section'),
      items: [
        { name: t('family_management'), href: 'family', icon: UsersIcon, show: true },
        { name: t('add_family_member'), href: 'add-family-member', icon: UserPlusIcon, show: true },
        { name: 'إدارة دعواتي', href: 'my-invites', icon: LinkIcon, show: true },
        { name: 'تذاكر الزوار', href: 'visitor-passes', icon: TicketIcon, show: true },
        { name: 'إدارة الزوار', href: 'guests', icon: UsersIcon, show: isSecurityRole },
        { name: 'مسح تذكرة (الأمن)', href: 'security-scan', icon: QrCodeIcon, show: isSecurityRole },
      ]
    },
    {
      title: t('tools_resources'),
      items: [
        { name: t('gallery.title'), href: 'gallery', icon: PhotoIcon, show: true },
        { name: t('document_management'), href: 'documents', icon: DocumentTextIcon, show: true },
        { name: t('voting_system'), href: 'voting', icon: HandRaisedIcon, show: true },
        { name: 'تقارير PDF', href: 'reports', icon: DocumentTextIcon, show: isStaffRole },
        { name: '🤖 AI Auto-Pilot', href: 'ai-autopilot', icon: SparklesIcon, show: isStaffRole },
      ]
    },
    {
      title: t('admin_tools'),
      items: [
        ...(activeRole !== 'company_admin' && activeRole !== 'app_owner' && activeRole !== 'super_admin' ? [
          { name: t('advanced_analytics'), href: 'analytics', icon: ChartBarIcon, show: isStaffRole },
          { name: t('my_subscription', 'إدارة اشتراكي'), href: 'my-subscription', icon: CreditCardIcon, show: isAdminRole },
        ] : []),
        { name: t('subscription_codes_management'), href: 'subscription-codes', icon: KeyIcon, show: activeRole === 'app_owner' },
        { name: t('referral_program', '🎁 برنامج الإحالة'), href: 'referral', icon: GiftIcon, show: true, badge: 'جديد' },
      ].filter(i => i)
    },
    {
      title: t('support_info'),
      items: [
        { name: t('settings_nav'), href: 'settings', icon: Cog6ToothIcon, show: true },
        { name: t('complaints_suggestions', 'الشكاوى والاقتراحات'), href: 'complaints', icon: ExclamationTriangleIcon, show: true },
        { name: t('help_center'), href: 'help', icon: QuestionMarkCircleIcon, show: true },
        { name: t('contact_support_nav', 'تواصل مع الدعم الفني'), href: 'support', icon: QuestionMarkCircleIcon, show: true },
      ]
    }
  ]);
  // Improved isActive function to correctly match current route
  const isActive = (href) => {
    const currentPath = location.pathname;
    const currentSearch = location.search;
    
    // Handle query params (e.g., super-admin?tab=codes)
    const [hrefPath, hrefQuery] = href.split('?');
    const fullHref = hrefPath.startsWith('/') ? hrefPath : `/app/${hrefPath}`;
    
    // If href has query params, match both path and query
    if (hrefQuery) {
      return currentPath === fullHref && currentSearch === `?${hrefQuery}`;
    }
    
    // For links without query params, only match if NO query params in URL
    // (prevents super-admin base from matching when ?tab=codes is active)
    if (fullHref.includes('super-admin') && currentSearch) {
      return false;
    }
    
    // For exact matches
    if (currentPath === fullHref) return true;
    // For nested routes
    if (currentPath.startsWith(fullHref + '/')) return true;
    // Fallback
    if (currentPath.endsWith('/' + hrefPath) || currentPath === '/' + hrefPath) return true;
    
    return false;
  };

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-900 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Impersonation banner (visible ONLY when current session is an impersonation) */}
      <ImpersonationBanner />
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

          {/* Sidebar Logo: HomeMe global branding for owner/super_admin without a compound, else compound logo */}
          {(() => {
            const isHighLevel = activeRole === 'app_owner' || activeRole === 'super_admin';
            const homemeLogoUrl = appBranding?.logo_url
              ? `${process.env.REACT_APP_BACKEND_URL}${appBranding.logo_url}`
              : null;
            const showHomeMeLogo = isHighLevel && !user?.compound_id && homemeLogoUrl;
            const logoSrc = showHomeMeLogo ? homemeLogoUrl : compoundLogo;
            const altText = showHomeMeLogo ? (appBranding?.app_name_ar || 'HomeMe') : 'Compound Logo';
            const testId = showHomeMeLogo ? 'homeme-logo-sidebar' : 'compound-logo-sidebar';
            return logoSrc ? (
              <div className="mb-1">
                <img
                  src={logoSrc}
                  alt={altText}
                  className="h-16 w-16 rounded-2xl object-cover border-2 border-gray-100 dark:border-gray-600 shadow-md"
                  data-testid={testId}
                />
              </div>
            ) : null;
          })()}
          {user?.compound_name && (
            <p className={`text-sm font-bold mb-0.5 text-center ${isSuperAdmin ? 'text-purple-300' : 'text-gray-800 dark:text-gray-200'}`}>{user.compound_name}</p>
          )}
          {!user?.compound_id && (activeRole === 'app_owner' || activeRole === 'super_admin') && appBranding?.app_name_ar && (
            <p className={`text-sm font-bold mb-0.5 text-center ${isSuperAdmin ? 'text-purple-300' : 'text-gray-800 dark:text-gray-200'}`} data-testid="homeme-app-name-sidebar">{appBranding.app_name_ar}</p>
          )}
          
          {/* HomeMe Brand */}
          <div className="flex items-center gap-1.5 opacity-60">
            <span className={`text-[10px] font-medium ${isSuperAdmin ? 'text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>Powered by</span>
            <span className={`text-[11px] font-bold ${isSuperAdmin ? 'text-purple-400' : 'text-blue-500'}`}>HomeMe</span>
          </div>
        </div>

        {/* Sidebar quick-search */}
        <div className="px-3 pt-2 pb-1">
          <div className="relative">
            <input
              type="text"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="🔍 ابحث في القائمة... (مثلاً: صيانة، عقود)"
              data-testid="sidebar-quick-search"
              className={`w-full pl-3 pr-10 py-2 rounded-lg text-sm border ${isSuperAdmin ? 'bg-purple-900/30 border-purple-700/40 text-white placeholder-purple-300' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {navSearch && (
              <button
                onClick={() => setNavSearch('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-lg"
                title="مسح"
                data-testid="sidebar-search-clear"
              >
                ✕
              </button>
            )}
          </div>
          {navSearch && (
            <p className="text-[10px] text-gray-500 mt-1 px-1">اضغط على القسم لفتحه ورؤية النتائج</p>
          )}
        </div>

        {/* Scrollable Navigation Area */}
        <nav ref={sidebarNavRef} className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sidebar-scroll" data-testid="sidebar-nav">
          <div className="space-y-2">
            {navigationSections.map((section, sectionIndex) => {
              const visibleItems = section.items.filter(item => item.show);
              if (visibleItems.length === 0) return null;

              // Filter by search query (case-insensitive, substring match on name)
              const q = (navSearch || '').trim().toLowerCase();
              const filteredItems = q
                ? visibleItems.filter(it => (it.name || '').toLowerCase().includes(q))
                : visibleItems;

              // Skip rendering whole section if search yields no matches
              if (q && filteredItems.length === 0) return null;

              const isExpanded = q ? true : isSectionExpanded(sectionIndex);
              
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
                          {filteredItems.length}{filteredItems.length !== visibleItems.length ? `/${visibleItems.length}` : ''}
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
                      {filteredItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                        <Link
                          key={item.name}
                          to={item.href}
                          data-active={active ? 'true' : 'false'}
                          data-testid={`sidebar-link-${item.href.replace(/\//g, '-')}`}
                          className={`
                            group relative flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
                            ${active
                              ? `bg-gradient-to-r ${theme.active} text-white shadow-md scale-[1.02] font-bold`
                              : isSuperAdmin
                                ? 'text-gray-300 hover:bg-purple-900/30 hover:text-purple-300 hover:translate-x-[-2px]'
                                : `text-gray-700 ${theme.hover} hover:text-gray-900 hover:translate-x-[-2px]`
                            }
                          `}
                          onClick={() => setSidebarOpen(false)}
                        >
                          {/* Active indicator bar — strong visual cue on the
                              leading edge (start in RTL = right side). */}
                          {active && (
                            <span
                              aria-hidden="true"
                              className={`absolute top-1 bottom-1 ${isRTL ? '-right-1' : '-left-1'} w-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]`}
                            />
                          )}
                          <item.icon
                            className={`${isRTL ? 'ml-2.5' : 'mr-2.5'} h-5 w-5 flex-shrink-0 transition-all duration-200 ${
                              active
                                ? 'text-white drop-shadow-sm scale-110'
                                : isSuperAdmin
                                  ? 'text-purple-500/70 group-hover:text-purple-300'
                                  : 'text-gray-400 group-hover:text-gray-700'
                            }`}
                          />
                          <span className="flex-1">{item.name}</span>
                          {item.badge && (
                            <span className={`${active ? 'bg-white text-violet-700' : 'bg-emerald-500 text-white'} text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase`}>
                              {item.badge}
                            </span>
                          )}
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
                          {item.name === t('message_center') && sidebarBadges.messages_unread > 0 && (
                            <span
                              title={`${sidebarBadges.messages_unread} رسالة غير مقروءة`}
                              className="bg-blue-500 text-white text-[10px] rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center font-bold"
                              data-testid="sidebar-messages-unread-badge"
                            >
                              {sidebarBadges.messages_unread > 99 ? '99+' : sidebarBadges.messages_unread}
                            </span>
                          )}
                          {item.name === t('financial_management') && sidebarBadges.payment_proofs_pending > 0 && (
                            <span
                              title={`${sidebarBadges.payment_proofs_pending} إيصال دفع بانتظار المراجعة`}
                              className="bg-amber-500 text-white text-[10px] rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center font-bold animate-pulse"
                              data-testid="sidebar-payment-proofs-badge"
                            >
                              {sidebarBadges.payment_proofs_pending > 99 ? '99+' : sidebarBadges.payment_proofs_pending}
                            </span>
                          )}
                          {item.name === t('satisfaction_ratings', 'التقييمات') && sidebarBadges.negative_ratings_7d > 0 && (
                            <span
                              title={`${sidebarBadges.negative_ratings_7d} تقييم سلبي (≤2 نجمة) خلال 7 أيام`}
                              className="bg-rose-500 text-white text-[10px] rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center font-bold animate-pulse"
                              data-testid="sidebar-negative-ratings-badge"
                            >
                              {sidebarBadges.negative_ratings_7d > 99 ? '99+' : sidebarBadges.negative_ratings_7d}
                            </span>
                          )}
                          {item.name === t('owner_companies_management', 'إدارة الشركات والمجمعات') && companiesAlerts.urgent > 0 && (
                            <span
                              title={`🔴 ${companiesAlerts.urgent} تنبيه عاجل — ${companiesAlerts.expiring_contracts} عقد ينتهي خلال 7 أيام • ${companiesAlerts.empty_companies} شركة بدون مجمعات`}
                              className="bg-red-500 text-white text-xs rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center font-bold animate-pulse"
                              data-testid="sidebar-companies-urgent-badge">
                              {companiesAlerts.urgent > 99 ? '99+' : companiesAlerts.urgent}
                            </span>
                          )}
                          {item.name === t('owner_companies_management', 'إدارة الشركات والمجمعات') && companiesAlerts.urgent === 0 && companiesAlerts.active_companies > 0 && (
                            <span
                              title={`${companiesAlerts.active_companies} شركة نشطة`}
                              className="bg-indigo-600/40 text-indigo-200 text-[10px] rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center font-semibold"
                              data-testid="sidebar-companies-count-badge">
                              {companiesAlerts.active_companies}
                            </span>
                          )}
                          {item.name === t('alerts_center', 'لوحة التنبيهات') && companiesAlerts.urgent > 0 && (
                            <span
                              title={`🔔 ${companiesAlerts.urgent} تنبيه عاجل`}
                              className="bg-red-500 text-white text-xs rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center font-bold animate-pulse"
                              data-testid="sidebar-alerts-badge">
                              {companiesAlerts.urgent > 99 ? '99+' : companiesAlerts.urgent}
                            </span>
                          )}
                          {item.name === t('sa_support_tickets_nav', 'تذاكر الدعم الفني') && supportTicketsAlerts.total_active > 0 && (
                            <span
                              title={`🎧 ${supportTicketsAlerts.open} تذكرة جديدة • ${supportTicketsAlerts.in_progress} قيد المعالجة`}
                              className={`text-white text-xs rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center font-bold ${supportTicketsAlerts.open > 0 ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`}
                              data-testid="sidebar-support-tickets-badge">
                              {supportTicketsAlerts.total_active > 99 ? '99+' : supportTicketsAlerts.total_active}
                            </span>
                          )}
                        </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {/* "No results" state */}
            {(navSearch || '').trim() && navigationSections.every(section => {
              const visibleItems = section.items.filter(item => item.show);
              const q = navSearch.trim().toLowerCase();
              return visibleItems.filter(it => (it.name || '').toLowerCase().includes(q)).length === 0;
            }) && (
              <div className="text-center py-10 text-sm text-gray-500" data-testid="sidebar-search-no-results">
                <div className="text-2xl mb-2">🤷‍♂️</div>
                لا توجد نتائج لـ "<span className="font-bold">{navSearch}</span>"
                <button
                  onClick={() => setNavSearch('')}
                  className="block mx-auto mt-3 text-xs text-blue-600 underline hover:text-blue-800"
                >
                  مسح البحث
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Sidebar Ad - only for non-owner roles */}
        {!isAppOwner && (
          <div className="flex-shrink-0 px-3 pb-2">
            <InternalAdBanner position="sidebar" maxAds={1} variant="slim" />
          </div>
        )}

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
            {/* Account Switcher — switch between linked accounts without re-login */}
            <SidebarAccountSwitcher isSuperAdmin={isSuperAdmin} />

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
        <div className="flex-shrink-0 sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200 overflow-x-hidden">
          <div className="flex items-center justify-between h-16 px-3 sm:px-6 gap-2">
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
              data-testid="hamburger-button"
              aria-label="فتح القائمة الجانبية"
            >
              <Bars3Icon className="h-6 w-6 text-gray-500" />
            </button>

            <div className="flex-1 min-w-0 mx-2 sm:mx-4 search-container relative">
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
                                  ${result.type === 'compound' ? 'bg-emerald-100 text-emerald-600' : ''}
                                  ${result.type === 'service' ? 'bg-blue-100 text-blue-600' : ''}
                                  ${result.type === 'message' ? 'bg-orange-100 text-orange-600' : ''}
                                  ${result.type === 'family' ? 'bg-pink-100 text-pink-600' : ''}
                                  ${result.type === 'invite' ? 'bg-rose-100 text-rose-600' : ''}
                                  ${result.type === 'ticket' ? 'bg-amber-100 text-amber-600' : ''}
                                  group-hover:scale-110 transition-transform duration-200`}>
                                  {result.icon ? (
                                    <span className="text-lg">{result.icon}</span>
                                  ) : (
                                    <>
                                      {result.type === 'user' && <UsersIcon className="h-5 w-5" />}
                                      {result.type === 'residence' && <HomeIcon className="h-5 w-5" />}
                                      {result.type === 'service' && <WrenchScrewdriverIcon className="h-5 w-5" />}
                                      {result.type === 'message' && <ChatBubbleLeftEllipsisIcon className="h-5 w-5" />}
                                      {result.type === 'family' && <UserGroupIcon className="h-5 w-5" />}
                                    </>
                                  )}
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

            <div className="flex items-center gap-2 sm:gap-3 rtl:flex-row-reverse flex-shrink-0">
              {/* User Info Card — hidden on mobile to prevent header overflow */}
              <div className={`hidden md:flex items-center backdrop-blur-sm px-3 py-2 rounded-lg border shadow-sm ${
                (activeRole === 'app_owner') ? 'bg-rose-50/80 border-rose-200' :
                (activeRole === 'super_admin') ? 'bg-purple-50/80 border-purple-200' :
                'bg-white/80 border-gray-200'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm mr-2 rtl:mr-0 rtl:ml-2 ${
                  (activeRole === 'app_owner') ? 'bg-gradient-to-br from-rose-500 to-pink-600' :
                  (activeRole === 'super_admin') ? 'bg-gradient-to-br from-purple-500 to-indigo-600' :
                  (activeRole === 'admin' || activeRole === 'company_admin') ? 'bg-gradient-to-br from-emerald-500 to-green-600' :
                  (activeRole === 'security') ? 'bg-gradient-to-br from-slate-500 to-gray-600' :
                  'bg-gradient-to-br from-blue-500 to-cyan-600'
                }`}>
                  {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col items-start rtl:items-end">
                  <span className="text-sm font-semibold text-gray-900">{user?.full_name || user?.username}</span>
                  <span className={`text-[10px] font-medium ${
                    (activeRole === 'app_owner') ? 'text-rose-500' :
                    (activeRole === 'super_admin') ? 'text-purple-500' :
                    (activeRole === 'company_admin') ? 'text-indigo-500' :
                    (activeRole === 'admin') ? 'text-emerald-500' :
                    'text-gray-400'
                  }`}>
                    {activeRole === 'app_owner' ? t('role_owner', 'مالك التطبيق') :
                     activeRole === 'super_admin' ? t('role_super_admin', 'سوبر أدمن') :
                     activeRole === 'company_admin' ? t('role_co_admin', 'Co./Admin — شركة إدارة') :
                     activeRole === 'admin' ? t('role_admin', 'مدير') :
                     activeRole === 'security' ? t('role_security', 'أمن') :
                     t('role_resident', 'مقيم')}
                  </span>
                </div>
              </div>

              {/* Compound Switcher — Quick navigation across company's compounds (hidden on small screens) */}
              <div className="hidden lg:block flex-shrink-0">
                <CompoundSwitcher />
              </div>

              {/* Subscription Badge — plan status + days remaining + renewal CTA */}
              <div className="hidden md:block flex-shrink-0">
                <SubscriptionBadge />
              </div>

              {/* Session Switcher */}
              <div className="hidden lg:block flex-shrink-0">
                <SessionSwitcher />
              </div>

              {/* Plan Limit Badge — proactive upgrade CTA for company_admin */}
              <div className="hidden lg:block flex-shrink-0">
                <PlanLimitBadge />
              </div>

              {/* Quick Account Switcher — linked accounts pills */}
              <div className="hidden lg:block flex-shrink-0">
                <QuickAccountSwitcher />
              </div>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Language Switcher — hidden on extra-small screens */}
              <div className="hidden sm:flex items-center flex-shrink-0">
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

              {/* Support Tickets Sound Toggle (owner + super_admin only) */}
              {(user?.role === 'app_owner' || user?.role === 'super_admin') && (
                <button
                  type="button"
                  onClick={toggleSupportMute}
                  className={`p-2 relative transition-all rounded-lg ${supportSoundMuted ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700' : 'text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-200 hover:bg-rose-50 dark:hover:bg-gray-700'}`}
                  title={supportSoundMuted ? t('unmute_support_sound', 'تشغيل صوت تنبيه الدعم') : t('mute_support_sound', 'كتم صوت تنبيه الدعم')}
                  data-testid="support-sound-toggle"
                >
                  {supportSoundMuted ? <SpeakerXMarkIcon className="h-6 w-6" /> : <LifebuoyIcon className="h-6 w-6" />}
                </button>
              )}

              {/* Notifications Bell */}
              <Link
                to="/app/notifications"
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 relative transition-all hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title={t('notifications', 'الإشعارات')}
                data-testid="notifications-bell"
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
          {/* Top Banner Ad - only for residents, never on low-content routes */}
          {!isAppOwner && !isAdminRole && !isLowContentRoute && (
            <div className="max-w-7xl mx-auto px-4 pt-3">
              <InternalAdBanner position="banner" maxAds={1} variant="full" />
            </div>
          )}
          
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

          {/* Popup Ad - appears once per session */}
          <PopupAdOverlay />
        </main>
      </div>
      {/* AI Assistant Floating Bubble - appears on all internal pages */}
      <AIAssistantBubble />
      {/* Feature #48 — Mobile Bottom Nav (small screens only) */}
      {!isLowContentRoute && user && (
        <MobileBottomNav
          user={user}
          unreadCount={unreadCount}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
      )}
    </div>
  );
};

// Popup Ad Overlay - shows once per session
const PopupAdOverlay = () => {
  const [show, setShow] = useState(false);
  const [ad, setAd] = useState(null);

  useEffect(() => {
    const shown = sessionStorage.getItem('popup_ad_shown');
    if (shown) return;

    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/ads/active`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { position: 'popup' }
        });
        const ads = res.data.ads || [];
        if (ads.length > 0) {
          setAd(ads[0]);
          setShow(true);
          sessionStorage.setItem('popup_ad_shown', '1');
          // Track view
          axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/ads/${ads[0].id}/view`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => {});
        }
      } catch { /* silent */ }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (!show || !ad) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" data-testid="popup-ad-overlay">
      <div className="relative max-w-md w-full mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <button onClick={() => setShow(false)} className="absolute top-3 end-3 z-10 w-8 h-8 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors">
          <XMarkIcon className="w-5 h-5" />
        </button>
        {ad.image_url && (
          <img src={ad.image_url.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${ad.image_url}` : ad.image_url}
            alt={ad.title} className="w-full h-48 object-cover" />
        )}
        <div className="p-5">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{ad.title}</h3>
          {ad.description && <p className="text-sm text-gray-600 mb-3">{ad.description}</p>}
          <div className="flex gap-2">
            {ad.link_url && (
              <a href={ad.link_url} target="_blank" rel="noopener noreferrer"
                onClick={() => {
                  const token = localStorage.getItem('token');
                  axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/ads/${ad.id}/click`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                  }).catch(() => {});
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors">
                اعرف أكثر
              </a>
            )}
            <button onClick={() => setShow(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
              إغلاق
            </button>
          </div>
        </div>
        <span className="absolute top-3 start-3 text-[9px] bg-black/30 text-white px-2 py-0.5 rounded-full">إعلان</span>
      </div>
    </div>
  );
};

export default Layout;
