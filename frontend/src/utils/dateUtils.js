import i18n from '../i18n';

// Date format configurations for different locales
export const DATE_FORMATS = {
  en: {
    short: 'dd/mm/yyyy',     // Universal dd/mm/yyyy format
    long: 'd MMMM yyyy',
    locale: 'en-GB'          // Changed to GB for dd/mm format
  },
  ar: {
    short: 'dd/mm/yyyy',     // Universal dd/mm/yyyy format
    long: 'd MMMM yyyy',
    locale: 'ar-EG'
  },
  fr: {
    short: 'dd/mm/yyyy',     // Universal dd/mm/yyyy format
    long: 'd MMMM yyyy',
    locale: 'fr-FR'
  }
};

/**
 * Format a date according to the current language locale
 * @param {Date|string} date - The date to format
 * @param {string} format - 'short' or 'long' format
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  
  const currentLang = i18n.language || 'en';
  const config = DATE_FORMATS[currentLang] || DATE_FORMATS.en;
  
  try {
    if (format === 'short') {
      // Return dd/mm/yyyy format for ALL languages
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      
      return `${day}/${month}/${year}`; // dd/mm/yyyy for all languages
    } else {
      // Use browser's Intl.DateTimeFormat for long format
      return dateObj.toLocaleDateString(config.locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  } catch (error) {
    // Fallback to basic formatting
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }
};

/**
 * Parse a date string according to the current locale
 * @param {string} dateString - Date string to parse
 * @returns {Date|null} Parsed Date object or null if invalid
 */
export const parseDate = (dateString) => {
  if (!dateString) return null;
  
  const currentLang = i18n.language || 'en';
  
  // Handle ISO format (YYYY-MM-DD) - common from HTML date inputs
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString);
  }
  
  // Handle dd/mm/yyyy format for all languages
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
    const parts = dateString.split('/');
    
    // All languages now use dd/mm/yyyy format
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  
  // Try parsing with native Date constructor as fallback
  const parsed = new Date(dateString);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Convert a date to HTML date input format (YYYY-MM-DD)
 * @param {Date|string} date - Date to convert
 * @returns {string} Date in YYYY-MM-DD format
 */
export const toInputFormat = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? parseDate(date) : date;
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Get localized date placeholder text
 * @returns {string} Placeholder text for date inputs
 */
export const getDatePlaceholder = () => {
  const currentLang = i18n.language || 'en';
  
  switch (currentLang) {
    case 'ar':
      return 'يوم/شهر/سنة';
    case 'fr':
      return 'jj/mm/aaaa';
    case 'en':
    default:
      return 'mm/dd/yyyy';
  }
};

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  
  const now = new Date();
  const diffInMilliseconds = now - dateObj;
  const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  const currentLang = i18n.language || 'en';
  
  if (diffInMinutes < 1) {
    return currentLang === 'ar' ? 'الآن' : 
           currentLang === 'fr' ? 'maintenant' : 'now';
  } else if (diffInMinutes < 60) {
    return currentLang === 'ar' ? `${diffInMinutes} دقائق مضت` :
           currentLang === 'fr' ? `il y a ${diffInMinutes} minutes` :
           `${diffInMinutes} minutes ago`;
  } else if (diffInHours < 24) {
    return currentLang === 'ar' ? `${diffInHours} ساعات مضت` :
           currentLang === 'fr' ? `il y a ${diffInHours} heures` :
           `${diffInHours} hours ago`;
  } else if (diffInDays < 7) {
    return currentLang === 'ar' ? `${diffInDays} أيام مضت` :
           currentLang === 'fr' ? `il y a ${diffInDays} jours` :
           `${diffInDays} days ago`;
  } else {
    return formatDate(dateObj, 'short');
  }
};

/**
 * Validate if a date is valid
 * @param {Date|string} date - Date to validate
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidDate = (date) => {
  if (!date) return false;
  
  const dateObj = typeof date === 'string' ? parseDate(date) : date;
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
};

/**
 * Get the first day of week for current locale (0 = Sunday, 1 = Monday)
 * @returns {number} First day of week
 */
export const getFirstDayOfWeek = () => {
  const currentLang = i18n.language || 'en';
  
  switch (currentLang) {
    case 'ar':
    case 'fr':
      return 1; // Monday
    case 'en':
    default:
      return 0; // Sunday
  }
};

export default {
  formatDate,
  parseDate,
  toInputFormat,
  getDatePlaceholder,
  formatRelativeTime,
  isValidDate,
  getFirstDayOfWeek,
  DATE_FORMATS
};