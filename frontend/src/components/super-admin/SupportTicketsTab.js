import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const CATEGORY_LABELS = {
  general: { ar: 'استفسار عام', icon: '💬', color: 'bg-blue-600' },
  bug: { ar: 'بلاغ خطأ', icon: '🐛', color: 'bg-red-600' },
  feature_request: { ar: 'اقتراح ميزة', icon: '💡', color: 'bg-yellow-600' },
  complaint: { ar: 'شكوى', icon: '⚠️', color: 'bg-orange-600' },
  security: { ar: 'مخاوف أمنية', icon: '🚨', color: 'bg-rose-600' },
  payment_confirmation: { ar: 'إيصال دفع', icon: '💰', color: 'bg-emerald-600' },
};

const STATUS_LABELS = {
  open: { ar: 'مفتوحة', color: 'bg-emerald-600 text-white', dot: 'bg-emerald-400' },
  in_progress: { ar: 'قيد المعالجة', color: 'bg-indigo-600 text-white', dot: 'bg-indigo-400' },
  resolved: { ar: 'تم الحل', color: 'bg-sky-600 text-white', dot: 'bg-sky-400' },
  closed: { ar: 'مغلقة', color: 'bg-gray-600 text-white', dot: 'bg-gray-400' },
};

const formatDate = (iso) => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso.slice(0, 16).replace('T', ' '); }
};

const SupportTicketsTab = ({ t }) => {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ open: 0, in_progress: 0, resolved: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyCloseAfter, setReplyCloseAfter] = useState(false);
  const [replying, setReplying] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (search.trim()) params.append('search', search.trim());
      const res = await axios.get(`${API}/admin/support-tickets?${params}`, getAuth());
      setTickets(res.data.tickets || []);
      setStats(res.data.stats || {});
    } catch (e) {
      toast.error(t('st_load_failed', 'فشل تحميل التذاكر'));
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory, search, t]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const openTicket = async (ticket) => {
    try {
      const res = await axios.get(`${API}/admin/support-tickets/${ticket.id}`, getAuth());
      setSelectedTicket(res.data);
      setReplyMessage('');
      setReplyCloseAfter(false);
    } catch {
      toast.error(t('st_open_failed', 'فشل فتح التذكرة'));
    }
  };

  const changeStatus = async (ticketId, newStatus) => {
    try {
      await axios.put(`${API}/admin/support-tickets/${ticketId}/status`, { status: newStatus }, getAuth());
      toast.success(t('st_status_updated', `تم تغيير الحالة إلى: ${STATUS_LABELS[newStatus]?.ar || newStatus}`));
      await fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch {
      toast.error(t('st_status_failed', 'فشل تغيير الحالة'));
    }
  };

  const submitReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) {
      toast.error(t('st_reply_empty', 'يرجى كتابة الرد'));
      return;
    }
    setReplying(true);
    try {
      const res = await axios.post(
        `${API}/admin/support-tickets/${selectedTicket.id}/reply`,
        { message: replyMessage.trim(), close_after_reply: replyCloseAfter },
        { ...getAuth(), timeout: 30000 }
      );
      if (res.data?.ok) {
        toast.success(
          res.data.email_sent
            ? t('st_reply_ok_email', '✅ تم إرسال الرد والإيميل للمستخدم')
            : t('st_reply_ok_no_email', '✅ تم حفظ الرد (فشل إرسال الإيميل)')
        );
        await fetchTickets();
        // Refresh ticket details
        const r = await axios.get(`${API}/admin/support-tickets/${selectedTicket.id}`, getAuth());
        setSelectedTicket(r.data);
        setReplyMessage('');
        setReplyCloseAfter(false);
      }
    } catch (e) {
      toast.error(t('st_reply_failed', 'فشل إرسال الرد'));
    } finally {
      setReplying(false);
    }
  };

  const deleteTicket = async (ticketId) => {
    if (!window.confirm(t('st_delete_confirm', 'هل أنت متأكد من حذف هذه التذكرة نهائياً؟'))) return;
    try {
      await axios.delete(`${API}/admin/support-tickets/${ticketId}`, getAuth());
      toast.success(t('st_deleted', 'تم الحذف'));
      setSelectedTicket(null);
      await fetchTickets();
    } catch {
      toast.error(t('st_delete_failed', 'فشل الحذف'));
    }
  };

  return (
    <div className="space-y-4" dir="rtl" data-testid="support-tickets-tab">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { k: 'open', label: STATUS_LABELS.open.ar, icon: '📬' },
          { k: 'in_progress', label: STATUS_LABELS.in_progress.ar, icon: '⚙️' },
          { k: 'resolved', label: STATUS_LABELS.resolved.ar, icon: '✔️' },
          { k: 'closed', label: STATUS_LABELS.closed.ar, icon: '🔒' },
        ].map(s => (
          <button
            key={s.k}
            onClick={() => setFilterStatus(s.k === filterStatus ? 'all' : s.k)}
            className={`rounded-xl p-4 text-right transition-all border ${
              filterStatus === s.k
                ? `${STATUS_LABELS[s.k].color} border-white/30`
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
            }`}
            data-testid={`stat-${s.k}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{s.icon}</span>
              <span className="text-3xl font-bold">{stats[s.k] || 0}</span>
            </div>
            <p className="text-sm mt-1 opacity-90">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-gray-800/60 rounded-xl p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('st_search_ph', '🔍 ابحث في الاسم أو الإيميل أو الموضوع...')}
          className="flex-1 min-w-[200px] bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
          data-testid="st-search"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          data-testid="st-filter-category"
        >
          <option value="all">{t('st_all_categories', 'كل الأنواع')}</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.ar}</option>
          ))}
        </select>
        <button
          onClick={() => setFilterCategory(filterCategory === 'payment_confirmation' ? 'all' : 'payment_confirmation')}
          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
            filterCategory === 'payment_confirmation'
              ? 'bg-emerald-600 text-white shadow'
              : 'bg-emerald-900/40 border border-emerald-600/40 text-emerald-300 hover:bg-emerald-800/50'
          }`}
          data-testid="st-filter-payments-only"
        >
          💰 إيصالات الدفع فقط
        </button>
        {filterStatus !== 'all' && (
          <button
            onClick={() => setFilterStatus('all')}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg"
            data-testid="st-clear-status"
          >
            {t('st_clear_filter', '✕ إلغاء الفلتر')}
          </button>
        )}
      </div>

      {/* Tickets table */}
      <div className="bg-gray-800/60 rounded-xl overflow-hidden border border-gray-700">
        {loading ? (
          <div className="py-20 text-center text-gray-400">⏳ {t('st_loading', 'جارٍ التحميل...')}</div>
        ) : tickets.length === 0 ? (
          <div className="py-20 text-center text-gray-400">
            📭 {t('st_no_tickets', 'لا توجد تذاكر')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-gray-400 text-xs uppercase">
                <th className="px-3 py-3 text-right">#</th>
                <th className="px-3 py-3 text-right">{t('st_user', 'المستخدم')}</th>
                <th className="px-3 py-3 text-right">{t('st_category', 'النوع')}</th>
                <th className="px-3 py-3 text-right">{t('st_subject', 'الموضوع')}</th>
                <th className="px-3 py-3 text-right">{t('st_status', 'الحالة')}</th>
                <th className="px-3 py-3 text-right">{t('st_created', 'تاريخ')}</th>
                <th className="px-3 py-3 text-center">{t('st_actions', 'إجراءات')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {tickets.map((tk) => {
                const cat = CATEGORY_LABELS[tk.category] || CATEGORY_LABELS.general;
                const stat = STATUS_LABELS[tk.status] || STATUS_LABELS.open;
                const repliesCount = (tk.replies || []).length;
                return (
                  <tr
                    key={tk.id}
                    className="hover:bg-gray-700/40 cursor-pointer transition-colors"
                    onClick={() => openTicket(tk)}
                    data-testid={`ticket-row-${tk.id}`}
                  >
                    <td className="px-3 py-3 font-mono text-gray-400 text-xs">#{tk.id.slice(0, 6)}</td>
                    <td className="px-3 py-3">
                      <div className="text-white font-medium">{tk.name}</div>
                      <div className="text-xs text-gray-400" dir="ltr">{tk.email}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white ${cat.color}`}>
                        {cat.icon} {cat.ar}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-white max-w-xs truncate">
                      {tk.subject}
                      {repliesCount > 0 && <span className="ms-2 text-xs text-indigo-300">💬 {repliesCount}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${stat.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${stat.dot}`}></span>
                        {stat.ar}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-400">{formatDate(tk.created_at)}</td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); openTicket(tk); }}
                        className="text-indigo-400 hover:text-indigo-300 text-xs font-bold"
                      >
                        {t('st_open', 'فتح ←')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail modal */}
      {selectedTicket && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            data-testid="ticket-detail-modal"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-700 to-purple-700 px-5 py-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">{selectedTicket.subject}</h3>
                <div className="flex flex-wrap gap-2 items-center text-xs">
                  <span className="bg-white/20 text-white px-2 py-0.5 rounded font-mono">#{selectedTicket.id.slice(0, 8)}</span>
                  {(() => {
                    const cat = CATEGORY_LABELS[selectedTicket.category] || CATEGORY_LABELS.general;
                    return <span className={`px-2 py-0.5 rounded text-white ${cat.color}`}>{cat.icon} {cat.ar}</span>;
                  })()}
                  {(() => {
                    const stat = STATUS_LABELS[selectedTicket.status] || STATUS_LABELS.open;
                    return <span className={`px-2 py-0.5 rounded ${stat.color}`}>{stat.ar}</span>;
                  })()}
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-white/80 hover:text-white text-2xl leading-none"
                data-testid="close-modal"
              >×</button>
            </div>

            {/* Body - scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* User info */}
              <div className="bg-gray-800 rounded-lg p-3 text-sm grid grid-cols-2 gap-2">
                <div><span className="text-gray-400">👤 الاسم: </span><span className="text-white">{selectedTicket.name}</span></div>
                <div><span className="text-gray-400">📧 الإيميل: </span><span className="text-white" dir="ltr">{selectedTicket.email}</span></div>
                {selectedTicket.phone && <div><span className="text-gray-400">📱 الهاتف: </span><span className="text-white" dir="ltr">{selectedTicket.phone}</span></div>}
                {selectedTicket.username && <div><span className="text-gray-400">🔑 الحساب: </span><span className="text-white">{selectedTicket.username} ({selectedTicket.user_role})</span></div>}
                <div><span className="text-gray-400">📅 التاريخ: </span><span className="text-white text-xs">{formatDate(selectedTicket.created_at)}</span></div>
              </div>

              {/* Payment confirmation details — only for payment_confirmation category */}
              {selectedTicket.category === 'payment_confirmation' && (
                <PaymentDetailsPanel
                  ticket={selectedTicket}
                  onActivated={async () => {
                    const r = await axios.get(`${API}/admin/support-tickets/${selectedTicket.id}`, getAuth());
                    setSelectedTicket(r.data);
                    await fetchTickets();
                  }}
                />
              )}

              {/* Original message */}
              <div className="bg-indigo-900/30 border-r-4 border-indigo-500 rounded-lg p-4">
                <p className="text-xs text-indigo-300 mb-2 font-bold">📝 الرسالة الأصلية:</p>
                <p className="text-white whitespace-pre-wrap leading-relaxed">{selectedTicket.message}</p>
              </div>

              {/* Replies */}
              {(selectedTicket.replies || []).map((r, idx) => (
                <div key={r.id || idx} className="bg-emerald-900/20 border-r-4 border-emerald-500 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-emerald-300 font-bold">💬 رد من {r.by_name} ({r.by_role})</p>
                    <p className="text-xs text-gray-500">{formatDate(r.created_at)}</p>
                  </div>
                  <p className="text-white whitespace-pre-wrap leading-relaxed">{r.message}</p>
                </div>
              ))}

              {/* Reply form */}
              {selectedTicket.status !== 'closed' && (
                <div className="bg-gray-800 rounded-lg p-4 space-y-3" data-testid="reply-form">
                  <label className="block text-sm text-gray-300 font-bold">✍️ كتابة رد:</label>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={4}
                    maxLength={4000}
                    placeholder={t('st_reply_ph', 'اكتب ردك على المستخدم هنا... (سيُرسل إيميل تلقائياً)')}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    data-testid="reply-textarea"
                  />
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={replyCloseAfter}
                        onChange={(e) => setReplyCloseAfter(e.target.checked)}
                        className="accent-emerald-500"
                        data-testid="reply-close-checkbox"
                      />
                      {t('st_close_after_reply', 'إغلاق التذكرة بعد الرد')}
                    </label>
                    <button
                      onClick={submitReply}
                      disabled={replying || !replyMessage.trim()}
                      className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                      data-testid="submit-reply"
                    >
                      {replying ? '⏳ ' + t('st_sending', 'جارٍ الإرسال...') : '📨 ' + t('st_send_reply', 'إرسال الرد')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="bg-gray-900 border-t border-gray-700 px-5 py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{t('st_change_status', 'تغيير الحالة:')}</span>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => changeStatus(selectedTicket.id, e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                  data-testid="change-status-select"
                >
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.ar}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => deleteTicket(selectedTicket.id)}
                className="text-xs text-rose-400 hover:text-rose-300 px-3 py-1 rounded"
                data-testid="delete-ticket-btn"
              >
                🗑️ {t('st_delete', 'حذف التذكرة')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTicketsTab;


// ---------------------------------------------------------------------------
// PaymentDetailsPanel — inline block inside the ticket detail drawer shown
// only for tickets of category='payment_confirmation'. Displays payment meta
// + proof image + "تفعيل الاشتراك" action button.
// ---------------------------------------------------------------------------
const PAYMENT_METHOD_LABEL = {
  vodafone_cash: 'Vodafone Cash',
  instapay: 'InstaPay',
  bank_transfer: 'تحويل بنكي',
};

const DURATION_OPTIONS = [
  { key: '1_month', label: 'شهر واحد' },
  { key: '3_months', label: '3 شهور' },
  { key: '6_months', label: '6 شهور' },
  { key: '9_months', label: '9 شهور' },
  { key: '1_year', label: 'سنة كاملة' },
  { key: 'lifetime', label: 'دائم (Lifetime)' },
];

const PLAN_OPTIONS = [
  { key: 'starter', label: 'مجاني' },
  { key: 'basic', label: 'أساسي' },
  { key: 'pro', label: 'احترافي' },
  { key: 'premium', label: 'متقدم' },
];

const PaymentDetailsPanel = ({ ticket, onActivated }) => {
  const [showActivate, setShowActivate] = useState(false);
  const [plan, setPlan] = useState(ticket.payment_plan || 'pro');
  const [duration, setDuration] = useState('1_month');
  const [activating, setActivating] = useState(false);
  const alreadyActivated = !!ticket.activation_done;

  const activate = async () => {
    setActivating(true);
    try {
      const compoundId = ticket.compound_id;
      if (!compoundId) {
        toast.error('لم نتعرف على المجمع المرتبط — يرجى التحقق يدوياً');
        setActivating(false);
        return;
      }
      await axios.post(
        `${API}/compounds/${compoundId}/subscription/manual-activate`,
        { plan, duration, transaction_ref: ticket.transaction_ref, ticket_id: ticket.id },
        getAuth()
      );
      toast.success('✅ تم تفعيل الاشتراك على المجمع');
      setShowActivate(false);
      onActivated && onActivated();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل التفعيل');
    } finally {
      setActivating(false);
    }
  };

  const proofSrc = ticket.proof_url
    ? (ticket.proof_url.startsWith('http') ? ticket.proof_url : `${BACKEND_URL}${ticket.proof_url}`)
    : null;

  return (
    <div className="bg-emerald-900/20 border-2 border-emerald-600/40 rounded-xl p-4 space-y-3" data-testid="payment-details-panel">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 className="text-sm font-bold text-emerald-300">💰 بيانات الدفع</h4>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
          {PAYMENT_METHOD_LABEL[ticket.payment_method] || ticket.payment_method || '—'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-gray-400">💳 طريقة الدفع: </span><span className="text-white font-semibold">{PAYMENT_METHOD_LABEL[ticket.payment_method] || '—'}</span></div>
        <div><span className="text-gray-400">📋 الخطة: </span><span className="text-white">{ticket.payment_plan || '—'}</span></div>
        <div><span className="text-gray-400">💵 المبلغ: </span><span className="text-white">{ticket.payment_amount || '—'}</span></div>
        <div><span className="text-gray-400">🔖 رقم العملية: </span><span className="text-emerald-300 font-mono font-bold">{ticket.transaction_ref || '—'}</span></div>
        <div><span className="text-gray-400">📅 تاريخ التحويل: </span><span className="text-white">{ticket.transfer_date || '—'}</span></div>
        <div><span className="text-gray-400">👤 المرسل: </span><span className="text-white">{ticket.sender_name || '—'}</span></div>
        {ticket.sender_phone && <div><span className="text-gray-400">📱 هاتف المرسل: </span><span className="text-white" dir="ltr">{ticket.sender_phone}</span></div>}
      </div>

      {proofSrc && (
        <a
          href={proofSrc}
          target="_blank"
          rel="noreferrer"
          className="block rounded-lg overflow-hidden border border-emerald-600/30 hover:border-emerald-400 transition"
          data-testid="payment-proof-link"
        >
          {proofSrc.match(/\.pdf$/i) ? (
            <div className="p-4 bg-gray-800 text-center text-xs text-emerald-300">📄 إيصال PDF — اضغطي للعرض</div>
          ) : (
            <img src={proofSrc} alt="proof" className="w-full max-h-80 object-contain bg-gray-900" />
          )}
        </a>
      )}

      {alreadyActivated ? (
        <div className="bg-emerald-700/30 border border-emerald-500 rounded-lg p-3 text-xs text-emerald-200 flex items-center gap-2">
          <span>✅</span>
          <span>
            تم تفعيل الاشتراك مسبقاً — الخطة: <b>{ticket.activation_plan || '—'}</b> · المدة: <b>{ticket.activation_duration || '—'}</b>
            {ticket.activation_ref && <span className="mx-1">· Ref: <span className="font-mono">{ticket.activation_ref}</span></span>}
          </span>
        </div>
      ) : !showActivate ? (
        <button
          onClick={() => setShowActivate(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-colors"
          data-testid="activate-subscription-btn"
        >
          ⚡ تفعيل الاشتراك على المجمع
        </button>
      ) : (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-300">الخطة</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                data-testid="activate-plan-select"
              >
                {PLAN_OPTIONS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-300">المدة</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                data-testid="activate-duration-select"
              >
                {DURATION_OPTIONS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={activate}
              disabled={activating}
              className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow disabled:opacity-60"
              data-testid="activate-confirm-btn"
            >
              {activating ? '⏳ جاري التفعيل...' : '✅ تأكيد التفعيل'}
            </button>
            <button
              onClick={() => setShowActivate(false)}
              className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg font-bold"
              data-testid="activate-cancel-btn"
            >
              إلغاء
            </button>
          </div>
          <p className="text-[10px] text-gray-500 text-center">
            سيتم حفظ رقم العملية <span className="font-mono text-emerald-400">{ticket.transaction_ref}</span> في سجل الاشتراك كمرجع للتتبع.
          </p>
        </div>
      )}
    </div>
  );
};
