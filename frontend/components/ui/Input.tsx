import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-bold text-gray-800">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 text-xs md:text-sm font-medium bg-white border-2 border-black rounded-xl shadow-hard-sm outline-none transition-all focus:ring-2 focus:ring-brand-yellow',
            error ? 'border-red-500 bg-red-50' : 'focus:border-black',
            className
          )}
          {...props}
        />
        {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}
        {helperText && !error && <p className="text-[11px] text-gray-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
