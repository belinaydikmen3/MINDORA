import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveUser, saveSettings, setOnboardingComplete } from '../services/storage';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import type { CognitiveCategory } from '../types';

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [duration, setDuration] = useState(10);
  const [focusArea, setFocusArea] = useState<CognitiveCategory | ''>('memory');

  const handleComplete = () => {
    saveUser({
      id: crypto.randomUUID(),
      displayName: displayName.trim() || 'Mind Athlete',
      createdAt: new Date().toISOString(),
      onboardingComplete: true,
      preferredDuration: duration,
      focusArea: focusArea || undefined,
    });
    
    saveSettings({
      soundEnabled: true,
      soundVolume: 0.5,
      reducedMotion: false,
      animationIntensity: 'full',
      theme: 'light',
      dailyGoal: duration,
      notifications: false,
      reminderTime: '09:00',
      favoriteGameIds: ['neural-shift', 'memory-matrix'],
      excludedCategories: [],
    });

    setOnboardingComplete();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[var(--color-mindora-ink)] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Editorial ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-[var(--color-mindora-lavender)]/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[var(--color-mindora-coral)]/10 blur-[140px] pointer-events-none" />

      <Card className="max-w-xl w-full bg-[var(--color-surface-800)] border border-[var(--color-surface-700)] text-white p-8 md:p-12 relative z-10 shadow-2xl rounded-2xl">
        {step === 1 && (
          <div className="text-center animate-fade-in-up">
            <div className="w-16 h-16 mx-auto bg-[var(--color-mindora-ink)] border border-[var(--color-surface-600)] rounded-2xl flex items-center justify-center text-3xl font-serif italic text-[var(--color-mindora-cream)] mb-6 shadow-sm">
              m
            </div>
            <div className="text-xs uppercase font-bold tracking-widest text-[var(--color-mindora-slate)] mb-2">
              Cognitive Studio
            </div>
            <h1 className="text-4xl font-bold font-serif italic mb-3 text-white tracking-tight">
              Welcome to MINDORA
            </h1>
            <p className="text-base text-[var(--color-mindora-slate)] mb-8 leading-relaxed max-w-md mx-auto">
              An unconstrained cognitive playground designed for personal growth, flexible daily training, and transparent analytics.
            </p>
            <Button size="lg" fullWidth variant="secondary" onClick={() => setStep(2)}>
              Configure Your Studio →
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <div className="text-xs uppercase font-bold tracking-widest text-[var(--color-mindora-slate)] mb-1">
              Step 1 of 2
            </div>
            <h2 className="text-2xl font-bold font-serif italic mb-2 text-white">Your Training Profile</h2>
            <p className="text-sm text-[var(--color-mindora-slate)] mb-6">How would you like to be addressed in your studio reports?</p>
            
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name or moniker"
              className="w-full bg-[var(--color-surface-900)] border border-[var(--color-surface-600)] rounded-xl px-4 py-3.5 text-base text-white placeholder-[var(--color-mindora-slate)] mb-8 focus:outline-none focus:border-[var(--color-mindora-lavender)] focus:ring-1 focus:ring-[var(--color-mindora-lavender)]"
              autoFocus
            />
            
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 text-white hover:bg-white/10" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button className="flex-1" variant="secondary" onClick={() => setStep(3)} disabled={!displayName.trim()}>
                Continue →
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <div className="text-xs uppercase font-bold tracking-widest text-[var(--color-mindora-slate)] mb-1">
              Step 2 of 2
            </div>
            <h2 className="text-2xl font-bold font-serif italic mb-2 text-white">Session Calibration</h2>
            <p className="text-sm text-[var(--color-mindora-slate)] mb-6">Choose your preferred daily workout pace (adjustable anytime):</p>
            
            <div className="grid grid-cols-2 gap-3 mb-8">
              {[5, 10, 15, 20].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setDuration(mins)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                    duration === mins
                      ? 'border-[var(--color-mindora-lavender)] bg-[var(--color-mindora-lavender)]/15 text-white shadow-xs'
                      : 'border-[var(--color-surface-700)] text-[var(--color-mindora-slate)] hover:border-[var(--color-surface-600)]'
                  }`}
                >
                  <div className="text-xl font-bold mb-0.5 font-mono">{mins} mins</div>
                  <div className="text-xs opacity-75">{mins <= 6 ? 'Quick refresh' : mins <= 12 ? 'Balanced session' : 'Deep training'}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 text-white hover:bg-white/10" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button className="flex-1" variant="secondary" onClick={handleComplete}>
                Launch Studio ✦
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
