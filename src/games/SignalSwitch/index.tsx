import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import { getDifficultyParams } from '../../engine/adaptiveEngine';
import { GameIntro, GameCountdown, GameHUD, GamePause, GameResults } from '../components';

const GAME_ID = 'signal-switch';
const CATEGORY = 'attention';

type ShapeType = 'circle' | 'square' | 'triangle' | 'star';
type ColorType = '#3b82f6' | '#10b981' | '#f59e0b' | '#ec4899';
type SwitchRule = 'COLOR' | 'SHAPE' | 'COUNT';

interface CardItem {
  shape: ShapeType;
  color: ColorType;
  count: number;
}

const SHAPES: ShapeType[] = ['circle', 'square', 'triangle', 'star'];
const COLORS: ColorType[] = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
const COLOR_NAMES: Record<ColorType, string> = {
  '#3b82f6': 'Blue',
  '#10b981': 'Green',
  '#f59e0b': 'Amber',
  '#ec4899': 'Rose',
};

function renderCardShape(shape: ShapeType, color: string, size = 28) {
  const center = size / 2;
  const rad = size * 0.42;

  switch (shape) {
    case 'circle':
      return <circle cx={center} cy={center} r={rad} fill={color} />;
    case 'square':
      return <rect x={center - rad} y={center - rad} width={rad * 2} height={rad * 2} rx="4" fill={color} />;
    case 'triangle': {
      const h = rad * 1.8;
      const pts = `${center},${center - rad} ${center - rad},${center + h - rad} ${center + rad},${center + h - rad}`;
      return <polygon points={pts} fill={color} />;
    }
    case 'star':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
  }
}

export default function SignalSwitch() {
  const session = useGameSession({
    gameId: GAME_ID,
    category: CATEGORY,
    totalRounds: 15,
    baseScore: 110,
    targetReactionTime: 1400,
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

  const [activeRule, setActiveRule] = useState<SwitchRule>('COLOR');
  const [justSwitched, setJustSwitched] = useState(false);
  const [targetCard, setTargetCard] = useState<CardItem | null>(null);
  const [bins, setBins] = useState<CardItem[]>([]);
  const [correctBinIndex, setCorrectBinIndex] = useState(0);
  const [selectedBin, setSelectedBin] = useState<number | null>(null);
  const [startTime, setStartTime] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const initRound = useCallback(() => {
    // Decide rule switches: switch every 3 rounds or at high difficulty every 2 rounds
    const switchFrequency = difficulty >= 4 ? 2 : 3;
    const shouldSwitch = round > 1 && (round - 1) % switchFrequency === 0;

    let newRule = activeRule;
    if (shouldSwitch) {
      const allRules: SwitchRule[] = ['COLOR', 'SHAPE', 'COUNT'];
      const filtered = allRules.filter((r) => r !== activeRule);
      newRule = filtered[Math.floor(Math.random() * filtered.length)];
      setActiveRule(newRule);
      setJustSwitched(true);
      setTimeout(() => setJustSwitched(false), 1200);
    }

    // Generate central target card
    const target: CardItem = {
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      count: 1 + Math.floor(Math.random() * 3),
    };

    // Generate 3 candidate bins
    const candidateBins: CardItem[] = [];
    const correctBin: CardItem = {
      shape: newRule === 'SHAPE' ? target.shape : SHAPES.find((s) => s !== target.shape)!,
      color: newRule === 'COLOR' ? target.color : COLORS.find((c) => c !== target.color)!,
      count: newRule === 'COUNT' ? target.count : [1, 2, 3].find((ct) => ct !== target.count)!,
    };
    candidateBins.push(correctBin);

    // 2 distractor bins that do NOT match target on the active rule
    for (let i = 0; i < 2; i++) {
      candidateBins.push({
        shape: newRule === 'SHAPE' ? SHAPES.filter((s) => s !== target.shape)[i % 3] : target.shape,
        color: newRule === 'COLOR' ? COLORS.filter((c) => c !== target.color)[i % 3] : target.color,
        count: newRule === 'COUNT' ? [1, 2, 3].filter((ct) => ct !== target.count)[i % 2] : target.count,
      });
    }

    const shuffled = candidateBins.sort(() => Math.random() - 0.5);
    const correctIdx = shuffled.findIndex((b) => {
      if (newRule === 'COLOR') return b.color === target.color;
      if (newRule === 'SHAPE') return b.shape === target.shape;
      return b.count === target.count;
    });

    setTargetCard(target);
    setBins(shuffled);
    setCorrectBinIndex(correctIdx);
    setSelectedBin(null);
    setStartTime(Date.now());
  }, [difficulty, round, activeRule]);

  useEffect(() => {
    if (state === 'playing') {
      initRound();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state, round, initRound]);

  const handleSelectBin = (idx: number) => {
    if (selectedBin !== null) return;
    setSelectedBin(idx);
    const reactionTime = Date.now() - startTime;
    const isCorrect = idx === correctBinIndex;

    if (isCorrect) {
      recordCorrect(reactionTime);
    } else {
      recordIncorrect(reactionTime);
    }

    timeoutRef.current = setTimeout(() => {
      if (round >= totalRounds) endGame();
      else nextRound();
    }, 700);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state !== 'playing' || selectedBin !== null) return;
      if (['1', '2', '3'].includes(e.key)) {
        handleSelectBin(parseInt(e.key, 10) - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const renderContent = () => {
    if (state === 'idle' || state === 'intro') {
      return (
        <GameIntro
          name="Signal Switch"
          description="Exercise executive cognitive flexibility by sorting multi-attribute cards under dynamic, shifting decision rules."
          instructions={[
            'Observe the active sorting banner: [COLOR], [SHAPE], or [COUNT].',
            'Match the stimulus card to the correct bucket based solely on the current rule.',
            'Stay vigilant: rule switches happen dynamically mid-game!',
            'Keys 1–3 or tap bins directly.',
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
    if (!targetCard) return null;

    return (
      <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto p-4 py-8">
        {/* Active Rule Banner */}
        <div
          className={`w-full py-3 px-6 rounded-2xl mb-8 text-center transition-all shadow-sm ${
            justSwitched
              ? 'bg-[var(--color-mindora-coral)] text-white scale-105 animate-pulse'
              : 'bg-[var(--color-mindora-ink)] text-white'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-widest opacity-75">
            {justSwitched ? '⚡ RULE SWITCH ALERT ⚡' : 'ACTIVE DECISION CRITERION'}
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">
            MATCH BY {activeRule}
          </div>
        </div>

        {/* Central Stimulus Card */}
        <div className="w-48 h-48 bg-white rounded-3xl border-2 border-[var(--color-surface-300)] shadow-sm flex flex-col items-center justify-center gap-2 mb-10 animate-fade-in-scale">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: targetCard.count }).map((_, i) => (
              <svg key={i} width="40" height="40" viewBox="0 0 40 40">
                {renderCardShape(targetCard.shape, targetCard.color, 40)}
              </svg>
            ))}
          </div>
          <span className="text-[11px] font-mono font-medium text-[var(--color-mindora-slate)] mt-2">
            {targetCard.count} × {COLOR_NAMES[targetCard.color]} {targetCard.shape}
          </span>
        </div>

        {/* 3 Sorting Bins */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full">
          {bins.map((bin, idx) => {
            const isSelected = selectedBin === idx;
            const isCorrect = idx === correctBinIndex;
            const showFeedback = selectedBin !== null;

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
                onClick={() => handleSelectBin(idx)}
                disabled={selectedBin !== null}
                className={`p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center relative cursor-pointer active:scale-95 ${cardStyle}`}
              >
                <span className="absolute top-2 left-3 text-[10px] font-mono text-[var(--color-mindora-slate)] font-bold">
                  [{idx + 1}]
                </span>
                <div className="flex items-center justify-center gap-1 my-2">
                  {Array.from({ length: bin.count }).map((_, i) => (
                    <svg key={i} width="24" height="24" viewBox="0 0 24 24">
                      {renderCardShape(bin.shape, bin.color, 24)}
                    </svg>
                  ))}
                </div>
                <span className="text-[10px] text-[var(--color-mindora-slate)] font-mono">
                  {bin.count} {bin.shape}
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
