import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';
import fr from './locales/fr.json';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
  fr: { translation: fr }
};

const savedLanguage = localStorage.getItem('i18nextLng');
// Normalize saved language (handle cases like 'ar-EG', 'en-US', etc.)
const normalizedLang = savedLanguage ? savedLanguage.split('-')[0].toLowerCase() : null;
const defaultLng = (normalizedLang && ['ar', 'en', 'fr'].includes(normalizedLang)) ? normalizedLang : 'ar';

// Always force Arabic on first visit or invalid stored language
if (!savedLanguage || !['ar', 'en', 'fr'].includes(normalizedLang)) {
  localStorage.setItem('i18nextLng', 'ar');
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    supportedLngs: ['ar', 'en', 'fr'],
    load: 'languageOnly',
    debug: false,
    
    interpolation: {
      escapeValue: false
    },
    
    lng: defaultLng,
    
    react: {
      useSuspense: false
    }
  });

// Always persist language changes to localStorage
i18n.on('languageChanged', (lng) => {
  const normalized = lng.split('-')[0].toLowerCase();
  localStorage.setItem('i18nextLng', normalized);
  document.dir = normalized === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = normalized;
});

export default i18n;
