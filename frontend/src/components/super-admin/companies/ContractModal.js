import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/**
 * ContractModal — Company ↔ Compound Management Contract
 * Extracted from CompaniesTab.js (iter 40 refactor).
 * Props:
 *   ctx: { company_id, company_name, compound_id, compound_name }
 *   onClose: () => void
 *   t: i18n helper
 */
const ContractModal = ({ ctx, onClose, t }) => {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('view'); // 'view' | 'edit' | 'create'
  const [form, setForm] = useState({
    start_date: '', end_date: '', commission_percent: 10, fixed_fee: 0,
    billing_cycle: 'monthly', currency: 'EGP', auto_renew: false,
    renewal_period_months: 12, status: 'active', notes: '',
    pdf_data_url: null, pdf_filename: null,
  });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    axios.get(`${API}/super-admin/management-contracts?company_id=${ctx.company_id}&compound_id=${ctx.compound_id}`, getToken())
      .then(res => {
        if (!alive) return;
        const c = (res.data?.contracts || [])[0] || null;
        setContract(c);
        if (c) {
          setForm({
            start_date: c.start_date?.slice(0,10) || '',
            end_date: c.end_date?.slice(0,10) || '',
            commission_percent: c.commission_percent || 0,
            fixed_fee: c.fixed_fee || 0,
            billing_cycle: c.billing_cycle || 'monthly',
            currency: c.currency || 'EGP',
            auto_renew: !!c.auto_renew,
            renewal_period_months: c.renewal_period_months || 12,
            status: c.status || 'active',
            notes: c.notes || '',
            pdf_data_url: c.pdf_data_url || null,
            pdf_filename: c.pdf_filename || null,
          });
          setMode('view');
        } else {
          const today = new Date().toISOString().slice(0,10);
          const nextYear = new Date(); nextYear.setFullYear(nextYear.getFullYear()+1);
          setForm(f => ({...f, start_date: today, end_date: nextYear.toISOString().slice(0,10)}));
          setMode('create');
        }
      })
      .catch(err => toast.error(err.response?.data?.detail || t('ct_contract_load_failed','فشل تحميل العقد')))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [ctx.company_id, ctx.compound_id, t]);

  const handlePdf = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(t('ct_pdf_too_large','حجم الملف يتجاوز 5MB')); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({...f, pdf_data_url: reader.result, pdf_filename: file.name}));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    try {
      if (mode === 'create') {
        const res = await axios.post(`${API}/super-admin/management-contracts`, {
          company_id: ctx.company_id, compound_id: ctx.compound_id, ...form,
        }, getToken());
        setContract(res.data.contract);
        toast.success(t('ct_contract_created','تم إنشاء العقد'));
        setMode('view');
      } else {
        const res = await axios.put(`${API}/super-admin/management-contracts/${contract.id}`, form, getToken());
        setContract(res.data.contract);
        toast.success(t('ct_contract_updated','تم تحديث العقد'));
        setMode('view');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || t('ct_contract_save_failed','فشل الحفظ'));
    }
  };

  const remove = async () => {
    if (!contract?.id) return;
    if (!window.confirm(t('ct_contract_confirm_delete','تأكيد حذف العقد؟'))) return;
    try {
      await axios.delete(`${API}/super-admin/management-contracts/${contract.id}`, getToken());
      toast.success(t('ct_contract_deleted','تم حذف العقد'));
      onClose();
    } catch (err) { toast.error(err.response?.data?.detail || t('ct_delete_failed','فشل الحذف')); }
  };

  const statusColor = { active: 'text-emerald-300 bg-emerald-900/30', expired: 'text-red-300 bg-red-900/30', cancelled: 'text-gray-400 bg-gray-800', pending: 'text-amber-300 bg-amber-900/30' };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-4 border border-amber-500/30 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="ct-contract-modal">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-white">📋 {t('ct_contract_title','عقد الإدارة')}</h3>
            <p className="text-[11px] text-gray-400 mt-1">{ctx.company_name} <span className="text-amber-400">↔</span> {ctx.compound_name}</p>
          </div>
          {contract?.status && <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor[contract.status]}`}>{contract.status}</span>}
        </div>

        {loading ? <div className="text-center text-gray-400 py-6">{t('ct_loading','جاري التحميل...')}</div> : (
          <>
            {mode === 'view' && contract ? (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-900/60 rounded-lg p-2"><div className="text-gray-500">{t('ct_start_date','بداية')}</div><div className="text-white font-semibold">{form.start_date || '—'}</div></div>
                  <div className="bg-gray-900/60 rounded-lg p-2"><div className="text-gray-500">{t('ct_end_date','نهاية')}</div><div className="text-white font-semibold">{form.end_date || '—'}</div></div>
                  <div className="bg-gray-900/60 rounded-lg p-2"><div className="text-gray-500">{t('ct_commission','عمولة %')}</div><div className="text-emerald-300 font-bold">{form.commission_percent}%</div></div>
                  <div className="bg-gray-900/60 rounded-lg p-2"><div className="text-gray-500">{t('ct_fixed_fee','رسوم ثابتة')}</div><div className="text-amber-300 font-bold">{form.fixed_fee} {form.currency}</div></div>
                  <div className="bg-gray-900/60 rounded-lg p-2"><div className="text-gray-500">{t('ct_billing','دورة الفوترة')}</div><div className="text-white">{form.billing_cycle}</div></div>
                  <div className="bg-gray-900/60 rounded-lg p-2"><div className="text-gray-500">{t('ct_auto_renew','تجديد تلقائي')}</div><div className="text-white">{form.auto_renew ? `✓ كل ${form.renewal_period_months} شهر` : '✗'}</div></div>
                </div>
                {contract.days_until_expiry !== undefined && contract.days_until_expiry <= 30 && contract.status === 'active' && (
                  <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-2 text-[11px] text-amber-200">
                    ⚠️ {t('ct_expiring','ينتهي خلال')} {contract.days_until_expiry} {t('ct_days','يوم')}
                  </div>
                )}
                {form.notes && <div className="bg-gray-900/60 rounded-lg p-2 text-[11px] text-gray-300 italic">{form.notes}</div>}
                {form.pdf_filename && (
                  <a href={`${API}/super-admin/management-contracts/${contract.id}/pdf`}
                     target="_blank" rel="noopener noreferrer"
                     className="inline-block bg-blue-600 hover:bg-blue-500 text-white text-[11px] px-3 py-1.5 rounded-lg font-semibold"
                     data-testid="ct-contract-download-pdf">📄 {form.pdf_filename}</a>
                )}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setMode('edit')} className="flex-1 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold" data-testid="ct-contract-edit-btn">✏️ {t('ct_edit','تعديل')}</button>
                  <button onClick={remove} className="px-3 py-2 bg-red-600/40 hover:bg-red-600/60 text-red-200 rounded-lg text-xs" data-testid="ct-contract-delete-btn">🗑</button>
                  <button onClick={onClose} className="px-3 py-2 bg-gray-700 text-gray-200 rounded-lg text-xs">{t('ct_close','إغلاق')}</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 mb-1">{t('ct_start_date','تاريخ البداية')}</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white" data-testid="ct-contract-start" />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">{t('ct_end_date','تاريخ النهاية')}</label>
                    <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white" data-testid="ct-contract-end" />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">{t('ct_commission','نسبة العمولة %')}</label>
                    <input type="number" step="0.5" min="0" max="100" value={form.commission_percent} onChange={e => setForm({...form, commission_percent: parseFloat(e.target.value) || 0})} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white" data-testid="ct-contract-commission" />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">{t('ct_fixed_fee','رسوم ثابتة')}</label>
                    <input type="number" step="100" min="0" value={form.fixed_fee} onChange={e => setForm({...form, fixed_fee: parseFloat(e.target.value) || 0})} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white" data-testid="ct-contract-fee" />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">{t('ct_billing','دورة الفوترة')}</label>
                    <select value={form.billing_cycle} onChange={e => setForm({...form, billing_cycle: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white" data-testid="ct-contract-billing">
                      <option value="monthly">{t('ct_monthly','شهري')}</option>
                      <option value="yearly">{t('ct_yearly','سنوي')}</option>
                      <option value="per_unit">{t('ct_per_unit','لكل وحدة')}</option>
                      <option value="one_time">{t('ct_one_time','دفعة واحدة')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">{t('ct_currency','العملة')}</label>
                    <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white">
                      <option value="EGP">EGP</option><option value="USD">USD</option><option value="SAR">SAR</option><option value="AED">AED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">{t('ct_status','الحالة')}</label>
                    <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white" data-testid="ct-contract-status">
                      <option value="active">{t('ct_st_active','نشط')}</option>
                      <option value="pending">{t('ct_st_pending','معلّق')}</option>
                      <option value="cancelled">{t('ct_st_cancelled','ملغى')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">{t('ct_renew_months','دورة التجديد (شهور)')}</label>
                    <input type="number" min="1" max="60" value={form.renewal_period_months} onChange={e => setForm({...form, renewal_period_months: parseInt(e.target.value) || 12})} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white" />
                  </div>
                </div>
                <label className="flex items-center gap-2 bg-gray-900/60 rounded-lg p-2 cursor-pointer">
                  <input type="checkbox" checked={form.auto_renew} onChange={e => setForm({...form, auto_renew: e.target.checked})} data-testid="ct-contract-auto-renew" />
                  <span className="text-emerald-300 font-semibold">🔄 {t('ct_auto_renew_enable','تفعيل التجديد التلقائي')}</span>
                </label>
                <div>
                  <label className="block text-gray-400 mb-1">{t('ct_notes','ملاحظات')}</label>
                  <textarea rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-white" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">📄 {t('ct_upload_pdf','ملف العقد PDF (اختياري، حتى 5MB)')}</label>
                  <input type="file" accept="application/pdf" onChange={e => handlePdf(e.target.files?.[0])} className="w-full text-gray-300 file:mr-2 file:px-2 file:py-1 file:bg-blue-600 file:text-white file:rounded file:border-0" data-testid="ct-contract-pdf" />
                  {form.pdf_filename && <div className="text-[11px] text-emerald-300 mt-1">📎 {form.pdf_filename}</div>}
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={save} className="flex-1 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold" data-testid="ct-contract-save-btn">💾 {mode === 'create' ? t('ct_create','إنشاء') : t('ct_save','حفظ')}</button>
                  <button onClick={() => contract ? setMode('view') : onClose()} className="px-3 py-2 bg-gray-700 text-gray-200 rounded-lg text-xs">{t('ct_cancel','إلغاء')}</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ContractModal;
