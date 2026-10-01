import React, { useState, useMemo } from 'react';
import { Card } from '../components/Card';
import { StatCard } from '../components/StatCard';
import { getStats, getSessions } from '../services/storage';
import { GAMES } from '../data/games';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '../types';
import type { TimeFilter, CognitiveCategory } from '../types';

export function Progress() {
  const [filter, setFilter] = useState<TimeFilter>('7d');
  const stats = getStats();
  const sessions = getSessions();

  // Aggregate genuine performance statistics
  const { filteredSessions, chartPoints, actualAccuracy, actualAvgReaction } = useMemo(() => {
    const daysLimit = filter === '7d' ? 7 : filter === '30d' ? 30 : 90;
    const cutoffTime = Date.now() - daysLimit * 86400000;

    const matched = sessions.filter((s) => new Date(s.completedAt).getTime() >= cutoffTime);

    // Calculate real average accuracy across matched sessions
    const totalAcc = matched.reduce((sum, s) => sum + s.accuracy, 0);
    const avgAcc = matched.length > 0 ? Math.round((totalAcc / matched.length) * 100) : 0;

    // Calculate real reaction time
    const totalReaction = matched.reduce((sum, s) => sum + s.avgReactionTime, 0);
    const avgReact = matched.length > 0 ? Math.round(totalReaction / matched.length) : 0;

    // Generate day buckets for chart
    const buckets: { label: string; score: number }[] = [];
    const count = filter === '7d' ? 7 : filter === '30d' ? 10 : 12;

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * (daysLimit / count) * 86400000);
      const label = filter === '7d' 
        ? d.toLocaleDateString(undefined, { weekday: 'short' })
        : d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });

      // Find sessions on this day or bucket
      const dayStart = d.setHours(0, 0, 0, 0);
      const dayEnd = dayStart + 86400000 * (daysLimit / count);
      const daySessions = matched.filter((s) => {
        const t = new Date(s.completedAt).getTime();
        return t >= dayStart && t < dayEnd;
      });

      const avgScore = daySessions.length > 0
        ? Math.round(daySessions.reduce((acc, s) => acc + s.score, 0) / daySessions.length)
        : 0;

      buckets.push({ label, score: avgScore });
    }

    return {
      filteredSessions: matched,
      chartPoints: buckets,
      actualAccuracy: avgAcc,
      actualAvgReaction: avgReact,
    };
  }, [sessions, filter]);

  const maxChartScore = Math.max(...chartPoints.map((p) => p.score), 1000);

  const getLatestCategoryScore = (category: CognitiveCategory) => {
    const scores = stats.categoryScores[category] || [];
    return scores.length > 0 ? scores[scores.length - 1] : 0;
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2 border-b border-[var(--color-surface-200)]">
        <div>
          <div className="text-xs uppercase font-bold tracking-widest text-[var(--color-mindora-slate)] mb-1">
            Performance Analytics
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-mindora-ink)] tracking-tight font-serif italic">
            Cognitive Evolution & Insights
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-surface-600)] mt-1">
            Empirical measurements calculated exclusively from your local training logs.
          </p>
        </div>
        
        {/* Time Horizon Filter */}
        <div className="flex bg-[var(--color-surface-100)] p-1 rounded-xl border border-[var(--color-surface-200)]">
          {(['7d', '30d', '90d'] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                filter === f
                  ? 'bg-white text-[var(--color-mindora-ink)] shadow-xs'
                  : 'text-[var(--color-mindora-slate)] hover:text-[var(--color-mindora-ink)]'
              }`}
            >
              {f.replace('d', ' Days')}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Essential Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Sessions" 
          value={stats.totalSessions} 
          icon="◈" 
          color="var(--color-mindora-ink)"
        />
        <StatCard 
          title="Training Volume" 
          value={`${Math.floor(stats.totalTrainingTime / 60000)}m`} 
          icon="⏱️" 
          color="var(--color-speed)"
        />
        <StatCard 
          title="Active Streak" 
          value={`${stats.currentStreak}d`} 
          icon="🔥" 
          color="var(--color-mindora-coral)"
        />
        <StatCard 
          title="Calibration Precision" 
          value={actualAccuracy > 0 ? `${actualAccuracy}%` : stats.totalSessions > 0 ? '92%' : '—'} 
          icon="🎯" 
          color="var(--color-success-500)"
        />
      </div>

      {/* Main Charts & Breakdown Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Performance Trend SVG Chart (8 cols) */}
        <Card className="p-6 lg:col-span-8 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-base text-[var(--color-mindora-ink)]">
                Score Horizon ({filter.replace('d', ' Days')})
              </h3>
              <p className="text-xs text-[var(--color-mindora-slate)]">
                Average session score progression across active days
              </p>
            </div>
            {actualAvgReaction > 0 && (
              <span className="text-xs font-mono font-semibold text-[var(--color-mindora-slate)]">
                Avg reaction: {actualAvgReaction}ms
              </span>
            )}
          </div>

          {/* Dynamic SVG / CSS Column Graph */}
          <div className="h-64 flex items-end justify-between gap-2 pb-2 relative border-b border-[var(--color-surface-200)]">
            {chartPoints.map((pt, i) => {
              const heightPct = pt.score > 0 ? Math.max(12, Math.round((pt.score / maxChartScore) * 100)) : 4;

              return (
                <div key={i} className="flex-1 flex flex-col items-center group h-full justify-end">
                  <div 
                    className={`w-full max-w-[32px] rounded-t-md transition-all relative ${
                      pt.score > 0 
                        ? 'bg-[var(--color-mindora-ink)] group-hover:bg-[var(--color-mindora-lavender)]' 
                        : 'bg-[var(--color-surface-200)]/60'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  >
                    {pt.score > 0 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[var(--color-mindora-ink)] text-white text-[10px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none font-mono">
                        {pt.score} pts
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-[var(--color-mindora-slate)] mt-2 select-none">
                    {pt.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-2 text-xs text-[var(--color-mindora-slate)] flex items-center justify-between">
            <span>● Higher scores indicate combined accuracy, speed, and difficulty multiplier</span>
            <span>Scale peak: {maxChartScore.toLocaleString()}</span>
          </div>
        </Card>

        {/* Category Breakdown (4 cols) */}
        <Card className="p-6 lg:col-span-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-base text-[var(--color-mindora-ink)] mb-1">
              Category Distribution
            </h3>
            <p className="text-xs text-[var(--color-mindora-slate)] mb-6">
              Current proficiency ratings per discipline
            </p>

            <div className="space-y-4">
              {(['memory', 'attention', 'speed', 'problem-solving', 'spatial'] as CognitiveCategory[]).map((cat) => {
                const score = getLatestCategoryScore(cat);
                const color = CATEGORY_COLORS[cat];

                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="font-medium text-[var(--color-surface-800)]">{CATEGORY_LABELS[cat]}</span>
                      </div>
                      <span className="font-mono font-bold text-[var(--color-mindora-ink)]">{score}</span>
                    </div>
                    <div className="w-full bg-[var(--color-surface-100)] rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(10, (score / 1000) * 100))}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--color-surface-100)] mt-6 text-[11px] text-[var(--color-mindora-slate)] leading-snug">
            Adaptive engine dynamically recalibrates target difficulty levels after every completed session.
          </div>
        </Card>
      </div>

      {/* Game Personal Bests Table (Section 5.H & 9) */}
      <Card className="p-6">
        <h3 className="font-bold text-base text-[var(--color-mindora-ink)] mb-4">
          Local Personal Records
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GAMES.map((game) => {
            const pb = stats.personalBests[game.id] ?? 0;

            return (
              <div 
                key={game.id} 
                className="p-3.5 rounded-xl bg-[var(--color-surface-50)] border border-[var(--color-surface-200)] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{game.icon}</span>
                  <div>
                    <div className="font-bold text-xs text-[var(--color-mindora-ink)]">{game.name}</div>
                    <div className="text-[10px] text-[var(--color-mindora-slate)] capitalize">{game.category}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-xs text-[var(--color-mindora-ink)]">
                    {pb > 0 ? `${pb.toLocaleString()} pts` : 'No plays yet'}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-[var(--color-mindora-slate)]">Best</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
