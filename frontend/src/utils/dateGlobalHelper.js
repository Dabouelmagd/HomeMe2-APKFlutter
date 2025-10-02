// Global date formatting helper for consistency across all components
import { formatDate, parseDate, getDatePlaceholder } from './dateUtils';

// Replace toLocaleDateString with proper dd/mm/yyyy format
export const globalFormatDate = (date, options = {}) => {
  if (!date) return '';
  
  // If specific options are provided, use them
  if (options.year || options.month || options.day) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    // Use dd/mm/yyyy format with proper locale
    return formatDate(dateObj, 'short');
  }
  
  // Default to short format (dd/mm/yyyy)
  return formatDate(date, 'short');
};

export { formatDate, parseDate, getDatePlaceholder };
export default globalFormatDate;