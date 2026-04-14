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

const Login = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [savedUsername, setSavedUsername] = useState('');
  const [showBiometricLogin, setShowBiometricLogin] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the original page the user was trying to access
  const from = location.state?.from || '/select-account';

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
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              required
              placeholder={t('password')}
            />
          </div>

          {/* Remember Me Checkbox */}
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
      </div>
    </div>
  );
};

export default Login;
