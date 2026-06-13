import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ReceiptPercentIcon,
  WrenchScrewdriverIcon,
  MegaphoneIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Resident summary tiles — surfaces the 3 questions every resident asks:
 *   1. Do I owe anything?     → next-due invoice
 *   2. My last service order  → latest maintenance ticket status
 *   3. What's new?            → 3 latest compound announcements
 *
 * Built as a single component so we can drop it into the top of
 * ResidentDashboard without restructuring the existing layout.
 */
const ResidentSummaryWidget = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [data, setData] = useState({ invoice: null, maintenance: null, announcements: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const cfg = { headers: { Authorization: `Bearer ${token}` } };
        // Fan out the 3 endpoints in parallel — slowest wins on TTI.
        const [inv, maint, ann] = await Promise.all([
          axios.get(`${API}/invoices`, cfg).catch(() => ({ data: [] })),
          axios.get(`${API}/maintenance/requests`, cfg).catch(() => ({ data: { requests: [] } })),
          axios.get(`${API}/announcements`, cfg).catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const invList = Array.isArray(inv.data) ? inv.data : inv.data?.invoices || [];
        // Pick the closest-due unpaid invoice
        const unpaid = invList
          .filter((i) => i.status === 'unpaid' || i.status === 'pending')
          .sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0));
        const maintList = maint.data?.requests || maint.data?.maintenance || [];
        const latest = maintList.sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        )[0] || null;
        const annList = (Array.isArray(ann.data) ? ann.data : ann.data?.announcements || [])
          .slice(0, 3);
        setData({
          invoice: unpaid[0] || null,
          maintenance: latest,
          announcements: annList,
        });
      } catch {
        if (!cancelled) setData({ invoice: null, maintenance: null, announcements: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fmt = (n) => Number(n || 0).toLocaleString('ar-EG');
  const fmtDate = (d) => {
    try {
      return new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return ''; }
  };
  const arrow = isRTL ? '←' : '→';

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-pulse" data-testid="resident-summary-loading">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl" />)}
      </div>
    );
  }

  const { invoice, maintenance, announcements } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6" data-testid="resident-summary-widget">

      {/* Next due invoice */}
      <Link
        to="/app/finance"
        className="group bg-gradient-to-br from-rose-50 to-pink-100 rounded-2xl p-4 border border-rose-200 hover:shadow-md hover:-translate-y-0.5 transition-all"
        data-testid="resident-next-invoice"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow">
            <ReceiptPercentIcon className="h-5 w-5" />
          </div>
          <ArrowRightIcon className={`h-4 w-4 text-rose-400 opacity-0 group-hover:opacity-100 transition ${isRTL ? 'rotate-180' : ''}`} />
        </div>
        <div className="text-[11px] text-rose-700 font-bold uppercase mb-0.5">
          {t('next_invoice', 'فاتورتي القادمة')}
        </div>
        {invoice ? (
          <>
            <div className="text-2xl font-black text-gray-900">
              {fmt(invoice.amount || invoice.total || 0)} <span className="text-sm font-normal text-gray-500">ج.م</span>
            </div>
            <div className="text-xs text-gray-600 mt-0.5 truncate" title={invoice.description}>
              {invoice.description || invoice.title || t('monthly_fee', 'رسوم شهرية')}
            </div>
            <div className="text-[11px] text-rose-700 mt-1.5 font-bold">
              {t('due_on', 'تستحق')}: {invoice.due_date ? fmtDate(invoice.due_date) : '—'}
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <CheckCircleIcon className="h-8 w-8 mx-auto text-emerald-500" />
            <div className="text-xs text-emerald-700 font-bold mt-1">
              {t('no_pending_invoices', 'لا توجد فواتير مستحقة 🎉')}
            </div>
          </div>
        )}
      </Link>

      {/* Latest maintenance request */}
      <Link
        to="/app/maintenance"
        className="group bg-gradient-to-br from-amber-50 to-orange-100 rounded-2xl p-4 border border-amber-200 hover:shadow-md hover:-translate-y-0.5 transition-all"
        data-testid="resident-last-maintenance"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow">
            <WrenchScrewdriverIcon className="h-5 w-5" />
          </div>
          <ArrowRightIcon className={`h-4 w-4 text-amber-500 opacity-0 group-hover:opacity-100 transition ${isRTL ? 'rotate-180' : ''}`} />
        </div>
        <div className="text-[11px] text-amber-800 font-bold uppercase mb-0.5">
          {t('last_maintenance', 'آخر طلب صيانة')}
        </div>
        {maintenance ? (
          <>
            <div className="text-sm font-bold text-gray-900 truncate" title={maintenance.title}>
              {maintenance.title || maintenance.description || t('maintenance_request', 'طلب صيانة')}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                maintenance.status === 'resolved' || maintenance.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                maintenance.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {maintenance.status === 'resolved' || maintenance.status === 'completed' ? '✓ ' + t('resolved', 'تم الحل') :
                 maintenance.status === 'in_progress' ? t('in_progress', 'قيد التنفيذ') :
                 t('pending', 'في الانتظار')}
              </span>
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              {maintenance.created_at ? fmtDate(maintenance.created_at) : ''}
            </div>
          </>
        ) : (
          <div className="text-center py-2">
            <div className="text-xs text-gray-500">{t('no_maintenance_yet', 'لا توجد طلبات بعد')}</div>
            <div className="text-[11px] text-amber-700 mt-1 font-bold">{t('start_one', 'افتحي طلباً جديداً')} {arrow}</div>
          </div>
        )}
      </Link>

      {/* Recent announcements */}
      <Link
        to="/app/announcements"
        className="group bg-gradient-to-br from-violet-50 to-fuchsia-100 rounded-2xl p-4 border border-violet-200 hover:shadow-md hover:-translate-y-0.5 transition-all"
        data-testid="resident-announcements"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex p-2 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow">
            <MegaphoneIcon className="h-5 w-5" />
          </div>
          <ArrowRightIcon className={`h-4 w-4 text-violet-400 opacity-0 group-hover:opacity-100 transition ${isRTL ? 'rotate-180' : ''}`} />
        </div>
        <div className="text-[11px] text-violet-800 font-bold uppercase mb-1">
          {t('compound_announcements', 'إعلانات المجمع')}
        </div>
        {announcements.length > 0 ? (
          <ul className="space-y-1.5">
            {announcements.map((a, i) => (
              <li key={a.id || i} className="text-xs text-gray-700 truncate" title={a.title}>
                <span className="text-violet-600 font-bold">·</span> {a.title || a.content?.substring(0, 40) || '—'}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-gray-500 text-center py-2">
            {t('no_announcements', 'لا توجد إعلانات حديثة')}
          </div>
        )}
      </Link>
    </div>
  );
};

export default ResidentSummaryWidget;
