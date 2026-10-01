/**
 * NEUROVA Scoring Engine
 * Reusable scoring system with category-specific weights.
 */

import type { DifficultyLevel } from '../types';

interface ScoreParams {
  baseScore: number;
  accuracy: number; // 0-1
  avgReactionTime: number; // ms
  targetReactionTime: number; // ms
  streak: number;
  difficulty: DifficultyLevel;
  roundsPlayed: number;
  roundsCorrect: number;
}

interface ScoreWeights {
  accuracy: number;
  speed: number;
  streak: number;
  difficulty: number;
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  accuracy: 1.0,
  speed: 0.8,
  streak: 0.5,
  difficulty: 1.2,
};

const CATEGORY_WEIGHTS: Record<string, Partial<ScoreWeights>> = {
  memory: { accuracy: 1.2, speed: 0.5, streak: 0.6, difficulty: 1.0 },
  attention: { accuracy: 1.0, speed: 0.9, streak: 0.7, difficulty: 1.0 },
  speed: { accuracy: 0.7, speed: 1.4, streak: 0.8, difficulty: 1.0 },
  'problem-solving': { accuracy: 1.3, speed: 0.4, streak: 0.5, difficulty: 1.3 },
  spatial: { accuracy: 1.1, speed: 0.6, streak: 0.6, difficulty: 1.1 },
};

export function calculateScore(params: ScoreParams, category?: string): number {
  const weights = {
    ...DEFAULT_WEIGHTS,
    ...(category ? CATEGORY_WEIGHTS[category] : {}),
  };

  // Accuracy bonus: 0.5 to 1.5
  const accuracyBonus = 0.5 + params.accuracy * weights.accuracy;

  // Speed bonus: based on how fast vs target time (0.5 to 1.5)
  const speedRatio = Math.min(params.targetReactionTime / Math.max(params.avgReactionTime, 100), 2);
  const speedBonus = 0.5 + (speedRatio * 0.5) * weights.speed;

  // Streak bonus: logarithmic scaling (1.0 to ~1.5)
  const streakBonus = 1 + Math.log2(Math.max(params.streak, 1)) * 0.1 * weights.streak;

  // Difficulty multiplier (1.0 to 2.5)
  const difficultyMultiplier = 0.5 + params.difficulty * 0.4 * weights.difficulty;

  if (params.roundsPlayed > 0 && params.roundsCorrect === 0) {
    return 0;
  }

  const rawScore = params.baseScore * accuracyBonus * speedBonus * streakBonus * difficultyMultiplier;

  // Normalize to reasonable range
  return Math.round(Math.min(Math.max(rawScore, 0), 9999));
}

export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100) / 100;
}

export function calculatePercentile(score: number, historicalScores: number[]): number {
  if (historicalScores.length === 0) return 50;
  const below = historicalScores.filter((s) => s < score).length;
  return Math.round((below / historicalScores.length) * 100);
}

export function normalizeScore(score: number, maxPossible: number): number {
  return Math.round((score / maxPossible) * 100);
}

export function getCategoryScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  // Weighted average: recent scores matter more
  const recentCount = Math.min(scores.length, 10);
  const recent = scores.slice(-recentCount);
  let weightSum = 0;
  let weightedTotal = 0;
  recent.forEach((s, i) => {
    const weight = i + 1; // More recent = higher weight
    weightedTotal += s * weight;
    weightSum += weight;
  });
  return Math.round(weightedTotal / weightSum);
}
