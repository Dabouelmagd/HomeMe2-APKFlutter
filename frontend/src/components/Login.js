import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../App';
import { toast } from 'sonner';
import LanguageSwitcher from './LanguageSwitcher';
import { 
  isWebAuthnSupported, 
  isPlatformAuthenticatorAvailable, 
  authenticateWithBiometric,
  hasBiometricRegistered 
} from '../services/webauthn';
import { FingerPrintIcon } from '@heroicons/react/24/outline';
import InternalAdBanner from './InternalAdBanner';

const Login = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [savedUsername, setSavedUsername] = useState('');
  const [showBiometricLogin, setShowBiometricLogin] = useState(false);
  
  const { login, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Preserve ?owner_only=1 flag through the login → selector flow
  const ownerOnly = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('owner_only') === '1';
  const selectPath = ownerOnly ? '/select-account?owner_only=1' : '/select-account';

  // Only auto-redirect if user explicitly clicks "continue as" — keep form visible
  // so she can log in as a different user when clicking "Login" from homepage
  const alreadyLoggedIn = !!currentUser;
  const [autoRedirectCancelled, setAutoRedirectCancelled] = useState(false);

  useEffect(() => {
    // Only auto-redirect when explicit redirect flag is set (via navigation state)
    // or if owner_only=1 flow — otherwise show the form so user can switch accounts
    if (currentUser && location.state?.auto_continue === true && !autoRedirectCancelled) {
      const remembered = localStorage.getItem('rememberedAccount');
      const rememberCompound = localStorage.getItem('rememberCompound') === 'true';
      if (remembered && rememberCompound && !ownerOnly) {
        navigate('/app/dashboard', { replace: true });
      } else {
        navigate(selectPath, { replace: true });
      }
    }
  }, [currentUser, navigate, selectPath, ownerOnly, location.state, autoRedirectCancelled]);

  const handleSwitchAccount = () => {
    // Clear session so she can log in fresh
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedRole');
    localStorage.removeItem('selectedCompoundId');
    setAutoRedirectCancelled(true);
    window.location.reload();
  };
  
  // Get the original page the user was trying to access
  const from = location.state?.from || selectPath;

  // Check for saved credentials and biometric availability on mount
  useEffect(() => {
    const checkBiometric = async () => {
      const supported = isWebAuthnSupported();
      const platformAvailable = await isPlatformAuthenticatorAvailable();
      setBiometricAvailable(supported && platformAvailable);
      
      // Check for saved username
      const saved = localStorage.getItem('savedUsername');
      if (saved) {
        setSavedUsername(saved);
        setFormData(prev => ({ ...prev, username: saved }));
        
        // Check if user has biometric registered
        if (supported && platformAvailable) {
          const hasBio = await hasBiometricRegistered(saved);
          setShowBiometricLogin(hasBio);
        }
      }
      
      // Check remember me preference
      const rememberPref = localStorage.getItem('rememberMe') === 'true';
      setRememberMe(rememberPref);
    };
    
    checkBiometric();
  }, []);

  // Check for biometric when username changes
  useEffect(() => {
    const checkUserBiometric = async () => {
      if (formData.username && biometricAvailable) {
        const hasBio = await hasBiometricRegistered(formData.username);
        setShowBiometricLogin(hasBio);
      } else {
        setShowBiometricLogin(false);
      }
    };
    
    const debounce = setTimeout(checkUserBiometric, 500);
    return () => clearTimeout(debounce);
  }, [formData.username, biometricAvailable]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(formData);
      if (result.success) {
        // Save username if remember me is checked
        if (rememberMe) {
          localStorage.setItem('savedUsername', formData.username);
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('savedUsername');
          localStorage.setItem('rememberMe', 'false');
        }
        
        toast.success(t('welcome_back'));
        // Navigate to the original requested page or dashboard
        navigate(from, { replace: true });
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!formData.username) {
      toast.error(t('enter_username_first', 'أدخل اسم المستخدم أولاً'));
      return;
    }
    
    setBiometricLoading(true);
    
    try {
      const result = await authenticateWithBiometric(formData.username);
      
      if (result.success) {
        // Store token and user data
        localStorage.setItem('token', result.access_token);
        localStorage.setItem('user', JSON.stringify(result.user));
        
        // Save username for next time
        localStorage.setItem('savedUsername', formData.username);
        localStorage.setItem('rememberMe', 'true');
        
        toast.success(t('biometric_login_success', 'تم تسجيل الدخول بالبصمة بنجاح'));
        
        // Reload to update auth context
        window.location.href = from;
      } else {
        toast.error(result.error || t('biometric_login_failed', 'فشل تسجيل الدخول بالبصمة'));
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      toast.error(t('biometric_error', 'حدث خطأ في البصمة'));
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        
        <div className="auth-logo">
          <img 
            src="https://customer-assets.emergentagent.com/job_homeme-subscriptions/artifacts/6yk66f7n_WhatsApp%20Image%202022-01-17%20at%2010.23.44%20AM.637bf42d664818.47361218.jpeg"
            alt="HomeMe Logo"
            className="h-48 w-auto mx-auto mb-6"
          />
          <p>{t('welcome_back')}</p>
        </div>

        {alreadyLoggedIn && (
          <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl" data-testid="already-logged-in-banner" dir="rtl">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              <span className="me-1">👋</span>
              {t('already_logged_as', 'أنت مسجل دخول بالفعل باسم')}{' '}
              <b className="text-indigo-700 dark:text-indigo-300">{currentUser?.full_name || currentUser?.username}</b>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate(selectPath, { replace: true })}
                className="text-xs px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                data-testid="continue-current-session-btn"
              >
                {t('continue_current', 'متابعة بحسابي الحالي ←')}
              </button>
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="text-xs px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                data-testid="switch-account-btn"
              >
                {t('switch_account', '🔄 تسجيل دخول بحساب آخر')}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              {t('username')}
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="form-input"
              required
              placeholder={t('username')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              {t('password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input pe-12"
                required
                placeholder={t('password')}
                data-testid="password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-500 hover:text-gray-700"
                data-testid="toggle-password"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember Me + Forgot Password */}
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="mr-2 ml-2 text-sm text-gray-600">
                {t('remember_me', 'تذكرني')}
              </span>
            </label>
            <button
              type="button"
              onClick={() => toast.info(t('forgot_password_msg', 'تواصل مع إدارة المجمع لإعادة تعيين كلمة المرور'))}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              data-testid="forgot-password-btn"
            >
              {t('forgot_password', 'نسيت كلمة المرور؟')}
            </button>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                {t('signing_in')}
              </>
            ) : (
              t('sign_in')
            )}
          </button>
        </form>

        {/* Biometric Login Button */}
        {biometricAvailable && showBiometricLogin && (
          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {t('or', 'أو')}
                </span>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={biometricLoading || !formData.username}
              className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-green-500 text-green-600 rounded-lg hover:bg-green-50 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {biometricLoading ? (
                <>
                  <span className="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent"></span>
                  <span>{t('verifying', 'جاري التحقق...')}</span>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                  <span>{t('login_with_biometric', 'تسجيل الدخول بالبصمة')}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Show biometric availability hint */}
        {biometricAvailable && !showBiometricLogin && formData.username && (
          <p className="text-center text-sm text-gray-500 mt-4">
            {t('biometric_hint', 'يمكنك تفعيل الدخول بالبصمة من الإعدادات بعد تسجيل الدخول')}
          </p>
        )}

        <div className="text-center mt-6">
          <p className="text-gray-600">
            {t('dont_have_account')}{' '}
            <Link
              to="/"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('register_here')}
            </Link>
          </p>
        </div>

        {/* Login Page Ad */}
        <div className="mt-4">
          <InternalAdBanner position="login_page" maxAds={1} variant="slim" />
        </div>
      </div>
    </div>
  );
};

export default Login;
