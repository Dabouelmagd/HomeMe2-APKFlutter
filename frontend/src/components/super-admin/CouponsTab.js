import React from 'react';
import { toast } from 'sonner';

const CouponsTab = ({
  t,
  couponStats,
  coupons,
  showCreateCoupon,
  setShowCreateCoupon,
  newCoupon,
  setNewCoupon,
  handleCreateCoupon,
  handleToggleCoupon,
  handleDeleteCoupon,
  setEditCoupon,
}) => {
  return (
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
        + {t('sa_create_coupon_new', 'إنشاء كوبون جديد')}
      </button>

      {showCreateCoupon && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
          <h3 className="text-lg font-bold mb-4">{t('sa_create_coupon', 'إنشاء كوبون خصم')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('sa_coupon_code', 'كود الكوبون')}</label>
              <input type="text" value={newCoupon.code} onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value })} placeholder={t('sp_coupon_example', 'مثل: WELCOME20')} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('sa_discount_type', 'نوع الخصم')}</label>
              <select value={newCoupon.discount_type} onChange={e => setNewCoupon({ ...newCoupon, discount_type: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                <option value="percentage">{t('sp_percentage', 'نسبة مئوية')} %</option>
                <option value="fixed">{t('sp_fixed', 'مبلغ ثابت')} ({t('sp_egp', 'ج.م')})</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('sp_discount_value', 'قيمة الخصم')} {newCoupon.discount_type === 'percentage' ? '%' : t('sp_egp', 'ج.م')}</label>
              <input type="number" min="1" value={newCoupon.discount_value} onChange={e => setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) || 0 })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('sa_max_usage', 'الحد الأقصى للاستخدام')}</label>
              <input type="number" min="1" value={newCoupon.max_uses} onChange={e => setNewCoupon({ ...newCoupon, max_uses: parseInt(e.target.value) || 1 })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('sa_notes', 'ملاحظات')}</label>
              <input type="text" value={newCoupon.notes} onChange={e => setNewCoupon({ ...newCoupon, notes: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" placeholder={t('sp_notes', 'ملاحظات...')} />
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
                    {c.is_active ? t('sp_active', 'نشط') : t('sp_disabled', 'معطل')}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex gap-1 justify-center">
                    <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success(t('sp_copied', 'تم النسخ')); }} className="px-2 py-1 text-xs bg-gray-700 rounded hover:bg-gray-600">{t('sp_copy', 'نسخ')}</button>
                    <button onClick={() => setEditCoupon({ ...c })} className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30">{t('sa_edit', 'تعديل')}</button>
                    <button onClick={() => handleToggleCoupon(c.id)} className={`px-2 py-1 text-xs rounded ${c.is_active ? 'bg-amber-600/20 text-amber-400' : 'bg-green-600/20 text-green-400'}`}>
                      {c.is_active ? t('sp_deactivate', 'تعطيل') : t('sp_activate', 'تفعيل')}
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
  );
};

export default CouponsTab;
