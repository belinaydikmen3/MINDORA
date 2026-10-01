import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import { getDifficultyParams } from '../../engine/adaptiveEngine';
import { GameIntro, GameCountdown, GameHUD, GamePause, GameResults } from '../components';

const GAME_ID = 'number-cascade';
const CATEGORY = 'problem-solving';

interface CascadeRound {
  title: string;
  items: (number | string)[];
  missingIndex: number;
  answer: number;
  options: number[];
  hint: string;
}

function generateCascadePuzzle(difficulty: number, roundNum: number): CascadeRound {
  const puzzleType = (roundNum + difficulty) % 4;

  if (puzzleType === 0) {
    // Linear arithmetic progression
    const step = (1 + Math.floor(Math.random() * 4)) * (difficulty >= 3 ? 3 : 2);
    const start = Math.floor(Math.random() * 20) + 1;
    const len = 5;
    const nums = Array.from({ length: len }, (_, i) => start + i * step);
    const missingIdx = 2 + Math.floor(Math.random() * 2);
    const ans = nums[missingIdx];
    const items = nums.map((n, i) => (i === missingIdx ? '?' : n));

    const opts = generateDistractorNumbers(ans, step);
    return {
      title: 'Arithmetic Cascade',
      items,
      missingIndex: missingIdx,
      answer: ans,
      options: opts,
      hint: 'Find the consistent difference between successive terms.',
    };
  } else if (puzzleType === 1) {
    // Alternating operations (+A, -B)
    const addVal = 3 + difficulty;
    const subVal = 1 + Math.floor(difficulty / 2);
    const start = 10 + Math.floor(Math.random() * 15);
    const nums: number[] = [start];
    for (let i = 1; i < 5; i++) {
      const prev = nums[i - 1];
      nums.push(i % 2 === 1 ? prev + addVal : prev - subVal);
    }
    const missingIdx = 3;
    const ans = nums[missingIdx];
    const items = nums.map((n, i) => (i === missingIdx ? '?' : n));
    const opts = generateDistractorNumbers(ans, subVal || 2);
    return {
      title: 'Dual-Phase Oscillation',
      items,
      missingIndex: missingIdx,
      answer: ans,
      options: opts,
      hint: 'The pattern alternates between two distinct operations.',
    };
  } else if (puzzleType === 2) {
    // Geometric / Multiplicative progression
    const factor = difficulty >= 3 ? 3 : 2;
    const start = Math.floor(Math.random() * 5) + 2;
    const nums = [start, start * factor, start * factor * factor, start * factor * factor * factor];
    const missingIdx = 2;
    const ans = nums[missingIdx];
    const items = nums.map((n, i) => (i === missingIdx ? '?' : n));
    const opts = generateDistractorNumbers(ans, factor * 2);
    return {
      title: 'Geometric Cascade',
      items,
      missingIndex: missingIdx,
      answer: ans,
      options: opts,
      hint: 'Each number is scaled by a consistent multiplier.',
    };
  } else {
    // Cumulative / Fibonacci-style sequence
    const a = 1 + Math.floor(Math.random() * 4);
    const b = a + 1 + Math.floor(Math.random() * 3);
    const c = a + b;
    const d = b + c;
    const e = c + d;
    const nums = [a, b, c, d, e];
    const missingIdx = 3;
    const ans = nums[missingIdx];
    const items = nums.map((n, i) => (i === missingIdx ? '?' : n));
    const opts = generateDistractorNumbers(ans, 2);
    return {
      title: 'Summation Chain',
      items,
      missingIndex: missingIdx,
      answer: ans,
      options: opts,
      hint: 'Each term represents the sum of previous terms.',
    };
  }
}

function generateDistractorNumbers(answer: number, offsetHint: number): number[] {
  const distractors = new Set<number>();
  distractors.add(answer);

  const deltas = [-offsetHint, offsetHint, offsetHint * 2, -offsetHint * 2, 1, -1, 3, -3];
  for (const d of deltas) {
    if (distractors.size >= 4) break;
    const candidate = answer + d;
    if (candidate > 0 && candidate !== answer) {
      distractors.add(candidate);
    }
  }

  let fallback = 1;
  while (distractors.size < 4) {
    distractors.add(answer + fallback);
    fallback++;
  }

  return Array.from(distractors).sort(() => Math.random() - 0.5);
}

export default function NumberCascade() {
  const session = useGameSession({
    gameId: GAME_ID,
    category: CATEGORY,
    totalRounds: 12,
    baseScore: 125,
    targetReactionTime: 2200,
  });

  const {
    state,
    round,
    totalRounds,
    score,
    streak,
    difficulty,
    countdown,
    startCountdown,
    recordCorrect,
    recordIncorrect,
    nextRound,
    endGame,
    pauseGame,
    resumeGame,
    resetGame,
    restartGame,
    session: finalSession,
  } = session;

  const [puzzle, setPuzzle] = useState<CascadeRound | null>(null);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [startTime, setStartTime] = useState(0);

  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const initRound = useCallback(() => {
    const nextPuzzle = generateCascadePuzzle(difficulty, round);
    setPuzzle(nextPuzzle);
    setSelectedOpt(null);
    setStartTime(Date.now());
  }, [difficulty, round]);

  useEffect(() => {
    if (state === 'playing') {
      initRound();
    }
    return () => {
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    };
  }, [state, round, initRound]);

  const handleSelectOption = (num: number) => {
    if (selectedOpt !== null || !puzzle) return;
    setSelectedOpt(num);
    const reactionTime = Date.now() - startTime;
    const isCorrect = num === puzzle.answer;

    if (isCorrect) {
      recordCorrect(reactionTime);
    } else {
      recordIncorrect(reactionTime);
    }

    resultTimeoutRef.current = setTimeout(() => {
      if (round >= totalRounds) endGame();
      else nextRound();
    }, 900);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state !== 'playing' || selectedOpt !== null || !puzzle) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (puzzle.options[idx] !== undefined) {
          handleSelectOption(puzzle.options[idx]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const renderContent = () => {
    if (state === 'idle' || state === 'intro') {
      return (
        <GameIntro
          name="Number Cascade"
          description="Resolve arithmetic and algebraic patterns cascading through numerical relationships."
          instructions={[
            'Observe the sequence of interlocking numbers.',
            'Deduce the underlying mathematical relationship or step rule.',
            'Select the missing number that satisfies the pattern.',
            'Keys 1–4 or tap to select.',
          ]}
          category={CATEGORY}
          difficulty={difficulty}
          onStart={startCountdown}
        />
      );
    }

    if (state === 'countdown') return <GameCountdown count={countdown} category={CATEGORY} />;
    if (state === 'results' && finalSession) {
      return <GameResults session={finalSession} onPlayAgain={restartGame} onBackToMenu={resetGame} />;
    }
    if (!puzzle) return null;

    return (
      <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-4 py-8">
        {/* Cascade Container */}
        <div className="w-full bg-white p-6 sm:p-9 rounded-2xl shadow-sm border border-[var(--color-surface-200)] mb-8 flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 bg-[var(--color-surface-100)] text-[var(--color-mindora-slate)]">
            {puzzle.title}
          </div>
          <p className="text-xs text-[var(--color-surface-500)] mb-8 text-center">{puzzle.hint}</p>

          {/* Numerical Sequence Pipeline */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 w-full">
            {puzzle.items.map((val, idx) => {
              const isTarget = val === '?';
              return (
                <React.Fragment key={idx}>
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-mono font-bold transition-all shadow-xs ${
                      isTarget
                        ? 'border-2 border-dashed border-[var(--color-mindora-lavender)] bg-[var(--color-mindora-lavender)]/10 text-[var(--color-brand-800)] scale-105 animate-pulse-soft'
                        : 'bg-[var(--color-surface-50)] border border-[var(--color-surface-200)] text-[var(--color-mindora-ink)]'
                    }`}
                  >
                    {val}
                  </div>
                  {idx < puzzle.items.length - 1 && (
                    <span className="text-[var(--color-surface-300)] font-mono text-sm">→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* 4 Candidate Option Tiles */}
        <div className="w-full max-w-lg grid grid-cols-2 gap-4">
          {puzzle.options.map((optVal, idx) => {
            const isSelected = selectedOpt === optVal;
            const isCorrect = optVal === puzzle.answer;
            const showFeedback = selectedOpt !== null;

            let cardStyle = 'bg-white hover:border-[var(--color-mindora-lavender)] hover:shadow-xs';
            if (showFeedback) {
              if (isSelected && isCorrect) cardStyle = 'bg-[var(--color-success-50)] border-[var(--color-success-500)] ring-2 ring-[var(--color-success-500)]';
              else if (isSelected && !isCorrect) cardStyle = 'bg-[var(--color-error-50)] border-[var(--color-error-500)] ring-2 ring-[var(--color-error-500)]';
              else if (isCorrect) cardStyle = 'bg-[var(--color-success-50)] border-[var(--color-success-500)]';
              else cardStyle = 'opacity-40 border-[var(--color-surface-200)]';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(optVal)}
                disabled={selectedOpt !== null}
                className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center relative cursor-pointer active:scale-95 ${cardStyle}`}
              >
                <span className="absolute top-2 left-3 text-[10px] font-mono text-[var(--color-mindora-slate)] font-bold">
                  [{idx + 1}]
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-bold text-[var(--color-mindora-ink)]">
                  {optVal}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface-50)]">
      {(state === 'playing' || state === 'paused') && (
        <GameHUD round={round} totalRounds={totalRounds} score={score} streak={streak} category={CATEGORY} onPause={pauseGame} />
      )}
      <div className="flex-1 flex flex-col justify-center items-center w-full">{renderContent()}</div>
      {state === 'paused' && <GamePause onResume={resumeGame} onQuit={resetGame} />}
    </div>
  );
}
