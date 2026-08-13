import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';
import fr from './locales/fr.json';

const API = `${process.env.REACT_APP_BACKEND_URL || ''}/api`;

// Built-in translations (fallback)
const builtIn = {
  en: { translation: en },
  ar: { translation: ar },
  fr: { translation: fr },
};

const savedLanguage = localStorage.getItem('i18nextLng');
const normalizedLang = savedLanguage ? savedLanguage.split('-')[0].toLowerCase() : null;
const defaultLng = (normalizedLang && ['ar', 'en', 'fr'].includes(normalizedLang))
  ? normalizedLang : 'ar';

if (!savedLanguage || !['ar', 'en', 'fr'].includes(normalizedLang)) {
  localStorage.setItem('i18nextLng', 'ar');
}

i18n
  .use(initReactI18next)
  .init({
    resources: builtIn,
    fallbackLng: 'ar',
    supportedLngs: ['ar', 'en', 'fr'],
    load: 'languageOnly',
    debug: false,
    interpolation: { escapeValue: false },
    lng: defaultLng,
    react: { useSuspense: false },
  });

i18n.on('languageChanged', (lng) => {
  const normalized = lng.split('-')[0].toLowerCase();
  localStorage.setItem('i18nextLng', normalized);
  document.dir = normalized === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = normalized;
});

// ── Dynamic translation loader ─────────────────────────────────
// After init, try to load updated translations from backend
// This allows real-time updates from TranslationManager without rebuild

const CACHE_KEY = 'homeme_translations_v2';
const CACHE_TTL = 30 * 60 * 1000; // 30 min

async function loadDynamicTranslations() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) {
        applyTranslations(data);
        return;
      }
    }

    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const res = await fetch(
      `${API}/translations/export/all`,
      { headers }
    );
    if (!res.ok) return;

    const data = await res.json();
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    applyTranslations(data);
  } catch {
    // Silent — built-in translations already loaded
  }
}

function applyTranslations(data) {
  // data = { ar: {...}, en: {...}, fr: {...} }
  ['ar', 'en', 'fr'].forEach(lang => {
    if (data[lang] && Object.keys(data[lang]).length > 0) {
      // Merge with built-in (backend overrides built-in)
      const merged = { ...builtIn[lang].translation, ...data[lang] };
      i18n.addResourceBundle(lang, 'translation', merged, true, true);
    }
  });
}

// Export function to force refresh after TranslationManager saves
export function refreshTranslations() {
  localStorage.removeItem(CACHE_KEY);
  return loadDynamicTranslations();
}

// Load on startup (non-blocking)
setTimeout(loadDynamicTranslations, 1000);

export default i18n;
