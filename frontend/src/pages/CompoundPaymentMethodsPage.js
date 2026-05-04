import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import PageHero from '../components/shared/PageHero';
import { toast } from 'sonner';
import {
  CreditCardIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  BuildingLibraryIcon,
  DevicePhoneMobileIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tokenHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const TYPE_ICONS = {
  vodafone_cash: DevicePhoneMobileIcon,
  orange_cash: DevicePhoneMobileIcon,
  etisalat_cash: DevicePhoneMobileIcon,
  we_pay: DevicePhoneMobileIcon,
  fawry: DevicePhoneMobileIcon,
  valu: DevicePhoneMobileIcon,
  meeza: CreditCardIcon,
  instapay: CreditCardIcon,
  bank_transfer: BuildingLibraryIcon,
  cash: BanknotesIcon,
  other: CreditCardIcon
};

const TYPE_COLORS = {
  vodafone_cash: 'from-red-500 to-rose-600',
  orange_cash: 'from-orange-500 to-amber-600',
  etisalat_cash: 'from-emerald-500 to-teal-600',
  we_pay: 'from-fuchsia-500 to-purple-600',
  instapay: 'from-violet-500 to-indigo-600',
  bank_transfer: 'from-blue-500 to-cyan-600',
  cash: 'from-green-500 to-emerald-600',
  fawry: 'from-yellow-500 to-orange-500',
  valu: 'from-rose-500 to-pink-600',
  meeza: 'from-slate-500 to-gray-700',
  other: 'from-slate-400 to-slate-600'
};

const emptyForm = {
  method_type: 'vodafone_cash',
  display_name: '',
  account_number: '',
  account_holder: '',
  bank_name: '',
  iban: '',
  swift_code: '',
  instructions: '',
  fee_note: '',
  is_active: true,
  sort_order: 0
};

const isAdminRole = (role) =>
  ['admin', 'compound_admin', 'company_admin', 'assistant_manager', 'accountant', 'app_owner', 'super_admin'].includes(role);

const CompoundPaymentMethodsPage = () => {
  const { user } = useAuth();
  const canEdit = isAdminRole(user?.role);
  const [methods, setMethods] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [m, t] = await Promise.all([
        axios.get(`${API}/compound-payment-methods`, tokenHeader()),
        axios.get(`${API}/compound-payment-methods/types`, tokenHeader())
      ]);
      setMethods(m.data.methods || []);
      setTypes(t.data.types || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (m) => {
    setEditing(m);
    setForm({
      method_type: m.method_type || 'vodafone_cash',
      display_name: m.display_name || '',
      account_number: m.account_number || '',
      account_holder: m.account_holder || '',
      bank_name: m.bank_name || '',
      iban: m.iban || '',
      swift_code: m.swift_code || '',
      instructions: m.instructions || '',
      fee_note: m.fee_note || '',
      is_active: m.is_active !== false,
      sort_order: m.sort_order || 0
    });
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await axios.put(`${API}/compound-payment-methods/${editing.id}`, form, tokenHeader());
        toast.success('تم تحديث طريقة الدفع');
      } else {
        await axios.post(`${API}/compound-payment-methods`, form, tokenHeader());
        toast.success('تمت إضافة طريقة الدفع');
      }
      setShowModal(false);
      loadAll();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل الحفظ');
    } finally { setSubmitting(false); }
  };

  const remove = async (m) => {
    if (!window.confirm(`حذف "${m.display_name || m.type_label_ar}"؟`)) return;
    try {
      await axios.delete(`${API}/compound-payment-methods/${m.id}`, tokenHeader());
      toast.success('تم الحذف');
      loadAll();
    } catch (e) {
      toast.error('فشل الحذف');
    }
  };

  const toggleActive = async (m) => {
    try {
      await axios.put(`${API}/compound-payment-methods/${m.id}`, { is_active: !m.is_active }, tokenHeader());
      loadAll();
    } catch (e) {
      toast.error('تعذر تحديث الحالة');
    }
  };

  const copy = async (txt, label = 'تم النسخ') => {
    try { await navigator.clipboard.writeText(txt); toast.success(label); } catch { toast.error('فشل النسخ'); }
  };

  if (loading) return (
    <div className="p-8 text-center text-gray-500">جارٍ التحميل…</div>
  );

  return (
    <div className="p-4 md:p-8 space-y-6" dir="rtl" data-testid="payment-methods-page">
      <PageHero
        icon="💳"
        title="طرق الدفع المعتمدة"
        subtitle="قنوات تحصيل الإدارة (محفظة، إنستاباي، بنك، فوري…) — يراها السكان عند سداد الالتزامات"
        accent="indigo"
        actions={canEdit && (
          <button
            onClick={openCreate}
            data-testid="add-payment-method-btn"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all text-sm"
          >
            <PlusIcon className="w-4 h-4" /> إضافة طريقة دفع
          </button>
        )}
      />

      {methods.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow border border-dashed border-gray-300">
          <CreditCardIcon className="w-16 h-16 mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-bold text-gray-700 mb-2">لا توجد طرق دفع مفعّلة بعد</h3>
          <p className="text-sm text-gray-500 mb-4">
            {canEdit
              ? 'أضِف رقم محفظتك أو حسابك البنكي ليتمكن السكان من السداد لك مباشرة.'
              : 'الإدارة لم تُضِف طرق دفع بعد. تواصل معها لمعرفة طريقة السداد.'}
          </p>
          {canEdit && (
            <button onClick={openCreate} className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-indigo-700">
              ابدأ بإضافة طريقة دفع
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {methods.map((m) => {
            const Icon = TYPE_ICONS[m.method_type] || CreditCardIcon;
            const grad = TYPE_COLORS[m.method_type] || TYPE_COLORS.other;
            return (
              <div key={m.id} data-testid={`payment-method-card-${m.id}`} className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                <div className={`bg-gradient-to-l ${grad} p-4 text-white flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Icon className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{m.display_name || m.type_label_ar}</h3>
                      <p className="text-white/80 text-xs">{m.type_label_ar}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${m.is_active ? 'bg-emerald-400/30' : 'bg-red-400/30'} flex items-center gap-1`}>
                    {m.is_active ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
                    {m.is_active ? 'مفعّلة' : 'معطّلة'}
                  </span>
                </div>

                <div className="p-4 space-y-2 text-sm">
                  {m.account_number && (
                    <Row label="الرقم/الحساب" value={m.account_number} onCopy={() => copy(m.account_number, 'تم نسخ الرقم')} mono />
                  )}
                  {m.account_holder && <Row label="اسم المستفيد" value={m.account_holder} />}
                  {m.bank_name && <Row label="البنك" value={m.bank_name} />}
                  {m.iban && <Row label="IBAN" value={m.iban} onCopy={() => copy(m.iban, 'تم نسخ الـ IBAN')} mono />}
                  {m.swift_code && <Row label="SWIFT" value={m.swift_code} mono />}
                  {m.instructions && (
                    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2 text-amber-900 text-xs whitespace-pre-line">
                      {m.instructions}
                    </div>
                  )}
                  {m.fee_note && (
                    <p className="text-xs text-gray-500 mt-1">💡 {m.fee_note}</p>
                  )}
                </div>

                {canEdit && (
                  <div className="border-t border-gray-100 p-3 flex items-center justify-between gap-2">
                    <button
                      onClick={() => toggleActive(m)}
                      data-testid={`toggle-method-${m.id}`}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${m.is_active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                    >
                      {m.is_active ? 'تعطيل' : 'تفعيل'}
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(m)} data-testid={`edit-method-${m.id}`} className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-600" title="تعديل">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(m)} data-testid={`delete-method-${m.id}`} className="p-2 hover:bg-red-50 rounded-lg text-red-600" title="حذف">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'تعديل طريقة دفع' : 'إضافة طريقة دفع'} onClose={() => setShowModal(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">نوع الطريقة</label>
              <select
                value={form.method_type}
                onChange={(e) => setForm({ ...form, method_type: e.target.value })}
                data-testid="method-type-select"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {types.map(t => (
                  <option key={t.key} value={t.key}>{t.label_ar}</option>
                ))}
              </select>
            </div>
            <Field label="اسم العرض (اختياري)" value={form.display_name} onChange={(v) => setForm({ ...form, display_name: v })} placeholder="مثلاً: محفظة المحاسب الرئيسي" />
            <Field label="رقم المحفظة / الحساب / المعرف" value={form.account_number} onChange={(v) => setForm({ ...form, account_number: v })} placeholder="01xxxxxxxxx أو compound@instapay" testId="account-number-input" />
            <Field label="اسم المستفيد" value={form.account_holder} onChange={(v) => setForm({ ...form, account_holder: v })} placeholder="الاسم كما هو مسجل" />
            {form.method_type === 'bank_transfer' && (
              <>
                <Field label="اسم البنك" value={form.bank_name} onChange={(v) => setForm({ ...form, bank_name: v })} />
                <Field label="IBAN" value={form.iban} onChange={(v) => setForm({ ...form, iban: v })} placeholder="EG" />
                <Field label="SWIFT (اختياري)" value={form.swift_code} onChange={(v) => setForm({ ...form, swift_code: v })} />
              </>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">تعليمات الدفع</label>
              <textarea
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                rows="3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="مثلاً: أرسل التحويل ثم صور الإيصال وأرسله على واتساب 0100xxx"
              />
            </div>
            <Field label="ملاحظة الرسوم (اختياري)" value={form.fee_note} onChange={(v) => setForm({ ...form, fee_note: v })} placeholder="بدون رسوم / 1% رسوم على المُرسل" />
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                <span className="font-semibold">طريقة مفعّلة (مرئية للسكان)</span>
              </label>
              <div className="flex items-center gap-2 text-sm">
                <label className="font-semibold">ترتيب العرض:</label>
                <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="w-20 border rounded px-2 py-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">إلغاء</button>
              <button type="submit" disabled={submitting} data-testid="submit-method-btn" className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50">
                {submitting ? 'جارٍ الحفظ…' : (editing ? 'حفظ التعديلات' : 'إضافة')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

const Row = ({ label, value, onCopy, mono }) => (
  <div className="flex items-center justify-between gap-2 border-b border-gray-50 last:border-0 pb-1">
    <span className="text-xs text-gray-500">{label}</span>
    <div className="flex items-center gap-1.5">
      <span className={`text-sm font-semibold text-gray-800 ${mono ? 'font-mono tracking-wider' : ''}`}>{value}</span>
      {onCopy && (
        <button onClick={onCopy} className="p-1 hover:bg-gray-100 rounded" title="نسخ">
          <ClipboardDocumentIcon className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
  </div>
);

const Field = ({ label, value, onChange, placeholder, testId }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      data-testid={testId}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
    />
  </div>
);

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b p-4 sticky top-0 bg-white">
        <h3 className="font-bold text-lg">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  </div>
);

export default CompoundPaymentMethodsPage;
