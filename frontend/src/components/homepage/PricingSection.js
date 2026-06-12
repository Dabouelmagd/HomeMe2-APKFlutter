import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircleIcon, KeyIcon, BuildingOffice2Icon, LockClosedIcon
} from '@heroicons/react/24/outline';

/**
 * PricingSection — Residential & Company plans + comparison tables + subscription codes + payment methods.
 * Receives state and helper functions from the parent HomePage so it stays a pure presentational block.
 */
export const PricingSection = ({
  // toggles state
  billingPeriod, setBillingPeriod,
  currency, setCurrency,
  isYearly,
  // helpers
  priceOf, yearlyOf, savingsOf, sym,
  // data
  residentialPlans, companyPlans,
  comparisonFeatures, companyComparisonFeatures,
  paymentMethods,
  // subscription code
  subCode, setSubCode,
  codeStatus, codeLoading,
  handleCodeActivate,
  // subscribe
  handleSubscribe,
}) => {
  const { t } = useTranslation();

  return (
    <section className="py-20 bg-slate-950 text-white" id="pricing" data-testid="pricing-section">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_residential_plans')}</h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-8">{t('hp_residential_plans_desc')}</p>

          {/* Toggles Row */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
            <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
              <button onClick={() => setBillingPeriod('monthly')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${billingPeriod === 'monthly' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`} data-testid="toggle-monthly">{t('hp_monthly')}</button>
              <button onClick={() => setBillingPeriod('yearly')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all relative ${billingPeriod === 'yearly' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`} data-testid="toggle-yearly">
                {t('hp_yearly')}
                <span className="absolute -top-2.5 -left-2 px-1.5 py-0.5 bg-green-500 text-[9px] font-bold rounded-full text-white">{t('hp_save_20', 'وفّر 20%')}</span>
              </button>
            </div>
            <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
              <button onClick={() => setCurrency('egp')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currency === 'egp' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`} data-testid="toggle-egp">{t('hp_egp', 'ج.م EGP')}</button>
              <button onClick={() => setCurrency('usd')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currency === 'usd' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`} data-testid="toggle-usd">$ USD</button>
            </div>
          </div>
          {isYearly && <p className="text-xs text-green-400 mb-2">{t('hp_yearly_note')}</p>}
        </div>

        {/* Residential Plan Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {residentialPlans.map((plan, i) => (
            <div key={i} className={`relative rounded-2xl border-2 bg-white/5 backdrop-blur-sm p-6 transition-all hover:-translate-y-1 hover:shadow-2xl ${plan.color}`} data-testid={`plan-${plan.nameEn.toLowerCase()}`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full whitespace-nowrap">{plan.badge}</div>
              )}
              <div className="text-center mb-5">
                <h3 className="text-lg font-bold mb-0.5">{plan.name}</h3>
                <p className="text-[10px] text-gray-400 mb-1">{plan.nameEn}</p>
                <p className="text-xs text-blue-300 font-medium mb-3">{plan.residents}</p>
                {plan.monthly === 0 ? (
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-3xl font-black">{t('hp_free')}</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-black">{isYearly ? yearlyOf(plan.monthly) : priceOf(plan.monthly)}</span>
                      <span className="text-xs text-gray-400">{sym} / {isYearly ? t('hp_per_year') : t('hp_per_month')}</span>
                    </div>
                    {isYearly && plan.monthly > 0 && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-black shadow-lg" data-testid={`savings-badge-${plan.nameEn.toLowerCase()}`}>
                        <span>💰</span>
                        <span>وفّر {savingsOf(plan.monthly)} {sym}</span>
                      </div>
                    )}
                    {!isYearly && plan.monthly > 0 && (
                      <p className="text-[10px] text-emerald-400 mt-1 font-bold">
                        💡 {t('hp_save_yearly', `وفّر ${savingsOf(plan.monthly)} ${sym} مع التجديد السنوي`)}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <ul className="space-y-2 mb-5 text-sm">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-200 text-xs">{f}</span>
                  </li>
                ))}
                {plan.excluded.map((f, j) => (
                  <li key={`x-${j}`} className="flex items-start gap-2 opacity-30">
                    <span className="h-4 w-4 flex-shrink-0 flex items-center justify-center text-[10px] mt-0.5">✕</span>
                    <span className="text-gray-400 line-through text-xs">{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => handleSubscribe(plan.nameEn.toLowerCase())} className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${plan.ctaStyle}`}>{plan.cta}</button>
            </div>
          ))}
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-center mb-8" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_comparison_title')}</h3>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm" data-testid="comparison-table">
              <thead>
                <tr className="bg-white/10">
                  <th className="text-right py-3 px-4 font-bold text-gray-300">{t('hp_feature')}</th>
                  <th className="text-center py-3 px-3 font-bold text-gray-400">{t('plan_starter')}</th>
                  <th className="text-center py-3 px-3 font-bold text-sky-400">{t('plan_basic')}</th>
                  <th className="text-center py-3 px-3 font-bold text-blue-400">{t('plan_pro')}</th>
                  <th className="text-center py-3 px-3 font-bold text-violet-400">{t('plan_premium')}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feat, i) => (
                  <tr key={i} className={`${i % 2 === 0 ? 'bg-white/[0.02]' : ''} ${feat.highlight ? 'bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10' : ''}`}>
                    <td className={`py-2.5 px-4 text-xs ${feat.highlight ? 'text-violet-200 font-semibold' : 'text-gray-300'}`}>{feat.name}</td>
                    {['starter', 'basic', 'pro', 'premium'].map(tier => {
                      const val = feat[tier];
                      return (
                        <td key={tier} className="text-center py-2.5 px-3">
                          {val === true ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-400 mx-auto" />
                          ) : typeof val === 'string' ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{val}</span>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-white/5 border-t border-white/10">
                  <td className="py-3 px-4 font-bold text-white text-xs">{t('hp_price_label')} {isYearly ? t('hp_yearly_price') : t('hp_monthly_price')}</td>
                  <td className="text-center py-3 px-3 text-xs font-bold text-gray-300">{t('hp_free')}</td>
                  <td className="text-center py-3 px-3 text-xs font-bold text-sky-300">{isYearly ? yearlyOf(800) : priceOf(800)} {sym}</td>
                  <td className="text-center py-3 px-3 text-xs font-bold text-blue-300">{isYearly ? yearlyOf(1500) : priceOf(1500)} {sym}</td>
                  <td className="text-center py-3 px-3 text-xs font-bold text-violet-300">{isYearly ? yearlyOf(2800) : priceOf(2800)} {sym}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Subscription Codes */}
        <div className="mb-20 max-w-3xl mx-auto" data-testid="subscription-codes-section">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/10 text-green-400 rounded-full text-sm font-medium mb-3 border border-green-500/20">
              <KeyIcon className="h-4 w-4" />
              {t('hp_sub_codes')}
            </div>
            <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_have_code')}</h3>
            <p className="text-gray-400 text-sm">{t('hp_code_desc')}</p>
          </div>
          <div className="grid grid-cols-5 gap-3 mb-6">
            {[
              { label: t('dur_3m', '3 شهور'), icon: '3m', color: 'border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10' },
              { label: t('dur_6m', '6 شهور'), icon: '6m', color: 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10' },
              { label: t('dur_9m', '9 شهور'), icon: '9m', color: 'border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10' },
              { label: t('dur_1y', 'سنة'), icon: '1Y', color: 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10' },
              { label: t('dur_lifetime', 'مدى الحياة'), icon: '∞', color: 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10' },
            ].map((d, i) => (
              <div key={i} className={`rounded-xl border text-center py-3 px-2 transition-all ${d.color}`}>
                <p className="text-lg font-black text-white mb-0.5">{d.icon}</p>
                <p className="text-[10px] text-gray-300">{d.label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <input type="text" placeholder={t("hp_enter_code")} value={subCode} onChange={e => setSubCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCodeActivate()} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30" data-testid="subscription-code-input" />
            <button onClick={handleCodeActivate} disabled={codeLoading || !subCode.trim()} className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-500 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed" data-testid="activate-code-btn">
              {codeLoading ? '...' : t('hp_activate_code')}
            </button>
          </div>
          {codeStatus && (
            <div className={`mt-3 text-sm font-medium text-center py-2 px-4 rounded-lg ${codeStatus.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`} data-testid="code-status-message">
              {codeStatus.msg}
            </div>
          )}
        </div>

        {/* Company Plans */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 text-amber-400 rounded-full text-sm font-medium mb-4 border border-amber-500/20">
              <BuildingOffice2Icon className="h-4 w-4" />
              {t('hp_for_companies')}
            </div>
            <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_company_plans_title')}</h3>
            <p className="text-gray-400 text-sm max-w-lg mx-auto mb-6">{t('hp_company_plans_desc')}</p>

            {/* Toggles Row (Companies) */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
              <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                <button onClick={() => setBillingPeriod('monthly')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${billingPeriod === 'monthly' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`} data-testid="company-toggle-monthly">{t('hp_monthly')}</button>
                <button onClick={() => setBillingPeriod('yearly')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all relative ${billingPeriod === 'yearly' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`} data-testid="company-toggle-yearly">
                  {t('hp_yearly')}
                  <span className="absolute -top-2.5 -left-2 px-1.5 py-0.5 bg-green-500 text-[9px] font-bold rounded-full text-white">{t('hp_save_20', 'وفّر 20%')}</span>
                </button>
              </div>
              <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                <button onClick={() => setCurrency('egp')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currency === 'egp' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`} data-testid="company-toggle-egp">{t('hp_egp', 'ج.م EGP')}</button>
                <button onClick={() => setCurrency('usd')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currency === 'usd' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'}`} data-testid="company-toggle-usd">$ USD</button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {companyPlans.map((plan, i) => (
              <div key={i} className={`relative rounded-2xl border-2 bg-white/5 backdrop-blur-sm p-7 transition-all hover:-translate-y-1 hover:shadow-2xl ${plan.color}`} data-testid={`company-plan-${plan.nameEn.toLowerCase()}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-500 text-white text-xs font-bold rounded-full whitespace-nowrap">{plan.badge}</div>
                )}
                <div className="text-center mb-5">
                  <h3 className="text-xl font-bold mb-0.5">{plan.name}</h3>
                  <p className="text-[10px] text-gray-400 mb-1">{plan.nameEn}</p>
                  <p className="text-xs text-amber-300 font-medium mb-3">{plan.compounds}</p>
                  {plan.isCustom ? (
                    <span className="text-2xl font-black">{t('hp_custom_price', 'سعر مخصص')}</span>
                  ) : (
                    <div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-black">{isYearly ? yearlyOf(plan.monthly) : priceOf(plan.monthly)}</span>
                        <span className="text-xs text-gray-400">{sym} / {isYearly ? t('hp_per_year') : t('hp_per_month')}</span>
                      </div>
                      {isYearly && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-black shadow-lg" data-testid={`company-savings-${plan.nameEn.toLowerCase()}`}>
                          <span>💰</span>
                          <span>وفّر {savingsOf(plan.monthly)} {sym}</span>
                        </div>
                      )}
                      {!isYearly && (
                        <p className="text-[10px] text-emerald-400 mt-1 font-bold">
                          💡 وفّر {savingsOf(plan.monthly)} {sym} مع التجديد السنوي
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <CheckCircleIcon className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-200 text-xs">{f}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleSubscribe(`company_${plan.nameEn.toLowerCase()}`)} className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${plan.ctaStyle}`}>{plan.cta}</button>
              </div>
            ))}
          </div>
        </div>

        {/* Company Comparison Table */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-center mb-8" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_company_comparison')}</h3>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm" data-testid="company-comparison-table">
              <thead>
                <tr className="bg-white/10">
                  <th className="text-right py-3 px-4 font-bold text-gray-300">{t('hp_feature')}</th>
                  <th className="text-center py-3 px-3 font-bold text-amber-400">{t('cp_startup')}</th>
                  <th className="text-center py-3 px-3 font-bold text-orange-400">{t('cp_business')}</th>
                  <th className="text-center py-3 px-3 font-bold text-red-400">{t('cp_enterprise')}</th>
                </tr>
              </thead>
              <tbody>
                {companyComparisonFeatures.map((feat, i) => (
                  <tr key={i} className={`${i % 2 === 0 ? 'bg-white/[0.02]' : ''} ${feat.highlight ? 'bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10' : ''}`}>
                    <td className={`py-2.5 px-4 text-xs ${feat.highlight ? 'text-violet-200 font-semibold' : 'text-gray-300'}`}>{feat.name}</td>
                    {['startup', 'business', 'enterprise'].map(tier => (
                      <td key={tier} className="text-center py-2.5 px-3">
                        {typeof feat[tier] === 'string' ? (
                          <span className={`text-[10px] font-bold ${feat.highlight ? 'text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded' : 'text-amber-300'}`}>{feat[tier]}</span>
                        ) : feat[tier] ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-400 mx-auto" />
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-white/5 border-t border-white/10">
                  <td className="py-3 px-4 font-bold text-white text-xs">{t('hp_price_label')} {isYearly ? t('hp_yearly_price') : t('hp_monthly_price')}</td>
                  <td className="text-center py-3 px-3 text-xs font-bold text-amber-300">{isYearly ? yearlyOf(4000) : priceOf(4000)} {sym}</td>
                  <td className="text-center py-3 px-3 text-xs font-bold text-orange-300">{isYearly ? yearlyOf(9500) : priceOf(9500)} {sym}</td>
                  <td className="text-center py-3 px-3 text-xs font-bold text-red-300">{isYearly ? yearlyOf(25000) : priceOf(25000)} {sym}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-300 mb-6" style={{ fontFamily: "'Cairo', sans-serif" }}>{t('hp_payment_methods')}</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {paymentMethods.map((method, i) => {
              const Icon = method.icon;
              return (
                <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-3 hover:border-white/25 transition-all" data-testid={`payment-method-${i}`}>
                  <Icon className="h-5 w-5 text-blue-400" />
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">{method.name}</p>
                    <p className="text-[10px] text-gray-400">{method.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-6">
            <LockClosedIcon className="h-3.5 w-3.5 inline-block -mt-0.5 ml-1" />
            {t('hp_payments_secure')}
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
