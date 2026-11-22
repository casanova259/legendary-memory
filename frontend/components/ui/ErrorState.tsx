import React from 'react';
import { cn } from '../../lib/utils/cn';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-red-50 border-2 border-red-500 text-red-950 p-6 rounded-2xl text-center shadow-hard-sm max-w-lg mx-auto',
        className
      )}
    >
      <div className="w-10 h-10 mx-auto mb-2 text-red-500 font-black text-2xl flex items-center justify-center bg-red-100 rounded-full border-2 border-red-400">
        !
      </div>
      <h4 className="text-base font-black mb-1">{title}</h4>
      <p className="text-xs font-mono bg-red-100 py-1 px-2 rounded inline-block mb-3 border border-red-200">
        {message}
      </p>
      {onRetry && (
        <div>
          <Button variant="danger" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};
