import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import { getDifficultyParams } from '../../engine/adaptiveEngine';
import { GameIntro, GameCountdown, GameHUD, GamePause, GameResults } from '../components';

const GAME_ID = 'orbit-tracker';
const CATEGORY = 'spatial';

interface Orb {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isTarget: boolean;
}

export default function OrbitTracker() {
  const session = useGameSession({
    gameId: GAME_ID,
    category: CATEGORY,
    totalRounds: 10,
    baseScore: 100,
    targetReactionTime: 2000,
  });

  const { state, round, totalRounds, score, streak, difficulty, countdown, startGame, startCountdown, recordCorrect, recordIncorrect, nextRound, endGame, pauseGame, resumeGame, resetGame, restartGame, session: finalSession } = session;

  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [gamePhase, setGamePhase] = useState<'showing' | 'moving' | 'guessing' | 'result'>('showing');
  const [selectedOrbs, setSelectedOrbs] = useState<number[]>([]);
  const [startTime, setStartTime] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const orbsRef = useRef<Orb[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const startNewRound = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = Math.max(rect.width || 320, 320);
    const height = Math.max(rect.height || 240, 240);
    
    const params = getDifficultyParams(difficulty);
    const numOrbs = params.elementCount ? params.elementCount + 2 : 4 + difficulty;
    const numTargets = Math.max(2, Math.floor(numOrbs / 3));
    const speedMultiplier = params.speed || 1;

    const newOrbs: Orb[] = [];
    const orbRadius = 24;

    for (let i = 0; i < numOrbs; i++) {
      const isTarget = i < numTargets;
      
      let x = orbRadius, y = orbRadius, overlap = false;
      let attempts = 0;
      do {
        attempts++;
        overlap = false;
        x = Math.random() * (width - orbRadius * 2) + orbRadius;
        y = Math.random() * (height - orbRadius * 2) + orbRadius;
        
        for (const existing of newOrbs) {
          const dx = existing.x - x;
          const dy = existing.y - y;
          if (Math.sqrt(dx*dx + dy*dy) < orbRadius * 2.5) {
            overlap = true;
            break;
          }
        }
      } while (overlap && attempts < 50);

      const angle = Math.random() * Math.PI * 2;
      const speed = (1 + Math.random() * 1.5) * speedMultiplier;
      
      newOrbs.push({
        id: i,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        isTarget
      });
    }

    orbsRef.current = newOrbs;
    setOrbs([...newOrbs]);
    setSelectedOrbs([]);
    setGamePhase('showing');

    // Phase 1: Show targets
    timeoutRef.current = setTimeout(() => {
      setGamePhase('moving');
      
      // Phase 2: Move
      let lastTime = performance.now();
      
      const animate = (time: number) => {
        if (!containerRef.current) return;
        const dt = (time - lastTime) / 16;
        lastTime = time;
        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.max(rect.width || 320, 320);
        const height = Math.max(rect.height || 240, 240);
        
        const currentOrbs = [...orbsRef.current];
        
        for (let i = 0; i < currentOrbs.length; i++) {
          let o = currentOrbs[i];
          o.x += o.vx * dt;
          o.y += o.vy * dt;
          
          if (o.x < orbRadius) { o.x = orbRadius; o.vx *= -1; }
          if (o.x > width - orbRadius) { o.x = width - orbRadius; o.vx *= -1; }
          if (o.y < orbRadius) { o.y = orbRadius; o.vy *= -1; }
          if (o.y > height - orbRadius) { o.y = height - orbRadius; o.vy *= -1; }
        }
        
        // Simple collision
        for (let i = 0; i < currentOrbs.length; i++) {
          for (let j = i + 1; j < currentOrbs.length; j++) {
            const o1 = currentOrbs[i];
            const o2 = currentOrbs[j];
            const dx = o2.x - o1.x;
            const dy = o2.y - o1.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < orbRadius * 2) {
              const nx = dx / dist;
              const ny = dy / dist;
              const p = 2 * (o1.vx * nx + o1.vy * ny - o2.vx * nx - o2.vy * ny) / 2;
              o1.vx -= p * nx;
              o1.vy -= p * ny;
              o2.vx += p * nx;
              o2.vy += p * ny;
              
              const overlap = (orbRadius * 2 - dist) / 2;
              o1.x -= nx * overlap;
              o1.y -= ny * overlap;
              o2.x += nx * overlap;
              o2.y += ny * overlap;
            }
          }
        }
        
        orbsRef.current = currentOrbs;
        setOrbs([...currentOrbs]);
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animationRef.current = requestAnimationFrame(animate);
      
      // Stop moving after some time
      const moveTime = 4000 + difficulty * 1000;
      timeoutRef.current = setTimeout(() => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        setGamePhase('guessing');
        setStartTime(Date.now());
      }, moveTime);
      
    }, 2500);

  }, [difficulty]);

  useEffect(() => {
    let roundInitTimer: ReturnType<typeof setTimeout> | undefined;
    if (state === 'playing') {
      roundInitTimer = setTimeout(startNewRound, 100);
    }
    return () => {
      if (roundInitTimer) clearTimeout(roundInitTimer);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [state, round, startNewRound]);

  const handleOrbClick = (id: number) => {
    if (gamePhase !== 'guessing' || selectedOrbs.includes(id)) return;
    
    const newSelected = [...selectedOrbs, id];
    setSelectedOrbs(newSelected);
    
    const targets = orbs.filter(o => o.isTarget);
    
    // Check if clicked wrong
    const clickedOrb = orbs.find(o => o.id === id);
    if (clickedOrb && !clickedOrb.isTarget) {
      setGamePhase('result');
      recordIncorrect();
      timeoutRef.current = setTimeout(() => {
        if (round >= totalRounds) endGame();
        else nextRound();
      }, 1500);
      return;
    }
    
    // Check if all found
    if (newSelected.length === targets.length) {
      setGamePhase('result');
      const reactionTime = Date.now() - startTime;
      recordCorrect(reactionTime);
      timeoutRef.current = setTimeout(() => {
        if (round >= totalRounds) endGame();
        else nextRound();
      }, 1500);
    }
  };

  const renderGameContent = () => {
    if (state === 'idle' || state === 'intro') {
      return (
        <GameIntro
          name="Orbit Tracker"
          description="Track the moving targets among the distractors."
          instructions={[
            "Memorize the highlighted target objects.",
            "Watch carefully as they all become identical and move.",
            "When they stop, select all the original targets."
          ]}
          category={CATEGORY}
          difficulty={difficulty}
          onStart={startCountdown}
        />
      );
    }

    if (state === 'countdown') return <GameCountdown count={countdown} category={CATEGORY} />;
    if (state === 'results' && finalSession) return <GameResults session={finalSession} onPlayAgain={restartGame} onBackToMenu={resetGame} />;

    return (
      <div className="flex flex-col items-center justify-center h-full w-full max-w-4xl mx-auto p-4">
        <div className="text-center mb-6 h-8">
          <span className="text-lg font-bold text-[var(--color-surface-600)]">
            {gamePhase === 'showing' ? 'Memorize the highlighted targets!' :
             gamePhase === 'moving' ? 'Track them!' :
             gamePhase === 'guessing' ? `Select the ${orbs.filter(o => o.isTarget).length} targets` :
             'Result'}
          </span>
        </div>
        
        <div 
          ref={containerRef}
          className="w-full aspect-video bg-white rounded-3xl shadow-inner border-4 border-[var(--color-surface-200)] relative overflow-hidden"
        >
          {orbs.map(orb => {
            let bgColor = 'bg-[var(--color-surface-400)]';
            let extraClass = '';
            
            if (gamePhase === 'showing') {
              if (orb.isTarget) {
                bgColor = 'bg-[var(--color-spatial)]';
                extraClass = 'scale-110 shadow-[0_0_15px_rgba(240,101,149,0.6)] animate-pulse';
              }
            } else if (gamePhase === 'guessing') {
              bgColor = 'bg-[var(--color-surface-400)] hover:bg-[var(--color-surface-500)] cursor-pointer hover:scale-105';
              if (selectedOrbs.includes(orb.id)) {
                bgColor = 'bg-[var(--color-spatial)]';
                extraClass = 'scale-110 shadow-[0_0_15px_rgba(240,101,149,0.6)]';
              }
            } else if (gamePhase === 'result') {
              if (orb.isTarget) {
                bgColor = 'bg-[var(--color-success-500)]';
                extraClass = 'scale-110';
              } else if (selectedOrbs.includes(orb.id)) {
                bgColor = 'bg-[var(--color-error-500)]';
                extraClass = 'animate-pulse';
              } else {
                bgColor = 'bg-[var(--color-surface-200)]';
                extraClass = 'opacity-30';
              }
            }

            return (
              <button
                key={orb.id}
                className={`absolute w-12 h-12 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-colors duration-300 ${bgColor} ${extraClass}`}
                style={{ left: orb.x, top: orb.y }}
                onClick={() => handleOrbClick(orb.id)}
                disabled={gamePhase !== 'guessing'}
              />
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
      <div className="flex-1 flex flex-col justify-center items-center">
        {renderGameContent()}
      </div>
      {state === 'paused' && <GamePause onResume={resumeGame} onQuit={resetGame} />}
    </div>
  );
}
