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
    if (currentStep < infographicSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Real audio system with clear notification sounds
  const playAudioFeedback = (type = 'play') => {
    if (isMuted) return;
    
    try {
      // Create clear notification sounds using Web Audio API
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume audio context if needed
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
          createNotificationSound(audioCtx, type);
        });
      } else {
        createNotificationSound(audioCtx, type);
      }
    } catch (error) {
      console.log('Audio context failed, trying alternative method');
      // Fallback to simple HTML5 audio
      playSimpleNotification(type);
    }
    
    // Also show visual feedback
    showVisualAudioFeedback(type);
  };

  const createNotificationSound = (ctx, type) => {
    // Create pleasant notification tones (like phone notifications)
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Clear notification frequencies (pleasant and audible)
    const soundConfig = {
      play: { freq: 800, duration: 0.15 },      // High pleasant beep
      pause: { freq: 600, duration: 0.1 },     // Lower pause tone
      complete: { freq: 1000, duration: 0.2 }, // Success tone
      next: { freq: 750, duration: 0.1 },      // Forward navigation
      prev: { freq: 650, duration: 0.1 },      // Backward navigation
      skip: { freq: 900, duration: 0.12 },     // Skip tone
      click: { freq: 700, duration: 0.08 }     // Click sound
    };
    
    const config = soundConfig[type] || soundConfig.play;
    const currentVolume = Math.min(volume / 100, 0.3); // Audible but not too loud
    
    // Set frequency
    oscillator.frequency.setValueAtTime(config.freq, ctx.currentTime);
    
    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(currentVolume, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + config.duration);
    
    // Play the sound
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + config.duration + 0.01);
  };

  const playSimpleNotification = (type) => {
    // Fallback method using frequency generator
    try {
      const duration = type === 'complete' ? 200 : 100;
      const frequency = {
        play: 800, pause: 600, complete: 1000, 
        next: 750, prev: 650, skip: 900, click: 700
      }[type] || 800;
      
      // Create a simple sine wave
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.frequency.value = frequency;
      gain.gain.value = Math.min(volume / 100, 0.2);
      
      osc.start();
      setTimeout(() => osc.stop(), duration);
    } catch (error) {
      console.log('All audio methods failed, showing visual feedback only');
    }
  };

  // Removed annoying beep sounds - using simple visual feedback instead

  // Removed complex beep generation - using simple feedback instead

  const showVisualAudioFeedback = (type) => {
    // Enhanced visual feedback system with clear icons and animations
    const feedbackData = {
      play: { color: 'bg-green-500', icon: '▶️', text: 'تشغيل' },
      pause: { color: 'bg-orange-500', icon: '⏸️', text: 'إيقاف' },
      complete: { color: 'bg-blue-500', icon: '✅', text: 'مكتمل' },
      next: { color: 'bg-purple-500', icon: '➡️', text: 'التالي' },
      prev: { color: 'bg-indigo-500', icon: '⬅️', text: 'السابق' },
      skip: { color: 'bg-yellow-500', icon: '⏭️', text: 'تخطي' },
      click: { color: 'bg-gray-500', icon: '👆', text: 'نقر' }
    };
    
    const data = feedbackData[type] || feedbackData.play;
    
    // Create enhanced visual indicator
    const indicator = document.createElement('div');
    indicator.className = `fixed top-6 left-6 ${data.color} text-white px-4 py-3 rounded-xl z-50 shadow-2xl border-2 border-white/50 transform transition-all duration-300`;
    indicator.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="text-xl animate-pulse">${data.icon}</span>
        <span class="font-bold">${data.text}</span>
      </div>
    `;
    
    // Add entrance animation
    indicator.style.transform = 'translateY(-20px) scale(0.8)';
    indicator.style.opacity = '0';
    
    document.body.appendChild(indicator);
    
    // Animate in
    setTimeout(() => {
      indicator.style.transform = 'translateY(0) scale(1)';
      indicator.style.opacity = '1';
    }, 10);
    
    // Animate out and remove
    setTimeout(() => {
      indicator.style.transform = 'translateY(-20px) scale(0.8)';
      indicator.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(indicator)) {
          document.body.removeChild(indicator);
        }
      }, 300);
    }, 1200);
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
          
          // Auto advance to next step when infographic completes - faster
          if (autoPlay && currentStep < infographicSteps.length - 1) {
            setTimeout(() => {
              setCurrentStep(prev => prev + 1);
              // Automatically start next infographic quickly
              setTimeout(() => {
                startVideoPlayback(true);
              }, 500);
            }, 1000);
          }
          return 100;
        }
        return prev + 2; // Fast progress for quick infographic viewing
      });
    }, 80); // Fast updates for snappy infographic experience
    
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

  // Keyboard shortcuts for navigation
  const handleKeyPress = React.useCallback((e) => {
    if (!showModal) return;
    
    switch(e.key) {
      case 'ArrowRight':
      case ' ': // Spacebar
        e.preventDefault();
        if (isPlaying) {
          setIsPlaying(false);
          playAudioFeedback('pause');
        } else {
          startVideoPlayback(false);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        prevStep();
        playAudioFeedback('prev');
        break;
      case 'ArrowUp':
        e.preventDefault();
        nextStep();
        playAudioFeedback('next');
        break;
      case 'ArrowDown':
        e.preventDefault();
        prevStep();
        playAudioFeedback('prev');
        break;
      case 'Escape':
        e.preventDefault();
        setShowModal(false);
        break;
      case 's':
      case 'S':
        e.preventDefault();
        skipToNext();
        break;
      case 'r':
      case 'R':
        e.preventDefault();
        restartCurrent();
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        toggleMute();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        toggleFullscreen();
        break;
    }
  }, [showModal, isPlaying, currentStep]);

  // Skip to next step immediately  
  const skipToNext = () => {
    if (currentStep < infographicSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setVideoProgress(0);
      setIsPlaying(false);
      playAudioFeedback('skip');
    }
  };

  // Restart current step
  const restartCurrent = () => {
    setVideoProgress(0);
    setIsPlaying(false);
    playAudioFeedback('play');
  };

  // Add keyboard event listeners
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

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
              onClick={async () => {
                setIsMuted(false);
                // Initialize audio context with user gesture
                try {
                  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                  await audioCtx.resume();
                  
                  // Play test sound to confirm audio is working
                  const testOsc = audioCtx.createOscillator();
                  const testGain = audioCtx.createGain();
                  testOsc.connect(testGain);
                  testGain.connect(audioCtx.destination);
                  
                  testOsc.frequency.setValueAtTime(800, audioCtx.currentTime);
                  testGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                  testGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                  
                  testOsc.start(audioCtx.currentTime);
                  testOsc.stop(audioCtx.currentTime + 0.3);
                  
                  console.log('Audio test successful');
                } catch (error) {
                  console.log('Audio initialization failed:', error);
                }
                
                playAudioFeedback('play'); // Test the audio system
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center space-x-2 shadow-lg animate-pulse"
            >
              <SpeakerWaveIcon className="h-6 w-6" />
              <span className="text-base">🔊 تفعيل الصوت الواضح</span>
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

                    {/* Enhanced Progress with Visual Feedback */}
                    <div className="w-80 bg-white/20 rounded-full h-4 mx-auto mb-4 shadow-lg">
                      <div 
                        className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 h-4 rounded-full transition-all duration-500 relative overflow-hidden" 
                        style={{width: `${videoProgress}%`}}
                      >
                        {/* Animated shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center space-x-4 mb-4">
                      <div className="bg-white/20 px-4 py-2 rounded-xl">
                        <span className="text-lg font-bold">الخطوة {safeCurrentStep + 1} من {infographicSteps.length}</span>
                      </div>
                      <div className="bg-white/20 px-4 py-2 rounded-xl animate-pulse">
                        <span className="text-sm">{Math.round(videoProgress)}% مكتمل</span>
                      </div>
                    </div>
                    
                    {/* Visual indicators for current action */}
                    <div className="flex justify-center space-x-2">
                      {[1,2,3,4,5].map((i) => (
                        <div 
                          key={i}
                          className={`w-2 h-8 rounded-full transition-all duration-300 ${
                            videoProgress > (i * 20) ? 'bg-green-400 animate-bounce' : 'bg-white/30'
                          }`}
                          style={{animationDelay: `${i * 100}ms`}}
                        ></div>
                      ))}
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
                      {currentInfo.title}
                    </h2>
                    <p className="text-xl text-blue-200 mb-6 font-semibold">اضغط للبدء - تعلم بطريقة تفاعلية ممتعة</p>
                    <p className="text-lg text-purple-200 mb-8">{currentInfo.simple}</p>
                    
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
                      {/* Enhanced mute button with volume indicator */}
                      <button
                        onClick={() => {
                          toggleMute();
                          playAudioFeedback('click'); // Test audio when toggling
                        }}
                        className={`p-2 rounded-lg transition-colors flex items-center space-x-1 ${
                          isMuted 
                            ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                        title={isMuted ? 'إلغاء الكتم (M)' : 'كتم الصوت (M)'}
                      >
                        {isMuted ? (
                          <>
                            <SpeakerXMarkIcon className="h-4 w-4" />
                            <span className="text-xs">🔇</span>
                          </>
                        ) : (
                          <>
                            <SpeakerWaveIcon className="h-4 w-4" />
                            <span className="text-xs">🔊</span>
                          </>
                        )}
                      </button>
                      
                      {!isMuted && (
                        <div className="flex items-center space-x-2">
                          {/* Enhanced volume slider with audio test */}
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={volume}
                            onChange={(e) => {
                              const newVolume = parseInt(e.target.value);
                              setVolume(newVolume);
                              // Test audio at new volume level
                              setTimeout(() => playAudioFeedback('click'), 100);
                            }}
                            className="w-20 h-2 bg-white bg-opacity-30 rounded-lg appearance-none slider"
                            title={`مستوى الصوت: ${volume}%`}
                          />
                          <span className="text-xs font-bold text-white bg-white/20 px-2 py-1 rounded">
                            {volume}%
                          </span>
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
                  
                  <div className="flex items-center space-x-2 text-sm">
                    {/* Skip Controls */}
                    <button
                      onClick={restartCurrent}
                      className="px-2 py-1 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                      title="إعادة تشغيل (R)"
                    >
                      <span className="text-xs">🔄</span>
                    </button>
                    
                    <button
                      onClick={skipToNext}
                      disabled={currentStep === infographicSteps.length - 1}
                      className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors disabled:opacity-50"
                      title="تخطي (S)"
                    >
                      <span className="text-xs">⏭️</span>
                    </button>
                    
                    {/* Fullscreen */}
                    <button
                      onClick={toggleFullscreen}
                      className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                      title={isFullscreen ? 'تصغير الشاشة (F)' : 'ملء الشاشة (F)'}
                    >
                      {isFullscreen ? (
                        <ArrowsPointingInIcon className="h-4 w-4" />
                      ) : (
                        <ArrowsPointingOutIcon className="h-4 w-4" />
                      )}
                    </button>
                    
                    {/* Auto Play Toggle */}
                    <button
                      onClick={() => {
                        setAutoPlay(!autoPlay);
                        playAudioFeedback('click');
                      }}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                        autoPlay ? 'bg-green-600 text-white' : 'bg-white bg-opacity-20 text-white'
                      }`}
                      title={autoPlay ? 'إيقاف التشغيل التلقائي' : 'تفعيل التشغيل التلقائي'}
                    >
                      {autoPlay ? '🟢' : '🔴'}
                    </button>
                    
                    {/* Speed Indicator */}
                    <div className="bg-white bg-opacity-20 px-2 py-1 rounded-lg">
                      <span className="text-xs font-medium">⚡ سريع</span>
                    </div>
                    
                    <span className="text-blue-200 font-semibold text-xs">30 ثانية</span>
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
                <div className="flex items-center justify-center space-x-4 mb-6">
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

                {/* Keyboard Controls Guide */}
                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                  <h5 className="font-bold text-sm mb-3 text-blue-800">⌨️ مفاتيح التحكم السريع:</h5>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center space-x-2">
                      <kbd className="bg-white px-2 py-1 rounded border">مسافة</kbd>
                      <span>تشغيل/إيقاف</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <kbd className="bg-white px-2 py-1 rounded border">S</kbd>
                      <span>تخطي الخطوة</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <kbd className="bg-white px-2 py-1 rounded border">↑↓</kbd>
                      <span>الخطوة السابقة/التالية</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <kbd className="bg-white px-2 py-1 rounded border">R</kbd>
                      <span>إعادة تشغيل</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <kbd className="bg-white px-2 py-1 rounded border">M</kbd>
                      <span>كتم الصوت</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <kbd className="bg-white px-2 py-1 rounded border">F</kbd>
                      <span>ملء الشاشة</span>
                    </div>
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