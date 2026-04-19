import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/**
 * AdvertiserAdsTab — موافقة/رفض إعلانات المعلنين الخارجيين + إحصاءات الإيرادات
 */
const AdvertiserAdsTab = ({ t }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending_approval');
  const [refreshKey, setRefreshKey] = useState(0);
  const [rejectFor, setRejectFor] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const q = filter === 'all' ? '' : `?status=${filter}`;
    axios.get(`${API}/super-admin/advertiser-ads${q}`, getToken())
      .then(res => { if (alive) setData(res.data); })
      .catch(err => { if (alive) toast.error(err.response?.data?.detail || t('aa_load_failed','فشل التحميل')); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [filter, refreshKey, t]);

  const approve = async (ad) => {
    try {
      await axios.post(`${API}/super-admin/advertiser-ads/${ad.id}/approve`, {}, getToken());
      toast.success(t('aa_approved','تمت الموافقة ونشر الإعلان'));
      setRefreshKey(k => k + 1);
    } catch (err) { toast.error(err.response?.data?.detail || t('aa_approve_failed','فشل')); }
  };

  const reject = async () => {
    if (!rejectFor) return;
    try {
      await axios.post(`${API}/super-admin/advertiser-ads/${rejectFor.id}/reject`, { reason: rejectReason }, getToken());
      toast.success(t('aa_rejected','تم الرفض'));
      setRejectFor(null); setRejectReason('');
      setRefreshKey(k => k + 1);
    } catch (err) { toast.error(err.response?.data?.detail || t('aa_reject_failed','فشل')); }
  };

  const statusTab = [
    { v: 'pending_approval', l: t('aa_pending','قيد المراجعة'), color: 'amber' },
    { v: 'approved', l: t('aa_approved_st','نشطة'), color: 'emerald' },
    { v: 'rejected', l: t('aa_rejected_st','مرفوضة'), color: 'red' },
    { v: 'all', l: t('aa_all','الكل'), color: 'gray' },
  ];

  const ads = data?.ads || [];
  const summary = data?.summary || {};

  return (
    <div className="space-y-5" data-testid="advertiser-ads-tab">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label={t('aa_total','الإجمالي')} value={summary.total || 0} icon="📢" color="blue" />
        <Stat label={t('aa_pending','قيد المراجعة')} value={summary.pending || 0} icon="⏳" color="amber" />
        <Stat label={t('aa_approved_st','نشطة')} value={summary.approved || 0} icon="✅" color="emerald" />
        <Stat label={t('aa_revenue','الإيرادات')} value={`${(summary.total_revenue || 0).toFixed(0)} EGP`} icon="💰" color="green" />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {statusTab.map(s => (
          <button key={s.v} onClick={() => setFilter(s.v)}
            className={`px-3 py-1.5 text-xs rounded-full border font-semibold ${filter === s.v ? `bg-${s.color}-600 border-${s.color}-400 text-white` : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
            data-testid={`aa-filter-${s.v}`}>{s.l}</button>
        ))}
        <button onClick={() => setRefreshKey(k => k + 1)} className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-full">↻</button>
      </div>

      {loading ? <div className="text-center text-gray-400 py-8">{t('aa_loading','جاري التحميل...')}</div>
        : ads.length === 0 ? <div className="text-center text-gray-500 py-10">{t('aa_empty','لا توجد إعلانات')}</div>
        : (
          <div className="space-y-3">
            {ads.map(ad => (
              <div key={ad.id} className="bg-gray-800/60 rounded-xl border border-gray-700 p-4 flex flex-col md:flex-row gap-4" data-testid={`aa-row-${ad.id}`}>
                {ad.image_url && <img src={ad.image_url} alt="" className="w-24 h-24 rounded-lg object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-white truncate">{ad.title}</div>
                      <div className="text-[11px] text-gray-400">{ad.advertiser_name} {ad.advertiser_company ? `• ${ad.advertiser_company}` : ''}</div>
                    </div>
                    <StatusPill status={ad.status} t={t} />
                  </div>
                  {ad.body && <p className="text-xs text-gray-300 mt-1 line-clamp-2">{ad.body}</p>}
                  <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                    <span className="bg-gray-900 text-gray-300 px-2 py-0.5 rounded">⏱ {ad.duration_days} {t('aa_days','يوم')}</span>
                    <span className="bg-green-900/40 text-green-300 px-2 py-0.5 rounded">💰 {ad.amount_due} {ad.currency}</span>
                    <span className={`px-2 py-0.5 rounded ${ad.payment_status === 'paid' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 text-red-300'}`}>
                      {ad.payment_status === 'paid' ? '✅ مدفوع' : '❌ غير مدفوع'}
                    </span>
                    {ad.impressions > 0 && <span className="bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded">👁 {ad.impressions}</span>}
                    {ad.clicks > 0 && <span className="bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded">🖱 {ad.clicks}</span>}
                  </div>
                  {ad.rejection_reason && (
                    <div className="mt-2 text-[11px] text-red-300 bg-red-900/20 px-2 py-1 rounded">⛔ {ad.rejection_reason}</div>
                  )}
                </div>
                <div className="flex md:flex-col gap-2 items-center justify-center">
                  {ad.status === 'pending_approval' && (
                    <>
                      <button onClick={() => approve(ad)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold" data-testid={`aa-approve-${ad.id}`}>✅ {t('aa_approve','موافقة')}</button>
                      <button onClick={() => { setRejectFor(ad); setRejectReason(''); }} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold" data-testid={`aa-reject-${ad.id}`}>⛔ {t('aa_reject','رفض')}</button>
                    </>
                  )}
                  {ad.link_url && (
                    <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-600/30 text-blue-300 rounded-lg text-xs">🔗 {t('aa_preview','معاينة')}</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Reject modal */}
      {rejectFor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setRejectFor(null)}>
          <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 border border-red-500/30" onClick={e => e.stopPropagation()} data-testid="aa-reject-modal">
            <h3 className="text-lg font-bold text-white">⛔ {t('aa_reject_title','رفض الإعلان')}</h3>
            <p className="text-xs text-gray-400">{rejectFor.title}</p>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('aa_reject_reason','سبب الرفض (اختياري)')}</label>
              <textarea rows="3" value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="aa-reject-reason" />
            </div>
            <div className="flex gap-2">
              <button onClick={reject} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold" data-testid="aa-reject-confirm">⛔ {t('aa_reject','رفض')}</button>
              <button onClick={() => setRejectFor(null)} className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm">{t('aa_cancel','إلغاء')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value, icon, color }) => (
  <div className={`bg-gradient-to-br from-${color}-600/25 to-${color}-800/10 border border-${color}-600/40 rounded-xl p-4 text-center`}>
    <div className="text-2xl mb-1">{icon}</div>
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-xs text-gray-400">{label}</div>
  </div>
);

const StatusPill = ({ status, t }) => {
  const map = {
    pending_approval: { c: 'amber', l: t('aa_pending','قيد المراجعة') },
    approved: { c: 'emerald', l: t('aa_approved_st','نشط') },
    rejected: { c: 'red', l: t('aa_rejected_st','مرفوض') },
    awaiting_payment: { c: 'gray', l: t('aa_awaiting_pay','ينتظر الدفع') },
    expired: { c: 'gray', l: t('aa_expired','منتهي') },
    draft: { c: 'gray', l: t('aa_draft','مسودة') },
  };
  const s = map[status] || { c: 'gray', l: status };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full bg-${s.c}-900/40 text-${s.c}-300 border border-${s.c}-700/40`}>{s.l}</span>;
};

export default AdvertiserAdsTab;
