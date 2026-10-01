import React from 'react';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  color?: string;
  className?: string;
}

export function StatCard({ title, value, icon, trend, color = 'var(--color-mindora-lavender)', className = '' }: StatCardProps) {
  return (
    <Card className={`p-5 ${className}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-[var(--color-surface-500)] mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-[var(--color-surface-900)]">{value}</h3>
        </div>
        {icon && (
          <div 
            className="p-3 rounded-[var(--radius-lg)] flex items-center justify-center"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {icon}
          </div>
        )}
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className={`font-medium ${trend.value >= 0 ? 'text-[var(--color-success-600)]' : 'text-[var(--color-error-600)]'}`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="ml-2 text-[var(--color-surface-400)]">{trend.label}</span>
        </div>
      )}
    </Card>
  );
}
