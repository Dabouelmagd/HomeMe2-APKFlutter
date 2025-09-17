import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';

const VoiceMessagePlayer = ({ 
  audioUrl, 
  duration = 0, 
  waveformData = [], 
  isOwnMessage = false,
  className = "" 
}) => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      const handleLoadStart = () => setIsLoading(true);
      const handleCanPlay = () => setIsLoading(false);
      const handleError = () => {
        setIsLoading(false);
        setIsPlaying(false);
      };

      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('error', handleError);

      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
      };
    }
  }, [audioUrl]);

  const togglePlayback = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderWaveform = () => {
    if (!waveformData || waveformData.length === 0) {
      // Generate a simple placeholder waveform
      const placeholder = Array.from({ length: 30 }, (_, i) => 
        0.2 + Math.sin(i * 0.5) * 0.3 + Math.random() * 0.2
      );
      return renderWaveformBars(placeholder);
    }
    return renderWaveformBars(waveformData);
  };

  const renderWaveformBars = (data) => {
    const progress = duration > 0 ? currentTime / duration : 0;
    const progressIndex = Math.floor(progress * data.length);

    return (
      <div className="flex items-center space-x-1 h-8 px-2">
        {data.map((value, index) => {
          const isPlayed = index <= progressIndex && isPlaying;
          const height = Math.max(2, value * 24);
          
          return (
            <div
              key={index}
              className={`rounded-full transition-all duration-100 ${
                isOwnMessage
                  ? isPlayed 
                    ? 'bg-blue-200' 
                    : 'bg-blue-100'
                  : isPlayed 
                    ? 'bg-blue-500' 
                    : 'bg-gray-300'
              }`}
              style={{
                width: '2px',
                height: `${height}px`,
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className={`flex items-center space-x-3 max-w-xs ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Play/Pause Button */}
      <button
        onClick={togglePlayback}
        disabled={isLoading}
        className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
          isOwnMessage
            ? 'bg-blue-200 text-blue-800 hover:bg-blue-300'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        } disabled:opacity-50`}
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
        ) : isPlaying ? (
          <PauseIcon className="h-4 w-4" />
        ) : (
          <PlayIcon className="h-4 w-4 ml-0.5" />
        )}
      </button>

      {/* Waveform and Info */}
      <div className="flex-1 min-w-0">
        {/* Waveform */}
        <div className={`rounded-lg ${isOwnMessage ? 'bg-blue-50' : 'bg-gray-100'} mb-1`}>
          {renderWaveform()}
        </div>
        
        {/* Time Info */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1">
            <SpeakerWaveIcon className="h-3 w-3 text-gray-500" />
            <span className={isOwnMessage ? 'text-blue-200' : 'text-gray-500'}>
              {t('voice.voiceMessage')}
            </span>
          </div>
          <span className={`font-mono ${isOwnMessage ? 'text-blue-200' : 'text-gray-500'}`}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VoiceMessagePlayer;