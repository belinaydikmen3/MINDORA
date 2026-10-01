/**
 * NEUROVA Demo/Seed Data
 * Realistic data for development so dashboard and progress pages aren't empty.
 */

import type { GameSession, UserStats, CognitiveCategory } from '../types';

function randomBetween(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randomBetween(8, 22), randomBetween(0, 59));
  return d.toISOString();
}

const GAME_IDS = [
  'memory-matrix',
  'signal-switch',
  'rapid-match',
  'logic-chains',
  'orbit-tracker',
  'neural-shift',
  'pattern-forge',
  'echo-recall',
  'number-cascade',
  'route-weaver',
];
const CATEGORIES: CognitiveCategory[] = ['memory', 'attention', 'speed', 'problem-solving', 'spatial'];
const GAME_CATEGORIES: Record<string, CognitiveCategory> = {
  'memory-matrix': 'memory',
  'signal-switch': 'attention',
  'rapid-match': 'speed',
  'logic-chains': 'problem-solving',
  'orbit-tracker': 'spatial',
  'neural-shift': 'memory',
  'pattern-forge': 'problem-solving',
  'echo-recall': 'memory',
  'number-cascade': 'problem-solving',
  'route-weaver': 'spatial',
};

export function generateDemoSessions(count: number = 45): GameSession[] {
  const sessions: GameSession[] = [];

  for (let i = 0; i < count; i++) {
    const daysBack = Math.floor((i / count) * 30);
    const gameId = GAME_IDS[i % GAME_IDS.length];
    const category = GAME_CATEGORIES[gameId];
    const baseDifficulty = Math.min(5, Math.max(1, Math.floor(1 + (i / count) * 3.5)));
    const accuracy = Math.min(1, Math.max(0.4, 0.65 + Math.random() * 0.3 + (i / count) * 0.1));
    const roundsPlayed = randomBetween(8, 20);
    const roundsCorrect = Math.round(roundsPlayed * accuracy);

    sessions.push({
      id: `demo-${i}`,
      gameId,
      category,
      level: Math.floor(1 + (i / count) * 8),
      score: randomBetween(300 + Math.floor((i / count) * 400), 600 + Math.floor((i / count) * 500)),
      accuracy: Math.round(accuracy * 100) / 100,
      streak: randomBetween(2, 8),
      bestStreak: randomBetween(5, 12),
      reactionTimes: Array.from({ length: roundsPlayed }, () => randomBetween(400, 1200)),
      avgReactionTime: randomBetween(500, 1000),
      difficulty: baseDifficulty as 1 | 2 | 3 | 4 | 5,
      roundsPlayed,
      roundsCorrect,
      startedAt: daysAgo(daysBack),
      completedAt: daysAgo(daysBack),
      duration: randomBetween(60000, 240000),
    });
  }

  return sessions.sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
}

export function generateDemoStats(): UserStats {
  return {
    totalSessions: 45,
    totalTrainingTime: 45 * 150000, // ~112 min
    currentStreak: 5,
    longestStreak: 12,
    lastTrainingDate: new Date().toISOString().split('T')[0],
    categoryScores: {
      memory: [680, 710, 740, 780, 800, 820, 780, 840],
      attention: [580, 620, 650, 690, 720, 740, 730, 750],
      speed: [520, 560, 600, 640, 670, 680, 690, 710],
      'problem-solving': [620, 660, 700, 730, 760, 780, 790, 810],
      spatial: [560, 590, 630, 660, 700, 720, 710, 740],
    },
    personalBests: {
      'memory-matrix': 920,
      'signal-switch': 850,
      'rapid-match': 780,
      'logic-chains': 870,
      'orbit-tracker': 810,
      'neural-shift': 760,
      'pattern-forge': 840,
      'echo-recall': 880,
    },
    demoDataActive: true,
  };
}

export function isDemoData(sessionId: string): boolean {
  return sessionId.startsWith('demo-');
}
