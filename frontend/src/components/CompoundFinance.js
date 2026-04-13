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
  CreditCardIcon
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const CompoundFinance = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('balance');
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
    month: new Date().getMonth() + 1, year: new Date().getFullYear()
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
        total_amount: parseFloat(obligationForm.total_amount),
        distribute_equally: true
      }, getToken());
      toast.success(res.data.message);
      setShowAddObligation(false);
      setObligationForm({ title: '', description: '', total_amount: '', category: 'maintenance', month: filterMonth, year: filterYear });
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
    maintenance: t('maintenance', 'صيانة'), utilities: t('utilities', 'مرافق'),
    security: t('security', 'حراسة'), cleaning: t('cleaning', 'نظافة'),
    salaries: t('salaries', 'رواتب'), other: t('other', 'أخرى'),
    maintenance_fees: t('maintenance_fees', 'رسوم صيانة'), late_fees: t('late_fees', 'غرامات تأخير'),
    additional_services: t('additional_services', 'خدمات إضافية'), rentals: t('rentals', 'إيجارات'),
  };

  const months = [
    t('january', 'يناير'), t('february', 'فبراير'), t('march', 'مارس'), t('april', 'أبريل'),
    t('may', 'مايو'), t('june', 'يونيو'), t('july', 'يوليو'), t('august', 'أغسطس'),
    t('september', 'سبتمبر'), t('october', 'أكتوبر'), t('november', 'نوفمبر'), t('december', 'ديسمبر')
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  const bs = balanceSheet || {};
  const obl = bs.obligations || {};
  const tabs = [
    { id: 'balance', label: t('balance_sheet', 'الميزانية العمومية'), icon: ChartBarIcon },
    { id: 'obligations', label: t('obligations', 'الالتزامات'), icon: DocumentTextIcon },
    { id: 'units', label: t('unit_payments', 'سداد الوحدات'), icon: HomeIcon },
    { id: 'expenses', label: t('expenses', 'المصروفات'), icon: ArrowTrendingDownIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="compound-finance">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('financial_management', 'الإدارة المالية')}</h1>
            <p className="text-sm text-gray-500">{t('compound_budget_desc', 'إدارة ميزانية المجمع والالتزامات والمصروفات')}</p>
          </div>
          <div className="flex gap-2">
            <select value={filterMonth} onChange={e => setFilterMonth(+e.target.value)} className="border rounded-lg px-3 py-2 text-sm" data-testid="filter-month">
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(+e.target.value)} className="border rounded-lg px-3 py-2 text-sm" data-testid="filter-year">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" data-testid="finance-summary">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-green-100"><ArrowTrendingUpIcon className="h-5 w-5 text-green-600" /></div>
              <span className="text-sm text-gray-500">{t('total_revenue', 'إجمالي الإيرادات')}</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{(bs.total_revenue || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-red-100"><ArrowTrendingDownIcon className="h-5 w-5 text-red-600" /></div>
              <span className="text-sm text-gray-500">{t('total_expenses', 'إجمالي المصروفات')}</span>
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
              <span className="text-sm text-gray-500">{t('collection_rate', 'نسبة التحصيل')}</span>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Expenses by Category */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">{t('expenses_by_category', 'المصروفات حسب التصنيف')}</h4>
                  {Object.keys(bs.expenses_by_category || {}).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(bs.expenses_by_category || {}).map(([cat, amt]) => (
                        <div key={cat} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">{catLabels[cat] || cat}</span>
                          <span className="text-sm font-bold text-red-600">{Number(amt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400 text-sm text-center py-4">{t('no_expenses', 'لا توجد مصروفات')}</p>}
                </div>

                {/* Revenue by Source */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">{t('revenue_by_source', 'الإيرادات حسب المصدر')}</h4>
                  {Object.keys(bs.revenue_by_source || {}).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(bs.revenue_by_source || {}).map(([src, amt]) => (
                        <div key={src} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">{catLabels[src] || src}</span>
                          <span className="text-sm font-bold text-green-600">{Number(amt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400 text-sm text-center py-4">{t('no_revenue', 'لا توجد إيرادات')}</p>}
                </div>
              </div>

              {/* Obligations Summary */}
              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-700 mb-3">{t('obligations_summary', 'ملخص الالتزامات')}</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-xl text-center">
                    <p className="text-xl font-bold text-blue-700">{(obl.total_charged || 0).toLocaleString()}</p>
                    <p className="text-xs text-blue-600">{t('total_charged', 'إجمالي المطلوب')}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl text-center">
                    <p className="text-xl font-bold text-green-700">{(obl.total_collected || 0).toLocaleString()}</p>
                    <p className="text-xs text-green-600">{t('total_collected', 'إجمالي المحصّل')}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl text-center">
                    <p className="text-xl font-bold text-red-700">{(obl.total_outstanding || 0).toLocaleString()}</p>
                    <p className="text-xs text-red-600">{t('outstanding', 'المتبقي')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Obligations */}
          {activeTab === 'obligations' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">{t('obligations', 'الالتزامات')} - {months[filterMonth - 1]} {filterYear}</h3>
                <button onClick={() => setShowAddObligation(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm" data-testid="add-obligation-btn">
                  <PlusIcon className="h-4 w-4" />{t('add_obligation', 'إضافة التزام')}
                </button>
              </div>
              {obligations.length > 0 ? (
                <div className="space-y-3">
                  {obligations.map(ob => (
                    <div key={ob.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                      <div>
                        <p className="font-semibold text-gray-900">{ob.title}</p>
                        <p className="text-sm text-gray-500">{ob.description} | {catLabels[ob.category] || ob.category}</p>
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">{t('unit_payments', 'سداد الوحدات')} - {months[filterMonth - 1]} {filterYear}</h3>
                <button onClick={handleNotifyUnpaid} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm" data-testid="notify-unpaid-btn">
                  <BellAlertIcon className="h-4 w-4" />{t('notify_unpaid', 'تنبيه المتأخرين')}
                </button>
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
                        <th className="p-3 text-right font-medium text-gray-600">{t('unit', 'الوحدة')}</th>
                        <th className="p-3 text-right font-medium text-gray-600">{t('resident', 'المقيم')}</th>
                        <th className="p-3 text-right font-medium text-gray-600">{t('obligation', 'الالتزام')}</th>
                        <th className="p-3 text-right font-medium text-gray-600">{t('amount', 'المبلغ')}</th>
                        <th className="p-3 text-right font-medium text-gray-600">{t('status', 'الحالة')}</th>
                        <th className="p-3 text-right font-medium text-gray-600">{t('paid_date', 'تاريخ السداد')}</th>
                        <th className="p-3 text-right font-medium text-gray-600">{t('actions', 'الإجراءات')}</th>
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
                <h3 className="text-lg font-bold text-gray-900">{t('expenses', 'المصروفات')}</h3>
                <button onClick={() => setShowAddExpense(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm" data-testid="add-expense-btn">
                  <PlusIcon className="h-4 w-4" />{t('add_expense', 'إضافة مصروف')}
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
        </div>

        {/* Add Expense Modal */}
        {showAddExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddExpense(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">{t('add_expense', 'إضافة مصروف')}</h3>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('category', 'التصنيف')}</label>
                  <select value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))} className="w-full border rounded-lg p-2.5">
                    <option value="maintenance">{t('maintenance', 'صيانة')}</option>
                    <option value="utilities">{t('utilities', 'مرافق')}</option>
                    <option value="security">{t('security', 'حراسة')}</option>
                    <option value="cleaning">{t('cleaning', 'نظافة')}</option>
                    <option value="salaries">{t('salaries', 'رواتب')}</option>
                    <option value="other">{t('other', 'أخرى')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('amount', 'المبلغ')}</label>
                  <input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} className="w-full border rounded-lg p-2.5" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('description', 'الوصف')}</label>
                  <input type="text" value={expenseForm.description} onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))} className="w-full border rounded-lg p-2.5" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('vendor', 'المورد')}</label>
                  <input type="text" value={expenseForm.vendor} onChange={e => setExpenseForm(p => ({ ...p, vendor: e.target.value }))} className="w-full border rounded-lg p-2.5" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50">{submitting ? '...' : t('save', 'حفظ')}</button>
                  <button type="button" onClick={() => setShowAddExpense(false)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium">{t('cancel', 'إلغاء')}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Obligation Modal */}
        {showAddObligation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowAddObligation(false)}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">{t('add_obligation', 'إضافة التزام جديد')}</h3>
              <form onSubmit={handleAddObligation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('title', 'العنوان')}</label>
                  <input type="text" value={obligationForm.title} onChange={e => setObligationForm(p => ({ ...p, title: e.target.value }))} className="w-full border rounded-lg p-2.5" placeholder={t('obligation_title_placeholder', 'مثال: رسوم صيانة شهر أبريل')} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('total_amount', 'المبلغ الإجمالي')}</label>
                  <input type="number" value={obligationForm.total_amount} onChange={e => setObligationForm(p => ({ ...p, total_amount: e.target.value }))} className="w-full border rounded-lg p-2.5" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('description', 'الوصف')}</label>
                  <input type="text" value={obligationForm.description} onChange={e => setObligationForm(p => ({ ...p, description: e.target.value }))} className="w-full border rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('category', 'التصنيف')}</label>
                  <select value={obligationForm.category} onChange={e => setObligationForm(p => ({ ...p, category: e.target.value }))} className="w-full border rounded-lg p-2.5">
                    <option value="maintenance">{t('maintenance', 'صيانة')}</option>
                    <option value="utilities">{t('utilities', 'مرافق')}</option>
                    <option value="security">{t('security', 'حراسة')}</option>
                    <option value="cleaning">{t('cleaning', 'نظافة')}</option>
                    <option value="other">{t('other', 'أخرى')}</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('month', 'الشهر')}</label>
                    <select value={obligationForm.month} onChange={e => setObligationForm(p => ({ ...p, month: +e.target.value }))} className="w-full border rounded-lg p-2.5">
                      {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('year', 'السنة')}</label>
                    <select value={obligationForm.year} onChange={e => setObligationForm(p => ({ ...p, year: +e.target.value }))} className="w-full border rounded-lg p-2.5">
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-500 bg-blue-50 p-2 rounded-lg">{t('distribute_note', 'سيتم توزيع المبلغ بالتساوي على جميع الوحدات')}</p>
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50">{submitting ? '...' : t('create_and_distribute', 'إنشاء وتوزيع')}</button>
                  <button type="button" onClick={() => setShowAddObligation(false)} className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-medium">{t('cancel', 'إلغاء')}</button>
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
