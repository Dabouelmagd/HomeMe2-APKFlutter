import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Copy,
  Download,
  Loader2,
  KeyRound,
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function TwoFactorSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ enabled: false, eligible: true });
  const [step, setStep] = useState('idle'); // idle | qr | done
  const [qr, setQr] = useState(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [disableCode, setDisableCode] = useState('');

  const refreshStatus = async () => {
    try {
      const r = await axios.get(`${API}/2fa/status`);
      setStatus(r.data);
    } catch (e) { /* noop */ }
  };

  useEffect(() => { refreshStatus(); }, []);

  const startSetup = async () => {
    setLoading(true);
    try {
      const r = await axios.post(`${API}/2fa/setup`);
      setQr(r.data.qr_code);
      setSecret(r.data.secret);
      setStep('qr');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل بدء الإعداد');
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async () => {
    if (code.length !== 6) {
      toast.error('أدخل رمزاً مكوناً من 6 أرقام');
      return;
    }
    setLoading(true);
    try {
      const r = await axios.post(`${API}/2fa/verify-setup`, { token_code: code });
      setBackupCodes(r.data.backup_codes || []);
      setStep('done');
      toast.success('تم تفعيل المصادقة الثنائية بنجاح');
      refreshStatus();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'الرمز غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    if (disableCode.length !== 6) {
      toast.error('أدخل الرمز الحالي من تطبيق المصادقة');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/2fa/disable`, { token_code: disableCode });
      toast.success('تم تعطيل المصادقة الثنائية');
      setDisableCode('');
      setStep('idle');
      refreshStatus();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'فشل التعطيل');
    } finally {
      setLoading(false);
    }
  };

  const copyText = (txt) => {
    navigator.clipboard?.writeText(txt);
    toast.success('تم النسخ');
  };

  const downloadBackup = () => {
    const blob = new Blob([
      'HomeMe — رموز الاستعادة (Backup Codes)\n\n' +
      'احتفظ بهذه الرموز في مكان آمن. كل رمز قابل للاستخدام مرة واحدة فقط.\n\n' +
      backupCodes.join('\n'),
    ], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = 'homeme-2fa-backup-codes.txt';
    link.click();
  };

  if (!status.eligible) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-md text-center">
          <ShieldOff className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">المصادقة الثنائية غير متاحة</h2>
          <p className="text-gray-600 dark:text-gray-300">2FA متاح فقط لأدوار المسؤولين.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" data-testid="two-factor-page">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">المصادقة الثنائية (2FA)</h1>
          <p className="text-gray-600 dark:text-gray-300">حماية حسابك بطبقة أمان إضافية عبر تطبيق المصادقة (Google Authenticator / Authy).</p>
        </div>

        {/* Status banner */}
        <div className={`rounded-2xl p-5 mb-6 flex items-center gap-4 ${status.enabled ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200'}`}>
          {status.enabled ? <ShieldCheck className="w-10 h-10 text-emerald-600" /> : <ShieldOff className="w-10 h-10 text-amber-600" />}
          <div className="flex-1">
            <div className={`font-semibold ${status.enabled ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-200'}`}>
              {status.enabled ? '2FA مُفعّل' : '2FA غير مُفعّل'}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {status.enabled ? 'حسابك محمي بطبقة أمان إضافية.' : 'يُنصح بتفعيله لحماية حسابك.'}
            </div>
          </div>
        </div>

        {/* Setup flow */}
        {!status.enabled && step === 'idle' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md">
            <div className="flex items-start gap-4 mb-4">
              <Smartphone className="w-8 h-8 text-indigo-600 mt-1" />
              <div>
                <h3 className="text-lg font-semibold">ابدأ الإعداد</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">ستحتاج إلى تطبيق مصادقة مثل Google Authenticator أو Authy على هاتفك.</p>
              </div>
            </div>
            <button
              onClick={startSetup}
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              data-testid="start-2fa-setup-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              ابدأ التفعيل
            </button>
          </div>
        )}

        {!status.enabled && step === 'qr' && qr && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md">
            <h3 className="text-lg font-semibold mb-3">الخطوة 1: امسح كود QR</h3>
            <div className="flex flex-col md:flex-row gap-6 items-center mb-6">
              <img src={qr} alt="QR Code" className="w-56 h-56 border-2 border-indigo-200 rounded-xl" data-testid="qr-code-img" />
              <div className="flex-1 text-sm">
                <p className="mb-3 text-gray-700 dark:text-gray-300">امسح الكود أعلاه بتطبيق المصادقة، أو أدخل المفتاح يدوياً:</p>
                <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg font-mono text-xs break-all flex items-center gap-2">
                  <span className="flex-1">{secret}</span>
                  <button onClick={() => copyText(secret)} className="text-indigo-600 hover:text-indigo-800">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-3">الخطوة 2: أدخل الرمز المُولَّد</h3>
            <input
              type="text"
              maxLength={6}
              inputMode="numeric"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 text-2xl text-center tracking-[0.5em] font-mono border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg mb-4"
              data-testid="totp-verify-input"
            />
            <button
              onClick={verifySetup}
              disabled={loading || code.length !== 6}
              className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              data-testid="verify-2fa-setup-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              تحقق وتفعيل
            </button>
          </div>
        )}

        {step === 'done' && backupCodes.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md border-2 border-amber-300">
            <div className="flex items-center gap-3 mb-4">
              <KeyRound className="w-8 h-8 text-amber-600" />
              <h3 className="text-lg font-semibold">احفظ رموز الاستعادة</h3>
            </div>
            <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg mb-4">
              ⚠️ هذه الرموز تظهر مرة واحدة فقط. احفظها في مكان آمن (مثل مدير كلمات المرور). كل رمز قابل للاستخدام مرة واحدة في حال فقدان جهاز المصادقة.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4 font-mono text-sm">
              {backupCodes.map((bc, i) => (
                <div key={i} className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-center">{bc}</div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={downloadBackup}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 inline-flex items-center justify-center gap-2"
                data-testid="download-backup-codes-btn"
              >
                <Download className="w-4 h-4" /> تنزيل
              </button>
              <button
                onClick={() => copyText(backupCodes.join('\n'))}
                className="flex-1 px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 inline-flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" /> نسخ الكل
              </button>
            </div>
          </div>
        )}

        {/* Disable */}
        {status.enabled && step !== 'done' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-md">
            <h3 className="text-lg font-semibold mb-2 text-red-700 dark:text-red-400">تعطيل المصادقة الثنائية</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              لتعطيل 2FA يرجى إدخال الرمز الحالي من تطبيق المصادقة (للتحقق من هويتك).
            </p>
            <input
              type="text"
              maxLength={6}
              inputMode="numeric"
              placeholder="000000"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 text-2xl text-center tracking-[0.5em] font-mono border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg mb-4"
              data-testid="disable-2fa-input"
            />
            <button
              onClick={disable}
              disabled={loading || disableCode.length !== 6}
              className="w-full px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
              data-testid="disable-2fa-btn"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
              تعطيل 2FA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
