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

        {/* Scheduled Messages List */}
        <div className="bg-white rounded-lg shadow">
          {scheduledMessages.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg">{t('schedule.noScheduledMessages')}</p>
              <p className="text-gray-400 text-sm">{t('schedule.scheduleFirstMessage')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('schedule.message')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('schedule.recipient')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('schedule.scheduledFor')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('schedule.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('schedule.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {scheduledMessages.map((message) => (
                    <tr key={message.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-900 truncate">
                            {message.message_content}
                          </p>
                          {message.repeat_type !== 'none' && (
                            <p className="text-xs text-gray-500">
                              {t('schedule.repeats')} {message.repeat_type}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {getRecipientIcon(message.recipient_type)}
                          <span className="ml-2 text-sm text-gray-900">
                            {getRecipientDisplay(message)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDateTime(message.scheduled_for)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {getStatusIcon(message.status)}
                          <span className="ml-2 text-sm text-gray-900 capitalize">
                            {message.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {message.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleEdit(message)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(message.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageScheduling;