import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

export interface StartInningsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inningsNumber: number;
  homeTeam: string;
  awayTeam: string;
  suggestedTarget?: number | null;
  onConfirm: (data: {
    inningsNumber: number;
    battingTeam: string;
    bowlingTeam: string;
    target?: number | null;
  }) => void;
  isSubmitting?: boolean;
}

export const StartInningsModal: React.FC<StartInningsModalProps> = ({
  isOpen,
  onClose,
  inningsNumber,
  homeTeam,
  awayTeam,
  suggestedTarget,
  onConfirm,
  isSubmitting = false,
}) => {
  const [battingTeam, setBattingTeam] = useState(inningsNumber === 1 ? homeTeam : awayTeam);
  const [target, setTarget] = useState<string>(suggestedTarget ? String(suggestedTarget) : '');

  if (!isOpen) return null;

  const bowlingTeam = battingTeam === homeTeam ? awayTeam : homeTeam;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      inningsNumber,
      battingTeam,
      bowlingTeam,
      target: target ? Number(target) : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <Card variant="white" className="max-w-md w-full p-6 space-y-5 border-4 border-black shadow-hard-lg">
        <div className="flex items-center justify-between pb-3 border-b-2 border-black">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏏</span>
            <div>
              <h2 className="text-xl font-black text-brand-dark">Initialize Innings {inningsNumber}</h2>
              <p className="text-xs text-gray-500 font-medium">Configure team order and target</p>
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
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-2">
              Batting Team (Innings {inningsNumber})
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBattingTeam(homeTeam)}
                className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                  battingTeam === homeTeam
                    ? 'border-black bg-brand-yellow font-black shadow-hard-sm'
                    : 'border-gray-200 hover:border-black'
                }`}
              >
                {homeTeam}
              </button>
              <button
                type="button"
                onClick={() => setBattingTeam(awayTeam)}
                className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                  battingTeam === awayTeam
                    ? 'border-black bg-brand-yellow font-black shadow-hard-sm'
                    : 'border-gray-200 hover:border-black'
                }`}
              >
                {awayTeam}
              </button>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs font-medium space-y-1">
            <p>
              Bowling Team: <strong>{bowlingTeam}</strong>
            </p>
          </div>

          {inningsNumber >= 2 && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                Target Score (Runs to win)
              </label>
              <input
                type="number"
                min="1"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g. 185"
                className="w-full px-3 py-2 rounded-xl border-2 border-black text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-yellow"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Leave blank if target is calculated dynamically or unknown.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t-2 border-gray-100">
            <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="success" size="sm" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Starting Innings...' : `Start Innings ${inningsNumber}`}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
