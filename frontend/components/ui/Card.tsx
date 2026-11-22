import React, { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'yellow' | 'blue' | 'white';
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'white',
  children,
  ...props
}) => {
  const backgrounds = {
    white: 'bg-white',
    yellow: 'bg-brand-yellow',
    blue: 'bg-brand-blue',
    default: 'bg-gray-50',
  };

  return (
    <div
      className={cn(
        'border-2 border-black rounded-2xl shadow-hard p-5 md:p-6 transition-all',
        backgrounds[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
