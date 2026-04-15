import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import { XMarkIcon } from '@heroicons/react/24/outline';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * InternalAdBanner - Reusable ad display component
 * Props:
 *   position: 'banner' | 'sidebar' | 'inline' | 'dashboard'
 *   maxAds: number (default 2)
 *   className: string
 *   variant: 'card' | 'slim' | 'full' (display style)
 */
const InternalAdBanner = ({ position = 'banner', maxAds = 2, className = '', variant = 'card' }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';
  const [ads, setAds] = useState([]);
  const [dismissed, setDismissed] = useState([]);

  const fetchAds = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(`${API}/ads/active`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { position, compound_id: user?.compound_id || '' }
      });
      setAds(res.data.ads || []);
    } catch { /* silent */ }
  }, [position, user?.compound_id]);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  const handleClick = async (ad) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/ads/${ad.id}/click`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch { /* silent */ }
    if (ad.link_url) window.open(ad.link_url, '_blank');
  };

  const handleDismiss = (adId) => {
    setDismissed(prev => [...prev, adId]);
  };

  const visibleAds = ads
    .filter(a => !dismissed.includes(a.id))
    .slice(0, maxAds);

  if (visibleAds.length === 0) return null;

  // Banner variant - full width horizontal
  if (variant === 'full') {
    return (
      <div className={`space-y-3 ${className}`} dir={isRTL ? 'rtl' : 'ltr'} data-testid={`ad-banner-${position}`}>
        {visibleAds.map(ad => (
          <div
            key={ad.id}
            className="relative group rounded-xl overflow-hidden cursor-pointer shadow-md hover:shadow-lg transition-all"
            onClick={() => handleClick(ad)}
          >
            {ad.image_url ? (
              <div className="relative">
                <img
                  src={ad.image_url.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${ad.image_url}` : ad.image_url}
                  alt={ad.title}
                  className="w-full h-auto object-cover"
                  style={{ maxHeight: '200px' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 start-0 end-0 p-4 text-white">
                  <h3 className="font-bold text-sm">{ad.title}</h3>
                  {ad.description && <p className="text-xs text-white/80 mt-0.5">{ad.description}</p>}
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-white">
                    <h3 className="font-bold text-sm">{ad.title}</h3>
                    {ad.description && <p className="text-xs text-white/70 mt-0.5">{ad.description}</p>}
                  </div>
                  {ad.link_url && (
                    <span className="text-xs bg-white/20 px-3 py-1 rounded-full text-white whitespace-nowrap">
                      {t('ad_learn_more', 'اعرف أكثر')}
                    </span>
                  )}
                </div>
              </div>
            )}
            <span className="absolute top-2 end-2 text-[9px] bg-black/40 text-white/70 px-1.5 py-0.5 rounded">
              {t('ad_label', 'إعلان')}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleDismiss(ad.id); }}
              className="absolute top-2 start-2 w-5 h-5 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <XMarkIcon className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
      </div>
    );
  }

  // Slim variant - compact horizontal strip
  if (variant === 'slim') {
    return (
      <div className={`space-y-2 ${className}`} dir={isRTL ? 'rtl' : 'ltr'} data-testid={`ad-banner-${position}`}>
        {visibleAds.map(ad => (
          <div
            key={ad.id}
            onClick={() => handleClick(ad)}
            className="relative group flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 border border-indigo-100 dark:border-indigo-800/40 rounded-lg px-3 py-2.5 cursor-pointer hover:shadow-sm transition-all"
          >
            {ad.image_url && (
              <img
                src={ad.image_url.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${ad.image_url}` : ad.image_url}
                alt=""
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{ad.title}</h4>
              {ad.description && <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{ad.description}</p>}
            </div>
            <span className="text-[8px] text-indigo-400 bg-indigo-100 dark:bg-indigo-800/40 px-1.5 py-0.5 rounded flex-shrink-0">
              {t('ad_label', 'إعلان')}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleDismiss(ad.id); }}
              className="absolute top-1 start-1 w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <XMarkIcon className="w-2.5 h-2.5 text-gray-500" />
            </button>
          </div>
        ))}
      </div>
    );
  }

  // Card variant (default) - rich card style
  return (
    <div className={`space-y-3 ${className}`} dir={isRTL ? 'rtl' : 'ltr'} data-testid={`ad-banner-${position}`}>
      {visibleAds.map(ad => (
        <div
          key={ad.id}
          onClick={() => handleClick(ad)}
          className="relative group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-all"
        >
          {ad.image_url && (
            <img
              src={ad.image_url.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${ad.image_url}` : ad.image_url}
              alt={ad.title}
              className="w-full h-32 object-cover"
            />
          )}
          <div className="p-3">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">{ad.title}</h3>
            {ad.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ad.description}</p>}
            {ad.link_url && (
              <span className="inline-block mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                {t('ad_learn_more', 'اعرف أكثر')} →
              </span>
            )}
          </div>
          <span className="absolute top-2 end-2 text-[9px] bg-black/30 text-white px-1.5 py-0.5 rounded">
            {t('ad_label', 'إعلان')}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(ad.id); }}
            className="absolute top-2 start-2 w-5 h-5 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <XMarkIcon className="w-3 h-3 text-white" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default InternalAdBanner;
