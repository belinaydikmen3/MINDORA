import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import { getDifficultyParams } from '../../engine/adaptiveEngine';
import { GameIntro, GameCountdown, GameHUD, GamePause, GameResults } from '../components';

const GAME_ID = 'route-weaver';
const CATEGORY = 'spatial';

interface CellCoord {
  r: number;
  c: number;
}

export default function RouteWeaver() {
  const session = useGameSession({
    gameId: GAME_ID,
    category: CATEGORY,
    totalRounds: 10,
    baseScore: 140,
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

  const [gridSize, setGridSize] = useState(5);
  const [route, setRoute] = useState<CellCoord[]>([]);
  const [obstacles, setObstacles] = useState<CellCoord[]>([]);
  const [playerRoute, setPlayerRoute] = useState<CellCoord[]>([]);
  const [phase, setPhase] = useState<'showing' | 'tracing' | 'result'>('showing');
  const [previewStep, setPreviewStep] = useState<number>(-1);
  const [startTime, setStartTime] = useState(0);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const startNewRound = useCallback(() => {
    const size = difficulty >= 4 ? 6 : 5;
    setGridSize(size);

    // Number of steps in route
    const pathLen = Math.min(4 + Math.floor(difficulty * 0.9), 9);
    const numObstacles = Math.min(difficulty + 2, 7);

    // Generate random non-overlapping path from random start
    let generatedPath: CellCoord[] = [];
    let attempts = 0;

    while (generatedPath.length < pathLen && attempts < 100) {
      attempts++;
      const startR = Math.floor(Math.random() * (size - 2)) + 1;
      const startC = 0;
      const curPath: CellCoord[] = [{ r: startR, c: startC }];

      for (let s = 1; s < pathLen; s++) {
        const last = curPath[curPath.length - 1];
        const neighbors: CellCoord[] = [
          { r: last.r - 1, c: last.c },
          { r: last.r + 1, c: last.c },
          { r: last.r, c: last.c + 1 },
          { r: last.r, c: last.c - 1 },
        ].filter(
          (n) =>
            n.r >= 0 &&
            n.r < size &&
            n.c >= 0 &&
            n.c < size &&
            !curPath.some((p) => p.r === n.r && p.c === n.c)
        );

        if (neighbors.length === 0) break;
        // Bias forward slightly
        const forward = neighbors.filter((n) => n.c >= last.c);
        const choice = forward.length > 0 ? forward[Math.floor(Math.random() * forward.length)] : neighbors[0];
        curPath.push(choice);
      }

      if (curPath.length === pathLen) {
        generatedPath = curPath;
        break;
      }
    }

    if (generatedPath.length < pathLen) {
      // Linear safe fallback
      generatedPath = Array.from({ length: pathLen }, (_, i) => ({
        r: Math.floor(i / size),
        c: i % size,
      }));
    }

    // Place random obstacles not on path
    const obs: CellCoord[] = [];
    let obsAttempts = 0;
    while (obs.length < numObstacles && obsAttempts < 50) {
      obsAttempts++;
      const cand = { r: Math.floor(Math.random() * size), c: Math.floor(Math.random() * size) };
      const onPath = generatedPath.some((p) => p.r === cand.r && p.c === cand.c);
      const onObs = obs.some((o) => o.r === cand.r && o.c === cand.c);
      if (!onPath && !onObs) obs.push(cand);
    }

    setRoute(generatedPath);
    setObstacles(obs);
    setPlayerRoute([generatedPath[0]]); // User starts at first cell
    setPhase('showing');
    setPreviewStep(-1);

    // Animate path sequentially
    const stepInterval = Math.max(250, 450 - difficulty * 30);
    generatedPath.forEach((_, idx) => {
      setTimeout(() => {
        setPreviewStep(idx);
      }, (idx + 1) * stepInterval);
    });

    const totalShowTime = (generatedPath.length + 1) * stepInterval + 600;
    timeoutRef.current = setTimeout(() => {
      setPhase('tracing');
      setPreviewStep(-1);
      setStartTime(Date.now());
    }, totalShowTime);
  }, [difficulty]);

  useEffect(() => {
    if (state === 'playing') {
      startNewRound();
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state, round, startNewRound]);

  const handleCellClick = (r: number, c: number) => {
    if (phase !== 'tracing') return;

    const nextIndex = playerRoute.length;
    const targetCell = route[nextIndex];
    if (!targetCell) return;

    // Must be adjacent to last player cell
    const lastCell = playerRoute[playerRoute.length - 1];
    const isAdjacent = Math.abs(lastCell.r - r) + Math.abs(lastCell.c - c) === 1;

    if (!isAdjacent) return;

    if (r === targetCell.r && c === targetCell.c) {
      // Correct step
      const nextRoute = [...playerRoute, { r, c }];
      setPlayerRoute(nextRoute);

      if (nextRoute.length === route.length) {
        // Reached destination!
        setPhase('result');
        const reactionTime = Date.now() - startTime;
        recordCorrect(reactionTime);

        timeoutRef.current = setTimeout(() => {
          if (round >= totalRounds) endGame();
          else nextRound();
        }, 900);
      }
    } else {
      // Wrong path step
      setPhase('result');
      recordIncorrect();

      timeoutRef.current = setTimeout(() => {
        if (round >= totalRounds) endGame();
        else nextRound();
      }, 1100);
    }
  };

  const renderContent = () => {
    if (state === 'idle' || state === 'intro') {
      return (
        <GameIntro
          name="Route Weaver"
          description="Memorize the illuminated spatial pathway through the maze matrix and retrace it after it disappears."
          instructions={[
            'Observe the illuminated route weaving from Start to Goal.',
            'Memorize the turn sequence while avoiding obstacle zones.',
            'Retrace the route step-by-step by clicking connected adjacent tiles.',
            'Complete all route steps to seal the pathway.',
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

    const startCell = route[0];
    const goalCell = route[route.length - 1];

    return (
      <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto p-4 py-8">
        <div className="mb-6 text-center">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-mindora-slate)]">
            {phase === 'showing'
              ? `Memorize the Route (${route.length} Steps)...`
              : phase === 'tracing'
              ? `Retrace the Route (${playerRoute.length} / ${route.length})`
              : 'Pathway Analysis'}
          </span>
        </div>

        {/* Spatial Grid */}
        <div
          className="grid gap-2.5 p-4 bg-white rounded-3xl shadow-sm border border-[var(--color-surface-200)] w-full max-w-[420px] aspect-square"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: gridSize }).map((_, r) =>
            Array.from({ length: gridSize }).map((_, c) => {
              const isStart = startCell?.r === r && startCell?.c === c;
              const isGoal = goalCell?.r === r && goalCell?.c === c;
              const isObstacle = obstacles.some((o) => o.r === r && o.c === c);
              const inShowingPath =
                phase === 'showing' &&
                previewStep >= 0 &&
                route.slice(0, previewStep + 1).some((p) => p.r === r && p.c === c);
              const inPlayerPath = playerRoute.some((p) => p.r === r && p.c === c);

              let bg = 'bg-[var(--color-surface-50)] hover:bg-[var(--color-surface-100)]';
              let content = null;

              if (isObstacle) {
                bg = 'bg-[var(--color-surface-300)] opacity-70';
                content = <span className="text-xs opacity-50">✕</span>;
              } else if (inShowingPath) {
                bg = 'bg-[var(--color-spatial)] text-white scale-105 shadow-sm';
              } else if (inPlayerPath) {
                bg = 'bg-[var(--color-spatial)] text-white';
              }

              if (isStart) content = <span className="font-bold text-xs">S</span>;
              if (isGoal) content = <span className="font-bold text-xs">G</span>;

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleCellClick(r, c)}
                  disabled={phase !== 'tracing' || isObstacle}
                  className={`rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-150 ${bg} ${
                    phase === 'tracing' && !isObstacle ? 'cursor-pointer active:scale-95' : 'cursor-default'
                  }`}
                >
                  {content}
                </button>
              );
            })
          )}
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
