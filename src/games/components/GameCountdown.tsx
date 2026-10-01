import React from 'react';
import type { CognitiveCategory } from '../../types';
import { CATEGORY_COLORS } from '../../types';

interface GameCountdownProps {
  count: number;
  category: CognitiveCategory;
}

export function GameCountdown({ count, category }: GameCountdownProps) {
  const color = CATEGORY_COLORS[category];

  return (
    <div className="flex items-center justify-center h-[500px] w-full">
      <div 
        key={count} // Re-mounts to trigger animation
        className="text-9xl font-bold animate-fade-in-scale"
        style={{ color }}
      >
        {count > 0 ? count : 'GO!'}
      </div>
    </div>
  );
}
