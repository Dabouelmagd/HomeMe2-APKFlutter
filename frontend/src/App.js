import React, { useState, useEffect, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
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
import ComplaintsSystem from './components/ComplaintsSystem';
import SuperAdminPanel from './components/SuperAdminPanel';
import AdvertiserPortal from './pages/AdvertiserPortal';
import AdvertiserRegister from './pages/AdvertiserRegister';
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
import PWAInstallPrompt from './components/PWAInstallPrompt';
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
import MobileOptimized from './components/MobileOptimized';
// SubscriptionCodesManagement replaced by SubscriptionCodesUnified
import SubscriptionActivation from './components/SubscriptionActivation';
import AccountSelector from './components/AccountSelector';
import CompanySubscriptions from './components/CompanySubscriptions';
import OwnerBudget from './components/OwnerBudget';
import SubscriptionReminders from './components/SubscriptionReminders';
import { Toaster } from './components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

    // Get this tab's session
    const session = getCurrentSession();
    const token = session?.token || localStorage.getItem('token');

    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      axios.get(`${API}/auth/me`)
        .then(response => {
          const userData = response.data;
          // Restore role from session-specific storage
          const savedRole = session?.selectedRole || localStorage.getItem('selectedRole');
          if (savedRole && savedRole !== userData.role) {
            userData.active_role = savedRole;
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
      const response = await axios.post(`${API}/auth/login`, credentials);
      const { access_token, user: userData } = response.data;
      
      // Save to multi-session manager (tab-specific)
      saveCurrentSession(access_token, userData);
      // Keep legacy storage for backward compatibility
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setUser(userData);
      initializeSocket(userData.id);
      
      setTimeout(() => {
        autoSubscribeToPush().then(success => {
          if (success) console.log('Push notifications enabled');
        });
      }, 1500);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      await axios.post(`${API}/auth/register`, userData);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
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

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
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
      clearAll
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
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
          <Route path="/terms-privacy" element={<TermsPrivacy />} />
          <Route path="/legal" element={<TermsPrivacy />} />
                <Route path="/register" element={<Register />} />
                <Route path="/advertiser-register" element={<AdvertiserRegister />} />
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
                
                <Route path="utilities" element={
                  <UtilityBills />
                } />
                
                <Route path="family" element={
                  <FamilyManagement />
                } />
                
                <Route path="add-family-member" element={
                  <AddFamilyMemberToUnit />
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
                
                <Route path="complaints" element={
                  <ProtectedRoute>
                    <ComplaintsSystem />
                  </ProtectedRoute>
                } />
                
                <Route path="super-admin" element={
                  <ProtectedRoute>
                    <SuperAdminPanel />
                  </ProtectedRoute>
                } />

                <Route path="advertiser" element={
                  <ProtectedRoute>
                    <AdvertiserPortal />
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
              </Route>
              </Routes>
            </RouteChangeHandler>
            <Toaster />
            <PWAInstallPrompt />
            </TransliterationProvider>
          </NotificationProvider>
        </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </div>
  );
}

// Dashboard Router Component
const DashboardRouter = () => {
  const { user } = useAuth();
  const activeRole = user?.active_role || user?.role;
  
  if (activeRole === 'app_owner') {
    return <OwnerDashboard />;
  } else if (activeRole === 'super_admin' || activeRole === 'company_admin') {
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