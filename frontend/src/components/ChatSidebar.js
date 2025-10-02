import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import {
  ChatBubbleLeftEllipsisIcon,
  ChatBubbleLeftEllipsisSolidIcon,
  UsersIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { ChatBubbleLeftEllipsisIcon as ChatBubbleLeftEllipsisSolidIcon } from '@heroicons/react/24/solid';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ChatSidebar = ({ selectedChat, onChatSelect, onNewChat }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      const response = await axios.get(`${API}/chats`);
      setChats(response.data.chats || []);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const chatName = getChatName(chat);
    return chatName.toLowerCase().includes(searchLower);
  });

  const getChatName = (chat) => {
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

  const getChatDescription = (chat) => {
    if (chat.last_message) {
      const isOwnMessage = chat.last_message.sender_id === user.id;
      const senderName = isOwnMessage ? t('chat.you') : 
        (chat.last_message.sender?.full_name || 'Unknown');
      return `${senderName}: ${chat.last_message.content}`;
    }
    
    if (chat.chat_type === 'direct') {
      return t('chat.directChatDescription');
    }
    
    return `${chat.participants?.length || 0} ${t('chat.participants')}`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return t('chat.yesterday');
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="w-80 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Enhanced Header */}
      <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="bg-white/20 p-2 rounded-lg">
              <ChatBubbleLeftEllipsisSolidIcon className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold">{t('chat.chats')}</h2>
          </div>
          <button
            onClick={onNewChat}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 hover:scale-105"
            title={t('chat.newChat')}
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* Enhanced Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/70" />
          <input
            type="text"
            placeholder={t('chat.searchChats')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 rtl:pr-12 rtl:pl-4 pr-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/70 focus:bg-white/30 focus:border-white/50 focus:outline-none transition-all duration-200"
          />
        </div>
      </div>

      {/* Chat List with Enhanced Design */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center">
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8 mb-4">
              <ChatBubbleLeftEllipsisIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 text-lg font-medium mb-2">
                {searchTerm ? t('chat.noChatsFound') : t('chat.noChatsYet')}
              </p>
              <p className="text-gray-500 text-sm">
                {searchTerm ? t('chat.tryDifferentSearch') : t('chat.startFirstChat')}
              </p>
            </div>
            {!searchTerm && (
              <button
                onClick={onNewChat}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                {t('chat.createFirstChat')}
              </button>
            )}
          </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onChatSelect(chat)}
                className={`mx-2 p-4 cursor-pointer rounded-2xl transition-all duration-200 hover:shadow-lg transform hover:-translate-y-1 ${
                  selectedChat?.id === chat.id 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl' 
                    : 'bg-white hover:bg-gray-50 shadow-sm border border-gray-100'
                }`}
              >
                <div className="flex items-start space-x-4 rtl:space-x-reverse">
                  {/* Enhanced Avatar */}
                  <div className="flex-shrink-0 relative">
                    {chat.chat_type === 'direct' ? (
                      <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg ${
                        selectedChat?.id === chat.id ? 'ring-4 ring-white/50' : ''
                      }`}>
                        <span className="text-sm font-bold text-white">
                          {getChatName(chat).charAt(0).toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center shadow-lg ${
                        selectedChat?.id === chat.id ? 'ring-4 ring-white/50' : ''
                      }`}>
                        <UsersIcon className="h-6 w-6 text-white" />
                      </div>
                    )}
                    {/* Online indicator */}
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`text-sm font-semibold truncate ${
                        selectedChat?.id === chat.id ? 'text-white' : 'text-gray-900'
                      }`}>
                        {getChatName(chat)}
                      </h3>
                      {chat.last_message_at && (
                        <span className={`text-xs flex-shrink-0 ml-2 rtl:mr-2 rtl:ml-0 ${
                          selectedChat?.id === chat.id ? 'text-white/80' : 'text-gray-500'
                        }`}>
                          {formatTime(chat.last_message_at)}
                        </span>
                      )}
                    </div>

                    {/* Enhanced Message Preview */}
                    <div className="flex items-center justify-between">
                      <p className={`text-xs truncate ${
                        selectedChat?.id === chat.id ? 'text-white/90' : 'text-gray-600'
                      }`}>
                        {chat.last_message_content || t('chat.noMessages')}
                      </p>
                      
                      {/* Unread indicator */}
                      {chat.unread_count > 0 && (
                        <div className={`flex-shrink-0 ml-2 rtl:mr-2 rtl:ml-0 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          selectedChat?.id === chat.id 
                            ? 'bg-white text-purple-600' 
                            : 'bg-red-500 text-white'
                        }`}>
                          {chat.unread_count > 9 ? '9+' : chat.unread_count}
                        </div>
                      )}
                    </div>

                    {/* Chat type indicator */}
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                        selectedChat?.id === chat.id 
                          ? 'bg-white/20 text-white' 
                          : chat.chat_type === 'group' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                      }`}>
                        {chat.chat_type === 'direct' ? t('chat.directChat') : 
                         chat.chat_type === 'group' ? t('chat.groupChat') : 
                         t('chat.compoundChat')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
                        <UsersIcon className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getChatName(chat)}
                      </p>
                      <div className="flex items-center space-x-2">
                        {chat.last_message?.created_at && (
                          <span className="text-xs text-gray-500">
                            {formatTime(chat.last_message.created_at)}
                          </span>
                        )}
                        {chat.unread_count > 0 && (
                          <span className="inline-flex items-center justify-center h-5 w-5 text-xs font-medium text-white bg-red-500 rounded-full">
                            {chat.unread_count > 99 ? '99+' : chat.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {getChatDescription(chat)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;