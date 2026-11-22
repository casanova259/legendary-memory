import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export interface WicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  strikerName: string;
  nonStrikerName: string;
  onConfirm: (data: {
    wicketType: string;
    dismissedPlayer: string;
    runsOffBat: number;
    newBatter: string;
  }) => void;
  isSubmitting?: boolean;
}

const WICKET_TYPES = [
  { value: 'bowled', label: 'Bowled', desc: 'Ball hits the stumps directly' },
  { value: 'caught', label: 'Caught', desc: 'Fielder or keeper takes the catch' },
  { value: 'lbw', label: 'LBW', desc: 'Leg before wicket' },
  { value: 'run_out', label: 'Run Out', desc: 'Dismissed while running' },
  { value: 'stumped', label: 'Stumped', desc: 'Keeper dismisses batter out of crease' },
  { value: 'hit_wicket', label: 'Hit Wicket', desc: 'Batter dislodges bails' },
  { value: 'handled_ball', label: 'Handled Ball', desc: 'Batter touches ball with hands' },
  { value: 'obstructing_field', label: 'Obstructing Field', desc: 'Batter obstructs fielder' },
  { value: 'timed_out', label: 'Timed Out', desc: 'Batter took too long to arrive' },
  { value: 'retired_out', label: 'Retired Out', desc: 'Retired without umpire consent' },
];

export const WicketModal: React.FC<WicketModalProps> = ({
  isOpen,
  onClose,
  strikerName,
  nonStrikerName,
  onConfirm,
  isSubmitting = false,
}) => {
  const [wicketType, setWicketType] = useState('caught');
  const [dismissedPlayer, setDismissedPlayer] = useState(strikerName || 'Striker');
  const [runsCompleted, setRunsCompleted] = useState<number>(0);
  const [newBatter, setNewBatter] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      wicketType,
      dismissedPlayer: dismissedPlayer || strikerName,
      runsOffBat: wicketType === 'run_out' ? runsCompleted : 0,
      newBatter: newBatter.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <Card variant="white" className="max-w-md w-full p-6 space-y-5 border-4 border-black shadow-hard-lg">
        <div className="flex items-center justify-between pb-3 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <span className="text-2xl">☝️</span>
            <div>
              <h2 className="text-xl font-black text-red-600">Record Wicket</h2>
              <p className="text-xs text-gray-500 font-medium">Official dismissal registration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-black font-mono text-xl font-bold p-1 leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dismissal Type Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-2">
              Dismissal Method
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {WICKET_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setWicketType(type.value)}
                  className={`p-2.5 rounded-xl text-left border-2 transition-all ${
                    wicketType === type.value
                      ? 'border-red-600 bg-red-50 text-red-950 font-black shadow-hard-sm'
                      : 'border-gray-200 hover:border-black text-gray-800 font-bold'
                  }`}
                >
                  <div className="text-xs">{type.label}</div>
                  <div className="text-[10px] text-gray-500 font-normal truncate">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Dismissed Batter */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-2">
              Dismissed Player
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDismissedPlayer(strikerName)}
                className={`p-2.5 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                  dismissedPlayer === strikerName
                    ? 'border-black bg-brand-yellow font-black shadow-hard-sm'
                    : 'border-gray-200 hover:border-black'
                }`}
              >
                Striker: {strikerName || 'Striker'}
              </button>
              <button
                type="button"
                onClick={() => setDismissedPlayer(nonStrikerName)}
                className={`p-2.5 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                  dismissedPlayer === nonStrikerName
                    ? 'border-black bg-brand-yellow font-black shadow-hard-sm'
                    : 'border-gray-200 hover:border-black'
                }`}
              >
                Non-Striker: {nonStrikerName || 'Non-Striker'}
              </button>
            </div>
          </div>

          {/* Runs completed on Run Out */}
          {wicketType === 'run_out' && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                Runs Completed on Run Out
              </label>
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRunsCompleted(r)}
                    className={`flex-1 py-1.5 rounded-lg border-2 text-xs font-bold ${
                      runsCompleted === r
                        ? 'bg-black text-white border-black'
                        : 'border-gray-300 hover:border-black'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Next Batter Name */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
              New Batter Arriving
            </label>
            <input
              type="text"
              value={newBatter}
              onChange={(e) => setNewBatter(e.target.value)}
              placeholder="e.g. V. Kohli or Batter 4"
              className="w-full px-3 py-2 rounded-xl border-2 border-black text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-yellow"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t-2 border-gray-100">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Recording Wicket...' : 'Confirm Dismissal (WKT)'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
