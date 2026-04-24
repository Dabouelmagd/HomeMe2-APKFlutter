import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  SparklesIcon,
  TrophyIcon,
  ClockIcon,
  ArrowPathIcon,
  CreditCardIcon,
  KeyIcon,
  CheckCircleIcon,
  BanknotesIcon,
  XMarkIcon,
  DevicePhoneMobileIcon,
  QrCodeIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import ComingSoonBadge from './ComingSoonBadge';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TYPE_LABEL = {
  trial: 'تجريبي',
  lifetime: 'دائم (Lifetime)',
  '1_month': 'شهر واحد',
  '3_months': '3 شهور',
  '6_months': '6 شهور',
  '9_months': '9 شهور',
  '1_year': 'سنة كاملة',
  yearly: 'سنوي',
  monthly: 'شهري',
};

const planBadge = (type) => {
  if (type === 'lifetime') return { icon: TrophyIcon, bg: 'bg-gradient-to-br from-amber-500 to-orange-600', tone: 'أبدي' };
  if (type === 'trial' || !type) return { icon: ClockIcon, bg: 'bg-gradient-to-br from-sky-500 to-blue-600', tone: 'تجربة' };
  return { icon: SparklesIcon, bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', tone: 'نشط' };
};

/**
 * CompoundSubscriptionCard
 *   Displays the current compound subscription (type + price + expiry)
 *   and offers quick actions: apply a subscription code, open the
 *   payment methods dialog to change plan.
 *
 * Props:
 *   compoundId: string (required)
 *   onChanged: () => void (optional — called after plan change)
 */
const CompoundSubscriptionCard = ({ compoundId, onChanged }) => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showChange, setShowChange] = useState(false);

  const fetchData = async () => {
    if (!compoundId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/compounds/${compoundId}/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [compoundId]);

  if (loading) {
    return <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 animate-pulse h-36" />;
  }
  if (!data) return null;

  const sub = data.subscription || {};
  const typeLabel = TYPE_LABEL[sub.subscription_type] || sub.subscription_type || 'تجريبي';
  const badge = planBadge(sub.subscription_type);
  const BadgeIcon = badge.icon;

  // Monthly value — derived from plan key when available, else 0
  const resPlan = (data.plans?.residential || []).find((p) => p.key === sub.subscription_plan);
  const comPlan = (data.plans?.company || []).find((p) => p.key === sub.subscription_plan);
  const selectedPlan = resPlan || comPlan;
  const monthly = selectedPlan?.monthly_egp || 0;

  return (
    <>
      <div
        className="relative overflow-hidden rounded-2xl border border-rose-100 dark:border-rose-900/50 bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-all"
        data-testid="compound-subscription-card"
      >
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(244,63,94,0.6), transparent 40%)' }} />
        <div className="relative p-5 flex flex-wrap items-center gap-4">
          <div className={`p-3 rounded-2xl text-white shadow-lg ${badge.bg}`}>
            <BadgeIcon className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {t('current_subscription', 'الاشتراك الحالي')}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${badge.bg}`}>
                {badge.tone}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-4 flex-wrap text-sm">
              <span className="text-gray-700 dark:text-gray-200 font-semibold" data-testid="sub-type">
                🔖 {typeLabel}
              </span>
              {monthly > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold" data-testid="sub-value">
                  💰 {monthly.toLocaleString('ar-EG')} ج.م / شهرياً
                </span>
              )}
              {selectedPlan && (
                <span className="text-gray-600 dark:text-gray-300" data-testid="sub-plan">
                  · {selectedPlan.name_ar}
                </span>
              )}
              {sub.days_remaining !== null && sub.subscription_type !== 'lifetime' && (
                <span className="text-gray-500 dark:text-gray-400" data-testid="sub-days">
                  ⏱️ {sub.days_remaining} يوم متبقي
                </span>
              )}
              {sub.subscription_type === 'lifetime' && (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  ♾️ بدون تاريخ انتهاء
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowChange(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-bold shadow-md shadow-rose-500/30 transition-colors"
            data-testid="change-subscription-btn"
          >
            <ArrowPathIcon className="w-4 h-4" />
            {t('change_subscription', 'تغيير الاشتراك')}
          </button>
        </div>
      </div>

      {showChange && (
        <ChangeSubscriptionDialog
          compoundId={compoundId}
          plans={data.plans}
          currentSubscription={sub}
          onClose={() => setShowChange(false)}
          onApplied={() => { fetchData(); setShowChange(false); onChanged && onChanged(); }}
        />
      )}
    </>
  );
};

/**
 * ChangeSubscriptionDialog — shows the three payment methods:
 *   1. Subscription code (instant)
 *   2. Card payment (Stripe — existing flow, navigate to pricing)
 *   3. Bank transfer (manual — shows instructions)
 * Plus the plan picker so the admin can pick which plan to switch to.
 */
const ChangeSubscriptionDialog = ({ compoundId, plans, currentSubscription, onClose, onApplied }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('code'); // 'code' | 'card' | 'bank'
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);

  const handleApplyCode = async () => {
    if (!code.trim()) { toast.error(t('enter_code', 'أدخلي كود الاشتراك')); return; }
    setApplying(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API}/compounds/${compoundId}/subscription/apply-code`,
        { code: code.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message || t('sub_activated', 'تم تفعيل الاشتراك'));
      onApplied && onApplied();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('invalid_code', 'الكود غير صحيح'));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="change-sub-dialog"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-5 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <ArrowPathIcon className="w-5 h-5" />
            <h3 className="font-bold">{t('change_subscription', 'تغيير الاشتراك')}</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-lg" data-testid="change-sub-close">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Payment method selector — 6 modern options, some flagged قريباً */}
        <div className="px-5 pt-5">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
            {t('choose_payment_method', 'اختاري طريقة الدفع')}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'code', label: 'كود اشتراك',  icon: KeyIcon,              ready: true,  hint: 'اطلبيه من هوم مي' },
              { id: 'card', label: 'بطاقة ائتمان', icon: CreditCardIcon,       ready: true,  hint: 'Visa / Master / Meeza' },
              { id: 'bank', label: 'تحويل بنكي',   icon: BanknotesIcon,        ready: true,  hint: 'حوالة يدوية مع إثبات' },
              { id: 'instapay', label: 'InstaPay', icon: QrCodeIcon,           ready: true,  hint: 'تحويل فوري عبر البنك المركزي' },
              { id: 'vcash', label: 'Vodafone Cash', icon: DevicePhoneMobileIcon, ready: true, hint: 'دفع من محفظتك' },
              { id: 'applepay', label: 'Apple / Google Pay', icon: GlobeAltIcon, ready: false, eta: 'Q3 2026', hint: 'دفع بلمسة واحدة' },
            ].map((m) => {
              const Icon = m.icon;
              const active = tab === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { if (m.ready) setTab(m.id); }}
                  disabled={!m.ready}
                  className={`relative rounded-xl border-2 p-3 transition-all text-start ${
                    active
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 shadow'
                      : m.ready
                        ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-rose-300 cursor-pointer'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 opacity-70 cursor-not-allowed'
                  }`}
                  data-testid={`change-sub-tab-${m.id}`}
                  title={m.hint}
                >
                  {!m.ready && <ComingSoonBadge variant="corner" label="قريباً" />}
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${active ? 'text-rose-600' : m.ready ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'}`} />
                    <span className={`text-xs font-bold ${active ? 'text-rose-700 dark:text-rose-300' : m.ready ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500'}`}>
                      {m.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight truncate">{m.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {tab === 'code' && (
            <div className="space-y-3">
              <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-3 flex items-start gap-2">
                <KeyIcon className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-rose-700 dark:text-rose-200 leading-relaxed">
                  <b className="block mb-0.5">اطلبي كود الاشتراك من <span className="text-pink-600">HomeMe</span> 💎</b>
                  <span className="text-rose-600/80 dark:text-rose-300/80">تواصلي عبر الواتساب أو صفحة الدعم لاستلام كود تفعيل فوري حسب الخطة.</span>
                </div>
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-lg tracking-wider text-center focus:ring-2 focus:ring-rose-500 focus:border-transparent uppercase"
                data-testid="change-sub-code-input"
              />
              <button
                onClick={handleApplyCode}
                disabled={applying || !code.trim()}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-md shadow-rose-500/30"
                data-testid="change-sub-apply-code"
              >
                {applying ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircleIcon className="w-5 h-5" />
                )}
                <span>{applying ? t('applying', 'جاري التفعيل...') : t('activate', 'تفعيل')}</span>
              </button>
            </div>
          )}

          {tab === 'card' && (
            <PlanPicker
              plans={plans}
              currentKey={currentSubscription?.subscription_plan}
              method="card"
              ctaLabel={t('pay_card_cta', 'ادفعي ببطاقة الائتمان')}
              onCta={() => { window.location.href = '/app/pricing'; }}
            />
          )}

          {tab === 'bank' && (
            <PlanPicker
              plans={plans}
              currentKey={currentSubscription?.subscription_plan}
              method="bank"
              ctaLabel={t('pay_bank_cta', 'استلام بيانات التحويل البنكي')}
              onCta={() => { toast.success(t('bank_transfer_contact', 'سيتواصل معكم فريق الدعم على بريدك الإلكتروني لاستكمال التحويل')); }}
            />
          )}

          {tab === 'instapay' && (
            <InstaPayInstructions />
          )}

          {tab === 'vcash' && (
            <VodafoneCashInstructions />
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * InstaPayInstructions — static guide: send to our InstaPay Address, then share the reference.
 */
const InstaPayInstructions = () => {
  const handle = 'homeme@instapay';
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <QrCodeIcon className="w-5 h-5 text-purple-600" />
          <h4 className="text-sm font-bold text-purple-800 dark:text-purple-200">ادفعي عبر InstaPay</h4>
        </div>
        <ol className="text-xs text-purple-700 dark:text-purple-200 space-y-1.5 list-decimal ps-4">
          <li>افتحي تطبيق بنكك وادخلي خدمة <b>InstaPay</b>.</li>
          <li>
            أرسلي المبلغ إلى عنوان:
            <span className="inline-flex items-center gap-2 mx-2 px-2 py-1 rounded-md bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 font-mono text-purple-700 dark:text-purple-200">
              {handle}
              <button
                onClick={() => { navigator.clipboard?.writeText(handle); toast.success('تم النسخ'); }}
                className="text-[10px] text-purple-500 hover:text-purple-700"
                data-testid="instapay-copy"
              >نسخ</button>
            </span>
          </li>
          <li>احفظي <b>رقم العملية</b> الذي يظهر بعد التحويل.</li>
          <li>أرسليه لنا عبر الواتساب أو صفحة الدعم وسنفعل اشتراكك خلال ساعة.</li>
        </ol>
      </div>
      <button
        onClick={() => { window.location.href = '/app/support'; }}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all shadow-md shadow-purple-500/30"
        data-testid="instapay-support-cta"
      >
        <CheckCircleIcon className="w-5 h-5" />
        <span>أرسل رقم العملية للدعم</span>
      </button>
    </div>
  );
};

/**
 * VodafoneCashInstructions — static guide with merchant number + copy button.
 */
const VodafoneCashInstructions = () => {
  const number = '01006008552';
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <DevicePhoneMobileIcon className="w-5 h-5 text-red-600" />
          <h4 className="text-sm font-bold text-red-800 dark:text-red-200">ادفعي عبر Vodafone Cash</h4>
        </div>
        <ol className="text-xs text-red-700 dark:text-red-200 space-y-1.5 list-decimal ps-4">
          <li>اطلبي <b>*9*7#</b> من هاتفك أو افتحي تطبيق "كاش".</li>
          <li>
            أرسلي المبلغ إلى رقم هوم مي:
            <span className="inline-flex items-center gap-2 mx-2 px-2 py-1 rounded-md bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 font-mono text-red-700 dark:text-red-200">
              {number}
              <button
                onClick={() => { navigator.clipboard?.writeText(number); toast.success('تم النسخ'); }}
                className="text-[10px] text-red-500 hover:text-red-700"
                data-testid="vcash-copy"
              >نسخ</button>
            </span>
          </li>
          <li>احفظي <b>رسالة التأكيد</b> من فودافون.</li>
          <li>أرسليها لنا عبر الواتساب أو صفحة الدعم وسنفعل اشتراكك فوراً.</li>
        </ol>
      </div>
      <button
        onClick={() => { window.location.href = '/app/support'; }}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-md shadow-red-500/30"
        data-testid="vcash-support-cta"
      >
        <CheckCircleIcon className="w-5 h-5" />
        <span>أرسل رسالة التأكيد للدعم</span>
      </button>
    </div>
  );
};

/**
 * PlanPicker — simple price grid for residential plans, reused by card/bank tabs.
 */
const PlanPicker = ({ plans, currentKey, ctaLabel, onCta }) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(currentKey || 'pro');
  const allPlans = [...(plans?.residential || []), ...(plans?.company || [])];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {t('choose_plan', 'اختاري الخطة المناسبة')}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(plans?.residential || []).map((p) => (
          <button
            key={p.key}
            onClick={() => setSelected(p.key)}
            className={`text-center rounded-xl p-3 border-2 transition-all ${
              selected === p.key
                ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 shadow'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-rose-300'
            }`}
            data-testid={`change-sub-plan-${p.key}`}
          >
            <div className="font-bold text-sm text-gray-900 dark:text-white">{p.name_ar}</div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              {p.monthly_egp > 0 ? `${p.monthly_egp.toLocaleString('ar-EG')} ج.م` : 'مجاني'}
            </div>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onCta && onCta(selected)}
        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all shadow-md shadow-rose-500/30"
        data-testid="change-sub-cta"
      >
        {ctaLabel}
      </button>
      <p className="text-[11px] text-gray-400 text-center">
        {t('pricing_note', 'الأسعار قبل خصومات الاشتراك السنوي (شهرين مجاناً).')}
      </p>
    </div>
  );
};

export default CompoundSubscriptionCard;
