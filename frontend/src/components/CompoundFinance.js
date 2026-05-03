import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BuildingOfficeIcon,
  PlusIcon,
  BellAlertIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  ChartBarIcon,
  HomeIcon,
  CreditCardIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import useTabState from '../hooks/useTabState';
import HowToPayButton from './HowToPayButton';
import PaymentProofsPanel from './PaymentProofsPanel';
import CompoundSwitcher from './CompoundSwitcher';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const CompoundFinance = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useTabState('balance');
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [obligations, setObligations] = useState([]);
  const [unitCharges, setUnitCharges] = useState({ charges: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddObligation, setShowAddObligation] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [submitting, setSubmitting] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    category: 'maintenance', amount: '', description: '', vendor: ''
  });

  const [obligationForm, setObligationForm] = useState({
    title: '', description: '', total_amount: '', category: 'maintenance',
    month: new Date().getMonth() + 1, year: new Date().getFullYear(),
    distribution_method: 'equal'
  });

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [bs, obs, uc] = await Promise.all([
        axios.get(`${API}/financial/balance-sheet?year=${filterYear}`, getToken()),
        axios.get(`${API}/financial/obligations?month=${filterMonth}&year=${filterYear}`, getToken()),
        axios.get(`${API}/financial/unit-charges?month=${filterMonth}&year=${filterYear}`, getToken()),
      ]);
      setBalanceSheet(bs.data);
      setObligations(obs.data.obligations || []);
      setUnitCharges(uc.data);
    } catch (error) {
      console.error('Finance fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.amount || !expenseForm.description) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/financial/expenses`, {
        ...expenseForm,
        amount: parseFloat(expenseForm.amount),
        date: new Date().toISOString(),
        payment_method: 'other',
        compound_id: user.compound_id
      }, getToken());
      toast.success(t('expense_added', 'تم إضافة المصروف بنجاح'));
      setShowAddExpense(false);
      setExpenseForm({ category: 'maintenance', amount: '', description: '', vendor: '' });
      fetchAll();
    } catch (err) {
      toast.error(t('failed_add_expense', 'فشل في إضافة المصروف'));
    } finally { setSubmitting(false); }
  };

  const handleAddObligation = async (e) => {
    e.preventDefault();
    if (!obligationForm.title || !obligationForm.total_amount) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/financial/obligations`, {
        ...obligationForm,
        total_amount: parseFloat(obligationForm.total_amount)
      }, getToken());
      toast.success(res.data.message);
      setShowAddObligation(false);
      setObligationForm({ title: '', description: '', total_amount: '', category: 'maintenance', month: filterMonth, year: filterYear, distribution_method: 'equal' });
      fetchAll();
    } catch (err) {
      toast.error(t('failed_add_obligation', 'فشل في إنشاء الالتزام'));
    } finally { setSubmitting(false); }
  };

  const handleMarkPaid = async (chargeId) => {
    try {
      await axios.put(`${API}/financial/unit-charges/${chargeId}/pay`, {}, getToken());
      toast.success(t('payment_recorded', 'تم تسجيل السداد'));
      fetchAll();
    } catch (err) {
      toast.error(t('failed_record_payment', 'فشل في تسجيل السداد'));
    }
  };

  const handleNotifyUnpaid = async () => {
    try {
      const res = await axios.post(`${API}/financial/unit-charges/notify-unpaid?month=${filterMonth}&year=${filterYear}`, {}, getToken());
      toast.success(res.data.message);
    } catch (err) {
      toast.error(t('failed_notify', 'فشل في إرسال الإشعارات'));
    }
  };

  const catLabels = {
    maintenance: t('maintenance', t('cf_maintenance', 'صيانة')), utilities: t('utilities', t('cf_facilities', 'مرافق')),
    security: t('security', 'حراسة'), cleaning: t('cleaning', 'نظافة'),
    salaries: t('salaries', t('cf_salaries', 'رواتب')), other: t('other', t('cf_other', 'أخرى')),
    maintenance_fees: t('maintenance_fees', 'رسوم صيانة'), late_fees: t('late_fees', 'غرامات تأخير'),
    additional_services: t('additional_services', 'خدمات إضافية'), rentals: t('rentals', t('cf_rent', 'إيجارات')),
  };

  const months = [
    t('january', t('m_jan', 'يناير')), t('february', t('m_feb', 'فبراير')), t('march', t('m_mar', 'مارس')), t('april', t('m_apr', 'أبريل')),
    t('may', t('m_may', 'مايو')), t('june', t('m_jun', 'يونيو')), t('july', t('m_jul', 'يوليو')), t('august', t('m_aug', 'أغسطس')),
    t('september', t('m_sep', 'سبتمبر')), t('october', t('m_oct', 'أكتوبر')), t('november', t('m_nov', 'نوفمبر')), t('december', t('m_dec', 'ديسمبر'))
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  const bs = balanceSheet || {};
  const obl = bs.obligations || {};
  const tabs = [
    { id: 'balance', label: t('balance_sheet', 'الميزانية العمومية'), icon: ChartBarIcon },
    { id: 'comparison', label: t('monthly_comparison', 'المقارنة الشهرية'), icon: ArrowTrendingUpIcon },
    { id: 'obligations', label: t('obligations', t('cf_obligations', 'الالتزامات')), icon: DocumentTextIcon },
    { id: 'units', label: t('unit_payments', 'سداد الوحدات'), icon: HomeIcon },
    { id: 'expenses', label: t('expenses', t('cf_expenses', 'المصروفات')), icon: ArrowTrendingDownIcon },
    { id: 'proofs', label: 'إيصالات الدفع', icon: CreditCardIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="compound-finance">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('financial_management', t('cf_title', 'الإدارة المالية'))}</h1>
            <p className="text-sm text-gray-500">{t('compound_budget_desc', t('cf_subtitle', 'إدارة ميزانية المجمع والالتزامات والمصروفات'))}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  const res = await axios.get(`${API}/financial/export-excel?year=${filterYear}&month=${filterMonth}`, {
                    ...getToken(), responseType: 'blob'
                  });
                  const url = window.URL.createObjectURL(new Blob([res.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `financial_report_${filterYear}.xlsx`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  toast.success(t('excel_exported', 'تم تصدير ملف Excel بنجاح'));
                } catch (err) {
                  toast.error(t('failed_export_excel', 'فشل في تصدير Excel'));
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              data-testid="export-excel-btn"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {t('export_excel', 'تصدير Excel')}
            </button>
            <select value={filterMonth} onChange={e => setFilterMonth(+e.target.value)} className="border rounded-lg px-3 py-2 text-sm" data-testid="filter-month">
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(+e.target.value)} className="border rounded-lg px-3 py-2 text-sm" data-testid="filter-year">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Compound switcher (chips) */}
        <CompoundSwitcher onChange={() => fetchAll()} className="mb-4" />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" data-testid="finance-summary">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-100"><ArrowTrendingUpIcon className="h-5 w-5 text-green-600" /></div>
              <span className="text-sm text-gray-500">{t('total_revenue', t('cf_total_revenue', 'إجمالي الإيرادات'))}</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{(bs.total_revenue || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-red-100"><ArrowTrendingDownIcon className="h-5 w-5 text-red-600" /></div>
              <span className="text-sm text-gray-500">{t('total_expenses', t('cf_total_expenses', 'إجمالي المصروفات'))}</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{(bs.total_expenses || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-100"><BanknotesIcon className="h-5 w-5 text-blue-600" /></div>
              <span className="text-sm text-gray-500">{t('net_balance', 'صافي الرصيد')}</span>
            </div>
            <p className={`text-2xl font-bold ${(bs.net_balance || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {(bs.net_balance || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-amber-100"><CreditCardIcon className="h-5 w-5 text-amber-600" /></div>
              <span className="text-sm text-gray-500">{t('collection_rate', t('cf_collection_rate', 'نسبة التحصيل'))}</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{obl.collection_rate || 0}%</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto" data-testid="finance-tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                data-testid={`tab-${tab.id}`}>
                <Icon className="h-4 w-4" />{tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Balance Sheet */}
          {activeTab === 'balance' && (
            <div className="p-6 space-y-6">
              <h3 className="text-lg font-bold text-gray-900">{t('balance_sheet', 'الميزانية العمومية')} - {filterYear}</h3>
              
              {/* Monthly Bar Chart */}
              {Object.keys(bs.monthly_breakdown || {}).length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">{t('monthly_chart', t('cf_monthly_chart', 'الرسم البياني الشهري'))}</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={Object.entries(bs.monthly_breakdown || {}).map(([month, val]) => ({
                      name: month.slice(5),
                      [t('expenses', t('cf_expenses', 'المصروفات'))]: val.expenses || 0,
                      [t('revenue', t('cf_revenues', 'الإيرادات'))]: val.revenue || 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Legend />
                      <Bar dataKey={t('expenses', t('cf_expenses', 'المصروفات'))} fill="#ef4444" radius={[6, 6, 0, 0]} />
                      <Bar dataKey={t('revenue', t('cf_revenues', 'الإيرادات'))} fill="#22c55e" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Expenses Pie Chart + List */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">{t('expenses_by_category', 'المصروفات حسب التصنيف')}</h4>
                  {Object.keys(bs.expenses_by_category || {}).length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={Object.entries(bs.expenses_by_category || {}).map(([cat, amt]) => ({
                              name: catLabels[cat] || cat, value: Number(amt)
                            }))}
                            cx="50%" cy="50%" outerRadius={75} innerRadius={40}
                            dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {Object.keys(bs.expenses_by_category || {}).map((_, i) => (
                              <Cell key={i} fill={['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#6366f1'][i % 6]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-2">
                        {Object.entries(bs.expenses_by_category || {}).map(([cat, amt]) => (
                          <div key={cat} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">{catLabels[cat] || cat}</span>
                            <span className="text-sm font-bold text-red-600">{Number(amt).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <p className="text-gray-400 text-sm text-center py-4">{t('no_expenses', 'لا توجد مصروفات')}</p>}
                </div>

                {/* Revenue by Source */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">{t('revenue_by_source', t('cf_rev_by_source', 'الإيرادات حسب المصدر'))}</h4>
                  {Object.keys(bs.revenue_by_source || {}).length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={Object.entries(bs.revenue_by_source || {}).map(([src, amt]) => ({
                              name: catLabels[src] || src, value: Number(amt)
                            }))}
                            cx="50%" cy="50%" outerRadius={75} innerRadius={40}
                            dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {Object.keys(bs.revenue_by_source || {}).map((_, i) => (
                              <Cell key={i} fill={['#22c55e', '#14b8a6', '#0ea5e9', '#8b5cf6', '#f59e0b'][i % 5]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-2">
                        {Object.entries(bs.revenue_by_source || {}).map(([src, amt]) => (
                          <div key={src} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="text-sm font-medium text-gray-700">{catLabels[src] || src}</span>
                            <span className="text-sm font-bold text-green-600">{Number(amt).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : <p className="text-gray-400 text-sm text-center py-4">{t('no_revenue', 'لا توجد إيرادات')}</p>}
                </div>
              </div>

              {/* Collection Rate Gauge + Obligations Summary */}
              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-700 mb-3">{t('obligations_summary', 'ملخص الالتزامات')}</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-xl text-center">
                    <p className="text-xl font-bold text-blue-700">{(obl.total_charged || 0).toLocaleString()}</p>
                    <p className="text-xs text-blue-600">{t('total_charged', t('cf_total_required', 'إجمالي المطلوب'))}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl text-center">
                    <p className="text-xl font-bold text-green-700">{(obl.total_collected || 0).toLocaleString()}</p>
                    <p className="text-xs text-green-600">{t('total_collected', t('cf_total_collected', 'إجمالي المحصّل'))}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl text-center">
                    <p className="text-xl font-bold text-red-700">{(obl.total_outstanding || 0).toLocaleString()}</p>
                    <p className="text-xs text-red-600">{t('outstanding', 'المتبقي')}</p>
                  </div>
                  <div className="p-4 rounded-xl text-center relative overflow-hidden" style={{ background: `conic-gradient(#22c55e ${(obl.collection_rate || 0) * 3.6}deg, #fee2e2 0deg)` }}>
                    <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                      <p className="text-lg font-bold text-gray-800">{obl.collection_rate || 0}%</p>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{t('collection_rate', t('cf_collection_rate', 'نسبة التحصيل'))}</p>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Monthly Comparison */}
          {activeTab === 'comparison' && (
            <div className="p-6 space-y-6">
              <h3 className="text-lg font-bold text-gray-900">{t('monthly_comparison', 'المقارنة الشهرية')} - {filterYear}</h3>
              
              {/* Monthly Collection Rate Chart */}
              {(() => {
                const monthlyData = Object.entries(bs.monthly_breakdown || {}).map(([month, val]) => {
                  const charged = val.expenses || 0;
                  const collected = val.revenue || 0;
                  const rate = charged > 0 ? Math.round((collected / charged) * 100) : 0;
                  return {
                    name: months[parseInt(month.slice(5)) - 1] || month.slice(5),
                    [t('collection_rate', t('cf_collection_rate', 'نسبة التحصيل'))]: rate,
                    [t('expenses', t('cf_expenses', 'المصروفات'))]: charged,
                    [t('revenue', t('cf_revenues', 'الإيرادات'))]: collected,
                    rate
                  };
                });
                
                const lowMonths = monthlyData.filter(d => d.rate > 0 && d.rate < 70);
                
                return (
                  <>
                    {/* Alert for low collection */}
                    {lowMonths.length > 0 && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3" data-testid="low-collection-alert">
                        <XCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-red-700">{t('collection_alert', 'تنبيه: انخفاض معدل التحصيل!')}</p>
                          <p className="text-sm text-red-600 mt-1">
                            {lowMonths.map(m => `${m.name} (${m.rate}%)`).join(' | ')}
                          </p>
                          <p className="text-xs text-red-500 mt-1">{t('collection_alert_note', 'معدل التحصيل أقل من 70% في الأشهر المذكورة')}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Collection Rate Line/Bar Chart */}
                    {monthlyData.length > 0 ? (
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3">{t('collection_rate_by_month', 'معدل التحصيل شهرياً')}</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Legend />
                            <Bar dataKey={t('collection_rate', t('cf_collection_rate', 'نسبة التحصيل'))} radius={[6, 6, 0, 0]}>
                              {monthlyData.map((entry, i) => (
                                <Cell key={i} fill={entry.rate >= 70 ? '#22c55e' : entry.rate >= 50 ? '#f59e0b' : '#ef4444'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="flex gap-4 justify-center mt-2 text-xs">
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> 70%+ {t('good', 'جيد')}</span>
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> 50-70% {t('warning', 'تحذير')}</span>
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> &lt;50% {t('critical', 'حرج')}</span>
                        </div>
                      </div>
                    ) : <p className="text-gray-400 text-center py-8">{t('no_monthly_data', 'لا توجد بيانات شهرية للمقارنة')}</p>}
                    
                    {/* Monthly Revenue vs Expenses comparison */}
                    {monthlyData.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3">{t('revenue_vs_expenses', t('cf_rev_vs_exp', 'الإيرادات مقابل المصروفات'))}</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Legend />
                            <Bar dataKey={t('expenses', t('cf_expenses', 'المصروفات'))} fill="#ef4444" radius={[6, 6, 0, 0]} />
                            <Bar dataKey={t('revenue', t('cf_revenues', 'الإيرادات'))} fill="#22c55e" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    
                    {/* Monthly breakdown table */}
                    {monthlyData.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3">{t('monthly_details', 'تفاصيل شهرية')}</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="p-3 text-right font-medium">{t('month', t('cf_month', 'الشهر'))}</th>
                                <th className="p-3 text-right font-medium">{t('expenses', t('cf_expenses', 'المصروفات'))}</th>
                                <th className="p-3 text-right font-medium">{t('revenue', t('cf_revenues', 'الإيرادات'))}</th>
                                <th className="p-3 text-right font-medium">{t('collection_rate', t('cf_collection_rate', 'نسبة التحصيل'))}</th>
                                <th className="p-3 text-right font-medium">{t('status', t('cf_status', 'الحالة'))}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {monthlyData.map((m, i) => (
                                <tr key={i} className="border-t border-gray-100">
                                  <td className="p-3 font-medium">{m.name}</td>
                                  <td className="p-3 text-red-600 font-medium">{m[t('expenses', t('cf_expenses', 'المصروفات'))]?.toLocaleString()}</td>
                                  <td className="p-3 text-green-600 font-medium">{m[t('revenue', t('cf_revenues', 'الإيرادات'))]?.toLocaleString()}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                      m.rate >= 70 ? 'bg-green-100 text-green-700' : m.rate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                    }`}>{m.rate}%</span>
                                  </td>
                                  <td className="p-3">
                                    {m.rate >= 70 ? (
                                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                    ) : (
                                      <XCircleIcon className="h-5 w-5 text-red-500" />
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Obligations */}
          {activeTab === 'obligations' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h3 className="text-lg font-bold text-gray-900">{t('obligations', t('cf_obligations', 'الالتزامات'))} - {months[filterMonth - 1]} {filterYear}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <HowToPayButton />
                  <button onClick={() => setShowAddObligation(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" data-testid="add-obligation-btn">
                    <PlusIcon className="h-4 w-4" />{t('add_obligation', t('cf_add_obl', 'إضافة التزام'))}
                  </button>
                </div>
              </div>
              {obligations.length > 0 ? (
                <div className="space-y-3">
                  {obligations.map(ob => (
                    <div key={ob.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <p className="font-semibold text-gray-900">{ob.title}</p>
                        <p className="text-sm text-gray-500">{ob.description} | {catLabels[ob.category] || ob.category}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{ob.distribution_label || t('equal_distribution', 'بالتساوي')}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">{ob.total_amount?.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{ob.per_unit_amount?.toLocaleString()} / {t('unit', 'وحدة')} ({ob.unit_count})</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center text-gray-500 py-8">{t('no_obligations', 'لا توجد التزامات لهذا الشهر')}</p>}
            </div>
          )}

          {/* Unit Payments */}
          {activeTab === 'units' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h3 className="text-lg font-bold text-gray-900">{t('unit_payments', 'سداد الوحدات')} - {months[filterMonth - 1]} {filterYear}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <HowToPayButton />
                  <button onClick={handleNotifyUnpaid} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm" data-testid="notify-unpaid-btn">
                    <BellAlertIcon className="h-4 w-4" />{t('notify_unpaid', 'تنبيه المتأخرين')}
                  </button>
                </div>
              </div>
              
              {/* Summary bar */}
              <div className="flex gap-4 mb-4">
                <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium">{t('paid', 'سدد')}: {unitCharges.summary?.paid || 0}</span>
                <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium">{t('unpaid', 'لم يسدد')}: {unitCharges.summary?.unpaid || 0}</span>
                <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">{t('total', 'المجموع')}: {(unitCharges.summary?.total_amount || 0).toLocaleString()}</span>
              </div>

              {unitCharges.charges?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-3 text-right font-medium text-gray-600">{t('unit', t('cf_unit', 'الوحدة'))}</th>
                        <th className="p-3 text-right font-medium text-gray-600">{t('resident', 'المقيم')}</th>
                        <th className="p-3 text-right font-medium text-gray-600">{t('obligation', t('cf_obligation', 'الالتزام'))}</th>
                        <th className="p-3 text-right font-medium text-gray-600">{t('amount', t('cf_amount', 'المبلغ'))}</th>
                        <th className="p-3 text-right font-medium text-gray-600">{t('status', t('cf_status', 'الحالة'))}</th>
                        <th className="p-3 text-right font-medium text-gray-600">{t('paid_date', 'تاريخ السداد')}</th>
                        <th className="p-3 text-right font-medium text-gray-600">{t('actions', t('cf_actions', 'الإجراءات'))}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unitCharges.charges.map(charge => (
                        <tr key={charge.id} className={`border-t ${charge.status === 'paid' ? 'bg-green-50' : 'bg-red-50'}`} data-testid={`charge-${charge.id}`}>
                          <td className="p-3 font-medium text-gray-900">{charge.unit_number}</td>
                          <td className="p-3 text-gray-700">{charge.resident_name}</td>
                          <td className="p-3 text-gray-600">{charge.title}</td>
                          <td className="p-3 font-bold">{charge.amount?.toLocaleString()}</td>
                          <td className="p-3">
                            {charge.status === 'paid' ? (
                              <span className="flex items-center gap-1 text-green-700 font-bold">
                                <CheckCircleIcon className="h-5 w-5" /> {t('paid', 'سدد')}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-700 font-bold">
                                <XCircleIcon className="h-5 w-5" /> {t('not_paid', 'لم يسدد')}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-gray-500">{charge.paid_at ? new Date(charge.paid_at).toLocaleDateString('ar-EG') : '-'}</td>
                          <td className="p-3">
                            {charge.status !== 'paid' && (
                              <button onClick={() => handleMarkPaid(charge.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700" data-testid={`pay-${charge.id}`}>
                                {t('mark_paid', 'تسجيل سداد')}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-center text-gray-500 py-8">{t('no_charges', 'لا توجد التزامات لهذا الشهر')}</p>}
            </div>
          )}

          {/* Expenses */}
          {activeTab === 'expenses' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">{t('expenses', t('cf_expenses', 'المصروفات'))}</h3>
                <button onClick={() => setShowAddExpense(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm" data-testid="add-expense-btn">
                  <PlusIcon className="h-4 w-4" />{t('add_expense', t('cf_add_expense', 'إضافة مصروف'))}
                </button>
              </div>
              {(bs.recent_expenses || []).length > 0 ? (
                <div className="space-y-2">
                  {(bs.recent_expenses || []).map((exp, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-900">{exp.description}</p>
                        <p className="text-xs text-gray-500">{catLabels[exp.category] || exp.category} | {exp.date?.slice(0, 10)}</p>
                      </div>
                      <p className="font-bold text-red-600">{Number(exp.amount).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-center text-gray-500 py-8">{t('no_expenses', 'لا توجد مصروفات')}</p>}
            </div>
          )}

          {/* Payment Proofs */}
          {activeTab === 'proofs' && <PaymentProofsPanel />}
        </div>

        {/* Add Expense Modal */}
        {showAddExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddExpense(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">{t('add_expense', t('cf_add_expense', 'إضافة مصروف'))}</h3>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('category', t('cf_category', 'التصنيف'))}</label>
                  <select value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))} className="w-full border rounded-lg p-2.5">
                    <option value="maintenance">{t('maintenance', t('cf_maintenance', 'صيانة'))}</option>
                    <option value="utilities">{t('utilities', t('cf_facilities', 'مرافق'))}</option>
                    <option value="security">{t('security', 'حراسة')}</option>
                    <option value="cleaning">{t('cleaning', 'نظافة')}</option>
                    <option value="salaries">{t('salaries', t('cf_salaries', 'رواتب'))}</option>
                    <option value="other">{t('other', t('cf_other', 'أخرى'))}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('amount', t('cf_amount', 'المبلغ'))}</label>
                  <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} className="w-full border rounded-lg p-2.5" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('description', t('cf_desc', 'الوصف'))}</label>
                  <input type="text" value={expenseForm.description} onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))} className="w-full border rounded-lg p-2.5" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('vendor', 'المورد')}</label>
                  <input type="text" value={expenseForm.vendor} onChange={e => setExpenseForm(p => ({ ...p, vendor: e.target.value }))} className="w-full border rounded-lg p-2.5" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50">{submitting ? '...' : t('save', t('cf_save', 'حفظ'))}</button>
                  <button type="button" onClick={() => setShowAddExpense(false)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium">{t('cancel', t('cf_cancel', 'إلغاء'))}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Obligation Modal */}
        {showAddObligation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddObligation(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">{t('add_obligation', t('cf_add_obligation', 'إضافة التزام جديد'))}</h3>
              <form onSubmit={handleAddObligation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('title', t('cf_label', 'العنوان'))}</label>
                  <input type="text" value={obligationForm.title} onChange={e => setObligationForm(p => ({ ...p, title: e.target.value }))} className="w-full border rounded-lg p-2.5" placeholder={t('obligation_title_placeholder', 'مثال: رسوم صيانة شهر أبريل')} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('total_amount', t('cf_total_amount', 'المبلغ الإجمالي'))}</label>
                  <input type="number" value={obligationForm.total_amount} onChange={e => setObligationForm(p => ({ ...p, total_amount: e.target.value }))} className="w-full border rounded-lg p-2.5" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('description', t('cf_desc', 'الوصف'))}</label>
                  <input type="text" value={obligationForm.description} onChange={e => setObligationForm(p => ({ ...p, description: e.target.value }))} className="w-full border rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('category', t('cf_category', 'التصنيف'))}</label>
                  <select value={obligationForm.category} onChange={e => setObligationForm(p => ({ ...p, category: e.target.value }))} className="w-full border rounded-lg p-2.5">
                    <option value="maintenance">{t('maintenance', t('cf_maintenance', 'صيانة'))}</option>
                    <option value="utilities">{t('utilities', t('cf_facilities', 'مرافق'))}</option>
                    <option value="security">{t('security', 'حراسة')}</option>
                    <option value="cleaning">{t('cleaning', 'نظافة')}</option>
                    <option value="other">{t('other', t('cf_other', 'أخرى'))}</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('month', t('cf_month', 'الشهر'))}</label>
                    <select value={obligationForm.month} onChange={e => setObligationForm(p => ({ ...p, month: +e.target.value }))} className="w-full border rounded-lg p-2.5">
                      {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('year', t('cf_year', 'السنة'))}</label>
                    <select value={obligationForm.year} onChange={e => setObligationForm(p => ({ ...p, year: +e.target.value }))} className="w-full border rounded-lg p-2.5">
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('distribution_method', 'طريقة التوزيع')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'equal', label: t('equal_distribution', 'بالتساوي'), icon: '⚖️' },
                      { id: 'per_sqm', label: t('per_sqm', 'حسب المساحة'), icon: '📐' },
                      { id: 'percentage', label: t('percentage', 'نسبة مئوية'), icon: '📊' },
                      { id: 'custom', label: t('custom_amount', 'مبلغ مخصص'), icon: '✏️' },
                    ].map(opt => (
                      <button type="button" key={opt.id}
                        onClick={() => setObligationForm(p => ({ ...p, distribution_method: opt.id }))}
                        className={`p-2.5 rounded-lg border-2 text-sm font-medium text-center transition-all ${
                          obligationForm.distribution_method === opt.id 
                            ? 'border-blue-500 bg-blue-50 text-blue-700' 
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                        data-testid={`dist-${opt.id}`}
                      >
                        <span className="block text-lg mb-0.5">{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 bg-blue-50 p-2 rounded-lg">
                  {obligationForm.distribution_method === 'equal' && t('distribute_equal_note', 'سيتم توزيع المبلغ بالتساوي على جميع الوحدات')}
                  {obligationForm.distribution_method === 'per_sqm' && t('distribute_sqm_note', 'سيتم توزيع المبلغ حسب مساحة كل وحدة (متر مربع)')}
                  {obligationForm.distribution_method === 'percentage' && t('distribute_pct_note', 'سيتم توزيع المبلغ بنسب مئوية محددة لكل وحدة')}
                  {obligationForm.distribution_method === 'custom' && t('distribute_custom_note', 'سيتم تحديد مبلغ مخصص لكل وحدة')}
                </p>
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50">{submitting ? '...' : t('create_and_distribute', t('cf_create_dist', 'إنشاء وتوزيع'))}</button>
                  <button type="button" onClick={() => setShowAddObligation(false)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium">{t('cancel', t('cf_cancel', 'إلغاء'))}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompoundFinance;
