import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  isLoading,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-mindora-lavender)] focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] select-none cursor-pointer';
  
  const variants = {
    primary: 'bg-[var(--color-mindora-ink)] text-white hover:bg-[var(--color-surface-800)] shadow-xs hover:shadow-sm border border-[var(--color-surface-700)]',
    secondary: 'bg-[var(--color-mindora-lavender)] text-[var(--color-mindora-ink)] font-semibold hover:brightness-105 shadow-xs',
    outline: 'border border-[var(--color-surface-300)] bg-white hover:bg-[var(--color-surface-50)] text-[var(--color-mindora-ink)] hover:border-[var(--color-surface-400)] shadow-xs',
    ghost: 'bg-transparent hover:bg-[var(--color-surface-100)] text-[var(--color-surface-700)] hover:text-[var(--color-mindora-ink)]',
    danger: 'bg-[var(--color-error-500)] text-white hover:bg-[var(--color-error-600)] shadow-xs',
  };

  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-5 text-base',
    lg: 'h-14 px-8 text-lg font-semibold',
  };

  const classes = [
    baseStyles,
    variants[variant],
    sizes[size],
    fullWidth ? 'w-full' : '',
    className,
  ].join(' ').trim();

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
}
