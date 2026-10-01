/**
 * NEUROVA useGameSession Hook
 * Shared game session management for all games.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { GameState, GameSession, DifficultyLevel, CognitiveCategory } from '../types';
import { saveSession, updateStatsAfterSession } from '../services/storage';
import { updateAdaptiveState, getDifficultyForCategory } from '../engine/adaptiveEngine';
import { calculateScore } from '../engine/scoring';
import { checkAchievements } from '../services/achievementChecker';
import { playSuccess, playFailure, playCountdown, playCountdownGo, playSessionComplete } from '../services/audio';
import { markRoutineGameComplete } from '../services/dailyRoutine';

interface UseGameSessionOptions {
  gameId: string;
  category: CognitiveCategory;
  totalRounds?: number;
  baseScore?: number;
  targetReactionTime?: number;
}

export interface GameSessionHook {
  state: GameState;
  round: number;
  totalRounds: number;
  score: number;
  accuracy: number;
  streak: number;
  bestStreak: number;
  difficulty: DifficultyLevel;
  countdown: number;
  reactionTimes: number[];
  roundsCorrect: number;
  session: GameSession | null;

  startGame: () => void;
  startCountdown: () => void;
  recordCorrect: (reactionTime: number) => void;
  recordIncorrect: (reactionTime?: number) => void;
  nextRound: () => void;
  endGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  restartGame: () => void;
  setState: (state: GameState) => void;
}

export function useGameSession(options: UseGameSessionOptions): GameSessionHook {
  const { gameId, category, totalRounds: initialTotalRounds = 15, baseScore = 100, targetReactionTime = 1000 } = options;

  const [state, setStateInternal] = useState<GameState>('idle');
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(initialTotalRounds);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [roundsCorrect, setRoundsCorrect] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(() => getDifficultyForCategory(category));
  const [session, setSession] = useState<GameSession | null>(null);

  const reactionTimesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const setState = useCallback((newState: GameState) => {
    setStateInternal(newState);
  }, []);

  const startCountdown = useCallback(() => {
    setStateInternal('countdown');
    setCountdown(3);
    let count = 3;

    countdownTimerRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
        playCountdown();
      } else {
        clearInterval(countdownTimerRef.current);
        setCountdown(0);
        playCountdownGo();
        setStateInternal('playing');
        setRound(1);
        startTimeRef.current = Date.now();
      }
    }, 800);
  }, []);

  const startGame = useCallback(() => {
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setRoundsCorrect(0);
    setRound(0);
    reactionTimesRef.current = [];
    setSession(null);
    setDifficulty(getDifficultyForCategory(category));
    setStateInternal('intro');
  }, [category]);

  const restartGame = useCallback(() => {
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setRoundsCorrect(0);
    setRound(0);
    reactionTimesRef.current = [];
    setSession(null);
    setDifficulty(getDifficultyForCategory(category));
    startCountdown();
  }, [category, startCountdown]);

  const recordCorrect = useCallback((reactionTime: number) => {
    reactionTimesRef.current.push(reactionTime);
    setRoundsCorrect((prev) => prev + 1);
    setStreak((prev) => {
      const newStreak = prev + 1;
      setBestStreak((best) => Math.max(best, newStreak));
      return newStreak;
    });
    playSuccess();
  }, []);

  const recordIncorrect = useCallback((reactionTime?: number) => {
    if (reactionTime) reactionTimesRef.current.push(reactionTime);
    setStreak(0);
    playFailure();
  }, []);

  const nextRound = useCallback(() => {
    setRound((prev) => {
      if (prev >= totalRounds) {
        return prev;
      }
      return prev + 1;
    });
  }, [totalRounds]);

  const endGame = useCallback(() => {
    const now = Date.now();
    const duration = now - startTimeRef.current;
    const rts = reactionTimesRef.current;
    const avgRT = rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 0;

    // Get the latest state values synchronously
    setRoundsCorrect((currentRoundsCorrect) => {
      setStreak((currentStreak) => {
        setBestStreak((currentBestStreak) => {
          const totalPlayed = Math.max(round, 1);
          const acc = totalPlayed > 0 ? currentRoundsCorrect / totalPlayed : 0;

          const finalScore = calculateScore({
            baseScore,
            accuracy: acc,
            avgReactionTime: avgRT,
            targetReactionTime,
            streak: currentBestStreak,
            difficulty,
            roundsPlayed: totalPlayed,
            roundsCorrect: currentRoundsCorrect,
          }, category);

          const gameSession: GameSession = {
            id: `${gameId}-${Date.now()}`,
            gameId,
            category,
            level: difficulty,
            score: finalScore,
            accuracy: Math.round(acc * 100) / 100,
            streak: currentStreak,
            bestStreak: currentBestStreak,
            reactionTimes: [...rts],
            avgReactionTime: Math.round(avgRT),
            difficulty,
            roundsPlayed: totalPlayed,
            roundsCorrect: currentRoundsCorrect,
            startedAt: new Date(startTimeRef.current).toISOString(),
            completedAt: new Date(now).toISOString(),
            duration,
          };

          setScore(finalScore);
          setSession(gameSession);
          saveSession(gameSession);
          updateStatsAfterSession(gameSession);
          updateAdaptiveState(gameSession);
          checkAchievements(gameSession);
          markRoutineGameComplete(gameId);
          playSessionComplete();
          setStateInternal('results');

          return currentBestStreak;
        });
        return currentStreak;
      });
      return currentRoundsCorrect;
    });
  }, [gameId, category, difficulty, round, baseScore, targetReactionTime]);

  const pauseGame = useCallback(() => {
    setStateInternal('paused');
  }, []);

  const resumeGame = useCallback(() => {
    setStateInternal('playing');
  }, []);

  const resetGame = useCallback(() => {
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setRoundsCorrect(0);
    setRound(0);
    reactionTimesRef.current = [];
    setSession(null);
    setStateInternal('idle');
  }, []);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  const accuracy = round > 0 ? Math.round((roundsCorrect / round) * 100) / 100 : 0;

  return {
    state,
    round,
    totalRounds,
    score,
    accuracy,
    streak,
    bestStreak,
    difficulty,
    countdown,
    reactionTimes: reactionTimesRef.current,
    roundsCorrect,
    session,
    startGame,
    startCountdown,
    recordCorrect,
    recordIncorrect,
    nextRound,
    endGame,
    pauseGame,
    resumeGame,
    resetGame,
    restartGame,
    setState,
  };
}
