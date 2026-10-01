import React, { useState } from 'react';
import type { CognitiveCategory, DifficultyLevel } from '../../types';
import { DIFFICULTY_LABELS, CATEGORY_COLORS, CATEGORY_LABELS } from '../../types';

interface GameIntroProps {
  name: string;
  description: string;
  instructions: string[];
  category: CognitiveCategory;
  difficulty: DifficultyLevel;
  onStart: () => void;
}

export function GameIntro({
  name,
  description,
  instructions,
  category,
  difficulty,
  onStart,
}: GameIntroProps) {
  const color = CATEGORY_COLORS[category];
  const [showProTip, setShowProTip] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] w-full max-w-2xl mx-auto p-6 sm:p-9 bg-white rounded-2xl shadow-sm border border-[var(--color-surface-200)] animate-fade-in-up">
      {/* Category Pill & Game Header */}
      <div className="flex items-center gap-2 mb-4">
        <span 
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
          style={{ backgroundColor: `${color}18`, color }}
        >
          {CATEGORY_LABELS[category]} Challenge
        </span>
        <span className="text-xs text-[var(--color-mindora-slate)] font-medium">
          Level {difficulty}: {DIFFICULTY_LABELS[difficulty]}
        </span>
      </div>
      
      <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-mindora-ink)] mb-2 tracking-tight text-center">
        {name}
      </h1>
      <p className="text-base text-[var(--color-surface-600)] text-center max-w-lg mb-7 leading-relaxed">
        {description}
      </p>
      
      {/* Step-by-Step Progressive Instructions */}
      <div className="w-full bg-[var(--color-surface-50)] p-5 sm:p-6 rounded-xl mb-6 border border-[var(--color-surface-200)]">
        <h3 className="text-xs font-bold text-[var(--color-mindora-slate)] uppercase tracking-wider mb-4 flex items-center justify-between">
          <span>Objective & Rules</span>
          <span className="text-[11px] font-normal lowercase text-[var(--color-mindora-slate)]">unlimited practice</span>
        </h3>
        <ul className="space-y-3">
          {instructions.map((inst, i) => (
            <li key={i} className="flex items-start text-sm text-[var(--color-surface-800)]">
              <span className="w-5 h-5 rounded-md bg-[var(--color-mindora-cream)] border border-[var(--color-surface-300)] flex items-center justify-center text-xs font-bold mr-3 shrink-0 text-[var(--color-mindora-ink)] mt-0.5">
                {i + 1}
              </span>
              <span className="leading-snug">{inst}</span>
            </li>
          ))}
        </ul>

        {/* Collapsible Strategy / Pro Tip */}
        <div className="mt-4 pt-3 border-t border-[var(--color-surface-200)]">
          <button
            onClick={() => setShowProTip(!showProTip)}
            className="text-xs font-medium text-[var(--color-brand-600)] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{showProTip ? '▲ Hide Strategy Tip' : '▼ View Cognitive Strategy Tip'}</span>
          </button>
          {showProTip && (
            <p className="mt-2 text-xs text-[var(--color-surface-600)] bg-white p-3 rounded-lg border border-[var(--color-surface-200)] leading-relaxed animate-fade-in">
              💡 <strong>Strategy:</strong> Prioritize establishing accuracy before pushing maximum speed. Your score scales heavily with unbroken streaks.
            </p>
          )}
        </div>
      </div>

      {/* Start Button */}
      <button
        onClick={onStart}
        className="w-full sm:w-auto px-10 py-3.5 rounded-xl text-white font-semibold text-base shadow-xs transition-all hover:bg-[var(--color-surface-800)] active:scale-[0.98] cursor-pointer bg-[var(--color-mindora-ink)]"
      >
        Begin Practice Session →
      </button>
    </div>
  );
}
