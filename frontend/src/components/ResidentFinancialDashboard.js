import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  BanknotesIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const API = process.env.REACT_APP_BACKEND_URL;

const ResidentFinancialDashboard = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [accountData, setAccountData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [charges, setCharges] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState(null);

  useEffect(() => {
    fetchResidentFinancialData();
  }, []);

  const fetchResidentFinancialData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch resident's financial account
      const response = await axios.get(
        `${API}/api/financial/residents/${user.id}/account`,
        { headers }
      );

      setAccountData(response.data);
      setCharges(response.data.pending_charges || []);
      setPayments(response.data.recent_payments || []);
    } catch (error) {
      console.error('Error fetching resident financial data:', error);
      toast.error(t('failed_to_load_financial_data', 'Failed to load financial data'));
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = (charge) => {
    setSelectedCharge(charge);
    setShowPaymentModal(true);
  };

  const processPayment = async (paymentMethod) => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      const headers = { Authorization: `Bearer ${token}` };

      const paymentData = {
        resident_id: user.id,
        compound_id: user.compound_id,
        amount: selectedCharge.amount,
        payment_method: paymentMethod,
        reference: `CHARGE-${selectedCharge.id}`,
        notes: `Payment for ${selectedCharge.description}`
      };

      await axios.post(`${API}/api/financial/residents/payments`, paymentData, { headers });
      
      toast.success(t('payment_successful', 'Payment successful!'));
      setShowPaymentModal(false);
      setSelectedCharge(null);
      fetchResidentFinancialData(); // Refresh data
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(t('payment_failed', 'Payment failed. Please try again.'));
    }
  };

  const downloadReceipt = async (paymentId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const response = await axios.get(
        `${API}/api/financial/residents/payments/${paymentId}/receipt`,
        { headers, responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(t('receipt_downloaded', 'Receipt downloaded successfully'));
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error(t('download_failed', 'Failed to download receipt'));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            💰 {t('my_financial_account', 'حسابي المالي')}
          </h1>
          <p className="text-gray-600 font-medium">
            {t('view_balance_and_payments', 'عرض رصيدك والمدفوعات')}
          </p>
        </div>

        {/* Account Summary Cards */}
        {accountData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Charges */}
            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 shadow-xl text-white transform hover:scale-105 transition-all">
              <div className="flex items-center justify-between mb-4">
                <DocumentTextIcon className="w-12 h-12 text-white/90" />
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="text-white/80 text-sm font-semibold mb-1">
                {t('total_charges', 'إجمالي المستحقات')}
              </h3>
              <p className="text-3xl font-black">{formatCurrency(accountData.total_charges)}</p>
            </div>

            {/* Total Payments */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-xl text-white transform hover:scale-105 transition-all">
              <div className="flex items-center justify-between mb-4">
                <CheckCircleIcon className="w-12 h-12 text-white/90" />
                <span className="text-3xl">✅</span>
              </div>
              <h3 className="text-white/80 text-sm font-semibold mb-1">
                {t('total_payments', 'إجمالي المدفوعات')}
              </h3>
              <p className="text-3xl font-black">{formatCurrency(accountData.total_payments)}</p>
            </div>

            {/* Balance */}
            <div className={`bg-gradient-to-br ${accountData.balance > 0 ? 'from-red-500 to-pink-600' : 'from-blue-500 to-blue-600'} rounded-2xl p-6 shadow-xl text-white transform hover:scale-105 transition-all`}>
              <div className="flex items-center justify-between mb-4">
                <BanknotesIcon className="w-12 h-12 text-white/90" />
                <span className="text-3xl">{accountData.balance > 0 ? '⚠️' : '✨'}</span>
              </div>
              <h3 className="text-white/80 text-sm font-semibold mb-1">
                {t('current_balance', 'الرصيد الحالي')}
              </h3>
              <p className="text-3xl font-black">{formatCurrency(Math.abs(accountData.balance))}</p>
              <p className="text-sm text-white/70 mt-1">
                {accountData.balance > 0 ? t('amount_due', 'مبلغ مستحق') : t('credit_balance', 'رصيد دائن')}
              </p>
            </div>
          </div>
        )}

        {/* Pending Charges */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">⏰</span>
            {t('pending_charges', 'المستحقات المعلقة')}
          </h2>
          <div className="space-y-3">
            {charges.length > 0 ? (
              charges.map((charge) => (
                <div key={charge.id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">{charge.description}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          charge.status === 'overdue' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {charge.status === 'overdue' ? t('overdue', 'متأخر') : t('pending', 'معلق')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {t('type', 'النوع')}: {charge.charge_type} • 
                        {t('due_date', 'تاريخ الاستحقاق')}: {formatDate(charge.due_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-xl font-bold text-orange-600">{formatCurrency(charge.amount)}</p>
                      <button
                        onClick={() => handlePayNow(charge)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
                      >
                        💳 {t('pay_now', 'ادفع الآن')}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">
                {t('no_pending_charges', 'لا توجد مستحقات معلقة')} 🎉
              </p>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">📊</span>
            {t('payment_history', 'سجل المدفوعات')}
          </h2>
          <div className="space-y-3">
            {payments.length > 0 ? (
              payments.map((payment) => (
                <div key={payment.id} className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {t('payment', 'دفعة')} - {payment.payment_method}
                      </p>
                      <p className="text-sm text-gray-600">
                        {t('date', 'التاريخ')}: {formatDate(payment.payment_date)} • 
                        {t('reference', 'المرجع')}: {payment.reference}
                      </p>
                      {payment.notes && (
                        <p className="text-sm text-gray-500 mt-1">{payment.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-xl font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                      <button
                        onClick={() => downloadReceipt(payment.id)}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-all"
                        title={t('download_receipt', 'تحميل الإيصال')}
                      >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">
                {t('no_payment_history', 'لا يوجد سجل مدفوعات')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedCharge && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {t('select_payment_method', 'اختر طريقة الدفع')}
            </h3>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-2">{t('amount_to_pay', 'المبلغ المطلوب')}:</p>
              <p className="text-3xl font-black text-blue-600">{formatCurrency(selectedCharge.amount)}</p>
              <p className="text-sm text-gray-500 mt-1">{selectedCharge.description}</p>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => processPayment('credit_card')}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <CreditCardIcon className="w-5 h-5" />
                {t('credit_card', 'بطاقة ائتمان')}
              </button>
              
              <button
                onClick={() => processPayment('bank_transfer')}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <BanknotesIcon className="w-5 h-5" />
                {t('bank_transfer', 'تحويل بنكي')}
              </button>
              
              <button
                onClick={() => processPayment('cash')}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                <BanknotesIcon className="w-5 h-5" />
                {t('cash', 'نقداً')}
              </button>
            </div>

            <button
              onClick={() => {
                setShowPaymentModal(false);
                setSelectedCharge(null);
              }}
              className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all"
            >
              {t('cancel', 'إلغاء')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResidentFinancialDashboard;
