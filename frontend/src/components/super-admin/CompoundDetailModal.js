import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/**
 * CompoundDetailModal — عرض تفاصيل شاملة لمجتمع سكني مع إمكانية التحكم
 */
const CompoundDetailModal = ({ compoundId, onClose, t, isSuperAdminOnly }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!compoundId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/super-admin/compounds/${compoundId}/full-details`, getToken());
        setData(res.data);
      } catch (err) {
        toast.error(err.response?.data?.detail || t('cd_load_failed', 'فشل تحميل التفاصيل'));
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [compoundId, onClose, t, refreshKey]);

  const reload = () => setRefreshKey(k => k + 1);

  const handleChangeRole = async (userId, newRole) => {
    try {
      // نستخدم super-admin endpoint الذي يدعم كل المجتمعات (وليس مقيد بمجمع المستخدم الحالي)
      await axios.put(`${API}/super-admin/users/${userId}/role?role=${newRole}`, {}, getToken());
      toast.success(t('cd_role_changed', 'تم تغيير الدور'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('cd_failed', 'فشل'));
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(t('cd_confirm_delete_user', `هل تريدين حذف ${u.full_name || u.username}؟`))) return;
    try {
      await axios.delete(`${API}/admin/users/${u.id}`, getToken());
      toast.success(t('cd_user_deleted', 'تم حذف المستخدم'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('cd_failed', 'فشل'));
    }
  };

  const handleToggleUserActive = async (u) => {
    try {
      await axios.put(`${API}/admin/users/${u.id}/status`, { is_active: !u.is_active }, getToken());
      toast.success(u.is_active ? t('cd_user_disabled', 'تم تعطيل المستخدم') : t('cd_user_enabled', 'تم تفعيل المستخدم'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('cd_failed', 'فشل'));
    }
  };

  const handleUpdateUserField = async (userId, field, value) => {
    try {
      await axios.put(`${API}/database/users/${userId}`, { [field]: value }, getToken());
      toast.success(t('cd_updated', 'تم التحديث'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('cd_failed', 'فشل'));
    }
  };

  if (!compoundId) return null;

  const roleLabels = {
    resident: t('cd_role_resident', 'ساكن'),
    admin: t('cd_role_admin', 'مدير'),
    manager: t('cd_role_manager', 'مدير المجتمع'),
    company_admin: t('cd_role_company_admin', 'مدير الشركة'),
    security: t('cd_role_security', 'أمن'),
    family_head: t('cd_role_family_head', 'رب أسرة'),
    family_member: t('cd_role_family_member', 'فرد أسرة'),
    super_admin: t('cd_role_super_admin', 'سوبر أدمن'),
    app_owner: t('cd_role_app_owner', 'مالك'),
  };

  const roleColors = {
    resident: 'bg-blue-500/20 text-blue-400',
    admin: 'bg-purple-500/20 text-purple-400',
    manager: 'bg-purple-600/20 text-purple-400',
    company_admin: 'bg-purple-700/20 text-purple-300',
    security: 'bg-amber-500/20 text-amber-400',
    family_head: 'bg-pink-500/20 text-pink-400',
    family_member: 'bg-rose-400/20 text-rose-400',
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center p-4 z-50 overflow-y-auto" onClick={onClose} data-testid="compound-detail-modal">
      <div className="bg-gray-800 rounded-2xl border border-blue-500/30 max-w-6xl w-full my-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {loading || !data ? (
          <div className="p-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-400"></div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-5 border-b border-gray-700 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-xl">🏢</div>
                <div>
                  <h2 className="text-xl font-bold text-white">{data.compound.name}</h2>
                  <p className="text-xs text-gray-400">{data.compound.location || data.compound.address || t('cd_no_address', '—')}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl" data-testid="close-compound-modal">×</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-700 px-5 bg-gray-900/40 overflow-x-auto">
              {[
                { id: 'overview', label: t('cd_overview', 'نظرة عامة'), icon: '📊' },
                { id: 'users', label: `${t('cd_users', 'المستخدمون')} (${data.stats.total_users})`, icon: '👥' },
                { id: 'families', label: `${t('cd_families', 'العائلات')} (${data.stats.families})`, icon: '👨‍👩‍👧' },
                { id: 'complaints', label: `${t('cd_complaints', 'الشكاوى')} (${data.stats.complaints_open})`, icon: '⚠️' },
                { id: 'services', label: `${t('cd_services', 'الخدمات')} (${data.stats.services_count})`, icon: '🛎️' },
                { id: 'ads', label: `${t('cd_ads', 'الإعلانات')} (${data.stats.ads_count})`, icon: '📢' },
                ...(!isSuperAdminOnly ? [{ id: 'budget', label: t('cd_budget', 'الميزانية'), icon: '💰' }] : []),
                { id: 'security', label: `${t('cd_security', 'الأمن')} (${data.stats.incidents_open})`, icon: '🛡️' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveView(tab.id)}
                  className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${activeView === tab.id ? 'border-blue-400 text-blue-300' : 'border-transparent text-gray-400 hover:text-white'}`}
                  data-testid={`cd-tab-${tab.id}`}
                >
                  <span className="me-1">{tab.icon}</span>{tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-5 max-h-[65vh] overflow-y-auto">
              {/* Overview */}
              {activeView === 'overview' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="cd-overview-content">
                  {[
                    { label: t('cd_total_users', 'إجمالي المستخدمين'), value: data.stats.total_users, color: 'text-blue-400', icon: '👥' },
                    { label: t('cd_residents', 'السكان'), value: data.stats.residents, color: 'text-cyan-400', icon: '🏠' },
                    { label: t('cd_managers_count', 'المديرون'), value: data.stats.managers, color: 'text-purple-400', icon: '👔' },
                    { label: t('cd_security_staff', 'الأمن'), value: data.stats.security, color: 'text-amber-400', icon: '🛡️' },
                    { label: t('cd_families_count', 'العائلات'), value: data.stats.families, color: 'text-pink-400', icon: '👨‍👩‍👧' },
                    { label: t('cd_open_complaints', 'شكاوى مفتوحة'), value: data.stats.complaints_open, color: 'text-red-400', icon: '⚠️' },
                    { label: t('cd_services_active', 'خدمات'), value: data.stats.services_count, color: 'text-green-400', icon: '🛎️' },
                    { label: t('cd_ads_running', 'إعلانات نشطة'), value: data.stats.ads_count, color: 'text-emerald-400', icon: '📢' },
                  ].map((s, i) => (
                    <div key={i} className="bg-gray-900 rounded-xl border border-gray-700 p-4 text-center">
                      <div className="text-2xl mb-1">{s.icon}</div>
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                  {data.subscription && (
                    <div className="col-span-2 md:col-span-4 bg-gradient-to-r from-emerald-900/40 to-green-900/40 border border-emerald-500/30 rounded-xl p-4">
                      <p className="text-xs text-emerald-400 font-bold mb-1">🎟️ {t('cd_subscription', 'الاشتراك الحالي')}</p>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="text-sm text-white font-bold">{data.subscription.plan_name || data.subscription.plan || 'N/A'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${data.subscription.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {data.subscription.status || 'unknown'}
                        </span>
                        {data.subscription.expires_at && <span className="text-[11px] text-gray-400">{t('cd_expires', 'ينتهي')}: {String(data.subscription.expires_at).slice(0, 10)}</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Users by role */}
              {activeView === 'users' && (
                <div className="space-y-4" data-testid="cd-users-content">
                  {Object.entries(data.users_by_role).map(([role, users]) => (
                    <div key={role} className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
                      <div className="px-4 py-2.5 bg-gray-800 flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${roleColors[role] || 'bg-gray-600 text-gray-200'}`}>
                          {roleLabels[role] || role} · {users.length}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-700/50">
                        {users.map(u => (
                          <div key={u.id} className="px-4 py-3 hover:bg-gray-800/50" data-testid={`cd-user-row-${u.id}`}>
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${u.is_active === false ? 'bg-gray-600 opacity-50' : 'bg-gradient-to-br from-blue-600 to-purple-600'}`}>
                                  {(u.full_name || u.username || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className={`text-sm font-medium truncate ${u.is_active === false ? 'text-gray-500 line-through' : 'text-white'}`}>{u.full_name || u.username}</p>
                                    {u.is_active === false && <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">{t('cd_inactive', 'معطل')}</span>}
                                    {u.unit_number && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">{t('cd_unit', 'وحدة')} {u.unit_number}</span>}
                                  </div>
                                  <p className="text-[10px] text-gray-400 truncate">{u.email} {u.phone && `· ${u.phone}`}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <select
                                  value={u.role}
                                  onChange={(e) => handleChangeRole(u.id, e.target.value)}
                                  className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-[10px] text-white"
                                  data-testid={`cd-role-select-${u.id}`}
                                >
                                  {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                                <button
                                  onClick={() => {
                                    const newUnit = window.prompt(t('cd_enter_unit', 'رقم الوحدة الجديد:'), u.unit_number || '');
                                    if (newUnit !== null) handleUpdateUserField(u.id, 'unit_number', newUnit);
                                  }}
                                  className="px-2 py-1 text-[10px] bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30"
                                  data-testid={`cd-edit-unit-${u.id}`}
                                  title={t('cd_edit_unit', 'تعديل الوحدة')}
                                >
                                  🏠
                                </button>
                                <button
                                  onClick={() => handleToggleUserActive(u)}
                                  className={`px-2 py-1 text-[10px] rounded ${u.is_active === false ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' : 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'}`}
                                  data-testid={`cd-toggle-${u.id}`}
                                  title={u.is_active === false ? t('cd_activate', 'تفعيل') : t('cd_deactivate', 'تعطيل')}
                                >
                                  {u.is_active === false ? '▶' : '⏸'}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="px-2 py-1 text-[10px] bg-red-600/20 text-red-400 rounded hover:bg-red-600/30"
                                  data-testid={`cd-delete-user-${u.id}`}
                                  title={t('cd_delete_user', 'حذف')}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Families */}
              {activeView === 'families' && (
                <div className="space-y-2" data-testid="cd-families-content">
                  {data.families.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-8">{t('cd_no_families', 'لا توجد عائلات مسجلة')}</p>
                  ) : data.families.map(f => (
                    <div key={f.id} className="bg-gray-900 rounded-xl border border-gray-700 p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">👨‍👩‍👧 {f.family_name || f.name || `Family ${f.id.slice(0, 6)}`}</p>
                        <p className="text-[10px] text-gray-400">{t('cd_members', 'الأعضاء')}: {(f.members || []).length} · {t('cd_head', 'رب الأسرة')}: {f.head_name || '—'}</p>
                      </div>
                      {f.unit_number && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">{t('cd_unit', 'وحدة')} {f.unit_number}</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Complaints */}
              {activeView === 'complaints' && (
                <div className="space-y-2" data-testid="cd-complaints-content">
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-gray-900 rounded-xl p-3 text-center border border-red-500/30">
                      <p className="text-2xl font-black text-red-400">{data.stats.complaints_open}</p>
                      <p className="text-[10px] text-gray-400">{t('cd_open', 'مفتوحة')}</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-3 text-center border border-green-500/30">
                      <p className="text-2xl font-black text-green-400">{data.stats.complaints_resolved}</p>
                      <p className="text-[10px] text-gray-400">{t('cd_resolved', 'محلولة')}</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-3 text-center border border-blue-500/30">
                      <p className="text-2xl font-black text-blue-400">{data.stats.complaints_total}</p>
                      <p className="text-[10px] text-gray-400">{t('cd_total', 'الإجمالي')}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 font-bold mb-2">{t('cd_recent', 'أحدث الشكاوى')}:</p>
                  {data.recent_complaints.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-6">{t('cd_no_complaints', 'لا توجد شكاوى')}</p>
                  ) : data.recent_complaints.map(c => (
                    <div key={c.id} className="bg-gray-900 rounded-xl border border-gray-700 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-white">{c.title || c.subject || t('cd_untitled', 'بدون عنوان')}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.status === 'resolved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{c.status}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-2">{c.description || c.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Services */}
              {activeView === 'services' && (
                <div data-testid="cd-services-content">
                  {data.services.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-8">{t('cd_no_services', 'لا توجد خدمات مضافة لهذا المجتمع')}</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.services.map(s => (
                        <div key={s.id} className="bg-gray-900 rounded-xl border border-gray-700 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold text-white">🛎️ {s.name}</p>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'}`}>
                              {s.is_active ? t('cd_active', 'نشط') : t('cd_inactive', 'معطل')}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400">{s.description || '—'}</p>
                          {!isSuperAdminOnly && s.price && <p className="text-xs text-emerald-400 font-bold mt-1">{s.price} {t('cd_egp', 'ج.م')}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Ads */}
              {activeView === 'ads' && (
                <div className="space-y-2" data-testid="cd-ads-content">
                  {data.ads.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-8">{t('cd_no_ads', 'لا توجد إعلانات')}</p>
                  ) : data.ads.slice(0, 15).map(a => (
                    <div key={a.id} className="bg-gray-900 rounded-xl border border-gray-700 p-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">📢 {a.title}</p>
                        <p className="text-[10px] text-gray-400">{a.position} · {t('cd_views', 'مشاهدات')}: {a.views || 0} · {t('cd_clicks', 'نقرات')}: {a.clicks || 0}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${a.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {a.is_active ? t('cd_active', 'نشط') : t('cd_inactive', 'معطل')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Budget (owner only) */}
              {activeView === 'budget' && !isSuperAdminOnly && (
                <div data-testid="cd-budget-content">
                  {!data.budget ? (
                    <p className="text-center text-gray-500 text-sm py-8">{t('cd_no_budget', 'لا توجد ميزانية مسجلة لهذا المجتمع')}</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-gradient-to-br from-emerald-900/40 to-green-900/40 border border-emerald-500/30 rounded-xl p-4 text-center">
                        <p className="text-xs text-emerald-300">{t('cd_revenue', 'الإيرادات')}</p>
                        <p className="text-2xl font-black text-emerald-400 mt-1">{(data.budget.total_revenue || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400">{t('cd_egp', 'ج.م')}</p>
                      </div>
                      <div className="bg-gradient-to-br from-red-900/40 to-rose-900/40 border border-red-500/30 rounded-xl p-4 text-center">
                        <p className="text-xs text-red-300">{t('cd_expenses', 'المصاريف')}</p>
                        <p className="text-2xl font-black text-red-400 mt-1">{(data.budget.total_expenses || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400">{t('cd_egp', 'ج.م')}</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-xl p-4 text-center">
                        <p className="text-xs text-blue-300">{t('cd_net', 'الصافي')}</p>
                        <p className="text-2xl font-black text-blue-400 mt-1">{((data.budget.total_revenue || 0) - (data.budget.total_expenses || 0)).toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400">{t('cd_egp', 'ج.م')}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Security */}
              {activeView === 'security' && (
                <div className="text-center py-8" data-testid="cd-security-content">
                  <p className="text-4xl mb-2">🛡️</p>
                  <p className="text-lg font-bold text-white mb-1">{data.stats.incidents_open} {t('cd_open_incidents', 'حادث أمني مفتوح')}</p>
                  <p className="text-xs text-gray-400 mb-4">{t('cd_sec_hint', 'اذهبي إلى لوحة الأمان لإدارة الحوادث التفصيلية')}</p>
                  <button onClick={() => { window.location.href = '/app/security'; }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500">
                    {t('cd_go_security', 'الذهاب للوحة الأمان ←')}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CompoundDetailModal;
