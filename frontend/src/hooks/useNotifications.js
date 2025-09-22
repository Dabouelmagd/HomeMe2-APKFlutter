import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// WebSocket connection for real-time notifications
let ws = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

export const useNotifications = (user) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${API}/notifications`);
      const notificationsData = response.data.notifications || [];
      
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // WebSocket connection setup
  const connectWebSocket = useCallback(() => {
    if (!user || ws?.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = `${BACKEND_URL.replace('http', 'ws')}/ws/notifications/${user.id}`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'new_notification':
              // Add new notification to the top of the list
              setNotifications(prev => [data.notification, ...prev]);
              setUnreadCount(prev => prev + 1);
              
              // Show toast notification
              toast(data.notification.title, {
                description: data.notification.message,
                action: data.notification.action_url ? {
                  label: 'View',
                  onClick: () => window.location.href = data.notification.action_url
                } : undefined
              });
              break;

            case 'notification_read':
              // Update notification read status
              setNotifications(prev => 
                prev.map(n => 
                  n.id === data.notification_id 
                    ? { ...n, is_read: true }
                    : n
                )
              );
              setUnreadCount(prev => Math.max(0, prev - 1));
              break;

            case 'notification_deleted':
              // Remove notification from list
              setNotifications(prev => 
                prev.filter(n => n.id !== data.notification_id)
              );
              setUnreadCount(prev => {
                const notification = notifications.find(n => n.id === data.notification_id);
                return notification && !notification.is_read ? Math.max(0, prev - 1) : prev;
              });
              break;

            case 'bulk_notifications_read':
              // Update multiple notifications as read
              setNotifications(prev => 
                prev.map(n => 
                  data.notification_ids.includes(n.id)
                    ? { ...n, is_read: true }
                    : n
                )
              );
              setUnreadCount(0);
              break;

            default:
              console.log('Unknown WebSocket message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        
        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
          setTimeout(connectWebSocket, Math.pow(2, reconnectAttempts) * 1000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnected(false);
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [user, notifications]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (ws) {
      ws.close();
      ws = null;
      setConnected(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await axios.patch(`${API}/notifications/${notificationId}/read`);
      
      // Update local state if WebSocket is not connected
      if (!connected) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, is_read: true }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }, [connected]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await axios.delete(`${API}/notifications/${notificationId}`);
      
      // Update local state if WebSocket is not connected
      if (!connected) {
        const notification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        if (notification && !notification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }, [connected, notifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await axios.patch(`${API}/notifications/mark-all-read`);
      
      // Update local state if WebSocket is not connected
      if (!connected) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }, [connected]);

  // Send test notification (for development)
  const sendTestNotification = useCallback(async () => {
    try {
      await axios.post(`${API}/notifications/test`);
      toast.success('Test notification sent!');
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast.error('Failed to send test notification');
    }
  }, []);

  // Effects
  useEffect(() => {
    if (user) {
      fetchNotifications();
      connectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [user, fetchNotifications, connectWebSocket, disconnectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  return {
    notifications,
    unreadCount,
    loading,
    connected,
    fetchNotifications,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    sendTestNotification,
    connectWebSocket,
    disconnectWebSocket
  };
};

export default useNotifications;