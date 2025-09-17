import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import {
  PaperAirplaneIcon,
  FaceSmileIcon,
  PaperClipIcon,
  EllipsisVerticalIcon,
  UserGroupIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { CheckIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ChatWindow = ({ chat, onChatUpdate }) => {
  const { user, socket } = useAuth();
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (chat) {
      fetchMessages();
      markMessagesAsRead();
    }
  }, [chat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (socket && chat) {
      // Listen for new messages
      socket.on('new_message', handleNewMessage);
      socket.on('message_edited', handleMessageEdited);
      socket.on('message_deleted', handleMessageDeleted);

      return () => {
        socket.off('new_message');
        socket.off('message_edited');
        socket.off('message_deleted');
      };
    }
  }, [socket, chat]);

  const fetchMessages = async (pageNum = 1) => {
    if (!chat) return;
    
    try {
      const response = await axios.get(`${API}/chats/${chat.id}/messages?page=${pageNum}&limit=50`);
      const newMessages = response.data.messages || [];
      
      if (pageNum === 1) {
        setMessages(newMessages);
      } else {
        setMessages(prev => [...newMessages, ...prev]);
      }
      
      setHasMore(newMessages.length === 50);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!chat) return;
    
    try {
      await axios.put(`${API}/chats/${chat.id}/read`);
      if (onChatUpdate) {
        onChatUpdate();
      }
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const handleNewMessage = (data) => {
    if (data.chat_id === chat?.id) {
      setMessages(prev => [...prev, data.message]);
      markMessagesAsRead();
    }
  };

  const handleMessageEdited = (data) => {
    if (data.chat_id === chat?.id) {
      setMessages(prev => prev.map(msg => 
        msg.id === data.message_id 
          ? { ...msg, content: data.content, is_edited: true }
          : msg
      ));
    }
  };

  const handleMessageDeleted = (data) => {
    if (data.chat_id === chat?.id) {
      setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !chat) return;

    setSending(true);
    try {
      const response = await axios.post(`${API}/chats/${chat.id}/messages`, {
        content: newMessage.trim(),
        message_type: 'text'
      });
      
      setNewMessage('');
      // Message will be added via WebSocket
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMoreMessages = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
      fetchMessages(page + 1);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('chat.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('chat.yesterday');
    } else {
      return date.toLocaleDateString();
    }
  };

  const getChatName = () => {
    if (!chat) return '';
    
    if (chat.name) return chat.name;
    
    if (chat.chat_type === 'direct') {
      const otherParticipant = chat.participant_details?.find(p => p.id !== user.id);
      return otherParticipant?.full_name || 'Direct Chat';
    }
    
    if (chat.chat_type === 'compound_wide') {
      return t('chat.compoundChat');
    }
    
    return t('chat.groupChat');
  };

  const getParticipantCount = () => {
    return chat?.participants?.length || 0;
  };

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <InformationCircleIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">{t('chat.selectChatToStart')}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.created_at);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {chat.chat_type === 'direct' ? (
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {getChatName().charAt(0).toUpperCase()}
                  </span>
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center">
                  <UserGroupIcon className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{getChatName()}</h3>
              <p className="text-sm text-gray-500">
                {chat.chat_type === 'direct' 
                  ? t('chat.directChatDescription')
                  : `${getParticipantCount()} ${t('chat.participants')}`
                }
              </p>
            </div>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <EllipsisVerticalIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
      >
        {hasMore && (
          <div className="text-center">
            <button
              onClick={loadMoreMessages}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {t('chat.loadMore')}
            </button>
          </div>
        )}

        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                {date}
              </div>
            </div>

            {/* Messages for this date */}
            {dateMessages.map((message, index) => {
              const isOwn = message.sender_id === user.id;
              const showSender = !isOwn && chat.chat_type !== 'direct';
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                    {showSender && (
                      <p className="text-xs text-gray-500 mb-1 px-3">
                        {message.sender?.full_name || 'Unknown'}
                      </p>
                    )}
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        isOwn
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className={`flex items-center justify-end mt-1 space-x-1 ${
                        isOwn ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        <span className="text-xs">{formatTime(message.created_at)}</span>
                        {isOwn && (
                          <CheckIcon className="h-3 w-3" />
                        )}
                        {message.is_edited && (
                          <span className="text-xs italic">{t('chat.edited')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white">
        <form onSubmit={sendMessage} className="flex items-end space-x-3">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t('chat.typeMessage')}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={sending}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <PaperClipIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaceSmileIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;