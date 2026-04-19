import React from 'react';

/**
 * CompoundsGridView — flat filterable grid of all compounds across all companies
 * Extracted from CompaniesTab.js (iter 40 refactor).
 * Props:
 *   companies: [{ id, name, compounds: [...] }]
 *   filter: { search, company_id, min_users, sub_status }
 *   setFilter: updater
 *   onEdit, onDelete, onExport, onContract, onAddUser: action handlers
 *   t: i18n helper
 */
const CompoundsGridView = ({ companies, filter, setFilter, t, onEdit, onDelete, onExport, onContract, onAddUser }) => {
  // Flatten: [{company, compound}, ...]
  const all = [];
  for (const co of companies) {
    for (const cpd of (co.compounds || [])) {
      all.push({ company: co, compound: cpd });
    }
  }

  // Apply filters
  const filtered = all.filter(({ company, compound }) => {
    if (filter.search && !(compound.name || '').toLowerCase().includes(filter.search.toLowerCase())
        && !(compound.location || '').toLowerCase().includes(filter.search.toLowerCase())) return false;
    if (filter.company_id && company.id !== filter.company_id) return false;
    if (filter.min_users > 0 && (compound.users_count || 0) < filter.min_users) return false;
    if (filter.sub_status === 'active' && !(compound.stats?.active_subs > 0)) return false;
    if (filter.sub_status === 'expired' && !(compound.stats?.expired_subs > 0)) return false;
    if (filter.sub_status === 'none' && (compound.users_count || 0) > 0 && ((compound.stats?.active_subs || 0) + (compound.stats?.expired_subs || 0)) > 0) return false;
    return true;
  });

  const totalFiltered = filtered.length;
  const totalUsers = filtered.reduce((a, x) => a + (x.compound.users_count || 0), 0);
  const totalActive = filtered.reduce((a, x) => a + (x.compound.stats?.active_subs || 0), 0);

  return (
    <div className="space-y-4" data-testid="ct-grid-view">
      {/* Filter bar */}
      <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
        <input value={filter.search} onChange={e => setFilter({...filter, search: e.target.value})}
          placeholder={t('ct_grid_search','ابحث بالاسم أو الموقع...')}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          data-testid="ct-grid-search" />
        <select value={filter.company_id} onChange={e => setFilter({...filter, company_id: e.target.value})}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          data-testid="ct-grid-company-filter">
          <option value="">{t('ct_grid_all_companies','كل الشركات')}</option>
          {companies.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
        <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
          <label className="text-[11px] text-gray-400 whitespace-nowrap">{t('ct_grid_min_users','سكان ≥')}</label>
          <input type="number" min="0" value={filter.min_users}
            onChange={e => setFilter({...filter, min_users: parseInt(e.target.value) || 0})}
            className="w-full bg-transparent text-white text-sm outline-none"
            data-testid="ct-grid-min-users" />
        </div>
        <select value={filter.sub_status} onChange={e => setFilter({...filter, sub_status: e.target.value})}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          data-testid="ct-grid-sub-filter">
          <option value="all">{t('ct_grid_all_subs','كل حالات الاشتراك')}</option>
          <option value="active">{t('ct_grid_has_active','به اشتراك نشط')}</option>
          <option value="expired">{t('ct_grid_has_expired','به اشتراك منتهي')}</option>
          <option value="none">{t('ct_grid_no_sub','بدون اشتراكات')}</option>
        </select>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-4 text-[11px] text-gray-400 px-2">
        <span>🏘️ <b className="text-white">{totalFiltered}</b> / {all.length} {t('ct_compounds','مجمع')}</span>
        <span>👥 <b className="text-white">{totalUsers}</b> {t('ct_users','مستخدم')}</span>
        <span>✅ <b className="text-emerald-300">{totalActive}</b> {t('ct_active_subs','اشتراك نشط')}</span>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-gray-900/40 rounded-xl border border-dashed border-gray-700">
          {t('ct_grid_empty','لا مجمعات مطابقة للفلترة')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(({ company, compound }) => (
            <div key={compound.id} className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-4 space-y-3 hover:border-purple-500/40 transition-all" data-testid={`ct-grid-card-${compound.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏘️</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-white truncate">{compound.name}</h4>
                      <div className="text-[10px] text-gray-500 truncate">{compound.location || t('ct_no_location','بدون موقع')}</div>
                    </div>
                  </div>
                </div>
                <span className="text-[9px] bg-blue-900/40 text-blue-300 border border-blue-700/40 px-1.5 py-0.5 rounded whitespace-nowrap truncate max-w-[100px]" title={company.name}>{company.name}</span>
              </div>

              <div className="grid grid-cols-3 gap-1 text-center">
                <div className="bg-gray-900/60 rounded p-1.5">
                  <div className="text-sm font-bold text-blue-300">{compound.users_count || 0}</div>
                  <div className="text-[9px] text-gray-500">{t('ct_users','مستخدم')}</div>
                </div>
                <div className="bg-gray-900/60 rounded p-1.5">
                  <div className="text-sm font-bold text-emerald-300">{compound.stats?.active_subs || 0}</div>
                  <div className="text-[9px] text-gray-500">{t('ct_active','نشط')}</div>
                </div>
                <div className="bg-gray-900/60 rounded p-1.5">
                  <div className="text-sm font-bold text-red-300">{compound.stats?.expired_subs || 0}</div>
                  <div className="text-[9px] text-gray-500">{t('ct_expired','منتهي')}</div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1">
                <button onClick={() => onAddUser(compound)} title={t('ct_add_user','إضافة ساكن')} className="bg-green-600/30 hover:bg-green-600/50 text-green-200 text-xs py-1.5 rounded" data-testid={`ct-grid-add-user-${compound.id}`}>➕</button>
                <button onClick={() => onContract(compound, company)} title={t('ct_contract','العقد')} className="bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 text-xs py-1.5 rounded" data-testid={`ct-grid-contract-${compound.id}`}>📋</button>
                <button onClick={() => onEdit(compound, company.id)} title={t('ct_edit','تعديل')} className="bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 text-xs py-1.5 rounded" data-testid={`ct-grid-edit-${compound.id}`}>✏️</button>
                <button onClick={() => onExport(compound)} title={t('ct_export','تصدير')} className="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs py-1.5 rounded" data-testid={`ct-grid-export-${compound.id}`}>📑</button>
                <button onClick={() => onDelete(compound)} title={t('ct_delete','حذف')} className="bg-red-600/30 hover:bg-red-600/50 text-red-200 text-xs py-1.5 rounded" data-testid={`ct-grid-delete-${compound.id}`}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompoundsGridView;
