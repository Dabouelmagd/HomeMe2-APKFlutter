import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { LanguageIcon, CheckIcon } from '@heroicons/react/24/outline';

const LanguageSettings = () => {
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);

  // Apply RTL layout when language changes
  useEffect(() => {
    const applyLanguageLayout = (lang) => {
      if (lang === 'ar') {
        document.dir = 'rtl';
        document.documentElement.setAttribute('dir', 'rtl');
        document.body.classList.add('rtl');
        document.body.style.direction = 'rtl';
      } else {
        document.dir = 'ltr';
        document.documentElement.setAttribute('dir', 'ltr');
        document.body.classList.remove('rtl');
        document.body.style.direction = 'ltr';
      }
    };

    // Apply layout for current language
    applyLanguageLayout(i18n.language);
    
    // Update selected language state
    setSelectedLanguage(i18n.language);
  }, [i18n.language]);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
  ];

  const handleLanguageChange = async (langCode) => {
    try {
      // Set in localStorage first to ensure persistence
      localStorage.setItem('i18nextLng', langCode);
      
      // Change language in i18n
      await i18n.changeLanguage(langCode);
      
      // Apply layout changes immediately
      if (langCode === 'ar') {
        document.dir = 'rtl';
        document.documentElement.setAttribute('dir', 'rtl');
        document.body.classList.add('rtl');
        document.body.style.direction = 'rtl';
      } else {
        document.dir = 'ltr';
        document.documentElement.setAttribute('dir', 'ltr');
        document.body.classList.remove('rtl');
        document.body.style.direction = 'ltr';
      }
      
      // Update state
      setSelectedLanguage(langCode);
      
      // Show success message
      toast.success(t('language_updated_successfully'));
      
      // Small delay to ensure all changes are applied
      setTimeout(() => {
        window.location.reload();
      }, 800);
      
    } catch (error) {
      console.error('Language change error:', error);
      toast.error(t('failed_to_update_language'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-6">{t('language_preferences')}</h3>
        
        <div className="space-y-4">
          {languages.map((lang) => (
            <div
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedLanguage === lang.code
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <span className="text-2xl mr-4 rtl:ml-4 rtl:mr-0">{lang.flag}</span>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">{lang.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {lang.code === 'en' && t('english_default_language')}
                  {lang.code === 'ar' && t('arabic_rtl_support')}
                  {lang.code === 'fr' && t('french_language')}
                </p>
              </div>
              {selectedLanguage === lang.code && (
                <CheckIcon className="h-5 w-5 text-blue-600" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <LanguageIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3 rtl:mr-3 rtl:ml-0">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">{t('language_support')}</h4>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                {t('language_support_description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageSettings;
