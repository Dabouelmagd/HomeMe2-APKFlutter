import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/**
 * CompoundOnboardingWizard — معالج الدخول الأول لمدير الشركة.
 * يظهر عندما لا يوجد أي كمبوند بعد. يسمح بإضافة عدة كمبوندات دفعة واحدة.
 */
const emptyRow = () => ({ name: '', location: '', address: '', description: '' });

const CompoundOnboardingWizard = ({ companyName, onComplete, onSkip }) => {
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);

  const updateRow = (i, field, value) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };
  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (i) => setRows(prev => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    const valid = rows.filter(r => (r.name || '').trim());
    if (!valid.length) { toast.error('أضف اسم كمبوند واحد على الأقل'); return; }
    setSaving(true);
    try {
      const res = await axios.post(
        `${API}/company-admin/compounds/bulk`,
        { compounds: valid },
        getToken()
      );
      toast.success(`🎉 تم إنشاء ${res.data?.count || 0} كمبوند بنجاح`);
      onComplete && onComplete(res.data?.created || []);
    } catch (err) {
      const d = err?.response?.data?.detail;
      const msg = (d && typeof d === 'object') ? d.message : (d || 'فشل الإنشاء');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 p-6 flex items-center justify-center" dir="rtl" data-testid="compound-onboarding-wizard">
      <div className="w-full max-w-4xl bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur border border-indigo-500/40 rounded-3xl p-8 shadow-2xl shadow-indigo-500/20 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-6xl mb-2">🏗️</div>
          <h1 className="text-3xl font-bold text-white">مرحباً بك في {companyName || 'شركتك'}</h1>
          <p className="text-sm text-indigo-200">ابدأ بإضافة كمبوندات شركتك الآن لتتمكن من إدارتها بالكامل</p>
          <p className="text-xs text-gray-400">يمكنك إضافة أي عدد من الكمبوندات دفعة واحدة، وإضافة سكانها وفرق العمل لاحقاً</p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
          <span className="text-xs text-indigo-300 font-semibold">🏘️ كمبونداتك</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        </div>

        {/* Rows */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pe-2">
          {rows.map((row, i) => (
            <div key={i} className="bg-gray-900/60 border border-gray-700 rounded-2xl p-4 space-y-3 hover:border-indigo-500/60 transition" data-testid={`wizard-row-${i}`}>
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-indigo-300">🏘️ كمبوند #{i + 1}</div>
                {rows.length > 1 && (
                  <button onClick={() => removeRow(i)} className="text-xs text-red-400 hover:text-red-300" data-testid={`wizard-remove-${i}`}>✕ حذف</button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  placeholder="اسم الكمبوند *"
                  value={row.name}
                  onChange={e => updateRow(i, 'name', e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                  data-testid={`wizard-name-${i}`}
                />
                <input
                  placeholder="المدينة / الموقع"
                  value={row.location}
                  onChange={e => updateRow(i, 'location', e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                  data-testid={`wizard-location-${i}`}
                />
                <input
                  placeholder="العنوان التفصيلي"
                  value={row.address}
                  onChange={e => updateRow(i, 'address', e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none md:col-span-2"
                  data-testid={`wizard-address-${i}`}
                />
                <textarea
                  placeholder="وصف مختصر (اختياري)"
                  rows="2"
                  value={row.description}
                  onChange={e => updateRow(i, 'description', e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none md:col-span-2 resize-none"
                  data-testid={`wizard-desc-${i}`}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addRow}
          className="w-full py-3 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 border-2 border-dashed border-indigo-500/60 text-indigo-200 rounded-xl text-sm font-semibold transition"
          data-testid="wizard-add-row"
        >
          ➕ إضافة كمبوند آخر
        </button>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-gray-700/50">
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition"
            data-testid="wizard-submit"
          >
            {saving ? '⏳ جارٍ الحفظ...' : `💾 حفظ ${rows.filter(r => r.name.trim()).length} كمبوند والمتابعة`}
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              disabled={saving}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-semibold border border-gray-600 transition"
              data-testid="wizard-skip"
            >
              تخطّي مؤقتاً
            </button>
          )}
        </div>

        <p className="text-[11px] text-center text-gray-500">
          💡 يمكنك تعديل أو حذف الكمبوندات في أي وقت لاحقاً من لوحة التحكم
        </p>
      </div>
    </div>
  );
};

export default CompoundOnboardingWizard;
