import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import { getDifficultyParams } from '../../engine/adaptiveEngine';
import { GameIntro, GameCountdown, GameHUD, GamePause, GameResults } from '../components';

const GAME_ID = 'memory-matrix';
const CATEGORY = 'memory';

type CellState = 'hidden' | 'highlighted' | 'selected' | 'correct' | 'incorrect';

export default function MemoryMatrix() {
  const session = useGameSession({
    gameId: GAME_ID,
    category: CATEGORY,
    totalRounds: 15,
    baseScore: 100,
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
    startGame,
    startCountdown,
    recordCorrect,
    recordIncorrect,
    nextRound,
    endGame,
    pauseGame,
    resumeGame,
    resetGame, restartGame,
    session: finalSession
  } = session;

  const [gridSize, setGridSize] = useState(3);
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [cellStates, setCellStates] = useState<CellState[]>([]);
  const [isShowingPattern, setIsShowingPattern] = useState(false);
  const [roundState, setRoundState] = useState<'showing' | 'waiting' | 'result'>('showing');
  const [startTime, setStartTime] = useState(0);

  const displayTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const startNewRound = useCallback(() => {
    const params = getDifficultyParams(difficulty);
    const currentGridSize = params.gridSize || Math.min(3 + Math.floor(difficulty / 2), 5);
    setGridSize(currentGridSize);
    
    const numCells = currentGridSize * currentGridSize;
    const numTargets = params.elementCount || Math.min(3 + difficulty, Math.floor(numCells * 0.5));
    
    // Generate random pattern
    const newPattern: number[] = [];
    while (newPattern.length < numTargets) {
      const idx = Math.floor(Math.random() * numCells);
      if (!newPattern.includes(idx)) {
        newPattern.push(idx);
      }
    }
    
    setPattern(newPattern);
    setUserPattern([]);
    
    // Initial state
    const newStates: CellState[] = Array(numCells).fill('hidden');
    newPattern.forEach(idx => {
      newStates[idx] = 'highlighted';
    });
    setCellStates(newStates);
    setIsShowingPattern(true);
    setRoundState('showing');
    
    // Set timeout to hide pattern
    if (displayTimeoutRef.current) clearTimeout(displayTimeoutRef.current);
    const displayTime = params.displayTime || (3000 - (difficulty * 300));
    
    displayTimeoutRef.current = setTimeout(() => {
      setCellStates(Array(numCells).fill('hidden'));
      setIsShowingPattern(false);
      setRoundState('waiting');
      setStartTime(Date.now());
    }, displayTime);
  }, [difficulty]);

  useEffect(() => {
    if (state === 'playing') {
      startNewRound();
    }
    return () => {
      if (displayTimeoutRef.current) clearTimeout(displayTimeoutRef.current);
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    };
  }, [state, round, startNewRound]);

  const handleCellClick = (index: number) => {
    if (roundState !== 'waiting' || userPattern.includes(index)) return;

    const newUserPattern = [...userPattern, index];
    setUserPattern(newUserPattern);

    const isCorrect = pattern.includes(index);
    const newStates = [...cellStates];
    
    if (isCorrect) {
      newStates[index] = 'correct';
      setCellStates(newStates);

      if (newUserPattern.length === pattern.length) {
        // Round won
        setRoundState('result');
        const reactionTime = Date.now() - startTime;
        recordCorrect(reactionTime);
        
        resultTimeoutRef.current = setTimeout(() => {
          if (round >= totalRounds) endGame();
          else nextRound();
        }, 1000);
      }
    } else {
      // Mistake made
      newStates[index] = 'incorrect';
      // Show missed targets
      pattern.forEach(idx => {
        if (!newUserPattern.includes(idx)) {
          newStates[idx] = 'highlighted'; // Show missed ones
        }
      });
      setCellStates(newStates);
      setRoundState('result');
      recordIncorrect();
      
      resultTimeoutRef.current = setTimeout(() => {
        if (round >= totalRounds) endGame();
        else nextRound();
      }, 1500);
    }
  };

  const renderGameContent = () => {
    if (state === 'idle' || state === 'intro') {
      return (
        <GameIntro
          name="Memory Matrix"
          description="Memorize the highlighted tiles and click them after they disappear."
          instructions={[
            "A pattern of tiles will be highlighted.",
            "Memorize the pattern.",
            "When they hide, tap the same tiles.",
            "Make one mistake and the round is over."
          ]}
          category={CATEGORY}
          difficulty={difficulty}
          onStart={startCountdown}
        />
      );
    }

    if (state === 'countdown') {
      return <GameCountdown count={countdown} category={CATEGORY} />;
    }

    if (state === 'results' && finalSession) {
      return <GameResults session={finalSession} onPlayAgain={restartGame} onBackToMenu={resetGame} />;
    }

    return (
      <div className="flex flex-col items-center justify-center h-full w-full max-w-xl mx-auto py-8">
        <div 
          className="grid gap-3 p-4 bg-white rounded-2xl shadow-lg border border-[var(--color-surface-100)]"
          style={{ 
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            width: '100%',
            aspectRatio: '1 / 1'
          }}
        >
          {cellStates.map((cellState, index) => {
            let bgColor = 'bg-[var(--color-surface-100)] hover:bg-[var(--color-surface-200)]';
            if (cellState === 'highlighted') bgColor = 'bg-[var(--color-memory)] scale-95';
            else if (cellState === 'correct') bgColor = 'bg-[var(--color-success-500)] scale-105';
            else if (cellState === 'incorrect') bgColor = 'bg-[var(--color-error-500)] animate-pulse';

            return (
              <button
                key={index}
                className={`rounded-xl transition-all duration-300 w-full h-full ${bgColor} shadow-sm ${roundState === 'waiting' ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                onClick={() => handleCellClick(index)}
                disabled={roundState !== 'waiting'}
                aria-label={`Cell ${index}`}
              />
            );
          })}
        </div>
        
        <div className="mt-8 text-[var(--color-surface-500)] font-medium h-6">
          {roundState === 'showing' ? 'Memorize the pattern...' : 
           roundState === 'waiting' ? 'Recall the pattern!' : ''}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface-50)]">
      {(state === 'playing' || state === 'paused') && (
        <GameHUD 
          round={round}
          totalRounds={totalRounds}
          score={score}
          streak={streak}
          category={CATEGORY}
          onPause={pauseGame}
        />
      )}
      
      <div className="flex-1 flex flex-col justify-center items-center p-4">
        {renderGameContent()}
      </div>

      {state === 'paused' && (
        <GamePause onResume={resumeGame} onQuit={resetGame} />
      )}
    </div>
  );
}
