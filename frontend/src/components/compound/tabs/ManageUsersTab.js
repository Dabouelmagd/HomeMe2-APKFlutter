import React from 'react';
import { useTranslation } from 'react-i18next';
import { UserGroupIcon } from '@heroicons/react/24/outline';

const ManageUsersTab = ({ allUsers, currentUserId, onToggleStatus, onDelete }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6" data-testid="manage-users-tab">
      <div className="bg-gradient-to-br from-white via-purple-50 to-indigo-50 rounded-2xl shadow-lg border border-purple-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-center text-gray-900 text-center">{t('cm_user_mgmt', 'إدارة المستخدمين')}</h3>
            <p className="text-gray-600">{t('cm_user_mgmt_desc', 'عرض وإدارة جميع المستخدمين في مجمعك')}</p>
          </div>
          <div className="text-sm text-gray-600">
            Total Users: <span className="font-semibold text-center">{allUsers.length}</span>
          </div>
        </div>

        {allUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allUsers.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {userItem.profile_picture_url ? (
                            <img
                              src={userItem.profile_picture_url}
                              alt={userItem.full_name}
                              className="h-10 w-10 rounded-full object-cover border-2 border-gray-200"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                              <span className="text-sm font-medium text-white">{userItem.full_name?.charAt(0) || 'U'}</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{userItem.full_name}</div>
                          <div className="text-sm text-gray-500">@{userItem.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          userItem.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {userItem.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{userItem.email}</div>
                      <div className="text-sm text-gray-500">{userItem.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          userItem.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {userItem.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onToggleStatus(userItem.id, userItem.is_active)}
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            userItem.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {userItem.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        {userItem.id !== currentUserId && (
                          <button
                            onClick={() => onDelete(userItem.id)}
                            className="px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-100 to-indigo-200 flex items-center justify-center mx-auto mb-4">
              <UserGroupIcon className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-medium text-center text-center text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-600">Users will appear here once they register in your compound.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageUsersTab;
