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
  // Subscription codes state
  const [codes, setCodes] = useState([]);
  const [codeStats, setCodeStats] = useState({});
  const [showCreateCode, setShowCreateCode] = useState(false);
  const [newCode, setNewCode] = useState({ code_type: '3_months', plan: 'pro', max_uses: 1, custom_code: '', notes: '' });
  const [bulkCount, setBulkCount] = useState(10);
  // Subscription analytics
  const [subAnalytics, setSubAnalytics] = useState(null);

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

  const fetchCodes = async () => {
    try {
      const res = await axios.get(`${API}/subscription-codes`, getToken());
      setCodes(res.data.codes || []);
      setCodeStats(res.data.stats || {});
    } catch { /* ignore */ }
  };

  const handleCreateCode = async (isBulk = false) => {
    try {
      if (isBulk) {
        const res = await axios.post(`${API}/subscription-codes/bulk-create`, { ...newCode, count: bulkCount, max_uses_per_code: newCode.max_uses }, getToken());
        toast.success(res.data.message);
      } else {
        const payload = { ...newCode };
        if (!payload.custom_code) delete payload.custom_code;
        const res = await axios.post(`${API}/subscription-codes/create`, payload, getToken());
        toast.success(`${res.data.message}: ${res.data.code?.code}`);
      }
      setShowCreateCode(false);
      fetchCodes();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل في إنشاء الكود');
    }
  };

  const handleToggleCode = async (code) => {
    try {
      await axios.put(`${API}/subscription-codes/${code}/toggle`, {}, getToken());
      toast.success('تم تحديث حالة الكود');
      fetchCodes();
    } catch { toast.error('فشل'); }
  };

  const handleDeleteCode = async (code) => {
    if (!window.confirm('حذف هذا الكود نهائياً؟')) return;
    try {
      await axios.delete(`${API}/subscription-codes/${code}`, getToken());
      toast.success('تم الحذف');
      fetchCodes();
    } catch { toast.error('فشل'); }
  };

  useEffect(() => { if (activeTab === 'codes') fetchCodes(); }, [activeTab]);

  const fetchSubAnalytics = async () => {
    try {
      const res = await axios.get(`${API}/super-admin/subscription-analytics`, getToken());
      setSubAnalytics(res.data);
    } catch { /* ignore */ }
  };
  useEffect(() => { if (activeTab === 'analytics') fetchSubAnalytics(); }, [activeTab]);

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
            { id: 'codes', label: 'أكواد الاشتراك' },
            { id: 'analytics', label: 'تحليلات الاشتراكات' },
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

        {/* Codes Tab */}
        {activeTab === 'codes' && (
          <div data-testid="codes-tab">
            {/* Code Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {[
                { label: 'إجمالي الأكواد', value: codeStats.total || 0, color: 'text-blue-400' },
                { label: 'نشطة', value: codeStats.active || 0, color: 'text-green-400' },
                { label: 'مستخدمة', value: codeStats.used || 0, color: 'text-amber-400' },
                { label: 'معطلة', value: codeStats.disabled || 0, color: 'text-red-400' },
                { label: 'إجمالي التفعيلات', value: codeStats.total_activations || 0, color: 'text-purple-400' },
              ].map((s, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-6">
              <button onClick={() => setShowCreateCode(!showCreateCode)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500" data-testid="create-code-btn">
                + إنشاء كود جديد
              </button>
              <button onClick={fetchCodes} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">تحديث</button>
            </div>

            {/* Create Code Form */}
            {showCreateCode && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6" data-testid="create-code-form">
                <h3 className="text-lg font-bold mb-4">إنشاء كود اشتراك</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">الفترة</label>
                    <select value={newCode.code_type} onChange={e => setNewCode({...newCode, code_type: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                      <option value="trial">تجريبي (شهر)</option>
                      <option value="3_months">3 شهور</option>
                      <option value="6_months">6 شهور</option>
                      <option value="9_months">9 شهور</option>
                      <option value="12_months">سنة</option>
                      <option value="lifetime">مدى الحياة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">الخطة</label>
                    <select value={newCode.plan} onChange={e => setNewCode({...newCode, plan: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                      <option value="starter">مجاني</option>
                      <option value="basic">أساسي</option>
                      <option value="pro">احترافي</option>
                      <option value="premium">متقدم</option>
                      <option value="company_startup">شركة ناشئة</option>
                      <option value="company_business">شركة متوسطة</option>
                      <option value="company_enterprise">شركة كبرى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">عدد الاستخدامات</label>
                    <input type="number" min="1" max="1000" value={newCode.max_uses} onChange={e => setNewCode({...newCode, max_uses: parseInt(e.target.value) || 1})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">كود مخصص (اختياري)</label>
                    <input type="text" placeholder="مثل: VIP-2026" value={newCode.custom_code} onChange={e => setNewCode({...newCode, custom_code: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">ملاحظات</label>
                    <input type="text" placeholder="ملاحظات..." value={newCode.notes} onChange={e => setNewCode({...newCode, notes: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">عدد الأكواد (جملة)</label>
                    <input type="number" min="1" max="500" value={bulkCount} onChange={e => setBulkCount(parseInt(e.target.value) || 1)} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleCreateCode(false)} className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500">إنشاء كود واحد</button>
                  <button onClick={() => handleCreateCode(true)} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500">إنشاء {bulkCount} كود</button>
                  <button onClick={() => setShowCreateCode(false)} className="px-5 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">إلغاء</button>
                </div>
              </div>
            )}

            {/* Codes Table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">الكود</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">الفترة</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">الخطة</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">الاستخدام</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">الحالة</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {codes.map(c => {
                    const typeLabels = { trial: 'تجريبي', '3_months': '3 شهور', '6_months': '6 شهور', '9_months': '9 شهور', '12_months': 'سنة', '1_year': 'سنة', lifetime: 'مدى الحياة', duration: c.duration_months ? `${c.duration_months} شهر` : 'مخصص' };
                    const planLabels = { starter: 'مجاني', basic: 'أساسي', pro: 'احترافي', premium: 'متقدم', company_startup: 'شركة ناشئة', company_business: 'شركة متوسطة', company_enterprise: 'شركة كبرى' };
                    const isUsedUp = (c.times_used || 0) >= (c.max_uses || 1);
                    return (
                      <tr key={c.code} className="hover:bg-gray-750">
                        <td className="px-4 py-3 font-mono font-bold text-green-400">{c.code}</td>
                        <td className="px-4 py-3 text-gray-300">{typeLabels[c.type] || c.type}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-300">{planLabels[c.plan] || c.plan || '-'}</span></td>
                        <td className="px-4 py-3 text-center"><span className={isUsedUp ? 'text-red-400' : 'text-gray-300'}>{c.times_used || 0}/{c.max_uses || 1}</span></td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active && !isUsedUp ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {c.is_active && !isUsedUp ? 'نشط' : isUsedUp ? 'مستخدم' : 'معطل'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success('تم النسخ'); }} className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600" title="نسخ">نسخ</button>
                            <button onClick={() => handleToggleCode(c.code)} className={`px-2 py-1 text-xs rounded ${c.is_active ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30' : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'}`}>
                              {c.is_active ? 'تعطيل' : 'تفعيل'}
                            </button>
                            <button onClick={() => handleDeleteCode(c.code)} className="px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30">حذف</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {codes.length === 0 && (
                    <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">لا توجد أكواد بعد</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Analytics Tab */}
        {activeTab === 'analytics' && subAnalytics && (
          <div data-testid="analytics-tab">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'إجمالي المستخدمين', value: subAnalytics.total_users, color: 'text-blue-400' },
                { label: 'اشتراكات نشطة', value: subAnalytics.active_subscriptions, color: 'text-green-400' },
                { label: 'بدون اشتراك', value: subAnalytics.free_users, color: 'text-gray-400' },
                { label: 'تجريبي', value: subAnalytics.trial_users, color: 'text-amber-400' },
              ].map((s, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                  <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Revenue */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                <h3 className="font-bold text-lg text-white mb-3">الإيرادات الشهرية المتوقعة</h3>
                <p className="text-4xl font-black text-green-400">{(subAnalytics.monthly_revenue_estimate || 0).toLocaleString()} <span className="text-sm text-gray-400">ج.م</span></p>
                <p className="text-xs text-gray-500 mt-1">بناءً على الاشتراكات النشطة</p>
              </div>

              {/* By Plan */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                <h3 className="font-bold text-lg text-white mb-3">توزيع الخطط</h3>
                <div className="space-y-2">
                  {Object.entries(subAnalytics.by_plan || {}).map(([plan, count]) => {
                    const planLabels = { trial: 'تجريبي', basic: 'أساسي', pro: 'احترافي', premium: 'متقدم', company_startup: 'شركة ناشئة', company_business: 'شركة متوسطة', company_enterprise: 'شركة كبرى' };
                    const colors = { trial: 'bg-gray-500', basic: 'bg-sky-500', pro: 'bg-blue-500', premium: 'bg-violet-500', company_startup: 'bg-amber-500', company_business: 'bg-orange-500', company_enterprise: 'bg-red-500' };
                    const total = subAnalytics.active_subscriptions || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={plan} className="flex items-center gap-3">
                        <span className="text-xs text-gray-300 w-24">{planLabels[plan] || plan}</span>
                        <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
                          <div className={`h-full rounded-full ${colors[plan] || 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-12 text-left">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Expiring Soon */}
            {subAnalytics.expiring_soon?.length > 0 && (
              <div className="bg-gray-800 rounded-xl border border-amber-500/30 p-5">
                <h3 className="font-bold text-lg text-amber-400 mb-3">اشتراكات تنتهي قريباً (30 يوم)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-right py-2 px-3">المستخدم</th>
                        <th className="text-right py-2 px-3">الخطة</th>
                        <th className="text-center py-2 px-3">أيام متبقية</th>
                        <th className="text-center py-2 px-3">تاريخ الانتهاء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subAnalytics.expiring_soon.map((u, i) => (
                        <tr key={i} className="border-b border-gray-700/50">
                          <td className="py-2 px-3 text-white">{u.full_name || u.username}</td>
                          <td className="py-2 px-3 text-gray-300">{u.plan}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.days_left <= 7 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {u.days_left} يوم
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center text-gray-400">{u.end_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'analytics' && !subAnalytics && (
          <div className="text-center py-10 text-gray-500">جاري التحميل...</div>
        )}

      </div>
    </div>
  );
};

export default SuperAdminPanel;
