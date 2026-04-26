import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  RefreshCw,
  Clock,
  Activity,
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function SmtpHealthPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(24);
  const [threshold, setThreshold] = useState(0.30);
  const [testEmail, setTestEmail] = useState('');
  const [testMailbox, setTestMailbox] = useState('main');
  const [sendingTest, setSendingTest] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/system/smtp-health/stats`, { params: { hours, threshold } });
      setStats(r.data);
    } catch (e) {
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hours, threshold]);

  const sendTest = async () => {
    if (!testEmail) {
      toast.error('أدخل بريداً إلكترونياً للاختبار');
      return;
    }
    setSendingTest(true);
    try {
      const r = await axios.post(`${API}/system/smtp-health/test-send`, null, {
        params: { to_email: testEmail, mailbox: testMailbox },
      });
      if (r.data.sent) {
        toast.success('تم إرسال البريد الاختباري بنجاح');
      } else {
        toast.error('فشل الإرسال — راجع السجلات أدناه');
      }
      setTimeout(load, 1500);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل الاختبار');
    } finally {
      setSendingTest(false);
    }
  };

  const successRate = stats ? Math.round((stats.success_rate || 0) * 100) : 0;
  const failureRate = stats ? Math.round((stats.failure_rate || 0) * 100) : 0;

  return (
    <div className="min-h-screen p-6" data-testid="smtp-health-page">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-3">
              <Mail className="w-8 h-8 text-indigo-600" />
              مراقبة صحة SMTP
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              معدّلات نجاح/فشل إرسال البريد، الاتجاهات والتنبيهات.
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:shadow"
            data-testid="refresh-smtp-stats-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md mb-6 border border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">النافذة الزمنية (ساعات)</label>
              <select
                value={hours}
                onChange={(e) => setHours(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                data-testid="smtp-hours-select"
              >
                <option value={1}>آخر ساعة</option>
                <option value={6}>آخر 6 ساعات</option>
                <option value={24}>آخر 24 ساعة</option>
                <option value={72}>آخر 3 أيام</option>
                <option value={168}>آخر أسبوع</option>
                <option value={720}>آخر 30 يوماً</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">عتبة التنبيه (نسبة الفشل)</label>
              <select
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                data-testid="smtp-threshold-select"
              >
                <option value={0.10}>10%</option>
                <option value={0.20}>20%</option>
                <option value={0.30}>30% (افتراضي)</option>
                <option value={0.50}>50%</option>
              </select>
            </div>
          </div>
        </div>

        {/* Alert banner */}
        {stats?.alert && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 rounded-2xl p-5 mb-6 flex items-center gap-4" data-testid="smtp-alert-banner">
            <AlertTriangle className="w-10 h-10 text-red-600 flex-shrink-0" />
            <div>
              <div className="font-semibold text-red-800 dark:text-red-200">⚠️ تنبيه: نسبة فشل SMTP عالية</div>
              <div className="text-sm text-red-700 dark:text-red-300">
                نسبة الفشل {failureRate}% تجاوزت العتبة المحددة ({Math.round((stats.alert_threshold || 0) * 100)}%). راجع السجلات أدناه.
              </div>
            </div>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard icon={Activity} label="إجمالي المحاولات" value={stats?.total ?? 0} color="from-indigo-500 to-purple-600" />
          <KpiCard icon={CheckCircle2} label="نجاح" value={stats?.success ?? 0} color="from-emerald-500 to-teal-600" />
          <KpiCard icon={XCircle} label="فشل" value={stats?.failed ?? 0} color="from-red-500 to-rose-600" />
          <KpiCard icon={CheckCircle2} label="معدل النجاح" value={`${successRate}%`} color="from-emerald-500 to-green-600" />
        </div>

        {/* By mailbox */}
        {stats?.by_mailbox && Object.keys(stats.by_mailbox).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md mb-6 border border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">حسب صندوق البريد</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="text-start p-2">الصندوق</th>
                    <th className="text-start p-2">المحاولات</th>
                    <th className="text-start p-2">النجاح</th>
                    <th className="text-start p-2">معدل النجاح</th>
                    <th className="text-start p-2">متوسط المدة (ms)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.by_mailbox).map(([mb, v]) => (
                    <tr key={mb} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="p-2 font-mono text-indigo-700 dark:text-indigo-300">{mb}</td>
                      <td className="p-2">{v.total}</td>
                      <td className="p-2 text-emerald-700">{v.success}</td>
                      <td className="p-2">{Math.round((v.success_rate || 0) * 100)}%</td>
                      <td className="p-2 text-gray-500">{v.avg_duration_ms}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent failures */}
        {stats?.recent_failures && stats.recent_failures.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md mb-6 border border-red-100 dark:border-red-900">
            <h3 className="font-semibold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5" /> أحدث الإخفاقات ({stats.recent_failures.length})
            </h3>
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 sticky top-0">
                  <tr>
                    <th className="text-start p-2">التاريخ</th>
                    <th className="text-start p-2">الصندوق</th>
                    <th className="text-start p-2">المستلم</th>
                    <th className="text-start p-2">الموضوع</th>
                    <th className="text-start p-2">السبب</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_failures.map((f, i) => (
                    <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="p-2 text-gray-500">{f.timestamp?.slice(0, 19)?.replace('T', ' ')}</td>
                      <td className="p-2 font-mono">{f.mailbox}</td>
                      <td className="p-2 truncate max-w-xs">{f.to_email}</td>
                      <td className="p-2 truncate max-w-xs">{f.subject}</td>
                      <td className="p-2 text-red-700 truncate max-w-xs" title={f.error}>{f.error?.slice(0, 80)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Test send */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-5 border border-indigo-200 dark:border-indigo-800">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-600" />
            اختبار إرسال (متوفر للمالك فقط)
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
            أرسل بريداً اختبارياً للتحقق من حالة الاتصال بـ SMTP. يتم تسجيل النتيجة تلقائياً في السجل أعلاه.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="email"
              placeholder="someone@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              data-testid="smtp-test-email-input"
            />
            <select
              value={testMailbox}
              onChange={(e) => setTestMailbox(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
              data-testid="smtp-test-mailbox-select"
            >
              <option value="main">main</option>
              <option value="security">security</option>
              <option value="support">support</option>
            </select>
            <button
              onClick={sendTest}
              disabled={sendingTest || !testEmail}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              data-testid="smtp-send-test-btn"
            >
              <Send className="w-4 h-4" />
              {sendingTest ? 'جارِ الإرسال…' : 'إرسال اختبار'}
            </button>
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center flex items-center justify-center gap-2">
          <Clock className="w-3 h-3" />
          آخر تحديث: {new Date().toLocaleString('ar-EG')}
        </div>
      </div>
    </div>
  );
}

const KpiCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md border border-gray-100 dark:border-gray-700">
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</div>
  </div>
);
