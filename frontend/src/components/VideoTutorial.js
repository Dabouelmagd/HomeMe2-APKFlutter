import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlayCircleIcon,
  PauseCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline';

// Add CSS for volume slider
const sliderCSS = `
  .slider {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    cursor: pointer;
  }
  
  .slider::-webkit-slider-track {
    background: rgba(255, 255, 255, 0.3);
    height: 4px;
    border-radius: 2px;
  }
  
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    background: #ffffff;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    cursor: pointer;
  }
  
  .slider::-moz-range-track {
    background: rgba(255, 255, 255, 0.3);
    height: 4px;
    border-radius: 2px;
  }
  
  .slider::-moz-range-thumb {
    background: #ffffff;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }
`;

const VideoTutorial = () => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true); // Auto-play enabled by default
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioContext, setAudioContext] = useState(null);

  const infographicSteps = [
    {
      id: 1,
      icon: '🔑',
      title: 'تسجيل الدخول',
      simple: 'ادخل بياناتك',
      visual: {
        main: '👤',
        arrow: '→',
        action: '🏠'
      }
    },
    {
      id: 2,
      icon: '📊',
      title: 'لوحة التحكم',
      simple: 'شاهد الإحصائيات',
      visual: {
        main: '📈',
        arrow: '→',
        action: '✅'
      }
    },
    {
      id: 3,
      icon: '🏠',
      title: 'إدارة المجمع',
      simple: 'أضف المقيمين',
      visual: {
        main: '👥',
        arrow: '→',
        action: '➕'
      }
    },
    {
      id: 4,
      icon: '💬',
      title: 'التواصل',
      simple: 'أرسل رسائل',
      visual: {
        main: '📨',
        arrow: '→',
        action: '📤'
      }
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

  // Simple audio system with pleasant sounds (no annoying beeps)
  const playAudioFeedback = async (type = 'play') => {
    if (isMuted) return;
    
    // Simple pleasant notification sounds using HTML5 Audio
    try {
      // Use simple click sounds instead of annoying beeps
      const audioElement = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwaQQJ5');
      audioElement.volume = Math.min(volume / 100, 0.1); // Very low volume
      audioElement.play().catch(() => {
        // Silently fail if audio doesn't work
        showVisualAudioFeedback(type);
      });
    } catch (error) {
      // Just show visual feedback if audio fails
      showVisualAudioFeedback(type);
    }
  };

  // Removed annoying beep sounds - using simple visual feedback instead

  // Removed complex beep generation - using simple feedback instead

  const showVisualAudioFeedback = (type) => {
    // Visual feedback when audio fails
    const colors = {
      play: 'bg-green-500',
      pause: 'bg-yellow-500',
      complete: 'bg-blue-500',
      progress: 'bg-purple-500'
    };
    
    // Create temporary visual indicator
    const indicator = document.createElement('div');
    indicator.className = `fixed top-4 right-4 ${colors[type] || 'bg-gray-500'} text-white px-3 py-2 rounded-lg z-50 animate-bounce`;
    indicator.textContent = `🔊 ${type}`;
    document.body.appendChild(indicator);
    
    setTimeout(() => {
      document.body.removeChild(indicator);
    }, 1000);
  };

  const startVideoPlayback = (resetProgress = true) => {
    if (resetProgress) {
      setVideoProgress(0);
    }
    setIsPlaying(true);
    playAudioFeedback('play');
    
    // Start progress simulation with enhanced audio cues
    const interval = setInterval(() => {
      setVideoProgress(prev => {
        // Audio cue every 25% with different tones (less frequent)
        if (prev > 0 && Math.round(prev) % 25 === 0 && prev !== 100) {
          playAudioFeedback('progress');
        }
        
        if (prev >= 100) {
          clearInterval(interval);
          setIsPlaying(false);
          playAudioFeedback('complete');
          
          // Auto advance to next step when video completes (slower transitions)
          if (autoPlay && currentStep < tutorialSteps.length - 1) {
            setTimeout(() => {
              setCurrentStep(prev => prev + 1);
              // Automatically start next video after 3 seconds for better user experience
              setTimeout(() => {
                startVideoPlayback(true);
              }, 1500);
            }, 3000);
          }
          return 100;
        }
        return prev + 0.2; // Much slower progress - very realistic and easy to follow
      });
    }, 250); // Much slower updates for very natural video pace
    
    return interval;
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      playAudioFeedback('pause');
    } else {
      startVideoPlayback(false); // Don't reset progress when resuming
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    playAudioFeedback('click');
  };

  const toggleFullscreen = async () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    playAudioFeedback('click');
    
    // Also try native fullscreen API for better experience
    try {
      const modalElement = document.querySelector('.video-tutorial-modal');
      if (newFullscreenState) {
        if (modalElement && modalElement.requestFullscreen) {
          await modalElement.requestFullscreen();
        } else if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      }
    } catch (error) {
      console.log('Native fullscreen not available, using CSS fullscreen');
    }
  };

  // Auto-play when modal opens
  React.useEffect(() => {
    if (showModal && autoPlay) {
      // Initialize audio context on user interaction (modal open)
      try {
        const initAudio = async () => {
          if (!audioContext) {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') {
              await ctx.resume();
            }
            setAudioContext(ctx);
          }
        };
        initAudio();
      } catch (error) {
        console.log('Audio initialization failed:', error);
      }

      // Start first video automatically after a short delay
      const timer = setTimeout(() => {
        startVideoPlayback(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [showModal, autoPlay]);

  // Auto-play when step changes (if auto-play is enabled)
  React.useEffect(() => {
    if (showModal && autoPlay && !isPlaying) {
      const timer = setTimeout(() => {
        startVideoPlayback(true);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  const safeCurrentStep = Math.min(currentStep, infographicSteps.length - 1);
  const currentInfo = infographicSteps[safeCurrentStep] || infographicSteps[0];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: sliderCSS }} />
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">دليل الاستخدام المبسط</h2>
            <p className="text-purple-100">إنفوجراف تفاعلي يوضح كيفية استخدام التطبيق خطوة بخطوة</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowModal(true);
                // Try to enable audio immediately
                playAudioFeedback('play');
              }}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-2"
            >
              <PlayCircleIcon className="h-5 w-5" />
              <span>شاهد الدليل</span>
            </button>
            
            <button
              onClick={() => {
                setIsMuted(false);
                // Simple visual feedback instead of annoying beeps
                showVisualAudioFeedback('play');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center space-x-2 shadow-lg"
            >
              <SpeakerWaveIcon className="h-6 w-6" />
              <span className="text-base">🔕➡️🔊 صوت بصري فقط</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tutorial Preview */}
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4">
          {infographicSteps.map((step, index) => (
            <div
              key={step.id}
              className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer text-center"
              onClick={() => {
                setCurrentStep(index);
                setShowModal(true);
              }}
            >
              <div className="text-4xl mb-3 animate-pulse">
                {step.icon}
              </div>
              <h3 className="font-bold text-gray-900 mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-gray-600">{step.simple}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl mb-6">
            <p className="text-gray-800 font-bold text-lg mb-3">📋 إنفوجراف بسيط للاستخدام</p>
            <div className="flex justify-center items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl mb-1">🎯</div>
                <span className="text-sm text-gray-600">واضح ومباشر</span>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">⚡</div>
                <span className="text-sm text-gray-600">سريع التعلم</span>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">📱</div>
                <span className="text-sm text-gray-600">بصري تفاعلي</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-gray-700 font-semibold mb-3">مسار التعلم البسيط:</p>
            <div className="flex justify-center items-center space-x-4 text-sm">
              <span className="bg-blue-100 text-blue-800 px-3 py-2 rounded-full">🔑 ادخل</span>
              <span className="text-gray-400">→</span>
              <span className="bg-green-100 text-green-800 px-3 py-2 rounded-full">📊 شاهد</span>
              <span className="text-gray-400">→</span>
              <span className="bg-purple-100 text-purple-800 px-3 py-2 rounded-full">🏠 أدر</span>
              <span className="text-gray-400">→</span>
              <span className="bg-orange-100 text-orange-800 px-3 py-2 rounded-full">💬 تواصل</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tutorial Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-98 flex items-center justify-center z-50 p-0">
          <div className={`bg-white w-full max-h-screen overflow-y-auto transition-all duration-300 video-tutorial-modal ${
            isFullscreen ? 'max-w-full h-full rounded-none' : 'max-w-full h-full'
          }`}>
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                  <span className="text-3xl">{currentInfo.icon}</span>
                  <span>{currentInfo.title}</span>
                </h3>
                <p className="text-gray-600 mt-1">{currentInfo.simple}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Enhanced Video Area */}
            <div className={`bg-gray-900 relative overflow-hidden ${
              isFullscreen ? 'h-[85vh]' : 'h-[70vh] min-h-[500px]'
            }`}>
              {isPlaying ? (
                // Simple Infographic Animation
                <div className="absolute inset-0 bg-gradient-to-br from-blue-800 to-purple-800 flex items-center justify-center">
                  <div className="text-center text-white max-w-4xl">
                    
                    {/* Big Visual Step */}
                    <div className="mb-8">
                      <div className="text-8xl mb-4 animate-bounce">
                        {currentInfo.icon}
                      </div>
                      <h2 className="text-4xl font-bold text-white mb-2">
                        {currentInfo.title}
                      </h2>
                      <p className="text-xl text-blue-200">
                        {currentInfo.simple}
                      </p>
                    </div>

                    {/* Visual Flow */}
                    <div className="flex items-center justify-center space-x-8 mb-8">
                      <div className="text-6xl animate-pulse">
                        {currentInfo.visual.main}
                      </div>
                      <div className="text-4xl text-yellow-300 animate-bounce">
                        {currentInfo.visual.arrow}
                      </div>
                      <div className="text-6xl animate-pulse delay-500">
                        {currentInfo.visual.action}
                      </div>
                    </div>

                    {/* Simple Progress */}
                    <div className="w-80 bg-white/20 rounded-full h-3 mx-auto">
                      <div 
                        className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all duration-500" 
                        style={{width: `${videoProgress}%`}}
                      ></div>
                    </div>
                    
                    <div className="mt-4 text-lg">
                      الخطوة {safeCurrentStep + 1} من {infographicSteps.length}
                    </div>
                  </div>
                </div>
              ) : (
                // Paused State
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
                  <div className="text-center text-white max-w-4xl px-8">
                    <div className="relative mb-8">
                      <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
                        <PlayCircleIcon className="h-20 w-20 text-white cursor-pointer hover:scale-110 transition-all duration-300" 
                                       onClick={togglePlay} />
                      </div>
                      <div className="absolute -inset-4 border-4 border-white/20 rounded-full animate-ping"></div>
                    </div>
                    
                    <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-300 to-orange-400 bg-clip-text text-transparent">
                      {currentTutorial.title}
                    </h2>
                    <p className="text-xl text-blue-200 mb-6 font-semibold">اضغط للبدء - تعلم بطريقة تفاعلية ممتعة</p>
                    <p className="text-lg text-purple-200 mb-8">{currentTutorial.description}</p>
                    
                    {/* Enhanced preview thumbnails */}
                    <div className="grid grid-cols-6 gap-3 max-w-3xl mx-auto">
                      {['📱', '💻', '🏠', '👥', '📊', '⚙️'].map((icon, i) => (
                        <div key={i} className="aspect-square bg-gradient-to-br from-white/20 to-white/10 rounded-xl flex items-center justify-center border border-white/20 hover:scale-105 transition-all duration-300">
                          <span className="text-3xl">{icon}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-8 flex justify-center space-x-4">
                      <div className="bg-white/10 px-4 py-2 rounded-full border border-white/20">
                        <span className="text-sm">⚡ سريع وسهل</span>
                      </div>
                      <div className="bg-white/10 px-4 py-2 rounded-full border border-white/20">
                        <span className="text-sm">🎯 خطوة بخطوة</span>
                      </div>
                      <div className="bg-white/10 px-4 py-2 rounded-full border border-white/20">
                        <span className="text-sm">🌟 تفاعلي</span>
                      </div>
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
                      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-colors shadow-lg"
                    >
                      {isPlaying ? (
                        <PauseCircleIcon className="h-6 w-6" />
                      ) : (
                        <PlayCircleIcon className="h-6 w-6" />
                      )}
                      <span className="text-sm font-bold">{isPlaying ? t('pause') : t('play')}</span>
                    </button>
                    
                    {/* Volume Control */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={toggleMute}
                        className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg"
                      >
                        {isMuted ? (
                          <SpeakerXMarkIcon className="h-5 w-5 text-red-400" />
                        ) : (
                          <SpeakerWaveIcon className="h-5 w-5 text-white" />
                        )}
                      </button>
                      
                      {!isMuted && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={volume}
                            onChange={(e) => setVolume(parseInt(e.target.value))}
                            className="w-16 h-1 bg-white bg-opacity-30 rounded-lg appearance-none slider"
                          />
                          <span className="text-xs w-8">{volume}%</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="bg-white bg-opacity-20 px-3 py-1 rounded-lg font-semibold">
                        {Math.round(videoProgress)}%
                      </span>
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${!isMuted ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                        <span className="text-xs">{!isMuted ? 'صوت' : 'صامت'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 text-sm">
                    <button
                      onClick={toggleFullscreen}
                      className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                      title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
                    >
                      {isFullscreen ? (
                        <ArrowsPointingInIcon className="h-5 w-5" />
                      ) : (
                        <ArrowsPointingOutIcon className="h-5 w-5" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setAutoPlay(!autoPlay);
                        playAudioFeedback('click');
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        autoPlay ? 'bg-green-600 text-white' : 'bg-white bg-opacity-20 text-white'
                      }`}
                      title={autoPlay ? 'إيقاف التشغيل التلقائي' : 'تفعيل التشغيل التلقائي'}
                    >
                      🔄 {autoPlay ? 'تلقائي مفعل' : 'يدوي'}
                    </button>
                    
                    <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-3 py-1 rounded-lg">
                      <span className="text-xs">⚡</span>
                      <span className="text-xs font-medium">سرعة طبيعية</span>
                    </div>
                    
                    <span className="text-blue-200 font-semibold">{currentTutorial.duration}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simple Infographic Content */}
            <div className="p-8">
              {/* Visual Steps Overview */}
              <div className="grid grid-cols-4 gap-6 max-w-4xl mx-auto">
                {infographicSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`text-center p-6 rounded-2xl cursor-pointer transition-all duration-300 ${
                      index === safeCurrentStep
                        ? 'bg-blue-100 border-2 border-blue-500 scale-110 shadow-lg'
                        : index < safeCurrentStep
                        ? 'bg-green-100 border-2 border-green-500'
                        : 'bg-gray-100 border-2 border-gray-300'
                    }`}
                    onClick={() => setCurrentStep(index)}
                  >
                    <div className={`text-4xl mb-3 ${index === safeCurrentStep ? 'animate-bounce' : ''}`}>
                      {step.icon}
                    </div>
                    <h4 className={`font-bold text-sm mb-2 ${
                      index === safeCurrentStep ? 'text-blue-800' : 'text-gray-700'
                    }`}>
                      {step.title}
                    </h4>
                    <p className="text-xs text-gray-600">
                      {step.simple}
                    </p>
                    <div className={`w-8 h-8 rounded-full mx-auto mt-3 flex items-center justify-center text-xs font-bold ${
                      index === safeCurrentStep
                        ? 'bg-blue-600 text-white'
                        : index < safeCurrentStep
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-400 text-white'
                    }`}>
                      {index < safeCurrentStep ? '✓' : index + 1}
                    </div>
                  </div>
                ))}
              </div>

              {/* Simple Usage Flow */}
              <div className="mt-8 bg-gray-50 rounded-2xl p-6">
                <h4 className="text-xl font-bold text-center mb-6 text-gray-800">كيفية الاستخدام</h4>
                <div className="flex items-center justify-center space-x-4">
                  <div className="text-center">
                    <div className="text-3xl mb-2">🔑</div>
                    <p className="text-sm font-semibold">ادخل</p>
                  </div>
                  <div className="text-2xl text-gray-400">→</div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">📊</div>
                    <p className="text-sm font-semibold">شاهد</p>
                  </div>
                  <div className="text-2xl text-gray-400">→</div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">🏠</div>
                    <p className="text-sm font-semibold">أدر</p>
                  </div>
                  <div className="text-2xl text-gray-400">→</div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">💬</div>
                    <p className="text-sm font-semibold">تواصل</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Simple Navigation */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center space-x-2 px-6 py-3 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <ChevronLeftIcon className="h-5 w-5" />
                <span>السابق</span>
              </button>

              <div className="text-center">
                <div className="flex justify-center space-x-2 mb-2">
                  {infographicSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full ${
                        index === safeCurrentStep ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-600">
                  {safeCurrentStep + 1} من {infographicSteps.length}
                </p>
              </div>

              <button
                onClick={nextStep}
                disabled={safeCurrentStep === infographicSteps.length - 1}
                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <span>{safeCurrentStep === infographicSteps.length - 1 ? 'انتهاء' : 'التالي'}</span>
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default VideoTutorial;