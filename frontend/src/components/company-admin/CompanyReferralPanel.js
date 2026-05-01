import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import StatCard from '../shared/StatCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/**
 * CompanyReferralPanel — viral-loop dashboard for management companies.
 *   - Shows my referral link + copy button
 *   - Stats: total signups, successful referrals, pending credit days, applied
 *   - "Apply credit" button (extends subscription by 30 days per credit)
 *   - History of referred companies + credit ledger
 */
const CompanyReferralPanel = ({ refreshKey = 0, onRefresh }) => {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState({ referrals: [], credit_history: [] });
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        axios.get(`${API}/company-admin/referral/my-link`, auth()),
        axios.get(`${API}/company-admin/referral/history`, auth()),
      ]);
      setData(r1.data);
      setHistory(r2.data);
    } catch (err) {
      const st = err?.response?.status;
      if (st && st >= 500) toast.error('فشل تحميل بيانات الإحالة');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const copyLink = () => {
    if (!data?.link) return;
    navigator.clipboard.writeText(data.link).then(() => toast.success('✓ تم نسخ الرابط'));
  };

  const shareViaWhatsApp = () => {
    if (!data?.share_message) return;
    const url = `https://wa.me/?text=${encodeURIComponent(data.share_message)}`;
    window.open(url, '_blank', 'noopener');
  };

  const applyCredit = async () => {
    if (!window.confirm(`سيتم خصم ${data.reward_days_per_referral} يوم من رصيدك وإضافتها إلى اشتراكك. هل تريد المتابعة؟`)) return;
    setApplying(true);
    try {
      const res = await axios.post(`${API}/company-admin/referral/apply-credit`, {}, auth());
      toast.success(`🎉 تمت إضافة ${res.data.applied_days} يوم إلى اشتراكك!`);
      await load();
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل التطبيق');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 shadow-sm" data-testid="referral-panel-loading">
        <div className="h-32 animate-pulse bg-gray-100 rounded-xl"></div>
      </div>
    );
  }
  if (!data) return null;

  const canApply = (data.pending_credit_days || 0) >= (data.reward_days_per_referral || 30);

  return (
    <div className="space-y-4" dir="rtl" data-testid="company-referral-panel">
      {/* Header & description */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">🚀 ادعُ شركة، اربح شهر مجاني</h2>
          <p className="text-xs text-gray-500">
            كل شركة تشترك عبر رابطك = <strong className="text-emerald-600">{data.reward_days_per_referral} يوم</strong> مجاني على اشتراكك
          </p>
        </div>
        {history.referrals.length > 0 && (
          <button
            onClick={() => setShowHistory((s) => !s)}
            data-testid="ref-history-toggle"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            {showHistory ? 'إخفاء السجل ↑' : `عرض السجل (${history.referrals.length}) ↓`}
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon="📨"
          label="تسجيلات"
          value={data.total_signups || 0}
          color="indigo"
          variant="light"
          testId="ref-kpi-signups"
        />
        <StatCard
          icon="✅"
          label="إحالات ناجحة"
          value={data.successful_referrals || 0}
          color="emerald"
          variant="light"
          hint="بعد الترقية لخطة مدفوعة"
          testId="ref-kpi-successful"
        />
        <StatCard
          icon="🎁"
          label="رصيد متاح"
          value={`${data.pending_credit_days || 0} يوم`}
          color="amber"
          variant="light"
          hint={canApply ? '✓ جاهز للتطبيق' : 'استمر في الدعوة!'}
          testId="ref-kpi-pending"
        />
        <StatCard
          icon="💎"
          label="مُطبَّق"
          value={`${data.applied_credit_days || 0} يوم`}
          color="purple"
          variant="light"
          hint="مضاف لاشتراكك"
          testId="ref-kpi-applied"
        />
      </div>

      {/* Share row */}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-700">🔗 رابطك الخاص:</span>
          <code
            className="flex-1 min-w-0 text-[11px] bg-white border border-indigo-200 rounded-lg px-3 py-2 text-indigo-700 truncate font-mono"
            data-testid="ref-link"
            dir="ltr"
          >
            {data.link}
          </code>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={copyLink}
            data-testid="ref-copy-btn"
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg font-bold flex items-center gap-1"
          >
            📋 نسخ الرابط
          </button>
          <button
            onClick={shareViaWhatsApp}
            data-testid="ref-whatsapp-btn"
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg font-bold flex items-center gap-1"
          >
            💬 واتساب
          </button>
          {canApply && (
            <button
              onClick={applyCredit}
              disabled={applying}
              data-testid="ref-apply-btn"
              className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs rounded-lg font-bold flex items-center gap-1 shadow-lg shadow-amber-500/30 disabled:opacity-50"
            >
              {applying ? '⏳ جارٍ...' : `🎁 طبّق ${data.reward_days_per_referral} يوم على اشتراكي`}
            </button>
          )}
        </div>
        <div className="text-[11px] text-gray-500">
          💡 الرصيد يُضاف تلقائياً عند ترقية الشركة المدعوة لخطة مدفوعة. الكود: <code className="bg-white px-1.5 py-0.5 rounded text-indigo-700 font-mono">{data.code}</code>
        </div>
      </div>

      {/* History list */}
      {showHistory && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4" data-testid="ref-history-list">
          <h3 className="text-sm font-bold text-gray-800 mb-3">🏢 الشركات المدعوة</h3>
          {history.referrals.length === 0 ? (
            <div className="text-xs text-gray-400 italic py-4 text-center">لا توجد دعوات ناجحة بعد</div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {history.referrals.map((r) => (
                <div key={r.company_id} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg p-3" data-testid={`ref-row-${r.company_id}`}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-gray-900 truncate">{r.company_name}</div>
                    <div className="text-[10px] text-gray-500">
                      {r.joined_at ? new Date(r.joined_at).toLocaleString('ar-EG') : '—'} •
                      الخطة: <strong>{r.plan}</strong>
                    </div>
                  </div>
                  {r.reward_earned ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold border border-emerald-200">
                      ✓ ربحت 30 يوم
                    </span>
                  ) : (
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full border border-gray-200">
                      بانتظار الترقية
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {history.credit_history.length > 0 && (
            <details className="mt-3">
              <summary className="text-[11px] text-gray-500 cursor-pointer font-bold">📜 سجل الأحداث ({history.credit_history.length})</summary>
              <div className="mt-2 space-y-1 max-h-[200px] overflow-y-auto">
                {history.credit_history.slice().reverse().map((e, i) => (
                  <div key={i} className="text-[10px] bg-gray-50 rounded px-2 py-1 text-gray-600 flex justify-between">
                    <span>
                      {e.event === 'signup' && '📨 تسجيل'}
                      {e.event === 'credit_earned' && `🎁 ربحت ${e.days} يوم`}
                      {e.event === 'credit_applied' && `💎 طُبّق ${e.days} يوم`}
                      {e.by_company_name && ` — ${e.by_company_name}`}
                    </span>
                    <span className="text-gray-400">{e.at ? new Date(e.at).toLocaleDateString('ar-EG') : ''}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyReferralPanel;
