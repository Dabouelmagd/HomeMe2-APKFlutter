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
const defaultLng = (savedLanguage && ['ar', 'en', 'fr'].includes(savedLanguage)) ? savedLanguage : 'ar';

// Ensure Arabic is set as default on first visit
if (!savedLanguage) {
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

export default i18n;
