import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import VoiceRecorder from './VoiceRecorder';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import MessageSearch from './MessageSearch';
import {
  PaperAirplaneIcon,
  FaceSmileIcon,
  PaperClipIcon,
  EllipsisVerticalIcon,
  UserGroupIcon,
  InformationCircleIcon,
  PhotoIcon,
  VideoCameraIcon,
  DocumentIcon,
  SpeakerWaveIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  VideoCameraIcon,
  SpeakerWaveIcon,
  DocumentIcon,
  PlayIcon,
  PauseIcon,
  ArrowDownTrayIcon,
  MicrophoneIcon,
  MagnifyingGlassIcon
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
  const [uploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Common emojis for reactions
  const commonEmojis = ['❤️', '😍', '😂', '👍', '👎', '😮', '😢', '😡', '🎉', '🔥'];

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
    if ((!newMessage.trim() && selectedFiles.length === 0) || sending || !chat) return;

    setSending(true);
    try {
      if (selectedFiles.length > 0) {
        // Send files
        const formData = new FormData();
        selectedFiles.forEach(file => {
          formData.append('files', file);
        });
        formData.append('message_content', newMessage.trim());

        await axios.post(`${API}/chats/${chat.id}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        setSelectedFiles([]);
      } else {
        // Send text message
        await axios.post(`${API}/chats/${chat.id}/messages`, {
          content: newMessage.trim(),
          message_type: 'text'
        });
      }
      
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addReaction = async (messageId, emoji) => {
    try {
      await axios.post(`${API}/chats/${chat.id}/messages/${messageId}/react`, {
        emoji
      });
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleMessageSelect = (message) => {
    // Scroll to the selected message in the chat
    setShowMessageSearch(false);
    
    // Find the message in current messages and highlight it
    const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('bg-yellow-100', 'border-yellow-300');
      setTimeout(() => {
        messageElement.classList.remove('bg-yellow-100', 'border-yellow-300');
      }, 3000);
    } else {
      // Message is not in current view, we might need to load more messages
      // For now, just show an info message
      alert(t('search.messageNotInView'));
    }
  };

  const sendVoiceMessage = async (audioBlob, duration) => {
    if (!audioBlob || !chat) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('voice_file', audioBlob, 'voice_message.webm');
      formData.append('duration', duration.toString());

      await axios.post(`${API}/chats/${chat.id}/voice`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setShowVoiceRecorder(false);
    } catch (error) {
      console.error('Failed to send voice message:', error);
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = (fileUrl, filename) => {
    const link = document.createElement('a');
    link.href = `${BACKEND_URL}${fileUrl}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderAttachment = (attachment) => {
    const fileUrl = `${BACKEND_URL}${attachment.file_url}`;
    
    switch (attachment.file_type) {
      case 'image':
        return (
          <div className="relative max-w-sm">
            <img
              src={attachment.thumbnail_url ? `${BACKEND_URL}${attachment.thumbnail_url}` : fileUrl}
              alt={attachment.original_filename}
              className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(fileUrl, '_blank')}
            />
            <button
              onClick={() => downloadFile(attachment.file_url, attachment.original_filename)}
              className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>
          </div>
        );
      
      case 'video':
        return (
          <div className="relative max-w-sm">
            <video
              controls
              className="rounded-lg max-w-full"
              preload="metadata"
            >
              <source src={fileUrl} type={attachment.mime_type} />
              Your browser does not support the video tag.
            </video>
            <button
              onClick={() => downloadFile(attachment.file_url, attachment.original_filename)}
              className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>
          </div>
        );
      
      case 'audio':
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg max-w-sm">
            <SpeakerWaveIcon className="h-6 w-6 text-gray-500" />
            <div className="flex-1">
              <audio controls className="w-full">
                <source src={fileUrl} type={attachment.mime_type} />
                Your browser does not support the audio tag.
              </audio>
              <p className="text-xs text-gray-500 mt-1">{attachment.original_filename}</p>
            </div>
            <button
              onClick={() => downloadFile(attachment.file_url, attachment.original_filename)}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>
          </div>
        );
      
      case 'voice':
        return (
          <VoiceMessagePlayer
            audioUrl={fileUrl}
            duration={attachment.duration || 0}
            waveformData={attachment.waveform || []}
            isOwnMessage={false}
          />
        );
      
      default:
        return (
          <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg max-w-sm">
            <DocumentIcon className="h-6 w-6 text-gray-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{attachment.original_filename}</p>
              <p className="text-xs text-gray-500">
                {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={() => downloadFile(attachment.file_url, attachment.original_filename)}
              className="p-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>
          </div>
        );
    }
  };

  const renderReactions = (reactions, messageId) => {
    if (!reactions || Object.keys(reactions).length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(reactions).map(([emoji, userIds]) => (
          <button
            key={emoji}
            onClick={() => addReaction(messageId, emoji)}
            className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
              userIds.includes(user.id)
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{emoji}</span>
            <span>{userIds.length}</span>
          </button>
        ))}
      </div>
    );
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

  const getChatTypeLabel = () => {
    if (!chat) return '';
    
    if (chat.chat_type === 'direct') {
      return t('chat.directChat');
    } else if (chat.chat_type === 'group') {
      return t('chat.groupChat');
    } else if (chat.chat_type === 'compound_wide') {
      return t('chat.compoundChat');
    }
    
    return t('chat.groupChat');
  };

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center p-12">
          <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl p-12 mb-6 max-w-md">
            <ChatBubbleLeftRightIcon className="h-20 w-20 mx-auto mb-6 text-gray-400" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">{t('chat.welcomeToChats')}</h3>
            <p className="text-gray-500 leading-relaxed">{t('chat.selectChatToStart')}</p>
          </div>
          <div className="text-sm text-gray-400">
            {t('chat.chatFeatures')}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">{t('common.loading')}</p>
        </div>
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
      {/* Enhanced Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-white to-gray-50 border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            {/* Enhanced Avatar */}
            <div className="relative">
              {chat.chat_type === 'direct' ? (
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-lg font-bold text-white">
                    {getChatName().charAt(0).toUpperCase()}
                  </span>
                </div>
              ) : (
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <UsersIcon className="h-6 w-6 text-white" />
                </div>
              )}
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            
            {/* Chat Info */}
            <div>
              <h2 className="text-lg font-bold text-gray-900">{getChatName()}</h2>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-800">
                  {getChatTypeLabel()}
                </span>
                {chat.chat_type === 'group' && (
                  <span className="text-sm text-gray-500">
                    {getParticipantCount()} {t('chat.participants')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {/* Search Toggle */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-3 rounded-xl transition-all duration-200 hover:scale-105 ${
                showSearch 
                  ? 'bg-blue-500 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
            
            {/* More Options */}
            <button className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 hover:scale-105 text-gray-600">
              <EllipsisVerticalIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center">
                  <UserGroupIcon className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-center text-gray-900 text-center">{getChatName()}</h3>
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
          <button 
            onClick={() => setShowMessageSearch(true)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={t('search.searchInChat')}
          >
            <MagnifyingGlassIcon className="h-5 w-5" />
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
                  data-message-id={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} transition-colors duration-500`}
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
                      {/* Text content */}
                      {message.content && message.message_type !== 'voice' && (
                        <p className="text-sm mb-2">{message.content}</p>
                      )}
                      
                      {/* Voice message */}
                      {message.message_type === 'voice' && (
                        <div className="mb-2">
                          <VoiceMessagePlayer
                            audioUrl={message.attachments?.[0]?.file_url ? `${BACKEND_URL}${message.attachments[0].file_url}` : null}
                            duration={message.voice_duration || message.attachments?.[0]?.duration || 0}
                            waveformData={message.voice_waveform || message.attachments?.[0]?.waveform || []}
                            isOwnMessage={isOwn}
                          />
                        </div>
                      )}
                      
                      {/* Other attachments */}
                      {message.attachments && message.attachments.length > 0 && message.message_type !== 'voice' && (
                        <div className="space-y-2 mb-2">
                          {message.attachments.map((attachment, idx) => (
                            <div key={idx}>
                              {renderAttachment(attachment)}
                            </div>
                          ))}
                        </div>
                      )}
                      
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
                    
                    {/* Reactions */}
                    {renderReactions(message.reactions, message.id)}
                    
                    {/* Quick reaction buttons */}
                    {!isOwn && (
                      <div className="flex items-center space-x-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {commonEmojis.slice(0, 5).map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => addReaction(message.id, emoji)}
                            className="p-1 text-sm hover:bg-gray-100 rounded"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
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
        {/* Voice Recorder */}
        {showVoiceRecorder && (
          <div className="mb-4">
            <VoiceRecorder
              onSend={sendVoiceMessage}
              onCancel={() => setShowVoiceRecorder(false)}
              disabled={uploading}
            />
          </div>
        )}

        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && !showVoiceRecorder && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {t('chat.selectedFiles')} ({selectedFiles.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center space-x-2">
                    {file.type.startsWith('image/') && <PhotoIcon className="h-4 w-4 text-blue-500" />}
                    {file.type.startsWith('video/') && <VideoCameraIcon className="h-4 w-4 text-purple-500" />}
                    {file.type.startsWith('audio/') && <SpeakerWaveIcon className="h-4 w-4 text-green-500" />}
                    {!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/') && (
                      <DocumentIcon className="h-4 w-4 text-gray-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-48">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeSelectedFile(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Emoji Picker */}
        {showEmojiPicker && !showVoiceRecorder && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-8 gap-2">
              {[...commonEmojis, '🤔', '🙄', '😴', '🤗', '🤣', '😅', '😇', '🥰', '😘', '🤩', '😊', '☺️', '😌', '😉', '🤤', '😋'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    setNewMessage(prev => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="p-2 text-lg hover:bg-white rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {!showVoiceRecorder && (
          <form onSubmit={sendMessage} className="flex items-end space-x-3">
            <div className="flex-1">
              <div className="relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t('chat.typeMessage')}
                  className="w-full px-4 py-3 pr-32 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="1"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  disabled={sending || uploading}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e);
                    }
                  }}
                />
                <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={uploading}
                  >
                    <PaperClipIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVoiceRecorder(true)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    disabled={uploading}
                  >
                    <MicrophoneIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <FaceSmileIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={(!newMessage.trim() && selectedFiles.length === 0) || sending || uploading}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending || uploading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <PaperAirplaneIcon className="h-5 w-5" />
              )}
            </button>
          </form>
        )}
      </div>
      
      {/* Message Search Modal */}
      <MessageSearch
        isOpen={showMessageSearch}
        onClose={() => setShowMessageSearch(false)}
        onSelectMessage={handleMessageSelect}
      />
    </div>
  );
};

export default ChatWindow;