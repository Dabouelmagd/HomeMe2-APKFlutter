import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { AD_TEMPLATES, renderTemplateStyles, DEFAULT_TEMPLATE } from '../../utils/adTemplates';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const getToken = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

/**
 * المقاسات الموصى بها لكل موقع (width x height)
 */
const RECOMMENDED_SIZES = {
  homepage_hero: { w: 970, h: 250, minW: 728, minH: 90 },
  homepage_mid: { w: 728, h: 90, minW: 468, minH: 60 },
  homepage_footer: { w: 728, h: 90, minW: 320, minH: 50 },
  banner: { w: 970, h: 250, minW: 728, minH: 90 },
  sidebar: { w: 300, h: 250, minW: 160, minH: 600 },
  dashboard: { w: 336, h: 280, minW: 300, minH: 250 },
  inline: { w: 728, h: 90, minW: 320, minH: 50 },
  login_page: { w: 728, h: 90, minW: 300, minH: 250 },
  popup: { w: 400, h: 300, minW: 300, minH: 250 },
  notification: { w: 728, h: 90, minW: 320, minH: 50 },
  splash: { w: 320, h: 480, minW: 300, minH: 250 },
  services_page: { w: 728, h: 90, minW: 300, minH: 250 },
};

const MAX_TITLE_LENGTHS = {
  homepage_hero: 60, homepage_mid: 50, homepage_footer: 40, banner: 60,
  sidebar: 25, dashboard: 35, inline: 45, login_page: 40,
  popup: 30, notification: 40, splash: 25, services_page: 40,
};

/**
 * يقرأ أبعاد الصورة محلياً (قبل الرفع) ويرجع {w, h} أو null للفيديو
 */
const readImageDimensions = (file) => new Promise((resolve, reject) => {
  if (file.type.startsWith('video/')) { resolve(null); return; }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { URL.revokeObjectURL(url); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('invalid_image')); };
  img.src = url;
});

/**
 * يتحقق من الحد الأدنى لأبعاد الصورة حسب موقع الإعلان
 * يرجع {ok: true} لو القياس مقبول، أو {ok: false, message: '...'} لو مرفوض
 */
const validateImageDimensions = async (file, position, t) => {
  try {
    const dims = await readImageDimensions(file);
    if (!dims) return { ok: true }; // فيديو - نتخطى
    const rec = RECOMMENDED_SIZES[position];
    if (!rec) return { ok: true };
    if (dims.w < rec.minW || dims.h < rec.minH) {
      return {
        ok: false,
        message: t('sa_img_too_small', `الصورة ${dims.w}×${dims.h} صغيرة جداً. المقاس الأدنى المطلوب: ${rec.minW}×${rec.minH} — اختاري صورة أكبر`)
      };
    }
    return { ok: true, dims };
  } catch {
    return { ok: false, message: t('sa_img_invalid', 'ملف الصورة غير صالح') };
  }
};

/**
 * SizesTooltip — زر معلومات بجنب حقل الرفع يعرض جدول كامل بكل المقاسات المطلوبة
 */
const SizesTooltip = ({ t, currentPosition }) => {
  const [open, setOpen] = useState(false);
  const POSITION_LABELS = {
    homepage_hero: t('pos_homepage_hero', 'الصفحة الرئيسية - هيرو'),
    homepage_mid: t('pos_homepage_mid', 'الصفحة الرئيسية - وسط'),
    homepage_footer: t('pos_homepage_footer', 'الصفحة الرئيسية - أسفل'),
    banner: t('sa_pos_banner', 'بانر أعلى التطبيق'),
    sidebar: t('sa_pos_sidebar', 'الشريط الجانبي'),
    dashboard: t('sa_pos_dashboard', 'لوحة تحكم المقيمين'),
    inline: t('sa_pos_inline', 'داخل المحتوى'),
    login_page: t('pos_login', 'صفحة تسجيل الدخول'),
    popup: t('pos_popup', 'منبثق (Popup)'),
    notification: t('pos_notification', 'إعلان إشعارات'),
    splash: t('pos_splash', 'شاشة التحميل'),
    services_page: t('pos_services', 'صفحة الخدمات'),
  };
  return (
    <span className="relative inline-block" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-bold hover:bg-indigo-400 transition-colors"
        title={t('sa_sizes_help', 'عرض جدول المقاسات لكل موقع')}
        data-testid="sizes-tooltip-trigger"
        aria-label="sizes help"
      >?</button>
      {open && (
        <div
          className="absolute z-50 top-6 start-0 w-96 bg-gray-900 border border-indigo-500/40 rounded-lg shadow-2xl p-3 text-right"
          dir="rtl"
          data-testid="sizes-tooltip-content"
        >
          <p className="text-[11px] font-bold text-indigo-300 mb-2 flex items-center gap-1">
            <span>📐</span>
            <span>{t('sa_sizes_table_title', 'المقاسات المطلوبة لكل موقع')}</span>
          </p>
          <div className="max-h-80 overflow-y-auto space-y-1">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-gray-900">
                <tr className="text-indigo-200 border-b border-indigo-800">
                  <th className="py-1 font-semibold text-right">{t('sa_position', 'الموقع')}</th>
                  <th className="py-1 font-semibold text-center">{t('sa_preview_shape', 'الشكل')}</th>
                  <th className="py-1 font-semibold">{t('sa_min_size', 'الأدنى')}</th>
                  <th className="py-1 font-semibold">{t('sa_ideal', 'المثالي')}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(RECOMMENDED_SIZES).map(([pos, s]) => {
                  const isCurrent = pos === currentPosition;
                  // حساب أبعاد الـ thumbnail مع الحفاظ على النسبة الحقيقية
                  // الحد الأقصى: 48px عرض أو 28px ارتفاع — أيهما يحافظ على النسبة
                  const maxW = 48, maxH = 28;
                  const ratio = s.w / s.h;
                  let tw, th;
                  if (ratio >= maxW / maxH) {
                    tw = maxW;
                    th = Math.round(maxW / ratio);
                  } else {
                    th = maxH;
                    tw = Math.round(maxH * ratio);
                  }
                  return (
                    <tr
                      key={pos}
                      className={`border-b border-gray-800 ${isCurrent ? 'bg-indigo-900/40 text-indigo-200 font-bold' : 'text-gray-300'}`}
                      data-testid={`sizes-row-${pos}`}
                    >
                      <td className="py-1.5 pe-1">{POSITION_LABELS[pos] || pos}</td>
                      <td className="py-1.5">
                        <div className="flex items-center justify-center">
                          <div
                            className={`rounded-sm border ${isCurrent ? 'border-indigo-300 bg-gradient-to-br from-indigo-500/60 to-fuchsia-500/60' : 'border-gray-600 bg-gradient-to-br from-gray-600/50 to-gray-700/50'} flex items-center justify-center`}
                            style={{ width: `${tw}px`, height: `${th}px`, minWidth: '6px', minHeight: '6px' }}
                            title={`${s.w}×${s.h} (${ratio.toFixed(2)}:1)`}
                            data-testid={`sizes-thumb-${pos}`}
                          >
                            {tw >= 20 && th >= 12 && <span className="text-[7px] text-white/70 font-mono leading-none">{ratio.toFixed(1)}:1</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-1.5 text-center font-mono text-amber-300">{s.minW}×{s.minH}</td>
                      <td className="py-1.5 text-center font-mono text-emerald-300">{s.w}×{s.h}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[9px] text-gray-500 mt-2 border-t border-gray-800 pt-2">
            💡 {t('sa_sizes_tip', 'الشكل يعرض النسبة الحقيقية للمقاس · الصور الأصغر من الحد الأدنى سيتم رفضها تلقائياً')}
          </p>
        </div>
      )}
    </span>
  );
};

/**
 * AdHealthChecker — فحص ذكي للصورة + الرابط + العنوان
 */
const AdHealthChecker = ({ ad, t }) => {
  const [imgDims, setImgDims] = useState(null);
  const [linkCheck, setLinkCheck] = useState(null); // null | 'checking' | {ok, status, error}
  const resolvedSrc = ad?.image_url
    ? (ad.image_url.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${ad.image_url}` : ad.image_url)
    : null;

  // فحص أبعاد الصورة عند تغيّرها
  useEffect(() => {
    setImgDims(null);
    if (!resolvedSrc) return;
    if ((ad?.media_type === 'video') || /\.(mp4|webm|mov)(\?|$)/i.test(resolvedSrc)) return;
    const img = new Image();
    img.onload = () => setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setImgDims({ error: true });
    img.src = resolvedSrc;
  }, [resolvedSrc, ad?.media_type]);

  // فحص الرابط (debounced — بعد ثانية من التوقف عن الكتابة)
  useEffect(() => {
    if (!ad?.link_url || !ad.link_url.trim()) {
      setLinkCheck(null);
      return;
    }
    setLinkCheck('checking');
    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API}/ads/check-url`, {
          params: { url: ad.link_url },
          headers: { Authorization: `Bearer ${token}` },
        });
        setLinkCheck(res.data);
      } catch {
        setLinkCheck({ ok: false, error: 'request_failed' });
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [ad?.link_url]);

  const pos = ad?.position || 'banner';
  const rec = RECOMMENDED_SIZES[pos];
  const maxTitleLen = MAX_TITLE_LENGTHS[pos] || 50;
  const titleLen = (ad?.title || '').length;

  const warnings = [];
  const infos = [];

  // فحص الصورة
  if (resolvedSrc && imgDims && !imgDims.error) {
    if (rec && (imgDims.w < rec.minW || imgDims.h < rec.minH)) {
      warnings.push({
        icon: '🖼️',
        msg: t('chk_img_small', `الصورة ${imgDims.w}×${imgDims.h} أصغر من الحد الأدنى المطلوب ${rec.minW}×${rec.minH} — قد تظهر ضبابية`),
      });
    } else if (rec && (imgDims.w < rec.w || imgDims.h < rec.h)) {
      infos.push({
        icon: '💡',
        msg: t('chk_img_ok_small', `الصورة ${imgDims.w}×${imgDims.h} مقبولة. المقاس المثالي ${rec.w}×${rec.h} لأفضل جودة`),
      });
    }
  } else if (imgDims?.error) {
    warnings.push({ icon: '❌', msg: t('chk_img_broken', 'فشل تحميل الصورة — تأكدي من الرابط') });
  }

  // فحص العنوان
  if (titleLen > maxTitleLen) {
    warnings.push({
      icon: '📝',
      msg: t('chk_title_long', `العنوان ${titleLen} حرف، سيُقطع عند ${maxTitleLen} حرف في هذا المكان`),
    });
  } else if (titleLen > 0 && titleLen > maxTitleLen - 10) {
    infos.push({
      icon: 'ℹ️',
      msg: t('chk_title_near_limit', `العنوان قريب من الحد الأقصى (${titleLen}/${maxTitleLen})`),
    });
  }

  // فحص الرابط
  if (linkCheck === 'checking') {
    infos.push({ icon: '⏳', msg: t('chk_link_checking', 'جاري فحص الرابط...') });
  } else if (linkCheck && !linkCheck.ok) {
    const errMap = {
      timeout: t('chk_link_timeout', 'الرابط لا يستجيب (timeout)'),
      connection_failed: t('chk_link_no_host', 'الرابط غير موجود أو الدومين خطأ'),
      empty: t('chk_link_empty', 'الرابط فارغ'),
    };
    const msg = linkCheck.status >= 400
      ? t('chk_link_404', `الرابط لا يعمل (خطأ ${linkCheck.status})`)
      : errMap[linkCheck.error] || t('chk_link_failed', 'الرابط لا يعمل');
    warnings.push({ icon: '🔗', msg });
  } else if (linkCheck?.ok) {
    infos.push({ icon: '✅', msg: t('chk_link_ok', `الرابط يعمل (${linkCheck.status})`) });
  }

  if (warnings.length === 0 && infos.length === 0) {
    // إذا لم يُدخل شيء، لا نعرض شيئاً
    if (!ad?.title && !resolvedSrc && !ad?.link_url) return null;
    return (
      <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-[11px] text-emerald-700 flex items-center gap-2" data-testid="ad-health-ok">
        <span>✅</span>
        <span>{t('chk_all_good', 'كل شيء يبدو ممتازاً — يمكنك الحفظ')}</span>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1" data-testid="ad-health-checker">
      {warnings.map((w, i) => (
        <div key={`w${i}`} className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[11px] text-amber-800 flex items-start gap-2">
          <span className="flex-shrink-0">{w.icon}</span>
          <span>{w.msg}</span>
        </div>
      ))}
      {infos.map((info, i) => (
        <div key={`i${i}`} className={`border rounded-lg p-2 text-[11px] flex items-start gap-2 ${info.icon === '✅' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
          <span className="flex-shrink-0">{info.icon}</span>
          <span>{info.msg}</span>
        </div>
      ))}
    </div>
  );
};

const DEFAULT_TEMPLATE_KEY = DEFAULT_TEMPLATE;

/**
 * TemplatePicker — يظهر فقط عندما لا يوجد صورة مرفوعة
 */
const TemplatePicker = ({ ad, onChange, t }) => {
  if (ad?.image_url) return null; // الصورة لها الأولوية
  const current = ad?.template_style || DEFAULT_TEMPLATE_KEY;
  return (
    <div className="col-span-1 md:col-span-2 bg-gray-900/50 border border-indigo-500/30 rounded-xl p-3" data-testid="template-picker">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-gray-300 font-bold flex items-center gap-1.5">
          🎨 {t('sa_template_style', 'قالب التصميم (بدون صورة)')}
        </label>
        <span className="text-[9px] text-gray-500">{t('sa_template_hint', 'اختاري شكلاً جاهزاً عندما لا يكون هناك صورة')}</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {Object.entries(AD_TEMPLATES).map(([key, tpl]) => {
          const isSelected = current === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`relative rounded-lg p-2 transition-all ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-gray-900 scale-105' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
              data-testid={`template-${key}`}
              title={tpl.name}
            >
              <div className={`${tpl.bg} h-10 rounded flex items-center justify-center text-lg relative overflow-hidden`}>
                <span className="opacity-60">{tpl.emoji}</span>
                {isSelected && <span className="absolute top-0.5 end-0.5 bg-white text-indigo-600 text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">✓</span>}
              </div>
              <p className={`text-[9px] mt-1 text-center truncate ${isSelected ? 'text-indigo-300 font-bold' : 'text-gray-400'}`}>{tpl.name}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const AdPreview = ({ ad, t }) => {
  const resolvedSrc = ad?.image_url
    ? (ad.image_url.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${ad.image_url}` : ad.image_url)
    : null;

  const isVideo = (ad?.media_type === 'video') || (resolvedSrc && /\.(mp4|webm|mov)(\?|$)/i.test(resolvedSrc));

  // المواقع التي تستخدم variant=full (شريط عريض بملء العرض)
  const fullPositions = ['homepage_hero', 'homepage_mid', 'homepage_footer', 'banner', 'login_page', 'notification'];
  // المواقع التي تستخدم card (مربع)
  const cardPositions = ['dashboard', 'services_page', 'splash', 'popup'];
  // سايدبار / inline / sidebar = slim
  const slimPositions = ['sidebar', 'inline'];

  const pos = ad?.position || 'banner';
  const variant = fullPositions.includes(pos) ? 'full' : cardPositions.includes(pos) ? 'card' : slimPositions.includes(pos) ? 'slim' : 'full';

  const commonWrapper = "relative rounded-xl overflow-hidden shadow-md";
  const adLabel = <span className="absolute top-2 end-2 text-[9px] bg-black/50 text-white/80 px-1.5 py-0.5 rounded pointer-events-none z-10">{t('ad_label', 'إعلان')}</span>;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-dashed border-indigo-300 p-4" dir="rtl" data-testid="ad-preview">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">{t('ad_preview_label', '👁️ معاينة مباشرة')}</span>
        <span className="text-[9px] text-gray-500">{t('ad_preview_variant', 'الشكل')}: {variant}</span>
      </div>

      {!ad?.title && !resolvedSrc ? (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <div className="text-center">
            <span className="text-3xl">🖼️</span>
            <p className="text-xs mt-1">{t('ad_preview_empty', 'ابدئي بإدخال العنوان أو رفع الصورة لرؤية المعاينة')}</p>
          </div>
        </div>
      ) : variant === 'full' ? (
        <div className={commonWrapper}>
          {resolvedSrc ? (
            isVideo ? (
              <video src={resolvedSrc} className="w-full h-auto object-cover block" style={{ maxHeight: '250px' }} muted loop autoPlay playsInline />
            ) : (
              <img src={resolvedSrc} alt={ad.title} className="w-full h-auto object-cover block" style={{ maxHeight: '250px' }} />
            )
          ) : (() => {
            const tpl = renderTemplateStyles(ad?.template_style);
            return (
              <div className={`${tpl.bg} p-5 min-h-[80px] flex items-center relative overflow-hidden`}>
                <div className="absolute -top-4 -start-4 text-7xl opacity-10 pointer-events-none select-none">{tpl.emoji}</div>
                <div className="absolute -bottom-4 -end-4 text-7xl opacity-10 pointer-events-none select-none">{tpl.emoji}</div>
                <div className="flex items-center gap-3 w-full relative z-10">
                  <div className={`flex-1 ${tpl.text}`}>
                    <h3 className="font-bold text-base">{ad.title || t('ad_preview_title_ph', 'عنوان الإعلان')}</h3>
                    {ad.description && <p className="text-sm opacity-80 mt-1">{ad.description}</p>}
                  </div>
                  {ad.link_url && <span className={`text-xs ${tpl.accent} px-4 py-2 rounded-full whitespace-nowrap font-semibold`}>{t('ad_learn_more', 'اعرف أكثر')} ←</span>}
                </div>
              </div>
            );
          })()}
          {adLabel}
        </div>
      ) : variant === 'card' ? (
        <div className={`${commonWrapper} bg-white max-w-sm mx-auto`}>
          {resolvedSrc && (
            isVideo ? (
              <video src={resolvedSrc} className="w-full h-32 object-cover" muted loop autoPlay playsInline />
            ) : (
              <img src={resolvedSrc} alt={ad.title} className="w-full h-32 object-cover" />
            )
          )}
          <div className="p-3">
            <h3 className="font-bold text-sm text-gray-900">{ad.title || t('ad_preview_title_ph', 'عنوان الإعلان')}</h3>
            {ad.description && <p className="text-xs text-gray-500 mt-1">{ad.description}</p>}
            {ad.link_url && <span className="inline-block mt-2 text-xs text-blue-600 font-medium">{t('ad_learn_more', 'اعرف أكثر')} →</span>}
          </div>
          {adLabel}
        </div>
      ) : (
        /* slim */
        <div className={`${commonWrapper} flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 px-3 py-2.5`}>
          {resolvedSrc && !isVideo && <img src={resolvedSrc} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-gray-800 truncate">{ad.title || t('ad_preview_title_ph', 'عنوان الإعلان')}</h4>
            {ad.description && <p className="text-[10px] text-gray-500 truncate">{ad.description}</p>}
          </div>
          <span className="text-[8px] text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded flex-shrink-0">{t('ad_label', 'إعلان')}</span>
        </div>
      )}

      {/* معلومات الإعلان */}
      <div className="mt-3 pt-3 border-t border-indigo-200/50 space-y-1">
        {ad?.link_url && (
          <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <span>🔗</span>
            <span className="truncate font-mono" dir="ltr">{ad.link_url}</span>
          </div>
        )}
        {(ad?.start_date || ad?.end_date) && (
          <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
            <span>📅</span>
            <span>{ad.start_date || '—'} → {ad.end_date || '∞'}</span>
          </div>
        )}
        {ad?.is_gift && (
          <div className="text-[10px] text-pink-600 font-bold">🎁 {t('ad_gift_preview', 'إعلان هدية - لا يُحتسب في الإيرادات')}</div>
        )}
      </div>

      {/* Smart Health Checker */}
      <AdHealthChecker ad={ad} t={t} />
    </div>
  );
};

/**
 * AdsTab — extracted from SuperAdminPanel.js to reduce its size.
 * Pure JSX + handlers wired through props; no new behavior.
 */
const AdsTab = ({
  t,
  isSuperAdminOnly,
  ads,
  adStats,
  adSettings,
  setAdSettings,
  showCreateAd,
  setShowCreateAd,
  newAd,
  setNewAd,
  handleCreateAd,
  handleToggleAd,
  handleDeleteAd,
  editAd,
  setEditAd,
  handleUpdateAd,
  slotBookings,
  campaigns,
  campaignStats,
  showCreateCampaign,
  setShowCreateCampaign,
  newCampaign,
  setNewCampaign,
  handleCreateCampaign,
  handleCampaignAction,
}) => {
  const ALL_POSITIONS = [
    { key: 'homepage_hero', label: t('pos_homepage_hero', 'الصفحة الرئيسية - هيرو'), desc: t('pos_desc_homepage_hero', 'بانر كبير أعلى الصفحة الرئيسية للويب'), color: 'border-rose-500/30', icon: '🏠', maxSlots: 3 },
    { key: 'homepage_mid', label: t('pos_homepage_mid', 'الصفحة الرئيسية - وسط'), desc: t('pos_desc_homepage_mid', 'إعلان وسط محتوى الصفحة الرئيسية'), color: 'border-rose-400/30', icon: '📄', maxSlots: 2 },
    { key: 'homepage_footer', label: t('pos_homepage_footer', 'الصفحة الرئيسية - أسفل'), desc: t('pos_desc_homepage_footer', 'بانر أسفل الصفحة الرئيسية'), color: 'border-rose-300/30', icon: '⬇️', maxSlots: 2 },
    { key: 'banner', label: t('sa_pos_banner', 'بانر أعلى التطبيق'), desc: t('ad_desc_banner', 'أعلى صفحات التطبيق الداخلية'), color: 'border-amber-500/30', icon: '📢', maxSlots: 5 },
    { key: 'sidebar', label: t('sa_pos_sidebar', 'الشريط الجانبي'), desc: t('ad_desc_sidebar', 'القائمة الجانبية للتطبيق'), color: 'border-indigo-500/30', icon: '📌', maxSlots: 3 },
    { key: 'dashboard', label: t('sa_pos_dashboard', 'لوحة تحكم المقيمين'), desc: t('ad_desc_dashboard', 'داخل داشبورد المقيمين'), color: 'border-emerald-500/30', icon: '📊', maxSlots: 2 },
    { key: 'inline', label: t('sa_pos_inline', 'داخل المحتوى'), desc: t('ad_desc_inline', 'بين أقسام المحتوى'), color: 'border-purple-500/30', icon: '📰', maxSlots: 4 },
    { key: 'login_page', label: t('pos_login', 'صفحة تسجيل الدخول'), desc: t('pos_desc_login', 'إعلان في صفحة الدخول'), color: 'border-sky-500/30', icon: '🔑', maxSlots: 2 },
    { key: 'popup', label: t('pos_popup', 'إعلان منبثق (Popup)'), desc: t('pos_desc_popup', 'نافذة منبثقة عند فتح التطبيق'), color: 'border-orange-500/30', icon: '💬', maxSlots: 1 },
    { key: 'notification', label: t('pos_notification', 'إعلان إشعارات'), desc: t('pos_desc_notification', 'داخل قائمة الإشعارات'), color: 'border-pink-500/30', icon: '🔔', maxSlots: 2 },
    { key: 'splash', label: t('pos_splash', 'شاشة التحميل'), desc: t('pos_desc_splash', 'أثناء تحميل التطبيق'), color: 'border-cyan-500/30', icon: '⏳', maxSlots: 1 },
    { key: 'services_page', label: t('pos_services', 'صفحة الخدمات'), desc: t('pos_desc_services', 'داخل صفحة الخدمات والعروض'), color: 'border-teal-500/30', icon: '⭐', maxSlots: 3 },
  ];

  const adsByPos = {};
  (ads || []).forEach(a => {
    const p = a.position || 'unknown';
    if (!adsByPos[p]) adsByPos[p] = [];
    adsByPos[p].push(a);
  });

  const totalSlots = ALL_POSITIONS.reduce((s, p) => s + p.maxSlots, 0);
  const totalBooked = Object.values(adsByPos).reduce((s, v) => s + v.length, 0);

  // حالة الرفع لمنع إنشاء الإعلان قبل اكتمال رفع الصورة
  const [uploadingNew, setUploadingNew] = useState(false);
  const [uploadingEdit, setUploadingEdit] = useState(false);

  const posLabels = {
    banner: t('sa_pos_banner','بانر أعلى'), sidebar: t('sa_pos_sidebar','جانبي'), inline: t('sa_pos_inline','داخلي'), dashboard: t('sa_pos_dashboard','لوحة التحكم'),
    homepage_hero: t('pos_homepage_hero','الرئيسية-هيرو'), homepage_mid: t('pos_homepage_mid','الرئيسية-وسط'), homepage_footer: t('pos_homepage_footer','الرئيسية-أسفل'),
    login_page: t('pos_login','صفحة الدخول'), popup: t('pos_popup','منبثق'), notification: t('pos_notification','إشعارات'), splash: t('pos_splash','شاشة التحميل'), services_page: t('pos_services','الخدمات'),
  };

  return (
    <div data-testid="ads-tab">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: t('sa_total_ads', 'إجمالي الإعلانات'), value: adStats.total || 0, color: 'text-blue-400' },
          { label: t('sa_active_count', 'نشطة'), value: adStats.active || 0, color: 'text-green-400' },
          { label: t('sa_total_clicks', 'إجمالي النقرات'), value: adStats.total_clicks || 0, color: 'text-amber-400' },
          { label: t('sa_total_views', 'إجمالي المشاهدات'), value: adStats.total_views || 0, color: 'text-purple-400' },
          ...(!isSuperAdminOnly ? [{ label: t('ad_total_revenue', 'إيرادات الإعلانات'), value: `${(adStats.total_revenue || 0).toLocaleString()} ${t('sm_egp','ج.م')}`, color: 'text-emerald-400' }] : []),
          { label: t('ad_gift_count', 'إعلانات هدية'), value: adStats.gift_ads || 0, color: 'text-pink-400' },
        ].map((s, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Hybrid Ad Control Panel */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{t('ad_hybrid_control', 'تحكم في الإعلانات (داخلي + AdSense)')}</h3>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const data = {
                exported_at: new Date().toISOString(),
                ads_count: ads.length,
                settings: adSettings,
                ads: ads,
                campaigns: campaigns,
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `homeme_ads_backup_${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success(t('ad_backup_done', `تم تصدير ${ads.length} إعلان`));
            }} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 transition-all flex items-center gap-1.5" data-testid="export-ads-json">
              💾 {t('ad_backup_btn', 'نسخة احتياطية (JSON)')}
            </button>
            <button onClick={async () => {
              try {
                const current = adSettings?.adsense_global_enabled !== false;
                const next = !current;
                await axios.put(`${API}/ads/ad-settings`, { adsense_global_enabled: next }, getToken());
                setAdSettings(prev => ({ ...(prev || {}), adsense_global_enabled: next }));
                toast.success(next ? t('ad_adsense_on', 'AdSense مفعّل') : t('ad_adsense_off', 'AdSense متوقف'));
              } catch (err) {
                console.error('Toggle AdSense error:', err);
                toast.error(err.response?.data?.detail || t('sa_failed', 'فشل'));
              }
            }} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${adSettings?.adsense_global_enabled !== false ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-gray-600 hover:bg-gray-500 text-gray-200'}`} data-testid="toggle-adsense-global">
              {adSettings?.adsense_global_enabled !== false ? `✓ ${t('ad_adsense_on_label', 'AdSense مفعّل')}` : `○ ${t('ad_adsense_off_label', 'AdSense متوقف')}`}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-4">{t('ad_hybrid_desc', 'الإعلانات الداخلية تظهر أولاً. لو مفيش إعلان داخلي، يظهر AdSense تلقائياً (لو مفعّل).')}</p>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-gray-700">
            <p className="text-2xl font-black text-blue-400">{totalSlots}</p>
            <p className="text-[10px] text-gray-500">{t('ad_total_slots', 'إجمالي الأماكن')}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-green-800">
            <p className="text-2xl font-black text-green-400">{totalBooked}</p>
            <p className="text-[10px] text-gray-500">{t('ad_booked_slots', 'محجوزة')}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center border border-amber-800">
            <p className="text-2xl font-black text-amber-400">{totalSlots - totalBooked}</p>
            <p className="text-[10px] text-gray-500">{t('ad_available_slots', 'متاحة')}</p>
          </div>
        </div>

        {/* Bulk toggle buttons */}
        <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-900/50 rounded-xl border border-gray-700/50">
          <span className="text-xs text-gray-400 self-center font-bold">{t('ad_bulk_actions', 'إجراءات جماعية:')}</span>
          <button onClick={() => {
            setAdSettings(prev => {
              const positions = { ...(prev?.positions || {}) };
              ALL_POSITIONS.forEach(p => {
                positions[p.key] = { ...(positions[p.key] || {}), internal_enabled: true };
              });
              return { ...(prev || {}), positions };
            });
            toast.success(t('ad_all_internal_on', 'تم تحديد كل الإعلانات الداخلية'));
          }} className="px-3 py-1.5 bg-green-600/20 text-green-300 border border-green-700/40 rounded-lg text-xs font-bold hover:bg-green-600/30" data-testid="bulk-enable-internal">
            ✓ {t('ad_select_all_internal', 'تحديد الكل - إعلانات الموقع')}
          </button>
          <button onClick={() => {
            setAdSettings(prev => {
              const positions = { ...(prev?.positions || {}) };
              ALL_POSITIONS.forEach(p => {
                positions[p.key] = { ...(positions[p.key] || {}), internal_enabled: false };
              });
              return { ...(prev || {}), positions };
            });
            toast.success(t('ad_all_internal_off', 'تم إلغاء كل الإعلانات الداخلية'));
          }} className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600" data-testid="bulk-disable-internal">
            {t('ad_deselect_all_internal', 'إلغاء الكل - داخلي')}
          </button>
          <div className="w-px h-7 bg-gray-700 mx-1 self-center"></div>
          <button onClick={() => {
            setAdSettings(prev => {
              const positions = { ...(prev?.positions || {}) };
              ALL_POSITIONS.forEach(p => {
                positions[p.key] = { ...(positions[p.key] || {}), adsense_enabled: true };
              });
              return { ...(prev || {}), positions };
            });
            toast.success(t('ad_all_adsense_on', 'تم تحديد كل مواقع AdSense'));
          }} className="px-3 py-1.5 bg-blue-600/20 text-blue-300 border border-blue-700/40 rounded-lg text-xs font-bold hover:bg-blue-600/30" data-testid="bulk-enable-adsense">
            ✓ {t('ad_select_all_adsense', 'تحديد الكل - AdSense')}
          </button>
          <button onClick={() => {
            setAdSettings(prev => {
              const positions = { ...(prev?.positions || {}) };
              ALL_POSITIONS.forEach(p => {
                positions[p.key] = { ...(positions[p.key] || {}), adsense_enabled: false };
              });
              return { ...(prev || {}), positions };
            });
            toast.success(t('ad_all_adsense_off', 'تم إلغاء كل مواقع AdSense'));
          }} className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600" data-testid="bulk-disable-adsense">
            {t('ad_deselect_all_adsense', 'إلغاء الكل - AdSense')}
          </button>
          <span className="text-[10px] text-amber-400 self-center ms-2">⚠️ {t('ad_remember_save', 'تذكّري الضغط على "حفظ التغييرات" أسفل البطاقات')}</span>
        </div>

        {/* Position Cards with Slot Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_POSITIONS.map(pos => {
            const posAds = adsByPos[pos.key] || [];
            const booked = posAds.length;
            const pct = Math.round((booked / pos.maxSlots) * 100);
            return (
              <div key={pos.key} className={`bg-gray-900 rounded-xl border ${pos.color} hover:bg-gray-800/80 transition-colors overflow-hidden`}>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{pos.icon}</span>
                      <h4 className="font-bold text-white text-xs">{pos.label}</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pct >= 100 ? 'bg-red-500/20 text-red-400' : pct > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-500'}`}>
                      {booked}/{pos.maxSlots}
                    </span>
                  </div>
                  <p className="text-[8px] text-gray-500 mb-2">{pos.desc}</p>
                  <div className="bg-gray-800 rounded-full h-1.5 mb-2">
                    <div className={`h-1.5 rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                  </div>
                </div>
                <div className="border-t border-gray-800 px-3 py-2 space-y-1">
                  {Array.from({ length: pos.maxSlots }).map((_, slotIdx) => {
                    const ad = posAds[slotIdx];
                    return (
                      <div key={slotIdx} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${ad ? 'bg-gray-800' : 'bg-gray-800/40 border border-dashed border-gray-700'}`}>
                        <span className="text-[9px] text-gray-600 font-mono w-4 flex-shrink-0">#{slotIdx + 1}</span>
                        {ad ? (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-white truncate">{ad.title}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ad.is_active ? 'bg-green-400' : 'bg-red-400'}`}></span>
                                <span className="text-[8px] text-gray-500">{ad.is_active ? t('sp_active','نشط') : t('sp_disabled','معطل')}</span>
                                {ad.views > 0 && <span className="text-[8px] text-purple-400">{ad.views} {t('ad_views_short','مشاهدة')}</span>}
                                {ad.clicks > 0 && <span className="text-[8px] text-amber-400">{ad.clicks} {t('ad_clicks_short','نقرة')}</span>}
                              </div>
                            </div>
                            {!isSuperAdminOnly && ad.ad_value > 0 && !ad.is_gift && (
                              <span className="text-[8px] text-emerald-400 font-bold flex-shrink-0">{ad.ad_value}{t('sm_egp','ج.م')}</span>
                            )}
                            {ad.is_gift && <span className="text-[8px] text-pink-400 flex-shrink-0">{t('ad_gift','هدية')}</span>}
                          </>
                        ) : (
                          <span className="text-[9px] text-gray-600 italic">{t('ad_slot_empty', 'فارغ - متاح للحجز')}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-gray-800 px-3 py-2 flex items-center gap-2">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={adSettings?.positions?.[pos.key]?.internal_enabled !== false} onChange={(e) => {
                      setAdSettings(prev => ({...prev, positions: {...(prev.positions || {}), [pos.key]: {...(prev.positions?.[pos.key] || {}), internal_enabled: e.target.checked}}}));
                    }} id={`internal-${pos.key}`} className="w-3 h-3 rounded border-gray-600 bg-gray-800 text-green-500 focus:ring-green-500" />
                    <span className="text-[9px] text-gray-400">{t('ad_internal', 'داخلي')}</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={adSettings?.positions?.[pos.key]?.adsense_enabled !== false && !['dashboard','sidebar','popup','splash','notification'].includes(pos.key) || adSettings?.positions?.[pos.key]?.adsense_enabled === true} onChange={(e) => {
                      setAdSettings(prev => ({...prev, positions: {...(prev.positions || {}), [pos.key]: {...(prev.positions?.[pos.key] || {}), adsense_enabled: e.target.checked}}}));
                    }} id={`adsense-${pos.key}`} className="w-3 h-3 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500" />
                    <span className="text-[9px] text-gray-400">AdSense</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={async () => {
          try {
            const positions = adSettings.positions || {};
            await axios.put(`${API}/ads/ad-settings`, { positions }, getToken());
            toast.success(t('ad_settings_saved', 'تم حفظ الإعدادات'));
          } catch { toast.error(t('sa_failed', 'فشل')); }
        }} className="mt-4 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500 transition-all w-full">
          {t('save_changes', 'حفظ التغييرات')}
        </button>
      </div>

      <button onClick={() => { setShowCreateAd(!showCreateAd); if (!showCreateAd) setTimeout(() => document.getElementById('create-ad-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500 mb-3" data-testid="create-ad-btn">
        + {t('sa_create_ad_btn', 'إنشاء إعلان جديد')}
      </button>

      {/* Create Ad Form */}
      {showCreateAd && (
        <div id="create-ad-section" className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
          <h3 className="text-lg font-bold mb-4">{t('sa_create_ad', 'إنشاء إعلان داخلي')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('sa_ad_title', 'عنوان الإعلان')} <span className="text-red-400">*</span></label>
              <input type="text" value={newAd.title} onChange={e => setNewAd({...newAd, title: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" placeholder={t("sp_ad_title", "عنوان الإعلان")} required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('sa_position', 'الموقع')}</label>
              <select value={newAd.position} onChange={e => setNewAd({...newAd, position: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white">
                <optgroup label={t('pos_group_website', '--- الموقع الإلكتروني ---')}>
                  <option value="homepage_hero">{t('pos_homepage_hero', 'الصفحة الرئيسية - هيرو')}</option>
                  <option value="homepage_mid">{t('pos_homepage_mid', 'الصفحة الرئيسية - وسط')}</option>
                  <option value="homepage_footer">{t('pos_homepage_footer', 'الصفحة الرئيسية - أسفل')}</option>
                  <option value="login_page">{t('pos_login', 'صفحة تسجيل الدخول')}</option>
                </optgroup>
                <optgroup label={t('pos_group_app', '--- التطبيق ---')}>
                  <option value="banner">{t('sa_pos_banner', 'بانر أعلى التطبيق')}</option>
                  <option value="sidebar">{t('sa_pos_sidebar', 'الشريط الجانبي')}</option>
                  <option value="inline">{t('sa_pos_inline', 'داخل المحتوى')}</option>
                  <option value="dashboard">{t('sa_pos_dashboard', 'لوحة تحكم المقيمين')}</option>
                  <option value="services_page">{t('pos_services', 'صفحة الخدمات')}</option>
                </optgroup>
                <optgroup label={t('pos_group_special', '--- أنواع خاصة ---')}>
                  <option value="popup">{t('pos_popup', 'إعلان منبثق (Popup)')}</option>
                  <option value="notification">{t('pos_notification', 'إعلان إشعارات')}</option>
                  <option value="splash">{t('pos_splash', 'شاشة التحميل')}</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('sa_link_url', 'رابط الإعلان')}</label>
              <input type="text" value={newAd.link_url} onChange={e => setNewAd({...newAd, link_url: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" placeholder="https://..." />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                <span>{t('sa_upload_media', 'رفع صورة أو فيديو')}</span>
                <SizesTooltip t={t} currentPosition={newAd.position} />
                {RECOMMENDED_SIZES[newAd.position] && <span className="text-[10px] text-indigo-300 font-normal">· {t('sa_min_size', 'الحد الأدنى')}: {RECOMMENDED_SIZES[newAd.position].minW}×{RECOMMENDED_SIZES[newAd.position].minH} · {t('sa_ideal', 'المثالي')}: {RECOMMENDED_SIZES[newAd.position].w}×{RECOMMENDED_SIZES[newAd.position].h}</span>}
              </label>
              <input type="file" accept="image/*,video/mp4,video/webm" disabled={uploadingNew} onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                // تحقق من مقاس الصورة قبل الرفع
                const check = await validateImageDimensions(file, newAd.position, t);
                if (!check.ok) {
                  toast.error(check.message);
                  e.target.value = ''; // امسحي الملف المختار
                  return;
                }
                const formData = new FormData();
                formData.append('file', file);
                setUploadingNew(true);
                try {
                  const res = await axios.post(`${API}/ads/upload-media`, formData, { headers: { ...getToken().headers, 'Content-Type': 'multipart/form-data' } });
                  setNewAd(prev => ({ ...prev, image_url: res.data.url, media_type: res.data.type || (file.type.startsWith('video') ? 'video' : 'image') }));
                  toast.success(t('sa_uploaded', 'تم الرفع'));
                } catch { toast.error(t('sa_upload_failed', 'فشل الرفع')); }
                finally { setUploadingNew(false); }
              }} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-green-600 file:text-white disabled:opacity-50" data-testid="new-ad-upload-input" />
              {uploadingNew && <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1" data-testid="new-ad-uploading"><span className="inline-block w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span> {t('sa_uploading', 'جارٍ رفع الصورة... لا تضغطي إنشاء قبل اكتمال الرفع')}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('sa_description', 'الوصف')}</label>
              <input type="text" value={newAd.description || ''} onChange={e => setNewAd({...newAd, description: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" placeholder={t('sa_ad_desc_placeholder', 'وصف مختصر للإعلان')} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('sa_ad_value', 'القيمة (ج.م)')}</label>
              <input type="number" value={newAd.ad_value} onChange={e => setNewAd({...newAd, ad_value: parseFloat(e.target.value) || 0})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('sa_start_date', 'تاريخ البداية')}</label>
              <input type="date" value={newAd.start_date || ''} onChange={e => setNewAd({...newAd, start_date: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('sa_end_date', 'تاريخ النهاية')}</label>
              <input type="date" value={newAd.end_date || ''} onChange={e => setNewAd({...newAd, end_date: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newAd.is_gift || false} onChange={e => setNewAd({...newAd, is_gift: e.target.checked})} className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-pink-500" />
                <span className="text-xs text-gray-300">{t('sa_gift', 'هدية')}</span>
              </label>
            </div>
          </div>
          {/* Template picker للإنشاء (عند عدم وجود صورة) */}
          <div className="mb-3">
            <TemplatePicker ad={newAd} onChange={(key) => setNewAd({ ...newAd, template_style: key })} t={t} />
          </div>
          {/* Live Preview للإنشاء */}
          <div className="mb-4">
            <AdPreview ad={newAd} t={t} />
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreateAd} disabled={uploadingNew} className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed" data-testid="create-ad-submit">{uploadingNew ? t('sa_wait_upload', 'جارٍ الرفع...') : t('sa_create', 'إنشاء')}</button>
            <button onClick={() => setShowCreateAd(false)} className="px-5 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">{t('sa_cancel', 'إلغاء')}</button>
          </div>
        </div>
      )}

      {/* Ad Placement Guide */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mb-6">
        <h3 className="text-lg font-bold text-white mb-4">{t('ad_placement_guide', 'دليل أماكن الإعلانات ومقاساتها')}</h3>

        <h4 className="text-sm font-bold text-rose-400 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          {t('ad_section_website', 'الموقع الإلكتروني (Landing Page)')}
        </h4>
        <div className="bg-gray-900 rounded-xl p-4 mb-4 border border-gray-700">
          <div className="flex flex-col gap-2" style={{ minHeight: '200px' }}>
            <div className="bg-rose-600/20 border border-rose-500 border-dashed rounded-lg p-3 text-center">
              <span className="text-xs font-bold text-rose-400">homepage_hero</span>
              <span className="text-[9px] text-rose-300 mx-2">— {t('pos_desc_homepage_hero', 'بانر كبير أعلى الصفحة الرئيسية')}</span>
              <span className="text-[9px] text-rose-200 bg-rose-500/20 px-1.5 py-0.5 rounded">970x250 / 728x90 / 320x100</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-800 rounded h-16 border border-gray-700"></div>
              <div className="flex-1 bg-gray-800 rounded h-16 border border-gray-700"></div>
              <div className="flex-1 bg-gray-800 rounded h-16 border border-gray-700"></div>
            </div>
            <div className="bg-pink-600/20 border border-pink-500 border-dashed rounded-lg p-2.5 text-center">
              <span className="text-xs font-bold text-pink-400">homepage_mid</span>
              <span className="text-[9px] text-pink-300 mx-2">— {t('pos_desc_homepage_mid', 'وسط محتوى الصفحة الرئيسية')}</span>
              <span className="text-[9px] text-pink-200 bg-pink-500/20 px-1.5 py-0.5 rounded">728x90 / 468x60</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-800 rounded h-10 border border-gray-700"></div>
              <div className="flex-1 bg-gray-800 rounded h-10 border border-gray-700"></div>
            </div>
            <div className="bg-red-600/20 border border-red-500 border-dashed rounded-lg p-2.5 text-center">
              <span className="text-xs font-bold text-red-400">homepage_footer</span>
              <span className="text-[9px] text-red-300 mx-2">— {t('pos_desc_homepage_footer', 'أسفل الصفحة الرئيسية قبل CTA')}</span>
              <span className="text-[9px] text-red-200 bg-red-500/20 px-1.5 py-0.5 rounded">728x90 / 320x50</span>
            </div>
          </div>
        </div>

        <h4 className="text-sm font-bold text-amber-400 mb-3 mt-5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          {t('ad_section_app', 'داخل التطبيق (بعد تسجيل الدخول)')}
        </h4>
        <div className="bg-gray-900 rounded-xl p-4 mb-4 border border-gray-700">
          <div className="flex gap-3" style={{ minHeight: '300px' }}>
            <div className="w-40 flex-shrink-0 bg-gray-800 rounded-lg border border-gray-600 p-2 flex flex-col">
              <div className="text-[9px] text-gray-500 text-center mb-1">SIDEBAR</div>
              <div className="flex-1 space-y-1">
                <div className="bg-gray-700 rounded h-3 w-full"></div>
                <div className="bg-gray-700 rounded h-3 w-3/4"></div>
                <div className="bg-gray-700 rounded h-3 w-full"></div>
                <div className="bg-gray-700 rounded h-3 w-2/3"></div>
              </div>
              <div className="mt-auto pt-2 border-t border-gray-600">
                <div className="bg-indigo-600/30 border border-indigo-500 border-dashed rounded-lg p-2 text-center">
                  <span className="text-[10px] font-bold text-indigo-400">sidebar</span>
                  <div className="text-[8px] text-indigo-300 mt-0.5">160x600 · 300x250</div>
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <div className="bg-amber-600/20 border border-amber-500 border-dashed rounded-lg p-3 text-center">
                <span className="text-xs font-bold text-amber-400">banner</span>
                <span className="text-[9px] text-amber-300 mx-2">— {t('ad_pos_top', 'بانر أعلى الصفحة')}</span>
                <span className="text-[9px] text-amber-200 bg-amber-500/20 px-1.5 py-0.5 rounded">728x90 / 970x250</span>
              </div>
              <div className="bg-gray-800 rounded-lg border border-gray-600 p-3 flex-1 flex flex-col">
                <div className="flex gap-2 mb-2">
                  <div className="flex-1 bg-gray-700 rounded h-10"></div>
                  <div className="flex-1 bg-gray-700 rounded h-10"></div>
                  <div className="flex-1 bg-gray-700 rounded h-10"></div>
                </div>
                <div className="bg-emerald-600/20 border border-emerald-500 border-dashed rounded-lg p-2.5 text-center mb-2">
                  <span className="text-xs font-bold text-emerald-400">dashboard</span>
                  <span className="text-[9px] text-emerald-300 mx-2">— {t('ad_pos_dash', 'داخل لوحة التحكم')}</span>
                  <span className="text-[9px] text-emerald-200 bg-emerald-500/20 px-1.5 py-0.5 rounded">300x250 / 336x280</span>
                </div>
                <div className="bg-purple-600/20 border border-purple-500 border-dashed rounded-lg p-2.5 text-center mb-2">
                  <span className="text-xs font-bold text-purple-400">inline</span>
                  <span className="text-[9px] text-purple-300 mx-2">— {t('ad_pos_inline', 'بين المحتوى')}</span>
                  <span className="text-[9px] text-purple-200 bg-purple-500/20 px-1.5 py-0.5 rounded">728x90 / 320x50</span>
                </div>
                <div className="bg-teal-600/20 border border-teal-500 border-dashed rounded-lg p-2 text-center">
                  <span className="text-[10px] font-bold text-teal-400">services_page</span>
                  <span className="text-[9px] text-teal-300 mx-2">— {t('pos_desc_services', 'صفحة الخدمات')}</span>
                  <span className="text-[9px] text-teal-200 bg-teal-500/20 px-1.5 py-0.5 rounded">728x90 / 300x250</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <h4 className="text-sm font-bold text-cyan-400 mb-3 mt-5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
          {t('ad_section_special', 'أنواع خاصة')}
        </h4>
        <div className="bg-gray-900 rounded-xl p-4 mb-4 border border-gray-700">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-sky-600/20 border border-sky-500 border-dashed rounded-lg p-3 text-center">
              <span className="text-lg mb-1 block">🔑</span>
              <span className="text-[10px] font-bold text-sky-400 block">login_page</span>
              <span className="text-[8px] text-sky-300 block mt-0.5">{t('pos_desc_login', 'صفحة تسجيل الدخول')}</span>
              <span className="text-[8px] text-sky-200 bg-sky-500/20 px-1.5 py-0.5 rounded mt-1 inline-block">728x90 / 300x250</span>
            </div>
            <div className="bg-orange-600/20 border border-orange-500 border-dashed rounded-lg p-3 text-center">
              <span className="text-lg mb-1 block">💬</span>
              <span className="text-[10px] font-bold text-orange-400 block">popup</span>
              <span className="text-[8px] text-orange-300 block mt-0.5">{t('pos_desc_popup', 'نافذة منبثقة')}</span>
              <span className="text-[8px] text-orange-200 bg-orange-500/20 px-1.5 py-0.5 rounded mt-1 inline-block">400x300 / 300x250</span>
            </div>
            <div className="bg-cyan-600/20 border border-cyan-500 border-dashed rounded-lg p-3 text-center">
              <span className="text-lg mb-1 block">⏳</span>
              <span className="text-[10px] font-bold text-cyan-400 block">splash</span>
              <span className="text-[8px] text-cyan-300 block mt-0.5">{t('pos_desc_splash', 'شاشة التحميل')}</span>
              <span className="text-[8px] text-cyan-200 bg-cyan-500/20 px-1.5 py-0.5 rounded mt-1 inline-block">320x480 / 300x250</span>
            </div>
            <div className="bg-pink-600/20 border border-pink-500 border-dashed rounded-lg p-3 text-center">
              <span className="text-lg mb-1 block">🔔</span>
              <span className="text-[10px] font-bold text-pink-400 block">notification</span>
              <span className="text-[8px] text-pink-300 block mt-0.5">{t('pos_desc_notification', 'صفحة الإشعارات')}</span>
              <span className="text-[8px] text-pink-200 bg-pink-500/20 px-1.5 py-0.5 rounded mt-1 inline-block">728x90 / 320x50</span>
            </div>
          </div>
        </div>

        <table className="w-full text-sm" data-testid="ad-placement-table">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-3 py-2 text-right text-gray-400 font-medium">{t('ad_place', 'الموقع')}</th>
              <th className="px-3 py-2 text-center text-gray-400 font-medium">{t('ad_place_desc', 'الوصف')}</th>
              <th className="px-3 py-2 text-center text-gray-400 font-medium">{t('ad_sizes', 'المقاسات المتاحة')}</th>
              <th className="px-3 py-2 text-center text-gray-400 font-medium">{t('ad_who_sees', 'من يشاهده')}</th>
              <th className="px-3 py-2 text-center text-gray-400 font-medium">{t('ad_max_count', 'العدد الأقصى')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {[
              { name: 'homepage_hero', color: 'rose', desc: t('pos_desc_homepage_hero','بانر كبير أعلى الصفحة الرئيسية'), sizes: '970x250 · 728x90 · 320x100', who: t('ad_see_public','الجميع (عام)'), max: 3 },
              { name: 'homepage_mid', color: 'pink', desc: t('pos_desc_homepage_mid','وسط محتوى الصفحة الرئيسية'), sizes: '728x90 · 468x60', who: t('ad_see_public','الجميع (عام)'), max: 2 },
              { name: 'homepage_footer', color: 'red', desc: t('pos_desc_homepage_footer','أسفل الصفحة الرئيسية'), sizes: '728x90 · 320x50', who: t('ad_see_public','الجميع (عام)'), max: 2 },
              { name: 'banner', color: 'amber', desc: t('ad_desc_banner','بانر أعلى صفحات المحتوى'), sizes: '728x90 · 970x250 · 320x50', who: t('ad_see_residents','السكان فقط'), max: 5 },
              { name: 'sidebar', color: 'indigo', desc: t('ad_desc_sidebar','أسفل قائمة التنقل الجانبية'), sizes: '160x600 · 300x250', who: t('ad_see_all','الكل (ما عدا المالك)'), max: 3 },
              { name: 'dashboard', color: 'emerald', desc: t('ad_desc_dashboard','داخل لوحة التحكم الرئيسية'), sizes: '300x250 · 336x280 · 728x90', who: t('ad_see_residents_admins','السكان والمديرين'), max: 2 },
              { name: 'inline', color: 'purple', desc: t('ad_desc_inline','بين أقسام المحتوى في الداشبورد'), sizes: '728x90 · 320x50', who: t('ad_see_residents','السكان فقط'), max: 4 },
              { name: 'services_page', color: 'teal', desc: t('pos_desc_services','صفحة الخدمات والعروض'), sizes: '728x90 · 300x250', who: t('ad_see_residents','السكان فقط'), max: 3 },
              { name: 'login_page', color: 'sky', desc: t('pos_desc_login','صفحة تسجيل الدخول'), sizes: '728x90 · 300x250', who: t('ad_see_public','الجميع (عام)'), max: 2 },
              { name: 'popup', color: 'orange', desc: t('pos_desc_popup','نافذة منبثقة عند فتح التطبيق'), sizes: '400x300 · 300x250', who: t('ad_see_residents_admins','السكان والمديرين'), max: 1 },
              { name: 'splash', color: 'cyan', desc: t('pos_desc_splash','شاشة التحميل'), sizes: '320x480 · 300x250', who: t('ad_see_residents','السكان فقط'), max: 1 },
              { name: 'notification', color: 'pink', desc: t('pos_desc_notification','صفحة الإشعارات'), sizes: '728x90 · 320x50', who: t('ad_see_residents','السكان فقط'), max: 2 },
            ].map((p, i) => (
              <tr key={i}>
                <td className="px-3 py-2.5"><span className={`bg-${p.color}-500/20 text-${p.color}-400 px-2 py-0.5 rounded text-xs font-bold`}>{p.name}</span></td>
                <td className="px-3 py-2.5 text-gray-300 text-xs text-center">{p.desc}</td>
                <td className="px-3 py-2.5 text-center"><span className="text-xs text-gray-400">{p.sizes}</span></td>
                <td className="px-3 py-2.5 text-center text-xs text-gray-300">{p.who}</td>
                <td className="px-3 py-2.5 text-center text-xs font-bold text-gray-300">{p.max}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ads List Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-right text-gray-400">{t('sa_title', 'العنوان')}</th>
              <th className="px-4 py-3 text-right text-gray-400">{t('sa_position', 'الموقع')}</th>
              <th className="px-4 py-3 text-center text-gray-400">{t('ad_dimensions', 'المقاسات')}</th>
              <th className="px-4 py-3 text-center text-gray-400">{t('ad_dates', 'المدة')}</th>
              <th className="px-4 py-3 text-center text-gray-400">{t('ad_value_col', 'القيمة')}</th>
              <th className="px-4 py-3 text-center text-gray-400">{t('sa_clicks', 'النقرات')}</th>
              <th className="px-4 py-3 text-center text-gray-400">{t('sa_status', 'الحالة')}</th>
              <th className="px-4 py-3 text-center text-gray-400">{t('sa_actions', 'إجراءات')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {ads.map(a => (
              <tr key={a.id} className="hover:bg-gray-750">
                <td className="px-4 py-3">
                  <div className="font-bold text-white">{a.title}</div>
                  <div className="text-xs text-gray-500">{a.description || '-'}</div>
                </td>
                <td className="px-4 py-3 text-gray-300 text-xs">{posLabels[a.position] || a.position}</td>
                <td className="px-4 py-3 text-center text-gray-300 text-xs">{a.dimensions || '-'}</td>
                <td className="px-4 py-3 text-center text-xs">
                  {a.start_date || a.end_date ? (
                    <div className="text-gray-300">
                      {a.start_date && <div>{a.start_date}</div>}
                      {a.end_date && <div className="text-gray-500">{t('ad_to', 'إلى')} {a.end_date}</div>}
                    </div>
                  ) : <span className="text-gray-500">-</span>}
                </td>
                <td className="px-4 py-3 text-center text-xs">
                  {a.is_gift ? (
                    <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded-full text-[10px]">{t('ad_gift', 'هدية')}</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">{(a.ad_value || 0).toLocaleString()} {t('sm_egp','ج.م')}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-gray-300">{a.clicks || 0}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {a.is_active ? t('sp_active','نشط') : t('sp_disabled','معطل')}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex gap-1 justify-center">
                    <button onClick={() => setEditAd({ ...a, start_date: a.start_date || '', end_date: a.end_date || '' })} className="px-2 py-1 text-xs bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30" data-testid={`edit-ad-${a.id}`}>{t('sa_edit', 'تعديل')}</button>
                    <button onClick={() => handleToggleAd(a.id)} className={`px-2 py-1 text-xs rounded ${a.is_active ? 'bg-amber-600/20 text-amber-400' : 'bg-green-600/20 text-green-400'}`}>
                      {a.is_active ? t('sp_deactivate','تعطيل') : t('sp_activate','تفعيل')}
                    </button>
                    <button onClick={() => handleDeleteAd(a.id)} className="px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded">{t('sa_delete', 'حذف')}</button>
                  </div>
                </td>
              </tr>
            ))}
            {ads.length === 0 && (
              <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-500">{t('sa_no_ads', 'لا توجد إعلانات بعد')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Ad Modal */}
      {editAd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setEditAd(null)} data-testid="edit-ad-modal">
          <div className="bg-gray-800 rounded-xl border border-blue-500/30 p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{t('sa_edit_ad', 'تعديل الإعلان')}</h3>
              <button onClick={() => setEditAd(null)} className="text-gray-400 hover:text-white text-xl">×</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sa_ad_title', 'عنوان الإعلان')} <span className="text-red-400">*</span></label>
                <input type="text" value={editAd.title || ''} onChange={e => setEditAd({ ...editAd, title: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="edit-ad-title" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sa_position', 'الموقع')}</label>
                <select value={editAd.position} onChange={e => setEditAd({ ...editAd, position: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="edit-ad-position">
                  <optgroup label={t('pos_group_website', '--- الموقع الإلكتروني ---')}>
                    <option value="homepage_hero">{t('pos_homepage_hero', 'الصفحة الرئيسية - هيرو')}</option>
                    <option value="homepage_mid">{t('pos_homepage_mid', 'الصفحة الرئيسية - وسط')}</option>
                    <option value="homepage_footer">{t('pos_homepage_footer', 'الصفحة الرئيسية - أسفل')}</option>
                    <option value="login_page">{t('pos_login', 'صفحة تسجيل الدخول')}</option>
                  </optgroup>
                  <optgroup label={t('pos_group_app', '--- التطبيق ---')}>
                    <option value="banner">{t('sa_pos_banner', 'بانر أعلى التطبيق')}</option>
                    <option value="sidebar">{t('sa_pos_sidebar', 'الشريط الجانبي')}</option>
                    <option value="inline">{t('sa_pos_inline', 'داخل المحتوى')}</option>
                    <option value="dashboard">{t('sa_pos_dashboard', 'لوحة تحكم المقيمين')}</option>
                    <option value="services_page">{t('pos_services', 'صفحة الخدمات')}</option>
                  </optgroup>
                  <optgroup label={t('pos_group_special', '--- أنواع خاصة ---')}>
                    <option value="popup">{t('pos_popup', 'إعلان منبثق (Popup)')}</option>
                    <option value="notification">{t('pos_notification', 'إعلان إشعارات')}</option>
                    <option value="splash">{t('pos_splash', 'شاشة التحميل')}</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sa_link_url', 'رابط الإعلان')}</label>
                <input type="text" value={editAd.link_url || ''} onChange={e => setEditAd({ ...editAd, link_url: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sa_description', 'الوصف')}</label>
                <input type="text" value={editAd.description || ''} onChange={e => setEditAd({ ...editAd, description: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sa_current_media', 'الصورة/الفيديو الحالي')}</label>
                {editAd.image_url ? (
                  <div className="bg-gray-900 border border-gray-700 rounded-lg p-2 flex items-center gap-2" data-testid="edit-ad-current-media">
                    {(editAd.media_type === 'video') || /\.(mp4|webm|mov)(\?|$)/i.test(editAd.image_url) ? (
                      <video src={editAd.image_url.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${editAd.image_url}` : editAd.image_url} className="h-14 w-24 object-cover rounded flex-shrink-0" muted />
                    ) : (
                      <img src={editAd.image_url.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${editAd.image_url}` : editAd.image_url} alt="current" className="h-14 w-24 object-cover rounded flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-green-400 truncate">✓ {t('sa_media_kept', 'سيتم الاحتفاظ بالوسائط الحالية')}</p>
                      <p className="text-[9px] text-gray-500 truncate font-mono" dir="ltr">{editAd.image_url}</p>
                    </div>
                    <button type="button" onClick={() => setEditAd({ ...editAd, image_url: '', media_type: undefined, clear_image: true })} className="text-[10px] text-red-400 hover:text-red-300 flex-shrink-0 px-2 py-1" title={t('sa_remove_media', 'إزالة')} data-testid="edit-ad-remove-media">
                      🗑️ {t('sa_remove', 'إزالة')}
                    </button>
                  </div>
                ) : (
                  <div className="bg-gray-900/50 border border-dashed border-gray-700 rounded-lg p-3 text-center text-[10px] text-gray-500">
                    {t('sa_no_current_media', 'لا توجد صورة حالياً — ارفعي واحدة بالأسفل')}
                  </div>
                )}
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                  <span>{t('sa_upload_replace', 'تغيير الصورة/الفيديو (اختياري)')}</span>
                  <SizesTooltip t={t} currentPosition={editAd.position} />
                  {editAd.position && RECOMMENDED_SIZES[editAd.position] && <span className="text-[10px] text-indigo-300 font-normal">· {t('sa_min_size', 'الحد الأدنى')}: {RECOMMENDED_SIZES[editAd.position].minW}×{RECOMMENDED_SIZES[editAd.position].minH} · {t('sa_ideal', 'المثالي')}: {RECOMMENDED_SIZES[editAd.position].w}×{RECOMMENDED_SIZES[editAd.position].h}</span>}
                </label>
                <input type="file" accept="image/*,video/mp4,video/webm" disabled={uploadingEdit} onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  // تحقق من مقاس الصورة قبل الرفع
                  const check = await validateImageDimensions(file, editAd.position, t);
                  if (!check.ok) {
                    toast.error(check.message);
                    e.target.value = '';
                    return;
                  }
                  const formData = new FormData();
                  formData.append('file', file);
                  setUploadingEdit(true);
                  try {
                    const res = await axios.post(`${API}/ads/upload-media`, formData, { headers: { ...getToken().headers, 'Content-Type': 'multipart/form-data' } });
                    setEditAd(prev => ({ ...prev, image_url: res.data.url, media_type: res.data.type, clear_image: false }));
                    toast.success(t('sa_uploaded', 'تم الرفع'));
                  } catch { toast.error(t('sa_upload_failed', 'فشل الرفع')); }
                  finally { setUploadingEdit(false); }
                }} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-blue-600 file:text-white disabled:opacity-50" data-testid="edit-ad-upload-input" />
                <p className="text-[9px] text-amber-400/80 mt-1">💡 {t('sa_upload_optional', 'اتركي هذا الحقل فارغاً إذا لم تريدي تغيير الصورة الحالية')}</p>
                {uploadingEdit && <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1" data-testid="edit-ad-uploading"><span className="inline-block w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span> {t('sa_uploading', 'جارٍ رفع الصورة... لا تضغطي حفظ قبل اكتمال الرفع')}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sa_ad_value', 'القيمة (ج.م)')}</label>
                <input type="number" value={editAd.ad_value || 0} onChange={e => setEditAd({ ...editAd, ad_value: parseFloat(e.target.value) || 0 })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sa_start_date', 'تاريخ البداية')}</label>
                <input type="date" value={editAd.start_date || ''} onChange={e => setEditAd({ ...editAd, start_date: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t('sa_end_date', 'تاريخ النهاية')}</label>
                <input type="date" value={editAd.end_date || ''} onChange={e => setEditAd({ ...editAd, end_date: e.target.value })} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editAd.is_gift || false} onChange={e => setEditAd({ ...editAd, is_gift: e.target.checked })} className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-pink-500" />
                <span className="text-xs text-gray-300">{t('sa_gift', 'هدية')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editAd.is_active !== false} onChange={e => setEditAd({ ...editAd, is_active: e.target.checked })} className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-green-500" />
                <span className="text-xs text-gray-300">{t('sp_active', 'نشط')}</span>
              </label>
            </div>
            {/* Template picker للتعديل */}
            <div className="mb-3">
              <TemplatePicker ad={editAd} onChange={(key) => setEditAd({ ...editAd, template_style: key })} t={t} />
            </div>
            {/* Live Preview للتعديل */}
            <div className="mb-4">
              <AdPreview ad={editAd} t={t} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleUpdateAd} disabled={uploadingEdit} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed" data-testid="save-edit-ad">{uploadingEdit ? t('sa_wait_upload', 'جارٍ الرفع...') : t('sa_save_changes', 'حفظ التغييرات')}</button>
              <button onClick={() => setEditAd(null)} className="px-5 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">{t('sa_cancel', 'إلغاء')}</button>
            </div>
          </div>
        </div>
      )}

      {/* CAMPAIGNS SECTION */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{t('campaigns_title', 'الحملات الإعلانية')}</h3>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 text-xs">
              <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded">{campaignStats.active || 0} {t('camp_active', 'نشطة')}</span>
              <span className="bg-gray-700 text-gray-400 px-2 py-0.5 rounded">{campaignStats.draft || 0} {t('camp_draft', 'مسودة')}</span>
              <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">{campaignStats.completed || 0} {t('camp_completed', 'مكتملة')}</span>
            </div>
            <button onClick={() => setShowCreateCampaign(!showCreateCampaign)} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-500" data-testid="create-campaign-btn">
              + {t('camp_new', 'حملة جديدة')}
            </button>
          </div>
        </div>

        {showCreateCampaign && (
          <div className="bg-gray-900 rounded-xl p-4 mb-4 border border-purple-500/30">
            <h4 className="text-sm font-bold text-purple-400 mb-3">{t('camp_create', 'إنشاء حملة إعلانية جديدة')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">{t('camp_name', 'اسم الحملة')}</label>
                <input type="text" value={newCampaign.name} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" placeholder={t('camp_name_ph', 'مثال: حملة رمضان 2026')} />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">{t('camp_desc', 'وصف الحملة')}</label>
                <input type="text" value={newCampaign.description} onChange={e => setNewCampaign({...newCampaign, description: e.target.value})} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">{t('camp_start', 'من')}</label>
                <input type="date" value={newCampaign.start_date} onChange={e => setNewCampaign({...newCampaign, start_date: e.target.value})} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">{t('camp_end', 'إلى')}</label>
                <input type="date" value={newCampaign.end_date} onChange={e => setNewCampaign({...newCampaign, end_date: e.target.value})} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">{t('camp_budget', 'الميزانية (ج.م)')}</label>
                <input type="number" value={newCampaign.budget} onChange={e => setNewCampaign({...newCampaign, budget: parseFloat(e.target.value) || 0})} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">{t('camp_free_trial', 'فترة مجانية (أيام)')}</label>
                <input type="number" value={newCampaign.free_trial_days} onChange={e => setNewCampaign({...newCampaign, free_trial_days: parseInt(e.target.value) || 0})} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white" />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-[10px] text-gray-400 mb-1">{t('camp_select_ads', 'اختر الإعلانات في هذه الحملة')}</label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto bg-gray-800 rounded-lg p-2 border border-gray-700">
                {ads.map(a => (
                  <label key={a.id} className={`flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-lg text-xs ${newCampaign.ad_ids.includes(a.id) ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>
                    <input type="checkbox" checked={newCampaign.ad_ids.includes(a.id)} onChange={e => {
                      setNewCampaign(prev => ({...prev, ad_ids: e.target.checked ? [...prev.ad_ids, a.id] : prev.ad_ids.filter(id => id !== a.id)}));
                    }} className="hidden" />
                    <span>{a.title}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={newCampaign.auto_renew} onChange={e => setNewCampaign({...newCampaign, auto_renew: e.target.checked})} className="w-3.5 h-3.5 rounded bg-gray-800 border-gray-600 text-green-500" />
                <span className="text-xs text-gray-300">{t('camp_auto_renew', 'تجديد تلقائي')}</span>
              </label>
              <select value={newCampaign.status} onChange={e => setNewCampaign({...newCampaign, status: e.target.value})} className="bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white">
                <option value="draft">{t('camp_draft', 'مسودة')}</option>
                <option value="active">{t('camp_active', 'تفعيل فوري')}</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreateCampaign} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-500">{t('camp_create_btn', 'إنشاء الحملة')}</button>
              <button onClick={() => setShowCreateCampaign(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-xs">{t('sa_cancel', 'إلغاء')}</button>
            </div>
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">{t('camp_empty', 'لا توجد حملات إعلانية بعد')}</div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => {
              const statusStyles = {
                active: { bg: 'bg-green-500/10 border-green-500/30', badge: 'bg-green-500/20 text-green-400', label: t('camp_active', 'نشطة') },
                draft: { bg: 'bg-gray-800 border-gray-700', badge: 'bg-gray-700 text-gray-400', label: t('camp_draft', 'مسودة') },
                paused: { bg: 'bg-amber-500/10 border-amber-500/30', badge: 'bg-amber-500/20 text-amber-400', label: t('camp_paused', 'متوقفة') },
                completed: { bg: 'bg-blue-500/10 border-blue-500/30', badge: 'bg-blue-500/20 text-blue-400', label: t('camp_completed', 'مكتملة') },
                cancelled: { bg: 'bg-red-500/10 border-red-500/30', badge: 'bg-red-500/20 text-red-400', label: t('camp_cancelled', 'ملغية') },
              };
              const s = statusStyles[c.status] || statusStyles.draft;
              const daysLeft = c.end_date ? Math.ceil((new Date(c.end_date) - new Date()) / 86400000) : 0;

              return (
                <div key={c.id} className={`rounded-xl border p-4 ${s.bg}`} data-testid={`campaign-${c.id}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold text-white truncate">{c.name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.badge}`}>{s.label}</span>
                        {c.auto_renew && <span className="px-1.5 py-0.5 bg-green-900/40 text-green-400 rounded text-[9px]">{t('camp_auto', 'تجديد تلقائي')}</span>}
                        {c.free_trial_days > 0 && <span className="px-1.5 py-0.5 bg-cyan-900/40 text-cyan-400 rounded text-[9px]">{c.free_trial_days} {t('camp_free_days', 'يوم مجاني')}</span>}
                      </div>
                      {c.description && <p className="text-[10px] text-gray-400">{c.description}</p>}
                    </div>
                    {!isSuperAdminOnly && c.budget > 0 && (
                      <div className="text-end flex-shrink-0">
                        <p className="text-lg font-black text-emerald-400">{c.budget.toLocaleString()}</p>
                        <p className="text-[9px] text-gray-500">{t('sm_egp', 'ج.م')}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-3 bg-gray-900/50 rounded-lg p-2.5">
                    <div className="text-center">
                      <p className="text-[9px] text-gray-500">{t('camp_from', 'من')}</p>
                      <p className="text-xs font-bold text-white">{c.start_date}</p>
                    </div>
                    <div className="flex-1 relative">
                      <div className="h-1 bg-gray-700 rounded-full">
                        {c.status === 'active' && c.start_date && c.end_date && (
                          <div className="h-1 bg-green-500 rounded-full" style={{
                            width: `${Math.min(100, Math.max(5, ((new Date() - new Date(c.start_date)) / (new Date(c.end_date) - new Date(c.start_date))) * 100))}%`
                          }}></div>
                        )}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-gray-500">{t('camp_to', 'إلى')}</p>
                      <p className="text-xs font-bold text-white">{c.end_date}</p>
                    </div>
                    {daysLeft > 0 && c.status === 'active' && (
                      <span className={`text-[10px] font-bold ${daysLeft <= 3 ? 'text-red-400' : daysLeft <= 7 ? 'text-amber-400' : 'text-green-400'}`}>
                        {daysLeft} {t('camp_days_left', 'يوم متبقي')}
                      </span>
                    )}
                  </div>

                  {(c.ads || []).length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] text-gray-500 mb-1">{t('camp_ads', 'إعلانات الحملة')} ({c.ads.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.ads.map(a => (
                          <span key={a.id} className={`px-2 py-0.5 rounded text-[10px] font-medium ${a.is_active ? 'bg-green-900/30 text-green-400 border border-green-700/30' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                            {a.title}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                        <span>{c.total_views || 0} {t('ad_views_short', 'مشاهدة')}</span>
                        <span>{c.total_clicks || 0} {t('ad_clicks_short', 'نقرة')}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {c.status === 'draft' && (
                      <button onClick={() => handleCampaignAction(c.id, 'active')} className="px-2.5 py-1 bg-green-600/20 text-green-400 rounded-lg text-[10px] font-bold hover:bg-green-600/30">{t('camp_activate', 'تفعيل')}</button>
                    )}
                    {c.status === 'active' && (
                      <button onClick={() => handleCampaignAction(c.id, 'paused')} className="px-2.5 py-1 bg-amber-600/20 text-amber-400 rounded-lg text-[10px] font-bold hover:bg-amber-600/30">{t('camp_pause', 'إيقاف مؤقت')}</button>
                    )}
                    {c.status === 'paused' && (
                      <button onClick={() => handleCampaignAction(c.id, 'active')} className="px-2.5 py-1 bg-green-600/20 text-green-400 rounded-lg text-[10px] font-bold hover:bg-green-600/30">{t('camp_resume', 'استئناف')}</button>
                    )}
                    {(c.status === 'completed' || c.status === 'cancelled' || c.status === 'paused') && (
                      <button onClick={() => {
                        const newStart = prompt(t('camp_new_start', 'تاريخ بداية التجديد (YYYY-MM-DD):'), new Date().toISOString().slice(0, 10));
                        if (newStart) handleCampaignAction(c.id, 'renew', { new_start_date: newStart });
                      }} className="px-2.5 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-[10px] font-bold hover:bg-blue-600/30">{t('camp_renew', 'تجديد')}</button>
                    )}
                    {c.status !== 'cancelled' && c.status !== 'completed' && (
                      <button onClick={() => handleCampaignAction(c.id, 'cancelled')} className="px-2.5 py-1 bg-red-600/20 text-red-400 rounded-lg text-[10px] font-bold hover:bg-red-600/30">{t('camp_cancel', 'إلغاء')}</button>
                    )}
                    <button onClick={() => handleCampaignAction(c.id, 'delete')} className="px-2.5 py-1 bg-gray-700 text-gray-400 rounded-lg text-[10px] hover:bg-gray-600">{t('sa_delete', 'حذف')}</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdsTab;
