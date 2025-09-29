import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  DevicePhoneMobileIcon,
  WifiIcon,
  BellIcon
} from '@heroicons/react/24/outline';

const PWAInstallPrompt = () => {
  const { t } = useTranslation();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed/standalone
    const checkInstallStatus = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone === true;
      setIsStandalone(standalone);
      setIsInstalled(standalone);
    };

    checkInstallStatus();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      
      // Show prompt after a delay if not already shown
      setTimeout(() => {
        const lastPromptTime = localStorage.getItem('pwa-install-prompt-time');
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        if (!lastPromptTime || (now - parseInt(lastPromptTime)) > oneDayMs) {
          setShowPrompt(true);
        }
      }, 3000);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setInstallPrompt(null);
      toast.success(t('app_installed_successfully'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [t]);

  const handleInstall = async () => {
    if (!installPrompt) return;

    try {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success(t('installing_app'));
      } else {
        toast.info(t('installation_cancelled'));
      }
      
      setShowPrompt(false);
      setInstallPrompt(null);
      localStorage.setItem('pwa-install-prompt-time', Date.now().toString());
    } catch (error) {
      console.error('Installation error:', error);
      toast.error(t('installation_failed'));
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-prompt-time', Date.now().toString());
  };

  const handleRemindLater = () => {
    setShowPrompt(false);
    // Set reminder for 1 hour from now
    const oneHourFromNow = Date.now() + (60 * 60 * 1000);
    localStorage.setItem('pwa-install-prompt-time', (oneHourFromNow - 24 * 60 * 60 * 1000).toString());
  };

  // Don't show if already installed or no install prompt available
  if (isInstalled || !installPrompt || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DevicePhoneMobileIcon className="w-6 h-6 text-white" />
              <h3 className="text-lg font-semibold text-center text-white">{t('install_homeme_app')}</h3>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-600 text-sm mb-4">
            {t('install_app_benefits_description')}
          </p>

          {/* Benefits List */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <WifiIcon className="w-4 h-4 text-green-500" />
              <span>{t('works_offline')}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <BellIcon className="w-4 h-4 text-blue-500" />
              <span>{t('instant_notifications')}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <ArrowDownTrayIcon className="w-4 h-4 text-purple-500" />
              <span>{t('faster_loading')}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <DevicePhoneMobileIcon className="w-4 h-4 text-orange-500" />
              <span>{t('native_app_experience')}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={handleInstall}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              <span>{t('install_now')}</span>
            </button>
            <button
              onClick={handleRemindLater}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
            >
              {t('later')}
            </button>
          </div>

          {/* Installation Instructions for iOS Safari */}
          {/iPad|iPhone|iPod/.test(navigator.userAgent) && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800 font-medium mb-1">
                {t('ios_install_instructions')}:
              </p>
              <p className="text-xs text-blue-700">
                {t('tap_share_button')} → {t('add_to_home_screen')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;