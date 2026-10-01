import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import { getDifficultyParams } from '../../engine/adaptiveEngine';
import { GameIntro, GameCountdown, GameHUD, GamePause, GameResults } from '../components';

const GAME_ID = 'silent-sequence';
const CATEGORY = 'attention';

type GlyphType = 'cross' | 'ring' | 'triangle' | 'rhombus' | 'crescent';
const GLYPH_TYPES: GlyphType[] = ['cross', 'ring', 'triangle', 'rhombus', 'crescent'];
const GLYPH_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

interface ConstellationItem {
  id: number;
  type: GlyphType;
  color: string;
  rotation: number;
  x: number; // percentage 10-90
  y: number; // percentage 15-85
}

function renderSilentGlyph(type: GlyphType, color: string, rotation: number, size = 36) {
  const center = size / 2;
  const rad = size * 0.4;

  const shapeSVG = () => {
    switch (type) {
      case 'cross':
        return (
          <>
            <line x1={center - rad} y1={center} x2={center + rad} y2={center} stroke={color} strokeWidth="4" strokeLinecap="round" />
            <line x1={center} y1={center - rad} x2={center} y2={center + rad} stroke={color} strokeWidth="4" strokeLinecap="round" />
          </>
        );
      case 'ring':
        return <circle cx={center} cy={center} r={rad} fill="none" stroke={color} strokeWidth="3.5" />;
      case 'triangle': {
        const h = rad * 1.7;
        const pts = `${center},${center - rad} ${center - rad},${center + h - rad} ${center + rad},${center + h - rad}`;
        return <polygon points={pts} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />;
      }
      case 'rhombus': {
        const pts = `${center},${center - rad} ${center + rad},${center} ${center},${center + rad} ${center - rad},${center}`;
        return <polygon points={pts} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" />;
      }
      case 'crescent':
        return (
          <path
            d={`M ${center - rad} ${center} A ${rad} ${rad} 0 0 0 ${center + rad} ${center} A ${rad * 0.7} ${rad * 0.7} 0 0 1 ${center - rad} ${center}`}
            fill={color}
          />
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {shapeSVG()}
    </svg>
  );
}

export default function SilentSequence() {
  const session = useGameSession({
    gameId: GAME_ID,
    category: CATEGORY,
    totalRounds: 12,
    baseScore: 120,
    targetReactionTime: 2000,
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

  const [items, setItems] = useState<ConstellationItem[]>([]);
  const [changedItemId, setChangedItemId] = useState<number>(-1);
  const [isMasked, setIsMasked] = useState(false);
  const [isWaitingInput, setIsWaitingInput] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const initRound = useCallback(() => {
    // Number of glyphs in field: 6 at diff 1, up to 14 at diff 5
    const count = Math.min(6 + difficulty * 2, 14);

    const initialItems: ConstellationItem[] = [];
    const minDistance = 14; // percentage distance

    for (let i = 0; i < count; i++) {
      let x = 50, y = 50, valid = false;
      let attempts = 0;

      while (!valid && attempts < 80) {
        attempts++;
        x = 12 + Math.random() * 76;
        y = 15 + Math.random() * 70;
        valid = initialItems.every((it) => Math.hypot(it.x - x, it.y - y) >= minDistance);
      }

      initialItems.push({
        id: i,
        type: GLYPH_TYPES[Math.floor(Math.random() * GLYPH_TYPES.length)],
        color: GLYPH_COLORS[Math.floor(Math.random() * GLYPH_COLORS.length)],
        rotation: [0, 90, 180, 270][Math.floor(Math.random() * 4)],
        x,
        y,
      });
    }

    setItems(initialItems);
    setIsMasked(false);
    setIsWaitingInput(false);
    setSelectedId(null);

    // After study time (1800ms), trigger brief shutter mask (200ms) and mutate one item
    const studyDuration = Math.max(1200, 2200 - difficulty * 180);
    timeoutRef.current = setTimeout(() => {
      setIsMasked(true);

      setTimeout(() => {
        // Mutate one random item
        const targetIdx = Math.floor(Math.random() * initialItems.length);
        const target = initialItems[targetIdx];

        const mutated = [...initialItems];
        // Mutate rotation or shape or color
        const mutationType = Math.random();
        if (mutationType < 0.4) {
          mutated[targetIdx] = { ...target, rotation: (target.rotation + 90) % 360 };
        } else if (mutationType < 0.75) {
          const newType = GLYPH_TYPES.find((t) => t !== target.type) || 'crescent';
          mutated[targetIdx] = { ...target, type: newType };
        } else {
          const newCol = GLYPH_COLORS.find((c) => c !== target.color) || '#f59e0b';
          mutated[targetIdx] = { ...target, color: newCol };
        }

        setItems(mutated);
        setChangedItemId(target.id);
        setIsMasked(false);
        setIsWaitingInput(true);
        setStartTime(Date.now());
      }, 200);
    }, studyDuration);
  }, [difficulty]);

  useEffect(() => {
    if (state === 'playing') {
      initRound();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state, round, initRound]);

  const handleSelectGlyph = (id: number) => {
    if (!isWaitingInput || selectedId !== null) return;

    setSelectedId(id);
    const reactionTime = Date.now() - startTime;
    const isCorrect = id === changedItemId;

    if (isCorrect) {
      recordCorrect(reactionTime);
    } else {
      recordIncorrect(reactionTime);
    }

    timeoutRef.current = setTimeout(() => {
      if (round >= totalRounds) endGame();
      else nextRound();
    }, 900);
  };

  const renderContent = () => {
    if (state === 'idle' || state === 'intro') {
      return (
        <GameIntro
          name="Silent Sequence"
          description="Resist visual change blindness by detecting subtle mutations across a constellation of glyphs after a momentary visual shutter."
          instructions={[
            'Observe the constellation of geometric symbols.',
            'A brief visual shutter mask will dip the screen.',
            'Exactly ONE glyph has changed (rotation, shape, or color).',
            'Identify and tap the altered glyph as quickly as possible.',
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

    return (
      <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto p-4 py-8">
        <div className="mb-4 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-mindora-slate)]">
            {!isWaitingInput
              ? 'Study the glyph constellation...'
              : 'Select the glyph that changed!'}
          </span>
        </div>

        {/* Constellation Field */}
        <div className="w-full aspect-[4/3] bg-white rounded-3xl border border-[var(--color-surface-200)] shadow-sm relative overflow-hidden">
          {/* Shutter Mask Overlay */}
          {isMasked && <div className="absolute inset-0 bg-slate-900 z-30 animate-fade-in" />}

          {items.map((it) => {
            const isSelected = selectedId === it.id;
            const isTarget = it.id === changedItemId;
            const showFeedback = selectedId !== null;

            let borderStyle = 'border border-transparent hover:border-[var(--color-mindora-lavender)] hover:bg-slate-50';
            if (showFeedback) {
              if (isSelected && isTarget) borderStyle = 'border-2 border-[var(--color-success-500)] bg-[var(--color-success-50)] ring-2 ring-[var(--color-success-500)]';
              else if (isSelected && !isTarget) borderStyle = 'border-2 border-[var(--color-error-500)] bg-[var(--color-error-50)]';
              else if (isTarget) borderStyle = 'border-2 border-[var(--color-success-500)] bg-[var(--color-success-50)] scale-110';
              else borderStyle = 'opacity-30';
            }

            return (
              <button
                key={it.id}
                onClick={() => handleSelectGlyph(it.id)}
                disabled={!isWaitingInput || selectedId !== null}
                className={`absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-2xl flex items-center justify-center transition-all ${borderStyle} ${
                  isWaitingInput ? 'cursor-pointer active:scale-95' : 'cursor-default'
                }`}
                style={{ left: `${it.x}%`, top: `${it.y}%` }}
              >
                {renderSilentGlyph(it.type, it.color, it.rotation, 36)}
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
