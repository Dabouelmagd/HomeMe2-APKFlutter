import React, { useState, useEffect, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';
import './styles/mobile.css';
import './i18n'; // Initialize i18n

// Scroll to top component
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
}

// Components
import Login from './components/Login';
import Register from './components/Register';
import DebugLogin from './components/DebugLogin';
import HomePage from './components/HomePage';
import AdminDashboard from './components/AdminDashboard';
import ResidentDashboard from './components/ResidentDashboard';
import SecurityDashboard from './components/SecurityDashboard';
import CompoundManagement from './components/CompoundManagement';
import ServicesManagement from './components/ServicesManagement';
import UtilityBills from './components/UtilityBills';
import FamilyManagement from './components/FamilyManagement';
import AddFamilyMemberToUnit from './components/AddFamilyMemberToUnit';
import FinancialManagement from './components/FinancialManagement';
import FinancialRoute from './components/FinancialRoute';
import MessageCenter from './components/MessageCenter';
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
import UserManagement from './components/UserManagement';
import MonitoringDashboard from './components/MonitoringDashboard';
import SubscriptionCodes from './components/SubscriptionCodes';
import CompoundsManagement from './components/CompoundsManagement';
import MobileAppPage from './pages/MobileAppPage';
import PaymentPage from './pages/PaymentPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage from './pages/PaymentCancelPage';
import LocationsPage from './pages/LocationsPage';
import CheckoutPage from './pages/CheckoutPage';
import PayPalSuccessPage from './pages/PayPalSuccessPage';
import { TransliterationProvider } from './components/TransliterationToggle';
import MaintenanceSystem from './components/MaintenanceSystem';
import EnterpriseRegistration from './components/EnterpriseRegistration';
import EnterpriseDashboard from './components/EnterpriseDashboard';
import AccountTypeSelection from './components/AccountTypeSelection';
import PublicAccountTypeSelection from './components/PublicAccountTypeSelection';
import IndividualRegistration from './components/IndividualRegistration';
import GuestManagement from './components/GuestManagement';
import EventsAnnouncements from './components/EventsAnnouncements';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import DocumentManagement from './components/DocumentManagement';
import VotingSystem from './components/VotingSystem';
import SmartHomeIntegration from './components/SmartHomeIntegration';
import TermsPrivacy from './components/TermsPrivacy';
import ContactUs from './components/ContactUs';
import Newsletter from './components/Newsletter';
import HelpCenter from './components/HelpCenter';
import MobileOptimized from './components/MobileOptimized';
import SubscriptionCodesManagement from './components/SubscriptionCodesManagement';
import SubscriptionActivation from './components/SubscriptionActivation';
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

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Verify token by calling /auth/me endpoint
      axios.get(`${API}/auth/me`)
        .then(response => {
          const userData = response.data;
          setUser(userData);
          
          // Update localStorage with fresh user data
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Initialize WebSocket connection
          initializeSocket(userData.id);
        })
        .catch(error => {
          console.log('Token verification failed:', error);
          // Token is invalid or expired, clear it
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
      
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setUser(userData);
      initializeSocket(userData.id);
      
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
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      updateUser,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
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
    // Initialize language from localStorage or default
    const storedLanguage = localStorage.getItem('i18nextLng');
    if (storedLanguage && ['en', 'ar', 'fr'].includes(storedLanguage)) {
      if (i18n.language !== storedLanguage) {
        i18n.changeLanguage(storedLanguage);
      }
    }
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

// Main App Component  
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <NotificationProvider>
            <TransliterationProvider>
              <LanguageInitializer />
              <PageTitleUpdater />
              <Routes>
              <Route path="/login" element={<Login />} />
        <Route path="/terms-privacy" element={<TermsPrivacy />} />
        <Route path="/legal" element={<TermsPrivacy />} />
              <Route path="/register" element={<Register />} />
              <Route path="/debug-login" element={<DebugLogin />} />
              <Route path="/account-type-selection" element={<PublicAccountTypeSelection />} />
              <Route path="/public-account-type-selection" element={<Navigate to="/" replace />} />
              
              {/* Homepage - no authentication required */}
              <Route path="/" element={<HomePage />} />
              
              <Route path="/app" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                
                <Route path="dashboard" element={
                  <DashboardRouter />
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
                    <SubscriptionCodes />
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
                  <FinancialRoute />
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
                
                <Route path="documents" element={
                  <DocumentManagement />
                } />
                
                <Route path="voting" element={
                  <VotingSystem />
                } />
                
                <Route path="smart-home" element={
                  <SmartHomeIntegration />
                } />
                
                <Route path="subscription-codes" element={
                  <SubscriptionCodesManagement />
                } />
                
                <Route path="activate-subscription" element={
                  <SubscriptionActivation />
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
            <Toaster />
            <PWAInstallPrompt />
            </TransliterationProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

// Dashboard Router Component
const DashboardRouter = () => {
  const { user } = useAuth();
  
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  } else if (user?.role === 'security') {
    return <SecurityDashboard />;
  } else {
    return <ResidentDashboard />;
  }
};

export default App;