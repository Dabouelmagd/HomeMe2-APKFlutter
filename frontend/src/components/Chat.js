import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import NewChatModal from './NewChatModal';

const Chat = () => {
  const { user, socket } = useAuth();
  const { t } = useTranslation();
  const [selectedChat, setSelectedChat] = useState(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [chatUpdateTrigger, setChatUpdateTrigger] = useState(0);

  // WebSocket connection for chat
  useEffect(() => {
    if (socket && user) {
      // Connect to chat WebSocket
      const chatSocket = new WebSocket(`${process.env.REACT_APP_BACKEND_URL.replace('http', 'ws')}/ws/chat/${user.id}`);
      
      chatSocket.onopen = () => {
        console.log('Chat WebSocket connected');
      };
      
      chatSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        // Handle real-time chat messages
        if (data.type === 'new_message' || data.type === 'message_edited' || data.type === 'message_deleted') {
          // Update will be handled by ChatWindow component
        } else if (data.type === 'chat_update') {
          // Trigger chat list refresh
          setChatUpdateTrigger(prev => prev + 1);
        }
      };
      
      chatSocket.onerror = (error) => {
        console.error('Chat WebSocket error:', error);
      };
      
      chatSocket.onclose = () => {
        console.log('Chat WebSocket disconnected');
      };
      
      return () => {
        chatSocket.close();
      };
    }
  }, [socket, user]);

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
  };

  const handleNewChat = () => {
    setShowNewChatModal(true);
  };

  const handleChatCreated = (newChat) => {
    setSelectedChat(newChat);
    setChatUpdateTrigger(prev => prev + 1);
  };

  const handleChatUpdate = () => {
    setChatUpdateTrigger(prev => prev + 1);
  };

  return (
    <div className="h-screen flex bg-gray-50">
      <ChatSidebar
        selectedChat={selectedChat}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
        key={chatUpdateTrigger}
      />
      
      <ChatWindow
        chat={selectedChat}
        onChatUpdate={handleChatUpdate}
      />
      
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onChatCreated={handleChatCreated}
      />
    </div>
  );
};

export default Chat;