import React, { useState, useEffect } from 'react';
import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Listens for the `beforeinstallprompt` event (Chrome / Edge / Android) and
 * surfaces a small bottom-right install card. Honors a 7-day "dismiss"
 * cookie via localStorage so users aren't nagged.
 */
const PwaInstallPrompt = () => {
  const [evt, setEvt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = parseInt(localStorage.getItem('pwa_dismiss_until') || '0', 10);
    if (dismissed && Date.now() < dismissed) return undefined;

    const handler = (e) => {
      e.preventDefault();
      setEvt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Register service worker (PWA)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!evt) return;
    evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
      setEvt(null);
    }
  };

  const dismiss = () => {
    localStorage.setItem('pwa_dismiss_until', String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setShow(false);
  };

  if (!show) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[120] bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 max-w-xs animate-in slide-in-from-bottom" data-testid="pwa-install-prompt">
      <button onClick={dismiss} className="absolute top-2 left-2 text-gray-400 hover:text-gray-600 p-1 rounded" data-testid="pwa-dismiss">
        <XMarkIcon className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-xl flex-shrink-0">
          <ArrowDownTrayIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-gray-900">ثبّتي HomeMe على شاشتك! 📱</h4>
          <p className="text-[11px] text-gray-500 mt-0.5">وصول أسرع، إشعارات فورية، يعمل بدون انترنت</p>
        </div>
      </div>
      <button
        onClick={install}
        className="mt-3 w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-bold py-2 rounded-lg"
        data-testid="pwa-install-btn"
      >
        تثبيت الآن
      </button>
    </div>
  );
};

export default PwaInstallPrompt;
