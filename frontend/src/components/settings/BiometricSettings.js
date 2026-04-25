import React, { useState, useEffect } from 'react';
import { useAuth } from '../../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ShieldCheckIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerBiometric,
  hasBiometricRegistered,
  removeBiometric
} from '../../services/webauthn';

const BiometricSettings = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const checkBiometricStatus = async () => {
      try {
        const supported = isWebAuthnSupported();
        const platformAvailable = await isPlatformAuthenticatorAvailable();
        setBiometricAvailable(supported && platformAvailable);

        if (supported && platformAvailable && user?.username) {
          const hasRegistered = await hasBiometricRegistered(user.username);
          setHasBiometric(hasRegistered);
        }
      } catch (error) {
        console.error('Error checking biometric status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkBiometricStatus();
  }, [user]);

  const handleRegisterBiometric = async () => {
    if (!user) return;
    
    setRegistering(true);
    try {
      const result = await registerBiometric(user.id, user.username);
      
      if (result.success) {
        setHasBiometric(true);
        toast.success(t('biometric_registered', 'تم تسجيل البصمة بنجاح'));
      } else {
        toast.error(result.error || t('biometric_registration_failed', 'فشل تسجيل البصمة'));
      }
    } catch (error) {
      console.error('Biometric registration error:', error);
      toast.error(t('biometric_error', 'حدث خطأ في البصمة'));
    } finally {
      setRegistering(false);
    }
  };

  const handleRemoveBiometric = async () => {
    if (!user) return;
    
    setRemoving(true);
    try {
      const success = await removeBiometric(user.id);
      
      if (success) {
        setHasBiometric(false);
        toast.success(t('biometric_removed', 'تم إزالة البصمة بنجاح'));
      } else {
        toast.error(t('biometric_removal_failed', 'فشل إزالة البصمة'));
      }
    } catch (error) {
      console.error('Biometric removal error:', error);
      toast.error(t('biometric_error', 'حدث خطأ'));
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className={`rounded-2xl p-6 ${biometricAvailable ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'}`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${biometricAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`}>
            {biometricAvailable ? (
              <CheckCircleIcon className="w-6 h-6 text-white" />
            ) : (
              <ExclamationTriangleIcon className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="flex-1">
            <h3 className={`font-bold ${biometricAvailable ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'}`}>
              {biometricAvailable 
                ? t('biometric_supported', 'جهازك يدعم البصمة') 
                : t('biometric_not_supported', 'البصمة غير مدعومة')}
            </h3>
            <p className={`text-sm mt-1 ${biometricAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {biometricAvailable 
                ? t('biometric_supported_desc', 'يمكنك تفعيل تسجيل الدخول بالبصمة أو بصمة الوجه')
                : t('biometric_not_supported_desc', 'جهازك أو متصفحك لا يدعم هذه الميزة')}
            </p>
          </div>
        </div>
      </div>

      {biometricAvailable && (
        <>
          {/* Current Status */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-lg hover:border-rose-200 dark:hover:border-rose-800 transition-all">
            <div className="p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                {t('biometric_status', 'حالة البصمة')}
              </h3>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${hasBiometric ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {hasBiometric 
                      ? t('biometric_active', 'البصمة مفعّلة')
                      : t('biometric_inactive', 'البصمة غير مفعّلة')}
                  </span>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                  hasBiometric 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' 
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                }`}>
                  {hasBiometric ? t('enabled', 'مفعّل') : t('disabled', 'معطّل')}
                </span>
              </div>
            </div>

            {/* Action Button */}
            <div className="px-6 pb-6">
              {!hasBiometric ? (
                <button
                  onClick={handleRegisterBiometric}
                  disabled={registering}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30"
                >
                  {registering ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{t('registering', 'جاري التسجيل...')}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                      </svg>
                      <span>{t('enable_biometric', 'تفعيل البصمة')}</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleRemoveBiometric}
                  disabled={removing}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {removing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{t('removing', 'جاري الإزالة...')}</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon className="w-5 h-5" />
                      <span>{t('remove_biometric', 'إزالة البصمة')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Supported Devices */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">
              {t('supported_devices', 'الأجهزة المدعومة')}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <DevicePhoneMobileIcon className="w-8 h-8 text-emerald-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{t('mobile', 'الجوال')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Face ID / Touch ID</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <ComputerDesktopIcon className="w-8 h-8 text-emerald-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{t('computer', 'الكمبيوتر')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Windows Hello</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
            <div className="flex gap-3">
              <ShieldCheckIcon className="w-6 h-6 text-rose-500 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-blue-800 dark:text-rose-300 mb-2">
                  {t('security_info', 'معلومات الأمان')}
                </h4>
                <ul className="text-sm text-rose-700 dark:text-rose-400 space-y-1.5">
                  <li>• {t('biometric_info_1', 'البصمة مخزنة بأمان على جهازك فقط')}</li>
                  <li>• {t('biometric_info_2', 'لا يتم إرسال بيانات بصمتك إلى أي خادم')}</li>
                  <li>• {t('biometric_info_3', 'يمكنك إزالة البصمة في أي وقت')}</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BiometricSettings;
