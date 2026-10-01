import React from 'react';
import type { CognitiveCategory } from '../../types';
import { CATEGORY_COLORS } from '../../types';

interface GameHUDProps {
  round: number;
  totalRounds: number;
  score: number;
  streak: number;
  category: CognitiveCategory;
  onPause: () => void;
  timeRemaining?: number; // In ms, optional
  maxTime?: number; // In ms, optional
}

export function GameHUD({
  round,
  totalRounds,
  score,
  streak,
  category,
  onPause,
  timeRemaining,
  maxTime
}: GameHUDProps) {
  const color = CATEGORY_COLORS[category];

  return (
    <div className="flex flex-col w-full px-6 py-4 bg-white/80 backdrop-blur-md border-b border-[var(--color-surface-200)] shadow-sm sticky top-0 z-10">
      <div className="flex justify-between items-center w-full max-w-5xl mx-auto">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[var(--color-surface-500)] uppercase tracking-wider">Round</span>
            <span className="text-xl font-bold text-[var(--color-surface-900)]">{round} <span className="text-[var(--color-surface-400)]">/ {totalRounds}</span></span>
          </div>
          
          <div className="w-px h-10 bg-[var(--color-surface-200)]"></div>
          
          <div className="flex flex-col">
            <span className="text-xs font-bold text-[var(--color-surface-500)] uppercase tracking-wider">Score</span>
            <span className="text-xl font-bold text-[var(--color-surface-900)]">{score.toLocaleString()}</span>
          </div>
        </div>

        {streak >= 3 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-orange-400 to-red-500 rounded-full animate-pulse-soft">
            <span className="text-white text-sm font-bold">🔥 {streak} Streak!</span>
          </div>
        )}

        <div className="flex flex-col items-end gap-2">
          <button 
            onClick={onPause}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-surface-100)] hover:bg-[var(--color-surface-200)] text-[var(--color-surface-600)] transition cursor-pointer"
            aria-label="Pause"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16" rx="1"></rect>
              <rect x="14" y="4" width="4" height="16" rx="1"></rect>
            </svg>
          </button>
        </div>
      </div>
      
      {timeRemaining !== undefined && maxTime !== undefined && (
        <div className="w-full h-1.5 bg-[var(--color-surface-200)] mt-4 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-100 linear"
            style={{ 
              width: `${Math.max(0, Math.min(100, (timeRemaining / maxTime) * 100))}%`,
              backgroundColor: timeRemaining < maxTime * 0.25 ? 'var(--color-error-500)' : color 
            }}
          ></div>
        </div>
      )}
    </div>
  );
}
