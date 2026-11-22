import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'dark' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold font-sans transition-all cursor-pointer active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0';

    const variants = {
      primary: 'bg-brand-yellow text-brand-dark border-2 border-black shadow-hard-sm hover:bg-yellow-300',
      secondary: 'bg-white text-black border-2 border-black shadow-hard-sm hover:bg-gray-100',
      dark: 'bg-black text-white border-2 border-black shadow-hard-sm hover:bg-gray-800',
      danger: 'bg-red-500 text-white border-2 border-black shadow-hard-sm hover:bg-red-600',
      success: 'bg-emerald-500 text-white border-2 border-black shadow-hard-sm hover:bg-emerald-600',
      ghost: 'bg-transparent text-black hover:bg-black/5',
    };

    const sizes = {
      sm: 'px-2.5 py-1 text-xs rounded-lg',
      md: 'px-4 py-2 text-xs md:text-sm rounded-xl',
      lg: 'px-6 py-3 text-sm md:text-base rounded-xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <span className="inline-block w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
