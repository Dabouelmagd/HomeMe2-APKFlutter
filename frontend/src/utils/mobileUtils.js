// Mobile utility functions for enhanced mobile experience

export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isAndroid = () => {
  return /Android/.test(navigator.userAgent);
};

export const isStandalone = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
};

export const canInstallPWA = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Haptic feedback for mobile devices
export const hapticFeedback = (type = 'light') => {
  if (navigator.vibrate) {
    switch (type) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(20);
        break;
      case 'heavy':
        navigator.vibrate([10, 10, 30]);
        break;
      case 'success':
        navigator.vibrate([10, 5, 10]);
        break;
      case 'error':
        navigator.vibrate([30, 10, 30, 10, 30]);
        break;
      default:
        navigator.vibrate(10);
    }
  }
};

// Screen orientation utilities
export const lockOrientation = (orientation = 'portrait') => {
  if (screen.orientation && screen.orientation.lock) {
    return screen.orientation.lock(orientation);
  }
  return Promise.resolve();
};

export const unlockOrientation = () => {
  if (screen.orientation && screen.orientation.unlock) {
    screen.orientation.unlock();
  }
};

// Safe area utilities for notched devices
export const getSafeAreaInsets = () => {
  const computedStyle = getComputedStyle(document.documentElement);
  return {
    top: computedStyle.getPropertyValue('--sat') || '0px',
    right: computedStyle.getPropertyValue('--sar') || '0px',
    bottom: computedStyle.getPropertyValue('--sab') || '0px',
    left: computedStyle.getPropertyValue('--sal') || '0px'
  };
};

// Touch gesture utilities
export const addSwipeGesture = (element, onSwipeLeft, onSwipeRight, threshold = 50) => {
  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;

  const handleTouchStart = (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    endX = e.changedTouches[0].clientX;
    endY = e.changedTouches[0].clientY;
    
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    
    // Check if horizontal swipe is more significant than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchend', handleTouchEnd, { passive: true });

  // Return cleanup function
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchend', handleTouchEnd);
  };
};

// Keyboard utilities for mobile
export const adjustForKeyboard = () => {
  const viewport = document.querySelector('meta[name=viewport]');
  
  const handleFocusIn = () => {
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
    }
  };

  const handleFocusOut = () => {
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes');
    }
  };

  document.addEventListener('focusin', handleFocusIn);
  document.addEventListener('focusout', handleFocusOut);

  return () => {
    document.removeEventListener('focusin', handleFocusIn);
    document.removeEventListener('focusout', handleFocusOut);
  };
};

// Network status utilities
export const getNetworkStatus = () => {
  return {
    online: navigator.onLine,
    connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection,
    effectiveType: navigator.connection?.effectiveType || 'unknown'
  };
};

export const addNetworkListener = (callback) => {
  const handleNetworkChange = () => {
    callback(getNetworkStatus());
  };

  window.addEventListener('online', handleNetworkChange);
  window.addEventListener('offline', handleNetworkChange);

  if (navigator.connection) {
    navigator.connection.addEventListener('change', handleNetworkChange);
  }

  return () => {
    window.removeEventListener('online', handleNetworkChange);
    window.removeEventListener('offline', handleNetworkChange);
    if (navigator.connection) {
      navigator.connection.removeEventListener('change', handleNetworkChange);
    }
  };
};

// PWA utilities
export const addToHomeScreen = () => {
  // This will be set by the PWA install prompt event
  if (window.deferredPrompt) {
    window.deferredPrompt.prompt();
    return window.deferredPrompt.userChoice;
  }
  return Promise.reject('Install prompt not available');
};

// Battery status (if supported)
export const getBatteryStatus = async () => {
  if ('getBattery' in navigator) {
    try {
      const battery = await navigator.getBattery();
      return {
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      };
    } catch (error) {
      console.warn('Battery API not supported');
      return null;
    }
  }
  return null;
};

// Performance monitoring for mobile
export const getPerformanceMetrics = () => {
  if ('performance' in window && 'memory' in performance) {
    return {
      memory: {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      },
      navigation: performance.getEntriesByType('navigation')[0],
      connection: navigator.connection
    };
  }
  return null;
};

export default {
  isMobile,
  isIOS,
  isAndroid,
  isStandalone,
  canInstallPWA,
  hapticFeedback,
  lockOrientation,
  unlockOrientation,
  getSafeAreaInsets,
  addSwipeGesture,
  adjustForKeyboard,
  getNetworkStatus,
  addNetworkListener,
  addToHomeScreen,
  getBatteryStatus,
  getPerformanceMetrics
};