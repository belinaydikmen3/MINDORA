import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { AchievementToast } from './AchievementToast';
import type { Achievement } from '../types';

export function Layout() {
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    const handleUnlock = (e: Event) => {
      const detail = (e as CustomEvent<Achievement>).detail;
      if (detail) {
        setUnlockedAchievement(detail);
      }
    };
    window.addEventListener('mindora:achievement', handleUnlock);
    return () => window.removeEventListener('mindora:achievement', handleUnlock);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-surface-50)] flex">
      <Navigation />
      
      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 min-h-screen relative">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
          <Outlet />
        </div>
      </main>

      <AchievementToast 
        achievement={unlockedAchievement} 
        onClose={() => setUnlockedAchievement(null)} 
      />
    </div>
  );
}
