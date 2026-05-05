import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  XMarkIcon,
  CloudArrowUpIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentArrowUpIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tokenHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/**
 * 3-step bulk-import wizard:
 *  step 1: pick file → call /preview
 *  step 2: review valid/invalid rows → confirm or back
 *  step 3: show /commit results + downloadable credentials list
 */
const BulkImportResidentsModal = ({ onClose, onImported }) => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);

  const downloadTemplate = async () => {
    try {
      const res = await axios.get(`${API}/residents/bulk-import/template`, {
        ...tokenHeader(), responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'residents_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('تم تحميل النموذج');
    } catch {
      toast.error('فشل تحميل النموذج');
    }
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error('الحجم يجب أن يكون أقل من 5MB');
      return;
    }
    setFile(f);
  };

  const doPreview = async () => {
    if (!file) { toast.error('اختر ملف Excel أولاً'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${API}/residents/bulk-import/preview`, fd, {
        ...tokenHeader(),
        headers: { ...tokenHeader().headers, 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data);
      setStep(2);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل تحليل الملف');
    } finally { setBusy(false); }
  };

  const doCommit = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${API}/residents/bulk-import/commit`, fd, {
        ...tokenHeader(),
        headers: { ...tokenHeader().headers, 'Content-Type': 'multipart/form-data' },
      });
      setResults(res.data);
      setStep(3);
      const emailsSent = res.data.emails_sent || 0;
      if (emailsSent > 0) {
        toast.success(`تم إنشاء ${res.data.created} ساكن بنجاح • تم إرسال ${emailsSent} بريد ترحيب 📧`);
      } else {
        toast.success(`تم إنشاء ${res.data.created} ساكن بنجاح`);
      }
      onImported?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل الحفظ');
    } finally { setBusy(false); }
  };

  const downloadCredentialsCSV = () => {
    if (!results?.credentials?.length) return;
    const rows = [['الاسم', 'الوحدة', 'اسم المستخدم', 'كلمة المرور']];
    results.credentials.forEach(c => rows.push([c.full_name, c.unit_number, c.username, c.password]));
    const csv = '\ufeff' + rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'credentials.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast.success('تم تنزيل ملف بيانات الدخول');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        data-testid="bulk-import-modal"
      >
        <div className="bg-gradient-to-l from-violet-600 to-indigo-600 text-white p-5 sticky top-0 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <DocumentArrowUpIcon className="w-6 h-6" /> رفع السكان من ملف Excel
            </h3>
            <p className="text-white/80 text-sm mt-1">أضف مئات السكان دفعة واحدة في 3 خطوات</p>
            {/* Stepper */}
            <div className="flex gap-2 mt-3">
              {[1,2,3].map(n => (
                <div key={n} className={`px-3 py-1 rounded-full text-xs font-bold ${step >= n ? 'bg-white text-indigo-700' : 'bg-white/20 text-white/70'}`}>
                  {n}. {n===1?'الرفع':n===2?'المعاينة':'النتيجة'}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5">
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <ClipboardDocumentIcon className="w-5 h-5" /> ابدأ بتحميل النموذج
                </h4>
                <p className="text-sm text-blue-800 mb-3">
                  حمّل النموذج الجاهز، املأ بيانات السكان، ثم ارفع الملف. <strong>الاسم الكامل ورقم الوحدة مطلوبان.</strong>
                </p>
                <button
                  onClick={downloadTemplate}
                  data-testid="download-template-btn"
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  تحميل النموذج (Excel)
                </button>
              </div>

              <label className="block">
                <div className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-8 transition cursor-pointer text-center bg-gray-50">
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" id="bulk-file" data-testid="bulk-file-input" />
                  <label htmlFor="bulk-file" className="cursor-pointer">
                    {file ? (
                      <div>
                        <CheckCircleIcon className="w-14 h-14 mx-auto text-emerald-500 mb-2" />
                        <p className="font-bold text-gray-800">{file.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{(file.size/1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <CloudArrowUpIcon className="w-14 h-14 mx-auto mb-2 text-gray-400" />
                        <p className="font-semibold text-gray-700">اضغط لرفع ملف Excel أو CSV</p>
                        <p className="text-xs text-gray-500 mt-1">الحد الأقصى 5 ميجا</p>
                      </div>
                    )}
                  </label>
                </div>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold">إلغاء</button>
                <button
                  onClick={doPreview} disabled={!file || busy}
                  data-testid="preview-btn"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50"
                >
                  {busy ? 'جارٍ التحليل…' : 'معاينة البيانات →'}
                </button>
              </div>
            </div>
          )}

          {step === 2 && preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Stat label="إجمالي الصفوف" value={preview.summary?.total || 0} color="slate" />
                <Stat label="صفوف صالحة" value={preview.summary?.valid || 0} color="emerald" />
                <Stat label="صفوف بأخطاء" value={preview.summary?.invalid || 0} color="red" />
              </div>

              {preview.invalid?.length > 0 && (
                <div className="border border-red-200 rounded-xl">
                  <div className="bg-red-50 p-3 rounded-t-xl flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                    <h4 className="font-bold text-red-900">صفوف بأخطاء — لن تُحفظ</h4>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-red-50 text-red-900 text-xs">
                        <tr><th className="p-2 text-right">السطر</th><th className="p-2 text-right">الاسم</th><th className="p-2 text-right">الأخطاء</th></tr>
                      </thead>
                      <tbody>
                        {preview.invalid.map((row, i) => (
                          <tr key={i} className="border-t border-red-100">
                            <td className="p-2 font-mono">{row.row}</td>
                            <td className="p-2">{row.data?.full_name || '-'}</td>
                            <td className="p-2 text-red-700">{row.errors.join('، ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {preview.valid?.length > 0 && (
                <div className="border border-emerald-200 rounded-xl">
                  <div className="bg-emerald-50 p-3 rounded-t-xl flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-bold text-emerald-900">معاينة الصفوف الصالحة (أول 10)</h4>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-emerald-50 text-emerald-900 text-xs">
                        <tr>
                          <th className="p-2 text-right">الاسم</th>
                          <th className="p-2 text-right">الوحدة</th>
                          <th className="p-2 text-right">الهاتف</th>
                          <th className="p-2 text-right">المستخدم</th>
                          <th className="p-2 text-right">ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.valid.slice(0, 10).map((r, i) => (
                          <tr key={i} className="border-t border-emerald-100">
                            <td className="p-2 font-semibold">{r.full_name}</td>
                            <td className="p-2">{r.unit_number}</td>
                            <td className="p-2 font-mono text-xs">{r.phone || '-'}</td>
                            <td className="p-2 font-mono text-xs">{r.username}</td>
                            <td className="p-2 text-xs text-amber-700">{(r.warnings||[]).join('، ') || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {preview.valid.length > 10 && (
                    <p className="p-2 text-xs text-gray-500 text-center bg-gray-50 rounded-b-xl">
                      … و {preview.valid.length - 10} صف آخر
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between gap-2 pt-2 border-t">
                <button onClick={() => { setStep(1); setPreview(null); }} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 font-semibold">← رجوع</button>
                <button
                  onClick={doCommit}
                  disabled={!preview.valid?.length || busy}
                  data-testid="commit-btn"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
                >
                  {busy ? 'جارٍ الحفظ…' : `حفظ ${preview.valid?.length || 0} ساكن`}
                </button>
              </div>
            </div>
          )}

          {step === 3 && results && (
            <div className="space-y-4">
              <div className="text-center py-6 bg-emerald-50 border border-emerald-200 rounded-xl">
                <CheckCircleIcon className="w-16 h-16 mx-auto text-emerald-500 mb-2" />
                <h3 className="text-2xl font-black text-emerald-900">تم الإضافة بنجاح!</h3>
                <p className="text-emerald-700 mt-1">{results.created} ساكن أُضيفوا للنظام</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Stat label="مُضافون" value={results.created} color="emerald" />
                <Stat label="مُتجاهلون (أخطاء)" value={results.skipped} color="amber" />
                <Stat label="فشل" value={results.failed} color="red" />
              </div>

              {results.emails_sent > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center" data-testid="bulk-emails-sent">
                  <p className="text-sm text-blue-800">
                    📧 تم إرسال <strong>{results.emails_sent}</strong> بريد ترحيب تلقائياً للسكان الذين لديهم بريد إلكتروني
                  </p>
                </div>
              )}

              {results.credentials?.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                  <h4 className="font-bold text-amber-900 mb-2">⚠️ بيانات الدخول للسكان (تظهر مرة واحدة فقط)</h4>
                  <p className="text-sm text-amber-800 mb-3">
                    حمّل ملف CSV وسلّمه للسكان بأمان. كلمات المرور لن تظهر مرة أخرى.
                  </p>
                  <button
                    onClick={downloadCredentialsCSV}
                    data-testid="download-credentials-btn"
                    className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-semibold text-sm"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    تنزيل بيانات الدخول (CSV)
                  </button>
                </div>
              )}

              {results.failed_rows?.length > 0 && (
                <div className="border border-red-200 rounded-xl p-3">
                  <h4 className="font-bold text-red-900 mb-2">صفوف فشل حفظها</h4>
                  <ul className="text-sm space-y-1">
                    {results.failed_rows.map((r, i) => (
                      <li key={i} className="text-red-700">• سطر {r.row} — {r.name}: {r.error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button onClick={onClose} data-testid="finish-btn" className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  إغلاق
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value, color }) => {
  const colors = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
  };
  return (
    <div className={`rounded-xl border p-3 text-center ${colors[color]}`}>
      <p className="text-xs">{label}</p>
      <p className="font-black text-2xl mt-1">{value}</p>
    </div>
  );
};

export default BulkImportResidentsModal;
