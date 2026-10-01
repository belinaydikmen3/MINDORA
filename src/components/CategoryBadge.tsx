import React from 'react';
import type { CognitiveCategory } from '../types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../types';

interface CategoryBadgeProps {
  category: CognitiveCategory;
  className?: string;
}

export function CategoryBadge({ category, className = '' }: CategoryBadgeProps) {
  const color = CATEGORY_COLORS[category];
  const label = CATEGORY_LABELS[category];

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ backgroundColor: `${color}20`, color: color }}
    >
      {label}
    </span>
  );
}
