import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  UserIcon,
  UserGroupIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const NewChatModal = ({ isOpen, onClose, onChatCreated }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [chatType, setChatType] = useState('direct');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/compounds/${user.compound_id}/residents`);
      const users = response.data.residents || [];
      // Filter out current user
      setAvailableUsers(users.filter(u => u.id !== user.id));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = availableUsers.filter(user => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      user.full_name.toLowerCase().includes(searchLower) ||
      user.username.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  const toggleUserSelection = (selectedUser) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u.id === selectedUser.id);
      if (isSelected) {
        return prev.filter(u => u.id !== selectedUser.id);
      } else {
        // For direct chats, only allow one user
        if (chatType === 'direct') {
          return [selectedUser];
        }
        return [...prev, selectedUser];
      }
    });
  };

  const createChat = async () => {
    if (selectedUsers.length === 0) return;
    
    setCreating(true);
    try {
      const chatData = {
        chat_type: chatType,
        participant_ids: selectedUsers.map(u => u.id),
        name: chatType === 'group' ? groupName : undefined,
        description: chatType === 'group' ? groupDescription : undefined
      };

      const response = await axios.post(`${API}/chats`, chatData);
      
      if (onChatCreated) {
        onChatCreated(response.data.chat);
      }
      
      handleClose();
    } catch (error) {
      console.error('Failed to create chat:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setChatType('direct');
    setSearchTerm('');
    setSelectedUsers([]);
    setGroupName('');
    setGroupDescription('');
    onClose();
  };

  const canCreate = () => {
    if (selectedUsers.length === 0) return false;
    if (chatType === 'direct') return selectedUsers.length === 1;
    if (chatType === 'group') return selectedUsers.length >= 2 && groupName.trim();
    if (chatType === 'compound_wide') return user.role === 'admin';
    return false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-center text-gray-900 text-center">{t('chat.newChat')}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Chat Type Selection */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="space-y-3">
            <div
              onClick={() => setChatType('direct')}
              className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                chatType === 'direct' ? 'bg-blue-50 border-2 border-blue-200' : 'border-2 border-transparent hover:bg-gray-50'
              }`}
            >
              <UserIcon className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('chat.directChat')}</p>
                <p className="text-xs text-gray-500">{t('chat.directChatDescription')}</p>
              </div>
            </div>

            <div
              onClick={() => setChatType('group')}
              className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                chatType === 'group' ? 'bg-blue-50 border-2 border-blue-200' : 'border-2 border-transparent hover:bg-gray-50'
              }`}
            >
              <UserGroupIcon className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('chat.groupChat')}</p>
                <p className="text-xs text-gray-500">{t('chat.groupChatDescription')}</p>
              </div>
            </div>

            {user.role === 'admin' && (
              <div
                onClick={() => setChatType('compound_wide')}
                className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  chatType === 'compound_wide' ? 'bg-blue-50 border-2 border-blue-200' : 'border-2 border-transparent hover:bg-gray-50'
                }`}
              >
                <GlobeAltIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{t('chat.compoundChat')}</p>
                  <p className="text-xs text-gray-500">{t('chat.compoundChatDescription')}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Group Details (for group chats) */}
        {chatType === 'group' && (
          <div className="px-6 py-4 border-b border-gray-200 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('chat.groupName')} *
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={t('chat.enterGroupName')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('chat.groupDescription')}
              </label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder={t('chat.enterGroupDescription')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        )}

        {/* User Selection */}
        {chatType !== 'compound_wide' && (
          <>
            {/* Search */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('chat.searchUsers')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>{searchTerm ? t('chat.noUsersFound') : t('chat.noUsersAvailable')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((availableUser) => {
                    const isSelected = selectedUsers.find(u => u.id === availableUser.id);
                    
                    return (
                      <div
                        key={availableUser.id}
                        onClick={() => toggleUserSelection(availableUser)}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-xs font-medium text-white">
                              {availableUser.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {availableUser.full_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {availableUser.email} • Unit {availableUser.unit_number}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="flex-shrink-0">
                            <div className="h-5 w-5 bg-blue-600 rounded-full flex items-center justify-center">
                              <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Compound-wide chat message */}
        {chatType === 'compound_wide' && (
          <div className="px-6 py-8 text-center">
            <GlobeAltIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600">{t('chat.compoundChatInfo')}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={createChat}
            disabled={!canCreate() || creating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? t('common.creating') : t('chat.createChat')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;