import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL + '/api';
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const planLabels = { trial: 'تجريبي', starter: 'مجاني', basic: 'أساسي', pro: 'احترافي', premium: 'متقدم', company_startup: 'شركة ناشئة', company_business: 'شركة متوسطة', company_enterprise: 'شركة كبرى' };
const planColors = { trial: 'bg-gray-100 text-gray-700', starter: 'bg-gray-100 text-gray-600', basic: 'bg-sky-100 text-sky-700', pro: 'bg-blue-100 text-blue-700', premium: 'bg-violet-100 text-violet-700', company_startup: 'bg-amber-100 text-amber-700', company_business: 'bg-orange-100 text-orange-700', company_enterprise: 'bg-red-100 text-red-700' };
const durationLabels = { trial: 'تجريبي 14 يوم', '1_month': 'شهر', '3_months': '3 شهور', '6_months': '6 شهور', '9_months': '9 شهور', '1_year': 'سنة', 'lifetime': 'مدى الحياة' };

export default function SubscriptionManagement() {
  const { user } = useAuth();
  const [sub, setSub] = useState(null);
  const [code, setCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeMsg, setCodeMsg] = useState(null);
  const [methods, setMethods] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('1_month');
  const [payLoading, setPayLoading] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [invoiceStats, setInvoiceStats] = useState({});
  const [showHistory, setShowHistory] = useState(false);

  const fetchSub = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/subscription/my`, getToken());
      setSub(res.data);
    } catch { /* */ }
  }, []);

  const fetchMethods = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/payments/methods`);
      setMethods(res.data.methods || []);
    } catch { /* */ }
  }, []);

  useEffect(() => { fetchSub(); fetchMethods(); fetchInvoices(); }, [fetchSub, fetchMethods]);

  const fetchInvoices = async () => {
    try {
      const res = await axios.get(`${API}/invoices`, getToken());
      setInvoices(res.data.invoices || []);
      setInvoiceStats(res.data.stats || {});
    } catch { /* */ }
  };

  const handleDownloadPDF = async (invoiceId) => {
    try {
      const res = await axios.get(`${API}/invoices/${invoiceId}/pdf`, { ...getToken(), responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('تم تحميل الفاتورة');
    } catch { toast.error('فشل في تحميل الفاتورة'); }
  };

  const handleGenerateInvoice = async () => {
    try {
      const res = await axios.post(`${API}/invoices/generate`, {}, getToken());
      toast.success(res.data.message);
      fetchInvoices();
    } catch (err) { toast.error(err.response?.data?.detail || 'فشل'); }
  };

  const handleActivateCode = async () => {
    if (!code.trim()) return;
    setCodeLoading(true); setCodeMsg(null);
    try {
      const res = await axios.post(`${API}/subscription-codes/activate`, { code: code.trim() }, getToken());
      setCodeMsg({ type: 'success', msg: res.data.message });
      setCode(''); fetchSub();
    } catch (err) {
      setCodeMsg({ type: 'error', msg: err.response?.data?.detail || 'كود غير صالح' });
    }
    setCodeLoading(false);
  };

  const handleStripe = async (plan) => {
    setPayLoading('stripe');
    try {
      const res = await axios.post(`${API}/payments/subscribe`, { plan, duration: selectedDuration, currency: 'egp' }, getToken());
      if (res.data.checkout_url) window.location.href = res.data.checkout_url;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل');
    }
    setPayLoading('');
  };

  const handlePayPal = async (plan) => {
    setPayLoading('paypal');
    try {
      const res = await axios.post(`${API}/payments/paypal/create-order`, { plan, duration: selectedDuration, currency: 'usd' }, getToken());
      if (res.data.approve_url) window.location.href = res.data.approve_url;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'فشل');
    }
    setPayLoading('');
  };

  const daysRemaining = sub?.subscription_end ? Math.max(0, Math.floor((new Date(sub.subscription_end) - new Date()) / 86400000)) : 0;
  const isActive = sub?.subscription_active;
  const plan = sub?.subscription_plan || sub?.subscription_type || 'none';

  const upgradePlans = [
    { id: 'basic', name: 'أساسي', price: 500 },
    { id: 'pro', name: 'احترافي', price: 1200 },
    { id: 'premium', name: 'متقدم', price: 2200 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="subscription-management">
      <h1 className="text-2xl font-bold text-gray-900">إدارة الاشتراك</h1>

      {/* Current Subscription Status */}
      <div className={`rounded-2xl border-2 p-6 ${isActive ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`} data-testid="sub-status-card">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">الخطة الحالية</p>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${planColors[plan] || 'bg-gray-100 text-gray-600'}`}>
                {planLabels[plan] || plan}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                {isActive ? 'نشط' : 'منتهي'}
              </span>
            </div>
          </div>
          <div className="text-left">
            {sub?.subscription_end && (
              <>
                <p className="text-sm text-gray-500">ينتهي في</p>
                <p className="font-bold text-gray-900">{new Date(sub.subscription_end).toLocaleDateString('ar-EG')}</p>
                <p className={`text-xs font-medium ${daysRemaining <= 7 ? 'text-red-600' : daysRemaining <= 30 ? 'text-amber-600' : 'text-green-600'}`}>
                  {daysRemaining > 0 ? `${daysRemaining} يوم متبقي` : 'منتهي'}
                </p>
              </>
            )}
          </div>
        </div>
        {sub?.subscription_code_used && (
          <p className="text-xs text-gray-400 mt-3">كود الاشتراك: {sub.subscription_code_used}</p>
        )}
      </div>

      {/* Activate Code */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6" data-testid="activate-code-section">
        <h2 className="text-lg font-bold text-gray-900 mb-4">تفعيل كود اشتراك</h2>
        <div className="flex gap-3">
          <input type="text" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleActivateCode()}
            placeholder="أدخل الكود هنا..." className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none" data-testid="sub-code-input" />
          <button onClick={handleActivateCode} disabled={codeLoading || !code.trim()}
            className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-500 disabled:opacity-50 transition-all" data-testid="sub-code-activate-btn">
            {codeLoading ? '...' : 'تفعيل'}
          </button>
        </div>
        {codeMsg && (
          <div className={`mt-3 text-sm py-2 px-4 rounded-lg ${codeMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {codeMsg.msg}
          </div>
        )}
      </div>

      {/* Upgrade / Renew */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6" data-testid="upgrade-section">
        <h2 className="text-lg font-bold text-gray-900 mb-2">ترقية أو تجديد الاشتراك</h2>
        <p className="text-sm text-gray-500 mb-4">اختر الخطة والمدة ثم اختر طريقة الدفع</p>

        <div className="flex gap-3 mb-4 flex-wrap">
          {['1_month', '3_months', '6_months', '1_year'].map(d => (
            <button key={d} onClick={() => setSelectedDuration(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${selectedDuration === d ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              {durationLabels[d]}
              {d === '1_year' && <span className="text-[10px] text-green-600 block">شهرين مجاناً</span>}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {upgradePlans.map(p => {
            const mult = { '1_month': 1, '3_months': 3, '6_months': 6, '1_year': 10 }[selectedDuration] || 1;
            const total = p.price * mult;
            const isCurrent = plan === p.id;
            return (
              <div key={p.id} onClick={() => !isCurrent && setSelectedPlan(p.id)}
                className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${selectedPlan === p.id ? 'border-blue-500 bg-blue-50' : isCurrent ? 'border-green-300 bg-green-50 opacity-70' : 'border-gray-200 hover:border-gray-300'}`}
                data-testid={`plan-card-${p.id}`}>
                <h3 className="font-bold text-gray-900">{p.name}</h3>
                <p className="text-2xl font-black text-blue-600 mt-1">{total.toLocaleString()} <span className="text-sm text-gray-400">ج.م</span></p>
                <p className="text-xs text-gray-400">{p.price.toLocaleString()} ج.م × {mult} شهر</p>
                {isCurrent && <span className="text-xs text-green-600 font-bold">الخطة الحالية</span>}
              </div>
            );
          })}
        </div>

        {selectedPlan && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">اختر طريقة الدفع:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => handleStripe(selectedPlan)} disabled={payLoading === 'stripe'}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:border-blue-400 transition-all text-right" data-testid="pay-stripe-btn">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">Card</div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">بطاقة ائتمان</p>
                  <p className="text-xs text-gray-500">Visa, Mastercard, Mada</p>
                </div>
              </button>
              <button onClick={() => handlePayPal(selectedPlan)} disabled={payLoading === 'paypal'}
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-yellow-200 bg-yellow-50 hover:border-yellow-400 transition-all text-right" data-testid="pay-paypal-btn">
                <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">PP</div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">PayPal</p>
                  <p className="text-xs text-gray-500">دفع آمن عبر PayPal</p>
                </div>
              </button>
            </div>

            {/* Manual payment methods */}
            <div className="border-t pt-3 mt-3">
              <p className="text-xs text-gray-500 mb-2">أو تحويل يدوي:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {methods.filter(m => m.type === 'manual' && m.enabled).map(m => (
                  <div key={m.id} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                    <p className="text-sm font-bold text-gray-800">{m.name}</p>
                    {m.number && <p className="text-sm text-blue-600 font-mono mt-1" dir="ltr">{m.number}</p>}
                    <p className="text-[10px] text-gray-400 mt-1">أرسل إيصال التحويل للإدارة لتفعيل اشتراكك</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment History & Invoices */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden" data-testid="payment-history">
        <button onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">🧾</span>
            <div className="text-right">
              <h2 className="font-bold text-gray-900">سجل المدفوعات والفواتير</h2>
              <p className="text-xs text-gray-500">{invoiceStats.total_invoices || 0} فاتورة | إجمالي: {(invoiceStats.total_paid || 0).toLocaleString()} ج.م</p>
            </div>
          </div>
          <span className={`transition-transform ${showHistory ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showHistory && (
          <div className="border-t border-gray-100 p-5">
            <div className="flex gap-2 mb-4">
              <button onClick={handleGenerateInvoice} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700" data-testid="generate-invoice-btn">
                إنشاء فاتورة
              </button>
              <button onClick={fetchInvoices} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200">
                تحديث
              </button>
            </div>

            {invoices.length > 0 ? (
              <div className="space-y-2">
                {invoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors" data-testid={`invoice-${inv.id}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📄</span>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{inv.invoice_number}</p>
                        <p className="text-xs text-gray-500">{inv.date} | {planLabels[inv.plan] || inv.plan} - {durationLabels[inv.duration] || inv.duration}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-900">{(inv.total || 0).toLocaleString()} {inv.currency}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {inv.status === 'paid' ? 'مدفوع' : 'معلق'}
                        </span>
                      </div>
                      <button onClick={() => handleDownloadPDF(inv.id)} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200" data-testid={`download-${inv.id}`}>
                        PDF ⬇
                      </button>
                      <button onClick={async () => {
                        try {
                          await axios.post(`${API}/notifications/send-invoice-email`, {}, getToken());
                          toast.success('تم إرسال الفاتورة بالبريد');
                        } catch { toast.error('فشل في الإرسال'); }
                      }} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200">
                        بريد ✉
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-3xl mb-2">🧾</p>
                <p className="text-sm">لا توجد فواتير بعد</p>
                <p className="text-xs mt-1">سيتم إنشاء الفواتير تلقائياً عند كل عملية دفع</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
