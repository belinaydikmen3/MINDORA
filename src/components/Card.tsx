import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({ children, className = '', hoverable = false, ...props }: CardProps) {
  const baseStyles = 'bg-white rounded-xl shadow-xs border border-[var(--color-surface-200)] transition-all';
  const hoverStyles = hoverable ? 'hover:shadow-md hover:border-[var(--color-surface-300)] hover:-translate-y-0.5' : '';
  
  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
