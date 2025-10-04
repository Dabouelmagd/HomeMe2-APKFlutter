import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlayCircleIcon,
  PauseCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const VideoTutorial = () => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const tutorialSteps = [
    {
      id: 1,
      title: 'تسجيل الدخول',
      titleEn: 'Login Process', 
      description: 'ابدأ بإدخال اسم المستخدم وكلمة المرور للوصول إلى النظام',
      descriptionEn: 'Start by entering your username and password to access the system',
      image: '/tutorial_images/step1_login.png',
      duration: '30 ثانية',
      tips: ['استخدم بيانات اعتماد صحيحة', 'تأكد من اختيار اللغة المناسبة'],
      videoContent: {
        actions: [
          '1️⃣ افتح صفحة تسجيل الدخول',
          '2️⃣ أدخل اسم المستخدم: admin',
          '3️⃣ أدخل كلمة المرور: admin123',
          '4️⃣ اضغط على زر "تسجيل الدخول"'
        ],
        highlights: ['تأكد من صحة البيانات', 'انتظر حتى يتم التحقق']
      }
    },
    {
      id: 2,
      title: 'لوحة التحكم الرئيسية',
      titleEn: 'Main Dashboard',
      description: 'تعرف على لوحة التحكم والإحصائيات المتاحة',
      descriptionEn: 'Explore the main dashboard and available statistics',
      image: '/tutorial_images/step2_dashboard.png',
      duration: '45 ثانية',
      tips: ['راجع الإحصائيات الرئيسية', 'استخدم الإجراءات السريعة']
    },
    {
      id: 3,
      title: 'التنقل في القائمة الجانبية',
      titleEn: 'Sidebar Navigation',
      description: 'تعلم كيفية استخدام القائمة الجانبية المنظمة',
      descriptionEn: 'Learn how to use the organized sidebar navigation',
      image: '/tutorial_images/step3_sidebar.png',
      duration: '60 ثانية',
      tips: ['الأقسام منظمة بالألوان', 'كل قسم يحتوي على عدد العناصر']
    },
    {
      id: 4,
      title: 'إدارة المجمع',
      titleEn: 'Compound Management',
      description: 'استخدم أدوات إدارة المجمع لإدارة المقيمين والوحدات',
      descriptionEn: 'Use compound management tools to manage residents and units',
      image: '/tutorial_images/step4_compound.png',
      duration: '90 ثانية',
      tips: ['إضافة مقيمين جدد', 'إدارة معلومات المجمع', 'تحميل الشعار']
    },
    {
      id: 5,
      title: 'إضافة عائلة جديدة',
      titleEn: 'Add New Family',
      description: 'تعلم كيفية إضافة عائلة جديدة خطوة بخطوة',
      descriptionEn: 'Learn how to add a new family step by step',
      image: '/tutorial_images/step5_add_family.png',
      duration: '120 ثانية',
      tips: ['اتبع الخطوات المرقمة', 'تأكد من صحة البيانات', 'احفظ المعلومات']
    },
    {
      id: 6,
      title: 'مركز المساعدة',
      titleEn: 'Help Center',
      description: 'استخدم مركز المساعدة للحصول على الدعم',
      descriptionEn: 'Use the help center to get support when needed',
      image: '/tutorial_images/step6_help.png',
      duration: '45 ثانية',
      tips: ['استخدم البحث للعثور على الإجابات', 'تصفح الأقسام المنظمة']
    }
  ];

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      // Start progress simulation
      setVideoProgress(0);
      const interval = setInterval(() => {
        setVideoProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsPlaying(false);
            // Auto advance to next step when video completes
            if (autoPlay && currentStep < tutorialSteps.length - 1) {
              setTimeout(() => {
                setCurrentStep(currentStep + 1);
                setIsPlaying(true);
              }, 1000);
            }
            return 100;
          }
          return prev + 2; // Increase by 2% every 100ms
        });
      }, 100);
    }
  };

  const currentTutorial = tutorialSteps[currentStep];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">{t('video_tutorial')}</h2>
            <p className="text-purple-100">{t('interactive_guide_description')}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2"
          >
            <PlayCircleIcon className="h-5 w-5" />
            <span>{t('start_tutorial')}</span>
          </button>
        </div>
      </div>

      {/* Tutorial Preview */}
      <div className="p-6">
        <div className="grid md:grid-cols-3 gap-4">
          {tutorialSteps.slice(0, 3).map((step, index) => (
            <div
              key={step.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setCurrentStep(index);
                setShowModal(true);
              }}
            >
              <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                <PlayCircleIcon className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-gray-600 mb-2">{step.description}</p>
              <span className="text-xs text-blue-600 font-medium">{step.duration}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600 mb-4">{t('tutorial_benefits')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">✓ {t('step_by_step')}</span>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">✓ {t('interactive')}</span>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">✓ {t('multilingual')}</span>
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">✓ {t('practical_tips')}</span>
          </div>
        </div>
      </div>

      {/* Tutorial Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {t('step')} {currentStep + 1}: {currentTutorial.title}
                </h3>
                <p className="text-gray-600">{currentTutorial.description}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Video/Image Area */}
            <div className="aspect-video bg-gray-900 relative overflow-hidden">
              {isPlaying ? (
                // Active Video Simulation
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 animate-pulse">
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-xl font-semibold mb-2">🎬 {currentTutorial.title}</p>
                      <p className="text-blue-200">جاري تشغيل الفيديو التعليمي...</p>
                      
                      {/* Realistic progress bar */}
                      <div className="w-64 bg-white bg-opacity-20 rounded-full h-2 mx-auto mt-4">
                        <div 
                          className="bg-white h-2 rounded-full transition-all duration-300" 
                          style={{width: `${videoProgress}%`}}
                        ></div>
                      </div>
                      
                      {/* Live Tutorial Actions */}
                      <div className="mt-6 text-sm text-blue-100 max-w-md">
                        <p className="mb-3">📝 {currentTutorial.description}</p>
                        
                        {/* Current actions being demonstrated */}
                        {currentTutorial.videoContent && (
                          <div className="bg-white bg-opacity-10 rounded-lg p-4 mb-4">
                            <p className="font-semibold mb-2">🎬 الإجراءات الحالية:</p>
                            <div className="space-y-1">
                              {currentTutorial.videoContent.actions.map((action, index) => (
                                <div key={index} className={`text-xs ${
                                  videoProgress > (index * 25) ? 'text-green-300' : 'text-white opacity-60'
                                }`}>
                                  {videoProgress > (index * 25) && '✅ '}{action}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-center space-x-4 text-xs">
                          <span>⏱️ {currentTutorial.duration}</span>
                          <span>📊 خطوة {currentStep + 1} من {tutorialSteps.length}</span>
                          <span>🎯 {Math.round(videoProgress)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Animated overlay effects */}
                  <div className="absolute top-0 left-0 w-full h-full">
                    <div className="absolute top-4 left-4 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <div className="absolute top-4 right-4 text-white text-sm">🔴 LIVE</div>
                    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
                      <div className="flex space-x-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="w-2 h-8 bg-white bg-opacity-60 animate-bounce" style={{animationDelay: `${i * 0.1}s`}}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Paused State
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
                  <div className="text-center text-white">
                    <div className="relative">
                      <PlayCircleIcon className="h-20 w-20 mx-auto mb-4 opacity-80 hover:opacity-100 cursor-pointer transition-opacity" 
                                     onClick={togglePlay} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 bg-white rounded-full animate-ping opacity-20"></div>
                      </div>
                    </div>
                    <p className="text-xl font-semibold mb-2">{currentTutorial.title}</p>
                    <p className="text-purple-200">اضغط للتشغيل - فيديو تعليمي تفاعلي</p>
                    
                    {/* Preview thumbnails */}
                    <div className="mt-6 grid grid-cols-3 gap-2 max-w-sm mx-auto">
                      {[1,2,3].map(i => (
                        <div key={i} className="aspect-video bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                          <span className="text-xs">📱</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Video Controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent p-4">
                {/* Progress Bar */}
                <div className="w-full bg-white bg-opacity-20 rounded-full h-1 mb-4">
                  <div 
                    className="bg-blue-500 h-1 rounded-full transition-all duration-300" 
                    style={{width: `${videoProgress}%`}}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={togglePlay}
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-colors"
                    >
                      {isPlaying ? (
                        <PauseCircleIcon className="h-5 w-5" />
                      ) : (
                        <PlayCircleIcon className="h-5 w-5" />
                      )}
                      <span className="text-sm">{isPlaying ? t('pause') : t('play')}</span>
                    </button>
                    
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="bg-white bg-opacity-20 px-2 py-1 rounded">
                        {Math.round(videoProgress)}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 text-sm">
                    <button
                      onClick={() => setAutoPlay(!autoPlay)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        autoPlay ? 'bg-green-600 text-white' : 'bg-white bg-opacity-20 text-white'
                      }`}
                    >
                      🔄 {autoPlay ? 'تشغيل تلقائي' : 'تشغيل يدوي'}
                    </button>
                    <span className="text-blue-200">{currentTutorial.duration}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tutorial Content */}
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Tips */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">{t('helpful_tips')}</h4>
                  <ul className="space-y-2">
                    {currentTutorial.tips.map((tip, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-gray-700">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Progress */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">{t('tutorial_progress')}</h4>
                  <div className="space-y-3">
                    {tutorialSteps.map((step, index) => (
                      <div
                        key={step.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          index === currentStep
                            ? 'bg-blue-50 border-2 border-blue-200'
                            : index < currentStep
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                        onClick={() => setCurrentStep(index)}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === currentStep
                            ? 'bg-blue-600 text-white'
                            : index < currentStep
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {index < currentStep ? '✓' : index + 1}
                        </div>
                        <span className={`text-sm ${
                          index === currentStep ? 'text-blue-900 font-semibold' : 'text-gray-700'
                        }`}>
                          {step.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                <span>{t('previous')}</span>
              </button>

              <div className="flex space-x-2">
                {tutorialSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={nextStep}
                disabled={currentStep === tutorialSteps.length - 1}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{currentStep === tutorialSteps.length - 1 ? t('finish') : t('next')}</span>
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoTutorial;