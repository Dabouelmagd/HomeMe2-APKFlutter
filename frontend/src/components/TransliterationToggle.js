import React, { useState, useContext, createContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import arabicTransliterate from 'arabic-transliterate';

// Create Transliteration Context
const TransliterationContext = createContext();

// Transliteration Provider
export const TransliterationProvider = ({ children }) => {
  const [transliterationEnabled, setTransliterationEnabled] = useState(false);
  const [transliterationMode, setTransliterationMode] = useState('arabic2latin'); // or 'latin2arabic'
  const { i18n } = useTranslation();

  useEffect(() => {
    // Load saved preference from localStorage
    const saved = localStorage.getItem('transliterationEnabled');
    if (saved !== null) {
      setTransliterationEnabled(JSON.parse(saved));
    }
  }, []);

  const toggleTransliteration = () => {
    const newState = !transliterationEnabled;
    setTransliterationEnabled(newState);
    localStorage.setItem('transliterationEnabled', JSON.stringify(newState));
  };

  const setMode = (mode) => {
    setTransliterationMode(mode);
    localStorage.setItem('transliterationMode', mode);
  };

  const transliterateText = (text, customDirection = null) => {
    if (!transliterationEnabled || !text) return text;
    
    const direction = customDirection || transliterationMode;
    
    try {
      // Only transliterate if current language is Arabic and mode is arabic2latin
      // or if current language is English/French and mode is latin2arabic
      const currentLang = i18n.language;
      
      if (direction === 'arabic2latin' && currentLang === 'ar') {
        return arabicTransliterate(text, direction);
      } else if (direction === 'latin2arabic' && (currentLang === 'en' || currentLang === 'fr')) {
        return arabicTransliterate(text, direction);
      }
      
      return text;
    } catch (error) {
      console.error('Transliteration error:', error);
      return text;
    }
  };

  const contextValue = {
    transliterationEnabled,
    transliterationMode,
    toggleTransliteration,
    setMode,
    transliterateText
  };

  return (
    <TransliterationContext.Provider value={contextValue}>
      {children}
    </TransliterationContext.Provider>
  );
};

// Hook to use transliteration context
export const useTransliteration = () => {
  const context = useContext(TransliterationContext);
  if (!context) {
    throw new Error('useTransliteration must be used within a TransliterationProvider');
  }
  return context;
};

// Transliteration Toggle Component
export const TransliterationToggle = ({ className = '' }) => {
  const { t, i18n } = useTranslation();
  const { 
    transliterationEnabled, 
    transliterationMode, 
    toggleTransliteration, 
    setMode 
  } = useTransliteration();

  const currentLang = i18n.language;
  const isArabic = currentLang === 'ar';

  return (
    <div className={`transliteration-toggle ${className}`}>
      <div className="flex items-center space-x-2 rtl:space-x-reverse">
        <button
          onClick={toggleTransliteration}
          className={`p-2 rounded-md text-xs font-medium transition-colors ${
            transliterationEnabled
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-600 border border-gray-300'
          }`}
          title={t('transliteration.toggle_tooltip')}
        >
          <span className="hidden sm:inline">
            {transliterationEnabled ? '⚡️' : '🔤'}
          </span>
          <span className="ml-1">
            {t('transliteration.toggle_label')}
          </span>
        </button>

        {transliterationEnabled && (
          <div className="flex items-center space-x-1 rtl:space-x-reverse">
            <select
              value={transliterationMode}
              onChange={(e) => setMode(e.target.value)}
              className="text-xs p-1 rounded border border-gray-300 bg-white"
              title={t('transliteration.mode_tooltip')}
            >
              <option value="arabic2latin">
                {t('transliteration.arabic_to_latin')}
              </option>
              <option value="latin2arabic">
                {t('transliteration.latin_to_arabic')}
              </option>
            </select>
          </div>
        )}
      </div>

      {transliterationEnabled && (
        <div className="mt-1 text-xs text-gray-500">
          {isArabic && transliterationMode === 'arabic2latin' && (
            <span>{t('transliteration.status_ar_to_en')}</span>
          )}
          {!isArabic && transliterationMode === 'latin2arabic' && (
            <span>{t('transliteration.status_en_to_ar')}</span>
          )}
          {((isArabic && transliterationMode === 'latin2arabic') || 
            (!isArabic && transliterationMode === 'arabic2latin')) && (
            <span>{t('transliteration.status_inactive')}</span>
          )}
        </div>
      )}
    </div>
  );
};

// Enhanced Text Component with Transliteration
export const TransliteratedText = ({ 
  children, 
  className = '', 
  transliterateOverride = null,
  ...props 
}) => {
  const { transliterateText } = useTransliteration();
  
  if (typeof children !== 'string') {
    return <span className={className} {...props}>{children}</span>;
  }

  const displayText = transliterateText(children, transliterateOverride);
  
  return (
    <span className={className} {...props}>
      {displayText}
    </span>
  );
};

// Hook for transliterating any text
export const useTransliteratedText = (text, customDirection = null) => {
  const { transliterateText } = useTransliteration();
  return transliterateText(text, customDirection);
};

export default TransliterationToggle;