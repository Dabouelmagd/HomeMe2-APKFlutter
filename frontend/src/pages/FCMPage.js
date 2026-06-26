import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  DevicePhoneMobileIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BellAlertIcon,
  BeakerIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const FCMPage = () => {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Send form
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  // Test form
  const [testToken, setTestToken] = useState('');
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        axios.get(`${API}/fcm/status`, auth()),
        axios.get(`${API}/fcm/logs?days=7&limit=50`, auth()),
      ]);
      setStatus(s.data || null);
      setLogs(l.data?.items || []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSend = async () => {
    if (!userId.trim() || !title.trim() || !body.trim()) {
      toast.error('يرجى تعبئة كل الحقول'); return;
    }
    setSending(true);
    try {
      const r = await axios.post(`${API}/fcm/send`, { user_id: userId.trim(), title: title.trim(), body: body.trim() }, auth());
      if (r.data?.ok) {
        toast.success(`تم الإرسال إلى ${r.data.sent} جهاز`);
      } else {
        toast.warning(r.data?.warning || r.data?.error || 'لم يتم الإرسال — قد يكون المستخدم لم يسجّل جهازاً بعد');
      }
      setTitle(''); setBody('');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل الإرسال');
    } finally {
      setSending(false);
    }
  };

  const onTestSend = async () => {
    if (!testToken.trim()) { toast.error('يرجى لصق FCM token'); return; }
    setTesting(true);
    try {
      const r = await axios.post(`${API}/fcm/test`, { token: testToken.trim() }, auth());
      if (r.data?.ok) toast.success('تم إرسال الاختبار بنجاح ✅');
      else toast.error(r.data?.error || 'فشل إرسال الاختبار');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل');
    } finally {
      setTesting(false);
    }
  };

  const formatDate = (iso) => { try { return new Date(iso).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };

  return (
    <div className="p-6 bg-gray-50 min-h-screen" data-testid="fcm-page">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
              <BellAlertIcon className="h-7 w-7 text-orange-500" />
              إشعارات Push (FCM)
            </h1>
            <p className="text-sm text-gray-500 mt-1">إرسال إشعارات Push عبر Firebase إلى تطبيق Flutter (iOS + Android)</p>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium disabled:opacity-50" data-testid="fcm-reload">
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
          </button>
        </div>

        {status && (
          <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className={`rounded-xl p-4 text-white shadow-sm ${status.configured ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-rose-500 to-red-600'}`} data-testid="stat-fcm-configured">
              <div className="text-2xl font-bold">{status.configured ? '✅ مُكوَّن' : '❌ غير مُكوَّن'}</div>
              <div className="text-xs mt-1 opacity-90 truncate">{status.project_id || '—'}</div>
            </div>
            <div className="rounded-xl p-4 text-white shadow-sm bg-gradient-to-br from-blue-500 to-indigo-600" data-testid="stat-fcm-devices">
              <div className="text-3xl font-extrabold">{status.registered_tokens || 0}</div>
              <div className="text-xs mt-1 opacity-90">📱 أجهزة مسجلة</div>
            </div>
            <div className="rounded-xl p-4 text-white shadow-sm bg-gradient-to-br from-indigo-600 to-purple-700" data-testid="stat-fcm-total">
              <div className="text-3xl font-extrabold">{status.total || 0}</div>
              <div className="text-xs mt-1 opacity-90">إجمالي الإرسال (7 أيام)</div>
            </div>
            <div className="rounded-xl p-4 text-white shadow-sm bg-gradient-to-br from-emerald-500 to-green-600" data-testid="stat-fcm-sent">
              <div className="text-3xl font-extrabold">{status.succeeded || 0}</div>
              <div className="text-xs mt-1 opacity-90">✅ نجح</div>
            </div>
            <div className="rounded-xl p-4 text-white shadow-sm bg-gradient-to-br from-rose-500 to-pink-600" data-testid="stat-fcm-failed">
              <div className="text-3xl font-extrabold">{status.failed || 0}</div>
              <div className="text-xs mt-1 opacity-90">❌ فشل</div>
            </div>
          </div>
        )}

        {status?.init_error && (
          <div className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-800 flex items-start gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div><strong>خطأ في التهيئة:</strong> {status.init_error}</div>
          </div>
        )}
      </div>

      {/* Setup Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-900" data-testid="fcm-guide">
        <p className="font-bold mb-2">📋 خطوات الربط مع تطبيق Flutter:</p>
        <ol className="list-decimal mr-5 space-y-1">
          <li>في Flutter: ثبّت <code className="bg-blue-100 px-1 rounded font-mono" dir="ltr">firebase_messaging</code></li>
          <li>اطلب صلاحية الإشعارات بعد تسجيل الدخول</li>
          <li>اقرأ FCM token عبر <code className="bg-blue-100 px-1 rounded font-mono" dir="ltr">FirebaseMessaging.instance.getToken()</code></li>
          <li>أرسله للخادم عبر <code className="bg-blue-100 px-1 rounded font-mono" dir="ltr">POST /api/fcm/register {`{token, device_id, platform}`}</code></li>
          <li>عند تسجيل الخروج: <code className="bg-blue-100 px-1 rounded font-mono" dir="ltr">POST /api/fcm/unregister</code></li>
        </ol>
      </div>

      {/* Send to user */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <PaperAirplaneIcon className="w-5 h-5 text-emerald-500" />
          إرسال إشعار لمستخدم
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={userId} onChange={(e) => setUserId(e.target.value)}
            placeholder="user_id (UUID)"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            dir="ltr" data-testid="fcm-userid"
          />
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان الإشعار"
            maxLength={200}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            data-testid="fcm-title"
          />
          <input
            value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="نص الإشعار"
            maxLength={1000}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            data-testid="fcm-body"
          />
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={onSend} disabled={sending} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold disabled:opacity-50" data-testid="fcm-send">
            {sending ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PaperAirplaneIcon className="w-4 h-4" />}
            {sending ? 'جاري الإرسال...' : 'إرسال'}
          </button>
        </div>
      </div>

      {/* Test to specific token */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <BeakerIcon className="w-5 h-5 text-amber-500" />
          إرسال اختبار لـtoken محدد
        </h2>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={testToken} onChange={(e) => setTestToken(e.target.value)}
            placeholder="FCM token من جهازك (نسخه من logs الـFlutter)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500"
            dir="ltr"
            data-testid="fcm-test-token"
          />
          <button onClick={onTestSend} disabled={testing} className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold disabled:opacity-50" data-testid="fcm-test-send">
            {testing ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <BeakerIcon className="w-4 h-4" />}
            اختبار
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-indigo-500" />
          سجل الإرسال (آخر 7 أيام)
        </h2>
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10" data-testid="fcm-empty">
            <DevicePhoneMobileIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">لا توجد إشعارات بعد. جرّب إرسال اختبار!</p>
          </div>
        ) : (
          <div className="space-y-2" data-testid="fcm-logs-list">
            {logs.map((l) => (
              <div key={l.id} className="border border-gray-200 rounded-lg p-3" data-testid={`fcm-log-${l.id}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {l.ok ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full"><CheckCircleIcon className="w-3 h-3" /> {l.sent}/{l.tokens_count}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full"><XCircleIcon className="w-3 h-3" /> فشل</span>
                    )}
                    <span className="font-bold text-sm text-gray-800">{l.title}</span>
                  </div>
                  <div className="text-[11px] text-gray-500">{formatDate(l.at)}</div>
                </div>
                <p className="text-xs text-gray-700 mt-1 line-clamp-2">{l.body}</p>
                {l.error && <p className="text-[11px] text-rose-600 mt-1 font-mono" dir="ltr">⚠️ {l.error}</p>}
                {l.dead_tokens_cleaned > 0 && <p className="text-[10px] text-amber-600 mt-0.5">🧹 تنظيف {l.dead_tokens_cleaned} token قديم</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FCMPage;
