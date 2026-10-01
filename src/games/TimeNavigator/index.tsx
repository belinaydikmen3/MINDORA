import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSession } from '../../hooks/useGameSession';
import { getDifficultyParams } from '../../engine/adaptiveEngine';
import { GameIntro, GameCountdown, GameHUD, GamePause, GameResults } from '../components';

const GAME_ID = 'time-navigator';
const CATEGORY = 'speed';

interface SpeedTask {
  prompt: string;
  leftCategory: string;
  rightCategory: string;
  isRightCorrect: boolean;
  valueDisplay: string | number;
}

function generateSpeedTask(roundNum: number): SpeedTask {
  const taskType = roundNum % 4;

  if (taskType === 0) {
    // Even vs Odd
    const n = Math.floor(Math.random() * 88) + 11;
    const isEven = n % 2 === 0;
    return {
      prompt: 'Classify Parity',
      leftCategory: 'EVEN',
      rightCategory: 'ODD',
      isRightCorrect: !isEven,
      valueDisplay: n,
    };
  } else if (taskType === 1) {
    // Greater vs Less than 50
    const n = Math.floor(Math.random() * 90) + 5;
    const isGreater = n > 50;
    return {
      prompt: 'Compare to 50',
      leftCategory: '< 50',
      rightCategory: '> 50',
      isRightCorrect: isGreater,
      valueDisplay: n === 50 ? 51 : n,
    };
  } else if (taskType === 2) {
    // Vowel vs Consonant
    const vowels = ['A', 'E', 'I', 'O', 'U'];
    const consonants = ['B', 'C', 'D', 'F', 'G', 'H', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T'];
    const pickVowel = Math.random() > 0.5;
    const char = pickVowel ? vowels[Math.floor(Math.random() * vowels.length)] : consonants[Math.floor(Math.random() * consonants.length)];
    return {
      prompt: 'Character Classification',
      leftCategory: 'VOWEL',
      rightCategory: 'CONSONANT',
      isRightCorrect: !pickVowel,
      valueDisplay: char,
    };
  } else {
    // Color temperature
    const warm = [{ name: 'Scarlet', col: '#ef4444' }, { name: 'Amber', col: '#f59e0b' }, { name: 'Crimson', col: '#dc2626' }];
    const cool = [{ name: 'Azure', col: '#3b82f6' }, { name: 'Emerald', col: '#10b981' }, { name: 'Violet', col: '#8b5cf6' }];
    const isWarm = Math.random() > 0.5;
    const item = isWarm ? warm[Math.floor(Math.random() * warm.length)] : cool[Math.floor(Math.random() * cool.length)];
    return {
      prompt: 'Color Tone',
      leftCategory: 'WARM',
      rightCategory: 'COOL',
      isRightCorrect: !isWarm,
      valueDisplay: item.name,
    };
  }
}

export default function TimeNavigator() {
  const session = useGameSession({
    gameId: GAME_ID,
    category: CATEGORY,
    totalRounds: 20,
    baseScore: 100,
    targetReactionTime: 1100,
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

  const [currentTask, setCurrentTask] = useState<SpeedTask | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [maxTime, setMaxTime] = useState(2500);
  const [answered, setAnswered] = useState<'correct' | 'incorrect' | 'timeout' | null>(null);

  const animationFrameRef = useRef<number | undefined>(undefined);
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const startNewRound = useCallback(() => {
    const roundTimeLimit = Math.max(1200, 2600 - difficulty * 250);
    setMaxTime(roundTimeLimit);
    setTimeRemaining(roundTimeLimit);

    const task = generateSpeedTask(round);
    setCurrentTask(task);
    setAnswered(null);
    setStartTime(Date.now());
  }, [difficulty, round]);

  const handleTimeout = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setAnswered('timeout');
    recordIncorrect(maxTime);

    resultTimeoutRef.current = setTimeout(() => {
      if (round >= totalRounds) endGame();
      else nextRound();
    }, 600);
  }, [maxTime, recordIncorrect, round, totalRounds, endGame, nextRound]);

  const handleAnswer = useCallback(
    (choseRight: boolean) => {
      if (answered !== null || !currentTask) return;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

      const reactionTime = Date.now() - startTime;
      const isCorrect = choseRight === currentTask.isRightCorrect;

      if (isCorrect) {
        setAnswered('correct');
        recordCorrect(reactionTime);
      } else {
        setAnswered('incorrect');
        recordIncorrect(reactionTime);
      }

      resultTimeoutRef.current = setTimeout(() => {
        if (round >= totalRounds) endGame();
        else nextRound();
      }, 600);
    },
    [answered, currentTask, startTime, recordCorrect, recordIncorrect, round, totalRounds, endGame, nextRound]
  );

  useEffect(() => {
    if (state === 'playing') {
      startNewRound();
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    };
  }, [state, round, startNewRound]);

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
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'z') handleAnswer(false);
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === '/') handleAnswer(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, answered, handleAnswer]);

  const renderContent = () => {
    if (state === 'idle' || state === 'intro') {
      return (
        <GameIntro
          name="Time Navigator"
          description="Accelerate perceptual processing speed through rapid dual-category classification under high time pressure."
          instructions={[
            'Read the active classification rule at the top.',
            'Sort the central item into the Left or Right category.',
            'Left Arrow / Z for Left; Right Arrow / Slash for Right.',
            'Speed and accuracy both drive your score.',
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
    if (!currentTask) return null;

    return (
      <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto p-4 py-8">
        <div className="text-xs uppercase font-bold tracking-widest text-[var(--color-mindora-slate)] mb-2">
          {currentTask.prompt}
        </div>

        {/* Central Stimulus Card */}
        <div className="w-64 h-48 bg-white rounded-3xl border border-[var(--color-surface-200)] shadow-sm flex items-center justify-center my-6 relative animate-fade-in-scale">
          <span className="text-4xl sm:text-5xl font-mono font-bold text-[var(--color-mindora-ink)]">
            {currentTask.valueDisplay}
          </span>

          {answered && (
            <div
              className={`absolute inset-0 rounded-3xl flex items-center justify-center text-5xl font-bold animate-fade-in ${
                answered === 'correct'
                  ? 'bg-[var(--color-success-50)] text-[var(--color-success-500)]'
                  : answered === 'incorrect'
                  ? 'bg-[var(--color-error-50)] text-[var(--color-error-500)]'
                  : 'bg-amber-50 text-amber-500'
              }`}
            >
              {answered === 'correct' ? '✓' : answered === 'incorrect' ? '✗' : '⏱'}
            </div>
          )}
        </div>

        {/* Two Choice Action Buttons */}
        <div className="flex gap-4 sm:gap-6 w-full max-w-md mt-4">
          <button
            onClick={() => handleAnswer(false)}
            disabled={answered !== null}
            className="flex-1 py-5 bg-white hover:bg-[var(--color-surface-50)] text-[var(--color-mindora-ink)] font-bold text-lg rounded-2xl border-2 border-[var(--color-surface-200)] active:scale-95 transition-all flex flex-col items-center cursor-pointer shadow-xs"
          >
            <span>{currentTask.leftCategory}</span>
            <span className="text-[11px] text-[var(--color-mindora-slate)] font-mono font-normal mt-1">
              ← Left Arrow
            </span>
          </button>

          <button
            onClick={() => handleAnswer(true)}
            disabled={answered !== null}
            className="flex-1 py-5 bg-[var(--color-mindora-ink)] hover:bg-[var(--color-surface-800)] text-white font-bold text-lg rounded-2xl active:scale-95 transition-all flex flex-col items-center cursor-pointer shadow-xs"
          >
            <span>{currentTask.rightCategory}</span>
            <span className="text-[11px] text-white/70 font-mono font-normal mt-1">
              Right Arrow →
            </span>
          </button>
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
          timeRemaining={timeRemaining}
          maxTime={maxTime}
        />
      )}
      <div className="flex-1 flex flex-col justify-center items-center w-full">{renderContent()}</div>
      {state === 'paused' && <GamePause onResume={resumeGame} onQuit={resetGame} />}
    </div>
  );
}
