/**
 * HomeMe — Single source of truth for subscription plans.
 * Used by both the public HomePage (/) and the in-app CompoundSubscription views.
 * Prices are in EGP (Egyptian Pounds). Yearly = monthly × 10 (2 months free).
 */

export const RESIDENTIAL_PLAN_KEYS = ['starter', 'basic', 'pro', 'premium'];
export const COMPANY_PLAN_KEYS = ['startup', 'business', 'enterprise'];

/**
 * Residential plans — for a single compound admin.
 * Translation keys follow the pattern used on HomePage.
 */
export const residentialPlans = [
  {
    key: 'starter',
    nameKey: 'plan_starter',
    nameAr: 'مجاني',
    nameEn: 'Starter',
    residentsKey: 'plan_30_residents',
    residentsDefault: 'حتى 30 ساكن',
    monthly: 0,
    color: 'border-gray-300',
    accent: 'bg-gray-500',
    badge: '',
  },
  {
    key: 'basic',
    nameKey: 'plan_basic',
    nameAr: 'أساسي',
    nameEn: 'Basic',
    residentsKey: 'plan_100_residents',
    residentsDefault: 'حتى 100 ساكن',
    monthly: 800,
    color: 'border-sky-400',
    accent: 'bg-sky-500',
    badge: '',
  },
  {
    key: 'pro',
    nameKey: 'plan_pro',
    nameAr: 'احترافي',
    nameEn: 'Pro',
    residentsKey: 'plan_unlimited_residents',
    residentsDefault: 'عدد غير محدود من السكان',
    monthly: 1500,
    color: 'border-blue-500 ring-2 ring-blue-500/20',
    accent: 'bg-blue-600',
    badgeKey: 'hp_most_popular',
    badgeDefault: 'الأكثر شعبية',
  },
  {
    key: 'premium',
    nameKey: 'plan_premium',
    nameAr: 'متقدم',
    nameEn: 'Premium',
    residentsKey: 'plan_unlimited_all',
    residentsDefault: 'عدد غير محدود - كل شيء',
    monthly: 2800,
    color: 'border-violet-500',
    accent: 'bg-violet-600',
    badge: '',
  },
];

/**
 * Company plans — for management companies with multiple compounds.
 */
export const companyPlans = [
  {
    key: 'startup',
    nameKey: 'cp_startup',
    nameAr: 'شركة ناشئة',
    nameEn: 'Startup',
    compoundsKey: 'cp_up_to_3',
    compoundsDefault: 'حتى 3 مجتمعات',
    monthly: 4000,
    color: 'border-amber-400',
    accent: 'bg-amber-500',
    badge: '',
  },
  {
    key: 'business',
    nameKey: 'cp_business',
    nameAr: 'شركة متوسطة',
    nameEn: 'Business',
    compoundsKey: 'cp_up_to_8',
    compoundsDefault: '1 - 8 مجتمعات',
    monthly: 9500,
    color: 'border-orange-500 ring-2 ring-orange-500/20',
    accent: 'bg-orange-500',
    badgeKey: 'hp_best_for_companies',
    badgeDefault: 'الأفضل للشركات',
  },
  {
    key: 'enterprise',
    nameKey: 'cp_enterprise',
    nameAr: 'شركة كبرى',
    nameEn: 'Enterprise',
    compoundsKey: 'plan_unlimited_all',
    compoundsDefault: 'عدد غير محدود',
    monthly: 25000,
    color: 'border-red-500',
    accent: 'bg-red-600',
    badge: '',
  },
];

/**
 * Price helpers — keep the same math used on the public HomePage.
 */
export const formatPrice = (egp, currency = 'egp', locale = 'ar') => {
  const val = currency === 'egp' ? egp : Math.round(egp * 0.02);
  return val.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
};

export const currencySymbol = (currency = 'egp', locale = 'ar') => {
  if (currency === 'egp') return locale === 'ar' ? 'ج.م' : 'EGP';
  return '$';
};

export const yearlyTotal = (monthly) => monthly * 10; // 2 months free

/**
 * Lookup helpers.
 */
export const getPlanByKey = (key) => {
  return (
    residentialPlans.find((p) => p.key === key) ||
    companyPlans.find((p) => p.key === key) ||
    null
  );
};

/**
 * Map `subscription_type` coming from the backend to a plan key.
 * The backend stores values like "1_month", "3_months", "lifetime", "trial",
 * which are duration-based; the plan (starter/basic/pro/…) is stored in
 * `subscription_plan`. We expose a single resolver for UI safety.
 */
export const resolvePlanFromSubscription = (subscription) => {
  if (!subscription) return null;
  const fromPlan = subscription.subscription_plan || subscription.plan;
  if (fromPlan) {
    const p = getPlanByKey(String(fromPlan).toLowerCase());
    if (p) return p;
  }
  // Fallback by type
  const t = subscription.subscription_type || subscription.type;
  if (t === 'lifetime') {
    // Lifetime is typically the premium tier
    return getPlanByKey('premium');
  }
  return null;
};
