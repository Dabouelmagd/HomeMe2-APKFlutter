import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';
import './i18n'; // Initialize i18n

// Components
import Login from './components/Login';
import Register from './components/Register';
import DebugLogin from './components/DebugLogin';
import AdminDashboard from './components/AdminDashboard';
import ResidentDashboard from './components/ResidentDashboard';
import CompoundManagement from './components/CompoundManagement';
import ServicesManagement from './components/ServicesManagement';
import UtilityBills from './components/UtilityBills';
import FamilyManagement from './components/FamilyManagement';
import FinancialManagement from './components/FinancialManagement';
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
      
      // Verify token and get user info
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Initialize WebSocket connection
        initializeSocket(parsedUser.id);
      }
    }
    setLoading(false);
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

// Main App Component
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/debug-login" element={<DebugLogin />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                
                <Route path="dashboard" element={
                  <DashboardRouter />
                } />
                
                <Route path="compound" element={
                  <ProtectedRoute adminOnly>
                    <CompoundManagement />
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
                
                <Route path="pricing" element={
                  <Pricing />
                } />
                
                <Route path="finances" element={
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
              </Route>
            </Routes>
            <Toaster />
            <PWAInstallPrompt />
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
  } else {
    return <ResidentDashboard />;
  }
};

export default App;