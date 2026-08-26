import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';
import axios from 'axios';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import EgyptLocationPicker from './EgyptLocationPicker';
import {
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  UserIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import RegistrationPlanPicker from './RegistrationPlanPicker';
import CompanyRegistrationWizard from './CompanyRegistrationWizard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Register = () => {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = (searchParams.get('ref') || '').trim().toUpperCase();
  const [refInfo, setRefInfo] = useState(null);  // { valid, referrer_company_name }
  const [step, setStep] = useState('choose');
  const [accountType, setAccountType] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('starter');
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    full_name: '', phone: '', compound_name: '', company_name: '', compound_city: '', compound_address: '', units_count: '', buildings_count: '', compound_phone: '', compound_lat: '', compound_lng: '', compound_location: {},
    unit_number: '', subscription_code: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validate referral code on mount + auto-pick company_admin path if a ref is present
  useEffect(() => {
    if (!refCode) return;
    axios.get(`${API}/public/referral/lookup/${refCode}`)
      .then((res) => {
        if (res.data?.valid) {
          setRefInfo(res.data);
          // Pre-select company_admin since referrals only reward company-to-company
          setAccountType('company_admin');
        } else {
          setRefInfo({ valid: false });
        }
      })
      .catch(() => setRefInfo({ valid: false }));
  }, [refCode]);

  const accountTypes = [
    {
      id: 'compound_admin',
      role: 'admin',
      icon: BuildingOfficeIcon,
      title: t('register_compound', 'تسجيل مجتمع سكني'),
      desc: t('register_compound_desc', 'أنا مدير مجتمع سكني وأريد إنشاء حساب لإدارة المجتمع وإضافة السكان'),
      color: 'from-emerald-400 to-green-500',
      border: 'border-emerald-200 hover:border-emerald-400',
      bg: 'bg-emerald-50'
    },
    {
      id: 'company_admin',
      role: 'company_admin',
      icon: BuildingOffice2Icon,
      title: t('register_company', 'تسجيل شركة إدارة'),
      desc: t('register_company_desc', 'شركة تدير أكثر من مجتمع سكني وتريد حساب واحد لإدارتها جميعاً'),
      color: 'from-emerald-500 to-green-600',
      border: 'border-emerald-200 hover:border-emerald-400',
      bg: 'bg-emerald-50'
    },
    {
      id: 'resident',
      role: 'resident',
      icon: UserIcon,
      title: t('register_resident', 'تسجيل مقيم'),
      desc: t('register_resident_desc', 'أنا مقيم في مجتمع سكني وأريد الانضمام عبر رمز الاشتراك'),
      color: 'from-emerald-500 to-green-600',
      border: 'border-emerald-200 hover:border-emerald-400',
      bg: 'bg-emerald-50'
    }
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error(t('passwords_no_match', 'كلمتا المرور غير متطابقتين'));
      return;
    }
    // Match backend rules in /app/backend/auth_deps.py validate_password_strength
    const pwd = formData.password || '';
    if (pwd.length < 8) {
      toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (!/[A-Z]/.test(pwd)) {
      toast.error('كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)');
      return;
    }
    if (!/[a-z]/.test(pwd)) {
      toast.error('كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)');
      return;
    }
    if (!/\d/.test(pwd)) {
      toast.error('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      toast.error('كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (!@#$%^&*)');
      return;
    }

    setLoading(true);
    try {
      const selectedType = accountTypes.find(a => a.id === accountType);
      const registerData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone,
        role: selectedType?.role || 'resident',
        unit_number: formData.unit_number,
        subscription_code: formData.subscription_code,
        compound_id: '',
        compound_name: formData.compound_name || `كمبوند ${formData.full_name || formData.username}`,
        compound_address: formData.compound_address || '',
        compound_city: formData.compound_city || '',
        compound_phone: formData.compound_phone || '',
        units_count: formData.units_count ? parseInt(formData.units_count) : null,
        buildings_count: formData.buildings_count ? parseInt(formData.buildings_count) : null,
        compound_lat: formData.compound_lat ? parseFloat(formData.compound_lat) : null,
        compound_lng: formData.compound_lng ? parseFloat(formData.compound_lng) : null,
        ...(accountType === 'company_admin' ? {
          selected_plan: selectedPlan,
          ...(refInfo?.valid ? { referral_code: refCode } : {}),
        } : {}),
      };

      const result = await register(registerData);
      if (result.success) {
        toast.success(t('register_success', 'تم التسجيل بنجاح! جاري التوجيه لتسجيل الدخول...'));
        setTimeout(() => navigate('/login'), 1500);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(t('register_failed', 'فشل التسجيل. حاول مرة أخرى.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src="/homeme-logo.png"
            alt="HomeMe Logo"
            className="h-24 w-auto mx-auto mb-3"
          />
        </div>

        {/* Referral banner — shown when registering via a valid ref link */}
        {refInfo?.valid && (
          <div
            className="mb-4 bg-gradient-to-r from-emerald-50 via-white to-indigo-50 border border-emerald-300 rounded-xl p-4 flex items-center gap-3"
            data-testid="referral-banner"
          >
            <div className="text-3xl">🎉</div>
            <div className="flex-1 text-right">
              <div className="text-sm font-bold text-gray-900">
                مرحباً! أنت مدعو من <span className="text-emerald-700">{refInfo.referrer_company_name}</span>
              </div>
              <div className="text-[11px] text-gray-700 mt-1 leading-relaxed">
                🎁 ستحصل على <span className="font-bold text-emerald-700">خصم 15%</span> تلقائياً على أول اشتراك مدفوع كهدية ترحيبية.
              </div>
              <div className="text-[11px] text-gray-600 mt-0.5">
                الكود المُتتبَّع: <code className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">{refCode}</code>
              </div>
            </div>
          </div>
        )}
        {refCode && refInfo && !refInfo.valid && (
          <div
            className="mb-4 bg-amber-50 border border-amber-300 rounded-xl p-3 text-center text-xs text-amber-800"
            data-testid="referral-banner-invalid"
          >
            ⚠️ كود الإحالة <code className="font-mono">{refCode}</code> غير صالح، لكن يمكنك المتابعة بالتسجيل العادي.
          </div>
        )}

        {/* Step 1: Choose Account Type */}
        {step === 'choose' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8" data-testid="choose-account-type">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">{t('create_account', 'إنشاء حساب جديد')}</h2>
            <p className="text-center text-gray-500 mb-6">{t('choose_account_type', 'اختر نوع الحساب')}</p>

            <div className="space-y-3">
              {accountTypes.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => { setAccountType(type.id); setStep('form'); }}
                    className={`w-full flex items-center gap-4 p-5 rounded-xl border-2 text-right transition-all ${type.border} ${accountType === type.id ? type.bg : 'bg-white'} hover:shadow-md group`}
                    data-testid={`account-type-${type.id}`}
                  >
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${type.color} flex-shrink-0`}>
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">{type.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{type.desc}</p>
                    </div>
                    <ArrowLeftIcon className="h-5 w-5 text-gray-300 group-hover:text-gray-600 transition-colors flex-shrink-0" />
                  </button>
                );
              })}
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                {t('already_have_account', 'لديك حساب بالفعل؟')}{' '}
                <Link to="/login" className="text-emerald-600 font-semibold hover:underline">{t('sign_in', 'تسجيل الدخول')}</Link>
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Registration Form */}
        {step === 'form' && accountType === 'company_admin' && (
          <CompanyRegistrationWizard
            formData={formData}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
            selectedPlan={selectedPlan}
            setSelectedPlan={setSelectedPlan}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            loading={loading}
            onBackToAccountType={() => setStep('choose')}
          />
        )}

        {step === 'form' && accountType !== 'company_admin' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8" data-testid="register-form">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setStep('choose')} className="p-2 rounded-lg hover:bg-gray-100">
                <ArrowRightIcon className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {accountTypes.find(a => a.id === accountType)?.title}
                </h2>
                <p className="text-sm text-gray-500">{t('fill_details', 'أكمل البيانات التالية')}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('full_name', 'الاسم الكامل')}</label>
                  <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none" required data-testid="input-full-name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('username', 'اسم المستخدم')}</label>
                  <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none" required data-testid="input-username" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('email', 'البريد الإلكتروني')}</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none" required data-testid="input-email" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone', 'رقم الهاتف')}</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none" data-testid="input-phone" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('password', 'كلمة المرور')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-2.5 pe-11 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                      required
                      minLength="8"
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      data-testid="toggle-password-visibility"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('confirm_password', 'تأكيد كلمة المرور')}</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-2.5 pe-11 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
                      required
                      minLength="8"
                      data-testid="input-confirm-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      className="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      data-testid="toggle-confirm-password-visibility"
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Live password requirements checklist — matches backend validate_password_strength */}
              {(() => {
                const p = formData.password || '';
                const rules = [
                  { ok: p.length >= 8, label: '٨ أحرف على الأقل' },
                  { ok: /[A-Z]/.test(p), label: 'حرف كبير (A-Z)' },
                  { ok: /[a-z]/.test(p), label: 'حرف صغير (a-z)' },
                  { ok: /\d/.test(p), label: 'رقم (0-9)' },
                  { ok: /[!@#$%^&*(),.?":{}|<>]/.test(p), label: 'رمز خاص (!@#$%^&*)' },
                  { ok: p && formData.confirmPassword && p === formData.confirmPassword, label: 'تطابق كلمتي المرور' },
                ];
                return (
                  <div
                    className="bg-gray-50 border border-gray-200 rounded-xl p-3 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5"
                    data-testid="password-rules"
                    dir="rtl"
                  >
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

              {/* Conditional fields based on account type */}
              {accountType === 'resident' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('subscription_code', 'رمز الاشتراك')}</label>
                    <input type="text" name="subscription_code" value={formData.subscription_code} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none" placeholder={t('enter_subscription_code', 'أدخل رمز الاشتراك من المدير')} data-testid="input-subscription-code" />
                    <p className="text-xs text-gray-400 mt-1">{t('subscription_code_hint', 'رمز الاشتراك تحصل عليه من مدير المجتمع السكني')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('unit_number', 'رقم الوحدة')}</label>
                    <input type="text" name="unit_number" value={formData.unit_number} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none" data-testid="input-unit-number" />
                  </div>
                </div>
              )}

              {accountType === 'company_admin' && (
                <>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <p className="text-sm text-emerald-700 font-medium">{t('company_note', 'سيتم إنشاء حساب شركة لإدارة عدة مجتمعات سكنية. يمكنك إضافة المجتمعات بعد التسجيل.')}</p>
                  </div>
                  <RegistrationPlanPicker selected={selectedPlan} onSelect={setSelectedPlan} />
                </>
              )}

              {accountType === 'compound_admin' && (
                <div className="space-y-4" dir="rtl">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <p className="text-sm text-emerald-700 font-bold">🏠 تفاصيل المجمع السكني</p>
                    <p className="text-xs text-emerald-600 mt-0.5">يمكنك إضافة الشعار وباقي التفاصيل بعد التسجيل من الإعدادات</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">اسم الكمبوند / العمارة *</label>
                      <input type="text" name="compound_name" value={formData.compound_name || ''} onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-300 outline-none"
                        placeholder="مثال: كمبوند النرجس، عمارة رقم 5..." required />
                    </div>
                  </div>
                  {/* Location Picker — full width */}
                  <div className="md:col-span-2">
                    <EgyptLocationPicker
                      value={formData.compound_location || {}}
                      onChange={(loc) => {
                        handleChange({ target: { name: 'compound_location', value: loc }});
                        handleChange({ target: { name: 'compound_city', value: loc.area || loc.governorate || '' }});
                        handleChange({ target: { name: 'compound_address', value: loc.fullLocation || '' }});
                      }}
                    />
                  </div>
                  {/* Hidden placeholder to maintain grid */ }
                  <div className="hidden">
                    {/* Map location picker */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">📍 الموقع على الخريطة</label>
                      <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-dashed border-emerald-300 rounded-xl overflow-hidden" style={{height: 180}}>
                        {formData.compound_lat ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="text-4xl mb-1">📍</div>
                            <p className="text-xs font-bold text-emerald-700">{formData.compound_address || 'تم تحديد الموقع'}</p>
                            <p className="text-[10px] text-gray-500">{Number(formData.compound_lat).toFixed(4)}, {Number(formData.compound_lng).toFixed(4)}</p>
                            <button type="button" onClick={() => {
                              const input = document.getElementById('reg-map-search');
                              if (input) input.focus();
                            }} className="mt-2 text-xs text-blue-600 underline">تغيير الموقع</button>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                            <div className="text-3xl">🗺️</div>
                            <p className="text-sm text-gray-600 text-center">ابحث عن موقع الكمبوند لتحديده على الخريطة</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input
                          id="reg-map-search"
                          type="text"
                          placeholder="ابحث: مثال 'النرجس 6، القاهرة'"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300"
                          onKeyDown={async (e) => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            const q = e.target.value.trim();
                            if (!q) return;
                            try {
                              const key = 'AIzaSyBFpCjYAyk3Rqobw3UTzRRkVzdJozrIpNU';
                              const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q + ' مصر')}&language=ar&key=${key}`);
                              const data = await res.json();
                              if (data.results?.[0]) {
                                const loc = data.results[0].geometry.location;
                                handleChange({ target: { name: 'compound_lat', value: loc.lat }});
                                handleChange({ target: { name: 'compound_lng', value: loc.lng }});
                                if (!formData.compound_address) {
                                  handleChange({ target: { name: 'compound_address', value: data.results[0].formatted_address }});
                                }
                              }
                            } catch {}
                          }}
                        />
                        <button type="button" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700"
                          onClick={() => {
                            const input = document.getElementById('reg-map-search');
                            input?.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
                          }}>
                          بحث
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">عدد الوحدات السكنية</label>
                      <input type="number" name="units_count" value={formData.units_count || ''} onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-300 outline-none"
                        placeholder="50" min="1" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">عدد المباني</label>
                      <input type="number" name="buildings_count" value={formData.buildings_count || ''} onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-300 outline-none"
                        placeholder="1" min="1" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">هاتف الكمبوند</label>
                      <input type="tel" name="compound_phone" value={formData.compound_phone || ''} onChange={handleChange}
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-emerald-300 outline-none"
                        placeholder="01xxxxxxxxx" />
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
                    💡 بعد التسجيل: يمكنك رفع شعار الكمبوند وإضافة المزيد من التفاصيل من <strong>الإعدادات → نظرة عامة</strong>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-green-700 transition-all disabled:opacity-50 shadow-lg"
                data-testid="submit-register"
              >
                {loading ? t('registering', 'جاري التسجيل...') : t('create_account', 'إنشاء الحساب')}
              </button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                {t('already_have_account', 'لديك حساب بالفعل؟')}{' '}
                <Link to="/login" className="text-emerald-600 font-semibold hover:underline">{t('sign_in', 'تسجيل الدخول')}</Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
