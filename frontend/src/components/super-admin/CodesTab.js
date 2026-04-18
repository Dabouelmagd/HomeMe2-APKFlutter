import React from 'react';

const CodesTab = ({
  t,
  codeStats,
  codes,
  showCreateCode,
  setShowCreateCode,
  newCode,
  setNewCode,
  bulkCount,
  setBulkCount,
  handleCreateCode,
  handleToggleCode,
  handleDeleteCode,
  setEditCode,
  fetchCodes,
}) => {
  const typeLabels = (c) => ({
    trial: t('sp_trial', 'تجريبي'),
    '3_months': t('sp_3m', '3 شهور'),
    '6_months': t('sp_6m', '6 شهور'),
    '9_months': t('sp_9m', '9 شهور'),
    '12_months': t('sp_year', 'سنة'),
    '1_year': t('sp_year', 'سنة'),
    lifetime: t('sp_lifetime', 'مدى الحياة'),
    duration: c.duration_months ? `${c.duration_months} ${t('sp_month', 'شهر')}` : t('sp_custom', 'مخصص'),
  });
  const planLabels = {
    starter: t('sp_free', 'مجاني'),
    basic: t('sp_basic', 'أساسي'),
    pro: t('sp_pro', 'احترافي'),
    premium: t('sp_premium', 'متقدم'),
    company_startup: t('sp_co_startup', 'شركة ناشئة'),
    company_business: t('sp_co_business', 'شركة متوسطة'),
    company_enterprise: t('sp_co_enterprise', 'شركة كبرى'),
  };

  return (
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
          + {t('sa_create_code_new', 'إنشاء كود جديد')}
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
              <select value={newCode.code_type} onChange={e => setNewCode({ ...newCode, code_type: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
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
              <select value={newCode.plan} onChange={e => setNewCode({ ...newCode, plan: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
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
              <input type="number" min="1" max="1000" value={newCode.max_uses} onChange={e => setNewCode({ ...newCode, max_uses: parseInt(e.target.value) || 1 })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('sa_custom_code', 'كود مخصص (اختياري)')}</label>
              <input type="text" placeholder={t('sp_code_example', 'مثل: VIP-2026')} value={newCode.custom_code} onChange={e => setNewCode({ ...newCode, custom_code: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('sa_notes', 'ملاحظات')}</label>
              <input type="text" placeholder={t('sp_notes', 'ملاحظات...')} value={newCode.notes} onChange={e => setNewCode({ ...newCode, notes: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
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
              const tl = typeLabels(c);
              const isUsedUp = (c.times_used || 0) >= (c.max_uses || 1);
              return (
                <tr key={c.code} className="hover:bg-gray-750">
                  <td className="px-4 py-3 font-mono font-bold text-green-400">{c.code}</td>
                  <td className="px-4 py-3 text-gray-300">{tl[c.type] || c.type}</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-300">{planLabels[c.plan] || c.plan || '-'}</span></td>
                  <td className="px-4 py-3 text-center"><span className={isUsedUp ? 'text-red-400' : 'text-gray-300'}>{c.times_used || 0}/{c.max_uses || 1}</span></td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active && !isUsedUp ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {c.is_active && !isUsedUp ? t('sp_active', 'نشط') : isUsedUp ? t('sp_used', 'مستخدم') : t('sp_disabled', 'معطل')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => setEditCode({ ...c })} className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30">{t('sa_edit', 'تعديل')}</button>
                      <button onClick={() => handleToggleCode(c.code)} className={`px-2 py-1 text-xs rounded ${c.is_active ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30' : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'}`}>
                        {c.is_active ? t('sp_deactivate', 'تعطيل') : t('sp_activate', 'تفعيل')}
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
  );
};

export default CodesTab;
