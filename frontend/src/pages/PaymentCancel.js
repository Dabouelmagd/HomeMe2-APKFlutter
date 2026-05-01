import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentCancel = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-rose-950 flex items-center justify-center p-6" dir="rtl" data-testid="payment-cancel-page">
      <div className="max-w-md w-full bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-rose-500/40 rounded-3xl p-8 shadow-2xl text-center space-y-5">
        <div className="text-7xl">😔</div>
        <h1 className="text-2xl font-bold text-white">تم إلغاء الدفع</h1>
        <p className="text-sm text-gray-300">
          لا تقلق، لم يتم خصم أي مبلغ. يمكنك المحاولة مجدداً في أي وقت من لوحة التحكم.
        </p>
        <div className="bg-rose-900/20 border border-rose-700/40 rounded-xl p-3 text-xs text-rose-200">
          💡 اشتراكك حالياً بخطة "مجاني" — يمكنك استخدام الميزات الأساسية دون تكلفة.
        </div>
        <button
          onClick={() => navigate('/app/dashboard')}
          className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg"
          data-testid="cancel-go-dashboard-btn"
        >
          🏠 العودة للوحة التحكم
        </button>
      </div>
    </div>
  );
};

export default PaymentCancel;
