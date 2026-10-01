import React, { useEffect, useState } from 'react';
import type { Achievement } from '../types';

interface AchievementToastProps {
  achievement: Achievement | null;
  onClose: () => void;
}

export function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // wait for animation
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement && !isVisible) return null;

  return (
    <div className={`fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'}`}>
      <div className="bg-white rounded-xl shadow-[var(--shadow-lg)] border border-[var(--color-warning-400)] p-4 flex items-start gap-4 max-w-sm">
        <div className="w-12 h-12 flex-shrink-0 bg-[var(--color-warning-400)]/20 rounded-full flex items-center justify-center text-2xl">
          {achievement?.icon || '🏆'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[var(--color-warning-600)] uppercase tracking-wider mb-0.5">Achievement Unlocked!</p>
          <h4 className="text-sm font-semibold text-[var(--color-surface-900)] truncate">{achievement?.name}</h4>
          <p className="text-xs text-[var(--color-surface-500)] mt-1">{achievement?.description}</p>
        </div>
        <button 
          onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }}
          className="text-[var(--color-surface-400)] hover:text-[var(--color-surface-700)] transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
