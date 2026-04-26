import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  FileText,
  Building2,
  Receipt,
  PieChart,
  Download,
  Calendar,
  Loader2,
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

  const [user, setUser] = useState(null);
  const [compounds, setCompounds] = useState([]);
  const [residents, setResidents] = useState([]);
  const [month, setMonth] = useState(defaultMonth);
  const [compoundId, setCompoundId] = useState('');
  const [residentId, setResidentId] = useState('');
  const [loadingKey, setLoadingKey] = useState(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(u);
    if (u?.compound_id) setCompoundId(u.compound_id);
    if (u?.id && u?.role === 'resident') setResidentId(u.id);
  }, []);

  useEffect(() => {
    if (!user) return;
    const role = user.role;
    if (role === 'app_owner' || role === 'super_admin') {
      axios.get(`${API}/compounds`).then((r) => {
        const list = Array.isArray(r.data) ? r.data : (r.data?.compounds || []);
        setCompounds(list);
        if (!compoundId && list[0]?.id) setCompoundId(list[0].id);
      }).catch(() => {});
    }
  }, [user, compoundId]);

  useEffect(() => {
    if (!compoundId) return;
    const role = user?.role;
    if (['app_owner', 'super_admin', 'admin', 'compound_admin'].includes(role)) {
      axios.get(`${API}/users?compound_id=${compoundId}&role=resident`).then((r) => {
        const list = r.data?.users || r.data || [];
        setResidents(Array.isArray(list) ? list : []);
      }).catch(() => setResidents([]));
    }
  }, [compoundId, user]);

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
  const isAdmin = ['app_owner', 'super_admin', 'admin', 'compound_admin'].includes(role);

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
                {role === 'app_owner' || role === 'super_admin' ? (
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
      </div>
    </div>
  );
}
