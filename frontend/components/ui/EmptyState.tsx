import React, { ReactNode } from 'react';
import { cn } from '../../lib/utils/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'p-8 md:p-12 text-center border-2 border-dashed border-gray-400 rounded-2xl bg-gray-50 flex flex-col items-center justify-center gap-3',
        className
      )}
    >
      {icon && <div className="text-3xl text-gray-500 mb-1">{icon}</div>}
      <h4 className="text-base font-bold text-gray-900">{title}</h4>
      {description && <p className="text-xs text-gray-600 max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
