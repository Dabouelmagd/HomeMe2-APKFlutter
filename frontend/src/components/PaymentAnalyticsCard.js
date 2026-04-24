import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BanknotesIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  ClockIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const METHOD_META = {
  vodafone_cash: { label: 'Vodafone Cash', icon: DevicePhoneMobileIcon, color: 'from-red-500 to-pink-600' },
  instapay:      { label: 'InstaPay',      icon: QrCodeIcon,           color: 'from-purple-500 to-indigo-600' },
  bank_transfer: { label: 'تحويل بنكي',    icon: BanknotesIcon,        color: 'from-emerald-500 to-teal-600' },
  unknown:       { label: 'غير محدد',      icon: CreditCardIcon,       color: 'from-gray-400 to-gray-600' },
};

/**
 * PaymentAnalyticsCard
 *   Scoped stats card showing payment-confirmation metrics.
 *
 * Props:
 *   scope?: 'auto' | 'global' | 'company' | 'compound'  (default 'auto')
 *   title?: string                                      (header text)
 *   className?: string
 *
 * Role scoping is enforced server-side:
 *   - app_owner / super_admin: see all tickets
 *   - company_admin: only their company's compounds
 *   - admin / compound_admin: only their compound
 */
const PaymentAnalyticsCard = ({ scope = 'auto', title = '📊 إحصائيات المدفوعات', className = '' }) => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/payment-analytics`, {
        params: { days, scope },
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [days, scope]);

  const totals = data?.totals || {};
  const methods = data?.methods || [];
  const series = data?.series || [];

  // Maximum for series bar-chart scaling
  const maxCount = series.reduce((m, s) => Math.max(m, s.count || 0), 1);

  return (
    <div className={`rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden ${className}`} data-testid="payment-analytics-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
        </div>
        <div className="flex items-center gap-1 text-xs">
          {[7, 30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                days === d
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-gray-600'
              }`}
              data-testid={`pa-range-${d}`}
            >
              {d === 7 ? 'أسبوع' : d === 30 ? 'شهر' : d === 90 ? '3 شهور' : 'سنة'}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {loading && (
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-700/50 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && data && (
          <>
            {/* Top KPI tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPI
                label="إيصالات الدفع"
                value={totals.tickets || 0}
                suffix="إيصال"
                icon={BanknotesIcon}
                accent="from-blue-500 to-indigo-600"
                testid="pa-kpi-tickets"
              />
              <KPI
                label="تم التفعيل"
                value={totals.activated || 0}
                extra={`${totals.activation_rate || 0}%`}
                icon={CheckBadgeIcon}
                accent="from-emerald-500 to-teal-600"
                testid="pa-kpi-activated"
              />
              <KPI
                label="في الانتظار"
                value={totals.pending || 0}
                icon={ClockIcon}
                accent="from-amber-500 to-orange-600"
                testid="pa-kpi-pending"
              />
              <KPI
                label="إجمالي المحصّل"
                value={Math.round(totals.activated_amount || 0).toLocaleString('ar-EG')}
                suffix="ج.م"
                icon={ArrowTrendingUpIcon}
                accent="from-rose-500 to-pink-600"
                testid="pa-kpi-amount"
              />
            </div>

            {/* Method breakdown */}
            <div className="mt-5">
              <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1">
                <SparklesIcon className="w-4 h-4" />
                أكثر طرق الدفع استخداماً
              </h4>
              {methods.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center">لا توجد بيانات لهذه الفترة</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {methods.slice(0, 3).map((m) => {
                    const meta = METHOD_META[m.method] || METHOD_META.unknown;
                    const Icon = meta.icon;
                    const rate = totals.tickets > 0 ? Math.round((m.count / totals.tickets) * 100) : 0;
                    return (
                      <div
                        key={m.method}
                        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 flex items-center gap-3"
                        data-testid={`pa-method-${m.method}`}
                      >
                        <div className={`p-2 rounded-lg text-white bg-gradient-to-br ${meta.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-gray-900 dark:text-white truncate">{meta.label}</div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            {m.count} إيصال · {Math.round(m.amount || 0).toLocaleString('ar-EG')} ج.م
                          </div>
                          <div className="mt-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${meta.color}`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{rate}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Daily bar chart */}
            {series.length > 0 && (
              <div className="mt-5">
                <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">
                  الإيصالات اليومية
                </h4>
                <div className="h-24 flex items-end gap-0.5 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2 overflow-x-auto">
                  {series.map((s) => {
                    const h = Math.max(4, (s.count / maxCount) * 100);
                    return (
                      <div
                        key={s.day}
                        className="flex-1 min-w-[8px] rounded-t bg-gradient-to-t from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 transition"
                        style={{ height: `${h}%` }}
                        title={`${s.day}: ${s.count} إيصال · ${Math.round(s.amount || 0).toLocaleString('ar-EG')} ج.م`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const KPI = ({ label, value, suffix, extra, icon: Icon, accent, testid }) => (
  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 flex items-start gap-3 relative overflow-hidden" data-testid={testid}>
    <div className={`p-2 rounded-lg text-white bg-gradient-to-br ${accent}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 truncate">{label}</p>
      <div className="flex items-baseline gap-1 flex-wrap">
        <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">{value}</span>
        {suffix && <span className="text-[10px] text-gray-500 dark:text-gray-400">{suffix}</span>}
      </div>
      {extra && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{extra}</span>}
    </div>
  </div>
);

export default PaymentAnalyticsCard;
