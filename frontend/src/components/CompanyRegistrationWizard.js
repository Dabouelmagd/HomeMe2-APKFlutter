import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BuildingOffice2Icon,
  UserCircleIcon,
  CreditCardIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import RegistrationPlanPicker from './RegistrationPlanPicker';

/**
 * CompanyRegistrationWizard — Feature #52
 *
 * 3-step wizard for new company_admin registrations.
 *  Step 1 → Company details
 *  Step 2 → Admin (you) details + password
 *  Step 3 → Plan picker + final submit
 *
 * Validates each step before allowing "Next". The parent form (Register.js)
 * keeps using the same `formData` + handlers so the back-end payload is
 * unchanged. The wizard is a UI shell around that data.
 */
const CompanyRegistrationWizard = ({
  formData,
  handleChange,
  handleSubmit,
  selectedPlan,
  setSelectedPlan,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  loading,
  onBackToAccountType,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState({});

  const totalSteps = 3;

  // Validation per step — return true if step is complete
  const isStep1Valid = !!(formData.company_name?.trim());
  const passwordOk =
    formData.password &&
    formData.password.length >= 8 &&
    /[A-Z]/.test(formData.password) &&
    /[a-z]/.test(formData.password) &&
    /\d/.test(formData.password) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) &&
    formData.password === formData.confirmPassword;
  const isStep2Valid = !!(
    formData.full_name?.trim() &&
    formData.username?.trim() &&
    formData.email?.trim() &&
    passwordOk
  );
  const isStep3Valid = !!selectedPlan;

  const stepValidity = [isStep1Valid, isStep2Valid, isStep3Valid];
  const currentValid = stepValidity[step - 1];

  const goNext = () => {
    setTouched((t) => ({ ...t, [`s${step}`]: true }));
    if (!currentValid) return;
    if (step < totalSteps) setStep(step + 1);
  };
  const goBack = () => {
    if (step > 1) setStep(step - 1);
    else if (onBackToAccountType) onBackToAccountType();
  };

  const stepMeta = [
    { id: 1, label: 'بيانات الشركة', Icon: BuildingOffice2Icon },
    { id: 2, label: 'بيانات المسؤول', Icon: UserCircleIcon },
    { id: 3, label: 'الخطة والدفع', Icon: CreditCardIcon },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8" data-testid="company-wizard">
      {/* Progress bar */}
      <div className="mb-6" data-testid="wizard-progress">
        <div className="flex items-center justify-between mb-3">
          {stepMeta.map((s, i) => {
            const Icon = s.Icon;
            const isCurrent = step === s.id;
            const isDone = step > s.id;
            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  disabled={s.id > step && !stepValidity.slice(0, s.id - 1).every(Boolean)}
                  onClick={() => {
                    // allow jumping back, or forward only if previous steps are valid
                    if (s.id < step || stepValidity.slice(0, s.id - 1).every(Boolean)) {
                      setStep(s.id);
                    }
                  }}
                  className={`flex flex-col items-center gap-1 transition ${
                    isCurrent
                      ? 'scale-110'
                      : isDone
                      ? 'opacity-100'
                      : 'opacity-60 cursor-not-allowed'
                  }`}
                  data-testid={`step-pill-${s.id}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md ${
                      isCurrent
                        ? 'bg-gradient-to-br from-emerald-500 to-green-600 ring-4 ring-emerald-200'
                        : isDone
                        ? 'bg-emerald-500'
                        : 'bg-gray-300'
                    }`}
                  >
                    {isDone ? <CheckIcon className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span
                    className={`text-[11px] font-bold mt-0.5 ${
                      isCurrent ? 'text-emerald-700' : isDone ? 'text-emerald-600' : 'text-gray-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
                {i < stepMeta.length - 1 && (
                  <div className="flex-1 h-1 mx-1.5 rounded-full overflow-hidden bg-gray-200">
                    <div
                      className={`h-full transition-all duration-500 ${
                        step > s.id ? 'bg-emerald-500 w-full' : 'bg-emerald-500 w-0'
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div className="text-center text-xs text-gray-500">
          الخطوة <strong className="text-emerald-700">{step}</strong> من {totalSteps}
        </div>
      </div>

      {/* Step 1 — Company */}
      {step === 1 && (
        <div className="space-y-5" data-testid="step-1-content">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <BuildingOffice2Icon className="h-5 w-5 text-emerald-600" />
            بيانات الشركة
          </h3>
          <p className="text-sm text-gray-500 -mt-3">
            أخبرنا عن شركة الإدارة التي ستدير عدة كمبوندات.
          </p>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              اسم الشركة <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="company_name"
              value={formData.company_name || ''}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none"
              placeholder="مثال: شركة الإدارة العقارية المحدودة"
              required
              data-testid="wizard-company-name"
            />
            {touched.s1 && !formData.company_name?.trim() && (
              <p className="text-xs text-rose-500 mt-1">اسم الشركة مطلوب</p>
            )}
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 leading-relaxed">
            💡 ستتمكن من إضافة كمبوندات وفروع لشركتك من لوحة التحكم بعد إكمال التسجيل.
          </div>
        </div>
      )}

      {/* Step 2 — Admin contact */}
      {step === 2 && (
        <div className="space-y-4" data-testid="step-2-content">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <UserCircleIcon className="h-5 w-5 text-emerald-600" />
            بياناتك كمسؤول الحساب
          </h3>
          <p className="text-sm text-gray-500 -mt-2">
            هذه البيانات لتسجيل دخولك واستلام الإيميلات الإدارية.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">الاسم الكامل <span className="text-rose-500">*</span></label>
              <input
                type="text" name="full_name"
                value={formData.full_name || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-300 outline-none"
                required
                data-testid="wizard-full-name"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">اسم المستخدم <span className="text-rose-500">*</span></label>
              <input
                type="text" name="username"
                value={formData.username || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-300 outline-none"
                required
                data-testid="wizard-username"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">البريد الإلكتروني <span className="text-rose-500">*</span></label>
              <input
                type="email" name="email"
                value={formData.email || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-300 outline-none"
                required
                data-testid="wizard-email"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">رقم الهاتف</label>
              <input
                type="tel" name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-300 outline-none"
                data-testid="wizard-phone"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">كلمة المرور <span className="text-rose-500">*</span></label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password || ''}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-3 pe-11 focus:ring-2 focus:ring-emerald-300 outline-none"
                  minLength="8"
                  required
                  data-testid="wizard-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-500"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">تأكيد كلمة المرور <span className="text-rose-500">*</span></label>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword || ''}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-300 outline-none"
                minLength="8"
                required
                data-testid="wizard-confirm-password"
              />
            </div>
          </div>

          {/* Live rules */}
          {(() => {
            const p = formData.password || '';
            const rules = [
              { ok: p.length >= 8, label: '٨ أحرف على الأقل' },
              { ok: /[A-Z]/.test(p), label: 'حرف كبير (A-Z)' },
              { ok: /[a-z]/.test(p), label: 'حرف صغير (a-z)' },
              { ok: /\d/.test(p), label: 'رقم (0-9)' },
              { ok: /[!@#$%^&*(),.?":{}|<>]/.test(p), label: 'رمز خاص' },
              { ok: p && formData.confirmPassword && p === formData.confirmPassword, label: 'تطابق كلمتي المرور' },
            ];
            return (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
                {rules.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${r.ok ? 'bg-emerald-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                      {r.ok ? '✓' : '·'}
                    </span>
                    <span className={r.ok ? 'text-emerald-700' : 'text-gray-600'}>{r.label}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Step 3 — Plan + submit */}
      {step === 3 && (
        <div className="space-y-5" data-testid="step-3-content">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5 text-emerald-600" />
            اختر الخطة المناسبة
          </h3>
          <p className="text-sm text-gray-500 -mt-2">
            تجربة مجانية 14 يوم. تقدر تلغي في أي وقت بدون رسوم.
          </p>
          <RegistrationPlanPicker selected={selectedPlan} onSelect={setSelectedPlan} />
          {touched.s3 && !selectedPlan && (
            <p className="text-sm text-rose-500 font-bold">اختر خطة للمتابعة</p>
          )}
        </div>
      )}

      {/* Footer nav */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-5 border-t border-gray-100">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 text-sm font-bold transition"
          data-testid="wizard-back-btn"
        >
          <ArrowRightIcon className="h-4 w-4" />
          {step === 1 ? 'تغيير نوع الحساب' : 'السابق'}
        </button>

        {step < totalSteps ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!currentValid}
            className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-white text-sm font-bold transition shadow-lg ${
              currentValid
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:scale-[1.03]'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
            data-testid="wizard-next-btn"
          >
            التالي
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              setTouched((t) => ({ ...t, s3: true }));
              if (!isStep3Valid) return;
              handleSubmit(e);
            }}
            disabled={loading || !isStep3Valid}
            className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-white text-sm font-bold transition shadow-lg ${
              isStep3Valid && !loading
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:scale-[1.03]'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
            data-testid="wizard-submit-btn"
          >
            {loading ? 'جاري التسجيل...' : '✓ إنشاء حساب الشركة'}
          </button>
        )}
      </div>
    </div>
  );
};

export default CompanyRegistrationWizard;
