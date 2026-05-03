import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { usePermissions } from '../hooks/usePermissions';
import {
  FileText,
  Building2,
  Receipt,
  PieChart,
  Download,
  Calendar,
  Loader2,
  Send,
  Clock,
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const reports = [
  {
    key: 'statement',
    title: 'كشف حساب الوحدة',
    desc: 'رسوم ومدفوعات الوحدة خلال شهر محدد',
    icon: FileText,
    color: 'from-indigo-500 to-purple-600',
    needs: 'unit',
    endpoint: (params) => `/reports/unit/${params.userId}/statement?month=${params.month}`,
    filename: (params) => `statement-${params.month}.pdf`,
  },
  {
    key: 'occupancy',
    title: 'تقرير الإشغال',
    desc: 'الوحدات المشغولة، الشاغرة، عدد السكان',
    icon: Building2,
    color: 'from-emerald-500 to-teal-600',
    needs: 'compound',
    endpoint: (params) => `/reports/compound/${params.compoundId}/occupancy?month=${params.month}`,
    filename: (params) => `occupancy-${params.month}.pdf`,
  },
  {
    key: 'invoices',
    title: 'الفواتير والتحصيلات',
    desc: 'الفواتير المستحقة والمدفوعة والمتأخرة',
    icon: Receipt,
    color: 'from-amber-500 to-orange-600',
    needs: 'compound',
    endpoint: (params) => `/reports/compound/${params.compoundId}/invoices?month=${params.month}`,
    filename: (params) => `invoices-${params.month}.pdf`,
  },
  {
    key: 'summary',
    title: 'التقرير الشامل للمجمع',
    desc: 'الإشغال + الماليات + العمليات في وثيقة واحدة',
    icon: PieChart,
    color: 'from-fuchsia-500 to-pink-600',
    needs: 'compound',
    endpoint: (params) => `/reports/compound/${params.compoundId}/summary?month=${params.month}`,
    filename: (params) => `summary-${params.month}.pdf`,
  },
];

export default function PdfReportsPage() {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const { isAdmin, activeRole, isAppOwner, isSuperAdmin, isCompanyAdmin } = usePermissions();

  const [user, setUser] = useState(null);
  const [compounds, setCompounds] = useState([]);
  const [residents, setResidents] = useState([]);
  const [month, setMonth] = useState(defaultMonth);
  const [compoundId, setCompoundId] = useState('');
  const [residentId, setResidentId] = useState('');
  const [loadingKey, setLoadingKey] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [showScheduler, setShowScheduler] = useState(false);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(u);
    // company_admin جرّب الكمبوند النشط من localStorage أولاً
    const activeCid = localStorage.getItem('selectedCompoundId') || '';
    if (activeCid) {
      setCompoundId(activeCid);
    } else if (u?.compound_id && u.compound_id !== 'default-compound') {
      setCompoundId(u.compound_id);
    }
    if (u?.id && u?.role === 'resident') setResidentId(u.id);
  }, []);

  useEffect(() => {
    if (!user) return;
    // App Owner / Super Admin: كل المجمعات
    if (isAppOwner || isSuperAdmin) {
      axios.get(`${API}/compounds`).then((r) => {
        const list = Array.isArray(r.data) ? r.data : (r.data?.compounds || []);
        setCompounds(list);
        if (!compoundId && list[0]?.id) setCompoundId(list[0].id);
      }).catch(() => {});
      return;
    }
    // Company Admin: مجمعات الشركة فقط
    if (isCompanyAdmin) {
      axios.get(`${API}/company-admin/compounds`).then((r) => {
        const list = r.data?.compounds || [];
        setCompounds(list);
        if (!compoundId && list[0]?.id) setCompoundId(list[0].id);
      }).catch(() => {});
    }
  }, [user, isAppOwner, isSuperAdmin, isCompanyAdmin, compoundId]);

  useEffect(() => {
    if (!compoundId) return;
    if (isAdmin) {
      axios.get(`${API}/users?compound_id=${compoundId}&role=resident`).then((r) => {
        const list = r.data?.users || r.data || [];
        setResidents(Array.isArray(list) ? list : []);
      }).catch(() => setResidents([]));
    }
  }, [compoundId, isAdmin]);

  const downloadReport = async (report) => {
    if (report.needs === 'unit' && !residentId) {
      toast.error('يرجى اختيار الساكن أولاً');
      return;
    }
    if (report.needs === 'compound' && !compoundId) {
      toast.error('يرجى اختيار المجمع أولاً');
      return;
    }
    setLoadingKey(report.key);
    try {
      const params = { compoundId, userId: residentId, month };
      const url = `${API}${report.endpoint(params)}`;
      const res = await axios.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = report.filename(params);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`تم تنزيل ${report.title}`);
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.detail || 'فشل في توليد التقرير';
      toast.error(msg);
    } finally {
      setLoadingKey(null);
    }
  };

  const role = user?.role;

  const triggerMonthlyNow = async () => {
    if (!window.confirm(`سيتم توليد وإرسال تقارير شهر ${month} بالبريد الإلكتروني لجميع السكان ومدراء المجمعات. هل تريد المتابعة؟`)) return;
    setTriggering(true);
    try {
      await axios.post(`${API}/reports/run-monthly-now`, { month });
      toast.success('تم بدء عملية الإرسال في الخلفية. ستستلم النتائج قريباً.');
      setTimeout(loadSchedulerStatus, 2000);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل بدء العملية');
    } finally {
      setTriggering(false);
    }
  };

  const loadSchedulerStatus = async () => {
    try {
      const r = await axios.get(`${API}/reports/scheduler/status`);
      setSchedulerStatus(r.data);
      setShowScheduler(true);
    } catch (e) {
      toast.error('فشل تحميل سجل الإرسال');
    }
  };

  return (
    <div className="min-h-screen p-6" data-testid="pdf-reports-page">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            تقارير PDF
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            توليد تقارير احترافية بصيغة PDF مع دعم كامل للعربية وRTL
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md mb-6 border border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="inline w-4 h-4 ms-1" /> الشهر
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                data-testid="report-month-input"
              />
            </div>

            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Building2 className="inline w-4 h-4 ms-1" /> المجمع
                </label>
                {(isAppOwner || isSuperAdmin || isCompanyAdmin) ? (
                  <select
                    value={compoundId}
                    onChange={(e) => setCompoundId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                    data-testid="report-compound-select"
                  >
                    <option value="">— اختر مجمع —</option>
                    {compounds.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={user?.compound_name || compoundId || '—'}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                  />
                )}
              </div>
            )}

            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الساكن (للكشف الفردي)
                </label>
                <select
                  value={residentId}
                  onChange={(e) => setResidentId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                  data-testid="report-resident-select"
                >
                  <option value="">— اختر ساكن —</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.full_name || r.username} {r.unit_number ? `(${r.unit_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {reports
            .filter((r) => isAdmin || r.key === 'statement')
            .map((r) => {
              const Icon = r.icon;
              const loading = loadingKey === r.key;
              return (
                <div
                  key={r.key}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all"
                  data-testid={`report-card-${r.key}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center text-white`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{r.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">{r.desc}</p>
                  <button
                    onClick={() => downloadReport(r)}
                    disabled={loading}
                    className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r ${r.color} text-white font-medium hover:opacity-90 disabled:opacity-50 transition`}
                    data-testid={`download-report-${r.key}-btn`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> جارِ التوليد…
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" /> تنزيل PDF
                      </>
                    )}
                  </button>
                </div>
              );
            })}
        </div>

        <div className="mt-8 text-xs text-gray-500 dark:text-gray-400 text-center">
          يتم توليد التقارير لحظياً بصيغة PDF احترافية مع دعم كامل للعربية. الترويسة والشعار يُضافان تلقائياً.
        </div>

        {/* Monthly Scheduler — admin only */}
        {isAdmin && (
          <div className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800" data-testid="monthly-scheduler-card">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white">
                <Send className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">الجدولة الشهرية التلقائية</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  يقوم النظام بإرسال "كشف حساب الوحدة" لكل ساكن و"التقرير الشامل" لمسؤولي المجمع تلقائياً في أول كل شهر (02:00 UTC) عبر البريد الإلكتروني. يمكنك أيضاً تشغيل العملية يدوياً الآن لشهر محدد.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={triggerMonthlyNow}
                disabled={triggering}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:opacity-90 disabled:opacity-50"
                data-testid="trigger-monthly-reports-btn"
              >
                {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                تشغيل الآن لشهر {month}
              </button>
              <button
                onClick={loadSchedulerStatus}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-indigo-600 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                data-testid="view-scheduler-status-btn"
              >
                <Clock className="w-4 h-4" />
                عرض سجل الإرسال
              </button>
            </div>
            {showScheduler && schedulerStatus && (
              <div className="mt-5 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <div className="text-[10px] text-gray-500">إجمالي العمليات</div>
                    <div className="text-xl font-bold">{schedulerStatus.total_runs ?? 0}</div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
                    <div className="text-[10px] text-gray-500">نجاح</div>
                    <div className="text-xl font-bold text-emerald-700">{schedulerStatus.success_runs ?? 0}</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                    <div className="text-[10px] text-gray-500">فشل</div>
                    <div className="text-xl font-bold text-red-700">{schedulerStatus.failed_runs ?? 0}</div>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                    <div className="text-[10px] text-gray-500">معدل النجاح</div>
                    <div className="text-xl font-bold text-indigo-700">{Math.round((schedulerStatus.success_rate || 0) * 100)}%</div>
                  </div>
                </div>
                {schedulerStatus.by_kind && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {Object.entries(schedulerStatus.by_kind).map(([k, v]) => (
                      <div key={k} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{k}</div>
                          <div className="text-xs text-gray-500">{Math.round((v.rate || 0) * 100)}%</div>
                        </div>
                        <div className="text-xs text-gray-500">إجمالي: {v.total} • نجح: {v.success} • فشل: {v.failed}</div>
                      </div>
                    ))}
                  </div>
                )}
                {schedulerStatus.monthly_trend && schedulerStatus.monthly_trend.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">آخر 6 أشهر</div>
                    <div className="flex items-end gap-2 h-24">
                      {schedulerStatus.monthly_trend.map((m, i) => {
                        const max = Math.max(...schedulerStatus.monthly_trend.map(x => x.total));
                        const h = max > 0 ? Math.max(8, (m.total / max) * 80) : 8;
                        const sH = m.total > 0 ? (m.success / m.total) * h : 0;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full bg-red-200 rounded-t" style={{ height: `${h}px`, position: 'relative' }}>
                              <div className="w-full bg-emerald-500 rounded-t absolute bottom-0" style={{ height: `${sH}px` }} />
                            </div>
                            <div className="text-[10px] font-mono text-gray-500">{m.month}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center mb-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-300">آخر تشغيل: {schedulerStatus.last_run_at?.slice(0, 19)?.replace('T', ' ') || '—'}</span>
                </div>
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300">
                      <tr>
                        <th className="text-start p-2">النوع</th>
                        <th className="text-start p-2">الشهر</th>
                        <th className="text-start p-2">الهدف</th>
                        <th className="text-start p-2">الحالة</th>
                        <th className="text-start p-2">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(schedulerStatus.recent || []).map((r, i) => (
                        <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                          <td className="p-2">{r.kind}</td>
                          <td className="p-2 font-mono">{r.month}</td>
                          <td className="p-2 font-mono text-[10px]">{r.target_id?.slice(0, 8)}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {r.ok ? 'نجح' : 'فشل'}
                            </span>
                          </td>
                          <td className="p-2">{r.created_at?.slice(0, 16)?.replace('T', ' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
