import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import {
  generateDailyRoutine,
  replaceRoutineGame,
  removeRoutineGame,
  addRoutineGame,
} from '../services/dailyRoutine';
import { getGame, GAMES } from '../data/games';
import { CategoryBadge } from '../components/CategoryBadge';
import { getSettings, saveSettings } from '../services/storage';
import type { DailyRoutine } from '../types';

export function DailyTraining() {
  const navigate = useNavigate();
  const [routine, setRoutine] = useState<DailyRoutine | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(() => getSettings().dailyGoal || 12);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  useEffect(() => {
    const todayRoutine = generateDailyRoutine(false, selectedDuration);
    setRoutine(todayRoutine);
  }, [selectedDuration]);

  if (!routine) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin text-[var(--color-mindora-lavender)]">
          <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    );
  }

  const isComplete = routine.completed;
  const currentUncompletedIndex = routine.games.findIndex((g) => !g.completed);

  const handleDurationChange = (mins: number) => {
    setSelectedDuration(mins);
    const settings = getSettings();
    saveSettings({ ...settings, dailyGoal: mins });
    const regenerated = generateDailyRoutine(true, mins);
    setRoutine(regenerated);
  };

  const handleRegenerate = () => {
    const regenerated = generateDailyRoutine(true, selectedDuration);
    setRoutine(regenerated);
  };

  const handleReplaceGame = (index: number, newGameId: string) => {
    const updated = replaceRoutineGame(index, newGameId);
    if (updated) setRoutine({ ...updated });
    setReplacingIndex(null);
  };

  const handleRemoveGame = (index: number) => {
    const updated = removeRoutineGame(index);
    if (updated) setRoutine({ ...updated });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      {/* Editorial Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2 bg-[var(--color-surface-100)] text-[var(--color-mindora-slate)]">
          <span>Personalized Adaptive Circuit</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-mindora-ink)] tracking-tight font-serif italic mb-2">
          Daily Training Circuit
        </h1>
        <p className="text-[var(--color-surface-600)] text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
          {isComplete 
            ? "Circuit complete for today! Feel free to replay any challenge or customize tomorrow's line-up." 
            : `Tailored ~${routine.totalDuration}-minute sequence shaped by your recent session history.`}
        </p>
      </div>

      {/* Routine Customization Bar (Principle A & 8) */}
      <div className="bg-white p-4 rounded-2xl border border-[var(--color-surface-200)] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-bold tracking-wider text-[var(--color-mindora-slate)]">
            Target Duration:
          </span>
          <div className="flex gap-1.5">
            {[5, 10, 15, 20].map((mins) => (
              <button
                key={mins}
                onClick={() => handleDurationChange(mins)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedDuration === mins
                    ? 'bg-[var(--color-mindora-ink)] text-white shadow-xs'
                    : 'bg-[var(--color-surface-100)] text-[var(--color-surface-600)] hover:bg-[var(--color-surface-200)]'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleRegenerate}
          className="text-xs font-medium text-[var(--color-brand-600)] hover:text-[var(--color-brand-800)] flex items-center gap-1.5 cursor-pointer"
        >
          <span>↺ Shuffle Recommended Sequence</span>
        </button>
      </div>

      {/* Routine Cards List */}
      <div className="space-y-3">
        {routine.games.map((g, index) => {
          const gameDef = getGame(g.gameId) || GAMES[0];
          const isCurrent = index === currentUncompletedIndex;
          const isDone = g.completed;

          return (
            <Card 
              key={`${g.gameId}-${index}`}
              className={`p-4 sm:p-5 flex items-center transition-all ${
                isCurrent 
                  ? 'border-[var(--color-mindora-ink)] shadow-md ring-1 ring-[var(--color-mindora-ink)] bg-white' 
                  : isDone 
                    ? 'bg-[var(--color-surface-50)] opacity-75' 
                    : 'bg-white'
              }`}
            >
              {/* Status Circle */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center mr-4 shrink-0 font-bold text-sm ${
                isDone 
                  ? 'bg-[var(--color-mindora-mint)] text-[var(--color-mindora-ink)]' 
                  : isCurrent 
                    ? 'bg-[var(--color-mindora-ink)] text-white shadow-xs' 
                    : 'bg-[var(--color-surface-100)] text-[var(--color-surface-500)]'
              }`}>
                {isDone ? '✓' : index + 1}
              </div>
              
              {/* Game Info */}
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: `${gameDef.color}15`, color: gameDef.color }}
                  >
                    {gameDef.icon}
                  </div>
                  <div>
                    <h3 className={`font-bold text-base ${isDone ? 'line-through text-[var(--color-surface-500)]' : 'text-[var(--color-mindora-ink)]'}`}>
                      {gameDef.name}
                    </h3>
                    <p className="text-xs text-[var(--color-mindora-slate)]">
                      ~{g.duration} min • {gameDef.shortDescription}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:block ml-auto">
                  <CategoryBadge category={g.category} />
                </div>
              </div>

              {/* Action Controls: Play, Swap, Remove */}
              <div className="ml-4 shrink-0 flex items-center gap-2">
                {isCurrent && (
                  <Button size="sm" onClick={() => navigate(`/games/${g.gameId}`)}>
                    Launch →
                  </Button>
                )}
                {!isCurrent && isDone && (
                  <button
                    onClick={() => navigate(`/games/${g.gameId}`)}
                    className="text-xs font-semibold px-2.5 py-1 rounded bg-[var(--color-surface-100)] text-[var(--color-surface-600)] hover:bg-[var(--color-surface-200)] cursor-pointer"
                  >
                    Replay
                  </button>
                )}
                {!isDone && !isCurrent && (
                  <button
                    onClick={() => setReplacingIndex(index)}
                    className="text-xs text-[var(--color-mindora-slate)] hover:text-[var(--color-mindora-ink)] px-2 py-1 cursor-pointer"
                    title="Replace this game with another"
                  >
                    Swap
                  </button>
                )}
                {routine.games.length > 1 && !isDone && (
                  <button
                    onClick={() => handleRemoveGame(index)}
                    className="text-xs text-[var(--color-surface-400)] hover:text-[var(--color-error-500)] px-1.5 py-1 cursor-pointer"
                    title="Remove from routine"
                  >
                    ✕
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Primary Continue / Start Button */}
      {!isComplete && currentUncompletedIndex !== -1 && (
        <div className="flex justify-center pt-2">
          <Button 
            size="lg" 
            className="w-full sm:w-auto min-w-[240px]" 
            onClick={() => navigate(`/games/${routine.games[currentUncompletedIndex].gameId}`)}
          >
            Start Next Exercise ({routine.games[currentUncompletedIndex].duration} min) →
          </Button>
        </div>
      )}

      {/* Game Swap Modal / Dropdown Dialog */}
      {replacingIndex !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card className="max-w-md w-full p-6 bg-white shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-[var(--color-mindora-ink)]">
                Replace Exercise
              </h3>
              <button 
                onClick={() => setReplacingIndex(null)}
                className="text-sm text-[var(--color-surface-400)] hover:text-[var(--color-mindora-ink)] cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-[var(--color-mindora-slate)] mb-4">
              Select any game from the catalog to take this spot in today’s circuit:
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {GAMES.map((game) => (
                <div
                  key={game.id}
                  onClick={() => handleReplaceGame(replacingIndex, game.id)}
                  className="p-3 rounded-xl border border-[var(--color-surface-200)] hover:border-[var(--color-mindora-lavender)] hover:bg-[var(--color-surface-50)] cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{game.icon}</span>
                    <div>
                      <h4 className="font-bold text-sm text-[var(--color-mindora-ink)]">{game.name}</h4>
                      <p className="text-[11px] text-[var(--color-surface-500)]">{game.shortDescription}</p>
                    </div>
                  </div>
                  <CategoryBadge category={game.category} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
