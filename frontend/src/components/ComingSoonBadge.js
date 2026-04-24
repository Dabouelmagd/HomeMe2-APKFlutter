import React from 'react';
import { RocketLaunchIcon, SparklesIcon, BellAlertIcon } from '@heroicons/react/24/outline';

/**
 * ComingSoonBadge
 *   A modern, attention-grabbing badge that marks features/payment methods
 *   not yet available. Uses an animated gradient border and a live pulse so
 *   it draws the eye without feeling like an error.
 *
 * Variants:
 *   - "ribbon"  : small inline pill — default, fits next to any label
 *   - "corner"  : absolute-positioned corner tag for cards
 *   - "overlay" : full-card glass overlay for disabled tiles
 *
 * Props:
 *   variant?: 'ribbon' | 'corner' | 'overlay'
 *   label?: string                (default 'قريباً')
 *   eta?: string                  (optional e.g. 'يوليو 2026')
 *   onNotifyMe?: () => void       (optional — shows the bell button)
 *   className?: string
 */
export const ComingSoonBadge = ({
  variant = 'ribbon',
  label = 'قريباً',
  eta,
  onNotifyMe,
  className = '',
}) => {
  if (variant === 'corner') {
    return (
      <div
        className={`absolute -top-2 -start-2 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-lg ${className}`}
        style={{
          background: 'linear-gradient(135deg, #f43f5e 0%, #a855f7 50%, #6366f1 100%)',
          backgroundSize: '200% 200%',
          animation: 'cs-gradient-shift 3s ease infinite',
        }}
        data-testid="coming-soon-badge"
      >
        <SparklesIcon className="w-3 h-3 animate-pulse" />
        <span>{label}</span>
      </div>
    );
  }

  if (variant === 'overlay') {
    return (
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/60 dark:bg-gray-900/70 backdrop-blur-[2px] ${className}`}
        data-testid="coming-soon-overlay"
      >
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #f43f5e 0%, #a855f7 50%, #6366f1 100%)',
            backgroundSize: '200% 200%',
            animation: 'cs-gradient-shift 3s ease infinite',
          }}
        >
          <RocketLaunchIcon className="w-3.5 h-3.5 animate-bounce" />
          <span>{label}</span>
          {eta && <span className="opacity-80 text-[10px] font-normal">· {eta}</span>}
        </div>
        {onNotifyMe && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNotifyMe(); }}
            className="text-[10px] font-semibold px-2 py-1 rounded-md bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 text-rose-600 dark:text-rose-400 shadow flex items-center gap-1"
            data-testid="cs-notify-btn"
          >
            <BellAlertIcon className="w-3 h-3" />
            أخبريني عند التفعيل
          </button>
        )}
      </div>
    );
  }

  // Default 'ribbon'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm ${className}`}
      style={{
        background: 'linear-gradient(135deg, #f43f5e 0%, #a855f7 50%, #6366f1 100%)',
        backgroundSize: '200% 200%',
        animation: 'cs-gradient-shift 3s ease infinite',
      }}
      data-testid="coming-soon-ribbon"
    >
      <SparklesIcon className="w-2.5 h-2.5 animate-pulse" />
      <span>{label}</span>
      {eta && <span className="opacity-80 font-normal">· {eta}</span>}
    </span>
  );
};

export default ComingSoonBadge;
