/**
 * NEUROVA Data Persistence Service
 * Clean abstraction over localStorage for all app data.
 */

const STORAGE_PREFIX = 'neurova_';

const KEYS = {
  USER: `${STORAGE_PREFIX}user`,
  SETTINGS: `${STORAGE_PREFIX}settings`,
  SESSIONS: `${STORAGE_PREFIX}sessions`,
  STATS: `${STORAGE_PREFIX}stats`,
  DAILY_ROUTINE: `${STORAGE_PREFIX}daily_routine`,
  ACHIEVEMENTS: `${STORAGE_PREFIX}achievements`,
  ADAPTIVE: `${STORAGE_PREFIX}adaptive`,
  ONBOARDING: `${STORAGE_PREFIX}onboarding_complete`,
} as const;

function get<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`Failed to parse storage key: ${key}`);
    return null;
  }
}

function set<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to write storage key: ${key}`, e);
  }
}

function remove(key: string): void {
  localStorage.removeItem(key);
}

// ─── User ───────────────────────────────────────────────────

import type {
  UserProfile,
  UserSettings,
  UserStats,
  GameSession,
  DailyRoutine,
  Achievement,
  AdaptiveState,
  CognitiveCategory,
} from '../types';

export function getUser(): UserProfile | null {
  return get<UserProfile>(KEYS.USER);
}

export function saveUser(user: UserProfile): void {
  set(KEYS.USER, user);
}

// ─── Settings ───────────────────────────────────────────────

const DEFAULT_SETTINGS: UserSettings = {
  soundEnabled: true,
  soundVolume: 0.5,
  reducedMotion: false,
  animationIntensity: 'full',
  theme: 'light',
  dailyGoal: 12,
  notifications: false,
  reminderTime: '09:00',
  favoriteGameIds: ['neural-shift', 'memory-matrix'],
  excludedCategories: [],
};

export function getSettings(): UserSettings {
  const stored = get<Partial<UserSettings>>(KEYS.SETTINGS);
  if (!stored) return { ...DEFAULT_SETTINGS };
  // Merge defaults to ensure all fields exist seamlessly for existing users
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    favoriteGameIds: stored.favoriteGameIds ?? DEFAULT_SETTINGS.favoriteGameIds,
    excludedCategories: stored.excludedCategories ?? [],
    animationIntensity: stored.animationIntensity ?? 'full',
    reminderTime: stored.reminderTime ?? '09:00',
  };
}

export function saveSettings(settings: UserSettings): void {
  set(KEYS.SETTINGS, settings);
}

export function toggleFavoriteGame(gameId: string): boolean {
  const settings = getSettings();
  const exists = settings.favoriteGameIds.includes(gameId);
  const updatedFavorites = exists
    ? settings.favoriteGameIds.filter((id) => id !== gameId)
    : [...settings.favoriteGameIds, gameId];
  saveSettings({ ...settings, favoriteGameIds: updatedFavorites });
  return !exists;
}

export function isFavoriteGame(gameId: string): boolean {
  return getSettings().favoriteGameIds.includes(gameId);
}

// ─── Game Sessions ──────────────────────────────────────────

export function getSessions(): GameSession[] {
  return get<GameSession[]>(KEYS.SESSIONS) ?? [];
}

export function saveSession(session: GameSession): void {
  const sessions = getSessions();
  sessions.push(session);
  set(KEYS.SESSIONS, sessions);
}

export function getSessionsByGame(gameId: string): GameSession[] {
  return getSessions().filter((s) => s.gameId === gameId);
}

export function getSessionsByCategory(category: CognitiveCategory): GameSession[] {
  return getSessions().filter((s) => s.category === category);
}

export function getRecentSessions(count: number): GameSession[] {
  const sessions = getSessions();
  return sessions
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, count);
}

export function getSessionsInRange(startDate: string, endDate: string): GameSession[] {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return getSessions().filter((s) => {
    const t = new Date(s.completedAt).getTime();
    return t >= start && t <= end;
  });
}

// ─── Stats ──────────────────────────────────────────────────

const DEFAULT_STATS: UserStats = {
  totalSessions: 0,
  totalTrainingTime: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastTrainingDate: '',
  categoryScores: {
    memory: [],
    attention: [],
    speed: [],
    'problem-solving': [],
    spatial: [],
  },
  personalBests: {},
};

export function getStats(): UserStats {
  const stats = get<UserStats>(KEYS.STATS) ?? { ...DEFAULT_STATS };
  
  // Safe streak evaluation on read: if last training was earlier than yesterday, streak is broken
  if (stats.lastTrainingDate) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (stats.lastTrainingDate < yesterday) {
      if (stats.currentStreak !== 0) {
        stats.currentStreak = 0;
        set(KEYS.STATS, stats);
      }
    }
  }

  // Ensure all category score arrays exist
  stats.categoryScores = {
    memory: stats.categoryScores?.memory || [],
    attention: stats.categoryScores?.attention || [],
    speed: stats.categoryScores?.speed || [],
    'problem-solving': stats.categoryScores?.['problem-solving'] || [],
    spatial: stats.categoryScores?.spatial || [],
  };
  stats.personalBests = stats.personalBests || {};

  return stats;
}

export function saveStats(stats: UserStats): void {
  set(KEYS.STATS, stats);
}

export function updateStatsAfterSession(session: GameSession): void {
  const stats = getStats();
  stats.totalSessions += 1;
  stats.totalTrainingTime += session.duration;

  // Update category scores
  if (!stats.categoryScores[session.category]) {
    stats.categoryScores[session.category] = [];
  }
  stats.categoryScores[session.category].push(session.score);

  // Keep only last 50 scores per category
  if (stats.categoryScores[session.category].length > 50) {
    stats.categoryScores[session.category] = stats.categoryScores[session.category].slice(-50);
  }

  // Personal bests
  const currentBest = stats.personalBests[session.gameId] ?? 0;
  if (session.score > currentBest) {
    stats.personalBests[session.gameId] = session.score;
  }

  // Streak calculation based on session date
  const sessionDate = session.completedAt ? new Date(session.completedAt) : new Date();
  const sessionDateStr = sessionDate.toISOString().split('T')[0];

  const prevDate = new Date(sessionDate.getTime() - 86400000);
  const prevDateStr = prevDate.toISOString().split('T')[0];

  if (stats.lastTrainingDate === sessionDateStr) {
    // Same day: streak already recorded for this day
  } else if (stats.lastTrainingDate === prevDateStr) {
    // Consecutive day: advance streak
    stats.currentStreak += 1;
  } else {
    // First session ever or broke streak
    stats.currentStreak = 1;
  }

  stats.lastTrainingDate = sessionDateStr;
  stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);

  saveStats(stats);
}

// ─── Daily Routine ──────────────────────────────────────────

export function getDailyRoutine(): DailyRoutine | null {
  const routine = get<DailyRoutine>(KEYS.DAILY_ROUTINE);
  if (!routine) return null;
  const today = new Date().toISOString().split('T')[0];
  if (routine.date !== today) return null;
  return routine;
}

export function saveDailyRoutine(routine: DailyRoutine): void {
  set(KEYS.DAILY_ROUTINE, routine);
}

// ─── Achievements ───────────────────────────────────────────

export function getAchievements(): Achievement[] {
  return get<Achievement[]>(KEYS.ACHIEVEMENTS) ?? [];
}

export function saveAchievements(achievements: Achievement[]): void {
  set(KEYS.ACHIEVEMENTS, achievements);
}

export function unlockAchievement(id: string): Achievement | null {
  const achievements = getAchievements();
  const a = achievements.find((ach) => ach.id === id);
  if (a && !a.unlockedAt) {
    a.unlockedAt = new Date().toISOString();
    saveAchievements(achievements);
    return a;
  }
  return null;
}

// ─── Adaptive State ─────────────────────────────────────────

export function getAdaptiveState(category: CognitiveCategory): AdaptiveState | null {
  const states = get<Record<CognitiveCategory, AdaptiveState>>(KEYS.ADAPTIVE);
  return states?.[category] ?? null;
}

export function saveAdaptiveState(state: AdaptiveState): void {
  const states = get<Record<CognitiveCategory, AdaptiveState>>(KEYS.ADAPTIVE) ?? ({} as Record<CognitiveCategory, AdaptiveState>);
  states[state.category] = state;
  set(KEYS.ADAPTIVE, states);
}

// ─── Onboarding ─────────────────────────────────────────────

export function isOnboardingComplete(): boolean {
  return get<boolean>(KEYS.ONBOARDING) ?? false;
}

export function setOnboardingComplete(): void {
  set(KEYS.ONBOARDING, true);
}

// ─── Clear All ──────────────────────────────────────────────

export function clearAllData(): void {
  Object.values(KEYS).forEach(remove);
}

export function clearDemoData(): void {
  // If demo data was seeded, remove sessions and reset stats while preserving user profile & preferences
  remove(KEYS.SESSIONS);
  const resetStats: UserStats = {
    totalSessions: 0,
    totalTrainingTime: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastTrainingDate: '',
    categoryScores: {
      memory: [],
      attention: [],
      speed: [],
      'problem-solving': [],
      spatial: [],
    },
    personalBests: {},
    demoDataActive: false,
  };
  set(KEYS.STATS, resetStats);
  remove(KEYS.DAILY_ROUTINE);
}

// ─── Export for Testing ─────────────────────────────────────

export const STORAGE_KEYS = KEYS;
