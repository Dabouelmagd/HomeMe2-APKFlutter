import React from 'react';
import FinancialDashboard from './FinancialDashboard';
import ResidentFinancialDashboard from './ResidentFinancialDashboard';

const FinancialRoute = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Admin sees the full financial dashboard
  if (user.role === 'admin') {
    return <FinancialDashboard />;
  }
  
  // Residents see their personal financial account
  return <ResidentFinancialDashboard />;
};

export default FinancialRoute;
