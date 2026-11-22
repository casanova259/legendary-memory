import React, { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'live' | 'finished' | 'scheduled' | 'paused' | 'admin' | 'scorer' | 'viewer';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800 border-black',
    live: 'bg-emerald-400 text-black border-black animate-pulse',
    finished: 'bg-gray-200 text-gray-700 border-gray-400',
    scheduled: 'bg-brand-blue text-blue-950 border-black',
    paused: 'bg-amber-300 text-amber-950 border-black',
    admin: 'bg-red-500 text-white border-black',
    scorer: 'bg-emerald-500 text-white border-black',
    viewer: 'bg-gray-200 text-gray-800 border-gray-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border-2 shadow-hard-sm',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
