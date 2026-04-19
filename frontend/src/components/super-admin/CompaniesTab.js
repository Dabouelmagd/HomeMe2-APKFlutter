import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/**
 * CompaniesTab — لوحة إدارة شركات الإدارة الكاملة
 *   - عرض كل شركة مع مجمعاتها، مستخدميها، واشتراكاتها
 *   - CRUD (إنشاء، تعديل، حذف)
 *   - ربط/فك ربط المجمعات
 *   - تصدير بنية الإدارة كاملة JSON
 */
const CompaniesTab = ({ t }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [independentCompounds, setIndependentCompounds] = useState([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [linkTarget, setLinkTarget] = useState(null); // company to link compound to

  const reload = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      axios.get(`${API}/super-admin/companies`, getToken()),
      axios.get(`${API}/super-admin/compounds`, getToken()),
    ]).then(([res1, res2]) => {
      if (!alive) return;
      setData(res1.data);
      const allCompounds = res2.data?.compounds || [];
      const linkedIds = new Set();
      (res1.data?.companies || []).forEach(co => (co.compounds || []).forEach(cpd => linkedIds.add(cpd.id)));
      setIndependentCompounds(allCompounds.filter(c => !linkedIds.has(c.id)));
    }).catch(err => {
      toast.error(err.response?.data?.detail || t('ct_load_failed','فشل التحميل'));
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [refreshKey, t]);

  const createCompany = async (form) => {
    try {
      await axios.post(`${API}/super-admin/companies`, form, getToken());
      toast.success(t('ct_created','تم إنشاء الشركة'));
      setCreateOpen(false);
      reload();
    } catch (err) { toast.error(err.response?.data?.detail || t('ct_create_failed','فشل الإنشاء')); }
  };

  const saveEdit = async () => {
    if (!editCompany?.id) return;
    try {
      await axios.put(`${API}/super-admin/companies/${editCompany.id}`, {
        name: editCompany.name,
        email: editCompany.email,
        phone: editCompany.phone,
        address: editCompany.address,
        website: editCompany.website,
        description: editCompany.description,
      }, getToken());
      toast.success(t('ct_updated','تم التحديث'));
      setEditCompany(null);
      reload();
    } catch (err) { toast.error(err.response?.data?.detail || t('ct_update_failed','فشل التحديث')); }
  };

  const deleteCompany = async (co) => {
    if (!window.confirm(`${t('ct_confirm_delete','تأكيد حذف شركة')} "${co.name}"?\n${t('ct_unlink_note','سيتم فك الربط عن المجمعات التابعة')}`)) return;
    try {
      await axios.delete(`${API}/super-admin/companies/${co.id}`, getToken());
      toast.success(t('ct_deleted','تم الحذف'));
      reload();
    } catch (err) { toast.error(err.response?.data?.detail || t('ct_delete_failed','فشل الحذف')); }
  };

  const linkCompound = async (coId, cpdId) => {
    try {
      await axios.post(`${API}/super-admin/companies/${coId}/link-compound`, { compound_id: cpdId }, getToken());
      toast.success(t('ct_linked','تم الربط'));
      setLinkTarget(null);
      reload();
    } catch (err) { toast.error(err.response?.data?.detail || t('ct_link_failed','فشل الربط')); }
  };

  const unlinkCompound = async (coId, cpdId, cpdName) => {
    if (!window.confirm(`${t('ct_confirm_unlink','فك ربط المجمع')} "${cpdName}"?`)) return;
    try {
      await axios.post(`${API}/super-admin/companies/${coId}/unlink-compound`, { compound_id: cpdId }, getToken());
      toast.success(t('ct_unlinked','تم فك الربط'));
      reload();
    } catch (err) { toast.error(err.response?.data?.detail || t('ct_unlink_failed','فشل فك الربط')); }
  };

  const exportStructure = async () => {
    try {
      const res = await axios.get(`${API}/super-admin/export-full-structure`, {
        ...getToken(), responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `homeme-structure-${new Date().toISOString().slice(0,10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t('ct_exported','تم التصدير'));
    } catch (err) { toast.error(err.response?.data?.detail || t('ct_export_failed','فشل التصدير')); }
  };

  const roleLabel = (r) => ({
    resident: t('role_resident','مقيم'), manager: t('role_manager','إداري'),
    company_admin: t('role_company_admin','مدير شركة'), admin: t('role_admin','أدمن'),
    security: t('role_security','أمن'), family_head: t('role_family_head','رب أسرة'),
  }[r] || r);

  if (loading) return <div className="text-center text-gray-400 py-12" data-testid="ct-loading">{t('ct_loading','جاري التحميل...')}</div>;
  const companies = (data?.companies || []).filter(co => !search || (co.name || '').toLowerCase().includes(search.toLowerCase()));

  const totalCompounds = companies.reduce((a,co) => a + (co.compounds_count || 0), 0);
  const totalUsers = companies.reduce((a,co) => a + (co.total_users || 0), 0);
  const totalActive = companies.reduce((a,co) => a + (co.active_subs || 0), 0);

  return (
    <div data-testid="companies-tab" className="space-y-5">

      {/* Top action bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1 min-w-[260px]">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('ct_search','ابحث باسم الشركة...')} className="flex-1 min-w-[200px] bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="ct-search-input" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCreateOpen(true)} className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold shadow-lg shadow-green-500/20" data-testid="ct-create-btn">➕ {t('ct_new_company','شركة جديدة')}</button>
          <button onClick={exportStructure} className="px-3 py-1.5 text-xs bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold shadow-lg shadow-purple-500/20" data-testid="ct-export-structure-btn">📑 {t('ct_export_json','تصدير JSON')}</button>
          <button onClick={reload} className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg" data-testid="ct-reload-btn">↻</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="ct-stats">
        {[
          { label: t('ct_companies','الشركات'), value: companies.length, icon: '🏢', color: 'from-blue-600/25 to-blue-800/10 border-blue-600/40' },
          { label: t('ct_compounds','المجمعات'), value: totalCompounds, icon: '🏘️', color: 'from-purple-600/25 to-purple-800/10 border-purple-600/40' },
          { label: t('ct_users','المستخدمون'), value: totalUsers, icon: '👥', color: 'from-green-600/25 to-green-800/10 border-green-600/40' },
          { label: t('ct_active_subs','اشتراكات نشطة'), value: totalActive, icon: '✅', color: 'from-emerald-600/25 to-emerald-800/10 border-emerald-600/40' },
        ].map((s,i) => (
          <div key={i} className={`bg-gradient-to-br ${s.color} border rounded-xl p-4 text-center`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Companies list */}
      <div className="space-y-3">
        {companies.map(co => (
          <div key={co.id} className="bg-gradient-to-br from-blue-900/20 to-gray-800 border border-blue-700/30 rounded-xl overflow-hidden" data-testid={`ct-company-${co.id}`}>
            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-blue-900/20" onClick={() => setExpanded(p => ({...p, [co.id]: !p[co.id]}))}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-3xl flex-shrink-0">🏢</span>
                <div className="min-w-0">
                  <div className="font-bold text-white truncate">{co.name}</div>
                  <div className="text-[11px] text-gray-400 truncate">
                    {co.email || '—'} • {co.phone || '—'}
                    {co.address ? ` • ${co.address}` : ''}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] bg-purple-600/20 text-purple-300 px-1.5 py-0.5 rounded">🏘️ {co.compounds_count} {t('ct_compounds_short','مجمع')}</span>
                    <span className="text-[10px] bg-green-600/20 text-green-300 px-1.5 py-0.5 rounded">👥 {co.total_users}</span>
                    {co.active_subs > 0 && <span className="text-[10px] bg-emerald-600/20 text-emerald-300 px-1.5 py-0.5 rounded">✓ {co.active_subs}</span>}
                    {co.expired_subs > 0 && <span className="text-[10px] bg-red-600/20 text-red-300 px-1.5 py-0.5 rounded">✗ {co.expired_subs}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 items-center flex-shrink-0" onClick={e => e.stopPropagation()}>
                <button title={t('ct_link_compound','ربط مجمع')} onClick={() => setLinkTarget(co)} className="px-2 py-1 text-xs bg-green-600/20 text-green-300 rounded hover:bg-green-600/30" data-testid={`ct-link-${co.id}`}>🔗</button>
                <button title={t('ct_edit','تعديل')} onClick={() => setEditCompany({...co})} className="px-2 py-1 text-xs bg-amber-600/20 text-amber-300 rounded hover:bg-amber-600/30" data-testid={`ct-edit-${co.id}`}>✏️</button>
                <button title={t('ct_delete','حذف')} onClick={() => deleteCompany(co)} className="px-2 py-1 text-xs bg-red-600/20 text-red-300 rounded hover:bg-red-600/30" data-testid={`ct-delete-${co.id}`}>🗑</button>
                <span className="text-blue-400 text-xl mr-1">{expanded[co.id] ? '▾' : '▸'}</span>
              </div>
            </div>

            {expanded[co.id] && (
              <div className="border-t border-blue-700/20 p-4 space-y-3 bg-gray-900/40">
                {co.description && <p className="text-xs text-gray-300 italic">{co.description}</p>}
                {co.admin_user && (
                  <div className="bg-blue-900/30 rounded-lg px-3 py-2 text-xs">
                    <span className="text-blue-300 font-semibold">👔 {t('ct_admin_user','مدير الشركة')}: </span>
                    <span className="text-white">{co.admin_user.full_name || co.admin_user.username}</span>
                    <span className="text-gray-400 mx-2">•</span>
                    <span className="text-gray-400">{co.admin_user.email || '—'}</span>
                  </div>
                )}
                {co.compounds.length === 0 ? (
                  <div className="text-center text-gray-500 text-xs py-4">
                    {t('ct_no_compounds','لا توجد مجمعات مرتبطة بهذه الشركة.')}
                    <button onClick={() => setLinkTarget(co)} className="ml-2 text-green-400 hover:underline">{t('ct_link_now','اربط مجمعًا الآن')}</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {co.compounds.map(cpd => (
                      <div key={cpd.id} className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50" data-testid={`ct-compound-${cpd.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-lg">🏘️</span>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white truncate">{cpd.name}</div>
                              <div className="text-[11px] text-gray-400 truncate">
                                {cpd.location || '—'} • 👥 {cpd.users_count}
                                {cpd.residents ? ` • 🏠 ${cpd.residents}` : ''}
                                {cpd.managers ? ` • 👔 ${cpd.managers}` : ''}
                                {cpd.security ? ` • 🛡 ${cpd.security}` : ''}
                              </div>
                            </div>
                          </div>
                          <button onClick={() => unlinkCompound(co.id, cpd.id, cpd.name)} className="px-2 py-1 text-[10px] bg-red-600/20 text-red-300 rounded hover:bg-red-600/30" data-testid={`ct-unlink-${cpd.id}`}>❌ {t('ct_unlink','فك الربط')}</button>
                        </div>
                        {/* Users grouped by role */}
                        {Object.keys(cpd.users_by_role || {}).length > 0 && (
                          <div className="space-y-1 mt-2">
                            {Object.entries(cpd.users_by_role).map(([role, users]) => (
                              <div key={role} className="text-[11px]">
                                <span className="text-gray-400 font-semibold">{roleLabel(role)} ({users.length}):</span>
                                <span className="text-gray-300 mr-2">
                                  {users.slice(0, 3).map(u => u.full_name || u.username).join('، ')}
                                  {users.length > 3 ? ` ... +${users.length - 3}` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {companies.length === 0 && (
          <div className="text-center text-gray-500 py-10">{t('ct_no_companies','لا توجد شركات.')} <button onClick={() => setCreateOpen(true)} className="text-green-400 hover:underline">{t('ct_create_first','أنشئ أول شركة')}</button></div>
        )}
      </div>

      {/* Create modal */}
      {createOpen && <CreateCompanyModal onClose={() => setCreateOpen(false)} onSave={createCompany} t={t} />}

      {/* Edit modal */}
      {editCompany && <EditCompanyModal company={editCompany} setCompany={setEditCompany} onClose={() => setEditCompany(null)} onSave={saveEdit} t={t} />}

      {/* Link compound modal */}
      {linkTarget && (
        <LinkCompoundModal company={linkTarget} availableCompounds={independentCompounds}
          onClose={() => setLinkTarget(null)} onLink={(cpdId) => linkCompound(linkTarget.id, cpdId)} t={t} />
      )}
    </div>
  );
};

// ==================== CreateCompanyModal ====================
const CreateCompanyModal = ({ onClose, onSave, t }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', website: '', description: '' });
  const submit = () => { if (!form.name.trim()) { toast.error(t('ct_name_required','اسم الشركة مطلوب')); return; } onSave(form); };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-green-500/30 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="ct-create-modal">
        <h3 className="text-lg font-bold text-white">➕ {t('ct_new_company','إنشاء شركة إدارة جديدة')}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('ct_company_name','اسم الشركة')} *</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="ct-create-name" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('ct_email','البريد')}</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('ct_phone','الهاتف')}</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('ct_address','العنوان')}</label>
            <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('ct_website','الموقع الإلكتروني')}</label>
            <input value={form.website} onChange={e => setForm({...form, website: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('ct_description','الوصف')}</label>
            <textarea rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={submit} className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold" data-testid="ct-create-save-btn">{t('ct_create','إنشاء')}</button>
          <button onClick={onClose} className="px-4 py-2.5 bg-gray-700 text-gray-200 rounded-lg text-sm">{t('ct_cancel','إلغاء')}</button>
        </div>
      </div>
    </div>
  );
};

// ==================== EditCompanyModal ====================
const EditCompanyModal = ({ company, setCompany, onClose, onSave, t }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-amber-500/30 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="ct-edit-modal">
      <h3 className="text-lg font-bold text-white">✏️ {t('ct_edit_company','تعديل شركة')} — {company.name}</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('ct_company_name','اسم الشركة')}</label>
          <input value={company.name || ''} onChange={e => setCompany({...company, name: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="ct-edit-name" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('ct_email','البريد')}</label>
            <input type="email" value={company.email || ''} onChange={e => setCompany({...company, email: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('ct_phone','الهاتف')}</label>
            <input value={company.phone || ''} onChange={e => setCompany({...company, phone: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('ct_address','العنوان')}</label>
          <input value={company.address || ''} onChange={e => setCompany({...company, address: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('ct_website','الموقع الإلكتروني')}</label>
          <input value={company.website || ''} onChange={e => setCompany({...company, website: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('ct_description','الوصف')}</label>
          <textarea rows="2" value={company.description || ''} onChange={e => setCompany({...company, description: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onSave} className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-bold" data-testid="ct-edit-save-btn">{t('ct_save','حفظ')}</button>
        <button onClick={onClose} className="px-4 py-2.5 bg-gray-700 text-gray-200 rounded-lg text-sm">{t('ct_cancel','إلغاء')}</button>
      </div>
    </div>
  </div>
);

// ==================== LinkCompoundModal ====================
const LinkCompoundModal = ({ company, availableCompounds, onClose, onLink, t }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-green-500/30 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="ct-link-modal">
      <div>
        <h3 className="text-lg font-bold text-white">🔗 {t('ct_link_title','ربط مجمع بالشركة')}</h3>
        <p className="text-xs text-gray-400 mt-1">{t('ct_linking_to','ربط بـ')}: <span className="text-green-400 font-semibold">{company.name}</span></p>
      </div>
      {availableCompounds.length === 0 ? (
        <div className="text-center text-gray-400 py-6 text-sm">
          {t('ct_no_available','لا توجد مجمعات مستقلة لربطها.')}
          <p className="text-[11px] text-gray-500 mt-2">{t('ct_no_available_hint','كل المجمعات مربوطة بشركات بالفعل أو لم تُنشأ بعد.')}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {availableCompounds.map(cpd => (
            <button key={cpd.id} onClick={() => onLink(cpd.id)} className="w-full flex items-center justify-between bg-gray-900/60 hover:bg-green-600/20 border border-gray-700 hover:border-green-500/40 rounded-lg px-3 py-2 text-xs transition" data-testid={`ct-pick-compound-${cpd.id}`}>
              <div className="flex items-center gap-2 text-right">
                <span className="text-lg">🏘️</span>
                <div>
                  <div className="font-semibold text-white">{cpd.name}</div>
                  <div className="text-[11px] text-gray-400">{cpd.location || cpd.address || '—'}</div>
                </div>
              </div>
              <span className="text-green-400 text-lg">🔗</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-end pt-2">
        <button onClick={onClose} className="px-4 py-2.5 bg-gray-700 text-gray-200 rounded-lg text-sm">{t('ct_close','إغلاق')}</button>
      </div>
    </div>
  </div>
);

export default CompaniesTab;
