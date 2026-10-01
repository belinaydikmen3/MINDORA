import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import {
  getUser,
  getSettings,
  saveUser,
  saveSettings,
  clearAllData,
  clearDemoData,
  getStats,
} from '../services/storage';
import { setAudioEnabled } from '../services/audio';
import type { UserProfile, UserSettings, CognitiveCategory } from '../types';
import { CATEGORY_LABELS } from '../types';
import { generateDemoSessions, generateDemoStats } from '../data/demoData';
import { STORAGE_KEYS } from '../services/storage';

export function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isDemoActive, setIsDemoActive] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setSettings(getSettings());
    const stats = getStats();
    setIsDemoActive(Boolean(stats.demoDataActive));
  }, []);

  if (!user || !settings) return null;

  const handleSaveName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = { ...user, displayName: e.target.value };
    setUser(updated);
    saveUser(updated);
  };

  const handleToggleSound = () => {
    const nextVal = !settings.soundEnabled;
    const updated = { ...settings, soundEnabled: nextVal };
    setSettings(updated);
    saveSettings(updated);
    setAudioEnabled(nextVal);
  };

  const handleToggleNotifications = () => {
    const updated = { ...settings, notifications: !settings.notifications };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleReminderTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updated = { ...settings, reminderTime: e.target.value };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleAnimationIntensity = (val: 'full' | 'subtle' | 'none') => {
    const updated = { ...settings, animationIntensity: val, reducedMotion: val === 'none' };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleGoalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const updated = { ...settings, dailyGoal: parseInt(e.target.value, 10) };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleToggleCategoryExclusion = (cat: CognitiveCategory) => {
    const current = new Set(settings.excludedCategories || []);
    if (current.has(cat)) {
      current.delete(cat);
    } else {
      current.add(cat);
    }
    const updated = { ...settings, excludedCategories: Array.from(current) };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to delete all personal history and reset MINDORA? This cannot be undone.')) {
      clearAllData();
      window.location.href = '/onboarding';
    }
  };

  const handleLoadDemoData = () => {
    if (window.confirm('This will seed realistic 30-day session records and demonstrate trending charts. Proceed?')) {
      const demoSessions = generateDemoSessions(45);
      const demoStats = generateDemoStats();
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(demoSessions));
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(demoStats));
      window.location.href = '/';
    }
  };

  const handleClearDemoData = () => {
    if (window.confirm('Remove all demo/seed sessions and start with clean personal data?')) {
      clearDemoData();
      window.location.href = '/';
    }
  };

  const allCategories: CognitiveCategory[] = [
    'memory',
    'attention',
    'speed',
    'problem-solving',
    'spatial',
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
      <div>
        <div className="text-xs uppercase font-bold tracking-widest text-[var(--color-mindora-slate)] mb-1">
          Preferences & Calibration
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-mindora-ink)] tracking-tight font-serif italic">
          Studio Settings
        </h1>
        <p className="text-sm text-[var(--color-surface-600)] mt-1">
          Adjust exercise parameters, visual intensity, daily routine exclusions, and local persistence.
        </p>
      </div>

      {/* User Moniker Card */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-[var(--color-mindora-ink)] mb-6 border-b border-[var(--color-surface-200)] pb-3">
          Member Identity
        </h2>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="w-16 h-16 bg-[var(--color-mindora-ink)] rounded-2xl flex items-center justify-center text-2xl font-serif italic font-bold text-[var(--color-mindora-cream)] shadow-xs">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-mindora-slate)] mb-2">
              Studio Display Moniker
            </label>
            <input 
              type="text" 
              value={user.displayName}
              onChange={handleSaveName}
              className="w-full max-w-md bg-[var(--color-surface-50)] border border-[var(--color-surface-300)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-mindora-ink)] focus:outline-none focus:border-[var(--color-mindora-lavender)] focus:ring-1 focus:ring-[var(--color-mindora-lavender)]"
            />
          </div>
        </div>
      </Card>

      {/* Training Preferences */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-[var(--color-mindora-ink)] mb-6 border-b border-[var(--color-surface-200)] pb-3">
          Routine & Circuit Calibration
        </h2>
        
        <div className="space-y-6">
          {/* Daily Goal */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-[var(--color-mindora-ink)]">Target Daily Duration</p>
              <p className="text-xs text-[var(--color-mindora-slate)]">Default circuit length generated each morning</p>
            </div>
            <select 
              value={settings.dailyGoal}
              onChange={handleGoalChange}
              className="bg-[var(--color-surface-50)] border border-[var(--color-surface-300)] rounded-xl px-3.5 py-2 text-xs font-medium text-[var(--color-mindora-ink)] focus:outline-none focus:border-[var(--color-mindora-lavender)] cursor-pointer"
            >
              <option value={5}>5 minutes (Express)</option>
              <option value={10}>10 minutes (Standard)</option>
              <option value={15}>15 minutes (Deep)</option>
              <option value={20}>20 minutes (Comprehensive)</option>
            </select>
          </div>

          {/* Excluded Categories (Requirement 5.A) */}
          <div className="pt-4 border-t border-[var(--color-surface-100)]">
            <div className="mb-2">
              <p className="font-semibold text-sm text-[var(--color-mindora-ink)]">
                Category Inclusions for Daily Routine
              </p>
              <p className="text-xs text-[var(--color-mindora-slate)]">
                Deselect any skill you prefer to skip from automatic daily circuit generation (remains freely playable in Library):
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {allCategories.map((cat) => {
                const isExcluded = settings.excludedCategories?.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => handleToggleCategoryExclusion(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      !isExcluded
                        ? 'bg-[var(--color-mindora-ink)] text-white shadow-xs'
                        : 'bg-white border border-[var(--color-surface-300)] text-[var(--color-surface-400)] line-through'
                    }`}
                  >
                    <span>{!isExcluded ? '✓' : '✕'}</span>
                    <span>{CATEGORY_LABELS[cat]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Comfort, Audio, and Motion Controls (Requirement 5.G & 11) */}
      <Card className="p-6">
        <h2 className="text-lg font-bold text-[var(--color-mindora-ink)] mb-6 border-b border-[var(--color-surface-200)] pb-3">
          Sensory & Notification Comfort
        </h2>

        <div className="space-y-6">
          {/* Sound */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-[var(--color-mindora-ink)]">Harmonic Audio Feedback</p>
              <p className="text-xs text-[var(--color-mindora-slate)]">Synthesizer cues during countdowns, hits, and results</p>
            </div>
            <button 
              onClick={handleToggleSound}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.soundEnabled ? 'bg-[var(--color-mindora-ink)]' : 'bg-[var(--color-surface-300)]'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.soundEnabled ? 'left-6' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Animation Intensity */}
          <div className="pt-4 border-t border-[var(--color-surface-100)] flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-[var(--color-mindora-ink)]">Motion & Visual Intensity</p>
              <p className="text-xs text-[var(--color-mindora-slate)]">Reduce canvas particle speeds and motion transitions</p>
            </div>
            <div className="flex gap-1.5">
              {(['full', 'subtle', 'none'] as const).map((intensity) => (
                <button
                  key={intensity}
                  onClick={() => handleAnimationIntensity(intensity)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    settings.animationIntensity === intensity
                      ? 'bg-[var(--color-mindora-ink)] text-white shadow-xs'
                      : 'bg-[var(--color-surface-100)] text-[var(--color-surface-600)] hover:bg-[var(--color-surface-200)]'
                  }`}
                >
                  {intensity}
                </button>
              ))}
            </div>
          </div>

          {/* Gentle Reminder Time */}
          <div className="pt-4 border-t border-[var(--color-surface-100)] flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm text-[var(--color-mindora-ink)]">Daily Training Reminder</p>
              <p className="text-xs text-[var(--color-mindora-slate)]">
                Local in-tab advisory alert time
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={settings.reminderTime || '09:00'}
                onChange={handleReminderTimeChange}
                className="bg-[var(--color-surface-50)] border border-[var(--color-surface-300)] rounded-xl px-2.5 py-1 text-xs text-[var(--color-mindora-ink)]"
              />
              <button 
                onClick={handleToggleNotifications}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.notifications ? 'bg-[var(--color-mindora-ink)]' : 'bg-[var(--color-surface-300)]'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.notifications ? 'left-6' : 'left-1'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Data Management & Seed Controls */}
      <Card className="p-6 border-[var(--color-surface-200)]">
        <h2 className="text-lg font-bold text-[var(--color-mindora-ink)] mb-2">
          Data Management & Local Cache
        </h2>
        <p className="text-xs text-[var(--color-mindora-slate)] mb-6">
          MINDORA stores 100% of your records locally on this browser using Indexed Storage.
        </p>
        
        <div className="flex flex-wrap gap-3">
          {isDemoActive ? (
            <Button variant="outline" size="sm" onClick={handleClearDemoData} className="border-[var(--color-mindora-coral)] text-[var(--color-mindora-coral)] hover:bg-[var(--color-mindora-coral)]/10">
              Clear Demo Seed Data
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleLoadDemoData}>
              Load Demo Seed History (30 Days)
            </Button>
          )}

          <Button variant="danger" size="sm" onClick={handleReset}>
            Reset Entire Studio History
          </Button>
        </div>
      </Card>
      
      <div className="text-center text-xs text-[var(--color-mindora-slate)] pt-4">
        <p className="font-serif italic text-sm text-[var(--color-mindora-ink)] mb-1">MINDORA Studio</p>
        <p>Local-First Cognitive Training • Edition 2.0</p>
      </div>
    </div>
  );
}
