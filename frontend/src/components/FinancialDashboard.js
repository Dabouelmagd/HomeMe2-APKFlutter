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
  UsersIcon
} from '@heroicons/react/24/outline';

const API = process.env.REACT_APP_BACKEND_URL;

const FinancialDashboard = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [revenue, setRevenue] = useState([]);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                💰 Financial Management
              </h1>
              <p className="text-gray-600 font-medium">Comprehensive financial tracking and reporting</p>
            </div>

            {/* Date Range Selector */}
            <div className="flex gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
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
                <h3 className="text-white/80 text-sm font-semibold mb-1">Total Revenue</h3>
                <p className="text-3xl font-black">{formatCurrency(summary.total_revenue)}</p>
              </div>

              {/* Total Expenses */}
              <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-6 shadow-xl text-white transform hover:scale-105 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <ArrowTrendingDownIcon className="w-12 h-12 text-white/90" />
                  <span className="text-3xl">💸</span>
                </div>
                <h3 className="text-white/80 text-sm font-semibold mb-1">Total Expenses</h3>
                <p className="text-3xl font-black">{formatCurrency(summary.total_expenses)}</p>
              </div>

              {/* Net Profit */}
              <div className={`bg-gradient-to-br ${summary.net_profit >= 0 ? 'from-blue-500 to-blue-600' : 'from-orange-500 to-orange-600'} rounded-2xl p-6 shadow-xl text-white transform hover:scale-105 transition-all`}>
                <div className="flex items-center justify-between mb-4">
                  <BanknotesIcon className="w-12 h-12 text-white/90" />
                  <span className="text-3xl">{summary.net_profit >= 0 ? '📈' : '📉'}</span>
                </div>
                <h3 className="text-white/80 text-sm font-semibold mb-1">Net Profit/Loss</h3>
                <p className="text-3xl font-black">{formatCurrency(summary.net_profit)}</p>
              </div>

              {/* Profit Margin */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 shadow-xl text-white transform hover:scale-105 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <ChartBarIcon className="w-12 h-12 text-white/90" />
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="text-white/80 text-sm font-semibold mb-1">Profit Margin</h3>
                <p className="text-3xl font-black">{summary.profit_margin}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <button
            onClick={() => window.location.href = '/app/financial/expenses'}
            className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transform hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">💸</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Manage Expenses</h3>
            <p className="text-sm text-gray-600">Track and categorize expenses</p>
          </button>

          <button
            onClick={() => window.location.href = '/app/financial/revenue'}
            className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transform hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">💰</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Manage Revenue</h3>
            <p className="text-sm text-gray-600">Track income and payments</p>
          </button>

          <button
            onClick={() => window.location.href = '/app/financial/residents'}
            className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transform hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">👥</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Resident Accounts</h3>
            <p className="text-sm text-gray-600">View balances and payments</p>
          </button>

          <button
            onClick={() => window.location.href = '/app/financial/reports'}
            className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/20 hover:shadow-2xl transform hover:scale-105 transition-all text-left"
          >
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Financial Reports</h3>
            <p className="text-sm text-gray-600">Generate detailed reports</p>
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Expenses */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">💸</span>
              Recent Expenses
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
                <p className="text-center text-gray-500 py-8">No expenses recorded</p>
              )}
            </div>
          </div>

          {/* Recent Revenue */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">💰</span>
              Recent Revenue
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
                <p className="text-center text-gray-500 py-8">No revenue recorded</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;