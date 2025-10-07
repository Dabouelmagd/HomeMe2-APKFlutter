import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  KeyIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CalendarDaysIcon,
  StarIcon
} from '@heroicons/react/24/outline';

const SubscriptionActivation = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeInfo, setCodeInfo] = useState(null);
  const [userSubscription, setUserSubscription] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // success, error, info

  const durations = {
    '1_month': 'شهر واحد',
    '2_months': 'شهرين', 
    '3_months': 'ثلاثة شهور',
    '6_months': 'ستة شهور',
    '1_year': 'سنة كاملة'
  };

  useEffect(() => {
    checkCurrentSubscription();
  }, []);

  const checkCurrentSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (!user.id) return;
      
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/${user.id}/subscription`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data) {
        setUserSubscription(response.data);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleCodeChange = async (value) => {
    setCode(value.toUpperCase());
    setCodeInfo(null);
    setMessage('');
    
    // التحقق من معلومات الكود إذا كان صحيح التنسيق
    if (value.length >= 10) {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/subscription-codes/${value.toUpperCase()}`
        );
        setCodeInfo(response.data);
      } catch (error) {
        if (error.response?.status === 404) {
          setMessage('الكود غير موجود');
          setMessageType('error');
        }
      }
    }
  };

  const handleActivateCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/subscription-codes/activate`,
        {
          code: code,
          user_id: user.id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setMessage(response.data.message);
        setMessageType('success');
        setUserSubscription(response.data.subscription);
        setCode('');
        setCodeInfo(null);
        
        // إعادة توجيه بعد 3 ثوانٍ
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } else {
        setMessage(response.data.message);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error activating code:', error);
      setMessage(error.response?.data?.message || 'حدث خطأ في تفعيل الكود');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateRemainingDays = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: 'نشط', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      used: { label: 'مستخدم', color: 'bg-blue-100 text-blue-800', icon: CheckCircleIcon },
      expired: { label: 'منتهي الصلاحية', color: 'bg-red-100 text-red-800', icon: XCircleIcon },
      disabled: { label: 'معطل', color: 'bg-gray-100 text-gray-800', icon: XCircleIcon }
    };
    
    const config = statusConfig[status] || statusConfig.active;
    const IconComponent = config.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <IconComponent className="w-4 h-4 mr-1" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-2xl mx-auto px-4">
        
        {/* Current Subscription Status */}
        {userSubscription && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <StarIcon className="w-10 h-10 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">اشتراكك النشط</h2>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">نوع الاشتراك</p>
                    <p className="font-semibold text-green-800">
                      {durations[userSubscription.duration]}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600">تاريخ التفعيل</p>
                    <p className="font-semibold text-green-800">
                      {formatDate(userSubscription.activated_at)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600">تاريخ الانتهاء</p>
                    <p className="font-semibold text-green-800">
                      {formatDate(userSubscription.expires_at)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-gray-600">الأيام المتبقية</p>
                    <p className="font-semibold text-green-800">
                      {calculateRemainingDays(userSubscription.expires_at)} يوم
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                  <span>الاشتراك نشط</span>
                </div>
                
                <div className="flex items-center">
                  <CalendarDaysIcon className="w-5 h-5 text-blue-500 mr-2" />
                  <span>تجديد تلقائي: {userSubscription.auto_renewal ? 'مفعل' : 'غير مفعل'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activation Form */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex items-center justify-center text-white">
              <KeyIcon className="w-8 h-8 mr-3" />
              <h1 className="text-2xl font-bold">تفعيل كود الاشتراك</h1>
            </div>
            <p className="text-blue-100 text-center mt-2">
              أدخل كود الاشتراك الخاص بك لتفعيل HomeMe
            </p>
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleActivateCode} className="space-y-6">
              <div>
                <label className="block text-lg font-medium text-gray-700 mb-3">
                  كود الاشتراك
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="w-full text-center text-xl font-mono bg-gray-50 border-2 border-gray-200 rounded-xl px-6 py-4 focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="HM1M-2024-XXXXXXXX"
                  required
                  disabled={loading}
                />
                
                <p className="text-sm text-gray-500 text-center mt-2">
                  أدخل الكود كما هو مكتوب (مع الشرطات)
                </p>
              </div>

              {/* Code Information */}
              {codeInfo && (
                <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-400">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">معلومات الكود</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-600">مدة الاشتراك</p>
                      <p className="font-semibold text-blue-900">
                        {durations[codeInfo.duration]}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-blue-600">حالة الكود</p>
                      <div className="mt-1">
                        {getStatusBadge(codeInfo.status)}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-blue-600">الاستخدامات</p>
                      <p className="font-semibold text-blue-900">
                        {codeInfo.current_uses}/{codeInfo.max_uses}
                      </p>
                    </div>
                    
                    {codeInfo.expires_at && (
                      <div>
                        <p className="text-blue-600">ينتهي في</p>
                        <p className="font-semibold text-blue-900">
                          {formatDate(codeInfo.expires_at)}
                        </p>
                      </div>
                    )}
                    
                    {codeInfo.compound_name && (
                      <div className="md:col-span-2">
                        <p className="text-blue-600">المجمع السكني</p>
                        <p className="font-semibold text-blue-900">
                          {codeInfo.compound_name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Message */}
              {message && (
                <div className={`p-4 rounded-lg ${
                  messageType === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : messageType === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  <div className="flex items-center">
                    {messageType === 'success' ? (
                      <CheckCircleIcon className="w-5 h-5 mr-2" />
                    ) : messageType === 'error' ? (
                      <XCircleIcon className="w-5 h-5 mr-2" />
                    ) : (
                      <ClockIcon className="w-5 h-5 mr-2" />
                    )}
                    <p className="font-medium">{message}</p>
                  </div>
                  
                  {messageType === 'success' && (
                    <p className="text-sm mt-2">
                      جاري إعادة التوجيه إلى لوحة التحكم...
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !code.trim() || (codeInfo && codeInfo.status !== 'active')}
                className={`w-full py-4 px-8 rounded-xl font-semibold text-lg transition-all ${
                  loading || !code.trim() || (codeInfo && codeInfo.status !== 'active')
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 shadow-lg hover:shadow-xl'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    جاري التفعيل...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <KeyIcon className="w-6 h-6 mr-3" />
                    تفعيل الاشتراك
                  </div>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">تحتاج مساعدة؟</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-semibold text-gray-900">شكل الكود</h4>
                <p>HM1M-2024-ABC5XY2Z</p>
                <p className="text-xs">يبدأ بـ HM ويحتوي على شرطات</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900">مدد الاشتراك</h4>
                <p>من شهر واحد إلى سنة كاملة</p>
                <p className="text-xs">حسب نوع الكود المشتري</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900">مشاكل الكود؟</h4>
                <p>تأكد من صحة الكتابة</p>
                <p className="text-xs">أو تواصل مع الدعم الفني</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionActivation;