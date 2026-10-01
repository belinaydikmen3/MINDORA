import React, { lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getGame } from '../data/games';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Lazy load game components
const MemoryMatrix = lazy(() => import('../games/MemoryMatrix').then((m: any) => ({ default: m.default ?? m.MemoryMatrix ?? Object.values(m)[0] as React.ComponentType })));
const RapidMatch = lazy(() => import('../games/RapidMatch').then((m: any) => ({ default: m.default ?? m.RapidMatch ?? Object.values(m)[0] as React.ComponentType })));
const LogicChains = lazy(() => import('../games/LogicChains').then((m: any) => ({ default: m.default ?? m.LogicChains ?? Object.values(m)[0] as React.ComponentType })));
const OrbitTracker = lazy(() => import('../games/OrbitTracker').then((m: any) => ({ default: m.default ?? m.OrbitTracker ?? Object.values(m)[0] as React.ComponentType })));
const NeuralShift = lazy(() => import('../games/NeuralShift').then((m: any) => ({ default: m.default ?? m.NeuralShift ?? Object.values(m)[0] as React.ComponentType })));

// 10 Original New Games
const PatternForge = lazy(() => import('../games/PatternForge').then((m: any) => ({ default: m.default ?? m.PatternForge ?? Object.values(m)[0] as React.ComponentType })));
const EchoRecall = lazy(() => import('../games/EchoRecall').then((m: any) => ({ default: m.default ?? m.EchoRecall ?? Object.values(m)[0] as React.ComponentType })));
const NumberCascade = lazy(() => import('../games/NumberCascade').then((m: any) => ({ default: m.default ?? m.NumberCascade ?? Object.values(m)[0] as React.ComponentType })));
const RouteWeaver = lazy(() => import('../games/RouteWeaver').then((m: any) => ({ default: m.default ?? m.RouteWeaver ?? Object.values(m)[0] as React.ComponentType })));
const WordCircuit = lazy(() => import('../games/WordCircuit').then((m: any) => ({ default: m.default ?? m.WordCircuit ?? Object.values(m)[0] as React.ComponentType })));
const SignalSwitch = lazy(() => import('../games/SignalSwitch').then((m: any) => ({ default: m.default ?? m.SignalSwitch ?? Object.values(m)[0] as React.ComponentType })));
const BalanceLab = lazy(() => import('../games/BalanceLab').then((m: any) => ({ default: m.default ?? m.BalanceLab ?? Object.values(m)[0] as React.ComponentType })));
const SilentSequence = lazy(() => import('../games/SilentSequence').then((m: any) => ({ default: m.default ?? m.SilentSequence ?? Object.values(m)[0] as React.ComponentType })));
const TimeNavigator = lazy(() => import('../games/TimeNavigator').then((m: any) => ({ default: m.default ?? m.TimeNavigator ?? Object.values(m)[0] as React.ComponentType })));
const MemoryMosaic = lazy(() => import('../games/MemoryMosaic').then((m: any) => ({ default: m.default ?? m.MemoryMosaic ?? Object.values(m)[0] as React.ComponentType })));

const GAME_COMPONENTS: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  // Existing
  'memory-matrix': MemoryMatrix,
  'rapid-match': RapidMatch,
  'logic-chains': LogicChains,
  'orbit-tracker': OrbitTracker,
  'neural-shift': NeuralShift,
  // New Games
  'pattern-forge': PatternForge,
  'echo-recall': EchoRecall,
  'number-cascade': NumberCascade,
  'route-weaver': RouteWeaver,
  'word-circuit': WordCircuit,
  'signal-switch': SignalSwitch,
  'balance-lab': BalanceLab,
  'silent-sequence': SilentSequence,
  'time-navigator': TimeNavigator,
  'memory-mosaic': MemoryMosaic,
};

function GameLoading() {
  return (
    <div className="h-[600px] w-full bg-[var(--color-mindora-ink)] rounded-2xl flex flex-col items-center justify-center text-white border border-[var(--color-surface-700)]">
      <div className="w-12 h-12 border-4 border-[var(--color-mindora-lavender)] border-t-transparent rounded-full animate-spin mb-6" />
      <p className="text-[var(--color-mindora-slate)] text-sm font-medium">Preparing cognitive arena...</p>
    </div>
  );
}

export function GameScreen() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const game = gameId ? getGame(gameId) : undefined;

  if (!game || !gameId) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-2xl font-bold mb-4 text-[var(--color-mindora-ink)]">Exercise not found</p>
        <button
          onClick={() => navigate('/games')}
          className="text-[var(--color-brand-600)] font-semibold hover:underline cursor-pointer"
        >
          ← Return to Library
        </button>
      </div>
    );
  }

  const GameComponent = GAME_COMPONENTS[gameId];

  if (!GameComponent) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-2xl font-bold mb-4 text-[var(--color-mindora-ink)]">Exercise not available</p>
        <button
          onClick={() => navigate('/games')}
          className="text-[var(--color-brand-600)] font-semibold hover:underline cursor-pointer"
        >
          ← Return to Library
        </button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/games')}
          className="mb-6 -ml-2 px-4 py-2 text-[var(--color-surface-500)] hover:text-[var(--color-surface-900)] font-medium transition-colors text-sm flex items-center gap-2 cursor-pointer"
        >
          ← Back to Games
        </button>

        <Suspense fallback={<GameLoading />}>
          <GameComponent />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
