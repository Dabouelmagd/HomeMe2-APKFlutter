import React, { useState, useEffect } from 'react';
import { useAuth } from '../../App';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  ShieldCheckIcon,
  TrashIcon,
  CheckIcon,
  FingerPrintIcon
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
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
          <FingerPrintIcon className="h-6 w-6 text-green-600" />
          {t('biometric_settings', 'إعدادات البصمة')}
        </h3>

        {/* Biometric Availability Status */}
        <div className={`mb-6 p-4 rounded-lg ${biometricAvailable ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'}`}>
          <div className="flex items-center gap-3">
            {biometricAvailable ? (
              <>
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                  <CheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">{t('biometric_supported', 'البصمة مدعومة')}</p>
                  <p className="text-sm text-green-600 dark:text-green-400">{t('device_supports_biometric', 'جهازك يدعم تسجيل الدخول بالبصمة')}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-800 flex items-center justify-center">
                  <ShieldCheckIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-300">{t('biometric_not_supported', 'البصمة غير مدعومة')}</p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">{t('device_not_support_biometric', 'جهازك لا يدعم تسجيل الدخول بالبصمة')}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {biometricAvailable && (
          <>
            {/* Current Status */}
            <div className="mb-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${hasBiometric ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {hasBiometric 
                      ? t('biometric_enabled', 'الدخول بالبصمة مفعّل') 
                      : t('biometric_disabled', 'الدخول بالبصمة غير مفعّل')}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${hasBiometric ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'}`}>
                  {hasBiometric ? t('active', 'نشط') : t('inactive', 'غير نشط')}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              {!hasBiometric ? (
                <button
                  onClick={handleRegisterBiometric}
                  disabled={registering}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registering ? (
                    <>
                      <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                      <span>{t('registering', 'جاري التسجيل...')}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                      </svg>
                      <span>{t('register_biometric', 'تسجيل البصمة / بصمة الوجه')}</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleRemoveBiometric}
                  disabled={removing}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {removing ? (
                    <>
                      <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                      <span>{t('removing', 'جاري الإزالة...')}</span>
                    </>
                  ) : (
                    <>
                      <TrashIcon className="w-6 h-6" />
                      <span>{t('remove_biometric', 'إزالة البصمة')}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Information */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">{t('how_biometric_works', 'كيف تعمل البصمة؟')}</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  {t('biometric_info_1', 'البصمة تُخزن بأمان على جهازك فقط')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  {t('biometric_info_2', 'يمكنك تسجيل الدخول بسرعة دون إدخال كلمة المرور')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  {t('biometric_info_3', 'تعمل مع بصمة الإصبع وبصمة الوجه (Face ID)')}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  {t('biometric_info_4', 'يمكنك إزالة البصمة في أي وقت')}
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BiometricSettings;
