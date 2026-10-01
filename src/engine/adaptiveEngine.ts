/**
 * NEUROVA Adaptive Cognitive Engine
 * Rule-based adaptive difficulty system.
 */

import type { AdaptiveState, CognitiveCategory, DifficultyLevel, GameSession } from '../types';
import { getAdaptiveState, saveAdaptiveState } from '../services/storage';

const DEFAULT_STATE = (category: CognitiveCategory): AdaptiveState => ({
  category,
  currentDifficulty: 2 as DifficultyLevel,
  recentAccuracy: [],
  recentReactionTimes: [],
  recentScores: [],
  consecutiveSuccesses: 0,
  consecutiveFailures: 0,
  lastAdjustment: new Date().toISOString(),
});

const WINDOW_SIZE = 5;
const ACCURACY_THRESHOLD_UP = 0.85;
const ACCURACY_THRESHOLD_DOWN = 0.55;
const CONSECUTIVE_SUCCESS_THRESHOLD = 3;
const CONSECUTIVE_FAILURE_THRESHOLD = 2;
const MIN_SESSIONS_BEFORE_ADJUST = 2;

export function getOrCreateAdaptiveState(category: CognitiveCategory): AdaptiveState {
  return getAdaptiveState(category) ?? DEFAULT_STATE(category);
}

export function updateAdaptiveState(session: GameSession): AdaptiveState {
  const state = getOrCreateAdaptiveState(session.category);

  // Update sliding window
  state.recentAccuracy.push(session.accuracy);
  state.recentReactionTimes.push(session.avgReactionTime);
  state.recentScores.push(session.score);

  // Keep window size
  if (state.recentAccuracy.length > WINDOW_SIZE) {
    state.recentAccuracy = state.recentAccuracy.slice(-WINDOW_SIZE);
    state.recentReactionTimes = state.recentReactionTimes.slice(-WINDOW_SIZE);
    state.recentScores = state.recentScores.slice(-WINDOW_SIZE);
  }

  // Count consecutive success/failure
  const isSuccess = session.accuracy >= ACCURACY_THRESHOLD_UP;
  const isFailure = session.accuracy < ACCURACY_THRESHOLD_DOWN;

  if (isSuccess) {
    state.consecutiveSuccesses += 1;
    state.consecutiveFailures = 0;
  } else if (isFailure) {
    state.consecutiveFailures += 1;
    state.consecutiveSuccesses = 0;
  } else {
    state.consecutiveSuccesses = 0;
    state.consecutiveFailures = 0;
  }

  // Check if we should adjust difficulty
  if (state.recentAccuracy.length >= MIN_SESSIONS_BEFORE_ADJUST) {
    const avgAccuracy = average(state.recentAccuracy);
    const trend = calculateTrend(state.recentScores);

    const shouldIncrease =
      (avgAccuracy >= ACCURACY_THRESHOLD_UP && trend >= 0) ||
      state.consecutiveSuccesses >= CONSECUTIVE_SUCCESS_THRESHOLD;

    const shouldDecrease =
      (avgAccuracy < ACCURACY_THRESHOLD_DOWN) ||
      state.consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD;

    if (shouldIncrease && state.currentDifficulty < 5) {
      state.currentDifficulty = Math.min(5, state.currentDifficulty + 1) as DifficultyLevel;
      state.lastAdjustment = new Date().toISOString();
      state.consecutiveSuccesses = 0;
      state.recentAccuracy = [];
      state.recentReactionTimes = [];
      state.recentScores = [];
    } else if (shouldDecrease && state.currentDifficulty > 1) {
      state.currentDifficulty = Math.max(1, state.currentDifficulty - 1) as DifficultyLevel;
      state.lastAdjustment = new Date().toISOString();
      state.consecutiveFailures = 0;
      state.recentAccuracy = [];
      state.recentReactionTimes = [];
      state.recentScores = [];
    }
  }

  saveAdaptiveState(state);
  return state;
}

export function getDifficultyForCategory(category: CognitiveCategory): DifficultyLevel {
  const state = getOrCreateAdaptiveState(category);
  return state.currentDifficulty;
}

export function getDifficultyParams(difficulty: DifficultyLevel) {
  const idx = Math.max(0, Math.min(4, Math.round(Number(difficulty) || 1) - 1));
  return {
    speed: [1.5, 1.2, 1.0, 0.8, 0.6][idx],
    elementCount: [3, 4, 5, 7, 9][idx],
    patternComplexity: [1, 2, 3, 4, 5][idx],
    distractionLevel: [0, 1, 2, 3, 4][idx],
    timeLimit: [15, 12, 10, 8, 6][idx],
    displayTime: [3000, 2500, 2000, 1500, 1000][idx],
    gridSize: [3, 3, 4, 4, 5][idx],
  };
}

// ─── Helpers ────────────────────────────────────────────────

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;
  return (n * sumXY - sumX * sumY) / denominator;
}

export function getPerformanceSummary(category: CognitiveCategory) {
  const state = getOrCreateAdaptiveState(category);
  return {
    difficulty: state.currentDifficulty,
    avgAccuracy: average(state.recentAccuracy),
    avgReactionTime: average(state.recentReactionTimes),
    trend: calculateTrend(state.recentScores),
    sessionsTracked: state.recentScores.length,
  };
}
