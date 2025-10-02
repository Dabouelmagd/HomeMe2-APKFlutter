import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">{t('common.loading')}</h3>
          <p className="text-gray-500">{t('loading_messages')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Enhanced Header Section */}
      <div className="bg-white shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-4 rounded-2xl shadow-xl">
                <ChatBubbleLeftEllipsisIcon className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              {t('message_center')}
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {user?.role === 'admin' 
                ? `${t('communicate_with').replace('{role}', t('residents'))}` 
                : `${t('communicate_with').replace('{role}', t('management'))}`}
            </p>
          </div>
          
          {/* Enhanced Action Button */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowNewMessage(true)}
              className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-3 rtl:space-x-reverse"
            >
              <div className="bg-white/20 p-2 rounded-xl group-hover:bg-white/30 transition-colors">
                <PlusIcon className="h-6 w-6" />
              </div>
              <span className="text-lg">{t('new_message')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Messages Section */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {messages.length > 0 ? (
          <div className="space-y-6">
            {/* Messages Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {messages.map((message) => (
                <div key={message.id} className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 overflow-hidden transform hover:-translate-y-2 transition-all duration-300">
                  {/* Message Header */}
                  <div className="bg-gradient-to-r from-gray-50 to-white p-6 border-b border-gray-100">
                    <div className="flex items-start space-x-4 rtl:space-x-reverse">
                      <div className="flex-shrink-0">
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-2xl shadow-lg">
                          {getMessageIcon(message.message_type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-xl font-bold text-gray-900 truncate">
                            {message.subject}
                          </h3>
                          <div className="flex flex-col space-y-2 ml-4 rtl:mr-4 rtl:ml-0">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getMessageTypeColor(message.message_type)}`}>
                              {t(message.message_type)}
                            </span>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(message.status)}`}>
                              {t(message.status)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Message Preview */}
                        <p className="text-gray-600 leading-relaxed line-clamp-3">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="p-6">
                    {/* Message Meta */}
                    <div className="flex items-center justify-between text-sm mb-4">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse text-gray-500">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span>{t('sent_on')} {new Date(message.created_at).toLocaleDateString('ar-EG')}</span>
                      </div>
                      <div className="text-xs text-gray-400 font-mono">
                        ID: {message.id.slice(0, 8)}...
                      </div>
                    </div>

                    {/* Responses Section */}
                    {message.responses && message.responses.length > 0 && (
                      <div className="border-t border-gray-100 pt-4">
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center space-x-2 rtl:space-x-reverse">
                          <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                          </svg>
                          <span>{t('responses')} ({message.responses.length})</span>
                        </h4>
                        <div className="space-y-3">
                          {message.responses.map((response, index) => (
                            <div key={index} className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-100">
                              <p className="text-gray-800 leading-relaxed mb-2">{response.content}</p>
                              <p className="text-xs text-gray-500 flex items-center space-x-1 rtl:space-x-reverse">
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                <span>{new Date(response.created_at).toLocaleString('ar-EG')}</span>
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <ChatBubbleLeftEllipsisIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">{t('no_messages_yet')}</h3>
            <p className="text-gray-600 mb-4">
              {t('start_conversation')} {user?.role === 'admin' 
                ? `${t('communicate_with').replace('{role}', t('residents'))}` 
                : `${t('communicate_with').replace('{role}', t('management'))}`}
            </p>
            <button
              onClick={() => setShowNewMessage(true)}
              className="btn btn-primary"
            >
              {t('send_first_message')}
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
                <h3 className="text-lg font-semibold text-center text-gray-900 text-center">{t('new_message')}</h3>
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
                    {t('message_type')}
                  </label>
                  <select
                    name="message_type"
                    value={messageForm.message_type}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  >
                    <option value="general">{t('general_message')}</option>
                    <option value="maintenance_request">{t('maintenance_request')}</option>
                    <option value="complaint">{t('complaint')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('subject')}
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={messageForm.subject}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                    placeholder={t('enter_message_subject')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('message')}
                  </label>
                  <textarea
                    name="content"
                    value={messageForm.content}
                    onChange={handleInputChange}
                    rows={5}
                    className="form-input"
                    required
                    placeholder={t('enter_message_here')}
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewMessage(false)}
                    className="btn btn-secondary flex-1"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1 flex items-center justify-center space-x-2"
                  >
                    <PaperAirplaneIcon className="h-4 w-4" />
                    <span>{t('send_message')}</span>
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