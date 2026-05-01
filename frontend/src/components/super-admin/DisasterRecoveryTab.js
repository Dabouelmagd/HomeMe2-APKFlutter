import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const fmtBytes = (n) => {
  if (!n) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('ar-EG'); } catch { return iso; }
};

/**
 * DisasterRecoveryTab — معالج النسخ الاحتياطي / الاستعادة الكامل.
 */
const DisasterRecoveryTab = () => {
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        axios.get(`${API}/super-admin/disaster-recovery/preview`, auth()),
        axios.get(`${API}/super-admin/disaster-recovery/history?limit=20`, auth()),
      ]);
      setPreview(p.data);
      setHistory(h.data.runs || []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const downloadSnapshot = async () => {
    setDownloading(true);
    try {
      const res = await axios.get(`${API}/super-admin/disaster-recovery/snapshot`, {
        ...auth(),
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `homeme-disaster-recovery-${ts}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`تم تنزيل النسخة الاحتياطية (${fmtBytes(res.data.size)})`);
      refresh();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل التنزيل');
    } finally {
      setDownloading(false);
    }
  };

  const performRestore = async () => {
    if (!restoreFile) { toast.error('اختر ملف ZIP أولاً'); return; }
    if (confirmText !== 'استعادة') { toast.error('اكتب كلمة "استعادة" للتأكيد'); return; }
    setRestoring(true);
    setRestoreResult(null);
    try {
      const fd = new FormData();
      fd.append('file', restoreFile);
      const res = await axios.post(
        `${API}/super-admin/disaster-recovery/restore?confirm=I_UNDERSTAND_OVERWRITE`,
        fd,
        { ...auth(), headers: { ...auth().headers, 'Content-Type': 'multipart/form-data' } }
      );
      setRestoreResult(res.data);
      if (res.data.success) {
        toast.success('🎉 تمت الاستعادة بنجاح');
      } else {
        toast.warning(`اكتملت الاستعادة مع ${res.data.errors?.length || 0} خطأ`);
      }
      setRestoreFile(null);
      setConfirmText('');
      refresh();
    } catch (err) {
      const d = err?.response?.data?.detail;
      const msg = (d && typeof d === 'object') ? (d.message || JSON.stringify(d)) : (d || 'فشلت الاستعادة');
      toast.error(msg);
    } finally {
      setRestoring(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">⏳ جارٍ التحميل...</div>;

  return (
    <div className="space-y-5" dir="rtl" data-testid="disaster-recovery-tab">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/30 border border-indigo-500/40 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">💾</span>
          <div>
            <h2 className="text-xl font-bold text-white">النسخ الاحتياطي والاستعادة</h2>
            <p className="text-xs text-indigo-200/80">نسخة كاملة من قاعدة البيانات + كل الوسائط في ملف واحد، موقّعة بـ SHA-256</p>
          </div>
        </div>
        {preview && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <Stat label="مجموعات" val={preview.collections_count} />
            <Stat label="إجمالي المستندات" val={preview.total_documents} />
            <Stat label="ملفات الوسائط" val={preview.media_files_count} />
            <Stat label="إصدار التطبيق" val={preview.app_version} />
          </div>
        )}
      </div>

      {/* Snapshot card */}
      <div className="bg-gray-900/60 border border-emerald-700/40 rounded-2xl p-5" data-testid="dr-snapshot-card">
        <div className="flex items-start gap-3">
          <span className="text-3xl">📦</span>
          <div className="flex-1">
            <h3 className="font-bold text-emerald-300">تنزيل نسخة احتياطية الآن</h3>
            <p className="text-xs text-gray-400 mt-1">
              ينشئ ملف ZIP يحتوي على كل المجموعات (JSON Extended) + كل الوسائط (صور، إعلانات، شعارات) + manifest موقّع.
              احفظ الملف في مكان آمن (Drive، S3، أو خارج الخادم).
            </p>
          </div>
        </div>
        <button
          onClick={downloadSnapshot}
          disabled={downloading}
          className="mt-4 w-full md:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20"
          data-testid="dr-download-btn"
        >
          {downloading ? '⏳ جارٍ التنزيل...' : '⬇️ تنزيل نسخة كاملة الآن'}
        </button>
      </div>

      {/* Restore card */}
      <div className="bg-gray-900/60 border border-rose-700/40 rounded-2xl p-5" data-testid="dr-restore-card">
        <div className="flex items-start gap-3">
          <span className="text-3xl">⚠️</span>
          <div className="flex-1">
            <h3 className="font-bold text-rose-300">استعادة من نسخة احتياطية</h3>
            <p className="text-xs text-rose-100/70 mt-1">
              ⛔ تحذير: ستُحذَف كل البيانات الحالية وتُستبدل بمحتوى ملف ZIP. لا يمكن التراجع.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <input
            type="file"
            accept=".zip"
            onChange={(e) => { setRestoreFile(e.target.files?.[0] || null); setRestoreResult(null); }}
            className="w-full text-sm text-gray-300 bg-gray-800 border border-gray-600 rounded-lg p-2"
            data-testid="dr-restore-file-input"
          />
          {restoreFile && (
            <div className="text-xs text-gray-400">
              📄 {restoreFile.name} ({fmtBytes(restoreFile.size)})
            </div>
          )}
          <div>
            <label className="text-xs text-rose-300 font-semibold mb-1 block">للتأكيد، اكتب كلمة "استعادة" بالضبط:</label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="استعادة"
              className="w-full md:w-1/3 bg-gray-800 border border-rose-600/40 rounded-lg px-3 py-2 text-sm text-white focus:border-rose-400 focus:outline-none"
              data-testid="dr-restore-confirm-input"
            />
          </div>
          <button
            onClick={performRestore}
            disabled={restoring || !restoreFile || confirmText !== 'استعادة'}
            className="px-6 py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg"
            data-testid="dr-restore-btn"
          >
            {restoring ? '⏳ جارٍ الاستعادة...' : '⚠️ استعادة النسخة وإعادة الكتابة فوق كل شيء'}
          </button>
        </div>
        {restoreResult && (
          <div className={`mt-4 p-3 rounded-lg text-xs ${restoreResult.success ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-amber-900/30 border border-amber-700'}`}>
            <div className="font-bold mb-1">
              {restoreResult.success ? '✅ تمت الاستعادة بنجاح' : `⚠️ اكتملت مع ${restoreResult.errors?.length || 0} خطأ`}
            </div>
            <div className="text-gray-300">
              مجموعات مستعادة: {restoreResult.restored?.collections_count} • وسائط: {restoreResult.restored?.media_files_count}
            </div>
            {restoreResult.manifest_generated_at && (
              <div className="text-gray-400 mt-1">
                مصدر النسخة: {restoreResult.manifest_generated_by || '—'} • {fmtDate(restoreResult.manifest_generated_at)}
              </div>
            )}
            {restoreResult.errors?.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-amber-300">عرض الأخطاء ({restoreResult.errors.length})</summary>
                <ul className="mt-1 list-disc list-inside text-amber-200">
                  {restoreResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {/* History */}
      <div className="bg-gray-900/60 border border-gray-700 rounded-2xl p-5">
        <h3 className="font-bold text-gray-200 mb-3">📜 سجل العمليات (آخر 20)</h3>
        {history.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-6">لا توجد عمليات بعد</div>
        ) : (
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="flex items-center gap-3 bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-sm" data-testid={`dr-history-${h.id}`}>
                <span className="text-2xl">{h.action === 'snapshot' ? '📦' : '🔄'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white">
                    {h.action === 'snapshot' ? 'تنزيل نسخة' : 'استعادة'}
                    <span className="text-gray-400 font-normal ms-2">بواسطة {h.username}</span>
                  </div>
                  <div className="text-[11px] text-gray-400">{fmtDate(h.timestamp)}</div>
                </div>
                <div className="text-end text-[11px] text-gray-300 flex-shrink-0">
                  {h.action === 'snapshot' ? (
                    <>
                      <div>{fmtBytes(h.size_bytes)}</div>
                      <div className="text-gray-500">{h.collections} مج • {h.media_files} وسائط</div>
                    </>
                  ) : (
                    <>
                      <div>{h.restored_collections} مج مستعادة</div>
                      {h.errors?.length > 0 && <div className="text-amber-400">{h.errors.length} خطأ</div>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, val }) => (
  <div className="bg-gray-900/60 border border-indigo-600/30 rounded-lg p-3 text-center">
    <div className="text-xl font-bold text-white">{val}</div>
    <div className="text-[10px] text-gray-400 mt-0.5">{label}</div>
  </div>
);

export default DisasterRecoveryTab;
