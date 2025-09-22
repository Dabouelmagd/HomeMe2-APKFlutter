import React from 'react';
import { useTranslation } from 'react-i18next';

const TestUpdate = () => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-red-500 text-white p-4 rounded-lg m-4">
      <h2 className="text-2xl font-bold">🔴 {t('frontend_update_successful')}</h2>
      <p>{t('frontend_updates_working')}</p>
      <p>Timestamp: {new Date().toLocaleString()}</p>
    </div>
  );
};

export default TestUpdate;