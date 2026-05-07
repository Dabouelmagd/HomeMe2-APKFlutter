import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  QrCodeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '../components/shared/PageHeader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const _extractToken = (input) => {
  if (!input) return { token: '', type: 'unknown' };
  const v = input.trim();
  // Visitor pass URL: /visitor/<token>
  const visitorMatch = v.match(/\/visitor\/([A-Za-z0-9_-]+)/);
  if (visitorMatch) return { token: visitorMatch[1], type: 'visitor' };
  // Family invite URL: /join-family/<token> — NOT scannable by security
  const familyMatch = v.match(/\/join-family\/([A-Za-z0-9_-]+)/);
  if (familyMatch) return { token: familyMatch[1], type: 'family_invite' };
  // Plain token (no URL prefix) — assume visitor pass
  return { token: v, type: 'visitor' };
};

const SecurityScanPage = () => {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async () => {
    const { token: tok, type } = _extractToken(input);
    if (!tok) { toast.error('الصق الرابط أو الرمز'); return; }

    // Reject family invitation links — those are for residents, not security
    if (type === 'family_invite') {
      const errMsg = '⚠️ هذا رابط دعوة عائلة (للسكان فقط)، وليس تذكرة زائر. أطلب من الساكن إنشاء تذكرة زائر من حسابه عبر "تذاكر الزوار"';
      toast.error(errMsg);
      setResult({ success: false, message: errMsg });
      return;
    }

    setBusy(true);
    setResult(null);
    try {
      const r = await axios.post(`${API}/visitor-passes/${tok}/redeem`, {}, auth());
      setResult(r.data);
      if (r.data?.success) {
        toast.success(r.data.message || 'تم التفعيل');
      } else {
        toast.warning(r.data?.message || 'الرابط غير صالح');
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || 'فشل التفعيل — تحقق من صحة الرابط أو الكود';
      setResult({ success: false, message: typeof msg === 'string' ? msg : 'فشل التفعيل' });
      toast.error(typeof msg === 'string' ? msg : 'فشل التفعيل');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 p-6" dir="rtl" data-testid="security-scan-page">
      <div className="max-w-md mx-auto space-y-6">
        <PageHeader
          theme="emerald"
          icon={QrCodeIcon}
          badge="🛡️ نقطة الأمن"
          title="مسح تذكرة زائر"
          subtitle="الصق رابط الزائر أو الكود اليدوي"
          testId="security-scan-header"
        />

        <div className="bg-white/95 rounded-2xl shadow-xl border border-white/10 p-6">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://homemeapp.net/visitor/XXXXX  أو  XXXXX"
            rows={2}
            dir="ltr"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500"
            data-testid="security-scan-input"
          />
          <button
            onClick={submit}
            disabled={busy || !input.trim()}
            className="w-full mt-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-bold inline-flex items-center justify-center gap-2"
            data-testid="security-scan-submit"
          >
            {busy ? <ClockIcon className="w-5 h-5 animate-spin" /> : <PaperAirplaneIcon className="w-5 h-5" />}
            <span>{busy ? 'جاري التحقق...' : 'تفعيل الدخول'}</span>
          </button>
        </div>

        {result && (
          <div className={`bg-white rounded-2xl shadow-xl p-5 border-r-4 ${result.success ? 'border-emerald-500' : 'border-rose-500'}`} data-testid="security-scan-result">
            <div className="flex items-start gap-3">
              {result.success ? <CheckCircleIcon className="w-10 h-10 text-emerald-500 flex-shrink-0" /> : <XCircleIcon className="w-10 h-10 text-rose-500 flex-shrink-0" />}
              <div className="flex-1">
                <h3 className={`font-bold ${result.success ? 'text-emerald-700' : 'text-rose-700'}`}>{result.message || (result.success ? 'تم التفعيل' : 'فشل')}</h3>
                {result.pass && (
                  <div className="text-xs text-gray-600 mt-2 space-y-1">
                    <div>👤 الزائر: <strong>{result.pass.visitor_name}</strong></div>
                    {result.pass.resident_full_name && <div>🏠 المضيف: {result.pass.resident_full_name} • وحدة {result.pass.unit_number || '—'}</div>}
                    {result.pass.vehicle_plate && <div>🚗 السيارة: {result.pass.vehicle_plate}</div>}
                    {result.pass.purpose && <div>📝 السبب: <em>{result.pass.purpose}</em></div>}
                    <div className="border-t border-gray-100 pt-1 mt-2">الاستخدام: <strong>{result.pass.used_count}</strong> من <strong>{result.pass.max_uses || 1}</strong></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityScanPage;
