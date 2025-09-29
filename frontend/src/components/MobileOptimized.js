import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { useTranslation } from 'react-i18next';
import {
  isMobile,
  isStandalone,
  hapticFeedback,
  addSwipeGesture,
  addNetworkListener,
  getNetworkStatus,
  adjustForKeyboard
} from '../utils/mobileUtils';
import {
  Bars3Icon,
  XMarkIcon,
  WifiIcon,
  SignalSlashIcon,
  BoltIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

const MobileOptimized = ({ children }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [networkType, setNetworkType] = useState('unknown');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Detect mobile device
    setIsMobileDevice(isMobile());

    // Network status monitoring
    const networkCleanup = addNetworkListener((status) => {
      setIsOffline(!status.online);
      setNetworkType(status.effectiveType);
    });

    // Keyboard adjustment for mobile
    const keyboardCleanup = adjustForKeyboard();

    // PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Cleanup
    return () => {
      networkCleanup();
      keyboardCleanup();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    // Swipe gestures for mobile navigation
    if (isMobileDevice && containerRef.current) {
      const cleanup = addSwipeGesture(
        containerRef.current,
        () => {
          // Swipe left - show menu
          setShowMobileMenu(true);
          hapticFeedback('light');
        },
        () => {
          // Swipe right - hide menu
          setShowMobileMenu(false);
          hapticFeedback('light');
        }
      );

      return cleanup;
    }
  }, [isMobileDevice]);

  const handleInstallPWA = async () => {
    if (installPrompt) {
      hapticFeedback('medium');
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        hapticFeedback('success');
      }
      
      setInstallPrompt(null);
    }
  };

  const MobileStatusBar = () => (
    <div className="lg:hidden bg-gray-900 text-white px-4 py-1 flex items-center justify-between text-xs">
      <div className="flex items-center space-x-2">
        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        {isOffline ? (
          <SignalSlashIcon className="w-3 h-3 text-red-400" />
        ) : (
          <div className="flex items-center space-x-1">
            <WifiIcon className="w-3 h-3 text-green-400" />
            <span className="text-green-400">{networkType}</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        {isStandalone() && (
          <DevicePhoneMobileIcon className="w-3 h-3 text-blue-400" />
        )}
        <BoltIcon className="w-3 h-3" />
      </div>
    </div>
  );

  const MobileHeader = () => (
    <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <button
        onClick={() => {
          setShowMobileMenu(!showMobileMenu);
          hapticFeedback('light');
        }}
        className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      >
        {showMobileMenu ? (
          <XMarkIcon className="w-6 h-6" />
        ) : (
          <Bars3Icon className="w-6 h-6" />
        )}
      </button>
      
      <div className="flex items-center">
        <img
          src="/icons/icon-192x192.png"
          alt="HomeMe"
          className="w-8 h-8 mr-2"
        />
        <h1 className="text-lg font-semibold text-center text-gray-900 text-center">HomeMe</h1>
      </div>
      
      <div className="flex items-center space-x-2">
        {installPrompt && (
          <button
            onClick={handleInstallPWA}
            className="p-2 bg-blue-600 text-white rounded-full text-xs"
            title={t('install_app')}
          >
            📱
          </button>
        )}
        
        {isOffline && (
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>
    </div>
  );

  const OfflineBanner = () => (
    isOffline ? (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <div className="flex">
          <SignalSlashIcon className="w-5 h-5 text-yellow-400" />
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              {t('offline_mode')} - {t('some_features_limited')}
            </p>
          </div>
        </div>
      </div>
    ) : null
  );

  const MobileSafeArea = ({ children }) => (
    <div 
      className="min-h-screen"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {children}
    </div>
  );

  if (!isMobileDevice) {
    return children;
  }

  return (
    <MobileSafeArea>
      <div ref={containerRef} className="min-h-screen bg-gray-50">
        <MobileStatusBar />
        <MobileHeader />
        <OfflineBanner />
        
        {/* Mobile Menu Overlay */}
        {showMobileMenu && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
            onClick={() => {
              setShowMobileMenu(false);
              hapticFeedback('light');
            }}
          >
            <div 
              className="bg-white w-80 h-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile menu content would go here */}
              <div className="p-4">
                <h2 className="text-lg font-semibold text-center mb-4">{t('menu')}</h2>
                {/* Navigation items */}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className={`transition-all duration-300 ${showMobileMenu ? 'opacity-50' : 'opacity-100'}`}>
          {children}
        </div>

        {/* Mobile Bottom Navigation (if needed) */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
          <div className="flex justify-around">
            {/* Quick action buttons would go here */}
          </div>
        </div>

        {/* PWA Install Banner */}
        {installPrompt && !isStandalone() && (
          <div className="fixed bottom-20 left-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{t('install_app')}</h3>
                <p className="text-sm opacity-90">{t('install_app_description')}</p>
              </div>
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => setInstallPrompt(null)}
                  className="px-3 py-1 bg-blue-700 rounded text-sm"
                >
                  {t('later')}
                </button>
                <button
                  onClick={handleInstallPWA}
                  className="px-3 py-1 bg-white text-blue-600 rounded text-sm font-medium"
                >
                  {t('install')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MobileSafeArea>
  );
};

export default MobileOptimized;