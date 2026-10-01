import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import { getDifficultyParams } from '../../engine/adaptiveEngine';
import { GameIntro, GameCountdown, GameHUD, GamePause, GameResults } from '../components';

const GAME_ID = 'balance-lab';
const CATEGORY = 'problem-solving';

type WeightShape = 'cube' | 'sphere' | 'cylinder' | 'pyramid';

interface WeightDef {
  shape: WeightShape;
  color: string;
  name: string;
  symbol: string;
}

const WEIGHTS: Record<WeightShape, WeightDef> = {
  cube: { shape: 'cube', color: '#3b82f6', name: 'Cube', symbol: '■' },
  sphere: { shape: 'sphere', color: '#10b981', name: 'Sphere', symbol: '●' },
  cylinder: { shape: 'cylinder', color: '#f59e0b', name: 'Cylinder', symbol: '▮' },
  pyramid: { shape: 'pyramid', color: '#ec4899', name: 'Pyramid', symbol: '▲' },
};

interface BalancePuzzle {
  premises: {
    left: { shape: WeightShape; count: number }[];
    right: { shape: WeightShape; count: number }[];
  }[];
  queryLeft: { shape: WeightShape; count: number }[];
  correctRight: { shape: WeightShape; count: number }[];
  options: { shape: WeightShape; count: number }[][];
  correctIndex: number;
}

function generateBalancePuzzle(difficulty: number): BalancePuzzle {
  // Unit values (hidden from player)
  // E.g., Sphere = 1, Pyramid = 2, Cylinder = 3, Cube = 6
  let sphereVal = 1;
  let cylinderVal = 2;
  let cubeVal = 4;
  let pyramidVal = 3;

  if (difficulty >= 3) {
    cylinderVal = 3;
    pyramidVal = 2;
    cubeVal = 6;
  }

  // Premise 1: 1 Cube = X Cylinders
  const p1LeftCount = 1;
  const p1RightCount = (p1LeftCount * cubeVal) / cylinderVal;

  const premises = [
    {
      left: [{ shape: 'cube' as WeightShape, count: p1LeftCount }],
      right: [{ shape: 'cylinder' as WeightShape, count: p1RightCount }],
    },
  ];

  if (difficulty >= 2) {
    // Premise 2: 1 Cylinder = Y Spheres
    const p2RightCount = cylinderVal / sphereVal;
    premises.push({
      left: [{ shape: 'cylinder' as WeightShape, count: 1 }],
      right: [{ shape: 'sphere' as WeightShape, count: p2RightCount }],
    });
  }

  // Target query: What balances 1 Cube (or 2 Cylinders)?
  let queryCount = 1;
  let queryShape: WeightShape = 'cube';
  let targetVal = cubeVal;

  if (difficulty >= 4) {
    queryCount = 2;
    targetVal = cubeVal * 2;
  }

  const queryLeft = [{ shape: queryShape, count: queryCount }];

  // Correct answer in Spheres or Cylinders
  const targetAnsShape: WeightShape = difficulty >= 2 ? 'sphere' : 'cylinder';
  const targetAnsUnitVal = targetAnsShape === 'sphere' ? sphereVal : cylinderVal;
  const correctCount = targetVal / targetAnsUnitVal;

  const correctRight = [{ shape: targetAnsShape, count: correctCount }];

  // 3 Distractor combinations
  const optionsSet: { shape: WeightShape; count: number }[][] = [correctRight];

  const deltas = [-1, 1, 2, -2];
  for (const d of deltas) {
    if (optionsSet.length >= 4) break;
    const candCount = correctCount + d;
    if (candCount > 0 && candCount !== correctCount) {
      optionsSet.push([{ shape: targetAnsShape, count: candCount }]);
    }
  }

  while (optionsSet.length < 4) {
    optionsSet.push([{ shape: targetAnsShape, count: correctCount + optionsSet.length }]);
  }

  const shuffled = optionsSet.sort(() => Math.random() - 0.5);
  const correctIndex = shuffled.findIndex(
    (opt) => opt[0].shape === correctRight[0].shape && opt[0].count === correctRight[0].count
  );

  return {
    premises,
    queryLeft,
    correctRight,
    options: shuffled,
    correctIndex,
  };
}

export default function BalanceLab() {
  const session = useGameSession({
    gameId: GAME_ID,
    category: CATEGORY,
    totalRounds: 10,
    baseScore: 125,
    targetReactionTime: 3000,
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

  const [puzzle, setPuzzle] = useState<BalancePuzzle | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [startTime, setStartTime] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const initRound = useCallback(() => {
    const nextPuzzle = generateBalancePuzzle(difficulty);
    setPuzzle(nextPuzzle);
    setSelectedIdx(null);
    setStartTime(Date.now());
  }, [difficulty]);

  useEffect(() => {
    if (state === 'playing') {
      initRound();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state, round, initRound]);

  const handleSelectOption = (idx: number) => {
    if (selectedIdx !== null || !puzzle) return;
    setSelectedIdx(idx);
    const reactionTime = Date.now() - startTime;
    const isCorrect = idx === puzzle.correctIndex;

    if (isCorrect) {
      recordCorrect(reactionTime);
    } else {
      recordIncorrect(reactionTime);
    }

    timeoutRef.current = setTimeout(() => {
      if (round >= totalRounds) endGame();
      else nextRound();
    }, 1000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state !== 'playing' || selectedIdx !== null || !puzzle) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        handleSelectOption(parseInt(e.key, 10) - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const renderContent = () => {
    if (state === 'idle' || state === 'intro') {
      return (
        <GameIntro
          name="Balance Lab"
          description="Apply transitive logic and deductive substitution to balance complex geometric scale weights."
          instructions={[
            'Observe the calibrated scales showing equal weights in equilibrium.',
            'Deduce the relative weight values between different shapes.',
            'Determine the exact combination required to balance the target scale.',
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
        {/* Established Truths (Equilibrium Scales) */}
        <div className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-[var(--color-surface-200)] mb-8">
          <div className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-mindora-slate)] mb-4 text-center">
            Established Equilibrium (Given Premises)
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
            {puzzle.premises.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-4 bg-[var(--color-surface-50)] px-6 py-3.5 rounded-xl border border-[var(--color-surface-200)]"
              >
                {/* Left side */}
                <div className="flex items-center gap-1.5 font-bold font-mono text-base">
                  <span>{p.left[0].count}</span>
                  <span style={{ color: WEIGHTS[p.left[0].shape].color }}>
                    {WEIGHTS[p.left[0].shape].symbol}
                  </span>
                </div>

                <span className="font-bold text-[var(--color-surface-400)] text-sm">=</span>

                {/* Right side */}
                <div className="flex items-center gap-1.5 font-bold font-mono text-base">
                  <span>{p.right[0].count}</span>
                  <span style={{ color: WEIGHTS[p.right[0].shape].color }}>
                    {WEIGHTS[p.right[0].shape].symbol}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Target Scale Query */}
        <div className="w-full bg-[var(--color-surface-50)] p-6 rounded-2xl border-2 border-dashed border-[var(--color-mindora-lavender)] mb-8 flex flex-col items-center text-center">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--color-brand-800)] mb-3">
            Target Scale Equilibrium
          </span>

          <div className="flex items-center gap-6 text-xl font-bold font-mono">
            <div className="flex items-center gap-2">
              <span>{puzzle.queryLeft[0].count}</span>
              <span style={{ color: WEIGHTS[puzzle.queryLeft[0].shape].color }} className="text-2xl">
                {WEIGHTS[puzzle.queryLeft[0].shape].symbol}
              </span>
            </div>

            <span className="text-[var(--color-mindora-slate)]">=</span>

            <div className="px-4 py-2 bg-white rounded-xl border border-[var(--color-surface-300)] text-[var(--color-brand-800)]">
              ?
            </div>
          </div>
        </div>

        {/* 4 Candidate Option Tiles */}
        <div className="w-full max-w-lg grid grid-cols-2 gap-4">
          {puzzle.options.map((opt, idx) => {
            const isSelected = selectedIdx === idx;
            const isCorrect = idx === puzzle.correctIndex;
            const showFeedback = selectedIdx !== null;

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
                onClick={() => handleSelectOption(idx)}
                disabled={selectedIdx !== null}
                className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center relative cursor-pointer active:scale-95 ${cardStyle}`}
              >
                <span className="absolute top-2 left-3 text-[10px] font-mono text-[var(--color-mindora-slate)] font-bold">
                  [{idx + 1}]
                </span>
                <div className="flex items-center gap-2 font-mono text-2xl font-bold">
                  <span>{opt[0].count}</span>
                  <span style={{ color: WEIGHTS[opt[0].shape].color }}>{WEIGHTS[opt[0].shape].symbol}</span>
                </div>
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
