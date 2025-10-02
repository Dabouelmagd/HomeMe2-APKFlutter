import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import {
  ClockIcon,
  PlusIcon,
  CalendarIcon,
  UserIcon,
  UsersIcon,
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MessageScheduling = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    message_content: '',
    recipient_type: 'direct',
    recipient_id: '',
    scheduled_for: '',
    repeat_type: 'none'
  });
  const [editingMessage, setEditingMessage] = useState(null);

  useEffect(() => {
    loadScheduledMessages();
    loadUsers();
    loadChats();
  }, []);

  const loadScheduledMessages = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/scheduled-messages`);
      setScheduledMessages(response.data.scheduled_messages || []);
    } catch (error) {
      console.error('Failed to load scheduled messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadChats = async () => {
    try {
      const response = await axios.get(`${API}/chats`);
      setChats(response.data.chats || []);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMessage) {
        await axios.put(`${API}/scheduled-messages/${editingMessage.id}`, formData);
      } else {
        // For creating new scheduled messages, we need to use the chat-based endpoint
        // For now, let's create a direct API call that matches the backend structure
        const scheduleData = {
          content: formData.message_content,
          scheduled_for: new Date(formData.scheduled_for).toISOString(),
          recipient_type: formData.recipient_type,
          recipient_id: formData.recipient_id,
          repeat_type: formData.repeat_type
        };
        
        if (formData.recipient_type === 'compound') {
          // For compound-wide messages, we can use a general endpoint
          await axios.post(`${API}/scheduled-messages`, scheduleData);
        } else {
          // For direct/group messages, we need a chat_id
          // This requires creating or finding the appropriate chat first
          await axios.post(`${API}/scheduled-messages`, scheduleData);
        }
      }
      
      resetForm();
      await loadScheduledMessages();
    } catch (error) {
      console.error('Failed to save scheduled message:', error);
    }
  };

  const handleEdit = (message) => {
    setEditingMessage(message);
    setFormData({
      message_content: message.message_content,
      recipient_type: message.recipient_type,
      recipient_id: message.recipient_id,
      scheduled_for: new Date(message.scheduled_for).toISOString().slice(0, 16),
      repeat_type: message.repeat_type || 'none'
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (messageId) => {
    if (window.confirm(t('schedule.confirmDelete'))) {
      try {
        await axios.delete(`${API}/scheduled-messages/${messageId}`);
        await loadScheduledMessages();
      } catch (error) {
        console.error('Failed to delete scheduled message:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      message_content: '',
      recipient_type: 'direct',
      recipient_id: '',
      scheduled_for: '',
      repeat_type: 'none'
    });
    setEditingMessage(null);
    setShowCreateForm(false);
  };

  const getRecipientDisplay = (message) => {
    if (message.recipient_type === 'direct') {
      const user = users.find(u => u.id === message.recipient_id);
      return user ? user.full_name : 'Unknown User';
    } else if (message.recipient_type === 'group') {
      const chat = chats.find(c => c.id === message.recipient_id);
      return chat ? chat.name || 'Group Chat' : 'Unknown Group';
    } else if (message.recipient_type === 'compound') {
      return 'All Residents';
    }
    return 'Unknown';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'sent':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getRecipientIcon = (type) => {
    switch (type) {
      case 'direct': return <UserIcon className="h-5 w-5 text-blue-500" />;
      case 'group': return <UsersIcon className="h-5 w-5 text-green-500" />;
      case 'compound': return <BuildingOfficeIcon className="h-5 w-5 text-purple-500" />;
      default: return <UserIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getAvailableRecipients = () => {
    if (formData.recipient_type === 'direct') {
      return users.filter(u => u.id !== user.id);
    } else if (formData.recipient_type === 'group') {
      return chats.filter(c => c.type === 'group');
    }
    return [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600 mx-auto mb-6"></div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('common.loading')}</h3>
          <p className="text-gray-500">{t('schedule.loadingMessages')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Enhanced Header Section */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-green-600 to-emerald-600 p-4 rounded-2xl shadow-xl">
                <CalendarIcon className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
              {t('schedule.title')}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {t('schedule.description')}
            </p>
          </div>
          
          {/* Enhanced Action Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowCreateForm(true)}
              className="group bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-3 rtl:space-x-reverse"
            >
              <div className="bg-white/20 p-2 rounded-xl group-hover:bg-white/30 transition-colors">
                <PlusIcon className="h-6 w-6" />
              </div>
              <span className="text-lg">{t('schedule.scheduleMessage')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Create/Edit Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-lg font-semibold text-center mb-4">
                {editingMessage ? t('schedule.editMessage') : t('schedule.scheduleMessage')}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('schedule.message')}
                  </label>
                  <textarea
                    value={formData.message_content}
                    onChange={(e) => setFormData({...formData, message_content: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder={t('schedule.enterMessage')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('schedule.recipientType')}
                  </label>
                  <select
                    value={formData.recipient_type}
                    onChange={(e) => setFormData({...formData, recipient_type: e.target.value, recipient_id: ''})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="direct">{t('schedule.directMessage')}</option>
                    <option value="group">{t('schedule.groupMessage')}</option>
                    <option value="compound">{t('schedule.compoundMessage')}</option>
                  </select>
                </div>

                {formData.recipient_type !== 'compound' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('schedule.recipient')}
                    </label>
                    <select
                      value={formData.recipient_id}
                      onChange={(e) => setFormData({...formData, recipient_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">{t('schedule.selectRecipient')}</option>
                      {getAvailableRecipients().map((recipient) => (
                        <option key={recipient.id} value={recipient.id}>
                          {recipient.full_name || recipient.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('schedule.scheduledFor')}
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_for}
                    onChange={(e) => setFormData({...formData, scheduled_for: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min={new Date().toISOString().slice(0, 16)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('schedule.repeat')}
                  </label>
                  <select
                    value={formData.repeat_type}
                    onChange={(e) => setFormData({...formData, repeat_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">{t('schedule.noRepeat')}</option>
                    <option value="daily">{t('schedule.daily')}</option>
                    <option value="weekly">{t('schedule.weekly')}</option>
                    <option value="monthly">{t('schedule.monthly')}</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    {t('schedule.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingMessage ? t('schedule.updateMessage') : t('schedule.scheduleMessage')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Enhanced Scheduled Messages Section */}
        {scheduledMessages.length > 0 ? (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { label: t('schedule.totalScheduled'), count: scheduledMessages.length, color: 'blue', icon: CalendarIcon },
                { label: t('schedule.pending'), count: scheduledMessages.filter(m => m.status === 'pending').length, color: 'yellow', icon: ClockIcon },
                { label: t('schedule.sent'), count: scheduledMessages.filter(m => m.status === 'sent').length, color: 'green', icon: CheckCircleIcon },
                { label: t('schedule.failed'), count: scheduledMessages.filter(m => m.status === 'failed').length, color: 'red', icon: XCircleIcon }
              ].map((stat, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-center hover:shadow-xl transition-shadow duration-200">
                  <div className={`bg-gradient-to-br from-${stat.color}-100 to-${stat.color}-200 rounded-2xl p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center`}>
                    <stat.icon className={`h-8 w-8 text-${stat.color}-600`} />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stat.count}</div>
                  <div className="text-sm font-medium text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Messages Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {scheduledMessages.map((message) => (
                <div key={message.id} className="group bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300">
                  {/* Message Header */}
                  <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-xl">
                          {getRecipientIcon(message.recipient_type)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {getRecipientDisplay(message)}
                          </h3>
                          <p className="text-sm text-gray-500 capitalize">
                            {t(`schedule.${message.recipient_type}Message`)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <div className={`flex items-center space-x-2 rtl:space-x-reverse px-3 py-1 rounded-full text-xs font-bold ${
                        message.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        message.status === 'sent' ? 'bg-green-100 text-green-800' :
                        message.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {getStatusIcon(message.status)}
                        <span className="capitalize">{t(`schedule.${message.status}`)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="p-6">
                    <div className="mb-4">
                      <p className="text-gray-800 leading-relaxed line-clamp-3">
                        {message.message_content}
                      </p>
                    </div>

                    {/* Message Details */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-sm text-gray-600">
                        <CalendarIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 text-green-500" />
                        <span>{t('schedule.scheduledFor')}: {formatDateTime(message.scheduled_for)}</span>
                      </div>
                      
                      {message.repeat_type !== 'none' && (
                        <div className="flex items-center text-sm text-gray-600">
                          <ClockIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 text-blue-500" />
                          <span>{t('schedule.repeat')}: {t(`schedule.${message.repeat_type}`)}</span>
                        </div>
                      )}

                      <div className="text-xs text-gray-400 font-mono">
                        ID: {message.id.slice(0, 8)}...
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3 rtl:space-x-reverse">
                      <button
                        onClick={() => handleEdit(message)}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2 rtl:space-x-reverse"
                      >
                        <PencilIcon className="h-4 w-4" />
                        <span>{t('schedule.edit')}</span>
                      </button>
                      
                      <button
                        onClick={() => handleDelete(message.id)}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 py-2 px-4 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2 rtl:space-x-reverse"
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span>{t('schedule.delete')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden max-w-2xl mx-auto">
            {/* Empty State Header */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-8 text-center">
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <ClockIcon className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('schedule.noScheduledMessages')}</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                {t('schedule.scheduleFirstMessage')}
              </p>
            </div>
            
            {/* Empty State Action */}
            <div className="p-8 text-center">
              <button
                onClick={() => setShowCreateForm(true)}
                className="group bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-3 rtl:space-x-reverse mx-auto"
              >
                <div className="bg-white/20 p-2 rounded-xl group-hover:bg-white/30 transition-colors">
                  <PlusIcon className="h-5 w-5" />
                </div>
                <span>{t('schedule.scheduleFirstMessage')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageScheduling;