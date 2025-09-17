import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DevicePhoneMobileIcon,
  XMarkIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const PWAInstallPrompt = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if PWA is supported
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show install prompt after 5 seconds delay
      setTimeout(() => {
        if (!isInstalled) {
          setShowPrompt(true);
        }
      }, 5000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA: App was installed');
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('PWA: Service Worker registered:', registration);
          
          // Listen for service worker messages
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'NAVIGATE_TO') {
              window.location.href = event.data.url;
            }
          });
        })
        .catch(error => {
          console.error('PWA: Service Worker registration failed:', error);
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback for browsers that don't support the install prompt
      alert(t('pwa.installInstructions'));
      return;
    }

    try {
      // Show the install prompt
      const result = await deferredPrompt.prompt();
      console.log('PWA: Install prompt result:', result.outcome);

      if (result.outcome === 'accepted') {
        setIsInstalled(true);
        setShowPrompt(false);
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error('PWA: Install error:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if not supported, already installed, or dismissed
  if (!isSupported || isInstalled || !showPrompt || sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow-2xl p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white/70 hover:text-white"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
        
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <DevicePhoneMobileIcon className="h-7 w-7 text-white" />
            </div>
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">
              {t('pwa.installHomeMe')}
            </h3>
            <p className="text-white/90 text-sm mb-4">
              {t('pwa.installDescription')}
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={handleInstall}
                className="flex items-center space-x-2 bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-white/90 transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>{t('pwa.install')}</span>
              </button>
              
              <button
                onClick={handleDismiss}
                className="px-4 py-2 border border-white/30 rounded-lg text-white hover:bg-white/10 transition-colors"
              >
                {t('pwa.later')}
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex items-center space-x-4 text-white/70 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>{t('pwa.feature1')}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>{t('pwa.feature2')}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>{t('pwa.feature3')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;