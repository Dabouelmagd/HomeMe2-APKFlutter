import React from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const UsersTab = ({
  t,
  roleLabels,
  roleColors,
  compounds,
  roleFilter,
  setRoleFilter,
  compoundFilter,
  setCompoundFilter,
  filteredUsers,
  setUsers,
  setEditUser,
  handleChangeRole,
  fetchDashboard,
}) => {
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="role-filter">
          <option value="">{t('sa_all_roles', 'كل الأدوار')}</option>
          {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={compoundFilter} onChange={e => setCompoundFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
          <option value="">{t('sa_all_compounds', 'كل المجتمعات')}</option>
          {compounds.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-sm text-gray-400 self-center">{filteredUsers.length} {t('sp_user', 'مستخدم')}</span>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">{t('sp_name', 'الاسم')}</th>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">{t('sa_user', 'المستخدم')}</th>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">{t('sp_email', 'البريد')}</th>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">{t('sa_role', 'الدور')}</th>
              <th className="px-4 py-3 text-right text-gray-400 font-medium">{t('sa_change_role', 'تغيير الدور')}</th>
              <th className="px-4 py-3 text-center text-gray-400 font-medium">{t('sa_actions', 'إجراءات')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-gray-750" data-testid={`user-row-${u.id}`}>
                <td className="px-4 py-3 font-medium">{u.full_name}</td>
                <td className="px-4 py-3 text-gray-400">{u.username}</td>
                <td className="px-4 py-3 text-gray-400">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[u.role] || 'bg-gray-600'}`}>
                    {roleLabels[u.role] || u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={e => handleChangeRole(u.id, e.target.value)}
                    className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                    data-testid={`role-select-${u.id}`}
                  >
                    {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-center">
                    <button onClick={() => setEditUser(u)} className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30">{t('sa_edit', 'تعديل')}</button>
                    <button onClick={async () => {
                      if (!window.confirm(t('sa_confirm_delete_user', `هل أنت متأكد من حذف ${u.full_name || u.username}؟`))) return;
                      try {
                        await axios.delete(`${API}/admin/users/${u.id}`, getToken());
                        toast.success(t('sa_user_deleted', 'تم حذف المستخدم'));
                        setUsers(prev => prev.filter(x => x.id !== u.id));
                        fetchDashboard();
                      } catch (err) {
                        console.error('Delete user error:', err);
                        toast.error(err?.response?.data?.detail || t('sa_failed', 'فشل'));
                      }
                    }} className="px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30" data-testid={`delete-user-btn-${u.id}`}>{t('sa_delete', 'حذف')}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersTab;
