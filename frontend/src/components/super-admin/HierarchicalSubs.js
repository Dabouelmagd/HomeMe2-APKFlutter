import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/**
 * HierarchicalSubs — نظرة هرمية (مجتمعات مستقلة → شركات إدارة → إجماليات أسفل)
 * CRUD كامل: إضافة/تعديل/حذف/تفعيل/تصدير/إرسال هدية لكل كمبوند ومستخدم
 */
const HierarchicalSubs = ({ t, onOpenCompound }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCompanies, setExpandedCompanies] = useState({});
  const [expandedCompounds, setExpandedCompounds] = useState({});
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [giftTarget, setGiftTarget] = useState(null);
  const [bulkOfferOpen, setBulkOfferOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({ days_before_expiry: 7, discount: 20, message: '' });
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [addUserCompound, setAddUserCompound] = useState(null); // holds compound object
  const [editCompound, setEditCompound] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    axios.get(`${API}/super-admin/hierarchical-subs`, getToken())
      .then(res => { if (alive) setData(res.data); })
      .catch(err => { if (alive) toast.error(err.response?.data?.detail || t('hs_load_failed', 'فشل تحميل البيانات')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [refreshKey, t]);

  const reload = () => setRefreshKey(k => k + 1);
  const toggleCompany = (id) => setExpandedCompanies(p => ({ ...p, [id]: !p[id] }));
  const toggleCompound = (id) => setExpandedCompounds(p => ({ ...p, [id]: !p[id] }));

  const roleLabel = (r) => ({
    resident: t('hs_r_resident','مقيم'),
    manager: t('hs_r_manager','إداري'),
    company_admin: t('hs_r_company_admin','مدير شركة'),
    admin: t('hs_r_admin','أدمن'),
    security: t('hs_r_security','أمن'),
    family_head: t('hs_r_family_head','رب أسرة'),
    family_member: t('hs_r_family_member','فرد أسرة'),
    app_owner: t('hs_r_app_owner','مالك التطبيق'),
    super_admin: t('hs_r_super_admin','مدير عام'),
  }[r] || r);

  const exportCsv = (rows, filename) => {
    if (!rows.length) { toast.error(t('hs_no_data','لا توجد بيانات')); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g,'""').replace(/[\r\n]+/g,' ')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const exportCompound = (comp) => {
    const rows = [];
    Object.entries(comp.users_by_role || {}).forEach(([role, users]) => {
      users.forEach(u => rows.push({
        name: u.full_name || u.username || '',
        email: u.email || '',
        phone: u.phone || '',
        role,
        sub_status: u.subscription?.status || (u.subscription_active ? 'active' : '-'),
        sub_plan: u.subscription?.plan || u.subscription_plan || '-',
        sub_end: (u.subscription?.end_date || u.subscription_end || '').substring(0,10) || '-',
      }));
    });
    exportCsv(rows, `compound-${comp.name}.csv`);
  };

  const exportCompany = (comp) => {
    const rows = [];
    (comp.compounds || []).forEach(cpd => {
      Object.entries(cpd.users_by_role || {}).forEach(([role, users]) => {
        users.forEach(u => rows.push({
          compound: cpd.name, name: u.full_name || u.username || '', email: u.email || '', role,
          sub_status: u.subscription?.status || '-',
          sub_end: (u.subscription?.end_date || '').substring(0,10) || '-',
        }));
      });
    });
    exportCsv(rows, `company-${comp.name}.csv`);
  };

  const exportAll = () => {
    if (!data) return;
    const rows = [];
    const addCompound = (cpd, companyName='-') => {
      Object.entries(cpd.users_by_role || {}).forEach(([role, users]) => {
        users.forEach(u => rows.push({
          company: companyName, compound: cpd.name,
          name: u.full_name || u.username || '', email: u.email || '', phone: u.phone || '', role,
          sub_status: u.subscription?.status || '-',
          sub_plan: u.subscription?.plan || '-',
          sub_end: (u.subscription?.end_date || '').substring(0,10) || '-',
        }));
      });
    };
    (data.companies||[]).forEach(co => (co.compounds||[]).forEach(cpd => addCompound(cpd, co.name)));
    (data.independent_compounds||[]).forEach(cpd => addCompound(cpd, '—'));
    exportCsv(rows, 'hierarchical-subscriptions.csv');
  };

  // Filtering
  const matchesFilter = (u, role) => {
    if (filterRole && role !== filterRole) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q)
        || (u.username || '').toLowerCase().includes(q)
        || (u.email || '').toLowerCase().includes(q);
  };
  const filterCompound = (cpd) => {
    const users_by_role = {};
    Object.entries(cpd.users_by_role || {}).forEach(([role, users]) => {
      const filtered = users.filter(u => matchesFilter(u, role));
      if (filtered.length) users_by_role[role] = filtered;
    });
    const total = Object.values(users_by_role).reduce((a,b) => a+b.length, 0);
    return { ...cpd, users_by_role, _filtered_total: total };
  };
  const filteredData = useMemo(() => {
    if (!data) return null;
    const empty = !search && !filterRole;
    const companies = (data.companies||[]).map(co => ({
      ...co,
      compounds: (co.compounds||[]).map(filterCompound).filter(cpd => empty ? true : cpd._filtered_total > 0),
    })).filter(co => empty ? true : co.compounds.length > 0);
    const independent = (data.independent_compounds||[]).map(filterCompound).filter(cpd => empty ? true : cpd._filtered_total > 0);
    return { ...data, companies, independent_compounds: independent };
  }, [data, search, filterRole]);

  // ------- Gift sending -------
  const [giftForm, setGiftForm] = useState({ type: 'extend_trial', days: 7, discount: 20, plan: 'basic', message: '' });

  const submitGift = async () => {
    if (!giftTarget) return;
    const details = {};
    if (giftForm.type === 'extend_trial') details.days = parseInt(giftForm.days) || 7;
    else if (giftForm.type === 'free_subscription') { details.days = parseInt(giftForm.days) || 30; details.plan = giftForm.plan; }
    else if (giftForm.type === 'discount_coupon') details.discount = parseInt(giftForm.discount) || 20;
    const payload = { type: giftForm.type, details, message: giftForm.message || '' };
    try {
      let sent = 0;
      for (const uid of giftTarget.ids) {
        await axios.post(`${API}/super-admin/users/${uid}/send-gift`, payload, getToken());
        sent += 1;
      }
      toast.success(`${t('hs_gift_sent','تم إرسال الهدية إلى')} ${sent} ${t('hs_users','مستخدم')}`, { id: 'hs-gift-sent' });
      setGiftTarget(null);
      setGiftForm({ type: 'extend_trial', days: 7, discount: 20, plan: 'basic', message: '' });
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('hs_gift_failed','فشل الإرسال'));
    }
  };

  const openGiftForUser = (u) => setGiftTarget({ scope: 'user', ids: [u.id], name: u.full_name || u.username });
  const openGiftForCompound = (cpd) => setGiftTarget({ scope: 'compound', ids: Object.values(cpd.users_by_role||{}).flat().map(u => u.id).filter(Boolean), name: cpd.name });
  const openGiftForCompany = (co) => {
    const ids = [];
    (co.compounds||[]).forEach(cpd => Object.values(cpd.users_by_role||{}).flat().forEach(u => u.id && ids.push(u.id)));
    setGiftTarget({ scope: 'company', ids, name: co.name });
  };

  // ------- Delete user -------
  const deleteUser = async (userId, userName) => {
    if (!window.confirm(`${t('hs_confirm_delete','هل أنت متأكد من حذف ')}${userName}؟`)) return;
    try {
      await axios.delete(`${API}/database/users/${userId}`, getToken());
      toast.success(t('hs_deleted','تم الحذف'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('hs_delete_failed','فشل الحذف'));
    }
  };

  // ------- Activate/Deactivate user subscription -------
  const toggleUserSub = async (u) => {
    const action = u.subscription_active ? 'deactivate' : 'activate';
    try {
      await axios.put(`${API}/owner/user-subscriptions/${u.id}`, { action, days: 365, plan: u.subscription_plan || 'basic' }, getToken());
      toast.success(action === 'activate' ? t('hs_activated','تم التفعيل') : t('hs_deactivated','تم إلغاء التفعيل'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('hs_action_failed','فشل'));
    }
  };

  // ------- Save user edit -------
  const saveUserEdit = async () => {
    if (!editUser?.id) return;
    try {
      const payload = {
        full_name: editUser.full_name || '',
        email: editUser.email || '',
        phone: editUser.phone || '',
        role: editUser.role || 'resident',
      };
      await axios.put(`${API}/database/users/${editUser.id}`, payload, getToken());
      toast.success(t('hs_user_updated','تم تحديث المستخدم'));
      setEditUser(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('hs_update_failed','فشل التحديث'));
    }
  };

  // ------- Create user in compound -------
  const saveNewUser = async (form) => {
    try {
      const payload = { ...form, compound_id: addUserCompound?.id };
      await axios.post(`${API}/super-admin/users`, payload, getToken());
      toast.success(t('hs_user_created','تم إنشاء المستخدم'));
      setAddUserCompound(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('hs_create_failed','فشل الإنشاء'));
    }
  };

  // ------- Save compound edit -------
  const saveCompoundEdit = async () => {
    if (!editCompound?.id) return;
    try {
      const payload = {
        name: editCompound.name || '',
        address: editCompound.location || editCompound.address || '',
        description: editCompound.description || '',
      };
      await axios.put(`${API}/compounds/${editCompound.id}`, payload, getToken());
      toast.success(t('hs_compound_updated','تم تحديث المجمع'));
      setEditCompound(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('hs_update_failed','فشل التحديث'));
    }
  };

  // ------- Bulk renewal offer -------
  const openBulkOffer = async () => {
    setBulkOfferOpen(true);
    setBulkLoading(true);
    try {
      const res = await axios.post(`${API}/super-admin/bulk-renewal-offer/preview?days_before_expiry=${bulkForm.days_before_expiry}`, {}, getToken());
      setBulkPreview(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || t('hs_preview_failed','فشل جلب القائمة'));
    } finally { setBulkLoading(false); }
  };
  const refreshBulkPreview = async (days) => {
    setBulkLoading(true);
    try {
      const res = await axios.post(`${API}/super-admin/bulk-renewal-offer/preview?days_before_expiry=${days}`, {}, getToken());
      setBulkPreview(res.data);
    } catch (err) { toast.error(t('hs_preview_failed','فشل')); }
    finally { setBulkLoading(false); }
  };
  const submitBulkOffer = async () => {
    try {
      const user_ids = (bulkPreview?.targets || []).map(x => x.user_id);
      const res = await axios.post(`${API}/super-admin/bulk-renewal-offer/send`, {
        days_before_expiry: parseInt(bulkForm.days_before_expiry) || 7,
        discount: parseInt(bulkForm.discount) || 20,
        message: bulkForm.message || '', user_ids,
      }, getToken());
      const d = res.data || {};
      toast.success(`${t('hs_bulk_sent','تم إرسال')} ${d.sent || 0} ${t('hs_offers','عرض')} (${d.emails_sent || 0} ${t('hs_emails','بريد')})`, { id: 'hs-bulk-sent' });
      setBulkOfferOpen(false); setBulkPreview(null);
      setBulkForm({ days_before_expiry: 7, discount: 20, message: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || t('hs_bulk_failed','فشل الإرسال'));
    }
  };

  // ------- Render -------
  if (loading) return <div className="text-center text-gray-400 py-12">{t('hs_loading','جاري التحميل...')}</div>;
  if (!filteredData) return <div className="text-center text-gray-400 py-12">{t('hs_no_data','لا توجد بيانات')}</div>;
  const totals = data.totals || {};

  const commonProps = {
    onOpenCompound, exportCompound, openGiftForCompound, openGiftForUser, deleteUser,
    toggleUserSub, setEditUser, setAddUserCompound, setEditCompound,
    t, roleLabel, toggleCompound,
  };

  return (
    <div data-testid="hierarchical-subs-tab" className="space-y-5">

      {/* Top action bar (no totals here — moved to bottom per user request) */}
      <div className="flex flex-wrap gap-3 items-center justify-between pb-2" data-testid="hs-action-bar">
        <div className="flex flex-wrap gap-2 items-center flex-1 min-w-[280px]">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('hs_search','ابحث بالاسم أو الإيميل...')} className="flex-1 min-w-[200px] bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-search-input" />
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-role-filter">
            <option value="">{t('hs_all_roles','كل الأدوار')}</option>
            <option value="resident">{roleLabel('resident')}</option>
            <option value="manager">{roleLabel('manager')}</option>
            <option value="company_admin">{roleLabel('company_admin')}</option>
            <option value="security">{roleLabel('security')}</option>
            <option value="family_head">{roleLabel('family_head')}</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={openBulkOffer} className="px-3 py-1.5 text-xs bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white rounded-lg font-semibold shadow-lg shadow-pink-500/20" data-testid="hs-bulk-offer-btn">🎯 {t('hs_bulk_renewal','عرض تجديد جماعي')}</button>
          <button onClick={exportAll} className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold" data-testid="hs-export-all-btn">⬇ {t('hs_export_all','تصدير الكل')}</button>
          <button onClick={reload} className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg" data-testid="hs-reload-btn">↻</button>
        </div>
      </div>

      {/* 1) Independent compounds FIRST */}
      {filteredData.independent_compounds.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-2xl">🏘️</span>
            <h3 className="text-base font-bold text-gray-200">{t('hs_independent','مجتمعات مستقلة')}</h3>
            <span className="text-[11px] text-purple-300 bg-purple-600/20 px-2 py-0.5 rounded">{filteredData.independent_compounds.length}</span>
          </div>
          {filteredData.independent_compounds.map(cpd => (
            <CompoundRow key={cpd.id} cpd={cpd} expanded={expandedCompounds[cpd.id]} standalone {...commonProps} />
          ))}
        </section>
      )}

      {/* 2) Management companies SECOND */}
      {filteredData.companies.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="text-2xl">🏢</span>
            <h3 className="text-base font-bold text-gray-200">{t('hs_management_companies','شركات الإدارة')}</h3>
            <span className="text-[11px] text-blue-300 bg-blue-600/20 px-2 py-0.5 rounded">{filteredData.companies.length}</span>
          </div>
          {filteredData.companies.map(co => (
            <div key={co.id} className="bg-gradient-to-br from-blue-900/20 to-gray-800 border border-blue-700/30 rounded-xl overflow-hidden" data-testid={`hs-company-${co.id}`}>
              <div className="flex items-center justify-between p-4 hover:bg-blue-900/20 cursor-pointer" onClick={() => toggleCompany(co.id)}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏢</span>
                  <div>
                    <div className="font-bold text-white">{co.name}</div>
                    <div className="text-[11px] text-gray-400">{co.email || ''} • {(co.compounds||[]).length} {t('hs_compounds_in','مجتمع')}</div>
                  </div>
                </div>
                <div className="flex gap-2 items-center" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openGiftForCompany(co)} className="px-2 py-1 text-[11px] bg-pink-600/20 text-pink-300 rounded hover:bg-pink-600/30" data-testid={`hs-gift-company-${co.id}`}>🎁 {t('hs_send_gift','هدية')}</button>
                  <button onClick={() => exportCompany(co)} className="px-2 py-1 text-[11px] bg-emerald-600/20 text-emerald-300 rounded hover:bg-emerald-600/30">⬇ CSV</button>
                  <span className="text-blue-400 text-xl">{expandedCompanies[co.id] ? '▾' : '▸'}</span>
                </div>
              </div>
              {expandedCompanies[co.id] && (
                <div className="px-4 pb-4 space-y-2 border-t border-blue-700/20">
                  {co.compounds.map(cpd => (
                    <CompoundRow key={cpd.id} cpd={cpd} expanded={expandedCompounds[cpd.id]} {...commonProps} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {filteredData.companies.length === 0 && filteredData.independent_compounds.length === 0 && (
        <div className="text-center text-gray-500 py-12">{t('hs_empty','لا توجد نتائج')}</div>
      )}

      {/* 3) Unified totals dashboard at the BOTTOM */}
      <section className="mt-6 pt-5 border-t-2 border-gray-700/50" data-testid="hs-totals-section">
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-2xl">📊</span>
          <h3 className="text-base font-bold text-gray-200">{t('hs_totals_title','الإجماليات الموحّدة')}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3" data-testid="hs-summary-cards">
          {[
            { label: t('hs_companies','شركات إدارة'), value: totals.companies||0, icon: '🏢', color: 'from-blue-600/25 to-blue-800/10 border-blue-600/40' },
            { label: t('hs_compounds','مجتمعات'), value: totals.compounds||0, icon: '🏘️', color: 'from-purple-600/25 to-purple-800/10 border-purple-600/40' },
            { label: t('hs_users','مستخدمون'), value: totals.total_users||0, icon: '👥', color: 'from-green-600/25 to-green-800/10 border-green-600/40' },
            { label: t('hs_residents','سكان'), value: totals.residents||0, icon: '🏠', color: 'from-cyan-600/25 to-cyan-800/10 border-cyan-600/40' },
            { label: t('hs_managers','مديرون'), value: totals.managers||0, icon: '👔', color: 'from-amber-600/25 to-amber-800/10 border-amber-600/40' },
            { label: t('hs_security','أمن'), value: totals.security||0, icon: '🛡️', color: 'from-red-600/25 to-red-800/10 border-red-600/40' },
            { label: t('hs_active_subs','اشتراكات نشطة'), value: totals.active_subs||0, icon: '✅', color: 'from-emerald-600/25 to-emerald-800/10 border-emerald-600/40' },
            { label: t('hs_expired_subs','اشتراكات منتهية'), value: totals.expired_subs||0, icon: '⛔', color: 'from-rose-600/25 to-rose-800/10 border-rose-600/40' },
          ].map((s,i) => (
            <div key={i} className={`bg-gradient-to-br ${s.color} border rounded-xl p-3 text-center`}>
              <div className="text-2xl mb-0.5">{s.icon}</div>
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-[10px] text-gray-400 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Gift modal */}
      {giftTarget && (
        <GiftModal target={giftTarget} form={giftForm} setForm={setGiftForm} onClose={() => setGiftTarget(null)} onSubmit={submitGift} t={t} />
      )}

      {/* Bulk renewal modal */}
      {bulkOfferOpen && (
        <BulkOfferModal form={bulkForm} setForm={setBulkForm} preview={bulkPreview} loading={bulkLoading}
          onRefresh={refreshBulkPreview} onClose={() => { setBulkOfferOpen(false); setBulkPreview(null); }}
          onSubmit={submitBulkOffer} t={t} />
      )}

      {/* Edit user modal */}
      {editUser && (
        <EditUserModal user={editUser} setUser={setEditUser} onClose={() => setEditUser(null)} onSave={saveUserEdit} t={t} roleLabel={roleLabel} />
      )}

      {/* Add user to compound modal */}
      {addUserCompound && (
        <AddUserModal compound={addUserCompound} onClose={() => setAddUserCompound(null)} onSave={saveNewUser} t={t} roleLabel={roleLabel} />
      )}

      {/* Edit compound modal */}
      {editCompound && (
        <EditCompoundModal compound={editCompound} setCompound={setEditCompound} onClose={() => setEditCompound(null)} onSave={saveCompoundEdit} t={t} />
      )}
    </div>
  );
};

// ==================== CompoundRow ====================
const CompoundRow = ({ cpd, expanded, standalone, onOpenCompound, exportCompound, openGiftForCompound, openGiftForUser, deleteUser, toggleUserSub, setEditUser, setAddUserCompound, setEditCompound, t, roleLabel, toggleCompound }) => {
  const wrapClass = standalone
    ? 'bg-gradient-to-br from-purple-900/20 to-gray-800 border border-purple-700/30 rounded-xl overflow-hidden'
    : 'bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden';
  return (
    <div className={wrapClass} data-testid={`hs-compound-${cpd.id}`}>
      <div className="flex items-center justify-between p-3 hover:bg-gray-800 cursor-pointer" onClick={() => toggleCompound(cpd.id)}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xl">🏘️</span>
          <div className="min-w-0">
            <div className="font-semibold text-white text-sm truncate">{cpd.name}</div>
            <div className="text-[11px] text-gray-400 truncate">
              {cpd.location || ''} • {cpd.stats?.total_users||0} {t('hs_users_short','م')}
              {cpd.stats?.residents ? ` • ${cpd.stats.residents} ${roleLabel('resident')}` : ''}
              {cpd.stats?.managers ? ` • ${cpd.stats.managers} ${roleLabel('manager')}` : ''}
              {cpd.stats?.security ? ` • ${cpd.stats.security} ${roleLabel('security')}` : ''}
            </div>
          </div>
        </div>
        <div className="flex gap-1.5 items-center flex-shrink-0" onClick={e => e.stopPropagation()}>
          {cpd.stats?.active_subs > 0 && <span className="text-[10px] text-emerald-300 bg-emerald-600/20 px-1.5 py-0.5 rounded">✓{cpd.stats.active_subs}</span>}
          {cpd.stats?.expired_subs > 0 && <span className="text-[10px] text-red-300 bg-red-600/20 px-1.5 py-0.5 rounded">✗{cpd.stats.expired_subs}</span>}
          {onOpenCompound && <button title={t('hs_view','عرض')} onClick={() => onOpenCompound(cpd.id)} className="px-2 py-1 text-[11px] bg-blue-600/20 text-blue-300 rounded hover:bg-blue-600/30" data-testid={`hs-view-compound-${cpd.id}`}>👁</button>}
          <button title={t('hs_edit','تعديل')} onClick={() => setEditCompound(cpd)} className="px-2 py-1 text-[11px] bg-amber-600/20 text-amber-300 rounded hover:bg-amber-600/30" data-testid={`hs-edit-compound-${cpd.id}`}>✏️</button>
          <button title={t('hs_add_user','إضافة مستخدم')} onClick={() => setAddUserCompound(cpd)} className="px-2 py-1 text-[11px] bg-green-600/20 text-green-300 rounded hover:bg-green-600/30" data-testid={`hs-add-user-${cpd.id}`}>➕</button>
          <button title={t('hs_send_gift','هدية')} onClick={() => openGiftForCompound(cpd)} className="px-2 py-1 text-[11px] bg-pink-600/20 text-pink-300 rounded hover:bg-pink-600/30" data-testid={`hs-gift-compound-${cpd.id}`}>🎁</button>
          <button title={t('hs_export_csv','تصدير')} onClick={() => exportCompound(cpd)} className="px-2 py-1 text-[11px] bg-emerald-600/20 text-emerald-300 rounded hover:bg-emerald-600/30">⬇</button>
          <span className="text-purple-400 mr-1">{expanded ? '▾' : '▸'}</span>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-700/50">
          {Object.entries(cpd.users_by_role || {}).map(([role, users]) => (
            <div key={role} className="px-3 py-2">
              <div className="text-[11px] text-gray-400 mb-1 font-semibold flex items-center gap-2">
                <span>{roleLabel(role)}</span>
                <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">{users.length}</span>
              </div>
              <div className="space-y-1">
                {users.map(u => (
                  <UserRow key={u.id} u={u} openGiftForUser={openGiftForUser} deleteUser={deleteUser} toggleUserSub={toggleUserSub} setEditUser={setEditUser} t={t} />
                ))}
              </div>
            </div>
          ))}
          {Object.keys(cpd.users_by_role || {}).length === 0 && (
            <div className="px-3 py-6 text-center text-gray-500 text-xs">
              {t('hs_no_users_yet','لا يوجد مستخدمون في هذا المجمع بعد.')}
              <button onClick={() => setAddUserCompound(cpd)} className="ml-2 text-green-400 hover:underline">{t('hs_add_first_user','إضافة أول مستخدم')}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== UserRow ====================
const UserRow = ({ u, openGiftForUser, deleteUser, toggleUserSub, setEditUser, t }) => (
  <div className="flex items-center justify-between bg-gray-800/60 rounded px-2 py-1.5 text-xs hover:bg-gray-800" data-testid={`hs-user-${u.id}`}>
    <div className="flex-1 min-w-0">
      <span className="text-white font-medium">{u.full_name || u.username}</span>
      <span className="text-gray-500 mx-2">•</span>
      <span className="text-gray-400 truncate">{u.email || u.phone || '-'}</span>
      {u.subscription_active && <span className="ml-2 text-[10px] text-emerald-300 bg-emerald-600/20 px-1.5 py-0.5 rounded">{t('hs_active','نشط')}</span>}
      {!u.subscription_active && u.subscription_plan && <span className="ml-2 text-[10px] text-red-300 bg-red-600/20 px-1.5 py-0.5 rounded">{t('hs_expired','منتهي')}</span>}
      {u.subscription_plan && <span className="ml-1 text-[10px] text-blue-300 bg-blue-600/20 px-1.5 py-0.5 rounded">{u.subscription_plan}</span>}
    </div>
    <div className="flex gap-1 flex-shrink-0">
      <button title={t('hs_edit','تعديل')} onClick={() => setEditUser({ ...u })} className="px-1.5 py-0.5 text-[10px] bg-amber-600/20 text-amber-300 rounded hover:bg-amber-600/30" data-testid={`hs-edit-user-${u.id}`}>✏️</button>
      <button title={u.subscription_active ? t('hs_deactivate','إلغاء تفعيل') : t('hs_activate','تفعيل')} onClick={() => toggleUserSub(u)} className={`px-1.5 py-0.5 text-[10px] rounded ${u.subscription_active ? 'bg-slate-600/30 text-slate-200 hover:bg-slate-600/50' : 'bg-green-600/20 text-green-300 hover:bg-green-600/30'}`} data-testid={`hs-toggle-user-${u.id}`}>{u.subscription_active ? '⏸' : '▶'}</button>
      <button title={t('hs_send_gift','هدية')} onClick={() => openGiftForUser(u)} className="px-1.5 py-0.5 text-[10px] bg-pink-600/20 text-pink-300 rounded hover:bg-pink-600/30" data-testid={`hs-gift-user-${u.id}`}>🎁</button>
      <button title={t('hs_delete','حذف')} onClick={() => deleteUser(u.id, u.full_name || u.username)} className="px-1.5 py-0.5 text-[10px] bg-red-600/20 text-red-300 rounded hover:bg-red-600/30" data-testid={`hs-delete-user-${u.id}`}>🗑</button>
    </div>
  </div>
);

// ==================== GiftModal ====================
const GiftModal = ({ target, form, setForm, onClose, onSubmit, t }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-pink-700/40" onClick={e => e.stopPropagation()} data-testid="hs-gift-modal">
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">🎁 {t('hs_send_gift_to','إرسال عرض/هدية إلى')}</h3>
        <p className="text-xs text-gray-400 mt-1">{target.name} <span className="text-pink-400">({target.ids.length} {t('hs_recipients','مستلم')})</span></p>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">{t('hs_gift_type','نوع العرض')}</label>
        <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-gift-type">
          <option value="extend_trial">🕐 {t('hs_extend_trial','تمديد أيام اشتراك')}</option>
          <option value="free_subscription">✨ {t('hs_free_sub','اشتراك مجاني كامل')}</option>
          <option value="discount_coupon">💳 {t('hs_discount_coupon','كود خصم')}</option>
        </select>
      </div>
      {form.type === 'extend_trial' && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('hs_days','عدد الأيام')}</label>
          <input type="number" min="1" value={form.days} onChange={e => setForm({...form, days: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-gift-days" />
        </div>
      )}
      {form.type === 'free_subscription' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('hs_plan','الخطة')}</label>
            <select value={form.plan} onChange={e => setForm({...form, plan: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
              <option value="basic">basic</option><option value="pro">pro</option><option value="premium">premium</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('hs_days','عدد الأيام')}</label>
            <input type="number" min="1" value={form.days} onChange={e => setForm({...form, days: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
        </div>
      )}
      {form.type === 'discount_coupon' && (
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('hs_discount_pct','نسبة الخصم (%)')}</label>
          <input type="number" min="1" max="100" value={form.discount} onChange={e => setForm({...form, discount: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-gift-discount" />
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-400 mb-1">{t('hs_message','رسالة (اختياري)')}</label>
        <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} rows="2" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-gift-message" />
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onSubmit} className="flex-1 px-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-sm font-bold" data-testid="hs-gift-send-btn">{t('hs_send','إرسال')}</button>
        <button onClick={onClose} className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm">{t('hs_cancel','إلغاء')}</button>
      </div>
    </div>
  </div>
);

// ==================== BulkOfferModal ====================
const BulkOfferModal = ({ form, setForm, preview, loading, onRefresh, onClose, onSubmit, t }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-gray-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 border border-orange-500/30 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="hs-bulk-offer-modal">
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2">🎯 {t('hs_bulk_renewal','عرض تجديد جماعي')}</h3>
        <p className="text-xs text-gray-400 mt-1">{t('hs_bulk_desc','إرسال كود خصم تلقائي لجميع المستخدمين الذين تنتهي اشتراكاتهم قريبًا.')}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('hs_days_before','الأيام قبل انتهاء الاشتراك')}</label>
          <input type="number" min="1" max="90" value={form.days_before_expiry} onChange={e => { const v = e.target.value; setForm({...form, days_before_expiry: v}); onRefresh(parseInt(v)||7); }} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-bulk-days" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('hs_discount_pct','نسبة الخصم (%)')}</label>
          <input type="number" min="1" max="90" value={form.discount} onChange={e => setForm({...form, discount: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-bulk-discount" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">{t('hs_message','رسالة (اختياري)')}</label>
        <textarea rows="2" value={form.message} onChange={e => setForm({...form, message: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-bulk-message" />
      </div>
      <div className="bg-gray-900/60 rounded-lg border border-gray-700 p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-gray-300">{t('hs_target_list','قائمة المستخدمين المستهدفين')}</span>
          <span className="text-xs text-orange-400 font-bold" data-testid="hs-bulk-count">{loading ? '...' : `${preview?.count || 0} ${t('hs_users','مستخدم')}`}</span>
        </div>
        {loading ? <div className="text-center text-gray-500 py-4 text-xs">{t('hs_loading','جاري التحميل...')}</div>
          : preview?.targets?.length > 0 ? (
            <div className="max-h-56 overflow-y-auto space-y-1" data-testid="hs-bulk-preview-list">
              {preview.targets.map(u => (
                <div key={u.user_id} className="flex justify-between items-center bg-gray-800 rounded px-2 py-1.5 text-xs">
                  <div className="flex-1 min-w-0"><span className="text-white font-medium">{u.full_name}</span><span className="text-gray-500 mx-2">•</span><span className="text-gray-400">{u.email || '-'}</span></div>
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] bg-blue-600/20 text-blue-300 px-1.5 py-0.5 rounded">{u.plan || '-'}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${u.days_left <= 2 ? 'bg-red-600/20 text-red-300' : 'bg-amber-600/20 text-amber-300'}`}>{u.days_left}{t('hs_d','ي')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-center text-gray-500 py-4 text-xs">{t('hs_no_targets','لا يوجد مستخدمون تنتهي اشتراكاتهم خلال المدة المحددة.')}</div>}
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onSubmit} disabled={!preview?.count} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold ${preview?.count ? 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`} data-testid="hs-bulk-send-btn">{t('hs_send_to_all','إرسال للكل')} ({preview?.count || 0})</button>
        <button onClick={onClose} className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm">{t('hs_cancel','إلغاء')}</button>
      </div>
    </div>
  </div>
);

// ==================== EditUserModal ====================
const EditUserModal = ({ user, setUser, onClose, onSave, t, roleLabel }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-amber-500/30" onClick={e => e.stopPropagation()} data-testid="hs-edit-user-modal">
      <h3 className="text-lg font-bold text-white">✏️ {t('hs_edit_user','تعديل المستخدم')}</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('hs_full_name','الاسم الكامل')}</label>
          <input value={user.full_name || ''} onChange={e => setUser({...user, full_name: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-edit-fullname" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('hs_email','البريد الإلكتروني')}</label>
          <input type="email" value={user.email || ''} onChange={e => setUser({...user, email: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-edit-email" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('hs_phone','الهاتف')}</label>
          <input value={user.phone || ''} onChange={e => setUser({...user, phone: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('hs_role','الدور')}</label>
          <select value={user.role || 'resident'} onChange={e => setUser({...user, role: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-edit-role">
            {['resident','manager','company_admin','admin','security','family_head','family_member'].map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onSave} className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-bold" data-testid="hs-edit-save-btn">{t('hs_save','حفظ')}</button>
        <button onClick={onClose} className="px-4 py-2.5 bg-gray-700 text-gray-200 rounded-lg text-sm">{t('hs_cancel','إلغاء')}</button>
      </div>
    </div>
  </div>
);

// ==================== AddUserModal ====================
const AddUserModal = ({ compound, onClose, onSave, t, roleLabel }) => {
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '', phone: '', role: 'resident', unit_number: '' });
  const submit = () => {
    if (!form.username || !form.email || !form.password || !form.full_name) {
      toast.error(t('hs_required_fields','الاسم واسم المستخدم والبريد وكلمة المرور مطلوبة'));
      return;
    }
    if (form.password.length < 6) { toast.error(t('hs_pw_short','كلمة المرور قصيرة جدًا (6 أحرف على الأقل)')); return; }
    onSave(form);
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-green-500/30 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="hs-add-user-modal">
        <div>
          <h3 className="text-lg font-bold text-white">➕ {t('hs_add_new_user','إضافة مستخدم جديد')}</h3>
          <p className="text-xs text-gray-400 mt-1">{t('hs_in_compound','في مجمع')}: <span className="text-green-400">{compound.name}</span></p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('hs_full_name','الاسم الكامل')} *</label>
            <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-add-fullname" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('hs_username','اسم المستخدم')} *</label>
              <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-add-username" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('hs_role','الدور')}</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-add-role">
                {['resident','manager','company_admin','admin','security','family_head','family_member'].map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('hs_email','البريد الإلكتروني')} *</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-add-email" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('hs_password','كلمة المرور')} * (6+ chars)</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-add-password" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('hs_phone','الهاتف')}</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('hs_unit','رقم الوحدة')}</label>
              <input value={form.unit_number} onChange={e => setForm({...form, unit_number: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={submit} className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold" data-testid="hs-add-save-btn">{t('hs_create','إنشاء')}</button>
          <button onClick={onClose} className="px-4 py-2.5 bg-gray-700 text-gray-200 rounded-lg text-sm">{t('hs_cancel','إلغاء')}</button>
        </div>
      </div>
    </div>
  );
};

// ==================== EditCompoundModal ====================
const EditCompoundModal = ({ compound, setCompound, onClose, onSave, t }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-purple-500/30" onClick={e => e.stopPropagation()} data-testid="hs-edit-compound-modal">
      <h3 className="text-lg font-bold text-white">✏️ {t('hs_edit_compound','تعديل بيانات المجمع')}</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('hs_compound_name','اسم المجمع')}</label>
          <input value={compound.name || ''} onChange={e => setCompound({...compound, name: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-edit-compound-name" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('hs_location','الموقع / العنوان')}</label>
          <input value={compound.location || compound.address || ''} onChange={e => setCompound({...compound, location: e.target.value, address: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-edit-compound-location" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('hs_description','الوصف')}</label>
          <textarea rows="3" value={compound.description || ''} onChange={e => setCompound({...compound, description: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onSave} className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold" data-testid="hs-edit-compound-save-btn">{t('hs_save','حفظ')}</button>
        <button onClick={onClose} className="px-4 py-2.5 bg-gray-700 text-gray-200 rounded-lg text-sm">{t('hs_cancel','إلغاء')}</button>
      </div>
    </div>
  </div>
);

export default HierarchicalSubs;
