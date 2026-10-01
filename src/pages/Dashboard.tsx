import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, getStats, getSettings, getRecentSessions, getDailyRoutine } from '../services/storage';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ScoreRing } from '../components/ScoreRing';
import { CategoryBadge } from '../components/CategoryBadge';
import { getGame, GAMES } from '../data/games';
import type { UserProfile, UserStats, UserSettings, GameSession, DailyRoutineGame, GameConfig } from '../types';

export function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [recentSessions, setRecentSessions] = useState<GameSession[]>([]);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser || !currentUser.onboardingComplete) {
      navigate('/onboarding');
      return;
    }
    setUser(currentUser);
    setStats(getStats());
    setSettings(getSettings());
    setRecentSessions(getRecentSessions(4));
  }, [navigate]);

  if (!user || !stats || !settings) return null;

  // Calculate real scores per category
  const getLatestScore = (category: 'memory' | 'attention' | 'speed' | 'problem-solving' | 'spatial') => {
    const scores = stats.categoryScores[category] || [];
    return scores.length > 0 ? scores[scores.length - 1] : 0;
  };

  const memoryScore = getLatestScore('memory');
  const attentionScore = getLatestScore('attention');
  const speedScore = getLatestScore('speed');
  const problemScore = getLatestScore('problem-solving');
  
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayTimeMins = Math.floor((stats.lastTrainingDate === todayDateStr ? stats.totalTrainingTime : 0) / 60000);
  const goalProgress = Math.min((todayTimeMins / (settings.dailyGoal || 12)) * 100, 100);

  // Daily routine status
  const todayRoutine = getDailyRoutine();
  const routineComplete = Boolean(todayRoutine?.completed);
  const routineTotalGames = todayRoutine?.games.length || 3;
  const routineCompletedGames = todayRoutine?.games.filter((g: DailyRoutineGame) => g.completed).length || 0;

  // Favorite games objects with guaranteed type narrowing
  const favoriteGames = settings.favoriteGameIds
    .map(getGame)
    .filter((g): g is GameConfig => Boolean(g));

  // Rotating Challenge: determined by day of month
  const dayIndex = new Date().getDate() % GAMES.length;
  const todayChallengeGame = GAMES[dayIndex];

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Demo Seed Data Banner if active */}
      {stats.demoDataActive && (
        <div className="bg-[var(--color-surface-100)] border border-[var(--color-surface-300)] text-[var(--color-mindora-ink)] px-4 py-2.5 rounded-xl text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--color-mindora-coral)]"></span>
            <strong>Preview Seed Data Loaded:</strong> Dashboard displays demonstration trends. Real sessions seamlessly append.
          </span>
          <button 
            onClick={() => navigate('/profile')} 
            className="text-xs font-semibold text-[var(--color-brand-600)] hover:underline cursor-pointer"
          >
            Manage in Settings →
          </button>
        </div>
      )}

      {/* Editorial Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[var(--color-surface-200)]">
        <div>
          <div className="text-xs uppercase font-bold tracking-widest text-[var(--color-mindora-slate)] mb-1">
            Studio Command • {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-mindora-ink)] tracking-tight font-serif italic">
            Welcome back, {user.displayName}
          </h1>
          <p className="text-[var(--color-surface-600)] text-sm sm:text-base mt-1">
            Your personalized cognitive arena is primed. Explore new exercises or complete today's circuit.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/training')} size="md" variant="primary">
            <span>{routineComplete ? 'Review Circuit ◈' : 'Start Daily Circuit ◈'}</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Asymmetrical Editorial Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): Spotlight Challenge & Cognitive Profile */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Spotlight Hero: Rotating Daily Challenge (Section 6 & 5.B) */}
          <div className="bg-white rounded-2xl border border-[var(--color-surface-200)] overflow-hidden shadow-xs relative">
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-3 max-w-md">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-mindora-coral)]/15 text-[var(--color-mindora-coral)]">
                    Today’s Featured Challenge
                  </span>
                  <CategoryBadge category={todayChallengeGame.category} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[var(--color-mindora-ink)]">
                  {todayChallengeGame.name}
                </h2>
                <p className="text-sm text-[var(--color-surface-600)] leading-relaxed">
                  {todayChallengeGame.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-[var(--color-mindora-slate)] pt-1">
                  <span>⏱️ ~{todayChallengeGame.estimatedTime} min</span>
                  <span>•</span>
                  <span>Levels {todayChallengeGame.minDifficulty}–{todayChallengeGame.maxDifficulty}</span>
                </div>
              </div>

              <div className="shrink-0 flex flex-col items-center sm:items-end w-full sm:w-auto">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xs mb-4"
                  style={{ backgroundColor: `${todayChallengeGame.color}15`, color: todayChallengeGame.color }}
                >
                  {todayChallengeGame.icon}
                </div>
                <Button 
                  onClick={() => navigate(`/games/${todayChallengeGame.id}`)}
                  variant="primary"
                  className="w-full sm:w-auto px-6"
                >
                  Launch Challenge →
                </Button>
              </div>
            </div>
          </div>

          {/* Cognitive Profile Visualizer */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-mindora-ink)]">Cognitive Resonance</h3>
                <p className="text-xs text-[var(--color-mindora-slate)]">Calibration index across key processing modalities</p>
              </div>
              <button 
                onClick={() => navigate('/progress')}
                className="text-xs font-semibold text-[var(--color-brand-600)] hover:underline cursor-pointer"
              >
                Detailed Insights →
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 justify-items-center py-2">
              <ScoreRing score={memoryScore} label="Working Memory" color="var(--color-memory)" />
              <ScoreRing score={attentionScore} label="Selective Focus" color="var(--color-attention)" />
              <ScoreRing score={speedScore} label="Processing Speed" color="var(--color-speed)" />
              <ScoreRing score={problemScore} label="Pattern Logic" color="var(--color-problem)" />
            </div>
          </Card>

          {/* Favorite Games Shelf (Section 5.A) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--color-mindora-ink)] flex items-center gap-2">
                <span>♥ Favorite Exercises</span>
                <span className="text-xs font-normal text-[var(--color-mindora-slate)]">
                  ({favoriteGames.length} saved)
                </span>
              </h3>
              <button 
                onClick={() => navigate('/games')}
                className="text-xs text-[var(--color-brand-600)] hover:underline cursor-pointer font-medium"
              >
                Browse Catalog →
              </button>
            </div>

            {favoriteGames.length === 0 ? (
              <div className="p-5 bg-white rounded-xl border border-[var(--color-surface-200)] text-center text-xs text-[var(--color-mindora-slate)]">
                You haven’t pinned any favorites yet. Tap the heart on any exercise in the Library to pin it here.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {favoriteGames.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => navigate(`/games/${game.id}`)}
                    className="p-4 bg-white rounded-xl border border-[var(--color-surface-200)] hover:border-[var(--color-mindora-lavender)] hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${game.color}15`, color: game.color }}
                      >
                        {game.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[var(--color-mindora-ink)]">{game.name}</h4>
                        <span className="text-[11px] text-[var(--color-mindora-slate)]">~{game.estimatedTime} min</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-[var(--color-brand-600)]">Play →</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Circuit Status, Streaks, Recent Timeline */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Daily Goal & Circuit Progress Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base text-[var(--color-mindora-ink)]">Daily Goal Progress</h3>
              <span className="text-xs font-mono font-semibold text-[var(--color-mindora-slate)]">
                {todayTimeMins} / {settings.dailyGoal}m
              </span>
            </div>

            <div className="w-full bg-[var(--color-surface-100)] rounded-full h-2.5 mb-3 overflow-hidden">
              <div 
                className="bg-[var(--color-mindora-ink)] h-2.5 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            
            <p className="text-xs text-[var(--color-surface-600)] mb-5">
              {goalProgress >= 100 
                ? 'Goal achieved! Any extra session counts towards personal mastery.' 
                : `${Math.max(0, settings.dailyGoal - todayTimeMins)} minutes remaining to hit your target.`}
            </p>

            <div className="pt-4 border-t border-[var(--color-surface-200)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-mindora-lavender)]/20 text-[var(--color-brand-700)] flex items-center justify-center text-sm font-bold">
                  ◈
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--color-mindora-ink)]">Today’s Circuit</div>
                  <div className="text-[11px] text-[var(--color-mindora-slate)]">
                    {routineCompletedGames} of {routineTotalGames} exercises complete
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/training')}
                className="text-xs font-bold text-[var(--color-mindora-ink)] hover:underline cursor-pointer"
              >
                Open →
              </button>
            </div>
          </Card>

          {/* Consistency Streak Card */}
          <Card className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-mindora-coral)]/15 text-[var(--color-mindora-coral)] flex items-center justify-center text-2xl font-bold">
              🔥
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-[var(--color-mindora-slate)]">
                Training Momentum
              </div>
              <div className="text-2xl font-bold text-[var(--color-mindora-ink)] font-mono">
                {stats.currentStreak} {stats.currentStreak === 1 ? 'Day' : 'Days'}
              </div>
              <div className="text-[11px] text-[var(--color-mindora-slate)]">
                Longest streak: {stats.longestStreak} days
              </div>
            </div>
          </Card>

          {/* Recent Activity Timeline (Real sessions data) */}
          <Card className="p-6">
            <h3 className="font-bold text-base text-[var(--color-mindora-ink)] mb-4">
              Recent Activity
            </h3>

            {recentSessions.length === 0 ? (
              <div className="text-center py-6 text-xs text-[var(--color-mindora-slate)] space-y-2">
                <p>No recorded sessions yet.</p>
                <Button variant="outline" size="sm" onClick={() => navigate('/games')}>
                  Browse Exercises
                </Button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {recentSessions.map((s) => {
                  const game = getGame(s.gameId);
                  const date = new Date(s.completedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{game?.icon || '✦'}</span>
                        <div>
                          <div className="font-semibold text-[var(--color-mindora-ink)]">
                            {game?.name || s.gameId}
                          </div>
                          <div className="text-[10px] text-[var(--color-mindora-slate)]">
                            {date} • {Math.round(s.accuracy * 100)}% acc
                          </div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-[var(--color-mindora-ink)]">
                        {s.score.toLocaleString()} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
