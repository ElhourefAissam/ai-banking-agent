'use client';

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'danger'
    | 'danger-outline'
    | 'success'
    | 'success-outline'
    | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-600 disabled:pointer-events-none disabled:opacity-50 select-none rounded-xl active:scale-[0.98] cursor-pointer';

  const variants = {
    primary:
      'bg-brand-900 text-white hover:bg-brand-800 shadow-sm hover:shadow border border-brand-950/20',
    secondary:
      'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200/80 shadow-2xs',
    outline:
      'border border-slate-300/90 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-2xs',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 shadow-sm hover:shadow border border-rose-700/20',
    'danger-outline':
      'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300',
    success:
      'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm hover:shadow border border-emerald-700/20',
    'success-outline':
      'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300',
    ghost:
      'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  };

  const sizes = {
    xs: 'h-7 px-2.5 text-[11px] gap-1.5 font-medium',
    sm: 'h-8 px-3 text-xs gap-1.5 font-medium',
    md: 'h-9.5 px-4 text-xs sm:text-sm gap-2 font-semibold',
    lg: 'h-11 px-5 py-2.5 text-sm sm:text-base gap-2.5 font-semibold',
    icon: 'h-9 w-9 p-0 text-sm shrink-0',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ms-0.5 me-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <span>Chargement...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
