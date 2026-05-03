import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const tokenHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const STATUS_CONFIG = {
  pending: { label: 'بانتظار المراجعة', color: 'bg-amber-100 text-amber-800', icon: ClockIcon },
  approved: { label: 'تم الاعتماد', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircleIcon },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-800', icon: XCircleIcon }
};

const METHOD_LABELS = {
  vodafone_cash: 'فودافون كاش', orange_cash: 'أورانج كاش', etisalat_cash: 'اتصالات كاش',
  we_pay: 'WE Pay', instapay: 'إنستاباي', bank_transfer: 'تحويل بنكي',
  cash: 'نقداً', fawry: 'فوري', valu: 'ڤاليو', meeza: 'ميزة', other: 'أخرى'
};

const PaymentProofsPanel = () => {
  const [proofs, setProofs] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedProof, setSelectedProof] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectFor, setShowRejectFor] = useState(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter === 'all' ? '' : `?status=${filter}`;
      const res = await axios.get(`${API}/payment-proofs${params}`, tokenHeader());
      setProofs(res.data.proofs || []);
      setSummary(res.data.summary || {});
    } catch (err) {
      toast.error('فشل في تحميل الإيصالات');
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    if (!window.confirm('اعتماد هذا الإيصال وتسجيل السداد؟')) return;
    setActing(true);
    try {
      await axios.post(`${API}/payment-proofs/${id}/approve`, {}, tokenHeader());
      toast.success('تم اعتماد الإيصال وتسجيل السداد');
      setSelectedProof(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل الاعتماد');
    } finally { setActing(false); }
  };

  const reject = async (id) => {
    if (!rejectReason.trim()) { toast.error('السبب مطلوب'); return; }
    setActing(true);
    try {
      await axios.post(`${API}/payment-proofs/${id}/reject`, { reason: rejectReason.trim() }, tokenHeader());
      toast.success('تم رفض الإيصال');
      setShowRejectFor(null);
      setRejectReason('');
      setSelectedProof(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'فشل الرفض');
    } finally { setActing(false); }
  };

  const fmtDate = (iso) => {
    try { return new Date(iso).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch { return iso || '-'; }
  };

  const imgSrc = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${BACKEND_URL}${url}`;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">إيصالات الدفع — المراجعة والاعتماد</h3>
          <p className="text-sm text-gray-500 mt-1">راجع إيصالات السكان ثم اعتمد أو ارفض السداد بضغطة زر.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Pill active={filter==='pending'} onClick={() => setFilter('pending')} count={summary.pending} color="amber">بانتظار المراجعة</Pill>
          <Pill active={filter==='approved'} onClick={() => setFilter('approved')} count={summary.approved} color="emerald">معتمدة</Pill>
          <Pill active={filter==='rejected'} onClick={() => setFilter('rejected')} count={summary.rejected} color="red">مرفوضة</Pill>
          <Pill active={filter==='all'} onClick={() => setFilter('all')} color="slate">الكل</Pill>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-12">جارٍ التحميل…</p>
      ) : proofs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <PhotoIcon className="w-14 h-14 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600 font-semibold">لا توجد إيصالات في هذه الفئة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {proofs.map(p => {
            const st = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
            const StatusIcon = st.icon;
            return (
              <div key={p.id} data-testid={`proof-card-${p.id}`} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex">
                  <div className="w-32 h-32 bg-gray-100 flex-shrink-0 cursor-pointer overflow-hidden" onClick={() => setSelectedProof(p)}>
                    {p.image_url && p.image_url.toLowerCase().endsWith('.pdf') ? (
                      <div className="flex items-center justify-center h-full text-gray-500 text-xs">PDF</div>
                    ) : (
                      <img src={imgSrc(p.image_url)} alt="إيصال" className="w-full h-full object-cover hover:opacity-80 transition" />
                    )}
                  </div>
                  <div className="flex-1 p-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{p.resident_name || '—'}</p>
                        <p className="text-xs text-gray-500">وحدة {p.unit_number || '—'}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${st.color}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {st.label}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      <p className="font-bold text-emerald-700">{Number(p.amount || 0).toLocaleString()} ج.م</p>
                      <p className="text-xs text-gray-600">{METHOD_LABELS[p.method_type] || p.method_type}</p>
                      {p.charge_title && <p className="text-xs text-gray-500 truncate">{p.charge_title}</p>}
                      {p.transaction_reference && (
                        <p className="text-xs font-mono text-gray-500 truncate">#{p.transaction_reference}</p>
                      )}
                      <p className="text-xs text-gray-400">{fmtDate(p.created_at)}</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-100 p-2 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedProof(p)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold flex items-center gap-1"
                    data-testid={`view-proof-${p.id}`}
                  >
                    <EyeIcon className="w-4 h-4" /> عرض
                  </button>
                  {p.status === 'pending' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => approve(p.id)}
                        disabled={acting}
                        data-testid={`approve-proof-${p.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
                      >
                        ✓ اعتماد
                      </button>
                      <button
                        onClick={() => setShowRejectFor(p.id)}
                        disabled={acting}
                        data-testid={`reject-proof-${p.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
                      >
                        ✕ رفض
                      </button>
                    </div>
                  )}
                  {p.status === 'rejected' && p.rejection_reason && (
                    <p className="text-xs text-red-700 truncate flex-1 text-left">السبب: {p.rejection_reason}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject reason modal */}
      {showRejectFor && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setShowRejectFor(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()} dir="rtl">
            <h4 className="font-bold text-lg mb-2">سبب رفض الإيصال</h4>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows="3"
              data-testid="reject-reason-input"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="مثلاً: المبلغ مخالف للالتزام"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => { setShowRejectFor(null); setRejectReason(''); }} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">إلغاء</button>
              <button onClick={() => reject(showRejectFor)} disabled={acting} data-testid="confirm-reject-btn" className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50">
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image viewer modal */}
      {selectedProof && (
        <div className="fixed inset-0 bg-black/80 z-[55] flex items-center justify-center p-4" onClick={() => setSelectedProof(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h4 className="font-bold">إيصال — {selectedProof.resident_name}</h4>
              <button onClick={() => setSelectedProof(null)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {selectedProof.image_url && selectedProof.image_url.toLowerCase().endsWith('.pdf') ? (
                <a href={imgSrc(selectedProof.image_url)} target="_blank" rel="noreferrer" className="block bg-gray-100 rounded p-12 text-center text-blue-600 underline">
                  فتح ملف الـ PDF في تبويب جديد
                </a>
              ) : (
                <img src={imgSrc(selectedProof.image_url)} alt="إيصال" className="w-full rounded-lg max-h-[60vh] object-contain bg-gray-100" />
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Cell k="المبلغ المسدد" v={`${Number(selectedProof.amount || 0).toLocaleString()} ج.م`} />
                <Cell k="طريقة الدفع" v={METHOD_LABELS[selectedProof.method_type] || selectedProof.method_type} />
                <Cell k="المرجع" v={selectedProof.transaction_reference || '—'} />
                <Cell k="الوحدة" v={selectedProof.unit_number || '—'} />
                {selectedProof.charge_title && <Cell k="الالتزام" v={selectedProof.charge_title} full />}
                {selectedProof.notes && <Cell k="ملاحظات" v={selectedProof.notes} full />}
                <Cell k="تاريخ الرفع" v={fmtDate(selectedProof.created_at)} />
                {selectedProof.reviewed_at && <Cell k="تاريخ المراجعة" v={fmtDate(selectedProof.reviewed_at)} />}
                {selectedProof.rejection_reason && <Cell k="سبب الرفض" v={selectedProof.rejection_reason} full red />}
              </div>
              {selectedProof.status === 'pending' && (
                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button onClick={() => setShowRejectFor(selectedProof.id)} disabled={acting} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold">
                    ✕ رفض
                  </button>
                  <button onClick={() => approve(selectedProof.id)} disabled={acting} className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                    ✓ اعتماد وتسجيل السداد
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Pill = ({ active, onClick, count, color, children }) => {
  const colorMap = {
    amber: active ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    emerald: active ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    red: active ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100',
    slate: active ? 'bg-slate-700 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100',
  };
  return (
    <button onClick={onClick} className={`text-sm font-semibold px-3 py-1.5 rounded-full transition ${colorMap[color]}`}>
      {children}{count != null && <span className="mr-2 opacity-80">({count})</span>}
    </button>
  );
};

const Cell = ({ k, v, full, red }) => (
  <div className={`${full ? 'col-span-2' : ''} ${red ? 'bg-red-50 border border-red-100' : 'bg-gray-50'} rounded-lg p-2`}>
    <p className="text-xs text-gray-500 mb-0.5">{k}</p>
    <p className={`font-semibold ${red ? 'text-red-700' : 'text-gray-800'}`}>{v}</p>
  </div>
);

export default PaymentProofsPanel;
