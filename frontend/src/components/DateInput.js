import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate, parseDate, toInputFormat, getDatePlaceholder } from '../utils/dateUtils';

const DateInput = ({ 
  value, 
  onChange, 
  className = '', 
  placeholder = '', 
  label = '',
  required = false,
  disabled = false,
  ...props 
}) => {
  const { i18n } = useTranslation();
  const [internalValue, setInternalValue] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [focused, setFocused] = useState(false);

  // Update internal value when prop value changes
  useEffect(() => {
    if (value) {
      const inputFormatValue = toInputFormat(value);
      setInternalValue(inputFormatValue);
      
      if (!focused) {
        // Show localized format when not focused
        setDisplayValue(formatDate(value, 'short'));
      }
    } else {
      setInternalValue('');
      setDisplayValue('');
    }
  }, [value, focused]);

  // Update display when language changes
  useEffect(() => {
    if (value && !focused) {
      setDisplayValue(formatDate(value, 'short'));
    }
  }, [i18n.language, value, focused]);

  const handleFocus = (e) => {
    setFocused(true);
    // Switch to input format (YYYY-MM-DD) for HTML date input
    if (internalValue) {
      e.target.value = internalValue;
    }
  };

  const handleBlur = (e) => {
    setFocused(false);
    const inputValue = e.target.value;
    
    if (inputValue) {
      // Parse the date and format it for display
      const parsedDate = parseDate(inputValue);
      if (parsedDate) {
        setDisplayValue(formatDate(parsedDate, 'short'));
        // Call onChange with the parsed date
        if (onChange) {
          onChange({
            ...e,
            target: {
              ...e.target,
              value: inputValue
            }
          });
        }
      }
    } else {
      setDisplayValue('');
      if (onChange) {
        onChange({
          ...e,
          target: {
            ...e.target,
            value: ''
          }
        });
      }
    }
  };

  const handleChange = (e) => {
    const inputValue = e.target.value;
    setInternalValue(inputValue);
    
    if (focused) {
      // During focus, update immediately
      if (onChange) {
        onChange(e);
      }
    }
  };

  const inputClasses = `
    form-input w-full px-3 py-2 border border-gray-300 rounded-lg 
    focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
    ${className}
  `.trim();

  const localizedPlaceholder = placeholder || getDatePlaceholder();

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="date"
          value={focused ? internalValue : ''}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={inputClasses}
          placeholder={localizedPlaceholder}
          required={required}
          disabled={disabled}
          {...props}
        />
        {!focused && displayValue && (
          <div 
            className={`absolute inset-0 px-3 py-2 pointer-events-none flex items-center text-gray-900 ${
              i18n.language === 'ar' ? 'text-right' : 'text-left'
            }`}
          >
            {displayValue}
          </div>
        )}
        {!focused && !displayValue && (
          <div 
            className={`absolute inset-0 px-3 py-2 pointer-events-none flex items-center text-gray-500 ${
              i18n.language === 'ar' ? 'text-right' : 'text-left'
            }`}
          >
            {localizedPlaceholder}
          </div>
        )}
      </div>
    </div>
  );
};

export default DateInput;