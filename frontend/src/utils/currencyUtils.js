// Currency utilities for multi-currency support
import i18n from '../i18n';

export const CURRENCIES = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    name_ar: 'الدولار الأمريكي',
    name_fr: 'Dollar Américain',
    rate: 1.00 // Base currency
  },
  EGP: {
    code: 'EGP',
    symbol: 'ج.م',
    name: 'Egyptian Pound',
    name_ar: 'الجنيه المصري',
    name_fr: 'Livre Égyptienne',
    rate: 30.90
  },
  SAR: {
    code: 'SAR',
    symbol: 'ر.س',
    name: 'Saudi Riyal',
    name_ar: 'الريال السعودي',
    name_fr: 'Riyal Saoudien',
    rate: 3.75
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    name_ar: 'الدرهم الإماراتي',
    name_fr: 'Dirham des EAU',
    rate: 3.67
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    name_ar: 'اليورو',
    name_fr: 'Euro',
    rate: 0.85
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    name_ar: 'الجنيه الإسترليني',
    name_fr: 'Livre Sterling',
    rate: 0.73
  },
  QAR: {
    code: 'QAR',
    symbol: 'ر.ق',
    name: 'Qatari Riyal',
    name_ar: 'الريال القطري',
    name_fr: 'Riyal Qatari',
    rate: 3.64
  },
  KWD: {
    code: 'KWD',
    symbol: 'د.ك',
    name: 'Kuwaiti Dinar',
    name_ar: 'الدينار الكويتي',
    name_fr: 'Dinar Koweïtien',
    rate: 0.30
  },
  BHD: {
    code: 'BHD',
    symbol: 'د.ب',
    name: 'Bahraini Dinar',
    name_ar: 'الدينار البحريني',
    name_fr: 'Dinar Bahreïni',
    rate: 0.38
  },
  OMR: {
    code: 'OMR',
    symbol: 'ر.ع',
    name: 'Omani Riyal',
    name_ar: 'الريال العماني',
    name_fr: 'Riyal Omanais',
    rate: 0.38
  }
};

// Get currency name based on current language
export const getCurrencyName = (currencyCode) => {
  const currency = CURRENCIES[currencyCode];
  if (!currency) return currencyCode;
  
  const currentLang = i18n.language || 'en';
  
  if (currentLang.startsWith('ar')) {
    return currency.name_ar;
  } else if (currentLang.startsWith('fr')) {
    return currency.name_fr;
  } else {
    return currency.name;
  }
};

// Convert amount from USD to target currency
export const convertCurrency = (amount, fromCurrency = 'USD', toCurrency = 'USD') => {
  const fromRate = CURRENCIES[fromCurrency]?.rate || 1;
  const toRate = CURRENCIES[toCurrency]?.rate || 1;
  
  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate;
  const convertedAmount = usdAmount * toRate;
  
  return convertedAmount;
};

// Format currency display with proper symbol and formatting
export const formatCurrency = (amount, currencyCode = 'USD') => {
  const currency = CURRENCIES[currencyCode];
  if (!currency) return `${amount.toFixed(2)} ${currencyCode}`;
  
  const formattedAmount = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return `${currency.symbol} ${formattedAmount}`;
};

// Get default currency based on language
export const getDefaultCurrency = () => {
  const currentLang = i18n.language || 'en';
  
  if (currentLang.startsWith('ar')) {
    return 'SAR'; // Saudi Riyal for Arabic users
  } else {
    return 'USD'; // USD for others
  }
};

export default {
  CURRENCIES,
  getCurrencyName,
  convertCurrency,
  formatCurrency,
  getDefaultCurrency
};