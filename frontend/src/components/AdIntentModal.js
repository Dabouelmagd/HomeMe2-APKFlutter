/**
 * AdIntentModal — Entry / Exit Intent Ad Modal
 * يظهر مرة واحدة لكل جلسة عند فتح الموقع أو الخروج منه
 * Props: position = 'entry' | 'exit'
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { XMarkIcon } from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdIntentModal({ position = 'entry', delay = 3000 }) {
  const [ad, setAd]         = useState(null);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const shownRef              = useRef(false);
  const mouseRef              = useRef(false);

  const SESSION_KEY = `homeme_intent_modal_${position}`;

  const loadAd = useCallback(async () => {
    // Show once per session
    if (sessionStorage.getItem(SESSION_KEY)) return;
    try {
      const res = await axios.get(`${API}/ads/public`, {
        params: { position: 'popup_modal' }
      });
      const ads = res.data?.ads || [];
      if (ads.length > 0) {
        setAd(ads[0]);
        return true;
      }
    } catch { /* silent */ }
    return false;
  }, [SESSION_KEY]);

  const show = useCallback(async () => {
    if (shownRef.current) return;
    const hasAd = await loadAd();
    if (!hasAd) return;
    shownRef.current = true;
    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(true);

    // Track impression
    if (ad?.id) {
      axios.post(`${API}/ads/${ad.id}/impression`).catch(() => {});
    }
  }, [loadAd, SESSION_KEY, ad]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => { setVisible(false); setClosing(false); }, 300);
  };

  const handleClick = () => {
    if (ad?.id) {
      // Click with session ID for fraud protection
      const sessionId = sessionStorage.getItem('homeme_sid') || Math.random().toString(36).slice(2);
      sessionStorage.setItem('homeme_sid', sessionId);
      axios.post(`${API}/advertiser-ads/${ad.id}/track-click`, null, {
        headers: { 'X-Session-ID': sessionId }
      }).catch(() => {});
    }
    if (ad?.link_url) {
      window.open(ad.link_url, '_blank', 'noopener,noreferrer');
    }
    handleClose();
  };

  // ── Entry intent: show after delay ─────────────────────────
  useEffect(() => {
    if (position !== 'entry') return;
    const timer = setTimeout(show, delay);
    return () => clearTimeout(timer);
  }, [position, delay, show]);

  // ── Exit intent: detect mouse leaving viewport top ──────────
  useEffect(() => {
    if (position !== 'exit') return;
    const handleMouseLeave = (e) => {
      if (e.clientY <= 0 && !mouseRef.current) {
        mouseRef.current = true;
        show();
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [position, show]);

  if (!visible || !ad) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4
        bg-black/60 backdrop-blur-sm transition-opacity duration-300
        ${closing ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl
          max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-700
          transition-all duration-300
          ${closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
      >
        {/* Sponsored badge */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <span className="text-[10px] font-bold bg-black/40 text-white/80
            px-2 py-0.5 rounded-full backdrop-blur-sm">
            🏷️ إعلان ممول
          </span>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center bg-black/40
              text-white rounded-full hover:bg-black/60 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Ad image */}
        {ad.image_url && (
          <div className="cursor-pointer" onClick={handleClick}>
            <img
              src={ad.image_url}
              alt={ad.title || 'إعلان'}
              className="w-full object-cover max-h-64"
              onError={e => e.target.style.display = 'none'}
            />
          </div>
        )}

        {/* Content */}
        <div className="p-5" dir="rtl">
          {ad.title && (
            <h3 className="font-black text-gray-900 dark:text-white text-lg mb-2">
              {ad.title}
            </h3>
          )}
          {ad.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
              {ad.description}
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleClick}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600
                text-white font-black py-3 rounded-xl text-sm hover:opacity-90
                transition-opacity shadow-md"
            >
              {ad.cta_text || 'عرض التفاصيل'} →
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-3 border border-gray-200 dark:border-gray-700
                rounded-xl text-sm text-gray-600 dark:text-gray-400
                hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>

        {/* Progress bar — auto-dismiss in 15s */}
        <div className="h-0.5 bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ animation: 'shrink 15s linear forwards' }}
            onAnimationEnd={handleClose}
          />
        </div>
        <style>{`
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </div>
    </div>
  );
}
