import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/**
 * HierarchicalSubs — عرض شجري: شركات الإدارة → المجتمعات → السكان/المديرين
 * مع إجماليات وبطاقات ملخص + تصدير CSV + إرسال هدية/عرض لكل مستوى
 */
const HierarchicalSubs = ({ t, onOpenCompound }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedCompanies, setExpandedCompanies] = useState({});
  const [expandedCompounds, setExpandedCompounds] = useState({});
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [giftTarget, setGiftTarget] = useState(null); // {scope, ids, name}
  const [bulkOfferOpen, setBulkOfferOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({ days_before_expiry: 7, discount: 20, message: '' });
  const [bulkPreview, setBulkPreview] = useState(null); // {targets, count}
  const [bulkLoading, setBulkLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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

  // ------- Helpers -------
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
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g,'""')}"`).join(','))].join('\n');
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
        sub_status: u.subscription?.status || '-',
        sub_plan: u.subscription?.plan || '-',
        sub_end: u.subscription?.end_date?.substring(0,10) || '-',
      }));
    });
    exportCsv(rows, `compound-${comp.name}.csv`);
  };

  const exportCompany = (comp) => {
    const rows = [];
    (comp.compounds || []).forEach(cpd => {
      Object.entries(cpd.users_by_role || {}).forEach(([role, users]) => {
        users.forEach(u => rows.push({
          compound: cpd.name,
          name: u.full_name || u.username || '',
          email: u.email || '',
          role,
          sub_status: u.subscription?.status || '-',
          sub_end: u.subscription?.end_date?.substring(0,10) || '-',
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
          company: companyName,
          compound: cpd.name,
          name: u.full_name || u.username || '',
          email: u.email || '',
          phone: u.phone || '',
          role,
          sub_status: u.subscription?.status || '-',
          sub_plan: u.subscription?.plan || '-',
          sub_end: u.subscription?.end_date?.substring(0,10) || '-',
        }));
      });
    };
    (data.companies||[]).forEach(co => (co.compounds||[]).forEach(cpd => addCompound(cpd, co.name)));
    (data.independent_compounds||[]).forEach(cpd => addCompound(cpd, '—'));
    exportCsv(rows, 'hierarchical-subscriptions.csv');
  };

  // ------- Filtering -------
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
    const companies = (data.companies||[]).map(co => ({
      ...co,
      compounds: (co.compounds||[]).map(filterCompound).filter(cpd => !search && !filterRole ? true : cpd._filtered_total > 0),
    })).filter(co => !search && !filterRole ? true : co.compounds.length > 0);
    const independent = (data.independent_compounds||[]).map(filterCompound).filter(cpd => !search && !filterRole ? true : cpd._filtered_total > 0);
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
    const ids = giftTarget.ids;
    try {
      let sent = 0;
      for (const uid of ids) {
        await axios.post(`${API}/super-admin/users/${uid}/send-gift`, payload, getToken());
        sent += 1;
      }
      toast.success(t('hs_gift_sent','تم إرسال الهدية إلى')+` ${sent} ${t('hs_users','مستخدم')}`, { id: 'hs-gift-sent' });
      setGiftTarget(null);
      setGiftForm({ type: 'extend_trial', days: 7, discount: 20, plan: 'basic', message: '' });
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('hs_gift_failed','فشل الإرسال'));
    }
  };

  const openGiftForUser = (u) => setGiftTarget({ scope: 'user', ids: [u.id], name: u.full_name || u.username });
  const openGiftForCompound = (cpd) => {
    const ids = Object.values(cpd.users_by_role || {}).flat().map(u => u.id).filter(Boolean);
    setGiftTarget({ scope: 'compound', ids, name: cpd.name });
  };
  const openGiftForCompany = (co) => {
    const ids = [];
    (co.compounds||[]).forEach(cpd => Object.values(cpd.users_by_role||{}).flat().forEach(u => u.id && ids.push(u.id)));
    setGiftTarget({ scope: 'company', ids, name: co.name });
  };

  // ------- Delete user -------
  const deleteUser = async (userId, userName) => {
    if (!window.confirm(t('hs_confirm_delete','هل أنت متأكد من حذف ')+userName+'؟')) return;
    try {
      await axios.delete(`${API}/db-admin/users/${userId}`, getToken());
      toast.success(t('hs_deleted','تم الحذف'));
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('hs_delete_failed','فشل الحذف'));
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
    } finally {
      setBulkLoading(false);
    }
  };

  const refreshBulkPreview = async (days) => {
    setBulkLoading(true);
    try {
      const res = await axios.post(`${API}/super-admin/bulk-renewal-offer/preview?days_before_expiry=${days}`, {}, getToken());
      setBulkPreview(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || t('hs_preview_failed','فشل'));
    } finally {
      setBulkLoading(false);
    }
  };

  const submitBulkOffer = async () => {
    try {
      const user_ids = (bulkPreview?.targets || []).map(x => x.user_id);
      const res = await axios.post(`${API}/super-admin/bulk-renewal-offer/send`, {
        days_before_expiry: parseInt(bulkForm.days_before_expiry) || 7,
        discount: parseInt(bulkForm.discount) || 20,
        message: bulkForm.message || '',
        user_ids,
      }, getToken());
      const d = res.data || {};
      toast.success(`${t('hs_bulk_sent','تم إرسال')} ${d.sent || 0} ${t('hs_offers','عرض')} (${d.emails_sent || 0} ${t('hs_emails','بريد')})`, { id: 'hs-bulk-sent' });
      setBulkOfferOpen(false);
      setBulkPreview(null);
      setBulkForm({ days_before_expiry: 7, discount: 20, message: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || t('hs_bulk_failed','فشل الإرسال'));
    }
  };

  // ------- Render -------
  if (loading) return <div className="text-center text-gray-400 py-12">{t('hs_loading','جاري التحميل...')}</div>;
  if (!filteredData) return <div className="text-center text-gray-400 py-12">{t('hs_no_data','لا توجد بيانات')}</div>;

  const totals = data.totals || {};

  return (
    <div data-testid="hierarchical-subs-tab" className="space-y-4">

      {/* Sticky totals bar */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-gray-900/95 backdrop-blur border-b border-gray-700 flex flex-wrap gap-4 items-center justify-between" data-testid="hs-totals-bar">
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="text-gray-400">{t('hs_companies','الشركات')}: <b className="text-blue-400 text-sm">{totals.companies||0}</b></span>
          <span className="text-gray-400">{t('hs_compounds','المجتمعات')}: <b className="text-purple-400 text-sm">{totals.compounds||0}</b></span>
          <span className="text-gray-400">{t('hs_users','المستخدمون')}: <b className="text-green-400 text-sm">{totals.total_users||0}</b></span>
          <span className="text-gray-400">{t('hs_residents','سكان')}: <b className="text-cyan-400 text-sm">{totals.residents||0}</b></span>
          <span className="text-gray-400">{t('hs_managers','مديرون')}: <b className="text-amber-400 text-sm">{totals.managers||0}</b></span>
          <span className="text-gray-400">{t('hs_active','نشط')}: <b className="text-emerald-400 text-sm">{totals.active_subs||0}</b></span>
          <span className="text-gray-400">{t('hs_expired','منتهي')}: <b className="text-red-400 text-sm">{totals.expired_subs||0}</b></span>
        </div>
        <div className="flex gap-2">
          <button onClick={openBulkOffer} className="px-3 py-1.5 text-xs bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white rounded-lg font-semibold shadow-lg shadow-pink-500/20" data-testid="hs-bulk-offer-btn">🎯 {t('hs_bulk_renewal','عرض تجديد جماعي')}</button>
          <button onClick={exportAll} className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold" data-testid="hs-export-all-btn">⬇ {t('hs_export_all','تصدير الكل')}</button>
          <button onClick={reload} className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg" data-testid="hs-reload-btn">↻</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="hs-summary-cards">
        {[
          { label: t('hs_companies','شركات الإدارة'), value: totals.companies||0, icon: '🏢', color: 'from-blue-600/20 to-blue-800/10 border-blue-600/30' },
          { label: t('hs_compounds','المجتمعات'), value: totals.compounds||0, icon: '🏘️', color: 'from-purple-600/20 to-purple-800/10 border-purple-600/30' },
          { label: t('hs_users','المستخدمون'), value: totals.total_users||0, icon: '👥', color: 'from-green-600/20 to-green-800/10 border-green-600/30' },
          { label: t('hs_active_subs','اشتراكات نشطة'), value: totals.active_subs||0, icon: '✅', color: 'from-emerald-600/20 to-emerald-800/10 border-emerald-600/30' },
        ].map((s,i) => (
          <div key={i} className={`bg-gradient-to-br ${s.color} border rounded-xl p-4 text-center`}>
            <div className="text-3xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search/filter */}
      <div className="flex flex-wrap gap-3">
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

      {/* Companies */}
      {filteredData.companies.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-300 px-1">{t('hs_management_companies','شركات الإدارة')} ({filteredData.companies.length})</h3>
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
                    <CompoundRow key={cpd.id} cpd={cpd} expanded={expandedCompounds[cpd.id]} toggle={toggleCompound} onOpenCompound={onOpenCompound} onExport={exportCompound} onGiftCompound={openGiftForCompound} onGiftUser={openGiftForUser} onDeleteUser={deleteUser} t={t} roleLabel={roleLabel} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Independent compounds */}
      {filteredData.independent_compounds.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-300 px-1">{t('hs_independent','مجتمعات مستقلة')} ({filteredData.independent_compounds.length})</h3>
          {filteredData.independent_compounds.map(cpd => (
            <CompoundRow key={cpd.id} cpd={cpd} expanded={expandedCompounds[cpd.id]} toggle={toggleCompound} standalone onOpenCompound={onOpenCompound} onExport={exportCompound} onGiftCompound={openGiftForCompound} onGiftUser={openGiftForUser} onDeleteUser={deleteUser} t={t} roleLabel={roleLabel} />
          ))}
        </div>
      )}

      {filteredData.companies.length === 0 && filteredData.independent_compounds.length === 0 && (
        <div className="text-center text-gray-500 py-12">{t('hs_empty','لا توجد نتائج')}</div>
      )}

      {/* Gift modal */}
      {giftTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setGiftTarget(null)}>
          <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-pink-700/40" onClick={e => e.stopPropagation()} data-testid="hs-gift-modal">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">🎁 {t('hs_send_gift_to','إرسال عرض/هدية إلى')}</h3>
              <p className="text-xs text-gray-400 mt-1">{giftTarget.name} <span className="text-pink-400">({giftTarget.ids.length} {t('hs_recipients','مستلم')})</span></p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('hs_gift_type','نوع العرض')}</label>
              <select value={giftForm.type} onChange={e => setGiftForm({...giftForm, type: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-gift-type">
                <option value="extend_trial">🕐 {t('hs_extend_trial','تمديد أيام اشتراك (مجاني)')}</option>
                <option value="free_subscription">✨ {t('hs_free_sub','اشتراك مجاني كامل')}</option>
                <option value="discount_coupon">💳 {t('hs_discount_coupon','كود خصم')}</option>
              </select>
            </div>

            {giftForm.type === 'extend_trial' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('hs_days','عدد الأيام')}</label>
                <input type="number" min="1" value={giftForm.days} onChange={e => setGiftForm({...giftForm, days: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-gift-days" />
              </div>
            )}

            {giftForm.type === 'free_subscription' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('hs_plan','الخطة')}</label>
                  <select value={giftForm.plan} onChange={e => setGiftForm({...giftForm, plan: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="basic">basic</option>
                    <option value="pro">pro</option>
                    <option value="premium">premium</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('hs_days','عدد الأيام')}</label>
                  <input type="number" min="1" value={giftForm.days} onChange={e => setGiftForm({...giftForm, days: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>
            )}

            {giftForm.type === 'discount_coupon' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('hs_discount_pct','نسبة الخصم (%)')}</label>
                <input type="number" min="1" max="100" value={giftForm.discount} onChange={e => setGiftForm({...giftForm, discount: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-gift-discount" />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('hs_message','رسالة (اختياري)')}</label>
              <textarea value={giftForm.message} onChange={e => setGiftForm({...giftForm, message: e.target.value})} rows="2" className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" placeholder={t('hs_msg_placeholder','مثال: شكراً لولائك لنا...')} data-testid="hs-gift-message" />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={submitGift} className="flex-1 px-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-sm font-bold" data-testid="hs-gift-send-btn">{t('hs_send','إرسال')}</button>
              <button onClick={() => setGiftTarget(null)} className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm">{t('hs_cancel','إلغاء')}</button>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Renewal Offer modal */}
      {bulkOfferOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setBulkOfferOpen(false)}>
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 border border-orange-500/30 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="hs-bulk-offer-modal">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">🎯 {t('hs_bulk_renewal','عرض تجديد جماعي')}</h3>
              <p className="text-xs text-gray-400 mt-1">{t('hs_bulk_desc','إرسال كود خصم تلقائي لجميع المستخدمين الذين تنتهي اشتراكاتهم قريبًا.')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('hs_days_before','الأيام قبل انتهاء الاشتراك')}</label>
                <input type="number" min="1" max="90" value={bulkForm.days_before_expiry}
                  onChange={e => { const v = e.target.value; setBulkForm({...bulkForm, days_before_expiry: v}); refreshBulkPreview(parseInt(v)||7); }}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-bulk-days" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('hs_discount_pct','نسبة الخصم (%)')}</label>
                <input type="number" min="1" max="90" value={bulkForm.discount}
                  onChange={e => setBulkForm({...bulkForm, discount: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="hs-bulk-discount" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('hs_message','رسالة (اختياري)')}</label>
              <textarea rows="2" value={bulkForm.message} onChange={e => setBulkForm({...bulkForm, message: e.target.value})}
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white"
                placeholder={t('hs_bulk_msg_placeholder','مثال: خصم خاص لعملائنا الأوفياء...')} data-testid="hs-bulk-message" />
            </div>

            <div className="bg-gray-900/60 rounded-lg border border-gray-700 p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-300">{t('hs_target_list','قائمة المستخدمين المستهدفين')}</span>
                <span className="text-xs text-orange-400 font-bold" data-testid="hs-bulk-count">{bulkLoading ? '...' : `${bulkPreview?.count || 0} ${t('hs_users','مستخدم')}`}</span>
              </div>
              {bulkLoading ? (
                <div className="text-center text-gray-500 py-4 text-xs">{t('hs_loading','جاري التحميل...')}</div>
              ) : bulkPreview?.targets?.length > 0 ? (
                <div className="max-h-56 overflow-y-auto space-y-1" data-testid="hs-bulk-preview-list">
                  {bulkPreview.targets.map(t2 => (
                    <div key={t2.user_id} className="flex justify-between items-center bg-gray-800 rounded px-2 py-1.5 text-xs">
                      <div className="flex-1 min-w-0">
                        <span className="text-white font-medium">{t2.full_name}</span>
                        <span className="text-gray-500 mx-2">•</span>
                        <span className="text-gray-400">{t2.email || '-'}</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-[10px] bg-blue-600/20 text-blue-300 px-1.5 py-0.5 rounded">{t2.plan || '-'}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${t2.days_left <= 2 ? 'bg-red-600/20 text-red-300' : 'bg-amber-600/20 text-amber-300'}`}>{t2.days_left}{t('hs_d','ي')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4 text-xs">{t('hs_no_targets','لا يوجد مستخدمون تنتهي اشتراكاتهم خلال المدة المحددة.')}</div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={submitBulkOffer}
                disabled={!bulkPreview?.count}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold ${bulkPreview?.count ? 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                data-testid="hs-bulk-send-btn">{t('hs_send_to_all','إرسال للكل')} ({bulkPreview?.count || 0})</button>
              <button onClick={() => { setBulkOfferOpen(false); setBulkPreview(null); }} className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm">{t('hs_cancel','إلغاء')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ------------ Compound row sub-component ------------
const CompoundRow = ({ cpd, expanded, toggle, standalone, onOpenCompound, onExport, onGiftCompound, onGiftUser, onDeleteUser, t, roleLabel }) => {
  const wrapClass = standalone
    ? 'bg-gradient-to-br from-purple-900/20 to-gray-800 border border-purple-700/30 rounded-xl overflow-hidden'
    : 'bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden';
  return (
    <div className={wrapClass} data-testid={`hs-compound-${cpd.id}`}>
      <div className="flex items-center justify-between p-3 hover:bg-gray-800 cursor-pointer" onClick={() => toggle(cpd.id)}>
        <div className="flex items-center gap-3">
          <span className="text-xl">🏘️</span>
          <div>
            <div className="font-semibold text-white text-sm">{cpd.name}</div>
            <div className="text-[11px] text-gray-400">{cpd.location || ''} • {cpd.stats?.total_users||0} {t('hs_users_short','م.')} • {cpd.stats?.residents||0} {t('hs_r_resident','مقيم')}</div>
          </div>
        </div>
        <div className="flex gap-2 items-center" onClick={e => e.stopPropagation()}>
          {cpd.stats?.active_subs > 0 && <span className="text-[11px] text-emerald-300 bg-emerald-600/20 px-2 py-0.5 rounded">✓ {cpd.stats.active_subs}</span>}
          {cpd.stats?.expired_subs > 0 && <span className="text-[11px] text-red-300 bg-red-600/20 px-2 py-0.5 rounded">✗ {cpd.stats.expired_subs}</span>}
          {onOpenCompound && <button onClick={() => onOpenCompound(cpd.id)} className="px-2 py-1 text-[11px] bg-blue-600/20 text-blue-300 rounded hover:bg-blue-600/30" data-testid={`hs-view-compound-${cpd.id}`}>👁</button>}
          <button onClick={() => onGiftCompound(cpd)} className="px-2 py-1 text-[11px] bg-pink-600/20 text-pink-300 rounded hover:bg-pink-600/30" data-testid={`hs-gift-compound-${cpd.id}`}>🎁</button>
          <button onClick={() => onExport(cpd)} className="px-2 py-1 text-[11px] bg-emerald-600/20 text-emerald-300 rounded hover:bg-emerald-600/30">⬇</button>
          <span className="text-purple-400">{expanded ? '▾' : '▸'}</span>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-700/50">
          {Object.entries(cpd.users_by_role || {}).map(([role, users]) => (
            <div key={role} className="px-3 py-2">
              <div className="text-[11px] text-gray-400 mb-1 font-semibold">{roleLabel(role)} ({users.length})</div>
              <div className="space-y-1">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between bg-gray-800/60 rounded px-2 py-1.5 text-xs" data-testid={`hs-user-${u.id}`}>
                    <div className="flex-1 min-w-0">
                      <span className="text-white font-medium">{u.full_name || u.username}</span>
                      <span className="text-gray-500 mx-2">•</span>
                      <span className="text-gray-400">{u.email || u.phone || '-'}</span>
                      {u.subscription?.status === 'active' && <span className="ml-2 text-[10px] text-emerald-300 bg-emerald-600/20 px-1.5 py-0.5 rounded">نشط</span>}
                      {u.subscription?.status === 'expired' && <span className="ml-2 text-[10px] text-red-300 bg-red-600/20 px-1.5 py-0.5 rounded">منتهي</span>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => onGiftUser(u)} className="px-1.5 py-0.5 text-[10px] bg-pink-600/20 text-pink-300 rounded hover:bg-pink-600/30" data-testid={`hs-gift-user-${u.id}`}>🎁</button>
                      <button onClick={() => onDeleteUser(u.id, u.full_name || u.username)} className="px-1.5 py-0.5 text-[10px] bg-red-600/20 text-red-300 rounded hover:bg-red-600/30" data-testid={`hs-delete-user-${u.id}`}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(cpd.users_by_role || {}).length === 0 && (
            <div className="px-3 py-4 text-center text-gray-500 text-xs">{t('hs_no_users','لا يوجد مستخدمون')}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default HierarchicalSubs;
