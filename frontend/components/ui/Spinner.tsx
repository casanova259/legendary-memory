import React from 'react';
import { cn } from '../../lib/utils/cn';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', label, className }) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 p-4', className)}>
      <div
        className={cn(
          'border-brand-yellow border-t-black rounded-full animate-spin',
          sizes[size]
        )}
      />
      {label && <p className="text-xs font-bold text-gray-600 animate-pulse">{label}</p>}
    </div>
  );
};
