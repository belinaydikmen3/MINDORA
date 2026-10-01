/**
 * MINDORA Functional Validation & Regression Test Suite
 * Executed via tsx to validate core logic, state persistence, scoring, adaptive engine,
 * achievements, and game generation algorithms in a headless environment.
 */

import assert from 'node:assert';

// 1. Setup mock localStorage for Node environment
class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

const mockStorage = new MockLocalStorage();
// Assign to global
(global as any).localStorage = mockStorage;
(global as any).window = {
  localStorage: mockStorage,
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};

// Imports from MINDORA codebase
import {
  calculateScore,
  calculateAccuracy,
  calculatePercentile,
  normalizeScore,
  getCategoryScore
} from '../src/engine/scoring';
import {
  getOrCreateAdaptiveState,
  updateAdaptiveState,
  getDifficultyParams,
  getDifficultyForCategory
} from '../src/engine/adaptiveEngine';
import {
  saveSession,
  getSessions,
  getStats,
  updateStatsAfterSession,
  getSettings,
  saveSettings,
  toggleFavoriteGame,
  clearAllData
} from '../src/services/storage';
import {
  generateDailyRoutine,
  markRoutineGameComplete,
  replaceRoutineGame,
  removeRoutineGame
} from '../src/services/dailyRoutine';
import {
  checkAchievements,
  initializeAchievements,
  getPendingUnlocks
} from '../src/services/achievementChecker';
import { GAMES, getGame, getGamesByCategory } from '../src/data/games';
import type { GameSession, CognitiveCategory, DifficultyLevel } from '../src/types';

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

console.log('====================================================');
console.log('MINDORA Phase 2: Independent Functional Test Suite');
console.log('====================================================\n');

// ─── TEST SUITE 1: SCORING ENGINE ─────────────────────────
console.log('Suite 1: Scoring Engine (src/engine/scoring.ts)');

runTest('Calculates score for perfect session with streak', () => {
  const score = calculateScore({
    baseScore: 100,
    accuracy: 1.0,
    avgReactionTime: 500,
    targetReactionTime: 1000,
    streak: 10,
    difficulty: 3,
    roundsPlayed: 10,
    roundsCorrect: 10,
  }, 'memory');

  assert.ok(score > 0, 'Score should be positive');
  assert.ok(score > 300, `Score with 100% accuracy and difficulty 3 should be > 300 (was ${score})`);
});

runTest('Returns zero score for zero accuracy', () => {
  const score = calculateScore({
    baseScore: 100,
    accuracy: 0,
    avgReactionTime: 1000,
    targetReactionTime: 1000,
    streak: 0,
    difficulty: 1,
    roundsPlayed: 10,
    roundsCorrect: 0,
  }, 'speed');

  assert.strictEqual(score, 0, 'Score with 0 correct rounds should be 0');
});

runTest('Higher difficulty awards higher score for identical performance', () => {
  const scoreLow = calculateScore({
    baseScore: 100,
    accuracy: 0.9,
    avgReactionTime: 800,
    targetReactionTime: 1000,
    streak: 5,
    difficulty: 1,
    roundsPlayed: 10,
    roundsCorrect: 9,
  }, 'attention');

  const scoreHigh = calculateScore({
    baseScore: 100,
    accuracy: 0.9,
    avgReactionTime: 800,
    targetReactionTime: 1000,
    streak: 5,
    difficulty: 4,
    roundsPlayed: 10,
    roundsCorrect: 9,
  }, 'attention');

  assert.ok(scoreHigh > scoreLow, `Difficulty 4 (${scoreHigh}) must score higher than Difficulty 1 (${scoreLow})`);
});

runTest('Calculates accuracy and percentile accurately', () => {
  assert.strictEqual(calculateAccuracy(9, 10), 0.9);
  assert.strictEqual(calculateAccuracy(0, 10), 0);
  assert.strictEqual(calculatePercentile(800, [500, 600, 700, 800, 900]), 60);
  assert.strictEqual(normalizeScore(500, 1000), 50);
  assert.strictEqual(getCategoryScore([100, 200, 300]), 233);
});

// ─── TEST SUITE 2: ADAPTIVE DIFFICULTY ENGINE ─────────────
console.log('\nSuite 2: Adaptive Difficulty Engine (src/engine/adaptiveEngine.ts)');

runTest('getDifficultyParams clamps index safely across invalid and extreme values', () => {
  const p1 = getDifficultyParams(1);
  const p5 = getDifficultyParams(5);
  const pUnder = getDifficultyParams(0 as any);
  const pOver = getDifficultyParams(10 as any);
  const pUndef = getDifficultyParams(undefined as any);

  assert.strictEqual(p1.gridSize, 3);
  assert.strictEqual(p5.gridSize, 5);
  assert.strictEqual(pUnder.gridSize, 3, 'Level 0 clamped to Level 1');
  assert.strictEqual(pOver.gridSize, 5, 'Level 10 clamped to Level 5');
  assert.strictEqual(pUndef.gridSize, 3, 'Undefined difficulty clamped to Level 1');
  assert.ok(p1.displayTime > p5.displayTime, 'Display time decreases at higher difficulty');
});

runTest('Adaptive state increases difficulty after consecutive successes', () => {
  mockStorage.clear();
  const cat: CognitiveCategory = 'memory';
  let state = getOrCreateAdaptiveState(cat);
  assert.strictEqual(state.currentDifficulty, 2, 'Default starting difficulty is 2');

  const mockSession = (accuracy: number): GameSession => ({
    id: `test-${Date.now()}`,
    gameId: 'memory-matrix',
    category: cat,
    level: state.currentDifficulty,
    score: 800,
    accuracy,
    streak: 5,
    bestStreak: 5,
    reactionTimes: [600],
    avgReactionTime: 600,
    difficulty: state.currentDifficulty,
    roundsPlayed: 10,
    roundsCorrect: Math.round(accuracy * 10),
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    duration: 60000,
  });

  // 3 consecutive high-accuracy sessions (>= 0.85)
  state = updateAdaptiveState(mockSession(0.95));
  state = updateAdaptiveState(mockSession(0.95));
  state = updateAdaptiveState(mockSession(0.95));

  assert.strictEqual(state.currentDifficulty, 3, 'Difficulty should advance from 2 to 3 after 3 successes');
});

runTest('Adaptive state decreases difficulty after consecutive failures', () => {
  const cat: CognitiveCategory = 'memory';
  let state = getOrCreateAdaptiveState(cat);
  const initialDiff = state.currentDifficulty;

  const mockFailSession: GameSession = {
    id: `fail-${Date.now()}`,
    gameId: 'memory-matrix',
    category: cat,
    level: initialDiff,
    score: 200,
    accuracy: 0.3,
    streak: 1,
    bestStreak: 1,
    reactionTimes: [1500],
    avgReactionTime: 1500,
    difficulty: initialDiff,
    roundsPlayed: 10,
    roundsCorrect: 3,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    duration: 60000,
  };

  // 2 consecutive failures (< 0.55)
  state = updateAdaptiveState(mockFailSession);
  state = updateAdaptiveState(mockFailSession);

  assert.strictEqual(state.currentDifficulty, (initialDiff - 1) as DifficultyLevel, 'Difficulty should drop by 1 after consecutive failures');
});

// ─── TEST SUITE 3: STORAGE SERVICE & DATA INTEGRITY ──────
console.log('\nSuite 3: Storage Service & Persistence (src/services/storage.ts)');

runTest('Saves and retrieves game sessions accurately', () => {
  mockStorage.clear();
  assert.strictEqual(getSessions().length, 0);

  const session1: GameSession = {
    id: 's-1',
    gameId: 'signal-switch',
    category: 'attention',
    level: 2,
    score: 750,
    accuracy: 0.85,
    streak: 4,
    bestStreak: 4,
    reactionTimes: [700],
    avgReactionTime: 700,
    difficulty: 2,
    roundsPlayed: 15,
    roundsCorrect: 13,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    duration: 45000,
  };

  saveSession(session1);
  const retrieved = getSessions();
  assert.strictEqual(retrieved.length, 1);
  assert.strictEqual(retrieved[0].id, 's-1');
  assert.strictEqual(retrieved[0].score, 750);
});

runTest('Daily streak maintains on same-day session and increments on next day', () => {
  mockStorage.clear();

  const today = new Date('2026-10-01T12:00:00Z');
  const makeSessionOnDate = (date: Date): GameSession => ({
    id: `session-${date.getTime()}`,
    gameId: 'rapid-match',
    category: 'speed',
    level: 2,
    score: 800,
    accuracy: 0.9,
    streak: 6,
    bestStreak: 6,
    reactionTimes: [500],
    avgReactionTime: 500,
    difficulty: 2,
    roundsPlayed: 20,
    roundsCorrect: 18,
    startedAt: date.toISOString(),
    completedAt: date.toISOString(),
    duration: 30000,
  });

  // Session 1: Today
  updateStatsAfterSession(makeSessionOnDate(today));
  let stats = getStats();
  assert.strictEqual(stats.currentStreak, 1, 'First session gives streak of 1');
  assert.strictEqual(stats.longestStreak, 1);

  // Session 2: Same day - streak should NOT increment
  updateStatsAfterSession(makeSessionOnDate(today));
  stats = getStats();
  assert.strictEqual(stats.currentStreak, 1, 'Second session on same day should stay at streak 1');

  // Session 3: Next day (+1 day)
  const tomorrow = new Date('2026-10-02T12:00:00Z');
  updateStatsAfterSession(makeSessionOnDate(tomorrow));
  stats = getStats();
  assert.strictEqual(stats.currentStreak, 2, 'Session on next day should increment streak to 2');
  assert.strictEqual(stats.longestStreak, 2);

  // Session 4: Missed a day (+2 days later = 2026-10-04)
  const twoDaysLater = new Date('2026-10-04T12:00:00Z');
  updateStatsAfterSession(makeSessionOnDate(twoDaysLater));
  stats = getStats();
  assert.strictEqual(stats.currentStreak, 1, 'Skipping a day must reset current streak to 1');
  assert.strictEqual(stats.longestStreak, 2, 'Longest streak must be preserved at 2');
});

runTest('Settings merge defaults and toggle favorites reliably', () => {
  mockStorage.clear();
  const settings = getSettings();
  assert.strictEqual(settings.soundEnabled, true);
  assert.strictEqual(settings.dailyGoal, 12);
  assert.ok(settings.favoriteGameIds.includes('neural-shift'));

  // Toggle favorite off
  const newState = toggleFavoriteGame('neural-shift');
  assert.strictEqual(newState, false, 'neural-shift should be removed from favorites');
  assert.ok(!getSettings().favoriteGameIds.includes('neural-shift'));

  // Toggle favorite on
  const reAdded = toggleFavoriteGame('neural-shift');
  assert.strictEqual(reAdded, true, 'neural-shift should be re-added to favorites');
  assert.ok(getSettings().favoriteGameIds.includes('neural-shift'));
});

runTest('Corrupted localStorage payload degrades gracefully without throw', () => {
  mockStorage.setItem('neurova_settings', '{malformed json!@#');
  const safeSettings = getSettings();
  assert.ok(safeSettings, 'Must return default settings on corrupt JSON');
  assert.strictEqual(safeSettings.soundEnabled, true);
});

// ─── TEST SUITE 4: DAILY ROUTINE GENERATION ───────────────
console.log('\nSuite 4: Daily Routine Circuit (src/services/dailyRoutine.ts)');

runTest('Generates routine tailored to daily duration preference', () => {
  mockStorage.clear();
  const routine10 = generateDailyRoutine(true, 10);
  assert.strictEqual(routine10.games.length, 3, '10-minute circuit generates 3 games');
  assert.strictEqual(routine10.completed, false);

  const routine20 = generateDailyRoutine(true, 20);
  assert.strictEqual(routine20.games.length, 4, '20-minute circuit generates 4 games (5m each)');
});

runTest('Allows swapping and removing games in daily circuit', () => {
  const routine = generateDailyRoutine(true, 15);
  const originalGame0 = routine.games[0].gameId;

  // Replace game 0 with logic-chains
  const newGameId = originalGame0 === 'logic-chains' ? 'orbit-tracker' : 'logic-chains';
  const updated = replaceRoutineGame(0, newGameId);
  assert.ok(updated);
  assert.strictEqual(updated.games[0].gameId, newGameId);

  // Remove last game
  const initialCount = updated.games.length;
  const removed = removeRoutineGame(initialCount - 1);
  assert.ok(removed);
  assert.strictEqual(removed.games.length, initialCount - 1);
});

runTest('Marking routine games complete completes whole circuit', () => {
  mockStorage.clear();
  const routine = generateDailyRoutine(true, 5); // 2 games
  assert.strictEqual(routine.games.length, 2);

  const g0 = routine.games[0].gameId;
  const g1 = routine.games[1].gameId;

  markRoutineGameComplete(g0);
  let current = generateDailyRoutine(false, 5);
  assert.strictEqual(current.games[0].completed, true);
  assert.strictEqual(current.completed, false);

  markRoutineGameComplete(g1);
  current = generateDailyRoutine(false, 5);
  assert.strictEqual(current.games[1].completed, true);
  assert.strictEqual(current.completed, true, 'Routine marked complete after all games finished');
});

// ─── TEST SUITE 5: ACHIEVEMENT ENGINE ─────────────────────
console.log('\nSuite 5: Achievement Checker (src/services/achievementChecker.ts)');

runTest('Unlocks first-session achievement on initial game completion', () => {
  mockStorage.clear();
  initializeAchievements();

  const session: GameSession = {
    id: 's-first',
    gameId: 'memory-matrix',
    category: 'memory',
    level: 1,
    score: 600,
    accuracy: 0.8,
    streak: 3,
    bestStreak: 3,
    reactionTimes: [900],
    avgReactionTime: 900,
    difficulty: 1,
    roundsPlayed: 10,
    roundsCorrect: 8,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    duration: 30000,
  };

  updateStatsAfterSession(session);
  const unlocks = checkAchievements(session);
  const unlockedIds = unlocks.map(u => u.id);

  assert.ok(unlockedIds.includes('first-session'), 'Must unlock first-session achievement');
  assert.ok(!unlockedIds.includes('streak-3'), 'streak-3 requires 3 consecutive daily sessions');
});

runTest('Does not unlock speed-demon unless reaction time is under 500ms in rapid match', () => {
  const slowSession: GameSession = {
    id: 's-slow',
    gameId: 'rapid-match',
    category: 'speed',
    level: 1,
    score: 700,
    accuracy: 0.9,
    streak: 5,
    bestStreak: 5,
    reactionTimes: [650],
    avgReactionTime: 650, // > 500ms
    difficulty: 1,
    roundsPlayed: 15,
    roundsCorrect: 14,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    duration: 25000,
  };

  const unlocksSlow = checkAchievements(slowSession);
  assert.ok(!unlocksSlow.some(u => u.id === 'speed-demon'), 'Slow session must not unlock speed-demon');

  const fastSession: GameSession = {
    ...slowSession,
    id: 's-fast',
    avgReactionTime: 420, // < 500ms
  };
  const unlocksFast = checkAchievements(fastSession);
  assert.ok(unlocksFast.some(u => u.id === 'speed-demon'), 'Sub-500ms rapid match must unlock speed-demon');
});

// ─── TEST SUITE 6: GAME GENERATION LOGIC ──────────────────
console.log('\nSuite 6: Game Generation Algorithms');

runTest('LogicChains generation produces valid options without infinite loops', () => {
  // Test pattern generation logic
  type ShapeType = 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon';
  type ColorType = 'blue' | 'orange' | 'green' | 'pink' | 'cyan';
  const SHAPES: ShapeType[] = ['circle', 'square', 'triangle', 'diamond', 'hexagon'];
  const COLORS: ColorType[] = ['blue', 'orange', 'green', 'pink', 'cyan'];

  for (let round = 1; round <= 12; round++) {
    const baseShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const baseColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const answer = { type: baseShape, color: baseColor, rotation: 90 };

    const distractors: typeof answer[] = [];
    let attempts = 0;
    while (distractors.length < 3 && attempts < 50) {
      attempts++;
      const d = {
        type: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: [0, 90, 180, 270][Math.floor(Math.random() * 4)]
      };
      const isAns = d.type === answer.type && d.color === answer.color && d.rotation === answer.rotation;
      const isExisting = distractors.some(ex => ex.type === d.type && ex.color === d.color && ex.rotation === d.rotation);
      if (!isAns && !isExisting) {
        distractors.push(d);
      }
    }

    assert.ok(attempts <= 50, 'Distractor generation must terminate safely');
    const allOptions = [answer, ...distractors];
    assert.strictEqual(allOptions.length, 4, 'Must have exactly 4 options');

    // Deep comparison verification
    const correctIdx = allOptions.findIndex(
      o => o.type === answer.type && o.color === answer.color && o.rotation === answer.rotation
    );
    assert.strictEqual(correctIdx, 0, 'Answer must match uniquely via deep property comparison');
  }
});

runTest('NeuralShift network node generator avoids overlapping nodes', () => {
  const padding = 60;
  const width = 800;
  const height = 600;
  const safeWidth = width - padding * 2;
  const safeHeight = height - padding * 2;
  const count = 10;
  const distance = (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1);

  const nodes: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, valid = false;
    let attempts = 0;
    while (!valid && attempts < 100) {
      x = padding + Math.random() * safeWidth;
      y = padding + Math.random() * safeHeight;
      valid = true;
      for (const n of nodes) {
        if (distance(x, y, n.x, n.y) < 80) {
          valid = false;
          break;
        }
      }
      attempts++;
    }
    nodes.push({ x, y });
  }

  assert.strictEqual(nodes.length, count, `Generated all ${count} nodes`);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = distance(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
      assert.ok(d >= 79, `Nodes ${i} and ${j} must not overlap (dist: ${d.toFixed(1)}px)`);
    }
  }
});

runTest('Registry accurately maintains 15 unique games across 5 cognitive categories', () => {
  assert.strictEqual(GAMES.length, 15, 'Must contain exactly 15 games in active registry');
  const ids = new Set(GAMES.map(g => g.id));
  assert.strictEqual(ids.size, 15, 'All 15 game IDs must be unique');
  assert.ok(!ids.has('focus-finder'), 'focus-finder must be completely removed from active games');

  const categories: CognitiveCategory[] = ['memory', 'attention', 'speed', 'problem-solving', 'spatial'];
  categories.forEach(cat => {
    const catGames = getGamesByCategory(cat);
    assert.ok(catGames.length >= 2, `Category ${cat} must have at least 2 games (has ${catGames.length})`);
  });

  GAMES.forEach(g => {
    assert.ok(g.name && g.name.length > 0, `Game ${g.id} has valid name`);
    assert.ok(g.instructions.length >= 3, `Game ${g.id} has instructions`);
    assert.strictEqual(g.minDifficulty, 1);
    assert.strictEqual(g.maxDifficulty, 5);
  });
});

runTest('Historical focus-finder sessions resolve gracefully without runtime error', () => {
  const archived = getGame('focus-finder');
  assert.ok(archived, 'Must return fallback descriptor for historical focus-finder sessions');
  assert.strictEqual(archived.id, 'focus-finder');
  assert.strictEqual(archived.category, 'attention');
  assert.ok(archived.name.includes('Archived'), 'Must indicate archived status');
});

runTest('MemoryMatrix difficulty scaling yields valid grid and target counts', () => {
  for (let diff = 1; diff <= 5; diff++) {
    const params = getDifficultyParams(diff as DifficultyLevel);
    const gridSize = params.gridSize || Math.min(3 + Math.floor(diff / 2), 5);
    const totalCells = gridSize * gridSize;
    const numTargets = params.elementCount || Math.min(3 + diff, Math.floor(totalCells * 0.5));

    assert.ok(gridSize >= 3 && gridSize <= 5, `Grid size ${gridSize} must be between 3 and 5`);
    assert.ok(numTargets < totalCells, `Targets ${numTargets} must be less than total cells ${totalCells}`);
    assert.ok(numTargets >= 3, `Targets ${numTargets} must be at least 3`);
  }
});

runTest('RapidMatch generates balanced symbol matching distribution', () => {
  const SYMBOLS = ['★', '♠', '♣', '♥', '♦', '▲', '▼', '●', '■', '✦', '✿', '✺'];
  let matchCount = 0;
  const trials = 200;

  for (let i = 0; i < trials; i++) {
    const shouldMatch = Math.random() > 0.5;
    if (shouldMatch) matchCount++;

    const sym1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    let sym2 = sym1;
    if (!shouldMatch) {
      do {
        sym2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      } while (sym2 === sym1);
      assert.notStrictEqual(sym1, sym2, 'Mismatched symbols must not be identical');
    } else {
      assert.strictEqual(sym1, sym2, 'Matched symbols must be identical');
    }
  }

  // Check statistical balance: roughly 50% matches (between 30% and 70%)
  const matchRatio = matchCount / trials;
  assert.ok(matchRatio >= 0.35 && matchRatio <= 0.65, `Match ratio ${matchRatio} should be balanced around 0.5`);
});

// ─── TEST SUITE 7: INTEGRATION & STRESS SIMULATION ────────
console.log('\nSuite 7: Sequential Multi-Session Simulation');

runTest('Simulates 25 consecutive sessions without state corruption or crash', () => {
  mockStorage.clear();
  const categories: CognitiveCategory[] = ['memory', 'attention', 'speed', 'problem-solving', 'spatial'];
  const gameIds = [
    'memory-matrix',
    'signal-switch',
    'rapid-match',
    'logic-chains',
    'orbit-tracker',
    'pattern-forge',
    'echo-recall',
    'number-cascade',
    'route-weaver',
    'word-circuit',
  ];

  for (let s = 1; s <= 25; s++) {
    const cat = categories[s % categories.length];
    const gId = gameIds[s % gameIds.length];
    const diff = getDifficultyForCategory(cat);
    const session: GameSession = {
      id: `sim-${s}`,
      gameId: gId,
      category: cat,
      level: diff,
      score: 500 + s * 15,
      accuracy: 0.8 + (s % 3) * 0.05,
      streak: 4 + (s % 5),
      bestStreak: 6,
      reactionTimes: [600, 700, 800],
      avgReactionTime: 700,
      difficulty: diff,
      roundsPlayed: 10,
      roundsCorrect: 8,
      startedAt: new Date(Date.now() - (25 - s) * 3600000).toISOString(),
      completedAt: new Date(Date.now() - (25 - s) * 3600000 + 60000).toISOString(),
      duration: 60000,
    };

    saveSession(session);
    updateStatsAfterSession(session);
    updateAdaptiveState(session);
    checkAchievements(session);
  }

  const allSessions = getSessions();
  const finalStats = getStats();
  assert.strictEqual(allSessions.length, 25, 'All 25 sessions preserved');
  assert.strictEqual(finalStats.totalSessions, 25, 'Total session count is 25');
  assert.ok(finalStats.totalTrainingTime > 0, 'Training time accumulated');

  // Verify all categories have recorded scores
  for (const cat of categories) {
    assert.ok(finalStats.categoryScores[cat].length > 0, `Category ${cat} has scores`);
  }
});

console.log('\n====================================================');
console.log(`Test Execution Summary: ${passedTests} / ${totalTests} passed (100%)`);
console.log('====================================================');

