import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Reset password page reached from the email link. Pulls token from query
 * string, posts to /api/auth/reset-password, then redirects to /login.
 */
const ResetPassword = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError(t('reset_no_token', 'الرابط غير صالح — يفتقد رمز إعادة التعيين.'));
  }, [token, t]);

  const submit = async (e) => {
    e?.preventDefault();
    setError('');
    if (pw.length < 8) {
      setError(t('reset_pw_short', 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'));
      return;
    }
    if (pw !== pw2) {
      setError(t('reset_pw_mismatch', 'كلمتا المرور غير متطابقتين'));
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, new_password: pw });
      setSuccess(true);
      toast.success(t('reset_success_toast', 'تم تحديث كلمة المرور بنجاح'));
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.response?.data?.detail || t('reset_failed', 'تعذّر إعادة تعيين كلمة المرور'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-pink-100" data-testid="reset-password-page">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg mb-3">
              <LockClosedIcon className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: "'Cairo', sans-serif" }}>
              {t('reset_title', 'إعادة تعيين كلمة المرور')}
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              {t('reset_subtitle', 'أدخلي كلمة المرور الجديدة وستعودين لتسجيل الدخول مباشرة.')}
            </p>
          </div>

          {success ? (
            <div className="text-center py-8" data-testid="reset-success">
              <CheckCircleIcon className="h-16 w-16 mx-auto text-emerald-500 mb-3" />
              <h3 className="text-lg font-bold text-gray-900">{t('reset_done', 'تم بنجاح!')}</h3>
              <p className="text-sm text-gray-500 mt-2">{t('reset_redirect', 'سيتم تحويلك لتسجيل الدخول...')}</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">{t('new_password', 'كلمة المرور الجديدة')}</label>
                <div className="relative mt-1">
                  <input
                    type={show ? 'text' : 'password'}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    required
                    minLength={8}
                    disabled={!token}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-violet-400 focus:border-transparent disabled:bg-gray-50"
                    data-testid="reset-pw-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute top-1/2 -translate-y-1/2 left-3 rtl:left-3 ltr:right-3 text-gray-400"
                  >
                    {show ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">{t('confirm_new_password', 'تأكيد كلمة المرور')}</label>
                <input
                  type={show ? 'text' : 'password'}
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  required
                  minLength={8}
                  disabled={!token}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-violet-400 focus:border-transparent disabled:bg-gray-50"
                  data-testid="reset-pw2-input"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 flex items-start gap-2" data-testid="reset-error">
                  <ExclamationTriangleIcon className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold shadow-md hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                data-testid="reset-submit"
              >
                {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {loading ? t('saving', 'جاري الحفظ...') : t('save_new_password', 'حفظ كلمة المرور الجديدة')}
              </button>

              <div className="text-center pt-3">
                <Link to="/login" className="text-xs text-gray-500 hover:text-violet-700">
                  {t('back_to_login', '← العودة لتسجيل الدخول')}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
