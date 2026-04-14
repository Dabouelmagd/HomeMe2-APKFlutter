import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const ContractsManagement = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [contracts, setContracts] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [filter, setFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    title: '', provider_name: '', provider_phone: '', provider_email: '',
    category: 'maintenance', value: '', start_date: '', end_date: '',
    terms: '', auto_renew: false
  };
  const [form, setForm] = useState(emptyForm);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/contracts`, getToken());
      setContracts(res.data.contracts || []);
      setSummary(res.data.summary || {});
    } catch (err) {
      console.error('Error:', err);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.provider_name || !form.start_date || !form.end_date) return;
    setSubmitting(true);
    try {
      if (editingContract) {
        await axios.put(`${API}/contracts/${editingContract.id}`, { ...form, value: parseFloat(form.value) || 0 }, getToken());
        toast.success(t('contract_updated', t('ct_updated', 'تم تحديث العقد بنجاح')));
      } else {
        await axios.post(`${API}/contracts`, { ...form, value: parseFloat(form.value) || 0 }, getToken());
        toast.success(t('contract_created', t('ct_created', 'تم إنشاء العقد بنجاح')));
      }
      setShowModal(false);
      setEditingContract(null);
      setForm(emptyForm);
      fetchContracts();
    } catch (err) {
      toast.error(t('contract_failed', t('ct_save_failed', 'فشل في حفظ العقد')));
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('confirm_delete_contract', t('ct_confirm_delete', 'هل تريد حذف هذا العقد؟')))) return;
    try {
      await axios.delete(`${API}/contracts/${id}`, getToken());
      toast.success(t('contract_deleted', t('ct_deleted', 'تم حذف العقد')));
      fetchContracts();
    } catch (err) {
      toast.error(t('delete_failed', t('ct_delete_failed', 'فشل في الحذف')));
    }
  };

  const handleEdit = (c) => {
    setEditingContract(c);
    setForm({
      title: c.title, provider_name: c.provider_name, provider_phone: c.provider_phone || '',
      provider_email: c.provider_email || '', category: c.category, value: c.value?.toString() || '',
      start_date: c.start_date?.slice(0, 10) || '', end_date: c.end_date?.slice(0, 10) || '',
      terms: c.terms || '', auto_renew: c.auto_renew || false
    });
    setShowModal(true);
  };

  const catLabels = {
    maintenance: t('maintenance', t('ct_cat_maint', 'صيانة')), security: t('security', t('ct_cat_guard', 'حراسة')),
    cleaning: t('cleaning', t('ct_cat_clean', 'نظافة')), utilities: t('utilities', t('ct_cat_facility', 'مرافق')), other: t('other', t('ct_cat_other', 'أخرى'))
  };

  const filtered = filter === 'all' ? contracts
    : filter === 'expiring' ? contracts.filter(c => c.urgency === 'warning' || c.urgency === 'critical')
    : filter === 'expired' ? contracts.filter(c => c.days_remaining !== null && c.days_remaining < 0)
    : contracts.filter(c => c.days_remaining >= 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="contracts-management">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('contracts_management', t('ct_title', 'إدارة العقود والتعاقدات'))}</h1>
            <p className="text-sm text-gray-500">{t('contracts_desc', t('ct_subtitle', 'متابعة عقود مزودي الخدمات والصيانة'))}</p>
          </div>
          <button onClick={() => { setEditingContract(null); setForm(emptyForm); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            data-testid="add-contract-btn">
            <PlusIcon className="h-4 w-4" />{t('add_contract', t('ct_add', 'إضافة عقد'))}
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6" data-testid="contracts-summary">
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{summary.total || 0}</p>
            <p className="text-xs text-gray-500">{t('total_contracts', t('ct_total', 'إجمالي العقود'))}</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{summary.active || 0}</p>
            <p className="text-xs text-green-600">{t('active', t('ct_active', 'نشطة'))}</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{summary.expiring_soon || 0}</p>
            <p className="text-xs text-amber-600">{t('expiring_soon', t('ct_expiring', 'قريبة الانتهاء'))}</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{summary.expired || 0}</p>
            <p className="text-xs text-red-600">{t('expired', t('ct_expired_f', 'منتهية'))}</p>
          </div>
          <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{(summary.total_value || 0).toLocaleString()}</p>
            <p className="text-xs text-indigo-600">{t('total_value', t('ct_total_value', 'إجمالي القيمة'))}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {[
            { id: 'all', label: t('all', t('ct_all', 'الكل')) },
            { id: 'active', label: t('active', t('ct_active', 'نشطة')) },
            { id: 'expiring', label: t('expiring_soon', t('ct_expiring', 'قريبة الانتهاء')) },
            { id: 'expired', label: t('expired', t('ct_expired_f', 'منتهية')) },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f.id ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
              data-testid={`filter-${f.id}`}>{f.label}</button>
          ))}
        </div>

        {/* Contracts List */}
        <div className="space-y-3">
          {filtered.length > 0 ? filtered.map(c => (
            <div key={c.id} className={`bg-white rounded-xl border-2 p-5 ${
              c.urgency === 'critical' ? 'border-red-300 bg-red-50' :
              c.urgency === 'warning' ? 'border-amber-300 bg-amber-50' :
              c.days_remaining < 0 ? 'border-gray-300 bg-gray-50 opacity-70' : 'border-gray-200'
            }`} data-testid={`contract-${c.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-900 text-lg">{c.title}</h3>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">{catLabels[c.category] || c.category}</span>
                    {c.urgency === 'critical' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                        <ExclamationTriangleIcon className="h-3 w-3" />{t('urgent', t('ct_urgent', 'عاجل'))}
                      </span>
                    )}
                    {c.urgency === 'warning' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">
                        <ClockIcon className="h-3 w-3" />{t('expiring', t('ct_near_expiry', 'قارب الانتهاء'))}
                      </span>
                    )}
                    {c.days_remaining < 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-gray-200 text-gray-600">
                        <XCircleIcon className="h-3 w-3" />{t('expired', t('ct_expired_m', 'منتهي'))}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-2">
                    <span className="font-medium">{c.provider_name}</span>
                    {c.provider_phone && <span className="flex items-center gap-1"><PhoneIcon className="h-3.5 w-3.5" />{c.provider_phone}</span>}
                    {c.provider_email && <span className="flex items-center gap-1"><EnvelopeIcon className="h-3.5 w-3.5" />{c.provider_email}</span>}
                  </div>
                  <div className="flex gap-6 text-sm">
                    <span className="text-gray-500">{t('start', t('ct_start', 'البداية'))}: <strong>{c.start_date?.slice(0, 10)}</strong></span>
                    <span className="text-gray-500">{t('end', t('ct_end', 'النهاية'))}: <strong>{c.end_date?.slice(0, 10)}</strong></span>
                    {c.days_remaining !== null && c.days_remaining >= 0 && (
                      <span className={`font-bold ${c.days_remaining <= 7 ? 'text-red-600' : c.days_remaining <= 30 ? 'text-amber-600' : 'text-green-600'}`}>
                        {c.days_remaining} {t('days_left', t('ct_days_left', 'يوم متبقي'))}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-indigo-600 mb-2">{Number(c.value || 0).toLocaleString()}</p>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(c)} className="p-2 rounded-lg hover:bg-gray-100" data-testid={`edit-${c.id}`}>
                      <PencilIcon className="h-4 w-4 text-gray-500" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg hover:bg-red-50" data-testid={`delete-${c.id}`}>
                      <TrashIcon className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 bg-white rounded-xl border">
              <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t('no_contracts', t('ct_no_contracts', 'لا توجد عقود'))}</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} data-testid="contract-modal">
              <h3 className="text-lg font-bold mb-4">{editingContract ? t('edit_contract', t('ct_edit', 'تعديل العقد')) : t('add_contract', t('ct_add_new', 'إضافة عقد جديد'))}</h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('contract_title', t('ct_contract_title', 'عنوان العقد'))}</label>
                  <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="w-full border rounded-lg p-2.5" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('provider_name', t('ct_vendor', 'اسم المزود'))}</label>
                    <input type="text" value={form.provider_name} onChange={e => setForm(p => ({ ...p, provider_name: e.target.value }))} className="w-full border rounded-lg p-2.5" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('category', t('ct_category', 'التصنيف'))}</label>
                    <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full border rounded-lg p-2.5">
                      <option value="maintenance">{t('maintenance', t('ct_cat_maint', 'صيانة'))}</option>
                      <option value="security">{t('security', t('ct_cat_guard', 'حراسة'))}</option>
                      <option value="cleaning">{t('cleaning', t('ct_cat_clean', 'نظافة'))}</option>
                      <option value="utilities">{t('utilities', t('ct_cat_facility', 'مرافق'))}</option>
                      <option value="other">{t('other', t('ct_cat_other', 'أخرى'))}</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('phone', t('ct_phone', 'الهاتف'))}</label>
                    <input type="text" value={form.provider_phone} onChange={e => setForm(p => ({ ...p, provider_phone: e.target.value }))} className="w-full border rounded-lg p-2.5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('email', t('ct_email', 'البريد'))}</label>
                    <input type="email" value={form.provider_email} onChange={e => setForm(p => ({ ...p, provider_email: e.target.value }))} className="w-full border rounded-lg p-2.5" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('contract_value', t('ct_value', 'قيمة العقد'))}</label>
                  <input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} className="w-full border rounded-lg p-2.5" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('start_date', t('ct_start_date', 'تاريخ البدء'))}</label>
                    <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="w-full border rounded-lg p-2.5" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('end_date', t('ct_end_date', 'تاريخ الانتهاء'))}</label>
                    <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className="w-full border rounded-lg p-2.5" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('terms', t('ct_terms', 'شروط العقد'))}</label>
                  <textarea value={form.terms} onChange={e => setForm(p => ({ ...p, terms: e.target.value }))} className="w-full border rounded-lg p-2.5 h-20 resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={submitting} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50">{submitting ? '...' : t('save', t('ct_save', 'حفظ'))}</button>
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium">{t('cancel', t('ct_cancel', 'إلغاء'))}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractsManagement;
