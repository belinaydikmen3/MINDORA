/**
 * MINDORA Daily Routine Generator (Daily Routine 2.0)
 * Creates personalized, customizable daily training sessions respecting
 * user preferences, excluded categories, favorite games, and selected duration.
 */

import type { DailyRoutine, DailyRoutineGame, CognitiveCategory } from '../types';
import { getDailyRoutine, saveDailyRoutine, getSettings, getStats } from './storage';
import { GAMES, getGame } from '../data/games';

const CATEGORY_GAME_MAP: Record<CognitiveCategory, string> = {
  memory: 'memory-matrix',
  attention: 'signal-switch',
  speed: 'rapid-match',
  'problem-solving': 'logic-chains',
  spatial: 'orbit-tracker',
};

export function generateDailyRoutine(forceRegenerate = false, customDuration?: number): DailyRoutine {
  const existing = getDailyRoutine();
  if (existing && !forceRegenerate) return existing;

  const settings = getSettings();
  const totalDuration = customDuration || settings.dailyGoal || 12;
  const stats = getStats();
  const excludedCategories = new Set<CognitiveCategory>(settings.excludedCategories || []);

  const allCategories: CognitiveCategory[] = [
    'memory',
    'attention',
    'speed',
    'problem-solving',
    'spatial',
  ];

  // Filter out categories user explicitly excluded
  const eligibleCategories = allCategories.filter((cat) => !excludedCategories.has(cat));
  const activeCategories = eligibleCategories.length > 0 ? eligibleCategories : allCategories;

  // Compute category averages based on recent history
  const categoryStrengths = activeCategories.map((cat) => {
    const scores = stats.categoryScores[cat] || [];
    const avg = scores.length > 0
      ? scores.slice(-5).reduce((a, b) => a + b, 0) / Math.min(scores.length, 5)
      : 50;
    return { category: cat, score: avg };
  });

  categoryStrengths.sort((a, b) => a.score - b.score);

  const games: DailyRoutineGame[] = [];
  const gamesPerRoutine = totalDuration <= 6 ? 2 : totalDuration <= 12 ? 3 : 4;
  const perGameDuration = Math.max(2, Math.round(totalDuration / gamesPerRoutine));

  // If user has favorite games that fit eligible categories, prioritize at least one
  const eligibleFavorites = settings.favoriteGameIds
    .map(getGame)
    .filter((g): g is NonNullable<typeof g> => Boolean(g && !excludedCategories.has(g.category)));

  if (eligibleFavorites.length > 0) {
    const chosenFavorite = eligibleFavorites[0];
    games.push({
      gameId: chosenFavorite.id,
      category: chosenFavorite.category,
      duration: perGameDuration,
      completed: false,
    });
  }

  // Next prioritize signature game Neural Shift if not already added and memory isn't excluded
  if (!games.some((g) => g.gameId === 'neural-shift') && !excludedCategories.has('memory') && games.length < gamesPerRoutine) {
    games.push({
      gameId: 'neural-shift',
      category: 'memory',
      duration: perGameDuration,
      completed: false,
    });
  }

  // Fill remaining slots with weakest categories
  for (const { category } of categoryStrengths) {
    if (games.length >= gamesPerRoutine) break;
    const defaultGameId = CATEGORY_GAME_MAP[category];
    if (defaultGameId && !games.some((g) => g.gameId === defaultGameId)) {
      games.push({
        gameId: defaultGameId,
        category,
        duration: perGameDuration,
        completed: false,
      });
    }
  }

  // Fallback guarantee: if still empty, push at least one valid game
  if (games.length === 0) {
    const fallback = GAMES[0];
    games.push({
      gameId: fallback.id,
      category: fallback.category,
      duration: totalDuration,
      completed: false,
    });
  }

  const routine: DailyRoutine = {
    date: new Date().toISOString().split('T')[0],
    games,
    totalDuration: games.reduce((sum, g) => sum + g.duration, 0),
    completed: false,
  };

  saveDailyRoutine(routine);
  return routine;
}

export function replaceRoutineGame(index: number, newGameId: string): DailyRoutine | null {
  const routine = getDailyRoutine();
  if (!routine || index < 0 || index >= routine.games.length) return null;
  const gameDef = getGame(newGameId);
  if (!gameDef) return routine;

  routine.games[index] = {
    gameId: newGameId,
    category: gameDef.category,
    duration: routine.games[index].duration,
    completed: routine.games[index].completed,
  };
  routine.completed = routine.games.every((g) => g.completed);
  saveDailyRoutine(routine);
  return routine;
}

export function removeRoutineGame(index: number): DailyRoutine | null {
  const routine = getDailyRoutine();
  if (!routine || routine.games.length <= 1) return null; // keep at least 1 game

  routine.games.splice(index, 1);
  routine.totalDuration = routine.games.reduce((sum, g) => sum + g.duration, 0);
  routine.completed = routine.games.every((g) => g.completed);
  saveDailyRoutine(routine);
  return routine;
}

export function addRoutineGame(gameId: string, duration = 3): DailyRoutine | null {
  const routine = getDailyRoutine() || generateDailyRoutine();
  const gameDef = getGame(gameId);
  if (!gameDef) return routine;

  routine.games.push({
    gameId,
    category: gameDef.category,
    duration,
    completed: false,
  });
  routine.totalDuration = routine.games.reduce((sum, g) => sum + g.duration, 0);
  routine.completed = routine.games.every((g) => g.completed);
  saveDailyRoutine(routine);
  return routine;
}

export function markRoutineGameComplete(gameId: string): DailyRoutine | null {
  const routine = getDailyRoutine();
  if (!routine) return null;

  const game = routine.games.find((g) => g.gameId === gameId && !g.completed);
  if (game) {
    game.completed = true;
  }

  routine.completed = routine.games.every((g) => g.completed);
  if (routine.completed && !routine.completedAt) {
    routine.completedAt = new Date().toISOString();
  }

  saveDailyRoutine(routine);
  return routine;
}

export function getRoutineProgress(): { completed: number; total: number; percentage: number } {
  const routine = getDailyRoutine();
  if (!routine) return { completed: 0, total: 0, percentage: 0 };

  const completed = routine.games.filter((g) => g.completed).length;
  const total = routine.games.length;
  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
