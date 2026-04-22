import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { CheckIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

const LanguageSettings = () => {
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    setSelectedLanguage(i18n.language);
  }, [i18n.language]);

  const languages = [
    { 
      code: 'ar', 
      name: 'العربية', 
      nativeName: 'Arabic',
      flag: '🇸🇦',
      direction: 'rtl'
    },
    { 
      code: 'en', 
      name: 'English', 
      nativeName: 'الإنجليزية',
      flag: '🇺🇸',
      direction: 'ltr'
    },
    { 
      code: 'fr', 
      name: 'Français', 
      nativeName: 'الفرنسية',
      flag: '🇫🇷',
      direction: 'ltr'
    }
  ];

  const handleLanguageChange = async (langCode) => {
    if (langCode === selectedLanguage) return;
    
    setChanging(true);
    try {
      localStorage.setItem('i18nextLng', langCode);
      await i18n.changeLanguage(langCode);
      
      // Apply layout changes
      if (langCode === 'ar') {
        document.dir = 'rtl';
        document.documentElement.setAttribute('dir', 'rtl');
        document.body.classList.add('rtl');
      } else {
        document.dir = 'ltr';
        document.documentElement.setAttribute('dir', 'ltr');
        document.body.classList.remove('rtl');
      }
      
      setSelectedLanguage(langCode);
      toast.success(t('language_updated_successfully', 'تم تغيير اللغة بنجاح'));
      
      setTimeout(() => {
        window.location.reload();
      }, 800);
      
    } catch (error) {
      console.error('Language change error:', error);
      toast.error(t('failed_to_update_language', 'فشل تغيير اللغة'));
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Language Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-lg hover:border-rose-200 dark:hover:border-rose-800 transition-all">
        <div className="p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <GlobeAltIcon className="w-5 h-5 text-rose-500" />
            {t('select_language', 'اختر اللغة')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t('language_change_desc', 'سيتم إعادة تحميل الصفحة بعد تغيير اللغة')}
          </p>
          
          <div className="space-y-3">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                disabled={changing}
                className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                  selectedLanguage === lang.code
                    ? 'bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-500'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {/* Flag */}
                <span className="text-3xl">{lang.flag}</span>
                
                {/* Language Info */}
                <div className="flex-1 text-start">
                  <p className="font-bold text-gray-900 dark:text-white">{lang.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{lang.nativeName}</p>
                </div>
                
                {/* Check Icon */}
                {selectedLanguage === lang.code && (
                  <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center">
                    <CheckIcon className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RTL Info */}
      <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-5">
        <div className="flex gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <h4 className="font-bold text-rose-800 dark:text-rose-300 mb-1">
              {t('language_tip', 'نصيحة')}
            </h4>
            <p className="text-sm text-rose-700 dark:text-rose-400">
              {t('rtl_support_info', 'اللغة العربية تدعم الكتابة من اليمين إلى اليسار (RTL) بشكل كامل في التطبيق.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageSettings;
