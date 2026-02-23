import React from 'react';
import { useTheme } from './ThemeProvider';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

const ThemeToggle = ({ className = '' }) => {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <button
      onClick={toggleDarkMode}
      className={`
        relative p-2 rounded-lg transition-all duration-300
        ${isDarkMode 
          ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }
        ${className}
      `}
      title={isDarkMode ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-6 h-6">
        {/* Sun Icon */}
        <SunIcon 
          className={`
            absolute inset-0 w-6 h-6 transition-all duration-300 transform
            ${isDarkMode ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}
          `}
        />
        {/* Moon Icon */}
        <MoonIcon 
          className={`
            absolute inset-0 w-6 h-6 transition-all duration-300 transform
            ${isDarkMode ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}
          `}
        />
      </div>
    </button>
  );
};

export default ThemeToggle;
