import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const BackButton = ({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Don't show back button on home/dashboard page
  if (location.pathname === '/app/dashboard' || location.pathname === '/app') {
    return null;
  }

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  return (
    <button
      onClick={handleBack}
      className={`flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white hover:shadow-md transition-all transform hover:scale-105 border border-gray-200 ${className}`}
      title={t('go_back', 'رجوع')}
    >
      {isRTL ? (
        <>
          <ArrowRightIcon className="w-5 h-5" />
          <span className="font-semibold">{t('go_back', 'رجوع')}</span>
        </>
      ) : (
        <>
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="font-semibold">{t('go_back', 'Back')}</span>
        </>
      )}
    </button>
  );
};

export default BackButton;
