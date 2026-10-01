import React from 'react';
import { NavLink } from 'react-router-dom';

export function Navigation() {
  const navItems = [
    { path: '/', label: 'Dashboard', icon: '✦' },
    { path: '/games', label: 'Library', icon: '▦' },
    { path: '/training', label: 'Daily Session', icon: '◈' },
    { path: '/progress', label: 'Insights', icon: '▲' },
    { path: '/profile', label: 'Settings', icon: '◎' },
  ];

  return (
    <>
      {/* Desktop Editorial Navigation (Sidebar) */}
      <nav className="hidden md:flex flex-col w-64 bg-white border-r border-[var(--color-surface-200)] h-full fixed left-0 top-0 pt-7 pb-6 z-40 select-none">
        {/* Brand Emblem & Wordmark */}
        <div className="px-6 mb-9 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-mindora-ink)] flex items-center justify-center text-[var(--color-mindora-cream)] text-lg shadow-sm border border-[var(--color-surface-700)]">
            <span className="font-serif italic font-semibold text-xl">m</span>
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-[var(--color-mindora-ink)] block leading-none">
              MINDORA
            </span>
            <span className="text-[10px] uppercase tracking-widest text-[var(--color-mindora-slate)] font-semibold mt-1 block">
              Cognitive Studio
            </span>
          </div>
        </div>
        
        {/* Navigation Items */}
        <div className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--color-mindora-ink)] text-white shadow-xs'
                    : 'text-[var(--color-surface-600)] hover:bg-[var(--color-surface-100)] hover:text-[var(--color-mindora-ink)]'
                }`
              }
            >
              <span className="text-sm opacity-80">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Bottom Status / Mode Pill */}
        <div className="px-5 pt-4 border-t border-[var(--color-surface-100)] text-xs text-[var(--color-mindora-slate)] flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-mindora-mint)]"></span>
            Local-First Mode
          </span>
          <span className="font-mono text-[10px] text-[var(--color-surface-400)]">v2.0</span>
        </div>
      </nav>

      {/* Mobile Navigation (Bottom Tab Bar) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[var(--color-surface-200)] z-40 pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive
                    ? 'text-[var(--color-mindora-ink)] font-semibold'
                    : 'text-[var(--color-mindora-slate)] hover:text-[var(--color-mindora-ink)]'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
