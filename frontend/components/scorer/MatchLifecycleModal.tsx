import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export interface MatchLifecycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: 'pause' | 'resume' | 'complete' | null;
  matchTitle: string;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export const MatchLifecycleModal: React.FC<MatchLifecycleModalProps> = ({
  isOpen,
  onClose,
  action,
  matchTitle,
  onConfirm,
  isSubmitting = false,
}) => {
  if (!isOpen || !action) return null;

  const config = {
    pause: {
      title: 'Pause Match',
      desc: 'Temporarily pause play (e.g. rain interruption, innings break, or lunch).',
      confirmText: 'Pause Match',
      variant: 'warning' as const,
      icon: '⏸️',
    },
    resume: {
      title: 'Resume Match',
      desc: 'Resume live play and allow deliveries to be recorded again.',
      confirmText: 'Resume Match',
      variant: 'success' as const,
      icon: '▶️',
    },
    complete: {
      title: 'Complete Match',
      desc: 'Officially finish the match. The final score will be locked.',
      confirmText: 'Complete & Lock Match',
      variant: 'danger' as const,
      icon: '🏁',
    },
  }[action];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <Card variant="white" className="max-w-md w-full p-6 space-y-4 border-4 border-black shadow-hard-lg">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-black">
          <span className="text-3xl">{config.icon}</span>
          <div>
            <h2 className="text-xl font-black text-brand-dark">{config.title}</h2>
            <p className="text-xs font-bold text-gray-500">{matchTitle}</p>
          </div>
        </div>

        <p className="text-xs text-gray-700 leading-relaxed font-medium">
          {config.desc}
        </p>

        <div className="flex justify-end gap-2 pt-3 border-t-2 border-gray-100">
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant={config.variant} size="sm" type="button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : config.confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
};
