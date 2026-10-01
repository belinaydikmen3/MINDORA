import React from 'react';

interface GamePauseProps {
  onResume: () => void;
  onQuit: () => void;
}

export function GamePause({ onResume, onQuit }: GamePauseProps) {
  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in">
      <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center w-full max-w-sm">
        <h2 className="text-3xl font-bold font-serif italic text-[var(--color-mindora-ink)] mb-1">Session Paused</h2>
        <p className="text-sm text-[var(--color-mindora-slate)] mb-7">Take a measured breath to recalibrate.</p>
        
        <button 
          onClick={onResume}
          className="w-full py-3.5 bg-[var(--color-mindora-ink)] hover:bg-[var(--color-surface-800)] text-white font-semibold rounded-xl mb-3 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
        >
          Resume Challenge
        </button>
        
        <button 
          onClick={onQuit}
          className="w-full py-3.5 bg-white border border-[var(--color-surface-300)] hover:bg-[var(--color-surface-100)] text-[var(--color-mindora-ink)] font-semibold rounded-xl transition cursor-pointer active:scale-[0.98]"
        >
          Return to Studio
        </button>
      </div>
    </div>
  );
}
