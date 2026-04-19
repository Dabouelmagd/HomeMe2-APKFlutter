import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import ContractModal from './companies/ContractModal';
import CompoundsGridView from './companies/CompoundsGridView';

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
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [topOpen, setTopOpen] = useState(false);
  const [addCompoundFor, setAddCompoundFor] = useState(null); // { id, name }
  const [addUserFor, setAddUserFor] = useState(null); // { compound_id, compound_name }
  const [contractFor, setContractFor] = useState(null); // { company_id, company_name, compound_id, compound_name }
  const [editCompoundState, setEditCompoundState] = useState(null); // full compound object being edited
  const [viewMode, setViewMode] = useState('nested'); // 'nested' | 'grid'
  const [gridFilter, setGridFilter] = useState({ company_id: '', min_users: 0, sub_status: 'all', search: '' });

  const reload = () => setRefreshKey(k => k + 1);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    axios.get(`${API}/super-admin/companies`, getToken())
      .then(res => { if (alive) setData(res.data); })
      .catch(err => { if (alive) toast.error(err.response?.data?.detail || t('ct_load_failed','فشل التحميل')); })
      .finally(() => { if (alive) setLoading(false); });
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

  const linkCompound = null;
  const unlinkCompound = null;

  const addCompound = async (form) => {
    if (!addCompoundFor?.id) return;
    try {
      await axios.post(`${API}/super-admin/companies/${addCompoundFor.id}/compounds`, form, getToken());
      toast.success(t('ct_compound_added','تمت إضافة المجمع'));
      setAddCompoundFor(null);
      setExpanded(p => ({...p, [addCompoundFor.id]: true}));
      reload();
    } catch (err) { toast.error(err.response?.data?.detail || t('ct_compound_add_failed','فشل إضافة المجمع')); }
  };

  const addUser = async (form) => {
    if (!addUserFor?.compound_id) return;
    try {
      await axios.post(`${API}/super-admin/users`, { ...form, compound_id: addUserFor.compound_id }, getToken());
      toast.success(t('ct_user_added','تمت إضافة المستخدم'));
      setAddUserFor(null);
      reload();
    } catch (err) { toast.error(err.response?.data?.detail || t('ct_user_add_failed','فشل إضافة المستخدم')); }
  };

  const bulkAddUsers = async (rows, role) => {
    if (!addUserFor?.compound_id) return null;
    try {
      const res = await axios.post(`${API}/super-admin/users/bulk`, {
        compound_id: addUserFor.compound_id, role, rows
      }, getToken());
      const { created_count, failed_count } = res.data;
      if (created_count > 0) toast.success(`${t('ct_bulk_created','تم إنشاء')} ${created_count} ${t('ct_users','مستخدم')}`);
      if (failed_count > 0) toast.warning(`${failed_count} ${t('ct_bulk_failed','فشل')} — ${t('ct_see_report','راجع التقرير أدناه')}`);
      if (failed_count === 0) setAddUserFor(null);
      reload();
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.detail || t('ct_bulk_error','فشل الاستيراد'));
      return null;
    }
  };

  const deleteCompound = async (cpd) => {
    const usersCount = cpd.users_count || 0;
    const msg = usersCount > 0
      ? `${t('ct_cpd_has_users','هذا المجمع به')} ${usersCount} ${t('ct_users','مستخدم')}. ${t('ct_cpd_del_force','هل تريد الحذف مع إلغاء ربط المستخدمين؟')}`
      : `${t('ct_cpd_confirm_del','تأكيد حذف المجمع')} "${cpd.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      const url = `${API}/super-admin/compounds/${cpd.id}${usersCount > 0 ? '?force=true' : ''}`;
      await axios.delete(url, getToken());
      toast.success(t('ct_cpd_deleted','تم حذف المجمع'));
      reload();
    } catch (err) { toast.error(err.response?.data?.detail || t('ct_cpd_del_failed','فشل الحذف')); }
  };

  const exportCompound = async (cpd) => {
    try {
      const res = await axios.get(`${API}/super-admin/compounds/${cpd.id}/export`, {
        ...getToken(), responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compound-${cpd.name || cpd.id}-${new Date().toISOString().slice(0,10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t('ct_cpd_exported','تم تصدير المجمع'));
    } catch (err) { toast.error(err.response?.data?.detail || t('ct_cpd_exp_failed','فشل التصدير')); }
  };

  const saveEditCompound = async () => {
    if (!editCompoundState?.id) return;
    try {
      await axios.put(`${API}/super-admin/compounds/${editCompoundState.id}`, {
        name: editCompoundState.name,
        location: editCompoundState.location,
        address: editCompoundState.address,
        description: editCompoundState.description,
        company_id: editCompoundState.company_id || null,
      }, getToken());
      toast.success(t('ct_cpd_updated','تم تحديث المجمع'));
      setEditCompoundState(null);
      reload();
    } catch (err) { toast.error(err.response?.data?.detail || t('ct_cpd_upd_failed','فشل التحديث')); }
  };

  const importStructure = async (file, mergeMode) => {
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', mergeMode);
      const res = await axios.post(`${API}/super-admin/import-full-structure`, fd, {
        ...getToken(),
        headers: { ...getToken().headers, 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`${t('ct_imported','تم الاستيراد')}: ${res.data?.imported_companies || 0} ${t('ct_companies','شركة')} / ${res.data?.imported_compounds || 0} ${t('ct_compounds','مجمع')}`);
      setImportOpen(false);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('ct_import_failed','فشل الاستيراد'));
    }
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
          <button onClick={() => setTopOpen(true)} className="px-3 py-1.5 text-xs bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-semibold shadow-lg shadow-orange-500/20" data-testid="ct-top10-btn">🏆 {t('ct_top10','أعلى 10')}</button>
          <button onClick={exportStructure} className="px-3 py-1.5 text-xs bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-semibold shadow-lg shadow-purple-500/20" data-testid="ct-export-structure-btn">📑 {t('ct_export_json','تصدير')}</button>
          <button onClick={() => setImportOpen(true)} className="px-3 py-1.5 text-xs bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold shadow-lg shadow-blue-500/20" data-testid="ct-import-btn">📥 {t('ct_import_json','استيراد')}</button>
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

      {/* View mode toggle */}
      <div className="flex items-center gap-2 bg-gray-900/40 rounded-lg p-2 border border-gray-700">
        <button onClick={() => setViewMode('nested')}
          className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${viewMode === 'nested' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          data-testid="ct-view-nested">🏢 {t('ct_view_nested','عرض شركات متداخل')}</button>
        <button onClick={() => setViewMode('grid')}
          className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all ${viewMode === 'grid' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          data-testid="ct-view-grid">▦ {t('ct_view_grid','شبكة كل المجمعات')}</button>
        <div className="text-[10px] text-gray-500 mr-auto">{viewMode === 'nested' ? t('ct_view_nested_hint','تصفّح هرمي حسب الشركة') : t('ct_view_grid_hint','كل المجمعات مع فلترة شاملة')}</div>
      </div>

      {/* Companies list (nested) */}
      {viewMode === 'nested' && (
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
                    {t('ct_no_compounds','لا توجد مجمعات مرتبطة بهذه الشركة بعد.')}
                    <div className="mt-3">
                      <button onClick={() => setAddCompoundFor({ id: co.id, name: co.name })} className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold" data-testid={`ct-add-compound-empty-${co.id}`}>➕ {t('ct_add_compound','إضافة مجمع')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-end">
                      <button onClick={() => setAddCompoundFor({ id: co.id, name: co.name })} className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold" data-testid={`ct-add-compound-${co.id}`}>➕ {t('ct_add_compound','إضافة مجمع')}</button>
                    </div>
                    {co.compounds.map(cpd => (
                      <div key={cpd.id} className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50" data-testid={`ct-compound-${cpd.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🏘️</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-white truncate">{cpd.name}</div>
                            <div className="text-[11px] text-gray-400 truncate">
                              {cpd.location || '—'} • 👥 {cpd.users_count}
                              {cpd.residents ? ` • 🏠 ${cpd.residents}` : ''}
                              {cpd.managers ? ` • 👔 ${cpd.managers}` : ''}
                              {cpd.security ? ` • 🛡 ${cpd.security}` : ''}
                            </div>
                          </div>
                          <button onClick={() => setAddUserFor({ compound_id: cpd.id, compound_name: cpd.name })} className="px-2 py-1 text-[11px] bg-green-600/30 hover:bg-green-600/50 text-green-200 rounded font-semibold whitespace-nowrap" data-testid={`ct-add-user-${cpd.id}`}>➕ {t('ct_add_user','إضافة ساكن')}</button>
                          <button onClick={() => setContractFor({ company_id: co.id, company_name: co.name, compound_id: cpd.id, compound_name: cpd.name })} className="px-2 py-1 text-[11px] bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 rounded font-semibold whitespace-nowrap" data-testid={`ct-contract-${cpd.id}`}>📋 {t('ct_contract','العقد')}</button>
                          <button onClick={() => setEditCompoundState({ ...cpd, company_id: co.id })} title={t('ct_edit','تعديل')} className="px-2 py-1 text-[11px] bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 rounded font-semibold whitespace-nowrap" data-testid={`ct-cpd-edit-${cpd.id}`}>✏️</button>
                          <button onClick={() => exportCompound(cpd)} title={t('ct_export','تصدير')} className="px-2 py-1 text-[11px] bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 rounded font-semibold whitespace-nowrap" data-testid={`ct-cpd-export-${cpd.id}`}>📑</button>
                          <button onClick={() => deleteCompound(cpd)} title={t('ct_delete','حذف')} className="px-2 py-1 text-[11px] bg-red-600/30 hover:bg-red-600/50 text-red-200 rounded font-semibold whitespace-nowrap" data-testid={`ct-cpd-delete-${cpd.id}`}>🗑</button>
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
      )}

      {/* Grid view */}
      {viewMode === 'grid' && (
        <CompoundsGridView
          companies={companies}
          filter={gridFilter}
          setFilter={setGridFilter}
          t={t}
          onEdit={(cpd, company_id) => setEditCompoundState({ ...cpd, company_id })}
          onDelete={deleteCompound}
          onExport={exportCompound}
          onContract={(cpd, co) => setContractFor({ company_id: co.id, company_name: co.name, compound_id: cpd.id, compound_name: cpd.name })}
          onAddUser={(cpd) => setAddUserFor({ compound_id: cpd.id, compound_name: cpd.name })}
        />
      )}

      {/* Create modal */}
      {createOpen && <CreateCompanyModal onClose={() => setCreateOpen(false)} onSave={createCompany} t={t} />}

      {/* Edit modal */}
      {editCompany && <EditCompanyModal company={editCompany} setCompany={setEditCompany} onClose={() => setEditCompany(null)} onSave={saveEdit} t={t} />}

      {/* Import JSON modal */}
      {importOpen && <ImportStructureModal onClose={() => setImportOpen(false)} onImport={importStructure} t={t} />}

      {/* Top 10 modal */}
      {topOpen && <Top10Modal onClose={() => setTopOpen(false)} t={t} />}

      {/* Add Compound modal */}
      {addCompoundFor && <AddCompoundModal companyName={addCompoundFor.name} onClose={() => setAddCompoundFor(null)} onSave={addCompound} t={t} />}

      {/* Add User (resident) modal */}
      {addUserFor && <AddUserModal compoundName={addUserFor.compound_name} onClose={() => setAddUserFor(null)} onSave={addUser} onBulkSave={bulkAddUsers} t={t} />}

      {/* Management Contract modal */}
      {contractFor && <ContractModal ctx={contractFor} onClose={() => setContractFor(null)} t={t} />}

      {/* Edit Compound modal */}
      {editCompoundState && <EditCompoundModal cpd={editCompoundState} setCpd={setEditCompoundState} onClose={() => setEditCompoundState(null)} onSave={saveEditCompound} companies={data?.companies || []} t={t} />}
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

// ==================== ImportStructureModal ====================
const ImportStructureModal = ({ onClose, onImport, t }) => {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('merge'); // 'merge' | 'replace'
  const submit = () => {
    if (!file) { toast.error(t('ct_pick_file','اختر ملف JSON أولًا')); return; }
    if (mode === 'replace' && !window.confirm(t('ct_confirm_replace','⚠️ وضع الاستبدال سيحذف البيانات الحالية ويستبدلها. هل أنت متأكد؟'))) return;
    onImport(file, mode);
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-cyan-500/30" onClick={e => e.stopPropagation()} data-testid="ct-import-modal">
        <h3 className="text-lg font-bold text-white">📥 {t('ct_import_title','استيراد بنية الإدارة')}</h3>
        <p className="text-xs text-gray-400">{t('ct_import_desc','استعد نسخة احتياطية JSON (Companies + Compounds + Users).')}</p>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('ct_json_file','ملف JSON')}</label>
          <input type="file" accept=".json,application/json" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white file:mr-2 file:px-2 file:py-1 file:bg-cyan-600 file:text-white file:rounded file:border-0" data-testid="ct-import-file" />
          {file && <p className="text-[11px] text-cyan-300 mt-1">📄 {file.name} ({(file.size/1024).toFixed(1)} KB)</p>}
        </div>
        <div className="space-y-2">
          <label className="block text-xs text-gray-400">{t('ct_import_mode','وضع الاستيراد')}</label>
          <label className="flex items-start gap-2 bg-gray-900/60 rounded-lg p-3 border border-gray-700 cursor-pointer hover:border-emerald-500/40">
            <input type="radio" name="imp_mode" value="merge" checked={mode === 'merge'} onChange={() => setMode('merge')} className="mt-0.5" data-testid="ct-import-merge" />
            <div>
              <div className="text-xs font-semibold text-emerald-300">🔀 {t('ct_merge','دمج (الأكثر أمانًا)')}</div>
              <div className="text-[10px] text-gray-400">{t('ct_merge_desc','يضيف الجديد ويحدّث الموجود دون حذف شيء.')}</div>
            </div>
          </label>
          <label className="flex items-start gap-2 bg-gray-900/60 rounded-lg p-3 border border-red-700/40 cursor-pointer hover:border-red-500">
            <input type="radio" name="imp_mode" value="replace" checked={mode === 'replace'} onChange={() => setMode('replace')} className="mt-0.5" data-testid="ct-import-replace" />
            <div>
              <div className="text-xs font-semibold text-red-300">⚠️ {t('ct_replace','استبدال كامل (خطر)')}</div>
              <div className="text-[10px] text-gray-400">{t('ct_replace_desc','يحذف الشركات والمجمعات الحالية ويستبدلها. لا يمس المستخدمين.')}</div>
            </div>
          </label>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={submit} disabled={!file} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold ${file ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`} data-testid="ct-import-save-btn">{t('ct_import','استيراد')}</button>
          <button onClick={onClose} className="px-4 py-2.5 bg-gray-700 text-gray-200 rounded-lg text-sm">{t('ct_cancel','إلغاء')}</button>
        </div>
      </div>
    </div>
  );
};

// ==================== Top10Modal ====================
const Top10Modal = ({ onClose, t }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState('compounds');
  useEffect(() => {
    axios.get(`${API}/super-admin/companies/top10?metric=${metric}`, getToken())
      .then(res => setData(res.data))
      .catch(err => toast.error(err.response?.data?.detail || t('ct_load_failed','فشل')))
      .finally(() => setLoading(false));
  }, [metric, t]);
  const metricLabel = {
    compounds: t('ct_by_compounds','الأكثر مجمعات'),
    users: t('ct_by_users','الأكثر مستخدمين'),
    revenue: t('ct_by_revenue','الأعلى إيرادات'),
    active_subs: t('ct_by_active','الأكثر اشتراكات نشطة'),
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-3xl p-6 space-y-4 border border-amber-500/30 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="ct-top10-modal">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">🏆 {t('ct_top10_title','أعلى 10 شركات إدارة')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(metricLabel).map(([k, v]) => (
            <button key={k} onClick={() => { setLoading(true); setMetric(k); }}
              className={`px-3 py-1.5 text-xs rounded-full border ${metric === k ? 'bg-amber-600 border-amber-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}
              data-testid={`ct-top10-metric-${k}`}>{v}</button>
          ))}
        </div>
        {loading ? <div className="text-center text-gray-400 py-8">{t('ct_loading','جاري التحميل...')}</div>
          : data?.top?.length > 0 ? (
          <div className="bg-gray-900/60 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-3 py-2 text-right text-gray-400 w-12">{t('ct_rank','الترتيب')}</th>
                  <th className="px-3 py-2 text-right text-gray-400">{t('ct_company','الشركة')}</th>
                  <th className="px-3 py-2 text-center text-gray-400">🏘️</th>
                  <th className="px-3 py-2 text-center text-gray-400">👥</th>
                  <th className="px-3 py-2 text-center text-gray-400">✅</th>
                  <th className="px-3 py-2 text-center text-gray-400">💰</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {data.top.map((c, i) => (
                  <tr key={c.id} className="hover:bg-gray-800" data-testid={`ct-top-row-${c.id}`}>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block w-7 h-7 rounded-full text-xs font-bold leading-7 ${i === 0 ? 'bg-yellow-500 text-white' : i === 1 ? 'bg-gray-400 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-gray-700 text-gray-300'}`}>
                        {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white font-semibold">{c.name}</td>
                    <td className={`px-3 py-2 text-center ${metric === 'compounds' ? 'text-purple-300 font-bold' : 'text-gray-400'}`}>{c.compounds_count}</td>
                    <td className={`px-3 py-2 text-center ${metric === 'users' ? 'text-green-300 font-bold' : 'text-gray-400'}`}>{c.total_users}</td>
                    <td className={`px-3 py-2 text-center ${metric === 'active_subs' ? 'text-emerald-300 font-bold' : 'text-gray-400'}`}>{c.active_subs}</td>
                    <td className={`px-3 py-2 text-center ${metric === 'revenue' ? 'text-amber-300 font-bold' : 'text-gray-400'}`}>{c.revenue ? `${c.revenue.toFixed(0)}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="text-center text-gray-500 py-8">{t('ct_no_top','لا توجد بيانات كافية.')}</div>}
        {data?.summary && (
          <div className="text-[11px] text-gray-500 text-center">
            {t('ct_summary_total','الإجمالي')}: {data.summary.total_companies} {t('ct_companies','شركة')} • {data.summary.total_compounds} {t('ct_compounds','مجمع')} • {data.summary.total_users} {t('ct_users','مستخدم')}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== AddCompoundModal ====================
const AddCompoundModal = ({ companyName, onClose, onSave, t }) => {
  const [form, setForm] = useState({ name: '', location: '', address: '', description: '' });
  const submit = () => {
    if (!form.name.trim()) { toast.error(t('ct_compound_name_required','اسم المجمع مطلوب')); return; }
    onSave(form);
  };
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-purple-500/30 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="ct-add-compound-modal">
        <h3 className="text-lg font-bold text-white">🏘️ {t('ct_add_compound_title','إضافة مجمع جديد')} — <span className="text-purple-300">{companyName}</span></h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('ct_compound_name','اسم المجمع')} *</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="ct-add-compound-name" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('ct_location','الموقع')}</label>
            <input value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="ct-add-compound-location" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('ct_address','العنوان التفصيلي')}</label>
            <input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('ct_description','الوصف')}</label>
            <textarea rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={submit} className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold" data-testid="ct-add-compound-save-btn">{t('ct_add','إضافة')}</button>
          <button onClick={onClose} className="px-4 py-2.5 bg-gray-700 text-gray-200 rounded-lg text-sm">{t('ct_cancel','إلغاء')}</button>
        </div>
      </div>
    </div>
  );
};

// ==================== AddUserModal (Single + Bulk CSV/Paste) ====================
const AddUserModal = ({ compoundName, onClose, onSave, onBulkSave, t }) => {
  const [mode, setMode] = useState('single'); // 'single' | 'bulk'
  const [form, setForm] = useState({
    full_name: '', username: '', email: '', password: '',
    role: 'resident', phone: '', unit_number: '',
  });
  const submit = () => {
    if (!form.full_name.trim() || !form.username.trim() || !form.email.trim() || !form.password) {
      toast.error(t('ct_user_required','الاسم واسم المستخدم والبريد وكلمة المرور مطلوبة'));
      return;
    }
    if (form.password.length < 6) { toast.error(t('ct_password_short','كلمة المرور يجب ألا تقل عن 6 أحرف')); return; }
    onSave(form);
  };
  const roles = [
    { v: 'resident', l: t('role_resident','مقيم'), emoji: '🏠' },
    { v: 'family_head', l: t('role_family_head','رب أسرة'), emoji: '👨‍👩‍👧' },
    { v: 'manager', l: t('role_manager','إداري'), emoji: '👔' },
    { v: 'security', l: t('role_security','أمن'), emoji: '🛡' },
    { v: 'admin', l: t('role_admin','أدمن المجمع'), emoji: '⚙️' },
  ];
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-2xl p-6 space-y-4 border border-green-500/30 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="ct-add-user-modal">
        <h3 className="text-lg font-bold text-white">👤 {t('ct_add_user_title','إضافة ساكن / مستخدم')} — <span className="text-green-300">{compoundName}</span></h3>

        {/* Mode tabs */}
        <div className="flex gap-2 border-b border-gray-700 pb-2">
          <button onClick={() => setMode('single')} className={`px-3 py-1.5 text-xs rounded-t font-semibold ${mode === 'single' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`} data-testid="ct-user-tab-single">👤 {t('ct_single','مستخدم واحد')}</button>
          <button onClick={() => setMode('bulk')} className={`px-3 py-1.5 text-xs rounded-t font-semibold ${mode === 'bulk' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`} data-testid="ct-user-tab-bulk">📦 {t('ct_bulk','إنشاء متعدد (CSV/Paste)')}</button>
        </div>

        {/* Common role selector */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('ct_role','الدور')}</label>
          <div className="grid grid-cols-5 gap-1">
            {roles.map(r => (
              <button key={r.v} type="button" onClick={() => setForm({...form, role: r.v})}
                className={`px-1 py-1.5 rounded-lg text-[10px] font-semibold border ${form.role === r.v ? 'bg-green-600 border-green-400 text-white' : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800'}`}
                data-testid={`ct-user-role-${r.v}`}>
                <div className="text-base">{r.emoji}</div>
                <div>{r.l}</div>
              </button>
            ))}
          </div>
        </div>

        {mode === 'single' ? (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('ct_full_name','الاسم الكامل')} *</label>
                <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="ct-user-fullname" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('ct_username','اسم المستخدم')} *</label>
                  <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="ct-user-username" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('ct_password','كلمة المرور')} *</label>
                  <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="ct-user-password" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('ct_email','البريد')} *</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="ct-user-email" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('ct_phone','الهاتف')}</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{t('ct_unit','رقم الوحدة')}</label>
                  <input value={form.unit_number} onChange={e => setForm({...form, unit_number: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="ct-user-unit" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={submit} className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-bold" data-testid="ct-add-user-save-btn">{t('ct_add','إضافة')}</button>
              <button onClick={onClose} className="px-4 py-2.5 bg-gray-700 text-gray-200 rounded-lg text-sm">{t('ct_cancel','إلغاء')}</button>
            </div>
          </>
        ) : (
          <BulkUsersPanel role={form.role} onBulkSave={onBulkSave} onClose={onClose} t={t} />
        )}
      </div>
    </div>
  );
};

// ==================== BulkUsersPanel ====================
const BulkUsersPanel = ({ role, onBulkSave, onClose, t }) => {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState([]);
  const [errors, setErrors] = useState([]);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const sample = `full_name,username,email,password,phone,unit_number
أحمد محمود,ahmed_m,ahmed@ex.com,pass1234,01012345678,A-101
سارة عبدالله,sara_a,sara@ex.com,pass1234,01122334455,B-205`;

  const parse = (raw) => {
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return { rows: [], errors: [] };
    // Detect header
    const first = lines[0].toLowerCase();
    const hasHeader = first.includes('full_name') || first.includes('username') || first.includes('email');
    let headers = ['full_name','username','email','password','phone','unit_number'];
    let start = 0;
    if (hasHeader) {
      headers = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase());
      start = 1;
    }
    const rows = []; const errs = [];
    for (let i = start; i < lines.length; i++) {
      const parts = lines[i].split(/[,;\t]/).map(p => p.trim());
      const row = {};
      headers.forEach((h, idx) => { row[h] = parts[idx] || ''; });
      const missing = [];
      if (!row.full_name) missing.push('full_name');
      if (!row.username) missing.push('username');
      if (!row.email) missing.push('email');
      if (!row.password) missing.push('password');
      if (missing.length) errs.push({ line: i + 1, error: `حقول ناقصة: ${missing.join(', ')}`, row });
      else rows.push(row);
    }
    return { rows, errors: errs };
  };

  const handleParse = () => {
    const { rows, errors } = parse(text);
    setParsed(rows); setErrors(errors);
    if (rows.length === 0) toast.error(t('ct_no_valid_rows','لا توجد صفوف صالحة'));
    else toast.info(`${rows.length} ${t('ct_rows_ready','صف جاهز للإنشاء')}${errors.length ? ` • ${errors.length} ${t('ct_rows_invalid','صف غير صالح')}` : ''}`);
  };

  const handleFile = (f) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => { setText(e.target.result || ''); };
    reader.readAsText(f);
  };

  const submit = async () => {
    if (parsed.length === 0) { toast.error(t('ct_parse_first','قم بالتحليل أولًا')); return; }
    setSubmitting(true);
    const res = await onBulkSave(parsed, role);
    setSubmitting(false);
    if (res) setResult(res);
  };

  return (
    <div className="space-y-3" data-testid="ct-bulk-panel">
      <div className="flex gap-2 items-center">
        <label className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-300 cursor-pointer hover:border-green-500/60">
          📄 <input type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={e => handleFile(e.target.files?.[0])} data-testid="ct-bulk-file" />
          <span className="mr-1">{t('ct_pick_csv','اختر ملف CSV')}</span>
        </label>
        <button onClick={() => setText(sample)} className="px-2 py-1.5 text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-200 rounded" data-testid="ct-bulk-sample">📋 {t('ct_sample','نموذج')}</button>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">{t('ct_paste_rows','أو الصق الصفوف (CSV / مفصولة بفاصلة/تاب)')}</label>
        <textarea value={text} onChange={e => setText(e.target.value)} rows="7" placeholder={sample}
          className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-xs text-white font-mono" data-testid="ct-bulk-textarea" />
      </div>
      <div className="flex gap-2">
        <button onClick={handleParse} className="flex-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold" data-testid="ct-bulk-parse-btn">🔎 {t('ct_parse','تحليل ومعاينة')}</button>
      </div>

      {parsed.length > 0 && (
        <div className="bg-gray-900/60 rounded-lg border border-gray-700 p-2 max-h-52 overflow-auto" data-testid="ct-bulk-preview">
          <div className="text-[11px] text-emerald-300 mb-1 font-semibold">✅ {parsed.length} {t('ct_ready','جاهز')}</div>
          <table className="w-full text-[10px]">
            <thead><tr className="text-gray-400">
              <th className="text-right px-1">#</th>
              <th className="text-right px-1">{t('ct_full_name','الاسم')}</th>
              <th className="text-right px-1">{t('ct_username','المستخدم')}</th>
              <th className="text-right px-1">{t('ct_email','البريد')}</th>
              <th className="text-right px-1">{t('ct_unit','وحدة')}</th>
            </tr></thead>
            <tbody>
              {parsed.slice(0, 20).map((r, i) => (
                <tr key={i} className="border-t border-gray-800">
                  <td className="px-1 text-gray-500">{i+1}</td>
                  <td className="px-1 text-white">{r.full_name}</td>
                  <td className="px-1 text-gray-300">{r.username}</td>
                  <td className="px-1 text-gray-400">{r.email}</td>
                  <td className="px-1 text-gray-400">{r.unit_number || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {parsed.length > 20 && <div className="text-[10px] text-gray-500 text-center mt-1">... +{parsed.length - 20} {t('ct_more','المزيد')}</div>}
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-2 max-h-32 overflow-auto" data-testid="ct-bulk-errors">
          <div className="text-[11px] text-red-300 font-semibold mb-1">⚠️ {errors.length} {t('ct_parse_errors','صف غير صالح')}</div>
          {errors.slice(0, 10).map((e, i) => (
            <div key={i} className="text-[10px] text-red-200">{t('ct_line','سطر')} {e.line}: {e.error}</div>
          ))}
        </div>
      )}

      {result && (
        <div className="bg-gray-900/60 border border-emerald-700/40 rounded-lg p-3 space-y-1" data-testid="ct-bulk-result">
          <div className="text-xs font-semibold text-emerald-300">📊 {t('ct_bulk_report','تقرير الدفعة')}</div>
          <div className="text-[11px] text-gray-300">✅ {t('ct_created','مُنشأ')}: {result.created_count}</div>
          {result.failed_count > 0 && <div className="text-[11px] text-red-300">❌ {t('ct_failed','فشل')}: {result.failed_count}</div>}
          {result.failed?.length > 0 && (
            <div className="max-h-24 overflow-auto mt-1">
              {result.failed.slice(0, 10).map((f, i) => (
                <div key={i} className="text-[10px] text-red-200">
                  {t('ct_row','صف')} {f.row_index + 1} ({f.row.username || '—'}): {f.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={submit} disabled={submitting || parsed.length === 0}
          className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold ${submitting || parsed.length === 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white'}`}
          data-testid="ct-bulk-save-btn">
          {submitting ? '⏳ ...' : `➕ ${t('ct_create_all','إنشاء الكل')} (${parsed.length})`}
        </button>
        <button onClick={onClose} className="px-4 py-2.5 bg-gray-700 text-gray-200 rounded-lg text-sm">{t('ct_close','إغلاق')}</button>
      </div>
    </div>
  );
};

// ==================== EditCompoundModal ====================
const EditCompoundModal = ({ cpd, setCpd, onClose, onSave, companies, t }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-blue-500/30 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="ct-edit-compound-modal">
      <h3 className="text-lg font-bold text-white">✏️ {t('ct_edit_compound_title','تعديل المجمع')}</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('ct_compound_name','اسم المجمع')} *</label>
          <input value={cpd.name || ''} onChange={e => setCpd({...cpd, name: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="ct-edit-cpd-name" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('ct_location','الموقع')}</label>
          <input value={cpd.location || ''} onChange={e => setCpd({...cpd, location: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="ct-edit-cpd-location" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('ct_address','العنوان التفصيلي')}</label>
          <input value={cpd.address || ''} onChange={e => setCpd({...cpd, address: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('ct_description','الوصف')}</label>
          <textarea rows="2" value={cpd.description || ''} onChange={e => setCpd({...cpd, description: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('ct_parent_company','الشركة الأم')}</label>
          <select value={cpd.company_id || ''} onChange={e => setCpd({...cpd, company_id: e.target.value || null})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="ct-edit-cpd-company">
            <option value="">{t('ct_independent','مستقل (بدون شركة)')}</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="text-[10px] text-gray-500 mt-1">{t('ct_move_hint','يمكنك نقل المجمع إلى شركة أخرى من هنا.')}</p>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onSave} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold" data-testid="ct-edit-cpd-save">💾 {t('ct_save','حفظ')}</button>
        <button onClick={onClose} className="px-4 py-2.5 bg-gray-700 text-gray-200 rounded-lg text-sm">{t('ct_cancel','إلغاء')}</button>
      </div>
    </div>
  </div>
);

export default CompaniesTab;