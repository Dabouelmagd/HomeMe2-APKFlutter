import React, { useState, useEffect, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import axios from 'axios';
import { attachRewriteToAxios } from './api/sameOriginRewrite';
import io from 'socket.io-client';
import './App.css';
import './styles/mobile.css';
import './i18n'; // Initialize i18n
import { autoSubscribeToPush, initializePushNotifications } from './services/autoPushService';

// Scroll to top component
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}

// Force re-render on navigation (fixes back button issue)
function RouteChangeHandler({ children }) {
  const location = useLocation();
  const [key, setKey] = useState(0);
  
  useEffect(() => {
    // Force re-render when location changes (including back/forward navigation)
    setKey(prev => prev + 1);
  }, [location.pathname, location.search]);
  
  return <React.Fragment key={key}>{children}</React.Fragment>;
}

// Components
import Login from './components/Login';
import Register from './components/Register';
import DebugLogin from './components/DebugLogin';
import HomePage from './components/HomePage';
const BlogIndex = React.lazy(() => import('./pages/BlogIndex'));
const BlogPost = React.lazy(() => import('./pages/BlogPost'));
const EmailVerify = React.lazy(() => import('./pages/EmailVerify'));
import OwnerDashboard from './components/OwnerDashboard';
import AdminDashboard from './components/AdminDashboard';
import ResidentDashboard from './components/ResidentDashboard';
import SecurityDashboard from './components/SecurityDashboard';
import CompoundManagement from './components/CompoundManagement';
import ServicesManagement from './components/ServicesManagement';
import UtilityBills from './components/UtilityBills';
import FamilyManagement from './components/FamilyManagement';
import AddFamilyMemberToUnit from './components/AddFamilyMemberToUnit';
import FinancialManagement from './components/FinancialManagement';
import CompoundFinance from './components/CompoundFinance';
import SatisfactionDashboard from './components/SatisfactionDashboard';
import ContractsManagement from './components/ContractsManagement';
import CompoundPaymentMethodsPage from './pages/CompoundPaymentMethodsPage';
import ComplaintsSystem from './components/ComplaintsSystem';
import SuperAdminPanel from './components/SuperAdminPanel';
import AdvertiserPortal from './pages/AdvertiserPortal';
import AdvertiserRegister from './pages/AdvertiserRegister';
import CompanyAdminDashboard from './pages/CompanyAdminDashboard';
import JoinViaInvite from './pages/JoinViaInvite';
import MyInvitesPage from './pages/MyInvitesPage';
import SystemHealthPage from './pages/SystemHealthPage';
import AuditLogPage from './pages/AuditLogPage';
import WhatsAppPage from './pages/WhatsAppPage';
import OwnerKpiPage from './pages/OwnerKpiPage';
import ChangelogManagementPage from './pages/ChangelogManagementPage';
import VisitorPassesPage from './pages/VisitorPassesPage';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import AppVersionGuard from './components/AppVersionGuard';
import ChangelogModal from './components/ChangelogModal';
import PdfReportsPage from './pages/PdfReportsPage';
import AIAutoPilotPage from './components/AIAutoPilotPage';
import SubscriptionAnalyticsPage from './pages/SubscriptionAnalyticsPage';
import LegalPage from './pages/LegalPage';
import LegalEditorPage from './pages/LegalEditorPage';
import TestimonialSubmitPage from './pages/TestimonialSubmitPage';
import TestimonialModerationPage from './pages/TestimonialModerationPage';
import TwoFactorSettingsPage from './pages/TwoFactorSettingsPage';
import SmtpHealthPage from './pages/SmtpHealthPage';
import BrandingSettingsPage from './pages/BrandingSettingsPage';
import EmailTemplatesPage from './pages/EmailTemplatesPage';
import MediaHealthPage from './pages/MediaHealthPage';
import AppBrandingPage from './pages/AppBrandingPage';
import DesignSystemPage from './pages/DesignSystemPage';
import SecurityScanPage from './pages/SecurityScanPage';
import PublicVisitorPassPage from './pages/PublicVisitorPassPage';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import OnboardingWizard from './components/OnboardingWizard';
import JoinFamilyByInvite from './pages/JoinFamilyByInvite';
import AlertsDashboard from './pages/AlertsDashboard';
import FinancialRoute from './components/FinancialRoute';
import MessageCenter from './components/MessageCenter';
import SubscriptionManagement from './components/SubscriptionManagement';
import NotificationCenter from './components/NotificationCenter';
import Chat from './components/Chat';
import Settings from './components/Settings';
import FileGallery from './components/FileGallery';
import MessageScheduling from './components/MessageScheduling';
import ServiceBooking from './components/ServiceBooking';
import Pricing from './components/Pricing';
import Layout from './components/Layout';
import ResidentsList from './components/ResidentsList';
import ResidentProfile from './components/ResidentProfile';
import UserManagement from './components/UserManagement';
import MonitoringDashboard from './components/MonitoringDashboard';
import SubscriptionCodesUnified from './components/SubscriptionCodesUnified';
import CompoundsManagement from './components/CompoundsManagement';
import MobileAppPage from './pages/MobileAppPage';
import PaymentPage from './pages/PaymentPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage from './pages/PaymentCancelPage';
import LocationsPage from './pages/LocationsPage';
import CheckoutPage from './pages/CheckoutPage';
import PayPalSuccessPage from './pages/PayPalSuccessPage';
import FacilityBooking from './pages/FacilityBooking';
import { TransliterationProvider } from './components/TransliterationToggle';
import { ThemeProvider } from './components/ThemeProvider';
import MaintenanceSystem from './components/MaintenanceSystem';
import EnterpriseRegistration from './components/EnterpriseRegistration';
import EnterpriseDashboard from './components/EnterpriseDashboard';
import AccountTypeSelection from './components/AccountTypeSelection';
import PublicAccountTypeSelection from './components/PublicAccountTypeSelection';
import IndividualRegistration from './components/IndividualRegistration';
import GuestManagement from './components/GuestManagement';
import EventsAnnouncements from './components/EventsAnnouncements';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import AdRealtimeDashboard from './components/AdRealtimeDashboard';
import InternalAdBanner from './components/InternalAdBanner';
import DocumentManagement from './components/DocumentManagement';
import VotingSystem from './components/VotingSystem';
import SmartHomeIntegration from './components/SmartHomeIntegration';
import TermsPrivacy from './components/TermsPrivacy';
import ContactUs from './components/ContactUs';
import Newsletter from './components/Newsletter';
import HelpCenter from './components/HelpCenter';
import ContactSupport from './pages/ContactSupport';
import MobileOptimized from './components/MobileOptimized';
// SubscriptionCodesManagement replaced by SubscriptionCodesUnified
import SubscriptionActivation from './components/SubscriptionActivation';
import AccountSelector from './components/AccountSelector';
import CompanySubscriptions from './components/CompanySubscriptions';
import OwnerBudget from './components/OwnerBudget';
import SubscriptionReminders from './components/SubscriptionReminders';
import NotificationPreferencesPage from './components/NotificationPreferencesPage';
import CompoundMap from './components/CompoundMap';
import StaffManagement from './components/StaffManagement';
import AboutUs from './components/AboutUs';
import FAQPage from './pages/FAQPage';
import ReferralProgramPage from './components/ReferralProgramPage';
import AIAssistantBubble from './components/AIAssistantBubble';
import ResetPassword from './components/ResetPassword';
import { GlobalUIProvider } from './providers/GlobalUIProvider';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Note: when the page origin differs from BACKEND_URL, ALL outgoing
// /api requests (axios + fetch + WebSocket) are transparently rewritten
// to same-origin by `installSameOriginRewrite()` in `index.js`. So
// every URL built from BACKEND_URL/API in this codebase still works in
// production deployments on custom domains (e.g. homemeapp.net) without
// hitting CORS, third-party-cookie, or stale-SW issues.

// Auth Context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Notification Context
const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

import {
  getCurrentSession,
  saveCurrentSession,
  removeCurrentSession,
  getActiveSessions,
  switchToSession,
  cleanupStaleSessions,
  migrateFromLegacy,
} from './utils/sessionManager';

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Cleanup old sessions and migrate legacy storage
    cleanupStaleSessions();
    migrateFromLegacy();

    // Inject X-Active-Compound-Id on every request so company_admin (and
    // owner/super_admin) can switch compound context cleanly. Backend
    // verifies the compound is owned by the user's company before honouring it.
    const reqInterceptorId = axios.interceptors.request.use((config) => {
      const cid = localStorage.getItem('selectedCompoundId');
      if (cid) {
        config.headers = config.headers || {};
        config.headers['X-Active-Compound-Id'] = cid;
      }
      return config;
    });

    // Surface plan-limit / feature-gate errors as a friendly upgrade toast.
    // Backend returns: 403 { detail: { code: 'plan_limit_feature'|'plan_limit_compounds'|'plan_limit_residents', message, current_plan_name_ar } }
    const resInterceptorId = axios.interceptors.response.use(
      (resp) => resp,
      (err) => {
        const detail = err?.response?.data?.detail;
        if (
          err?.response?.status === 403 &&
          detail && typeof detail === 'object' &&
          (detail.code === 'plan_limit_feature' || detail.code === 'plan_limit_compounds' || detail.code === 'plan_limit_residents')
        ) {
          // Lazy import to avoid circular dep at module load
          import('sonner').then(({ toast }) => {
            toast.error(detail.message || 'هذه الميزة غير متاحة في خطتك الحالية', {
              description: detail.current_plan_name_ar ? `الخطة الحالية: ${detail.current_plan_name_ar}` : undefined,
              duration: 6500,
              action: {
                label: '🚀 ترقية الخطة',
                onClick: () => { window.location.href = '/app/dashboard'; window.dispatchEvent(new CustomEvent('openUpgradeModal')); },
              },
            });
          }).catch(() => {});
        }
        return Promise.reject(err);
      }
    );

    // Get this tab's session
    const session = getCurrentSession();
    const token = session?.token || localStorage.getItem('token');

    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      axios.get(`${API}/auth/me`)
        .then(response => {
          const userData = response.data;
          // Restore role from session-specific storage — but only if it's compatible with the user's real role
          // Prevents a previously saved 'app_owner' role from being applied to a super_admin session
          const savedRole = session?.selectedRole || localStorage.getItem('selectedRole');
          const ROLE_HIERARCHY = {
            app_owner: ['app_owner', 'super_admin', 'company_admin', 'admin', 'manager', 'security', 'resident'],
            super_admin: ['super_admin', 'company_admin', 'admin', 'manager', 'security', 'resident'],
            company_admin: ['company_admin', 'admin', 'manager', 'security', 'resident'],
            admin: ['admin', 'manager', 'security', 'resident'],
            manager: ['manager', 'security', 'resident'],
            security: ['security', 'resident'],
            resident: ['resident'],
          };
          const allowedSubRoles = ROLE_HIERARCHY[userData.role] || [userData.role];
          if (savedRole && savedRole !== userData.role && allowedSubRoles.includes(savedRole)) {
            userData.active_role = savedRole;
          } else if (savedRole && !allowedSubRoles.includes(savedRole)) {
            // Clean up stale role that doesn't belong to this user
            localStorage.removeItem('selectedRole');
          }
          const savedCompoundId = session?.selectedCompoundId || localStorage.getItem('selectedCompoundId');
          if (savedCompoundId) {
            userData.selected_compound_id = savedCompoundId;
          }
          setUser(userData);
          
          // Update session storage
          saveCurrentSession(token, userData, {
            selectedRole: savedRole,
            selectedCompoundId: savedCompoundId,
          });
          // Keep legacy storage in sync for backward compatibility
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(userData));
          
          initializeSocket(userData.id);
          initializePushNotifications();
        })
        .catch(error => {
          console.log('Token verification failed:', error);
          removeCurrentSession();
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          delete axios.defaults.headers.common['Authorization'];
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => {
      axios.interceptors.request.eject(reqInterceptorId);
      axios.interceptors.response.eject(resInterceptorId);
    };
  }, []);

  const initializeSocket = (userId) => {
    const socketConnection = io(BACKEND_URL, {
      transports: ['websocket', 'polling']
    });
    
    socketConnection.emit('join', userId);
    setSocket(socketConnection);
    
    return () => {
      socketConnection.disconnect();
    };
  };

  const login = async (credentials) => {
    try {
      // Use a fresh axios instance with no inherited Authorization header.
      // We attach the same-origin rewrite interceptor explicitly because
      // axios.create() doesn't inherit the global one.
      const cleanClient = axios.create({
        timeout: 20000,
        headers: { 'Content-Type': 'application/json' },
      });
      attachRewriteToAxios(cleanClient);
      const response = await cleanClient.post(`${API}/auth/login`, credentials);

      // 2FA gate — return temp token to caller without setting session
      if (response.data?.two_factor_required) {
        return {
          success: false,
          two_factor_required: true,
          temp_token: response.data.temp_token,
          ttl_minutes: response.data.ttl_minutes,
        };
      }

      // Feature #54 — Mandatory 2FA enrolment for app_owner / super_admin
      if (response.data?.two_factor_setup_required) {
        return {
          success: false,
          two_factor_setup_required: true,
          setup_token: response.data.setup_token,
          ttl_minutes: response.data.ttl_minutes,
          role: response.data.role,
          message: response.data.message,
        };
      }

      const { access_token, user: userData } = response.data;

      saveCurrentSession(access_token, userData);
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      setUser(userData);
      try { initializeSocket(userData.id); } catch (_e) { /* socket non-critical */ }

      setTimeout(() => {
        autoSubscribeToPush().then(success => {
          if (success) console.log('Push notifications enabled');
        });
      }, 1500);

      return { success: true };
    } catch (error) {
      const detail = error?.response?.data?.detail;
      let msg;
      // Email verification gate: backend returns {code:'EMAIL_NOT_VERIFIED', message, email}
      if (detail && typeof detail === 'object' && detail.code === 'EMAIL_NOT_VERIFIED') {
        return {
          success: false,
          email_not_verified: true,
          email: detail.email,
          error: detail.message,
        };
      }
      if (typeof detail === 'string') msg = detail;
      else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail.map(d => d.msg || d.message || '').filter(Boolean).join(' • ');
      } else if (error?.response?.status === 401) msg = 'اسم المستخدم أو كلمة المرور غير صحيحة';
      else if (error?.response?.status) msg = `فشل تسجيل الدخول (HTTP ${error.response.status})`;
      else msg = 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت ثم حاول مرة أخرى.';
      return { success: false, error: msg };
    }
  };

  const verifyTwoFactor = async ({ temp_token, code }) => {
    try {
      const r = await axios.post(`${API}/2fa/verify-login`, { temp_token, code });
      const { access_token, user: userData } = r.data;
      saveCurrentSession(access_token, userData);
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(userData);
      initializeSocket(userData.id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || '2FA verification failed',
      };
    }
  };

  const register = async (userData) => {
    try {
      await axios.post(`${API}/auth/register`, userData);
      return { success: true };
    } catch (error) {
      // Extract a human-readable error in Arabic.
      // FastAPI returns either:
      //   - 4xx: { detail: "string" }              (our HTTPException)
      //   - 422: { detail: [{ msg, loc, type }] }  (Pydantic validation)
      //   - Network/CORS failure → no response object at all
      const detail = error.response?.data?.detail;
      let msg;
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail
          .map(d => `${(d.loc || []).slice(-1)[0] || ''}: ${d.msg || d.message || ''}`.trim())
          .filter(Boolean)
          .join(' • ');
      } else if (error.response?.status) {
        msg = `فشل التسجيل (HTTP ${error.response.status})`;
      } else if (error.message === 'Network Error' || !error.response) {
        msg = 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت ثم حاول مرة أخرى.';
      } else {
        msg = 'فشل التسجيل. يرجى المحاولة مرة أخرى.';
      }
      return { success: false, error: msg };
    }
  };

  const updateUser = (updatedUser) => {
    const session = getCurrentSession();
    if (session) {
      saveCurrentSession(session.token, updatedUser, {
        selectedRole: updatedUser.active_role || session.selectedRole,
        selectedCompoundId: updatedUser.selected_compound_id || session.selectedCompoundId,
      });
    }
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const logout = () => {
    removeCurrentSession();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedCompoundId');
    localStorage.removeItem('selectedRole');
    localStorage.removeItem('rememberedAccount');
    localStorage.removeItem('rememberCompound');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  // Switch to another active session (for multi-account)
  const switchSession = (targetSessionId) => {
    const target = switchToSession(targetSessionId);
    if (!target) return false;
    
    // Update axios and state
    axios.defaults.headers.common['Authorization'] = `Bearer ${target.token}`;
    localStorage.setItem('token', target.token);
    localStorage.setItem('user', JSON.stringify(target.user));
    if (target.selectedRole) localStorage.setItem('selectedRole', target.selectedRole);
    if (target.selectedCompoundId) localStorage.setItem('selectedCompoundId', target.selectedCompoundId);
    
    setUser(target.user);
    window.location.reload();
    return true;
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      verifyTwoFactor,
      register,
      logout,
      updateUser,
      switchSession,
      getActiveSessions,
      loading,
      socket
    }}>
      {children}
    </AuthContext.Provider>
  );
};

const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { socket, user } = useAuth();

  // Fetch the initial notification list from the REST API whenever the user logs in.
  const fetchNotifications = React.useCallback(async () => {
    if (!user) return;
    try {
      const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
      const r = await axios.get(`${API}/notifications?limit=100`);
      const list = r.data?.notifications || [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.is_read).length);
    } catch (e) {
      // silent — fall back to socket-only mode
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (socket && user) {
      socket.on('notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      socket.on('new_message', (message) => {
        setNotifications(prev => [message, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      return () => {
        socket.off('notification');
        socket.off('new_message');
      };
    }
  }, [socket, user]);

  const markAsRead = async (notificationId) => {
    try {
      const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
      await axios.patch(`${API}/notifications/${notificationId}/read`);
    } catch (e) {
      // continue with optimistic update even if API fails
    }
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, read: true, is_read: true }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const deleteNotification = async (notificationId) => {
    try {
      const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
      await axios.delete(`${API}/notifications/${notificationId}`);
    } catch (e) {
      // continue
    }
    setNotifications(prev => {
      const n = prev.find((x) => x.id === notificationId);
      if (n && !n.is_read) setUnreadCount((u) => Math.max(0, u - 1));
      return prev.filter((x) => x.id !== notificationId);
    });
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      deleteNotification,
      fetchNotifications,
      clearAll
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false, roles = null }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-6"></div>
        {/* Splash Ad during loading */}
        <div className="w-full max-w-md px-4">
          <InternalAdBanner position="splash" maxAds={1} variant="full" />
        </div>
      </div>
    );
  }

  if (!user) {
    // Save the current location so we can redirect back after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (adminOnly && !['admin', 'super_admin', 'company_admin', 'manager', 'app_owner'].includes(user.role)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  // 🛡️ Per-route role whitelist — prevents role-scoped pages (e.g. /app/super-admin)
  // from being accessible by unauthorized roles after an account-switch.
  if (roles && Array.isArray(roles) && !roles.includes(user.role)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
};

// Page Title Component
const PageTitleUpdater = () => {
  const { t, i18n } = useTranslation();
  
  useEffect(() => {
    // Update page title when language changes
    document.title = t('app_title');
  }, [t, i18n.language]);
  
  return null;
};

// Language and Layout Initializer
const LanguageInitializer = () => {
  const { i18n } = useTranslation();
  
  useEffect(() => {
    // Initialize language from localStorage or default to Arabic
    const storedLanguage = localStorage.getItem('i18nextLng');
    const normalized = storedLanguage ? storedLanguage.split('-')[0].toLowerCase() : 'ar';
    const validLang = ['en', 'ar', 'fr'].includes(normalized) ? normalized : 'ar';
    if (i18n.language !== validLang) {
      i18n.changeLanguage(validLang);
    }
    // Update html lang attribute
    document.documentElement.setAttribute('lang', validLang);
  }, [i18n]);
  
  useEffect(() => {
    // Apply RTL layout based on current language
    const applyLanguageLayout = (lang) => {
      if (lang === 'ar') {
        document.dir = 'rtl';
        document.documentElement.setAttribute('dir', 'rtl');
        document.body.classList.add('rtl');
        document.body.style.direction = 'rtl';
      } else {
        document.dir = 'ltr';
        document.documentElement.setAttribute('dir', 'ltr');
        document.body.classList.remove('rtl');
        document.body.style.direction = 'ltr';
      }
    };

    // Apply layout for current language
    applyLanguageLayout(i18n.language);
  }, [i18n.language]);
  
  return null;
};

// Compound Selection Redirect
const CompoundRedirect = () => {
  const remembered = localStorage.getItem('rememberedAccount');
  const rememberCompound = localStorage.getItem('rememberCompound') === 'true';
  
  if (remembered && rememberCompound) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return <Navigate to="/select-account" replace />;
};

// Require compound selection before accessing dashboard
const RequireCompound = ({ children }) => {
  const remembered = localStorage.getItem('rememberedAccount');
  const selectedCompound = localStorage.getItem('selectedCompoundId');
  if (!remembered && !selectedCompound) {
    return <Navigate to="/select-account" replace />;
  }
  return children;
};

// Main App Component  
function App() {
  return (
    <div className="App">
      <AppVersionGuard />
      <ChangelogModal />
      <BrowserRouter>
        <ScrollToTop />
        <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <TransliterationProvider>
              <LanguageInitializer />
              <PageTitleUpdater />
              <RouteChangeHandler>
                <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/terms-privacy" element={<TermsPrivacy />} />
          <Route path="/legal" element={<TermsPrivacy />} />
                <Route path="/register" element={<Register />} />
                <Route path="/advertiser-register" element={<AdvertiserRegister />} />
                <Route path="/join/:token" element={<JoinViaInvite />} />
                <Route path="/join-family/:token" element={<JoinFamilyByInvite />} />
                <Route path="/visitor/:token" element={<PublicVisitorPassPage />} />
                <Route path="/debug-login" element={<DebugLogin />} />
                <Route path="/select-account" element={
                  <ProtectedRoute>
                    <AccountSelector />
                  </ProtectedRoute>
                } />
                <Route path="/account-type-selection" element={<PublicAccountTypeSelection />} />
                <Route path="/public-account-type-selection" element={<Navigate to="/" replace />} />
                
                {/* Root redirects to homepage */}
                <Route path="/" element={<HomePage />} />

                {/* Public legal/info pages */}
                <Route path="/legal/:slug" element={<LegalPage />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/contact" element={<ContactUs />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/faq" element={<FAQPage />} />

                {/* Public testimonial submission */}
                <Route path="/testimonials/submit" element={<TestimonialSubmitPage />} />

                {/* Blog / Content Hub — AdSense compliance + SEO + content marketing */}
                <Route
                  path="/blog"
                  element={
                    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>}>
                      <BlogIndex />
                    </React.Suspense>
                  }
                />
                <Route
                  path="/blog/:slug"
                  element={
                    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>}>
                      <BlogPost />
                    </React.Suspense>
                  }
                />
                <Route
                  path="/verify-email"
                  element={
                    <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>}>
                      <EmailVerify />
                    </React.Suspense>
                  }
                />

                <Route path="/app" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                <Route index element={<CompoundRedirect />} />
                
                <Route path="dashboard" element={
                  <RequireCompound>
                    <DashboardRouter />
                  </RequireCompound>
                } />
                
                <Route path="compound" element={
                  <ProtectedRoute adminOnly>
                    <CompoundManagement />
                  </ProtectedRoute>
                } />
                
                <Route path="residents" element={
                  <ProtectedRoute adminOnly>
                    <ResidentsList />
                  </ProtectedRoute>
                } />
                
                <Route path="residents/:residentId" element={
                  <ProtectedRoute adminOnly>
                    <ResidentProfile />
                  </ProtectedRoute>
                } />
                
                <Route path="users" element={
                  <ProtectedRoute adminOnly>
                    <UserManagement />
                  </ProtectedRoute>
                } />
                
                <Route path="monitoring" element={
                  <ProtectedRoute adminOnly>
                    <MonitoringDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="subscription-codes" element={
                  <ProtectedRoute adminOnly>
                    <SubscriptionCodesUnified />
                  </ProtectedRoute>
                } />
                
                <Route path="compounds-management" element={
                  <ProtectedRoute adminOnly>
                    <CompoundsManagement />
                  </ProtectedRoute>
                } />
                
                <Route path="services" element={
                  <ServicesManagement />
                } />
                
                <Route path="reports" element={
                  <PdfReportsPage />
                } />

                <Route path="ai-autopilot" element={
                  <AIAutoPilotPage />
                } />

                <Route path="subscription-analytics" element={
                  <SubscriptionAnalyticsPage />
                } />

                <Route path="legal-editor" element={
                  <LegalEditorPage />
                } />

                <Route path="testimonials-moderation" element={
                  <TestimonialModerationPage />
                } />
                
                <Route path="two-factor" element={
                  <TwoFactorSettingsPage />
                } />

                <Route path="smtp-health" element={
                  <SmtpHealthPage />
                } />

                <Route path="branding" element={
                  <BrandingSettingsPage />
                } />

                <Route path="email-templates" element={
                  <EmailTemplatesPage />
                } />

                <Route path="media-health" element={
                  <ProtectedRoute>
                    <MediaHealthPage />
                  </ProtectedRoute>
                } />

                <Route path="app-branding" element={
                  <ProtectedRoute>
                    <AppBrandingPage />
                  </ProtectedRoute>
                } />
                
                <Route path="utilities" element={
                  <UtilityBills />
                } />
                
                <Route path="family" element={
                  <FamilyManagement />
                } />
                
                <Route path="add-family-member" element={
                  <AddFamilyMemberToUnit />
                } />
                
                <Route path="my-invites" element={
                  <MyInvitesPage />
                } />

                <Route path="system-health" element={
                  <ProtectedRoute>
                    <SystemHealthPage />
                  </ProtectedRoute>
                } />

                <Route path="audit-log" element={
                  <ProtectedRoute>
                    <AuditLogPage />
                  </ProtectedRoute>
                } />

                <Route path="whatsapp" element={
                  <ProtectedRoute>
                    <WhatsAppPage />
                  </ProtectedRoute>
                } />

                <Route path="owner-kpis" element={
                  <ProtectedRoute>
                    <OwnerKpiPage />
                  </ProtectedRoute>
                } />

                <Route path="changelog" element={
                  <ProtectedRoute>
                    <ChangelogManagementPage />
                  </ProtectedRoute>
                } />

                <Route path="visitor-passes" element={
                  <VisitorPassesPage />
                } />

                <Route path="design-system" element={
                  <DesignSystemPage />
                } />

                <Route path="payment-success" element={
                  <PaymentSuccess />
                } />

                <Route path="payment-cancel" element={
                  <PaymentCancel />
                } />

                <Route path="security-scan" element={
                  <SecurityScanPage />
                } />
                
                <Route path="pricing" element={
                  <Pricing />
                } />
                
                <Route path="finances" element={
                  <ProtectedRoute adminOnly>
                    <CompoundFinance />
                  </ProtectedRoute>
                } />
                
                <Route path="company-subscriptions" element={
                  <ProtectedRoute adminOnly>
                    <CompanySubscriptions />
                  </ProtectedRoute>
                } />
                
                <Route path="owner-budget" element={
                  <ProtectedRoute adminOnly>
                    <OwnerBudget />
                  </ProtectedRoute>
                } />
                
                <Route path="subscription-reminders" element={
                  <ProtectedRoute adminOnly>
                    <SubscriptionReminders />
                  </ProtectedRoute>
                } />
                
                <Route path="satisfaction" element={
                  <ProtectedRoute adminOnly>
                    <SatisfactionDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="contracts" element={
                  <ProtectedRoute adminOnly>
                    <ContractsManagement />
                  </ProtectedRoute>
                } />

                <Route path="compound-payment-methods" element={
                  <ProtectedRoute>
                    <CompoundPaymentMethodsPage />
                  </ProtectedRoute>
                } />
                
                <Route path="complaints" element={
                  <ProtectedRoute>
                    <ComplaintsSystem />
                  </ProtectedRoute>
                } />
                
                <Route path="super-admin" element={
                  <ProtectedRoute roles={['app_owner', 'super_admin']}>
                    <SuperAdminPanel />
                  </ProtectedRoute>
                } />

                <Route path="advertiser" element={
                  <ProtectedRoute>
                    <AdvertiserPortal />
                  </ProtectedRoute>
                } />

                <Route path="alerts" element={
                  <ProtectedRoute>
                    <AlertsDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="financial-old" element={
                  <FinancialManagement />
                } />
                
                <Route path="messages" element={
                  <MessageCenter />
                } />
                
                <Route path="chat" element={
                  <Chat />
                } />
                
                <Route path="notifications" element={
                  <NotificationCenter />
                } />
                
                <Route path="settings" element={
                  <Settings />
                } />
                <Route path="notification-preferences" element={
                  <NotificationPreferencesPage />
                } />
                <Route path="compound-map" element={
                  <CompoundMap />
                } />
                <Route path="staff" element={
                  <ProtectedRoute requiredRole="admin">
                    <StaffManagement />
                  </ProtectedRoute>
                } />
                <Route path="referral" element={
                  <ReferralProgramPage />
                } />
                
                <Route path="gallery" element={
                  <FileGallery />
                } />
                
                <Route path="schedule" element={
                  <MessageScheduling />
                } />
                
                <Route path="service-booking" element={
                  <ServiceBooking />
                } />
                
                <Route path="maintenance" element={
                  <MaintenanceSystem />
                } />
                
                <Route path="guests" element={
                  <GuestManagement />
                } />
                
                <Route path="events" element={
                  <EventsAnnouncements />
                } />
                
                <Route path="analytics" element={
                  <AdvancedAnalytics />
                } />
                
                <Route path="ad-analytics" element={
                  <AdRealtimeDashboard />
                } />
                
                <Route path="documents" element={
                  <DocumentManagement />
                } />
                
                <Route path="voting" element={
                  <VotingSystem />
                } />
                
                <Route path="facility-booking" element={
                  <FacilityBooking />
                } />
                
                <Route path="smart-home" element={
                  <SmartHomeIntegration />
                } />
                
                <Route path="subscription-codes" element={
                  <SubscriptionCodesUnified />
                } />
                
                <Route path="activate-subscription" element={
                  <SubscriptionActivation />
                } />
                
                <Route path="my-subscription" element={
                  <SubscriptionManagement />
                } />
                
                <Route path="terms-privacy" element={
                  <TermsPrivacy />
                } />
                
                <Route path="legal" element={
                  <TermsPrivacy />
                } />
                
                <Route path="contact" element={
                  <ContactUs />
                } />
                
                <Route path="newsletter" element={
                  <Newsletter />
                } />
                
                <Route path="help" element={
                  <HelpCenter />
                } />
                
                <Route path="support" element={
                  <ContactSupport />
                } />
                
                <Route path="mobile-app" element={
                  <MobileAppPage />
                } />
                
                <Route path="payments" element={
                  <PaymentPage />
                } />
                
                <Route path="payment/success" element={
                  <PaymentSuccessPage />
                } />
                
                <Route path="payment/cancel" element={
                  <PaymentCancelPage />
                } />
                
                <Route path="checkout" element={
                  <CheckoutPage />
                } />
                
                <Route path="payment/paypal-success" element={
                  <PayPalSuccessPage />
                } />
                
                <Route path="locations" element={
                  <LocationsPage />
                } />
                
                {/* Enterprise Routes - Individual and Enterprise registration are inside Layout */}
                <Route path="individual-register" element={
                  <IndividualRegistration />
                } />
                
                <Route path="enterprise-register" element={
                  <EnterpriseRegistration />
                } />
                
                <Route path="enterprise-dashboard" element={
                  <EnterpriseDashboard />
                } />

                {/* 404 fallback for any unknown /app/* route — prevents WHITE SCREEN */}
                <Route path="*" element={
                  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6" dir="rtl">
                    <div className="max-w-md text-center bg-white rounded-3xl shadow-2xl p-8">
                      <div className="text-6xl mb-4">🔍</div>
                      <h1 className="text-2xl font-black text-gray-900 mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>الصفحة غير موجودة</h1>
                      <p className="text-gray-600 mb-6">المسار اللي حاولت تفتحه غير متاح. ربما تم نقله أو إعادة تسميته.</p>
                      <Link to="/" className="inline-block bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold px-6 py-3 rounded-xl hover:shadow-lg">العودة للوحة التحكم ←</Link>
                    </div>
                  </div>
                } />
              </Route>
              </Routes>
            </RouteChangeHandler>
            <GlobalUIProvider />
            <PwaInstallPrompt />
            <OnboardingWizard />
            {/* 🤖 AI Assistant — globally available on every logged-in route
                (component self-hides for guests). Iter 139 promotes the bubble
                from /app/* layout to the whole app shell. */}
            <GlobalAIAssistant />
            </TransliterationProvider>
          </NotificationProvider>
        </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </div>
  );
}

// AI Assistant wrapper — renders the floating bubble only on routes outside
// /app/* because Layout.js already mounts one for the dashboard shell. This
// avoids duplicate bubbles while still making the assistant available on
// HomePage, Pricing, About, Contact, and other public/logged-in pages.
const GlobalAIAssistant = () => {
  const location = useLocation();
  const inAppShell = location.pathname.startsWith('/app/') || location.pathname === '/app';
  if (inAppShell) return null;
  return <AIAssistantBubble />;
};

// Dashboard Router Component
const DashboardRouter = () => {
  const { user } = useAuth();
  const activeRole = user?.active_role || user?.role;
  
  if (activeRole === 'app_owner') {
    return <OwnerDashboard />;
  } else if (activeRole === 'company_admin') {
    return <CompanyAdminDashboard />;
  } else if (activeRole === 'super_admin') {
    return <AdminDashboard />;
  } else if (activeRole === 'admin' || activeRole === 'manager') {
    return <AdminDashboard />;
  } else if (activeRole === 'security') {
    return <SecurityDashboard />;
  } else {
    return <ResidentDashboard />;
  }
};

export default App;