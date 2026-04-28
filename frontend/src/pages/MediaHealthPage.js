import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../App';

const API = process.env.REACT_APP_BACKEND_URL;

function fmtBytes(n) {
  if (!n) return '0 B';
  const u = ['B','KB','MB','GB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i ? 1 : 0)} ${u[i]}`;
}

export default function MediaHealthPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [orphans, setOrphans] = useState([]);
  const [broken, setBroken] = useState([]);
  const [tab, setTab] = useState('overview');
  const [busy, setBusy] = useState(false);

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const load = async () => {
    try {
      const [ov, bk, or, bn] = await Promise.all([
        axios.get(`${API}/api/media-health/overview`, { headers: headers() }),
        axios.get(`${API}/api/media-health/backups`, { headers: headers() }),
        axios.get(`${API}/api/media-health/orphans`, { headers: headers() }),
        axios.get(`${API}/api/media-health/broken`, { headers: headers() }),
      ]);
      setOverview(ov.data);
      setSnapshots(bk.data?.snapshots || []);
      setOrphans(or.data?.orphans || []);
      setBroken(bn.data?.broken || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل تحميل البيانات');
    }
  };

  useEffect(() => { load(); }, []);

  const role = user?.role;
  if (role !== 'app_owner' && role !== 'super_admin') {
    return <div className="p-8 text-center text-gray-600 dark:text-gray-300">هذه الصفحة متاحة للمالك فقط.</div>;
  }

  const backupNow = async () => {
    setBusy(true);
    try {
      const res = await axios.post(`${API}/api/media-health/backup-now`, {}, { headers: headers() });
      toast.success(`تم إنشاء نسخة احتياطية: ${res.data.copied} ملف جديد، ${res.data.skipped} تم تخطّيه`);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل النسخ الاحتياطي');
    } finally { setBusy(false); }
  };

  const repair = async () => {
    if (!broken.length) { toast.info('لا توجد ملفات مكسورة'); return; }
    setBusy(true);
    try {
      const res = await axios.post(`${API}/api/media-health/repair-broken`, {}, { headers: headers() });
      if (res.data.repaired_count) {
        toast.success(`تم استعادة ${res.data.repaired_count} ملف من النسخة الاحتياطية`);
      } else {
        toast.warning(`لم يتم استعادة أي ملف. ${res.data.missing_count} ملف غير موجود في أي نسخة احتياطية`);
      }
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل الإصلاح');
    } finally { setBusy(false); }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto" data-testid="media-health-page">
      <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">صحة الوسائط والنسخ الاحتياطي</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">لوحة لإدارة الصور والإعلانات + النسخ الاحتياطية على سيرفر التطبيق</p>
        </div>
        <div className="flex gap-2">
          <button data-testid="backup-now-btn" onClick={backupNow} disabled={busy}
                  className="px-4 py-2 rounded-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 disabled:opacity-50 font-bold text-sm">
            {busy ? '...' : '📦 نسخ احتياطي الآن'}
          </button>
          <button data-testid="repair-btn" onClick={repair} disabled={busy || !broken.length}
                  className="px-4 py-2 rounded-xl text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-90 disabled:opacity-50 font-bold text-sm">
            🔧 إصلاح المكسور ({broken.length})
          </button>
          <button onClick={load} disabled={busy}
                  className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-sm">⟳ تحديث</button>
        </div>
      </header>

      {/* KPI tiles */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="rounded-xl p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/50">
            <div className="text-xs text-blue-700 dark:text-blue-300 font-semibold">إجمالي الملفات</div>
            <div className="text-2xl font-extrabold text-blue-900 dark:text-blue-200" data-testid="kpi-total-files">{overview.total_files}</div>
          </div>
          <div className="rounded-xl p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 border border-emerald-200/50">
            <div className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">الحجم الكلي</div>
            <div className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-200">{fmtBytes(overview.total_bytes)}</div>
          </div>
          <div className="rounded-xl p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200/50">
            <div className="text-xs text-amber-700 dark:text-amber-300 font-semibold">ملفات يتيمة (بدون مرجع)</div>
            <div className="text-2xl font-extrabold text-amber-900 dark:text-amber-200" data-testid="kpi-orphans">{overview.orphan_count}</div>
          </div>
          <div className="rounded-xl p-4 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40 border border-rose-200/50">
            <div className="text-xs text-rose-700 dark:text-rose-300 font-semibold">مراجع مكسورة</div>
            <div className="text-2xl font-extrabold text-rose-900 dark:text-rose-200" data-testid="kpi-broken">{overview.broken_count}</div>
          </div>
          <div className="rounded-xl p-4 bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/40 dark:to-fuchsia-950/40 border border-violet-200/50">
            <div className="text-xs text-violet-700 dark:text-violet-300 font-semibold">عدد النسخ الاحتياطية</div>
            <div className="text-2xl font-extrabold text-violet-900 dark:text-violet-200" data-testid="kpi-snapshots">{overview.snapshot_count}</div>
            {overview.last_snapshot && <div className="text-[11px] text-violet-700 dark:text-violet-400 mt-0.5">آخر: {overview.last_snapshot.snapshot}</div>}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
        {[
          {id:'overview', label:'نظرة عامة'},
          {id:'broken', label:`مكسورة (${broken.length})`},
          {id:'orphans', label:`يتيمة (${orphans.length})`},
          {id:'backups', label:`النسخ الاحتياطية (${snapshots.length})`},
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`}
                  className={`px-3 py-2 -mb-px text-sm font-semibold border-b-2 ${tab === t.id ? 'border-rose-600 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && overview && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">توزيع الملفات حسب المجلد</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(overview.by_subdir || {}).map(([sub, info]) => (
                <div key={sub} className="rounded-lg p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">/{sub}</div>
                  <div className="font-bold text-gray-800 dark:text-gray-100">{info.files} ملف</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{fmtBytes(info.bytes)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'broken' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          {broken.length === 0 ? (
            <div className="p-8 text-center text-emerald-700 dark:text-emerald-400">✨ لا توجد مراجع مكسورة. كل الصور موجودة على السيرفر.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-600 dark:text-gray-300">
                <tr><th className="p-2 text-right">المجموعة</th><th className="p-2 text-right">الحقل</th><th className="p-2 text-right">المجلد</th><th className="p-2 text-right">الملف</th></tr>
              </thead>
              <tbody>
                {broken.map((b,i)=>(
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="p-2 text-gray-800 dark:text-gray-100">{b.collection}</td>
                    <td className="p-2 text-gray-600 dark:text-gray-400">{b.field}</td>
                    <td className="p-2 text-gray-600 dark:text-gray-400">{b.subdir}</td>
                    <td className="p-2 font-mono text-xs text-rose-700 dark:text-rose-400">{b.filename}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'orphans' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          {orphans.length === 0 ? (
            <div className="p-8 text-center text-emerald-700 dark:text-emerald-400">✨ لا توجد ملفات يتيمة.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-600 dark:text-gray-300">
                <tr><th className="p-2 text-right">المجلد</th><th className="p-2 text-right">الملف</th><th className="p-2 text-right">الحجم</th></tr>
              </thead>
              <tbody>
                {orphans.slice(0, 100).map((o,i)=>(
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="p-2 text-gray-600 dark:text-gray-400">{o.subdir}</td>
                    <td className="p-2 font-mono text-xs text-gray-800 dark:text-gray-100">{o.filename}</td>
                    <td className="p-2 text-gray-600 dark:text-gray-400">{fmtBytes(o.bytes)}</td>
                  </tr>
                ))}
                {orphans.length > 100 && <tr><td colSpan={3} className="p-2 text-center text-gray-500">... و {orphans.length - 100} ملف آخر</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'backups' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          {snapshots.length === 0 ? (
            <div className="p-8 text-center text-gray-500">لا توجد نسخ احتياطية بعد.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-600 dark:text-gray-300">
                <tr><th className="p-2 text-right">التاريخ</th><th className="p-2 text-right">عدد الملفات</th><th className="p-2 text-right">الحجم</th></tr>
              </thead>
              <tbody>
                {snapshots.map((s)=>(
                  <tr key={s.snapshot} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="p-2 font-mono text-gray-800 dark:text-gray-100">{s.snapshot}</td>
                    <td className="p-2 text-gray-600 dark:text-gray-400">{s.files}</td>
                    <td className="p-2 text-gray-600 dark:text-gray-400">{fmtBytes(s.bytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
