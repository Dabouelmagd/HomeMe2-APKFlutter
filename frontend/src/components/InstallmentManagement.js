import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../App';
import {
  PlusIcon, DocumentArrowDownIcon, PencilSquareIcon,
  TrashIcon, BanknotesIcon, CheckCircleIcon, ClockIcon,
  ExclamationTriangleIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tok = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const STATUS_AR = { active: '🟢 نشط', completed: '✅ مكتمل', cancelled: '🔴 ملغي', pending: '⏳ معلق' };
const INST_STATUS = { paid: '✅ مدفوع', pending: '⏳ معلق', overdue: '🔴 متأخر' };
const PRICING_METHODS = [
  { value: 'fixed', label: 'قسط شهري ثابت' },
  { value: 'per_sqm', label: 'حسب المساحة (م²)' },
  { value: 'percentage', label: 'نسبة مئوية' },
  { value: 'custom', label: 'مبلغ مخصص' },
];

export default function InstallmentManagement({ compoundId, residentView = false }) {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [residents, setResidents] = useState([]);
  const [payModal, setPayModal] = useState(null); // {plan, installment}

  const [form, setForm] = useState({
    resident_id: '', unit_number: '', title: '',
    total_amount: '', down_payment: 0, installment_count: 12,
    installment_amount: '', start_date: new Date().toISOString().slice(0, 10),
    late_fee_rate: 2, early_payment_discount: 5,
    deposit_amount: 0, deposit_refundable: true,
    pricing_method: 'fixed', notes: '',
  });

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/financial/installment-plans`, {
        ...tok(),
        params: residentView ? { resident_id: user?.id } : { compound_id: compoundId }
      });
      setPlans(res.data.plans || []);
    } catch { toast.error('فشل تحميل خطط الأقساط'); }
    finally { setLoading(false); }
  };

  const fetchResidents = async () => {
    try {
      const res = await axios.get(`${API}/admin/users`, tok());
      setResidents(res.data.users?.filter(u => ['resident', 'family_head'].includes(u.role)) || []);
    } catch {}
  };

  useEffect(() => {
    fetchPlans();
    if (!residentView) fetchResidents();
  }, []);

  // Auto-calculate installment amount
  useEffect(() => {
    if (form.total_amount && form.installment_count > 0) {
      const remaining = parseFloat(form.total_amount) - parseFloat(form.down_payment || 0);
      const inst = (remaining / parseInt(form.installment_count)).toFixed(2);
      setForm(p => ({ ...p, installment_amount: inst }));
    }
  }, [form.total_amount, form.down_payment, form.installment_count]);

  const handleCreate = async () => {
    if (!form.resident_id || !form.title || !form.total_amount) {
      toast.error('يرجى تعبئة الحقول المطلوبة');
      return;
    }
    try {
      await axios.post(`${API}/financial/installment-plans`, {
        ...form,
        total_amount: parseFloat(form.total_amount),
        down_payment: parseFloat(form.down_payment || 0),
        installment_count: parseInt(form.installment_count),
        installment_amount: parseFloat(form.installment_amount),
        late_fee_rate: parseFloat(form.late_fee_rate || 0),
        early_payment_discount: parseFloat(form.early_payment_discount || 0),
        deposit_amount: parseFloat(form.deposit_amount || 0),
      }, tok());
      toast.success('✅ تم إنشاء خطة الأقساط');
      setShowCreate(false);
      fetchPlans();
    } catch (e) { toast.error(e.response?.data?.detail || 'فشل الإنشاء'); }
  };

  const handlePay = async () => {
    const { plan, inst, method, notes } = payModal;
    try {
      const res = await axios.put(
        `${API}/financial/installment-plans/${plan.id}/pay/${inst.number}`,
        { payment_method: method, notes },
        tok()
      );
      const d = res.data;
      toast.success(
        `✅ تم دفع القسط ${inst.number}\n` +
        `${d.late_fee > 0 ? `فائدة تأخير: ${d.late_fee} ج.م | ` : ''}` +
        `${d.discount > 0 ? `خصم كاش: ${d.discount} ج.م | ` : ''}` +
        `الإجمالي: ${d.final_amount} ج.م`
      );
      setPayModal(null);
      fetchPlans();
    } catch (e) { toast.error(e.response?.data?.detail || 'فشل التسجيل'); }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('حذف خطة الأقساط؟')) return;
    await axios.delete(`${API}/financial/installment-plans/${planId}`, tok());
    toast.success('تم الحذف');
    fetchPlans();
  };

  const handleNotifyOverdue = async () => {
    try {
      const res = await axios.post(`${API}/financial/installment-plans/notify-overdue`,
        { compound_id: compoundId }, tok());
      toast.success(`✅ تم إرسال ${res.data.notified} إشعار للمتأخرين`);
    } catch { toast.error('فشل الإرسال'); }
  };

  const handleUploadProof = async (planId, instNumber, file) => {
    const fd = new FormData();
    fd.append('proof', file);
    fd.append('installment_number', instNumber);
    fd.append('notes', 'إيصال دفع قسط');
    try {
      await axios.post(`${API}/financial/installment-plans/${planId}/upload-proof`, fd, {
        headers: { ...tok().headers, 'Content-Type': 'multipart/form-data' }
      });
      toast.success('✅ تم رفع الإيصال');
      fetchPlans();
    } catch { toast.error('فشل رفع الإيصال'); }
  };

  const handleExport = () => {
    const url = `${API}/financial/installment-plans/export/excel?compound_id=${compoundId}`;
    const a = document.createElement('a');
    a.href = url;
    a.click();
  };

  const isOverdue = (inst) => {
    if (inst.status === 'paid') return false;
    return new Date(inst.due_date) < new Date();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
    </div>
  );

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BanknotesIcon className="h-6 w-6 text-emerald-600" />
            نظام الأقساط المالية
          </h2>
          <p className="text-sm text-gray-500">{plans.length} خطة مسجّلة</p>
        </div>
        {!residentView && (
          <div className="flex gap-2">
            <button onClick={handleNotifyOverdue}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 hover:bg-red-100 transition-colors">
              <ExclamationTriangleIcon className="h-4 w-4" />
              إشعار المتأخرين
            </button>
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <DocumentArrowDownIcon className="h-4 w-4" />
              Excel
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors">
              <PlusIcon className="h-4 w-4" />
              خطة أقساط جديدة
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {plans.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'إجمالي الأقساط', value: plans.reduce((s, p) => s + p.total_amount, 0), color: 'blue' },
            { label: 'المحصّل', value: plans.reduce((s, p) => s + p.installments?.filter(i => i.status === 'paid').reduce((a, i) => a + (i.paid_amount || 0), 0), 0), color: 'emerald' },
            { label: 'المتبقي', value: plans.reduce((s, p) => s + p.installments?.filter(i => i.status !== 'paid').reduce((a, i) => a + i.amount, 0), 0), color: 'amber' },
            { label: 'الودائع', value: plans.reduce((s, p) => s + (p.deposit_amount || 0), 0), color: 'purple' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-200 dark:border-${color}-700 rounded-xl p-3 text-center`}>
              <p className={`text-xl font-bold text-${color}-700 dark:text-${color}-400`}>
                {value.toLocaleString('ar-EG')} ج.م
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Plans List */}
      {plans.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <BanknotesIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد خطط أقساط مسجّلة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => {
            const paidCount = plan.installments?.filter(i => i.status === 'paid').length || 0;
            const totalCount = plan.installments?.length || 0;
            const paidAmount = plan.installments?.filter(i => i.status === 'paid').reduce((s, i) => s + (i.paid_amount || 0), 0) || 0;
            const overdueCount = plan.installments?.filter(i => isOverdue(i)).length || 0;
            const progress = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;

            return (
              <div key={plan.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Plan Header */}
                <div className="p-4 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    plan.status === 'completed' ? 'bg-emerald-100' : overdueCount > 0 ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    {plan.status === 'completed' ? <CheckCircleIcon className="h-5 w-5 text-emerald-600" /> :
                     overdueCount > 0 ? <ExclamationTriangleIcon className="h-5 w-5 text-red-600" /> :
                     <ClockIcon className="h-5 w-5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-gray-900 dark:text-white">{plan.title}</p>
                      <span className="text-xs">{STATUS_AR[plan.status]}</span>
                      {overdueCount > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">
                          {overdueCount} متأخر
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">وحدة {plan.unit_number} • {PRICING_METHODS.find(m => m.value === plan.pricing_method)?.label}</p>

                    {/* Progress */}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{paidCount}/{totalCount} قسط</span>
                        <span>{paidAmount.toLocaleString()} / {plan.total_amount.toLocaleString()} ج.م</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    {/* Key info */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-gray-500">
                      {plan.late_fee_rate > 0 && <span>⏰ فائدة تأخير {plan.late_fee_rate}%</span>}
                      {plan.early_payment_discount > 0 && <span>💰 خصم كاش {plan.early_payment_discount}%</span>}
                      {plan.deposit_amount > 0 && <span>🔒 وديعة {plan.deposit_amount.toLocaleString()} ج.م</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!residentView && (
                      <button onClick={() => handleDelete(plan.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                      {expandedPlan === plan.id ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Installments Table */}
                {expandedPlan === plan.id && (
                  <div className="border-t border-gray-100 dark:border-gray-700">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                          <tr>
                            <th className="px-4 py-2 text-right text-xs font-bold text-gray-500">#</th>
                            <th className="px-4 py-2 text-right text-xs font-bold text-gray-500">تاريخ الاستحقاق</th>
                            <th className="px-4 py-2 text-right text-xs font-bold text-gray-500">المبلغ</th>
                            <th className="px-4 py-2 text-right text-xs font-bold text-gray-500">فائدة تأخير</th>
                            <th className="px-4 py-2 text-right text-xs font-bold text-gray-500">خصم</th>
                            <th className="px-4 py-2 text-right text-xs font-bold text-gray-500">الحالة</th>
                            {!residentView && <th className="px-4 py-2 text-right text-xs font-bold text-gray-500">إجراء</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {plan.installments?.map(inst => (
                            <tr key={inst.number} className={`${isOverdue(inst) ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                              <td className="px-4 py-2 font-bold text-gray-600 dark:text-gray-400">{inst.number}</td>
                              <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                {new Date(inst.due_date).toLocaleDateString('ar-EG')}
                                {isOverdue(inst) && <span className="text-red-500 text-xs mr-1">متأخر!</span>}
                              </td>
                              <td className="px-4 py-2 font-bold text-gray-800 dark:text-white">{inst.amount.toLocaleString()} ج.م</td>
                              <td className="px-4 py-2 text-red-600">{inst.late_fee > 0 ? `+${inst.late_fee}` : '—'}</td>
                              <td className="px-4 py-2 text-emerald-600">{inst.discount > 0 ? `-${inst.discount}` : '—'}</td>
                              <td className="px-4 py-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  inst.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                  isOverdue(inst) ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {inst.status === 'paid' ? '✅ مدفوع' : isOverdue(inst) ? '🔴 متأخر' : '⏳ معلق'}
                                </span>
                                {inst.status === 'paid' && inst.paid_amount && (
                                  <span className="text-xs text-gray-500 mr-1">({inst.paid_amount} ج.م)</span>
                                )}
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-1">
                                  {!residentView && inst.status !== 'paid' && (
                                    <button
                                      onClick={() => setPayModal({ plan, inst, method: 'cash', notes: '' })}
                                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg transition-colors">
                                      دفع
                                    </button>
                                  )}
                                  {inst.status !== 'paid' && (
                                    <label className="cursor-pointer">
                                      <input type="file" accept="image/*,.pdf" className="hidden"
                                        onChange={e => e.target.files[0] && handleUploadProof(plan.id, inst.number, e.target.files[0])} />
                                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-200 transition-colors">
                                        📎 إيصال
                                      </span>
                                    </label>
                                  )}
                                  {inst.proof_url && (
                                    <a href={`${process.env.REACT_APP_BACKEND_URL}${inst.proof_url}`}
                                      target="_blank" rel="noreferrer"
                                      className="text-xs text-emerald-600 hover:underline">✅ إيصال</a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {plan.notes && (
                      <p className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100 dark:border-gray-700">
                        📝 {plan.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BanknotesIcon className="h-5 w-5 text-emerald-600" />
                خطة أقساط جديدة
              </h3>
              <button onClick={() => setShowCreate(false)}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Resident + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الساكن *</label>
                  <select value={form.resident_id}
                    onChange={e => {
                      const r = residents.find(x => x.id === e.target.value);
                      setForm(p => ({ ...p, resident_id: e.target.value, unit_number: r?.unit_number || '' }));
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none">
                    <option value="">اختر ساكن...</option>
                    {residents.map(r => (
                      <option key={r.id} value={r.id}>{r.full_name || r.username} — وحدة {r.unit_number}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">رقم الوحدة</label>
                  <input value={form.unit_number} onChange={e => setForm(p => ({...p, unit_number: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                </div>
              </div>

              {/* Title + Pricing Method */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">عنوان الالتزام *</label>
                  <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
                    placeholder="ثمن الوحدة / رسوم الصيانة / ..."
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">طريقة التسعير</label>
                  <select value={form.pricing_method} onChange={e => setForm(p => ({...p, pricing_method: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none">
                    {PRICING_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Financial amounts */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">المبلغ الإجمالي *</label>
                  <input type="number" value={form.total_amount} onChange={e => setForm(p => ({...p, total_amount: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">الدفعة الأولى</label>
                  <input type="number" value={form.down_payment} onChange={e => setForm(p => ({...p, down_payment: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">عدد الأقساط</label>
                  <input type="number" value={form.installment_count} onChange={e => setForm(p => ({...p, installment_count: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                </div>
              </div>

              {/* Auto-calculated installment */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-3">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                  💡 قيمة القسط الشهري المحسوبة: <span className="text-lg">{parseFloat(form.installment_amount || 0).toLocaleString()} ج.م</span>
                </p>
              </div>

              {/* Start date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">تاريخ بداية الأقساط</label>
                <input type="date" value={form.start_date} onChange={e => setForm(p => ({...p, start_date: e.target.value}))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
              </div>

              {/* Late fee + Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">% فائدة التأخير شهرياً</label>
                  <input type="number" step="0.5" value={form.late_fee_rate} onChange={e => setForm(p => ({...p, late_fee_rate: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">% خصم الدفع الكاش</label>
                  <input type="number" step="0.5" value={form.early_payment_discount} onChange={e => setForm(p => ({...p, early_payment_discount: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                </div>
              </div>

              {/* Deposit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">قيمة الوديعة</label>
                  <input type="number" value={form.deposit_amount} onChange={e => setForm(p => ({...p, deposit_amount: e.target.value}))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="refundable" checked={form.deposit_refundable}
                    onChange={e => setForm(p => ({...p, deposit_refundable: e.target.checked}))}
                    className="w-4 h-4 accent-emerald-600" />
                  <label htmlFor="refundable" className="text-sm text-gray-700 dark:text-gray-300">وديعة قابلة للاسترداد</label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
              <button onClick={handleCreate}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-colors">
                إنشاء الخطة
              </button>
              <button onClick={() => setShowCreate(false)}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Installment Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">
              تسجيل دفع القسط #{payModal.inst.number}
            </h3>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 mb-4 space-y-1 text-sm">
              <p className="flex justify-between"><span>قيمة القسط:</span><strong>{payModal.inst.amount.toLocaleString()} ج.م</strong></p>
              {payModal.plan.late_fee_rate > 0 && isOverdue(payModal.inst) && (
                <p className="flex justify-between text-red-600"><span>⚠️ فائدة تأخير محتملة ({payModal.plan.late_fee_rate}%/شهر)</span></p>
              )}
              {payModal.method === 'cash' && payModal.plan.early_payment_discount > 0 && (
                <p className="flex justify-between text-emerald-600"><span>💰 خصم الدفع الكاش ({payModal.plan.early_payment_discount}%)</span></p>
              )}
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">طريقة الدفع</label>
                <select value={payModal.method}
                  onChange={e => setPayModal(p => ({...p, method: e.target.value}))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none">
                  <option value="cash">💵 كاش (مع خصم)</option>
                  <option value="bank_transfer">🏦 تحويل بنكي</option>
                  <option value="vodafone_cash">📱 فودافون كاش</option>
                  <option value="instapay">⚡ إنستاباي</option>
                  <option value="check">📋 شيك</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
                <input value={payModal.notes}
                  onChange={e => setPayModal(p => ({...p, notes: e.target.value}))}
                  placeholder="رقم الإيصال / ملاحظة..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handlePay}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-colors">
                ✅ تأكيد الدفع
              </button>
              <button onClick={() => setPayModal(null)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
