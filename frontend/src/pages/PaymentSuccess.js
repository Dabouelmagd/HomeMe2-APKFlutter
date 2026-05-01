import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/**
 * PaymentSuccess — الصفحة التي يعود إليها المستخدم بعد الدفع الناجح في Stripe.
 * تعتمد على polling لفحص الحالة (webhook + polling للأمان).
 */
const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState({ phase: 'checking', data: null, message: 'جارٍ التحقق من الدفع...' });

  useEffect(() => {
    if (!sessionId) {
      setStatus({ phase: 'error', data: null, message: 'رقم جلسة الدفع غير موجود' });
      return;
    }
    let attempts = 0;
    const MAX = 10;
    const poll = async () => {
      try {
        const res = await axios.get(`${API}/stripe/checkout-status/${sessionId}`, auth());
        const d = res.data;
        if (d.payment_status === 'paid') {
          setStatus({ phase: 'success', data: d, message: '🎉 تم تفعيل اشتراكك بنجاح!' });
          // Force the plan-usage card to refetch
          window.dispatchEvent(new CustomEvent('planUsageRefresh'));
          return;
        }
        if (d.status === 'expired') {
          setStatus({ phase: 'expired', data: d, message: 'انتهت صلاحية جلسة الدفع' });
          return;
        }
        attempts++;
        if (attempts >= MAX) {
          setStatus({ phase: 'timeout', data: d, message: 'لم نستطع التأكد من الدفع خلال الوقت المحدد. تحقق من بريدك الإلكتروني أو اضغط تحديث.' });
          return;
        }
        setTimeout(poll, 2500);
      } catch (err) {
        setStatus({ phase: 'error', data: null, message: err?.response?.data?.detail || 'فشل فحص حالة الدفع' });
      }
    };
    poll();
     
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 flex items-center justify-center p-6" dir="rtl" data-testid="payment-success-page">
      <div className="max-w-lg w-full bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-indigo-500/40 rounded-3xl p-8 shadow-2xl text-center space-y-5">
        <div className="text-7xl">
          {status.phase === 'success' ? '🎉' :
           status.phase === 'checking' ? '⏳' :
           status.phase === 'error' ? '⚠️' :
           status.phase === 'expired' ? '⌛' : '🤔'}
        </div>
        <h1 className="text-2xl font-bold text-white">
          {status.phase === 'success' ? 'تم الدفع بنجاح' :
           status.phase === 'checking' ? 'جارٍ التحقق' :
           status.phase === 'expired' ? 'انتهت الصلاحية' :
           status.phase === 'error' ? 'خطأ' : 'يحتاج مزيد من الوقت'}
        </h1>
        <p className="text-sm text-gray-300">{status.message}</p>

        {status.data && status.phase === 'success' && (
          <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-4 text-start space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">الخطة</span>
              <span className="text-emerald-300 font-bold">{status.data.plan_name_ar || status.data.plan_key}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">المبلغ</span>
              <span className="text-emerald-300 font-bold">
                {((status.data.amount_total || 0) / 100).toLocaleString('ar-EG')} {(status.data.currency || '').toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">الحالة</span>
              <span className="text-emerald-300 font-bold">✅ مفعّل</span>
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={() => navigate('/app/dashboard')}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg"
            data-testid="go-dashboard-btn"
          >
            🏠 العودة للوحة التحكم
          </button>
          {(status.phase === 'timeout' || status.phase === 'error') && (
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-sm border border-gray-600"
            >
              🔄 تحديث
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
