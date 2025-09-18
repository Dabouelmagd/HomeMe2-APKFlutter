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
      const response = await axios.get(`${API}/messages/scheduled`);
      setScheduledMessages(response.data.messages || []);
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
        await axios.put(`${API}/messages/scheduled/${editingMessage.id}`, formData);
      } else {
        await axios.post(`${API}/messages/schedule`, formData);
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
    if (window.confirm('Are you sure you want to delete this scheduled message?')) {
      try {
        await axios.delete(`${API}/messages/scheduled/${messageId}`);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('schedule.title')}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {t('schedule.description')}
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            {t('schedule.scheduleMessage')}
          </button>
        </div>

        {/* Create/Edit Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-lg font-semibold mb-4">
                {editingMessage ? 'Edit Scheduled Message' : 'Schedule Message'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={formData.message_content}
                    onChange={(e) => setFormData({...formData, message_content: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Enter your message..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Type
                  </label>
                  <select
                    value={formData.recipient_type}
                    onChange={(e) => setFormData({...formData, recipient_type: e.target.value, recipient_id: ''})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="direct">Direct Message</option>
                    <option value="group">Group Message</option>
                    <option value="compound">Compound-wide Message</option>
                  </select>
                </div>

                {formData.recipient_type !== 'compound' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recipient
                    </label>
                    <select
                      value={formData.recipient_id}
                      onChange={(e) => setFormData({...formData, recipient_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select recipient...</option>
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
                    Scheduled For
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
                    Repeat
                  </label>
                  <select
                    value={formData.repeat_type}
                    onChange={(e) => setFormData({...formData, repeat_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">No Repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingMessage ? 'Update Message' : 'Schedule Message'}
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
              <p className="text-gray-500 text-lg">No scheduled messages</p>
              <p className="text-gray-400 text-sm">Schedule your first message to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Scheduled For
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
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
                              Repeats {message.repeat_type}
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