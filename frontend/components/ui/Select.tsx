import React, { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: Array<{ value: string | number; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, children, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-bold text-gray-800">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full px-3 py-2 text-xs md:text-sm font-medium bg-white border-2 border-black rounded-xl shadow-hard-sm outline-none transition-all cursor-pointer focus:ring-2 focus:ring-brand-yellow',
            error ? 'border-red-500 bg-red-50' : 'focus:border-black',
            className
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
