import React, { useMemo } from 'react';
import type { GameSession } from '../../types';
import { CATEGORY_LABELS, DIFFICULTY_LABELS } from '../../types';
import { getStats } from '../../services/storage';

interface GameResultsProps {
  session: GameSession;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export function GameResults({ session, onPlayAgain, onBackToMenu }: GameResultsProps) {
  const stats = getStats();

  const previousBest = stats.personalBests[session.gameId] ?? 0;
  const isPersonalBest = session.score >= previousBest && session.score > 0;
  const scoreDelta = isPersonalBest ? session.score - (previousBest === session.score ? 0 : previousBest) : 0;

  const correctAnswers = session.roundsCorrect;
  const incorrectAnswers = Math.max(0, session.roundsPlayed - session.roundsCorrect);

  // Generate real, evidence-grounded performance observation & strategy
  const { observation, strategy } = useMemo(() => {
    const accuracyPct = Math.round(session.accuracy * 100);
    const speed = session.avgReactionTime;

    let obs = '';
    let strat = '';

    if (accuracyPct >= 90 && speed < 1200) {
      obs = `Exceptional calibration: you achieved ${accuracyPct}% precision with quick, fluid decision-making (${speed}ms average).`;
      strat = 'To continue building cognitive reserve, try challenging yourself on higher difficulty levels without pausing.';
    } else if (accuracyPct >= 85) {
      obs = `Strong pattern consistency: you resolved ${correctAnswers} out of ${session.roundsPlayed} rounds accurately.`;
      strat = 'Focus on relaxing your visual scanning during early rounds so mental fatigue doesn’t slow your late-game responses.';
    } else if (speed < 900) {
      obs = `Rapid impulse response (${speed}ms), but error rate rose slightly with ${incorrectAnswers} misses.`;
      strat = 'Spend a deliberate extra 200–300 milliseconds verifying your choice before committing to tap.';
    } else if (session.bestStreak >= 6) {
      obs = `Great momentum control: you locked in an uninterrupted streak of ${session.bestStreak} correct rounds.`;
      strat = 'Notice what triggered the break in your streak and reset your breathing posture at the midpoint.';
    } else {
      obs = `Solid effort across ${session.roundsPlayed} active rounds at ${DIFFICULTY_LABELS[session.difficulty]} difficulty.`;
      strat = 'Take a short 10-second break between attempts to reset working memory cache and visual attention.';
    }

    return { observation: obs, strategy: strat };
  }, [session, correctAnswers, incorrectAnswers]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[560px] w-full max-w-2xl mx-auto p-6 sm:p-9 bg-white rounded-2xl shadow-sm border border-[var(--color-surface-200)] animate-fade-in-up">
      {/* Session Header */}
      <div className="text-center mb-7">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3 bg-[var(--color-surface-100)] text-[var(--color-mindora-slate)]">
          <span>{CATEGORY_LABELS[session.category]} Session Complete</span>
        </div>

        <div className="flex items-baseline justify-center gap-3">
          <h1 className="text-5xl font-bold tracking-tight text-[var(--color-mindora-ink)]">
            {session.score.toLocaleString()}
          </h1>
          {isPersonalBest && previousBest > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[var(--color-mindora-mint)] text-[var(--color-mindora-ink)] animate-pulse-soft">
              New Best! {scoreDelta > 0 ? `(+${scoreDelta.toLocaleString()})` : ''}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-mindora-slate)] mt-1">Session Performance Score</p>
      </div>
      
      {/* 4-Stat Grid: Accuracy, Speed, Correct/Errors, Streak */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mb-7">
        <div className="bg-[var(--color-surface-50)] p-4 rounded-xl border border-[var(--color-surface-200)] flex flex-col items-center text-center">
          <span className="text-2xl font-bold text-[var(--color-mindora-ink)] mb-0.5">
            {Math.round(session.accuracy * 100)}%
          </span>
          <span className="text-xs text-[var(--color-mindora-slate)] font-medium">Accuracy</span>
        </div>
        
        <div className="bg-[var(--color-surface-50)] p-4 rounded-xl border border-[var(--color-surface-200)] flex flex-col items-center text-center">
          <span className="text-2xl font-bold text-[var(--color-mindora-ink)] mb-0.5">
            {session.avgReactionTime > 0 ? `${session.avgReactionTime}ms` : '—'}
          </span>
          <span className="text-xs text-[var(--color-mindora-slate)] font-medium">Avg Reaction</span>
        </div>
        
        <div className="bg-[var(--color-surface-50)] p-4 rounded-xl border border-[var(--color-surface-200)] flex flex-col items-center text-center">
          <span className="text-2xl font-bold text-[var(--color-mindora-ink)] mb-0.5">
            {correctAnswers} <span className="text-sm font-normal text-[var(--color-mindora-slate)]">/ {incorrectAnswers}</span>
          </span>
          <span className="text-xs text-[var(--color-mindora-slate)] font-medium">Hits / Misses</span>
        </div>
        
        <div className="bg-[var(--color-surface-50)] p-4 rounded-xl border border-[var(--color-surface-200)] flex flex-col items-center text-center">
          <span className="text-2xl font-bold text-[var(--color-mindora-ink)] mb-0.5">
            {session.bestStreak}
          </span>
          <span className="text-xs text-[var(--color-mindora-slate)] font-medium">Best Streak</span>
        </div>
      </div>

      {/* Meaningful Contextual Observations (Feedback Principle D) */}
      <div className="w-full bg-[var(--color-surface-50)] p-5 rounded-xl border border-[var(--color-surface-200)] mb-8 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-md bg-[var(--color-mindora-lavender)]/20 text-[var(--color-brand-700)] flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold">
            ✦
          </div>
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-[var(--color-mindora-slate)]">Session Observation</div>
            <p className="text-sm text-[var(--color-surface-700)] mt-0.5 leading-relaxed">{observation}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-[var(--color-surface-200)] flex items-start gap-3">
          <div className="w-6 h-6 rounded-md bg-[var(--color-mindora-mint)]/50 text-[var(--color-surface-800)] flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold">
            💡
          </div>
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-[var(--color-mindora-slate)]">Next Session Strategy</div>
            <p className="text-sm text-[var(--color-surface-700)] mt-0.5 leading-relaxed">{strategy}</p>
          </div>
        </div>
      </div>
      
      {/* Primary Navigation Actions */}
      <div className="flex flex-col sm:flex-row w-full gap-3">
        <button 
          onClick={onPlayAgain}
          className="flex-1 py-3.5 bg-[var(--color-mindora-ink)] hover:bg-[var(--color-surface-800)] text-white font-semibold text-base rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.98]"
        >
          Replay Challenge
        </button>
        
        <button 
          onClick={onBackToMenu}
          className="flex-1 py-3.5 bg-white border border-[var(--color-surface-300)] hover:bg-[var(--color-surface-100)] text-[var(--color-mindora-ink)] font-semibold text-base rounded-xl transition cursor-pointer active:scale-[0.98]"
        >
          Return to Studio
        </button>
      </div>
    </div>
  );
}
