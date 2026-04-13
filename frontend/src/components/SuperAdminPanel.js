import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  BuildingOfficeIcon,
  UsersIcon,
  BanknotesIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const roleLabels = {
  super_admin: 'مالك التطبيق',
  company_admin: 'إدارة شركة',
  admin: 'مدير مجتمع',
  manager: 'إداري',
  security: 'أمن',
  resident: 'مقيم'
};

const roleColors = {
  super_admin: 'bg-purple-100 text-purple-700',
  company_admin: 'bg-indigo-100 text-indigo-700',
  admin: 'bg-blue-100 text-blue-700',
  manager: 'bg-emerald-100 text-emerald-700',
  security: 'bg-amber-100 text-amber-700',
  resident: 'bg-gray-100 text-gray-600'
};

const SuperAdminPanel = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [roleFilter, setRoleFilter] = useState('');
  const [compoundFilter, setCompoundFilter] = useState('');

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dash, usersRes] = await Promise.all([
        axios.get(`${API}/super-admin/dashboard`, getToken()),
        axios.get(`${API}/super-admin/users`, getToken())
      ]);
      setData(dash.data);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      console.error(err);
      toast.error('فشل في تحميل لوحة التحكم');
    } finally { setLoading(false); }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await axios.put(`${API}/super-admin/users/${userId}/role?role=${newRole}`, {}, getToken());
      toast.success('تم تغيير الدور بنجاح');
      fetchDashboard();
    } catch (err) {
      toast.error('فشل في تغيير الدور');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>;
  }

  const stats = data?.stats || {};
  const compounds = data?.compounds || [];

  const filteredUsers = users.filter(u => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (compoundFilter && u.compound_id !== compoundFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white" data-testid="super-admin-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-600">
              <ShieldCheckIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('super_admin_panel', 'لوحة تحكم المالك')}</h1>
              <p className="text-sm text-gray-400">{t('full_system_control', 'تحكم كامل في النظام')}</p>
            </div>
          </div>
          <button onClick={fetchDashboard} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700">
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8" data-testid="super-stats">
          {[
            { label: 'المجتمعات', value: stats.total_compounds, color: 'from-purple-500 to-indigo-600', icon: BuildingOfficeIcon },
            { label: 'المستخدمين', value: stats.total_users, color: 'from-blue-500 to-cyan-600', icon: UsersIcon },
            { label: 'المقيمين', value: stats.total_residents, color: 'from-emerald-500 to-green-600', icon: UserGroupIcon },
            { label: 'المدراء', value: stats.total_admins, color: 'from-amber-500 to-orange-600', icon: ShieldCheckIcon },
            { label: 'الإيرادات', value: (stats.total_revenue || 0).toLocaleString(), color: 'from-green-500 to-emerald-600', icon: BanknotesIcon },
            { label: 'المصروفات', value: (stats.total_expenses || 0).toLocaleString(), color: 'from-red-500 to-pink-600', icon: BanknotesIcon },
            { label: 'صافي', value: (stats.net_balance || 0).toLocaleString(), color: 'from-indigo-500 to-purple-600', icon: GlobeAltIcon },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <Icon className="h-5 w-5 text-gray-400 mb-2" />
                <p className="text-xl font-bold">{s.value || 0}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'overview', label: 'المجتمعات' },
            { id: 'users', label: 'المستخدمين' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium ${activeTab === tab.id ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              data-testid={`tab-${tab.id}`}>{tab.label}</button>
          ))}
        </div>

        {/* Compounds Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {compounds.map(c => (
              <div key={c.id} className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-purple-500 transition-colors" data-testid={`compound-${c.id}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-600/20"><BuildingOfficeIcon className="h-5 w-5 text-purple-400" /></div>
                  <h3 className="font-bold text-lg">{c.name}</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-900 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-blue-400">{c.users}</p>
                    <p className="text-xs text-gray-500">مستخدم</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-emerald-400">{c.families}</p>
                    <p className="text-xs text-gray-500">عائلة</p>
                  </div>
                </div>
              </div>
            ))}
            {compounds.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-500">لا توجد مجتمعات سكنية</div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="flex gap-2 mb-4">
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" data-testid="role-filter">
                <option value="">كل الأدوار</option>
                {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={compoundFilter} onChange={e => setCompoundFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">كل المجتمعات</option>
                {compounds.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <span className="text-sm text-gray-400 self-center">{filteredUsers.length} مستخدم</span>
            </div>
            
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">الاسم</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">المستخدم</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">البريد</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">الدور</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">تغيير الدور</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminPanel;
