import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmtPrice = (n) => {
  if (!n || n === 0) return 'مجاناً';
  return `${Number(n).toLocaleString('ar-EG')} ج.م / شهر`;
};

/**
 * RegistrationPlanPicker — بطاقات مقارنة الخطط لاختيار خطة أولية عند التسجيل كشركة إدارة.
 *
 * Props:
 *   selected       - مفتاح الخطة الحالية (starter | company_startup | company_business | company_enterprise)
 *   onSelect       - callback(planKey)
 */
const RegistrationPlanPicker = ({ selected, onSelect }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/public/company-plans`)
      .then((res) => setPlans(res.data?.plans || []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />;
  if (plans.length === 0) return null;

  return (
    <div className="space-y-3" data-testid="registration-plan-picker">
      <div className="text-sm font-bold text-gray-700 flex items-center gap-2">
        <span className="text-lg">🎯</span>
        اختر خطتك الأولية
        <span className="text-[10px] text-gray-400 font-normal">(يمكنك الترقية في أي وقت لاحقاً)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {plans.map((p) => {
          const isSelected = selected === p.key;
          const isPopular = p.popular;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onSelect(p.key)}
              className={`relative text-start rounded-xl border-2 p-4 transition-all ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-500/20'
                  : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow'
              }`}
              data-testid={`plan-card-${p.key}`}
            >
              {isPopular && (
                <span className="absolute -top-2 start-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow">
                  ⭐ الأكثر شعبية
                </span>
              )}
              {isSelected && (
                <span className="absolute -top-2 end-3 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow">
                  ✓ المختار
                </span>
              )}

              <div className="font-bold text-gray-900 text-sm mb-1">{p.name_ar || p.name_en}</div>
              <div className={`text-lg font-extrabold mb-2 ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                {fmtPrice(p.monthly_egp)}
              </div>

              <div className="text-[11px] text-gray-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600">🏘️</span>
                  <span>
                    {p.max_compounds === -1 ? 'كمبوندات بلا حدود' : `${p.max_compounds} كمبوند`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-600">👥</span>
                  <span>
                    {p.max_residents === -1 ? 'سكان بلا حدود' : `${Number(p.max_residents).toLocaleString('ar-EG')} ساكن`}
                  </span>
                </div>
                {p.feature_flags?.pdf_excel_exports && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600">📊</span>
                    <span>تقارير PDF/Excel</span>
                  </div>
                )}
                {p.feature_flags?.ai_financial_insights && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600">🧠</span>
                    <span>تحليلات AI مالية</span>
                  </div>
                )}
                {p.feature_flags?.priority_support && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600">⚡</span>
                    <span>دعم فني ذو أولوية</span>
                  </div>
                )}
                {p.feature_flags?.whitelabel && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600">🎨</span>
                    <span>White-label كامل</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selected && selected !== 'starter' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900" data-testid="plan-paid-notice">
          💡 الخطط المدفوعة تبدأ بحالة "بانتظار الدفع". بعد إتمام التسجيل، ستظهر تعليمات الدفع في لوحة التحكم الخاصة بك. يمكنك استخدام الخطة المجانية حتى يتم التفعيل.
        </div>
      )}
    </div>
  );
};

export default RegistrationPlanPicker;
