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
  UserGroupIcon,
  LanguageIcon
} from '@heroicons/react/24/outline';
import TranslationManager from './TranslationManager';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const SuperAdminPanel = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

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
  // Coupons
  const [coupons, setCoupons] = useState([]);
  const [couponStats, setCouponStats] = useState({});
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_type: 'percentage', discount_value: 20, max_uses: 100, notes: '' });
  // Ads
  const [ads, setAds] = useState([]);
  const [adStats, setAdStats] = useState({});
  const [showCreateAd, setShowCreateAd] = useState(false);
  const [newAd, setNewAd] = useState({ title: '', image_url: '', link_url: '', description: '', position: 'banner', target_compounds: [] });
  // Referrals
  const [refStats, setRefStats] = useState(null);

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
    try { const res = await axios.get(`${API}/ads`, getToken()); setAds(res.data.ads || []); setAdStats(res.data.stats || {}); } catch { /* */ }
  };
  const handleCreateAd = async () => {
    try {
      await axios.post(`${API}/ads`, newAd, getToken());
      toast.success(t('sa_ad_created', 'تم إنشاء الإعلان'));
      setShowCreateAd(false);
      setNewAd({ title: '', image_url: '', link_url: '', description: '', position: 'banner', target_compounds: [] });
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
            { label: t('sa_revenue', 'الإيرادات'), value: (stats.total_revenue || 0).toLocaleString(), color: 'from-green-500 to-emerald-600', icon: BanknotesIcon },
            { label: t('sa_expenses', 'المصروفات'), value: (stats.total_expenses || 0).toLocaleString(), color: 'from-red-500 to-pink-600', icon: BanknotesIcon },
            { label: t('sa_net', 'صافي'), value: (stats.net_balance || 0).toLocaleString(), color: 'from-indigo-500 to-purple-600', icon: GlobeAltIcon },
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
            { id: 'overview', label: t('sa_compounds') },
            { id: 'users', label: t('sa_users') },
            { id: 'codes', label: t('sa_sub_codes', 'أكواد الاشتراك') },
            { id: 'coupons', label: t('sa_coupons', 'كوبونات الخصم') },
            { id: 'ads', label: t('sa_ads', 'الإعلانات') },
            { id: 'referrals', label: t('sa_referrals', 'الإحالات') },
            { id: 'analytics', label: t('sa_analytics', 'تحليلات الاشتراكات') },
            { id: 'translations', label: t('sa_translations', 'إدارة الترجمات') },
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
                            <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success(t('sp_copied','تم النسخ')); }} className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600" title={t('sp_copy','نسخ')}>{t('sp_copy','نسخ')}</button>
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
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: t('sa_total_ads', 'إجمالي الإعلانات'), value: adStats.total || 0, color: 'text-blue-400' },
                { label: t('sa_active_count', 'نشطة'), value: adStats.active || 0, color: 'text-green-400' },
                { label: t('sa_total_clicks', 'إجمالي النقرات'), value: adStats.total_clicks || 0, color: 'text-amber-400' },
                { label: t('sa_total_views', 'إجمالي المشاهدات'), value: adStats.total_views || 0, color: 'text-purple-400' },
              ].map((s, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            <button onClick={() => setShowCreateAd(!showCreateAd)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500 mb-6" data-testid="create-ad-btn">
              + إنشاء إعلان جديد
            </button>

            {showCreateAd && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
                <h3 className="text-lg font-bold mb-4">{t('sa_create_ad', 'إنشاء إعلان داخلي')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_ad_title', 'عنوان الإعلان')}</label>
                    <input type="text" value={newAd.title} onChange={e => setNewAd({...newAd, title: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" placeholder={t("sp_ad_title", "عنوان الإعلان")} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_upload_media', 'رفع صورة أو فيديو')}</label>
                    <input type="file" accept="image/*,video/mp4,video/webm" onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await axios.post(`${API}/ads/upload-media`, formData, { ...getToken(), headers: { ...getToken().headers, 'Content-Type': 'multipart/form-data' } });
                        setNewAd({...newAd, image_url: res.data.url});
                        toast.success(t('sp_uploaded', 'تم الرفع'));
                      } catch (err) { toast.error(err.response?.data?.detail || t('sa_upload_failed', 'فشل في الرفع')); }
                    }} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:text-xs file:cursor-pointer" />
                    {newAd.image_url && <p className="text-xs text-green-400 mt-1">{t('sp_uploaded', 'تم الرفع')}: {newAd.image_url}</p>}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_ext_image', 'أو رابط صورة خارجي')}</label>
                    <input type="text" value={newAd.image_url} onChange={e => setNewAd({...newAd, image_url: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_ad_link', 'رابط الإعلان')}</label>
                    <input type="text" value={newAd.link_url} onChange={e => setNewAd({...newAd, link_url: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_description', 'الوصف')}</label>
                    <input type="text" value={newAd.description} onChange={e => setNewAd({...newAd, description: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" placeholder={t("sp_desc", "وصف مختصر...")} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{t('sa_position', 'الموقع')}</label>
                    <select value={newAd.position} onChange={e => setNewAd({...newAd, position: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                      <option value="banner">{t('sa_pos_banner', 'بانر أعلى')}</option>
                      <option value="sidebar">{t('sa_pos_sidebar', 'شريط جانبي')}</option>
                      <option value="inline">{t('sa_pos_inline', 'داخل المحتوى')}</option>
                      <option value="dashboard">{t('sa_pos_dashboard', 'لوحة التحكم')}</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleCreateAd} disabled={!newAd.title.trim()} className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500 disabled:opacity-50">{t('sa_create_ad_btn', 'إنشاء الإعلان')}</button>
                  <button onClick={() => setShowCreateAd(false)} className="px-5 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">{t('sa_cancel', 'إلغاء')}</button>
                </div>
              </div>
            )}

            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-right text-gray-400">{t('sa_title', 'العنوان')}</th>
                    <th className="px-4 py-3 text-right text-gray-400">{t('sa_position', 'الموقع')}</th>
                    <th className="px-4 py-3 text-center text-gray-400">{t('sa_clicks', 'النقرات')}</th>
                    <th className="px-4 py-3 text-center text-gray-400">{t('sa_status', 'الحالة')}</th>
                    <th className="px-4 py-3 text-center text-gray-400">{t('sa_actions', 'إجراءات')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {ads.map(a => {
                    const posLabels = { banner: t('sp_pos_banner','بانر'), sidebar: t('sp_pos_sidebar','جانبي'), inline: t('sp_pos_inline','داخلي'), dashboard: t('sp_pos_dashboard','لوحة التحكم') };
                    return (
                      <tr key={a.id} className="hover:bg-gray-750">
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{a.title}</div>
                          <div className="text-xs text-gray-500">{a.description || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-xs">{posLabels[a.position] || a.position}</td>
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
                    <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">{t('sa_no_ads', 'لا توجد إعلانات بعد')}</td></tr>
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
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                  <h3 className="font-bold text-lg mb-4">{t('sa_top_referrers', 'أفضل المُحيلين')}</h3>
                  {refStats.top_referrers?.length > 0 ? (
                    <div className="space-y-2">
                      {refStats.top_referrers.map((r, i) => (
                        <div key={i} className="flex items-center gap-3 bg-gray-900 rounded-lg p-3">
                          <span className="text-xs font-bold text-gray-500 w-6">{i + 1}</span>
                          <span className="font-mono text-green-400 text-sm">{r.code}</span>
                          <div className="flex-1" />
                          <span className="text-lg font-bold text-white">{r.total}</span>
                          <span className="text-xs text-gray-400">{t('sa_referral', 'إحالة')}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-4">{t('sa_no_referrals', 'لا توجد إحالات بعد')}</p>
                  )}
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white">{t('sa_email_notif', 'إشعارات البريد الإلكتروني')}</h3>
                  <p className="text-xs text-gray-400 mt-1">{t('sa_send_from')} info@datalifeai.com</p>
                </div>
                <button onClick={async () => {
                  try {
                    const res = await axios.post(`${API}/notifications/send-reminders`, {}, getToken());
                    toast.success(res.data.message);
                  } catch { toast.error(t('sp_send_failed', 'فشل في الإرسال')); }
                }} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500" data-testid="send-reminders-btn">
                  إرسال التذكيرات الآن
                </button>
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

      </div>
    </div>
  );
};

export default SuperAdminPanel;
