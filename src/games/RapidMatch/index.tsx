import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import { getDifficultyParams } from '../../engine/adaptiveEngine';
import { GameIntro, GameCountdown, GameHUD, GamePause, GameResults } from '../components';

const GAME_ID = 'rapid-match';
const CATEGORY = 'speed';

const SYMBOLS = ['★', '♠', '♣', '♥', '♦', '▲', '▼', '●', '■', '✦', '✿', '✺'];

export default function RapidMatch() {
  const session = useGameSession({
    gameId: GAME_ID,
    category: CATEGORY,
    totalRounds: 20,
    baseScore: 100,
    targetReactionTime: 1000,
  });

  const { state, round, totalRounds, score, streak, difficulty, countdown, startGame, startCountdown, recordCorrect, recordIncorrect, nextRound, endGame, pauseGame, resumeGame, resetGame, restartGame, session: finalSession } = session;

  const [leftSymbol, setLeftSymbol] = useState('');
  const [rightSymbol, setRightSymbol] = useState('');
  const [isMatch, setIsMatch] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const [answered, setAnswered] = useState<'correct' | 'incorrect' | 'timeout' | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const startNewRound = useCallback(() => {
    const params = getDifficultyParams(difficulty);
    const roundTimeLimit = params.timeLimit ? params.timeLimit * 1000 : Math.max(1500, 3000 - (difficulty * 300));
    
    setMaxTime(roundTimeLimit);
    setTimeRemaining(roundTimeLimit);
    
    // 50% chance of matching
    const shouldMatch = Math.random() > 0.5;
    setIsMatch(shouldMatch);
    
    const sym1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    setLeftSymbol(sym1);
    
    if (shouldMatch) {
      setRightSymbol(sym1);
    } else {
      let sym2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      while (sym2 === sym1) sym2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      setRightSymbol(sym2);
    }
    
    setAnswered(null);
    setStartTime(Date.now());
  }, [difficulty]);

  useEffect(() => {
    if (state === 'playing') {
      startNewRound();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    };
  }, [state, round, startNewRound]);

  const handleTimeout = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setAnswered('timeout');
    recordIncorrect(maxTime);
    
    resultTimeoutRef.current = setTimeout(() => {
      if (round >= totalRounds) endGame();
      else nextRound();
    }, 800);
  }, [maxTime, recordIncorrect, round, totalRounds, endGame, nextRound]);

  const handleAnswer = useCallback((userSaysMatch: boolean) => {
    if (answered !== null) return;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    const reactionTime = Date.now() - startTime;
    const correct = userSaysMatch === isMatch;
    
    if (correct) {
      setAnswered('correct');
      recordCorrect(reactionTime);
    } else {
      setAnswered('incorrect');
      recordIncorrect(reactionTime);
    }
    
    resultTimeoutRef.current = setTimeout(() => {
      if (round >= totalRounds) endGame();
      else nextRound();
    }, 800);
  }, [answered, startTime, isMatch, recordCorrect, recordIncorrect, round, totalRounds, endGame, nextRound]);

  useEffect(() => {
    if (state === 'playing' && answered === null) {
      const updateTimer = () => {
        const elapsed = Date.now() - startTime;
        const remaining = maxTime - elapsed;
        
        if (remaining <= 0) {
          setTimeRemaining(0);
          handleTimeout();
        } else {
          setTimeRemaining(remaining);
          animationFrameRef.current = requestAnimationFrame(updateTimer);
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(updateTimer);
      
      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
    }
  }, [state, answered, startTime, maxTime, handleTimeout]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state !== 'playing' || answered !== null) return;
      if (e.key === 'ArrowLeft') handleAnswer(false);
      if (e.key === 'ArrowRight') handleAnswer(true);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, answered, handleAnswer]);

  const renderGameContent = () => {
    if (state === 'idle' || state === 'intro') {
      return (
        <GameIntro
          name="Rapid Match"
          description="Decide quickly if the two symbols match."
          instructions={[
            "Two symbols will appear.",
            "Tap 'Match' if they are the same.",
            "Tap 'Different' if they are not.",
            "Use Left/Right arrow keys for faster play.",
            "Watch the timer!"
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
      <div className="flex flex-col items-center justify-center h-full w-full max-w-2xl mx-auto py-4 sm:py-8">
        <div className="flex justify-center items-center gap-4 sm:gap-12 w-full mb-8 sm:mb-16">
          <div className="w-32 h-32 sm:w-48 sm:h-48 bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-[var(--color-surface-200)] flex items-center justify-center text-6xl sm:text-8xl text-[var(--color-surface-800)] animate-fade-in-scale">
            {leftSymbol}
          </div>
          <div className="w-32 h-32 sm:w-48 sm:h-48 bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-[var(--color-surface-200)] flex items-center justify-center text-6xl sm:text-8xl text-[var(--color-surface-800)] animate-fade-in-scale">
            {rightSymbol}
          </div>
        </div>
        
        {answered && (
          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-5xl sm:text-6xl font-bold animate-fade-in z-20 ${
            answered === 'correct' ? 'text-[var(--color-success-500)]' : 
            answered === 'incorrect' ? 'text-[var(--color-error-500)]' : 
            'text-[var(--color-warning-500)]'
          }`}>
            {answered === 'correct' ? '✓' : answered === 'incorrect' ? '✗' : 'Timeout!'}
          </div>
        )}

        <div className="flex gap-4 sm:gap-8 w-full max-w-md mt-auto">
          <button 
            onClick={() => handleAnswer(false)}
            disabled={answered !== null}
            className="flex-1 py-4 sm:py-6 bg-white hover:bg-[var(--color-surface-50)] text-[var(--color-surface-800)] text-lg sm:text-xl font-bold rounded-2xl shadow-md border-2 border-[var(--color-surface-200)] active:scale-95 transition-all flex flex-col items-center cursor-pointer"
          >
            <span>Different</span>
            <span className="text-xs text-[var(--color-surface-400)] mt-1 font-normal hidden sm:inline">← Left Arrow</span>
          </button>
          
          <button 
            onClick={() => handleAnswer(true)}
            disabled={answered !== null}
            className="flex-1 py-4 sm:py-6 bg-[var(--color-speed)] hover:bg-[#15aabf] text-white text-lg sm:text-xl font-bold rounded-2xl shadow-md border-2 border-transparent active:scale-95 transition-all flex flex-col items-center cursor-pointer"
          >
            <span>Match</span>
            <span className="text-xs text-white/80 mt-1 font-normal hidden sm:inline">Right Arrow →</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-surface-50)]">
      {(state === 'playing' || state === 'paused') && (
        <GameHUD round={round} totalRounds={totalRounds} score={score} streak={streak} category={CATEGORY} onPause={pauseGame} timeRemaining={timeRemaining} maxTime={maxTime} />
      )}
      <div className="flex-1 flex flex-col justify-center items-center p-4">
        {renderGameContent()}
      </div>
      {state === 'paused' && <GamePause onResume={resumeGame} onQuit={resetGame} />}
    </div>
  );
}
