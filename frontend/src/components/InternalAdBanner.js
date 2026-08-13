import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { renderTemplateStyles } from '../utils/adTemplates';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * HybridAdBanner - Shows internal ads first, falls back to AdSense
 * Props:
 *   position: 'banner' | 'sidebar' | 'inline' | 'dashboard'
 *   maxAds: number (default 2)
 *   className: string
 *   variant: 'card' | 'slim' | 'full'
 *   adsenseSlot: string (AdSense ad slot ID)
 */
const InternalAdBanner = ({ position = 'banner', maxAds = 2, className = '', variant = 'card', adsenseSlot = '' }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isRTL = i18n.language === 'ar';
  const [ads, setAds] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [adSettings, setAdSettings] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const isPublicPosition = ['homepage_hero', 'homepage_mid', 'homepage_footer', 'login_page'].includes(position);

  const fetchAds = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      if (isPublicPosition) {
        // Public endpoint - no auth needed
        const res = await axios.get(`${API}/ads/public`, { params: { position } });
        setAds(res.data.ads || []);
        setAdSettings(res.data.settings || null);
      } else {
        if (!token) return;
        const [adsRes, settingsRes] = await Promise.all([
          axios.get(`${API}/ads/active`, {
            headers: { Authorization: `Bearer ${token}` },
            params: { position, compound_id: user?.compound_id || '' }
          }),
          axios.get(`${API}/ads/ad-settings`, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: null }))
        ]);
        setAds(adsRes.data.ads || []);
        setAdSettings(settingsRes.data);
      }
    } catch { /* silent */ }
  }, [position, user?.compound_id, isPublicPosition]);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  const handleClick = async (ad) => {
    // إذا لم يكن هناك رابط، لا تفعل شيئاً
    if (!ad.link_url || !ad.link_url.trim()) return;

    // سجّل النقرة (لا تنتظر النتيجة حتى لا تؤخر فتح الرابط)
    try {
      const token = localStorage.getItem('token');
      axios.post(`${API}/ads/${ad.id}/click`, {}, token ? { headers: { Authorization: `Bearer ${token}` } } : {}).catch(() => {});
    } catch { /* silent */ }

    // افتح الرابط في تبويب جديد — تأكدي أنه يبدأ بـ http
    let url = ad.link_url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
      url = 'https://' + url;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDismiss = (adId) => setDismissed(prev => [...prev, adId]);

  const visibleAds = ads.filter(a => !dismissed.includes(a.id)).slice(0, maxAds);

  // Check settings for this position
  const posSettings = adSettings?.positions?.[position] || { mode: 'internal_first', adsense_enabled: true, internal_enabled: true };
  const globalAdsenseEnabled = adSettings?.adsense_global_enabled !== false;

  // AdSense Policy compliance: positions that historically appear on screens
  // with little/no publisher content (auth, slim notifications widget, etc.)
  // never get AdSense fallback — only manually-curated internal ads.
  const LOW_CONTENT_POSITIONS = new Set(['login_page', 'notification', 'sidebar']);
  const adsenseAllowedForPosition = !LOW_CONTENT_POSITIONS.has(position);

  const showAdsense = globalAdsenseEnabled && posSettings.adsense_enabled && adsenseAllowedForPosition && visibleAds.length === 0;
  const showInternal = posSettings.internal_enabled !== false;

  // Nothing to show
  if (!showInternal && !showAdsense) return null;

  // For homepage positions: show placeholder inviting advertisers
  const isHomepagePos = ['homepage_hero','homepage_mid','homepage_footer'].includes(position);
  if (showInternal && visibleAds.length === 0 && !showAdsense && isHomepagePos) {
    return (
      <div className={`${className} border-2 border-dashed border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center bg-emerald-50/50 dark:bg-emerald-900/10`}>
        <p className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">📢 مساحة إعلانية متاحة</p>
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">للإعلان هنا تواصل معنا: info@datalifeai.com</p>
      </div>
    );
  }
  if (showInternal && visibleAds.length === 0 && !showAdsense) return null;

  // Show AdSense fallback
  if (showAdsense) {
    const publisherId = adSettings?.adsense_publisher_id || 'ca-pub-5928973437129941';
    return (
      <div className={`${className}`} data-testid={`adsense-${position}`}>
        <ins className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={publisherId}
          data-ad-slot={adsenseSlot || 'auto'}
          data-ad-format="auto"
          data-full-width-responsive="true"></ins>
      </div>
    );
  }

  // Show internal ads
  if (!showInternal || visibleAds.length === 0) return null;

  // Banner variant - full width SLIDESHOW
  if (variant === 'full') {
    const slideAds = visibleAds;
    const current = slideAds[currentIndex % Math.max(slideAds.length, 1)];
    if (!current) return null;

    return (
      <div
        className={`relative ${className}`}
        dir={isRTL ? 'rtl' : 'ltr'}
        data-testid={`ad-banner-${position}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Single ad display */}
        {slideAds.map((ad, idx) => (
          <div
            key={ad.id}
            className={`transition-all duration-700 ${idx === currentIndex % slideAds.length ? 'block' : 'hidden'}`}
          >
          <div className="relative group rounded-xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl hover:scale-[1.01] transition-all" onClick={() => handleClick(ad)} title={ad.link_url ? ad.link_url : ''}>
            {ad.image_url ? (
              // صورة الإعلان كاملة بدون قص — object-contain يحافظ على الأبعاد الأصلية
              (ad.media_type === 'video') || /\.(mp4|webm|mov)(\?|$)/i.test(ad.image_url) ? (
                <video src={ad.image_url.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${ad.image_url}` : ad.image_url} className="w-full block object-contain bg-gray-100" style={{ maxHeight: '320px', minHeight: '80px' }} muted loop autoPlay playsInline />
              ) : (
                <img src={ad.image_url.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${ad.image_url}` : ad.image_url} alt={ad.title} className="w-full block object-contain bg-gray-100" style={{ maxHeight: '320px', minHeight: '80px' }} />
              )
            ) : (() => {
              // بدون صورة: نعرض القالب المُختار (أو القالب الافتراضي)
              const tpl = renderTemplateStyles(ad.template_style);
              return (
                <div className={`${tpl.bg} p-5 min-h-[80px] flex items-center relative overflow-hidden`}>
                  {/* نمط زخرفي خفيف */}
                  <div className="absolute -top-4 -start-4 text-7xl opacity-10 pointer-events-none select-none">{tpl.emoji}</div>
                  <div className="absolute -bottom-4 -end-4 text-7xl opacity-10 pointer-events-none select-none">{tpl.emoji}</div>
                  <div className="flex items-center gap-3 w-full relative z-10">
                    <div className={`flex-1 ${tpl.text}`}>
                      <h3 className="font-bold text-base">{ad.title}</h3>
                      {ad.description && <p className="text-sm opacity-80 mt-1">{ad.description}</p>}
                    </div>
                    {ad.link_url && <span className={`text-xs ${tpl.accent} hover:opacity-80 transition-opacity px-4 py-2 rounded-full whitespace-nowrap font-semibold`}>{t('ad_learn_more', 'اعرف أكثر')} ←</span>}
                  </div>
                </div>
              );
            })()}
            <span className="absolute top-2 end-2 text-[9px] bg-black/50 text-white/80 px-1.5 py-0.5 rounded pointer-events-none">{t('ad_label', 'إعلان')}</span>
            <button onClick={(e) => { e.stopPropagation(); handleDismiss(ad.id); }} className="absolute top-2 start-2 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <XMarkIcon className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
        ))}

        {/* Navigation dots */}
        {slideAds.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {slideAds.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`transition-all duration-300 rounded-full ${i === currentIndex % slideAds.length ? 'bg-white w-5 h-2' : 'bg-white/50 w-2 h-2'}`}
              />
            ))}
          </div>
        )}

        {/* Prev/Next arrows */}
        {slideAds.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex(i => (i - 1 + slideAds.length) % slideAds.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white text-xl rounded-full w-8 h-8 flex items-center justify-center z-20 transition-colors"
            >&#8250;</button>
            <button
              onClick={() => setCurrentIndex(i => (i + 1) % slideAds.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white text-xl rounded-full w-8 h-8 flex items-center justify-center z-20 transition-colors"
            >&#8249;</button>
          </>
        )}
      </div>
    );
  }

  // Slim variant
  if (variant === 'slim') {
    return (
      <div className={`space-y-2 ${className}`} dir={isRTL ? 'rtl' : 'ltr'} data-testid={`ad-banner-${position}`}>
        {visibleAds.map(ad => (
          <div key={ad.id} onClick={() => handleClick(ad)} className="relative group flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg px-3 py-2.5 cursor-pointer hover:shadow-sm transition-all">
            {ad.image_url && <img src={ad.image_url.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${ad.image_url}` : ad.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-gray-800 truncate">{ad.title}</h4>
              {ad.description && <p className="text-[10px] text-gray-500 truncate">{ad.description}</p>}
            </div>
            <span className="text-[8px] text-indigo-400 bg-indigo-100 px-1.5 py-0.5 rounded flex-shrink-0">{t('ad_label', 'إعلان')}</span>
            <button onClick={(e) => { e.stopPropagation(); handleDismiss(ad.id); }} className="absolute top-1 start-1 w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <XMarkIcon className="w-2.5 h-2.5 text-gray-500" />
            </button>
          </div>
        ))}
      </div>
    );
  }

  // Card variant (default)
  return (
    <div className={`space-y-3 ${className}`} dir={isRTL ? 'rtl' : 'ltr'} data-testid={`ad-banner-${position}`}>
      {visibleAds.map(ad => (
        <div key={ad.id} onClick={() => handleClick(ad)} className="relative group bg-white rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-all">
          {ad.image_url && <img src={ad.image_url.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${ad.image_url}` : ad.image_url} alt={ad.title} className="w-full block object-contain bg-gray-50" style={{ maxHeight: '280px', minHeight: '120px' }} />}
          <div className="p-3">
            <h3 className="font-bold text-sm text-gray-900">{ad.title}</h3>
            {ad.description && <p className="text-xs text-gray-500 mt-1">{ad.description}</p>}
            {ad.link_url && <span className="inline-block mt-2 text-xs text-blue-600 font-medium">{t('ad_learn_more', 'اعرف أكثر')} →</span>}
          </div>
          <span className="absolute top-2 end-2 text-[9px] bg-black/30 text-white px-1.5 py-0.5 rounded">{t('ad_label', 'إعلان')}</span>
          <button onClick={(e) => { e.stopPropagation(); handleDismiss(ad.id); }} className="absolute top-2 start-2 w-5 h-5 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <XMarkIcon className="w-3 h-3 text-white" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default InternalAdBanner;
