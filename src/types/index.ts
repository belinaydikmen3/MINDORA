// ─── Core Types ─────────────────────────────────────────────

export type CognitiveCategory = 'memory' | 'attention' | 'speed' | 'problem-solving' | 'spatial';

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  1: 'Beginner',
  2: 'Easy',
  3: 'Medium',
  4: 'Hard',
  5: 'Expert',
};

export const CATEGORY_LABELS: Record<CognitiveCategory, string> = {
  memory: 'Memory',
  attention: 'Attention',
  speed: 'Speed',
  'problem-solving': 'Problem Solving',
  spatial: 'Spatial',
};

export const CATEGORY_COLORS: Record<CognitiveCategory, string> = {
  memory: '#845ef7',
  attention: '#ff922b',
  speed: '#22b8cf',
  'problem-solving': '#51cf66',
  spatial: '#f06595',
};

export const CATEGORY_ICONS: Record<CognitiveCategory, string> = {
  memory: '🧠',
  attention: '🎯',
  speed: '⚡',
  'problem-solving': '🧩',
  spatial: '🔮',
};

// ─── Game Types ─────────────────────────────────────────────

export type GameState = 'idle' | 'intro' | 'countdown' | 'playing' | 'paused' | 'success' | 'failure' | 'gameover' | 'results';

export interface GameConfig {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  category: CognitiveCategory;
  icon: string;
  color: string;
  minDifficulty: DifficultyLevel;
  maxDifficulty: DifficultyLevel;
  estimatedTime: number; // minutes
  instructions: string[];
}

export interface GameSession {
  id: string;
  gameId: string;
  category: CognitiveCategory;
  level: number;
  score: number;
  accuracy: number;
  streak: number;
  bestStreak: number;
  reactionTimes: number[];
  avgReactionTime: number;
  difficulty: DifficultyLevel;
  roundsPlayed: number;
  roundsCorrect: number;
  startedAt: string;
  completedAt: string;
  duration: number; // ms
}

export interface GameResult {
  session: GameSession;
  personalBest: boolean;
  personalBestDelta?: number;
  categoryScores?: Record<string, number>;
  suggestedNext?: string;
  strongestArea?: string;
}

// ─── User Types ─────────────────────────────────────────────

export interface UserProfile {
  id: string;
  displayName: string;
  createdAt: string;
  onboardingComplete: boolean;
  preferredDuration: number; // minutes
  focusArea?: CognitiveCategory;
  avatar?: string;
}

export interface UserSettings {
  soundEnabled: boolean;
  soundVolume: number;
  reducedMotion: boolean;
  animationIntensity: 'full' | 'subtle' | 'none';
  theme: 'light' | 'dark';
  dailyGoal: number; // minutes
  notifications: boolean;
  reminderTime: string; // e.g., '09:00'
  favoriteGameIds: string[];
  excludedCategories: CognitiveCategory[];
}

export interface UserStats {
  totalSessions: number;
  totalTrainingTime: number; // ms
  currentStreak: number;
  longestStreak: number;
  lastTrainingDate: string;
  categoryScores: Record<CognitiveCategory, number[]>;
  personalBests: Record<string, number>;
  demoDataActive?: boolean;
}

// ─── Daily Routine ──────────────────────────────────────────

export interface DailyRoutineGame {
  gameId: string;
  category: CognitiveCategory;
  duration: number; // minutes
  completed: boolean;
  session?: GameSession;
}

export interface DailyRoutine {
  date: string;
  games: DailyRoutineGame[];
  totalDuration: number;
  completed: boolean;
  startedAt?: string;
  completedAt?: string;
}

// ─── Achievement Types ──────────────────────────────────────

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'training' | 'streak' | 'performance' | 'exploration' | 'mastery';
  condition: string;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

// ─── Adaptive Engine ────────────────────────────────────────

export interface AdaptiveState {
  category: CognitiveCategory;
  currentDifficulty: DifficultyLevel;
  recentAccuracy: number[];
  recentReactionTimes: number[];
  recentScores: number[];
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  lastAdjustment: string;
}

// ─── Progress Data ──────────────────────────────────────────

export type TimeFilter = '7d' | '30d' | '90d';

export interface ProgressData {
  sessions: GameSession[];
  categoryScores: Record<CognitiveCategory, number>;
  categoryHistory: Record<CognitiveCategory, { date: string; score: number }[]>;
  accuracy: number;
  avgReactionTime: number;
  totalSessions: number;
  totalTime: number;
  currentStreak: number;
  longestStreak: number;
}
