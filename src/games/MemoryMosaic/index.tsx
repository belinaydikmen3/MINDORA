import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import { getDifficultyParams } from '../../engine/adaptiveEngine';
import { GameIntro, GameCountdown, GameHUD, GamePause, GameResults } from '../components';

const GAME_ID = 'memory-mosaic';
const CATEGORY = 'spatial';

const PALETTE = [
  { id: 1, name: 'Cobalt', color: '#2563eb' },
  { id: 2, name: 'Jade', color: '#059669' },
  { id: 3, name: 'Ochre', color: '#d97706' },
  { id: 4, name: 'Rose', color: '#e11d48' },
];

export default function MemoryMosaic() {
  const session = useGameSession({
    gameId: GAME_ID,
    category: CATEGORY,
    totalRounds: 10,
    baseScore: 130,
    targetReactionTime: 2500,
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

  const [gridSize, setGridSize] = useState(4);
  const [targetGrid, setTargetGrid] = useState<number[]>([]);
  const [userGrid, setUserGrid] = useState<number[]>([]);
  const [selectedColorId, setSelectedColorId] = useState<number>(1);
  const [phase, setPhase] = useState<'study' | 'reconstruct' | 'feedback'>('study');
  const [activeColorsCount, setActiveColorsCount] = useState<number>(2);
  const [startTime, setStartTime] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const initRound = useCallback(() => {
    const size = difficulty >= 4 ? 5 : 4;
    setGridSize(size);

    const totalCells = size * size;
    const numColors = Math.min(2 + Math.floor(difficulty / 2), 4);
    setActiveColorsCount(numColors);

    // Number of colored tiles
    const numTiles = Math.min(3 + difficulty, Math.floor(totalCells * 0.45));

    const grid = Array(totalCells).fill(0);
    const chosenIndices = new Set<number>();

    while (chosenIndices.size < numTiles) {
      const idx = Math.floor(Math.random() * totalCells);
      chosenIndices.add(idx);
    }

    chosenIndices.forEach((idx) => {
      const colId = 1 + Math.floor(Math.random() * numColors);
      grid[idx] = colId;
    });

    setTargetGrid(grid);
    setUserGrid(Array(totalCells).fill(0));
    setPhase('study');
    setSelectedColorId(1);

    const studyDuration = Math.max(1500, 3000 - difficulty * 300);
    timeoutRef.current = setTimeout(() => {
      setPhase('reconstruct');
      setStartTime(Date.now());
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

  const handleTileClick = (index: number) => {
    if (phase !== 'reconstruct') return;

    const nextUser = [...userGrid];
    // Toggle: if already current color, set to 0, else set to selectedColorId
    nextUser[index] = nextUser[index] === selectedColorId ? 0 : selectedColorId;
    setUserGrid(nextUser);
  };

  const handleVerify = () => {
    if (phase !== 'reconstruct') return;
    setPhase('feedback');
    const reactionTime = Date.now() - startTime;

    // Check accuracy
    let matches = 0;
    let targetTilesCount = 0;
    for (let i = 0; i < targetGrid.length; i++) {
      if (targetGrid[i] > 0) targetTilesCount++;
      if (userGrid[i] === targetGrid[i]) matches++;
    }

    const isFullyCorrect = matches === targetGrid.length;

    if (isFullyCorrect) {
      recordCorrect(reactionTime);
    } else {
      recordIncorrect(reactionTime);
    }

    timeoutRef.current = setTimeout(() => {
      if (round >= totalRounds) endGame();
      else nextRound();
    }, 1100);
  };

  const renderContent = () => {
    if (state === 'idle' || state === 'intro') {
      return (
        <GameIntro
          name="Memory Mosaic"
          description="Retain spatial tile compositions and reconstruct multi-colored mosaic motifs from visual memory."
          instructions={[
            'Observe the colorful geometric mosaic layout on the grid.',
            'Memorize both tile positions and their respective color motifs.',
            'When the mosaic hides, select colors from the palette to recreate it.',
            'Tap tiles to color them, then tap Complete Mosaic to submit.',
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

    const availableColors = PALETTE.slice(0, activeColorsCount);

    return (
      <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto p-4 py-8">
        <div className="mb-4 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-mindora-slate)]">
            {phase === 'study'
              ? 'Study the Mosaic Pattern...'
              : phase === 'reconstruct'
              ? 'Reconstruct the Mosaic from Memory'
              : 'Verifying Mosaic Composition...'}
          </span>
        </div>

        {/* Mosaic Grid */}
        <div
          className="grid gap-2.5 p-4 bg-white rounded-3xl shadow-sm border border-[var(--color-surface-200)] w-full max-w-[360px] aspect-square mb-6"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: gridSize * gridSize }).map((_, idx) => {
            const displayColorId = phase === 'study' ? targetGrid[idx] : userGrid[idx];
            const targetColorDef = PALETTE.find((p) => p.id === displayColorId);

            return (
              <button
                key={idx}
                onClick={() => handleTileClick(idx)}
                disabled={phase !== 'reconstruct'}
                className={`rounded-2xl transition-all duration-150 flex items-center justify-center border-2 ${
                  phase === 'reconstruct' ? 'cursor-pointer active:scale-95' : 'cursor-default'
                }`}
                style={{
                  backgroundColor: targetColorDef ? targetColorDef.color : '#f8fafc',
                  borderColor: targetColorDef ? targetColorDef.color : '#e2e8f0',
                }}
              />
            );
          })}
        </div>

        {/* Color Palette Selector & Confirm Button */}
        {phase === 'reconstruct' && (
          <div className="flex flex-col items-center gap-5 w-full">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[var(--color-mindora-slate)] uppercase tracking-wider">
                Palette:
              </span>
              {availableColors.map((col) => {
                const isSelected = selectedColorId === col.id;
                return (
                  <button
                    key={col.id}
                    onClick={() => setSelectedColorId(col.id)}
                    className={`w-9 h-9 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                      isSelected ? 'ring-3 ring-[var(--color-mindora-ink)] ring-offset-2 scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: col.color }}
                    title={col.name}
                  >
                    {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleVerify}
              className="px-8 py-3 bg-[var(--color-mindora-ink)] hover:bg-[var(--color-surface-800)] text-white text-sm font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            >
              Confirm Mosaic Placement →
            </button>
          </div>
        )}
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
