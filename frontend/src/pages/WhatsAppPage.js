import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const StatusBadge = ({ status, ok }) => {
  if (ok === false) return <span className="inline-flex items-center gap-1 text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full"><XCircleIcon className="w-3 h-3" /> فشل</span>;
  const colors = {
    queued: 'bg-blue-50 text-blue-700 border-blue-200',
    sent: 'bg-amber-50 text-amber-700 border-amber-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    read: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
    undelivered: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return <span className={`inline-flex items-center gap-1 text-xs font-bold border px-2 py-0.5 rounded-full ${colors[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
    {ok && <CheckCircleIcon className="w-3 h-3" />}
    {status || 'في الانتظار'}
  </span>;
};

const WhatsAppPage = () => {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Send form state
  const [to, setTo] = useState('');
  const [body, setBody] = useState('');
  const [previewNormalized, setPreviewNormalized] = useState(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([
        axios.get(`${API}/whatsapp/status`, auth()),
        axios.get(`${API}/whatsapp/logs?days=7&limit=50`, auth()),
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

  // Live phone normalization preview (debounced)
  useEffect(() => {
    if (!to) { setPreviewNormalized(null); return; }
    const id = setTimeout(async () => {
      try {
        const r = await axios.post(`${API}/whatsapp/normalize-test`, { phone: to }, auth());
        setPreviewNormalized(r.data);
      } catch { /* silent */ }
    }, 250);
    return () => clearTimeout(id);
  }, [to]);

  const onSend = async () => {
    if (!to.trim() || !body.trim()) { toast.error('يرجى إدخال رقم ونص الرسالة'); return; }
    if (!previewNormalized?.valid) { toast.error('رقم الهاتف غير صالح'); return; }
    setSending(true);
    try {
      const r = await axios.post(`${API}/whatsapp/send`, { to: to.trim(), body: body.trim() }, auth());
      toast.success(`تم الإرسال بنجاح. الحالة: ${r.data?.status || 'queued'}`);
      setBody('');
      load();
    } catch (err) {
      const detail = err?.response?.data?.detail || 'فشل إرسال الرسالة';
      toast.error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setSending(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen" data-testid="whatsapp-page">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 inline-flex items-center gap-2">
              <ChatBubbleLeftRightIcon className="h-7 w-7 text-emerald-500" />
              إشعارات WhatsApp
            </h1>
            <p className="text-sm text-gray-500 mt-1">إرسال إشعارات للسكان والمديرين عبر WhatsApp Business</p>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium disabled:opacity-50" data-testid="whatsapp-reload">
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>

        {status && (
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`rounded-xl p-4 text-white shadow-sm ${status.configured ? 'bg-gradient-to-br from-emerald-500 to-green-600' : 'bg-gradient-to-br from-rose-500 to-red-600'}`} data-testid="stat-configured">
              <div className="text-2xl font-bold">{status.configured ? '✅ مُكوَّن' : '❌ غير مُكوَّن'}</div>
              <div className="text-xs mt-1 opacity-90 truncate">{status.from}</div>
            </div>
            <div className="rounded-xl p-4 text-white shadow-sm bg-gradient-to-br from-indigo-600 to-purple-700" data-testid="stat-total">
              <div className="text-3xl font-extrabold">{status.total || 0}</div>
              <div className="text-xs mt-1 opacity-90">إجمالي الرسائل (7 أيام)</div>
            </div>
            <div className="rounded-xl p-4 text-white shadow-sm bg-gradient-to-br from-emerald-500 to-green-600" data-testid="stat-sent">
              <div className="text-3xl font-extrabold">{status.sent || 0}</div>
              <div className="text-xs mt-1 opacity-90">✅ تم الإرسال</div>
            </div>
            <div className="rounded-xl p-4 text-white shadow-sm bg-gradient-to-br from-rose-500 to-pink-600" data-testid="stat-failed">
              <div className="text-3xl font-extrabold">{status.failed || 0}</div>
              <div className="text-xs mt-1 opacity-90">❌ فشل</div>
            </div>
          </div>
        )}
      </div>

      {/* Sandbox warning */}
      {status?.from?.includes('14155238886') && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3" data-testid="sandbox-warning">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-bold">وضع Sandbox</p>
            <p className="mt-1">حالياً تستخدم رقم Twilio Sandbox التجريبي. <strong>قبل إرسال أي رسالة</strong>، يجب على المستلم:</p>
            <ol className="list-decimal mr-5 mt-2 space-y-1">
              <li>إرسال رسالة WhatsApp إلى الرقم <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">+1 415 523 8886</code></li>
              <li>محتوى الرسالة: <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono" dir="ltr">join &lt;sandbox-code&gt;</code></li>
              <li>استخراج الـsandbox-code من <a href="https://console.twilio.com/us1/develop/messaging/try-it-out/whatsapp-learn" target="_blank" rel="noopener noreferrer" className="underline font-bold">Twilio Console</a></li>
            </ol>
            <p className="mt-2">للإنتاج، قم بتعيين <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">TWILIO_WHATSAPP_FROM</code> برقم WhatsApp Business المعتمد.</p>
          </div>
        </div>
      )}

      {/* Send form */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
          <PaperAirplaneIcon className="w-5 h-5 text-emerald-500" />
          إرسال رسالة جديدة
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="text-xs font-bold text-gray-600 block mb-1">رقم الهاتف (مع كود الدولة)</label>
            <div className="relative">
              <PhoneIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="+201001234567 أو 01001234567"
                className="w-full pr-9 pl-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                dir="ltr"
                data-testid="whatsapp-to"
              />
            </div>
            {previewNormalized && (
              <div className={`text-[11px] mt-1 font-mono ${previewNormalized.valid ? 'text-emerald-600' : 'text-rose-600'}`} dir="ltr">
                {previewNormalized.valid ? `→ ${previewNormalized.normalized}` : '✗ رقم غير صالح'}
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-gray-600 block mb-1">نص الرسالة</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              rows={3}
              maxLength={1600}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              data-testid="whatsapp-body"
            />
            <div className="text-[10px] text-gray-400 text-left mt-1">{body.length}/1600</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end">
          <button
            onClick={onSend}
            disabled={sending || !previewNormalized?.valid || !body.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="whatsapp-send"
          >
            {sending ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PaperAirplaneIcon className="w-4 h-4" />}
            {sending ? 'جاري الإرسال...' : 'إرسال'}
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
          <div className="text-center py-10" data-testid="logs-empty">
            <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">لا توجد رسائل بعد. جرّب إرسال أول رسالة!</p>
          </div>
        ) : (
          <div className="space-y-2" data-testid="logs-list">
            {logs.map((l) => (
              <div key={l.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors" data-testid={`whatsapp-log-${l.id}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-gray-800" dir="ltr">{l.to_normalized || l.to}</span>
                    <StatusBadge status={l.status} ok={l.ok} />
                  </div>
                  <div className="text-[11px] text-gray-500">{formatDate(l.at)}</div>
                </div>
                <p className="text-xs text-gray-700 mt-1.5 line-clamp-2">{l.body}</p>
                {l.error && (
                  <p className="text-[11px] text-rose-600 mt-1 font-mono" dir="ltr">⚠️ {l.error}</p>
                )}
                {l.error_code && (
                  <p className="text-[10px] text-rose-500 mt-0.5">Twilio error code: {l.error_code}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppPage;
