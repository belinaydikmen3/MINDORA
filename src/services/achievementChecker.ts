/**
 * NEUROVA Achievement Checker
 * Evaluates and unlocks achievements after game sessions.
 */

import type { GameSession } from '../types';
import { getStats, getAchievements, saveAchievements, getSessions } from './storage';
import { ACHIEVEMENT_DEFINITIONS } from '../data/achievements';

export interface AchievementUnlock {
  id: string;
  name: string;
  icon: string;
}

let pendingUnlocks: AchievementUnlock[] = [];

export function getPendingUnlocks(): AchievementUnlock[] {
  const unlocks = [...pendingUnlocks];
  pendingUnlocks = [];
  return unlocks;
}

export function checkAchievements(session: GameSession): AchievementUnlock[] {
  let achievements = getAchievements();

  // Initialize achievements if not yet created
  if (achievements.length === 0) {
    achievements = ACHIEVEMENT_DEFINITIONS.map((a) => ({ ...a }));
  }

  const stats = getStats();
  const sessions = getSessions();
  const newUnlocks: AchievementUnlock[] = [];

  const unlock = (id: string) => {
    const ach = achievements.find((a) => a.id === id);
    if (ach && !ach.unlockedAt) {
      ach.unlockedAt = new Date().toISOString();
      newUnlocks.push({ id: ach.id, name: ach.name, icon: ach.icon });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mindora:achievement', { detail: ach }));
      }
    }
  };

  const updateProgress = (id: string, progress: number) => {
    const ach = achievements.find((a) => a.id === id);
    if (ach) {
      ach.progress = progress;
      if (ach.maxProgress && progress >= ach.maxProgress && !ach.unlockedAt) {
        unlock(id);
      }
    }
  };

  // First session
  updateProgress('first-session', stats.totalSessions);

  // Session milestones
  updateProgress('sessions-10', stats.totalSessions);
  updateProgress('sessions-50', stats.totalSessions);

  // Streaks
  updateProgress('streak-3', stats.currentStreak);
  updateProgress('streak-7', stats.currentStreak);
  updateProgress('streak-30', stats.currentStreak);

  // Perfect session
  if (session.accuracy >= 1.0) {
    updateProgress('perfect-session', 1);
  }

  // Speed demon
  if (session.gameId === 'rapid-match' && session.avgReactionTime < 500 && session.avgReactionTime > 0) {
    updateProgress('speed-demon', 1);
  }

  // Memory master
  if (session.gameId === 'memory-matrix' && session.score >= 900) {
    updateProgress('memory-master', 1);
  }

  // Neural shift achievements
  if (session.gameId === 'neural-shift') {
    if (session.score >= 500) updateProgress('neural-shift-500', 1);
    if (session.score >= 1000) updateProgress('neural-shift-1000', 1);
  }

  // Explorer - played all games
  const uniqueGames = new Set(sessions.map((s) => s.gameId));
  uniqueGames.add(session.gameId);
  updateProgress('all-games', uniqueGames.size);

  // Training time
  const totalMinutes = Math.floor(stats.totalTrainingTime / 60000);
  updateProgress('hour-trained', totalMinutes);

  saveAchievements(achievements);
  pendingUnlocks = [...pendingUnlocks, ...newUnlocks];
  return newUnlocks;
}

export function initializeAchievements(): void {
  const existing = getAchievements();
  if (existing.length === 0) {
    saveAchievements(ACHIEVEMENT_DEFINITIONS.map((a) => ({ ...a })));
  }
}
