import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import {
  ClockIcon,
  CalendarIcon,
  ChatBubbleLeftEllipsisIcon,
  TrashIcon,
  PencilIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MessageScheduling = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [formData, setFormData] = useState({
    chat_id: '',
    content: '',
    scheduled_for: '',
    timezone: 'UTC',
    is_recurring: false,
    recurrence_pattern: 'daily'
  });

  useEffect(() => {
    loadScheduledMessages();
    loadChats();
  }, []);

  const loadScheduledMessages = async () => {
    try {
      const response = await axios.get(`${API}/scheduled-messages`);
      setScheduledMessages(response.data.scheduled_messages || []);
    } catch (error) {
      console.error('Failed to load scheduled messages:', error);
    } finally {
      setLoading(false);
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

  const scheduleMessage = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/chats/${formData.chat_id}/schedule`, {
        content: formData.content,
        scheduled_for: new Date(formData.scheduled_for).toISOString(),
        timezone: formData.timezone,
        is_recurring: formData.is_recurring,
        recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : undefined
      });
      
      setShowScheduleForm(false);
      setFormData({
        chat_id: '',
        content: '',
        scheduled_for: '',
        timezone: 'UTC',
        is_recurring: false,
        recurrence_pattern: 'daily'
      });
      loadScheduledMessages();
    } catch (error) {
      console.error('Failed to schedule message:', error);
    }
  };

  const cancelMessage = async (messageId) => {
    try {
      await axios.delete(`${API}/scheduled-messages/${messageId}`);
      loadScheduledMessages();
    } catch (error) {
      console.error('Failed to cancel message:', error);
    }
  };

  const getChatName = (chat) => {
    if (chat.name) return chat.name;
    if (chat.chat_type === 'direct') {
      const otherParticipant = chat.participant_details?.find(p => p.id !== user.id);
      return otherParticipant?.full_name || 'Direct Chat';
    }
    return chat.chat_type === 'compound_wide' ? 'Compound Chat' : 'Group Chat';
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Message Scheduling</h1>
            <p className="mt-1 text-sm text-gray-600">Schedule messages to be sent automatically</p>
          </div>
          <button
            onClick={() => setShowScheduleForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Schedule Message
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduledMessages.length === 0 ? (
              <div className="text-center py-12">
                <ClockIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 text-lg">No scheduled messages</p>
                <p className="text-gray-400 text-sm">Schedule messages to be sent later</p>
              </div>
            ) : (
              scheduledMessages.map((message, index) => (
                <div key={index} className="bg-white rounded-lg shadow border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                          {message.status}
                        </span>
                        {message.is_recurring && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                            {message.recurrence_pattern}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        To: {message.chat?.name || getChatName(message.chat)}
                      </h3>
                      
                      <p className="text-sm text-gray-700 mb-2">{message.content}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="h-3 w-3" />
                          <span>Scheduled: {formatDateTime(message.scheduled_for)}</span>
                        </div>
                        {message.sent_at && (
                          <div className="flex items-center space-x-1">
                            <span>Sent: {formatDateTime(message.sent_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {message.status === 'pending' && (
                        <>
                          <button
                            onClick={() => cancelMessage(message.id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Schedule Message Modal */}
        {showScheduleForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Schedule Message</h3>
              </div>
              
              <form onSubmit={scheduleMessage} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chat</label>
                  <select
                    value={formData.chat_id}
                    onChange={(e) => setFormData({...formData, chat_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a chat</option>
                    {chats.map(chat => (
                      <option key={chat.id} value={chat.id}>{getChatName(chat)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    placeholder="Enter your message..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_for}
                    onChange={(e) => setFormData({...formData, scheduled_for: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min={new Date().toISOString().slice(0, 16)}
                    required
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({...formData, is_recurring: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="recurring" className="text-sm text-gray-700">Repeat message</label>
                </div>

                {formData.is_recurring && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Every</label>
                    <select
                      value={formData.recurrence_pattern}
                      onChange={(e) => setFormData({...formData, recurrence_pattern: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowScheduleForm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Schedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageScheduling;