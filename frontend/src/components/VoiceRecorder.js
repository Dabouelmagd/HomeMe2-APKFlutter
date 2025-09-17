import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MicrophoneIcon,
  StopIcon,
  PlayIcon,
  PauseIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const VoiceRecorder = ({ onSend, onCancel, disabled = false }) => {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [waveformData, setWaveformData] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [canRecord, setCanRecord] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    checkMicrophonePermission();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setCanRecord(true);
      // Stop the stream immediately since we just wanted to check permission
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setCanRecord(false);
    }
  };

  const startRecording = async () => {
    if (!canRecord) {
      alert(t('voice.microphonePermissionDenied'));
      return;
    }

    try {
      // Clear previous recording
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setAudioBlob(null);
      setWaveformData([]);
      setDuration(0);
      setCurrentTime(0);
      chunksRef.current = [];

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          volume: 1.0
        } 
      });

      // Set up audio context for waveform visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      // Set up MediaRecorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording
      mediaRecorderRef.current.start(100); // Collect data every 100ms
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 0.1);
      }, 100);

      // Start waveform visualization
      visualizeWaveform();

    } catch (error) {
      console.error('Error starting recording:', error);
      alert(t('voice.recordingError'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  const visualizeWaveform = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    
    // Calculate average amplitude
    const average = dataArrayRef.current.reduce((sum, value) => sum + value, 0) / dataArrayRef.current.length;
    const normalizedValue = average / 255;
    
    setWaveformData(prev => {
      const newData = [...prev, normalizedValue];
      // Keep only last 50 data points for performance
      return newData.slice(-50);
    });

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(visualizeWaveform);
    }
  };

  const playRecording = () => {
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setWaveformData([]);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const sendVoiceMessage = () => {
    if (audioBlob && onSend) {
      onSend(audioBlob, duration);
      deleteRecording();
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 10);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
  };

  const renderWaveform = () => {
    if (!waveformData.length && !isRecording) return null;

    const displayData = waveformData.length > 0 ? waveformData : [0];
    const maxHeight = 40;

    return (
      <div className="flex items-center justify-center space-x-1 h-10 px-4">
        {displayData.map((value, index) => (
          <div
            key={index}
            className={`bg-blue-500 rounded-full transition-all duration-100 ${
              isRecording ? 'animate-pulse' : ''
            }`}
            style={{
              width: '3px',
              height: `${Math.max(2, value * maxHeight)}px`,
              opacity: isRecording ? 0.7 + value * 0.3 : 0.6
            }}
          />
        ))}
      </div>
    );
  };

  if (!canRecord) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 text-sm">
          {t('voice.microphoneNotAvailable')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Recording Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isRecording && (
            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
          )}
          <span className="text-sm font-medium text-gray-700">
            {isRecording ? t('voice.recording') : audioBlob ? t('voice.recorded') : t('voice.readyToRecord')}
          </span>
        </div>
        <span className="text-sm text-gray-500 font-mono">
          {formatTime(duration)}
        </span>
      </div>

      {/* Waveform Visualization */}
      <div className="bg-gray-50 rounded-lg min-h-[60px] flex items-center justify-center">
        {renderWaveform()}
        {!waveformData.length && !isRecording && (
          <div className="text-gray-400 text-sm">{t('voice.waveformPlaceholder')}</div>
        )}
      </div>

      {/* Audio Playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      )}

      {/* Controls */}
      <div className="flex items-center justify-center space-x-3">
        {!isRecording && !audioBlob && (
          <button
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center justify-center w-12 h-12 bg-red-500 text-white rounded-full hover:bg-red-600 focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <MicrophoneIcon className="h-6 w-6" />
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="flex items-center justify-center w-12 h-12 bg-red-600 text-white rounded-full hover:bg-red-700 focus:ring-2 focus:ring-red-500 transition-colors"
          >
            <StopIcon className="h-6 w-6" />
          </button>
        )}

        {audioBlob && !isRecording && (
          <>
            <button
              onClick={playRecording}
              className="flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
            </button>

            <button
              onClick={deleteRecording}
              className="flex items-center justify-center w-10 h-10 bg-gray-500 text-white rounded-full hover:bg-gray-600 focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              <TrashIcon className="h-5 w-5" />
            </button>

            <button
              onClick={sendVoiceMessage}
              disabled={disabled}
              className="flex items-center justify-center w-10 h-10 bg-green-500 text-white rounded-full hover:bg-green-600 focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </>
        )}

        {onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center justify-center w-10 h-10 bg-gray-300 text-gray-700 rounded-full hover:bg-gray-400 focus:ring-2 focus:ring-gray-300 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          {isRecording
            ? t('voice.recordingInstructions')
            : audioBlob
            ? t('voice.playbackInstructions')
            : t('voice.startInstructions')
          }
        </p>
      </div>
    </div>
  );
};

export default VoiceRecorder;