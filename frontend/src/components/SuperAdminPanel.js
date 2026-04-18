import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  UserGroupIcon,
  LanguageIcon
} from '@heroicons/react/24/outline';
import TranslationManager from './TranslationManager';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const SuperAdminPanel = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const activeRole = user?.active_role || user?.role || '';
  const isSuperAdminOnly = activeRole === 'super_admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';

  const roleLabels = {
    super_admin: t('role_super_admin', 'مالك التطبيق'),
    company_admin: t('role_company_admin', 'إدارة شركة'),
    admin: t('role_admin', 'مدير مجتمع'),
    manager: t('role_manager', 'إداري'),
    security: t('role_security', 'أمن'),
    resident: t('role_resident', 'مقيم')
  };

  const roleColors = {
    super_admin: 'bg-purple-100 text-purple-700',
    company_admin: 'bg-indigo-100 text-indigo-700',
    admin: 'bg-blue-100 text-blue-700',
    manager: 'bg-emerald-100 text-emerald-700',
    security: 'bg-amber-100 text-amber-700',
    resident: 'bg-gray-100 text-gray-600'
  };

  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
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
  // Coupons
  const [coupons, setCoupons] = useState([]);
  const [couponStats, setCouponStats] = useState({});
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_type: 'percentage', discount_value: 20, max_uses: 100, notes: '' });
  // Ads
  const [ads, setAds] = useState([]);
  const [adStats, setAdStats] = useState({});
  const [adSettings, setAdSettings] = useState({});
  const [showCreateAd, setShowCreateAd] = useState(false);
  const [newAd, setNewAd] = useState({ title: '', image_url: '', link_url: '', description: '', position: 'banner', dimensions: '', ad_value: 0, is_gift: false, start_date: '', end_date: '', target_compounds: [] });
  // Referrals
  const [refStats, setRefStats] = useState(null);
  // Edit modals
  const [editCode, setEditCode] = useState(null);
  const [editCoupon, setEditCoupon] = useState(null);
  const [editUser, setEditUser] = useState(null);
  // User subscriptions
  const [userSubs, setUserSubs] = useState([]);
  const [userSubStats, setUserSubStats] = useState({});
  const [userSubSearch, setUserSubSearch] = useState('');
  const [userSubFilter, setUserSubFilter] = useState('');
  const [userSubAction, setUserSubAction] = useState(null);

  useEffect(() => { fetchDashboard(); }, []);

  // Sync tab with URL
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

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
      toast.error(t('sa_load_failed', 'فشل في تحميل لوحة التحكم'));
    } finally { setLoading(false); }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await axios.put(`${API}/super-admin/users/${userId}/role?role=${newRole}`, {}, getToken());
      toast.success(t('sa_role_changed', 'تم تغيير الدور بنجاح'));
      fetchDashboard();
    } catch (err) {
      toast.error(t('sa_role_change_failed', 'فشل في تغيير الدور'));
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
      toast.error(err.response?.data?.detail || t('sa_code_create_failed', 'فشل في إنشاء الكود'));
    }
  };

  const handleToggleCode = async (code) => {
    try {
      await axios.put(`${API}/subscription-codes/${code}/toggle`, {}, getToken());
      toast.success(t('sp_code_updated', 'تم تحديث حالة الكود'));
      fetchCodes();
    } catch { toast.error(t('sa_failed', 'فشل')); }
  };

  const handleDeleteCode = async (code) => {
    if (!window.confirm(t('sp_confirm_delete', 'حذف هذا الكود نهائياً؟'))) return;
    try {
      await axios.delete(`${API}/subscription-codes/${code}`, getToken());
      toast.success(t('sa_deleted', 'تم الحذف'));
      fetchCodes();
    } catch { toast.error(t('sa_failed', 'فشل')); }
  };

  useEffect(() => { if (activeTab === 'codes') fetchCodes(); }, [activeTab]);

  const fetchSubAnalytics = async () => {
    try {
      const res = await axios.get(`${API}/super-admin/subscription-analytics`, getToken());
      setSubAnalytics(res.data);
    } catch { /* ignore */ }
  };
  useEffect(() => { if (activeTab === 'analytics') fetchSubAnalytics(); }, [activeTab]);

  const fetchCoupons = async () => {
    try {
      const res = await axios.get(`${API}/coupons`, getToken());
      setCoupons(res.data.coupons || []);
      setCouponStats(res.data.stats || {});
    } catch { /* */ }
  };
  const handleCreateCoupon = async () => {
    try {
      await axios.post(`${API}/coupons`, newCoupon, getToken());
      toast.success(t('sa_coupon_created', 'تم إنشاء الكوبون'));
      setShowCreateCoupon(false);
      setNewCoupon({ code: '', discount_type: 'percentage', discount_value: 20, max_uses: 100, notes: '' });
      fetchCoupons();
    } catch (err) { toast.error(err.response?.data?.detail || t('sa_failed', 'فشل')); }
  };
  const handleToggleCoupon = async (id) => {
    try { await axios.put(`${API}/coupons/${id}/toggle`, {}, getToken()); toast.success(t('sa_updated', 'تم التحديث')); fetchCoupons(); } catch { toast.error(t('sa_failed', 'فشل')); }
  };
  const handleDeleteCoupon = async (id) => {
    if (!window.confirm(t('sa_confirm_delete_coupon', 'حذف الكوبون؟'))) return;
    try { await axios.delete(`${API}/coupons/${id}`, getToken()); toast.success(t('sa_deleted', 'تم الحذف')); fetchCoupons(); } catch { toast.error(t('sa_failed', 'فشل')); }
  };
  useEffect(() => { if (activeTab === 'coupons') fetchCoupons(); }, [activeTab]);

  // Ads
  const fetchAds = async () => {
    try {
      const [adsRes, settingsRes] = await Promise.all([
        axios.get(`${API}/ads`, getToken()),
        axios.get(`${API}/ads/ad-settings`, getToken()).catch(() => ({ data: {} })),
      ]);
      setAds(adsRes.data.ads || []);
      setAdStats(adsRes.data.stats || {});
      setAdSettings(settingsRes.data || {});
    } catch { /* */ }
  };
  const handleCreateAd = async () => {
    try {
      await axios.post(`${API}/ads`, newAd, getToken());
      toast.success(t('sa_ad_created', 'تم إنشاء الإعلان'));
      setShowCreateAd(false);
      setNewAd({ title: '', image_url: '', link_url: '', description: '', position: 'banner', dimensions: '', ad_value: 0, is_gift: false, start_date: '', end_date: '', target_compounds: [] });
      fetchAds();
    } catch (err) { toast.error(err.response?.data?.detail || t('sa_failed', 'فشل')); }
  };
  const handleToggleAd = async (id) => {
    try { await axios.put(`${API}/ads/${id}/toggle`, {}, getToken()); toast.success(t('sa_updated', 'تم التحديث')); fetchAds(); } catch { toast.error(t('sa_failed', 'فشل')); }
  };
  const handleDeleteAd = async (id) => {
    if (!window.confirm(t('sa_confirm_delete_ad', 'حذف الإعلان؟'))) return;
    try { await axios.delete(`${API}/ads/${id}`, getToken()); toast.success(t('sa_deleted', 'تم الحذف')); fetchAds(); } catch { toast.error(t('sa_failed', 'فشل')); }
  };
  useEffect(() => { if (activeTab === 'ads') fetchAds(); }, [activeTab]);

  // Referrals
  const fetchRefStats = async () => {
    try { const res = await axios.get(`${API}/referral/stats`, getToken()); setRefStats(res.data); } catch { /* */ }
  };
  useEffect(() => { if (activeTab === 'referrals') fetchRefStats(); }, [activeTab]);

  // Edit code/coupon
  const handleEditCode = async () => {
    if (!editCode) return;
    try {
      await axios.put(`${API}/subscription-codes/${editCode.code}`, editCode, getToken());
      toast.success(t('sa_updated', 'تم التحديث'));
      setEditCode(null);
      fetchCodes();
    } catch { toast.error(t('sa_failed', 'فشل')); }
  };
  const handleEditCoupon = async () => {
    if (!editCoupon) return;
    try {
      await axios.put(`${API}/coupons/${editCoupon.id}`, editCoupon, getToken());
      toast.success(t('sa_updated', 'تم التحديث'));
      setEditCoupon(null);
      fetchCoupons();
    } catch { toast.error(t('sa_failed', 'فشل')); }
  };

  // User Subscriptions
  const fetchUserSubs = async () => {
    try {
      const res = await axios.get(`${API}/owner/user-subscriptions`, {
        ...getToken(), params: { search: userSubSearch, status: userSubFilter, per_page: 50 }
      });
      setUserSubs(res.data.users || []);
      setUserSubStats(res.data.stats || {});
    } catch { /* */ }
  };
  const handleUserSubAction = async (userId, action, extra = {}) => {
    try {
      const res = await axios.put(`${API}/owner/user-subscriptions/${userId}`, { action, ...extra }, getToken());
      toast.success(res.data.message);
      setUserSubAction(null);
      fetchUserSubs();
    } catch (err) { toast.error(err.response?.data?.detail || t('sa_failed', 'فشل')); }
  };
  useEffect(() => { if (activeTab === 'user_subs') fetchUserSubs(); }, [activeTab, userSubSearch, userSubFilter]);

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
              <h1 className="text-2xl font-bold">{t('app_owner_panel', 'لوحة تحكم مالك التطبيق')}</h1>
              <p className="text-sm text-gray-400">{t('full_system_control', 'تحكم كامل في التطبيق وجميع المشتركين')}</p>
            </div>
          </div>
          <button onClick={fetchDashboard} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700">
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8" data-testid="super-stats">
          {[
            { label: t('sa_compounds', 'المجتمعات'), value: stats.total_compounds, color: 'from-purple-500 to-indigo-600', icon: BuildingOfficeIcon },
            { label: t('sa_users', 'المستخدمين'), value: stats.total_users, color: 'from-blue-500 to-cyan-600', icon: UsersIcon },
            { label: t('sa_residents', 'المقيمين'), value: stats.total_residents, color: 'from-emerald-500 to-green-600', icon: UserGroupIcon },
            { label: t('sa_admins', 'المدراء'), value: stats.total_admins, color: 'from-amber-500 to-orange-600', icon: ShieldCheckIcon },
            ...(!isSuperAdminOnly ? [
              { label: t('sa_revenue', 'الإيرادات'), value: (stats.total_revenue || 0).toLocaleString(), color: 'from-green-500 to-emerald-600', icon: BanknotesIcon },
              { label: t('sa_expenses', 'المصروفات'), value: (stats.total_expenses || 0).toLocaleString(), color: 'from-red-500 to-pink-600', icon: BanknotesIcon },
              { label: t('sa_net', 'صافي'), value: (stats.net_balance || 0).toLocaleString(), color: 'from-indigo-500 to-purple-600', icon: GlobeAltIcon },
            ] : []),
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
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'overview', label: t('sa_compounds') },
            { id: 'users', label: t('sa_users') },
            ...(!isSuperAdminOnly ? [
              { id: 'codes', label: t('sa_sub_codes', 'أكواد الاشتراك') },
              { id: 'coupons', label: t('sa_coupons', 'كوبونات الخصم') },
              { id: 'user_subs', label: t('sa_user_subs', 'اشتراكات المستخدمين') },
            ] : []),
            { id: 'ads', label: t('sa_ads_management', 'إدارة الإعلانات') },
            ...(!isSuperAdminOnly ? [
              { id: 'referrals', label: t('sa_referrals', 'الإحالات') },
              { id: 'analytics', label: t('sa_analytics', 'تحليلات الاشتراكات') },
            ] : []),
            { id: 'translations', label: t('sa_translations', 'إدارة الترجمات') },
          ].map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
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
                    <p className="text-xs text-gray-500">{t('sa_used', 'مستخدم')}</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold text-emerald-400">{c.families}</p>
                    <p className="text-xs text-gray-500">{t("sp_family", "عائلة")}</p>
                  </div>
                </div>
              </div>
            ))}
            {compounds.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-500">{t("sp_no_compounds", "لا توجد مجتمعات سكنية")}</div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
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
                              fetchUsers();
                            } catch { toast.error(t('sa_failed', 'فشل')); }
                          }} className="px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30">{t('sa_delete', 'حذف')}</button>
                        </div>
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
                { label: t('sa_total_codes', 'إجمالي الأكواد'), value: codeStats.total || 0, color: 'text-blue-400' },
                { label: t('sa_active_count', 'نشطة'), value: codeStats.active || 0, color: 'text-green-400' },
                { label: t('sa_used_count', 'مستخدمة'), value: codeStats.used || 0, color: 'text-amber-400' },
                { label: t('sa_disabled_count', 'معطلة'), value: codeStats.disabled || 0, color: 'text-red-400' },
                { label: t('sa_total_activations', 'إجمالي التفعيلات'), value: codeStats.total_activations || 0, color: 'text-purple-400' },
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
              <button onClick={fetchCodes} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">{t('sp_refresh', 'تحديث')}</button>
            </div>

            {/* Create Code Form */}
            {showCreateCode && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6" data-testid="create-code-form">
                <h3 className="text-lg font-bold mb-4">{t('sp_create_sub_code', 'إنشاء كود اشتراك')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sp_period', 'الفترة')}</label>
                    <select value={newCode.code_type} onChange={e => setNewCode({...newCode, code_type: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                      <option value="trial">{t('sp_trial', 'تجريبي (شهر)')}</option>
                      <option value="3_months">{t('sp_3m', '3 شهور')}</option>
                      <option value="6_months">{t('sp_6m', '6 شهور')}</option>
                      <option value="9_months">{t('sp_9m', '9 شهور')}</option>
                      <option value="12_months">{t('sp_year', 'سنة')}</option>
                      <option value="lifetime">{t('sp_lifetime', 'مدى الحياة')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_plan', 'الخطة')}</label>
                    <select value={newCode.plan} onChange={e => setNewCode({...newCode, plan: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                      <option value="starter">{t('sp_free', 'مجاني')}</option>
                      <option value="basic">{t('sp_basic', 'أساسي')}</option>
                      <option value="pro">{t('sp_pro', 'احترافي')}</option>
                      <option value="premium">{t('sp_premium', 'متقدم')}</option>
                      <option value="company_startup">{t('sp_co_startup', 'شركة ناشئة')}</option>
                      <option value="company_business">{t('sp_co_business', 'شركة متوسطة')}</option>
                      <option value="company_enterprise">{t('sp_co_enterprise', 'شركة كبرى')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sp_max_uses', 'عدد الاستخدامات')}</label>
                    <input type="number" min="1" max="1000" value={newCode.max_uses} onChange={e => setNewCode({...newCode, max_uses: parseInt(e.target.value) || 1})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_custom_code', 'كود مخصص (اختياري)')}</label>
                    <input type="text" placeholder={t("sp_code_example", "مثل: VIP-2026")} value={newCode.custom_code} onChange={e => setNewCode({...newCode, custom_code: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_notes', 'ملاحظات')}</label>
                    <input type="text" placeholder={t("sp_notes", "ملاحظات...")} value={newCode.notes} onChange={e => setNewCode({...newCode, notes: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sp_bulk_count', 'عدد الأكواد (جملة)')}</label>
                    <input type="number" min="1" max="500" value={bulkCount} onChange={e => setBulkCount(parseInt(e.target.value) || 1)} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleCreateCode(false)} className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500">{t('sp_create_one', 'إنشاء كود واحد')}</button>
                  <button onClick={() => handleCreateCode(true)} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500">{t('sp_create_bulk', 'إنشاء')} {bulkCount} {t('sp_code_word', 'كود')}</button>
                  <button onClick={() => setShowCreateCode(false)} className="px-5 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-600">{t('sa_cancel', 'إلغاء')}</button>
                </div>
              </div>
            )}

            {/* Codes Table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">{t('sa_code', 'الكود')}</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">{t('sp_period', 'الفترة')}</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">{t('sa_plan', 'الخطة')}</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">{t('sp_usage', 'الاستخدام')}</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">{t('sa_status', 'الحالة')}</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">{t('sa_actions', 'إجراءات')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {codes.map(c => {
                    const typeLabels = { trial: t('sp_trial','تجريبي'), '3_months': t('sp_3m','3 شهور'), '6_months': t('sp_6m','6 شهور'), '9_months': t('sp_9m','9 شهور'), '12_months': t('sp_year','سنة'), '1_year': t('sp_year','سنة'), lifetime: t('sp_lifetime','مدى الحياة'), duration: c.duration_months ? `${c.duration_months} ${t('sp_month','شهر')}` : t('sp_custom','مخصص') };
                    const planLabels = { starter: t('sp_free','مجاني'), basic: t('sp_basic','أساسي'), pro: t('sp_pro','احترافي'), premium: t('sp_premium','متقدم'), company_startup: t('sp_co_startup','شركة ناشئة'), company_business: t('sp_co_business','شركة متوسطة'), company_enterprise: t('sp_co_enterprise','شركة كبرى') };
                    const isUsedUp = (c.times_used || 0) >= (c.max_uses || 1);
                    return (
                      <tr key={c.code} className="hover:bg-gray-750">
                        <td className="px-4 py-3 font-mono font-bold text-green-400">{c.code}</td>
                        <td className="px-4 py-3 text-gray-300">{typeLabels[c.type] || c.type}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-300">{planLabels[c.plan] || c.plan || '-'}</span></td>
                        <td className="px-4 py-3 text-center"><span className={isUsedUp ? 'text-red-400' : 'text-gray-300'}>{c.times_used || 0}/{c.max_uses || 1}</span></td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active && !isUsedUp ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {c.is_active && !isUsedUp ? t('sp_active','نشط') : isUsedUp ? t('sp_used','مستخدم') : t('sp_disabled','معطل')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => setEditCode({...c})} className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30">{t('sa_edit', 'تعديل')}</button>
                            <button onClick={() => handleToggleCode(c.code)} className={`px-2 py-1 text-xs rounded ${c.is_active ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30' : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'}`}>
                              {c.is_active ? t('sp_deactivate','تعطيل') : t('sp_activate','تفعيل')}
                            </button>
                            <button onClick={() => handleDeleteCode(c.code)} className="px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30">{t('sa_delete', 'حذف')}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {codes.length === 0 && (
                    <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">{t('sa_no_codes', 'لا توجد أكواد بعد')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Coupons Tab */}
        {activeTab === 'coupons' && (
          <div data-testid="coupons-tab">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: t('sa_total_coupons', 'إجمالي الكوبونات'), value: couponStats.total || 0, color: 'text-blue-400' },
                { label: t('sa_active_count', 'نشطة'), value: couponStats.active || 0, color: 'text-green-400' },
                { label: t('sa_total_uses', 'إجمالي الاستخدامات'), value: couponStats.total_uses || 0, color: 'text-purple-400' },
              ].map((s, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            <button onClick={() => setShowCreateCoupon(!showCreateCoupon)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500 mb-6" data-testid="create-coupon-btn">
              + إنشاء كوبون جديد
            </button>

            {showCreateCoupon && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
                <h3 className="text-lg font-bold mb-4">{t('sa_create_coupon', 'إنشاء كوبون خصم')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_coupon_code', 'كود الكوبون')}</label>
                    <input type="text" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value})} placeholder={t("sp_coupon_example", "مثل: WELCOME20")} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_discount_type', 'نوع الخصم')}</label>
                    <select value={newCoupon.discount_type} onChange={e => setNewCoupon({...newCoupon, discount_type: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                      <option value="percentage">{t('sp_percentage', 'نسبة مئوية')} %</option>
                      <option value="fixed">{t('sp_fixed', 'مبلغ ثابت')} ({t('sp_egp', 'ج.م')})</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sp_discount_value', 'قيمة الخصم')} {newCoupon.discount_type === 'percentage' ? '%' : t('sp_egp', 'ج.م')}</label>
                    <input type="number" min="1" value={newCoupon.discount_value} onChange={e => setNewCoupon({...newCoupon, discount_value: parseFloat(e.target.value) || 0})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_max_usage', 'الحد الأقصى للاستخدام')}</label>
                    <input type="number" min="1" value={newCoupon.max_uses} onChange={e => setNewCoupon({...newCoupon, max_uses: parseInt(e.target.value) || 1})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_notes', 'ملاحظات')}</label>
                    <input type="text" value={newCoupon.notes} onChange={e => setNewCoupon({...newCoupon, notes: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" placeholder={t("sp_notes", "ملاحظات...")} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleCreateCoupon} disabled={!newCoupon.code.trim()} className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500 disabled:opacity-50">{t('sa_create_coupon_btn', 'إنشاء الكوبون')}</button>
                  <button onClick={() => setShowCreateCoupon(false)} className="px-5 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">{t('sa_cancel', 'إلغاء')}</button>
                </div>
              </div>
            )}

            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-right text-gray-400">{t('sp_coupon', 'الكوبون')}</th>
                    <th className="px-4 py-3 text-right text-gray-400">{t('sp_discount', 'الخصم')}</th>
                    <th className="px-4 py-3 text-center text-gray-400">{t('sp_usage', 'الاستخدام')}</th>
                    <th className="px-4 py-3 text-center text-gray-400">{t('sa_status', 'الحالة')}</th>
                    <th className="px-4 py-3 text-center text-gray-400">{t('sa_actions', 'إجراءات')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {coupons.map(c => (
                    <tr key={c.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3 font-mono font-bold text-amber-400">{c.code}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {c.discount_type === 'percentage' ? `${c.discount_value}%` : `${c.discount_value} ${t('sp_egp', 'ج.م')}`}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">{c.times_used || 0}/{c.max_uses}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {c.is_active ? t('sp_active','نشط') : t('sp_disabled','معطل')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success(t('sp_copied','تم النسخ')); }} className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">{t('sp_copy','نسخ')}</button>
                          <button onClick={() => setEditCoupon({...c})} className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30">{t('sa_edit', 'تعديل')}</button>
                          <button onClick={() => handleToggleCoupon(c.id)} className={`px-2 py-1 text-xs rounded ${c.is_active ? 'bg-amber-600/20 text-amber-400' : 'bg-green-600/20 text-green-400'}`}>
                            {c.is_active ? t('sp_deactivate','تعطيل') : t('sp_activate','تفعيل')}
                          </button>
                          <button onClick={() => handleDeleteCoupon(c.id)} className="px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded">{t('sa_delete', 'حذف')}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {coupons.length === 0 && (
                    <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">{t('sa_no_coupons', 'لا توجد كوبونات بعد')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ads Tab */}
        {activeTab === 'ads' && (
          <div data-testid="ads-tab">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              {[
                { label: t('sa_total_ads', 'إجمالي الإعلانات'), value: adStats.total || 0, color: 'text-blue-400' },
                { label: t('sa_active_count', 'نشطة'), value: adStats.active || 0, color: 'text-green-400' },
                { label: t('sa_total_clicks', 'إجمالي النقرات'), value: adStats.total_clicks || 0, color: 'text-amber-400' },
                { label: t('sa_total_views', 'إجمالي المشاهدات'), value: adStats.total_views || 0, color: 'text-purple-400' },
                ...(!isSuperAdminOnly ? [{ label: t('ad_total_revenue', 'إيرادات الإعلانات'), value: `${(adStats.total_revenue || 0).toLocaleString()} ${t('sm_egp','ج.م')}`, color: 'text-emerald-400' }] : []),
                { label: t('ad_gift_count', 'إعلانات هدية'), value: adStats.gift_ads || 0, color: 'text-pink-400' },
              ].map((s, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Hybrid Ad Control Panel */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{t('ad_hybrid_control', 'تحكم في الإعلانات (داخلي + AdSense)')}</h3>
                <button onClick={async () => {
                  try {
                    const res = await axios.get(`${API}/ads/ad-settings`, getToken());
                    const s = res.data;
                    await axios.put(`${API}/ads/ad-settings`, { adsense_global_enabled: !s.adsense_global_enabled }, getToken());
                    toast.success(!s.adsense_global_enabled ? t('ad_adsense_on', 'AdSense مفعّل') : t('ad_adsense_off', 'AdSense متوقف'));
                  } catch { toast.error(t('sa_failed', 'فشل')); }
                }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500" data-testid="toggle-adsense-global">
                  {t('ad_toggle_adsense', 'تبديل AdSense')}
                </button>
              </div>
              <p className="text-xs text-gray-400 mb-4">{t('ad_hybrid_desc', 'الإعلانات الداخلية تظهر أولاً. لو مفيش إعلان داخلي، يظهر AdSense تلقائياً (لو مفعّل).')}</p>

              {/* Ad Slots Overview */}
              {(() => {
                const ALL_POSITIONS = [
                  { key: 'homepage_hero', label: t('pos_homepage_hero', 'الصفحة الرئيسية - هيرو'), desc: t('pos_desc_homepage_hero', 'بانر كبير أعلى الصفحة الرئيسية للويب'), color: 'border-rose-500/30', icon: '🏠', maxSlots: 3 },
                  { key: 'homepage_mid', label: t('pos_homepage_mid', 'الصفحة الرئيسية - وسط'), desc: t('pos_desc_homepage_mid', 'إعلان وسط محتوى الصفحة الرئيسية'), color: 'border-rose-400/30', icon: '📄', maxSlots: 2 },
                  { key: 'homepage_footer', label: t('pos_homepage_footer', 'الصفحة الرئيسية - أسفل'), desc: t('pos_desc_homepage_footer', 'بانر أسفل الصفحة الرئيسية'), color: 'border-rose-300/30', icon: '⬇️', maxSlots: 2 },
                  { key: 'banner', label: t('sa_pos_banner', 'بانر أعلى التطبيق'), desc: t('ad_desc_banner', 'أعلى صفحات التطبيق الداخلية'), color: 'border-amber-500/30', icon: '📢', maxSlots: 5 },
                  { key: 'sidebar', label: t('sa_pos_sidebar', 'الشريط الجانبي'), desc: t('ad_desc_sidebar', 'القائمة الجانبية للتطبيق'), color: 'border-indigo-500/30', icon: '📌', maxSlots: 3 },
                  { key: 'dashboard', label: t('sa_pos_dashboard', 'لوحة تحكم المقيمين'), desc: t('ad_desc_dashboard', 'داخل داشبورد المقيمين'), color: 'border-emerald-500/30', icon: '📊', maxSlots: 2 },
                  { key: 'inline', label: t('sa_pos_inline', 'داخل المحتوى'), desc: t('ad_desc_inline', 'بين أقسام المحتوى'), color: 'border-purple-500/30', icon: '📰', maxSlots: 4 },
                  { key: 'login_page', label: t('pos_login', 'صفحة تسجيل الدخول'), desc: t('pos_desc_login', 'إعلان في صفحة الدخول'), color: 'border-sky-500/30', icon: '🔑', maxSlots: 2 },
                  { key: 'popup', label: t('pos_popup', 'إعلان منبثق (Popup)'), desc: t('pos_desc_popup', 'نافذة منبثقة عند فتح التطبيق'), color: 'border-orange-500/30', icon: '💬', maxSlots: 1 },
                  { key: 'notification', label: t('pos_notification', 'إعلان إشعارات'), desc: t('pos_desc_notification', 'داخل قائمة الإشعارات'), color: 'border-pink-500/30', icon: '🔔', maxSlots: 2 },
                  { key: 'splash', label: t('pos_splash', 'شاشة التحميل'), desc: t('pos_desc_splash', 'أثناء تحميل التطبيق'), color: 'border-cyan-500/30', icon: '⏳', maxSlots: 1 },
                  { key: 'services_page', label: t('pos_services', 'صفحة الخدمات'), desc: t('pos_desc_services', 'داخل صفحة الخدمات والعروض'), color: 'border-teal-500/30', icon: '⭐', maxSlots: 3 },
                ];

                // Count booked ads per position
                const bookedByPos = {};
                (ads || []).forEach(a => {
                  const p = a.position || 'unknown';
                  bookedByPos[p] = (bookedByPos[p] || 0) + 1;
                });

                const totalSlots = ALL_POSITIONS.reduce((s, p) => s + p.maxSlots, 0);
                const totalBooked = Object.values(bookedByPos).reduce((s, v) => s + v, 0);

                return (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-700">
                        <p className="text-2xl font-black text-blue-400">{totalSlots}</p>
                        <p className="text-[10px] text-gray-500">{t('ad_total_slots', 'إجمالي الأماكن المتاحة')}</p>
                      </div>
                      <div className="bg-gray-900 rounded-xl p-4 text-center border border-green-800">
                        <p className="text-2xl font-black text-green-400">{totalBooked}</p>
                        <p className="text-[10px] text-gray-500">{t('ad_booked_slots', 'أماكن محجوزة')}</p>
                      </div>
                      <div className="bg-gray-900 rounded-xl p-4 text-center border border-amber-800">
                        <p className="text-2xl font-black text-amber-400">{totalSlots - totalBooked}</p>
                        <p className="text-[10px] text-gray-500">{t('ad_available_slots', 'أماكن متاحة')}</p>
                      </div>
                    </div>

                    {/* Position Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {ALL_POSITIONS.map(pos => {
                        const booked = bookedByPos[pos.key] || 0;
                        const available = pos.maxSlots - booked;
                        const pct = Math.round((booked / pos.maxSlots) * 100);
                        return (
                          <div key={pos.key} className={`bg-gray-900 rounded-xl p-4 border ${pos.color} hover:bg-gray-800/80 transition-colors`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{pos.icon}</span>
                              <h4 className="font-bold text-white text-xs">{pos.label}</h4>
                            </div>
                            <p className="text-[9px] text-gray-500 mb-3 leading-relaxed">{pos.desc}</p>
                            {/* Progress bar */}
                            <div className="bg-gray-800 rounded-full h-2 mb-2">
                              <div className={`h-2 rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-green-400">{available > 0 ? `${available} ${t('ad_available', 'متاح')}` : t('ad_full', 'مكتمل')}</span>
                              <span className="text-gray-500">{booked}/{pos.maxSlots}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={adSettings?.positions?.[pos.key]?.internal_enabled !== false} onChange={(e) => {
                                  setAdSettings(prev => ({...prev, positions: {...(prev.positions || {}), [pos.key]: {...(prev.positions?.[pos.key] || {}), internal_enabled: e.target.checked}}}));
                                }} id={`internal-${pos.key}`} className="w-3 h-3 rounded border-gray-600 bg-gray-800 text-green-500 focus:ring-green-500" />
                                <span className="text-[9px] text-gray-400">{t('ad_internal', 'داخلي')}</span>
                              </label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input type="checkbox" checked={adSettings?.positions?.[pos.key]?.adsense_enabled !== false && !['dashboard','sidebar','popup','splash','notification'].includes(pos.key) || adSettings?.positions?.[pos.key]?.adsense_enabled === true} onChange={(e) => {
                                  setAdSettings(prev => ({...prev, positions: {...(prev.positions || {}), [pos.key]: {...(prev.positions?.[pos.key] || {}), adsense_enabled: e.target.checked}}}));
                                }} id={`adsense-${pos.key}`} className="w-3 h-3 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500" />
                                <span className="text-[9px] text-gray-400">AdSense</span>
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
              <button onClick={async () => {
                try {
                  const positions = adSettings.positions || {};
                  await axios.put(`${API}/ads/ad-settings`, { positions }, getToken());
                  toast.success(t('ad_settings_saved', 'تم حفظ الإعدادات'));
                } catch { toast.error(t('sa_failed', 'فشل')); }
              }} className="mt-4 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500 transition-all w-full">
                {t('save_changes', 'حفظ التغييرات')}
              </button>
            </div>

            <button onClick={() => { setShowCreateAd(!showCreateAd); if (!showCreateAd) setTimeout(() => document.getElementById('create-ad-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500 mb-3" data-testid="create-ad-btn">
              + {t('sa_create_ad_btn', 'إنشاء إعلان جديد')}
            </button>

            {/* Create Ad Form - RIGHT after button */}
            {showCreateAd && (
              <div id="create-ad-section" className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
                <h3 className="text-lg font-bold mb-4">{t('sa_create_ad', 'إنشاء إعلان داخلي')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_ad_title', 'عنوان الإعلان')}</label>
                    <input type="text" value={newAd.title} onChange={e => setNewAd({...newAd, title: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" placeholder={t("sp_ad_title", "عنوان الإعلان")} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_position', 'الموقع')}</label>
                    <select value={newAd.position} onChange={e => setNewAd({...newAd, position: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                      <optgroup label={t('pos_group_website', '--- الموقع الإلكتروني ---')}>
                        <option value="homepage_hero">{t('pos_homepage_hero', 'الصفحة الرئيسية - هيرو')}</option>
                        <option value="homepage_mid">{t('pos_homepage_mid', 'الصفحة الرئيسية - وسط')}</option>
                        <option value="homepage_footer">{t('pos_homepage_footer', 'الصفحة الرئيسية - أسفل')}</option>
                        <option value="login_page">{t('pos_login', 'صفحة تسجيل الدخول')}</option>
                      </optgroup>
                      <optgroup label={t('pos_group_app', '--- التطبيق ---')}>
                        <option value="banner">{t('sa_pos_banner', 'بانر أعلى التطبيق')}</option>
                        <option value="sidebar">{t('sa_pos_sidebar', 'الشريط الجانبي')}</option>
                        <option value="inline">{t('sa_pos_inline', 'داخل المحتوى')}</option>
                        <option value="dashboard">{t('sa_pos_dashboard', 'لوحة تحكم المقيمين')}</option>
                        <option value="services_page">{t('pos_services', 'صفحة الخدمات')}</option>
                      </optgroup>
                      <optgroup label={t('pos_group_special', '--- أنواع خاصة ---')}>
                        <option value="popup">{t('pos_popup', 'إعلان منبثق (Popup)')}</option>
                        <option value="notification">{t('pos_notification', 'إعلان إشعارات')}</option>
                        <option value="splash">{t('pos_splash', 'شاشة التحميل')}</option>
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_link_url', 'رابط الإعلان')}</label>
                    <input type="text" value={newAd.link_url} onChange={e => setNewAd({...newAd, link_url: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" placeholder="https://..." />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_upload_media', 'رفع صورة أو فيديو')}</label>
                    <input type="file" accept="image/*,video/mp4,video/webm" onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await axios.post(`${API}/ads/upload`, formData, { headers: { ...getToken().headers, 'Content-Type': 'multipart/form-data' } });
                        setNewAd({ ...newAd, image_url: res.data.url, media_type: file.type.startsWith('video') ? 'video' : 'image' });
                        toast.success(t('sa_uploaded', 'تم الرفع'));
                      } catch { toast.error(t('sa_upload_failed', 'فشل الرفع')); }
                    }} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-green-600 file:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_description', 'الوصف')}</label>
                    <input type="text" value={newAd.description || ''} onChange={e => setNewAd({...newAd, description: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" placeholder={t('sa_ad_desc_placeholder', 'وصف مختصر للإعلان')} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_ad_value', 'القيمة (ج.م)')}</label>
                    <input type="number" value={newAd.ad_value} onChange={e => setNewAd({...newAd, ad_value: parseFloat(e.target.value) || 0})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_start_date', 'تاريخ البداية')}</label>
                    <input type="date" value={newAd.start_date || ''} onChange={e => setNewAd({...newAd, start_date: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_end_date', 'تاريخ النهاية')}</label>
                    <input type="date" value={newAd.end_date || ''} onChange={e => setNewAd({...newAd, end_date: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                  <div className="flex items-end gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newAd.is_gift || false} onChange={e => setNewAd({...newAd, is_gift: e.target.checked})} className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-pink-500" />
                      <span className="text-xs text-gray-300">{t('sa_gift', 'هدية')}</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleCreateAd} className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500">{t('sa_create', 'إنشاء')}</button>
                  <button onClick={() => setShowCreateAd(false)} className="px-5 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">{t('sa_cancel', 'إلغاء')}</button>
                </div>
              </div>
            )}

            {/* Ad Placement Guide */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">{t('ad_placement_guide', 'دليل أماكن الإعلانات ومقاساتها')}</h3>
              
              {/* ===== SECTION 1: WEBSITE (Landing Page) ===== */}
              <h4 className="text-sm font-bold text-rose-400 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                {t('ad_section_website', 'الموقع الإلكتروني (Landing Page)')}
              </h4>
              <div className="bg-gray-900 rounded-xl p-4 mb-4 border border-gray-700">
                <div className="flex flex-col gap-2" style={{ minHeight: '200px' }}>
                  {/* Hero */}
                  <div className="bg-rose-600/20 border border-rose-500 border-dashed rounded-lg p-3 text-center">
                    <span className="text-xs font-bold text-rose-400">homepage_hero</span>
                    <span className="text-[9px] text-rose-300 mx-2">— {t('pos_desc_homepage_hero', 'بانر كبير أعلى الصفحة الرئيسية')}</span>
                    <span className="text-[9px] text-rose-200 bg-rose-500/20 px-1.5 py-0.5 rounded">970x250 / 728x90 / 320x100</span>
                  </div>
                  {/* Content cards placeholder */}
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-800 rounded h-16 border border-gray-700"></div>
                    <div className="flex-1 bg-gray-800 rounded h-16 border border-gray-700"></div>
                    <div className="flex-1 bg-gray-800 rounded h-16 border border-gray-700"></div>
                  </div>
                  {/* Mid */}
                  <div className="bg-pink-600/20 border border-pink-500 border-dashed rounded-lg p-2.5 text-center">
                    <span className="text-xs font-bold text-pink-400">homepage_mid</span>
                    <span className="text-[9px] text-pink-300 mx-2">— {t('pos_desc_homepage_mid', 'وسط محتوى الصفحة الرئيسية')}</span>
                    <span className="text-[9px] text-pink-200 bg-pink-500/20 px-1.5 py-0.5 rounded">728x90 / 468x60</span>
                  </div>
                  {/* More content */}
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-800 rounded h-10 border border-gray-700"></div>
                    <div className="flex-1 bg-gray-800 rounded h-10 border border-gray-700"></div>
                  </div>
                  {/* Footer */}
                  <div className="bg-red-600/20 border border-red-500 border-dashed rounded-lg p-2.5 text-center">
                    <span className="text-xs font-bold text-red-400">homepage_footer</span>
                    <span className="text-[9px] text-red-300 mx-2">— {t('pos_desc_homepage_footer', 'أسفل الصفحة الرئيسية قبل CTA')}</span>
                    <span className="text-[9px] text-red-200 bg-red-500/20 px-1.5 py-0.5 rounded">728x90 / 320x50</span>
                  </div>
                </div>
              </div>

              {/* ===== SECTION 2: APP (Dashboard) ===== */}
              <h4 className="text-sm font-bold text-amber-400 mb-3 mt-5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                {t('ad_section_app', 'داخل التطبيق (بعد تسجيل الدخول)')}
              </h4>
              <div className="bg-gray-900 rounded-xl p-4 mb-4 border border-gray-700">
                <div className="flex gap-3" style={{ minHeight: '300px' }}>
                  {/* Sidebar mockup */}
                  <div className="w-40 flex-shrink-0 bg-gray-800 rounded-lg border border-gray-600 p-2 flex flex-col">
                    <div className="text-[9px] text-gray-500 text-center mb-1">SIDEBAR</div>
                    <div className="flex-1 space-y-1">
                      <div className="bg-gray-700 rounded h-3 w-full"></div>
                      <div className="bg-gray-700 rounded h-3 w-3/4"></div>
                      <div className="bg-gray-700 rounded h-3 w-full"></div>
                      <div className="bg-gray-700 rounded h-3 w-2/3"></div>
                    </div>
                    <div className="mt-auto pt-2 border-t border-gray-600">
                      <div className="bg-indigo-600/30 border border-indigo-500 border-dashed rounded-lg p-2 text-center">
                        <span className="text-[10px] font-bold text-indigo-400">sidebar</span>
                        <div className="text-[8px] text-indigo-300 mt-0.5">160x600 · 300x250</div>
                      </div>
                    </div>
                  </div>
                  {/* Main content */}
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="bg-amber-600/20 border border-amber-500 border-dashed rounded-lg p-3 text-center">
                      <span className="text-xs font-bold text-amber-400">banner</span>
                      <span className="text-[9px] text-amber-300 mx-2">— {t('ad_pos_top', 'بانر أعلى الصفحة')}</span>
                      <span className="text-[9px] text-amber-200 bg-amber-500/20 px-1.5 py-0.5 rounded">728x90 / 970x250</span>
                    </div>
                    <div className="bg-gray-800 rounded-lg border border-gray-600 p-3 flex-1 flex flex-col">
                      <div className="flex gap-2 mb-2">
                        <div className="flex-1 bg-gray-700 rounded h-10"></div>
                        <div className="flex-1 bg-gray-700 rounded h-10"></div>
                        <div className="flex-1 bg-gray-700 rounded h-10"></div>
                      </div>
                      <div className="bg-emerald-600/20 border border-emerald-500 border-dashed rounded-lg p-2.5 text-center mb-2">
                        <span className="text-xs font-bold text-emerald-400">dashboard</span>
                        <span className="text-[9px] text-emerald-300 mx-2">— {t('ad_pos_dash', 'داخل لوحة التحكم')}</span>
                        <span className="text-[9px] text-emerald-200 bg-emerald-500/20 px-1.5 py-0.5 rounded">300x250 / 336x280</span>
                      </div>
                      <div className="bg-purple-600/20 border border-purple-500 border-dashed rounded-lg p-2.5 text-center mb-2">
                        <span className="text-xs font-bold text-purple-400">inline</span>
                        <span className="text-[9px] text-purple-300 mx-2">— {t('ad_pos_inline', 'بين المحتوى')}</span>
                        <span className="text-[9px] text-purple-200 bg-purple-500/20 px-1.5 py-0.5 rounded">728x90 / 320x50</span>
                      </div>
                      <div className="bg-teal-600/20 border border-teal-500 border-dashed rounded-lg p-2 text-center">
                        <span className="text-[10px] font-bold text-teal-400">services_page</span>
                        <span className="text-[9px] text-teal-300 mx-2">— {t('pos_desc_services', 'صفحة الخدمات')}</span>
                        <span className="text-[9px] text-teal-200 bg-teal-500/20 px-1.5 py-0.5 rounded">728x90 / 300x250</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== SECTION 3: SPECIAL ===== */}
              <h4 className="text-sm font-bold text-cyan-400 mb-3 mt-5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                {t('ad_section_special', 'أنواع خاصة')}
              </h4>
              <div className="bg-gray-900 rounded-xl p-4 mb-4 border border-gray-700">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-sky-600/20 border border-sky-500 border-dashed rounded-lg p-3 text-center">
                    <span className="text-lg mb-1 block">🔑</span>
                    <span className="text-[10px] font-bold text-sky-400 block">login_page</span>
                    <span className="text-[8px] text-sky-300 block mt-0.5">{t('pos_desc_login', 'صفحة تسجيل الدخول')}</span>
                    <span className="text-[8px] text-sky-200 bg-sky-500/20 px-1.5 py-0.5 rounded mt-1 inline-block">728x90 / 300x250</span>
                  </div>
                  <div className="bg-orange-600/20 border border-orange-500 border-dashed rounded-lg p-3 text-center">
                    <span className="text-lg mb-1 block">💬</span>
                    <span className="text-[10px] font-bold text-orange-400 block">popup</span>
                    <span className="text-[8px] text-orange-300 block mt-0.5">{t('pos_desc_popup', 'نافذة منبثقة')}</span>
                    <span className="text-[8px] text-orange-200 bg-orange-500/20 px-1.5 py-0.5 rounded mt-1 inline-block">400x300 / 300x250</span>
                  </div>
                  <div className="bg-cyan-600/20 border border-cyan-500 border-dashed rounded-lg p-3 text-center">
                    <span className="text-lg mb-1 block">⏳</span>
                    <span className="text-[10px] font-bold text-cyan-400 block">splash</span>
                    <span className="text-[8px] text-cyan-300 block mt-0.5">{t('pos_desc_splash', 'شاشة التحميل')}</span>
                    <span className="text-[8px] text-cyan-200 bg-cyan-500/20 px-1.5 py-0.5 rounded mt-1 inline-block">320x480 / 300x250</span>
                  </div>
                  <div className="bg-pink-600/20 border border-pink-500 border-dashed rounded-lg p-3 text-center">
                    <span className="text-lg mb-1 block">🔔</span>
                    <span className="text-[10px] font-bold text-pink-400 block">notification</span>
                    <span className="text-[8px] text-pink-300 block mt-0.5">{t('pos_desc_notification', 'صفحة الإشعارات')}</span>
                    <span className="text-[8px] text-pink-200 bg-pink-500/20 px-1.5 py-0.5 rounded mt-1 inline-block">728x90 / 320x50</span>
                  </div>
                </div>
              </div>

              {/* ===== FULL PLACEMENT TABLE ===== */}
              <table className="w-full text-sm" data-testid="ad-placement-table">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-3 py-2 text-right text-gray-400 font-medium">{t('ad_place', 'الموقع')}</th>
                    <th className="px-3 py-2 text-center text-gray-400 font-medium">{t('ad_place_desc', 'الوصف')}</th>
                    <th className="px-3 py-2 text-center text-gray-400 font-medium">{t('ad_sizes', 'المقاسات المتاحة')}</th>
                    <th className="px-3 py-2 text-center text-gray-400 font-medium">{t('ad_who_sees', 'من يشاهده')}</th>
                    <th className="px-3 py-2 text-center text-gray-400 font-medium">{t('ad_max_count', 'العدد الأقصى')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {[
                    { name: 'homepage_hero', color: 'rose', desc: t('pos_desc_homepage_hero','بانر كبير أعلى الصفحة الرئيسية'), sizes: '970x250 · 728x90 · 320x100', who: t('ad_see_public','الجميع (عام)'), max: 3 },
                    { name: 'homepage_mid', color: 'pink', desc: t('pos_desc_homepage_mid','وسط محتوى الصفحة الرئيسية'), sizes: '728x90 · 468x60', who: t('ad_see_public','الجميع (عام)'), max: 2 },
                    { name: 'homepage_footer', color: 'red', desc: t('pos_desc_homepage_footer','أسفل الصفحة الرئيسية'), sizes: '728x90 · 320x50', who: t('ad_see_public','الجميع (عام)'), max: 2 },
                    { name: 'banner', color: 'amber', desc: t('ad_desc_banner','بانر أعلى صفحات المحتوى'), sizes: '728x90 · 970x250 · 320x50', who: t('ad_see_residents','السكان فقط'), max: 5 },
                    { name: 'sidebar', color: 'indigo', desc: t('ad_desc_sidebar','أسفل قائمة التنقل الجانبية'), sizes: '160x600 · 300x250', who: t('ad_see_all','الكل (ما عدا المالك)'), max: 3 },
                    { name: 'dashboard', color: 'emerald', desc: t('ad_desc_dashboard','داخل لوحة التحكم الرئيسية'), sizes: '300x250 · 336x280 · 728x90', who: t('ad_see_residents_admins','السكان والمديرين'), max: 2 },
                    { name: 'inline', color: 'purple', desc: t('ad_desc_inline','بين أقسام المحتوى في الداشبورد'), sizes: '728x90 · 320x50', who: t('ad_see_residents','السكان فقط'), max: 4 },
                    { name: 'services_page', color: 'teal', desc: t('pos_desc_services','صفحة الخدمات والعروض'), sizes: '728x90 · 300x250', who: t('ad_see_residents','السكان فقط'), max: 3 },
                    { name: 'login_page', color: 'sky', desc: t('pos_desc_login','صفحة تسجيل الدخول'), sizes: '728x90 · 300x250', who: t('ad_see_public','الجميع (عام)'), max: 2 },
                    { name: 'popup', color: 'orange', desc: t('pos_desc_popup','نافذة منبثقة عند فتح التطبيق'), sizes: '400x300 · 300x250', who: t('ad_see_residents_admins','السكان والمديرين'), max: 1 },
                    { name: 'splash', color: 'cyan', desc: t('pos_desc_splash','شاشة التحميل'), sizes: '320x480 · 300x250', who: t('ad_see_residents','السكان فقط'), max: 1 },
                    { name: 'notification', color: 'pink', desc: t('pos_desc_notification','صفحة الإشعارات'), sizes: '728x90 · 320x50', who: t('ad_see_residents','السكان فقط'), max: 2 },
                  ].map((p, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2.5"><span className={`bg-${p.color}-500/20 text-${p.color}-400 px-2 py-0.5 rounded text-xs font-bold`}>{p.name}</span></td>
                      <td className="px-3 py-2.5 text-gray-300 text-xs text-center">{p.desc}</td>
                      <td className="px-3 py-2.5 text-center"><span className="text-xs text-gray-400">{p.sizes}</span></td>
                      <td className="px-3 py-2.5 text-center text-xs text-gray-300">{p.who}</td>
                      <td className="px-3 py-2.5 text-center text-xs font-bold text-gray-300">{p.max}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Ads List Table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-right text-gray-400">{t('sa_title', 'العنوان')}</th>
                    <th className="px-4 py-3 text-right text-gray-400">{t('sa_position', 'الموقع')}</th>
                    <th className="px-4 py-3 text-center text-gray-400">{t('ad_dimensions', 'المقاسات')}</th>
                    <th className="px-4 py-3 text-center text-gray-400">{t('ad_dates', 'المدة')}</th>
                    <th className="px-4 py-3 text-center text-gray-400">{t('ad_value_col', 'القيمة')}</th>
                    <th className="px-4 py-3 text-center text-gray-400">{t('sa_clicks', 'النقرات')}</th>
                    <th className="px-4 py-3 text-center text-gray-400">{t('sa_status', 'الحالة')}</th>
                    <th className="px-4 py-3 text-center text-gray-400">{t('sa_actions', 'إجراءات')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {ads.map(a => {
                    const posLabels = { 
                      banner: t('sa_pos_banner','بانر أعلى'), sidebar: t('sa_pos_sidebar','جانبي'), inline: t('sa_pos_inline','داخلي'), dashboard: t('sa_pos_dashboard','لوحة التحكم'),
                      homepage_hero: t('pos_homepage_hero','الرئيسية-هيرو'), homepage_mid: t('pos_homepage_mid','الرئيسية-وسط'), homepage_footer: t('pos_homepage_footer','الرئيسية-أسفل'),
                      login_page: t('pos_login','صفحة الدخول'), popup: t('pos_popup','منبثق'), notification: t('pos_notification','إشعارات'), splash: t('pos_splash','شاشة التحميل'), services_page: t('pos_services','الخدمات'),
                    };
                    return (
                      <tr key={a.id} className="hover:bg-gray-750">
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{a.title}</div>
                          <div className="text-xs text-gray-500">{a.description || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-xs">{posLabels[a.position] || a.position}</td>
                        <td className="px-4 py-3 text-center text-gray-300 text-xs">{a.dimensions || '-'}</td>
                        <td className="px-4 py-3 text-center text-xs">
                          {a.start_date || a.end_date ? (
                            <div className="text-gray-300">
                              {a.start_date && <div>{a.start_date}</div>}
                              {a.end_date && <div className="text-gray-500">{t('ad_to', 'إلى')} {a.end_date}</div>}
                            </div>
                          ) : <span className="text-gray-500">-</span>}
                        </td>
                        <td className="px-4 py-3 text-center text-xs">
                          {a.is_gift ? (
                            <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded-full text-[10px]">{t('ad_gift', 'هدية')}</span>
                          ) : (
                            <span className="text-emerald-400 font-bold">{(a.ad_value || 0).toLocaleString()} {t('sm_egp','ج.م')}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-300">{a.clicks || 0}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {a.is_active ? t('sp_active','نشط') : t('sp_disabled','معطل')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => handleToggleAd(a.id)} className={`px-2 py-1 text-xs rounded ${a.is_active ? 'bg-amber-600/20 text-amber-400' : 'bg-green-600/20 text-green-400'}`}>
                              {a.is_active ? t('sp_deactivate','تعطيل') : t('sp_activate','تفعيل')}
                            </button>
                            <button onClick={() => handleDeleteAd(a.id)} className="px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded">{t('sa_delete', 'حذف')}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {ads.length === 0 && (
                    <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-500">{t('sa_no_ads', 'لا توجد إعلانات بعد')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Referrals Tab */}
        {activeTab === 'referrals' && (
          <div data-testid="referrals-tab">
            {refStats ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: t('sa_ref_codes', 'أكواد الإحالة'), value: refStats.total_referral_codes, color: 'text-blue-400' },
                    { label: t('sa_total_referrals', 'إجمالي الإحالات'), value: refStats.total_referrals, color: 'text-green-400' },
                    { label: t('sa_earned_coupons', 'كوبونات مكتسبة'), value: refStats.total_coupons_earned, color: 'text-amber-400' },
                  ].map((s, i) => (
                    <div key={i} className="bg-gray-800 rounded-xl p-5 border border-gray-700 text-center">
                      <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Referral Settings */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
                  <h3 className="font-bold text-white mb-4">{t('sa_ref_settings', 'إعدادات برنامج الإحالات')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('sa_ref_prefix', 'بادئة كود الإحالة')}</label>
                      <input id="ref-prefix" defaultValue={refStats.settings?.prefix || 'HOMEME'} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('sa_ref_reward_type', 'نوع المكافأة')}</label>
                      <select id="ref-reward-type" defaultValue={refStats.settings?.reward_type || 'months'} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                        <option value="money">{t('sa_ref_money', 'مبلغ مادي (ج.م)')}</option>
                        <option value="months">{t('sa_ref_months', 'شهور إضافية')}</option>
                        <option value="percentage">{t('sa_ref_percentage', 'نسبة خصم %')}</option>
                        <option value="coupon">{t('sa_ref_coupon', 'كوبون خصم')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('sa_ref_reward_value', 'قيمة المكافأة')}</label>
                      <input id="ref-reward-value" type="number" min="1" defaultValue={refStats.settings?.reward_value || 1} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                      <p className="text-[10px] text-gray-500 mt-1">{t('sa_ref_value_hint', 'مثال: 100 ج.م أو 2 شهر أو 15%')}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('sa_ref_min', 'الحد الأدنى للإحالات')}</label>
                      <input id="ref-min" type="number" min="1" defaultValue={refStats.settings?.min_referrals || 3} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                    </div>
                  </div>
                  <button onClick={async () => {
                    try {
                      await axios.put(`${API}/referral/settings`, {
                        prefix: document.getElementById('ref-prefix')?.value,
                        reward_type: document.getElementById('ref-reward-type')?.value,
                        reward_value: parseFloat(document.getElementById('ref-reward-value')?.value) || 1,
                        min_referrals: parseInt(document.getElementById('ref-min')?.value) || 3,
                      }, getToken());
                      toast.success(t('sa_saved', 'تم الحفظ'));
                      fetchRefStats();
                    } catch { toast.error(t('sa_failed', 'فشل')); }
                  }} className="mt-4 px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500">
                    {t('save_changes', 'حفظ التغييرات')}
                  </button>
                </div>

                {/* Create New Referral */}
                <div className="flex gap-3 mb-4">
                  <input id="new-ref-code" placeholder={t('sa_ref_custom_code', 'كود مخصص (اختياري)')} className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500" />
                  <button onClick={async () => {
                    try {
                      const code = document.getElementById('new-ref-code')?.value || '';
                      const res = await axios.post(`${API}/referral/create`, { code }, getToken());
                      toast.success(res.data.message);
                      document.getElementById('new-ref-code').value = '';
                      fetchRefStats();
                    } catch (err) { toast.error(err.response?.data?.detail || t('sa_failed', 'فشل')); }
                  }} className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500">
                    + {t('sa_create_ref', 'إنشاء كود إحالة')}
                  </button>
                </div>

                {/* All Referral Codes Table */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-700">
                    <h3 className="font-bold text-white">{t('sa_all_ref_codes', 'جميع أكواد الإحالة')}</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-right text-gray-400">{t('sa_code', 'الكود')}</th>
                        <th className="px-4 py-3 text-right text-gray-400">{t('sa_ref_owner', 'صاحب الكود')}</th>
                        <th className="px-4 py-3 text-right text-gray-400">{t('sa_ref_compound', 'المجمع')}</th>
                        <th className="px-4 py-3 text-center text-gray-400">{t('sa_total_referrals', 'الإحالات')}</th>
                        <th className="px-4 py-3 text-center text-gray-400">{t('sa_ref_reward', 'المكافأة')}</th>
                        <th className="px-4 py-3 text-center text-gray-400">{t('sa_actions', 'إجراءات')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {(refStats.all_codes || []).map((r) => (
                        <tr key={r.code} className="hover:bg-gray-750">
                          <td className="px-4 py-3 font-mono text-green-400 text-xs">{r.code}</td>
                          <td className="px-4 py-3 text-white text-xs">{r.user_name || '-'}</td>
                          <td className="px-4 py-3 text-gray-300 text-xs">{r.compound_name || '-'}</td>
                          <td className="px-4 py-3 text-center font-bold text-white">{r.total_invited}</td>
                          <td className="px-4 py-3 text-center text-xs">
                            {r.reward_given ? (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">{r.reward_given}</span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-center">
                              <button onClick={async () => {
                                try { await axios.post(`${API}/referral/${r.code}/duplicate`, {}, getToken()); toast.success(t('sa_ref_duplicated', 'تم التكرار')); fetchRefStats(); } catch { toast.error(t('sa_failed', 'فشل')); }
                              }} className="px-2 py-1 text-xs bg-purple-600/20 text-purple-400 rounded" title={t('sa_duplicate', 'تكرار')}>
                                {t('sa_duplicate', 'تكرار')}
                              </button>
                              <button onClick={async () => {
                                if (!window.confirm(t('sa_confirm_delete', 'هل أنت متأكد؟'))) return;
                                try { await axios.delete(`${API}/referral/${r.code}`, getToken()); toast.success(t('sa_deleted', 'تم الحذف')); fetchRefStats(); } catch { toast.error(t('sa_failed', 'فشل')); }
                              }} className="px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded">
                                {t('sa_delete', 'حذف')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(refStats.all_codes || []).length === 0 && <tr><td colSpan="6" className="px-4 py-6 text-center text-gray-500">{t('sa_no_referrals', 'لا توجد إحالات بعد')}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-10 text-gray-500">{t('sa_loading', 'جاري التحميل...')}</div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && subAnalytics && (
          <div data-testid="analytics-tab">
            {/* Email Notifications */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white">{t('sa_email_notif', 'إشعارات البريد الإلكتروني')}</h3>
                  <p className="text-xs text-gray-400 mt-1">{t('sa_send_from', 'الإرسال من')} info@datalifeai.com</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={async () => {
                    try {
                      const res = await axios.post(`${API}/notifications/test-email`, {}, getToken());
                      toast.success(res.data.message);
                    } catch { toast.error(t('sp_send_failed', 'فشل في الإرسال')); }
                  }} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-600" data-testid="test-email-btn">
                    {t('sa_test_email', 'اختبار البريد')}
                  </button>
                  <button onClick={async () => {
                    try {
                      const res = await axios.post(`${API}/notifications/send-reminders`, {}, getToken());
                      toast.success(res.data.message);
                    } catch { toast.error(t('sp_send_failed', 'فشل في الإرسال')); }
                  }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500" data-testid="send-reminders-btn">
                    {t('sa_send_reminders', 'إرسال التذكيرات الآن')}
                  </button>
                </div>
              </div>

              {/* Custom Email Form */}
              <div className="border-t border-gray-700 pt-4">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">{t('sa_send_custom', 'إرسال بريد مخصص')}</h4>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <input
                      id="custom-email-to"
                      type="email"
                      placeholder={t('sa_email_to', 'البريد الإلكتروني للمستلم')}
                      className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                      data-testid="custom-email-to"
                    />
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-400 whitespace-nowrap">
                      <input
                        type="checkbox"
                        id="send-to-all"
                        className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-900 text-blue-500"
                        data-testid="send-to-all"
                      />
                      {t('sa_send_all', 'إرسال للكل')}
                    </label>
                  </div>
                  <input
                    id="custom-email-subject"
                    type="text"
                    placeholder={t('sa_email_subject', 'الموضوع')}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                    data-testid="custom-email-subject"
                  />
                  <textarea
                    id="custom-email-message"
                    rows="3"
                    placeholder={t('sa_email_message', 'نص الرسالة...')}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none"
                    data-testid="custom-email-message"
                  ></textarea>
                  <button onClick={async () => {
                    const to = document.getElementById('custom-email-to')?.value || '';
                    const subject = document.getElementById('custom-email-subject')?.value || '';
                    const message = document.getElementById('custom-email-message')?.value || '';
                    const sendAll = document.getElementById('send-to-all')?.checked || false;
                    if (!subject || !message) { toast.error(t('sa_fill_fields', 'الموضوع والرسالة مطلوبين')); return; }
                    if (!to && !sendAll) { toast.error(t('sa_email_required', 'أدخل البريد أو اختر إرسال للكل')); return; }
                    try {
                      const res = await axios.post(`${API}/notifications/send-custom-email`, { to_email: to, subject, message, send_to_all: sendAll }, getToken());
                      toast.success(res.data.message);
                      document.getElementById('custom-email-to').value = '';
                      document.getElementById('custom-email-subject').value = '';
                      document.getElementById('custom-email-message').value = '';
                    } catch(err) { toast.error(err.response?.data?.detail || t('sp_send_failed', 'فشل في الإرسال')); }
                  }} className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500" data-testid="send-custom-email-btn">
                    {t('sa_send_email_btn', 'إرسال البريد')}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: t('sa_total_users', 'إجمالي المستخدمين'), value: subAnalytics.total_users, color: 'text-blue-400' },
                { label: t('sa_active_subs', 'اشتراكات نشطة'), value: subAnalytics.active_subscriptions, color: 'text-green-400' },
                { label: t('sa_free_users', 'بدون اشتراك'), value: subAnalytics.free_users, color: 'text-gray-400' },
                { label: t('sa_trial_users', 'تجريبي'), value: subAnalytics.trial_users, color: 'text-amber-400' },
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
                <h3 className="font-bold text-lg text-white mb-3">{t('sp_monthly_revenue', 'الإيرادات الشهرية المتوقعة')}</h3>
                <p className="text-4xl font-black text-green-400">{(subAnalytics.monthly_revenue_estimate || 0).toLocaleString()} <span className="text-sm text-gray-400">{t('sp_egp', 'ج.م')}</span></p>
                <p className="text-xs text-gray-500 mt-1">{t('sp_based_on_active', 'بناءً على الاشتراكات النشطة')}</p>
              </div>

              {/* By Plan */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                <h3 className="font-bold text-lg text-white mb-3">{t('sp_plan_distribution', 'توزيع الخطط')}</h3>
                <div className="space-y-2">
                  {Object.entries(subAnalytics.by_plan || {}).map(([plan, count]) => {
                    const planLabels = { trial: t('sp_trial','تجريبي'), basic: t('sp_basic','أساسي'), pro: t('sp_pro','احترافي'), premium: t('sp_premium','متقدم'), company_startup: t('sp_co_startup','شركة ناشئة'), company_business: t('sp_co_business','شركة متوسطة'), company_enterprise: t('sp_co_enterprise','شركة كبرى') };
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
                <h3 className="font-bold text-lg text-amber-400 mb-3">{t('sp_expiring_soon', 'اشتراكات تنتهي قريباً (30 يوم)')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-right py-2 px-3">{t('sa_user', 'المستخدم')}</th>
                        <th className="text-right py-2 px-3">{t('sa_plan', 'الخطة')}</th>
                        <th className="text-center py-2 px-3">{t('sp_days_left', 'أيام متبقية')}</th>
                        <th className="text-center py-2 px-3">{t('sp_expiry_date', 'تاريخ الانتهاء')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subAnalytics.expiring_soon.map((u, i) => (
                        <tr key={i} className="border-b border-gray-700/50">
                          <td className="py-2 px-3 text-white">{u.full_name || u.username}</td>
                          <td className="py-2 px-3 text-gray-300">{u.plan}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.days_left <= 7 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {u.days_left} {t('sp_day', 'يوم')}
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
          <div className="text-center py-10 text-gray-500">{t('sa_loading', 'جاري التحميل...')}</div>
        )}

        {/* Translations Tab */}
        {activeTab === 'translations' && (
          <TranslationManager />
        )}

        {/* User Subscriptions Tab */}
        {activeTab === 'user_subs' && (
          <div data-testid="user-subs-tab">
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: t('sa_total_users', 'إجمالي المستخدمين'), value: userSubStats.total || 0, color: 'text-blue-400' },
                { label: t('sa_active_subs', 'اشتراكات نشطة'), value: userSubStats.active || 0, color: 'text-green-400' },
                { label: t('sa_expired_subs', 'منتهية'), value: userSubStats.expired || 0, color: 'text-red-400' },
              ].map((s, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mb-4">
              <input value={userSubSearch} onChange={e => setUserSubSearch(e.target.value)} placeholder={t('sa_search_user', 'بحث بالاسم أو الإيميل...')} className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              <select value={userSubFilter} onChange={e => setUserSubFilter(e.target.value)} className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                <option value="">{t('cs_all', 'الكل')}</option>
                <option value="active">{t('cs_active', 'نشطة')}</option>
                <option value="expired">{t('cs_expired', 'منتهية')}</option>
              </select>
            </div>

            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-right text-gray-400">{t('sa_user', 'المستخدم')}</th>
                    <th className="px-4 py-3 text-center text-gray-400">{t('sa_plan', 'الخطة')}</th>
                    <th className="px-4 py-3 text-center text-gray-400">{t('sa_sub_end', 'تاريخ الانتهاء')}</th>
                    <th className="px-4 py-3 text-center text-gray-400">{t('sa_status', 'الحالة')}</th>
                    <th className="px-4 py-3 text-center text-gray-400">{t('sa_actions', 'إجراءات')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {userSubs.map(u => (
                    <tr key={u.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <div className="font-bold text-white text-xs">{u.full_name || u.username}</div>
                        <div className="text-[10px] text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-300">{u.subscription_plan || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-300">
                        {u.subscription_end ? new Date(u.subscription_end).toLocaleDateString('ar-EG') : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.subscription_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {u.subscription_active ? t('sp_active','نشط') : t('sp_expired_label','منتهي')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center flex-wrap">
                          {u.subscription_active ? (
                            <>
                              <button onClick={() => handleUserSubAction(u.id, 'extend', { days: 30 })} className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded">+30 {t('sp_day','يوم')}</button>
                              <button onClick={() => setUserSubAction({ userId: u.id, name: u.full_name || u.username, type: 'change_plan', plan: u.subscription_plan || 'basic' })} className="px-2 py-1 text-xs bg-purple-600/20 text-purple-400 rounded">{t('cs_change_plan','تغيير')}</button>
                              <button onClick={() => handleUserSubAction(u.id, 'deactivate')} className="px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded">{t('sp_deactivate','إلغاء')}</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setUserSubAction({ userId: u.id, name: u.full_name || u.username, type: 'activate', plan: 'basic', days: 365 })} className="px-2 py-1 text-xs bg-green-600/20 text-green-400 rounded">{t('sp_activate','تفعيل')}</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {userSubs.length === 0 && <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">{t('sa_no_users', 'لا يوجد مستخدمين')}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Edit Code Modal */}
      {editCode && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditCode(null)}>
          <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-gray-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">{t('sa_edit_code', 'تعديل الكود')}: <span className="text-green-400 font-mono">{editCode.code}</span></h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sa_plan', 'الخطة')}</label>
                <select value={editCode.plan || ''} onChange={e => setEditCode({...editCode, plan: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="starter">{t('sp_free','مجاني')}</option>
                  <option value="basic">{t('sp_basic','أساسي')}</option>
                  <option value="pro">{t('sp_pro','احترافي')}</option>
                  <option value="premium">{t('sp_premium','متقدم')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sp_max_uses', 'الحد الأقصى')}</label>
                <input type="number" min="1" value={editCode.max_uses || 1} onChange={e => setEditCode({...editCode, max_uses: parseInt(e.target.value) || 1})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sa_notes', 'ملاحظات')}</label>
                <input value={editCode.notes || ''} onChange={e => setEditCode({...editCode, notes: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleEditCode} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500">{t('cs_confirm', 'تأكيد')}</button>
              <button onClick={() => setEditCode(null)} className="px-4 py-2.5 bg-gray-700 text-gray-300 rounded-lg text-sm">{t('cs_cancel', 'إلغاء')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Coupon Modal */}
      {editCoupon && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditCoupon(null)}>
          <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-gray-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">{t('sa_edit_coupon', 'تعديل الكوبون')}: <span className="text-amber-400 font-mono">{editCoupon.code}</span></h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sa_coupon_code', 'كود الكوبون')}</label>
                <input value={editCoupon.code || ''} onChange={e => setEditCoupon({...editCoupon, code: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('sa_discount_type', 'نوع الخصم')}</label>
                  <select value={editCoupon.discount_type} onChange={e => setEditCoupon({...editCoupon, discount_type: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="percentage">%</option>
                    <option value="fixed">{t('sp_egp', 'ج.م')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('sp_discount_value', 'القيمة')}</label>
                  <input type="number" min="0" value={editCoupon.discount_value} onChange={e => setEditCoupon({...editCoupon, discount_value: parseFloat(e.target.value) || 0})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sa_max_usage', 'الحد الأقصى')}</label>
                <input type="number" min="1" value={editCoupon.max_uses} onChange={e => setEditCoupon({...editCoupon, max_uses: parseInt(e.target.value) || 1})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sa_notes', 'ملاحظات')}</label>
                <input value={editCoupon.notes || ''} onChange={e => setEditCoupon({...editCoupon, notes: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleEditCoupon} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500">{t('cs_confirm', 'تأكيد')}</button>
              <button onClick={() => setEditCoupon(null)} className="px-4 py-2.5 bg-gray-700 text-gray-300 rounded-lg text-sm">{t('cs_cancel', 'إلغاء')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditUser(null)}>
          <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-gray-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">{t('sa_edit_user', 'تعديل المستخدم')}: <span className="text-blue-400">{editUser.full_name || editUser.username}</span></h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sp_name', 'الاسم')}</label>
                <input value={editUser.full_name || ''} onChange={e => setEditUser({...editUser, full_name: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sp_email', 'البريد')}</label>
                <input value={editUser.email || ''} onChange={e => setEditUser({...editUser, email: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sp_phone', 'الهاتف')}</label>
                <input value={editUser.phone || ''} onChange={e => setEditUser({...editUser, phone: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sa_role', 'الدور')}</label>
                <select value={editUser.role} onChange={e => setEditUser({...editUser, role: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                  {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sa_compound', 'المجمع السكني')}</label>
                <select value={editUser.compound_id || ''} onChange={e => setEditUser({...editUser, compound_id: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">{t('sa_no_compound', 'بدون مجمع')}</option>
                  {compounds.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={async () => {
                try {
                  await axios.put(`${API}/database/users/${editUser.id}`, {
                    full_name: editUser.full_name,
                    email: editUser.email,
                    phone: editUser.phone,
                    role: editUser.role,
                    compound_id: editUser.compound_id,
                  }, getToken());
                  toast.success(t('sa_user_updated', 'تم تحديث المستخدم'));
                  setEditUser(null);
                  fetchUsers();
                } catch { toast.error(t('sa_failed', 'فشل')); }
              }} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500">{t('cs_confirm', 'تأكيد')}</button>
              <button onClick={() => setEditUser(null)} className="px-4 py-2.5 bg-gray-700 text-gray-300 rounded-lg text-sm">{t('cs_cancel', 'إلغاء')}</button>
            </div>
          </div>
        </div>
      )}

      {/* User Sub Action Modal */}
      {userSubAction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setUserSubAction(null)}>
          <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-gray-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">
              {userSubAction.type === 'activate' && t('sa_activate_sub', 'تفعيل اشتراك')}
              {userSubAction.type === 'change_plan' && t('cs_change_plan', 'تغيير الخطة')}
              : <span className="text-blue-400">{userSubAction.name}</span>
            </h3>
            {userSubAction.type === 'activate' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('sa_plan', 'الخطة')}</label>
                  <select value={userSubAction.plan} onChange={e => setUserSubAction({...userSubAction, plan: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="basic">{t('sp_basic','أساسي')}</option>
                    <option value="pro">{t('sp_pro','احترافي')}</option>
                    <option value="premium">{t('sp_premium','متقدم')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('cs_days_count', 'عدد الأيام')}</label>
                  <input type="number" min="1" value={userSubAction.days} onChange={e => setUserSubAction({...userSubAction, days: parseInt(e.target.value) || 30})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>
            )}
            {userSubAction.type === 'change_plan' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sa_plan', 'الخطة')}</label>
                <select value={userSubAction.plan} onChange={e => setUserSubAction({...userSubAction, plan: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="basic">{t('sp_basic','أساسي')}</option>
                  <option value="pro">{t('sp_pro','احترافي')}</option>
                  <option value="premium">{t('sp_premium','متقدم')}</option>
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => handleUserSubAction(userSubAction.userId, userSubAction.type, { plan: userSubAction.plan, days: userSubAction.days })} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500">{t('cs_confirm', 'تأكيد')}</button>
              <button onClick={() => setUserSubAction(null)} className="px-4 py-2.5 bg-gray-700 text-gray-300 rounded-lg text-sm">{t('cs_cancel', 'إلغاء')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPanel;
