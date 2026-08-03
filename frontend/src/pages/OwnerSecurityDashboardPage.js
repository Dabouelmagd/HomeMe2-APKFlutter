import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { ShieldCheckIcon, NoSymbolIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tok = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

export default function OwnerSecurityDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newIp, setNewIp] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/security/dashboard`, tok());
      setData(res.data);
    } catch (e) {
      toast.error('فشل تحميل بيانات الأمان');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUnblock = async (ip) => {
    try {
      await axios.delete(`${API}/security/blacklist/${ip}`, tok());
      toast.success(`✅ تم رفع الحجب عن ${ip}`);
      fetchData();
    } catch { toast.error('فشل رفع الحجب'); }
  };

  const handleBlock = async () => {
    if (!newIp.trim()) return;
    try {
      await axios.post(`${API}/security/blacklist/${newIp.trim()}`, {}, tok());
      toast.success(`✅ تم حجب ${newIp}`);
      setNewIp('');
      fetchData();
    } catch { toast.error('فشل الحجب'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheckIcon className="h-7 w-7 text-red-600" />
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">🛡️ لوحة الأمان</h1>
            <p className="text-sm text-gray-500">مراقبة ومنع الاختراقات والـ bots</p>
          </div>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-sm">
          <ArrowPathIcon className="h-4 w-4" /> تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'IPs محجوبة', value: data?.blacklisted_ips || 0, color: 'red' },
          { label: 'IPs مشبوهة', value: data?.suspicious_ips || 0, color: 'amber' },
          { label: 'تسجيل دخول فاشل (24h)', value: data?.failed_logins_24h || 0, color: 'orange' },
          { label: 'أحداث أمنية', value: data?.recent_events?.length || 0, color: 'blue' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-200 dark:border-${color}-700 rounded-xl p-4 text-center`}>
            <p className={`text-3xl font-black text-${color}-700 dark:text-${color}-400`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Block new IP */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
        <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <NoSymbolIcon className="h-5 w-5 text-red-500" /> حجب IP يدوياً
        </h3>
        <div className="flex gap-3">
          <input value={newIp} onChange={e => setNewIp(e.target.value)}
            placeholder="مثال: 192.168.1.1"
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
            dir="ltr" />
          <button onClick={handleBlock}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded-xl transition-colors text-sm">
            حجب
          </button>
        </div>
      </div>

      {/* Blacklisted IPs */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white">🚫 IPs المحجوبة ({data?.blacklist?.length || 0})</h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
          {(data?.blacklist || []).length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">لا توجد IPs محجوبة</p>
          ) : (data?.blacklist || []).map((item, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-mono text-sm text-gray-800 dark:text-white">{item.ip}</p>
                <p className="text-xs text-gray-500">{item.reason} • {item.blacklisted_at?.slice(0, 10)}</p>
              </div>
              <button onClick={() => handleUnblock(item.ip)}
                className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded-lg transition-colors">
                رفع الحجب
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent security events */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
            آخر الأحداث الأمنية
          </h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-80 overflow-y-auto">
          {(data?.recent_events || []).length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">لا توجد أحداث</p>
          ) : (data?.recent_events || []).slice(0, 20).map((ev, i) => (
            <div key={i} className="px-5 py-3 flex items-center gap-3">
              <span className="text-lg">{ev.reason?.includes('honeypot') ? '🍯' : '⚠️'}</span>
              <div className="flex-1">
                <p className="text-sm font-mono text-gray-800 dark:text-white">{ev.ip}</p>
                <p className="text-xs text-gray-500">{ev.reason} • {ev.timestamp?.slice(0, 16)}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ev.count > 100 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {ev.count}x
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
