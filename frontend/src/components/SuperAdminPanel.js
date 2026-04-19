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
import AdsTab from './super-admin/AdsTab';
import UsersTab from './super-admin/UsersTab';
import CodesTab from './super-admin/CodesTab';
import CouponsTab from './super-admin/CouponsTab';
import CompoundDetailModal from './super-admin/CompoundDetailModal';
import HierarchicalSubs from './super-admin/HierarchicalSubs';
import CompaniesTab from './super-admin/CompaniesTab';
import AdvertiserAdsTab from './super-admin/AdvertiserAdsTab';

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
    app_owner: t('role_owner', 'مالك التطبيق'),
    super_admin: t('role_super_admin', 'سوبر أدمن'),
    company_admin: t('role_company_admin', 'إدارة شركة'),
    admin: t('role_admin', 'مدير مجتمع'),
    manager: t('role_manager', 'إداري'),
    security: t('role_security', 'أمن'),
    resident: t('role_resident', 'مقيم')
  };

  const roleColors = {
    app_owner: 'bg-rose-100 text-rose-700',
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
  const [campaigns, setCampaigns] = useState([]);
  const [campaignStats, setCampaignStats] = useState({});
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', description: '', start_date: '', end_date: '', budget: 0, ad_ids: [], positions: [], auto_renew: false, free_trial_days: 0, status: 'draft' });
  const [showCreateAd, setShowCreateAd] = useState(false);
  const [newAd, setNewAd] = useState({ title: '', image_url: '', link_url: '', description: '', position: 'banner', dimensions: '', ad_value: 0, is_gift: false, start_date: '', end_date: '', target_compounds: [] });
  // Referrals
  const [refStats, setRefStats] = useState(null);
  // Edit modals
  const [editCode, setEditCode] = useState(null);
  const [editCoupon, setEditCoupon] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [selectedCompound, setSelectedCompound] = useState(null);
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
  const [editAd, setEditAd] = useState(null);
  const handleCreateAd = async () => {
    if (!newAd.title || !newAd.title.trim()) {
      toast.error(t('sa_title_required', 'العنوان مطلوب'));
      return;
    }
    if (!newAd.position) {
      toast.error(t('sa_position_required', 'اختاري الموقع أولاً'));
      return;
    }
    try {
      await axios.post(`${API}/ads`, newAd, getToken());
      toast.success(t('sa_ad_created', 'تم إنشاء الإعلان'));
      setShowCreateAd(false);
      setNewAd({ title: '', image_url: '', link_url: '', description: '', position: 'banner', dimensions: '', ad_value: 0, is_gift: false, start_date: '', end_date: '', target_compounds: [] });
      fetchAds();
    } catch (err) {
      console.error('Create ad error:', err);
      const msg = err.response?.data?.detail || err.message || t('sa_failed', 'فشل');
      toast.error(typeof msg === 'string' ? msg : t('sa_failed', 'فشل'));
    }
  };
  const handleToggleAd = async (id) => {
    try { await axios.put(`${API}/ads/${id}/toggle`, {}, getToken()); toast.success(t('sa_updated', 'تم التحديث')); fetchAds(); } catch { toast.error(t('sa_failed', 'فشل')); }
  };
  const handleDeleteAd = async (id) => {
    if (!window.confirm(t('sa_confirm_delete_ad', 'حذف الإعلان؟'))) return;
    try { await axios.delete(`${API}/ads/${id}`, getToken()); toast.success(t('sa_deleted', 'تم الحذف')); fetchAds(); } catch { toast.error(t('sa_failed', 'فشل')); }
  };
  const handleUpdateAd = async () => {
    if (!editAd) return;
    if (!editAd.title || !editAd.title.trim()) {
      toast.error(t('sa_title_required', 'العنوان مطلوب'));
      return;
    }
    try {
      const payload = {
        title: editAd.title,
        image_url: editAd.image_url || '',
        media_type: editAd.media_type || 'image',
        template_style: editAd.template_style || 'purple_dream',
        link_url: editAd.link_url || '',
        description: editAd.description || '',
        position: editAd.position,
        dimensions: editAd.dimensions || '',
        is_active: editAd.is_active,
        is_gift: editAd.is_gift,
        ad_value: editAd.ad_value || 0,
        start_date: editAd.start_date || null,
        end_date: editAd.end_date || null,
        priority: editAd.priority || 0,
      };
      await axios.put(`${API}/ads/${editAd.id}`, payload, getToken());
      toast.success(t('sa_ad_updated', 'تم تحديث الإعلان'));
      setEditAd(null);
      fetchAds();
    } catch (err) {
      console.error('Update ad error:', err);
      toast.error(err.response?.data?.detail || t('sa_failed', 'فشل'));
    }
  };
  useEffect(() => { if (activeTab === 'ads') { fetchAds(); fetchCampaigns(); } }, [activeTab]);

  const fetchCampaigns = async () => {
    try {
      const res = await axios.get(`${API}/ads/campaigns`, getToken());
      setCampaigns(res.data.campaigns || []);
      setCampaignStats(res.data.stats || {});
    } catch { /* */ }
  };

  const handleCreateCampaign = async () => {
    try {
      await axios.post(`${API}/ads/campaigns`, newCampaign, getToken());
      toast.success(t('campaign_created', 'تم إنشاء الحملة'));
      setShowCreateCampaign(false);
      setNewCampaign({ name: '', description: '', start_date: '', end_date: '', budget: 0, ad_ids: [], positions: [], auto_renew: false, free_trial_days: 0, status: 'draft' });
      fetchCampaigns();
    } catch (err) { toast.error(err.response?.data?.detail || t('sa_failed', 'فشل')); }
  };

  const handleCampaignAction = async (id, action, extraData = {}) => {
    try {
      if (action === 'delete') {
        if (!window.confirm(t('campaign_confirm_delete', 'حذف الحملة؟'))) return;
        await axios.delete(`${API}/ads/campaigns/${id}`, getToken());
      } else if (action === 'renew') {
        await axios.post(`${API}/ads/campaigns/${id}/renew`, extraData, getToken());
      } else {
        await axios.put(`${API}/ads/campaigns/${id}`, { status: action }, getToken());
      }
      toast.success(t('sa_updated', 'تم التحديث'));
      fetchCampaigns();
      fetchAds();
    } catch { toast.error(t('sa_failed', 'فشل')); }
  };

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
              { id: 'companies', label: t('sa_companies', 'إدارة الشركات') },
              { id: 'codes', label: t('sa_sub_codes', 'أكواد الاشتراك') },
              { id: 'coupons', label: t('sa_coupons', 'كوبونات الخصم') },
              { id: 'user_subs', label: t('sa_user_subs', 'اشتراكات المستخدمين') },
            ] : []),
            { id: 'ads', label: t('sa_ads_management', 'إدارة الإعلانات') },
            { id: 'advertiser_ads', label: t('sa_advertiser_ads', 'إعلانات المعلنين') },
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
              <button key={c.id} type="button" onClick={() => setSelectedCompound(c.id)} className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10 transition-all cursor-pointer text-right group" data-testid={`compound-${c.id}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-600/20 group-hover:bg-purple-500/30 transition-colors"><BuildingOfficeIcon className="h-5 w-5 text-purple-400" /></div>
                  <h3 className="font-bold text-lg flex-1">{c.name}</h3>
                  <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">{t('sa_view_details', 'عرض التفاصيل ←')}</span>
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
              </button>
            ))}
            {compounds.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-500">{t("sp_no_compounds", "لا توجد مجتمعات سكنية")}</div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <UsersTab
            t={t}
            roleLabels={roleLabels}
            roleColors={roleColors}
            compounds={compounds}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            compoundFilter={compoundFilter}
            setCompoundFilter={setCompoundFilter}
            filteredUsers={filteredUsers}
            setUsers={setUsers}
            setEditUser={setEditUser}
            handleChangeRole={handleChangeRole}
            fetchDashboard={fetchDashboard}
          />
        )}

        {/* Codes Tab */}
        {activeTab === 'codes' && (
          <CodesTab
            t={t}
            codeStats={codeStats}
            codes={codes}
            showCreateCode={showCreateCode}
            setShowCreateCode={setShowCreateCode}
            newCode={newCode}
            setNewCode={setNewCode}
            bulkCount={bulkCount}
            setBulkCount={setBulkCount}
            handleCreateCode={handleCreateCode}
            handleToggleCode={handleToggleCode}
            handleDeleteCode={handleDeleteCode}
            setEditCode={setEditCode}
            fetchCodes={fetchCodes}
          />
        )}

        {/* Coupons Tab */}
        {activeTab === 'coupons' && (
          <CouponsTab
            t={t}
            couponStats={couponStats}
            coupons={coupons}
            showCreateCoupon={showCreateCoupon}
            setShowCreateCoupon={setShowCreateCoupon}
            newCoupon={newCoupon}
            setNewCoupon={setNewCoupon}
            handleCreateCoupon={handleCreateCoupon}
            handleToggleCoupon={handleToggleCoupon}
            handleDeleteCoupon={handleDeleteCoupon}
            setEditCoupon={setEditCoupon}
          />
        )}

        {/* Ads Tab */}
        {activeTab === 'ads' && (
          <AdsTab
            t={t}
            isSuperAdminOnly={isSuperAdminOnly}
            ads={ads}
            adStats={adStats}
            adSettings={adSettings}
            setAdSettings={setAdSettings}
            showCreateAd={showCreateAd}
            setShowCreateAd={setShowCreateAd}
            newAd={newAd}
            setNewAd={setNewAd}
            handleCreateAd={handleCreateAd}
            handleToggleAd={handleToggleAd}
            handleDeleteAd={handleDeleteAd}
            editAd={editAd}
            setEditAd={setEditAd}
            handleUpdateAd={handleUpdateAd}
            campaigns={campaigns}
            campaignStats={campaignStats}
            showCreateCampaign={showCreateCampaign}
            setShowCreateCampaign={setShowCreateCampaign}
            newCampaign={newCampaign}
            setNewCampaign={setNewCampaign}
            handleCreateCampaign={handleCreateCampaign}
            handleCampaignAction={handleCampaignAction}
          />
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

        {/* User Subscriptions Tab — Hierarchical */}
        {activeTab === 'user_subs' && (
          <HierarchicalSubs t={t} onOpenCompound={(id) => setSelectedCompound(id)} />
        )}

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <CompaniesTab t={t} />
        )}

        {activeTab === 'advertiser_ads' && (
          <AdvertiserAdsTab t={t} />
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
                if (!editUser.full_name?.trim()) { toast.error(t('sa_name_required', 'الاسم مطلوب')); return; }
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
                  fetchDashboard();
                } catch (err) {
                  console.error('Update user error:', err);
                  toast.error(err.response?.data?.detail || t('sa_failed', 'فشل'));
                }
              }} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500" data-testid="save-edit-user">{t('cs_confirm', 'تأكيد')}</button>
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

      {/* Compound Detail Modal */}
      {selectedCompound && (
        <CompoundDetailModal compoundId={selectedCompound} onClose={() => setSelectedCompound(null)} t={t} isSuperAdminOnly={isSuperAdminOnly} />
      )}
    </div>
  );
};

export default SuperAdminPanel;
