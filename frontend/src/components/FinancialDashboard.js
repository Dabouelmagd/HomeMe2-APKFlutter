import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  ChartBarIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentTextIcon,
  UsersIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const API = process.env.REACT_APP_BACKEND_URL;

const FinancialDashboard = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, expenses, revenue, residents, reports
  const [showAddModal, setShowAddModal] = useState(null); // 'expense' or 'revenue'
  const [newEntry, setNewEntry] = useState({ description: '', amount: '', category: '', date: new Date().toISOString().split('T')[0] });
  const [residents, setResidents] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of month
    end: new Date().toISOString().split('T')[0] // Today
  });

  useEffect(() => {
    fetchFinancialData();
  }, [dateRange]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      const headers = { Authorization: `Bearer ${token}` };

      const [summaryRes, expensesRes, revenueRes] = await Promise.all([
        axios.get(`${API}/api/financial/reports/summary?compound_id=${user.compound_id}&start_date=${dateRange.start}&end_date=${dateRange.end}`, { headers }),
        axios.get(`${API}/api/financial/expenses?compound_id=${user.compound_id}&start_date=${dateRange.start}&end_date=${dateRange.end}`, { headers }),
        axios.get(`${API}/api/financial/revenue?compound_id=${user.compound_id}&start_date=${dateRange.start}&end_date=${dateRange.end}`, { headers })
      ]);

      setSummary(summaryRes.data);
      setExpenses(expensesRes.data.expenses || []);
      setRevenue(revenueRes.data.revenue || []);
    } catch (error) {
      console.error('Error fetching financial data:', error);
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                💰 {t('financial_management', 'Financial Management')}
              </h1>
              <p className="text-gray-600 font-medium">{t('comprehensive_financial_tracking', 'Comprehensive financial tracking and reporting')}</p>
            </div>

            {/* Date Range Selector */}
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('start_date', 'Start Date')}</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('end_date', 'End Date')}</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Total Revenue */}
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-xl text-white transform hover:scale-105 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <ArrowTrendingUpIcon className="w-12 h-12 text-white/90" />
                  <span className="text-3xl">💵</span>
                </div>
                <h3 className="text-white/80 text-sm font-semibold mb-1">{t('total_revenue', 'Total Revenue')}</h3>
                <p className="text-3xl font-black">{formatCurrency(summary.total_revenue)}</p>
              </div>

              {/* Total Expenses */}
              <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-6 shadow-xl text-white transform hover:scale-105 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <ArrowTrendingDownIcon className="w-12 h-12 text-white/90" />
                  <span className="text-3xl">💸</span>
                </div>
                <h3 className="text-white/80 text-sm font-semibold mb-1">{t('total_expenses', 'Total Expenses')}</h3>
                <p className="text-3xl font-black">{formatCurrency(summary.total_expenses)}</p>
              </div>

              {/* Net Profit */}
              <div className={`bg-gradient-to-br ${summary.net_profit >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} rounded-2xl p-6 shadow-xl text-white transform hover:scale-105 transition-all`}>
                <div className="flex items-center justify-between mb-4">
                  <BanknotesIcon className="w-12 h-12 text-white/90" />
                  <span className="text-3xl">{summary.net_profit >= 0 ? '📈' : '📉'}</span>
                </div>
                <h3 className="text-white/80 text-sm font-semibold mb-1">{t('net_profit_loss', 'Net Profit/Loss')}</h3>
                <p className="text-3xl font-black">{formatCurrency(summary.net_profit)}</p>
              </div>

              {/* Profit Margin */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-xl text-white transform hover:scale-105 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <ChartBarIcon className="w-12 h-12 text-white/90" />
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-white/80 text-sm font-semibold mb-1">{t('profit_margin', 'Profit Margin')}</h3>
                <p className="text-3xl font-black">{summary.profit_margin}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border ${activeTab === 'expenses' ? 'border-red-400 ring-2 ring-red-200' : 'border-white/20'} hover:shadow-2xl transform hover:scale-105 transition-all text-${isRTL ? 'right' : 'left'}`}
          >
            <div className="text-4xl mb-3">💸</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{t('manage_expenses', t('fd_manage_expenses', 'إدارة المصروفات'))}</h3>
            <p className="text-sm text-gray-600">{t('track_categorize_expenses', t('fd_track_expenses', 'تتبع وتصنيف المصروفات'))}</p>
          </button>

          <button
            onClick={() => setActiveTab('revenue')}
            className={`bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border ${activeTab === 'revenue' ? 'border-green-400 ring-2 ring-green-200' : 'border-white/20'} hover:shadow-2xl transform hover:scale-105 transition-all text-${isRTL ? 'right' : 'left'}`}
          >
            <div className="text-4xl mb-3">💰</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{t('manage_revenue', t('fd_manage_revenue', 'إدارة الإيرادات'))}</h3>
            <p className="text-sm text-gray-600">{t('track_income_payments', t('fd_track_income', 'تتبع الدخل والمدفوعات'))}</p>
          </button>

          <button
            onClick={() => setActiveTab('residents')}
            className={`bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border ${activeTab === 'residents' ? 'border-blue-400 ring-2 ring-blue-200' : 'border-white/20'} hover:shadow-2xl transform hover:scale-105 transition-all text-${isRTL ? 'right' : 'left'}`}
          >
            <div className="text-4xl mb-3">👥</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{t('resident_accounts', t('fd_resident_accounts', 'حسابات السكان'))}</h3>
            <p className="text-sm text-gray-600">{t('view_balances_payments', t('fd_view_balances', 'عرض الأرصدة والمدفوعات'))}</p>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border ${activeTab === 'reports' ? 'border-purple-400 ring-2 ring-purple-200' : 'border-white/20'} hover:shadow-2xl transform hover:scale-105 transition-all text-${isRTL ? 'right' : 'left'}`}
          >
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{t('financial_reports', t('fd_fin_reports', 'التقارير المالية'))}</h3>
            <p className="text-sm text-gray-600">{t('generate_detailed_reports', t('fd_create_reports', 'إنشاء تقارير مفصلة'))}</p>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'expenses' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                💸 {t('manage_expenses', t('fd_manage_expenses', 'إدارة المصروفات'))}
              </h2>
              <button
                onClick={() => setShowAddModal('expense')}
                className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                {t('add_expense', t('fd_add_expense', 'إضافة مصروف'))}
              </button>
            </div>
            <div className="space-y-3">
              {expenses.length > 0 ? expenses.map((expense) => (
                <div key={expense.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{expense.description}</p>
                      <p className="text-sm text-gray-600">{expense.category} • {new Date(expense.date).toLocaleDateString('ar-EG')}</p>
                    </div>
                    <p className="text-xl font-bold text-red-600">-{formatCurrency(expense.amount)}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-5xl mb-4">📭</div>
                  <p>{t('no_expenses_recorded', t('fd_no_expenses', 'لا توجد مصروفات مسجلة'))}</p>
                  <button
                    onClick={() => setShowAddModal('expense')}
                    className="mt-4 text-red-600 hover:text-red-700 font-medium"
                  >
                    {t('add_first_expense', t('fd_add_first_expense', 'أضف أول مصروف'))}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                💰 {t('manage_revenue', t('fd_manage_revenue', 'إدارة الإيرادات'))}
              </h2>
              <button
                onClick={() => setShowAddModal('revenue')}
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                {t('add_revenue', t('fd_add_revenue', 'إضافة إيراد'))}
              </button>
            </div>
            <div className="space-y-3">
              {revenue.length > 0 ? revenue.map((rev) => (
                <div key={rev.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{rev.description}</p>
                      <p className="text-sm text-gray-600">{rev.source} • {new Date(rev.date).toLocaleDateString('ar-EG')}</p>
                    </div>
                    <p className="text-xl font-bold text-green-600">+{formatCurrency(rev.amount)}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-5xl mb-4">📭</div>
                  <p>{t('no_revenue_recorded', t('fd_no_revenue', 'لا توجد إيرادات مسجلة'))}</p>
                  <button
                    onClick={() => setShowAddModal('revenue')}
                    className="mt-4 text-green-600 hover:text-green-700 font-medium"
                  >
                    {t('add_first_revenue', t('fd_add_first_revenue', 'أضف أول إيراد'))}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'residents' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
              👥 {t('resident_accounts', t('fd_resident_accounts', 'حسابات السكان'))}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-right p-3 font-semibold">{t('resident_name', t('fd_resident_name', 'اسم الساكن'))}</th>
                    <th className="text-right p-3 font-semibold">{t('unit', t('fd_unit', 'الوحدة'))}</th>
                    <th className="text-right p-3 font-semibold">{t('balance', t('fd_balance', 'الرصيد'))}</th>
                    <th className="text-right p-3 font-semibold">{t('status', t('fd_status', 'الحالة'))}</th>
                  </tr>
                </thead>
                <tbody>
                  {residents.length > 0 ? residents.map((resident) => (
                    <tr key={resident.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{resident.full_name}</td>
                      <td className="p-3">{resident.unit_number}</td>
                      <td className={`p-3 font-bold ${resident.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(resident.balance || 0))}
                        {resident.balance < 0 && ' ('+t('fd_due', 'مستحق')+')'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${resident.balance >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {resident.balance >= 0 ? t('paid', t('fd_paid', 'مسدد')) : t('pending', t('fd_pending', 'معلق'))}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="text-center py-12 text-gray-500">
                        <div className="text-5xl mb-4">👥</div>
                        <p>{t('no_residents_found', t('fd_no_residents', 'لا يوجد سكان'))}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
              📊 {t('financial_reports', t('fd_fin_reports', 'التقارير المالية'))}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <h3 className="text-lg font-bold mb-4">{t('monthly_summary', t('fd_month_summary', 'ملخص الشهر'))}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>{t('total_revenue', t('fd_total_revenue', 'إجمالي الإيرادات'))}</span>
                    <span className="font-bold">{formatCurrency(summary?.total_revenue || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('total_expenses', t('fd_total_expenses', 'إجمالي المصروفات'))}</span>
                    <span className="font-bold">{formatCurrency(summary?.total_expenses || 0)}</span>
                  </div>
                  <hr className="border-white/30" />
                  <div className="flex justify-between text-lg">
                    <span>{t('net_profit', t('fd_net_profit', 'صافي الربح'))}</span>
                    <span className="font-bold">{formatCurrency(summary?.net_profit || 0)}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                <h3 className="text-lg font-bold mb-4">{t('quick_stats', t('fd_quick_stats', 'إحصائيات سريعة'))}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>{t('transactions_count', t('fd_transactions', 'عدد المعاملات'))}</span>
                    <span className="font-bold">{(expenses.length || 0) + (revenue.length || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('expense_count', t('fd_expense_count', 'عدد المصروفات'))}</span>
                    <span className="font-bold">{expenses.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('revenue_count', t('fd_revenue_count', 'عدد الإيرادات'))}</span>
                    <span className="font-bold">{revenue.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex gap-4">
              <button className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors">
                {t('download_pdf', t('fd_download_pdf', 'تحميل PDF'))}
              </button>
              <button className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors">
                {t('download_excel', t('fd_download_excel', 'تحميل Excel'))}
              </button>
            </div>
          </div>
        )}

        {/* Recent Transactions (shown on overview) */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Expenses */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className={isRTL ? 'ml-2' : 'mr-2'}>💸</span>
                {t('recent_expenses', t('fd_recent_expenses', 'المصروفات الأخيرة'))}
              </h2>
              <div className="space-y-3">
                {expenses.slice(0, 5).map((expense) => (
                  <div key={expense.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{expense.description}</p>
                        <p className="text-sm text-gray-600">{expense.category} • {new Date(expense.date).toLocaleDateString()}</p>
                      </div>
                      <p className="text-xl font-bold text-red-600">-{formatCurrency(expense.amount)}</p>
                    </div>
                  </div>
                ))}
                {expenses.length === 0 && (
                  <p className="text-center text-gray-500 py-8">{t('no_expenses_recorded', t('fd_no_expenses', 'لا توجد مصروفات مسجلة'))}</p>
                )}
              </div>
            </div>

            {/* Recent Revenue */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className={isRTL ? 'ml-2' : 'mr-2'}>💰</span>
                {t('recent_revenue', t('fd_recent_revenue', 'الإيرادات الأخيرة'))}
              </h2>
              <div className="space-y-3">
                {revenue.slice(0, 5).map((rev) => (
                  <div key={rev.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{rev.description}</p>
                        <p className="text-sm text-gray-600">{rev.source} • {new Date(rev.date).toLocaleDateString()}</p>
                      </div>
                      <p className="text-xl font-bold text-green-600">+{formatCurrency(rev.amount)}</p>
                    </div>
                  </div>
                ))}
                {revenue.length === 0 && (
                  <p className="text-center text-gray-500 py-8">{t('no_revenue_recorded', t('fd_no_revenue', 'لا توجد إيرادات مسجلة'))}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">
                  {showAddModal === 'expense' ? t('add_expense', t('fd_add_expense', 'إضافة مصروف')) : t('add_revenue', t('fd_add_revenue', 'إضافة إيراد'))}
                </h3>
                <button onClick={() => setShowAddModal(null)} className="text-gray-500 hover:text-gray-700">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('description', t('fd_desc', 'الوصف'))}</label>
                  <input
                    type="text"
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({...newEntry, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={showAddModal === 'expense' ? t('expense_description', t('fd_eg_elec', 'مثال: فاتورة كهرباء')) : t('revenue_description', t('fd_eg_maint', 'مثال: رسوم صيانة'))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('amount', t('fd_amount', 'المبلغ'))}</label>
                  <input
                    type="number"
                    value={newEntry.amount}
                    onChange={(e) => setNewEntry({...newEntry, amount: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {showAddModal === 'expense' ? t('category', t('fd_category', 'الفئة')) : t('source', t('fd_source', 'المصدر'))}
                  </label>
                  <select
                    value={newEntry.category}
                    onChange={(e) => setNewEntry({...newEntry, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('select', t('fd_select', 'اختر...'))}</option>
                    {showAddModal === 'expense' ? (
                      <>
                        <option value="utilities">{t('utilities', 'مرافق')}</option>
                        <option value="maintenance">{t('maintenance', 'صيانة')}</option>
                        <option value="salaries">{t('salaries', t('fd_cat_salaries', 'رواتب'))}</option>
                        <option value="supplies">{t('supplies', t('fd_cat_supplies', 'مستلزمات'))}</option>
                        <option value="other">{t('other', 'أخرى')}</option>
                      </>
                    ) : (
                      <>
                        <option value="fees">{t('fees', t('fd_cat_fees', 'رسوم'))}</option>
                        <option value="rentals">{t('rentals', t('fd_cat_rent', 'إيجارات'))}</option>
                        <option value="services">{t('services', t('fd_cat_services', 'خدمات'))}</option>
                        <option value="other">{t('other', 'أخرى')}</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('date', t('fd_date', 'التاريخ'))}</label>
                  <input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {t('cancel', 'إلغاء')}
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 px-4 py-2 rounded-lg text-white ${showAddModal === 'expense' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                  >
                    {t('save', 'حفظ')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialDashboard;