import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { toast } from 'sonner';
import {
  ChatBubbleLeftEllipsisIcon,
  PlusIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MessageCenter = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [messageForm, setMessageForm] = useState({
    message_type: 'general',
    subject: '',
    content: ''
  });

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/messages`);
      setMessages(response.data);
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API}/messages`, messageForm);
      toast.success('Message sent successfully!');
      setShowNewMessage(false);
      setMessageForm({
        message_type: 'general',
        subject: '',
        content: ''
      });
      fetchMessages();
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleInputChange = (e) => {
    setMessageForm({
      ...messageForm,
      [e.target.name]: e.target.value
    });
  };

  const getMessageIcon = (type) => {
    switch (type) {
      case 'maintenance_request':
        return <WrenchScrewdriverIcon className="h-8 w-8 text-yellow-500" />;
      case 'complaint':
        return <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />;
      default:
        return <ChatBubbleBottomCenterTextIcon className="h-8 w-8 text-blue-500" />;
    }
  };

  const getMessageTypeColor = (type) => {
    switch (type) {
      case 'maintenance_request':
        return 'bg-yellow-100 text-yellow-800';
      case 'complaint':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Message Center</h1>
            <p className="text-gray-600 mt-2">
              Communicate with {user?.role === 'admin' ? 'residents' : 'management'}
            </p>
          </div>
          <button
            onClick={() => setShowNewMessage(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>New Message</span>
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-6">
        {messages.length > 0 ? (
          messages.map((message) => (
            <div key={message.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {getMessageIcon(message.message_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {message.subject}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMessageTypeColor(message.message_type)}`}>
                        {message.message_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(message.status)}`}>
                        {message.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-4">
                    {message.content}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                      Sent on {new Date(message.created_at).toLocaleString()}
                    </span>
                    <span>
                      ID: {message.id.slice(0, 8)}...
                    </span>
                  </div>

                  {/* Responses */}
                  {message.responses && message.responses.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-2">Responses:</h4>
                      <div className="space-y-2">
                        {message.responses.map((response, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm text-gray-800">{response.content}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(response.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <ChatBubbleLeftEllipsisIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
            <p className="text-gray-600 mb-4">
              Start a conversation with {user?.role === 'admin' ? 'residents' : 'management'}
            </p>
            <button
              onClick={() => setShowNewMessage(true)}
              className="btn btn-primary"
            >
              Send Your First Message
            </button>
          </div>
        )}
      </div>

      {/* New Message Modal */}
      {showNewMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-90vh overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">New Message</h3>
                <button
                  onClick={() => setShowNewMessage(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Type
                  </label>
                  <select
                    name="message_type"
                    value={messageForm.message_type}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  >
                    <option value="general">General Message</option>
                    <option value="maintenance_request">Maintenance Request</option>
                    <option value="complaint">Complaint</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={messageForm.subject}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                    placeholder="Enter message subject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message
                  </label>
                  <textarea
                    name="content"
                    value={messageForm.content}
                    onChange={handleInputChange}
                    rows={5}
                    className="form-input"
                    required
                    placeholder="Enter your message here..."
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewMessage(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1 flex items-center justify-center space-x-2"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                    <span>Send Message</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageCenter;