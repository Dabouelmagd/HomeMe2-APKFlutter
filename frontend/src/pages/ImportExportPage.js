import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../App';
import {
  ArrowUpTrayIcon, ArrowDownTrayIcon, DocumentArrowDownIcon,
  UsersIcon, BanknotesIcon, ClipboardDocumentListIcon,
  CheckCircleIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tok = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

// Download helper
const download = async (url, filename) => {
  const res = await axios.get(url, { ...tok(), responseType: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(res.data);
  link.download = filename;
  link.click();
};

export default function ImportExportPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importType, setImportType] = useState('residents');
  const [preview, setPreview] = useState(null);
  const [importResults, setImportResults] = useState(null);

  const isAdmin = ['app_owner', 'super_admin', 'company_admin', 'admin', 'manager'].includes(user?.role);

  // ── EXPORTS ──────────────────────────────────────────────────────────────
  const exports = [
    {
      id: 'residents',
      icon: UsersIcon,
      color: 'emerald',
      title: 'تصدير السكان',
      desc: 'كل بيانات السكان والموظفين — 3 أوراق Excel',
      filename: 'residents.xlsx',
      url: `${API}/residents/export-excel`,
    },
    {
      id: 'financial_full',
      icon: BanknotesIcon,
      color: 'amber',
      title: 'تصدير مالي شامل',
      desc: 'الأقساط + الإيرادات + المصروفات + الملخص',
      filename: 'full_financial_report.xlsx',
      url: `${API}/financial/full-export-excel`,
    },
    {
      id: 'installments',
      icon: ClipboardDocumentListIcon,
      color: 'blue',
      title: 'تصدير خطط الأقساط',
      desc: 'جميع خطط الأقساط مع جداول السداد',
      filename: 'installment_plans.xlsx',
      url: `${API}/financial/installment-plans/export/excel`,
    },
    {
      id: 'financial',
      icon: DocumentArrowDownIcon,
      color: 'violet',
      title: 'تصدير الميزانية',
      desc: 'الميزانية العمومية + المصروفات + الإيرادات + المديونيات',
      filename: 'financial_report.xlsx',
      url: `${API}/financial/export-excel`,
    },
  ];

  const handleExport = async (exp) => {
    setLoading(exp.id);
    try {
      await download(exp.url, exp.filename);
      toast.success(`✅ تم تحميل ${exp.title}`);
    } catch (e) {
      toast.error(`فشل التحميل: ${e.response?.data?.detail || e.message}`);
    } finally {
      setLoading('');
    }
  };

  // ── IMPORTS ──────────────────────────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    setLoading('template');
    try {
      await download(`${API}/residents/bulk-import/template`, 'residents_template.xlsx');
      toast.success('✅ تم تحميل قالب الاستيراد');
    } catch { toast.error('فشل تحميل القالب'); }
    finally { setLoading(''); }
  };

  const handlePreview = async () => {
    if (!importFile) { toast.error('اختر ملف أولاً'); return; }
    setLoading('preview');
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await axios.post(`${API}/residents/bulk-import/preview`, fd, {
        ...tok(),
        headers: { ...tok().headers, 'Content-Type': 'multipart/form-data' }
      });
      setPreview(res.data);
      toast.success(`✅ ${res.data.total} سجل جاهز للاستيراد`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل معالجة الملف');
    } finally { setLoading(''); }
  };

  const handleCommit = async () => {
    if (!preview) return;
    setLoading('commit');
    try {
      const res = await axios.post(`${API}/residents/bulk-import/commit`,
        { records: preview.valid_records },
        tok()
      );
      setImportResults(res.data);
      setPreview(null);
      setImportFile(null);
      toast.success(`✅ تم استيراد ${res.data.imported} سجل بنجاح`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل الاستيراد');
    } finally { setLoading(''); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
          <span className="text-3xl">📊</span>
          مركز الاستيراد والتصدير
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          استيراد وتصدير بيانات السكان والمعلومات المالية
        </p>
      </div>

      {/* EXPORT SECTION */}
      <div>
        <h2 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <ArrowDownTrayIcon className="h-5 w-5 text-emerald-600" />
          تصدير البيانات
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {exports.map(exp => (
            <button
              key={exp.id}
              onClick={() => handleExport(exp)}
              disabled={loading === exp.id}
              className={`flex items-start gap-4 p-4 bg-white dark:bg-gray-800 border-2 border-${exp.color}-200 dark:border-${exp.color}-700 rounded-2xl hover:border-${exp.color}-400 hover:bg-${exp.color}-50 dark:hover:bg-${exp.color}-900/20 transition-all text-right disabled:opacity-60`}
            >
              <div className={`w-12 h-12 rounded-xl bg-${exp.color}-100 dark:bg-${exp.color}-900/30 flex items-center justify-center flex-shrink-0`}>
                {loading === exp.id
                  ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <exp.icon className={`h-6 w-6 text-${exp.color}-600 dark:text-${exp.color}-400`} />
                }
              </div>
              <div>
                <p className={`font-bold text-${exp.color}-700 dark:text-${exp.color}-400`}>{exp.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{exp.desc}</p>
                <p className="text-xs text-gray-400 mt-1">📁 {exp.filename}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* IMPORT SECTION */}
      <div>
        <h2 className="text-base font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <ArrowUpTrayIcon className="h-5 w-5 text-blue-600" />
          استيراد البيانات
        </h2>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 space-y-4">
          {/* Download Template */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-blue-700 dark:text-blue-400 text-sm">📋 قالب Excel للاستيراد</p>
              <p className="text-xs text-gray-500 mt-0.5">حمّل القالب واملأ بيانات السكان ثم ارفعه</p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              disabled={loading === 'template'}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors whitespace-nowrap disabled:opacity-60"
            >
              {loading === 'template'
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <ArrowDownTrayIcon className="h-4 w-4" />
              }
              تحميل القالب
            </button>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              رفع ملف Excel
            </label>
            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${importFile ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10'}`}>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => {
                  setImportFile(e.target.files[0] || null);
                  setPreview(null);
                  setImportResults(null);
                }}
              />
              {importFile ? (
                <div className="text-center">
                  <CheckCircleIcon className="h-8 w-8 text-emerald-500 mx-auto mb-1" />
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{importFile.name}</p>
                  <p className="text-xs text-gray-400">{(importFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <ArrowUpTrayIcon className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">اسحب الملف هنا أو اضغط للاختيار</p>
                  <p className="text-xs mt-1">.xlsx, .xls, .csv</p>
                </div>
              )}
            </label>
          </div>

          {/* Preview Button */}
          {importFile && !preview && (
            <button
              onClick={handlePreview}
              disabled={loading === 'preview'}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60"
            >
              {loading === 'preview'
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جارٍ المعالجة...</>
                : '🔍 معاينة البيانات'
              }
            </button>
          )}

          {/* Preview Results */}
          {preview && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 flex items-center justify-between">
                <p className="font-bold text-sm text-gray-700 dark:text-gray-200">
                  معاينة — {preview.total} سجل
                </p>
                <div className="flex gap-3 text-xs">
                  <span className="text-emerald-600 font-bold">✅ {preview.valid} صحيح</span>
                  {preview.errors?.length > 0 && (
                    <span className="text-red-500 font-bold">❌ {preview.errors.length} خطأ</span>
                  )}
                </div>
              </div>

              {/* Error list */}
              {preview.errors?.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20">
                  {preview.errors.slice(0, 5).map((err, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                      <ExclamationTriangleIcon className="h-3 w-3 flex-shrink-0" />
                      {err}
                    </p>
                  ))}
                </div>
              )}

              {/* Sample data */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-600">
                    <tr>
                      {['الاسم', 'اسم المستخدم', 'البريد', 'الهاتف', 'الوحدة'].map(h => (
                        <th key={h} className="px-3 py-2 text-right font-bold text-gray-600 dark:text-gray-200">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {(preview.valid_records || []).slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{r.full_name}</td>
                        <td className="px-3 py-2 text-gray-500">{r.username}</td>
                        <td className="px-3 py-2 text-gray-500">{r.email}</td>
                        <td className="px-3 py-2 text-gray-500">{r.phone}</td>
                        <td className="px-3 py-2 text-gray-500">{r.unit_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(preview.valid_records?.length || 0) > 5 && (
                  <p className="text-center text-xs text-gray-400 py-2">
                    + {preview.valid_records.length - 5} سجل آخر...
                  </p>
                )}
              </div>

              <div className="p-4 flex gap-3">
                <button
                  onClick={handleCommit}
                  disabled={loading === 'commit' || !preview.valid}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60"
                >
                  {loading === 'commit'
                    ? 'جارٍ الاستيراد...'
                    : `✅ تأكيد استيراد ${preview.valid} سجل`
                  }
                </button>
                <button
                  onClick={() => { setPreview(null); setImportFile(null); }}
                  className="px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          {/* Success Results */}
          {importResults && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4 text-center">
              <CheckCircleIcon className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-emerald-700 dark:text-emerald-400 text-lg">
                تم الاستيراد بنجاح!
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {importResults.imported} سجل تم إضافته
                {importResults.skipped > 0 && ` · ${importResults.skipped} تم تجاهله`}
              </p>
              <button
                onClick={() => setImportResults(null)}
                className="mt-3 text-xs text-emerald-600 hover:underline"
              >
                استيراد ملف آخر
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4">
        <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-2">📌 تعليمات الاستيراد</h3>
        <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
          <li>• حمّل القالب أولاً لمعرفة الأعمدة المطلوبة</li>
          <li>• أعمدة إلزامية: الاسم الكامل + اسم المستخدم + رقم الوحدة</li>
          <li>• كلمة المرور الافتراضية: <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">HomeMe@2024</code> (يُنصح بتغييرها)</li>
          <li>• الملفات المدعومة: Excel (.xlsx, .xls) أو CSV</li>
          <li>• راجع المعاينة قبل التأكيد النهائي</li>
        </ul>
      </div>
    </div>
  );
}
