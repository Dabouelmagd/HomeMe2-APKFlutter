import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import useSEO from '../hooks/useSEO';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EmailVerify = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'already' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [username, setUsername] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);

  useSEO({
    title: 'تأكيد البريد الإلكتروني | HomeMe',
    description: 'صفحة تأكيد البريد الإلكتروني لحساب HomeMe',
  });

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('رابط غير صحيح. ادخل لصفحتك من خلال البريد المُرسل لك.');
      return;
    }

    axios
      .get(`${API}/auth/verify-email/${token}`)
      .then((res) => {
        setStatus(res.data.already_verified ? 'already' : 'success');
        setUsername(res.data.username || '');
      })
      .catch((err) => {
        setStatus('error');
        setErrorMessage(err.response?.data?.detail || 'حدث خطأ غير متوقع');
      });
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResending(true);
    try {
      const res = await axios.post(`${API}/auth/resend-verification`, { email: resendEmail.trim() });
      toast.success(res.data.message || 'تم إرسال رابط جديد');
      setResendEmail('');
    } catch (err) {
      toast.error('تعذّر الإرسال، حاول مرة أخرى');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center px-4" dir="rtl" data-testid="email-verify-page">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-6 text-center">
          <h1 className="text-2xl font-black" style={{ fontFamily: "'Cairo', sans-serif" }}>🏠 HomeMe</h1>
          <p className="text-sm opacity-90 mt-1">تأكيد البريد الإلكتروني</p>
        </div>

        {/* Body */}
        <div className="p-8">
          {/* Verifying */}
          {status === 'verifying' && (
            <div className="text-center" data-testid="verify-state-verifying">
              <ArrowPathIcon className="w-16 h-16 text-indigo-600 mx-auto animate-spin mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">جاري التحقق من بريدك…</h2>
              <p className="text-gray-600 text-sm">من فضلك انتظر لحظة.</p>
            </div>
          )}

          {/* Success — newly verified */}
          {status === 'success' && (
            <div className="text-center" data-testid="verify-state-success">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircleIcon className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>تم التأكيد بنجاح! ✨</h2>
              <p className="text-gray-600 mb-6">حسابك جاهز الآن. يمكنك تسجيل الدخول للوصول إلى لوحة التحكم.</p>
              {username && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-4 text-sm">
                  اسم المستخدم: <strong className="text-indigo-700">{username}</strong>
                </div>
              )}
              <Link
                to="/login"
                data-testid="verify-go-to-login"
                className="inline-block w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all"
              >
                تسجيل الدخول الآن ←
              </Link>
            </div>
          )}

          {/* Already verified */}
          {status === 'already' && (
            <div className="text-center" data-testid="verify-state-already">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <CheckCircleIcon className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>تم التأكيد مسبقاً ✓</h2>
              <p className="text-gray-600 mb-6">بريدك مُؤكد بالفعل. يمكنك تسجيل الدخول مباشرة.</p>
              <Link
                to="/login"
                data-testid="verify-go-to-login-already"
                className="inline-block w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all"
              >
                تسجيل الدخول ←
              </Link>
            </div>
          )}

          {/* Error / expired */}
          {status === 'error' && (
            <div data-testid="verify-state-error">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <XCircleIcon className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>الرابط غير صالح</h2>
                <p className="text-gray-600 text-sm">{errorMessage}</p>
              </div>

              {/* Resend form */}
              <form onSubmit={handleResend} className="bg-gray-50 rounded-xl p-4 border border-gray-200" data-testid="verify-resend-form">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm">
                  <EnvelopeIcon className="w-4 h-4 text-indigo-600" />
                  اطلب رابط جديد
                </h3>
                <p className="text-xs text-gray-600 mb-3">أدخل بريدك المسجل وسنرسل لك رابط تأكيد جديد.</p>
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  data-testid="verify-resend-email-input"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 mb-2 focus:border-indigo-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={resending}
                  data-testid="verify-resend-button"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg disabled:opacity-50 transition-all"
                >
                  {resending ? 'جاري الإرسال…' : 'إرسال رابط جديد'}
                </button>
              </form>

              <Link
                to="/login"
                className="block text-center text-sm text-indigo-600 hover:underline mt-4"
              >
                الرجوع لصفحة تسجيل الدخول
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerify;
