import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';

const MobileAppPage = () => {
  const { t } = useTranslation();
  const [deviceType, setDeviceType] = useState('unknown');
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    // Detect device type
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    if (/android/i.test(userAgent)) {
      setDeviceType('android');
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      setDeviceType('ios');
    } else {
      setDeviceType('desktop');
    }
  }, []);

  const getDownloadUrl = (platform) => {
    // In production, these would be actual app store links
    const urls = {
      android: 'https://play.google.com/store/apps/details?id=com.homeme.app',
      ios: 'https://apps.apple.com/app/homeme/id123456789',
      apk: '/downloads/homeme-app.apk' // Direct APK download
    };
    return urls[platform];
  };

  const generateQRCode = (text) => {
    // Simple QR code generation for demo purposes
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
  };

  const features = [
    {
      icon: '🔔',
      title: t('Real-time Notifications'),
      description: t('Get instant notifications for visitor arrivals, maintenance updates, and community announcements')
    },
    {
      icon: '📱',
      title: t('QR Code Access'),
      description: t('Generate QR codes for guests and manage visitor access with ease')
    },
    {
      icon: '💬',
      title: t('Community Chat'),
      description: t('Chat with neighbors, security, and maintenance staff in real-time')
    },
    {
      icon: '💳',
      title: t('Mobile Payments'),
      description: t('Pay monthly fees, maintenance costs, and other services directly from your phone')
    },
    {
      icon: '🗺️',
      title: t('Interactive Maps'),
      description: t('Navigate compound facilities and find nearby services with GPS integration')
    },
    {
      icon: '⭐',
      title: t('Rate & Review'),
      description: t('Rate services and provide feedback to help improve community experience')
    }
  ];

  const screenshots = [
    {
      src: 'https://via.placeholder.com/300x600/4285F4/FFFFFF?text=Login+Screen',
      alt: t('Login Screen'),
      title: t('Secure Login')
    },
    {
      src: 'https://via.placeholder.com/300x600/34A853/FFFFFF?text=Dashboard',
      alt: t('Dashboard'),
      title: t('Dashboard Overview')
    },
    {
      src: 'https://via.placeholder.com/300x600/EA4335/FFFFFF?text=Guests',
      alt: t('Guest Management'),
      title: t('Guest Management')
    },
    {
      src: 'https://via.placeholder.com/300x600/FBBC04/FFFFFF?text=Notifications',
      alt: t('Notifications'),
      title: t('Notifications')
    }
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="relative px-6 py-16 sm:py-24 lg:px-8">
            <div className="text-center">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white bg-opacity-20 rounded-full mb-4">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h1 className="text-4xl font-bold sm:text-5xl lg:text-6xl">
                  {t('HomeMe Mobile App')}
                </h1>
                <p className="mt-6 text-xl sm:text-2xl max-w-3xl mx-auto">
                  {t('Manage your community life on-the-go with our powerful mobile application')}
                </p>
              </div>

              {/* Download Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-8">
                <a
                  href={getDownloadUrl('android')}
                  className="flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors min-w-48"
                >
                  <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.523 15.3414c-.5665 0-1.0263-.4598-1.0263-1.0263s.4598-1.0263 1.0263-1.0263 1.0263.4598 1.0263 1.0263-.4598 1.0263-1.0263 1.0263zm-11.046 0c-.5665 0-1.0263-.4598-1.0263-1.0263s.4598-1.0263 1.0263-1.0263 1.0263.4598 1.0263 1.0263-.4598 1.0263-1.0263 1.0263zm13.008-6.9931V3.2035l-1.5563-1.5563L16.4121 3.16l1.0736 1.0736V8.348zm-14.97 0V4.2336L5.5879 3.16L4.0744 1.6465L2.5181 3.2035v5.1449zm15.96 2.2622h-3.9929v2.2622h3.9929V10.6105zm-15.96 0h3.9929v2.2622H4.5147V10.6105zm15.96 4.5244V18.64l-1.5563 1.5563L16.4121 18.68l1.0736-1.0736v-4.1155zm-14.97 0v4.1155L5.5879 18.68l-1.5135 1.5165L2.5181 18.64v-3.5051z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs">{t('Get it on')}</div>
                    <div className="font-semibold">Google Play</div>
                  </div>
                </a>

                <a
                  href={getDownloadUrl('ios')}
                  className="flex items-center justify-center px-6 py-3 bg-black hover:bg-gray-800 rounded-lg transition-colors min-w-48"
                >
                  <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  <div className="text-left">
                    <div className="text-xs">{t('Download on the')}</div>
                    <div className="font-semibold">App Store</div>
                  </div>
                </a>
              </div>

              {/* Direct APK Download */}
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={() => setShowQRCode(!showQRCode)}
                  className="text-white hover:text-blue-200 underline text-sm"
                >
                  {t('Show QR Code for Direct Download')}
                </button>
                <span className="text-white text-sm">|</span>
                <a
                  href={getDownloadUrl('apk')}
                  className="text-white hover:text-blue-200 underline text-sm"
                >
                  {t('Download APK Directly')}
                </a>
              </div>

              {/* QR Code */}
              {showQRCode && (
                <div className="mt-8 flex justify-center">
                  <div className="bg-white p-4 rounded-lg">
                    <img
                      src={generateQRCode(window.location.origin + '/downloads/homeme-app.apk')}
                      alt="QR Code for app download"
                      className="w-48 h-48"
                    />
                    <p className="text-gray-600 text-sm mt-2 text-center">
                      {t('Scan to download')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                {t('Powerful Features')}
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                {t('Everything you need to manage your community life')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="text-center p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Screenshots Section */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                {t('App Screenshots')}
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                {t('Take a look at the beautiful and intuitive interface')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {screenshots.map((screenshot, index) => (
                <div key={index} className="text-center">
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <img
                      src={screenshot.src}
                      alt={screenshot.alt}
                      className="w-full h-auto"
                    />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    {screenshot.title}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Compatibility Section */}
        <div className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                {t('Device Compatibility')}
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                {t('Works seamlessly across all your devices')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-8 rounded-lg bg-blue-50">
                <div className="text-5xl mb-4">📱</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('Mobile Phones')}
                </h3>
                <p className="text-gray-600">
                  {t('iOS 12+ and Android 8+')}
                </p>
              </div>

              <div className="text-center p-8 rounded-lg bg-green-50">
                <div className="text-5xl mb-4">💻</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('Web Browser')}
                </h3>
                <p className="text-gray-600">
                  {t('Works in all modern browsers')}
                </p>
              </div>

              <div className="text-center p-8 rounded-lg bg-purple-50">
                <div className="text-5xl mb-4">📱</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {t('Tablets')}
                </h3>
                <p className="text-gray-600">
                  {t('Optimized for tablet experience')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="py-16 bg-blue-600 text-white">
          <div className="max-w-4xl mx-auto text-center px-6 lg:px-8">
            <h2 className="text-3xl font-bold sm:text-4xl mb-6">
              {t('Ready to Get Started?')}
            </h2>
            <p className="text-xl mb-8">
              {t('Download the HomeMe app today and experience the future of community living')}
            </p>
            
            {deviceType === 'android' && (
              <a
                href={getDownloadUrl('android')}
                className="inline-flex items-center px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
              >
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 15.3414c-.5665 0-1.0263-.4598-1.0263-1.0263s.4598-1.0263 1.0263-1.0263 1.0263.4598 1.0263 1.0263-.4598 1.0263-1.0263 1.0263z"/>
                </svg>
                {t('Download for Android')}
              </a>
            )}

            {deviceType === 'ios' && (
              <a
                href={getDownloadUrl('ios')}
                className="inline-flex items-center px-8 py-4 bg-black hover:bg-gray-800 rounded-lg font-semibold transition-colors"
              >
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79z"/>
                </svg>
                {t('Download for iOS')}
              </a>
            )}

            {deviceType === 'desktop' && (
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                <a
                  href={getDownloadUrl('android')}
                  className="flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.523 15.3414c-.5665 0-1.0263-.4598-1.0263-1.0263s.4598-1.0263 1.0263-1.0263z"/>
                  </svg>
                  {t('Get Android App')}
                </a>
                <a
                  href={getDownloadUrl('ios')}
                  className="flex items-center px-6 py-3 bg-black hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47z"/>
                  </svg>
                  {t('Get iOS App')}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default MobileAppPage;