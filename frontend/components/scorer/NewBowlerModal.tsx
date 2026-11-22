import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export interface NewBowlerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBowler: string;
  onConfirm: (newBowler: string) => void;
}

export const NewBowlerModal: React.FC<NewBowlerModalProps> = ({
  isOpen,
  onClose,
  currentBowler,
  onConfirm,
}) => {
  const [bowlerName, setBowlerName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bowlerName.trim()) {
      onConfirm(bowlerName.trim());
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <Card variant="white" className="max-w-sm w-full p-6 space-y-4 border-4 border-black shadow-hard-lg">
        <div className="flex items-center gap-2 pb-2 border-b-2 border-black">
          <span className="text-2xl">🔄</span>
          <div>
            <h2 className="text-lg font-black text-brand-dark">Over Completed!</h2>
            <p className="text-[11px] text-gray-500">6 legal balls bowled. Strike automatically swapped.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
              Next Bowler
            </label>
            <input
              type="text"
              autoFocus
              value={bowlerName}
              onChange={(e) => setBowlerName(e.target.value)}
              placeholder={`Enter new bowler (Last: ${currentBowler || 'None'})`}
              className="w-full px-3 py-2 rounded-xl border-2 border-black text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-yellow"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Under cricket rules, the same bowler cannot bowl two consecutive overs.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t-2 border-gray-100">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Keep Current
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Confirm Next Bowler
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
