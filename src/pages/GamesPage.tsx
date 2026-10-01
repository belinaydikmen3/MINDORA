import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GAMES } from '../data/games';
import { Card } from '../components/Card';
import { CategoryBadge } from '../components/CategoryBadge';
import { getSettings, toggleFavoriteGame, getStats } from '../services/storage';
import type { CognitiveCategory } from '../types';

export function GamesPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<CognitiveCategory | 'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getSettings().favoriteGameIds);
  const stats = getStats();

  const handleToggleFavorite = (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation();
    toggleFavoriteGame(gameId);
    setFavoriteIds(getSettings().favoriteGameIds);
  };

  const filteredGames = useMemo(() => {
    return GAMES.filter((game) => {
      // Category / Favorite filter
      if (filter === 'favorites') {
        if (!favoriteIds.includes(game.id)) return false;
      } else if (filter !== 'all') {
        if (game.category !== filter) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = game.name.toLowerCase().includes(query);
        const matchDesc = game.description.toLowerCase().includes(query);
        const matchCat = game.category.toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchCat) return false;
      }

      return true;
    });
  }, [filter, searchQuery, favoriteIds]);

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[var(--color-surface-200)]">
        <div>
          <div className="text-xs uppercase font-bold tracking-widest text-[var(--color-mindora-slate)] mb-1">
            Interactive Catalog
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--color-mindora-ink)] tracking-tight font-serif italic">
            Cognitive Studio Library
          </h1>
          <p className="text-[var(--color-surface-600)] text-sm sm:text-base mt-1">
            All 6 exercises remain 100% unlocked with zero countdown restrictions. Practice freely on your terms.
          </p>
        </div>

        {/* Search Input */}
        <div className="w-full md:w-72 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exercises by skill or name..."
            className="w-full bg-white border border-[var(--color-surface-300)] rounded-xl px-4 py-2 text-sm text-[var(--color-mindora-ink)] placeholder-[var(--color-mindora-slate)] focus:outline-none focus:border-[var(--color-mindora-lavender)] focus:ring-1 focus:ring-[var(--color-mindora-lavender)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-[var(--color-mindora-slate)] hover:text-[var(--color-mindora-ink)] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-[var(--color-mindora-ink)] text-white shadow-xs'
              : 'bg-white border border-[var(--color-surface-300)] text-[var(--color-surface-600)] hover:bg-[var(--color-surface-50)]'
          }`}
        >
          All ({GAMES.length})
        </button>

        <button
          onClick={() => setFilter('favorites')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
            filter === 'favorites'
              ? 'bg-[var(--color-mindora-coral)] text-white shadow-xs'
              : 'bg-white border border-[var(--color-surface-300)] text-[var(--color-surface-600)] hover:bg-[var(--color-surface-50)]'
          }`}
        >
          <span>♥ Favorites</span>
          <span className="text-[11px] opacity-80">({favoriteIds.length})</span>
        </button>

        {(['memory', 'attention', 'speed', 'problem-solving', 'spatial'] as CognitiveCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all capitalize cursor-pointer ${
              filter === cat
                ? 'bg-[var(--color-mindora-ink)] text-white shadow-xs'
                : 'bg-white border border-[var(--color-surface-300)] text-[var(--color-surface-600)] hover:bg-[var(--color-surface-50)]'
            }`}
          >
            {cat.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filteredGames.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-[var(--color-surface-200)]">
          <div className="text-3xl mb-2">🔍</div>
          <h3 className="text-lg font-bold text-[var(--color-mindora-ink)]">No exercises match your filter</h3>
          <p className="text-sm text-[var(--color-mindora-slate)] mt-1 max-w-sm mx-auto">
            Try adjusting your search query or reset your category selection to explore all available games.
          </p>
          <button
            onClick={() => { setFilter('all'); setSearchQuery(''); }}
            className="mt-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-600)] hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Game Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredGames.map((game, i) => {
          const isFavorite = favoriteIds.includes(game.id);
          const personalBest = stats.personalBests[game.id] ?? 0;
          const isSignature = game.id === 'neural-shift';

          return (
            <Card
              key={game.id}
              hoverable
              className={`flex flex-col cursor-pointer overflow-hidden relative group border ${
                isSignature ? 'ring-1 ring-[var(--color-mindora-lavender)]/50' : ''
              }`}
              style={{ animationDelay: `${i * 0.04}s`, animationFillMode: 'both' }}
              onClick={() => navigate(`/games/${game.id}`)}
            >
              {/* Card Header & Favorite Heart */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-xs"
                        style={{ backgroundColor: `${game.color}15`, color: game.color }}
                      >
                        {game.icon}
                      </div>
                      <div>
                        <CategoryBadge category={game.category} />
                        {isSignature && (
                          <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--color-mindora-lavender)]/20 text-[var(--color-brand-800)]">
                            Signature
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Favorite Button */}
                    <button
                      onClick={(e) => handleToggleFavorite(e, game.id)}
                      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all cursor-pointer ${
                        isFavorite
                          ? 'text-[var(--color-mindora-coral)] bg-[var(--color-mindora-coral)]/10 hover:scale-110'
                          : 'text-[var(--color-surface-400)] hover:text-[var(--color-mindora-coral)] hover:bg-[var(--color-surface-100)]'
                      }`}
                    >
                      {isFavorite ? '♥' : '♡'}
                    </button>
                  </div>

                  <h3 className="text-xl font-bold text-[var(--color-mindora-ink)] mb-1 group-hover:text-[var(--color-brand-600)] transition-colors">
                    {game.name}
                  </h3>
                  <p className="text-[var(--color-surface-600)] text-sm line-clamp-2 leading-relaxed">
                    {game.shortDescription}
                  </p>
                </div>

                {/* Personal Record Tag */}
                {personalBest > 0 && (
                  <div className="mt-4 pt-3 border-t border-[var(--color-surface-100)] flex items-center justify-between text-xs">
                    <span className="text-[var(--color-mindora-slate)]">Personal Best</span>
                    <span className="font-mono font-semibold text-[var(--color-mindora-ink)]">
                      {personalBest.toLocaleString()} pts
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Metadata Bar */}
              <div className="px-6 py-3.5 bg-[var(--color-surface-50)] border-t border-[var(--color-surface-200)] flex justify-between items-center text-xs text-[var(--color-mindora-slate)]">
                <span className="flex items-center gap-1.5 font-medium">
                  <span>⏱️ ~{game.estimatedTime} min</span>
                  <span>•</span>
                  <span>Lvl {game.minDifficulty}–{game.maxDifficulty}</span>
                </span>
                <span className="font-semibold text-[var(--color-mindora-ink)] group-hover:translate-x-0.5 transition-transform">
                  Launch →
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
