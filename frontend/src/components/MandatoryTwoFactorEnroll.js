import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * MandatoryTwoFactorEnroll — Feature #54
 *
 * Renders a 2-stage modal when an app_owner or super_admin logs in without
 * 2FA enabled. Stage 1 = QR scan, Stage 2 = code verify. On success, the
 * parent (Login.js) receives the issued access token + user payload and
 * proceeds with the normal post-login flow.
 */
const MandatoryTwoFactorEnroll = ({ setupToken, message, role, onSuccess, onCancel }) => {
  const [stage, setStage] = useState('qr');  // 'qr' | 'verify' | 'backup'
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [authResult, setAuthResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!setupToken) return;
    let alive = true;
    setLoading(true);
    axios.post(`${API}/2fa/setup-enroll`, { setup_token: setupToken })
      .then((r) => {
        if (!alive) return;
        setQrCode(r.data.qr_code);
        setSecret(r.data.secret);
      })
      .catch(() => toast.error('فشل بدء إعداد المصادقة الثنائية'))
      .finally(() => setLoading(false));
    return () => { alive = false; };
  }, [setupToken]);

  const verify = async () => {
    if (!code.trim() || code.trim().length < 6) {
      toast.error('أدخل رمز TOTP من تطبيق المصادقة');
      return;
    }
    setLoading(true);
    try {
      const r = await axios.post(`${API}/2fa/verify-enroll`, {
        setup_token: setupToken,
        token_code: code.trim(),
      });
      setBackupCodes(r.data.backup_codes || []);
      setAuthResult(r.data);
      setStage('backup');
      toast.success('🎉 تم تفعيل المصادقة الثنائية بنجاح');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'الرمز غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  const finish = () => {
    // Hand the final auth payload to parent so it can save session
    onSuccess(authResult);
  };

  const copyBackup = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast.success('تم النسخ — احفظها في مكان آمن');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      data-testid="mandatory-2fa-modal"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-orange-600 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5" />
            <h2 className="font-black text-sm">تفعيل المصادقة الثنائية (إلزامي)</h2>
          </div>
          {stage !== 'verify' && stage !== 'backup' && onCancel && (
            <button onClick={onCancel} className="hover:bg-white/15 rounded-lg p-1" aria-label="إلغاء">
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="p-5">
          {/* Warning banner */}
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 leading-relaxed">
            <strong>🔒 حماية إجبارية:</strong> حساب <span className="font-bold">{role === 'app_owner' ? 'مالك التطبيق' : 'مشرف عام'}</span> يتطلب تفعيل المصادقة الثنائية للحفاظ على أمان المنصة.
            {message && (
              <div className="text-[11px] text-amber-700 mt-1.5">{message}</div>
            )}
          </div>

          {/* STAGE 1: QR + secret */}
          {stage === 'qr' && (
            <div className="space-y-4" data-testid="2fa-stage-qr">
              <ol className="text-xs text-gray-700 space-y-2 list-decimal pr-5">
                <li>افتح تطبيق <strong>Google Authenticator</strong> أو <strong>Authy</strong> على هاتفك.</li>
                <li>اضغط "إضافة حساب" واختر "مسح رمز QR".</li>
                <li>وجه الكاميرا إلى الكود التالي:</li>
              </ol>
              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center min-h-[200px]">
                {loading ? (
                  <div className="text-xs text-gray-500 animate-pulse">⏳ جارٍ التحضير...</div>
                ) : qrCode ? (
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" data-testid="2fa-qr-image" />
                ) : (
                  <div className="text-xs text-rose-500">فشل تحميل الكود</div>
                )}
              </div>
              {secret && (
                <div className="bg-gray-100 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-gray-500 mb-1">أو أدخل المفتاح يدوياً:</div>
                  <code className="text-xs font-mono text-gray-800 break-all" data-testid="2fa-secret">{secret}</code>
                </div>
              )}
              <button
                onClick={() => setStage('verify')}
                disabled={!qrCode}
                className="w-full bg-gradient-to-r from-rose-600 to-red-700 hover:brightness-110 text-white font-bold py-2.5 rounded-xl disabled:opacity-50 transition"
                data-testid="2fa-next-btn"
              >
                مسحت الكود — التالي
              </button>
            </div>
          )}

          {/* STAGE 2: verify */}
          {stage === 'verify' && (
            <div className="space-y-4" data-testid="2fa-stage-verify">
              <p className="text-xs text-gray-700">
                أدخل الرمز المكوّن من 6 أرقام الذي يظهر في تطبيق المصادقة:
              </p>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 border-2 border-gray-300 rounded-xl focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
                maxLength={6}
                inputMode="numeric"
                autoFocus
                data-testid="2fa-code-input"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setStage('qr')}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold"
                >
                  السابق
                </button>
                <button
                  onClick={verify}
                  disabled={loading || code.length < 6}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 text-white text-xs font-bold disabled:opacity-50"
                  data-testid="2fa-verify-btn"
                >
                  {loading ? 'جارٍ التحقق...' : '✓ تفعيل وفتح الحساب'}
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: backup codes */}
          {stage === 'backup' && (
            <div className="space-y-4" data-testid="2fa-stage-backup">
              <div className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                ✅ تم تفعيل المصادقة الثنائية بنجاح
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 leading-relaxed">
                <strong>⚠️ احفظ هذه الرموز الاحتياطية الآن:</strong>
                <br />
                استخدمها لتسجيل الدخول إذا فقدت هاتفك. كل رمز يصلح لمرة واحدة.
              </div>
              <div className="bg-gray-900 text-emerald-400 rounded-xl p-4 font-mono text-sm leading-relaxed">
                {backupCodes.map((c, i) => (
                  <div key={i} className="flex justify-between border-b border-gray-800 py-1 last:border-0">
                    <span className="text-gray-500">{i + 1}.</span>
                    <span className="font-bold tracking-wider">{c}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={copyBackup}
                className="w-full flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-xs font-bold"
                data-testid="2fa-copy-backup-btn"
              >
                <ClipboardDocumentCheckIcon className="h-4 w-4" />
                نسخ كل الرموز
              </button>
              <button
                onClick={finish}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 text-white font-bold py-2.5 rounded-xl"
                data-testid="2fa-finish-btn"
              >
                دخول لحسابي →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MandatoryTwoFactorEnroll;
