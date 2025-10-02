import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { CURRENCIES, getCurrencyName } from '../utils/currencyUtils';

const CurrencySelector = ({ selectedCurrency, onCurrencyChange }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleCurrencySelect = (currencyCode) => {
    onCurrencyChange(currencyCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <span className="font-medium">{CURRENCIES[selectedCurrency]?.symbol}</span>
        <span className="text-sm text-gray-600">{selectedCurrency}</span>
        <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[250px]">
            <div className="p-2 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-700">{t('select_currency')}</h3>
            </div>
            
            <div className="max-h-60 overflow-y-auto">
              {Object.entries(CURRENCIES).map(([code, currency]) => (
                <button
                  key={code}
                  onClick={() => handleCurrencySelect(code)}
                  className={`w-full text-left px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors ${
                    selectedCurrency === code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-lg">{currency.symbol}</span>
                      <div>
                        <div className="font-medium">{getCurrencyName(code)}</div>
                        <div className="text-sm text-gray-500">{code}</div>
                      </div>
                    </div>
                    {selectedCurrency === code && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CurrencySelector;