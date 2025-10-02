import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import CurrencySelector from './CurrencySelector';
import { convertCurrency, formatCurrency } from '../utils/currencyUtils';
import {
  CurrencyDollarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FinancialManagement = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get(`${API}/invoices/my`);
      setInvoices(response.data);
    } catch (error) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (invoiceId) => {
    setProcessingPayment(invoiceId);
    try {
      const response = await axios.post(`${API}/payments`, {
        invoice_id: invoiceId,
        payment_method: 'mock'
      });

      toast.success(`Payment successful! Transaction ID: ${response.data.transaction_id}`);
      
      // Update invoice status locally
      setInvoices(prev => 
        prev.map(invoice => 
          invoice.id === invoiceId 
            ? { ...invoice, status: 'paid' }
            : invoice
        )
      );
    } catch (error) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessingPayment(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'overdue':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const pendingInvoices = invoices.filter(invoice => invoice.status === 'pending');
  const paidInvoices = invoices.filter(invoice => invoice.status === 'paid');
  const overdueInvoices = invoices.filter(invoice => invoice.status === 'overdue');
  const totalPending = pendingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const [selectedCurrency, setSelectedCurrency] = useState('USD');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      {/* Enhanced Header Section */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-6 lg:mb-0">
              <div className="flex items-center space-x-3 mb-2">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{t('financial_management')}</h1>
                  <p className="text-gray-600 mt-1">
                    {t('view_manage_payments_invoices')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Currency Selector */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600">{t('currency_display')}</p>
                <CurrencySelector 
                  selectedCurrency={selectedCurrency}
                  onCurrencyChange={setSelectedCurrency}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Pending Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{t('pending')}</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingInvoices.length}</p>
              <div className="flex items-center mt-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                <p className="text-xs text-gray-500">{t('awaiting_payment')}</p>
              </div>
            </div>
            <div className="bg-yellow-100 p-4 rounded-2xl">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Paid Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{t('paid')}</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{paidInvoices.length}</p>
              <div className="flex items-center mt-2">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                <p className="text-xs text-gray-500">{t('completed_payments')}</p>
              </div>
            </div>
            <div className="bg-green-100 p-4 rounded-2xl">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Overdue Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{t('overdue')}</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{overdueInvoices.length}</p>
              <div className="flex items-center mt-2">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                <p className="text-xs text-gray-500">{t('past_due_date')}</p>
              </div>
            </div>
            <div className="bg-red-100 p-4 rounded-2xl">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Total Due Card */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition-shadow duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-100 uppercase tracking-wide">{t('total_due')}</p>
              <p className="text-3xl font-bold mt-2">
                {formatCurrency(convertCurrency(totalPending, 'USD', selectedCurrency), selectedCurrency)}
              </p>
              <div className="flex items-center mt-2">
                <div className="w-2 h-2 bg-blue-300 rounded-full mr-2"></div>
                <p className="text-xs text-blue-100">{t('outstanding_amount')}</p>
              </div>
            </div>
            <div className="bg-white/20 p-4 rounded-2xl">
              <CurrencyDollarIcon className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Payments Alert */}
      {pendingInvoices.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 text-center">
                {pendingInvoices.length === 1 ? 
                  t('pending_payments_alert', { count: pendingInvoices.length }) :
                  t('pending_payments_alert_plural', { count: pendingInvoices.length })
                }
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                {t('total_amount_due', { amount: totalPending.toFixed(2) })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Invoices Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('all_invoices')}</h2>
                <p className="text-sm text-gray-600">{invoices.length} {t('total_invoices')}</p>
              </div>
            </div>
            
            {/* Filter Buttons */}
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors">
                {t('pending')} ({pendingInvoices.length})
              </button>
              <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors">
                {t('paid')} ({paidInvoices.length})
              </button>
              {overdueInvoices.length > 0 && (
                <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors">
                  {t('overdue')} ({overdueInvoices.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('description')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('amount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('due_date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.description}
                          </div>
                          <div className="text-sm text-gray-500">
                            {t('unit')} {invoice.unit_number}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {formatCurrency(convertCurrency(invoice.amount, 'USD', selectedCurrency), selectedCurrency)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(invoice.due_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        <span className="mr-1">{getStatusIcon(invoice.status)}</span>
                        {t(invoice.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {invoice.status === 'pending' ? (
                        <button
                          onClick={() => handlePayment(invoice.id)}
                          disabled={processingPayment === invoice.id}
                          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          {processingPayment === invoice.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>{t('processing')}</span>
                            </>
                          ) : (
                            <>
                              <CurrencyDollarIcon className="h-4 w-4" />
                              <span>{t('pay_now')}</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-green-600 font-medium">{t('paid')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-center text-center text-gray-900 mb-2">{t('no_invoices_found')}</h3>
            <p className="text-gray-600">
              {t('no_invoices_description')}
            </p>
          </div>
        )}
      </div>

      {/* Payment Methods Info */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-center text-blue-900 mb-4">{t('payment_information')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-blue-800 text-center mb-2">{t('mock_payment_system')}</h4>
            <p className="text-sm text-blue-700">
              {t('mock_payment_description')}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 text-center mb-2">{t('payment_history')}</h4>
            <p className="text-sm text-blue-700">
              {t('payment_history_description')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialManagement;