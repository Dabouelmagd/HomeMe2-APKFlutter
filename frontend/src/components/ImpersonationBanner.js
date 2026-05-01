import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ImpersonationBanner() {
  const [info, setInfo] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const navigate = useNavigate();

  const load = async () => {
    const tok = localStorage.getItem('token');
    if (!tok) return setInfo(null);
    try {
      const res = await axios.get(`${API}/impersonate/status`, { headers: { Authorization: `Bearer ${tok}` } });
      setInfo(res.data?.is_impersonation ? res.data : null);
      // Also compute remaining from token exp
      try {
        const payload = JSON.parse(atob(tok.split('.')[1]));
        if (payload.exp) {
          const ms = payload.exp * 1000 - Date.now();
          setRemaining(ms > 0 ? ms : 0);
        }
      } catch { /* ignore */ }
    } catch { setInfo(null); }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  // Countdown tick every second when active
  useEffect(() => {
    if (!info || remaining === null) return;
    const id = setInterval(() => setRemaining(r => (r !== null && r > 1000 ? r - 1000 : 0)), 1000);
    return () => clearInterval(id);
  }, [info, remaining]);

  const stop = async () => {
    try {
      const tok = localStorage.getItem('token');
      await axios.post(`${API}/impersonate/stop`, {}, { headers: { Authorization: `Bearer ${tok}` } });
    } catch { /* non-blocking */ }
    // Restore original token
    const orig = localStorage.getItem('original_token_before_impersonation');
    if (orig) {
      localStorage.setItem('token', orig);
      localStorage.removeItem('original_token_before_impersonation');
    } else {
      localStorage.removeItem('token');
    }
    localStorage.removeItem('user');
    toast.success('تم إنهاء جلسة الانتحال');
    // Hard reload so AuthContext re-reads token
    window.location.href = '/app/dashboard';
  };

  if (!info) return null;

  const mmss = (ms) => {
    if (ms === null || ms === undefined) return '';
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed top-0 inset-x-0 z-[60] bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white shadow-xl animate-pulse-slow"
      role="alert"
      aria-live="polite"
      data-testid="impersonation-banner"
      style={{ borderBottom: '3px solid #fef08a' }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 py-2 flex-wrap text-sm font-bold">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎭</span>
          <span>أنتِ تتصفّحين كـ</span>
          <code className="px-2 py-0.5 rounded bg-white/25 font-mono text-sm">{info.target_username}</code>
          <span className="opacity-90 hidden sm:inline">— من قِبل</span>
          <span className="hidden sm:inline opacity-90">{info.impersonator_username}</span>
        </div>
        <div className="flex items-center gap-2">
          {remaining !== null && (
            <span className="px-2 py-1 rounded-md bg-black/25 font-mono text-sm" data-testid="impersonation-countdown">
              ⏱ {mmss(remaining)}
            </span>
          )}
          <button
            onClick={stop}
            data-testid="impersonation-stop-btn"
            className="px-4 py-1.5 rounded-lg bg-white text-rose-700 hover:bg-rose-50 font-extrabold text-sm shadow-sm"
          >
            ↩️ إنهاء والرجوع
          </button>
        </div>
      </div>
    </div>
  );
}
