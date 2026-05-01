import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  UserIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import RegistrationPlanPicker from './RegistrationPlanPicker';

const Register = () => {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('choose'); // choose, form
  const [accountType, setAccountType] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('starter');
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    full_name: '', phone: '', compound_name: '', company_name: '',
    unit_number: '', subscription_code: ''
  });

  const accountTypes = [
    {
      id: 'compound_admin',
      role: 'admin',
      icon: BuildingOfficeIcon,
      title: t('register_compound', 'تسجيل مجتمع سكني'),
      desc: t('register_compound_desc', 'أنا مدير مجتمع سكني وأريد إنشاء حساب لإدارة المجتمع وإضافة السكان'),
      color: 'from-blue-500 to-indigo-600',
      border: 'border-blue-200 hover:border-blue-400',
      bg: 'bg-blue-50'
    },
    {
      id: 'company_admin',
      role: 'company_admin',
      icon: BuildingOffice2Icon,
      title: t('register_company', 'تسجيل شركة إدارة'),
      desc: t('register_company_desc', 'شركة تدير أكثر من مجتمع سكني وتريد حساب واحد لإدارتها جميعاً'),
      color: 'from-purple-500 to-indigo-600',
      border: 'border-purple-200 hover:border-purple-400',
      bg: 'bg-purple-50'
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
    if (formData.password.length < 6) {
      toast.error(t('password_min_length', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'));
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
        ...(accountType === 'company_admin' ? { selected_plan: selectedPlan } : {}),
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
            src="https://customer-assets.emergentagent.com/job_homeme-subscriptions/artifacts/6yk66f7n_WhatsApp%20Image%202022-01-17%20at%2010.23.44%20AM.637bf42d664818.47361218.jpeg"
            alt="HomeMe Logo"
            className="h-24 w-auto mx-auto mb-3"
          />
        </div>

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
                <Link to="/login" className="text-blue-600 font-semibold hover:underline">{t('sign_in', 'تسجيل الدخول')}</Link>
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Registration Form */}
        {step === 'form' && (
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
                  <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none" required minLength="6" data-testid="input-password" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('confirm_password', 'تأكيد كلمة المرور')}</label>
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none" required minLength="6" data-testid="input-confirm-password" />
                </div>
              </div>

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
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <p className="text-sm text-purple-700 font-medium">{t('company_note', 'سيتم إنشاء حساب شركة لإدارة عدة مجتمعات سكنية. يمكنك إضافة المجتمعات بعد التسجيل.')}</p>
                  </div>
                  <RegistrationPlanPicker selected={selectedPlan} onSelect={setSelectedPlan} />
                </>
              )}

              {accountType === 'compound_admin' && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium">{t('compound_admin_note', 'سيتم تسجيلك كمدير مجتمع سكني. يمكنك إنشاء المجتمع وإضافة السكان والأمن والإداريين بعد التسجيل.')}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-lg"
                data-testid="submit-register"
              >
                {loading ? t('registering', 'جاري التسجيل...') : t('create_account', 'إنشاء الحساب')}
              </button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                {t('already_have_account', 'لديك حساب بالفعل؟')}{' '}
                <Link to="/login" className="text-blue-600 font-semibold hover:underline">{t('sign_in', 'تسجيل الدخول')}</Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
