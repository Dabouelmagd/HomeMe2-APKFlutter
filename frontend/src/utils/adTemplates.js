/**
 * AdTemplates — مكتبة قوالب تصميم جاهزة للإعلانات بدون صور
 * كل قالب يُنتج خلفية جميلة + نمط بصري حسب الـ position
 */

export const AD_TEMPLATES = {
  purple_dream: {
    name: 'حلم بنفسجي',
    label_en: 'Purple Dream',
    bg: 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600',
    text: 'text-white',
    accent: 'bg-white/25 text-white',
    emoji: '✨',
  },
  ocean_breeze: {
    name: 'نسيم المحيط',
    label_en: 'Ocean Breeze',
    bg: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600',
    text: 'text-white',
    accent: 'bg-white/25 text-white',
    emoji: '🌊',
  },
  sunset_glow: {
    name: 'توهج الغروب',
    label_en: 'Sunset Glow',
    bg: 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500',
    text: 'text-white',
    accent: 'bg-white/25 text-white',
    emoji: '🌅',
  },
  forest_green: {
    name: 'أخضر الغابة',
    label_en: 'Forest Green',
    bg: 'bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600',
    text: 'text-white',
    accent: 'bg-white/25 text-white',
    emoji: '🌿',
  },
  luxury_gold: {
    name: 'ذهبي فاخر',
    label_en: 'Luxury Gold',
    bg: 'bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-400',
    text: 'text-gray-900',
    accent: 'bg-gray-900/20 text-gray-900',
    emoji: '👑',
  },
  midnight_tech: {
    name: 'ليل التقنية',
    label_en: 'Midnight Tech',
    bg: 'bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900',
    text: 'text-cyan-100',
    accent: 'bg-cyan-400/30 text-cyan-50 ring-1 ring-cyan-400/50',
    emoji: '⚡',
  },
  royal_navy: {
    name: 'أزرق ملكي',
    label_en: 'Royal Navy',
    bg: 'bg-gradient-to-r from-blue-900 via-blue-700 to-indigo-800',
    text: 'text-white',
    accent: 'bg-amber-400 text-blue-900 font-bold',
    emoji: '⚜️',
  },
  rose_gold: {
    name: 'وردي ذهبي',
    label_en: 'Rose Gold',
    bg: 'bg-gradient-to-r from-rose-400 via-pink-400 to-orange-300',
    text: 'text-white',
    accent: 'bg-white/30 text-white',
    emoji: '🌸',
  },
  cairo_sand: {
    name: 'رمال القاهرة',
    label_en: 'Cairo Sand',
    bg: 'bg-gradient-to-r from-amber-700 via-orange-600 to-red-700',
    text: 'text-white',
    accent: 'bg-yellow-200/90 text-amber-900 font-bold',
    emoji: '🏜️',
  },
  neon_lime: {
    name: 'لايم نيون',
    label_en: 'Neon Lime',
    bg: 'bg-gradient-to-r from-lime-400 via-green-400 to-emerald-500',
    text: 'text-gray-900',
    accent: 'bg-gray-900/15 text-gray-900 font-bold',
    emoji: '💎',
  },
  minimal_white: {
    name: 'أبيض بسيط',
    label_en: 'Minimal White',
    bg: 'bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-300',
    text: 'text-gray-800',
    accent: 'bg-blue-600 text-white',
    emoji: '⚪',
  },
  blackout_red: {
    name: 'أسود أحمر',
    label_en: 'Blackout Red',
    bg: 'bg-gradient-to-r from-black via-gray-900 to-red-900',
    text: 'text-white',
    accent: 'bg-red-500 text-white font-bold',
    emoji: '🔥',
  },
};

export const DEFAULT_TEMPLATE = 'purple_dream';

/**
 * يعرض إعلان باستخدام قالب (بدون صورة)
 * Usage: <TemplateAdView ad={ad} t={t} variant="full" />
 */
export const renderTemplateStyles = (templateKey) => {
  return AD_TEMPLATES[templateKey] || AD_TEMPLATES[DEFAULT_TEMPLATE];
};
